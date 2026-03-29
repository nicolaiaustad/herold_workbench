#!/bin/bash
# Open Herold Dashboard in default browser

DASHBOARD_PATH="/data/.openclaw/workspace/dashboard/index.html"

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open "$DASHBOARD_PATH"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    xdg-open "$DASHBOARD_PATH" 2>/dev/null || firefox "$DASHBOARD_PATH" 2>/dev/null || echo "Please open: file://$DASHBOARD_PATH"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows
    start "$DASHBOARD_PATH"
else
    echo "Dashboard location: file://$DASHBOARD_PATH"
fi
