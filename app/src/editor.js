// KEY ART — the editor.
//
// Holds the page state (layout, grade, key-art title, script subtitle,
// quote strip, seal, ribbon, billing, and one photo slot per panel with
// its role and flavour line), mirrors it into the control column, and
// repaints the preview canvas after every change. The deterministic
// ?shot= scenes live in shots.js and drive the same state through the
// small api object at the bottom of this file.

import { drawCover, LAYOUTS, GRADES, SIZES, exportCover, panelRects, layoutDef } from './keyart.js';
import { runShot } from './shots.js';

// One slot per panel: the image (or null), its focal point (0..1), zoom,
// and the cast label that prints on the cover.
function makeSlot(role, flavor) {
  return { img: null, ox: 0.5, oy: 0.5, zoom: 1, role: role || '', flavor: flavor || '' };
}

// The default cast, in panel order, matched to the sample photos in the
// same order: [role, flavour line (PLACE · TIME · QUIP)]. The last slot
// is the street itself, not a person.
const CAST = [
  ['THE DRIVER', 'PALM ROW · 6:40 PM · NEVER LOOKS BACK'],
  ['THE BOSS', 'MARINA DEL SOL · 8:05 PM · OWNS THE HARBOR'],
  ['THE RIDER', 'SOUTH BEACH · 7:15 PM · FULL THROTTLE'],
  ['THE COURIER', 'RAMEN ROW · 11:20 PM · KNOWS EVERY SHORTCUT'],
  ['THE LOOKOUT', 'ROOFTOP BAR · 8:15 PM · NOTHING GETS PAST HER'],
  ['THE WHEELMAN', 'COAST HIGHWAY · 7:48 PM · DRIVES LIKE THE WIND'],
  ['THE CITY', 'OCEAN DRIVE · 6:00 PM · THE CITY NEVER SLEEPS'],
];

const SAMPLES = ['driver', 'boss', 'rider', 'courier', 'lookout', 'wheelman', 'boulevard'];

function freshState() {
  return {
    layout: 'harbor', grade: 'sunset', title: 'GOLDEN HARBOR',
    titleSize: 1, titleY: 0.47, titleSlant: -2, subtitle: 'salt in the air',
    quote: 'SUNSET HAS NEVER LOOKED THIS GOOD', quoteSource: 'THE COASTLINE POST', stars: 5,
    seal: 'ORIGINAL COVER ART', vol: 'VOL. 1',
    ribbon: 'SEVEN FRIENDS · ONE LAST SUMMER · NO WAY HOME', studio: 'GOLDEN HOUR FILMS',
    comingSoon: true, popout: true,
    panels: CAST.map(([role, flavor]) => makeSlot(role, flavor)),
  };
}

const state = freshState();

let activePanel = 0;

// Load an image from a URL and resolve with the element once it can draw.
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

// Paint the preview canvas from the current state.
export function redraw() {
  const canvas = document.getElementById('cover');
  if (canvas) drawCover(canvas, state);
}

// Resize the panels array when the layout changes, keeping any photos
// that still have a slot and dropping the rest.
function resizeSlots() {
  const count = layoutDef(state.layout).panels;
  const next = [];
  for (let i = 0; i < count; i++) {
    if (state.panels[i]) {
      next.push(state.panels[i]);
    } else {
      const cast = CAST[i] || [];
      next.push(makeSlot(cast[0], cast[1]));
    }
  }
  state.panels = next;
  if (activePanel >= count) activePanel = count - 1;
}

function putPhoto(index, img) {
  if (!state.panels[index]) {
    const cast = CAST[index] || [];
    state.panels[index] = makeSlot(cast[0], cast[1]);
  }
  state.panels[index].img = img;
}

// Rebuild the Panel 1..n picker buttons for the current layout.
function buildPicker() {
  const box = document.getElementById('panel-picker');
  if (!box) return;
  box.innerHTML = '';
  const count = layoutDef(state.layout).panels;
  for (let i = 0; i < count; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'panel-btn' + (i === activePanel ? ' active' : '');
    btn.textContent = 'Panel ' + (i + 1);
    btn.addEventListener('click', () => { activePanel = i; reflectState(); redraw(); });
    box.appendChild(btn);
  }
}

// Every control on the page, in one table: the element id, the state key
// it mirrors, and its kind. reflectState and wireControls both walk this
// same table, so a control can never be wired but unmirrored (or the
// other way round).
const CONTROLS = [
  { id: 'title', key: 'title', kind: 'text' },
  { id: 'titleSize', key: 'titleSize', kind: 'num' },
  { id: 'titleY', key: 'titleY', kind: 'num' },
  { id: 'titleSlant', key: 'titleSlant', kind: 'num' },
  { id: 'subtitle', key: 'subtitle', kind: 'text' },
  { id: 'quote', key: 'quote', kind: 'text' },
  { id: 'quoteSource', key: 'quoteSource', kind: 'text' },
  { id: 'stars', key: 'stars', kind: 'num' },
  { id: 'seal', key: 'seal', kind: 'text' },
  { id: 'vol', key: 'vol', kind: 'text' },
  { id: 'ribbon', key: 'ribbon', kind: 'text' },
  { id: 'studio', key: 'studio', kind: 'text' },
  { id: 'comingSoon', key: 'comingSoon', kind: 'check' },
  { id: 'popout', key: 'popout', kind: 'check' },
];

function readControl(ctrl) {
  const el = document.getElementById(ctrl.id);
  if (!el) return undefined;
  if (ctrl.kind === 'num') return parseFloat(el.value);
  if (ctrl.kind === 'check') return el.checked;
  return el.value;
}

function writeControl(ctrl, value) {
  const el = document.getElementById(ctrl.id);
  if (!el) return;
  if (ctrl.kind === 'check') {
    el.checked = !!value;
  } else if (el.value !== String(value)) {
    el.value = value;
  }
}

// Push the state into every control so the column always shows the truth.
function reflectState() {
  const markActive = (selector, attr, value) => {
    document.querySelectorAll(selector).forEach((btn) => {
      btn.classList.toggle('active', btn.dataset[attr] === value);
    });
  };
  markActive('.layout-btn', 'layout', state.layout);
  markActive('.grade-btn', 'grade', state.grade);
  for (const ctrl of CONTROLS) writeControl(ctrl, state[ctrl.key]);
  const slot = state.panels[activePanel];
  if (slot) {
    writeControl({ id: 'role', kind: 'text' }, slot.role);
    writeControl({ id: 'flavor', kind: 'text' }, slot.flavor);
    writeControl({ id: 'zoom', kind: 'num' }, slot.zoom || 1);
  }
  buildPicker();
}

// The first free slot at or after the active panel, else the first free
// slot anywhere, else the active panel itself.
function pickSlotForUpload() {
  for (let i = activePanel; i < state.panels.length; i++) {
    if (!state.panels[i].img) return i;
  }
  for (let i = 0; i < activePanel; i++) {
    if (!state.panels[i].img) return i;
  }
  return activePanel;
}

// Drop uploaded files into panels, one per file.
function wirePhotoInput() {
  const input = document.getElementById('photo');
  if (!input) return;
  input.addEventListener('change', async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (const file of files) {
      try {
        const img = await loadImage(URL.createObjectURL(file));
        const target = pickSlotForUpload();
        putPhoto(target, img);
        activePanel = target;
      } catch (err) {
        console.error('Could not load that photo file', err);
      }
    }
    reflectState();
    redraw();
  });
}

// Sample thumbnails fill the active panel.
function wireSamples() {
  document.querySelectorAll('.sample-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.sample-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      try {
        const img = await loadImage('samples/' + btn.dataset.sample + '.jpg');
        putPhoto(activePanel, img);
        redraw();
      } catch (err) {
        console.error('Could not load sample', btn.dataset.sample, err);
      }
    });
  });
}

function wirePickers() {
  document.querySelectorAll('.layout-btn').forEach((btn) => {
    btn.addEventListener('click', () => { state.layout = btn.dataset.layout; resizeSlots(); reflectState(); redraw(); });
  });
  document.querySelectorAll('.grade-btn').forEach((btn) => {
    btn.addEventListener('click', () => { state.grade = btn.dataset.grade; reflectState(); redraw(); });
  });
}

function wireControls() {
  for (const ctrl of CONTROLS) {
    const el = document.getElementById(ctrl.id);
    if (!el) continue;
    const event = ctrl.kind === 'check' ? 'change' : 'input';
    el.addEventListener(event, () => {
      state[ctrl.key] = readControl(ctrl);
      redraw();
    });
  }
  // Role, flavour and zoom belong to the active panel, not the whole cover.
  const slotFields = [
    { id: 'role', key: 'role', num: false },
    { id: 'flavor', key: 'flavor', num: false },
    { id: 'zoom', key: 'zoom', num: true },
  ];
  for (const field of slotFields) {
    const el = document.getElementById(field.id);
    if (!el) continue;
    el.addEventListener('input', (e) => {
      const slot = state.panels[activePanel];
      if (!slot) return;
      slot[field.key] = field.num ? parseFloat(e.target.value) : e.target.value;
      redraw();
    });
  }
}

// Which panel a canvas point falls in, or -1 when it falls between panels.
function panelAt(canvas, x, y) {
  const rects = panelRects(canvas.width, canvas.height, state.layout);
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}

// Click a panel to select it; drag inside it to pan its focal point.
function wireGestures() {
  const canvas = document.getElementById('cover');
  if (!canvas) return;
  const drag = { on: false, lastX: 0, lastY: 0, startOx: 0.5, startOy: 0.5 };
  canvas.addEventListener('mousedown', (e) => {
    const box = canvas.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * canvas.width;
    const y = ((e.clientY - box.top) / box.height) * canvas.height;
    const hit = panelAt(canvas, x, y);
    if (hit >= 0) {
      activePanel = hit;
      reflectState();
      redraw();
    }
    const slot = state.panels[activePanel];
    drag.on = true;
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
    drag.startOx = slot ? slot.ox : 0.5;
    drag.startOy = slot ? slot.oy : 0.5;
  });
  window.addEventListener('mousemove', (e) => {
    if (!drag.on) return;
    const dx = e.clientX - drag.lastX;
    const dy = e.clientY - drag.lastY;
    const slot = state.panels[activePanel];
    if (slot && slot.img) {
      slot.ox = Math.max(0, Math.min(1, drag.startOx - dx * 0.003));
      slot.oy = Math.max(0, Math.min(1, drag.startOy - dy * 0.003));
      redraw();
    }
  });
  window.addEventListener('mouseup', () => { drag.on = false; });
}

// One export button per size: render the PNG and trigger a download.
function wireExports() {
  const jobs = [['export-square', 'square'], ['export-portrait', 'portrait'], ['export-wide', 'wide']];
  for (const [btnId, sizeKey] of jobs) {
    const btn = document.getElementById(btnId);
    if (!btn) continue;
    btn.addEventListener('click', async () => {
      const [w, h] = SIZES[sizeKey];
      const statusEl = document.getElementById('status');
      if (statusEl) statusEl.textContent = 'Generating ' + w + 'x' + h + ' PNG...';
      try {
        const blob = await exportCover(state, w, h);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cover-' + w + 'x' + h + '.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (statusEl) statusEl.textContent = 'Exported cover-' + w + 'x' + h + '.png';
      } catch (err) {
        console.error('Export failed', err);
        if (statusEl) statusEl.textContent = 'Export failed: ' + err.message;
      }
    });
  }
}

// One-click "Make my cover": spread the photos across the panels, hand
// each panel a role from the cast list, and take the title from the
// caption the user typed (or fall back to the house default). Uploaded
// photos win; with no uploads yet, the sample set stands in so the
// button always does something visible.
async function wireMakeMyCover() {
  const btn = document.getElementById('make-my-cover');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const statusEl = document.getElementById('status');
    if (statusEl) statusEl.textContent = 'Making your cover...';
    state.layout = 'harbor';
    state.grade = 'sunset';
    state.popout = true;
    const caption = (state.title || '').trim();
    if (caption) state.title = caption.toUpperCase();
    let filled = 0;
    for (const p of state.panels) if (p.img) filled++;
    if (filled === 0) {
      for (let i = 0; i < state.panels.length; i++) {
        const name = SAMPLES[i % SAMPLES.length];
        try {
          const img = await loadImage('samples/' + name + '.jpg');
          putPhoto(i, img);
        } catch (err) {
          console.error('Could not load sample', name, err);
        }
      }
    }
    state.panels.forEach((slot, i) => {
      const cast = CAST[i % CAST.length];
      if (!slot.role) slot.role = cast[0];
      if (!slot.flavor) slot.flavor = cast[1];
    });
    resizeSlots();
    reflectState();
    redraw();
    if (statusEl) statusEl.textContent = 'Cover ready — pick a size and export.';
  });
}

function initEditor() {
  wirePhotoInput();
  wireSamples();
  wirePickers();
  wireControls();
  wireGestures();
  wireExports();
  wireMakeMyCover();
}

// The small surface shots.js drives: state setters plus the image loader.
// Exposed on window as __keyart so automated checks can read the state and
// call the real export path without going through the buttons.
function shotApi() {
  return {
    state,
    loadImage,
    setPanelPhoto: putPhoto,
    setPanelRole: (i, role, flavor) => {
      if (!state.panels[i]) state.panels[i] = makeSlot();
      if (role !== undefined) state.panels[i].role = role;
      if (flavor !== undefined) state.panels[i].flavor = flavor;
    },
    setTitle: (text) => { state.title = text; },
    setSubtitle: (text) => { state.subtitle = text; },
    setLayout: (id) => { state.layout = id; resizeSlots(); },
    setGrade: (id) => { state.grade = id; },
    setPopout: (on) => { state.popout = !!on; },
    redraw,
  };
}

window.addEventListener('DOMContentLoaded', async () => {
  initEditor();
  window.__keyart = { state, exportCover, drawCover, redraw };
  const params = new URLSearchParams(window.location.search);
  const shotName = params.get('shot');
  if (shotName) {
    await runShot(shotName, params, shotApi());
    return;
  }
  // First paint should never be an empty frame: load the driver sample.
  try {
    const img = await loadImage('samples/driver.jpg');
    putPhoto(0, img);
  } catch (err) {
    console.error('Could not load the opening sample', err);
  }
  reflectState();
  redraw();
});
