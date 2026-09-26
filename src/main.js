import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildWorld } from './world.js';
import { Game } from './game.js';
import { hud } from './ui.js';
import { LofiPlayer } from './audio.js';

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

// Day / night lighting rig. Every value is lerped by nightMix each frame.
const DAY = { bg: new THREE.Color('#d8d3cb'), hemiSky: new THREE.Color('#eae4da'), hemiGround: new THREE.Color('#8c7a67'), hemi: 1.4, ambient: 0.35, sun: 2.8, sunColor: new THREE.Color('#ffe7c9'), rim: 0.6, exposure: 1.0, lamp: 1.0, emissive: 1.0, fogNear: 22, fogFar: 60 };
const NIGHT = { bg: new THREE.Color('#1c1d26'), hemiSky: new THREE.Color('#4a5270'), hemiGround: new THREE.Color('#2a221c'), hemi: 0.75, ambient: 0.14, sun: 0.35, sunColor: new THREE.Color('#8fa3d1'), rim: 0.35, exposure: 1.08, lamp: 3.4, emissive: 3.2, fogNear: 16, fogFar: 48 };
let nightMix = 0, nightTarget = 0;
const tmpColor = new THREE.Color();

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
const ambient = scene.children.find((o) => o.isAmbientLight);

const world = buildWorld(scene);

// Night-only lights: fade in with nightMix so the diner glows after dark.
const nightLights = [];
function nightLight(color, intensity, distance, x, y, z, spot) {
  let l;
  if (spot) {
    l = new THREE.SpotLight(color, intensity, distance, 0.9, 0.6, 1.6);
    l.target.position.set(x, 0, z + (spot.dz || 0));
    scene.add(l.target);
  } else {
    l = new THREE.PointLight(color, intensity, distance, 2);
  }
  l.position.set(x, y, z);
  l.userData.nightBase = intensity;
  l.intensity = 0;
  scene.add(l);
  nightLights.push(l);
}
// Downlights under the front eave washing the counter and floor
for (const x of [-4.5, -2.0, 0.5, 3.0, 5.2]) nightLight('#ffc98a', 22, 9, x, 3.1, 0.9, { dz: -0.4 });
// Kitchen glow behind the bar
nightLight('#ffd6a0', 14, 8, -1.8, 2.4, -3.3);
nightLight('#ffd6a0', 10, 7, 2.6, 2.4, -3.3);
// Courtyard: warm fill over the garden, tables and the path
nightLight('#ffb870', 10, 9, -3.6, 2.2, 3.6);
nightLight('#ffb870', 10, 9, 2.6, 2.2, 4.0);
nightLight('#ffcf94', 8, 9, 1.8, 1.4, 7.2);
// Uplight on the potted tree and the entrance
nightLight('#ffd9a8', 6, 4, 4.9, 0.4, 1.4);
nightLight('#ffc27a', 8, 7, 6.6, 2.4, 2.8);
// Cool moon fill so silhouettes still read
const moon = new THREE.DirectionalLight('#9fb4e0', 0);
moon.position.set(6, 12, 10);
moon.userData.nightBase = 0.6;
scene.add(moon);
nightLights.push(moon);
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

// Emissive bulbs (lanterns, string lights, paper lanterns) brighten at night.
const emissives = new Set();
function collectEmissives() {
  scene.traverse((o) => {
    if (o.isMesh && o.material && o.material.emissiveIntensity > 0 && !emissives.has(o.material)) {
      o.material.userData.baseEmissive = o.material.emissiveIntensity;
      emissives.add(o.material);
    }
  });
}
function applyLighting() {
  const m = nightMix;
  scene.background.copy(DAY.bg).lerp(NIGHT.bg, m);
  scene.fog.color.copy(scene.background);
  scene.fog.near = THREE.MathUtils.lerp(DAY.fogNear, NIGHT.fogNear, m);
  scene.fog.far = THREE.MathUtils.lerp(DAY.fogFar, NIGHT.fogFar, m);
  hemi.color.copy(DAY.hemiSky).lerp(NIGHT.hemiSky, m);
  hemi.groundColor.copy(DAY.hemiGround).lerp(NIGHT.hemiGround, m);
  hemi.intensity = THREE.MathUtils.lerp(DAY.hemi, NIGHT.hemi, m);
  if (ambient) ambient.intensity = THREE.MathUtils.lerp(DAY.ambient, NIGHT.ambient, m);
  sun.intensity = THREE.MathUtils.lerp(DAY.sun, NIGHT.sun, m);
  sun.color.copy(DAY.sunColor).lerp(NIGHT.sunColor, m);
  rim.intensity = THREE.MathUtils.lerp(DAY.rim, NIGHT.rim, m);
  renderer.toneMappingExposure = THREE.MathUtils.lerp(DAY.exposure, NIGHT.exposure, m);
  const em = THREE.MathUtils.lerp(DAY.emissive, NIGHT.emissive, m);
  for (const mat of emissives) mat.emissiveIntensity = (mat.userData.baseEmissive ?? 1) * em;
}
const nightBtn = document.getElementById('night-btn');
function setNight(on, instant = false) {
  nightTarget = on ? 1 : 0;
  if (instant) nightMix = nightTarget;
  nightBtn.textContent = on ? 'Day' : 'Night';
  nightBtn.setAttribute('aria-pressed', String(on));
  document.body.classList.toggle('night', on);
  try { localStorage.setItem('aswini-diner-night', on ? '1' : '0'); } catch { /* ignore */ }
}
nightBtn.addEventListener('click', () => setNight(nightTarget < 0.5));
let savedNight = false;
try { savedNight = localStorage.getItem('aswini-diner-night') === '1'; } catch { /* ignore */ }
setNight(savedNight, true);
// Lofi ambience: starts with the first "Open for service" click (browsers need a gesture), toggle in the HUD.
const music = new LofiPlayer();
const musicBtn = document.getElementById('music-btn');
let musicWanted = true;
try { musicWanted = localStorage.getItem('aswini-diner-music') !== '0'; } catch { /* ignore */ }
function reflectMusic() {
  musicBtn.setAttribute('aria-pressed', String(music.playing));
  musicBtn.textContent = music.playing ? '♪ On' : '♪ Off';
}
musicBtn.addEventListener('click', () => {
  music.toggle();
  musicWanted = music.playing;
  try { localStorage.setItem('aswini-diner-music', musicWanted ? '1' : '0'); } catch { /* ignore */ }
  reflectMusic();
});
const startMusic = () => { if (musicWanted && !music.playing) music.play().then(reflectMusic); };
hud.start.addEventListener('click', startMusic);
hud.marketDone.addEventListener('click', startMusic);
reflectMusic();
game.onSceneChange = () => collectEmissives();
collectEmissives();

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
document.querySelector('.brand').addEventListener('click', () => game.editName());
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
  nightMix += (nightTarget - nightMix) * Math.min(1, dt * 1.6);
  if (Math.abs(nightTarget - nightMix) < 0.002) nightMix = nightTarget;
  applyLighting();
  for (const l of nightLights) l.intensity = l.userData.nightBase * nightMix;
  const lampScale = THREE.MathUtils.lerp(DAY.lamp, NIGHT.lamp, nightMix);
  world.lights.forEach((l, i) => { l.userData.base ??= l.intensity; l.intensity = l.userData.base * lampScale + Math.sin(flickerT * 3.1 + i * 1.7) * 0.18 + Math.sin(flickerT * 7.3 + i) * 0.08; });
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
