// Vice Cover Studio — editor wiring: photo tray, uploads, panel picking,
// drag-to-pan, layout/grade/size controls, caption inputs, shuffle and export.
// The `?shot=` scenes for screenshots live in ./shots.js.
import { blankState, drawCover, pickPanel, LAYOUTS } from './studio.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('stage');
const statusEl = document.getElementById('status');
const state = blankState();
let rects = [];
let pickedPhoto = null;

const SAMPLES = [
  { name: 'boulevard', label: 'Boulevard', src: 'samples/boulevard.jpg' },
  { name: 'neon', label: 'Neon street', src: 'samples/neon.jpg' },
  { name: 'pier', label: 'Pier', src: 'samples/pier.jpg' },
  { name: 'speedboat', label: 'Speedboat', src: 'samples/speedboat.jpg' },
];

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function redraw() {
  rects = drawCover(canvas, state, state.selected);
  document.getElementById('panelName').textContent =
    LAYOUTS[state.layout][state.selected]?.label ?? 'Hero';
  const panel = state.panels[state.selected];
  document.getElementById('zoom').value = Math.round((panel?.zoom ?? 1) * 100);
  document.getElementById('zoomVal').textContent = `${Math.round((panel?.zoom ?? 1) * 100)}%`;
}

function setSize(size) {
  const [w, h] = size.split('x').map(Number);
  canvas.width = w;
  canvas.height = h;
  redraw();
}

function placePhoto(img, label) {
  const panel = state.panels[state.selected];
  if (!panel) return;
  panel.photo = img;
  panel.zoom = 1;
  panel.panX = 0;
  panel.panY = 0;
  statusEl.textContent = `${label ?? 'Photo'} placed in the ${LAYOUTS[state.layout][state.selected].label} panel.`;
  redraw();
}

// --- Photo tray -----------------------------------------------------------
const tray = document.getElementById('tray');
for (const sample of SAMPLES) {
  const thumb = document.createElement('img');
  thumb.src = sample.src;
  thumb.alt = sample.label;
  thumb.title = sample.label;
  thumb.addEventListener('click', async () => {
    tray.querySelectorAll('img').forEach((el) => el.classList.remove('picked'));
    thumb.classList.add('picked');
    pickedPhoto = await loadImage(sample.src);
    placePhoto(pickedPhoto, sample.label);
  });
  tray.appendChild(thumb);
}

document.getElementById('upload').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    const img = await loadImage(URL.createObjectURL(file));
    const thumb = document.createElement('img');
    thumb.src = URL.createObjectURL(file);
    thumb.alt = file.name;
    thumb.classList.add('uploaded');
    thumb.addEventListener('click', () => {
      tray.querySelectorAll('img').forEach((el) => el.classList.remove('picked'));
      thumb.classList.add('picked');
      pickedPhoto = img;
      placePhoto(img, file.name);
    });
    tray.appendChild(thumb);
    placePhoto(img, file.name);
  }
  e.target.value = '';
});

// --- Canvas: click to pick a panel, drag to pan its photo -----------------
let drag = null;
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const idx = pickPanel(canvas, state, p.x, p.y);
  if (idx < 0) return;
  state.selected = idx;
  const panel = state.panels[idx];
  drag = { x: p.x, y: p.y, panX: panel.panX, panY: panel.panY };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const rect = rects[state.selected];
  const panel = state.panels[state.selected];
  if (!rect || !panel?.photo) return;
  panel.panX = drag.panX + (p.x - drag.x) / rect.w;
  panel.panY = drag.panY + (p.y - drag.y) / rect.h;
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });

// --- Controls ---------------------------------------------------------------
function wireSeg(id, key, onPick) {
  document.getElementById(id).addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-' + key + ']');
    if (!btn) return;
    document.querySelectorAll(`#${id} button`).forEach((b) => b.classList.remove('on'));
    btn.classList.add('on');
    onPick(btn.dataset[key]);
  });
}
wireSeg('layouts', 'layout', (layout) => {
  state.layout = layout;
  state.panels = LAYOUTS[layout].map((slot, i) => state.panels[i] ?? { photo: null, zoom: 1, panX: 0, panY: 0 });
  state.panels.length = LAYOUTS[layout].length;
  state.selected = 0;
  redraw();
});
wireSeg('grades', 'grade', (grade) => { state.grade = grade; redraw(); });
wireSeg('sizes', 'size', (size) => setSize(size));

document.getElementById('zoom').addEventListener('input', (e) => {
  const panel = state.panels[state.selected];
  if (!panel) return;
  panel.zoom = Number(e.target.value) / 100;
  redraw();
});
document.getElementById('fit').addEventListener('click', () => {
  const panel = state.panels[state.selected];
  if (!panel) return;
  panel.zoom = 1;
  panel.panX = 0;
  panel.panY = 0;
  redraw();
});
document.getElementById('halftone').addEventListener('change', (e) => {
  state.halftone = e.target.checked;
  redraw();
});
document.getElementById('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
document.getElementById('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });

document.getElementById('shuffle').addEventListener('click', async () => {
  const layouts = Object.keys(LAYOUTS);
  const grades = ['sunset', 'neon', 'noir'];
  state.layout = layouts[Math.floor(Math.random() * layouts.length)];
  state.grade = grades[Math.floor(Math.random() * grades.length)];
  state.panels = LAYOUTS[state.layout].map(() => ({ photo: null, zoom: 1, panX: 0, panY: 0 }));
  const order = [...SAMPLES].sort(() => Math.random() - 0.5);
  for (let i = 0; i < state.panels.length; i++) {
    state.panels[i].photo = await loadImage(order[i % order.length].src);
  }
  document.querySelectorAll('#layouts button').forEach((b) => b.classList.toggle('on', b.dataset.layout === state.layout));
  document.querySelectorAll('#grades button').forEach((b) => b.classList.toggle('on', b.dataset.grade === state.grade));
  state.selected = 0;
  redraw();
});

document.getElementById('export').addEventListener('click', () => {
  drawCover(canvas, state, -1); // export without the selection outline
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${canvas.width}x${canvas.height}.png`;
    a.click();
    statusEl.textContent = `Saved ${a.download}`;
    redraw();
  }, 'image/png');
});

// --- Boot -------------------------------------------------------------------
const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  await document.fonts.load('100px Anton');
  await runShot(shot, query, { state, canvas, loadImage, redraw, setSize, SAMPLES });
} else {
  await document.fonts.load('100px Anton');
  state.panels[0].photo = await loadImage(SAMPLES[0].src);
  state.panels[1].photo = await loadImage(SAMPLES[1].src);
  state.panels[2].photo = await loadImage(SAMPLES[2].src);
  redraw();
}
