"""
Generate manifest.csv for the dataset
"""
from pathlib import Path
import pandas as pd

dataset_root = Path("dataset/Aloe Vera Leaf Disease Detection Dataset")
manifest_data = []

for class_dir in sorted(dataset_root.iterdir()):
    if class_dir.is_dir():
        class_name = class_dir.name
        for img_file in sorted(class_dir.glob("*.png")):
            relative_path = img_file.relative_to(dataset_root.parent)
            manifest_data.append({
                "image_path": str(relative_path),
                "label": class_name
            })

df = pd.DataFrame(manifest_data)
manifest_path = dataset_root.parent / "manifest.csv"
df.to_csv(manifest_path, index=False)

print(f"✓ Created manifest.csv with {len(df)} images")
print(f"✓ Classes: {df['label'].unique().tolist()}")
print(f"✓ Saved to: {manifest_path}")
