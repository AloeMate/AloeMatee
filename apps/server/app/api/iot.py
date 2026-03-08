"""
IoT Monitoring API Routes
"""
from fastapi import APIRouter, HTTPException, Query
from datetime import datetime
from typing import List
import logging

from app.schemas import (
    SensorReadingCreate,
    IoTPredictionResponse,
    AlertResponse
)
from app.database import get_database
from app.services.iot_prediction import predict_from_environment
from app.services.alert_service import check_and_create_alerts, acknowledge_alert
from bson import ObjectId

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/iot", tags=["IoT Monitoring"])


@router.post("/readings", response_model=IoTPredictionResponse)
async def create_sensor_reading(reading: SensorReadingCreate):
    """
    Store sensor reading and predict disease risk from environmental conditions
    
    - Stores temperature, humidity, and soil moisture data
    - Runs disease prediction based on environment
    - Creates alerts if thresholds exceeded
    """
    try:
        db = await get_database()
        
        # 1. Save sensor reading to MongoDB
        reading_doc = {
            "deviceId": reading.deviceId,
            "temperature": reading.temperature,
            "humidity": reading.humidity,
            "soilMoisture": reading.soilMoisture,
            "recordedAt": datetime.utcnow()
        }
        result = await db.sensor_readings.insert_one(reading_doc)
        logger.info(f"Stored sensor reading for device {reading.deviceId}")
        
        # 2. Predict disease from environment
        prediction = predict_from_environment(
            reading.temperature, 
            reading.humidity, 
            reading.soilMoisture
        )
        
        # 3. Save prediction to database
        pred_doc = {
            "deviceId": reading.deviceId,
            "readingId": result.inserted_id,
            "disease": prediction["disease"],
            "confidence": prediction["confidence"],
            "risk_score": prediction.get("risk_score", 0.0),
            "predicted_risk_diseases": prediction.get("predicted_risk_diseases", []),
            "recommended_preventive_actions": prediction.get("recommended_preventive_actions", []),
            "timestamp": datetime.utcnow()
        }
        await db.predictions.insert_one(pred_doc)
        logger.info(f"Stored prediction: {prediction['disease']} ({prediction['confidence']:.2f}), risk: {prediction.get('risk_score', 0):.2f}")
        
        # 4. Check for alerts
        alert = await check_and_create_alerts(
            reading.deviceId,
            prediction["disease"],
            prediction["confidence"],
            {
                "temperature": reading.temperature,
                "humidity": reading.humidity,
                "soilMoisture": reading.soilMoisture
            },
            db
        )
        
        return {
            "success": True,
            "reading": {
                "_id": str(result.inserted_id),
                "deviceId": reading.deviceId,
                "temperature": reading.temperature,
                "humidity": reading.humidity,
                "soilMoisture": reading.soilMoisture,
                "recordedAt": reading_doc["recordedAt"].isoformat()
            },
            "prediction": prediction,
            "alert": alert
        }
        
    except Exception as e:
        logger.error(f"Error processing sensor reading: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/readings/latest")
async def get_latest_reading(deviceId: str = Query(..., description="Device identifier")):
    """Get the most recent sensor reading for a device"""
    try:
        db = await get_database()
        reading = await db.sensor_readings.find_one(
            {"deviceId": deviceId},
            sort=[("recordedAt", -1)]
        )
        
        if not reading:
            raise HTTPException(status_code=404, detail="No readings found for this device")
        
        # Convert ObjectId to string
        reading["_id"] = str(reading["_id"])
        reading["recordedAt"] = reading["recordedAt"].isoformat()
        
        return {"success": True, "data": reading}
        
    except HTTPException:
        raise
    except RuntimeError as e:
        logger.warning(f"MongoDB not available: {e}")
        raise HTTPException(
            status_code=503, 
            detail="IoT monitoring features require MongoDB. Please start MongoDB service."
        )
    except Exception as e:
        logger.error(f"Error fetching latest reading: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/readings/history")
async def get_reading_history(
    deviceId: str = Query(..., description="Device identifier"),
    limit: int = Query(50, ge=1, le=500, description="Number of readings to return")
):
    """Get historical sensor readings for a device"""
    try:
        db = await get_database()
        readings = await db.sensor_readings.find(
            {"deviceId": deviceId}
        ).sort("recordedAt", -1).limit(limit).to_list(limit)
        
        # Convert ObjectIds to strings and dates to ISO format
        for reading in readings:
            reading["_id"] = str(reading["_id"])
            reading["recordedAt"] = reading["recordedAt"].isoformat()
        
        return {"success": True, "data": readings, "count": len(readings)}
        
    except RuntimeError:
        raise HTTPException(
            status_code=503, 
            detail="IoT monitoring features require MongoDB. Please start MongoDB service."
        )
    except Exception as e:
        logger.error(f"Error fetching reading history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/predictions/latest")
async def get_latest_prediction(deviceId: str = Query(..., description="Device identifier")):
    """Get the most recent disease prediction for a device"""
    try:
        db = await get_database()
        prediction = await db.predictions.find_one(
            {"deviceId": deviceId},
            sort=[("timestamp", -1)]
        )
        
        if not prediction:
            return {"success": True, "data": None, "message": "No predictions yet"}
        
        # Convert ObjectId to string
        prediction["_id"] = str(prediction["_id"])
        prediction["readingId"] = str(prediction["readingId"])
        prediction["timestamp"] = prediction["timestamp"].isoformat()
        
        return {"success": True, "data": prediction}
        
    except RuntimeError:
        raise HTTPException(
            status_code=503, 
            detail="IoT monitoring features require MongoDB. Please start MongoDB service."
        )
    except Exception as e:
        logger.error(f"Error fetching latest prediction: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts")
async def get_alerts(
    deviceId: str = Query(..., description="Device identifier"),
    limit: int = Query(20, ge=1, le=100, description="Number of alerts to return"),
    unacknowledged_only: bool = Query(False, description="Show only unacknowledged alerts")
):
    """Get alerts for a device"""
    try:
        db = await get_database()
        
        query = {"deviceId": deviceId}
        if unacknowledged_only:
            query["acknowledged"] = False
        
        alerts = await db.alerts.find(query).sort("timestamp", -1).limit(limit).to_list(limit)
        
        # Convert ObjectIds and dates
        for alert in alerts:
            alert["_id"] = str(alert["_id"])
            alert["timestamp"] = alert["timestamp"].isoformat()
            if "acknowledgedAt" in alert:
                alert["acknowledgedAt"] = alert["acknowledgedAt"].isoformat()
        
        return {"success": True, "data": alerts, "count": len(alerts)}
        
    except Exception as e:
        logger.error(f"Error fetching alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert_endpoint(alert_id: str):
    """Mark an alert as acknowledged"""
    try:
        db = await get_database()
        success = await acknowledge_alert(alert_id, db)
        
        if not success:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        return {"success": True, "message": "Alert acknowledged"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error acknowledging alert: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_device_stats(deviceId: str = Query(..., description="Device identifier")):
    """Get statistics for a device (total readings, predictions, alerts)"""
    try:
        db = await get_database()
        
        total_readings = await db.sensor_readings.count_documents({"deviceId": deviceId})
        total_predictions = await db.predictions.count_documents({"deviceId": deviceId})
        total_alerts = await db.alerts.count_documents({"deviceId": deviceId})
        unacknowledged_alerts = await db.alerts.count_documents({
            "deviceId": deviceId,
            "acknowledged": False
        })
        
        return {
            "success": True,
            "data": {
                "deviceId": deviceId,
                "total_readings": total_readings,
                "total_predictions": total_predictions,
                "total_alerts": total_alerts,
                "unacknowledged_alerts": unacknowledged_alerts
            }
        }
        
    except RuntimeError:
        raise HTTPException(
            status_code=503, 
            detail="IoT monitoring features require MongoDB. Please start MongoDB service."
        )
    except Exception as e:
        logger.error(f"Error fetching device stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
