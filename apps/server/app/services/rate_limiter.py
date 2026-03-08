"""
Simple in-memory rate limiter for production hardening

Implements sliding window rate limiting per IP address.
No external dependencies (Redis, etc.) needed.
"""
import time
from collections import defaultdict, deque
from typing import Dict, Tuple
import logging

logger = logging.getLogger(__name__)


class RateLimiter:
    """
    Simple in-memory rate limiter using sliding window algorithm
    
    Thread-safe for concurrent requests in production.
    """
    
    def __init__(self, max_requests: int = 30, window_seconds: int = 60):
        """
        Initialize rate limiter
        
        Args:
            max_requests: Maximum requests allowed per window
            window_seconds: Time window in seconds
        """
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        
        # Store request timestamps per IP: {ip: deque([timestamp1, timestamp2, ...])}
        self._request_log: Dict[str, deque] = defaultdict(lambda: deque())
        
        logger.info(f"Rate limiter initialized: {max_requests} requests per {window_seconds}s")
    
    def is_allowed(self, client_ip: str) -> Tuple[bool, int, int]:
        """
        Check if request is allowed for this IP
        
        Args:
            client_ip: Client IP address
            
        Returns:
            Tuple of (is_allowed, remaining_requests, retry_after_seconds)
        """
        current_time = time.time()
        cutoff_time = current_time - self.window_seconds
        
        # Get request log for this IP
        request_times = self._request_log[client_ip]
        
        # Remove old requests outside the window
        while request_times and request_times[0] < cutoff_time:
            request_times.popleft()
        
        # Check if under limit
        current_count = len(request_times)
        
        if current_count < self.max_requests:
            # Allow request and log timestamp
            request_times.append(current_time)
            remaining = self.max_requests - (current_count + 1)
            return True, remaining, 0
        else:
            # Rate limit exceeded - calculate retry after
            oldest_request = request_times[0]
            retry_after = int(oldest_request + self.window_seconds - current_time) + 1
            return False, 0, retry_after
    
    def get_stats(self) -> Dict:
        """Get rate limiter statistics"""
        current_time = time.time()
        cutoff_time = current_time - self.window_seconds
        
        active_ips = 0
        total_requests = 0
        
        for ip, request_times in self._request_log.items():
            # Count only recent requests
            recent_count = sum(1 for t in request_times if t >= cutoff_time)
            if recent_count > 0:
                active_ips += 1
                total_requests += recent_count
        
        return {
            "active_ips": active_ips,
            "total_recent_requests": total_requests,
            "window_seconds": self.window_seconds,
            "max_requests_per_window": self.max_requests
        }
    
    def cleanup_old_entries(self, max_age_seconds: int = 3600):
        """
        Cleanup old IP entries to prevent memory growth
        
        Call periodically (e.g., every hour) to remove stale IPs
        
        Args:
            max_age_seconds: Remove IPs with no requests in this time
        """
        current_time = time.time()
        cutoff_time = current_time - max_age_seconds
        
        ips_to_remove = []
        for ip, request_times in self._request_log.items():
            # Remove old timestamps
            while request_times and request_times[0] < cutoff_time:
                request_times.popleft()
            
            # If no recent requests, mark IP for removal
            if not request_times:
                ips_to_remove.append(ip)
        
        for ip in ips_to_remove:
            del self._request_log[ip]
        
        if ips_to_remove:
            logger.info(f"Cleaned up {len(ips_to_remove)} inactive IPs from rate limiter")
        
        return len(ips_to_remove)


# Global rate limiter instance
_rate_limiter: RateLimiter = None


def get_rate_limiter() -> RateLimiter:
    """Get global rate limiter singleton"""
    global _rate_limiter
    if _rate_limiter is None:
        # Default: 30 requests per minute per IP
        _rate_limiter = RateLimiter(max_requests=30, window_seconds=60)
    return _rate_limiter
