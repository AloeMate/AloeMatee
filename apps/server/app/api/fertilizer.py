"""
Fertilizer Advisor API Routes

Provides fertilizer recommendations based on sensor data (temperature,
humidity, soil moisture) and soil type. Integrates with IoT monitor
data when available, otherwise uses dummy sensor values.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Literal
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/fertilizer", tags=["Fertilizer Advisor"])


# ─────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────

class FertilizerPredictRequest(BaseModel):
    temperature: float = Field(..., description="Temperature in Celsius")
    humidity: float = Field(..., ge=0, le=100, description="Humidity percentage")
    soil_moisture: float = Field(..., ge=0, le=100, description="Soil moisture percentage")
    soil_type: Literal["loamy", "sandy", "clay"] = Field(
        "loamy", description="Soil type: loamy, sandy, or clay"
    )


class FertilizerPredictResponse(BaseModel):
    predicted_ph: float
    recommended_fertilizer: str
    application_rate: str
    notes: str
    sensor_status: str


class SensorDataResponse(BaseModel):
    temperature: float
    humidity: float
    soil_moisture: float
    source: str  # "iot" | "dummy"


# ─────────────────────────────────────────────
# Fertilizer Logic (rule-based)
# ─────────────────────────────────────────────

FERTILIZER_RULES = {
    # (soil_type): base_ph, neutral_fertilizer, dry_fertilizer, wet_fertilizer
    "loamy": {
        "base_ph": 6.8,
        "neutral": ("Balanced NPK 10-10-10", "150 g / plant / month"),
        "dry":     ("NPK 20-20-20 + Potassium Nitrate", "200 g / plant / month"),
        "wet":     ("Organic Compost + Nitrogen Booster", "100 g / plant / month"),
        "hot":     ("Slow-Release NPK 14-14-14", "120 g / plant / month"),
    },
    "sandy": {
        "base_ph": 6.2,
        "neutral": ("NPK 15-15-15 + Magnesium Sulfate", "180 g / plant / month"),
        "dry":     ("Water-Soluble NPK 20-10-10", "220 g / plant / month"),
        "wet":     ("Organic Compost + Humic Acid", "120 g / plant / month"),
        "hot":     ("Potassium Sulfate + NPK 10-10-20", "150 g / plant / month"),
    },
    "clay": {
        "base_ph": 7.2,
        "neutral": ("Gypsum + NPK 10-10-10", "130 g / plant / month"),
        "dry":     ("Potassium Chloride + Urea", "160 g / plant / month"),
        "wet":     ("Sulfur-Coated Urea + Compost", "90 g / plant / month"),
        "hot":     ("Calcium Nitrate + Slow-Release Potassium", "110 g / plant / month"),
    },
}

NOTES_MAP = {
    "neutral": "Conditions are optimal for aloe vera growth. Apply fertilizer bi-weekly.",
    "dry":     "Soil is dry — increase irrigation frequency alongside fertilizer application.",
    "wet":     "High moisture detected — reduce irrigation; use low-nitrogen fertilizer to prevent root rot.",
    "hot":     "High temperature detected — use slow-release formulas and water in the early morning.",
}


def classify_conditions(temperature: float, humidity: float, soil_moisture: float) -> str:
    """Classify environmental conditions to pick a fertilizer scenario."""
    if temperature > 32:
        return "hot"
    if soil_moisture < 25:
        return "dry"
    if soil_moisture > 55 or humidity > 80:
        return "wet"
    return "neutral"


def predict_fertilizer(
    temperature: float,
    humidity: float,
    soil_moisture: float,
    soil_type: str,
) -> dict:
    soil_type = soil_type.lower()
    if soil_type not in FERTILIZER_RULES:
        soil_type = "loamy"

    rules = FERTILIZER_RULES[soil_type]
    condition = classify_conditions(temperature, humidity, soil_moisture)

    # Adjust pH based on conditions
    ph_adjustments = {"neutral": 0.0, "dry": -0.1, "wet": +0.2, "hot": -0.05}
    predicted_ph = round(rules["base_ph"] + ph_adjustments.get(condition, 0.0), 1)

    fertilizer_name, rate = rules.get(condition, rules["neutral"])
    note = NOTES_MAP.get(condition, "")

    return {
        "predicted_ph": predicted_ph,
        "recommended_fertilizer": fertilizer_name,
        "application_rate": rate,
        "notes": note,
        "sensor_status": condition,
    }


# ─────────────────────────────────────────────
# Dummy sensor data (mirrors harvest_prediction mock IoT)
# ─────────────────────────────────────────────

DUMMY_SENSOR = {
    "temperature": 30.0,
    "humidity": 65.0,
    "soil_moisture": 40.0,
    "source": "dummy",
}


# ─────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────

@router.get("/sensor-data", response_model=SensorDataResponse)
async def get_sensor_data(deviceId: Optional[str] = None):
    """
    Get current sensor data for the fertilizer advisor.

    Tries to fetch real IoT data from MongoDB for the given device.
    Falls back to dummy sensor values if unavailable.
    """
    if deviceId:
        try:
            from app.database import get_database
            db = await get_database()
            reading = await db.sensor_readings.find_one(
                {"deviceId": deviceId},
                sort=[("recordedAt", -1)]
            )
            if reading:
                logger.info(f"Using real IoT data for device {deviceId}")
                return {
                    "temperature": reading["temperature"],
                    "humidity": reading["humidity"],
                    "soil_moisture": reading["soilMoisture"],
                    "source": "iot",
                }
        except Exception as e:
            logger.warning(f"IoT data fetch failed, using dummy: {e}")

    # Fall back to dummy data
    return DUMMY_SENSOR


@router.post("/predict", response_model=FertilizerPredictResponse)
async def predict_fertilizer_endpoint(req: FertilizerPredictRequest):
    """
    Predict the recommended fertilizer based on sensor readings and soil type.

    - **temperature**: Current temperature (°C)
    - **humidity**: Current humidity (%)
    - **soil_moisture**: Current soil moisture (%)
    - **soil_type**: loamy | sandy | clay
    """
    try:
        result = predict_fertilizer(
            temperature=req.temperature,
            humidity=req.humidity,
            soil_moisture=req.soil_moisture,
            soil_type=req.soil_type,
        )
        return FertilizerPredictResponse(**result)
    except Exception as e:
        logger.error(f"Fertilizer prediction error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Fertilizer prediction failed.")
