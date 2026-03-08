from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "AloeVeraMate API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # CORS
    ALLOWED_ORIGINS: list[str] = ["*"]
    
    # File Upload
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: set[str] = {"jpg", "jpeg", "png"}
    
    # ML Model
    MODEL_PATH: Optional[str] = None
    CONFIDENCE_THRESHOLD: float = 0.3
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REQUESTS: int = 30  # requests per window
    RATE_LIMIT_WINDOW: int = 60  # seconds
    
    # RAG
    RAG_ENABLED: bool = False
    RAG_MODEL: Optional[str] = None
    
    # MongoDB
    MONGODB_URI: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
