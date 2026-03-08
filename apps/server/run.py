#!/usr/bin/env python3
"""
Development server runner
"""
import uvicorn
from app.config import settings

if __name__ == "__main__":
    print(f"Starting server on {settings.HOST}:{settings.PORT}")
    print(f"Debug mode: {settings.DEBUG}")
    try:
        uvicorn.run(
            "app.main:app",
            host=settings.HOST,
            port=settings.PORT,
            reload=settings.DEBUG,
            log_level="info"
        )
    except Exception as e:
        print(f"Server error: {e}")
        import traceback
        traceback.print_exc()
