// The infected and the Warden: perception (sight cone, light, crouching,
// hearing), a detection meter, pathfinding chase, grabs, hit reactions,
// knockdowns, decapitation and the boss's shield and charge.
import * as THREE from 'three';
import { G, rand, clamp, damp, angleDiff, resolveCircle, lineOfSight, dist2D, addUpdater } from './game.js';
import { buildHumanoid, poseHumanoid } from './humanoid.js';

const PART_MULT = { head: 2.2, torso: 1, arms: 0.6, legs: 0.7, weak: 2.5 };
const CLOTHES = [
  { top: 0x26344a, bottom: 0x1c2230, helmet: null },   // police
  { top: 0x5a4a3a, bottom: 0x2e2a26 },                 // civilian coat
  { top: 0x7a7468, bottom: 0x353a44 },                 // shirt
  { top: 0x3a2a2a, bottom: 0x2a2a2a },
];

let lastSting = -99;

export class Zombie {
  constructor(o) {
    this.opts = o;
    const look = o.clothes || CLOTHES[(Math.random() * CLOTHES.length) | 0];
    this.h = buildHumanoid({ zombie: true, skin: 0xa3a690, hair: Math.random() < 0.3 ? null : 0x1a1612, scale: o.scale ?? rand(0.95, 1.06), ...look });
    this.h.root.position.set(o.x, 0, o.z);
    this.h.root.rotation.y = this.yaw = o.yaw ?? rand(0, 6.28);
    G.scene.add(this.h.root);
    this.pos = this.h.root.position;
    this.home = this.pos.clone();
    this.name = o.name || 'infected';
    this.hp = this.maxHp = o.hp ?? 110;
    this.alive = true;
    this.state = o.state || 'idle';
    this.startState = this.state;
    this.room = o.room || G.level.roomAt(o.x, o.z)?.id;
    this.aware = 0;
    this.vel = new THREE.Vector3();
    this.push = new THREE.Vector3();
    this.phase = rand(0, 6);
    this.stride = 0;
    this.speedWalk = 0.5; this.speedChase = o.speed ?? rand(1.0, 1.25);
    this.path = null; this.repathT = 0; this.senseT = rand(0, 0.2);
    this.lostT = 0; this.lastSeen = new THREE.Vector3();
    this.target = null; this.timer = rand(1, 4);
    this.attackCd = 1; this.windup = 0;
    this.staggerT = 0; this.downT = 0; this.deathT = 0;
    this.groanT = rand(2, 8);
    this.biteDamage = o.bite ?? 24;
    this.headless = false;
    this.onDeath = o.onDeath;
    this.lean = rand(-0.15, 0.15);
    for (const m of this.h.meshes) { m.userData.enemy = this; G.hitMeshes.push(m); }
    G.enemies.push(this);
  }

  get downed() { return this.downT > 0; }

  snapshot() {
    return { alive: this.alive, hp: this.hp, x: this.home.x, z: this.home.z, state: this.startState };
  }

  // ----- senses -----
  hear(pos, radius, kind) {
    if (!this.alive || this.state === 'dormant') return;
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
      if (this.aware >= 1) this.startChase(); else if (this.state !== 'caged') this.setState('suspicious');
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
    if (this.state === 'caged') { this.aware = 1.2; return; }
    if (this.state !== 'chase') {
      this.state = 'chase'; this.lostT = 0;
      G.audio.groan(this.pos, 1, 0.5);
      if (G.time - lastSting > 20) { lastSting = G.time; G.audio.sting(); }
    }
  }

  // ----- damage -----
  takeHit(dmg, part, dir, impulse = 1, point) {
    if (!this.alive) return 'miss';
    if (this.state === 'dormant' || this.state === 'fakeDead') this.wake();
    const mult = PART_MULT[part] ?? 1;
    const amount = dmg * mult * (this.downed ? 1.3 : 1);
    this.hp -= amount;
    this.aware = 1.2;
    if (this.state !== 'grab' && this.state !== 'caged') this.startChase();
    this.push.addScaledVector(new THREE.Vector3(dir.x, 0, dir.z).normalize(), impulse);
    if (part === 'head') { this.staggerT = Math.max(this.staggerT, 0.55); this.headSnap = 1; }
    else if (part === 'legs' && !this.downed && Math.random() < 0.3 * impulse) { this.downT = 2.8; G.audio.groan(this.pos, 1.1, 0.3); }
    else this.staggerT = Math.max(this.staggerT, 0.25 + impulse * 0.08);
    if (this.state === 'grab') this.release(true);
    if (this.hp <= 0) this.die(part, dir, amount);
    return 'hit';
  }

  die(part, dir, lastDamage) {
    this.alive = false; this.state = 'dead';
    G.stats.kills++;
    this.fallDir = Math.random() < 0.5 ? 1 : -1;
    if (part === 'head' && (lastDamage > 60 || Math.random() < 0.45)) this.decapitate(dir);
    G.hitMeshes = G.hitMeshes.filter(m => m.userData.enemy !== this);
    G.audio.groan(this.pos, 0.8, 0.25);
    this.onDeath?.(this);
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
        else if (this.state !== 'chase' && this.state !== 'caged' && this.aware > 0.45) { this.target = p.pos.clone(); this.setState('suspicious'); }
      } else if (this.state !== 'chase') this.aware = Math.max(0, this.aware - step * 0.12);
      else this.lostT += step;
    }
    if (this.state === 'fakeDead' && dist2D(p.pos, this.pos) < 2.0 && p.hp > 0) this.wake();

    // ambient groans
    this.groanT -= dt;
    if (this.groanT <= 0 && this.state !== 'dormant' && this.state !== 'fakeDead') {
      this.groanT = rand(5, 11);
      if (dist2D(p.pos, this.pos) < 18) G.audio.groan(this.pos, rand(0.9, 1.1), this.state === 'chase' ? 0.4 : 0.22);
    }

    let want = null, speed = 0;
    const st = this.state;
    if (this.downT > 0 || st === 'dormant' || st === 'fakeDead' || st === 'grab') {
      // no locomotion
    } else if (this.staggerT > 0) {
      // reeling from a hit
    } else if (st === 'idle') {
      this.timer -= dt;
      if (this.timer <= 0) { this.yawTarget = this.yaw + rand(-1.5, 1.5); this.timer = rand(3, 6); if (Math.random() < 0.5) this.setState('wander'); }
    } else if (st === 'wander') {
      if (!this.target || dist2D(this.target, this.pos) < 0.6) {
        const R = G.level.room(this.room);
        this.target = R ? new THREE.Vector3(rand(R.x0 + 1.5, R.x1 - 1.5), 0, rand(R.z0 + 1.5, R.z1 - 1.5)) : this.home.clone();
        this.timer = 8;
      }
      this.timer -= dt; if (this.timer <= 0) this.setState('idle');
      want = this.target; speed = this.speedWalk;
    } else if (st === 'suspicious') {
      if (this.target && dist2D(this.target, this.pos) > 0.8) { want = this.target; speed = this.speedWalk * 1.2; }
      else { this.timer -= dt; this.yawTarget = this.yaw + Math.sin(G.time) * 0.5; if (this.timer <= 0) { this.aware *= 0.5; this.setState('idle'); } }
    } else if (st === 'chase' || st === 'caged') {
      const d = dist2D(p.pos, this.pos);
      if (this.lostT > 7 && st === 'chase') { this.target = this.lastSeen.clone(); this.aware = 0.6; this.setState('suspicious'); }
      else if (p.hp > 0) {
        want = this.lostT > 0.5 ? this.lastSeen : p.pos;
        speed = this.speedChase * (this.windup > 0 ? 0.2 : 1);
        if (d < 1.35 && this.attackCd <= 0 && !p.grab && p.healT <= 0 && this.windup <= 0 && st === 'chase') this.windup = 0.55;
      }
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
    } else this.reach = st === 'chase' && dist2D(p.pos, this.pos) < 4;

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
    // keep personal space from Mara and each other
    if (st !== 'grab') this.separate(p.pos, 0.7);
    for (const o of G.enemies) if (o !== this && o.alive) this.separate(o.pos, 0.6);

    if (this.yawTarget != null && this.downT <= 0) this.yaw += angleDiff(this.yaw, this.yawTarget) * Math.min(1, dt * 4);
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
      phase: this.phase, stride: this.stride, limp: 0.45, hunch: 0.25 + this.headSnap * -0.5,
      reach: this.reach || st === 'grab', kneel: st === 'feeding' || st === 'dormant' ? 1 : 0, lean: this.lean,
      look: this.headSnap * -0.8,
    });
    // knockdown / fake death: lie on the floor
    const targetX = lying ? -Math.PI / 2 : 0;
    this.h.root.rotation.x = damp(this.h.root.rotation.x, targetX, lying ? 8 : 3, dt);
    this.h.root.position.y = -this.h.root.rotation.x / (Math.PI / 2) * 0.15;
    if (this.staggerT > 0) this.h.spine.rotation.x -= 0.3;
  }

  // During cutscenes enemies only animate in place.
  cineUpdate(dt) {
    if (!this.alive) { this.updateDeath(dt); return; }
    this.vel.set(0, 0, 0);
    this.animate(dt);
  }

  updateDeath(dt) {
    this.deathT += dt;
    const k = Math.min(1, this.deathT * 1.8);
    this.h.root.rotation.x = damp(this.h.root.rotation.x, -Math.PI / 2, 6, dt);
    this.h.root.rotation.z = this.fallDir * 0.2 * k;
    this.h.root.position.y = 0.15 * k;
    this.pos.x += this.push.x * dt; this.pos.z += this.push.z * dt;
    this.push.multiplyScalar(Math.exp(-dt * 6));
    poseHumanoid(this.h, { phase: 0, stride: 0, hunch: 0 });
    this.h.armL.sh.rotation.z = -0.9; this.h.armR.sh.rotation.z = 0.9;
  }
}

// ============================================================
// THE WARDEN: Chapter 1 boss
// ============================================================
export class Warden extends Zombie {
  constructor(o) {
    super({ ...o, hp: 900, scale: 1.38, clothes: { top: 0x1f2a3a, bottom: 0x161b24, vest: 0x15181c }, speed: 1.3, bite: 0 });
    this.name = 'The Warden';
    this.boss = true;
    this.phase2 = false;
    this.shieldUp = true;
    this.chargeCd = 3;
    this.action = null; this.actionT = 0;
    // fused riot shield in front of the torso
    const sm = new THREE.MeshStandardMaterial({ color: 0x2c3438, metalness: 0.5, roughness: 0.35, transparent: true, opacity: 0.92 });
    this.shield = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.05, 0.05), sm);
    this.shield.position.set(0.08, 0.15, 0.3);
    this.shield.userData = { enemy: this, part: 'shield' };
    this.h.spine.add(this.shield);
    G.hitMeshes.push(this.shield);
    const visor = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.12), new THREE.MeshBasicMaterial({ color: 0xd8d8c8, transparent: true, opacity: 0.6 }));
    visor.position.set(0, 0.3, 0.026); this.shield.add(visor);
    // baton
    const baton = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 8), new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.5 }));
    baton.position.y = -0.25; this.h.armR.grip.add(baton);
    // pulsing growths on the back and neck: the weak point
    this.growths = [];
    const gm = new THREE.MeshStandardMaterial({ color: 0x8a3a1a, emissive: 0xff5a1a, emissiveIntensity: 0.8, roughness: 0.4 });
    for (const [x, y, z, r] of [[0, 0.45, -0.17, 0.11], [0.1, 0.3, -0.16, 0.08], [-0.1, 0.2, -0.15, 0.07], [0, 0.62, -0.08, 0.07]]) {
      const g = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), gm);
      g.position.set(x, y, z); g.userData = { enemy: this, part: 'weak' };
      this.h.spine.add(g); G.hitMeshes.push(g); this.growths.push(g);
    }
    for (const m of this.h.meshes) G.hitMeshes.includes(m) || G.hitMeshes.push(m);
    this.glow = new THREE.PointLight(0xff5a1a, 2, 3, 2);
    this.h.spine.add(this.glow); this.glow.position.set(0, 0.45, -0.4);
  }

  canSee() { return 1; }
  hear() {}

  takeHit(dmg, part, dir, impulse = 1, point) {
    if (!this.alive || this.state === 'dormant') return 'miss';
    if (part === 'shield' && this.shieldUp) return 'blocked';
    // the shield covers the body from the front
    const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const fromFront = fwd.dot(new THREE.Vector3(-dir.x, 0, -dir.z).normalize()) > 0.25;
    if (this.shieldUp && fromFront && (part === 'torso' || part === 'arms') && this.action !== 'stunned') return 'blocked';
    let mult = { head: 1.5, torso: 1, arms: 0.5, legs: 0.5, weak: 2.0 }[part] ?? 1;
    if (this.action === 'stunned') mult *= 1.25;
    this.hp -= dmg * mult;
    if (part === 'weak') { this.hurtT = 0.25; if (this.action !== 'charge' && this.action !== 'stunned') { this.action = 'flinch'; this.actionT = 0.35; } }
    G.ui.boss(this.name, this.hp / this.maxHp);
    if (!this.phase2 && this.hp <= this.maxHp * 0.5) this.enterPhase2();
    if (this.hp <= 0) { this.alive = false; this.state = 'dead'; G.hitMeshes = G.hitMeshes.filter(m => m.userData.enemy !== this); G.stats.kills++; G.audio.roar(this.pos); G.story.onWardenDefeated(this); }
    return 'hit';
  }

  enterPhase2() {
    this.phase2 = true; this.shieldUp = false;
    this.action = 'roar'; this.actionT = 2.2;
    G.audio.roar(this.pos);
    G.player.shake = 1;
    // the shield tears off and clatters to the floor
    const s = this.shield;
    G.scene.attach(s);
    G.hitMeshes = G.hitMeshes.filter(m => m !== s);
    const v = new THREE.Vector3(rand(-1, 1), 2.5, rand(-1, 1));
    let n = 0;
    addUpdater((dt) => {
      v.y -= 9.8 * dt; s.position.addScaledVector(v, dt); s.rotation.x += dt * 4;
      if (s.position.y < 0.05) { s.position.y = 0.05; v.multiplyScalar(0.3); v.y = Math.abs(v.y); n++; }
      if (n > 2) { s.rotation.set(-Math.PI / 2, 0, 0); return false; }
      return true;
    });
    this.speedChase = 1.9;
    G.story.onWardenPhase2();
  }

  cineUpdate(dt) {
    if (!this.alive) { this.updateDeath(dt); return; }
    poseHumanoid(this.h, { phase: this.phase, stride: this.stride, limp: 0.2, hunch: 0.2 });
    this.h.armL.sh.rotation.set(-1.2, 0, -0.9); this.h.armL.elbow.rotation.x = -1.2;
    this.h.root.rotation.y = this.yaw;
  }

  update(dt) {
    const p = G.player;
    if (!this.alive) { this.updateDeath(dt); return; }
    if (this.state === 'dormant') { this.cineUpdate(dt); return; }
    this.hurtT = Math.max(0, (this.hurtT || 0) - dt);
    for (const g of this.growths) g.material.emissiveIntensity = 0.7 + Math.sin(G.time * 5) * 0.4 + this.hurtT * 4;
    this.chargeCd -= dt;
    const d = dist2D(p.pos, this.pos);
    const toP = Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
    let speed = 0;

    switch (this.action) {
      case 'swing': {
        this.actionT -= dt;
        const wind = this.phase2 ? 0.4 : 0.55;
        if (!this.hitDone && this.actionT < 0.35) {
          this.hitDone = true;
          G.audio.noise(0.2, { freq: 400, gain: 0.5, pos: this.pos });
          const facing = Math.cos(angleDiff(this.yaw, toP));
          if (d < 2.5 && facing > 0.3 && p.hp > 0) p.damage(this.phase2 ? 26 : 22, { arm: 0.25, knock: new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)).multiplyScalar(4) });
        }
        if (this.actionT > 0.35) this.yaw += angleDiff(this.yaw, toP) * Math.min(1, dt * 3);
        if (this.actionT <= 0) this.action = null;
        void wind;
        break;
      }
      case 'chargeWind':
        this.actionT -= dt;
        this.yaw += angleDiff(this.yaw, toP) * Math.min(1, dt * 5);
        if (this.actionT <= 0) { this.action = 'charge'; this.actionT = 2.4; this.chargeDir = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)); this.hitPlayer = false; }
        break;
      case 'charge': {
        this.actionT -= dt;
        const step = this.chargeDir.clone().multiplyScalar(8.5 * dt);
        this.pos.add(step);
        const before = this.pos.clone();
        const hitWall = resolveCircle(this.pos, 0.55);
        if (hitWall && before.distanceTo(this.pos) > 0.02) {
          this.action = 'stunned'; this.actionT = 3.4;
          G.audio.slam(this.pos); p.shake = Math.max(p.shake, 0.8);
          G.ui.toast('The Warden is stunned. Shoot the growths on his back.');
          G.weapons.particles(this.pos.clone().setY(1.5), 0x8a8478, 14, { additive: false, speed: 2, life: 1, size: 0.25, gravity: 0.1 });
          break;
        }
        if (!this.hitPlayer && d < 1.3 && p.hp > 0) {
          this.hitPlayer = true;
          p.damage(this.phase2 ? 34 : 30, { leg: 0.5, knock: this.chargeDir.clone().multiplyScalar(7) });
          this.action = 'recover'; this.actionT = 1.0;
        }
        if (this.actionT <= 0) { this.action = 'recover'; this.actionT = 0.8; }
        this.stride = 1.4;
        break;
      }
      case 'stunned':
      case 'recover':
      case 'flinch':
      case 'roar':
        this.actionT -= dt;
        if (this.actionT <= 0) { this.action = null; if (this.state !== 'chase') this.state = 'chase'; }
        break;
      default: {
        // decide what to do next
        this.yaw += angleDiff(this.yaw, toP) * Math.min(1, dt * 2.5);
        if (d < 2.3) { this.action = 'swing'; this.actionT = (this.phase2 ? 0.4 : 0.55) + 0.35; this.hitDone = false; }
        else if (d > 5 && this.chargeCd <= 0 && lineOfSight(this.headPos(), new THREE.Vector3(p.pos.x, 1.3, p.pos.z))) {
          this.action = 'chargeWind'; this.actionT = this.phase2 ? 0.6 : 0.9; this.chargeCd = this.phase2 ? 4.5 : 6.5;
          G.audio.roar(this.pos);
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
    } else if (this.action !== 'charge') this.vel.multiplyScalar(Math.exp(-dt * 8));
    if (this.action !== 'charge') { this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt; resolveCircle(this.pos, 0.55); }
    this.separate(p.pos, 0.95);
    this.h.root.rotation.y = this.yaw;

    // pose
    const hs = this.action === 'charge' ? 4 : Math.hypot(this.vel.x, this.vel.z);
    this.stride = damp(this.stride, Math.min(1.3, hs / 1.3), 6, dt);
    this.phase += dt * (2.5 + hs * 2.6);
    poseHumanoid(this.h, { phase: this.phase, stride: this.stride, limp: 0.2, hunch: this.action === 'charge' ? 0.6 : 0.2, kneel: this.action === 'stunned' ? 1 : 0 });
    const R = this.h.armR;
    if (this.action === 'swing') {
      const k = clamp(1 - (this.actionT - 0.35) / (this.phase2 ? 0.4 : 0.55), 0, 1);
      if (this.actionT > 0.35) R.sh.rotation.set(-2.6 * k, 0, 0.3);
      else R.sh.rotation.set(-2.6 + (0.35 - this.actionT) * 8, 0, 0.3);
    }
    if (this.action === 'roar' || this.action === 'chargeWind') { this.h.spine.rotation.x = -0.3; this.h.neck.rotation.x = -0.5; this.h.armL.sh.rotation.z = -1; R.sh.rotation.z = 1; }
    if (this.shieldUp) {
      this.shield.position.y = this.action === 'stunned' ? -0.25 : 0.15;
      this.shield.rotation.x = this.action === 'stunned' ? 0.5 : 0;
      this.h.armL.sh.rotation.set(-1.2, 0, -0.9); this.h.armL.elbow.rotation.x = -1.2;
    }
    this.h.root.rotation.x = 0; this.h.root.position.y = 0;
  }
}
