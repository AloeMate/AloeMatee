"""
Generate Figure 2.3: CNN Model Training Pipeline Visualization
This script creates a professional diagram suitable for academic reports
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import numpy as np

def create_pipeline_diagram():
    """Create comprehensive pipeline diagram"""
    fig, ax = plt.subplots(1, 1, figsize=(16, 20))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 28)
    ax.axis('off')
    
    # Color scheme
    color_input = '#E8F4F8'
    color_process = '#B3E5FC'
    color_model = '#81D4FA'
    color_training = '#4FC3F7'
    color_output = '#00BCD4'
    color_stage_a = '#FFE0B2'
    color_stage_b = '#C8E6C9'
    
    # Title
    ax.text(5, 27, 'Figure 2.3: CNN Model Training Pipeline', 
            fontsize=20, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.5', facecolor='#FFF9C4', edgecolor='black', linewidth=2))
    
    # ===== STAGE 1: Data Input =====
    y = 25
    box = FancyBboxPatch((1, y-0.6), 8, 1, boxstyle="round,pad=0.1", 
                         edgecolor='black', facecolor=color_input, linewidth=2)
    ax.add_patch(box)
    ax.text(5, y, 'Raw Dataset (3000+ Aloe Vera Leaf Images)', 
            fontsize=11, ha='center', va='center', fontweight='bold')
    
    # Arrow down
    arrow = FancyArrowPatch((5, y-0.6), (5, y-1.4), arrowstyle='->', 
                           mutation_scale=30, linewidth=2, color='black')
    ax.add_patch(arrow)
    
    # ===== STAGE 2: Data Preprocessing =====
    y = 23
    box = FancyBboxPatch((1, y-1.2), 8, 1.5, boxstyle="round,pad=0.1", 
                         edgecolor='black', facecolor=color_process, linewidth=2)
    ax.add_patch(box)
    ax.text(5, y+0.1, 'Data Preprocessing', fontsize=11, ha='center', fontweight='bold')
    ax.text(5, y-0.4, '• Stratified Split (80/10/10)  • Duplicate Detection', 
            fontsize=9, ha='center', style='italic')
    ax.text(5, y-0.75, '• Class Balance Check  • Augmentation Strategy', 
            fontsize=9, ha='center', style='italic')
    
    # Arrow down
    arrow = FancyArrowPatch((5, y-1.2), (5, y-2.0), arrowstyle='->', 
                           mutation_scale=30, linewidth=2, color='black')
    ax.add_patch(arrow)
    
    # ===== STAGE 3A & 3B Split =====
    y = 20
    
    # Stage A box (left)
    box_a = FancyBboxPatch((0.5, y-1.5), 4, 1.8, boxstyle="round,pad=0.1", 
                           edgecolor='#FF6F00', facecolor=color_stage_a, linewidth=2.5)
    ax.add_patch(box_a)
    ax.text(2.5, y+0.2, 'STAGE A', fontsize=12, ha='center', fontweight='bold', color='#D84315')
    ax.text(2.5, y-0.2, 'Binary Classifier', fontsize=10, ha='center', fontweight='bold')
    ax.text(2.5, y-0.65, '2 Classes', fontsize=9, ha='center')
    ax.text(2.5, y-1.0, '• Healthy', fontsize=8, ha='center')
    ax.text(2.5, y-1.25, '• Unhealthy', fontsize=8, ha='center')
    
    # Stage B box (right)
    box_b = FancyBboxPatch((5.5, y-1.5), 4, 1.8, boxstyle="round,pad=0.1", 
                           edgecolor='#2E7D32', facecolor=color_stage_b, linewidth=2.5)
    ax.add_patch(box_b)
    ax.text(7.5, y+0.2, 'STAGE B', fontsize=12, ha='center', fontweight='bold', color='#1B5E20')
    ax.text(7.5, y-0.2, 'Disease Classifier', fontsize=10, ha='center', fontweight='bold')
    ax.text(7.5, y-0.65, '5 Classes', fontsize=9, ha='center')
    ax.text(7.5, y-1.0, '• Aloe Rot, Aloe Rust', fontsize=8, ha='center')
    ax.text(7.5, y-1.25, '• Anthracnose, Leaf Spot, Sunburn', fontsize=8, ha='center')
    
    # Arrows from preprocessing to both stages
    arrow_a = FancyArrowPatch((3.5, 20), (2.5, 18.5), arrowstyle='->', 
                             mutation_scale=25, linewidth=2, color='#FF6F00')
    ax.add_patch(arrow_a)
    arrow_b = FancyArrowPatch((6.5, 20), (7.5, 18.5), arrowstyle='->', 
                             mutation_scale=25, linewidth=2, color='#2E7D32')
    ax.add_patch(arrow_b)
    
    # ===== STAGE 4: Data Augmentation (both stages) =====
    y = 17
    
    # Stage A Augmentation
    aug_a = FancyBboxPatch((0.5, y-1.2), 4, 1.5, boxstyle="round,pad=0.05", 
                           edgecolor='#FF6F00', facecolor='#FFE0B2', linewidth=1.5, linestyle='--')
    ax.add_patch(aug_a)
    ax.text(2.5, y+0.15, 'Data Augmentation', fontsize=10, ha='center', fontweight='bold')
    ax.text(2.5, y-0.25, '• Random Crop, Flip', fontsize=8, ha='center')
    ax.text(2.5, y-0.55, '• Rotation ±15°, Color Jitter', fontsize=8, ha='center')
    
    # Stage B Augmentation
    aug_b = FancyBboxPatch((5.5, y-1.2), 4, 1.5, boxstyle="round,pad=0.05", 
                           edgecolor='#2E7D32', facecolor='#C8E6C9', linewidth=1.5, linestyle='--')
    ax.add_patch(aug_b)
    ax.text(7.5, y+0.15, 'Data Augmentation', fontsize=10, ha='center', fontweight='bold')
    ax.text(7.5, y-0.25, '• Random Crop, Flip', fontsize=8, ha='center')
    ax.text(7.5, y-0.55, '• Rotation ±15°, Color Jitter', fontsize=8, ha='center')
    
    # Arrows down
    arrow_a = FancyArrowPatch((2.5, y-1.2), (2.5, y-2.0), arrowstyle='->', 
                             mutation_scale=20, linewidth=1.5, color='#FF6F00')
    ax.add_patch(arrow_a)
    arrow_b = FancyArrowPatch((7.5, y-1.2), (7.5, y-2.0), arrowstyle='->', 
                             mutation_scale=20, linewidth=1.5, color='#2E7D32')
    ax.add_patch(arrow_b)
    
    # ===== STAGE 5: Model Architecture =====
    y = 14.5
    
    # Model Architecture box (spans both)
    box = FancyBboxPatch((0.5, y-2.8), 9, 3, boxstyle="round,pad=0.1", 
                         edgecolor='black', facecolor=color_model, linewidth=2)
    ax.add_patch(box)
    ax.text(5, y, 'EfficientNetV2-S Architecture', fontsize=12, ha='center', fontweight='bold')
    ax.text(5, y-0.4, 'Input: 384×384 RGB  |  ~22M Parameters  |  ImageNet Pretrained', 
            fontsize=9, ha='center')
    ax.text(5, y-0.8, 'Stem Block → MBConv Blocks (1-5) → Global Avg Pooling → Dense Head', 
            fontsize=9, ha='center', style='italic')
    ax.text(5, y-1.3, 'Stage A: 2 output classes  |  Stage B: 5 output classes', 
            fontsize=9, ha='center', fontweight='bold', color='#01579B')
    ax.text(5, y-1.8, 'Features: SE Modules • Inverted Residuals • Depthwise Separable Conv', 
            fontsize=8, ha='center')
    ax.text(5, y-2.3, 'Activation: SiLU  •  Normalization: Batch Norm', 
            fontsize=8, ha='center')
    
    # Arrow down
    arrow = FancyArrowPatch((5, y-2.8), (5, y-3.6), arrowstyle='->', 
                           mutation_scale=30, linewidth=2, color='black')
    ax.add_patch(arrow)
    
    # ===== STAGE 6: Training Loop =====
    y = 10
    
    # Training parameters (left)
    train_a = FancyBboxPatch((0.5, y-1.5), 4, 1.8, boxstyle="round,pad=0.08", 
                             edgecolor='#1565C0', facecolor=color_training, linewidth=2)
    ax.add_patch(train_a)
    ax.text(2.5, y+0.2, 'Training Configuration', fontsize=10, ha='center', fontweight='bold')
    ax.text(2.5, y-0.25, 'Optimizer: AdamW', fontsize=8, ha='center')
    ax.text(2.5, y-0.55, 'Epochs: 20  •  Batch: 32', fontsize=8, ha='center')
    ax.text(2.5, y-0.85, 'LR: 0.001  •  Weight Decay: 1e-4', fontsize=8, ha='center')
    ax.text(2.5, y-1.15, 'Early Stopping: Patience=5', fontsize=8, ha='center')
    
    # Loss & Optimization (right)
    loss_b = FancyBboxPatch((5.5, y-1.5), 4, 1.8, boxstyle="round,pad=0.08", 
                            edgecolor='#1565C0', facecolor=color_training, linewidth=2)
    ax.add_patch(loss_b)
    ax.text(7.5, y+0.2, 'Loss & Optimization', fontsize=10, ha='center', fontweight='bold')
    ax.text(7.5, y-0.25, 'Loss: CrossEntropyLoss', fontsize=8, ha='center')
    ax.text(7.5, y-0.55, 'Class Weights: Yes (imbalance)', fontsize=8, ha='center')
    ax.text(7.5, y-0.85, 'Scheduler: ReduceLROnPlateau', fontsize=8, ha='center')
    ax.text(7.5, y-1.15, 'Factor: 0.5, Patience: 3', fontsize=8, ha='center')
    
    # Arrow down
    arrow = FancyArrowPatch((5, y-1.5), (5, y-2.3), arrowstyle='->', 
                           mutation_scale=30, linewidth=2, color='black')
    ax.add_patch(arrow)
    
    # ===== STAGE 7: Training Process =====
    y = 7
    
    box = FancyBboxPatch((1, y-1.8), 8, 2, boxstyle="round,pad=0.1", 
                         edgecolor='#6A1B9A', facecolor='#F3E5F5', linewidth=2)
    ax.add_patch(box)
    ax.text(5, y+0.1, 'Training Loop Process', fontsize=11, ha='center', fontweight='bold', color='#4A148C')
    ax.text(1.5, y-0.4, '① Forward Pass', fontsize=9, ha='left', fontweight='bold')
    ax.text(1.5, y-0.75, '② Compute Loss', fontsize=9, ha='left', fontweight='bold')
    ax.text(1.5, y-1.1, '③ Backward Pass', fontsize=9, ha='left', fontweight='bold')
    ax.text(1.5, y-1.45, '④ Weight Update', fontsize=9, ha='left', fontweight='bold')
    
    ax.text(5.5, y-0.4, '⑤ Validation Check', fontsize=9, ha='left', fontweight='bold')
    ax.text(5.5, y-0.75, '⑥ Update Best Model', fontsize=9, ha='left', fontweight='bold')
    ax.text(5.5, y-1.1, '⑦ Learning Rate Adjust', fontsize=9, ha='left', fontweight='bold')
    ax.text(5.5, y-1.45, '⑧ Save Metrics', fontsize=9, ha='left', fontweight='bold')
    
    # Arrow down
    arrow = FancyArrowPatch((5, y-1.8), (5, y-2.6), arrowstyle='->', 
                           mutation_scale=30, linewidth=2, color='black')
    ax.add_patch(arrow)
    
    # ===== STAGE 8: Post-Training =====
    y = 4.5
    
    # Calibration (left)
    cal_box = FancyBboxPatch((0.5, y-1.2), 4, 1.5, boxstyle="round,pad=0.08", 
                             edgecolor='#C62828', facecolor='#FFEBEE', linewidth=2)
    ax.add_patch(cal_box)
    ax.text(2.5, y+0.15, 'Temperature Scaling', fontsize=10, ha='center', fontweight='bold', color='#B71C1C')
    ax.text(2.5, y-0.25, 'Post-hoc Calibration', fontsize=8, ha='center')
    ax.text(2.5, y-0.55, 'Learns scalar T', fontsize=8, ha='center')
    ax.text(2.5, y-0.85, 'P(y|x) = softmax(logits/T)', fontsize=8, ha='center', style='italic')
    
    # Evaluation (right)
    eval_box = FancyBboxPatch((5.5, y-1.2), 4, 1.5, boxstyle="round,pad=0.08", 
                              edgecolor='#C62828', facecolor='#FFEBEE', linewidth=2)
    ax.add_patch(eval_box)
    ax.text(7.5, y+0.15, 'Evaluation Metrics', fontsize=10, ha='center', fontweight='bold', color='#B71C1C')
    ax.text(7.5, y-0.25, 'Accuracy, Precision, Recall, F1', fontsize=8, ha='center')
    ax.text(7.5, y-0.55, 'Confusion Matrix, ECE', fontsize=8, ha='center')
    ax.text(7.5, y-0.85, 'Reliability Diagrams', fontsize=8, ha='center')
    
    # Arrow down
    arrow = FancyArrowPatch((5, y-1.2), (5, y-2.0), arrowstyle='->', 
                           mutation_scale=30, linewidth=2, color='black')
    ax.add_patch(arrow)
    
    # ===== STAGE 9: Output =====
    y = 1.5
    
    box = FancyBboxPatch((0.5, y-0.8), 9, 1, boxstyle="round,pad=0.1", 
                         edgecolor='#00695C', facecolor=color_output, linewidth=2)
    ax.add_patch(box)
    ax.text(5, y+0.1, 'Output Artifacts: model.pt • model_metadata.json • calibration.json', 
            fontsize=9, ha='center', fontweight='bold', color='white')
    ax.text(5, y-0.35, 'confusion_matrix.png • training_history.json • eval_summary.txt', 
            fontsize=9, ha='center', fontweight='bold', color='white')
    
    # Add legend
    ax.text(0.5, 0.3, '© AloeMateMate 2026 | EfficientNetV2-S Two-Stage Pipeline', 
            fontsize=8, ha='left', style='italic', color='gray')
    
    plt.tight_layout()
    return fig

# Create and save figure
if __name__ == "__main__":
    fig = create_pipeline_diagram()
    
    # Save as PNG
    fig.savefig('Figure_2_3_CNN_Training_Pipeline.png', dpi=300, bbox_inches='tight')
    print("✓ Figure saved as: Figure_2_3_CNN_Training_Pipeline.png")
    
    # Also save as PDF for reports
    fig.savefig('Figure_2_3_CNN_Training_Pipeline.pdf', bbox_inches='tight')
    print("✓ Figure saved as: Figure_2_3_CNN_Training_Pipeline.pdf")
    
    plt.show()
