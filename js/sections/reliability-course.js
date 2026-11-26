/* Reliability Statistics course: Weibull, FIT roll-ups, acceleration models, test planning, Weibull fitting,
   laser aging extrapolation and system availability, with interactive tools. Uses js/course-engine.js. */
(function () {
  'use strict';
  const C = window.CPO;
  const h = C.h, B = C.badge, CE = C.course;
  const fx = CE.fact;
  const num = (n, d) => (d == null ? Math.round(n).toLocaleString('en-US') : n.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d }));

  C.addGlossary({
    'Weibull': { full: 'Weibull distribution', def: 'Flexible life distribution with shape β (β<1 early failures, β=1 random, β>1 wear-out) and scale η (the age by which 63.2 % have failed).', cat: 'test' },
    'B10 life': { full: 'B10 life', def: 'Age by which 10 % of a population is expected to have failed.', cat: 'test' },
    'AF': { full: 'Acceleration factor', def: 'How much faster a failure mechanism progresses under test stress than in use.', cat: 'test' },
    'Availability': { full: 'Availability', def: 'Fraction of time a system is working: MTBF / (MTBF + MTTR).', cat: 'test' }
  });

  // ---------------- maths helpers
  function normInv(p) { // Acklam's approximation
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239], b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572], c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783], d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
    const pl = 0.02425; let q, r;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - pl) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    q = p - 0.5; r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  function chi2Inv(p, k) { const z = normInv(p), x = 2 / (9 * k); return k * Math.pow(1 - x + z * Math.sqrt(x), 3); } // Wilson–Hilferty

  function plot(o) { // { w,h, xmin,xmax, ymin,ymax, xlog, ylog, series:[{pts,color,dash,w}], xlab, ylab, title, marks:[{x,label,color}], hlines:[{y,label,color}] }
    const W = o.w || 560, H = o.h || 240, x0 = 52, x1 = W - 12, y0 = 28, y1 = H - 34;
    const tx = v => o.xlog ? Math.log10(v) : v, ty = v => o.ylog ? Math.log10(v) : v;
    const X = v => x0 + (tx(v) - tx(o.xmin)) / (tx(o.xmax) - tx(o.xmin)) * (x1 - x0), Y = v => y1 - (ty(v) - ty(o.ymin)) / (ty(o.ymax) - ty(o.ymin)) * (y1 - y0);
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;background:#05070a;border:1px solid var(--line);border-radius:10px">';
    if (o.title) s += '<text x="10" y="18" fill="#e6edf5" font-size="12.5" font-weight="700">' + o.title + '</text>';
    s += '<rect x="' + x0 + '" y="' + y0 + '" width="' + (x1 - x0) + '" height="' + (y1 - y0) + '" fill="none" stroke="#243042"/>';
    (o.xt || []).forEach(v => { s += '<line x1="' + X(v) + '" y1="' + y0 + '" x2="' + X(v) + '" y2="' + y1 + '" stroke="#243042" stroke-dasharray="2 4"/><text x="' + X(v) + '" y="' + (y1 + 14) + '" text-anchor="middle" fill="#8a99ad" font-size="10.5">' + (o.xf ? o.xf(v) : v) + '</text>'; });
    (o.yt || []).forEach(v => { s += '<line x1="' + x0 + '" y1="' + Y(v) + '" x2="' + x1 + '" y2="' + Y(v) + '" stroke="#243042" stroke-dasharray="2 4"/><text x="' + (x0 - 5) + '" y="' + (Y(v) + 4) + '" text-anchor="end" fill="#8a99ad" font-size="10.5">' + (o.yf ? o.yf(v) : v) + '</text>'; });
    (o.hlines || []).forEach(l => { s += '<line x1="' + x0 + '" y1="' + Y(l.y) + '" x2="' + x1 + '" y2="' + Y(l.y) + '" stroke="' + l.color + '" stroke-dasharray="6 4"/><text x="' + (x1 - 4) + '" y="' + (Y(l.y) - 4) + '" text-anchor="end" fill="' + l.color + '" font-size="11">' + l.label + '</text>'; });
    (o.marks || []).forEach(m => { s += '<line x1="' + X(m.x) + '" y1="' + y0 + '" x2="' + X(m.x) + '" y2="' + y1 + '" stroke="' + m.color + '" stroke-dasharray="4 4"/><text x="' + (X(m.x) + 4) + '" y="' + (y0 + 12) + '" fill="' + m.color + '" font-size="11">' + m.label + '</text>'; });
    o.series.forEach(se => { const pts = se.pts.filter(p => isFinite(p[1]) && (!o.ylog || p[1] > 0) && (!o.xlog || p[0] > 0)); if (se.dots) pts.forEach(p => { s += '<circle cx="' + X(p[0]).toFixed(1) + '" cy="' + Y(C.clamp(p[1], o.ymin, o.ymax)).toFixed(1) + '" r="4" fill="' + se.color + '"/>'; }); else s += '<path d="' + pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(C.clamp(p[1], o.ymin, o.ymax)).toFixed(1)).join(' ') + '" fill="none" stroke="' + se.color + '" stroke-width="' + (se.w || 2.5) + '"' + (se.dash ? ' stroke-dasharray="' + se.dash + '"' : '') + '/>'; });
    if (o.xlab) s += '<text x="' + ((x0 + x1) / 2) + '" y="' + (H - 4) + '" text-anchor="middle" fill="#8a99ad" font-size="11">' + o.xlab + '</text>';
    if (o.ylab) s += '<text x="12" y="' + ((y0 + y1) / 2) + '" fill="#8a99ad" font-size="11" transform="rotate(-90 12 ' + ((y0 + y1) / 2) + ')" text-anchor="middle">' + o.ylab + '</text>';
    return s + '</svg>';
  }

  // ---------------- pages
  function pBasics(p) {
    const bt = plot({ w: 900, h: 260, xmin: 0, xmax: 10, ymin: 0, ymax: 3, title: 'the bathtub curve: failure rate over a product\'s life', xlab: 'age (years)', ylab: 'failure rate',
      xt: [0, 2, 4, 6, 8, 10], yt: [], series: [{ pts: Array.from({ length: 201 }, (_, i) => { const t = 0.02 + i * 0.05; return [t, 0.4 * Math.pow(t, -0.6) * 0.5 + 0.45 + 0.02 * Math.pow(t / 6, 6) * 30]; }), color: '#76b900' }],
      marks: [{ x: 0.6, label: 'infant mortality', color: '#ff4d5e' }, { x: 3.5, label: 'useful life (random failures)', color: '#22d3ee' }, { x: 7.6, label: 'wear-out', color: '#f5b301' }] });
    p.appendChild(h('div', { class: 'card', html: bt }));
    p.appendChild(h('table', { class: 'table', style: 'margin-top:12px', html: '<tr><th>Term</th><th>Meaning</th><th>Example</th></tr>' +
      '<tr><td><b>R(t)</b> reliability</td><td>probability a unit still works at age t</td><td>R(5 years) = 0.98</td></tr>' +
      '<tr><td><b>λ(t)</b> failure (hazard) rate</td><td>failures per unit time among survivors</td><td>the bathtub above</td></tr>' +
      '<tr><td><b>FIT</b></td><td>failures per 10⁹ device-hours (constant-rate assumption)</td><td>100 FIT ≈ 1 failure per 10⁷ hours</td></tr>' +
      '<tr><td><b>MTBF / MTTF</b></td><td>mean time between (or to) failures = 10⁹ / FIT hours</td><td>100 FIT → 10⁷ h ≈ 1,140 years</td></tr>' +
      '<tr><td><b>B10</b></td><td>age by which 10 % have failed</td><td>B10 = 8 years</td></tr>' +
      '<tr><td><b>Fleet failures/year</b></td><td>FIT × N × 8,760 / 10⁹</td><td>100 FIT × 100,000 × 8,760 / 10⁹ ≈ 88 per year</td></tr>' }));
    p.appendChild(h('div', { class: 'callout', html: '<b>Key insight:</b> MTBF is not "how long one unit lasts". 1,000 years MTBF still means about 88 failures per year in a 100,000-unit fleet. At AI-factory scale, rare failures are daily events.' }));
  }

  function pWeibull(p) {
    CE.sliders(p, 'Weibull life distribution', [['beta', 'Shape β', 0.3, 6, 0.05, 2.5, ''], ['eta', 'Scale η (characteristic life)', 1, 50, 0.5, 15, 'years']], (v, el) => {
      const R = t => Math.exp(-Math.pow(t / v.eta, v.beta)), hz = t => v.beta / v.eta * Math.pow(t / v.eta, v.beta - 1);
      const b10 = v.eta * Math.pow(-Math.log(0.9), 1 / v.beta), b1 = v.eta * Math.pow(-Math.log(0.99), 1 / v.beta);
      const tmax = Math.max(10, Math.min(60, v.eta * 2.2)), pts = n => Array.from({ length: 201 }, (_, i) => { const t = tmax * (i + 0.5) / 201; return [t, n(t)]; });
      const hzMax = Math.max(...pts(hz).map(p => p[1]).slice(5)) * 1.1;
      const kind = v.beta < 0.95 ? 'decreasing failure rate: <b>infant mortality</b> (weak units fail early, so screening/burn-in helps)' : v.beta < 1.1 ? 'constant failure rate: <b>random failures</b> (the FIT model is valid)' : 'increasing failure rate: <b>wear-out</b> (plan replacement before it rises)';
      el.innerHTML = '<div class="af-out">' + fx(num(b1, 2) + ' y', 'B1 life (1 % failed)', null) + fx(num(b10, 2) + ' y', 'B10 life (10 % failed)', null) + fx((100 * (1 - R(5))).toFixed(2) + ' %', 'failed by 5 years', null) + '</div>' +
        plot({ xmin: 0, xmax: tmax, ymin: 0, ymax: 1, title: 'reliability R(t)', xlab: 'years', xt: [0, tmax / 4, tmax / 2, 3 * tmax / 4, tmax].map(x => +x.toFixed(0)), yt: [0, 0.5, 1], series: [{ pts: pts(R), color: '#76b900' }], marks: [{ x: b10, label: 'B10', color: '#f5b301' }] }) +
        '<div style="height:8px"></div>' + plot({ xmin: 0, xmax: tmax, ymin: 0, ymax: hzMax, title: 'failure (hazard) rate λ(t)', xlab: 'years', xt: [0, tmax / 4, tmax / 2, 3 * tmax / 4, tmax].map(x => +x.toFixed(0)), yt: [], series: [{ pts: pts(hz), color: '#ff6b3d' }] }) +
        '<div class="callout">β = ' + v.beta + ': ' + kind + '. η is the age by which 63.2 % of units have failed.</div>';
    }, 'R(t) = exp[−(t/η)^β] · λ(t) = (β/η)(t/η)^(β−1)');
  }

  function pFit(p) {
    const parts = [['External laser source (each)', 4, 300], ['Optical engine (each)', 8, 150], ['Front-panel fiber connector (each)', 36, 10], ['Switch ASIC', 1, 200], ['VRM / power stage (each)', 12, 50], ['PSU (each)', 2, 500], ['Fan / pump (each)', 6, 400], ['BMC / CPU board', 1, 300], ['Other (passives, solder, PCB)', 1, 300]];
    const rows = parts.map(([n, q, f]) => ({ n, q: h('input', { type: 'number', min: 0, value: q, style: 'width:70px' }), f: h('input', { type: 'number', min: 0, value: f, style: 'width:90px' }) }));
    const fleet = h('input', { type: 'number', min: 1, value: 2000, style: 'width:100px' });
    const tbl = h('table', { class: 'table' }, h('tr', null, h('th', null, 'Component'), h('th', null, 'Qty per switch'), h('th', { html: 'FIT each ' + B('est') }), h('th', null, 'FIT total')));
    const outs = rows.map(r => { const o = h('td', { style: 'font-family:var(--mono)' }); tbl.appendChild(h('tr', null, h('td', null, r.n), h('td', null, r.q), h('td', null, r.f), o)); [r.q, r.f].forEach(e => e.addEventListener('input', upd)); return o; });
    fleet.addEventListener('input', upd);
    const res = h('div');
    p.appendChild(h('div', { class: 'af-calc' }, h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, 'FIT roll-up for one switch'), tbl, h('div', { class: 'slider-row' }, h('label', null, 'Switches in the fleet'), fleet, h('span'))), h('div', { class: 'card' }, res)));
    function upd() {
      const items = rows.map((r, i) => { const t = (+r.q.value || 0) * (+r.f.value || 0); outs[i].textContent = num(t); return [r.n, t]; });
      const tot = items.reduce((a, x) => a + x[1], 0), N = +fleet.value || 1, mtbf = 1e9 / tot, perYear = tot * N * 8760 / 1e9;
      const sorted = items.slice().sort((a, b) => b[1] - a[1]), mx = sorted[0][1] || 1;
      res.innerHTML = '<div class="af-out">' + fx(num(tot), 'FIT per switch', null) + fx(num(mtbf / 8760, 1) + ' y', 'MTBF per switch', null) + fx(num(perYear, 1), 'switch failures per year in the fleet', null) + '</div>' +
        '<div class="af-bars">' + sorted.map(([n, t]) => '<div class="af-hbar"><span style="font-size:12px">' + n.replace(/ \(each\)/, '') + '</span><div class="tr"><i style="width:' + (100 * t / mx).toFixed(1) + '%;background:var(--optic)"></i></div><output>' + (100 * t / tot).toFixed(0) + ' %</output></div>').join('') + '</div>' +
        '<div class="callout">The bars are a <b>Pareto chart</b> of where the failures come from. Attack the top bars first (see Case Studies & Pareto). All FIT values here are illustrative placeholders: use supplier data and your own field data.</div>';
      C.linkify(res);
    }
    upd();
  }

  function pAccel(p) {
    CE.sliders(p, 'Arrhenius: temperature acceleration', [['ea', 'Activation energy Ea', 0.3, 1.2, 0.05, 0.7, 'eV', 'typ'], ['tu', 'Use temperature', 25, 90, 1, 55, '°C'], ['ts', 'Stress temperature', 60, 150, 1, 85, '°C'], ['hrs', 'Test duration', 100, 5000, 100, 2000, 'h']], (v, el) => {
      const k = 8.617e-5, AF = Math.exp(v.ea / k * (1 / (v.tu + 273.15) - 1 / (v.ts + 273.15)));
      const eq = v.hrs * AF, y10 = Math.exp(v.ea / k * (1 / (v.tu + 273.15) - 1 / (v.tu + 10 + 273.15)));
      el.innerHTML = '<div class="af-out">' + fx(num(AF, 1) + '×', 'acceleration factor', null) + fx(num(eq) + ' h', 'equivalent use hours', null) + fx(num(eq / 8760, 2) + ' y', 'equivalent use years', null) + fx(num(y10, 2) + '×', 'faster aging if use is 10 °C hotter', null) + '</div>' +
        '<div class="eq">AF = exp[ (Ea / k) · (1/T_use − 1/T_stress) ]     T in kelvin, k = 8.617e-5 eV/K</div>' +
        '<div class="callout">A higher Ea means the mechanism is more temperature-sensitive: more acceleration in test, and more benefit from running cooler in use. Ea values come from the specific failure mechanism (supplier data). Using the wrong Ea is a classic way to over- or under-estimate life.</div>';
    });
    p.appendChild(h('div', { style: 'height:14px' }));
    CE.sliders(p, 'Coffin-Manson: thermal-cycling fatigue', [['dtu', 'Field temperature swing ΔT', 5, 60, 1, 20, '°C'], ['dts', 'Test cycle swing ΔT', 40, 165, 5, 100, '°C'], ['n', 'Fatigue exponent n', 1.5, 4, 0.1, 2.5, '', 'typ'], ['cpd', 'Field cycles per day', 0.5, 20, 0.5, 3, '']], (v, el) => {
      const AF = Math.pow(v.dts / v.dtu, v.n), need = 10 * 365 * v.cpd / AF;
      el.innerHTML = '<div class="af-out">' + fx(num(AF, 1) + '×', 'acceleration per cycle', null) + fx(num(10 * 365 * v.cpd), 'field cycles in 10 years', null) + fx(num(need), 'test cycles equivalent to 10 years', null) + '</div>' +
        '<div class="eq">AF = (ΔT_test / ΔT_field)^n       N_fail ∝ ΔT^(−n)</div>' +
        '<div class="callout">Load cycles in AI training (jobs starting and stopping) are thermal cycles too: every one bends the package a little. Count them in the field profile; they matter for solder joints, TIM pump-out and fiber attach.</div>';
    });
  }

  function pDemo(p) {
    CE.sliders(p, 'What can a reliability test prove?', [['n', 'Units on test', 5, 500, 5, 77, ''], ['hrs', 'Test hours per unit', 100, 5000, 100, 1000, 'h'], ['af', 'Acceleration factor', 1, 200, 1, 30, ''], ['r', 'Failures observed', 0, 10, 1, 0, ''], ['cl', 'Confidence level', 50, 95, 5, 60, '%']], (v, el) => {
      const T = v.n * v.hrs * v.af, chi = chi2Inv(v.cl / 100, 2 * v.r + 2), lam = chi / (2 * T), FIT = lam * 1e9;
      const succN = Math.ceil(Math.log(1 - v.cl / 100) / Math.log(0.9));
      el.innerHTML = '<div class="af-out">' + fx(num(T / 1e6, 2) + ' M', 'equivalent device-hours', null) + fx(num(FIT) + ' FIT', 'demonstrated upper bound', null) + fx(num(1e9 / FIT / 8760, 0) + ' y', 'demonstrated MTBF (lower bound)', null) + '</div>' +
        '<div class="eq">λ_upper = χ²(CL; 2r + 2) / (2 · T_equivalent)      (constant-rate model)</div>' +
        '<div class="callout">With zero failures at ' + v.cl + ' % confidence you have shown "no worse than ' + num(FIT) + ' FIT". To show lower FIT you need <b>more device-hours</b> (more units, longer tests, or more acceleration, as long as the acceleration model is valid). Each failure you see raises the bound. Success-run rule: to show 90 % reliability at ' + v.cl + ' % confidence with zero failures, test <b>' + succN + ' units</b> through the full life (or its accelerated equivalent).</div>';
    }, 'Chi-square quantile via the Wilson–Hilferty approximation ' + B('est') + '.');
  }

  function pWfit(p) {
    const ta = h('textarea', { rows: 6, style: 'width:100%;background:var(--panel2);color:var(--text);border:1px solid var(--line);border-radius:8px;font-family:var(--mono);padding:8px' });
    ta.value = '2100, 3400, 4100, 5200, 6100, 7300, 8800';
    const sus = h('input', { type: 'number', min: 0, value: 13, style: 'width:80px' });
    const res = h('div');
    p.appendChild(h('div', { class: 'af-calc' }, h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, 'Your failure data'), h('p', { class: 'muted', style: 'font-size:13px' }, 'Failure times (hours or cycles), separated by commas. Example: laser burn-in to an end-of-life criterion.'), ta, h('div', { class: 'slider-row' }, h('label', null, 'Units still running at the end (suspensions)'), sus, h('span')), h('p', { class: 'muted', style: 'font-size:12.5px', html: 'Median ranks (Benard) with suspensions handled by Johnson\'s adjusted-rank method; least-squares fit on Weibull axes ' + B('est') + '.' })), h('div', { class: 'card' }, res)));
    function upd() {
      const fails = ta.value.split(/[,\s;]+/).map(Number).filter(x => x > 0).sort((a, b) => a - b), s = Math.max(0, Math.round(+sus.value || 0));
      if (fails.length < 2) { res.innerHTML = '<div class="callout warn">Enter at least two failure times.</div>'; return; }
      const tmax = fails[fails.length - 1], all = fails.map(t => ({ t, f: true })).concat(Array.from({ length: s }, () => ({ t: tmax * 1.0001, f: false })));
      const N = all.length; let prev = 0; const pts = [];
      all.forEach((u, i) => { if (!u.f) return; const rev = N - i; const inc = (N + 1 - prev) / (1 + rev); const r = prev + inc; prev = r; const F = (r - 0.3) / (N + 0.4); pts.push([Math.log(u.t), Math.log(-Math.log(1 - F)), u.t, F]); });
      const n = pts.length, mx = pts.reduce((a, q) => a + q[0], 0) / n, my = pts.reduce((a, q) => a + q[1], 0) / n;
      const sxy = pts.reduce((a, q) => a + (q[0] - mx) * (q[1] - my), 0), sxx = pts.reduce((a, q) => a + (q[0] - mx) ** 2, 0), syy = pts.reduce((a, q) => a + (q[1] - my) ** 2, 0);
      const beta = sxy / sxx, eta = Math.exp(mx - my / beta), r2 = sxy * sxy / (sxx * syy), b10 = eta * Math.pow(-Math.log(0.9), 1 / beta);
      const tmin = fails[0] / 3, tmx = eta * 3, Ft = t => 1 - Math.exp(-Math.pow(t / eta, beta));
      const yv = F => Math.log(-Math.log(1 - F));
      const svg = plot({ xmin: tmin, xmax: tmx, xlog: true, ymin: yv(0.005), ymax: yv(0.99), title: 'Weibull plot (straight line = Weibull fits)', xlab: 'time (log)', ylab: 'unreliability (Weibull scale)',
        xt: [tmin, Math.sqrt(tmin * tmx), tmx].map(x => +x.toPrecision(2)), yt: [0.01, 0.1, 0.5, 0.9].map(yv), yf: y => Math.round(100 * (1 - Math.exp(-Math.exp(y)))) + '%', xf: x => num(x),
        series: [{ pts: Array.from({ length: 60 }, (_, i) => { const t = tmin * Math.pow(tmx / tmin, i / 59); return [t, yv(Math.min(0.99, Math.max(0.005, Ft(t))))]; }), color: '#76b900' }, { pts: pts.map(q => [q[2], q[1]]), color: '#ff6b3d', dots: true }] });
      res.innerHTML = '<div class="af-out">' + fx(beta.toFixed(2), 'shape β', null) + fx(num(eta), 'scale η (63.2 % failed)', null) + fx(num(b10), 'B10 life', null) + fx(r2.toFixed(3), 'fit quality R²', null) + fx(n + ' / ' + N, 'failures / units', null) + fx(beta > 1.1 ? 'wear-out' : beta < 0.95 ? 'infant' : 'random', 'failure pattern', null) + '</div>' + svg;
    }
    ta.addEventListener('input', upd); sus.addEventListener('input', upd); upd();
  }

  function pLaser(p) {
    CE.sliders(p, 'Laser aging: when does the drive current run out?', [['a', 'Current increase after 1,000 h', 0.2, 8, 0.1, 1.5, '%', 'est'], ['m', 'Growth exponent m (ΔI ∝ t^m)', 0.3, 1.2, 0.05, 0.6, '', 'typ'], ['eol', 'End-of-life criterion', 10, 60, 5, 20, '% increase'], ['ea', 'Activation energy', 0.3, 1.0, 0.05, 0.5, 'eV', 'est'], ['tt', 'Test temperature', 40, 100, 1, 85, '°C'], ['tu', 'Use temperature', 25, 85, 1, 50, '°C']], (v, el) => {
      const tEolTest = 1000 * Math.pow(v.eol / v.a, 1 / v.m), k = 8.617e-5, AF = Math.exp(v.ea / k * (1 / (v.tu + 273.15) - 1 / (v.tt + 273.15))), tUse = tEolTest * AF;
      const pts = Array.from({ length: 120 }, (_, i) => { const t = 10 * Math.pow(10, i / 119 * 5.5); return [t, v.a * Math.pow(t / 1000, v.m)]; });
      el.innerHTML = '<div class="af-out">' + fx(num(tEolTest) + ' h', 'to EOL at test temperature', null) + fx(num(AF, 1) + '×', 'temperature acceleration', null) + fx(num(tUse / 8760, 1) + ' y', 'median life at use temperature', null) + '</div>' +
        plot({ xmin: 10, xmax: 3e6, xlog: true, ymin: 0.1, ymax: 100, ylog: true, title: 'drive-current increase vs time at test temperature (log-log)', xlab: 'hours', xt: [10, 100, 1000, 1e4, 1e5, 1e6], xf: x => num(x), yt: [0.1, 1, 10, 100], series: [{ pts, color: '#ff6b3d' }], hlines: [{ y: v.eol, label: 'EOL criterion', color: '#f5b301' }], marks: [{ x: Math.min(2.9e6, tEolTest), label: 'EOL', color: '#ff4d5e' }] }) +
        '<div class="callout">This is how laser aging data is extrapolated: measure the drive-current increase in accelerated tests, fit a power law, project to the end-of-life criterion, then convert to use conditions with Arrhenius. Each step carries uncertainty, so reliability reports quote distributions (median, B1, B10), not one number. In the field, the same metric (laser bias trend) is the early warning in Case Study 1.</div>';
    });
  }

  function pSystem(p) {
    CE.sliders(p, 'From link FIT to job interruptions', [['links', 'Optical links used by one training job', 1000, 300000, 1000, 50000, ''], ['fit', 'Interrupting events per link', 10, 2000, 10, 200, 'FIT', 'est'], ['ckpt', 'Checkpoint interval', 5, 240, 5, 60, 'min'], ['rst', 'Restart time after an interruption', 1, 60, 1, 10, 'min']], (v, el) => {
      const rate = v.links * v.fit / 1e9, perDay = rate * 24, mtbi = 1 / rate, lost = (v.ckpt / 2 + v.rst) / 60, goodput = 1 / (1 + rate * lost);
      el.innerHTML = '<div class="af-out">' + fx(num(perDay, 1), 'interruptions per day', null) + fx(num(mtbi, 1) + ' h', 'mean time between interruptions', null) + fx((goodput * 100).toFixed(1) + ' %', 'goodput (time doing useful work)', null) + '</div>' +
        '<div class="eq">job interruption rate = Σ (FIT of every link and component the job depends on) / 10⁹ per hour\nlost time per event ≈ ½ · checkpoint interval + restart time</div>' +
        '<div class="callout">At AI-factory scale even excellent links interrupt jobs often, because the job depends on all of them at once (a <b>series system</b>). That is why NVIDIA stresses a <b>10× resiliency</b> improvement for CPO ' + B('nv') + ': cutting FIT per link directly raises goodput. Redundancy (spare paths, N+1 fans/PSUs) and fast recovery (shorter checkpoints and restarts) are the other levers.</div>';
    });
    p.appendChild(h('table', { class: 'table', style: 'margin-top:14px', html: '<tr><th>Structure</th><th>Reliability</th><th>Used for</th></tr><tr><td>Series (all needed)</td><td>R = R₁ · R₂ · … · Rₙ ; FITs add</td><td>a training job across all links</td></tr><tr><td>Parallel (any one enough)</td><td>R = 1 − (1−R₁)(1−R₂)…</td><td>redundant PSUs, fans, network paths</td></tr><tr><td>k-of-n</td><td>needs k of n working</td><td>N+1 fans, multi-plane networks</td></tr><tr><td>Availability</td><td>A = MTBF / (MTBF + MTTR)</td><td>serviceable parts: shorter repair (front-panel lasers!) raises A</td></tr>' }));
  }

  CE.register({
    id: 'reliability', title: 'Reliability Statistics', icon: '📉', order: 9.6, storeKey: 'rel-last-step',
    finish: { go: 'requirements', label: 'Continue: Requirements & V&V →' },
    pages: [
      CE.startPage({ eyebrow: 'Interactive course · about 45 minutes', title: '<em>Reliability statistics</em> for CPO switches',
        intro: 'Lasers age, solder fatigues, fibers drift, and at AI-factory scale rare failures happen every day. This course gives you the statistics to predict, test and argue about reliability: life distributions, FIT roll-ups, acceleration models, how much a test can prove, Weibull fitting of your own data, laser aging and system availability. Everything is interactive. Just press <b>Next</b>.',
        analogy: [['🛁', 'Bathtub', 'infant · random · wear-out'], ['➕', 'FIT', 'failures per 10⁹ hours add up'], ['🔥', 'Acceleration', 'hotter test = faster aging'], ['📐', 'Weibull', 'β tells you which phase']],
        route: ['<b>Basics</b>: R(t), failure rate, FIT, MTBF, the bathtub.', '<b>Weibull</b>: shape and scale, B10 life.', '<b>FIT roll-up</b> for a whole switch and a fleet.', '<b>Acceleration</b>: Arrhenius and Coffin-Manson.', '<b>Test planning</b>: what a test can demonstrate.', '<b>Weibull fit</b> of your own data.', '<b>Laser aging</b> extrapolation.', '<b>System view</b>: links, jobs, goodput, availability.'] }),
      CE.page('rel-basics', 'Reliability basics', 'Tools', 'Reliability basics: the vocabulary', null, pBasics),
      CE.page('rel-weibull', 'Weibull distribution', 'Tools', 'The Weibull distribution: one model, three phases of life', 'Move β and η and watch reliability and failure rate change.', pWeibull),
      CE.page('rel-fit', 'FIT roll-up', 'Tools', 'Roll up the FIT of a switch and a fleet', 'Edit quantities and FIT values. The totals and the Pareto bars update live.', pFit),
      CE.page('rel-accel', 'Acceleration models', 'Tools', 'Acceleration: turning weeks of testing into years of use', 'Arrhenius for temperature-driven mechanisms, Coffin-Manson for thermal cycling.', pAccel),
      CE.page('rel-demo', 'What a test can prove', 'Tools', 'Test planning: what can a reliability test demonstrate?', 'Units × hours × acceleration = evidence. See how much FIT a test can prove, and at what confidence.', pDemo),
      CE.page('rel-wfit', 'Weibull fit of your data', 'Tools', 'Fit a Weibull to failure data', 'Paste failure times (and how many units survived). The tool estimates β, η and B10 and draws a Weibull plot.', pWfit),
      CE.page('rel-laser', 'Laser aging', 'Tools', 'Laser aging extrapolation', 'From accelerated-test drift to field life, the way laser reliability reports are built.', pLaser),
      CE.page('rel-system', 'System view & goodput', 'Tools', 'System reliability: from link FIT to training-job goodput', 'Why AI factories care so much about link reliability.', pSystem),
      CE.donePage({ title: 'You can now <em>quantify</em> reliability', takeaways: [
        'FIT and MTBF describe <b>populations</b>: at fleet scale, rare failures are daily events.',
        '<b>Weibull β</b> tells you the life phase: infant mortality (screen it), random (FIT applies) or wear-out (replace in time).',
        '<b>FIT roll-ups</b> and their Pareto chart show where to invest; lasers and connectors usually lead in optics.',
        '<b>Arrhenius and Coffin-Manson</b> turn hot or cycled tests into field years, provided the right activation energy and exponent are used.',
        'A test with zero failures proves only an <b>upper bound</b>; more device-hours prove more.',
        'AI jobs are <b>series systems</b>: link FIT drives interruptions and goodput, which is CPO\'s resiliency story.'],
        next: [['Continue: Requirements & V&V →', 'requirements'], ['Optics Manufacturing', 'optics-mfg']],
        warn: 'All component values are illustrative ' + B('est') + '. Use supplier qualification data and field data for real decisions.' })
    ]
  });
})();
