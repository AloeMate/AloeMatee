"""
Harvest ML Service - Optional ML-based maturity assessment

Uses EfficientNetB0 Keras model for Aloe Vera condition classification.
This is an alternative to the measurement-based approach.
"""
import numpy as np
import cv2
from pathlib import Path
import logging
from typing import Dict, List, Tuple

logger = logging.getLogger(__name__)


class HarvestMLService:
    """ML-based harvest maturity assessment"""
    
    def __init__(self):
        self.model = None
        self.model_loaded = False
        self.img_size = 224  # EfficientNetB0 input size
        
        # Class mapping (you may need to adjust based on actual model classes)
        self.classes = [
            "Immature",
            "Young",
            "Developing", 
            "Mature",
            "Ready for Harvest",
            "Overripe"
        ]
        
        self._load_model()
    
    def _load_model(self):
        """Load the Keras model"""
        try:
            # Import TensorFlow only when needed
            import tensorflow as tf
            
            # Use .h5 file instead of directory to avoid Windows permission issues
            model_path = Path(__file__).parent.parent / "ml_models" / "harvest_model.h5"
            
            if not model_path.exists():
                logger.warning(f"Harvest ML model not found at {model_path}. ML-based assessment will be unavailable.")
                logger.info("The system will continue using measurement-based assessment only.")
                return
            
            # Load .h5 format model with custom objects for data augmentation layers
            custom_objects = {
                'RandomHeight': tf.keras.layers.RandomHeight,
                'RandomWidth': tf.keras.layers.RandomWidth,
                'RandomRotation': tf.keras.layers.RandomRotation,
                'RandomZoom': tf.keras.layers.RandomZoom,
                'RandomFlip': tf.keras.layers.RandomFlip,
                'RandomContrast': tf.keras.layers.RandomContrast,
                'RandomBrightness': tf.keras.layers.RandomBrightness,
                'Rescaling': tf.keras.layers.Rescaling,
            }
            
            self.model = tf.keras.models.load_model(str(model_path), custom_objects=custom_objects, compile=False)
            self.model_loaded = True
            logger.info(f"✅ Harvest ML model loaded from {model_path}")
            logger.info(f"   Input shape: {self.model.input_shape}")
            logger.info(f"   Output shape: {self.model.output_shape}")
            logger.info(f"   Model layers: {len(self.model.layers)}")
            
        except ImportError:
            logger.warning("TensorFlow not installed. ML-based assessment unavailable.")
        except Exception as e:
            logger.warning(f"Failed to load harvest ML model: {e}. Continuing with measurement-based assessment only.")
    
    def is_available(self) -> bool:
        """Check if ML model is available"""
        return self.model_loaded
    
    def preprocess_image(self, image_bytes: bytes) -> np.ndarray:
        """Preprocess image for EfficientNetB0"""
        # Decode image
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Resize to 224x224
        img = cv2.resize(img, (self.img_size, self.img_size))
        
        # Normalize (EfficientNet preprocessing)
        img = img.astype(np.float32) / 255.0
        
        # Add batch dimension
        img = np.expand_dims(img, axis=0)
        
        return img
    
    def predict(self, image_bytes: bytes) -> Dict:
        """
        Predict maturity from leaf image
        
        Returns:
            dict with prediction, confidence, status, message
        """
        if not self.model_loaded:
            return {
                "success": False,
                "error": "ML model not available",
                "method": "ml"
            }
        
        try:
            # Preprocess
            img = self.preprocess_image(image_bytes)
            
            # Predict
            predictions = self.model.predict(img, verbose=0)[0]
            
            # Get top prediction
            class_idx = np.argmax(predictions)
            confidence = float(predictions[class_idx])
            predicted_class = self.classes[class_idx] if class_idx < len(self.classes) else f"Class_{class_idx}"
            
            # Map to harvest status
            status, color, message = self._map_to_harvest_status(predicted_class, confidence)
            
            # Get all predictions for transparency
            all_predictions = [
                {"class": self.classes[i] if i < len(self.classes) else f"Class_{i}", 
                 "confidence": float(predictions[i])}
                for i in range(len(predictions))
            ]
            all_predictions.sort(key=lambda x: x["confidence"], reverse=True)
            
            return {
                "success": True,
                "method": "ml",
                "prediction": predicted_class,
                "confidence": confidence,
                "status": status,
                "color": color,
                "message": message,
                "all_predictions": all_predictions[:3],  # Top 3
                "note": "ML-based prediction (Demo - 38% test accuracy)"
            }
            
        except Exception as e:
            logger.error(f"ML prediction failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "method": "ml"
            }
    
    def _map_to_harvest_status(self, predicted_class: str, confidence: float) -> Tuple[str, str, str]:
        """Map ML prediction to harvest status"""
        
        # Map classes to status
        if predicted_class in ["Ready for Harvest", "Mature"]:
            status = "Ready"
            color = "#4CAF50"  # Green
            message = f"Plant appears {predicted_class.lower()}. Suitable for harvesting."
        elif predicted_class in ["Developing"]:
            status = "Nearly Ready"
            color = "#FF9800"  # Orange
            message = f"Plant is developing. Consider waiting a bit longer."
        else:  # Immature, Young, Overripe
            status = "Not Ready"
            color = "#F44336"  # Red
            message = f"Plant classified as {predicted_class.lower()}. Not recommended for harvest."
        
        # Adjust based on confidence
        if confidence < 0.5:
            message += f" (Low confidence: {confidence*100:.0f}%)"
        
        return status, color, message


# Global instance
harvest_ml_service = HarvestMLService()
