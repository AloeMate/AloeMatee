"""
Database configuration for MongoDB
"""
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
import logging
import asyncio
from app.config import settings

logger = logging.getLogger(__name__)


class Database:
    client: Optional[AsyncIOMotorClient] = None
    db_name: str = "aloemate"

db = Database()


async def get_database():
    """Get database instance"""
    if db.client is None:
        raise RuntimeError("Database not connected")
    return db.client[db.db_name]


async def connect_to_mongo():
    """Connect to MongoDB - Non-blocking, continues if unavailable"""
    try:
        # Get MongoDB URI from settings
        mongodb_uri = settings.MONGODB_URI or "mongodb://localhost:27017"
        
        logger.info(f"Attempting MongoDB connection...")
        
        # Create client with short timeout
        db.client = AsyncIOMotorClient(
            mongodb_uri,
            serverSelectionTimeoutMS=3000,
            connectTimeoutMS=3000,
            socketTimeoutMS=3000
        )
        
        # Test connection with timeout
        await db.client.admin.command('ping')
        logger.info(f"✅ Connected to MongoDB database: {db.db_name}")
        
        # Create indexes for better performance
        database = await get_database()
        await database.sensor_readings.create_index([("deviceId", 1), ("recordedAt", -1)])
        await database.predictions.create_index([("deviceId", 1), ("timestamp", -1)])
        await database.alerts.create_index([("deviceId", 1), ("timestamp", -1)])
        logger.info("✅ Database indexes created")
        
    except asyncio.CancelledError:
        # Handle cancellation gracefully
        logger.warning("⚠️  MongoDB connection cancelled - IoT features will not be available")
        db.client = None
        raise  # Re-raise to allow proper cleanup
    except Exception as e:
        logger.warning(f"⚠️  MongoDB unavailable: {str(e)[:100]}")
        logger.info("📱 Disease detection and harvest features remain fully functional")
        db.client = None
        # Don't raise - allow app to start without MongoDB


async def close_mongo_connection():
    """Close MongoDB connection"""
    if db.client:
        db.client.close()
        logger.info("Closed MongoDB connection")
