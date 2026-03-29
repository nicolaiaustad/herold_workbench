# Herold Dashboard

Live status dashboard showing projects, integrations, automations, and blockers.

## Quick Start

**Open the dashboard:**
```bash
~/herold-dashboard
# or
/data/.openclaw/workspace/dashboard/open-dashboard.sh
# or
open file:///data/.openclaw/workspace/dashboard/index.html
```

## What You'll See

- **Session Status** — Uptime, last active time, systems ready
- **Active Projects** — The Realm and other projects
- **Automation** — Cron jobs, monitoring frequency
- **Integrations** — Telegram, Todoist, GitHub, HackerNews, Reddit, X
- **Monitoring Stack** — Active sources and destinations
- **Open Blockers** — GitHub token, Reddit API, Twilio setup
- **Decisions Pending** — Agent workforce config, Realm slogan, Twilio use case
- **Memory Files** — Links to daily logs and project files

## Auto-Update

The dashboard displays live time (auto-updates every second). Refresh the page to see latest data.

## File Structure

```
dashboard/
├── index.html           (main dashboard)
├── open-dashboard.sh    (launcher script)
└── README.md           (this file)
```

## Deployment to GitHub

To push to `herold_workbench` repo:

```bash
cd /data/.openclaw/workspace
git init
git add dashboard/
git commit -m "Add Herold dashboard"
git remote add origin https://github.com/nicolaiaustad/herold_workbench.git
git push -u origin main
```

(Once GitHub token is valid)
