import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Collapse the static scenery into one mesh per material (per visibility group), so the
// ~1,000 little boxes and cylinders that make up the diner cost a handful of draw calls.
// Interactive or animated pieces opt out with userData.noMerge on themselves or an ancestor;
// level areas (userData.mergeBucket) are merged separately so they can still be toggled.
export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const buckets = new Map();
  const victims = [];

  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.userData.merged) return;
    const mat = o.material;
    if (!mat || Array.isArray(mat) || mat.transparent || mat.visible === false) return;
    // Walk up: skip opted-out subtrees, find the bucket owner.
    let owner = root, p = o;
    while (p && p !== root) {
      if (p.userData.noMerge) return;
      if (p.userData.mergeBucket && owner === root) owner = p;
      p = p.parent;
    }
    if (!p) return;
    const key = owner.uuid + '|' + mat.uuid;
    let b = buckets.get(key);
    if (!b) buckets.set(key, (b = { owner, mat, geos: [], cast: false, receive: false }));
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone());
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    // Bake into the owner's local space so the owner can still be hidden/shown.
    const m = new THREE.Matrix4().copy(owner.matrixWorld).invert().multiply(o.matrixWorld);
    g.applyMatrix4(m);
    g.clearGroups();
    b.geos.push(g);
    b.cast ||= o.castShadow;
    b.receive ||= o.receiveShadow;
    victims.push(o);
  });

  let merged = 0;
  for (const b of buckets.values()) {
    if (b.geos.length < 2) { b.geos.forEach((g) => g.dispose()); continue; }
    const geo = mergeGeometries(b.geos, false);
    b.geos.forEach((g) => g.dispose());
    if (!geo) continue;
    const mesh = new THREE.Mesh(geo, b.mat);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = b.receive;
    mesh.userData.merged = true;
    mesh.matrixAutoUpdate = false;
    b.owner.add(mesh);
    merged++;
  }
  // Remove the originals that went into a merged mesh.
  const mergedKeys = new Set([...buckets.entries()].filter(([, b]) => b.geos.length >= 2).map(([k]) => k));
  for (const o of victims) {
    let owner = root, p = o.parent;
    while (p && p !== root) { if (p.userData.mergeBucket && owner === root) owner = p; p = p.parent; }
    if (!mergedKeys.has(owner.uuid + '|' + o.material.uuid)) continue;
    o.parent.remove(o);
    o.geometry.dispose();
  }
  // Empty groups left behind are harmless; freeze static transforms.
  root.traverse((o) => { if (!o.userData.noMerge && o !== root && !o.isLight) o.matrixAutoUpdate = false; });
  return merged;
}
