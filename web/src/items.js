// Inventory, pickups, breakable crates with dynamic loot, herbs and healing.
import * as THREE from 'three';
import { G, rand, makeNoise, addUpdater } from './game.js';
import { mat, dotTexture } from './textures.js';

export const ITEMS = {
  ammo9: { name: 'Pistol Ammo', stack: 60, color: '#c8a050', kind: 'ammo' },
  shells: { name: 'Shotgun Shells', stack: 20, color: '#a3271d', kind: 'ammo' },
  herbG: { name: 'Green Herb', stack: 1, color: '#3f8a3a', heal: 35, cures: ['bleeding'], kind: 'heal' },
  herbR: { name: 'Red Herb', stack: 1, color: '#a8302a', kind: 'herb', note: 'Mix with a green herb to make it work.' },
  mixGG: { name: 'Mixed Herb G+G', stack: 1, color: '#2f7a3a', heal: 70, cures: ['bleeding'], kind: 'heal' },
  mixGR: { name: 'Mixed Herb G+R', stack: 1, color: '#7a6a2a', heal: 100, cures: ['bleeding', 'leg', 'arm'], kind: 'heal' },
  bandage: { name: 'Bandage', stack: 1, color: '#d9d3c4', heal: 12, cures: ['bleeding', 'arm'], kind: 'heal' },
  suppressant: { name: 'V-7 Suppressant', stack: 1, color: '#6a8ab0', kind: 'cure' },
};

export const KEY_ITEMS = {
  fuse: 'Crane Fuse',
  shutterKey: 'Cargo Shutter Key',
};

const COMBOS = { 'herbG+herbG': 'mixGG', 'herbG+herbR': 'mixGR', 'herbR+herbG': 'mixGR' };

export class Items {
  constructor() {
    this.slots = new Array(8).fill(null);
    this.keys = new Set();
    this.pickups = [];
    this.crates = [];
    this.crateMat = mat('wood', { repeat: 1, color: 0x9a7a55 });
    this.glintMat = new THREE.SpriteMaterial({ map: dotTexture(), color: 0xfff2c0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  }

  // ----- inventory -----
  count(id) { return this.slots.reduce((n, s) => n + (s && s.id === id ? s.qty : 0), 0); }

  add(id, qty = 1) {
    const def = ITEMS[id];
    let left = qty;
    for (const s of this.slots) if (left && s && s.id === id && s.qty < def.stack) { const n = Math.min(def.stack - s.qty, left); s.qty += n; left -= n; }
    for (let k = 0; k < this.slots.length && left; k++) if (!this.slots[k]) { const n = Math.min(def.stack, left); this.slots[k] = { id, qty: n }; left -= n; }
    return left;
  }

  canAdd(id, qty = 1) {
    const def = ITEMS[id];
    let room = 0;
    for (const s of this.slots) room += !s ? def.stack : s.id === id ? def.stack - s.qty : 0;
    return room >= qty;
  }

  take(id, n) {
    for (let k = this.slots.length - 1; k >= 0 && n > 0; k--) {
      const s = this.slots[k];
      if (s && s.id === id) { const t = Math.min(s.qty, n); s.qty -= t; n -= t; if (!s.qty) this.slots[k] = null; }
    }
  }

  use(k) {
    const s = this.slots[k];
    if (!s) return;
    const def = ITEMS[s.id];
    if (def.kind === 'heal') {
      const p = G.player;
      if (p.hp >= p.maxHp && !def.cures.some(c => p.injuries.has(c))) { G.ui.toast('Leon does not need that right now.'); return; }
      this.slots[k] = null;
      G.ui.closeModal();
      p.startHeal(s.id);
    } else if (def.kind === 'cure') {
      const p = G.player;
      if (p.infection <= 0) { G.ui.toast('Leon is not infected. Save it.'); return; }
      this.slots[k] = null;
      G.ui.closeModal();
      p.infection = 0; p.heal(10);
      G.audio.inject();
      G.ui.toast('V-7 Suppressant injected. The infection meter is back to zero, for now.', 4);
    } else if (def.kind === 'ammo') {
      G.ui.toast('Ammunition loads automatically when you reload (R).');
    } else G.ui.toast(def.note || 'That cannot be used on its own.');
  }

  combine(a, b) {
    const A = this.slots[a], B = this.slots[b];
    if (!A || !B || a === b) return false;
    const out = COMBOS[A.id + '+' + B.id];
    if (!out) { G.audio.error(); G.ui.toast('Those do not combine.'); return false; }
    this.slots[a] = { id: out, qty: 1 }; this.slots[b] = null;
    G.audio.success();
    return true;
  }

  applyHeal(id) {
    const def = ITEMS[id];
    G.player.heal(def.heal, def.cures);
    G.audio.success();
    G.ui.toast(`${def.name} used.`);
  }

  // ----- world pickups -----
  makeModel(id) {
    const g = new THREE.Group();
    if (id === 'herbG' || id === 'herbR') {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.16, 12), new THREE.MeshStandardMaterial({ color: 0x7a4a2a, roughness: 0.8 }));
      pot.position.y = 0.08; g.add(pot);
      const leafMat = new THREE.MeshStandardMaterial({ color: id === 'herbG' ? 0x3a8a34 : 0xa02822, roughness: 0.6 });
      for (let k = 0; k < 6; k++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.22, 5), leafMat);
        leaf.position.set(Math.cos(k) * 0.04, 0.24, Math.sin(k) * 0.04); leaf.rotation.set(Math.cos(k) * 0.5, 0, Math.sin(k) * 0.5);
        g.add(leaf);
      }
    } else if (id === 'ammo9' || id === 'shells') {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.13), new THREE.MeshStandardMaterial({ color: id === 'ammo9' ? 0x6a6a4a : 0x7a1a14, roughness: 0.6 }));
      b.position.y = 0.05; g.add(b);
      const lbl = new THREE.Mesh(new THREE.BoxGeometry(0.201, 0.04, 0.131), new THREE.MeshStandardMaterial({ color: 0xd8c890 }));
      lbl.position.y = 0.06; g.add(lbl);
    } else if (id === 'bandage') {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 12), new THREE.MeshStandardMaterial({ color: 0xe0dccf })); b.position.y = 0.04; g.add(b);
    } else if (id === 'fuse') {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.26, 14), new THREE.MeshStandardMaterial({ color: 0xd8d0b0, roughness: 0.5 }));
      body.rotation.z = Math.PI / 2; body.position.y = 0.06; g.add(body);
      for (const x of [-0.15, 0.15]) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.05, 14), new THREE.MeshStandardMaterial({ color: 0xb08a40, metalness: 0.9, roughness: 0.3 })); cap.rotation.z = Math.PI / 2; cap.position.set(x, 0.06, 0); g.add(cap); }
    } else if (id === 'suppressant') {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.16, 10), new THREE.MeshStandardMaterial({ color: 0x3a5a8a, roughness: 0.4 }));
      tube.rotation.z = Math.PI / 2; tube.position.y = 0.025; g.add(tube);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.05, 10), new THREE.MeshStandardMaterial({ color: 0xc9a227 }));
      cap.rotation.z = Math.PI / 2; cap.position.set(0.1, 0.025, 0); g.add(cap);
    } else if (id === 'radio') {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.2), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 }));
      b.position.y = 0.015; b.rotation.set(0, 0.6, 0.15); g.add(b);
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.14, 5), b.material); ant.position.set(0.05, 0.02, 0.1); ant.rotation.x = 1.4; g.add(ant);
    } else if (id === 'shutterKey') {
      const k = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 16), new THREE.MeshStandardMaterial({ color: 0x8a7a5a, metalness: 0.9, roughness: 0.3 }));
      k.position.y = 0.08; g.add(k);
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.015, 0.015), k.material); shaft.position.set(0.12, 0.08, 0); g.add(shaft);
    } else if (id === 'shotgun') {
      const s = G.weapons.makeShotgun(); s.rotation.set(0, 0, Math.PI / 2); s.position.y = 0.05; s.scale.setScalar(1.2); g.add(s);
    } else if (id === 'file' || id === 'map') {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.005, 0.3), new THREE.MeshStandardMaterial({ color: id === 'map' ? 0xb8b090 : 0xe6dfcc, roughness: 0.9 }));
      p.position.y = 0.01; p.rotation.y = rand(-0.4, 0.4); g.add(p);
    } else if (id === 'phone') {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.01, 0.15), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x2a4a6a, emissiveIntensity: 0.6 }));
      p.position.y = 0.01; g.add(p);
    }
    g.traverse(c => { if (c.isMesh) c.castShadow = true; });
    return g;
  }

  // o = { id, qty, x, z, y, key, file, label, onPick }
  spawn(o) {
    const model = this.makeModel(o.model || (o.file ? 'file' : o.id));
    model.position.set(o.x, o.y ?? 0, o.z);
    G.scene.add(model);
    const glint = new THREE.Sprite(this.glintMat.clone());
    glint.scale.setScalar(0.25); glint.position.set(o.x, (o.y ?? 0) + 0.3, o.z);
    G.scene.add(glint);
    const p = { ...o, model, glint, taken: false, serial: this.pickups.length };
    const name = o.label || (o.file ? G.story.fileTitle(o.file) : o.key ? KEY_ITEMS[o.id] : ITEMS[o.id]?.name || o.id);
    p.interact = {
      pos: new THREE.Vector3(o.x, (o.y ?? 0) + 0.2, o.z), radius: 1.7,
      label: () => (o.file ? 'Read ' : 'Pick up ') + name + (o.qty > 1 ? ` (${o.qty})` : ''),
      enabled: () => !p.taken,
      action: () => this.pick(p),
    };
    G.level.interacts.push(p.interact);
    this.pickups.push(p);
    return p;
  }

  pick(p) {
    if (p.taken) return;
    if (p.file) { G.story.readFile(p.file); this.markTaken(p); return; }
    if (p.key) {
      this.keys.add(p.id);
      G.audio.pickup();
      G.ui.toast(`Got the ${KEY_ITEMS[p.id]}.`);
    } else if (p.id === 'shotgun') {
      G.weapons.give('shotgun');
      G.weapons.mag.shotgun = 4;
      G.audio.pickup();
      G.ui.toast('Got the Shotgun. Press 2 to switch weapons.');
    } else {
      if (!this.canAdd(p.id, p.qty || 1)) { G.audio.error(); G.ui.toast('No room in the inventory. Use or combine something first.'); return; }
      this.add(p.id, p.qty || 1);
      G.audio.pickup();
      G.ui.toast(`Picked up ${ITEMS[p.id].name}${p.qty > 1 ? ' x' + p.qty : ''}.`);
    }
    this.markTaken(p);
    p.onPick?.();
  }

  markTaken(p) {
    p.taken = true; p.model.visible = false; p.glint.visible = false;
  }

  // ----- crates -----
  crate(x, z, loot = null) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.75, 0.8), this.crateMat);
    mesh.position.set(x, 0.375, z); mesh.rotation.y = rand(-0.3, 0.3);
    mesh.castShadow = true; mesh.receiveShadow = true;
    // plank bands
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.08, 0.82), new THREE.MeshStandardMaterial({ color: 0x3a2a1a }));
    band.position.y = 0.2; mesh.add(band);
    const band2 = band.clone(); band2.position.y = -0.2; mesh.add(band2);
    G.scene.add(mesh);
    const collider = { minX: x - 0.4, maxX: x + 0.4, minZ: z - 0.4, maxZ: z + 0.4 };
    G.colliders.push(collider);
    const c = { mesh, collider, pos: mesh.position, broken: false, loot };
    mesh.userData.crate = c;
    band.userData.crate = c; band2.userData.crate = c;
    this.crates.push(c);
    return c;
  }

  crateMeshes() { return this.crates.filter(c => !c.broken).map(c => c.mesh); }

  knifeCrates(pos, fwd) {
    for (const c of this.crates) {
      if (c.broken) continue;
      const d = c.pos.clone().sub(pos); d.y = 0;
      if (d.length() < 1.6 && d.normalize().dot(fwd) > 0.3) this.breakCrate(c, fwd);
    }
  }

  // Loot leans toward what the player is short of, like a director would.
  rollLoot() {
    const p = G.player, ammo = this.count('ammo9') + G.weapons.mag.handgun;
    const table = [
      ['ammo9', ammo < 12 ? 5 : 2, () => (rand(0, 1) < 0.5 ? 6 : 8)],
      ['herbG', p.hp < 60 ? 4 : 1.5, () => 1],
      ['bandage', p.injuries.size ? 2 : 0.5, () => 1],
      ['shells', G.weapons.owned.includes('shotgun') ? 2 : 0, () => 4],
      ['suppressant', p.infection > 0.3 ? 1 : 0, () => 1],
      [null, 2, () => 0],
    ];
    const total = table.reduce((s, r) => s + r[1], 0);
    let r = Math.random() * total;
    for (const [id, w, q] of table) { if ((r -= w) <= 0) return id ? { id, qty: q() } : null; }
    return null;
  }

  breakCrate(c, dir) {
    if (c.broken) return;
    c.broken = true; c.mesh.visible = false; c.collider.enabled = false;
    G.stats.crates++;
    G.audio.crate(c.pos);
    makeNoise(c.pos, 11, 'crate');
    // physical fragments
    for (let k = 0; k < 12; k++) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(rand(0.1, 0.4), 0.05, rand(0.06, 0.12)), this.crateMat);
      f.position.copy(c.pos).add(new THREE.Vector3(rand(-0.3, 0.3), rand(-0.2, 0.3), rand(-0.3, 0.3)));
      f.castShadow = true;
      G.scene.add(f);
      const v = new THREE.Vector3(rand(-2, 2), rand(1.5, 4), rand(-2, 2)).addScaledVector(dir || new THREE.Vector3(), 1.5);
      const spin = new THREE.Vector3(rand(-12, 12), rand(-12, 12), rand(-12, 12));
      let life = 9, rest = false;
      addUpdater((dt) => {
        life -= dt;
        if (!rest) {
          v.y -= 9.8 * dt; f.position.addScaledVector(v, dt);
          f.rotation.x += spin.x * dt; f.rotation.y += spin.y * dt; f.rotation.z += spin.z * dt;
          if (f.position.y < 0.03) { f.position.y = 0.03; v.y = -v.y * 0.3; v.x *= 0.5; v.z *= 0.5; spin.multiplyScalar(0.5); if (Math.abs(v.y) < 0.4) { rest = true; f.rotation.x = 0; f.rotation.z = 0; } }
        }
        if (life < 2) { f.material = f.material.clone(); f.material.transparent = true; f.material.opacity = life / 2; }
        if (life <= 0) { G.scene.remove(f); return false; }
        return true;
      });
    }
    const loot = c.loot === undefined || c.loot === null ? this.rollLoot() : c.loot;
    if (loot) setTimeout(() => this.spawn({ ...loot, x: c.pos.x, z: c.pos.z, dynamic: true }), 250);
  }

  // ----- save / load -----
  snapshot() {
    return {
      slots: this.slots.map(s => s && { ...s }),
      keys: [...this.keys],
      taken: this.pickups.map(p => p.taken),
      count: this.pickups.length,
      crates: this.crates.map(c => c.broken),
    };
  }

  restore(s) {
    this.slots = s.slots.map(x => x && { ...x });
    this.keys = new Set(s.keys);
    this.pickups.forEach((p, k) => {
      if (k >= s.count) { p.taken = true; p.model.visible = false; p.glint.visible = false; return; }
      p.taken = s.taken[k]; p.model.visible = !p.taken; p.glint.visible = !p.taken;
    });
    this.crates.forEach((c, k) => {
      c.broken = s.crates[k];
      c.mesh.visible = !c.broken; c.collider.enabled = !c.broken;
    });
  }

  update(dt) {
    const t = G.time;
    for (const p of this.pickups) {
      if (p.taken) continue;
      p.glint.material.opacity = 0.35 + Math.sin(t * 3 + p.serial) * 0.3;
      if (p.key || p.id === 'shotgun') p.model.rotation.y += dt * 0.8;
    }
  }
}
