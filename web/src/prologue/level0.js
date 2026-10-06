// Prologue map: the Gullwing Hotel on Harbor Avenue, Marrow Bay.
// The engine is flat, so each floor sits in its own patch of the grid and the
// stairwells move Leon between them: the ground floor (lobby, bar, back office),
// the third floor (corridor and room 304), garage level P2, and the streets
// he drives to the field office on Kestrel Street. Harbor Avenue outside the
// hotel is a set you only see from the window and through the lobby doors.
// Off to the east, outside the grid, stand the sets for the opening montage.
import * as THREE from 'three';
import { G, rand } from '../game.js';
import { Level, useLayout } from '../level.js';
import { mat, labelTexture, dotTexture } from '../textures.js';

const ROOMS0 = [
  // ground floor
  { id: 'lobby', name: 'Lobby', zone: 'ground', x0: -12, x1: 12, z0: 22, z1: 40, h: 4.2, floor: 'marble', step: 'tile', wall: 'plaster', facade: 13, facadeTex: 'windows',
    lights: [{ x: -5, z: 31, color: 0xffd8a0, i: 16, chandelier: true }, { x: 6, z: 31, color: 0xffd8a0, i: 16, chandelier: true }, { x: 0, z: 25, color: 0xffe0b0, i: 9 }] },
  { id: 'bar', name: 'Harbor Room Bar', zone: 'ground', x0: -24, x1: -12, z0: 22, z1: 40, h: 4.2, floor: 'wood', step: 'wood', wall: 'plaster', facade: 13, facadeTex: 'windows',
    lights: [{ x: -18, z: 33, color: 0xffb070, i: 10, flick: true }] },
  { id: 'stair1', name: 'Stairwell', zone: 'ground', x0: 12, x1: 17, z0: 30, z1: 40, h: 4.2, floor: 'concrete', step: 'concrete', wall: 'plaster', facade: 13, facadeTex: 'windows',
    lights: [{ x: 14.5, z: 35, color: 0xd8e4ff, i: 8 }] },
  { id: 'office', name: 'Back Office', zone: 'ground', x0: -4, x1: 6, z0: 14, z1: 22, h: 2.8, floor: 'tile', step: 'tile', wall: 'plaster',
    lights: [{ x: 1, z: 18, color: 0xe8f0ff, i: 7, flick: true }] },
  { id: 'gstairs', name: 'Garage Stairs', zone: 'ground', x0: 6, x1: 10, z0: 14, z1: 22, h: 2.8, floor: 'concrete', step: 'concrete', wall: 'concrete',
    lights: [{ x: 8, z: 18, color: 0xffa060, i: 5 }] },
  // third floor
  { id: 'corridor', name: 'Third Floor', zone: 'third', x0: 30, x1: 66, z0: 26, z1: 30, h: 2.7, floor: 'carpet', step: 'carpet', wall: 'plaster',
    lights: [{ x: 36, z: 28, color: 0xffd8a8, i: 7 }, { x: 48, z: 28, color: 0xffd8a8, i: 7 }, { x: 60, z: 28, color: 0xffd8a8, i: 7, flick: true }] },
  { id: 'r304', name: 'Room 304', zone: 'third', x0: 40, x1: 48, z0: 30, z1: 40, h: 2.7, floor: 'carpet', step: 'carpet', wall: 'plaster', facade: 13, facadeTex: 'windows',
    lights: [{ x: 44, z: 34, color: 0xffcf98, i: 7 }] },
  { id: 'r302', name: 'Room 302', zone: 'third', x0: 32, x1: 40, z0: 30, z1: 40, h: 2.7, floor: 'carpet', wall: 'plaster', facade: 13, facadeTex: 'windows' },
  { id: 'r306', name: 'Room 306', zone: 'third', x0: 48, x1: 56, z0: 30, z1: 40, h: 2.7, floor: 'carpet', wall: 'plaster', facade: 13, facadeTex: 'windows' },
  { id: 'r308', name: 'Room 308', zone: 'third', x0: 56, x1: 64, z0: 30, z1: 40, h: 2.7, floor: 'carpet', wall: 'plaster', facade: 13, facadeTex: 'windows' },
  { id: 'r303', name: 'Room 303', zone: 'third', x0: 32, x1: 40, z0: 18, z1: 26, h: 2.7, floor: 'carpet', wall: 'plaster' },
  { id: 'r305', name: 'Room 305', zone: 'third', x0: 40, x1: 48, z0: 18, z1: 26, h: 2.7, floor: 'carpet', wall: 'plaster' },
  { id: 'r307', name: 'Room 307', zone: 'third', x0: 48, x1: 56, z0: 18, z1: 26, h: 2.7, floor: 'carpet', wall: 'plaster' },
  { id: 'r309', name: 'Room 309', zone: 'third', x0: 56, x1: 64, z0: 18, z1: 26, h: 2.7, floor: 'carpet', wall: 'plaster' },
  { id: 'stair3', name: 'Stairwell', zone: 'third', x0: 66, x1: 72, z0: 22, z1: 32, h: 2.7, floor: 'concrete', step: 'concrete', wall: 'plaster',
    lights: [{ x: 69, z: 27, color: 0xd8e4ff, i: 7 }] },
  // garage level P2
  { id: 'garage', name: 'Garage Level P2', zone: 'garage', x0: -20, x1: 24, z0: -44, z1: -14, h: 2.9, floor: 'concrete', step: 'concrete', wall: 'concrete',
    lights: [{ x: -12, z: -22, color: 0xd8f0ff, i: 3, flick: true }, { x: 10, z: -22, color: 0xd8f0ff, i: 3 }, { x: -6, z: -36, color: 0xffb070, i: 2.5 }, { x: 14, z: -38, color: 0xd8f0ff, i: 0, off: true }] },
  { id: 'p2stairs', name: 'Garage Stairs', zone: 'garage', x0: 24, x1: 28, z0: -22, z1: -14, h: 2.9, floor: 'concrete', step: 'concrete', wall: 'concrete',
    lights: [{ x: 26, z: -18, color: 0xffa060, i: 2 }] },
  // outside: Harbor Avenue in front of the hotel (seen, never walked) and the drive
  { id: 'harbor', name: 'Harbor Avenue', zone: 'street', noMap: true, x0: -40, x1: 80, z0: 40, z1: 58, floor: 'asphalt', step: 'wet', outdoor: true, edge: 'city' },
  { id: 'harborS', name: 'Harbor Avenue', zone: 'street', noMap: true, x0: -8, x1: 8, z0: -416, z1: -60, floor: 'asphalt', step: 'wet', outdoor: true, edge: 'city' },
  { id: 'kestrel', name: 'Kestrel Street', zone: 'street', noMap: true, x0: -150, x1: -8, z0: -416, z1: -400, floor: 'asphalt', step: 'wet', outdoor: true, edge: 'city' },
  { id: 'compound', name: 'Field Office', zone: 'street', noMap: true, x0: -170, x1: -150, z0: -420, z1: -396, floor: 'concrete', step: 'concrete', outdoor: true, edge: 'city' },
];

const DOORS0 = [
  { id: 'front', x: 0, z: 40, axis: 'x', w: 3, label: 'Harbor Avenue', lock: 'barricade', color: 0x3a2a20 },
  { id: 'barArch', x: -12, z: 31, axis: 'z', kind: 'open', w: 8 },
  { id: 'stair1', x: 12, z: 35, axis: 'z', label: 'the stairs', metal: true, color: 0x6a3a2a },
  { id: 'office', x: 1, z: 22, axis: 'x', label: 'the back office', color: 0x5a4a3a },
  { id: 'gdoor', x: 6, z: 18, axis: 'z', label: 'the garage stairs', metal: true, color: 0x4a5a62 },
  { id: 'r304', x: 44, z: 30, axis: 'x', label: 'Room 304', color: 0x5a3a2a },
  { id: 'r302', x: 36, z: 30, axis: 'x', label: 'Room 302', lock: 'guest', color: 0x5a3a2a },
  { id: 'r306', x: 52, z: 30, axis: 'x', label: 'Room 306', lock: 'guest', color: 0x5a3a2a },
  { id: 'r308', x: 60, z: 30, axis: 'x', label: 'Room 308', lock: 'guest', color: 0x5a3a2a },
  { id: 'r303', x: 36, z: 26, axis: 'x', label: 'Room 303', lock: 'guest', color: 0x5a3a2a },
  { id: 'r305', x: 44, z: 26, axis: 'x', label: 'Room 305', lock: 'guest', color: 0x5a3a2a },
  { id: 'r307', x: 52, z: 26, axis: 'x', label: 'Room 307', lock: 'guest', color: 0x5a3a2a },
  { id: 'r309', x: 60, z: 26, axis: 'x', label: 'Room 309', lock: 'frank', color: 0x5a3a2a },
  { id: 'stair3', x: 66, z: 28, axis: 'z', label: 'the stairwell', metal: true, color: 0x6a3a2a },
  { id: 'p2door', x: 24, z: -18, axis: 'z', label: 'Level P2', metal: true, color: 0x4a5a62 },
  { id: 'ramp', x: -20, z: -30, axis: 'z', w: 4, kind: 'shutter', label: 'the exit ramp', lock: 'ramp' },
  { id: 'junction', x: -8, z: -408, axis: 'z', kind: 'open', w: 16 },
  { id: 'gate', x: -150, z: -408, axis: 'z', kind: 'open', w: 16 },
];

const STREET_TINTS = [0xb8a898, 0x9aa0a8, 0xc8b8a0, 0x8a8a84, 0xa89078, 0x9a8a7a];
const CAR_COLORS = [0x6a1a18, 0x2a3a4a, 0xb8b4aa, 0x1a1c1e, 0x3a4a3a, 0x7a6a4a, 0x4a2a3a];

export class PrologueLevel extends Level {
  constructor() {
    useLayout({ gx0: -170, gz0: -420, gw: 260, gh: 490, rooms: ROOMS0, doors: DOORS0 });
    super();
    this.zoneNames = { ground: 'Gullwing Hotel · Ground Floor', third: 'Gullwing Hotel · Third Floor', garage: 'Garage · Level P2' };
    this.setTime('night');
  }

  buildFloors() {
    this.roomFloors();
    // pavements either side of the drive and the street outside the hotel
    const kerb = new THREE.MeshStandardMaterial({ map: mat('concrete', { repeat: 1 }).map, color: 0x8a867e, roughness: 0.8 });
    const walk = (x0, x1, z0, z1) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.15, z1 - z0), kerb);
      m.position.set((x0 + x1) / 2, 0.075, (z0 + z1) / 2); m.receiveShadow = true; this.group.add(m);
    };
    walk(-40, 80, 40, 42.5); walk(-40, 80, 55.5, 58);
    walk(-8, -5.5, -400, -60); walk(5.5, 8, -416, -60); walk(-150, -8, -402.5, -400);
    // lane markings
    const paint = new THREE.MeshBasicMaterial({ color: 0x9a9070 });
    for (let z = -396; z < -64; z += 6) { const d = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 2.5), paint); d.rotation.x = -Math.PI / 2; d.position.set(0, 0.012, z); this.group.add(d); }
    for (let x = -146; x < -12; x += 6) { const d = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.15), paint); d.rotation.x = -Math.PI / 2; d.position.set(x, 0.012, -409); this.group.add(d); }
    for (let x = -36; x < 78; x += 6) { const d = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.15), paint); d.rotation.x = -Math.PI / 2; d.position.set(x, 0.012, 49); this.group.add(d); }
  }

  // Outside walls of the streets are rows of buildings, set back on the void side.
  customRun(r) {
    if (r.style === 'facade' && r.tex === 'windows') return this.facadeRun(r);
    if (r.style !== 'city') return false;
    const out = r.voidSide;
    let k = 0;
    while (k < r.len) {
      const w = Math.min(r.len - k, rand(9, 16));
      const h = rand(9, 22), d = 12;
      const along = r.start + k + w / 2;
      const tint = STREET_TINTS[(Math.random() * STREET_TINTS.length) | 0];
      const m = new THREE.MeshStandardMaterial({ map: mat('windows', { repeat: w / 6, repeatY: h / 6 }).map, color: tint, roughness: 0.85 });
      const b = new THREE.Mesh(new THREE.BoxGeometry(r.axis === 'x' ? w : d, h, r.axis === 'x' ? d : w), m);
      const off = out * (d / 2 + 0.1);
      if (r.axis === 'x') b.position.set(along, h / 2, r.line + off); else b.position.set(r.line + off, h / 2, along);
      b.receiveShadow = true;
      b.userData.surface = 'concrete';
      this.group.add(b); G.worldMeshes.push(b);
      // dark shopfront band at street level
      const shop = new THREE.Mesh(new THREE.BoxGeometry(r.axis === 'x' ? w - 0.4 : 0.1, 2.6, r.axis === 'x' ? 0.1 : w - 0.4), new THREE.MeshStandardMaterial({ color: Math.random() < 0.5 ? 0x14181a : 0x2a1e18, roughness: 0.2, metalness: 0.5 }));
      if (r.axis === 'x') shop.position.set(along, 1.5, r.line + out * 0.02); else shop.position.set(r.line + out * 0.02, 1.5, along);
      this.group.add(shop);
      k += w;
    }
    return true;
  }

  // A hotel outer wall: plaster on the inside at room height, and a thin skin of
  // windows on the street side that runs up to the full facade height.
  facadeRun(r) {
    const T = 0.3, L = r.len, mid = r.start + L / 2;
    const at = (s) => r.axis === 'x' ? this.roomAt(mid, r.line + s) : this.roomAt(r.line + s, mid);
    const lo = at(-0.5), hi = at(0.5);
    const inSide = lo && !lo.outdoor ? -1 : 1; // which side of the line the room is on
    const room = inSide < 0 ? lo : hi;
    const roomH = room?.h || 3;
    const put = (mesh, y, off) => {
      if (r.axis === 'x') mesh.position.set(mid, y, r.line + off);
      else { mesh.position.set(r.line + off, y, mid); mesh.rotation.y = Math.PI / 2; }
      this.group.add(mesh); G.worldMeshes.push(mesh);
    };
    const inner = new THREE.Mesh(new THREE.BoxGeometry(L + T, roomH, T), mat(room?.wall || 'plaster', { repeat: L / 3, repeatY: roomH / 3 }));
    inner.castShadow = inner.receiveShadow = true; inner.userData.surface = 'plaster';
    put(inner, roomH / 2, 0);
    const skin = new THREE.Mesh(new THREE.BoxGeometry(L + T + 0.08, r.h, 0.06), mat('windows', { repeat: L / 6, repeatY: r.h / 6, bump: 0.2 }));
    skin.receiveShadow = true; skin.userData.surface = 'concrete';
    put(skin, r.h / 2, -inSide * (T / 2 + 0.04));
    return true;
  }

  buildLights() {
    this.hemi = new THREE.HemisphereLight(0x7a8aa0, 0x14110e, 0.42);
    this.sun = new THREE.DirectionalLight(0x8aa0c8, 0.55);
    this.sun.position.set(-40, 60, 30); this.sun.target.position.set(0, 0, 0);
    G.scene.add(this.hemi, this.sun, this.sun.target);
    this.roomLights();
    // chandeliers: a ring of warm bulbs under each lobby light
    for (const rec of this.lights) {
      const L = (rec.room.lights || []).find(l => l.x === rec.lamp.position.x && l.z === rec.lamp.position.z);
      if (L?.chandelier) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.04, 6, 20), new THREE.MeshStandardMaterial({ color: 0xb59a5a, metalness: 0.8, roughness: 0.3, emissive: 0xffc070, emissiveIntensity: 0.6 }));
        ring.rotation.x = Math.PI / 2; ring.position.set(L.x, rec.room.h - 0.9, L.z); this.group.add(ring);
        rec.fixture.position.y = rec.room.h - 0.9;
      }
    }
    // two street lamps outside the hotel and one at the field office gate
    this.streetLamps = [this.lamp(-6, 42.2), this.lamp(30, 42.2), this.lamp(-152, -398)];
  }

  lamp(x, z) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 6, 8), new THREE.MeshStandardMaterial({ color: 0x1b1d1f, metalness: 0.6, roughness: 0.5 }));
    pole.position.set(x, 3, z); this.group.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.35), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffb070, emissiveIntensity: 3 }));
    head.position.set(x, 6.05, z + 0.4); this.group.add(head);
    const l = new THREE.PointLight(0xffb070, 10, 22, 1.6); l.position.set(x, 5.8, z + 1); G.scene.add(l);
    return { lamp: l, fixture: head };
  }

  // night: the check-in. dawn: the montage's last shot. morning: everything after the alarm.
  setTime(t) {
    this.time = t;
    const S = G.scene;
    const night = t === 'night';
    S.background.set(night ? 0x050608 : t === 'dawn' ? 0x5a5c66 : 0x7a8088);
    S.fog.color.set(night ? 0x07080a : t === 'dawn' ? 0x4a4c54 : 0x6a7076);
    S.fog.density = night ? 0.04 : 0.012;
    this.hemi.color.set(night ? 0x7a8aa0 : 0xb8c4d4); this.hemi.groundColor.set(night ? 0x14110e : 0x4a443c);
    this.hemi.intensity = night ? 0.42 : t === 'dawn' ? 1.5 : 1.9;
    this.sun.color.set(night ? 0x8aa0c8 : 0xe8e4dc); this.sun.intensity = night ? 0.5 : 1.6;
    for (const s of this.streetLamps) s.fixture.material.emissiveIntensity = night ? 3 : 0.2;
    // in the morning the hotel has lost its power: emergency lighting only,
    // and room 304 is lit by the grey window
    for (const rec of this.lights) {
      const id = rec.room.id;
      rec.want = !rec.off;
      if (night) continue;
      if (id === 'r304') { rec.lamp.color.set(0xb8c4d4); rec.lamp.intensity = rec.base = 9; rec.fixture.material.emissiveIntensity = 0; continue; }
      if (['lobby', 'bar', 'office', 'corridor', 'stair1', 'stair3'].includes(id)) {
        const keep = id === 'stair3' || id === 'stair1' || rec === this.lights.find(r => r.room.id === id);
        rec.want = keep; rec.lamp.color.set(0xff5a3a); rec.lamp.intensity = rec.base = id === 'stair3' ? 9 : 6;
        rec.fixture.material.emissive.set(0xff5a3a); rec.fixture.material.emissiveIntensity = keep ? 1.2 : 0;
      }
    }
    this.applyLights();
    if (this.windowGlow) this.windowGlow.material.opacity = night ? 0 : 0.85;
    if (this.rain) this.rain.material.opacity = night ? 0.18 : 0.07;
  }

  // Only the floor Leon is on keeps its lamps switched on. Fewer live lights keeps
  // the frame rate up; the swap happens behind a fade on the stairs.
  setZone(zone) { this.zone = zone; this.applyLights(); }

  applyLights() {
    for (const rec of this.lights) rec.lamp.visible = rec.want !== false && rec.room.zone === (this.zone || 'ground');
    for (const s of this.streetLamps) s.lamp.visible = this.time === 'night' && (this.zone || 'ground') === 'ground';
  }

  buildProps() {
    const wood = mat('wood', { repeat: 1, color: 0x6a4a34 });
    const darkWood = mat('wood', { repeat: 1, color: 0x3a2a20 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xb59a5a, metalness: 0.8, roughness: 0.35 });
    const fabric = (c) => mat('cloth', { repeat: 1, color: c });
    const paint = (c, r = 0.5) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.2 });

    // ---------------- Lobby ----------------
    // Front desk: a long counter with Ruth's side behind it and the back office door beyond.
    this.box(1, 25.6, 8, 1.0, 1.1, darkWood);
    this.box(1, 25.6, 8.2, 1.2, 0.06, mat('marble', { repeat: 2 }), { y: 1.1, solid: false });
    this.box(-3.4, 24, 0.8, 2.4, 1.1, darkWood); // return at the west end
    this.deskBell = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 6, 0, 6.3, 0, 1.6), brass);
    this.deskBell.position.set(2.5, 1.17, 26.1); this.group.add(this.deskBell);
    this.sign(1, 2.6, 22.17, 0, ['GULLWING HOTEL', 'RECEPTION'], { w: 3, h: 0.7, size: 46, bg: '#1d2a2a', fg: '#c9b48a' });
    // key cubbies on the wall behind the desk
    this.box(1, 22.25, 4, 0.3, 1.2, darkWood, { y: 1.3, solid: false });
    // sofas, pillars and plants
    for (const [x, z] of [[-6, 34], [6, 34]]) {
      this.box(x, z, 2.6, 0.9, 0.45, fabric(0x5a2a24), { surface: 'wood' });
      this.box(x, z + 0.4, 2.6, 0.2, 0.9, fabric(0x5a2a24), { surface: 'wood' });
      this.box(x, z - 1.4, 1.2, 0.7, 0.4, wood);
    }
    for (const [x, z] of [[-7, 28], [7, 28]]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 4.2, 14), mat('marble', { repeat: 1 }));
      p.position.set(x, 2.1, z); p.castShadow = true; this.group.add(p); G.worldMeshes.push(p);
      G.colliders.push({ minX: x - 0.36, maxX: x + 0.36, minZ: z - 0.36, maxZ: z + 0.36, prop: true });
    }
    for (const [x, z] of [[-11, 39], [11, 39], [-11, 23], [11, 23]]) {
      this.box(x, z, 0.6, 0.6, 0.6, paint(0x3a2a20));
      const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), paint(0x2a4a2a, 0.8)); leaves.position.set(x, 1.1, z); this.group.add(leaves);
    }
    // the front doors: glass panes onto Harbor Avenue, chained from inside
    this.lobbyGlass = [];
    for (const x of [-4.5, 4.5, -9, 9]) {
      const g = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.4), new THREE.MeshStandardMaterial({ color: 0x8aa0b0, roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.25 }));
      g.position.set(x, 1.6, 39.83); g.rotation.y = Math.PI; g.userData.seeThrough = true; this.group.add(g); this.lobbyGlass.push(g);
    }
    this.box(0, 39.6, 3.4, 0.1, 0.1, paint(0x777777), { y: 1.2, solid: false }); // the chain
    this.sign(0, 3.1, 39.82, Math.PI, ['WELCOME TO THE GULLWING'], { w: 3.2, h: 0.4, size: 40, bg: '#1d2a2a', fg: '#c9b48a' });
    // luggage trolley and the dead elevator
    this.box(-9.5, 26, 1.0, 1.6, 1.0, brass, { surface: 'metal' });
    this.box(-11.85, 33, 0.1, 2.2, 2.6, new THREE.MeshStandardMaterial({ color: 0x9a9a92, metalness: 0.8, roughness: 0.3 }), { surface: 'metal' });
    this.sign(-11.8, 2.9, 33, Math.PI / 2, ['OUT OF SERVICE'], { w: 1.4, h: 0.3, size: 40, bg: '#d8c890' });

    // ---------------- Bar ----------------
    this.box(-22.6, 31, 1.0, 12, 1.1, darkWood);                       // the bar counter
    this.box(-23.8, 31, 0.3, 12, 2.2, darkWood, { y: 0.4, solid: false }); // back shelves
    for (let z = 26; z < 37; z += 0.5) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 6), paint([0x2a4a2a, 0x6a3a1a, 0xc8c0a0][(z * 2) % 3 | 0], 0.1));
      b.position.set(-23.75, 1.75 + ((z * 4) % 2) * 0.6, z); this.group.add(b);
    }
    for (const [x, z] of [[-17, 26], [-15, 30.5], [-17.5, 35], [-14.5, 37.5]]) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.05, 16), darkWood); t.position.set(x, 0.75, z); this.group.add(t);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.75, 6), brass); leg.position.set(x, 0.375, z); this.group.add(leg);
      G.colliders.push({ minX: x - 0.5, maxX: x + 0.5, minZ: z - 0.5, maxZ: z + 0.5, prop: true });
    }
    this.sign(-23.83, 3.2, 31, Math.PI / 2, ['THE HARBOR ROOM'], { w: 2.6, h: 0.45, size: 48, bg: '#2a1a14', fg: '#d8b880' });

    // ---------------- Stairs (ground) ----------------
    this.stairs(14.5, 37.5, 1);
    this.sign(12.17, 2.2, 33.5, Math.PI / 2, ['STAIRS', 'FLOORS 1–4'], { w: 1.0, h: 0.5, size: 40, bg: '#2a3a2a', fg: '#e0e0d0' });

    // ---------------- Back office ----------------
    this.box(-1.5, 15, 2.4, 1.0, 0.78, wood);                    // desk
    this.box(5.6, 20, 0.6, 2.0, 1.9, paint(0x5a6a70), { surface: 'metal' }); // filing
    this.box(-3.6, 18, 0.6, 1.4, 0.45, fabric(0x3a3a4a));      // cot where Ruth put the man
    this.firstAid = this.box(-3.85, 21, 0.2, 0.5, 0.4, paint(0xd8d0c0), { y: 1.3, solid: false });

    // ---------------- Third floor ----------------
    // corridor: a runner rug, room numbers, wall lamps, a room-service tray
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(35, 1.6), mat('carpet', { repeat: 12, repeatY: 0.6, color: 0x7a2a24 }));
    rug.rotation.x = -Math.PI / 2; rug.position.set(48, 0.01, 28); this.group.add(rug);
    for (const d of DOORS0.filter(d => /^r3\d\d$/.test(d.id))) {
      const north = d.z === 30;
      this.sign(d.x + 1.3, 1.6, d.z + (north ? -0.17 : 0.17), north ? Math.PI : 0, [d.id.slice(1)], { w: 0.3, h: 0.16, size: 70, bg: '#b59a5a', fg: '#1a1410' });
    }
    this.box(57.5, 29.5, 0.7, 0.45, 0.6, paint(0xc8c0b0), { surface: 'metal' }); // room service trolley
    this.sign(65.83, 2.0, 28, -Math.PI / 2, ['EXIT', 'STAIRS'], { w: 0.6, h: 0.3, size: 46, bg: '#1a5a2a', fg: '#e8f0e0' });
    this.stairs(69, 30, -1);

    // ---------------- Room 304 ----------------
    this.bed = this.box(41.2, 34.5, 2.2, 2.0, 0.55, fabric(0xd8d0c0), { surface: 'wood' }); // bed against the west wall
    this.box(40.15, 34.5, 0.2, 2.1, 1.1, darkWood);                                        // headboard
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.8), fabric(0xe8e2d8)); pillow.position.set(40.6, 0.63, 34.5); this.group.add(pillow);
    this.blanket = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 2.05), fabric(0x3a4a5a)); this.blanket.position.set(41.6, 0.6, 34.5); this.group.add(this.blanket);
    this.box(40.6, 36.2, 0.5, 0.5, 0.55, wood);                                           // nightstand with the phone
    this.phone = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.01, 0.16), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x2a3a5a, emissiveIntensity: 0.6 }));
    this.phone.position.set(40.6, 0.56, 36.2); this.group.add(this.phone);
    this.table = this.box(46.6, 38.2, 1.2, 0.8, 0.75, wood);                              // table by the window
    this.flask = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.24, 10), new THREE.MeshStandardMaterial({ color: 0xa8acb0, metalness: 0.9, roughness: 0.25 }));
    this.flask.position.set(46.4, 0.87, 38.1); this.flask.castShadow = true; this.group.add(this.flask);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.04, 8), new THREE.MeshStandardMaterial({ color: 0x222222 })); cap.position.y = 0.14; this.flask.add(cap);
    this.box(47.6, 34, 0.5, 1.3, 0.6, darkWood);                                          // TV unit
    this.tv = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.95), paint(0x111111)); this.tv.position.set(47.7, 0.9, 34); this.group.add(this.tv);
    this.tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.48), new THREE.MeshBasicMaterial({ color: 0x050505 }));
    this.tvScreen.position.set(47.64, 0.9, 34); this.tvScreen.rotation.y = -Math.PI / 2; this.group.add(this.tvScreen);
    this.box(45, 30.6, 1.4, 0.6, 0.5, fabric(0x2a2a2a), { surface: 'wood' });            // Leon's bag by the door
    this.chair = this.box(45.6, 38.4, 0.5, 0.5, 0.45, wood, { solid: false });
    // the window: glass, curtains, and the grey morning behind them
    this.window = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), new THREE.MeshStandardMaterial({ color: 0x9ab0c0, roughness: 0.05, metalness: 0.5, transparent: true, opacity: 0.3 }));
    this.window.position.set(44, 1.55, 39.82); this.window.rotation.y = Math.PI; this.window.userData.seeThrough = true; this.group.add(this.window);
    this.windowGlow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), new THREE.MeshBasicMaterial({ color: 0xc8ccd0, transparent: true, opacity: 0 }));
    this.windowGlow.position.set(44, 1.55, 39.84); this.windowGlow.rotation.y = Math.PI; this.group.add(this.windowGlow);
    this.curtains = [-1, 1].map(s => {
      const c = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.3, 0.06), fabric(0x6a4a3a));
      c.position.set(44 + s * 0.85, 1.4, 39.7); c.castShadow = true; this.group.add(c);
      c.userData.closedX = 44 + s * 0.85; c.userData.openX = 44 + s * 2.35;
      return c;
    });
    // outside, the hotel's own sign high on the facade
    this.sign(-4, 9.5, 40.18, 0, ['GULLWING HOTEL'], { w: 12, h: 1.4, size: 90, bg: '#1d2a2a', fg: '#e0c890' }).material.emissive = new THREE.Color(0x2a2010);

    // ---------------- Garage P2 ----------------
    const pillarMat = mat('concrete', { repeat: 1, color: 0x9a968e });
    for (const x of [-12, -2, 8, 18]) for (const z of [-22, -34]) {
      this.box(x, z, 0.8, 0.8, 2.9, pillarMat, { surface: 'concrete' });
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.3, 0.82), new THREE.MeshStandardMaterial({ map: mat('hazard', { repeat: 1 }).map })); band.position.set(x, 0.3, z); this.group.add(band);
    }
    // parked cars: the middle rows are guests'; the far wall is the reserved row
    this.parked = [];
    const rowCars = [[-15, -26, 0, 0x6a1a18], [-8, -26, 0, 0x2a3a4a], [3, -26, 0, null], [13, -26, 0, 0x1a1c1e], [-15, -30, Math.PI, 0x3a4a3a], [-5, -30, Math.PI, null], [3, -30, Math.PI, 0x7a6a4a], [13, -30, Math.PI, 0xb8b4aa]];
    for (const [x, z, rot, color] of rowCars) if (color) this.parked.push(this.carProp(x, z, rot + Math.PI / 2, color, { tidy: true }));
    this.bays = [];
    for (let k = 0; k < 6; k++) {
      const x = -15 + k * 5, z = -40.5, bay = 11 + k;
      const color = bay === 11 ? 0x8a2a1a : 0x7a7e82;
      const car = this.carProp(x, z, 0, color, { tidy: true });
      car.bay = bay;
      this.bays.push(car);
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 5.2), new THREE.MeshBasicMaterial({ color: 0xc8c090 }));
      line.rotation.x = -Math.PI / 2; line.position.set(x - 2.5, 0.012, -41.4); this.group.add(line);
      // bay numbers on the wall, mostly scuffed off
      this.sign(x, 2.3, -43.83, 0, [bay === 11 ? '11' : bay === 16 ? '16' : '1_'], { w: 0.5, h: 0.3, size: 70, bg: '#6a6a62', fg: '#1a1a18' });
    }
    this.sign(-2.5, 2.55, -43.83, 0, ['RESERVED 12–16 · FEDERAL POOL'], { w: 4.2, h: 0.3, size: 40, bg: '#2a3a5a', fg: '#e0e0d0' });
    this.sign(23.83, 1.8, -21, -Math.PI / 2, ['LEVEL P2'], { w: 1.2, h: 0.4, size: 60, bg: '#c9a227', fg: '#151515' });
    this.sign(-19.83, 2.3, -30, Math.PI / 2, ['EXIT ⟶ HARBOR AVE'], { w: 2.2, h: 0.35, size: 44, bg: '#1a5a2a', fg: '#e8f0e0' });
    this.stairs(26, -15.5, -1);

    // ---------------- Harbor Avenue outside the hotel (the window set) ----------------
    this.wrecks = [];
    this.wreck(36, 47, 0.3, 0x6a1a18, { broken: true, smoke: true });
    this.wreck(52, 51.5, -2.6, 0x2a3a4a, { broken: true });
    this.wreck(44.5, 53.5, 1.4, 0xb8b4aa, { overturned: true });
    this.wreck(26, 45, 0.1, 0x1a1c1e, { broken: true, door: true });
    this.wreck(62, 46, 2.9, 0x3a4a3a, { broken: true, smoke: true });
    this.wreck(-8, 50, 0.2, 0x7a6a4a, { broken: true });
    this.wreck(4, 46.5, -0.4, 0x2a3a4a, { broken: true, door: true });
    this.debris(20, 72, 41, 57, 60);

    // ---------------- The drive: Harbor Avenue south, Kestrel Street ----------------
    const W = (x, z, rot, o = {}) => this.wreck(x, z, rot, CAR_COLORS[(Math.random() * CAR_COLORS.length) | 0], { broken: true, ...o });
    W(3.5, -96, 0.2); W(-4, -118, 2.9, { smoke: true }); W(2.5, -140, -0.3, { overturned: true });
    W(-3.5, -148, 1.2); W(4.2, -176, 0.1, { door: true });
    this.bus(2.6, -200, -1.15);                            // the bus across the lane: go round on the left
    W(3, -230, 1.6, { smoke: true }); W(-4, -236, 0.2); W(-2.8, -262, 2.6, { overturned: true });
    W(3.6, -290, 0.3); W(-1, -318, 0.9, { smoke: true }); W(4.4, -340, 0.2); W(-4.5, -350, 3.0, { door: true });
    W(-2, -375, 0.4);
    W(-30, -404.5, 1.5); W(-52, -411.5, 1.7, { overturned: true }); W(-74, -405, 1.4, { smoke: true });
    W(-96, -412, 1.3); W(-118, -405, 1.6, { broken: true, door: true }); W(-133, -411, 1.4);
    this.debris(-7, 7, -400, -70, 140); this.debris(-148, -10, -415, -401, 70);
    // the dead traffic lights at the junction
    for (const [x, z] of [[-7, -399], [7, -417]]) {
      this.box(x, z, 0.2, 0.2, 5, paint(0x1a1a1a), { surface: 'metal' });
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.1, 0.4), paint(0x1a1a1a)); head.position.set(x, 4.6, z); this.group.add(head);
      for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.CircleGeometry(0.1, 10), new THREE.MeshBasicMaterial({ color: 0x1a1210 })); b.position.set(x, 4.95 - k * 0.32, z + 0.21); this.group.add(b); }
    }
    this.sign(-9, 3.2, -398.2, 0, ['KESTREL ST ⟵'], { w: 2.2, h: 0.4, size: 50, bg: '#1a4a2a', fg: '#e8f0e0' });
    // the field office gate: sandbags, a pole barrier, a flag and a sign
    for (let z = -416; z <= -400; z += 1.2) if (Math.abs(z + 408) > 3) this.box(-151, z, 1.0, 1.1, 0.8, mat('cloth', { repeat: 1, color: 0x8a7a5a }), { surface: 'wood' });
    this.barrier = this.box(-150.5, -408, 0.15, 6, 0.15, paint(0xc83020), { y: 1.0, solid: false });
    this.sign(-169.8, 4, -408, Math.PI / 2, ['FEDERAL FIELD OFFICE', 'KESTREL STREET'], { w: 5.5, h: 1.2, size: 52, bg: '#1a2a3a', fg: '#e0e0d0' });
    this.box(-168, -408, 2.2, 4, 0.2, paint(0x2a2a2a), { y: 2.7, solid: false }); // the entrance canopy
    this.fieldDoor = this.box(-168.9, -408, 0.1, 1.8, 2.3, paint(0x0c1418, 0.1), { solid: false });

    this.buildSets();
  }

  // Concrete stairs rising out of a stairwell (dir +1 climbs toward +z).
  stairs(x, z, dir) {
    const m = mat('concrete', { repeat: 1, color: 0x8a867e });
    for (let k = 0; k < 8; k++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18 * (k + 1), 0.3), m);
      s.position.set(x, 0.09 * (k + 1), z + dir * k * 0.3); s.castShadow = true; s.receiveShadow = true; this.group.add(s);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 2.6), new THREE.MeshStandardMaterial({ color: 0x5a3a2a, metalness: 0.4 }));
    rail.position.set(x - 1.15, 1.5, z + dir * 1.1); rail.rotation.x = -dir * 0.5; this.group.add(rail);
    G.colliders.push({ minX: x - 1.1, maxX: x + 1.1, minZ: Math.min(z, z + dir * 2.3) - 0.15, maxZ: Math.max(z, z + dir * 2.3) + 0.15, prop: true });
  }

  // A parked or wrecked car. rot is the heading (0 = nose toward +z).
  // Returns a group with userData.collider; cars are 4.4 m long and 1.8 m wide.
  makeCar(color, o = {}) {
    const g = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.55 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x0c1418, roughness: 0.05, metalness: 0.8, transparent: true, opacity: 0.85 });
    const black = new THREE.MeshStandardMaterial({ color: 0x0e0e0e, roughness: 0.8 });
    const lower = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.62, 4.4), body); lower.position.y = 0.62; g.add(lower);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.12, 1.2), body); hood.position.set(0, 0.96, 1.5); hood.rotation.x = 0.06; g.add(hood);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.58, 2.1), body); cabin.position.set(0, 1.22, -0.25); g.add(cabin); g.userData.cabin = cabin;
    // windows: front, rear and two sides each; broken ones are holes with a jag of glass
    const pane = (w, h, x, y, z, ry, rx = 0) => {
      const broken = o.broken && Math.random() < 0.6;
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), broken ? new THREE.MeshBasicMaterial({ color: 0x050505 }) : glass);
      p.position.set(x, y, z); p.rotation.set(rx, ry, 0); g.add(p);
      if (broken) {
        const shard = new THREE.Mesh(new THREE.ConeGeometry(w * 0.2, h * 0.7, 3), glass);
        shard.position.set(x, y - h * 0.2, z); shard.rotation.set(rx, ry, Math.PI); g.add(shard);
      }
      return p;
    };
    pane(1.45, 0.5, 0, 1.24, 0.82, 0, -0.5);
    pane(1.45, 0.48, 0, 1.24, -1.31, Math.PI, -0.45);
    for (const s of [-1, 1]) { pane(1.85, 0.42, s * 0.805, 1.25, -0.25, s * Math.PI / 2); }
    for (const [x, z] of [[-0.86, 1.35], [0.86, 1.35], [-0.86, -1.4], [0.86, -1.4]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 14), black);
      w.rotation.z = Math.PI / 2; w.position.set(x, 0.34, z); g.add(w);
    }
    const head = new THREE.MeshStandardMaterial({ color: 0xd8d8c8, emissive: 0xfff0d0, emissiveIntensity: o.lights ? 1.5 : 0 });
    const tail = new THREE.MeshStandardMaterial({ color: 0x5a0a08, emissive: 0xff2010, emissiveIntensity: 0 });
    for (const s of [-1, 1]) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.05), head); h.position.set(s * 0.6, 0.78, 2.2); g.add(h);
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.05), tail); t.position.set(s * 0.6, 0.8, -2.2); g.add(t);
    }
    g.userData.head = head; g.userData.tail = tail;
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.18, 0.12), black);
    bumper.position.set(0, 0.42, 2.22); g.add(bumper);
    const rb = bumper.clone(); rb.position.z = -2.22; g.add(rb);
    if (o.door) { // a door hanging open where somebody left in a hurry
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 1.0), body); d.position.set(1.25, 0.75, 0.55); d.rotation.y = 0.9; g.add(d);
    }
    g.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; c.userData.surface = 'metal'; } });
    return g;
  }

  // Place a car prop with an axis-aligned collider around its footprint.
  carProp(x, z, rot, color, o = {}) {
    const car = this.makeCar(color, o);
    car.position.set(x, 0, z); car.rotation.y = rot;
    if (o.overturned) { car.rotation.z = Math.PI; car.position.y = 1.55; }
    else if (!o.tidy) { car.rotation.z = rand(-0.04, 0.04); car.rotation.x = rand(-0.03, 0.03); }
    this.group.add(car);
    car.traverse(c => { if (c.isMesh) G.worldMeshes.push(c); });
    const c = Math.abs(Math.cos(rot)), s = Math.abs(Math.sin(rot));
    const hx = (1.8 * c + 4.4 * s) / 2, hz = (1.8 * s + 4.4 * c) / 2;
    const col = { minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz, prop: true, car: true };
    G.colliders.push(col); car.userData.collider = col;
    return car;
  }

  wreck(x, z, rot, color, o = {}) {
    const car = this.carProp(x, z, rot, color, { broken: true, ...o });
    if (o.smoke) this.smoke(x, 1.2, z);
    this.wrecks.push(car);
    return car;
  }

  bus(x, z, rot) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.9, 11), new THREE.MeshStandardMaterial({ color: 0xc8a02a, roughness: 0.5, metalness: 0.3 }));
    body.position.y = 1.75; g.add(body);
    const band = new THREE.Mesh(new THREE.BoxGeometry(2.52, 0.9, 10.4), new THREE.MeshStandardMaterial({ color: 0x0c1014, roughness: 0.1, metalness: 0.6 }));
    band.position.y = 2.3; g.add(band);
    for (const z of [-3.8, 3.6]) for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 14), new THREE.MeshStandardMaterial({ color: 0x111111 })); w.rotation.z = Math.PI / 2; w.position.set(s * 1.2, 0.5, z); g.add(w); }
    g.position.set(x, 0, z); g.rotation.y = rot;
    g.traverse(c => { if (c.isMesh) { c.castShadow = true; c.userData.surface = 'metal'; G.worldMeshes.push(c); } });
    this.group.add(g);
    // the bus is long, so it gets a chain of colliders along its length
    for (let k = -5; k <= 5; k += 1.25) {
      const cx = x + Math.sin(rot) * k, cz = z + Math.cos(rot) * k;
      G.colliders.push({ minX: cx - 1.25, maxX: cx + 1.25, minZ: cz - 1.25, maxZ: cz + 1.25, prop: true, car: true });
    }
    this.smoke(x + 2, 3, z);
  }

  debris(x0, x1, z0, z1, n) {
    const paper = new THREE.MeshStandardMaterial({ color: 0xcfc8b4, roughness: 0.9 });
    const glassBits = new THREE.MeshStandardMaterial({ color: 0x9ab0c0, roughness: 0.1, metalness: 0.6 });
    const blood = new THREE.MeshStandardMaterial({ color: 0x2a0503, roughness: 0.25, transparent: true, opacity: 0.85 });
    for (let k = 0; k < n; k++) {
      const r = Math.random();
      const m = new THREE.Mesh(r < 0.5 ? new THREE.PlaneGeometry(0.3, 0.22) : r < 0.8 ? new THREE.CircleGeometry(rand(0.05, 0.12), 3) : new THREE.CircleGeometry(rand(0.3, 0.9), 10), r < 0.5 ? paper : r < 0.8 ? glassBits : blood);
      m.rotation.x = -Math.PI / 2; m.rotation.z = Math.random() * 6;
      m.position.set(rand(x0, x1), 0.013, rand(z0, z1)); this.group.add(m);
    }
  }

  // A column of slow grey smoke from a burning wreck.
  smoke(x, y, z) {
    const mtl = new THREE.SpriteMaterial({ map: dotTexture(), color: 0x3a3a3a, transparent: true, opacity: 0.35, depthWrite: false });
    const puffs = [];
    for (let k = 0; k < 7; k++) { const s = new THREE.Sprite(mtl); s.userData.t = k / 7; this.group.add(s); puffs.push(s); }
    const fire = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: 0xff7a30, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    fire.position.set(x, y, z); fire.scale.setScalar(1.6); this.group.add(fire);
    (this.smokes ||= []).push({ x, y, z, puffs, fire });
  }

  // ---------- the montage sets, east of the map ----------
  buildSets() {
    const S = this.sets = {};
    const white = mat('plaster', { repeat: 3, color: 0xdfe6ea });
    // Set A, x 200: the Annex trial room under Saltmere Island, eight months ago
    const ax = 200, az = 0;
    const room = new THREE.Mesh(new THREE.BoxGeometry(10, 3.4, 10), new THREE.MeshStandardMaterial({ map: white.map, side: THREE.BackSide, roughness: 0.4 }));
    room.position.set(ax, 1.7, az); this.group.add(room);
    const gurney = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 2.1), new THREE.MeshStandardMaterial({ color: 0xa8acb0, metalness: 0.8, roughness: 0.3 }));
    gurney.position.set(ax, 0.85, az); this.group.add(gurney);
    for (const [dx, dz] of [[-0.4, -0.9], [0.4, -0.9], [-0.4, 0.9], [0.4, 0.9]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.85, 6), gurney.material); l.position.set(ax + dx, 0.42, az + dz); this.group.add(l); }
    const lamp = new THREE.SpotLight(0xe8f4ff, 60, 9, 0.5, 0.4, 1.4); lamp.position.set(ax, 3.2, az); lamp.target.position.set(ax, 0, az); this.group.add(lamp, lamp.target);
    lamp.visible = false;
    S.labLamp = lamp;
    const vial = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8), new THREE.MeshStandardMaterial({ color: 0x6a8ab0, emissive: 0x4a7ab0, emissiveIntensity: 1.2 }));
    vial.position.set(ax + 1.2, 1.0, az - 0.4); this.group.add(vial);
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.4), gurney.material); tray.position.set(ax + 1.2, 0.45, az - 0.4); this.group.add(tray);
    this.sign(ax, 2.6, az - 4.95, 0, ['V-7 · TRIAL 7 · SUBJECT 07'], { w: 3, h: 0.4, size: 44, bg: '#e8ecef', fg: '#2a3a5a' });
    // the sealed door of the Annex
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.8, 0.2), mat('metal', { repeat: 1, color: 0x8a9298 }));
    door.position.set(ax - 4.85, 1.4, az + 2); door.rotation.y = Math.PI / 2; this.group.add(door);
    this.sign(ax - 4.7, 2.0, az + 2, Math.PI / 2, ['ANNEX · SEALED', 'NO ENTRY'], { w: 1.6, h: 0.6, size: 46, bg: '#c9a227', fg: '#151515' });
    S.lab = { x: ax, z: az, vial };

    // Set B, x 240: the dock at night, container VGR-7718 and its mist
    const bx = 240, bz = 0;
    const deck = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), mat('asphalt', { repeat: 6 }));
    deck.rotation.x = -Math.PI / 2; deck.position.set(bx, 0.002, bz); this.group.add(deck);
    const vig = this.container(6.1, 0xd9d6ce); vig.position.set(bx, 0, bz); vig.rotation.y = Math.PI / 2; this.group.add(vig);
    this.sign(bx - 1.23, 1.7, bz, -Math.PI / 2, ['VIGOR BIOTECH', 'MEDICAL SUPPLIES'], { w: 2.4, h: 0.6, size: 44, bg: '#d8d4c8', fg: '#2a3a5a' });
    for (const [x, z, c] of [[bx + 6, bz - 4, 0x6a2a22], [bx + 6, bz + 3, 0x2a4a5a], [bx - 7, bz + 5, 0x3a5a32]]) { const k = this.container(6.1, c); k.position.set(x, 0, z); k.rotation.y = Math.PI / 2; this.group.add(k); }
    const flood = S.dockLamp = new THREE.PointLight(0xffa860, 30, 30, 1.5); flood.position.set(bx + 4, 8, bz + 8); this.group.add(flood);
    flood.visible = false;
    S.mist = [];
    const mm = new THREE.SpriteMaterial({ map: dotTexture(), color: 0xd8e0e8, transparent: true, opacity: 0.0, depthWrite: false });
    for (let k = 0; k < 26; k++) { const s = new THREE.Sprite(mm); s.position.set(bx + 0.2 - rand(0, 1), 0.25, bz + 3.1 + rand(-1, 1)); s.scale.set(2.2, 0.7, 1); this.group.add(s); S.mist.push(s); }
    S.mistMat = mm;
    S.dock = { x: bx, z: bz };
  }

  update(dt) {
    super.update(dt);
    // no rain inside the Annex trial room set
    const cam = G.camera.position;
    if (cam.x > 194 && cam.x < 206 && cam.z > -6 && cam.z < 6) this.rain.visible = false;
    // smoke drifts up and fades; the fire under it flickers
    for (const s of this.smokes || []) {
      for (const p of s.puffs) {
        p.userData.t = (p.userData.t + dt * 0.12) % 1;
        const t = p.userData.t;
        p.position.set(s.x + t * 1.5, s.y + t * 7, s.z + Math.sin(t * 5) * 0.5);
        p.scale.setScalar(0.8 + t * 3.5);
      }
      s.puffs[0].material.opacity = 0.35;
      s.fire.material.opacity = 0.5 + Math.random() * 0.4;
    }
  }
}
