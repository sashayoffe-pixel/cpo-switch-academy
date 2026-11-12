/* CPO Switch Course: a guided "Next, Next" course from the switch's place in the network down to the
   micro-ring modulator and the receiver, written for a new CPO switch system engineer. Uses js/course-engine.js. */
(function () {
  'use strict';
  const C = window.CPO;
  const h = C.h, S = C.s, B = C.badge;
  const K = C.course.K;
  const { R, T, L, P, O, G, cap, along, ptsD } = C.course.svg;
  const num = n => Math.round(n).toLocaleString('en-US');

  C.addGlossary({
    'EIC': { full: 'Electronic Integrated Circuit', def: 'The electronics chip of an optical engine: modulator drivers, TIAs, control and monitoring circuits. Stacked on the PIC.', cat: 'optics' },
    'PIC': { full: 'Photonic Integrated Circuit', def: 'Silicon chip with waveguides, ring modulators, multiplexers, photodetectors and fiber couplers.', cat: 'optics' },
    'OE': { full: 'Optical Engine', def: 'EIC + PIC + fiber attach: converts electrical lanes to light and back, co-packaged next to the switch ASIC.', cat: 'optics' },
    'TIA': { full: 'Transimpedance Amplifier', def: 'Turns the tiny photodetector current into a voltage the SerDes can read.', cat: 'optics' },
    'OMA': { full: 'Optical Modulation Amplitude', def: 'Difference in optical power between the "1" and "0" levels; what the receiver actually sees.', cat: 'optics' },
    'Extinction ratio': { full: 'Extinction ratio (ER)', def: 'Ratio of optical power in the "1" level to the "0" level, in dB.', cat: 'optics' },
    'Link budget': { full: 'Link budget', def: 'Accounting of optical power from the laser to the receiver: launched power minus all losses and penalties must exceed receiver sensitivity with margin.', cat: 'optics' }
  });

  // ================================================================ scenes (viewBox 0 0 1000 600)
  function sFabric(g) {
    cap(g, 20, 34, 'SPINE CPO SWITCHES', K.optic);
    cap(g, 20, 206, 'LEAF CPO SWITCHES', K.optic);
    cap(g, 20, 440, 'GPU SERVERS / RACKS (NICs)', K.acc);
    const sp = [0, 1, 2].map(i => [190 + i * 250, 50]);
    const lf = [0, 1, 2, 3, 4, 5].map(i => [40 + i * 160, 220]);
    const pulses = [];
    lf.forEach(([lx], li) => sp.forEach(([sx]) => {
      const a = [lx + 60, 220], b = [sx + 70, 94];
      L(g, a[0], a[1], b[0], b[1], { stroke: K.optic, 'stroke-opacity': li === 2 ? .7 : .2, 'stroke-width': li === 2 ? 2 : 1.2 });
      pulses.push({ a, b, p: Math.random(), el: O(g, 0, 0, li === 2 ? 3 : 2, { fill: K.optic }) });
    }));
    lf.forEach(([lx], li) => { for (let k = 0; k < 6; k++) { const x = lx + 6 + k * 20; L(g, lx + 60, 262, x + 6, 460, { stroke: K.optic, 'stroke-opacity': li === 2 ? .6 : .15 }); R(g, x, 460, 14, 40, { fill: '#0f1a10', stroke: '#2f5a12', rx: 2 }); } });
    sp.forEach(([x, y]) => { R(g, x, y, 140, 44, { fill: '#1d0e08', stroke: K.optic, rx: 6 }); T(g, x + 70, y + 27, 'Spine', { 'text-anchor': 'middle', 'font-size': 13 }); });
    lf.forEach(([x, y], i) => {
      R(g, x, y, 120, 42, { fill: i === 2 ? '#3a1a0d' : '#1d0e08', stroke: K.optic, 'stroke-width': i === 2 ? 3 : 1, rx: 6, filter: i === 2 ? 'drop-shadow(0 0 10px #ff6b3d)' : '' });
      T(g, x + 60, y + 26, i === 2 ? 'YOUR SWITCH' : 'Leaf', { 'text-anchor': 'middle', 'font-size': i === 2 ? 13.5 : 12.5, 'font-weight': i === 2 ? 700 : 400 });
    });
    R(g, 560, 300, 400, 120, { fill: K.panel, stroke: K.line, rx: 10 });
    cap(g, 576, 326, 'ONE QUANTUM-X PHOTONICS SWITCH', K.text);
    T(g, 576, 352, '144 ports × 800 Gb/s = 115 Tb/s', { 'font-size': 15, fill: K.acc, 'font-weight': 700 });
    T(g, 576, 376, 'half the ports down to GPUs, half up to spines', { 'font-size': 13, fill: K.muted });
    T(g, 576, 398, 'every port is light in a fiber', { 'font-size': 13, fill: K.muted });
    return {
      hot: [{ x: lf[2][0] - 6, y: 214, w: 132, h: 54, target: 'cs-why', label: 'Why CPO' }],
      update(t, dt) { pulses.forEach(q => { q.p = (q.p + dt * 0.45) % 1; q.el.setAttribute('cx', C.lerp(q.a[0], q.b[0], q.p)); q.el.setAttribute('cy', C.lerp(q.a[1], q.b[1], q.p)); }); }
    };
  }

  function sWhy(g) {
    // pluggable
    cap(g, 30, 40, 'TODAY: PLUGGABLE OPTICS', K.muted);
    R(g, 30, 60, 940, 220, { fill: '#0b1016', stroke: K.line, rx: 10 });
    R(g, 60, 120, 110, 100, { fill: '#1b2a10', stroke: K.acc, 'stroke-width': 2 }); T(g, 115, 175, 'ASIC', { 'text-anchor': 'middle', 'font-weight': 700 });
    const tr = P(g, 'M170 170 C 230 120, 270 220, 330 170 S 430 120, 490 170 S 560 220, 610 170', { stroke: K.copper, 'stroke-width': 4 });
    T(g, 390, 112, '~20–30 cm of circuit-board trace + connector', { 'text-anchor': 'middle', fill: K.copper, 'font-size': 13 });
    T(g, 390, 252, 'signal shrinks: ~20–30 dB electrical loss', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12.5 });
    R(g, 610, 105, 260, 130, { fill: '#151b24', stroke: '#3b4a5e', rx: 8 }); T(g, 740, 125, 'pluggable module (front panel)', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12 });
    R(g, 625, 140, 70, 70, { fill: '#160f24', stroke: K.ctrl }); T(g, 660, 180, 'DSP', { 'text-anchor': 'middle', 'font-size': 13 });
    R(g, 710, 140, 70, 70, { fill: '#1d0e08', stroke: K.optic }); T(g, 745, 172, 'laser', { 'text-anchor': 'middle', 'font-size': 12 }); T(g, 745, 188, '+ mod', { 'text-anchor': 'middle', 'font-size': 12 });
    R(g, 795, 140, 60, 70, { fill: '#08171c', stroke: K.data }); T(g, 825, 180, 'PD/TIA', { 'text-anchor': 'middle', 'font-size': 11 });
    L(g, 870, 175, 965, 175, { stroke: K.optic, 'stroke-width': 3 });
    const e1 = []; for (let k = 0; k < 6; k++) e1.push(O(g, 0, 0, 5, { fill: K.data }));
    const o1 = []; for (let k = 0; k < 3; k++) o1.push(O(g, 0, 0, 4, { fill: K.optic }));
    // CPO
    cap(g, 30, 320, 'CO-PACKAGED OPTICS', K.optic);
    R(g, 30, 340, 940, 220, { fill: '#0b1016', stroke: K.optic, 'stroke-opacity': .6, rx: 10 });
    R(g, 160, 380, 300, 150, { fill: '#13110a', stroke: '#5a4d2a', rx: 8 }); T(g, 310, 548, 'one package', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12 });
    R(g, 180, 405, 110, 100, { fill: '#1b2a10', stroke: K.acc, 'stroke-width': 2 }); T(g, 235, 460, 'ASIC', { 'text-anchor': 'middle', 'font-weight': 700 });
    R(g, 330, 420, 110, 70, { fill: '#1d0e08', stroke: K.optic, 'stroke-width': 2 }); T(g, 385, 452, 'optical', { 'text-anchor': 'middle', 'font-size': 12.5 }); T(g, 385, 468, 'engine', { 'text-anchor': 'middle', 'font-size': 12.5 });
    L(g, 290, 455, 330, 455, { stroke: K.data, 'stroke-width': 4 }); T(g, 310, 400, 'mm', { 'text-anchor': 'middle', fill: K.data, 'font-size': 12, 'font-weight': 700 });
    L(g, 440, 455, 965, 455, { stroke: K.optic, 'stroke-width': 3 });
    R(g, 560, 365, 150, 50, { fill: '#2a0f08', stroke: K.optic, rx: 6 }); T(g, 635, 386, 'external laser', { 'text-anchor': 'middle', 'font-size': 12.5 }); T(g, 635, 402, '(front panel, shared)', { 'text-anchor': 'middle', 'font-size': 11, fill: K.muted });
    P(g, 'M560 390 C 500 390, 470 420, 440 432', { stroke: K.optic, 'stroke-width': 2, 'stroke-dasharray': '4 4' });
    T(g, 700, 495, 'no DSP · no long trace · fewer lasers', { 'text-anchor': 'middle', fill: K.acc, 'font-size': 13.5, 'font-weight': 600 });
    const e2 = []; for (let k = 0; k < 2; k++) e2.push(O(g, 0, 0, 5, { fill: K.data }));
    const o2 = []; for (let k = 0; k < 5; k++) o2.push(O(g, 0, 0, 4, { fill: K.optic }));
    // energy bars
    R(g, 780, 370, 170, 110, { fill: K.panel, stroke: K.line, rx: 8 });
    cap(g, 792, 390, 'ENERGY PER BIT', K.muted);
    R(g, 792, 402, 140, 14, { fill: '#3b4a5e', stroke: 'none', rx: 3 }); T(g, 792, 432, 'pluggable ~15–20 pJ/b', { 'font-size': 11.5, fill: K.muted });
    R(g, 792, 442, 45, 14, { fill: K.optic, stroke: 'none', rx: 3 }); T(g, 842, 454, 'CPO ~5 pJ/b', { 'font-size': 11.5, fill: K.optic });
    return {
      hot: [{ x: 156, y: 376, w: 308, h: 158, target: 'cs-chassis', label: 'Inside the CPO switch', below: true }],
      update(t) {
        const len = tr.getTotalLength ? tr.getTotalLength() : 0;
        e1.forEach((d, k) => { const u = (t * 0.25 + k / 6) % 1; if (len) { const p = tr.getPointAtLength(u * len); d.setAttribute('cx', p.x); d.setAttribute('cy', p.y); } d.setAttribute('r', 6 - 4.5 * u); d.setAttribute('fill-opacity', 1 - 0.7 * u); });
        o1.forEach((d, k) => { const u = (t * 0.5 + k / 3) % 1; d.setAttribute('cx', 870 + u * 95); d.setAttribute('cy', 175); });
        e2.forEach((d, k) => { const u = (t * 0.6 + k / 2) % 1; d.setAttribute('cx', 290 + u * 40); d.setAttribute('cy', 455); });
        o2.forEach((d, k) => { const u = (t * 0.35 + k / 5) % 1; d.setAttribute('cx', 440 + u * 525); d.setAttribute('cy', 455); });
      }
    };
  }

  function sChassis(g) {
    R(g, 40, 70, 920, 470, { fill: '#0b1016', stroke: '#3b4a5e', 'stroke-width': 2, rx: 10 });
    cap(g, 50, 60, 'FRONT PANEL', K.optic); cap(g, 860, 60, 'BACK', K.muted);
    T(g, 500, 590, 'Illustrative top view, not an actual product layout.', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12 });
    // front panel: fiber connectors + ELS
    const fp = [];
    for (let i = 0; i < 16; i++) {
      const y = 86 + i * 28, els = i % 4 === 1;
      R(g, 44, y, 56, 22, { fill: els ? '#2a0f08' : '#1d0e08', stroke: els ? K.therm : K.optic, rx: 3 });
      T(g, 72, y + 15, els ? 'ELS' : 'fiber', { 'text-anchor': 'middle', 'font-size': 10.5, fill: els ? '#ffb199' : '#ffd2c2' });
      fp.push([100, y + 11, els]);
    }
    // package + cold plate
    R(g, 400, 180, 240, 240, { fill: '#13110a', stroke: '#5a4d2a', 'stroke-width': 2, rx: 8 });
    R(g, 465, 245, 110, 110, { fill: '#1b2a10', stroke: K.acc, 'stroke-width': 2 }); T(g, 520, 304, 'ASIC', { 'text-anchor': 'middle', 'font-weight': 700 });
    const oes = [];
    for (let k = 0; k < 4; k++) { oes.push([415 + k * 55, 195]); oes.push([415 + k * 55, 380]); }
    oes.forEach(([x, y]) => R(g, x, y, 45, 25, { fill: '#1d0e08', stroke: K.optic, rx: 3 }));
    T(g, 520, 172, 'switch package: ASIC + optical engines', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12 });
    // fibers front panel -> engines
    const fib = [];
    fp.forEach(([x, y, els], i) => {
      const oe = oes[i % oes.length], tx = oe[0] + 22, ty = oe[1] + (oe[1] < 300 ? 0 : 25);
      const pts = [[x, y], [250, y], [330, C.lerp(y, ty, 0.6)], [tx, ty]];
      P(g, ptsD(pts), { stroke: els ? K.therm : K.optic, 'stroke-opacity': .45, 'stroke-width': 1.4 });
      fib.push({ pts: els ? pts : pts.slice().reverse(), p: Math.random(), el: O(g, 0, 0, 2.4, { fill: els ? K.therm : K.optic }) });
    });
    // cold plate pipes
    const cool = P(g, 'M960 130 L700 130 L700 470 L960 470', { stroke: K.cool, 'stroke-width': 5, 'stroke-dasharray': '10 8', 'stroke-opacity': .8 });
    P(g, 'M700 300 L640 300', { stroke: K.cool, 'stroke-width': 5, 'stroke-opacity': .8 });
    T(g, 712, 122, 'liquid cooling in/out', { fill: K.cool, 'font-size': 12.5 });
    // power + mgmt
    R(g, 760, 180, 170, 70, { fill: '#160f24', stroke: K.ctrl, rx: 6 }); T(g, 845, 210, 'Management', { 'text-anchor': 'middle', 'font-size': 13 }); T(g, 845, 228, 'CPU · BMC · CPLD', { 'text-anchor': 'middle', 'font-size': 11.5, fill: K.muted });
    R(g, 760, 290, 170, 130, { fill: '#1d1a06', stroke: K.power, rx: 6 }); T(g, 845, 340, 'Power', { 'text-anchor': 'middle', 'font-size': 13, fill: K.power }); T(g, 845, 358, 'PSUs / busbar input', { 'text-anchor': 'middle', 'font-size': 11.5, fill: K.muted }); T(g, 845, 376, '→ VRMs near the ASIC', { 'text-anchor': 'middle', 'font-size': 11.5, fill: K.muted });
    L(g, 760, 355, 640, 355, { stroke: K.power, 'stroke-width': 3, 'stroke-opacity': .6 });
    L(g, 760, 215, 640, 215, { stroke: K.ctrl, 'stroke-width': 2, 'stroke-dasharray': '4 4' });
    return {
      hot: [{ x: 394, y: 174, w: 252, h: 252, target: 'cs-package', label: 'Package', inside: false, below: true },
        { x: 40, y: 110, w: 64, h: 30, go: 'architecture/external-laser', label: 'Laser module ↗', below: true }],
      update(t, dt) {
        fib.forEach(f => { f.p = (f.p + dt * 0.35) % 1; const p = along(f.pts, f.p); f.el.setAttribute('cx', p[0]); f.el.setAttribute('cy', p[1]); });
        cool.setAttribute('stroke-dashoffset', -t * 25);
      }
    };
  }

  function sPackage(g) {
    R(g, 120, 50, 760, 500, { fill: '#13110a', stroke: '#5a4d2a', 'stroke-width': 2, rx: 12 });
    T(g, 136, 72, 'package substrate', { fill: K.muted, 'font-size': 12.5 });
    R(g, 380, 180, 240, 240, { fill: '#1b2a10', stroke: K.acc, 'stroke-width': 2.5 });
    T(g, 500, 296, 'SWITCH ASIC', { 'text-anchor': 'middle', 'font-weight': 700, 'font-size': 17 });
    T(g, 500, 318, 'packet processing', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12.5 });
    const oes = [], links = [];
    const side = (n, f) => { for (let k = 0; k < n; k++) f(k); };
    side(3, k => { oes.push([400 + k * 70, 100, 'up']); oes.push([400 + k * 70, 445, 'down']); });
    side(3, k => { oes.push([255, 200 + k * 70, 'left']); oes.push([670, 200 + k * 70, 'right']); });
    oes.forEach(([x, y, d]) => {
      const w = d === 'up' || d === 'down' ? 60 : 75, hh = d === 'up' || d === 'down' ? 55 : 50;
      R(g, x, y, w, hh, { fill: '#1d0e08', stroke: K.optic, 'stroke-width': 1.8, rx: 4 });
      T(g, x + w / 2, y + hh / 2 + 4, 'OE', { 'text-anchor': 'middle', 'font-size': 12.5, fill: '#ffd2c2' });
      // electrical link to ASIC, fiber outwards
      let a, b, f1, f2;
      if (d === 'up') { a = [x + 30, y + 55]; b = [x + 30, 180]; f1 = [x + 30, y]; f2 = [x + 30, 20]; }
      else if (d === 'down') { a = [x + 30, y]; b = [x + 30, 420]; f1 = [x + 30, y + 55]; f2 = [x + 30, 580]; }
      else if (d === 'left') { a = [x + 75, y + 25]; b = [380, y + 25]; f1 = [x, y + 25]; f2 = [100, y + 25]; }
      else { a = [x, y + 25]; b = [620, y + 25]; f1 = [x + 75, y + 25]; f2 = [900, y + 25]; }
      links.push(L(g, a[0], a[1], b[0], b[1], { stroke: K.data, 'stroke-width': 4, 'stroke-dasharray': '3 4' }));
      L(g, f1[0], f1[1], f2[0], f2[1], { stroke: K.optic, 'stroke-width': 2.5, 'stroke-opacity': .7 });
    });
    T(g, 870, 140, 'fibers out', { 'text-anchor': 'end', fill: K.optic, 'font-size': 13 });
    T(g, 500, 172, '← few-mm electrical links →', { 'text-anchor': 'middle', fill: K.data, 'font-size': 12 });
    T(g, 500, 538, 'Number and placement of optical engines here is illustrative.', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12 });
    return {
      hot: [{ x: 376, y: 176, w: 248, h: 248, target: 'cs-asic', label: 'ASIC', inside: true }],
      update(t) { links.forEach((l, i) => l.setAttribute('stroke-dashoffset', -t * 30 * (i % 2 ? 1 : -1))); }
    };
  }

  function sAsic(g) {
    R(g, 90, 50, 820, 500, { fill: '#0b130c', stroke: K.acc, 'stroke-width': 2, rx: 6 });
    // serdes ring
    const sd = [];
    for (let k = 0; k < 18; k++) { sd.push(R(g, 110 + k * 44, 58, 36, 22, { fill: '#08171c', stroke: K.data, rx: 2 })); sd.push(R(g, 110 + k * 44, 520, 36, 22, { fill: '#08171c', stroke: K.data, rx: 2 })); }
    for (let k = 0; k < 9; k++) { sd.push(R(g, 96, 98 + k * 46, 22, 36, { fill: '#08171c', stroke: K.data, rx: 2 })); sd.push(R(g, 882, 98 + k * 46, 22, 36, { fill: '#08171c', stroke: K.data, rx: 2 })); }
    T(g, 500, 104, 'SerDes all around the edge: hundreds of 200G electrical lanes', { 'text-anchor': 'middle', fill: K.data, 'font-size': 13 });
    // pipeline
    const st = [['Parse', 160], ['Look up', 290], ['Decide', 420]];
    st.forEach(([n, x]) => { R(g, x, 150, 110, 60, { fill: '#122012', stroke: K.acc, rx: 6 }); T(g, x + 55, 185, n, { 'text-anchor': 'middle', 'font-size': 13.5 }); });
    T(g, 290, 140, 'ingress pipeline: read header, find the output port', { 'text-anchor': 'start', fill: K.muted, 'font-size': 12 });
    R(g, 560, 140, 310, 180, { fill: '#0b1a2e', stroke: K.cool, rx: 6 }); T(g, 715, 220, 'Packet buffer (SRAM)', { 'text-anchor': 'middle', 'font-size': 14, fill: '#bcd4ff' }); T(g, 715, 240, 'absorbs bursts while ports are busy', { 'text-anchor': 'middle', 'font-size': 12, fill: K.muted });
    R(g, 160, 260, 370, 60, { fill: '#160f24', stroke: K.ctrl, rx: 6 }); T(g, 345, 295, 'Traffic manager: queues, priorities, congestion control', { 'text-anchor': 'middle', 'font-size': 12.5, fill: '#d9ccff' });
    R(g, 160, 360, 710, 60, { fill: '#122012', stroke: K.acc, rx: 6 }); T(g, 515, 395, 'Egress pipeline → out to the right port\'s SerDes', { 'text-anchor': 'middle', 'font-size': 13.5 });
    R(g, 160, 440, 710, 50, { fill: '#160f24', stroke: K.ctrl, rx: 6 }); T(g, 515, 470, 'Control & telemetry: counters, FEC stats, temperatures, adaptive routing', { 'text-anchor': 'middle', 'font-size': 12.5, fill: '#d9ccff' });
    const path = [[118, 180], [160, 180], [530, 180], [560, 230], [870, 230], [870, 390], [160, 390], [118, 390]];
    const pk = []; for (let k = 0; k < 7; k++) pk.push(R(g, 0, 0, 16, 10, { fill: '#fff', stroke: 'none', rx: 2, 'fill-opacity': .9 }));
    return {
      hot: [{ x: 92, y: 54, w: 116, h: 30, target: 'cs-serdes', label: 'SerDes', below: true }],
      update(t) {
        pk.forEach((r, k) => { const p = along(path, (t * 0.12 + k / 7) % 1); r.setAttribute('x', p[0] - 8); r.setAttribute('y', p[1] - 5); });
        sd.forEach((r, i) => r.setAttribute('fill-opacity', Math.sin(t * 4 + i * 1.3) > 0.3 ? 1 : 0.4));
      }
    };
  }

  const PAM = [3, 0, 2, 1, 3, 3, 0, 1, 2, 0, 3, 1, 2, 2, 0, 3, 1, 0, 2, 3, 1, 1, 3, 0];
  function sSerdes(g) {
    R(g, 40, 70, 140, 120, { fill: '#08171c', stroke: K.data, rx: 8 }); T(g, 110, 125, 'TX', { 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 700 }); T(g, 110, 148, 'in the ASIC', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12 });
    R(g, 820, 70, 140, 120, { fill: '#1d0e08', stroke: K.optic, rx: 8 }); T(g, 890, 120, 'optical', { 'text-anchor': 'middle', 'font-size': 15 }); T(g, 890, 140, 'engine', { 'text-anchor': 'middle', 'font-size': 15 }); T(g, 890, 162, '(driver)', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12 });
    T(g, 500, 64, 'one electrical lane: 2 bits per symbol, ~106–113 billion symbols per second', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 13 });
    // levels
    const y0 = 90, y3 = 170, ly = v => C.lerp(y3, y0, v / 3);
    ['00', '01', '10', '11'].forEach((b, v) => { L(g, 200, ly(v), 800, ly(v), { stroke: K.line, 'stroke-dasharray': '3 6' }); T(g, 806, ly(v) + 4, b, { fill: K.muted, 'font-size': 11, 'font-family': 'ui-monospace,monospace' }); });
    const wave = P(g, '', { stroke: K.data, 'stroke-width': 2.5 });
    // eye diagram
    cap(g, 60, 240, 'EYE DIAGRAM (all symbols overlaid)', K.text);
    R(g, 60, 252, 420, 300, { fill: '#05080b', stroke: K.line, rx: 8 });
    const eye = G(g, {});
    const ex = x => 80 + x * 380, ey = v => C.lerp(530, 275, v / 3);
    const traces = [];
    for (let k = 0; k < 40; k++) traces.push(P(eye, '', { stroke: K.data, 'stroke-opacity': .25, 'stroke-width': 1.2 }));
    T(g, 270, 545, '3 "eyes": open eyes = easy to read the right level', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12 });
    // right info
    R(g, 520, 252, 420, 300, { fill: K.panel, stroke: K.line, rx: 8 });
    cap(g, 540, 280, 'WHY THE SHORT CHANNEL MATTERS', K.optic);
    const lines = ['PAM4 squeezes 4 levels into the same voltage,', 'so each eye is ~3× smaller than with 2 levels', '(about 9.5 dB less signal-to-noise).', '', 'Pluggable: the signal crosses ~20–30 cm of', 'board → heavy equalization, a DSP retimer, watts.', '', 'CPO: a few mm to the optical engine →', 'simpler, lower-power SerDes and cleaner eyes', '(NVIDIA: 63× better signal integrity).'];
    lines.forEach((s, i) => T(g, 540, 308 + i * 22, s, { 'font-size': 13, fill: i >= 7 ? K.acc : K.text }));
    let noise = 0.08;
    return {
      hot: [{ x: 814, y: 64, w: 152, h: 132, target: 'cs-oe', label: 'Optical engine', below: true }],
      update(t) {
        const shift = (t * 4) % 1, start = Math.floor(t * 4);
        let d = '';
        for (let i = 0; i <= 13; i++) {
          const v = PAM[(start + i) % PAM.length], x = 200 + (i - shift) * 48;
          if (x < 200 || x > 800) continue;
          d += (d ? ' L' : 'M') + x.toFixed(1) + ' ' + ly(v) + ' L' + Math.min(800, x + 30).toFixed(1) + ' ' + ly(v);
        }
        wave.setAttribute('d', d);
        noise = 0.06 + 0.05 * (Math.sin(t * 0.7) + 1);
        traces.forEach((p, k) => {
          const q = Math.floor(t * 3), pv = PAM[(k * 5 + q) % PAM.length], a = PAM[(k * 7 + 2 + q) % PAM.length], b = PAM[(k * 11 + 3 + q) % PAM.length];
          const n = Math.sin(k * 12.9 + t * 9) * noise * 3, y1 = ey((pv + a) / 2 + n), ya = ey(a + n), y2 = ey((a + b) / 2 + n);
          // one symbol: transition in from the previous level, flat in the middle (eye centre), transition out
          p.setAttribute('d', 'M' + ex(0) + ' ' + y1 + ' C' + ex(0.12) + ' ' + ya + ' ' + ex(0.12) + ' ' + ya + ' ' + ex(0.25) + ' ' + ya + ' L' + ex(0.75) + ' ' + ya + ' C' + ex(0.88) + ' ' + ya + ' ' + ex(0.88) + ' ' + ya + ' ' + ex(1) + ' ' + y2);
        });
      }
    };
  }

  function sOe(g) {
    cap(g, 30, 40, 'OPTICAL ENGINE · cross-section (not to scale)', K.text);
    // EIC
    R(g, 300, 130, 400, 90, { fill: '#122012', stroke: K.acc, 'stroke-width': 2, rx: 6 });
    T(g, 500, 165, 'EIC: electronic chip', { 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700 });
    T(g, 500, 188, 'modulator drivers · TIAs · ring control · monitors', { 'text-anchor': 'middle', 'font-size': 12.5, fill: K.muted });
    // bonds
    for (let k = 0; k < 24; k++) R(g, 310 + k * 16, 222, 8, 10, { fill: '#c9a227', stroke: 'none', rx: 1 });
    T(g, 720, 232, '← 3D stacking (TSMC COUPE / SoIC)', { fill: '#e8c766', 'font-size': 12.5 });
    // PIC
    R(g, 150, 234, 700, 120, { fill: '#0d1a2b', stroke: '#5c86b8', 'stroke-width': 2, rx: 6 });
    T(g, 500, 262, 'PIC: photonic chip (silicon)', { 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: '#bcd4ff' });
    L(g, 150, 310, 850, 310, { stroke: '#5c86b8', 'stroke-width': 4 });
    for (let k = 0; k < 4; k++) O(g, 360 + k * 70, 292, 14, { fill: 'none', stroke: K.optic, 'stroke-width': 3 });
    T(g, 465, 340, 'waveguide + micro-ring modulators', { 'text-anchor': 'middle', fill: '#ffd2c2', 'font-size': 12.5 });
    R(g, 690, 290, 60, 34, { fill: '#26323f', stroke: K.data }); T(g, 720, 312, 'PD', { 'text-anchor': 'middle', 'font-size': 12 });
    R(g, 150, 354, 700, 40, { fill: '#141a22', stroke: '#3b4a5e' }); T(g, 500, 380, 'carrier / package substrate', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12.5 });
    // inputs/outputs
    const inF = [[20, 310], [150, 310]], outF = [[850, 310], [980, 310]];
    L(g, 20, 310, 150, 310, { stroke: K.optic, 'stroke-width': 4, 'stroke-opacity': .5 });
    L(g, 850, 310, 980, 310, { stroke: K.optic, 'stroke-width': 4, 'stroke-opacity': .5 });
    T(g, 20, 290, 'steady laser light in', { fill: K.optic, 'font-size': 13 });
    T(g, 980, 290, 'data light out →', { 'text-anchor': 'end', fill: K.optic, 'font-size': 13 });
    P(g, 'M500 20 L500 60 L420 60 L420 130', { stroke: K.data, 'stroke-width': 3 });
    T(g, 510, 34, 'electrical lanes from the ASIC (mm away)', { fill: K.data, 'font-size': 13 });
    const cw = []; for (let k = 0; k < 6; k++) cw.push(O(g, 0, 0, 4, { fill: K.optic }));
    const md = []; for (let k = 0; k < 10; k++) md.push(O(g, 0, 0, 4, { fill: K.optic }));
    const el = []; for (let k = 0; k < 4; k++) el.push(O(g, 0, 0, 4, { fill: K.data }));
    R(g, 150, 440, 700, 120, { fill: K.panel, stroke: K.line, rx: 10 });
    cap(g, 170, 466, 'THE TWO-CHIP IDEA', K.text);
    T(g, 170, 492, 'Photonics needs special silicon (waveguides); fast electronics need an advanced CMOS process.', { 'font-size': 13 });
    T(g, 170, 514, 'Stacking them face-to-face gives very short, low-capacitance connections between driver and ring', { 'font-size': 13 });
    T(g, 170, 536, '→ less power and cleaner signals than two chips side by side.', { 'font-size': 13, fill: K.acc });
    return {
      hot: [{ x: 14, y: 270, w: 140, h: 60, target: 'cs-laser', label: 'Laser source', below: true }],
      update(t) {
        cw.forEach((d, k) => { const p = along(inF, (t * 0.5 + k / 6) % 1); d.setAttribute('cx', p[0]); d.setAttribute('cy', p[1]); });
        md.forEach((d, k) => { const u = (t * 0.25 + k / 10) % 1; d.setAttribute('cx', 150 + u * 830); d.setAttribute('cy', 310); const bit = PAM[(k + Math.floor(t * 2)) % PAM.length] > 1; d.setAttribute('fill-opacity', u < 0.3 ? 1 : bit ? 1 : 0.15); });
        el.forEach((d, k) => { const p = along([[500, 20], [500, 60], [420, 60], [420, 130]], (t * 0.6 + k / 4) % 1); d.setAttribute('cx', p[0]); d.setAttribute('cy', p[1]); });
      }
    };
  }

  function sLaser(g) {
    cap(g, 30, 40, 'EXTERNAL LASER SOURCE (ELS) · front-panel module', K.text);
    R(g, 60, 80, 380, 420, { fill: '#1a0d08', stroke: K.therm, 'stroke-width': 2, rx: 12 });
    T(g, 250, 108, 'pluggable from the front panel', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12.5 });
    const cols = ['#ff6b3d', '#ff8a3d', '#ffa53d', '#ffc23d'];
    const beams = [];
    for (let k = 0; k < 4; k++) {
      const y = 150 + k * 80;
      R(g, 90, y, 90, 46, { fill: '#2a0f08', stroke: cols[k], rx: 4 });
      T(g, 135, y + 20, 'laser ' + (k + 1), { 'text-anchor': 'middle', 'font-size': 12 });
      T(g, 135, y + 37, 'λ' + (k + 1), { 'text-anchor': 'middle', 'font-size': 12, fill: cols[k] });
      const pts = [[180, y + 23], [300, y + 23], [360, 300]];
      P(g, ptsD(pts), { stroke: cols[k], 'stroke-width': 2.5, 'stroke-opacity': .6 });
      beams.push({ pts, col: cols[k], d: [0, 1, 2].map(q => O(g, 0, 0, 3.5, { fill: cols[k] })) });
    }
    R(g, 350, 280, 70, 40, { fill: '#2a0f08', stroke: K.optic, rx: 4 }); T(g, 385, 305, 'split', { 'text-anchor': 'middle', 'font-size': 12 });
    T(g, 250, 480, 'temperature + power controlled · monitor photodiodes', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12 });
    // fibers to engines
    const outs = [];
    for (let k = 0; k < 6; k++) {
      const y = 140 + k * 64, pts = [[420, 300], [520, C.lerp(300, y, 0.6)], [740, y], [800, y]];
      P(g, ptsD(pts), { stroke: K.optic, 'stroke-width': 1.8, 'stroke-opacity': .55 });
      R(g, 800, y - 18, 140, 36, { fill: '#1d0e08', stroke: K.optic, rx: 4 }); T(g, 870, y + 5, 'optical engine', { 'text-anchor': 'middle', 'font-size': 12 });
      outs.push({ pts, d: [0, 1].map(() => O(g, 0, 0, 3, { fill: K.optic })) });
    }
    T(g, 620, 110, 'steady (CW) light, no data yet', { 'text-anchor': 'middle', fill: K.optic, 'font-size': 13.5, 'font-weight': 600 });
    R(g, 470, 520, 480, 60, { fill: K.panel, stroke: K.line, rx: 8 });
    T(g, 490, 545, 'Why outside? Lasers dislike heat and wear out first.', { 'font-size': 13 });
    T(g, 490, 566, 'Away from the hot ASIC, and swappable without opening the box.', { 'font-size': 13, fill: K.acc });
    return {
      hot: [{ x: 796, y: 118, w: 148, h: 44, target: 'cs-mrm', label: 'Ring modulator', below: false }],
      update(t) {
        beams.forEach((b, k) => b.d.forEach((d, q) => { const p = along(b.pts, (t * 0.4 + q / 3 + k * 0.1) % 1); d.setAttribute('cx', p[0]); d.setAttribute('cy', p[1]); }));
        outs.forEach((o, k) => o.d.forEach((d, q) => { const p = along(o.pts, (t * 0.35 + q / 2 + k * 0.13) % 1); d.setAttribute('cx', p[0]); d.setAttribute('cy', p[1]); }));
      }
    };
  }

  function sMrm(g) {
    cap(g, 30, 40, 'MICRO-RING MODULATOR · a few micrometres across', K.text);
    // bus + ring
    L(g, 40, 400, 960, 400, { stroke: '#5c86b8', 'stroke-width': 10, 'stroke-opacity': .5 });
    const ring = O(g, 330, 300, 90, { fill: 'none', stroke: '#5c86b8', 'stroke-width': 10, 'stroke-opacity': .6 });
    const glow = O(g, 330, 300, 90, { fill: 'none', stroke: K.optic, 'stroke-width': 6, 'stroke-opacity': 0 });
    const elec = P(g, 'M260 230 A 100 100 0 0 1 400 230', { stroke: K.data, 'stroke-width': 5 });
    T(g, 330, 196, 'electrodes: data voltage', { 'text-anchor': 'middle', fill: K.data, 'font-size': 13 });
    P(g, 'M250 360 A 100 100 0 0 0 410 360', { stroke: K.therm, 'stroke-width': 3, 'stroke-dasharray': '4 4' });
    T(g, 330, 470, 'heater (tuning)', { 'text-anchor': 'middle', fill: K.therm, 'font-size': 12.5 });
    T(g, 60, 385, 'laser in →', { fill: K.optic, 'font-size': 13 });
    T(g, 940, 385, '→ data out', { 'text-anchor': 'end', fill: K.optic, 'font-size': 13 });
    const inD = []; for (let k = 0; k < 6; k++) inD.push(O(g, 0, 0, 5, { fill: K.optic }));
    const outD = []; for (let k = 0; k < 10; k++) outD.push({ el: O(g, 0, 0, 5, { fill: K.optic }), u: k / 10, b: 1 });
    // spectrum inset
    R(g, 560, 60, 400, 230, { fill: '#05080b', stroke: K.line, rx: 8 });
    cap(g, 576, 84, 'LIGHT PASSING vs WAVELENGTH', K.muted);
    const X = w => 590 + w * 350, Y = v => 250 - v * 140;
    L(g, 590, 250, 940, 250, { stroke: K.line }); T(g, 765, 280, 'wavelength →', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 11.5 });
    const laserX = X(0.5);
    L(g, laserX, 100, laserX, 252, { stroke: K.optic, 'stroke-width': 2.5 }); T(g, laserX + 6, 110, 'laser', { fill: K.optic, 'font-size': 12 });
    const curve = P(g, '', { stroke: '#bcd4ff', 'stroke-width': 2.5 });
    const bitT = T(g, 576, 320, '', { 'font-size': 15, 'font-weight': 700 });
    const bitD = T(g, 576, 342, '', { 'font-size': 12.5, fill: K.muted });
    const scope = P(g, '', { stroke: K.optic, 'stroke-width': 2 });
    T(g, 560, 520, 'output light over time', { fill: K.muted, 'font-size': 12 });
    R(g, 556, 530, 404, 50, { fill: 'none', stroke: K.line, rx: 6 });
    const hist = [];
    return {
      hot: [{ x: 236, y: 352, w: 190, h: 70, target: 'cs-ringlock', label: 'Heater & lock loop', below: true }],
      update(t, dt) {
        const bit = PAM[Math.floor(t * 1.4) % PAM.length] > 1 ? 1 : 0;
        const c0 = bit ? 0.62 : 0.5; // dip centre: on the laser (0) or shifted (1)
        let d = '';
        for (let i = 0; i <= 100; i++) { const w = i / 100; const tr = 1 - 0.9 / (1 + Math.pow((w - c0) / 0.035, 2)); d += (i ? 'L' : 'M') + X(w).toFixed(1) + ' ' + Y(tr).toFixed(1); }
        curve.setAttribute('d', d);
        const pass = 1 - 0.9 / (1 + Math.pow((0.5 - c0) / 0.035, 2));
        bitT.textContent = bit ? 'bit 1 → ring detuned → light passes' : 'bit 0 → ring on resonance → light trapped';
        bitT.setAttribute('fill', bit ? K.acc : K.muted);
        bitD.textContent = 'a small voltage shifts the dip by a fraction of a nanometre';
        glow.setAttribute('stroke-opacity', bit ? 0.05 : 0.7);
        elec.setAttribute('stroke-opacity', bit ? 1 : 0.35);
        inD.forEach((q, k) => { const u = (t * 0.5 + k / 6) % 1; q.setAttribute('cx', 40 + u * 290); q.setAttribute('cy', 400); });
        outD.forEach(o => { o.u += dt * 0.5; if (o.u > 1) { o.u -= 1; o.b = pass; } o.el.setAttribute('cx', 330 + o.u * 630); o.el.setAttribute('cy', 400); o.el.setAttribute('fill-opacity', 0.1 + 0.9 * o.b); });
        hist.push(pass); if (hist.length > 190) hist.shift();
        scope.setAttribute('d', hist.map((v, i) => (i ? 'L' : 'M') + (958 - (hist.length - 1 - i) * 2) + ' ' + (574 - v * 38)).join(' '));
      }
    };
  }

  function sLock(g) {
    cap(g, 30, 40, 'RING LOCK: keeping the ring on the laser while temperature changes', K.text);
    R(g, 40, 60, 560, 300, { fill: '#05080b', stroke: K.line, rx: 8 });
    const X = w => 60 + w * 520, Y = v => 330 - v * 220;
    L(g, 60, 330, 580, 330, { stroke: K.line });
    const laserX = X(0.5);
    L(g, laserX, 90, laserX, 332, { stroke: K.optic, 'stroke-width': 2.5 }); T(g, laserX + 6, 100, 'laser', { fill: K.optic, 'font-size': 12 });
    const ghost = P(g, '', { stroke: K.bad, 'stroke-width': 2, 'stroke-dasharray': '5 5' });
    const curve = P(g, '', { stroke: '#bcd4ff', 'stroke-width': 2.5 });
    T(g, 70, 350, 'red dashed: ring with NO control drifts away', { fill: K.bad, 'font-size': 12 });
    // loop diagram
    const boxes = [['Ring', 650, 80, K.optic], ['Monitor PD', 820, 80, K.data], ['ADC', 820, 200, K.sense], ['Controller', 820, 320, K.ctrl], ['Heater DAC', 650, 320, K.therm]];
    boxes.forEach(([n, x, y, c]) => { R(g, x, y, 130, 60, { fill: K.panel, stroke: c, 'stroke-width': 2, rx: 8 }); T(g, x + 65, y + 35, n, { 'text-anchor': 'middle', 'font-size': 13.5 }); });
    const loopPts = [[780, 110], [820, 110], [885, 140], [885, 200], [885, 260], [885, 320], [820, 350], [780, 350], [715, 320], [715, 140]];
    P(g, ptsD(loopPts) + ' Z', { stroke: K.ctrl, 'stroke-width': 2, 'stroke-dasharray': '5 5' });
    const ld = []; for (let k = 0; k < 5; k++) ld.push(O(g, 0, 0, 4, { fill: K.ctrl }));
    // meters
    const tT = T(g, 60, 410, '', { 'font-size': 15, 'font-weight': 700, fill: K.therm });
    const tH = T(g, 60, 436, '', { 'font-size': 14, fill: K.text });
    const tE = T(g, 60, 462, '', { 'font-size': 14, fill: K.acc });
    R(g, 560, 400, 400, 170, { fill: K.panel, stroke: K.line, rx: 8 });
    cap(g, 576, 424, 'THE NUMBERS', K.text);
    ['Silicon\'s index changes with temperature:', '→ ring drifts ~0.07–0.1 nm per °C', 'Ring linewidth ~0.1 nm (λ / Q)', '→ ~1 °C uncorrected ≈ a broken link', 'Heater tunes ~0.1–0.3 nm per mW'].forEach((s, i) => T(g, 576, 450 + i * 22, s, { 'font-size': 13, fill: i % 2 ? K.acc : K.text }));
    let heat = 0;
    return {
      hot: [{ x: 40, y: 60, w: 160, h: 50, target: 'cs-wdm', label: 'Many rings, many colours', inside: true }],
      update(t, dt) {
        const temp = 3 * Math.sin(t * 0.5) + 1.5 * Math.sin(t * 1.3); // °C wander
        const drift = temp * 0.012;                               // dip shift (scene units)
        const want = -drift; heat += (want - heat) * Math.min(1, dt * 2.5);
        const c = 0.5 + drift + heat, cg = 0.5 + drift;
        const mk = cc => { let d = ''; for (let i = 0; i <= 100; i++) { const w = i / 100; const tr = 1 - 0.9 / (1 + Math.pow((w - cc) / 0.03, 2)); d += (i ? 'L' : 'M') + X(w).toFixed(1) + ' ' + Y(tr).toFixed(1); } return d; };
        curve.setAttribute('d', mk(c)); ghost.setAttribute('d', mk(cg));
        tT.textContent = 'temperature change: ' + (temp >= 0 ? '+' : '') + temp.toFixed(1) + ' °C';
        tH.textContent = 'heater correction: ' + (heat * 100 / 1.2).toFixed(0) + ' (arbitrary units)';
        tE.textContent = 'remaining error: ' + Math.abs((c - 0.5) * 8).toFixed(3) + ' nm (locked)';
        ld.forEach((d, k) => { const p = along(loopPts.concat([loopPts[0]]), (t * 0.2 + k / 5) % 1); d.setAttribute('cx', p[0]); d.setAttribute('cy', p[1]); });
      }
    };
  }

  function sWdm(g) {
    cap(g, 30, 40, 'WDM: several colours of light share one fiber', K.text);
    L(g, 40, 330, 860, 330, { stroke: '#5c86b8', 'stroke-width': 8, 'stroke-opacity': .5 });
    const cols = ['#ff6b3d', '#ff8a3d', '#ffa53d', '#ffc23d'];
    const rings = [];
    for (let k = 0; k < 4; k++) {
      const x = 200 + k * 160;
      rings.push(O(g, x, 265, 48, { fill: 'none', stroke: cols[k], 'stroke-width': 6, 'stroke-opacity': .8 }));
      T(g, x, 270, 'λ' + (k + 1), { 'text-anchor': 'middle', 'font-size': 14, fill: cols[k], 'font-weight': 700 });
      L(g, x, 160, x, 216, { stroke: K.data, 'stroke-width': 3 });
      T(g, x, 150, 'lane ' + (k + 1), { 'text-anchor': 'middle', fill: K.data, 'font-size': 12.5 });
    }
    T(g, 520, 120, 'each ring is tuned to its own wavelength and only touches that colour', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 13 });
    T(g, 50, 315, 'all colours in →', { fill: K.optic, 'font-size': 13 });
    // coupler + fiber
    P(g, 'M860 322 L900 312 L900 348 L860 338 Z', { fill: '#1d0e08', stroke: K.optic });
    T(g, 870, 384, 'fiber coupler', { 'text-anchor': 'middle', fill: K.optic, 'font-size': 12 });
    R(g, 900, 318, 90, 24, { fill: '#2a0f08', stroke: K.optic, rx: 10 }); T(g, 945, 364, 'fiber', { 'text-anchor': 'middle', fill: K.optic, 'font-size': 12 });
    const dots = []; for (let k = 0; k < 24; k++) dots.push({ el: O(g, 0, 0, 4, { fill: cols[k % 4] }), u: k / 24, c: k % 4 });
    R(g, 40, 420, 920, 150, { fill: K.panel, stroke: K.line, rx: 10 });
    cap(g, 60, 446, 'WHY IT MATTERS', K.text);
    T(g, 60, 474, 'More bandwidth per fiber → fewer fibers to route out of the package and through the front panel.', { 'font-size': 13.5 });
    T(g, 60, 498, 'Rings are naturally wavelength-selective, so modulators double as a multiplexer.', { 'font-size': 13.5 });
    T(g, 60, 522, 'Getting light into and out of the chip (fiber coupling) costs ~1–3 dB per coupler.', { 'font-size': 13.5, fill: K.warn });
    T(g, 60, 546, 'Silicon waveguide ~0.5 µm wide vs fiber core ~9 µm: couplers adapt the size; alignment is critical.', { 'font-size': 13.5 });
    return {
      hot: [{ x: 896, y: 300, w: 98, h: 50, target: 'cs-rx', label: 'Receiver' }],
      update(t, dt) {
        dots.forEach(d => {
          d.u = (d.u + dt * 0.18) % 1;
          const x = 40 + d.u * 940, rx = 200 + d.c * 160;
          d.el.setAttribute('cx', Math.min(980, x)); d.el.setAttribute('cy', x > 900 ? 330 : 330);
          const bit = PAM[(d.c * 5 + Math.floor((t - d.u * 3) * 1.6)) % PAM.length] > 1;
          d.el.setAttribute('fill-opacity', x < rx ? 0.9 : bit ? 0.95 : 0.12);
        });
        rings.forEach((r, k) => r.setAttribute('stroke-opacity', 0.45 + 0.45 * Math.abs(Math.sin(t * (2 + k * 0.4)))));
      }
    };
  }

  function sRx(g) {
    cap(g, 30, 40, 'RECEIVER: light → current → voltage → bits', K.text);
    R(g, 20, 300, 120, 30, { fill: '#2a0f08', stroke: K.optic, rx: 12 }); T(g, 80, 290, 'fiber in', { 'text-anchor': 'middle', fill: K.optic, 'font-size': 12.5 });
    L(g, 140, 315, 330, 315, { stroke: '#5c86b8', 'stroke-width': 8, 'stroke-opacity': .5 });
    O(g, 240, 258, 40, { fill: 'none', stroke: K.optic, 'stroke-width': 5, 'stroke-opacity': .7 });
    T(g, 240, 200, 'drop ring picks one colour', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12.5 });
    // PD
    R(g, 330, 270, 140, 90, { fill: '#26323f', stroke: K.data, 'stroke-width': 2, rx: 6 });
    T(g, 400, 308, 'Germanium', { 'text-anchor': 'middle', 'font-size': 13 }); T(g, 400, 326, 'photodetector', { 'text-anchor': 'middle', 'font-size': 13 });
    T(g, 400, 384, '~0.8–1.0 A per W of light', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12 });
    // TIA
    P(g, 'M560 255 L660 315 L560 375 Z', { fill: '#122012', stroke: K.acc, 'stroke-width': 2 });
    T(g, 595, 320, 'TIA', { 'text-anchor': 'middle', 'font-weight': 700 });
    L(g, 470, 315, 560, 315, { stroke: K.data, 'stroke-width': 3 });
    T(g, 515, 300, 'µA', { 'text-anchor': 'middle', fill: K.data, 'font-size': 12 });
    L(g, 660, 315, 760, 315, { stroke: K.data, 'stroke-width': 3 });
    T(g, 710, 300, 'mV', { 'text-anchor': 'middle', fill: K.data, 'font-size': 12 });
    R(g, 760, 265, 200, 100, { fill: '#08171c', stroke: K.data, rx: 8 });
    T(g, 860, 305, 'SerDes RX', { 'text-anchor': 'middle', 'font-size': 14 }); T(g, 860, 325, 'equalize · CDR · decide', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12 }); T(g, 860, 343, '→ FEC → bits', { 'text-anchor': 'middle', fill: K.acc, 'font-size': 12 });
    const ph = []; for (let k = 0; k < 8; k++) ph.push(O(g, 0, 0, 5, { fill: K.optic }));
    const cu = []; for (let k = 0; k < 6; k++) cu.push(O(g, 0, 0, 4, { fill: K.data }));
    // three traces
    ['light (µW)', 'photocurrent (µA)', 'voltage after TIA (mV)'].forEach((s, i) => { R(g, 40 + i * 315, 430, 290, 120, { fill: '#05080b', stroke: K.line, rx: 6 }); T(g, 52 + i * 315, 450, s, { fill: [K.optic, K.data, K.acc][i], 'font-size': 12 }); });
    const tr = [P(g, '', { stroke: K.optic, 'stroke-width': 2 }), P(g, '', { stroke: K.data, 'stroke-width': 2 }), P(g, '', { stroke: K.acc, 'stroke-width': 2 })];
    const noiseAmp = [0.02, 0.05, 0.08];
    return {
      hot: [{ x: 756, y: 261, w: 208, h: 108, go: 'architecture/photodetector', label: 'Photodetector deep dive ↗', below: true }],
      update(t) {
        ph.forEach((d, k) => { const u = (t * 0.45 + k / 8) % 1; d.setAttribute('cx', 20 + u * 330); d.setAttribute('cy', 315); const bit = PAM[(k + Math.floor(t * 2)) % PAM.length] > 1; d.setAttribute('fill-opacity', bit ? 1 : 0.2); });
        cu.forEach((d, k) => { const u = (t * 0.6 + k / 6) % 1; d.setAttribute('cx', 470 + u * 290); d.setAttribute('cy', 315); });
        tr.forEach((p, i) => {
          let d = '';
          for (let x = 0; x <= 270; x += 3) {
            const v = PAM[Math.floor((x / 30 + t * 2)) % PAM.length] > 1 ? 1 : 0;
            const n = Math.sin(x * 1.7 + t * 23 + i) * noiseAmp[i] + Math.sin(x * 0.37 + t * 11) * noiseAmp[i];
            d += (x ? 'L' : 'M') + (50 + i * 315 + x) + ' ' + (535 - (0.1 + 0.75 * v + n) * 70).toFixed(1);
          }
          p.setAttribute('d', d);
        });
      }
    };
  }

  // ================================================================ levels
  const LV = [
    { id: 'cs-fabric', name: 'In the network', size: '', scene: sFabric,
      title: 'Where your switch lives', sub: 'A leaf or spine in the AI factory\'s scale-out network',
      plain: 'Your switch is one of the <b>road junctions</b> of the AI factory. Fibers from GPU network cards come in, and fibers to other switches go out. Its only job is to send each packet out of the right port, <b>fast and without losing it</b>.',
      body: '<p>In a leaf/spine fat tree, half of a leaf switch\'s ports face down to GPUs and half face up to spine switches. With 144 ports, two tiers of these switches can connect about 10,000 GPUs, and three tiers about 750,000.</p><p>NVIDIA\'s CPO switches are <b>Quantum-X Photonics</b> (InfiniBand) and <b>Spectrum-X Photonics</b> (Ethernet). The networking protocols are the same as in normal switches. What changes is <b>how the bits get from the switch chip into the fiber</b>, and that is what this course is about.</p>',
      facts: [['144 × 800G', 'Quantum-X Photonics ports (115 Tb/s)', 'nv'], ['102.4 / 409.6 Tb/s', 'Spectrum-X Photonics configs', 'nv'], ['Liquid', 'cooled', 'nv'], ['Every port', 'is optical', 'typ']],
      cpoTxt: 'You own the whole box: its ports, optics, lasers, power, cooling and management. The network team treats it as "one switch". You make sure every one of its optical links meets its error-rate target, under every temperature, power and aging condition, for years.',
      more: 'A system engineer\'s first question about any switch: how many ports, at what speed, what reach (how many metres or km of fiber), what power, what error rate, and how is it serviced? The rest of this course answers each of those for CPO.',
      links: [['factory/fabric', 'AI Factory course: topology']] },
    { id: 'cs-why', name: 'Why CPO', size: '', scene: sWhy,
      title: 'Why co-packaged optics?', sub: 'Pluggable modules vs optics inside the package',
      plain: 'In a normal switch the electrical signal travels <b>20–30 cm across a circuit board</b> to a plug-in optical module, which cleans it up with a DSP chip and turns it into light. <b>CPO puts the optics a few millimetres from the switch chip</b>, so the long trip, the DSP and most of their power disappear.',
      body: '<p><b>The problem:</b> at 200 Gb/s per lane, copper traces lose so much signal that both ends need power-hungry equalization, plus a DSP retimer in every module. Each module also carries its own lasers.</p><p><b>The CPO answer:</b> co-package optical engines with the switch ASIC. The electrical path shrinks to millimetres. Lasers move to shared, front-panel <b>external laser sources</b>. The module DSP is no longer needed.</p>',
      facts: [['3.5×', 'better power efficiency', 'nv'], ['63×', 'better signal integrity', 'nv'], ['10×', 'better network resiliency', 'nv'], ['4×', 'fewer lasers', 'nv']],
      cpoTxt: 'These four claims are effectively your <b>top-level requirements</b>. Every design choice you will see (short electrical channel, ring modulators, external lasers, liquid cooling) exists to deliver them. When a trade-off comes up, ask which of the four it helps or hurts.',
      more: 'The cost of CPO: the optics can no longer be unplugged port by port, so <b>reliability and serviceability</b> must be designed in from the start. Lasers (the weakest part) are kept in front-panel modules, fibers use detachable connectors, and the engines must last as long as the switch.',
      links: [['architecture/why-cpo', 'Pluggable vs CPO in depth']] },
    { id: 'cs-chassis', name: 'Switch box', size: '~1 m', scene: sChassis,
      title: 'Inside the CPO switch box', sub: 'Front panel, package, power, cooling, management',
      plain: 'Open the box and you find: a <b>front panel</b> with fiber connectors and <b>laser modules</b>; in the middle, the <b>switch package</b> (switch chip + optical engines) under a liquid cold plate; and around it <b>power</b> and <b>management</b> electronics.',
      body: '<p><b>Front panel:</b> detachable fiber connectors carry data in and out. External laser source (ELS) modules feed steady light to the optical engines over internal fibers.</p><p><b>Package:</b> the switch ASIC surrounded by optical engines. This is the heart of the box.</p><p><b>Power:</b> power comes from the rack and is converted down to the ~0.7–0.9 V that the chips need, at hundreds of amps.</p><p><b>Cooling:</b> liquid flows through a cold plate on the package.</p><p><b>Management:</b> a CPU, BMC and CPLDs boot the box, control lasers and engines, and report telemetry.</p>',
      facts: [['Front-panel', 'serviceable laser sources', 'nv'], ['Detachable', 'fiber connectivity', 'nv'], ['Liquid', 'cooled (Quantum-X Photonics)', 'nv'], ['1.3×', 'faster deployment', 'nv']],
      cpoTxt: 'Systems engineering at this level: <b>the box-level budgets</b> (power, thermal, optical, mechanical space), the <b>interfaces</b> between subsystems (fiber routing, laser to engine, power to ASIC, management buses), and the <b>service model</b> (what can be swapped in the field, and how).',
      more: 'Internal fiber management is a real engineering problem: hundreds of fibers must be routed from engines to the front panel without bending too tightly, getting pinched, or picking up dust. Bend radius, connector cleanliness and strain relief all show up later in your optical budget.',
      links: [['architecture/switch-chassis', 'Chassis in the explorer']] },
    { id: 'cs-package', name: 'Package', size: '~10 cm', scene: sPackage,
      title: 'The switch package', sub: 'Switch ASIC in the middle, optical engines all around',
      plain: 'The package is a base board the size of a large coaster. The <b>switch ASIC</b> sits in the middle and <b>optical engines (OEs)</b> surround it. Each engine is linked to the ASIC by <b>millimetre-long</b> electrical connections and sends its light out through fibers.',
      body: '<p>Every port\'s journey: ASIC SerDes → a few mm of package wiring → optical engine → fiber. The package also carries power (hundreds of amps into the ASIC), and the whole thing sits under one cold plate.</p><p>NVIDIA has described <b>1.6 Tb/s-class optical engines</b> built with TSMC\'s <b>COUPE</b> process, co-packaged around the switch ASIC.</p>',
      facts: [['1.6T', 'class optical engines', 'nv'], ['TSMC COUPE', 'engine technology', 'nv'], ['mm', 'electrical path ASIC→OE', 'typ'], ['1 cold plate', 'over ASIC + engines', 'typ']],
      cpoTxt: 'The package is where <b>electrical, optical, thermal and mechanical</b> all meet. The ASIC\'s heat warms the engines, and rings are temperature-sensitive (you will see why). The substrate warps as it heats, and fibers must stay aligned to within about a micrometre. Your thermal and mechanical budgets meet your optical budget right here.',
      more: 'Known-good-die and yield: if one of many engines on a package is bad, the whole expensive package may be lost. Testing engines <i>before</i> assembly (known-good engines), and the rework strategy, are major cost and quality topics.',
      links: [['architecture/switch-package', 'Package in the explorer']] },
    { id: 'cs-asic', name: 'Switch ASIC', size: '~3 cm', scene: sAsic,
      title: 'The switch ASIC', sub: 'Hundreds of SerDes lanes around a packet-processing engine',
      plain: 'The ASIC is the brain. Packets arrive on <b>SerDes</b> lanes around its edge. The <b>pipeline</b> reads each header and decides the output port. The <b>buffer</b> holds packets that must wait. Then they leave on another port\'s SerDes. It does this <b>billions of times per second</b>.',
      body: '<p><b>SerDes:</b> high-speed electrical transmitters and receivers, 200 Gb/s-class per lane. Four lanes make an 800G port.</p><p><b>Pipeline:</b> parse the header → look up the destination → apply rules (routing, congestion control).</p><p><b>Buffer and traffic manager:</b> on-chip memory and the queues that decide who goes next.</p><p><b>Telemetry:</b> counters for every port, including FEC error statistics, which are your best view of each optical link\'s health.</p>',
      facts: [['200G', 'per SerDes lane class', 'nv'], ['4 lanes', '= one 800G port', 'typ'], ['115 Tb/s', 'through one chip', 'nv'], ['ns–µs', 'per-hop latency', 'typ']],
      cpoTxt: 'In CPO the ASIC\'s SerDes drive millimetres instead of a long board trace. That changes their <b>design point</b> (less equalization, lower power) and makes the ASIC–engine electrical interface a key <b>interface specification</b> for you to own: voltage swing, rate, how much noise each side may add, and how both sides are tuned at bring-up.',
      more: 'ASIC FEC and error counters are the "voice" of each optical link. A system engineer learns to read FEC histograms (how many errors each code word needed corrected) to spot links that are slowly degrading, long before they drop.',
      links: [['architecture/asic-die', 'ASIC in the explorer']] },
    { id: 'cs-serdes', name: 'SerDes & PAM4', size: '', scene: sSerdes,
      title: 'SerDes and PAM4: the electrical lane', sub: '200 Gb/s per lane, 4 voltage levels, ~106–113 GBd',
      plain: 'Each lane sends <b>2 bits at a time</b> by choosing one of <b>4 voltage levels</b> (PAM4), about <b>a hundred billion times per second</b>. Overlay all the symbols and you get an <b>eye diagram</b>. The more open the eyes, the easier it is to tell the levels apart.',
      body: '<p>200 Gb/s with 2 bits per symbol = 100 G symbols/s, plus overhead for error-correction coding: ~106–113 GBd. One symbol lasts under 10 picoseconds.</p><p>With 4 levels instead of 2, each eye is about 1/3 the height, so PAM4 needs a much cleaner signal. Noise, reflections and timing jitter all close the eye.</p><p>The CPO advantage: a mm-scale channel keeps the eye open with much less equalization, which is where the 63× signal-integrity claim comes from.</p>',
      facts: [['PAM4', '2 bits / symbol', 'typ'], ['~106–113 GBd', 'symbol rate for 200G', 'typ'], ['< 10 ps', 'per symbol', 'typ'], ['~9.5 dB', 'SNR cost of PAM4 vs NRZ', 'typ']],
      cpoTxt: 'You will hear about eye height, eye width, SNR, jitter, pre-FEC BER and TDECQ every day. The <b>Noise Lab</b> and <b>Budgets</b> sections of this app let you play with exactly these. On a CPO switch the electrical eye is rarely the weak point. The optical part usually is, so the optical eye and BER margin are what you watch.',
      more: 'The SerDes transmitter pre-distorts the signal (FFE) and the receiver equalizes it (CTLE, DFE) and recovers the clock (CDR). In CPO the optical engine\'s driver and TIA sit in the middle of that chain, so who equalizes what is a joint electrical/optical design decision.',
      links: [['noise', 'Noise & Signal Lab'], ['architecture/serdes', 'SerDes in the explorer']] },
    { id: 'cs-oe', name: 'Optical engine', size: '~1 cm', scene: sOe,
      title: 'The optical engine (OE)', sub: 'An electronics chip stacked on a photonics chip',
      plain: 'An optical engine is <b>two chips glued face to face</b>. The <b>EIC</b> (electronics: drivers and amplifiers) sits on top of the <b>PIC</b> (photonics: tiny glass-like channels called waveguides, ring modulators and light detectors). Steady laser light comes in, data light goes out, and received light is turned back into electrical signals.',
      body: '<p><b>Transmit:</b> the EIC driver takes the electrical lane and applies it to a micro-ring modulator on the PIC, which "chops" the steady laser light into data.</p><p><b>Receive:</b> a photodetector on the PIC turns incoming light into a tiny current. The EIC\'s TIA amplifies it into a voltage for the ASIC.</p><p><b>Stacking</b> (TSMC COUPE, SoIC) makes the chip-to-chip connections extremely short, which cuts power and noise.</p>',
      facts: [['EIC on PIC', '3D stacked', 'nv'], ['Micro-ring', 'modulators', 'nv'], ['1.6T', 'class per engine', 'nv'], ['O-band', '~1310 nm light', 'typ']],
      cpoTxt: 'The OE is usually the most complex <b>supplier interface</b> you will manage. Its datasheet-level parameters (optical output power, extinction ratio, receiver sensitivity, power per bit, operating temperature, ring-tuning range) feed straight into your link, power and thermal budgets.',
      more: 'Why silicon photonics? It is made in CMOS-like fabs, at wafer scale, with very small components (rings a few µm across). The catch: silicon cannot make light efficiently. Hence the external laser.',
      links: [['architecture/optical-engine', 'Optical engine in the explorer'], ['architecture/eic-3d-stack', '3D stack']] },
    { id: 'cs-laser', name: 'Laser source', size: '~5 cm', scene: sLaser,
      title: 'The external laser source (ELS)', sub: 'Steady light from the front panel, shared by many lanes',
      plain: 'Silicon cannot make light, so the light comes from <b>laser modules on the front panel</b>. They shine steady, unmodulated (CW) light through fibers into the optical engines. The engines then add the data. One laser can feed several lanes.',
      body: '<p><b>Why external?</b> Lasers are the part most likely to wear out, and heat speeds up their aging. Keeping them at the cooler front panel, in <b>replaceable modules</b>, makes the switch more reliable and serviceable.</p><p><b>Why fewer?</b> Each laser\'s output can be split across several modulators, so a CPO switch needs about 4× fewer lasers than the equivalent pluggable modules.</p><p>The module controls laser temperature and output power and reports them through monitor photodiodes.</p>',
      facts: [['4×', 'fewer lasers', 'nv'], ['Front-panel', 'serviceable', 'nv'], ['CW', 'steady light, no data', 'typ'], ['~1310 nm', 'O-band wavelength', 'typ']],
      cpoTxt: 'Laser power is the <b>start of your optical link budget</b>, and laser aging is often the <b>end of your reliability budget</b>. You will specify output power per lane, allowed power droop over life, wavelength accuracy, eye safety (Class 1), and how the system detects and replaces a failing laser.',
      more: 'Laser control loop: a monitor photodiode measures output power and the driver current is adjusted to keep it constant (automatic power control). As the laser ages it needs more current for the same light. Trending that current is a classic early warning of end of life.',
      links: [['architecture/external-laser', 'ELS in the explorer'], ['architecture/laser-apc-loop', 'Laser power loop']] },
    { id: 'cs-mrm', name: 'Ring modulator', size: '~20 µm', scene: sMrm,
      title: 'The micro-ring modulator (MRM)', sub: 'A tiny loop of silicon that switches light on and off',
      plain: 'Light travels along a straight waveguide past a tiny <b>ring</b>. At one exact colour (its <b>resonance</b>) the ring <b>traps the light</b> and almost none gets through. A small data voltage shifts that resonance slightly. Then the laser\'s colour is no longer trapped and the light <b>passes</b>. That on/off is the data.',
      body: '<p>The voltage changes how many free electrons are in the ring\'s silicon, which changes its refractive index, which shifts the resonance by a fraction of a nanometre. It is small, fast (tens of GHz) and needs very little energy per bit.</p><p><b>The catch:</b> the resonance is extremely sharp, so the ring must be kept precisely on the laser\'s colour. Temperature moves it. That is the next level.</p>',
      facts: [['5–10 µm', 'ring radius', 'typ'], ['Q ≈ 3k–20k', 'how sharp the resonance is', 'typ'], ['8–20 nm', 'spacing between resonances (FSR)', 'typ'], ['~fJ–pJ/bit', 'modulator energy', 'typ']],
      cpoTxt: 'Ring parameters set your <b>extinction ratio and optical loss</b> (link budget), the <b>tuning power</b> (power budget), and how sensitive the link is to temperature (thermal budget). Ring-related issues are a key part of CPO bring-up and failure analysis.',
      more: 'Why rings and not Mach-Zehnder modulators (MZMs, used in many pluggables)? Rings are ~100× smaller and need far less drive voltage, so they suit dense, low-power engines. The price is temperature sensitivity and a narrow optical bandwidth, which the lock loop and WDM design have to handle.',
      links: [['architecture/mrm', 'MRM in the explorer'], ['architecture/ring-physics', 'Ring physics (deep)']] },
    { id: 'cs-ringlock', name: 'Ring lock', size: '', scene: sLock,
      title: 'Heaters and the ring-lock loop', sub: 'Keeping every ring on its laser colour, forever',
      plain: 'Warm silicon shifts the ring\'s resonance. A <b>change of about 1 °C can move it by its own width</b>, enough to break the link. So each ring has a tiny <b>heater</b>, and a <b>control loop</b> constantly measures the light and adjusts the heater to stay locked.',
      body: '<p><b>Loop:</b> a monitor photodetector measures light → an ADC digitizes it → a controller (in the EIC or firmware) computes the correction → a DAC drives the heater → the ring moves back onto the laser.</p><p>The loop must lock at start-up (find the right resonance), track temperature changes (ASIC load changes, coolant temperature), and never lock onto the <b>wrong</b> resonance or the neighbouring wavelength.</p>',
      facts: [['~0.07–0.1 nm/°C', 'ring drift', 'typ'], ['~0.1 nm', 'ring linewidth', 'typ'], ['0.1–0.3 nm/mW', 'heater tuning', 'typ'], ['mW per ring', 'heater power', 'typ']],
      cpoTxt: 'This is a classic <b>system-engineering</b> problem: thermal design (how fast and how much the package temperature swings), firmware (lock algorithm, start-up sequence), power (total heater power across thousands of rings) and telemetry (heater codes and lock status per ring). Heater power across all rings is a real line item in the switch power budget.',
      more: 'Bring-up tip: heater settings (DAC codes) are very informative. A ring that needs much more heat than its neighbours, or that runs out of tuning range at a temperature corner, is an early warning. Logging them during temperature cycling is a standard qualification step.',
      links: [['architecture/ring-lock-loop', 'Ring-lock loop in the explorer'], ['architecture/heater', 'Heater']] },
    { id: 'cs-wdm', name: 'WDM & fiber', size: '~1 mm', scene: sWdm,
      title: 'Many colours in one fiber (WDM) and getting light off the chip', sub: 'Wavelength-division multiplexing and fiber coupling',
      plain: 'Each ring is tuned to <b>its own colour</b> (wavelength), so several rings on one waveguide can each carry their own data lane. All the colours then share <b>one fiber</b>. A <b>coupler</b> squeezes the light from the tiny silicon waveguide into the much bigger fiber core.',
      body: '<p><b>WDM</b> multiplies the bandwidth per fiber, which means fewer fibers to route and connect.</p><p><b>Coupling:</b> a silicon waveguide is ~0.5 µm wide and a single-mode fiber core is ~9 µm. Edge couplers or grating couplers adapt the light between them. Each crossing costs ~1–3 dB, and alignment must be held to about a micrometre for the life of the product.</p>',
      facts: [['1–3 dB', 'per fiber-to-chip coupling', 'typ'], ['~9 µm', 'single-mode fiber core', 'typ'], ['0.33 dB/km', 'fiber loss at 1310 nm', 'typ'], ['Multi-λ', 'per fiber with rings', 'typ']],
      cpoTxt: 'Couplers and connectors are usually the <b>largest losses in your optical link budget</b>, and the most sensitive to manufacturing, temperature, vibration and dirt. Specifying, measuring and screening them is core system work.',
      more: 'WDM brings its own budget items: crosstalk between neighbouring wavelengths (a ring can partly affect the next colour), and wavelength-plan rules (how far apart the colours are, and how laser and rings drift relative to each other).',
      links: [['architecture/wdm-mux', 'WDM in the explorer'], ['architecture/fiber-coupler', 'Fiber coupler']] },
    { id: 'cs-rx', name: 'Receiver', size: '~100 µm', scene: sRx,
      title: 'The receiver', sub: 'Photodetector + TIA + SerDes = bits again',
      plain: 'At the far end, a ring <b>drops</b> one colour onto a <b>germanium photodetector</b>, which turns light into a tiny current (microamps). The <b>TIA</b> amplifies it into a voltage, and the SerDes decides which level each symbol was. <b>Forward error correction (FEC)</b> fixes the rare mistakes.',
      body: '<p><b>Sensitivity</b> = the weakest light the receiver can read at the target error rate. Every dB of loss along the link eats into the margin above it.</p><p>Noise from the TIA, the laser (relative intensity noise) and crosstalk all add up. The SerDes reports <b>pre-FEC BER</b>, and if it stays below the FEC threshold (~2.4×10⁻⁴ for KP4), the link runs error-free after correction.</p>',
      facts: [['0.8–1.0 A/W', 'Ge photodetector responsivity', 'typ'], ['~2.4e-4', 'KP4 FEC pre-FEC BER limit', 'typ'], ['≤1e-13…1e-15', 'post-FEC BER target', 'typ'], ['nA', 'photodetector dark current', 'typ']],
      cpoTxt: 'You have now followed one bit from the switch chip, through a ring on a laser beam, along a fiber and back into bits. The next steps put it together: <b>the whole lane, the link budget, the power budget, the control loops</b>, and <b>what your job looks like</b>.',
      more: 'FEC is a trade: it adds a little latency and overhead (~5–6 % for RS(544,514)) and lets the optics run with a raw error rate around 1 in 4,000, which would otherwise be unusable. That relaxation is what makes 200G-per-lane optics practical.',
      links: [['architecture/photodetector', 'Photodetector'], ['architecture/tia', 'TIA'], ['budgets', 'Budgets section']] }
  ];

  // ================================================================ one bit across a CPO link
  const JP = [
    [60, 250, 'Switch ASIC', 'e', 'down'], [160, 250, 'SerDes TX', 'e', 'down'], [260, 250, 'EIC driver', 'e', 'down'],
    [360, 250, 'Ring modulator', 'o', 'down'], [440, 250, 'WDM mux', 'o', 'up'], [520, 250, 'Fiber coupler', 'o', 'down'],
    [600, 250, 'Front-panel connector', 'o', 'up'], [700, 250, 'Fiber', 'o', 'down'], [780, 250, 'Far-end demux', 'o', 'up'],
    [850, 250, 'Photodetector', 'o', 'down'], [910, 180, 'TIA → SerDes RX', 'e', 'up'], [960, 110, 'ASIC / NIC', 'e', 'up']
  ];
  const JS = [
    { r: [0, 1], t: 'Bits leave the ASIC', d: 'A packet is chopped into 2-bit PAM4 symbols and launched on a <b>200G SerDes lane</b>.' },
    { r: [1, 2], t: 'A few millimetres of copper', d: 'The lane crosses the package to the optical engine\'s <b>EIC driver</b>: millimetres, not 20–30 cm of board. No retimer is needed.' },
    { r: [2, 3], t: 'Voltage → light', d: 'The driver swings the <b>ring modulator\'s</b> voltage. Steady light from the <b>external laser</b> passes or is trapped: the data is now on light.' },
    { r: [3, 4], t: 'Join the other colours', d: 'Other rings on the same waveguide add their own lanes on other wavelengths (<b>WDM</b>).' },
    { r: [4, 6], t: 'Off the chip and out the front', d: 'A <b>coupler</b> moves the light from silicon into fiber (~1–3 dB). Internal fiber runs to a <b>detachable front-panel connector</b>.' },
    { r: [6, 7], t: 'Across the data hall', d: 'Metres to hundreds of metres of single-mode fiber. Light loses only ~0.33 dB per km, so connectors matter far more than distance.' },
    { r: [7, 9], t: 'Light → current', d: 'At the far end (another CPO switch or a NIC transceiver) a ring drops this colour onto a <b>photodetector</b>: microamps of current.' },
    { r: [9, 11], t: 'Current → bits, errors fixed', d: 'The <b>TIA</b> amplifies, the SerDes decides each level, and <b>FEC</b> corrects the rare mistakes. If pre-FEC BER < ~2.4e-4, the output is effectively error-free.' }
  ];

  // ================================================================ interactive pages
  function linkBudget(p) {
    const rows = [
      ['laser', 'Laser power per lane into the engine', 4, 16, 0.5, 11, 'dBm', 'est', +1],
      ['cin', 'Laser → engine: connector + coupler', 0.5, 5, 0.1, 2, 'dB', 'typ', -1],
      ['mod', 'Modulator loss + extinction penalty', 1, 8, 0.1, 4, 'dB', 'est', -1],
      ['mux', 'Waveguides + WDM mux on chip', 0, 4, 0.1, 1.5, 'dB', 'est', -1],
      ['cout', 'Chip → fiber coupler', 0.5, 4, 0.1, 1.5, 'dB', 'typ', -1],
      ['conn', 'Connectors along the link (front panel, patch)', 0, 4, 0.1, 1.5, 'dB', 'typ', -1],
      ['km', 'Fiber length', 0, 2, 0.05, 0.1, 'km', 'typ', 0],
      ['rx', 'Far end: coupler + demux', 0.5, 6, 0.1, 3, 'dB', 'est', -1],
      ['sens', 'Receiver sensitivity (at FEC threshold)', -12, -2, 0.5, -7, 'dBm', 'est', 0]
    ];
    const inputs = {};
    const left = h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, 'Your link (one lane)'));
    rows.forEach(([k, lbl, mn, mx, stp, v, u, tag]) => {
      const inp = h('input', { type: 'range', min: mn, max: mx, step: stp, value: v }), out = h('output');
      inputs[k] = [inp, out, u];
      left.appendChild(h('div', { class: 'slider-row' }, h('label', { html: lbl + ' ' + B(tag) }), inp, out));
      inp.addEventListener('input', upd);
    });
    const svg = S('svg', { viewBox: '0 0 700 330', class: 'af-jsvg' });
    const verdict = h('div', { class: 'callout' });
    p.appendChild(h('div', { class: 'af-calc' }, left, h('div', { class: 'card' }, svg, verdict)));
    function upd() {
      const v = {}; for (const k in inputs) { v[k] = +inputs[k][0].value; inputs[k][1].textContent = v[k] + ' ' + inputs[k][2]; }
      const steps = [['Laser', v.laser], ['− in', -v.cin], ['− modulator', -v.mod], ['− mux', -v.mux], ['− out coupler', -v.cout], ['− connectors', -v.conn], ['− fiber', -0.33 * v.km], ['− far end', -v.rx]];
      const rxP = steps.reduce((a, s) => a + s[1], 0), margin = rxP - v.sens;
      const Y = dbm => 20 + (18 - dbm) * 10; // 18 dBm top .. -11.5 floor
      svg.innerHTML = '';
      const g = S('g', {}); svg.appendChild(g);
      for (let d = 15; d >= -10; d -= 5) { L(g, 50, Y(d), 690, Y(d), { stroke: K.line, 'stroke-dasharray': '2 4' }); T(g, 44, Y(d) + 4, d + '', { 'text-anchor': 'end', fill: K.muted, 'font-size': 11 }); }
      T(g, 8, 14, 'dBm', { fill: K.muted, 'font-size': 11 });
      let lvl = 0;
      steps.forEach(([lbl, dv], i) => {
        const x = 60 + i * 72, a = i ? lvl : 0, b = lvl + dv;
        const top = i ? Math.max(a, b) : dv, bot = i ? Math.min(a, b) : -11.5;
        R(g, x, Y(top), 56, Math.max(1.5, Y(bot) - Y(top)), { fill: i ? K.bad : K.optic, 'fill-opacity': i ? .55 : .85, stroke: 'none', rx: 2 });
        T(g, x + 28, 326, lbl, { 'text-anchor': 'middle', fill: K.muted, 'font-size': 10.5 });
        lvl = b;
      });
      const xr = 60 + 8 * 72;
      R(g, xr, Y(rxP), 56, Math.max(2, Y(-11.5) - Y(rxP)), { fill: margin >= 3 ? K.acc : margin >= 0 ? K.warn : K.bad, stroke: 'none', rx: 2 });
      T(g, xr + 28, 326, 'received', { 'text-anchor': 'middle', fill: K.text, 'font-size': 10.5 });
      L(g, 50, Y(v.sens), 690, Y(v.sens), { stroke: K.data, 'stroke-width': 2 });
      T(g, 688, Y(v.sens) - 6, 'sensitivity ' + v.sens + ' dBm', { 'text-anchor': 'end', fill: K.data, 'font-size': 11.5 });
      verdict.className = 'callout' + (margin < 3 ? ' warn' : '');
      verdict.innerHTML = '<b>Received ' + rxP.toFixed(1) + ' dBm → margin ' + (margin >= 0 ? '+' : '') + margin.toFixed(1) + ' dB.</b> ' +
        (margin >= 3 ? 'Healthy. A few dB of margin is kept for aging lasers, dirty connectors and temperature corners.' : margin >= 0 ? 'It works today, but there is little margin left for laser aging, a dirty connector or a hot day. A system engineer would push back here.' : 'The link fails: the receiver gets less light than it needs. Find the cheapest dB: a cleaner connector, a better coupler, more laser power, or fewer lanes per laser.') +
        ' Splitting one laser over N lanes costs 10·log₁₀(N) dB per lane (2 lanes = 3 dB, 8 lanes = 9 dB) <i>before</i> the "laser power per lane" above.';
    }
    upd();
  }

  function powerBudget(p) {
    const rows = [
      ['ports', 'Ports (800G each)', 16, 512, 16, 144, '', 'nv'],
      ['serdes', 'ASIC SerDes for the short CPO channel', 0.5, 5, 0.1, 2, 'pJ/b', 'est'],
      ['eic', 'Engine electronics (driver + TIA + control)', 0.5, 5, 0.1, 2, 'pJ/b', 'est'],
      ['lasmw', 'Laser optical power per lane', 2, 30, 1, 15, 'mW', 'est'],
      ['wpe', 'Laser wall-plug efficiency', 5, 40, 1, 10, '%', 'typ'],
      ['heat', 'Ring heater power per ring', 0, 10, 0.5, 3, 'mW', 'typ'],
      ['plug', 'Pluggable 800G module (for comparison)', 8, 25, 0.5, 12, 'W', 'typ']
    ];
    const inputs = {};
    const left = h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, 'Optics power for the whole switch'));
    rows.forEach(([k, lbl, mn, mx, stp, v, u, tag]) => {
      const inp = h('input', { type: 'range', min: mn, max: mx, step: stp, value: v }), out = h('output');
      inputs[k] = [inp, out, u];
      left.appendChild(h('div', { class: 'slider-row' }, h('label', { html: lbl + ' ' + B(tag) }), inp, out));
      inp.addEventListener('input', upd);
    });
    left.appendChild(h('p', { class: 'muted', style: 'font-size:12.5px', html: 'Model: 4 lanes × 200 Gb/s per port; 2 rings per lane (transmit + receive). Pluggable side includes the host SerDes driving a long board trace (~3 pJ/b ' + B('est') + ').' }));
    const out = h('div', { class: 'af-out' }), bars = h('div', { class: 'af-bars' }), note = h('div', { class: 'callout' });
    p.appendChild(h('div', { class: 'af-calc' }, left, h('div', { class: 'card' }, out, bars, note)));
    function upd() {
      const v = {}; for (const k in inputs) { v[k] = +inputs[k][0].value; inputs[k][1].textContent = v[k] + (inputs[k][2] ? ' ' + inputs[k][2] : ''); }
      const lanes = v.ports * 4, bps = 200e9;
      const wSer = lanes * bps * v.serdes * 1e-12, wEic = lanes * bps * v.eic * 1e-12;
      const wLas = lanes * (v.lasmw / 1000) / (v.wpe / 100), wHeat = lanes * 2 * v.heat / 1000;
      const cpo = wSer + wEic + wLas + wHeat;
      const plugW = v.ports * (v.plug + 800e9 * 3e-12);
      const pj = cpo / (lanes * bps) * 1e12, pjP = plugW / (v.ports * 800e9) * 1e12;
      const fx = (val, l, tag) => '<div class="af-fact"><b>' + val + '</b><span>' + l + ' ' + B(tag) + '</span></div>';
      out.innerHTML = fx(cpo.toFixed(0) + ' W', 'CPO optics + SerDes total', 'est') + fx(pj.toFixed(1) + ' pJ/b', 'CPO energy per bit', 'est') + fx((pjP / pj).toFixed(1) + '×', 'better than pluggable here', 'est') +
        fx(plugW.toFixed(0) + ' W', 'pluggable equivalent', 'est') + fx(pjP.toFixed(1) + ' pJ/b', 'pluggable energy per bit', 'est') + fx(num(lanes * 2), 'rings to keep locked', 'est');
      const mx = Math.max(plugW, cpo);
      const bar = (l, w, col) => '<div class="af-hbar"><span>' + l + '</span><div class="tr"><i style="width:' + (100 * w / mx).toFixed(1) + '%;background:' + col + '"></i></div><output>' + w.toFixed(0) + ' W</output></div>';
      bars.innerHTML = bar('SerDes', wSer, 'var(--data)') + bar('Engine electronics', wEic, 'var(--accent)') + bar('Lasers (wall plug)', wLas, 'var(--optic)') + bar('Ring heaters', wHeat, 'var(--therm)') + bar('All pluggable', plugW, 'var(--muted)');
      note.innerHTML = 'Notice how <b>laser efficiency</b> matters: only a fraction of the laser\'s electrical power becomes light, and all of that light must survive the link budget. Every dB of optical loss you save lets the laser run at lower power. NVIDIA\'s public figure for the whole system is <b>3.5× better power efficiency</b> ' + B('nv') + '.';
    }
    upd();
  }

  // ================================================================ course definition
  C.course.register({
    id: 'cpo-course', title: 'CPO Switch Course', icon: '🔆', order: 9, storeKey: 'cs-last-step',
    levels: LV, levelCh: 'Inside the switch', levelBoxTitle: '🛠 What this means for you as system engineer',
    levelHint: 'Press <b>Next</b> and the picture zooms into the highlighted part. Orange tags open a deeper page in the Architecture Explorer (optional).',
    finish: { go: 'architecture', label: 'Continue: Architecture Explorer tour →' },
    pages: [
      { id: 'start', title: 'Welcome', ch: 'Start', build(p, ctx) {
        p.appendChild(h('div', { class: 'af-hero' },
          h('div', { class: 'af-eyebrow' }, 'Guided course · about 45–60 minutes'),
          h('h1', { html: 'The <em>CPO switch</em>: how it works and what you\'ll own as its system engineer' }),
          h('p', { html: 'Just press <b>Next</b>. You\'ll go from the switch\'s place in the network, into the box, the package and the switch chip, then follow the light: laser → ring modulator → fiber → receiver. Then you\'ll put it together with <b>link and power budgets</b>, the <b>control loops</b>, and a page on <b>what the system-engineering job involves</b>. A 5-chapter appendix goes deeper.' }),
          h('div', { class: 'af-analogy', html:
            '<div><span>🔀</span><b>Switch ASIC</b>the junction that routes every packet</div>' +
            '<div><span>🔦</span><b>External laser</b>a steady lamp at the front panel</div>' +
            '<div><span>💍</span><b>Ring modulator</b>a tiny loop that blinks the light on/off</div>' +
            '<div><span>📐</span><b>You</b>own the budgets, interfaces and trade-offs</div>' }),
          h('div', { class: 'af-cta' },
            h('button', { class: 'btn primary af-bignext', onclick: () => ctx.next() }, 'Start the course →'),
            ctx.resumeId && ctx.resumeId !== 'start' && ctx.resumeId !== 'done' ? h('button', { class: 'btn', onclick: () => ctx.goId(ctx.resumeId) }, 'Resume where you left off') : null)));
        p.appendChild(h('div', { class: 'grid2' },
          h('div', { class: 'card', html: '<h3 style="margin-top:0">The route</h3><ol class="af-route">' +
            '<li><b>Inside the switch, 12 steps:</b> network → why CPO → switch box → package → ASIC → SerDes → optical engine → laser source → ring modulator → ring lock → WDM & fiber → receiver.</li>' +
            '<li><b>Put it together, 5 steps:</b> one bit across a link, the optical link budget, the power budget, control loops & telemetry, and your job as system engineer.</li>' +
            '<li><b>Appendix, 5 chapters:</b> photonics basics, signal integrity & FEC, packaging/power/thermal, reliability/test/bring-up, and a day-1 cheat sheet.</li></ol>' }),
          h('div', { class: 'card', html: '<h3 style="margin-top:0">Before you start</h3><p>If you haven\'t yet, the <a href="#factory">AI Factory course</a> explains the bigger picture: why AI needs these switches at all. This course assumes nothing about optics: every term is explained when it first appears, and you can hover any dotted abbreviation for its meaning.</p><p class="muted" style="margin:0">Every level has a green <b style="color:var(--accent)">"In plain words"</b> box and an orange box <b style="color:var(--optic)">"What this means for you as system engineer"</b>.</p>' })));
      } },
      '@levels',
      { id: 'cs-lane', title: 'One bit across a CPO link', ch: 'Put it together', build(p, ctx) {
        p.appendChild(h('h2', { class: 'af-ph' }, 'Follow one bit across a CPO link'));
        p.appendChild(h('p', { class: 'h-sub' }, 'Everything from the last 12 steps in one picture. Cyan = electrical, orange = light. The animation steps through it by itself.'));
        ctx.onFrame(C.course.journeyBlock(p, {
          pts: JP, steps: JS, optical: i => i >= 3 && i <= 9, big: l => /Ring|Photodetector/.test(l), stepTime: 4.5,
          decorate(g) {
            R(g, 20, 150, 610, 170, { fill: 'rgba(255,107,61,.05)', stroke: K.optic, 'stroke-dasharray': '5 5', rx: 10 });
            T(g, 34, 172, 'YOUR CPO SWITCH', { fill: K.optic, 'font-size': 11, 'font-weight': 700, 'letter-spacing': 2 });
            R(g, 230, 196, 330, 110, { fill: 'rgba(255,107,61,.06)', stroke: '#5a4d2a', rx: 8 });
            T(g, 395, 296, 'optical engine (in the package)', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 11 });
            R(g, 740, 40, 250, 280, { fill: 'rgba(34,211,238,.04)', stroke: K.data, 'stroke-dasharray': '5 5', rx: 10 });
            T(g, 752, 62, 'FAR END', { fill: K.data, 'font-size': 11, 'font-weight': 700, 'letter-spacing': 2 });
            R(g, 300, 60, 140, 40, { fill: '#2a0f08', stroke: K.therm, rx: 6 }); T(g, 370, 85, 'external laser', { 'text-anchor': 'middle', fill: '#ffb199', 'font-size': 12 });
            P(g, 'M370 100 L360 238', { stroke: K.therm, 'stroke-width': 2, 'stroke-dasharray': '4 4' });
          }
        }));
      } },
      { id: 'cs-budget', title: 'The optical link budget', ch: 'Put it together', build(p) {
        p.appendChild(h('h2', { class: 'af-ph' }, 'The optical link budget: does enough light arrive?'));
        p.appendChild(h('p', { class: 'h-sub', html: 'This is the system engineer\'s most-used spreadsheet. Start with the laser power, subtract every loss along the way, and compare what arrives with what the receiver needs. Optical power is in <b>dBm</b> (0 dBm = 1 mW; every −3 dB halves the power), so losses simply add up.' }));
        linkBudget(p);
      } },
      { id: 'cs-power', title: 'The power budget', ch: 'Put it together', build(p) {
        p.appendChild(h('h2', { class: 'af-ph' }, 'The power budget: where the watts go'));
        p.appendChild(h('p', { class: 'h-sub' }, 'Energy per bit is the headline number of CPO. Play with each contributor and compare with a switch full of pluggable modules. The values here are illustrative estimates, not product specs.'));
        powerBudget(p);
      } },
      { id: 'cs-loops', title: 'Control loops & telemetry', ch: 'Put it together', build(p) {
        p.appendChild(h('h2', { class: 'af-ph' }, 'Control loops and telemetry: keeping thousands of links healthy'));
        p.appendChild(h('p', { class: 'h-sub' }, 'A CPO switch is full of small feedback loops running all the time. Each one has a sensor, a controller and an actuator, and each one reports telemetry you can trend.'));
        p.appendChild(h('table', { class: 'table', html: '<tr><th>Loop</th><th>Sensor</th><th>Actuator</th><th>Keeps…</th><th>Watch for</th></tr>' +
          '<tr><td><b>Ring lock</b></td><td>monitor photodetector</td><td>ring heater (DAC)</td><td>each ring on its laser wavelength</td><td>heater code near its limit, lock lost, re-lock events</td></tr>' +
          '<tr><td><b>Laser power (APC)</b></td><td>laser monitor photodiode</td><td>laser drive current</td><td>constant optical output</td><td>rising drive current = aging laser</td></tr>' +
          '<tr><td><b>Laser temperature</b></td><td>thermistor</td><td>thermo-electric cooler / heater</td><td>laser wavelength and life</td><td>TEC at its limit, wavelength drift</td></tr>' +
          '<tr><td><b>Voltage regulation</b></td><td>output voltage</td><td>VRM switching</td><td>~0.7–0.9 V at hundreds of A</td><td>droop on load steps, temperature of power stages</td></tr>' +
          '<tr><td><b>Cooling</b></td><td>temperature sensors, flow</td><td>pump speed / facility valves</td><td>ASIC and engine temperature</td><td>rising ΔT, low flow, leaks</td></tr>' +
          '<tr><td><b>Link health</b></td><td>FEC counters, BER, optical power</td><td>SerDes adaptation, link retrain</td><td>error-free traffic</td><td>pre-FEC BER creeping up, link flaps</td></tr>' }));
        p.appendChild(h('div', { class: 'grid2' },
          h('div', { class: 'card', html: '<h3 style="margin-top:0">Who runs them</h3><p>The fastest loops (SerDes adaptation, some ring control) run in hardware in the ASIC or EIC. Slower loops run in <b>firmware</b> on microcontrollers or the management CPU. The <b>BMC</b> watches power and thermal limits, and the <b>network OS</b> collects telemetry and raises alarms.</p>' }),
          h('div', { class: 'card', html: '<h3 style="margin-top:0">Why it matters to you</h3><p>When loops interact, bugs appear. For example, a coolant temperature step shifts every ring at once while the ASIC load also changes. Specifying loop bandwidths, start-up order (power → lasers → rings → links) and alarm thresholds is system-level work, and so is proving it all works across temperature, voltage and aging.</p>' })));
        p.appendChild(h('div', { class: 'callout', html: 'Deep dives: <a href="#architecture/ring-lock-loop">ring-lock loop</a>, <a href="#architecture/laser-apc-loop">laser power loop</a>, <a href="#architecture/vrm-control-loop">VRM loop</a>, <a href="#architecture/thermal-control-loop">thermal loop</a>, <a href="#architecture/control-plane">control plane</a>.' }));
      } },
      { id: 'cs-job', title: 'Your job as system engineer', ch: 'Put it together', build(p) {
        p.appendChild(h('h2', { class: 'af-ph' }, 'Your job: system engineer for a CPO switch'));
        p.appendChild(h('p', { class: 'h-sub' }, 'Specialists each own one part: optics, SerDes, package, power, firmware. The system engineer owns how the parts fit together, and whether the whole box meets its promises.'));
        p.appendChild(h('div', { class: 'grid3', html:
          '<div class="card"><h4 style="margin:0 0 6px;color:var(--accent)">1 · Requirements</h4><p style="margin:0">Turn product goals (ports, speed, power, error rate, reliability, serviceability) into numbered, testable requirements for each subsystem and supplier.</p></div>' +
          '<div class="card"><h4 style="margin:0 0 6px;color:var(--accent)">2 · Budgets</h4><p style="margin:0">Own the link budget, power budget, thermal budget and reliability (FIT) budget. Each margin belongs to someone, and you decide who gets it.</p></div>' +
          '<div class="card"><h4 style="margin:0 0 6px;color:var(--accent)">3 · Interfaces</h4><p style="margin:0">Write the interface specifications: ASIC↔engine electrical, laser↔engine optical, engine↔fiber mechanical, firmware↔hardware registers, telemetry to the network OS.</p></div>' +
          '<div class="card"><h4 style="margin:0 0 6px;color:var(--accent)">4 · Trade-offs</h4><p style="margin:0">More laser power vs aging and power; tighter coupler tolerance vs yield and cost; more heater range vs power. Make the trade-off, write down the reasoning, and get agreement.</p></div>' +
          '<div class="card"><h4 style="margin:0 0 6px;color:var(--accent)">5 · Bring-up & validation</h4><p style="margin:0">First power-on, link bring-up, BER testing across temperature/voltage/corners, margin characterization, and the sign-off reports.</p></div>' +
          '<div class="card"><h4 style="margin:0 0 6px;color:var(--accent)">6 · Failure analysis & field</h4><p style="margin:0">When a link flaps or a unit fails: gather telemetry, find the root cause across teams, fix the design or the test, and feed field data back into the next product.</p></div>' }));
        p.appendChild(h('h3', null, 'The product lifecycle and where you are busiest'));
        p.appendChild(h('table', { class: 'table', html: '<tr><th>Phase</th><th>What happens</th><th>Your focus</th></tr>' +
          '<tr><td><b>Concept / architecture</b></td><td>choose port count, engine type, laser plan, cooling</td><td>top-level budgets and trade studies</td></tr>' +
          '<tr><td><b>EVT</b> (engineering validation)</td><td>first hardware works?</td><td>bring-up plan, debug, first margins</td></tr>' +
          '<tr><td><b>DVT</b> (design validation)</td><td>meets every spec at every corner?</td><td>temperature/voltage sweeps, reliability tests, compliance</td></tr>' +
          '<tr><td><b>PVT</b> (production validation)</td><td>can the factory build it reliably?</td><td>production test limits, yield, screening</td></tr>' +
          '<tr><td><b>Field</b></td><td>thousands of switches in AI factories</td><td>telemetry, failure analysis, firmware updates, next-gen requirements</td></tr>' }));
        p.appendChild(h('h3', null, 'Good questions to ask in your first weeks'));
        p.appendChild(h('ul', { html:
          '<li>What are the top-level requirements, and where is the requirements document?</li>' +
          '<li>What is the link budget today, and which line item has the least margin?</li>' +
          '<li>What is the power budget per port, and what is the biggest contributor?</li>' +
          '<li>How are the lasers monitored and replaced, and what is their expected life?</li>' +
          '<li>What does the ring-lock start-up sequence look like, and what happens on a coolant temperature step?</li>' +
          '<li>Which telemetry does the network OS see per port, and what are the alarm thresholds?</li>' +
          '<li>What were the top failure modes on the last product, and how are they screened now?</li>' }));
      } }
    ].concat(C.course.appendixPages(C.cpoAppendix)).concat([
      { id: 'done', title: 'Course complete', ch: 'Finish', build(p, ctx) {
        p.appendChild(h('div', { class: 'af-hero' },
          h('div', { class: 'af-eyebrow' }, 'Course complete'),
          h('h1', { html: 'You followed a bit from the <em>switch chip</em> through a <em>ring of light</em> and back' }),
          h('ul', { class: 'af-takeaways', html:
            '<li><b>Why CPO:</b> replace 20–30 cm of lossy board trace, a DSP and per-module lasers with a millimetre link to an optical engine: 3.5× power efficiency, 63× signal integrity, 10× resiliency, 4× fewer lasers ' + B('nv') + '.</li>' +
            '<li><b>The light path:</b> external laser (steady light) → ring modulator (adds the data) → WDM → coupler → fiber → far-end photodetector + TIA → SerDes → FEC.</li>' +
            '<li><b>Rings are tiny and efficient but temperature-sensitive</b>: every ring needs a heater and a lock loop.</li>' +
            '<li><b>Your core tools:</b> the link budget (dB), the power budget (pJ/bit), the thermal budget, the reliability budget, and the interface specs between teams.</li>' +
            '<li><b>Your daily signals:</b> pre-FEC BER, FEC histograms, optical power, laser current, heater codes, temperatures.</li>' }),
          h('div', { class: 'af-cta' },
            h('button', { class: 'btn primary', onclick: () => C.go('architecture') }, 'Continue: Architecture Explorer tour →'),
            h('button', { class: 'btn', onclick: () => C.go('budgets') }, 'Practise: System Budgets'),
            h('button', { class: 'btn', onclick: () => ctx.goId('start') }, '↺ Restart the course'))));
        p.appendChild(h('div', { class: 'callout warn', html: 'Numbers marked ' + B('nv') + ' are NVIDIA public announcements (Quantum-X / Spectrum-X Photonics, GTC 2025). ' + B('typ') + ' are industry-typical values from public literature, and ' + B('est') + ' are illustrative model assumptions. None of them are internal NVIDIA specifications: check the real ones in your team\'s documents. Diagrams are simplified illustrations, not product layouts.' }));
      } }
    ])
  });
})();
