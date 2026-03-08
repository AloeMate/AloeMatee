"""
Unit tests for quad warp and point ordering functions.

Tests verify:
- Point ordering consistency for various input orders
- Perspective transform correctness
- Edge cases and error handling
"""

import pytest
import numpy as np
import cv2
from app.api.harvest import order_points, apply_quad_warp


class TestOrderPoints:
    """Test suite for order_points function."""
    
    def test_order_points_standard_rectangle(self):
        """Test ordering of a standard upright rectangle."""
        # Input points in random order: BR, TL, BL, TR
        points = np.array([
            [300, 400],  # bottom-right
            [100, 100],  # top-left
            [100, 400],  # bottom-left
            [300, 100],  # top-right
        ], dtype=np.float32)
        
        ordered = order_points(points)
        
        # Expected order: TL, TR, BR, BL
        expected = np.array([
            [100, 100],  # top-left
            [300, 100],  # top-right
            [300, 400],  # bottom-right
            [100, 400],  # bottom-left
        ], dtype=np.float32)
        
        np.testing.assert_array_almost_equal(ordered, expected, decimal=1)
    
    def test_order_points_already_ordered(self):
        """Test that already ordered points remain in correct order."""
        points = np.array([
            [50, 50],    # top-left
            [200, 50],   # top-right
            [200, 150],  # bottom-right
            [50, 150],   # bottom-left
        ], dtype=np.float32)
        
        ordered = order_points(points)
        
        np.testing.assert_array_almost_equal(ordered, points, decimal=1)
    
    def test_order_points_rotated_rectangle(self):
        """Test ordering of a rotated rectangle."""
        # Rectangle rotated 45 degrees
        center = np.array([200, 200])
        angle = np.radians(45)
        
        # Create rotated rectangle
        half_w, half_h = 100, 60
        corners = np.array([
            [-half_w, -half_h],  # TL before rotation
            [half_w, -half_h],   # TR before rotation
            [half_w, half_h],    # BR before rotation
            [-half_w, half_h],   # BL before rotation
        ], dtype=np.float32)
        
        # Rotation matrix
        cos_a, sin_a = np.cos(angle), np.sin(angle)
        rotation_matrix = np.array([
            [cos_a, -sin_a],
            [sin_a, cos_a]
        ])
        
        # Apply rotation and translation
        rotated = corners @ rotation_matrix.T + center
        
        # Shuffle the points
        shuffled = rotated[[2, 0, 3, 1]]  # BR, TL, BL, TR
        
        ordered = order_points(shuffled)
        
        # Verify the order is consistent (TL, TR, BR, BL)
        # For rotated rectangles, verify relative positions rather than absolute quadrants
        # TL should have smallest sum (x + y)
        # BR should have largest sum or equal to others for 45° rotation
        sums = ordered.sum(axis=1)
        assert sums[0] <= sums[2], "TL should have smaller or equal sum than BR"
        assert sums[3] <= sums[2], "BL should have smaller or equal sum than BR"
        assert sums[1] <= sums[2], "TR should have smaller or equal sum than BR"
        
        # TL should have the smallest or equal sum
        assert sums[0] <= sums[1] and sums[0] <= sums[3], "TL should have smallest or equal sum"
    
    def test_order_points_trapezoid(self):
        """Test ordering of a trapezoid (non-rectangular quad)."""
        # Trapezoid: wider at bottom
        points = np.array([
            [150, 100],  # top-left
            [250, 100],  # top-right
            [300, 200],  # bottom-right
            [100, 200],  # bottom-left
        ], dtype=np.float32)
        
        # Shuffle
        shuffled = points[[3, 1, 0, 2]]  # BL, TR, TL, BR
        
        ordered = order_points(shuffled)
        
        # Verify ordering: top points should have smaller y
        assert ordered[0, 1] < ordered[3, 1], "TL.y < BL.y"
        assert ordered[1, 1] < ordered[2, 1], "TR.y < BR.y"
        
        # Left points should have smaller x
        assert ordered[0, 0] < ordered[1, 0], "TL.x < TR.x"
        assert ordered[3, 0] < ordered[2, 0], "BL.x < BR.x"
    
    def test_order_points_invalid_count(self):
        """Test that invalid point count raises error."""
        points = np.array([[100, 100], [200, 200]], dtype=np.float32)
        
        with pytest.raises(ValueError, match="Expected 4 points"):
            order_points(points)
    
    def test_order_points_all_permutations(self):
        """Test all 24 permutations of 4 points produce same ordered result."""
        from itertools import permutations
        
        # Define canonical ordered points
        canonical = np.array([
            [100, 100],  # TL
            [300, 100],  # TR
            [300, 300],  # BR
            [100, 300],  # BL
        ], dtype=np.float32)
        
        # Test all 24 permutations
        for perm in permutations(range(4)):
            shuffled = canonical[list(perm)]
            ordered = order_points(shuffled)
            
            # All permutations should produce the same ordered result
            np.testing.assert_array_almost_equal(
                ordered, canonical, decimal=1,
                err_msg=f"Failed for permutation {perm}"
            )


class TestApplyQuadWarp:
    """Test suite for apply_quad_warp function."""
    
    def test_warp_identity_rectangle(self):
        """Test warping a rectangle that's already axis-aligned."""
        # Create a simple test image with colored quadrants
        img = np.zeros((400, 400, 3), dtype=np.uint8)
        img[0:200, 0:200] = [255, 0, 0]      # Top-left: blue
        img[0:200, 200:400] = [0, 255, 0]    # Top-right: green
        img[200:400, 200:400] = [0, 0, 255]  # Bottom-right: red
        img[200:400, 0:200] = [255, 255, 0]  # Bottom-left: cyan
        
        # Quad points for a rectangle inside the image
        quad = np.array([
            [50, 50],
            [350, 50],
            [350, 350],
            [50, 350]
        ], dtype=np.float32)
        
        warped = apply_quad_warp(img, quad)
        
        # Check output dimensions
        assert warped.shape[0] == 300  # height
        assert warped.shape[1] == 300  # width
        
        # Check colors at corners (with some tolerance for interpolation)
        assert warped[10, 10, 0] > 200, "Top-left should be blue"
        assert warped[10, 290, 1] > 200, "Top-right should be green"
        assert warped[290, 290, 2] > 200, "Bottom-right should be red"
        assert warped[290, 10, 0] > 200 and warped[290, 10, 1] > 200, "Bottom-left should be cyan"
    
    def test_warp_rotated_rectangle(self):
        """Test warping a rotated rectangle back to axis-aligned."""
        # Create image with a clear pattern
        img = np.ones((500, 500, 3), dtype=np.uint8) * 128
        
        # Draw a rotated rectangle with distinct pattern
        center = (250, 250)
        size = (200, 100)
        angle = 30
        
        # Calculate rotated rectangle corners
        box = cv2.boxPoints(((center[0], center[1]), size, angle))
        box = np.intp(box)  # Use np.intp instead of deprecated np.int0
        
        # Fill the rotated rectangle with a color
        cv2.fillPoly(img, [box], (255, 0, 0))
        
        # Apply warp
        quad_points = box.astype(np.float32)
        warped = apply_quad_warp(img, quad_points)
        
        # Output should be approximately the rectangle dimensions
        # (dimensions might be swapped depending on orientation)
        h, w = warped.shape[:2]
        
        # One dimension should be ~200, other ~100
        dims = sorted([h, w])
        assert 90 < dims[0] < 110, f"Smaller dimension should be ~100, got {dims[0]}"
        assert 190 < dims[1] < 210, f"Larger dimension should be ~200, got {dims[1]}"
        
        # Most of the warped image should be blue (not gray)
        blue_pixels = np.sum(warped[:, :, 0] > 200)
        total_pixels = h * w
        assert blue_pixels > total_pixels * 0.8, "Most pixels should be blue"
    
    def test_warp_perspective_distortion(self):
        """Test warping a trapezoid to rectangle (perspective correction)."""
        # Create checkerboard pattern
        img = np.zeros((600, 800, 3), dtype=np.uint8)
        square_size = 50
        
        for i in range(0, 600, square_size):
            for j in range(0, 800, square_size):
                if (i // square_size + j // square_size) % 2 == 0:
                    img[i:i+square_size, j:j+square_size] = 255
        
        # Define a trapezoid (perspective distorted rectangle)
        quad = np.array([
            [200, 150],  # TL
            [600, 100],  # TR (higher, creating perspective)
            [650, 450],  # BR
            [150, 500],  # BL
        ], dtype=np.float32)
        
        warped = apply_quad_warp(img, quad)
        
        # Warped output should be a rectangle
        h, w = warped.shape[:2]
        assert h > 0 and w > 0, "Output should have non-zero dimensions"
        
        # Check aspect ratio is reasonable (not extreme)
        aspect_ratio = w / h
        assert 0.5 < aspect_ratio < 2.0, f"Aspect ratio {aspect_ratio} seems unreasonable"
    
    def test_warp_shuffled_points(self):
        """Test that point order doesn't affect warp result."""
        img = np.zeros((400, 400, 3), dtype=np.uint8)
        
        # Create distinct regions
        cv2.rectangle(img, (100, 100), (150, 150), (255, 0, 0), -1)    # TL blue
        cv2.rectangle(img, (250, 100), (300, 150), (0, 255, 0), -1)    # TR green
        cv2.rectangle(img, (250, 250), (300, 300), (0, 0, 255), -1)    # BR red
        cv2.rectangle(img, (100, 250), (150, 300), (255, 255, 0), -1)  # BL yellow
        
        quad_ordered = np.array([
            [100, 100],
            [300, 100],
            [300, 300],
            [100, 300]
        ], dtype=np.float32)
        
        quad_shuffled = np.array([
            [300, 300],  # BR
            [100, 100],  # TL
            [300, 100],  # TR
            [100, 300],  # BL
        ], dtype=np.float32)
        
        warped1 = apply_quad_warp(img, quad_ordered)
        warped2 = apply_quad_warp(img, quad_shuffled)
        
        # Both should produce identical results
        np.testing.assert_array_equal(warped1, warped2)
    
    def test_warp_small_quad(self):
        """Test warping a very small quadrilateral."""
        img = np.random.randint(0, 256, (500, 500, 3), dtype=np.uint8)
        
        # Small 20x20 region
        quad = np.array([
            [200, 200],
            [220, 200],
            [220, 220],
            [200, 220]
        ], dtype=np.float32)
        
        warped = apply_quad_warp(img, quad)
        
        # Should produce a small output
        assert warped.shape[0] == 20
        assert warped.shape[1] == 20
    
    def test_warp_large_quad(self):
        """Test warping a large quadrilateral."""
        img = np.random.randint(0, 256, (2000, 2000, 3), dtype=np.uint8)
        
        # Large region
        quad = np.array([
            [100, 100],
            [1900, 100],
            [1900, 1900],
            [100, 1900]
        ], dtype=np.float32)
        
        warped = apply_quad_warp(img, quad)
        
        # Should produce a large output
        assert warped.shape[0] == 1800
        assert warped.shape[1] == 1800
    
    def test_warp_preserves_aspect_ratio(self):
        """Test that warping preserves the aspect ratio of the quadrilateral."""
        img = np.zeros((1000, 1000, 3), dtype=np.uint8)
        
        # Create a 3:1 aspect ratio rectangle (600x200)
        # Points should be in TL, TR, BR, BL order
        quad = np.array([
            [100, 400],  # Top-left
            [700, 400],  # Top-right (Width: 600)
            [700, 600],  # Bottom-right (Height: 200)
            [100, 600]   # Bottom-left
        ], dtype=np.float32)
        
        warped = apply_quad_warp(img, quad)
        
        h, w = warped.shape[:2]
        aspect_ratio = w / h
        
        # Should be approximately 3:1 (600:200)
        assert 2.8 < aspect_ratio < 3.2, f"Expected ~3.0, got {aspect_ratio} (dimensions: {w}x{h})"
    
    def test_warp_invalid_points(self):
        """Test error handling for invalid point counts."""
        img = np.zeros((400, 400, 3), dtype=np.uint8)
        
        # Only 3 points
        quad = np.array([
            [100, 100],
            [300, 100],
            [300, 300]
        ], dtype=np.float32)
        
        with pytest.raises(ValueError):
            apply_quad_warp(img, quad)


class TestQuadWarpIntegration:
    """Integration tests for quad warp with realistic scenarios."""
    
    def test_credit_card_simulation(self):
        """Test warping a simulated credit card at various angles."""
        # Create a credit card-sized image (856 x 540 pixels for 85.6mm x 54mm)
        card_img = np.ones((540, 856, 3), dtype=np.uint8) * 255
        
        # Add some features to the card
        cv2.rectangle(card_img, (50, 50), (806, 490), (200, 200, 200), 20)
        cv2.putText(card_img, "CARD", (300, 300), cv2.FONT_HERSHEY_SIMPLEX, 
                   3, (0, 0, 0), 5)
        
        # Place card in a larger scene at an angle
        scene = np.zeros((1200, 1600, 3), dtype=np.uint8)
        
        # Define source (card) and destination (quad in scene) rectangles
        src_rect = np.array([
            [0, 0],
            [855, 0],
            [855, 539],
            [0, 539]
        ], dtype=np.float32)
        
        # Calculate perspective-transformed corners in the scene
        # Simulate card at an angle
        quad = np.array([
            [300, 400],   # Top-left in scene
            [1100, 350],  # Top-right in scene  
            [1150, 750],  # Bottom-right in scene
            [250, 800]    # Bottom-left in scene
        ], dtype=np.float32)
        
        # Create the card in the scene with perspective (src -> quad)
        matrix = cv2.getPerspectiveTransform(src_rect, quad)
        scene_with_card = cv2.warpPerspective(card_img, matrix, (1600, 1200))
        
        # Now warp it back
        warped = apply_quad_warp(scene_with_card, quad)
        
        # Warped result should be approximately credit card dimensions
        h, w = warped.shape[:2]
        
        # Check aspect ratio (allow for perspective distortion)
        aspect_ratio = w / h
        expected_ratio = 856 / 540  # ~1.585
        # Allow larger tolerance due to perspective distortion from extreme angle
        assert abs(aspect_ratio - expected_ratio) < 0.7, \
            f"Aspect ratio {aspect_ratio} differs from expected {expected_ratio} (dimensions: {w}x{h})"
    
    def test_leaf_measurement_simulation(self):
        """Test warping a region containing leaf measurements."""
        # Create image with simulated leaf
        img = np.ones((800, 1000, 3), dtype=np.uint8) * 200
        
        # Draw a leaf-like shape
        leaf_points = np.array([
            [400, 200],
            [420, 250],
            [430, 300],
            [425, 350],
            [410, 400],
            [390, 400],
            [375, 350],
            [370, 300],
            [380, 250]
        ], dtype=np.int32)
        
        cv2.fillPoly(img, [leaf_points], (0, 180, 0))
        
        # Draw reference card
        cv2.rectangle(img, (600, 300), (750, 390), (255, 255, 255), -1)
        cv2.rectangle(img, (600, 300), (750, 390), (0, 0, 0), 2)
        
        # Define crop region (slightly rotated)
        quad = np.array([
            [250, 150],
            [900, 120],
            [920, 550],
            [270, 580]
        ], dtype=np.float32)
        
        warped = apply_quad_warp(img, quad)
        
        # Check that we get a valid warped image
        assert warped.shape[0] > 0 and warped.shape[1] > 0
        assert warped.shape[2] == 3  # Should be RGB
        
        # Check that leaf is still visible (green pixels present)
        green_mask = (warped[:, :, 1] > 150) & (warped[:, :, 0] < 100)
        assert np.sum(green_mask) > 100, "Leaf should be visible in warped image"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
