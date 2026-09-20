import * as THREE from 'three';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function tex(c, repeat = [1, 1], color = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function noise(ctx, w, h, alpha, count = 4000) {
  for (let i = 0; i < count; i++) {
    const v = Math.floor(Math.random() * 255);
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 2 + Math.random() * 3);
  }
}

export function brickTexture(repeat) {
  const w = 512, h = 512;
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#b9a99a';
  ctx.fillRect(0, 0, w, h);
  const bw = 64, bh = 30, gap = 4;
  const palette = ['#9a4a3a', '#a5533f', '#8f4436', '#b05c47', '#9d4e3c', '#874033'];
  for (let y = 0, row = 0; y < h; y += bh + gap, row++) {
    const off = row % 2 ? bw / 2 : 0;
    for (let x = -bw; x < w + bw; x += bw + gap) {
      ctx.fillStyle = palette[Math.floor(Math.random() * palette.length)];
      ctx.fillRect(x + off, y, bw, bh);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(x + off, y + bh - 3, bw, 3);
    }
  }
  noise(ctx, w, h, 0.06, 6000);
  return tex(c, repeat);
}

export function plasterTexture(repeat) {
  const w = 256, h = 256;
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e8e2d6';
  ctx.fillRect(0, 0, w, h);
  noise(ctx, w, h, 0.05, 3000);
  return tex(c, repeat);
}

export function tileFloorTexture(repeat) {
  const w = 512, h = 512;
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#cbbfae';
  ctx.fillRect(0, 0, w, h);
  const r = 40;
  const dx = r * 1.732, dy = r * 1.5;
  const tones = ['#d9cfbf', '#cdbfad', '#c2b39f', '#d3c6b4', '#b8a996'];
  for (let row = -1; row < h / dy + 2; row++) {
    for (let col = -1; col < w / dx + 2; col++) {
      const cx = col * dx + (row % 2 ? dx / 2 : 0);
      const cy = row * dy;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i + Math.PI / 6;
        const px = cx + (r - 2.5) * Math.cos(a);
        const py = cy + (r - 2.5) * Math.sin(a);
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = tones[Math.floor(Math.random() * tones.length)];
      ctx.fill();
    }
  }
  noise(ctx, w, h, 0.05, 5000);
  return tex(c, repeat);
}

export function woodTexture(repeat, base = '#7a4b2a', grain = '#5a341c') {
  const w = 512, h = 512;
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = grain;
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 90; i++) {
    const y = Math.random() * h;
    ctx.globalAlpha = 0.15 + Math.random() * 0.35;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.02 + i) * 3 + (Math.random() - 0.5) * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  noise(ctx, w, h, 0.05, 3000);
  return tex(c, repeat);
}

export function stoneTexture(repeat) {
  const w = 512, h = 512;
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#a89d8c';
  ctx.fillRect(0, 0, w, h);
  const s = 128;
  for (let y = 0; y < h; y += s) {
    for (let x = 0; x < w; x += s) {
      const v = 160 + Math.random() * 28;
      ctx.fillStyle = `rgb(${v},${v - 8},${v - 22})`;
      ctx.fillRect(x + 2, y + 2, s - 4, s - 4);
    }
  }
  noise(ctx, w, h, 0.08, 6000);
  return tex(c, repeat);
}

export function groundTexture(repeat) {
  const w = 512, h = 512;
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#b3a793';
  ctx.fillRect(0, 0, w, h);
  noise(ctx, w, h, 0.07, 9000);
  return tex(c, repeat);
}

export function roofTileTexture(repeat) {
  const w = 256, h = 256;
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#9096a0';
  ctx.fillRect(0, 0, w, h);
  noise(ctx, w, h, 0.08, 3000);
  return tex(c, repeat);
}

export function labelTexture(text, opts = {}) {
  const { w = 256, h = 96, bg = 'rgba(0,0,0,0)', fg = '#f1e7d4', font = '700 54px "Noto Serif KR", serif' } = opts;
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = fg;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function toonGradient() {
  const c = canvas(4, 1);
  const ctx = c.getContext('2d');
  const stops = ['#6a6a6a', '#a8a8a8', '#e6e6e6', '#ffffff'];
  stops.forEach((s, i) => { ctx.fillStyle = s; ctx.fillRect(i, 0, 1, 1); });
  const t = new THREE.CanvasTexture(c);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  return t;
}
