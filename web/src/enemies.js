// The infected of Port Halvern and the Hookman.
// Husks: perception (sight cone, light, crouching, hearing), a detection
// meter, pathfinding chase, grabs and bites, knockdowns and head destruction.
// The Reborn rule: a Husk killed without destroying the head or finishing it
// with the knife twitches, shrieks and rises again with tentacle limbs.
// The Hookman: a mutated crane operator who throws a hook on a chain. When a
// throw misses he overreaches, and the growth on his back is open to fire.
import * as THREE from 'three';
import { G, rand, clamp, damp, angleDiff, resolveCircle, lineOfSight, dist2D, addUpdater } from './game.js';
import { buildHumanoid, poseHumanoid } from './humanoid.js';
import { tex } from './textures.js';

const PART_MULT = { head: 2.2, torso: 1, arms: 0.6, legs: 0.7, weak: 2.5 };
const LOOKS = {
  worker: [{ top: 0x4a5a3a, bottom: 0x2a3040 }, { top: 0x7a4a1a, bottom: 0x2a2e36 }, { top: 0x33414a, bottom: 0x23262a }],
  frail: [{ top: 0x5a4a3a, bottom: 0x3a3630 }, { top: 0x6a6458, bottom: 0x2e2a26 }],
  normal: [{ top: 0x3a3a40, bottom: 0x2a2a2a }, { top: 0x5a3a2a, bottom: 0x302820 }, { top: 0x2a3a4a, bottom: 0x1c2230 }],
};
// Strength by build. Infection makes a strong body stronger and a frail one barely a threat.
const BUILDS = {
  frail: { hp: 70, scale: 0.93, speed: [0.8, 0.95], bite: 16, hunch: 0.45 },
  normal: { hp: 100, scale: 1.0, speed: [0.95, 1.15], bite: 22, hunch: 0.25 },
  worker: { hp: 145, scale: 1.08, speed: [1.15, 1.3], bite: 28, hunch: 0.15 },
};

let lastSting = -99;

export class Husk {
  constructor(o) {
    this.opts = o;
    const B = this.build = BUILDS[o.build || 'normal'];
    const pool = LOOKS[o.build || 'normal'];
    const look = o.clothes || pool[(Math.random() * pool.length) | 0];
    this.h = buildHumanoid({ zombie: true, skin: 0xa3a690, hair: o.build === 'frail' ? 0x8a8478 : Math.random() < 0.3 ? null : 0x1a1612, scale: o.scale ?? B.scale * rand(0.97, 1.03), ...look });
    this.h.root.position.set(o.x, 0, o.z);
    this.h.root.rotation.y = this.yaw = o.yaw ?? rand(0, 6.28);
    G.scene.add(this.h.root);
    this.pos = this.h.root.position;
    this.home = this.pos.clone();
    this.name = o.name || 'husk';
    const strain = G.strain || 1;
    this.hp = this.maxHp = (o.hp ?? B.hp) * strain;
    this.alive = true;
    this.state = o.state || 'idle';
    this.room = o.room || G.level.roomAt(o.x, o.z)?.id;
    this.aware = 0;
    this.vel = new THREE.Vector3();
    this.push = new THREE.Vector3();
    this.phase = rand(0, 6);
    this.stride = 0;
    this.speedWalk = 0.45; this.speedChase = o.speed ?? rand(...B.speed);
    this.path = null; this.repathT = 0; this.senseT = rand(0, 0.2);
    this.lostT = 0; this.lastSeen = new THREE.Vector3();
    this.target = null; this.timer = rand(1, 4);
    this.attackCd = 1; this.windup = 0;
    this.staggerT = 0; this.downT = 0; this.deathT = 0;
    this.groanT = rand(2, 8);
    this.biteDamage = (o.bite ?? B.bite) * strain;
    this.headless = false;
    this.canRise = o.canRise !== false;
    this.riseT = 0; this.finished = false; this.reborn = false;
    this.lash = 0; this.lashCd = 0;
    this.onDeath = o.onDeath;
    this.lean = rand(-0.15, 0.15);
    for (const m of this.h.meshes) { m.userData.enemy = this; G.hitMeshes.push(m); }
    G.enemies.push(this);
  }

  get downed() { return this.downT > 0; }
  get pendingRise() { return !this.alive && this.riseT > 0; }

  // Plain data that is enough to rebuild this enemy after loading a save.
  record() {
    return { opts: this.opts, alive: this.alive, hp: this.hp, x: this.pos.x, z: this.pos.z, yaw: this.yaw, state: this.state, reborn: this.reborn, riseT: this.riseT, finished: this.finished, headless: this.headless, waiting: !!this.waiting };
  }

  // ----- senses -----
  hear(pos, radius, kind) {
    if (!this.alive || this.state === 'dormant' || this.state === 'rising') return;
    const d = dist2D(pos, this.pos);
    if (d > radius) return;
    const muffled = !lineOfSight(this.headPos(), new THREE.Vector3(pos.x, 1.2, pos.z));
    const eff = muffled ? radius * 0.55 : radius;
    if (d > eff) return;
    if (this.state === 'fakeDead') { if (kind === 'gunshot' && d < 6) this.wake(); return; }
    const gain = (kind === 'gunshot' ? 0.9 : 0.3) * (1 - d / eff);
    this.aware = Math.min(1.2, this.aware + gain);
    if (this.state !== 'chase' && this.state !== 'grab') {
      this.target = new THREE.Vector3(pos.x, 0, pos.z);
      if (this.aware >= 1) this.startChase(); else this.setState('suspicious');
    }
  }

  headPos() { return new THREE.Vector3(this.pos.x, 1.6, this.pos.z); }

  canSee(p) {
    const room = G.level.roomAt(p.pos.x, p.pos.z);
    let R = this.state === 'feeding' ? 5 : 12;
    if (p.crouch) R *= 0.55;
    if (p.flashOn) R *= 1.25;
    if (room && room.lamp && !room.lamp.visible && !p.flashOn) R *= 0.5;
    const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > R) return 0;
    const facing = Math.cos(angleDiff(this.yaw, Math.atan2(dx, dz)));
    if (d > 1.6 && facing < (this.state === 'chase' ? -0.2 : 0.3)) return 0;
    if (!lineOfSight(this.headPos(), new THREE.Vector3(p.pos.x, p.crouch ? 0.8 : 1.3, p.pos.z))) return 0;
    return 1 - d / R;
  }

  wake() {
    if (!this.alive) return;
    this.state = 'chase'; this.aware = 1.2;
    G.audio.groan(this.pos, 1, 0.5);
  }

  setState(s) { if (this.state !== s) { this.state = s; this.timer = rand(2, 4); this.path = null; } }

  startChase() {
    if (this.state !== 'chase') {
      this.state = 'chase'; this.lostT = 0;
      G.audio.groan(this.pos, 1, 0.5);
      if (G.time - lastSting > 20) { lastSting = G.time; G.audio.sting(); }
    }
  }

  // ----- damage -----
  takeHit(dmg, part, dir, impulse = 1, point, cause) {
    if (!this.alive || this.state === 'rising') return 'miss';
    if (this.state === 'dormant' || this.state === 'fakeDead') this.wake();
    const mult = PART_MULT[part] ?? 1;
    const amount = dmg * mult * (this.downed ? 1.3 : 1);
    this.hp -= amount;
    this.aware = 1.2;
    if (this.state !== 'grab') this.startChase();
    this.push.addScaledVector(new THREE.Vector3(dir.x, 0, dir.z).normalize(), impulse);
    if (part === 'head') { this.staggerT = Math.max(this.staggerT, 0.55); this.headSnap = 1; }
    else if (part === 'legs' && !this.downed && Math.random() < 0.3 * impulse) { this.downT = 2.8; G.audio.groan(this.pos, 1.1, 0.3); }
    else this.staggerT = Math.max(this.staggerT, 0.25 + impulse * 0.08);
    if (this.lash > 0 && part !== 'arms') { this.lash = 0; this.lashPhase = null; this.lashCd = 1.5; }
    if (this.state === 'grab') this.release(true);
    if (this.hp <= 0) this.die(part, dir, amount, cause);
    return 'hit';
  }

  die(part, dir, lastDamage, cause) {
    this.alive = false; this.state = 'dead';
    G.stats.kills++;
    this.fallDir = Math.random() < 0.5 ? 1 : -1;
    this.deathT = 0; this.lash = 0;
    const headKill = part === 'head';
    if (headKill) this.decapitate(dir);
    G.hitMeshes = G.hitMeshes.filter(m => m.userData.enemy !== this);
    G.audio.groan(this.pos, 0.8, 0.25);
    // The Reborn rule: no destroyed head and no finisher means it is not over.
    if (this.canRise && !this.reborn && !headKill && cause !== 'knife') this.riseT = rand(6, 8);
    else this.finished = true;
    this.onDeath?.(this);
  }

  // Knife stab into a twitching body: it stays down for good.
  finish() {
    if (!this.pendingRise && !this.waiting) return false;
    this.riseT = 0; this.finished = true; this.waiting = false;
    G.audio.knife(); G.audio.wetTear(this.pos);
    G.weapons.particles(this.pos.clone().setY(0.3), 0x3a0503, 12, { additive: false, speed: 1.5, life: 0.6, size: 0.06 });
    this.h.root.rotation.z += 0.12 * this.fallDir;
    return true;
  }

  // A body lying where it fell. It can be told to rise later.
  makeCorpse() {
    this.alive = false; this.state = 'dead'; this.deathT = 5; this.fallDir = 1;
    this.riseT = 0; this.waiting = true;
    G.hitMeshes = G.hitMeshes.filter(m => m.userData.enemy !== this);
    this.h.root.rotation.x = -Math.PI / 2; this.h.root.position.y = 0.15;
    this.poseDead(1);
  }

  startRise(delay) {
    if (this.alive || this.finished || this.headless) return;
    this.waiting = false;
    this.riseT = delay;
  }

  decapitate(dir) {
    if (this.headless) return;
    this.headless = true;
    const head = this.h.head;
    G.scene.attach(head);
    const v = new THREE.Vector3(dir.x, 0, dir.z).normalize().multiplyScalar(rand(2, 3.5)).add(new THREE.Vector3(0, rand(1.5, 3), 0));
    const spin = new THREE.Vector3(rand(-10, 10), rand(-10, 10), rand(-10, 10));
    let bounces = 0;
    G.weapons.particles(head.position.clone(), 0x5a0605, 22, { additive: false, speed: 3, life: 0.8, size: 0.08, dir: new THREE.Vector3(0, 1, 0), dirSpeed: 2 });
    addUpdater((dt) => {
      if (bounces > 3) return false;
      v.y -= 9.8 * dt;
      head.position.addScaledVector(v, dt);
      head.rotation.x += spin.x * dt; head.rotation.z += spin.z * dt;
      if (head.position.y < 0.1) { head.position.y = 0.1; v.y = -v.y * 0.3; v.x *= 0.5; v.z *= 0.5; spin.multiplyScalar(0.4); bounces++; }
      return true;
    });
  }

  // ----- the Reborn -----
  rise(instant) {
    this.reborn = true; this.alive = true; this.finished = false; this.riseT = 0;
    this.hp = this.maxHp = 150 * (G.strain || 1);
    this.state = instant ? 'chase' : 'rising'; this.riseAnim = instant ? 1 : 0;
    this.speedChase = 1.35; this.attackCd = 1.5; this.lashCd = 1.2; this.lash = 0;
    this.downT = 0; this.staggerT = 0; this.push.set(0, 0, 0);
    this.h.root.rotation.z = 0;
    if (instant) { this.h.root.rotation.x = 0; this.h.root.position.y = 0; }
    this.buildTentacles();
    for (const m of this.h.meshes) { m.userData.enemy = this; if (!G.hitMeshes.includes(m)) G.hitMeshes.push(m); }
    if (instant) return;
    G.audio.shriek(this.pos); G.audio.wetTear(this.pos);
    G.weapons.particles(this.pos.clone().setY(0.6), 0x3a0503, 26, { additive: false, speed: 2.5, life: 0.9, size: 0.08 });
    G.story.onRebornRise?.(this);
  }

  buildTentacles() {
    if (this.tentacles) return;
    const m = new THREE.MeshStandardMaterial({ map: tex('rot', 1), color: 0x7a3a34, roughness: 0.45, emissive: 0x200404 });
    this.tentacles = [];
    const roots = [[0.12, 0.5, -0.12, 0.5], [-0.12, 0.5, -0.12, -0.5], [0.16, 0.32, -0.12, 1.1], [-0.16, 0.32, -0.12, -1.1]];
    roots.forEach(([x, y, z, splay], i) => {
      const root = new THREE.Group(); root.position.set(x, y, z);
      this.h.spine.add(root);
      const segs = [];
      let parent = root;
      for (let k = 0; k < 7; k++) {
        const g = new THREE.Group(); g.position.y = k ? 0.2 : 0;
        const r0 = 0.05 * (1 - k * 0.11), r1 = 0.05 * (1 - (k + 1) * 0.11);
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(0.008, r1), r0, 0.22, 7), m);
        seg.position.y = 0.11; seg.castShadow = true; seg.userData.part = 'arms'; seg.userData.enemy = this;
        g.add(seg); parent.add(g); segs.push(g);
        this.h.meshes.push(seg);
        parent = g;
      }
      g0(root);
      this.tentacles.push({ root, segs, splay, i });
    });
    function g0(r) { r.rotation.x = 0; }
  }

  poseTentacles(dt) {
    if (!this.tentacles) return;
    const t = G.time;
    for (const T of this.tentacles) {
      let rx = -0.9, ext = 1, curl = 0.25;
      if (this.lash > 0) {
        if (this.lashPhase === 'wind') { rx = -2.1; curl = 0.4; }
        else { rx = 1.45; ext = 1.9; curl = 0.02; }
      } else if (this.state === 'rising') { rx = -0.9 * Math.min(1, this.riseAnim * 1.5); ext = Math.max(0.05, Math.min(1, this.riseAnim * 1.2)); }
      T.root.rotation.x = damp(T.root.rotation.x, rx, this.lash > 0 ? 18 : 6, dt);
      T.root.rotation.z = T.splay * (this.lashPhase === 'strike' && this.lash > 0 ? 0.15 : 0.55);
      T.segs.forEach((g, k) => {
        g.rotation.x = Math.sin(t * 3 + k * 0.7 + T.i) * curl;
        g.rotation.z = Math.cos(t * 2.3 + k * 0.5 + T.i * 2) * curl * 0.6;
        const s = damp(g.scale.y, ext, 12, dt); g.scale.set(1, s, 1);
        if (k) g.position.y = 0.2 * T.segs[k - 1].scale.y;
      });
    }
  }

  release(broken) {
    if (this.state !== 'grab') return;
    this.state = 'chase';
    this.attackCd = 2.8;
    if (broken) {
      const away = this.pos.clone().sub(G.player.pos).setY(0).normalize();
      this.push.addScaledVector(away, 3);
      this.staggerT = 1.3;
      if (Math.random() < 0.4) this.downT = 2.2;
    }
  }

  // ----- update -----
  update(dt) {
    const p = G.player;
    if (!this.alive) { this.updateDeath(dt); return; }
    if (this.state === 'rising') {
      if (!this.riseHold) this.riseAnim += dt / 1.4;
      this.h.root.rotation.x = -Math.PI / 2 * Math.max(0, 1 - this.riseAnim * 1.3);
      this.h.root.position.y = 0.15 * Math.max(0, 1 - this.riseAnim * 1.3);
      poseHumanoid(this.h, { phase: 0, stride: 0, hunch: 0.6 });
      this.h.spine.rotation.x = 0.6 - this.riseAnim * 0.3;
      this.poseTentacles(dt);
      if (this.riseAnim >= 1) { this.state = 'chase'; this.aware = 1.2; this.h.root.rotation.x = 0; this.h.root.position.y = 0; }
      return;
    }
    this.attackCd -= dt;
    this.staggerT -= dt; this.downT -= dt;
    this.headSnap = Math.max(0, (this.headSnap || 0) - dt * 3);

    // perception
    this.senseT -= dt;
    if (this.senseT <= 0 && this.state !== 'dormant' && this.state !== 'fakeDead' && p.hp > 0) {
      const step = 0.15; this.senseT = step;
      const s = this.canSee(p);
      if (s > 0) {
        this.aware = Math.min(1.2, this.aware + step * (1.6 * s + 0.35));
        this.lastSeen.copy(p.pos); this.lostT = 0;
        if (this.aware >= 1) this.startChase();
        else if (this.state !== 'chase' && this.aware > 0.45) { this.target = p.pos.clone(); this.setState('suspicious'); }
      } else if (this.state !== 'chase') this.aware = Math.max(0, this.aware - step * 0.12);
      else this.lostT += step;
    }
    if (this.state === 'fakeDead' && dist2D(p.pos, this.pos) < 2.0 && p.hp > 0) this.wake();

    // ambient groans; the frail ones mostly cough
    this.groanT -= dt;
    if (this.groanT <= 0 && this.state !== 'dormant' && this.state !== 'fakeDead') {
      this.groanT = rand(5, 11);
      if (dist2D(p.pos, this.pos) < 18) {
        if (this.build === BUILDS.frail && Math.random() < 0.5) G.audio.cough(this.pos, 0.18);
        else G.audio.groan(this.pos, (this.reborn ? 1.4 : 1) * rand(0.9, 1.1), this.state === 'chase' ? 0.4 : 0.22);
      }
    }

    let want = null, speed = 0;
    const st = this.state;
    if (this.downT > 0 || st === 'dormant' || st === 'fakeDead' || st === 'grab' || this.lash > 0) {
      // no locomotion
    } else if (this.staggerT > 0) {
      // reeling from a hit
    } else if (st === 'idle' || st === 'feeding') {
      this.timer -= dt;
      if (st === 'idle' && this.timer <= 0) { this.yawTarget = this.yaw + rand(-1.5, 1.5); this.timer = rand(3, 6); if (Math.random() < 0.5) this.setState('wander'); }
    } else if (st === 'wander') {
      if (!this.target || dist2D(this.target, this.pos) < 0.6) {
        if (this.opts.patrol) this.target = new THREE.Vector3(...this.opts.patrol[(this.patrolI = ((this.patrolI ?? -1) + 1) % this.opts.patrol.length)]);
        else {
          const R = G.level.room(this.room);
          this.target = R ? new THREE.Vector3(rand(R.x0 + 1.5, R.x1 - 1.5), 0, rand(R.z0 + 1.5, R.z1 - 1.5)) : this.home.clone();
        }
        this.timer = 12;
      }
      this.timer -= dt; if (this.timer <= 0 && !this.opts.patrol) this.setState('idle');
      want = this.target; speed = this.speedWalk;
    } else if (st === 'suspicious') {
      if (this.target && dist2D(this.target, this.pos) > 0.8) { want = this.target; speed = this.speedWalk * 1.2; }
      else { this.timer -= dt; this.yawTarget = this.yaw + Math.sin(G.time) * 0.5; if (this.timer <= 0) { this.aware *= 0.5; this.setState(this.opts.patrol ? 'wander' : 'idle'); } }
    } else if (st === 'chase') {
      const d = dist2D(p.pos, this.pos);
      if (this.lostT > 7) { this.target = this.lastSeen.clone(); this.aware = 0.6; this.setState('suspicious'); }
      else if (p.hp > 0) {
        want = this.lostT > 0.5 ? this.lastSeen : p.pos;
        speed = this.speedChase * (this.windup > 0 ? 0.2 : 1);
        if (d < 1.35 && this.attackCd <= 0 && !p.grab && p.healT <= 0 && this.windup <= 0) this.windup = 0.55;
        // the Reborn lashes from mid range
        if (this.reborn && this.lash <= 0 && (this.lashCd -= dt) <= 0 && d > 1.4 && d < 3.9 && this.staggerT <= 0 && lineOfSight(this.headPos(), new THREE.Vector3(p.pos.x, 1.2, p.pos.z))) {
          this.lash = 0.8; this.lashPhase = 'wind'; this.lashHit = false;
          G.audio.shriek(this.pos);
        }
      }
    }

    // Reborn lash: rear back, then whip forward
    if (this.lash > 0) {
      this.lash -= dt;
      this.yawTarget = Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
      if (this.lash < 0.28 && this.lashPhase === 'wind') { this.lashPhase = 'strike'; G.audio.noise(0.15, { freq: 1200, q: 1, gain: 0.5, pos: this.pos, sweepTo: 300 }); }
      if (this.lashPhase === 'strike' && !this.lashHit) {
        const d = dist2D(p.pos, this.pos);
        const facing = Math.cos(angleDiff(this.yaw, Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z)));
        if (d < 4.1 && facing > 0.6 && p.hp > 0 && !p.grab) {
          this.lashHit = true;
          p.damage(16 * (G.strain || 1), { bleed: 0.45, knock: new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)).multiplyScalar(3) });
          p.infect(0.06);
        }
      }
      if (this.lash <= 0) { this.lashCd = rand(2.0, 2.8); this.lashPhase = null; }
    }

    // grab wind-up and lunge
    if (this.windup > 0) {
      this.windup -= dt;
      this.reach = true;
      if (this.windup <= 0) {
        const d = dist2D(p.pos, this.pos);
        if (d < 1.6 && !p.grab && p.hp > 0 && G.mode === 'play') {
          this.state = 'grab';
          p.grab = { enemy: this, t: 0, progress: 0 };
          G.audio.groan(this.pos, 1.2, 0.6);
          G.ui.struggle(0);
        } else this.attackCd = 1.2;
      }
    } else this.reach = st === 'chase' && dist2D(p.pos, this.pos) < 4 && !this.reborn;

    // locomotion with pathfinding
    if (want && speed > 0) {
      let goal = want;
      const direct = dist2D(want, this.pos) < 7 && lineOfSight(new THREE.Vector3(this.pos.x, 1, this.pos.z), new THREE.Vector3(want.x, 1, want.z));
      if (!direct) {
        this.repathT -= dt;
        if (!this.path || this.repathT <= 0) { this.path = G.level.findPath(this.pos, want); this.repathT = 0.6; }
        if (this.path && this.path.length) {
          while (this.path.length > 1 && dist2D(this.path[0], this.pos) < 0.5) this.path.shift();
          goal = this.path[0];
        } else goal = null;
      } else this.path = null;
      if (goal) {
        const dx = goal.x - this.pos.x, dz = goal.z - this.pos.z, len = Math.hypot(dx, dz);
        if (len > 0.05) {
          this.vel.x = damp(this.vel.x, dx / len * speed, 4, dt);
          this.vel.z = damp(this.vel.z, dz / len * speed, 4, dt);
          this.yawTarget = Math.atan2(dx, dz);
        }
      }
    } else { this.vel.x = damp(this.vel.x, 0, 6, dt); this.vel.z = damp(this.vel.z, 0, 6, dt); }
    if (st === 'grab') { this.yawTarget = Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z); const d = dist2D(p.pos, this.pos); if (d > 0.75) { this.pos.x += (p.pos.x - this.pos.x) * dt * 4; this.pos.z += (p.pos.z - this.pos.z) * dt * 4; } }

    this.pos.x += (this.vel.x + this.push.x) * dt;
    this.pos.z += (this.vel.z + this.push.z) * dt;
    this.push.multiplyScalar(Math.exp(-dt * 6));
    resolveCircle(this.pos, 0.3);
    if (st !== 'grab') this.separate(p.pos, 0.7);
    for (const o of G.enemies) if (o !== this && o.alive) this.separate(o.pos, 0.6);

    if (this.yawTarget != null && this.downT <= 0) this.yaw += angleDiff(this.yaw, this.yawTarget) * Math.min(1, dt * (this.lash > 0 ? 8 : 4));
    this.h.root.rotation.y = this.yaw;
    this.animate(dt);
  }

  separate(other, r) {
    const dx = this.pos.x - other.x, dz = this.pos.z - other.z, d = Math.hypot(dx, dz);
    if (d < r && d > 1e-4) { this.pos.x += dx / d * (r - d) * 0.5; this.pos.z += dz / d * (r - d) * 0.5; }
  }

  animate(dt) {
    const hs = Math.hypot(this.vel.x, this.vel.z);
    this.stride = damp(this.stride, Math.min(1, hs / 1.1), 6, dt);
    this.phase += dt * (3 + hs * 3.5);
    const st = this.state;
    const lying = this.downT > 0 || st === 'fakeDead';
    poseHumanoid(this.h, {
      phase: this.phase, stride: this.stride, limp: this.reborn ? 0.2 : 0.45, hunch: (this.reborn ? 0.45 : this.build.hunch) + this.headSnap * -0.5,
      reach: this.reach || st === 'grab', kneel: st === 'feeding' || st === 'dormant' ? 1 : 0, lean: this.lean,
      look: this.headSnap * -0.8,
    });
    const targetX = lying ? -Math.PI / 2 : 0;
    this.h.root.rotation.x = damp(this.h.root.rotation.x, targetX, lying ? 8 : 3, dt);
    this.h.root.position.y = -this.h.root.rotation.x / (Math.PI / 2) * 0.15;
    if (this.staggerT > 0) this.h.spine.rotation.x -= 0.3;
    if (st === 'feeding') { this.h.spine.rotation.x += 0.5 + Math.sin(G.time * 7) * 0.08; this.h.neck.rotation.x = 0.4; }
    this.poseTentacles(dt);
  }

  // During cutscenes enemies only animate in place.
  cineUpdate(dt) {
    if (!this.alive) { if (this.pendingRise) this.poseDead(dt); else this.updateDeath(dt); return; }
    if (this.state === 'rising') { this.update(dt); return; }
    this.vel.set(0, 0, 0);
    this.animate(dt);
  }

  poseDead(dt) {
    const k = Math.min(1, this.deathT * 1.8);
    this.h.root.rotation.x = damp(this.h.root.rotation.x, -Math.PI / 2, 6, dt);
    this.h.root.rotation.z = this.fallDir * 0.2 * k;
    this.h.root.position.y = 0.15 * k;
    poseHumanoid(this.h, { phase: 0, stride: 0, hunch: 0 });
    this.h.armL.sh.rotation.z = -0.9; this.h.armR.sh.rotation.z = 0.9;
  }

  updateDeath(dt) {
    this.deathT += dt;
    this.pos.x += this.push.x * dt; this.pos.z += this.push.z * dt;
    this.push.multiplyScalar(Math.exp(-dt * 6));
    this.poseDead(dt);
    if (this.riseT > 0) {
      this.riseT -= dt;
      // twitching: the last seconds before it gets back up
      if (this.riseT < 2.6) {
        const j = (2.6 - this.riseT) / 2.6;
        this.h.armR.sh.rotation.x = Math.sin(G.time * 31) * 0.5 * j;
        this.h.legL.hip.rotation.x = Math.sin(G.time * 23 + 1) * 0.4 * j;
        this.h.spine.rotation.x = Math.sin(G.time * 17) * 0.15 * j;
        if (!this.twitchSound) { this.twitchSound = true; G.audio.wetTear(this.pos); }
      }
      if (this.riseT <= 0) this.rise();
    }
  }
}

// ============================================================
// THE HOOKMAN: Chapter 1 boss. Dmitri Varga, night operator of Crane 3.
// ============================================================
export class Hookman extends Husk {
  constructor(o) {
    super({ ...o, hp: 1100, scale: 1.4, canRise: false, clothes: { top: 0x8a4a14, bottom: 0x2a3040, vest: 0x9a7a1a, helmet: 0xc9a227 }, speed: 1.15, bite: 0 });
    this.name = 'The Hookman';
    this.boss = true;
    this.phase2 = false;
    this.throwCd = 2.5;
    this.action = null; this.actionT = 0;
    // Hook and chain
    const steel = new THREE.MeshStandardMaterial({ color: 0x4a4440, metalness: 0.85, roughness: 0.4 });
    const hook = this.hook = new THREE.Group();
    const curve = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 8, 16, Math.PI * 1.35), steel);
    curve.rotation.z = Math.PI * 0.85;
    const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.32, 8), steel); shank.position.set(0.17, 0.18, 0);
    const eye = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 6, 12), steel); eye.position.set(0.17, 0.36, 0);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 8), steel); tip.position.set(0.12, -0.1, 0); tip.rotation.z = 0.9;
    hook.add(curve, shank, eye, tip);
    hook.traverse(c => { if (c.isMesh) c.castShadow = true; });
    G.scene.add(hook);
    this.hookPos = new THREE.Vector3(o.x, 1, o.z);
    this.hookVel = new THREE.Vector3();
    this.hookState = 'hand'; // hand | flying | stuck | reeling | dropped
    this.chainGeo = new THREE.BufferGeometry().setFromPoints(new Array(16).fill(0).map(() => new THREE.Vector3()));
    this.chain = new THREE.Line(this.chainGeo, new THREE.LineBasicMaterial({ color: 0x3a3632 }));
    this.chain.frustumCulled = false;
    G.scene.add(this.chain);
    // Growths on his back: the weak point
    this.growths = [];
    const gm = new THREE.MeshStandardMaterial({ color: 0x7a3a2a, emissive: 0xff6a2a, emissiveIntensity: 0.6, roughness: 0.4 });
    for (const [x, y, z, r] of [[0.02, 0.42, -0.19, 0.13], [0.12, 0.28, -0.17, 0.09], [-0.1, 0.22, -0.16, 0.08], [-0.03, 0.58, -0.12, 0.07]]) {
      const g = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), gm);
      g.position.set(x, y, z); g.userData = { enemy: this, part: 'weak' };
      this.h.spine.add(g); G.hitMeshes.push(g); this.growths.push(g);
    }
    this.glow = new THREE.PointLight(0xff6a2a, 1.6, 3, 2);
    this.h.spine.add(this.glow); this.glow.position.set(0, 0.42, -0.45);
    this.ray = new THREE.Raycaster();
  }

  canSee() { return 1; }
  hear() {}

  record() { return { ...super.record(), phase2: this.phase2 }; }

  dispose() { G.scene.remove(this.hook, this.chain); }

  handPos(out = new THREE.Vector3()) { this.h.root.updateMatrixWorld(true); return this.h.armR.grip.getWorldPosition(out); }

  takeHit(dmg, part) {
    if (!this.alive || this.state === 'dormant') return 'miss';
    let mult = { head: 1.2, torso: 0.55, arms: 0.4, legs: 0.5, weak: 3.0 }[part] ?? 0.5;
    if (part === 'weak' && this.action === 'stuck') mult *= 1.3;
    if (this.action === 'crushed') mult *= 1.25;
    this.hp -= dmg * mult;
    if (part === 'weak') {
      this.hurtT = 0.3;
      if (!['stuck', 'crushed', 'throw', 'roar'].includes(this.action)) { this.action = 'flinch'; this.actionT = 0.4; }
    }
    this.afterDamage();
    return 'hit';
  }

  afterDamage() {
    G.ui.boss(this.name, this.hp / this.maxHp);
    if (!this.phase2 && this.hp <= this.maxHp * 0.5 && this.hp > 0) this.enterPhase2();
    if (this.hp <= 0 && this.alive) {
      this.alive = false; this.state = 'dead'; this.finished = true; this.deathT = 0; this.fallDir = 1;
      G.hitMeshes = G.hitMeshes.filter(m => m.userData.enemy !== this);
      G.stats.kills++;
      G.audio.roar(this.pos);
      this.hookState = 'dropped';
      G.story.onHookmanDefeated(this);
    }
  }

  // The crane dropped a container. Returns true if it landed on him.
  crush(drop) {
    if (!this.alive) return false;
    const dx = Math.abs(this.pos.x - drop.x), dz = Math.abs(this.pos.z - drop.z);
    if (dx > 2.2 || dz > 3.8) return false;
    this.hp -= 330;
    this.action = 'crushed'; this.actionT = 3.6;
    this.pos.x = drop.x + Math.sign(this.pos.x - drop.x || 1) * 1.9;
    resolveCircle(this.pos, 0.55);
    G.audio.roar(this.pos);
    this.afterDamage();
    return true;
  }

  enterPhase2() {
    this.phase2 = true;
    this.action = 'roar'; this.actionT = 2.0;
    G.audio.roar(this.pos);
    G.player.shake = 1;
    this.speedChase = 1.6;
    for (const g of this.growths) g.scale.setScalar(1.25);
    G.story.onHookmanPhase2();
  }

  cineUpdate(dt) {
    if (!this.alive) { this.updateDeath(dt); return; }
    poseHumanoid(this.h, { phase: this.phase, stride: this.stride, limp: 0.25, hunch: 0.3 });
    this.h.root.rotation.y = this.yaw;
    this.updateHook(dt);
  }

  updateDeath(dt) {
    super.updateDeath(dt);
    this.updateHook(dt);
  }

  launchHook(p) {
    const from = this.handPos();
    const lead = p.pos.clone().addScaledVector(p.vel, 0.25);
    const dir = new THREE.Vector3(lead.x - from.x, 1.2 - from.y, lead.z - from.z).normalize();
    this.hookPos.copy(from);
    this.hookVel.copy(dir).multiplyScalar(21);
    this.hookFrom = from.clone();
    this.hookState = 'flying';
    this.action = 'throw'; this.actionT = 1.2;
    this.throwDir = Math.atan2(dir.x, dir.z);
    G.audio.chain(from, 0.5);
    G.audio.noise(0.3, { freq: 900, q: 1, gain: 0.4, pos: from, sweepTo: 400 });
  }

  updateHook(dt) {
    const hand = this.handPos();
    const p = G.player;
    if (this.hookState === 'hand' || this.hookState === 'dropped') {
      if (this.action === 'throwWind') {
        // whirling overhead while winding up
        const a = G.time * 14;
        this.hookPos.set(hand.x + Math.cos(a) * 0.9, hand.y + 0.4, hand.z + Math.sin(a) * 0.9);
      } else if (this.hookState === 'dropped') {
        this.hookPos.y = Math.max(0.1, this.hookPos.y - dt * 4);
      } else {
        const sw = Math.sin(G.time * 3) * 0.25;
        this.hookPos.set(hand.x + Math.sin(this.yaw + 1.6) * sw, hand.y - 0.85, hand.z + Math.cos(this.yaw + 1.6) * sw);
      }
    } else if (this.hookState === 'flying') {
      const prev = this.hookPos.clone();
      this.hookVel.y -= 3 * dt;
      this.hookPos.addScaledVector(this.hookVel, dt);
      const chest = new THREE.Vector3(p.pos.x, 1.2, p.pos.z);
      if (this.hookPos.distanceTo(chest) < 0.8 && p.hp > 0 && G.mode === 'play') {
        // Hooked: damage, then dragged toward him.
        p.damage(20 * (G.strain || 1), { bleed: 0.5, arm: 0.2 });
        const pull = new THREE.Vector3(this.pos.x - p.pos.x, 0, this.pos.z - p.pos.z).normalize().multiplyScalar(7);
        p.vel.add(pull); p.stunT = 0.6;
        G.audio.chain(p.pos, 0.6);
        this.hookState = 'reeling'; this.action = 'reel'; this.actionT = 0.7;
      } else {
        const seg = this.hookPos.clone().sub(prev);
        this.ray.set(prev, seg.clone().normalize()); this.ray.far = seg.length() + 0.15;
        const hit = this.ray.intersectObjects(G.worldMeshes, false).find(h => h.object.visible);
        const far = this.hookPos.distanceTo(this.hookFrom) > 16;
        if (hit || far || this.hookPos.y < 0.15) {
          // Missed: the hook bites into steel (or the ground) and he overreaches.
          if (hit) this.hookPos.copy(hit.point); else this.hookPos.y = Math.max(0.15, this.hookPos.y);
          this.hookState = 'stuck';
          this.action = 'stuck'; this.actionT = this.phase2 ? 2.1 : 2.7;
          G.audio.clang(this.hookPos);
          G.weapons.sparks(this.hookPos.clone(), 0xffd080, 10, hit?.face?.normal || new THREE.Vector3(0, 1, 0));
          G.story.onHookStuck?.();
        }
      }
    } else if (this.hookState === 'reeling') {
      const to = hand.clone().sub(this.hookPos);
      const d = to.length();
      if (d < 0.4) this.hookState = 'hand';
      else this.hookPos.addScaledVector(to.normalize(), Math.min(d, 22 * dt));
    }
    this.hook.position.copy(this.hookPos);
    this.hook.lookAt(hand);
    // the chain sags between the fist and the hook unless it is pulled taut
    const pts = this.chainGeo.attributes.position;
    const taut = this.hookState === 'stuck' || this.hookState === 'flying';
    const sag = taut ? 0.05 : 0.5 * Math.min(1, hand.distanceTo(this.hookPos) / 2);
    for (let k = 0; k < 16; k++) {
      const t = k / 15;
      const x = hand.x + (this.hookPos.x - hand.x) * t, z = hand.z + (this.hookPos.z - hand.z) * t;
      const y = hand.y + (this.hookPos.y - hand.y) * t - Math.sin(t * Math.PI) * sag;
      pts.setXYZ(k, x, y, z);
    }
    pts.needsUpdate = true;
  }

  update(dt) {
    const p = G.player;
    if (!this.alive) { this.updateDeath(dt); return; }
    if (this.state === 'dormant') { this.cineUpdate(dt); return; }
    this.hurtT = Math.max(0, (this.hurtT || 0) - dt);
    const open = this.action === 'stuck' || this.action === 'crushed';
    for (const g of this.growths) g.material.emissiveIntensity = (open ? 1.6 : 0.6) + Math.sin(G.time * 5) * 0.35 + this.hurtT * 4;
    this.glow.intensity = open ? 3.5 : 1.4;
    this.throwCd -= dt;
    const d = dist2D(p.pos, this.pos);
    const toP = Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
    let speed = 0;

    switch (this.action) {
      case 'swing': {
        this.actionT -= dt;
        if (!this.hitDone && this.actionT < 0.3) {
          this.hitDone = true;
          G.audio.noise(0.25, { freq: 400, gain: 0.5, pos: this.pos });
          const facing = Math.cos(angleDiff(this.yaw, toP));
          if (d < 2.9 && facing > 0.3 && p.hp > 0) p.damage((this.phase2 ? 28 : 24) * (G.strain || 1), { arm: 0.25, leg: 0.2, knock: new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)).multiplyScalar(5) });
        }
        if (this.actionT > 0.3) this.yaw += angleDiff(this.yaw, toP) * Math.min(1, dt * 3);
        if (this.actionT <= 0) this.action = null;
        break;
      }
      case 'throwWind':
        this.actionT -= dt;
        this.yaw += angleDiff(this.yaw, toP) * Math.min(1, dt * 6);
        if (Math.random() < dt * 6) G.audio.chain(this.pos, 0.15);
        if (this.actionT <= 0) this.launchHook(p);
        break;
      case 'throw':
        this.actionT -= dt;
        this.yaw += angleDiff(this.yaw, this.throwDir) * Math.min(1, dt * 8);
        if (this.actionT <= 0 && this.hookState === 'flying') { this.hookState = 'reeling'; this.action = 'reel'; this.actionT = 0.6; }
        break;
      case 'stuck':
        // overreached: leaning into the chain, his back open to whoever is behind him
        this.actionT -= dt;
        this.yaw += angleDiff(this.yaw, Math.atan2(this.hookPos.x - this.pos.x, this.hookPos.z - this.pos.z)) * Math.min(1, dt * 6);
        if (Math.random() < dt * 3) G.audio.chain(this.hookPos, 0.2);
        if (this.actionT <= 0) { this.hookState = 'reeling'; this.action = 'reel'; this.actionT = 0.6; G.audio.chain(this.pos, 0.5); }
        break;
      case 'reel':
      case 'crushed':
      case 'flinch':
      case 'roar':
        this.actionT -= dt;
        if (this.action === 'reel' && this.hookState === 'hand') this.actionT = Math.min(this.actionT, 0.1);
        if (this.action === 'crushed' && this.actionT <= 0) G.audio.roar(this.pos);
        if (this.actionT <= 0) this.action = null;
        break;
      default: {
        this.yaw += angleDiff(this.yaw, toP) * Math.min(1, dt * 3);
        const sight = lineOfSight(this.headPos(), new THREE.Vector3(p.pos.x, 1.3, p.pos.z));
        if (d < 2.6) { this.action = 'swing'; this.actionT = (this.phase2 ? 0.45 : 0.6) + 0.3; this.hitDone = false; }
        else if (d > 4.5 && d < 15 && this.throwCd <= 0 && sight && this.hookState === 'hand') {
          this.action = 'throwWind'; this.actionT = this.phase2 ? 0.6 : 0.9;
          this.throwCd = this.phase2 ? 2.6 : 3.8;
          G.audio.chain(this.pos, 0.4);
        } else speed = this.speedChase;
      }
    }

    if (speed > 0) {
      let goal = p.pos;
      if (!lineOfSight(new THREE.Vector3(this.pos.x, 1, this.pos.z), new THREE.Vector3(p.pos.x, 1, p.pos.z))) {
        this.repathT -= dt;
        if (!this.path || this.repathT <= 0) { this.path = G.level.findPath(this.pos, p.pos); this.repathT = 0.6; }
        if (this.path?.length) { while (this.path.length > 1 && dist2D(this.path[0], this.pos) < 0.6) this.path.shift(); goal = this.path[0]; }
      }
      const dx = goal.x - this.pos.x, dz = goal.z - this.pos.z, len = Math.hypot(dx, dz) || 1;
      this.vel.set(dx / len * speed, 0, dz / len * speed);
    } else this.vel.multiplyScalar(Math.exp(-dt * 8));
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
    resolveCircle(this.pos, 0.55);
    this.separate(p.pos, 1.0);
    this.h.root.rotation.y = this.yaw;

    // pose
    const hs = Math.hypot(this.vel.x, this.vel.z);
    this.stride = damp(this.stride, Math.min(1.2, hs / 1.2), 6, dt);
    this.phase += dt * (2.4 + hs * 2.6);
    poseHumanoid(this.h, { phase: this.phase, stride: this.stride, limp: 0.3, hunch: this.action === 'stuck' ? 0.7 : 0.3, kneel: this.action === 'crushed' ? 1 : 0 });
    const R = this.h.armR, L = this.h.armL;
    if (this.action === 'swing') {
      const wind = this.phase2 ? 0.45 : 0.6;
      const k = clamp(1 - (this.actionT - 0.3) / wind, 0, 1);
      if (this.actionT > 0.3) R.sh.rotation.set(-2.5 * k, 0, 0.5);
      else R.sh.rotation.set(-2.5 + (0.3 - this.actionT) * 9, 0, 0.3);
    } else if (this.action === 'throwWind') { R.sh.rotation.set(-2.9, 0, 0.2); R.elbow.rotation.x = -0.3; }
    else if (this.action === 'throw') { R.sh.rotation.set(-1.5, 0, 0.1); R.elbow.rotation.x = 0; }
    else if (this.action === 'stuck') {
      R.sh.rotation.set(-1.3, 0, 0.2); L.sh.rotation.set(-1.3, 0, -0.2); R.elbow.rotation.x = -0.2; L.elbow.rotation.x = -0.2;
      this.h.spine.rotation.x = 0.75; this.h.hips.position.y -= 0.12;
    } else if (this.action === 'roar') { this.h.spine.rotation.x = -0.3; this.h.neck.rotation.x = -0.6; L.sh.rotation.z = -1.1; R.sh.rotation.z = 1.1; }
    this.updateHook(dt);
    this.h.root.rotation.x = 0; this.h.root.position.y = 0;
  }
}
