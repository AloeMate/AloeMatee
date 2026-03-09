from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import logging

from app.config import settings
from app.services.weather_service import get_weather_for_district
from app.services.harvest_yield_ml import predict_harvest_yield

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/harvest-yield", tags=["Harvest Yield"])


class HarvestYieldRequest(BaseModel):
    region: str
    soilType: str
    irrigationType: str
    irrigationPerWeek: int = Field(..., ge=0, le=7)
    fertilizerType: str
    fertilizerKgPerMonth: float = Field(..., ge=0)
    diseaseSeverity: float = Field(..., ge=0, le=5)
    plantCount: int = Field(..., gt=0)
    avgPlantAgeMonths: float = Field(..., ge=6)
    farmAreaHa: Optional[float] = Field(default=None, gt=0)


class WeatherUsed(BaseModel):
    temperatureC: float
    humidityPct: float
    rainfallMm: float


class HarvestYieldResponse(BaseModel):
    success: bool
    predictedHarvestKg: float
    modelVersion: str
    usedWeather: WeatherUsed
    weatherSource: str  # "live" | "mock"


@router.post("", response_model=HarvestYieldResponse)
async def predict_harvest(body: HarvestYieldRequest):
    """
    Predict Aloe Vera harvest yield in kg.

    Automatically fetches live weather for the requested region using
    OpenWeather API and feeds it into the scikit-learn model together
    with the farmer-supplied agronomic inputs.
    """
    # 1. Fetch weather (falls back to mock data on API failure)
    api_key = getattr(settings, "OPENWEATHER_API_KEY", None) or ""
    base_url = getattr(settings, "OPENWEATHER_BASE_URL", "https://api.openweathermap.org")

    weather_source = "live"
    try:
        if not api_key:
            raise ValueError("No OpenWeather API key configured — using mock data")
        weather = await get_weather_for_district(body.region, api_key, base_url)
    except ValueError as exc:
        logger.warning("Weather fallback: %s", exc)
        weather = {"temperatureC": 28.5, "humidityPct": 75.0, "rainfallMm": 2.0}
        weather_source = "mock"
    except Exception as exc:
        logger.warning("Weather fetch failed: %s — using mock data", exc)
        weather = {"temperatureC": 28.5, "humidityPct": 75.0, "rainfallMm": 2.0}
        weather_source = "mock"

    # 2. Run ML model
    try:
        predicted_kg = predict_harvest_yield(
            region=body.region,
            temperature_c=weather["temperatureC"],
            rainfall_mm=weather["rainfallMm"],
            humidity_pct=weather["humidityPct"],
            soil_type=body.soilType,
            irrigation_type=body.irrigationType,
            irrigation_per_week=body.irrigationPerWeek,
            fertilizer_type=body.fertilizerType,
            fertilizer_kg_per_month=body.fertilizerKgPerMonth,
            disease_severity=body.diseaseSeverity,
            plant_count=body.plantCount,
            avg_plant_age_months=body.avgPlantAgeMonths,
            farm_area_ha=body.farmAreaHa,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError as exc:
        logger.error("Model file missing: %s", exc)
        raise HTTPException(status_code=503, detail="Harvest yield model is not available.")
    except Exception as exc:
        logger.exception("Harvest yield prediction failed: %s", exc)
        raise HTTPException(status_code=500, detail="Prediction failed. Please try again.")

    return HarvestYieldResponse(
        success=True,
        predictedHarvestKg=round(predicted_kg, 2),
        modelVersion="v1",
        usedWeather=WeatherUsed(**weather),
        weatherSource=weather_source,
    )
