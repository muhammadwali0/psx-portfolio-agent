import asyncio
import os
from typing import AsyncGenerator, Dict, List
from app.logger import get_logger

logger = get_logger(__name__)

class ProgressManager:
    """Manages SSE progress streams. Uses Redis Pub/Sub if REDIS_URL is configured, otherwise local queues."""
    _instance = None
    _lock = asyncio.Lock()

    def __init__(self, redis_url: str | None = None) -> None:
        self.redis_url = redis_url
        if redis_url:
            import redis.asyncio as aioredis
            self._aior = aioredis.from_url(redis_url, decode_responses=True)
            logger.info("progress.redis_connected", url=redis_url)
        else:
            self._queues: Dict[str, List[asyncio.Queue]] = {}
            self._queue_lock = asyncio.Lock()

    @classmethod
    def get_instance(cls) -> "ProgressManager":
        if cls._instance is None:
            # Note: initialization is synchronous but thread-safe for FastAPIs lifespan context
            url = os.environ.get("REDIS_URL", "")
            cls._instance = cls(redis_url=url if url else None)
        return cls._instance

    async def publish(self, run_id: str, message: str) -> None:
        """Publish a progress message to all subscribers for a given run ID."""
        logger.info("progress.publish", run_id=run_id, message=message)
        if self.redis_url:
            try:
                await self._aior.publish(f"progress:{run_id}", message)
            except Exception as exc:
                logger.warning("progress.redis_publish_failed", error=str(exc))
        else:
            async with self._queue_lock:
                if run_id in self._queues:
                    for q in self._queues[run_id]:
                        await q.put(message)

    async def subscribe(self, run_id: str) -> AsyncGenerator[str, None]:
        """Subscribe to progress updates for a run ID."""
        if self.redis_url:
            pubsub = self._aior.pubsub()
            await pubsub.subscribe(f"progress:{run_id}")
            try:
                async for message in pubsub.listen():
                    if message["type"] == "message":
                        yield message["data"]
            except asyncio.CancelledError:
                pass
            finally:
                await pubsub.unsubscribe(f"progress:{run_id}")
                await pubsub.close()
        else:
            q = asyncio.Queue()
            async with self._queue_lock:
                if run_id not in self._queues:
                    self._queues[run_id] = []
                self._queues[run_id].append(q)
            try:
                while True:
                    yield await q.get()
            except asyncio.CancelledError:
                pass
            finally:
                async with self._queue_lock:
                    if run_id in self._queues:
                        self._queues[run_id].remove(q)
                        if not self._queues[run_id]:
                            del self._queues[run_id]
