// Procedural surface textures drawn on canvas, so the build ships no image files.
import * as THREE from 'three';

const cache = {};

function canvas(size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')];
}

function speckle(g, size, count, colors, rMin, rMax, alpha = 0.25) {
  for (let i = 0; i < count; i++) {
    g.globalAlpha = Math.random() * alpha;
    g.fillStyle = colors[(Math.random() * colors.length) | 0];
    const r = rMin + Math.random() * (rMax - rMin);
    g.beginPath();
    g.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
}

function grimeBottom(g, size, strength = 0.55) {
  const grad = g.createLinearGradient(0, size, 0, size * 0.55);
  grad.addColorStop(0, `rgba(20,16,12,${strength})`);
  grad.addColorStop(1, 'rgba(20,16,12,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
}

function streaks(g, size, n, color, alpha) {
  g.strokeStyle = color;
  for (let i = 0; i < n; i++) {
    g.globalAlpha = Math.random() * alpha;
    g.lineWidth = 1 + Math.random() * 6;
    const x = Math.random() * size;
    g.beginPath();
    g.moveTo(x, Math.random() * size * 0.3);
    g.lineTo(x + (Math.random() - 0.5) * 8, size * (0.4 + Math.random() * 0.6));
    g.stroke();
  }
  g.globalAlpha = 1;
}

const painters = {
  asphalt(g, s) {
    g.fillStyle = '#26282a'; g.fillRect(0, 0, s, s);
    speckle(g, s, 9000, ['#3a3c3f', '#1a1b1d', '#4a4a48'], 0.5, 2, 0.6);
    speckle(g, s, 40, ['#101112'], 20, 70, 0.35); // puddle stains
  },
  tile(g, s) {
    g.fillStyle = '#8f8a7e'; g.fillRect(0, 0, s, s);
    const n = 8, t = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      g.fillStyle = (i + j) % 2 ? '#a8a294' : '#3b3a37';
      g.fillRect(i * t + 2, j * t + 2, t - 4, t - 4);
    }
    speckle(g, s, 3000, ['#5a554c', '#221f1b'], 0.5, 3, 0.25);
    speckle(g, s, 25, ['#2a1f17'], 15, 60, 0.25);
  },
  wood(g, s) {
    g.fillStyle = '#4a3324'; g.fillRect(0, 0, s, s);
    const planks = 6, w = s / planks;
    for (let i = 0; i < planks; i++) {
      g.fillStyle = ['#523826', '#45301f', '#5a3e2a'][i % 3];
      g.fillRect(i * w + 1, 0, w - 2, s);
      for (let k = 0; k < 40; k++) {
        g.globalAlpha = 0.15; g.strokeStyle = '#2a1a10'; g.lineWidth = 1;
        const x = i * w + Math.random() * w;
        g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 4, s * 0.3, x - 4, s * 0.6, x + 2, s); g.stroke();
      }
      g.globalAlpha = 1;
    }
    speckle(g, s, 1500, ['#1c120b'], 0.5, 2, 0.4);
  },
  plaster(g, s) {
    g.fillStyle = '#7d786c'; g.fillRect(0, 0, s, s);
    speckle(g, s, 5000, ['#8c877b', '#6a655b', '#5b574f'], 1, 4, 0.35);
    speckle(g, s, 30, ['#4c4237', '#3d362d'], 20, 80, 0.2);
    streaks(g, s, 40, '#3a3127', 0.25);
    grimeBottom(g, s);
    g.fillStyle = '#3c3a35'; g.fillRect(0, s * 0.86, s, s * 0.14); // skirting
  },
  brick(g, s) {
    g.fillStyle = '#3d2a24'; g.fillRect(0, 0, s, s);
    const bh = s / 16, bw = s / 6;
    for (let r = 0; r < 16; r++) for (let c = -1; c < 7; c++) {
      const off = (r % 2) * bw / 2;
      g.fillStyle = ['#5e3b30', '#523329', '#6b4434', '#4a2d25'][(Math.random() * 4) | 0];
      g.fillRect(c * bw + off + 2, r * bh + 2, bw - 4, bh - 4);
    }
    speckle(g, s, 4000, ['#2a1b16', '#7a5546'], 0.5, 2, 0.3);
    streaks(g, s, 60, '#140d0a', 0.35);
  },
  concrete(g, s) {
    g.fillStyle = '#5c5b57'; g.fillRect(0, 0, s, s);
    speckle(g, s, 9000, ['#6e6d68', '#4a4945', '#3a3936'], 0.5, 3, 0.5);
    speckle(g, s, 40, ['#2e2c29', '#3b2a22'], 20, 90, 0.25);
    g.strokeStyle = 'rgba(25,25,25,0.6)'; g.lineWidth = 2;
    g.strokeRect(0, 0, s, s);
  },
  marble(g, s) {
    g.fillStyle = '#b9b3a6'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 26; i++) {
      g.globalAlpha = 0.25; g.strokeStyle = '#6d675d'; g.lineWidth = 1 + Math.random() * 2;
      g.beginPath(); let x = Math.random() * s, y = 0; g.moveTo(x, y);
      while (y < s) { x += (Math.random() - 0.5) * 40; y += 20 + Math.random() * 30; g.lineTo(x, y); }
      g.stroke();
    }
    g.globalAlpha = 1;
    g.strokeStyle = 'rgba(40,36,30,0.7)'; g.lineWidth = 3; g.strokeRect(0, 0, s, s);
    speckle(g, s, 30, ['#3a2e24'], 20, 70, 0.25);
  },
  carpet(g, s) {
    g.fillStyle = '#2d3a42'; g.fillRect(0, 0, s, s);
    speckle(g, s, 14000, ['#35444d', '#232e34', '#3e4c55'], 0.5, 1.5, 0.6);
    speckle(g, s, 20, ['#1a1410'], 20, 80, 0.3);
  },
  metal(g, s) {
    g.fillStyle = '#4b4f52'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 300; i++) {
      g.globalAlpha = 0.08; g.fillStyle = Math.random() > 0.5 ? '#6a6f73' : '#2e3133';
      g.fillRect(0, Math.random() * s, s, 1 + Math.random() * 2);
    }
    g.globalAlpha = 1;
    speckle(g, s, 60, ['#5a3a22', '#6b4426'], 5, 30, 0.35); // rust
  },
  cloth(g, s) {
    g.fillStyle = '#808080'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < s; i += 3) { g.globalAlpha = 0.12; g.fillStyle = '#000'; g.fillRect(0, i, s, 1); g.fillRect(i, 0, 1, s); }
    g.globalAlpha = 1;
    speckle(g, s, 30, ['#3a1a14', '#2a2a2a'], 8, 40, 0.3);
  },
  skin(g, s) {
    g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, s, s);
    speckle(g, s, 4000, ['#7a7a7a', '#b0b0b0'], 0.5, 2, 0.3);
  },
  rot(g, s) {
    g.fillStyle = '#8a8f80'; g.fillRect(0, 0, s, s);
    speckle(g, s, 3000, ['#5d6352', '#a3a08f'], 1, 4, 0.4);
    speckle(g, s, 70, ['#3c1a16', '#5c2a20', '#2c3324'], 6, 28, 0.6); // wounds and veins
    g.strokeStyle = 'rgba(40,50,45,0.5)'; g.lineWidth = 1.5;
    for (let i = 0; i < 40; i++) {
      g.beginPath(); let x = Math.random() * s, y = Math.random() * s; g.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += (Math.random() - 0.5) * 30; y += (Math.random() - 0.5) * 30; g.lineTo(x, y); }
      g.stroke();
    }
  },
};

export function tex(kind, repeat = 1, repeatY = repeat) {
  const key = kind + ':' + repeat + ':' + repeatY;
  if (cache[key]) return cache[key];
  let base = cache[kind + ':base'];
  if (!base) {
    const [c, g] = canvas(512);
    painters[kind](g, 512);
    base = new THREE.CanvasTexture(c);
    base.colorSpace = THREE.SRGBColorSpace;
    base.anisotropy = 8;
    cache[kind + ':base'] = base;
  }
  const t = base.clone();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeatY);
  t.needsUpdate = true;
  cache[key] = t;
  return t;
}

export function mat(kind, opts = {}) {
  const map = tex(kind, opts.repeat || 1, opts.repeatY ?? opts.repeat ?? 1);
  return new THREE.MeshStandardMaterial({
    map,
    bumpMap: map,
    bumpScale: opts.bump ?? 0.6,
    roughness: opts.roughness ?? 0.85,
    metalness: opts.metalness ?? 0,
    color: opts.color ?? 0xffffff,
  });
}

// Soft round sprite used for sparks, dust, blood mist and glints.
let dotTex = null;
export function dotTexture() {
  if (dotTex) return dotTex;
  const [c, g] = canvas(64);
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  dotTex = new THREE.CanvasTexture(c);
  return dotTex;
}

let splatTex = null;
export function bloodTexture() {
  if (splatTex) return splatTex;
  const [c, g] = canvas(128);
  g.fillStyle = 'rgba(90,6,4,0.95)';
  g.beginPath(); g.arc(64, 64, 26, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 18; i++) {
    const a = Math.random() * Math.PI * 2, d = 20 + Math.random() * 38, r = 3 + Math.random() * 9;
    g.beginPath(); g.arc(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, r, 0, Math.PI * 2); g.fill();
  }
  splatTex = new THREE.CanvasTexture(c);
  splatTex.colorSpace = THREE.SRGBColorSpace;
  return splatTex;
}

// Paper with text, used for wall notices and the files on desks.
export function labelTexture(lines, opts = {}) {
  const w = opts.w || 512, h = opts.h || 256;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = opts.bg || '#d8d0bb'; g.fillRect(0, 0, w, h);
  g.fillStyle = opts.fg || '#231f1a';
  g.font = `${opts.size || 44}px "Special Elite", "Courier New", monospace`;
  g.textAlign = 'center';
  lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * (opts.size || 44) * 1.2 + 14));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
