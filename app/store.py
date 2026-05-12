"""
In-memory Run Store
===================
Thread-safe (asyncio-safe) store for AgentRun objects.
In production, swap the backing store for Redis or Cloud Datastore.
"""

from __future__ import annotations

import threading
from collections import OrderedDict

from app.models import AgentRun


class RunStore:
    """
    Simple LRU-bounded in-memory store for AgentRun objects.
    Singleton — use RunStore.instance().
    """

    _MAX_SIZE = 200
    _instance: "RunStore | None" = None
    _lock = threading.Lock()

    def __init__(self) -> None:
        self._runs: OrderedDict[str, AgentRun] = OrderedDict()

    @classmethod
    def instance(cls) -> "RunStore":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def save(self, run: AgentRun) -> None:
        with self._lock:
            if run.run_id in self._runs:
                self._runs.move_to_end(run.run_id)
            self._runs[run.run_id] = run
            if len(self._runs) > self._MAX_SIZE:
                self._runs.popitem(last=False)  # evict oldest

    def get(self, run_id: str) -> AgentRun | None:
        return self._runs.get(run_id)

    def list_recent(self, limit: int = 10) -> list[AgentRun]:
        with self._lock:
            items = list(self._runs.values())
        return list(reversed(items))[:limit]

    def clear(self) -> None:
        with self._lock:
            self._runs.clear()
