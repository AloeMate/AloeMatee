"""
Alert Service - Monitor environmental conditions and create alerts
"""
from datetime import datetime
from typing import Optional, Dict
import logging

logger = logging.getLogger(__name__)

# Alert thresholds
ALERT_THRESHOLDS = {
    "confidence": 0.7,  # Alert if confidence >= 70%
    "temperature_high": 35.0,  # °C
    "temperature_low": 10.0,  # °C
    "humidity_high": 80.0,  # %
    "humidity_low": 30.0,  # %
    "soil_moisture_low": 20.0,  # %
}


async def check_and_create_alerts(
    device_id: str,
    disease: str,
    confidence: float,
    reading: Dict,
    db
) -> Optional[Dict]:
    """
    Check environmental conditions and create alerts if needed
    
    Args:
        device_id: Device identifier
        disease: Predicted disease
        confidence: Prediction confidence
        reading: Sensor reading data
        db: Database instance
        
    Returns:
        Alert document if created, None otherwise
    """
    try:
        alerts_to_create = []
        
        # Check disease confidence
        if disease != "No Risk" and confidence >= ALERT_THRESHOLDS["confidence"]:
            message = f"⚠️ High risk of {disease} detected (Confidence: {confidence*100:.0f}%)"
            alerts_to_create.append({
                "deviceId": device_id,
                "type": "DISEASE_RISK",
                "disease": disease,
                "confidence": confidence,
                "message": message,
                "severity": "HIGH" if confidence >= 0.85 else "MEDIUM",
                "timestamp": datetime.utcnow(),
                "acknowledged": False
            })
        
        # Check temperature
        temp = reading.get("temperature", 0)
        if temp > ALERT_THRESHOLDS["temperature_high"]:
            alerts_to_create.append({
                "deviceId": device_id,
                "type": "TEMPERATURE_HIGH",
                "disease": "Environmental Stress",
                "confidence": 1.0,
                "message": f"🌡️ Temperature too high: {temp}°C (Limit: {ALERT_THRESHOLDS['temperature_high']}°C)",
                "severity": "MEDIUM",
                "timestamp": datetime.utcnow(),
                "acknowledged": False
            })
        elif temp < ALERT_THRESHOLDS["temperature_low"]:
            alerts_to_create.append({
                "deviceId": device_id,
                "type": "TEMPERATURE_LOW",
                "disease": "Environmental Stress",
                "confidence": 1.0,
                "message": f"🌡️ Temperature too low: {temp}°C (Limit: {ALERT_THRESHOLDS['temperature_low']}°C)",
                "severity": "MEDIUM",
                "timestamp": datetime.utcnow(),
                "acknowledged": False
            })
        
        # Check humidity
        humidity = reading.get("humidity", 0)
        if humidity > ALERT_THRESHOLDS["humidity_high"]:
            alerts_to_create.append({
                "deviceId": device_id,
                "type": "HUMIDITY_HIGH",
                "disease": "Environmental Stress",
                "confidence": 1.0,
                "message": f"💧 Humidity too high: {humidity}% (Limit: {ALERT_THRESHOLDS['humidity_high']}%)",
                "severity": "MEDIUM",
                "timestamp": datetime.utcnow(),
                "acknowledged": False
            })
        elif humidity < ALERT_THRESHOLDS["humidity_low"]:
            alerts_to_create.append({
                "deviceId": device_id,
                "type": "HUMIDITY_LOW",
                "disease": "Environmental Stress",
                "confidence": 1.0,
                "message": f"💧 Humidity too low: {humidity}% (Limit: {ALERT_THRESHOLDS['humidity_low']}%)",
                "severity": "MEDIUM",
                "timestamp": datetime.utcnow(),
                "acknowledged": False
            })
        
        # Check soil moisture
        moisture = reading.get("soilMoisture", 0)
        if moisture < ALERT_THRESHOLDS["soil_moisture_low"]:
            alerts_to_create.append({
                "deviceId": device_id,
                "type": "SOIL_MOISTURE_LOW",
                "disease": "Environmental Stress",
                "confidence": 1.0,
                "message": f"🌱 Soil moisture too low: {moisture}% (Limit: {ALERT_THRESHOLDS['soil_moisture_low']}%)",
                "severity": "HIGH",  # Critical for plant health
                "timestamp": datetime.utcnow(),
                "acknowledged": False
            })
        
        # Create alerts in database
        if alerts_to_create:
            result = await db.alerts.insert_many(alerts_to_create)
            logger.info(f"Created {len(alerts_to_create)} alerts for device {device_id}")
            
            # Return the most severe alert
            most_severe = alerts_to_create[0]
            most_severe["_id"] = str(result.inserted_ids[0])
            return most_severe
        
        return None
        
    except Exception as e:
        logger.error(f"Error creating alerts: {e}")
        return None


async def acknowledge_alert(alert_id: str, db) -> bool:
    """Mark an alert as acknowledged"""
    try:
        from bson import ObjectId
        result = await db.alerts.update_one(
            {"_id": ObjectId(alert_id)},
            {"$set": {"acknowledged": True, "acknowledgedAt": datetime.utcnow()}}
        )
        return result.modified_count > 0
    except Exception as e:
        logger.error(f"Error acknowledging alert: {e}")
        return False
