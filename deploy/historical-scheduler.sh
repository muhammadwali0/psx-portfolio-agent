#!/usr/bin/env bash
# Create Cloud Scheduler trigger: 4:30pm PKT Mon–Fri → Cloud Run Job execution.
# PKT = UTC+5 → 11:30 UTC
#
# Usage:
#   export PROJECT_ID=your-project REGION=us-central1 JOB_NAME=psx-historical-download
#   ./deploy/historical-scheduler.sh

set -euo pipefail

PROJECT_ID="${PROJECT_ID:?set PROJECT_ID}"
REGION="${REGION:-us-central1}"
JOB_NAME="${JOB_NAME:-psx-historical-download}"
SCHEDULER_NAME="${SCHEDULER_NAME:-psx-historical-nightly}"

# Mon–Fri at 11:30 UTC
CRON="30 11 * * 1-5"

gcloud scheduler jobs create http "${SCHEDULER_NAME}" \
  --project="${PROJECT_ID}" \
  --location="${REGION}" \
  --schedule="${CRON}" \
  --time-zone="UTC" \
  --uri="https://${REGION}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${PROJECT_ID}/jobs/${JOB_NAME}:run" \
  --http-method=POST \
  --oauth-service-account-email="${SCHEDULER_SA:?set SCHEDULER_SA}" \
  --description="PSX daily download after market close (4:30pm PKT)"

echo "Scheduler ${SCHEDULER_NAME} created: ${CRON} UTC (4:30pm PKT weekdays)"
