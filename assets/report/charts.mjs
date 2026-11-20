// NoW visual report system: chart builders. Every function returns an SVG or HTML string,
// drawn at render time, so the PDF needs no JavaScript. Colours follow the NoW Chart System:
// teal is the story, grey is context, band colours only for score bands.
export const C = {
  teal: '#23a0b3', tealD: '#117c8c', red: '#c64445', slate: '#3e518f', orange: '#d57b3c', purple: '#715698',
  green: '#6aa224', lime: '#8EC850', grey: '#808c9e', greyP: '#e3e8eb', ink: '#0E1316', body: '#2f3747',
  line: '#DCE3E6', navy: '#272F46',
};
// Score bands, shared by every chart. Same four words everywhere.
export const BANDS = [
  { name: 'Critical', lo: 0, hi: 50, fill: '#f6e1e1', dark: 'rgba(198,68,69,.4)' },
  { name: 'Needs Work', lo: 50, hi: 70, fill: '#fbeadf', dark: 'rgba(213,123,60,.4)' },
  { name: 'On Track', lo: 70, hi: 85, fill: '#dcf0f3', dark: 'rgba(35,160,179,.5)' },
  { name: 'Strong', lo: 85, hi: 100, fill: '#e6f2d8', dark: 'rgba(106,162,36,.5)' },
];
export const BANDS10 = [[0, 5], [5, 7], [7, 9], [9, 10]];
export const band = (s) => (s >= 85 ? 'Strong' : s >= 70 ? 'On Track' : s >= 50 ? 'Needs Work' : 'Critical');
export const band10 = (s) => (s >= 9 ? 'Strong' : s >= 7 ? 'On Track' : s >= 5 ? 'Needs Work' : 'Critical');
export const bandPill = (b) => `<span class="pill p-${b.toLowerCase().replace(/\s/g, '')}">${b}</span>`;

export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// *text* becomes the accent span in headlines; **text** becomes bold in body copy.
export const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<em>$1</em>');

const t = (x, y, txt, a = {}) => {
  const attrs = Object.entries({ 'font-size': 10, fill: C.body, ...a })
    .map(([k, v]) => `${k}="${v}"`).join(' ');
  return `<text x="${x}" y="${y}" ${attrs}>${esc(txt)}</text>`;
};
const svg = (w, h, body) => `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const mono = { 'font-family': 'IBM Plex Mono, monospace' };

/** Cover score track. prev is optional (progress reports). */
export function bandTrack({ score, prev = null, range = null, width = 680, dark = true, rangeOnly = false, capped = false, note = null }) {
  const x = (v) => (v / 100) * width;
  const label = dark ? 'rgba(255,255,255,.6)' : C.grey;
  let o = '';
  BANDS.forEach((b) => {
    o += `<rect x="${x(b.lo) + 1}" y="30" width="${x(b.hi) - x(b.lo) - 2}" height="10" rx="3" fill="${dark ? b.dark : b.fill}"/>`;
    o += t(x(b.lo) + 4, 58, `${b.name} ${b.lo}–${b.hi === 100 ? 100 : b.hi - 1}`, { fill: label, 'font-weight': 600 });
  });
  if (range && range[1] > range[0]) o += `<rect x="${x(range[0])}" y="27" width="${x(range[1]) - x(range[0])}" height="16" rx="8" fill="${dark ? 'rgba(255,255,255,.28)' : 'rgba(39,47,70,.18)'}"/>`;
  const next = BANDS.find((b) => b.lo > score);
  if (prev != null) {
    o += `<line x1="${x(prev)}" x2="${x(score)}" y1="35" y2="35" stroke="${dark ? '#fff' : C.ink}" stroke-width="2"/>`;
    o += `<circle cx="${x(prev)}" cy="35" r="7" fill="${dark ? C.navy : '#fff'}" stroke="${label}" stroke-width="2"/>`;
    o += t(x(prev), 16, `Before · ${prev}`, { 'text-anchor': prev < score ? 'end' : 'start', 'font-size': 11, fill: label, 'font-weight': 700 });
  }
  if (rangeOnly) return svg(width, 64, o + t(x((range[0] + range[1]) / 2), 16, `Range ${range[0]}–${range[1]} · no point estimate`, { 'text-anchor': 'middle', 'font-size': 11, fill: dark ? C.lime : C.tealD, 'font-weight': 800 }));
  o += `<circle cx="${x(score)}" cy="35" r="9" fill="${C.lime}" stroke="${dark ? '#fff' : C.ink}" stroke-width="2"/>`;
  let lab = capped ? `Now · ${score} · capped by a failed access check` : note ? `Now · ${score} · ${note}` : `Now · ${score}`;
  if (!capped && !note && next && next.lo - score <= 5) lab += ` · ${next.lo - score} short of ${next.name}`;
  o += t(prev != null && prev > score ? x(score) - 8 : x(score) + (prev != null ? 8 : 0), 16, lab,
    { 'text-anchor': prev != null && prev > score ? 'end' : prev != null ? 'start' : 'middle', 'font-size': 11, fill: dark ? C.lime : C.tealD, 'font-weight': 800 });
  return svg(width, 64, o);
}

/** Five-pillar chart. Rows: {name, weight, score, prev?, pending?}. Dumbbells when prev is set. */
export function pillarChart(rows, { width = 680 } = {}) {
  const L = 200, R = width - 85, x = (v) => L + ((R - L) * v) / 100, top = 26, rh = 44;
  const H = top + rows.length * rh;
  let o = '';
  BANDS.forEach((b) => {
    o += `<rect x="${x(b.lo)}" y="${top - 6}" width="${x(b.hi) - x(b.lo)}" height="${H - top + 2}" fill="${b.fill}" opacity=".75"/>`;
    o += t(x(b.lo) + 4, top - 10, b.name, { 'font-size': 9, fill: C.grey, 'font-weight': 600 });
  });
  [0, 25, 50, 75, 100].forEach((v) => (o += t(x(v), H + 14, v, { 'font-size': 9, fill: C.grey, 'text-anchor': 'middle' })));
  rows.forEach((r, i) => {
    const y = top + i * rh + rh / 2 - 2;
    o += t(0, y - 2, r.name, { 'font-size': 12, 'font-weight': 800, fill: C.ink });
    o += t(0, y + 12, `weight ${r.weight}%${r.pending ? ' · pending verification' : ''}`, { 'font-size': 9, fill: C.grey, ...mono });
    if (r.prev != null) {
      const up = r.score - r.prev;
      const col = up > 0 ? C.teal : up < 0 ? C.red : C.grey;
      o += `<line x1="${x(r.prev)}" x2="${x(r.score)}" y1="${y}" y2="${y}" stroke="${col}" stroke-width="4" stroke-linecap="round"/>`;
      o += `<circle cx="${x(r.prev)}" cy="${y}" r="6" fill="#fff" stroke="${C.grey}" stroke-width="2.5"/>`;
      o += `<circle cx="${x(r.score)}" cy="${y}" r="7.5" fill="${col}"/>`;
      const lo = Math.min(r.prev, r.score), hi = Math.max(r.prev, r.score);
      if (r.prev !== r.score) o += t(x(lo) - 11, y + 4, lo === r.prev ? r.prev : r.score, { 'font-size': 10.5, 'text-anchor': 'end', fill: lo === r.prev ? C.grey : C.ink, 'font-weight': 700 });
      o += t(x(hi) + 12, y + 4, hi === r.score ? r.score : r.prev, { 'font-size': 11.5, fill: hi === r.score ? C.ink : C.grey, 'font-weight': 800 });
      o += t(width, y + 5, up > 0 ? `+${up}` : `${up}`, { 'font-size': Math.abs(up) >= 10 ? 17 : 14, 'text-anchor': 'end', 'font-weight': 900, fill: up >= 10 ? C.tealD : up < 0 ? C.red : up ? C.body : C.grey });
    } else {
      o += `<rect x="${L}" y="${y - 6}" width="${x(r.score) - L}" height="12" rx="4" fill="${r.pending ? C.grey : C.teal}"/>`;
      o += t(x(r.score) + 8, y + 4, r.score, { 'font-size': 12, 'font-weight': 900, fill: C.ink });
      o += t(width, y + 5, band(r.score), { 'font-size': 10, 'text-anchor': 'end', 'font-weight': 700, fill: C.body });
    }
  });
  return svg(width, H + 20, o);
}

/** Single audit: how many of the 100 available points each pillar earned. */
export function pointsBar(rows, { width = 680 } = {}) {
  const x = (v) => (v / 100) * width;
  let o = '', at = 0;
  rows.forEach((r) => {
    const avail = r.weight, earned = (r.score / 100) * r.weight;
    o += `<rect x="${x(at)}" y="18" width="${x(avail) - 2}" height="26" rx="4" fill="${C.greyP}"/>`;
    o += `<rect x="${x(at)}" y="18" width="${Math.max(x(earned) - 2, 2)}" height="26" rx="4" fill="${C.teal}"/>`;
    o += t(x(at) + 4, 12, `${r.short || r.name}`, { 'font-size': 9.5, 'font-weight': 700, fill: C.ink });
    o += t(x(at) + 6, 36, `${earned.toFixed(1)} / ${avail}`, { 'font-size': 10, 'font-weight': 800, fill: '#fff' });
    at += avail;
  });
  return svg(width, 50, o);
}

/** Progress: where the change in points came from. steps: [{name, delta}] (already weighted). */
export function waterfall({ start, end, steps, width = 390 }) {
  const all = [start, end];
  let run = start;
  steps.forEach((s) => { run += s.delta; all.push(run); });
  const yMin = Math.floor(Math.min(...all) / 5) * 5 - 3, yMax = Math.max(...all, 70) + 3;
  const base = 200, y = (v) => base - ((v - yMin) / (yMax - yMin)) * 175;
  const cols = [{ name: 'Before', v: start, kind: 'start' }, ...steps, { name: 'Now', v: end, kind: 'end' }];
  const off = 24, bw = 34, gap = (width - off - cols.length * bw) / cols.length;
  let o = '';
  for (let v = Math.ceil(yMin / 5) * 5; v <= yMax; v += 5) {
    const on = BANDS.some((b) => b.lo === v && v > 0);
    o += `<line x1="0" x2="${width}" y1="${y(v)}" y2="${y(v)}" stroke="${on ? C.teal : C.line}" ${on ? 'stroke-dasharray="4 3"' : ''}/>`;
    o += t(0, y(v) - 3, on ? `${v} · ${band(v)}` : v, { 'font-size': 8.5, fill: on ? C.tealD : C.grey, 'font-weight': on ? 700 : 400 });
  }
  run = start;
  cols.forEach((c, i) => {
    const cx = off + gap / 2 + i * (bw + gap);
    let y0, y1, f, lab;
    if (c.kind === 'start') { y0 = y(yMin); y1 = y(start); f = C.grey; lab = start; }
    else if (c.kind === 'end') { y0 = y(yMin); y1 = y(end); f = C.navy; lab = end; }
    else {
      y0 = y(run); y1 = y(run + c.delta); f = c.delta >= 1 ? C.teal : c.delta <= -1 ? C.red : C.greyP;
      lab = c.delta > 0 ? `+${Math.round(c.delta * 10) / 10}` : c.delta < 0 ? `${Math.round(c.delta * 10) / 10}` : '0'; run += c.delta;
    }
    o += `<rect x="${cx}" y="${Math.min(y0, y1)}" width="${bw}" height="${Math.max(Math.abs(y0 - y1), 2)}" rx="3" fill="${f}"/>`;
    o += t(cx + bw / 2, Math.min(y0, y1) - 5, lab, { 'text-anchor': 'middle', 'font-size': c.kind ? 13 : 11, 'font-weight': 900, fill: C.ink });
    o += t(cx + bw / 2, base + 15, c.name, { 'text-anchor': 'middle', 'font-size': 9, 'font-weight': 600 });
  });
  return svg(width, 222, o);
}

/** SEO / GEO / AEO out of 10. rows: {k, score, prev?} */
export function lenses(rows, { width = 270 } = {}) {
  const L = 50, R = width - 10, x = (v) => L + ((R - L) * v) / 10;
  const fills = BANDS.map((b) => b.fill);
  let o = '';
  rows.forEach((r, i) => {
    const y = 34 + i * 60;
    BANDS10.forEach(([a, b], k) => (o += `<rect x="${x(a)}" y="${y - 10}" width="${x(b) - x(a)}" height="20" fill="${fills[k]}"/>`));
    o += t(0, y + 5, r.k, { 'font-size': 15, 'font-weight': 900, fill: C.ink });
    const has = r.prev != null, up = has ? r.score - r.prev : 0;
    const col = !has || up > 0 ? C.teal : up < 0 ? C.red : C.grey;
    if (has) {
      o += `<line x1="${x(r.prev)}" x2="${x(r.score)}" y1="${y}" y2="${y}" stroke="${col}" stroke-width="4" stroke-linecap="round"/>`;
      o += `<circle cx="${x(r.prev)}" cy="${y}" r="6" fill="#fff" stroke="${C.grey}" stroke-width="2.5"/>`;
    }
    o += `<circle cx="${x(r.score)}" cy="${y}" r="7.5" fill="${col}"/>`;
    const lab = has ? (up ? `${r.prev} → ${r.score}` : `${r.score}, no change`) : `${r.score} · ${band10(r.score)}`;
    o += t(x(r.score), y - 15, lab, { 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 800, fill: C.ink });
  });
  [0, 5, 7, 9, 10].forEach((v) => (o += t(x(v), 34 + rows.length * 60 - 18, v, { 'text-anchor': 'middle', 'font-size': 8.5, fill: C.grey })));
  return svg(width, 34 + rows.length * 60, o);
}

/** Citation dots: hits of total. */
export function dots(hits, total, { dark = true, perRow = 8 } = {}) {
  let o = '';
  const rows = Math.ceil(total / perRow);
  for (let i = 0; i < total; i++) {
    const on = i < hits, cx = 12 + (i % perRow) * 25.5, cy = 12 + Math.floor(i / perRow) * 24;
    o += `<circle cx="${cx}" cy="${cy}" r="9" fill="${on ? C.lime : 'none'}" stroke="${on ? C.lime : dark ? 'rgba(255,255,255,.35)' : C.grey}" stroke-width="2"/>`;
  }
  return svg(24 + (Math.min(total, perRow) - 1) * 25.5, rows * 24 + 2, o);
}

/** Stacked status bar for a block of audit signals. counts: {good, needs, missing, verify} */
export function statusBar(counts, { width = 680 } = {}) {
  const keys = [['good', 'Good', C.green], ['needs', 'Needs attention', C.orange], ['missing', 'Missing', C.red], ['verify', 'Verify', C.purple]];
  const total = keys.reduce((a, [k]) => a + (counts[k] || 0), 0) || 1;
  let o = '', at = 0;
  keys.forEach(([k, name, col]) => {
    const n = counts[k] || 0;
    if (!n) return;
    const w = (n / total) * width;
    o += `<rect x="${at}" y="0" width="${w - 2}" height="14" rx="3" fill="${col}"/>`;
    o += t(at, 30, `${n} ${name}`, { 'font-size': 9.5, 'font-weight': 700, fill: C.body });
    at += w;
  });
  return svg(width, 34, o);
}

/** Horizontal bars of named items, e.g. clients by industry. rows: {label, items[], note, first} */
export function itemBars(rows, { width = 680, max = null, noteHead = 'PAGE TO BUILD' } = {}) {
  const L = 200, R = 430, m = max || Math.max(...rows.map((r) => r.items.length)), cell = (R - L) / m, rh = 72;
  let o = t(460, 12, noteHead, { 'font-size': 9, fill: C.grey, ...mono });
  rows.forEach((r, i) => {
    const y = 30 + i * rh, n = r.items.length;
    o += t(0, y + 14, r.label, { 'font-size': 12, 'font-weight': 800, fill: C.ink });
    const lines = [''];
    r.items.forEach((c) => { const cur = lines[lines.length - 1]; if (cur && (cur + ' · ' + c).length > 40) lines.push(c); else lines[lines.length - 1] = cur ? `${cur} · ${c}` : c; });
    lines.slice(0, 3).forEach((ln, k) => (o += t(0, y + 30 + k * 12, ln, { 'font-size': 9, fill: C.grey })));
    for (let k = 0; k < n; k++) o += `<rect x="${L + k * cell}" y="${y}" width="${cell - 5}" height="26" rx="4" fill="${r.first ? C.teal : C.slate}" opacity="${r.first ? 1 : 0.55}"/>`;
    o += t(L + n * cell + 4, y + 19, n, { 'font-size': 16, 'font-weight': 900, fill: C.ink });
    if (r.note) o += t(460, y + 18, (r.first ? 'First: ' : '') + r.note, { 'font-size': 11, 'font-weight': r.first ? 800 : 500, fill: r.first ? C.tealD : C.body });
    o += `<line x1="0" x2="${width}" y1="${y + rh - 10}" y2="${y + rh - 10}" stroke="${C.line}"/>`;
  });
  return svg(width, 30 + rows.length * rh, o);
}

/** Off-site plays on a 26-week timeline. plays: {name, sub, effort: low|medium|high, start, end, ongoing?, marker?:{week,label}, note?} */
export function gantt(plays, { width = 680, quitWeek = 6 } = {}) {
  const L = 210, R = width, wk = 26, x = (w) => L + ((R - L) * w) / wk, top = 36, rh = 50;
  const eff = { low: C.teal, medium: C.orange, high: C.red };
  const H = top + plays.length * rh;
  let o = `<defs><linearGradient id="ramp"><stop offset="0" stop-color="${C.red}" stop-opacity=".25"/><stop offset="1" stop-color="${C.red}"/></linearGradient></defs>`;
  [[0, 'DAY 0'], [4.3, 'DAY 30'], [8.6, 'DAY 60'], [13, 'DAY 90'], [26, '6 MONTHS']].forEach(([w, lab], i) => {
    o += `<line x1="${x(w)}" x2="${x(w)}" y1="${top - 8}" y2="${H}" stroke="${C.line}"/>`;
    o += t(i === 4 ? x(w) : x(w) + 3, top - 14, lab, { 'font-size': 9, fill: C.grey, 'text-anchor': i === 4 ? 'end' : 'start', ...mono });
  });
  const hasPR = plays.some((p) => p.effort === 'high');
  if (hasPR && quitWeek) {
    o += `<line x1="${x(quitWeek)}" x2="${x(quitWeek)}" y1="${top - 8}" y2="${H}" stroke="${C.red}" stroke-dasharray="4 3" stroke-width="1.5"/>`;
    o += t(x(quitWeek) + 4, H + 14, `Week ${quitWeek}: where PR often stalls (our experience)`, { 'font-size': 9.5, fill: C.red, 'font-weight': 700 });
  }
  plays.forEach((p, i) => {
    const y = top + i * rh, end = p.ongoing ? wk : p.end;
    o += t(0, y + 16, p.name, { 'font-size': 11.5, 'font-weight': 800, fill: C.ink });
    if (p.sub) o += t(0, y + 30, p.sub, { 'font-size': 9, fill: C.grey });
    const fill = p.effort === 'high' && end - p.start > 8 ? 'url(#ramp)' : eff[p.effort] || C.teal;
    o += `<rect x="${x(p.start)}" y="${y + 6}" width="${Math.max(x(end) - x(p.start), 8)}" height="20" rx="4" fill="${fill}"/>`;
    if (p.ongoing) o += t(x(wk) - 6, y + 20, 'ongoing →', { 'text-anchor': 'end', 'font-size': 9, 'font-weight': 700, fill: '#fff' });
    if (p.marker) {
      o += `<circle cx="${x(p.marker.week)}" cy="${y + 16}" r="5" fill="#fff" stroke="${C.teal}" stroke-width="2"/>`;
      o += t(x(p.marker.week) + 9, y + 20, p.marker.label, { 'font-size': 9 });
    }
    if (p.note) o += t(p.ongoing ? x(p.start) + 6 : x(end) + 8, y + 20, p.note, { 'font-size': 9, fill: p.ongoing ? '#fff' : C.body, 'font-weight': p.ongoing ? 700 : 400 });
  });
  [['Low', C.teal], ['Medium', C.orange], ['High', C.red]].forEach(([n, c], i) => {
    o += `<rect x="${L + i * 85}" y="${H + 24}" width="12" height="12" rx="3" fill="${c}"/>`;
    o += t(L + i * 85 + 17, H + 34, `${n} effort`, { 'font-size': 10 });
  });
  return svg(width, H + 42, o);
}

/** Monthly trend of the headline score. points: [{label, score}] */
export function trend(points, { width = 680, height = 170 } = {}) {
  const L = 34, R = width - 20, top = 14, bot = height - 26;
  const lo = Math.max(0, Math.floor((Math.min(...points.map((p) => p.score)) - 10) / 10) * 10), hi = 100;
  const x = (i) => L + (points.length === 1 ? (R - L) / 2 : ((R - L) * i) / (points.length - 1));
  const y = (v) => bot - ((v - lo) / (hi - lo)) * (bot - top);
  let o = '';
  BANDS.forEach((b) => {
    const a = Math.max(b.lo, lo), z = b.hi;
    if (z <= lo) return;
    o += `<rect x="${L}" y="${y(z)}" width="${R - L}" height="${y(a) - y(z)}" fill="${b.fill}" opacity=".75"/>`;
    o += t(L + 4, y(z) + 11, b.name, { 'font-size': 8.5, fill: C.grey, 'font-weight': 600 });
  });
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.score)}`).join(' ');
  o += `<path d="${path}" fill="none" stroke="${C.teal}" stroke-width="2.5"/>`;
  points.forEach((p, i) => {
    const last = i === points.length - 1;
    o += `<circle cx="${x(i)}" cy="${y(p.score)}" r="${last ? 7 : 5}" fill="${last ? C.teal : '#fff'}" stroke="${C.teal}" stroke-width="2.5"/>`;
    o += t(x(i), y(p.score) - 12, p.score, { 'text-anchor': 'middle', 'font-size': last ? 13 : 11, 'font-weight': 900, fill: C.ink });
    o += t(x(i), height - 8, p.label, { 'text-anchor': 'middle', 'font-size': 9, fill: C.grey, ...mono });
  });
  return svg(width, height, o);
}

/** Horizontal scope bars: rows {label, value, inner?, text} */
export function scopeBars(rows, { width = 680 } = {}) {
  const L = 110, R = width - 40, max = Math.max(...rows.map((r) => r.value)), x = (v) => L + ((R - L) * v) / max;
  let o = '';
  rows.forEach((r, i) => {
    const y = 6 + i * 36, last = i === rows.length - 1;
    o += t(0, y + 15, r.label, { 'font-size': 12, 'font-weight': 800, fill: C.ink });
    o += `<rect x="${L}" y="${y}" width="${x(r.value) - L}" height="22" rx="4" fill="${last ? C.navy : C.grey}" opacity="${last || r.inner == null ? 1 : 0.35}"/>`;
    if (r.inner != null) o += `<rect x="${L}" y="${y}" width="${x(r.inner) - L}" height="22" rx="4" fill="${C.grey}"/>`;
    const inside = x(r.value) - L > 200;
    o += t(inside ? x(r.value) - 10 : x(r.value) + 8, y + 15, r.text, { 'text-anchor': inside ? 'end' : 'start', 'font-size': 10.5, 'font-weight': 700, fill: inside ? '#fff' : C.body });
  });
  return svg(width, rows.length * 36 + 8, o);
}

/** v7 pillars as point + range whiskers on the band scale. rows: {name, weight (effective), score, lo, hi, measured, gradeCShare} */
export function rangeChart(rows, { width = 680 } = {}) {
  const L = 210, R = width - 70, x = (v) => L + ((R - L) * v) / 100, top = 26, rh = 44;
  const H = top + rows.length * rh;
  let o = '';
  BANDS.forEach((b) => {
    o += `<rect x="${x(b.lo)}" y="${top - 6}" width="${x(b.hi) - x(b.lo)}" height="${H - top + 2}" fill="${b.fill}" opacity=".75"/>`;
    o += t(x(b.lo) + 4, top - 10, b.name, { 'font-size': 9, fill: C.grey, 'font-weight': 600 });
  });
  [0, 25, 50, 75, 100].forEach((v) => (o += t(x(v), H + 14, v, { 'font-size': 9, fill: C.grey, 'text-anchor': 'middle' })));
  rows.forEach((r, i) => {
    const y = top + i * rh + rh / 2 - 2;
    o += t(0, y - 2, r.name, { 'font-size': 12, 'font-weight': 800, fill: C.ink });
    o += t(0, y + 12, r.measured ? `weight ${r.weight}%` : r.key === 'px' ? 'not measured · dropped' : 'no checks assessed · range only', { 'font-size': 9, fill: C.grey, ...mono });
    if (!r.measured) return;
    const s = Math.round(r.score), lo = Math.round(r.lo), hi = Math.round(r.hi);
    if (hi > lo) {
      o += `<line x1="${x(lo)}" x2="${x(hi)}" y1="${y}" y2="${y}" stroke="${C.grey}" stroke-width="2"/>`;
      o += `<line x1="${x(lo)}" x2="${x(lo)}" y1="${y - 6}" y2="${y + 6}" stroke="${C.grey}" stroke-width="2"/><line x1="${x(hi)}" x2="${x(hi)}" y1="${y - 6}" y2="${y + 6}" stroke="${C.grey}" stroke-width="2"/>`;
    }
    o += `<circle cx="${x(s)}" cy="${y}" r="7.5" fill="${r.gradeCShare > 1 / 3 ? C.orange : C.teal}"/>`;
    o += t(width, y + 5, hi > lo ? `${s} (${lo}–${hi})` : `${s}`, { 'font-size': 12, 'text-anchor': 'end', 'font-weight': 900, fill: C.ink });
  });
  return svg(width, H + 20, o);
}

/** Mention rate per engine with 95% interval whiskers. rows: {engine, rate, lo, hi, mentions, answers} */
export function ciChart(rows, { width = 680 } = {}) {
  const L = 150, R = width - 120, x = (v) => L + ((R - L) * v) / 100, top = 18, rh = 36;
  const H = top + rows.length * rh;
  let o = '';
  [0, 25, 50, 75, 100].forEach((v) => {
    o += `<line x1="${x(v)}" x2="${x(v)}" y1="${top - 6}" y2="${H}" stroke="${C.line}"/>`;
    o += t(x(v), H + 14, `${v}%`, { 'font-size': 9, fill: C.grey, 'text-anchor': 'middle' });
  });
  rows.forEach((r, i) => {
    const y = top + i * rh + rh / 2 - 4, pooled = /all engines/i.test(r.engine);
    o += t(0, y + 4, r.engine, { 'font-size': 12, 'font-weight': pooled ? 900 : 800, fill: C.ink });
    o += `<line x1="${x(r.lo)}" x2="${x(r.hi)}" y1="${y}" y2="${y}" stroke="${pooled ? C.navy : C.teal}" stroke-width="6" stroke-linecap="round" opacity=".35"/>`;
    o += `<circle cx="${x(r.rate)}" cy="${y}" r="7" fill="${pooled ? C.navy : C.teal}"/>`;
    o += t(width, y + 4, `${r.rate}% (${r.lo}–${r.hi})`, { 'font-size': 12, 'text-anchor': 'end', 'font-weight': 900, fill: C.ink });
    o += t(width, y + 16, `${r.mentions} of ${r.answers} answers`, { 'font-size': 9, 'text-anchor': 'end', fill: C.grey });
  });
  return svg(width, H + 22, o);
}

/** Checks met per discipline as stacked bars. rows: {k, met, partial, notmet, unverifiable, total} */
export function disciplineBars(rows, { width = 680 } = {}) {
  const L = 60, R = width - 110, top = 4, rh = 34;
  const max = Math.max(...rows.map((r) => r.total));
  const x = (v) => ((R - L) * v) / max;
  const parts = [['met', C.green], ['partial', C.orange], ['notmet', C.red], ['unverifiable', C.purple]];
  let o = '';
  rows.forEach((r, i) => {
    const y = top + i * rh;
    o += t(0, y + 15, r.k, { 'font-size': 14, 'font-weight': 900, fill: C.ink });
    let at = L;
    parts.forEach(([k, col]) => {
      if (!r[k]) return;
      o += `<rect x="${at}" y="${y + 2}" width="${x(r[k]) - 2}" height="18" rx="3" fill="${col}"/>`;
      at += x(r[k]);
    });
    o += t(width, y + 16, `${r.met} of ${r.total - r.unverifiable} met`, { 'font-size': 11.5, 'text-anchor': 'end', 'font-weight': 800, fill: C.ink });
  });
  return svg(width, top + rows.length * rh, o);
}
