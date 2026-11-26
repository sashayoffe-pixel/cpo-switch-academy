/* Thermodynamics & Heat Transfer course, focused on CPO switch packaging (ASIC + optical engines + lasers,
   liquid cooling). Animated levels, calculators and an appendix. Uses js/course-engine.js. */
(function () {
  'use strict';
  const C = window.CPO;
  const h = C.h, B = C.badge, CE = C.course;
  const K = CE.K;
  const { R, T, L, P, O, G, cap, along, ptsD } = CE.svg;
  const fx = CE.fact;

  C.addGlossary({
    'Thermal resistance': { full: 'Thermal resistance θ (°C/W)', def: 'Temperature rise per watt of heat flowing through a layer or interface: ΔT = P·θ.', cat: 'thermal' },
    'BLT': { full: 'Bond-line thickness', def: 'Thickness of the thermal interface material layer between two surfaces; thinner is better thermally.', cat: 'thermal' },
    'HTC': { full: 'Heat-transfer coefficient h (W/m²·K)', def: 'How effectively a fluid removes heat from a surface: q = h·A·ΔT.', cat: 'thermal' },
    'Re': { full: 'Reynolds number', def: 'Ratio of inertial to viscous forces in a flow; decides laminar (low) vs turbulent (high).', cat: 'thermal' },
    'Nu': { full: 'Nusselt number', def: 'Dimensionless heat-transfer coefficient: Nu = h·D/k.', cat: 'thermal' },
    'Pr': { full: 'Prandtl number', def: 'Ratio of momentum to thermal diffusivity of a fluid (water ≈ 7, air ≈ 0.7).', cat: 'thermal' }
  });

  function dots(g, n, col, r) { const a = []; for (let k = 0; k < n; k++) a.push(O(g, -9, -9, r || 3, { fill: col })); return a; }
  const heat = v => { v = C.clamp(v, 0, 1); const r = Math.round(40 + 215 * Math.min(1, v * 1.6)), gg = Math.round(40 + 180 * Math.max(0, Math.min(1, (v - 0.35) * 2.2))), b = Math.round(120 * (1 - v)); return 'rgb(' + r + ',' + gg + ',' + b + ')'; };

  // ================================================================ scenes
  function sMap(g) {
    cap(g, 30, 34, 'WHERE THE HEAT IS GENERATED IN A CPO PACKAGE (illustrative)', K.text);
    const cells = [], N = 22;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) cells.push({ i, j, el: R(g, 200 + i * 18, 60 + j * 18, 18, 18, { fill: '#000', stroke: 'none', rx: 0 }) });
    R(g, 200, 60, N * 18, N * 18, { fill: 'none', stroke: '#5a4d2a', 'stroke-width': 2 });
    R(g, 200 + 7 * 18, 60 + 7 * 18, 8 * 18, 8 * 18, { fill: 'none', stroke: K.acc, 'stroke-width': 2, 'stroke-dasharray': '4 3' }); T(g, 200 + 11 * 18, 60 + 11 * 18 + 5, 'ASIC', { 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: '#fff' });
    const oe = []; [[2, 2], [9, 1], [16, 2], [1, 9], [19, 9], [2, 17], [9, 19], [16, 17]].forEach(([i, j]) => { oe.push([i, j]); R(g, 200 + i * 18, 60 + j * 18, 3 * 18, 2 * 18, { fill: 'none', stroke: K.optic, 'stroke-width': 1.5 }); });
    T(g, 200 + 3.5 * 18, 60 + 2 * 18 - 6, 'OE', { 'text-anchor': 'middle', fill: K.optic, 'font-size': 11 });
    // legend
    for (let k = 0; k < 10; k++) R(g, 640, 360 - k * 26, 24, 26, { fill: heat(k / 9), stroke: 'none' });
    T(g, 672, 104, 'hot', { fill: K.text, 'font-size': 12 }); T(g, 672, 382, 'cool', { fill: K.text, 'font-size': 12 });
    R(g, 720, 60, 250, 330, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 736, 84, 'HEAT SOURCES', K.text);
    [['Switch ASIC', 'hundreds of W, dense hot spots in SerDes and pipelines', K.acc], ['Optical engines', 'drivers, TIAs and ring heaters; W to tens of W each', K.optic], ['VRMs on the board', '~10 % of the power they deliver', K.power], ['External lasers', 'at the front panel, kept cool on purpose', K.therm]]
      .forEach(([a, b2, c], i) => { T(g, 736, 116 + i * 66, a, { 'font-size': 13.5, 'font-weight': 700, fill: c }); const w = b2.split(' '), l1 = [], l2 = []; w.forEach(x => ((l1.join(' ') + ' ' + x).length < 32 && !l2.length ? l1 : l2).push(x)); T(g, 736, 134 + i * 66, l1.join(' '), { 'font-size': 12 }); T(g, 736, 150 + i * 66, l2.join(' '), { 'font-size': 12 }); });
    R(g, 30, 420, 940, 160, { fill: K.panel, stroke: K.line, rx: 10 });
    T(g, 50, 448, 'Every watt of electrical power ends up as heat (1st law). The job of thermal design: carry it to the coolant with a small enough', { 'font-size': 13 });
    T(g, 50, 470, 'temperature rise that every part stays inside its limits: ASIC junction temperature, ring tuning range, laser life, solder and adhesive limits.', { 'font-size': 13 });
    T(g, 50, 500, 'What makes CPO special: temperature-sensitive optics (rings drift ~0.08 nm/K) now sit millimetres from one of the hottest chips', { 'font-size': 13, fill: K.optic });
    T(g, 50, 522, 'in the data center. Heat flow and optical performance are coupled, so thermal design is part of the optical design.', { 'font-size': 13, fill: K.optic });
    T(g, 50, 556, 'Power map values are illustrative, not product data.', { 'font-size': 12, fill: K.muted });
    return {
      hot: [{ x: 714, y: 56, w: 262, h: 338, target: 'th-modes', label: 'How heat moves' }],
      update(t) {
        cells.forEach(c => {
          let v = 0.08;
          const dx = c.i - 10.5, dy = c.j - 10.5; v += 0.85 * Math.exp(-(dx * dx + dy * dy) / 14) * (0.92 + 0.08 * Math.sin(t * 2 + c.i));
          [[8.5, 8.5], [12.5, 9], [10, 12.5]].forEach(([x, y]) => { v += 0.25 * Math.exp(-((c.i - x) ** 2 + (c.j - y) ** 2) / 1.5); });
          oe.forEach(([i, j]) => { if (c.i >= i && c.i < i + 3 && c.j >= j && c.j < j + 2) v += 0.28; });
          c.el.setAttribute('fill', heat(v));
        });
      }
    };
  }

  function sModes(g) {
    const panels = [['CONDUCTION', 'heat passes through solids, atom to atom', 'q = −k·A·dT/dx  (Fourier)', K.acc], ['CONVECTION', 'a moving fluid carries heat away', 'q = h·A·(T_surface − T_fluid)', K.cool], ['RADIATION', 'surfaces emit infrared', 'q = ε·σ·A·(T⁴ − T_env⁴)', K.therm]];
    panels.forEach(([a, b2, c, col], i) => { const x = 30 + i * 320; R(g, x, 50, 300, 330, { fill: K.panel, stroke: col, rx: 10 }); cap(g, x + 16, 76, a, col); T(g, x + 16, 300, b2, { 'font-size': 12.5 }); T(g, x + 16, 326, c, { 'font-family': 'ui-monospace,monospace', 'font-size': 12.5, fill: '#d8f5a8' }); });
    // conduction: chain of atoms
    const atoms = []; for (let k = 0; k < 7; k++) atoms.push(O(g, 70 + k * 36, 180, 11, { fill: heat(1 - k / 7) }));
    R(g, 46, 140, 18, 80, { fill: K.bad, stroke: 'none' }); T(g, 55, 236, 'hot', { 'text-anchor': 'middle', fill: K.bad, 'font-size': 11 });
    // convection
    R(g, 360, 250, 260, 20, { fill: K.bad, stroke: 'none', rx: 3 }); T(g, 490, 288, 'hot surface', { 'text-anchor': 'middle', fill: K.bad, 'font-size': 11 });
    const fl = []; for (let k = 0; k < 16; k++) fl.push({ x: Math.random(), y: Math.random(), el: O(g, 0, 0, 4, { fill: K.cool }) });
    // radiation
    R(g, 720, 160, 60, 60, { fill: K.bad, stroke: 'none', rx: 6 });
    const waves = [0, 1, 2, 3].map(() => P(g, '', { stroke: K.therm, 'stroke-width': 2, fill: 'none' }));
    R(g, 30, 400, 940, 180, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 50, 426, 'WHICH ONE MATTERS IN A CPO SWITCH?', K.text);
    T(g, 50, 456, 'Conduction carries the heat out of the die, through interface materials, lid and cold-plate metal: most of the temperature drop budget.', { 'font-size': 13 });
    T(g, 50, 480, 'Convection to liquid removes it: water carries ~3,500× more heat per volume than air, which is why AI switches are liquid cooled.', { 'font-size': 13 });
    T(g, 50, 504, 'Radiation is small at these temperatures (a few W from a whole chassis), so it is usually neglected in package-level design.', { 'font-size': 13 });
    T(g, 50, 538, 'Mechanics link: conduction is diffusion, the same mathematics as stress diffusion or mass diffusion. FEA tools solve both.', { 'font-size': 13, fill: K.acc });
    return {
      hot: [{ x: 26, y: 46, w: 308, h: 338, target: 'th-network', label: 'Thermal resistance network' }],
      update(t, dt) {
        atoms.forEach((a, k) => { a.setAttribute('cx', 70 + k * 36 + 3 * Math.sin(t * 20 + k) * (1 - k / 8)); a.setAttribute('cy', 180 + 3 * Math.cos(t * 17 + k * 2) * (1 - k / 8)); });
        fl.forEach(f => { f.y += dt * (0.35 + 0.3 * f.x); if (f.y > 1) { f.y = 0; f.x = Math.random(); } const x = 370 + f.x * 240 + 12 * Math.sin(f.y * 6 + t), y = 245 - f.y * 160; f.el.setAttribute('cx', x); f.el.setAttribute('cy', y); f.el.setAttribute('fill', heat(1 - f.y)); });
        waves.forEach((w, k) => { const r = 40 + ((t * 40 + k * 30) % 120); w.setAttribute('d', 'M' + (750 + r) + ' ' + (150) + ' A' + r + ' ' + r + ' 0 0 1 ' + (750 + r) + ' ' + 230); w.setAttribute('stroke-opacity', 1 - (r - 40) / 120); });
      }
    };
  }

  function sNetwork(g) {
    cap(g, 30, 34, 'THE THERMAL PATH: FROM JUNCTION TO COOLANT', K.text);
    const layers = [['Silicon die', 'junction Tj', 0.02, '#3b6a16'], ['TIM1', 'die → lid', 0.03, '#8a7a14'], ['Lid / spreader', 'copper', 0.01, '#c08040'], ['TIM2', 'lid → cold plate', 0.025, '#8a7a14'], ['Cold plate', 'metal + fins', 0.03, '#5c86b8'], ['Coolant', 'convection', 0, '#1b4b7a']];
    const Pw = 600, Tc = 35;
    let Tcur = Tc + layers.reduce((a, l) => a + l[2] * Pw, 0);
    const tTxt = [];
    layers.forEach(([n, d, r, c], i) => {
      const y = 60 + i * 72;
      R(g, 60, y, 300, 60, { fill: c, 'fill-opacity': .6, stroke: c, rx: 4 }); T(g, 76, y + 26, n, { 'font-size': 14, 'font-weight': 700 }); T(g, 76, y + 46, d, { 'font-size': 12, fill: K.muted });
      tTxt.push(T(g, 340, y + 36, '', { 'text-anchor': 'end', 'font-family': 'ui-monospace,monospace', 'font-size': 14, fill: '#fff' }));
      // resistor symbol
      if (r) { P(g, 'M520 ' + (y + 6) + ' l0 8 l-10 6 l20 10 l-20 10 l20 10 l-10 6 l0 8', { stroke: K.therm, 'stroke-width': 3 }); T(g, 545, y + 36, 'θ = ' + r + ' °C/W', { 'font-size': 12.5, fill: K.therm }); T(g, 690, y + 36, 'ΔT = ' + (r * Pw).toFixed(0) + ' °C', { 'font-size': 12.5, fill: K.warn }); }
      layers[i].T = Tcur; Tcur -= r * Pw;
    });
    T(g, 520, 52, 'electrical analogy: heat flow P = current, ΔT = voltage, θ = resistor', { 'font-size': 12, fill: K.muted });
    const flux = dots(g, 6, K.therm, 5);
    R(g, 400, 470, 570, 110, { fill: K.panel, stroke: K.line, rx: 10 });
    T(g, 420, 498, 'Tj = T_coolant + P · (θ_TIM1 + θ_lid + θ_TIM2 + θ_coldplate + θ_conv)', { 'font-family': 'ui-monospace,monospace', 'font-size': 13, fill: '#d8f5a8' });
    T(g, 420, 524, 'Example: 600 W × 0.115 °C/W = 69 °C rise → Tj ≈ 104 °C with 35 °C coolant.', { 'font-size': 13 });
    T(g, 420, 548, 'The TIMs are usually the biggest items: thin, good TIMs are worth a lot.', { 'font-size': 13, fill: K.acc });
    T(g, 420, 568, 'Illustrative numbers ' + '(est).', { 'font-size': 11.5, fill: K.muted });
    return {
      hot: [{ x: 56, y: 128, w: 308, h: 68, target: 'th-tim', label: 'Thermal interface materials', inside: false }],
      update(t) {
        layers.forEach((l, i) => { tTxt[i].textContent = (l.T + 1.5 * Math.sin(t + i)).toFixed(0) + ' °C'; });
        flux.forEach((d, k) => { const u = (t * 0.25 + k / 6) % 1; d.setAttribute('cx', 400); d.setAttribute('cy', 70 + u * 400); d.setAttribute('fill', heat(1 - u)); });
      }
    };
  }

  function sTim(g) {
    cap(g, 30, 34, 'THERMAL INTERFACE MATERIALS: FILLING THE MICROSCOPIC GAPS', K.text);
    function rough(y0, dir, seed) { let d = 'M60 ' + y0; for (let x = 60; x <= 460; x += 10) d += ' L' + x + ' ' + (y0 + dir * (4 + 4 * Math.sin(x * 0.21 + seed) + 3 * Math.sin(x * 0.53 + seed * 2))); return d; }
    cap(g, 60, 70, 'WITHOUT TIM: AIR GAPS', K.bad);
    P(g, rough(120, 1, 1) + ' L460 80 L60 80 Z', { fill: '#3b4a5e', stroke: '#8a99ad' });
    P(g, rough(140, -1, 3) + ' L460 180 L60 180 Z', { fill: '#4a5a6e', stroke: '#8a99ad' });
    T(g, 260, 200, 'only a few % of the surface really touches; air (k ≈ 0.026) blocks heat', { 'text-anchor': 'middle', 'font-size': 12, fill: K.muted });
    cap(g, 540, 70, 'WITH TIM: GAPS FILLED', K.acc);
    const shift = 'translate(480 0)';
    const gg = G(g, { transform: shift });
    R(gg, 60, 118, 400, 26, { fill: K.acc, 'fill-opacity': .4, stroke: 'none' });
    P(gg, rough(120, 1, 1) + ' L460 80 L60 80 Z', { fill: '#3b4a5e', stroke: '#8a99ad' });
    P(gg, rough(140, -1, 3) + ' L460 180 L60 180 Z', { fill: '#4a5a6e', stroke: '#8a99ad' });
    T(g, 740, 200, 'bond-line thickness (BLT) ~10s of µm', { 'text-anchor': 'middle', 'font-size': 12, fill: K.muted });
    const fa = dots(g, 6, K.therm, 4), fb = dots(g, 6, K.therm, 4);
    R(g, 30, 230, 940, 350, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 50, 256, 'TIM CHOICES (typical, ' + 'industry orders of magnitude)', K.text);
    const rows = [['Thermal grease / paste', '3–8 W/m·K', 'thin BLT, can pump out over cycles', 'TIM2 (lid → cold plate)'], ['Thermal gel / pad', '2–10 W/m·K', 'fills larger gaps, easy rework', 'optics, VRMs, uneven heights'], ['Phase-change material', '3–6 W/m·K', 'solid at room temp, flows when warm', 'TIM2'], ['Solder / indium', '~50–80 W/m·K', 'excellent, but rigid and fixed', 'TIM1 in high-power packages'], ['Liquid metal', '~20–40 W/m·K', 'very good, must be contained (conductive!)', 'TIM1, high-end'], ['Direct contact (no lid)', '—', 'removes one TIM, but more handling risk', 'lidless designs']];
    rows.forEach((r, i) => { r.forEach((c, j) => T(g, [50, 270, 400, 700][j], 290 + i * 34, c, { 'font-size': 12.8, fill: j === 1 ? K.acc : j === 0 ? K.text : K.muted, 'font-weight': j === 0 ? 700 : 400 })); });
    T(g, 50, 504, 'θ_TIM ≈ BLT / (k · A) + contact resistances.  Halving BLT or doubling k halves the TIM\'s temperature drop.', { 'font-family': 'ui-monospace,monospace', 'font-size': 12.5, fill: '#d8f5a8' });
    T(g, 50, 530, 'Mechanics matters: clamping pressure, flatness, warpage and pump-out over thermal cycles change BLT and voids during the product\'s life.', { 'font-size': 12.8, fill: K.optic });
    T(g, 50, 552, 'CPO twist: engines and ASIC have different heights and tolerances under one cold plate: gap filling and pressure distribution become design problems.', { 'font-size': 12.8, fill: K.optic });
    return {
      hot: [{ x: 26, y: 226, w: 948, h: 358, target: 'th-spread', label: 'Spreading & hot spots' }],
      update(t) {
        fa.forEach((d, k) => { const u = (t * 0.25 + k / 6) % 1; d.setAttribute('cx', 100 + k * 60); d.setAttribute('cy', 90 + u * 30); d.setAttribute('opacity', u < 0.6 ? 1 : 0.15); });
        fb.forEach((d, k) => { const u = (t * 0.35 + k / 6) % 1; d.setAttribute('cx', 580 + k * 60); d.setAttribute('cy', 90 + u * 80); });
      }
    };
  }

  function sSpread(g) {
    cap(g, 30, 34, 'SPREADING: A SMALL HOT SPOT FEEDING A BIG COLD PLATE', K.text);
    const N = 30, cells = [];
    for (let i = 0; i < N; i++) for (let j = 0; j < 14; j++) cells.push({ i, j, el: R(g, 60 + i * 15, 60 + j * 15, 15, 15, { fill: '#000', stroke: 'none' }) });
    R(g, 60, 60, N * 15, 14 * 15, { fill: 'none', stroke: K.line });
    T(g, 60 + N * 7.5, 290, 'cross-section: hot spot at the top (die), cold plate at the bottom', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12 });
    R(g, 560, 60, 410, 230, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 576, 84, 'WHY SPREADING MATTERS', K.text);
    ['Heat leaves the die through a small area, then has', 'to fan out sideways to use the whole cold plate.', 'That fanning-out costs temperature: "spreading', 'resistance". A thick, highly conductive lid', '(copper ~390 W/m·K) or a vapor chamber spreads', 'better. Hot spots (SerDes blocks, pipelines) can', 'run 10+ °C above the die average.'].forEach((s, i) => T(g, 576, 112 + i * 23, s, { 'font-size': 12.8 }));
    const sl = T(g, 60, 320, '', { 'font-size': 13.5, 'font-weight': 700 });
    R(g, 30, 340, 940, 240, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 50, 366, 'COMPARE MATERIALS (thermal conductivity k, W/m·K, typical)', K.text);
    const mats = [['Diamond', 2000], ['Graphite (in-plane)', 1500], ['Copper', 390], ['Aluminium', 200], ['Silicon', 150], ['Solder', 50], ['Good TIM', 6], ['Glass', 1], ['Water', 0.6], ['FR-4 (through)', 0.3], ['Air', 0.026]];
    mats.forEach(([n, k], i) => { const y = 390 + i * 17; const w = 600 * (Math.log10(k) + 2) / 5.4; T(g, 50, y + 11, n, { 'font-size': 11.5 }); R(g, 200, y, w, 12, { fill: heat(w / 600), stroke: 'none', rx: 2 }); T(g, 210 + w, y + 11, String(k), { 'font-size': 11.5, fill: K.muted }); });
    let mode = 0;
    return {
      hot: [{ x: 556, y: 56, w: 418, h: 238, target: 'th-coldplate', label: 'Cold plates' }],
      update(t) {
        const m = Math.floor(t / 3) % 2; if (m !== mode) mode = m;
        const kspread = m ? 3 : 1;
        sl.textContent = m ? 'thick copper spreader: heat fans out → cooler hot spot' : 'thin / poor spreader: heat stays concentrated → hot spot';
        sl.setAttribute('fill', m ? K.acc : K.bad);
        cells.forEach(c => { const dx = (c.i - 14.5) / (2 + c.j * 0.9 * kspread), depth = c.j / 13; const v = (1 - depth * 0.8) * Math.exp(-dx * dx) * (m ? 0.75 : 1) + 0.08; c.el.setAttribute('fill', heat(v)); });
      }
    };
  }

  function sColdplate(g) {
    cap(g, 30, 34, 'LIQUID COLD PLATE: MICROCHANNELS UNDER THE PACKAGE', K.text);
    R(g, 100, 70, 800, 40, { fill: '#13110a', stroke: '#5a4d2a' }); T(g, 500, 95, 'package lid (heat in from above)', { 'text-anchor': 'middle', 'font-size': 12.5 });
    R(g, 100, 110, 800, 20, { fill: '#5c86b8', stroke: 'none' });
    for (let k = 0; k < 40; k++) R(g, 104 + k * 20, 130, 8, 120, { fill: '#5c86b8', stroke: 'none' });
    R(g, 100, 250, 800, 20, { fill: '#5c86b8', stroke: 'none' });
    T(g, 500, 290, 'fins ~0.1–0.5 mm wide: lots of wetted area in a small volume', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12 });
    T(g, 60, 195, 'in', { fill: K.cool, 'font-size': 14, 'font-weight': 700 }); T(g, 920, 195, 'out', { fill: K.therm, 'font-size': 14, 'font-weight': 700 });
    const fl = []; for (let k = 0; k < 40; k++) fl.push({ u: Math.random(), y: 140 + Math.random() * 100, el: O(g, 0, 0, 3.5, { fill: K.cool }) });
    R(g, 30, 320, 460, 260, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 46, 346, 'WHAT SETS PERFORMANCE', K.text);
    ['Heat-transfer coefficient h: 1,000–20,000+ W/m²K', 'for forced liquid (air: 25–250) ' + '(typical)', 'Wetted area: fins multiply it many times', 'Flow rate: more flow = lower ΔT, but more', 'pressure drop and pump power', 'Coolant temperature: warmer = cheaper facility', 'cooling, but hotter chips and optics'].forEach((s, i) => T(g, 46, 374 + i * 25, s, { 'font-size': 12.8, fill: i % 2 ? K.muted : K.text }));
    R(g, 510, 320, 460, 260, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 526, 346, 'CPO-SPECIFIC QUESTIONS', K.optic);
    ['Do ASIC and engines share one cold plate, or have', 'separate zones? (thermal isolation vs cost)', 'Which sees the coolant first? Upstream parts run', 'cooler; downstream parts see pre-heated coolant.', 'Mounting force: enough for good TIM contact,', 'without warping the package or moving fibers.', 'Leaks and condensation: sensors and interlocks.'].forEach((s, i) => T(g, 526, 374 + i * 25, s, { 'font-size': 12.8, fill: i % 2 ? K.muted : K.text }));
    return {
      hot: [{ x: 506, y: 316, w: 468, h: 268, target: 'th-loop', label: 'The coolant loop' }],
      update(t, dt) { fl.forEach(f => { f.u += dt * 0.15; if (f.u > 1) { f.u = 0; f.y = 140 + Math.random() * 100; } f.el.setAttribute('cx', 80 + f.u * 840); f.el.setAttribute('cy', f.y + 4 * Math.sin(f.u * 30)); f.el.setAttribute('fill', heat(0.2 + f.u * 0.6)); }); }
    };
  }

  function sLoop(g) {
    cap(g, 30, 34, 'THE COOLANT LOOP: FROM THE PACKAGE TO THE OUTSIDE AIR', K.text);
    const pts = [[160, 140], [460, 140], [460, 300], [760, 300], [760, 140], [460, 140]];
    const loopA = [[200, 260], [200, 120], [420, 120], [420, 260], [200, 260]];
    const loopB = [[540, 260], [540, 120], [840, 120], [840, 260], [540, 260]];
    P(g, ptsD(loopA), { stroke: K.cool, 'stroke-width': 6, 'stroke-opacity': .5, fill: 'none' });
    P(g, ptsD(loopB), { stroke: '#1b8fa8', 'stroke-width': 6, 'stroke-opacity': .5, fill: 'none' });
    R(g, 140, 150, 120, 80, { fill: '#13110a', stroke: K.acc, 'stroke-width': 2, rx: 8 }); T(g, 200, 186, 'CPO switch', { 'text-anchor': 'middle', 'font-size': 13 }); T(g, 200, 204, 'cold plate', { 'text-anchor': 'middle', 'font-size': 11.5, fill: K.muted });
    R(g, 420, 150, 120, 80, { fill: '#0b1220', stroke: K.cool, 'stroke-width': 2, rx: 8 }); T(g, 480, 186, 'CDU', { 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700 }); T(g, 480, 204, 'heat exchanger + pump', { 'text-anchor': 'middle', 'font-size': 11, fill: K.muted });
    R(g, 780, 150, 120, 80, { fill: '#0b1220', stroke: K.data, 'stroke-width': 2, rx: 8 }); T(g, 840, 186, 'dry cooler /', { 'text-anchor': 'middle', 'font-size': 13 }); T(g, 840, 204, 'cooling tower', { 'text-anchor': 'middle', 'font-size': 13 });
    T(g, 310, 110, 'rack loop (technology cooling system)', { 'text-anchor': 'middle', fill: K.cool, 'font-size': 12 }); T(g, 690, 110, 'facility water loop', { 'text-anchor': 'middle', fill: '#1b8fa8', 'font-size': 12 });
    const da = dots(g, 8, K.cool, 5), db = dots(g, 8, '#1b8fa8', 5);
    const tt = [T(g, 310, 290, 'supply ~30–40 °C → return +5–15 °C', { 'text-anchor': 'middle', 'font-size': 12.5 }), T(g, 690, 290, 'heat leaves to the outside air', { 'text-anchor': 'middle', 'font-size': 12.5 })];
    void tt;
    R(g, 30, 320, 940, 260, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 50, 346, 'THE ENERGY BALANCE YOU WILL USE ALL THE TIME', K.text);
    T(g, 50, 380, 'Q = ṁ · cp · ΔT', { 'font-family': 'ui-monospace,monospace', 'font-size': 22, fill: '#d8f5a8' });
    T(g, 260, 380, 'heat (W) = mass flow (kg/s) × specific heat (J/kg·K) × temperature rise (K)', { 'font-size': 13 });
    T(g, 50, 414, 'Water cp ≈ 4.18 kJ/kg·K (glycol mixes ~3.6–4.0). 1 L/min of water ≈ 0.0167 kg/s.', { 'font-size': 13 });
    T(g, 50, 438, 'Example: 2 kW switch, 2 L/min → ΔT = 2000 / (0.033 × 4180) ≈ 14 °C between inlet and outlet.', { 'font-size': 13, fill: K.acc });
    T(g, 50, 470, 'Thermodynamics view: the 2nd law says heat only flows downhill, so every stage (chip → coolant → facility → air) needs a temperature', { 'font-size': 13 });
    T(g, 50, 492, 'difference. Warmer coolant ("warm-water cooling") lets the facility reject heat without chillers, improving PUE, but it raises chip and', { 'font-size': 13 });
    T(g, 50, 514, 'optics temperatures. Choosing the coolant inlet temperature is a system-level trade-off between facility efficiency and component margins.', { 'font-size': 13, fill: K.optic });
    T(g, 50, 548, 'Monitoring: inlet/outlet temperatures, flow, pressure, leak detection, which are classic telemetry for alarms and throttling.', { 'font-size': 13, fill: K.muted });
    return {
      hot: [{ x: 136, y: 146, w: 128, h: 88, target: 'th-crosstalk', label: 'Thermal crosstalk to the optics' }],
      update(t) { da.forEach((d, k) => { const p2 = along(loopA, (t * 0.12 + k / 8) % 1); d.setAttribute('cx', p2[0]); d.setAttribute('cy', p2[1]); d.setAttribute('fill', p2[0] < 310 && p2[1] < 200 ? K.therm : K.cool); }); db.forEach((d, k) => { const p2 = along(loopB, (t * 0.1 + k / 8) % 1); d.setAttribute('cx', p2[0]); d.setAttribute('cy', p2[1]); }); }
    };
  }

  function sCrosstalk(g) {
    cap(g, 30, 34, 'THERMAL CROSSTALK: THE ASIC WARMS THE RINGS NEXT DOOR', K.text);
    const N = 34, cells = [];
    for (let i = 0; i < N; i++) for (let j = 0; j < 10; j++) cells.push({ i, j, el: R(g, 40 + i * 14, 70 + j * 14, 14, 14, { fill: '#000', stroke: 'none' }) });
    R(g, 40 + 4 * 14, 70, 12 * 14, 140, { fill: 'none', stroke: K.acc, 'stroke-width': 2 }); T(g, 40 + 10 * 14, 62, 'ASIC', { 'text-anchor': 'middle', fill: K.acc, 'font-size': 12 });
    R(g, 40 + 20 * 14, 70, 6 * 14, 140, { fill: 'none', stroke: K.optic, 'stroke-width': 2 }); T(g, 40 + 23 * 14, 62, 'optical engine', { 'text-anchor': 'middle', fill: K.optic, 'font-size': 12 });
    for (let k = 0; k < 4; k++) O(g, 40 + 21.5 * 14, 92 + k * 30, 8, { fill: 'none', stroke: '#fff', 'stroke-width': 2 });
    const pl = T(g, 40, 236, '', { 'font-size': 13.5, 'font-weight': 700 });
    R(g, 540, 60, 430, 190, { fill: '#05080b', stroke: K.line, rx: 8 }); T(g, 556, 82, 'ring temperature after an ASIC power step', { fill: K.muted, 'font-size': 12 });
    const c1 = P(g, '', { stroke: K.bad, 'stroke-width': 2.5, 'stroke-dasharray': '5 4' }), c2 = P(g, '', { stroke: K.acc, 'stroke-width': 2.5 });
    T(g, 556, 238, 'red: uncompensated · green: heater backs off as the ASIC heats', { fill: K.muted, 'font-size': 11.5 });
    R(g, 30, 270, 940, 310, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 50, 296, 'WHY THIS IS THE KEY CPO THERMAL PROBLEM', K.optic);
    [['Sensitivity', 'ring resonance moves ~0.07–0.1 nm per °C; its linewidth is ~0.1 nm → about 1 °C uncorrected breaks the link.'], ['Coupling', 'the ASIC\'s heat flows sideways through substrate, lid and cold plate into the engines: their temperature follows traffic.'], ['Compensation', 'each ring\'s heater runs a little hot so it can back off when the ASIC warms it: needs tuning range at both extremes.'], ['Budget', 'heater range ∝ worst-case temperature swing at the rings: thermal isolation directly saves heater power (energy/bit).'], ['Design levers', 'distance and thermal breaks between ASIC and engines, separate cold-plate zones, coolant ordering, feed-forward control.'], ['Validation', 'load-step tests at hot and cold coolant temperatures, logging ring temperature/heater codes (see Case Study 2).']]
      .forEach(([a, b2], i) => { T(g, 50, 330 + i * 40, a, { 'font-size': 13.5, 'font-weight': 700, fill: K.acc }); T(g, 180, 330 + i * 40, b2, { 'font-size': 12.8 }); });
    return {
      hot: [{ x: 536, y: 56, w: 438, h: 198, target: 'th-transient', label: 'Thermal transients' }],
      update(t) {
        const ph = (t % 8) / 8, on = ph > 0.25, k = on ? 1 - Math.exp(-(ph - 0.25) * 12) : 0;
        pl.textContent = on ? 'ASIC at full load: heat spreads into the engine' : 'ASIC idle'; pl.setAttribute('fill', on ? K.bad : K.muted);
        cells.forEach(c => { const src = c.i >= 4 && c.i < 16 ? 0.45 + 0.5 * k : 0; const d = c.i < 4 ? 4 - c.i : c.i >= 16 ? c.i - 15 : 0; const v = 0.1 + (src || (0.45 + 0.5 * k) * Math.exp(-d / (3 + 2 * k)) * 0.9); c.el.setAttribute('fill', heat(v)); });
        let a = '', b2 = ''; for (let i = 0; i <= 100; i++) { const x = i / 100, on2 = x > 0.25, kk = on2 ? 1 - Math.exp(-(x - 0.25) * 12) : 0; a += (i ? 'L' : 'M') + (560 + x * 390) + ' ' + (210 - kk * 100); b2 += (i ? 'L' : 'M') + (560 + x * 390) + ' ' + (210 - kk * 100 * Math.exp(-(x - 0.25) * 30 * (on2 ? 1 : 0)) * 0.25 - 0); }
        c1.setAttribute('d', a); c2.setAttribute('d', b2);
      }
    };
  }

  function sTransient(g) {
    cap(g, 30, 34, 'THERMAL TRANSIENTS: EVERY LAYER HAS ITS OWN TIME CONSTANT', K.text);
    const stages = [['die', 0.05, K.bad], ['TIM + lid', 0.4, K.warn], ['cold plate', 2, K.data], ['coolant loop', 15, K.cool]];
    stages.forEach(([n, tau, c], i) => { const x = 60 + i * 220; P(g, 'M' + x + ' 100 l20 0 l6 -10 l12 20 l12 -20 l12 20 l6 -10 l20 0', { stroke: c, 'stroke-width': 3 }); L(g, x + 50, 100, x + 50, 140, { stroke: c, 'stroke-width': 2 }); L(g, x + 36, 140, x + 64, 140, { stroke: c, 'stroke-width': 3 }); L(g, x + 36, 148, x + 64, 148, { stroke: c, 'stroke-width': 3 }); T(g, x + 50, 176, n, { 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: c }); T(g, x + 50, 194, 'τ ~ ' + tau + ' s', { 'text-anchor': 'middle', 'font-size': 12, fill: K.muted }); if (i < 3) L(g, x + 88, 100, x + 220, 100, { stroke: K.line, 'stroke-width': 2 }); });
    T(g, 500, 66, 'each layer = a thermal resistance + a heat capacity (an RC stage): a "Cauer ladder"', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12.5 });
    R(g, 60, 220, 880, 220, { fill: '#05080b', stroke: K.line, rx: 8 });
    T(g, 76, 242, 'junction temperature after a power step (log time axis)', { fill: K.muted, 'font-size': 12 });
    const X = lt => 80 + (lt + 3) / 5 * 840; [-3, -2, -1, 0, 1, 2].forEach(lt => T(g, X(lt), 432, (lt < 0 ? '0.' + '0'.repeat(-lt - 1) + '1' : String(10 ** lt)) + ' s', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 11 }));
    const cur = P(g, '', { stroke: '#fff', 'stroke-width': 3 }); const stg = stages.map(s => P(g, '', { stroke: s[2], 'stroke-width': 1.5, 'stroke-dasharray': '4 4' }));
    const mk = O(g, 0, 0, 6, { fill: '#fff' });
    R(g, 30, 460, 940, 120, { fill: K.panel, stroke: K.line, rx: 10 });
    T(g, 50, 488, 'Fast layers (die, ms) respond almost instantly to traffic bursts; slow layers (cold plate, loop, seconds to minutes) set the steady state.', { 'font-size': 13 });
    T(g, 50, 512, 'Control loops must be faster than the temperature changes they correct: ring-lock loops must beat the ms–s rise of the package.', { 'font-size': 13, fill: K.optic });
    T(g, 50, 536, 'Measurement: a "structure function" from a measured step response reveals each layer\'s R and C, and is used to spot degraded TIMs.', { 'font-size': 13 });
    T(g, 50, 560, 'Mechanics link: same mathematics as a multi-mass damped system; thermal "modes" are all overdamped, so no ringing.', { 'font-size': 13, fill: K.acc });
    return {
      hot: [{ x: 56, y: 216, w: 888, h: 228, target: 'th-laser', label: 'Lasers & temperature' }],
      update(t) {
        const tmax = Math.pow(10, -3 + ((t * 0.6) % 5.2));
        let d = '', ds = stages.map(() => '');
        const tot = stages.length;
        for (let i = 0; i <= 200; i++) { const lt = -3 + i / 200 * 5, tt = Math.pow(10, lt); let v = 0; stages.forEach(([, tau], k) => { const s2 = (1 - Math.exp(-tt / tau)) / tot; v += s2; ds[k] += (i ? 'L' : 'M') + X(lt).toFixed(1) + ' ' + (420 - s2 * 170 * tot * 0.25 - 0).toFixed(1); }); if (tt <= tmax) d += (d ? 'L' : 'M') + X(lt).toFixed(1) + ' ' + (420 - v * 170).toFixed(1); }
        cur.setAttribute('d', d); stg.forEach((s2, k) => s2.setAttribute('d', ds[k]));
        let v2 = 0; stages.forEach(([, tau]) => { v2 += (1 - Math.exp(-tmax / tau)) / tot; }); mk.setAttribute('cx', X(Math.min(2, Math.log10(tmax)))); mk.setAttribute('cy', 420 - v2 * 170);
      }
    };
  }

  function sLaser(g) {
    cap(g, 30, 34, 'LASERS AND TEMPERATURE: WHY THE LASERS LIVE AT THE FRONT PANEL', K.text);
    R(g, 40, 60, 450, 300, { fill: '#05080b', stroke: K.line, rx: 8 }); T(g, 265, 82, 'light output vs drive current at three temperatures', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12 });
    const temps = [[25, K.cool, 20, 1.0], [45, K.warn, 26, 0.85], [65, K.bad, 34, 0.68]];
    const curves = temps.map(([tc, col, ith, sl]) => { let d = ''; for (let i = 0; i <= 100; i++) { const I = i, Pp = Math.max(0, (I - ith) * sl) * 2.4; d += (i ? 'L' : 'M') + (60 + I * 4.1) + ' ' + (340 - Math.min(240, Pp)).toFixed(1); } T(g, 470, 340 - Math.min(240, (100 - ith) * sl * 2.4) + 4, tc + ' °C', { 'text-anchor': 'end', fill: col, 'font-size': 12 }); return P(g, d, { stroke: col, 'stroke-width': 2.5 }); });
    T(g, 265, 354, 'drive current →', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 11.5 });
    R(g, 510, 60, 460, 300, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 526, 86, 'WHAT HEAT DOES TO A LASER', K.text);
    [['Threshold rises', 'needs more current before any light appears'], ['Efficiency drops', 'less light per mA: more heat, a vicious circle'], ['Wavelength drifts', '~0.1 nm/°C for a DFB laser (typical): must stay on the ring/WDM grid'], ['Aging accelerates', 'Arrhenius: every ~10–15 °C hotter can roughly halve life (typical)'], ['TEC option', 'a thermo-electric cooler pumps heat out, but uses extra power, often more than it removes']]
      .forEach(([a, b2], i) => { T(g, 526, 118 + i * 48, a, { 'font-size': 13.5, 'font-weight': 700, fill: K.acc }); T(g, 526, 136 + i * 48, b2, { 'font-size': 12.3 }); });
    const pt = O(g, 0, 0, 6, { fill: '#fff' });
    R(g, 30, 380, 940, 200, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 50, 406, 'THE CPO DESIGN CHOICE', K.optic);
    T(g, 50, 436, 'Putting lasers inside the package, next to a hot ASIC, would cost efficiency, wavelength stability and lifetime. Placing them in', { 'font-size': 13 });
    T(g, 50, 458, 'front-panel external laser sources keeps them cooler and replaceable, at the cost of extra fiber connections and some optical loss.', { 'font-size': 13 });
    T(g, 50, 488, 'Thermal questions you will own: laser case-temperature limit and margin; airflow or liquid cooling at the front panel; heat from the', { 'font-size': 13, fill: K.acc });
    T(g, 50, 510, 'ELS drivers; wavelength drift vs ring tuning range; and the temperature–life curve used in the reliability (FIT) budget.', { 'font-size': 13, fill: K.acc });
    T(g, 50, 544, 'Link to Reliability Statistics course: Arrhenius acceleration factors turn "10 °C hotter" into "x times more failures".', { 'font-size': 12.5, fill: K.muted });
    return {
      hot: [{ x: 26, y: 376, w: 948, h: 208, target: 'th-mech', label: 'Thermo-mechanics' }],
      update(t) { const k = Math.floor(t / 1.5) % 3; curves.forEach((c, i) => c.setAttribute('stroke-width', i === k ? 4.5 : 2)); const [, , ith, sl] = temps[k]; const I = 80; pt.setAttribute('cx', 60 + I * 4.1); pt.setAttribute('cy', 340 - Math.min(240, Math.max(0, (I - ith) * sl) * 2.4)); }
    };
  }

  function sMech(g) {
    cap(g, 30, 34, 'THERMO-MECHANICS: TEMPERATURE MOVES THINGS, AND OPTICS HATE MOVEMENT', K.text);
    const sub = P(g, '', { fill: '#13110a', stroke: '#5a4d2a', 'stroke-width': 2 }), die = P(g, '', { fill: '#1b2a10', stroke: K.acc, 'stroke-width': 2 }), oe = P(g, '', { fill: '#1d0e08', stroke: K.optic, 'stroke-width': 2 });
    const fib = L(g, 0, 0, 0, 0, { stroke: K.optic, 'stroke-width': 4 }), core = O(g, 0, 0, 5, { fill: '#ffd2c2' }), tgt = O(g, 820, 170, 9, { fill: 'none', stroke: '#fff', 'stroke-dasharray': '2 2' });
    const lab = T(g, 500, 70, '', { 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700 });
    const loss = T(g, 830, 230, '', { 'text-anchor': 'middle', 'font-size': 13, fill: K.warn });
    R(g, 30, 290, 940, 290, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 50, 316, 'WHAT TO CHECK', K.text);
    [['CTE mismatch', 'silicon ~3 ppm/K, organic substrate ~10–17 ppm/K, copper ~17 ppm/K: every ΔT creates stress and bending (typical).'], ['Warpage', 'packages bow ("smile/cry") as they heat; reflow is the worst case, operation adds smaller swings.'], ['Fiber alignment', 'single-mode coupling tolerates only ~1 µm of offset; sub-µm creep in adhesives over years adds loss.'], ['TIM pump-out', 'bowing and flattening each cycle pumps grease out of the gap: thermal resistance rises over life.'], ['Solder & bonds', 'cyclic shear fatigue (Coffin-Manson): more ΔT per cycle and more cycles → fewer cycles to failure.'], ['Your strength', 'FEA, tolerance stacks and material selection are mechanical skills: use them to protect the optical budget.']]
      .forEach(([a, b2], i) => { T(g, 50, 350 + i * 37, a, { 'font-size': 13.5, 'font-weight': 700, fill: i === 5 ? K.optic : K.acc }); T(g, 190, 350 + i * 37, b2, { 'font-size': 12.8 }); });
    return {
      hot: [{ x: 26, y: 286, w: 948, h: 298, target: 'th-test', label: 'Thermal test & simulation' }],
      update(t) {
        const s2 = Math.sin(t * 0.9), bow = 14 * s2;
        sub.setAttribute('d', 'M120 220 Q500 ' + (220 + bow * 2) + ' 880 220 L880 250 Q500 ' + (250 + bow * 2) + ' 120 250 Z');
        die.setAttribute('d', 'M380 ' + (180 + bow * 1.6) + ' L560 ' + (180 + bow * 1.6) + ' L560 ' + (216 + bow * 1.9) + ' L380 ' + (216 + bow * 1.9) + ' Z');
        const oy = 180 + bow * 0.7;
        oe.setAttribute('d', 'M640 ' + oy + ' L780 ' + oy + ' L780 ' + (oy + 36) + ' L640 ' + (oy + 36) + ' Z');
        fib.setAttribute('x1', 780); fib.setAttribute('y1', oy + 18 - bow * 0.1); fib.setAttribute('x2', 960); fib.setAttribute('y2', 170);
        core.setAttribute('cx', 820); core.setAttribute('cy', 170 + bow * 0.25);
        lab.textContent = s2 > 0 ? 'heating: substrate expands more than silicon → package bows' : 'cooling: opposite bow';
        lab.setAttribute('fill', s2 > 0 ? K.therm : K.cool);
        const off = Math.abs(bow * 0.25) / 6; loss.textContent = 'coupling loss ≈ ' + (4.34 * off * off).toFixed(2) + ' dB (illustrative)';
        void tgt;
      }
    };
  }

  function sTest(g) {
    cap(g, 30, 34, 'HOW THERMAL DESIGNS ARE PREDICTED AND PROVEN', K.text);
    const boxes = [['Hand calc', 'θ network, Q = ṁ·cp·ΔT: first answers in minutes', K.acc], ['CFD / FEA', 'detailed temperature, flow and stress fields', K.data], ['Thermal test vehicle', 'a package with heaters + sensors instead of real chips', K.warn], ['Measurement', 'on-die sensors, thermocouples, IR camera, flow & pressure', K.optic], ['Correlation', 'adjust the model until it matches the measurements', K.ctrl]];
    const bx = boxes.map(([a, b2, c], i) => { const x = 30 + i * 192; const r = R(g, x, 60, 176, 120, { fill: K.panel, stroke: c, rx: 10 }); T(g, x + 88, 92, a, { 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: c }); const w = b2.split(' '), l1 = [], l2 = [], l3 = []; w.forEach(x2 => { const t1 = l1.join(' '), t2 = l2.join(' '); if ((t1 + ' ' + x2).length < 24 && !l2.length) l1.push(x2); else if ((t2 + ' ' + x2).length < 24 && !l3.length) l2.push(x2); else l3.push(x2); }); [l1, l2, l3].forEach((l, j) => T(g, x + 88, 118 + j * 18, l.join(' '), { 'text-anchor': 'middle', 'font-size': 12 })); if (i < 4) L(g, x + 176, 120, x + 192, 120, { stroke: K.muted, 'stroke-width': 2 }); return r; });
    // correlation chart
    R(g, 30, 200, 460, 250, { fill: '#05080b', stroke: K.line, rx: 8 }); T(g, 46, 222, 'simulated vs measured temperatures (example)', { fill: K.muted, 'font-size': 12 });
    L(g, 60, 430, 470, 430, { stroke: K.line }); L(g, 60, 430, 60, 240, { stroke: K.line }); P(g, 'M60 430 L470 240', { stroke: K.muted, 'stroke-dasharray': '4 4' });
    const pts = [[0.2, 0.25], [0.35, 0.32], [0.5, 0.55], [0.62, 0.6], [0.75, 0.82], [0.85, 0.8], [0.9, 0.95]].map(([a, b2]) => O(g, 60 + a * 410, 430 - b2 * 190, 5, { fill: K.acc }));
    T(g, 260, 446, 'points on the diagonal = model you can trust', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 11.5 });
    R(g, 510, 200, 460, 380, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 526, 226, 'WHAT YOU SHOULD ASK FOR', K.text);
    ['Worst-case conditions: max power, max coolant', 'temperature, min flow, end-of-life TIM, altitude.', 'Margins to every limit: Tj, ring tuning range,', 'laser case temperature, adhesive / solder limits.', 'Sensitivity: which parameter moves Tj most?', '(usually TIM, flow, coolant temperature)', 'Transient cases: load steps, pump failure,', 'flow loss: how long until throttling or shutdown?', 'Correlation to hardware from the last build.', 'Telemetry thresholds derived from the model.'].forEach((s, i) => T(g, 526, 254 + i * 30, s, { 'font-size': 12.8, fill: i % 2 ? K.muted : K.text }));
    R(g, 30, 470, 460, 110, { fill: K.panel, stroke: K.line, rx: 10 });
    T(g, 46, 498, 'Hand calcs first, simulation second, measurement always.', { 'font-size': 13, fill: K.acc });
    T(g, 46, 522, 'A model that has never been correlated to', { 'font-size': 13 }); T(g, 46, 544, 'hardware is a hypothesis, not a result.', { 'font-size': 13 });
    return { hot: [], update(t) { const k = Math.floor(t * 0.8) % boxes.length; bx.forEach((r, i) => r.setAttribute('fill', i === k ? '#1d2a10' : K.panel)); pts.forEach((p2, i) => p2.setAttribute('r', 5 + 1.5 * Math.sin(t * 3 + i))); } };
  }

  // ================================================================ levels
  const LV = [
    { id: 'th-map', name: 'Heat sources', scene: sMap, title: 'Where the heat comes from', sub: 'Power map of a CPO package',
      plain: 'Every watt of electrical power becomes heat. In a CPO switch most of it comes from the <b>switch ASIC</b> (hundreds of watts, with hot spots), and some from the <b>optical engines</b> right next to it. Lasers are deliberately kept outside, at the front panel.',
      body: '<p>Thermal design has two goals at once: keep each part below its <b>absolute limit</b> (junction temperature, adhesive limits), and keep temperature-sensitive optics <b>stable</b>. The second goal is what makes CPO thermal design different from a normal switch.</p>',
      facts: [['100s of W', 'switch ASIC power class', 'typ'], ['~0.08 nm/K', 'ring resonance drift', 'typ'], ['Liquid', 'cooled CPO switch', 'nv'], ['1st law', 'all power → heat', 'typ']],
      cpoTxt: 'You will own the <b>thermal budget</b>: the power of every heat source (from the power budget), each one\'s temperature limit, and the margin between them under worst-case conditions. It ties the power, optical and reliability budgets together.',
      more: 'Power maps matter more than totals: 600 W spread evenly is easy, while 600 W with a few dense hot spots is hard.', links: [['architecture/thermal-system', 'Thermal system in the explorer']] },
    { id: 'th-modes', name: 'Conduction, convection, radiation', scene: sModes, title: 'Three ways heat moves', sub: 'Conduction, convection, radiation',
      plain: '<b>Conduction</b>: heat passes through solids. <b>Convection</b>: a moving fluid carries heat away from a surface. <b>Radiation</b>: surfaces emit infrared. In a liquid-cooled CPO package, conduction carries the heat out of the chips and convection into the coolant removes it. Radiation is negligible.',
      body: '<p>Fourier\'s law (q = −k·A·dT/dx) governs conduction; Newton\'s law of cooling (q = h·A·ΔT) is the engineering model for convection. Everything else is details: material properties k, flow conditions h, areas and thicknesses.</p>',
      facts: [['k (W/m·K)', 'conductivity', 'typ'], ['h (W/m²·K)', 'convection coefficient', 'typ'], ['×3,500', 'water vs air, heat per volume', 'typ'], ['ε·σ·T⁴', 'radiation, small here', 'typ']],
      cpoTxt: 'Know which mechanism limits each path. Sideways heat flow from ASIC to engines is conduction (design the thermal breaks). The cold plate is convection (flow, fins, coolant temperature).',
      more: 'Heat diffusion has the same mathematics as other diffusion problems, so your FEA background carries over directly.', links: [] },
    { id: 'th-network', name: 'θ network', scene: sNetwork, title: 'The thermal resistance network', sub: 'Ohm\'s law for heat',
      plain: 'Think of heat flowing through a <b>chain of thermal resistances</b>: die → TIM1 → lid → TIM2 → cold plate → coolant. Each one costs a temperature drop ΔT = P × θ. Add them up and you get the chip temperature: <b>Tj = T_coolant + P × Σθ</b>.',
      body: '<p>This one-dimensional stack is the first model every thermal engineer builds. Parallel paths (heat leaking into the substrate and board) are added like parallel resistors. The biggest θ in the chain is where improvement pays off most: often the TIMs.</p>',
      facts: [['ΔT = P·θ', 'per layer', 'typ'], ['°C/W', 'unit of θ', 'typ'], ['TIMs', 'often the largest θ', 'typ'], ['Tj limit', '~95–105 °C class for ASICs', 'typ']],
      cpoTxt: 'This is the thermal equivalent of the optical link budget: a sum of losses from source to sink, compared with a limit, with margin. Run it at worst case (max power, max coolant temperature, end-of-life TIM).',
      more: 'Electrical analogy: P is current, ΔT is voltage, θ is resistance. The Electronics course uses the same algebra.', links: [] },
    { id: 'th-tim', name: 'TIMs', scene: sTim, title: 'Thermal interface materials', sub: 'Filling the microscopic gaps between surfaces',
      plain: 'Two "flat" metal surfaces actually touch at only a few percent of their area. The rest is air, which barely conducts heat. A <b>TIM</b> (grease, gel, phase-change, solder, liquid metal) fills the gaps. The thinner the layer (<b>BLT</b>) and the more conductive the material, the better.',
      body: '<p>θ_TIM ≈ BLT/(k·A) plus contact resistances. TIM performance depends heavily on <b>mechanics</b>: clamping pressure, flatness, warpage, and how the gap changes over thermal cycles (pump-out, dry-out, voids).</p>',
      facts: [['3–8 W/m·K', 'greases', 'typ'], ['~50–80 W/m·K', 'solder / indium', 'typ'], ['10s of µm', 'typical BLT', 'typ'], ['pump-out', 'main aging mechanism of greases', 'typ']],
      cpoTxt: 'A CPO package has parts of <b>different heights</b> (ASIC, engines, maybe stiffeners) under one cold plate. TIM selection, gap tolerances and load distribution become system decisions that link mechanics, thermal and optics.',
      more: 'Ask for TIM reliability data under thermal cycling and the end-of-life θ value used in the budget, not just the fresh value.', links: [] },
    { id: 'th-spread', name: 'Spreading & hot spots', scene: sSpread, title: 'Spreading resistance and hot spots', sub: 'From a small source to a large sink',
      plain: 'Heat leaves the die through a small area and must <b>fan out sideways</b> to use the whole cold plate. That costs temperature (<b>spreading resistance</b>). Highly conductive lids (copper) or vapor chambers spread heat better. <b>Hot spots</b>, small dense regions of the die, run hotter than the average.',
      body: '<p>Conductivities span 5 orders of magnitude, from air (0.026) to diamond (~2000 W/m·K). Choosing the right material at each layer, and its thickness, is classic thermal design.</p>',
      facts: [['~390 W/m·K', 'copper', 'typ'], ['~150 W/m·K', 'silicon', 'typ'], ['+10 °C', 'hot spot above die average (order)', 'est'], ['vapor chamber', 'very high effective spreading', 'typ']],
      cpoTxt: 'Good spreading also spreads heat <b>toward the engines</b>. Spreading the ASIC heat helps the ASIC but can hurt the optics, so the spreader geometry is a trade-off between the two.',
      more: 'Graphite and diamond spreaders are anisotropic or expensive. They appear in high-end designs where every degree matters.', links: [] },
    { id: 'th-coldplate', name: 'Cold plates', scene: sColdplate, title: 'Liquid cold plates', sub: 'Convection through microchannels',
      plain: 'Under the package sits a metal <b>cold plate</b> with many thin fins. Coolant flows through the channels between them. The fins multiply the wetted area, so a small plate can remove hundreds of watts. More flow means lower temperatures, but higher pressure drop and pump power.',
      body: '<p>Performance ≈ h × wetted area × fin efficiency. Laminar microchannel flow has modest h but huge area. Turbulent or jet-impingement designs raise h further. Which component sees the coolant <b>first</b> (upstream) matters: downstream parts see pre-heated coolant.</p>',
      facts: [['1,000–20,000+', 'h for forced liquid (W/m²K)', 'typ'], ['25–250', 'h for forced air', 'typ'], ['0.1–0.5 mm', 'microchannel fin width', 'typ'], ['Δp', 'pressure drop vs flow trade', 'typ']],
      cpoTxt: 'Decisions to drive: one shared cold plate or zones for ASIC and engines; the coolant ordering; mounting force vs package warpage and fiber stability; leak and condensation protection.',
      more: 'Single-phase water cooling dominates today; two-phase (boiling) cooling removes more heat per kg of fluid and is an active industry topic.', links: [['architecture/cold-plate', 'Cold plate in the explorer']] },
    { id: 'th-loop', name: 'Coolant loop', scene: sLoop, title: 'The coolant loop and energy balance', sub: 'From package to outside air',
      plain: 'Coolant carries the heat from the cold plate to a <b>CDU</b> (heat exchanger + pump), which hands it to the facility water, which rejects it to outside air. The rule for every stage: <b>Q = ṁ·cp·ΔT</b>. Heat equals mass flow × specific heat × temperature rise.',
      body: '<p>The 2nd law means every stage needs a temperature difference to push heat downhill. Warmer coolant lets the facility reject heat without chillers (better PUE), but the chips and optics then run hotter. The inlet temperature is a site-level decision that sets your component margins.</p>',
      facts: [['4.18 kJ/kg·K', 'water specific heat', 'typ'], ['~30–45 °C', 'warm-water supply range', 'typ'], ['5–15 °C', 'typical rise across a rack', 'typ'], ['PUE ~1.1–1.3', 'liquid-cooled facility', 'typ']],
      cpoTxt: 'Know your product\'s <b>allowed coolant inlet range, minimum flow and maximum pressure drop</b>, and what happens on pump failure or flow loss (alarms, throttling, safe shutdown). These are system-level requirements you will write.',
      more: 'Q = ṁ·cp·ΔT also gives a quick sanity check on any thermal claim: if the outlet is only 2 °C warmer at the stated flow, the claimed power can\'t be right.', links: [['architecture/coolant-loop', 'Coolant loop in the explorer']] },
    { id: 'th-crosstalk', name: 'Thermal crosstalk', scene: sCrosstalk, title: 'Thermal crosstalk into the optics', sub: 'The defining CPO thermal problem',
      plain: 'The ASIC\'s heat flows <b>sideways</b> into the optical engines. When traffic ramps up, the rings warm up and their resonance drifts. About <b>1 °C</b> uncorrected is enough to break a link. Ring heaters must have enough range to compensate, and that range costs power.',
      body: '<p>The required heater range is roughly proportional to the worst-case temperature swing at the rings. Every degree of thermal isolation between ASIC and engines saves heater power, which shows up in energy per bit. It also reduces the work of the lock loop.</p>',
      facts: [['~0.07–0.1 nm/°C', 'ring drift', 'typ'], ['~0.1 nm', 'ring linewidth', 'typ'], ['~1 °C', 'uncorrected swing that breaks a link', 'est'], ['0.1–0.3 nm/mW', 'heater tuning efficiency', 'typ']],
      cpoTxt: 'Here the thermal, optical, power and control designs meet. As system engineer you set the requirement, e.g. "ring temperature swing ≤ X °C over the full load range at the hottest coolant", and make sure thermal design, heater range and lock-loop speed all close against it.',
      more: 'Validation: load-step tests at hot and cold coolant temperatures, recording ring temperatures and heater codes (see Case Study 2).', links: [['cpo-course/cs-ringlock', 'CPO course: ring lock'], ['cases/case-thermal', 'Case study: errors on job start']] },
    { id: 'th-transient', name: 'Transients', scene: sTransient, title: 'Thermal transients', sub: 'Every layer has its own time constant',
      plain: 'Each layer stores heat (thermal capacitance) as well as resisting it. The die heats in <b>milliseconds</b>, the lid in tenths of a second, the cold plate in seconds, the coolant loop in tens of seconds. A sudden power step climbs through all of them.',
      body: '<p>A chain of RC stages (Cauer ladder) models this. Control loops must react faster than the temperature changes they compensate: the ring-lock loop must beat the package\'s rise time. Measured step responses (structure functions) reveal degraded layers such as a TIM that has dried out.</p>',
      facts: [['ms', 'die time constant', 'typ'], ['~s', 'cold plate', 'typ'], ['10s of s', 'coolant loop', 'typ'], ['τ = R_th·C_th', 'per layer', 'typ']],
      cpoTxt: 'Transient requirements are easy to forget: maximum dT/dt at the rings, behaviour on pump failure (how many seconds until shutdown?), and behaviour at power-on from cold.',
      more: 'The same mathematics as damped mechanical systems, except thermal "modes" are always overdamped: no overshoot or ringing.', links: [] },
    { id: 'th-laser', name: 'Lasers & heat', scene: sLaser, title: 'Lasers and temperature', sub: 'Why lasers live at the front panel',
      plain: 'Hot lasers need <b>more current</b> to start (threshold rises), give <b>less light per mA</b>, <b>drift in wavelength</b> (~0.1 nm/°C) and <b>age faster</b>. Keeping them away from the ASIC, in front-panel modules, is a thermal decision as much as a serviceability one.',
      body: '<p>Laser modules still need their own thermal design: case-temperature limits, front-panel airflow or liquid cooling, driver heat, and optionally a TEC (which pumps heat but costs extra power).</p>',
      facts: [['~0.1 nm/°C', 'DFB laser wavelength drift', 'typ'], ['~10–15 °C', 'hotter ≈ half the life (order)', 'est'], ['TEC', 'active cooling, extra power', 'typ'], ['front panel', 'external laser sources', 'nv']],
      cpoTxt: 'Laser temperature sits in three budgets at once: optical (power and wavelength), thermal (case limit) and reliability (aging rate). Make sure all three use the <b>same temperature assumption</b>.',
      more: 'The Reliability Statistics course shows how to turn temperature into acceleration factors and FIT.', links: [['architecture/external-laser', 'External laser in the explorer'], ['reliability', 'Reliability Statistics course']] },
    { id: 'th-mech', name: 'Thermo-mechanics', scene: sMech, title: 'Thermo-mechanics', sub: 'Temperature moves things, and optics hate movement',
      plain: 'Materials expand by different amounts when heated (CTE). The package <b>bows</b>, interfaces shear, and the <b>fiber can shift</b> relative to its coupler by fractions of a micrometre. For single-mode fiber that is already a measurable loss.',
      body: '<p>Coupling loss grows roughly with the square of the lateral offset relative to the mode size, so sub-µm shifts matter. Adhesive creep, TIM pump-out and solder fatigue are all thermo-mechanical aging mechanisms.</p>',
      facts: [['~3 ppm/K', 'silicon CTE', 'typ'], ['10–17 ppm/K', 'organic substrate / copper', 'typ'], ['~1 µm', 'single-mode alignment tolerance order', 'typ'], ['Coffin-Manson', 'solder fatigue model', 'typ']],
      cpoTxt: 'This is where your mechanics background is a direct advantage. Owning the link between <b>temperature, deformation and optical loss</b> (and putting it into the link budget) is a valuable contribution few others can make.',
      more: 'See also the Optics Manufacturing course (fiber attach) and the Electronics course (board thermal & mechanics).', links: [['optics-mfg', 'Optics Manufacturing course']] },
    { id: 'th-test', name: 'Test & simulation', scene: sTest, title: 'Predicting and proving thermal performance', sub: 'Hand calcs, CFD/FEA, test vehicles, correlation',
      plain: 'Start with <b>hand calculations</b>, refine with <b>CFD/FEA</b>, build <b>thermal test vehicles</b> (packages with heaters and sensors), measure, and <b>correlate</b> the model until it matches. Only a correlated model can predict worst cases you can\'t easily test.',
      body: '<p>Ask for results at worst-case conditions, margins to every limit, sensitivity analysis, transient cases, and correlation to the previous build. Telemetry alarm thresholds should come from the same model.</p>',
      facts: [['TTV', 'thermal test vehicle', 'typ'], ['IR camera', 'surface maps', 'typ'], ['on-die sensors', 'junction temperature', 'typ'], ['correlation', 'model ↔ measurement', 'typ']],
      cpoTxt: 'The next pages let you run the key calculations yourself: a full thermal stack, the coolant energy balance, and a transient load step with the resulting ring drift.',
      more: '', links: [] }
  ];

  // ================================================================ calculators
  function stackCalc(p) {
    CE.sliders(p, 'Thermal stack: junction to coolant', [
      ['P', 'ASIC power', 100, 1200, 10, 600, 'W', 'est'], ['A', 'Die / contact area', 200, 2500, 50, 800, 'mm²', 'est'],
      ['b1', 'TIM1 bond line', 5, 100, 1, 30, 'µm', 'typ'], ['k1', 'TIM1 conductivity', 1, 80, 1, 5, 'W/m·K', 'typ'],
      ['lid', 'Lid / spreader θ', 0.002, 0.05, 0.001, 0.01, '°C/W', 'est'],
      ['b2', 'TIM2 bond line', 10, 200, 5, 50, 'µm', 'typ'], ['k2', 'TIM2 conductivity', 1, 20, 0.5, 5, 'W/m·K', 'typ'],
      ['cp', 'Cold plate + convection θ', 0.01, 0.1, 0.002, 0.03, '°C/W', 'est'], ['Tc', 'Coolant inlet', 20, 50, 1, 35, '°C', 'typ']], (v, el) => {
      const A1 = v.A * 1e-6, A2 = A1 * 2.2;
      const items = [['TIM1', (v.b1 * 1e-6) / (v.k1 * A1)], ['Lid / spreader', v.lid], ['TIM2', (v.b2 * 1e-6) / (v.k2 * A2)], ['Cold plate + conv.', v.cp]];
      const tot = items.reduce((a, x) => a + x[1], 0), Tj = v.Tc + v.P * tot, mx = Math.max(...items.map(x => x[1] * v.P));
      el.innerHTML = '<div class="af-out">' + fx(Tj.toFixed(0) + ' °C', 'junction temperature Tj') + fx(tot.toFixed(3) + ' °C/W', 'total θ junction→coolant') + fx((v.P * tot).toFixed(0) + ' °C', 'rise above coolant') + '</div>' +
        '<div class="af-bars">' + items.map(([n, r]) => '<div class="af-hbar"><span>' + n + '</span><div class="tr"><i style="width:' + (100 * r * v.P / mx).toFixed(1) + '%;background:var(--therm)"></i></div><output>' + (r * v.P).toFixed(1) + ' °C</output></div>').join('') + '</div>' +
        '<div class="callout' + (Tj > 105 ? ' warn' : '') + '">' + (Tj > 105 ? 'Above a typical ~105 °C junction limit. The biggest bar is your best lever: thinner or better TIM, more contact area, a better cold plate, or colder coolant (which costs the facility efficiency).' : 'Within a typical limit. Now check the same stack at end of life (TIM degraded), maximum coolant temperature and minimum flow.') + '</div>';
    }, 'TIM2 area assumed ~2.2× die area (spread by the lid). Simplified 1-D model ' + B('est') + '.');
  }
  function flowCalc(p) {
    CE.sliders(p, 'Coolant energy balance', [['Q', 'Heat load', 200, 6000, 100, 2000, 'W', 'est'], ['F', 'Flow rate', 0.2, 10, 0.1, 2, 'L/min', 'typ'], ['g', 'Glycol fraction', 0, 50, 5, 25, '%', 'typ'], ['Tin', 'Inlet temperature', 15, 50, 1, 35, '°C', 'typ']], (v, el) => {
      const cp = 4180 - 12 * v.g, rho = 1000 + 1.4 * v.g, m = v.F / 60 / 1000 * rho, dT = v.Q / (m * cp), Tout = v.Tin + dT;
      el.innerHTML = '<div class="af-out">' + fx(dT.toFixed(1) + ' °C', 'coolant temperature rise') + fx(Tout.toFixed(1) + ' °C', 'outlet temperature') + fx((m * 1000).toFixed(1) + ' g/s', 'mass flow') + fx((cp / 1000).toFixed(2) + ' kJ/kg·K', 'specific heat (approx.)', 'typ') + fx((v.F * 60).toFixed(0) + ' L/h', 'volume flow') + fx((v.Q / (v.F)).toFixed(0) + ' W per L/min', 'heat per unit flow') + '</div>' +
        '<div class="callout' + (dT > 15 ? ' warn' : '') + '">' + (dT > 15 ? 'A large rise means downstream parts see much warmer coolant. Raise the flow (costs pressure drop and pump power) or split the loop.' : 'Reasonable. Remember the cold plate also needs a temperature difference between metal and coolant on top of this bulk rise.') + ' Glycol protects against freezing and corrosion but carries ~5–10 % less heat per kg than water.</div>';
    });
  }
  function transCalc(p) {
    CE.sliders(p, 'Load step: ASIC power and ring temperature', [['dP', 'ASIC power step', 50, 600, 10, 300, 'W', 'est'], ['th', 'Coupling θ (ASIC → ring)', 0.002, 0.03, 0.001, 0.01, '°C/W', 'est'], ['tau', 'Thermal time constant at the ring', 0.05, 5, 0.05, 0.8, 's', 'est'], ['loop', 'Ring-lock loop response time', 0.01, 3, 0.01, 0.1, 's', 'est']], (v, el) => {
      const dT = v.dP * v.th, drift = dT * 0.08, worst = dT * Math.min(1, v.loop / v.tau) * 0.08;
      let svg = '<svg viewBox="0 0 560 200" style="width:100%;height:auto;background:#05070a;border:1px solid var(--line);border-radius:10px"><text x="10" y="18" fill="#e6edf5" font-size="12.5" font-weight="700">ring temperature rise after the step</text>';
      let a = '', b2 = ''; const tm = 5 * v.tau;
      for (let i = 0; i <= 200; i++) { const t = i / 200 * tm, T1 = dT * (1 - Math.exp(-t / v.tau)); const err = t < v.loop ? T1 : T1 * Math.exp(-(t - v.loop) / (v.loop * 0.5 + 0.001)) * Math.min(1, v.loop / v.tau); a += (i ? 'L' : 'M') + (30 + i * 2.6) + ' ' + (180 - T1 / Math.max(dT, 0.1) * 140).toFixed(1); b2 += (i ? 'L' : 'M') + (30 + i * 2.6) + ' ' + (180 - Math.max(0, err) / Math.max(dT, 0.1) * 140).toFixed(1); }
      svg += '<path d="' + a + '" fill="none" stroke="#ff4d5e" stroke-width="2.5" stroke-dasharray="5 4"/><path d="' + b2 + '" fill="none" stroke="#76b900" stroke-width="2.5"/><text x="550" y="196" text-anchor="end" fill="#8a99ad" font-size="11">red: ring temperature · green: residual error left by the lock loop</text></svg>';
      el.innerHTML = '<div class="af-out">' + fx(dT.toFixed(1) + ' °C', 'ring temperature rise') + fx(drift.toFixed(2) + ' nm', 'uncorrected resonance drift (0.08 nm/K)') + fx(worst.toFixed(3) + ' nm', 'peak error with the lock loop') + '</div>' + svg +
        '<div class="callout' + (worst > 0.03 ? ' warn' : '') + '" style="margin-top:10px">' + (worst > 0.03 ? 'The loop is too slow compared with the thermal time constant: the ring slides off resonance during the step. Speed up the loop, add feed-forward from ASIC power telemetry, or reduce the coupling θ (thermal isolation).' : 'The lock loop keeps up: the residual error stays a small fraction of the ~0.1 nm ring linewidth.') + '</div>';
    }, 'Simplified first-order model ' + B('est') + '. Real packages have several time constants.');
  }

  // ================================================================ appendix
  const APX = [
    { id: 'apx-thermo', short: 'Thermodynamics basics', title: 'Thermodynamics basics for data-center cooling',
      lead: 'The laws, quantities and efficiency metrics behind every cooling discussion.',
      html: '<h3>1 · The laws in one line each</h3><table class="table">' +
        '<tr><td><b>0th</b></td><td>Temperature is well defined; things in contact reach the same temperature.</td></tr>' +
        '<tr><td><b>1st</b></td><td>Energy is conserved: in steady state, electrical power in = heat out. Q = ṁ·cp·ΔT for a flowing fluid.</td></tr>' +
        '<tr><td><b>2nd</b></td><td>Heat flows from hot to cold on its own. Moving it "uphill" (a chiller, a TEC) costs work, and the colder you need it, the more work.</td></tr>' +
        '<tr><td><b>3rd</b></td><td>You cannot reach absolute zero (not relevant to switches!).</td></tr></table>' +
        '<h3>2 · Quantities</h3><table class="table"><tr><td>Specific heat cp</td><td>energy to warm 1 kg by 1 K (water 4.18 kJ/kg·K, air ~1.0)</td></tr><tr><td>Enthalpy</td><td>energy content of a flowing fluid; differences give heat carried</td></tr><tr><td>Latent heat</td><td>energy absorbed when boiling (two-phase cooling uses it: ~2,260 kJ/kg for water at 100 °C)</td></tr><tr><td>COP</td><td>heat moved ÷ work used by a chiller or heat pump</td></tr></table>' +
        '<h3>3 · Facility efficiency</h3><p><b>PUE</b> = total facility power ÷ IT power. Chillers raise PUE, so warm-water cooling that rejects heat directly to outside air (dry coolers) lowers it. Warmer water, however, means hotter chips and optics, so the inlet temperature is a facility vs component trade-off. Waste heat at 40–50 °C can even heat buildings.</p>' +
        '<div class="callout">2nd-law sanity check: a TEC that cools a laser by 20 °C typically consumes more electrical power than the heat it pumps. That heat must then also be removed.</div>' },
    { id: 'apx-props', short: 'Properties & coefficients', title: 'Material properties and heat-transfer coefficients',
      lead: 'Typical values for quick estimates (always check the specific datasheet).',
      html: '<table class="table"><tr><th>Material</th><th>k (W/m·K)</th><th>CTE (ppm/K)</th><th>Note</th></tr>' +
        '<tr><td>Copper</td><td>~390</td><td>~17</td><td>lids, cold plates, spreaders</td></tr><tr><td>Aluminium</td><td>~200</td><td>~23</td><td>cheaper, lighter cold plates</td></tr><tr><td>Silicon</td><td>~150</td><td>~2.6–3</td><td>dies, PIC, EIC</td></tr><tr><td>Diamond (CVD)</td><td>~1,000–2,000</td><td>~1</td><td>premium heat spreader</td></tr><tr><td>Solder (SAC)</td><td>~50–60</td><td>~20</td><td>bumps, BGA</td></tr><tr><td>Indium</td><td>~80</td><td>~30</td><td>soft metal TIM</td></tr><tr><td>Organic substrate</td><td>~0.5–1 (through)</td><td>~10–17</td><td>package substrate</td></tr><tr><td>FR-4 / PCB</td><td>~0.3 (through)</td><td>~14–17 (x/y)</td><td>copper planes raise in-plane k a lot</td></tr><tr><td>Glass / fused silica</td><td>~1–1.4</td><td>~0.5</td><td>fibers, glass substrates</td></tr><tr><td>Water</td><td>0.6</td><td>—</td><td>cp 4.18 kJ/kg·K</td></tr><tr><td>Air</td><td>0.026</td><td>—</td><td>cp ~1.0 kJ/kg·K</td></tr></table>' +
        '<h3>Heat-transfer coefficient h (W/m²·K)</h3><table class="table"><tr><td>Natural convection, air</td><td>5–25</td></tr><tr><td>Forced convection, air</td><td>25–250</td></tr><tr><td>Forced convection, water</td><td>1,000–20,000</td></tr><tr><td>Microchannels / jet impingement</td><td>10,000–100,000+</td></tr><tr><td>Boiling (two-phase)</td><td>10,000–100,000+</td></tr></table>' +
        '<p class="muted">All values ' + B('typ') + ' orders of magnitude for estimates.</p>' },
    { id: 'apx-fluids', short: 'Fluids & dimensionless numbers', title: 'Fluid flow and dimensionless numbers',
      lead: 'The handful of correlations behind cold-plate design.',
      html: '<div class="eq">Re = ρ·v·D / μ        laminar < ~2,300 < turbulent (pipes)\nPr = μ·cp / k         water ≈ 7, air ≈ 0.7\nNu = h·D / k          (dimensionless h)\nLaminar, fully developed: Nu ≈ 3.66 (constant wall T) – 4.36 (constant flux)\nTurbulent (Dittus-Boelter): Nu ≈ 0.023 · Re^0.8 · Pr^0.4\nPressure drop: Δp = f · (L/D) · ½ρv²       pump power = Δp · volume flow / η_pump\nHydraulic diameter: D_h = 4·Area / wetted perimeter</div>' +
        '<p><b>What it means:</b> in laminar microchannels, h ≈ Nu·k/D grows as channels shrink, so narrow channels give high h even without turbulence, at the cost of pressure drop. Doubling the flow in turbulent flow raises h by ~1.7× (Re^0.8) but pressure drop by ~3.5× (∝ v^1.8).</p>' +
        '<h3>Fin efficiency</h3><p>Thin, tall fins don\'t stay at the base temperature: their tips run cooler and contribute less. Fin efficiency η_f = tanh(mL)/(mL), with m = √(h·P/(k·A_c)). Copper fins stay efficient where aluminium ones start to lose.</p>' },
    { id: 'apx-thform', short: 'Thermal formula sheet', title: 'Thermal formula sheet',
      lead: 'Everything from this course on one page.',
      html: '<div class="eq">Conduction:       q = k·A·ΔT / L           θ_cond = L / (k·A)\nConvection:       q = h·A·ΔT               θ_conv = 1 / (h·A)\nRadiation:        q = ε·σ·A·(T₁⁴ − T₂⁴)     σ = 5.67e-8 W/m²K⁴\nStack:            Tj = T_coolant + P·Σθ\nParallel paths:   1/θ_tot = Σ 1/θ_i\nFluid:            Q = ṁ·cp·ΔT              1 L/min water ≈ 0.0167 kg/s\nTransient:        T(t) = ΔT_ss·(1 − e^(−t/τ))    τ = R_th·C_th,  C_th = m·cp\nRing drift:       Δλ ≈ 0.07–0.1 nm/K        heater: 0.1–0.3 nm/mW\nLaser:            Δλ ≈ 0.1 nm/K (DFB)\nCTE strain:       ε = Δα·ΔT                 (e.g. 14 ppm/K × 50 K = 0.07 %)\nArrhenius:        AF = exp[(Ea/k)·(1/T_use − 1/T_stress)],  k = 8.617e-5 eV/K</div>' }
  ];

  CE.register({
    id: 'thermal-course', title: 'Thermal & Heat Transfer', icon: '🌡️', order: 9.1, storeKey: 'th-last-step',
    levels: LV, levelCh: 'Heat in a CPO package', levelBoxTitle: '🛠 What this means for you as system engineer',
    finish: { go: 'optics-mfg', label: 'Continue: Optics Manufacturing →' },
    pages: [
      CE.startPage({ eyebrow: 'Guided course · about 60 minutes', title: '<em>Thermodynamics</em> and <em>heat transfer</em> for CPO packaging',
        intro: 'How heat is generated, conducted, spread and carried away in a liquid-cooled CPO switch, and why it matters so much for the <b>optics</b>. Built for a mechanics engineer: Fourier, Newton, energy balances, time constants and CTE, all applied to the package where the switch chip sits next to temperature-sensitive rings. Just press <b>Next</b>.',
        analogy: [['🔥', 'Heat sources', 'ASIC, engines, VRMs, lasers'], ['🧱', 'Thermal path', 'resistances in series, Ohm\'s law for heat'], ['💧', 'Coolant', 'Q = ṁ·cp·ΔT'], ['💍', 'Rings', '~0.08 nm per °C: thermal = optical']],
        route: ['<b>Heat in a CPO package, 12 steps:</b> heat sources → conduction/convection/radiation → the θ network → TIMs → spreading & hot spots → cold plates → coolant loop → thermal crosstalk into the optics → transients → lasers & temperature → thermo-mechanics → test & simulation.', '<b>Calculators, 3 steps:</b> thermal stack (Tj), coolant energy balance, load step & ring drift.', '<b>Appendix, 4 chapters:</b> thermodynamics basics, material properties, fluids & dimensionless numbers, formula sheet.'] }),
      '@levels',
      CE.page('th-calc-stack', 'Calculator: thermal stack', 'Calculators', 'Calculate the junction temperature', 'Build the junction-to-coolant stack layer by layer. The biggest bar is where improvement pays most.', stackCalc),
      CE.page('th-calc-flow', 'Calculator: coolant flow', 'Calculators', 'Coolant energy balance', 'How much flow does a given heat load need, and how warm does the coolant get?', flowCalc),
      CE.page('th-calc-step', 'Calculator: load step & ring drift', 'Calculators', 'A load step, the ring temperature and the lock loop', 'Combine thermal coupling, time constant and loop speed to see whether the rings stay locked when traffic ramps.', transCalc)
    ].concat(CE.appendixPages(APX)).concat([
      CE.donePage({ title: 'Heat is now part of your <em>optical budget</em>', takeaways: [
        'All power becomes heat; the path from <b>junction to coolant</b> is a series of thermal resistances: Tj = T_coolant + P·Σθ.',
        '<b>TIMs, spreading and the cold plate</b> dominate the budget, and their performance depends on mechanics (pressure, flatness, warpage, aging).',
        '<b>Q = ṁ·cp·ΔT</b> sizes the coolant flow; warmer coolant improves facility efficiency (PUE) but costs component margin.',
        '<b>Thermal crosstalk</b> from ASIC to rings is the defining CPO thermal problem; it sets heater range (power) and lock-loop speed.',
        'Lasers are kept at the front panel because heat hurts their efficiency, wavelength and life.',
        'Thermo-mechanical movement of fractions of a µm changes fiber coupling: <b>your mechanics expertise protects the optical budget</b>.'],
        next: [['Continue: Optics Manufacturing →', 'optics-mfg'], ['Thermal budget tab', 'budgets/thermal']],
        warn: 'Values are ' + B('typ') + ' orders of magnitude or ' + B('est') + ' illustrative estimates, not product specifications.' })
    ])
  });
})();
