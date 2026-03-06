"""Consultations API Endpoints"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Dict, Optional

from app.database import get_db
from app.models.user import User
from app.models.consultation import Consultation, ConsultationStatus
from app.schemas.consultation import ConsultationResponse, ConsultationList
from app.api.auth import get_current_user
from app.config import settings
from app.tasks import start_background_processing, is_processing, retry_failed_consultation, get_processing_stats
import os
import aiofiles
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/consultations/upload", response_model=ConsultationResponse, status_code=status.HTTP_201_CREATED)
async def upload_consultation(
    file: UploadFile = File(...),
    patient_name: Optional[str] = Form(None),
    doctor_name: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload an audio file for processing.

    - **file**: Audio file (MP3, WAV, M4A, WebM, OGG)
    - Requires authentication

    Returns consultation object with pending status.
    """
    # Validate file type (strip codec params like "video/webm;codecs=opus")
    base_content_type = (file.content_type or "").split(";")[0].strip()
    if base_content_type not in settings.ALLOWED_AUDIO_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(settings.ALLOWED_AUDIO_FORMATS)}"
        )

    # Create upload directory if it doesn't exist
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # Generate unique filename
    import uuid
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

    # Save file
    async with aiofiles.open(file_path, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)

    # Create consultation record
    consultation = Consultation(
        user_id=current_user.id,
        audio_filename=unique_filename,
        patient_name=patient_name,
        doctor_name=doctor_name,
        status=ConsultationStatus.PENDING
    )

    db.add(consultation)
    db.commit()
    db.refresh(consultation)

    # Trigger background processing automatically
    logger.info(f"Starting background processing for consultation {consultation.id}")
    start_background_processing(consultation.id)

    return consultation


@router.get("/consultations", response_model=ConsultationList)
def get_consultations(
    skip: int = 0,
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get list of consultations for current user.

    - **skip**: Number of records to skip (pagination)
    - **limit**: Maximum number of records to return
    - Requires authentication
    """
    total = db.query(Consultation).filter(Consultation.user_id == current_user.id).count()
    consultations = (
        db.query(Consultation)
        .filter(Consultation.user_id == current_user.id)
        .order_by(Consultation.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return ConsultationList(total=total, consultations=consultations)


@router.get("/consultations/{consultation_id}", response_model=ConsultationResponse)
def get_consultation(
    consultation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific consultation by ID.

    - **consultation_id**: ID of the consultation
    - Requires authentication
    - User can only access their own consultations
    """
    consultation = db.query(Consultation).filter(
        Consultation.id == consultation_id,
        Consultation.user_id == current_user.id
    ).first()

    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )

    return consultation


@router.delete("/consultations/{consultation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_consultation(
    consultation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a consultation.

    - **consultation_id**: ID of the consultation to delete
    - Requires authentication
    - User can only delete their own consultations
    """
    consultation = db.query(Consultation).filter(
        Consultation.id == consultation_id,
        Consultation.user_id == current_user.id
    ).first()

    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )

    # Delete audio file if it exists
    if consultation.audio_filename:
        file_path = os.path.join(settings.UPLOAD_DIR, consultation.audio_filename)
        if os.path.exists(file_path):
            os.remove(file_path)

    db.delete(consultation)
    db.commit()

    return None


@router.put("/consultations/{consultation_id}/soap", response_model=ConsultationResponse)
async def update_soap_note(
    consultation_id: int,
    request_body: Dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update the SOAP note for a consultation.

    - **consultation_id**: ID of the consultation
    - **soap_note**: Updated SOAP note content (in request body)
    - Requires authentication
    - User can only update their own consultations
    """
    consultation = db.query(Consultation).filter(
        Consultation.id == consultation_id,
        Consultation.user_id == current_user.id
    ).first()

    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )

    # Validate request body
    if 'soap_note' not in request_body:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="soap_note field is required"
        )

    # Update SOAP note
    consultation.soap_note = request_body['soap_note']
    db.commit()
    db.refresh(consultation)

    logger.info(f"Updated SOAP note for consultation {consultation_id}")

    return consultation


@router.post("/consultations/{consultation_id}/process", response_model=ConsultationResponse)
async def process_consultation(
    consultation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Manually trigger processing for a consultation.

    - **consultation_id**: ID of the consultation to process
    - Requires authentication
    - User can only process their own consultations
    - Useful for retrying failed consultations or processing uploaded files
    """
    consultation = db.query(Consultation).filter(
        Consultation.id == consultation_id,
        Consultation.user_id == current_user.id
    ).first()

    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )

    # Check if already processing
    if is_processing(consultation_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Consultation is already being processed"
        )

    # Check if already completed
    if consultation.status == ConsultationStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Consultation has already been processed"
        )

    # Reset status to PENDING if failed
    if consultation.status == ConsultationStatus.FAILED:
        consultation.status = ConsultationStatus.PENDING
        consultation.error_message = None
        db.commit()
        db.refresh(consultation)

    # Start background processing
    logger.info(f"Manually triggering processing for consultation {consultation_id}")
    start_background_processing(consultation_id)

    return consultation


@router.get("/consultations/{consultation_id}/status")
async def get_consultation_status(
    consultation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Get the current processing status of a consultation.

    - **consultation_id**: ID of the consultation
    - Requires authentication
    - User can only check status of their own consultations

    Returns:
        - status: Current status (pending, transcribing, generating, completed, failed)
        - is_processing: Whether currently being processed
        - processing_time: Time taken to process (if completed)
        - error_message: Error message (if failed)
    """
    consultation = db.query(Consultation).filter(
        Consultation.id == consultation_id,
        Consultation.user_id == current_user.id
    ).first()

    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )

    return {
        "id": consultation.id,
        "status": consultation.status,
        "is_processing": is_processing(consultation_id),
        "processing_time": consultation.processing_time,
        "error_message": consultation.error_message,
        "completed_at": consultation.completed_at
    }


@router.post("/consultations/{consultation_id}/retry", response_model=ConsultationResponse)
async def retry_consultation(
    consultation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retry processing a failed consultation.

    - **consultation_id**: ID of the consultation to retry
    - Requires authentication
    - User can only retry their own consultations
    - Only failed consultations can be retried
    """
    consultation = db.query(Consultation).filter(
        Consultation.id == consultation_id,
        Consultation.user_id == current_user.id
    ).first()

    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )

    if consultation.status not in [ConsultationStatus.FAILED, ConsultationStatus.PENDING]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Can only retry failed or pending consultations. Current status: {consultation.status}"
        )

    # Use the retry function from tasks module
    success = await retry_failed_consultation(consultation_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retry consultation"
        )

    # Refresh consultation to get updated status
    db.refresh(consultation)

    return consultation


@router.get("/consultations/stats/processing")
async def get_processing_statistics(
    current_user: User = Depends(get_current_user)
) -> Dict:
    """
    Get statistics about currently running processing tasks.

    - Requires authentication
    - Shows global processing stats (not user-specific)

    Returns:
        - active_tasks: Number of consultations currently being processed
        - consultation_ids: List of consultation IDs being processed
    """
    return get_processing_stats()


@router.get("/consultations/stats/dashboard")
async def get_dashboard_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Get comprehensive statistics for the dashboard.

    - Requires authentication
    - Returns user-specific statistics

    Returns:
        - total: Total number of consultations
        - completed: Number of completed consultations
        - pending: Number of pending consultations
        - failed: Number of failed consultations
        - processing: Number of currently processing consultations
        - avg_processing_time: Average processing time in seconds
        - total_processing_time: Total processing time
        - recent_consultations: List of 5 most recent consultations
    """
    from sqlalchemy import func

    user_id = current_user.id

    # Total consultations
    total = db.query(Consultation).filter(
        Consultation.user_id == user_id
    ).count()

    # Count by status
    completed = db.query(Consultation).filter(
        Consultation.user_id == user_id,
        Consultation.status == ConsultationStatus.COMPLETED
    ).count()

    pending = db.query(Consultation).filter(
        Consultation.user_id == user_id,
        Consultation.status == ConsultationStatus.PENDING
    ).count()

    failed = db.query(Consultation).filter(
        Consultation.user_id == user_id,
        Consultation.status == ConsultationStatus.FAILED
    ).count()

    processing = db.query(Consultation).filter(
        Consultation.user_id == user_id,
        Consultation.status.in_([
            ConsultationStatus.PROCESSING,
            ConsultationStatus.TRANSCRIBING,
            ConsultationStatus.GENERATING
        ])
    ).count()

    # Average processing time
    avg_time_result = db.query(
        func.avg(Consultation.processing_time)
    ).filter(
        Consultation.user_id == user_id,
        Consultation.processing_time.isnot(None)
    ).scalar()

    avg_processing_time = float(avg_time_result) if avg_time_result else 0

    # Total processing time
    total_time_result = db.query(
        func.sum(Consultation.processing_time)
    ).filter(
        Consultation.user_id == user_id,
        Consultation.processing_time.isnot(None)
    ).scalar()

    total_processing_time = float(total_time_result) if total_time_result else 0

    # Recent consultations (last 5)
    recent = db.query(Consultation).filter(
        Consultation.user_id == user_id
    ).order_by(
        Consultation.created_at.desc()
    ).limit(5).all()

    # Convert ORM objects to Pydantic schemas for proper JSON serialization
    recent_consultations = [ConsultationResponse.model_validate(c) for c in recent]

    return {
        "total": total,
        "completed": completed,
        "pending": pending,
        "failed": failed,
        "processing": processing,
        "avg_processing_time": round(avg_processing_time, 2),
        "total_processing_time": round(total_processing_time, 2),
        "recent_consultations": recent_consultations
    }
