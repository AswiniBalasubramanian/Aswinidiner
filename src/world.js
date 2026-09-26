import * as THREE from 'three';
import {
  brickTexture, plasterTexture, tileFloorTexture, woodTexture, stoneTexture,
  groundTexture, roofTileTexture, labelTexture,
} from './textures.js';

// Layout (metres). Restaurant faces +z; camera sits in front-right.
export const LAYOUT = {
  stools: [
    { x: -3.0, z: -0.25, name: '배나라' },
    { x: -1.7, z: -0.25, name: '홍화연' },
    { x: -0.4, z: -0.25, name: '배유람' },
    { x: 0.9, z: -0.25, name: '오민애' },
  ],
  counterZ: -1.15,
  chefHome: new THREE.Vector3(-1.4, 0, -2.2),
  stove: new THREE.Vector3(-2.6, 0, -2.4),
  pass: new THREE.Vector3(2.35, 0, -1.15),
  serverHome: new THREE.Vector3(2.6, 0, 0.6),
  door: new THREE.Vector3(6.2, 0, 2.9),
  queue: [new THREE.Vector3(6.2, 0, 3.0), new THREE.Vector3(7.2, 0, 3.7), new THREE.Vector3(8.2, 0, 4.4), new THREE.Vector3(9.2, 0, 5.0), new THREE.Vector3(10.2, 0, 5.6)],
  exit: new THREE.Vector3(11.5, 0, 6),
};

const M = {};
function mats() {
  M.brick = new THREE.MeshStandardMaterial({ map: brickTexture([2, 1.2]), roughness: 0.95 });
  M.plaster = new THREE.MeshStandardMaterial({ map: plasterTexture([1, 1]), roughness: 0.9 });
  M.tile = new THREE.MeshStandardMaterial({ map: tileFloorTexture([4, 2.5]), roughness: 0.75 });
  M.wood = new THREE.MeshStandardMaterial({ map: woodTexture([1, 1]), roughness: 0.6 });
  M.woodDark = new THREE.MeshStandardMaterial({ map: woodTexture([1, 1], '#4b2e1a', '#2f1a0d'), roughness: 0.55 });
  M.woodLight = new THREE.MeshStandardMaterial({ map: woodTexture([1, 1], '#b27a4a', '#8b5a30'), roughness: 0.5 });
  M.stone = new THREE.MeshStandardMaterial({ map: stoneTexture([3, 3]), roughness: 0.95 });
  M.ground = new THREE.MeshStandardMaterial({ map: groundTexture([12, 12]), roughness: 1 });
  M.roof = new THREE.MeshStandardMaterial({ map: roofTileTexture([4, 4]), color: '#7d848c', roughness: 0.8 });
  M.roofTile = new THREE.MeshStandardMaterial({ color: '#5f666e', roughness: 0.62, metalness: 0.02 });
  M.roofCap = new THREE.MeshStandardMaterial({ color: '#9aa0a6', roughness: 0.6 });
  M.black = new THREE.MeshStandardMaterial({ color: '#1e1b18', roughness: 0.7 });
  M.metal = new THREE.MeshStandardMaterial({ color: '#b8bcc0', roughness: 0.35, metalness: 0.8 });
  M.steel = new THREE.MeshStandardMaterial({ color: '#d5d8db', roughness: 0.3, metalness: 0.9 });
  M.ceramic = new THREE.MeshStandardMaterial({ color: '#efe9de', roughness: 0.4 });
  M.ceramicBlue = new THREE.MeshStandardMaterial({ color: '#8fa7b8', roughness: 0.4 });
  M.clay = new THREE.MeshStandardMaterial({ color: '#4a3126', roughness: 0.85 });
  M.leaf = new THREE.MeshStandardMaterial({ color: '#4f7a3a', roughness: 0.8 });
  M.leafLight = new THREE.MeshStandardMaterial({ color: '#7aa356', roughness: 0.8 });
  M.soil = new THREE.MeshStandardMaterial({ color: '#3c2c22', roughness: 1 });
  M.paper = new THREE.MeshStandardMaterial({ color: '#efe3cc', roughness: 0.9, side: THREE.DoubleSide });
  M.glass = new THREE.MeshPhysicalMaterial({ color: '#dfe6e8', roughness: 0.1, transmission: 0.6, thickness: 0.05, transparent: true, opacity: 0.85 });
  M.red = new THREE.MeshStandardMaterial({ color: '#a23a2a', roughness: 0.6 });
  M.copper = new THREE.MeshStandardMaterial({ color: '#b5673a', roughness: 0.35, metalness: 0.7 });
  M.warmLamp = new THREE.MeshStandardMaterial({ color: '#f6e7c8', emissive: '#ffcf8a', emissiveIntensity: 1.6 });
  M.lampShade = new THREE.MeshStandardMaterial({ color: '#2b2622', roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide });
}

function box(w, h, d, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  (parent || root).add(m);
  return m;
}
function cyl(rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 24, parent) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  (parent || root).add(m);
  return m;
}
function sphere(r, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  (parent || root).add(m);
  return m;
}

let root;
let signMesh;
let boardMesh;

// Lacquered name-board face: gold serif name, thin inset rule, small red seal.
function boardTexture(text) {
  const w = 1536, h = 384;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#2a1f19'); bg.addColorStop(0.5, '#1c1512'); bg.addColorStop(1, '#130e0c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  // Subtle lacquer grain
  ctx.globalAlpha = 0.06;
  for (let i = 0; i < 70; i++) {
    ctx.strokeStyle = i % 2 ? '#000' : '#6b4a33';
    ctx.beginPath();
    const y = Math.random() * h;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(w * 0.3, y + 6, w * 0.7, y - 6, w, y + 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Inset gold rule
  ctx.strokeStyle = '#b8914e';
  ctx.lineWidth = 3;
  ctx.strokeRect(34, 34, w - 68, h - 68);
  ctx.lineWidth = 1;
  ctx.strokeRect(46, 46, w - 92, h - 92);
  // Name in gold with a soft emboss
  const gold = ctx.createLinearGradient(0, h * 0.25, 0, h * 0.75);
  gold.addColorStop(0, '#f3dca2'); gold.addColorStop(0.5, '#d4ac5f'); gold.addColorStop(1, '#a37a3a');
  let size = 150;
  ctx.font = `700 ${size}px "Noto Serif KR", serif`;
  while (ctx.measureText(text).width > w - 360 && size > 60) { size -= 6; ctx.font = `700 ${size}px "Noto Serif KR", serif`; }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillText(text, w / 2 + 3, h / 2 + 6);
  ctx.fillStyle = gold;
  ctx.fillText(text, w / 2, h / 2 + 2);
  // Small diamond ornaments either side
  ctx.fillStyle = '#b8914e';
  for (const x of [110, w - 110]) {
    ctx.beginPath(); ctx.moveTo(x, h / 2 - 16); ctx.lineTo(x + 16, h / 2); ctx.lineTo(x, h / 2 + 16); ctx.lineTo(x - 16, h / 2); ctx.closePath(); ctx.fill();
  }
  // Red seal stamp, bottom right
  ctx.fillStyle = '#a8321f';
  ctx.fillRect(w - 190, h - 132, 64, 64);
  ctx.fillStyle = '#f1dcc0';
  ctx.font = '700 34px "Noto Serif KR", serif';
  ctx.fillText('食', w - 158, h - 98);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Hanging name board (hyeonpan) centred under the front eave.
function nameBoard() {
  const g = new THREE.Group();
  g.position.set(-0.6, 2.9, 4.36);
  const W = 2.5, H = 0.6;
  // Carved frame: four rails with slightly flared corners
  const frameM = new THREE.MeshStandardMaterial({ map: woodTexture([1, 1], '#5a3620', '#3a2213'), roughness: 0.45 });
  const t = 0.1;
  box(W + t * 2, t, 0.1, frameM, 0, H / 2 + t / 2, 0, g);
  box(W + t * 2, t, 0.1, frameM, 0, -H / 2 - t / 2, 0, g);
  box(t, H, 0.1, frameM, -W / 2 - t / 2, 0, 0, g);
  box(t, H, 0.1, frameM, W / 2 + t / 2, 0, 0, g);
  for (const [x, y] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const c = box(0.2, 0.2, 0.13, frameM, x * (W / 2 + t / 2), y * (H / 2 + t / 2), 0, g);
    c.rotation.z = Math.PI / 4;
  }
  // Top cap moulding
  box(W + 0.5, 0.06, 0.16, frameM, 0, H / 2 + t + 0.03, 0.01, g);
  // Face panel
  boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.1, emissive: '#ffffff', emissiveIntensity: 0.0 }));
  boardMesh.position.z = 0.03;
  g.add(boardMesh);
  // Backing
  box(W, H, 0.04, M.woodDark, 0, 0, -0.02, g);
  // Brass hanging rods up to the fascia
  for (const x of [-1.1, 1.1]) box(0.025, 0.42, 0.025, M.copper, x, H / 2 + t + 0.24, 0, g);
  // Two small gooseneck lamps above the board
  for (const x of [-0.9, 0.9]) {
    const arm = box(0.02, 0.02, 0.3, M.black, x, H / 2 + 0.28, 0.16, g);
    arm.castShadow = false;
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.08, 16, 1, true), M.lampShade);
    shade.position.set(x, H / 2 + 0.24, 0.32);
    shade.rotation.x = -0.6;
    g.add(shade);
    const bulb = sphere(0.025, M.warmLamp, x, H / 2 + 0.22, 0.33, g);
    bulb.castShadow = false;
    const l = new THREE.SpotLight('#ffcf94', 3, 3, 0.9, 0.5, 1.5);
    l.position.set(x, H / 2 + 0.22, 0.34);
    l.target.position.set(x * 0.6, -0.1, 0);
    g.add(l, l.target);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  boardMesh.castShadow = false;
  root.add(g);
}

// Wall sign text (the diner's name, set by the player).
export function setSignText(text) {
  if (boardMesh) {
    const prev = boardMesh.material.map;
    boardMesh.material.map = boardTexture(text);
    boardMesh.material.emissiveMap = boardMesh.material.map;
    boardMesh.material.emissiveIntensity = 0.12;
    boardMesh.material.needsUpdate = true;
    if (prev) prev.dispose();
  }
  if (!signMesh) return;
  const old = signMesh.material.map;
  signMesh.material.map = labelTexture(text, { w: 768, h: 192, fg: '#efe4cf', font: '700 80px "Noto Serif KR", serif' });
  signMesh.material.needsUpdate = true;
  if (old) old.dispose();
}

function roof() {
  const g = new THREE.Group();
  const halfW = 6.6, halfD = 4.4, eaveY = 3.35, ridgeY = 5.1, ridgeHalf = 3.2;
  // Hip roof built from 4 faces
  const geo = new THREE.BufferGeometry();
  const v = [
    // front face
    -halfW, eaveY, halfD,  halfW, eaveY, halfD,  ridgeHalf, ridgeY, 0,
    -halfW, eaveY, halfD,  ridgeHalf, ridgeY, 0,  -ridgeHalf, ridgeY, 0,
    // back face
    halfW, eaveY, -halfD,  -halfW, eaveY, -halfD,  -ridgeHalf, ridgeY, 0,
    halfW, eaveY, -halfD,  -ridgeHalf, ridgeY, 0,  ridgeHalf, ridgeY, 0,
    // right hip
    halfW, eaveY, halfD,  halfW, eaveY, -halfD,  ridgeHalf, ridgeY, 0,
    // left hip
    -halfW, eaveY, -halfD,  -halfW, eaveY, halfD,  -ridgeHalf, ridgeY, 0,
  ];
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  const uv = [];
  for (let i = 0; i < v.length; i += 3) uv.push(v[i] / 4, v[i + 2] / 4);
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  const base = new THREE.Mesh(geo, M.roof);
  base.castShadow = base.receiveShadow = true;
  g.add(base);

  // Tile ridges on front and back slopes (instanced half-cylinders)
  const slopeLen = Math.hypot(halfD, ridgeY - eaveY);
  const slopeAngle = Math.atan2(ridgeY - eaveY, halfD);
  const tileGeo = new THREE.CylinderGeometry(0.075, 0.075, slopeLen - 0.12, 8, 1, false, 0, Math.PI);
  tileGeo.rotateX(Math.PI / 2);
  const spacing = 0.2;
  const count = Math.floor((halfW * 2) / spacing);
  const front = new THREE.InstancedMesh(tileGeo, M.roofTile, count);
  const back = new THREE.InstancedMesh(tileGeo, M.roofTile, count);
  front.castShadow = back.castShadow = true;
  const mtx = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  for (let i = 0; i < count; i++) {
    const x = -halfW + spacing / 2 + i * spacing;
    const t = 0.5;
    const yf = eaveY + (ridgeY - eaveY) * t + 0.04;
    const zf = halfD - halfD * t;
    e.set(-slopeAngle, 0, 0);
    q.setFromEuler(e);
    mtx.compose(new THREE.Vector3(x, yf, zf), q, new THREE.Vector3(1, 1, 1));
    front.setMatrixAt(i, mtx);
    e.set(slopeAngle, 0, 0);
    q.setFromEuler(e);
    mtx.compose(new THREE.Vector3(x, yf, -zf), q, new THREE.Vector3(1, 1, 1));
    back.setMatrixAt(i, mtx);
  }
  g.add(front, back);

  // Eave end caps (round tile ends)
  const capGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.05, 14);
  capGeo.rotateX(Math.PI / 2);
  const capsF = new THREE.InstancedMesh(capGeo, M.roofCap, count);
  const capsB = new THREE.InstancedMesh(capGeo, M.roofCap, count);
  for (let i = 0; i < count; i++) {
    const x = -halfW + spacing / 2 + i * spacing;
    mtx.compose(new THREE.Vector3(x, eaveY + 0.09, halfD + 0.02), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
    capsF.setMatrixAt(i, mtx);
    mtx.compose(new THREE.Vector3(x, eaveY + 0.09, -halfD - 0.02), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
    capsB.setMatrixAt(i, mtx);
  }
  g.add(capsF, capsB);

  // Ridge beam
  box(ridgeHalf * 2 + 0.3, 0.2, 0.4, M.roofTile, 0, ridgeY + 0.06, 0, g);
  // Eave fascia boards
  box(halfW * 2, 0.16, 0.12, M.woodDark, 0, eaveY - 0.02, halfD + 0.04, g);
  box(halfW * 2, 0.16, 0.12, M.woodDark, 0, eaveY - 0.02, -halfD - 0.04, g);
  box(0.12, 0.16, halfD * 2, M.woodDark, halfW + 0.04, eaveY - 0.02, 0, g);
  box(0.12, 0.16, halfD * 2, M.woodDark, -halfW - 0.04, eaveY - 0.02, 0, g);
  // Rafters under eave
  for (let x = -halfW + 0.4; x < halfW; x += 0.8) {
    box(0.1, 0.12, 1.4, M.woodDark, x, eaveY - 0.12, halfD - 0.6, g);
  }
  return g;
}

function structure() {
  const H = 3.25;
  // Platform slab
  const slab = box(14, 0.32, 10.5, M.stone, 0, 0.16 - 0.32, 0.2);
  slab.receiveShadow = true;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12.6, 8.4), M.tile);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0.001, -0.2);
  floor.receiveShadow = true;
  root.add(floor);

  // Back wall (brick with plaster band)
  box(12.4, H, 0.3, M.brick, 0, H / 2, -4.3);
  box(12.4, 0.6, 0.34, M.plaster, 0, H - 0.3, -4.3);
  // Left wall (partial) + right wall with window
  box(0.3, H, 4.0, M.brick, -6.05, H / 2, -2.3);
  box(0.34, 0.6, 4.0, M.plaster, -6.05, H - 0.3, -2.3);
  box(0.3, H, 5.6, M.brick, 6.05, H / 2, -1.5);
  box(0.34, 0.6, 5.6, M.plaster, 6.05, H - 0.3, -1.5);
  // Window on right wall
  box(0.36, 1.2, 1.9, M.woodDark, 6.05, 1.95, 0.2);
  box(0.4, 1.02, 0.8, M.glass, 6.05, 1.95, -0.28);
  box(0.4, 1.02, 0.8, M.glass, 6.05, 1.95, 0.66);

  // Plaster columns (stone base + white)
  const cols = [[-6.1, 1.2], [6.1, 1.2], [3.3, 1.2], [-6.1, -4.3], [6.1, -4.3]];
  for (const [x, z] of cols) {
    box(0.5, 0.5, 0.5, M.stone, x, 0.25, z);
    box(0.42, H - 0.5, 0.42, M.plaster, x, 0.5 + (H - 0.5) / 2, z);
  }
  // Timber lintels
  box(12.6, 0.28, 0.28, M.woodDark, 0, H + 0.12, 1.2);
  box(0.28, 0.28, 5.6, M.woodDark, -6.1, H + 0.12, -1.5);
  box(0.28, 0.28, 5.6, M.woodDark, 6.1, H + 0.12, -1.5);
  // Ceiling (dark timber)
  const ceil = box(12.4, 0.1, 5.6, M.woodDark, 0, H + 0.3, -1.5);
  ceil.castShadow = false;
  for (let x = -5.5; x < 6; x += 1.1) box(0.12, 0.18, 5.4, M.woodDark, x, H + 0.2, -1.5);
}

function kitchen() {
  const H = 3.25;
  // Back counter
  box(7.6, 0.9, 0.7, M.woodDark, -1.4, 0.45, -3.75);
  box(7.7, 0.05, 0.76, M.wood, -1.4, 0.925, -3.75);
  // Stove
  box(1.1, 0.12, 0.6, M.black, LAYOUT.stove.x, 1.0, -3.7);
  for (const dx of [-0.28, 0.28]) cyl(0.16, 0.16, 0.03, M.metal, LAYOUT.stove.x + dx, 1.075, -3.7, 20);
  const pot = cyl(0.22, 0.2, 0.22, M.steel, LAYOUT.stove.x - 0.28, 1.18, -3.7, 20);
  pot.name = 'pot';
  cyl(0.24, 0.24, 0.03, M.steel, LAYOUT.stove.x - 0.28, 1.3, -3.7, 20);
  const pan = cyl(0.2, 0.17, 0.06, M.black, LAYOUT.stove.x + 0.28, 1.11, -3.7, 20);
  box(0.03, 0.03, 0.34, M.black, LAYOUT.stove.x + 0.28, 1.12, -3.35);
  pan.name = 'pan';
  // Fridge
  box(1.0, 1.9, 0.72, M.metal, 4.6, 0.95, -3.85);
  box(0.02, 1.2, 0.03, M.steel, 4.15, 0.95, -3.48);
  box(0.02, 0.5, 0.03, M.steel, 4.15, 1.75, -3.48);
  // Wall shelf with dishes
  box(7.8, 0.06, 0.45, M.wood, -1.4, 2.35, -4.05);
  box(7.8, 0.06, 0.45, M.wood, -1.4, 2.85, -4.05);
  let seed = 3;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let x = -5; x < 2.2; x += 0.5) {
    const r = 0.11 + rnd() * 0.07;
    const m = rnd() > 0.5 ? M.ceramic : M.ceramicBlue;
    cyl(r, r * 0.6, 0.12 + rnd() * 0.1, m, x, 2.45, -4.05, 16);
    cyl(r * 0.9, r * 0.7, 0.14, rnd() > 0.5 ? M.ceramic : M.clay, x + 0.2, 2.95, -4.05, 16);
  }
  // Hanging rail with pans
  box(3.2, 0.03, 0.03, M.black, -3.6, 2.15, -3.6);
  for (const dx of [-1.1, -0.4, 0.4, 1.1]) {
    const p = cyl(0.17, 0.17, 0.04, dx % 0.8 ? M.copper : M.black, -3.6 + dx, 1.8, -3.6, 18);
    p.rotation.x = Math.PI / 2;
    box(0.02, 0.35, 0.02, M.black, -3.6 + dx, 2.0, -3.6);
  }
  // Pinned notes on wall
  for (let i = 0; i < 6; i++) {
    const n = box(0.24, 0.3, 0.01, M.paper, 0.9 + (i % 3) * 0.32, 1.65 + Math.floor(i / 3) * 0.4, -4.14);
    n.rotation.z = (i % 2 ? 1 : -1) * 0.06;
  }
  // Spice jars on back counter
  for (let i = 0; i < 7; i++) cyl(0.05, 0.05, 0.14 + (i % 3) * 0.04, i % 2 ? M.ceramicBlue : M.clay, 1.5 + i * 0.16, 1.02, -3.7, 12);
  // Rice cooker + kettle
  cyl(0.2, 0.18, 0.28, M.ceramic, 0.4, 1.09, -3.75, 20);
  cyl(0.14, 0.12, 0.22, M.steel, 2.9, 1.06, -3.75, 20);
  // Plant on kitchen windowsill
  const pot2 = cyl(0.14, 0.11, 0.24, M.clay, -5.3, 1.07, -3.7, 14);
  for (let i = 0; i < 7; i++) sphere(0.1 + Math.random() * 0.05, i % 2 ? M.leaf : M.leafLight, -5.3 + (Math.random() - 0.5) * 0.4, 1.32 + Math.random() * 0.25, -3.7 + (Math.random() - 0.5) * 0.3);
  // Kitchen window (back wall) glowing softly
  box(1.8, 1.2, 0.05, M.woodDark, -3.6, 2.2, -4.14);
  box(0.8, 1.0, 0.03, M.glass, -4.05, 2.2, -4.12);
  box(0.8, 1.0, 0.03, M.glass, -3.15, 2.2, -4.12);
  void H;
}

function bar() {
  const z = LAYOUT.counterZ;
  const len = 6.0, cx = -1.0;
  // Counter body with vertical planks
  box(len, 0.95, 0.7, M.woodDark, cx, 0.475, z);
  for (let i = 0; i < 20; i++) box(0.26, 0.9, 0.03, M.wood, cx - len / 2 + 0.16 + i * 0.3, 0.47, z + 0.36);
  box(len + 0.2, 0.07, 0.86, M.woodLight, cx, 0.985, z);
  // Raised back bar shelf
  box(len, 0.06, 0.28, M.woodLight, cx, 1.28, z - 0.32);
  for (const dx of [-2.6, 0, 2.6]) box(0.06, 0.3, 0.06, M.woodDark, cx + dx, 1.13, z - 0.32);
  // Bowls on back-bar shelf
  for (let i = 0; i < 9; i++) cyl(0.08, 0.06, 0.07, i % 3 ? M.ceramic : M.ceramicBlue, cx - 2.6 + i * 0.6, 1.35, z - 0.32, 14);
  // Cutting board + knife + veg basket
  box(0.5, 0.03, 0.3, M.woodLight, -2.2, 1.035, z - 0.05);
  box(0.28, 0.01, 0.03, M.steel, -2.05, 1.06, z - 0.1);
  cyl(0.18, 0.14, 0.12, M.wood, 0.3, 1.08, z - 0.15, 14);
  for (let i = 0; i < 6; i++) sphere(0.05, i % 2 ? M.leaf : M.red, 0.3 + (Math.random() - 0.5) * 0.2, 1.17, z - 0.15 + (Math.random() - 0.5) * 0.2);
  // Pass area marker (subtle)
  const passMark = new THREE.Mesh(new THREE.CircleGeometry(0.34, 32), new THREE.MeshBasicMaterial({ color: '#f5efe6', transparent: true, opacity: 0.0 }));
  passMark.rotation.x = -Math.PI / 2;
  passMark.position.set(LAYOUT.pass.x, 1.03, z);
  passMark.name = 'pass';
  root.add(passMark);
  // Chopsticks/napkin settings per seat
  for (const s of LAYOUT.stools) {
    box(0.2, 0.008, 0.16, M.paper, s.x, 1.025, z + 0.16);
    box(0.22, 0.008, 0.012, M.woodDark, s.x, 1.03, z + 0.26);
  }
}

function stools() {
  const out = [];
  LAYOUT.stools.forEach((s, i) => {
    const g = new THREE.Group();
    g.position.set(s.x, 0, s.z);
    const seat = cyl(0.24, 0.22, 0.06, M.woodLight, 0, 0.72, 0, 24, g);
    const ring1 = cyl(0.2, 0.2, 0.02, M.woodDark, 0, 0.32, 0, 20, g);
    ring1.material = M.woodDark;
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const leg = cyl(0.025, 0.03, 0.72, M.wood, Math.cos(a) * 0.19, 0.36, Math.sin(a) * 0.19, 10, g);
      leg.rotation.z = Math.cos(a) * 0.05;
      leg.rotation.x = -Math.sin(a) * 0.05;
    }
    // Name plate on counter front
    const lbl = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.34),
      new THREE.MeshBasicMaterial({ map: labelTexture(s.name, { fg: '#f3e9d6' }), transparent: true })
    );
    lbl.position.set(s.x, 0.66, LAYOUT.counterZ + 0.38);
    root.add(lbl);
    // Invisible click target
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 12), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(0, 0.6, 0);
    hit.userData = { type: 'stool', index: i };
    g.add(hit);
    // Highlight ring (hidden until needed)
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.36, 40), new THREE.MeshBasicMaterial({ color: '#6b8f71', transparent: true, opacity: 0, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.012;
    g.add(ring);
    root.add(g);
    out.push({ group: g, hit, ring, seat });
  });
  return out;
}

function lanterns() {
  const lights = [];
  for (const x of [-2.4, -0.4, 1.6]) {
    const y = 2.55;
    box(0.02, 0.7, 0.02, M.black, x, y + 0.45, -1.0);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.22, 24, 1, true), M.lampShade);
    shade.position.set(x, y + 0.02, -1.0);
    root.add(shade);
    sphere(0.06, M.warmLamp, x, y - 0.04, -1.0);
    const l = new THREE.PointLight('#ffc27a', 6, 6, 2);
    l.position.set(x, y - 0.1, -1.0);
    root.add(l);
    lights.push(l);
  }
  // Warm fill in kitchen
  const k = new THREE.PointLight('#ffd9a8', 10, 9, 2);
  k.position.set(-1.5, 2.6, -3.2);
  root.add(k);
  return lights;
}

function garden() {
  // Planter bed front-left
  box(4.2, 0.4, 1.6, M.stone, -3.6, 0.2, 3.2);
  box(4.0, 0.06, 1.4, M.soil, -3.6, 0.4, 3.2);
  for (let i = 0; i < 24; i++) {
    const x = -5.4 + Math.random() * 3.6, z = 2.6 + Math.random() * 1.2;
    const h = 0.25 + Math.random() * 0.3;
    const g = new THREE.Group();
    g.position.set(x, 0.42, z);
    const n = 4 + Math.floor(Math.random() * 3);
    for (let k = 0; k < n; k++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.09 + Math.random() * 0.08, 8, 6), Math.random() > 0.5 ? M.leaf : M.leafLight);
      leaf.scale.set(1, 1.6, 0.5);
      leaf.position.set(Math.cos((k / n) * 6.28) * 0.1, h * 0.6, Math.sin((k / n) * 6.28) * 0.1);
      leaf.rotation.y = (k / n) * 6.28;
      leaf.rotation.x = 0.5;
      leaf.castShadow = true;
      g.add(leaf);
    }
    root.add(g);
  }
  // Stone edge
  for (let i = 0; i < 12; i++) {
    const s = sphere(0.14 + Math.random() * 0.08, M.stone, -5.9 + i * 0.4, 0.42, 4.05 + (Math.random() - 0.5) * 0.1);
    s.scale.y = 0.6;
  }
  // Watering can
  cyl(0.14, 0.12, 0.26, M.metal, -1.1, 0.53, 2.9, 14);
  box(0.03, 0.03, 0.4, M.metal, -1.1, 0.62, 3.1).rotation.x = -0.6;

  // Onggi jars (left)
  for (const [x, z, s] of [[-7.4, 0.6, 1.0], [-7.9, 1.6, 0.85], [-7.1, 1.9, 0.6]]) {
    const j = new THREE.Mesh(new THREE.LatheGeometry([
      new THREE.Vector2(0.25, 0), new THREE.Vector2(0.42, 0.25), new THREE.Vector2(0.48, 0.55),
      new THREE.Vector2(0.42, 0.85), new THREE.Vector2(0.32, 0.98), new THREE.Vector2(0.34, 1.03),
    ], 28), M.clay);
    j.position.set(x, 0, z);
    j.scale.setScalar(s);
    j.castShadow = j.receiveShadow = true;
    root.add(j);
    cyl(0.34 * s, 0.3 * s, 0.05, M.clay, x, 1.04 * s, z, 20);
  }
  // Pumpkins
  for (const [x, z] of [[-7.6, -0.4], [-7.2, -0.2]]) {
    const p = sphere(0.22, new THREE.MeshStandardMaterial({ color: '#d9a35a', roughness: 0.7 }), x, 0.2, z);
    p.scale.y = 0.75;
  }

  // Potted tree right
  cyl(0.34, 0.28, 0.5, M.ceramic, 4.9, 0.25, 0.9, 20);
  cyl(0.05, 0.06, 1.2, M.woodDark, 4.9, 1.0, 0.9, 8);
  for (let i = 0; i < 14; i++) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.16 + Math.random() * 0.1, 8, 6), Math.random() > 0.4 ? M.leaf : M.leafLight);
    l.scale.set(1.3, 0.35, 1.3);
    l.position.set(4.9 + (Math.random() - 0.5) * 0.9, 1.3 + Math.random() * 0.8, 0.9 + (Math.random() - 0.5) * 0.9);
    l.rotation.set(Math.random(), Math.random() * 3, Math.random());
    l.castShadow = true;
    root.add(l);
  }
  // Mop bucket
  cyl(0.2, 0.16, 0.34, new THREE.MeshStandardMaterial({ color: '#3f6d63', roughness: 0.5, metalness: 0.4 }), 5.6, 0.17, 2.0, 16);
  const mop = cyl(0.015, 0.015, 1.5, M.wood, 5.62, 1.0, 2.0, 8);
  mop.rotation.z = 0.12;
  // Bench outside on the right
  box(1.2, 0.06, 0.34, M.woodDark, 7.2, 0.5, -1.2);
  box(0.06, 0.5, 0.3, M.woodDark, 6.7, 0.25, -1.2);
  box(0.06, 0.5, 0.3, M.woodDark, 7.7, 0.25, -1.2);
}

function ground() {
  const g = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), M.ground);
  g.rotation.x = -Math.PI / 2;
  g.position.y = -0.33;
  g.receiveShadow = true;
  root.add(g);
  // Paving in front
  const pave = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), M.stone);
  pave.rotation.x = -Math.PI / 2;
  pave.position.set(0, -0.32, 9);
  pave.receiveShadow = true;
  root.add(pave);
  forecourt();
}

// Front courtyard: steps up to the platform, gravel bed with stepping stones,
// stone lanterns, a low tiled wall and small plantings.
function forecourt() {
  const gravelM = new THREE.MeshStandardMaterial({ color: '#cfc6b6', roughness: 1 });
  const stepM = new THREE.MeshStandardMaterial({ color: '#b3a893', roughness: 0.9 });
  const mossM = new THREE.MeshStandardMaterial({ color: '#6e8a4e', roughness: 1 });
  // Granite steps along the platform front (the slab edge sits at z≈5.45)
  box(9.0, 0.11, 0.42, stepM, 0.6, -0.27, 5.66);
  box(9.0, 0.11, 0.42, stepM, 0.6, -0.16, 5.45 - 0.0);
  // Gravel bed with raked lines
  const gravel = box(12.5, 0.02, 3.4, gravelM, -0.4, -0.31, 7.7);
  gravel.castShadow = false;
  for (let i = 0; i < 9; i++) {
    const rake = box(12.2, 0.012, 0.03, new THREE.MeshStandardMaterial({ color: '#bdb3a1', roughness: 1 }), -0.4, -0.295, 6.3 + i * 0.34);
    rake.castShadow = false;
  }
  // Stepping stones leading to the entrance
  let seed = 11;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let i = 0; i < 7; i++) {
    const s = cyl(0.3 + rnd() * 0.08, 0.34 + rnd() * 0.08, 0.08, stepM, 1.2 + i * 0.75, -0.28, 6.4 + Math.sin(i * 0.9) * 0.35 + i * 0.15, 9);
    s.rotation.y = rnd() * 3;
    s.scale.z = 0.8;
  }
  // Moss tufts around the stones
  for (let i = 0; i < 26; i++) {
    const m = sphere(0.06 + rnd() * 0.05, mossM, -6 + rnd() * 12, -0.29, 6.2 + rnd() * 3);
    m.scale.y = 0.35;
  }
  // Stone lanterns (seokdeung) flanking the path
  for (const [x, z] of [[-2.2, 7.1], [5.6, 6.6]]) {
    const g = new THREE.Group();
    g.position.set(x, -0.3, z);
    box(0.5, 0.12, 0.5, M.stone, 0, 0.06, 0, g);
    cyl(0.1, 0.12, 0.7, M.stone, 0, 0.47, 0, 8, g);
    box(0.44, 0.08, 0.44, M.stone, 0, 0.86, 0, g);
    box(0.34, 0.3, 0.34, M.stone, 0, 1.05, 0, g);
    const glow = box(0.2, 0.18, 0.36, M.warmLamp, 0, 1.05, 0, g);
    glow.castShadow = false;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.22, 4), M.stone);
    cap.position.y = 1.31; cap.rotation.y = Math.PI / 4; cap.castShadow = true;
    g.add(cap);
    sphere(0.06, M.stone, 0, 1.46, 0, g);
    const l = new THREE.PointLight('#ffc27a', 1.4, 3.5, 2);
    l.position.set(0, 1.05, 0);
    g.add(l);
    root.add(g);
  }
  // Low wall with a tiled coping along the far left, framing the garden
  const wallM = new THREE.MeshStandardMaterial({ color: '#e3dccf', roughness: 0.95 });
  box(0.3, 0.9, 5.2, wallM, -9.2, 0.13, 2.4);
  box(0.5, 0.12, 5.4, M.roofTile, -9.2, 0.64, 2.4);
  for (let i = 0; i < 16; i++) cyl(0.05, 0.05, 0.5, M.roofTile, -9.2, 0.72, 0.0 + i * 0.33, 8).rotation.z = Math.PI / 2;
  // Low shrubs along the front edge
  for (const [x, z] of [[-5.5, 6.0], [-4.6, 6.2], [3.6, 6.1], [7.4, 6.4], [8.2, 5.8]]) {
    for (let k = 0; k < 5; k++) {
      const b = sphere(0.18 + rnd() * 0.12, rnd() > 0.5 ? M.leaf : M.leafLight, x + (rnd() - 0.5) * 0.5, -0.12 + rnd() * 0.15, z + (rnd() - 0.5) * 0.4);
      b.scale.y = 0.75;
    }
  }
}

export function buildWorld(scene) {
  mats();
  root = new THREE.Group();
  scene.add(root);
  ground();
  structure();
  kitchen();
  bar();
  const stoolObjs = stools();
  root.add(roof());
  const lights = lanterns();
  garden();

  // Wall sign
  nameBoard();
  signMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ transparent: true }));
  signMesh.position.set(4.2, 2.3, -4.13);
  root.add(signMesh);
  setSignText('제주 다이닝');
  const plaque = box(0.22, 0.42, 0.04, M.red, 6.0, 1.8, 1.42);
  plaque.name = 'plaque';

  // Wooden menu boards on the back wall
  const menuItems = ['비빔밥 9,000', '라면 6,000', '김밥 5,000', '떡볶이 7,000'];
  menuItems.forEach((t, i) => {
    box(0.66, 0.2, 0.03, M.woodLight, -4.6 + i * 0.72, 1.92, -4.13);
    const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.17), new THREE.MeshBasicMaterial({ map: labelTexture(t, { w: 384, h: 104, fg: '#2a1c12', font: '700 50px "Noto Serif KR", serif' }), transparent: true }));
    lbl.position.set(-4.6 + i * 0.72, 1.92, -4.11);
    root.add(lbl);
  });

  // Dustbin beside the pass — click it while carrying to dump a plate
  const binMat = new THREE.MeshStandardMaterial({ color: '#3a3f44', roughness: 0.5, metalness: 0.5 });
  const bin = new THREE.Group();
  bin.position.set(3.55, 0, -0.55);
  cyl(0.24, 0.2, 0.62, binMat, 0, 0.31, 0, 20, bin);
  cyl(0.26, 0.26, 0.05, M.black, 0, 0.64, 0, 20, bin);
  box(0.16, 0.03, 0.02, M.black, 0, 0.68, 0.14, bin);
  const binHit = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.0, 12), new THREE.MeshBasicMaterial({ visible: false }));
  binHit.position.y = 0.5;
  binHit.userData = { type: 'bin' };
  bin.add(binHit);
  const binRing = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.36, 40), new THREE.MeshBasicMaterial({ color: '#b5462e', transparent: true, opacity: 0, side: THREE.DoubleSide }));
  binRing.rotation.x = -Math.PI / 2;
  binRing.position.y = 0.012;
  bin.add(binRing);
  root.add(bin);

  return { root, stools: stoolObjs, lights, materials: M, bin: { group: bin, hit: binHit, ring: binRing } };
}


// --- Additions: market items and level areas ----------------------------------
function stoolAt(x, z, index, parent, opts = {}) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  if (opts.cushion) {
    const c = cyl(0.26, 0.26, 0.08, new THREE.MeshStandardMaterial({ color: opts.cushion, roughness: 0.9 }), 0, opts.y + 0.04, 0, 24, g);
    c.scale.set(1, 1, 0.85);
  } else {
    cyl(0.24, 0.22, 0.06, M.woodLight, 0, 0.72, 0, 24, g);
    cyl(0.2, 0.2, 0.02, M.woodDark, 0, 0.32, 0, 20, g);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      cyl(0.025, 0.03, 0.72, M.wood, Math.cos(a) * 0.19, 0.36, Math.sin(a) * 0.19, 10, g);
    }
  }
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 12), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(0, 0.6, 0);
  hit.userData = { type: 'stool', index };
  g.add(hit);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.36, 40), new THREE.MeshBasicMaterial({ color: '#6b8f71', transparent: true, opacity: 0, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = (opts.y ?? 0) + 0.012;
  g.add(ring);
  parent.add(g);
  return { group: g, hit, ring };
}

function registerSeats(world, seats, parent, opts = {}) {
  return seats.map((s) => {
    const index = LAYOUT.stools.length;
    LAYOUT.stools.push(s);
    const o = stoolAt(s.x, s.z, index, parent, opts);
    o.level = s.level;
    world.stools.push(o);
    return o;
  });
}

// Round courtyard table with two seats.
export function addCourtyardTable(world, cx, cz, name, parent = root, level = 1) {
  cyl(0.5, 0.46, 0.05, M.woodLight, cx, 0.76, cz, 32, parent);
  cyl(0.05, 0.06, 0.72, M.woodDark, cx, 0.38, cz, 12, parent);
  cyl(0.3, 0.32, 0.04, M.woodDark, cx, 0.03, cz, 24, parent);
  cyl(0.06, 0.05, 0.06, M.ceramic, cx, 0.82, cz, 12, parent);
  for (let i = 0; i < 4; i++) sphere(0.03, i % 2 ? M.leaf : M.red, cx + (Math.random() - 0.5) * 0.08, 0.9 + i * 0.03, cz + (Math.random() - 0.5) * 0.08, parent);
  const seats = [
    { x: cx - 0.8, z: cz, name: `${name} A`, rot: Math.PI / 2, sit: { x: cx - 0.72, z: cz }, approach: { x: cx - 0.9, z: cz + 0.95 }, deliver: { x: cx - 0.4, z: cz + 0.95 }, plate: { x: cx - 0.24, y: 0.79, z: cz + 0.02 }, table: true, level },
    { x: cx + 0.8, z: cz, name: `${name} B`, rot: -Math.PI / 2, sit: { x: cx + 0.72, z: cz }, approach: { x: cx + 0.9, z: cz + 0.95 }, deliver: { x: cx + 0.4, z: cz + 0.95 }, plate: { x: cx + 0.24, y: 0.79, z: cz + 0.02 }, table: true, level },
  ];
  return registerSeats(world, seats, parent);
}

export function addExtraLanterns(world) {
  for (const [x, z] of [[-4.4, 0.4], [4.6, 0.4]]) {
    const y = 2.7;
    box(0.02, 0.5, 0.02, M.black, x, y + 0.35, z);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.2, 24, 1, true), M.lampShade);
    shade.position.set(x, y + 0.02, z);
    root.add(shade);
    sphere(0.05, M.warmLamp, x, y - 0.04, z);
    const l = new THREE.PointLight('#ffc27a', 5, 6, 2);
    l.position.set(x, y - 0.1, z);
    root.add(l);
    world.lights.push(l);
  }
}

export function addSignboard() {
  const g = new THREE.Group();
  g.position.set(8.6, 0, 4.2);
  box(0.06, 1.4, 0.06, M.woodDark, -0.35, 0.7, 0, g);
  box(0.06, 1.4, 0.06, M.woodDark, 0.35, 0.7, 0, g);
  box(0.9, 0.6, 0.05, M.paper, 0, 1.1, 0, g);
  const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), new THREE.MeshBasicMaterial({ map: labelTexture('OPEN', { w: 256, h: 128, fg: '#1b1713', font: '600 70px Inter, sans-serif' }), transparent: true }));
  lbl.position.set(0, 1.1, 0.03);
  g.add(lbl);
  g.rotation.y = -0.5;
  root.add(g);
}

function stringLights(world, parent, z = 2.2, y0 = 3.05, x0 = -6.4, x1 = 6.4) {
  const pts = [];
  const bulbGeo = new THREE.SphereGeometry(0.035, 8, 6);
  for (let i = 0; i <= 28; i++) {
    const t = i / 28;
    const x = x0 + t * (x1 - x0);
    const y = y0 - Math.sin(t * Math.PI) * 0.35;
    pts.push(new THREE.Vector3(x, y, z));
    if (i % 2 === 1) {
      const b = new THREE.Mesh(bulbGeo, M.warmLamp);
      b.position.set(x, y - 0.06, z);
      parent.add(b);
    }
  }
  parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#2b2622' })));
  const l = new THREE.PointLight('#ffd3a0', 3, 7, 2);
  l.position.set((x0 + x1) / 2, y0 - 0.3, z);
  parent.add(l);
  world.lights.push(l);
}

// Level 3: a timber deck on the right with a pergola and a table for two.
function addDeck(world, parent) {
  const cx = 8.0, cz = 0.6;
  box(2.8, 0.1, 3.0, M.woodLight, cx, 0.05, cz, parent);
  for (let i = 0; i < 9; i++) box(0.02, 0.11, 3.0, M.woodDark, cx - 1.3 + i * 0.32, 0.055, cz, parent);
  for (const [dx, dz] of [[-1.25, -1.35], [1.25, -1.35], [-1.25, 1.35], [1.25, 1.35]]) box(0.14, 2.5, 0.14, M.woodDark, cx + dx, 1.3, cz + dz, parent);
  box(3.0, 0.12, 0.14, M.woodDark, cx, 2.55, cz - 1.35, parent);
  box(3.0, 0.12, 0.14, M.woodDark, cx, 2.55, cz + 1.35, parent);
  for (let i = 0; i < 7; i++) box(0.08, 0.06, 3.2, M.woodDark, cx - 1.2 + i * 0.4, 2.62, cz, parent);
  // Trailing vine on the pergola
  for (let i = 0; i < 18; i++) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.12 + Math.random() * 0.08, 8, 6), Math.random() > 0.5 ? M.leaf : M.leafLight);
    l.scale.set(1.3, 0.5, 1.3);
    l.position.set(cx - 1.4 + Math.random() * 2.8, 2.55 + Math.random() * 0.2, cz - 1.5 + Math.random() * 3);
    parent.add(l);
  }
  box(0.02, 0.9, 0.02, M.black, cx, 2.1, cz, parent);
  sphere(0.07, M.warmLamp, cx, 1.62, cz, parent);
  const l = new THREE.PointLight('#ffc27a', 4, 5, 2);
  l.position.set(cx, 1.6, cz);
  parent.add(l);
  world.lights.push(l);
  // Planters along the back edge
  for (const dx of [-0.9, 0, 0.9]) {
    box(0.6, 0.3, 0.3, M.clay, cx + dx, 0.25, cz - 1.25, parent);
    for (let i = 0; i < 5; i++) sphere(0.09, i % 2 ? M.leaf : M.leafLight, cx + dx - 0.2 + i * 0.1, 0.48 + (i % 2) * 0.06, cz - 1.25, parent);
  }
  return addCourtyardTable(world, cx, cz + 0.2, '툇마루', parent, 3);
}

// Level 4: a raised pyeongsang (wooden platform) with a low table and floor cushions on the left.
function addPyeongsang(world, parent) {
  const cx = -7.6, cz = 4.0, y = 0.38;
  box(3.0, 0.1, 2.2, M.woodLight, cx, y, cz, parent);
  for (let i = 0; i < 8; i++) box(3.0, 0.11, 0.02, M.woodDark, cx, y + 0.005, cz - 1.0 + i * 0.28, parent);
  for (const [dx, dz] of [[-1.35, -0.95], [1.35, -0.95], [-1.35, 0.95], [1.35, 0.95]]) box(0.1, 0.36, 0.1, M.woodDark, cx + dx, 0.18, cz + dz, parent);
  box(1.1, 0.05, 0.7, M.woodDark, cx, y + 0.32, cz, parent);
  for (const [dx, dz] of [[-0.45, -0.25], [0.45, -0.25], [-0.45, 0.25], [0.45, 0.25]]) box(0.05, 0.3, 0.05, M.woodDark, cx + dx, y + 0.19, cz + dz, parent);
  cyl(0.09, 0.07, 0.1, M.ceramicBlue, cx, y + 0.4, cz, 14, parent);
  // Paper lantern on a pole
  box(0.05, 2.4, 0.05, M.woodDark, cx + 1.7, 1.2, cz - 1.2, parent);
  box(0.6, 0.05, 0.05, M.woodDark, cx + 1.45, 2.35, cz - 1.2, parent);
  const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshStandardMaterial({ color: '#f3e2c2', emissive: '#ffb865', emissiveIntensity: 0.9, roughness: 0.9 }));
  lantern.position.set(cx + 1.2, 2.05, cz - 1.2);
  lantern.scale.y = 1.15;
  parent.add(lantern);
  const l = new THREE.PointLight('#ffc27a', 4, 6, 2);
  l.position.copy(lantern.position);
  parent.add(l);
  world.lights.push(l);
  const seats = [
    { x: cx - 0.85, z: cz, name: '평상 A', rot: Math.PI / 2, sit: { x: cx - 0.8, z: cz }, approach: { x: cx - 0.9, z: cz + 1.55 }, deliver: { x: cx - 0.45, z: cz + 1.55 }, plate: { x: cx - 0.25, y: y + 0.36, z: cz }, table: true, level: 4, sitY: 0.1, y },
    { x: cx + 0.85, z: cz, name: '평상 B', rot: -Math.PI / 2, sit: { x: cx + 0.8, z: cz }, approach: { x: cx + 0.9, z: cz + 1.55 }, deliver: { x: cx + 0.45, z: cz + 1.55 }, plate: { x: cx + 0.25, y: y + 0.36, z: cz }, table: true, level: 4, sitY: 0.1, y },
  ];
  return registerSeats(world, seats, parent, { cushion: '#b5462e', y });
}

// Level 5: night-market red lanterns along the eave and a third courtyard table.
function addNightLanterns(world, parent) {
  const red = new THREE.MeshStandardMaterial({ color: '#c94a3a', emissive: '#ff6a3a', emissiveIntensity: 0.7, roughness: 0.8 });
  for (let i = 0; i < 7; i++) {
    const x = -5.4 + i * 1.8;
    box(0.015, 0.4, 0.015, M.black, x, 3.05, 4.3, parent);
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), red);
    l.position.set(x, 2.72, 4.3);
    l.scale.y = 1.2;
    parent.add(l);
    cyl(0.07, 0.07, 0.04, M.black, x, 2.5, 4.3, 12, parent);
  }
  const pl = new THREE.PointLight('#ff9a6a', 4, 9, 2);
  pl.position.set(0, 2.5, 4.3);
  parent.add(pl);
  world.lights.push(pl);
  // Potted bamboo framing the front
  for (const x of [-6.6, 6.6]) {
    cyl(0.3, 0.26, 0.5, M.clay, x, 0.25, 4.9, 18, parent);
    for (let k = 0; k < 4; k++) {
      cyl(0.02, 0.02, 1.6 + k * 0.2, M.leafLight, x + (k - 1.5) * 0.08, 1.3 + k * 0.1, 4.9, 6, parent);
      for (let j = 0; j < 4; j++) {
        const lf = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), M.leaf);
        lf.scale.set(2.2, 0.3, 0.6);
        lf.position.set(x + (k - 1.5) * 0.08 + 0.1, 1.3 + j * 0.3 + k * 0.1, 4.9);
        lf.rotation.y = j;
        parent.add(lf);
      }
    }
  }
  return addCourtyardTable(world, 4.6, 3.4, '앞뜰', parent, 5);
}

// Build the extra space a level unlocks. Returns a group that can be toggled.
export function buildLevelArea(world, level) {
  const g = new THREE.Group();
  g.name = `level-${level}`;
  root.add(g);
  if (level === 2) { stringLights(world, g); addCourtyardTable(world, -0.1, 3.2, '뜰', g, 2); }
  else if (level === 3) addDeck(world, g);
  else if (level === 4) addPyeongsang(world, g);
  else if (level === 5) addNightLanterns(world, g);
  g.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  return g;
}
