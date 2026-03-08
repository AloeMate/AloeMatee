from pydantic import BaseModel, Field
from typing import List, Optional, Literal


class DiseasePrediction(BaseModel):
    disease_id: str
    disease_name: str
    prob: float = Field(..., ge=0.0, le=1.0, description="Probability score (0.0 to 1.0)")


class PredictResponse(BaseModel):
    request_id: str
    num_images_received: int
    predictions: List[DiseasePrediction]
    confidence_status: Literal["HIGH", "MEDIUM", "LOW"]
    recommended_next_step: Literal["RETAKE", "SHOW_TREATMENT"]
    symptoms_summary: str
    retake_message: Optional[str] = Field(None, description="Message with tips for retaking photos (only for LOW confidence)")


class DiseaseInfo(BaseModel):
    disease_id: str
    disease_name: str
    description: str
    severity: str
    common_symptoms: List[str]


class DiseasesResponse(BaseModel):
    diseases: List[DiseaseInfo]
    count: int


class TreatmentStep(BaseModel):
    title: str
    details: str
    duration: Optional[str] = None
    frequency: Optional[str] = None


class Citation(BaseModel):
    title: str
    source: str
    snippet: str


class TreatmentRequest(BaseModel):
    disease_id: str
    mode: Literal["SCIENTIFIC", "AYURVEDIC"]


class TreatmentResponse(BaseModel):
    disease_id: str
    mode: str
    steps: List[TreatmentStep]
    dosage_frequency: str
    safety_warnings: List[str]
    when_to_consult_expert: List[str]
    citations: List[Citation]


class HealthCheckResponse(BaseModel):
    status: str
    version: str
    message: str


class FeedbackRequest(BaseModel):
    request_id: str = Field(..., description="Request ID from the prediction")
    selected_disease_id: str = Field(..., description="Disease ID user says is correct (or 'unknown')")
    was_prediction_helpful: bool = Field(..., description="Whether the prediction was helpful")
    notes: Optional[str] = Field(None, max_length=500, description="Optional feedback notes")


class FeedbackResponse(BaseModel):
    success: bool
    message: str
    feedback_id: Optional[int] = None


class FeedbackStatsResponse(BaseModel):
    total_predictions: int
    total_feedback: int
    feedback_rate: str
    helpful_rate: str
    confidence_distribution: dict
    common_corrections: List[dict]


# ========================================
# IoT Monitoring Schemas
# ========================================

class SensorReadingCreate(BaseModel):
    deviceId: str = Field(..., description="Unique device identifier")
    temperature: float = Field(..., description="Temperature in Celsius")
    humidity: float = Field(..., ge=0, le=100, description="Humidity percentage")
    soilMoisture: float = Field(..., ge=0, le=100, description="Soil moisture percentage")


class SensorReadingResponse(BaseModel):
    id: str
    deviceId: str
    temperature: float
    humidity: float
    soilMoisture: float
    recordedAt: str


class IoTDiseasePrediction(BaseModel):
    """Individual disease prediction with probability for IoT"""
    disease: str
    probability: float


class IoTPrediction(BaseModel):
    disease: str  # Primary predicted disease (backward compatibility)
    confidence: float  # Confidence of primary disease (backward compatibility)
    risk_score: float  # Overall risk score (0-1)
    predicted_risk_diseases: List[IoTDiseasePrediction]  # Top-N disease predictions
    recommended_preventive_actions: List[str]  # Action suggestions
    environmental_factors: dict


class IoTPredictionResponse(BaseModel):
    success: bool
    reading: dict
    prediction: IoTPrediction
    alert: Optional[dict] = None


class AlertResponse(BaseModel):
    id: str
    deviceId: str
    disease: str
    confidence: float
    message: str
    timestamp: str
    acknowledged: bool = False

