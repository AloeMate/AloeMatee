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

    def predict_all_probs(self, images: List[bytes]) -> Dict[str, float]:
        """
        Return probability for ALL supported classes as a dict {class_name: prob}.
        Default implementation derives from predict() top-3 results.
        Override for full-distribution output.
        """
        results = self.predict(images)
        return {r.disease_name: r.confidence for r in results}


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
    
    def _run_torch_probs(self, images: List[bytes]) -> Dict[str, float]:
        """
        Internal: run PyTorch inference and return full probability dict for all classes.
        """
        import torch
        from PIL import Image

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
            return {name: 0.0 for name in self.metadata.class_names}

        batch = torch.stack(tensors).to(self.device)
        with torch.no_grad():
            logits = self.model(batch)
            calibrated_logits = logits / self.temperature
            probs = torch.softmax(calibrated_logits, dim=1)
            avg_probs = probs.mean(dim=0).cpu().tolist()

        return {name: float(avg_probs[i]) for i, name in enumerate(self.metadata.class_names)}

    def predict(self, images: List[bytes]) -> List[InferenceResult]:
        """
        Predict disease from image bytes with temperature scaling
        """
        if not images:
            return []

        all_probs = self._run_torch_probs(images)

        # Sort and return top-3
        sorted_items = sorted(all_probs.items(), key=lambda x: x[1], reverse=True)[:3]
        results = []
        for class_name, prob in sorted_items:
            disease_id = class_name.lower().replace(" ", "_")
            results.append(InferenceResult(
                disease_id=disease_id,
                disease_name=class_name,
                confidence=round(prob, 4)
            ))

        if results:
            logger.info(f"Prediction complete. Top result: {results[0].disease_name} ({results[0].confidence:.3f})")
        return results

    def predict_all_probs(self, images: List[bytes]) -> Dict[str, float]:
        """Return full probability distribution for all 6 classes."""
        return self._run_torch_probs(images)
    
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


class TwoStageTFLiteInferenceService(DiseaseInferenceService):
    """
    Two-stage TFLite pipeline:
      Stage A (stageA_model.tflite): binary — Healthy (0) vs Unhealthy (1)
      Stage B (stageB_model.tflite): 5-class disease — Aloe Rot, Aloe Rust,
                                      Anthracnose, Leaf Spot, Sunburn
    Combined output covers all 6 classes at 224x224.
    """

    STAGE_B_CLASSES = ["Aloe Rot", "Aloe Rust", "Anthracnose", "Leaf Spot", "Sunburn"]
    ALL_CLASSES     = ["Aloe Rot", "Aloe Rust", "Anthracnose", "Healthy", "Leaf Spot", "Sunburn"]
    IMAGE_SIZE = 224

    def __init__(self):
        import numpy as np
        try:
            import tflite_runtime.interpreter as tflite
            self._Interpreter = tflite.Interpreter
        except ImportError:
            import tensorflow as tf
            self._Interpreter = tf.lite.Interpreter

        artifacts = Path(__file__).parent.parent.parent / "artifacts"
        stage_a_path = artifacts / "stageA_model.tflite"
        stage_b_path = artifacts / "stageB_model.tflite"

        if not stage_a_path.exists() or not stage_b_path.exists():
            raise FileNotFoundError(f"Two-stage TFLite models not found in {artifacts}")

        self.data_dir = Path(__file__).parent.parent.parent / "data"
        with open(self.data_dir / "diseases.json", "r", encoding="utf-8") as f:
            self.diseases = json.load(f)["diseases"]

        self.interp_a = self._Interpreter(model_path=str(stage_a_path))
        self.interp_a.allocate_tensors()
        self.in_a  = self.interp_a.get_input_details()[0]
        self.out_a = self.interp_a.get_output_details()[0]

        self.interp_b = self._Interpreter(model_path=str(stage_b_path))
        self.interp_b.allocate_tensors()
        self.in_b  = self.interp_b.get_input_details()[0]
        self.out_b = self.interp_b.get_output_details()[0]

        logger.info("Two-stage TFLite service initialized (stageA + stageB)")

    def _preprocess(self, img_bytes: bytes):
        import numpy as np
        from PIL import Image
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        img = img.resize((self.IMAGE_SIZE, self.IMAGE_SIZE))
        arr = (np.array(img, dtype=np.float32) / 255.0 - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
        return np.expand_dims(arr, 0).astype(np.float32)

    def _sigmoid(self, x):
        import numpy as np
        return 1.0 / (1.0 + np.exp(-x))

    def _softmax(self, x):
        import numpy as np
        e = np.exp(x - x.max())
        return e / e.sum()

    def predict_all_probs(self, images: List[bytes]) -> Dict[str, float]:
        import numpy as np

        stage_a_scores, stage_b_scores = [], []

        for img_bytes in images:
            try:
                inp = self._preprocess(img_bytes)

                # Stage A — binary
                self.interp_a.set_tensor(self.in_a["index"], inp)
                self.interp_a.invoke()
                raw_a = self.interp_a.get_tensor(self.out_a["index"])[0]
                # Single output: apply sigmoid if raw logit, else keep as-is
                p_unhealthy = float(self._sigmoid(raw_a[0]) if abs(raw_a[0]) > 1.0 else raw_a[0])
                stage_a_scores.append(p_unhealthy)

                # Stage B — 5-class
                self.interp_b.set_tensor(self.in_b["index"], inp)
                self.interp_b.invoke()
                raw_b = self.interp_b.get_tensor(self.out_b["index"])[0].astype(np.float32)
                if abs(raw_b.sum() - 1.0) > 0.05:
                    raw_b = self._softmax(raw_b)
                stage_b_scores.append(raw_b)
            except Exception as e:
                logger.error(f"Two-stage inference error: {e}")

        if not stage_a_scores:
            return {c: 1.0 / len(self.ALL_CLASSES) for c in self.ALL_CLASSES}

        p_unhealthy = float(np.mean(stage_a_scores))
        p_healthy   = 1.0 - p_unhealthy
        avg_b = np.mean(stage_b_scores, axis=0)  # [5]

        # Combine: Healthy = P(healthy from A); each disease = P(unhealthy) * P(disease|unhealthy)
        probs: Dict[str, float] = {"Healthy": p_healthy}
        for i, cls in enumerate(self.STAGE_B_CLASSES):
            probs[cls] = p_unhealthy * float(avg_b[i])

        # Normalise
        total = sum(probs.values())
        if total > 0:
            probs = {k: v / total for k, v in probs.items()}

        return probs

    def predict(self, images: List[bytes]) -> List[InferenceResult]:
        all_probs = self.predict_all_probs(images)
        sorted_items = sorted(all_probs.items(), key=lambda x: x[1], reverse=True)[:3]
        results = []
        for class_name, prob in sorted_items:
            results.append(InferenceResult(
                disease_id=class_name.lower().replace(" ", "_"),
                disease_name=class_name,
                confidence=round(prob, 4)
            ))
        if results:
            logger.info(f"Two-stage prediction: {results[0].disease_name} ({results[0].confidence:.3f})")
        return results

    def get_supported_diseases(self) -> List[Dict]:
        return self.diseases

    def get_model_info(self) -> Dict:
        return {
            "model_type": "tflite_two_stage",
            "model_name": "two-stage-tflite",
            "model_version": "1.0.0",
            "num_classes": len(self.ALL_CLASSES),
            "class_names": self.ALL_CLASSES,
            "image_size": self.IMAGE_SIZE,
            "calibration": {"temperature": 1.0, "thresholds": {"HIGH": 0.80, "MEDIUM": 0.60}}
        }


class EnsembleInferenceService(DiseaseInferenceService):
    """
    Weighted ensemble of two inference services.
    Falls back to primary on any secondary failure — zero risk to current results.
    """

    ALL_CLASSES = ["Aloe Rot", "Aloe Rust", "Anthracnose", "Healthy", "Leaf Spot", "Sunburn"]

    def __init__(self, primary: DiseaseInferenceService, secondary: DiseaseInferenceService,
                 primary_weight: float = 0.65):
        self.primary = primary
        self.secondary = secondary
        self.primary_weight = primary_weight
        self.secondary_weight = 1.0 - primary_weight
        logger.info(f"Ensemble service: primary={primary_weight:.0%} + secondary={self.secondary_weight:.0%}")

    def predict_all_probs(self, images: List[bytes]) -> Dict[str, float]:
        # Primary probs (always run)
        p_probs = self.primary.predict_all_probs(images)

        # Secondary probs (safe fallback if anything fails)
        try:
            s_probs = self.secondary.predict_all_probs(images)
        except Exception as e:
            logger.warning(f"Ensemble secondary failed, using primary only: {e}")
            return p_probs

        # Weighted average over all 6 classes
        combined: Dict[str, float] = {}
        for cls in self.ALL_CLASSES:
            combined[cls] = (self.primary_weight * p_probs.get(cls, 0.0) +
                             self.secondary_weight * s_probs.get(cls, 0.0))

        # Normalise (handles cases where classes differ between models)
        total = sum(combined.values())
        if total > 0:
            combined = {k: v / total for k, v in combined.items()}

        return combined

    def predict(self, images: List[bytes]) -> List[InferenceResult]:
        try:
            all_probs = self.predict_all_probs(images)
            sorted_items = sorted(all_probs.items(), key=lambda x: x[1], reverse=True)[:3]
            results = []
            for class_name, prob in sorted_items:
                results.append(InferenceResult(
                    disease_id=class_name.lower().replace(" ", "_"),
                    disease_name=class_name,
                    confidence=round(prob, 4)
                ))
            if results:
                logger.info(f"Ensemble prediction: {results[0].disease_name} ({results[0].confidence:.3f})")
            return results
        except Exception as e:
            logger.warning(f"Ensemble predict failed, falling back to primary: {e}")
            return self.primary.predict(images)

    def get_supported_diseases(self) -> List[Dict]:
        return self.primary.get_supported_diseases()

    def get_model_info(self) -> Dict:
        info = self.primary.get_model_info()
        info["model_type"] = "ensemble"
        info["model_name"] = "ensemble-pytorch-tflite"
        info["ensemble_weights"] = {
            "primary": self.primary_weight,
            "secondary": self.secondary_weight
        }
        return info


# Global singleton instance
_inference_service: Optional[DiseaseInferenceService] = None


def get_inference_service() -> DiseaseInferenceService:
    """
    Get inference service singleton.

    Priority (best accuracy, zero risk to current results):
    1. Ensemble(PyTorch + TwoStage TFLite)  — if both models present
    2. PyTorch only                          — if only model.pt present
    3. TwoStage TFLite only                 — if only stage models present
    4. Single TFLite (aloe_vera_model)      — lightweight fallback
    5. Placeholder                           — dev fallback
    """
    global _inference_service
    if _inference_service is not None:
        return _inference_service

    pytorch_service: Optional[DiseaseInferenceService] = None
    twostage_service: Optional[DiseaseInferenceService] = None

    try:
        pytorch_service = PyTorchInferenceService()
        logger.info("✓ PyTorch model loaded")
    except Exception as e:
        logger.warning(f"PyTorch unavailable: {e}")

    try:
        twostage_service = TwoStageTFLiteInferenceService()
        logger.info("✓ Two-stage TFLite models loaded")
    except Exception as e:
        logger.warning(f"Two-stage TFLite unavailable: {e}")

    if pytorch_service and twostage_service:
        _inference_service = EnsembleInferenceService(pytorch_service, twostage_service, primary_weight=0.65)
        logger.info("✅ Using Ensemble inference service (PyTorch 65% + TFLite 35%)")
    elif pytorch_service:
        _inference_service = pytorch_service
        logger.info("✅ Using PyTorch inference service")
    elif twostage_service:
        _inference_service = twostage_service
        logger.info("✅ Using Two-stage TFLite inference service")
    else:
        try:
            _inference_service = TFLiteInferenceService()
            logger.info("✅ Using single TFLite inference service")
        except Exception as e:
            logger.warning(f"Single TFLite unavailable: {e}")
            _inference_service = PlaceholderInferenceService()
            logger.info("✅ Using placeholder inference service")

    return _inference_service
    """
    TFLite inference service.
    Drop model.tflite into apps/server/artifacts/ to use.
    Optionally add tflite_metadata.json for class names.
    """

    # Default class names matching the 6-class training setup
    DEFAULT_CLASS_NAMES = [
        "Aloe Rot",
        "Aloe Rust",
        "Anthracnose",
        "Healthy",
        "Leaf Spot",
        "Sunburn",
    ]

    def __init__(self):
        import numpy as np
        try:
            import tflite_runtime.interpreter as tflite
            self._Interpreter = tflite.Interpreter
        except ImportError:
            import tensorflow as tf
            self._Interpreter = tf.lite.Interpreter

        self.data_dir = Path(__file__).parent.parent.parent / "data"
        self.artifacts_dir = Path(__file__).parent.parent.parent / "artifacts"

        tflite_path = self.artifacts_dir / "model.tflite"
        if not tflite_path.exists():
            raise FileNotFoundError(f"TFLite model not found at {tflite_path}")

        # Load disease database
        with open(self.data_dir / "diseases.json", "r", encoding="utf-8") as f:
            data = json.load(f)
            self.diseases = data["diseases"]

        # Load class names from metadata if available, else use defaults
        metadata_path = self.artifacts_dir / "tflite_metadata.json"
        if metadata_path.exists():
            with open(metadata_path, "r") as f:
                meta = json.load(f)
                self.class_names = meta.get("class_names", self.DEFAULT_CLASS_NAMES)
                self.image_size = meta.get("image_size", 224)
        else:
            self.class_names = self.DEFAULT_CLASS_NAMES
            self.image_size = 224

        # Load TFLite interpreter
        self.interpreter = self._Interpreter(model_path=str(tflite_path))
        self.interpreter.allocate_tensors()
        self.input_details = self.interpreter.get_input_details()
        self.output_details = self.interpreter.get_output_details()

        # Check if model expects float32 or uint8
        self.input_dtype = self.input_details[0]["dtype"]

        logger.info(f"TFLite model loaded: {tflite_path}")
        logger.info(f"Classes: {self.class_names}")
        logger.info(f"Input size: {self.image_size}x{self.image_size}, dtype: {self.input_dtype}")

    def _preprocess(self, img_bytes: bytes):
        import numpy as np
        from PIL import Image

        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        img = img.resize((self.image_size, self.image_size))
        arr = np.array(img, dtype=np.float32)

        if self.input_dtype == "uint8" or str(self.input_dtype) == "<class 'numpy.uint8'>":
            arr = np.array(img, dtype=np.uint8)
        else:
            # Normalize to ImageNet stats
            arr = arr / 255.0
            arr = (arr - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]

        return np.expand_dims(arr, axis=0).astype(self.input_dtype)

    def predict(self, images: List[bytes]) -> List[InferenceResult]:
        import numpy as np

        if not images:
            return []

        all_probs = []
        for img_bytes in images:
            try:
                input_data = self._preprocess(img_bytes)
                self.interpreter.set_tensor(self.input_details[0]["index"], input_data)
                self.interpreter.invoke()
                output = self.interpreter.get_tensor(self.output_details[0]["index"])[0]

                # Convert to float probabilities
                output = output.astype(np.float32)

                # Apply softmax if raw logits (values not summing to ~1)
                if abs(output.sum() - 1.0) > 0.01:
                    exp_o = np.exp(output - output.max())
                    output = exp_o / exp_o.sum()

                all_probs.append(output)
            except Exception as e:
                logger.error(f"TFLite inference failed on image: {e}")
                continue

        if not all_probs:
            return []

        avg_probs = np.mean(all_probs, axis=0)
        top_indices = np.argsort(avg_probs)[::-1][:3]

        results = []
        for idx in top_indices:
            if idx < len(self.class_names):
                class_name = self.class_names[idx]
                disease_id = class_name.lower().replace(" ", "_")
                results.append(InferenceResult(
                    disease_id=disease_id,
                    disease_name=class_name,
                    confidence=round(float(avg_probs[idx]), 3)
                ))

        logger.info(f"TFLite prediction: {results[0].disease_name} ({results[0].confidence:.3f})")
        return results

    def get_supported_diseases(self) -> List[Dict]:
        return self.diseases

    def get_model_info(self) -> Dict:
        return {
            "model_type": "tflite",
            "model_name": "tflite-model",
            "model_version": "1.0.0",
            "num_classes": len(self.class_names),
            "class_names": self.class_names,
            "image_size": self.image_size,
            "calibration": {
                "temperature": 1.0,
                "thresholds": {"HIGH": 0.80, "MEDIUM": 0.60}
            }
        }


# TODO: GPU Support
# - Add device selection (cuda:0, cuda:1, cpu)
# - Add batch processing for multiple requests
# - Add model optimization (TorchScript, ONNX, TensorRT)

# TODO: Model Versioning
# - Track model version in responses (for debugging)
# - Support multiple model versions simultaneously (A/B testing)
# - Automatic model updates/hot-reloading
