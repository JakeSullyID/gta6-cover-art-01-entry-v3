// KEY ART — the poster painter.
//
// One drawing pass renders the whole GTA-style cover onto any canvas:
// the photo panels for the chosen layout, a colour grade laid over
// them, and then all the poster furniture — the huge striped chrome
// title across the photos, the script subtitle, the role chips, the
// quote strip, the seal, the ribbon, the billing block and the
// barcode. The live preview and the exported PNG share this code path,
// so what you see on screen is exactly what the PNG holds.

export const LAYOUTS = [
  { id: 'grid', panels: 4, hero: 0, name: 'Vice Grid' },
  { id: 'diagonal', panels: 3, hero: 0, name: 'Diagonal' },
  { id: 'hero', panels: 2, hero: 0, name: 'Hero + Strip' },
  { id: 'poster', panels: 1, hero: 0, name: 'Poster' },
  { id: 'harbor', panels: 7, hero: 3, name: 'Harbor' },
  { id: 'heatwave', panels: 5, hero: 0, name: 'Heatwave' },
];

export const GRADES = [
  { name: 'Sunset', id: 'sunset' },
  { name: 'Neon', id: 'neon' },
  { name: 'Noir', id: 'noir' },
  { name: 'Pastel', id: 'pastel' },
  { name: 'Gold Hour', id: 'gold' },
  { name: 'Vice Purple', id: 'vice' },
  { name: 'Teal Dusk', id: 'teal' },
  { name: 'Crimson', id: 'crimson' },
];

// The three PNG sizes the app exports, in pixels.
export const SIZES = {
  square: [1080, 1080], // 1:1
  portrait: [1080, 1350], // 4:5
  wide: [1920, 1080], // 16:9
};

export function layoutDef(id) {
  const found = LAYOUTS.find((l) => l.id === id);
  return found === undefined ? LAYOUTS[0] : found;
}

// The poster's horizontal bands, as fractions of the canvas: a quote
// strip along the top, the panel field in the middle, a ribbon, and the
// billing block at the bottom. Fractions keep square, portrait and wide
// laying out the same way.
function measurePoster(w, h) {
  const edge = Math.max(8, Math.round(w * 0.011));
  const strip = Math.round(h * 0.048);
  const ribbon = Math.round(h * 0.034);
  const billing = Math.round(h * 0.062);
  const field = {
    x: edge,
    y: edge + strip,
    w: w - edge * 2,
    h: h - edge * 2 - strip - ribbon - billing,
  };
  return { edge, strip, ribbon, billing, field };
}

// A row of equal panels across the field, starting at height y.
function rowOf(field, count, y, height, gutter) {
  const boxes = [];
  const cellW = (field.w - gutter * (count - 1)) / count;
  for (let i = 0; i < count; i++) {
    boxes.push({ x: field.x + i * (cellW + gutter), y, w: cellW, h: height, slant: 0 });
  }
  return boxes;
}

// Panel geometry, one function per layout, keyed by layout id. Each
// takes the field and the gutter and returns {x, y, w, h, slant} boxes
// in canvas pixels, one per panel. Slant is how far a panel's top edge
// slides sideways; straight panels report 0.
const GEOMETRY = {
  harbor(field, gutter) {
    // Seven panels: three across the top, a wide hero on the left of the
    // middle row with one panel beside it, then two across the bottom.
    const topH = field.h * 0.32 - gutter / 2;
    const midY = field.y + field.h * 0.32 + gutter;
    const midH = field.h * 0.36 - gutter;
    const botY = midY + field.h * 0.36 + gutter;
    const botH = field.h - (botY - field.y);
    const heroW = (field.w - gutter) * 0.54;
    const boxes = rowOf(field, 3, field.y, topH, gutter);
    boxes.push(
      { x: field.x, y: midY, w: heroW, h: midH, slant: 0 },
      { x: field.x + heroW + gutter, y: midY, w: field.w - heroW - gutter, h: midH, slant: 0 },
    );
    return boxes.concat(rowOf(field, 2, botY, botH, gutter));
  },
  heatwave(field, gutter) {
    // Five slanted bands: one full-width row, then two pairs. Odd rows
    // lean one way and even rows the other, so the poster feels diagonal.
    const tilt = Math.round(field.w * 0.03);
    const bandH = (field.h - gutter * 2) / 3;
    const lean = (row) => (row % 2 === 0 ? tilt : -tilt);
    const boxes = [{ x: field.x, y: field.y, w: field.w, h: bandH, slant: lean(0) }];
    for (let row = 1; row <= 2; row++) {
      const pair = rowOf(field, 2, field.y + row * (bandH + gutter), bandH, gutter);
      for (const box of pair) boxes.push({ ...box, slant: lean(row) });
    }
    return boxes;
  },
  diagonal(field, gutter) {
    const stripH = (field.h - gutter * 2) / 3;
    const boxes = [];
    for (let i = 0; i < 3; i++) {
      boxes.push({
        x: field.x,
        y: field.y + i * (stripH + gutter),
        w: field.w,
        h: stripH,
        slant: i === 1 ? Math.round(field.w * 0.03) : 0,
      });
    }
    return boxes;
  },
  hero(field, gutter) {
    const topH = (field.h - gutter) * 0.62;
    return [
      { x: field.x, y: field.y, w: field.w, h: topH, slant: 0 },
      { x: field.x, y: field.y + topH + gutter, w: field.w, h: field.h - topH - gutter, slant: 0 },
    ];
  },
  poster(field) {
    return [{ x: field.x, y: field.y, w: field.w, h: field.h, slant: 0 }];
  },
  grid(field, gutter) {
    // Four equal quarters.
    const halfW = (field.w - gutter) / 2;
    const halfH = (field.h - gutter) / 2;
    return rowOf(field, 2, field.y, halfH, gutter)
      .concat(rowOf(field, 2, field.y + halfH + gutter, halfH, gutter));
  },
};

export function panelRects(w, h, layoutId) {
  const metrics = measurePoster(w, h);
  const gutter = Math.max(6, Math.round(w * 0.011));
  const build = GEOMETRY[layoutId] ?? GEOMETRY.grid;
  return build(metrics.field, gutter);
}

// Clip to one panel. A slanted panel is a parallelogram: its top edge
// slides by its slant and its bottom edge slides the other way. The
// clip is drawn a little wide so neighbouring slants never leave a
// hairline gap.
function clipToPanel(c, box) {
  const lean = box.slant || 0;
  const corners = [
    [box.x + lean, box.y],
    [box.x + box.w + lean, box.y],
    [box.x + box.w - lean, box.y + box.h],
    [box.x - lean, box.y + box.h],
  ];
  c.beginPath();
  let first = true;
  for (const [px, py] of corners) {
    if (first) {
      c.moveTo(px, py);
      first = false;
    } else {
      c.lineTo(px, py);
    }
  }
  c.closePath();
  c.clip();
}

// Where a photo lands inside its panel: cover-fit, panned by the focal
// point (ox/oy, 0..1) and zoomed.
function fitRect(img, box, slot) {
  const zoom = slot.zoom || 1;
  const fit = Math.max(box.w / img.naturalWidth, box.h / img.naturalHeight);
  const scale = fit * zoom;
  const drawW = img.naturalWidth * scale;
  const drawH = img.naturalHeight * scale;
  const ox = typeof slot.ox === 'number' ? slot.ox : 0.5;
  const oy = typeof slot.oy === 'number' ? slot.oy : 0.5;
  const lean = Math.abs(box.slant || 0);
  return {
    x: box.x - lean + (box.w + lean * 2 - drawW) * ox,
    y: box.y + (box.h - drawH) * oy,
    w: drawW,
    h: drawH,
  };
}

// Paint one panel: the photo cover-fitted and panned by its focal point
// (ox/oy, 0..1) and zoom, or a dark plum placeholder while it is empty.
function paintPhoto(c, box, slot) {
  c.save();
  clipToPanel(c, box);
  const img = slot && slot.img;
  if (img) {
    const rect = fitRect(img, box, slot);
    c.drawImage(img, rect.x, rect.y, rect.w, rect.h);
  } else {
    const lean = Math.abs(box.slant || 0);
    c.fillStyle = '#2a1638';
    c.fillRect(box.x - lean, box.y, box.w + lean * 2, box.h);
  }
  c.restore();
}

// One grade is a short recipe of steps, read by applyGrade in order:
//   wash  — a linear gradient over the panels (down = vertical, else diagonal)
//   veil  — one flat translucent colour over the whole canvas
//   vignette — a soft dark radial shade at the edges
//   desat — drain the colour through a saturation composite, then a dark veil
//   rule  — a gold bar along the bottom edge
// Data, not code per grade: adding a grade is one more row in the table.
const GRADE_RECIPES = {
  sunset: [
    { wash: 'down', stops: [[0, 'rgba(255, 120, 60, 0)'], [1, 'rgba(230, 40, 110, 0.42)']] },
    { vignette: 0.38 },
  ],
  neon: [
    { wash: 'diagonal', stops: [[0, 'rgba(255, 0, 128, 0.22)'], [1, 'rgba(0, 240, 255, 0.22)']] },
    { veil: 'rgba(10, 0, 20, 0.14)' },
  ],
  noir: [
    { desat: true },
    { veil: 'rgba(0, 0, 0, 0.3)' },
    { rule: '#d4a437' },
  ],
  pastel: [
    { wash: 'down', stops: [[0, 'rgba(255, 180, 200, 0.26)'], [1, 'rgba(180, 240, 220, 0.26)']] },
  ],
  gold: [
    { wash: 'down', stops: [[0, 'rgba(255, 200, 90, 0.16)'], [1, 'rgba(255, 140, 40, 0.3)']] },
    { vignette: 0.38 },
  ],
  vice: [
    { wash: 'down', stops: [[0, 'rgba(120, 0, 180, 0.26)'], [1, 'rgba(255, 0, 110, 0.2)']] },
    { vignette: 0.38 },
  ],
  teal: [
    { wash: 'diagonal', stops: [[0, 'rgba(0, 200, 190, 0.2)'], [1, 'rgba(0, 60, 120, 0.26)']] },
    { vignette: 0.38 },
  ],
  crimson: [
    { veil: 'rgba(180, 0, 40, 0.24)' },
    { vignette: 0.38 },
  ],
};

function runWashStep(c, w, h, step) {
  if (step.wash) {
    const grad = step.wash === 'down'
      ? c.createLinearGradient(0, 0, 0, h)
      : c.createLinearGradient(0, 0, w, h);
    for (const [at, color] of step.stops) grad.addColorStop(at, color);
    c.fillStyle = grad;
    c.fillRect(0, 0, w, h);
    return;
  }
  if (step.veil) {
    c.fillStyle = step.veil;
    c.fillRect(0, 0, w, h);
    return;
  }
  if (step.vignette) {
    // A soft dark vignette shared by the warm grades, so the photos keep
    // their sunset glow at the edges without going muddy in the middle.
    const shade = c.createRadialGradient(w / 2, h / 2, w * 0.32, w / 2, h / 2, w * 0.75);
    shade.addColorStop(0, 'rgba(0, 0, 0, 0)');
    shade.addColorStop(1, `rgba(15, 4, 26, ${step.vignette})`);
    c.fillStyle = shade;
    c.fillRect(0, 0, w, h);
    return;
  }
  if (step.desat) {
    c.globalCompositeOperation = 'saturation';
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'source-over';
    return;
  }
  if (step.rule) {
    const rule = Math.max(6, h * 0.008);
    c.fillStyle = step.rule;
    c.fillRect(0, h - rule, w, rule);
  }
}

// Wash the finished panels with the chosen colour grade.
function applyGrade(c, w, h, grade) {
  const recipe = GRADE_RECIPES[grade];
  if (!recipe) return;
  c.save();
  for (const step of recipe) runWashStep(c, w, h, step);
  c.restore();
}

// The striped sunset-chrome fill for the big title: horizontal bands of
// yellow, orange, pink and purple running down the letterforms.
function chromeGradient(c, y, size) {
  const grad = c.createLinearGradient(0, y - size * 0.55, 0, y + size * 0.55);
  const bands = [
    [0.0, '#ffe259'],
    [0.22, '#ffa751'],
    [0.42, '#ff7e5f'],
    [0.6, '#ff5e8a'],
    [0.78, '#c86bff'],
    [1.0, '#7b5cff'],
  ];
  for (const [at, color] of bands) grad.addColorStop(at, color);
  return grad;
}

// Where the title sits. On the grid layout the title is held at or below
// 55% of the height: any higher and its top edge crowds the role chips
// pinned to the bottom of the two top panels.
function titleHeightFor(layoutId, yFrac) {
  if (layoutId === 'grid' && yFrac < 0.55) return 0.55;
  return yFrac;
}

// Shrink a font size until the text fits inside a width limit.
function fitFont(c, text, fontOf, start, limit, floor) {
  let size = start;
  while (size > floor) {
    c.font = fontOf(size);
    if (c.measureText(text).width <= limit) break;
    size -= 2;
  }
  return size;
}

// The giant title OVER the photos: Anton caps, slanted, shrunk until it
// fits 96% of the frame, with a thick dark outline and a hard drop shadow.
function paintTitle(c, w, h, state) {
  const text = (state.title || '').trim().toUpperCase();
  if (!text) return { size: 0, y: 0 };
  const mult = typeof state.titleSize === 'number' ? state.titleSize : 1;
  const yFrac = typeof state.titleY === 'number' ? state.titleY : 0.47;
  const slant = typeof state.titleSlant === 'number' ? state.titleSlant : -2;
  const size = fitFont(c, text, (s) => `${s}px "Anton", sans-serif`, h * 0.145 * mult, w * 0.96, 18);
  const y = h * titleHeightFor(state.layout || 'harbor', yFrac);
  c.save();
  c.translate(w / 2, y);
  c.rotate((slant * Math.PI) / 180);
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.shadowColor = 'rgba(0, 0, 0, 0.6)';
  c.shadowBlur = size * 0.16;
  c.shadowOffsetY = size * 0.055;
  c.lineJoin = 'round';
  c.lineWidth = Math.max(3, size * 0.13);
  c.strokeStyle = '#160a24';
  c.strokeText(text, 0, 0);
  c.shadowColor = 'transparent';
  c.fillStyle = chromeGradient(c, 0, size);
  c.fillText(text, 0, 0);
  c.restore();
  return { size, y };
}

// The script subtitle in Pacifico, tucked over the title's lower edge and
// tilted the other way so the two letterings play against each other.
function paintSubtitle(c, w, h, state, titleInfo) {
  const text = (state.subtitle || '').trim();
  if (!text) return;
  const start = Math.max(20, titleInfo.size * 0.4);
  const s = fitFont(c, text, (v) => `${v}px "Pacifico", cursive`, start, w * 0.82, 14);
  c.save();
  c.translate(w / 2, titleInfo.y + titleInfo.size * 0.62);
  c.rotate((-3 * Math.PI) / 180);
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.shadowColor = 'rgba(255, 122, 217, 0.9)';
  c.shadowBlur = s * 0.35;
  c.fillStyle = '#ffd7f2';
  c.fillText(text, 0, 0);
  c.restore();
}

// The size of one role chip: the wider of the role and the flavour line,
// plus padding, and one or two text rows tall.
function chipDims(c, role, flavor, base) {
  const pad = Math.round(base * 0.55);
  c.font = `700 ${base}px sans-serif`;
  const roleW = c.measureText(role.toUpperCase()).width;
  c.font = `${Math.round(base * 0.72)}px sans-serif`;
  const flavorW = flavor ? c.measureText(flavor.toUpperCase()).width : 0;
  const wide = Math.max(roleW, flavorW);
  return {
    w: Math.ceil(wide) + pad * 2 + 4,
    h: flavor ? Math.round(base * 2.5) : Math.round(base * 1.7),
    pad,
  };
}

// One role chip: a black tag with a hot-pink edge, the role on the first
// line and the optional flavour line (PLACE · TIME · QUIP) under it.
function paintRoleChip(c, box, slot, w) {
  const role = (slot.role || '').trim();
  if (!role) return;
  const flavor = (slot.flavor || '').trim();
  const base = Math.max(11, Math.round(w * 0.0145));
  const dims = chipDims(c, role, flavor, base);
  const x = Math.min(box.x + 6, box.x + box.w - dims.w - 6);
  const y = box.y + box.h - dims.h - 6;
  c.save();
  c.fillStyle = 'rgba(8, 4, 14, 0.92)';
  c.fillRect(x, y, dims.w, dims.h);
  c.fillStyle = '#ff5e8a';
  c.fillRect(x, y, 4, dims.h);
  c.fillStyle = '#ffffff';
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  c.font = `700 ${base}px sans-serif`;
  c.fillText(role.toUpperCase(), x + dims.pad + 4, y + (flavor ? base * 0.85 : dims.h / 2));
  if (flavor) {
    c.fillStyle = 'rgba(255, 255, 255, 0.82)';
    c.font = `${Math.round(base * 0.72)}px sans-serif`;
    c.fillText(flavor.toUpperCase(), x + dims.pad + 4, y + base * 1.95);
  }
  c.restore();
}

// The press-quote strip across the top: gold stars, the quote, the source.
function paintQuote(c, w, h, state, metrics) {
  const quote = (state.quote || '').trim();
  if (!quote) return;
  const starCount = Math.max(1, Math.min(5, state.stars || 5));
  const line = ['★'.repeat(starCount), `"${quote.toUpperCase()}"`, '—', (state.quoteSource || '').toUpperCase()].join('  ');
  let s = Math.max(12, Math.round(w * 0.017));
  while (s > 9) {
    c.font = `700 ${s}px sans-serif`;
    if (c.measureText(line).width <= w * 0.78) break;
    s -= 1;
  }
  c.save();
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = '#ffd76a';
  c.fillText(line, w / 2, metrics.edge + metrics.strip / 2);
  c.restore();
}

// The VOL badge: a gold tab pinned to the top-right corner.
function paintVol(c, w, h, state, metrics) {
  const vol = (state.vol || '').trim();
  if (!vol) return;
  const size = Math.max(12, Math.round(w * 0.018));
  c.save();
  c.font = `700 ${size}px sans-serif`;
  const tabW = c.measureText(vol.toUpperCase()).width + size * 1.4;
  const tabH = metrics.strip * 0.92;
  const x = w - metrics.edge - tabW;
  const y = metrics.edge;
  c.fillStyle = '#f5c542';
  c.fillRect(x, y, tabW, tabH);
  c.fillStyle = '#160a24';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(vol.toUpperCase(), x + tabW / 2, y + tabH / 2 + 1);
  c.restore();
}

// A many-pointed starburst seal, gold, with the seal text centred inside.
function paintSeal(c, w, h, state, metrics) {
  const text = (state.seal || '').trim();
  if (!text) return;
  const r = Math.max(34, Math.round(w * 0.052));
  const cx = w - metrics.edge - r - Math.round(w * 0.02);
  const cy = h * 0.72;
  const points = 16;
  const outline = [];
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.82;
    const a = (i * Math.PI) / points - Math.PI / 2;
    outline.push([Math.cos(a) * rad, Math.sin(a) * rad]);
  }
  c.save();
  c.translate(cx, cy);
  c.beginPath();
  for (let i = 0; i < outline.length; i++) {
    if (i === 0) c.moveTo(outline[i][0], outline[i][1]);
    else c.lineTo(outline[i][0], outline[i][1]);
  }
  c.closePath();
  c.fillStyle = '#f5c542';
  c.fill();
  c.lineWidth = 2;
  c.strokeStyle = '#8a6d1f';
  c.stroke();
  c.beginPath();
  c.arc(0, 0, r * 0.66, 0, Math.PI * 2);
  c.fillStyle = '#ffe9a8';
  c.fill();
  c.fillStyle = '#160a24';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const words = text.toUpperCase().split(/\s+/);
  const mid = Math.ceil(words.length / 2);
  const lines = [words.slice(0, mid).join(' '), words.slice(mid).join(' ')].filter(Boolean);
  const fs = Math.max(9, Math.round(r * 0.2));
  c.font = `700 ${fs}px sans-serif`;
  for (let i = 0; i < lines.length; i++) {
    c.fillText(lines[i], 0, (i - (lines.length - 1) / 2) * fs * 1.25);
  }
  c.restore();
}

// The tagline ribbon: a black pill with white caps and diamond separators.
function paintRibbon(c, w, h, state, metrics) {
  const text = (state.ribbon || '').trim();
  if (!text) return;
  const size = Math.max(12, Math.round(w * 0.017));
  c.save();
  c.font = `700 ${size}px sans-serif`;
  const parts = text.toUpperCase().split('·').map((p) => p.trim());
  const inner = parts.join('  ◆  ');
  const pillW = Math.min(w * 0.86, c.measureText(inner).width + size * 3);
  const pillH = metrics.ribbon;
  const x = (w - pillW) / 2;
  const y = h - metrics.edge - metrics.billing - pillH - 4;
  c.fillStyle = '#0a0512';
  c.beginPath();
  c.roundRect(x, y, pillW, pillH, pillH / 2);
  c.fill();
  c.fillStyle = '#ffffff';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(inner, w / 2, y + pillH / 2 + 1);
  c.restore();
}

// A deterministic pseudo-random stream, so the barcode draws the same
// bars on every run.
function barcodeStream(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The billing block: auto-composed from the studio name and the cast's
// roles, plus the barcode and the COMING SOON / NOW SHOWING flag.
function paintBilling(c, w, h, state, metrics) {
  const roles = [];
  for (const p of state.panels || []) {
    const role = (p.role || '').trim().toUpperCase();
    if (role) roles.push(role);
  }
  const studio = (state.studio || 'GOLDEN HOUR FILMS').toUpperCase();
  const line1 = `A ${studio} PICTURE` + (roles.length ? ' · STARRING ' + roles.join(' · ') : '');
  const line2 = 'SHOT ON YOUR OWN CAMERA · GRADED BY HAND';
  let s = Math.max(10, Math.round(w * 0.0132));
  while (s > 8) {
    c.font = `700 ${s}px sans-serif`;
    if (c.measureText(line1).width <= w * 0.66) break;
    s -= 1;
  }
  const cy = h - metrics.edge - metrics.billing / 2;
  c.save();
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = 'rgba(255, 255, 255, 0.88)';
  c.font = `700 ${s}px sans-serif`;
  c.fillText(line1, w / 2, cy - s * 0.75);
  c.fillStyle = 'rgba(255, 255, 255, 0.6)';
  c.font = `${s}px sans-serif`;
  c.fillText(line2, w / 2, cy + s * 0.85);
  // COMING SOON / NOW SHOWING, bottom-left in hot pink.
  c.textAlign = 'left';
  c.font = `700 ${Math.max(13, Math.round(w * 0.02))}px sans-serif`;
  c.fillStyle = '#ff5e8a';
  c.fillText(state.comingSoon === false ? 'NOW SHOWING' : 'COMING SOON', metrics.edge + 4, cy + 2);
  // Barcode, bottom-right: deterministic bars from a fixed seed, on a
  // white plate lifted clear of the gold frame, with the digits printed
  // inside the plate (below the bars they ran into the frame stroke).
  const bw = Math.round(w * 0.085);
  const bh = Math.round(metrics.billing * 0.72);
  const bx = w - metrics.edge - bw - 12;
  const by = cy - bh / 2 - 6;
  c.fillStyle = '#ffffff';
  c.fillRect(bx - 6, by - 4, bw + 12, bh + 16);
  const nextRand = barcodeStream(20261120);
  c.fillStyle = '#111111';
  let cursor = bx;
  while (cursor < bx + bw - 3) {
    const barW = 1 + Math.floor(nextRand() * 3);
    if (nextRand() > 0.42) c.fillRect(cursor, by, barW, bh);
    cursor += barW + 1 + Math.floor(nextRand() * 2);
  }
  c.fillStyle = '#111111';
  c.font = `${Math.max(8, Math.round(w * 0.009))}px sans-serif`;
  c.textAlign = 'center';
  c.fillText('0 02113 123456', bx + bw / 2, by + bh + 6);
  c.restore();
}

// The thin gold frame and inner rule that hold the whole poster together.
function paintFrame(c, w, h, metrics) {
  const rules = [
    { color: '#d4a437', width: Math.max(3, Math.round(w * 0.006)), inset: metrics.edge / 2 },
    { color: 'rgba(212, 164, 55, 0.45)', width: 1.5, inset: metrics.edge + 4 },
  ];
  c.save();
  for (const rule of rules) {
    c.strokeStyle = rule.color;
    c.lineWidth = rule.width;
    c.strokeRect(rule.inset, rule.inset, w - rule.inset * 2, h - rule.inset * 2);
  }
  c.restore();
}

// Grow a box around its centre by a factor, used by the pop-out hero.
function growBox(box, factor) {
  return {
    x: box.x - (box.w * (factor - 1)) / 2,
    y: box.y - (box.h * (factor - 1)) / 2,
    w: box.w * factor,
    h: box.h * factor,
    slant: box.slant || 0,
  };
}

// The pop-out hero: the hero panel grown past its borders and rimmed in
// gold, painted BEFORE the title so the lettering reads over it. Its top
// is clamped to the panel field so it never covers the quote strip.
function paintPopout(c, w, h, state, boxes, slots, metrics) {
  const heroIdx = layoutDef(state.layout || 'harbor').hero;
  const heroBox = boxes[heroIdx];
  const heroSlot = slots[heroIdx];
  if (!heroBox || !heroSlot || !heroSlot.img) return;
  const big = growBox(heroBox, 1.07);
  big.y = Math.max(metrics.field.y - 4, big.y - h * 0.012);
  c.save();
  c.shadowColor = 'rgba(0, 0, 0, 0.65)';
  c.shadowBlur = 22;
  c.shadowOffsetY = 8;
  paintPhoto(c, big, heroSlot);
  c.restore();
  c.save();
  c.strokeStyle = '#d4a437';
  c.lineWidth = Math.max(2, Math.round(w * 0.003));
  c.strokeRect(big.x, big.y, big.w, big.h);
  c.restore();
}

function emptySlot() {
  return { img: null, ox: 0.5, oy: 0.5, zoom: 1, role: '', flavor: '' };
}

// Render the whole cover onto any canvas at its own size. Paint order
// matters: the pop-out hero goes down BEFORE the title, so the big
// lettering always reads over the hero's top edge instead of hiding
// behind it.
export function drawCover(canvas, state) {
  const c = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const metrics = measurePoster(w, h);
  c.fillStyle = '#160a24';
  c.fillRect(0, 0, w, h);
  const layoutId = state.layout || 'harbor';
  const boxes = panelRects(w, h, layoutId);
  const slots = state.panels || [];
  for (let i = 0; i < boxes.length; i++) {
    paintPhoto(c, boxes[i], slots[i] || emptySlot());
  }
  applyGrade(c, w, h, state.grade || 'sunset');
  if (state.popout) paintPopout(c, w, h, state, boxes, slots, metrics);
  const titleInfo = paintTitle(c, w, h, state);
  paintSubtitle(c, w, h, state, titleInfo);
  for (let i = 0; i < boxes.length; i++) {
    paintRoleChip(c, boxes[i], slots[i] || {}, w);
  }
  paintQuote(c, w, h, state, metrics);
  paintVol(c, w, h, state, metrics);
  paintSeal(c, w, h, state, metrics);
  paintRibbon(c, w, h, state, metrics);
  paintBilling(c, w, h, state, metrics);
  paintFrame(c, w, h, metrics);
}

// Render the cover at an export size and hand back a PNG blob.
export async function exportCover(state, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawCover(canvas, state);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}
