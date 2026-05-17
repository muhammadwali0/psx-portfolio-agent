"""
Structured logging setup using structlog + rich.
Call configure_logging() once at app startup.

In production (json_logs=True) log records are shaped for GCP Log Explorer:
  - "severity" instead of "level"
  - "message"  instead of "event"
  - uvicorn access logs are emitted as JSON with the same shape
"""
from __future__ import annotations

import logging
import logging.config
import sys
from typing import Any

import structlog


def _gcp_rename_keys(
    logger: Any, method: str, event_dict: dict[str, Any]
) -> dict[str, Any]:
    """
    Processor that renames structlog keys to match GCP Log Explorer expectations.
    Must run after add_log_level and before the final renderer.
    """
    # "level" → "severity"  (GCP uses this for log level filtering)
    if "level" in event_dict:
        event_dict["severity"] = event_dict.pop("level").upper()
    # "event" → "message"   (GCP uses this as the primary display field)
    if "event" in event_dict:
        event_dict["message"] = event_dict.pop("event")
    return event_dict


def _build_uvicorn_log_config(level: str) -> dict[str, Any]:
    """
    Return a logging.config dictConfig that makes uvicorn emit JSON lines
    shaped for GCP Log Explorer.  Used only when json_logs=True.
    """
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "gcp_json": {
                "()": "logging.Formatter",
                "fmt": (
                    '{"severity":"%(levelname)s","message":"%(message)s",'
                    '"logger":"%(name)s","time":"%(asctime)s"}'
                ),
                "datefmt": "%Y-%m-%dT%H:%M:%SZ",
            }
        },
        "handlers": {
            "stdout": {
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
                "formatter": "gcp_json",
            }
        },
        "loggers": {
            "uvicorn":        {"handlers": ["stdout"], "level": level, "propagate": False},
            "uvicorn.error":  {"handlers": ["stdout"], "level": level, "propagate": False},
            "uvicorn.access": {"handlers": ["stdout"], "level": level, "propagate": False},
        },
    }


def configure_logging(level: str = "INFO", json_logs: bool = False) -> None:
    """
    Configure structlog with either pretty (dev) or JSON (prod) rendering.

    Args:
        level:     Python logging level string e.g. "DEBUG", "INFO".
        json_logs: If True, emit newline-delimited JSON shaped for GCP Log Explorer.
    """
    shared_processors: list = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
    ]

    if json_logs:
        final_processors = shared_processors + [
            _gcp_rename_keys,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ]
        renderer = structlog.processors.JSONRenderer()
        logging.config.dictConfig(_build_uvicorn_log_config(level))
    else:
        final_processors = shared_processors + [
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ]
        renderer = structlog.dev.ConsoleRenderer(colors=True)

    structlog.configure(
        processors=final_processors,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        foreign_pre_chain=shared_processors,
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            renderer,
        ],
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    root_logger.setLevel(getattr(logging, level, logging.INFO))


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """Return a bound structlog logger for the given module name."""
    return structlog.get_logger(name)
