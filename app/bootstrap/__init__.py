"""Application startup bootstrap (SQLite ingest + Redis pre-compute)."""

from app.bootstrap.startup import run_bootstrap

__all__ = ["run_bootstrap"]
