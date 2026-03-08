"""
IoT Prediction Service - Environmental-based disease risk prediction
"""
import joblib
import numpy as np
from pathlib import Path
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)

MODEL_PATH = Path(__file__).parent.parent / "ml_models" / "iot_disease_model.pkl"


class IoTPredictionService:
    """Service for predicting disease risk from environmental conditions"""
    
    def __init__(self):
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """Load IoT disease prediction model"""
        try:
            if not MODEL_PATH.exists():
                logger.warning(f"IoT model not found at {MODEL_PATH}")
                return
            
            self.model = joblib.load(MODEL_PATH)
            logger.info(f"✅ IoT disease model loaded from {MODEL_PATH}")
        except Exception as e:
            logger.error(f"❌ Failed to load IoT model: {e}")
    
    def _calculate_risk_score(self, temperature: float, humidity: float, soil_moisture: float) -> float:
        """Calculate overall risk score based on environmental conditions"""
        risk_factors = []
        
        # Temperature risk (optimal: 20-30°C)
        if temperature < 10 or temperature > 35:
            risk_factors.append(0.8)
        elif temperature < 15 or temperature > 32:
            risk_factors.append(0.5)
        else:
            risk_factors.append(0.1)
        
        # Humidity risk (optimal: 40-70%)
        if humidity < 30 or humidity > 80:
            risk_factors.append(0.9)
        elif humidity < 35 or humidity > 75:
            risk_factors.append(0.6)
        else:
            risk_factors.append(0.2)
        
        # Soil moisture risk (optimal: 30-60%)
        if soil_moisture < 20:
            risk_factors.append(0.7)
        elif soil_moisture > 70:
            risk_factors.append(0.85)
        elif soil_moisture < 25 or soil_moisture > 65:
            risk_factors.append(0.4)
        else:
            risk_factors.append(0.15)
        
        # Overall risk is weighted average
        return sum(risk_factors) / len(risk_factors)
    
    def _get_preventive_actions(self, temperature: float, humidity: float, soil_moisture: float, disease: str) -> List[str]:
        """Generate preventive action recommendations based on conditions"""
        actions = []
        
        # Temperature-based actions
        if temperature < 10:
            actions.append("⚠️ Temperature too low - Move plants to warmer location or use heating")
        elif temperature > 35:
            actions.append("🌡️ Temperature too high - Provide shade or move to cooler location")
        elif temperature > 30:
            actions.append("☀️ Temperature elevated - Monitor for heat stress, ensure adequate ventilation")
        
        # Humidity-based actions
        if humidity < 30:
            actions.append("💧 Low humidity - Increase watering frequency or use humidifier")
        elif humidity > 80:
            actions.append("🌊 High humidity - Improve air circulation to prevent fungal growth")
            actions.append("🍃 Reduce watering frequency and ensure proper drainage")
        elif humidity > 70:
            actions.append("💨 Moderate-high humidity - Ensure good ventilation")
        
        # Soil moisture-based actions
        if soil_moisture < 20:
            actions.append("🏜️ Soil too dry - Water plants immediately and establish regular watering schedule")
        elif soil_moisture < 30:
            actions.append("🌱 Soil moisture low - Increase watering frequency")
        elif soil_moisture > 70:
            actions.append("⚠️ Soil waterlogged - Stop watering and improve drainage immediately")
            actions.append("🔍 Check for root rot symptoms")
        elif soil_moisture > 60:
            actions.append("💦 Soil moisture high - Reduce watering and monitor drainage")
        
        # Disease-specific actions
        if disease and disease.lower() not in ['healthy', 'no risk', 'error']:
            actions.append(f"🦠 {disease} risk detected - Inspect plants for early symptoms")
            
            if 'rot' in disease.lower() or 'fungal' in disease.lower():
                actions.append("🍄 Apply fungicide preventively according to label instructions")
                actions.append("✂️ Remove any affected plant parts and dispose properly")
            
            if 'bacterial' in disease.lower():
                actions.append("💊 Consider copper-based bactericide if symptoms appear")
                actions.append("🧼 Sanitize tools between plants to prevent spread")
        
        # General preventive measures
        if len(actions) == 0:
            actions.append("✅ Conditions optimal - Continue current care routine")
            actions.append("👀 Monitor plants daily for any changes")
        else:
            actions.append("📊 Monitor environmental conditions closely")
            actions.append("📝 Keep records of changes and plant responses")
        
        return actions
    
    def predict_from_environment(
        self, 
        temperature: float, 
        humidity: float, 
        soil_moisture: float
    ) -> Dict[str, any]:
        """
        Predict disease risk from environmental conditions
        
        Args:
            temperature: Temperature in Celsius
            humidity: Humidity percentage (0-100)
            soil_moisture: Soil moisture percentage (0-100)
            
        Returns:
            Dictionary with disease prediction, confidence, and factors
        """
        if self.model is None:
            logger.warning("IoT model not available, returning default prediction")
            return {
                "disease": "No Risk",
                "confidence": 0.0,
                "environmental_factors": {
                    "temperature": temperature,
                    "humidity": humidity,
                    "soil_moisture": soil_moisture
                },
                "message": "Model not available - install IoT model to enable predictions"
            }
        
        try:
            # Prepare features array
            X = np.array([[temperature, humidity, soil_moisture]], dtype=float)
            
            # Get prediction
            disease = self.model.predict(X)[0]
            
            # Get top-N predictions if model supports probability
            top_predictions = []
            confidence = 1.0
            
            if hasattr(self.model, "predict_proba") and hasattr(self.model, "classes_"):
                proba = self.model.predict_proba(X)[0]
                confidence = float(np.max(proba))
                
                # Get top 3 predictions
                top_indices = np.argsort(proba)[::-1][:3]
                for idx in top_indices:
                    if proba[idx] > 0.01:  # Only include if probability > 1%
                        top_predictions.append({
                            "disease": str(self.model.classes_[idx]),
                            "probability": float(proba[idx])
                        })
            else:
                # If no probability support, just return the single prediction
                top_predictions.append({
                    "disease": str(disease),
                    "probability": confidence
                })
            
            # Calculate overall risk score
            risk_score = self._calculate_risk_score(temperature, humidity, soil_moisture)
            
            # If model confidence is high for a disease, increase risk score
            if disease.lower() not in ['healthy', 'no risk'] and confidence > 0.5:
                risk_score = max(risk_score, confidence * 0.8 + 0.2)
            
            # Generate preventive actions
            actions = self._get_preventive_actions(temperature, humidity, soil_moisture, str(disease))
            
            logger.info(f"IoT Prediction: {disease} (confidence: {confidence:.2f}, risk: {risk_score:.2f})")
            
            return {
                "disease": str(disease),  # Backward compatibility
                "confidence": confidence,  # Backward compatibility
                "risk_score": risk_score,  # New: overall risk assessment
                "predicted_risk_diseases": top_predictions,  # New: top-N predictions
                "recommended_preventive_actions": actions,  # New: action suggestions
                "environmental_factors": {
                    "temperature": temperature,
                    "humidity": humidity,
                    "soil_moisture": soil_moisture
                }
            }
        except Exception as e:
            logger.error(f"Error during IoT prediction: {e}")
            return {
                "disease": "Error",
                "confidence": 0.0,
                "environmental_factors": {
                    "temperature": temperature,
                    "humidity": humidity,
                    "soil_moisture": soil_moisture
                },
                "error": str(e)
            }


# Global instance
iot_predictor = IoTPredictionService()


def predict_from_environment(temp: float, humidity: float, moisture: float) -> Dict:
    """Convenience function to use global predictor instance"""
    return iot_predictor.predict_from_environment(temp, humidity, moisture)
