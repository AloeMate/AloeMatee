"""
Harvest Yield Prediction API Router
POST /harvest/yield-predict  →  predicted yield in kg
"""
from fastapi import APIRouter, HTTPException
import logging

from app.services.harvest_yield import (
    HarvestYieldRequest,
    HarvestYieldResponse,
    run_harvest_yield_prediction,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/harvest", tags=["Harvest Yield"])


@router.post("/yield-predict", response_model=HarvestYieldResponse)
async def yield_predict(req: HarvestYieldRequest):
    """
    Predict aloe vera harvest yield (kg) from farm parameters + live weather.

    - **region**: Sri Lankan district (e.g. Kurunegala, Colombo)
    - **soilType**: Sandy | Loamy | Clay | Sandy Loam | Clay Loam
    - **irrigationType**: Rainfed | Drip | Sprinkler | Flood
    - **fertilizerType**: None | Organic | NPK | Compost+NPK
    - **plantCount**: Number of plants on the farm
    - **avgPlantAgeMonths**: Average age of plants in months (min 6)
    - **farmAreaHa**: Optional total farm area in hectares
    """
    try:
        result = await run_harvest_yield_prediction(req)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=f"ML model unavailable: {e}")
    except Exception as e:
        logger.error(f"Harvest yield prediction error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Prediction failed. Please try again.")
