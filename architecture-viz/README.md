# Architecture Visualizer

A 3D interactive force-directed graph that visualizes code repository structure and import dependencies.

## Features

- **3D Force-Directed Graph** — Files and folders as nodes, imports as connections
- **Interactive** — Scroll to zoom, drag to rotate/pan
- **Self-Visualizing** — The demo visualizes this tool's own architecture
- **Static Site** — Deploys to GitHub Pages, no backend needed

## Color Coding

- 🔵 Blue = Directories
- 🟢 Green = Files
- 🟠 Orange = Import dependencies
- ⚪ Gray = Directory containment

## Usage

```bash
# Install dependencies
npm install

# Generate graph data & build
npm run build

# Preview locally
npm run preview
```

## How It Works

1. `parser.ts` scans the target directory
2. Extracts file structure + ES6 imports/requires
3. Outputs `graph-data.json`
4. `main.ts` renders a 3D force simulation using Three.js

## Live Demo

[View on GitHub Pages](https://nicolai-austad.github.io/herold_workbench/architecture-viz/)

## Controls

- **Left click + drag**: Rotate the view
- **Right click + drag**: Pan
- **Scroll**: Zoom in/out

## Development

```bash
npm install
npm run dev
```

## License

MIT
