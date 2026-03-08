"""
Manually rebuild and convert Keras 3 model from config and weights
"""
import json
import h5py
from pathlib import Path
import tensorflow as tf
from tensorflow import keras

# Paths
model_dir = Path(r"F:\Y4 Projects\AloeVeraMate\Model_1.keras")
output_file = Path("app/ml_models/harvest_model.h5")

print("Step 1: Reading model config...")
with open(model_dir / "config.json", "r") as f:
    config = json.load(f)

print(f"Model type: {config['class_name']}")

# Rebuild the model from config
print("\nStep 2: Reconstructing model from config...")
# Keras 3 uses a different deserialization API
from tensorflow.keras import saving

# Use deserialize_keras_object with the full config
model = saving.deserialize_keras_object(config)

print(f"✅ Model architecture loaded!")
print(f"Model type: {type(model)}")
print(f"Input shape: {model.input_shape}")
print(f"Output shape: {model.output_shape}")

# Load weights
print("\nStep 3: Loading weights...")
weights_path = model_dir / "model.weights.h5"
model.load_weights(str(weights_path))
print(f"✅ Weights loaded from {weights_path}")

# Save as single .h5 file
print(f"\nStep 4: Saving as {output_file}...")
output_file.parent.mkdir(parents=True, exist_ok=True)
model.save(str(output_file), save_format='h5')

print(f"\n✅ SUCCESS! Model converted and saved!")
print(f"File size: {output_file.stat().st_size / (1024*1024):.2f} MB")
print(f"Location: {output_file.absolute()}")
