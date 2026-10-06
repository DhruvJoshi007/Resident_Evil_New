// Chapter 1 map: Port Halvern. The north pier, the dock office, Warehouse 3,
// the break room, the customs cage, the crane control house, the container
// yard and the boat dock.
// Rooms are rectangles on a 1 m grid. Walls are generated wherever two cells
// belong to different rooms, minus the door openings, so layout edits stay simple.
// The wall style depends on what is on each side: an interior wall, a building
// facade, a stack of shipping containers, a chain-link fence, or open water.
import * as THREE from 'three';
import { G, rand } from './game.js';
import { mat, labelTexture, chainLinkTexture } from './textures.js';

const GX0 = -26, GZ0 = -36, GW = 54, GH = 100;

export const ROOMS = [
  { id: 'pier', name: 'North Pier', x0: -10, x1: 10, z0: 40, z1: 62, floor: 'planks', step: 'wet', outdoor: true, edge: 'water' },
  { id: 'office', name: 'Dock Office', x0: -22, x1: -10, z0: 42, z1: 54, h: 3.2, floor: 'tile', step: 'tile', wall: 'plaster', safe: true,
    lights: [{ x: -16, z: 48, color: 0xffd9a0, i: 9 }] },
  { id: 'warehouse', name: 'Warehouse 3', x0: -10, x1: 14, z0: 14, z1: 40, h: 7, floor: 'concrete', step: 'concrete', wall: 'corrugated',
    lights: [{ x: -2, z: 33, color: 0xffc890, i: 14, flick: true }, { x: 6, z: 21, color: 0xd8e4ff, i: 10 }, { x: -6, z: 19, color: 0xffc890, i: 0, off: true }] },
  { id: 'break', name: 'Break Room', x0: 14, x1: 24, z0: 28, z1: 40, h: 3, floor: 'tile', step: 'tile', wall: 'plaster',
    lights: [{ x: 19, z: 34, color: 0xe8f0ff, i: 7, flick: true }] },
  { id: 'customs', name: 'Customs Cage', x0: 14, x1: 24, z0: 14, z1: 28, h: 3.4, floor: 'concrete', step: 'concrete', wall: 'corrugated', special: true,
    lights: [{ x: 19, z: 21, color: 0xfff0d0, i: 8 }] },
  { id: 'control', name: 'Crane Control House', x0: -24, x1: -10, z0: 14, z1: 26, h: 3.2, floor: 'concrete', step: 'metal', wall: 'plaster',
    lights: [{ x: -17, z: 20, color: 0xd0ffe0, i: 0, off: true }] },
  { id: 'yard', name: 'Container Yard', x0: -24, x1: 26, z0: -22, z1: 14, floor: 'asphalt', step: 'wet', outdoor: true, edge: 'stack' },
  { id: 'dock', name: 'Boat Dock', x0: -6, x1: 6, z0: -34, z1: -22, floor: 'planks', step: 'wet', outdoor: true, edge: 'water' },
];

// axis 'x': door sits in a wall that runs along X (constant z). axis 'z': wall along Z.
// kind: door (hinged), shutter (rolls up), gate (chain-link, slides aside).
export const DOORS = [
  { id: 'office', x: -10, z: 48, axis: 'z', label: 'Dock Office' },
  { id: 'warehouse', x: 0, z: 40, axis: 'x', label: 'Warehouse 3', kind: 'shutter', w: 4, lock: 'release' },
  { id: 'break', x: 14, z: 34, axis: 'z', label: 'Break Room' },
  { id: 'cage', x: 14, z: 21, axis: 'z', label: 'Customs Cage', kind: 'gate', lock: 'code' },
  { id: 'control', x: -10, z: 22, axis: 'z', label: 'Crane Control House' },
  { id: 'yardgate', x: 2, z: 14, axis: 'x', label: 'Container Yard', kind: 'gate', w: 4, lock: 'power' },
  { id: 'cargo', x: 0, z: -22, axis: 'x', label: 'Boat Dock', kind: 'shutter', w: 4, lock: 'shutterkey' },
];

// Walls that need a particular look regardless of the rooms on each side.
const PAIR_STYLE = { 'warehouse|customs': 'fence', 'yard|dock': 'shed' };

const matCache = {};
function surface(kind, rx, ry, opts = {}) {
  const key = `${kind}:${rx}:${ry}:${opts.color ?? ''}:${opts.roughness ?? ''}`;
  if (!matCache[key]) matCache[key] = mat(kind, { repeat: rx, repeatY: ry, ...opts });
  return matCache[key];
}

const CONTAINER_COLORS = [0x6a2a22, 0x2a4a5a, 0x3a5a32, 0x8a6a2a, 0x5a5a5e, 0x2a3242, 0x7a3a1a];

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
    this.animated = [];
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
      this.cells[this.idx(i, j)] = ROOMS.findIndex(R => x > R.x0 && x < R.x1 && z > R.z0 && z < R.z1);
    }
  }

  buildFloors() {
    for (const R of ROOMS) {
      const w = R.x1 - R.x0, d = R.z1 - R.z0;
      const wet = R.outdoor;
      const floorMat = surface(R.floor, w / 3, d / 3, { roughness: wet ? 0.3 : 0.8, metalness: wet ? 0.15 : 0 });
      const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
      f.rotation.x = -Math.PI / 2;
      f.position.set((R.x0 + R.x1) / 2, 0, (R.z0 + R.z1) / 2);
      f.receiveShadow = true;
      f.userData.surface = R.floor;
      this.group.add(f);
      if (!R.outdoor) {
        const c = new THREE.Mesh(new THREE.PlaneGeometry(w, d), surface(R.h > 5 ? 'corrugated' : 'plaster', w / 4, d / 4, { color: 0x5a5852 }));
        c.rotation.x = Math.PI / 2;
        c.position.set(f.position.x, R.h, f.position.z);
        this.group.add(c);
      }
      if (R.floor === 'planks') this.pilings(R);
    }
    // Black river water all around the port.
    const water = this.water = new THREE.Mesh(new THREE.PlaneGeometry(400, 400, 1, 1), new THREE.MeshStandardMaterial({ color: 0x05080a, roughness: 0.08, metalness: 0.7 }));
    water.rotation.x = -Math.PI / 2; water.position.y = -0.55;
    this.group.add(water);
    // Standing water across the flooded end of the pier.
    const flood = new THREE.Mesh(new THREE.PlaneGeometry(14, 9), new THREE.MeshStandardMaterial({ color: 0x0b1216, roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.72 }));
    flood.rotation.x = -Math.PI / 2; flood.position.set(-1, 0.025, 45.5);
    this.group.add(flood);
  }

  pilings(R) {
    const m = surface('wood', 1, 2, { color: 0x3a3028 });
    for (let x = R.x0 + 0.4; x <= R.x1; x += 4) for (const z of [R.z0 + 0.4, R.z1 - 0.4]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 1.4, 8), m);
      p.position.set(x, -0.6, z); this.group.add(p);
    }
    for (let z = R.z0 + 0.4; z <= R.z1; z += 4) for (const x of [R.x0 + 0.4, R.x1 - 0.4]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 1.4, 8), m);
      p.position.set(x, -0.6, z); this.group.add(p);
    }
    const side = new THREE.MeshStandardMaterial({ color: 0x241e18, roughness: 0.9 });
    const skirt = (w, d, x, z) => { const s = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), side); s.position.set(x, -0.25, z); this.group.add(s); };
    skirt(R.x1 - R.x0, 0.2, (R.x0 + R.x1) / 2, R.z0); skirt(R.x1 - R.x0, 0.2, (R.x0 + R.x1) / 2, R.z1);
    skirt(0.2, R.z1 - R.z0, R.x0, (R.z0 + R.z1) / 2); skirt(0.2, R.z1 - R.z0, R.x1, (R.z0 + R.z1) / 2);
  }

  doorHalf(d) { return (d.w || 2) / 2; }

  inDoorGap(axis, line, along) {
    for (const d of DOORS) {
      if (d.axis !== axis) continue;
      const half = this.doorHalf(d);
      if (axis === 'x' && d.z === line && Math.abs(along - d.x) < half) return d;
      if (axis === 'z' && d.x === line && Math.abs(along - d.z) < half) return d;
    }
    return null;
  }

  // Which wall goes between cell values a and b, and how tall it is.
  wallStyle(a, b) {
    if (a < 0 && b < 0) return null;
    const A = a >= 0 ? ROOMS[a] : null, B = b >= 0 ? ROOMS[b] : null;
    if (A && B) {
      const key = PAIR_STYLE[A.id + '|' + B.id] || PAIR_STYLE[B.id + '|' + A.id];
      if (key === 'fence') return { style: 'fence', h: 3.2 };
      if (key === 'shed') return { style: 'shed', h: 5 };
    }
    const inA = A && !A.outdoor, inB = B && !B.outdoor;
    if (inA && inB) {
      const tall = (A.h || 3) >= (B.h || 3) ? A : B;
      return { style: 'interior', h: tall.h, tex: tall.wall };
    }
    if (inA || inB) {
      const R = inA ? A : B;
      return { style: 'facade', h: R.h + (R.h > 5 ? 1.2 : 0.8), tex: R.h > 5 ? 'corrugated' : R.wall === 'corrugated' ? 'corrugated' : 'concrete' };
    }
    const O = A || B;
    return O.edge === 'water' ? { style: 'water', h: 0 } : { style: 'stack', h: 5.2 };
  }

  buildWalls() {
    const runs = [];
    const scan = (axis) => {
      const outer = axis === 'x' ? GH : GW, inner = axis === 'x' ? GW : GH;
      for (let o = 0; o <= outer; o++) {
        let run = null;
        for (let n = 0; n <= inner; n++) {
          let ws = null, voidSide = 0;
          if (n < inner) {
            let a, b, line, mid, key;
            if (axis === 'x') { // between rows o-1 and o, along column n
              a = o > 0 ? this.cells[this.idx(n, o - 1)] : -1; b = o < GH ? this.cells[this.idx(n, o)] : -1;
              line = GZ0 + o; mid = GX0 + n + 0.5; key = `h:${n}:${o}`;
            } else {
              a = o > 0 ? this.cells[this.idx(o - 1, n)] : -1; b = o < GW ? this.cells[this.idx(o, n)] : -1;
              line = GX0 + o; mid = GZ0 + n + 0.5; key = `v:${o}:${n}`;
            }
            const door = this.inDoorGap(axis, line, mid);
            if (door) this.doorEdges.set(key, door.id);
            if (a !== b && !door) { ws = this.wallStyle(a, b); voidSide = a < 0 ? -1 : b < 0 ? 1 : 0; }
          }
          const sig = ws ? ws.style + ':' + ws.h + ':' + (ws.tex || '') + ':' + voidSide : null;
          if (sig && run && run.sig === sig) run.len++;
          else {
            if (run) runs.push(run);
            run = sig ? { axis, line: axis === 'x' ? GZ0 + o : GX0 + o, start: (axis === 'x' ? GX0 : GZ0) + n, len: 1, sig, voidSide, ...ws } : null;
          }
        }
      }
    };
    scan('x'); scan('z');
    for (const r of runs) this.buildRun(r);
    // Lintels over doorways so each opening reads as a doorway.
    for (const d of DOORS) {
      const w = d.w || 2;
      const a = d.axis === 'x' ? this.roomIndexAt(d.x, d.z - 0.5) : this.roomIndexAt(d.x - 0.5, d.z);
      const b = d.axis === 'x' ? this.roomIndexAt(d.x, d.z + 0.5) : this.roomIndexAt(d.x + 0.5, d.z);
      const top = this.wallStyle(a, b)?.h || 3;
      const h = top - 2.7;
      if (h <= 0.05) continue;
      const geo = d.axis === 'x' ? new THREE.BoxGeometry(w + 0.3, h, 0.3) : new THREE.BoxGeometry(0.3, h, w + 0.3);
      const lintel = new THREE.Mesh(geo, surface(d.kind === 'shutter' ? 'corrugated' : 'concrete', 1, h / 3));
      lintel.position.set(d.x, 2.7 + h / 2, d.z);
      lintel.castShadow = true;
      this.group.add(lintel);
    }
    // Company sign over the warehouse shutter, and the crane control house nameplate.
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(7, 1), new THREE.MeshStandardMaterial({
      map: labelTexture(['PORT HALVERN  ·  WAREHOUSE 3'], { w: 1024, h: 150, size: 60, bg: '#1d2124', fg: '#c9c2ac' }), roughness: 0.6,
    }));
    sign.position.set(0, 5.4, 40.17); this.group.add(sign);
  }

  doorTouches(d, R) {
    if (d.axis === 'x') return (R.z0 === d.z || R.z1 === d.z) && d.x > R.x0 && d.x < R.x1;
    return (R.x0 === d.x || R.x1 === d.x) && d.z > R.z0 && d.z < R.z1;
  }

  buildRun(r) {
    const T = 0.3, L = r.len;
    const mid = r.start + L / 2;
    const addCollider = () => {
      if (r.axis === 'x') G.colliders.push({ minX: r.start - T / 2, maxX: r.start + L + T / 2, minZ: r.line - T / 2, maxZ: r.line + T / 2 });
      else G.colliders.push({ minX: r.line - T / 2, maxX: r.line + T / 2, minZ: r.start - T / 2, maxZ: r.start + L + T / 2 });
    };
    const place = (mesh, along, y, out = 0) => {
      if (r.axis === 'x') mesh.position.set(along, y, r.line + out); else mesh.position.set(r.line + out, y, along);
      if (r.axis === 'z') mesh.rotation.y = Math.PI / 2;
    };
    addCollider();
    if (r.style === 'water') {
      // Timber edge beam and bollards; nothing tall, so the river stays visible.
      const beam = new THREE.Mesh(new THREE.BoxGeometry(L + 0.2, 0.22, 0.25), surface('wood', L / 2, 0.2, { color: 0x3a3026 }));
      place(beam, mid, 0.11); beam.castShadow = true; this.group.add(beam);
      for (let k = 1.5; k < L; k += 5) {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.6, 10), new THREE.MeshStandardMaterial({ color: 0x1c1d1e, metalness: 0.6, roughness: 0.5 }));
        place(b, r.start + k, 0.3); this.group.add(b);
      }
      return;
    }
    if (r.style === 'stack') {
      // Two tiers of shipping containers, pushed out into the void side.
      const out = r.voidSide * 1.25;
      let k = 0;
      while (k < L) {
        const len = Math.min(6.1, L - k);
        for (let tier = 0; tier < 2; tier++) {
          if (tier === 1 && Math.random() < 0.18) continue;
          const c = this.container(len, CONTAINER_COLORS[(Math.random() * CONTAINER_COLORS.length) | 0]);
          place(c, r.start + k + len / 2 + (tier ? rand(-0.3, 0.3) : 0), tier * 2.6, out + (tier ? rand(-0.1, 0.1) : 0));
          this.group.add(c);
          G.worldMeshes.push(c);
        }
        k += len;
      }
      return;
    }
    if (r.style === 'fence') {
      const m = new THREE.MeshStandardMaterial({ map: chainLinkTexture().clone(), alphaTest: 0.4, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.5 });
      m.map.repeat.set(L / 0.6, r.h / 0.6); m.map.needsUpdate = true;
      const f = new THREE.Mesh(new THREE.PlaneGeometry(L, r.h), m);
      place(f, mid, r.h / 2); f.userData.seeThrough = true; f.userData.surface = 'metal';
      this.group.add(f); G.worldMeshes.push(f);
      for (let k = 0; k <= L; k += 3) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, r.h, 6), new THREE.MeshStandardMaterial({ color: 0x6a6e70, metalness: 0.7, roughness: 0.4 }));
        place(p, r.start + k, r.h / 2); this.group.add(p);
      }
      return;
    }
    // interior, facade and shed walls are solid boxes
    const kind = r.style === 'interior' ? (r.tex || 'plaster') : r.style === 'shed' ? 'corrugated' : r.tex || 'concrete';
    const m = surface(kind, L / 3, r.h / 3, kind === 'corrugated' ? { color: r.style === 'interior' ? 0x8a8a84 : 0x6f7a80 } : {});
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(L + T, r.h, T), m);
    place(mesh, mid, r.h / 2);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData.surface = kind === 'corrugated' ? 'metal' : 'plaster';
    this.group.add(mesh);
    G.worldMeshes.push(mesh);
  }

  // A shipping container of the given length, lying along +X, base at y = 0.
  container(len = 6.1, color = 0x6a2a22, opts = {}) {
    const m = surface('corrugated', len / 1.5, 1, { color, roughness: 0.6, metalness: 0.3 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(len, 2.59, 2.44), m);
    box.geometry.translate(0, 1.295, 0);
    box.castShadow = !opts.noShadow; box.receiveShadow = true;
    box.userData.surface = 'metal';
    return box;
  }

  buildDoors() {
    const wood = surface('wood', 1, 1, { color: 0x6a6258 });
    for (const d of DOORS) {
      const door = { ...d, kind: d.kind || 'door', open: false, locked: !!d.lock, swing: 0, target: 0, leaves: [] };
      const w = d.w || 2;
      if (door.kind === 'door') {
        const pivot = new THREE.Group();
        const panel = new THREE.Mesh(new THREE.BoxGeometry(w - 0.05, 2.55, 0.08), d.id === 'control' ? surface('metal', 1, 1, { color: 0x5a6a62 }) : wood);
        panel.position.set(w / 2, 1.28, 0);
        panel.castShadow = true; panel.userData.surface = 'wood';
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshStandardMaterial({ color: 0xb59a5a, metalness: 0.8, roughness: 0.3 }));
        knob.position.set(w - 0.15, 1.05, 0.06);
        pivot.add(panel, knob);
        if (d.axis === 'x') pivot.position.set(d.x - w / 2, 0, d.z); else pivot.position.set(d.x, 0, d.z - w / 2);
        pivot.rotation.y = d.axis === 'x' ? 0 : -Math.PI / 2;
        pivot.userData.baseRot = pivot.rotation.y; pivot.userData.side = 1;
        this.group.add(pivot); G.worldMeshes.push(panel);
        door.leaves.push(pivot);
      } else if (door.kind === 'shutter') {
        const tex = mat('corrugated', { repeat: 2.2, repeatY: w / 1.6, color: d.id === 'cargo' ? 0x7a5a2a : 0x6a7278, metalness: 0.4, roughness: 0.5 });
        tex.map = tex.map.clone(); tex.map.rotation = Math.PI / 2; tex.map.needsUpdate = true; // ribs run across the shutter
        const panel = new THREE.Mesh(new THREE.BoxGeometry(w, 2.7, 0.1), tex);
        const holder = new THREE.Group();
        holder.add(panel); panel.position.y = 1.35;
        holder.position.set(d.x, 0, d.z);
        if (d.axis === 'z') holder.rotation.y = Math.PI / 2;
        panel.userData.surface = 'metal';
        this.group.add(holder); G.worldMeshes.push(panel);
        door.panel = panel;
        if (d.id === 'cargo') {
          const stencil = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.5), new THREE.MeshBasicMaterial({ map: labelTexture(['SEALED · BOAT DOCK'], { w: 512, h: 96, size: 48, bg: '#7a5a2a', fg: '#151310' }) }));
          stencil.position.set(0, 1.8, 0.06); holder.add(stencil);
          const back = stencil.clone(); back.rotation.y = Math.PI; back.position.z = -0.06; holder.add(back);
        }
      } else {
        // chain-link gate in a steel frame; slides along the wall when opened
        const holder = new THREE.Group();
        const fm = new THREE.MeshStandardMaterial({ map: chainLinkTexture().clone(), alphaTest: 0.4, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.5 });
        fm.map.repeat.set(w / 0.6, 2.4 / 0.6); fm.map.needsUpdate = true;
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, 2.4), fm);
        mesh.position.y = 1.25; mesh.userData.seeThrough = true; mesh.userData.surface = 'metal';
        const frame = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, 0.06), new THREE.MeshStandardMaterial({ color: 0x5a5e60, metalness: 0.7 }));
        frame.position.y = 2.45; const frame2 = frame.clone(); frame2.position.y = 0.05;
        holder.add(mesh, frame, frame2);
        holder.position.set(d.x, 0, d.z);
        if (d.axis === 'z') holder.rotation.y = Math.PI / 2;
        this.group.add(holder); G.worldMeshes.push(mesh);
        door.panel = holder;
        if (d.lock === 'power') {
          const box = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.15), new THREE.MeshStandardMaterial({ color: 0x3a3e40, metalness: 0.5 }));
          box.position.set(d.x + w / 2 + 0.5, 1.3, d.z + 0.2); this.group.add(box);
          this.gateLamp = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshBasicMaterial({ color: 0xb3261e }));
          this.gateLamp.position.set(d.x + w / 2 + 0.5, 1.42, d.z + 0.29); this.group.add(this.gateLamp);
        }
        if (d.lock === 'code') {
          const pad = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.06), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, emissive: 0x0a2a10 }));
          pad.position.set(d.x - 0.12, 1.3, d.z - 1.2); pad.rotation.y = -Math.PI / 2; this.group.add(pad);
        }
      }
      door.collider = d.axis === 'x'
        ? { minX: d.x - w / 2, maxX: d.x + w / 2, minZ: d.z - 0.1, maxZ: d.z + 0.1, door: true }
        : { minX: d.x - 0.1, maxX: d.x + 0.1, minZ: d.z - w / 2, maxZ: d.z + w / 2, door: true };
      G.colliders.push(door.collider);
      this.doors[d.id] = door;
      const verb = door.kind === 'shutter' ? 'Raise the shutter to' : door.kind === 'gate' ? 'Open the gate to' : 'Open door to';
      this.interacts.push({
        pos: new THREE.Vector3(d.x, 1.2, d.z), radius: 1.5 + w / 4, door,
        label: () => door.locked ? `Examine the ${d.label} ${door.kind === 'door' ? 'door' : door.kind}` : `${verb} ${d.label}`,
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
    let dir = 1;
    if (fromPos) dir = door.axis === 'x' ? Math.sign(fromPos.z - door.z) || 1 : Math.sign(fromPos.x - door.x) || 1;
    door.target = door.kind === 'door' ? (door.axis === 'x' ? dir : -dir) * 1.45 : 1;
    if (!silent) {
      const p = new THREE.Vector3(door.x, 1.5, door.z);
      if (door.kind === 'shutter') G.audio.shutter(p); else if (door.kind === 'gate') G.audio.gate(p); else G.audio.door(p);
    }
  }

  closeDoor(id, lock) {
    const door = this.doors[id];
    if (!door) return;
    door.open = false; door.target = 0; door.collider.enabled = true;
    if (lock) { door.locked = true; door.lock = lock; }
  }

  buildLights() {
    G.scene.add(new THREE.HemisphereLight(0x7a8aa0, 0x14110e, 0.42));
    const moon = new THREE.DirectionalLight(0x8aa0c8, 0.55);
    moon.position.set(-30, 40, 50); moon.target.position.set(0, 0, 10);
    G.scene.add(moon, moon.target);
    for (const R of ROOMS) {
      for (const L of R.lights || []) {
        const y = (R.h || 4) - 0.35;
        const l = new THREE.PointLight(L.color, L.i || 1, R.h > 5 ? 26 : 18, 1.6);
        l.position.set(L.x, y, L.z);
        const fixture = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.12, 16), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: L.color, emissiveIntensity: L.off ? 0 : 2.5 }));
        fixture.position.set(L.x, R.h - 0.08, L.z);
        if (R.h > 5) { // hanging warehouse lamp on a cable
          fixture.position.y = y + 0.25;
          const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, R.h - y - 0.25, 4), new THREE.MeshBasicMaterial({ color: 0x111111 }));
          cable.position.set(L.x, (R.h + y + 0.25) / 2, L.z); this.group.add(cable);
        }
        this.group.add(l, fixture);
        const rec = { room: R, lamp: l, fixture, base: L.i || 1, off: !!L.off };
        if (L.off) { l.visible = false; l.intensity = 9; rec.base = 9; }
        this.lights.push(rec);
        if (L.flick) this.flicker.push(rec);
        if (!R.lamp) { R.lamp = l; R.fixture = fixture; }
      }
    }
    // Sodium floodlights on the yard and the pier. One of the yard lights is dying.
    this.yardFloods = [this.flood(-18, -14, 0xffa860, 34, true), this.flood(20, 6, 0xffb070, 28), this.flood(-12, 8, 0xffa860, 26), this.flood(12.5, -20.6, 0xffb070, 24)];
    this.setYardPower(false);
    this.flood(8, 56, 0xffb070, 22);
    this.flood(-5.4, -31, 0xffa860, 16);
  }

  flood(x, z, color, intensity, flick) {
    const l = new THREE.PointLight(color, intensity, 34, 1.5);
    l.position.set(x, 8.5, z); G.scene.add(l);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 9, 8), new THREE.MeshStandardMaterial({ color: 0x1b1d1f, metalness: 0.6, roughness: 0.5 }));
    pole.position.set(x, 4.5, z); this.group.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.5), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: color, emissiveIntensity: 3 }));
    head.position.set(x, 8.9, z); this.group.add(head);
    G.colliders.push({ minX: x - 0.15, maxX: x + 0.15, minZ: z - 0.15, maxZ: z + 0.15, prop: true });
    const rec = { lamp: l, fixture: head, base: intensity, flood: true };
    if (flick) this.flicker.push(rec);
    return rec;
  }

  // Yard C floods and the crane share the gantry bus with the gate motor.
  setYardPower(on) {
    for (const f of this.yardFloods) { f.lamp.visible = on; f.fixture.material.emissiveIntensity = on ? 3 : 0; }
    if (this.craneLamps) this.craneLamps.forEach(m => m.material.color.set(on ? 0x5fbf6a : 0x331010));
    if (this.gateLamp) this.gateLamp.material.color.set(on ? 0x5fbf6a : 0xb3261e);
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

  // A container prop with collision. alongZ turns it 90 degrees.
  containerProp(x, z, len, color, opts = {}) {
    const c = this.container(len, color);
    c.position.set(x, opts.y || 0, z);
    if (opts.alongZ) c.rotation.y = Math.PI / 2;
    this.group.add(c); G.worldMeshes.push(c);
    if (!opts.y) {
      const hw = (opts.alongZ ? 2.44 : len) / 2, hd = (opts.alongZ ? len : 2.44) / 2;
      const col = { minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd, prop: true };
      G.colliders.push(col); c.userData.collider = col;
    }
    return c;
  }

  sign(x, y, z, rotY, lines, opts = {}) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(opts.w || 1.2, opts.h || 0.5), new THREE.MeshStandardMaterial({ map: labelTexture(lines, { w: 512, h: Math.round(512 * (opts.h || 0.5) / (opts.w || 1.2)), size: opts.size || 40, bg: opts.bg, fg: opts.fg }), roughness: 0.8 }));
    s.position.set(x, y, z); s.rotation.y = rotY; this.group.add(s);
    return s;
  }

  buildProps() {
    const wood = surface('wood', 1, 1);
    const darkWood = surface('wood', 1, 1, { color: 0x6a5040 });
    const metal = surface('metal', 1, 1);
    const paint = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.5 });

    // ---- North Pier ----
    this.containerProp(-6.5, 57, 6.1, 0x2a4a5a);
    this.containerProp(-6.5, 57, 6.1, 0x6a2a22, { y: 2.6 });
    this.containerProp(7, 52, 6.1, 0x3a5a32, { alongZ: true });
    this.box(-4, 44, 1.2, 1.2, 1.0, darkWood);                                  // pallets of rope
    this.box(5.5, 43.5, 2.4, 1.4, 1.6, paint(0x8a6a1a), { surface: 'metal' });   // forklift body
    this.box(5.5, 44.6, 2.0, 0.2, 2.6, paint(0x222222), { surface: 'metal', solid: false }); // mast
    for (const [x, z] of [[-9.4, 59], [9.4, 59], [9.4, 47], [-9.4, 50]]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.5, 12), paint(0x1a1a1a)); b.position.set(x, 0.25, z); this.group.add(b);
    }

    // ---- Dock Office (safe room) ----
    this.box(-16, 51.5, 3.2, 1.1, 0.78, wood);                 // manifest desk
    this.box(-20.6, 47, 1.1, 2.6, 0.78, wood);                 // CCTV desk
    this.monitor = this.box(-20.7, 47.4, 0.3, 0.55, 0.42, paint(0x111111), { y: 0.78, solid: false, surface: 'metal' });
    this.monitorScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.34), new THREE.MeshBasicMaterial({ color: 0x223322 }));
    this.monitorScreen.position.set(-20.54, 0.99, 47.4); this.monitorScreen.rotation.y = Math.PI / 2; this.group.add(this.monitorScreen);
    this.box(-21.6, 43.2, 0.7, 1.4, 2.0, surface('metal', 1, 1, { color: 0x4a5a5a }), { surface: 'metal' }); // supply locker
    this.box(-11.5, 53.3, 1.6, 0.6, 1.9, metal, { surface: 'metal' }); // filing cabinet
    this.sign(-16, 2.1, 53.84, Math.PI, ['HALVERN PORT AUTHORITY', 'NIGHT DESK'], { w: 2.2, h: 0.6, size: 46 });

    // ---- Warehouse 3: tall racking makes the aisles for sneaking ----
    const rack = surface('metal', 1, 2, { color: 0x3a4a6a });
    for (const x of [-6, -1, 4, 9]) {
      for (const [z0, z1] of [[17, 25], [28, 36]]) {
        const len = z1 - z0, zc = (z0 + z1) / 2;
        this.box(x, zc, 1.1, len, 4.2, rack, { surface: 'metal', shadow: true });
        for (let k = 0; k < 3; k++) {
          for (let s = 0; s < len - 1; s += 2.2) {
            if (Math.random() < 0.25) continue;
            this.box(x, z0 + 0.8 + s, 1.0, 1.6, 0.9, surface('wood', 1, 1, { color: [0x8a7050, 0x6a5440, 0x7a6a5a][(k + s) % 3] }), { y: 0.3 + k * 1.3, solid: false, shadow: false });
          }
        }
      }
    }
    this.box(12, 37.5, 3, 1.5, 1.2, darkWood);   // pallets by the break room door
    this.box(-8.5, 15.5, 2.4, 1.8, 1.4, paint(0x3a3a3a), { surface: 'metal' }); // generator
    this.containerProp(-5, 37.6, 6.1, 0x7a3a1a);

    // ---- Break Room ----
    this.box(19, 34, 2.4, 1.2, 0.76, wood);
    this.box(23.5, 37, 0.8, 1.0, 1.9, paint(0x8a1a1a), { surface: 'metal' }); // vending machine
    this.box(15.6, 39.5, 2.6, 0.5, 0.9, surface('metal', 1, 1, { color: 0x6a7a80 }), { surface: 'metal' }); // counter
    this.box(23.6, 30, 0.5, 3, 1.9, surface('metal', 2, 1, { color: 0x5a6a70 }), { surface: 'metal' }); // lockers
    this.rotaBoard = this.sign(23.73, 1.6, 34, -Math.PI / 2, ['SHIFT ROTA', 'DAY 06-14  CRANE 1  ABEL', 'SWING 14-22  CRANE 2  SULLY', 'NIGHT 22-06  CRANE 3  DMITRI'], { w: 1.6, h: 1.0, size: 34, bg: '#e2dccb' });

    // ---- Customs Cage ----
    this.box(19.5, 18, 2.6, 1.2, 0.85, metal, { surface: 'metal' });  // inspection table with the team case
    this.box(23.4, 24, 1, 4, 2.2, rack, { surface: 'metal' });
    this.sign(14.2, 2.4, 24, Math.PI / 2, ['CUSTOMS HOLD', 'AUTHORISED ONLY'], { w: 1.4, h: 0.5, size: 40, bg: '#d8c890' });

    // ---- Crane Control House ----
    this.box(-17, 15.5, 6, 1.0, 1.0, surface('metal', 2, 1, { color: 0x4a5a52 }), { surface: 'metal' }); // console under the yard window
    this.box(-23.4, 22, 0.7, 3, 2.2, surface('metal', 1, 1, { color: 0x3a4a42 }), { surface: 'metal' }); // relay cabinets
    this.yardWindow = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.1), new THREE.MeshStandardMaterial({ color: 0x0b1418, roughness: 0.05, metalness: 0.8, transparent: true, opacity: 0.55 }));
    this.yardWindow.position.set(-17, 1.9, 14.17); this.group.add(this.yardWindow);
    this.sign(-23.83, 1.7, 18, Math.PI / 2, ['IF THE MAIN TRIPS:', 'LET IT SIT 30 SECONDS.', 'THEN AGAIN, IN ORDER.', '  · SULLY'], { w: 1.5, h: 0.75, size: 30, bg: '#e2dccb' });
    this.sign(-23.83, 2.6, 21.5, Math.PI / 2, ['22:41'], { w: 0.6, h: 0.25, size: 70, bg: '#151515', fg: '#ff5a3a' }); // wall clock
    // the gantry supply panel: fuse carrier and three crane switches
    this.cranePanel = this.box(-23.75, 19.8, 0.2, 1.1, 0.9, surface('metal', 1, 1, { color: 0x6a7a70 }), { y: 1.0, surface: 'metal', solid: false });
    this.craneLamps = [0, 1, 2].map(k => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0x331010 })); m.position.set(-23.62, 1.65, 19.45 + k * 0.35); this.group.add(m); return m; });

    // ---- Container Yard: lanes of containers make the arena ----
    const yardStacks = [
      [-17, 8, 6.1, false, 2], [-17, 0, 12.2, false, 1], [-9, -14, 6.1, true, 2], [11, 7, 6.1, false, 1],
      [19, -2, 6.1, true, 2], [-20, -17, 6.1, false, 1], [8, -18, 6.1, false, 2], [-4, 6, 6.1, false, 1],
    ];
    for (const [x, z, len, alongZ, tiers] of yardStacks) {
      for (let t = 0; t < tiers; t++) this.containerProp(x, z, len, CONTAINER_COLORS[(Math.random() * 7) | 0], { alongZ, y: t * 2.6 });
    }
    // The opened Vigor container, VGR-7718. Its doors hang open; mist still pools at the mouth.
    this.vigor = this.containerProp(-13, -7, 6.1, 0xd9d6ce, { alongZ: false });
    this.vigor.material = surface('corrugated', 4, 1, { color: 0xcfcbc0, roughness: 0.5, metalness: 0.3 });
    this.sign(-13, 1.7, -5.76, 0, ['VIGOR BIOTECH', 'VGR-7718 · MEDICAL SUPPLIES'], { w: 2.6, h: 0.6, size: 44, bg: '#d8d4c8', fg: '#2a3a5a' });
    this.vigorDoors = [];
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.5, 0.06), surface('corrugated', 1, 1, { color: 0xbdb9ae }));
      leaf.position.set(s * 0.6, 1.3, 0); pivot.add(leaf);
      pivot.position.set(-9.95, 0, -7 + s * 1.2); pivot.rotation.y = Math.PI / 2;
      pivot.userData.side = s;
      this.group.add(pivot); this.vigorDoors.push(pivot);
    }
    this.setVigorOpen(1);
    // Chain-link panel Dan Kelso tore loose on the tape, still lying where it fell.
    const fm = new THREE.MeshStandardMaterial({ map: chainLinkTexture().clone(), alphaTest: 0.4, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.5 });
    fm.map.repeat.set(3 / 0.6, 2.2 / 0.6); fm.map.needsUpdate = true;
    this.tornGate = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.2), fm);
    this.tornGate.userData.seeThrough = true;
    this.group.add(this.tornGate);
    this.setTornGate(true);
    for (const x of [-6.6, -3.4]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), paint(0x6a6e70)); p.position.set(x, 1.2, -1.5); this.group.add(p); }
    // CAM 11: the security camera that recorded the tape, on a pole above Stack 4
    this.box(-3.6, 2.0, 0.2, 0.2, 5.9, paint(0x3a3e40), { surface: 'metal' });
    const camArm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.9), paint(0x3a3e40)); camArm.position.set(-3.55, 5.85, 1.6); this.group.add(camArm);
    const camBody = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.45), paint(0xd8d4c8)); camBody.position.set(-3.5, 5.7, 1.2); camBody.rotation.set(-0.5, -0.6, 0); this.group.add(camBody);
    const camLed = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff2a1a })); camLed.position.set(-3.6, 5.62, 0.98); this.group.add(camLed);
    // Hookman's shed: a corrugated lean-to with a roller shutter facing the yard.
    const shedMat = surface('corrugated', 2, 1, { color: 0x5a6266 });
    this.box(17.5, -12.5, 5, 0.3, 3.4, shedMat, { surface: 'metal' });
    this.box(17.5, -17.5, 5, 0.3, 3.4, shedMat, { surface: 'metal' });
    this.box(20, -15, 0.3, 5, 3.4, shedMat, { surface: 'metal' });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.15, 5.4), shedMat); roof.position.set(17.5, 3.45, -15); this.group.add(roof);
    this.shedShutter = this.box(15.1, -15, 0.12, 4.7, 3.0, surface('corrugated', 1, 2, { color: 0x6a7278 }), { surface: 'metal' });
    this.shedLintel = this.box(15.1, -15, 0.3, 4.9, 0.4, shedMat, { y: 3.0, solid: false });
    // The gantry crane over the yard, with two containers hung over hazard-striped drop zones.
    this.buildCrane();
    // Cargo shutter shed wall face and lights
    this.sign(0, 4.0, -21.82, 0, ['CARGO SHUTTER 2', 'BOAT DOCK'], { w: 2.4, h: 0.6, size: 46, bg: '#2a2d30', fg: '#d8c890' });

    // ---- Boat Dock ----
    this.boat = this.makeBoat(0x3a4a52);
    this.boat.position.set(0, -0.25, -36.2); this.boat.rotation.y = 0;
    this.group.add(this.boat);
    this.box(-4.6, -27, 1.2, 1.2, 0.9, darkWood);
    this.box(4.4, -30, 1.4, 1.0, 1.1, paint(0x2a3a2a), { surface: 'metal' });

    // ---- set dressing: blood, paper and puddles ----
    const blood = (x, z, s) => {
      const m = new THREE.Mesh(new THREE.CircleGeometry(s, 12), new THREE.MeshStandardMaterial({ color: 0x2a0503, roughness: 0.25, transparent: true, opacity: 0.85 }));
      m.rotation.x = -Math.PI / 2; m.position.set(x, 0.012 + Math.random() * 0.002, z); this.group.add(m);
    };
    // Pruitt's blood trail from the crushed radio toward the warehouse
    for (let k = 0; k < 13; k++) blood(3.0 - k * 1.0 + rand(-0.2, 0.2), 50.0 - k * 0.15 + rand(-0.2, 0.2), rand(0.12, 0.3));
    for (let k = 0; k < 20; k++) {
      const R = ROOMS[(Math.random() * ROOMS.length) | 0];
      blood(rand(R.x0 + 1, R.x1 - 1), rand(R.z0 + 1, R.z1 - 1), rand(0.2, 0.8));
    }
    for (let k = 0; k < 30; k++) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.22), new THREE.MeshStandardMaterial({ color: 0xcfc8b4, roughness: 0.9 }));
      p.rotation.x = -Math.PI / 2; p.rotation.z = Math.random() * 3;
      const R = ROOMS[[1, 2, 3, 5][(Math.random() * 4) | 0]];
      p.position.set(rand(R.x0 + 1, R.x1 - 1), 0.012, rand(R.z0 + 1, R.z1 - 1));
      this.group.add(p);
    }
  }

  // The Hookman tears the shed's roller shutter off its runners.
  setShedOpen(open) {
    const m = this.shedShutter;
    m.visible = !open; m.userData.collider.enabled = !open;
    if (open) { m.position.set(13.2, 0.08, -15.6); m.rotation.set(0, 0.3, Math.PI / 2 - 0.05); m.visible = true; }
    else { m.position.set(15.1, 1.5, -15); m.rotation.set(0, 0, 0); }
    this.refreshBlocked();
  }

  // Put the crane loads back the way a save recorded them ('hung' or 'down').
  setDrops(states) {
    this.drops.forEach((d, k) => {
      const down = states[k] !== 'hung';
      d.state = down ? 'down' : 'hung'; d.v = 0; d.y = down ? 0 : 5.6;
      d.box.position.y = d.y;
      if (d.col) d.col.enabled = down;
      else if (down) { d.col = { minX: d.x - 1.22, maxX: d.x + 1.22, minZ: d.z - 3.05, maxZ: d.z + 3.05, prop: true }; G.colliders.push(d.col); }
      const i = G.worldMeshes.indexOf(d.box);
      if (down && i < 0) G.worldMeshes.push(d.box); else if (!down && i >= 0) G.worldMeshes.splice(i, 1);
      this.setCable(d);
    });
    this.leverBulbs?.forEach((b, k) => b.material.color.set(k < this.drops.filter(d => d.state === 'hung').length ? 0xffc040 : 0x2a2010));
    this.refreshBlocked();
  }

  setVigorOpen(k) {
    for (const p of this.vigorDoors) p.rotation.y = Math.PI / 2 + p.userData.side * -1.9 * k;
  }

  // standing = the gate panel upright between its posts (on the tape); otherwise torn down
  setTornGate(down) {
    const g = this.tornGate;
    if (down) { g.position.set(-5.6, 0.04, -3.4); g.rotation.set(-Math.PI / 2, 0, 0.5); }
    else { g.position.set(-5, 1.15, -1.5); g.rotation.set(0, 0, 0); }
  }

  buildCrane() {
    const steel = new THREE.MeshStandardMaterial({ color: 0x8a6a1a, roughness: 0.55, metalness: 0.5 });
    const legs = [[-7, -9], [-7, -3], [11, -9], [11, -3]];
    this.craneLegs = legs.map(([x, z]) => this.box(x, z, 0.6, 0.6, 10, steel, { surface: 'metal' }));
    for (const x of [-7, 11]) { const beam = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 6.6), steel); beam.position.set(x, 10, -6); this.group.add(beam); }
    for (const z of [-9, -3]) { const beam = new THREE.Mesh(new THREE.BoxGeometry(18.6, 0.9, 0.6), steel); beam.position.set(2, 10.2, z); this.group.add(beam); }
    this.sign(11, 3, -2.68, 0, ['CRANE 3'], { w: 1.2, h: 0.4, size: 60, bg: '#151515', fg: '#c9a227' });
    this.drops = [];
    for (const x of [-1, 6]) {
      const zone = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.0, 32), new THREE.MeshStandardMaterial({ map: surfaceMap('hazard'), roughness: 0.7 }));
      zone.rotation.x = -Math.PI / 2; zone.position.set(x, 0.015, -6); this.group.add(zone);
      const trolley = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 6.4), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.6 }));
      trolley.position.set(x, 9.5, -6); this.group.add(trolley);
      const box = this.container(6.1, x < 0 ? 0x6a2a22 : 0x2a4a5a, { noShadow: true });
      box.rotation.y = Math.PI / 2;
      box.position.set(x, 5.6, -6); this.group.add(box);
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 4), new THREE.MeshBasicMaterial({ color: 0x111111 }));
      this.group.add(cable);
      const drop = { x, z: -6, box, cable, trolley, state: 'hung', y: 5.6, v: 0 };
      this.setCable(drop);
      this.drops.push(drop);
    }
    // The emergency release lever at the east leg
    this.leverBase = this.box(11.9, -6, 0.5, 0.5, 1.1, new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.6 }), { surface: 'metal' });
    this.lever = new THREE.Group();
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6), new THREE.MeshStandardMaterial({ color: 0xb3261e }));
    arm.position.y = 0.35; this.lever.add(arm);
    this.lever.position.set(11.9, 1.1, -6); this.lever.rotation.z = 0.6;
    this.group.add(this.lever);
    this.sign(11.64, 0.75, -6, -Math.PI / 2, ['EMERGENCY', 'LOAD RELEASE'], { w: 0.5, h: 0.25, size: 46, bg: '#c9a227', fg: '#151515' });
    // two indicator bulbs: one goes out per release
    this.leverBulbs = [0, 1].map(k => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffc040 })); b.position.set(11.62, 1.0, -6.12 + k * 0.24); this.group.add(b); return b; });
  }

  setCable(d) {
    const top = 9.2, bot = d.y + 2.59;
    const len = Math.max(0.05, top - bot);
    d.cable.scale.y = len; d.cable.position.set(d.x, bot + len / 2, d.z);
    d.cable.visible = d.state === 'hung';
  }

  makeBoat(color) {
    const g = new THREE.Group();
    const shape = new THREE.Shape();
    shape.moveTo(-1.2, -3); shape.lineTo(1.2, -3); shape.lineTo(1.25, 2); shape.quadraticCurveTo(0.9, 3.4, 0, 3.9); shape.quadraticCurveTo(-0.9, 3.4, -1.25, 2); shape.closePath();
    const hull = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 1.1, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.3 }));
    hull.rotation.x = -Math.PI / 2; hull.position.y = -0.3; g.add(hull);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, 5.6), surface('planks', 1, 2));
    deck.position.set(0, 0.62, 0.1); g.add(deck);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.3, 1.6), new THREE.MeshStandardMaterial({ color: 0xc8c4b8, roughness: 0.6 }));
    cabin.position.set(0, 1.3, -0.6); g.add(cabin);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.5), new THREE.MeshStandardMaterial({ color: 0x0a1418, roughness: 0.05, metalness: 0.8 }));
    glass.position.set(0, 1.55, 0.21); g.add(glass);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3a2a }));
    lamp.position.set(0, 2.05, -0.6); g.add(lamp);
    g.traverse(c => { if (c.isMesh) c.castShadow = true; });
    return g;
  }

  // Release the next hanging container. Returns the drop or null.
  releaseContainer(pref) {
    const hung = this.drops.filter(d => d.state === 'hung');
    if (!hung.length) return null;
    const d = pref && hung.includes(pref) ? pref : hung[0];
    d.state = 'falling'; d.v = 0;
    this.setCable(d);
    return d;
  }

  updateDrops(dt) {
    for (const d of this.drops) {
      if (d.state !== 'falling') continue;
      d.v += 22 * dt; d.y -= d.v * dt;
      if (d.y <= 0) {
        d.y = 0; d.state = 'down';
        if (!d.col) { d.col = { minX: d.x - 1.22, maxX: d.x + 1.22, minZ: d.z - 3.05, maxZ: d.z + 3.05, prop: true }; G.colliders.push(d.col); }
        d.col.enabled = true; this.rasterize(d.col);
        G.worldMeshes.push(d.box);
        d.onLand?.(d);
      }
      d.box.position.y = d.y;
    }
  }

  buildRain() {
    const N = 2600, pos = new Float32Array(N * 6);
    for (let k = 0; k < N; k++) {
      const x = rand(-18, 18), y = rand(0, 12), z = rand(-18, 18);
      pos.set([x, y, z, x + 0.02, y - 0.45, z + 0.04], k * 6);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x9fb0c4, transparent: true, opacity: 0.2 }));
    this.rain.frustumCulled = false;
    G.scene.add(this.rain);
  }

  rasterize(c) {
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const x = GX0 + i + 0.5, z = GZ0 + j + 0.5;
      if (x > c.minX - 0.35 && x < c.maxX + 0.35 && z > c.minZ - 0.35 && z < c.maxZ + 0.35) this.blocked[this.idx(i, j)] = 1;
    }
  }

  rasterizeProps() {
    for (const c of G.colliders) if (c.prop && c.enabled !== false) this.rasterize(c);
  }

  // Rebuild the walkable grid after a prop moved or disappeared.
  refreshBlocked() { this.blocked.fill(0); this.rasterizeProps(); }

  // ----- pathfinding (A* on the 1 m grid) -----
  passable(i, j, ni, nj) {
    if (ni < 0 || nj < 0 || ni >= GW || nj >= GH) return false;
    const a = this.cells[this.idx(i, j)], b = this.cells[this.idx(ni, nj)];
    if (b < 0) return false;
    if (this.blocked[this.idx(ni, nj)] === 1) return false;
    if (a === b) return true;
    let key;
    if (ni === i) key = `h:${i}:${Math.max(j, nj)}`;
    else if (nj === j) key = `v:${Math.max(i, ni)}:${j}`;
    else return false;
    const id = this.doorEdges.get(key);
    return !!id && this.doors[id].open;
  }

  findPath(from, to, maxNodes = 3000) {
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
        if (di && dj) {
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
    for (const R of this.flicker) {
      if (!R.lamp.visible) continue;
      const f = Math.random() < (R.flood ? 0.06 : 0.04) ? 0.1 : 1 - Math.random() * 0.08;
      R.lamp.intensity = R.base * f;
      R.fixture.material.emissiveIntensity = (R.flood ? 3 : 2.5) * f;
    }
    // Rain falls in a box that follows the camera, shown only outdoors.
    const cam = G.camera.position;
    const outdoorView = G.mode === 'cine' ? !this.roomAt(cam.x, cam.z) || this.roomAt(cam.x, cam.z).outdoor : !!this.roomAt(G.player.pos.x, G.player.pos.z)?.outdoor;
    this.rain.visible = outdoorView;
    if (outdoorView) {
      this.rain.position.set(Math.round(cam.x), 0, Math.round(cam.z));
      const p = this.rain.geometry.attributes.position.array;
      const fall = 16 * dt;
      for (let k = 0; k < p.length; k += 6) {
        p[k + 1] -= fall; p[k + 4] -= fall;
        if (p[k + 4] < 0) { const y = 12 + Math.random() * 2; p[k + 1] = y; p[k + 4] = y - 0.45; }
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
    }
    // Doors swing, shutters roll up, gates slide aside.
    for (const d of Object.values(this.doors)) {
      d.swing += (d.target - d.swing) * Math.min(1, dt * (d.kind === 'door' ? 5 : 2.2));
      if (d.kind === 'door') for (const leaf of d.leaves) leaf.rotation.y = leaf.userData.baseRot + d.swing * leaf.userData.side;
      else if (d.kind === 'shutter') { d.panel.position.y = 1.35 + d.swing * 1.3; d.panel.scale.y = 1 - d.swing * 0.85; }
      else d.panel.position[d.axis === 'x' ? 'x' : 'z'] = (d.axis === 'x' ? d.x : d.z) + d.swing * (d.w || 2) * 0.95;
    }
    this.updateDrops(dt);
    if (this.boatBob !== false) this.boat.position.y = -0.25 + Math.sin(G.time * 1.3) * 0.05;
  }
}

function surfaceMap(kind) {
  return mat(kind, { repeat: 3, repeatY: 0.4 }).map;
}
