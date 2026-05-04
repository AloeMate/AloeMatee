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
import os
import base64
from PIL import Image

from app.config import settings

logger = logging.getLogger(__name__)


def check_with_vision_api(image_bytes: bytes):
    """Stage 3: Use Google Vision API to detect plant disease labels."""
    import requests

    api_key = settings.GOOGLE_VISION_API_KEY or os.getenv("GOOGLE_VISION_API_KEY")
    if not api_key:
        return None

    encoded = base64.b64encode(image_bytes).decode("utf-8")
    url = f"https://vision.googleapis.com/v1/images:annotate?key={api_key}"
    body = {
        "requests": [{
            "image": {"content": encoded},
            "features": [
                {"type": "LABEL_DETECTION", "maxResults": 10},
                {"type": "WEB_DETECTION", "maxResults": 5}
            ]
        }]
    }

    try:
        response = requests.post(url, json=body, timeout=12)
        response.raise_for_status()
        result = response.json()

        aloe_keywords = ["aloe", "aloe vera", "succulent", "plant disease", "leaf", "plant pathology"]
        disease_keywords = {
            "rust": "Aloe_Rust",
            "rot": "Aloe_Rot",
            "anthracnose": "Anthracnose",
            "spot": "Leaf_Spot",
            "burn": "Sunburn",
            "healthy": "Healthy",
            "disease": "Aloe_Rust"
        }

        labels = []
        try:
            for label in result.get("responses", [{}])[0].get("labelAnnotations", []):
                description = label.get("description")
                if description:
                    labels.append(description.lower())

            for web in result.get("responses", [{}])[0].get("webDetection", {}).get("webEntities", []):
                description = web.get("description")
                if description:
                    labels.append(description.lower())
        except Exception:
            return None

        joined_labels = " ".join(labels)
        is_aloe = any(keyword in joined_labels for keyword in aloe_keywords)
        if not is_aloe:
            return None

        for keyword, disease in disease_keywords.items():
            if any(keyword in label for label in labels):
                return {
                    "disease_id": disease.lower(),
                    "disease_name": disease.replace("_", " "),
                    "confidence": 0.60,
                    "inference_stage": "vision_api",
                    "vision_labels": labels[:5],
                    "message": "Identified using Google Vision AI"
                }

        return {
            "disease_id": "healthy",
            "disease_name": "Healthy",
            "confidence": 0.55,
            "inference_stage": "vision_api",
            "vision_labels": labels[:5],
            "message": "Aloe vera detected — appears healthy"
        }
    except Exception as exc:
        logger.warning(f"Google Vision API check failed: {exc}")
        return None


class InferenceResult:
    """Result from inference"""
    def __init__(
        self,
        disease_id: str,
        disease_name: str,
        confidence: float,
        inference_stage: Optional[str] = None,
        message: Optional[str] = None
    ):
        self.disease_id = disease_id
        self.disease_name = disease_name
        self.confidence = confidence
        self.inference_stage = inference_stage
        self.message = message


class ModelMetadata:
    """Model metadata and configuration"""
    def __init__(self, metadata_dict: Dict):
        self.model_name = metadata_dict.get("model_name", "unknown")
        self.model_version = metadata_dict.get("model_version", "unknown")
        self.num_classes = metadata_dict.get("num_classes", 7)
        self.class_names = metadata_dict.get(
            "class_names",
            [
                "Aloe_Rot",
                "Aloe_Rust",
                "Anthracnose",
                "Healthy",
                "Leaf_Spot",
                "Sunburn",
                "Unknown"
            ]
        )
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
        from PIL import Image, ImageOps
        
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
        
        logger.info(f"Main model loaded successfully: {self.metadata.model_name}")
        logger.info(f"Number of main classes: {self.metadata.num_classes}")
        logger.info(f"Main class names: {self.metadata.class_names}")
        
        # Get calibration temperature
        self.temperature = self.metadata.calibration.get("temperature", 1.0)
        logger.info(f"Using temperature scaling: {self.temperature:.4f}")
        
        # Load fallback metadata and model (optional)
        fallback_metadata_path = self.artifacts_dir / "fallback_metadata.json"
        fallback_model_path = self.artifacts_dir / "fallback_model.pt"
        
        self.fallback_model = None
        self.fallback_metadata = None
        
        if fallback_model_path.exists() and fallback_metadata_path.exists():
            try:
                logger.info(f"Loading fallback metadata from {fallback_metadata_path}")
                with open(fallback_metadata_path, "r", encoding="utf-8") as f:
                    fallback_metadata_dict = json.load(f)
                    fallback_metadata_dict["image_size"] = fallback_metadata_dict.get("img_size", 224)
                    fallback_metadata_dict["normalization"] = {
                        "mean": fallback_metadata_dict.get("mean", [0.485, 0.456, 0.406]),
                        "std": fallback_metadata_dict.get("std", [0.229, 0.224, 0.225])
                    }
                    fallback_metadata_dict["num_classes"] = len(fallback_metadata_dict.get("class_names", []))
                    self.fallback_metadata = ModelMetadata(fallback_metadata_dict)

                logger.info(f"Loading fallback model from {fallback_model_path}")
                fallback_checkpoint = torch.load(fallback_model_path, map_location=self.device)
                self.fallback_model = models.mobilenet_v2(weights=None)
                self.fallback_model.classifier[-1] = torch.nn.Linear(
                    self.fallback_model.last_channel,
                    self.fallback_metadata.num_classes
                )
                self.fallback_model.load_state_dict(fallback_checkpoint["model_state_dict"])
                self.fallback_model.to(self.device)
                self.fallback_model.eval()
                logger.info(f"Fallback model loaded successfully: {self.fallback_metadata.model_name}")
                logger.info(f"Number of fallback classes: {self.fallback_metadata.num_classes}")
                logger.info(f"Fallback class names: {self.fallback_metadata.class_names}")
            except Exception as e:
                logger.warning(f"Failed to load fallback model: {e}")
                self.fallback_model = None
                self.fallback_metadata = None
        else:
            logger.info("Fallback model files not found. Cascade inference disabled.")

        # Setup preprocessing
        norm_mean = self.metadata.normalization.get("mean", [0.485, 0.456, 0.406])
        norm_std = self.metadata.normalization.get("std", [0.229, 0.224, 0.225])

        self.main_transform = transforms.Compose([
            transforms.Resize(self.metadata.image_size + 32),
            transforms.CenterCrop(self.metadata.image_size),
            transforms.ToTensor(),
            transforms.Normalize(mean=norm_mean, std=norm_std)
        ])

        fallback_norm_mean = self.fallback_metadata.normalization.get("mean", norm_mean)
        fallback_norm_std = self.fallback_metadata.normalization.get("std", norm_std)
        self.fallback_transform = transforms.Compose([
            transforms.Resize(self.fallback_metadata.image_size + 32),
            transforms.CenterCrop(self.fallback_metadata.image_size),
            transforms.ToTensor(),
            transforms.Normalize(mean=fallback_norm_mean, std=fallback_norm_std)
        ])

        logger.info("PyTorch inference service initialized successfully")
    
    def _pad_to_square(self, image):
        from PIL import ImageOps

        width, height = image.size
        if width == height:
            return image

        max_side = max(width, height)
        delta_w = max_side - width
        delta_h = max_side - height
        padding = (
            delta_w // 2,
            delta_h // 2,
            delta_w - (delta_w // 2),
            delta_h - (delta_h // 2)
        )
        return ImageOps.expand(image, padding, fill=0)

    def _resize_large_image(self, image):
        """Resize very large images before preprocessing."""
        max_side = max(image.size)
        if max_side <= 1500:
            return image

        scale = 800.0 / max_side
        new_size = (int(image.width * scale), int(image.height * scale))
        return image.resize(new_size, resample=Image.LANCZOS)

    def _apply_clahe_lab(self, image):
        """Apply CLAHE in LAB color space to normalize lighting."""
        try:
            import cv2
            import numpy as np

            rgb = np.array(image)
            bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
            lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)

            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            cl = clahe.apply(l)
            lab = cv2.merge((cl, a, b))
            bgr = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
            rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
            return Image.fromarray(rgb)
        except Exception as e:
            logger.warning(f"CLAHE preprocessing failed: {e}")
            return image

    def _generate_tta_variants(self, image):
        """Generate 5 test-time augmentation variants for a single image."""
        from PIL import ImageEnhance

        variants = [image]
        variants.append(image.transpose(Image.FLIP_LEFT_RIGHT))

        variants.append(ImageEnhance.Brightness(image).enhance(1.2))
        variants.append(ImageEnhance.Brightness(image).enhance(0.8))

        w, h = image.size
        crop_w = int(round(w * 0.9))
        crop_h = int(round(h * 0.9))
        left = (w - crop_w) // 2
        top = (h - crop_h) // 2
        center_crop = image.crop((left, top, left + crop_w, top + crop_h))
        variants.append(center_crop.resize((w, h), resample=Image.LANCZOS))

        return variants

    def _preprocess_main_image(self, image):
        image = self._resize_large_image(image)
        image = self._apply_clahe_lab(image)
        image = self._pad_to_square(image)
        return self.main_transform(image)

    def _preprocess_fallback_image(self, image):
        image = self._resize_large_image(image)
        image = self._apply_clahe_lab(image)
        image = self._pad_to_square(image)
        return self.fallback_transform(image)

    def predict(self, images: List[bytes]) -> List[InferenceResult]:
        """
        Predict disease from image bytes with temperature scaling.

        Runs main model first and cascades to fallback when confidence is low.
        """
        import torch

        if not images:
            return []

        def build_tensors(image_bytes, preprocess_fn):
            tensors = []
            for img_bytes in image_bytes:
                try:
                    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
                    base_img = self._resize_large_image(img)
                    base_img = self._apply_clahe_lab(base_img)
                    for tta_img in self._generate_tta_variants(base_img):
                        tensors.append(preprocess_fn(tta_img))
                except Exception as e:
                    logger.error(f"Failed to preprocess image for inference: {e}")
            return tensors

        main_tensors = build_tensors(images, self._preprocess_main_image)
        if not main_tensors:
            logger.error("No valid images to process for main model")
            return []

        with torch.no_grad():
            main_batch = torch.stack(main_tensors).to(self.device)
            main_logits = self.model(main_batch)
            main_calibrated = main_logits / self.temperature
            main_probs = torch.softmax(main_calibrated, dim=1)
            main_avg_probs = main_probs.mean(dim=0)
            main_top_probs, main_top_indices = torch.topk(main_avg_probs, k=min(3, len(main_avg_probs)))

        main_confidence = float(main_top_probs[0].item())
        # Lowered threshold: treat main model as confident at >= 0.25
        if main_confidence >= 0.25:
            results = []
            for prob, idx in zip(main_top_probs, main_top_indices):
                class_name = self.metadata.class_names[idx.item()]
                disease_id = class_name.lower().replace(" ", "_")
                results.append(InferenceResult(
                    disease_id=disease_id,
                    disease_name=class_name,
                    confidence=float(prob.item()),
                    inference_stage="main"
                ))

            logger.info(f"Main model selected with top confidence {main_confidence:.3f}")
            logger.info(f"Main probabilities: {dict(zip(self.metadata.class_names, main_avg_probs.tolist()))}")
            return results

        logger.info(f"Main model confidence too low ({main_confidence:.3f})")

        # Check if fallback model is available
        if self.fallback_model is None or self.fallback_metadata is None:
            logger.info("Fallback model not loaded; returning Unknown")
            # Main result selected Unknown or is below threshold, return Unknown
            return [
                InferenceResult(
                    disease_id="unknown",
                    disease_name="Unknown / Not Aloe Vera",
                    confidence=main_confidence,
                    inference_stage="not_aloe",
                    message="Unable to confidently identify"
                )
            ]

        logger.info(f"Main model confidence too low ({main_confidence:.3f}); falling back to MobileNetV2")

        fallback_tensors = build_tensors(images, self._preprocess_fallback_image)
        if not fallback_tensors:
            logger.error("No valid images to process for fallback model")
            return []

        with torch.no_grad():
            fallback_batch = torch.stack(fallback_tensors).to(self.device)
            fallback_logits = self.fallback_model(fallback_batch)
            fallback_probs = torch.softmax(fallback_logits, dim=1)
            fallback_avg_probs = fallback_probs.mean(dim=0)
            fallback_top_probs, fallback_top_indices = torch.topk(fallback_avg_probs, k=min(3, len(fallback_avg_probs)))

        fallback_confidence = float(fallback_top_probs[0].item())
        # Lowered threshold: treat fallback model as confident at >= 0.25
        if fallback_confidence >= 0.25:
            results = []
            for prob, idx in zip(fallback_top_probs, fallback_top_indices):
                class_name = self.fallback_metadata.class_names[idx.item()]
                disease_id = class_name.lower().replace(" ", "_")
                results.append(InferenceResult(
                    disease_id=disease_id,
                    disease_name=class_name,
                    confidence=float(prob.item()),
                    inference_stage="fallback",
                    message="Identified by fallback model"
                ))

            logger.info(f"Fallback model selected with top confidence {fallback_confidence:.3f}")
            logger.info(f"Fallback probabilities: {dict(zip(self.fallback_metadata.class_names, fallback_avg_probs.tolist()))}")
            return results

        logger.info(f"Fallback model confidence too low ({fallback_confidence:.3f}); checking Google Vision API")

        for image_bytes in images:
            vision_result = check_with_vision_api(image_bytes)
            if vision_result:
                logger.info(
                    f"Vision API selected with disease={vision_result['disease_id']} "
                    f"confidence={vision_result['confidence']:.3f}"
                )
                return [
                    InferenceResult(
                        disease_id=vision_result["disease_id"],
                        disease_name=vision_result["disease_name"],
                        confidence=float(vision_result["confidence"]),
                        inference_stage=vision_result["inference_stage"],
                        message=vision_result.get("message")
                    )
                ]

        closest_idx = fallback_top_indices[0].item()
        closest_name = self.fallback_metadata.class_names[closest_idx]
        closest_confidence = float(fallback_top_probs[0].item())

        logger.warning(
            f"Fallback model also low confidence ({closest_confidence:.3f}). "
            f"Returning Unknown / Not Aloe Vera. Closest match: {closest_name}."
        )

        results = [
            InferenceResult(
                disease_id="unknown",
                disease_name="Unknown / Not Aloe Vera",
                confidence=closest_confidence,
                inference_stage="not_aloe",
                message="Fallback model also uncertain"
            )
        ]

        for prob, idx in zip(fallback_top_probs[:2], fallback_top_indices[:2]):
            class_name = self.fallback_metadata.class_names[idx.item()]
            disease_id = class_name.lower().replace(" ", "_")
            results.append(InferenceResult(
                disease_id=disease_id,
                disease_name=class_name,
                confidence=float(prob.item()),
                inference_stage="fallback"
            ))

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
