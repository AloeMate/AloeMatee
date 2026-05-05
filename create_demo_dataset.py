"""
Create a demo dataset for training the model
Generates synthetic images for each disease class
"""
import numpy as np
from pathlib import Path
from PIL import Image
import random

# Disease classes
CLASSES = ["Aloe_Rot", "Aloe_Rust", "Anthracnose", "Healthy", "Leaf_Spot", "Sunburn"]

# Dataset path
DATASET_ROOT = Path("dataset/Aloe Vera Leaf Disease Detection Dataset")

def create_dataset(num_samples_per_class=30, img_size=384):
    """Create synthetic dataset"""
    DATASET_ROOT.mkdir(parents=True, exist_ok=True)
    
    print("🎨 Creating synthetic demo dataset...")
    print(f"   Location: {DATASET_ROOT}")
    print(f"   Classes: {len(CLASSES)}")
    print(f"   Samples per class: {num_samples_per_class}\n")
    
    for class_name in CLASSES:
        class_dir = DATASET_ROOT / class_name
        class_dir.mkdir(parents=True, exist_ok=True)
        
        # Define color patterns for each class
        if class_name == "Healthy":
            base_color = (34, 139, 34)  # Dark green
        elif class_name == "Aloe_Rot":
            base_color = (139, 69, 19)  # Brown
        elif class_name == "Aloe_Rust":
            base_color = (184, 92, 23)  # Rust/orange-brown
        elif class_name == "Anthracnose":
            base_color = (40, 40, 40)   # Dark gray
        elif class_name == "Leaf_Spot":
            base_color = (105, 105, 105)  # Dim gray
        elif class_name == "Sunburn":
            base_color = (255, 140, 0)  # Orange
        
        print(f"📁 Creating {class_name}...")
        
        for i in range(num_samples_per_class):
            # Create synthetic image with disease pattern
            img_array = create_synthetic_leaf_image(base_color, img_size, class_name)
            
            # Save as PNG
            img = Image.fromarray(img_array)
            img.save(class_dir / f"{class_name}_{i:03d}.png")
        
        print(f"   ✓ Created {num_samples_per_class} images")
    
    print(f"\n✅ Dataset created successfully!")
    print(f"   Total images: {len(CLASSES) * num_samples_per_class}")

def create_synthetic_leaf_image(base_color, size=384, class_name="Healthy"):
    """Create a synthetic leaf image"""
    # Start with a gradient background
    img = np.ones((size, size, 3), dtype=np.uint8)
    
    # Create base leaf shape
    y, x = np.ogrid[:size, :size]
    center = size // 2
    
    # Leaf ellipse
    leaf_mask = ((x - center)**2 / (size/3)**2 + (y - center)**2 / (size/2)**2) <= 1
    
    # Apply base color with variation
    for i in range(3):
        variation = np.random.randint(-20, 20)
        img[leaf_mask, i] = np.clip(base_color[i] + variation, 0, 255)
    
    # Add disease patterns (spots, streaks, discoloration)
    if class_name == "Aloe_Rot":
        # Brown/dark spots
        for _ in range(random.randint(5, 15)):
            add_spot(img, leaf_mask, (60, 40, 20), size=random.randint(10, 40))
    
    elif class_name == "Aloe_Rust":
        # Rust-colored streaks
        for _ in range(random.randint(3, 8)):
            add_streak(img, leaf_mask, (184, 92, 23), width=random.randint(5, 15))
    
    elif class_name == "Anthracnose":
        # Dark spots with halos
        for _ in range(random.randint(8, 15)):
            add_spotted_lesion(img, leaf_mask, (40, 40, 40), size=random.randint(15, 35))
    
    elif class_name == "Leaf_Spot":
        # Gray spots
        for _ in range(random.randint(10, 20)):
            add_spot(img, leaf_mask, (100, 100, 100), size=random.randint(8, 25))
    
    elif class_name == "Sunburn":
        # Yellow/orange patches
        for _ in range(random.randint(3, 6)):
            add_patch(img, leaf_mask, (255, 200, 0), size=random.randint(40, 100))
    
    # Add some noise/texture
    noise = np.random.normal(0, 10, img.shape).astype(int)
    img = np.clip(img.astype(int) + noise, 0, 255).astype(np.uint8)
    
    # Ensure background is light
    background = ~leaf_mask
    img[background] = np.clip(img[background].astype(int) + 50, 200, 255).astype(np.uint8)
    
    return img

def add_spot(img, mask, color, size=20):
    """Add a disease spot to the image"""
    h, w = img.shape[:2]
    y = np.random.randint(size, h - size)
    x = np.random.randint(size, w - size)
    
    # Create circular spot
    yy, xx = np.ogrid[-size:size+1, -size:size+1]
    spot_mask = (xx**2 + yy**2) <= size**2
    
    y_start, y_end = max(0, y - size), min(h, y + size + 1)
    x_start, x_end = max(0, x - size), min(w, x + size + 1)
    
    spot_y_start = size - (y - y_start)
    spot_y_end = spot_y_start + (y_end - y_start)
    spot_x_start = size - (x - x_start)
    spot_x_end = spot_x_start + (x_end - x_start)
    
    if spot_y_end > spot_y_start and spot_x_end > spot_x_start:
        local_mask = spot_mask[spot_y_start:spot_y_end, spot_x_start:spot_x_end]
        local_leaf_mask = mask[y_start:y_end, x_start:x_end]
        combined_mask = local_mask & local_leaf_mask
        
        for i in range(3):
            img[y_start:y_end, x_start:x_end, i][combined_mask] = color[i]

def add_streak(img, mask, color, width=10):
    """Add a streak pattern"""
    h, w = img.shape[:2]
    y1 = np.random.randint(h // 4, 3 * h // 4)
    x1 = np.random.randint(w // 4, 3 * w // 4)
    y2 = y1 + np.random.randint(-100, 100)
    x2 = x1 + np.random.randint(-100, 100)
    
    yy, xx = np.ogrid[:h, :w]
    line_mask = (np.abs((y2 - y1) * xx - (x2 - x1) * yy + x2 * y1 - y2 * x1) / 
                 np.sqrt((y2 - y1)**2 + (x2 - x1)**2)) < width
    
    combined_mask = line_mask & mask
    for i in range(3):
        img[combined_mask, i] = color[i]

def add_spotted_lesion(img, mask, color, size=20):
    """Add a lesion with dark center and lighter halo"""
    add_spot(img, mask, color, size=size)
    lighter_color = tuple(min(c + 60, 255) for c in color)
    add_spot(img, mask, lighter_color, size=int(size * 1.5))

def add_patch(img, mask, color, size=50):
    """Add a colored patch"""
    h, w = img.shape[:2]
    y = np.random.randint(size, h - size)
    x = np.random.randint(size, w - size)
    
    y_start, y_end = max(0, y - size), min(h, y + size)
    x_start, x_end = max(0, x - size), min(w, x + size)
    
    patch_mask = mask[y_start:y_end, x_start:x_end]
    for i in range(3):
        img[y_start:y_end, x_start:x_end, i][patch_mask] = color[i]

if __name__ == "__main__":
    create_dataset(num_samples_per_class=30, img_size=384)
    print("\n🚀 Dataset ready! You can now train the model:")
    print("   cd apps/training")
    print("   python split.py")
    print("   python train.py --epochs 10 --batch_size 16")
