// Procedural Web Audio: every sound is synthesised, so nothing needs downloading.
import { G } from './game.js';

export class Audio {
  constructor() {
    this.ctx = null;
    this.ready = false;
  }

  start() {
    if (this.ready) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = 0.9;
    this.master.connect(ctx.destination);
    // Room reverb from a generated impulse response.
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(2.2, 2.5);
    this.reverbSend = ctx.createGain(); this.reverbSend.gain.value = 0.35;
    this.reverbSend.connect(this.reverb); this.reverb.connect(this.master);
    this.sfx = ctx.createGain(); this.sfx.connect(this.master); this.sfx.connect(this.reverbSend);
    this.noiseBuf = this.makeNoise(2);
    this.ready = true;
    this.startAmbience();
  }

  impulse(seconds, decay) {
    const ctx = this.ctx, len = ctx.sampleRate * seconds;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  makeNoise(seconds) {
    const ctx = this.ctx, len = ctx.sampleRate * seconds;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // A panner placed at a world position, or the plain sfx bus when pos is null.
  out(pos, gain = 1) {
    const g = this.ctx.createGain(); g.gain.value = gain;
    if (pos) {
      const p = this.ctx.createPanner();
      p.panningModel = 'HRTF'; p.distanceModel = 'inverse';
      p.refDistance = 2; p.maxDistance = 60; p.rolloffFactor = 1.2;
      p.positionX.value = pos.x; p.positionY.value = pos.y ?? 1.5; p.positionZ.value = pos.z;
      g.connect(p); p.connect(this.sfx);
    } else g.connect(this.sfx);
    return g;
  }

  noise(dur, { freq = 1000, q = 1, type = 'bandpass', gain = 0.5, pos = null, attack = 0.002, sweepTo = null } = {}) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.out(pos));
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }

  tone(freq, dur, { type = 'sine', gain = 0.3, pos = null, slideTo = null, attack = 0.005 } = {}) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.out(pos));
    o.start(t); o.stop(t + dur + 0.05);
  }

  // ----- game sounds -----
  gunshot(kind) {
    const big = kind === 'shotgun';
    this.noise(big ? 0.5 : 0.28, { freq: big ? 900 : 1800, q: 0.5, type: 'lowpass', gain: big ? 1.0 : 0.8 });
    this.tone(big ? 70 : 110, big ? 0.35 : 0.2, { type: 'triangle', gain: 0.8, slideTo: 40 });
    this.noise(0.06, { freq: 4000, q: 0.7, gain: 0.5, type: 'highpass' });
  }
  dryFire() { this.tone(2200, 0.03, { type: 'square', gain: 0.08 }); }
  reload(step = 0) { this.noise(0.05, { freq: 2500 + step * 800, q: 5, gain: 0.25 }); this.tone(900, 0.04, { type: 'square', gain: 0.04 }); }
  shell(pos) { this.tone(4200 + Math.random() * 1500, 0.08, { gain: 0.05, pos }); }
  ricochet(pos) { this.tone(3000, 0.25, { type: 'sawtooth', gain: 0.08, pos, slideTo: 1200 }); this.noise(0.05, { freq: 5000, gain: 0.3, pos }); }
  impact(pos, surface) {
    if (surface === 'flesh') this.noise(0.12, { freq: 400, q: 1.5, gain: 0.6, pos, type: 'lowpass' });
    else this.noise(0.08, { freq: surface === 'metal' ? 3500 : 1600, q: 2, gain: 0.35, pos });
  }
  step(surface, loud = 1) {
    const f = { wet: 900, tile: 2200, wood: 700, carpet: 400, concrete: 1400, metal: 2600 }[surface] || 1200;
    this.noise(surface === 'wet' ? 0.14 : 0.07, { freq: f, q: 1.2, gain: 0.12 * loud, type: 'bandpass' });
    if (surface === 'wet') this.noise(0.1, { freq: 3000, q: 0.8, gain: 0.05 * loud, type: 'highpass' });
  }
  groan(pos, pitch = 1, gain = 0.35) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime, dur = 0.9 + Math.random() * 0.8;
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    const base = (70 + Math.random() * 30) * pitch;
    o.frequency.setValueAtTime(base, t);
    o.frequency.linearRampToValueAtTime(base * (0.7 + Math.random() * 0.5), t + dur);
    const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 500 * pitch; f1.Q.value = 4;
    f1.frequency.linearRampToValueAtTime(300 * pitch, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 6 + Math.random() * 6;
    const lg = ctx.createGain(); lg.gain.value = base * 0.08; lfo.connect(lg); lg.connect(o.frequency);
    o.connect(f1); f1.connect(g); g.connect(this.out(pos));
    o.start(t); lfo.start(t); o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
    this.noise(dur * 0.8, { freq: 700 * pitch, q: 2, gain: gain * 0.4, pos });
  }
  roar(pos) { this.groan(pos, 0.55, 0.9); this.groan(pos, 0.45, 0.7); this.noise(1.2, { freq: 250, q: 0.8, gain: 0.5, pos, type: 'lowpass' }); }
  bite() { this.noise(0.2, { freq: 600, q: 2, gain: 0.8, type: 'lowpass' }); this.tone(180, 0.3, { type: 'sawtooth', gain: 0.25, slideTo: 90 }); }
  hurt() { this.tone(320, 0.25, { type: 'triangle', gain: 0.25, slideTo: 200 }); }
  crate(pos) { this.noise(0.35, { freq: 600, q: 1, gain: 0.8, pos }); this.noise(0.2, { freq: 2000, q: 2, gain: 0.3, pos }); }
  door(pos) { this.noise(0.9, { freq: 300, q: 8, gain: 0.25, pos, sweepTo: 700 }); this.noise(0.15, { freq: 200, q: 1, gain: 0.5, pos, type: 'lowpass' }); }
  slam(pos) { this.noise(0.5, { freq: 150, q: 1, gain: 1.0, pos, type: 'lowpass' }); this.tone(60, 0.5, { type: 'triangle', gain: 0.6 }); }
  locked() { this.noise(0.12, { freq: 900, q: 6, gain: 0.3 }); this.noise(0.12, { freq: 700, q: 6, gain: 0.3 }); }
  pickup() { this.tone(880, 0.12, { gain: 0.12 }); setTimeout(() => this.tone(1320, 0.18, { gain: 0.1 }), 90); }
  ui() { this.tone(1200, 0.05, { type: 'square', gain: 0.04 }); }
  error() { this.tone(180, 0.25, { type: 'square', gain: 0.08 }); }
  success() { [523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, { gain: 0.1 }), i * 110)); }
  knife() { this.noise(0.15, { freq: 3500, q: 1.5, gain: 0.35, sweepTo: 1500 }); }
  sting() { [146, 155, 207, 220].forEach(f => this.tone(f, 1.6, { type: 'sawtooth', gain: 0.05, attack: 0.02 })); }
  heartbeat(rate) { this.tone(55, 0.12, { type: 'sine', gain: 0.5 }); setTimeout(() => this.tone(50, 0.12, { type: 'sine', gain: 0.35 }), 180 / rate); }
  save() { [392, 523, 659, 523].forEach((f, i) => setTimeout(() => this.tone(f, 0.5, { gain: 0.07, type: 'triangle' }), i * 220)); }
  radio() { this.noise(0.3, { freq: 2000, q: 0.5, gain: 0.15 }); }
  collapse(pos) { this.noise(2.5, { freq: 120, q: 0.6, gain: 1.0, pos, type: 'lowpass' }); this.noise(1.5, { freq: 800, q: 0.5, gain: 0.4, pos }); }
  sparks(pos) { for (let i = 0; i < 4; i++) setTimeout(() => this.noise(0.06, { freq: 5000, gain: 0.3, pos }), i * 60); }

  // Rain bed and a low drone that follow the player in and out of buildings.
  startAmbience() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    this.rainFilter = ctx.createBiquadFilter(); this.rainFilter.type = 'lowpass'; this.rainFilter.frequency.value = 3000;
    this.rainGain = ctx.createGain(); this.rainGain.gain.value = 0.0;
    src.connect(this.rainFilter); this.rainFilter.connect(this.rainGain); this.rainGain.connect(this.master);
    src.start();
    const drone = ctx.createGain(); drone.gain.value = 0.035; drone.connect(this.master);
    [43.6, 44.1, 65.4].forEach(f => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180;
      o.connect(lp); lp.connect(drone); o.start();
    });
    this.droneGain = drone;
  }

  update() {
    if (!this.ready || !G.camera) return;
    const L = this.ctx.listener, c = G.camera, t = this.ctx.currentTime;
    const fwd = c.getWorldDirection(this._f || (this._f = c.position.clone()));
    if (L.positionX) {
      L.positionX.setTargetAtTime(c.position.x, t, 0.02);
      L.positionY.setTargetAtTime(c.position.y, t, 0.02);
      L.positionZ.setTargetAtTime(c.position.z, t, 0.02);
      L.forwardX.setTargetAtTime(fwd.x, t, 0.02); L.forwardY.setTargetAtTime(fwd.y, t, 0.02); L.forwardZ.setTargetAtTime(fwd.z, t, 0.02);
      L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0;
    }
    const outside = G.player && G.level?.roomAt(G.player.pos.x, G.player.pos.z)?.outdoor;
    this.rainGain.gain.setTargetAtTime(outside ? 0.22 : 0.06, t, 0.5);
    this.rainFilter.frequency.setTargetAtTime(outside ? 4000 : 500, t, 0.5);
  }
}
