import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import graphData from './graph-data.json';

interface Node {
  id: string;
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
}

interface Link {
  source: string | Node;
  target: string | Node;
  type: 'import' | 'export' | 'contains';
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

const data = graphData as GraphData;

const nodeMap = new Map<string, Node>();
data.nodes.forEach(n => nodeMap.set(n.id, n));

data.links.forEach(l => {
  if (typeof l.source === 'string') l.source = nodeMap.get(l.source)!;
  if (typeof l.target === 'string') l.target = nodeMap.get(l.target)!;
});

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 50);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('canvas-container')!.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

const fileMaterial = new THREE.MeshBasicMaterial({ color: 0x4ade80 });
const dirMaterial = new THREE.MeshBasicMaterial({ color: 0x60a5fa });

const nodesGroup = new THREE.Group();
const nodeMeshes = new Map<string, THREE.Mesh>();
const labelSprites = new Map<string, THREE.Sprite>();

function createLabelSprite(text: string, isDir: boolean): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const fontSize = 24;
  ctx.font = `${isDir ? 'bold' : 'normal'} ${fontSize}px system-ui, sans-serif`;
  
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  
  canvas.width = textWidth + 20;
  canvas.height = fontSize + 10;
  
  ctx.font = `${isDir ? 'bold' : 'normal'} ${fontSize}px system-ui, sans-serif`;
  ctx.fillStyle = isDir ? '#60a5fa' : '#4ade80';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(canvas.width / 30, canvas.height / 30, 1);
  
  return sprite;
}

data.nodes.forEach(node => {
  const isDir = node.type === 'directory';
  const size = isDir ? 1.5 + (node.size || 0) * 0.001 : 0.8;
  
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(size, 16, 16),
    isDir ? dirMaterial : fileMaterial
  );
  
  mesh.position.set(
    (Math.random() - 0.5) * 40,
    (Math.random() - 0.5) * 40,
    (Math.random() - 0.5) * 40
  );
  
  node.x = mesh.position.x;
  node.y = mesh.position.y;
  node.z = mesh.position.z;
  node.vx = 0;
  node.vy = 0;
  node.vz = 0;
  
  mesh.userData = { node };
  nodesGroup.add(mesh);
  nodeMeshes.set(node.id, mesh);
  
  const label = createLabelSprite(node.name, isDir);
  label.position.set(node.x!, node.y! + size + 0.8, node.z!);
  nodesGroup.add(label);
  labelSprites.set(node.id, label);
});

scene.add(nodesGroup);

const lineMaterial = new THREE.LineBasicMaterial({ 
  color: 0x555555, 
  transparent: true, 
  opacity: 0.4 
});

const importMaterial = new THREE.LineBasicMaterial({ 
  color: 0xf59e0b, 
  transparent: true, 
  opacity: 0.6 
});

const linesGroup = new THREE.Group();

const containerLines: THREE.Line[] = [];
const importLines: THREE.Line[] = [];

data.links.forEach(link => {
  const source = link.source as Node;
  const target = link.target as Node;
  
  if (!source || !target) return;
  
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(6);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
  const line = new THREE.Line(
    geometry, 
    link.type === 'import' ? importMaterial : lineMaterial
  );
  
  linesGroup.add(line);
  
  if (link.type === 'import') {
    importLines.push(line);
  } else {
    containerLines.push(line);
  }
});

scene.add(linesGroup);

function updateLines() {
  let containerIdx = 0;
  let importIdx = 0;
  
  data.links.forEach(link => {
    const source = link.source as Node;
    const target = link.target as Node;
    
    if (!source || !target) return;
    
    const line = link.type === 'import' ? importLines[importIdx++] : containerLines[containerIdx++];
    if (!line) return;
    
    const positions = line.geometry.attributes.position.array as Float32Array;
    positions[0] = source.x!;
    positions[1] = source.y!;
    positions[2] = source.z!;
    positions[3] = target.x!;
    positions[4] = target.y!;
    positions[5] = target.z!;
    line.geometry.attributes.position.needsUpdate = true;
  });
}

const repulsionStrength = 100;
const attractionStrength = 0.01;
const centerStrength = 0.05;
const damping = 0.9;
const maxVelocity = 2;

function applyForces() {
  const nodes = data.nodes;
  
  for (let i = 0; i < nodes.length; i++) {
    const nodeA = nodes[i];
    
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeB = nodes[j];
      
      const dx = nodeB.x! - nodeA.x!;
      const dy = nodeB.y! - nodeA.y!;
      const dz = nodeB.z! - nodeA.z!;
      const distSq = dx * dx + dy * dy + dz * dz + 0.1;
      const dist = Math.sqrt(distSq);
      
      const force = repulsionStrength / distSq;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      const fz = (dz / dist) * force;
      
      nodeA.vx! -= fx;
      nodeA.vy! -= fy;
      nodeA.vz! -= fz;
      nodeB.vx! += fx;
      nodeB.vy! += fy;
      nodeB.vz! += fz;
    }
  }
  
  data.links.forEach(link => {
    const source = link.source as Node;
    const target = link.target as Node;
    
    if (!source || !target) return;
    
    const dx = target.x! - source.x!;
    const dy = target.y! - source.y!;
    const dz = target.z! - source.z!;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.1;
    
    const targetDist = link.type === 'contains' ? 5 : 8;
    const force = (dist - targetDist) * attractionStrength;
    
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    const fz = (dz / dist) * force;
    
    source.vx! += fx;
    source.vy! += fy;
    source.vz! += fz;
    target.vx! -= fx;
    target.vy! -= fy;
    target.vz! -= fz;
  });
  
  nodes.forEach(node => {
    node.vx! -= node.x! * centerStrength * 0.01;
    node.vy! -= node.y! * centerStrength * 0.01;
    node.vz! -= node.z! * centerStrength * 0.01;
    
    const v = Math.sqrt(node.vx! ** 2 + node.vy! ** 2 + node.vz! ** 2);
    if (v > maxVelocity) {
      node.vx! = (node.vx! / v) * maxVelocity;
      node.vy! = (node.vy! / v) * maxVelocity;
      node.vz! = (node.vz! / v) * maxVelocity;
    }
    
    node.vx! *= damping;
    node.vy! *= damping;
    node.vz! *= damping;
    
    node.x! += node.vx!;
    node.y! += node.vy!;
    node.z! += node.vz!;
    
    const mesh = nodeMeshes.get(node.id);
    if (mesh) {
      mesh.position.set(node.x!, node.y!, node.z!);
    }
    
    const label = labelSprites.get(node.id);
    if (label) {
      const isDir = node.type === 'directory';
      const size = isDir ? 1.5 + (node.size || 0) * 0.001 : 0.8;
      label.position.set(node.x!, node.y! + size + 0.8, node.z!);
    }
  });
}

document.getElementById('node-count')!.textContent = `${data.nodes.length} nodes, ${data.links.length} links`;

let isActive = true;
function animate() {
  requestAnimationFrame(animate);
  
  if (isActive) {
    for (let i = 0; i < 3; i++) {
      applyForces();
    }
    updateLines();
  }
  
  controls.update();
  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

document.addEventListener('visibilitychange', () => {
  isActive = !document.hidden;
});
