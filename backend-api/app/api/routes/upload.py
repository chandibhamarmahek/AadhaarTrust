"""
Upload Endpoint
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.models.response import UploadResponse
from app.services.file_manager import file_manager
from app.services.job_queue import job_queue
from app.services.pipeline_service import run_validation_pipeline
from app.core.config import settings
from app.core.logging import logger
from fastapi import BackgroundTasks
import uuid

router = APIRouter()


@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """
    Upload Aadhaar image for validation
    """
    # Validate file extension
    file_ext = "." + file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )
    
    # Read file content
    file_content = await file.read()
    
    # Validate file size
    if len(file_content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {settings.MAX_FILE_SIZE / (1024*1024)}MB"
        )
    
    # Create job ID first
    job_id = str(uuid.uuid4())
    
    # Save file
    file_path = file_manager.save_uploaded_file(file_content, file.filename, job_id)
    
    # Create job in queue with the same job_id
    job_queue.create_job_with_id(job_id, str(file_path))
    
    # Start background validation
    background_tasks.add_task(run_validation_pipeline, job_id, str(file_path))
    
    logger.info(f"File uploaded: {file.filename}, Job ID: {job_id}")
    
    return UploadResponse(
        job_id=job_id,
        status="processing",
        message="Image uploaded successfully. Validation in progress."
    )
