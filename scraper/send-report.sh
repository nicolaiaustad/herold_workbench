#!/bin/bash
# Send news findings to Slack via Herold
# This script should be run by Herold after the scraper completes

REPORT_FILE="/data/.openclaw/workspace/herold_workbench/scraper/report_$(date +%Y%m%d).txt"

if [ -f "$REPORT_FILE" ]; then
    echo "Found report: $REPORT_FILE"
    echo "Herold will send this to Slack"
    cat "$REPORT_FILE"
else
    echo "No report found for today"
    exit 1
fi
