// Prologue, "Check-In": the story of the outbreak, Leon's night at the Gullwing
// Hotel, the morning at the window, Ortiz at the door, the escape to the garage
// and the drive to the field office on Kestrel Street.
// Every spoken line and note comes from data/narrative_c0.json; the objective
// list comes from data/objectives_c0.json.
import * as THREE from 'three';
import { G, dist2D, rand, damp, makeNoise, addUpdater } from '../game.js';
import { Story } from '../story.js';
import { Husk } from '../enemies.js';
import { buildHumanoid, poseHumanoid } from '../humanoid.js';
import { KEY_ITEMS } from '../items.js';
import { Drive } from './drive.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
KEY_ITEMS.roomKey = 'Room 304 Key Card';
KEY_ITEMS.carKey = 'Bureau Car Key (bay 14)';

// Looks, so the same people read the same way in every scene.
const LOOK = {
  leon: { top: 0x3a3d34, bottom: 0x24262a, vest: 0x26292b, skin: 0xc49a7e, hair: 0x15110d, scale: 1.04 },
  ortiz: { top: 0x1c2430, bottom: 0x1a1c20, vest: 0x22262a, skin: 0xb08066, hair: 0x120e0c, ponytail: true, scale: 0.97 },
  ruth: { top: 0x6a5a7a, bottom: 0x2a2a3a, skin: 0xd8b8a0, hair: 0xb8b0a8, scale: 0.93 },
  pruitt: { top: 0x4a4a48, bottom: 0x2a2a2c, vest: 0x2a2e30, skin: 0xc49a7e, hair: 0x8a8478, scale: 1.03 },
  patron: { top: 0x5a4a3a, bottom: 0x2a2a2a, skin: 0xc8a088, hair: 0x3a2a1a, scale: 1.0 },
  labcoat: { top: 0xe0e2e4, bottom: 0x3a3a40, skin: 0xd0a888, hair: 0x2a1a10, scale: 1.0 },
  subject: { top: 0x8a8a7a, bottom: 0x6a6a5a, skin: 0x9a9a88, hair: 0x8a8478, scale: 0.95, zombie: true },
  begg: { top: 0x3a4a5a, bottom: 0x2a3040, vest: 0xc8d020, skin: 0xc49a7e, hair: 0x2a1a10, scale: 0.98 },
  kelso: { top: 0x5a3a2a, bottom: 0x2a3040, vest: 0xc8d020, skin: 0xb88a6e, hair: 0x1a1612, scale: 1.12 },
  bert: { top: 0x2a3a2a, bottom: 0x3a3a34, skin: 0xd0b0a0, hair: 0xc8c0b8, scale: 0.92 },
  runner: { top: 0x8a7a6a, bottom: 0x3a3a4a, skin: 0xd0a888, hair: 0x3a2a1a, scale: 0.98 },
};

// Someone who is not the player and not an enemy: walks along waypoints and poses.
class Npc {
  constructor(look, x, z, yaw = 0) {
    this.h = buildHumanoid({ role: Object.keys(LOOK).find(k => LOOK[k] === look), ...look });
    G.scene.add(this.h.root);
    this.pos = this.h.root.position; this.pos.set(x, 0, z);
    this.yaw = yaw; this.phase = 0; this.stride = 0;
    this.route = []; this.speed = 1.4; this.pose = {};
    this.alive = true;
    addUpdater((dt) => this.update(dt));
  }
  walk(points, speed = 1.4) { this.route = points.map(([x, z]) => V(x, 0, z)); this.speed = speed; return this; }
  get busy() { return this.route.length > 0; }
  face(x, z) { this.yaw = Math.atan2(x - this.pos.x, z - this.pos.z); }
  update(dt) {
    if (!this.alive) return false;
    let hs = 0;
    const t = this.route[0];
    if (t) {
      const dx = t.x - this.pos.x, dz = t.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.12) this.route.shift();
      else {
        const step = Math.min(d, this.speed * dt);
        this.pos.x += dx / d * step; this.pos.z += dz / d * step;
        this.yaw += Math.atan2(Math.sin(Math.atan2(dx, dz) - this.yaw), Math.cos(Math.atan2(dx, dz) - this.yaw)) * Math.min(1, dt * 10);
        hs = this.speed;
      }
    }
    this.stride = damp(this.stride, Math.min(1.3, hs / 1.6), 8, dt);
    this.phase += dt * (hs > 0 ? 4 + hs * 2.6 : 0);
    this.h.root.rotation.y = this.yaw;
    poseHumanoid(this.h, { phase: this.phase, stride: this.stride, breathe: Math.sin(G.time * 2), ...this.pose });
    this.after?.(dt);
    return true;
  }
  remove() { this.alive = false; G.scene.remove(this.h.root); }
}

export class PrologueStory extends Story {
  constructor(data) {
    super(data);
    this.npcs = {};
    this.street = [];
    this.knockT = 0;
    this.garage = { t: 0, alarms: 0, hint: 0, chirped: false };
    this.checkpoint = null;
  }

  // Every infected in the Prologue is fresh from the night: none of them gets back up.
  spawn(o) { return new Husk({ kind: 'husk', canRise: false, ...o }); }

  titleView(t) {
    G.camera.position.set(10 + Math.sin(t * 0.04) * 8, 6, 62);
    G.camera.lookAt(4, 6, 40);
  }

  setup() {
    const L = G.level, p = G.player;
    p.unarmed = true;
    p.flashOn = false;
    G.strain = 1;
    // night: Ruth at the desk, one late drinker in the bar
    this.npcs.ruth = new Npc(LOOK.ruth, 1.5, 24.2, 0);
    this.npcs.patron = new Npc(LOOK.patron, -21.3, 30.5, -Math.PI / 2);
    this.npcs.patron.pose = { hunch: 0.5 };
    L.interacts.push({
      pos: V(1.5, 1, 26.6), radius: 1.9, label: 'Talk to the night clerk',
      enabled: () => !G.flags.FLG_C0_CheckedIn && G.flags.FLG_C0_OpeningSeen, action: () => this.checkIn(),
    });
    L.doors.stair1.locked = true; L.doors.stair1.lock = 'checkin';
    L.doors.r304.locked = true; L.doors.r304.lock = 'key304';
    // the stairs between floors
    L.interacts.push({
      pos: V(14.5, 1, 36.4), radius: 1.9, label: () => (G.flags.FLG_C0_Split ? 'Go back up' : 'Climb to the third floor'),
      enabled: () => !!G.flags.FLG_C0_CheckedIn,
      action: () => {
        if (G.flags.FLG_C0_Split) { G.ui.toast('Ortiz is pulling them up there. Bay fourteen.'); return; }
        this.teleport(68.2, 26.5, -Math.PI / 2, 'third');
      },
    });
    L.interacts.push({
      pos: V(68.6, 1, 28.8), radius: 1.6, label: 'Go down to the lobby',
      enabled: () => !G.flags.FLG_C0_InRoom, action: () => this.teleport(14.6, 33.2, -Math.PI / 2, 'ground'),
    });
    L.interacts.push({
      pos: V(8, 1, 15.4), radius: 1.8, label: 'Go down to garage level P2',
      enabled: () => !!G.flags.FLG_C0_Split, action: () => this.enterGarage(),
    });
    L.interacts.push({
      pos: V(26.2, 1, -16.6), radius: 1.6, label: 'Go back up',
      enabled: () => !!G.flags.FLG_C0_GarageReached, action: () => G.ui.toast('Bay fourteen. Ortiz said not to make her wait.'),
    });
    // room 304
    this.readable(40.6, 0.6, 36.2, 'NAR_C0_Voicemail', 'Play');
    L.interacts.push({
      pos: V(42.2, 0.6, 34.5), radius: 1.6, label: 'Get some sleep',
      enabled: () => G.flags.FLG_C0_InRoom && !G.flags.FLG_C0_Slept, action: () => this.sleep(),
    });
    L.interacts.push({
      pos: V(46.4, 0.9, 38.1), radius: 1.5, label: 'Take the steel flask',
      enabled: () => G.flags.FLG_C0_WindowSeen && !this.holdingFlask && !G.flags.FLG_C0_Armed, action: () => this.takeFlask(),
    });
    // the morning notes
    L.interacts.push({
      pos: V(3.4, 1.1, 25.6), radius: 1.7, label: () => `Read: ${this.fileTitle('NAR_C0_NightLog')}`,
      enabled: () => !!G.flags.FLG_C0_Split, action: () => { this.readFile('NAR_C0_NightLog'); this.optionalDone('OBJ_C0_09'); },
    });
    L.interacts.push({
      pos: V(60.4, 0.3, 26.4), radius: 1.6, label: () => `Read: ${this.fileTitle('NAR_C0_UnderDoor')}`,
      enabled: () => !!G.flags.FLG_C0_WindowSeen, action: () => this.readFile('NAR_C0_UnderDoor'),
    });
    const note = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.16), new THREE.MeshStandardMaterial({ color: 0xe8e2d0 }));
    note.rotation.x = -Math.PI / 2; note.position.set(60.4, 0.012, 26.25); G.scene.add(note);
    const log = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.24), new THREE.MeshStandardMaterial({ color: 0x2a3a5a }));
    log.position.set(3.4, 1.15, 25.6); G.scene.add(log);
    this.readable(22.6, 1.5, -16.2, 'NAR_C0_GarageSign');
    // garage bays: the right car chirps, the wrong ones scream
    for (const car of L.bays) {
      L.interacts.push({
        pos: V(car.position.x + 1.3, 1, car.position.z + 0.3), radius: 1.5,
        label: () => (car.bay === 11 ? 'Look at the red hatchback' : 'Try the key on this car'),
        enabled: () => G.flags.FLG_C0_GarageReached && !G.flags.FLG_C0_InCar,
        action: () => this.tryCar(car),
      });
    }
    this.drive = new Drive(this);
    G.level.setZone('ground');
    p.pos.set(-14, 0, 41.2); p.yaw = p.camYaw = Math.PI / 2;
  }

  // ----- small helpers -----
  say(prefix, i) { const r = this.rows(prefix)[i]; return [r.speaker === 'NARRATOR' ? null : r.speaker, r.text]; }

  teleport(x, z, yaw, zone, then) {
    const p = G.player;
    p.control = false;
    G.ui.fade(1);
    G.audio.step('concrete', 1);
    setTimeout(() => {
      p.pos.set(x, 0, z); p.vel.set(0, 0, 0); p.yaw = p.camYaw = yaw; p.camPitch = -0.08;
      G.level.setZone(zone);
      G.ui.fade(0); p.control = true;
      then?.();
    }, 700);
  }

  clearEnemies(list) {
    for (const e of list) {
      G.scene.remove(e.h.root);
      if (e.h.head.parent === G.scene) G.scene.remove(e.h.head);
      const i = G.enemies.indexOf(e); if (i >= 0) G.enemies.splice(i, 1);
      G.hitMeshes = G.hitMeshes.filter(m => m.userData.enemy !== e);
    }
  }

  // Move enemies by hand during cutscenes (in a cutscene they only animate in place).
  shamble(e, tx, tz, speed, dt) {
    const dx = tx - e.pos.x, dz = tz - e.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.2) { e.vel.set(0, 0, 0); return true; }
    e.vel.set(dx / d * speed, 0, dz / d * speed);
    e.pos.x += e.vel.x * dt; e.pos.z += e.vel.z * dt;
    e.yaw = Math.atan2(dx, dz); e.h.root.rotation.y = e.yaw;
    return false;
  }

  // The street outside keeps moving while the camera looks at it.
  streetLife(dt) {
    for (const e of this.street) {
      if (!e.alive || e.scripted) continue;
      if (!e.goal || this.shamble(e, e.goal.x, e.goal.z, e.speedWalk * 1.4, dt)) e.goal = V(rand(-30, 72), 0, rand(43, 55));
    }
  }

  spawnStreet(n, x0, x1) {
    const builds = ['normal', 'normal', 'frail', 'worker', 'frail', 'normal'];
    for (let k = 0; k < n; k++) {
      const e = this.husk({ x: rand(x0, x1), z: rand(43, 55), build: builds[k % builds.length], state: 'wander', yaw: rand(0, 6) });
      e.goal = V(rand(x0, x1), 0, rand(43, 55));
      this.street.push(e);
    }
  }

  knock(n = 3) {
    for (let k = 0; k < n; k++) setTimeout(() => G.audio.noise(0.12, { freq: 160, q: 1, gain: 1.1, type: 'lowpass', pos: V(44, 1.2, 29.8) }), k * 330);
  }

  // ======================================================
  // CS_C0_Opening: what happened, told over the places it happened
  // ======================================================
  introCutscene() {
    const L = G.level, S = L.sets, p = G.player;
    const say = (i) => this.say('DLG_C0_Opening', i);
    const subject = new Npc(LOOK.subject, 200, 0.9, 0);
    subject.after = () => { subject.h.root.rotation.x = subject.lift ?? -Math.PI / 2; subject.pos.y = 0.92; };
    const staff = [new Npc(LOOK.labcoat, 196.4, 2.6, 2.2), new Npc(LOOK.labcoat, 197.6, 0.4, -0.6)];
    for (const s of staff) { s.after = () => { s.h.root.rotation.x = -Math.PI / 2; s.pos.y = 0.15; s.h.armL.sh.rotation.z = -1; }; }
    const blood = (x, z, r) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 14), new THREE.MeshStandardMaterial({ color: 0x3a0503, roughness: 0.2 })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.012, z); G.scene.add(m); return m; };
    const pools = [blood(196.2, 2.2, 0.7), blood(197.9, 0.9, 0.5)];
    const begg = new Npc(LOOK.begg, 240.4, 4.3, Math.PI);
    const kelso = new Npc(LOOK.kelso, 242.2, 5.2, Math.PI + 0.5);
    const bert = new Npc(LOOK.bert, 234, 6.5, Math.PI / 2);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6), new THREE.MeshStandardMaterial({ color: 0x5a1a14 }));
    begg.h.armR.grip.add(bar); bar.rotation.x = Math.PI / 2;
    const temp = [];
    const cleanup = () => {
      for (const n of [subject, ...staff, begg, kelso, bert]) n.remove();
      for (const m of pools) G.scene.remove(m);
      S.labLamp.visible = false; S.dockLamp.visible = false;
      this.clearEnemies(temp);
    };
    p.h.root.visible = false;
    this.play([
      { // 1. Eight months ago: the trial room under Saltmere
        dur: 6.5, start: () => { G.ui.fade(1); setTimeout(() => G.ui.fade(0), 400); S.labLamp.visible = true; G.ui.titleCard('Saltmere Island', 'Eight months ago', 4.5); },
        cam: [V(203.5, 2.2, 3.6), V(202.4, 1.9, 2.4)], look: [V(200, 0.9, 0)], fov: 42, lines: [[1.2, ...say(0)]],
      },
      { // 2. the vial
        dur: 5.5, cam: [V(201.6, 1.15, 0.2), V(201.5, 1.1, -0.05)], look: [V(201.2, 1.0, -0.4)], fov: 30, lines: [[0.4, ...say(1)]],
      },
      { // 3. Subject seven. He does not stay dying.
        dur: 6.5, cam: [V(198.6, 1.7, -1.6), V(198.9, 1.6, -1.2)], look: [V(200, 1.0, -0.4)], fov: 36, lines: [[0.3, ...say(2)]],
        update: (k) => {
          if (k > 0.55) { subject.h.armR.sh.rotation.x = Math.sin(G.time * 30) * 0.4; S.labLamp.intensity = Math.random() < 0.3 ? 10 : 60; }
          if (k > 0.82) subject.lift = -Math.PI / 2 + (k - 0.82) / 0.18 * 1.1;
        },
        end: () => { S.labLamp.intensity = 60; },
      },
      { // 4. Two of the staff. The sealed door.
        dur: 6.5, start: () => { S.labLamp.color.set(0xff6a5a); S.labLamp.position.set(198, 3.2, 3); S.labLamp.target.position.set(196.2, 0, 1.8); S.labLamp.angle = 0.8; },
        cam: [V(199.6, 2.4, 4.3), V(199.0, 2.2, 4.0)], look: [V(196.4, 0.5, 1.6), V(195.5, 1.6, 2)], fov: 48,
        lines: [[0.3, ...say(3)]],
      },
      { // 5. What was left went into a container
        dur: 5.5, start: () => { S.labLamp.visible = false; S.dockLamp.visible = true; }, cam: [V(236.6, 1.8, 1.6), V(236.9, 1.8, 0.4)], look: [V(238.8, 1.6, 0)], fov: 40,
        lines: [[0.3, ...say(4)]],
      },
      { // 6. Port Halvern, 02:14: two dock workers open it
        dur: 6.5, start: () => { G.ui.titleCard('Port Halvern', '02:14', 3.5); G.audio.clang(V(240, 1, 3)); },
        cam: [V(236.5, 3.2, 10.5), V(237, 2.9, 9.6)], look: [V(240.5, 1.1, 3.6)], fov: 42, lines: [[0.8, ...say(5)]],
        update: (k) => {
          begg.h.armR.sh.rotation.x = -1.2 + Math.sin(G.time * 6) * 0.3;
          S.mistMat.opacity = Math.max(0, (k - 0.5) * 0.4);
          S.mist.forEach((m, i) => { m.position.z = 3.1 + (i % 6) * 0.35 * k; m.position.x = 240 - 1 + (i / 26) * 2.4; });
          if (k > 0.6 && !begg.backed) { begg.backed = true; begg.walk([[240.4, 5.6]], 0.8); kelso.walk([[244, 7]], 1.0); }
        },
      },
      { // 7. Breathe it, and it only takes the weak
        dur: 6.5, start: () => { bert.walk([[238.8, 5.6]], 0.7); }, cam: [V(235.4, 0.5, 8.4), V(235.8, 0.6, 7.8)], look: [V(239.2, 0.6, 5.2)], fov: 40,
        lines: [[0.4, ...say(6)]],
        update: (k, dt) => {
          S.mistMat.opacity = 0.2;
          S.mist.forEach((m, i) => { m.position.z = 3.1 + (i % 6) * 0.55 + Math.sin(G.time + i) * 0.1; m.position.x = 238.4 + (i / 26) * 3.4; });
          if (k > 0.55) { bert.pose = { kneel: Math.min(1, (k - 0.55) * 3), hunch: 0.6 }; }
        },
      },
      { // 8. A bite takes anyone. The strong come back stronger.
        dur: 6.8, start: () => { kelso.pos.set(239.6, 0, 6.3); kelso.face(238.8, 5.6); kelso.pose = { kneel: 1 }; bert.pose = { kneel: 1, reach: true, hunch: 0.3 }; bert.face(239.6, 6.3); },
        cam: [V(237.6, 1.1, 8.2), V(237.8, 1.0, 7.9)], look: [V(239.2, 0.9, 6.0)], fov: 34, lines: [[0.4, ...say(7)]],
        update: (k) => {
          if (k > 0.35 && !kelso.bit) { kelso.bit = true; G.audio.bite(); }
          if (k > 0.35) { kelso.h.armL.sh.rotation.set(-1.4, 0, -0.3); kelso.h.spine.rotation.x = -0.3; }
          if (k > 0.75) { kelso.pose = {}; kelso.h.neck.rotation.x = -0.4 + Math.sin(G.time * 40) * 0.08; }
        },
      },
      { // 9. By breakfast it was walking into the city
        dur: 7.5, start: () => {
          L.setTime('dawn'); S.dockLamp.visible = false; S.mistMat.opacity = 0;
          for (let k = 0; k < 7; k++) { const e = this.husk({ x: rand(20, 62), z: rand(43, 55), build: ['normal', 'frail', 'worker'][k % 3], state: 'idle' }); e.goal = V(rand(10, 70), 0, rand(43, 55)); temp.push(e); }
        },
        cam: [V(26, 8.5, 56.8), V(32, 6.5, 56.4)], look: [V(42, 0.5, 46), V(46, 1, 46)], fov: 52, lines: [[0.4, ...say(8)]],
        update: (k, dt) => { for (const e of temp) this.shamble(e, e.goal.x, e.goal.z, 0.6, dt); },
      },
      { // 10. The night before. Leon checks in.
        dur: 7, start: () => {
          this.clearEnemies(temp); temp.length = 0;
          L.setTime('night');
          p.h.root.visible = true; p.flashOn = false;
          p.pos.set(-14, 0, 41.2); p.yaw = Math.PI / 2; p.autoWalk = V(-1, 0, 41.2);
          G.ui.titleCard('Harbor Avenue', 'The night before · 23:10', 4);
        },
        cam: [V(-9, 1.7, 50), V(-7, 1.9, 49.4)], look: [V(-6, 2.2, 40), V(-1, 3.5, 40)], fov: 46, lines: [[3.4, ...say(9)]],
      },
    ], () => {
      cleanup();
      for (const r of this.rows('DLG_C0_Opening')) this.unlock(r);
      G.flags.FLG_C0_OpeningSeen = true;
      p.h.root.visible = true; p.autoWalk = null;
      p.pos.set(0, 0, 38); p.yaw = p.camYaw = Math.PI; p.camPitch = -0.1;
      G.ui.fade(1); setTimeout(() => G.ui.fade(0), 500);
      G.ui.titleCard('Prologue', 'Check-In', 3.5);
      this.objective('OBJ_C0_01');
      this.saveGame('night');
    });
  }

  // ======================================================
  // CS_C0_CheckIn
  // ======================================================
  checkIn() {
    const p = G.player, ruth = this.npcs.ruth;
    const say = (i) => this.say('DLG_C0_CheckIn', i);
    const card = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.005, 0.055), new THREE.MeshStandardMaterial({ color: 0xc9b48a }));
    card.position.set(1.4, 1.17, 25.4); G.scene.add(card);
    p.pos.set(1.5, 0, 27.0); p.yaw = Math.PI;
    G.audio.tone(2600, 0.5, { gain: 0.06 }); // the desk bell
    this.play([
      { dur: 4.6, cam: [V(2.4, 1.75, 28.6), V(2.3, 1.75, 28.4)], look: [V(1.4, 1.6, 24.4)], fov: 40, lines: [[0.4, ...say(0)], [2.0, ...say(1)]] },
      { dur: 4.2, cam: [V(1.9, 1.62, 26.0)], look: [V(1.5, 1.55, 24.3)], fov: 32, lines: [[0.3, ...say(2)]],
        update: (k) => { card.position.z = 25.4 + k * 0.5; ruth.h.armR.sh.rotation.x = -0.9; } },
      { dur: 2.4, cam: [V(1.0, 1.72, 25.4)], look: [V(1.5, 1.75, 27.0)], fov: 32, lines: [[0.2, ...say(3)]] },
      { dur: 3.2, cam: [V(1.9, 1.62, 26.0)], look: [V(1.5, 1.55, 24.3)], fov: 32, lines: [[0.2, ...say(4)]] },
      { dur: 3.6, start: () => { G.scene.remove(card); p.autoWalk = V(9, 0, 31); }, cam: [V(-2.5, 2.2, 30.5)], look: [V(2, 1.5, 27.5), V(5, 1.5, 29)], fov: 46, lines: [[0.3, ...say(5)]] },
    ], () => {
      for (const r of this.rows('DLG_C0_CheckIn')) this.unlock(r);
      G.flags.FLG_C0_CheckedIn = true;
      G.items.keys.add('roomKey');
      const L = G.level; L.doors.stair1.locked = false; L.doors.stair1.lock = null;
      this.objective('OBJ_C0_02');
      this.readFile('NAR_C0_KeySleeve');
    });
  }

  // ======================================================
  // Sleep, then CS_C0_Morning: the window
  // ======================================================
  sleep() {
    const p = G.player, L = G.level;
    G.flags.FLG_C0_Slept = true;
    G.mode = 'cine'; p.control = false;
    G.ui.fade(1);
    setTimeout(() => {
      L.closeDoor('r304');
      L.setTime('morning');
      L.setZone('third');
      for (const n of Object.values(this.npcs)) n.remove();
      this.npcs = {};
      this.morningHusks();
      G.ui.titleCard('Gullwing Hotel', '07:30', 3.5);
      this.morning();
    }, 1400);
  }

  // The hotel after the night: who is still walking, and where.
  morningHusks() {
    this.spawnStreet(14, -30, 72);
    // the lobby, the bar and Ruth
    this.husk({ x: 0, z: 23.5, build: 'frail', clothes: { top: LOOK.ruth.top, bottom: LOOK.ruth.bottom }, name: 'ruth', state: 'wander', patrol: [[-2, 23.4], [4.6, 23.4]] });
    this.husk({ x: -5.5, z: 30, build: 'normal', yaw: 0.4, state: 'idle', name: 'guest1' });
    this.husk({ x: 6, z: 37.5, build: 'normal', yaw: Math.PI, state: 'wander', name: 'guest2', patrol: [[6, 37.5], [-2, 37.5], [-2, 29], [6, 29]] });
    this.husk({ x: -20.4, z: 30.5, build: 'frail', clothes: { top: LOOK.patron.top, bottom: LOOK.patron.bottom }, yaw: -Math.PI / 2, state: 'idle', name: 'patron' });
    // the man Ruth put in the back office, "quiet now"
    this.husk({ x: -2.6, z: 16.2, build: 'worker', yaw: Math.PI, state: 'idle', name: 'office' });
  }

  morning() {
    const p = G.player, L = G.level;
    const tv = this.row('NAR_C0_TVBulletin').text.split('\n').filter(l => l && !l.startsWith('['));
    const lie = () => { p.pos.set(42.25, 0.62, 34.5); p.yaw = Math.PI / 2; p.h.root.rotation.x = -Math.PI / 2; };
    let runner, civ;
    p.flashOn = false;
    this.play([
      { // 1. the TV wakes on its own
        dur: 9, start: () => { G.ui.fade(0); lie(); L.tvScreen.material.color.set(0x8a9ab8); }, cam: [V(46.6, 2.3, 32.4), V(46.2, 2.2, 32.8)], look: [V(41.4, 0.6, 34.5)], fov: 50,
        update: () => { lie(); L.tvScreen.material.color.setHSL(0.6, 0.2, 0.45 + Math.random() * 0.08); },
        lines: [[0.8, 'CHANNEL 6', tv[0]], [3.2, 'CHANNEL 6', tv[1]], [6.2, 'CHANNEL 6', tv[2]]],
        end: () => { p.h.root.rotation.x = 0; p.pos.y = 0; this.unlock(this.row('NAR_C0_TVBulletin')); this.filesRead.push('NAR_C0_TVBulletin'); },
      },
      { // 2. to the window; sirens a long way off
        dur: 4.5, start: () => { p.pos.set(42.8, 0, 35.8); p.autoWalk = V(44, 0, 38.9); G.audio.tone(700, 3.5, { gain: 0.03, slideTo: 900 }); },
        cam: [V(41.2, 1.9, 32.2)], look: [V(44, 1.4, 38.8)], fov: 44,
      },
      { // 3. the curtains
        dur: 3.8, start: () => { p.autoWalk = null; p.pos.set(44, 0, 38.9); p.yaw = 0; },
        cam: [V(42.4, 1.6, 37.4)], look: [V(44.3, 1.5, 39.6)], fov: 40,
        update: (k) => {
          for (const c of L.curtains) c.position.x = c.userData.closedX + (c.userData.openX - c.userData.closedX) * Math.min(1, k * 1.6);
          p.h.armR.sh.rotation.set(-1.3, 0, 0.5); p.h.armL.sh.rotation.set(-1.3, 0, -0.5);
          L.windowGlow.material.opacity = 0.85 * Math.max(0, 1 - k * 2) + 0.15;
        },
      },
      { // 4. what he sees: the street, walking wrong
        dur: 7.5, cam: [V(44, 7.5, 41.5), V(44, 7.3, 41.9)], look: [V(43, 0.8, 49), V(44.5, 0.8, 49.5)], fov: 46,
        update: (k, dt) => this.streetLife(dt),
      },
      { // 5. one drags a foot past a car with its windows gone
        dur: 5.2, start: () => { const e = this.street[0]; e.scripted = true; e.pos.set(31, 0, 44.2); },
        cam: [V(38, 1.0, 42.2), V(37.8, 1.0, 42.3)], look: [V(34, 1.2, 44.4), V(36.5, 1.2, 45.2)], fov: 40,
        update: (k, dt) => { this.shamble(this.street[0], 40, 45.6, 0.55, dt); this.streetLife(dt); },
        end: () => { this.street[0].scripted = false; },
      },
      { // 6. one kneels at an open door, feeding
        dur: 4.6, start: () => { const e = this.street[1]; e.scripted = true; e.pos.set(27.5, 0, 46.6); e.state = 'feeding'; e.yaw = Math.PI * 0.75; e.h.root.rotation.y = e.yaw; },
        cam: [V(30.8, 1.2, 49.4), V(30.4, 1.1, 49.0)], look: [V(27.4, 0.6, 46.2)], fov: 36,
        update: (k, dt) => this.streetLife(dt),
      },
      { // 7. a man runs; a big one runs faster
        dur: 5.4, start: () => {
          civ = new Npc(LOOK.runner, 8, 50, Math.PI / 2).walk([[70, 51]], 5.4);
          runner = this.husk({ x: 1, z: 49.5, build: 'worker', state: 'idle' }); runner.scripted = true; this.street.push(runner);
          G.audio.noise(0.6, { freq: 900, q: 1, gain: 0.3, pos: V(20, 1.5, 50) });
        },
        cam: [V(24, 2.2, 56), V(30, 2.0, 56)], look: [V(14, 1.2, 50), V(40, 1.2, 50.5)], fov: 50,
        update: (k, dt) => { this.shamble(runner, civ.pos.x - 1.5, civ.pos.z, 5.0, dt); this.streetLife(dt); },
        end: () => { civ.remove(); runner.scripted = false; runner.pos.set(66, 0, 52); },
      },
      { // 8. a car alarm somewhere. Leon at the glass.
        dur: 4.8, start: () => { this.alarmSound(V(52, 1, 51.5), 5); p.pos.set(44, 0, 38.3); p.yaw = 0; },
        cam: [V(44.45, 1.74, 39.55), V(44.4, 1.74, 39.5)], look: [V(44, 1.7, 38.3)], fov: 34,
        lines: [[2.0, ...this.say('DLG_C0_Window', 0)]], update: (k, dt) => { p.yaw = 0; this.streetLife(dt); },
      },
      { // 9. three knocks at the door
        dur: 4.2, start: () => { p.yaw = Math.PI; this.knock(3); }, cam: [V(45.6, 1.7, 39.2)], look: [V(44, 1.4, 31)], fov: 46,
      },
    ], () => {
      this.unlock(this.row('DLG_C0_Window_01'));
      G.flags.FLG_C0_WindowSeen = true;
      p.flashOn = false;
      this.knockT = 6;
      this.objective('OBJ_C0_04');
      G.ui.toast('Someone is at the door.', 3);
      this.saveGame('morning');
    });
  }

  takeFlask() {
    const L = G.level, p = G.player;
    this.holdingFlask = true;
    G.audio.pickup();
    L.flask.visible = false;
    this.handFlask = L.flask.clone(); this.handFlask.visible = true;
    this.handFlask.position.set(0, 0.06, 0); this.handFlask.rotation.set(Math.PI / 2, 0, 0);
    p.h.armR.grip.add(this.handFlask);
    G.ui.toast('Leon weighs the flask. Steel, half full. It will do.', 4);
    addUpdater(() => {
      if (!this.holdingFlask) return false;
      if (G.mode === 'play') { p.h.armR.sh.rotation.set(-2.3, 0, 0.35); p.h.armR.elbow.rotation.x = -1.0; }
      return true;
    });
  }

  // ======================================================
  // CS_C0_Door: the knock, the flask, and Ortiz
  // ======================================================
  doorScene() {
    const p = G.player, L = G.level;
    const say = (i) => this.say('DLG_C0_Door', i);
    const ortiz = this.npcs.ortiz = new Npc(LOOK.ortiz, 44, 28.9, 0);
    const gun = G.weapons.makeHandgun(); ortiz.h.armR.grip.add(gun);
    const key = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.06), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
    const knife = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.26), new THREE.MeshStandardMaterial({ color: 0x8a8e90, metalness: 0.9, roughness: 0.3 }));
    let swing = 0;
    const raise = () => { p.h.armR.sh.rotation.set(-2.6 + swing * 1.4, 0, 0.35 - swing * 0.3); p.h.armR.elbow.rotation.x = -1.0 + swing * 0.7; };
    p.pos.set(44, 0, 31.0); p.yaw = Math.PI; p.vel.set(0, 0, 0);
    // two-shot staging once she is inside: Leon by the bed, Ortiz by the table
    const face = () => { p.pos.set(43.6, 0, 33.2); p.yaw = Math.PI / 4; ortiz.route = []; ortiz.pos.set(45.0, 0, 34.6); ortiz.face(43.6, 33.2); };
    const CAM_ORTIZ = [V(42.61, 1.75, 32.77)], LOOK_ORTIZ = [V(45.0, 1.6, 34.6)];
    const CAM_LEON = [V(45.43, 1.72, 35.59)], LOOK_LEON = [V(43.6, 1.68, 33.2)];
    const CAM_HAND = [V(45.86, 1.35, 32.34)], LOOK_HAND = [V(44.3, 1.15, 33.9)];
    this.play([
      { // 1. at the door, flask up
        dur: 3.4, start: () => this.knock(2), cam: [V(45.4, 1.5, 32.6)], look: [V(44, 1.7, 30.6)], fov: 40, update: raise,
      },
      { // 2. the door opens and the flask comes down, and stops
        dur: 2.8, start: () => { L.openDoor('r304', V(44, 0, 31)); },
        cam: [V(43.3, 1.6, 28.3), V(43.4, 1.6, 28.5)], look: [V(44, 1.7, 31.0)], fov: 44,
        update: (k) => { swing = k < 0.5 ? k * 1.2 : 0.6; raise(); if (k > 0.45 && !ortiz.flinch) { ortiz.flinch = true; G.audio.knife(); } ortiz.h.armL.sh.rotation.set(-2.2, 0, -0.4); },
      },
      { dur: 3.2, cam: [V(44.4, 1.65, 30.6)], look: [V(44, 1.62, 28.9)], fov: 32, lines: [[0.2, ...say(0)]], update: () => { raise(); ortiz.h.armL.sh.rotation.set(-2.2, 0, -0.4); } },
      { dur: 3.0, cam: [V(43.7, 1.7, 29.6)], look: [V(44, 1.78, 31.0)], fov: 32, lines: [[0.3, ...say(1)]], update: (k) => { swing = 0.6 + k * 0.4; raise(); } },
      { dur: 3.6, cam: [V(44.4, 1.65, 30.6)], look: [V(44, 1.62, 28.9)], fov: 32, lines: [[0.2, ...say(2)]],
        end: () => { this.holdingFlask = false; if (this.handFlask) this.handFlask.parent?.remove(this.handFlask); L.flask.position.set(45.2, 0.55, 30.7); L.flask.visible = true; } },
      { // 6. she comes in; Leon shuts the door behind her
        dur: 6.4, start: () => { ortiz.walk([[44, 30.6], [44.5, 32.6], [45.0, 34.6]], 1.3); p.autoWalk = V(43.6, 0, 33.2); },
        cam: [V(42.6, 2.1, 36.2)], look: [V(44.4, 1.3, 31.6)], fov: 46, lines: [[0.8, ...say(3)]],
        update: (k) => { if (k > 0.5 && L.doors.r304.open) L.closeDoor('r304'); if (!ortiz.busy) ortiz.face(43.6, 33.2); },
      },
      { dur: 2.6, start: () => { p.autoWalk = null; face(); }, cam: CAM_LEON, look: LOOK_LEON, fov: 34, lines: [[0.3, ...say(4)]] },
      { dur: 5.2, cam: CAM_ORTIZ, look: LOOK_ORTIZ, fov: 34, lines: [[0.3, ...say(5)]] },
      { // 9. the sidearm, thirty rounds
        dur: 5.2, start: () => { gun.position.set(0, 0, 0); }, cam: CAM_HAND, look: LOOK_HAND, fov: 50, lines: [[0.3, ...say(6)]],
        update: () => { ortiz.h.armR.sh.rotation.set(-1.2, 0, 0.1); p.h.armR.sh.rotation.set(-1.0, 0, 0.1); },
      },
      { dur: 3.2, start: () => { ortiz.h.armR.grip.remove(gun); ortiz.h.armL.grip.add(knife); knife.rotation.x = Math.PI / 2; }, cam: CAM_HAND, look: LOOK_HAND, fov: 50, lines: [[0.3, ...say(7)]],
        update: () => { ortiz.h.armL.sh.rotation.set(-1.2, 0, -0.1); }, end: () => ortiz.h.armL.grip.remove(knife) },
      { dur: 2.8, start: () => { p.unarmed = false; }, cam: CAM_LEON, look: LOOK_LEON, fov: 34, lines: [[0.3, ...say(8)]] },
      { dur: 4.8, cam: CAM_ORTIZ, look: LOOK_ORTIZ, fov: 34, lines: [[0.3, ...say(9)]] },
      { // 13. Ortiz at the window: they forget
        dur: 6.8, start: () => { ortiz.walk([[44.6, 38.4]], 1.2); }, cam: [V(42.2, 1.8, 35.0), V(42.3, 1.8, 35.2)], look: [V(44.4, 1.6, 38.4)], fov: 42, lines: [[1.2, ...say(10)]],
        update: () => { if (!ortiz.busy) ortiz.yaw = 0; p.yaw = Math.atan2(1.0, 5.2); },
      },
      { // 14. the key
        dur: 5.8, start: () => { ortiz.pos.set(44.6, 0, 38.4); ortiz.face(43.6, 33.2); ortiz.h.armR.grip.add(key); p.yaw = Math.atan2(1.0, 5.2); },
        cam: [V(43.03, 1.75, 32.29)], look: [V(44.6, 1.5, 38.4)], fov: 40, lines: [[0.3, ...say(11)]],
        update: (k) => { if (k > 0.6) { ortiz.h.armR.grip.remove(key); } },
      },
    ], () => {
      for (const r of this.rows('DLG_C0_Door')) this.unlock(r);
      G.flags.FLG_C0_Armed = true;
      p.unarmed = false;
      G.weapons.mag.handgun = 9; G.items.add('ammo9', 21);
      G.items.keys.add('carKey');
      ortiz.h.armR.grip.add(gun); ortiz.pose = { aim: -0.6 };
      L.openDoor('r304', V(44, 0, 31), true);
      this.objective('OBJ_C0_05');
      G.ui.toast('Pistol, 30 rounds. Each Husk takes a different number: big ones take more, and a head shot saves bullets.', 7);
      setTimeout(() => G.ui.toast('Husks only come for what they see. Crouch (C), stay out of sight, and if one spots you, break its line of sight and wait.', 7), 7500);
      // Ortiz leads: out of the room, down the corridor, to the stairwell door
      ortiz.walk([[44.5, 31.2], [44.2, 28.2], [64.6, 28.2]], 1.5);
      this.saveGame('armed');
    });
  }

  // ======================================================
  // CS_C0_Stairwell: too many coming up
  // ======================================================
  stairwell() {
    const p = G.player, L = G.level, ortiz = this.npcs.ortiz;
    const say = (i) => this.say('DLG_C0_Stairwell', i);
    const climbers = [this.husk({ x: 70.3, z: 31.5, build: 'normal', state: 'idle' }), this.husk({ x: 68.8, z: 31.7, build: 'worker', state: 'idle' }), this.husk({ x: 69.6, z: 31.9, build: 'frail', state: 'idle' })];
    L.openDoor('stair3', V(64, 0, 28), true);
    const leaves = L.doors.stair3.leaves; leaves.forEach(l => { l.visible = false; }); // keep the doorway clear for the cameras
    p.pos.set(65.2, 0, 28.0); p.yaw = Math.PI / 2; p.crouch = true;
    ortiz.route = []; ortiz.pos.set(67.6, 0, 26.4); ortiz.face(69.5, 31); ortiz.pose = { aim: -0.5 };
    // both shots look through the open stairwell door (the gap is z 27..29 on the line x = 66)
    const CAM_O = [V(64.4, 1.7, 28.5)], LOOK_O = [V(67.6, 1.6, 26.4)];
    this.play([
      { dur: 4.2, start: () => G.audio.groan(V(69.5, 1.4, 31.5), 0.9, 0.6), cam: [V(67.2, 2.5, 22.6)], look: [V(69.5, 1.0, 30.8)], fov: 50,
        update: (k, dt) => climbers.forEach((e, i) => this.shamble(e, 69 + i * 0.5, 30.0 - i * 0.3, 0.5, dt)) },
      { dur: 3.6, start: () => ortiz.face(65.2, 28.0), cam: CAM_O, look: LOOK_O, fov: 34, lines: [[0.2, ...say(0)]] },
      { dur: 1.8, cam: [V(67.9, 1.65, 26.9)], look: [V(65.2, 1.2, 28.0)], fov: 36, lines: [[0.1, ...say(1)]], start: () => { p.flashOn = true; } },
      { dur: 3.4, cam: CAM_O, look: LOOK_O, fov: 34, lines: [[0.2, ...say(2)]],
        end: () => { G.audio.gunshot('handgun'); setTimeout(() => G.audio.gunshot('handgun'), 300); ortiz.pose = {}; ortiz.walk([[69, 25], [69.2, 22.4]], 3.6); } },
      { // 5. they follow her up and do not see him behind the door
        dur: 5.6, cam: [V(64.0, 1.2, 28.8)], look: [V(68.5, 1.3, 26.5)], fov: 50,
        update: (k, dt) => climbers.forEach((e, i) => this.shamble(e, 69 + i * 0.4, 22.6, 1.2, dt)),
      },
    ], () => {
      for (const r of this.rows('DLG_C0_Stairwell')) this.unlock(r);
      this.clearEnemies(climbers);
      leaves.forEach(l => { l.visible = true; });
      ortiz.remove(); delete this.npcs.ortiz;
      G.flags.FLG_C0_Split = true;
      L.closeDoor('stair3');
      p.crouch = true;
      this.teleport(14.6, 33.2, -Math.PI / 2, 'ground', () => {
        p.flashOn = true;
        this.objective('OBJ_C0_06');
        setTimeout(() => this.optional('OBJ_C0_09'), 3000);
        G.ui.toast('Down in the lobby. The garage stairs are through the back office, behind the front desk.', 5);
        this.saveGame('lobby');
      });
    });
  }

  // ======================================================
  // Garage P2 and the bay 14 puzzle (PZL_C0_Bay14)
  // ======================================================
  enterGarage() {
    const p = G.player;
    G.flags.FLG_C0_GarageReached = true;
    this.teleport(26.3, -20.2, -Math.PI / 2, 'garage', () => {
      p.flashOn = true;
      if (!this.garageSpawned) {
        this.garageSpawned = true;
        this.husk({ x: -4, z: -35, build: 'normal', state: 'wander', patrol: [[-4, -35], [-14, -35], [-14, -23], [-4, -23]] });
        this.husk({ x: 10, z: -36.5, build: 'worker', state: 'wander', patrol: [[10, -36.5], [-10, -36.5]] });
        this.husk({ x: -17, z: -37, build: 'frail', yaw: 0.6, state: 'idle' });
        this.husk({ x: 6, z: -23, build: 'normal', yaw: -Math.PI / 2, state: 'idle' });
        this.husk({ x: 16.5, z: -28, build: 'frail', yaw: Math.PI, state: 'feeding' });
      }
      this.objective('OBJ_C0_07');
      this.saveGame('garage');
    });
  }

  alarmSound(pos, secs) {
    const n = Math.round(secs * 2.5);
    for (let k = 0; k < n; k++) setTimeout(() => G.audio.tone(k % 2 ? 1100 : 760, 0.38, { type: 'square', gain: 0.07, pos }), k * 400);
  }

  tryCar(car) {
    const g = this.garage;
    if (car.bay === 11) { G.ui.toast('A red hatchback in bay 11. Not a pool car.'); return; }
    if (car.bay !== 14) {
      g.alarms++;
      const pos = car.position.clone().setY(1);
      this.alarmSound(pos, 8);
      makeNoise(pos, 30, 'gunshot');
      let t = 0;
      addUpdater((dt) => { t += dt; const on = Math.floor(t * 2.5) % 2 === 0 && t < 8; car.userData.head.emissiveIntensity = on ? 2 : 0; car.userData.tail.emissiveIntensity = on ? 2 : 0; return t < 8.2; });
      G.ui.toast('Wrong car. The alarm screams across the level.', 4);
      this.carHint(g.alarms >= 2 ? 3 : 2);
      return;
    }
    this.carScene(car);
  }

  carHint(n) {
    const g = this.garage;
    if (n <= g.hint) return;
    g.hint = n;
    const hints = [null, 'Bays twelve to sixteen. The reserved row.', 'The fob chirps when you are close. Listen for it.', 'Far wall, fourth car from the ramp. Bay fourteen.'];
    G.ui.toast(hints[n], 6);
  }

  // ======================================================
  // CS_C0_Car: bay fourteen, Ortiz, the ramp
  // ======================================================
  carScene(car) {
    const p = G.player, L = G.level;
    const say = (i) => this.say('DLG_C0_Car', i);
    const ortiz = new Npc(LOOK.ortiz, 23.6, -18, -Math.PI / 2);
    G.flags.FLG_C0_InCar = true;
    for (const e of G.enemies) if (e.alive && e.state === 'chase') { e.state = 'idle'; e.aware = 0; }
    p.pos.set(car.position.x + 1.3, 0, car.position.z + 0.4); p.yaw = Math.PI;
    car.userData.head.emissiveIntensity = 2;
    let crew = [];
    const W = (x, y, z) => [car.localToWorld(V(x, y, z))]; // a point in the car's own frame
    this.play([
      { dur: 5.2, start: () => { G.audio.door(car.position); ortiz.walk([[18, -18.5], [9, -20.5], [-1.5, -28], [-1.2, -37.6]], 4.2); },
        cam: [V(car.position.x + 5.5, 1.7, car.position.z + 7.5)], look: [V(car.position.x, 1.0, car.position.z), V(car.position.x + 1, 1.0, car.position.z + 1)], fov: 48,
        update: (k) => { if (k > 0.3) p.h.root.visible = false; } },
      { dur: 2.6, start: () => { ortiz.remove(); crew = Drive.seatCrew(car); G.audio.door(car.position); }, cam: W(0.1, 1.42, 3.4), look: W(-0.42, 1.25, -0.3), fov: 38, lines: [[0.3, ...say(0)]] },
      { dur: 2.6, cam: W(-0.2, 1.42, 3.4), look: W(0.42, 1.3, -0.3), fov: 38, lines: [[0.2, ...say(1)]] },
      { dur: 4.8, start: () => { L.openDoor('ramp', null); }, cam: W(0, 1.5, 4.2), look: W(0, 1.2, -0.3), fov: 44, lines: [[0.3, ...say(2)]] },
      { dur: 3.0, start: () => G.audio.engine(car.position, 3), cam: [V(6, 1.6, -33)], look: [V(0, 0.9, -39), V(-12, 0.9, -31)], fov: 55,
        update: (k) => { car.position.x = 0 - k * 14; car.position.z = -40.5 + Math.sin(k * Math.PI / 2) * 10; car.rotation.y = -k * Math.PI / 2; },
        end: () => G.ui.fade(1) },
    ], () => {
      for (const r of this.rows('DLG_C0_Car')) this.unlock(r);
      for (const h of crew) car.remove(h.root);
      car.visible = false;
      this.objective('OBJ_C0_08');
      this.saveGame('drive');
      this.drive.start();
    });
  }

  // ======================================================
  // CS_C0_FieldOffice, the time cards, and the end of the Prologue
  // ======================================================
  fieldOffice() {
    const d = this.drive, car = d.car, p = G.player;
    const say = (i) => this.say('DLG_C0_HQ', i);
    const pruitt = new Npc(LOOK.pruitt, -166.4, -408, Math.PI / 2);
    let leon, ortiz;
    G.ui.boss(null);
    this.play([
      { dur: 4.6, cam: [V(-162, 2.6, -414)], look: [V(-152, 0.9, -408), V(-158, 0.9, -408.5)], fov: 46,
        update: (k) => { const x = -149 - k * 9.5; car.position.set(x, 0, -408.4); car.rotation.y = -Math.PI / 2; } },
      { dur: 3.0, start: () => {
          d.hideCrew();
          leon = new Npc(LOOK.leon, -158.8, -409.6, -Math.PI / 2); ortiz = new Npc(LOOK.ortiz, -158.8, -406.6, -Math.PI / 2);
          leon.walk([[-163.2, -408.8]], 1.3); ortiz.walk([[-163.4, -406.9]], 1.3); pruitt.walk([[-165.2, -408]], 1.0);
          G.audio.door(car.position);
        },
        cam: [V(-166.4, 1.7, -410.4)], look: [V(-162.5, 1.65, -408.6)], fov: 38, lines: [[0.8, ...say(0)]] },
      { dur: 2.2, cam: [V(-162.4, 1.7, -410.3)], look: [V(-165.2, 1.7, -408)], fov: 34, lines: [[0.2, ...say(1)]] },
      { dur: 5.2, start: () => { leon.face(-165.2, -408); ortiz.face(-165.2, -408); }, cam: [V(-162.4, 1.7, -409.8)], look: [V(-165.2, 1.7, -408)], fov: 34, lines: [[0.3, ...say(2)]] },
      { dur: 2.2, cam: [V(-165.6, 1.7, -409.6)], look: [V(-163.2, 1.75, -408.8)], fov: 34, lines: [[0.2, ...say(3)]] },
      { dur: 5.6, cam: [V(-162.4, 1.7, -409.8)], look: [V(-165.2, 1.7, -408)], fov: 34, lines: [[0.3, ...say(4)]] },
      { dur: 5.4, start: () => { ortiz.walk([[-166.6, -407.4], [-168.6, -408]], 1.2); pruitt.walk([[-168.6, -408.4]], 1.0); },
        cam: [V(-160.2, 1.7, -410.6), V(-160.6, 1.7, -410.4)], look: [V(-163.4, 1.6, -406.9), V(-167.6, 1.4, -407.8)], fov: 44, lines: [[0.6, ...say(5)]] },
      { dur: 3.2, start: () => { G.ui.fade(1); }, cam: [V(-160.6, 1.7, -410.4)], look: [V(-167.6, 1.4, -407.8)], fov: 44 },
    ], () => {
      for (const r of this.rows('DLG_C0_HQ')) this.unlock(r);
      G.flags.FLG_C0_Complete = true;
      this.timeCards();
    });
  }

  timeCards() {
    G.mode = 'cine';
    document.body.classList.add('cine');
    G.ui.fade(1);
    const cards = this.rows('DLG_C0_Cards');
    cards.forEach((r, i) => setTimeout(() => {
      const [time, ...rest] = r.text.split('. ');
      G.ui.titleCard(time, '', 4);
      G.ui.subtitle(null, rest.join('. '));
      this.unlock(r);
    }, 600 + i * 4800));
    setTimeout(() => { G.ui.subtitle(null, ''); this.finish(); }, 600 + cards.length * 4800);
  }

  finish() {
    G.mode = 'end';
    document.body.classList.remove('cine');
    document.exitPointerLock?.();
    G.ui.showHud(false);
    G.ui.boss(null);
    this.drive.stopEngine();
    const s = G.stats;
    const secs = Math.round((performance.now() - s.startTime) / 1000);
    document.getElementById('end-sub').textContent = 'Prologue complete';
    document.getElementById('end-title').textContent = 'Check-In';
    document.getElementById('end-note').textContent = 'At 22:30 Leon steps off Hank Doyle’s boat onto the north pier of Port Halvern, alone.';
    document.getElementById('end-stats').innerHTML = [
      [`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, 'Time'], [s.kills, 'Infected killed'], [`${Math.round(this.drive.hpLeft)}%`, 'Car left'], [`${this.filesRead.length}`, 'Files found'],
    ].map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('');
    document.getElementById('btn-next').hidden = false;
    document.getElementById('end-screen').hidden = false;
  }

  // ----- doors -----
  tryDoor(door) {
    const L = G.level, F = G.flags;
    if (door.id === 'r304' && F.FLG_C0_WindowSeen && !F.FLG_C0_Armed) {
      if (!this.holdingFlask) { G.ui.toast('Whatever is out there, Leon is not opening the door empty-handed.', 4); this.objHinted = false; return; }
      this.doorScene();
      return;
    }
    if (!door.locked) { L.openDoor(door.id, G.player.pos); return; }
    G.audio.locked();
    if (door.lock === 'checkin') G.ui.toast('Guests only past this point. Check in at the desk first.');
    else if (door.lock === 'barricade') G.ui.toast(F.FLG_C0_Split ? 'Chained from the inside. Something on the other side is leaning on the glass.' : 'The rain can wait. Check in first.');
    else if (door.lock === 'guest') G.ui.toast(F.FLG_C0_Slept ? 'Locked. Nothing answers.' : 'Locked. A television murmurs on the other side.');
    else if (door.lock === 'frank') { G.ui.toast(F.FLG_C0_Slept ? 'Something on the other side throws itself at the door.' : 'Locked.'); if (F.FLG_C0_Slept) G.audio.slam(V(door.x, 1.2, door.z)); }
    else if (door.lock === 'key304') {
      if (G.items.keys.has('roomKey')) { door.locked = false; door.lock = null; G.audio.success(); L.openDoor(door.id, G.player.pos); }
      else G.ui.toast('Room 304. The key card is at the front desk.');
    } else if (door.lock === 'ramp') G.ui.toast('The ramp gate only opens for cars leaving.');
  }

  // ----- save / load: the Prologue saves at checkpoints -----
  saveGame(cp = this.checkpoint) {
    const p = G.player, L = G.level;
    this.checkpoint = cp;
    this.save = {
      cp,
      player: { x: p.pos.x, z: p.pos.z, yaw: p.yaw, hp: Math.max(p.hp, 1), injuries: [...p.injuries], infection: p.infection, unarmed: p.unarmed, flash: p.flashOn },
      weapons: { owned: [...G.weapons.owned], mag: { ...G.weapons.mag }, current: G.weapons.current },
      items: G.items.snapshot(), keys: [...G.items.keys],
      enemies: cp === 'drive' ? [] : G.enemies.filter(e => !this.street.includes(e)).map(e => e.record()),
      doors: Object.fromEntries(Object.values(L.doors).map(d => [d.id, { open: d.open, locked: d.locked, lock: d.lock }])),
      flags: { ...G.flags }, played: [...this.played], visited: [...L.visited], obj: this.objId, files: [...this.filesRead],
      zone: L.zone, garage: { ...this.garage }, garageSpawned: !!this.garageSpawned,
    };
  }

  loadGame() {
    const s = this.save, p = G.player, L = G.level;
    if (!s) return;
    if (this.cine) { this.cine.onEnd = null; this.endCine(); }
    document.getElementById('dead-screen').hidden = true;
    p.hp = s.player.hp; p.injuries = new Set(s.player.injuries); p.infection = s.player.infection || 0;
    p.grab = null; p.healT = 0; p.deathT = null; p.stunT = 0; p.h.root.rotation.x = 0; p.h.root.position.y = 0; p.vel.set(0, 0, 0);
    p.crouch = false; p.control = true; p.camOverride = null; p.autoWalk = null; p.h.root.visible = true;
    p.unarmed = s.player.unarmed; p.flashOn = s.player.flash;
    G.weapons.owned = [...s.weapons.owned]; G.weapons.mag = { ...s.weapons.mag }; G.weapons.reloadT = 0;
    G.items.restore(s.items); G.items.keys = new Set(s.keys);
    G.flags = { ...s.flags };
    this.played = new Set(s.played); L.visited = new Set(s.visited); this.filesRead = [...s.files];
    this.garage = { ...s.garage }; this.garageSpawned = s.garageSpawned;
    G.ui.boss(null); G.ui.struggle(null); G.ui.subtitle(null, '');
    this.radioQueue = []; this.radioT = 0;
    if (s.cp === 'drive') {
      for (const e of [...G.enemies]) this.clearEnemies([e]);
      G.mode = 'play';
      this.objId = null; this.objective(s.obj);
      this.drive.start();
      return;
    }
    p.pos.set(s.player.x, 0, s.player.z); p.yaw = p.camYaw = s.player.yaw; p.camPitch = -0.08;
    for (const id in s.doors) {
      const d = L.doors[id], r = s.doors[id];
      if (d.kind === 'open') continue;
      d.open = r.open; d.locked = r.locked; d.lock = r.lock;
      d.collider.enabled = !r.open; d.target = r.open ? (d.target || 1) : 0;
    }
    const keep = new Set(this.street);
    this.clearEnemies(G.enemies.filter(e => !keep.has(e)));
    for (const rec of s.enemies) {
      const busy = ['chase', 'suspicious', 'grab'].includes(rec.state);
      const e = this.spawn({ ...rec.opts, x: rec.x, z: rec.z, yaw: rec.yaw, state: rec.alive ? (busy ? 'idle' : rec.state) : 'idle' });
      if (!rec.alive) { e.makeCorpse(); e.finished = true; e.waiting = false; if (rec.headless) { e.headless = true; e.h.head.visible = false; } }
      else e.hp = rec.hp;
    }
    L.setZone(s.zone);
    this.lastRoom = L.roomAt(p.pos.x, p.pos.z)?.id;
    this.objId = null; this.objective(s.obj);
    G.mode = 'play';
  }

  roomHasItems() { return false; }

  // ----- per frame -----
  triggers(dt, room) {
    const p = G.player, F = G.flags, L = G.level;
    // the knocking keeps on until he answers
    if (F.FLG_C0_WindowSeen && !F.FLG_C0_Armed) {
      this.knockT -= dt;
      if (this.knockT <= 0) { this.knockT = rand(6, 8); this.knock(3); }
    }
    // following Ortiz down the corridor
    const o = this.npcs.ortiz;
    if (F.FLG_C0_Armed && !F.FLG_C0_Split && o) {
      if (!o.busy && o.pos.x > 64 && p.pos.x > 61.5 && room === 'corridor') this.stairwell();
    }
    // room 309: Frank
    if (F.FLG_C0_Slept && !F.FLG_C0_Split && dist2D(p.pos, { x: 60, z: 26 }) < 4) {
      this.frankT = (this.frankT ?? 0) - dt;
      if (this.frankT <= 0) { this.frankT = rand(3, 5); G.audio.slam(V(60, 1.2, 26)); const d = L.doors.r309; d.leaves[0].rotation.y = d.leaves[0].userData.baseRot + 0.03; setTimeout(() => { d.leaves[0].rotation.y = d.leaves[0].userData.baseRot; }, 120); }
    }
    // the garage: the fob, and hints over time
    if (F.FLG_C0_GarageReached && !F.FLG_C0_InCar && room === 'garage') {
      const g = this.garage;
      g.t += dt;
      if (g.t > 45) this.carHint(1);
      if (g.t > 90) this.carHint(2);
      if (g.t > 150) this.carHint(3);
      const car = L.bays.find(c => c.bay === 14);
      const d = dist2D(p.pos, car.position);
      if (d < 6 && !g.chirped) {
        g.chirped = true;
        G.audio.tone(2400, 0.07, { gain: 0.12 }); setTimeout(() => G.audio.tone(2900, 0.09, { gain: 0.12 }), 110);
        car.userData.head.emissiveIntensity = 2.5; car.userData.tail.emissiveIntensity = 2.5;
        setTimeout(() => { car.userData.head.emissiveIntensity = 0; car.userData.tail.emissiveIntensity = 0; }, 450);
        if (!this.played.has('fobTold')) { this.played.add('fobTold'); G.ui.toast('The key fob chirps. Indicators flash on one of the grey sedans.', 4); }
      } else if (d > 9) g.chirped = false;
    }
  }

  onEnterRoom(room) {
    const F = G.flags;
    if (room === 'r304' && F.FLG_C0_CheckedIn && !F.FLG_C0_InRoom) {
      F.FLG_C0_InRoom = true;
      this.objective('OBJ_C0_03');
      G.ui.toast('Your phone has a voicemail on the nightstand.', 4);
    }
    if (room === 'office' && F.FLG_C0_Split) G.ui.toast('"He\'s quiet now," Ruth wrote.', 3);
  }

  update(dt) {
    super.update(dt);
    // the drive runs its own loop; the HQ cutscene starts at the gate
    if (this.drive.active && G.mode === 'play' && this.drive.car.position.x < -146 && !G.flags.FLG_C0_Complete) {
      this.drive.arrive();
      this.fieldOffice();
    }
  }
}
