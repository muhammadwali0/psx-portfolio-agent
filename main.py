"""Application entry-point — run with: python main.py"""

from __future__ import annotations

import uvicorn

from app.config import get_settings
from app.main import create_app

app = create_app()

if __name__ == "__main__":
    cfg = get_settings()
    uvicorn.run(
        "main:app",
        host=cfg.host,
        port=cfg.port,
        reload=cfg.debug,
        log_level=cfg.log_level.lower(),
    )
