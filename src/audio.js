// Procedural lofi ambience — nothing is streamed or sampled, everything is synthesised
// in the Web Audio API so the game ships with no audio assets.

const BPM = 72;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

// Two bars per chord: Gm7 · C7 · Fmaj7 · Dm7 (a soft ii–V–I–vi in F)
const CHORDS = [
  { root: 43, notes: [55, 58, 62, 65] },
  { root: 36, notes: [52, 58, 60, 64] },
  { root: 41, notes: [53, 57, 60, 64] },
  { root: 38, notes: [50, 53, 57, 60] },
];
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

export class LofiPlayer {
  constructor() {
    this.ctx = null;
    this.playing = false;
    this.timer = null;
    this.nextBar = 0;
    this.barIndex = 0;
    this.volume = 0.32;
  }

  ensure() {
    if (this.ctx) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;
    // Master chain: gentle low-pass "through the wall" tone, compressor, master gain
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3400;
    lp.Q.value = 0.4;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.ratio.value = 3;
    comp.attack.value = 0.02;
    comp.release.value = 0.3;
    this.master.connect(lp).connect(comp).connect(ctx.destination);

    // Buses
    this.keys = ctx.createGain(); this.keys.gain.value = 0.55;
    this.bass = ctx.createGain(); this.bass.gain.value = 0.5;
    this.drums = ctx.createGain(); this.drums.gain.value = 0.42;
    this.crackle = ctx.createGain(); this.crackle.gain.value = 0.18;
    const keysFilter = ctx.createBiquadFilter();
    keysFilter.type = 'lowpass';
    keysFilter.frequency.value = 1500;
    this.keys.connect(keysFilter).connect(this.master);
    this.bass.connect(this.master);
    this.drums.connect(this.master);
    this.crackle.connect(this.master);

    // Slow "tape wobble" on the keys via a shared detune LFO
    this.wobble = ctx.createOscillator();
    this.wobble.frequency.value = 0.35;
    this.wobbleGain = ctx.createGain();
    this.wobbleGain.gain.value = 6; // cents
    this.wobble.connect(this.wobbleGain);
    this.wobble.start();

    // Noise buffer for hats, snare brush and vinyl crackle
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;

    // Constant vinyl hiss + random pops
    const hiss = ctx.createBufferSource();
    hiss.buffer = buf; hiss.loop = true;
    const hissFilter = ctx.createBiquadFilter();
    hissFilter.type = 'bandpass'; hissFilter.frequency.value = 2600; hissFilter.Q.value = 0.6;
    const hissGain = ctx.createGain(); hissGain.gain.value = 0.05;
    hiss.connect(hissFilter).connect(hissGain).connect(this.crackle);
    hiss.start();
  }

  // --- Voices -------------------------------------------------------------
  key(freq, t, dur, vel = 0.5) {
    const ctx = this.ctx;
    const o1 = ctx.createOscillator(); o1.type = 'triangle'; o1.frequency.value = freq;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 2.01;
    this.wobbleGain.connect(o1.detune); this.wobbleGain.connect(o2.detune);
    const g = ctx.createGain();
    const g2 = ctx.createGain(); g2.gain.value = 0.18;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.03);
    g.gain.exponentialRampToValueAtTime(vel * 0.5, t + dur * 0.5);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o1.connect(g); o2.connect(g2).connect(g);
    g.connect(this.keys);
    o1.start(t); o2.start(t);
    o1.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }

  bassNote(freq, t, dur, vel = 0.6) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = freq;
    const g = ctx.createGain();
    const g2 = ctx.createGain(); g2.gain.value = 0.15;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); o2.connect(g2).connect(g);
    g.connect(this.bass);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }

  kick(t, vel = 0.9) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    o.connect(g).connect(this.drums);
    o.start(t); o.stop(t + 0.3);
  }

  noiseHit(t, { freq, q, dur, vel, type = 'bandpass' }) {
    const ctx = this.ctx;
    const s = ctx.createBufferSource(); s.buffer = this.noise;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(this.drums);
    s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }

  snare(t, vel = 0.35) { this.noiseHit(t, { freq: 1800, q: 0.7, dur: 0.16, vel }); }
  hat(t, vel = 0.12) { this.noiseHit(t, { freq: 7000, q: 1.2, dur: 0.05, vel, type: 'highpass' }); }

  pop(t) {
    const ctx = this.ctx;
    const s = ctx.createBufferSource(); s.buffer = this.noise;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.25 + Math.random() * 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
    s.connect(g).connect(this.crackle);
    s.start(t, Math.random()); s.stop(t + 0.02);
  }

  // --- Scheduler ------------------------------------------------------------
  scheduleBar(t, bar) {
    const chord = CHORDS[Math.floor(bar / 2) % CHORDS.length];
    const swing = BEAT * 0.08;
    // Keys: lazy chord on 1, a lighter re-strike on the "and of 3", occasional top-note colour
    const vel = 0.16;
    chord.notes.forEach((n, i) => this.key(midi(n), t + i * 0.012, BAR * 0.95, vel));
    if (bar % 2 === 1) chord.notes.slice(1).forEach((n, i) => this.key(midi(n), t + BEAT * 2.5 + i * 0.01, BEAT * 1.4, vel * 0.7));
    if (Math.random() < 0.5) this.key(midi(chord.notes[3] + (Math.random() < 0.5 ? 2 : 4)), t + BEAT * (1 + Math.floor(Math.random() * 2)) + swing, BEAT * 1.2, 0.09);
    // Bass: root on 1, fifth or octave on the "and of 2", root again on 3
    this.bassNote(midi(chord.root), t, BEAT * 1.4, 0.5);
    this.bassNote(midi(chord.root + (Math.random() < 0.6 ? 7 : 12)), t + BEAT * 1.5 + swing, BEAT * 0.5, 0.32);
    this.bassNote(midi(chord.root), t + BEAT * 2, BEAT * 1.2, 0.42);
    if (bar % 4 === 3) this.bassNote(midi(chord.root - 2), t + BEAT * 3.5 + swing, BEAT * 0.5, 0.3);
    // Drums: soft kick 1 & 3, brushed snare 2 & 4, swung 8th hats
    this.kick(t, 0.8);
    this.kick(t + BEAT * 2 + (Math.random() < 0.3 ? BEAT * 0.5 : 0), 0.6);
    this.snare(t + BEAT, 0.3);
    this.snare(t + BEAT * 3, 0.34);
    for (let i = 0; i < 8; i++) {
      const off = i % 2 ? swing : 0;
      this.hat(t + i * BEAT * 0.5 + off, i % 2 ? 0.07 : 0.11);
    }
    // Vinyl pops
    for (let i = 0; i < 3 + Math.floor(Math.random() * 4); i++) this.pop(t + Math.random() * BAR);
  }

  tick() {
    const ctx = this.ctx;
    while (this.nextBar < ctx.currentTime + 0.6) {
      this.scheduleBar(this.nextBar, this.barIndex++);
      this.nextBar += BAR;
    }
  }

  async play() {
    this.ensure();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    if (this.playing) return;
    this.playing = true;
    this.nextBar = this.ctx.currentTime + 0.1;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.8);
    this.timer = setInterval(() => this.tick(), 120);
    this.tick();
  }

  pause() {
    if (!this.ctx || !this.playing) return;
    this.playing = false;
    clearInterval(this.timer);
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
  }

  toggle() { this.playing ? this.pause() : this.play(); return this.playing; }
}
