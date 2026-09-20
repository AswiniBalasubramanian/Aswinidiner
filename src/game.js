import * as THREE from 'three';
import { LAYOUT, addCourtyardTable, addExtraLanterns, addSignboard, buildLevelArea, setSignText } from './world.js';
import { makeCharacter, makeDish, DISHES } from './characters.js';
import { makeBubble, makeProgress, hud, won, toast, renderTickets } from './ui.js';

const SERVICE_SECONDS = 180;
const SAVE_KEY = 'aswini-diner-save-v1';

// Level progression: daily sales target and how busy the room gets.
// Targets sit well below what a full service can earn (~₩60–90k), and climb each level.
export const LEVELS = [
  { level: 1, target: 20000, queueMax: 3, spawn: [8, 13], name: 'Level 1', title: 'The counter', unlocks: 'Four stools at the bar, the chef and you.' },
  { level: 2, target: 35000, queueMax: 3, spawn: [7, 11], name: 'Level 2', title: 'The courtyard', unlocks: 'String lights across the eave and a garden table for two.' },
  { level: 3, target: 55000, queueMax: 4, spawn: [6, 10], name: 'Level 3', title: 'The deck', unlocks: 'A timber deck under a vine pergola on the right, with a table for two.' },
  { level: 4, target: 80000, queueMax: 4, spawn: [5, 9], name: 'Level 4', title: 'The pyeongsang', unlocks: 'A raised wooden platform by the jars with floor cushions and a low table.' },
  { level: 5, target: 110000, queueMax: 5, spawn: [4, 8], name: 'Level 5', title: 'Night market', unlocks: 'Red lanterns along the front, bamboo planters and a third courtyard table.' },
];

export const MARKET = [
  { id: 'table', icon: '床', name: 'Courtyard table', price: 25000, desc: 'A round table by the garden with two more seats. More covers per service.' },
  { id: 'stove', icon: '火', name: 'Twin-burner stove', price: 30000, desc: 'The chef plates every dish 30% faster.' },
  { id: 'lanterns', icon: '灯', name: 'Warm lanterns', price: 15000, desc: 'Two more lanterns on the eaves. Guests wait 25% longer before leaving.' },
  { id: 'sign', icon: '看', name: 'Street signboard', price: 12000, desc: 'An OPEN board at the gate. Guests arrive more often.' },
  { id: 'bulgogi', icon: '肉', name: 'Bulgogi on the menu', price: 35000, desc: 'A ₩12,000 house special. Slower to cook, big ticket.' },
];

function walkTo(rig, target, speed, dt) {
  const p = rig.group.position;
  const dx = target.x - p.x, dz = target.z - p.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.05) { rig.walking = false; return true; }
  const step = Math.min(d, speed * dt);
  p.x += (dx / d) * step;
  p.z += (dz / d) * step;
  rig.group.rotation.y = Math.atan2(dx, dz);
  rig.walking = true;
  return false;
}

function faceDir(rig, dx, dz) {
  rig.group.rotation.y = Math.atan2(dx, dz);
}

// Seat geometry helpers — counter stools and courtyard tables share one interface.
const seatRot = (s) => s.rot ?? Math.PI;
const seatSit = (s) => s.sit ?? { x: s.x, z: s.z + 0.02 };
const seatApproach = (s) => s.approach ?? { x: s.x, z: s.z + 0.95 };
const seatDeliver = (s) => s.deliver ?? { x: s.x + 0.55, z: s.z + 0.75 };
const seatPlate = (s) => s.plate ?? { x: s.x, y: 1.03, z: LAYOUT.counterZ + 0.1 };
const seatArrive = (s) => s.table ? seatApproach(s) : { x: s.x, z: s.z + 0.6 };

export class Game {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.customers = [];
    this.tickets = [];
    this.passPlates = [];
    this.money = 0;
    this.served = 0;
    this.lost = 0;
    this.time = SERVICE_SECONDS;
    this.running = false;
    this.spawnTimer = 2;
    this.nextId = 1;

    // Persistent progress
    const save = this.load();
    this.day = save.day;
    this.level = save.level;
    this.maxLevel = Math.max(save.maxLevel, save.level);
    this.wallet = save.wallet;
    this.name = save.name;
    this.upgrades = new Set(save.upgrades);
    this.applied = new Set();
    this.levelGroups = new Map();
    this.paused = false;
    this.seats = LAYOUT.stools.map(() => null);
    this.applyUpgrades();
    this.applyName();

    // Chef
    this.chef = makeCharacter({ hair: '#1f1a17', top: '#c94a3a', bottom: '#2c2a33', apron: '#f4efe6', hairStyle: 'bun', skin: '#f3d4b6' });
    this.chef.group.position.copy(LAYOUT.chefHome);
    faceDir(this.chef, 0, 1);
    scene.add(this.chef.group);
    this.chefState = 'idle';
    this.chefProgress = makeProgress();
    this.chefProgress.sprite.position.set(0, 2.05, 0);
    this.chef.group.add(this.chefProgress.sprite);
    this.cooking = null;

    // Server (player)
    this.server = makeCharacter({ hair: '#1f1a17', top: '#b9c46a', bottom: '#d8a341', stripes: false, hairStyle: 'short', skin: '#f3d4b6' });
    this.server.group.position.copy(LAYOUT.serverHome);
    faceDir(this.server, -1, 0.2);
    scene.add(this.server.group);
    this.serverTask = null;
    this.carrying = null;

    // Steam particles at stove
    this.steam = [];
    const sm = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false });
    for (let i = 0; i < 10; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), sm.clone());
      s.position.set(LAYOUT.stove.x - 0.28, 1.35, -3.7);
      s.visible = false;
      s.userData.t = i / 10;
      scene.add(s);
      this.steam.push(s);
    }

    // The market is reachable from the start screen once there is something to spend.
    hud.marketOpen.hidden = this.wallet <= 0 && this.upgrades.size === 0;
    // First visit: ask for the diner's name before opening.
    hud.nameField.hidden = !!this.name;
    hud.start.disabled = !this.name;
    if (!this.name) setTimeout(() => hud.nameInput.focus(), 300);
    this.updateHud();
  }

  // --- Persistence ----------------------------------------------------------
  load() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (s && typeof s === 'object') return { day: s.day || 1, level: s.level || 1, maxLevel: s.maxLevel || 1, wallet: s.wallet || 0, upgrades: s.upgrades || [], name: s.name || '' };
    } catch { /* ignore */ }
    return { day: 1, level: 1, maxLevel: 1, wallet: 0, upgrades: [], name: '' };
  }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ day: this.day, level: this.level, maxLevel: this.maxLevel, wallet: this.wallet, upgrades: [...this.upgrades], name: this.name }));
    } catch { /* ignore */ }
  }

  get levelData() { return LEVELS[Math.min(this.level, LEVELS.length) - 1]; }
  get target() { return this.levelData.target; }
  get menu() { return DISHES.filter((d) => !d.locked || this.upgrades.has(d.id)); }
  get cookScale() { return this.upgrades.has('stove') ? 0.7 : 1; }
  get patienceScale() { return this.upgrades.has('lanterns') ? 1.25 : 1; }
  get spawnScale() { return this.upgrades.has('sign') ? 0.75 : 1; }

  // Build purchased additions and the space each reached level unlocks (idempotent),
  // then show only the areas that belong to the level being played.
  applyUpgrades() {
    const add = (key, fn) => { if (this.applied.has(key)) return; this.applied.add(key); fn(); };
    const resize = () => { this.seats = LAYOUT.stools.map((_, i) => this.seats[i] || null); };
    if (this.upgrades.has('table')) add('table', () => { addCourtyardTable(this.world, 2.4, 3.2, '마당'); resize(); });
    if (this.upgrades.has('lanterns')) add('lanterns', () => addExtraLanterns(this.world));
    if (this.upgrades.has('sign')) add('sign', () => addSignboard());
    for (let lv = 2; lv <= this.maxLevel; lv++) {
      if (!this.levelGroups.has(lv)) { this.levelGroups.set(lv, buildLevelArea(this.world, lv)); resize(); }
    }
    for (const [lv, g] of this.levelGroups) g.visible = lv <= this.level;
  }

  seatOpen(i) { return (LAYOUT.stools[i]?.level ?? 1) <= this.level; }

  applyName() {
    const n = this.name || 'Aswini Diner';
    hud.brandKr.textContent = n;
    hud.brandEn.innerHTML = `Diner · <b id="stat-level">Level 1</b>`;
    hud.level = document.getElementById('stat-level');
    setSignText(n);
    document.title = n;
  }

  // --- Flow -----------------------------------------------------------------
  start() {
    if (!this.name) {
      const v = hud.nameInput.value.trim();
      if (!v) return;
      this.name = v.slice(0, 24);
      hud.nameField.hidden = true;
      this.applyName();
      this.save();
      toast(this.name);
    }
    clearTimeout(this.marketTimer);
    this.paused = false;
    this.running = true;
    this.time = SERVICE_SECONDS;
    this.money = 0; this.served = 0; this.lost = 0;
    this.spawnTimer = 1.5;
    hud.overlay.classList.add('hidden');
    hud.marketCard.hidden = true;
    hud.levelsCard.hidden = true;
    hud.card.hidden = false;
    this.setHint('Click an empty stool to seat a waiting guest.');
  }

  // Clear everyone out so a level switch starts clean.
  resetService() {
    for (const c of [...this.customers]) this.removeCustomer(c);
    for (const p of this.passPlates) this.scene.remove(p.mesh);
    this.passPlates = [];
    if (this.carrying) { this.server.hold.remove(this.carrying.mesh); this.server.carrying = false; this.carrying = null; }
    if (this.chef.hold.children[0]) this.chef.hold.remove(this.chef.hold.children[0]);
    this.chef.carrying = false;
    this.chefState = 'idle';
    this.cooking = null;
    this.chefProgress.sprite.visible = false;
    this.tickets = [];
    this.serverTask = null;
    this.seats = LAYOUT.stools.map(() => null);
    this.money = 0; this.served = 0; this.lost = 0;
    this.running = false;
    this.time = SERVICE_SECONDS;
  }

  setHint(t) { if (hud.hint.textContent !== t) hud.hint.textContent = t; }

  updateHud() {
    hud.day.textContent = this.day;
    const m = Math.floor(Math.max(0, this.time) / 60), s = Math.floor(Math.max(0, this.time) % 60);
    hud.time.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    hud.served.textContent = this.served;
    hud.money.textContent = won(this.money);
    hud.level.textContent = this.levelData.name;
    hud.target.textContent = won(this.target);
    hud.target.classList.toggle('met', this.money >= this.target);
    hud.targetBar.style.width = `${Math.min(100, (this.money / this.target) * 100)}%`;
    hud.wallet.textContent = won(this.wallet);
    renderTickets(this.tickets);
  }

  // --- Customers ----------------------------------------------------------
  spawnCustomer() {
    const rig = makeCharacter({ hairStyle: ['short', 'bun', 'long'][Math.floor(Math.random() * 3)], hat: Math.random() > 0.8 ? 'cap' : null, scale: 0.94 + Math.random() * 0.1 });
    rig.group.position.copy(LAYOUT.exit);
    this.scene.add(rig.group);
    const bubble = makeBubble();
    bubble.sprite.position.set(0, 2.3, 0);
    rig.group.add(bubble.sprite);
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.9, 10), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 0.95;
    rig.group.add(hit);
    const c = { id: this.nextId++, rig, bubble, hit, state: 'queue', seat: -1, dish: null, patience: 1, patienceMax: 1, timer: 0, plate: null };
    hit.userData = { type: 'customer', customer: c };
    this.customers.push(c);
    return c;
  }

  queueSlot(c) {
    const q = this.customers.filter((x) => x.state === 'queue');
    return LAYOUT.queue[Math.min(q.indexOf(c), LAYOUT.queue.length - 1)];
  }

  seatCustomer(index) {
    const waiting = this.customers.find((c) => c.state === 'queue');
    if (!waiting || this.seats[index] || !this.seatOpen(index)) return false;
    waiting.state = 'toSeat';
    waiting.seat = index;
    this.seats[index] = waiting;
    return true;
  }

  removeCustomer(c) {
    this.scene.remove(c.rig.group);
    if (c.plate) { this.scene.remove(c.plate); c.plate = null; }
    this.customers = this.customers.filter((x) => x !== c);
  }

  updateCustomer(c, dt) {
    const s = LAYOUT.stools[c.seat] || null;
    switch (c.state) {
      case 'queue': {
        walkTo(c.rig, this.queueSlot(c), 1.6, dt) && faceDir(c.rig, -1, -0.3);
        break;
      }
      case 'toSeat': {
        const a = seatArrive(s);
        if (walkTo(c.rig, new THREE.Vector3(a.x, 0, a.z), 1.7, dt)) {
          c.state = 'sitting';
          c.timer = 0;
        }
        break;
      }
      case 'sitting': {
        c.timer += dt;
        const p = c.rig.group.position;
        const sit = seatSit(s);
        p.x = THREE.MathUtils.lerp(p.x, sit.x, dt * 5);
        p.z = THREE.MathUtils.lerp(p.z, sit.z, dt * 5);
        c.rig.group.rotation.y = THREE.MathUtils.lerp(c.rig.group.rotation.y, seatRot(s), dt * 6);
        c.rig.walking = false;
        if (c.timer > 0.6) {
          c.rig.sitting = true;
          c.rig.sitY = s.sitY ?? 0.42;
          p.set(sit.x, 0, sit.z);
          c.rig.group.rotation.y = seatRot(s);
          c.state = 'thinking';
          c.timer = 0;
          c.bubble.draw('think');
          c.bubble.show();
        }
        break;
      }
      case 'thinking': {
        c.timer += dt;
        if (c.timer > 1.2) {
          const menu = this.menu;
          c.dish = menu[Math.floor(Math.random() * menu.length)];
          c.state = 'wantsOrder';
          c.patienceMax = 28 * this.patienceScale;
          c.patience = 1;
        }
        break;
      }
      case 'wantsOrder': {
        c.patience -= dt / c.patienceMax;
        c.bubble.draw('dish', c.dish, c.patience);
        if (c.patience <= 0) this.customerLeaves(c, false);
        break;
      }
      case 'ordered': {
        c.patience -= dt / c.patienceMax;
        c.bubble.draw('ordered', c.dish, c.patience);
        if (c.patience <= 0) this.customerLeaves(c, false);
        break;
      }
      case 'eating': {
        c.timer += dt;
        c.bubble.draw('happy');
        c.rig.head.rotation.x = Math.sin(c.timer * 6) * 0.08;
        if (c.timer > 5) {
          const tip = c.patience > 0.6 ? Math.round(c.dish.price * 0.25 / 500) * 500 : 0;
          const total = c.dish.price + tip;
          this.money += total;
          this.served++;
          c.bubble.draw('pay', won(total));
          c.timer = 0;
          c.state = 'paying';
          if (tip) toast(`Tip ${won(tip)}`);
          if (this.money >= this.target && this.money - total < this.target) setTimeout(() => toast('Daily target reached'), 600);
        }
        break;
      }
      case 'paying': {
        c.timer += dt;
        if (c.timer > 1.2) this.customerLeaves(c, true);
        break;
      }
      case 'leaving': {
        const out = new THREE.Vector3(5.6, 0, 2.5);
        const tgt = c.timer < 1 ? out : LAYOUT.exit;
        if (walkTo(c.rig, tgt, 1.8, dt)) c.timer = 1;
        if (c.rig.group.position.distanceTo(LAYOUT.exit) < 0.2) this.removeCustomer(c);
        break;
      }
    }
    c.rig.update(dt);
  }

  customerLeaves(c, happy) {
    if (!happy) {
      c.bubble.draw('angry');
      this.lost++;
      this.tickets = this.tickets.filter((t) => t.customer !== c);
      this.passPlates = this.passPlates.filter((p) => {
        if (p.customer === c) { this.scene.remove(p.mesh); return false; }
        return true;
      });
      if (this.carrying && this.carrying.customer === c) this.dropCarried();
    }
    if (c.plate) { this.scene.remove(c.plate); c.plate = null; }
    const s = LAYOUT.stools[c.seat];
    if (c.seat >= 0) this.seats[c.seat] = null;
    c.rig.sitting = false;
    if (s) { const a = seatArrive(s); c.rig.group.position.set(a.x, 0, a.z); }
    c.state = 'leaving';
    c.timer = 0;
    setTimeout(() => c.bubble.hide(), 900);
  }

  // --- Orders / chef --------------------------------------------------------
  takeOrder(c) {
    c.state = 'ordered';
    c.patienceMax = (c.dish.cook * this.cookScale + 26) * this.patienceScale;
    c.patience = 1;
    this.tickets.push({ id: c.id, dish: c.dish, customer: c, status: 'queued', progress: 0 });
    toast(c.dish.name);
  }

  updateChef(dt) {
    const chef = this.chef;
    if (this.chefState === 'idle') {
      const next = this.tickets.find((t) => t.status === 'queued');
      if (next) {
        next.status = 'cooking';
        this.cooking = next;
        this.chefState = 'toStove';
      } else {
        walkTo(chef, LAYOUT.chefHome, 2.0, dt) && faceDir(chef, 0, 1);
      }
    } else if (this.chefState === 'toStove') {
      if (walkTo(chef, LAYOUT.stove, 2.0, dt)) {
        faceDir(chef, 0, -1);
        this.chefState = 'cooking';
        this.cookT = 0;
        this.chefProgress.sprite.visible = true;
      }
    } else if (this.chefState === 'cooking') {
      this.cookT += dt;
      const p = Math.min(1, this.cookT / (this.cooking.dish.cook * this.cookScale));
      this.cooking.progress = p;
      this.chefProgress.set(p);
      chef.armL.rotation.x = -1.1 + Math.sin(this.cookT * 10) * 0.25;
      chef.armR.rotation.x = -1.1 - Math.sin(this.cookT * 10) * 0.25;
      if (p >= 1) {
        this.chefProgress.sprite.visible = false;
        this.chefState = 'toPass';
        const mesh = makeDish(this.cooking.dish);
        this.chef.hold.add(mesh);
        chef.carrying = true;
      }
    } else if (this.chefState === 'toPass') {
      if (walkTo(chef, new THREE.Vector3(LAYOUT.pass.x, 0, LAYOUT.pass.z - 0.75), 2.0, dt)) {
        faceDir(chef, 0, 1);
        const mesh = this.chef.hold.children[0];
        this.chef.hold.remove(mesh);
        chef.carrying = false;
        const slot = this.passPlates.length;
        mesh.position.set(LAYOUT.pass.x - slot * 0.42, 1.03, LAYOUT.pass.z);
        this.scene.add(mesh);
        const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.5, 8), new THREE.MeshBasicMaterial({ visible: false }));
        hit.position.y = 0.15;
        mesh.add(hit);
        const plate = { mesh, hit, dish: this.cooking.dish, customer: this.cooking.customer, ticket: this.cooking };
        hit.userData = { type: 'plate', plate };
        this.passPlates.push(plate);
        this.cooking.status = 'ready';
        this.cooking = null;
        this.chefState = 'idle';
        this.setHint('A plate is ready on the pass. Click it to pick it up.');
      }
    }
    if (this.chefState !== 'cooking') chef.update(dt); else { chef.t += dt; chef.body.position.y = Math.sin(chef.t * 10) * 0.01; }

    const cooking = this.chefState === 'cooking';
    for (const s of this.steam) {
      s.visible = cooking;
      if (!cooking) continue;
      s.userData.t = (s.userData.t + dt * 0.5) % 1;
      const t = s.userData.t;
      s.position.set(LAYOUT.stove.x - 0.28 + Math.sin(t * 9) * 0.06, 1.35 + t * 0.6, -3.7 + Math.cos(t * 7) * 0.05);
      s.scale.setScalar(0.6 + t * 1.4);
      s.material.opacity = 0.35 * (1 - t);
    }
  }

  // --- Server -----------------------------------------------------------------
  goServer(target, onArrive, hint) {
    this.serverTask = { target, onArrive };
    if (hint) this.setHint(hint);
  }

  pickPlate(plate) {
    if (this.carrying) { this.setHint('Your hands are full — deliver this plate first.'); return; }
    this.goServer(new THREE.Vector3(plate.mesh.position.x, 0, LAYOUT.pass.z + 0.85), () => {
      if (!this.passPlates.includes(plate)) return;
      faceDir(this.server, 0, -1);
      this.passPlates = this.passPlates.filter((p) => p !== plate);
      this.passPlates.forEach((p, i) => { p.mesh.position.x = LAYOUT.pass.x - i * 0.42; });
      plate.mesh.remove(plate.hit);
      this.scene.remove(plate.mesh);
      plate.mesh.position.set(0, 0, 0);
      this.server.hold.add(plate.mesh);
      this.server.carrying = true;
      this.carrying = plate;
      plate.ticket.status = 'carrying';
      const seatName = LAYOUT.stools[plate.customer.seat]?.name ?? '';
      this.setHint(`Carrying ${plate.dish.name}. Deliver it to the guest at ${seatName}.`);
    }, 'Heading to the pass…');
  }

  dumpPlate() {
    if (!this.carrying) { this.setHint('Nothing to throw away.'); return; }
    const b = this.world.bin.group.position;
    this.goServer(new THREE.Vector3(b.x - 0.1, 0, b.z + 0.7), () => {
      if (!this.carrying) return;
      faceDir(this.server, 0, -1);
      const plate = this.carrying;
      this.server.hold.remove(plate.mesh);
      this.server.carrying = false;
      this.carrying = null;
      if (plate.customer.state === 'ordered') {
        plate.ticket.status = 'queued';
        plate.ticket.progress = 0;
        this.setHint(`${plate.dish.name} binned — the chef will remake it.`);
      } else {
        this.tickets = this.tickets.filter((t) => t !== plate.ticket);
        this.setHint('Plate binned.');
      }
    }, 'Heading to the bin…');
  }

  dropCarried() {
    if (!this.carrying) return;
    this.server.hold.remove(this.carrying.mesh);
    this.server.carrying = false;
    this.tickets = this.tickets.filter((t) => t !== this.carrying.ticket);
    this.carrying = null;
  }

  clickCustomer(c) {
    const s = LAYOUT.stools[c.seat];
    if (c.state === 'wantsOrder') {
      const a = seatApproach(s);
      this.goServer(new THREE.Vector3(a.x, 0, a.z), () => {
        if (c.state !== 'wantsOrder') return;
        faceDir(this.server, s.x - a.x, s.z - a.z);
        this.takeOrder(c);
        this.setHint('Order sent to the kitchen. Seat or serve while the chef cooks.');
      }, 'Taking the order…');
    } else if (this.carrying && c.state === 'ordered') {
      const d = seatDeliver(s);
      this.goServer(new THREE.Vector3(d.x, 0, d.z), () => {
        if (!this.carrying || c.state !== 'ordered') return;
        faceDir(this.server, s.x - d.x, s.z - d.z);
        if (this.carrying.customer !== c) {
          this.setHint('Wrong guest — that plate belongs to someone else.');
          return;
        }
        const plate = this.carrying;
        this.server.hold.remove(plate.mesh);
        this.server.carrying = false;
        this.carrying = null;
        const pp = seatPlate(s);
        plate.mesh.position.set(pp.x, pp.y, pp.z);
        this.scene.add(plate.mesh);
        c.plate = plate.mesh;
        c.state = 'eating';
        c.timer = 0;
        this.tickets = this.tickets.filter((t) => t !== plate.ticket);
        this.setHint('Served. Keep the room moving.');
      }, 'Delivering…');
    } else if (c.state === 'queue') {
      this.setHint('Click an empty stool to seat this guest.');
    }
  }

  updateServer(dt) {
    if (this.serverTask) {
      if (walkTo(this.server, this.serverTask.target, 2.8, dt)) {
        const t = this.serverTask; this.serverTask = null;
        t.onArrive();
      }
    }
    this.server.update(dt, 1.1);
  }

  // --- Interaction ------------------------------------------------------------
  handleClick(hit) {
    if (!this.running || !hit) return;
    const d = hit.userData;
    if (d.type === 'stool') {
      if (this.seats[d.index]) {
        this.clickCustomer(this.seats[d.index]);
      } else if (!this.seatCustomer(d.index)) {
        this.setHint('No guest is waiting right now.');
      } else {
        this.setHint('Guest seated. Click them once they decide what to order.');
      }
    } else if (d.type === 'customer') {
      this.clickCustomer(d.customer);
    } else if (d.type === 'plate') {
      this.pickPlate(d.plate);
    } else if (d.type === 'bin') {
      this.dumpPlate();
    }
  }

  collectHits() {
    const list = [this.world.bin.hit];
    this.world.stools.forEach((s, i) => { if (this.seatOpen(i)) list.push(s.hit); });
    for (const c of this.customers) list.push(c.hit);
    for (const p of this.passPlates) list.push(p.hit);
    return list;
  }

  // --- Loop -------------------------------------------------------------------
  update(dt) {
    if (this.paused) return;
    if (this.running) {
      this.time -= dt;
      this.spawnTimer -= dt;
      const L = this.levelData;
      const queued = this.customers.filter((c) => c.state === 'queue').length;
      if (this.time > 20 && this.spawnTimer <= 0 && queued < L.queueMax && this.customers.length < LAYOUT.stools.length + L.queueMax) {
        this.spawnCustomer();
        const [lo, hi] = L.spawn;
        this.spawnTimer = (lo + Math.random() * (hi - lo)) * this.spawnScale - Math.min(3, (SERVICE_SECONDS - this.time) / 50);
      }
      if (this.time <= 0) this.endService();
    }
    for (const c of [...this.customers]) this.updateCustomer(c, dt);
    this.updateChef(dt);
    this.updateServer(dt);
    const waiting = this.customers.some((c) => c.state === 'queue');
    this.world.stools.forEach((s, i) => {
      const target = waiting && !this.seats[i] && this.running && this.seatOpen(i) ? 0.75 : 0;
      s.ring.material.opacity = THREE.MathUtils.lerp(s.ring.material.opacity, target, dt * 6);
    });
    const binRing = this.world.bin.ring.material;
    binRing.opacity = THREE.MathUtils.lerp(binRing.opacity, this.carrying && this.running ? 0.75 : 0, dt * 6);
    this.updateHud();
  }

  endService() {
    this.running = false;
    for (const c of [...this.customers]) if (c.state !== 'leaving') this.customerLeaves(c, c.state === 'eating' || c.state === 'paying');
    const met = this.money >= this.target;
    this.wallet += this.money;
    this.day++;
    let levelled = false;
    if (met && this.level < LEVELS.length) {
      this.level++;
      if (this.level > this.maxLevel) { this.maxLevel = this.level; levelled = true; }
      this.applyUpgrades();
      this.onLevelView?.(this.level);
    }
    this.save();

    hud.card.classList.add('done');
    hud.cardTitle.textContent = levelled ? `${this.levelData.name} unlocked` : met ? 'Target met' : 'Service closed';
    hud.resultMoney.textContent = won(this.money);
    hud.resultSub.textContent = met
      ? `${this.served} guests served · ${this.lost} walked out · banked to your wallet. Next target ${won(this.target)}. The market is open.`
      : `${this.served} guests served · ${this.lost} walked out · the target was ${won(this.target)}. Try again.`;
    hud.start.textContent = met ? 'Open again' : 'Try again';
    hud.marketOpen.hidden = !met;
    hud.marketCard.hidden = true;
    hud.card.hidden = false;
    hud.overlay.classList.remove('hidden');
    if (met) this.marketTimer = setTimeout(() => { if (!this.running) this.openMarket(); }, 1400);
  }

  // --- Level board --------------------------------------------------------------
  openLevels() {
    this.paused = this.running;
    hud.card.hidden = true;
    hud.marketCard.hidden = true;
    hud.levelsCard.hidden = false;
    hud.overlay.classList.remove('hidden');
    hud.levelsMax.textContent = LEVELS[this.maxLevel - 1].name;
    hud.levelsList.innerHTML = LEVELS.map((L) => {
      const reached = L.level <= this.maxLevel;
      const current = L.level === this.level;
      return `<div class="lvl ${reached ? '' : 'locked'} ${current ? 'current' : ''}">
        <div class="num">${L.level}</div>
        <div>
          <h3>${L.title} ${current ? '<span class="tag">· playing</span>' : ''}</h3>
          <p>${L.unlocks}</p>
          <div class="meta">Target ${won(L.target)} · ${reached ? 'reached' : 'locked'}</div>
        </div>
        <button data-level="${L.level}" ${reached ? '' : 'disabled'}>${current && this.running ? 'Restart' : 'Play'}</button>
      </div>`;
    }).join('');
    hud.levelsList.querySelectorAll('[data-level]').forEach((b) => b.addEventListener('click', () => this.playLevel(+b.dataset.level)));
  }

  closeLevels() {
    hud.levelsCard.hidden = true;
    if (this.running) { this.paused = false; hud.overlay.classList.add('hidden'); }
    else { hud.card.hidden = false; }
  }

  playLevel(n) {
    if (n < 1 || n > this.maxLevel) return;
    this.resetService();
    this.level = n;
    this.applyUpgrades();
    this.save();
    this.start();
    this.onLevelView?.(n);
    toast(`${LEVELS[n - 1].name} · ${LEVELS[n - 1].title}`);
  }

  // --- Market -----------------------------------------------------------------
  openMarket() {
    hud.card.hidden = true;
    hud.levelsCard.hidden = true;
    hud.marketCard.hidden = false;
    hud.overlay.classList.remove('hidden');
    this.renderMarket();
  }

  buy(id) {
    const item = MARKET.find((m) => m.id === id);
    if (!item || this.upgrades.has(id) || this.wallet < item.price) return;
    this.wallet -= item.price;
    this.upgrades.add(id);
    toast(item.name);
    this.applyUpgrades();
    this.save();
    this.renderMarket();
    this.updateHud();
  }

  renderMarket() {
    hud.marketWallet.textContent = won(this.wallet);
    hud.marketLede.textContent = `${this.levelData.name} · daily target ${won(this.target)}. Spend what you banked on more seats, a faster kitchen and a bigger menu — each level's target climbs, so build capacity ahead of it.`;
    const pips = '';
    hud.marketItems.innerHTML = MARKET.map((m) => {
      const owned = this.upgrades.has(m.id);
      const can = !owned && this.wallet >= m.price;
      return `<div class="item ${owned ? 'owned' : ''}">
        <div class="icon">${m.icon}</div>
        <h3>${m.name}</h3>
        <p>${m.desc}</p>
        <div class="row"><span class="price">${owned ? 'Owned' : won(m.price)}</span>
          <button data-buy="${m.id}" ${can ? '' : 'disabled'}>${owned ? '✓' : 'Buy'}</button></div>
      </div>`;
    }).join('');
    const old = hud.marketCard.querySelector('.unlock');
    if (old) old.remove();
    if (pips) hud.marketItems.insertAdjacentHTML('beforebegin', pips);
    hud.marketItems.querySelectorAll('[data-buy]').forEach((b) => b.addEventListener('click', () => this.buy(b.dataset.buy)));
  }
}
