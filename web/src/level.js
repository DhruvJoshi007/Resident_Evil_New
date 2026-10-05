// Chapter 1 map: Kettle Street and the Harrow Bay Police Precinct.
// Rooms are rectangles on a 1 m grid. Walls are generated wherever two cells
// belong to different rooms, minus the door openings, so layout edits stay simple.
import * as THREE from 'three';
import { G, rand } from './game.js';
import { mat, tex, labelTexture } from './textures.js';

const GX0 = -26, GZ0 = -42, GW = 52, GH = 100;
const WALL_H = 3.4, FACADE_H = 8;

export const ROOMS = [
  { id: 'street', name: 'Kettle Street', x0: -14, x1: 14, z0: 20, z1: 56, floor: 'asphalt', outdoor: true, step: 'wet' },
  { id: 'lobby', name: 'Precinct Lobby', x0: -8, x1: 8, z0: 8, z1: 20, floor: 'tile', step: 'tile', light: [0, 14, 0xffd9a0, 16], safe: true },
  { id: 'west', name: 'West Office', x0: -24, x1: -8, z0: 8, z1: 20, floor: 'carpet', step: 'carpet', light: [-16, 14, 0xcfe0ff, 10, true] },
  { id: 'archives', name: 'Archives', x0: 8, x1: 24, z0: 8, z1: 20, floor: 'wood', step: 'wood', light: [16, 14, 0xffc890, 7, true] },
  { id: 'hall', name: 'Statue Hall', x0: -8, x1: 8, z0: -10, z1: 8, floor: 'marble', step: 'tile', light: [0, -1, 0xffe2b8, 14] },
  { id: 'armory', name: "Chief's Armoury", x0: -24, x1: -8, z0: -10, z1: 8, floor: 'concrete', step: 'concrete', light: [-16, -1, 0xfff0d0, 12] },
  { id: 'east', name: 'East Hall', x0: 8, x1: 24, z0: -10, z1: 8, floor: 'tile', step: 'tile', light: [16, -1, 0xd8e4ff, 8, true] },
  { id: 'interro', name: 'Interrogation', x0: 8, x1: 24, z0: -26, z1: -10, floor: 'concrete', step: 'concrete', light: [16, -18, 0xe0ffe0, 12, false, true] },
  { id: 'cells', name: 'Cell Block', x0: -24, x1: 6, z0: -40, z1: -10, floor: 'concrete', step: 'concrete', light: [-9, -25, 0xffd0a0, 18, true] },
];

// axis 'x': door sits in a wall that runs along X (constant z). axis 'z': wall along Z.
export const DOORS = [
  { id: 'main', x: 0, z: 20, axis: 'x', label: 'Precinct main doors', double: true },
  { id: 'west', x: -8, z: 14, axis: 'z', label: 'West Office' },
  { id: 'archives', x: 8, z: 14, axis: 'z', label: 'Archives' },
  { id: 'hall', x: 0, z: 8, axis: 'x', label: 'Statue Hall', double: true },
  { id: 'armory', x: -8, z: 0, axis: 'z', label: "Chief's Armoury", lock: 'medallions' },
  { id: 'east', x: 8, z: 0, axis: 'z', label: 'East Hall' },
  { id: 'archEast', x: 16, z: 8, axis: 'x', label: 'East Hall' },
  { id: 'interro', x: 16, z: -10, axis: 'x', label: 'Interrogation', lock: 'power' },
  { id: 'cells', x: -2, z: -10, axis: 'x', label: 'Cell Block', lock: 'cellkey', double: true },
];

const matCache = {};
function surface(kind, rx, ry, opts = {}) {
  const key = `${kind}:${rx}:${ry}:${opts.color ?? ''}`;
  if (!matCache[key]) matCache[key] = mat(kind, { repeat: rx, repeatY: ry, ...opts });
  return matCache[key];
}

export class Level {
  constructor() {
    this.group = new THREE.Group();
    G.scene.add(this.group);
    this.cells = new Int16Array(GW * GH).fill(-1);
    this.blocked = new Uint8Array(GW * GH);
    this.doorEdges = new Map();
    this.doors = {};
    this.interacts = [];
    this.lights = [];
    this.flicker = [];
    this.visited = new Set();
    this.buildGrid();
    this.buildFloors();
    this.buildDoors();
    this.buildWalls();
    this.buildLights();
    this.buildProps();
    this.buildRain();
    this.rasterizeProps();
  }

  idx(i, j) { return j * GW + i; }
  cellOf(x, z) { return [Math.floor(x - GX0), Math.floor(z - GZ0)]; }
  roomIndexAt(x, z) {
    const [i, j] = this.cellOf(x, z);
    if (i < 0 || j < 0 || i >= GW || j >= GH) return -1;
    return this.cells[this.idx(i, j)];
  }
  roomAt(x, z) { const r = this.roomIndexAt(x, z); return r >= 0 ? ROOMS[r] : null; }
  room(id) { return ROOMS.find(r => r.id === id); }

  buildGrid() {
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const x = GX0 + i + 0.5, z = GZ0 + j + 0.5;
      const r = ROOMS.findIndex(R => x > R.x0 && x < R.x1 && z > R.z0 && z < R.z1);
      this.cells[this.idx(i, j)] = r;
    }
  }

  buildFloors() {
    for (const R of ROOMS) {
      const w = R.x1 - R.x0, d = R.z1 - R.z0;
      const floorMat = surface(R.floor, w / 3, d / 3, {
        roughness: R.outdoor ? 0.35 : R.floor === 'marble' ? 0.3 : 0.8,
        metalness: R.outdoor ? 0.1 : 0,
      });
      const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
      f.rotation.x = -Math.PI / 2;
      f.position.set((R.x0 + R.x1) / 2, 0, (R.z0 + R.z1) / 2);
      f.receiveShadow = true;
      f.userData.surface = R.floor;
      this.group.add(f);
      if (!R.outdoor) {
        const c = new THREE.Mesh(new THREE.PlaneGeometry(w, d), surface('plaster', w / 4, d / 4, { color: 0x6a665e }));
        c.rotation.x = Math.PI / 2;
        c.position.set(f.position.x, WALL_H, f.position.z);
        this.group.add(c);
      }
    }
    // Ground beyond the street so the skyline does not float.
    const out = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x0a0b0c, roughness: 1 }));
    out.rotation.x = -Math.PI / 2; out.position.y = -0.02; this.group.add(out);
  }

  inDoorGap(axis, line, along) {
    for (const d of DOORS) {
      if (d.axis !== axis) continue;
      if (axis === 'x' && d.z === line && Math.abs(along - d.x) < 1) return d;
      if (axis === 'z' && d.x === line && Math.abs(along - d.z) < 1) return d;
    }
    return null;
  }

  buildWalls() {
    const runs = [];
    // Walls along X (between rows j-1 and j)
    for (let j = 0; j <= GH; j++) {
      let run = null;
      for (let i = 0; i <= GW; i++) {
        let edge = false, street = false;
        if (i < GW) {
          const a = j > 0 ? this.cells[this.idx(i, j - 1)] : -1;
          const b = j < GH ? this.cells[this.idx(i, j)] : -1;
          const zLine = GZ0 + j, xMid = GX0 + i + 0.5;
          const door = this.inDoorGap('x', zLine, xMid);
          if (door) this.doorEdges.set(`h:${i}:${j}`, door.id);
          edge = a !== b && (a >= 0 || b >= 0) && !door;
          street = a === 0 || b === 0;
        }
        if (edge && run && run.street === street) run.len++;
        else {
          if (run) runs.push(run);
          run = edge ? { axis: 'x', line: GZ0 + j, start: GX0 + i, len: 1, street } : null;
        }
      }
    }
    // Walls along Z (between columns i-1 and i)
    for (let i = 0; i <= GW; i++) {
      let run = null;
      for (let j = 0; j <= GH; j++) {
        let edge = false, street = false;
        if (j < GH) {
          const a = i > 0 ? this.cells[this.idx(i - 1, j)] : -1;
          const b = i < GW ? this.cells[this.idx(i, j)] : -1;
          const xLine = GX0 + i, zMid = GZ0 + j + 0.5;
          const door = this.inDoorGap('z', xLine, zMid);
          if (door) this.doorEdges.set(`v:${i}:${j}`, door.id);
          edge = a !== b && (a >= 0 || b >= 0) && !door;
          street = a === 0 || b === 0;
        }
        if (edge && run && run.street === street) run.len++;
        else {
          if (run) runs.push(run);
          run = edge ? { axis: 'z', line: GX0 + i, start: GZ0 + j, len: 1, street } : null;
        }
      }
    }
    const T = 0.3;
    for (const r of runs) {
      const h = r.street ? FACADE_H : WALL_H;
      const m = r.street ? surface('brick', r.len / 3, h / 3) : surface('plaster', r.len / 3, 1);
      const L = r.len + T;
      const geo = r.axis === 'x' ? new THREE.BoxGeometry(L, h, T) : new THREE.BoxGeometry(T, h, L);
      const mesh = new THREE.Mesh(geo, m);
      const mid = r.start + r.len / 2;
      if (r.axis === 'x') mesh.position.set(mid, h / 2, r.line); else mesh.position.set(r.line, h / 2, mid);
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.userData.surface = r.street ? 'brick' : 'plaster';
      this.group.add(mesh);
      G.worldMeshes.push(mesh);
      if (r.axis === 'x') G.colliders.push({ minX: r.start - T / 2, maxX: r.start + r.len + T / 2, minZ: r.line - T / 2, maxZ: r.line + T / 2 });
      else G.colliders.push({ minX: r.line - T / 2, maxX: r.line + T / 2, minZ: r.start - T / 2, maxZ: r.start + r.len + T / 2 });
      if (r.street) this.addWindows(r);
    }
    // Lintels above every door so the opening reads as a doorway.
    for (const d of DOORS) {
      const isStreet = d.id === 'main';
      const top = isStreet ? FACADE_H : WALL_H, h = top - 2.6;
      const geo = d.axis === 'x' ? new THREE.BoxGeometry(2.3, h, 0.3) : new THREE.BoxGeometry(0.3, h, 2.3);
      const lintel = new THREE.Mesh(geo, isStreet ? surface('brick', 1, h / 3) : surface('plaster', 1, 0.3));
      lintel.position.set(d.x, 2.6 + h / 2, d.z);
      lintel.castShadow = true;
      this.group.add(lintel);
    }
    // Precinct sign over the main doors
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.9), new THREE.MeshStandardMaterial({
      map: labelTexture(['HARROW BAY POLICE'], { w: 1024, h: 150, size: 72, bg: '#1d1f22', fg: '#c9c2ac' }), roughness: 0.6,
    }));
    sign.position.set(0, 3.6, 20.17); this.group.add(sign);
  }

  addWindows(r) {
    const glow = [0x30281c, 0x5a4422, 0x1a2230];
    for (let k = 2; k < r.len - 1; k += 3) {
      for (let y = 3.5; y < FACADE_H - 0.5; y += 2.4) {
        if (Math.random() < 0.35) continue;
        const lit = Math.random() < 0.25;
        const w = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.4), new THREE.MeshStandardMaterial({
          color: 0x07090b, emissive: lit ? glow[(Math.random() * 3) | 0] : 0x000000, emissiveIntensity: 1.6, roughness: 0.15, metalness: 0.4,
        }));
        const along = r.start + k + 0.5;
        // place on the street-facing side
        if (r.axis === 'x') {
          const side = r.line <= 20.5 ? 1 : -1;
          w.position.set(along, y, r.line + side * 0.16);
          if (side < 0) w.rotation.y = Math.PI;
        } else {
          const side = r.line < 0 ? 1 : -1;
          w.position.set(r.line + side * 0.16, y, along);
          w.rotation.y = side * Math.PI / 2;
        }
        this.group.add(w);
      }
    }
  }

  buildDoors() {
    const wood = surface('wood', 1, 1, { color: 0x8a6a50 });
    for (const d of DOORS) {
      const door = { ...d, open: false, locked: !!d.lock, swing: 0, target: 0, leaves: [] };
      const leaves = d.double ? [[-1, 1], [1, 1]] : [[-1, 2]];
      for (const [side, width] of leaves) {
        const pivot = new THREE.Group();
        const panel = new THREE.Mesh(new THREE.BoxGeometry(width - 0.05, 2.55, 0.08), d.id === 'cells' ? surface('metal', 1, 1) : wood);
        panel.position.set(-side * (width / 2), 1.28, 0);
        panel.castShadow = true;
        panel.userData.surface = d.id === 'cells' ? 'metal' : 'wood';
        // handle
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshStandardMaterial({ color: 0xb59a5a, metalness: 0.8, roughness: 0.3 }));
        knob.position.set(-side * (width - 0.15), 1.05, 0.06); pivot.add(knob);
        pivot.add(panel);
        const hx = d.axis === 'x' ? d.x + side : d.x, hz = d.axis === 'x' ? d.z : d.z + side;
        pivot.position.set(hx, 0, hz);
        pivot.rotation.y = d.axis === 'x' ? 0 : -Math.PI / 2;
        pivot.userData.baseRot = pivot.rotation.y;
        pivot.userData.side = side;
        this.group.add(pivot);
        G.worldMeshes.push(panel);
        door.leaves.push(pivot);
      }
      door.collider = d.axis === 'x'
        ? { minX: d.x - 1, maxX: d.x + 1, minZ: d.z - 0.1, maxZ: d.z + 0.1, door: true }
        : { minX: d.x - 0.1, maxX: d.x + 0.1, minZ: d.z - 1, maxZ: d.z + 1, door: true };
      G.colliders.push(door.collider);
      this.doors[d.id] = door;
      const pos = new THREE.Vector3(d.x, 1.2, d.z);
      this.interacts.push({
        pos, radius: 2.0, door,
        label: () => door.locked ? `Examine the ${d.label} door` : `Open door to ${d.label}`,
        enabled: () => !door.open,
        action: () => G.story.tryDoor(door),
      });
    }
  }

  openDoor(id, fromPos, silent) {
    const door = this.doors[id];
    if (!door || door.open) return;
    door.open = true; door.locked = false;
    door.collider.enabled = false;
    // swing away from whoever opens it
    let dir = 1;
    if (fromPos) dir = door.axis === 'x' ? Math.sign(door.z - fromPos.z) || 1 : Math.sign(fromPos.x - door.x) || 1;
    door.target = dir * 1.45;
    if (!silent) G.audio.door(new THREE.Vector3(door.x, 1.5, door.z));
  }

  closeDoor(id, lock) {
    const door = this.doors[id];
    if (!door) return;
    door.open = false; door.target = 0; door.collider.enabled = true;
    if (lock) { door.locked = true; door.lock = lock; }
  }

  buildLights() {
    G.scene.add(new THREE.HemisphereLight(0x8090a8, 0x16120e, 0.5));
    const moon = new THREE.DirectionalLight(0x8aa0c8, 0.7);
    moon.position.set(-20, 40, 60); moon.target.position.set(0, 0, 30);
    G.scene.add(moon, moon.target);
    for (const R of ROOMS) {
      if (!R.light) continue;
      const [x, z, color, intensity, flick, off] = R.light;
      const l = new THREE.PointLight(color, intensity, 22, 1.6);
      l.position.set(x, WALL_H - 0.35, z);
      const fixture = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.12, 16), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: color, emissiveIntensity: off ? 0 : 2.5 }));
      fixture.position.set(x, WALL_H - 0.08, z);
      this.group.add(l, fixture);
      R.lamp = l; R.fixture = fixture; R.baseIntensity = intensity;
      if (off) { l.visible = false; }
      if (flick) this.flicker.push(R);
    }
    // Street lamp and the burning barricade
    const lamp = new THREE.PointLight(0xffb070, 12, 20, 1.8);
    lamp.position.set(-11, 5.5, 46); G.scene.add(lamp);
    this.addPost(-12.6, 46);
    this.fire = new THREE.PointLight(0xff7a2a, 40, 24, 1.6);
    this.fire.position.set(5, 1.4, 34); G.scene.add(this.fire);
    this.fireMeshes = [];
    for (let k = 0; k < 14; k++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.25 + Math.random() * 0.2, 0.8 + Math.random() * 0.8, 6), new THREE.MeshBasicMaterial({ color: k % 2 ? 0xff6a1a : 0xffa03a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
      f.position.set(3 + Math.random() * 4, 1.3 + Math.random() * 0.3, 34 + (Math.random() - 0.5) * 0.4);
      f.userData.base = f.position.y;
      this.group.add(f); this.fireMeshes.push(f);
    }
  }

  addPost(x, z) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 5.6, 8), new THREE.MeshStandardMaterial({ color: 0x1b1d1f, metalness: 0.6, roughness: 0.5 }));
    p.position.set(x, 2.8, z); this.group.add(p);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.08), p.material);
    arm.position.set(x + 0.8, 5.55, z); this.group.add(arm);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffb070, emissiveIntensity: 4 }));
    bulb.position.set(x + 1.6, 5.45, z); this.group.add(bulb);
  }

  // Static box prop with collision. Returns the mesh.
  box(x, z, w, d, h, material, opts = {}) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, (opts.y ?? 0) + h / 2, z);
    if (opts.rotY) mesh.rotation.y = opts.rotY;
    mesh.castShadow = opts.shadow !== false; mesh.receiveShadow = true;
    mesh.userData.surface = opts.surface || 'wood';
    this.group.add(mesh);
    if (opts.solid !== false) {
      G.worldMeshes.push(mesh);
      const c = { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, prop: true };
      G.colliders.push(c);
      mesh.userData.collider = c;
    }
    return mesh;
  }

  buildProps() {
    const wood = surface('wood', 1, 1);
    const darkWood = surface('wood', 1, 1, { color: 0x6a5040 });
    const metal = surface('metal', 1, 1);
    const paint = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, metalness: 0.5 });
    // Kettle Street
    this.box(-9, 40, 2.6, 10, 3, paint(0x2c3a44), { surface: 'metal' });          // burnt-out bus
    this.box(-9, 40, 2.4, 9.6, 0.6, new THREE.MeshStandardMaterial({ color: 0x090909 }), { y: 1.9, solid: false });
    this.box(8.5, 29, 2, 4.4, 1.3, paint(0x4a1e1a), { surface: 'metal' });       // car
    this.box(8.5, 29.3, 1.8, 2.2, 0.55, paint(0x1a1210), { y: 1.3, solid: false });
    this.box(-5.5, 25.5, 4.4, 2, 1.3, paint(0x2b2f33), { surface: 'metal' });    // police car
    this.box(-5.5, 25.5, 2.2, 1.8, 0.55, paint(0x111317), { y: 1.3, solid: false });
    this.box(4.5, 34, 6, 0.7, 1.1, darkWood, { surface: 'wood' });               // burning barricade
    this.box(-1.5, 34, 3, 0.5, 1.0, paint(0x8a7a2a), { surface: 'metal' });       // police barrier
    this.box(0, 56.3, 6, 0.6, 1.4, surface('concrete', 2, 0.5), { surface: 'concrete' }); // culvert mouth
    const culvert = new THREE.Mesh(new THREE.CircleGeometry(1.2, 20), new THREE.MeshBasicMaterial({ color: 0x020202 }));
    culvert.position.set(0, 1.2, 55.95); culvert.rotation.y = Math.PI; this.group.add(culvert);
    this.box(11, 50, 2.5, 0.9, 1.2, surface('metal', 1, 1, { color: 0x30402a }), { surface: 'metal' }); // dumpster in the alley
    // Lobby
    this.box(0, 12.5, 6, 1, 1.1, darkWood);
    this.box(-6, 17.5, 2.6, 0.6, 0.5, wood);
    this.box(6, 17.5, 2.6, 0.6, 0.5, wood);
    for (const x of [-4.5, 4.5]) this.box(x, 9.5, 0.7, 0.7, WALL_H, surface('marble', 1, 2), { surface: 'concrete' });
    // West Office
    for (const [x, z] of [[-20, 11.5], [-15, 11.5], [-20, 16.5], [-12, 17.6]]) {
      this.box(x, z, 2.2, 1.1, 0.78, wood);
      this.box(x + 0.4, z, 0.5, 0.35, 0.3, paint(0x1b1b1b), { y: 0.78, solid: false }); // monitor
    }
    this.box(-23.55, 12, 0.6, 6, 2, surface('metal', 2, 1, { color: 0x5a6a70 }), { surface: 'metal' }); // lockers
    // Archives shelving
    for (const x of [12, 15, 18, 21]) {
      this.box(x, 15, 0.6, 7, 2.4, darkWood);
      for (let k = 0; k < 4; k++) this.box(x, 15, 0.5, 6.8, 0.25, new THREE.MeshStandardMaterial({ color: [0x6b5a3c, 0x52432f, 0x7a6a4a][k % 3] }), { y: 0.35 + k * 0.55, solid: false, shadow: false });
    }
    // Statue Hall
    this.box(0, -1, 1.8, 1.8, 1.0, surface('marble', 1, 1), { surface: 'concrete' }); // plinth
    this.box(0, -8.6, 6, 1.2, 1.4, darkWood);                                       // judge's bench
    this.box(0, -9.2, 1.2, 0.5, 2.2, darkWood, { y: 0 });                            // judge's chair back
    for (const [x, z] of [[-5, 3], [5, 3], [-5, -4], [5, -4]]) this.box(x, z, 3, 0.55, 0.5, wood);
    // East Hall
    this.box(20, -8.6, 2.2, 0.7, 1.3, metal, { surface: 'metal' });
    this.box(13, 4, 2.2, 1.1, 0.78, wood);
    // Interrogation
    this.box(16, -18, 2.2, 1.1, 0.8, metal, { surface: 'metal' });
    this.box(10.5, -22, 0.15, 5, 1.6, new THREE.MeshStandardMaterial({ color: 0x1a2024, roughness: 0.05, metalness: 0.9 }), { y: 0.8, surface: 'glass' }); // one-way mirror
    // Armoury
    this.box(-23.6, -1, 0.5, 12, 2, metal, { surface: 'metal' });
    this.box(-16, -1, 3, 1.2, 0.9, metal, { surface: 'metal' });
    // Cell block: bars, cell dividers and two pillars
    this.cellBars = [];
    const barMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.8, roughness: 0.4 });
    const addBars = (x, z0, z1, id) => {
      const g = new THREE.Group();
      for (let z = z0 + 0.2; z < z1; z += 0.25) {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, WALL_H, 6), barMat);
        b.position.set(x, WALL_H / 2, z); g.add(b);
      }
      this.group.add(g);
      const c = { minX: x - 0.1, maxX: x + 0.1, minZ: z0, maxZ: z1, bars: true };
      G.colliders.push(c);
      this.cellBars.push({ id, group: g, collider: c, open: false });
    };
    for (let z = -40; z < -12; z += 6) {
      addBars(-19, z, Math.min(z + 6, -10), 'w' + z);
      addBars(1, z, Math.min(z + 6, -10), 'e' + z);
      if (z > -40) {
        this.box(-21.5, z, 5, 0.25, WALL_H, surface('plaster', 1, 1), { surface: 'plaster' });
        this.box(3.5, z, 5, 0.25, WALL_H, surface('plaster', 1, 1), { surface: 'plaster' });
      }
    }
    this.box(-13, -20, 1.1, 1.1, WALL_H, surface('concrete', 1, 2), { surface: 'concrete' });
    this.box(-6, -31, 1.1, 1.1, WALL_H, surface('concrete', 1, 2), { surface: 'concrete' });
    // Blood smears and debris for set dressing
    for (let k = 0; k < 26; k++) {
      const R = ROOMS[(Math.random() * ROOMS.length) | 0];
      const s = new THREE.Mesh(new THREE.CircleGeometry(rand(0.2, 0.9), 12), new THREE.MeshStandardMaterial({ color: 0x2a0503, roughness: 0.25, transparent: true, opacity: 0.85 }));
      s.rotation.x = -Math.PI / 2; s.position.set(rand(R.x0 + 1, R.x1 - 1), 0.01 + k * 0.0003, rand(R.z0 + 1, R.z1 - 1));
      this.group.add(s);
    }
    for (let k = 0; k < 40; k++) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.22), new THREE.MeshStandardMaterial({ color: 0xcfc8b4, roughness: 0.9 }));
      p.rotation.x = -Math.PI / 2; p.rotation.z = Math.random() * 3;
      const R = ROOMS[1 + ((Math.random() * (ROOMS.length - 1)) | 0)];
      p.position.set(rand(R.x0 + 1, R.x1 - 1), 0.012, rand(R.z0 + 1, R.z1 - 1));
      this.group.add(p);
    }
  }

  openCellBars(side) {
    for (const b of this.cellBars) {
      if (b.open || !b.id.startsWith(side)) continue;
      b.open = true; b.collider.enabled = false;
    }
  }

  buildRain() {
    const N = 3000, pos = new Float32Array(N * 6);
    for (let k = 0; k < N; k++) {
      const x = rand(-14, 14), y = rand(0, 12), z = rand(20, 56);
      pos.set([x, y, z, x + 0.02, y - 0.45, z + 0.04], k * 6);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x9fb0c4, transparent: true, opacity: 0.18 }));
    this.rain.frustumCulled = false;
    G.scene.add(this.rain);
  }

  rasterizeProps() {
    for (const c of G.colliders) {
      if (!c.prop && !c.bars) continue;
      for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
        const x = GX0 + i + 0.5, z = GZ0 + j + 0.5;
        if (x > c.minX - 0.35 && x < c.maxX + 0.35 && z > c.minZ - 0.35 && z < c.maxZ + 0.35) {
          this.blocked[this.idx(i, j)] = c.bars ? 2 : 1;
        }
      }
    }
  }

  // ----- pathfinding (A* on the 1 m grid) -----
  passable(i, j, ni, nj) {
    if (ni < 0 || nj < 0 || ni >= GW || nj >= GH) return false;
    const a = this.cells[this.idx(i, j)], b = this.cells[this.idx(ni, nj)];
    if (b < 0) return false;
    const bl = this.blocked[this.idx(ni, nj)];
    if (bl === 1) return false;
    if (bl === 2 && !this.barsOpenAt(ni, nj)) return false;
    if (a === b) return true;
    let key;
    if (ni === i) key = `h:${i}:${Math.max(j, nj)}`;
    else if (nj === j) key = `v:${Math.max(i, ni)}:${j}`;
    else return false;
    const id = this.doorEdges.get(key);
    return !!id && this.doors[id].open;
  }

  barsOpenAt(i, j) {
    const x = GX0 + i + 0.5, z = GZ0 + j + 0.5;
    for (const b of this.cellBars) {
      const c = b.collider;
      if (x > c.minX - 0.4 && x < c.maxX + 0.4 && z > c.minZ - 0.4 && z < c.maxZ + 0.4) return b.open;
    }
    return true;
  }

  findPath(from, to, maxNodes = 2500) {
    const [si, sj] = this.cellOf(from.x, from.z);
    const [ti, tj] = this.cellOf(to.x, to.z);
    if (si === ti && sj === tj) return [to.clone()];
    const start = this.idx(si, sj), goal = this.idx(ti, tj);
    if (this.cells[goal] < 0) return null;
    const open = [start], came = new Map(), gs = new Map([[start, 0]]);
    const h = (n) => Math.hypot((n % GW) - ti, ((n / GW) | 0) - tj);
    const fs = new Map([[start, h(start)]]);
    const closed = new Set();
    let count = 0;
    while (open.length && count++ < maxNodes) {
      let bi = 0;
      for (let k = 1; k < open.length; k++) if (fs.get(open[k]) < fs.get(open[bi])) bi = k;
      const cur = open.splice(bi, 1)[0];
      if (cur === goal) {
        const path = [];
        let n = cur;
        while (n !== start) { path.push(new THREE.Vector3(GX0 + (n % GW) + 0.5, 0, GZ0 + ((n / GW) | 0) + 0.5)); n = came.get(n); }
        path.reverse();
        path[path.length - 1] = to.clone();
        return path;
      }
      closed.add(cur);
      const ci = cur % GW, cj = (cur / GW) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = ci + di, nj = cj + dj;
        if (di && dj) { // diagonal: both orthogonal steps must be clear
          if (!this.passable(ci, cj, ni, cj) || !this.passable(ci, cj, ci, nj) || !this.passable(ni, cj, ni, nj)) continue;
        } else if (!this.passable(ci, cj, ni, nj)) continue;
        const n = this.idx(ni, nj);
        if (closed.has(n)) continue;
        const g = gs.get(cur) + (di && dj ? 1.414 : 1);
        if (g < (gs.get(n) ?? Infinity)) {
          came.set(n, cur); gs.set(n, g); fs.set(n, g + h(n));
          if (!open.includes(n)) open.push(n);
        }
      }
    }
    return null;
  }

  update(dt) {
    const t = G.time;
    for (const R of this.flicker) {
      if (!R.lamp.visible) continue;
      const f = Math.random() < 0.04 ? 0.15 : 1 - Math.random() * 0.08;
      R.lamp.intensity = R.baseIntensity * f;
      R.fixture.material.emissiveIntensity = 2.5 * f;
    }
    this.fire.intensity = 34 + Math.sin(t * 13) * 5 + Math.random() * 8;
    for (const f of this.fireMeshes) { f.position.y = f.userData.base + Math.sin(t * 9 + f.id) * 0.08; f.scale.y = 0.8 + Math.random() * 0.4; }
    // Rain falls in a loop over the street
    const p = this.rain.geometry.attributes.position.array;
    const fall = 16 * dt;
    for (let k = 0; k < p.length; k += 6) {
      p[k + 1] -= fall; p[k + 4] -= fall;
      if (p[k + 4] < 0) { const y = 12 + Math.random() * 2; p[k + 1] = y; p[k + 4] = y - 0.45; }
    }
    this.rain.geometry.attributes.position.needsUpdate = true;
    // Doors swing toward their target angle
    for (const d of Object.values(this.doors)) {
      d.swing += (d.target - d.swing) * Math.min(1, dt * 5);
      for (const leaf of d.leaves) leaf.rotation.y = leaf.userData.baseRot + d.swing * leaf.userData.side;
    }
    for (const b of this.cellBars) if (b.open && b.group.position.y < WALL_H - 0.3) b.group.position.y += dt * 1.5;
  }
}
