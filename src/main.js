import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildWorld } from './world.js';
import { Game } from './game.js';
import { hud } from './ui.js';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#d8d3cb');
scene.fog = new THREE.Fog('#d8d3cb', 22, 60);

const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(5.6, 4.4, 11.6);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0.5, 1.15, -0.3);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 7;
controls.maxDistance = 34;
controls.minPolarAngle = 0.5;
controls.maxPolarAngle = 1.42;
controls.minAzimuthAngle = -1.1;
controls.maxAzimuthAngle = 1.1;
controls.enablePan = false;
controls.update();

// Lighting: soft overcast sky + warm low sun + lantern points from the world
const hemi = new THREE.HemisphereLight('#eae4da', '#8c7a67', 1.4);
scene.add(new THREE.AmbientLight('#f2e9dc', 0.35));
scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffe7c9', 2.8);
sun.position.set(-7, 11, 9);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 40;
sun.shadow.camera.left = -12;
sun.shadow.camera.right = 12;
sun.shadow.camera.top = 12;
sun.shadow.camera.bottom = -12;
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.02;
sun.shadow.radius = 4;
scene.add(sun);
const rim = new THREE.DirectionalLight('#cfd8e6', 0.6);
rim.position.set(8, 6, -8);
scene.add(rim);

const world = buildWorld(scene);
const game = new Game(scene, world);

// Camera framing per level — pulls back and pans so newly unlocked areas are in view.
const VIEWS = {
  1: { pos: [5.6, 4.4, 11.6], target: [0.5, 1.15, -0.3] },
  2: { pos: [5.2, 4.8, 13.2], target: [0.3, 1.0, 0.5] },
  3: { pos: [8.0, 5.2, 13.8], target: [2.0, 1.0, 0.7] },
  4: { pos: [2.6, 5.8, 15.6], target: [-0.8, 1.0, 1.2] },
  5: { pos: [3.4, 6.2, 17.2], target: [0.2, 1.0, 1.4] },
};
const camTween = { t: 1, dur: 1.8, fromPos: new THREE.Vector3(), fromTarget: new THREE.Vector3(), toPos: new THREE.Vector3(), toTarget: new THREE.Vector3() };
let framedLevel = 1;
let userMovedCamera = false;
function frameLevel(level, instant = false) {
  framedLevel = level;
  userMovedCamera = false;
  const v = VIEWS[Math.min(Math.max(level, 1), 5)];
  camTween.toTarget.fromArray(v.target);
  camTween.toPos.fromArray(v.pos);
  // Narrow viewports see less width: back the camera off so the unlocked areas stay in frame.
  const aspect = window.innerWidth / window.innerHeight;
  const k = aspect < 1.7 ? Math.pow(1.7 / aspect, 0.6) : 1;
  camTween.toPos.sub(camTween.toTarget).multiplyScalar(k).add(camTween.toTarget);
  if (instant) {
    camera.position.copy(camTween.toPos);
    controls.target.copy(camTween.toTarget);
    camTween.t = 1;
    controls.update();
    return;
  }
  camTween.fromPos.copy(camera.position);
  camTween.fromTarget.copy(controls.target);
  camTween.t = 0;
}
function updateCamTween(dt) {
  if (camTween.t >= 1) return;
  camTween.t = Math.min(1, camTween.t + dt / camTween.dur);
  const e = 1 - Math.pow(1 - camTween.t, 3); // ease-out cubic
  camera.position.lerpVectors(camTween.fromPos, camTween.toPos, e);
  controls.target.lerpVectors(camTween.fromTarget, camTween.toTarget, e);
}
// Any drag/zoom by the player cancels a running tween.
controls.addEventListener('start', () => { camTween.t = 1; userMovedCamera = true; });
game.onLevelView = (level) => frameLevel(level);
frameLevel(game.level, true);

// Picking
const ray = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downAt = null;
canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', (e) => {
  if (!downAt) return;
  const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]);
  downAt = null;
  if (moved > 6 || performance.now() - startedAt < 400) return;
  pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  ray.setFromCamera(pointer, camera);
  const hits = ray.intersectObjects(game.collectHits(), false);
  game.handleClick(hits[0]?.object);
});
canvas.addEventListener('pointermove', (e) => {
  if (!game.running || game.paused) { canvas.style.cursor = 'default'; return; }
  pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  ray.setFromCamera(pointer, camera);
  const hits = ray.intersectObjects(game.collectHits(), false);
  canvas.style.cursor = hits.length ? 'pointer' : 'default';
});

hud.start.addEventListener('click', () => { game.start(); startedAt = performance.now(); });
hud.marketDone.addEventListener('click', () => { game.start(); startedAt = performance.now(); });
hud.marketOpen.addEventListener('click', () => game.openMarket());
hud.levelsBtn.addEventListener('click', () => game.openLevels());
hud.levelsOpen.addEventListener('click', () => game.openLevels());
hud.marketLevels.addEventListener('click', () => game.openLevels());
hud.levelsClose.addEventListener('click', () => game.closeLevels());
hud.nameInput.addEventListener('input', () => { hud.start.disabled = !hud.nameInput.value.trim(); });
hud.nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && hud.nameInput.value.trim()) hud.start.click(); });
let startedAt = 0;
window.__game = game;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (!userMovedCamera) frameLevel(framedLevel, true);
});

// Loop
const clock = new THREE.Clock();
let flickerT = 0;
let lastTick = performance.now();
function tick() {
  lastTick = performance.now();
  const dt = Math.min(clock.getDelta(), 0.12);
  flickerT += dt;
  world.lights.forEach((l, i) => { l.userData.base ??= l.intensity; l.intensity = l.userData.base + Math.sin(flickerT * 3.1 + i * 1.7) * 0.18 + Math.sin(flickerT * 7.3 + i) * 0.08; });
  game.update(dt);
  updateCamTween(dt);
  controls.update();
  renderer.render(scene, camera);
}
function frame() {
  tick();
  requestAnimationFrame(frame);
}
frame();
// Keep the simulation moving when rAF is throttled (background tab / embedded pane)
setInterval(() => { if (performance.now() - lastTick > 90) tick(); }, 50);
