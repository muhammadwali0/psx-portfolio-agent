"""CLI entrypoint for the nightly PSX historical download Cloud Run Job."""

from __future__ import annotations

import sys

from app.historical.download import DailyDownloadService
from app.logger import configure_logging, get_logger

logger = get_logger(__name__)


def main() -> int:
    configure_logging()
    logger.info("historical.job.start")
    results = DailyDownloadService().run()
    for r in results:
        logger.info(
            "historical.job.day",
            date=r.trade_date.isoformat(),
            downloaded=r.downloaded,
            rows=r.rows,
        )
    logger.info("historical.job.done", days=len(results))
    return 0


if __name__ == "__main__":
    sys.exit(main())
