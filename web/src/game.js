// Shared game context. Every system reads and writes through G so modules
// stay decoupled from each other's construction order.
import * as THREE from 'three';

export const G = {
  scene: null,
  camera: null,
  renderer: null,
  composer: null,
  fx: null,            // post-processing uniforms
  level: null,
  player: null,
  weapons: null,
  enemies: [],
  boss: null,
  items: null,
  story: null,
  ui: null,
  audio: null,
  time: 0,
  mode: 'title',       // title | play | cine | modal | dead | end | pause
  input: null,
  flags: {},
  stats: { kills: 0, shots: 0, hits: 0, startTime: 0, saves: 0, crates: 0 },
  worldMeshes: [],     // static meshes bullets and sight lines can hit
  hitMeshes: [],       // enemy body parts
  colliders: [],       // {minX,maxX,minZ,maxZ, ref?, enabled?}
  updaters: new Set(), // short-lived effects with update(dt) -> bool alive
};

export const V3 = THREE.Vector3;
export const tmpV = new THREE.Vector3();
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export function angleDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
export const dist2D = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// Push a circle (x,z,r) out of every enabled collider. Returns true if it touched any.
export function resolveCircle(pos, r, ignore) {
  let hit = false;
  for (const c of G.colliders) {
    if (c.enabled === false || c === ignore) continue;
    const cx = clamp(pos.x, c.minX, c.maxX);
    const cz = clamp(pos.z, c.minZ, c.maxZ);
    const dx = pos.x - cx, dz = pos.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      hit = true;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        pos.x += (dx / d) * (r - d);
        pos.z += (dz / d) * (r - d);
      } else {
        // centre inside the box: push out along the shallowest axis
        const pl = pos.x - c.minX, pr = c.maxX - pos.x, pb = pos.z - c.minZ, pf = c.maxZ - pos.z;
        const m = Math.min(pl, pr, pb, pf);
        if (m === pl) pos.x = c.minX - r; else if (m === pr) pos.x = c.maxX + r;
        else if (m === pb) pos.z = c.minZ - r; else pos.z = c.maxZ + r;
      }
    }
  }
  return hit;
}

const ray = new THREE.Raycaster();
// True if nothing in the world blocks the segment a -> b.
export function lineOfSight(a, b) {
  const dir = tmpV.copy(b).sub(a);
  const len = dir.length();
  if (len < 0.01) return true;
  ray.set(a, dir.normalize());
  ray.far = len;
  const hits = ray.intersectObjects(G.worldMeshes, false);
  for (const h of hits) if (h.object.visible && !h.object.userData.seeThrough) return false;
  return true;
}

// Sound that enemies can hear. radius in metres.
export function makeNoise(pos, radius, kind = 'step') {
  for (const e of G.enemies) e.hear?.(pos, radius, kind);
}

export function addUpdater(fn) { G.updaters.add(fn); }
