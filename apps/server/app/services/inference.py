"""
Disease Inference Service

Clean interface for disease detection models.
Supports both PyTorch EfficientNetV2-S and placeholder implementations.
"""
import hashlib
import random
from typing import List, Dict, Optional
from abc import ABC, abstractmethod
from pathlib import Path
import json
import io
import logging

logger = logging.getLogger(__name__)


class InferenceResult:
    """Result from inference"""
    def __init__(self, disease_id: str, disease_name: str, confidence: float):
        self.disease_id = disease_id
        self.disease_name = disease_name
        self.confidence = confidence


class ModelMetadata:
    """Model metadata and configuration"""
    def __init__(self, metadata_dict: Dict):
        self.model_name = metadata_dict.get("model_name", "unknown")
        self.model_version = metadata_dict.get("model_version", "unknown")
        self.num_classes = metadata_dict.get("num_classes", 6)
        self.class_names = metadata_dict.get("class_names", [])
        self.image_size = metadata_dict.get("image_size", 384)
        self.normalization = metadata_dict.get("normalization", {})
        self.calibration = metadata_dict.get("calibration", {})
        self.training = metadata_dict.get("training", {})
        self.export = metadata_dict.get("export", {})
        self.class_to_idx = metadata_dict.get("class_to_idx", {})
        self.idx_to_class = metadata_dict.get("idx_to_class", {})


class DiseaseInferenceService(ABC):
    """Abstract interface for disease inference"""
    
    @abstractmethod
    def predict(self, images: List[bytes]) -> List[InferenceResult]:
        """
        Predict disease from image bytes
        
        Args:
            images: List of image data as bytes (1-3 images)
            
        Returns:
            List of InferenceResult sorted by confidence descending
        """
        pass
    
    @abstractmethod
    def get_supported_diseases(self) -> List[Dict]:
        """Return list of diseases this model can detect"""
        pass
    
    @abstractmethod
    def get_model_info(self) -> Dict:
        """Return model metadata and configuration"""
        pass


class PlaceholderInferenceService(DiseaseInferenceService):
    """
    Deterministic hash-based placeholder implementation.
    
    TODO: Replace with EfficientNetV2-S PyTorch model
    """
    
    def __init__(self):
        # Load disease database
        self.data_dir = Path(__file__).parent.parent.parent / "data"
        with open(self.data_dir / "diseases.json", "r", encoding="utf-8") as f:
            data = json.load(f)
            self.diseases = data["diseases"]
        
        self.disease_ids = [d["disease_id"] for d in self.diseases]
        
        # TODO: Model loading
        # self.model = self._load_model()
        # self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        # self.model.to(self.device)
        # self.model.eval()
    
    def predict(self, images: List[bytes]) -> List[InferenceResult]:
        """
        Deterministic hash-based prediction (placeholder)
        
        TODO: Replace with real model inference
        Steps for real model:
        1. Preprocess images (resize to 384x384, normalize, to tensor)
        2. Stack into batch tensor
        3. Move to device (GPU/CPU)
        4. Forward pass: logits = model(batch)
        5. Apply softmax for probabilities
        6. Return top-K predictions
        """
        # TODO: Preprocessing
        # preprocessed = self._preprocess_images(images)
        # with torch.no_grad():
        #     logits = self.model(preprocessed)
        #     probs = F.softmax(logits, dim=1)
        #     top_k = torch.topk(probs, k=3, dim=1)
        
        # Current: Hash-based deterministic approach
        image_hash = self._hash_images(images)
        return self._generate_predictions_from_hash(image_hash)
    
    def get_supported_diseases(self) -> List[Dict]:
        """Return all supported diseases"""
        return self.diseases
    
    def get_model_info(self) -> Dict:
        """Return model info (placeholder)"""
        return {
            "model_type": "placeholder",
            "model_name": "hash-based-deterministic",
            "model_version": "dev-placeholder",
            "calibration": {
                "temperature": 1.0,
                "thresholds": {"HIGH": 0.80, "MEDIUM": 0.60}
            }
        }
    
    def _hash_images(self, images: List[bytes]) -> str:
        """Create deterministic hash from image bytes"""
        hasher = hashlib.sha256()
        for img_data in images:
            # Use first 1KB and last 1KB for efficiency
            content = img_data[:1024] + img_data[-1024:] if len(img_data) > 2048 else img_data
            hasher.update(content)
        return hasher.hexdigest()
    
    def _generate_predictions_from_hash(self, image_hash: str) -> List[InferenceResult]:
        """Generate deterministic predictions from hash (placeholder logic)"""
        # Use hash to seed random for deterministic results
        seed = int(image_hash[:16], 16)
        rng = random.Random(seed)
        
        # Select 3 diseases deterministically
        selected_indices = rng.sample(range(len(self.disease_ids)), min(3, len(self.disease_ids)))
        
        # Generate probabilities that sum to 1.0
        raw_probs = [rng.uniform(0.1, 1.0) for _ in range(3)]
        total = sum(raw_probs)
        probabilities = [p / total for p in raw_probs]
        
        # Create results sorted by confidence
        results = []
        for idx, prob in zip(selected_indices, probabilities):
            disease = self.diseases[idx]
            results.append(InferenceResult(
                disease_id=disease["disease_id"],
                disease_name=disease["disease_name"],
                confidence=round(prob, 3)
            ))
        
        # Sort by confidence descending
        results.sort(key=lambda x: x.confidence, reverse=True)
        return results
    
    # TODO: Add preprocessing for real model
    # def _preprocess_images(self, images: List[bytes]) -> torch.Tensor:
    #     """
    #     Preprocess images for EfficientNetV2-S
    #     
    #     Steps:
    #     1. Decode bytes to PIL/numpy
    #     2. Resize to 384x384 (EfficientNetV2-S input size)
    #     3. Normalize: mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]
    #     4. Convert to torch tensor
    #     5. Stack into batch
    #     """
    #     from PIL import Image
    #     import io
    #     import torchvision.transforms as transforms
    #     
    #     transform = transforms.Compose([
    #         transforms.Resize((384, 384)),
    #         transforms.ToTensor(),
    #         transforms.Normalize(mean=[0.485, 0.456, 0.406], 
    #                            std=[0.229, 0.224, 0.225])
    #     ])
    #     
    #     tensors = []
    #     for img_bytes in images:
    #         img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
    #         tensor = transform(img)
    #         tensors.append(tensor)
    #     
    #     batch = torch.stack(tensors)
    #     return batch.to(self.device)
    
    # TODO: Model loading
    # def _load_model(self):
    #     """
    #     Load EfficientNetV2-S model
    #     
    #     Options:
    #     1. Load pretrained from torchvision
    #     2. Load fine-tuned checkpoint
    #     3. Load from model registry/S3
    #     
    #     Model versioning:
    #     - Track model version in config/env
    #     - Log model hash/checksum
    #     - Support A/B testing with multiple versions
    #     """
    #     import torch
    #     import torchvision.models as models
    #     
    #     # Option 1: Pretrained base
    #     # model = models.efficientnet_v2_s(pretrained=True)
    #     # model.classifier[-1] = torch.nn.Linear(
    #     #     model.classifier[-1].in_features, 
    #     #     len(self.diseases)
    #     # )
    #     
    #     # Option 2: Load fine-tuned weights
    #     # checkpoint_path = self.data_dir / "models" / "efficientnet_v2_s.pth"
    #     # model = models.efficientnet_v2_s(num_classes=len(self.diseases))
    #     # model.load_state_dict(torch.load(checkpoint_path))
    #     
    #     # return model
    #     pass


class PyTorchInferenceService(DiseaseInferenceService):
    """
    PyTorch EfficientNetV2-S implementation with temperature scaling
    """
    
    def __init__(self):
        import torch
        from torchvision import models, transforms
        from PIL import Image
        
        self.data_dir = Path(__file__).parent.parent.parent / "data"
        self.artifacts_dir = Path(__file__).parent.parent.parent / "artifacts"
        
        # Load disease database
        with open(self.data_dir / "diseases.json", "r", encoding="utf-8") as f:
            data = json.load(f)
            self.diseases = data["diseases"]
        
        # Check if model files exist
        model_path = self.artifacts_dir / "model.pt"
        metadata_path = self.artifacts_dir / "model_metadata.json"
        
        if not model_path.exists() or not metadata_path.exists():
            logger.warning(
                f"Model files not found at {self.artifacts_dir}. "
                f"Falling back to placeholder service. "
                f"Please run training pipeline and copy artifacts."
            )
            raise FileNotFoundError("Model files not found")
        
        # Load metadata
        logger.info(f"Loading model metadata from {metadata_path}")
        with open(metadata_path, "r") as f:
            metadata_dict = json.load(f)
            self.metadata = ModelMetadata(metadata_dict)
        
        # Setup device
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"Using device: {self.device}")
        
        # Load model
        logger.info(f"Loading model from {model_path}")
        checkpoint = torch.load(model_path, map_location=self.device)
        
        self.model = models.efficientnet_v2_s(weights=None)
        in_features = self.model.classifier[-1].in_features
        self.model.classifier[-1] = torch.nn.Linear(in_features, self.metadata.num_classes)
        self.model.load_state_dict(checkpoint["model_state_dict"])
        self.model.to(self.device)
        self.model.eval()
        
        logger.info(f"Model loaded successfully: {self.metadata.model_name}")
        logger.info(f"Number of classes: {self.metadata.num_classes}")
        logger.info(f"Class names: {self.metadata.class_names}")
        
        # Get calibration temperature
        self.temperature = self.metadata.calibration.get("temperature", 1.0)
        logger.info(f"Using temperature scaling: {self.temperature:.4f}")
        
        # Setup preprocessing
        norm_mean = self.metadata.normalization.get("mean", [0.485, 0.456, 0.406])
        norm_std = self.metadata.normalization.get("std", [0.229, 0.224, 0.225])
        
        self.transform = transforms.Compose([
            transforms.Resize(self.metadata.image_size + 32),
            transforms.CenterCrop(self.metadata.image_size),
            transforms.ToTensor(),
            transforms.Normalize(mean=norm_mean, std=norm_std)
        ])
        
        logger.info("PyTorch inference service initialized successfully")
    
    def predict(self, images: List[bytes]) -> List[InferenceResult]:
        """
        Predict disease from image bytes with temperature scaling
        
        Aggregates multiple images by averaging probabilities
        """
        import torch
        from PIL import Image
        
        if not images:
            return []
        
        # Preprocess all images
        tensors = []
        for img_bytes in images:
            try:
                img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
                tensor = self.transform(img)
                tensors.append(tensor)
            except Exception as e:
                logger.error(f"Failed to preprocess image: {e}")
                continue
        
        if not tensors:
            logger.error("No valid images to process")
            return []
        
        # Stack into batch
        batch = torch.stack(tensors).to(self.device)
        
        # Inference
        with torch.no_grad():
            logits = self.model(batch)
            
            # Apply temperature scaling
            calibrated_logits = logits / self.temperature
            
            # Get probabilities
            probs = torch.softmax(calibrated_logits, dim=1)
            
            # Average probabilities across all images
            avg_probs = probs.mean(dim=0)
            
            # Get top-3 predictions
            top_probs, top_indices = torch.topk(avg_probs, k=min(3, len(avg_probs)))
        
        # Convert to InferenceResult
        results = []
        for prob, idx in zip(top_probs, top_indices):
            class_name = self.metadata.class_names[idx.item()]
            # Map class name to disease_id (lowercase with underscores)
            disease_id = class_name.lower().replace(" ", "_")
            
            results.append(InferenceResult(
                disease_id=disease_id,
                disease_name=class_name,
                confidence=float(prob.item())
            ))
        
        logger.info(f"Prediction complete. Top result: {results[0].disease_name} ({results[0].confidence:.3f})")
        return results
    
    def get_supported_diseases(self) -> List[Dict]:
        """Return all supported diseases"""
        return self.diseases
    
    def get_model_info(self) -> Dict:
        """Return model metadata and configuration"""
        return {
            "model_type": "pytorch",
            "model_name": self.metadata.model_name,
            "model_version": self.metadata.model_version,
            "model_architecture": "EfficientNetV2-S",
            "num_classes": self.metadata.num_classes,
            "class_names": self.metadata.class_names,
            "image_size": self.metadata.image_size,
            "device": str(self.device),
            "calibration": {
                "temperature": self.temperature,
                "is_calibrated": self.temperature != 1.0,
                "thresholds": self.metadata.calibration.get("thresholds", {"HIGH": 0.80, "MEDIUM": 0.60})
            },
            "training": self.metadata.training,
            "export": self.metadata.export
        }


# Global singleton instance
_inference_service: Optional[DiseaseInferenceService] = None


def get_inference_service() -> DiseaseInferenceService:
    """
    Get inference service singleton
    
    Tries PyTorch first, falls back to placeholder if model not available
    """
    global _inference_service
    if _inference_service is None:
        try:
            logger.info("Attempting to initialize PyTorch inference service...")
            _inference_service = PyTorchInferenceService()
            logger.info("✓ Using PyTorch inference service")
        except (FileNotFoundError, ImportError, Exception) as e:
            logger.warning(f"Failed to initialize PyTorch service: {e}")
            logger.info("✓ Using placeholder inference service")
            _inference_service = PlaceholderInferenceService()
    return _inference_service


# TODO: GPU Support
# - Add device selection (cuda:0, cuda:1, cpu)
# - Add batch processing for multiple requests
# - Add model optimization (TorchScript, ONNX, TensorRT)
# - Add mixed precision inference (FP16) for faster GPU inference

# TODO: Model Versioning
# - Track model version in responses (for debugging)
# - Support multiple model versions simultaneously (A/B testing)
# - Model registry integration (MLflow, Weights & Biases)
# - Automatic model updates/hot-reloading
# - Rollback capability if new model performs poorly
