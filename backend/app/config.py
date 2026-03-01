"""Application Configuration"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Application
    APP_NAME: str = "Clinical Documentation Assistant"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api"

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/clinical_db"

    # Security
    SECRET_KEY: str = "change-this-to-a-secure-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Google Gemini API
    GEMINI_API_KEY: str = ""

    # File Upload
    MAX_FILE_SIZE_MB: int = 25
    ALLOWED_AUDIO_FORMATS: List[str] = [
        "audio/mpeg",
        "audio/wav",
        "audio/m4a",
        "audio/webm",
        "audio/ogg"
    ]
    UPLOAD_DIR: str = "uploads"

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()
