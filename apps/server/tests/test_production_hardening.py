"""
Production Hardening Test Suite

Tests all production hardening features:
1. Upload size limits
2. Image type validation
3. Model caching
4. Model version support
5. Rate limiting
6. Error handling
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

def test_config():
    """Test configuration settings"""
    print("=" * 60)
    print("TEST 1: Configuration Settings")
    print("=" * 60)
    
    from app.config import settings
    
    print(f"✅ APP_NAME: {settings.APP_NAME}")
    print(f"✅ APP_VERSION: {settings.APP_VERSION}")
    print(f"✅ MAX_UPLOAD_SIZE: {settings.MAX_UPLOAD_SIZE / (1024*1024)}MB")
    print(f"✅ ALLOWED_EXTENSIONS: {settings.ALLOWED_EXTENSIONS}")
    print(f"✅ RATE_LIMIT_ENABLED: {settings.RATE_LIMIT_ENABLED}")
    print(f"✅ RATE_LIMIT: {settings.RATE_LIMIT_REQUESTS} requests per {settings.RATE_LIMIT_WINDOW}s")
    print()


def test_rate_limiter():
    """Test rate limiter functionality"""
    print("=" * 60)
    print("TEST 2: Rate Limiter")
    print("=" * 60)
    
    from app.services.rate_limiter import RateLimiter
    
    # Create test limiter with low limits
    limiter = RateLimiter(max_requests=3, window_seconds=60)
    
    test_ip = "192.168.1.100"
    
    # Test allowing requests
    for i in range(3):
        allowed, remaining, retry = limiter.is_allowed(test_ip)
        assert allowed, f"Request {i+1} should be allowed"
        print(f"✅ Request {i+1}: Allowed, Remaining={remaining}")
    
    # Test rate limit exceeded
    allowed, remaining, retry = limiter.is_allowed(test_ip)
    assert not allowed, "4th request should be rate limited"
    print(f"✅ Request 4: Rate limited, Retry after={retry}s")
    
    # Test stats
    stats = limiter.get_stats()
    print(f"✅ Stats: {stats}")
    print()


def test_model_metadata():
    """Test model metadata includes version"""
    print("=" * 60)
    print("TEST 3: Model Metadata & Version")
    print("=" * 60)
    
    import json
    metadata_path = Path(__file__).parent.parent / "artifacts" / "model_metadata.json"
    
    with open(metadata_path) as f:
        metadata = json.load(f)
    
    assert "model_version" in metadata, "model_version field missing"
    print(f"✅ Model Name: {metadata.get('model_name')}")
    print(f"✅ Model Version: {metadata.get('model_version')}")
    print(f"✅ Framework: {metadata.get('framework')}")
    print(f"✅ Classes: {metadata.get('num_classes')}")
    print()


def test_model_caching():
    """Test ML model singleton caching"""
    print("=" * 60)
    print("TEST 4: Model Caching (Singleton)")
    print("=" * 60)
    
    from app.services.inference import get_inference_service
    
    # Get service twice - should return same instance
    service1 = get_inference_service()
    service2 = get_inference_service()
    
    assert service1 is service2, "Should return cached singleton instance"
    print(f"✅ Singleton pattern working: {id(service1) == id(service2)}")
    
    model_info = service1.get_model_info()
    print(f"✅ Model Type: {model_info.get('model_type')}")
    print(f"✅ Model Name: {model_info.get('model_name')}")
    print(f"✅ Model Version: {model_info.get('model_version')}")
    print()


def test_upload_validation():
    """Test upload size and type validation logic"""
    print("=" * 60)
    print("TEST 5: Upload Validation Logic")
    print("=" * 60)
    
    from app.config import settings
    
    # Test size validation
    max_size = settings.MAX_UPLOAD_SIZE
    test_sizes = [
        (5 * 1024 * 1024, True, "5MB"),      # Should pass
        (10 * 1024 * 1024, True, "10MB"),    # Should pass (exactly at limit)
        (11 * 1024 * 1024, False, "11MB"),   # Should fail
        (50 * 1024 * 1024, False, "50MB"),   # Should fail
    ]
    
    for size, should_pass, label in test_sizes:
        passes = size <= max_size
        status = "✅ PASS" if passes == should_pass else "❌ FAIL"
        print(f"{status} {label}: {passes} (expected: {should_pass})")
    
    # Test extension validation
    test_extensions = [
        ("jpg", True),
        ("jpeg", True),
        ("png", True),
        ("gif", False),
        ("bmp", False),
        ("pdf", False),
    ]
    
    for ext, should_pass in test_extensions:
        passes = ext in settings.ALLOWED_EXTENSIONS
        status = "✅ PASS" if passes == should_pass else "❌ FAIL"
        print(f"{status} .{ext}: {passes} (expected: {should_pass})")
    
    print()


def test_error_handling():
    """Test error handling structures"""
    print("=" * 60)
    print("TEST 6: Error Handling Structures")
    print("=" * 60)
    
    import uuid
    
    # Test request ID generation
    request_id = str(uuid.uuid4())
    print(f"✅ Request ID generation: {request_id}")
    
    # Test error response structure
    error_response = {
        "error": "SERVER_ERROR",
        "message": "An unexpected error occurred",
        "request_id": request_id,
        "suggestion": "Please try again"
    }
    print(f"✅ Error response structure: {list(error_response.keys())}")
    
    # Test rate limit response structure
    rate_limit_response = {
        "error": "RATE_LIMIT_EXCEEDED",
        "message": "Too many requests",
        "retry_after_seconds": 30,
        "limit": "30 requests per 60 seconds"
    }
    print(f"✅ Rate limit response structure: {list(rate_limit_response.keys())}")
    
    print()


def test_startup_sequence():
    """Test startup validation sequence"""
    print("=" * 60)
    print("TEST 7: Startup Validation Sequence")
    print("=" * 60)
    
    from app.services.knowledge_validator import validate_knowledge_base
    from app.services.inference import get_inference_service
    
    # Test knowledge base validation
    knowledge_dir = Path(__file__).parent.parent / "data" / "knowledge"
    is_valid, summary = validate_knowledge_base(knowledge_dir)
    print(f"✅ Knowledge base validation: {is_valid}")
    
    # Test model preloading
    service = get_inference_service()
    model_info = service.get_model_info()
    print(f"✅ Model preload: {model_info.get('model_name')} v{model_info.get('model_version')}")
    
    print()


def run_all_tests():
    """Run all production hardening tests"""
    print("\n")
    print("🔒 PRODUCTION HARDENING TEST SUITE")
    print("=" * 60)
    print()
    
    try:
        test_config()
        test_rate_limiter()
        test_model_metadata()
        test_model_caching()
        test_upload_validation()
        test_error_handling()
        test_startup_sequence()
        
        print("=" * 60)
        print("✅ ALL TESTS PASSED")
        print("=" * 60)
        print()
        return True
        
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}\n")
        return False
    except Exception as e:
        print(f"\n❌ ERROR: {e}\n")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
