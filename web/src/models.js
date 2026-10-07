// Real 3D characters. Drop a rigged .glb (or .fbx) into web/models/ and name it
// in web/models/models.json, for example { "leon": "leon.glb", "husk": ["husk_a.glb", "husk_b.glb"] }.
// The game keeps animating its own jointed stand-in body (humanoid.js). Each
// frame, the real model's skeleton copies the stand-in's joint rotations, so
// every existing pose, walk cycle and cutscene works with any model that has a
// Mixamo, Unreal Mannequin or MetaHuman style skeleton. The stand-in stays as an
// invisible hit box, so head shots and limb hits still work the same way.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

// stand-in joint -> bone names to look for (lower case, letters and digits only)
const MAP = [
  ['hips', h => h.hips, ['hips', 'pelvis']],
  ['spine', h => h.spine, ['spine', 'spine01']],
  ['neck', h => h.neck, ['neck', 'neck01']],
  ['head', h => h.head, ['head']],
  ['armL', h => h.armL.sh, ['leftarm', 'upperarml']],
  ['foreL', h => h.armL.elbow, ['leftforearm', 'lowerarml']],
  ['armR', h => h.armR.sh, ['rightarm', 'upperarmr']],
  ['foreR', h => h.armR.elbow, ['rightforearm', 'lowerarmr']],
  ['thighL', h => h.legL.hip, ['leftupleg', 'thighl']],
  ['calfL', h => h.legL.knee, ['leftleg', 'calfl']],
  ['thighR', h => h.legR.hip, ['rightupleg', 'thighr']],
  ['calfR', h => h.legR.knee, ['rightleg', 'calfr']],
];
// which way each stand-in joint points at rest, in the body's own space
const UP = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0);
const REST_DIR = { spine: UP, neck: UP, armL: DOWN, foreL: DOWN, armR: DOWN, foreR: DOWN, thighL: DOWN, calfL: DOWN, thighR: DOWN, calfR: DOWN };
// the bone a joint points toward, used to measure the model's rest direction
const CHILD = { spine: ['neck', 'neck01'], neck: ['head'], armL: ['leftforearm', 'lowerarml'], foreL: ['lefthand', 'handl'], armR: ['rightforearm', 'lowerarmr'], foreR: ['righthand', 'handr'], thighL: ['leftleg', 'calfl'], calfL: ['leftfoot', 'footl'], thighR: ['rightleg', 'calfr'], calfR: ['rightfoot', 'footr'] };

const norm = (s) => s.toLowerCase().replace(/^mixamorig\d*[:_]?/, '').replace(/[^a-z0-9]/g, '');
const HEIGHT = 1.8; // stand-in height in metres before its own scale

let manifest = {};
const cache = {};     // file -> Promise<prepared template>
const bound = new Set();
const ghost = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });

// Read web/models/models.json. A missing file just means: no real models yet.
export async function loadModelList() {
  try {
    const r = await fetch('models/models.json', { cache: 'no-cache' });
    if (r.ok) manifest = await r.json();
  } catch { manifest = {}; }
  return manifest;
}

export function hasModel(role) { return !!(role && manifest[role]); }

function template(file) {
  if (!cache[file]) {
    const url = 'models/' + file;
    cache[file] = new Promise((resolve, reject) => {
      const done = (root) => resolve(root);
      if (/\.fbx$/i.test(file)) new FBXLoader().load(url, done, undefined, reject);
      else new GLTFLoader().load(url, (g) => done(g.scene), undefined, reject);
    });
  }
  return cache[file];
}

// Give a stand-in body a real model, if models.json has one for this role.
export function attachModel(h, role) {
  let file = manifest[role] ?? manifest[role.split('_')[0]]; // husk_big falls back to husk
  if (!file) return;
  if (Array.isArray(file)) file = file[(Math.random() * file.length) | 0];
  template(file).then((tpl) => bind(h, cloneSkinned(tpl))).catch((e) => console.warn('model', file, e));
}

function bind(h, model) {
  // fit the model to the stand-in: feet on the ground, same height
  h.body.add(model);
  h.root.updateMatrixWorld(true);
  const box = bodyBox(h, model);
  const height = box.max.y - box.min.y || 1;
  const s = HEIGHT / height;
  model.scale.multiplyScalar(s);
  model.position.y -= box.min.y * s;
  model.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; c.frustumCulled = false; } });
  h.root.updateMatrixWorld(true);

  const bones = {};
  model.traverse((c) => { if (c.isBone) { const n = norm(c.name); if (!bones[n]) bones[n] = c; } });
  const find = (names) => names.map((n) => bones[n]).find(Boolean);
  const bodyInv = h.body.getWorldQuaternion(new THREE.Quaternion()).invert();
  const bodyInvM = new THREE.Matrix4().copy(h.body.matrixWorld).invert();
  const links = [];
  for (const [key, joint, names] of MAP) {
    const bone = find(names);
    if (!bone) continue;
    const bind = bodyInv.clone().multiply(bone.getWorldQuaternion(new THREE.Quaternion()));
    const align = new THREE.Quaternion();
    const child = CHILD[key] && find(CHILD[key]);
    if (REST_DIR[key] && child) {
      const a = bone.getWorldPosition(new THREE.Vector3()).applyMatrix4(bodyInvM);
      const b = child.getWorldPosition(new THREE.Vector3()).applyMatrix4(bodyInvM);
      const dir = b.sub(a).normalize();
      if (dir.lengthSq() > 0.5) align.setFromUnitVectors(dir, REST_DIR[key]);
    }
    links.push({ key, joint: joint(h), bone, rest: align.multiply(bind), depth: depth(bone) });
  }
  if (links.length < 6) { // not a skeleton we can drive: leave the stand-in as it is
    console.warn('model skeleton not recognised; bones found:', links.map((l) => l.key).join(', '));
    h.body.remove(model);
    return;
  }
  links.sort((a, b) => a.depth - b.depth); // parents before children
  const hips = links.find((l) => l.key === 'hips');
  const rec = { h, model, links, hipsBindPos: hips ? hips.bone.getWorldPosition(new THREE.Vector3()).applyMatrix4(bodyInvM) : null, hipsLink: hips };
  // hide the stand-in but keep it as the hit box
  rec.materials = h.meshes.map((m) => m.material);
  for (const m of h.meshes) { m.material = ghost; m.castShadow = false; }
  h.model = model;
  bound.add(rec);
}

// The model's bounding box in the stand-in body's space, measured on the posed (skinned) mesh.
function bodyBox(h, model) {
  const inv = new THREE.Matrix4().copy(h.body.matrixWorld).invert(), box = new THREE.Box3(), b = new THREE.Box3();
  model.traverse((c) => {
    if (!c.isMesh) return;
    if (c.isSkinnedMesh) c.computeBoundingBox(); else if (!c.geometry.boundingBox) c.geometry.computeBoundingBox();
    b.copy(c.isSkinnedMesh ? c.boundingBox : c.geometry.boundingBox).applyMatrix4(c.matrixWorld).applyMatrix4(inv);
    box.union(b);
  });
  return box;
}

function depth(o) { let d = 0; while (o.parent) { d++; o = o.parent; } return d; }

const q = new THREE.Quaternion(), qp = new THREE.Quaternion(), bodyInv = new THREE.Quaternion(), v = new THREE.Vector3();

// Copy every stand-in's pose onto its real model. Called once per frame, before rendering.
export function syncModels() {
  for (const rec of bound) {
    const { h, links } = rec;
    if (!h.root.parent || !h.root.visible) continue;
    h.body.updateWorldMatrix(true, false);
    h.body.getWorldQuaternion(bodyInv).invert();
    // a Husk that lost its head: the stand-in head flies off, so show it and hide the model's
    const headless = h.head.parent !== h.neck;
    if (headless && !rec.headless) {
      rec.headless = true;
      h.meshes.forEach((m, i) => { if (m.userData.part === 'head') { m.material = rec.materials[i]; m.castShadow = true; } });
      links.find((l) => l.key === 'head')?.bone.scale.setScalar(0.001);
    }
    for (const l of links) {
      if (headless && (l.key === 'head' || l.key === 'neck')) continue;
      // stand-in joint rotation relative to the body, applied on top of the model's aligned rest pose
      l.joint.getWorldQuaternion(q); q.premultiply(bodyInv).multiply(l.rest);
      l.bone.parent.getWorldQuaternion(qp); qp.premultiply(bodyInv).invert();
      l.bone.quaternion.copy(qp.multiply(q));
      if (l === rec.hipsLink && rec.hipsBindPos) {
        v.set(h.hips.position.x, h.hips.position.y - h.hipsBase, h.hips.position.z).add(rec.hipsBindPos);
        h.body.localToWorld(v); l.bone.parent.worldToLocal(v);
        l.bone.position.copy(v);
      }
      l.bone.updateMatrixWorld(true);
    }
  }
}
