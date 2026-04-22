from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Optional


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "AloeVeraMate API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    @field_validator('DEBUG', mode='before')
    @classmethod
    def parse_debug(cls, v):
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            return v.lower() in ('true', '1', 'yes', 'on')
        return bool(v)
    
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
    
    # RAG — Treatment Guidance System
    RAG_ENABLED: bool = True
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "models/gemini-2.0-flash"       # fast + free-tier friendly
    GEMINI_EMBED_MODEL: str = "models/gemini-embedding-001"  # Gemini embedding model
    RAG_CHROMA_PATH: str = "data/chroma_db"      # persistent vector DB path
    RAG_COLLECTION: str = "aloe_treatment_knowledge"
    RAG_TOP_K: int = 4                            # chunks to retrieve per query
    
    # MongoDB
    MONGODB_URI: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
