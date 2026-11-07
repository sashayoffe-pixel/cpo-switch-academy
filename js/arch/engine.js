/* CPO Switch Academy — Architecture Explorer engine (owner: Agent A). See CONTRACT.md.
 *
 * Renders CPO.arch.nodes as a zoomable drill-down. Section id 'architecture'; sub-route #architecture/<nodeId>.
 *
 * ──────────────────────────────────────────────────────────────────────────────────────────────────────────
 * SCENE API — node.scene(g, api) draws into SVG <g> g (viewBox 0 0 1000 600). api members:
 *   api.node                    the node being drawn
 *   api.W, api.H                1000, 600
 *   api.s(tag, attrs, ...kids)  = CPO.s (SVG element builder)
 *   api.add(tag, attrs, parent?) → element, created with CPO.s and appended to parent (default g)
 *   api.loop(fn)                fn(dt, t) every frame (t = seconds since scene shown). Returns stop().
 *                               Auto-stopped when the user navigates away from the node or leaves the section.
 *                               A throwing fn is removed (logged once) without killing other loops.
 *   api.onCleanup(fn)           run fn when the scene is torn down.
 *   api.color(domainOrName)     → resolved CSS color string (e.g. '#22d3ee'). Accepts domains
 *                               data|optics|power|control|thermal|sensing|mechanical and theme names
 *                               accent|accent2|text|muted|line|panel|panel2|bg|bg2|warn|bad|good|violet.
 *                               Any other string (e.g. '#fff', 'url(#g-copper)') is returned unchanged.
 *   api.rgba(domainOrName, a)   → 'rgba(r,g,b,a)' of that color.
 *   api.go(id)                  navigate to node id (zoom animation if a hotspot leads there).
 *   api.uid(prefix)             unique id string, for your own gradients appended to api.defs.
 *   api.defs                    shared <defs>. Elements you append are removed when the scene is torn down.
 *   api.reduced                 true when prefers-reduced-motion is set.
 *   api.label(x, y, text, opts) → SVG <text>. opts: { size=14, color='text', anchor='start'|'middle'|'end',
 *                               weight, mono (bool), maxChars (wrap into tspans), lineHeight=1.25, opacity,
 *                               domain (sets data-domain), parent, cls, bg (bool: draws a rounded backing
 *                               rect; then the text is wrapped in a <g> = text.parentNode), bgColor, pad }
 *   api.particlesAlong(pathEl, opts) → { group, stop(), set(opts) }  animated dots flowing along any SVG
 *                               geometry element (path/line/polyline). opts: { color='data', count=8,
 *                               speed=120 (user units/s), r=2.6, shape='dot'|'dash', dashLen=14,
 *                               reverse=false, glow=true, fadeEnds=true, jitter=0 (0..1 random spacing),
 *                               domain (data-domain; default copied from pathEl), parent, opacity=1 }
 *                               The group is inserted right after pathEl. set({speed,count?..}) updates live.
 *
 * Shared defs ids (use as url(#id)):
 *   filters : glow (tight), softglow (wide), glow-strong, glow-line (userSpaceOnUse — use on perfectly
 *             horizontal/vertical lines, whose zero-height bbox would make bbox filters vanish), blur4, shadow
 *   linear  : g-silicon, g-die, g-copper, g-gold, g-solder, g-pcb, g-substrate, g-metal, g-coolant,
 *             g-coolant-h (horizontal), g-panel, g-glass, g-heat (cold→hot, horizontal), g-fiber (horizontal)
 *   radial  : r-accent, r-optic, r-data, r-power, r-hot, r-vignette
 *   patterns: p-grid (20u grid), p-dots, p-hatch (diagonal), p-fins (vertical fins)
 *   markers : arrow (muted), arrow-accent, arrow-data, arrow-optics, arrow-power, arrow-control,
 *             arrow-thermal, arrow-sensing, arrow-mechanical   (use marker-end="url(#arrow-data)")
 *
 * Domain overlay: tag elements with data-domain="power" (etc.). When the user enables domain filters,
 * tagged elements of other domains and untagged top-level elements are dimmed.
 * Hotspots: node.hotspots = [{target, x, y, w, h, label}] in scene coordinates; the engine draws them on top.
 * Node without scene(): an auto block diagram of its children (as hotspots) is drawn.
 * ──────────────────────────────────────────────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';
  const C = window.CPO;
  if (!C) return;

  const VW = 1000, VH = 600, FULL = [0, 0, VW, VH];
  const DOMAINS = ['data', 'optics', 'power', 'control', 'thermal', 'sensing', 'mechanical'];
  const DOMAIN_LABEL = { data: 'Data', optics: 'Optics', power: 'Power', control: 'Control', thermal: 'Thermal', sensing: 'Sensing', mechanical: 'Mechanical' };
  const VARMAP = { data: '--data', optics: '--optic', optic: '--optic', power: '--power', control: '--ctrl', ctrl: '--ctrl', thermal: '--therm', therm: '--therm', sensing: '--sense', sense: '--sense', mechanical: '--mech', mech: '--mech' };
  const FALLBACK = { '--data': '#22d3ee', '--optic': '#ff6b3d', '--power': '#facc15', '--ctrl': '#a78bfa', '--therm': '#ff5a36', '--sense': '#f472b6', '--mech': '#94a3b8', '--accent': '#76b900', '--accent2': '#22d3ee', '--text': '#e6edf5', '--muted': '#8a99ad', '--line': '#243042', '--panel': '#111720', '--panel2': '#18202c', '--bg': '#07090c', '--bg2': '#0c1016', '--warn': '#f5b301', '--bad': '#ff4d5e', '--good': '#3ddc84', '--violet': '#a78bfa' };
  const IFACE_COLOR = { electrical: 'data', optical: 'optics', thermal: 'thermal', mgmt: 'control', control: 'control', mechanical: 'mechanical', power: 'power', sensing: 'sensing', data: 'data' };
  const LEVELS = ['System', 'Chassis', 'Package', 'Die / substrate', 'Block', 'Circuit', 'Cell', 'Device'];
  const TABS = [['overview', 'Overview'], ['needs', 'Needs'], ['interfaces', 'Interfaces'], ['kpis', 'KPIs'], ['physics', 'Physics'], ['failures', 'Failure modes'], ['monitoring', 'Monitoring']];

  const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const DUR_ZOOM = reduced ? 1 : 650, DUR_IN = reduced ? 1 : 420, DUR_OUT = reduced ? 1 : 260;
  const easeIO = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const s = C.s, h = C.h, esc = C.esc;

  // ---------- colors ----------
  const colorCache = {};
  function cssVar(name) {
    if (colorCache[name]) return colorCache[name];
    let v = '';
    try { v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); } catch (e) { /* ignore */ }
    return (colorCache[name] = v || FALLBACK[name] || '#76b900');
  }
  function colorOf(c) {
    if (!c) return cssVar('--accent');
    if (VARMAP[c]) return cssVar(VARMAP[c]);
    if (FALLBACK['--' + c]) return cssVar('--' + c);
    return c;
  }
  function rgba(c, a) {
    const col = colorOf(c);
    let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(col);
    if (m) {
      let x = m[1]; if (x.length === 3) x = x.split('').map(ch => ch + ch).join('');
      const n = parseInt(x, 16);
      return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
    }
    m = /^rgba?\(([^)]+)\)$/.exec(col);
    if (m) { const p = m[1].split(',').slice(0, 3).join(','); return 'rgba(' + p + ',' + a + ')'; }
    return col;
  }

  // ---------- node helpers ----------
  const nodes = () => C.arch.nodes;
  const getNode = id => nodes()[id];
  function children(id) { return C.arch.children(id); }
  function chain(id) { // root → id
    const out = []; let n = getNode(id), guard = 0;
    while (n && guard++ < 40) { out.unshift(n); n = n.parent ? getNode(n.parent) : null; }
    return out;
  }
  function chainIds(id) { return chain(id).map(n => n.id); }
  function rootId() {
    if (getNode('system')) return 'system';
    const r = Object.values(nodes()).find(n => !n.parent);
    return r ? r.id : 'system';
  }

  function wrapLines(text, maxChars, maxLines) {
    const words = String(text == null ? '' : text).split(/\s+/).filter(Boolean);
    const lines = []; let cur = '';
    for (const w of words) {
      if (!cur) cur = w;
      else if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w;
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    if (maxLines && lines.length > maxLines) { const l = lines.slice(0, maxLines); l[maxLines - 1] = l[maxLines - 1].replace(/[\s,.;:]*$/, '') + '…'; return l; }
    return lines;
  }

  // ---------- auto layout for nodes without scene ----------
  function autoTargets(node) {
    const ids = children(node.id).map(n => n.id);
    for (const hs of (node.hotspots || [])) if (hs && hs.target && ids.indexOf(hs.target) < 0) ids.push(hs.target);
    return ids;
  }
  function autoHotspots(node) {
    const ids = autoTargets(node), n = ids.length;
    if (!n) return [];
    const cols = Math.min(n, Math.max(1, Math.ceil(Math.sqrt(n * 1.8))));
    const rows = Math.ceil(n / cols), gap = 26, x0 = 60, x1 = 940, y0 = 175, y1 = 565;
    const w = (x1 - x0 - (cols - 1) * gap) / cols;
    const hh = Math.min(170, (y1 - y0 - (rows - 1) * gap) / rows);
    const out = [];
    ids.forEach((id, i) => {
      const r = Math.floor(i / cols), c = i % cols;
      const inRow = r === rows - 1 ? n - r * cols : cols;
      const off = (cols - inRow) * (w + gap) / 2;
      const t = getNode(id);
      out.push({ target: id, x: x0 + off + c * (w + gap), y: y0 + r * (hh + gap), w: w, h: hh, label: t ? t.title : id });
    });
    return out;
  }
  function hotspotsFor(node) {
    if (!node) return [];
    return typeof node.scene === 'function' ? (node.hotspots || []).filter(x => x && x.target) : autoHotspots(node);
  }

  // ---------- shared defs ----------
  function defsMarkup() {
    const c = colorOf;
    const arrow = (id, col) => '<marker id="' + id + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="' + col + '"/></marker>';
    const lin = (id, a, b, x2, y2) => '<linearGradient id="' + id + '" x1="0" y1="0" x2="' + (x2 == null ? 0 : x2) + '" y2="' + (y2 == null ? 1 : y2) + '"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient>';
    const rad = (id, col, a) => '<radialGradient id="' + id + '"><stop offset="0" stop-color="' + col + '" stop-opacity="' + a + '"/><stop offset="1" stop-color="' + col + '" stop-opacity="0"/></radialGradient>';
    const glowF = (id, sd, n, user) => '<filter id="' + id + '" ' + (user ? 'filterUnits="userSpaceOnUse" x="-50" y="-50" width="1100" height="700"' : 'x="-60%" y="-60%" width="220%" height="220%"') +
      '><feGaussianBlur in="SourceGraphic" stdDeviation="' + sd + '" result="b"/><feMerge>' + '<feMergeNode in="b"/>'.repeat(n) + '<feMergeNode in="SourceGraphic"/></feMerge></filter>';
    let m = '';
    m += glowF('glow', 2.2, 1) + glowF('softglow', 5, 1) + glowF('glow-strong', 8, 2) + glowF('glow-line', 2.5, 1, true);
    m += '<filter id="blur4" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>';
    m += '<filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="5" stdDeviation="7" flood-color="#000" flood-opacity=".65"/></filter>';
    m += lin('g-silicon', '#2a3547', '#111824') + lin('g-die', '#1e2d1c', '#0b120d', 1, 1) + lin('g-copper', '#e09a58', '#8a5426') +
      lin('g-gold', '#f7d885', '#b3862a') + lin('g-solder', '#e4e8ee', '#8b939e') + lin('g-pcb', '#11452a', '#062014') +
      lin('g-substrate', '#3d3220', '#1c160d') + lin('g-metal', '#5f6a7b', '#232a35') + lin('g-coolant', '#38bdf8', '#1d4ed8') +
      lin('g-coolant-h', '#1d4ed8', '#38bdf8', 1, 0) + lin('g-panel', '#1a2433', '#0b1017') + lin('g-glass', 'rgba(255,255,255,.16)', 'rgba(255,255,255,.02)') +
      lin('g-fiber', rgba('optics', 0.15), rgba('optics', 0.9), 1, 0);
    m += '<linearGradient id="g-heat" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1d4ed8"/><stop offset=".45" stop-color="#22d3ee"/><stop offset=".7" stop-color="#facc15"/><stop offset="1" stop-color="' + c('thermal') + '"/></linearGradient>';
    m += rad('r-accent', c('accent'), 0.55) + rad('r-optic', c('optics'), 0.7) + rad('r-data', c('data'), 0.6) + rad('r-power', c('power'), 0.6) + rad('r-hot', c('thermal'), 0.75);
    m += '<radialGradient id="r-vignette" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#101a12" stop-opacity=".9"/><stop offset=".6" stop-color="#0a0f14" stop-opacity=".6"/><stop offset="1" stop-color="#05070a" stop-opacity="1"/></radialGradient>';
    m += '<pattern id="p-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="' + rgba('line', 0.55) + '" stroke-width=".6"/></pattern>';
    m += '<pattern id="p-dots" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="1" fill="' + rgba('muted', 0.35) + '"/></pattern>';
    m += '<pattern id="p-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="' + rgba('muted', 0.35) + '" stroke-width="2"/></pattern>';
    m += '<pattern id="p-fins" width="6" height="10" patternUnits="userSpaceOnUse"><rect width="3" height="10" fill="' + rgba('mechanical', 0.45) + '"/></pattern>';
    m += arrow('arrow', c('muted')) + arrow('arrow-accent', c('accent'));
    for (const d of DOMAINS) m += arrow('arrow-' + d, c(d));
    return m;
  }

  // ---------- explorer instance ----------
  let inst = null;

  function createExplorer(container, sub) {
    const st = {
      cur: null, scene: null, history: [], busy: false, pending: null, dead: false,
      tab: 'overview', filters: new Set(), labels: false, treeOpen: false, treeQuery: '',
      fns: [], cleanups: [], sceneT: 0, uid: 0, anims: [], baseDefs: 0
    };
    container.classList.add('arch-section');

    // ----- DOM skeleton -----
    const backBtn = h('button', { class: 'btn arch-btn', title: 'Back (previous node)', onclick: () => goBack() }, '← Back');
    const upBtn = h('button', { class: 'btn arch-btn', title: 'Up one level (Esc)', onclick: () => goUp() }, '↑ Up');
    const crumbs = h('nav', { class: 'arch-crumbs', 'aria-label': 'Breadcrumb' });
    const treeBtn = h('button', { class: 'btn arch-btn', title: 'Show the whole node tree', onclick: () => toggleTree() }, '🗺 Tree');
    const labelBtn = h('button', { class: 'btn arch-btn', title: 'Always show hotspot labels', onclick: () => toggleLabels() }, '🏷 Labels');
    const toolbar = h('div', { class: 'arch-toolbar' }, backBtn, upBtn, crumbs, h('div', { class: 'arch-spacer' }), labelBtn, treeBtn);

    const domBtns = {};
    const allBtn = h('button', { class: 'arch-dom active', onclick: () => { st.filters.clear(); applyFilters(); } }, 'All layers');
    const domainBar = h('div', { class: 'arch-domains' }, h('span', { class: 'arch-domains-lbl' }, 'Overlay'), allBtn,
      DOMAINS.filter(d => d !== 'mechanical').map(d => (domBtns[d] = h('button', {
        class: 'arch-dom', 'data-d': d, style: '--dc:' + colorOf(d),
        title: 'Highlight ' + DOMAIN_LABEL[d].toLowerCase() + ' elements (click several to combine)',
        onclick: () => { if (st.filters.has(d)) st.filters.delete(d); else st.filters.add(d); applyFilters(); }
      }, h('i'), DOMAIN_LABEL[d]))));

    const svg = s('svg', { class: 'arch-svg', viewBox: FULL.join(' '), preserveAspectRatio: 'xMidYMid meet', role: 'img' });
    const defs = s('defs', {});
    defs.innerHTML = defsMarkup();
    st.baseDefs = defs.childNodes.length;
    svg.appendChild(defs);
    svg.appendChild(s('rect', { class: 'arch-bg', x: -2000, y: -2000, width: 5000, height: 4600, fill: 'url(#r-vignette)' }));
    svg.appendChild(s('rect', { class: 'arch-bg-grid', x: -2000, y: -2000, width: 5000, height: 4600, fill: 'url(#p-grid)' }));
    const root = s('g', { class: 'arch-root' });
    svg.appendChild(root);

    const stageTitle = h('div', { class: 'arch-stage-title' });
    const ladder = h('div', { class: 'arch-ladder' }, LEVELS.map((l, i) => h('div', { class: 'arch-rung', 'data-l': i }, h('b', null, String(i)), h('span', null, l))));
    const hint = h('div', { class: 'arch-hint' }, 'Click a glowing region to zoom in · Esc = up · overlays dim other domains');
    const toast = h('div', { class: 'arch-toast' });
    const treeSearch = h('input', { type: 'search', class: 'arch-tree-search', placeholder: 'Filter nodes…', oninput: e => { st.treeQuery = e.target.value; renderTree(); } });
    const treeBody = h('div', { class: 'arch-tree-body' });
    const tree = h('div', { class: 'arch-tree' },
      h('div', { class: 'arch-tree-head' }, h('b', null, 'Node tree'), h('button', { class: 'arch-x', title: 'Close', onclick: () => toggleTree(false) }, '×')),
      treeSearch, treeBody);
    const stage = h('div', { class: 'arch-stage' }, svg, stageTitle, ladder, hint, toast, tree);

    const panelHead = h('div', { class: 'arch-phead' });
    const tabsEl = h('div', { class: 'tabs arch-tabs' });
    const panelBody = h('div', { class: 'arch-pbody' });
    const panel = h('aside', { class: 'arch-panel card' }, panelHead, tabsEl, panelBody);

    container.appendChild(h('div', { class: 'arch-head' },
      h('h1', null, 'Architecture Explorer'),
      h('p', { class: 'h-sub' }, 'Drill down from the AI-factory network to the transistor. Every block answers: what it does, what it needs, its interfaces, KPIs, physics, failure modes and how it is monitored.')));
    container.appendChild(toolbar);
    container.appendChild(domainBar);
    container.appendChild(h('div', { class: 'arch-main' }, stage, panel));

    // ----- master animation ticker -----
    const stopTicker = C.loop(dt => {
      st.sceneT += dt;
      const fns = st.fns;
      for (let i = 0; i < fns.length; i++) {
        const f = fns[i];
        if (f.dead) continue;
        try { f.fn(dt, st.sceneT); } catch (e) { f.dead = true; console.warn('arch: scene loop error in', st.cur && st.cur.id, e); }
      }
    });

    // ----- tweens -----
    function tween(dur, step, done) {
      const a = { dead: false, id: 0 };
      let t0 = null;
      const f = now => {
        if (a.dead || st.dead) return;
        if (t0 == null) t0 = now;
        const p = Math.min(1, (now - t0) / dur);
        try { step(p); } catch (e) { console.warn(e); }
        if (p < 1) a.id = requestAnimationFrame(f);
        else { st.anims = st.anims.filter(x => x !== a); if (done) done(); }
      };
      a.id = requestAnimationFrame(f);
      st.anims.push(a);
      return a;
    }
    function setVB(v) { svg.setAttribute('viewBox', v.map(x => +x.toFixed(2)).join(' ')); }
    function lerpVB(a, b, t) { return [0, 1, 2, 3].map(i => a[i] + (b[i] - a[i]) * t); }
    function fitRect(r) {
      const pad = 0.08;
      let w = r.w * (1 + pad * 2), hh = r.h * (1 + pad * 2);
      const ar = VW / VH;
      if (w / hh > ar) hh = w / ar; else w = hh * ar;
      w = Math.max(w, 60); hh = w / ar;
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      return [cx - w / 2, cy - hh / 2, w, hh];
    }
    function setWrap(wrap, opacity, scale) {
      wrap.style.opacity = opacity;
      if (scale == null || Math.abs(scale - 1) < 1e-4) wrap.removeAttribute('transform');
      else wrap.setAttribute('transform', 'translate(500 300) scale(' + scale.toFixed(4) + ') translate(-500 -300)');
    }

    // ----- scene mount / teardown -----
    function destroyScene() {
      for (const f of st.fns) f.dead = true;
      st.fns = [];
      for (const fn of st.cleanups) { try { fn(); } catch (e) { console.warn(e); } }
      st.cleanups = [];
      if (st.scene && st.scene.wrap.parentNode) st.scene.wrap.parentNode.removeChild(st.scene.wrap);
      st.scene = null;
      while (defs.childNodes.length > st.baseDefs) defs.removeChild(defs.lastChild);
    }

    function makeApi(g, node) {
      const api = {
        node: node, W: VW, H: VH, s: s, defs: defs, reduced: reduced,
        add(tag, attrs, parent) { const el = s(tag, attrs || {}); (parent || g).appendChild(el); return el; },
        loop(fn) { const rec = { fn: fn, dead: false }; st.fns.push(rec); return () => { rec.dead = true; }; },
        onCleanup(fn) { if (typeof fn === 'function') st.cleanups.push(fn); },
        color: colorOf, rgba: rgba,
        go(id) { navTo(id); },
        uid(p) { return (p || 'u') + '-' + (++st.uid); },
        label(x, y, text, o) { return makeLabel(g, x, y, text, o || {}); },
        particlesAlong(path, o) { return particles(g, api, path, o || {}); }
      };
      return api;
    }

    function makeLabel(g, x, y, text, o) {
      const size = o.size || 14, lh = (o.lineHeight || 1.25) * size;
      const lines = o.maxChars ? wrapLines(text, o.maxChars) : String(text).split('\n');
      const t = s('text', {
        x: x, y: y, 'font-size': size, fill: colorOf(o.color || 'text'), 'text-anchor': o.anchor || 'start',
        'font-weight': o.weight || null, 'font-family': o.mono ? 'ui-monospace, Consolas, monospace' : null,
        opacity: o.opacity != null ? o.opacity : null, class: 'arch-lbl' + (o.cls ? ' ' + o.cls : ''),
        'data-domain': o.domain || null
      });
      if (lines.length <= 1) t.textContent = lines[0] || '';
      else lines.forEach((ln, i) => t.appendChild(s('tspan', { x: x, dy: i ? lh : 0 }, ln)));
      let parent = o.parent || g;
      if (o.bg) {
        const pad = o.pad != null ? o.pad : 5;
        const maxLen = Math.max.apply(null, lines.map(l => l.length));
        const w = maxLen * size * (o.mono ? 0.62 : 0.56) + pad * 2, hh = lh * (lines.length - 1) + size * 1.15 + pad * 2;
        const anchor = o.anchor || 'start';
        const bx = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x - pad;
        const grp = s('g', { class: 'arch-lbl-g', 'data-domain': o.domain || null });
        grp.appendChild(s('rect', { x: bx, y: y - size * 0.95 - pad, width: w, height: hh, rx: 5, fill: o.bgColor || 'rgba(7,10,14,.78)', stroke: o.bgStroke || rgba('line', 0.9) }));
        t.removeAttribute('data-domain');
        grp.appendChild(t);
        parent.appendChild(grp);
      } else parent.appendChild(t);
      return t;
    }

    function particles(g, api, path, o) {
      const count = Math.max(1, o.count || 8);
      const col = colorOf(o.color || 'data');
      const grp = s('g', { class: 'arch-particles', 'pointer-events': 'none', opacity: o.opacity != null ? o.opacity : null });
      const dom = o.domain || (path.getAttribute && path.getAttribute('data-domain'));
      if (dom) grp.setAttribute('data-domain', dom);
      if (o.glow !== false) grp.setAttribute('filter', 'url(#glow)');
      const dash = o.shape === 'dash';
      const r = o.r || 2.6;
      let dots = [], phases = [];
      function build(n) {
        while (grp.firstChild) grp.removeChild(grp.firstChild);
        dots = []; phases = [];
        for (let i = 0; i < n; i++) {
          const el = dash ? s('line', { stroke: col, 'stroke-width': r * 1.3, 'stroke-linecap': 'round' }) : s('circle', { r: r, fill: col });
          grp.appendChild(el); dots.push(el);
          phases.push((i + (o.jitter ? (Math.random() - 0.5) * o.jitter : 0)) / n);
        }
      }
      build(count);
      let attached = false, L = 0, off = Math.random() * 500, first = true;
      function attach() {
        if (attached) return;
        const par = o.parent || path.parentNode || g;
        if (path.parentNode === par) par.insertBefore(grp, path.nextSibling); else par.appendChild(grp);
        attached = true;
        if (st.filters.size && st.scene) applyDim();
      }
      if (path.parentNode && !o.parent) attach();
      const fn = dt => {
        if (!attached) attach();
        if (!L) { try { L = path.getTotalLength(); } catch (e) { L = 0; } if (!L) return; }
        if (reduced && !first) return;
        first = false;
        off += dt * (o.speed != null ? o.speed : 120) * (o.reverse ? -1 : 1);
        const dl = o.dashLen || 14;
        for (let i = 0; i < dots.length; i++) {
          const d = (((phases[i] * L + off) % L) + L) % L;
          const p = path.getPointAtLength(d);
          const el = dots[i];
          if (dash) {
            const q = path.getPointAtLength(o.reverse ? Math.min(L, d + dl) : Math.max(0, d - dl));
            el.setAttribute('x1', p.x.toFixed(1)); el.setAttribute('y1', p.y.toFixed(1));
            el.setAttribute('x2', q.x.toFixed(1)); el.setAttribute('y2', q.y.toFixed(1));
          } else { el.setAttribute('cx', p.x.toFixed(1)); el.setAttribute('cy', p.y.toFixed(1)); }
          if (o.fadeEnds !== false) el.setAttribute('opacity', Math.min(1, d / 18, (L - d) / 18).toFixed(2));
        }
      };
      const stop = api.loop(fn);
      return {
        group: grp,
        stop() { stop(); if (grp.parentNode) grp.parentNode.removeChild(grp); },
        set(n) { if (!n) return; const oldCount = o.count; Object.assign(o, n); if (n.count && n.count !== oldCount) build(n.count); if (n.color) dots.forEach(d => d.setAttribute(dash ? 'stroke' : 'fill', colorOf(n.color))); }
      };
    }

    function drawError(g, e) {
      g.appendChild(s('rect', { x: 200, y: 200, width: 600, height: 200, rx: 14, fill: 'rgba(255,77,94,.08)', stroke: colorOf('bad'), 'stroke-dasharray': '8 6' }));
      g.appendChild(s('text', { x: 500, y: 280, 'text-anchor': 'middle', fill: colorOf('bad'), 'font-size': 22, 'font-weight': 700 }, '⚠ Scene failed to render'));
      g.appendChild(s('text', { x: 500, y: 315, 'text-anchor': 'middle', fill: colorOf('muted'), 'font-size': 14 }, String((e && e.message) || e).slice(0, 90)));
      g.appendChild(s('text', { x: 500, y: 345, 'text-anchor': 'middle', fill: colorOf('muted'), 'font-size': 13 }, 'The information panel still works → use the tabs and the Children list.'));
    }

    function drawAuto(g, node, api, hs) {
      const dc = colorOf(node.domain);
      const head = s('g', { 'data-domain': node.domain || null });
      head.appendChild(s('rect', { x: 250, y: 30, width: 500, height: 92, rx: 14, fill: 'url(#g-panel)', stroke: dc, 'stroke-width': 1.5, filter: 'url(#shadow)' }));
      head.appendChild(s('circle', { cx: 500, cy: 76, r: 120, fill: 'url(#r-accent)', opacity: 0.25 }));
      head.appendChild(s('text', { x: 500, y: 70, 'text-anchor': 'middle', 'font-size': 24, 'font-weight': 700, fill: colorOf('text') }, node.title || node.id));
      head.appendChild(s('text', { x: 500, y: 100, 'text-anchor': 'middle', 'font-size': 14, fill: colorOf('muted') }, wrapLines(node.subtitle || '', 64, 1)[0] || ''));
      g.appendChild(head);
      if (!hs.length) {
        const lines = wrapLines(node.summary || 'Leaf node — see the information panel for details.', 70, 7);
        const leaf = s('g', { 'data-domain': node.domain || null });
        leaf.appendChild(s('circle', { cx: 500, cy: 340, r: 190, fill: 'url(#r-accent)', opacity: 0.18 }));
        leaf.appendChild(s('rect', { x: 170, y: 200, width: 660, height: 60 + lines.length * 24, rx: 14, fill: 'rgba(17,23,32,.85)', stroke: dc }));
        const t = s('text', { x: 500, y: 240, 'text-anchor': 'middle', 'font-size': 16, fill: colorOf('text') });
        lines.forEach((l, i) => t.appendChild(s('tspan', { x: 500, dy: i ? 24 : 0 }, l)));
        leaf.appendChild(t);
        g.appendChild(leaf);
        const ring = s('circle', { cx: 500, cy: 76, r: 52, fill: 'none', stroke: dc, 'stroke-width': 1.2, opacity: 0.5 });
        g.appendChild(ring);
        api.loop((dt, t2) => { const k = (t2 * 0.6) % 1; ring.setAttribute('r', 46 + k * 160); ring.setAttribute('opacity', (0.5 * (1 - k)).toFixed(3)); });
        return;
      }
      for (const b of hs) {
        const t = getNode(b.target), dom = t ? t.domain : 'mechanical', col = colorOf(dom);
        const grp = s('g', { 'data-domain': dom });
        const p = s('path', { d: 'M500 122 C 500 ' + (b.y - 30) + ', ' + (b.x + b.w / 2) + ' ' + (122 + 20) + ', ' + (b.x + b.w / 2) + ' ' + b.y, fill: 'none', stroke: rgba(dom, 0.45), 'stroke-width': 1.4 });
        grp.appendChild(p);
        grp.appendChild(s('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 12, fill: 'url(#g-panel)', stroke: rgba(dom, 0.8), 'stroke-width': 1.3, 'stroke-dasharray': t ? null : '6 5' }));
        grp.appendChild(s('rect', { x: b.x, y: b.y, width: 5, height: b.h, rx: 2, fill: col }));
        const maxC = Math.max(10, Math.floor(b.w / 9.5));
        const tl = wrapLines(t ? t.title : b.target, maxC, 2);
        const tt = s('text', { x: b.x + 16, y: b.y + 28, 'font-size': 16, 'font-weight': 700, fill: colorOf('text') });
        tl.forEach((l, i) => tt.appendChild(s('tspan', { x: b.x + 16, dy: i ? 19 : 0 }, l)));
        grp.appendChild(tt);
        if (t && b.h > 70) {
          const sl = wrapLines(t.subtitle || t.summary || '', Math.floor(b.w / 7.4), Math.max(1, Math.floor((b.h - 40 - tl.length * 19) / 17)));
          const stx = s('text', { x: b.x + 16, y: b.y + 34 + tl.length * 19, 'font-size': 12.5, fill: colorOf('muted') });
          sl.forEach((l, i) => stx.appendChild(s('tspan', { x: b.x + 16, dy: i ? 17 : 0 }, l)));
          grp.appendChild(stx);
        }
        g.appendChild(grp);
        api.particlesAlong(p, { color: dom, count: 3, speed: 70, r: 2.2 });
      }
    }

    function drawHotspots(wrap, list) {
      const layer = s('g', { class: 'arch-hs-layer' });
      for (const hs of list) {
        const t = getNode(hs.target), ok = !!t, dom = ok ? (t.domain || 'mechanical') : 'mechanical', col = colorOf(dom);
        const label = (hs.label || (t ? t.title : hs.target)) + (ok ? '' : ' · coming soon');
        const gg = s('g', { class: 'arch-hs' + (ok ? '' : ' arch-hs-missing'), 'data-domain': dom, 'data-target': hs.target, tabindex: ok ? 0 : -1, role: 'button', 'aria-label': label, style: '--hc:' + col });
        const x = +hs.x, y = +hs.y, w = +hs.w, hh = +hs.h, rx = Math.min(10, w / 4, hh / 4);
        gg.appendChild(s('rect', { class: 'arch-hs-fill', x: x, y: y, width: w, height: hh, rx: rx, fill: col }));
        gg.appendChild(s('rect', { class: 'arch-hs-frame', x: x, y: y, width: w, height: hh, rx: rx, fill: 'none', stroke: col }));
        const k = Math.max(6, Math.min(16, Math.min(w, hh) * 0.28));
        const br = 'M' + x + ' ' + (y + k) + 'V' + y + 'H' + (x + k) + 'M' + (x + w - k) + ' ' + y + 'H' + (x + w) + 'V' + (y + k) +
          'M' + (x + w) + ' ' + (y + hh - k) + 'V' + (y + hh) + 'H' + (x + w - k) + 'M' + (x + k) + ' ' + (y + hh) + 'H' + x + 'V' + (y + hh - k);
        gg.appendChild(s('path', { class: 'arch-hs-br', d: br, fill: 'none', stroke: col }));
        const cr = Math.max(5, Math.min(9, Math.min(w, hh) * 0.12));
        const pg = s('g', { class: 'arch-hs-plus' });
        pg.appendChild(s('circle', { cx: x + w - cr - 3, cy: y + cr + 3, r: cr, fill: 'rgba(5,8,11,.85)', stroke: col }));
        pg.appendChild(s('path', { d: 'M' + (x + w - cr - 3 - cr * 0.5) + ' ' + (y + cr + 3) + 'h' + cr + 'M' + (x + w - cr - 3) + ' ' + (y + cr + 3 - cr * 0.5) + 'v' + cr, stroke: col, 'stroke-width': 1.4 }));
        gg.appendChild(pg);
        // label
        const fs = 13, lw = label.length * fs * 0.58 + 16, lh = 22;
        let lx = x + w / 2 - lw / 2, ly = y - lh - 5;
        if (ly < 4) ly = y + hh + 5;
        if (ly + lh > VH - 2) ly = y + 4;
        lx = Math.max(4, Math.min(VW - lw - 4, lx));
        const lg = s('g', { class: 'arch-hs-label' });
        lg.appendChild(s('rect', { x: lx, y: ly, width: lw, height: lh, rx: 6, fill: 'rgba(5,8,11,.92)', stroke: col }));
        lg.appendChild(s('text', { x: lx + lw / 2, y: ly + 15, 'text-anchor': 'middle', 'font-size': fs, fill: ok ? colorOf('text') : colorOf('muted'), 'font-weight': 600 }, label));
        gg.appendChild(lg);
        gg.appendChild(s('rect', { class: 'arch-hs-hit', x: x, y: y, width: w, height: hh, fill: 'transparent' }));
        gg.addEventListener('click', e => { e.stopPropagation(); clickHotspot(hs, gg); });
        gg.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clickHotspot(hs, gg); } });
        layer.appendChild(gg);
      }
      wrap.appendChild(layer);
      return layer;
    }

    function clickHotspot(hs, el) {
      if (!getNode(hs.target)) { showToast('“' + (hs.label || hs.target) + '” — coming soon (node not authored yet)'); el.classList.add('arch-hs-shake'); setTimeout(() => el.classList.remove('arch-hs-shake'), 500); return; }
      navTo(hs.target);
    }

    function mountScene(node) {
      destroyScene();
      st.sceneT = 0;
      const wrap = s('g', { class: 'arch-scene', 'data-node': node ? node.id : '' });
      const g = s('g', { class: 'arch-scene-content' });
      wrap.appendChild(g);
      root.appendChild(wrap);
      let hs = [];
      if (!node) {
        drawError(g, { message: 'Node not found.' });
      } else {
        const api = makeApi(g, node);
        if (typeof node.scene === 'function') {
          try { node.scene(g, api); }
          catch (e) {
            console.error('arch: scene error in', node.id, e);
            for (const f of st.fns) f.dead = true;
            st.fns = [];
            while (g.firstChild) g.removeChild(g.firstChild);
            drawError(g, e);
          }
          hs = hotspotsFor(node);
        } else {
          hs = autoHotspots(node);
          try { drawAuto(g, node, api, hs); } catch (e) { console.error(e); drawError(g, e); }
        }
      }
      const layer = drawHotspots(wrap, hs);
      st.scene = { wrap: wrap, g: g, hotspots: hs, layer: layer, id: node ? node.id : null };
      applyDim();
      return st.scene;
    }

    // ----- domain overlay -----
    function applyFilters() {
      allBtn.classList.toggle('active', !st.filters.size);
      for (const d in domBtns) domBtns[d].classList.toggle('active', st.filters.has(d));
      stage.classList.toggle('arch-filter', st.filters.size > 0);
      applyDim();
    }
    function applyDim() {
      if (!st.scene) return;
      const g = st.scene.g, on = st.filters.size > 0, F = st.filters;
      g.querySelectorAll('.arch-dim,.arch-dim-soft').forEach(el => el.classList.remove('arch-dim', 'arch-dim-soft'));
      st.scene.layer.querySelectorAll('.arch-hs').forEach(el => el.classList.toggle('arch-dim', on && !F.has(el.getAttribute('data-domain'))));
      if (!on) return;
      const matches = el => (el.getAttribute('data-domain') || '').split(/\s+/).some(d => F.has(d));
      (function walk(el) {
        for (const ch of Array.from(el.children)) {
          const tag = ch.tagName.toLowerCase();
          if (tag === 'defs' || tag === 'lineargradient' || tag === 'radialgradient' || tag === 'filter' || tag === 'clippath' || tag === 'mask' || tag === 'marker' || tag === 'pattern') continue;
          if (ch.hasAttribute('data-domain')) { if (matches(ch)) walk(ch); else ch.classList.add('arch-dim'); }
          else if (ch.querySelector('[data-domain]')) walk(ch);
          else if (tag !== 'tspan') ch.classList.add('arch-dim-soft');
        }
      })(g);
    }

    // ----- panel -----
    function renderPanel(node) {
      panelHead.innerHTML = ''; tabsEl.innerHTML = ''; panelBody.innerHTML = '';
      if (!node) {
        panelHead.appendChild(h('h2', null, 'Node not found'));
        panelBody.appendChild(h('p', { class: 'muted' }, 'No node with this id. ', h('a', { href: '#architecture/' + rootId() }, 'Go to the system view')));
        return;
      }
      const dom = node.domain || 'mechanical';
      panelHead.appendChild(h('div', { class: 'arch-pmeta' },
        h('span', { class: 'arch-dpill', style: '--dc:' + colorOf(dom) }, h('i'), DOMAIN_LABEL[dom] || dom),
        node.level != null ? h('span', { class: 'pill' }, 'L' + node.level + ' · ' + (LEVELS[node.level] || '')) : null,
        h('code', { class: 'arch-id' }, node.id)));
      panelHead.appendChild(h('h2', { class: 'arch-ptitle' }, node.title || node.id));
      if (node.subtitle) panelHead.appendChild(h('div', { class: 'arch-psub muted' }, node.subtitle));
      const has = {
        overview: true,
        needs: !!(node.needs && node.needs.length), interfaces: !!(node.interfaces && node.interfaces.length),
        kpis: !!(node.kpis && node.kpis.length), physics: !!node.physics,
        failures: !!(node.failures && node.failures.length), monitoring: !!(node.monitoring && node.monitoring.length)
      };
      if (!has[st.tab]) st.tab = 'overview';
      const count = { needs: node.needs, interfaces: node.interfaces, kpis: node.kpis, failures: node.failures, monitoring: node.monitoring };
      for (const [k, lbl] of TABS) {
        const n = count[k] ? count[k].length : 0;
        tabsEl.appendChild(h('div', {
          class: 'tab' + (st.tab === k ? ' active' : '') + (has[k] ? '' : ' arch-tab-empty'), role: 'tab', tabindex: 0,
          onclick: () => { st.tab = k; renderPanel(node); },
          onkeydown: e => { if (e.key === 'Enter') { st.tab = k; renderPanel(node); } }
        }, lbl, n ? h('sup', null, String(n)) : null));
      }
      const b = panelBody;
      try {
        if (st.tab === 'overview') renderOverview(b, node);
        else if (!has[st.tab]) b.appendChild(h('p', { class: 'muted' }, 'No content for this tab yet.'));
        else if (st.tab === 'needs') b.appendChild(h('ul', { class: 'arch-list arch-needs' }, node.needs.map(x => h('li', { html: x }))));
        else if (st.tab === 'interfaces') renderIfaces(b, node);
        else if (st.tab === 'kpis') renderKpis(b, node);
        else if (st.tab === 'physics') b.appendChild(h('div', { class: 'arch-html', html: node.physics }));
        else if (st.tab === 'failures') renderFailures(b, node);
        else if (st.tab === 'monitoring') b.appendChild(h('ul', { class: 'arch-list arch-mon' }, node.monitoring.map(x => h('li', { html: x }))));
      } catch (e) { console.error(e); b.appendChild(h('div', { class: 'callout warn' }, 'Panel failed: ' + e.message)); }
      b.scrollTop = 0; panel.scrollTop = 0;
      try { C.linkify(panel); } catch (e) { /* ignore */ }
    }
    function nodeLink(t, extra) {
      const dom = t.domain || 'mechanical';
      return h('a', { class: 'arch-child', href: '#architecture/' + t.id, style: '--dc:' + colorOf(dom), onclick: e => { e.preventDefault(); navTo(t.id); } },
        h('i'), h('div', null, h('b', null, t.title || t.id), t.subtitle ? h('small', null, t.subtitle) : null), h('span', { class: 'arch-go' }, extra || '⤢'));
    }
    function renderOverview(b, node) {
      if (node.summary) b.appendChild(h('p', { class: 'arch-summary', html: node.summary }));
      if (node.what) b.appendChild(h('div', { class: 'arch-html', html: node.what }));
      const kids = children(node.id);
      const kidIds = kids.map(k => k.id);
      const extra = [];
      for (const hs of hotspotsFor(node)) if (kidIds.indexOf(hs.target) < 0 && extra.indexOf(hs.target) < 0 && hs.target !== node.id) extra.push(hs.target);
      if (kids.length) {
        b.appendChild(h('h3', null, 'Children — zoom deeper'));
        b.appendChild(h('div', { class: 'arch-children' }, kids.map(k => nodeLink(k))));
      }
      const extraNodes = extra.map(getNode).filter(Boolean);
      const missing = extra.filter(id => !getNode(id));
      if (extraNodes.length) {
        b.appendChild(h('h3', null, 'Also reachable from this view'));
        b.appendChild(h('div', { class: 'arch-children' }, extraNodes.map(k => nodeLink(k))));
      }
      if (missing.length) b.appendChild(h('p', { class: 'muted arch-small' }, 'Coming soon: ' + missing.join(', ')));
      b.appendChild(h('div', { class: 'callout arch-zoomhint' }, (kids.length || extraNodes.length)
        ? '🔍 Zoom deeper: click a glowing region in the diagram (or a child above). Esc / ↑ Up zooms back out.'
        : '🧩 This is the deepest level in this branch. Use ↑ Up or the breadcrumb to zoom back out, or 🗺 Tree to jump elsewhere.'));
    }
    function renderIfaces(b, node) {
      const rows = node.interfaces.map(i => {
        const ty = String(i.type || '').toLowerCase(), cd = IFACE_COLOR[ty] || 'mechanical';
        const w = String(i.with || '');
        const t = getNode(w.trim());
        return h('tr', null,
          h('td', null, t ? h('a', { href: '#architecture/' + t.id, onclick: e => { e.preventDefault(); navTo(t.id); } }, t.title) : h('span', { html: esc(w) })),
          h('td', null, h('span', { class: 'arch-type', style: '--dc:' + colorOf(cd) }, i.type || '—')),
          h('td', { html: i.detail || '' }));
      });
      b.appendChild(h('table', { class: 'table arch-iface' }, h('thead', null, h('tr', null, h('th', null, 'With'), h('th', null, 'Type'), h('th', null, 'Detail'))), h('tbody', null, rows)));
    }
    function renderKpis(b, node) {
      b.appendChild(h('div', { class: 'arch-kpis' }, node.kpis.map(k => h('div', { class: 'arch-kpi' },
        h('div', { class: 'arch-kpi-name' }, h('span', { html: k.name || '' }), k.tag ? h('span', { html: ' ' + C.badge(k.tag) }) : null),
        h('div', { class: 'arch-kpi-val', html: k.value || '' }),
        k.note ? h('div', { class: 'arch-kpi-note', html: k.note }) : null))));
      b.appendChild(h('p', { class: 'muted arch-small', html: C.badge('nv') + ' = announced by NVIDIA publicly · ' + C.badge('typ') + ' = industry-typical · ' + C.badge('est') + ' = engineering estimate' }));
    }
    function renderFailures(b, node) {
      b.appendChild(h('div', { class: 'arch-fails' }, node.failures.map(f => {
        const parts = String(f).split(/\s*(?:→|->)\s*/);
        const cls = ['arch-f-mode', 'arch-f-eff', 'arch-f-mit'];
        return h('div', { class: 'arch-fail' }, parts.map((p, i) => [i ? h('span', { class: 'arch-f-arrow' }, '→') : null,
          h('span', { class: cls[Math.min(i, 2)] + (i === parts.length - 1 && i > 0 ? ' arch-f-mit' : ''), html: p })]));
      })));
      b.appendChild(h('p', { class: 'muted arch-small' }, 'Format: failure mode → effect → mitigation.'));
    }

    // ----- breadcrumb / title / ladder / tree -----
    function renderChrome(node) {
      crumbs.innerHTML = '';
      const ch = node ? chain(node.id) : [];
      ch.forEach((n, i) => {
        if (i) crumbs.appendChild(h('span', { class: 'arch-sep' }, '›'));
        crumbs.appendChild(i === ch.length - 1
          ? h('span', { class: 'arch-crumb cur', style: '--dc:' + colorOf(n.domain) }, n.title || n.id)
          : h('a', { class: 'arch-crumb', href: '#architecture/' + n.id, style: '--dc:' + colorOf(n.domain), onclick: e => { e.preventDefault(); navTo(n.id); } }, n.title || n.id));
      });
      upBtn.disabled = !(node && node.parent && getNode(node.parent));
      backBtn.disabled = !st.history.length;
      stageTitle.innerHTML = '';
      if (node) {
        stageTitle.style.setProperty('--dc', colorOf(node.domain));
        stageTitle.appendChild(h('i'));
        stageTitle.appendChild(h('div', null, h('b', null, node.title || node.id), node.subtitle ? h('small', null, node.subtitle) : null));
      }
      // Show the full label briefly, then shrink it (and fade the hint) so it doesn't cover the diagram.
      stageTitle.classList.remove('mini'); hint.classList.remove('gone');
      clearTimeout(st.miniTimer);
      st.miniTimer = setTimeout(() => { stageTitle.classList.add('mini'); hint.classList.add('gone'); }, 2500);
      const lv = node && node.level != null ? Math.min(7, Math.max(0, node.level)) : -1;
      ladder.querySelectorAll('.arch-rung').forEach(r => { const l = +r.dataset.l; r.classList.toggle('on', l === lv); r.classList.toggle('past', l < lv); });
      if (st.treeOpen) renderTree();
    }
    function renderTree() {
      treeBody.innerHTML = '';
      const all = Object.values(nodes());
      const q = st.treeQuery.trim().toLowerCase();
      const curChain = st.cur ? chainIds(st.cur.id) : [];
      const item = (n, depth, kids) => h('div', { class: 'arch-ti' + (st.cur && st.cur.id === n.id ? ' cur' : ''), style: 'padding-left:' + (6 + depth * 14) + 'px;--dc:' + colorOf(n.domain) },
        kids ? h('span', { class: 'arch-caret' }, '▾') : h('span', { class: 'arch-caret' }, ''),
        h('a', { href: '#architecture/' + n.id, onclick: e => { e.preventDefault(); navTo(n.id); } }, h('i'), n.title || n.id));
      if (q) {
        const m = all.filter(n => (n.id + ' ' + (n.title || '') + ' ' + (n.subtitle || '')).toLowerCase().indexOf(q) >= 0);
        if (!m.length) treeBody.appendChild(h('div', { class: 'muted arch-small' }, 'No match.'));
        m.forEach(n => treeBody.appendChild(item(n, 0, false)));
        return;
      }
      const byParent = {};
      for (const n of all) { const p = n.parent && getNode(n.parent) ? n.parent : '__root'; (byParent[p] = byParent[p] || []).push(n); }
      const seen = {};
      function rec(n, depth, parentEl) {
        if (seen[n.id]) return; seen[n.id] = 1;
        const kids = byParent[n.id] || [];
        const wrapEl = h('div', { class: 'arch-tnode' + (depth > 1 && curChain.indexOf(n.id) < 0 && kids.length ? ' collapsed' : '') });
        const it = item(n, depth, kids.length);
        if (kids.length) it.firstChild.onclick = () => wrapEl.classList.toggle('collapsed');
        wrapEl.appendChild(it);
        const kc = h('div', { class: 'arch-tkids' });
        kids.forEach(k => rec(k, depth + 1, kc));
        wrapEl.appendChild(kc);
        parentEl.appendChild(wrapEl);
      }
      const roots = (byParent.__root || []).slice().sort((a, b) => (a.id === 'system' ? -1 : b.id === 'system' ? 1 : 0));
      roots.forEach(r => rec(r, 0, treeBody));
      const curEl = treeBody.querySelector('.arch-ti.cur');
      if (curEl && curEl.scrollIntoView) try { curEl.scrollIntoView({ block: 'nearest' }); } catch (e) { /* ignore */ }
    }
    function toggleTree(v) {
      st.treeOpen = v == null ? !st.treeOpen : v;
      tree.classList.toggle('open', st.treeOpen);
      treeBtn.classList.toggle('active', st.treeOpen);
      if (st.treeOpen) renderTree();
    }
    function toggleLabels() { st.labels = !st.labels; stage.classList.toggle('arch-show-labels', st.labels); labelBtn.classList.toggle('active', st.labels); }
    let toastTimer = 0;
    function showToast(msg) {
      toast.textContent = msg; toast.classList.add('show');
      clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
    }

    // ----- navigation -----
    function navTo(id) {
      if (!id) return;
      const want = 'architecture/' + id;
      if (decodeURIComponent(location.hash.replace(/^#\/?/, '')) === want) navigate(id);
      else C.go(want);
    }
    function goUp() { if (st.cur && st.cur.parent && getNode(st.cur.parent)) navTo(st.cur.parent); }
    function goBack() { if (!st.history.length) return; const prev = st.history.pop(); st.skipPush = true; navTo(prev); }

    function navigate(sub) {
      if (st.dead) return;
      const id = sub || rootId();
      if (st.busy) { st.pending = id; return; }
      if (st.cur && st.cur.id === id && st.scene) { st.skipPush = false; return; }
      const from = st.cur, to = getNode(id) || null;
      if (from && !st.skipPush) { st.history.push(from.id); if (st.history.length > 60) st.history.shift(); }
      st.skipPush = false;
      st.cur = to || { id: id, title: id, __missing: true };
      renderChrome(to);
      renderPanel(to);
      C.emit('arch:node', id);
      if (!from || !st.scene) { introScene(to); return; }
      if (!to) { crossfade(null); return; }
      // zoom in: a hotspot in the current scene leads to target (or to one of its ancestors)
      const toChain = chainIds(id);
      let hs = st.scene.hotspots.find(x => x.target === id);
      if (!hs) for (let i = toChain.length - 1; i >= 0 && !hs; i--) hs = st.scene.hotspots.find(x => x.target === toChain[i] && toChain[i] !== from.id);
      if (hs) { zoomIn(hs, to); return; }
      // zoom out: target's scene has a hotspot to current (or one of current's ancestors)
      const fromChain = chainIds(from.id);
      const ths = hotspotsFor(to);
      let back = ths.find(x => x.target === from.id);
      if (!back) for (let i = fromChain.length - 1; i >= 0 && !back; i--) back = ths.find(x => x.target === fromChain[i]);
      if (back) { zoomOut(back, to); return; }
      crossfade(to);
    }
    function finishSeq() {
      st.busy = false;
      stage.classList.remove('arch-busy');
      if (st.pending) { const p = st.pending; st.pending = null; if (!st.cur || p !== st.cur.id) navigate(p); }
    }
    function startSeq() { st.busy = true; stage.classList.add('arch-busy'); }

    function introScene(node) {
      startSeq();
      setVB(FULL);
      const sc = mountScene(node);
      setWrap(sc.wrap, 0, 0.94);
      tween(reduced ? 1 : 500, p => { const e = easeOut(p); setWrap(sc.wrap, e, 0.94 + 0.06 * e); }, finishSeq);
    }
    function zoomIn(hs, to) {
      startSeq();
      const old = st.scene, target = fitRect(hs);
      const hel = old.layer.querySelector('.arch-hs[data-target="' + hs.target + '"]');
      if (hel) hel.classList.add('arch-hs-active');
      tween(DUR_ZOOM, p => {
        setVB(lerpVB(FULL, target, easeIO(p)));
        old.wrap.style.opacity = p < 0.55 ? 1 : Math.max(0, 1 - (p - 0.55) / 0.45);
      }, () => {
        setVB(FULL);
        const sc = mountScene(to);
        setWrap(sc.wrap, 0, 0.9);
        tween(DUR_IN, p => { const e = easeOut(p); setWrap(sc.wrap, e, 0.9 + 0.1 * e); }, finishSeq);
      });
    }
    function zoomOut(hs, to) {
      startSeq();
      const old = st.scene, from = fitRect(hs);
      tween(DUR_OUT, p => { const e = easeOut(p); setWrap(old.wrap, 1 - e, 1 - 0.1 * e); }, () => {
        const sc = mountScene(to);
        setVB(from);
        setWrap(sc.wrap, 0, 1);
        const hel = sc.layer.querySelector('.arch-hs[data-target="' + hs.target + '"]');
        if (hel) hel.classList.add('arch-hs-active');
        tween(DUR_ZOOM, p => {
          setVB(lerpVB(from, FULL, easeIO(p)));
          sc.wrap.style.opacity = Math.min(1, p / 0.3);
        }, () => { if (hel) setTimeout(() => hel.classList.remove('arch-hs-active'), 700); finishSeq(); });
      });
    }
    function crossfade(to) {
      startSeq();
      const old = st.scene;
      tween(DUR_OUT, p => setWrap(old.wrap, 1 - p, 1 - 0.03 * p), () => {
        setVB(FULL);
        const sc = mountScene(to);
        setWrap(sc.wrap, 0, 1.04);
        tween(DUR_IN, p => { const e = easeOut(p); setWrap(sc.wrap, e, 1.04 - 0.04 * e); }, finishSeq);
      });
    }

    // ----- keyboard -----
    function onKey(e) {
      if (e.key !== 'Escape') return;
      const tg = e.target && e.target.tagName;
      if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') { if (st.treeOpen) { e.target.blur(); } return; }
      if (st.treeOpen) { toggleTree(false); return; }
      goUp();
    }
    document.addEventListener('keydown', onKey);

    navigate(sub || '');

    return {
      navigate: navigate,
      destroy() {
        st.dead = true;
        stopTicker();
        for (const a of st.anims) { a.dead = true; cancelAnimationFrame(a.id); }
        st.anims = [];
        destroyScene();
        document.removeEventListener('keydown', onKey);
        clearTimeout(toastTimer); clearTimeout(st.miniTimer);
      }
    };
  }

  C.registerSection({
    id: 'architecture', title: 'Architecture Explorer', icon: '🔬', order: 10,
    render(container, sub) {
      if (inst) { try { inst.destroy(); } catch (e) { /* ignore */ } }
      const me = createExplorer(container, sub);
      inst = me;
      return () => { try { me.destroy(); } finally { if (inst === me) inst = null; } };
    },
    onSubRoute(sub) { if (inst) inst.navigate(sub); }
  });
})();
