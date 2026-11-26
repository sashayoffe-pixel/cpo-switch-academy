/* Optics Manufacturing course: how silicon-photonics engines, lasers and CPO packages are made, tested,
   aligned and calibrated; yield and test strategy for a system engineer. Uses js/course-engine.js. */
(function () {
  'use strict';
  const C = window.CPO;
  const h = C.h, B = C.badge, CE = C.course;
  const K = CE.K;
  const { R, T, L, P, O, G, cap, along, ptsD } = CE.svg;
  const fx = CE.fact;

  C.addGlossary({
    'KGD': { full: 'Known-Good Die', def: 'A die (or engine) fully tested before it is assembled into an expensive multi-chip package.', cat: 'package' },
    'Wafer map': { full: 'Wafer map', def: 'Picture of a wafer showing the test result of every die: used to see yield and spatial patterns.', cat: 'test' },
    'Active alignment': { full: 'Active alignment', def: 'Aligning a fiber while light is on and the coupled power is measured, moving to the position of maximum power before fixing it.', cat: 'package' },
    'Hybrid bonding': { full: 'Hybrid bonding', def: 'Direct bonding of two chips face-to-face: copper pads fuse and the oxide between them bonds, with micrometre pitch.', cat: 'package' },
    'Cpk': { full: 'Process capability index', def: 'How well a process fits inside its spec limits, in units of 3σ from the mean to the nearest limit. Cpk ≥ 1.33 is a common target.', cat: 'test' }
  });

  function dots(g, n, col, r) { const a = []; for (let k = 0; k < n; k++) a.push(O(g, -9, -9, r || 3, { fill: col })); return a; }

  // ================================================================ scenes
  function sFlow(g) {
    cap(g, 30, 34, 'FROM SAND TO A SHIPPED CPO SWITCH (simplified flow)', K.text);
    const st = [['PIC wafer fab', 'silicon photonics', 60, 80, K.data], ['EIC wafer fab', 'advanced CMOS', 60, 200, K.acc], ['Wafer test', 'optical + electrical', 260, 140, K.warn], ['3D bonding', 'EIC on PIC', 450, 140, K.ctrl], ['Engine assembly', 'fiber attach', 640, 140, K.optic], ['Engine test', 'known-good engine', 830, 140, K.warn],
      ['Laser fab', 'InP lasers', 60, 340, K.therm], ['Laser burn-in', 'screen + sort', 260, 340, K.warn], ['ELS module', 'front-panel unit', 450, 340, K.therm],
      ['Package assembly', 'ASIC + engines', 640, 300, K.acc], ['System build', 'box + ELS + fibers', 640, 440, K.text], ['Final test', 'calibrate + BER', 830, 440, K.warn]];
    const bx = st.map(([a, b2, x, y, c]) => { const r = R(g, x, y, 160, 64, { fill: K.panel, stroke: c, 'stroke-width': 1.5, rx: 8 }); T(g, x + 80, y + 28, a, { 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: c }); T(g, x + 80, y + 47, b2, { 'text-anchor': 'middle', 'font-size': 11.5, fill: K.muted }); return r; });
    const paths = [[[220, 112], [260, 160]], [[220, 232], [260, 186]], [[420, 172], [450, 172]], [[610, 172], [640, 172]], [[800, 172], [830, 172]], [[910, 204], [910, 260], [720, 260], [720, 300]], [[220, 372], [260, 372]], [[420, 372], [450, 372]], [[610, 372], [640, 472]], [[720, 364], [720, 440]], [[800, 472], [830, 472]]];
    paths.forEach(pp => P(g, ptsD(pp), { stroke: K.muted, 'stroke-width': 1.8, 'stroke-opacity': .7 }));
    const ds = paths.map(() => dots(g, 1, '#fff', 4));
    R(g, 30, 530, 940, 52, { fill: K.panel, stroke: K.line, rx: 10 });
    T(g, 50, 562, 'Yellow boxes are test steps. Testing early (before expensive assembly) is the single most important economic idea in CPO manufacturing.', { 'font-size': 13, fill: K.acc });
    return { hot: [{ x: 56, y: 76, w: 168, h: 72, target: 'om-fab', label: 'Silicon photonics fab' }], update(t) { paths.forEach((pp, i) => { const p2 = along(pp, (t * 0.5 + i * 0.13) % 1); ds[i][0].setAttribute('cx', p2[0]); ds[i][0].setAttribute('cy', p2[1]); }); bx.forEach((r, i) => r.setAttribute('fill', Math.floor(t * 1.2) % st.length === i ? '#1d2a38' : K.panel)); } };
  }

  function sFab(g) {
    cap(g, 30, 34, 'BUILDING A SILICON-PHOTONICS WAFER, LAYER BY LAYER', K.text);
    const steps = [
      ['SOI wafer: silicon on a buried oxide', (gg) => { R(gg, 100, 380, 800, 80, { fill: '#2a3340', stroke: 'none' }); R(gg, 100, 350, 800, 30, { fill: '#6b7f99', stroke: 'none' }); R(gg, 100, 330, 800, 20, { fill: '#5c86b8', stroke: 'none' }); }],
      ['Etch waveguides and rings into the top silicon', (gg) => { R(gg, 100, 330, 800, 20, { fill: '#05070a', stroke: 'none' }); [[160, 120], [360, 40], [460, 40], [600, 160], [820, 50]].forEach(([x, w]) => R(gg, x, 330, w, 20, { fill: '#5c86b8', stroke: 'none' })); }],
      ['Implant p/n doping for modulator junctions', (gg) => { R(gg, 360, 330, 20, 20, { fill: K.ctrl, stroke: 'none', opacity: .8 }); R(gg, 380, 330, 20, 20, { fill: K.data, stroke: 'none', opacity: .8 }); R(gg, 460, 330, 20, 20, { fill: K.ctrl, stroke: 'none', opacity: .8 }); R(gg, 480, 330, 20, 20, { fill: K.data, stroke: 'none', opacity: .8 }); }],
      ['Grow germanium for photodetectors', (gg) => { R(gg, 630, 306, 90, 24, { fill: '#9aa04a', stroke: 'none' }); }],
      ['Oxide cladding, metal heaters and contacts', (gg) => { R(gg, 100, 240, 800, 90, { fill: '#8aa5c8', 'fill-opacity': .25, stroke: 'none' }); R(gg, 350, 290, 160, 8, { fill: K.therm, stroke: 'none' }); [370, 470, 650, 700].forEach(x => R(gg, x, 250, 10, 60, { fill: '#c9a227', stroke: 'none' })); }],
      ['Metal interconnect layers + pads for the EIC bond', (gg) => { [[100, 210], [100, 180]].forEach(([x, y]) => R(gg, x, y, 800, 8, { fill: '#c9a227', 'fill-opacity': .7, stroke: 'none' })); for (let k = 0; k < 16; k++) R(gg, 120 + k * 48, 150, 24, 14, { fill: '#e8c766', stroke: 'none' }); }]
    ];
    const layers = steps.map(([, f]) => { const gg = G(g, { opacity: 0 }); f(gg); return gg; });
    const lab = T(g, 500, 90, '', { 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 700, fill: K.acc });
    const num = T(g, 500, 116, '', { 'text-anchor': 'middle', 'font-size': 12.5, fill: K.muted });
    T(g, 910, 460, 'Si substrate', { 'text-anchor': 'end', fill: K.muted, 'font-size': 11 }); T(g, 910, 372, 'buried oxide', { 'text-anchor': 'end', fill: K.muted, 'font-size': 11 });
    R(g, 30, 480, 940, 100, { fill: K.panel, stroke: K.line, rx: 10 });
    T(g, 50, 508, 'Made in CMOS-style foundries on 200/300 mm wafers: lithography, etch, implant, deposition. Thousands of engines per wafer.', { 'font-size': 13 });
    T(g, 50, 532, 'Waveguide width and thickness control ring resonance to fractions of a nanometre: nm-level process variation = resonance spread.', { 'font-size': 13, fill: K.warn });
    T(g, 50, 556, 'That spread is why every ring needs a heater and calibration: manufacturing variation becomes tuning power in your power budget.', { 'font-size': 13, fill: K.acc });
    return { hot: [{ x: 96, y: 146, w: 808, h: 318, target: 'om-wtest', label: 'Wafer-level test' }], update(t) { const k = Math.floor(t / 1.6) % (steps.length + 2); layers.forEach((l, i) => l.setAttribute('opacity', i <= k ? 1 : 0)); const s2 = Math.min(k, steps.length - 1); lab.textContent = steps[s2][0]; num.textContent = 'step ' + (s2 + 1) + ' of ' + steps.length + ' (simplified)'; } };
  }

  function sWtest(g) {
    cap(g, 30, 34, 'WAFER-LEVEL TEST: FIND THE BAD DIES BEFORE THEY COST MONEY', K.text);
    const cx = 230, cy = 300, r = 200; O(g, cx, cy, r, { fill: '#141a22', stroke: '#3b4a5e', 'stroke-width': 2 });
    const cells = []; const rnd = (i, j) => { const s2 = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453; return s2 - Math.floor(s2); };
    for (let i = -9; i <= 9; i++) for (let j = -9; j <= 9; j++) { const x = cx + i * 20, y = cy + j * 20; if (Math.hypot(i * 20 + 10, j * 20 + 10) > r - 14) continue; const edge = Math.hypot(i, j) / 9; const bad = rnd(i, j) < 0.05 + 0.25 * Math.pow(edge, 3); cells.push({ el: R(g, x, y, 18, 18, { fill: '#26323f', stroke: 'none', rx: 1 }), bad, d: Math.hypot(i, j) }); }
    const probe = G(g, {}); R(probe, -16, -50, 32, 50, { fill: '#3a3f47', stroke: '#8a99ad' }); L(probe, -8, 0, -8, 8, { stroke: K.optic, 'stroke-width': 3 }); L(probe, 8, 0, 8, 8, { stroke: K.data, 'stroke-width': 2 });
    T(g, 230, 530, 'green = pass · red = fail: edge dies fail more (spatial pattern)', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12 });
    R(g, 480, 60, 490, 230, { fill: '#05080b', stroke: K.line, rx: 8 }); T(g, 496, 82, 'optical probe: transmission spectrum of one ring', { fill: K.muted, 'font-size': 12 });
    const sp = P(g, '', { stroke: K.data, 'stroke-width': 2.5 }); const res = T(g, 496, 276, '', { 'font-size': 12.5, fill: K.acc });
    R(g, 480, 310, 490, 270, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 496, 336, 'WHAT IS MEASURED ON EVERY DIE', K.text);
    ['Waveguide & coupler loss (light in / out through', 'grating couplers that a fiber probe can reach)', 'Ring resonance wavelength, Q, extinction', 'Modulator bandwidth and efficiency (pm/V)', 'Photodetector responsivity, dark current', 'Heater resistance and tuning efficiency', '→ pass/fail + data for every die, stored by ID'].forEach((s, i) => T(g, 496, 364 + i * 28, s, { 'font-size': 12.8, fill: i === 6 ? K.acc : i % 2 ? K.muted : K.text }));
    return { hot: [{ x: 476, y: 56, w: 498, h: 238, target: 'om-bond', label: '3D bonding' }], update(t) {
      const n = Math.floor((t * 18) % (cells.length + 30)); cells.forEach((c, i) => c.el.setAttribute('fill', i < n ? (c.bad ? K.bad : '#3b6a16') : '#26323f'));
      const c = cells[Math.min(n, cells.length - 1)]; const bb = c.el.getAttribute('x'), yy = c.el.getAttribute('y'); probe.setAttribute('transform', 'translate(' + (+bb + 9) + ' ' + (+yy + 2) + ')');
      const c0 = 0.5 + 0.08 * Math.sin(n * 1.7); let d = ''; for (let i = 0; i <= 120; i++) { const x = i / 120; const tr = 1 - 0.85 / (1 + Math.pow((x - c0) / 0.02, 2)); d += (i ? 'L' : 'M') + (500 + x * 450) + ' ' + (250 - tr * 140); } sp.setAttribute('d', d);
      res.textContent = 'resonance ' + (1310 + (c0 - 0.5) * 20).toFixed(2) + ' nm · die ' + (c.bad ? 'FAIL' : 'PASS'); res.setAttribute('fill', c.bad ? K.bad : K.acc);
    } };
  }

  function sBond(g) {
    cap(g, 30, 34, 'STACKING THE ELECTRONICS CHIP ON THE PHOTONICS CHIP (hybrid bonding)', K.text);
    const top = G(g, {}); R(top, 0, 0, 500, 60, { fill: '#122012', stroke: K.acc, 'stroke-width': 2 }); T(top, 250, 34, 'EIC (flipped, face down)', { 'text-anchor': 'middle', 'font-size': 13 }); for (let k = 0; k < 20; k++) R(top, 15 + k * 24, 60, 12, 8, { fill: '#e8c766', stroke: 'none' });
    R(g, 250, 330, 500, 70, { fill: '#0d1a2b', stroke: '#5c86b8', 'stroke-width': 2 }); T(g, 500, 370, 'PIC wafer (face up)', { 'text-anchor': 'middle', 'font-size': 13 }); for (let k = 0; k < 20; k++) R(g, 265 + k * 24, 322, 12, 8, { fill: '#e8c766', stroke: 'none' });
    const lab = T(g, 500, 80, '', { 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700 });
    R(g, 30, 420, 940, 160, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 50, 446, 'WHY AND WHAT CAN GO WRONG', K.text);
    [['Why', 'micrometre-pitch copper-to-copper links: thousands of very short, low-capacitance connections between drivers/TIAs and the photonics.'], ['Steps', 'planarize to near-atomic flatness → clean → align (sub-µm) → bond at room temperature → anneal so copper pads fuse.'], ['Risks', 'particles create voids, misalignment opens pads, warpage, and a bad EIC ruins a good PIC (and vice versa): yields multiply.'], ['Tech', 'TSMC SoIC-class bonding in the COUPE engine platform (NVIDIA public).']]
      .forEach(([a, b2], i) => { T(g, 50, 478 + i * 26, a, { 'font-size': 13, 'font-weight': 700, fill: K.acc }); T(g, 120, 478 + i * 26, b2, { 'font-size': 12.6 }); });
    return { hot: [{ x: 246, y: 316, w: 508, h: 88, target: 'om-fa', label: 'Fiber attach & alignment' }], update(t) { const ph = (t % 6) / 6; const y = ph < 0.4 ? 120 + ph / 0.4 * 132 : 252; const ok = ph > 0.45; top.setAttribute('transform', 'translate(250 ' + y + ')'); lab.textContent = ph < 0.4 ? 'aligning (sub-micrometre)…' : ok && ph < 0.75 ? 'bonded: oxide bonds, copper pads touch' : 'annealed: copper fuses into one conductor'; lab.setAttribute('fill', ph < 0.4 ? K.warn : K.acc); } };
  }

  function sFa(g) {
    cap(g, 30, 34, 'FIBER ATTACH: ACTIVE ALIGNMENT TO A FRACTION OF A MICROMETRE', K.text);
    R(g, 60, 200, 300, 90, { fill: '#0d1a2b', stroke: '#5c86b8', 'stroke-width': 2 }); T(g, 210, 250, 'PIC edge with couplers', { 'text-anchor': 'middle', 'font-size': 12.5 });
    for (let k = 0; k < 4; k++) R(g, 350, 215 + k * 18, 10, 6, { fill: K.optic, stroke: 'none' });
    const fa = G(g, {}); R(fa, 0, 0, 160, 90, { fill: '#2a0f08', stroke: K.optic, 'stroke-width': 2, rx: 4 }); for (let k = 0; k < 4; k++) L(fa, 0, 18 + k * 18, 160, 18 + k * 18, { stroke: K.optic, 'stroke-width': 3 }); T(fa, 80, 108, 'fiber array', { 'text-anchor': 'middle', fill: K.optic, 'font-size': 12 });
    // scan map
    R(g, 560, 60, 250, 250, { fill: '#05080b', stroke: K.line, rx: 6 }); T(g, 685, 52, 'coupled power vs fiber position (x, y)', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 11.5 });
    const cells = []; for (let i = 0; i < 20; i++) for (let j = 0; j < 20; j++) cells.push({ i, j, el: R(g, 565 + i * 12, 65 + j * 12, 12, 12, { fill: '#05080b', stroke: 'none' }) });
    const mk = O(g, 0, 0, 5, { fill: '#fff' });
    R(g, 830, 60, 140, 250, { fill: K.panel, stroke: K.line, rx: 8 }); cap(g, 842, 84, 'STEPS', K.text);
    const stp = ['1 coarse scan', '2 spiral search', '3 peak climb', '4 apply epoxy', '5 UV cure', '6 check shift'].map((s, i) => T(g, 842, 112 + i * 30, s, { 'font-size': 12.5 }));
    R(g, 60, 330, 500, 150, { fill: '#05080b', stroke: K.line, rx: 6 }); T(g, 72, 350, 'coupled power during the process', { fill: K.muted, 'font-size': 11.5 });
    const pw = P(g, '', { stroke: K.acc, 'stroke-width': 2.5 });
    R(g, 580, 330, 390, 250, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 596, 356, 'MECHANICS DECIDES OPTICS HERE', K.optic);
    ['Single-mode mode size ~ a few µm: 1 µm offset', '≈ ~0.2–0.5 dB; 2 µm ≈ ~1–2 dB (illustrative).', 'Epoxy shrinks while curing → the fiber moves:', 'pre-offset compensation, low-shrink adhesives.', 'Then: creep, humidity and thermal cycles over', 'years. Stiff, symmetric, CTE-matched designs win.', 'Detachable fiber connectors (NVIDIA public) put', 'a precision optical interface in the field.'].forEach((s, i) => T(g, 596, 384 + i * 23, s, { 'font-size': 12.6, fill: i >= 6 ? K.acc : i % 2 ? K.muted : K.text }));
    R(g, 60, 500, 500, 80, { fill: K.panel, stroke: K.line, rx: 10 });
    T(g, 76, 528, 'Alignment time per engine is a major cost driver: faster search', { 'font-size': 12.8 }); T(g, 76, 550, 'algorithms and passive-alignment features cut it.', { 'font-size': 12.8 });
    return { hot: [{ x: 576, y: 326, w: 398, h: 258, target: 'om-laser', label: 'Laser manufacturing' }], update(t) {
      const ph = (t % 9) / 9; const tx = 0.55 + 0.1 * Math.cos(1), ty = 0.45; let px, py, stage;
      if (ph < 0.3) { const k = ph / 0.3; px = (Math.floor(k * 10) % 2 ? 1 - (k * 10 % 1) : k * 10 % 1); py = k; stage = 0; }
      else if (ph < 0.5) { const k = (ph - 0.3) / 0.2, a = k * 12, rr = 0.3 * (1 - k); px = tx + rr * Math.cos(a); py = ty + rr * Math.sin(a); stage = 1; }
      else if (ph < 0.6) { px = tx; py = ty; stage = 2; } else if (ph < 0.7) { px = tx; py = ty; stage = 3; } else if (ph < 0.85) { const k = (ph - 0.7) / 0.15; px = tx + 0.03 * k; py = ty + 0.02 * k; stage = 4; } else { px = tx + 0.03; py = ty + 0.02; stage = 5; }
      const seen = ph;
      cells.forEach(c => { const x = (c.i + 0.5) / 20, y = (c.j + 0.5) / 20; const v = Math.exp(-((x - tx) ** 2 + (y - ty) ** 2) / 0.006); c.el.setAttribute('fill', seen > 0.25 ? 'rgb(' + Math.round(255 * Math.min(1, v * 1.5)) + ',' + Math.round(120 * v) + ',' + Math.round(60 * v) + ')' : '#05080b'); });
      mk.setAttribute('cx', 565 + px * 240); mk.setAttribute('cy', 65 + py * 240);
      fa.setAttribute('transform', 'translate(' + (380 + (px - tx) * 60) + ' ' + (200 + (py - ty) * 60) + ')');
      stp.forEach((s2, i) => s2.setAttribute('fill', i === stage ? K.acc : K.muted));
      let d = ''; for (let i = 0; i <= 100; i++) { const q = i / 100; if (q > ph) break; let v; if (q < 0.3) v = 0.05 + 0.1 * Math.abs(Math.sin(q * 60)); else if (q < 0.5) v = 0.2 + 0.7 * (q - 0.3) / 0.2; else if (q < 0.7) v = 0.95; else if (q < 0.85) v = 0.95 - 0.12 * (q - 0.7) / 0.15; else v = 0.83; d += (d ? 'L' : 'M') + (70 + q * 480) + ' ' + (470 - v * 110); } pw.setAttribute('d', d);
    } };
  }

  function sLaser(g) {
    cap(g, 30, 34, 'LASER MANUFACTURING: GROW, TEST, BURN IN, SORT', K.text);
    const st = [['InP wafer', 'grow quantum wells and the DFB grating (III-V fab)', K.therm], ['Cleave + coat', 'cut into bars and chips, coat the facets', K.optic], ['Submount', 'solder chip onto a heat-spreading submount', K.warn], ['LIV + spectrum', 'power, voltage, threshold, wavelength', K.data], ['Burn-in', 'hours to days at high current and temperature', K.bad], ['Sort + bin', 'by wavelength and power; reject drifters', K.acc]];
    const bx = st.map(([a, b2, c], i) => { const x = 30 + i * 160; const r = R(g, x, 60, 148, 120, { fill: K.panel, stroke: c, rx: 8 }); T(g, x + 74, 90, a, { 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: c }); const w = b2.split(' '), ls = [[]]; w.forEach(x2 => { const cur = ls[ls.length - 1]; if ((cur.join(' ') + ' ' + x2).length > 20) ls.push([x2]); else cur.push(x2); }); ls.forEach((l, j) => T(g, x + 74, 114 + j * 17, l.join(' '), { 'text-anchor': 'middle', 'font-size': 11.5 })); return r; });
    R(g, 30, 200, 460, 230, { fill: '#05080b', stroke: K.line, rx: 8 }); T(g, 46, 222, 'burn-in: drive current needed for constant power', { fill: K.muted, 'font-size': 12 });
    const curves = []; for (let k = 0; k < 7; k++) curves.push(P(g, '', { stroke: k === 5 ? K.bad : K.acc, 'stroke-width': 2, 'stroke-opacity': k === 5 ? 1 : 0.6 }));
    T(g, 46, 420, 'the red unit drifts early: an "infant mortality" caught by burn-in', { fill: K.bad, 'font-size': 11.5 });
    R(g, 510, 200, 460, 380, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 526, 226, 'WHAT THE SYSTEM ENGINEER CARES ABOUT', K.text);
    ['Burn-in duration vs cost: longer screens catch more', 'weak lasers but cost time and capacity.', 'Wavelength binning: lasers must land on the WDM grid', 'that the rings can be tuned to (tuning range!).', 'Power binning: enough optical power for the link', 'budget at end of life, with margin.', 'Reliability data: accelerated-life tests → FIT and', 'wear-out curves used in your reliability budget.', 'Traceability: wafer, lot and test data per laser,', 'to link field failures back to manufacturing.'].forEach((s, i) => T(g, 526, 254 + i * 30, s, { 'font-size': 12.8, fill: i % 2 ? K.muted : K.text }));
    R(g, 30, 450, 460, 130, { fill: K.panel, stroke: K.line, rx: 10 });
    T(g, 46, 478, 'ELS modules then combine screened lasers with drivers,', { 'font-size': 12.8 }); T(g, 46, 500, 'monitors, optics and a front-panel housing, and get a', { 'font-size': 12.8 }); T(g, 46, 522, 'module-level test: power per output, wavelength, noise,', { 'font-size': 12.8 }); T(g, 46, 544, 'and management interface checks.', { 'font-size': 12.8 });
    return { hot: [{ x: 506, y: 196, w: 468, h: 388, target: 'om-pkg', label: 'Package assembly' }], update(t) { const k = Math.floor(t) % st.length; bx.forEach((r, i) => r.setAttribute('fill', i === k ? '#2a1a10' : K.panel)); const tm = (t % 6) / 6; curves.forEach((c, j) => { let d = ''; for (let i = 0; i <= 100; i++) { const x = i / 100; if (x > tm) break; const base = 410 - j * 6, drift = j === 5 ? 120 * Math.pow(x, 1.5) : 8 * x; d += (d ? 'L' : 'M') + (50 + x * 420) + ' ' + (base - 120 - drift); } c.setAttribute('d', d); }); } };
  }

  function sPkg(g) {
    cap(g, 30, 34, 'PACKAGE ASSEMBLY AND THE MATHS OF KNOWN-GOOD ENGINES', K.text);
    R(g, 60, 70, 420, 300, { fill: '#13110a', stroke: '#5a4d2a', 'stroke-width': 2, rx: 10 }); T(g, 270, 92, 'substrate', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12 });
    R(g, 200, 160, 140, 120, { fill: '#1b2a10', stroke: K.acc, 'stroke-width': 2 }); T(g, 270, 225, 'ASIC', { 'text-anchor': 'middle', 'font-weight': 700 });
    const oes = []; [[90, 110], [90, 200], [90, 290], [380, 110], [380, 200], [380, 290], [200, 100], [270, 100], [200, 300], [270, 300]].forEach(([x, y]) => oes.push(R(g, x, y, 60, 46, { fill: '#1d0e08', stroke: K.optic, 'stroke-width': 1.5, rx: 3 })));
    const lab = T(g, 270, 400, '', { 'text-anchor': 'middle', 'font-size': 13.5, 'font-weight': 700 });
    R(g, 520, 70, 450, 300, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 536, 96, 'WHY "KNOWN-GOOD" MATTERS', K.text);
    T(g, 536, 128, 'package yield ≈ y_ASIC × y_engine^N × y_assembly', { 'font-family': 'ui-monospace,monospace', 'font-size': 13, fill: '#d8f5a8' });
    ['With N engines on one package, even a 98 % engine', 'yield compounds: 0.98^10 ≈ 82 %. Every failed', 'package wastes a large ASIC and all the good', 'engines on it. So: test each engine thoroughly', 'before assembly (KGD), and design for rework', 'or replaceable engines where possible.'].forEach((s, i) => T(g, 536, 160 + i * 24, s, { 'font-size': 12.8 }));
    const yb = T(g, 536, 330, '', { 'font-size': 15, 'font-weight': 700 });
    R(g, 30, 420, 940, 160, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 50, 446, 'ASSEMBLY STEPS (simplified)', K.text);
    ['Place ASIC and engines on the substrate → reflow (warpage control!) → underfill → TIM + lid → test → attach cold plate and fibers.', 'Each step has its own yield and its own failure signatures; data from every step is kept per serial number for traceability.', 'Optical tests can only start once light can get in and out: fiber management and test fixtures are part of the factory design.'].forEach((s, i) => T(g, 50, 478 + i * 28, s, { 'font-size': 12.8, fill: i === 2 ? K.optic : K.text }));
    return { hot: [{ x: 516, y: 66, w: 458, h: 308, target: 'om-final', label: 'Final test & calibration' }], update(t) { const k = Math.floor(t / 2.4) % 2; const fails = k ? [] : [4]; oes.forEach((r, i) => r.setAttribute('stroke', fails.includes(i) ? K.bad : K.optic)); oes.forEach((r, i) => r.setAttribute('stroke-width', fails.includes(i) ? 4 : 1.5)); lab.textContent = k ? 'known-good engines only → package passes' : 'one untested bad engine → whole package scrapped'; lab.setAttribute('fill', k ? K.acc : K.bad); yb.textContent = k ? 'test before assembly ✓' : 'scrap: ASIC + 9 good engines ✗'; yb.setAttribute('fill', k ? K.acc : K.bad); } };
  }

  function sFinal(g) {
    cap(g, 30, 34, 'FINAL TEST & CALIBRATION: TURNING A WORKING BOX INTO A TUNED ONE', K.text);
    const rows = 12, cols = 16, cells = [];
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) cells.push({ i, j, el: R(g, 60 + i * 24, 70 + j * 24, 20, 20, { fill: '#26323f', stroke: 'none', rx: 3 }) });
    T(g, 60 + cols * 12, 380, 'every lane: calibrate, then BER-test (192 lanes shown)', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12 });
    R(g, 480, 60, 490, 320, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 496, 86, 'WHAT GETS CALIBRATED AND STORED', K.text);
    [['Ring heaters', 'start-up heater codes, lock targets'], ['Modulators', 'bias and swing per ring (OMA / ER)'], ['Lasers', 'power per output, monitor-PD cal'], ['Receivers', 'TIA gain, Rx-power reading cal'], ['SerDes', 'equalizer presets per lane'], ['Thermal', 'sensor offsets, alarm thresholds'], ['Stored in', 'EEPROM / flash, read at every boot']]
      .forEach(([a, b2], i) => { T(g, 496, 118 + i * 37, a, { 'font-size': 13, 'font-weight': 700, fill: K.acc }); T(g, 616, 118 + i * 37, b2, { 'font-size': 12.5 }); });
    R(g, 30, 400, 940, 180, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 50, 426, 'TEST STRATEGY QUESTIONS YOU OWN', K.text);
    ['Coverage: which requirements are tested where (wafer, engine, package, system)? Anything only tested in the field is a risk.', 'Limits: test limits tighter than spec ("guardband") so parts pass the spec at end of life and across temperature.', 'Time: test time per unit × volume = factory capacity; temperature testing is expensive, so choose corners carefully.', 'Data: keep calibration and test data per serial number; correlate with field telemetry to tighten or relax limits.'].forEach((s, i) => T(g, 50, 458 + i * 28, s, { 'font-size': 12.8 }));
    return { hot: [], update(t) { const n = Math.floor((t * 24) % (cells.length + 40)); cells.forEach((c, i) => c.el.setAttribute('fill', i < n ? ((i * 37) % 97 === 5 ? K.warn : '#3b6a16') : '#26323f')); } };
  }

  const LV = [
    { id: 'om-flow', name: 'The flow', scene: sFlow, title: 'The manufacturing flow', sub: 'From wafers to a shipped CPO switch',
      plain: 'A CPO switch combines chips from <b>different factories</b>: silicon-photonics wafers, advanced CMOS electronics wafers, III-V laser wafers, package substrates. They are tested, stacked, aligned to fibers, packaged with the switch ASIC, built into a box with laser modules, then calibrated. <b>Test steps</b> sit between almost every stage.',
      body: '<p>Every stage has a yield, and costs grow as parts move down the line. A defect caught at wafer test costs cents; the same defect found after packaging can scrap an expensive ASIC and many good engines.</p>',
      facts: [['TSMC', 'COUPE engine technology', 'nv'], ['multi-source', 'ecosystem of partners', 'nv'], ['yield × yield', 'compounds through the flow', 'typ'], ['test early', 'the key economic rule', 'typ']],
      cpoTxt: 'As system engineer you influence <b>design for manufacturing and test</b>: which parameters must be measurable at each stage, which limits apply where, and how test data flows back to design and forward to the field.',
      more: 'NVIDIA has named an ecosystem of partners for its silicon-photonics switches (foundry, lasers, fiber, connectors, assembly). See the appendix.', links: [] },
    { id: 'om-fab', name: 'Photonics fab', scene: sFab, title: 'The silicon-photonics wafer fab', sub: 'CMOS-style processing for light',
      plain: 'Silicon-photonics chips start as <b>SOI wafers</b>: a thin silicon layer on glass. The fab etches <b>waveguides and rings</b>, implants <b>doping</b> for modulators, grows <b>germanium</b> for photodetectors, then adds oxide, <b>heaters</b>, metal wiring and bond pads, using the same kinds of tools as chip fabs.',
      body: '<p>Ring resonances depend on waveguide width and thickness at the nanometre level, so tiny process variations shift each ring\'s resonance. That spread is the reason rings need heaters and per-unit calibration.</p>',
      facts: [['200/300 mm', 'wafers', 'typ'], ['~220 nm', 'typical SOI device-layer thickness', 'typ'], ['nm', 'variations shift ring resonance', 'typ'], ['Ge', 'grown for photodetectors', 'typ']],
      cpoTxt: 'Process variation shows up in your budgets: heater power needed to bring every ring onto its laser line (power budget) and the tuning range needed at temperature extremes (thermal budget). Ask for the <b>resonance distribution</b> across wafers and lots.',
      more: 'Corner lots (wafers intentionally processed at the edges of the process window) help prove designs are robust before volume production.', links: [['architecture/pic', 'PIC in the explorer']] },
    { id: 'om-wtest', name: 'Wafer test', scene: sWtest, title: 'Wafer-level test', sub: 'Testing optics before dicing',
      plain: 'Before the wafer is cut, every die is tested with <b>optical fiber probes</b> (through grating couplers on the surface) and <b>electrical probes</b>. The result is a <b>wafer map</b> of pass/fail and measured values: ring wavelengths, losses, modulator and detector performance.',
      body: '<p>Spatial patterns (edge failures, rings drifting across the wafer) reveal process problems quickly. The data for each die is stored by ID and follows the part through assembly, which is the start of <b>traceability</b>.</p>',
      facts: [['every die', 'optical + electrical test', 'typ'], ['grating couplers', 'surface access for probes', 'typ'], ['wafer map', 'yield + spatial patterns', 'typ'], ['ID', 'per-die traceability', 'typ']],
      cpoTxt: 'Wafer-test limits decide what reaches assembly. Too tight wastes good parts; too loose ships marginal ones into expensive packages. Setting them uses the link and power budgets you own.',
      more: 'Wafer-level optical test is harder than electrical test: fiber probes must be aligned, which takes time. Fast test is a big part of cost.', links: [] },
    { id: 'om-bond', name: '3D bonding', scene: sBond, title: 'Stacking EIC on PIC', sub: 'Hybrid bonding at micrometre pitch',
      plain: 'The electronics chip (EIC) is flipped and <b>bonded face-to-face</b> onto the photonics chip (PIC). In hybrid bonding the copper pads fuse directly and the oxide around them bonds, giving thousands of tiny, short connections between drivers and modulators, and between detectors and TIAs.',
      body: '<p>It needs near-atomically flat, perfectly clean surfaces and sub-micrometre alignment. Particles cause voids; warpage causes opens. A defect in either chip ruins both, so yields multiply.</p>',
      facts: [['µm pitch', 'bond pads', 'typ'], ['SoIC', 'TSMC 3D stacking', 'nv'], ['COUPE', 'EIC-on-PIC engine', 'nv'], ['yield × yield', 'EIC × PIC × bond', 'typ']],
      cpoTxt: 'Bonding makes the electrical link between electronics and photonics short and clean (power and signal integrity), but it creates a hard <b>known-good-die</b> problem: test strategy decides whether each chip is tested before stacking.',
      more: 'Thermal expansion mismatch between the two stacked chips is small (both silicon), one reason face-to-face silicon stacking works well.', links: [['architecture/eic-3d-stack', '3D stack in the explorer']] },
    { id: 'om-fa', name: 'Fiber attach', scene: sFa, title: 'Fiber attach and active alignment', sub: 'Where mechanical precision becomes optical loss',
      plain: 'Light has to get from fibers into the chip. A <b>fiber array</b> is moved while light is measured (<b>active alignment</b>): a coarse scan, a spiral search, then a climb to the peak. It is then fixed with adhesive that is cured with UV light. As the adhesive shrinks, the fiber moves slightly, and that movement costs coupling.',
      body: '<p>For Gaussian modes, coupling falls like exp(−(offset/mode radius)²): a micrometre matters. After assembly, creep, humidity and thermal cycling keep moving things for years. Detachable connectors add another precision interface that customers handle in the field.</p>',
      facts: [['~µm', 'alignment tolerance', 'typ'], ['UV epoxy', 'common fixing method', 'typ'], ['shrinkage', 'cure-induced shift', 'typ'], ['detachable', 'front fiber connectivity', 'nv']],
      cpoTxt: 'This is mechanical engineering deciding optical performance, and it is your strongest area. Tolerance stacks, adhesive selection, stiffness, CTE matching and aging tests all feed straight into the link budget.',
      more: 'Passive alignment (precision mechanical features such as V-grooves that place fibers without measuring light) is faster but needs tighter part tolerances: a classic cost vs. precision trade-off.', links: [['architecture/fiber-coupler', 'Fiber coupler in the explorer']] },
    { id: 'om-laser', name: 'Lasers', scene: sLaser, title: 'Laser manufacturing and screening', sub: 'Grow, test, burn in, sort',
      plain: 'Lasers are made on <b>InP</b> (indium phosphide) wafers in specialized fabs, cut into chips, mounted on submounts, then measured (power vs current, wavelength) and <b>burned in</b> at high current and temperature. Burn-in removes weak units that would fail early. Survivors are <b>sorted by wavelength and power</b>.',
      body: '<p>Burn-in trades factory time against field reliability. Wavelength binning makes sure each laser lands where the rings can be tuned. Accelerated-life testing produces the FIT and wear-out data for the reliability budget.</p>',
      facts: [['InP', 'laser material', 'typ'], ['burn-in', 'screens infant mortality', 'typ'], ['binning', 'wavelength + power', 'typ'], ['4× fewer', 'lasers vs pluggables', 'nv']],
      cpoTxt: 'Lasers are among the parts most likely to wear out, so their screening, binning and reliability data deserve special attention. Fewer, better-screened, replaceable lasers is one of CPO\'s key reliability arguments.',
      more: 'Laser reliability data is usually reported as FIT at a reference temperature plus a wear-out distribution; the Reliability Statistics course shows how to use both.', links: [['reliability', 'Reliability Statistics course']] },
    { id: 'om-pkg', name: 'Package assembly', scene: sPkg, title: 'Package assembly and known-good engines', sub: 'Why yields multiply',
      plain: 'The ASIC and the optical engines are placed on the substrate, soldered (reflow), underfilled, covered with TIM and a lid, then tested. With many engines on one package, <b>yields multiply</b>: if each engine has a 98 % chance of being good, ten of them together are only ~82 %. A failed package wastes everything on it.',
      body: '<p>That drives thorough engine testing before assembly (<b>known-good engines</b>) and, where possible, designs that allow rework or replacement. Warpage at reflow is a key mechanical risk for both solder joints and later fiber alignment.</p>',
      facts: [['0.98¹⁰ ≈ 82 %', 'compound yield example', 'est'], ['KGD', 'known-good die / engine', 'typ'], ['reflow', 'warpage-critical step', 'typ'], ['traceability', 'per serial number', 'typ']],
      cpoTxt: 'Yield and cost models belong to the system trade space: more test time per engine vs package scrap rate, replaceable vs permanently attached engines, and serviceability. The yield calculator after this section lets you explore it.',
      more: 'Rework of a co-packaged engine is much harder than swapping a pluggable module, which is why the lasers (the parts most likely to wear out) are kept external and replaceable.', links: [['architecture/switch-package', 'Package in the explorer']] },
    { id: 'om-final', name: 'Final test', scene: sFinal, title: 'Final test and calibration', sub: 'Every lane tuned, tested and recorded',
      plain: 'The finished switch is <b>calibrated</b> lane by lane: ring heater settings, modulator bias, laser power, receiver calibration and SerDes presets. It is then <b>BER-tested</b> on every lane, often at temperature. Calibration data is stored in on-board memory and read by firmware at every boot.',
      body: '<p>Test limits are set tighter than the specification (<b>guardbands</b>) so parts still meet spec at end of life and at temperature extremes. Test time × volume = factory capacity, so the test plan is also an economic plan.</p>',
      facts: [['every lane', 'calibrated + BER tested', 'typ'], ['EEPROM', 'stores calibration', 'typ'], ['guardband', 'test limit inside spec', 'typ'], ['Cpk ≥ 1.33', 'common capability target', 'typ']],
      cpoTxt: 'You own the <b>verification and test strategy</b>: which requirement is proven at which stage, with what limits and data retention. Field telemetry closes the loop: compare it with factory data to tighten or relax limits.',
      more: 'The Requirements & V&V workshop shows how to map requirements to tests in a verification matrix.', links: [['requirements', 'Requirements & V&V workshop']] }
  ];

  function yieldCalc(p) {
    CE.sliders(p, 'Yield and cost of a CPO package', [['ye', 'Engine yield after its own test', 90, 100, 0.1, 98, '%', 'est'], ['n', 'Engines per package', 2, 24, 1, 8, '', 'est'], ['ya', 'ASIC yield (tested die)', 95, 100, 0.1, 99.5, '%', 'est'], ['yasm', 'Assembly yield', 90, 100, 0.1, 98, '%', 'est'], ['ca', 'ASIC cost (relative units)', 100, 2000, 50, 1000, '', 'est'], ['ce', 'Engine cost (relative units)', 10, 500, 10, 100, '', 'est'], ['cov', 'Engine test coverage', 50, 100, 1, 95, '%', 'est']], (v, el) => {
      const esc = (1 - v.ye / 100) * (1 - v.cov / 100); // escapes per engine
      const yEng = Math.pow(1 - esc, v.n), y = v.ya / 100 * yEng * v.yasm / 100;
      const matCost = v.ca + v.n * v.ce, perGood = matCost / y, scrap = matCost * (1 - y);
      const y100 = v.ya / 100 * Math.pow(1 - (1 - v.ye / 100) * 0, v.n) * v.yasm / 100;
      el.innerHTML = '<div class="af-out">' + fx((y * 100).toFixed(1) + ' %', 'package yield') + fx((esc * 1e6).toFixed(0) + ' ppm', 'bad engines escaping test') + fx(perGood.toFixed(0), 'material cost per GOOD package') +
        fx(scrap.toFixed(0), 'scrap cost per package built') + fx(((y100 - y) * 100).toFixed(1) + ' pts', 'yield lost to test escapes') + fx(matCost.toFixed(0), 'material cost per package') + '</div>' +
        '<div class="callout' + (y < 0.9 ? ' warn' : '') + '">Bad engines that slip through testing multiply with the engine count. Raising test coverage from ' + v.cov + ' % to 99 % would cut escapes to ' + ((1 - v.ye / 100) * 0.01 * 1e6).toFixed(0) + ' ppm per engine. The more expensive the ASIC, the more an extra minute of engine test is worth.</div>';
    }, 'Assumes bad engines that pass test make the whole package fail. Relative cost units ' + B('est') + '.');
  }
  function alignCalc(p) {
    CE.sliders(p, 'Coupling loss vs misalignment', [['w', 'Mode field radius', 1.5, 6, 0.1, 3.0, 'µm', 'typ'], ['dx', 'Lateral offset', 0, 4, 0.05, 0.8, 'µm', 'est'], ['ang', 'Angular tilt', 0, 3, 0.05, 0.5, '°', 'est'], ['gap', 'Axial gap (simplified)', 0, 30, 1, 5, 'µm', 'est']], (v, el) => {
      const lam = 1.31, n = 1.45;
      const eL = Math.exp(-Math.pow(v.dx / v.w, 2)), eA = Math.exp(-Math.pow(Math.PI * n * v.w * (v.ang * Math.PI / 180) / lam, 2));
      const zR = Math.PI * v.w * v.w * n / lam, eG = 1 / (1 + Math.pow(v.gap / (2 * zR), 2));
      const tot = eL * eA * eG, db = x => (-10 * Math.log10(x)).toFixed(2);
      el.innerHTML = '<div class="af-out">' + fx(db(eL) + ' dB', 'from lateral offset', 'typ') + fx(db(eA) + ' dB', 'from angular tilt', 'typ') + fx(db(eG) + ' dB', 'from axial gap', 'typ') + fx(db(tot) + ' dB', 'total misalignment loss', 'typ') + fx((tot * 100).toFixed(1) + ' %', 'power coupled (vs perfect)', 'typ') + fx((v.w * 0.33).toFixed(2) + ' µm', 'offset that costs ~0.5 dB', 'typ') + '</div>' +
        '<div class="callout">Smaller modes (tighter confinement) are much more sensitive to offset; larger modes are more sensitive to angle. Couplers are designed to expand the mode as a compromise. Every 0.1 dB of loss here comes straight off the link-budget margin.</div>';
    }, 'Gaussian-mode overlap formulas for identical modes ' + B('typ') + '.');
  }

  const APX = [
    { id: 'apx-spc', short: 'Test statistics & SPC', title: 'Test statistics: Cpk, guardbands and SPC',
      lead: 'The handful of statistical ideas that every manufacturing and test discussion uses.',
      html: '<div class="eq">Cp  = (USL − LSL) / (6σ)              how wide the spec is vs the process spread\nCpk = min(USL − μ, μ − LSL) / (3σ)    also accounts for an off-centre mean\nCpk 1.0 ≈ 1,350 ppm outside one limit · 1.33 ≈ 32 ppm · 1.67 ≈ 0.3 ppm</div>' +
        '<ul><li><b>Guardband:</b> test limit = spec limit − (measurement error + aging + temperature shift). It protects the customer at the cost of some yield.</li><li><b>Gauge R&R:</b> how repeatable and reproducible the measurement itself is. A test station that can\'t measure to 0.1 dB can\'t enforce a 0.1 dB limit.</li><li><b>SPC:</b> plot key parameters per lot over time with control limits; react to trends before parts fail the spec.</li><li><b>Correlation:</b> wafer-test vs final-test vs field data for the same serial number shows which early tests predict late failures.</li></ul>' },
    { id: 'apx-eco', short: 'Ecosystem & supply chain', title: 'The CPO ecosystem and supply chain',
      lead: 'Many companies contribute pieces; the system team integrates them.',
      html: '<p>NVIDIA has publicly named ecosystem partners for its silicon-photonics switches ' + B('nv') + ', including <b>TSMC</b> (foundry and COUPE/SoIC packaging), <b>Coherent</b> and <b>Lumentum</b> (lasers and optical components), <b>Corning</b> (fiber), <b>SENKO</b> (connectors), <b>Sumitomo Electric</b>, <b>Browave</b> and <b>TFC</b> (optical/fiber components), <b>Fabrinet</b> and <b>Foxconn</b> (manufacturing/assembly), and <b>SPIL</b> (packaging/test).</p>' +
        '<table class="table"><tr><th>Domain</th><th>What it supplies</th><th>Interface you manage</th></tr><tr><td>Foundry</td><td>PIC + EIC wafers, 3D stacking</td><td>process specs, wafer-test data, lot traceability</td></tr><tr><td>Lasers</td><td>laser chips / sources</td><td>power, wavelength, RIN, reliability data</td></tr><tr><td>Fiber & connectors</td><td>fiber, arrays, detachable connectors</td><td>loss, return loss, cleanliness, mechanical tolerances</td></tr><tr><td>Assembly / OSAT</td><td>package and module assembly, test</td><td>yields, test limits, capacity</td></tr><tr><td>System manufacturing</td><td>box build, final test</td><td>test coverage, calibration flow, data retention</td></tr></table>' +
        '<div class="callout">Roles shown are general domains for orientation, not a description of any specific contract.</div>' }
  ];

  CE.register({
    id: 'optics-mfg', title: 'Optics Manufacturing', icon: '⚙️', order: 9.2, storeKey: 'om-last-step',
    levels: LV, levelCh: 'How it is made', levelBoxTitle: '🛠 What this means for you as system engineer',
    finish: { go: 'elec-course', label: 'Continue: Electronics & Boards →' },
    pages: [
      CE.startPage({ eyebrow: 'Guided course · about 45 minutes', title: 'How CPO optics are <em>made</em>, <em>aligned</em> and <em>tested</em>',
        intro: 'From silicon-photonics wafers and laser chips to a calibrated CPO switch: fabs, wafer test, 3D bonding, fiber alignment, burn-in, package assembly and final calibration, plus the yield maths that drives the whole test strategy. A lot of this is <b>precision mechanics</b>, your home ground. Just press <b>Next</b>.',
        analogy: [['🧪', 'Fab', 'CMOS tools, but for light'], ['🔬', 'Test early', 'cheap defects stay cheap'], ['🎯', 'Alignment', 'micrometres decide decibels'], ['✖️', 'Yields multiply', '0.98¹⁰ ≈ 82 %']],
        route: ['<b>How it is made, 8 steps:</b> the flow → photonics fab → wafer test → 3D bonding → fiber attach & alignment → lasers → package assembly & known-good engines → final test & calibration.', '<b>Calculators:</b> yield & cost of a package, and coupling loss vs misalignment; plus your role in manufacturing.', '<b>Appendix:</b> test statistics (Cpk, guardbands, SPC) and the ecosystem / supply chain.'] }),
      '@levels',
      CE.page('om-yield', 'Calculator: yield & cost', 'Calculators', 'Yield and cost of a CPO package', 'See how engine yield, test coverage and engine count drive package yield and the cost of each good package.', yieldCalc),
      CE.page('om-align', 'Calculator: alignment loss', 'Calculators', 'Coupling loss vs misalignment', 'How many dB does a micrometre cost? Explore lateral offset, angle and gap for single-mode coupling.', alignCalc),
      CE.page('om-role', 'Your role in manufacturing', 'Calculators', 'Your role as system engineer in manufacturing', null, p => {
        p.appendChild(h('div', { class: 'grid2', html:
          '<div class="card"><h3 style="margin-top:0">Design for manufacturing (DFM)</h3><ul><li>Tolerances that the process can actually hold (check Cpk data).</li><li>Alignment features and fixtures that make assembly fast and repeatable.</li><li>Materials and adhesives qualified for the thermal and humidity environment.</li></ul></div>' +
          '<div class="card"><h3 style="margin-top:0">Design for test (DFT)</h3><ul><li>Every requirement measurable somewhere: test points, monitor PDs, loopbacks, PRBS.</li><li>Optical access for test before final assembly.</li><li>Test time budgets per stage.</li></ul></div>' +
          '<div class="card"><h3 style="margin-top:0">Yield learning</h3><ul><li>Pareto of failure causes per stage (see Case Studies & Pareto).</li><li>Wafer maps and lot trends.</li><li>Feedback loops from field returns to test limits.</li></ul></div>' +
          '<div class="card"><h3 style="margin-top:0">Traceability</h3><ul><li>Serial numbers for wafers, dies, lasers, engines, packages and boxes.</li><li>Test and calibration data kept per serial.</li><li>Field telemetry linked back to manufacturing data.</li></ul></div>' }));
      })
    ].concat(CE.appendixPages(APX)).concat([
      CE.donePage({ title: 'You can now follow a CPO switch <em>through the factory</em>', takeaways: [
        'Many factories contribute (photonics, CMOS, lasers, substrates, assembly); <b>yields multiply</b> through the flow.',
        '<b>Test early</b>: wafer-level and known-good-engine testing protect expensive packages.',
        'Nanometre process variation becomes <b>ring heater power</b> and calibration effort.',
        '<b>Fiber attach</b> is precision mechanics: offsets, adhesive shrinkage and creep turn into optical loss.',
        'Lasers are grown, screened by <b>burn-in</b>, and binned by wavelength and power.',
        'Final calibration data lives in the box; <b>traceability</b> links factory data to field telemetry.'],
        next: [['Continue: Electronics & Boards →', 'elec-course'], ['Requirements & V&V workshop', 'requirements']],
        warn: 'Values are ' + B('typ') + ' or ' + B('est') + ' for learning; process details are generic and simplified, not descriptions of any specific product line.' })
    ])
  });
})();
