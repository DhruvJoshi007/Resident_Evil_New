// Jointed stand-in body shared by Leon, the infected and the Hookman.
// The model faces +Z. Limbs hang along -Y from their joint groups, so a
// negative X rotation swings a limb forward.
import * as THREE from 'three';
import { tex } from './textures.js';
import { attachModel } from './models.js';

function m(kind, color, rough = 0.85) {
  return new THREE.MeshStandardMaterial({ map: tex(kind, 1), color, roughness: rough, bumpMap: tex(kind, 1), bumpScale: 0.4 });
}

function limb(parent, len, r, material, part, y = 0) {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), material);
  mesh.position.y = y - len / 2 - r * 0.3;
  mesh.castShadow = true;
  mesh.userData.part = part;
  parent.add(mesh);
  return mesh;
}

export function buildHumanoid(o = {}) {
  const skin = m(o.zombie ? 'rot' : 'skin', o.skin ?? 0xc89e84, 0.7);
  const top = m('cloth', o.top ?? 0x444444);
  const bottom = m('cloth', o.bottom ?? 0x2b2b2b);
  const boots = new THREE.MeshStandardMaterial({ color: 0x18140f, roughness: 0.6 });
  const h = { meshes: [] };
  const root = h.root = new THREE.Group();
  root.rotation.order = 'YXZ';
  const body = h.body = new THREE.Group(); // scaled container
  body.scale.setScalar(o.scale ?? 1);
  root.add(body);
  const hips = h.hips = new THREE.Group(); hips.position.y = 0.95; body.add(hips);
  h.hipsBase = 0.95;
  const pelvis = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.12, 4, 10), bottom);
  pelvis.rotation.z = Math.PI / 2; pelvis.castShadow = true; pelvis.userData.part = 'legs';
  hips.add(pelvis);

  const spine = h.spine = new THREE.Group(); spine.position.y = 0.06; hips.add(spine);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.34, 6, 12), top);
  torso.position.y = 0.3; torso.scale.set(1.15, 1, 0.78); torso.castShadow = true; torso.userData.part = 'torso';
  spine.add(torso);
  if (o.vest) {
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 0.3), new THREE.MeshStandardMaterial({ color: o.vest, roughness: 0.7 }));
    vest.position.y = 0.33; vest.castShadow = true; vest.userData.part = 'torso'; spine.add(vest);
  }

  const neck = h.neck = new THREE.Group(); neck.position.y = 0.6; spine.add(neck);
  const head = h.head = new THREE.Group(); neck.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.115, 18, 14), skin);
  skull.scale.set(0.9, 1.08, 1); skull.position.y = 0.11; skull.castShadow = true; skull.userData.part = 'head';
  head.add(skull);
  const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 8), skin);
  neckMesh.position.y = -0.01; neckMesh.userData.part = 'head'; head.add(neckMesh);
  if (o.hair !== null) {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.122, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), new THREE.MeshStandardMaterial({ color: o.hair ?? 0x1c140e, roughness: 0.9 }));
    hair.position.y = 0.125; hair.rotation.x = -0.25; hair.userData.part = 'head'; head.add(hair);
    if (o.ponytail) {
      const pt = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.16, 4, 8), hair.material);
      pt.position.set(0, 0.06, -0.12); pt.rotation.x = 0.5; pt.userData.part = 'head'; head.add(pt);
    }
  }
  // eyes: dark for the living, pale for the infected
  const eyeMat = new THREE.MeshStandardMaterial({ color: o.zombie ? 0xd8d6b0 : 0x111111, emissive: o.zombie ? 0x22200a : 0, roughness: 0.3 });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), eyeMat);
    eye.position.set(0.04 * s, 0.13, 0.1); eye.userData.part = 'head'; head.add(eye);
  }
  if (o.helmet) {
    const hm = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), new THREE.MeshStandardMaterial({ color: o.helmet, roughness: 0.4, metalness: 0.3 }));
    hm.position.y = 0.13; hm.userData.part = 'head'; head.add(hm);
  }

  const arm = (side) => {
    const sh = new THREE.Group(); sh.position.set(0.23 * side, 0.5, 0); spine.add(sh);
    const upper = limb(sh, 0.24, 0.055, top, 'arms');
    const elbow = new THREE.Group(); elbow.position.y = -0.31; sh.add(elbow);
    const fore = limb(elbow, 0.22, 0.045, o.sleeves === false ? skin : top, 'arms');
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), skin);
    hand.position.y = -0.31; hand.scale.set(0.8, 1.2, 0.6); hand.userData.part = 'arms'; elbow.add(hand);
    const grip = new THREE.Group(); grip.position.y = -0.33; elbow.add(grip);
    return { sh, upper, elbow, fore, hand, grip };
  };
  h.armL = arm(1); h.armR = arm(-1);

  const leg = (side) => {
    const hip = new THREE.Group(); hip.position.set(0.1 * side, -0.02, 0); hips.add(hip);
    limb(hip, 0.36, 0.075, bottom, 'legs');
    const knee = new THREE.Group(); knee.position.y = -0.45; hip.add(knee);
    limb(knee, 0.34, 0.06, bottom, 'legs');
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.24), boots);
    foot.position.set(0, -0.45, 0.05); foot.castShadow = true; foot.userData.part = 'legs'; knee.add(foot);
    return { hip, knee };
  };
  h.legL = leg(1); h.legR = leg(-1);

  root.traverse(c => { if (c.isMesh) h.meshes.push(c); });
  if (o.role) attachModel(h, o.role); // a real 3D model, if web/models/models.json names one
  return h;
}

// Procedural pose. p = { phase, stride, limp, hunch, crouch, aim (pitch|null),
// reach, woundHand, kneel, breathe, lean }
export function poseHumanoid(h, p) {
  const s = Math.sin(p.phase || 0), c = Math.cos(p.phase || 0);
  const stride = p.stride || 0, limp = p.limp || 0, crouch = p.crouch || 0, kneel = p.kneel || 0;
  // Legs: the left leg is the injured one when limping, so its swing is shorter.
  const swingL = -s * 0.6 * stride * (1 - 0.55 * limp);
  const swingR = s * 0.6 * stride;
  h.legL.hip.rotation.x = swingL - crouch * 1.0 - kneel * 1.4;
  h.legR.hip.rotation.x = swingR - crouch * 1.0 - kneel * 0.2;
  h.legL.knee.rotation.x = Math.max(0, -c) * 0.95 * stride * (1 - 0.6 * limp) + crouch * 1.7 + kneel * 1.5;
  h.legR.knee.rotation.x = Math.max(0, c) * 0.95 * stride + crouch * 1.7 + kneel * 2.4;
  // Hips: bob with each step, dip further when weight lands on the injured leg.
  const bob = Math.abs(s) * 0.035 * stride;
  const dip = limp * stride * 0.07 * Math.max(0, -s);
  h.hips.position.y = h.hipsBase - bob - dip - crouch * 0.36 - kneel * 0.45 + (p.breathe || 0) * 0.004;
  h.hips.rotation.z = limp * stride * 0.08 * -s;
  h.hips.rotation.y = s * 0.08 * stride;
  h.spine.rotation.x = (p.hunch || 0) + crouch * 0.35 + stride * 0.08;
  h.spine.rotation.y = -s * 0.1 * stride + (p.lean || 0);
  h.spine.rotation.z = limp * stride * 0.06 * s;
  h.neck.rotation.x = -(p.hunch || 0) * 0.5 + (p.look || 0);
  // Arms
  const L = h.armL, R = h.armR;
  if (p.aim != null) {
    const a = -Math.PI / 2 + p.aim;
    R.sh.rotation.set(a, 0, 0.12); R.elbow.rotation.x = -0.08;
    L.sh.rotation.set(a + 0.1, 0, -0.55); L.elbow.rotation.x = -0.35;
    h.spine.rotation.y += 0.1;
  } else if (p.reach) {
    R.sh.rotation.set(-1.35 + s * 0.15, 0, 0.1); R.elbow.rotation.x = -0.2;
    L.sh.rotation.set(-1.35 - s * 0.15, 0, -0.1); L.elbow.rotation.x = -0.2;
  } else {
    R.sh.rotation.set(-swingL * 0.7, 0, 0.08); R.elbow.rotation.x = -0.25 - stride * 0.2;
    if (p.woundHand) {
      L.sh.rotation.set(-0.35, 0, -0.45); L.elbow.rotation.x = -1.7;
    } else {
      L.sh.rotation.set(-swingR * 0.7, 0, -0.08); L.elbow.rotation.x = -0.25 - stride * 0.2;
    }
  }
  if (p.heal) { L.sh.rotation.set(-1.1, 0, -0.4); L.elbow.rotation.x = -1.6; R.sh.rotation.set(-1.0, 0, 0.4); R.elbow.rotation.x = -1.4; }
}
