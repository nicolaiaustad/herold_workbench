# Herold Workbench

A kanban dashboard powered by GitHub Issues for tracking Herold's tasks.

## Features

- **GitHub Issues as tasks** - Each issue is a task
- **4 columns**: To Do → In Progress → Review → Done
- **Priority labels**: `priority:high`, `priority:medium`, `priority:low`
- **Status labels**: `status:inprogress`, `status:review`
- **Auto-refresh** - Updates every 60 seconds
- **API Cost Metrics** - Track agent performance and spending

## How to Use

### Creating Tasks
Click "+ New Issue" button or go to https://github.com/nicolaiaustad/herold_workbench/issues/new

### Moving Tasks Between Columns
Update issue labels:
- **To Do** - No status label (default)
- **In Progress** - Add label `status:inprogress`
- **Review** - Add label `status:review`
- **Done** - Close the issue

### Setting Priority
Add labels:
- `priority:high` (red)
- `priority:medium` (yellow) - default
- `priority:low` (green)

## API Cost Metrics

The dashboard displays agent performance metrics below the kanban board:

- **Total API Cost** - Accumulated spending
- **API Calls** - Total number of API requests
- **Tasks Completed** - Number of closed issues
- **Avg Cost/Task** - Efficiency metric
- **Cost by Model** - Breakdown by LLM provider

Metrics are loaded from `metrics.json` in the repo. Update this file to reflect current spending.

## GitHub Pages

Dashboard auto-deploys from `main` branch to:
https://nicolaiaustad.github.io/herold_workbench/

## License

MIT
