// Firearms: hitscan ballistics with spread, recoil, per-part damage,
// physical shell casings, muzzle flash and surface impacts.
import * as THREE from 'three';
import { G, rand, makeNoise, addUpdater } from './game.js';
import { dotTexture, bloodTexture } from './textures.js';

export const WEAPONS = {
  handgun: { name: 'Pistol', ammo: 'ammo9', mag: 9, damage: 32, pellets: 1, spread: 0.008, interval: 0.26, reload: 1.5, kick: 0.045, noise: 26, impulse: 1.2, falloff: 40 },
  shotgun: { name: 'Shotgun', ammo: 'shells', mag: 4, damage: 15, pellets: 8, spread: 0.065, interval: 0.95, reload: 0.55, perShell: true, kick: 0.12, noise: 34, impulse: 3.5, falloff: 12 },
};

const SURFACE_OF = { plaster: 'concrete', brick: 'concrete', concrete: 'concrete', wood: 'wood', metal: 'metal', glass: 'metal', tile: 'concrete', marble: 'concrete', carpet: 'wood', asphalt: 'concrete' };

export class Weapons {
  constructor() {
    this.owned = ['handgun'];
    this.current = 'handgun';
    this.mag = { handgun: 9, shotgun: 0 };
    this.cool = 0; this.reloadT = 0; this.bloom = 0;
    this.shells = [];
    this.ray = new THREE.Raycaster();
    this.models = { handgun: this.makeHandgun(), shotgun: this.makeShotgun() };
    for (const k in this.models) { G.player.h.armR.grip.add(this.models[k]); this.models[k].visible = k === this.current; }
    this.flash = new THREE.PointLight(0xffc070, 0, 8, 2);
    G.scene.add(this.flash);
    this.flashSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: 0xffd090, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    this.flashSprite.scale.setScalar(0.35); this.flashSprite.visible = false;
    G.scene.add(this.flashSprite);
    this.shellGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.022, 6);
    this.shellMat = new THREE.MeshStandardMaterial({ color: 0xc8a050, metalness: 0.9, roughness: 0.3 });
    this.redShellMat = new THREE.MeshStandardMaterial({ color: 0x8a1a14, metalness: 0.3, roughness: 0.5 });
  }

  def() { return WEAPONS[this.current]; }

  makeHandgun() {
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, metalness: 0.7, roughness: 0.35 });
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.035, 0.19), m); slide.position.set(0, 0.03, 0.06);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.1, 0.045), m); grip.position.set(0, -0.02, 0); grip.rotation.x = 0.25;
    g.add(slide, grip);
    g.userData.slide = slide;
    g.userData.muzzle = new THREE.Object3D(); g.userData.muzzle.position.set(0, 0.03, 0.17); g.add(g.userData.muzzle);
    g.rotation.x = Math.PI / 2; // barrel points along the forearm
    return g;
  }

  makeShotgun() {
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({ color: 0x202022, metalness: 0.75, roughness: 0.35 });
    const w = new THREE.MeshStandardMaterial({ color: 0x4a2e1c, roughness: 0.6 });
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.62, 10), m); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.03, 0.25);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 8), m); tube.rotation.x = Math.PI / 2; tube.position.set(0, 0.0, 0.22);
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.16), w); pump.position.set(0, 0.0, 0.3);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.07, 0.2), m); body.position.set(0, 0.02, -0.02);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.3), w); stock.position.set(0, -0.02, -0.25); stock.rotation.x = 0.12;
    g.add(barrel, tube, pump, body, stock);
    g.userData.slide = pump;
    g.userData.muzzle = new THREE.Object3D(); g.userData.muzzle.position.set(0, 0.03, 0.57); g.add(g.userData.muzzle);
    g.rotation.x = Math.PI / 2;
    return g;
  }

  give(id) {
    if (!this.owned.includes(id)) this.owned.push(id);
    this.select(id);
  }

  select(id) {
    if (!this.owned.includes(id) || this.current === id) return;
    this.current = id; this.reloadT = 0;
    for (const k in this.models) this.models[k].visible = k === id;
    G.audio.reload(1);
  }

  get spread() {
    const p = G.player, d = this.def();
    let s = d.spread + this.bloom;
    if (Math.hypot(p.vel.x, p.vel.z) > 0.3) s += 0.012;
    if (p.state === 'danger') s += 0.01;
    if (p.injuries.has('arm')) s += 0.01;
    if (p.crouch) s *= 0.75;
    return s;
  }

  update(dt) {
    const I = G.input, p = G.player;
    this.cool -= dt;
    this.bloom = Math.max(0, this.bloom - dt * 0.12);
    const active = G.mode === 'play' && p.control && p.hp > 0 && !p.grab && p.healT <= 0 && !p.unarmed;
    this.models[this.current].visible = !p.unarmed;
    if (active) {
      if (I.pressed('Digit1')) this.select('handgun');
      if (I.pressed('Digit2')) this.select('shotgun');
      if (I.pressed('KeyR')) this.startReload();
      if (p.aiming && I.mousePressed(0)) this.fire();
    }
    // reloading
    if (this.reloadT > 0) {
      const d = this.def();
      this.reloadT -= dt;
      if (this.reloadT <= 0) {
        const have = G.items.count(d.ammo);
        if (d.perShell) {
          if (have > 0 && this.mag[this.current] < d.mag) {
            G.items.take(d.ammo, 1); this.mag[this.current]++; G.audio.reload(2);
            if (this.mag[this.current] < d.mag && G.items.count(d.ammo) > 0) this.reloadT = d.reload * this.reloadMul();
          }
        } else {
          const need = d.mag - this.mag[this.current];
          const n = Math.min(need, have);
          G.items.take(d.ammo, n); this.mag[this.current] += n; G.audio.reload(2);
        }
      }
    }
    // slide/pump returns after the shot
    const s = this.models[this.current].userData.slide;
    s.position.z += ((this.current === 'shotgun' ? 0.3 : 0.06) - s.position.z) * Math.min(1, dt * 18);
    // muzzle flash decay
    this.flash.intensity = Math.max(0, this.flash.intensity - dt * 400);
    this.flashSprite.visible = this.flash.intensity > 5;
    this.updateShells(dt);
  }

  reloadMul() { return G.player.injuries.has('arm') ? 1.45 : 1; }

  startReload() {
    const d = this.def();
    if (this.reloadT > 0 || this.mag[this.current] >= d.mag) return;
    if (G.items.count(d.ammo) <= 0) { G.ui.toast('No ammunition for the ' + d.name.toLowerCase()); return; }
    this.reloadT = d.reload * this.reloadMul();
    G.audio.reload(0);
  }

  fire() {
    const d = this.def(), p = G.player;
    if (this.cool > 0) return;
    if (this.reloadT > 0) { if (d.perShell && this.mag[this.current] > 0) this.reloadT = 0; else return; }
    if (this.mag[this.current] <= 0) { G.audio.dryFire(); this.cool = 0.25; this.startReload(); return; }
    this.mag[this.current]--;
    this.cool = d.interval;
    G.stats.shots++;
    G.audio.gunshot(this.current);
    makeNoise(p.pos, d.noise, 'gunshot');
    // the shot leaves along the current aim; recoil only affects the next one
    const fwd = p.forward3D();
    const origin = p.camPos.clone().addScaledVector(fwd, Math.max(0, p.camDist - 0.7));
    let hitAny = false;
    for (let k = 0; k < d.pellets; k++) {
      const dir = this.cone(fwd, this.spread);
      if (this.trace(origin, dir, d)) hitAny = true;
    }
    if (hitAny) G.stats.hits++;
    // recoil: arm injuries make it worse
    const kick = d.kick * (p.injuries.has('arm') ? 1.6 : 1) * (p.crouch ? 0.8 : 1);
    p.recoil += kick;
    p.camYaw += rand(-0.25, 0.25) * kick;
    p.shake = Math.max(p.shake, this.current === 'shotgun' ? 0.7 : 0.35);
    this.bloom = Math.min(0.05, this.bloom + kick * 0.25);
    const model = this.models[this.current];
    model.userData.slide.position.z -= this.current === 'shotgun' ? 0.08 : 0.035;
    const muzzle = new THREE.Vector3(); model.userData.muzzle.getWorldPosition(muzzle);
    this.flash.position.copy(muzzle); this.flash.intensity = this.current === 'shotgun' ? 90 : 60;
    this.flashSprite.position.copy(muzzle); this.flashSprite.material.rotation = Math.random() * 6;
    this.ejectShell(muzzle);
  }

  cone(fwd, spread) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * spread;
    const up = Math.abs(fwd.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const u = new THREE.Vector3().crossVectors(fwd, up).normalize();
    const v = new THREE.Vector3().crossVectors(u, fwd).normalize();
    return fwd.clone().addScaledVector(u, Math.cos(a) * r).addScaledVector(v, Math.sin(a) * r).normalize();
  }

  // Returns true if an enemy was hit.
  trace(origin, dir, d) {
    this.ray.set(origin, dir); this.ray.far = 80;
    const targets = G.hitMeshes.concat(G.worldMeshes, G.items.crateMeshes());
    const hits = this.ray.intersectObjects(targets, false);
    for (const h of hits) {
      if (!h.object.visible) continue;
      const ud = h.object.userData;
      if (ud.seeThrough && Math.random() < 0.85) continue; // most rounds pass through chain-link
      const falloff = Math.max(0.35, 1 - Math.max(0, h.distance - 4) / d.falloff);
      if (ud.enemy) {
        if (!ud.enemy.alive) continue;
        const res = ud.enemy.takeHit(d.damage * falloff, ud.part, dir, d.impulse * falloff, h.point);
        if (res === 'miss') continue;
        if (res === 'blocked') { this.sparks(h.point, 0xffd080, 10); G.audio.ricochet(h.point); return false; }
        this.bloodBurst(h.point, dir);
        G.audio.impact(h.point, 'flesh');
        return true;
      }
      if (ud.crate) { G.items.breakCrate(ud.crate, dir); return false; }
      // world surface
      const surf = SURFACE_OF[ud.surface] || 'concrete';
      const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : dir.clone().negate();
      this.decal(h.point, n);
      this.sparks(h.point, surf === 'metal' ? 0xffd080 : 0xb8b0a0, surf === 'metal' ? 8 : 5, n);
      G.audio.impact(h.point, surf);
      return false;
    }
    return false;
  }

  decal(point, normal) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.035, 8), new THREE.MeshBasicMaterial({ color: 0x0c0b0a, transparent: true, opacity: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.position.copy(point).addScaledVector(normal, 0.01);
    m.lookAt(point.clone().add(normal));
    G.scene.add(m);
  }

  particles(point, color, count, opts = {}) {
    const mat = new THREE.SpriteMaterial({ map: dotTexture(), color, transparent: true, depthWrite: false, blending: opts.additive === false ? THREE.NormalBlending : THREE.AdditiveBlending });
    for (let k = 0; k < count; k++) {
      const s = new THREE.Sprite(mat.clone());
      s.position.copy(point);
      s.scale.setScalar(opts.size || 0.05);
      const v = new THREE.Vector3(rand(-1, 1), rand(-0.2, 1), rand(-1, 1)).normalize().multiplyScalar(rand(1, opts.speed || 4));
      if (opts.dir) v.addScaledVector(opts.dir, opts.dirSpeed || 2);
      G.scene.add(s);
      let life = rand(0.2, opts.life || 0.5);
      const total = life;
      addUpdater((dt) => {
        life -= dt;
        v.y -= 9.8 * dt * (opts.gravity ?? 1);
        s.position.addScaledVector(v, dt);
        s.material.opacity = Math.max(0, life / total);
        if (life <= 0) { G.scene.remove(s); return false; }
        return true;
      });
    }
  }

  sparks(point, color, count, normal) {
    this.particles(point, color, count, { dir: normal, dirSpeed: 2, speed: 3, life: 0.35, size: 0.04 });
    this.particles(point, 0x6a6458, 3, { additive: false, speed: 0.6, life: 0.9, size: 0.18, gravity: -0.05, dir: normal, dirSpeed: 0.3 });
  }

  bloodBurst(point, dir) {
    this.particles(point, 0x6a0806, 10, { additive: false, dir, dirSpeed: 2.5, speed: 2.5, life: 0.6, size: 0.07 });
    // splat on the floor behind the target
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshBasicMaterial({ map: bloodTexture(), transparent: true, depthWrite: false, opacity: 0.8 }));
    s.rotation.x = -Math.PI / 2; s.rotation.z = Math.random() * 6;
    s.position.set(point.x + dir.x * 0.8, 0.016, point.z + dir.z * 0.8);
    G.scene.add(s);
  }

  ejectShell(from) {
    const p = G.player;
    const right = new THREE.Vector3(-Math.cos(p.yaw), 0, Math.sin(p.yaw));
    const mesh = new THREE.Mesh(this.shellGeo, this.current === 'shotgun' ? this.redShellMat : this.shellMat);
    if (this.current === 'shotgun') mesh.scale.set(2.2, 2.6, 2.2);
    mesh.position.copy(from).addScaledVector(right, 0.05);
    mesh.castShadow = true;
    G.scene.add(mesh);
    const shell = { mesh, v: right.multiplyScalar(rand(1.6, 2.4)).add(new THREE.Vector3(0, rand(1.8, 2.6), 0)), spin: new THREE.Vector3(rand(-20, 20), rand(-20, 20), rand(-20, 20)), life: 12, bounced: 0 };
    this.shells.push(shell);
    if (this.shells.length > 40) { const old = this.shells.shift(); G.scene.remove(old.mesh); }
  }

  updateShells(dt) {
    for (let k = this.shells.length - 1; k >= 0; k--) {
      const s = this.shells[k];
      s.life -= dt;
      if (s.life <= 0) { G.scene.remove(s.mesh); this.shells.splice(k, 1); continue; }
      if (s.bounced > 4) continue;
      s.v.y -= 9.8 * dt;
      s.mesh.position.addScaledVector(s.v, dt);
      s.mesh.rotation.x += s.spin.x * dt; s.mesh.rotation.y += s.spin.y * dt; s.mesh.rotation.z += s.spin.z * dt;
      if (s.mesh.position.y < 0.012) {
        s.mesh.position.y = 0.012;
        s.v.y = -s.v.y * 0.35; s.v.x *= 0.55; s.v.z *= 0.55; s.spin.multiplyScalar(0.5);
        s.bounced++;
        if (s.bounced <= 2) G.audio.shell(s.mesh.position);
        if (s.bounced > 4) { s.mesh.rotation.set(Math.PI / 2, 0, Math.random() * 6); }
      }
    }
  }
}
