// Chapter 1 "Port Halvern": story flow, documents, radio, puzzles, cutscenes,
// save points and the Hookman fight. Every line of text the player reads or
// hears comes from data/narrative_c1.json, and the objective list comes from
// data/objectives_c1.json: the same rows the Unreal Data Tables import.
import * as THREE from 'three';
import { G, dist2D, rand, makeNoise, addUpdater } from './game.js';
import { Husk, Hookman } from './enemies.js';
import { buildHumanoid, poseHumanoid } from './humanoid.js';
import { tapeCutscene } from './tape.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TYPE_LABEL = { Note: 'Note', Diary: 'Diary', Email: 'Email', AudioLog: 'Audio log', Footage: 'Security footage', Photo: 'Photo' };
const CRANE_ORDER = [3, 1, 2]; // nights first, then round the clock: day, swing
const CAGE_CODE = '0214';      // the timestamp on the tape: "when it opened"

export async function loadData() {
  const get = (f) => fetch(new URL(`../data/${f}`, import.meta.url)).then(r => {
    if (!r.ok) throw new Error(`could not load ${f} (${r.status})`);
    return r.json();
  });
  const [narrative, objectives] = await Promise.all([get('narrative_c1.json'), get('objectives_c1.json')]);
  return { narrative, objectives };
}

export class Story {
  constructor(data) {
    this.rowById = new Map(data.narrative.map(r => [r.id, r]));
    this.objById = new Map(data.objectives.map(o => [o.id, o]));
    this.filesRead = [];
    this.save = null;
    this.lastRoom = null;
    this.currentInteract = null;
    this.radioQueue = []; this.radioT = 0;
    this.played = new Set();
    this.cine = null;
    this.objId = null; this.objT = 0; this.objHinted = false;
    this.crane = { fuse: false, order: [], trips: 0, lockT: 0, nearT: 0, hint: 0 };
    this.cage = { wrong: 0, nearT: 0, hint: 0 };
    this.fight = null;
  }

  // ----- narrative rows -----
  row(id) { return this.rowById.get(id); }
  rows(prefix) { return [...this.rowById.values()].filter(r => r.id.startsWith(prefix + '_')).sort((a, b) => (a.id < b.id ? -1 : 1)); }
  fileTitle(id) { return this.row(id)?.title || id; }

  // A row's unlocks can name flags; reading or hearing the row sets them.
  unlock(r) { for (const u of r?.unlocks || []) if (u.startsWith('FLG_')) G.flags[u] = true; }

  readFile(id, fromMenu) {
    const r = this.row(id);
    if (!r) return;
    if (!this.filesRead.includes(id)) this.filesRead.push(id);
    this.unlock(r);
    G.audio.pickup();
    const head = TYPE_LABEL[r.type] + (r.speaker ? ` · ${r.speaker}` : '');
    G.ui.showFile(r.title, `${head}\n\n${r.text}`);
    if (fromMenu) this.returnToInventory = true;
    else this.onRead(id);
  }

  onRead(id) {
    const F = G.flags;
    if (id === 'NAR_C1_PruittRadio' && !this.played.has('RAD_C1_PruittRadio')) {
      F.FLG_C1_PruittRadioFound = true;
      this.radio('RAD_C1_PruittRadio', () => this.objective('OBJ_C1_04'));
    }
    if ((id === 'NAR_C1_ManifestA' || id === 'NAR_C1_ManifestB') && !F.FLG_C1_ManifestsRead) {
      F.FLG_C1_ManifestsRead = true;
      if (!F.FLG_C1_TapeWatched) this.objective('OBJ_C1_06');
    }
    if (id === 'NAR_C1_OrtizBody' && !this.played.has('RAD_C1_Ortiz')) this.radio('RAD_C1_Ortiz', () => this.optionalDone('OBJ_C1_08'));
    if (id === 'NAR_C1_ContainerInterior') this.optionalDone('OBJ_C1_14');
  }

  // ----- objectives -----
  objective(id) {
    const o = this.objById.get(id);
    if (!o || this.objId === id) return;
    this.objId = id; this.objT = 0; this.objHinted = false;
    G.ui.objective(o.title);
  }

  optional(id) {
    const o = this.objById.get(id);
    if (o && !this.played.has('opt:' + id)) { this.played.add('opt:' + id); G.ui.toast(`Optional: ${o.title}`, 4); }
  }

  optionalDone(id) {
    const o = this.objById.get(id);
    if (o && !this.played.has('done:' + id)) { this.played.add('done:' + id); setTimeout(() => G.ui.toast(`Done: ${o.title}`, 3), 400); }
  }

  // ----- radio chatter that plays during gameplay -----
  // radio('RAD_C1_MaraFirst') plays every row in that exchange once, in order.
  radio(prefixOrIds, onDone, { again = false } = {}) {
    const key = Array.isArray(prefixOrIds) ? prefixOrIds.join('+') : prefixOrIds;
    if (this.played.has(key) && !again) return false;
    this.played.add(key);
    const rows = Array.isArray(prefixOrIds) ? prefixOrIds.map(id => this.row(id)) : (this.row(prefixOrIds) ? [this.row(prefixOrIds)] : this.rows(prefixOrIds));
    for (const r of rows) if (r) this.radioQueue.push({ r });
    if (onDone) this.radioQueue.push({ fn: onDone });
    return true;
  }

  say(who, text) { this.radioQueue.push({ r: { speaker: who, text, unlocks: [] } }); }

  updateRadio(dt) {
    if (this.cine) return;
    this.radioT -= dt;
    while (this.radioT <= 0 && this.radioQueue[0]?.fn) this.radioQueue.shift().fn();
    if (this.radioT > 0) return;
    const next = this.radioQueue.shift();
    if (next) {
      const { speaker, text } = next.r;
      const onRadio = speaker === 'MARA';
      G.ui.subtitle(onRadio ? 'MARA (radio)' : speaker, text);
      if (onRadio) G.audio.radio();
      this.unlock(next.r);
      this.radioT = 1.8 + text.length * 0.055;
    } else if (this.radioT < -0.1 && this.radioT > -1) { G.ui.subtitle(null, ''); this.radioT = -5; }
  }

  // ----------------------------------------------------------
  setup() {
    const I = G.items, L = G.level;
    // ---- North Pier ----
    this.corpse({ x: 3.4, z: 50.1, yaw: 2, clothes: { top: 0x1e2630, bottom: 0x1a1d22 }, inert: true });
    this.husk({ x: 2.5, z: 50.8, yaw: 2.2, state: 'feeding', build: 'normal' });
    I.spawn({ file: 'NAR_C1_PruittRadio', model: 'radio', x: 4.5, z: 51.0, y: 0.02, label: 'Examine the crushed radio' });
    I.spawn({ file: 'NAR_C1_WatchRound', x: -4, z: 44, y: 1.01 });
    I.spawn({ id: 'ammo9', qty: 6, x: -8.2, z: 42.2 });
    I.spawn({ id: 'herbG', x: 4.2, z: 42.0 });
    I.crate(8.6, 60.2); I.crate(-8.4, 47.2);

    // ---- Dock Office (safe room) ----
    I.spawn({ file: 'NAR_C1_ManifestA', x: -16.7, z: 51.4, y: 0.79 });
    I.spawn({ file: 'NAR_C1_ManifestB', x: -15.9, z: 51.6, y: 0.79 });
    I.spawn({ file: 'NAR_C1_ClerkDiary', x: -15.0, z: 51.3, y: 0.79 });
    I.spawn({ file: 'NAR_C1_EmailVigor', x: -20.5, z: 45.9, y: 0.79, label: 'Read the printed email' });
    I.spawn({ file: 'NAR_C1_EmailReply', x: -20.4, z: 46.5, y: 0.79, label: 'Read the second printout' });
    this.readable(-16, 1.4, 53.4, 'NAR_C1_HarbourBoard');
    this.relayRadio(-12.4, 43.2);
    this.supplyLocker();
    L.interacts.push({
      pos: V(-20.3, 1, 47.4), radius: 1.7,
      label: () => G.flags.FLG_C1_ManifestsRead ? 'Play the security log' : 'Look at the security monitor',
      enabled: () => !G.flags.FLG_C1_TapeWatched,
      action: () => {
        if (!G.flags.FLG_C1_ManifestsRead) { G.ui.toast('The deck is cued to last night. First find out what came into Yard C: the manifests are on the clerk\'s desk.', 5); return; }
        tapeCutscene(this, () => this.afterTape());
      },
    });

    // ---- Warehouse 3 ----
    this.husk({ x: -3.5, z: 31, yaw: 1.2, state: 'idle', build: 'frail' });
    this.husk({ x: 1.5, z: 22, state: 'wander', patrol: [[1.5, 0, 22], [1.5, 0, 34]] });
    this.husk({ x: 11.5, z: 27, state: 'wander', patrol: [[11.5, 0, 18], [11.5, 0, 36], [6.6, 0, 26]] });
    this.readable(-9.5, 1.2, 30, 'NAR_C1_PA_Loop', 'Listen to');
    I.spawn({ file: 'NAR_C1_BeggPhone', model: 'phone', x: -8.6, z: 38.4, y: 0.02, label: 'Pick up the cracked phone' });
    this.corpse({ x: 12.4, z: 15.6, yaw: -2.4, clothes: { top: 0x1c2430, bottom: 0x1a1c20 }, inert: true, name: 'ortiz' });
    this.readable(12.0, 0.4, 16.2, 'NAR_C1_OrtizBody', 'Search');
    this.casings(12.4, 15.6, 14);
    I.spawn({ id: 'ammo9', qty: 8, x: 9.6, z: 38.4 });
    I.spawn({ id: 'herbR', x: -8.6, z: 15.4, y: 1.4 });
    I.crate(12.8, 30.4); I.crate(-8.4, 25);

    // ---- Break Room ----
    this.readable(23.4, 1.4, 34, 'NAR_C1_ShiftRota');
    I.spawn({ file: 'NAR_C1_VargaLog', model: 'radio', x: 19.4, z: 34.2, y: 0.77, label: 'Play the cab recorder tape' });
    I.spawn({ file: 'NAR_C1_KelsoSlip', x: 18.4, z: 33.8, y: 0.77 });
    this.readable(23.3, 1.5, 30.6, 'NAR_C1_NightCrewPhoto', 'Look at');
    L.box(16.6, 28.25, 0.9, 0.3, 1.0, new THREE.MeshStandardMaterial({ color: 0x6a7470, metalness: 0.5, roughness: 0.5 }), { y: 1.0, solid: false, surface: 'metal' }); // electrical cabinet
    I.spawn({ id: 'fuse', key: true, x: 16.6, z: 28.6, y: 1.25, onPick: () => this.onFuse() });
    this.guard = this.corpse({ x: 20.6, z: 37.4, yaw: 1.4, clothes: { top: 0x2a3346, bottom: 0x1c2028 }, name: 'guard' });
    I.spawn({ id: 'herbG', x: 15.4, z: 39.4, y: 0.92 });

    // ---- Customs Cage ----
    this.readable(13.6, 1.3, 19.4, 'NAR_C1_PruittScratch', 'Read');
    this.readable(13.6, 1.2, 22.8, 'NAR_C1_CustomsSlip');
    I.spawn({ id: 'shotgun', x: 19.4, z: 18.1, y: 0.86, onPick: () => this.optionalDone('OBJ_C1_10') });
    I.spawn({ id: 'shells', qty: 8, x: 20.4, z: 18.0, y: 0.86 });
    I.spawn({ id: 'suppressant', x: 18.5, z: 17.8, y: 0.86 });
    I.spawn({ file: 'NAR_C1_OrtizNotes', x: 20.2, z: 18.4, y: 0.86 });
    I.spawn({ file: 'NAR_C1_SuppressantLabel', x: 18.8, z: 18.4, y: 0.86 });

    // ---- Crane Control House ----
    this.husk({ x: -14, z: 23.4, yaw: 2.2, state: 'fakeDead' });
    this.readable(-23.5, 1.5, 18, 'NAR_C1_BreakerNote');
    L.interacts.push({ pos: V(-23.3, 1.4, 19.8), radius: 1.7, label: () => this.panelLabel(), enabled: () => !G.flags.FLG_C1_PowerRestored, action: () => this.usePanel() });
    I.spawn({ id: 'ammo9', qty: 6, x: -11.4, z: 25.2 });
    I.crate(-21, 15.3);

    // ---- Container Yard ----
    this.hookman = this.spawn({ kind: 'hookman', name: 'hookman', x: 17.6, z: -15, yaw: -Math.PI / 2, state: 'dormant' });
    this.readable(-5, 1, -1.1, 'NAR_C1_KelsoGate', 'Examine');
    this.readable(-9.6, 0.6, -5.3, 'NAR_C1_ContainerSeal', 'Look at');
    this.readable(-9.5, 1.2, -7.0, 'NAR_C1_ContainerInterior', 'Look inside');
    this.readable(11.5, 1, -7.4, 'NAR_C1_DropZoneSign');
    L.interacts.push({
      pos: V(11.6, 1, -6), radius: 1.6, label: 'Pull the load release',
      enabled: () => !!this.fight && this.hookman?.alive && L.drops.some(d => d.state === 'hung'),
      action: () => this.pullLever(),
    });
    I.spawn({ id: 'herbG', x: -21.6, z: -8.5 });
    I.spawn({ id: 'ammo9', qty: 8, x: -1.5, z: 12.2 });
    I.spawn({ id: 'shells', qty: 4, x: 22.6, z: 10.4 });
    I.spawn({ id: 'herbR', x: 22.8, z: -20.6 });
    I.crate(-22.4, 12.2); I.crate(23.6, 1.5); I.crate(-11.2, -20.4);

    // ---- Boat Dock ----
    L.interacts.push({ pos: V(0, 1, -33.2), radius: 2.2, label: 'Take the tender', enabled: () => !!G.flags.FLG_C1_ShutterOpen, action: () => this.departure() });
    I.spawn({ id: 'ammo9', qty: 6, x: -4.6, z: -26.4, y: 0.92 });
  }

  // ----- builders -----
  spawn(o) { return o.kind === 'hookman' ? new Hookman(o) : new Husk({ kind: 'husk', ...o }); }
  husk(o) { return this.spawn({ kind: 'husk', ...o }); }

  // A body lying where it fell. Inert ones are already finished; the rest can rise.
  corpse(o) {
    const e = this.spawn({ kind: 'husk', ...o, canRise: !o.inert, corpse: true, state: 'idle' });
    e.makeCorpse();
    if (o.inert) { e.finished = true; e.waiting = false; }
    return e;
  }

  // Something fixed in the world to read: a board, a sign, a body. It stays put.
  readable(x, y, z, id, verb = 'Read') {
    G.level.interacts.push({ pos: V(x, y, z), radius: 1.7, label: () => `${verb}: ${this.fileTitle(id)}`, enabled: () => true, action: () => this.readFile(id) });
  }

  casings(x, z, n) {
    const m = new THREE.MeshStandardMaterial({ color: 0xb08a3a, metalness: 0.9, roughness: 0.3 });
    for (let k = 0; k < n; k++) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.02, 6), m);
      c.rotation.z = Math.PI / 2; c.rotation.y = Math.random() * 3;
      c.position.set(x + rand(-1.4, 1.4), 0.01, z + rand(-1.4, 1.4)); G.scene.add(c);
    }
  }

  relayRadio(x, z) {
    const g = new THREE.Group();
    const table = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.55), new THREE.MeshStandardMaterial({ color: 0x5a4a38, roughness: 0.8 }));
    table.position.y = 0.4;
    const set = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.26, 0.32), new THREE.MeshStandardMaterial({ color: 0x2e3430, roughness: 0.6, metalness: 0.3 }));
    set.position.y = 0.93;
    const dial = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.08), new THREE.MeshBasicMaterial({ color: 0xffb060 }));
    dial.position.set(-0.08, 0.96, 0.161);
    const mic = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.03), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    mic.position.set(0.2, 0.86, 0.22);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), new THREE.MeshBasicMaterial({ color: 0x5fbf6a }));
    lamp.position.set(0.18, 1.02, 0.161);
    g.add(table, set, dial, mic, lamp);
    g.position.set(x, 0, z); G.scene.add(g);
    const light = new THREE.PointLight(0xffb060, 1.2, 3, 2); light.position.set(x, 1.3, z + 0.3); G.scene.add(light);
    G.colliders.push({ minX: x - 0.42, maxX: x + 0.42, minZ: z - 0.3, maxZ: z + 0.3 });
    G.level.interacts.push({ pos: V(x, 1, z), radius: 1.8, label: 'Key the relay radio (save)', enabled: () => true, action: () => this.recordSave() });
  }

  recordSave() {
    this.saveGame();
    G.stats.saves++;
    G.audio.save(); G.audio.radio();
    G.ui.toast('Mara logs you in. If Leon dies, you will continue from here.');
  }

  supplyLocker() {
    G.level.interacts.push({
      pos: V(-21.2, 1, 43.2), radius: 1.6, label: 'Open the supply locker',
      enabled: () => !G.flags.lockerLooted,
      action: () => {
        G.flags.lockerLooted = true;
        G.items.spawn({ id: 'bandage', x: -20.9, z: 42.8, y: 0.9 });
        G.items.spawn({ id: 'ammo9', qty: 10, x: -20.9, z: 43.6, y: 0.9 });
        G.audio.door(V(-21.2, 1, 43.2));
        G.ui.toast('Port Authority first-aid locker. Somebody already took the good stuff.');
      },
    });
  }

  // ----- doors -----
  tryDoor(door) {
    const L = G.level, F = G.flags;
    if (!door.locked) { L.openDoor(door.id, G.player.pos); return; }
    if (door.lock === 'release') { G.audio.locked(); G.ui.toast('The shutter is locked down from a switch in the dock office.'); return; }
    if (door.lock === 'power') { G.audio.locked(); G.ui.toast('The gate motor is dead. The control house panel feeds it.'); return; }
    if (door.lock === 'sealed') { G.audio.locked(); G.ui.toast('The gate has dropped into its lock. It will not move while the yard is live.'); return; }
    if (door.lock === 'code') {
      G.ui.showKeypad((code) => this.cageCode(code), 'Customs Cage', 'Four digits. Scratches in the paint beside it.');
      return;
    }
    if (door.lock === 'shutterkey') {
      if (G.items.keys.has('shutterKey')) {
        G.items.keys.delete('shutterKey');
        door.locked = false; door.lock = null;
        F.FLG_C1_ShutterOpen = true;
        G.audio.success();
        L.openDoor(door.id, G.player.pos);
        G.ui.toast('Used the Cargo Shutter Key.');
        this.objective('OBJ_C1_16');
        this.saveGame();
      } else { G.audio.locked(); G.ui.toast('A padlocked cargo shutter. Stencilled: SEALED · BOAT DOCK.'); }
      return;
    }
    G.audio.locked();
  }

  afterTape() {
    const F = G.flags;
    for (const r of this.rows('RAD_C1_AfterTape')) this.unlock(r);
    F.FLG_C1_TapeWatched = true; F.FLG_C1_CageCodeKnown = true;
    this.played.add('RAD_C1_AfterTape');
    if (!this.filesRead.includes('NAR_C1_Tape0214')) this.filesRead.push('NAR_C1_Tape0214');
    const d = G.level.doors.warehouse; d.locked = false; d.lock = null;
    this.objective('OBJ_C1_07');
    G.ui.toast('Leon throws the warehouse shutter release on the office wall. The tape is in your Files.', 5);
    this.saveGame();
  }

  // ----- puzzle 1: the customs cage -----
  cageCode(code) {
    if (code === CAGE_CODE) {
      G.ui.closeModal();
      G.flags.FLG_C1_CageOpen = true;
      G.audio.success();
      G.level.openDoor('cage', G.player.pos);
      G.ui.toast('The bolt throws. The cage swings open.');
      return true;
    }
    G.audio.error();
    const c = this.cage;
    c.wrong++;
    if (c.wrong === 2) this.cageHint(2);
    if (c.wrong === 4) this.cageHint(3);
    if (c.wrong % 3 === 0) { // the keypad is loud: every third miss draws company to the apron
      makeNoise(V(13, 0, 21), 30, 'gunshot');
      for (const [x, z] of [[-2, 18], [4, 16.5]]) { const e = this.husk({ x, z, state: 'suspicious', yaw: 1.5 }); e.target = V(12.5, 0, 21); e.aware = 0.8; }
    }
    return false;
  }

  cageHint(n) {
    if (this.cage.hint >= n) return;
    this.cage.hint = n;
    this.radio(`RAD_C1_HintCage_0${n}`);
  }

  // ----- puzzle 2: crane power -----
  panelLabel() {
    const c = this.crane;
    if (c.fuse) return c.lockT > 0 ? 'The main breaker is still hot' : 'Work the crane switches';
    return G.items.keys.has('fuse') ? 'Seat the Crane Fuse' : 'Examine the gantry supply panel';
  }

  usePanel() {
    const c = this.crane;
    if (!c.fuse) {
      if (G.items.keys.has('fuse')) {
        G.items.keys.delete('fuse');
        c.fuse = true;
        G.audio.reload(2); G.audio.success();
        G.ui.toast('The fuse seats with a clunk. The three switches come alive.');
        setTimeout(() => this.openCranePanel(), 600);
        return;
      }
      this.readFile('NAR_C1_FusePlate');
      if (!G.flags.FLG_C1_FuseFound) this.craneHint(1);
      return;
    }
    if (c.lockT > 0) { G.audio.locked(); G.ui.toast(`The breaker handle won't reseat yet. ${Math.ceil(c.lockT)} s.`); return; }
    this.openCranePanel();
  }

  openCranePanel() {
    if (G.mode !== 'play') return;
    G.ui.showCranePanel(this.crane.order, (n) => this.flipSwitch(n));
  }

  flipSwitch(n) {
    const c = this.crane;
    c.order.push(n);
    G.audio.reload(1);
    G.level.craneLamps[n - 1].material.color.set(0xffc040);
    const k = c.order.length - 1;
    if (c.order[k] !== CRANE_ORDER[k]) { this.tripBreaker(); return false; }
    if (c.order.length === 3) { G.ui.closeModal(); this.powerOn(); return false; }
    return true;
  }

  tripBreaker() {
    const c = this.crane, p = G.player;
    G.ui.closeModal();
    c.order = []; c.trips++; c.lockT = 12;
    G.level.craneLamps.forEach(m => m.material.color.set(0x331010));
    const at = V(-23.6, 1.5, 19.8);
    G.audio.slam(at); G.audio.gunshot('shotgun'); G.audio.sparks(at);
    G.weapons.sparks(at, 0xffd080, 18, V(1, 0, 0));
    p.shake = 0.6;
    makeNoise(p.pos, 40, 'gunshot');
    G.ui.toast('BANG. The main breaker trips. That was loud.', 4);
    // the bang brings the night crew to the control house door
    const n = Math.min(c.trips + 1, 3);
    for (let k = 0; k < n; k++) { const e = this.husk({ x: -6.5 + k * 1.4, z: 17 + k * 2.4, state: 'suspicious', build: k === 2 ? 'worker' : 'normal' }); e.target = V(-11, 0, 22); e.aware = 0.9; }
    if (c.trips === 1) this.craneHint(2);
    if (c.trips === 2) this.craneHint(3);
  }

  craneHint(n) {
    if (this.crane.hint >= n) return;
    this.crane.hint = n;
    this.radio(`RAD_C1_HintCrane_0${n}`);
  }

  powerOn(silent) {
    const L = G.level, F = G.flags;
    F.FLG_C1_PowerRestored = true; F.FLG_C1_YardGateOpen = true;
    L.setYardPower(true);
    const R = L.room('control'); R.lamp.visible = true; R.fixture.material.emissiveIntensity = 2.5;
    const d = L.doors.yardgate;
    if (d.lock === 'power') { d.locked = false; d.lock = null; }
    if (silent) return;
    G.audio.success(); G.audio.engine(V(2, 1, 14), 2.5);
    G.ui.toast('All three gantries hum up. Through the window, the yard floods come on.', 5);
    this.objective('OBJ_C1_12');
    this.saveGame();
  }

  onFuse() {
    G.flags.FLG_C1_FuseFound = true;
    this.objective('OBJ_C1_11');
    // The guard on the floor was never finished.
    const g = this.guard;
    if (g && !g.alive && !g.finished && g.waiting) g.startRise(1.6);
  }

  // ----- puzzle 3: the drop zone -----
  pullLever() {
    const L = G.level, h = this.hookman;
    const hung = L.drops.filter(d => d.state === 'hung');
    if (!hung.length) return;
    // the release drops whichever load he is nearest to; it does not ask twice
    const pref = hung.reduce((a, b) => (dist2D(a, h.pos) < dist2D(b, h.pos) ? a : b));
    const d = L.releaseContainer(pref);
    d.onLand = (drop) => this.onDropLand(drop);
    G.audio.clang(V(11.9, 1, -6)); G.audio.chain(V(d.x, 6, d.z), 0.6);
    const lever = L.lever; let t = 0;
    addUpdater((dt) => { t += dt; lever.rotation.z = 0.6 - Math.sin(Math.min(1, t / 0.5) * Math.PI) * 1.2; return t < 0.5; });
    const left = L.drops.filter(x => x.state === 'hung').length;
    L.leverBulbs.forEach((b, k) => b.material.color.set(k < left ? 0xffc040 : 0x2a2010));
    G.flags.FLG_C1_DropUsed = true;
    this.fight.dropped = true;
  }

  onDropLand(d) {
    const p = G.player, h = this.hookman;
    G.audio.collapse(V(d.x, 0, d.z)); p.shake = 1.2;
    for (let k = 0; k < 24; k++) G.weapons.particles(V(d.x + rand(-1.5, 1.5), 0.2, d.z + rand(-3, 3)), 0x8a8478, 1, { additive: false, speed: 1.5, life: 1.4, size: 0.5, gravity: -0.05 });
    const under = (pos, r) => Math.abs(pos.x - d.x) < 1.22 + r && Math.abs(pos.z - d.z) < 3.05 + r;
    if (h?.alive && h.crush(d)) G.ui.toast('Pinned! His back is open.', 2.5);
    for (const e of G.enemies) if (e !== h && e.alive && under(e.pos, 0.2)) e.takeHit(999, 'head', V(0, 0, 1), 1);
    if (p.hp > 0 && under(p.pos, 0)) p.damage(999, {});
  }

  // ----- the Hookman -----
  onHookStuck() {
    if (!this.fight) return;
    this.fight.stuck = (this.fight.stuck || 0) + 1;
    this.hookHint(2);
  }

  hookHint(n) {
    const f = this.fight;
    if (!f || f.hint >= n) return;
    f.hint = n;
    this.radio(`RAD_C1_HintHookman_0${n}`);
  }

  onHookmanPhase2() {
    G.ui.toast('He roars. Something else is coming through the stacks.', 3);
    this.kelso = this.husk({ name: 'kelso', x: -20, z: -12, build: 'worker', state: 'chase', hp: 240, speed: 1.4, scale: 1.12, clothes: { top: 0x9a8a2a, bottom: 0x2a3040 } });
    this.husk({ x: 22, z: -6, build: 'frail', state: 'chase' });
  }

  onHookmanDefeated(h) {
    G.ui.boss(null);
    const F = G.flags;
    F.FLG_C1_HookmanDead = true;
    this.fight = null;
    G.level.openDoor('yardgate', null, true);
    G.level.doors.yardgate.lock = null;
    const at = h.pos.clone();
    setTimeout(() => {
      G.items.spawn({ id: 'shutterKey', key: true, x: at.x + 0.6, z: at.z, dynamic: true, onPick: () => this.radio('RAD_C1_Shutter', () => this.objective('OBJ_C1_16')) });
      G.ui.titleCard('', 'The Hookman is dead', 2.6);
      this.objective('OBJ_C1_15');
      this.optional('OBJ_C1_14');
      this.saveGame();
    }, 2200);
  }

  // ----- cutscenes -----
  // shots: [{ dur, cam: [from, to], look: [from, to], fov, lines: [[t, who, text]], start(), update(k, dt), end() }]
  play(shots, onEnd) {
    G.mode = 'cine';
    document.body.classList.add('cine');
    G.player.control = false;
    G.player.aiming = false;
    G.ui.struggle(null);
    G.ui.subtitle(null, '');
    this.cine = { shots, i: -1, t: 0, onEnd };
    this.nextShot();
  }

  nextShot() {
    const c = this.cine;
    c.shots[c.i]?.end?.();
    c.i++; c.t = 0; c.lineI = 0;
    const s = c.shots[c.i];
    if (!s) { this.endCine(); return; }
    s.start?.();
  }

  skipCine() {
    const c = this.cine;
    if (!c || c.noSkip) return;
    while (this.cine === c && c.i < c.shots.length) {
      c.shots[c.i].update?.(1, 1 / 30);
      this.nextShot();
    }
  }

  endCine() {
    const c = this.cine;
    this.cine = null;
    document.body.classList.remove('cine');
    const p = G.player;
    p.camOverride = null; p.control = true; p.autoWalk = null; p.pos.y = 0;
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
      const pos = new THREE.Vector3().lerpVectors(s.cam[0], s.cam[1] || s.cam[0], e);
      const look = new THREE.Vector3().lerpVectors(s.look[0], s.look[1] || s.look[0], e);
      G.player.camOverride = { pos, look, fov: s.fov || 50 };
    }
    s.update?.(k, dt);
    while (s.lines && c.lineI < s.lines.length && c.t >= s.lines[c.lineI][0]) {
      const [, who, text] = s.lines[c.lineI++];
      G.ui.subtitle(who, text);
      if (who?.includes('radio')) G.audio.radio();
    }
    if (c.t >= s.dur && this.cine === c) this.nextShot();
  }

  // Lines for a cutscene, straight from the data rows.
  lines(prefix, times) {
    return this.rows(prefix).map((r, i) => [times[i] ?? i * 2.5, r.speaker === 'MARA' ? 'MARA (radio)' : r.speaker, r.text]);
  }

  // CS_C1_Arrival: Hank Doyle's tender noses up to the north pier in the rain.
  introCutscene() {
    const p = G.player, L = G.level;
    const tender = L.makeBoat(0x4a4038);
    G.scene.add(tender);
    const hank = buildHumanoid({ top: 0x3a4a3a, bottom: 0x2a2a2a, skin: 0xb88a6e, hair: 0x6a6258, scale: 1.0 });
    tender.add(hank.root); hank.root.position.set(0.3, 0.62, 0.7); hank.root.rotation.y = Math.PI;
    const work = new THREE.PointLight(0xffe2c0, 5, 7, 1.6); work.position.set(0, 2.4, -1.2); tender.add(work);
    const place = (z) => { tender.position.set(0, -0.25 + Math.sin(G.time * 1.6) * 0.05, z); tender.rotation.z = Math.sin(G.time * 1.1) * 0.025; };
    const onBoat = () => { p.pos.set(-0.3, tender.position.y + 0.62, tender.position.z - 2.0); };
    let tz = 82;
    const lines = this.rows('DLG_C1_Arrival');
    const say = (i) => [lines[i].speaker, lines[i].text];
    poseHumanoid(hank, { phase: 0, stride: 0 });
    p.yaw = p.camYaw = Math.PI;
    this.play([
      { // 1. fog, a masthead light swinging in and out of it
        dur: 4.5, start: () => { G.ui.fade(1); setTimeout(() => G.ui.fade(0), 300); place(tz); onBoat(); },
        cam: [V(16, 1.0, 84), V(15.4, 1.1, 83.2)], look: [V(0, 1.4, 76)], fov: 40,
        update: (k) => { tz = 82 - k * 5; place(tz); onBoat(); },
      },
      { // 2. the bow comes out of the fog; Leon at the rail, counting exits
        dur: 5, cam: [V(4.6, 1.5, 60.4), V(4.0, 1.6, 61.2)], look: [V(0, 1.6, 74), V(0, 1.8, 65)], fov: 45,
        update: (k) => { tz = 77 - k * 11; place(tz); onBoat(); },
        end: () => { tz = 66; place(tz); onBoat(); },
      },
      { // 3. over Leon's shoulder onto Hank, throttle still in his hand
        dur: 3.4, cam: [V(-0.9, 2.15, 62.9), V(-0.85, 2.1, 63.1)], look: [V(0.3, 1.95, 66.7)], fov: 38,
        lines: [[0.3, ...say(0)]], update: () => { place(tz); onBoat(); },
      },
      { // 4. Leon steps up onto the gunwale
        dur: 3.4, cam: [V(0.9, 2.05, 62.2), V(0.75, 2.05, 62.6)], look: [V(-0.3, 2.15, 64)], fov: 34,
        lines: [[0.3, ...say(1)]], update: () => { place(tz); onBoat(); },
      },
      { // 5. Hank finally looks at him
        dur: 3.4, cam: [V(0.5, 2.05, 64.9)], look: [V(0.3, 2.0, 66.7)], fov: 34,
        start: () => { hank.neck.rotation.y = -0.5; },
        lines: [[0.3, ...say(2)]], update: () => { place(tz); onBoat(); },
      },
      { // 6. Leon steps across onto the pier
        dur: 4.2, cam: [V(1.6, 1.55, 58.0), V(1.4, 1.6, 58.4)], look: [V(-0.3, 1.5, 61), V(-0.3, 1.6, 60)], fov: 42,
        start: () => { p.pos.set(-0.3, 0, 61.6); p.autoWalk = V(-0.3, 0, 59.6); G.audio.step('wood', 1.4); },
        lines: [[1.6, ...say(3)]], update: () => place(tz),
      },
      { // 7. the tender backs off into the fog
        dur: 4.6, cam: [V(-0.6, 0.9, 57.4), V(-0.6, 1.0, 57.2)], look: [V(0, 1.1, 70)], fov: 44,
        start: () => { p.autoWalk = null; p.pos.set(-0.3, 0, 59.6); p.yaw = Math.PI; G.audio.engine(V(0, 0, 70), 4); },
        update: (k) => { tz = 66 + k * k * 18; place(tz); },
      },
      { // 8. flashlight on; the cranes come out of the dark above him
        dur: 5.4, cam: [V(0.6, 0.45, 61.2), V(1.6, 4.6, 64.8)], look: [V(0, 3, 40), V(0, 6.5, 28)], fov: 50,
        start: () => { G.audio.ui(); p.flashOn = true; G.ui.titleCard('22:30', 'Port Halvern', 3.6); },
      },
    ], () => {
      G.scene.remove(tender);
      for (const r of lines) this.unlock(r);
      p.yaw = p.camYaw = Math.PI; p.camPitch = -0.08;
      G.flags.FLG_C1_Landed = true;
      G.ui.titleCard('Chapter 1', 'Port Halvern', 3.5);
      this.objective('OBJ_C1_01');
      G.ui.toast('Crouch with C to move quietly. Husks hear better than they see.', 6);
      this.saveGame();
    });
  }

  // CS_C1_FirstReborn: the first time Leon sees a body get back up.
  firstReborn(e) {
    const p = G.player;
    G.flags.FLG_C1_FirstReborn = true;
    const at = e.pos.clone();
    const side = V(p.pos.x - at.x, 0, p.pos.z - at.z).normalize();
    if (!isFinite(side.x)) side.set(0, 0, 1);
    const across = V(side.z, 0, -side.x);
    const P = (a, b, y) => at.clone().addScaledVector(side, a).addScaledVector(across, b).setY(y);
    // it stays on the floor, twitching, until shot 4
    e.riseHold = true;
    e.h.root.updateMatrixWorld(true);
    const chest = e.h.spine.getWorldPosition(new THREE.Vector3());
    const C = (dx, dy, dz) => chest.clone().add(new THREE.Vector3(dx, dy, dz));
    this.play([
      { // 1. floor level, the body in the foreground; one hand twitches
        dur: 1.6, cam: [P(1.7, 0.9, 0.35), P(1.6, 0.85, 0.35)], look: [chest.clone().setY(0.2)], fov: 40,
        update: () => { e.h.armR.sh.rotation.x = Math.sin(G.time * 31) * 0.6; },
      },
      { dur: 1.1, cam: [P(dist2D(p.pos, at) - 1.0, -0.6, 1.65)], look: [p.pos.clone().setY(1.55)], fov: 36, start: () => { p.yaw = p.camYaw = Math.atan2(at.x - p.pos.x, at.z - p.pos.z); p.aiming = true; } },
      { // 3. close on the chest: it rises and does not fall; something moves under the shirt
        dur: 1.6, cam: [C(0.5, 0.7, 0.5), C(0.35, 0.55, 0.35)], look: [chest], fov: 34,
        update: () => { e.h.spine.rotation.x = Math.sin(G.time * 17) * 0.2; },
      },
      { // 4. it comes off the floor in one wrong motion
        dur: 1.8, start: () => { e.riseHold = false; G.audio.shriek(e.pos); },
        cam: [P(3.4, 1.6, 0.5), P(3.1, 1.4, 1.3)], look: [at.clone().setY(0.8), at.clone().setY(1.4)], fov: 52,
      },
      {
        dur: 2.3, cam: [P(dist2D(p.pos, at) + 1.2, 0.5, 1.7)], look: [at.clone().setY(1.3)], fov: 44,
        lines: [[0.4, 'LEON', 'Should\'ve finished you.']],
      },
    ], () => {
      p.aiming = false;
      this.radioT = Math.max(this.radioT, 2.5);
      this.radio('RAD_C1_Reborn');
      G.ui.toast('Knife a fallen body (F) to make sure it stays down.', 6);
    });
  }

  onRebornRise(e) {
    if (!G.flags.FLG_C1_FirstReborn && G.mode === 'play' && !this.cine) this.firstReborn(e);
    else if (!G.flags.FLG_C1_FirstReborn) { G.flags.FLG_C1_FirstReborn = true; this.radio('RAD_C1_Reborn'); }
  }

  // CS_C1_HookmanIntro: the shed shutter dents, a hook punches through, and he steps out.
  hookmanIntro() {
    const h = this.hookman, p = G.player, L = G.level;
    if (!h?.alive) return;
    G.flags.FLG_C1_HookmanIntro = true;
    const shutter = L.shedShutter;
    const hookAt = V(15.0, 1.9, -15.2);
    let torn = false;
    const key = new THREE.PointLight(0xffb070, 7, 14, 1.4); key.position.set(11.5, 4.5, -11);
    this.play([
      { // 1. Yard C under its floods for the first time; VGR-7718 stands open
        dur: 4.6, start: () => { p.pos.set(1.5, 0, 9.2); p.yaw = Math.PI; },
        cam: [V(-21, 3.0, 9.5), V(-13, 3.3, 9.5)], look: [V(-13, 1, -7), V(-11, 1.2, -6)], fov: 46,
      },
      { // 2. Leon moves along the container line, pistol low
        dur: 3.2, start: () => { p.autoWalk = V(1.5, 0, 5.2); p.aiming = false; },
        cam: [V(3.4, 1.7, 10.4), V(3.1, 1.7, 7.6)], look: [V(1.5, 1.4, 8.2), V(1.5, 1.4, 5)], fov: 44,
      },
      { // 3. the painted square; the load swings on its chains
        dur: 3.0, start: () => G.audio.chain(V(-1, 6, -6), 0.5),
        cam: [V(0.6, 1.1, -0.6), V(0.8, 1.2, -1.0)], look: [V(-1, 0.2, -6), V(-1, 5.6, -6)], fov: 40,
        update: (k) => { L.drops[0].box.rotation.z = Math.sin(G.time * 1.4) * 0.02; void k; },
      },
      { // 4. the shed shutter, forty metres off. It dents outward.
        dur: 3.2, start: () => { p.autoWalk = null; p.pos.set(1.5, 0, 5.2); },
        cam: [V(2.0, 1.8, 8.4)], look: [V(15.1, 1.5, -15)], fov: 34,
        update: (k) => {
          if (k > 0.62 && !shutter.userData.dent) { shutter.userData.dent = true; G.audio.slam(V(15.1, 1.5, -15)); p.shake = 0.4; }
          shutter.position.x = 15.1 - (shutter.userData.dent ? Math.max(0, 0.18 - (k - 0.62) * 0.3) : 0);
        },
      },
      { // 5. Leon stops walking
        dur: 1.8, cam: [V(0.7, 1.68, 3.6), V(0.75, 1.68, 3.75)], look: [V(1.5, 1.62, 5.2)], fov: 36,
      },
      { // 6. a hook punches through the shutter and the whole thing is dragged off its runners
        dur: 3.2, cam: [V(10.4, 1.6, -11.2), V(10.7, 1.5, -11.6)], look: [V(15.1, 1.7, -15)], fov: 42,
        start: () => { h.pos.set(16.4, 0, -15); h.yaw = -Math.PI / 2; G.scene.add(key); },
        update: (k) => {
          if (k > 0.25 && !h.punched) { h.punched = true; G.audio.clang(hookAt); G.weapons.sparks(hookAt, 0xffd080, 14, V(-1, 0, 0)); }
          if (h.punched && !torn) { h.hook.position.copy(hookAt); h.hook.position.y -= Math.min(0.5, (k - 0.25) * 2); }
          if (k > 0.6 && !torn) { torn = true; L.setShedOpen(true); G.audio.shutter(V(15, 1, -15)); G.audio.slam(V(14, 0.5, -15.5)); p.shake = 0.7; }
        },
      },
      { // 7. low angle: he drags himself out of the dark
        dur: 4.6, start: () => { G.audio.roar(h.pos); this.spawnVargaNote(); },
        cam: [V(10.4, 0.22, -12.4), V(10.4, 0.25, -12.5)], look: [V(14, 0.8, -14.6), V(13, 3.4, -14.4)], fov: 52,
        update: (k, dt) => { h.pos.set(16.4 - k * 3.4, 0, -15 + k * 0.6); h.yaw = -Math.PI / 2 + 0.3; h.stride = 0.6; h.phase += dt * 3; },
      },
      { // 8. "Dmitri Varga. Night shift." Leon reloads without looking down.
        dur: 4.6, cam: [V(2.4, 1.85, 6.8), V(2.3, 1.8, 6.6)], look: [V(12, 1.7, -12.5)], fov: 40,
        lines: [[0.3, 'LEON', 'Dmitri Varga. Night shift.'], [2.5, 'LEON', 'Sorry about this.']],
        start: () => { G.audio.reload(0); },
        update: (k, dt) => { h.pos.set(13 - k * 1.6, 0, -14.4 + k * 1.3); h.yaw = Math.atan2(p.pos.x - h.pos.x, p.pos.z - h.pos.z); h.stride = 0.7; h.phase += dt * 3; },
      },
      { // 9. THE HOOKMAN
        dur: 1.9, start: () => { G.ui.fade(1); G.audio.clang(p.pos); G.ui.titleCard('Port Halvern', 'The Hookman', 2.2); },
        cam: [V(2.3, 1.8, 6.6)], look: [V(11, 1.7, -11)], fov: 40,
      },
    ], () => { G.scene.remove(key); this.startFight(); });
  }

  spawnVargaNote() {
    if (this.vargaNote) return;
    this.vargaNote = true;
    G.items.spawn({ file: 'NAR_C1_VargaNote', x: 19.2, z: -14.4, y: 1.2, label: 'Read the note pinned in the shed', dynamic: true });
  }

  startFight() {
    const h = this.hookman, p = G.player, L = G.level;
    h.pos.set(11.4, 0, -11.1); h.state = 'chase'; h.throwCd = 2; h.action = null;
    h.hookState = 'hand';
    p.pos.set(1.5, 0, 5.2); p.yaw = p.camYaw = Math.atan2(h.pos.x - p.pos.x, h.pos.z - p.pos.z);
    L.closeDoor('yardgate', 'sealed');
    L.setShedOpen(true);
    this.fight = { t: 0, hint: 0, stuck: 0, dropped: false };
    G.ui.boss('The Hookman', h.hp / h.maxHp);
    this.objective('OBJ_C1_13');
    this.saveGame();
  }

  // CS_C1_BoatDeparture: the tender, the river, and the lights on Saltmere.
  departure() {
    const p = G.player, L = G.level, boat = L.boat;
    L.boatBob = false;
    let bz = -36.2;
    const place = () => { boat.position.set(0, -0.25 + Math.sin(G.time * 1.3) * 0.05, bz); boat.rotation.z = Math.sin(G.time * 1.1) * 0.03; };
    const aboard = () => { p.pos.set(-0.2, boat.position.y + 0.62, bz + 2.2); };
    // Saltmere on the far shore: a scatter of warm lights and a lighthouse beam.
    const far = new THREE.Group();
    const dot = new THREE.SpriteMaterial({ color: 0xffc070, fog: false, transparent: true, opacity: 0.9, depthWrite: false });
    for (let k = 0; k < 18; k++) { const s = new THREE.Sprite(dot); s.position.set(rand(-40, 30), rand(0.5, 5), -150 - rand(0, 20)); s.scale.setScalar(rand(0.6, 1.4)); far.add(s); }
    const beam = new THREE.Mesh(new THREE.ConeGeometry(4, 60, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2c0, fog: false, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
    beam.geometry.translate(0, -30, 0); beam.rotation.z = Math.PI / 2;
    const tower = new THREE.Group(); tower.position.set(32, 14, -165); tower.add(beam); far.add(tower);
    const lampDot = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xfff2c0, fog: false })); lampDot.position.copy(tower.position); lampDot.scale.setScalar(2.4); far.add(lampDot);
    G.scene.add(far);
    const spin = (dt) => { tower.rotation.y += dt * 0.6; };
    const lines = this.rows('DLG_C1_Departure');
    const say = (i) => ['MARA (radio)', lines[i].text];
    this.play([
      { // 1. Leon steps down into the tender
        dur: 3.4, start: () => { p.autoWalk = V(0, 0, -33.6); },
        cam: [V(2.6, 1.6, -30.4), V(2.4, 1.5, -31)], look: [V(0, 1.1, -34.2)], fov: 44, update: () => place(),
        end: () => { p.autoWalk = null; aboard(); p.yaw = Math.PI; },
      },
      { // 2. from the water looking back: the floods, the gantries, the torn shed
        dur: 5.2, start: () => { G.audio.engine(V(0, 0, -36), 5); p.flashOn = false; },
        cam: [V(4, 1.1, -54), V(4.2, 1.2, -56)], look: [V(0, 3, -24), V(0, 3.5, -24)], fov: 46,
        update: (k, dt) => { bz = -36.2 - k * 9; place(); aboard(); spin(dt); },
      },
      { // 3. he looks back once, properly, and the radio keys up
        dur: 5.4, fov: 38, lines: [[0.4, ...say(0)]],
        update: (k, dt) => {
          bz = -45.2 - k * 5; place(); aboard(); spin(dt);
          p.yaw = k < 0.6 ? 0.2 : Math.PI; // back at the port, then forward
          const y = boat.position.y;
          p.camOverride = { pos: V(0.5, y + 1.9, bz + 4.0), look: V(-0.2, y + 1.85, bz + 2.2), fov: 38 };
        },
      },
      { // 4. over his shoulder: Saltmere's lights and the lighthouse sweep
        dur: 4.6, fov: 40, lines: [[1.6, 'LEON', lines[1].text]],
        update: (k, dt) => {
          bz = -50.2 - k * 4; place(); aboard(); spin(dt);
          const y = boat.position.y;
          p.camOverride = { pos: V(-0.8, y + 2.5, bz + 3.6), look: V(0, 2, -150), fov: 40 };
        },
      },
      { // 5. a small dark shape crossing a wide black river
        dur: 4.4, cam: [V(24, 16, -40), V(25, 17, -42)], look: [V(0, 0, -58)], fov: 50,
        lines: [[0.8, ...say(2)]],
        update: (k, dt) => { bz = -54.2 - k * 6; place(); aboard(); spin(dt); },
      },
      { // 6. black. Chapter 2.
        dur: 3.2, start: () => { G.ui.fade(1); G.ui.titleCard('Chapter 2 · 00:40', 'Saltmere Island', 3); },
        cam: [V(25, 17, -42)], look: [V(0, 0, -60)], update: (k, dt) => spin(dt),
      },
    ], () => {
      for (const r of lines) this.unlock(r);
      G.flags.FLG_C1_BoatTaken = true; G.flags.FLG_C1_Complete = true;
      this.finish();
    });
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
      [s.kills, 'Infected killed'], [acc + '%', 'Accuracy'], [s.saves, 'Saves'], [`${this.filesRead.length}`, 'Files found'],
    ].map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('');
    document.getElementById('end-screen').hidden = false;
  }

  // ----- save / load -----
  saveGame() {
    const p = G.player, L = G.level;
    this.save = {
      player: { x: p.pos.x, z: p.pos.z, yaw: p.yaw, hp: Math.max(p.hp, 1), injuries: [...p.injuries], infection: p.infection },
      weapons: { owned: [...G.weapons.owned], mag: { ...G.weapons.mag }, current: G.weapons.current },
      items: G.items.snapshot(),
      enemies: G.enemies.map(e => e.record()),
      doors: Object.fromEntries(Object.values(L.doors).map(d => [d.id, { open: d.open, locked: d.locked, lock: d.lock }])),
      drops: L.drops.map(d => (d.state === 'hung' ? 'hung' : 'down')),
      shed: !L.shedShutter.userData.collider.enabled,
      flags: { ...G.flags },
      crane: { fuse: this.crane.fuse, trips: this.crane.trips, hint: this.crane.hint },
      cage: { ...this.cage },
      fight: this.fight && { ...this.fight },
      played: [...this.played], vargaNote: !!this.vargaNote,
      visited: [...L.visited], obj: this.objId, files: [...this.filesRead],
    };
  }

  // Throw every enemy away and rebuild each one from its saved record.
  restoreEnemies(records) {
    for (const e of G.enemies) {
      G.scene.remove(e.h.root);
      if (e.h.head.parent === G.scene) G.scene.remove(e.h.head);
      e.dispose?.();
    }
    G.enemies.length = 0;
    G.hitMeshes = [];
    for (const rec of records) {
      const busy = ['chase', 'suspicious', 'grab', 'rising'].includes(rec.state);
      const state = rec.opts.kind === 'hookman' ? rec.state : busy ? 'idle' : rec.state;
      const e = this.spawn({ ...rec.opts, x: rec.x, z: rec.z, yaw: rec.yaw, state: rec.alive ? state : 'idle' });
      if (!rec.alive) {
        e.makeCorpse();
        if (rec.headless) { e.headless = true; e.h.head.visible = false; }
        if (rec.finished || rec.headless) { e.finished = true; e.waiting = false; }
        else if (rec.riseT > 0) e.startRise(rec.riseT);
        if (e.boss) e.hookState = 'dropped';
        continue;
      }
      if (rec.reborn) e.rise(true);
      e.hp = rec.hp;
      if (e.boss && rec.phase2) { e.phase2 = true; e.speedChase = 1.6; for (const g of e.growths) g.scale.setScalar(1.25); }
    }
    const named = (n) => G.enemies.find(e => e.opts.name === n);
    this.hookman = named('hookman'); this.guard = named('guard'); this.kelso = named('kelso');
  }

  loadGame() {
    const s = this.save, p = G.player, L = G.level;
    if (!s) return;
    if (this.cine) { this.cine.onEnd = null; this.endCine(); }
    p.pos.set(s.player.x, 0, s.player.z); p.yaw = p.camYaw = s.player.yaw; p.camPitch = -0.08;
    p.hp = s.player.hp; p.injuries = new Set(s.player.injuries); p.infection = s.player.infection || 0;
    p.grab = null; p.healT = 0; p.deathT = null; p.stunT = 0; p.h.root.rotation.x = 0; p.h.root.position.y = 0; p.vel.set(0, 0, 0);
    p.crouch = false; p.control = true; p.camOverride = null; p.autoWalk = null; p.h.root.visible = true;
    G.weapons.owned = [...s.weapons.owned]; G.weapons.mag = { ...s.weapons.mag }; G.weapons.reloadT = 0;
    G.weapons.current = null; G.weapons.select(s.weapons.current);
    G.items.restore(s.items);
    for (const id in s.doors) {
      const d = L.doors[id], r = s.doors[id];
      d.open = r.open; d.locked = r.locked; d.lock = r.lock;
      d.collider.enabled = !r.open; d.target = r.open ? (d.target || 1) : 0;
    }
    G.flags = { ...s.flags };
    L.setDrops(s.drops);
    L.setShedOpen(s.shed);
    this.restoreEnemies(s.enemies);
    this.crane = { ...this.crane, ...s.crane, order: [], lockT: 0, nearT: 0 };
    L.craneLamps.forEach(m => m.material.color.set(0x331010));
    if (G.flags.FLG_C1_PowerRestored) this.powerOn(true);
    else {
      L.setYardPower(false);
      const R = L.room('control'); R.lamp.visible = false; R.fixture.material.emissiveIntensity = 0;
    }
    this.cage = { ...s.cage };
    this.fight = s.fight && { ...s.fight };
    this.played = new Set(s.played); this.vargaNote = s.vargaNote;
    L.visited = new Set(s.visited); this.lastRoom = L.roomAt(p.pos.x, p.pos.z)?.id;
    this.filesRead = [...s.files];
    this.objId = null; this.objective(s.obj);
    G.ui.boss(null); G.ui.struggle(null); G.ui.subtitle(null, '');
    if (this.fight && this.hookman?.alive) G.ui.boss('The Hookman', this.hookman.hp / this.hookman.maxHp);
    this.radioQueue = []; this.radioT = 0;
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
    if (roomId === 'customs' && !G.flags.FLG_C1_CageOpen) return true;
    if (roomId === 'control' && !G.flags.FLG_C1_PowerRestored) return true;
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
    this.triggers(dt, room);
    // a gentle nudge if the player has been stuck on one objective for a long time
    this.objT += dt;
    const o = this.objById.get(this.objId);
    if (o && !this.objHinted && this.objT > 150 && !this.radioQueue.length) { this.objHinted = true; G.ui.toast(o.hint, 6); }
    // nearest interactable in front of Leon
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

  triggers(dt, room) {
    const p = G.player, F = G.flags;
    // pier head: Mara calls on the port band
    if (F.FLG_C1_Landed && !F.FLG_C1_PierHeadReached && p.pos.z < 54) {
      F.FLG_C1_PierHeadReached = true;
      this.objective('OBJ_C1_02');
      this.radio('RAD_C1_MaraFirst', () => this.objective('OBJ_C1_03'));
    }
    // across the warehouse floor to the yard-side doors
    if (F.FLG_C1_TapeWatched && !F.FLG_C1_WarehouseCrossed && ((room === 'warehouse' && p.pos.z < 26) || ['break', 'customs', 'control'].includes(room))) {
      F.FLG_C1_WarehouseCrossed = true;
      if (!F.FLG_C1_FuseFound) this.objective('OBJ_C1_09');
      if (!this.played.has('RAD_C1_Ortiz')) this.optional('OBJ_C1_08');
      if (!F.FLG_C1_CageOpen) setTimeout(() => this.optional('OBJ_C1_10'), 4500);
    }
    // the customs keypad hints: time spent standing at it
    if (!F.FLG_C1_CageOpen && F.FLG_C1_TapeWatched && dist2D(p.pos, { x: 13, z: 21 }) < 3.5) {
      const c = this.cage; c.nearT += dt;
      if (c.nearT > 45) this.cageHint(1);
      if (c.nearT > 90) this.cageHint(2);
      if (c.nearT > 150) this.cageHint(3);
    }
    // the crane panel: breaker lockout and hints over time
    const c = this.crane;
    c.lockT = Math.max(0, c.lockT - dt);
    if (c.fuse && !F.FLG_C1_PowerRestored && room === 'control') {
      c.nearT += dt;
      if (c.nearT > 120) this.craneHint(2);
      if (c.nearT > 200) this.craneHint(3);
    }
    // into the yard: the Hookman
    if (F.FLG_C1_PowerRestored && !F.FLG_C1_HookmanIntro && room === 'yard' && p.pos.z < 9.5) this.hookmanIntro();
    // the fight's own hints
    const f = this.fight;
    if (f && this.hookman?.alive) {
      f.t += dt;
      if (f.t > 20) this.hookHint(1);
      if (f.t > 60 || f.stuck >= 2) this.hookHint(2);
      if ((f.t > 110 || p.state === 'danger') && !f.dropped) this.hookHint(3);
    }
    if (this.kelso && !this.kelsoSaid && this.kelso.hp < this.kelso.maxHp) { this.kelsoSaid = true; this.radio('RAD_C1_Kelso'); }
  }

  onEnterRoom(room) {
    if (room === 'office') {
      G.flags.FLG_C1_SafeRoomFound = true;
      this.radio('RAD_C1_SafeRoom', () => { if (!G.flags.FLG_C1_ManifestsRead) this.objective('OBJ_C1_05'); });
      G.ui.toast('Safe room. Key the relay radio to save.', 5);
    }
    if (room === 'warehouse') this.radio('RAD_C1_Warehouse');
  }
}
