"""
Pipeline Service - Wrapper around existing Aadhaar validation pipeline
"""
import sys
import os
from pathlib import Path
from typing import Dict, Optional, Tuple
from datetime import datetime
import time
import shutil
import cv2

# Add project root to path to import existing modules
# This is now handled in main.py for the application execution
# PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
# sys.path.insert(0, str(PROJECT_ROOT))

from src.forgery_detection.detector import predict_image
from src.noiseprint_creation.noise_creation import generate_noiseprint
from src.forgery_detection.localization import locate_forgery
from src.qr_decrpytion.qr_decoder import extract_and_decode_qr
from config import settings
from app.services.job_queue import job_queue
from app.core.logging import logger
from app.models.response import (
    ValidationResult, ForgeryCheck, QRValidation, QRData,
    OCRExtraction, OCRData, OCRField, CrossValidation, FieldMatch,
    AadhaarValidation
)
from difflib import SequenceMatcher


def mask_aadhaar_number(aadhaar: str) -> str:
    """Mask Aadhaar number - show only last 4 digits"""
    if not aadhaar or len(aadhaar) < 4:
        return aadhaar
    # Remove any non-digit characters for masking
    digits = ''.join(filter(str.isdigit, aadhaar))
    if len(digits) >= 12:
        return f"XXXX-XXXX-{digits[-4:]}"
    return aadhaar


def calculate_similarity(str1: str, str2: str) -> float:
    """Calculate similarity between two strings (0-100)"""
    if not str1 or not str2:
        return 0.0
    return SequenceMatcher(None, str1.lower().strip(), str2.lower().strip()).ratio() * 100


def validate_aadhaar_format(aadhaar: str) -> Tuple[bool, bool]:
    """
    Validate Aadhaar number format and checksum
    Returns: (format_valid, checksum_valid)
    """
    if not aadhaar:
        return False, False
    
    # Remove non-digits
    digits = ''.join(filter(str.isdigit, aadhaar))
    
    # Format check: should be 12 digits
    if len(digits) != 12:
        return False, False
    
    # Verhoeff checksum validation
    checksum_valid = verhoeff_checksum(digits)
    
    return True, checksum_valid


def verhoeff_checksum(number: str) -> bool:
    """
    Verhoeff algorithm for Aadhaar checksum validation
    """
    # Verhoeff multiplication table
    d = [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
        [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
        [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
        [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
        [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
        [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
        [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
        [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
        [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
    ]
    
    # Verhoeff permutation table
    p = [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
        [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
        [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
        [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
        [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
        [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
        [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
    ]
    
    # Reverse the number
    number = number[::-1]
    check = 0
    
    for i in range(len(number)):
        check = d[check][p[((i + 1) % 8)][int(number[i])]]
    
    return check == 0


def extract_ocr_data(image_path: str) -> Dict:
    """
    Extract OCR data from Aadhaar image
    TODO: Integrate with actual OCR library (DocTR, Tesseract, etc.)
    For now, returns placeholder structure
    """
    # Placeholder OCR extraction
    # In production, integrate with DocTR or Tesseract OCR
    logger.warning("OCR extraction not fully implemented - using placeholder")
    
    return {
        "success": False,
        "data": {
            "name": {"value": None, "confidence": 0.0},
            "aadhaar_number": {"value": None, "confidence": 0.0},
            "dob": {"value": None, "confidence": 0.0},
            "gender": {"value": None, "confidence": 0.0},
            "address": {"value": None, "confidence": 0.0}
        }
    }


def run_validation_pipeline(job_id: str, image_path: str):
    """
    Main validation pipeline orchestrator
    Runs the complete Aadhaar validation workflow
    """
    start_time = time.time()
    
    try:
        # Create temporary input directory for pipeline
        temp_input_dir = Path(settings.INPUT_DIR)
        temp_input_dir.mkdir(parents=True, exist_ok=True)
        
        # Copy image to input directory (pipeline expects files in INPUT_DIR)
        image_filename = Path(image_path).name
        pipeline_input_path = temp_input_dir / image_filename
        shutil.copy2(image_path, pipeline_input_path)
        
        # ====================================================================
        # STAGE 1: Forgery Detection
        # ====================================================================
        logger.info(f"[Job {job_id}] Starting forgery detection...")
        job_queue.update_status(
            job_id=job_id,
            current_stage="forgery_detection",
            progress_percentage=10,
            stage_details={
                "stage_name": "Forgery Detection",
                "stage_description": "Generating noiseprint and analyzing camera noise patterns..."
            }
        )
        
        # Generate noiseprint
        # Define progress callback to map 0-100% of noiseprint to 10-35% of overall job
        last_update_time = 0
        def update_noiseprint_progress(percent: float):
            nonlocal last_update_time
            current_time = time.time()
            # Throttle updates to max once per 0.5 seconds
            if current_time - last_update_time < 0.5 and percent < 100:
                return
            
            last_update_time = current_time
            # Map 0-100% of noiseprint to 5-95% of overall job as per user request
            overall_progress = 5 + int((percent / 100) * 90)  
            job_queue.update_status(
                job_id=job_id,
                current_stage="forgery_detection",
                progress_percentage=overall_progress,
                stage_details={
                    "stage_name": "Forgery Detection",
                    "stage_description": f"Generating noiseprint... {int(percent)}%"
                }
            )

        filename_noiseprint, filename_original = generate_noiseprint(str(temp_input_dir), progress_callback=update_noiseprint_progress)
        
        # Predict forgery
        pred, results = predict_image(str(filename_noiseprint))
        
        is_forged = pred == 1
        forgery_confidence = 0.95 if is_forged else 0.98  # Placeholder confidence
        
        # Calculate confidence from detection results
        if results and len(results) > 0:
            r = results[0]
            if r.boxes is not None and len(r.boxes) > 0:
                # Average confidence of detected boxes
                confidences = [float(box.conf) for box in r.boxes]
                forgery_confidence = float(sum(confidences) / len(confidences))
            else:
                forgery_confidence = 0.98  # High confidence for genuine
        
        # Prepare paths for visualization
        output_dir = settings.SPLICING_MAPS_DIR
        output_dir.mkdir(parents=True, exist_ok=True)
        annotated_path = output_dir / f"{job_id}_annotated.jpg"
        annotated_image_url = f"/api/v1/download/{job_id}/annotated_forgery.jpg"
        
        splicing_map_path = None
        forged_area_percentage = 0.0
        
        if is_forged:
            logger.info(f"[Job {job_id}] Forgery detected - running localization...")
            job_queue.update_status(
                job_id=job_id,
                current_stage="forgery_localization",
                progress_percentage=96,
                stage_details={
                    "stage_name": "Forgery Localization",
                    "stage_description": "Identifying manipulated regions..."
                }
            )
            
            # Run localization with custom output path
            locate_forgery(str(filename_original), str(filename_noiseprint), output_path=annotated_path)
            splicing_map_path = str(annotated_path)
            forged_area_percentage = 15.0  # Placeholder
            
        else:
            # If authentic, copy original image to annotated path (clean image)
            shutil.copy2(filename_original, annotated_path)
            splicing_map_path = None
            forged_area_percentage = 0.0
        
        forgery_check = ForgeryCheck(
            is_forged=is_forged,
            confidence=forgery_confidence,
            splicing_map_url=annotated_image_url, # Use same image for both
            annotated_image_url=annotated_image_url,
            forged_area_percentage=forged_area_percentage
        )
        
        # If forged, stop here
        if is_forged:
            result = ValidationResult(
                overall_status="INVALID",
                overall_confidence=forgery_confidence,
                forgery_check=forgery_check,
                qr_validation=None,
                ocr_extraction=None,
                cross_validation=None,
                aadhaar_validation=None
            )
            
            processing_time = time.time() - start_time
            job_queue.set_result(job_id, result, processing_time)
            return
        
        # ====================================================================
        # STAGE 2: QR Code Decoding
        # ====================================================================
        logger.info(f"[Job {job_id}] Starting QR code decoding...")
        job_queue.update_status(
            job_id=job_id,
            current_stage="qr_scanning",
            progress_percentage=97,
            stage_details={
                "stage_name": "QR Code Decoding",
                "stage_description": "Attempting progressive QR decoding...",
                "current_attempt": 1,
                "total_attempts": 4
            }
        )
        
        qr_result = extract_and_decode_qr(str(filename_original))
        
        qr_validation = None
        qr_data = None
        
        if qr_result.get("success"):
            qr_decoded_data = qr_result.get("data", {})
            
            # Extract and mask Aadhaar number
            aadhaar_num = qr_decoded_data.get("uid") or qr_decoded_data.get("aadhaar_number")
            if aadhaar_num:
                aadhaar_num = mask_aadhaar_number(str(aadhaar_num))
            
            # Build address from components
            address_parts = []
            if qr_decoded_data.get("format") == "xml":
                address_parts = [
                    qr_decoded_data.get("house"),
                    qr_decoded_data.get("street"),
                    qr_decoded_data.get("lm"),
                    qr_decoded_data.get("loc"),
                    qr_decoded_data.get("vtc"),
                    qr_decoded_data.get("po"),
                    qr_decoded_data.get("dist"),
                    qr_decoded_data.get("state"),
                    qr_decoded_data.get("pc")
                ]
            elif qr_decoded_data.get("format") == "bigint":
                address_parts = [
                    qr_decoded_data.get("house"),
                    qr_decoded_data.get("street"),
                    qr_decoded_data.get("location"),
                    qr_decoded_data.get("vtc"),
                    qr_decoded_data.get("post_office"),
                    qr_decoded_data.get("district"),
                    qr_decoded_data.get("state"),
                    qr_decoded_data.get("pin_code")
                ]
            
            address = " ".join([str(p) for p in address_parts if p])
            
            qr_data = QRData(
                name=qr_decoded_data.get("name"),
                aadhaar_number=aadhaar_num,
                dob=qr_decoded_data.get("dob"),
                gender=qr_decoded_data.get("gender"),
                address=address if address else qr_decoded_data.get("address")
            )
            
            # Determine attempt number from method
            method = qr_result.get("method", "")
            attempt_num = 1
            if "preprocessing" in method:
                attempt_num = 2
            elif "yolo_extract" in method:
                attempt_num = 3
            elif "crop" in method:
                attempt_num = 4
            
            qr_validation = QRValidation(
                decoded=True,
                attempt_number=attempt_num,
                method=method,
                data=qr_data
            )
        else:
            # QR decode failed - route to manual review
            qr_validation = QRValidation(
                decoded=False,
                attempt_number=None,
                method=None,
                data=None
            )
            
            result = ValidationResult(
                overall_status="MANUAL_REVIEW",
                overall_confidence=0.5,
                forgery_check=forgery_check,
                qr_validation=qr_validation,
                ocr_extraction=None,
                cross_validation=None,
                aadhaar_validation=None
            )
            
            processing_time = time.time() - start_time
            job_queue.set_result(job_id, result, processing_time)
            return
        
        # ====================================================================
        # STAGE 3: OCR Extraction
        # ====================================================================
        logger.info(f"[Job {job_id}] Starting OCR extraction...")
        job_queue.update_status(
            job_id=job_id,
            current_stage="ocr_extraction",
            progress_percentage=98,
            stage_details={
                "stage_name": "OCR Extraction",
                "stage_description": "Extracting text fields from image..."
            }
        )
        
        ocr_result = extract_ocr_data(str(filename_original))
        
        ocr_extraction = None
        if ocr_result.get("success"):
            ocr_data_dict = ocr_result.get("data", {})
            ocr_data = OCRData(
                name=OCRField(**ocr_data_dict.get("name", {})) if ocr_data_dict.get("name") else None,
                aadhaar_number=OCRField(**ocr_data_dict.get("aadhaar_number", {})) if ocr_data_dict.get("aadhaar_number") else None,
                dob=OCRField(**ocr_data_dict.get("dob", {})) if ocr_data_dict.get("dob") else None,
                gender=OCRField(**ocr_data_dict.get("gender", {})) if ocr_data_dict.get("gender") else None,
                address=OCRField(**ocr_data_dict.get("address", {})) if ocr_data_dict.get("address") else None
            )
            ocr_extraction = OCRExtraction(success=True, data=ocr_data)
        else:
            ocr_extraction = OCRExtraction(success=False, data=None)
        
        # ====================================================================
        # STAGE 4: Cross-Validation
        # ====================================================================
        logger.info(f"[Job {job_id}] Starting cross-validation...")
        job_queue.update_status(
            job_id=job_id,
            current_stage="validation",
            progress_percentage=99,
            stage_details={
                "stage_name": "Cross-Validation",
                "stage_description": "Comparing QR and OCR data..."
            }
        )
        
        cross_validation = None
        aadhaar_validation = None
        
        if qr_data and ocr_extraction and ocr_extraction.data:
            # Compare fields
            name_match = None
            aadhaar_match = None
            dob_match = None
            gender_match = None
            address_match = None
            
            if qr_data.name and ocr_extraction.data.name:
                similarity = calculate_similarity(qr_data.name, ocr_extraction.data.name.value or "")
                name_match = FieldMatch(match=similarity >= 80, similarity=similarity)
            
            if qr_data.aadhaar_number and ocr_extraction.data.aadhaar_number:
                qr_aadhaar = ''.join(filter(str.isdigit, qr_data.aadhaar_number))
                ocr_aadhaar = ''.join(filter(str.isdigit, ocr_extraction.data.aadhaar_number.value or ""))
                similarity = 100.0 if qr_aadhaar == ocr_aadhaar else 0.0
                aadhaar_match = FieldMatch(match=qr_aadhaar == ocr_aadhaar, similarity=similarity)
            
            if qr_data.dob and ocr_extraction.data.dob:
                similarity = 100.0 if qr_data.dob == ocr_extraction.data.dob.value else 0.0
                dob_match = FieldMatch(match=qr_data.dob == ocr_extraction.data.dob.value, similarity=similarity)
            
            if qr_data.gender and ocr_extraction.data.gender:
                similarity = calculate_similarity(qr_data.gender, ocr_extraction.data.gender.value or "")
                gender_match = FieldMatch(match=similarity >= 80, similarity=similarity)
            
            if qr_data.address and ocr_extraction.data.address:
                similarity = calculate_similarity(qr_data.address, ocr_extraction.data.address.value or "")
                address_match = FieldMatch(match=similarity >= 80, similarity=similarity)
            
            # Calculate overall match
            matches = [m for m in [name_match, aadhaar_match, dob_match, gender_match, address_match] if m]
            overall_match = sum(m.similarity for m in matches) / len(matches) if matches else 0.0
            
            cross_validation = CrossValidation(
                name_match=name_match,
                aadhaar_match=aadhaar_match,
                dob_match=dob_match,
                gender_match=gender_match,
                address_match=address_match,
                overall_match=overall_match
            )
            
            # Validate Aadhaar number
            aadhaar_num = qr_data.aadhaar_number or (ocr_extraction.data.aadhaar_number.value if ocr_extraction.data.aadhaar_number else None)
            if aadhaar_num:
                # Unmask for validation
                digits = ''.join(filter(str.isdigit, aadhaar_num))
                format_valid, checksum_valid = validate_aadhaar_format(digits)
                aadhaar_validation = AadhaarValidation(
                    format_valid=format_valid,
                    checksum_valid=checksum_valid
                )
        
        # ====================================================================
        # STAGE 5: Determine Overall Status
        # ====================================================================
        overall_confidence = forgery_confidence
        
        if cross_validation:
            overall_confidence = (forgery_confidence * 0.4) + (cross_validation.overall_match / 100 * 0.6)
        
        # Determine status
        if overall_confidence >= 0.9:
            overall_status = "VALID"
        elif overall_confidence >= 0.7:
            overall_status = "SUSPICIOUS"
        else:
            overall_status = "INVALID"
        
        # Final result
        result = ValidationResult(
            overall_status=overall_status,
            overall_confidence=overall_confidence,
            forgery_check=forgery_check,
            qr_validation=qr_validation,
            ocr_extraction=ocr_extraction,
            cross_validation=cross_validation,
            aadhaar_validation=aadhaar_validation
        )
        
        processing_time = time.time() - start_time
        job_queue.set_result(job_id, result, processing_time)
        
        logger.info(f"[Job {job_id}] Validation completed in {processing_time:.2f}s")
        
    except Exception as e:
        logger.error(f"[Job {job_id}] Pipeline error: {str(e)}", exc_info=True)
        job_queue.set_error(job_id, str(e))
