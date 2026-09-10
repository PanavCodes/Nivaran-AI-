"""In-memory rate limiting dependency for FastAPI endpoints.

Protects sensitive endpoints (e.g. complaint submission and AI chat) against
spam and denial of service while allowing normal evaluation and testing.
"""
from __future__ import annotations

import time
from collections import defaultdict
from threading import Lock
from typing import Callable

from fastapi import HTTPException, Request, status
from loguru import logger


class RateLimiter:
    """Sliding-window in-memory rate limiter dependency.

    Usage:
        @router.post("/chat", dependencies=[Depends(RateLimiter(limit=20, window_seconds=60))])
    """

    def __init__(self, limit: int = 10, window_seconds: int = 60, key_prefix: str = ""):
        self.limit = limit
        self.window_seconds = window_seconds
        self.key_prefix = key_prefix
        # Mapping: client_identifier -> list of epoch timestamps
        self._history: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def _get_client_key(self, request: Request) -> str:
        # Check for forwarded header (proxies/reverse proxies)
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
        elif request.client and request.client.host:
            ip = request.client.host
        else:
            ip = "unknown-client"

        # If user is authenticated, use user ID or token if present
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            # Use token prefix as part of client key
            token_fingerprint = auth_header[-16:]
            return f"{self.key_prefix}:{ip}:{token_fingerprint}"

        return f"{self.key_prefix}:{ip}"

    def __call__(self, request: Request) -> None:
        client_key = self._get_client_key(request)
        now = time.time()
        cutoff = now - self.window_seconds

        with self._lock:
            # Purge timestamps outside the sliding window
            timestamps = [t for t in self._history[client_key] if t > cutoff]
            self._history[client_key] = timestamps

            if len(timestamps) >= self.limit:
                earliest = timestamps[0]
                retry_after = max(1, int(self.window_seconds - (now - earliest)))
                logger.warning(
                    f"Rate limit exceeded for {client_key}: {len(timestamps)}/{self.limit} in {self.window_seconds}s"
                )
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Too many requests. Please retry in {retry_after} second(s).",
                    headers={"Retry-After": str(retry_after)},
                )

            self._history[client_key].append(now)

    def reset(self) -> None:
        """Reset rate limiter state (useful for tests)."""
        with self._lock:
            self._history.clear()
