#!/bin/bash
# Setup script for news scraper cron job
# Run this to install dependencies and configure the cron job

echo "Setting up Central Norway News Scraper..."

SCRAPER_DIR="/data/.openclaw/workspace/herold_workbench/scraper"
VENV_PYTHON="$SCRAPER_DIR/venv/bin/python3"

# Create virtual environment if it doesn't exist
if [ ! -d "$SCRAPER_DIR/venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv "$SCRAPER_DIR/venv"
fi

# Install Python dependencies
echo "Installing dependencies..."
"$SCRAPER_DIR/venv/bin/pip" install -r "$SCRAPER_DIR/requirements.txt"

# Create log directory
mkdir -p "$SCRAPER_DIR/logs"

# Add cron job to run daily at 10 AM
CRON_JOB="0 10 * * * cd $SCRAPER_DIR && $VENV_PYTHON news_scraper.py >> logs/scraper.log 2>&1"

# Check if already exists
if crontab -l 2>/dev/null | grep -q "news_scraper.py"; then
    echo "Cron job already exists"
else
    # Add new cron job
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✅ Cron job added: Daily at 10 AM"
fi

echo ""
echo "Setup complete!"
echo "To test manually: python3 /data/.openclaw/workspace/herold_workbench/scraper/news_scraper.py"
echo ""
echo "Set SLACK_WEBHOOK_URL environment variable to enable Slack notifications:"
echo "  export SLACK_WEBHOOK_URL='https://hooks.slack.com/services/...'"
