// Boot, renderer, post-processing, input and the main loop.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { G } from './game.js';
import { Audio } from './audio.js';
import { Level } from './level.js';
import { Player } from './player.js';
import { Weapons } from './weapons.js';
import { Items } from './items.js';
import { Story, loadData } from './story.js';
import { loadModelList, syncModels } from './models.js';
import { UI } from './ui.js';

const $ = (id) => document.getElementById(id);

// ---------- input ----------
class Input {
  constructor(el) {
    this.keys = new Set(); this.fresh = new Set();
    this.btn = new Set(); this.freshBtn = new Set();
    this.dx = 0; this.dy = 0;
    addEventListener('keydown', (e) => {
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.fresh.add(e.code);
      this.keys.add(e.code);
      onKey(e);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.btn.clear(); });
    el.addEventListener('mousedown', (e) => { this.btn.add(e.button); this.freshBtn.add(e.button); if (G.mode === 'play' && !document.pointerLockElement) G.requestLock(); });
    addEventListener('mouseup', (e) => this.btn.delete(e.button));
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('mousemove', (e) => { if (document.pointerLockElement || (G.noLock && G.mode === 'play')) { this.dx += e.movementX; this.dy += e.movementY; } });
  }
  down(c) { return this.keys.has(c); }
  pressed(c) { return this.fresh.has(c); }
  mouse(b) { return this.btn.has(b); }
  mousePressed(b) { return this.freshBtn.has(b); }
  endFrame() { this.fresh.clear(); this.freshBtn.clear(); this.dx = 0; this.dy = 0; }
}

function onKey(e) {
  const ui = G.ui;
  if (!ui) return;
  if (G.mode === 'cine' && ['Space', 'Enter', 'Escape'].includes(e.code)) { G.story.skipCine(); return; }
  if (G.mode === 'modal') {
    if (ui.modalOpen === 'keypad' && ui.keypadKey && e.code !== 'Escape') { ui.keypadKey(e); return; }
    const closeKeys = { file: ['KeyE', 'Escape', 'Space'], inventory: ['Tab', 'Escape', 'KeyI'], map: ['KeyM', 'Escape'], keypad: ['Escape'], breakers: ['Escape'] }[ui.modalOpen] || ['Escape'];
    if (closeKeys.includes(e.code)) {
      const back = ui.modalOpen === 'file' && G.story.returnToInventory;
      G.story.returnToInventory = false;
      ui.closeModal();
      if (back) ui.showInventory();
      G.input.fresh.clear();
    }
    return;
  }
  if (G.mode === 'play' && !G.player.grab) {
    if (e.code === 'Tab' || e.code === 'KeyI') ui.showInventory();
    else if (e.code === 'KeyM') ui.showMap();
    else if (e.code === 'Escape') pause();
  }
  // brightness: - and = (or + on the keypad), any time
  if (['Minus', 'NumpadSubtract', 'Equal', 'NumpadAdd'].includes(e.code)) setBrightness(G.fx.bright.value + (e.code === 'Minus' || e.code === 'NumpadSubtract' ? -0.1 : 0.1), true);
}

// ---------- renderer & post ----------
function initRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.7;
  $('game').appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x161b22);
  scene.fog = new THREE.FogExp2(0x161b22, 0.026);
  const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.05, 200);
  const target = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.45, 0.6, 0.82);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, time: { value: 0 }, danger: { value: 0 }, hurt: { value: 0 }, ca: { value: 0.6 }, infect: { value: 0 }, cctv: { value: 0 }, glitch: { value: 0 }, bright: { value: 1.25 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float time, danger, hurt, ca, infect, cctv, glitch, bright; varying vec2 vUv;
      float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){
        vec2 uv = vUv;
        // infection: a slow swim at the edges of vision
        uv += infect * 0.006 * vec2(sin(uv.y * 18.0 + time * 2.1), cos(uv.x * 14.0 + time * 1.7)) * smoothstep(0.15, 0.6, length(uv - 0.5));
        // CCTV tape: line tearing and a rolling band
        float band = smoothstep(0.0, 0.02, abs(fract(uv.y - time * 0.11) - 0.5) - 0.47);
        uv.x += cctv * (glitch * (rnd(vec2(floor(uv.y * 60.0), floor(time * 20.0))) - 0.5) * 0.08 + (1.0 - band) * 0.004);
        vec2 vUv = uv;
        vec2 d = vUv - 0.5; float r = length(d);
        float off = ca * (0.0015 + 0.006 * r) * (1.0 + danger);
        vec3 col = vec3(texture2D(tDiffuse, vUv + d * off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - d * off).b);
        float lum = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(col, vec3(lum), 0.12 + danger * 0.45);
        // brightness setting: lifts the shadows more than the highlights
        col = pow(max(col, 0.0), vec3(1.0 / bright));
        col *= vec3(1.02, 0.99, 0.93);
        float vig = smoothstep(0.9, 0.22, r * (1.0 + danger * 0.35));
        col *= mix(0.6, 1.0, vig);
        col += vec3(0.55, 0.0, 0.0) * hurt * (1.0 - vig * 0.6);
        col = mix(col, col * vec3(1.25, 0.55, 0.55), danger * 0.3 * (0.5 + 0.5 * sin(time * 4.5)) * (1.0 - vig));
        col += (rnd(vUv * vec2(1731.0, 977.0) + fract(time)) - 0.5) * 0.055;
        col = mix(col, col * vec3(0.92, 1.05, 0.9) + vec3(0.0, 0.015, 0.0), infect * 0.6);
        if (cctv > 0.0) {
          float g = dot(col, vec3(0.299, 0.587, 0.114));
          g = pow(g * 1.35, 0.8);
          vec3 tape = vec3(g * 0.92, g, g * 0.88);
          tape *= 0.86 + 0.14 * sin(vUv.y * 900.0);
          tape += (rnd(floor(vUv * vec2(320.0, 240.0)) + fract(time * 8.0)) - 0.5) * 0.16;
          tape *= mix(0.6, 1.0, band);
          tape = mix(tape, vec3(rnd(vUv * 500.0 + time)), glitch * 0.85);
          col = mix(col, tape, cctv);
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  composer.addPass(grade);
  G.renderer = renderer; G.scene = scene; G.camera = camera; G.composer = composer; G.fx = grade.uniforms;
  // a soft light on the camera so faces and walls near the lens never go fully black
  G.camFill = new THREE.PointLight(0xc8d2e0, 3, 9, 1.6); camera.add(G.camFill); scene.add(camera);
  let saved = 1.25; try { saved = parseFloat(localStorage.getItem('evilrise.bright')) || 1.25; } catch {}
  setBrightness(saved);
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
  });
}

function setBrightness(v, announce) {
  v = Math.round(Math.min(2, Math.max(0.8, v)) * 10) / 10;
  G.fx.bright.value = v;
  try { localStorage.setItem('evilrise.bright', String(v)); } catch {}
  if (announce) G.ui?.toast(`Brightness ${Math.round(v * 100)}%  ( - darker, = brighter )`, 2);
}

G.requestLock = () => {
  const c = G.renderer?.domElement;
  // Pointer lock is optional: if the page cannot lock the mouse, raw mouse movement still turns the camera.
  try { const r = c?.requestPointerLock?.(); r?.catch?.(() => { G.noLock = true; }); if (!c?.requestPointerLock) G.noLock = true; } catch { G.noLock = true; }
};

document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement && G.mode === 'play') pause();
});

function pause() {
  if (G.mode !== 'play') return;
  G.mode = 'pause';
  document.exitPointerLock?.();
  $('pause-screen').hidden = false;
}

function resume() {
  $('pause-screen').hidden = true;
  G.mode = 'play';
  G.requestLock();
}

// ---------- boot ----------
// The Prologue (the hotel and the drive) plays first; #chapter1 in the address starts at the port.
const CHAPTER = location.hash === '#chapter1' ? 1 : 0;

async function boot() {
  const [data] = await Promise.all([loadData(CHAPTER), loadModelList()]);
  initRenderer();
  G.input = new Input(G.renderer.domElement);
  G.audio = new Audio();
  G.ui = new UI();
  G.chapter = CHAPTER;
  if (CHAPTER === 0) {
    const [{ PrologueLevel }, { PrologueStory }] = await Promise.all([import('./prologue/level0.js'), import('./prologue/story0.js')]);
    G.level = new PrologueLevel();
    G.story = new PrologueStory(data);
  } else {
    G.level = new Level();
    G.story = new Story(data);
  }
  G.player = new Player();
  G.player.pos.set(0, 0, 60);
  G.strain = 1; // the virus is at its weakest in the first chapters
  G.weapons = new Weapons();
  G.items = new Items();
  if (CHAPTER === 1) {
    G.items.add('ammo9', 12);
    G.items.add('herbG', 1);
  } else G.items.add('herbG', 1);
  G.story.setup();
  G.camera.position.set(-4, 14, 78);
  G.camera.lookAt(0, 2, 40);
  // title screen text for the chapter that is loaded
  $('logo-sub').textContent = CHAPTER === 0 ? 'Prologue · Check-In' : 'Chapter 1 · Port Halvern';
  $('btn-start').textContent = CHAPTER === 0 ? 'Begin' : 'Step onto the pier';
  $('btn-chapter').textContent = CHAPTER === 0 ? 'Skip to Chapter 1' : 'Play the Prologue first';
  $('btn-chapter').hidden = false;
  $('btn-chapter').addEventListener('click', () => { location.hash = CHAPTER === 0 ? '#chapter1' : '#prologue'; location.reload(); });
  $('btn-next').addEventListener('click', () => { location.hash = '#chapter1'; location.reload(); });

  $('loading').hidden = true;
  $('btn-start').hidden = false;
  $('btn-start').focus();
  $('btn-start').addEventListener('click', () => {
    G.audio.start();
    $('title-screen').hidden = true;
    G.ui.showHud(true);
    G.stats.startTime = performance.now();
    G.requestLock();
    G.story.introCutscene();
  });
  $('btn-resume').addEventListener('click', resume);
  $('btn-restart-cp').addEventListener('click', () => { $('pause-screen').hidden = true; G.story.loadGame(); G.requestLock(); });
  $('btn-continue').addEventListener('click', () => { $('dead-screen').hidden = true; G.story.loadGame(); G.requestLock(); });
  $('btn-replay').addEventListener('click', () => location.reload());
  if (matchMedia('(pointer: coarse)').matches) document.querySelector('.note').textContent = 'EvilRise needs a keyboard and mouse. Open this page on a computer to play.';

  let last = performance.now();
  const frame = (now) => {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    tick(dt);
  };
  requestAnimationFrame(frame);
}

function tick(dt) {
  logic(dt);
  syncModels();
  // security footage holds each frame for 1/8 s, like a cheap recorder
  if (G.frameHold) { G.holdT = (G.holdT || 0) + dt; if (G.holdT >= G.frameHold) { G.holdT = 0; G.composer.render(dt); } }
  else G.composer.render(dt);
  G.input?.endFrame();
}

// Advance the simulation without drawing (used by automated tests).
G.debugStep = (n, dt = 1 / 30) => { for (let k = 0; k < n; k++) { logic(dt); G.input?.endFrame(); } };

function logic(dt) {
  const mode = G.mode;
  if (mode === 'play' || mode === 'cine') {
    G.time += dt;
    G.player.update(dt);
    if (mode === 'play') {
      G.weapons.update(dt);
      for (const e of G.enemies) e.update(dt);
    } else {
      for (const e of G.enemies) e.cineUpdate(dt);
      G.weapons.update(dt);
    }
    G.items.update(dt);
    G.story.update(dt);
    for (const fn of G.updaters) if (!fn(dt)) G.updaters.delete(fn);
  } else if (mode === 'dead') {
    G.time += dt;
    G.player.update(dt);
  } else if (mode === 'title') {
    G.time += dt;
    if (G.story?.titleView) G.story.titleView(G.time);
    else {
      const t = G.time * 0.05;
      G.camera.position.set(Math.sin(t) * 10, 12, 80);
      G.camera.lookAt(0, 2, 40);
    }
  }
  if (G.level) G.level.update(dt);
  if (G.ui && mode !== 'title') G.ui.update(dt);
  G.audio?.update();
  // screen treatment follows Leon's condition
  if (G.fx) {
    const p = G.player;
    G.fx.time.value = G.time;
    G.fx.danger.value += (((p?.state === 'danger' ? 1 : p?.state === 'caution' ? 0.25 : 0)) - G.fx.danger.value) * Math.min(1, dt * 2);
    G.fx.hurt.value = p ? p.hurtFlash * 0.6 : 0;
    G.fx.infect.value += ((p?.infection || 0) - G.fx.infect.value) * Math.min(1, dt);
  }
}

window.EVILRISE = G; // handy for debugging from the console

boot().catch((err) => {
  $('loading').textContent = 'Could not start: ' + err.message;
  console.error(err);
});
