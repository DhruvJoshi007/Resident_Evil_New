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
import { Story } from './story.js';
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
}

// ---------- renderer & post ----------
function initRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  $('game').appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050608);
  scene.fog = new THREE.FogExp2(0x07080a, 0.042);
  const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.05, 200);
  const target = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.45, 0.6, 0.82);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, time: { value: 0 }, danger: { value: 0 }, hurt: { value: 0 }, ca: { value: 0.6 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float time, danger, hurt, ca; varying vec2 vUv;
      float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){
        vec2 d = vUv - 0.5; float r = length(d);
        float off = ca * (0.0015 + 0.006 * r) * (1.0 + danger);
        vec3 col = vec3(texture2D(tDiffuse, vUv + d * off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - d * off).b);
        float lum = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(col, vec3(lum), 0.2 + danger * 0.45);
        col *= vec3(1.02, 0.99, 0.93);
        float vig = smoothstep(0.9, 0.22, r * (1.0 + danger * 0.35));
        col *= mix(0.25, 1.0, vig);
        col += vec3(0.55, 0.0, 0.0) * hurt * (1.0 - vig * 0.6);
        col = mix(col, col * vec3(1.25, 0.55, 0.55), danger * 0.3 * (0.5 + 0.5 * sin(time * 4.5)) * (1.0 - vig));
        col += (rnd(vUv * vec2(1731.0, 977.0) + fract(time)) - 0.5) * 0.055;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  composer.addPass(grade);
  G.renderer = renderer; G.scene = scene; G.camera = camera; G.composer = composer; G.fx = grade.uniforms;
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
  });
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
function boot() {
  initRenderer();
  G.input = new Input(G.renderer.domElement);
  G.audio = new Audio();
  G.ui = new UI();
  G.level = new Level();
  G.story = new Story();
  G.player = new Player();
  G.player.pos.set(0, 0, 55.2);
  G.weapons = new Weapons();
  G.items = new Items();
  G.items.add('ammo9', 12);
  G.items.add('herbG', 1);
  G.story.setup();
  G.camera.position.set(0, 20, 64);
  G.camera.lookAt(0, 0, 36);

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
  if (matchMedia('(pointer: coarse)').matches) document.querySelector('.note').textContent = 'VEILFALL needs a keyboard and mouse. Open this page on a computer to play.';

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
  G.composer.render(dt);
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
    const t = G.time * 0.05;
    G.camera.position.set(Math.sin(t) * 6, 16, 62);
    G.camera.lookAt(0, 0, 36);
  }
  if (G.level) G.level.update(dt);
  if (G.ui && mode !== 'title') G.ui.update(dt);
  G.audio?.update();
  // screen treatment follows Mara's condition
  if (G.fx) {
    const p = G.player;
    G.fx.time.value = G.time;
    G.fx.danger.value += (((p?.state === 'danger' ? 1 : p?.state === 'caution' ? 0.25 : 0)) - G.fx.danger.value) * Math.min(1, dt * 2);
    G.fx.hurt.value = p ? p.hurtFlash * 0.6 : 0;
  }
}

window.VEILFALL = G; // handy for debugging from the console

try {
  boot();
} catch (err) {
  $('loading').textContent = 'Could not start: ' + err.message;
  console.error(err);
}
