/* CPO Switch Academy — Optics subtree of the architecture explorer (Agent B).
 * Nodes: optical-engine, eic (+ mrm-driver, driver-circuit, tia, eic-cdr, eic-3d-stack), pic (+ mrm, ring-physics,
 * mrm-junction, ring-lock-loop, heater, waveguide, wdm-mux, photodetector, pd-band-diagram, fiber-coupler),
 * external-laser (+ laser-diode, laser-qw), fiber-plant (+ fiber-connector, smf-fiber).
 * Self-contained: own <defs>, own flow/plot/slider helpers. Only depends on CPO core + api.loop/api.color/api.go
 * (with fallbacks). See CONTRACT.md. */
(function () {
  'use strict';
  if (!window.CPO || !CPO.arch) return;
  const S = CPO.s, B = CPO.badge, tip = CPO.tip;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const RM = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const MS = RM ? 0.3 : 1; // motion scale

  // per-wavelength colours (λ1 shortest … λ8 longest); O-band 200 GHz-ish grid around 1310 nm [typical]
  const WL = ['#ff3d6e', '#ff7a2a', '#ffb21f', '#e9f23f', '#6dff5c', '#2ef0c8', '#3fb4ff', '#b07cff'];
  const WLNM = WL.map((_, i) => (1306.0 + i * 1.14).toFixed(1));

  const FALL = {
    optic: '#ff6b3d', data: '#22d3ee', power: '#facc15', ctrl: '#a78bfa', therm: '#ff5a36', sense: '#f472b6',
    mech: '#94a3b8', accent: '#76b900', accent2: '#22d3ee', text: '#e6edf5', muted: '#8a99ad', line: '#243042',
    panel: '#111720', panel2: '#18202c', bg: '#07090c', bg2: '#0c1016', good: '#3ddc84', bad: '#ff4d5e',
    warn: '#f5b301', violet: '#a78bfa'
  };
  const cache = {};
  function cv(name) {
    if (cache[name]) return cache[name];
    let v = '';
    try { v = getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim(); } catch (e) { /* ignore */ }
    return (cache[name] = v || FALL[name] || '#888');
  }
  const DOMV = { data: 'data', optics: 'optic', power: 'power', control: 'ctrl', thermal: 'therm', sensing: 'sense', mechanical: 'mech' };
  const dc = d => cv(DOMV[d] || d);
  const FONT = 'Segoe UI, Inter, system-ui, sans-serif', MONO = 'ui-monospace, Cascadia Code, Consolas, monospace';

  // ---------------------------------------------------------------- scene context (own defs, safe loop)
  let UID = 0;
  function mk(g, api) {
    const id = 'opt' + (++UID);
    const defs = S('defs', {});
    defs.innerHTML =
      '<filter id="' + id + '-glow" filterUnits="userSpaceOnUse" x="-100" y="-100" width="1200" height="800"><feGaussianBlur stdDeviation="2.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<filter id="' + id + '-glow2" filterUnits="userSpaceOnUse" x="-100" y="-100" width="1200" height="800"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<filter id="' + id + '-soft" filterUnits="userSpaceOnUse" x="-100" y="-100" width="1200" height="800"><feGaussianBlur stdDeviation="6"/></filter>' +
      '<radialGradient id="' + id + '-mode"><stop offset="0" stop-color="#fff4c8"/><stop offset=".3" stop-color="#ffb347" stop-opacity=".9"/><stop offset=".65" stop-color="#ff4d2e" stop-opacity=".35"/><stop offset="1" stop-color="#ff2d2d" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="' + id + '-heat"><stop offset="0" stop-color="#ffdf6b" stop-opacity=".95"/><stop offset=".4" stop-color="#ff5a36" stop-opacity=".55"/><stop offset="1" stop-color="#ff5a36" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="' + id + '-si" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b4b60"/><stop offset="1" stop-color="#1b2431"/></linearGradient>' +
      '<linearGradient id="' + id + '-cu" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b87333"/><stop offset=".5" stop-color="#f0a868"/><stop offset="1" stop-color="#9c5a24"/></linearGradient>' +
      '<linearGradient id="' + id + '-ox" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d2f45" stop-opacity=".9"/><stop offset="1" stop-color="#152234" stop-opacity=".9"/></linearGradient>' +
      '<linearGradient id="' + id + '-chip" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1a2332"/><stop offset="1" stop-color="#0d131c"/></linearGradient>' +
      '<pattern id="' + id + '-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#141c28" stroke-width="1"/></pattern>' +
      '<pattern id="' + id + '-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V6" stroke="#2a3a50" stroke-width="2"/></pattern>';
    g.appendChild(defs);
    const markers = {};
    let seen = false;
    const c = {
      id, g, defs,
      url: n => 'url(#' + id + '-' + n + ')',
      ref: n => id + '-' + n,
      col: d => (api && typeof api.color === 'function' ? (api.color(d) || dc(d)) : dc(d)),
      go: t => (api && typeof api.go === 'function' ? api.go(t) : CPO.go('architecture/' + t)),
      loop(fn) {
        if (api && typeof api.loop === 'function') return api.loop(fn);
        // fallback: stop automatically when our group leaves the document
        const stop = CPO.loop((dt, t) => {
          if (g.isConnected) seen = true; else if (seen) { stop(); return; }
          fn(dt, t);
        });
        return stop;
      },
      arrow(color) {
        const k = color.replace(/[^a-z0-9]/gi, '');
        if (!markers[k]) {
          const m = S('marker', { id: id + '-ar' + k, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' },
            S('path', { d: 'M0 0L10 5L0 10z', fill: color }));
          defs.appendChild(m); markers[k] = 'url(#' + id + '-ar' + k + ')';
        }
        return markers[k];
      }
    };
    return c;
  }

  // ---------------------------------------------------------------- primitive helpers
  function el(p, tag, a) { const e = S(tag, a || {}); if (p) p.appendChild(e); return e; }
  function grp(p, a) { return el(p, 'g', a); }
  function T(p, x, y, s, o) {
    o = o || {};
    const a = {
      x, y, 'font-size': o.size || 13, fill: o.fill || cv('text'), 'text-anchor': o.anchor || 'start',
      'font-weight': o.weight || null, 'font-family': o.mono ? MONO : FONT, opacity: o.op != null ? o.op : null,
      'data-domain': o.dom || null, 'font-style': o.italic ? 'italic' : null, 'letter-spacing': o.ls || null,
      transform: o.rot ? 'rotate(' + o.rot + ' ' + x + ' ' + y + ')' : null, 'pointer-events': 'none'
    };
    const t = el(p, 'text', a);
    const lines = String(s).split('\n');
    if (lines.length === 1) t.textContent = s;
    else lines.forEach((ln, i) => { const ts = el(t, 'tspan', { x, dy: i ? (o.lh || 1.25) + 'em' : 0 }); ts.textContent = ln; });
    return t;
  }
  function R(p, x, y, w, h, o) {
    o = o || {};
    return el(p, 'rect', {
      x, y, width: w, height: h, rx: o.rx != null ? o.rx : 6, fill: o.fill || 'none', stroke: o.stroke || null,
      'stroke-width': o.sw || (o.stroke ? 1.2 : null), opacity: o.op != null ? o.op : null, filter: o.filter || null,
      'data-domain': o.dom || null, 'stroke-dasharray': o.dash || null
    });
  }
  function Ln(p, x1, y1, x2, y2, o) {
    o = o || {};
    return el(p, 'line', {
      x1, y1, x2, y2, stroke: o.stroke || cv('muted'), 'stroke-width': o.sw || 1.2, opacity: o.op != null ? o.op : null,
      'stroke-dasharray': o.dash || null, 'marker-end': o.end || null, 'marker-start': o.start || null,
      'data-domain': o.dom || null, filter: o.filter || null, 'stroke-linecap': 'round'
    });
  }
  function Pa(p, d, o) {
    o = o || {};
    return el(p, 'path', {
      d, fill: o.fill || 'none', stroke: o.stroke || null, 'stroke-width': o.sw || (o.stroke ? 1.5 : null),
      opacity: o.op != null ? o.op : null, filter: o.filter || null, 'data-domain': o.dom || null,
      'stroke-dasharray': o.dash || null, 'marker-end': o.end || null, 'stroke-linecap': o.cap || 'round',
      'stroke-linejoin': 'round', 'fill-opacity': o.fop != null ? o.fop : null
    });
  }
  function Ci(p, cx, cy, r, o) {
    o = o || {};
    return el(p, 'circle', {
      cx, cy, r, fill: o.fill || 'none', stroke: o.stroke || null, 'stroke-width': o.sw || (o.stroke ? 1.5 : null),
      opacity: o.op != null ? o.op : null, filter: o.filter || null, 'data-domain': o.dom || null, 'stroke-dasharray': o.dash || null
    });
  }
  const ptsD = pts => 'M' + pts.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join('L');

  // polyline arc-length parametrisation (no DOM needed)
  function polyl(pts) {
    const seg = []; let L = 0;
    for (let i = 1; i < pts.length; i++) {
      const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push([L, l]); L += l;
    }
    return {
      L,
      at(s) {
        s = ((s % L) + L) % L;
        for (let i = 0; i < seg.length; i++) {
          if (s <= seg[i][0] + seg[i][1] || i === seg.length - 1) {
            const f = seg[i][1] ? (s - seg[i][0]) / seg[i][1] : 0;
            return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f];
          }
        }
        return pts[0];
      }
    };
  }
  // flowing particles along a polyline. o: {n, r, color, colors[], speed, dom, glow, fn(dot,i,pt,frac,dt)}
  function flow(c, p, pts, o) {
    o = o || {};
    const pl = polyl(pts);
    const n = o.n || Math.max(3, Math.round(pl.L / 38));
    const gg = grp(p, { 'data-domain': o.dom || null, filter: o.glow === false ? null : c.url('glow') });
    const colors = o.colors || [o.color || cv('optic')];
    const dots = [];
    for (let i = 0; i < n; i++) dots.push(el(gg, 'circle', { r: o.r || 3, fill: colors[i % colors.length], cx: -50, cy: -50 }));
    const st = { speed: (o.speed || 80) * MS, on: true, g: gg, dots };
    let off = o.phase != null ? o.phase * pl.L : Math.random() * pl.L;
    c.loop(dt => {
      gg.style.display = st.on ? '' : 'none';
      if (!st.on) return;
      off += st.speed * dt;
      for (let i = 0; i < n; i++) {
        const s = off + i * pl.L / n, q = pl.at(s);
        dots[i].setAttribute('cx', q[0].toFixed(1)); dots[i].setAttribute('cy', q[1].toFixed(1));
        if (o.fn) o.fn(dots[i], i, q, (((s % pl.L) + pl.L) % pl.L) / pl.L, dt);
      }
    });
    return st;
  }
  // glowing optical beam with moving dash highlights
  function beam(c, p, pts, o) {
    o = o || {};
    const d = typeof pts === 'string' ? pts : ptsD(pts);
    const col = o.color || cv('optic'), w = o.w || 3;
    const gg = grp(p, { 'data-domain': o.dom || 'optics' });
    if (o.halo !== false) Pa(gg, d, { stroke: col, sw: w * 3.2, op: 0.16, filter: c.url('soft') });
    const core = Pa(gg, d, { stroke: col, sw: w, op: o.op || 0.95, filter: c.url('glow') });
    let da = null;
    if (o.dash !== false) {
      da = Pa(gg, d, { stroke: '#fff', sw: Math.max(0.8, w * 0.45), op: 0.55, dash: o.dashpat || '3 15' });
      let off = 0; const sp = (o.speed || 60) * MS;
      c.loop(dt => { off -= sp * dt; da.setAttribute('stroke-dashoffset', off.toFixed(1)); });
    }
    gg.core = core; gg.da = da;
    return gg;
  }
  // electrical wire with flowing dashes
  function wire(c, p, pts, o) {
    o = o || {};
    const d = typeof pts === 'string' ? pts : ptsD(pts);
    const col = o.color || cv('data');
    const gg = grp(p, { 'data-domain': o.dom || 'data' });
    Pa(gg, d, { stroke: col, sw: o.w || 1.6, op: o.op || 0.75 });
    if (o.anim !== false) {
      const da = Pa(gg, d, { stroke: col, sw: (o.w || 1.6) + 0.8, op: 0.9, dash: '2 10', filter: c.url('glow') });
      let off = 0; const sp = (o.speed || 40) * MS;
      c.loop(dt => { off -= sp * dt; da.setAttribute('stroke-dashoffset', off.toFixed(1)); });
    }
    return gg;
  }
  // chip / block
  function chip(c, p, x, y, w, h, label, o) {
    o = o || {};
    const col = o.color || cv('accent');
    const gg = grp(p, { 'data-domain': o.dom || null });
    R(gg, x, y, w, h, { fill: o.fill || c.url('chip'), stroke: col, sw: o.sw || 1.4, rx: o.rx != null ? o.rx : 8, op: o.op });
    if (o.glow) R(gg, x, y, w, h, { stroke: col, sw: 2, rx: o.rx != null ? o.rx : 8, op: 0.35, filter: c.url('glow2') });
    if (label) T(gg, x + w / 2, y + (o.sub ? h / 2 - 2 : h / 2 + 5), label, { anchor: 'middle', size: o.size || 13, weight: 600, fill: o.tfill || cv('text') });
    if (o.sub) T(gg, x + w / 2, y + h / 2 + 13, o.sub, { anchor: 'middle', size: o.ssize || 10.5, fill: cv('muted') });
    return gg;
  }
  function title(p, s, sub) {
    T(p, 24, 32, s, { size: 19, weight: 700 });
    if (sub) T(p, 24, 52, sub, { size: 12, fill: cv('muted') });
  }
  function eqbox(p, x, y, w, lines, o) {
    o = o || {};
    const lh = o.lh || 16, h = lines.length * lh + 14;
    R(p, x, y, w, h, { fill: '#05080bdd', stroke: cv('line'), rx: 7 });
    lines.forEach((s, i) => T(p, x + 10, y + 18 + i * lh, s, { mono: true, size: o.size || 11.5, fill: o.fill || '#d8f5a8' }));
    return h;
  }
  // live readout list: returns setter(i, text, color?)
  function readout(p, x, y, labels, o) {
    o = o || {};
    const lh = o.lh || 18, vals = [];
    labels.forEach((lab, i) => {
      T(p, x, y + i * lh, lab, { size: o.size || 12, fill: cv('muted') });
      vals.push(T(p, x + (o.vx || 150), y + i * lh, '—', { size: o.size || 12, mono: true, fill: o.fill || cv('accent'), anchor: o.anchor || 'start' }));
    });
    return (i, s, col) => { vals[i].textContent = s; if (col) vals[i].setAttribute('fill', col); };
  }
  function stopEv(e) { e.stopPropagation(); }
  // SVG slider: o {label,min,max,value,step,fmt,color,onchange}
  function slider(c, p, x, y, w, o) {
    const col = o.color || cv('accent');
    const gg = grp(p, { style: 'cursor:pointer' });
    T(gg, x, y - 11, o.label, { size: 11.5, fill: cv('muted') });
    const vt = T(gg, x + w, y - 11, '', { size: 11.5, anchor: 'end', mono: true, fill: col });
    R(gg, x, y - 3, w, 6, { rx: 3, fill: '#1b2433' });
    const fill = R(gg, x, y - 3, 0, 6, { rx: 3, fill: col, op: 0.65 });
    const knob = Ci(gg, x, y, 7.5, { fill: '#0b0f14', stroke: col, sw: 2.5, filter: c.url('glow') });
    const hit = R(gg, x - 10, y - 16, w + 20, 30, { fill: 'rgba(0,0,0,0)', rx: 0 });
    const s = {
      v: o.value, touched: -1e9,
      set(v, silent) {
        v = clamp(v, o.min, o.max); if (o.step) v = Math.round(v / o.step) * o.step;
        s.v = v; const px = x + (v - o.min) / (o.max - o.min) * w;
        knob.setAttribute('cx', px.toFixed(1)); fill.setAttribute('width', Math.max(0, px - x).toFixed(1));
        vt.textContent = o.fmt ? o.fmt(v) : v.toFixed(2);
        if (!silent && o.onchange) o.onchange(v);
      },
      idle() { return performance.now() - s.touched > 3500; }
    };
    function loc(e) {
      const m = hit.getScreenCTM && hit.getScreenCTM(); const svg = hit.ownerSVGElement;
      if (!m || !svg) return;
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const q = pt.matrixTransform(m.inverse());
      s.touched = performance.now();
      s.set(o.min + (q.x - x) / w * (o.max - o.min));
    }
    let drag = false;
    gg.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); drag = true; try { gg.setPointerCapture(e.pointerId); } catch (_) { /* */ } loc(e); });
    gg.addEventListener('pointermove', e => { if (drag) { e.stopPropagation(); loc(e); } });
    gg.addEventListener('pointerup', e => { drag = false; e.stopPropagation(); });
    gg.addEventListener('pointercancel', () => { drag = false; });
    gg.addEventListener('click', stopEv);
    gg.addEventListener('mousedown', stopEv);
    s.set(o.value, true);
    return s;
  }
  // SVG button
  function button(c, p, x, y, w, label, onclick, o) {
    o = o || {};
    const col = o.color || cv('accent');
    const gg = grp(p, { style: 'cursor:pointer' });
    const r = R(gg, x, y, w, 24, { fill: '#121a26', stroke: col, sw: 1.2, rx: 6 });
    const t = T(gg, x + w / 2, y + 16, label, { anchor: 'middle', size: 11.5, fill: col, weight: 600 });
    gg.addEventListener('pointerdown', stopEv); gg.addEventListener('mousedown', stopEv);
    gg.addEventListener('click', e => { e.stopPropagation(); onclick && onclick(gg); });
    gg.active = a => { r.setAttribute('fill', a ? col : '#121a26'); t.setAttribute('fill', a ? '#081000' : col); };
    gg.label = s => { t.textContent = s; };
    return gg;
  }
  // x/y plot frame. o {x0,x1,y0,y1,xl,yl,xt:[...],yt:[...],xf,yf}
  function plot(p, x, y, w, h, o) {
    const gg = grp(p, {});
    R(gg, x, y, w, h, { fill: '#080c12', stroke: cv('line'), rx: 4 });
    const X = v => x + (v - o.x0) / (o.x1 - o.x0) * w;
    const Y = v => y + h - (v - o.y0) / (o.y1 - o.y0) * h;
    (o.xt || []).forEach(v => {
      Ln(gg, X(v), y, X(v), y + h, { stroke: '#18212e', sw: 1 });
      T(gg, X(v), y + h + 13, o.xf ? o.xf(v) : String(v), { size: 10, anchor: 'middle', fill: cv('muted'), mono: true });
    });
    (o.yt || []).forEach(v => {
      Ln(gg, x, Y(v), x + w, Y(v), { stroke: '#18212e', sw: 1 });
      T(gg, x - 5, Y(v) + 3.5, o.yf ? o.yf(v) : String(v), { size: 10, anchor: 'end', fill: cv('muted'), mono: true });
    });
    if (o.xl) T(gg, x + w / 2, y + h + 27, o.xl, { size: 11, anchor: 'middle', fill: cv('muted') });
    if (o.yl) T(gg, x - (o.ylo || 34), y + h / 2, o.yl, { size: 11, anchor: 'middle', fill: cv('muted'), rot: -90 });
    const clip = v => clamp(v, Math.min(o.y0, o.y1), Math.max(o.y0, o.y1));
    return {
      g: gg, X, Y,
      line(f, st) {
        st = st || {};
        const pl = el(gg, 'polyline', {
          fill: st.fill || 'none', stroke: st.color || cv('accent'), 'stroke-width': st.w || 2, opacity: st.op != null ? st.op : null,
          filter: st.glow ? st.glow : null, 'stroke-dasharray': st.dash || null, 'stroke-linejoin': 'round', 'data-domain': st.dom || null
        });
        pl.update = ff => {
          let pts = [];
          if (typeof ff === 'function') {
            const N = st.N || 220;
            for (let i = 0; i <= N; i++) { const xv = o.x0 + (o.x1 - o.x0) * i / N; pts.push(X(xv).toFixed(1) + ',' + Y(clip(ff(xv))).toFixed(1)); }
          } else pts = ff.map(q => X(q[0]).toFixed(1) + ',' + Y(clip(q[1])).toFixed(1));
          if (st.fill && st.fill !== 'none') { pts.push(X(o.x1).toFixed(1) + ',' + Y(o.y0).toFixed(1)); pts.unshift(X(o.x0).toFixed(1) + ',' + Y(o.y0).toFixed(1)); }
          pl.setAttribute('points', pts.join(' '));
        };
        pl.update(f);
        return pl;
      }
    };
  }
  // micro-ring graphic: returns {glow, set(intensity 0..1)}
  function ringG(c, p, cx, cy, r, color, o) {
    o = o || {};
    const gg = grp(p, { 'data-domain': 'optics' });
    Ci(gg, cx, cy, r, { stroke: '#3a4a60', sw: o.w || 4 });
    const glow = Ci(gg, cx, cy, r, { stroke: color, sw: (o.w || 4) - 1, filter: c.url('glow2'), op: 0.4 });
    const core = Ci(gg, cx, cy, r, { stroke: color, sw: Math.max(1, (o.w || 4) - 2.5), op: 0.9 });
    return { g: gg, set(v) { glow.setAttribute('opacity', (0.12 + 0.88 * v).toFixed(2)); core.setAttribute('opacity', (0.35 + 0.65 * v).toFixed(2)); } };
  }
  function heaterZig(p, x, y, w, o) {
    o = o || {};
    let d = 'M' + x + ',' + y; const n = o.n || 6, a = o.a || 3;
    for (let i = 1; i <= n; i++) d += 'L' + (x + w * i / n).toFixed(1) + ',' + (y + (i % 2 ? -a : a));
    return Pa(p, d, { stroke: cv('therm'), sw: o.sw || 1.6, dom: 'thermal', op: o.op || 0.9 });
  }
  // add-through all-pass / add-drop ring transfer (power), detuning phase φ
  function ringT(phi, a, r) { const cs = Math.cos(phi); return (a * a - 2 * a * r * cs + r * r) / (1 - 2 * a * r * cs + a * a * r * r); }
  function lorentz(dl, fwhm) { const u = 2 * dl / fwhm; return 1 / (1 + u * u); }
  const pam4 = () => (Math.random() * 4) | 0;

  // ---------------------------------------------------------------- glossary additions
  CPO.addGlossary({
    OE: { full: 'Optical Engine', def: 'Co-packaged silicon-photonics transceiver (EIC + PIC + fiber interface) placed next to the switch ASIC.', cat: 'optics' },
    EIC: { full: 'Electronic Integrated Circuit', def: 'CMOS die with modulator drivers, TIAs, control DACs/ADCs; 3D-stacked on the PIC.', cat: 'optics' },
    PIC: { full: 'Photonic Integrated Circuit', def: 'Silicon-on-insulator die carrying waveguides, ring modulators, WDM filters, photodetectors and couplers.', cat: 'optics' },
    MRM: { full: 'Micro-Ring Modulator', def: 'Resonant silicon ring with a PN junction; voltage shifts the resonance to modulate one wavelength.', cat: 'optics' },
    TIA: { full: 'Trans-Impedance Amplifier', def: 'Converts photodiode current to voltage with low noise; set by feedback resistor Rf.', cat: 'optics' },
    CDR: { full: 'Clock and Data Recovery', def: 'Extracts the sampling clock from the data stream and retimes it.', cat: 'data' },
    COUPE: { full: 'Compact Universal Photonic Engine (TSMC)', def: 'TSMC silicon-photonics integration platform stacking an EIC on a PIC using SoIC.', cat: 'optics' },
    SoIC: { full: 'System on Integrated Chips (TSMC)', def: 'TSMC 3D stacking with bumpless Cu-Cu hybrid bonding (µm-scale pitch).', cat: 'optics' },
    ELS: { full: 'External Laser Source', def: 'Front-panel laser module supplying CW light by fiber to co-packaged optical engines.', cat: 'optics' },
    DFB: { full: 'Distributed FeedBack laser', def: 'Semiconductor laser with a Bragg grating along the cavity giving single-longitudinal-mode output.', cat: 'optics' },
    WDM: { full: 'Wavelength-Division Multiplexing', def: 'Several wavelengths, each carrying a lane, share one fiber/waveguide.', cat: 'optics' },
    FSR: { full: 'Free Spectral Range', def: 'Wavelength spacing between adjacent resonances of a ring/cavity: λ²/(n_g·L).', cat: 'optics' },
    PD: { full: 'PhotoDetector', def: 'Converts light to current (Ge-on-Si PIN in silicon photonics).', cat: 'optics' },
    FAU: { full: 'Fiber Array Unit', def: 'Precision block (V-grooves) holding a row of fibers aligned to on-chip couplers.', cat: 'optics' },
    MPO: { full: 'Multi-fiber Push-On connector', def: 'Multi-fiber connector built on an MT ferrule (12/16/24 fibers).', cat: 'optics' },
    MT: { full: 'Mechanical Transfer ferrule', def: 'Rectangular ferrule with fibers at 250 µm pitch aligned by two guide pins.', cat: 'optics' },
    SMF: { full: 'Single-Mode Fiber', def: 'Fiber guiding one transverse mode; ~9 µm core, MFD ≈ 9.2 µm at 1310 nm.', cat: 'optics' },
    MFD: { full: 'Mode Field Diameter', def: 'Diameter at which the mode intensity falls to 1/e² of its peak.', cat: 'optics' },
    PMF: { full: 'Polarization-Maintaining Fiber', def: 'Birefringent fiber (e.g. PANDA) that preserves linear polarization; used for laser feed.', cat: 'optics' },
    RIN: { full: 'Relative Intensity Noise', def: 'Laser intensity noise relative to mean power, dB/Hz.', cat: 'optics' },
    TEC: { full: 'Thermo-Electric Cooler', def: 'Peltier element holding the laser chip at a set temperature.', cat: 'thermal' },
    WPE: { full: 'Wall-Plug Efficiency', def: 'Optical output power divided by electrical input power.', cat: 'optics' },
    ER: { full: 'Extinction Ratio', def: 'Ratio of highest to lowest optical power level of a modulated signal.', cat: 'optics' },
    OMA: { full: 'Optical Modulation Amplitude', def: 'Difference between the high and low optical power levels.', cat: 'optics' },
    TSV: { full: 'Through-Silicon Via', def: 'Vertical Cu interconnect through a thinned die.', cat: 'mechanical' },
    PAM4: { full: '4-level Pulse Amplitude Modulation', def: '2 bits per symbol; 200G lanes run ~106–113 GBd PAM4.', cat: 'data' },
    SOI: { full: 'Silicon-On-Insulator', def: 'Thin Si device layer (220 nm typical for photonics) on buried oxide.', cat: 'optics' },
    BOX: { full: 'Buried OXide', def: 'SiO2 layer (~2 µm) isolating the SOI waveguide layer from the Si substrate.', cat: 'optics' },
    MQW: { full: 'Multiple Quantum Wells', def: 'Stack of thin low-bandgap layers forming the laser gain region.', cat: 'optics' },
    CTLE: { full: 'Continuous-Time Linear Equalizer', def: 'Analog high-frequency peaking filter that compensates channel loss.', cat: 'data' },
    FFE: { full: 'Feed-Forward Equalizer', def: 'FIR equalizer (taps) in a SerDes transmitter or receiver.', cat: 'data' },
    DAC: { full: 'Digital-to-Analog Converter', def: 'Sets analog quantities, e.g. heater power or bias.', cat: 'control' },
    ADC: { full: 'Analog-to-Digital Converter', def: 'Digitizes monitor signals for control loops.', cat: 'control' },
    PID: { full: 'Proportional-Integral-Derivative controller', def: 'Classic feedback controller.', cat: 'control' },
    CW: { full: 'Continuous Wave', def: 'Unmodulated, constant-power laser output.', cat: 'optics' },
    GBW: { full: 'Gain-Bandwidth product', def: 'Amplifier gain × bandwidth, roughly constant for a single-pole stage.', cat: 'data' },
    TIR: { full: 'Total Internal Reflection', def: 'Guiding mechanism when light hits a lower-index boundary beyond the critical angle.', cat: 'optics' },
    NA: { full: 'Numerical Aperture', def: 'sin of the maximum acceptance half-angle: √(n_core² − n_clad²).', cat: 'optics' },
    IL: { full: 'Insertion Loss', def: 'Optical power lost passing through a component, dB.', cat: 'optics' },
    EOL: { full: 'End Of Life', def: 'Condition at end of rated lifetime (aged laser, worst temperature).', cat: 'optics' },
    APD: { full: 'Avalanche PhotoDiode', def: 'Photodiode with internal gain; not usually needed for short CPO links.', cat: 'optics' },
    DSP: { full: 'Digital Signal Processor', def: 'Digital equalization/FEC/retiming engine used in pluggable optics.', cat: 'data' },
    FEC: { full: 'Forward Error Correction', def: 'E.g. KP4 RS(544,514): corrects pre-FEC BER ≈ 2.4e-4 to <1e-13.', cat: 'data' },
    BER: { full: 'Bit Error Ratio', def: 'Fraction of bits received in error.', cat: 'data' },
    TE: { full: 'Transverse Electric mode', def: 'Mode with dominant E-field in the chip plane; Si photonics devices are mostly TE-only.', cat: 'optics' },
    FWHM: { full: 'Full Width at Half Maximum', def: 'Linewidth of a resonance; FWHM = λ/Q.', cat: 'optics' },
    CMIS: { full: 'Common Management Interface Specification', def: 'OIF register map/management protocol for optical modules.', cat: 'control' }
  });

  const NODES = [];
  const add = n => NODES.push(n);

  // ================================================================ OPTICAL ENGINE
  add({
    id: 'optical-engine', parent: 'switch-package', domain: 'optics', level: 3,
    title: 'Optical Engine (OE)',
    subtitle: '1.6T-class silicon-photonics engine — EIC 3D-stacked on PIC',
    summary: 'The optical engine is a transceiver without a module: a silicon photonic chip (PIC) carrying micro-ring modulators, WDM filters and germanium photodetectors, with a CMOS electronic chip (EIC) stacked on top. It sits on the switch package millimetres from the ASIC, receives CW laser light by fiber from the front-panel external lasers, imprints the ASIC\'s 200G PAM4 lanes onto several wavelengths, and converts incoming light back into electrical lanes.',
    what: '<p>Each engine handles <b>~1.6 Tb/s</b> ' + B('nv') + ' — e.g. 8 lanes × 200G PAM4 ' + B('typ') + '. The transmit side is a <b>bus waveguide</b> fed with CW light from the ' + tip('ELS') + '. Along it sit ' + tip('MRM') + 's, each resonant at one wavelength: a ring only "sees" its own colour, so each ring modulates one lane while the others pass — the modulators double as the WDM multiplexer. The modulated comb leaves via a coupler into the ' + tip('FAU') + '.</p>' +
      '<p>The receive side mirrors this: <b>drop rings</b> each pick one wavelength into a Ge photodetector; the photocurrent (tens of µA) is amplified by a ' + tip('TIA') + ' in the EIC and returned to the ASIC SerDes.</p>' +
      '<p>The EIC is <b>3D-stacked on the PIC</b> with TSMC ' + tip('COUPE') + ' / ' + tip('SoIC') + ' ' + B('nv') + '. Hybrid-bond parasitics are a few fF instead of ~100+ fF for wire-bonds ' + B('typ') + ', enabling sub-pJ/bit drivers. Each ring also needs a <b>heater + monitor PD + lock loop</b>, because 1 K moves a ring ~0.08 nm — comparable to its linewidth.</p>' +
      '<p>The exact NVIDIA lane→wavelength→fiber mapping is not public; the drawing shows an 8-λ ring-WDM arrangement typical of MRM engines ' + B('typ') + '.</p>' +
      '<div class="callout">Why co-package? It removes ~15–25 cm of lossy PCB trace and the retimer/DSP needed to drive it. NVIDIA quotes <b>3.5× better power efficiency</b> and <b>63× better signal integrity</b> vs pluggables ' + B('nv') + '.</div>',
    needs: [
      'Stable, low-noise CW laser light at the right wavelengths and TE polarization from the ELS via PM fiber',
      'Ring resonances locked to the laser comb within a few pm despite ASIC heat',
      'Very low EIC↔PIC parasitics (hybrid bonds, few fF) to keep driver energy < 1 pJ/bit',
      'Low-loss fiber attach (1–3 dB per coupler), stable over temperature cycling and life',
      'Clean supplies and a good thermal path to the cold plate',
      'Short, controlled electrical channel to the ASIC SerDes (mm to a few cm)'
    ],
    interfaces: [
      { with: 'switch-asic SerDes', type: 'electrical', detail: '8 × 200G PAM4 (~106–113 GBd) per direction over package-substrate traces' },
      { with: 'external-laser (ELS)', type: 'optical', detail: 'CW multi-wavelength O-band light via polarization-maintaining fiber' },
      { with: 'fiber-plant', type: 'optical', detail: 'TX/RX single-mode fibers via FAU → detachable connector → front panel' },
      { with: 'control-plane / CMIS', type: 'mgmt', detail: 'Lock status, monitor PDs, temperatures, alarms' },
      { with: 'power-delivery', type: 'power', detail: 'EIC rails (~0.75–1.8 V) and heater supply [typical]' },
      { with: 'thermal-system', type: 'thermal', detail: 'Shares the liquid-cooled cold plate with the ASIC' }
    ],
    kpis: [
      { name: 'Throughput / engine', value: '1.6 Tb/s', tag: 'nv', note: '1.6T-class silicon photonics engines' },
      { name: 'Lane rate', value: '200G PAM4', tag: 'nv', note: '~106–113 GBd' },
      { name: 'Modulator', value: 'Micro-ring (MRM)', tag: 'nv', note: '~10–20 fF load [typical]' },
      { name: 'Optics energy', value: '~5 pJ/bit incl. laser', tag: 'typ', note: 'vs ~15–20 pJ/bit pluggable' },
      { name: 'Ring tuning power', value: '1–10 mW / ring', tag: 'typ' },
      { name: 'Fiber-to-chip loss', value: '1–3 dB / coupler', tag: 'typ' },
      { name: 'Engines per 115T switch', value: '≈72', tag: 'est', note: '115.2 Tb/s ÷ 1.6 Tb/s' }
    ],
    physics: '<div class="eq">Lane optical budget (one λ):\n P_rx = P_laser − IL(ELS→chip) − IL(bus) − IL(MRM) − IL(coupler) − IL(link) − IL(demux) − IL(coupler)\n OMA = 2·P_avg·(ER−1)/(ER+1)   (ER linear)\nEnergy/bit ≈ (P_laser,elec + P_drivers + P_TIA + P_heaters + P_ctrl) / bit-rate</div>' +
      '<p>The ring is tiny (R ≈ 5 µm) with low capacitance, and driver energy scales as C·V². The price is <b>resonance sensitivity</b>: temperature, nm-scale fab variation and carrier density all move the resonance, so the engine depends on its wavelength-locking control.</p>',
    failures: [
      'Ring loses lock (thermal transient, laser hop) → lane BER burst → re-acquire; FEC rides short events',
      'Fiber-attach creep / adhesive aging → +0.5–1 dB loss → reduced OMA margin',
      'EIC driver/TIA damage (ESD, EOS) → dead lane → lane remap or board replacement',
      'ASIC load steps → many rings drift together → lock loops need bandwidth and range',
      'Contaminated detachable connector → loss/reflections → link flaps'
    ],
    monitoring: [
      'Per-ring monitor PD → ADC → lock controller → heater DAC (ring-lock-loop)',
      'RX power per lane from average photocurrent; laser input tap PDs',
      'EIC/PIC temperature sensors; telemetry via CMIS-like registers to the BMC',
      'Host SerDes pre-FEC BER / SNR per lane'
    ],
    scene(g, api) {
      const c = mk(g, api);
      title(g, 'Optical engine — top view (schematic)', 'TX: CW comb → ring modulators → fiber.   RX: fiber → drop-ring demux → Ge PDs → TIAs.   EIC drawn ghosted (stacked on top of the PIC).');
      R(g, 160, 92, 690, 362, { fill: '#0c121b', stroke: '#3b4b60', sw: 1.5, rx: 6, dom: 'optics' });
      R(g, 160, 92, 690, 362, { fill: c.url('grid'), rx: 6, op: 0.7 });
      T(g, 170, 110, 'PIC (SOI silicon photonics)', { size: 11, fill: cv('optic'), weight: 600, dom: 'optics' });
      R(g, 16, 92, 120, 362, { fill: '#10151d', stroke: '#2a3646', rx: 6, dom: 'data' });
      T(g, 76, 116, 'ASIC SerDes', { anchor: 'middle', size: 12, weight: 600, fill: cv('data') });
      T(g, 76, 132, '200G PAM4 lanes', { anchor: 'middle', size: 10, fill: cv('muted') });
      T(g, 76, 255, 'TX lanes ►', { anchor: 'middle', size: 10, fill: cv('data') });
      T(g, 76, 433, '◄ RX lanes', { anchor: 'middle', size: 10, fill: cv('data') });
      const rx = i => 330 + i * 44, rrx = i => 345 + i * 44;
      wire(c, g, [[120, 262], [rx(7), 262]], { speed: 60 });
      for (let i = 0; i < 8; i++) wire(c, g, [[rx(i), 248], [rx(i), 262]], { anim: false, op: 0.6 });
      wire(c, g, [[rrx(7), 440], [120, 440]], { speed: 60 });
      const lasIn = [[1000, 130], [850, 130], [250, 130], [222, 140], [214, 165], [222, 190], [250, 200], [850, 200], [1000, 200]];
      beam(c, g, lasIn.slice(0, 8), { color: '#ffd9b0', w: 2.6, speed: 70 });
      Pa(g, ptsD([[850, 200], [1000, 200]]), { stroke: cv('optic'), sw: 2.5, op: 0.6, dom: 'optics' });
      const rings = [], lev = [0.18, 0.45, 0.72, 1];
      for (let i = 0; i < 8; i++) {
        rings.push(ringG(c, g, rx(i), 182, 13, WL[i], { w: 4 }));
        heaterZig(g, rx(i) - 12, 161, 24, { n: 6, a: 2 });
        Ci(g, rx(i) + 16, 167, 3, { fill: cv('sense'), dom: 'sensing' });
        T(g, rx(i), 151, 'λ' + (i + 1), { anchor: 'middle', size: 10, fill: WL[i], mono: true });
        Pa(g, 'M' + (rx(i) - 7) + ',248L' + (rx(i) + 7) + ',248L' + rx(i) + ',236Z', { fill: '#0d1a22', stroke: cv('data'), sw: 1.2, dom: 'data' });
        Ln(g, rx(i), 236, rx(i), 196, { stroke: cv('data'), sw: 1, op: 0.45, dom: 'data' });
      }
      for (let k = 0; k < 8; k++) {
        const prev = [];
        flow(c, g, lasIn, {
          n: 7, r: 2.6, color: WL[k], speed: 115, phase: k / 8, dom: 'optics',
          fn(dot, i, q, f) {
            if (prev[i] != null && f < prev[i]) dot._s = pam4();
            prev[i] = f;
            const after = q[1] > 195 && q[0] > rx(k) + 4;
            dot.setAttribute('opacity', after ? lev[dot._s == null ? 3 : dot._s] : 0.95);
          }
        });
      }
      beam(c, g, [[1000, 345], [300, 345]], { color: '#ffd9b0', w: 2.4, speed: 70 });
      for (let k = 0; k < 8; k++) {
        ringG(c, g, rrx(k), 362, 11, WL[k], { w: 3.5 }).set(0.7);
        R(g, rrx(k) - 8, 388, 16, 12, { fill: '#3a3f2a', stroke: '#c6d86a', sw: 1, rx: 2, dom: 'optics' });
        Pa(g, 'M' + (rrx(k) - 6) + ',428L' + (rrx(k) + 6) + ',428L' + rrx(k) + ',416Z', { fill: '#0d1a22', stroke: cv('data'), sw: 1.1, dom: 'data' });
        Ln(g, rrx(k), 400, rrx(k), 416, { stroke: cv('data'), sw: 1, op: 0.6, dom: 'data' });
        Ln(g, rrx(k), 428, rrx(k), 440, { stroke: cv('data'), sw: 1, op: 0.6, dom: 'data' });
        flow(c, g, [[1000, 345], [rrx(k), 345], [rrx(k), 373], [rrx(k), 390]], { n: 4, r: 2.6, color: WL[k], speed: 110, phase: k / 8, dom: 'optics' });
      }
      T(g, 712, 397, 'Ge PDs', { size: 10.5, fill: '#c6d86a' });
      T(g, 712, 427, 'TIAs', { size: 10.5, fill: cv('data') });
      T(g, 676, 246, '◄ PAM4 drivers', { size: 10.5, fill: cv('data') });
      T(g, 676, 166, 'heaters / mon-PDs', { size: 10.5, fill: cv('therm') });
      T(g, 676, 222, 'modulated comb ►', { size: 10.5, fill: cv('optic') });
      R(g, 300, 142, 420, 304, { fill: 'rgba(34,211,238,0.05)', stroke: cv('data'), sw: 1.2, dash: '6 5', rx: 8, dom: 'data' });
      T(g, 510, 290, 'EIC (CMOS) on top: drivers · TIAs · heater DACs · lock controller', { anchor: 'middle', size: 11, fill: cv('data'), op: 0.9 });
      T(g, 510, 306, 'hybrid-bonded (SoIC) — a few fF per connection', { anchor: 'middle', size: 10, fill: cv('muted') });
      R(g, 846, 104, 54, 270, { fill: '#1a2230', stroke: '#6b7f99', sw: 1.4, rx: 4, dom: 'mechanical' });
      T(g, 873, 392, 'FAU', { anchor: 'middle', size: 11, weight: 600, fill: cv('mech') });
      [130, 200, 345].forEach(y => Ci(g, 873, y, 5, { fill: '#0b0f14', stroke: '#9fb4cc', sw: 1.2 }));
      T(g, 906, 122, 'CW in (PMF)', { size: 10, fill: '#ffd9b0' });
      T(g, 906, 192, 'TX out (SMF)', { size: 10, fill: cv('optic') });
      T(g, 906, 337, 'RX in (SMF)', { size: 10, fill: cv('optic') });
      let acc = 0;
      c.loop(dt => { acc += dt; if (acc > 0.11 / MS) { acc = 0; for (let i = 0; i < 8; i++) rings[i].set(1 - lev[pam4()] * 0.8); } });
      const yb = 470;
      T(g, 24, yb + 6, 'Side view — COUPE-style stack (schematic)', { size: 12, weight: 600, fill: cv('muted') });
      R(g, 30, yb + 92, 940, 22, { fill: '#2b3a26', stroke: '#4c6040', rx: 3, dom: 'mechanical' });
      T(g, 40, yb + 107, 'package substrate', { size: 10, fill: '#a9c08f' });
      R(g, 40, yb + 30, 90, 56, { fill: '#1d2533', stroke: '#5b6b80', rx: 4 });
      T(g, 85, yb + 62, 'ASIC', { anchor: 'middle', size: 11, fill: cv('mech') });
      for (let x = 50; x < 125; x += 12) Ci(g, x, yb + 89, 3, { fill: '#c0c8d0' });
      R(g, 180, yb + 52, 600, 34, { fill: c.url('si'), stroke: '#5b6b80', rx: 2, dom: 'optics' });
      R(g, 180, yb + 52, 600, 6, { fill: '#26405e', op: 0.9, rx: 0 });
      beam(c, g, [[220, yb + 55], [830, yb + 55]], { color: cv('optic'), w: 2, speed: 90, halo: false });
      T(g, 190, yb + 78, 'PIC (Si substrate · BOX · 220 nm Si waveguides)', { size: 10, fill: cv('text'), op: 0.8 });
      for (let x = 200; x < 780; x += 18) Ci(g, x, yb + 89, 2.5, { fill: '#c0c8d0' });
      for (let x = 330; x < 640; x += 46) R(g, x, yb + 58, 4, 28, { fill: c.url('cu'), rx: 0, op: 0.85 });
      T(g, 652, yb + 78, 'TSVs', { size: 9.5, fill: '#f0a868' });
      R(g, 260, yb + 26, 380, 26, { fill: '#122634', stroke: cv('data'), sw: 1.2, rx: 2, dom: 'data' });
      T(g, 450, yb + 43, 'EIC — face-to-face Cu–Cu hybrid bond (µm pitch)', { anchor: 'middle', size: 10.5, fill: cv('data') });
      for (let x = 268; x < 636; x += 9) R(g, x, yb + 50, 4, 2.5, { fill: '#f0a868', rx: 0 });
      R(g, 800, yb + 38, 110, 40, { fill: '#1a2230', stroke: '#6b7f99', rx: 3, dom: 'mechanical' });
      T(g, 855, yb + 72, 'FAU / V-groove', { anchor: 'middle', size: 10, fill: cv('mech') });
      beam(c, g, [[830, yb + 55], [1000, yb + 55]], { color: cv('optic'), w: 2, speed: 90, halo: false });
      wire(c, g, [[130, yb + 95], [200, yb + 95]], { speed: 30 });
    },
    hotspots: [
      { target: 'mrm', x: 305, y: 145, w: 350, h: 50, label: 'Micro-ring modulators' },
      { target: 'wdm-mux', x: 320, y: 328, w: 360, h: 50, label: 'Ring WDM demux' },
      { target: 'photodetector', x: 330, y: 384, w: 340, h: 22, label: 'Ge photodetectors' },
      { target: 'fiber-coupler', x: 844, y: 100, w: 60, h: 280, label: 'Fiber coupler / FAU' },
      { target: 'waveguide', x: 200, y: 115, w: 95, h: 100, label: 'Si waveguide' },
      { target: 'eic', x: 255, y: 492, w: 390, h: 32, label: 'EIC (drivers, TIAs, control)' },
      { target: 'pic', x: 175, y: 524, w: 610, h: 34, label: 'PIC' },
      { target: 'external-laser', x: 905, y: 108, w: 95, h: 30, label: 'From external laser' },
      { target: 'fiber-plant', x: 905, y: 180, w: 95, h: 175, label: 'Fiber plant' }
    ]
  });

  // ---------------------------------------------------------------- signal helpers: scrolling PAM4 waveform & eye diagram
  function wave(c, p, x, y, w, h, o) {
    o = o || {};
    const lv = o.levels || 4, ui = o.ui || 16, n = Math.ceil(w / ui) + 3;
    const gen = o.gen || (() => (Math.random() * lv) | 0);
    const sy = []; for (let i = 0; i < n; i++) sy.push(gen());
    if (o.frame !== false) R(p, x, y, w, h, { fill: '#070b10', stroke: cv('line'), rx: 3 });
    const pl = el(p, 'polyline', { fill: 'none', stroke: o.color || cv('data'), 'stroke-width': o.sw || 1.6, filter: c.url('glow'), 'data-domain': o.dom || null });
    const st = { noise: o.noise || 0, map: o.map || (v => v / (lv - 1)), edge: o.edge || 0.35 };
    let off = 0;
    c.loop(dt => {
      off += (o.speed || 36) * MS * dt;
      while (off >= ui) { off -= ui; sy.shift(); sy.push(gen()); }
      const pts = [];
      for (let px = 0; px <= w; px += 2) {
        const s = (px + off) / ui, i = Math.floor(s), fr = s - i, tr = st.edge;
        const a = st.map(sy[i]), b = st.map(sy[Math.min(i + 1, n - 1)]);
        const v = fr < 1 - tr ? a : a + (b - a) * (0.5 - 0.5 * Math.cos(Math.PI * (fr - (1 - tr)) / tr));
        const yy = y + h - 4 - v * (h - 8) + (st.noise ? CPO.randn() * st.noise * h : 0);
        pts.push((x + px).toFixed(1) + ',' + clamp(yy, y + 1, y + h - 1).toFixed(1));
      }
      pl.setAttribute('points', pts.join(' '));
    });
    return st;
  }
  function eye(c, p, x, y, w, h, o) {
    o = o || {};
    const lv = o.levels || 4, N = o.n || 36;
    R(p, x, y, w, h, { fill: '#05080c', stroke: cv('line'), rx: 3 });
    const gg = grp(p, { 'data-domain': o.dom || null });
    const lines = [];
    for (let i = 0; i < N; i++) lines.push(el(gg, 'polyline', { fill: 'none', stroke: o.color || cv('data'), 'stroke-width': 1, opacity: 0.32 }));
    const st = { sig: o.sig != null ? o.sig : 0.025, isi: o.isi || 0, map: o.map || (v => v / (lv - 1)) };
    const sm = (u, A, Bv) => A + (Bv - A) * (0.5 + 0.5 * Math.sin(Math.PI * clamp(u, -0.5, 0.5)));
    function gen(pl) {
      const s = [0, 1, 2, 3].map(() => (Math.random() * lv) | 0);
      const lvl = k => st.map(s[k + 1]) * (1 - st.isi) + st.map(s[k]) * st.isi;
      const L0 = lvl(0), L1 = lvl(1), L2 = lvl(2), off = CPO.randn() * st.sig, pts = [];
      for (let k = 0; k <= 40; k++) {
        const t = -0.5 + 2 * k / 40;
        let v = t < 0.5 ? sm(t / 0.5, L0, L1) : sm((t - 1) / 0.5, L1, L2);
        v += off + CPO.randn() * st.sig * 0.25;
        pts.push((x + (t + 0.5) / 2 * w).toFixed(1) + ',' + clamp(y + h - 5 - v * (h - 10), y + 1, y + h - 1).toFixed(1));
      }
      pl.setAttribute('points', pts.join(' '));
    }
    lines.forEach(gen);
    let k = 0;
    c.loop(() => { for (let j = 0; j < 2; j++) { gen(lines[k]); k = (k + 1) % N; } });
    return st;
  }

  // ================================================================ EIC
  add({
    id: 'eic', parent: 'optical-engine', domain: 'data', level: 4,
    title: 'Electronic IC (EIC)',
    subtitle: 'CMOS driver / receiver / control die, 3D-stacked on the PIC',
    summary: 'The EIC is the electronic half of the optical engine: a CMOS die with a PAM4 modulator driver and a TIA receiver for every lane, plus the mixed-signal control that keeps every micro-ring on its wavelength (heater DACs, monitor ADCs, a small controller), temperature sensors and a management interface. It is bonded face-to-face onto the PIC so each driver sits micrometres above its ring.',
    what: '<p><b>TX per lane:</b> termination + ' + tip('CTLE') + ' for the short ASIC→OE substrate channel → optional ' + tip('CDR') + '/retimer → PAM4 level shaping (pre-distortion for the ring\'s Lorentzian) → segmented high-swing <b>MRM driver</b> (≈1–2 Vpp into ~10–20 fF) ' + B('typ') + '.</p>' +
      '<p><b>RX per lane:</b> Ge PD (on PIC) → shunt-feedback <b>TIA</b> → CTLE/VGA → linear output driver to the ASIC SerDes, which does the heavy DSP/FEC.</p>' +
      '<p><b>Control:</b> one heater DAC + monitor channel per ring, multiplexed ADCs, a lock state machine / microcontroller (sweep → acquire → track), junction bias, LDOs, temperature sensors and a register interface up to switch management (' + tip('CMIS') + '-like) ' + B('typ') + '.</p>' +
      '<p>Stacking via TSMC ' + tip('COUPE') + ' (SoIC) is NVIDIA-public ' + B('nv') + '; the EIC process node is not. Drivers often use stacked/cascoded or thick-oxide devices to reach 2 Vpp safely ' + B('typ') + '.</p>',
    needs: [
      'Driver swing ~1–2 Vpp with < 7 ps edges at ~113 GBd at minimum C·V² energy',
      'TIA input-referred noise ~2–3 µA rms over ~50 GHz',
      'Few-fF bond parasitics; matched lanes; low TX→RX crosstalk',
      'Quiet supplies with on-die decoupling; separate analog/digital rails',
      'Fine heater DACs (sub-pm tuning steps) and low-offset monitor ADCs',
      'Floor-planning for EIC heat sitting directly above the rings'
    ],
    interfaces: [
      { with: 'switch-asic SerDes', type: 'electrical', detail: 'Short-reach 200G PAM4 lanes via substrate' },
      { with: 'pic', type: 'electrical', detail: 'Hybrid-bond pads: ring drive, PD current, heaters, monitor PDs' },
      { with: 'control-plane', type: 'mgmt', detail: 'Registers, alarms, lock-loop firmware' },
      { with: 'power-delivery', type: 'power', detail: 'Core, analog and high-voltage driver rails' }
    ],
    kpis: [
      { name: 'Driver energy', value: '~0.3–1 pJ/bit', tag: 'typ', note: 'junction CV² itself is only tens of fJ' },
      { name: 'TIA noise', value: '2–3 µA rms', tag: 'typ' },
      { name: 'Driver swing', value: '1–2 Vpp', tag: 'typ' },
      { name: 'Hybrid-bond pitch', value: '≤ 9 µm', tag: 'typ', note: 'vs 40–50 µm micro-bumps' },
      { name: 'Lanes / EIC', value: '8 TX + 8 RX', tag: 'est', note: '1.6T at 200G/lane' }
    ],
    physics: '<div class="eq">CMOS dynamic power:  P = α · C · V² · f\nE/bit (PAM4, 2 b/sym): E ≈ α·C·V²/2\n  C = 15 fF, V = 1.5 V → C·V² = 34 fJ → ~9–13 fJ/bit at the junction\nPre-driver chain (fan-out ~4) multiplies by ~5–20× → 0.1–0.5 pJ/bit</div>' +
      '<p>Once parasitics are a few fF, the <b>load is the ring junction itself</b>; energy goes into pre-drivers and bias. That is why hybrid-bonded stacking (no pads, minimal ESD, no wire inductance) is a power feature, not just packaging.</p>',
    failures: [
      'Driver supply droop / ground bounce → level-dependent eye skew (RLM loss)',
      'TIA saturation at high received power → eye compression; AGC needed',
      'Heater DAC stuck / open heater → ring unlockable → lane down',
      'ESD/EOS on lightly protected stack-internal nodes during assembly',
      'EIC self-heating above rings → drift the lock loop must follow'
    ],
    monitoring: [
      'Per lane: monitor PD currents, heater codes, lock state, TIA RSSI → registers',
      'On-die thermal and supply monitors; firmware health counters',
      'PRBS generators/checkers and loopbacks for test and field diagnostics'
    ],
    scene(g, api) {
      const c = mk(g, api);
      title(g, 'EIC — per-lane datapaths + ring control (block level)', 'One TX and one RX lane shown; each EIC repeats these ×N lanes. Control blocks are shared.');
      const D = cv('data'), O = cv('optic'), V = cv('ctrl'), H = cv('therm');
      R(g, 20, 70, 960, 520, { fill: 'rgba(34,211,238,0.035)', stroke: '#1f3a48', rx: 10, dom: 'data' });
      T(g, 36, 96, 'TX lane', { size: 12, weight: 700, fill: D });
      const ty = 110, th = 62;
      chip(c, g, 40, ty, 100, th, 'ASIC bump', { color: '#5b6b80', sub: 'from SerDes TX', dom: 'data' });
      chip(c, g, 170, ty, 110, th, 'Term + CTLE', { color: D, sub: 'undo mm–cm trace', dom: 'data' });
      chip(c, g, 310, ty, 120, th, 'CDR / retimer', { color: D, sub: 'optional (arch-dep.)', dom: 'data' });
      R(g, 310, ty, 120, th, { stroke: D, dash: '4 4', rx: 8, sw: 1.2 });
      chip(c, g, 460, ty, 130, th, 'PAM4 shaping', { color: D, sub: 'pre-distortion · FFE', dom: 'data' });
      chip(c, g, 620, ty, 140, th, 'MRM driver', { color: D, sub: 'segmented, 1–2 Vpp', dom: 'data', glow: true });
      chip(c, g, 790, ty, 70, th, 'bond', { color: '#f0a868', sub: 'few fF', dom: 'mechanical' });
      const r1 = ringG(c, g, 920, ty + 31, 22, WL[2], { w: 5 });
      T(g, 920, ty + 72, 'MRM (on PIC)', { anchor: 'middle', size: 10, fill: O });
      [[140, 170], [280, 310], [430, 460], [590, 620], [760, 790], [860, 898]].forEach(([a, b]) => wire(c, g, [[a, ty + 31], [b, ty + 31]], { speed: 50, w: 2 }));
      wave(c, g, 170, ty + 74, 110, 34, { color: D, noise: 0.05, edge: 0.6 });
      wave(c, g, 460, ty + 74, 130, 34, { color: D, noise: 0.01, edge: 0.3, map: v => [0, 0.42, 0.72, 1][v] });
      wave(c, g, 620, ty + 74, 140, 34, { color: '#7ff0ff', noise: 0.01, edge: 0.3 });
      T(g, 690, ty + 122, 'non-uniform levels pre-compensate ring curvature', { anchor: 'middle', size: 9.5, fill: cv('muted') });
      const ry = 270;
      T(g, 36, ry - 14, 'RX lane', { size: 12, weight: 700, fill: D });
      chip(c, g, 40, ry, 100, th, 'ASIC bump', { color: '#5b6b80', sub: 'to SerDes RX', dom: 'data' });
      chip(c, g, 170, ry, 110, th, 'Output driver', { color: D, sub: 'linear', dom: 'data' });
      chip(c, g, 310, ry, 120, th, 'CTLE / VGA', { color: D, sub: 'gain, peaking', dom: 'data' });
      chip(c, g, 460, ry, 130, th, 'TIA', { color: D, sub: 'shunt-feedback, Rf', dom: 'data', glow: true });
      chip(c, g, 620, ry, 140, th, 'PD bias / DC-restore', { color: D, sub: 'RSSI monitor', dom: 'data', size: 12 });
      chip(c, g, 790, ry, 70, th, 'bond', { color: '#f0a868', sub: 'few fF', dom: 'mechanical' });
      R(g, 902, ry + 18, 36, 26, { fill: '#3a3f2a', stroke: '#c6d86a', rx: 3, dom: 'optics' });
      T(g, 920, ry + 36, 'Ge', { anchor: 'middle', size: 11, fill: '#e3f08a' });
      T(g, 920, ry + 72, 'PD (on PIC)', { anchor: 'middle', size: 10, fill: O });
      [[902, 860], [790, 760], [620, 590], [460, 430], [310, 280], [170, 140]].forEach(([a, b]) => wire(c, g, [[a, ry + 31], [b, ry + 31]], { speed: 50, w: 2 }));
      flow(c, g, [[1000, ry + 31], [938, ry + 31]], { n: 3, color: WL[2], r: 3, speed: 60 });
      wave(c, g, 460, ry + 74, 130, 34, { color: D, noise: 0.07, edge: 0.55 });
      wave(c, g, 170, ry + 74, 110, 34, { color: D, noise: 0.03, edge: 0.4 });
      const cy = 430;
      T(g, 36, cy - 12, 'Shared control & monitoring', { size: 12, weight: 700, fill: V });
      chip(c, g, 40, cy, 140, 70, 'Heater DACs', { color: H, sub: '1 per ring', dom: 'thermal' });
      chip(c, g, 200, cy, 150, 70, 'Monitor ADC mux', { color: cv('sense'), sub: 'mon-PD / RSSI / temp', dom: 'sensing' });
      chip(c, g, 370, cy, 170, 70, 'Lock controller', { color: V, sub: 'sweep → lock → track', dom: 'control', glow: true });
      chip(c, g, 560, cy, 130, 70, 'Temp sensors', { color: cv('sense'), sub: 'die / ring area', dom: 'sensing' });
      chip(c, g, 710, cy, 120, 70, 'Bias / LDOs', { color: cv('power'), sub: 'ring Vbias, rails', dom: 'power' });
      chip(c, g, 850, cy, 120, 70, 'Mgmt I/F', { color: V, sub: 'I²C/SPI → CMIS', dom: 'control' });
      const lp = [[920, ty + 53], [940, 215], [960, 230], [960, 410], [275, 410], [275, cy], [275, 520], [455, 520], [455, cy + 70], [110, 520], [110, 410], [30, 400], [30, 230], [880, 215], [905, 180]];
      Pa(g, ptsD(lp), { stroke: V, sw: 1, op: 0.25, dash: '3 5', dom: 'control' });
      flow(c, g, lp, { n: 14, color: V, r: 2.6, speed: 90, dom: 'control' });
      T(g, 500, 575, 'violet tokens: monitor PD → ADC → lock controller → heater DAC → heater (the wavelength-lock loop)', { anchor: 'middle', size: 11, fill: V });
      let acc = 0; c.loop(dt => { acc += dt; if (acc > 0.12) { acc = 0; r1.set(0.3 + 0.7 * Math.random()); } });
    },
    hotspots: [
      { target: 'mrm-driver', x: 615, y: 105, w: 150, h: 72, label: 'MRM driver' },
      { target: 'tia', x: 455, y: 265, w: 140, h: 72, label: 'TIA' },
      { target: 'eic-cdr', x: 305, y: 105, w: 130, h: 72, label: 'CDR / host interface' },
      { target: 'eic-3d-stack', x: 785, y: 105, w: 80, h: 230, label: '3D stacking (SoIC)' },
      { target: 'ring-lock-loop', x: 365, y: 425, w: 180, h: 80, label: 'Ring lock loop' },
      { target: 'heater', x: 35, y: 425, w: 150, h: 80, label: 'Heaters' }
    ]
  });

  // ================================================================ MRM DRIVER
  add({
    id: 'mrm-driver', parent: 'eic', domain: 'data', level: 5,
    title: 'MRM PAM4 driver',
    subtitle: 'Segmented high-swing driver + level pre-distortion',
    summary: 'The MRM driver turns two bits per symbol into one of four reverse-bias voltages across the ring\'s PN junction at ~113 GBd. Because the ring\'s optical response to voltage is curved (Lorentzian), equally spaced voltages give unequally spaced light levels; the driver deliberately spaces its voltages unevenly so the optical eye comes out even.',
    what: '<p>Electrically a ring modulator is a small capacitor (C_j ≈ 10–20 fF in series with ~100–300 Ω) ' + B('typ') + ' — a <b>lumped</b> load. The driver is a CMOS inverter-style stage with no 50 Ω termination and no traveling-wave line (unlike a Mach-Zehnder). That is the main reason MRM transmitters are ~10× lower power than MZM ones.</p>' +
      '<p><b>PAM4 options:</b> (1) <i>electrical DAC</i> — MSB and LSB inverter segments with 2:1 strength summed on one node; (2) <i>optical DAC</i> — the junction is split into two segments driven by separate NRZ drivers and the ring sums the phase shifts.</p>' +
      '<p><b>Swing:</b> efficiency is only ~20–50 pm/V while linewidth is ~0.1–0.3 nm, so 1–2 Vpp is needed ' + B('typ') + '. Sub-1 V FinFETs need <b>stacked (cascoded)</b> or thick-oxide output devices on split rails.</p>' +
      '<p><b>Shaping:</b> RLM ≳ 0.9 is required; pre-distortion sets level spacing and 2–3 FFE taps fight the ring\'s photon-lifetime bandwidth (τ = Q·λ/2πc ≈ 3–10 ps).</p>',
    needs: ['1–2 Vpp across ~15 fF with 10–90% edges < ~0.6 UI', 'Programmable level spacing and 2–3 tap FFE', 'Stable reverse DC bias (never forward-bias the junction)', 'Low supply impedance at 50+ GHz'],
    interfaces: [
      { with: 'eic shaping / CDR', type: 'electrical', detail: 'Low-swing PAM4 or MSB/LSB NRZ pair' },
      { with: 'mrm (PIC)', type: 'electrical', detail: 'Drives ring cathode via hybrid bond; anode at DC bias' },
      { with: 'ring-lock-loop', type: 'mgmt', detail: 'Level trims co-optimized with ring detuning set point' }
    ],
    kpis: [
      { name: 'Swing', value: '1–2 Vpp', tag: 'typ' }, { name: 'Load', value: '10–20 fF + 100–300 Ω', tag: 'typ' },
      { name: 'Energy', value: '~0.2–0.8 pJ/bit', tag: 'typ' }, { name: 'RLM target', value: '≥ 0.9–0.95', tag: 'typ' },
      { name: 'Ring photon lifetime', value: '3–10 ps', tag: 'typ' }
    ],
    physics: '<div class="eq">T(V) = 1 − (1 − Tmin) / (1 + [2(λL − λr(V))/FWHM]²)\nλr(V) = λr0 + (dλ/dV)·V,   dλ/dV ≈ 20–50 pm/V\nEqual ΔT spacing ⇒ solve T(Vk) = T0 + k·ΔT → voltage steps shrink toward resonance\nτ_RC = (R_on + R_s)·C_j ≈ (50+150 Ω)·15 fF = 3 ps → t10-90 ≈ 6.6 ps  (UI @113 GBd = 8.85 ps)</div>',
    failures: ['Level trims drift with temperature → RLM falls → inner-eye errors', 'Over-voltage on stacked devices during sequencing → oxide stress', 'Forward bias (bias error) → slow diffusion tails'],
    monitoring: ['Eye/RLM measured in production via tap PD; trims stored in NVM', 'Bias and driver supply-current monitors'],
    scene(g, api) {
      const c = mk(g, api);
      title(g, 'MRM PAM4 driver — bits → voltages → light', 'Electrical-DAC style segmented driver. Toggle pre-distortion to see why driver voltage levels are deliberately uneven.');
      const D = cv('data'), O = cv('optic');
      T(g, 30, 96, 'MSB (NRZ)', { size: 11, fill: D }); wave(c, g, 30, 104, 150, 30, { levels: 2, color: D, ui: 18, speed: 30 });
      T(g, 30, 160, 'LSB (NRZ)', { size: 11, fill: D }); wave(c, g, 30, 168, 150, 30, { levels: 2, color: '#7ff0ff', ui: 18, speed: 30 });
      const seg = (x, y, label, n, col) => {
        for (let i = 0; i < n; i++) {
          const yy = y + i * 34;
          Pa(g, 'M' + x + ',' + yy + 'L' + (x + 34) + ',' + (yy + 13) + 'L' + x + ',' + (yy + 26) + 'Z', { fill: '#0d1a22', stroke: col, sw: 1.4, dom: 'data' });
          Ci(g, x + 38, yy + 13, 3.5, { stroke: col, sw: 1.2 });
          Ln(g, x + 42, yy + 13, 330, yy + 13, { stroke: col, sw: 1.2, dom: 'data' });
        }
        T(g, x - 4, y - 6, label, { size: 10.5, fill: cv('muted') });
      };
      seg(220, 96, 'MSB ×2 cells', 2, D); seg(220, 186, 'LSB ×1 cell', 1, '#7ff0ff');
      wire(c, g, [[180, 120], [220, 109]], { anim: false }); wire(c, g, [[180, 120], [220, 143]], { anim: false }); wire(c, g, [[180, 184], [220, 199]], { anim: false });
      Ln(g, 330, 109, 330, 199, { stroke: D, sw: 2 });
      wire(c, g, [[330, 154], [400, 154]], { w: 2.2, speed: 60 });
      T(g, 222, 250, 'output-node sum: V = (2·MSB + LSB)/3 · Vpp', { size: 10.5, fill: cv('muted') });
      R(g, 400, 136, 26, 36, { fill: '#2a1720', stroke: O, rx: 3, dom: 'optics' });
      T(g, 413, 160, 'Cj', { anchor: 'middle', size: 11, fill: O });
      T(g, 413, 190, '~15 fF', { anchor: 'middle', size: 10, fill: cv('muted') });
      const rg = ringG(c, g, 470, 154, 26, WL[4], { w: 5 });
      T(g, 30, 292, 'Drive voltage across junction (reverse bias)', { size: 11.5, fill: D, weight: 600 });
      const st = { pd: true, v: [0, 0.667, 1.333, 2] };
      const Vs = () => st.pd ? st.vpd : st.v;
      const fw = 0.1, off = 0.09, slope = 0.03, Tmin = 0.1;
      const Tv = V => 1 - (1 - Tmin) * lorentz(off - slope * V, fw);
      const T0 = Tv(0), T3 = Tv(2);
      const solve = tgt => { let a = 0, b = 2; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (Tv(m) > tgt) a = m; else b = m; } return (a + b) / 2; };
      st.vpd = [0, solve(T0 + (T3 - T0) / 3), solve(T0 + 2 * (T3 - T0) / 3), 2];
      wave(c, g, 30, 300, 420, 110, { color: D, ui: 26, speed: 40, map: k => Vs()[k] / 2, edge: 0.32 });
      const P = plot(g, 560, 90, 380, 250, { x0: -0.2, x1: 2.4, y0: 0, y1: 1, xt: [0, 0.5, 1, 1.5, 2], yt: [0, 0.25, 0.5, 0.75, 1], xl: 'reverse bias V (volts)', yl: 'through-port T', ylo: 30 });
      P.line(Tv, { color: O, w: 2.4, glow: c.url('glow') });
      const marks = [0, 1, 2, 3].map(() => ({
        v: Ln(g, 0, 0, 0, 0, { stroke: D, sw: 1, dash: '3 3', op: 0.8 }),
        h: Ln(g, 0, 0, 0, 0, { stroke: WL[4], sw: 1.4, op: 0.9 }),
        d: Ci(g, 0, 0, 4.5, { fill: WL[4], filter: c.url('glow') }),
        t: T(g, 948, 0, '', { size: 10, mono: true, fill: WL[4] })
      }));
      const rd = readout(g, 560, 382, ['Voltage levels (V)', 'Optical levels (T)', 'RLM (min/avg eye)', 'ER'], { vx: 140 });
      function update() {
        const vs = Vs(), ts = vs.map(Tv);
        for (let k = 0; k < 4; k++) {
          const x = P.X(vs[k]), y = P.Y(ts[k]), m = marks[k];
          m.v.setAttribute('x1', x); m.v.setAttribute('x2', x); m.v.setAttribute('y1', P.Y(0)); m.v.setAttribute('y2', y);
          m.h.setAttribute('x1', x); m.h.setAttribute('x2', 940); m.h.setAttribute('y1', y); m.h.setAttribute('y2', y);
          m.d.setAttribute('cx', x); m.d.setAttribute('cy', y);
          m.t.setAttribute('y', y + 3); m.t.textContent = ts[k].toFixed(2);
        }
        const gaps = [ts[0] - ts[1], ts[1] - ts[2], ts[2] - ts[3]], avg = (ts[0] - ts[3]) / 3;
        rd(0, vs.map(v => v.toFixed(2)).join(' / '));
        rd(1, ts.map(v => v.toFixed(2)).join(' / '));
        const rlm = Math.min.apply(null, gaps) / avg;
        rd(2, rlm.toFixed(2), rlm > 0.9 ? cv('good') : cv('warn'));
        rd(3, (10 * Math.log10(ts[0] / ts[3])).toFixed(1) + ' dB');
      }
      const btn = button(c, g, 560, 470, 200, 'Pre-distortion: ON', b => { st.pd = !st.pd; b.label('Pre-distortion: ' + (st.pd ? 'ON' : 'OFF')); b.active(st.pd); update(); });
      btn.active(true);
      update();
      eqbox(g, 30, 440, 500, ['T(V) = 1 − (1−Tmin)/(1 + [2(λL − λr0 − kV)/FWHM]²)', 'k ≈ 30 pm/V · FWHM 0.10 nm · laser 90 pm red of λr0', 'E/bit ≈ α·Cj·Vpp²/2 ≈ 0.6·15fF·4V²/2 ≈ 18 fJ (junction only)', 'τ_RC = (Ron+Rs)·Cj ≈ 3 ps  ·  τ_photon = Qλ/2πc ≈ 3–7 ps']);
      let acc = 0; c.loop(dt => { acc += dt; if (acc > 0.1) { acc = 0; rg.set(0.25 + 0.75 * Math.random()); } });
    },
    hotspots: [
      { target: 'driver-circuit', x: 210, y: 85, w: 130, h: 135, label: 'Driver transistors' },
      { target: 'mrm', x: 440, y: 120, w: 60, h: 70, label: 'Ring modulator' }
    ]
  });

  // ================================================================ DRIVER CIRCUIT (transistor level)
  add({
    id: 'driver-circuit', parent: 'mrm-driver', domain: 'data', level: 6,
    title: 'Driver output stage — transistor level',
    subtitle: 'CMOS inverter charging the ring junction capacitance',
    summary: 'At the bottom of the driver is a CMOS inverter: a PMOS connects the output to the supply and an NMOS connects it to ground. When the PMOS turns on it charges the ring junction capacitance through its on-resistance; when the NMOS turns on it discharges it. Edge speed is set by RC, energy by C·V².',
    what: '<p>The final stage is large (R_on ≈ 30–80 Ω) and driven by a <b>tapered chain</b> of inverters, each ~3–4× bigger than the last (fan-out-of-4 minimizes delay). Each 0→1 transition draws Q = C·V from the supply: ½CV² is stored on the capacitor and ½CV² dissipated in the PMOS; the stored half is dissipated in the NMOS on the 1→0 edge.</p>' +
      '<p><b>High swing:</b> two stacked inverters on split rails (0…VDD and VDD…2VDD) with level-shifted gate drive give 2·VDD swing while each device sees only VDD ' + B('typ') + '.</p>' +
      '<p><b>Lumped vs distributed:</b> an MZM electrode is mm–cm long, a transmission line that must be terminated (≈V²/R burned continuously). A ring is ~30 µm around, far shorter than the electrical wavelength at 56 GHz, so it is a pure capacitor and only C·V²·f is spent. Distributed/segmented traveling-wave drivers are for MZMs, not MRMs.</p>',
    needs: ['R_on·C_j ≪ UI', 'Matched rise/fall (PMOS ~1.5–2× wider than NMOS)', 'Low-inductance supply loop with on-die decap at the stage'],
    interfaces: [{ with: 'mrm-junction', type: 'electrical', detail: 'Output → hybrid bond → ring cathode; anode at DC bias' }, { with: 'transistor', type: 'electrical', detail: 'FinFET device physics' }],
    kpis: [
      { name: 'R_on (final stage)', value: '30–80 Ω', tag: 'typ' }, { name: 't10–90 (RC)', value: '≈ 2.2·(Ron+Rs)·Cj ≈ 5–8 ps', tag: 'typ' },
      { name: 'UI @ 113 GBd', value: '8.85 ps', tag: 'typ' }, { name: 'Energy per 0→1', value: 'C·V² ≈ 15–60 fJ', tag: 'typ' }
    ],
    physics: '<div class="eq">v(t) = V·(1 − e^(−t/τ)),  τ = (R_on + R_s)·C_j\nEnergy from supply per 0→1: E = C·V²  (½ stored, ½ dissipated)\nI_D,sat ≈ ½·µCox·(W/L)·(V_GS − V_T)²     R_on ≈ 1/(µCox·(W/L)·(V_GS − V_T))\nwider W ⇒ lower R_on but more gate C for the pre-driver</div>',
    failures: ['BTI / hot-carrier aging shifts V_T → slower, asymmetric edges', 'Gate-oxide overstress if stacked-rail sequencing fails', 'Shoot-through current when both devices conduct → extra power and supply noise'],
    monitoring: ['Indirect: eye/RLM, supply current, temperature', 'Process monitors (ring oscillators) on the EIC'],
    scene(g, api) {
      const c = mk(g, api);
      title(g, 'CMOS output stage driving the ring junction', 'PMOS (top) charges and NMOS (bottom) discharges Cj; edge speed = RC.  Slider: final-stage width → R_on.');
      const D = cv('data'), O = cv('optic'), Pw = cv('power');
      const inv = (x, y, s, lab) => {
        Pa(g, 'M' + x + ',' + (y - s) + 'L' + (x + s * 1.6) + ',' + y + 'L' + x + ',' + (y + s) + 'Z', { fill: '#0d1a22', stroke: D, sw: 1.4, dom: 'data' });
        Ci(g, x + s * 1.6 + 3.5, y, 3.5, { stroke: D, sw: 1.2 });
        T(g, x + s * 0.6, y + s + 14, lab, { anchor: 'middle', size: 10, fill: cv('muted') });
      };
      wave(c, g, 20, 250, 70, 40, { levels: 2, color: D, ui: 24, speed: 26, edge: 0.15 });
      inv(100, 270, 9, '1×'); inv(140, 270, 13, '4×'); inv(190, 270, 18, '16×');
      Ln(g, 90, 270, 100, 270, { stroke: D }); Ln(g, 118, 270, 140, 270, { stroke: D }); Ln(g, 165, 270, 190, 270, { stroke: D });
      Ln(g, 232, 270, 330, 270, { stroke: D, sw: 1.6 });
      Ln(g, 330, 170, 330, 370, { stroke: D, sw: 1.6 });
      Ln(g, 330, 170, 380, 170, { stroke: D }); Ln(g, 330, 370, 380, 370, { stroke: D });
      Ln(g, 380, 140, 380, 200, { stroke: '#cbd5e1', sw: 2.5 }); Ci(g, 374, 170, 4, { stroke: '#cbd5e1', sw: 1.4, fill: '#0b0f14' });
      const pch = Ln(g, 392, 140, 392, 200, { stroke: '#cbd5e1', sw: 4 });
      Ln(g, 392, 145, 420, 145, { stroke: '#cbd5e1', sw: 1.6 }); Ln(g, 392, 195, 420, 195, { stroke: '#cbd5e1', sw: 1.6 });
      Ln(g, 420, 145, 420, 95, { stroke: Pw, sw: 1.6, dom: 'power' }); Ln(g, 380, 95, 470, 95, { stroke: Pw, sw: 2.5, dom: 'power' });
      T(g, 480, 99, 'VDD (or 2·VDD rail when stacked)', { size: 11, fill: Pw });
      T(g, 300, 150, 'PMOS', { size: 11, fill: cv('muted') });
      Ln(g, 380, 340, 380, 400, { stroke: '#cbd5e1', sw: 2.5 });
      const nch = Ln(g, 392, 340, 392, 400, { stroke: '#cbd5e1', sw: 4 });
      Ln(g, 392, 345, 420, 345, { stroke: '#cbd5e1', sw: 1.6 }); Ln(g, 392, 395, 420, 395, { stroke: '#cbd5e1', sw: 1.6 });
      Ln(g, 420, 395, 420, 450, { stroke: cv('muted'), sw: 1.6 }); Ln(g, 380, 450, 460, 450, { stroke: cv('muted'), sw: 2.5 });
      for (let i = 0; i < 3; i++) Ln(g, 400 + i * 6, 456 + i * 5, 440 - i * 6, 456 + i * 5, { stroke: cv('muted'), sw: 1.4 });
      T(g, 300, 375, 'NMOS', { size: 11, fill: cv('muted') });
      Ln(g, 420, 195, 420, 345, { stroke: D, sw: 1.6 }); Ci(g, 420, 270, 4, { fill: D });
      Ln(g, 420, 270, 520, 270, { stroke: D, sw: 1.6 });
      Pa(g, 'M520,270l6,-8l8,16l8,-16l8,16l8,-16l8,16l6,-8', { stroke: '#e2e8f0', sw: 1.5 });
      T(g, 552, 255, 'Rs ~150 Ω', { anchor: 'middle', size: 10.5, fill: cv('muted') });
      Ln(g, 582, 270, 640, 270, { stroke: D, sw: 1.6 });
      Ln(g, 640, 240, 640, 300, { stroke: O, sw: 3 }); Ln(g, 652, 240, 652, 300, { stroke: O, sw: 3 });
      T(g, 646, 228, 'Cj ≈ 15 fF', { anchor: 'middle', size: 11, fill: O });
      Ln(g, 652, 270, 700, 270, { stroke: cv('muted'), sw: 1.6 });
      T(g, 706, 274, 'Vbias (reverse)', { size: 11, fill: cv('muted') });
      const rg = ringG(c, g, 660, 350, 30, WL[4], { w: 5 });
      T(g, 660, 398, 'ring PN junction', { anchor: 'middle', size: 10, fill: O });
      const chg = flow(c, g, [[420, 100], [420, 270], [636, 270]], { n: 8, color: Pw, r: 3, speed: 160 });
      const dis = flow(c, g, [[636, 270], [420, 270], [420, 450]], { n: 8, color: '#7ff0ff', r: 3, speed: 160 });
      T(g, 560, 425, 'Output node vs input (5 bits, RC-limited)', { size: 11, fill: cv('muted') });
      const P = plot(g, 560, 440, 400, 120, { x0: 0, x1: 4, y0: -0.1, y1: 1.15, xt: [0, 1, 2, 3, 4], xf: v => v + ' UI', yt: [0, 1], yf: v => v ? 'V' : '0' });
      const lin = P.line([[0, 0]], { color: D, w: 1.4, op: 0.5, dash: '3 3' });
      const lout = P.line([[0, 0]], { color: O, w: 2.2, glow: c.url('glow') });
      const rd = readout(g, 30, 450, ['Final-stage R_on', 'τ = (Ron+Rs)·Cj', 't10–90 / UI', 'E per 0→1 (V=1.5)'], { vx: 160 });
      let tau = 3e-12;
      const s = slider(c, g, 30, 560, 220, { label: 'final-stage width (relative)', min: 0.25, max: 4, value: 1, color: D, fmt: v => v.toFixed(2) + '×', onchange: () => recompute() });
      function recompute() {
        const ron = 50 / s.v; tau = (ron + 150) * 15e-15;
        rd(0, ron.toFixed(0) + ' Ω'); rd(1, (tau * 1e12).toFixed(2) + ' ps');
        const r = 2.2 * tau / 8.85e-12; rd(2, (r * 100).toFixed(0) + ' %', r < 0.6 ? cv('good') : cv('bad'));
        rd(3, '34 fJ (+ pre-driver ∝ width)');
        const bits = [0, 1, 1, 0, 1], pin = [], pout = []; let v = 0;
        for (let i = 0; i <= 200; i++) {
          const t = i / 50, b = bits[Math.min(4, Math.floor(t))];
          pin.push([t, b]); v += (b - v) * (1 - Math.exp(-(8.85e-12 / 50) / tau)); pout.push([t, v]);
        }
        lin.update(pin); lout.update(pout);
      }
      recompute();
      let ph = 0, state = 0;
      c.loop(dt => {
        ph += dt * MS;
        if (ph > 0.9) { ph = 0; state ^= 1; }
        const on = state === 1;
        pch.setAttribute('stroke', on ? Pw : '#475569'); nch.setAttribute('stroke', on ? '#475569' : '#7ff0ff');
        const k = Math.exp(-ph / Math.max(0.05, tau * 1e11 * 0.6));
        chg.on = on && k > 0.05; dis.on = !on && k > 0.05;
        rg.set(on ? 1 - 0.7 * k : 0.3 + 0.7 * k);
      });
    },
    hotspots: [
      { target: 'transistor', x: 360, y: 330, w: 70, h: 80, label: 'Transistor physics (FinFET)' },
      { target: 'mrm-junction', x: 620, y: 220, w: 80, h: 190, label: 'PN junction (load)' }
    ]
  });

  // ================================================================ TIA
  add({
    id: 'tia', parent: 'eic', domain: 'data', level: 5,
    title: 'Trans-impedance amplifier (TIA)',
    subtitle: 'Shunt-feedback receiver front end: gain vs bandwidth vs noise',
    summary: 'The TIA converts the photodiode\'s tiny current (tens of µA) into a usable voltage. It is an inverting amplifier with a feedback resistor Rf: output ≈ −Rf·I. A bigger Rf gives more gain and less noise current, but the input capacitance then limits bandwidth — the central trade-off of every optical receiver.',
    what: '<p>Topology: a core amplifier of gain −A (inverter-based or common-source) with <b>Rf</b> (and a small Cf) from output to input. Feedback makes the input a low-impedance virtual node (Z_in ≈ Rf/(A+1)), hiding the PD + bond + gate capacitance <b>C_in</b> by (A+1).</p>' +
      '<p>With a finite amplifier bandwidth f_A the loop is second-order; Butterworth-tuned, f₀ ≈ √((A+1)·f_A / (2π·Rf·C_in)). Input noise has three parts: <b>Rf thermal</b> (4kT/Rf, flat), <b>e_n through C_in</b> (e_n·2πf·C_in, rising — integrated noise ∝ f³) and amplifier current noise. 3D stacking cuts C_in (no pad, no ESD) — a direct sensitivity win.</p>' +
      '<p>After the TIA, a CTLE/VGA and linear output driver return the signal to the ASIC SerDes. AGC / DC-restore keeps the TIA linear — PAM4 compression shows up as unequal eye heights.</p>',
    needs: ['Low C_in (PD ~10–30 fF + bond few fF + gate ~20–40 fF)', 'Bandwidth ≈ 0.5–0.6× baud (≈ 55–65 GHz at 113 GBd)', 'Linearity over the full received power range (AGC)', 'Isolation from TX driver aggressors'],
    interfaces: [{ with: 'photodetector', type: 'electrical', detail: 'PD via hybrid bond; PD bias from EIC' }, { with: 'eic CTLE/VGA → ASIC SerDes', type: 'electrical', detail: 'Differential linear PAM4 output' }],
    kpis: [
      { name: 'Transimpedance', value: '~50–65 dBΩ', tag: 'typ' }, { name: 'Bandwidth', value: '50–70 GHz', tag: 'typ' },
      { name: 'Input noise density', value: '10–20 pA/√Hz avg', tag: 'typ' }, { name: 'Integrated noise', value: '2–3 µA rms', tag: 'typ' },
      { name: 'Power', value: '~50–150 mW/lane incl. buffer', tag: 'est' }
    ],
    physics: '<div class="eq">Z_T(DC) = −Rf·A/(A+1)        Z_in ≈ Rf/(A+1)\nf_3dB ≈ √[(A+1)·f_A / (2π·Rf·C_in)]\ni_n²(f) = 4kT/Rf + (e_n·2πf·C_in)² + i_amp²\ni_rms² ≈ 4kT/Rf·B + e_n²(2πC_in)²·B³/3\nPAM4 sensitivity (3 eyes, Q≈3.5 @ BER 2.4e-4):  OMA ≈ 6·Q·i_rms / R</div>' +
      '<p>Example: Rf = 1 kΩ → 4.07 pA/√Hz; e_n = 1 nV/√Hz with C_in = 60 fF at 50 GHz gives 18.8 pA/√Hz — the capacitive term dominates at high frequency, which is why C_in is the most precious receiver parameter.</p>',
    failures: ['Compression at high OMA → inner-eye squeeze', 'Oscillation if Cf / phase margin mis-trimmed', 'Supply-coupled TX crosstalk', 'PD dark current rise at high temperature (minor)'],
    monitoring: ['RSSI: average PD current → RX power per lane', 'AGC gain code telemetry', 'Host SNR / pre-FEC BER'],
    scene(g, api) {
      const c = mk(g, api);
      title(g, 'Shunt-feedback TIA — the gain / bandwidth / noise triangle', 'Drag Rf: bandwidth and noise move in opposite directions. C_in = 60 fF, A = 8, f_A = 60 GHz, e_n = 1 nV/√Hz.');
      const D = cv('data'), O = cv('optic');
      Pa(g, 'M230,170L300,210L230,250Z', { fill: '#0d1a22', stroke: D, sw: 2, dom: 'data' });
      T(g, 252, 215, '−A', { size: 15, weight: 700, fill: D });
      Ln(g, 160, 210, 230, 210, { stroke: D, sw: 1.6 }); Ci(g, 160, 210, 4, { fill: D });
      Ln(g, 300, 210, 380, 210, { stroke: D, sw: 1.6 }); Ci(g, 380, 210, 4, { fill: D });
      T(g, 388, 214, 'Vout', { size: 12, fill: D });
      Ln(g, 160, 210, 160, 130, { stroke: D }); Ln(g, 340, 210, 340, 130, { stroke: D });
      Ln(g, 160, 130, 205, 130, { stroke: D }); Ln(g, 295, 130, 340, 130, { stroke: D });
      Pa(g, 'M205,130l7,-9l9,18l9,-18l9,18l9,-18l9,18l9,-18l9,18l7,-9', { stroke: '#e2e8f0', sw: 1.6 });
      const rfT = T(g, 250, 112, 'Rf', { anchor: 'middle', size: 12, fill: '#e2e8f0' });
      Ln(g, 160, 92, 235, 92, { stroke: D, op: 0.6 }); Ln(g, 265, 92, 340, 92, { stroke: D, op: 0.6 });
      Ln(g, 235, 82, 235, 102, { stroke: D, op: 0.6, sw: 2 }); Ln(g, 265, 82, 265, 102, { stroke: D, op: 0.6, sw: 2 });
      Ln(g, 160, 92, 160, 130, { stroke: D, op: 0.6 }); Ln(g, 340, 92, 340, 130, { stroke: D, op: 0.6 });
      T(g, 250, 78, 'Cf (few fF)', { anchor: 'middle', size: 10, fill: cv('muted') });
      Ln(g, 110, 210, 160, 210, { stroke: D });
      Pa(g, 'M110,230L95,255L125,255Z', { fill: '#3a3f2a', stroke: '#c6d86a', sw: 1.5 });
      Ln(g, 95, 230, 125, 230, { stroke: '#c6d86a', sw: 2 });
      Ln(g, 110, 210, 110, 230, { stroke: D }); Ln(g, 110, 255, 110, 290, { stroke: cv('power') });
      T(g, 88, 248, 'Ge PD', { size: 11, fill: '#e3f08a', anchor: 'end' });
      Ln(g, 140, 210, 140, 250, { stroke: D }); Ln(g, 128, 250, 152, 250, { stroke: O, sw: 2.5 }); Ln(g, 128, 258, 152, 258, { stroke: O, sw: 2.5 }); Ln(g, 140, 258, 140, 280, { stroke: cv('muted') });
      T(g, 158, 268, 'C_in', { size: 11, fill: O });
      flow(c, g, [[20, 170], [80, 225], [100, 240]], { n: 4, color: WL[3], r: 3, speed: 70 });
      flow(c, g, [[110, 232], [110, 210], [160, 210]], { n: 4, color: '#7ff0ff', r: 2.4, speed: 60 });
      T(g, 24, 160, 'photons', { size: 10.5, fill: WL[3] });
      T(g, 30, 312, 'photocurrent i_pd', { size: 11, fill: cv('muted') });
      wave(c, g, 30, 320, 180, 60, { color: '#c6d86a', ui: 18, speed: 30, noise: 0.02 });
      T(g, 240, 312, 'Vout (inverted, + noise, BW-limited)', { size: 11, fill: cv('muted') });
      const wo = wave(c, g, 240, 320, 180, 60, { color: D, ui: 18, speed: 30, noise: 0.05, map: v => 1 - v / 3 });
      const P = plot(g, 510, 80, 450, 240, { x0: 9, x1: 11.3, y0: 0, y1: 50, xt: [9, 10, 11], xf: v => (v === 9 ? '1' : v === 10 ? '10' : '100') + ' GHz', yt: [0, 10, 20, 30, 40, 50], xl: 'frequency (log)', yl: 'input noise  pA/√Hz', ylo: 30 });
      const k = 1.380649e-23, Tk = 300, Cin = 60e-15, en = 1e-9, A = 8, fA = 60e9, iamp = 3e-12;
      const nRf = P.line(() => 0, { color: cv('warn'), w: 1.6, dash: '5 4' });
      const nC = P.line(() => 0, { color: O, w: 1.6, dash: '5 4' });
      const nT = P.line(() => 0, { color: D, w: 2.6, glow: c.url('glow') });
      const bwL = Ln(g, 0, 80, 0, 320, { stroke: cv('good'), sw: 1.5, dash: '4 3' });
      const bwT = T(g, 0, 112, 'BW', { size: 10.5, fill: cv('good') });
      T(g, 520, 98, '— total', { size: 10.5, fill: D }); T(g, 580, 98, '- - 4kT/Rf', { size: 10.5, fill: cv('warn') }); T(g, 660, 98, '- - e_n·2πf·C_in', { size: 10.5, fill: O });
      const rd = readout(g, 510, 360, ['Transimpedance', 'Bandwidth f3dB', 'Rf noise density', 'Integrated noise i_rms', 'Est. PAM4 sens. (OMA)', 'BW vs need (~56 GHz)'], { vx: 175, lh: 20 });
      function recompute(Rf) {
        const th = 4 * k * Tk / Rf;
        const f3 = Math.min(Math.sqrt((A + 1) * fA / (2 * Math.PI * Rf * Cin)), 90e9);
        const dens = f => Math.sqrt(th + Math.pow(en * 2 * Math.PI * f * Cin, 2) + iamp * iamp);
        nRf.update(() => Math.sqrt(th) * 1e12);
        nC.update(lf => en * 2 * Math.PI * Math.pow(10, lf) * Cin * 1e12);
        nT.update(lf => dens(Math.pow(10, lf)) * 1e12);
        const x = P.X(Math.log10(f3)); bwL.setAttribute('x1', x); bwL.setAttribute('x2', x); bwT.setAttribute('x', x + 4);
        let s2 = 0; const Bn = 1.1 * f3, N = 400;
        for (let i = 0; i < N; i++) { const f = (i + 0.5) / N * Bn; s2 += Math.pow(dens(f), 2) * Bn / N; }
        const irms = Math.sqrt(s2), oma = 6 * 3.5 * irms / 0.9, zt = Rf * A / (A + 1);
        rd(0, zt.toFixed(0) + ' Ω  (' + (20 * Math.log10(zt)).toFixed(1) + ' dBΩ)');
        rd(1, (f3 / 1e9).toFixed(1) + ' GHz');
        rd(2, (Math.sqrt(th) * 1e12).toFixed(2) + ' pA/√Hz');
        rd(3, (irms * 1e6).toFixed(2) + ' µA rms');
        rd(4, (10 * Math.log10(oma * 1e3)).toFixed(1) + ' dBm  [est]');
        rd(5, f3 >= 50e9 ? 'OK — eye open' : 'too low → ISI', f3 >= 50e9 ? cv('good') : cv('bad'));
        rfT.textContent = 'Rf = ' + Rf.toFixed(0) + ' Ω';
        wo.noise = 0.02 + 0.04 * irms / 3e-6; wo.edge = clamp(0.25 + 0.5 * (50e9 / f3 - 0.7), 0.25, 0.95);
      }
      const s = slider(c, g, 60, 450, 360, { label: 'feedback resistor Rf', min: 200, max: 3000, value: 700, step: 10, color: D, fmt: v => v.toFixed(0) + ' Ω', onchange: recompute });
      recompute(s.v);
      eqbox(g, 30, 485, 450, ['f3dB ≈ √[(A+1)·f_A / (2π·Rf·C_in)]', 'i_n² = 4kT/Rf + (e_n·2πf·C_in)² + i_amp²', 'OMA_min ≈ 6·Q·i_rms / R   (Q≈3.5, R=0.9 A/W)'], { size: 12 });
    },
    hotspots: [
      { target: 'photodetector', x: 50, y: 220, w: 85, h: 50, label: 'Ge photodetector' },
      { target: 'transistor', x: 222, y: 165, w: 85, h: 90, label: 'Amplifier transistors' }
    ]
  });

  // ================================================================ EIC host interface / CDR
  add({
    id: 'eic-cdr', parent: 'eic', domain: 'data', level: 5,
    title: 'Host interface: linear vs retimed engine',
    subtitle: 'CTLE, CDR loops and where the DSP lives in CPO',
    summary: 'Between the ASIC SerDes and the optical engine there is only a short package-substrate channel. That lets the engine be "linear" — just equalize, amplify and drive — while the ASIC\'s 200G SerDes does clock recovery, DSP and FEC. A retimed engine adds a CDR in the EIC to clean jitter at a power cost. The choice for a given NVIDIA product is not public; both are shown.',
    what: '<p><b>Linear path:</b> SerDes TX FFE → substrate trace (~2–5 dB at Nyquist) → EIC CTLE → MRM driver → optics → far-end TIA → CTLE → far-end SerDes (DSP + FEC). Optics noise/distortion adds directly to the SerDes SNR budget, so every block must be linear and quiet. Lowest power.</p>' +
      '<p><b>Retimed path:</b> a ' + tip('CDR') + ' is a PLL on the data: <b>phase detector</b> (bang-bang/Alexander, Mueller-Müller for PAM4) → <b>loop filter</b> (Kp + Ki/s) → <b>phase interpolator / VCO</b> → sampler clock. Loop bandwidth ~baud/1000…/2000 (≈4–10 MHz) trades wander tracking against jitter filtering ' + B('typ') + '.</p>' +
      '<p>CPO\'s "63× better signal integrity" ' + B('nv') + ' comes from replacing a long lossy host channel (25–35 dB for pluggables) with a millimetre one, making the linear approach viable.</p>',
    needs: ['Short, low-reflection substrate channel', 'Linear, low-noise analog front ends', 'If retimed: low-jitter reference / PLL and PAM4 phase detector'],
    interfaces: [{ with: 'serdes', type: 'electrical', detail: 'Host lanes; link-training handshakes via management' }, { with: 'mrm-driver / tia', type: 'electrical', detail: 'Internal analog path' }],
    kpis: [
      { name: 'Host channel loss (CPO)', value: '~2–5 dB @ Nyquist', tag: 'est' },
      { name: 'Pluggable host channel', value: '~25–35 dB', tag: 'typ' },
      { name: 'CDR loop BW', value: '~4–10 MHz', tag: 'typ' },
      { name: 'Retimer/DSP power', value: '~3–6 pJ/bit', tag: 'typ', note: 'what CPO tries to avoid' }
    ],
    physics: '<div class="eq">CTLE: H(s) = A·(1 + s/ωz) / ((1 + s/ωp1)(1 + s/ωp2)),  peaking ≈ ωp1/ωz\nType-II CDR: ωn = √(Kpd·Kvco·Ki),  ζ = (Kp/2)·√(Kpd·Kvco/Ki)\nJitter transfer: low-pass (tracks wander); jitter tolerance: high-pass mask</div>',
    failures: ['Under-equalized channel → ISI eye closure', 'CDR cycle slip on large SJ / long run-lengths → bursts', 'Over-peaked CTLE amplifies crosstalk and noise'],
    monitoring: ['SerDes eye margin / SNR telemetry', 'CDR lock-detect flags', 'PRBS checkers for loopback tests'],
    scene(g, api) {
      const c = mk(g, api);
      title(g, 'Host interface — linear vs retimed', 'Eyes at each point: the short CPO substrate channel barely closes the eye, so a CTLE alone can reopen it.');
      const D = cv('data'), V = cv('ctrl');
      T(g, 30, 92, 'A. Linear engine (no CDR in OE)', { size: 13, weight: 700, fill: D });
      const y = 108;
      chip(c, g, 30, y, 120, 50, 'SerDes TX', { color: '#5b6b80', sub: 'FFE (ASIC)' });
      chip(c, g, 230, y, 150, 50, 'substrate trace', { color: '#a9c08f', sub: 'mm–cm, ~3 dB', dom: 'mechanical' });
      chip(c, g, 460, y, 110, 50, 'CTLE', { color: D, sub: 'EIC' });
      chip(c, g, 650, y, 130, 50, 'MRM driver', { color: D, sub: '→ optics' });
      [[150, 230], [380, 460], [570, 650], [780, 840]].forEach(([a, b]) => wire(c, g, [[a, y + 25], [b, y + 25]], { w: 2 }));
      eye(c, g, 160, y + 62, 120, 80, { color: D, sig: 0.02 });
      eye(c, g, 390, y + 62, 120, 80, { color: '#e9b44c', sig: 0.03, isi: 0.28 });
      eye(c, g, 600, y + 62, 120, 80, { color: cv('good'), sig: 0.035, isi: 0.05 });
      T(g, 220, y + 156, 'TX launch', { anchor: 'middle', size: 10.5, fill: cv('muted') });
      T(g, 450, y + 156, 'after channel (ISI)', { anchor: 'middle', size: 10.5, fill: cv('muted') });
      T(g, 660, y + 156, 'after CTLE', { anchor: 'middle', size: 10.5, fill: cv('muted') });
      T(g, 800, y + 90, 'Pluggable comparison:', { size: 10.5, fill: cv('warn') });
      T(g, 800, y + 106, '25–35 dB host loss →', { size: 10.5, fill: cv('warn') });
      T(g, 800, y + 122, 'needs DSP retimer', { size: 10.5, fill: cv('warn') });
      const yy = 330;
      T(g, 30, yy - 16, 'B. Retimed engine — CDR = phase-locked loop on the data', { size: 13, weight: 700, fill: V });
      chip(c, g, 40, yy + 30, 120, 60, 'data in', { color: D, sub: 'from CTLE' });
      chip(c, g, 230, yy + 30, 130, 60, 'Sampler', { color: D, sub: 'decide @ clk edge', glow: true });
      chip(c, g, 440, yy + 30, 150, 60, 'Phase detector', { color: V, sub: 'early / late', dom: 'control' });
      chip(c, g, 660, yy + 30, 140, 60, 'Loop filter', { color: V, sub: 'Kp + Ki/s', dom: 'control' });
      chip(c, g, 440, yy + 160, 150, 60, 'Phase interp. / VCO', { color: V, sub: 'recovered clock', dom: 'control' });
      chip(c, g, 840, yy + 30, 120, 60, 'retimed out', { color: cv('good'), sub: '→ driver' });
      wire(c, g, [[160, yy + 60], [230, yy + 60]], { w: 2 });
      wire(c, g, [[360, yy + 60], [440, yy + 60]], { w: 2 });
      wire(c, g, [[360, yy + 45], [380, yy + 45], [380, yy + 5], [900, yy + 5], [900, yy + 30]], { w: 1.6 });
      const lp = [[590, yy + 60], [660, yy + 60], [730, yy + 90], [730, yy + 190], [590, yy + 190], [440, yy + 190], [295, yy + 190], [295, yy + 90]];
      Pa(g, ptsD(lp), { stroke: V, sw: 1.8, op: 0.7, dom: 'control' });
      flow(c, g, lp, { n: 10, color: V, r: 3, speed: 80, dom: 'control' });
      const P = plot(g, 640, yy + 120, 320, 110, { x0: 0, x1: 10, y0: -1, y1: 1, yt: [-1, 0, 1], yf: v => v ? (v > 0 ? 'late' : 'early') : '0', xl: 'phase error: acquisition then tracking' });
      const hist = []; let ph = 0.9, integ = 0, t = 0;
      const pl = P.line([[0, 0]], { color: V, w: 1.8, glow: c.url('glow') });
      c.loop(dt => {
        t += dt * MS;
        const err = ph + 0.15 * Math.sin(t * 0.9) + 0.04 * CPO.randn(), bb = Math.sign(err);
        integ += 0.02 * bb; ph -= 0.035 * bb + 0.01 * integ; integ *= 0.995;
        hist.push(clamp(err, -1, 1)); if (hist.length > 200) hist.shift();
        if (t > 14) { t = 0; ph = (Math.random() > 0.5 ? 1 : -1) * 0.9; integ = 0; }
        pl.update(hist.map((v, i) => [i / 20, v]));
      });
    },
    hotspots: [
      { target: 'mrm-driver', x: 645, y: 103, w: 140, h: 60, label: 'MRM driver' },
      { target: 'serdes', x: 25, y: 103, w: 130, h: 60, label: 'ASIC SerDes' }
    ]
  });

  // ================================================================ EIC-on-PIC 3D STACK
  add({
    id: 'eic-3d-stack', parent: 'eic', domain: 'mechanical', level: 5,
    title: 'EIC-on-PIC 3D stacking (COUPE / SoIC)',
    subtitle: 'Hybrid bonding: µm-pitch Cu–Cu connections with few-fF parasitics',
    summary: 'Instead of wire-bonding or flip-chipping a driver chip next to the photonics, TSMC COUPE stacks the EIC face-to-face on the PIC using SoIC hybrid bonding: polished copper pads in oxide bond directly to each other. Connections become micrometre-scale, nearly parasitic-free and extremely dense — key enablers of low-power ring drive and low-noise receivers.',
    what: '<p><b>Process:</b> both surfaces get planarized oxide with recessed Cu pads; they are aligned, the oxides bond at room temperature, then an anneal (~200–400 °C) expands the Cu so pads fuse — no solder, no underfill ' + B('typ') + '. Pitch ≤ 9 µm class vs 40–50 µm micro-bumps and ~100+ µm C4 ' + B('typ') + '.</p>' +
      '<p><b>Signals:</b> driver → Cu pad → PIC metal → ring contact. Power/IO reach the package through <b>TSVs</b> in the PIC. EIC-on-PIC via SoIC is NVIDIA/TSMC-public ' + B('nv') + '; per-product details are not.</p>' +
      '<p><b>Optical I/O</b> leaves via an edge coupler + FAU or vertically via grating coupler + micro-lens ' + B('typ') + '. <b>Thermal:</b> EIC hotspots sit right over the rings, so EIC floor-planning becomes the rings\' resonance map.</p>',
    needs: ['Particle-free, sub-nm-flat bond surfaces (CMP)', 'Sub-µm overlay alignment', 'Known-good-die test before stacking', 'Thermal design for heat crossing the PIC'],
    interfaces: [{ with: 'eic', type: 'electrical', detail: 'Thousands of signal/power connections' }, { with: 'pic', type: 'electrical', detail: 'Ring junctions, heaters, PDs, monitor PDs' }, { with: 'package-substrate', type: 'electrical', detail: 'TSVs + bumps for power and host lanes' }],
    kpis: [
      { name: 'Bond pitch', value: '≤ 9 µm', tag: 'typ' }, { name: 'Parasitic C / connection', value: '~1–5 fF', tag: 'typ' },
      { name: 'Micro-bump C', value: '~20–50 fF', tag: 'typ' }, { name: 'Wire-bond', value: '~100–200 fF, ~1 nH/mm', tag: 'typ' },
      { name: 'Density @ 9 µm pitch', value: '~12k /mm²', tag: 'est', note: '(1000/9)²' }
    ],
    physics: '<div class="eq">Energy per transition  E = C_par·V²\n  wire-bond 150 fF → 150 fJ @1 V   µ-bump 30 fF → 30 fJ   hybrid bond 3 fF → 3 fJ\nDensity N/mm² = (1000 µm / pitch)²:  50 µm → 400 · 9 µm → 12,300 · 3 µm → 111,000</div>',
    failures: ['Bond voids from particles → opens (redundancy/repair)', 'Pad misalignment → resistance / shorts', 'CTE-mismatch stress in thermal cycling → delamination', 'Concentrated EIC heat over rings → high tuning power'],
    monitoring: ['Daisy-chain / Kelvin bond-yield structures', 'Post-stack lane BIST', 'Distributed EIC thermal sensors'],
    scene(g, api) {
      const c = mk(g, api);
      title(g, 'COUPE-style EIC-on-PIC stack — cross-section (schematic)', 'A driver pulse travels from an EIC transistor through a Cu–Cu hybrid bond into the ring junction a few µm below.');
      const D = cv('data'), O = cv('optic');
      R(g, 40, 90, 560, 70, { fill: '#122634', stroke: D, rx: 3, dom: 'data' });
      T(g, 50, 110, 'EIC silicon (thinned) — transistors face down', { size: 11, fill: D });
      R(g, 40, 160, 560, 40, { fill: '#17202c', stroke: '#2b3a50', rx: 0 });
      T(g, 50, 184, 'EIC BEOL (Cu interconnect)', { size: 10, fill: cv('muted') });
      R(g, 40, 200, 560, 14, { fill: '#1d3247', stroke: '#2b3a50', rx: 0 });
      for (let x = 52; x < 596; x += 18) R(g, x, 200, 10, 14, { fill: c.url('cu'), rx: 1 });
      T(g, 610, 212, '← Cu–Cu hybrid bond, pitch ≤ 9 µm', { size: 11, fill: '#f0a868' });
      R(g, 40, 214, 560, 40, { fill: '#17202c', stroke: '#2b3a50', rx: 0 });
      T(g, 50, 246, 'PIC BEOL (metals, TiN heater)', { size: 10, fill: cv('muted') });
      R(g, 40, 254, 560, 30, { fill: '#203247', stroke: '#2b3a50', rx: 0 });
      [180, 300].forEach(x => { R(g, x - 20, 262, 40, 16, { fill: '#7a8ca3', rx: 1 }); R(g, x - 40, 274, 38, 6, { fill: '#b44', op: 0.6, rx: 0 }); R(g, x + 2, 274, 38, 6, { fill: '#46c', op: 0.6, rx: 0 }); });
      const m1 = el(g, 'ellipse', { cx: 180, cy: 270, rx: 22, ry: 10, fill: c.url('mode'), opacity: 0.8 });
      const m2 = el(g, 'ellipse', { cx: 300, cy: 270, rx: 22, ry: 10, fill: c.url('mode'), opacity: 0.8 });
      T(g, 240, 300, 'ring (two cuts through the rib, PN junction)', { anchor: 'middle', size: 10, fill: O });
      R(g, 430, 262, 120, 14, { fill: '#7a8ca3', rx: 1 });
      beam(c, g, [[430, 269], [600, 269]], { color: O, w: 2, halo: false });
      T(g, 490, 300, 'bus / edge coupler →', { anchor: 'middle', size: 10, fill: O });
      R(g, 40, 284, 560, 26, { fill: c.url('ox'), stroke: '#2b3a50', rx: 0 });
      T(g, 50, 302, 'BOX (SiO2 ~2 µm)', { size: 10, fill: cv('muted') });
      R(g, 40, 310, 560, 90, { fill: c.url('si'), stroke: '#2b3a50', rx: 0 });
      T(g, 50, 380, 'PIC Si substrate', { size: 10, fill: cv('muted') });
      [100, 380, 520].forEach(x => R(g, x, 214, 10, 186, { fill: c.url('cu'), rx: 0, op: 0.85 }));
      T(g, 395, 360, 'TSVs (power / IO)', { size: 10, fill: '#f0a868' });
      for (let x = 60; x < 600; x += 36) Ci(g, x, 410, 8, { fill: '#cbd5e1', op: 0.85 });
      R(g, 30, 420, 580, 30, { fill: '#2b3a26', stroke: '#4c6040', rx: 3 });
      T(g, 40, 440, 'package substrate', { size: 10, fill: '#a9c08f' });
      const path = [[240, 120], [240, 150], [244, 160], [244, 214], [244, 250], [205, 262], [196, 270]];
      Pa(g, ptsD(path), { stroke: D, sw: 1.4, op: 0.4 });
      const tr = R(g, 225, 120, 30, 10, { fill: D, rx: 2, filter: c.url('glow') });
      T(g, 262, 130, 'driver FET', { size: 10, fill: D });
      flow(c, g, path, { n: 3, color: '#7ff0ff', r: 3.5, speed: 70 });
      let tt = 0;
      c.loop(dt => { tt += dt; const v = 0.5 + 0.5 * Math.sin(tt * 6); tr.setAttribute('opacity', (0.4 + 0.6 * v).toFixed(2)); m1.setAttribute('opacity', (0.45 + 0.5 * v).toFixed(2)); m2.setAttribute('opacity', (0.45 + 0.5 * v).toFixed(2)); });
      const bx = 660, by = 250;
      T(g, bx, by - 6, 'Parasitic C per connection [typical]', { size: 12, weight: 600 });
      const data = [['wire-bond', 150, cv('bad')], ['C4 bump', 80, cv('warn')], ['µ-bump 40 µm', 30, '#e9b44c'], ['hybrid bond', 3, cv('good')]];
      const bars = data.map((d, i) => {
        T(g, bx, by + 24 + i * 46, d[0], { size: 11, fill: cv('muted') });
        const b = R(g, bx, by + 30 + i * 46, 0, 14, { fill: d[2], rx: 3, op: 0.85 });
        T(g, bx + 300, by + 42 + i * 46, d[1] + ' fF → ' + d[1] + ' fJ @1V', { size: 10.5, mono: true, anchor: 'end', fill: d[2] });
        return [b, d[1]];
      });
      let grow = 0;
      c.loop(dt => { if (grow < 1) { grow = Math.min(1, grow + dt * 0.8); bars.forEach(([b, v]) => b.setAttribute('width', (Math.max(2, v / 150 * 230) * grow).toFixed(1))); } });
      eqbox(g, 640, 450, 340, ['E = C·V² per transition', 'density (1000/pitch)²: 9 µm → ~12k/mm²', 'no ESD-heavy pads inside the stack'], { size: 11 });
    },
    hotspots: [
      { target: 'mrm', x: 140, y: 256, w: 200, h: 30, label: 'Ring modulator' },
      { target: 'fiber-coupler', x: 425, y: 256, w: 175, h: 30, label: 'Edge coupler' },
      { target: 'package-substrate', x: 30, y: 418, w: 580, h: 34, label: 'Package substrate' }
    ]
  });

  // ================================================================ PIC
  add({
    id: 'pic', parent: 'optical-engine', domain: 'optics', level: 4,
    title: 'Photonic IC (PIC)',
    subtitle: 'SOI silicon photonics: waveguides, rings, WDM, Ge PDs, couplers, heaters',
    summary: 'The PIC is a silicon-on-insulator chip in which light is guided in 220 nm-thick silicon wires surrounded by glass. It carries every optical function of the engine: couplers to get light on and off the chip, waveguides to route it, micro-ring modulators and filters, germanium photodetectors, and small heaters that tune each ring onto its wavelength.',
    what: '<p><b>Platform:</b> 220 nm Si device layer on ~2 µm buried oxide (' + tip('BOX') + '), oxide top cladding, partial-etch (rib) and full-etch (strip) waveguides, several implant levels (P, P+, P++, N, N+, N++) for modulators, epitaxial Ge for detectors, a resistive heater layer (TiN or doped Si), and a Cu/Al BEOL — manufactured on 300 mm CMOS-style lines ' + B('typ') + '.</p>' +
      '<p><b>Signal flow:</b> CW comb enters (edge coupler) → bus waveguide → MRM row (modulate + multiplex) → output coupler. RX: input coupler → drop-ring demux → Ge PD. Taps and monitor PDs sit at key points for the control loops.</p>' +
      '<p><b>Design reality:</b> ±10 nm Si thickness / width variation shifts ring resonances by several nm across a wafer (dλ/dw ≈ 1 nm per nm of width for narrow waveguides) ' + B('typ') + ' — far more than the channel spacing — so every ring must be heated into place and the design must budget tuning power for worst-case process + temperature.</p><p>Silicon is TE-polarization-centric, and the O-band (~1310 nm) is used because fiber dispersion is near zero there and Si/Ge absorb well/poorly in the right places ' + B('typ') + '.</p>',
    needs: ['Low-loss waveguides (strip 1–3 dB/cm, rib < 1 dB/cm)', 'Tight CD/thickness control (resonance placement)', 'High-quality Ge epitaxy (low dark current, high responsivity)', 'Efficient, isolated heaters', 'Low-loss, alignment-tolerant fiber couplers'],
    interfaces: [{ with: 'eic', type: 'electrical', detail: 'Hybrid-bond pads to junctions, PDs, heaters' }, { with: 'fiber-plant / external-laser', type: 'optical', detail: 'Edge or grating couplers to FAU' }, { with: 'thermal-system', type: 'thermal', detail: 'Heat from EIC and heaters flows through PIC to cold plate' }],
    kpis: [
      { name: 'Si thickness', value: '220 nm', tag: 'typ' }, { name: 'BOX', value: '~2 µm', tag: 'typ' },
      { name: 'Strip WG loss', value: '1–3 dB/cm', tag: 'typ' }, { name: 'Ring radius', value: '5–10 µm', tag: 'typ' },
      { name: 'Ge PD responsivity', value: '0.8–1.0 A/W', tag: 'typ' }, { name: 'Coupler loss', value: '1–3 dB', tag: 'typ' }
    ],
    physics: '<div class="eq">Index contrast: n_Si ≈ 3.50, n_SiO2 ≈ 1.45 @1310 nm  → Δn ≈ 2 → tight bends (µm radius)\nThermo-optic: dn_Si/dT ≈ 1.8e-4 /K  → Δλ/ΔT ≈ (λ/n_g)·Γ·dn/dT ≈ 0.07–0.1 nm/K\nPlasma dispersion (Soref–Bennett, 1550 nm): Δn = −8.8e-22·ΔN_e − 8.5e-18·ΔN_h^0.8   (cm⁻³)</div>',
    failures: ['Wafer-level resonance spread exceeding heater range → yield loss', 'Ge defect-related dark current growth', 'Coupler facet damage/contamination', 'Heater electromigration at high current density'],
    monitoring: ['Monitor PDs, tap PDs, heater resistance (doubles as temperature sensor)', 'Wafer-level optical test (grating couplers) before stacking'],
    scene(g, api) {
      const c = mk(g, api);
      title(g, 'PIC — process stack and device library', 'Left: layers of an SOI photonics wafer.  Right: how the devices connect (click a device to drill down).');
      const O = cv('optic');
      // stack
      const L = [['oxide cladding + BEOL (Cu)', 90, 70, '#17202c'], ['heater (TiN)', 160, 8, cv('therm')], ['top oxide', 168, 30, '#1d2f45'], ['Ge (PD)', 198, 18, '#7d8a4a'], ['Si 220 nm (rib/strip, doped)', 216, 22, '#7a8ca3'], ['BOX SiO2 ~2 µm', 238, 60, '#1a2a3e'], ['Si handle substrate', 298, 120, '#2a3546']];
      L.forEach(([n, y, h, col]) => { R(g, 30, y, 330, h, { fill: col, rx: 0, op: 0.9 }); T(g, 366, y + h / 2 + 4, n, { size: 10.5, fill: cv('muted') }); });
      R(g, 80, 160, 60, 8, { fill: cv('therm'), rx: 0, filter: c.url('glow') });
      R(g, 70, 216, 80, 22, { fill: '#8fa3bb', rx: 0 }); R(g, 50, 228, 120, 10, { fill: '#6f8197', rx: 0 });
      R(g, 50, 228, 58, 10, { fill: '#c05050', op: 0.5, rx: 0 }); R(g, 112, 228, 58, 10, { fill: '#5070d0', op: 0.5, rx: 0 });
      el(g, 'ellipse', { cx: 110, cy: 227, rx: 30, ry: 12, fill: c.url('mode'), opacity: 0.85 });
      R(g, 220, 198, 60, 18, { fill: '#a6b85c', rx: 0 }); R(g, 210, 216, 80, 22, { fill: '#8fa3bb', rx: 0 });
      T(g, 110, 445, 'MRM (rib + PN)', { anchor: 'middle', size: 10, fill: O }); T(g, 250, 445, 'Ge-on-Si PD', { anchor: 'middle', size: 10, fill: '#c6d86a' });
      Ln(g, 110, 240, 110, 432, { stroke: O, dash: '2 3', op: 0.5 }); Ln(g, 250, 240, 250, 432, { stroke: '#c6d86a', dash: '2 3', op: 0.5 });
      // device flow
      const X0 = 520;
      chip(c, g, X0, 90, 110, 46, 'Edge coupler', { color: O, sub: 'CW comb in', dom: 'optics' });
      chip(c, g, X0 + 170, 90, 110, 46, 'Waveguide', { color: O, sub: 'strip / rib', dom: 'optics' });
      chip(c, g, X0 + 340, 90, 120, 46, 'MRM row', { color: O, sub: 'mod + mux', dom: 'optics', glow: true });
      chip(c, g, X0 + 340, 190, 120, 46, 'Heaters', { color: cv('therm'), sub: 'tune each ring', dom: 'thermal' });
      chip(c, g, X0 + 170, 190, 110, 46, 'Ring lock', { color: cv('ctrl'), sub: 'mon-PD feedback', dom: 'control' });
      chip(c, g, X0 + 340, 290, 120, 46, 'Output coupler', { color: O, sub: '→ TX fiber', dom: 'optics' });
      chip(c, g, X0, 400, 110, 46, 'Input coupler', { color: O, sub: '← RX fiber', dom: 'optics' });
      chip(c, g, X0 + 170, 400, 110, 46, 'WDM demux', { color: O, sub: 'drop rings', dom: 'optics', glow: true });
      chip(c, g, X0 + 340, 400, 120, 46, 'Ge PD array', { color: '#c6d86a', sub: '→ TIAs', dom: 'optics' });
      beam(c, g, [[X0 + 110, 113], [X0 + 170, 113]], { color: '#ffd9b0' }); beam(c, g, [[X0 + 280, 113], [X0 + 340, 113]], { color: '#ffd9b0' });
      beam(c, g, [[X0 + 400, 136], [X0 + 400, 150], [X0 + 470, 150], [X0 + 470, 313], [X0 + 460, 313]], { color: O });
      Ln(g, X0 + 400, 190, X0 + 400, 136, { stroke: cv('therm'), sw: 1.5, end: c.arrow(cv('therm')), dom: 'thermal' });
      Ln(g, X0 + 280, 213, X0 + 340, 213, { stroke: cv('ctrl'), sw: 1.5, end: c.arrow(cv('ctrl')), dom: 'control' });
      Ln(g, X0 + 380, 136, X0 + 260, 190, { stroke: cv('sense'), sw: 1.2, dash: '3 3', end: c.arrow(cv('sense')), dom: 'sensing' });
      beam(c, g, [[X0 + 110, 423], [X0 + 170, 423]], { color: '#ffd9b0' }); beam(c, g, [[X0 + 280, 423], [X0 + 340, 423]], { color: O });
      for (let k = 0; k < 8; k++) flow(c, g, [[X0 + 110, 423], [X0 + 170, 423], [X0 + 225, 423], [X0 + 340, 423 - 14 + k * 4]], { n: 3, color: WL[k], r: 2.4, speed: 70, phase: k / 8 });
      for (let k = 0; k < 8; k++) flow(c, g, [[X0 + 110, 113], [X0 + 340, 113], [X0 + 400, 113], [X0 + 400, 150], [X0 + 470, 150], [X0 + 470, 313], [X0 + 460, 313]], { n: 5, color: WL[k], r: 2.4, speed: 90, phase: k / 8 });
      eqbox(g, 520, 490, 440, ['n_Si 3.50 · n_SiO2 1.45 · dn/dT(Si) 1.8e-4 /K', 'resonance drift ≈ 0.07–0.1 nm/K  ⇒  every ring is actively locked'], { size: 11.5 });
    },
    hotspots: [
      { target: 'fiber-coupler', x: 515, y: 85, w: 120, h: 56, label: 'Edge coupler' },
      { target: 'waveguide', x: 685, y: 85, w: 120, h: 56, label: 'Waveguide' },
      { target: 'mrm', x: 855, y: 85, w: 130, h: 56, label: 'Micro-ring modulator' },
      { target: 'heater', x: 855, y: 185, w: 130, h: 56, label: 'Heater' },
      { target: 'ring-lock-loop', x: 685, y: 185, w: 120, h: 56, label: 'Lock loop' },
      { target: 'wdm-mux', x: 685, y: 395, w: 120, h: 56, label: 'WDM demux' },
      { target: 'photodetector', x: 855, y: 395, w: 130, h: 56, label: 'Photodetector' },
      { target: 'mrm-junction', x: 40, y: 212, w: 140, h: 30, label: 'PN junction' }
    ]
  });

  // ================================================================ MRM
  add({
    id: 'mrm', parent: 'pic', domain: 'optics', level: 5,
    title: 'Micro-ring modulator (MRM)',
    subtitle: 'Resonant PN-junction ring: modulator, WDM filter and wavelength selector in one',
    summary: 'A micro-ring is a ~5–10 µm-radius loop of silicon waveguide placed a couple of hundred nanometres from a straight bus. Light whose wavelength fits an integer number of times around the loop builds up inside it and is absorbed/cancelled, carving a sharp dip in the bus transmission. A PN junction in the ring changes its refractive index with voltage, sliding the dip back and forth across the laser line — that is modulation.',
    what: '<p><b>Structure:</b> rib waveguide ring (w ≈ 400–500 nm, slab ~90 nm) with a lateral or interleaved PN junction around most of its circumference; P++/N++ contacts on inner/outer slab; a heater (TiN or doped Si) over or inside the ring; an optional drop port / tap with a monitor PD for locking ' + B('typ') + '. Gap to bus ~150–250 nm sets coupling.</p>' +
      '<p><b>Operation:</b> in <b>depletion mode</b> the junction is reverse biased; more reverse voltage widens the depletion region, removes free carriers from the optical mode, raises n_eff (plasma dispersion) and <b>red-shifts</b> the resonance by ~20–50 pm/V. With the laser parked on the slope of the notch, the through-port power follows the voltage. Depletion is fast (RC- and photon-lifetime-limited, ~50+ GHz) because no minority carriers must recombine.</p>' +
      '<p><b>WDM for free:</b> each ring only interacts with wavelengths near its own resonance, so N rings with staggered resonances on one bus modulate N wavelengths independently — the modulator array is also the multiplexer ' + B('typ') + '.</p><p><b>Bandwidth limits:</b> photon lifetime τ = Q·λ/(2πc) (Q = 10k → 7 ps → ~23 GHz cavity BW!) and junction RC. 200G PAM4 therefore pushes toward lower loaded Q (3–6k), peaking from the cavity dynamics, and driver FFE.</p>',
    needs: ['Resonance aligned to laser within a few pm (heater + lock loop)', 'Loaded Q balanced between modulation efficiency and photon-lifetime bandwidth', 'Low-loss doping profile (free carriers absorb light)', 'Laser power below self-heating / two-photon-absorption bistability limits (~mW inside ring)'],
    interfaces: [{ with: 'mrm-driver', type: 'electrical', detail: 'PAM4 reverse-bias drive (1–2 Vpp)' }, { with: 'heater / ring-lock-loop', type: 'thermal', detail: 'Heater power sets resonance; monitor PD feeds controller' }, { with: 'waveguide (bus)', type: 'optical', detail: 'Evanescent coupling across ~200 nm gap' }],
    kpis: [
      { name: 'Radius', value: '5–10 µm', tag: 'typ' }, { name: 'Loaded Q', value: '3k–20k', tag: 'typ' },
      { name: 'FSR', value: '8–20 nm', tag: 'typ' }, { name: 'Modulation efficiency', value: '20–50 pm/V', tag: 'typ' },
      { name: 'Capacitance', value: '10–20 fF', tag: 'typ' }, { name: 'Thermal drift', value: '0.07–0.1 nm/K', tag: 'typ' },
      { name: 'Dynamic ER', value: '4–6 dB', tag: 'typ' }
    ],
    physics: '<div class="eq">Resonance: m·λ_res = n_eff·L,  L = 2πR        FSR = λ²/(n_g·L)\nThrough port (all-pass): T = (a² − 2ar·cosφ + r²)/(1 − 2ar·cosφ + a²r²),  φ = 2π·n_eff·L/λ\nQ_loaded ≈ π·n_g·L·√(ra)/(λ·(1−ra))      Finesse F = FSR/FWHM\nCritical coupling r = a → T(res) = 0</div>',
    failures: ['Thermal runaway / bistability at high optical power (self-heating red-shifts ring toward laser)', 'Resonance outside heater range (fab variation) → dead channel or barrel shift', 'Junction leakage / breakdown at high reverse bias', 'Adjacent-ring thermal crosstalk'],
    monitoring: ['Drop/tap monitor PD per ring → lock loop', 'Heater resistance & code', 'Lane BER/SNR from host'],
    scene(g, api) {
      const c = mk(g, api);
      title(g, 'Micro-ring modulator — top view (≈ R 5 µm, drawn enlarged)', 'Light that fits the ring builds up inside it (glow). The PN junction drive slides the resonance; the through-port power is modulated.');
      const O = cv('optic'), cx = 420, cy = 290, Rr = 150;
      // junction regions
      Ci(g, cx, cy, Rr + 22, { stroke: '#3b5bb5', sw: 26, op: 0.35, dom: 'optics' });
      Ci(g, cx, cy, Rr - 22, { stroke: '#b53b3b', sw: 26, op: 0.35, dom: 'optics' });
      T(g, cx, cy - Rr - 46, 'N (outer slab) → N++ contacts', { anchor: 'middle', size: 11, fill: '#7da0ff' });
      T(g, cx, cy - 30, 'P (inner) → P++ contact', { anchor: 'middle', size: 11, fill: '#ff8a8a' });
      for (let i = 0; i < 14; i++) { const a = Math.PI * (0.15 + 0.7 * i / 13) + Math.PI; Ci(g, cx + Math.cos(a) * (Rr + 40), cy + Math.sin(a) * (Rr + 40) * -1 + 0, 4, { fill: '#9fb4cc' }); }
      Ci(g, cx, cy, 16, { fill: '#9fb4cc', op: 0.8 });
      const rg = ringG(c, g, cx, cy, Rr, WL[4], { w: 10 });
      // heater arc
      Pa(g, 'M' + (cx - Rr * 0.7) + ',' + (cy - Rr * 0.7) + ' A' + Rr + ',' + Rr + ' 0 0 1 ' + (cx + Rr * 0.7) + ',' + (cy - Rr * 0.7), { stroke: cv('therm'), sw: 5, op: 0.6, dash: '10 4', dom: 'thermal' });
      T(g, cx + Rr * 0.8, cy - Rr * 0.8, 'heater (TiN)', { size: 11, fill: cv('therm') });
      // circulating photons
      const circ = []; for (let i = 0; i <= 72; i++) { const a = i / 72 * 2 * Math.PI; circ.push([cx + Rr * Math.cos(a), cy + Rr * Math.sin(a)]); }
      const cf = flow(c, g, circ, { n: 24, color: WL[4], r: 4, speed: 260 });
      // bus waveguide
      const by = cy + Rr + 14;
      beam(c, g, [[20, by], [980, by]], { color: '#ffd9b0', w: 4, speed: 80 });
      T(g, 30, by - 12, 'bus waveguide (CW in)', { size: 11, fill: '#ffd9b0' });
      T(g, cx, by + 26, 'gap ~200 nm (coupling κ)', { anchor: 'middle', size: 10.5, fill: cv('muted') });
      const out = [];
      for (let i = 0; i < 6; i++) out.push(Ci(g, 640 + i * 55, by, 6, { fill: WL[4], filter: c.url('glow2') }));
      T(g, 800, by + 30, 'through port: PAM4-modulated λ', { anchor: 'middle', size: 11, fill: WL[4] });
      // monitor tap
      beam(c, g, [[cx - 60, cy - Rr - 14], [cx + 200, cy - Rr - 14]], { color: WL[4], w: 2, op: 0.6, speed: 50 });
      R(g, cx + 200, cy - Rr - 24, 26, 20, { fill: '#3a3f2a', stroke: '#c6d86a', rx: 3 });
      T(g, cx + 232, cy - Rr - 10, 'monitor PD (drop tap)', { size: 10.5, fill: cv('sense') });
      // drive panel
      T(g, 680, 90, 'Junction drive (reverse V)', { size: 12, fill: cv('data'), weight: 600 });
      wave(c, g, 680, 98, 290, 54, { color: cv('data'), ui: 30, speed: 40, gen: () => c._sym != null ? c._sym : 0 });
      // inset cross-section
      R(g, 680, 175, 290, 120, { fill: '#0a0f16', stroke: cv('line'), rx: 6 });
      T(g, 690, 192, 'cross-section A–A′ (rib, lateral PN)', { size: 10.5, fill: cv('muted') });
      R(g, 700, 255, 250, 12, { fill: '#6f8197', rx: 0 }); R(g, 795, 225, 60, 42, { fill: '#8fa3bb', rx: 0 });
      R(g, 700, 255, 122, 12, { fill: '#c05050', op: 0.55, rx: 0 }); R(g, 828, 255, 122, 12, { fill: '#5070d0', op: 0.55, rx: 0 });
      const dep = R(g, 818, 225, 14, 42, { fill: '#e6edf5', op: 0.25, rx: 0 });
      el(g, 'ellipse', { cx: 825, cy: 248, rx: 34, ry: 18, fill: c.url('mode'), opacity: 0.7 });
      T(g, 825, 285, 'depletion width ∝ √(Vbi+V)', { anchor: 'middle', size: 10, fill: cv('muted') });
      const rd = readout(g, 680, 330, ['symbol', 'resonance shift', 'through-port level', 'ring buildup'], { vx: 130 });
      eqbox(g, 680, 420, 300, ['m·λ = n_eff·2πR', 'FSR = λ²/(n_g·2πR) ≈ 13.7 nm', 'Δλ/ΔV ≈ 30 pm/V (depletion)', 'Δλ/ΔT ≈ 0.08 nm/K (!)'], { size: 11.5 });
      const lev = [0.85, 0.66, 0.47, 0.3];
      c._sym = 0; let acc = 0, cur = 0;
      c.loop(dt => {
        acc += dt * MS;
        if (acc > 0.45) { acc = 0; c._sym = pam4(); }
        cur += (c._sym - cur) * Math.min(1, dt * 18);
        const T0 = lev[Math.round(cur)] != null ? lev[0] - (lev[0] - lev[3]) * cur / 3 : 0.5;
        rg.set(1 - T0); cf.g.setAttribute('opacity', (0.15 + 0.95 * (1 - T0)).toFixed(2));
        out.forEach(o => o.setAttribute('opacity', T0.toFixed(2)));
        dep.setAttribute('width', (8 + 6 * cur).toFixed(1)); dep.setAttribute('x', (825 - (8 + 6 * cur) / 2).toFixed(1));
        rd(0, String(c._sym) + ' (' + ['00', '01', '11', '10'][c._sym] + ' Gray)'); rd(1, '+' + (cur * 15).toFixed(0) + ' pm'); rd(2, T0.toFixed(2)); rd(3, (4 + 30 * (1 - T0)).toFixed(0) + '× input power');
      });
    },
    hotspots: [
      { target: 'ring-physics', x: 250, y: 120, w: 340, h: 60, label: 'Resonance physics (interactive)' },
      { target: 'mrm-junction', x: 680, y: 175, w: 290, h: 120, label: 'PN junction physics' },
      { target: 'heater', x: 520, y: 140, w: 120, h: 60, label: 'Heater' },
      { target: 'ring-lock-loop', x: 560, y: 100, w: 140, h: 40, label: 'Wavelength lock loop' },
      { target: 'waveguide', x: 20, y: 440, w: 260, h: 30, label: 'Bus waveguide' }
    ]
  });

  // ================================================================ RING PHYSICS (interactive)
  add({
    id: 'ring-physics', parent: 'mrm', domain: 'optics', level: 6,
    title: 'Ring resonator physics',
    subtitle: 'Resonance, FSR, Q, finesse, coupling regimes, PAM4 on the Lorentzian slope, thermal drift',
    summary: 'A ring is an optical cavity. Round-trip phase decides resonance; the self-coupling r and round-trip amplitude a decide how deep and narrow the notch is. Modulation is a tiny sideways shift of a narrow notch, so a 1 K temperature change (~80 pm) is bigger than the whole PAM4 swing (~45 pm). Use the sliders to feel this.',
    what: '<p>Let the field transmission of the bus-ring coupler be r (self) and κ (cross), r² + κ² = 1 (lossless coupler), and the ring round-trip amplitude a = 10^(−α_dB·L/20). The through-port power is the all-pass response below. At resonance (φ = 2πm) the circulating field interferes destructively with the bus field; if r = a (<b>critical coupling</b>) the cancellation is perfect and T → 0. r &gt; a is <b>under-coupled</b> (narrow, shallow), r &lt; a is <b>over-coupled</b> (broad, shallow-ish but higher bandwidth) — modulators are often slightly over-coupled for speed and low insertion loss at the "1" level.</p>' +
      '<p>The linewidth FWHM = λ/Q_loaded; the finesse F = FSR/FWHM tells how many round trips a photon makes (≈F/2π) and how much power builds up inside: P_circ/P_in = (1−r²)a / (1 − 2ar cosφ + a²r²) — tens of times at resonance, which is why ring self-heating and two-photon absorption matter at mW input powers.</p>' +
      '<p><b>PAM4 mapping:</b> the four drive voltages shift the notch by 0, ⅓, ⅔, 1 × ΔV·(dλ/dV). The laser sits on the notch slope, so it reads four transmission levels. Because the Lorentzian is curved, equally-spaced voltages give unequally-spaced light levels (see mrm-driver pre-distortion). The optimal laser detuning is roughly half a linewidth from resonance: maximum slope dT/dλ.</p>',
    needs: ['Notch width matched to drive shift (≈ 0.3–0.5 × FWHM shift per full swing)', 'Laser detuning held to ~±5 pm', 'Coupling gap controlled to ~±10 nm in fab'],
    interfaces: [{ with: 'mrm-junction', type: 'electrical', detail: 'Voltage → Δn_eff' }, { with: 'heater', type: 'thermal', detail: 'Temperature → Δn_eff' }],
    kpis: [
      { name: 'FSR (R=5 µm, n_g=4)', value: '13.7 nm', tag: 'typ' }, { name: 'FWHM @ Q=12k', value: '~0.11 nm', tag: 'typ' },
      { name: 'Finesse', value: '~100–150', tag: 'typ' }, { name: 'Thermal shift', value: '~0.08 nm/K', tag: 'typ' },
      { name: 'Photon lifetime', value: 'Q·λ/2πc ≈ 8 ps @ Q 12k', tag: 'typ' }
    ],
    physics: '<div class="eq">T(φ) = (a² − 2ar cosφ + r²) / (1 − 2ar cosφ + a²r²)\nφ = 2π(λ − λ_r)/FSR  (near a resonance)        FSR = λ²/(n_g·2πR)\nFWHM = FSR·(1 − ra)/(π·√(ra))    Q = λ/FWHM    F = FSR/FWHM\nλ_r(V,T) = λ_r0 + (dλ/dV)·V + (dλ/dT)·ΔT,   dλ/dT = (λ/n_g)·(∂n_eff/∂T) ≈ 0.08 nm/K</div>',
    failures: ['Detuning drift → ER collapse or level inversion', 'Laser locked on wrong side of notch → inverted, saturated eye', 'Q too high → photon-lifetime ISI; too low → weak modulation'],
    monitoring: ['Monitor PD level and dither-derived slope sign → lock loop'],
    scene(g, api) {
      const c = mk(g, api);
      title(g, 'Ring resonance — interactive', 'Top: 2 FSRs.  Bottom: zoom on one notch with PAM4 levels.  Sliders adjust drive swing, laser detuning, temperature and coupling.');
      const O = cv('optic'), Lc = WL[4];
      const FSR = 13.7, a = 0.99, kV = 0.03, kT = 0.08, lam0 = 1310;
      const st = { vpp: 1.5, det: 0.07, dT: 0, r: 0.985, sym: 0, cur: 0, drift: false, tt: 0 };
      const Tf = (dl, r) => ringT(2 * Math.PI * dl / FSR, a, r);
      const P1 = plot(g, 70, 74, 570, 150, { x0: 1294, x1: 1326, y0: 0, y1: 1.05, xt: [1296.3, 1310, 1323.7], xf: v => v.toFixed(1), yt: [0, 0.5, 1], xl: 'wavelength (nm)  — resonances one FSR apart', yl: 'T', ylo: 22 });
      const c1 = P1.line(() => 1, { color: O, w: 1.8, N: 1600, glow: c.url('glow') });
      const las1 = Ln(g, 0, 74, 0, 224, { stroke: Lc, sw: 1.6, dash: '4 3' });
      const fsrT = T(g, 0, 90, '', { size: 10.5, fill: cv('muted'), anchor: 'middle' });
      Ln(g, P1.X(1310), 92, P1.X(1323.7), 92, { stroke: cv('muted'), sw: 1, end: c.arrow(cv('muted')), start: c.arrow(cv('muted')) });
      const P2 = plot(g, 70, 290, 500, 260, { x0: -0.45, x1: 0.45, y0: 0, y1: 1.05, xt: [-0.4, -0.2, 0, 0.2, 0.4], xf: v => (v > 0 ? '+' : '') + v.toFixed(1), yt: [0, 0.25, 0.5, 0.75, 1], xl: 'λ − 1310 nm  (nm)', yl: 'through-port T', ylo: 30 });
      T(g, 75, 284, 'zoom ±0.45 nm', { size: 10.5, fill: cv('muted') });
      const ghosts = [0, 1, 2, 3].map(k => P2.line(() => 1, { color: O, w: 1, op: 0.25, N: 300 }));
      const cur = P2.line(() => 1, { color: O, w: 2.6, N: 300, glow: c.url('glow') });
      const las2 = Ln(g, 0, 290, 0, 550, { stroke: Lc, sw: 2, filter: c.url('glow') });
      const lasT = T(g, 0, 305, 'laser', { size: 10.5, fill: Lc });
      const dots = [0, 1, 2, 3].map(() => Ci(g, 0, 0, 4.5, { fill: Lc, filter: c.url('glow') }));
      const hl = [0, 1, 2, 3].map(() => Ln(g, 0, 0, 0, 0, { stroke: Lc, sw: 1, dash: '2 3', op: 0.7 }));
      // eye column
      R(g, 585, 290, 70, 260, { fill: '#05080c', stroke: cv('line'), rx: 3 });
      T(g, 620, 284, 'PAM4 out', { size: 10.5, anchor: 'middle', fill: cv('muted') });
      const bars = [0, 1, 2, 3].map(() => R(g, 592, 0, 56, 3, { fill: Lc, rx: 1, filter: c.url('glow') }));
      const live = Ci(g, 620, 0, 6, { fill: '#fff', filter: c.url('glow2') });
      // ring icon
      const ri = ringG(c, g, 925, 120, 32, Lc, { w: 6 });
      T(g, 925, 172, 'circulating power', { size: 10, anchor: 'middle', fill: cv('muted') });
      const bu = T(g, 925, 124, '', { size: 11, anchor: 'middle', mono: true, fill: '#fff' });
      // controls
      const X = 690, W = 200;
      const sV = slider(c, g, X, 90, W, { label: 'PAM4 drive swing Vpp', min: 0, max: 2.5, value: st.vpp, color: cv('data'), fmt: v => v.toFixed(2) + ' V', onchange: v => { st.vpp = v; } });
      const sD = slider(c, g, X, 140, W, { label: 'laser detuning from λr0', min: -0.3, max: 0.3, value: st.det, color: Lc, fmt: v => (v * 1000).toFixed(0) + ' pm', onchange: v => { st.det = v; } });
      const sT = slider(c, g, X, 190, W, { label: 'ring temperature change ΔT', min: -2, max: 2, value: 0, step: 0.01, color: cv('therm'), fmt: v => v.toFixed(2) + ' K', onchange: v => { st.dT = v; } });
      const sR = slider(c, g, X, 240, W, { label: 'self-coupling r (a = 0.990)', min: 0.95, max: 0.999, value: st.r, step: 0.0005, color: O, fmt: v => v.toFixed(4), onchange: v => { st.r = v; } });
      const bD = button(c, g, X, 262, W, 'Simulate ASIC thermal drift', b => { st.drift = !st.drift; b.active(st.drift); if (!st.drift) { st.dT = 0; sT.set(0, true); } });
      const rd = readout(g, X, 312, ['FSR', 'FWHM', 'Q (loaded)', 'Finesse', 'Coupling', 'Photon lifetime', 'Swing shift / FWHM', 'ER (L0/L3)', 'IL at top level', 'Thermal shift', 'Level spacing'], { vx: 128, lh: 21 });
      void sV; void sD; void sR;
      let acc = 0, lastKey = '';
      c.loop(dt => {
        acc += dt * MS; st.tt += dt * MS;
        if (acc > 0.35) { acc = 0; st.sym = pam4(); }
        st.cur += (st.sym - st.cur) * Math.min(1, dt * 14);
        if (st.drift && sT.idle()) { st.dT = 1.1 * Math.sin(st.tt * 0.5) + 0.25 * Math.sin(st.tt * 1.7); sT.set(st.dT, true); }
        const r = st.r, ra = r * a, fwhm = FSR * (1 - ra) / (Math.PI * Math.sqrt(ra)), Q = lam0 / fwhm;
        const lr0 = kT * st.dT; // resonance offset (nm) of symbol 0
        const shiftOf = k => lr0 + kV * st.vpp * k / 3;
        const key = [r, st.vpp, st.det, st.dT.toFixed(3)].join('|');
        if (key !== lastKey) {
          lastKey = key;
          c1.update(l => Tf(l - lam0 - lr0, r));
          ghosts.forEach((gh, k) => gh.update(x => Tf(x - shiftOf(k), r)));
          las1.setAttribute('x1', P1.X(lam0 + st.det)); las1.setAttribute('x2', P1.X(lam0 + st.det));
          fsrT.setAttribute('x', (P1.X(1310) + P1.X(1323.7)) / 2); fsrT.textContent = 'FSR = ' + FSR + ' nm';
          const lx = P2.X(clamp(st.det, -0.45, 0.45)); las2.setAttribute('x1', lx); las2.setAttribute('x2', lx); lasT.setAttribute('x', lx + 4);
          const ts = [0, 1, 2, 3].map(k => Tf(st.det - shiftOf(k), r));
          ts.forEach((t, k) => {
            const y = P2.Y(t); dots[k].setAttribute('cx', lx); dots[k].setAttribute('cy', y);
            hl[k].setAttribute('x1', lx); hl[k].setAttribute('x2', 585); hl[k].setAttribute('y1', y); hl[k].setAttribute('y2', y);
            bars[k].setAttribute('y', (y - 1.5).toFixed(1));
          });
          const regime = Math.abs(r - a) < 0.0012 ? 'critical' : r > a ? 'under-coupled' : 'over-coupled';
          rd(0, FSR.toFixed(1) + ' nm'); rd(1, (fwhm * 1000).toFixed(0) + ' pm'); rd(2, (Q / 1000).toFixed(1) + 'k');
          rd(3, (FSR / fwhm).toFixed(0)); rd(4, regime, regime === 'critical' ? cv('good') : cv('accent'));
          rd(5, (Q * lam0 * 1e-9 / (2 * Math.PI * 3e8) * 1e12).toFixed(1) + ' ps');
          rd(6, (kV * st.vpp / fwhm).toFixed(2));
          const mx = Math.max.apply(null, ts), mn = Math.min.apply(null, ts);
          const er = 10 * Math.log10(mx / Math.max(mn, 1e-4));
          rd(7, er.toFixed(1) + ' dB', er > 3.5 ? cv('good') : cv('bad'));
          rd(8, (-10 * Math.log10(Math.max(mx, 1e-4))).toFixed(1) + ' dB');
          rd(9, (kT * st.dT * 1000).toFixed(0) + ' pm = ' + (kT * Math.abs(st.dT) / fwhm).toFixed(2) + '·FWHM', Math.abs(kT * st.dT) > fwhm * 0.25 ? cv('bad') : cv('accent'));
          const sorted = ts.slice().sort((x, y) => y - x), gaps = [sorted[0] - sorted[1], sorted[1] - sorted[2], sorted[2] - sorted[3]];
          const ok = ts[0] > ts[1] && ts[1] > ts[2] && ts[2] > ts[3];
          rd(10, ok ? 'RLM ' + (Math.min.apply(null, gaps) / ((sorted[0] - sorted[3]) / 3 || 1)).toFixed(2) : 'levels folded!', ok ? cv('accent') : cv('bad'));
        }
        cur.update(x => Tf(x - (lr0 + kV * st.vpp * st.cur / 3), r));
        const tl = Tf(st.det - (lr0 + kV * st.vpp * st.cur / 3), r);
        live.setAttribute('cy', P2.Y(tl).toFixed(1));
        const phi = 2 * Math.PI * (st.det - (lr0 + kV * st.vpp * st.cur / 3)) / FSR;
        const build = (1 - r * r) * a / (1 - 2 * a * r * Math.cos(phi) + a * a * r * r);
        ri.set(clamp(build / 40, 0.05, 1)); bu.textContent = build.toFixed(0) + '×';
      });
    },
    hotspots: [
      { target: 'mrm-junction', x: 690, y: 70, w: 200, h: 34, label: 'Why voltage shifts λ (PN junction)' },
      { target: 'ring-lock-loop', x: 690, y: 170, w: 200, h: 34, label: 'Fighting thermal drift (lock loop)' }
    ]
  });

  // ================================================================ PN JUNCTION / plasma dispersion
  add({
    id: 'mrm-junction', parent: 'mrm', domain: 'optics', level: 7,
    title: 'PN junction & plasma dispersion',
    subtitle: 'How a reverse-bias voltage changes silicon\'s refractive index',
    summary: 'Free electrons and holes lower silicon\'s refractive index and absorb a little light (the free-carrier plasma effect). A reverse-biased PN junction sweeps carriers out of a depletion region whose width grows with voltage. Placing that region where the optical mode is strongest turns voltage into index change — and hence resonance shift.',
    what: '<p><b>Plasma dispersion (Soref & Bennett):</b> at 1550 nm Δn = −8.8×10⁻²² ΔN_e − 8.5×10⁻¹⁸ ΔN_h^0.8 and Δα = 8.5×10⁻¹⁸ ΔN_e + 6.0×10⁻¹⁸ ΔN_h (cm⁻¹); at 1310 nm the index coefficients are somewhat smaller (∝ λ² Drude scaling) ' + B('typ') + '. Holes give more index change per unit absorption, so P-side doping is often placed at the mode centre.</p>' +
      '<p><b>Depletion:</b> W = √(2ε_Si(V_bi+V_R)(N_A+N_D)/(q N_A N_D)). With N_A = N_D = 2×10¹⁸ cm⁻³, V_bi ≈ 0.95 V: W ≈ 36 nm at 0 V, ≈ 62 nm at 2 V reverse. Carriers removed from the extra ~25 nm (×220 nm height) region change n_eff by ~10⁻⁴, i.e. Δλ = λ·Δn_eff/n_g ≈ 30 pm.</p>' +
      '<p><b>Trade-off:</b> heavier doping → thinner depletion and more carriers moved per volt (higher efficiency, more capacitance) but more free-carrier loss (lower Q). Interleaved/U-shaped/vertical junctions increase mode overlap ' + B('typ') + '. Capacitance per length C\' = ε·h/W ≈ 0.5–0.7 fF/µm → a 25 µm junction ≈ 15 fF.</p>',
    needs: ['Doping 1e17–5e18 cm⁻³ with precise junction placement (±20 nm) relative to the mode', 'Low-resistance contacts (series R limits RC bandwidth)', 'Reverse bias only (no diffusion capacitance)'],
    interfaces: [{ with: 'driver-circuit', type: 'electrical', detail: 'Junction is the driver load (C_j + R_s)' }, { with: 'ring-physics', type: 'optical', detail: 'Δn_eff → Δλ_res' }],
    kpis: [{ name: 'Depletion width', value: '30–70 nm', tag: 'typ' }, { name: 'V_πL equivalent', value: '~1–2 V·cm', tag: 'typ' }, { name: 'C per length', value: '0.5–0.7 fF/µm', tag: 'typ' }, { name: 'Δn_eff per V', value: '~3–5×10⁻⁵ /V', tag: 'est' }],
    physics: '<div class="eq">W(V) = √[ 2ε(V_bi + V_R)(N_A + N_D) / (q·N_A·N_D) ]\nC_j\' = ε·h / W            V_bi = (kT/q)·ln(N_A·N_D/n_i²)\nΔn_eff ≈ Γ_dep · Δn_Si      Δλ_res = λ·Δn_eff / n_g</div>',
    failures: ['Junction misplacement (implant overlay) → lower efficiency, chip-to-chip spread', 'Reverse breakdown/leakage at high V', 'Forward excursions → slow carrier injection tails'],
    monitoring: ['Junction leakage current measurable in EIC', 'Modulation efficiency verified by resonance-vs-bias sweep at test'],
    scene(g, api) {
      const c = mk(g, api);
      title(g, 'Lateral PN junction in a Si rib — depletion under reverse bias', 'Drag the bias. Depletion (no carriers) widens under the optical mode → n_eff rises → resonance red-shifts.');
      const x0 = 120, x1 = 880, xm = 500, ys = 300, sl = 50, rb = 150, rw = 220;
      R(g, 60, 120, 880, 290, { fill: '#0d1622', rx: 0 });
      T(g, 70, 140, 'SiO2 cladding', { size: 11, fill: cv('muted') });
      R(g, 60, ys + sl, 880, 60, { fill: '#1a2a3e', rx: 0 }); T(g, 70, ys + sl + 34, 'BOX', { size: 11, fill: cv('muted') });
      const ry = ys - rb + sl;
      Pa(g, 'M' + x0 + ',' + (ys) + 'L' + (xm - rw / 2) + ',' + ys + 'L' + (xm - rw / 2) + ',' + ry + 'L' + (xm + rw / 2) + ',' + ry + 'L' + (xm + rw / 2) + ',' + ys + 'L' + x1 + ',' + ys + 'L' + x1 + ',' + (ys + sl) + 'L' + x0 + ',' + (ys + sl) + 'Z', { fill: '#7a8ca3', op: 0.25, stroke: '#9fb4cc', sw: 1.2 });
      const pReg = R(g, x0, ry, 0, ys + sl - ry, { fill: '#c04848', op: 0.35, rx: 0 });
      const nReg = R(g, 0, ry, 0, ys + sl - ry, { fill: '#4868c8', op: 0.35, rx: 0 });
      const dReg = R(g, 0, ry, 0, ys + sl - ry, { fill: '#e6edf5', op: 0.1, rx: 0, stroke: '#e6edf5', dash: '3 3' });
      R(g, x0, ys, 90, sl, { fill: '#ff5050', op: 0.6, rx: 0 }); R(g, x1 - 90, ys, 90, sl, { fill: '#5070ff', op: 0.6, rx: 0 });
      T(g, x0 + 45, ys + 32, 'P++', { anchor: 'middle', size: 12, weight: 700 }); T(g, x1 - 45, ys + 32, 'N++', { anchor: 'middle', size: 12, weight: 700 });
      R(g, x0 + 20, ys - 90, 50, 90, { fill: '#9fb4cc', rx: 0, op: 0.7 }); R(g, x1 - 70, ys - 90, 50, 90, { fill: '#9fb4cc', rx: 0, op: 0.7 });
      T(g, x0 + 45, ys - 100, 'anode (bias)', { anchor: 'middle', size: 10.5, fill: cv('muted') }); T(g, x1 - 45, ys - 100, 'cathode ← driver', { anchor: 'middle', size: 10.5, fill: cv('data') });
      el(g, 'ellipse', { cx: xm, cy: (ry + ys + sl) / 2 + 5, rx: 170, ry: 80, fill: c.url('mode'), opacity: 0.55, 'pointer-events': 'none' });
      T(g, xm, ry - 10, 'optical mode |E|² (TE)', { anchor: 'middle', size: 11, fill: cv('optic') });
      T(g, xm, 108, 'scale: rib 450 nm wide × 220 nm, slab 90 nm (drawn ×~1500)', { anchor: 'middle', size: 10.5, fill: cv('muted') });
      // carriers
      const holes = [], elec = [];
      for (let i = 0; i < 46; i++) {
        holes.push({ x: x0 + 100 + Math.random() * (xm - x0 - 100), y: ry + 10 + Math.random() * (ys + sl - ry - 20), e: T(g, 0, 0, '+', { size: 13, weight: 700, fill: '#ff9a9a', anchor: 'middle' }) });
        elec.push({ x: xm + Math.random() * (x1 - 100 - xm), y: ry + 10 + Math.random() * (ys + sl - ry - 20), e: T(g, 0, 0, '−', { size: 15, weight: 700, fill: '#9ab4ff', anchor: 'middle' }) });
      }
      // plot of W and Δλ vs V
      const P = plot(g, 110, 455, 360, 110, { x0: 0, x1: 3, y0: 0, y1: 100, xt: [0, 1, 2, 3], yt: [0, 50, 100], xl: 'reverse bias V_R (V)', yl: 'W (nm)', ylo: 28 });
      const eps = 11.7 * 8.854e-14, q = 1.602e-19, Vbi = 0.95;
      const Wnm = (V, N) => Math.sqrt(2 * eps * (Vbi + V) * (2 * N) / (q * N * N)) * 1e7;
      const st = { N: 2e18, V: 1 };
      const wl = P.line(V => Wnm(V, st.N), { color: cv('accent'), w: 2 });
      const md = Ci(g, 0, 0, 5, { fill: cv('accent'), filter: c.url('glow') });
      const rd = readout(g, 560, 470, ['depletion W', 'C_j (25 µm ring junction)', 'Δλ vs 0 V (est.)', 'carrier density N_A=N_D'], { vx: 190 });
      const sV = slider(c, g, 560, 560, 180, { label: 'reverse bias', min: 0, max: 3, value: 1, color: cv('data'), fmt: v => v.toFixed(2) + ' V', onchange: v => { st.V = v; } });
      slider(c, g, 770, 560, 180, { label: 'doping (each side)', min: 5e17, max: 5e18, value: 2e18, color: cv('optic'), fmt: v => (v / 1e18).toFixed(1) + 'e18', onchange: v => { st.N = v; wl.update(V => Wnm(V, st.N)); } });
      let tt = 0;
      c.loop(dt => {
        tt += dt * MS;
        if (sV.idle()) { st.V = 1.5 + 1.4 * Math.sin(tt * 1.2); sV.set(st.V, true); }
        const W = Wnm(st.V, st.N), px = W * 2.2; // drawing scale
        pReg.setAttribute('width', (xm - px / 2 - x0).toFixed(1));
        nReg.setAttribute('x', (xm + px / 2).toFixed(1)); nReg.setAttribute('width', (x1 - xm - px / 2).toFixed(1));
        dReg.setAttribute('x', (xm - px / 2).toFixed(1)); dReg.setAttribute('width', px.toFixed(1));
        holes.forEach(h => { const vis = h.x < xm - px / 2 - 4; h.x += (Math.random() - 0.5) * 2; h.y += (Math.random() - 0.5) * 2; h.y = clamp(h.y, h.x > xm - rw / 2 ? ry + 8 : ys + 6, ys + sl - 6); h.x = clamp(h.x, x0 + 95, xm - 6); h.e.setAttribute('x', h.x.toFixed(0)); h.e.setAttribute('y', h.y.toFixed(0)); h.e.setAttribute('opacity', vis ? 0.9 : 0.06); });
        elec.forEach(h => { const vis = h.x > xm + px / 2 + 4; h.x += (Math.random() - 0.5) * 2; h.y += (Math.random() - 0.5) * 2; h.y = clamp(h.y, h.x < xm + rw / 2 ? ry + 8 : ys + 6, ys + sl - 6); h.x = clamp(h.x, xm + 6, x1 - 95); h.e.setAttribute('x', h.x.toFixed(0)); h.e.setAttribute('y', (h.y + 4).toFixed(0)); h.e.setAttribute('opacity', vis ? 0.9 : 0.06); });
        md.setAttribute('cx', P.X(st.V)); md.setAttribute('cy', P.Y(Math.min(100, W)));
        const Cj = eps * 2.2e-5 / (W * 1e-7) * 25e-4; // F
        const W0 = Wnm(0, st.N);
        const dnSi = 8.5e-18 * Math.pow(st.N, 0.8) + 8.8e-22 * st.N; // Soref-Bennett 1550
        const dneff = ((W - W0) / 2) / 450 * dnSi * 0.7 * 0.7; // overlap of swept strip with ~450 nm mode, Γ≈0.7, 1310/1550 scale≈0.7
        const dl = 1310 * dneff / 4.0;
        rd(0, W.toFixed(1) + ' nm'); rd(1, (Cj * 1e15).toFixed(1) + ' fF'); rd(2, '+' + (dl * 1000).toFixed(0) + ' pm'); rd(3, (st.N / 1e18).toFixed(1) + '×10¹⁸ cm⁻³');
      });
    },
    hotspots: [{ target: 'driver-circuit', x: 770, y: 190, w: 110, h: 30, label: 'Driver output stage' }]
  });

  // ================================================================ RING LOCK LOOP
  add({
    id: 'ring-lock-loop', parent: 'mrm', domain: 'control', level: 6,
    title: 'Wavelength-lock loop (ring tuning control)',
    subtitle: 'Monitor PD → ADC → controller (dither / PI) → heater DAC → ring',
    summary: 'Every ring must sit a fixed few tens of pm from its laser line while the ASIC next door swings by many kelvin. A small feedback loop per ring measures how much light the ring is dropping (monitor PD), estimates which side of the resonance the laser is on (dither), and nudges a heater to hold the detuning. On power-up it sweeps the heater to find a resonance ("acquisition"); if a ring cannot reach its own wavelength it may lock to a neighbour and the lanes are re-mapped.',
    what: '<p><b>Sensing:</b> a drop-port or tap monitor PD gives P_mon ∝ Lorentzian(λ_L − λ_r). Its peak tells you "on resonance" but not which side you are on. A small <b>dither</b> on the heater (or using the data modulation itself) and lock-in demodulation gives the derivative dP/dλ — a signed error usable by a PI controller. Alternatives: minimum/maximum seeking on average power, bit-statistics-based (count of PAM4 levels), or ratio of two PDs ' + B('typ') + '.</p>' +
      '<p><b>Actuator:</b> heater only <i>red-shifts</i> (it can only add heat). Rings are therefore designed to be blue of their target at the coldest condition and pulled red by the heater — the tuning range must cover fab variation + full temperature range: e.g. ±1.5 nm fab + 50 K·0.08 nm/K = 4 nm → ~13–40 mW at 0.1–0.3 nm/mW ' + B('typ') + '. If that exceeds one channel spacing, it is cheaper to let ring i lock to whatever comb line it reaches first (<b>barrel shift</b> / wavelength re-assignment) and permute lanes digitally.</p>' +
      '<p><b>Dynamics:</b> heater thermal time constant ~1–10 µs; loop bandwidth ~10–100 kHz is enough to track ASIC power steps (ms-scale thermal transients at the package) ' + B('typ') + '. <b>Thermal crosstalk</b>: neighbouring heaters leak ~5–20% into each other, so N loops are coupled — controllers either run slow enough to stay stable or decouple with a crosstalk-matrix inverse. <b>FSR hopping:</b> if a ring is pushed beyond its range it falls to the next resonance order (one FSR away) — the controller must re-acquire.</p>',
    needs: ['Monitor PD with enough dynamic range and low offset', 'Heater DAC resolution ≪ 1 pm (e.g. 12–16 bit)', 'Startup sequencing: laser on → sweep → identify channel → lock → enable data', 'Channel-ID mechanism (ordered sweep, pilot tones or data correlation)'],
    interfaces: [{ with: 'heater', type: 'electrical', detail: 'Heater current/voltage DAC' }, { with: 'monitor-pd / sensing-feedback', type: 'electrical', detail: 'Monitor PD photocurrent → TIA/ADC' }, { with: 'control-plane', type: 'mgmt', detail: 'Lock status, heater codes, alarms in registers' }, { with: 'thermal-control-loop', type: 'thermal', detail: 'Coolant/cold-plate control sets the slow baseline' }],
    kpis: [
      { name: 'Lock accuracy', value: '±2–5 pm', tag: 'typ' }, { name: 'Tracking speed', value: '> 1 K/ms', tag: 'est' },
      { name: 'Heater efficiency', value: '0.1–0.3 nm/mW', tag: 'typ' }, { name: 'Heater τ', value: '1–10 µs', tag: 'typ' },
      { name: 'Thermal crosstalk', value: '5–20 %', tag: 'typ', note: 'to adjacent ring' }
    ],
    physics: '<div class="eq">λ_r = λ_r,cold + (dλ/dT)·[ΔT_amb + R_th·P_h + Σ_j x_ij·R_th·P_h,j]\nDither: P_h = P0 + δ·sin ωt → lock-in output ∝ dP_mon/dλ · (dλ/dP_h)·δ\nPI: P_h[n+1] = P_h[n] + Kp·(e[n]−e[n−1]) + Ki·e[n]\nTuning budget: Δλ_needed = Δλ_fab + (dλ/dT)·ΔT_range  ≤  η_h · P_h,max</div>',
    failures: ['Wrong-channel lock → crossed lanes (detected by channel ID / BER)', 'Out of range at hot corner → FSR hop / unlock', 'Loop instability from thermal crosstalk with aggressive gains', 'Laser power transient interpreted as detuning → false correction (normalize by tap PD)'],
    monitoring: ['Lock state, heater code, monitor level per ring reported via CMIS-like registers', 'Heater code trend = indirect local temperature sensor', 'Lane BER correlated to lock events'],
    scene(g, api) {
      const c = mk(g, api);
      title(g, 'Ring wavelength-lock loop — live simulation', 'Buttons inject disturbances. Watch acquisition (sweep), tracking, wrong-channel/barrel-shift and re-acquire. Time in µs.');
      const V = cv('ctrl'), H = cv('therm'), Sn = cv('sense');
      const rg = ringG(c, g, 110, 175, 42, WL[3], { w: 7 });
      beam(c, g, [[30, 228], [200, 228]], { color: '#ffd9b0', w: 3 });
      heaterZig(g, 80, 122, 60, { n: 10, a: 4, sw: 2.2 });
      const heatGlow = Ci(g, 110, 175, 60, { fill: c.url('heat'), op: 0.3 });
      chip(c, g, 250, 100, 120, 50, 'Monitor PD', { color: Sn, sub: 'drop / tap', dom: 'sensing' });
      chip(c, g, 410, 100, 100, 50, 'TIA + ADC', { color: Sn, sub: '12-bit class', dom: 'sensing' });
      chip(c, g, 550, 100, 170, 50, 'Controller', { color: V, sub: 'dither lock-in + PI · FSM', dom: 'control', glow: true });
      chip(c, g, 550, 200, 170, 50, 'Heater DAC', { color: H, sub: 'P_h → ring', dom: 'thermal' });
      const stT = T(g, 635, 92, '', { anchor: 'middle', size: 12, weight: 700, mono: true });
      const lp = [[152, 160], [250, 125], [370, 125], [410, 125], [510, 125], [550, 125], [720, 125], [745, 125], [745, 225], [720, 225], [550, 225], [140, 225], [125, 140]];
      Pa(g, ptsD(lp), { stroke: V, sw: 1.2, op: 0.3, dash: '3 4', dom: 'control' });
      flow(c, g, lp, { n: 16, color: V, r: 2.6, speed: 120, dom: 'control' });
      // spectrum mini plot
      const PS = plot(g, 790, 90, 190, 140, { x0: -2.2, x1: 2.2, y0: 0, y1: 1.1, xt: [-1.14, 0, 1.14], xf: v => v === 0 ? 'λ_target' : (v > 0 ? '+1ch' : '−1ch'), yt: [] });
      T(g, 795, 84, 'comb lines & ring drop', { size: 10.5, fill: cv('muted') });
      const comb = [-2, -1, 0, 1, 2].map(k => Ln(g, PS.X(k * 1.14), 90, PS.X(k * 1.14), 230, { stroke: WL[clamp(3 + k, 0, 7)], sw: 2, op: 0.8 }));
      void comb;
      const dropL = PS.line(() => 0, { color: WL[3], w: 2, glow: c.url('glow'), N: 160 });
      // traces
      const P = plot(g, 70, 300, 640, 250, { x0: 0, x1: 300, y0: -1.6, y1: 1.6, xt: [0, 100, 200, 300], xf: v => (v - 300) + ' µs', yt: [-1.5, -1, -0.5, 0, 0.5, 1, 1.5], xl: 'time', yl: 'nm  /  scaled', ylo: 40 });
      Ln(g, 70, P.Y(0), 710, P.Y(0), { stroke: '#2a3a50', sw: 1 });
      const tDet = P.line([[0, 0]], { color: WL[3], w: 2.2, glow: c.url('glow') });
      const tPh = P.line([[0, 0]], { color: H, w: 1.6 });
      const tMon = P.line([[0, 0]], { color: Sn, w: 1.3, op: 0.8 });
      const tAmb = P.line([[0, 0]], { color: cv('muted'), w: 1.2, dash: '4 3' });
      T(g, 80, 318, '— λ_r − λ_target (nm)', { size: 10.5, fill: WL[3] }); T(g, 240, 318, '— heater P/10 mW', { size: 10.5, fill: H }); T(g, 370, 318, '— monitor PD', { size: 10.5, fill: Sn }); T(g, 480, 318, '- - ambient ΔT/10 K', { size: 10.5, fill: cv('muted') });
      const rd = readout(g, 740, 300, ['state', 'locked to', 'detuning error', 'heater power', 'ambient ΔT', 'lane mapping'], { vx: 100, lh: 22 });
      // sim
      const kT = 0.08, eta = 0.25, fwhm = 0.12, det0 = 0.05, Pmax = 14, sp = 1.14;
      const S = { amb: 0, ambT: 0, ph: 0, phEff: 0, nb: 0, state: 'SWEEP', k: 0, lost: 0, cold: -0.9, hist: [] };
      const lr = () => S.cold + kT * S.amb + eta * S.phEff + 0.15 * eta * S.nb; // relative to target λ (nm)
      const mon = l => { let m = 0; for (let k = -3; k <= 3; k++) m += lorentz(k * sp - l, fwhm); return m; };
      const bx = 740;
      button(c, g, bx, 445, 115, 'ASIC step +4 K', () => { S.ambT = S.ambT > 2 ? 0 : 4; });
      button(c, g, bx + 125, 445, 115, 'Hot +14 K', () => { S.ambT = S.ambT > 10 ? 0 : 14; });
      button(c, g, bx, 477, 115, 'Neighbour heater', b => { S.nb = S.nb ? 0 : 8; b.active(!!S.nb); });
      button(c, g, bx + 125, 477, 115, 'Re-acquire', () => { S.state = 'SWEEP'; S.ph = 0; });
      T(g, bx, 525, 'Heater can only red-shift. If the ring', { size: 10.5, fill: cv('muted') });
      T(g, bx, 540, 'is already red of target it must hop', { size: 10.5, fill: cv('muted') });
      T(g, bx, 555, 'to the next comb line (barrel shift).', { size: 10.5, fill: cv('muted') });
      let acc = 0;
      c.loop(dt => {
        const steps = 4, h = 0.6; // µs per step
        for (let s = 0; s < steps * MS + 1; s++) {
          S.amb += (S.ambT + 0.3 * CPO.randn() - S.amb) * h / 60;
          S.phEff += (S.ph - S.phEff) * h / 4;
          const l = lr();
          if (S.state === 'SWEEP') {
            S.ph += 0.06 * h;
            const near = Math.round(l / sp), d = near * sp - l;
            if (d > 0 && d < det0 && mon(l) > 0.45) { S.state = 'LOCK'; S.k = near; }
            if (S.ph > Pmax) { S.ph = 0; }
          } else {
            const e = (S.k * sp - l) - det0;
            S.ph += 0.9 * e * h;
            if (S.ph < 0) { S.ph = 0; S.lost += h; } else if (S.ph > Pmax) { S.ph = Pmax; S.lost += h; } else S.lost = Math.max(0, S.lost - h);
            if (Math.abs(e) > 2 * fwhm || S.lost > 30) { S.state = 'SWEEP'; S.lost = 0; if (S.ph >= Pmax) S.ph = 0; }
          }
        }
        acc += dt;
        if (acc > 1 / 30) {
          acc = 0;
          const l = lr();
          S.hist.push([(S.state === 'LOCK' ? l - S.k * sp : l), S.ph / 10, mon(l), S.amb / 10]); if (S.hist.length > 300) S.hist.shift();
          const n = S.hist.length, o = 300 - n;
          tDet.update(S.hist.map((q, i) => [o + i, q[0]])); tPh.update(S.hist.map((q, i) => [o + i, q[1]]));
          tMon.update(S.hist.map((q, i) => [o + i, q[2] - 1.5])); tAmb.update(S.hist.map((q, i) => [o + i, q[3]]));
          dropL.update(x => lorentz(x - l, fwhm));
          rg.set(clamp(mon(l), 0.05, 1)); heatGlow.setAttribute('opacity', (0.1 + 0.6 * S.phEff / Pmax).toFixed(2));
          const lock = S.state === 'LOCK';
          stT.textContent = lock ? 'LOCKED' : 'SWEEPING'; stT.setAttribute('fill', lock ? cv('good') : cv('warn'));
          rd(0, S.state, lock ? cv('good') : cv('warn'));
          rd(1, lock ? (S.k === 0 ? 'λ4 (nominal)' : 'λ' + (4 + S.k) + ' (shifted)') : '—', lock && S.k !== 0 ? cv('warn') : cv('accent'));
          rd(2, lock ? ((S.k * sp - l - det0) * 1000).toFixed(1) + ' pm' : '—');
          rd(3, S.ph.toFixed(2) + ' mW'); rd(4, S.amb.toFixed(1) + ' K');
          rd(5, lock && S.k !== 0 ? 'barrel-shift: lanes rotated' : 'nominal', lock && S.k !== 0 ? cv('warn') : cv('accent'));
        }
      });
    },
    hotspots: [
      { target: 'heater', x: 60, y: 105, w: 110, h: 40, label: 'Heater' },
      { target: 'monitor-pd', x: 245, y: 95, w: 130, h: 60, label: 'Monitor PD' },
      { target: 'adc', x: 405, y: 95, w: 110, h: 60, label: 'ADC' },
      { target: 'ring-physics', x: 785, y: 85, w: 200, h: 150, label: 'Ring spectrum physics' }
    ]
  });

  // ================================================================ HEATER
  add({
    id: 'heater', parent: 'pic', domain: 'thermal', level: 5,
    title: 'Micro-heater (thermal tuner)',
    subtitle: 'TiN / doped-Si resistive heater, thermal isolation, crosstalk',
    summary: 'A thin resistive strip above (or inside) each ring converts a few milliwatts into a local temperature rise of a few to tens of kelvin. Because silicon\'s index rises with temperature, the resonance moves red by ~0.08 nm per kelvin. Efficiency (nm per mW), speed (µs) and crosstalk to neighbouring rings are the design knobs.',
    what: '<p><b>Types:</b> metal (TiN, W) heater ~1–2 µm above the waveguide in the oxide; doped-Si heater in the ring slab (closer, more efficient, faster but adds optical loss if too close); integrated heater sharing the ring\'s doped regions ' + B('typ') + '.</p>' +
      '<p><b>Efficiency:</b> Δλ/P = (dλ/dT)·R_th. R_th rises if heat cannot escape: <b>deep trenches</b> and <b>substrate undercut</b> raise efficiency from ~0.1–0.3 nm/mW to &gt;1 nm/mW, but slow the response (τ = R_th·C_th) and raise crosstalk sensitivity ' + B('typ') + '.</p><p><b>Crosstalk:</b> rings on a ~20–50 µm pitch share heat — a neighbouring heater at 10 mW can move this ring by ~5–20% of its own heater\'s effect.</p>',
    needs: ['High R_th locally, low R_th to neighbours (trenches)', 'Stable heater resistance (no electromigration)', 'Enough DAC range and resolution'],
    interfaces: [{ with: 'ring-lock-loop', type: 'electrical', detail: 'Driven by heater DAC' }, { with: 'thermal-system', type: 'thermal', detail: 'Heat ultimately flows to the cold plate' }],
    kpis: [{ name: 'Efficiency', value: '0.1–0.3 nm/mW (no undercut)', tag: 'typ' }, { name: 'Time constant', value: '1–10 µs', tag: 'typ' }, { name: 'Resistance', value: '100 Ω – 2 kΩ', tag: 'typ' }, { name: 'Max power / ring', value: '~10–30 mW', tag: 'typ' }],
    physics: '<div class="eq">ΔT = R_th·P,    τ = R_th·C_th\nΔλ = (λ/n_g)·Γ·(dn/dT)·ΔT ≈ 0.08 nm/K · ΔT\ndn/dT: Si 1.8e-4 /K, SiO2 ~1e-5 /K\nheater power for 1 channel (1.14 nm) @0.25 nm/mW ≈ 4.6 mW</div>',
    failures: ['Electromigration / hot-spot burnout at high current density', 'Heater resistance drift → feed-forward models wrong (loop corrects)', 'Excess heater power across many rings → tens of watts per switch'],
    monitoring: ['Heater voltage & current → resistance → temperature', 'Total tuning power telemetry'],
    scene(g, api) {
      const c = mk(g, api);
      title(g, 'Heater cross-section — heat spreading & crosstalk', 'Drag heater power. Isotherms spread through oxide; trenches confine heat. The neighbour ring also shifts (crosstalk).');
      R(g, 40, 90, 620, 340, { fill: '#0e1a28', rx: 0 });
      R(g, 40, 330, 620, 100, { fill: '#2a3546', rx: 0 }); T(g, 50, 420, 'Si substrate (heat sink path)', { size: 10.5, fill: cv('muted') });
      R(g, 40, 290, 620, 40, { fill: '#1a2a3e', rx: 0 }); T(g, 50, 318, 'BOX', { size: 10.5, fill: cv('muted') });
      const trench = [R(g, 120, 110, 26, 220, { fill: '#05080c', rx: 0, op: 0 }), R(g, 474, 110, 26, 220, { fill: '#05080c', rx: 0, op: 0 })];
      const hx = 310, hy = 190, nx = 590;
      const blobs = [0, 1, 2, 3, 4].map(i => el(g, 'ellipse', { cx: hx, cy: hy + 40, rx: 10, ry: 8, fill: c.url('heat'), opacity: 0 }));
      R(g, hx - 50, hy, 100, 10, { fill: cv('therm'), rx: 1, filter: c.url('glow') }); T(g, hx, hy - 8, 'TiN heater', { anchor: 'middle', size: 11, fill: cv('therm') });
      R(g, hx - 25, 270, 50, 20, { fill: '#8fa3bb', rx: 0 }); R(g, nx - 25, 270, 50, 20, { fill: '#8fa3bb', rx: 0 });
      T(g, hx, 262, 'this ring', { anchor: 'middle', size: 10.5, fill: WL[2] }); T(g, nx, 262, 'neighbour (~30 µm)', { anchor: 'middle', size: 10.5, fill: WL[5] });
      const m1 = el(g, 'ellipse', { cx: hx, cy: 280, rx: 30, ry: 12, fill: c.url('mode'), opacity: 0.6 });
      void m1;
      const P = plot(g, 720, 90, 250, 170, { x0: 0, x1: 20, y0: 0, y1: 6, xt: [0, 5, 10, 15, 20], yt: [0, 2, 4, 6], xl: 'heater power (mW)', yl: 'Δλ (nm)', ylo: 26 });
      const st = { P: 6, und: false };
      const eff = () => st.und ? 0.8 : 0.25;
      const l1 = P.line(x => 0.25 * x, { color: WL[2], w: 2 }); const l2 = P.line(x => 0.8 * x, { color: WL[2], w: 1.4, dash: '4 3', op: 0.7 });
      void l1; void l2;
      const pt = Ci(g, 0, 0, 5, { fill: WL[2], filter: c.url('glow') });
      const rd = readout(g, 720, 300, ['ΔT at ring', 'Δλ this ring', 'Δλ neighbour', 'crosstalk', 'time constant'], { vx: 120, lh: 21 });
      const s = slider(c, g, 720, 430, 240, { label: 'heater power', min: 0, max: 20, value: 6, color: cv('therm'), fmt: v => v.toFixed(1) + ' mW', onchange: v => { st.P = v; } });
      const b = button(c, g, 720, 465, 240, 'Trenches / undercut: OFF', bb => { st.und = !st.und; bb.label('Trenches / undercut: ' + (st.und ? 'ON' : 'OFF')); bb.active(st.und); trench.forEach(t => t.setAttribute('opacity', st.und ? 0.95 : 0)); });
      void b;
      eqbox(g, 40, 450, 620, ['Δλ = 0.08 nm/K · R_th · P      R_th ≈ 3 K/mW (plain) … 10 K/mW (undercut)', 'τ = R_th·C_th : more isolation ⇒ more efficient but slower & more coupled'], { size: 11.5 });
      let tt = 0, Pe = 0;
      c.loop(dt => {
        tt += dt * MS;
        if (s.idle()) { st.P = 10 + 8 * Math.sin(tt * 0.7); s.set(st.P, true); }
        Pe += (st.P - Pe) * Math.min(1, dt * (st.und ? 2 : 6));
        const dTk = Pe * eff() / 0.08, xt = st.und ? 0.05 : 0.15;
        blobs.forEach((bl, i) => { const k = ((tt * 0.5 + i / 5) % 1); bl.setAttribute('rx', (20 + k * (st.und ? 160 : 260) * (0.4 + Pe / 20)).toFixed(0)); bl.setAttribute('ry', (14 + k * 110 * (0.4 + Pe / 20)).toFixed(0)); bl.setAttribute('opacity', ((1 - k) * 0.5 * Pe / 20).toFixed(2)); });
        pt.setAttribute('cx', P.X(Pe)); pt.setAttribute('cy', P.Y(Math.min(6, Pe * eff())));
        rd(0, dTk.toFixed(1) + ' K'); rd(1, (Pe * eff()).toFixed(2) + ' nm'); rd(2, (Pe * eff() * xt).toFixed(2) + ' nm', cv('warn'));
        rd(3, (xt * 100).toFixed(0) + ' %'); rd(4, st.und ? '~20–50 µs' : '~2–5 µs');
      });
    },
    hotspots: [{ target: 'ring-lock-loop', x: 720, y: 280, w: 250, h: 120, label: 'Closed-loop control' }, { target: 'thermal-system', x: 40, y: 330, w: 620, h: 100, label: 'Where the heat goes' }]
  });

  // ================================================================ WAVEGUIDE
  add({
    id: 'waveguide', parent: 'pic', domain: 'optics', level: 5,
    title: 'Silicon waveguide',
    subtitle: 'SOI strip / rib cross-section, mode confinement, propagation & bend loss',
    summary: 'Light is guided in a silicon "wire" about 450 nm wide and 220 nm tall surrounded by glass. The huge index contrast (3.5 vs 1.45) squeezes the mode into a ~0.1 µm² area and allows bends of a few µm radius — but makes the guide very sensitive to sidewall roughness and to nm-scale dimension errors.',
    what: '<p><b>Strip</b> (fully etched): strongest confinement, smallest bends (R ≥ ~2–5 µm), loss ~1–3 dB/cm dominated by sidewall scattering. <b>Rib</b> (partial etch, slab ~70–150 nm): weaker lateral confinement, lower loss (~0.3–1 dB/cm), needed for modulators so the slab can carry electrical contacts; bends must be larger (≥10–20 µm) ' + B('typ') + '.</p>' +
      '<p><b>Single-mode condition:</b> at 1310 nm a 220 nm strip is single-mode (TE0) up to ~400–450 nm width. n_eff ≈ 2.4–2.7, group index n_g ≈ 4.0–4.3 (strong waveguide dispersion) ' + B('typ') + '. TM modes are weakly confined in 220 nm Si and are usually filtered out — Si photonics is effectively TE-only, which is why the laser feed uses PM fiber.</p>' +
      '<p><b>Loss mechanisms:</b> sidewall roughness scattering (∝ σ²·(Δn²)·|E_wall|², Payne–Lacey), bend radiation (exponential in R), substrate leakage through thin BOX, free-carrier absorption in doped sections, and (at high power) two-photon absorption ' + B('typ') + '.</p>',
    needs: ['Smooth sidewalls (σ < 1–2 nm RMS)', 'Thickness/width control ±5–10 nm', 'BOX ≥ 2 µm to prevent substrate leakage', 'Adiabatic transitions between strip and rib'],
    interfaces: [{ with: 'mrm / wdm-mux / photodetector / fiber-coupler', type: 'optical', detail: 'Connects every on-chip device' }],
    kpis: [{ name: 'Strip loss', value: '1–3 dB/cm', tag: 'typ' }, { name: 'Rib loss', value: '0.3–1 dB/cm', tag: 'typ' }, { name: 'n_eff / n_g (1310)', value: '~2.6 / ~4.2', tag: 'typ' }, { name: 'Min bend radius (strip)', value: '~2–5 µm', tag: 'typ' }, { name: 'dλ_res/dw', value: '~1 nm per nm width', tag: 'typ' }],
    physics: '<div class="eq">Guidance: n_clad < n_eff < n_core,   β = 2π·n_eff/λ\nn_g = n_eff − λ·dn_eff/dλ\nLoss: P(z) = P0·10^(−α_dB·z/10)\nBend loss per 90° ≈ A·exp(−R/R0)   (radiation from the outer cladding beyond the "speed-of-light" radius)\nPayne–Lacey: α_scat ∝ σ²·(n1² − n2²)²·E_s²</div>',
    failures: ['Sidewall roughness → excess loss & backscatter (ring resonance splitting)', 'Too-tight bends → radiation loss', 'Width variation → phase errors / resonance spread', 'High optical power → two-photon absorption + free-carrier loss'],
    monitoring: ['Cut-back and ring-Q test structures at wafer level', 'In system: indirectly via tap PDs / link budget'],
    scene(g, api) {
      const c = mk(g, api);
      title(g, 'SOI waveguides — cross-sections and loss mechanisms', 'Left: strip and rib with the TE0 mode. Right: top view of a bend — drag the radius to see radiation loss; sidewall roughness scatters photons.');
      const O = cv('optic');
      const xs = (x0, rib, lab) => {
        R(g, x0, 90, 300, 230, { fill: '#0e1a28', rx: 0 });
        R(g, x0, 250, 300, 70, { fill: '#1a2a3e', rx: 0 }); T(g, x0 + 8, 310, 'BOX SiO2 2 µm (n 1.45)', { size: 10, fill: cv('muted') });
        if (rib) R(g, x0, 232, 300, 18, { fill: '#7a8ca3', rx: 0 });
        R(g, x0 + 105, 200, 90, 50, { fill: '#8fa3bb', rx: 0 });
        const m = el(g, 'ellipse', { cx: x0 + 150, cy: 225, rx: rib ? 95 : 70, ry: 38, fill: c.url('mode'), opacity: 0.85 });
        T(g, x0 + 150, 112, lab, { anchor: 'middle', size: 12, weight: 600 });
        T(g, x0 + 150, 192, '450 × 220 nm Si (n 3.50)', { anchor: 'middle', size: 10, fill: cv('text') });
        if (rib) T(g, x0 + 250, 245, 'slab 90 nm', { anchor: 'middle', size: 9.5, fill: '#cbd5e1' });
        T(g, x0 + 8, 130, 'oxide cladding', { size: 10, fill: cv('muted') });
        return m;
      };
      const m1 = xs(30, false, 'Strip (full etch) — tight bends');
      void m1;
      // (redraw rib cross-section in its own position)
      const ribG = grp(g, { transform: 'translate(0,250)' });
      R(ribG, 30, 90, 300, 230, { fill: '#0e1a28', rx: 0 }); R(ribG, 30, 250, 300, 70, { fill: '#1a2a3e', rx: 0 });
      R(ribG, 30, 232, 300, 18, { fill: '#7a8ca3', rx: 0 }); R(ribG, 135, 200, 90, 50, { fill: '#8fa3bb', rx: 0 });
      const m3 = el(ribG, 'ellipse', { cx: 180, cy: 225, rx: 100, ry: 36, fill: c.url('mode'), opacity: 0.85 });
      T(ribG, 180, 112, 'Rib (partial etch) — modulators, low loss', { anchor: 'middle', size: 12, weight: 600 });
      T(ribG, 280, 246, 'slab 90 nm', { anchor: 'middle', size: 9.5, fill: '#cbd5e1' });
      T(ribG, 38, 310, 'BOX', { size: 10, fill: cv('muted') });
      // bend view
      const bx0 = 400;
      R(g, bx0, 80, 580, 380, { fill: '#080c12', stroke: cv('line'), rx: 6 });
      const bendG = grp(g, {});
      const st = { R: 3 };
      const rough = []; for (let i = 0; i < 60; i++) rough.push(Math.random());
      const sc = flow(c, g, [[bx0 + 20, 420], [bx0 + 300, 420]], { n: 10, color: O, r: 3, speed: 120 });
      const leak = [];
      for (let i = 0; i < 18; i++) leak.push({ e: Ci(g, 0, 0, 2.5, { fill: O, op: 0, filter: c.url('glow') }), t: Math.random(), a: 0 });
      const scat = [];
      for (let i = 0; i < 8; i++) scat.push({ e: Ci(g, 0, 0, 2, { fill: '#fff', op: 0 }), t: Math.random(), x: 0, y: 0, vx: 0, vy: 0 });
      let arcPts = [];
      const rd = readout(g, bx0 + 20, 500, ['bend radius', 'loss per 90° bend', 'strip propagation loss', '10 cm on-chip routing'], { vx: 190, lh: 20 });
      function drawBend() {
        while (bendG.firstChild) bendG.removeChild(bendG.firstChild);
        const Rp = 20 + st.R * 28, cxp = bx0 + 300, cyp = 420 - Rp;
        arcPts = []; for (let i = 0; i <= 30; i++) { const a = Math.PI / 2 - i / 30 * Math.PI / 2; arcPts.push([cxp + Rp * Math.cos(a), cyp + Rp * Math.sin(a)]); }
        const full = [[bx0 + 20, 420]].concat(arcPts).concat([[cxp + Rp, 100]]);
        // rough sidewall
        let d = ''; full.forEach((q, i) => { d += (i ? 'L' : 'M') + q[0].toFixed(1) + ',' + q[1].toFixed(1); });
        Pa(bendG, d, { stroke: '#8fa3bb', sw: 12, op: 0.35 });
        beam(c, bendG, full, { color: O, w: 3, speed: 90 });
        T(bendG, cxp - Rp * 0.3, cyp + Rp * 0.3, 'R = ' + st.R.toFixed(1) + ' µm', { size: 11, fill: cv('muted') });
        const loss = 3 * Math.exp(-st.R / 0.9);
        rd(0, st.R.toFixed(1) + ' µm'); rd(1, loss < 0.01 ? '< 0.01 dB' : loss.toFixed(2) + ' dB', loss > 0.2 ? cv('bad') : cv('good')); rd(2, '~2 dB/cm (strip)  ·  ~0.5 dB/cm (rib)'); rd(3, '≈ 20 dB → keep routes short!');
        st.loss = loss;
        sc.on = false;
      }
      drawBend();
      const s = slider(c, g, bx0 + 340, 500, 220, { label: 'bend radius', min: 0.8, max: 10, value: 3, step: 0.1, color: O, fmt: v => v.toFixed(1) + ' µm', onchange: v => { st.R = v; drawBend(); } });
      void s; void m3;
      c.loop(dt => {
        leak.forEach(p => {
          p.t += dt * 0.6 * MS;
          if (p.t > 1) { p.t = 0; p.a = Math.random(); }
          if (!arcPts.length) return;
          const q = arcPts[Math.floor(p.a * (arcPts.length - 1))], cxp = bx0 + 300, Rp = 20 + st.R * 28, cyp = 420 - Rp;
          const ang = Math.atan2(q[1] - cyp, q[0] - cxp), dist = p.t * 120;
          p.e.setAttribute('cx', (q[0] + Math.cos(ang) * dist).toFixed(1)); p.e.setAttribute('cy', (q[1] + Math.sin(ang) * dist).toFixed(1));
          p.e.setAttribute('opacity', (clamp(st.loss * 2.5, 0, 1) * (1 - p.t)).toFixed(2));
        });
        scat.forEach(p => {
          p.t += dt * 0.8 * MS;
          if (p.t > 1) { p.t = 0; p.x = bx0 + 30 + Math.random() * 260; p.y = 420; const a = Math.random() * Math.PI * 2; p.vx = Math.cos(a) * 80; p.vy = Math.sin(a) * 80; }
          p.e.setAttribute('cx', (p.x + p.vx * p.t).toFixed(1)); p.e.setAttribute('cy', (p.y + p.vy * p.t).toFixed(1)); p.e.setAttribute('opacity', (0.6 * (1 - p.t)).toFixed(2));
        });
      });
      T(g, bx0 + 20, 450, 'white sparks: sidewall-roughness scattering  ·  orange spray: bend radiation', { size: 10.5, fill: cv('muted') });
    },
    hotspots: [{ target: 'fiber-coupler', x: 400, y: 80, w: 120, h: 40, label: 'Getting light on/off chip' }, { target: 'mrm', x: 30, y: 340, w: 300, h: 230, label: 'Rib → ring modulator' }]
  });

  // ================================================================ WDM MUX / DEMUX
  add({
    id: 'wdm-mux', parent: 'pic', domain: 'optics', level: 5,
    title: 'Ring-based WDM mux / demux',
    subtitle: 'Add-drop rings as channel filters: crosstalk vs drop loss vs Q',
    summary: 'On receive, the fiber delivers several wavelengths on one waveguide. A row of add-drop rings, each tuned to one channel, pulls its wavelength off the bus into its own photodetector and lets the rest continue. On transmit, the modulator rings themselves act as the multiplexer. The ring Q sets the trade: narrow filters reject neighbours better but lose more light and are harder to keep aligned.',
    what: '<p><b>Add-drop ring:</b> two couplers (bus-in and drop). On resonance, power transfers to the drop port with peak D_max = (1 − Q_L/Q_i)²-ish for a symmetric ring (intrinsic loss steals the rest); off resonance it passes through. Spectral shape is Lorentzian: D(Δλ) = D_max / (1 + (2Δλ/FWHM)²) ' + B('typ') + '.</p>' +
      '<p><b>Channel plan:</b> e.g. 8 λ on a 200 GHz (≈1.14 nm @1310 nm) grid spans 9.1 nm, which must fit inside one ring FSR (13.7 nm for R = 5 µm) — otherwise ring k\'s next resonance order lands on another channel. Industry MSAs for CW-WDM lasers define 8/16 λ O-band grids at 200/400 GHz ' + B('typ') + '.</p>' +
      '<p><b>Crosstalk:</b> adjacent-channel leakage = 10·log(1/(1+(2Δ/FWHM)²)). With FWHM 0.13 nm and Δ 1.14 nm → about −25 dB. Higher-order (2–3 coupled rings) filters give flatter tops and steeper skirts at the cost of more heaters. Each demux ring needs its own lock loop (maximize drop-PD current).</p>',
    needs: ['FSR > N·channel spacing', 'Each ring locked (heater) to its channel — easy: maximize its own PD current', 'Low intrinsic loss (high Q_i) for low drop loss', 'Polarization-managed input (TE) — or polarization-diversity front end'],
    interfaces: [{ with: 'fiber-coupler', type: 'optical', detail: 'Multi-λ RX light in' }, { with: 'photodetector', type: 'optical', detail: 'One PD per drop port' }, { with: 'heater / ring-lock-loop', type: 'thermal', detail: 'Per-ring tuning' }],
    kpis: [{ name: 'Channel spacing', value: '200–400 GHz (1.1–2.3 nm)', tag: 'typ' }, { name: 'Adjacent crosstalk', value: '< −20…−25 dB', tag: 'typ' }, { name: 'Drop loss', value: '0.5–2 dB', tag: 'typ' }, { name: 'Channels / bus', value: '4–16', tag: 'typ' }],
    physics: '<div class="eq">D(Δλ) = D_max / (1 + (2Δλ/FWHM)²)        D_max ≈ (1 − Q_L/Q_i)²\nΔλ_ch = λ²·Δf/c = (1.31 µm)²·200 GHz / c ≈ 1.14 nm\nXT_adj[dB] = −10·log10(1 + (2·Δλ_ch/FWHM)²)\nconstraint: N·Δλ_ch < FSR = λ²/(n_g·2πR)</div>',
    failures: ['Ring locks to wrong channel → swapped lanes', 'Resonance order aliasing if FSR too small', 'Polarization rotation in fiber → TM light not dropped (polarization-dependent loss)'],
    monitoring: ['Drop PD photocurrents per channel (also serve as lock error)', 'Host per-lane BER'],
    scene(g, api) {
      const c = mk(g, api);
      title(g, 'Ring demultiplexer — 8 channels on a 200 GHz grid', 'Top: spectra (comb + each ring\'s drop response). Drag Q to trade crosstalk against drop loss. Bottom: each ring peels off its colour.');
      const P = plot(g, 70, 80, 600, 200, { x0: 1304.5, x1: 1316.5, y0: -40, y1: 2, xt: [1306, 1308, 1310, 1312, 1314, 1316], yt: [0, -10, -20, -30, -40], xl: 'wavelength (nm)', yl: 'drop response (dB)', ylo: 36 });
      const lam = WL.map((_, i) => 1306 + i * 1.14);
      lam.forEach((l, i) => Ln(g, P.X(l), 80, P.X(l), 280, { stroke: WL[i], sw: 1.4, op: 0.55, dash: '2 3' }));
      const st = { Q: 10000 };
      const Qi = 60000;
      const curves = lam.map((l, i) => P.line(() => -40, { color: WL[i], w: 1.8, N: 400 }));
      const xtBand = R(g, 0, 80, 0, 200, { fill: cv('bad'), op: 0.1, rx: 0 });
      const rd = readout(g, 700, 110, ['loaded Q', 'FWHM', 'drop peak loss', 'adjacent crosstalk', 'tolerance (−1 dB)', 'span vs FSR'], { vx: 130, lh: 22 });
      const s = slider(c, g, 700, 270, 260, { label: 'loaded Q of drop rings', min: 2000, max: 40000, value: 10000, step: 100, color: cv('optic'), fmt: v => (v / 1000).toFixed(1) + 'k', onchange: v => { st.Q = v; upd(); } });
      void s;
      function upd() {
        const fw = 1310 / st.Q, Dm = Math.pow(Math.max(0.02, 1 - st.Q / Qi), 2);
        curves.forEach((cu, i) => cu.update(x => 10 * Math.log10(Dm * lorentz(x - lam[i], fw) + 1e-6)));
        const xt = -10 * Math.log10(1 + Math.pow(2 * 1.14 / fw, 2));
        xtBand.setAttribute('x', P.X(1310 + 0.57)); xtBand.setAttribute('width', P.X(1310 + 1.14 + 0.57) - P.X(1310 + 0.57));
        rd(0, (st.Q / 1000).toFixed(1) + 'k'); rd(1, (fw * 1000).toFixed(0) + ' pm'); rd(2, (-10 * Math.log10(Dm)).toFixed(2) + ' dB', Dm > 0.7 ? cv('good') : cv('bad'));
        rd(3, xt.toFixed(1) + ' dB', xt < -20 ? cv('good') : cv('bad')); rd(4, '±' + (fw * 0.25 * 1000).toFixed(0) + ' pm'); rd(5, '9.1 / 13.7 nm OK');
      }
      upd();
      // physical layout
      const by = 360;
      beam(c, g, [[20, by], [980, by]], { color: '#ffd9b0', w: 3 });
      T(g, 24, by - 12, 'RX bus (8 λ in)', { size: 11, fill: '#ffd9b0' });
      for (let k = 0; k < 8; k++) {
        const x = 150 + k * 105;
        ringG(c, g, x, by + 38, 28, WL[k], { w: 5 }).set(0.7);
        beam(c, g, [[x + 40, by + 76], [x - 40, by + 76], [x - 40, by + 120]], { color: WL[k], w: 2, halo: false, op: 0.6 });
        R(g, x - 54, by + 120, 28, 24, { fill: '#3a3f2a', stroke: '#c6d86a', rx: 3 });
        T(g, x - 40, by + 162, 'PD' + (k + 1), { anchor: 'middle', size: 10.5, fill: '#c6d86a' });
        heaterZig(g, x - 20, by + 38 - 36, 40, { n: 8, a: 2 });
        T(g, x + 24, by + 120, WLNM[k], { size: 10, mono: true, fill: WL[k] });
        flow(c, g, [[20, by], [x, by], [x + 28, by + 38], [x, by + 76], [x - 40, by + 76], [x - 40, by + 120]], { n: 6, color: WL[k], r: 2.6, speed: 140, phase: k / 8 });
      }
      eqbox(g, 20, 535, 960, ['D(Δλ) = Dmax/(1+(2Δλ/FWHM)²)   ·   Δλch = λ²Δf/c ≈ 1.14 nm @ 200 GHz   ·   N·Δλch < FSR   ·   Dmax ≈ (1 − QL/Qi)²,  Qi = 60k assumed'], { size: 11.5 });
    },
    hotspots: [{ target: 'photodetector', x: 90, y: 475, w: 120, h: 50, label: 'Photodetector' }, { target: 'ring-lock-loop', x: 120, y: 385, w: 70, h: 70, label: 'Lock loop' }, { target: 'ring-physics', x: 70, y: 80, w: 600, h: 200, label: 'Ring physics' }]
  });

  // ================================================================ PHOTODETECTOR
  add({
    id: 'photodetector', parent: 'pic', domain: 'optics', level: 5,
    title: 'Ge-on-Si photodetector',
    subtitle: 'Waveguide-coupled PIN: responsivity, bandwidth, dark current',
    summary: 'Silicon is transparent at 1310 nm, so the receiver uses germanium grown on the silicon waveguide. Light leaks evanescently up into the Ge, where each absorbed photon creates an electron-hole pair; the built-in plus applied field sweeps them to the contacts within picoseconds. Result: ~0.9 A/W, 50+ GHz, nanoamp dark current.',
    what: '<p><b>Structure:</b> Si waveguide (often P+ doped beneath) → Ge mesa (~0.3–0.8 µm thick, 5–40 µm long, intrinsic) → N+ top contact (or lateral P-I-N in Ge). Evanescent coupling distributes absorption along the length so the PD can be short and low-capacitance ' + B('typ') + '.</p>' +
      '<p><b>Responsivity:</b> R = η·qλ/(hc) = η·λ[µm]/1.24 → at 1.31 µm the ideal is 1.06 A/W; real devices reach 0.8–1.0 A/W ' + B('typ') + '.</p><p><b>Bandwidth:</b> limited by carrier <b>transit</b> through the intrinsic region (f_t ≈ 0.45·v_sat/d) and <b>RC</b> (junction C + series R + TIA input). Thin Ge → faster transit but more C per area; short Ge → less C but less absorption.</p><p><b>Dark current:</b> thermally generated at threading dislocations from the 4.2% Ge/Si lattice mismatch; ~nA at room temperature, roughly doubling every ~10 K — negligible versus ~50 µA signal but it matters for monitor PDs at low light.</p>',
    needs: ['High-quality Ge epitaxy (low threading dislocation density)', 'Low-resistance contacts; reverse bias ~1–2 V', 'Optimized length (absorption vs capacitance)', 'Low C path to the TIA (3D stacking)'],
    interfaces: [{ with: 'wdm-mux', type: 'optical', detail: 'Drop-port waveguide in' }, { with: 'tia', type: 'electrical', detail: 'Photocurrent to TIA input via hybrid bond' }],
    kpis: [{ name: 'Responsivity @1310', value: '0.8–1.0 A/W', tag: 'typ' }, { name: 'Bandwidth', value: '50–70+ GHz', tag: 'typ' }, { name: 'Dark current', value: '~1–50 nA', tag: 'typ' }, { name: 'Capacitance', value: '~10–30 fF', tag: 'typ' }],
    physics: '<div class="eq">R = η·q·λ/(h·c) = η·λ[µm]/1.24  A/W\nη = (1 − e^(−Γ·α·L))·η_int,   α_Ge(1310) ≈ 7–9×10³ cm⁻¹\nf_transit ≈ 0.45·v_sat/d,  v_sat ≈ 6×10⁶ cm/s\nf_RC = 1/(2π·(R_s + R_L)·C),   f_3dB ≈ (f_t⁻² + f_RC⁻²)^(−1/2)\nI_dark(T) ≈ I_dark(25°C)·2^((T−25)/10)</div>',
    failures: ['Dark-current growth with aging / temperature', 'Saturation at high optical power (space-charge screening)', 'Responsivity loss from Ge interface defects or contamination'],
    monitoring: ['Average photocurrent = RX optical power (RSSI)', 'Dark current measured with laser off at test'],
    scene(g, api) {
      const c = mk(g, api);
      title(g, 'Waveguide-coupled Ge PIN photodetector — side view along propagation', 'Photons (colour) leak up into the Ge and are absorbed; electrons (cyan) and holes (pink) are swept out. Drag Ge length & temperature.');
      const O = WL[4];
      R(g, 30, 330, 640, 60, { fill: '#1a2a3e', rx: 0 }); T(g, 40, 380, 'BOX', { size: 10.5, fill: cv('muted') });
      R(g, 30, 290, 640, 40, { fill: '#8fa3bb', op: 0.6, rx: 0 }); T(g, 40, 316, 'Si waveguide (P+ under Ge)', { size: 10.5, fill: '#0b0f14', weight: 600 });
      const geL = 210, geX = 200;
      const geR = R(g, geX, 200, geL, 90, { fill: '#7d8a4a', stroke: '#c6d86a', rx: 2 });
      T(g, geX + 10, 222, 'i-Ge (absorber)', { size: 11, fill: '#e3f08a' });
      const ntop = R(g, geX, 190, geL, 10, { fill: '#5070ff', op: 0.8, rx: 0 });
      T(g, geX + geL / 2, 182, 'N+ contact (−)  ← to TIA', { anchor: 'middle', size: 10.5, fill: '#9ab4ff' });
      T(g, 560, 290 - 6, 'P+ contact (+)', { size: 10.5, fill: '#ff9a9a' });
      R(g, 560, 290, 60, 8, { fill: '#ff5050', op: 0.7, rx: 0 });
      // E-field arrows
      for (let i = 0; i < 7; i++) Ln(g, geX + 20 + i * 28, 280, geX + 20 + i * 28, 210, { stroke: '#94a3b8', sw: 1, op: 0.4, end: c.arrow('#94a3b8') });
      T(g, geX + geL + 6, 245, 'E-field', { size: 10, fill: cv('muted') });
      const st = { L: 15, T: 40 };
      const ph = [], car = [];
      for (let i = 0; i < 26; i++) ph.push({ e: Ci(g, 0, 0, 3.2, { fill: O, filter: c.url('glow') }), x: Math.random() * 400 + 30, y: 310, alive: true });
      for (let i = 0; i < 40; i++) car.push({ e: Ci(g, 0, 0, 2.6, { fill: '#fff', op: 0 }), t: 2, x: 0, y: 0, k: i % 2 });
      let ci = 0;
      // plots
      const P = plot(g, 720, 80, 250, 150, { x0: 1200, x1: 1700, y0: 0, y1: 1.2, xt: [1310, 1550], yt: [0, 0.5, 1], xl: 'λ (nm)', yl: 'R (A/W)', ylo: 26 });
      P.line(l => (l / 1240) * 0.9 * (l < 1560 ? 1 : Math.max(0, 1 - (l - 1560) / 70)), { color: '#c6d86a', w: 2.2, glow: c.url('glow') });
      Ln(g, P.X(1310), 80, P.X(1310), 230, { stroke: O, dash: '3 3' }); T(g, P.X(1310) + 4, 94, 'O-band', { size: 10, fill: O });
      T(g, P.X(1600), 110, 'Ge edge', { size: 10, fill: cv('muted'), anchor: 'middle' });
      const rd = readout(g, 720, 270, ['absorption η', 'responsivity', 'capacitance', 'f_transit (d=0.5 µm)', 'f_RC (200 Ω)', 'f_3dB', 'dark current'], { vx: 140, lh: 21 });
      const s1 = slider(c, g, 720, 445, 250, { label: 'Ge length', min: 3, max: 40, value: 15, color: '#c6d86a', fmt: v => v.toFixed(0) + ' µm', onchange: v => { st.L = v; upd(); } });
      const s2 = slider(c, g, 720, 495, 250, { label: 'temperature', min: 25, max: 105, value: 40, color: cv('therm'), fmt: v => v.toFixed(0) + ' °C', onchange: v => { st.T = v; upd(); } });
      void s1; void s2;
      let eta = 0.9;
      function upd() {
        eta = 1 - Math.exp(-0.2 * st.L);
        const R_ = eta * 0.95 * 1.31 / 1.24, C = 5 + 1.0 * st.L, ft = 0.45 * 6e6 / 0.5e-4, frc = 1 / (2 * Math.PI * 200 * C * 1e-15), f3 = 1 / Math.sqrt(1 / (ft * ft) + 1 / (frc * frc));
        rd(0, (eta * 100).toFixed(0) + ' %'); rd(1, R_.toFixed(2) + ' A/W'); rd(2, C.toFixed(0) + ' fF'); rd(3, (ft / 1e9).toFixed(0) + ' GHz'); rd(4, (frc / 1e9).toFixed(0) + ' GHz');
        rd(5, (f3 / 1e9).toFixed(0) + ' GHz', f3 > 50e9 ? cv('good') : cv('bad'));
        rd(6, (2 * st.L / 15 * Math.pow(2, (st.T - 25) / 10)).toFixed(1) + ' nA');
        const w = st.L * 14; geR.setAttribute('width', w); ntop.setAttribute('width', w);
      }
      upd();
      c.loop(dt => {
        const w = st.L * 14;
        ph.forEach(p => {
          p.x += 160 * dt * MS;
          if (p.x > geX && p.x < geX + w && p.alive) {
            p.y -= 60 * dt * MS;
            if (Math.random() < dt * 4 * MS || p.y < 220) {
              p.alive = false;
              for (let j = 0; j < 2; j++) { const q = car[ci]; ci = (ci + 1) % car.length; q.t = 0; q.x = p.x; q.y = p.y; q.k = j; }
            }
          }
          if (p.x > 680 || !p.alive) { if (p.x > 680 || Math.random() < 0.05) { p.x = 30 + Math.random() * 40; p.y = 310; p.alive = true; } }
          p.e.setAttribute('cx', p.x.toFixed(1)); p.e.setAttribute('cy', p.y.toFixed(1)); p.e.setAttribute('opacity', p.alive ? (p.x > geX + w ? 0.25 : 0.95) : 0);
        });
        car.forEach(q => {
          if (q.t > 1) { q.e.setAttribute('opacity', 0); return; }
          q.t += dt * 2.2 * MS;
          const y = q.k ? q.y - (q.y - 198) * q.t : q.y + (292 - q.y) * q.t;
          q.e.setAttribute('cx', q.x.toFixed(1)); q.e.setAttribute('cy', y.toFixed(1)); q.e.setAttribute('fill', q.k ? '#7ff0ff' : '#f472b6'); q.e.setAttribute('opacity', 0.9);
        });
      });
      eqbox(g, 30, 420, 640, ['R = η·qλ/hc = η·λ[µm]/1.24   →  ideal 1.06 A/W @ 1310 nm', 'f3dB = (ft⁻² + fRC⁻²)^−½,  ft ≈ 0.45·vsat/d,  fRC = 1/(2πRC)', 'I_dark doubles every ~10 K (threading-dislocation generation)'], { size: 11.5 });
    },
    hotspots: [{ target: 'pd-band-diagram', x: 195, y: 195, w: 220, h: 100, label: 'Band diagram & absorption' }, { target: 'tia', x: 260, y: 170, w: 120, h: 22, label: 'TIA' }]
  });

  // ================================================================ PD BAND DIAGRAM
  add({
    id: 'pd-band-diagram', parent: 'photodetector', domain: 'optics', level: 7,
    title: 'Photon absorption in Ge — band picture',
    subtitle: 'Direct-gap absorption, drift in a reverse-biased PIN',
    summary: 'A 1310 nm photon carries 0.95 eV. Germanium\'s direct (Γ-valley) gap is 0.80 eV, so the photon lifts an electron straight from the valence band to the conduction band, leaving a hole. In the reverse-biased intrinsic region the bands are tilted: the electron "rolls downhill" to the N side and the hole "floats uphill" to the P side — that motion is the photocurrent.',
    what: '<p><b>Energetics:</b> E_ph = hc/λ = 1.2398/λ[µm] eV → 0.946 eV at 1310 nm, 0.80 eV at 1550 nm. Ge: indirect gap 0.66 eV (L valley), direct gap 0.80 eV (Γ) at 300 K. Because Γ is only ~0.14 eV above L, direct absorption is strong (α ~ 10⁴ cm⁻¹) above 0.8 eV. Tensile strain from Ge-on-Si growth (~0.2%) shrinks the direct gap to ~0.77 eV and extends absorption to ~1600 nm ' + B('typ') + '. Silicon (1.12 eV indirect) is transparent at 1310 nm — which is why it can guide the light.</p>' +
      '<p><b>Transport:</b> under ~1–2 V reverse bias across ~0.5 µm the field is ~3–4×10⁴ V/cm, enough for carriers to reach saturation velocity (~6×10⁶ cm/s); holes are slower and usually dominate transit time. Carriers generated outside the field region diffuse slowly → "slow tail" — design keeps absorption inside the depleted Ge.</p>',
    needs: ['Photon energy above the direct gap', 'Absorption inside the high-field region', 'Low trap density (otherwise recombination and dark current)'],
    interfaces: [{ with: 'photodetector', type: 'optical', detail: 'Microscopic picture of the device' }],
    kpis: [{ name: 'E_photon @1310', value: '0.946 eV', tag: 'typ' }, { name: 'Ge direct gap', value: '0.80 eV (0.77 strained)', tag: 'typ' }, { name: 'Ge indirect gap', value: '0.66 eV', tag: 'typ' }, { name: 'α_Ge @1310', value: '~7–9×10³ cm⁻¹', tag: 'typ' }],
    physics: '<div class="eq">E = hν = hc/λ = 1.2398 eV·µm / λ\nα(E) ∝ √(E − E_g,Γ)  (direct allowed transition)\nDrift: v = µE → v_sat;  t_transit = d / v_sat ≈ 0.5 µm / 6e6 cm/s ≈ 8 ps\nGeneration rate G(x) = Φ·α·e^(−αx)</div>',
    failures: ['Trap-assisted generation (dark current)', 'Space-charge screening at high photon flux → field collapse, slower response'],
    monitoring: ['Not directly; manifests as responsivity, bandwidth and dark current'],
    scene(g, api) {
      const c = mk(g, api);
      title(g, 'Energy-band diagram of a reverse-biased Ge PIN', 'Photon (wavy) → electron jumps Ev→Ec (direct Γ transition) → electron drifts to N, hole to P. Right: E–k sketch of Ge.');
      const xP = 80, xi0 = 260, xi1 = 600, xN = 720;
      const st = { V: 1 };
      const Ec = el(g, 'polyline', { fill: 'none', stroke: '#7ff0ff', 'stroke-width': 3, filter: c.url('glow') });
      const Ev = el(g, 'polyline', { fill: 'none', stroke: '#f472b6', 'stroke-width': 3, filter: c.url('glow') });
      T(g, xP, 545, 'P+', { size: 14, weight: 700, fill: '#ff9a9a' }); T(g, (xi0 + xi1) / 2, 545, 'intrinsic Ge (depleted, high field)', { anchor: 'middle', size: 12, fill: cv('muted') }); T(g, xN - 20, 545, 'N+', { size: 14, weight: 700, fill: '#9ab4ff' });
      const ecT = T(g, xP, 0, 'Ec', { size: 12, fill: '#7ff0ff' }), evT = T(g, xP, 0, 'Ev', { size: 12, fill: '#f472b6' });
      const egT = T(g, 0, 0, 'Eg,Γ = 0.80 eV', { size: 11, fill: cv('text') });
      const yOf = x => { const drop = 60 + 80 * st.V; if (x <= xi0) return 0; if (x >= xi1) return drop; return drop * (x - xi0) / (xi1 - xi0); };
      const base = 160, gap = 150;
      function draw() {
        const pts = [xP, xi0, xi1, xN];
        Ec.setAttribute('points', pts.map(x => x + ',' + (base + yOf(x))).join(' '));
        Ev.setAttribute('points', pts.map(x => x + ',' + (base + gap + yOf(x))).join(' '));
        ecT.setAttribute('y', base - 8); evT.setAttribute('y', base + gap + 20);
      }
      draw();
      const phot = Pa(g, '', { stroke: WL[4], sw: 2.2, filter: c.url('glow') });
      const jump = Ln(g, 0, 0, 0, 0, { stroke: '#fff', sw: 1.6, dash: '3 3' });
      const el1 = Ci(g, 0, 0, 7, { fill: '#7ff0ff', filter: c.url('glow') }), ho = Ci(g, 0, 0, 7, { fill: 'none', stroke: '#f472b6', sw: 2.5 });
      T(g, 300, 120, 'E_photon(1310 nm) = 0.946 eV  >  Eg,Γ', { size: 12, fill: WL[4] });
      // E-k
      const kx = 800, ky = 120;
      R(g, kx - 20, ky - 30, 210, 330, { fill: '#080c12', stroke: cv('line'), rx: 6 });
      T(g, kx, ky - 10, 'Ge E–k (schematic)', { size: 11, fill: cv('muted') });
      const par = (x0, y0, a, up, col) => { let d = ''; for (let i = -10; i <= 10; i++) { const x = x0 + i * 5, y = y0 + (up ? -1 : 1) * a * i * i * 0.6; d += (i === -10 ? 'M' : 'L') + x + ',' + y; } Pa(g, d, { stroke: col, sw: 2 }); };
      par(kx + 50, ky + 110, 1.4, false, '#7ff0ff'); par(kx + 150, ky + 140, 0.7, false, '#7ff0ff'); par(kx + 50, ky + 220, 1.0, true, '#f472b6');
      T(g, kx + 50, ky + 100, 'Γ', { anchor: 'middle', size: 12, fill: '#7ff0ff' }); T(g, kx + 150, ky + 130, 'L', { anchor: 'middle', size: 12, fill: '#7ff0ff' });
      Ln(g, kx + 50, ky + 218, kx + 50, ky + 114, { stroke: WL[4], sw: 2.4, end: c.arrow(WL[4]), filter: c.url('glow') });
      T(g, kx + 56, ky + 170, 'direct 0.80 eV', { size: 10.5, fill: WL[4] }); T(g, kx + 100, ky + 200, 'indirect 0.66 eV', { size: 10.5, fill: cv('muted') });
      const s = slider(c, g, 300, 585, 300, { label: 'reverse bias (tilts the bands)', min: 0, max: 3, value: 1, color: cv('data'), fmt: v => v.toFixed(1) + ' V', onchange: v => { st.V = v; draw(); } });
      void s;
      let t = 0, x0 = 380;
      c.loop(dt => {
        t += dt * MS * (0.6 + 0.2 * st.V);
        const ph = t % 2.4;
        const yc = base + yOf(x0), yv = base + gap + yOf(x0);
        egT.setAttribute('x', x0 + 10); egT.setAttribute('y', (yc + yv) / 2);
        if (ph < 0.6) {
          const xx = 280 + (x0 - 280) * ph / 0.6; let d = 'M' + (xx - 140) + ',' + (yv - 40);
          for (let i = 0; i <= 28; i++) { const u = i / 28; d += 'L' + (xx - 140 + u * 140).toFixed(1) + ',' + (yv - 40 + u * 40 + 8 * Math.sin(u * 30 - t * 20)).toFixed(1); }
          phot.setAttribute('d', d); phot.setAttribute('opacity', 1);
          el1.setAttribute('cx', x0); el1.setAttribute('cy', yv); ho.setAttribute('opacity', 0); el1.setAttribute('opacity', 0.2); jump.setAttribute('opacity', 0);
        } else if (ph < 0.9) {
          phot.setAttribute('opacity', 0); const u = (ph - 0.6) / 0.3;
          el1.setAttribute('cx', x0); el1.setAttribute('cy', yv + (yc - yv) * u); el1.setAttribute('opacity', 1);
          ho.setAttribute('cx', x0); ho.setAttribute('cy', yv); ho.setAttribute('opacity', 1);
          jump.setAttribute('x1', x0); jump.setAttribute('x2', x0); jump.setAttribute('y1', yv); jump.setAttribute('y2', yc); jump.setAttribute('opacity', 0.8);
        } else {
          const u = clamp((ph - 0.9) / 1.3, 0, 1);
          const xe = x0 + (xN - 10 - x0) * u, xh = x0 - (x0 - xP - 10) * Math.pow(u, 1.3);
          el1.setAttribute('cx', xe); el1.setAttribute('cy', base + yOf(xe));
          ho.setAttribute('cx', xh); ho.setAttribute('cy', base + gap + yOf(xh));
          jump.setAttribute('opacity', 0.25 * (1 - u));
        }
        if (ph > 2.35) x0 = 300 + Math.random() * 260;
      });
    },
    hotspots: []
  });

  // ================================================================ FIBER COUPLER
  add({
    id: 'fiber-coupler', parent: 'pic', domain: 'optics', level: 5,
    title: 'Fiber-to-chip coupler',
    subtitle: 'Edge (inverse-taper) vs grating coupler; mode-size conversion and alignment tolerance',
    summary: 'A silicon waveguide mode is ~0.4 µm across; a fiber mode is ~9 µm. Coupling them efficiently means growing the chip mode about 20× (edge coupler: an inverse taper that pushes the mode out into a bigger glass waveguide) or diffracting it vertically out of the chip surface (grating coupler). The coupler sets 1–3 dB of every link budget and much of the packaging difficulty.',
    what: '<p><b>Edge coupler:</b> the Si waveguide narrows to a ~150–200 nm tip; the mode, no longer confined, expands into a surrounding SiN or oxide "cladding waveguide" sized to the fiber (or a lensed/UHNA fiber). Broadband (&gt;100 nm), polarization-tolerant-ish, loss ~0.5–2 dB, but needs a polished/etched facet at the chip edge and a V-groove/FAU aligned to ~±1 µm ' + B('typ') + '.</p>' +
      '<p><b>Grating coupler:</b> a periodic etch (Λ ≈ 0.5–0.6 µm at 1310) diffracts light upward at ~8–12° off vertical; phase matching n_eff − sinθ·n_clad = λ/Λ. Allows wafer-level testing anywhere on the die and relaxed alignment (±2–3 µm) but is narrowband (~30–40 nm 1-dB), polarization-specific and typically 1.5–3 dB loss (better with bottom reflectors/apodization) ' + B('typ') + '.</p>' +
      '<p><b>Mode overlap:</b> coupling efficiency between two Gaussian modes of radii w₁, w₂ with lateral offset d is η = (2w₁w₂/(w₁²+w₂²))²·exp(−2d²/(w₁²+w₂²)). For matched 4.6 µm radii, 1 µm offset costs ~0.2 dB, 2 µm ~0.8 dB.</p>',
    needs: ['Mode-size match to fiber (MFD ~9.2 µm @1310 for SMF)', 'Sub-µm alignment, held over temperature & life (adhesive, glass-on-glass, or detachable precision interface)', 'Low back-reflection (angled facets / AR coating)', 'Polarization control for TE-only devices'],
    interfaces: [{ with: 'fiber-plant (FAU)', type: 'optical', detail: 'SMF for TX/RX, PMF for laser input' }, { with: 'waveguide', type: 'optical', detail: 'On-chip side' }],
    kpis: [{ name: 'Edge coupler loss', value: '0.5–2 dB', tag: 'typ' }, { name: 'Grating coupler loss', value: '1.5–3 dB', tag: 'typ' }, { name: 'Grating 1-dB BW', value: '~30–40 nm', tag: 'typ' }, { name: '1 dB alignment tol.', value: '±1–2.5 µm', tag: 'typ' }, { name: 'Return loss', value: '> 30–40 dB', tag: 'typ' }],
    physics: '<div class="eq">Gaussian overlap:  η = (2w₁w₂/(w₁²+w₂²))² · exp(−2d²/(w₁²+w₂²))\nAngular: η_θ = exp(−(π·n·w·θ/λ)²)\nGrating phase match: n_eff − n_c·sinθ = m·λ/Λ\nMFD SMF @1310 ≈ 9.2 µm → w = 4.6 µm</div>',
    failures: ['Adhesive creep / CTE mismatch → misalignment drift', 'Facet contamination or damage (high optical power density at the tip)', 'Back-reflection into laser path (RIN, instability)', 'Polarization-dependent loss on grating couplers'],
    monitoring: ['TX tap PDs and RX power show coupling degradation', 'Production: active alignment maximizing PD current'],
    scene(g, api) {
      const c = mk(g, api);
      title(g, 'Edge coupler vs grating coupler — and why microns matter', 'Top: the mode grows along an inverse taper / diffracts out of a grating. Bottom: drag lateral offset and chip-mode size.');
      const O = cv('optic');
      // edge coupler (top view)
      R(g, 30, 80, 460, 190, { fill: '#0b121c', stroke: cv('line'), rx: 6 });
      T(g, 40, 98, 'Edge coupler (top view): inverse taper → expanded mode → fiber', { size: 11.5, weight: 600 });
      Pa(g, 'M40,175L120,172L300,177L300,173L120,178L40,181Z', { fill: '#8fa3bb' });
      R(g, 140, 150, 220, 50, { fill: '#2a4a66', op: 0.4, rx: 2 });
      T(g, 250, 214, 'SiN / oxide cladding guide', { anchor: 'middle', size: 10, fill: cv('muted') });
      T(g, 80, 160, 'Si 450 nm', { anchor: 'middle', size: 10, fill: cv('muted') }); T(g, 300, 160, 'tip ~180 nm', { anchor: 'middle', size: 10, fill: cv('muted') });
      R(g, 380, 120, 100, 110, { fill: '#1a2230', stroke: '#6b7f99', rx: 3 });
      Ci(g, 430, 175, 26, { fill: '#203045', stroke: '#9fb4cc' }); Ci(g, 430, 175, 6, { fill: '#2f4a68' });
      T(g, 430, 244, 'SMF in V-groove', { anchor: 'middle', size: 10, fill: cv('mech') });
      const modes = [];
      for (let i = 0; i < 6; i++) modes.push(el(g, 'ellipse', { cx: 0, cy: 176, rx: 4, ry: 4, fill: c.url('mode'), opacity: 0.8 }));
      // grating coupler (side view)
      R(g, 510, 80, 460, 190, { fill: '#0b121c', stroke: cv('line'), rx: 6 });
      T(g, 520, 98, 'Grating coupler (side view): diffracts up at ~10°', { size: 11.5, weight: 600 });
      R(g, 520, 220, 440, 30, { fill: '#1a2a3e', rx: 0 });
      R(g, 520, 205, 440, 15, { fill: '#8fa3bb', op: 0.6, rx: 0 });
      for (let i = 0; i < 14; i++) R(g, 700 + i * 14, 205, 7, 7, { fill: '#0b121c', rx: 0 });
      beam(c, g, [[520, 212], [700, 212]], { color: O, w: 2.5, halo: false });
      const gx = 790;
      Pa(g, 'M' + (gx - 40) + ',120L' + (gx + 10) + ',120L' + (gx + 25) + ',200L' + (gx - 25) + ',200Z', { fill: '#203045', stroke: '#9fb4cc', op: 0.8 });
      Pa(g, 'M' + (gx - 25) + ',120L' + (gx - 5) + ',120L' + (gx + 5) + ',200L' + (gx - 15) + ',200Z', { fill: '#2f4a68' });
      T(g, gx + 40, 130, 'fiber tilted ~10°', { size: 10, fill: cv('mech') });
      const up = [];
      for (let i = 0; i < 10; i++) up.push({ e: Ci(g, 0, 0, 3, { fill: O, filter: c.url('glow') }), t: i / 10 });
      T(g, 700, 262, 'Λ ≈ 0.55 µm period', { size: 10, fill: cv('muted') });
      // overlap plot
      const P = plot(g, 80, 320, 420, 200, { x0: 0, x1: 5, y0: -6, y1: 0, xt: [0, 1, 2, 3, 4, 5], yt: [0, -1, -2, -3, -4, -5, -6], xl: 'lateral offset d (µm)', yl: 'coupling loss (dB)', ylo: 30 });
      const st = { d: 1, w1: 4.6 };
      const eta = (d, w1, w2) => Math.pow(2 * w1 * w2 / (w1 * w1 + w2 * w2), 2) * Math.exp(-2 * d * d / (w1 * w1 + w2 * w2));
      const ref = P.line(d => 10 * Math.log10(eta(d, 4.6, 4.6)), { color: cv('muted'), w: 1.2, dash: '4 3' });
      const cur = P.line(d => 10 * Math.log10(eta(d, st.w1, 4.6)), { color: O, w: 2.4, glow: c.url('glow') });
      void ref;
      const dot = Ci(g, 0, 0, 5, { fill: '#fff', filter: c.url('glow') });
      // overlap picture
      const ox = 640, oy = 430;
      R(g, 560, 320, 410, 200, { fill: '#080c12', stroke: cv('line'), rx: 6 });
      T(g, 570, 338, 'mode overlap (end view)', { size: 11, fill: cv('muted') });
      const fm = Ci(g, ox, oy, 46, { fill: 'none', stroke: '#9fb4cc', sw: 1.5, dash: '4 3' });
      const cm = el(g, 'ellipse', { cx: ox, cy: oy, rx: 46, ry: 46, fill: c.url('mode'), opacity: 0.85 });
      void fm;
      T(g, ox, oy + 70, 'dashed: fiber MFD 9.2 µm', { anchor: 'middle', size: 10, fill: '#9fb4cc' });
      const rd = readout(g, 760, 380, ['offset', 'chip mode radius', 'coupling η', 'loss'], { vx: 120, lh: 22 });
      const s1 = slider(c, g, 760, 480, 190, { label: 'lateral offset', min: 0, max: 5, value: 1, step: 0.05, color: O, fmt: v => v.toFixed(2) + ' µm', onchange: v => { st.d = v; upd(); } });
      const s2 = slider(c, g, 560, 560, 300, { label: 'chip mode radius w₁ (fiber w₂ = 4.6 µm)', min: 1, max: 7, value: 4.6, step: 0.1, color: cv('accent'), fmt: v => v.toFixed(1) + ' µm', onchange: v => { st.w1 = v; cur.update(d => 10 * Math.log10(eta(d, st.w1, 4.6))); upd(); } });
      void s2;
      function upd() {
        const e = eta(st.d, st.w1, 4.6);
        dot.setAttribute('cx', P.X(st.d)); dot.setAttribute('cy', P.Y(Math.max(-6, 10 * Math.log10(e))));
        cm.setAttribute('cx', ox + st.d * 10); cm.setAttribute('rx', st.w1 * 10); cm.setAttribute('ry', st.w1 * 10);
        rd(0, st.d.toFixed(2) + ' µm'); rd(1, st.w1.toFixed(1) + ' µm'); rd(2, (e * 100).toFixed(1) + ' %'); rd(3, (-10 * Math.log10(e)).toFixed(2) + ' dB', e > 0.8 ? cv('good') : cv('bad'));
      }
      upd();
      let t = 0;
      c.loop(dt => {
        t += dt * MS;
        if (s1.idle()) { st.d = 1.5 + 1.5 * Math.sin(t * 0.6); s1.set(st.d, true); upd(); }
        modes.forEach((m, i) => { const u = ((t * 0.5 + i / 6) % 1), x = 50 + u * 380, rr = x < 120 ? 4 : x < 300 ? 4 + (x - 120) / 180 * 18 : 22; m.setAttribute('cx', x.toFixed(1)); m.setAttribute('rx', rr.toFixed(1)); m.setAttribute('ry', rr.toFixed(1)); m.setAttribute('opacity', (0.85 * (1 - u * 0.4)).toFixed(2)); });
        up.forEach(p => { p.t = (p.t + dt * 0.25 * MS) % 1; const u = (p.t * 4) % 1, xs = 710 + p.t * 180; p.e.setAttribute('cx', (xs + u * 14).toFixed(1)); p.e.setAttribute('cy', (205 - u * 80).toFixed(1)); p.e.setAttribute('opacity', (1 - u).toFixed(2)); });
      });
    },
    hotspots: [{ target: 'fiber-plant', x: 375, y: 115, w: 110, h: 120, label: 'Fiber plant / FAU' }, { target: 'smf-fiber', x: 745, y: 115, w: 70, h: 90, label: 'Single-mode fiber' }]
  });

  // ================================================================ EXTERNAL LASER SOURCE
  add({
    id: 'external-laser', parent: 'switch-chassis', domain: 'optics', level: 2,
    title: 'External laser source (ELS)',
    subtitle: 'Front-panel pluggable CW laser modules feeding the engines by PM fiber',
    summary: 'Lasers hate heat and are the least reliable part of an optical link. CPO therefore keeps them out of the package: front-panel-serviceable laser modules generate continuous-wave O-band light at several wavelengths and send it by polarization-maintaining fiber to the optical engines, where the ring modulators imprint data. One high-power laser can be split to feed many lanes — NVIDIA cites 4× fewer lasers versus pluggables.',
    what: '<p><b>Why external:</b> (1) <b>thermal</b> — DFB threshold and efficiency degrade rapidly with temperature (T₀ ~ 50–80 K), and the area beside a ~1 kW-class ASIC runs hot; (2) <b>reliability</b> — laser wear-out is the dominant optical FIT contributor, so it must be <b>field-replaceable</b> without touching the package; (3) <b>efficiency</b> — fewer, larger, temperature-controlled lasers at their best operating point. NVIDIA public: front-panel-serviceable ELS, <b>4× fewer lasers</b>, contributing to <b>10× better resiliency</b> ' + B('nv') + '.</p>' +
      '<p><b>Inside a module</b> ' + B('typ') + ': an array of high-power O-band DFB lasers (one per wavelength of the WDM grid, ~50–300 mW each) on a TEC, optical isolators, possibly a wavelength combiner and power splitters, PM fiber pigtails into a front-panel connector; drive electronics with automatic power control (APC) and temperature control; management via CMIS-like registers. Exact NVIDIA ELS internals are not public.</p>' +
      '<p><b>Eye safety:</b> tens to hundreds of mW of invisible 1310 nm light per fiber exceeds Class 1 levels; designs use interlocks, shutters on unmated connectors and power ramp control so that the accessible emission stays within IEC 60825-1 limits ' + B('typ') + '.</p>',
    needs: ['High CW power with low RIN (< −150 dB/Hz) and narrow linewidth', 'Wavelength accuracy & stability (TEC: ±0.1 K → ±~10 pm)', 'Polarization-maintaining delivery (PER > 20 dB) to TE-only PICs', 'Isolation from back-reflections (isolator, angled connectors)', 'Hot-swap without disturbing other lanes; eye-safety interlocks'],
    interfaces: [{ with: 'optical-engine', type: 'optical', detail: 'CW light via PM fiber through chassis to package' }, { with: 'power-delivery', type: 'power', detail: 'Laser drive current + TEC power' }, { with: 'control-plane', type: 'mgmt', detail: 'Power setpoints, alarms, inventory, interlock' }, { with: 'thermal-system', type: 'thermal', detail: 'Front-panel airflow / cold plate; TEC heat rejection' }, { with: 'laser-apc-loop', type: 'mgmt', detail: 'Back-facet monitor PD → current control' }],
    kpis: [
      { name: 'Laser count vs pluggables', value: '4× fewer', tag: 'nv' }, { name: 'Serviceability', value: 'Front-panel replaceable', tag: 'nv' },
      { name: 'Power / wavelength', value: '~50–300 mW (17–25 dBm)', tag: 'typ' }, { name: 'RIN', value: '< −150 dB/Hz', tag: 'typ' },
      { name: 'Wavelength drift (DFB)', value: '~0.08–0.1 nm/K', tag: 'typ' }, { name: 'Laser WPE', value: '~20–40 %', tag: 'typ' }
    ],
    physics: '<div class="eq">Split budget per lane: P_lane = P_laser − IL_iso − IL_conn − 10·log10(N_split) − IL_fiber − IL_coupler\n  e.g. 22 dBm − 0.5 − 1.0 − 9.0 (1:8) − 0.5 − 2.0 ≈ 9 dBm into the ring bus  [est]\nWall-plug efficiency: WPE = P_opt / (I·V + P_TEC)</div>',
    failures: ['Laser aging (threshold up, efficiency down) → APC raises current → EOL alarm → replace module', 'TEC failure → wavelength drift beyond ring tuning range', 'PM fiber stress/twist → polarization extinction loss → power fading at TE couplers', 'Back-reflection → RIN / mode hops → many lanes affected simultaneously (shared laser = shared fate)', 'Unmated connector emission → eye hazard (interlock)'],
    monitoring: ['Back-facet monitor PD per laser (APC loop)', 'Laser bias current trend = aging indicator', 'TEC current & thermistor temperature', 'Downstream: OE laser-input tap PDs confirm delivered power'],
    scene(g, api) {
      const c = mk(g, api);
      title(g, 'External laser source — from front panel to package', 'Cool, serviceable lasers at the front; PM fibers carry CW comb light across the chassis to the hot co-packaged engines.');
      const O = cv('optic');
      R(g, 0, 70, 1000, 530, { fill: 'url(#' + c.ref('grid') + ')', rx: 0, op: 0.5 });
      // thermal gradient
      const tg = S('linearGradient', { id: c.ref('tg'), x1: 0, y1: 0, x2: 1, y2: 0 });
      tg.appendChild(S('stop', { offset: 0, 'stop-color': '#1d4ed8', 'stop-opacity': 0.12 })); tg.appendChild(S('stop', { offset: 1, 'stop-color': '#ff5a36', 'stop-opacity': 0.22 }));
      c.defs.appendChild(tg);
      R(g, 0, 70, 1000, 40, { fill: c.url('tg'), rx: 0, dom: 'thermal' });
      T(g, 20, 95, 'front panel ~35–50 °C', { size: 11, fill: '#7da0ff' }); T(g, 980, 95, 'ASIC/package ~70–105 °C', { size: 11, fill: cv('therm'), anchor: 'end' });
      // front panel
      R(g, 20, 120, 60, 460, { fill: '#1a2230', stroke: '#6b7f99', rx: 4, dom: 'mechanical' });
      T(g, 50, 595, 'front panel', { anchor: 'middle', size: 10, fill: cv('mech') });
      // ELS module zoom
      R(g, 90, 140, 330, 300, { fill: '#0c121b', stroke: O, sw: 1.6, rx: 8, dom: 'optics' });
      T(g, 100, 160, 'ELS module (pluggable cartridge)', { size: 12, weight: 600, fill: O });
      R(g, 110, 180, 120, 230, { fill: '#2b2030', stroke: cv('therm'), rx: 4, dom: 'thermal' });
      T(g, 170, 400, 'TEC', { anchor: 'middle', size: 10.5, fill: cv('therm') });
      const las = [];
      for (let i = 0; i < 8; i++) {
        const y = 190 + i * 25;
        R(g, 125, y, 60, 14, { fill: '#3a2a20', stroke: WL[i], rx: 2 });
        las.push(R(g, 185, y + 4, 8, 6, { fill: WL[i], filter: c.url('glow2'), rx: 1 }));
        T(g, 120, y + 11, 'λ' + (i + 1), { size: 9, anchor: 'end', fill: WL[i], mono: true });
      }
      chip(c, g, 245, 185, 60, 210, 'iso', { color: '#9fb4cc', sub: 'isolators', ssize: 9 });
      chip(c, g, 320, 185, 80, 210, 'split', { color: O, sub: '1:N per λ', ssize: 9 });
      for (let i = 0; i < 8; i++) { const y = 197 + i * 25; beam(c, g, [[193, y], [245, y]], { color: WL[i], w: 2, halo: false }); beam(c, g, [[305, y], [320, y]], { color: WL[i], w: 2, halo: false }); }
      chip(c, g, 110, 448, 140, 50, 'Driver + APC', { color: cv('ctrl'), sub: 'current, mon-PD', dom: 'control' });
      chip(c, g, 260, 448, 150, 50, 'Mgmt / interlock', { color: cv('ctrl'), sub: 'CMIS-like regs', dom: 'control' });
      // fibers to package
      R(g, 760, 200, 220, 280, { fill: '#121a24', stroke: '#5b6b80', rx: 8 });
      T(g, 870, 220, 'switch package', { anchor: 'middle', size: 12, fill: cv('muted') });
      R(g, 825, 290, 90, 90, { fill: '#1d2533', stroke: '#7a8ca3', rx: 4 }); T(g, 870, 340, 'ASIC', { anchor: 'middle', size: 12, fill: cv('mech') });
      const oe = [[790, 250], [880, 240], [940, 330], [880, 410], [790, 400]];
      oe.forEach(([x, y]) => R(g, x - 18, y - 12, 36, 24, { fill: '#2a1a14', stroke: O, rx: 3, dom: 'optics' }));
      for (let f = 0; f < 5; f++) {
        const [x, y] = oe[f], y0 = 230 + f * 30;
        const pts = [[400, y0], [520, y0], [600, 160 + f * 70], [700, y], [x - 18, y]];
        Pa(g, ptsD(pts), { stroke: '#ffd9b0', sw: 2.2, op: 0.25, dom: 'optics' });
        flow(c, g, pts, { n: 10, colors: WL, r: 2.5, speed: 120, dom: 'optics' });
      }
      T(g, 560, 140, 'PM fibers (CW, multi-λ, TE-aligned)', { anchor: 'middle', size: 11, fill: '#ffd9b0' });
      eqbox(g, 440, 480, 300, ['P_lane ≈ P_laser − IL − 10·log(N_split)', 'one laser → many lanes ⇒ "4× fewer lasers"', 'cool + replaceable ⇒ resiliency'], { size: 11 });
      let t = 0;
      c.loop(dt => { t += dt; las.forEach((l, i) => l.setAttribute('opacity', (0.75 + 0.25 * Math.sin(t * 3 + i)).toFixed(2))); });
    },
    hotspots: [
      { target: 'laser-diode', x: 110, y: 180, w: 125, h: 230, label: 'DFB laser diode' },
      { target: 'fiber-plant', x: 420, y: 150, w: 330, h: 240, label: 'PM fiber plant' },
      { target: 'laser-apc-loop', x: 105, y: 443, w: 150, h: 60, label: 'Laser APC loop' },
      { target: 'optical-engine', x: 765, y: 225, w: 200, h: 200, label: 'Optical engines' }
    ]
  });

  // ================================================================ LASER DIODE
  add({
    id: 'laser-diode', parent: 'external-laser', domain: 'optics', level: 3,
    title: 'DFB laser diode',
    subtitle: 'InP ridge laser: MQW gain, Bragg grating, threshold, slope efficiency, temperature',
    summary: 'A semiconductor laser is a forward-biased PN junction whose active layer (quantum wells) gives optical gain once enough electrons and holes are injected. A grating etched along the cavity (distributed feedback) reflects only one wavelength, so the laser emits a single, stable line. Below the threshold current it only glows; above it, output power rises linearly with current.',
    what: '<p><b>Structure</b> ' + B('typ') + ': n-InP substrate → n-cladding → separate-confinement layers + 4–8 InGaAsP or AlGaInAs <b>quantum wells</b> (O-band) → p-cladding containing the <b>Bragg grating</b> (period Λ = λ/(2n_eff) ≈ 200 nm, often with a λ/4 phase shift) → p-contact on a 1.5–2.5 µm-wide ridge. Facets: AR front, HR or AR rear; length 0.5–1.5 mm for high power.</p>' +
      '<p><b>L–I curve:</b> P = η_d·(hν/q)·(I − I_th). Threshold I_th ~10–40 mA (high-power long cavities more), slope efficiency ~0.3–0.5 W/A per facet ' + B('typ') + '. Threshold rises with temperature as I_th(T) = I_th0·exp(T/T₀) (T₀ ≈ 50–80 K for InGaAsP, higher for AlGaInAs); slope falls — hence the TEC.</p>' +
      '<p><b>Wavelength:</b> λ_B = 2n_eff·Λ; DFB drift is ~0.08–0.1 nm/K (the index changes, not the gain peak, which moves ~0.4–0.5 nm/K). Interesting coincidence: Si rings drift at a similar rate, but rings sit on the hot package and the laser on a TEC — so they do not track each other.</p><p><b>Noise:</b> RIN from spontaneous emission & relaxation oscillations (few GHz); high power and good isolation give RIN &lt; −150 dB/Hz. Linewidth ~MHz is irrelevant for IM-DD but reflections can cause mode hops.</p>',
    needs: ['Stable temperature (TEC) for wavelength & efficiency', 'Low-noise current source with APC', 'Optical isolation > 30 dB from reflections', 'Facet passivation for high power (COD protection)'],
    interfaces: [{ with: 'external-laser', type: 'optical', detail: 'Output into isolator / splitter' }, { with: 'laser-apc-loop', type: 'electrical', detail: 'Back-facet PD current → drive current' }, { with: 'thermal-system', type: 'thermal', detail: 'TEC and module heat sink' }],
    kpis: [{ name: 'Threshold', value: '10–40 mA', tag: 'typ' }, { name: 'Slope efficiency', value: '0.3–0.5 W/A', tag: 'typ' }, { name: 'T₀', value: '50–80 K', tag: 'typ' }, { name: 'SMSR', value: '> 40 dB', tag: 'typ' }, { name: 'dλ/dT', value: '~0.09 nm/K', tag: 'typ' }, { name: 'WPE', value: '~20–40 %', tag: 'typ' }],
    physics: '<div class="eq">Threshold gain:  Γ·g_th = α_i + (1/2L)·ln(1/(R1·R2))   (DFB: κL sets mirror loss)\nP_out = η_d·(hν/q)·(I − I_th),   hν(1310 nm) = 0.946 eV\nI_th(T) = I_th0·e^(T/T₀),   η_d(T) falls with T\nV = V_0 + I·R_s  (V_0 ≈ hν/q + ~0.1 V),   WPE = P_out/(I·V)\nBragg: λ_B = 2·n_eff·Λ</div>',
    failures: ['Gradual degradation (threshold rise ~ %/kh) → APC compensates until EOL', 'Catastrophic optical damage at facet', 'Mode hop from reflections or temperature', 'Sudden failure (dark-line defects)'],
    monitoring: ['Back-facet PD (APC)', 'Bias current trend, voltage, TEC current & temperature'],
    scene(g, api) {
      const c = mk(g, api);
      title(g, 'DFB laser — longitudinal cut + live L–I characteristic', 'Carriers recombine in the quantum wells; the grating selects one wavelength. Drag current and temperature.');
      const O = WL[3];
      const x0 = 40, x1 = 560;
      R(g, x0, 330, x1 - x0, 70, { fill: '#2b3a5e', rx: 0 }); T(g, x0 + 8, 390, 'n-InP substrate / cladding', { size: 10.5, fill: '#9ab4ff' });
      R(g, x0, 290, x1 - x0, 40, { fill: '#3a2a20', rx: 0 });
      for (let i = 0; i < 5; i++) R(g, x0, 296 + i * 7, x1 - x0, 3, { fill: '#ffb21f', op: 0.6, rx: 0 });
      T(g, x0 + 8, 288, 'MQW active (InGaAsP / AlGaInAs)', { size: 10.5, fill: '#ffb21f' });
      let gd = 'M' + x0 + ',262'; for (let x = x0; x < x1; x += 10) gd += 'L' + (x + 5) + ',262L' + (x + 5) + ',270L' + (x + 10) + ',270L' + (x + 10) + ',262';
      Pa(g, gd, { stroke: '#cbd5e1', sw: 1.2 });
      T(g, 300, 255, 'λ/4-shifted Bragg grating  Λ ≈ 200 nm', { anchor: 'middle', size: 10.5, fill: '#cbd5e1' });
      R(g, x0, 200, x1 - x0, 60, { fill: '#5e2b2b', rx: 0, op: 0.8 }); T(g, x0 + 8, 220, 'p-InP cladding + ridge', { size: 10.5, fill: '#ff9a9a' });
      R(g, x0, 190, x1 - x0, 10, { fill: '#f0c419', rx: 0 }); T(g, 300, 184, 'p-contact (+)  — drive current I', { anchor: 'middle', size: 10.5, fill: cv('power') });
      R(g, x1, 280, 6, 60, { fill: '#7dd3fc', op: 0.7, rx: 0 }); T(g, x1 + 10, 275, 'AR front facet', { size: 10, fill: '#7dd3fc' });
      R(g, x0 - 6, 280, 6, 60, { fill: '#e2e8f0', op: 0.8, rx: 0 }); T(g, x0 - 4, 356, 'HR', { size: 10, fill: '#e2e8f0' });
      const sw = el(g, 'path', { fill: 'none', stroke: O, 'stroke-width': 2, filter: c.url('glow'), opacity: 0.8 });
      const outB = beam(c, g, [[x1 + 6, 310], [700, 310]], { color: O, w: 4, speed: 140 });
      const elec = [], hol = [], phs = [];
      for (let i = 0; i < 18; i++) { elec.push({ e: Ci(g, 0, 0, 2.6, { fill: '#7ff0ff' }), x: x0 + Math.random() * (x1 - x0), t: Math.random() }); hol.push({ e: Ci(g, 0, 0, 2.6, { fill: 'none', stroke: '#f472b6', sw: 1.4 }), x: x0 + Math.random() * (x1 - x0), t: Math.random() }); }
      for (let i = 0; i < 30; i++) phs.push({ e: Ci(g, 0, 0, 2.6, { fill: O, filter: c.url('glow') }), x: x0 + Math.random() * (x1 - x0), d: Math.random() > 0.5 ? 1 : -1 });
      const P = plot(g, 650, 90, 310, 210, { x0: 0, x1: 300, y0: 0, y1: 120, xt: [0, 100, 200, 300], yt: [0, 40, 80, 120], xl: 'drive current (mA)', yl: 'P_out (mW)', ylo: 30 });
      const st = { I: 180, T: 45 };
      const Ith = Tc => 25 * Math.exp((Tc - 25) / 60), eta = Tc => 0.45 * (1 - (Tc - 25) / 250);
      const Pout = (I, Tc) => Math.max(0, eta(Tc) * (I - Ith(Tc))) * (I > 260 ? 1 - (I - 260) / 400 : 1);
      const li25 = P.line(I => Pout(I, 25), { color: cv('muted'), w: 1.2, dash: '4 3' });
      const li = P.line(I => Pout(I, st.T), { color: O, w: 2.4, glow: c.url('glow') });
      void li25;
      const op = Ci(g, 0, 0, 5, { fill: '#fff', filter: c.url('glow2') });
      const rd = readout(g, 650, 340, ['threshold I_th', 'slope efficiency', 'output power', 'voltage (1.0 V + I·3 Ω)', 'wall-plug efficiency', 'wavelength shift vs 25 °C'], { vx: 160, lh: 21 });
      slider(c, g, 650, 480, 300, { label: 'drive current', min: 0, max: 300, value: 180, color: cv('power'), fmt: v => v.toFixed(0) + ' mA', onchange: v => { st.I = v; upd(); } });
      slider(c, g, 650, 530, 300, { label: 'chip temperature (TEC setpoint / failure)', min: 15, max: 95, value: 45, color: cv('therm'), fmt: v => v.toFixed(0) + ' °C', onchange: v => { st.T = v; li.update(I => Pout(I, st.T)); upd(); } });
      let pw = 0;
      function upd() {
        pw = Pout(st.I, st.T); const V = 1.0 + st.I * 1e-3 * 3, wpe = pw / (st.I * V);
        op.setAttribute('cx', P.X(st.I)); op.setAttribute('cy', P.Y(Math.min(120, pw)));
        rd(0, Ith(st.T).toFixed(1) + ' mA'); rd(1, eta(st.T).toFixed(2) + ' W/A'); rd(2, pw.toFixed(1) + ' mW  (' + (pw > 0 ? (10 * Math.log10(pw)).toFixed(1) : '−∞') + ' dBm)');
        rd(3, V.toFixed(2) + ' V'); rd(4, (wpe * 100).toFixed(1) + ' %'); rd(5, '+' + ((st.T - 25) * 0.09).toFixed(2) + ' nm');
        outB.setAttribute('opacity', clamp(pw / 80, 0.05, 1).toFixed(2));
      }
      upd();
      eqbox(g, 40, 430, 560, ['P = η_d·(hν/q)·(I − I_th)     I_th(T) = I_th0·exp(T/T₀), T₀ ≈ 60 K', 'Γ·g_th = α_i + α_mirror (DFB: κL)     λ_B = 2·n_eff·Λ', 'below threshold: spontaneous glow; above: stimulated, single-mode'], { size: 11.5 });
      let t = 0;
      c.loop(dt => {
        t += dt * MS;
        const lasing = pw > 0.5, inj = clamp(st.I / 150, 0.1, 1.5);
        elec.forEach(p => { p.t += dt * inj * MS; if (p.t > 1) { p.t = 0; p.x = x0 + Math.random() * (x1 - x0); } p.e.setAttribute('cx', p.x.toFixed(0)); p.e.setAttribute('cy', (330 + 50 - p.t * 60).toFixed(0)); });
        hol.forEach(p => { p.t += dt * inj * MS; if (p.t > 1) { p.t = 0; p.x = x0 + Math.random() * (x1 - x0); } p.e.setAttribute('cx', p.x.toFixed(0)); p.e.setAttribute('cy', (210 + p.t * 95).toFixed(0)); });
        phs.forEach(p => { p.x += p.d * 300 * dt * MS; if (p.x > x1) { p.d = -1; if (Math.random() < 0.3) p.x = x0 + Math.random() * 40; } if (p.x < x0) p.d = 1; p.e.setAttribute('cx', p.x.toFixed(0)); p.e.setAttribute('cy', (308 + Math.sin(p.x * 0.3) * 2).toFixed(0)); p.e.setAttribute('opacity', lasing ? 0.95 : 0.15); });
        let d = 'M' + x0 + ',310'; for (let x = x0; x <= x1; x += 4) d += 'L' + x + ',' + (310 + (lasing ? 8 * clamp(pw / 60, 0.2, 1) : 1) * Math.sin((x - x0) * 0.2 - t * 12)).toFixed(1);
        sw.setAttribute('d', d);
      });
    },
    hotspots: [{ target: 'laser-qw', x: 40, y: 285, w: 520, h: 48, label: 'Quantum-well gain physics' }, { target: 'laser-apc-loop', x: 650, y: 330, w: 310, h: 130, label: 'APC loop (power control)' }]
  });

  // ================================================================ LASER QUANTUM-WELL PHYSICS
  add({
    id: 'laser-qw', parent: 'laser-diode', domain: 'optics', level: 7,
    title: 'Quantum-well gain & stimulated emission',
    subtitle: 'Population inversion, quantized levels, gain = loss at threshold',
    summary: 'Inside each few-nanometre quantum well the electron and hole energies are quantized. Injected current fills the conduction band with electrons and the valence band with holes. When the separation of their quasi-Fermi levels exceeds the photon energy, a passing photon is more likely to stimulate an emission (making an identical twin photon) than to be absorbed — the medium has gain.',
    what: '<p><b>Bernard–Duraffourg condition:</b> gain at photon energy hν requires E_Fc − E_Fv &gt; hν &gt; E_g. Transparency carrier density N_tr ~1–2×10¹⁸ cm⁻³; gain grows roughly logarithmically above it, g(N) = g₀·ln(N/N_tr) ' + B('typ') + '.</p>' +
      '<p><b>Why quantum wells:</b> the step-like 2D density of states concentrates carriers at the band edge → lower transparency current, higher differential gain (faster, less chirp) and a lasing wavelength set by well thickness/composition (E = E_g + E_e1 + E_h1). Compressive/tensile strain further splits heavy/light-hole bands, selecting TE gain — convenient because Si photonics wants TE.</p>' +
      '<p><b>Threshold:</b> Γ·g_th = α_i + α_m, where Γ (~1–2% per well) is the overlap of the optical mode with the wells. Above threshold the carrier density clamps at N_th; extra current becomes photons (slope efficiency).</p>',
    needs: ['Good carrier confinement (band offsets ≫ kT, AlGaInAs better at high T)', 'Low internal loss α_i', 'Enough wells for gain without excessive transparency current'],
    interfaces: [{ with: 'laser-diode', type: 'optical', detail: 'Microscopic origin of the L–I curve' }],
    kpis: [{ name: 'Well thickness', value: '5–8 nm', tag: 'typ' }, { name: 'Number of wells', value: '4–8', tag: 'typ' }, { name: 'N_tr', value: '~1–2×10¹⁸ cm⁻³', tag: 'typ' }, { name: 'Confinement Γ', value: '~1–2 %/well', tag: 'typ' }],
    physics: '<div class="eq">E_n = ħ²π²n²/(2m*L_z²)   (infinite-well estimate)\nGain condition: E_Fc − E_Fv > hν > E_g\ng(N) ≈ g₀·ln(N/N_tr)\nRate eqs: dN/dt = ηI/(qV) − N/τ_n − v_g·g(N)·S\n          dS/dt = Γ·v_g·g(N)·S − S/τ_p + β·N/τ_n</div>',
    failures: ['Carrier leakage at high temperature → lower T₀', 'Defect-assisted non-radiative recombination (dark-line defects)', 'Auger recombination ∝ N³ dominates at high N in long-wavelength InP lasers'],
    monitoring: ['Inferred from threshold & slope trends over life'],
    scene(g, api) {
      const c = mk(g, api);
      title(g, 'Multiple quantum wells — band diagram under forward bias', 'Electrons (cyan) fill the wells from the n side, holes (pink) from the p side; photons trigger stimulated emission — one photon in, two out.');
      const x0 = 80, x1 = 920, nW = 4;
      let dc = 'M' + x0 + ',170', dv = 'M' + x0 + ',430';
      const wells = [];
      for (let i = 0; i < nW; i++) {
        const xa = 260 + i * 130, xb = xa + 60; wells.push([xa, xb]);
        dc += 'L' + xa + ',170L' + xa + ',230L' + xb + ',230L' + xb + ',170'; dv += 'L' + xa + ',430L' + xa + ',370L' + xb + ',370L' + xb + ',430';
      }
      dc += 'L' + x1 + ',170'; dv += 'L' + x1 + ',430';
      Pa(g, dc, { stroke: '#7ff0ff', sw: 2.5, filter: c.url('glow') }); Pa(g, dv, { stroke: '#f472b6', sw: 2.5, filter: c.url('glow') });
      T(g, x0, 160, 'Ec (barrier InGaAsP / AlGaInAs)', { size: 11, fill: '#7ff0ff' }); T(g, x0, 455, 'Ev', { size: 11, fill: '#f472b6' });
      wells.forEach(([a, b]) => { Ln(g, a, 218, b, 218, { stroke: '#7ff0ff', dash: '3 2', op: 0.7 }); Ln(g, a, 382, b, 382, { stroke: '#f472b6', dash: '3 2', op: 0.7 }); });
      T(g, 350, 212, 'E_e1', { size: 10, fill: '#7ff0ff' }); T(g, 350, 398, 'E_h1', { size: 10, fill: '#f472b6' });
      Ln(g, 900, 230, 900, 370, { stroke: WL[3], sw: 1.5, start: c.arrow(WL[3]), end: c.arrow(WL[3]) }); T(g, 892, 305, 'hν = 0.946 eV', { anchor: 'end', size: 11, fill: WL[3] });
      T(g, 100, 300, 'n-side ⟶', { size: 12, fill: '#9ab4ff' }); T(g, 900, 520, '⟵ p-side', { size: 12, anchor: 'end', fill: '#ff9a9a' });
      const es = [], hs = [];
      wells.forEach(([a, b]) => { for (let k = 0; k < 5; k++) { es.push({ e: Ci(g, a + 8 + k * 11, 222, 3.5, { fill: '#7ff0ff' }), a, b }); hs.push({ e: Ci(g, a + 8 + k * 11, 378, 3.5, { fill: 'none', stroke: '#f472b6', sw: 1.5 }), a, b }); } });
      const phot = []; for (let i = 0; i < 24; i++) phot.push({ e: Ci(g, -20, 300, 3.2, { fill: WL[3], filter: c.url('glow') }), x: -50, y: 300, on: false });
      phot[0].on = true; phot[0].x = x0; phot[0].y = 300;
      const flash = [];
      eqbox(g, 80, 480, 580, ['Gain if  E_Fc − E_Fv > hν > E_g  (Bernard–Duraffourg)', 'threshold: Γ·g_th = α_i + α_m ;  g(N) = g₀·ln(N/N_tr)', 'E_n ≈ ħ²π²n²/(2m*L_z²) — well width sets λ'], { size: 11.5 });
      let spawn = 0;
      c.loop(dt => {
        spawn += dt * MS;
        if (spawn > 1.4) { spawn = 0; const p = phot.find(q => !q.on); if (p) { p.on = true; p.x = x0; p.y = 290 + Math.random() * 20; } }
        phot.forEach(p => {
          if (!p.on) { p.e.setAttribute('opacity', 0); return; }
          const px = p.x; p.x += 200 * dt * MS;
          wells.forEach(([a, b]) => {
            const mid = (a + b) / 2;
            if (px < mid && p.x >= mid && Math.random() < 0.7) {
              const q = phot.find(z => !z.on);
              if (q) { q.on = true; q.x = p.x; q.y = p.y + (Math.random() > 0.5 ? 9 : -9); }
              const e = es.find(z => z.a === a && z.e.getAttribute('opacity') !== '0.15'), h = hs.find(z => z.a === a && z.e.getAttribute('opacity') !== '0.15');
              if (e) { e.e.setAttribute('opacity', 0.15); flash.push([e, 0.6]); } if (h) { h.e.setAttribute('opacity', 0.15); flash.push([h, 0.6]); }
            }
          });
          if (p.x > x1) p.on = false;
          p.e.setAttribute('cx', p.x.toFixed(1)); p.e.setAttribute('cy', p.y.toFixed(1)); p.e.setAttribute('opacity', 0.95);
        });
        for (let i = flash.length - 1; i >= 0; i--) { flash[i][1] -= dt * MS; if (flash[i][1] <= 0) { flash[i][0].e.setAttribute('opacity', 1); flash.splice(i, 1); } }
      });
    },
    hotspots: []
  });

  // ================================================================ FIBER PLANT
  add({
    id: 'fiber-plant', parent: 'switch-chassis', domain: 'optics', level: 2,
    title: 'Fiber plant (in-chassis optics)',
    subtitle: 'FAUs → shuffles → detachable connectors → front panel; laser feed fibers; lane-to-fiber mapping',
    summary: 'Hundreds to thousands of fibers run inside a CPO switch: from each optical engine\'s fiber array unit, through routing/shuffle trays, to detachable multi-fiber connectors at the front panel, plus polarization-maintaining fibers bringing laser light from the ELS modules. Every mated connector, bend and splice costs a fraction of a dB and is a place where dust or stress can break a link.',
    what: '<p><b>Path:</b> PIC coupler → <b>FAU</b> (V-groove glass block, 127/250 µm pitch) → short fiber ribbon/pigtail → <b>detachable package-side connector</b> (so the switch package can be assembled/tested and the fiber replaced) ' + B('nv') + ' → routing tray → front-panel <b>MPO/MT-style</b> adapter → external cable ' + B('typ') + '. Ecosystem partners named publicly include Corning, SENKO, Sumitomo Electric, Browave, TFC, Fabrinet ' + B('nv') + '.</p>' +
      '<p><b>Lane-to-fiber mapping (illustrative):</b> a 1.6T engine = 8×200G lanes. Parallel single-λ (DR-style) needs 8 TX + 8 RX fibers; 4-λ WDM needs 2+2; 8-λ WDM needs 1+1 — plus the laser-feed PM fibers. More WDM → fewer fibers, but more wavelengths to lock and a more complex ELS. NVIDIA\'s per-product mapping is not public; front-panel ports are 800G (or 200G breakouts) per the announced configs ' + B('nv') + '.</p>' +
      '<p><b>Handling:</b> minimum bend radius (~5–10 mm for bend-insensitive G.657 fiber, ~30 mm for standard), strain relief, cleanliness (IEC 61300-3-35 inspection), and labeling discipline for thousands of fibers.</p>',
    needs: ['Low loss per mated pair (≤0.35–0.75 dB) and high return loss', 'Bend-insensitive fiber in tight chassis routing', 'Repeatable, cleanable detachable interfaces', 'Polarization maintenance for laser-feed fibers (PER > 20 dB)'],
    interfaces: [{ with: 'optical-engine', type: 'optical', detail: 'FAU at each engine' }, { with: 'external-laser', type: 'optical', detail: 'PM fiber laser feed' }, { with: 'front-panel / cables', type: 'mechanical', detail: 'MPO/MT-style multi-fiber adapters' }],
    kpis: [
      { name: 'Detachable fiber connectivity', value: 'yes', tag: 'nv' }, { name: 'Ports (Quantum-X Photonics)', value: '144 × 800G', tag: 'nv' },
      { name: 'SMF loss @1310', value: '~0.33 dB/km', tag: 'typ' }, { name: 'Mated MPO loss', value: '0.2–0.75 dB', tag: 'typ' },
      { name: 'Return loss (angled)', value: '> 55–60 dB', tag: 'typ' }, { name: 'Fibers per 1.6T OE', value: '2–16 + laser feed', tag: 'est' }
    ],
    physics: '<div class="eq">Link loss = Σ IL_connectors + α·L + Σ IL_bends + IL_couplers\nFresnel reflection (glass–air gap): R = ((n−1)/(n+1))² = 3.4 % → −14.7 dB  (why physical contact / angled polish)\nFibers/OE = (lanes / λ_per_fiber)·2 + N_laser_feed</div>',
    failures: ['Dust on end-faces → loss + reflection; #1 cause of field optical issues', 'Macro-bends in tight routing → loss at long λ', 'Connector not fully latched → intermittent link', 'PM fiber twist → polarization fading on laser feed'],
    monitoring: ['Per-lane RX power and laser-input tap PDs localize which segment degraded', 'Inspection scopes during service; DDM/CMIS telemetry'],
    scene(g, api) {
      const c = mk(g, api);
      title(g, 'Fiber plant — engine to front panel, and how lanes map to fibers', 'Click a mapping scheme. Colours = wavelengths; each line is a fiber.');
      const O = cv('optic');
      R(g, 640, 80, 330, 330, { fill: '#121a24', stroke: '#5b6b80', rx: 8 });
      R(g, 755, 195, 100, 100, { fill: '#1d2533', stroke: '#7a8ca3', rx: 4 }); T(g, 805, 250, 'ASIC', { anchor: 'middle', size: 12, fill: cv('mech') });
      const oes = [[700, 140], [700, 245], [700, 350]];
      oes.forEach(([x, y]) => { R(g, x - 25, y - 20, 50, 40, { fill: '#2a1a14', stroke: O, rx: 3 }); T(g, x, y + 4, 'OE', { anchor: 'middle', size: 11, fill: O }); R(g, x - 45, y - 14, 18, 28, { fill: '#1a2230', stroke: '#9fb4cc', rx: 2 }); });
      T(g, 655, 100, 'FAU + detachable connector', { size: 10, fill: cv('mech') });
      R(g, 20, 80, 60, 330, { fill: '#1a2230', stroke: '#6b7f99', rx: 4 }); T(g, 50, 425, 'front panel', { anchor: 'middle', size: 10, fill: cv('mech') });
      for (let i = 0; i < 6; i++) R(g, 30, 100 + i * 50, 40, 34, { fill: '#0b0f14', stroke: '#9fb4cc', rx: 3 });
      T(g, 50, 96, 'MPO', { anchor: 'middle', size: 10, fill: cv('muted') });
      R(g, 250, 130, 200, 240, { fill: '#0e141d', stroke: '#2a3646', rx: 8, dash: '5 4' }); T(g, 350, 150, 'routing / shuffle tray', { anchor: 'middle', size: 10.5, fill: cv('muted') });
      const fib = grp(g, {});
      const st = { mode: 1 };
      const modes = [{ n: 'DR-style: 1 λ/fiber', f: 8, l: 1 }, { n: '4 λ WDM', f: 2, l: 4 }, { n: '8 λ WDM', f: 1, l: 8 }];
      const rd = readout(g, 20, 470, ['scheme', 'TX + RX fibers per 1.6T OE', 'wavelengths to lock per bus', 'fibers for 72 OEs (+laser feed)'], { vx: 230, lh: 22 });
      const btns = modes.map((m, i) => button(c, g, 640 + i * 112, 430, 106, m.n, () => { st.mode = i; draw(); }));
      let stops = [];
      function draw() {
        stops.forEach(s => { s.on = false; }); stops = [];
        while (fib.firstChild) fib.removeChild(fib.firstChild);
        const m = modes[st.mode]; btns.forEach((b, i) => b.active(i === st.mode));
        oes.forEach(([x, y], k) => {
          for (let f = 0; f < m.f * 2; f++) {
            const yy = y - 12 + f * (24 / Math.max(1, m.f * 2 - 1)), ty = 117 + k * 100 + f * (m.f > 2 ? 3 : 8), py = 140 + k * 70 + f * 4;
            const pts = [[x - 45, yy], [470, py], [250, py], [70, ty]];
            Pa(fib, ptsD(pts), { stroke: f < m.f ? O : '#7ff0ff', sw: 1.4, op: 0.35, dom: 'optics' });
            const cols = f < m.f ? WL.slice(st.mode === 0 ? (f % 8) : (f * m.l) % 8, (st.mode === 0 ? (f % 8) : (f * m.l) % 8) + m.l) : WL.slice(0, m.l);
            stops.push(flow(c, fib, f < m.f ? pts : pts.slice().reverse(), { n: 6, colors: cols.length ? cols : [O], r: 2.2, speed: 110 }));
          }
          const lp = [[x - 45, y + 14], [600, 470 - k * 4], [620, 530], [980, 530]];
          Pa(fib, ptsD(lp), { stroke: '#ffd9b0', sw: 1.4, op: 0.4, dash: '4 3' });
        });
        T(fib, 975, 545, 'laser feed (PMF) from ELS ⟶', { size: 10, anchor: 'end', fill: '#ffd9b0' });
        rd(0, m.n); rd(1, (m.f + m.f) + ' (' + m.f + ' TX + ' + m.f + ' RX)'); rd(2, String(m.l)); rd(3, String(72 * m.f * 2) + '  [est]');
      }
      draw();
      T(g, 20, 570, 'orange = TX fibers, cyan = RX fibers; front-panel ports 800G (or 2×/4× breakouts) [NVIDIA public port counts]', { size: 10.5, fill: cv('muted') });
    },
    hotspots: [
      { target: 'fiber-connector', x: 25, y: 95, w: 50, h: 300, label: 'MPO / MT connector' },
      { target: 'smf-fiber', x: 255, y: 160, w: 190, h: 200, label: 'Single-mode / PM fiber' },
      { target: 'fiber-coupler', x: 650, y: 115, w: 40, h: 260, label: 'FAU / chip coupler' },
      { target: 'external-laser', x: 860, y: 515, w: 120, h: 30, label: 'External laser source' }
    ]
  });

  // ================================================================ FIBER CONNECTOR
  add({
    id: 'fiber-connector', parent: 'fiber-plant', domain: 'mechanical', level: 3,
    title: 'Multi-fiber connector (MT ferrule / MPO)',
    subtitle: 'Guide-pin alignment, physical contact, angled polish, contamination',
    summary: 'An MT ferrule holds 12–24 fibers in a row at 250 µm pitch in a precision-moulded block; two steel guide pins align the mating ferrule to about a micron. Fiber ends are polished to protrude slightly so they touch under spring force (physical contact), and are angle-polished (8°) so any reflection is steered out of the core. A single dust particle can block a 9 µm core.',
    what: '<p><b>Alignment chain:</b> fiber in hole (hole tolerance ~0.5–1 µm, core-cladding concentricity &lt;0.5 µm) + pin-hole fit + pin straightness → lateral offset d of ~0.5–1.5 µm → loss via Gaussian overlap ' + B('typ') + '. <b>Low-loss</b> grade MPOs ≤0.35 dB, standard ≤0.75 dB.</p>' +
      '<p><b>Reflections:</b> a glass-air gap reflects 3.4% (−14.7 dB). Physical contact removes the gap; 8° angled polish (APC-style) pushes return loss beyond ~55–60 dB, important because back-reflections into lasers cause RIN and mode-hopping — critical for CPO where one ELS feeds many lanes ' + B('typ') + '.</p>' +
      '<p><b>Expanded-beam</b> (lensed) connectors enlarge the beam to ~50–100 µm: far less sensitive to dust and offset, at the cost of a small baseline loss — attractive for dense, frequently-mated CPO interfaces ' + B('typ') + '.</p>',
    needs: ['Clean end-faces (inspect before every mate)', 'Correct spring force & full latch', 'Matching polish (angled to angled)', 'Pin/ferrule wear control over mating cycles'],
    interfaces: [{ with: 'fiber-plant', type: 'mechanical', detail: 'Front-panel and package-side detachable interfaces' }],
    kpis: [{ name: 'Fiber pitch', value: '250 µm', tag: 'typ' }, { name: 'Guide pins', value: '0.7 mm Ø', tag: 'typ' }, { name: 'IL (low-loss MPO)', value: '≤ 0.35 dB', tag: 'typ' }, { name: 'Return loss (8° angled)', value: '≥ 55–60 dB', tag: 'typ' }, { name: 'Mating cycles', value: '~500–1000', tag: 'typ' }],
    physics: '<div class="eq">Offset loss: IL = −10·log10(exp(−d²/w²))   (equal w; w = 4.6 µm)\n  d = 1 µm → 0.21 dB ;  d = 2 µm → 0.82 dB\nFresnel: R = ((n₁−n₂)/(n₁+n₂))² → 3.4 % for silica–air\nAngled facet: reflected beam tilted 2θ = 16° ≫ fiber NA (~7°) → not guided back</div>',
    failures: ['Particle/film on core → 1–10 dB loss, reflections', 'Scratched end-face', 'Pin damage / missing pin (male/female mismatch)', 'Polish mismatch (flat vs angled) → air gap'],
    monitoring: ['Inspection scope (IEC 61300-3-35 grading)', 'RX power & laser tap PDs flag a degraded mate'],
    scene(g, api) {
      const c = mk(g, api);
      title(g, 'MT ferrule — end view and mating', 'Ferrules approach and mate on guide pins. Toggle dust and drag offset: watch loss and back-reflection.');
      const fx = 120, fy = 100;
      R(g, fx, fy, 520, 150, { fill: '#2a3140', stroke: '#9fb4cc', rx: 16 });
      Ci(g, fx + 50, fy + 75, 18, { fill: '#cbd5e1', stroke: '#fff' }); Ci(g, fx + 470, fy + 75, 18, { fill: '#cbd5e1', stroke: '#fff' });
      T(g, fx + 50, fy + 120, 'guide pin 0.7 mm', { anchor: 'middle', size: 10, fill: cv('muted') });
      const cores = [];
      for (let i = 0; i < 12; i++) { const x = fx + 100 + i * 29; Ci(g, x, fy + 75, 11, { fill: '#3b4b60', stroke: '#9fb4cc', sw: 1 }); cores.push(Ci(g, x, fy + 75, 4, { fill: WL[i % 8], filter: c.url('glow') })); }
      T(g, fx + 260, fy + 140, '12 fibers @ 250 µm pitch (drawn)', { anchor: 'middle', size: 10.5, fill: cv('muted') });
      const dust = Ci(g, fx + 216, fy + 72, 9, { fill: '#a16207', op: 0 });
      // side view mating
      const sy = 330;
      const fL = R(g, 100, sy, 220, 60, { fill: '#2a3140', stroke: '#9fb4cc', rx: 6 });
      const fR = R(g, 520, sy, 220, 60, { fill: '#2a3140', stroke: '#9fb4cc', rx: 6 });
      const pinL = R(g, 320, sy + 8, 60, 8, { fill: '#cbd5e1', rx: 2 });
      const bL = beam(c, g, [[100, sy + 30], [320, sy + 30]], { color: WL[2], w: 3 });
      const bR = beam(c, g, [[520, sy + 30], [740, sy + 30]], { color: WL[2], w: 3 });
      const refl = beam(c, g, [[320, sy + 30], [180, sy + 20]], { color: cv('bad'), w: 2, halo: false });
      T(g, 420, sy + 90, '8° angled, physical-contact polish', { anchor: 'middle', size: 10.5, fill: cv('muted') });
      const rd = readout(g, 700, 110, ['lateral offset', 'offset loss', 'dust loss', 'total IL', 'return loss'], { vx: 120, lh: 22 });
      const st = { d: 0.8, dust: false, gap: 0 };
      const s = slider(c, g, 700, 250, 260, { label: 'lateral offset', min: 0, max: 4, value: 0.8, step: 0.05, color: cv('optic'), fmt: v => v.toFixed(2) + ' µm', onchange: v => { st.d = v; } });
      void s;
      button(c, g, 700, 280, 260, 'Toggle dust particle on fiber 5', b => { st.dust = !st.dust; b.active(st.dust); });
      eqbox(g, 100, 470, 640, ['IL_offset = −10·log10(exp(−d²/w²)),  w = 4.6 µm', 'glass–air: R = 3.4 % (−14.7 dB) · angled PC: RL ≥ 55–60 dB', 'clean → inspect → mate: dust is the #1 field failure'], { size: 11.5 });
      let t = 0;
      c.loop(dt => {
        t += dt * MS;
        const ph = (t % 6) / 6; st.gap = ph < 0.4 ? 200 * (1 - ph / 0.4) : ph > 0.85 ? 200 * (ph - 0.85) / 0.15 : 0;
        fR.setAttribute('x', (320 + st.gap / 2).toFixed(1));
        fL.setAttribute('x', (100 - st.gap / 2).toFixed(1)); pinL.setAttribute('x', (320 - st.gap / 2).toFixed(1));
        bL.setAttribute('transform', 'translate(' + (-st.gap / 2).toFixed(1) + ',0)'); bR.setAttribute('transform', 'translate(' + (st.gap / 2 - 200).toFixed(1) + ',0)');
        const mated = st.gap < 1;
        const off = -10 * Math.log10(Math.exp(-st.d * st.d / (4.6 * 4.6))), dl = st.dust ? 6 : 0;
        bR.setAttribute('opacity', mated ? clamp(Math.pow(10, -(off + dl) / 10), 0.1, 1).toFixed(2) : 0.15);
        refl.setAttribute('opacity', mated ? (st.dust ? 0.9 : 0.05) : 0.6);
        refl.setAttribute('transform', 'translate(' + (-st.gap / 2).toFixed(1) + ',0)');
        dust.setAttribute('opacity', st.dust ? 1 : 0); cores[4].setAttribute('opacity', st.dust ? 0.2 : 1);
        rd(0, st.d.toFixed(2) + ' µm'); rd(1, off.toFixed(2) + ' dB'); rd(2, st.dust ? '~6 dB (blocked core)' : '0', st.dust ? cv('bad') : cv('good'));
        rd(3, mated ? (off + dl + 0.1).toFixed(2) + ' dB' : 'unmated', (off + dl) < 0.75 ? cv('good') : cv('bad'));
        rd(4, mated ? (st.dust ? '~25 dB (gap!)' : '≥ 60 dB') : '14.7 dB (air gap)', mated && !st.dust ? cv('good') : cv('bad'));
      });
    },
    hotspots: [{ target: 'smf-fiber', x: 520, y: 320, w: 220, h: 80, label: 'Inside the fiber' }]
  });

  // ================================================================ SMF / PM FIBER
  add({
    id: 'smf-fiber', parent: 'fiber-plant', domain: 'optics', level: 4,
    title: 'Single-mode & polarization-maintaining fiber',
    subtitle: 'Core/cladding, MFD 9.2 µm @1310, zero dispersion, bend loss, PANDA birefringence',
    summary: 'Standard single-mode fiber guides light in a ~8–9 µm germanium-doped core inside 125 µm of pure silica. At 1310 nm the mode is about 9.2 µm wide, losses are ~0.33 dB/km and chromatic dispersion is nearly zero — which is why short-reach data-center optics live in the O-band. Laser feed fibers add stress rods (PANDA) so a linearly polarized input stays polarized.',
    what: '<p><b>SMF-28-class</b> ' + B('typ') + ': core ~8.2 µm, Δ ≈ 0.36%, effective NA ≈ 0.12, cladding 125 µm, coating 250 µm (or 200 µm reduced). Cable cutoff ≤1260 nm so the fiber is single-mode in the O-band (V = 2πa·NA/λ &lt; 2.405). MFD 9.2 ± 0.4 µm at 1310 nm, 10.4 µm at 1550 nm. Zero-dispersion wavelength 1300–1324 nm; loss ~0.33 dB/km at 1310 nm.</p>' +
      '<p><b>Bend loss:</b> radiation when the outer part of the mode would have to travel faster than light in the cladding. Bend-insensitive (G.657, trench-assisted) fibers tolerate 5–7.5 mm radii — essential in dense chassis routing.</p>' +
      '<p><b>PM fiber (PANDA)</b>: two boron-doped stress rods create birefringence B ≈ 3–5×10⁻⁴ (beat length L_B = λ/B ≈ 3–4 mm). Light launched along the slow or fast axis stays there (polarization extinction ratio &gt;20 dB). Needed for the laser feed because MRMs and grating couplers are TE-only; the RX path can use ordinary SMF if the receiver coupler is polarization-insensitive or polarization-diverse ' + B('typ') + '.</p>',
    needs: ['Correct rotational alignment of PM fiber at every interface (key alignment)', 'Respect minimum bend radius', 'Clean, angle-polished ends'],
    interfaces: [{ with: 'fiber-connector / fiber-coupler', type: 'optical', detail: 'Fiber ends at FAU and connectors' }],
    kpis: [{ name: 'MFD @1310', value: '9.2 µm', tag: 'typ' }, { name: 'Core / cladding', value: '~8.2 / 125 µm', tag: 'typ' }, { name: 'Loss @1310', value: '~0.33 dB/km', tag: 'typ' }, { name: 'λ0 (zero disp.)', value: '1300–1324 nm', tag: 'typ' }, { name: 'PMF beat length', value: '~3–4 mm', tag: 'typ' }, { name: 'PER', value: '> 20 dB', tag: 'typ' }],
    physics: '<div class="eq">NA = √(n_core² − n_clad²) ≈ n·√(2Δ)        V = (2π·a/λ)·NA  < 2.405 → single-mode\nMarcuse MFD: w/a ≈ 0.65 + 1.619·V^(−1.5) + 2.879·V^(−6)\nCD near λ0: D(λ) ≈ (S0/4)·(λ − λ0⁴/λ³),  S0 ≈ 0.092 ps/(nm²·km)\nPM: B = |n_x − n_y|,  L_B = λ/B</div>',
    failures: ['Macro/micro-bending loss (tight routing, crushed cable)', 'PM axis misalignment → polarization crosstalk, power fading at TE coupler', 'Fiber fracture from stress / handling'],
    monitoring: ['Power monitoring at both ends; OTDR for long cables (rarely needed in-chassis)'],
    scene(g, api) {
      const c = mk(g, api);
      title(g, 'Inside the fiber — SMF and PANDA PM fiber', 'Left: guided mode in SMF and bend loss (drag radius).  Right: PM fiber keeps the launched polarization (arrow) aligned to the slow axis.');
      const O = WL[4];
      const cx = 200, cy = 220;
      Ci(g, cx, cy, 150, { fill: '#1e293b', stroke: '#64748b', sw: 10 });
      Ci(g, cx, cy, 120, { fill: '#16243a', stroke: '#9fb4cc', sw: 1 });
      const mode = Ci(g, cx, cy, 34, { fill: c.url('mode'), op: 0.95 });
      Ci(g, cx, cy, 15, { stroke: '#e2e8f0', sw: 1, dash: '3 2' });
      T(g, cx, cy - 128, 'cladding 125 µm (silica)', { anchor: 'middle', size: 10.5, fill: cv('muted') });
      T(g, cx, cy + 172, 'coating 250 µm', { anchor: 'middle', size: 10.5, fill: cv('muted') });
      T(g, cx + 40, cy + 4, 'core ~8.2 µm · MFD 9.2 µm', { size: 10.5, fill: '#fff' });
      T(g, cx, cy + 192, 'end view (core enlarged ×4 for visibility)', { anchor: 'middle', size: 10, fill: cv('muted') });
      // PANDA
      const px = 760, py = 220;
      Ci(g, px, py, 150, { fill: '#1e293b', stroke: '#64748b', sw: 10 });
      Ci(g, px, py, 120, { fill: '#16243a', stroke: '#9fb4cc', sw: 1 });
      Ci(g, px - 62, py, 30, { fill: '#7c3aed', op: 0.5 }); Ci(g, px + 62, py, 30, { fill: '#7c3aed', op: 0.5 });
      T(g, px - 62, py + 48, 'stress rod', { anchor: 'middle', size: 10, fill: cv('violet') }); T(g, px + 62, py + 48, 'stress rod', { anchor: 'middle', size: 10, fill: cv('violet') });
      Ci(g, px, py, 26, { fill: c.url('mode'), op: 0.95 });
      const pol = Ln(g, px - 40, py, px + 40, py, { stroke: '#fff', sw: 3, end: c.arrow('#ffffff'), start: c.arrow('#ffffff') });
      T(g, px, py - 128, 'PANDA PM fiber — slow axis through rods', { anchor: 'middle', size: 10.5, fill: cv('muted') });
      const perT = T(g, px, py + 190, '', { anchor: 'middle', size: 11, mono: true, fill: cv('accent') });
      // side bend
      const bendG = grp(g, {});
      const rd = readout(g, 380, 460, ['bend radius', 'bend loss (std SMF / G.657)', 'V-number @1310', 'dispersion @1310'], { vx: 230, lh: 21 });
      const st = { R: 15, pmErr: 0 };
      function bend() {
        while (bendG.firstChild) bendG.removeChild(bendG.firstChild);
        const Rp = 40 + st.R * 3, bx = 380, by = 420;
        const pts = []; for (let i = 0; i <= 30; i++) { const a = Math.PI - i / 30 * Math.PI; pts.push([bx + 120 + Rp * Math.cos(a), by - Rp * Math.sin(a) * 0.6]); }
        Pa(bendG, ptsD(pts), { stroke: '#64748b', sw: 10, op: 0.6 });
        beam(c, bendG, pts, { color: O, w: 2.5, halo: false });
        const lossStd = st.R >= 30 ? 0.01 : 0.5 * Math.exp(-(st.R - 5) / 6), lossBI = st.R >= 10 ? 0.01 : 0.15 * Math.exp(-(st.R - 5) / 3);
        st.loss = lossStd;
        rd(0, st.R.toFixed(0) + ' mm'); rd(1, lossStd.toFixed(2) + ' / ' + lossBI.toFixed(2) + ' dB per turn', lossStd > 0.1 ? cv('bad') : cv('good'));
        rd(2, (2 * Math.PI * 4.1 * 0.12 / 1.31).toFixed(2) + ' (< 2.405 single-mode)'); rd(3, '≈ 0 ps/nm/km (λ0 ≈ 1310)');
      }
      bend();
      slider(c, g, 380, 570, 260, { label: 'bend radius', min: 5, max: 40, value: 15, color: O, fmt: v => v.toFixed(0) + ' mm', onchange: v => { st.R = v; bend(); } });
      slider(c, g, 700, 570, 260, { label: 'PM launch misalignment', min: 0, max: 45, value: 0, color: cv('violet'), fmt: v => v.toFixed(0) + '°', onchange: v => { st.pmErr = v; } });
      let t = 0;
      c.loop(dt => {
        t += dt * MS;
        mode.setAttribute('r', (32 + 3 * Math.sin(t * 3)).toFixed(1));
        const e = st.pmErr * Math.PI / 180, wob = e * Math.sin(t * 2.5); // misaligned launch → polarization beats along the fiber
        const a = wob, l = 40;
        pol.setAttribute('x1', (px - l * Math.cos(a)).toFixed(1)); pol.setAttribute('y1', (py - l * Math.sin(a)).toFixed(1));
        pol.setAttribute('x2', (px + l * Math.cos(a)).toFixed(1)); pol.setAttribute('y2', (py + l * Math.sin(a)).toFixed(1));
        const per = e < 0.001 ? 40 : -10 * Math.log10(Math.pow(Math.tan(e), 2) + 1e-4);
        perT.textContent = 'PER ≈ ' + Math.min(40, per).toFixed(1) + ' dB → TE coupler loss ' + (-10 * Math.log10(Math.pow(Math.cos(e), 2))).toFixed(2) + ' dB';
      });
    },
    hotspots: [{ target: 'fiber-connector', x: 50, y: 60, w: 300, h: 40, label: 'Connector' }, { target: 'external-laser', x: 610, y: 60, w: 300, h: 40, label: 'Laser feed (ELS)' }]
  });

  CPO.arch.addNodes(NODES);
})();
