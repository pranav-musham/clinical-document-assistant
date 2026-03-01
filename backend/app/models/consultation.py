"""Consultation Model"""

from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
from enum import Enum
from app.database import Base


class ConsultationStatus(str, Enum):
    """Consultation processing status"""
    PENDING = "pending"
    UPLOADING = "uploading"
    PROCESSING = "processing"
    TRANSCRIBING = "transcribing"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


class Consultation(Base):
    """Consultation model for storing audio, transcripts, and SOAP notes"""

    __tablename__ = "consultations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Patient/Doctor metadata
    patient_name = Column(String(200), nullable=True)
    doctor_name = Column(String(200), nullable=True)

    # File information
    audio_filename = Column(String(500), nullable=True)
    audio_duration = Column(Float, nullable=True)  # Duration in seconds

    # Processing results
    transcript = Column(Text, nullable=True)
    soap_note = Column(Text, nullable=True)

    # Metadata
    status = Column(
        SQLEnum(ConsultationStatus),
        default=ConsultationStatus.PENDING,
        nullable=False,
        index=True
    )
    processing_time = Column(Float, nullable=True)  # Time in seconds
    error_message = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="consultations")

    def __repr__(self):
        return f"<Consultation(id={self.id}, status={self.status}, user_id={self.user_id})>"
