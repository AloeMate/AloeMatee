"""
Harvest Yield Model Loader
Loads the trained scikit-learn model (aloevera_harvest_model.joblib)
for aloe vera yield prediction (in kg).
"""
import logging
from pathlib import Path
from datetime import datetime
import pandas as pd

logger = logging.getLogger(__name__)

_model = None

MODEL_PATH = Path(__file__).resolve().parent / "aloevera_harvest_model.joblib"


def get_harvest_model():
    """Load and cache the harvest yield model (lazy singleton)."""
    global _model
    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"Harvest model not found at: {MODEL_PATH}")
        try:
            import joblib
            _model = joblib.load(MODEL_PATH)
            logger.info(f"✅ Harvest yield model loaded from {MODEL_PATH}")
        except Exception as e:
            logger.error(f"❌ Failed to load harvest model: {e}")
            raise
    return _model


def build_features(
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
    farm_area_ha: float = 1.0,
) -> pd.DataFrame:
    """Build a feature DataFrame matching the training schema."""
    now = datetime.now()
    data = {
        "Region":                  region,
        "Temperature_C":           temperature_c,
        "Rainfall_mm":             rainfall_mm,
        "Humidity_pct":            humidity_pct,
        "Soil_Type":               soil_type,
        "Irrigation_Type":         irrigation_type,
        "Irrigation_Per_Week":     irrigation_per_week,
        "Fertilizer_Type":         fertilizer_type,
        "Fertilizer_kg_per_month": fertilizer_kg_per_month,
        "Disease_Severity_0_5":    disease_severity,
        "Plant_Count":             plant_count,
        "Avg_Plant_Age_months":    avg_plant_age_months,
        "Farm_Area_ha":            farm_area_ha if farm_area_ha else 1.0,
        "month":                   now.month,
        "dayofyear":               int(now.strftime("%j")),
    }
    return pd.DataFrame([data])


def predict_yield(features: pd.DataFrame) -> float:
    """Run the model and return predicted harvest kg."""
    model = get_harvest_model()
    result = model.predict(features)
    return float(result[0])
