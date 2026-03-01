"""
Background Task Processing Module

This module handles asynchronous processing of consultation audio files.
It processes audio in the background without blocking the upload endpoint.
"""

import asyncio
import logging
import os
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.consultation import Consultation, ConsultationStatus
from app.services.gemini_service import GeminiService
from app.config import settings

logger = logging.getLogger(__name__)


# Global dictionary to track running tasks
_running_tasks = {}


async def process_consultation_task(consultation_id: int) -> bool:
    """
    Background task to process a consultation.

    This function:
    1. Retrieves the consultation from the database
    2. Transcribes the audio using Gemini AI
    3. Generates a SOAP note from the transcript
    4. Updates the database with results

    Args:
        consultation_id: ID of the consultation to process

    Returns:
        True if processing succeeded, False otherwise
    """
    db: Optional[Session] = None

    try:
        logger.info(f"Starting background processing for consultation {consultation_id}")

        # Create database session
        db = SessionLocal()

        # Get consultation
        consultation = db.query(Consultation).filter(
            Consultation.id == consultation_id
        ).first()

        if not consultation:
            logger.error(f"Consultation {consultation_id} not found")
            return False

        # Update status to TRANSCRIBING
        consultation.status = ConsultationStatus.TRANSCRIBING
        db.commit()
        logger.info(f"Consultation {consultation_id}: Status updated to TRANSCRIBING")

        # Get audio file path
        audio_path = os.path.join(settings.UPLOAD_DIR, consultation.audio_filename)

        if not os.path.exists(audio_path):
            logger.error(f"Audio file not found: {audio_path}")
            consultation.status = ConsultationStatus.FAILED
            consultation.error_message = "Audio file not found"
            db.commit()
            return False

        # Initialize Gemini service
        service = GeminiService()

        if not service.configured:
            logger.error("Gemini API not configured")
            consultation.status = ConsultationStatus.FAILED
            consultation.error_message = "Gemini API not configured"
            db.commit()
            return False

        # Start timing
        start_time = datetime.now()

        # Process the consultation (transcription + SOAP note)
        try:
            logger.info(f"Consultation {consultation_id}: Processing audio file")
            result = await service.process_consultation_complete(audio_path)

            # Calculate processing time
            end_time = datetime.now()
            processing_time = (end_time - start_time).total_seconds()

            # Update consultation with results
            consultation.transcript = result["transcript"]
            consultation.soap_note = result["soap_note"]
            consultation.status = ConsultationStatus.COMPLETED
            consultation.processing_time = processing_time
            consultation.completed_at = datetime.utcnow()
            consultation.error_message = None

            db.commit()

            logger.info(
                f"Consultation {consultation_id}: Processing completed successfully "
                f"in {processing_time:.1f} seconds"
            )

            # Delete audio file — not needed after processing (ephemeral disk safe)
            try:
                if os.path.exists(audio_path):
                    os.remove(audio_path)
            except Exception as cleanup_err:
                logger.warning(f"Could not delete audio file {audio_path}: {cleanup_err}")

            return True

        except Exception as e:
            logger.error(f"Consultation {consultation_id}: Processing failed: {str(e)}")

            # Update status to FAILED
            consultation.status = ConsultationStatus.FAILED
            consultation.error_message = str(e)
            db.commit()

            # Still clean up the audio file on failure
            try:
                if os.path.exists(audio_path):
                    os.remove(audio_path)
            except Exception as cleanup_err:
                logger.warning(f"Could not delete audio file {audio_path}: {cleanup_err}")

            return False

    except Exception as e:
        logger.error(f"Unexpected error processing consultation {consultation_id}: {str(e)}")

        if db:
            try:
                consultation = db.query(Consultation).filter(
                    Consultation.id == consultation_id
                ).first()

                if consultation:
                    consultation.status = ConsultationStatus.FAILED
                    consultation.error_message = f"Unexpected error: {str(e)}"
                    db.commit()
            except Exception as db_error:
                logger.error(f"Failed to update consultation status: {str(db_error)}")

        return False

    finally:
        if db:
            db.close()

        # Remove from running tasks
        if consultation_id in _running_tasks:
            del _running_tasks[consultation_id]


def start_background_processing(consultation_id: int) -> None:
    """
    Start processing a consultation in the background.

    This creates an asyncio task that runs independently of the
    request/response cycle.

    Args:
        consultation_id: ID of the consultation to process
    """
    # Check if already processing
    if consultation_id in _running_tasks:
        logger.warning(f"Consultation {consultation_id} is already being processed")
        return

    # Create and store the task
    loop = asyncio.get_event_loop()
    task = loop.create_task(process_consultation_task(consultation_id))
    _running_tasks[consultation_id] = task

    logger.info(f"Started background processing task for consultation {consultation_id}")


def is_processing(consultation_id: int) -> bool:
    """
    Check if a consultation is currently being processed.

    Args:
        consultation_id: ID of the consultation to check

    Returns:
        True if currently processing, False otherwise
    """
    return consultation_id in _running_tasks


def get_processing_task(consultation_id: int) -> Optional[asyncio.Task]:
    """
    Get the processing task for a consultation.

    Args:
        consultation_id: ID of the consultation

    Returns:
        The asyncio Task if it exists, None otherwise
    """
    return _running_tasks.get(consultation_id)


async def retry_failed_consultation(consultation_id: int) -> bool:
    """
    Retry processing a failed consultation.

    This is useful for handling transient errors like network issues
    or temporary API unavailability.

    Args:
        consultation_id: ID of the consultation to retry

    Returns:
        True if retry was successful, False otherwise
    """
    db = SessionLocal()

    try:
        # Get consultation
        consultation = db.query(Consultation).filter(
            Consultation.id == consultation_id
        ).first()

        if not consultation:
            logger.error(f"Consultation {consultation_id} not found")
            return False

        if consultation.status not in [ConsultationStatus.FAILED, ConsultationStatus.PENDING]:
            logger.warning(
                f"Consultation {consultation_id} has status {consultation.status}, "
                "can only retry FAILED or PENDING consultations"
            )
            return False

        # Reset status to PENDING
        consultation.status = ConsultationStatus.PENDING
        consultation.error_message = None
        db.commit()

        logger.info(f"Retrying consultation {consultation_id}")

        # Start background processing
        start_background_processing(consultation_id)

        return True

    except Exception as e:
        logger.error(f"Failed to retry consultation {consultation_id}: {str(e)}")
        return False

    finally:
        db.close()


def get_processing_stats() -> dict:
    """
    Get statistics about currently running processing tasks.

    Returns:
        Dictionary with processing statistics
    """
    return {
        "active_tasks": len(_running_tasks),
        "consultation_ids": list(_running_tasks.keys())
    }
