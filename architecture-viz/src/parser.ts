import * as fs from 'fs';
import * as path from 'path';

interface Node {
  id: string;
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
}

interface Link {
  source: string;
  target: string;
  type: 'import' | 'export' | 'contains';
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.vscode', '.idea', 'architecture-viz', 'venv', '__pycache__']);
const IGNORED_FILES = new Set(['.DS_Store', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']);
const JS_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);

function isCodeFile(filename: string): boolean {
  const ext = path.extname(filename);
  return JS_EXTENSIONS.has(ext);
}

function parseImports(content: string, filePath: string): string[] {
  const imports: string[] = [];
  const dir = path.dirname(filePath);

  const importRegex = /import\s+(?:(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\)/g;
  
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1] || match[2];
    if (!importPath) continue;

    if (importPath.startsWith('.')) {
      const resolved = path.resolve(dir, importPath);
      const possiblePaths = [
        resolved,
        resolved + '.js',
        resolved + '.ts',
        resolved + '.tsx',
        resolved + '/index.js',
        resolved + '/index.ts',
        resolved + '/index.tsx',
      ];
      
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          imports.push(p);
          break;
        }
      }
    }
  }

  return imports;
}

function scanDirectory(dirPath: string, rootPath: string, graph: GraphData, parentId?: string): void {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue;
    if (!entry.isDirectory() && IGNORED_FILES.has(entry.name)) continue;

    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(rootPath, fullPath);
    const id = relativePath || entry.name;

    if (entry.isDirectory()) {
      graph.nodes.push({
        id,
        name: entry.name,
        type: 'directory',
        path: relativePath,
      });

      if (parentId) {
        graph.links.push({
          source: parentId,
          target: id,
          type: 'contains',
        });
      }

      scanDirectory(fullPath, rootPath, graph, id);
    } else {
      const stats = fs.statSync(fullPath);
      const isCode = isCodeFile(entry.name);

      graph.nodes.push({
        id,
        name: entry.name,
        type: 'file',
        path: relativePath,
        size: stats.size,
      });

      if (parentId) {
        graph.links.push({
          source: parentId,
          target: id,
          type: 'contains',
        });
      }

      if (isCode) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const imports = parseImports(content, fullPath);
          
          for (const importPath of imports) {
            const importRelative = path.relative(rootPath, importPath);
            if (importRelative !== id) {
              graph.links.push({
                source: id,
                target: importRelative,
                type: 'import',
              });
            }
          }
        } catch (e) {
          // Skip files that can't be read
        }
      }
    }
  }
}

function generateGraph(rootPath: string): GraphData {
  const graph: GraphData = { nodes: [], links: [] };
  
  graph.nodes.push({
    id: '.',
    name: path.basename(rootPath) || 'root',
    type: 'directory',
    path: '.',
  });

  scanDirectory(rootPath, rootPath, graph, '.');
  return graph;
}

const targetDir = process.argv[2] || '.';
const outputFile = process.argv[3] || 'graph-data.json';

const absolutePath = path.resolve(targetDir);
console.log(`Scanning ${absolutePath}...`);

const graph = generateGraph(absolutePath);

fs.writeFileSync(outputFile, JSON.stringify(graph, null, 2));

console.log(`Generated graph with ${graph.nodes.length} nodes and ${graph.links.length} links`);
console.log(`Saved to ${outputFile}`);
