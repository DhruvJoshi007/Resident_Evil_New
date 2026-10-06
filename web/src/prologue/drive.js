// The drive from the Gullwing garage to the field office on Kestrel Street.
// Arcade car physics: W/S throttle and brake, A/D steer. Wrecks and the bus
// block the lanes; hitting them hard costs the car. Walkers shamble at the car
// only once they see it. Runners (the strong ones) sprint at it; if one gets a
// grip while the car is slow, it tears at the door until Ortiz shoots it or
// Leon speeds up and throws it off. Out of their sight for a few seconds, they
// forget the car was ever there.
import * as THREE from 'three';
import { G, rand, clamp, damp, angleDiff, resolveCircle, lineOfSight, dist2D } from '../game.js';
import { Husk } from '../enemies.js';
import { buildHumanoid, poseHumanoid } from '../humanoid.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const MAX_HP = 100;

// An infected in the street. Same body and damage as any Husk; its own simple brain.
class StreetHusk extends Husk {
  constructor(o, drive) {
    super({ kind: 'husk', canRise: false, ...o });
    this.drive = drive;
    this.runner = o.build === 'worker';
    this.seen = false; this.lostT = 0; this.latchT = 0; this.latched = null;
    this.speedRun = this.runner ? rand(6.0, 7.2) : rand(0.7, 1.0);
  }

  update(dt) {
    if (!this.alive) { this.updateDeath(dt); return; }
    const d = this.drive, car = d.car.position;
    const dx = car.x - this.pos.x, dz = car.z - this.pos.z, dist = Math.hypot(dx, dz);
    this.staggerT -= dt; this.downT -= dt;
    if (this.latched) { d.holdOn(this, dt); this.animate(dt); return; }
    // sight only: the car has to be in view, and close enough to matter
    this.senseT -= dt;
    if (this.senseT <= 0) {
      this.senseT = 0.2;
      const range = this.runner ? 34 : 15;
      const visible = dist < range && lineOfSight(V(this.pos.x, 1.6, this.pos.z), V(car.x, 1.2, car.z));
      if (visible) { if (!this.seen) { this.seen = true; if (this.runner) G.audio.shriek?.(this.pos); else G.audio.groan(this.pos, 1, 0.4); } this.lostT = 0; this.lastSeen = car.clone(); }
      else if (this.seen) { this.lostT += 0.2; if (this.lostT > 4) { this.seen = false; this.aware = 0; } }
      this.aware = this.seen ? 1.2 : 0;
      this.state = this.seen ? 'chase' : 'wander';
    }
    let tx = null, tz = null, sp = 0;
    if (this.downT > 0 || this.staggerT > 0) sp = 0;
    else if (this.seen) {
      // runners lead the car a little; walkers just come
      const lead = this.runner ? clamp(dist / 8, 0, 1.2) : 0;
      tx = car.x + Math.sin(d.yaw) * d.v * lead; tz = car.z + Math.cos(d.yaw) * d.v * lead;
      sp = this.speedRun;
    } else if (this.lastSeen && dist2D(this.pos, this.lastSeen) > 1) { tx = this.lastSeen.x; tz = this.lastSeen.z; sp = this.speedWalk; }
    if (tx != null && sp > 0) {
      const ex = tx - this.pos.x, ez = tz - this.pos.z, el = Math.hypot(ex, ez) || 1;
      this.vel.x = damp(this.vel.x, ex / el * sp, 5, dt); this.vel.z = damp(this.vel.z, ez / el * sp, 5, dt);
      this.yaw += angleDiff(this.yaw, Math.atan2(ex, ez)) * Math.min(1, dt * 8);
    } else { this.vel.x = damp(this.vel.x, 0, 6, dt); this.vel.z = damp(this.vel.z, 0, 6, dt); }
    this.pos.x += (this.vel.x + this.push.x) * dt; this.pos.z += (this.vel.z + this.push.z) * dt;
    this.push.multiplyScalar(Math.exp(-dt * 4));
    resolveCircle(this.pos, 0.3);
    this.h.root.rotation.y = this.yaw;
    this.reach = this.seen && dist < 4;
    // a runner at the side of a slow car gets a grip on it
    if (this.runner && dist < 2.0 && Math.abs(d.v) < 8 && !d.latched && d.hp > 0) d.latch(this);
    this.animate(dt);
  }
}

export class Drive {
  constructor(story) {
    this.story = story;
    this.active = false;
    this.hp = MAX_HP;
    this.husks = [];
  }

  get hpLeft() { return Math.max(0, this.hp); }

  // (Re)start the drive at the bottom of the garage ramp on Harbor Avenue.
  start() {
    const L = G.level, p = G.player;
    if (!this.car) {
      this.car = L.makeCar(0x7a7e82, { lights: true });
      G.scene.add(this.car);
      // Leon at the wheel, Ortiz beside him with her pistol
      this.crew = Drive.seatCrew(this.car);
      this.flash = new THREE.PointLight(0xffc070, 0, 6, 2); this.car.add(this.flash); this.flash.position.set(-0.9, 1.4, 0.4);
    }
    this.clearHusks();
    G.level.setZone('street');
    this.car.visible = true; this.showCrew();
    this.car.position.set(0, 0, -68); this.car.rotation.set(0, Math.PI, 0);
    this.yaw = Math.PI; this.v = 0; this.steer = 0; this.hp = MAX_HP; this.dead = false;
    this.latched = null; this.camPos = null; this.lineI = 0; this.t = 0;
    p.h.root.visible = false; p.control = false; p.flashOn = false; p.crouch = false; p.unarmed = false;
    this.spawn();
    this.active = true;
    G.ui.fade(0);
    G.ui.boss('Bureau car', 1);
    G.ui.toast('W and S: accelerate and brake. A and D: steer. Go round the wrecks, not through them.', 6);
    this.startEngine();
    if (!this.loop) { this.loop = true; G.updaters.add((dt) => this.update(dt)); }
  }

  // Leon at the wheel (right of the car's centre line), Ortiz beside him. Also used in the garage cutscene.
  static seatCrew(car) {
    const crew = [buildHumanoid({ top: 0x3a3d34, bottom: 0x24262a, vest: 0x26292b, skin: 0xc49a7e, hair: 0x15110d }), buildHumanoid({ top: 0x1c2430, bottom: 0x1a1c20, skin: 0xb08066, hair: 0x120e0c, ponytail: true, scale: 0.97 })];
    crew.forEach((h, i) => { h.root.position.set(i ? -0.42 : 0.42, -0.05, -0.35); car.add(h.root); poseHumanoid(h, { kneel: 1 }); h.armR.sh.rotation.set(-1.2, 0, 0.1); h.armL.sh.rotation.set(-1.2, 0, -0.1); });
    // open the cabin up: a roof and four pillars instead of the solid block
    const cab = car.userData.cabin;
    if (cab?.visible) {
      cab.visible = false;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.07, 1.5), cab.material); roof.position.set(0, 1.48, -0.3); car.add(roof);
      for (const [x, z] of [[-0.77, 0.75], [0.77, 0.75], [-0.77, -1.25], [0.77, -1.25]]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.56, 0.1), cab.material); post.position.set(x, 1.2, z); car.add(post);
      }
    }
    // lighter glass so faces read through the windscreen
    car.traverse(m => { if (m.material?.transparent) { m.material = m.material.clone(); m.material.opacity = 0.45; } });
    return crew;
  }

  showCrew() { this.crew.forEach(h => { h.root.visible = true; }); }
  hideCrew() { this.crew.forEach(h => { h.root.visible = false; }); }

  clearHusks() { this.story.clearEnemies(this.husks); this.husks = []; }

  spawn() {
    const add = (x, z, build, o = {}) => this.husks.push(new StreetHusk({ x, z, build, yaw: rand(0, 6), state: 'wander', ...o }, this));
    // walkers all along Harbor Avenue, more of them near the wrecks
    for (let k = 0; k < 16; k++) add(rand(-6.5, 6.5), rand(-380, -85), k % 3 ? 'normal' : 'frail');
    // runners: a pack past the bus, two in the doorways further down, three on Kestrel Street
    for (const [x, z] of [[-6.8, -228], [6.8, -236], [-6.6, -246], [6.6, -262], [-6.8, -300], [6.9, -322], [-60, -401], [-84, -415], [-110, -401], [-126, -415]]) add(x, z, 'worker');
    for (let k = 0; k < 8; k++) add(rand(-140, -20), rand(-414, -402), k % 2 ? 'normal' : 'frail');
  }

  // ----- engine sound: a sawtooth that climbs with speed -----
  startEngine() {
    const A = G.audio;
    if (!A.ready || this.osc) return;
    const ctx = A.ctx;
    this.osc = ctx.createOscillator(); this.osc.type = 'sawtooth';
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    this.engineGain = ctx.createGain(); this.engineGain.gain.value = 0.05;
    this.osc.connect(lp); lp.connect(this.engineGain); this.engineGain.connect(A.master);
    this.osc.start();
  }

  stopEngine() { if (this.osc) { try { this.osc.stop(); } catch {} this.osc = null; } }

  latch(e) {
    this.latched = e; e.latched = true; this.latchT = 0;
    G.audio.groan(e.pos, 1.2, 0.6);
    if (!this.toldLatch) { this.toldLatch = true; G.ui.toast('One has the door! Speed up to throw it off.', 4); }
  }

  // A runner hanging on the car: it claws at the car until it lets go or is shot.
  holdOn(e, dt) {
    const c = this.car.position;
    const side = Math.sign(Math.sin(this.yaw) * (e.pos.z - c.z) - Math.cos(this.yaw) * (e.pos.x - c.x)) || 1;
    e.pos.x = c.x + Math.cos(this.yaw) * 1.25 * side + Math.sin(this.yaw) * 0.2;
    e.pos.z = c.z - Math.sin(this.yaw) * 1.25 * side + Math.cos(this.yaw) * 0.2;
    e.yaw = Math.atan2(c.x - e.pos.x, c.z - e.pos.z); e.h.root.rotation.y = e.yaw;
    e.vel.set(Math.sin(this.yaw) * this.v, 0, Math.cos(this.yaw) * this.v);
    e.reach = true;
    this.latchT += dt;
    if (this.dead) return;
    this.hp -= 3 * dt;
    const throwOff = Math.abs(this.v) > 12 && this.latchT > 0.5;
    if (throwOff || this.latchT > 1.4) {
      e.latched = false; this.latched = null;
      const dir = V(e.pos.x - c.x, 0, e.pos.z - c.z).normalize();
      if (throwOff) { e.takeHit(60, 'legs', dir, 4, null, 'car'); G.audio.slam(e.pos); }
      else { // Ortiz leans across and fires
        G.audio.gunshot('handgun'); this.flash.intensity = 30;
        e.takeHit(400, 'head', dir, 2, null, 'gun');
        if (!this.toldShot) { this.toldShot = true; G.ui.toast('Ortiz fires across Leon. Keep the speed up and they cannot get on.', 4); }
      }
    }
  }

  update(dt) {
    if (!this.active) return true;
    const p = G.player, I = G.input;
    this.flash.intensity = Math.max(0, this.flash.intensity - dt * 300);
    if (G.mode === 'play') this.physics(dt, I);
    // keep Leon's "position" with the car, so rain, sound and the infected follow it
    p.pos.set(this.car.position.x, 0, this.car.position.z); p.yaw = this.yaw;
    p.h.root.visible = false;
    if (G.mode === 'play' || G.mode === 'dead') this.camera(dt);
    // engine pitch
    if (this.osc) {
      const t = G.audio.ctx.currentTime;
      this.osc.frequency.setTargetAtTime(38 + Math.abs(this.v) * 3.6 + (I.down('KeyW') ? 8 : 0), t, 0.1);
      this.engineGain.gain.setTargetAtTime(this.dead ? 0 : 0.035 + Math.min(0.05, Math.abs(this.v) * 0.003), t, 0.2);
    }
    // Ortiz navigates
    this.t += dt;
    const c = this.car.position, lines = this.story.rows('DLG_C0_Drive');
    const due = [this.t > 1.5, c.z < -172, c.z < -224, c.z < -232 && this.lineI >= 3, c.z < -240 && this.lineI >= 4, c.z < -372, c.x < -112];
    while (this.lineI < lines.length && due[this.lineI]) {
      const r = lines[this.lineI++];
      this.story.radioQueue.push({ r });
    }
    if (G.mode === 'play') G.ui.boss('Bureau car', this.hp / MAX_HP);
    return true;
  }

  physics(dt, I) {
    if (this.dead) { this.v = damp(this.v, 0, 3, dt); return; }
    this.crashT = (this.crashT || 0) - dt;
    const throttle = I.down('KeyW') ? 1 : 0, brake = I.down('KeyS') ? 1 : 0;
    const steerIn = (I.down('KeyA') ? 1 : 0) - (I.down('KeyD') ? 1 : 0);
    if (throttle) this.v += (this.v < 0 ? 16 : 9.5 * (1 - this.v / 26)) * dt;
    if (brake) this.v -= (this.v > 0.5 ? 18 : 5) * dt;
    if (!throttle && !brake) this.v -= Math.sign(this.v) * Math.min(Math.abs(this.v), 2.2 * dt);
    this.v = clamp(this.v, -6, 24);
    this.steer = damp(this.steer, steerIn, 8, dt);
    const grip = 1.7 - Math.min(Math.abs(this.v), 24) / 24 * 0.9;
    this.yaw += this.steer * clamp(this.v / 5, -1, 1) * grip * dt;
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    const c = this.car.position;
    c.x += fx * this.v * dt; c.z += fz * this.v * dt;
    // collide the front and back of the car with the world
    let hit = 0;
    for (const off of [1.35, -1.35]) {
      const q = { x: c.x + fx * off, z: c.z + fz * off };
      const ox = q.x, oz = q.z;
      if (resolveCircle(q, 0.95)) { c.x += q.x - ox; c.z += q.z - oz; hit = Math.max(hit, Math.hypot(q.x - ox, q.z - oz)); }
    }
    if (hit > 0.001) {
      const impact = Math.abs(this.v);
      if (impact > 5 && !(this.crashT > 0)) {
        this.crashT = 0.4; // one hit per crash, not one per frame of scraping
        this.hp -= (impact - 5) * 1.4;
        G.audio.slam(c.clone().setY(1)); G.audio.clang(c.clone().setY(1));
        G.weapons.sparks?.(c.clone().add(V(fx * 2, 0.8, fz * 2)), 0xffd080, 12, V(-fx, 0.5, -fz));
        this.shake = Math.min(1, impact / 14);
        this.v *= -0.25;
      } else this.v *= 0.6;
    }
    // the car hits the infected
    for (const e of this.husks) {
      if (!e.alive || e.latched) continue;
      const fq = { x: c.x + fx * 1.6, z: c.z + fz * 1.6 };
      if (dist2D(e.pos, fq) < 1.25 || dist2D(e.pos, c) < 1.3) {
        if (Math.abs(this.v) > 4) {
          const dir = V(fx, 0, fz);
          e.takeHit(Math.abs(this.v) * 9, 'torso', dir, Math.abs(this.v) / 3, null, 'car');
          e.push.set(fx * Math.abs(this.v) * 0.7, 0, fz * Math.abs(this.v) * 0.7);
          this.hp -= e.build.hp > 120 ? 5 : e.build.hp < 90 ? 1 : 3;
          G.audio.slam(e.pos); G.audio.wetTear(e.pos);
          this.v *= 0.88;
        }
      }
    }
    // the car's body follows: lean into turns, nod under braking
    this.car.rotation.set(-(brake ? 0.025 : 0) + (throttle ? 0.012 : 0), this.yaw, -this.steer * Math.min(1, Math.abs(this.v) / 15) * 0.04);
    this.car.userData.tail.emissiveIntensity = brake ? 2.5 : 0.4;
    if (this.hp <= 0) this.wrecked();
  }

  camera(dt) {
    const c = this.car.position, fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    const back = 6.8 + Math.abs(this.v) * 0.06;
    const want = V(c.x - fx * back, 2.9, c.z - fz * back);
    if (!this.camPos) this.camPos = want.clone();
    this.camPos.x = damp(this.camPos.x, want.x, 6, dt); this.camPos.y = damp(this.camPos.y, want.y, 6, dt); this.camPos.z = damp(this.camPos.z, want.z, 6, dt);
    const shake = (this.shake = Math.max(0, (this.shake || 0) - dt * 2)) * 0.25;
    const pos = this.camPos.clone().add(V(rand(-shake, shake), rand(-shake, shake), 0));
    G.player.camOverride = { pos, look: V(c.x + fx * 7, 1.1, c.z + fz * 7), fov: 60 + Math.min(10, Math.abs(this.v) * 0.4) };
  }

  wrecked() {
    this.dead = true; this.hp = 0;
    if (this.latched) { this.latched.latched = false; this.latched = null; }
    G.level.smoke(this.car.position.x, 1.2, this.car.position.z);
    G.ui.toast('The engine dies. Hands come through the broken glass.', 4);
    G.audio.collapse(this.car.position);
    this.story.onPlayerDeath();
  }

  // The gate: hand over to the field office cutscene.
  arrive() {
    this.active = true;
    this.v = 0; this.latched = null;
    for (const e of this.husks) { e.seen = false; }
    this.stopEngine();
    G.ui.boss(null);
    G.player.camOverride = null;
  }
}
