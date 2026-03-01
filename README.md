# Herold Dashboard

A dashboard for monitoring and managing AI agent operations.

## Features

- **Kanban Board** - Drag-and-drop task management
- Agent status monitoring
- Task queue visualization
- Performance metrics
- System health checks

## Quick Start

```bash
# Run with Python
python3 -m http.server 8080

# Or with Node
npx serve -p 8080
```

Then open http://localhost:8080

## Kanban Usage

- **Add task**: Click "+ New Task"
- **Move task**: Drag between columns
- **Delete task**: Click × on task
- **Priorities**: High/Medium/Low

Tasks persist in browser localStorage.

## Development Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

## License

MIT
