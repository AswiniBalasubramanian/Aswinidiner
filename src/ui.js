import * as THREE from 'three';

// --- World-space bubbles (sprites drawn on canvas) ------------------------
export function makeBubble() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 192;
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sprite.scale.set(1.0, 0.75, 1);
  sprite.renderOrder = 10;
  sprite.visible = false;

  let last = '';
  function draw(kind, dish, patience) {
    const key = `${kind}|${dish?.id}|${Math.round((patience ?? -1) * 40)}`;
    if (key === last) return;
    last = key;
    ctx.clearRect(0, 0, 256, 192);
    // Bubble body
    ctx.fillStyle = 'rgba(248,243,235,0.96)';
    ctx.strokeStyle = 'rgba(27,23,19,0.18)';
    ctx.lineWidth = 3;
    roundRect(ctx, 28, 14, 200, 128, 26);
    ctx.fill(); ctx.stroke();
    // Tail
    ctx.beginPath();
    ctx.moveTo(112, 140); ctx.lineTo(128, 168); ctx.lineTo(144, 140); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(27,23,19,0.18)';
    ctx.beginPath(); ctx.moveTo(112, 141); ctx.lineTo(128, 168); ctx.lineTo(144, 141); ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (kind === 'think') {
      ctx.fillStyle = '#4a423a';
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(104 + i * 24, 78, 6, 0, 7); ctx.fill(); }
    } else if (kind === 'dish' || kind === 'ordered') {
      drawDish(ctx, 128, 66, dish);
      ctx.fillStyle = '#1b1713';
      ctx.font = '700 22px "Noto Serif KR", serif';
      ctx.fillText(dish.kr, 128, 112);
      if (kind === 'ordered') {
        ctx.fillStyle = '#c9a24b';
        ctx.beginPath(); ctx.arc(206, 36, 9, 0, 7); ctx.fill();
        ctx.fillStyle = '#1b1713';
        ctx.font = '700 13px Inter, sans-serif';
        ctx.fillText('✓', 206, 37);
      }
    } else if (kind === 'happy') {
      ctx.fillStyle = '#c94a3a';
      heart(ctx, 128, 78, 26);
    } else if (kind === 'angry') {
      ctx.strokeStyle = '#8a2f22'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(104, 60); ctx.lineTo(152, 96); ctx.moveTo(152, 60); ctx.lineTo(104, 96); ctx.stroke();
    } else if (kind === 'pay') {
      ctx.fillStyle = '#1b1713';
      ctx.font = '600 30px Inter, sans-serif';
      ctx.fillText(dish, 128, 80);
    }
    // Patience bar
    if (patience != null) {
      const x = 56, y = 150 - 22, w = 144, h = 7;
      ctx.fillStyle = 'rgba(27,23,19,0.12)';
      roundRect(ctx, x, y + 14, w, h, 4); ctx.fill();
      ctx.fillStyle = patience > 0.5 ? '#6b8f71' : patience > 0.25 ? '#c9a24b' : '#b5462e';
      roundRect(ctx, x, y + 14, Math.max(6, w * patience), h, 4); ctx.fill();
    }
    tex.needsUpdate = true;
  }

  return { sprite, draw, show() { sprite.visible = true; }, hide() { sprite.visible = false; } };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function heart(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.7);
  ctx.bezierCurveTo(x - s * 1.2, y - s * 0.2, x - s * 0.5, y - s * 1.1, x, y - s * 0.4);
  ctx.bezierCurveTo(x + s * 0.5, y - s * 1.1, x + s * 1.2, y - s * 0.2, x, y + s * 0.7);
  ctx.fill();
}

function drawDish(ctx, x, y, dish) {
  // Plate
  ctx.fillStyle = '#ece5d8';
  ctx.beginPath(); ctx.ellipse(x, y + 6, 40, 16, 0, 0, 7); ctx.fill();
  if (dish.id === 'bibimbap') {
    ctx.fillStyle = '#2f2a26'; ctx.beginPath(); ctx.ellipse(x, y, 30, 14, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#f6f1e6'; ctx.beginPath(); ctx.ellipse(x, y - 8, 26, 10, 0, 0, 7); ctx.fill();
    ['#d8a341', '#7d9b6a', '#c94a3a', '#5b3a2a', '#d88a5b'].forEach((c, i) => {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x - 18 + i * 9, y - 10, 5, 0, 7); ctx.fill();
    });
    ctx.fillStyle = '#f0b23c'; ctx.beginPath(); ctx.arc(x, y - 12, 6, 0, 7); ctx.fill();
  } else if (dish.id === 'ramyeon') {
    ctx.fillStyle = '#d9dde0'; ctx.beginPath(); ctx.ellipse(x, y, 32, 14, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#b8452e'; ctx.beginPath(); ctx.ellipse(x, y - 7, 27, 10, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#e9c97a'; ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x - 12 + i * 8, y - 8, 6, 3.3, 6); ctx.stroke(); }
  } else if (dish.id === 'kimbap') {
    for (let i = 0; i < 5; i++) {
      const cx = x - 28 + i * 14;
      ctx.fillStyle = '#2f3a2c'; ctx.beginPath(); ctx.arc(cx, y - 2, 8, 0, 7); ctx.fill();
      ctx.fillStyle = '#f6f1e6'; ctx.beginPath(); ctx.arc(cx, y - 2, 6, 0, 7); ctx.fill();
      ctx.fillStyle = '#d8a341'; ctx.beginPath(); ctx.arc(cx, y - 2, 2.5, 0, 7); ctx.fill();
    }
  } else if (dish.id === 'bulgogi') {
    ctx.fillStyle = '#2a2624'; ctx.beginPath(); ctx.ellipse(x, y, 32, 13, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#6b3a22';
    for (let i = 0; i < 6; i++) { ctx.save(); ctx.translate(x - 20 + i * 8, y - 4 + (i % 2) * 4); ctx.rotate(0.4 * (i % 3)); roundRect(ctx, -7, -3, 14, 6, 3); ctx.fill(); ctx.restore(); }
    ctx.fillStyle = '#7aa356'; ctx.beginPath(); ctx.arc(x + 10, y - 8, 4, 0, 7); ctx.fill();
  } else {
    ctx.fillStyle = '#c8402c'; ctx.beginPath(); ctx.ellipse(x, y - 2, 30, 11, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#e9d6c5';
    for (let i = 0; i < 5; i++) { ctx.beginPath(); roundRect(ctx, x - 24 + i * 11, y - 9, 8, 12, 3); ctx.fill(); }
  }
}

// --- Progress bar sprite ------------------------------------------------
export function makeProgress() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 24;
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sprite.scale.set(0.8, 0.15, 1);
  sprite.renderOrder = 10;
  sprite.visible = false;
  return {
    sprite,
    set(p) {
      ctx.clearRect(0, 0, 128, 24);
      ctx.fillStyle = 'rgba(27,23,19,0.35)';
      roundRect(ctx, 2, 6, 124, 12, 6); ctx.fill();
      ctx.fillStyle = '#f5efe6';
      roundRect(ctx, 4, 8, Math.max(4, 120 * p), 8, 4); ctx.fill();
      tex.needsUpdate = true;
    },
  };
}

// --- HUD ----------------------------------------------------------------
export const hud = {
  day: document.getElementById('stat-day'),
  time: document.getElementById('stat-time'),
  served: document.getElementById('stat-served'),
  money: document.getElementById('stat-money'),
  hint: document.getElementById('hint'),
  tickets: document.getElementById('tickets'),
  overlay: document.getElementById('overlay'),
  card: document.getElementById('card'),
  cardTitle: document.getElementById('card-title'),
  resultMoney: document.getElementById('result-money'),
  resultSub: document.getElementById('result-sub'),
  start: document.getElementById('start'),
  level: document.getElementById('stat-level'),
  target: document.getElementById('stat-target'),
  targetBar: document.getElementById('stat-target-bar'),
  wallet: document.getElementById('stat-wallet'),
  marketOpen: document.getElementById('market-open'),
  marketCard: document.getElementById('market-card'),
  marketWallet: document.getElementById('market-wallet'),
  marketLede: document.getElementById('market-lede'),
  marketItems: document.getElementById('market-items'),
  marketDone: document.getElementById('market-done'),
  marketLevels: document.getElementById('market-levels'),
  nameField: document.getElementById('name-field'),
  nameInput: document.getElementById('diner-name'),
  brandKr: document.querySelector('.brand-kr'),
  brandEn: document.querySelector('.brand-en'),
  levelsBtn: document.getElementById('levels-btn'),
  levelsOpen: document.getElementById('levels-open'),
  levelsCard: document.getElementById('levels-card'),
  levelsMax: document.getElementById('levels-max'),
  levelsList: document.getElementById('levels-list'),
  levelsClose: document.getElementById('levels-close'),
};

export function won(n) {
  return '₩' + n.toLocaleString('en-US');
}

export function toast(text) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1700);
}

let ticketKey = '';
export function renderTickets(tickets) {
  const key = tickets.map((t) => t.id).join(',');
  if (key !== ticketKey) {
    ticketKey = key;
    hud.tickets.innerHTML = tickets.map((t) => `
      <div class="ticket" data-id="${t.id}">
        <span class="sw" style="background:${t.dish.color}"></span>
        <div class="body">
          <div class="name"><span>${t.dish.name}</span><span class="st"></span></div>
          <div class="bar"><i></i></div>
        </div>
      </div>`).join('');
  }
  for (const t of tickets) {
    const el = hud.tickets.querySelector(`[data-id="${t.id}"]`);
    if (!el) continue;
    const st = el.querySelector('.st');
    if (st.textContent !== t.status) st.textContent = t.status;
    el.querySelector('.bar i').style.width = `${Math.round(t.progress * 100)}%`;
  }
}
