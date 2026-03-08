from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from pathlib import Path

from app.config import settings
from app.schemas import HealthCheckResponse
from app.api import prediction, harvest, iot
from app.services.knowledge_validator import validate_knowledge_base
from app.services.inference import get_inference_service
from app.database import connect_to_mongo, close_mongo_connection

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)


def preload_ml_models():
    """
    Preload ML models at startup for performance
    
    Ensures models are loaded into memory once and cached,
    not reloaded on every request.
    """
    logger.info("🤖 Preloading ML models into memory...")
    try:
        inference_service = get_inference_service()
        model_info = inference_service.get_model_info()
        logger.info(f"✅ ML model loaded successfully")
        logger.info(f"   Model: {model_info.get('model_name', 'unknown')}")
        logger.info(f"   Version: {model_info.get('model_version', 'unknown')}")
        logger.info(f"   Type: {model_info.get('model_type', 'unknown')}")
        logger.info(f"   Classes: {model_info.get('num_classes', 'unknown')}")
    except Exception as e:
        logger.warning(f"⚠️  Model preload issue: {e}")
        logger.info("   Service will continue with fallback")


def validate_knowledge_on_startup():
    """
    CRITICAL SAFETY CHECK: Validate knowledge base on startup
    
    Server will refuse to start if:
    - Any knowledge file is missing required citations
    - Safety warnings are empty
    - Expert consultation guidance is missing
    
    This prevents serving unvalidated medical/treatment advice.
    """
    logger.info("🔒 Validating curated knowledge base...")
    
    knowledge_dir = Path(__file__).parent.parent / "data" / "knowledge"
    is_valid, summary = validate_knowledge_base(knowledge_dir)
    
    if not is_valid:
        logger.error("❌ KNOWLEDGE BASE VALIDATION FAILED")
        logger.error(summary)
        raise RuntimeError(
            "Knowledge base validation failed. Server cannot start without validated treatment guidance. "
            "See logs above for details."
        )
    
    logger.info("✅ Knowledge base validation passed")
    logger.info(summary)


def create_app() -> FastAPI:
    # CRITICAL: Validate knowledge base before creating app
    validate_knowledge_on_startup()
    
    # Preload ML models into memory
    preload_ml_models()
    
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        debug=settings.DEBUG
    )
    
    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include routers
    app.include_router(prediction.router)  # Component 1: Disease Detection
    app.include_router(harvest.router)      # Component 4: Harvest Assessment
    app.include_router(iot.router)          # Component 2: IoT Monitoring
    
    # Startup event - Connect to MongoDB
    @app.on_event("startup")
    async def startup_event():
        try:
            await connect_to_mongo()
        except Exception as e:
            logger.warning(f"Startup warning: {e}. Continuing without some features.")
    
    # Shutdown event - Close MongoDB connection
    @app.on_event("shutdown")
    async def shutdown_event():
        try:
            await close_mongo_connection()
        except Exception as e:
            logger.warning(f"Shutdown warning: {e}")
    
    # Health check endpoint
    @app.get("/health", response_model=HealthCheckResponse)
    async def health_check():
        return HealthCheckResponse(
            status="healthy",
            version=settings.APP_VERSION,
            message=f"{settings.APP_NAME} is running"
        )
    
    @app.get("/")
    async def root():
        return {
            "message": f"Welcome to {settings.APP_NAME}",
            "version": settings.APP_VERSION,
            "docs": "/docs"
        }
    
    return app


app = create_app()
