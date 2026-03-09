import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

import joblib
import pandas as pd

logger = logging.getLogger(__name__)

_MODEL_PATH = Path(__file__).resolve().parent.parent / "ml_models" / "aloevera_harvest_model.joblib"
_model = None


def _get_model():
    global _model
    if _model is None:
        if not _MODEL_PATH.exists():
            raise FileNotFoundError(f"Harvest yield model not found at: {_MODEL_PATH}")
        _model = joblib.load(_MODEL_PATH)
        logger.info("✅ Harvest yield model loaded from %s", _MODEL_PATH)
    return _model


def predict_harvest_yield(
    region: str,
    temperature_c: float,
    rainfall_mm: float,
    humidity_pct: float,
    soil_type: str,
    irrigation_type: str,
    irrigation_per_week: int,
    fertilizer_type: str,
    fertilizer_kg_per_month: float,
    disease_severity: float,
    plant_count: int,
    avg_plant_age_months: float,
    farm_area_ha: Optional[float] = None,
) -> float:
    """Run the harvest yield model and return predicted kg."""
    now = datetime.now()

    features = {
        "Region":                   region,
        "Temperature_C":            temperature_c,
        "Rainfall_mm":              rainfall_mm,
        "Humidity_pct":             humidity_pct,
        "Soil_Type":                soil_type,
        "Irrigation_Type":          irrigation_type,
        "Irrigation_Per_Week":      irrigation_per_week,
        "Fertilizer_Type":          fertilizer_type,
        "Fertilizer_kg_per_month":  fertilizer_kg_per_month,
        "Disease_Severity_0_5":     disease_severity,
        "Plant_Count":              plant_count,
        "Avg_Plant_Age_months":     avg_plant_age_months,
        "Farm_Area_ha":             farm_area_ha if farm_area_ha is not None else 1.0,
        "month":                    now.month,
        "dayofyear":                int(now.strftime("%j")),
    }

    df = pd.DataFrame([features])
    model = _get_model()
    prediction = model.predict(df)[0]
    return float(prediction)
