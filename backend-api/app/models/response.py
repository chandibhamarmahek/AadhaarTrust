"""
Response Models
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime


class UploadResponse(BaseModel):
    """Upload endpoint response"""
    job_id: str
    status: str
    message: str


class StageDetails(BaseModel):
    """Current stage details"""
    stage_name: str
    stage_description: str
    current_attempt: Optional[int] = None
    total_attempts: Optional[int] = None


class StatusResponse(BaseModel):
    """Status endpoint response"""
    job_id: str
    status: str  # "processing" | "completed" | "failed"
    current_stage: Optional[str] = None
    progress_percentage: int
    stage_details: Optional[StageDetails] = None
    estimated_time_remaining: Optional[int] = None


class ForgeryCheck(BaseModel):
    """Forgery detection result"""
    is_forged: bool
    confidence: float
    splicing_map_url: Optional[str] = None
    annotated_image_url: Optional[str] = None
    forged_area_percentage: Optional[float] = None


class QRData(BaseModel):
    """QR code extracted data"""
    name: Optional[str] = None
    aadhaar_number: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None


class QRValidation(BaseModel):
    """QR validation result"""
    decoded: bool
    attempt_number: Optional[int] = None
    method: Optional[str] = None
    data: Optional[QRData] = None


class OCRField(BaseModel):
    """OCR extracted field with confidence"""
    value: Optional[str] = None
    confidence: float


class OCRData(BaseModel):
    """OCR extracted data"""
    name: Optional[OCRField] = None
    aadhaar_number: Optional[OCRField] = None
    dob: Optional[OCRField] = None
    gender: Optional[OCRField] = None
    address: Optional[OCRField] = None


class OCRExtraction(BaseModel):
    """OCR extraction result"""
    success: bool
    data: Optional[OCRData] = None


class FieldMatch(BaseModel):
    """Field match result"""
    match: bool
    similarity: float


class CrossValidation(BaseModel):
    """Cross-validation result"""
    name_match: Optional[FieldMatch] = None
    aadhaar_match: Optional[FieldMatch] = None
    dob_match: Optional[FieldMatch] = None
    gender_match: Optional[FieldMatch] = None
    address_match: Optional[FieldMatch] = None
    overall_match: float


class AadhaarValidation(BaseModel):
    """Aadhaar number validation"""
    format_valid: bool
    checksum_valid: bool


class ValidationResult(BaseModel):
    """Complete validation result"""
    overall_status: str  # "VALID" | "SUSPICIOUS" | "INVALID" | "MANUAL_REVIEW"
    overall_confidence: float
    forgery_check: ForgeryCheck
    qr_validation: Optional[QRValidation] = None
    ocr_extraction: Optional[OCRExtraction] = None
    cross_validation: Optional[CrossValidation] = None
    aadhaar_validation: Optional[AadhaarValidation] = None


class Reports(BaseModel):
    """Report URLs"""
    pdf_url: Optional[str] = None
    html_url: Optional[str] = None
    json_url: Optional[str] = None


class ResultsResponse(BaseModel):
    """Results endpoint response"""
    job_id: str
    status: str
    validation_result: Optional[ValidationResult] = None
    reports: Optional[Reports] = None
    timestamp: datetime
    processing_time: Optional[float] = None


class ManualReviewItem(BaseModel):
    """Manual review queue item"""
    job_id: str
    upload_timestamp: datetime
    reason: str
    thumbnail_url: Optional[str] = None


class ManualReviewResponse(BaseModel):
    """Manual review queue response"""
    pending_reviews: List[ManualReviewItem]
    total_count: int


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    models_loaded: bool
    disk_space_available: bool
    version: str
