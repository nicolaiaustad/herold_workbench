# Herold Workbench

A kanban dashboard powered by GitHub Issues for tracking Herold's tasks.

## Features

- **GitHub Issues as tasks** - Each issue is a task
- **4 columns**: To Do → In Progress → Review → Done
- **Priority labels**: `priority:high`, `priority:medium`, `priority:low`
- **Status labels**: `status:inprogress`, `status:review`
- **Auto-refresh** - Updates every 60 seconds

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

## GitHub Pages

Dashboard auto-deploys from `main` branch to:
https://nicolaiaustad.github.io/herold_workbench/

## License

MIT
