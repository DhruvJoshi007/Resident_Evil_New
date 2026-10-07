// CS_C1_Tape0214: the overnight security log from Yard C, Stack 4.
// This is how V-7 got loose. On the tape, two night workers open a sealed
// Vigor container and cold mist pours out. An old, sick watchman sits down
// in it and turns first. He bites the dockworker who comes back to help him,
// and that strong man turns faster and far stronger.
// The tape is staged in the real yard with stand-in actors, filmed from a
// fixed security camera with no audio, at 8 frames a second.
import * as THREE from 'three';
import { G, damp } from './game.js';
import { buildHumanoid, poseHumanoid } from './humanoid.js';
import { dotTexture } from './textures.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const CAM = V(-3.5, 5.6, 1.2), LOOK = V(-9.2, 0.4, -6.0);

function actor(look) {
  const h = buildHumanoid(look);
  h.root.rotation.order = 'YXZ';
  G.scene.add(h.root);
  const a = { h, pos: h.root.position, yaw: 0, phase: 0, stride: 0, pose: {}, from: null, to: null };
  return a;
}

// Walk an actor from one point to another over part of a shot (k0..k1 of its progress).
function walk(a, from, to, k, k0, k1, dt, speedPhase = 7) {
  const t = Math.min(1, Math.max(0, (k - k0) / (k1 - k0)));
  a.pos.set(from.x + (to.x - from.x) * t, 0, from.z + (to.z - from.z) * t);
  const moving = t > 0 && t < 1;
  if (moving) a.yaw = Math.atan2(to.x - from.x, to.z - from.z);
  a.stride = damp(a.stride, moving ? 1 : 0, 8, dt);
  a.phase += dt * speedPhase * a.stride;
}

function pose(a, extra = {}) {
  a.h.root.rotation.y = a.yaw;
  poseHumanoid(a.h, { phase: a.phase, stride: Math.min(1, a.stride), ...a.pose, ...extra });
}

export function tapeCutscene(story, onDone) {
  const L = G.level, p = G.player;
  const ui = document.getElementById('cctv');
  const tc = document.getElementById('cctv-time');
  const fx = G.fx;
  let stamp = '';
  const setTime = (hh, mm, s) => { stamp = `${hh}:${mm}:${String(Math.floor(s)).padStart(2, '0')}`; tc.textContent = stamp; };
  const footage = (on, glitch = 0) => {
    fx.cctv.value = on ? 1 : 0; fx.glitch.value = glitch;
    L.setYardPower(on || !!G.flags.FLG_C1_PowerRestored); // last night the yard floods were still on
    L.craneLegs[1].visible = !on; // keep the near crane leg out of the security camera's view
    G.frameHold = on ? 0.125 : 0;
    ui.hidden = !on;
    document.body.classList.toggle('cctv', on);
  };

  // actors and props
  const begg = actor({ role: 'begg', top: 0x33414a, bottom: 0x23262a, skin: 0xc49a7e, hair: 0x2a1b12 });
  const kelso = actor({ role: 'kelso', top: 0x9a8a2a, bottom: 0x2a3040, skin: 0xb48a6e, hair: 0x15110d, scale: 1.12 });
  const bert = actor({ role: 'bert', top: 0x2a2e3a, bottom: 0x2e2a26, skin: 0xc8a890, hair: 0x9a968c, scale: 0.94 });
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.8, 6), new THREE.MeshStandardMaterial({ color: 0x5a1a14, metalness: 0.6 }));
  bar.position.y = -0.25; begg.h.armR.grip.add(bar);
  const flask = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 10), new THREE.MeshStandardMaterial({ color: 0x8a9a9a, metalness: 0.8, roughness: 0.3 }));
  flask.position.y = -0.08; kelso.h.armL.grip.add(flask);
  const torch = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.2, 8), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, emissive: 0xfff2c0, emissiveIntensity: 0.4 }));
  torch.position.y = -0.1; bert.h.armR.grip.add(torch);
  const props = [begg.h.root, kelso.h.root, bert.h.root];
  // the cold mist that pours out of the container and lies low on the concrete
  const mist = [];
  const mistMat = new THREE.SpriteMaterial({ map: dotTexture(), color: 0xe8eef0, transparent: true, opacity: 0, depthWrite: false });
  for (let k = 0; k < 46; k++) {
    const s = new THREE.Sprite(mistMat.clone());
    s.userData = { a: Math.random() * Math.PI - Math.PI / 2, r: Math.random(), y: 0.1 + Math.random() * 0.35, size: 0.8 + Math.random() * 1.6, delay: Math.random() * 0.5 };
    s.visible = false; G.scene.add(s); mist.push(s); props.push(s);
  }
  const mistAt = (amount, spread) => {
    for (const s of mist) {
      const u = s.userData, d = Math.max(0, spread - u.delay) * (1.5 + u.r * 4.5);
      s.visible = amount > 0.01;
      s.position.set(-9.4 + Math.cos(u.a) * d * 0.8, u.y, -7 + Math.sin(u.a) * d);
      s.scale.setScalar(u.size * (0.6 + Math.min(1.5, spread)));
      s.material.opacity = amount * (0.25 + u.r * 0.3) * Math.min(1, spread * 3 + 0.2);
    }
  };
  const show = (...as) => { for (const a of [begg, kelso, bert]) a.h.root.visible = as.includes(a); };
  const flaskOnGround = new THREE.Mesh(flask.geometry, flask.material);
  flaskOnGround.rotation.z = Math.PI / 2; flaskOnGround.position.set(-9.2, 0.04, -4.6); flaskOnGround.visible = false;
  G.scene.add(flaskOnGround); props.push(flaskOnGround);

  // Leon at the monitor in the dock office
  const seat = () => { p.pos.set(-19.7, 0, 47.4); p.yaw = p.camYaw = -Math.PI / 2; p.crouch = false; };
  const screen = L.monitorScreen.material;

  const cleanup = () => {
    footage(false);
    for (const o of props) G.scene.remove(o);
    L.setVigorOpen(1);
    L.setTornGate(true);
    screen.color.set(0x223322);
    G.player.h.root.visible = true;
  };

  const shots = [
    { // 1. over Leon's shoulder, the deck spins back to the start of the log
      dur: 3.2, start: () => { seat(); show(); screen.color.set(0x5a7a6a); G.audio.staticBurst(0.6); },
      cam: [V(-17.9, 1.8, 46.6), V(-18.9, 1.55, 47.0)], look: [V(-20.6, 1.0, 47.4)], fov: 40,
      update: (k) => { screen.color.setHSL(0.4, 0.15, 0.25 + Math.random() * 0.15 * (1 - k)); },
    },
    { // 2. 02:14: the seal comes off and the mist pours out
      dur: 12, cam: [CAM, CAM], look: [LOOK], fov: 58,
      start: () => {
        footage(true); G.audio.staticBurst(0.3);
        show(begg, kelso);
        L.setVigorOpen(0); L.setTornGate(false); mistAt(0, 0);
        begg.pos.set(-9.2, 0, -7.4); begg.yaw = -Math.PI / 2;
        kelso.pos.set(-7.4, 0, -5.6); kelso.yaw = -2.2;
      },
      update: (k, dt = 0.016) => {
        setTime('02', '14', 2 + k * 40);
        const t = k * 12;
        // Begg works the bar under the seal; Kelso watches with his hands down
        if (t < 4) { pose(begg, { reach: true }); begg.h.armR.sh.rotation.x = -1.2 + Math.sin(t * 6) * 0.35; pose(kelso); }
        const door = Math.min(1, Math.max(0, (t - 4) / 1.2)) * 0.37;
        L.setVigorOpen(door);
        mistAt(t > 4 ? 1 : 0, Math.max(0, (t - 4) / 7));
        if (t >= 4 && t < 8) { // both step back out of the cold, unhurried
          walk(begg, V(-9.2, 0, -7.4), V(-8.0, 0, -7.6), t, 5, 6.5, dt, 5); begg.yaw = -Math.PI / 2;
          walk(kelso, V(-7.4, 0, -5.6), V(-6.6, 0, -5.0), t, 5, 6.5, dt, 5); kelso.yaw = -2.2;
          pose(begg); pose(kelso);
        }
        if (t >= 8) { // Begg leans in with a torch; Kelso walks out of frame right
          pose(begg, { aim: -0.2 }); begg.h.spine.rotation.x = 0.35;
          walk(kelso, V(-6.6, 0, -5.0), V(-1.5, 0, -11), t, 8.4, 12, dt, 7);
          pose(kelso);
        }
      },
    },
    { // 3. Leon's face in the monitor light
      dur: 2.6, start: () => { footage(false); show(); seat(); },
      cam: [V(-20.25, 1.62, 46.6), V(-20.25, 1.6, 46.65)], look: [V(-19.6, 1.68, 47.4)], fov: 32,
    },
    { // 4. 02:31: the old watchman walks into the mist and sits down. He does not get up.
      dur: 12, cam: [CAM, CAM], look: [LOOK], fov: 58,
      start: () => {
        footage(true); G.audio.staticBurst(0.25);
        show(bert); L.setVigorOpen(0.37);
        bert.pos.set(-14.5, 0, -2.4); bert.yaw = 2.4; bert.phase = 0;
      },
      update: (k, dt = 0.016) => {
        setTime('02', '31', 7 + k * 50);
        const t = k * 12;
        mistAt(0.55, 1.5);
        walk(bert, V(-14.5, 0, -2.4), V(-10.8, 0, -5.1), t, 0, 4.2, dt, 4.5);
        if (t < 4.2) pose(bert, { woundHand: true, hunch: 0.35, limp: 0.3 });
        else if (t < 7.6) { bert.yaw = 2.6; pose(bert, { woundHand: true, hunch: 0.4, breathe: Math.sin(t * 5) }); }
        else { // lowers himself against the container side and sits; the torch rolls away
          bert.yaw = 0; const s = Math.min(1, (t - 7.6) / 1.6);
          pose(bert, { kneel: s, hunch: 0.5 * s, woundHand: s < 0.8 });
          bert.h.hips.position.y -= 0.25 * s;
          if (t > 9) bert.h.armR.sh.rotation.set(-0.2, 0, 0.6);
        }
      },
    },
    { // 5. 02:58: Kelso comes back with a flask and kneels. Bert takes his wrist and bites.
      dur: 10.5, cam: [CAM, CAM], look: [LOOK], fov: 58,
      start: () => {
        footage(true, 0.6); G.audio.staticBurst(0.35);
        setTimeout(() => { if (fx.cctv.value) fx.glitch.value = 0; }, 350);
        show(bert, kelso); flask.visible = true; flaskOnGround.visible = false;
        bert.pos.set(-10.8, 0, -5.1); bert.yaw = 0;
        kelso.pos.set(-2, 0, -10); kelso.phase = 0;
      },
      update: (k, dt = 0.016) => {
        setTime('02', '58', 3 + k * 40);
        const t = k * 10.5;
        mistAt(0.35, 1.6);
        if (t < 3.2) {
          walk(kelso, V(-2, 0, -10), V(-10.4, 0, -4.4), t, 0, 3.0, dt, 9.5);
          pose(kelso); pose(bert, { kneel: 1, hunch: 0.5 }); bert.h.hips.position.y -= 0.25;
        } else if (t < 5.6) { // kneels, hand on the old man's shoulder; Bert's head comes up
          kelso.yaw = Math.atan2(bert.pos.x - kelso.pos.x, bert.pos.z - kelso.pos.z);
          pose(kelso, { kneel: 0.8 }); kelso.h.armR.sh.rotation.set(-1.3, 0, 0.3);
          pose(bert, { kneel: 1, hunch: t > 4.4 ? -0.1 : 0.5, look: t > 4.4 ? -0.3 : 0 }); bert.h.hips.position.y -= 0.25;
          if (t > 4.4) { bert.h.armL.sh.rotation.set(-1.5, 0, -0.2); bert.h.armR.sh.rotation.set(-1.5, 0, 0.2); bert.h.neck.rotation.x = 0.6; bert.h.spine.rotation.x = 0.5; }
        } else if (t < 6.4) { // one frame-hold of rigid shock, then he tears away backwards
          pose(kelso, { kneel: 0.5 }); kelso.h.spine.rotation.x = -0.4;
          flask.visible = false; flaskOnGround.visible = true;
        } else {
          walk(kelso, V(-10.4, 0, -4.4), V(-3.0, 0, 0.5), t, 6.4, 7.8, dt, 11);
          kelso.yaw = Math.atan2(-7.4, -4.9); // facing back toward Bert while backing off
          pose(kelso, { woundHand: true });
          // Bert on hands and knees, following slowly
          walk(bert, V(-10.8, 0, -5.1), V(-8.4, 0, -2.6), t, 7, 10.5, dt, 3);
          pose(bert, { kneel: 0.6, hunch: 0.9, reach: true });
        }
      },
    },
    { // 6. Leon. His jaw sets.
      dur: 2.4, start: () => { footage(false); show(); seat(); },
      cam: [V(-20.1, 1.55, 46.75), V(-20.15, 1.56, 46.72)], look: [V(-19.6, 1.66, 47.4)], fov: 36,
      update: (k) => { G.camera.position.x += Math.sin(G.time * 13) * 0.003; void k; },
    },
    { // 7. 03:40: Kelso under the camera. He tears the Stack 4 gate out of its frame.
      dur: 9, cam: [CAM, CAM], look: [LOOK], fov: 58,
      start: () => {
        footage(true, 0.5); G.audio.staticBurst(0.3);
        setTimeout(() => { if (fx.cctv.value) fx.glitch.value = 0; }, 300);
        show(kelso); flask.visible = false; flaskOnGround.visible = true; L.setTornGate(false);
        kelso.pos.set(-1.5, 0, 3.5); kelso.phase = 0;
      },
      update: (k, dt = 0.016) => {
        setTime('03', '40', 11 + k * 30);
        const t = k * 9;
        mistAt(0.15, 1.7);
        if (t < 2.2) { walk(kelso, V(-1.5, 0, 3.5), V(-4.6, 0, -0.5), t, 0, 2.0, dt, 6); pose(kelso, { hunch: 0.2 }); }
        else if (t < 3.6) { // faces the camera for two frame-holds
          kelso.yaw = Math.atan2(CAM.x - kelso.pos.x, CAM.z - kelso.pos.z);
          pose(kelso, { look: -0.6, hunch: 0.1 });
        } else if (t < 5.4) { // both hands on the gate, and pulls
          kelso.yaw = Math.PI;
          pose(kelso, { reach: true, hunch: 0.25 }); kelso.h.spine.rotation.x = -0.2 + Math.sin(t * 20) * 0.04;
          const g = L.tornGate; g.rotation.x = -Math.max(0, t - 4.6) * 0.5; g.position.z = -1.5 + Math.max(0, t - 4.6) * 0.3;
          if (t > 4.6 && !kelso.tore) { kelso.tore = true; G.audio.clang(V(-5, 1, -1.5)); }
        } else { // through, and gone, faster than he came in
          L.setTornGate(true);
          walk(kelso, V(-4.6, 0, -0.5), V(-9, 0, -14), t, 5.4, 7.0, dt, 13);
          pose(kelso, { hunch: 0.3 });
        }
      },
    },
    { // 8. 03:41, 03:42. Nothing. Then static.
      dur: 5, cam: [CAM, CAM], look: [LOOK], fov: 58,
      start: () => { footage(true); show(); L.setTornGate(true); },
      update: (k) => {
        setTime('03', '41', 12 + k * 5 * 6);
        mistAt(0.1, 1.8);
        if (k > 0.72) { fx.glitch.value = 1; if (!this_static.done) { this_static.done = true; G.audio.staticBurst(1.3); } }
      },
    },
    { // 9. Back in the dock office. Leon takes the tape. The radio keys up.
      dur: 10, start: () => { footage(false); show(); seat(); screen.color.set(0x1a2a6a); mistAt(0, 0); },
      cam: [V(-18.6, 1.7, 46.0), V(-16.4, 2.1, 45.2)], look: [V(-20.2, 1.2, 47.4), V(-19.6, 1.3, 47.4)], fov: 46,
      lines: story.rows('RAD_C1_AfterTape').map((r, i) => [0.6 + i * 2.3, r.speaker === 'MARA' ? 'MARA (radio)' : r.speaker, r.text]),
    },
  ];
  const this_static = { done: false };
  story.play(shots, () => { cleanup(); onDone?.(); });
}
