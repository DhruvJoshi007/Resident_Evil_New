// Mara Kessler: movement, health states, injuries, camera and flashlight.
import * as THREE from 'three';
import { G, clamp, damp, angleDiff, resolveCircle, makeNoise, rand } from './game.js';
import { buildHumanoid, poseHumanoid } from './humanoid.js';
import { bloodTexture } from './textures.js';

export const MAX_HP = 100;
const RADIUS = 0.32;

export class Player {
  constructor() {
    this.h = buildHumanoid({ top: 0x8e2f22, bottom: 0x30332a, skin: 0xc79b80, hair: 0x2a1b12, ponytail: true });
    // Reflective strips on the rescue jacket
    const strip = new THREE.MeshStandardMaterial({ color: 0xbfbfa8, emissive: 0x222218, roughness: 0.3 });
    for (const y of [0.22, 0.36]) {
      const s = new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.012, 4, 20), strip);
      s.rotation.x = Math.PI / 2; s.scale.set(1.15, 0.78, 1); s.position.y = y; this.h.spine.add(s);
    }
    G.scene.add(this.h.root);
    this.pos = this.h.root.position;
    this.vel = new THREE.Vector3();
    this.yaw = Math.PI; this.camYaw = Math.PI; this.camPitch = -0.08;
    this.hp = MAX_HP;
    this.injuries = new Set();
    this.crouch = false; this.aiming = false; this.sprinting = false;
    this.stamina = 1;
    this.phase = 0; this.stride = 0; this.lastStepSign = 1;
    this.healT = 0; this.healItem = null;
    this.knifeT = 0; this.knifeCd = 0; this.counterCd = 0;
    this.grab = null;
    this.hurtFlash = 0;
    this.shoulder = 1; this.shoulderLerp = 1;
    this.camDist = 2.6; this.fov = 62;
    this.recoil = 0; this.shake = 0;
    this.sway = new THREE.Vector2();
    this.turnT = 0;
    this.bleedT = 0; this.dropT = 0;
    this.heartT = 0;
    this.flashOn = true;
    this.control = true;     // false during cutscenes
    this.autoWalk = null;    // cutscene-driven walking target
    this.camOverride = null; // cutscene camera
    this.camPos = new THREE.Vector3();

    const fl = this.flashlight = new THREE.SpotLight(0xfff1dc, 70, 28, 0.44, 0.55, 1.5);
    fl.castShadow = true;
    fl.shadow.mapSize.set(1024, 1024);
    fl.shadow.bias = -0.0005; fl.shadow.camera.near = 0.3; fl.shadow.camera.far = 28;
    G.scene.add(fl, fl.target);
    this.fill = new THREE.PointLight(0x9fb2c8, 1.2, 5, 2);
    G.scene.add(this.fill);
    this.ray = new THREE.Raycaster();
  }

  get state() {
    if (this.hp <= 0) return 'dead';
    if (this.hp > 66) return 'fine';
    if (this.hp > 33) return 'caution';
    return 'danger';
  }

  get limp() {
    let l = 0;
    if (this.injuries.has('leg')) l += 0.75;
    if (this.state === 'danger') l += 0.5;
    else if (this.state === 'caution') l += 0.12;
    return Math.min(1, l);
  }

  forward3D(out = new THREE.Vector3()) {
    const y = this.camYaw + this.sway.x, p = this.camPitch + this.recoil + this.sway.y;
    return out.set(Math.sin(y) * Math.cos(p), Math.sin(p), Math.cos(y) * Math.cos(p));
  }

  damage(amount, opts = {}) {
    if (this.hp <= 0 || G.mode === 'cine') return;
    this.hp = Math.max(0, this.hp - amount);
    this.hurtFlash = 1; this.shake = Math.max(this.shake, 0.5);
    G.audio.hurt();
    if (opts.leg && Math.random() < opts.leg) this.addInjury('leg');
    if (opts.bleed && Math.random() < opts.bleed) this.addInjury('bleeding');
    if (opts.arm && Math.random() < opts.arm) this.addInjury('arm');
    if (opts.knock) this.vel.add(opts.knock);
    this.spawnBlood(this.pos.x, this.pos.z, 0.5);
    if (this.hp <= 0) this.die();
  }

  addInjury(kind) {
    if (this.injuries.has(kind)) return;
    this.injuries.add(kind);
    const names = { leg: 'Leg injured. Mara will limp until treated.', bleeding: 'Bleeding. Use a herb to stop it.', arm: 'Arm injured. Aim and reload suffer.' };
    G.ui.toast(names[kind] || kind);
  }

  heal(amount, cures = []) {
    this.hp = Math.min(MAX_HP, this.hp + amount);
    for (const c of cures) this.injuries.delete(c);
  }

  die() {
    this.grab = null;
    this.deathT = 0;
    G.story.onPlayerDeath();
  }

  startHeal(item) {
    this.healT = 1.3; this.healItem = item;
    this.aiming = false;
  }

  spawnBlood(x, z, size) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: bloodTexture(), transparent: true, depthWrite: false, opacity: 0.85 }));
    s.rotation.x = -Math.PI / 2; s.rotation.z = Math.random() * 6;
    s.position.set(x + rand(-0.2, 0.2), 0.015, z + rand(-0.2, 0.2));
    G.scene.add(s);
  }

  update(dt) {
    const I = G.input;
    const canAct = this.control && G.mode === 'play' && this.hp > 0;
    const st = this.state;
    this.knifeCd -= dt; this.counterCd -= dt; this.hurtFlash = Math.max(0, this.hurtFlash - dt * 1.5);

    // ---- look ----
    if (canAct) {
      const sens = this.aiming ? 0.0016 : 0.0024;
      this.camYaw -= I.dx * sens;
      this.camPitch = clamp(this.camPitch - I.dy * sens, -1.1, 0.9);
    }
    this.recoil = damp(this.recoil, 0, 9, dt);

    // ---- quick turn ----
    if (canAct && I.pressed('KeyQ') && this.turnT <= 0 && !this.grab) { this.turnT = 0.28; this.turnFrom = this.camYaw; G.audio.ui(); }
    if (this.turnT > 0) {
      this.turnT -= dt;
      const k = 1 - Math.max(0, this.turnT) / 0.28;
      this.camYaw = this.turnFrom + Math.PI * (k * k * (3 - 2 * k));
      this.yaw = this.camYaw;
    }

    // ---- grabbed: tap E / Space to break free ----
    if (this.grab) {
      const g = this.grab;
      g.t += dt;
      if (I.pressed('KeyE') || I.pressed('Space')) g.progress += 0.16;
      g.progress = Math.max(0, g.progress - dt * 0.25);
      if (I.pressed('KeyF') && this.counterCd <= 0) { this.counterCd = 20; g.progress = 1; G.audio.knife(); G.ui.toast('Knife counter'); g.enemy.takeHit?.(25, 'torso', new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)), 2); }
      G.ui.struggle(g.progress);
      if (g.progress >= 1) { g.enemy.release(true); this.grab = null; G.ui.struggle(null); }
      else if (g.t > 2.3) {
        G.audio.bite();
        this.damage(g.enemy.biteDamage || 24, { leg: 0.35, bleed: 0.6 });
        g.enemy.release(false); this.grab = null; G.ui.struggle(null);
      }
    }

    // ---- healing animation (vulnerable) ----
    if (this.healT > 0) {
      this.healT -= dt;
      if (this.healT <= 0 && this.healItem) { G.items.applyHeal(this.healItem); this.healItem = null; }
    }

    // ---- movement input ----
    let mx = 0, mz = 0;
    if (canAct && !this.grab && this.healT <= 0) {
      if (I.down('KeyW')) mz += 1;
      if (I.down('KeyS')) mz -= 1;
      if (I.down('KeyA')) mx += 1;
      if (I.down('KeyD')) mx -= 1;
      if (I.pressed('KeyC')) { this.crouch = !this.crouch; }
      if (I.pressed('KeyL')) { this.flashOn = !this.flashOn; G.audio.ui(); }
      if (I.pressed('KeyV')) this.shoulder *= -1;
      this.aiming = I.mouse(2) && this.knifeT <= 0;
      if (I.pressed('KeyF') && this.knifeCd <= 0) this.knifeAttack();
    } else if (!this.autoWalk) this.aiming = false;
    if (this.autoWalk) {
      const d = new THREE.Vector3(this.autoWalk.x - this.pos.x, 0, this.autoWalk.z - this.pos.z);
      if (d.length() < 0.2) this.autoWalk = null;
      else { const a = Math.atan2(d.x, d.z) - this.camYaw; mx = Math.sin(a); mz = Math.cos(a); }
    }
    const moving = mx || mz;
    const legHurt = this.injuries.has('leg');
    const canSprint = !this.aiming && !this.crouch && st !== 'danger' && !legHurt && this.stamina > 0.05;
    this.sprinting = canAct && moving && I.down('ShiftLeft') && canSprint;
    if (this.sprinting) this.stamina = Math.max(0, this.stamina - dt / 7); else this.stamina = Math.min(1, this.stamina + dt / 5);

    let speed = 2.3;
    if (this.sprinting) speed = st === 'caution' ? 3.9 : 4.7;
    if (this.crouch) speed = 1.25;
    if (this.aiming) speed = 1.0;
    if (st === 'caution') speed *= 0.92;
    if (st === 'danger') speed *= 0.7;
    if (legHurt) speed *= 0.62;
    if (this.autoWalk) speed = 1.6;

    const target = new THREE.Vector3();
    if (moving) {
      const len = Math.hypot(mx, mz);
      const sy = Math.sin(this.camYaw), cy = Math.cos(this.camYaw);
      // forward = (sy, cy), right = (-cy, sy)
      // forward = (sy, cy); A (mx = +1) moves left on screen
      target.set((sy * mz + cy * mx) / len * speed, 0, (cy * mz - sy * mx) / len * speed);
    }
    const accel = moving ? 10 : 12;
    this.vel.x = damp(this.vel.x, target.x, accel, dt);
    this.vel.z = damp(this.vel.z, target.z, accel, dt);
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
    resolveCircle(this.pos, RADIUS);

    // facing
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (this.aiming || this.knifeT > 0) this.yaw += angleDiff(this.yaw, this.camYaw) * Math.min(1, dt * 14);
    else if (hs > 0.3 && this.turnT <= 0) this.yaw += angleDiff(this.yaw, Math.atan2(this.vel.x, this.vel.z)) * Math.min(1, dt * (this.sprinting ? 7 : 9));
    if (this.grab) this.yaw += angleDiff(this.yaw, Math.atan2(this.grab.enemy.pos.x - this.pos.x, this.grab.enemy.pos.z - this.pos.z)) * Math.min(1, dt * 10);
    this.h.root.rotation.y = this.yaw;

    // ---- gait and footsteps ----
    this.stride = damp(this.stride, clamp(hs / 2.3, 0, 1.4), 8, dt);
    const cadence = this.sprinting ? 10.5 : this.crouch ? 5.5 : 7.2;
    this.phase += dt * cadence * clamp(hs / Math.max(speed, 0.1), 0.4, 1.2) * (hs > 0.1 ? 1 : 0);
    const sgn = Math.sign(Math.sin(this.phase));
    if (sgn !== this.lastStepSign && hs > 0.4) {
      const room = G.level.roomAt(this.pos.x, this.pos.z);
      const loud = this.sprinting ? 1.4 : this.crouch ? 0.35 : 0.8;
      G.audio.step(room?.step || 'concrete', loud);
      makeNoise(this.pos, this.sprinting ? 10 : this.crouch ? 0.8 : 3.5, 'step');
    }
    this.lastStepSign = sgn;

    // ---- injuries over time ----
    if (this.injuries.has('bleeding') && this.hp > 8) {
      this.bleedT += dt;
      if (this.bleedT > 1.6) { this.bleedT = 0; this.hp = Math.max(8, this.hp - 1); }
      this.dropT += dt * (hs > 0.3 ? 1 : 0.3);
      if (this.dropT > 1.1) { this.dropT = 0; this.spawnBlood(this.pos.x, this.pos.z, 0.25); }
    }
    if (st === 'danger' && this.hp > 0) {
      this.heartT -= dt;
      if (this.heartT <= 0) { this.heartT = 0.85; G.audio.heartbeat(1.3); }
    }

    // ---- aim sway grows with injury and fatigue ----
    let amp = { fine: 0.004, caution: 0.009, danger: 0.02 }[st] || 0;
    if (this.injuries.has('arm')) amp += 0.01;
    if (this.sprinting || (1 - this.stamina) > 0.6) amp += 0.005;
    if (this.crouch) amp *= 0.6;
    const t = G.time;
    const tx = (Math.sin(t * 1.1) + 0.6 * Math.sin(t * 2.7 + 1)) * amp;
    const ty = (Math.sin(t * 1.7 + 2) + 0.5 * Math.sin(t * 3.3)) * amp * 0.8;
    this.sway.x = damp(this.sway.x, this.aiming ? tx : 0, 6, dt);
    this.sway.y = damp(this.sway.y, this.aiming ? ty : 0, 6, dt);

    // ---- knife swing ----
    if (this.knifeT > 0) this.knifeT -= dt;

    // ---- pose ----
    const breathe = Math.sin(t * (st === 'fine' ? 2 : st === 'caution' ? 3 : 4.5));
    const aimPitch = this.aiming ? this.camPitch + this.recoil * 0.5 : null;
    poseHumanoid(this.h, {
      phase: this.phase,
      stride: Math.min(1, this.stride),
      limp: this.limp,
      hunch: st === 'danger' ? 0.35 : st === 'caution' ? 0.12 : 0.02,
      crouch: this.crouch ? 1 : 0,
      aim: aimPitch,
      woundHand: (st === 'danger' || this.injuries.has('bleeding')) && !this.aiming,
      breathe,
      heal: this.healT > 0,
    });
    if (this.knifeT > 0) {
      const k = 1 - this.knifeT / 0.45;
      this.h.armR.sh.rotation.set(-1.4, 0, 0.9 - k * 1.8);
      this.h.armR.elbow.rotation.x = -0.4;
    }
    if (this.grab) { this.h.armR.sh.rotation.set(-1.2, 0, 0.5); this.h.armL.sh.rotation.set(-1.2, 0, -0.5); }
    if (this.deathT != null) {
      this.deathT += dt;
      this.h.root.rotation.x = -Math.min(1, this.deathT * 2) * Math.PI / 2;
      this.h.root.position.y = Math.min(1, this.deathT * 2) * 0.15;
    }

    this.updateCamera(dt);
    this.updateFlashlight();
  }

  knifeAttack() {
    this.knifeT = 0.45; this.knifeCd = 0.7;
    G.audio.knife();
    const fwd = new THREE.Vector3(Math.sin(this.camYaw), 0, Math.cos(this.camYaw));
    setTimeout(() => {
      for (const e of G.enemies) {
        if (!e.alive) continue;
        const d = e.pos.clone().sub(this.pos); d.y = 0;
        const dist = d.length();
        if (dist < 1.9 && d.normalize().dot(fwd) > 0.4) e.takeHit(18, e.downed ? 'head' : 'torso', fwd, 1.2);
      }
      G.items.knifeCrates(this.pos, fwd);
    }, 160);
  }

  updateCamera(dt) {
    const cam = G.camera;
    if (this.camOverride) {
      const o = this.camOverride;
      cam.position.copy(o.pos); cam.lookAt(o.look);
      cam.fov = damp(cam.fov, o.fov || 50, 4, dt); cam.updateProjectionMatrix();
      this.camPos.copy(cam.position);
      return;
    }
    const aim = this.aiming;
    this.shoulderLerp = damp(this.shoulderLerp, this.shoulder, 10, dt);
    const dist = aim ? 1.25 : this.crouch ? 2.3 : 2.7;
    this.camDist = damp(this.camDist, dist, 10, dt);
    const fwd = this.forward3D();
    const yaw = this.camYaw + this.sway.x;
    const right = new THREE.Vector3(-Math.cos(yaw), 0, Math.sin(yaw));
    const height = this.crouch ? 1.15 : 1.55;
    const pivot = new THREE.Vector3(this.pos.x, this.h.root.position.y + height, this.pos.z);
    pivot.addScaledVector(right, (aim ? 0.42 : 0.5) * this.shoulderLerp);
    let want = pivot.clone().addScaledVector(fwd, -this.camDist);
    // keep the camera inside walls
    const dir = want.clone().sub(pivot);
    const len = dir.length();
    this.ray.set(pivot, dir.normalize()); this.ray.far = len + 0.25;
    const hit = this.ray.intersectObjects(G.worldMeshes, false)[0];
    if (hit) want = pivot.clone().addScaledVector(dir, Math.max(0.2, hit.distance - 0.25));
    // camera shake from hits and gunfire
    this.shake = Math.max(0, this.shake - dt * 2.5);
    const sh = this.shake * this.shake * 0.08;
    want.x += (Math.random() - 0.5) * sh; want.y += (Math.random() - 0.5) * sh;
    // head bob when walking without aiming
    if (!aim) want.y += Math.sin(this.phase * 2) * 0.015 * Math.min(1, this.stride);
    cam.position.copy(want);
    this.camPos.copy(want);
    cam.lookAt(want.clone().add(fwd));
    const fov = aim ? 48 : this.sprinting ? 68 : 62;
    cam.fov = damp(cam.fov, fov, 8, dt); cam.updateProjectionMatrix();
  }

  updateFlashlight() {
    const fl = this.flashlight;
    fl.visible = this.flashOn;
    const yaw = this.aiming ? this.camYaw : this.yaw;
    const chest = new THREE.Vector3(this.pos.x, this.h.root.position.y + (this.crouch ? 0.9 : 1.35), this.pos.z);
    chest.x += Math.sin(yaw) * 0.25 - Math.cos(yaw) * 0.12;
    chest.z += Math.cos(yaw) * 0.25 + Math.sin(yaw) * 0.12;
    fl.position.copy(chest);
    const f = this.forward3D();
    if (!this.aiming) { f.x = Math.sin(this.yaw) * Math.cos(this.camPitch); f.z = Math.cos(this.yaw) * Math.cos(this.camPitch); f.y = Math.sin(this.camPitch) - 0.12; }
    fl.target.position.copy(chest).addScaledVector(f, 10);
    this.fill.position.set(this.pos.x, 2.4, this.pos.z);
  }
}
