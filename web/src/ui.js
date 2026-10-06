// HUD and menus: ECG health readout, ammo, detection meter, prompts,
// subtitles, inventory, files, map and puzzle panels.
import { G, clamp } from './game.js';
import { ITEMS, KEY_ITEMS } from './items.js';
import { ROOMS, DOORS } from './level.js';
import { WEAPONS } from './weapons.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor() {
    this.toastT = 0;
    this.ecg = $('ecg').getContext('2d');
    this.ecgX = 0; this.ecgPhase = 0;
    this.modalOpen = null;
    this.selected = null;
    this.subQueue = [];
    const bar = document.createElement('div');
    bar.className = 'hud';
    bar.id = 'boss';
    bar.hidden = true;
    bar.style.cssText = 'left:50%;top:calc(24px + env(safe-area-inset-top,0px));transform:translateX(-50%);width:min(520px,70vw);text-align:center;font-family:var(--font-display);font-size:22px;letter-spacing:.1em';
    bar.innerHTML = '<div id="boss-name"></div><div style="height:6px;background:rgba(255,255,255,.12);margin-top:6px"><div id="boss-fill" style="height:100%;width:100%;background:var(--blood)"></div></div>';
    document.body.appendChild(bar);
  }

  showHud(on) {
    for (const id of ['hud-objective', 'hud-detect', 'hud-vitals', 'hud-ammo']) $(id).hidden = !on;
  }

  objective(text) { $('objective-text').textContent = text; }

  toast(text, secs = 3.2) {
    const t = $('toast'); t.textContent = text; t.style.opacity = 1; this.toastT = secs;
  }

  subtitle(who, text) {
    $('subtitles').innerHTML = text ? (who ? `<b>${who}</b>  ${text}` : text) : '';
  }

  struggle(v) {
    const s = $('struggle');
    if (v == null) { s.hidden = true; return; }
    s.hidden = false; $('struggle-fill').style.width = `${clamp(v, 0, 1) * 100}%`;
  }

  boss(name, frac) {
    const b = $('boss');
    if (name == null) { b.hidden = true; return; }
    b.hidden = false; $('boss-name').textContent = name; $('boss-fill').style.width = `${clamp(frac, 0, 1) * 100}%`;
  }

  titleCard(small, big, secs = 3.5) {
    $('titlecard-small').textContent = small; $('titlecard-text').textContent = big;
    const el = $('titlecard'); el.style.opacity = 1;
    clearTimeout(this.tcT); this.tcT = setTimeout(() => { el.style.opacity = 0; }, secs * 1000);
  }

  fade(to) { $('fade').style.opacity = to; }

  update(dt) {
    const p = G.player;
    if (this.toastT > 0) { this.toastT -= dt; if (this.toastT <= 0) $('toast').style.opacity = 0; }
    // vitals
    const st = p.state;
    const color = { fine: '#5fbf6a', caution: '#d8a33a', danger: '#b3261e', dead: '#b3261e' }[st];
    $('vital-label').textContent = { fine: 'Fine', caution: 'Caution', danger: 'Danger', dead: '' }[st];
    $('vital-label').style.color = color;
    const inj = [...p.injuries].map(i => ({ leg: 'Leg injury', bleeding: 'Bleeding', arm: 'Arm injury' }[i]));
    let injHtml = inj.map(i => `<span class="chip">${i}</span>`).join('');
    if (p.infection > 0) injHtml += `<span class="chip infect">Infected ${Math.round(p.infection * 100)}%</span>`;
    if (injHtml !== this.lastInj) { $('injuries').innerHTML = injHtml; this.lastInj = injHtml; }
    this.drawEcg(dt, color, st);
    // ammo
    const w = G.weapons, d = w.def();
    $('hud-ammo').style.visibility = p.unarmed ? 'hidden' : '';
    $('weapon-name').textContent = d.name + (w.reloadT > 0 ? ' · reloading' : '');
    $('ammo-mag').textContent = w.mag[w.current];
    $('ammo-mag').style.color = w.mag[w.current] === 0 ? '#b3261e' : '';
    $('ammo-res').textContent = '/ ' + G.items.count(d.ammo);
    // crosshair only while aiming, gap shows spread
    const ch = $('crosshair');
    ch.hidden = !(p.aiming && G.mode === 'play');
    if (!ch.hidden) {
      const gap = 4 + w.spread * 900;
      $('ch-l').style.left = `${-gap - 8}px`; $('ch-r').style.left = `${gap}px`;
      $('ch-t').style.top = `${-gap - 8}px`; $('ch-b').style.top = `${gap}px`;
    }
    // detection meter: the most alert enemy that is not dead
    let a = 0, chasing = false;
    for (const e of G.enemies) if (e.alive && !e.boss && e.state !== 'dormant' && e.state !== 'caged') { a = Math.max(a, e.aware); chasing ||= e.state === 'chase' || e.state === 'grab'; }
    const label = chasing ? 'Spotted' : a > 0.45 ? 'Suspicious' : a > 0.05 ? 'Noticed' : 'Unseen';
    $('detect-text').textContent = (p.crouch ? 'Crouching · ' : '') + label;
    $('detect-fill').style.width = `${clamp(chasing ? 1 : a, 0, 1) * 100}%`;
    $('detect-fill').style.background = chasing ? '#b3261e' : '#d8a33a';
    // interaction prompt
    const it = G.story?.currentInteract;
    const pr = $('prompt');
    if (it && G.mode === 'play' && !p.grab) { pr.hidden = false; const l = typeof it.label === 'function' ? it.label() : it.label; if (pr.dataset.l !== l) { pr.innerHTML = `<kbd>E</kbd>${l}`; pr.dataset.l = l; } }
    else pr.hidden = true;
  }

  drawEcg(dt, color, st) {
    const g = this.ecg, W = 440, H = 108;
    const rate = { fine: 1.1, caution: 1.6, danger: 2.4, dead: 0 }[st];
    const speed = 160;
    const steps = Math.max(1, Math.round(dt * speed));
    for (let k = 0; k < steps; k++) {
      this.ecgPhase += rate / speed;
      const ph = this.ecgPhase % 1;
      let y = 0;
      if (st !== 'dead') {
        if (ph < 0.06) y = Math.sin(ph / 0.06 * Math.PI) * 6;
        else if (ph > 0.12 && ph < 0.15) y = -8;
        else if (ph >= 0.15 && ph < 0.19) y = 38 * (st === 'danger' ? 0.7 : 1);
        else if (ph >= 0.19 && ph < 0.22) y = -14;
        else if (ph > 0.34 && ph < 0.46) y = Math.sin((ph - 0.34) / 0.12 * Math.PI) * 9;
        if (st === 'danger') y += (Math.random() - 0.5) * 3;
      }
      g.fillStyle = 'rgba(0,0,0,0.9)';
      g.fillRect(this.ecgX, 0, 10, H);
      g.fillStyle = color;
      g.fillRect(this.ecgX, H / 2 - y - 1.5, 2.5, 3);
      this.ecgX = (this.ecgX + 2) % W;
    }
  }

  // ----- modals -----
  openModal(html, kind) {
    const m = $('modal');
    m.innerHTML = html; m.hidden = false;
    this.modalOpen = kind;
    G.mode = 'modal';
    document.exitPointerLock?.();
    G.audio.ui();
  }

  closeModal() {
    if (!this.modalOpen) return;
    $('modal').hidden = true; $('modal').innerHTML = '';
    this.modalOpen = null; this.selected = null;
    if (G.mode === 'modal') G.mode = 'play';
    G.requestLock?.();
  }

  showFile(title, body) {
    const paras = body.split('\n\n').map(p => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>`).join('');
    this.openModal(`<div class="sheet" role="dialog" aria-label="${title}"><h2>${title}</h2>${paras}<div class="close-hint">Press E or Esc to close</div></div>`, 'file');
  }

  showInventory() {
    const it = G.items;
    const slots = it.slots.map((s, k) => {
      if (!s) return `<div class="slot empty" aria-hidden="true">Empty</div>`;
      const d = ITEMS[s.id];
      return `<button class="slot${this.selected === k ? ' sel' : ''}" data-k="${k}" id="slot-${k}"><span class="sw" style="background:${d.color}"></span><span class="qty">${d.stack > 1 ? s.qty : ''}</span><span>${d.name}</span></button>`;
    }).join('');
    const keys = [...it.keys].map(k => `<span>${KEY_ITEMS[k]}</span>`).join('') || '<span class="small" style="border:0;color:var(--dim)">None yet</span>';
    const weapons = G.weapons.owned.map(w => `<span>${WEAPONS[w].name} · ${G.weapons.mag[w]} loaded</span>`).join('');
    const files = G.story.filesRead.map(f => `<button data-file="${f}">${G.story.fileTitle(f)}</button>`).join('') || '<span class="small">No files yet.</span>';
    const sel = this.selected != null && it.slots[this.selected] ? ITEMS[it.slots[this.selected].id] : null;
    this.openModal(`<div class="panel" role="dialog" aria-label="Inventory">
      <h2>Inventory</h2>
      <p class="small">${sel ? `<b style="color:var(--bone)">${sel.name}</b> selected. Click it again to use it, or click another item to combine.` : 'Click an item to select it. Herbs combine: green with green, or green with red.'}</p>
      <div class="slots">${slots}</div>
      <h3>Weapons</h3><div class="keys">${weapons}</div>
      <h3>Key items</h3><div class="keys">${keys}</div>
      <h3>Files</h3><div class="files">${files}</div>
      <div class="close-hint">Tab or Esc to close</div></div>`, 'inventory');
    $('modal').querySelectorAll('.slot[data-k]').forEach(b => b.addEventListener('click', () => {
      const k = +b.dataset.k;
      if (this.selected == null) { this.selected = k; }
      else if (this.selected === k) { const s = this.selected; this.selected = null; it.use(s); if (!this.modalOpen) return; }
      else { it.combine(this.selected, k); this.selected = null; }
      if (this.modalOpen === 'inventory') { const keep = this.selected; this.modalOpen = null; this.showInventory(); this.selected = keep; }
    }));
    $('modal').querySelectorAll('[data-file]').forEach(b => b.addEventListener('click', () => G.story.readFile(b.dataset.file, true)));
  }

  showKeypad(onSubmit, title = 'Keypad', note = 'A four-digit code.') {
    let code = '';
    this.openModal(`<div class="panel" style="width:min(320px,100%)" role="dialog" aria-label="${title}">
      <h2>${title}</h2><p class="small">${note}</p>
      <div class="readout" id="kp-read">____</div>
      <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'OK'].map(k => `<button data-k="${k}">${k}</button>`).join('')}</div>
      <div class="close-hint">Esc to step away</div></div>`, 'keypad');
    const read = $('kp-read');
    const press = (k) => {
      G.audio.ui();
      if (k === 'C') code = '';
      else if (k === 'OK') { if (onSubmit(code)) return; code = ''; read.style.color = '#ff6a5a'; setTimeout(() => { read.style.color = ''; }, 400); }
      else if (code.length < 4) code += k;
      read.textContent = code.padEnd(4, '_');
    };
    $('modal').querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => press(b.dataset.k)));
    this.keypadKey = (e) => { if (/^Digit\d$/.test(e.code)) press(e.code.slice(5)); if (e.code === 'Enter') press('OK'); if (e.code === 'Backspace') press('C'); };
  }

  // Gantry supply panel: three crane switches brought up one at a time.
  showCranePanel(order, onFlip) {
    const render = () => {
      $('br-row').innerHTML = [1, 2, 3].map(n => {
        const on = order.includes(n);
        return `<button data-b="${n}" class="${on ? 'on' : ''}" ${on ? 'disabled' : ''}><span>CRANE ${n}</span><span style="font-size:14px">${on ? 'ON · ' + (order.indexOf(n) + 1) : 'OFF'}</span></button>`;
      }).join('');
      $('br-row').querySelectorAll('[data-b]:not([disabled])').forEach(b => b.addEventListener('click', () => { if (onFlip(+b.dataset.b) !== false && this.modalOpen === 'breakers') render(); }));
    };
    this.openModal(`<div class="panel" style="width:min(480px,100%)" role="dialog" aria-label="Gantry supply panel">
      <h2>Gantry Supply</h2><p class="small">The fuse is seated. Three crane switches share one main breaker. Bring them up one at a time, in the right order.</p>
      <div class="breakers" id="br-row" style="grid-template-columns:repeat(3,minmax(0,1fr))"></div>
      <div class="close-hint">Esc to step away</div></div>`, 'breakers');
    render();
  }

  showMap() {
    // Chapters with several floors show only the floor Leon is standing on.
    const here = G.level.roomAt(G.player.pos.x, G.player.pos.z);
    const zone = here?.zone || G.level.zone;
    const rooms = ROOMS.filter(R => !R.noMap && (!zone || R.zone === zone));
    const title = G.level.zoneNames?.[zone] || 'Port Halvern';
    this.openModal(`<div class="panel" role="dialog" aria-label="Map"><h2>${title}</h2>
      <canvas id="map-canvas" width="430" height="730" style="max-width:430px;justify-self:center"></canvas>
      <div class="legend"><span><i style="background:#6a1d18"></i>Items left</span><span><i style="background:#1d3550"></i>Cleared</span><span><i style="background:#d8a33a"></i>Locked door</span><span><i style="background:#e8e2d0"></i>Leon</span></div>
      <div class="close-hint">M or Esc to close</div></div>`, 'map');
    const c = $('map-canvas'), g = c.getContext('2d');
    // fit the shown rooms into the canvas
    const bx0 = Math.min(...rooms.map(R => R.x0)), bx1 = Math.max(...rooms.map(R => R.x1));
    const bz0 = Math.min(...rooms.map(R => R.z0)), bz1 = Math.max(...rooms.map(R => R.z1));
    const S = Math.min(7, (c.width - 40) / (bx1 - bx0), (c.height - 40) / (bz1 - bz0));
    const ox = (c.width - (bx1 - bx0) * S) / 2 - bx0 * S, oz = (c.height + (bz1 - bz0) * S) / 2 + bz0 * S;
    const X = (x) => ox + x * S, Z = (z) => oz - z * S;
    g.fillStyle = '#070809'; g.fillRect(0, 0, c.width, c.height);
    for (const R of rooms) {
      if (!G.level.visited.has(R.id)) continue;
      g.fillStyle = G.story.roomHasItems(R.id) ? '#6a1d18' : '#1d3550';
      g.fillRect(X(R.x0), Z(R.z1), (R.x1 - R.x0) * S, (R.z1 - R.z0) * S);
      g.strokeStyle = '#8b867a'; g.lineWidth = 2;
      g.strokeRect(X(R.x0), Z(R.z1), (R.x1 - R.x0) * S, (R.z1 - R.z0) * S);
      g.fillStyle = '#d9d3c4'; g.font = '12px "Barlow Condensed", Arial'; g.textAlign = 'center';
      g.fillText(R.name, X((R.x0 + R.x1) / 2), Z((R.z0 + R.z1) / 2));
    }
    const shown = (x, z) => rooms.some(R => x >= R.x0 && x <= R.x1 && z >= R.z0 && z <= R.z1);
    for (const d of DOORS) {
      const door = G.level.doors[d.id];
      if (door.kind === 'open' || !shown(d.x, d.z)) continue;
      g.strokeStyle = door.locked ? '#d8a33a' : door.open ? '#070809' : '#b8b2a2';
      g.lineWidth = 4;
      g.beginPath();
      const hw = (d.w || 2) / 2;
      if (d.axis === 'x') { g.moveTo(X(d.x - hw), Z(d.z)); g.lineTo(X(d.x + hw), Z(d.z)); }
      else { g.moveTo(X(d.x), Z(d.z - hw)); g.lineTo(X(d.x), Z(d.z + hw)); }
      g.stroke();
    }
    const p = G.player;
    g.save(); g.translate(X(p.pos.x), Z(p.pos.z)); g.rotate(p.yaw);
    g.fillStyle = '#e8e2d0'; g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 7); g.lineTo(-6, 7); g.closePath(); g.fill();
    g.restore();
  }
}
