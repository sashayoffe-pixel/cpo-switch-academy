/* CPO Switch Academy — System Budgets section (Agent F). See CONTRACT.md */
(function () {
  'use strict';
  const C = window.CPO;
  if (!C) return;
  const h = C.h, s = C.s, fmt = C.fmt, clamp = C.clamp;
  const B = k => C.badge(k);
  const RM = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const cssv = n => (getComputedStyle(document.documentElement).getPropertyValue(n) || '').trim() || '#cccccc';
  const f = (x, d) => (isFinite(x) ? x.toFixed(d == null ? 1 : d) : '—');
  const sg = (x, d) => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(d == null ? 2 : d);

  // ---------------------------------------------------------------- glossary
  C.addGlossary({
    OMA: { full: 'Optical Modulation Amplitude', def: 'P1 − P0: the optical power difference between the highest and lowest levels (OMAouter for PAM4). Receivers respond to OMA, not to average power.', cat: 'optics' },
    ER: { full: 'Extinction Ratio', def: 'P1/P0 (linear) or 10·log10(P1/P0) dB. Finite ER wastes part of the average power: OMA = 2·Pavg·(ER−1)/(ER+1).', cat: 'optics' },
    TDECQ: { full: 'Transmitter and Dispersion Eye Closure Quaternary', def: 'IEEE PAM4 transmitter quality metric (dB): extra noise the measured eye can tolerate vs an ideal eye at the reference SER, using a reference receiver + equalizer.', cat: 'optics' },
    ELS: { full: 'External Laser Source', def: 'Front-panel-serviceable CW laser module feeding light to co-packaged optical engines over fiber.', cat: 'optics' },
    PAM4: { full: '4-level Pulse Amplitude Modulation', def: '2 bits per symbol, 3 stacked eyes each 1/3 of the full swing.', cat: 'data' },
    BER: { full: 'Bit Error Ratio', def: 'Fraction of bits received in error.', cat: 'data' },
    SER: { full: 'Symbol Error Ratio', def: 'Fraction of symbols received in error.', cat: 'data' },
    FER: { full: 'Frame (codeword) Error Ratio', def: 'Probability that an FEC codeword is uncorrectable.', cat: 'data' },
    FEC: { full: 'Forward Error Correction', def: 'Redundancy added at the transmitter so the receiver can correct errors without retransmission.', cat: 'data' },
    KP4: { full: 'RS(544,514) "KP4" FEC', def: 'Reed-Solomon code over GF(2^10): 514 data + 30 parity 10-bit symbols, corrects t = 15 symbol errors per codeword. Pre-FEC BER threshold ≈ 2.4e-4.', cat: 'data' },
    KR4: { full: 'RS(528,514) "KR4" FEC', def: 'Reed-Solomon code correcting t = 7 symbols; used for 25G/lane NRZ.', cat: 'data' },
    SNR: { full: 'Signal-to-Noise Ratio', def: 'Here: average symbol power over noise variance at the slicer.', cat: 'data' },
    MTBUE: { full: 'Mean Time Between Uncorrectable Errors', def: '1 / (rate of uncorrectable FEC codewords) over the whole system.', cat: 'data' },
    WPE: { full: 'Wall-Plug Efficiency', def: 'Optical output power / electrical input power of a laser (including driver/TEC if stated).', cat: 'optics' },
    PSU: { full: 'Power Supply Unit', def: 'AC/DC or rack-shelf converter producing the ~48–54 V bus.', cat: 'power' },
    IBC: { full: 'Intermediate Bus Converter', def: 'Unregulated/semi-regulated 48–54 V → ~12 V (or lower) DC-DC stage.', cat: 'power' },
    VRM: { full: 'Voltage Regulator Module', def: 'Multiphase buck converter delivering the ~0.7–0.9 V core rail at hundreds of amps.', cat: 'power' },
    TIM: { full: 'Thermal Interface Material', def: 'Layer filling microscopic gaps between die/lid/cold plate; a key thermal resistance.', cat: 'thermal' },
    RSS: { full: 'Root-Sum-Square', def: 'Statistical combination √(Σ xᵢ²) of independent random contributors.', cat: 'control' },
    DAC: { full: 'Digital-to-Analog Converter', def: 'Sets heater drive / bias; its LSB limits actuator resolution.', cat: 'control' },
    ADC: { full: 'Analog-to-Digital Converter', def: 'Digitizes monitor-PD, temperature, voltage and current telemetry.', cat: 'sensing' },
    LSB: { full: 'Least Significant Bit', def: 'Smallest step of a converter: full scale / 2^N.', cat: 'control' },
    RJ: { full: 'Random Jitter', def: 'Unbounded Gaussian timing noise, specified as rms.', cat: 'data' },
    DJ: { full: 'Deterministic Jitter', def: 'Bounded jitter (DCD, ISI, periodic, crosstalk), adds linearly in the dual-Dirac model.', cat: 'data' },
    TJ: { full: 'Total Jitter', def: 'TJ(BER) = DJδδ + 2·Q(BER)·RJrms.', cat: 'data' },
    UI: { full: 'Unit Interval', def: 'One symbol period = 1/baud rate.', cat: 'data' },
    DCD: { full: 'Duty-Cycle Distortion', def: 'Deterministic jitter from unequal rising/falling or half-rate clock phases.', cat: 'data' },
    ISI: { full: 'Inter-Symbol Interference', def: 'Residual pulse energy from neighbouring symbols due to limited bandwidth/dispersion.', cat: 'data' },
    BUJ: { full: 'Bounded Uncorrelated Jitter', def: 'Bounded jitter not correlated with the data pattern, e.g. crosstalk.', cat: 'data' },
    MPI: { full: 'Multi-Path Interference', def: 'Interference from double reflections between connectors; converts to intensity noise.', cat: 'optics' },
    RIN: { full: 'Relative Intensity Noise', def: 'Laser intensity fluctuation normalized to average power (dB/Hz).', cat: 'optics' },
    APC: { full: 'Automatic Power Control', def: 'Laser control loop that holds optical output constant using a monitor photodiode.', cat: 'control' },
    IRN: { full: 'Input-Referred Noise', def: 'Receiver (TIA) noise expressed as an equivalent current at its input.', cat: 'data' },
    FWHM: { full: 'Full Width at Half Maximum', def: 'Resonance linewidth; for a ring FWHM = λ/Q_loaded.', cat: 'optics' },
    FSR: { full: 'Free Spectral Range', def: 'Spacing between adjacent ring resonances.', cat: 'optics' },
    TEC: { full: 'Thermo-Electric Cooler', def: 'Peltier element that stabilises laser temperature (costs power).', cat: 'thermal' },
    XSR: { full: 'Extra-Short-Reach SerDes', def: 'Low-power SerDes class for millimetre-scale in-package links.', cat: 'data' },
    DSP: { full: 'Digital Signal Processor', def: 'In pluggables: retimer/equalizer chip that re-times the electrical lanes.', cat: 'data' },
    IL: { full: 'Insertion Loss', def: 'Loss of optical power through a component, in dB.', cat: 'optics' },
    CWDM: { full: 'Coarse Wavelength Division Multiplexing', def: '20 nm-spaced wavelength grid (e.g. 1271–1331 nm).', cat: 'optics' },
    DFE: { full: 'Decision-Feedback Equalizer', def: 'Equalizer using past decisions; one wrong decision can cause error bursts.', cat: 'data' },
    EOL: { full: 'End Of Life', def: 'Worst-case condition after aging.', cat: 'optics' },
    CDU: { full: 'Coolant Distribution Unit', def: 'Pumps/heat-exchanger serving a liquid-cooled rack row.', cat: 'thermal' }
  });

  // ---------------------------------------------------------------- math
  function erfc(x) {
    const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }
  const Q = x => 0.5 * erfc(x / Math.SQRT2);
  function Qinv(p) {
    if (p >= 0.5) return 0; if (p <= 0) return 38;
    let lo = 0, hi = 38;
    for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (Q(m) > p) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  const dBm2mW = d => Math.pow(10, d / 10);
  const mW2dBm = p => 10 * Math.log10(p);
  const LF = [0]; for (let k = 1; k <= 600; k++) LF[k] = LF[k - 1] + Math.log(k);
  const lnC = (n, k) => LF[n] - LF[k] - LF[n - k];
  // Reed-Solomon codeword failure model. b = burst length (symbols per error event).
  function rsStats(ps, n, t, b) {
    b = b || 1;
    if (!(ps > 0)) return { pcw: 0, ser: 0, lgPcw: -Infinity, lgSer: -Infinity };
    const pe = Math.min(ps / b, 0.999999), te = Math.floor(t / b);
    const lp = Math.log(pe), lq = Math.log1p(-pe);
    const terms = []; let mx = -Infinity;
    for (let i = te + 1; i <= n; i++) { const v = lnC(n, i) + i * lp + (n - i) * lq; terms.push(v); if (v > mx) mx = v; }
    let sp = 0, ss = 0;
    for (let j = 0; j < terms.length; j++) { const i = te + 1 + j, e = Math.exp(terms[j] - mx); sp += e; ss += e * Math.min(1, i * b / n); }
    const lgPcw = Math.min(0, (mx + Math.log(sp)) / Math.LN10), lgSer = Math.min(0, (mx + Math.log(ss)) / Math.LN10);
    return { pcw: Math.pow(10, lgPcw), ser: Math.pow(10, lgSer), lgPcw, lgSer };
  }
  const pam4Ber = snrDb => 0.75 * Q(Math.sqrt(Math.pow(10, snrDb / 10) / 5));
  const nrzBer = snrDb => Q(Math.sqrt(Math.pow(10, snrDb / 10)));
  const symErr = p => -Math.expm1(10 * Math.log1p(-Math.min(p, 0.999999)));
  function poisson(l) {
    if (l <= 0) return 0;
    if (l < 30) { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L); return k - 1; }
    return Math.max(0, Math.round(l + Math.sqrt(l) * C.randn()));
  }
  function combine(items, mode) {
    let wc = 0, r2 = 0, det = 0;
    for (const it of items) { const v = Math.abs(it.v); wc += v; if (it.det) det += v; else r2 += v * v; }
    if (mode === 'wc') return wc;
    if (mode === 'rss') return Math.sqrt(items.reduce((a, it) => a + it.v * it.v, 0));
    return det + Math.sqrt(r2);
  }
  const fmtLg = lg => !isFinite(lg) ? (lg < 0 ? '≈0' : '∞') : (lg > -290 && lg < 290) ? fmt(Math.pow(10, lg), 3) : '10^' + lg.toFixed(0);
  function fmtTime(x) {
    const u = [[3.156e7, 'years'], [86400, 'days'], [3600, 'hours'], [60, 'min'], [1, 's'], [1e-3, 'ms'], [1e-6, 'µs']];
    for (const [v, n] of u) if (x >= v) return fmt(x / v, 3) + ' ' + n;
    return fmt(x * 1e9, 3) + ' ns';
  }
  function fmtTimeLg(lg) {
    if (!isFinite(lg)) return lg > 0 ? '∞ (never)' : '0';
    if (lg < 7.5) return fmtTime(Math.pow(10, lg));
    const ly = lg - Math.log10(3.156e7);
    return ly < 6 ? fmt(Math.pow(10, ly), 3) + ' years' : '10^' + ly.toFixed(1) + ' years';
  }

  // ---------------------------------------------------------------- UI helpers
  const SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  const pow10 = e => '10' + String(e).split('').map(c => SUP[c] || c).join('');
  function niceStep(range, n) { const raw = range / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / mag; return (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag; }
  const clear = el => { while (el.firstChild) el.removeChild(el.firstChild); };
  let clipN = 0;
  function plot(svg, o) {
    const W = o.W || 640, H = o.H || 320, P = Object.assign({ l: 60, r: 18, t: 16, b: 42 }, o.pad || {});
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); clear(svg);
    const xa = o.x, ya = o.y;
    const tx = v => xa.log ? Math.log10(Math.max(v, 1e-300)) : v, ty = v => ya.log ? Math.log10(Math.max(v, 1e-300)) : v;
    const x0 = tx(xa.min), x1 = tx(xa.max), y0 = ty(ya.min), y1 = ty(ya.max);
    const pw = W - P.l - P.r, ph = H - P.t - P.b;
    const X = v => P.l + (tx(v) - x0) / (x1 - x0) * pw;
    const Y = v => P.t + ph - (clamp(ty(v), y0 - 0.05 * (y1 - y0), y1 + 0.05 * (y1 - y0)) - y0) / (y1 - y0) * ph;
    const id = 'bdclip' + (++clipN);
    svg.appendChild(s('defs', null, s('clipPath', { id }, s('rect', { x: P.l, y: P.t, width: pw, height: ph }))));
    const grid = s('g', { class: 'bd-grid' }); svg.appendChild(grid);
    function ticks(a, lo, hi) {
      const out = [];
      if (a.log) { const st = Math.max(1, Math.ceil((hi - lo) / (a.maxTicks || 8))); for (let e = Math.ceil(lo); e <= hi + 1e-9; e += st) out.push({ v: Math.pow(10, e), l: pow10(e) }); }
      else { const st = a.step || niceStep(hi - lo, a.maxTicks || 6); for (let v = Math.ceil(lo / st - 1e-9) * st; v <= hi + st * 1e-6; v += st) out.push({ v, l: a.fmt ? a.fmt(v) : String(+v.toPrecision(4)) }); }
      return out;
    }
    for (const t of ticks(xa, x0, x1)) { const x = X(t.v); grid.appendChild(s('line', { x1: x, x2: x, y1: P.t, y2: P.t + ph })); svg.appendChild(s('text', { x, y: P.t + ph + 15, 'text-anchor': 'middle' }, t.l)); }
    for (const t of ticks(ya, y0, y1)) { const y = Y(t.v); grid.appendChild(s('line', { x1: P.l, x2: P.l + pw, y1: y, y2: y })); svg.appendChild(s('text', { x: P.l - 6, y: y + 4, 'text-anchor': 'end' }, t.l)); }
    svg.appendChild(s('rect', { x: P.l, y: P.t, width: pw, height: ph, class: 'bd-frame' }));
    if (xa.label) svg.appendChild(s('text', { x: P.l + pw / 2, y: H - 6, 'text-anchor': 'middle', class: 'bd-axl' }, xa.label));
    if (ya.label) svg.appendChild(s('text', { x: 14, y: P.t + ph / 2, 'text-anchor': 'middle', class: 'bd-axl', transform: 'rotate(-90 14 ' + (P.t + ph / 2) + ')' }, ya.label));
    const g = s('g', { 'clip-path': 'url(#' + id + ')' }); svg.appendChild(g);
    for (const b of (o.bands || [])) {
      if (b.y) { const ya1 = Y(b.y[1]), ya0 = Y(b.y[0]); g.appendChild(s('rect', { x: P.l, y: Math.min(ya0, ya1), width: pw, height: Math.abs(ya0 - ya1), style: 'fill:' + b.color + ';opacity:' + (b.op || 0.12) })); }
      if (b.x) { const xb0 = X(b.x[0]), xb1 = X(b.x[1]); g.appendChild(s('rect', { x: Math.min(xb0, xb1), y: P.t, width: Math.abs(xb1 - xb0), height: ph, style: 'fill:' + b.color + ';opacity:' + (b.op || 0.12) })); }
    }
    for (const l of (o.vlines || [])) { const x = X(l.x); g.appendChild(s('line', { x1: x, x2: x, y1: P.t, y2: P.t + ph, style: 'stroke:' + l.color + ';stroke-width:1.5;stroke-dasharray:5 4' })); if (l.label) g.appendChild(s('text', { x: x + 4, y: P.t + 12 + (l.dy || 0), style: 'fill:' + l.color }, l.label)); }
    for (const l of (o.hlines || [])) { const y = Y(l.y); g.appendChild(s('line', { x1: P.l, x2: P.l + pw, y1: y, y2: y, style: 'stroke:' + l.color + ';stroke-width:1.5;stroke-dasharray:5 4' })); if (l.label) g.appendChild(s('text', { x: P.l + pw - 4, y: y - 4, 'text-anchor': 'end', style: 'fill:' + l.color }, l.label)); }
    (o.series || []).forEach((sr, si) => {
      const d = sr.pts.filter(p => isFinite(p[0]) && isFinite(p[1])).map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join('');
      if (d) g.appendChild(s('path', { d, style: 'fill:none;stroke:' + sr.color + ';stroke-width:' + (sr.w || 2) + (sr.dash ? ';stroke-dasharray:' + sr.dash : '') }));
      if (sr.label) { const ly = P.t + 14 + si * 15; svg.appendChild(s('line', { x1: P.l + 10, x2: P.l + 28, y1: ly - 4, y2: ly - 4, style: 'stroke:' + sr.color + ';stroke-width:2.5' + (sr.dash ? ';stroke-dasharray:' + sr.dash : '') })); svg.appendChild(s('text', { x: P.l + 33, y: ly, class: 'bd-lbl' }, sr.label)); }
    });
    for (const p of (o.points || [])) { g.appendChild(s('circle', { cx: X(p.x), cy: Y(p.y), r: p.r || 5, style: 'fill:' + p.color + ';stroke:var(--bg);stroke-width:2;filter:drop-shadow(0 0 5px ' + p.color + ')' })); if (p.label) g.appendChild(s('text', { x: X(p.x) + 8, y: Y(p.y) - 8, style: 'fill:' + p.color }, p.label)); }
    return { X, Y, g, svg, P, W, H, pw, ph };
  }
  const decs = st => { const t = String(st), i = t.indexOf('.'); return i < 0 ? 0 : t.length - i - 1; };
  function slider(st, key, o, onchange) {
    const inp = h('input', { type: 'range', min: o.min, max: o.max, step: o.step || 0.1, value: st[key] });
    const out = h('output');
    const show = () => { const v = st[key]; out.textContent = (o.fmt ? o.fmt(v) : v.toFixed(o.dec != null ? o.dec : decs(o.step || 0.1))) + (o.unit ? ' ' + o.unit : ''); };
    inp.addEventListener('input', () => { st[key] = +inp.value; show(); onchange(); });
    show();
    const row = h('div', { class: 'slider-row bd-sl', title: o.title || null }, h('label', { html: o.label + (o.badge ? ' ' + B(o.badge) : '') }), inp, out);
    row.sync = () => { inp.value = st[key]; show(); };
    return row;
  }
  function seg(opts, val, onpick) {
    const wrap = h('div', { class: 'bd-seg' });
    const btns = opts.map(o => {
      const b = h('button', { class: 'btn' + (o.v === val ? ' active' : ''), onclick: () => { btns.forEach(x => x.classList.remove('active')); b.classList.add('active'); onpick(o.v); } }, o.l);
      return b;
    });
    btns.forEach(b => wrap.appendChild(b));
    return wrap;
  }
  function check(label, val, on) {
    const i = h('input', { type: 'checkbox', checked: val, onchange: () => on(i.checked) });
    return h('label', { class: 'bd-chk' }, i, label);
  }
  function kpi(label, badge) {
    const v = h('div', { class: 'bd-kv' }, '—'), sub = h('div', { class: 'bd-ks' });
    const el = h('div', { class: 'bd-kpi' }, h('div', { class: 'bd-kl', html: label + (badge ? ' ' + B(badge) : '') }), v, sub);
    el.set = (val, cls, subtxt) => { v.textContent = val; v.className = 'bd-kv' + (cls ? ' ' + cls : ''); sub.textContent = subtxt || ''; };
    return el;
  }
  const grp = t => h('div', { class: 'bd-group' }, t);
  const eq = t => h('div', { class: 'eq' }, t);
  function mkCanvas(w, hh) {
    const c = h('canvas', { class: 'bd-canvas' }); const d = Math.min(2, window.devicePixelRatio || 1);
    c.width = w * d; c.height = hh * d; const ctx = c.getContext('2d'); ctx.scale(d, d);
    return { c, ctx, w, h: hh };
  }
  function levers(el, html) { el.innerHTML = html; C.linkify(el); }
  function berSelect(st, key, opts, on) {
    const sel = h('select', { onchange: () => { st[key] = +sel.value; on(); } }, opts.map(v => h('option', { value: String(v), selected: v === st[key] }, fmt(v) + (v === 2.4e-4 ? ' (KP4 threshold)' : ''))));
    sel.sync = () => { sel.value = String(st[key]); };
    return sel;
  }
  function stackChart(svg, items, mode, unit, opt) {
    opt = opt || {};
    const rowH = 21, W = 600, n = items.length, H = 16 + (n + 3) * rowH + 18;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); clear(svg);
    const tot = { wc: combine(items, 'wc'), rss: combine(items, 'rss'), hyb: combine(items, 'hyb') };
    const vmax = Math.max(tot.wc, opt.limit || 0) * 1.08 || 1;
    const L = 190, R = 86, pw = W - L - R, X = v => L + v / vmax * pw;
    const d = opt.dec == null ? 2 : opt.dec;
    const big = items.reduce((a, b) => Math.abs(b.v) > Math.abs(a.v) ? b : a, items[0]);
    items.forEach((it, i) => {
      const y = 10 + i * rowH;
      svg.appendChild(s('text', { x: L - 8, y: y + 11, 'text-anchor': 'end', class: it === big ? 'bd-lbl' : null }, it.n));
      svg.appendChild(s('rect', { x: L, y, width: Math.max(1, X(Math.abs(it.v)) - L), height: 13, rx: 3, style: 'fill:' + (it.det ? 'var(--warn)' : 'var(--accent2)') + ';opacity:' + (it === big ? 0.95 : 0.6) }));
      svg.appendChild(s('text', { x: X(Math.abs(it.v)) + 5, y: y + 11 }, '±' + Math.abs(it.v).toFixed(d) + ' ' + unit));
    });
    const y0 = 10 + n * rowH + 4;
    svg.appendChild(s('line', { x1: 10, x2: W - 10, y1: y0, y2: y0, style: 'stroke:var(--line)' }));
    [['wc', 'Worst-case  Σ|x|'], ['rss', 'RSS  √Σx²'], ['hyb', 'Hybrid  Σdet + RSS(rand)']].forEach(([k, lab], i) => {
      const y = y0 + 6 + i * rowH, on = k === mode;
      svg.appendChild(s('text', { x: L - 8, y: y + 11, 'text-anchor': 'end', class: on ? 'bd-lbl' : null }, lab));
      svg.appendChild(s('rect', { x: L, y, width: Math.max(1, X(tot[k]) - L), height: 13, rx: 3, style: 'fill:var(--accent);opacity:' + (on ? 1 : 0.25) }));
      svg.appendChild(s('text', { x: X(tot[k]) + 5, y: y + 11, class: on ? 'bd-lbl' : null }, '±' + tot[k].toFixed(d) + ' ' + unit));
    });
    if (opt.limit) { const x = X(opt.limit); svg.appendChild(s('line', { x1: x, x2: x, y1: 4, y2: H - 14, style: 'stroke:var(--bad);stroke-width:1.5;stroke-dasharray:4 3' })); svg.appendChild(s('text', { x, y: H - 3, 'text-anchor': 'middle', style: 'fill:var(--bad)' }, opt.limitLabel || 'limit')); }
    svg.appendChild(s('text', { x: 10, y: H - 3, style: 'fill:var(--warn)' }, '■ deterministic')); svg.appendChild(s('text', { x: 120, y: H - 3, style: 'fill:var(--accent2)' }, '■ random'));
    return { tot, active: tot[mode], big };
  }

  const shared = { margin: null };

  // ================================================================ TAB 1: optical link budget
  const LINK_DEF = { laser: 15, elsFiber: 1.0, cplIn: 1.5, splitE: 2, splitX: 0.5, route: 1.0, mrmIL: 1.5, er: 4.5, pam4: 1.0, bus: 0.5, cplOut: 1.5, nConn: 2, connL: 0.3, km: 0.05, alpha: 0.35, cplRx: 1.5, demux: 1.0, irn: 4, resp: 0.85, isi: 1.5, xt: 0.5, rin: 0.3, ber: 2.4e-4 };
  const LINK_PRESETS = [
    { id: 'sr', l: 'CPO short reach', v: {} },
    { id: 'km2', l: '2 km (DR/FR-like)', v: { nConn: 4, connL: 0.5, km: 2, alpha: 0.40, isi: 2.3, rin: 0.5 } },
    { id: 'eol', l: 'End-of-life corner', v: { laser: 14, cplIn: 2.5, cplOut: 2.5, cplRx: 2.5, mrmIL: 2.2, er: 3.5, pam4: 1.5, nConn: 4, connL: 0.5, km: 2, alpha: 0.4, isi: 2.8, xt: 0.8, rin: 0.6, irn: 5, resp: 0.75 } }
  ];
  const linkSt = Object.assign({}, LINK_DEF);
  function linkCompute(st) {
    const N = Math.pow(2, st.splitE), r = Math.pow(10, st.er / 10);
    const conv = 10 * Math.log10(2 * (r - 1) / (r + 1));
    const steps = [
      { n: 'ELS laser / λ', d: st.laser, abs: true },
      { n: 'ELS fiber+conn', d: -st.elsFiber },
      { n: 'Coupler (laser in)', d: -st.cplIn },
      { n: 'Split 1:' + N, d: -(10 * Math.log10(N) + (N > 1 ? st.splitX : 0)) },
      { n: 'WG routing', d: -st.route },
      { n: 'MRM IL @bias', d: -st.mrmIL },
      { n: 'ER → OMA', d: conv },
      { n: 'PAM4 compression', d: -st.pam4 },
      { n: 'WDM bus', d: -st.bus },
      { n: 'Coupler (Tx out)', d: -st.cplOut },
      { n: st.nConn + '× connector', d: -st.nConn * st.connL },
      { n: 'Fiber ' + (st.km < 1 ? Math.round(st.km * 1000) + ' m' : st.km + ' km'), d: -st.km * st.alpha },
      { n: 'Coupler (Rx in)', d: -st.cplRx },
      { n: 'Demux', d: -st.demux }
    ];
    let lv = 0; for (const x of steps) { lv = x.abs ? x.d : lv + x.d; x.lv = lv; }
    const sig = st.irn * 1e-6;
    const sensIdeal = mW2dBm(6 * sig * Qinv(st.ber / 0.75) / st.resp * 1e3);
    const sensNRZ = mW2dBm(2 * sig * Qinv(st.ber) / st.resp * 1e3);
    const pen = st.isi + st.xt + st.rin, sens = sensIdeal + pen;
    return { steps, rx: lv, avg: steps[5].lv, conv, N, sensIdeal, sensNRZ, pen, sens, margin: lv - sens };
  }
  shared.margin = linkCompute(Object.assign({}, LINK_DEF)).margin;

  function drawWaterfall(svg, r) {
    const W = 940, H = 420, P = { l: 56, r: 16, t: 22, b: 100 };
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); clear(svg);
    const lv = r.steps.map(x => x.lv);
    const ymax = Math.ceil(Math.max(...lv) + 2), ymin = Math.floor(Math.min(Math.min(...lv), r.sens, r.sensIdeal) - 4);
    const n = r.steps.length + 1, bw = (W - P.l - P.r) / n, ph = H - P.t - P.b;
    const Y = v => P.t + (ymax - v) / (ymax - ymin) * ph;
    const gg = s('g', { class: 'bd-grid' }); svg.appendChild(gg);
    const stp = niceStep(ymax - ymin, 8);
    for (let v = Math.ceil(ymin / stp) * stp; v <= ymax; v += stp) { gg.appendChild(s('line', { x1: P.l, x2: W - P.r, y1: Y(v), y2: Y(v) })); svg.appendChild(s('text', { x: P.l - 6, y: Y(v) + 4, 'text-anchor': 'end' }, String(+v.toPrecision(3)))); }
    svg.appendChild(s('text', { x: 14, y: P.t + ph / 2, 'text-anchor': 'middle', class: 'bd-axl', transform: 'rotate(-90 14 ' + (P.t + ph / 2) + ')' }, 'dBm (avg → OMAouter)'));
    const pts = [];
    const bar = (i, top, bot, col, val, name) => {
      const x0 = P.l + i * bw + bw * 0.14, w = bw * 0.72;
      svg.appendChild(s('rect', { x: x0, y: Y(top), width: w, height: Math.max(1.5, Y(bot) - Y(top)), rx: 2, style: 'fill:' + col + ';opacity:.85' }));
      svg.appendChild(s('text', { x: x0 + w / 2, y: Y(top) - 5, 'text-anchor': 'middle', class: 'bd-lbl' }, val));
      const ly = H - P.b + 14;
      svg.appendChild(s('text', { x: x0 + w / 2, y: ly, 'text-anchor': 'end', transform: 'rotate(-38 ' + (x0 + w / 2) + ' ' + ly + ')' }, name));
      return x0 + w / 2;
    };
    r.steps.forEach((x, i) => {
      const prev = i ? r.steps[i - 1].lv : ymin;
      const col = x.abs ? 'var(--optic)' : x.d >= 0 ? 'var(--good)' : 'var(--bad)';
      const cx = bar(i, Math.max(prev, x.lv), Math.min(prev, x.lv), col, x.abs ? x.lv.toFixed(1) : sg(x.d, 2), x.n);
      if (i < r.steps.length) { const xa = P.l + i * bw + bw * 0.86, xb = P.l + (i + 1) * bw + bw * 0.14; svg.appendChild(s('line', { x1: xa, x2: xb, y1: Y(x.lv), y2: Y(x.lv), style: 'stroke:var(--muted);stroke-dasharray:2 3' })); }
      pts.push([cx, Y(x.lv)]);
    });
    const ok = r.margin >= 0;
    const cx = bar(n - 1, r.rx, ymin, 'var(--data)', r.rx.toFixed(1) + ' dBm', 'Rx OMAouter @PD');
    pts.push([cx, Y(r.rx)]);
    // avg | OMA divider
    const xd = P.l + 6 * bw;
    svg.appendChild(s('line', { x1: xd, x2: xd, y1: P.t, y2: H - P.b, style: 'stroke:var(--violet);stroke-dasharray:3 4' }));
    svg.appendChild(s('text', { x: xd - 6, y: P.t + 10, 'text-anchor': 'end', style: 'fill:var(--violet)' }, '← average power (CW)'));
    svg.appendChild(s('text', { x: xd + 6, y: P.t + 10, style: 'fill:var(--violet)' }, 'OMAouter (modulated) →'));
    // sensitivity lines
    svg.appendChild(s('line', { x1: P.l, x2: W - P.r, y1: Y(r.sensIdeal), y2: Y(r.sensIdeal), style: 'stroke:var(--sense);opacity:.45;stroke-dasharray:2 4' }));
    svg.appendChild(s('text', { x: P.l + 4, y: Y(r.sensIdeal) + 13, style: 'fill:var(--sense);opacity:.7' }, 'ideal (noise-only) sensitivity ' + r.sensIdeal.toFixed(1) + ' dBm'));
    svg.appendChild(s('line', { x1: P.l, x2: W - P.r, y1: Y(r.sens), y2: Y(r.sens), style: 'stroke:var(--sense);stroke-width:2;stroke-dasharray:7 4' }));
    svg.appendChild(s('text', { x: P.l + 4, y: Y(r.sens) - 5, style: 'fill:var(--sense)' }, 'Rx sensitivity incl. penalties ' + r.sens.toFixed(1) + ' dBm OMAouter'));
    // margin arrow
    const ax = cx + bw * 0.42, mc = ok ? 'var(--good)' : 'var(--bad)';
    svg.appendChild(s('line', { x1: ax, x2: ax, y1: Y(r.rx), y2: Y(r.sens), style: 'stroke:' + mc + ';stroke-width:3' }));
    svg.appendChild(s('text', { x: ax - 4, y: (Y(r.rx) + Y(r.sens)) / 2 + 4, 'text-anchor': 'end', style: 'fill:' + mc + ';font-weight:700' }, (ok ? '' : '') + sg(r.margin, 1) + ' dB'));
    return pts;
  }

  function tabLink(body) {
    const st = linkSt, sliders = [];
    const sl = (k, o) => { const r = slider(st, k, o, update); sliders.push(r); return r; };
    const berSel = berSelect(st, 'ber', [2.4e-4, 1e-5, 1e-6, 1e-12], () => update());
    const presets = seg(LINK_PRESETS.map(p => ({ v: p.id, l: p.l })), null, id => { const p = LINK_PRESETS.find(x => x.id === id); Object.assign(st, LINK_DEF, p.v); sliders.forEach(x => x.sync()); berSel.sync(); update(); });
    const ctrl = h('div', { class: 'card' },
      h('div', { class: 'bd-row' }, h('b', null, 'Presets'), presets),
      grp('Source & transmit PIC'),
      sl('laser', { label: 'ELS output per λ', min: 6, max: 22, step: 0.5, unit: 'dBm', badge: 'typ' }),
      sl('elsFiber', { label: 'ELS→OE fiber + connectors', min: 0, max: 4, step: 0.1, unit: 'dB', badge: 'typ' }),
      sl('cplIn', { label: 'Fiber→PIC coupler (laser in)', min: 0.5, max: 4, step: 0.1, unit: 'dB', badge: 'typ' }),
      sl('splitE', { label: 'Power splitter 1:N', min: 0, max: 4, step: 1, fmt: v => '1:' + Math.pow(2, v) }),
      sl('splitX', { label: 'Splitter excess loss', min: 0, max: 1.5, step: 0.1, unit: 'dB', badge: 'est' }),
      sl('route', { label: 'On-chip waveguide routing', min: 0, max: 3, step: 0.1, unit: 'dB', badge: 'est' }),
      sl('mrmIL', { label: 'MRM insertion loss @ bias', min: 0.3, max: 4, step: 0.1, unit: 'dB', badge: 'typ' }),
      grp('Modulation'),
      sl('er', { label: 'Extinction ratio ER', min: 2, max: 9, step: 0.1, unit: 'dB', badge: 'typ' }),
      sl('pam4', { label: 'PAM4 level compression (ring nonlinearity)', min: 0, max: 3, step: 0.1, unit: 'dB', badge: 'est' }),
      sl('bus', { label: 'WDM bus (other rings off-res.)', min: 0, max: 2, step: 0.1, unit: 'dB', badge: 'est' }),
      grp('Channel'),
      sl('cplOut', { label: 'PIC→fiber coupler (Tx out)', min: 0.5, max: 4, step: 0.1, unit: 'dB', badge: 'typ' }),
      sl('nConn', { label: 'Connectors (count)', min: 0, max: 8, step: 1, fmt: v => v + '×' }),
      sl('connL', { label: 'Loss per connector', min: 0.1, max: 1, step: 0.05, unit: 'dB', badge: 'typ' }),
      sl('km', { label: 'Fiber length', min: 0, max: 10, step: 0.05, fmt: v => v < 1 ? Math.round(v * 1000) + ' m' : v.toFixed(2) + ' km' }),
      sl('alpha', { label: 'Fiber attenuation (O-band)', min: 0.3, max: 0.5, step: 0.01, unit: 'dB/km', badge: 'typ' }),
      sl('cplRx', { label: 'Fiber→PIC coupler (Rx in)', min: 0.5, max: 4, step: 0.1, unit: 'dB', badge: 'typ' }),
      sl('demux', { label: 'Demux (drop ring / filter)', min: 0, max: 3, step: 0.1, unit: 'dB', badge: 'est' }),
      grp('Receiver sensitivity'),
      sl('resp', { label: 'Ge PD responsivity R', min: 0.5, max: 1.0, step: 0.01, unit: 'A/W', badge: 'typ' }),
      sl('irn', { label: 'TIA input-referred noise σ', min: 1, max: 8, step: 0.1, unit: 'µA', badge: 'typ' }),
      h('div', { class: 'slider-row bd-sl' }, h('label', null, 'Target pre-FEC BER'), berSel, h('span')),
      sl('isi', { label: 'TDECQ / ISI + dispersion penalty', min: 0, max: 5, step: 0.1, unit: 'dB', badge: 'est' }),
      sl('xt', { label: 'WDM crosstalk penalty', min: 0, max: 2, step: 0.1, unit: 'dB', badge: 'est' }),
      sl('rin', { label: 'RIN / MPI penalty', min: 0, max: 2, step: 0.1, unit: 'dB', badge: 'est' })
    );
    const kRx = kpi('Received OMAouter'), kS = kpi('Sensitivity @ BER'), kM = kpi('Link margin'), kL = kpi('Laser for 3 dB margin');
    const svg = s('svg', { class: 'bd-svg' });
    const tbody = h('tbody');
    const lev = h('div', { class: 'callout bd-levers' });
    const right = h('div', { class: 'card' },
      h('h3', { html: 'Waterfall: ELS laser → photodiode ' + B('typ') + ' ' + B('est') }),
      h('div', { class: 'bd-kpis' }, kRx, kS, kM, kL), svg,
      h('div', { class: 'bd-note' }, 'Red = loss, green = gain. The "ER → OMA" step converts average power into OMAouter (it is +3 dB for infinite ER, less for finite ER). Photons flow along the level path; brightness ∝ power.'),
      lev,
      h('div', { class: 'bd-scroll' }, h('table', { class: 'table bd-table' }, h('thead', null, h('tr', null, h('th', null, 'Stage'), h('th', null, 'Δ dB'), h('th', null, 'Level dBm'), h('th', null, 'Level mW'))), tbody))
    );
    body.appendChild(h('div', { class: 'bd-layout' }, ctrl, right));
    body.appendChild(h('div', { class: 'grid2', style: 'margin-top:16px' },
      h('div', { class: 'card bd-expl' }, h('h3', null, 'Power units & the dB chain'),
        eq('P[dBm] = 10·log10( P / 1 mW )        P[mW] = 10^(P[dBm]/10)\n0 dBm = 1 mW · 10 dBm = 10 mW · 15 dBm = 31.6 mW · −10 dBm = 100 µW\nLosses in dB ADD:   P_rx[dBm] = P_laser[dBm] − Σ L_i[dB]\nSplit 1:N ideal loss = 10·log10(N)  (1:4 → 6.02 dB) + excess\nNever add dBm + dBm: two 0 dBm signals combine to +3.01 dBm'),
        h('p', { html: 'In a CPO link with an ' + C.tip('ELS') + ', the laser is outside the package, so its light pays <b>three</b> fiber↔chip coupling penalties (laser in, Tx out, Rx in) plus a power split shared among channels. That is the price of moving lasers away from the hot ASIC and sharing them (NVIDIA public: 4× fewer lasers ' + B('nv') + ').' })),
      h('div', { class: 'card bd-expl' }, h('h3', null, 'OMA, ER, TDECQ and penalties'),
        eq('ER = P1/P0  (linear),  ER_dB = 10·log10(P1/P0)\nP_avg = (P1+P0)/2,   OMA = P1 − P0 = 2·P_avg·(ER−1)/(ER+1)\nPAM4: adjacent-level spacing = OMAouter/3  → each eye 1/3 of NRZ (−4.77 dB)\nBER_PAM4 ≈ ¾·Q( R·OMAouter / (6·σ_n) )   (Gray code, Gaussian σ_n)\n⇒ OMA_sens = 6·σ_n·Q⁻¹(4/3·BER) / R\nMargin = OMA_rx − (OMA_sens + Σ penalties)'),
        h('p', { html: '<b>Why OMA:</b> the decision circuit only sees the swing between levels; average power sitting in the "0" level is wasted. A micro-ring driven over a small voltage swing yields modest ER (3–6 dB ' + B('typ') + '), so biasing and drive swing trade IL against ER.' }),
        h('p', { html: '<b>TDECQ</b> (PAM4 Tx quality, dB): with a reference receiver (Bessel-Thomson filter + reference FFE), how much less noise the measured eye can tolerate than an ideal eye at the reference SER (≈4.8e-4, i.e. 2× the KP4 BER threshold). It folds bandwidth, ISI, level skew and dispersion into one penalty.' }),
        h('p', { html: '<b>Other penalties:</b> ' + C.tip('MPI') + ' from connector reflections, laser ' + C.tip('RIN') + ', WDM crosstalk from neighbouring rings, chromatic dispersion on ' + C.tip('CWDM') + ' channels away from the zero-dispersion wavelength, polarisation-dependent coupler loss.' }))
    ));

    let pts = [], parts = [], segL = [], total = 0;
    function update() {
      const r = linkCompute(st); shared.margin = r.margin;
      pts = drawWaterfall(svg, r);
      segL = []; total = 0;
      for (let i = 1; i < pts.length; i++) { const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segL.push(L); total += L; }
      const pg = s('g'); svg.appendChild(pg); parts = [];
      for (let i = 0; i < 30; i++) { const c = s('circle', { r: 3, class: 'bd-photon', cx: -10, cy: -10 }); pg.appendChild(c); parts.push({ c, u: i / 30 }); }
      if (RM) parts.forEach(p => place(p));
      kRx.set(r.rx.toFixed(2) + ' dBm', null, fmt(dBm2mW(r.rx) * 1000, 3) + ' µW OMA');
      kS.set(r.sens.toFixed(2) + ' dBm', null, 'ideal ' + r.sensIdeal.toFixed(1) + ' + ' + r.pen.toFixed(1) + ' dB pen.; NRZ would be ' + r.sensNRZ.toFixed(1));
      kM.set(sg(r.margin, 2) + ' dB', r.margin < 0 ? 'bad' : r.margin < 3 ? 'warn' : 'good', r.margin < 0 ? 'LINK FAILS at this BER' : r.margin < 3 ? 'below 3 dB guard band' : 'closes with guard band');
      const lreq = st.laser - (r.margin - 3);
      kL.set(lreq.toFixed(1) + ' dBm', null, fmt(dBm2mW(lreq), 3) + ' mW per λ (now ' + fmt(dBm2mW(st.laser), 3) + ' mW)');
      clear(tbody);
      r.steps.forEach(x => tbody.appendChild(h('tr', null, h('td', null, x.n), h('td', { class: 'n' }, x.abs ? '—' : sg(x.d, 2)), h('td', { class: 'n' }, x.lv.toFixed(2)), h('td', { class: 'n' }, fmt(dBm2mW(x.lv), 3)))));
      tbody.appendChild(h('tr', null, h('td', null, h('b', null, 'Sensitivity (OMAouter)')), h('td', { class: 'n' }, '—'), h('td', { class: 'n' }, r.sens.toFixed(2)), h('td', { class: 'n' }, fmt(dBm2mW(r.sens), 3))));
      const loss = r.steps.filter(x => !x.abs && x.d < 0).slice().sort((a, b) => a.d - b.d).slice(0, 3);
      const cpl = st.cplIn + st.cplOut + st.cplRx, m = r.margin;
      let mt;
      if (m >= 3) mt = 'Margin ' + m.toFixed(1) + ' dB exceeds a 3 dB guard band by ' + (m - 3).toFixed(1) + ' dB → the ELS could run ' + (m - 3).toFixed(1) + ' dB lower (×' + Math.pow(10, -(m - 3) / 10).toFixed(2) + ' optical power; ELS electrical power scales ~linearly at fixed WPE).';
      else if (m >= 0) mt = 'Margin ' + m.toFixed(1) + ' dB is below a typical 3 dB guard band — aging, temperature and connector re-mating will consume it.';
      else mt = 'Link is ' + (-m).toFixed(1) + ' dB SHORT at BER ' + fmt(st.ber) + ': it will run above the FEC threshold. Raising the laser by that much costs ×' + Math.pow(10, -m / 10).toFixed(2) + ' laser power.';
      levers(lev, '<b>What dominates:</b> ' + loss.map(x => x.n + ' (' + (-x.d).toFixed(1) + ' dB)').join(', ') + '. The three fiber↔chip couplers total ' + cpl.toFixed(1) + ' dB. ' + mt +
        '<br><b>Design levers:</b> coupler loss (edge vs grating coupler, mode converters), split ratio vs laser count, MRM bias (closer to resonance → more ER but more IL and thermal sensitivity), driver swing, connector count/cleanliness, lower-noise TIA or higher responsivity, or a stronger FEC (higher allowed pre-FEC BER).');
    }
    function place(p) {
      let d = p.u * total, i = 0;
      while (i < segL.length - 1 && d > segL[i]) { d -= segL[i]; i++; }
      const a = pts[i], b = pts[i + 1] || a, t = segL[i] ? d / segL[i] : 0;
      const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
      p.c.setAttribute('cx', x.toFixed(1)); p.c.setAttribute('cy', y.toFixed(1));
      p.c.style.opacity = clamp(1.15 - (y - 22) / 300, 0.15, 1).toFixed(2);
    }
    update();
    const stop = RM ? null : C.loop(dt => { if (pts.length < 2) return; for (const p of parts) { p.u = (p.u + dt * 0.07) % 1; place(p); } });
    return () => { if (stop) stop(); };
  }

  // ================================================================ TAB 2: BER / FEC
  const fecSt = { snr: 18.5, burst: 1, ports: 512, lpp: 1, rate: 212.5 };
  function fecPost(p, b, n, t) { const ps = symErr(p), k = rsStats(ps, n || 544, t || 15, b); return { k, ps, lgBer: k.lgSer + Math.log10(ps > 0 ? p / ps : 0.1) }; }
  function fecCompute(st) {
    const p = pam4Ber(st.snr), fp = fecPost(p, st.burst);
    const lanes = st.ports * st.lpp, cwps = st.rate * 1e9 / 5440;
    const lgRate = Math.log10(lanes * cwps) + fp.k.lgPcw;
    const snrReq = 10 * Math.log10(5 * Math.pow(Qinv(2.4e-4 / 0.75), 2));
    let lo = -9, hi = -0.7;
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (fecPost(Math.pow(10, m), st.burst).lgBer > -15) hi = m; else lo = m; }
    return { p, ps: fp.ps, k: fp.k, lgBerOut: fp.lgBer, lanes, cwps, lgRate, lgMT: -lgRate, snrReq, margin: st.snr - snrReq, pMax: Math.pow(10, (lo + hi) / 2) };
  }
  function tabFec(body) {
    const st = fecSt;
    const sl = (k, o) => slider(st, k, o, update);
    const rateSel = h('select', { onchange: () => { st.rate = +rateSel.value; update(); } },
      [[53.125, '50G/lane (26.6 GBd PAM4)'], [106.25, '100G/lane (53.1 GBd)'], [212.5, '200G/lane (106.25 GBd)'], [425, '400G/lane (212.5 GBd)']].map(([v, l]) => h('option', { value: v, selected: v === st.rate }, l)));
    const ctrl = h('div', { class: 'card' },
      grp('Channel'),
      sl('snr', { label: 'Slicer SNR (PAM4)', min: 12, max: 26, step: 0.1, unit: 'dB' }),
      sl('burst', { label: 'Error burst length b (DFE propagation)', min: 1, max: 4, step: 1, unit: 'sym', badge: 'est' }),
      grp('System (for MTBUE)'),
      sl('ports', { label: 'Ports', min: 1, max: 2048, step: 1, dec: 0 }),
      sl('lpp', { label: 'Lanes per port', min: 1, max: 8, step: 1, dec: 0 }),
      h('div', { class: 'slider-row bd-sl' }, h('label', null, 'Lane line rate (incl. FEC)'), rateSel, h('span')),
      h('div', { class: 'bd-note', html: 'Spectrum-X Photonics: 512 × 200G ' + B('nv') + ' = 512 lanes at 212.5 Gb/s line rate. 800G port = 4 lanes.' }),
      grp('Live codeword (544 × 10-bit symbols)'),
      h('div', { class: 'bd-note' }, 'Each frame a random KP4 codeword at the current symbol error rate. Red = symbol errors. ≤15 → corrected.')
    );
    const cw = mkCanvas(340, 170); const status = h('div', { class: 'bd-status' }), simTxt = h('div', { class: 'bd-note' });
    ctrl.appendChild(cw.c); ctrl.appendChild(status); ctrl.appendChild(simTxt);
    const kPre = kpi('Pre-FEC BER'), kSm = kpi('SNR margin vs KP4 threshold'), kPost = kpi('Post-FEC BER'), kFer = kpi('Codeword failure P_cw'), kMt = kpi('MTBUE (whole switch)');
    const svgC = s('svg', { class: 'bd-svg' }), svgS = s('svg', { class: 'bd-svg' }), lev = h('div', { class: 'callout bd-levers' });
    const right = h('div', { class: 'card' }, h('div', { class: 'bd-kpis' }, kPre, kSm, kPost, kFer, kMt),
      h('h3', null, 'The FEC cliff: post-FEC vs pre-FEC BER'), svgC,
      h('h3', null, 'SNR → pre-FEC BER'), svgS, lev);
    body.appendChild(h('div', { class: 'bd-layout' }, ctrl, right));
    body.appendChild(h('div', { class: 'grid2', style: 'margin-top:16px' },
      h('div', { class: 'card bd-expl' }, h('h3', null, 'Model'),
        eq('PAM4 levels {±1,±3}·a, Gaussian noise σ:   SNR = Es/σ² = 5a²/σ²\nSER = 2(1−1/M)·Q(a/σ) = 1.5·Q(√(SNR/5)),   BER ≈ SER/2 (Gray)\nQ(x) = ½·erfc(x/√2)\nKP4 = RS(544,514) over GF(2¹⁰):  t = (544−514)/2 = 15 symbols\np_s = 1 − (1 − BER)¹⁰\nP_cw = Σ_{i=t+1..n} C(n,i)·p_s^i·(1−p_s)^(n−i)\nSER_out ≈ Σ_{i>t} (i/n)·C(n,i)·p_s^i·(1−p_s)^(n−i),   BER_out ≈ SER_out·BER/p_s\ncodewords/s per lane = line rate / 5440 bit   (212.5 Gb/s → 39.06 M/s)\nMTBUE = 1 / (N_lanes · cw/s · P_cw)'),
        h('p', { html: 'The 15-symbol correction turns a ~1e-4 raw BER into ~1e-15: the post-FEC curve has slope ≈16 decades per decade (∝ p_s¹⁶), so a fraction of a dB of SNR moves the uncorrectable rate by orders of magnitude — the <b>cliff</b>. Above threshold the code collapses quickly.' })),
      h('div', { class: 'card bd-expl' }, h('h3', null, 'Burst / correlation caveat'),
        h('p', { html: 'The binomial model assumes independent symbol errors. A ' + C.tip('DFE') + ' that makes one wrong decision feeds it back and can corrupt the next symbols (bursts). With bursts of b symbols, each event uses b of the 15 correctable symbols: effective t ≈ ⌊15/b⌋ (model shown when b>1). Mitigations: 1/(1+D) precoding, multi-codeword symbol interleaving (each burst spread across 2–4 codewords), lower DFE tap weight / more FFE.' }),
        h('p', { html: 'Real links also have a <b>BER floor</b> from rare events no FEC fixes: ring unlock/mode hop, laser glitches, crosstalk bursts, power transients. In practice those, not Gaussian noise, set MTBUE — which is why telemetry (pre-FEC BER, corrected-symbol histograms per lane) is monitored continuously.' }),
        h('p', { html: 'An uncorrectable codeword is flagged by the decoder (it corrupts symbols so the packet CRC fails) → the packet is dropped and recovered by higher layers.' })),
    ));

    let pe = 0, bb = 1, simN = 0, simF = 0, cells = new Uint8Array(544), timer = 0, fail = false, cnt = 0, frames = 0;
    function drawCw() {
      const g = cw.ctx, cs = 10; g.clearRect(0, 0, cw.w, cw.h);
      const ok = cssv('--panel2'), bad = cssv('--bad'), good = cssv('--good');
      for (let i = 0; i < 544; i++) { const x = (i % 34) * cs, y = Math.floor(i / 34) * cs + 2; g.fillStyle = cells[i] ? bad : ok; g.fillRect(x + 1, y + 1, cs - 2, cs - 2); }
      g.strokeStyle = fail ? bad : good; g.lineWidth = 2; g.strokeRect(1, 1, cw.w - 2, cw.h - 2);
      status.innerHTML = cnt + ' symbol errors → ' + (fail ? '<span class="bd-fail">UNCORRECTABLE (&gt;15)</span>' : '<span class="bd-pass">corrected (≤15)</span>');
    }
    function newCw() {
      cells.fill(0); const ev = poisson(544 * pe);
      for (let e = 0; e < ev; e++) { const s0 = Math.floor(Math.random() * 544); for (let q = 0; q < bb; q++) cells[(s0 + q) % 544] = 1; }
      cnt = 0; for (let i = 0; i < 544; i++) cnt += cells[i]; fail = cnt > 15; drawCw();
    }
    function update() {
      const r = fecCompute(st);
      pe = r.ps / st.burst; bb = st.burst; simN = 0; simF = 0;
      kPre.set(fmt(r.p, 3), r.p > 2.4e-4 ? 'bad' : 'good', 'p_s(10-bit) = ' + fmt(r.ps, 3));
      kSm.set(sg(r.margin, 2) + ' dB', r.margin < 0 ? 'bad' : r.margin < 1 ? 'warn' : 'good', 'needs ' + r.snrReq.toFixed(2) + ' dB for 2.4e-4');
      kPost.set(fmtLg(r.lgBerOut), r.lgBerOut > -13 ? 'bad' : 'good', 'max pre-FEC for 1e-15: ' + fmt(r.pMax, 3));
      kFer.set(fmtLg(r.k.lgPcw), r.k.lgPcw > -10 ? 'bad' : null, fmt(r.cwps * r.lanes, 3) + ' codewords/s total');
      kMt.set(fmtTimeLg(r.lgMT), r.lgMT < Math.log10(86400) ? 'bad' : r.lgMT < Math.log10(3.156e7) ? 'warn' : 'good', r.lanes + ' lanes × ' + st.rate + ' Gb/s' + (r.lgMT > Math.log10(3.156e7 * 1.38e10) ? ' (≫ age of universe)' : ''));
      // cliff
      const xs = []; for (let i = 0; i <= 140; i++) xs.push(Math.pow(10, -7 + 6 * i / 140));
      const ser = [
        { pts: xs.map(x => [x, x]), color: 'var(--muted)', dash: '5 4', label: 'no FEC' },
        { pts: xs.map(x => [x, Math.pow(10, fecPost(x, 1, 528, 7).lgBer)]), color: 'var(--violet)', label: 'KR4 RS(528,514) t=7' },
        { pts: xs.map(x => [x, Math.pow(10, fecPost(x, 1).lgBer)]), color: 'var(--accent)', w: 2.5, label: 'KP4 RS(544,514) t=15, iid' }
      ];
      if (st.burst > 1) ser.push({ pts: xs.map(x => [x, Math.pow(10, fecPost(x, st.burst).lgBer)]), color: 'var(--warn)', label: 'KP4 with bursts b=' + st.burst });
      plot(svgC, { W: 720, H: 330, x: { min: 1e-7, max: 1e-1, log: true, label: 'pre-FEC BER' }, y: { min: 1e-30, max: 1, log: true, maxTicks: 10, label: 'post-FEC BER' }, series: ser,
        bands: [{ y: [1e-15, 1e-13], color: 'var(--good)', op: 0.15 }],
        vlines: [{ x: 2.4e-4, color: 'var(--sense)', label: 'KP4 threshold 2.4e-4' }],
        hlines: [{ y: 1e-15, color: 'var(--good)', label: 'post-FEC target 1e-13…1e-15' }],
        points: [{ x: r.p, y: Math.pow(10, Math.max(-30, r.lgBerOut)), color: 'var(--accent2)', label: 'you' }] });
      const sx = []; for (let i = 0; i <= 120; i++) sx.push(10 + 16 * i / 120);
      plot(svgS, { W: 720, H: 260, x: { min: 10, max: 26, label: 'SNR (dB)' }, y: { min: 1e-12, max: 1, log: true, label: 'BER' },
        series: [{ pts: sx.map(x => [x, pam4Ber(x)]), color: 'var(--data)', label: 'PAM4 ¾·Q(√(SNR/5))' }, { pts: sx.map(x => [x, nrzBer(x)]), color: 'var(--muted)', dash: '5 4', label: 'NRZ Q(√SNR)' }],
        hlines: [{ y: 2.4e-4, color: 'var(--sense)', label: '2.4e-4' }], vlines: [{ x: r.snrReq, color: 'var(--sense)', label: r.snrReq.toFixed(1) + ' dB', dy: 30 }],
        points: [{ x: st.snr, y: Math.max(1e-12, r.p), color: 'var(--accent2)' }] });
      levers(lev, '<b>What dominates:</b> ' + (r.margin < 0 ? 'you are past the cliff — raw BER ' + fmt(r.p) + ' exceeds what t=15 can fix; every 0.1 dB SNR matters.' : 'with ' + r.margin.toFixed(1) + ' dB SNR margin the Gaussian-noise MTBUE is ' + fmtTimeLg(r.lgMT) + '; in reality rare non-Gaussian events (bursts, unlocks) will dominate.') +
        ' PAM4 needs ≈' + r.snrReq.toFixed(1) + ' dB SNR at the KP4 threshold (NRZ would need ~9.5 dB less SNR but twice the baud). <br><b>Design levers:</b> optical margin (tab 1) → SNR, TIA noise, equalization (FFE/DFE trade: DFE gain vs burst risk), precoding + interleaving, stronger/concatenated FEC (latency cost), per-lane BER telemetry to catch drifting lanes before the cliff.');
      if (RM) newCw();
    }
    update(); newCw();
    const stop = RM ? null : C.loop(dt => {
      frames++;
      const lam = 544 * pe;
      for (let j = 0; j < 300; j++) { simN++; if (poisson(lam) * bb > 15) simF++; }
      timer -= dt; if (timer <= 0) { timer = 0.45; newCw(); }
      if (frames % 10 === 0) simTxt.textContent = 'Monte-Carlo: ' + fmt(simN, 3) + ' codewords, ' + simF + ' uncorrectable (FER ≈ ' + (simN ? fmt(simF / simN, 2) : '—') + '). At realistic BER the analytic tail is far below what simulation can reach — that is why the binomial model is used.';
    });
    return () => { if (stop) stop(); };
  }

  // ================================================================ TAB 3: power budget
  const PWR_DEF = { bw: 102.4, lane: 200, asic: 300, mgmt: 60, cCool: 40, pCool: 160, cSer: 2.5, cDrv: 1.2, cTia: 1.0, rings: 2, tune: 1.0, heff: 0.2, ctrl: 0.4, oeCap: 1.6, lasDbm: 15, split: 4, wpe: 15, pSer: 4.5, pDsp: 9.0, pOpt: 4.0, pMisc: 1.0, eP: 96, eI: 97.5, eV: 90 };
  const pwrSt = Object.assign({ view: 'cpo' }, PWR_DEF);
  function chain(list, st) {
    let A = 0, Bn = 0, ic = 0, load = 0;
    for (const x of list) { if (x.vrm) A += x.w; else Bn += x.w; if (x.ic) ic += x.w; load += x.w; }
    const P12 = A / (st.eV / 100) + Bn, P54 = P12 / (st.eI / 100), wall = P54 / (st.eP / 100);
    return { list, A, Bn, P12, P54, wall, vrmLoss: A / (st.eV / 100) - A, ibcLoss: P54 - P12, psuLoss: wall - P54, ic, load };
  }
  function pwrCompute(st) {
    const bits = st.bw * 1e12, lanes = st.bw * 1e3 / st.lane, pj = x => x * 1e-12 * bits;
    const nOE = st.bw / st.oeCap, nLas = lanes / st.split, pO = dBm2mW(st.lasDbm) * 1e-3;
    const asic = { n: 'ASIC core (pipeline, buffer)', w: st.asic, vrm: 1, col: 'var(--data)', op: 0.95 };
    const mg = { n: 'Management (BMC, CPU, CPLD)', w: st.mgmt, vrm: 0, col: 'var(--mech)', op: 0.8 };
    const cpo = chain([asic,
      { n: 'SerDes (short reach → OE)', w: pj(st.cSer), vrm: 1, ic: 1, col: 'var(--data)', op: 0.5 },
      { n: 'MRM drivers', w: pj(st.cDrv), vrm: 1, ic: 1, col: 'var(--optic)', op: 0.95 },
      { n: 'TIAs', w: pj(st.cTia), vrm: 1, ic: 1, col: 'var(--optic)', op: 0.65 },
      { n: 'Ring heaters', w: lanes * st.rings * st.tune / st.heff * 1e-3, vrm: 1, ic: 1, col: 'var(--therm)', op: 0.95 },
      { n: 'OE control (lock loops, ADC/DAC)', w: nOE * st.ctrl, vrm: 1, ic: 1, col: 'var(--ctrl)', op: 0.9 },
      { n: 'ELS lasers (electrical)', w: nLas * pO / (st.wpe / 100), vrm: 0, ic: 1, col: 'var(--optic)', op: 0.4 },
      mg, { n: 'Cooling (pumps)', w: st.cCool, vrm: 0, col: 'var(--therm)', op: 0.45 }], st);
    const plug = chain([asic,
      { n: 'SerDes (long reach → cage)', w: pj(st.pSer), vrm: 1, ic: 1, col: 'var(--data)', op: 0.5 },
      { n: 'Module DSP (retimer)', w: pj(st.pDsp), vrm: 1, ic: 1, col: 'var(--accent)', op: 0.9 },
      { n: 'Module optics (drv/TIA/laser/TEC)', w: pj(st.pOpt), vrm: 1, ic: 1, col: 'var(--optic)', op: 0.8 },
      { n: 'Module misc (MCU, DC-DC)', w: pj(st.pMisc), vrm: 1, ic: 1, col: 'var(--ctrl)', op: 0.7 },
      mg, { n: 'Cooling (fans)', w: st.pCool, vrm: 0, col: 'var(--therm)', op: 0.45 }], st);
    return { cpo, plug, bits, lanes, nOE, nLas, pjb: w => w / bits * 1e12 };
  }
  function drawBars(svg, r) {
    const W = 560, H = 420, P = { l: 50, t: 30, b: 50 };
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); clear(svg);
    const mx = Math.max(r.cpo.wall, r.plug.wall) * 1.08, ph = H - P.t - P.b, Y = v => P.t + ph - v / mx * ph;
    const gg = s('g', { class: 'bd-grid' }); svg.appendChild(gg);
    const stp = niceStep(mx, 6);
    for (let v = 0; v <= mx; v += stp) { gg.appendChild(s('line', { x1: P.l, x2: W - 10, y1: Y(v), y2: Y(v) })); svg.appendChild(s('text', { x: P.l - 6, y: Y(v) + 4, 'text-anchor': 'end' }, fmt(v, 3))); }
    svg.appendChild(s('text', { x: 12, y: P.t + ph / 2, class: 'bd-axl', 'text-anchor': 'middle', transform: 'rotate(-90 12 ' + (P.t + ph / 2) + ')' }, 'Wall power (W)'));
    [['Pluggable', r.plug, 110], ['CPO', r.cpo, 330]].forEach(([name, c, x]) => {
      const bw = 120; let acc = 0;
      const segs = c.list.concat([{ n: 'VRM loss', w: c.vrmLoss, col: 'var(--power)', op: 0.9 }, { n: 'IBC loss', w: c.ibcLoss, col: 'var(--power)', op: 0.65 }, { n: 'PSU loss', w: c.psuLoss, col: 'var(--power)', op: 0.4 }]);
      for (const sgm of segs) {
        const y1 = Y(acc + sgm.w), y0 = Y(acc); acc += sgm.w;
        svg.appendChild(s('rect', { x, y: y1, width: bw, height: Math.max(0.5, y0 - y1), style: 'fill:' + sgm.col + ';opacity:' + sgm.op + ';stroke:var(--bg);stroke-width:.6' }, s('title', null, sgm.n + ': ' + sgm.w.toFixed(0) + ' W')));
        if (y0 - y1 > 12) svg.appendChild(s('text', { x: x + bw + 6, y: (y0 + y1) / 2 + 4 }, sgm.n.split(' (')[0] + ' ' + sgm.w.toFixed(0)));
      }
      svg.appendChild(s('text', { x: x + bw / 2, y: Y(c.wall) - 8, 'text-anchor': 'middle', class: 'bd-lbl', style: 'font-weight:700' }, c.wall.toFixed(0) + ' W'));
      svg.appendChild(s('text', { x: x + bw / 2, y: H - P.b + 18, 'text-anchor': 'middle', class: 'bd-axl' }, name));
      svg.appendChild(s('text', { x: x + bw / 2, y: H - P.b + 34, 'text-anchor': 'middle' }, r.pjb(c.wall).toFixed(1) + ' pJ/b wall'));
    });
  }
  function drawSankey(svg, c) {
    const W = 940, H = 400, top = 20;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); clear(svg);
    const loads = c.list.map(x => ({ n: x.n, w: x.vrm ? x.w : x.w, col: x.col, op: x.op })).concat([{ n: 'VRM conversion loss', w: c.vrmLoss, col: 'var(--power)', op: 0.9 }]);
    const gap = 4, k = (H - top - 30 - gap * loads.length) / c.wall;
    const xs = [30, 270, 500, 720], nw = 12;
    const node = (x, y, hh, col, label, right) => { svg.appendChild(s('rect', { x, y, width: nw, height: Math.max(1, hh), style: 'fill:' + col })); if (label && hh >= 8) svg.appendChild(s('text', { x: right ? x + nw + 6 : x + nw + 6, y: y + hh / 2 + 4, class: 'bd-lbl' }, label)); };
    const band = (x1, y1, x2, y2, th, col, op) => {
      const xm = (x1 + x2) / 2;
      const d = 'M' + x1 + ' ' + y1 + 'C' + xm + ' ' + y1 + ',' + xm + ' ' + y2 + ',' + x2 + ' ' + y2 + 'L' + x2 + ' ' + (y2 + th) + 'C' + xm + ' ' + (y2 + th) + ',' + xm + ' ' + (y1 + th) + ',' + x1 + ' ' + (y1 + th) + 'Z';
      svg.appendChild(s('path', { d, style: 'fill:' + col + ';opacity:' + (op || 0.3) }));
      const yc1 = y1 + th / 2, yc2 = y2 + th / 2;
      svg.appendChild(s('path', { d: 'M' + x1 + ' ' + yc1 + 'C' + xm + ' ' + yc1 + ',' + xm + ' ' + yc2 + ',' + x2 + ' ' + yc2, class: 'bd-flow', style: 'stroke:' + col + ';stroke-width:1.5;opacity:.9' }));
    };
    const hW = c.wall * k, h54 = c.P54 * k, h12 = c.P12 * k;
    node(xs[0], top, hW, 'var(--power)', null);
    svg.appendChild(s('text', { x: xs[0], y: top + hW + 16, class: 'bd-lbl' }, 'Wall ' + c.wall.toFixed(0) + ' W'));
    node(xs[1], top, h54, 'var(--power)', '54 V bus ' + c.P54.toFixed(0) + ' W');
    node(xs[1], top + h54 + 16, c.psuLoss * k, 'var(--bad)', null);
    svg.appendChild(s('text', { x: xs[1] + nw + 6, y: top + h54 + 16 + c.psuLoss * k + 12 }, 'PSU loss ' + c.psuLoss.toFixed(0) + ' W'));
    band(xs[0] + nw, top, xs[1], top, h54, 'var(--power)');
    band(xs[0] + nw, top + h54, xs[1], top + h54 + 16, c.psuLoss * k, 'var(--bad)', 0.45);
    node(xs[2], top, h12, 'var(--power)', '12 V ' + c.P12.toFixed(0) + ' W');
    node(xs[2], top + h12 + 16, c.ibcLoss * k, 'var(--bad)', null);
    svg.appendChild(s('text', { x: xs[2] + nw + 6, y: top + h12 + 16 + c.ibcLoss * k + 12 }, 'IBC loss ' + c.ibcLoss.toFixed(0) + ' W'));
    band(xs[1] + nw, top, xs[2], top, h12, 'var(--power)');
    band(xs[1] + nw, top + h54 - c.ibcLoss * k, xs[2], top + h12 + 16, c.ibcLoss * k, 'var(--bad)', 0.45);
    let ys = top, yd = top;
    for (const L of loads) {
      const th = L.w * k;
      band(xs[2] + nw, ys, xs[3], yd, th, L.col, 0.32);
      node(xs[3], yd, th, L.col, L.n + ' ' + L.w.toFixed(0) + ' W', true);
      ys += th; yd += th + gap;
    }
  }
  function tabPower(body) {
    const st = pwrSt;
    const sl = (k, o) => slider(st, k, o, update);
    const bwSel = h('select', { onchange: () => { st.bw = +bwSel.value; update(); } },
      [[51.2, '51.2 Tb/s'], [102.4, '102.4 Tb/s — Spectrum-X Photonics 512×200G'], [115.2, '115.2 Tb/s — Quantum-X Photonics 144×800G'], [409.6, '409.6 Tb/s — Spectrum-X Photonics large']].map(([v, l]) => h('option', { value: v, selected: v === st.bw }, l)));
    const ctrl = h('div', { class: 'card' },
      h('div', { class: 'slider-row bd-sl' }, h('label', { html: 'Switch capacity ' + B('nv') }), bwSel, h('span')),
      grp('Shared'),
      sl('asic', { label: 'ASIC core logic + memory', min: 100, max: 900, step: 10, unit: 'W', badge: 'est' }),
      sl('mgmt', { label: 'Management / misc', min: 10, max: 200, step: 5, unit: 'W', badge: 'est' }),
      grp('CPO interconnect'),
      sl('cSer', { label: 'SerDes ASIC→OE', min: 0.5, max: 5, step: 0.1, unit: 'pJ/b', badge: 'est' }),
      sl('cDrv', { label: 'MRM driver', min: 0.2, max: 3, step: 0.1, unit: 'pJ/b', badge: 'est' }),
      sl('cTia', { label: 'TIA', min: 0.2, max: 3, step: 0.1, unit: 'pJ/b', badge: 'est' }),
      sl('rings', { label: 'Rings per lane (Tx MRM + Rx)', min: 1, max: 4, step: 1, dec: 0 }),
      sl('tune', { label: 'Avg heater tuning per ring', min: 0, max: 5, step: 0.1, unit: 'nm', badge: 'est' }),
      sl('heff', { label: 'Heater efficiency', min: 0.05, max: 0.5, step: 0.01, unit: 'nm/mW', badge: 'typ' }),
      sl('ctrl', { label: 'Control per 1.6T OE', min: 0, max: 2, step: 0.05, unit: 'W', badge: 'est' }),
      sl('lasDbm', { label: 'ELS optical power per λ', min: 8, max: 22, step: 0.5, unit: 'dBm', badge: 'typ' }),
      sl('split', { label: 'Lanes per laser (split)', min: 1, max: 16, step: 1, dec: 0, badge: 'est' }),
      sl('wpe', { label: 'ELS wall-plug efficiency (incl. TEC/driver)', min: 5, max: 40, step: 1, unit: '%', badge: 'typ' }),
      sl('cCool', { label: 'Liquid-cooling pumps (share)', min: 0, max: 200, step: 5, unit: 'W', badge: 'est' }),
      grp('Pluggable interconnect'),
      sl('pSer', { label: 'Host LR SerDes', min: 1, max: 8, step: 0.1, unit: 'pJ/b', badge: 'est' }),
      sl('pDsp', { label: 'Module DSP / retimer', min: 0, max: 15, step: 0.1, unit: 'pJ/b', badge: 'est' }),
      sl('pOpt', { label: 'Module optics (EML/DML, drv, TIA, TEC)', min: 1, max: 10, step: 0.1, unit: 'pJ/b', badge: 'est' }),
      sl('pMisc', { label: 'Module MCU / DC-DC', min: 0, max: 3, step: 0.1, unit: 'pJ/b', badge: 'est' }),
      sl('pCool', { label: 'Fans (air-cooled cages)', min: 0, max: 400, step: 10, unit: 'W', badge: 'est' }),
      grp('Conversion chain'),
      sl('eP', { label: 'PSU efficiency (→54 V)', min: 85, max: 99, step: 0.5, unit: '%', badge: 'typ' }),
      sl('eI', { label: 'IBC efficiency (54→12 V)', min: 90, max: 99.5, step: 0.5, unit: '%', badge: 'typ' }),
      sl('eV', { label: 'VRM efficiency (12→0.75 V)', min: 80, max: 96, step: 0.5, unit: '%', badge: 'typ' }));
    const kIc = kpi('Interconnect pJ/b (pluggable → CPO)'), kR = kpi('Interconnect efficiency gain'), kW = kpi('Switch wall power'), kL = kpi('Laser count'), kE = kpi('Conversion chain η');
    const svgB = s('svg', { class: 'bd-svg' }), svgK = s('svg', { class: 'bd-svg' }), tb = h('tbody'), lev = h('div', { class: 'callout bd-levers' });
    const viewSeg = seg([{ v: 'cpo', l: 'CPO flow' }, { v: 'plug', l: 'Pluggable flow' }], st.view, v => { st.view = v; update(); });
    const right = h('div', null,
      h('div', { class: 'card' }, h('div', { class: 'bd-kpis' }, kIc, kR, kW, kL, kE),
        h('div', { class: 'bd-cols' }, h('div', null, h('h3', { html: 'Stacked wall power ' + B('est') }), svgB),
          h('div', { class: 'bd-scroll' }, h('h3', null, 'Breakdown (W)'), h('table', { class: 'table bd-table' }, h('thead', null, h('tr', null, h('th', null, 'Item'), h('th', null, 'Pluggable'), h('th', null, 'CPO'))), tb))),
        lev),
      h('div', { class: 'card', style: 'margin-top:16px' }, h('div', { class: 'bd-row' }, h('h3', { style: 'margin:0' }, 'Sankey: wall → conversion → loads'), viewSeg), svgK));
    body.appendChild(h('div', { class: 'bd-layout' }, ctrl, right));
    body.appendChild(h('div', { class: 'grid2', style: 'margin-top:16px' },
      h('div', { class: 'card bd-expl' }, h('h3', null, 'Equations'),
        eq('pJ/bit = P[W] / throughput[b/s] × 1e12        (30 W / 1.6 Tb/s = 18.75 pJ/b)\nP_elec(block) = E_b[pJ/b] × 1e-12 × C_switch[b/s]\nP_heaters = N_lanes · rings/lane · Δλ_avg / η_heater\nP_ELS = N_lasers · P_opt / WPE ,   N_lasers = N_lanes / split\nP_wall = P_VRM-loads/(η_PSU·η_IBC·η_VRM) + P_other/(η_PSU·η_IBC)\n0.96 · 0.975 · 0.90 = 0.842 → ~16 % of core power lost in conversion'),
        h('p', { html: 'pJ/b here is energy per bit of aggregate one-direction switch capacity, with Tx+Rx of each lane included.' })),
      h('div', { class: 'card bd-expl' }, h('h3', { html: 'How "3.5× power efficiency" decomposes ' + B('nv') + ' ' + B('est') }),
        h('ul', { html: '<li><b>DSP removed:</b> the pluggable retimer DSP (~8–10 pJ/b ' + B('est') + ') disappears; the ASIC SerDes drives the optical engine over millimetres of substrate.</li><li><b>Shorter electrical channel:</b> SerDes no longer has to equalise a ~25–30 dB PCB+connector channel to the cage, so it can be lower power.</li><li><b>Micro-ring modulators:</b> tiny capacitance (tens of fF), low-swing drivers vs EML/Mach-Zehnder drivers.</li><li><b>Shared external lasers:</b> fewer, higher-power lasers (4× fewer ' + B('nv') + ') kept cool on the front panel; but WPE (~10–25 % ' + B('typ') + ') and splitting/coupling loss make laser power a large share of the optics budget.</li><li><b>New CPO costs:</b> ring heaters and wavelength-lock control loops — absent in pluggables.</li>' }),
        h('p', { class: 'bd-note' }, 'Default sliders were chosen so the interconnect ratio lands near the public 3.5× claim; the split between items is an estimate, not NVIDIA data.'))));

    function update() {
      const r = pwrCompute(st), c = r.cpo, p = r.plug;
      const pc = r.pjb(c.ic), pp = r.pjb(p.ic), ratio = pp / pc;
      kIc.set(pp.toFixed(1) + ' → ' + pc.toFixed(1), null, fmt(p.ic, 3) + ' W → ' + fmt(c.ic, 3) + ' W');
      kR.set(ratio.toFixed(2) + '×', Math.abs(ratio - 3.5) < 0.5 ? 'good' : 'warn', 'NVIDIA public claim: 3.5×');
      kW.set(fmt(p.wall, 3) + ' → ' + fmt(c.wall, 3) + ' W', null, r.pjb(p.wall).toFixed(1) + ' → ' + r.pjb(c.wall).toFixed(1) + ' pJ/b wall');
      kL.set(Math.round(r.lanes) + ' → ' + Math.round(r.nLas), null, (r.lanes / r.nLas).toFixed(1) + '× fewer (NVIDIA claim 4×)');
      kE.set((st.eP * st.eI * st.eV / 1e4).toFixed(1) + ' %', null, 'PSU·IBC·VRM for core rails');
      drawBars(svgB, r); drawSankey(svgK, st.view === 'cpo' ? c : p);
      clear(tb);
      const names = []; [p, c].forEach(x => x.list.forEach(it => { if (names.indexOf(it.n) < 0) names.push(it.n); }));
      const val = (x, n) => { const it = x.list.find(q => q.n === n); return it ? it.w.toFixed(1) : '—'; };
      names.forEach(n => tb.appendChild(h('tr', null, h('td', null, n), h('td', { class: 'n' }, val(p, n)), h('td', { class: 'n' }, val(c, n)))));
      [['Conversion losses', x => x.vrmLoss + x.ibcLoss + x.psuLoss], ['Interconnect subtotal', x => x.ic], ['Wall total', x => x.wall]].forEach(([n, fn]) =>
        tb.appendChild(h('tr', null, h('td', null, h('b', null, n)), h('td', { class: 'n' }, fn(p).toFixed(0)), h('td', { class: 'n' }, fn(c).toFixed(0)))));
      const ci = c.list.filter(x => x.ic).sort((a, b) => b.w - a.w);
      levers(lev, '<b>What dominates (CPO):</b> ' + ci.slice(0, 3).map(x => x.n + ' ' + x.w.toFixed(0) + ' W (' + r.pjb(x.w).toFixed(2) + ' pJ/b)').join(', ') + '. Outside the interconnect, the ASIC core (' + st.asic + ' W) and conversion losses (' + (c.vrmLoss + c.ibcLoss + c.psuLoss).toFixed(0) + ' W) remain. ' +
        'Laser electrical power = ' + r.nLas.toFixed(0) + ' × ' + fmt(dBm2mW(st.lasDbm), 3) + ' mW / ' + st.wpe + ' % = ' + ci.find(x => x.n.startsWith('ELS')).w.toFixed(0) + ' W — every dB of optical-link margin you recover (tab 1) cuts this by 21 %.' +
        '<br><b>Design levers:</b> SerDes energy (reach), driver/TIA design, ELS WPE and split ratio, heater efficiency (undercut/trenches) and smaller fab variation, VRM efficiency (every point of η_VRM ≈ 1 % of core power), higher-voltage distribution.');
    }
    update();
  }

  // ================================================================ TAB 4: thermal
  const thSt = { pAsic: 750, rjc: 0.025, rtim: 0.02, rcp: 0.03, tin: 35, flow: 2.0, fluid: 'water', nOE: 64, pOE: 5, rOE: 1.5, kc: 0.15, idle: 50, tinSw: 5, dldt: 0.08, fab: 1.0, heff: 0.2, hmax: 40, fsr: 10, Q: 8000, tFront: 35, pLas: 0.25, rLas: 60, traffic: true, lock: true };
  function thCompute(st, L) {
    const fl = st.fluid === 'water' ? { cp: 4180, rho: 1.0 } : { cp: 3900, rho: 1.025 };
    const mdot = st.flow / 60 * fl.rho;
    const pa = st.pAsic * L, ptot = pa + st.nOE * st.pOE;
    const dTc = ptot / (mdot * fl.cp), tl = st.tin + 0.5 * dTc;
    const tcp = tl + pa * st.rcp, tcase = tcp + pa * st.rtim, tj = tcase + pa * st.rjc;
    const toe = tl + st.pOE * st.rOE + st.kc * (tcase - tl);
    return { mdot, dTc, tl, tcp, tcase, tj, toe, ptot };
  }
  const LIM = { tj: 105, oe: 85, las: 70 };
  function tabThermal(body) {
    const st = thSt;
    const sl = (k, o) => slider(st, k, o, update);
    const fluidSeg = seg([{ v: 'water', l: 'Water' }, { v: 'pg25', l: 'PG25 glycol' }], st.fluid, v => { st.fluid = v; update(); });
    const ctrl = h('div', { class: 'card' },
      grp('ASIC thermal chain'),
      sl('pAsic', { label: 'ASIC power (incl. SerDes)', min: 300, max: 1500, step: 10, unit: 'W', badge: 'est' }),
      sl('rjc', { label: 'R junction→case (lid)', min: 0.005, max: 0.08, step: 0.001, unit: 'K/W', badge: 'typ' }),
      sl('rtim', { label: 'R TIM (lid→cold plate)', min: 0.005, max: 0.08, step: 0.001, unit: 'K/W', badge: 'typ' }),
      sl('rcp', { label: 'R cold plate (cond.+conv.)', min: 0.01, max: 0.1, step: 0.001, unit: 'K/W', badge: 'typ' }),
      grp('Coolant'),
      h('div', { class: 'bd-row' }, fluidSeg),
      sl('tin', { label: 'Coolant inlet', min: 15, max: 50, step: 0.5, unit: '°C', badge: 'typ' }),
      sl('flow', { label: 'Flow rate', min: 0.3, max: 10, step: 0.1, unit: 'L/min', badge: 'est' }),
      grp('Optical engines'),
      sl('nOE', { label: 'Number of OEs', min: 8, max: 128, step: 1, dec: 0, badge: 'est' }),
      sl('pOE', { label: 'Power per OE', min: 1, max: 20, step: 0.5, unit: 'W', badge: 'est' }),
      sl('rOE', { label: 'R OE→coolant', min: 0.3, max: 5, step: 0.1, unit: 'K/W', badge: 'est' }),
      sl('kc', { label: 'ASIC→OE thermal coupling k', min: 0, max: 0.5, step: 0.01, badge: 'est' }),
      grp('Ring drift & tuning'),
      sl('idle', { label: 'Idle ASIC power (% of full)', min: 20, max: 100, step: 1, unit: '%', badge: 'est' }),
      sl('tinSw', { label: 'Coolant inlet swing', min: 0, max: 15, step: 0.5, unit: 'K', badge: 'est' }),
      sl('dldt', { label: 'Ring drift dλ/dT', min: 0.05, max: 0.1, step: 0.005, unit: 'nm/K', badge: 'typ' }),
      sl('fab', { label: 'Fab resonance variation ±', min: 0, max: 5, step: 0.1, unit: 'nm', badge: 'typ' }),
      sl('heff', { label: 'Heater efficiency', min: 0.05, max: 0.5, step: 0.01, unit: 'nm/mW', badge: 'typ' }),
      sl('hmax', { label: 'Max heater power / ring', min: 5, max: 100, step: 1, unit: 'mW', badge: 'est' }),
      sl('fsr', { label: 'Ring FSR', min: 4, max: 20, step: 0.5, unit: 'nm', badge: 'typ' }),
      sl('Q', { label: 'Loaded Q', min: 3000, max: 20000, step: 500, dec: 0, badge: 'typ' }),
      grp('External laser (front panel)'),
      sl('tFront', { label: 'Front-panel ambient', min: 20, max: 55, step: 0.5, unit: '°C', badge: 'typ' }),
      sl('pLas', { label: 'Dissipation per laser chip', min: 0.05, max: 1, step: 0.01, unit: 'W', badge: 'est' }),
      sl('rLas', { label: 'R laser→ambient', min: 10, max: 150, step: 1, unit: 'K/W', badge: 'est' }));
    const kTj = kpi('ASIC Tj'), kOE = kpi('OE temperature'), kLa = kpi('ELS laser'), kDT = kpi('Coolant ΔT'), kDr = kpi('Ring drift (traffic + inlet)'), kHt = kpi('Heater tuning headroom');
    const svgT = s('svg', { class: 'bd-svg' }), lev = h('div', { class: 'callout bd-levers' });
    const hm = mkCanvas(640, 300), rg = mkCanvas(320, 170), live = h('div', { class: 'bd-status' });
    const right = h('div', null,
      h('div', { class: 'card' }, h('div', { class: 'bd-kpis' }, kTj, kOE, kLa, kDT, kDr, kHt), h('h3', null, 'Temperature staircase (full load) vs limits ' ), svgT, lev),
      h('div', { class: 'card', style: 'margin-top:16px' },
        h('div', { class: 'bd-row' }, h('h3', { style: 'margin:0' }, 'Live package thermal view'), check('Traffic load cycling', st.traffic, v => { st.traffic = v; }), check('Wavelength lock loop ON', st.lock, v => { st.lock = v; calToe = null; })),
        h('div', { class: 'bd-cols', style: 'grid-template-columns:1.7fr 1fr' }, hm.c, h('div', null, rg.c, live)),
        h('div', { class: 'bd-note' }, 'Top view of the package on its cold plate: coolant flows left→right and warms up. Traffic varies ASIC power between idle and full; the OE ring drifts with temperature — with the lock loop off the ring walks off the laser line.')));
    body.appendChild(h('div', { class: 'bd-layout' }, ctrl, right));
    body.appendChild(h('div', { class: 'grid2', style: 'margin-top:16px' },
      h('div', { class: 'card bd-expl' }, h('h3', null, 'Equations'),
        eq('T_j = T_coolant,local + P_ASIC·(R_jc + R_TIM + R_cp)\nΔT_coolant = P_loop / (ṁ·c_p),   ṁ = ρ·V̇    (1 L/min water = 0.0167 kg/s)\n  e.g. 1 kW, 2 L/min water → 1000/(0.0333·4180) = 7.2 K\nT_coolant,local ≈ T_in + ½·ΔT_coolant (mid-plate)\nT_OE = T_local + P_OE·R_OE + k·(T_case − T_local)\nΔλ_ring = (dλ/dT)·ΔT ≈ (λ/n_g)·(∂n_eff/∂T)·ΔT ≈ 0.07–0.1 nm/K\nTuning needed = min(FSR, 2·Δλ_fab + Δλ_thermal);  P_heater = Δλ / η_heater\nFWHM = λ / Q_L   (1310 nm / 8000 = 164 pm)')),
      h('div', { class: 'card bd-expl' }, h('h3', null, 'Why different limits'),
        h('p', { html: '<b>ASIC</b> CMOS tolerates Tj ≈ 105 °C ' + B('typ') + ' (reliability/leakage). <b>Optical engines</b> want lower and, above all, <i>stable</i> temperature: ring resonances move ~80 pm/K while the ring linewidth is only ~100–300 pm, Ge PD dark current doubles every ~10 K, driver/TIA bandwidth degrades (~85 °C ' + B('typ') + '). <b>Lasers</b> lose efficiency and lifetime fast with temperature (~70 °C ' + B('typ') + ') — one reason NVIDIA moved them to front-panel ELS modules ' + B('nv') + '.' }),
        h('p', { html: 'Heaters can only red-shift a ring, so rings are designed blue of the laser grid and heated into lock; the hottest operating point must still leave tuning range, and the coldest consumes the most heater power.' }))));

    let calToe = null, hAdj = 0, full = null, Tmax = 100;
    function update() {
      full = thCompute(st, 1); const idle = thCompute(st, st.idle / 100);
      const tlas = st.tFront + st.pLas * st.rLas;
      kTj.set(full.tj.toFixed(1) + ' °C', full.tj > LIM.tj ? 'bad' : full.tj > LIM.tj - 10 ? 'warn' : 'good', 'limit ' + LIM.tj + ' °C [typical]');
      kOE.set(full.toe.toFixed(1) + ' °C', full.toe > LIM.oe ? 'bad' : full.toe > LIM.oe - 10 ? 'warn' : 'good', 'limit ' + LIM.oe + ' °C [typical]');
      kLa.set(tlas.toFixed(1) + ' °C', tlas > LIM.las ? 'bad' : tlas > LIM.las - 10 ? 'warn' : 'good', 'limit ' + LIM.las + ' °C [typical]');
      kDT.set(full.dTc.toFixed(1) + ' K', full.dTc > 15 ? 'warn' : null, fmt(full.ptot, 3) + ' W into ' + (full.mdot * 1000).toFixed(1) + ' g/s');
      const dT = full.toe - idle.toe + st.tinSw, drift = st.dldt * dT, need = Math.min(st.fsr, 2 * st.fab + drift), range = st.hmax * st.heff;
      const fw = 1310 / st.Q;
      kDr.set((drift * 1000).toFixed(0) + ' pm', drift > fw ? 'warn' : null, dT.toFixed(1) + ' K swing = ' + (drift / fw).toFixed(1) + '× FWHM');
      kHt.set(sg(range - need, 2) + ' nm', range < need ? 'bad' : 'good', 'need ' + need.toFixed(2) + ' nm, heater ' + range.toFixed(1) + ' nm');
      const avgP = Math.min(need, st.fab + drift / 2) / st.heff;
      Tmax = Math.max(full.tj + 3, 60);
      // staircase
      const cols = [['Coolant in', st.tin, null], ['Coolant @plate', full.tl, null], ['Cold plate', full.tcp, null], ['Lid / case', full.tcase, null], ['ASIC Tj', full.tj, LIM.tj], ['OE (rings)', full.toe, LIM.oe], ['ELS laser', tlas, LIM.las]];
      const W = 720, H = 280, P = { l: 50, t: 20, b: 36 }, ymax = Math.max(120, Math.ceil(full.tj / 10) * 10 + 10), ymin = 0;
      const ph = H - P.t - P.b, Y = v => P.t + ph - (v - ymin) / (ymax - ymin) * ph, bw = (W - P.l - 10) / cols.length;
      svgT.setAttribute('viewBox', '0 0 ' + W + ' ' + H); clear(svgT);
      const gg = s('g', { class: 'bd-grid' }); svgT.appendChild(gg);
      for (let v = 0; v <= ymax; v += 20) { gg.appendChild(s('line', { x1: P.l, x2: W - 10, y1: Y(v), y2: Y(v) })); svgT.appendChild(s('text', { x: P.l - 6, y: Y(v) + 4, 'text-anchor': 'end' }, v + '°')); }
      cols.forEach(([n, t, lim], i) => {
        const x = P.l + i * bw + bw * 0.18, w = bw * 0.64, over = lim && t > lim;
        svgT.appendChild(s('rect', { x, y: Y(t), width: w, height: Y(ymin) - Y(t), rx: 3, style: 'fill:' + (i === 6 ? 'var(--optic)' : i === 5 ? 'var(--violet)' : 'var(--therm)') + ';opacity:' + (0.35 + 0.6 * (t - 20) / 100) }));
        svgT.appendChild(s('text', { x: x + w / 2, y: Y(t) - 5, 'text-anchor': 'middle', class: 'bd-lbl', style: over ? 'fill:var(--bad)' : '' }, t.toFixed(1)));
        svgT.appendChild(s('text', { x: x + w / 2, y: H - 16, 'text-anchor': 'middle' }, n));
        if (lim) { svgT.appendChild(s('line', { x1: x - 6, x2: x + w + 6, y1: Y(lim), y2: Y(lim), style: 'stroke:var(--bad);stroke-width:2' })); svgT.appendChild(s('text', { x: x + w / 2, y: Y(lim) - 4, 'text-anchor': 'middle', style: 'fill:var(--bad)' }, 'max ' + lim)); }
        if (i > 0 && i < 5) { const prev = cols[i - 1][1]; svgT.appendChild(s('text', { x: x - 2, y: (Y(t) + Y(prev)) / 2 + 30, 'text-anchor': 'middle', style: 'fill:var(--muted);font-size:10px' }, '+' + (t - prev).toFixed(1))); }
      });
      const rises = [['R_jc', st.pAsic * st.rjc], ['R_TIM', st.pAsic * st.rtim], ['R_cold-plate', st.pAsic * st.rcp], ['coolant ½ΔT', full.dTc / 2]].sort((a, b) => b[1] - a[1]);
      levers(lev, '<b>What dominates:</b> the largest rise in the ASIC chain is ' + rises[0][0] + ' (' + rises[0][1].toFixed(1) + ' K), then ' + rises[1][0] + ' (' + rises[1][1].toFixed(1) + ' K). Ring drift over the traffic/inlet swing is ' + (drift * 1000).toFixed(0) + ' pm vs a ' + (fw * 1000).toFixed(0) + ' pm linewidth — the lock loop must track it continuously. Average heater power ≈ ' + avgP.toFixed(1) + ' mW/ring.' +
        '<br><b>Design levers:</b> TIM (liquid metal / solder TIM), lid-less direct-die cooling, micro-channel cold plates, flow rate (pump power ∝ flow³ roughly), inlet temperature (warmer water = free cooling but less Tj headroom), thermal isolation between ASIC and OEs (lower k), athermal ring design, heater undercut (higher η), OE placement upstream in the coolant path.');
    }
    // heatmap fields
    const GW = 160, GH = 75, fA = new Float32Array(GW * GH), fO = new Float32Array(GW * GH);
    const sb = (x, c, hw, sft) => 0.5 * (Math.tanh((x - c + hw) / sft) - Math.tanh((x - c - hw) / sft));
    const oes = [];
    [-11.25, -3.75, 3.75, 11.25].forEach(o => { oes.push([80 + o, 37.5 - 21.5, 3, 2.5], [80 + o, 37.5 + 21.5, 3, 2.5], [80 - 21.5, 37.5 + o, 2.5, 3], [80 + 21.5, 37.5 + o, 2.5, 3]); });
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const k = j * GW + i;
      fA[k] = 0.8 * sb(i, 80, 15, 2) * sb(j, 37.5, 15, 2) + 0.2 * Math.exp(-((i - 80) ** 2 + (j - 37.5) ** 2) / (2 * 22 * 22));
      let o = 0; for (const e of oes) o += sb(i, e[0], e[2], 1.2) * sb(j, e[1], e[3], 1.2); fO[k] = Math.min(1, o);
    }
    const off = document.createElement('canvas'); off.width = GW; off.height = GH; const octx = off.getContext('2d'); const img = octx.createImageData(GW, GH);
    const STOPS = [[0, [20, 40, 120]], [0.25, [34, 150, 238]], [0.5, [60, 220, 132]], [0.75, [250, 204, 21]], [1, [255, 77, 54]]];
    function cmap(t) { t = clamp(t, 0, 1); for (let i = 1; i < STOPS.length; i++) if (t <= STOPS[i][0]) { const a = STOPS[i - 1], b = STOPS[i], u = (t - a[0]) / (b[0] - a[0]); return [0, 1, 2].map(c => a[1][c] + (b[1][c] - a[1][c]) * u); } return STOPS[4][1]; }
    const parts = []; for (let i = 0; i < 40; i++) parts.push({ x: Math.random() * 640, y: Math.random() * 300, v: 40 + Math.random() * 40 });
    function frame(dt, t) {
      const L = st.traffic ? st.idle / 100 + (1 - st.idle / 100) * (0.5 + 0.5 * Math.sin(2 * Math.PI * t / 8)) : 1;
      const cur = thCompute(st, L);
      if (calToe == null) { calToe = cur.toe; hAdj = 0; }
      const riseA = cur.tj - cur.tl, riseO = st.pOE * st.rOE;
      const d = img.data;
      for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
        const k = j * GW + i, T = st.tin + cur.dTc * i / GW + riseA * fA[k] + riseO * fO[k];
        const c = cmap((T - st.tin) / (Tmax - st.tin)); d[k * 4] = c[0]; d[k * 4 + 1] = c[1]; d[k * 4 + 2] = c[2]; d[k * 4 + 3] = 255;
      }
      octx.putImageData(img, 0, 0);
      const g = hm.ctx, sx = hm.w / GW, sy = hm.h / GH;
      g.imageSmoothingEnabled = true; g.drawImage(off, 0, 0, hm.w, hm.h);
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1;
      g.strokeRect((80 - 15) * sx, (37.5 - 15) * sy, 30 * sx, 30 * sy);
      for (const e of oes) g.strokeRect((e[0] - e[2]) * sx, (e[1] - e[3]) * sy, 2 * e[2] * sx, 2 * e[3] * sy);
      g.fillStyle = 'rgba(255,255,255,.75)';
      for (const p of parts) { p.x += p.v * dt; if (p.x > hm.w) { p.x = 0; p.y = Math.random() * hm.h; } g.fillRect(p.x, p.y, 3, 1.2); }
      g.fillStyle = '#fff'; g.font = '12px ' + cssv('--mono');
      g.fillText('ASIC Tj ' + cur.tj.toFixed(1) + ' °C', 80 * sx - 52, 37.5 * sy + 4);
      g.fillText('coolant ' + st.tin.toFixed(0) + ' °C →', 6, 16); g.fillText('→ ' + (st.tin + cur.dTc).toFixed(1) + ' °C', hm.w - 80, 16);
      g.fillText('load ' + (L * 100).toFixed(0) + ' %   OE ' + cur.toe.toFixed(1) + ' °C', 6, hm.h - 8);
      // ring
      const fwPm = 1.31e6 / st.Q, thermPm = st.dldt * 1000 * (cur.toe - calToe);
      if (st.lock) hAdj += (-thermPm - hAdj) * Math.min(1, dt / 0.15);
      const det = thermPm + (st.lock ? hAdj : 0), pen = 10 * Math.log10(1 + (2 * det / fwPm) ** 2);
      const r = rg.ctx; r.clearRect(0, 0, rg.w, rg.h);
      const span = 4 * fwPm, X = x => rg.w / 2 + x / span * (rg.w / 2), Yr = v => rg.h - 22 - v * (rg.h - 40);
      r.strokeStyle = cssv('--line'); r.beginPath(); r.moveTo(0, Yr(0)); r.lineTo(rg.w, Yr(0)); r.stroke();
      r.strokeStyle = cssv('--accent2'); r.lineWidth = 2; r.beginPath();
      for (let i = 0; i <= 160; i++) { const x = -span + 2 * span * i / 160, v = 1 / (1 + (2 * (x - det) / fwPm) ** 2); i ? r.lineTo(X(x), Yr(v)) : r.moveTo(X(x), Yr(v)); }
      r.stroke();
      r.strokeStyle = cssv('--optic'); r.lineWidth = 2; r.shadowColor = cssv('--optic'); r.shadowBlur = 8; r.beginPath(); r.moveTo(X(0), Yr(0)); r.lineTo(X(0), Yr(1.05)); r.stroke(); r.shadowBlur = 0;
      r.fillStyle = cssv('--muted'); r.font = '11px ' + cssv('--mono');
      r.fillText('ring drop response vs laser λ (±' + Math.round(span) + ' pm)', 6, 12);
      r.fillText('laser', X(0) + 4, Yr(1) + 10);
      live.innerHTML = 'detuning ' + det.toFixed(1) + ' pm · drop penalty <span class="' + (pen > 1 ? 'bd-fail' : 'bd-pass') + '">' + pen.toFixed(2) + ' dB</span><br>heater correction ' + (st.lock ? (hAdj / 1000 / st.heff).toFixed(2) + ' mW' : 'frozen (loop off)');
    }
    update();
    body.querySelectorAll('input[type=range]').forEach(i => i.addEventListener('input', () => { calToe = null; }));
    let stop = null;
    if (RM) frame(0, 2); else stop = C.loop(frame);
    return () => { if (stop) stop(); };
  }

  // ================================================================ TAB 5: accuracy / control
  const accSt = { mode: 'hyb', Q: 8000, hRange: 8, dacBits: 12, vdac: true, adcBits: 12, adcFS: 0.5, tap: 5, ain: 3, bw: 10, xtk: 8, xtStep: 150, tau: 10, dist: 300, distF: 100, dith: 4,
    tAcc: 1.5, tGrad: 3, tQ: 0.25, tjMax: 105, vAcc: 0.5, iAcc: 2, pRef: 750,
    vnom: 780, vmin: 700, tol: 0.5, ripple: 8, dI: 250, zt: 0.1, ir: 6,
    aCal: 0.3, aTrk: 0.4, aAge: 0.5, aSplit: 0.3, aConn: 0.25 };
  function tabAccuracy(body) {
    const st = accSt;
    const charts = [];
    const sl = (k, o) => slider(st, k, o, update);
    const modeSeg = seg([{ v: 'wc', l: 'Worst-case stack-up' }, { v: 'rss', l: 'RSS (all random)' }, { v: 'hyb', l: 'Hybrid: Σdet + RSS(random)' }], st.mode, v => { st.mode = v; update(); });
    const svgL = s('svg', { class: 'bd-svg' }), svgLz = s('svg', { class: 'bd-svg' }), resL = h('div', { class: 'bd-status' });
    const svgT = s('svg', { class: 'bd-svg' }), svgP = s('svg', { class: 'bd-svg' }), resT = h('div', { class: 'bd-status' });
    const svgV = s('svg', { class: 'bd-svg' }), resV = h('div', { class: 'bd-status' });
    const svgA = s('svg', { class: 'bd-svg' }), resA = h('div', { class: 'bd-status' });
    const lev = h('div', { class: 'callout bd-levers' });
    body.appendChild(h('div', { class: 'card' }, h('div', { class: 'bd-row' }, h('b', null, 'Combination rule'), modeSeg),
      h('div', { class: 'bd-note', html: 'All contributors are entered as ± bounds (≈3σ for random terms). Worst-case assumes every term at its extreme simultaneously; RSS assumes independence; hybrid adds deterministic terms linearly and RSSes the random ones (common practice). ' + B('est') }), lev));
    body.appendChild(h('div', { class: 'bd-cols', style: 'margin-top:16px' },
      h('div', { class: 'card' }, h('h3', null, 'Wavelength-lock residual detuning'),
        sl('Q', { label: 'Ring loaded Q', min: 3000, max: 20000, step: 500, dec: 0, badge: 'typ' }),
        sl('hRange', { label: 'Heater full-scale tuning', min: 2, max: 15, step: 0.5, unit: 'nm', badge: 'typ' }),
        sl('dacBits', { label: 'Heater DAC resolution', min: 6, max: 16, step: 1, unit: 'bit' }),
        h('div', { class: 'bd-row' }, check('Voltage-mode DAC (P ∝ V² → worst LSB 2×)', st.vdac, v => { st.vdac = v; update(); })),
        sl('adcBits', { label: 'Monitor ADC resolution', min: 6, max: 16, step: 1, unit: 'bit' }),
        sl('adcFS', { label: 'Signal / ADC full scale', min: 0.1, max: 1, step: 0.05 }),
        sl('tap', { label: 'Monitor-PD tap power', min: 0.5, max: 100, step: 0.5, unit: 'µW', badge: 'typ' }),
        sl('ain', { label: 'Monitor amp noise', min: 0.5, max: 20, step: 0.5, unit: 'pA/√Hz', badge: 'typ' }),
        sl('bw', { label: 'Lock-loop bandwidth f_L', min: 0.1, max: 100, step: 0.1, unit: 'kHz', badge: 'est' }),
        sl('xtk', { label: 'Neighbour-heater crosstalk', min: 0, max: 30, step: 0.5, unit: '%', badge: 'typ' }),
        sl('xtStep', { label: 'Neighbour tuning step', min: 0, max: 500, step: 10, unit: 'pm', badge: 'est' }),
        sl('tau', { label: 'Heater thermal time constant', min: 1, max: 100, step: 1, unit: 'µs', badge: 'typ' }),
        sl('dist', { label: 'ASIC thermal disturbance', min: 0, max: 1000, step: 10, unit: 'pm', badge: 'est' }),
        sl('distF', { label: 'Disturbance frequency', min: 1, max: 5000, step: 1, unit: 'Hz', badge: 'est' }),
        sl('dith', { label: 'Dither amplitude (if dither-lock)', min: 0, max: 20, step: 0.5, unit: 'pm', badge: 'est' }),
        svgL, resL, svgLz),
      h('div', null,
        h('div', { class: 'card' }, h('h3', null, 'Sensor & telemetry accuracy'),
          sl('tAcc', { label: 'Temp sensor accuracy ±', min: 0.25, max: 5, step: 0.25, unit: '°C', badge: 'typ' }),
          sl('tGrad', { label: 'Sensor→hot-spot offset ±', min: 0, max: 10, step: 0.5, unit: '°C', badge: 'est' }),
          sl('tQ', { label: 'ADC quantisation ±', min: 0, max: 1, step: 0.05, unit: '°C' }),
          sl('tjMax', { label: 'Tj max', min: 85, max: 125, step: 1, unit: '°C', badge: 'typ' }),
          svgT, sl('vAcc', { label: 'Voltage telemetry ±', min: 0.1, max: 3, step: 0.1, unit: '%', badge: 'typ' }),
          sl('iAcc', { label: 'Current telemetry ±', min: 0.25, max: 5, step: 0.25, unit: '%', badge: 'typ' }),
          sl('pRef', { label: 'Rail power', min: 100, max: 1500, step: 10, unit: 'W' }), svgP, resT),
        h('div', { class: 'card', style: 'margin-top:16px' }, h('h3', null, 'VRM regulation vs silicon Vmin'),
          sl('vnom', { label: 'VRM setpoint V_nom', min: 650, max: 950, step: 5, unit: 'mV' }),
          sl('vmin', { label: 'Silicon V_min (at f_max)', min: 600, max: 850, step: 5, unit: 'mV', badge: 'est' }),
          sl('tol', { label: 'Static setpoint tolerance ±', min: 0.25, max: 3, step: 0.05, unit: '%', badge: 'typ' }),
          sl('ripple', { label: 'Ripple (p-p)', min: 1, max: 30, step: 0.5, unit: 'mV', badge: 'typ' }),
          sl('dI', { label: 'Load step ΔI', min: 50, max: 600, step: 10, unit: 'A', badge: 'est' }),
          sl('zt', { label: 'PDN target impedance', min: 0.02, max: 0.5, step: 0.01, unit: 'mΩ', badge: 'typ' }),
          sl('ir', { label: 'Package/plane IR drop', min: 0, max: 20, step: 0.5, unit: 'mV', badge: 'est' }),
          svgV, resV),
        h('div', { class: 'card', style: 'margin-top:16px' }, h('h3', null, 'Laser power control (APC) accuracy'),
          sl('aCal', { label: 'Monitor-PD calibration ±', min: 0, max: 1, step: 0.05, unit: 'dB', badge: 'typ' }),
          sl('aTrk', { label: 'Tracking error over temp ±', min: 0, max: 1, step: 0.05, unit: 'dB', badge: 'typ' }),
          sl('aAge', { label: 'Aging / EOL ±', min: 0, max: 1.5, step: 0.05, unit: 'dB', badge: 'est' }),
          sl('aSplit', { label: 'Splitter imbalance ±', min: 0, max: 1, step: 0.05, unit: 'dB', badge: 'est' }),
          sl('aConn', { label: 'Connector re-mate repeatability ±', min: 0, max: 1, step: 0.05, unit: 'dB', badge: 'typ' }),
          svgA, resA))));
    body.appendChild(h('div', { class: 'card bd-expl', style: 'margin-top:16px' }, h('h3', null, 'Equations'),
      eq('Worst case: Σ|xᵢ|      RSS: √(Σ xᵢ²)      Hybrid: Σ|x_det| + √(Σ x_rand²)\nDAC LSB = range / 2^N ;  quantisation error ±½ LSB  (σ = LSB/√12)\nRing drop: T(δ) = 1 / (1 + (2δ/FWHM)²) ,  FWHM = λ/Q_L ;  max slope |dT/dδ| = 1.30/FWHM\nDetuning from sensing error: δ = ΔT_meas / slope\nPD noise: σ_I = √(2qI·B + i_n²·B) ,  B = loop bandwidth\nLoop rejection (integrator): |S(f)| = f / √(f² + f_L²)\nPower penalty = 10·log10(1 + (2δ/FWHM)²) dB\nVRM: V_nom − V_min ≥ V_nom·tol + ripple/2 + ΔI·Z_target + IR ;  P_dyn ∝ V²\nAPC: Σ dB terms consume the optical link margin (dB add ≈ linearly for small values)')));

    function update() {
      const m = st.mode, fw = 1.31e6 / st.Q, slope = 1.299 / fw;
      const S = fr => fr / Math.sqrt(fr * fr + (st.bw * 1e3) ** 2);
      const I = 0.9 * st.tap * 1e-6, B_ = st.bw * 1e3, sigI = Math.sqrt(2 * 1.602e-19 * I * B_ + (st.ain * 1e-12) ** 2 * B_);
      const lock = [
        { n: 'Heater DAC quantisation', v: st.hRange * 1000 / Math.pow(2, st.dacBits) / 2 * (st.vdac ? 2 : 1) },
        { n: 'Monitor ADC quantisation', v: (0.5 / Math.pow(2, st.adcBits)) / st.adcFS / slope },
        { n: 'Monitor PD noise (3σ)', v: 3 * sigI / I / slope },
        { n: 'Thermal crosstalk residual', v: st.xtk / 100 * st.xtStep * S(1 / (2 * Math.PI * st.tau * 1e-6)), det: 1 },
        { n: 'ASIC thermal residual', v: st.dist * S(st.distF), det: 1 },
        { n: 'Dither amplitude', v: st.dith, det: 1 }
      ];
      const rl = stackChart(svgL, lock, m, 'pm', { dec: 2 });
      const dt = rl.active, pen = 10 * Math.log10(1 + (2 * dt / fw) ** 2);
      resL.innerHTML = 'Residual ±' + dt.toFixed(1) + ' pm vs FWHM ' + fw.toFixed(0) + ' pm → power penalty <span class="' + (pen > 0.5 ? 'bd-fail' : 'bd-pass') + '">' + pen.toFixed(3) + ' dB</span>';
      const xs = []; for (let i = 0; i <= 160; i++) xs.push(-2 * fw + 4 * fw * i / 160);
      plot(svgLz, { W: 600, H: 220, x: { min: -2 * fw, max: 2 * fw, label: 'detuning δ (pm)' }, y: { min: 0, max: 1.05, label: 'drop T' }, series: [{ pts: xs.map(x => [x, 1 / (1 + (2 * x / fw) ** 2)]), color: 'var(--accent2)', label: 'Lorentzian, Q=' + st.Q }],
        bands: [{ x: [-dt, dt], color: 'var(--warn)', op: 0.25 }], points: [{ x: dt, y: 1 / (1 + (2 * dt / fw) ** 2), color: 'var(--warn)', label: '−' + pen.toFixed(2) + ' dB' }] });
      const tItems = [{ n: 'Sensor accuracy', v: st.tAcc }, { n: 'Sensor→hot-spot offset', v: st.tGrad, det: 1 }, { n: 'ADC quantisation', v: st.tQ }];
      const rt = stackChart(svgT, tItems, m, '°C', { dec: 2 });
      const pItems = [{ n: 'Voltage telemetry', v: st.vAcc }, { n: 'Current telemetry', v: st.iAcc }];
      const rp = stackChart(svgP, pItems, m, '%', { dec: 2 });
      resT.innerHTML = 'Throttle set-point = ' + st.tjMax + ' − ' + rt.active.toFixed(1) + ' = <b>' + (st.tjMax - rt.active).toFixed(1) + ' °C</b> (headroom lost to sensing). Power telemetry ±' + rp.active.toFixed(2) + ' % = ±' + (st.pRef * rp.active / 100).toFixed(1) + ' W at ' + st.pRef + ' W.';
      const vItems = [{ n: 'Setpoint tolerance', v: st.vnom * st.tol / 100 }, { n: 'Ripple (½ p-p)', v: st.ripple / 2 }, { n: 'Load-step droop ΔI·Z', v: st.dI * st.zt, det: 1 }, { n: 'IR drop', v: st.ir, det: 1 }];
      const avail = st.vnom - st.vmin;
      const rv = stackChart(svgV, vItems, m, 'mV', { dec: 1, limit: Math.max(avail, 0.1), limitLabel: 'V_nom − V_min = ' + avail.toFixed(0) + ' mV' });
      const vneed = st.vmin + rv.active, dp = (Math.pow(st.vnom / vneed, 2) - 1) * 100;
      resV.innerHTML = 'Remaining margin <span class="' + (avail - rv.active < 0 ? 'bd-fail' : 'bd-pass') + '">' + sg(avail - rv.active, 1) + ' mV</span>. Minimum safe V_nom ≈ ' + vneed.toFixed(0) + ' mV → ' + (dp >= 0 ? 'lowering V_nom to it saves ' + dp.toFixed(1) + ' % dynamic power (∝V²).' : 'need +' + (-dp).toFixed(1) + ' % dynamic power to be safe.');
      const aItems = [{ n: 'PD calibration', v: st.aCal }, { n: 'Temp tracking', v: st.aTrk }, { n: 'Aging / EOL', v: st.aAge, det: 1 }, { n: 'Splitter imbalance', v: st.aSplit }, { n: 'Connector repeatability', v: st.aConn }];
      const ra = stackChart(svgA, aItems, m, 'dB', { dec: 2 });
      const lm = shared.margin;
      resA.innerHTML = 'Laser power uncertainty ±' + ra.active.toFixed(2) + ' dB. Optical link margin (tab 1) ' + sg(lm, 2) + ' dB → after APC uncertainty <span class="' + (lm - ra.active < 0 ? 'bd-fail' : 'bd-pass') + '">' + sg(lm - ra.active, 2) + ' dB</span>.';
      levers(lev, '<b>What dominates:</b> lock → ' + rl.big.n + ' (±' + Math.abs(rl.big.v).toFixed(1) + ' pm); VRM → ' + rv.big.n + ' (' + Math.abs(rv.big.v).toFixed(1) + ' mV); APC → ' + ra.big.n + '. Switching combination rule changes the lock residual from ±' + rl.tot.rss.toFixed(1) + ' (RSS) to ±' + rl.tot.wc.toFixed(1) + ' pm (worst case).' +
        '<br><b>Design levers:</b> feed-forward thermal-crosstalk decoupling between rings, faster lock loop (bounded by monitor-PD noise and heater τ), more DAC bits or current-mode heater drive, sensor placement next to the hot-spot + per-part calibration, lower PDN impedance (decaps, more VRM phases, faster control) to shrink droop instead of raising V_nom, APC calibration at test.');
    }
    update();
  }

  // ================================================================ TAB 6: jitter
  const jitSt = { baud: 106.25, mod: 'pam4', rjTx: 120, rjRx: 100, rjXt: 50, dcd: 0.25, isi: 0.6, buj: 0.35, pj: 0.3, pml: 0.4, ber: 2.4e-4 };
  function tabJitter(body) {
    const st = jitSt;
    const sl = (k, o) => slider(st, k, o, update);
    const modSeg = seg([{ v: 'pam4', l: 'PAM4' }, { v: 'nrz', l: 'NRZ' }], st.mod, v => { st.mod = v; update(); });
    const berSel = berSelect(st, 'ber', [1e-12, 1e-9, 1e-6, 2.4e-4], () => update());
    const ctrl = h('div', { class: 'card' },
      h('div', { class: 'bd-row' }, h('b', null, 'Modulation'), modSeg),
      sl('baud', { label: 'Symbol rate', min: 25, max: 230, step: 0.25, unit: 'GBd', badge: 'typ' }),
      h('div', { class: 'slider-row bd-sl' }, h('label', null, 'Target BER'), berSel, h('span')),
      grp('Random jitter (rms, RSS)'),
      sl('rjTx', { label: 'Tx PLL / clock RJ', min: 0, max: 400, step: 5, unit: 'fs', badge: 'typ' }),
      sl('rjRx', { label: 'Rx CDR / sampling RJ', min: 0, max: 400, step: 5, unit: 'fs', badge: 'typ' }),
      sl('rjXt', { label: 'Noise-induced RJ', min: 0, max: 300, step: 5, unit: 'fs', badge: 'est' }),
      grp('Deterministic jitter (dual-Dirac, linear)'),
      sl('dcd', { label: 'DCD', min: 0, max: 2, step: 0.05, unit: 'ps', badge: 'est' }),
      sl('isi', { label: 'Residual ISI after EQ', min: 0, max: 3, step: 0.05, unit: 'ps', badge: 'est' }),
      sl('buj', { label: 'BUJ / crosstalk', min: 0, max: 2, step: 0.05, unit: 'ps', badge: 'est' }),
      sl('pj', { label: 'Periodic jitter (PJ)', min: 0, max: 2, step: 0.05, unit: 'ps', badge: 'est' }),
      sl('pml', { label: 'PAM4 multi-level transition DJ', min: 0, max: 2, step: 0.05, unit: 'ps', badge: 'est' }));
    const kUI = kpi('Unit interval'), kTJ = kpi('Total jitter @ BER'), kEW = kpi('Eye width'), kQ = kpi('Q(BER)');
    const svgB = s('svg', { class: 'bd-svg' }), svgU = s('svg', { class: 'bd-svg' }), eye = mkCanvas(640, 260), lev = h('div', { class: 'callout bd-levers' });
    const right = h('div', { class: 'card' }, h('div', { class: 'bd-kpis' }, kUI, kTJ, kEW, kQ),
      h('h3', null, 'Jitter budget across one UI'), svgU,
      h('h3', null, 'Bathtub curve'), svgB,
      h('h3', null, 'Live eye (2 UI, persistence)'), eye.c, lev);
    body.appendChild(h('div', { class: 'bd-layout' }, ctrl, right));
    body.appendChild(h('div', { class: 'card bd-expl', style: 'margin-top:16px' }, h('h3', null, 'Equations'),
      eq('UI = 1 / baud            (106.25 GBd → 9.412 ps;  bit rate = 2 × baud for PAM4)\nRJ_rms = √(Σ RJᵢ²)        DJ_δδ = Σ DJᵢ   (dual-Dirac model)\nTJ(BER) = DJ_δδ + 2·Q_BER·RJ_rms ,  Q_BER = Q⁻¹(BER)   (7.03 @1e-12 · 3.49 @2.4e-4)\nEye width = UI − TJ\nBathtub: BER(t) ≈ Q((t − DJ/2)/σ) + Q((UI − t − DJ/2)/σ)'),
      h('p', { html: 'Strictly, the dual-Dirac Q uses BER/ρ_T (transition density); it is omitted here for clarity. With KP4 FEC the jitter budget only needs to close at the <b>pre-FEC</b> BER (~1e-4…1e-6), not 1e-12 — this halves the RJ multiplier. PAM4 at the same bit rate halves the baud (doubles the UI) but each sub-eye is narrower due to multi-level transitions.' })));
    let P = null;
    function update() {
      const UI = 1000 / st.baud, rj = Math.sqrt(st.rjTx ** 2 + st.rjRx ** 2 + st.rjXt ** 2) / 1000;
      const djs = [['DCD', st.dcd], ['ISI', st.isi], ['BUJ', st.buj], ['PJ', st.pj]]; if (st.mod === 'pam4') djs.push(['PAM4 trans.', st.pml]);
      const dj = djs.reduce((a, b) => a + b[1], 0), q = Qinv(st.ber), tj = dj + 2 * q * rj, ew = UI - tj;
      P = { UI, rj, dj, tj };
      kUI.set(UI.toFixed(3) + ' ps', null, (st.mod === 'pam4' ? 2 * st.baud : st.baud).toFixed(1) + ' Gb/s');
      kTJ.set(tj.toFixed(2) + ' ps', null, (tj / UI * 1000).toFixed(0) + ' mUI (DJ ' + dj.toFixed(2) + ' + 2Q·RJ ' + (2 * q * rj).toFixed(2) + ')');
      kEW.set(ew.toFixed(2) + ' ps', ew <= 0 ? 'bad' : ew / UI < 0.3 ? 'warn' : 'good', (ew / UI * 1000).toFixed(0) + ' mUI open');
      kQ.set(q.toFixed(2), null, 'RJ_rms = ' + (rj * 1000).toFixed(0) + ' fs');
      // budget bar
      const W = 700, H = 70; svgU.setAttribute('viewBox', '0 0 ' + W + ' ' + H); clear(svgU);
      const X = v => 10 + v / Math.max(UI, tj) * (W - 20);
      let acc = 0; const segs = djs.map(d => [d[0], d[1], 'var(--warn)']).concat([['2Q·RJ', 2 * q * rj, 'var(--accent2)']]);
      segs.forEach(([n, v, c], i) => { svgU.appendChild(s('rect', { x: X(acc), y: 12, width: Math.max(0, X(acc + v) - X(acc)), height: 26, style: 'fill:' + c + ';opacity:' + (0.5 + 0.1 * (i % 4)) + ';stroke:var(--bg)' })); if (X(acc + v) - X(acc) > 34) svgU.appendChild(s('text', { x: (X(acc) + X(acc + v)) / 2, y: 29, 'text-anchor': 'middle', class: 'bd-lbl' }, n)); acc += v; });
      if (ew > 0) { svgU.appendChild(s('rect', { x: X(acc), y: 12, width: X(UI) - X(acc), height: 26, style: 'fill:var(--good);opacity:.25' })); svgU.appendChild(s('text', { x: (X(acc) + X(UI)) / 2, y: 29, 'text-anchor': 'middle', class: 'bd-lbl' }, 'eye opening ' + ew.toFixed(2) + ' ps')); }
      svgU.appendChild(s('line', { x1: X(UI), x2: X(UI), y1: 4, y2: 46, style: 'stroke:var(--text);stroke-width:2' }));
      svgU.appendChild(s('text', { x: X(UI), y: 60, 'text-anchor': 'end' }, '1 UI = ' + UI.toFixed(2) + ' ps'));
      const xs = []; for (let i = 0; i <= 300; i++) xs.push(UI * i / 300);
      const sig = Math.max(rj, 1e-6);
      plot(svgB, { W: 700, H: 260, x: { min: 0, max: UI, label: 'sampling instant (ps)' }, y: { min: 1e-16, max: 1, log: true, maxTicks: 8, label: 'BER' },
        series: [{ pts: xs.map(t => [t, Math.min(0.5, Q((t - dj / 2) / sig) + Q((UI - t - dj / 2) / sig))]), color: 'var(--data)', w: 2.5 }],
        hlines: [{ y: st.ber, color: 'var(--sense)', label: 'target ' + fmt(st.ber) }],
        bands: ew > 0 ? [{ x: [tj / 2, UI - tj / 2], color: 'var(--good)', op: 0.15 }] : [] });
      const big = segs.slice().sort((a, b) => b[1] - a[1])[0];
      levers(lev, '<b>What dominates:</b> ' + big[0] + ' (' + big[1].toFixed(2) + ' ps = ' + (big[1] / UI * 1000).toFixed(0) + ' mUI). At ' + st.baud + ' GBd a UI is only ' + UI.toFixed(2) + ' ps, so 100 fs of RJ costs ' + (2 * q * 0.1).toFixed(2) + ' ps of eye at this BER.' +
        '<br><b>Design levers:</b> low-phase-noise PLL/reference clock (RJ), CDR bandwidth (tracks low-frequency PJ), equalization (ISI), DCD calibration, crosstalk isolation in package/substrate (CPO shortens the electrical channel — part of the "63× signal integrity" claim ' + B('nv') + '), and closing the budget at pre-FEC BER thanks to KP4.');
    }
    update();
    function drawEye() {
      const g = eye.ctx, W = eye.w, H = eye.h, UI = P.UI, lv = st.mod === 'pam4' ? 4 : 2;
      g.globalAlpha = 0.14; g.fillStyle = cssv('--bg'); g.fillRect(0, 0, W, H); g.globalAlpha = 1;
      g.strokeStyle = cssv('--accent2'); g.lineWidth = 1; g.globalAlpha = 0.5;
      const Xp = t => t / (2 * UI) * W, Yl = v => 20 + (1 - v / (lv - 1)) * (H - 40), tau = 0.3 * UI / 2.197;
      const djTot = P.dj;
      for (let k = 0; k < 10; k++) {
        const syms = [], edges = [];
        for (let i = 0; i < 5; i++) { syms.push(Math.floor(Math.random() * lv)); edges.push((i - 0.5) * UI + P.rj * C.randn() + (Math.random() < 0.5 ? -1 : 1) * djTot / 2); }
        g.beginPath();
        for (let i = 0; i <= 120; i++) {
          const t = -0.1 * UI + 2.2 * UI * i / 120; let v = syms[0];
          for (let e = 1; e < 5; e++) v += (syms[e] - syms[e - 1]) * 0.5 * (1 + Math.tanh((t - edges[e]) / tau));
          const y = Yl(v) + C.randn() * 1.2; i ? g.lineTo(Xp(t), y) : g.moveTo(Xp(t), y);
        }
        g.stroke();
      }
      g.globalAlpha = 1;
      g.fillStyle = 'rgba(255,77,94,.10)';
      [0.5, 1.5].forEach(c => g.fillRect(Xp(c * UI - P.tj / 2), 0, Xp(P.tj), H));
      g.fillStyle = cssv('--muted'); g.font = '11px ' + cssv('--mono'); g.fillText('red bands = TJ @ target BER', 8, H - 6);
    }
    let stop = null;
    if (RM) drawEye(); else stop = C.loop(() => { if (P) drawEye(); });
    return () => { if (stop) stop(); };
  }

  // ================================================================ section shell
  const TABS = [
    { id: 'link', label: 'Optical link budget', icon: '🔦', build: tabLink },
    { id: 'fec', label: 'BER / FEC', icon: '🧮', build: tabFec },
    { id: 'power', label: 'Power budget', icon: '⚡', build: tabPower },
    { id: 'thermal', label: 'Thermal budget', icon: '🌡️', build: tabThermal },
    { id: 'accuracy', label: 'Accuracy / control', icon: '🎯', build: tabAccuracy },
    { id: 'jitter', label: 'Jitter / timing', icon: '⏱️', build: tabJitter }
  ];
  let bodyEl = null, tabEls = [], curTab = null, tabClean = null;
  function showTab(sub) {
    if (!bodyEl) return;
    const t = TABS.find(x => x.id === sub) || TABS[0];
    if (t === curTab) return;
    if (tabClean) { try { tabClean(); } catch (e) { console.error(e); } tabClean = null; }
    curTab = t;
    tabEls.forEach(el => el.classList.toggle('active', el.dataset.tab === t.id));
    clear(bodyEl);
    try { const r = t.build(bodyEl); tabClean = typeof r === 'function' ? r : null; }
    catch (e) { console.error(e); bodyEl.appendChild(h('div', { class: 'callout warn' }, 'Tab failed: ' + e.message)); }
    C.linkify(bodyEl);
  }
  C.registerSection({
    id: 'budgets', title: 'System Budgets', icon: '📊', order: 50,
    render(container, sub) {
      curTab = null; tabClean = null;
      container.appendChild(h('div', { class: 'bd-head' }, h('div', null, h('h1', null, '📊 System Budgets'),
        h('p', { class: 'h-sub', html: 'Every CPO switch closes six budgets at once: optical power, error rate, electrical power, temperature, control accuracy and timing. Move the sliders — the physics updates live. Numbers are ' + B('typ') + ' or ' + B('est') + ' unless marked ' + B('nv') + '.' }))));
      tabEls = TABS.map(t => h('div', { class: 'tab', 'data-tab': t.id, onclick: () => C.go('budgets/' + t.id) }, h('span', null, t.icon), t.label));
      container.appendChild(h('div', { class: 'tabs bd-tabs' }, tabEls));
      bodyEl = h('div', { class: 'bd-body' }); container.appendChild(bodyEl);
      showTab(sub);
      return () => { if (tabClean) { try { tabClean(); } catch (e) { console.error(e); } } tabClean = null; curTab = null; bodyEl = null; };
    },
    onSubRoute(sub) { showTab(sub); }
  });
})();
