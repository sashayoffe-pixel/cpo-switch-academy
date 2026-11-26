/* Electronics & Board Design course: for a system engineer coming from mechanics and optics.
   Explains circuits, power delivery, signal integrity and PCB design through mechanical / optical analogies,
   at the level needed to lead design reviews (not to draw schematics). Uses js/course-engine.js. */
(function () {
  'use strict';
  const C = window.CPO;
  const h = C.h, B = C.badge;
  const K = C.course.K;
  const { R, T, L, P, O, G, cap, along, ptsD } = C.course.svg;

  C.addGlossary({
    'Ohm\'s law': { full: 'Ohm\'s law', def: 'V = I × R: the voltage across a resistor equals current times resistance.', cat: 'electrical' },
    'Characteristic impedance': { full: 'Characteristic impedance (Z₀)', def: 'The ratio of voltage to current of a wave travelling along a transmission line, set by its geometry and materials (typically 50 Ω single-ended, ~85–100 Ω differential).', cat: 'electrical' },
    'Reflection coefficient': { full: 'Reflection coefficient Γ', def: 'Fraction of a wave reflected at an impedance change: Γ = (Z₂ − Z₁)/(Z₂ + Z₁). The electrical twin of Fresnel reflection in optics.', cat: 'electrical' },
    'Differential pair': { full: 'Differential pair', def: 'Two traces carrying equal and opposite signals; the receiver looks at the difference, so noise common to both cancels.', cat: 'electrical' },
    'Duty cycle': { full: 'Duty cycle', def: 'Fraction of each switching period a switch is on. For an ideal buck converter D = Vout / Vin.', cat: 'power' }
  });

  // ================================================================ scenes
  function dots(g, n, col, r) { const a = []; for (let k = 0; k < n; k++) a.push(O(g, -9, -9, r || 3, { fill: col })); return a; }
  function run(ds, pts, t, sp, off) { ds.forEach((d, k) => { const p = along(pts, (t * sp + k / ds.length + (off || 0)) % 1); d.setAttribute('cx', p[0]); d.setAttribute('cy', p[1]); }); }
  function box(g, x, y, w, hh, title, sub, col) { R(g, x, y, w, hh, { fill: K.panel, stroke: col || K.line, rx: 8 }); if (title) T(g, x + w / 2, y + hh / 2 + (sub ? -2 : 5), title, { 'text-anchor': 'middle', 'font-size': 13.5, 'font-weight': 700 }); if (sub) T(g, x + w / 2, y + hh / 2 + 16, sub, { 'text-anchor': 'middle', 'font-size': 11.5, fill: K.muted }); }

  function sBasics(g) {
    cap(g, 30, 34, 'THE WATER ANALOGY', K.cool); cap(g, 530, 34, 'THE SAME THING AS A CIRCUIT', K.acc);
    // water
    R(g, 40, 70, 120, 200, { fill: '#0b1220', stroke: K.cool, rx: 6 });
    const lvl = R(g, 42, 110, 116, 158, { fill: K.cool, 'fill-opacity': .35, stroke: 'none' });
    T(g, 172, 110, 'water level / pressure', { fill: K.cool, 'font-size': 12.5 }); T(g, 172, 128, '= voltage', { fill: K.cool, 'font-size': 12.5 });
    const pipe = [[160, 250], [430, 250], [430, 420], [100, 420], [100, 270]];
    P(g, ptsD(pipe), { stroke: '#2d4f7a', 'stroke-width': 18, 'stroke-linejoin': 'round' });
    R(g, 260, 241, 80, 18, { fill: '#05070a', stroke: K.cool }); T(g, 300, 233, 'narrow pipe = resistance', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12 });
    T(g, 300, 450, 'flow rate = current', { 'text-anchor': 'middle', fill: K.cool, 'font-size': 12.5 });
    const wd = dots(g, 10, '#9cc7ff', 4);
    // circuit
    const loop = [[600, 120], [900, 120], [900, 400], [600, 400], [600, 120]];
    P(g, ptsD(loop), { stroke: K.copper, 'stroke-width': 4 });
    R(g, 580, 220, 40, 80, { fill: '#1d1a06', stroke: K.power, 'stroke-width': 2 }); T(g, 600, 255, '+', { 'text-anchor': 'middle', fill: K.power, 'font-size': 20 }); T(g, 600, 290, '−', { 'text-anchor': 'middle', fill: K.power, 'font-size': 20 });
    T(g, 560, 262, 'V', { 'text-anchor': 'end', fill: K.power, 'font-size': 18, 'font-weight': 700 });
    P(g, 'M720 120 l10 -14 l20 28 l20 -28 l20 28 l20 -28 l10 14', { stroke: K.acc, 'stroke-width': 3, fill: '#0b1016' });
    T(g, 760, 92, 'R (resistor)', { 'text-anchor': 'middle', fill: K.acc, 'font-size': 13 });
    const lamp = O(g, 900, 260, 26, { fill: '#2a2205', stroke: K.power, 'stroke-width': 2 });
    T(g, 940, 265, 'load', { fill: K.muted, 'font-size': 12 });
    const ed = dots(g, 14, K.data, 4);
    R(g, 530, 440, 440, 140, { fill: K.panel, stroke: K.line, rx: 10 });
    T(g, 550, 472, 'V = I · R', { 'font-family': 'ui-monospace,monospace', 'font-size': 22, fill: '#d8f5a8' });
    T(g, 550, 506, 'P = V · I = I² · R', { 'font-family': 'ui-monospace,monospace', 'font-size': 20, fill: '#d8f5a8' });
    T(g, 550, 540, 'volts = push · amps = flow · ohms = how narrow · watts = heat', { 'font-size': 12.5, fill: K.muted });
    T(g, 550, 562, 'I² means: double the current → four times the heat in every wire', { 'font-size': 12.5, fill: K.warn });
    R(g, 30, 480, 470, 100, { fill: K.panel, stroke: K.line, rx: 10 });
    T(g, 50, 508, 'Mechanics: force = pressure, velocity = flow, damper = resistor.', { 'font-size': 13 });
    T(g, 50, 532, 'A damper turns motion into heat; a resistor turns current into heat.', { 'font-size': 13 });
    T(g, 50, 556, 'Same equation: F = c · v  ↔  V = R · I.', { 'font-size': 13, fill: K.acc });
    return {
      hot: [{ x: 700, y: 96, w: 140, h: 48, target: 'el-rlc', label: 'Capacitors & inductors' }],
      update(t) { run(wd, pipe, t, 0.18); run(ed, loop, t, 0.15); lamp.setAttribute('fill-opacity', 0.7 + 0.3 * Math.sin(t * 6)); lvl.setAttribute('y', 110 + 4 * Math.sin(t)); }
    };
  }

  function sRlc(g) {
    // capacitor
    box(g, 30, 50, 300, 270, '', '', K.data); cap(g, 46, 74, 'CAPACITOR = SPRING / TANK', K.data);
    L(g, 160, 120, 160, 180, { stroke: K.data, 'stroke-width': 5 }); L(g, 200, 120, 200, 180, { stroke: K.data, 'stroke-width': 5 });
    L(g, 100, 150, 160, 150, { stroke: K.copper, 'stroke-width': 3 }); L(g, 200, 150, 260, 150, { stroke: K.copper, 'stroke-width': 3 });
    const qp = [], qn = []; for (let k = 0; k < 5; k++) { qp.push(T(g, 148, 125 + k * 12, '+', { 'font-size': 12, fill: K.power, 'text-anchor': 'middle' })); qn.push(T(g, 212, 125 + k * 12, '−', { 'font-size': 12, fill: K.cool, 'text-anchor': 'middle' })); }
    T(g, 46, 220, 'stores energy in an electric field', { 'font-size': 12.5 }); T(g, 46, 242, 'resists changes of VOLTAGE', { 'font-size': 12.5, fill: K.acc }); T(g, 46, 264, 'like a spring resists displacement', { 'font-size': 12.5, fill: K.muted }); T(g, 46, 296, 'Q = C·V   ·   E = ½·C·V²', { 'font-family': 'ui-monospace,monospace', 'font-size': 13, fill: '#d8f5a8' });
    // inductor
    box(g, 350, 50, 300, 270, '', '', K.optic); cap(g, 366, 74, 'INDUCTOR = MASS / FLYWHEEL', K.optic);
    let coil = 'M410 150'; for (let k = 0; k < 6; k++) coil += ' a14 18 0 0 1 28 0'; P(g, coil, { stroke: K.optic, 'stroke-width': 4 });
    const fly = G(g, {}); O(fly, 0, 0, 22, { fill: 'none', stroke: K.muted, 'stroke-width': 3 }); L(fly, -22, 0, 22, 0, { stroke: K.muted, 'stroke-width': 3 }); L(fly, 0, -22, 0, 22, { stroke: K.muted, 'stroke-width': 3 });
    T(g, 366, 220, 'stores energy in a magnetic field', { 'font-size': 12.5 }); T(g, 366, 242, 'resists changes of CURRENT', { 'font-size': 12.5, fill: K.acc }); T(g, 366, 264, 'like a mass resists changes of speed', { 'font-size': 12.5, fill: K.muted }); T(g, 366, 296, 'V = L·dI/dt   ·   E = ½·L·I²', { 'font-family': 'ui-monospace,monospace', 'font-size': 13, fill: '#d8f5a8' });
    // RC charge + LC ring
    box(g, 670, 50, 300, 270, '', '', K.acc); cap(g, 686, 74, 'TOGETHER: RC DELAY, LC RESONANCE', K.acc);
    R(g, 686, 90, 268, 100, { fill: '#05080b', stroke: K.line });
    const rc = P(g, '', { stroke: K.data, 'stroke-width': 2.5 }); T(g, 692, 204, 'RC charging: τ = R·C', { 'font-size': 12, fill: K.data });
    R(g, 686, 212, 268, 96, { fill: '#05080b', stroke: K.line });
    const lc = P(g, '', { stroke: K.optic, 'stroke-width': 2.5 });
    const mass = R(g, 0, 0, 26, 20, { fill: K.muted, stroke: 'none', rx: 3 }); const spr = P(g, '', { stroke: K.muted, 'stroke-width': 2 });
    T(g, 692, 300, 'LC ringing: f = 1 / (2π√(LC))', { 'font-size': 12, fill: K.optic });
    R(g, 30, 340, 940, 240, { fill: K.panel, stroke: K.line, rx: 10 });
    cap(g, 50, 368, 'YOUR MECHANICS INTUITION ALREADY WORKS HERE', K.text);
    [['mass m', 'inductance L', 'resists change of velocity ↔ current'], ['spring stiffness k', '1 / capacitance', 'stores energy when compressed ↔ charged'], ['damper c', 'resistance R', 'turns motion ↔ current into heat'], ['natural frequency √(k/m)', '1/√(LC)', 'every PCB power network has resonances'], ['Q of a resonator (optics: ring Q!)', 'Q = (1/R)·√(L/C)', 'high Q = sharp, ringing; low Q = damped']]
      .forEach(([a, b2, c], i) => { T(g, 50, 400 + i * 34, a, { 'font-size': 13.5, fill: K.muted }); T(g, 330, 400 + i * 34, '↔  ' + b2, { 'font-size': 13.5, 'font-weight': 700 }); T(g, 560, 400 + i * 34, c, { 'font-size': 13 }); });
    return {
      hot: [{ x: 26, y: 46, w: 308, h: 278, target: 'el-semis', label: 'Diodes & transistors' }],
      update(t) {
        const u = (t % 4) / 4, chg = 1 - Math.exp(-u * 5);
        qp.forEach((q, k) => q.setAttribute('opacity', k / 5 < chg ? 1 : 0.1)); qn.forEach((q, k) => q.setAttribute('opacity', k / 5 < chg ? 1 : 0.1));
        let d = ''; for (let i = 0; i <= 60; i++) { const x = i / 60; if (x > u) break; d += (i ? 'L' : 'M') + (690 + x * 260) + ' ' + (180 - (1 - Math.exp(-x * 5)) * 80); } rc.setAttribute('d', d);
        let d2 = ''; for (let i = 0; i <= 120; i++) { const x = i / 120; d2 += (i ? 'L' : 'M') + (690 + x * 200) + ' ' + (260 - 35 * Math.exp(-x * 1.5) * Math.cos(x * 30 - t * 0)); } lc.setAttribute('d', d2);
        const yy = 260 + 30 * Math.exp(-((t % 5) * 0.6)) * Math.cos(t * 6);
        mass.setAttribute('x', 912); mass.setAttribute('y', yy - 10);
        let sp = 'M925 220'; for (let k = 1; k <= 8; k++) sp += ' L' + (925 + (k % 2 ? 8 : -8)) + ' ' + (220 + (yy - 10 - 220) * k / 8); spr.setAttribute('d', sp);
        fly.setAttribute('transform', 'translate(600 135) rotate(' + (t * 90 % 360) + ')');
      }
    };
  }

  function sSemis(g) {
    box(g, 30, 50, 300, 300, '', '', K.acc); cap(g, 46, 74, 'DIODE = ONE-WAY VALVE', K.acc);
    P(g, 'M80 170 L270 170', { stroke: K.copper, 'stroke-width': 3 }); P(g, 'M150 140 L150 200 L200 170 Z', { fill: K.acc, stroke: K.acc }); L(g, 202, 140, 202, 200, { stroke: K.acc, 'stroke-width': 4 });
    const dd = dots(g, 6, K.data, 4); const dir = T(g, 180, 230, '', { 'text-anchor': 'middle', 'font-size': 13 });
    T(g, 46, 280, 'current flows one way only', { 'font-size': 12.5 }); T(g, 46, 302, 'protection, rectifiers, and LEDs,', { 'font-size': 12.5, fill: K.muted }); T(g, 46, 324, 'laser diodes and photodiodes are diodes too', { 'font-size': 12.5, fill: K.optic });
    box(g, 350, 50, 300, 300, '', '', K.ctrl); cap(g, 366, 74, 'MOSFET = CONTROLLED VALVE', K.ctrl);
    R(g, 470, 110, 60, 140, { fill: '#0b1016', stroke: K.ctrl, 'stroke-width': 2, rx: 6 }); T(g, 500, 104, 'drain', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 11 }); T(g, 500, 266, 'source', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 11 });
    const gate = R(g, 420, 160, 40, 40, { fill: '#160f24', stroke: K.ctrl, rx: 4 }); T(g, 440, 152, 'gate', { 'text-anchor': 'middle', fill: K.ctrl, 'font-size': 11 });
    const md = dots(g, 6, K.data, 4); const st = T(g, 500, 300, '', { 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700 });
    T(g, 366, 324, 'in every VRM, switch and chip', { 'font-size': 12.5, fill: K.muted });
    box(g, 670, 50, 300, 300, '', '', K.optic); cap(g, 686, 74, 'WHERE IT MEETS YOUR OPTICS', K.optic);
    R(g, 700, 110, 90, 60, { fill: '#2a0f08', stroke: K.optic, rx: 6 }); T(g, 745, 145, 'laser diode', { 'text-anchor': 'middle', 'font-size': 12 });
    R(g, 850, 110, 90, 60, { fill: '#26323f', stroke: K.data, rx: 6 }); T(g, 895, 145, 'photodiode', { 'text-anchor': 'middle', 'font-size': 12 });
    const beam = L(g, 790, 140, 850, 140, { stroke: K.optic, 'stroke-width': 4 });
    T(g, 686, 200, 'Laser: current in → light out', { 'font-size': 12.5 }); T(g, 686, 220, '(above threshold, roughly linear)', { 'font-size': 12, fill: K.muted });
    T(g, 686, 248, 'Photodiode: light in → current out', { 'font-size': 12.5 }); T(g, 686, 268, '(~0.9 A per W at 1310 nm)', { 'font-size': 12, fill: K.muted });
    T(g, 686, 300, 'Modulator ring: a reverse-biased diode', { 'font-size': 12.5, fill: K.acc }); T(g, 686, 320, 'whose voltage shifts its index', { 'font-size': 12.5, fill: K.acc });
    R(g, 30, 370, 940, 210, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 50, 398, 'THE TRANSISTOR AS A SWITCH: WHY POWER AND SPEED TRADE OFF', K.text);
    ['On: tiny resistance (milliohms) → little heat.  Off: no current → no heat.  In between (while switching): BOTH voltage and current → heat.', 'So power converters switch fast (less time in between) but every switch event also charges the gate → switching loss ∝ frequency.', 'Inside chips the same applies: billions of tiny transistors switching costs energy ½·C·V² each time → why chips run at ~0.7 V.', 'A system engineer\'s takeaway: higher frequency = smaller inductors and capacitors, but more switching loss. Classic trade-off.']
      .forEach((s, i) => T(g, 50, 430 + i * 36, s, { 'font-size': 13, fill: i === 3 ? K.acc : K.text }));
    return {
      hot: [{ x: 346, y: 46, w: 308, h: 308, target: 'el-pcb', label: 'The printed circuit board' }],
      update(t) {
        const fwd = Math.floor(t / 2.5) % 2 === 0; dir.textContent = fwd ? '→ forward: flows' : '← reverse: blocked'; dir.setAttribute('fill', fwd ? K.acc : K.bad);
        dd.forEach((d, k) => { const u = (t * 0.5 + k / 6) % 1; const x = fwd ? 80 + u * 190 : 270 - u * 60; d.setAttribute('cx', x); d.setAttribute('cy', 170); d.setAttribute('opacity', fwd ? 1 : 0.6); });
        const on = Math.floor(t / 2) % 2 === 0; gate.setAttribute('fill', on ? '#4a3480' : '#160f24'); st.textContent = on ? 'gate ON → current flows' : 'gate OFF → blocked'; st.setAttribute('fill', on ? K.acc : K.muted);
        md.forEach((d, k) => { const u = (t * 0.6 + k / 6) % 1; d.setAttribute('cx', 500); d.setAttribute('cy', 110 + u * 140); d.setAttribute('opacity', on ? 1 : 0); });
        beam.setAttribute('stroke-opacity', 0.4 + 0.6 * Math.abs(Math.sin(t * 4)));
      }
    };
  }

  function sPcb(g) {
    cap(g, 30, 34, 'A SWITCH BOARD IN CROSS-SECTION (simplified, not to scale)', K.text);
    // package + balls
    R(g, 360, 60, 280, 40, { fill: '#13110a', stroke: '#5a4d2a', rx: 4 }); T(g, 500, 85, 'package (ASIC + optics)', { 'text-anchor': 'middle', 'font-size': 12.5 });
    for (let k = 0; k < 12; k++) O(g, 375 + k * 23, 108, 7, { fill: '#c9c9c9' });
    T(g, 650, 112, '← BGA solder balls', { fill: K.muted, 'font-size': 12 });
    const layers = []; let y = 118;
    for (let i = 0; i < 12; i++) {
      const sig = i % 2 === 0, th = sig ? 16 : 12;
      R(g, 60, y, 880, th, { fill: '#2a2414', stroke: 'none', rx: 0 });
      if (sig) for (let k = 0; k < 14; k++) R(g, 80 + k * 62, y + 5, 30, 6, { fill: K.copper, stroke: 'none', rx: 1 });
      else R(g, 60, y + 3, 880, 6, { fill: K.copper, 'fill-opacity': .85, stroke: 'none', rx: 0 });
      layers.push(y); y += th + 8;
    }
    T(g, 950, 132, 'signal', { fill: K.copper, 'font-size': 11 }); T(g, 950, 156, 'plane', { fill: K.copper, 'font-size': 11 }); T(g, 950, 180, 'dielectric', { fill: '#b0a070', 'font-size': 11 });
    T(g, 60, y + 22, '… real switch boards often have 20–30+ layers; this shows 12', { fill: K.muted, 'font-size': 12 });
    // vias
    R(g, 180, 118, 10, y - 118, { fill: '#c08040', stroke: 'none' }); T(g, 185, y + 46, 'through via', { 'text-anchor': 'middle', fill: K.text, 'font-size': 12 });
    R(g, 330, 118, 10, 70, { fill: '#c08040', stroke: 'none' }); R(g, 330, 188, 10, y - 188, { fill: K.bad, 'fill-opacity': .5, stroke: K.bad, 'stroke-dasharray': '3 3' });
    T(g, 335, y + 46, 'via + stub', { 'text-anchor': 'middle', fill: K.bad, 'font-size': 12 });
    R(g, 760, 118, 10, 70, { fill: '#c08040', stroke: 'none' }); T(g, 765, y + 46, 'backdrilled (stub removed)', { 'text-anchor': 'middle', fill: K.acc, 'font-size': 12 });
    R(g, 860, 118, 12, 20, { fill: '#c08040', stroke: 'none' }); T(g, 866, y + 64, 'microvia (HDI)', { 'text-anchor': 'middle', fill: K.text, 'font-size': 12 });
    const sig = O(g, 0, 0, 6, { fill: '#fff', filter: 'drop-shadow(0 0 6px #22d3ee)' }); const refl = O(g, 0, 0, 4, { fill: K.bad });
    R(g, 30, 470, 940, 110, { fill: K.panel, stroke: K.line, rx: 10 });
    T(g, 50, 498, 'Copper layers (signals and solid power/ground planes) alternate with glass-epoxy dielectric. Planes give signals a return path and spread power.', { 'font-size': 13 });
    T(g, 50, 522, 'Vias connect layers. The unused part of a via (the stub) acts like a little antenna that reflects high-speed signals, so it is drilled away (backdrill).', { 'font-size': 13 });
    T(g, 50, 546, 'For you: the board is a laminated composite. CTE, warpage, flatness and hole reliability are mechanics problems you already understand.', { 'font-size': 13, fill: K.acc });
    return {
      hot: [{ x: 356, y: 56, w: 288, h: 62, target: 'el-power', label: 'Power delivery' }],
      update(t) {
        const u = (t * 0.35) % 1, top = 118, mid = 188, bot = y;
        if (u < 0.5) { const k = u / 0.5; sig.setAttribute('cx', 335); sig.setAttribute('cy', top + (mid - top) * k); refl.setAttribute('cx', -9); }
        else { const k = (u - 0.5) / 0.5; sig.setAttribute('cx', 335 + 400 * k); sig.setAttribute('cy', mid - 4); refl.setAttribute('cx', 335); refl.setAttribute('cy', mid + (bot - mid) * Math.min(1, k * 2) * (k < 0.5 ? 1 : 2 - 2 * k)); }
      }
    };
  }

  function sPower(g) {
    cap(g, 30, 34, 'FROM THE RACK BUSBAR TO 0.75 V AT HUNDREDS OF AMPS', K.text);
    const st = [['48–54 V busbar', 'rack power', K.power], ['Hot-swap / eFuse', 'inrush + fault protection', K.warn], ['IBC 54 → 12 V', 'intermediate bus converter', K.power], ['Multiphase VRM', '12 V → ~0.75 V', K.acc], ['ASIC core', 'hundreds of A', K.acc]];
    const ds = [];
    st.forEach(([a, b2, c], i) => { const x = 30 + i * 194; box(g, x, 60, 170, 70, a, b2, c); if (i < 4) { const pts = [[x + 170, 95], [x + 194, 95]]; L(g, pts[0][0], 95, pts[1][0], 95, { stroke: K.power, 'stroke-width': 3 }); ds.push(pts); } });
    const pd = ds.map(() => dots(g, 1, K.power, 4));
    // buck converter schematic
    cap(g, 30, 175, 'ONE PHASE OF A BUCK CONVERTER', K.text);
    R(g, 30, 190, 560, 230, { fill: '#05080b', stroke: K.line, rx: 8 });
    L(g, 60, 240, 160, 240, { stroke: K.copper, 'stroke-width': 3 }); T(g, 60, 230, '12 V in', { fill: K.power, 'font-size': 12 });
    const sw = L(g, 160, 240, 210, 225, { stroke: K.text, 'stroke-width': 4, 'stroke-linecap': 'round' }); T(g, 185, 214, 'switch', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 11 });
    L(g, 210, 240, 260, 240, { stroke: K.copper, 'stroke-width': 3 });
    let coil = 'M260 240'; for (let k = 0; k < 5; k++) coil += ' a10 14 0 0 1 20 0'; P(g, coil, { stroke: K.optic, 'stroke-width': 3 }); T(g, 310, 222, 'L', { 'text-anchor': 'middle', fill: K.optic, 'font-size': 14, 'font-weight': 700 });
    L(g, 360, 240, 520, 240, { stroke: K.copper, 'stroke-width': 3 }); T(g, 520, 230, '0.75 V out', { 'text-anchor': 'end', fill: K.acc, 'font-size': 12 });
    L(g, 420, 240, 420, 270, { stroke: K.copper, 'stroke-width': 3 }); L(g, 400, 270, 440, 270, { stroke: K.data, 'stroke-width': 4 }); L(g, 400, 280, 440, 280, { stroke: K.data, 'stroke-width': 4 }); T(g, 450, 280, 'C', { fill: K.data, 'font-size': 14, 'font-weight': 700 });
    // waveforms
    R(g, 50, 300, 520, 110, { fill: '#05080b', stroke: 'none' });
    T(g, 56, 318, 'switch node (V)', { fill: K.text, 'font-size': 11 }); T(g, 56, 380, 'inductor current (A)', { fill: K.optic, 'font-size': 11 });
    const sn = P(g, '', { stroke: K.text, 'stroke-width': 2 }), il = P(g, '', { stroke: K.optic, 'stroke-width': 2 });
    R(g, 610, 175, 360, 245, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 626, 200, 'HOW IT WORKS', K.text);
    ['The switch opens and closes ~0.5–1 million times/s.', 'Duty cycle D = Vout / Vin ≈ 0.75 / 12 ≈ 6 %.', 'The inductor (a "mass") smooths current', 'into a ramp; the capacitor smooths voltage.', 'Hundreds of amps → many phases in parallel,', 'interleaved in time so ripples cancel.', 'Efficiency ~85–92 % per stage: the rest is heat', 'that the cooling system must remove.'].forEach((s, i) => T(g, 626, 228 + i * 23, s, { 'font-size': 12.5, fill: i >= 6 ? K.warn : K.text }));
    R(g, 30, 440, 940, 140, { fill: K.panel, stroke: K.line, rx: 10 });
    T(g, 50, 468, 'Why step down in stages? Moving power at high voltage = low current = low I²R loss. Converting near the chip keeps the', { 'font-size': 13 });
    T(g, 50, 490, 'last, high-current path very short. Every mΩ there matters: 500 A × 0.5 mΩ = 0.25 V lost, a third of the 0.75 V supply!', { 'font-size': 13, fill: K.warn });
    T(g, 50, 520, 'CPO adds more rails: driver and TIA supplies (must be very quiet), ring heaters (many small loads), laser modules.', { 'font-size': 13 });
    T(g, 50, 544, 'You will review the power tree: every rail, its voltage, current, tolerance, sequencing order, noise limit and monitoring.', { 'font-size': 13, fill: K.acc });
    return {
      hot: [{ x: 600, y: 56, w: 178, h: 78, target: 'el-pdn', label: 'PDN & decoupling', below: true }],
      update(t) {
        ds.forEach((pts, i) => run(pd[i], pts, t, 0.6));
        const ph = (t * 1.2) % 1, on = ph < 0.25;
        sw.setAttribute('x2', on ? 210 : 205); sw.setAttribute('y2', on ? 240 : 222);
        let a = '', b2 = '';
        for (let i = 0; i <= 100; i++) { const x = i / 100, p = ((x * 4 + t * 1.2) % 1), v = p < 0.25; a += (i ? 'L' : 'M') + (160 + x * 400) + ' ' + (v ? 318 : 350); const ri = p < 0.25 ? p / 0.25 : 1 - (p - 0.25) / 0.75; b2 += (i ? 'L' : 'M') + (160 + x * 400) + ' ' + (400 - 30 * ri); }
        sn.setAttribute('d', a); il.setAttribute('d', b2);
      }
    };
  }

  function sPdn(g) {
    cap(g, 30, 34, 'THE POWER DELIVERY NETWORK (PDN): KEEPING THE VOLTAGE STEADY', K.text);
    R(g, 40, 60, 450, 300, { fill: '#05080b', stroke: K.line, rx: 8 });
    T(g, 265, 84, 'impedance seen by the chip vs frequency (log-log)', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12 });
    const X = f => 60 + (f / 4) * 410, Y = z => 330 - z * 220;
    L(g, 60, 330, 470, 330, { stroke: K.line }); T(g, 265, 352, 'kHz → MHz → GHz', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 11.5 });
    L(g, 60, Y(0.35), 470, Y(0.35), { stroke: K.acc, 'stroke-dasharray': '6 4', 'stroke-width': 2 }); T(g, 466, Y(0.35) - 6, 'target impedance', { 'text-anchor': 'end', fill: K.acc, 'font-size': 12 });
    const zr = [['VRM', 0.4, K.power], ['bulk caps', 1.3, K.cool], ['MLCCs', 2.2, K.data], ['package', 3.0, K.ctrl], ['on-die', 3.7, K.optic]];
    zr.forEach(([n, f, c]) => T(g, X(f), 110, n, { 'text-anchor': 'middle', fill: c, 'font-size': 11.5 }));
    const zc = P(g, '', { stroke: '#fff', 'stroke-width': 2.5 });
    // load step
    R(g, 510, 60, 460, 300, { fill: '#05080b', stroke: K.line, rx: 8 });
    T(g, 740, 84, 'load step: traffic goes from idle to full', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12 });
    T(g, 520, 130, 'current', { fill: K.optic, 'font-size': 11.5 }); T(g, 520, 250, 'voltage', { fill: K.acc, 'font-size': 11.5 });
    const ic = P(g, '', { stroke: K.optic, 'stroke-width': 2.5 }), vc = P(g, '', { stroke: K.acc, 'stroke-width': 2.5 }), vb = P(g, '', { stroke: K.bad, 'stroke-width': 2, 'stroke-dasharray': '5 4' });
    L(g, 530, 300, 960, 300, { stroke: K.warn, 'stroke-dasharray': '4 4' }); T(g, 956, 294, 'min allowed voltage', { 'text-anchor': 'end', fill: K.warn, 'font-size': 11 });
    T(g, 740, 345, 'green: good decoupling · red dashed: too few capacitors → droop below limit', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 11.5 });
    R(g, 40, 380, 930, 200, { fill: K.panel, stroke: K.line, rx: 10 });
    T(g, 60, 410, 'Target impedance = allowed ripple ÷ current step.  e.g. 3 % of 0.75 V ÷ 300 A ≈ 0.075 mΩ. Tiny!', { 'font-family': 'ui-monospace,monospace', 'font-size': 14, fill: '#d8f5a8' });
    T(g, 60, 442, 'No single part can hold the voltage at every frequency: the VRM is slow, so capacitors take over in layers.', { 'font-size': 13 });
    T(g, 60, 466, 'Big bulk caps handle microseconds, hundreds of small ceramic (MLCC) caps handle nanoseconds, the package and die handle the rest.', { 'font-size': 13 });
    T(g, 60, 490, 'Each capacitor also has a little inductance (ESL), which is why placement close to the chip matters as much as value.', { 'font-size': 13 });
    T(g, 60, 524, 'Mechanics analogy: a suspension. A slow actuator (VRM) plus springs and dampers at different scales keep the "ride" (voltage) flat', { 'font-size': 13, fill: K.acc });
    T(g, 60, 546, 'when a sudden load hits. Resonances between layers must be damped, just like structural modes.', { 'font-size': 13, fill: K.acc });
    return {
      hot: [{ x: 506, y: 56, w: 468, h: 308, target: 'el-si', label: 'Signal integrity' }],
      update(t) {
        let d = ''; for (let i = 0; i <= 200; i++) { const f = i / 200 * 4; let z = 0.12 + 0.05 * f; zr.forEach(([, fr]) => { z += 0.25 * Math.exp(-Math.pow((f - fr - 0.45) / 0.12, 2)) * (0.6 + 0.4 * Math.sin(t)); }); d += (i ? 'L' : 'M') + X(f).toFixed(1) + ' ' + Y(Math.min(1.2, z)).toFixed(1); } zc.setAttribute('d', d);
        const ph = (t % 4) / 4; let a = '', b2 = '', c2 = '';
        for (let i = 0; i <= 200; i++) { const x = i / 200, step = x > 0.3 ? 1 : 0, tt = (x - 0.3) * 40;
          a += (i ? 'L' : 'M') + (530 + x * 430) + ' ' + (190 - step * 50);
          const good = step ? 0.75 - 0.02 * Math.exp(-tt / 2) * (1 + Math.cos(tt * 2)) / 2 : 0.75;
          const bad = step ? 0.75 - 0.09 * Math.exp(-tt / 4) * (1 + 0.7 * Math.cos(tt)) / 1.5 : 0.75;
          if (x <= ph + 0.05) { b2 += (b2 ? 'L' : 'M') + (530 + x * 430) + ' ' + (300 - (good - 0.69) * 900); c2 += (c2 ? 'L' : 'M') + (530 + x * 430) + ' ' + (300 - (bad - 0.69) * 900); }
        }
        ic.setAttribute('d', a); vc.setAttribute('d', b2); vb.setAttribute('d', c2);
      }
    };
  }

  function sSi(g) {
    cap(g, 30, 34, 'SIGNAL INTEGRITY: AT HIGH SPEED, EVERY TRACE IS A TRANSMISSION LINE', K.text);
    R(g, 40, 140, 100, 80, { fill: '#08171c', stroke: K.data, rx: 8 }); T(g, 90, 185, 'driver', { 'text-anchor': 'middle', 'font-size': 13 });
    R(g, 860, 140, 100, 80, { fill: '#08171c', stroke: K.data, rx: 8 }); T(g, 910, 185, 'receiver', { 'text-anchor': 'middle', 'font-size': 13 });
    R(g, 140, 170, 340, 20, { fill: K.copper, 'fill-opacity': .5, stroke: K.copper }); R(g, 480, 160, 60, 40, { fill: K.bad, 'fill-opacity': .4, stroke: K.bad }); R(g, 540, 170, 320, 20, { fill: K.copper, 'fill-opacity': .5, stroke: K.copper });
    T(g, 310, 162, 'trace Z₀ = 50 Ω', { 'text-anchor': 'middle', fill: K.copper, 'font-size': 12.5 }); T(g, 510, 150, 'via / connector', { 'text-anchor': 'middle', fill: K.bad, 'font-size': 12 }); T(g, 510, 222, 'Z = 35 Ω', { 'text-anchor': 'middle', fill: K.bad, 'font-size': 12 }); T(g, 700, 162, 'Z₀ = 50 Ω', { 'text-anchor': 'middle', fill: K.copper, 'font-size': 12.5 });
    const fwd = O(g, 0, 0, 10, { fill: '#fff', filter: 'drop-shadow(0 0 8px #22d3ee)' }), ref = O(g, 0, 0, 6, { fill: K.bad }), tr = O(g, 0, 0, 8, { fill: '#cfe9ff' });
    // TDR-like plot
    R(g, 40, 250, 520, 170, { fill: '#05080b', stroke: K.line, rx: 8 }); T(g, 300, 272, 'what a TDR measurement shows: impedance along the path', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12 });
    P(g, 'M60 360 L320 360 L330 395 L360 395 L370 360 L540 360', { stroke: K.data, 'stroke-width': 2.5 }); L(g, 60, 360, 540, 360, { stroke: K.line, 'stroke-dasharray': '3 4' }); T(g, 64, 352, '50 Ω', { fill: K.muted, 'font-size': 11 }); T(g, 345, 410, 'dip = via', { 'text-anchor': 'middle', fill: K.bad, 'font-size': 11 });
    R(g, 580, 250, 380, 170, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 596, 274, 'OPTICS ALREADY TAUGHT YOU THIS', K.optic);
    ['Impedance Z₀  ↔  refractive index n', 'Reflection Γ = (Z₂−Z₁)/(Z₂+Z₁)  ↔  Fresnel', '35 Ω in a 50 Ω line: Γ ≈ −18 % of amplitude', 'Loss grows with frequency  ↔  absorption', 'Return loss, insertion loss: same dB language'].forEach((s, i) => T(g, 596, 302 + i * 23, s, { 'font-size': 12.5, fill: i === 2 ? K.warn : K.text }));
    R(g, 40, 440, 920, 140, { fill: K.panel, stroke: K.line, rx: 10 });
    T(g, 60, 468, 'At 200 Gb/s a symbol lasts < 10 ps and travels only ~1.5 mm in the board. The trace is many symbols long, so it behaves like a waveguide.', { 'font-size': 13 });
    T(g, 60, 492, 'Every change of geometry (vias, connectors, pads, bends, layer changes) is an impedance step that reflects part of the signal.', { 'font-size': 13 });
    T(g, 60, 516, 'The board material absorbs high frequencies (Df, copper roughness): longer trace = more loss = smaller eye.', { 'font-size': 13 });
    T(g, 60, 546, 'CPO\'s core idea, seen from here: remove the long, lossy, reflective board path between ASIC and optics.', { 'font-size': 13.5, fill: K.acc });
    return {
      hot: [{ x: 36, y: 136, w: 108, h: 88, target: 'el-diff', label: 'Differential pairs' }],
      update(t) {
        const u = (t * 0.3) % 1;
        if (u < 0.45) { const x = 140 + u / 0.45 * 340; fwd.setAttribute('cx', x); fwd.setAttribute('cy', 180); fwd.setAttribute('r', 10); ref.setAttribute('cx', -20); tr.setAttribute('cx', -20); }
        else { const k = (u - 0.45) / 0.55; fwd.setAttribute('cx', -20); tr.setAttribute('cx', 540 + k * 320); tr.setAttribute('cy', 180); ref.setAttribute('cx', 480 - k * 340); ref.setAttribute('cy', 180); }
      }
    };
  }

  function sDiff(g) {
    cap(g, 30, 34, 'DIFFERENTIAL PAIRS: SEND A SIGNAL AND ITS MIRROR IMAGE', K.text);
    L(g, 120, 140, 880, 140, { stroke: K.copper, 'stroke-width': 6 }); L(g, 120, 170, 880, 170, { stroke: K.copper, 'stroke-width': 6 });
    T(g, 110, 145, 'P', { 'text-anchor': 'end', fill: K.copper, 'font-size': 14, 'font-weight': 700 }); T(g, 110, 175, 'N', { 'text-anchor': 'end', fill: K.copper, 'font-size': 14, 'font-weight': 700 });
    const noise = P(g, '', { stroke: K.warn, 'stroke-width': 2, 'stroke-dasharray': '3 3' }); T(g, 500, 100, '⚡ noise couples equally into both wires', { 'text-anchor': 'middle', fill: K.warn, 'font-size': 13 });
    R(g, 40, 210, 300, 140, { fill: '#05080b', stroke: K.line, rx: 8 }); T(g, 52, 230, 'P (with noise)', { fill: K.data, 'font-size': 11.5 });
    R(g, 350, 210, 300, 140, { fill: '#05080b', stroke: K.line, rx: 8 }); T(g, 362, 230, 'N (with the same noise)', { fill: K.ctrl, 'font-size': 11.5 });
    R(g, 660, 210, 300, 140, { fill: '#05080b', stroke: K.acc, rx: 8 }); T(g, 672, 230, 'receiver sees P − N: noise cancels', { fill: K.acc, 'font-size': 11.5 });
    const pw = P(g, '', { stroke: K.data, 'stroke-width': 2.5 }), nw = P(g, '', { stroke: K.ctrl, 'stroke-width': 2.5 }), dw = P(g, '', { stroke: K.acc, 'stroke-width': 3 });
    R(g, 40, 370, 920, 210, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 60, 396, 'WHAT MATTERS ON A HIGH-SPEED BOARD', K.text);
    [['Differential impedance', '~85–100 Ω between P and N; set by trace width, spacing and dielectric.'], ['Skew', 'P and N must arrive together (matched lengths to fractions of a mm), or common noise becomes signal.'], ['Crosstalk', 'neighbouring pairs couple (NEXT/FEXT); keep spacing, use ground between pairs.'], ['Return path', 'current returns on the nearest plane; a gap or split in that plane under a trace = a big discontinuity.'], ['Every SerDes lane', '= one differential pair per direction: hundreds of pairs on a switch board.']]
      .forEach(([a, b2], i) => { T(g, 60, 428 + i * 30, a, { 'font-size': 13.5, 'font-weight': 700, fill: K.acc }); T(g, 260, 428 + i * 30, b2, { 'font-size': 13 }); });
    return {
      hot: [{ x: 656, y: 206, w: 308, h: 148, target: 'el-channel', label: 'The 200G channel' }],
      update(t) {
        const sig = x => (Math.floor((x / 40 + t * 2)) % 3 === 0 ? 1 : (Math.floor((x / 40 + t * 2)) % 3 === 1 ? -1 : 1)) * 0.8;
        const nz = x => 0.5 * Math.sin(x / 9 + t * 7) + 0.3 * Math.sin(x / 3.1 + t * 13);
        let a = '', b2 = '', c2 = '', n2 = '';
        for (let x = 0; x <= 280; x += 4) { const s2 = sig(x), n = nz(x); a += (x ? 'L' : 'M') + (50 + x) + ' ' + (290 - (s2 + n) * 30); b2 += (x ? 'L' : 'M') + (360 + x) + ' ' + (290 - (-s2 + n) * 30); c2 += (x ? 'L' : 'M') + (670 + x) + ' ' + (290 - s2 * 2 * 22); }
        for (let x = 0; x <= 760; x += 6) n2 += (x ? 'L' : 'M') + (120 + x) + ' ' + (120 + 8 * Math.sin(x / 9 + t * 7));
        pw.setAttribute('d', a); nw.setAttribute('d', b2); dw.setAttribute('d', c2); noise.setAttribute('d', n2);
      }
    };
  }

  function sChannel(g) {
    cap(g, 30, 34, 'THE 200 Gb/s CHANNEL: WHY THE DISTANCE TO THE OPTICS MATTERS', K.text);
    R(g, 40, 60, 600, 360, { fill: '#05080b', stroke: K.line, rx: 8 });
    const X = f => 70 + f / 70 * 550, Y = db => 80 + (-db) / 45 * 300;
    for (let db = 0; db >= -40; db -= 10) { L(g, 70, Y(db), 620, Y(db), { stroke: K.line, 'stroke-dasharray': '2 4' }); T(g, 64, Y(db) + 4, db + ' dB', { 'text-anchor': 'end', fill: K.muted, 'font-size': 11 }); }
    [0, 20, 40, 60].forEach(f => T(g, X(f), 400, f + ' GHz', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 11 }));
    L(g, X(53), 80, X(53), 382, { stroke: K.warn, 'stroke-dasharray': '6 4' }); T(g, X(53) + 4, 96, 'Nyquist ≈ 53 GHz', { fill: K.warn, 'font-size': 12 });
    const curves = [['25 cm, standard FR-4', 1.2, K.bad], ['25 cm, low-loss laminate', 0.62, K.optic], ['host board + connector (pluggable)', 0.5, '#ffa53d'], ['few mm in a CPO package', 0.06, K.acc]];
    const paths = curves.map(([n, k, c], i) => { let d = ''; for (let f = 0; f <= 70; f += 1) { const db = -k * (0.35 * Math.sqrt(f) * 4 + 0.32 * f) * (i === 2 ? 1 : 1) - (i === 2 ? 3 * Math.sin(f / 6) * 0.3 + 2 : 0); d += (f ? 'L' : 'M') + X(f).toFixed(1) + ' ' + Y(Math.max(-44, db)).toFixed(1); } T(g, 80, 440 + i * 22, '— ' + n, { fill: c, 'font-size': 12.5 }); return P(g, d, { stroke: c, 'stroke-width': 2.5 }); });
    const marker = O(g, 0, 0, 6, { fill: '#fff' }); const mt = T(g, 0, 0, '', { 'font-size': 12, fill: '#fff' });
    R(g, 660, 60, 310, 360, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 676, 86, 'READING THE CHART', K.text);
    ['dB here is voltage: −20 dB = 10 %,', '−30 dB ≈ 3 %, −40 dB = 1 % of the', 'original signal left at Nyquist.', '', 'Long board traces lose 25–35+ dB', '→ heavy equalization, retimers,', 'power, heat, latency.', '', 'A few mm in the CPO package lose', 'only a few dB → simpler, cooler', 'SerDes. That is the electrical', 'half of the CPO story.'].forEach((s, i) => T(g, 676, 114 + i * 23, s, { 'font-size': 13, fill: i >= 8 ? K.acc : K.text }));
    R(g, 40, 530, 930, 50, { fill: K.panel, stroke: K.line, rx: 10 });
    T(g, 60, 560, 'Illustrative curves ' + '(typical shapes, not a specific product) — the loss budget per channel is a key SI requirement you will see in reviews.', { 'font-size': 12.5, fill: K.muted });
    return {
      hot: [{ x: 656, y: 56, w: 318, h: 368, target: 'el-thermo', label: 'Thermal & mechanics', inside: false }],
      update(t) { const f = (t * 8) % 70, k = curves[0][1]; const db = -k * (0.35 * Math.sqrt(f) * 4 + 0.32 * f); marker.setAttribute('cx', X(f)); marker.setAttribute('cy', Y(Math.max(-44, db))); mt.setAttribute('x', X(f) + 8); mt.setAttribute('y', Y(Math.max(-44, db)) - 8); mt.textContent = db.toFixed(0) + ' dB'; paths.forEach((p, i) => p.setAttribute('stroke-width', i === Math.floor(t / 2) % 4 ? 4 : 2.5)); }
    };
  }

  function sThermo(g) {
    cap(g, 30, 34, 'BOARD-LEVEL THERMAL & MECHANICS: YOUR HOME TURF', K.text);
    const board = P(g, '', { fill: '#1f3a1f', stroke: K.acc, 'stroke-width': 2 }), pkg = P(g, '', { fill: '#13110a', stroke: '#5a4d2a', 'stroke-width': 2 });
    const balls = []; for (let k = 0; k < 13; k++) balls.push(O(g, 0, 0, 7, { fill: '#c9c9c9' }));
    const tlab = T(g, 500, 80, '', { 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700 });
    T(g, 200, 300, 'package (silicon + organic) expands less', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12 }); T(g, 800, 300, 'board (glass-epoxy) expands more', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12 });
    R(g, 30, 330, 460, 250, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 46, 356, 'WHAT FAILS', K.bad);
    ['Corner solder balls see the most shear from CTE mismatch → fatigue cracks after many temperature cycles.', 'Warpage at reflow → opens/shorts under big BGAs.', 'Heavy cold plates and clamping forces bend the board; vibration and shock in transport.', 'Via barrel cracks from Z-axis expansion.'].forEach((s, i) => { const words = s.split(' '); let l1 = '', l2 = ''; words.forEach(w => (l1.length + w.length < 58 && !l2 ? l1 += w + ' ' : l2 += w + ' ')); T(g, 46, 386 + i * 48, '• ' + l1, { 'font-size': 12.5 }); T(g, 58, 404 + i * 48, l2, { 'font-size': 12.5 }); });
    R(g, 510, 330, 460, 250, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 526, 356, 'WHAT YOU BRING / WHAT TO CHECK', K.acc);
    ['CTE of laminate, package and silicon; Tg of the laminate.', 'Warpage limits vs temperature (shadow moiré data).', 'Stiffeners, backing plates, load paths for cold plates.', 'Thermal cycling / shock / vibration qualification plans.', 'Fiber attach & optics alignment vs board flexing: the', 'optical budget depends on mechanical stability!'].forEach((s, i) => T(g, 526, 386 + i * 30, s, { 'font-size': 12.5, fill: i >= 4 ? K.optic : K.text }));
    return {
      hot: [{ x: 336, y: 116, w: 328, h: 90, target: 'el-emc', label: 'EMC, ESD & grounding' }],
      update(t) {
        const T2 = Math.sin(t * 0.8), bow = 18 * T2, cx = 500;
        board.setAttribute('d', 'M60 ' + (230) + ' Q' + cx + ' ' + (230 + bow * 2) + ' 940 230 L940 260 Q' + cx + ' ' + (260 + bow * 2) + ' 60 260 Z');
        const pw = 300 + 6 * T2;
        pkg.setAttribute('d', 'M' + (cx - pw / 2) + ' 130 L' + (cx + pw / 2) + ' 130 L' + (cx + pw / 2) + ' 180 L' + (cx - pw / 2) + ' 180 Z');
        balls.forEach((b2, k) => { const xp = cx - pw / 2 + 14 + k * (pw - 28) / 12, xb = cx - 150 * (1 + 0.04 * T2) + 14 + k * (300 * (1 + 0.04 * T2) - 28) / 12; b2.setAttribute('cx', (xp + xb) / 2); b2.setAttribute('cy', 196 + bow * 0.6 * (1 - Math.pow((xp - cx) / 150, 2))); const shear = Math.abs(xp - xb); b2.setAttribute('fill', shear > 4 ? K.bad : shear > 2 ? K.warn : '#c9c9c9'); });
        tlab.textContent = T2 > 0 ? 'hot: ' + (25 + 75 * T2).toFixed(0) + ' °C → board grows more, corners shear' : 'cold: ' + (25 + 65 * T2).toFixed(0) + ' °C → opposite shear';
        tlab.setAttribute('fill', T2 > 0 ? K.therm : K.cool);
      }
    };
  }

  function sEmc(g) {
    cap(g, 30, 34, 'EMC, ESD AND GROUNDING: KEEPING NOISE IN AND ZAPS OUT', K.text);
    box(g, 60, 80, 260, 200, '', '', K.warn); cap(g, 76, 104, 'NOISE: FAST SWITCHING', K.warn);
    R(g, 150, 160, 80, 50, { fill: '#1d1a06', stroke: K.power, rx: 6 }); T(g, 190, 190, 'VRM', { 'text-anchor': 'middle', 'font-size': 13 });
    const waves = [0, 1, 2].map(() => O(g, 190, 185, 10, { fill: 'none', stroke: K.warn, 'stroke-width': 2 }));
    box(g, 370, 80, 260, 200, '', '', K.acc); cap(g, 386, 104, 'SMALL LOOP = QUIET', K.acc);
    P(g, 'M430 150 L570 150 L570 165 L430 165 Z', { stroke: K.acc, 'stroke-width': 3 }); T(g, 500, 200, 'signal right above its return plane', { 'text-anchor': 'middle', 'font-size': 12 });
    P(g, 'M430 230 L570 230', { stroke: K.copper, 'stroke-width': 3 }); P(g, 'M430 255 L570 255', { stroke: K.copper, 'stroke-width': 3 }); T(g, 500, 272, 'big loop = antenna: radiates and picks up', { 'text-anchor': 'middle', 'font-size': 12, fill: K.bad });
    box(g, 680, 80, 260, 200, '', '', K.ctrl); cap(g, 696, 104, 'ESD AT THE FRONT PANEL', K.ctrl);
    const zap = P(g, 'M720 130 L740 160 L728 160 L750 195', { stroke: K.power, 'stroke-width': 3 });
    R(g, 760, 180, 70, 40, { fill: K.panel2, stroke: K.ctrl, rx: 4 }); T(g, 795, 205, 'TVS', { 'text-anchor': 'middle', 'font-size': 12 });
    L(g, 830, 200, 900, 200, { stroke: K.copper, 'stroke-width': 3 }); T(g, 905, 205, 'chip', { fill: K.muted, 'font-size': 12 });
    L(g, 795, 220, 795, 255, { stroke: K.copper, 'stroke-width': 3 }); L(g, 780, 255, 810, 255, { stroke: K.copper, 'stroke-width': 3 }); T(g, 795, 272, 'diverted to ground', { 'text-anchor': 'middle', fill: K.acc, 'font-size': 12 });
    const zd = dots(g, 3, K.power, 4);
    R(g, 40, 310, 920, 270, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 60, 336, 'THE ESSENTIALS', K.text);
    [['EMC', 'products must not radiate too much (emissions limits) and must tolerate noise (immunity): tested in labs before shipping.'], ['Return path', 'current always flows in a loop; keep loops small and planes solid under fast signals.'], ['Shielding', 'metal enclosures and shield cans; every opening (like a front panel full of ports) is a potential leak.'], ['ESD', 'a finger or cable discharge is thousands of volts for nanoseconds; protection diodes (TVS) at connectors divert it.'], ['Grounding', 'one solid reference for everything; separate "quiet" analog areas (TIAs, PLLs) from noisy power stages.'], ['For CPO', 'fiber ports don\'t conduct (good for ESD!), but management ports, laser modules and the chassis still need care.']]
      .forEach(([a, b2], i) => { T(g, 60, 368 + i * 34, a, { 'font-size': 13.5, 'font-weight': 700, fill: K.acc }); T(g, 190, 368 + i * 34, b2, { 'font-size': 13 }); });
    return {
      hot: [{ x: 676, y: 76, w: 268, h: 208, target: 'el-flow', label: 'Design flow & reviews' }],
      update(t) {
        waves.forEach((w, i) => { const u = (t * 0.6 + i / 3) % 1; w.setAttribute('r', 10 + u * 90); w.setAttribute('stroke-opacity', 1 - u); });
        const on = (t % 3) < 0.6; zap.setAttribute('stroke-opacity', on ? 1 : 0.15);
        zd.forEach((d, k) => { const u = ((t % 3) / 0.6 + k / 3) % 1; d.setAttribute('cx', on ? 795 : -9); d.setAttribute('cy', 220 + u * 35); });
      }
    };
  }

  function sFlow(g) {
    cap(g, 30, 34, 'HOW A BOARD GETS DESIGNED, AND WHERE YOU COME IN', K.text);
    const st = [['Requirements', 'SE writes them', true], ['Block diagram', 'architecture', true], ['Schematic', 'EE designs', false], ['Layout', 'PCB designer', false], ['SI / PI / thermal sim', 'specialists', false], ['Design reviews', 'SE leads gates', true], ['Fab & assembly', 'factory', false], ['Bring-up', 'SE + team', true], ['Validation', 'SE owns plan', true], ['Production', 'yield, test', false]];
    const bx = st.map(([a, b2, se], i) => {
      const col = i % 5, row = Math.floor(i / 5), x = 30 + col * 194, y = 70 + row * 170;
      const r = R(g, x, y, 170, 90, { fill: K.panel, stroke: se ? K.acc : K.line, 'stroke-width': se ? 2 : 1, rx: 10 });
      T(g, x + 85, y + 40, a, { 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700 }); T(g, x + 85, y + 62, b2, { 'text-anchor': 'middle', 'font-size': 12, fill: se ? K.acc : K.muted });
      if (i % 5 < 4) L(g, x + 170, y + 45, x + 194, y + 45, { stroke: K.muted, 'stroke-width': 2 });
      return r;
    });
    P(g, 'M892 160 L892 200 L115 200 L115 240', { stroke: K.muted, 'stroke-width': 2, fill: 'none' });
    R(g, 30, 360, 940, 220, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 50, 386, 'WHAT THE SYSTEM ENGINEER ASKS AT EACH REVIEW', K.text);
    [['Block diagram', 'Does every requirement have an owner? Are interfaces (power, data, management, thermal, mechanical) all listed?'], ['Schematic', 'Power tree complete with margins? Sequencing and resets defined? Telemetry for every rail, laser and engine?'], ['Layout', 'Channel loss within budget? Critical rails short and wide? Keep-outs for cold plates and fiber routing respected?'], ['Simulation', 'SI/PI/thermal results at worst-case corners, not just typical? Correlated to measurements from the last build?'], ['Bring-up / validation', 'Is there a test point, a counter or a register for every requirement you need to prove?']]
      .forEach(([a, b2], i) => { T(g, 50, 418 + i * 32, a, { 'font-size': 13.5, 'font-weight': 700, fill: K.acc }); T(g, 210, 418 + i * 32, b2, { 'font-size': 12.8 }); });
    return {
      hot: [],
      update(t) { const k = Math.floor(t * 0.8) % st.length; bx.forEach((r, i) => r.setAttribute('fill', i === k ? '#1d2a10' : K.panel)); }
    };
  }

  // ================================================================ levels
  const LV = [
    { id: 'el-basics', name: 'V, I, R', scene: sBasics, size: '',
      title: 'Voltage, current, resistance, power', sub: 'The four quantities behind everything electrical',
      plain: '<b>Voltage</b> is the push (like pressure). <b>Current</b> is the flow (like litres per second). <b>Resistance</b> is how hard the path is to flow through (like a narrow pipe). <b>Power</b> is push × flow, and what a resistance does with it is make <b>heat</b>.',
      body: '<p>Two formulas cover most system-level reasoning: <b>V = I·R</b> (Ohm\'s law) and <b>P = V·I = I²·R</b>.</p><p>The <b>I²</b> is the important part: doubling the current quadruples the heat in every wire, connector and copper plane. That is why power is moved at high voltage (48–54 V in the rack) and only converted to the chip\'s ~0.75 V at the last moment.</p>',
      facts: [['~0.75 V', 'switch ASIC core voltage class', 'typ'], ['hundreds of A', 'ASIC core current', 'typ'], ['48–54 V', 'rack busbar', 'typ'], ['P = I²R', 'why low voltage hurts', 'typ']],
      cpoTxt: 'Most power-related review questions are Ohm\'s law in disguise. How much voltage is lost between the regulator and the chip (I·R)? How much heat do the connectors and planes make (I²·R)? Will the sense point see the real chip voltage?',
      more: 'Mechanical twin: a damper (F = c·v) turns motion into heat exactly as a resistor (V = R·I) turns current into heat. Thermal twin: ΔT = P·θ is Ohm\'s law for heat flow, which you already use.',
      links: [] },
    { id: 'el-rlc', name: 'C & L', scene: sRlc, size: '',
      title: 'Capacitors and inductors', sub: 'Springs and masses of the electrical world',
      plain: 'A <b>capacitor</b> stores energy in an electric field and resists sudden changes in <b>voltage</b>, like a spring or a small water tank. An <b>inductor</b> stores energy in a magnetic field and resists sudden changes in <b>current</b>, like a mass or a flywheel. Put them together and you get <b>resonance</b>, exactly like a mass on a spring.',
      body: '<p><b>RC</b> circuits produce delays (time constant τ = R·C). <b>LC</b> circuits ring at f = 1/(2π√(LC)). Every circuit board is full of unintended small R, L and C, called <b>parasitics</b>: they make power rails ring and high-speed signals smear.</p><p>The resonator\'s <b>Q</b> means the same thing as for the micro-ring in your optics: high Q = sharp and ringing, low Q = damped.</p>',
      facts: [['τ = R·C', 'RC time constant', 'typ'], ['f = 1/2π√LC', 'resonance', 'typ'], ['µF … pF', 'typical capacitor range', 'typ'], ['nH', 'parasitic inductance of a via or pad', 'typ']],
      cpoTxt: 'You will hear "decoupling capacitors", "parasitic inductance", "resonance in the PDN" and "ringing on the rail". Map them onto spring–mass–damper systems and your structural-dynamics intuition (modes, damping, transmissibility) applies directly.',
      more: 'Energy: E = ½·C·V² for a capacitor and ½·L·I² for an inductor, the same form as ½·k·x² and ½·m·v².',
      links: [] },
    { id: 'el-semis', name: 'Diodes & transistors', scene: sSemis, size: '',
      title: 'Diodes and transistors', sub: 'One-way valves and controllable valves',
      plain: 'A <b>diode</b> lets current through in one direction only, like a check valve. Your laser and photodiode are diodes. A <b>transistor (MOSFET)</b> is a valve controlled by a voltage on its <b>gate</b>. It is the switch inside every power converter and the building block of every chip.',
      body: '<p>A switch wastes almost nothing when fully on or fully off; the losses happen <b>during switching</b>, when there is both voltage and current. Faster switching cuts those losses but makes more electrical noise. Higher switching frequency allows smaller inductors and capacitors but causes more switching loss. These trade-offs appear in every power design review.</p>',
      facts: [['mΩ', 'on-resistance of a power MOSFET', 'typ'], ['~0.5–1 MHz', 'VRM switching frequency', 'typ'], ['~0.9 A/W', 'Ge photodiode responsivity', 'typ'], ['diode', 'laser, LED, PD, ring junction', 'typ']],
      cpoTxt: 'In CPO, optics <b>are</b> electronics: the laser is a forward-biased diode driven by current, the ring modulator is a reverse-biased diode driven by voltage, and the photodiode is a diode producing current. Their drivers, bias circuits and monitors are where the electrical and optical budgets meet.',
      more: 'Leakage: even "off" transistors leak a little, and leakage grows quickly with temperature. Hot chips waste more power, which is one reason good cooling saves energy.',
      links: [['architecture/transistor', 'Transistor physics']] },
    { id: 'el-pcb', name: 'The PCB', scene: sPcb, size: '~mm thick',
      title: 'The printed circuit board', sub: 'A laminated composite of copper and glass-epoxy',
      plain: 'A PCB is a <b>sandwich</b> of copper layers and insulating glass-epoxy layers. Some copper layers carry <b>signals</b> (thin traces), others are solid <b>planes</b> for power and ground. <b>Vias</b> are plated holes that connect layers. Big chips sit on hundreds or thousands of tiny <b>solder balls</b> (BGA).',
      body: '<p>A large switch board can have 20–30+ layers. The order and thickness of the layers is the <b>stackup</b>, and it sets the trace impedance, the loss and the board\'s mechanical behaviour.</p><p>The leftover part of a via that isn\'t used, the <b>stub</b>, reflects high-speed signals, so it is drilled out (<b>backdrill</b>). <b>HDI</b> boards use tiny laser-drilled microvias to escape signals from dense BGAs.</p>',
      facts: [['20–30+', 'layers on a large switch board', 'typ'], ['~35 µm', 'copper of a 1-oz layer', 'typ'], ['Dk, Df', 'dielectric constant and loss factor', 'typ'], ['backdrill', 'removes via stubs', 'typ']],
      cpoTxt: 'A board is a <b>composite structure</b>: layer count, copper balance, material Tg and CTE decide warpage and reliability. You can add real value in stackup and mechanical reviews, and you\'ll learn to ask the electrical questions (impedance, loss, via stubs) alongside.',
      more: 'Laminate choice is a cost / loss trade-off: standard FR-4 is cheap but lossy at high frequency; low-loss materials cost more but carry 100+ GHz signals with less attenuation.',
      links: [['architecture/package-substrate', 'Package substrate']] },
    { id: 'el-power', name: 'Power delivery', scene: sPower, size: '',
      title: 'Power delivery: from 54 V to 0.75 V', sub: 'The power tree and the buck converter',
      plain: 'Power arrives at ~48–54 V and is stepped down in stages to the chip\'s ~0.75 V. The final stage is a <b>multiphase buck converter</b> (VRM): fast switches chop the input, an inductor and capacitors smooth it, and many phases share hundreds of amps.',
      body: '<p>Each stage loses a few percent as heat. The last, highest-current path must be as short as possible: 500 A through 0.5 mΩ loses 0.25 V, a third of the supply.</p><p>The <b>power tree</b> lists every rail: its voltage, maximum current, tolerance, noise limit, start-up order (sequencing), protection and telemetry. CPO adds quiet analog rails for drivers and TIAs, many heater supplies, and laser-module power.</p>',
      facts: [['~6 %', 'duty cycle for 12 V → 0.75 V', 'typ'], ['85–92 %', 'efficiency per stage', 'typ'], ['many phases', 'interleaved for hundreds of A', 'typ'], ['PMBus', 'regulator telemetry & control', 'typ']],
      cpoTxt: 'You will own the <b>power budget</b> and review the power tree: totals per rail, conversion losses as heat for the thermal budget, start-up sequencing (e.g. engines and lasers only after their controls are up), and what each rail\'s telemetry alarms on.',
      more: 'Load-line (AVS): many regulators let the voltage sag slightly with load on purpose. It reduces peak overshoot and saves power; the chip is specified to tolerate it.',
      links: [['architecture/power-delivery', 'Power delivery in the explorer'], ['budgets/power', 'Power budget tab']] },
    { id: 'el-pdn', name: 'PDN & decoupling', scene: sPdn, size: '',
      title: 'The power delivery network (PDN)', sub: 'Keeping the voltage steady when the load jumps',
      plain: 'When traffic suddenly ramps up, the chip\'s current jumps by hundreds of amps in nanoseconds. The regulator is too slow to react, so layers of <b>capacitors</b> (bulk, ceramic MLCCs, package, on-die) supply the charge meanwhile. The goal is to keep the voltage within a few percent: below a <b>target impedance</b> at every frequency.',
      body: '<p><b>Target impedance</b> = allowed ripple ÷ current step: e.g. 3 % of 0.75 V over a 300 A step ≈ 0.075 mΩ. Capacitors only help where they are close to the chip, because their own small inductance (ESL) and the path inductance limit how fast they can deliver. Between the layers of the network, resonances form and must be damped.</p>',
      facts: [['~0.1 mΩ', 'order of target impedance', 'est'], ['100s', 'of decoupling capacitors', 'typ'], ['ns', 'current-step timescale', 'typ'], ['ESL', 'limits how fast a capacitor helps', 'typ']],
      cpoTxt: 'Supply noise doesn\'t stay on the supply: it turns into jitter and amplitude noise on SerDes, drivers and TIAs (see Case Study 6). Ask for PDN impedance plots and load-step measurements, and require ripple limits per rail in the specifications.',
      more: 'This is a suspension design: a slow actuator plus springs and dampers at several scales to keep the ride flat. Structural-dynamics habits (find the modes, add damping, check transmissibility) apply directly.',
      links: [['cases/case-vrm', 'Case study: supply ripple → jitter'], ['architecture/pdn', 'PDN in the explorer']] },
    { id: 'el-si', name: 'Signal integrity', scene: sSi, size: '',
      title: 'Signal integrity and transmission lines', sub: 'Why a fast trace behaves like an optical waveguide',
      plain: 'At 200 Gb/s each symbol lasts under 10 ps, and a trace on a board is <b>many symbols long</b>. It behaves like a waveguide with a <b>characteristic impedance</b> (typically 50 Ω, or 85–100 Ω for a pair). Wherever the impedance changes (a via, a connector, a pad), part of the signal <b>reflects</b>, just as light reflects at a change of refractive index.',
      body: '<p><b>Reflection:</b> Γ = (Z₂ − Z₁)/(Z₂ + Z₁), the same form as Fresnel reflection. <b>Loss:</b> the board material and copper roughness absorb high frequencies, more for longer traces. <b>Measurement:</b> a TDR plots impedance along the path; a VNA measures insertion loss and return loss vs frequency (S-parameters).</p>',
      facts: [['50 Ω', 'single-ended impedance', 'typ'], ['85–100 Ω', 'differential impedance', 'typ'], ['~6–7 ps/mm', 'signal delay in a board', 'typ'], ['S-parameters', 'insertion / return loss', 'typ']],
      cpoTxt: 'Your optics background is a real advantage here: impedance is the electrical twin of refractive index, and insertion loss and return loss use the same dB language. SI reviews will feel familiar once you map the vocabulary.',
      more: 'Rule of thumb: once the signal\'s rise time is shorter than a few times the trace delay, treat the trace as a transmission line. At 200G that is every trace longer than a few mm.',
      links: [['noise', 'Noise Lab'], ['architecture/serdes', 'SerDes in the explorer']] },
    { id: 'el-diff', name: 'Differential pairs', scene: sDiff, size: '',
      title: 'Differential pairs, crosstalk and return paths', sub: 'How hundreds of fast lanes coexist on one board',
      plain: 'Fast signals use <b>two wires</b> carrying the signal and its mirror image. The receiver looks only at the <b>difference</b>, so noise that hits both wires equally <b>cancels out</b>. The pairs must be matched in length and spacing, kept apart from their neighbours, and run over solid ground planes.',
      body: '<p><b>Skew</b> (one wire longer than the other) turns common noise into signal. <b>Crosstalk</b> (NEXT, FEXT) is coupling from neighbouring pairs: a big issue with hundreds of 200G pairs packed together. The <b>return current</b> flows in the plane right under the trace, so a gap in that plane forces a detour and creates a large discontinuity.</p>',
      facts: [['P − N', 'what the receiver sees', 'typ'], ['< ~mm', 'skew matching', 'typ'], ['NEXT / FEXT', 'near / far-end crosstalk', 'typ'], ['1 pair', 'per lane per direction', 'typ']],
      cpoTxt: 'On a pluggable switch, hundreds of 200G pairs must cross the board to the front-panel cages, which is the hardest part of the layout. On a CPO switch most of that routing disappears into the package. That simplifies the main board, but makes the package and the engine interface critical.',
      more: 'Like common-mode rejection in an optical balanced detector: subtracting two paths cancels noise they share.',
      links: [] },
    { id: 'el-channel', name: 'The 200G channel', scene: sChannel, size: '',
      title: 'The 200 Gb/s electrical channel', sub: 'Loss vs distance, and the electrical half of the CPO argument',
      plain: 'The faster the signal, the more the board <b>absorbs</b>. At the Nyquist frequency of a 200G lane (~53 GHz), a long trace with a connector can lose <b>25–35+ dB</b>, meaning only a few percent of the signal\'s voltage arrives. Recovering it takes heavy equalization, retimers, power and heat. A few millimetres in a CPO package lose only a few dB.',
      body: '<p>The <b>channel loss budget</b> splits the allowed loss between package, board, connector and module. It is one of the main SI requirements. It drives the choice of board material, the layer used for routing, via backdrilling and connector type. The total also decides whether retimers are needed.</p>',
      facts: [['~53 GHz', 'Nyquist of a 106 GBd lane', 'typ'], ['25–35+ dB', 'long host channel loss', 'typ'], ['few dB', 'CPO package path', 'typ'], ['−20 dB', '= 10 % of the voltage', 'typ']],
      cpoTxt: 'This chart is the electrical side of "why CPO": the 3.5× power and 63× signal-integrity claims ' + B('nv') + ' come largely from removing this long, lossy channel. Be ready to explain it to customers and executives in one picture.',
      more: 'dB for voltage uses 20·log10 (for power, 10·log10). So −6 dB is half the voltage but a quarter of the power. Keep the two straight when mixing optical (power) and electrical (voltage) numbers.',
      links: [['cpo-course/cs-why', 'CPO course: Why CPO']] },
    { id: 'el-thermo', name: 'Thermal & mechanics', scene: sThermo, size: '',
      title: 'Board-level thermal and mechanics', sub: 'Where your background leads the discussion',
      plain: 'Boards, packages and silicon <b>expand at different rates</b> (CTE). Every temperature cycle shears the solder balls, most at the corners of big packages. Boards also <b>warp</b> at soldering temperatures, and heavy cold plates and clamps bend them. These are mechanical reliability problems, and you already have the tools.',
      body: '<p>Typical work: laminate selection (Tg, CTE), stiffeners and backing plates for large BGAs and cold plates, shadow-moiré warpage data, thermal-cycling / shock / vibration qualification, and solder-joint life models.</p><p>Specific to CPO: <b>fiber attach and optical alignment</b> depend on the package staying flat and stable, so mechanical stability feeds directly into the optical link budget.</p>',
      facts: [['~15–17 ppm/K', 'organic board CTE (in-plane)', 'typ'], ['~3 ppm/K', 'silicon CTE', 'typ'], ['corners', 'most-stressed BGA balls', 'typ'], ['µm', 'fiber-alignment tolerance', 'typ']],
      cpoTxt: 'This is where you can lead from day one. Link mechanical events (warpage, clamping load, vibration, thermal cycling) to their optical and electrical consequences (coupling loss, solder cracks, intermittent links). Few electrical engineers can make that connection.',
      more: 'Intermittent failures from cracked solder joints often show up as link flaps or errors that come and go with temperature: the electrical symptom of a mechanical root cause.',
      links: [['architecture/thermal-system', 'Thermal system'], ['cpo-course/apx-ppt', 'CPO course: packaging, power & thermal']] },
    { id: 'el-emc', name: 'EMC & ESD', scene: sEmc, size: '',
      title: 'EMC, ESD and grounding', sub: 'Keeping noise in and zaps out',
      plain: 'Fast-switching circuits radiate radio noise, and products must stay within legal <b>emission</b> limits while also tolerating noise from outside (<b>immunity</b>). A static <b>zap (ESD)</b> from a finger or a cable can destroy chips unless protection diodes divert it. Small current loops and solid ground planes are the main cure for both.',
      body: '<p>Every current flows in a loop, and a large loop acts as an antenna. Keep fast signals right above their return planes, put shield cans over noisy areas, keep quiet analog circuits (TIAs, PLLs) away from noisy power stages, and protect every external connector.</p>',
      facts: [['kV, ns', 'an ESD event', 'typ'], ['TVS', 'protection diode at connectors', 'typ'], ['emissions', 'regulatory limits per region', 'typ'], ['loop area', 'the main design lever', 'typ']],
      cpoTxt: 'EMC and safety testing are gates on the product schedule. Fiber ports help (glass doesn\'t conduct), but management ports, laser modules, fans and the chassis seams still need design attention. Laser eye-safety certification also lands with the system team.',
      more: 'Many "random" field errors are EMI-related: they correlate with nearby equipment, fans or power events. Timestamped telemetry makes that correlation visible.',
      links: [] },
    { id: 'el-flow', name: 'Design flow', scene: sFlow, size: '',
      title: 'The board design flow, and your role in it', sub: 'From requirements to production',
      plain: 'A board goes from <b>requirements</b> to block diagram, schematic, layout, simulation, reviews, fabrication, bring-up, validation and production. Electrical engineers and layout designers do the detailed design. The <b>system engineer</b> writes the requirements, leads the reviews at each gate, and owns validation.',
      body: '<p>You don\'t need to design a buck converter or route a pair. You do need to <b>ask the right questions</b> at each review, recognise red flags, and make sure every requirement can be measured on the finished hardware.</p>',
      facts: [['gates', 'review at each stage', 'typ'], ['SI/PI/thermal', 'simulations before fab', 'typ'], ['EVT/DVT/PVT', 'hardware builds', 'typ'], ['test points', 'plan them in the schematic', 'typ']],
      cpoTxt: 'The next steps give you hands-on calculators (IR drop, buck converter, reflections) and a <b>board-review checklist</b> you can take into your first design review.',
      more: 'The most expensive mistakes are found late: a missing telemetry point or a wrong power-up order discovered at bring-up can cost a board re-spin. That is why the system engineer reviews early.',
      links: [] }
  ];

  // ================================================================ interactive pages
  function sliders(p, title, rows, onUpd) {
    const inputs = {}; const card = h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, title));
    rows.forEach(([k, lbl, mn, mx, st, v, u, tag]) => { const inp = h('input', { type: 'range', min: mn, max: mx, step: st, value: v }), out = h('output'); inputs[k] = [inp, out, u]; card.appendChild(h('div', { class: 'slider-row' }, h('label', { html: lbl + (tag ? ' ' + B(tag) : '') }), inp, out)); inp.addEventListener('input', go); });
    const right = h('div', { class: 'card' }); p.appendChild(h('div', { class: 'af-calc' }, card, right));
    function go() { const v = {}; for (const k in inputs) { v[k] = +inputs[k][0].value; inputs[k][1].textContent = v[k] + (inputs[k][2] ? ' ' + inputs[k][2] : ''); } onUpd(v, right); }
    go();
  }
  const fx = (v, l, tag) => '<div class="af-fact"><b>' + v + '</b><span>' + l + ' ' + B(tag || 'est') + '</span></div>';

  function irDrop(p) {
    sliders(p, 'Current through a copper path', [['I', 'Current', 10, 800, 10, 400, 'A'], ['R', 'Path resistance', 0.02, 2, 0.02, 0.3, 'mΩ'], ['V', 'Supply voltage', 0.6, 12, 0.05, 0.75, 'V']], (v, el) => {
      const drop = v.I * v.R / 1000, loss = v.I * v.I * v.R / 1000, pct = 100 * drop / v.V;
      el.innerHTML = '<div class="af-out">' + fx((drop * 1000).toFixed(0) + ' mV', 'voltage lost (I·R)') + fx(pct.toFixed(1) + ' %', 'of the supply voltage') + fx(loss.toFixed(1) + ' W', 'heat in the path (I²·R)') + '</div>' +
        '<div class="callout' + (pct > 3 ? ' warn' : '') + '">' + (pct > 3 ? 'More than a few percent of a low-voltage rail is lost in copper. Shorten the path, add copper or plane layers, move the regulator closer, or regulate at the chip using a remote sense line.' : 'Acceptable for most rails. The same current at 12 V would be a much smaller fraction, which is why power travels at high voltage and is converted near the load.') + '</div>' +
        '<p class="muted" style="font-size:13px">Compare: the same ' + v.I + ' A at 54 V carries ' + (v.I * v.V / 54).toFixed(1) + ' A for the same power, so ' + ((v.I * v.V / 54) ** 2 * v.R / 1000).toFixed(2) + ' W of I²R loss instead of ' + loss.toFixed(1) + ' W.</p>';
    });
  }
  function buck(p) {
    sliders(p, 'A multiphase buck converter', [['vin', 'Input voltage', 5, 54, 1, 12, 'V'], ['vout', 'Output voltage', 0.5, 3.3, 0.05, 0.75, 'V'], ['f', 'Switching frequency', 200, 2000, 50, 600, 'kHz'], ['L', 'Inductor per phase', 50, 500, 10, 150, 'nH'], ['n', 'Phases', 1, 24, 1, 12, ''], ['I', 'Load current', 50, 800, 10, 400, 'A'], ['C', 'Output capacitance', 500, 20000, 100, 6000, 'µF']], (v, el) => {
      const D = v.vout / v.vin, dI = (v.vin - v.vout) * D / (v.L * 1e-9 * v.f * 1e3), perPh = v.I / v.n;
      const dItot = dI / Math.max(1, v.n * 0.7), dV = dItot / (8 * v.C * 1e-6 * v.n * v.f * 1e3) * 1000;
      el.innerHTML = '<div class="af-out">' + fx((D * 100).toFixed(1) + ' %', 'duty cycle D = Vout/Vin', 'typ') + fx(perPh.toFixed(0) + ' A', 'current per phase') + fx(dI.toFixed(1) + ' A', 'ripple current per phase (pk-pk)') +
        fx((v.n * v.f / 1000).toFixed(1) + ' MHz', 'effective ripple frequency') + fx(dItot.toFixed(1) + ' A', 'output ripple current (approx.)') + fx(dV.toFixed(2) + ' mV', 'output voltage ripple (approx.)') + '</div>' +
        '<div class="callout' + (perPh > 60 ? ' warn' : '') + '">' + (perPh > 60 ? 'More than ~50–60 A per phase is hard on the power stages and inductors. Add phases.' : 'More phases share the current, cancel each other\'s ripple and respond faster, at the cost of board area and parts.') + ' A very low duty cycle (big step-down ratio) is one reason designs use an intermediate 12 V bus instead of converting 54 V straight to 0.75 V.</div>' +
        '<p class="muted" style="font-size:12.5px">Simplified textbook model; ripple cancellation between phases approximated. ' + B('est') + '</p>';
    });
  }
  function tline(p) {
    sliders(p, 'Reflection at an impedance step', [['z1', 'Line impedance Z₁', 30, 120, 1, 50, 'Ω'], ['z2', 'Discontinuity Z₂ (via, connector, pad)', 20, 150, 1, 38, 'Ω']], (v, el) => {
      const g2 = (v.z2 - v.z1) / (v.z2 + v.z1), rl = -20 * Math.log10(Math.max(1e-6, Math.abs(g2))), tr = 1 - g2 * g2;
      let svg = '<svg viewBox="0 0 600 220" style="width:100%;height:auto;background:#05070a;border:1px solid var(--line);border-radius:10px">';
      const y0 = 130, sc = 1.4, y1 = y0 - (v.z1 - 50) * sc, y2 = y0 - (v.z2 - 50) * sc;
      svg += '<text x="12" y="20" fill="#e6edf5" font-size="13" font-weight="700">TDR view: impedance along the path</text>';
      svg += '<line x1="30" y1="' + y0 + '" x2="580" y2="' + y0 + '" stroke="#243042" stroke-dasharray="3 4"/><text x="34" y="' + (y0 - 4) + '" fill="#8a99ad" font-size="11">50 Ω</text>';
      svg += '<path d="M30 ' + y1 + ' L250 ' + y1 + ' L260 ' + y2 + ' L330 ' + y2 + ' L340 ' + y1 + ' L580 ' + y1 + '" fill="none" stroke="#22d3ee" stroke-width="3"/>';
      svg += '<text x="295" y="' + (Math.max(y1, y2) + 24) + '" text-anchor="middle" fill="#ff4d5e" font-size="12">' + v.z2 + ' Ω</text>';
      svg += '<text x="12" y="208" fill="#8a99ad" font-size="11.5">Light analogy: glass n=1.5 in air n=1.0 reflects (0.5/2.5)² = 4 % of the power, about −14 dB.</text></svg>';
      el.innerHTML = '<div class="af-out">' + fx((g2 * 100).toFixed(1) + ' %', 'reflected amplitude Γ', 'typ') + fx(rl.toFixed(1) + ' dB', 'return loss', 'typ') + fx((tr * 100).toFixed(1) + ' %', 'power transmitted', 'typ') + '</div>' + svg +
        '<div class="callout' + (Math.abs(g2) > 0.1 ? ' warn' : '') + '" style="margin-top:10px">' + (Math.abs(g2) > 0.1 ? 'More than ~10 % reflection is a lot at 200G: reflections bounce back and forth and smear the eye. Fix the geometry (pad size, via design, backdrill) to match the line.' : 'A small mismatch. Each one is minor, but a channel has many (pads, vias, connector, package), and they add up.') + '</div>';
    });
  }

  // ================================================================ course
  C.course.register({
    id: 'elec-course', title: 'Electronics & Boards', icon: '🔌', order: 9.3, storeKey: 'el-last-step',
    levels: LV, levelCh: 'From V to a 200G board', levelBoxTitle: '🛠 What this means for you as system engineer',
    levelHint: 'Press <b>Next</b> to move on. Every level maps the electronics onto mechanics and optics you already know.',
    finish: { go: 'net-course', label: 'Continue: Networking & Protocols →' },
    pages: [
      { id: 'start', title: 'Welcome', ch: 'Start', build(p, ctx) {
        p.appendChild(h('div', { class: 'af-hero' },
          h('div', { class: 'af-eyebrow' }, 'Guided course · for mechanics & optics engineers · about 60 minutes'),
          h('h1', { html: '<em>Electronics</em> and <em>board design</em> for a system engineer' }),
          h('p', { html: 'Enough electronics to <b>lead board reviews, own the power and signal-integrity budgets, and talk with electrical engineers on equal terms</b>, without learning to draw schematics. Every topic is explained through <b>mechanical and optical analogies</b>: voltage as pressure, capacitor as spring, inductor as mass, impedance as refractive index. Just press <b>Next</b>.' }),
          h('div', { class: 'af-analogy', html:
            '<div><span>💧</span><b>V, I, R</b>pressure, flow, narrow pipe</div>' +
            '<div><span>🧲</span><b>L & C</b>mass and spring</div>' +
            '<div><span>🔦</span><b>Impedance</b>refractive index for electrons</div>' +
            '<div><span>🏗️</span><b>PCB</b>a laminated composite structure</div>' }),
          h('div', { class: 'af-cta' },
            h('button', { class: 'btn primary af-bignext', onclick: () => ctx.next() }, 'Start the course →'),
            ctx.resumeId && ctx.resumeId !== 'start' && ctx.resumeId !== 'done' ? h('button', { class: 'btn', onclick: () => ctx.goId(ctx.resumeId) }, 'Resume where you left off') : null)));
        p.appendChild(h('div', { class: 'card', html: '<h3 style="margin-top:0">The route</h3><ol class="af-route">' +
          '<li><b>From V to a 200G board, 12 steps:</b> V/I/R → capacitors & inductors → diodes & transistors → the PCB → power delivery → PDN & decoupling → signal integrity → differential pairs → the 200G channel → thermal & mechanics → EMC & ESD → design flow.</li>' +
          '<li><b>Hands-on, 4 steps:</b> IR-drop calculator, buck-converter calculator, reflection calculator, and a board-review checklist.</li>' +
          '<li><b>Appendix, 4 chapters:</b> a mechanics & optics ↔ electronics dictionary, reading schematics & datasheets, board materials & manufacturing, and lab instruments.</li></ol>' }));
      } },
      '@levels',
      { id: 'el-ir', title: 'Calculator: IR drop & copper loss', ch: 'Hands-on', build(p) {
        p.appendChild(h('h2', { class: 'af-ph' }, 'Why hundreds of amps make every milliohm count'));
        p.appendChild(h('p', { class: 'h-sub' }, 'Ohm\'s law at chip-supply currents. Move the current and the path resistance, and watch voltage and heat disappear into copper.'));
        irDrop(p);
      } },
      { id: 'el-buck', title: 'Calculator: buck converter', ch: 'Hands-on', build(p) {
        p.appendChild(h('h2', { class: 'af-ph' }, 'Size a multiphase VRM'));
        p.appendChild(h('p', { class: 'h-sub' }, 'The questions you will hear in a power review: how many phases, what switching frequency, what inductor, how much ripple? Explore the trade-offs.'));
        buck(p);
      } },
      { id: 'el-refl', title: 'Calculator: reflections', ch: 'Hands-on', build(p) {
        p.appendChild(h('h2', { class: 'af-ph' }, 'Impedance mismatch: the Fresnel equation for electrons'));
        p.appendChild(h('p', { class: 'h-sub' }, 'Choose a line impedance and a discontinuity, and see how much signal bounces back. It is the same maths you know from optical interfaces.'));
        tline(p);
      } },
      { id: 'el-review', title: 'Board-review checklist', ch: 'Hands-on', build(p) {
        p.appendChild(h('h2', { class: 'af-ph' }, 'Your board-review checklist'));
        p.appendChild(h('p', { class: 'h-sub' }, 'Take this into your first schematic or layout review. You don\'t need to know every answer; you need to make sure someone does.'));
        const sec = (t2, items) => '<div class="card"><h3 style="margin-top:0">' + t2 + '</h3><ul>' + items.map(x => '<li>' + x + '</li>').join('') + '</ul></div>';
        p.appendChild(h('div', { class: 'grid2', html:
          sec('⚡ Power', ['Is the <b>power tree</b> complete: every rail\'s voltage, max current, tolerance, ripple limit?', 'Do regulator ratings have <b>margin</b> at the worst case (hot, end of life, max traffic)?', 'Is the <b>sequencing</b> defined (and safe if a rail fails)? Are lasers interlocked to their controls?', 'Is there <b>telemetry</b> (V, I, T) on every important rail, readable over PMBus?', 'Are <b>IR drop and PDN impedance</b> simulated, with results at the corners?']) +
          sec('〰️ Signal integrity', ['Is there a <b>channel loss budget</b>, and does each channel meet it with margin?', 'Is the <b>stackup</b> defined: impedance targets, material, which layers carry 200G?', 'Are <b>via stubs</b> backdrilled, and connector/pad transitions optimized?', 'Are <b>crosstalk</b> and length/skew rules checked by tools, not by eye?', 'Are the reference <b>clocks</b> and their jitter specified?']) +
          sec('🌡️ Thermal & mechanical', ['Do heat sources match the <b>thermal budget</b>, including conversion losses?', 'Board <b>warpage, CTE, stiffeners, clamping loads</b> under cold plates?', '<b>Fiber routing and bend radius</b> keep-outs; connector access for service?', 'Qualification plan: thermal cycling, shock, vibration, and solder-joint life?']) +
          sec('🧰 Management, test & bring-up', ['Can every device be <b>reached</b> (I2C/SPI/PMBus addresses, muxes, no conflicts)?', 'Do <b>hung buses recover</b> (timeouts, reset lines)?', 'Are there <b>test points, loopbacks and PRBS</b> modes to measure each requirement?', 'Is there a <b>firmware update path</b> that can\'t brick the board?', 'Is <b>EMC/ESD</b> protection at every external connector?']) }));
        p.appendChild(h('div', { class: 'af-plain', html: '<b>Red flags to escalate:</b> "we\'ll check that at bring-up" for anything that needs a board change to fix · no margin on a critical rail · simulations only at typical conditions · no telemetry on lasers or optics rails · a requirement nobody can say how to measure.' }));
      } }
    ].concat(C.course.appendixPages(C.elecAppendix)).concat([
      { id: 'done', title: 'Course complete', ch: 'Finish', build(p, ctx) {
        p.appendChild(h('div', { class: 'af-hero' },
          h('div', { class: 'af-eyebrow' }, 'Course complete'),
          h('h1', { html: 'Now you can <em>read the board</em> as well as the optics' }),
          h('ul', { class: 'af-takeaways', html:
            '<li><b>V = I·R</b> and <b>P = I²·R</b> explain power distribution: move power at high voltage, convert near the chip, keep high-current paths short.</li>' +
            '<li><b>Capacitors and inductors are springs and masses</b>: the PDN is a suspension that keeps the voltage flat when the load jumps.</li>' +
            '<li><b>At 200G every trace is a waveguide</b>: impedance ↔ refractive index, reflections ↔ Fresnel, loss grows with frequency, so long channels need heavy equalization and power.</li>' +
            '<li>That is the electrical half of <b>why CPO</b>: millimetres instead of tens of centimetres.</li>' +
            '<li><b>Your mechanics and optics background</b> is a strength: warpage, CTE, stability and alignment link directly to electrical and optical performance.</li>' +
            '<li>Your job in board design: <b>requirements, budgets, reviews and validation</b>, not drawing the schematic.</li>' }),
          h('div', { class: 'af-cta' },
            h('button', { class: 'btn primary', onclick: () => C.go('net-course') }, 'Continue: Networking & Protocols →'),
            h('button', { class: 'btn', onclick: () => C.go('budgets/power') }, 'Practise: power budget'),
            h('button', { class: 'btn', onclick: () => ctx.goId('start') }, '↺ Restart'))));
        p.appendChild(h('div', { class: 'callout warn', html: 'Values are ' + B('typ') + ' industry orders of magnitude or ' + B('est') + ' illustrative estimates for learning, not specifications of any NVIDIA product.' }));
      } }
    ])
  });
})();
