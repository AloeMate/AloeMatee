"""
Convert Keras 3 directory format to single .h5 file
Manually load Keras 3 format since TF 2.20 has issues with directory loading
"""
import json
import h5py
import numpy as np
from pathlib import Path

# Paths
model_dir = Path(r"F:\Y4 Projects\AloeVeraMate\Model_1.keras")
output_file = Path("app/ml_models/harvest_model.h5")

print(f"Loading Keras 3 model from {model_dir}...")

# Read config
with open(model_dir / "config.json", "r") as f:
    config = json.load(f)

print(f"Model class: {config.get('class_name')}")
print(f"Keras version: {config.get('keras_version')}")

# Try loading with h5py directly, then reconstruct
print("\nAttempting to load and convert model...")

# Use keras.models.load_model with compile=False
import tensorflow as tf

# Try different loading approach - load_model should handle directories in Keras 3
try:
    # Ensure we're using the right API
    from tensorflow import keras
    
    # Load without compiling to avoid issues
    model = keras.models.load_model(str(model_dir), compile=False)
    
    print(f"✅ Model loaded successfully!")
    print(f"Input shape: {model.input_shape}")
    print(f"Output shape: {model.output_shape}")
    
    print(f"\nSaving as {output_file}...")
    model.save(str(output_file), save_format='h5')
    
    print(f"✅ Conversion complete!")
    print(f"File size: {output_file.stat().st_size / (1024*1024):.2f} MB")
    
except Exception as e:
    print(f"❌ Failed: {e}")
    print("\nTrying alternative approach...")
    
    # Alternative: manually reconstruct from weights
    weights_file = model_dir / "model.weights.h5"
    print(f"Weights file: {weights_file}")
    print(f"Weights exist: {weights_file.exists()}")

print(f"Model loaded successfully!")
print(f"Input shape: {model.input_shape}")
print(f"Output shape: {model.output_shape}")

print(f"\nSaving as {output_file}...")
model.save(str(output_file), save_format='h5')

print(f"✅ Conversion complete! Model saved to {output_file}")
print(f"File size: {output_file.stat().st_size / (1024*1024):.2f} MB")
