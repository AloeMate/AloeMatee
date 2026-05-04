"""
Harvest Yield Prediction Service
Handles weather data fetching (OpenWeather or fallback) + ML inference.
Ported from the standalone Node.js/Python harvest_prediction project.
"""
import logging
import os
from typing import Optional

import httpx
from pydantic import BaseModel

from app.ml_models.harvest_yield.model import build_features, predict_yield

logger = logging.getLogger(__name__)

# District coordinates for weather fetching (Sri Lanka)
DISTRICT_COORDS: dict[str, dict] = {
    "Kurunegala":  {"lat": 7.4863,  "lon": 80.3647},
    "Anuradhapura": {"lat": 8.3114, "lon": 80.4037},
    "Colombo":     {"lat": 6.9271,  "lon": 79.8612},
    "Kandy":       {"lat": 7.2906,  "lon": 80.6337},
    "Galle":       {"lat": 6.0535,  "lon": 80.2210},
    "Matara":      {"lat": 5.9483,  "lon": 80.5353},
    "Jaffna":      {"lat": 9.6615,  "lon": 80.0255},
    "Puttalam":    {"lat": 8.0408,  "lon": 79.8394},
}

# Seasonal fallback weather by month (Sri Lanka averages)
MONTHLY_WEATHER_FALLBACK = {
    1:  {"temperatureC": 27.5, "humidityPct": 72, "rainfallMm": 60},
    2:  {"temperatureC": 28.2, "humidityPct": 69, "rainfallMm": 55},
    3:  {"temperatureC": 29.1, "humidityPct": 68, "rainfallMm": 90},
    4:  {"temperatureC": 29.5, "humidityPct": 72, "rainfallMm": 150},
    5:  {"temperatureC": 28.9, "humidityPct": 78, "rainfallMm": 200},
    6:  {"temperatureC": 28.0, "humidityPct": 80, "rainfallMm": 130},
    7:  {"temperatureC": 27.6, "humidityPct": 79, "rainfallMm": 100},
    8:  {"temperatureC": 27.8, "humidityPct": 78, "rainfallMm": 95},
    9:  {"temperatureC": 28.3, "humidityPct": 78, "rainfallMm": 140},
    10: {"temperatureC": 28.0, "humidityPct": 80, "rainfallMm": 260},
    11: {"temperatureC": 27.5, "humidityPct": 78, "rainfallMm": 320},
    12: {"temperatureC": 27.1, "humidityPct": 76, "rainfallMm": 160},
}


class WeatherData(BaseModel):
    temperatureC: float
    humidityPct: float
    rainfallMm: float
    source: str = "fallback"


class HarvestYieldRequest(BaseModel):
    region: str
    soilType: str
    irrigationType: str
    irrigationPerWeek: int
    fertilizerType: str
    fertilizerKgPerMonth: float
    diseaseSeverity: float
    plantCount: int
    avgPlantAgeMonths: float
    farmAreaHa: Optional[float] = None


class HarvestYieldResponse(BaseModel):
    predictedHarvestKg: float
    modelVersion: str = "v1"
    usedWeather: WeatherData


async def fetch_live_weather(region: str) -> Optional[WeatherData]:
    """Try to fetch real-time weather from OpenWeather API."""
    api_key = os.getenv("OPENWEATHER_API_KEY", "")
    if not api_key:
        return None

    coords = DISTRICT_COORDS.get(region)
    if not coords:
        return None

    url = (
        f"https://api.openweathermap.org/data/2.5/weather"
        f"?lat={coords['lat']}&lon={coords['lon']}"
        f"&appid={api_key}&units=metric"
    )
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
            return WeatherData(
                temperatureC=round(data["main"]["temp"], 1),
                humidityPct=data["main"]["humidity"],
                rainfallMm=round(data.get("rain", {}).get("1h", 0) * 24, 1),
                source="openweather",
            )
    except Exception as e:
        logger.warning(f"OpenWeather fetch failed for {region}: {e}")
        return None


def get_fallback_weather() -> WeatherData:
    """Return seasonal average weather for the current month."""
    from datetime import datetime
    month = datetime.now().month
    w = MONTHLY_WEATHER_FALLBACK.get(month, MONTHLY_WEATHER_FALLBACK[1])
    return WeatherData(**w, source="seasonal-average")


async def run_harvest_yield_prediction(req: HarvestYieldRequest) -> HarvestYieldResponse:
    """Main service function: fetch weather → run ML model → return result."""
    # 1. Validate region
    if req.region not in DISTRICT_COORDS:
        raise ValueError(
            f"Unsupported region '{req.region}'. "
            f"Supported: {list(DISTRICT_COORDS.keys())}"
        )

    # 2. Get weather (live or fallback)
    weather = await fetch_live_weather(req.region) or get_fallback_weather()
    logger.info(f"Weather for {req.region}: {weather.temperatureC}°C, source={weather.source}")

    # 3. Build feature DataFrame
    features = build_features(
        region=req.region,
        temperature_c=weather.temperatureC,
        rainfall_mm=weather.rainfallMm,
        humidity_pct=weather.humidityPct,
        soil_type=req.soilType,
        irrigation_type=req.irrigationType,
        irrigation_per_week=req.irrigationPerWeek,
        fertilizer_type=req.fertilizerType,
        fertilizer_kg_per_month=req.fertilizerKgPerMonth,
        disease_severity=req.diseaseSeverity,
        plant_count=req.plantCount,
        avg_plant_age_months=req.avgPlantAgeMonths,
        farm_area_ha=req.farmAreaHa or 1.0,
    )

    # 4. Run ML model
    predicted_kg = predict_yield(features)
    logger.info(f"Harvest yield prediction: {predicted_kg:.1f} kg")

    return HarvestYieldResponse(
        predictedHarvestKg=round(predicted_kg, 2),
        usedWeather=weather,
    )
