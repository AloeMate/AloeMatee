import torch
from torchvision import models
import json
from pathlib import Path

# Load metadata
metadata_path = Path("apps/server/artifacts/model_metadata.json")
with open(metadata_path, "r") as f:
    metadata = json.load(f)

print("Metadata:")
print(json.dumps(metadata, indent=2))

# Load model
model_path = Path("apps/server/artifacts/model.pt")
checkpoint = torch.load(model_path, map_location="cpu")

print("\nCheckpoint keys:", list(checkpoint.keys()))

if "class_names" in checkpoint:
    print("Checkpoint class_names:", checkpoint["class_names"])
if "num_classes" in checkpoint:
    print("Checkpoint num_classes:", checkpoint["num_classes"])

if "model_state_dict" in checkpoint:
    state_dict = checkpoint["model_state_dict"]
    print("State dict keys:", list(state_dict.keys()))
    
    # Load model
    model = models.efficientnet_v2_s(weights=None)
    in_features = model.classifier[-1].in_features
    model.classifier[-1] = torch.nn.Linear(in_features, metadata["num_classes"])
    model.load_state_dict(state_dict)
    model.eval()
    
    # Test with random input
    import torch
    dummy_input = torch.randn(1, 3, 384, 384)
    with torch.no_grad():
        logits = model(dummy_input)
        temperature = 2.0
        calibrated_logits = logits / temperature
        probs = torch.softmax(calibrated_logits, dim=1)
        print("Dummy input prediction with temp 2.0:", probs)
        print("Predicted class:", torch.argmax(probs, dim=1).item())
        print("Class name:", metadata["class_names"][torch.argmax(probs, dim=1).item()])
else:
    print("No model_state_dict in checkpoint")