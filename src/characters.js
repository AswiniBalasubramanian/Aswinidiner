import * as THREE from 'three';
import { toonGradient } from './textures.js';
import { mergeStatic } from './optimize.js';

let gradient;
const outlineMat = new THREE.MeshBasicMaterial({ color: '#221c18', side: THREE.BackSide });

// Shared per colour so every character's parts can merge into a few draw calls.
const toonCache = new Map();
function toon(color) {
  if (!gradient) gradient = toonGradient();
  let m = toonCache.get(color);
  if (!m) toonCache.set(color, (m = new THREE.MeshToonMaterial({ color, gradientMap: gradient })));
  return m;
}

function part(geo, mat, x, y, z, parent, outline = 0.02) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  if (outline > 0) {
    const o = new THREE.Mesh(geo, outlineMat);
    o.scale.setScalar(1 + outline * 2);
    m.add(o);
  }
  return m;
}

const SKINS = ['#f3d4b6', '#eac39e', '#d9a877', '#f6dcc4'];
const HAIRS = ['#1f1a17', '#2b1d14', '#3d2a1c', '#0f0d0c'];
const TOPS = ['#c94a3a', '#e0c14e', '#5b7f9d', '#7d9b6a', '#d88a5b', '#9a6fb0', '#e8dccb', '#3f4a5a'];
const BOTTOMS = ['#2c2a33', '#d8a341', '#4a5568', '#8b6b4f', '#3a3f4a', '#c9c1b2'];

export function makeCharacter(opts = {}) {
  const {
    skin = SKINS[Math.floor(Math.random() * SKINS.length)],
    hair = HAIRS[Math.floor(Math.random() * HAIRS.length)],
    top = TOPS[Math.floor(Math.random() * TOPS.length)],
    bottom = BOTTOMS[Math.floor(Math.random() * BOTTOMS.length)],
    apron = null,
    hat = null,
    stripes = false,
    hairStyle = Math.random() > 0.5 ? 'short' : 'bun',
    scale = 1,
  } = opts;

  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const skinM = toon(skin), hairM = toon(hair), topM = toon(top), botM = toon(bottom);

  // Legs
  const legL = part(new THREE.CapsuleGeometry(0.075, 0.42, 4, 10), botM, -0.11, 0.34, 0, body);
  const legR = part(new THREE.CapsuleGeometry(0.075, 0.42, 4, 10), botM, 0.11, 0.34, 0, body);
  // Shoes
  const shoeM = toon(opts.shoe || '#3b3431'), soleM = toon('#e9e2d6');
  for (const sx of [-0.11, 0.11]) {
    const shoe = part(new THREE.CapsuleGeometry(0.07, 0.12, 4, 10), shoeM, sx, 0.06, 0.04, body, 0.015);
    shoe.rotation.x = Math.PI / 2;
    shoe.scale.set(1.05, 1, 0.7);
    part(new THREE.BoxGeometry(0.15, 0.025, 0.27), soleM, sx, 0.0125, 0.04, body, 0);
  }
  // Trouser cuffs
  for (const sx of [-0.11, 0.11]) part(new THREE.CylinderGeometry(0.083, 0.083, 0.04, 14), botM, sx, 0.13, 0, body, 0);
  // Torso
  const torso = part(new THREE.CapsuleGeometry(0.24, 0.42, 6, 14), topM, 0, 0.86, 0, body);
  torso.scale.set(1, 1, 0.8);
  // Belt + buckle
  part(new THREE.CylinderGeometry(0.245, 0.245, 0.05, 24), toon('#2a2320'), 0, 0.6, 0, body, 0).scale.set(1, 1, 0.82);
  part(new THREE.BoxGeometry(0.06, 0.045, 0.02), toon('#c9a24b'), 0, 0.6, 0.205, body, 0);
  // Shirt collar (two folded flaps) + placket buttons
  const collarM = toon(opts.collar || '#f1ebe0');
  for (const sx of [-1, 1]) {
    const flap = part(new THREE.BoxGeometry(0.12, 0.07, 0.02), collarM, sx * 0.06, 1.1, 0.16, body, 0.01);
    flap.rotation.set(-0.5, 0, sx * 0.55);
  }
  for (let i = 0; i < 3; i++) part(new THREE.SphereGeometry(0.012, 8, 6), toon('#f1ebe0'), 0, 1.0 - i * 0.11, 0.2, body, 0);
  // Chest pocket
  part(new THREE.BoxGeometry(0.08, 0.08, 0.01), toon(top), 0.11, 0.95, 0.19, body, 0.01);
  if (stripes) {
    const stripeM = toon('#5e9fb4');
    for (let i = 0; i < 6; i++) {
      const ring = part(new THREE.TorusGeometry(0.248, 0.006, 6, 28), stripeM, 0, 0.7 + i * 0.075, 0, body, 0);
      ring.rotation.x = Math.PI / 2;
      ring.scale.set(1, 0.8, 1);
    }
  }
  if (apron) {
    const a = part(new THREE.BoxGeometry(0.36, 0.5, 0.04), toon(apron), 0, 0.72, 0.19, body);
    a.rotation.x = 0.05;
    part(new THREE.TorusGeometry(0.25, 0.01, 6, 24), toon(apron), 0, 0.98, 0, body, 0).rotation.x = Math.PI / 2;
  }
  // Arms
  const armL = new THREE.Group(); armL.position.set(-0.28, 1.02, 0); body.add(armL);
  const armR = new THREE.Group(); armR.position.set(0.28, 1.02, 0); body.add(armR);
  part(new THREE.CapsuleGeometry(0.06, 0.34, 4, 10), topM, 0, -0.2, 0, armL);
  part(new THREE.CapsuleGeometry(0.06, 0.34, 4, 10), topM, 0, -0.2, 0, armR);
  for (const [arm, sx] of [[armL, -1], [armR, 1]]) {
    part(new THREE.CylinderGeometry(0.068, 0.068, 0.04, 14), collarM, 0, -0.34, 0, arm, 0);
    const palm = part(new THREE.SphereGeometry(0.058, 12, 10), skinM, 0, -0.42, 0, arm, 0.02);
    palm.scale.set(0.85, 1.15, 0.7);
    const thumb = part(new THREE.CapsuleGeometry(0.018, 0.03, 4, 6), skinM, sx * -0.04, -0.4, 0.03, arm, 0);
    thumb.rotation.z = sx * 0.6;
  }
  // Neck + head
  part(new THREE.CylinderGeometry(0.07, 0.08, 0.1, 10), skinM, 0, 1.2, 0, body);
  const head = new THREE.Group(); head.position.set(0, 1.5, 0); body.add(head);
  const face = part(new THREE.SphereGeometry(0.27, 24, 18), skinM, 0, 0, 0, head);
  face.scale.set(1, 1.08, 1);
  // Hair
  const cap = part(new THREE.SphereGeometry(0.29, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.56), hairM, 0, 0.03, -0.01, head);
  cap.scale.set(1, 1.05, 1.02);
  // Fringe
  part(new THREE.BoxGeometry(0.42, 0.1, 0.12), hairM, 0, 0.13, 0.22, head).rotation.x = 0.35;
  for (const s of [-1, 1]) {
    const lock = part(new THREE.CapsuleGeometry(0.05, 0.12, 4, 8), hairM, s * 0.24, -0.02, 0.06, head, 0.015);
    lock.rotation.z = s * 0.12;
  }
  for (let i = 0; i < 5; i++) {
    const strand = part(new THREE.ConeGeometry(0.04, 0.12, 6), hairM, -0.16 + i * 0.08, 0.1, 0.25, head, 0);
    strand.rotation.x = Math.PI + 0.35;
  }
  if (hairStyle === 'bun') {
    part(new THREE.SphereGeometry(0.11, 12, 10), hairM, 0, 0.2, -0.22, head);
    part(new THREE.TorusGeometry(0.11, 0.02, 6, 16), toon('#c94a3a'), 0, 0.2, -0.22, head, 0);
  } else if (hairStyle === 'long') {
    part(new THREE.CapsuleGeometry(0.16, 0.36, 4, 12), hairM, 0, -0.16, -0.16, head).scale.set(1.2, 1, 0.6);
  }
  if (hat === 'chef') {
    part(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 20), toon('#f4efe6'), 0, 0.28, 0, head);
    const puff = part(new THREE.SphereGeometry(0.2, 18, 14), toon('#fbf8f2'), 0, 0.42, 0, head);
    puff.scale.set(1.2, 0.9, 1.2);
  } else if (hat === 'cap') {
    part(new THREE.SphereGeometry(0.3, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), toon(bottom), 0, 0.05, 0, head);
    part(new THREE.BoxGeometry(0.34, 0.03, 0.18), toon(bottom), 0, 0.12, 0.3, head);
  }
  // Ears
  for (const s of [-1, 1]) {
    const ear = part(new THREE.SphereGeometry(0.055, 12, 10), skinM, s * 0.265, -0.01, -0.01, head, 0.02);
    ear.scale.set(0.45, 1, 0.75);
  }
  // Nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), skinM);
  nose.position.set(0, -0.04, 0.275);
  nose.scale.set(1, 0.8, 0.8);
  head.add(nose);
  // Eyes: whites, dark iris, highlight
  const eyeM = new THREE.MeshBasicMaterial({ color: '#1a1512' });
  const whiteM = new THREE.MeshBasicMaterial({ color: '#fbf8f2' });
  const irisM = new THREE.MeshBasicMaterial({ color: opts.eye || '#3b2618' });
  for (const s of [-1, 1]) {
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), whiteM);
    white.position.set(s * 0.1, 0.02, 0.235);
    white.scale.set(1, 1.3, 0.45);
    head.add(white);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 10), irisM);
    iris.position.set(s * 0.1, 0.012, 0.252);
    iris.scale.set(1, 1.35, 0.4);
    head.add(iris);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.017, 10, 8), eyeM);
    pupil.position.set(s * 0.1, 0.01, 0.262);
    pupil.scale.set(1, 1.3, 0.4);
    head.add(pupil);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), whiteM);
    glint.position.set(s * 0.1 + 0.01, 0.03, 0.268);
    head.add(glint);
    // Upper lash line
    const lash = new THREE.Mesh(new THREE.TorusGeometry(0.043, 0.006, 6, 14, Math.PI), eyeM);
    lash.position.set(s * 0.1, 0.024, 0.25);
    lash.scale.set(1, 1.2, 1);
    head.add(lash);
    // Eyebrow
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.05, 4, 6), new THREE.MeshBasicMaterial({ color: hair }));
    brow.position.set(s * 0.1, 0.1, 0.25);
    brow.rotation.z = Math.PI / 2 + s * 0.12;
    head.add(brow);
  }
  // Cheeks
  const cheekM = new THREE.MeshBasicMaterial({ color: '#e69a8d', transparent: true, opacity: 0.55 });
  for (const s of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.CircleGeometry(0.045, 12), cheekM);
    c.position.set(s * 0.16, -0.07, 0.235);
    c.lookAt(s * 0.6, -0.1, 1);
    head.add(c);
  }
  // Mouth
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 12, Math.PI), eyeM);
  mouth.position.set(0, -0.1, 0.255);
  mouth.rotation.z = Math.PI;
  head.add(mouth);

  g.scale.setScalar(scale);

  // Hand anchor for carrying plates
  const hold = new THREE.Group();
  hold.position.set(0, 0.95, 0.36);
  body.add(hold);

  // Merge each rigid part (torso, head, each arm) into a few meshes; legs and the
  // plate anchor stay separate because they move on their own.
  for (const o of [head, armL, armR, legL, legR, hold]) o.userData.noMerge = true;
  mergeStatic(body);
  mergeStatic(head);
  mergeStatic(armL);
  mergeStatic(armR);

  const rig = { group: g, body, head, armL, armR, legL, legR, hold, mouth, t: Math.random() * 10, walking: false, sitting: false, carrying: false };

  rig.update = (dt, speed = 1) => {
    rig.t += dt;
    const t = rig.t;
    if (rig.sitting) {
      body.position.y = rig.sitY ?? 0.42;
      legL.rotation.x = legR.rotation.x = -1.3;
      legL.position.z = legR.position.z = 0.16;
      legL.position.y = legR.position.y = 0.34;
      armL.rotation.x = armR.rotation.x = -0.9;
      body.rotation.z = 0;
      head.rotation.set(Math.sin(t * 1.4) * 0.03, Math.sin(t * 0.9) * 0.06, 0);
      return;
    }
    legL.position.z = legR.position.z = 0;
    body.position.y = 0;
    if (rig.walking) {
      const w = t * 9 * speed;
      legL.rotation.x = Math.sin(w) * 0.6;
      legR.rotation.x = -Math.sin(w) * 0.6;
      if (rig.carrying) {
        armL.rotation.x = armR.rotation.x = -1.2;
      } else {
        armL.rotation.x = -Math.sin(w) * 0.5;
        armR.rotation.x = Math.sin(w) * 0.5;
      }
      body.position.y = Math.abs(Math.sin(w)) * 0.04;
      body.rotation.z = Math.sin(w) * 0.03;
    } else {
      legL.rotation.x = legR.rotation.x = 0;
      body.rotation.z = 0;
      body.position.y = Math.sin(t * 2) * 0.008;
      if (rig.carrying) {
        armL.rotation.x = armR.rotation.x = -1.2;
      } else {
        armL.rotation.x = armR.rotation.x = 0.05 + Math.sin(t * 2) * 0.03;
      }
    }
    head.rotation.set(Math.sin(t * 1.4) * 0.03, Math.sin(t * 0.9) * 0.06, 0);
  };

  return rig;
}

// --- Dishes -------------------------------------------------------------
export const DISHES = [
  { id: 'bibimbap', name: 'Bibimbap', kr: '비빔밥', price: 9000, cook: 6, color: '#c9a24b' },
  { id: 'ramyeon', name: 'Ramyeon', kr: '라면', price: 6000, cook: 4, color: '#c94a3a' },
  { id: 'kimbap', name: 'Kimbap', kr: '김밥', price: 5000, cook: 3.5, color: '#3d4a3a' },
  { id: 'tteok', name: 'Tteokbokki', kr: '떡볶이', price: 7000, cook: 5, color: '#d1503f' },
  { id: 'bulgogi', name: 'Bulgogi', kr: '불고기', price: 12000, cook: 7, color: '#6b3a22', locked: true },
];

export function makeDish(dish) {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.16, 0.03, 24), new THREE.MeshStandardMaterial({ color: '#f2ece2', roughness: 0.35 }));
  plate.castShadow = true;
  g.add(plate);
  const m = (c, r = 0.7, metalness = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness });
  if (dish.id === 'bibimbap') {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.11, 0.12, 24), m('#2f2a26', 0.5));
    bowl.position.y = 0.07; g.add(bowl);
    const rice = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.14, 0.03, 24), m('#f6f1e6'));
    rice.position.y = 0.135; g.add(rice);
    const cols = ['#d8a341', '#7d9b6a', '#c94a3a', '#e6d7b8', '#5b3a2a', '#d88a5b'];
    cols.forEach((c, i) => {
      const a = (i / cols.length) * Math.PI * 2;
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), m(c));
      s.position.set(Math.cos(a) * 0.09, 0.16, Math.sin(a) * 0.09);
      s.scale.y = 0.6; g.add(s);
    });
    const yolk = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), m('#f0b23c', 0.3));
    yolk.position.y = 0.17; yolk.scale.y = 0.6; g.add(yolk);
  } else if (dish.id === 'ramyeon') {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.12, 0.11, 24), m('#d9dde0', 0.4));
    bowl.position.y = 0.065; g.add(bowl);
    const soup = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 24), m('#b8452e', 0.3));
    soup.position.y = 0.12; g.add(soup);
    for (let i = 0; i < 5; i++) {
      const n = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 16, Math.PI * 1.4), m('#e9c97a', 0.5));
      n.position.set((Math.random() - 0.5) * 0.14, 0.135, (Math.random() - 0.5) * 0.14);
      n.rotation.set(Math.PI / 2, 0, Math.random() * 6); g.add(n);
    }
    const egg = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), m('#f8f2e6'));
    egg.position.set(0.05, 0.14, -0.03); egg.scale.y = 0.5; g.add(egg);
  } else if (dish.id === 'kimbap') {
    for (let i = 0; i < 6; i++) {
      const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.035, 16), m('#2f3a2c', 0.6));
      const a = (i / 6) * Math.PI * 2;
      roll.position.set(Math.cos(a) * 0.1, 0.035, Math.sin(a) * 0.1); g.add(roll);
      const rice = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.037, 16), m('#f6f1e6'));
      rice.position.copy(roll.position); g.add(rice);
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.038, 8), m('#d8a341'));
      core.position.copy(roll.position); g.add(core);
    }
  } else if (dish.id === 'bulgogi') {
    const skillet = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.05, 24), m('#2a2624', 0.45, 0.4));
    skillet.position.y = 0.04; g.add(skillet);
    for (let i = 0; i < 10; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.02, 0.035), m('#6b3a22', 0.5));
      s.position.set((Math.random() - 0.5) * 0.2, 0.075, (Math.random() - 0.5) * 0.2);
      s.rotation.y = Math.random() * 3; g.add(s);
    }
    for (let i = 0; i < 4; i++) {
      const o = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.006, 6, 12), m('#e8dcc8', 0.5));
      o.position.set((Math.random() - 0.5) * 0.2, 0.09, (Math.random() - 0.5) * 0.2);
      o.rotation.x = Math.PI / 2; g.add(o);
    }
    const sesame = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), m('#7aa356'));
    sesame.position.set(0.06, 0.09, -0.05); sesame.scale.y = 0.4; g.add(sesame);
  } else {
    const dishM = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.04, 24), m('#3a3532', 0.5));
    dishM.position.y = 0.035; g.add(dishM);
    const sauce = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 24), m('#c8402c', 0.3));
    sauce.position.y = 0.06; g.add(sauce);
    for (let i = 0; i < 9; i++) {
      const t = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.06, 4, 8), m('#e9d6c5', 0.4));
      t.position.set((Math.random() - 0.5) * 0.2, 0.08, (Math.random() - 0.5) * 0.2);
      t.rotation.set(Math.PI / 2, 0, Math.random() * 6); g.add(t);
    }
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
