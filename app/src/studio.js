// Vice Cover Studio — render engine.
//
// A cover is a comic-style poster: two or three photo panels separated by white
// gutters, a colour grade over everything, optional halftone dots, and a big
// Anton title with a subtitle on a dark band at the foot. drawCover() paints a
// state object onto any 2D canvas at that canvas's own pixel size, so the live
// preview and the exported PNG are the same drawing.

export const LAYOUTS = {
  poster: [
    { x: 0, y: 0, w: 1, h: 0.62, label: 'Hero' },
    { x: 0, y: 0.62, w: 0.5, h: 0.38, label: 'Left' },
    { x: 0.5, y: 0.62, w: 0.5, h: 0.38, label: 'Right' },
  ],
  grid: [
    { x: 0, y: 0, w: 0.5, h: 0.5, label: 'Top left' },
    { x: 0.5, y: 0, w: 0.5, h: 0.5, label: 'Top right' },
    { x: 0, y: 0.5, w: 0.5, h: 0.5, label: 'Bottom left' },
    { x: 0.5, y: 0.5, w: 0.5, h: 0.5, label: 'Bottom right' },
  ],
  strips: [
    { x: 0, y: 0, w: 1 / 3, h: 1, label: 'Left' },
    { x: 1 / 3, y: 0, w: 1 / 3, h: 1, label: 'Middle' },
    { x: 2 / 3, y: 0, w: 1 / 3, h: 1, label: 'Right' },
  ],
};

export const GRADES = {
  sunset: {
    filter: 'saturate(1.3) contrast(1.06) sepia(0.18)',
    wash: (ctx, x, y, w, h) => {
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, 'rgba(255, 170, 80, 0.10)');
      g.addColorStop(1, 'rgba(220, 40, 120, 0.30)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
    },
  },
  neon: {
    filter: 'saturate(1.5) contrast(1.18) hue-rotate(-12deg) brightness(0.96)',
    wash: (ctx, x, y, w, h) => {
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, 'rgba(0, 220, 255, 0.14)');
      g.addColorStop(1, 'rgba(255, 0, 170, 0.18)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
    },
  },
  noir: {
    filter: 'grayscale(0.9) contrast(1.3) brightness(1.04)',
    wash: (ctx, x, y, w, h) => {
      const g = ctx.createRadialGradient(
        x + w / 2, y + h / 2, Math.min(w, h) * 0.35,
        x + w / 2, y + h / 2, Math.max(w, h) * 0.75,
      );
      g.addColorStop(0, 'rgba(0, 0, 0, 0)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
    },
  },
};

/** A fresh, empty cover state: poster layout, sunset grade, no photos yet. */
export function blankState() {
  return {
    layout: 'poster',
    grade: 'sunset',
    halftone: true,
    title: 'SUNSET HEIST',
    subtitle: 'OCEAN DRIVE',
    panels: LAYOUTS.poster.map((slot) => ({ photo: null, zoom: 1, panX: 0, panY: 0 })),
    selected: 0,
  };
}

function panelRects(layout, w, h, gutter) {
  return LAYOUTS[layout].map((s) => ({
    x: s.x * w + (s.x > 0 ? gutter / 2 : 0),
    y: s.y * h + (s.y > 0 ? gutter / 2 : 0),
    w: s.w * w - (s.x > 0 ? gutter / 2 : 0) - (s.x + s.w < 1 ? gutter / 2 : 0),
    h: s.h * h - (s.y > 0 ? gutter / 2 : 0) - (s.y + s.h < 1 ? gutter / 2 : 0),
    label: s.label,
  }));
}

function drawPhoto(ctx, rect, panel, grade) {
  const img = panel.photo;
  ctx.fillStyle = '#241a2e';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  if (!img) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.font = `600 ${Math.round(rect.h * 0.05)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Pick a photo', rect.x + rect.w / 2, rect.y + rect.h / 2);
    return;
  }
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const dw = img.naturalWidth * base * panel.zoom;
  const dh = img.naturalHeight * base * panel.zoom;
  // Pan is a fraction of the panel; clamp it so the photo always covers the panel.
  const maxX = Math.max(0, (dw - rect.w) / 2);
  const maxY = Math.max(0, (dh - rect.h) / 2);
  const ox = Math.max(-maxX, Math.min(maxX, panel.panX * rect.w));
  const oy = Math.max(-maxY, Math.min(maxY, panel.panY * rect.h));
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.filter = grade.filter;
  ctx.drawImage(img, rect.x + (rect.w - dw) / 2 + ox, rect.y + (rect.h - dh) / 2 + oy, dw, dh);
  ctx.filter = 'none';
  grade.wash(ctx, rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

let dotPattern = null;
function halftone(ctx, w, h) {
  if (!dotPattern) {
    const tile = document.createElement('canvas');
    tile.width = 14;
    tile.height = 14;
    const t = tile.getContext('2d');
    t.fillStyle = '#000';
    t.beginPath();
    t.arc(7, 7, 2.1, 0, Math.PI * 2);
    t.fill();
    dotPattern = ctx.createPattern(tile, 'repeat');
  }
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = dotPattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawCaption(ctx, w, h, title, subtitle) {
  const band = ctx.createLinearGradient(0, h * 0.72, 0, h);
  band.addColorStop(0, 'rgba(10, 4, 14, 0)');
  band.addColorStop(0.45, 'rgba(10, 4, 14, 0.55)');
  band.addColorStop(1, 'rgba(10, 4, 14, 0.82)');
  ctx.fillStyle = band;
  ctx.fillRect(0, h * 0.72, w, h * 0.28);

  const sub = subtitle.trim().toUpperCase();
  if (sub) {
    ctx.font = `700 ${Math.round(h * 0.026)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    try { ctx.letterSpacing = `${Math.round(h * 0.008)}px`; } catch (_) { /* older canvas */ }
    ctx.fillStyle = '#ffd9e8';
    ctx.fillText(sub, w / 2, h - h * 0.185);
    try { ctx.letterSpacing = '0px'; } catch (_) { /* older canvas */ }
  }

  const text = title.trim().toUpperCase();
  if (!text) return;
  let size = h * 0.115;
  ctx.font = `${size}px Anton, sans-serif`;
  while (ctx.measureText(text).width > w * 0.92 && size > 12) {
    size -= 2;
    ctx.font = `${size}px Anton, sans-serif`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const baseline = h - h * 0.055;
  // Retro offset shadow, then a dark outline, then the white fill.
  ctx.fillStyle = '#ff5e8a';
  ctx.fillText(text, w / 2 + size * 0.025, baseline + size * 0.03);
  ctx.lineWidth = size * 0.085;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#14060f';
  ctx.strokeText(text, w / 2, baseline);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, w / 2, baseline);
}

/**
 * Paints `state` onto `canvas` at the canvas's own pixel size.
 * `highlight` (panel index, or -1) draws a dashed selection outline — used by
 * the editor only, never by the exported PNG.
 */
export function drawCover(canvas, state, highlight = -1) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const gutter = Math.max(6, Math.round(w * 0.012));
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const rects = panelRects(state.layout, w, h, gutter);
  rects.forEach((rect, i) => {
    drawPhoto(ctx, rect, state.panels[i] ?? { photo: null, zoom: 1, panX: 0, panY: 0 }, grade);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = Math.max(2, gutter * 0.18);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });

  if (state.halftone) halftone(ctx, w, h);
  drawCaption(ctx, w, h, state.title, state.subtitle);

  if (highlight >= 0 && rects[highlight]) {
    const r = rects[highlight];
    ctx.save();
    ctx.setLineDash([14, 10]);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#22d3ee';
    ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
    ctx.restore();
  }
  return rects;
}

/** Which panel (index) contains point (x, y) in canvas pixels, or -1. */
export function pickPanel(canvas, state, x, y) {
  const { width: w, height: h } = canvas;
  const gutter = Math.max(6, Math.round(w * 0.012));
  const rects = panelRects(state.layout, w, h, gutter);
  return rects.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
}
