// NoW visual report system: page-level building blocks shared by the audit and progress reports.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { C, esc, md, band, band10, bandTrack, BANDS } from './charts.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const b64 = (f) => `data:image/png;base64,${fs.readFileSync(path.join(HERE, f)).toString('base64')}`;
export const LOGO_DARK = () => b64('now-logo-darkbg.png');

const checkSvg = '<svg viewBox="0 0 12 12"><path d="M2 6.5l2.6 2.5L10 3.5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** The whole document. footer: left-hand running footer text. */
export function page({ title, footer, body }) {
  const css = fs.readFileSync(path.join(HERE, 'report.css'), 'utf8');
  const f = footer.replace(/"/g, "'");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=block" rel="stylesheet">
<style>${css}
@page{@bottom-left{content:"${f}";font:500 8px 'IBM Plex Mono',monospace;letter-spacing:.06em;text-transform:uppercase;color:#808c9e}
@bottom-right{content:counter(page);font:500 8px 'IBM Plex Mono',monospace;color:#808c9e}}</style></head>
<body>${body}</body></html>`;
}

export const eyebrow = (n, label) => `<div class="eyebrow"><b></b>${n ? `${esc(n)} · ` : ''}${esc(label)}</div>`;
export const head = (n, label, h1, lede) =>
  `<div style="break-inside:avoid">${eyebrow(n, label)}<h1>${md(h1)}</h1>${lede ? `<p class="lede">${md(lede)}</p>` : ''}</div>`;
export const section = (inner, { flow = false } = {}) => `<section class="section${flow ? ' flow' : ''}">${inner}</section>`;
export const partDivider = (n, title, desc) =>
  `<div class="part"><div class="n">Part ${esc(n)}</div><div class="t">${esc(title)}</div>${desc ? `<div class="d">${md(desc)}</div>` : ''}</div>`;

/** Cover. score/prev on 100; dims: [{k, score, prev?}] */
export function cover({ kicker, domain, score, prev = null, range = null, jrange = null, capped = false, note = null, bandLabel = null, scoreLabel = 'AI search<br>readiness / 100', headline, lede, dims = [], chips: rawChips = null, footLeft, footRight = 'The NoW of Work' }) {
  const big = prev != null
    ? `<div class="from">${prev}</div><div class="arrow">→</div><div class="to">${score}</div><div class="of">${scoreLabel}</div>`
    : `<div class="to"${score == null ? ' style="font-size:96px;white-space:nowrap;letter-spacing:-.04em"' : ''}>${score == null ? `${range[0]}–${range[1]}` : score}</div><div class="of">${scoreLabel}${range ? `<span style="display:block;color:#fff;margin-top:6px;text-transform:none">${capped ? 'once the gate is fixed:<br>' : ''}unverified range ${range[0]}–${range[1]}${jrange && jrange[0] != null ? `<br>judgment range ${jrange[0]}–${jrange[1]}` : ''}</span>` : ''}<b>${esc(bandLabel || band(score))}</b></div>`;
  const chips = rawChips ? rawChips.map((c) => `<div class="chip"><div class="k">${esc(c.k)}<i>${esc(c.name || '')}</i></div><div class="v">${c.v}</div><div class="s">${esc(c.s)}</div></div>`).join('') : dims.map((d) => {
    const v = d.prev != null ? `<span>${d.prev} →</span> ${d.score}` : `${d.score}<span style="font-size:18px"> / 10</span>`;
    let s = band10(d.score);
    if (d.prev != null && band10(d.prev) !== s) s = `${band10(d.prev)} to ${s}`;
    else if (d.prev != null && d.prev === d.score) s += ', no change';
    return `<div class="chip"><div class="k">${esc(d.k)}<i>${esc(d.name || '')}</i></div><div class="v">${v}</div><div class="s">${esc(s)}</div></div>`;
  }).join('');
  return `<section class="cover"><img class="logo" src="${LOGO_DARK()}" alt="The NoW of Work">
  ${eyebrow('', kicker)}<div class="domain">${esc(domain)}</div>
  <div class="bigscore">${big}</div>
  <div style="margin-top:22px">${bandTrack({ score: score ?? Math.round((range[0] + range[1]) / 2), prev, range, rangeOnly: score == null, capped, note, width: 680 })}</div>
  <h1>${md(headline)}</h1>${lede ? `<p class="lede">${md(lede)}</p>` : ''}
  <div class="chips">${chips}</div>
  <div class="foot"><span>${esc(footLeft)}</span><span>${esc(footRight)}</span></div></section>`;
}

/** The explainer page every report opens with: SEO, AEO and GEO in plain words. */
export function definitionsPage(n = '00') {
  const defs = [
    { ab: 'SEO', nm: 'Search Engine Optimization', c: C.slate, c2: C.slate,
      q: 'Can people find you when they search?',
      where: 'The list of results on Google and Bing, including maps.',
      what: 'Whether search engines can read your pages, understand them, and rank them for the words buyers type.',
      biz: '<b>Traffic you don’t pay for.</b> People searching for what you sell land on your site.',
      moves: 'Pages search engines can read and index, clear titles, links and mentions from other sites, then speed.' },
    { ab: 'AEO', nm: 'Answer Engine Optimization', c: C.orange, c2: '#9a5121',
      q: 'Are you the answer?',
      where: 'Anywhere one answer is shown above the links: Google’s AI Overviews and AI Mode, assistants, and the featured snippets that remain.',
      what: 'Whether your pages answer buyers’ questions directly and clearly enough to be lifted into that answer.',
      biz: '<b>You’re the name in the answer, even when nobody clicks.</b> People clicked a regular result in 8% of visits with an AI summary against 15% without (Pew Research Center, 2025).',
      moves: 'A plain, direct answer near the top of the page, headings that say the question, and specific facts.' },
    { ab: 'GEO', nm: 'Generative Engine Optimization', c: C.teal, c2: C.tealD,
      q: 'Do AI assistants recommend you?',
      where: 'ChatGPT, Claude, Perplexity, Gemini, Copilot, and Google’s AI Overviews and AI Mode.',
      what: 'Whether AI tools name and cite you when someone asks them for advice or a shortlist.',
      biz: '<b>Being named is a new kind of first impression.</b> AI visits are still a small share of traffic (about 0.3–1% of site visits in 2025–26 studies), and it is a separate place a buyer can meet you, with its own rules.',
      moves: 'Being mentioned on the sites AI answers draw from (reviews, press, YouTube, communities), clear facts about who you are, and original data.' },
  ];
  const cards = defs.map((d) => `<div class="def" style="--c:${d.c};--c2:${d.c2}">
    <div class="ab">${d.ab}</div><div class="nm">${d.nm}</div><div class="q">${d.q}</div>
    <div class="k">Where it shows up</div><p>${d.where}</p>
    <div class="k">What it measures</div><p>${d.what}</p>
    <div class="biz">${d.biz}</div>
    <div class="k">What moves it</div><p>${d.moves}</p></div>`).join('');
  // Stack diagram: SEO is the foundation the other two sit on.
  const stack = `<svg width="130" height="114" viewBox="0 0 150 132">
    <rect x="0" y="0" width="72" height="62" rx="8" fill="${C.orange}"/><text x="36" y="37" text-anchor="middle" font-size="16" font-weight="900" fill="#fff">AEO</text>
    <rect x="78" y="0" width="72" height="62" rx="8" fill="${C.teal}"/><text x="114" y="37" text-anchor="middle" font-size="16" font-weight="900" fill="#fff">GEO</text>
    <rect x="0" y="70" width="150" height="62" rx="8" fill="${C.slate}"/><text x="75" y="99" text-anchor="middle" font-size="16" font-weight="900" fill="#fff">SEO</text>
    <text x="75" y="116" text-anchor="middle" font-size="9" fill="rgba(255,255,255,.8)">the foundation</text></svg>`;
  const engines = [['Google’s index', 'Google results, AI Overviews, AI Mode, Gemini'], ['Bing’s index', 'Bing results and Copilot'], ['OpenAI’s own index', 'ChatGPT search (OpenAI doesn’t publish its other providers)'], ['Brave’s index, plus Anthropic’s own crawler', 'Claude’s web search'], ['Perplexity’s own index', 'Perplexity']];
  const bandsRow = BANDS.map((b) => `<span><i style="background:${b.fill};border:1px solid ${C.line}"></i>${b.name} ${b.lo}–${b.hi === 100 ? 100 : b.hi - 1}</span>`).join('');
  return `<section class="section">${head(n, 'Start here', 'Three ways buyers find you. *Each one is checked here.*',
    'Search has split into three places a buyer can meet your business. They overlap, but each needs different work, and a site can be strong in one and invisible in another.')}
  <div class="defs">${cards}</div>
  <div class="stack">${stack}<div>
    <h3 style="margin-top:0">How they fit together</h3>
    <p style="font-size:11px;line-height:1.5">SEO is the foundation: most AI tools start from a search index, Google’s, Bing’s or their own. Google says optimizing for its AI features is still SEO (May 2026), and it’s right that the work overlaps. We separate the three to show where your work is needed, because ranking well doesn’t guarantee an AI tool names you.</p>
    <table class="data tight" style="margin-top:6px"><thead><tr><th>Index</th><th>What reads from it</th></tr></thead><tbody>
    ${engines.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</tbody></table>
  </div></div>
  <p style="font-size:10.5px;margin-top:12px"><b>How to read the scores.</b> The report keeps four measures apart: access checks (pass or fail), the AI Search Readiness Index (out of 100, with a range), how often AI answers actually name you, and AI visits in your analytics. Terms are explained on the last page. Scores use four bands:</p>
  <div class="legend" style="margin-top:6px">${bandsRow}</div></section>`;
}

export const checks = (items, cls = '') => `<div class="checks">${items.map((i) =>
  `<div class="chk ${cls}"><div class="ic">${checkSvg}</div><div><h4>${esc(i.title)}</h4><p>${md(i.text)}</p></div></div>`).join('')}</div>`;

export const statStrip = (stats) => `<div class="stats${stats.length === 3 ? ' three' : ''}">${stats.map((s) =>
  `<div class="stat"><div class="n">${s.from != null ? `<span>${esc(s.from)}</span><i>→</i>` : ''}${esc(s.to)}</div><div class="l">${md(s.label)}</div></div>`).join('')}</div>`;

/** Waffle of finding counts. groups: [{n, label, colour}] */
export function waffle(groups) {
  const total = groups.reduce((a, g) => a + g.n, 0);
  const cols = Math.min(Math.max(total, 24), 40);
  return `<div class="waffle" style="grid-template-columns:repeat(${cols},1fr)">${groups.map((g) => `<i style="background:${g.colour}"></i>`.repeat(g.n)).join('')}</div>
  <div class="wleg" style="grid-template-columns:repeat(${groups.length},1fr)">${groups.map((g) =>
    `<div style="border-color:${g.colour}"><div class="n">${g.n}</div><div class="l">${esc(g.label)}</div></div>`).join('')}</div>`;
}

export const progRows = (rows) => rows.map((r) => `<div class="prog"><div><h4>${esc(r.area)}</h4><div class="bar2"><i style="width:${r.progress}%"></i></div></div>
  <div class="two"><div><b style="color:${C.tealD}">Done</b>${md(r.done)}</div><div><b style="color:#9a5121">Left</b>${md(r.left)}</div></div></div>`).join('');

export const dotList = (items, colour) => `<ul class="ol" style="--c:${colour}">${items.map((i) =>
  `<li><div><b>${esc(i.area)}</b><br>${md(i.detail)}</div></li>`).join('')}</ul>`;

/** Numbered steps with an effort bar on a log scale. step: {title, detail, hours (0 = ongoing), effort, tag?: {text, kind}} */
export function steps(list) {
  const lg = (h) => (h ? Math.min(100, (Math.log(h + 1) / Math.log(33)) * 100) : 100);
  return list.map((s, i) => `<div class="step"><div class="no">${String(i + 1).padStart(2, '0')}</div>
    <div><h4>${esc(s.title)} ${s.tag ? `<span class="pill p-${s.tag.kind || 'teal'}">${esc(s.tag.text)}</span>` : ''}</h4><p>${md(s.detail)}</p></div>
    <div><div class="eff">${esc(s.effort)}</div><div class="effbar"><i class="${s.hours ? '' : 'ongoing'}" style="width:${lg(s.hours)}%"></i></div></div></div>`).join('');
}

/** 30/60/90 swimlane. lanes: [{name, colour, cells: [[items]|null x3]}]; an item starting with "!" is a threshold fix. */
export function swimlane(lanes) {
  let h = '<div></div>' + [['Days 1–30', 'Foundation'], ['Days 31–60', 'Build'], ['Days 61–90', 'Compound']]
    .map(([d, k]) => `<div class="ph"><span>${k}</span><b>${d}</b></div>`).join('');
  lanes.forEach((l) => {
    h += `<div class="ln" style="--c:${l.colour}">${esc(l.name)}</div>`;
    l.cells.forEach((cell) => {
      h += cell && cell.length
        ? `<div class="cell" style="--c:${l.colour}"><ul>${cell.map((it) => it.startsWith('!') ? `<li class="key">${esc(it.slice(1))}</li>` : `<li>${esc(it)}</li>`).join('')}</ul></div>`
        : `<div class="cell empty" style="--c:${C.line}">Nothing new planned</div>`;
    });
  });
  return `<div class="swim">${h}</div><p class="src"><span style="display:inline-block;width:7px;height:7px;background:${C.lime};border-radius:50%;margin-right:5px"></span>Threshold fixes. Everything downstream waits on them.</p>`;
}

export const rhythm = (items) => `<div class="rhythm">${items.map((i) => `<div><div class="n">${esc(i.n)}</div><div class="l">${esc(i.l)}</div></div>`).join('')}</div>`;

export const caveats = (items) => items.map((c) => `<div class="caveat"><div class="ic">!</div><div><b>${esc(c.title)}</b> ${md(c.text)}</div></div>`).join('');

export const callout = (text, kind = '') => `<div class="callout ${kind}">${md(text)}</div>`;

/** Signal table with status pills. rows: {signal, finding, status: good|needs|missing|verify} */
export function signalTable(rows) {
  const lab = { good: 'Good', needs: 'Needs attention', missing: 'Missing', verify: 'Verify' };
  return `<table class="data"><thead><tr><th style="width:26%">Signal</th><th>What we found</th><th style="text-align:right">Status</th></tr></thead><tbody>
  ${rows.map((r) => `<tr><td>${esc(r.signal)}</td><td>${md(r.finding)}</td><td class="st"><span class="pill p-${r.status}">${lab[r.status] || esc(r.status)}</span></td></tr>`).join('')}</tbody></table>`;
}

/** Generic table. cols: [{h, k, w?, pill?: (v)=>class}] */
export function table(cols, rows, { groupKey = null } = {}) {
  let last = null;
  const body = rows.map((r) => {
    let g = '';
    if (groupKey && r[groupKey] !== last) { last = r[groupKey]; g = `<tr class="group"><td colspan="${cols.length}">${esc(last)}</td></tr>`; }
    return g + `<tr>${cols.map((c) => {
      const v = r[c.k];
      if (c.pill) return `<td class="st" style="text-align:left"><span class="pill p-${c.pill(v)}">${esc(v)}</span></td>`;
      return `<td${c.mono ? ' class="mono"' : ''}>${md(v)}</td>`;
    }).join('')}</tr>`;
  }).join('');
  return `<table class="data"><thead><tr>${cols.map((c) => `<th${c.w ? ` style="width:${c.w}"` : ''}>${esc(c.h)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
}

/** Plain-words glossary, printed as the last page of every report. */
export function glossary() {
  const terms = [
    ['AI Overview / AI Mode', 'Google’s AI-written answers: a summary above the results, and a separate chat-style search mode.'],
    ['Access check', 'A pass-or-fail test of whether search engines and AI tools can reach and read the site at all.'],
    ['Readiness Index', 'Our 0–100 count of what the site does that the evidence links to being found. A checklist, not a forecast.'],
    ['Unverified range', 'How far the index could move if the things we couldn’t see turned out either way.'],
    ['Judgment range', 'How far the index could move if every “Needs attention” call we made went the other way.'],
    ['Pillar', 'One of the five groups of checks: off-site presence, technical, buyer questions, structured data, page speed.'],
    ['Evidence (on each check)', 'Measured: from a tool or your own data. Observed: we saw it directly. Inferred: a proxy or a judgment call.'],
    ['Source grade (method page)', 'How strong a published figure is. A: platform documentation or peer-reviewed. B: preprints and large studies with published methods. C: small or single-source.'],
    ['Band', 'The word for a score range: Critical, Needs Work, On Track or Strong. Conventional cut points, not calibrated.'],
    ['Provisional', 'The index rests on too much inferred or unconfirmed evidence to be read as firm. The report says why.'],
    ['Design effect', 'How much repeated runs of the same question count for less than truly separate answers.'],
    ['Effective sample', 'The number of fully independent answers the panel is worth once the design effect is allowed for.'],
    ['Smallest detectable change', 'The smallest move in a mention rate the next check could tell apart from noise.'],
    ['Searched the web', 'Answers where the AI tool actually looked online, rather than answering from memory.'],
    ['Mention rate', 'The share of AI answers to buyer questions that name your brand.'],
    ['95% range', 'The span the rate on this question panel likely sits in, allowing for run-to-run and day-to-day variation. It doesn’t cover questions we didn’t ask.'],
    ['Structured data (schema)', 'Code on a page that labels facts (your name, address, prices) so machines read them reliably.'],
    ['sameAs', 'Structured data that links your site to your official profiles elsewhere.'],
    ['Entity', 'How search engines and AI tools recognize your business as one specific thing, with consistent facts.'],
    ['Index', 'A search engine’s stored copy of the web. A page that isn’t in it can’t be shown or cited.'],
    ['Crawler (bot)', 'Software that fetches pages for a search engine or AI tool. robots.txt tells each one what it may fetch.'],
    ['Doorway pages', 'Many near-identical pages made to catch searches (one per city, say). Against Google’s policies.'],
    ['Core Web Vitals', 'Google’s three page-speed measures: loading (LCP), responsiveness (INP) and stability (CLS).'],
  ];
  return `<section class="section">${head('', 'Words used in this report', 'Plain words for *the technical terms*.', null)}
  <table class="data" style="margin-top:14px"><tbody>${terms.map(([a, b]) => `<tr><td style="width:28%">${a}</td><td>${b}</td></tr>`).join('')}</tbody></table></section>`;
}
