"""
Run Store
=========
Thread-safe store for AgentRun objects.

If REDIS_URL is set in the environment the store uses Redis with JSON
serialisation and a 24-hour TTL.  Otherwise it falls back to the
original in-memory LRU OrderedDict (safe for single-instance local dev).

The public interface is identical in both modes:
    save(run)          → None
    get(run_id)        → AgentRun | None
    list_recent(limit) → list[AgentRun]
    clear()            → None
"""
from __future__ import annotations

import json
import os
import threading
from collections import OrderedDict

from app.logger import get_logger
from app.models import AgentRun

logger = get_logger(__name__)

_REDIS_TTL = 86_400        # 24 hours
_LIST_KEY  = "psx:runs"    # Redis sorted-set key for ordered run IDs
_RUN_PREFIX = "psx:run:"   # prefix for individual run hashes


# ─── Redis-backed store ───────────────────────────────────────────────────────

class _RedisStore:
    def __init__(self, url: str) -> None:
        import redis
        self._r = redis.from_url(url, decode_responses=True)
        logger.info("store.redis_connected", url=url)

    def save(self, run: AgentRun) -> None:
        key = _RUN_PREFIX + run.run_id
        payload = run.model_dump_json()
        pipe = self._r.pipeline()
        pipe.set(key, payload, ex=_REDIS_TTL)
        pipe.zadd(_LIST_KEY, {run.run_id: self._r.time()[0]})
        pipe.expire(_LIST_KEY, _REDIS_TTL)
        pipe.execute()

    def get(self, run_id: str) -> AgentRun | None:
        raw = self._r.get(_RUN_PREFIX + run_id)
        if not raw:
            return None
        try:
            return AgentRun.model_validate_json(raw)
        except Exception as exc:
            logger.warning("store.redis_deserialise_failed", run_id=run_id, error=str(exc))
            return None

    def list_recent(self, limit: int = 10) -> list[AgentRun]:
        ids = self._r.zrevrange(_LIST_KEY, 0, limit - 1)
        runs: list[AgentRun] = []
        for run_id in ids:
            run = self.get(run_id)
            if run:
                runs.append(run)
        return runs

    def clear(self) -> None:
        ids = self._r.zrange(_LIST_KEY, 0, -1)
        if ids:
            self._r.delete(*[_RUN_PREFIX + i for i in ids])
        self._r.delete(_LIST_KEY)


# ─── In-memory store (original implementation) ────────────────────────────────

class _MemoryStore:
    _MAX_SIZE = 200

    def __init__(self) -> None:
        self._runs: OrderedDict[str, AgentRun] = OrderedDict()
        self._lock = threading.Lock()

    def save(self, run: AgentRun) -> None:
        with self._lock:
            if run.run_id in self._runs:
                self._runs.move_to_end(run.run_id)
            self._runs[run.run_id] = run
            if len(self._runs) > self._MAX_SIZE:
                self._runs.popitem(last=False)

    def get(self, run_id: str) -> AgentRun | None:
        return self._runs.get(run_id)

    def list_recent(self, limit: int = 10) -> list[AgentRun]:
        with self._lock:
            items = list(self._runs.values())
        return list(reversed(items))[:limit]

    def clear(self) -> None:
        with self._lock:
            self._runs.clear()


# ─── Public singleton facade ──────────────────────────────────────────────────

class RunStore:
    """
    Public interface.  Call RunStore.instance() to get the singleton.
    Delegates all operations to either _RedisStore or _MemoryStore
    depending on whether REDIS_URL is set.
    """
    _instance: "RunStore | None" = None
    _lock = threading.Lock()

    def __init__(self) -> None:
        url = os.environ.get("REDIS_URL", "")
        if url:
            self._backend: _RedisStore | _MemoryStore = _RedisStore(url)
        else:
            self._backend = _MemoryStore()

    @classmethod
    def instance(cls) -> "RunStore":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def save(self, run: AgentRun) -> None:
        self._backend.save(run)

    def get(self, run_id: str) -> AgentRun | None:
        return self._backend.get(run_id)

    def list_recent(self, limit: int = 10) -> list[AgentRun]:
        return self._backend.list_recent(limit)

    def clear(self) -> None:
        self._backend.clear()
