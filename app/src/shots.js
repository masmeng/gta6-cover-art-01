// Fixed scenes for screenshots, driven by ?shot= in the URL.
//   ?shot=cover&photo=boulevard&caption=SUNSET%20HEIST&layout=poster&grade=sunset&size=1080x1350
//     → the cover alone, filling the viewport (chrome hidden by .shot-cover).
//   ?shot=editor&photo=neon&caption=NEON%20NIGHTS&layout=grid&grade=neon
//     → the full editor with a finished cover loaded.
// `photo` picks the hero sample; the other panels get the remaining samples in
// order. window.__shotReady is set once the cover has been painted.
import { LAYOUTS } from './studio.js';

export async function runShot(shot, query, api) {
  const { state, loadImage, redraw, setSize, SAMPLES } = api;
  if (shot === 'cover') document.body.classList.add('shot-cover');

  const layout = query.get('layout');
  if (layout && LAYOUTS[layout]) {
    state.layout = layout;
    state.panels = LAYOUTS[layout].map((slot, i) => state.panels[i] ?? { photo: null, zoom: 1, panX: 0, panY: 0 });
    state.panels.length = LAYOUTS[layout].length;
  }
  const grade = query.get('grade');
  if (grade && ['sunset', 'neon', 'noir'].includes(grade)) state.grade = grade;
  const size = query.get('size');
  if (size && /^\d+x\d+$/.test(size)) setSize(size);
  if (query.get('halftone') === '0') state.halftone = false;

  state.title = query.get('caption') ?? 'SUNSET HEIST';
  state.subtitle = query.get('subtitle') ?? 'OCEAN DRIVE';
  const titleEl = document.getElementById('title');
  const subEl = document.getElementById('subtitle');
  if (titleEl) titleEl.value = state.title;
  if (subEl) subEl.value = state.subtitle;

  const heroName = query.get('photo') ?? 'boulevard';
  const order = [
    SAMPLES.find((s) => s.name === heroName) ?? SAMPLES[0],
    ...SAMPLES.filter((s) => s.name !== heroName),
  ];
  for (let i = 0; i < state.panels.length; i++) {
    state.panels[i].photo = await loadImage(order[i % order.length].src);
  }
  state.selected = 0;
  redraw();
  await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
