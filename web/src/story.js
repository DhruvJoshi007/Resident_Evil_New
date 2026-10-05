// Chapter 1 "Quarantine": story beats, files, puzzles, cutscenes,
// save points and the Warden encounter. Follows docs/Chapters.md and docs/Cutscenes.md.
import * as THREE from 'three';
import { G, dist2D, rand, makeNoise, addUpdater } from './game.js';
import { Zombie, Warden } from './enemies.js';
import { mat } from './textures.js';

export const FILES = {
  nightlog: {
    title: 'Night Shift Log',
    body: `PRECINCT NIGHT SHIFT LOG, SGT. O. PIKE

21:40. Third "riot" call from Kettle Street. Units report people biting. Biting.

23:15. Chief Dunn ordered the armoury sealed. He took the three medallions off the old courthouse doors and hid them around the building himself. Says nobody gets a rifle without his say-so.

23:50. Found the Chief in the Statue Hall, talking to that bronze lion like it was a suspect. "The lion faces the one who judges," he kept saying. Then he laughed. I don't think he's slept in two days.`,
  },
  missing: {
    title: 'Missing Person Report',
    body: `MISSING PERSON: THEO KESSLER, 24
Employer: Veyl Biomedical (laboratory technician)
Last contact: 3 days ago, voicemail to sister.
Reported by: Mara Kessler, Harrow Bay Search and Rescue.

Desk note, unsigned: "Do not file. Veyl legal says this one goes to them."`,
  },
  memo: {
    title: 'Memo: Quarantine Order',
    body: `FROM: OFFICE OF THE MAYOR
TO: ALL HARROW BAY POLICE PERSONNEL

Effective immediately the city is under quarantine. The perimeter is held by federal units.

Do NOT engage Veyl Biomedical personnel. Do NOT test the municipal water. Do NOT speak to the press.

Officers showing fever, grey veins or nosebleeds are to report to St. Marrow General for "vaccination".`,
  },
  hale: {
    title: "Officer Hale's Notebook",
    body: `Locker codes keep changing so I just use my badge number for everything. 0-4-1-7. If Dunn reads this, sorry, Chief.

Day 2. Drank from the tap in the break room. Should have listened to the memo.

Day 3. Bitten on Kettle Street. Wrapped it. Fever. Can't stop thinking about how hungry I am.`,
  },
  wiring: {
    title: 'Archives Wiring Diagram',
    body: `EAST WING BREAKER SCHEDULE (hand-corrected)

A: Holding cells (DO NOT ENGAGE, shorts the main)
B: East corridor lighting
C: Old courtroom (disconnected, trips the main)
D: Interrogation lock relay
E: Interrogation lighting

For the interrogation suite, throw B, D and E only. Anything else and the main trips.`,
  },
  dunn: {
    title: "Chief Dunn's Diary",
    body: `Veyl paid for the new wing. Now they tell us what to do.

Their "security consultant" came by with a list of names. Kessler was on it, the young one from the lab. They said he stole something. I've seen the boy's file. He's not a thief. He's a witness.

I locked the Warden in with the worst of the sick ones. God forgive me. He was the toughest man in this building. If anyone can hold that cell block, it's him.

The cell key stays here with me.`,
  },
  voicemail: {
    title: 'Voicemail: Theo (3 days ago)',
    body: `[Audio transcript, phone found on the reception desk]

"Mara, it's me. Don't come to the city. I mean it. I found something at work, something in the water reports, and they know I found it. If anyone from Veyl calls you, you haven't heard from me.

I love you. Don't come."`,
  },
};

const LINES = {
  pike: [
    ['PIKE', "Hey! You on the ground floor! Sergeant Pike, radio tower. You're the first living thing I've seen in two days."],
    ['MARA', "I'm looking for Theo Kessler. Twenty-four, dark hair. He works at Veyl."],
    ['PIKE', "Kid, I'm looking at a city full of folks nobody's looking for. But I'll help you."],
    ['PIKE', "The Chief's armoury, off the Statue Hall. He locked it with three medallions. Find them and you'll get something bigger than that pea-shooter."],
  ],
};

export class Story {
  constructor() {
    this.filesRead = [];
    this.save = null;
    this.lastRoom = null;
    this.currentInteract = null;
    this.radioQueue = []; this.radioT = 0;
    this.cine = null;
    this.lionFacing = 0;
    this.breakers = [0, 0, 0, 0, 0];
    this.placed = new Set();
  }

  fileTitle(id) { return FILES[id]?.title || id; }

  readFile(id, fromMenu) {
    if (!this.filesRead.includes(id)) this.filesRead.push(id);
    const f = FILES[id];
    G.audio.pickup();
    G.ui.showFile(f.title, f.body);
    if (fromMenu) this.returnToInventory = true;
  }

  // ----------------------------------------------------------
  setup() {
    const I = G.items;
    const z = (o) => new Zombie(o);
    // Kettle Street
    I.crate(3, 44); I.crate(-12.5, 30, { id: 'ammo9', qty: 6 });
    I.spawn({ id: 'herbG', x: 11.6, z: 48.6 });
    I.spawn({ id: 'ammo9', qty: 6, x: -7.2, z: 34.5 });
    z({ x: 11.2, z: 47.6, yaw: 0.3, state: 'feeding' });
    z({ x: -3, z: 30, state: 'wander' });
    // Lobby (safe room)
    I.spawn({ file: 'nightlog', x: -2, z: 12.4, y: 1.1 });
    I.spawn({ file: 'missing', x: 2.2, z: 12.4, y: 1.1 });
    I.spawn({ id: 'phone', file: 'voicemail', x: 0.6, z: 12.3, y: 1.1, label: 'Listen to the voicemail' });
    I.spawn({ id: 'herbG', x: -7.2, z: 18.8 });
    I.crate(6.8, 9.3);
    this.recorder(-6.6, 9.2, 'lobby');
    // West Office
    I.spawn({ file: 'memo', x: -20.4, z: 11.4, y: 0.79 });
    I.spawn({ id: 'ammo9', qty: 8, x: -20.6, z: 16.5, y: 0.79 });
    I.crate(-10, 9.5);
    this.hale = z({ x: -12, z: 16.7, yaw: Math.PI, state: 'dormant', name: 'hale', clothes: { top: 0x26344a, bottom: 0x1c2230 }, onDeath: (e) => I.spawn({ file: 'hale', x: e.pos.x + 0.4, z: e.pos.z }) });
    z({ x: -21, z: 18.5, state: 'idle', yaw: 1 });
    this.locker();
    // Archives
    I.spawn({ file: 'wiring', x: 22.6, z: 9.4 });
    I.spawn({ id: 'ammo9', qty: 6, x: 9.4, z: 19 });
    I.crate(23, 19); I.crate(10, 9.6);
    z({ x: 13.5, z: 12, state: 'wander' });
    z({ x: 19.5, z: 18, state: 'idle', yaw: -1 });
    // Statue Hall
    this.lion();
    this.medallionSlots();
    this.recorder(4.6, -9.3, 'hall');
    I.spawn({ id: 'herbG', x: -7.2, z: -9.2 });
    I.crate(7, 6.8);
    z({ x: -5, z: -6, state: 'idle', yaw: 2 });
    // East Hall
    this.fuseBox();
    I.crate(22.6, 6.6);
    I.spawn({ id: 'herbR', x: 9.4, z: -9.2 });
    z({ x: 14, z: -4, state: 'wander' });
    // Interrogation
    this.box(22.5, -24.5, 0.9, 0.6, 0.85, mat('metal', { repeat: 1 }), 'metal');
    I.spawn({ id: 'medalSerpent', key: true, x: 22.5, z: -24.5, y: 0.86 });
    I.spawn({ id: 'bandage', x: 11.5, z: -25 });
    I.spawn({ id: 'ammo9', qty: 6, x: 16.4, z: -18, y: 0.8 });
    z({ x: 19, z: -14, state: 'fakeDead', yaw: 0.5 });
    z({ x: 12.5, z: -22.5, state: 'idle', yaw: -2 });
    // Chief's Armoury (special room)
    I.spawn({ id: 'shotgun', x: -16.6, z: -1, y: 0.9 });
    I.spawn({ id: 'cellKey', key: true, x: -15, z: -1.2, y: 0.9, onPick: () => this.objective('Use the Cell Block Key on the north door of the Statue Hall.') });
    I.spawn({ id: 'shells', qty: 8, x: -17.3, z: -1.3, y: 0.9 });
    I.spawn({ file: 'dunn', x: -15.6, z: -0.6, y: 0.9 });
    I.spawn({ id: 'herbR', x: -22.8, z: 7 });
    I.spawn({ id: 'herbG', x: -22.8, z: 6.2 });
    // Cell Block
    I.crate(-10, -12); I.crate(-17, -38); I.crate(-3, -38.5);
    I.spawn({ id: 'ammo9', qty: 8, x: -3, z: -12.5 });
    I.spawn({ id: 'herbG', x: -17.5, z: -12.3 });
    this.warden = new Warden({ x: -9, z: -33, yaw: 0, state: 'dormant' });
    for (const zz of [-13, -25, -37]) z({ x: 3.6, z: zz, state: 'caged', yaw: -Math.PI / 2 });
  }

  box(x, zz, w, d, h, m, surface) {
    return G.level.box(x, zz, w, d, h, m, { surface });
  }

  recorder(x, zz, id) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: 0x3a3428, roughness: 0.6 }));
    body.position.y = 0.95;
    const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 16), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    reel.position.set(-0.1, 1.11, 0); const reel2 = reel.clone(); reel2.position.x = 0.1;
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), new THREE.MeshBasicMaterial({ color: 0x5fbf6a }));
    lamp.position.set(0.2, 1.02, 0.15);
    const table = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.5), mat('wood', { repeat: 1 }));
    table.position.y = 0.4;
    g.add(body, reel, reel2, lamp, table);
    g.position.set(x, 0, zz);
    G.scene.add(g);
    const light = new THREE.PointLight(0x9fd0a0, 1.5, 3, 2); light.position.set(x, 1.4, zz); G.scene.add(light);
    G.colliders.push({ minX: x - 0.35, maxX: x + 0.35, minZ: zz - 0.25, maxZ: zz + 0.25 });
    G.level.interacts.push({ pos: new THREE.Vector3(x, 1, zz), radius: 1.8, label: 'Record progress on the radio recorder', enabled: () => true, action: () => this.recordSave() });
  }

  recordSave() {
    this.saveGame();
    G.stats.saves++;
    G.audio.save();
    G.ui.toast('Progress recorded. If Mara dies, you will continue from here.');
  }

  // ----- puzzles -----
  lion() {
    const bronze = new THREE.MeshStandardMaterial({ color: 0x6a5230, metalness: 0.85, roughness: 0.38 });
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.6, 6, 12), bronze); body.rotation.x = Math.PI / 2; body.position.y = 0.5;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), bronze); head.position.set(0, 0.78, 0.5);
    const mane = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.09, 8, 18), bronze); mane.position.set(0, 0.76, 0.44);
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.14), bronze); jaw.position.set(0, 0.66, 0.66);
    g.add(body, head, mane, jaw);
    for (const [x, zz] of [[-0.15, 0.35], [0.15, 0.35], [-0.15, -0.35], [0.15, -0.35]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.45, 8), bronze); leg.position.set(x, 0.22, zz); g.add(leg);
    }
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.5, 6), bronze); tail.position.set(0, 0.5, -0.6); tail.rotation.x = -0.8; g.add(tail);
    g.traverse(c => { if (c.isMesh) { c.castShadow = true; } });
    g.position.set(0, 1.0, -1);
    G.scene.add(g);
    this.lionMesh = g;
    G.level.interacts.push({
      pos: new THREE.Vector3(0, 1, -1), radius: 2.2,
      label: () => 'Turn the lion statue',
      enabled: () => !G.flags.lionSolved,
      action: () => {
        this.lionFacing = (this.lionFacing + 1) % 4;
        G.audio.noise(0.8, { freq: 200, q: 3, gain: 0.5, sweepTo: 120 });
        if (this.lionFacing === 2) {
          G.flags.lionSolved = true;
          setTimeout(() => {
            G.audio.success();
            G.ui.toast('The lion faces the judge\'s bench. Something drops from its jaw.');
            G.items.spawn({ id: 'medalLion', key: true, x: 0.55, z: -1.75, y: 1.0 });
          }, 900);
        }
      },
    });
  }

  locker() {
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.9, 0.55), new THREE.MeshStandardMaterial({ color: 0x6a7a80, metalness: 0.6, roughness: 0.4 }));
    door.position.set(-23.22, 1.0, 10.4);
    G.scene.add(door);
    this.lockerDoor = door;
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.08), new THREE.MeshBasicMaterial({ color: 0xd8d0b8 }));
    tag.position.set(-23.19, 1.6, 10.4); tag.rotation.y = Math.PI / 2; G.scene.add(tag);
    G.level.interacts.push({
      pos: new THREE.Vector3(-23, 1, 10.4), radius: 1.8,
      label: 'Try locker 12',
      enabled: () => !G.flags.lockerOpen,
      action: () => G.ui.showKeypad((code) => {
        if (code !== '0417') { G.audio.error(); return false; }
        G.flags.lockerOpen = true;
        G.ui.closeModal();
        G.audio.success();
        door.rotation.y = 1.4; door.position.x += 0.2; door.position.z += 0.25;
        G.items.spawn({ id: 'medalOwl', key: true, x: -22.8, z: 10.4, y: 1.0 });
        return true;
      }),
    });
  }

  fuseBox() {
    const boxMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.8, 0.6), mat('metal', { repeat: 1, color: 0x8a9090 }));
    boxMesh.position.set(23.75, 1.4, 0);
    G.scene.add(boxMesh);
    this.fuseLamp = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xb3261e }));
    this.fuseLamp.position.set(23.64, 1.85, 0.2); G.scene.add(this.fuseLamp);
    G.level.interacts.push({
      pos: new THREE.Vector3(23.4, 1.2, 0), radius: 1.8,
      label: 'Open the fuse box',
      enabled: () => !G.flags.power,
      action: () => G.ui.showBreakers(this.breakers, (k) => { this.breakers[k] ^= 1; G.audio.ui(); }, () => this.engageBreakers()),
    });
  }

  engageBreakers() {
    const ok = this.breakers.join('') === '01011';
    G.ui.closeModal();
    if (!ok) {
      G.audio.sparks(new THREE.Vector3(23.6, 1.4, 0));
      G.weapons.sparks(new THREE.Vector3(23.6, 1.6, 0), 0xffd080, 14, new THREE.Vector3(-1, 0, 0));
      makeNoise(G.player.pos, 9, 'crate');
      G.ui.toast('The main trips with a bang. Wrong combination.');
      return;
    }
    this.powerOn();
    G.audio.success();
    G.ui.toast('Power restored. The interrogation lock clicks open.');
  }

  powerOn() {
    G.flags.power = true;
    const R = G.level.room('interro');
    R.lamp.visible = true; R.fixture.material.emissiveIntensity = 2.5;
    const d = G.level.doors.interro; d.locked = false; d.lock = null;
    this.fuseLamp.material.color.set(0x5fbf6a);
  }

  medallionSlots() {
    this.slotMeshes = {};
    const order = ['medalLion', 'medalOwl', 'medalSerpent'];
    order.forEach((id, k) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 20), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.6, roughness: 0.5 }));
      m.rotation.z = Math.PI / 2; m.position.set(-7.83, 1.7, 1.55 + k * 0.28);
      G.scene.add(m); this.slotMeshes[id] = m;
    });
  }

  updateSlots() {
    const col = { medalLion: 0xc8a040, medalOwl: 0xb0b8c0, medalSerpent: 0x6a9a5a };
    for (const id in this.slotMeshes) {
      const m = this.slotMeshes[id].material;
      m.color.set(this.placed.has(id) ? col[id] : 0x1a1a1a);
      m.metalness = this.placed.has(id) ? 0.9 : 0.6;
    }
  }

  // ----- doors -----
  tryDoor(door) {
    const L = G.level;
    if (!door.locked) { L.openDoor(door.id, G.player.pos); return; }
    if (door.lock === 'medallions') {
      const names = { medalLion: 'Lion', medalOwl: 'Owl', medalSerpent: 'Serpent' };
      const have = Object.keys(names).filter(k => G.items.keys.has(k));
      if (!have.length) {
        G.audio.locked();
        const left = Object.keys(names).filter(k => !this.placed.has(k)).map(k => names[k].toLowerCase());
        G.ui.toast(`The door has ${left.length} empty slot${left.length > 1 ? 's' : ''}: ${left.join(', ')}.`);
        return;
      }
      for (const k of have) { this.placed.add(k); G.items.keys.delete(k); }
      this.updateSlots();
      G.audio.success();
      if (this.placed.size === 3) {
        G.ui.toast('All three medallions are in place. The armoury unlocks.');
        setTimeout(() => L.openDoor('armory', G.player.pos), 700);
        this.objective('Search the Chief\'s armoury.');
      } else G.ui.toast(`Placed the ${have.map(k => names[k]).join(' and ')} Medallion. ${this.placed.size} of 3.`);
      return;
    }
    if (door.lock === 'power') { G.audio.locked(); G.ui.toast('An electronic lock. The panel is dead. There must be a fuse box nearby.'); return; }
    if (door.lock === 'cellkey') {
      if (G.items.keys.has('cellKey')) {
        G.items.keys.delete('cellKey');
        door.locked = false; door.lock = null;
        G.audio.success();
        this.saveGame(); // checkpoint before the boss
        L.openDoor(door.id, G.player.pos);
        G.ui.toast('Used the Cell Block Key.');
      } else { G.audio.locked(); G.ui.toast('Locked. The keyhole is stamped CELL BLOCK.'); }
      return;
    }
    if (door.lock === 'sealed') { G.audio.locked(); G.ui.toast('It will not open from this side.'); return; }
    G.audio.locked();
  }

  objective(text) { this.obj = text; G.ui.objective(text); }

  // ----- radio chatter that plays during gameplay -----
  radio(lines) { this.radioQueue.push(...lines); }

  updateRadio(dt) {
    if (this.cine) return;
    this.radioT -= dt;
    if (this.radioT <= 0) {
      const next = this.radioQueue.shift();
      if (next) {
        const [who, text] = next;
        G.ui.subtitle(who === 'PIKE' ? 'PIKE (radio)' : who, text);
        if (who === 'PIKE') G.audio.radio();
        this.radioT = 1.6 + text.length * 0.055;
      } else if (this.radioT < -0.1 && this.radioT > -1) { G.ui.subtitle(null, ''); this.radioT = -5; }
    }
  }

  // ----- cutscenes -----
  // shots: [{ dur, cam: [from, to], look: [from, to], fov, lines: [[t, who, text]], start(), update(k), end() }]
  play(shots, onEnd) {
    G.mode = 'cine';
    document.body.classList.add('cine');
    G.player.control = false;
    G.ui.struggle(null);
    this.cine = { shots, i: -1, t: 0, onEnd };
    this.nextShot();
  }

  nextShot() {
    const c = this.cine;
    const prev = c.shots[c.i];
    prev?.end?.();
    c.i++; c.t = 0; c.lineI = 0;
    const s = c.shots[c.i];
    if (!s) { this.endCine(); return; }
    s.start?.();
  }

  skipCine() {
    const c = this.cine;
    if (!c) return;
    while (this.cine === c && c.i < c.shots.length) {
      const s = c.shots[c.i];
      s.update?.(1);
      this.nextShot();
    }
  }

  endCine() {
    const c = this.cine;
    this.cine = null;
    document.body.classList.remove('cine');
    G.player.camOverride = null;
    G.player.control = true;
    G.player.autoWalk = null;
    G.ui.subtitle(null, '');
    G.ui.fade(0);
    G.mode = 'play';
    c.onEnd?.();
  }

  updateCine(dt) {
    const c = this.cine;
    const s = c.shots[c.i];
    if (!s) return;
    c.t += dt;
    const k = Math.min(1, c.t / s.dur);
    const e = k * k * (3 - 2 * k);
    if (s.cam) {
      const pos = new THREE.Vector3().lerpVectors(s.cam[0], s.cam[1], e);
      const look = new THREE.Vector3().lerpVectors(s.look[0], s.look[1] || s.look[0], e);
      G.player.camOverride = { pos, look, fov: s.fov || 50 };
    }
    s.update?.(k, dt);
    while (s.lines && c.lineI < s.lines.length && c.t >= s.lines[c.lineI][0]) {
      const [, who, text] = s.lines[c.lineI++];
      G.ui.subtitle(who, text);
      if (who?.includes('radio')) G.audio.radio();
    }
    if (c.t >= s.dur) this.nextShot();
  }

  introCutscene() {
    const p = G.player;
    const V = (x, y, zz) => new THREE.Vector3(x, y, zz);
    this.play([
      { dur: 9.5, start: () => { G.ui.fade(1); }, lines: [[0.4, 'SOLDIER', "City's closed. Turn around."], [3.0, 'MARA', "My brother's in there."], [5.6, 'SOLDIER', "Then he's not your problem anymore."]], cam: [V(0, 20, 64), V(0, 20, 64)], look: [V(0, 0, 36)] },
      { dur: 6.5, start: () => { G.ui.fade(0); G.ui.subtitle(null, ''); }, cam: [V(-4, 22, 64), V(2, 7.5, 52)], look: [V(0, 0, 32), V(0, 1.5, 38)], fov: 55 },
      {
        dur: 6, start: () => { p.pos.set(0, 0, 55.2); p.yaw = p.camYaw = Math.PI; p.autoWalk = new THREE.Vector3(0, 0, 50.5); },
        cam: [V(1.4, 1.1, 57.5), V(1.1, 1.7, 53.8)], look: [V(0, 1.2, 54), V(0, 1.4, 49)],
        lines: [[0.6, 'PHONE', 'Theo: 14 missed calls. All of them yours.'], [3.4, 'MARA', 'Hold on, Theo. I\'m coming.']],
        end: () => { p.pos.set(0, 0, 50.5); p.autoWalk = null; },
      },
    ], () => {
      p.yaw = p.camYaw = Math.PI; p.camPitch = -0.08;
      G.ui.titleCard('Chapter 1', 'Quarantine', 4);
      this.objective('Get inside the police precinct.');
      G.ui.toast('Crouch with C to stay unseen. A crouched walk makes almost no noise.', 6);
      this.saveGame();
    });
  }

  haleCutscene() {
    const p = G.player, h = this.hale;
    const V = (x, y, zz) => new THREE.Vector3(x, y, zz);
    if (!h.alive) return;
    this.play([
      {
        dur: 5, start: () => { p.pos.set(-9.6, 0, 14.6); p.yaw = p.camYaw = -Math.PI / 2 - 0.4; },
        cam: [V(-10.4, 1.5, 15.3), V(-10.9, 1.3, 15.8)], look: [V(-12, 0.8, 16.7), V(-12, 0.9, 16.7)], fov: 45,
        lines: [[0.3, 'HALE', "Don't... come closer. They bit me. It's in the water, I think..."]],
      },
      {
        dur: 4.2, cam: [V(-11.4, 1.2, 16.0), V(-11.5, 1.25, 16.1)], look: [V(-12, 1.0, 16.8)], fov: 35,
        lines: [[0.4, 'MARA', 'Officer? Hale?']],
        update: (k) => { if (k > 0.45 && h.state === 'dormant') { h.state = 'idle'; G.audio.groan(h.pos, 1, 0.6); } },
        end: () => { if (h.state === 'dormant') h.state = 'idle'; },
      },
    ], () => {
      h.wake();
      G.ui.toast('Hold right mouse to aim, left mouse to fire. Leg shots knock them down; head shots finish them.', 6);
    });
  }

  wardenIntro() {
    const w = this.warden, p = G.player;
    const V = (x, y, zz) => new THREE.Vector3(x, y, zz);
    G.level.closeDoor('cells', 'sealed');
    G.audio.slam(new THREE.Vector3(-2, 1.5, -10));
    this.play([
      {
        dur: 3.5, start: () => { p.pos.set(-2, 0, -12.2); p.yaw = p.camYaw = Math.PI; },
        cam: [V(-0.5, 2.2, -11), V(-1.2, 2.0, -12.5)], look: [V(-8, 1.2, -30), V(-9, 1.6, -28)], fov: 50,
        lines: [[0.5, null, 'The gate slams shut behind her.']],
      },
      {
        dur: 4.5, start: () => { w.pos.set(-9, 0, -32); G.audio.noise(1.6, { freq: 1800, q: 6, gain: 0.25, sweepTo: 900, pos: w.pos }); },
        cam: [V(-8.4, 1.2, -25.5), V(-8.6, 1.0, -26.5)], look: [V(-9, 1.9, -30), V(-9, 2.3, -29)], fov: 42,
        update: (k) => { w.pos.z = -32 + k * 3.5; w.phase += 0.08; w.stride = 0.7; },
        end: () => { w.pos.z = -28.5; },
      },
      {
        dur: 2.8, start: () => { G.audio.roar(w.pos); p.shake = 1; },
        cam: [V(-9, 0.6, -25.5), V(-9, 0.5, -25.8)], look: [V(-9, 2.5, -28.5)], fov: 38,
        update: (k) => { w.h.spine.rotation.x = -0.3; w.h.neck.rotation.x = -0.6; w.h.armL.sh.rotation.z = -1; w.h.armR.sh.rotation.z = 1; void k; },
      },
    ], () => {
      w.state = 'chase';
      w.chargeCd = 4;
      G.ui.titleCard('Cell Block', 'The Warden', 3);
      G.ui.boss('The Warden', 1);
      this.objective('Survive the Warden. His shield blocks shots from the front.');
      G.ui.toast('Make him charge into a pillar or wall, then shoot the glowing growths on his back.', 7);
    });
  }

  onWardenPhase2() {
    G.level.openCellBars('e');
    G.audio.slam(new THREE.Vector3(1, 1.5, -25));
    for (const e of G.enemies) if (e.state === 'caged') { e.state = 'chase'; e.aware = 1.2; }
    G.ui.toast('His shield breaks, and the cell doors grind open!');
  }

  onWardenDefeated(w) {
    G.ui.boss(null);
    const p = G.player;
    const V = (x, y, zz) => new THREE.Vector3(x, y, zz);
    const at = w.pos.clone();
    for (const e of G.enemies) if (e.alive && e !== w) { e.alive = false; e.state = 'dead'; e.deathT = 0; e.fallDir = 1; }
    const hole = new THREE.Mesh(new THREE.CircleGeometry(2.6, 28), new THREE.MeshBasicMaterial({ color: 0x010101 }));
    hole.rotation.x = -Math.PI / 2; hole.position.set(at.x, 0.03, at.z); hole.scale.setScalar(0.01);
    const water = new THREE.Mesh(new THREE.CircleGeometry(2.2, 24), new THREE.MeshStandardMaterial({ color: 0x0a1a12, emissive: 0x1a5a3a, emissiveIntensity: 0.6, roughness: 0.1 }));
    water.rotation.x = -Math.PI / 2; water.position.set(at.x, -3.5, at.z);
    const grate = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.08, 6, 20), new THREE.MeshStandardMaterial({ color: 0x3a3a34, metalness: 0.8 }));
    grate.position.set(at.x + 0.6, -2.4, at.z); grate.rotation.y = 1;
    this.play([
      { dur: 2.6, cam: [V(at.x + 4, 2.2, at.z + 5), V(at.x + 3.2, 1.8, at.z + 4)], look: [V(at.x, 0.8, at.z)], fov: 48 },
      {
        dur: 3.4, start: () => { G.scene.add(hole); G.audio.collapse(at); p.shake = 1.2; },
        cam: [V(at.x + 4.5, 3, at.z + 5.5), V(at.x + 4.8, 3.6, at.z + 6)], look: [V(at.x, 0, at.z)], fov: 50,
        update: (k) => {
          hole.scale.setScalar(Math.max(0.01, Math.min(1, k * 1.6)));
          w.pos.y = -k * 3;
          if (Math.random() < 0.3) G.weapons.particles(at.clone().add(V(rand(-2, 2), 0.3, rand(-2, 2))), 0x8a8478, 2, { additive: false, speed: 1, life: 1.2, size: 0.4, gravity: -0.05 });
        },
        end: () => { hole.scale.setScalar(1); w.h.root.visible = false; G.scene.add(water, grate); },
      },
      {
        dur: 9.5, start: () => { const dir = V(p.pos.x - at.x, 0, p.pos.z - at.z).normalize(); p.autoWalk = V(at.x + dir.x * 3, 0, at.z + dir.z * 3); },
        cam: [V(at.x + 0.5, 3.2, at.z + 2.6), V(at.x + 0.3, 2.6, at.z + 1.8)], look: [V(at.x, -3, at.z), V(at.x + 0.4, -3.4, at.z)], fov: 46,
        lines: [[0.3, 'PIKE (radio)', "Mara, I've got police chatter from yesterday. A car registered to a T. Kessler was found by the river, at the treatment plant."], [6.4, 'MARA', 'Then I follow the water.']],
      },
      { dur: 2.5, start: () => { G.ui.fade(1); G.ui.titleCard('Chapter 2', 'Undercurrent', 2.4); }, cam: [V(at.x + 0.3, 2.6, at.z + 1.8), V(at.x + 0.3, 2.2, at.z + 1.4)], look: [V(at.x + 0.4, -3.4, at.z)] },
    ], () => this.finish());
  }

  finish() {
    G.mode = 'end';
    document.exitPointerLock?.();
    G.ui.showHud(false);
    const s = G.stats;
    const secs = Math.round((performance.now() - s.startTime) / 1000);
    const acc = s.shots ? Math.round((s.hits / s.shots) * 100) : 0;
    document.getElementById('end-stats').innerHTML = [
      [`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, 'Time'],
      [s.kills, 'Infected killed'], [acc + '%', 'Accuracy'], [s.saves, 'Saves'], [s.crates, 'Crates broken'],
    ].map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('');
    document.getElementById('end-screen').hidden = false;
  }

  // ----- save / load -----
  saveGame() {
    const p = G.player, L = G.level;
    this.save = {
      player: { x: p.pos.x, z: p.pos.z, yaw: p.yaw, hp: Math.max(p.hp, 1), injuries: [...p.injuries] },
      weapons: { owned: [...G.weapons.owned], mag: { ...G.weapons.mag }, current: G.weapons.current },
      items: G.items.snapshot(),
      enemies: G.enemies.map(e => ({ e, alive: e.alive, hp: e.hp, x: e.pos.x, z: e.pos.z, state: e.alive ? (['chase', 'suspicious', 'grab'].includes(e.state) ? 'idle' : e.state) : 'dead', headless: e.headless, phase2: e.phase2 })),
      doors: Object.fromEntries(Object.values(L.doors).map(d => [d.id, { open: d.open, locked: d.locked, lock: d.lock }])),
      bars: L.cellBars.map(b => b.open),
      flags: { ...G.flags },
      lion: this.lionFacing, breakers: [...this.breakers], placed: [...this.placed],
      visited: [...L.visited], obj: this.obj, files: [...this.filesRead],
    };
  }

  loadGame() {
    const s = this.save, p = G.player, L = G.level;
    if (!s) return;
    p.pos.set(s.player.x, 0, s.player.z); p.yaw = p.camYaw = s.player.yaw; p.camPitch = -0.08;
    p.hp = s.player.hp; p.injuries = new Set(s.player.injuries);
    p.grab = null; p.healT = 0; p.deathT = null; p.h.root.rotation.x = 0; p.h.root.position.y = 0; p.vel.set(0, 0, 0);
    p.crouch = false; p.control = true; p.camOverride = null; p.autoWalk = null;
    G.weapons.owned = [...s.weapons.owned]; G.weapons.mag = { ...s.weapons.mag }; G.weapons.reloadT = 0;
    G.weapons.current = null; G.weapons.select(s.weapons.current);
    G.items.restore(s.items);
    // enemies: rebuild anyone who was alive at the save but has since died
    for (const rec of s.enemies) {
      let e = rec.e;
      const idx = G.enemies.indexOf(e);
      if (rec.alive && (!e.alive || e.headless || (e.boss && e.phase2 !== rec.phase2))) {
        G.scene.remove(e.h.root);
        if (e.shield) G.scene.remove(e.shield);
        G.hitMeshes = G.hitMeshes.filter(m => m.userData.enemy !== e);
        const fresh = new e.constructor({ ...e.opts, x: rec.x, z: rec.z, state: rec.state });
        G.enemies.pop(); // constructor appended it; put it back in the old slot
        G.enemies[idx] = fresh;
        if (e === this.warden) this.warden = fresh;
        if (e === this.hale) this.hale = fresh;
        for (const r2 of s.enemies) if (r2.e === e) r2.e = fresh;
        e = fresh;
      }
      if (!rec.alive) continue;
      e.hp = rec.hp; e.pos.set(rec.x, 0, rec.z); e.state = rec.state; e.aware = 0; e.path = null;
      e.downT = 0; e.staggerT = 0; e.windup = 0; e.push.set(0, 0, 0); e.vel.set(0, 0, 0);
      e.h.root.rotation.x = 0; e.h.root.position.y = 0;
      if (e.boss) { e.action = null; e.h.root.visible = true; }
    }
    for (const id in s.doors) {
      const d = L.doors[id], r = s.doors[id];
      d.open = r.open; d.locked = r.locked; d.lock = r.lock;
      d.collider.enabled = !r.open; d.target = r.open ? (d.target || 1.45) : 0;
    }
    L.cellBars.forEach((b, k) => { b.open = s.bars[k]; b.collider.enabled = !b.open; if (!b.open) b.group.position.y = 0; });
    G.flags = { ...s.flags };
    this.lionFacing = s.lion; this.breakers = [...s.breakers]; this.placed = new Set(s.placed); this.updateSlots();
    const R = L.room('interro'); R.lamp.visible = !!G.flags.power; R.fixture.material.emissiveIntensity = G.flags.power ? 2.5 : 0;
    this.fuseLamp.material.color.set(G.flags.power ? 0x5fbf6a : 0xb3261e);
    L.visited = new Set(s.visited); this.lastRoom = L.roomAt(p.pos.x, p.pos.z)?.id;
    this.filesRead = [...s.files];
    this.objective(s.obj);
    G.ui.boss(null); G.ui.struggle(null); G.ui.subtitle(null, '');
    this.radioQueue = [];
    G.mode = 'play';
  }

  onPlayerDeath() {
    G.ui.struggle(null);
    setTimeout(() => {
      G.mode = 'dead';
      document.exitPointerLock?.();
      document.getElementById('dead-screen').hidden = false;
    }, 2200);
  }

  roomHasItems(roomId) {
    const R = G.level.room(roomId);
    const inside = (x, zz) => x > R.x0 && x < R.x1 && zz > R.z0 && zz < R.z1;
    if (G.items.pickups.some(p => !p.taken && inside(p.x, p.z))) return true;
    if (G.items.crates.some(c => !c.broken && inside(c.pos.x, c.pos.z))) return true;
    if (roomId === 'hall' && !G.flags.lionSolved) return true;
    if (roomId === 'west' && !G.flags.lockerOpen) return true;
    if (roomId === 'east' && !G.flags.power) return true;
    return false;
  }

  // ----- per-frame -----
  update(dt) {
    if (this.cine) { this.updateCine(dt); return; }
    this.updateRadio(dt);
    if (G.mode !== 'play') return;
    const p = G.player, L = G.level;
    const room = L.roomAt(p.pos.x, p.pos.z)?.id;
    if (room && room !== this.lastRoom) {
      this.lastRoom = room;
      const first = !L.visited.has(room);
      L.visited.add(room);
      if (first) this.onEnterRoom(room);
    }
    // nearest interactable in front of Mara
    let best = null, bestD = 1e9;
    if (p.hp > 0 && !p.grab && p.healT <= 0) {
      const fwd = new THREE.Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw));
      for (const it of L.interacts) {
        if (it.enabled && !it.enabled()) continue;
        const d = dist2D(it.pos, p.pos);
        if (d > it.radius) continue;
        const dir = new THREE.Vector3(it.pos.x - p.pos.x, 0, it.pos.z - p.pos.z).normalize();
        if (d > 0.9 && dir.dot(fwd) < 0.25) continue;
        if (d < bestD) { bestD = d; best = it; }
      }
    }
    this.currentInteract = best;
    if (best && G.input.pressed('KeyE')) best.action();
  }

  onEnterRoom(room) {
    if (room === 'lobby') {
      this.radio(LINES.pike.map(([w, t]) => [w, t]));
      setTimeout(() => this.objective('Find the three medallions to open the Chief\'s armoury.'), 9000);
      G.ui.toast('Safe room. Radio recorders save your progress.', 5);
    }
    if (room === 'west') this.haleCutscene();
    if (room === 'cells') this.wardenIntro();
    if (room === 'armory') this.radio([['PIKE', 'You made it into Dunn\'s armoury? Take everything. You\'re going to need it.']]);
    if (room === 'interro') this.radio([['PIKE', 'Careful in Interrogation. We left two bodies in there. I hope they were bodies.']]);
  }
}
