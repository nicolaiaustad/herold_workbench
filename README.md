# Herold Workbench

A kanban dashboard powered by GitHub Issues for tracking Herold's tasks.

## Features

- **GitHub Issues as tasks** - Each issue is a task
- **4 columns**: To Do → In Progress → Review → Done
- **Priority labels**: `priority:high`, `priority:medium`, `priority:low`
- **Status labels**: `status:inprogress`, `status:review`
- **Smart polling** - 10s refresh during work hours (8am-10pm), hourly overnight
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

### How Cost Tracking Works

Herold automatically tracks costs using `track-cost.js`. After completing work, the agent runs:

```bash
node track-cost.js --task "Description of work done" --model "moonshot/kimi-k2.5"
```

This updates `metrics.json` with estimated costs based on token usage:
- **moonshot/kimi-k2.5**: ~$0.005 per task
- **openai/gpt-4o**: ~$0.02 per task
- **openai/gpt-4o-mini**: ~$0.0005 per task

The script auto-commits changes to GitHub, so metrics appear on the dashboard within minutes.

## GitHub Pages

Dashboard auto-deploys from `main` branch to:
https://nicolaiaustad.github.io/herold_workbench/

## License

MIT
