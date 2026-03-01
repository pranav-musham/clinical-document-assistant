"""Consultation Schemas"""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from app.models.consultation import ConsultationStatus


class ConsultationCreate(BaseModel):
    """Schema for creating a consultation"""
    # Will be populated from uploaded file
    pass


class ConsultationResponse(BaseModel):
    """Schema for consultation response"""
    id: int
    user_id: int
    patient_name: Optional[str] = None
    doctor_name: Optional[str] = None
    audio_filename: Optional[str]
    audio_duration: Optional[float]
    transcript: Optional[str]
    soap_note: Optional[str]
    status: ConsultationStatus
    processing_time: Optional[float]
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class ConsultationUpdate(BaseModel):
    """Schema for updating consultation"""
    transcript: Optional[str] = None
    soap_note: Optional[str] = None
    status: Optional[ConsultationStatus] = None


class ConsultationList(BaseModel):
    """Schema for list of consultations"""
    total: int
    consultations: List[ConsultationResponse]
