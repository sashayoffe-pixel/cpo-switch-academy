/* AI Factory section: from the building and its network topology down to one transistor on a GPU,
   connected at every level to the CPO (co-packaged optics) switches. Plain-language first. */
(function () {
  'use strict';
  const C = window.CPO;
  const h = C.h, S = C.s, B = C.badge;

  // theme colours (hex so they work in every SVG presentation attribute)
  const K = {
    bg: '#05070a', panel: '#111720', panel2: '#18202c', line: '#243042', text: '#e6edf5', muted: '#8a99ad',
    acc: '#76b900', data: '#22d3ee', optic: '#ff6b3d', power: '#facc15', ctrl: '#a78bfa', therm: '#ff5a36',
    cool: '#3b82f6', copper: '#d08a4a', sense: '#f472b6'
  };
  const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  C.addGlossary({
    'NVL72': { full: 'GB200 NVL72 rack', def: 'NVIDIA rack-scale system: 72 Blackwell GPUs and 36 Grace CPUs joined by copper NVLink so they act as one large GPU; liquid cooled.', cat: 'system' },
    'Tensor Core': { full: 'Tensor Core', def: 'Hardware block inside each GPU SM that multiplies small matrices in one step. It does most of the math in AI.', cat: 'system' },
    'CUDA core': { full: 'CUDA core (FP32 unit)', def: 'A simple arithmetic unit in a GPU SM that does one floating-point multiply-add per clock.', cat: 'system' },
    'FLOPS': { full: 'Floating-point Operations Per Second', def: 'How many arithmetic operations on decimal numbers a chip does each second. One multiply-add counts as 2.', cat: 'general' },
    'EFLOPS': { full: 'Exa-FLOPS', def: '10^18 floating-point operations per second.', cat: 'general' },
    'HBM3e': { full: 'High Bandwidth Memory, gen 3e', def: 'DRAM dies stacked vertically and placed millimetres from the GPU die, giving several TB/s of memory bandwidth.', cat: 'package' },
    'NV-HBI': { full: 'NVIDIA High-Bandwidth Interface', def: 'The 10 TB/s die-to-die link joining the two Blackwell dies so software sees them as one GPU.', cat: 'package' },
    'NVLink-C2C': { full: 'NVLink Chip-to-Chip', def: 'Coherent 900 GB/s link between a Grace CPU and a Blackwell GPU in a GB200 superchip.', cat: 'system' },
    'Grace': { full: 'NVIDIA Grace CPU', def: 'Arm-based CPU that feeds data to Blackwell GPUs in GB200 superchips.', cat: 'system' },
    'Blackwell': { full: 'NVIDIA Blackwell GPU', def: 'GPU generation announced in 2024 (B200 / GB200): two dies, 208 billion transistors, HBM3e memory.', cat: 'system' },
    'Rail': { full: 'Rail (rail-optimized network)', def: 'Wiring style where GPU #n of every server connects to the same leaf switch, so most collective traffic needs only one switch hop.', cat: 'network' },
    'Token': { full: 'Token', def: 'A small piece of text (about ¾ of a word) or data that an AI model reads or generates. AI factories "produce tokens".', cat: 'general' },
    'Warp': { full: 'Warp', def: 'A group of 32 GPU threads that execute the same instruction together.', cat: 'system' },
    'FMA': { full: 'Fused Multiply-Add', def: 'Computes a×b+c in one step. This is the basic operation of matrix math.', cat: 'electrical' },
    'Full adder': { full: 'Full adder', def: 'Logic circuit that adds three bits (A, B, carry-in) and outputs a sum bit and a carry-out bit. It is the basic building block of binary arithmetic.', cat: 'electrical' },
    'NMOS': { full: 'N-channel MOSFET', def: 'Transistor that conducts when its gate is HIGH; pulls a node toward ground.', cat: 'electrical' },
    'PMOS': { full: 'P-channel MOSFET', def: 'Transistor that conducts when its gate is LOW; pulls a node toward the supply.', cat: 'electrical' },
    'VDD': { full: 'Supply voltage', def: 'Positive power rail of a chip (core logic ~0.7 V class).', cat: 'power' },
    'GB200': { full: 'Grace Blackwell 200 superchip', def: 'One Grace CPU and two Blackwell GPUs on one board, linked by NVLink-C2C.', cat: 'system' }
  });

  // ---------------------------------------------------------------- small SVG helpers
  function add(g, el) { g.appendChild(el); return el; }
  function R(g, x, y, w, hh, o) { return add(g, S('rect', Object.assign({ x, y, width: w, height: hh, rx: 4, fill: K.panel, stroke: K.line }, o || {}))); }
  function T(g, x, y, str, o) { return add(g, S('text', Object.assign({ x, y, fill: K.text, 'font-size': 14 }, o || {}), str)); }
  function L(g, x1, y1, x2, y2, o) { return add(g, S('line', Object.assign({ x1, y1, x2, y2, stroke: K.line, 'stroke-width': 1.5 }, o || {}))); }
  function P(g, d, o) { return add(g, S('path', Object.assign({ d, fill: 'none', stroke: K.line, 'stroke-width': 1.5 }, o || {}))); }
  function O(g, cx, cy, r, o) { return add(g, S('circle', Object.assign({ cx, cy, r, fill: K.data }, o || {}))); }
  function G(g, o) { return add(g, S('g', o || {})); }
  function cap(g, x, y, str, col) { return T(g, x, y, str, { fill: col || K.muted, 'font-size': 13, 'font-weight': 700, 'letter-spacing': 1.6 }); }
  function polyLen(pts) { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; }
  function along(pts, u) {
    const tot = polyLen(pts); let d = ((u % 1) + 1) % 1 * tot;
    for (let i = 1; i < pts.length; i++) {
      const sl = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (d <= sl || i === pts.length - 1) { const k = sl ? Math.min(1, d / sl) : 0; return [C.lerp(pts[i - 1][0], pts[i][0], k), C.lerp(pts[i - 1][1], pts[i][1], k)]; }
      d -= sl;
    }
    return pts[pts.length - 1];
  }
  function ptsD(pts) { return 'M' + pts.map(p => p[0] + ' ' + p[1]).join(' L'); }
  function grid(g, x, y, w, hh, step, col) {
    for (let i = x; i <= x + w; i += step) L(g, i, y, i, y + hh, { stroke: col, 'stroke-width': 0.6 });
    for (let j = y; j <= y + hh; j += step) L(g, x, j, x + w, j, { stroke: col, 'stroke-width': 0.6 });
  }

  // ---------------------------------------------------------------- scenes (viewBox 0 0 1000 600)
  function sFactory(g) {
    R(g, 0, 500, 1000, 100, { fill: '#0a0f14', stroke: 'none', rx: 0 });
    // power in
    cap(g, 30, 120, 'POWER IN', K.power);
    T(g, 30, 138, '100 MW – 1 GW+', { fill: K.muted, 'font-size': 13.5 });
    for (let i = 0; i < 3; i++) {
      R(g, 30 + i * 52, 300, 40, 60, { fill: '#1a1705', stroke: K.power });
      for (let k = 0; k < 3; k++) L(g, 36 + i * 52, 312 + k * 14, 64 + i * 52, 312 + k * 14, { stroke: K.power, 'stroke-opacity': .5 });
    }
    T(g, 30, 384, 'substation', { fill: K.muted, 'font-size': 13.5 });
    const pw = [P(g, 'M50 300 L50 170 L200 170', { stroke: K.power, 'stroke-width': 2, 'stroke-dasharray': '8 10' }),
      P(g, 'M102 300 L102 230 L200 230', { stroke: K.power, 'stroke-width': 2, 'stroke-dasharray': '8 10' }),
      P(g, 'M154 330 L200 330', { stroke: K.power, 'stroke-width': 2, 'stroke-dasharray': '8 10' })];
    // building
    R(g, 200, 140, 620, 360, { fill: '#0c1219', stroke: '#3b4a5e', 'stroke-width': 2, rx: 6 });
    cap(g, 215, 162, 'AI FACTORY · DATA HALL', K.text);
    const leds = [];
    const rowsY = [180, 228, 276, 372, 420, 452];
    rowsY.forEach((y, r) => {
      const hh = r === 5 ? 30 : 38;
      for (let c = 0; c < 14; c++) {
        R(g, 238 + c * 40, y, 32, hh, { fill: '#0f1a10', stroke: '#2f5a12', rx: 2 });
        leds.push(R(g, 244 + c * 40, y + 5, 6, 3, { fill: K.acc, stroke: 'none', rx: 1 }));
      }
    });
    // network row
    R(g, 232, 322, 562, 40, { fill: 'rgba(255,107,61,.08)', stroke: K.optic, 'stroke-dasharray': '4 4' });
    for (let c = 0; c < 10; c++) R(g, 246 + c * 54, 332, 42, 20, { fill: '#1d0e08', stroke: K.optic, rx: 2 });
    T(g, 512, 376, 'network row: leaf & spine CPO switches', { fill: K.optic, 'font-size': 13.5, 'text-anchor': 'middle' });
    // cooling
    cap(g, 860, 120, 'COOLING', K.cool);
    const fans = [];
    [[905, 220], [905, 360]].forEach(([x, y]) => {
      O(g, x, y, 40, { fill: '#0b1220', stroke: K.cool, 'stroke-width': 2 });
      const f = G(g, {});
      for (let k = 0; k < 4; k++) add(f, S('path', { d: 'M0 0 L32 -6 L32 6 Z', fill: K.cool, 'fill-opacity': .6, transform: 'rotate(' + k * 90 + ')' }));
      fans.push([f, x, y]);
    });
    T(g, 860, 420, 'liquid loop +', { fill: K.muted, 'font-size': 13.5 });
    T(g, 860, 436, 'heat rejection', { fill: K.muted, 'font-size': 13.5 });
    const pipes = [P(g, 'M865 220 L820 220', { stroke: K.cool, 'stroke-width': 4, 'stroke-dasharray': '6 6' }),
      P(g, 'M820 360 L865 360', { stroke: K.therm, 'stroke-width': 4, 'stroke-dasharray': '6 6' })];
    // tokens out
    cap(g, 430, 40, 'TOKENS OUT → answers, code, images, decisions', K.data);
    const toks = [];
    for (let i = 0; i < 14; i++) toks.push({ el: O(g, 0, 0, 3, { fill: K.data }), x: 300 + i * 34, p: Math.random() });
    return {
      hot: [{ x: 228, y: 172, w: 572, h: 318, target: 'fabric', label: 'Zoom into the data hall network' }],
      update(t, dt) {
        leds.forEach((l, i) => l.setAttribute('fill-opacity', 0.35 + 0.65 * (Math.sin(t * 3 + i * 1.7) > 0.2 ? 1 : 0)));
        pw.forEach(p => p.setAttribute('stroke-dashoffset', -t * 30));
        pipes.forEach(p => p.setAttribute('stroke-dashoffset', -t * 18));
        fans.forEach(([f, x, y]) => f.setAttribute('transform', 'translate(' + x + ' ' + y + ') rotate(' + (t * 120 % 360) + ')'));
        toks.forEach(o => { o.p = (o.p + dt * 0.35) % 1; o.el.setAttribute('cx', o.x); o.el.setAttribute('cy', 135 - o.p * 80); o.el.setAttribute('fill-opacity', 1 - o.p); });
      }
    };
  }

  function sFabric(g) {
    cap(g, 20, 40, 'TIER 2 · SPINE SWITCHES (CPO)', K.optic);
    cap(g, 20, 296, 'TIER 1 · LEAF SWITCHES (CPO)', K.optic);
    cap(g, 20, 362, 'GPU RACKS · inside each rack: copper NVLink', K.acc);
    const sp = [], lf = [], rk = [];
    for (let i = 0; i < 4; i++) sp.push([170 + i * 190, 60]);
    for (let i = 0; i < 8; i++) lf.push([60 + i * 114, 230]);
    for (let i = 0; i < 8; i++) rk.push([68 + i * 114, 380]);
    const links = [];
    lf.forEach(([lx]) => sp.forEach(([sx]) => {
      const a = [lx + 48, 230], b = [sx + 65, 104];
      L(g, a[0], a[1], b[0], b[1], { stroke: K.optic, 'stroke-opacity': .25 });
      links.push({ a, b, p: Math.random(), el: null });
    }));
    rk.forEach(([x], i) => L(g, x + 40, 380, lf[i][0] + 48, 268, { stroke: K.optic, 'stroke-opacity': .5, 'stroke-width': 2 }));
    links.forEach(l => { l.el = O(g, 0, 0, 2.2, { fill: K.optic }); });
    sp.forEach(([x, y]) => { R(g, x, y, 130, 44, { fill: '#1d0e08', stroke: K.optic, 'stroke-width': 1.5, rx: 6 }); T(g, x + 65, y + 27, 'Spine · CPO', { 'text-anchor': 'middle', 'font-size': 13 }); });
    lf.forEach(([x, y]) => { R(g, x, y, 96, 38, { fill: '#1d0e08', stroke: K.optic, rx: 6 }); T(g, x + 48, y + 24, 'Leaf · CPO', { 'text-anchor': 'middle', 'font-size': 13.5 }); });
    rk.forEach(([x, y]) => {
      R(g, x, y, 80, 150, { fill: '#0c1219', stroke: '#3b4a5e', rx: 4 });
      for (let k = 0; k < 8; k++) R(g, x + 8, y + 10 + k * 16, 52, 10, { fill: '#0f1a10', stroke: '#2f5a12', rx: 1 });
      L(g, x + 68, y + 10, x + 68, y + 136, { stroke: K.copper, 'stroke-width': 3 });
    });
    T(g, 500, 565, 'Simplified: really each GPU in a rack connects to a different leaf ("rails"), and big factories add a 3rd tier.', { fill: K.muted, 'font-size': 13.5, 'text-anchor': 'middle' });
    const path = [[68 + 40, 380], [lf[0][0] + 48, 268], [lf[0][0] + 48, 230], [sp[1][0] + 65, 104], [sp[1][0] + 65, 104], [lf[5][0] + 48, 230], [lf[5][0] + 48, 268], [rk[5][0] + 40, 380]];
    const trail = [0, 1, 2, 3].map(k => O(g, 0, 0, 7 - k * 1.4, { fill: '#fff', 'fill-opacity': 1 - k * 0.22, filter: 'drop-shadow(0 0 6px #ff6b3d)' }));
    const lbl = T(g, 0, 0, 'one message: rack → leaf → spine → leaf → rack', { fill: '#fff', 'font-size': 13.5 });
    return {
      hot: [{ x: rk[2][0] - 6, y: 374, w: 92, h: 162, target: 'rack', label: 'Zoom into a rack' },
        { x: sp[2][0] - 6, y: 54, w: 142, h: 56, go: 'architecture/switch-chassis', label: 'Open a CPO switch ↗' }],
      update(t, dt) {
        links.forEach(l => { l.p = (l.p + dt * 0.5) % 1; l.el.setAttribute('cx', C.lerp(l.a[0], l.b[0], l.p)); l.el.setAttribute('cy', C.lerp(l.a[1], l.b[1], l.p)); });
        const u = (t * 0.22) % 1;
        trail.forEach((d, k) => { const p = along(path, Math.max(0, u - k * 0.012)); d.setAttribute('cx', p[0]); d.setAttribute('cy', p[1]); });
        const p0 = along(path, u); lbl.setAttribute('x', p0[0] + 12); lbl.setAttribute('y', p0[1] - 10);
      }
    };
  }

  function sRack(g) {
    const x0 = 380, w = 240, y0 = 52, sh = 16;
    R(g, x0, 40, w, 524, { fill: '#0b1016', stroke: '#3b4a5e', 'stroke-width': 2, rx: 6 });
    const kinds = ['p', 'p'].concat(Array(10).fill('c'), Array(9).fill('s'), Array(8).fill('c'), ['p', 'p']);
    const sty = { p: { fill: '#1d1a06', stroke: '#8a7a14' }, c: { fill: '#0f1a10', stroke: '#4d7f12' }, s: { fill: '#08171c', stroke: '#1b7f92' } };
    const leds = [], slotY = [];
    kinds.forEach((k, i) => {
      const y = y0 + i * sh; slotY.push(y);
      R(g, x0 + 10, y, w - 20, sh - 3, Object.assign({ rx: 2 }, sty[k]));
      if (k !== 'p') leds.push(R(g, x0 + 16, y + 4, 8, 4, { fill: k === 'c' ? K.acc : K.data, stroke: 'none', rx: 1 }));
    });
    // brackets + labels (left)
    function br(i0, i1, txt, sub, col) {
      const ya = slotY[i0], yb = slotY[i1] + sh - 3;
      P(g, 'M372 ' + ya + ' L364 ' + ya + ' L364 ' + yb + ' L372 ' + yb, { stroke: col });
      T(g, 354, (ya + yb) / 2, txt, { 'text-anchor': 'end', fill: col, 'font-size': 13, 'font-weight': 600 });
      if (sub) T(g, 354, (ya + yb) / 2 + 16, sub, { 'text-anchor': 'end', fill: K.muted, 'font-size': 13 });
    }
    br(0, 1, 'Power shelves', '48–54 V busbar', K.power);
    br(2, 11, 'Compute trays ×10', '4 GPUs + 2 CPUs each', K.acc);
    br(12, 20, 'NVLink switch trays ×9', 'connect all 72 GPUs', K.data);
    br(21, 28, 'Compute trays ×8', '', K.acc);
    br(29, 30, 'Power shelves', '', K.power);
    // copper spine (back)
    const cu = [];
    for (let k = 0; k < 5; k++) cu.push(L(g, 636 + k * 9, slotY[2], 636 + k * 9, slotY[28] + 12, { stroke: K.copper, 'stroke-width': 2.4, 'stroke-dasharray': '10 6' }));
    kinds.forEach((k, i) => { if (k !== 'p') L(g, x0 + w - 10, slotY[i] + 6, 636, slotY[i] + 6, { stroke: K.copper, 'stroke-opacity': .5 }); });
    T(g, 690, 74, 'NVLink copper spine', { fill: K.copper, 'font-size': 13, 'font-weight': 600 });
    T(g, 690, 90, '(back of rack, scale-up)', { fill: K.muted, 'font-size': 13 });
    // fibers out (scale-out)
    const fib = [];
    [4, 8, 24, 27].forEach((i, n) => {
      const pts = [[x0 + w - 10, slotY[i] + 6], [720, slotY[i] + 6], [820, 300 + (n - 1.5) * 10], [985, 300 + (n - 1.5) * 10]];
      P(g, ptsD(pts), { stroke: K.optic, 'stroke-width': 2, 'stroke-opacity': .65 });
      for (let q = 0; q < 3; q++) fib.push({ pts, p: q / 3 + n * 0.07, el: O(g, 0, 0, 3, { fill: K.optic }) });
    });
    T(g, 830, 270, 'fiber → leaf CPO switches', { fill: K.optic, 'font-size': 13, 'font-weight': 600 });
    T(g, 830, 346, '(scale-out, 800G per GPU)', { fill: K.muted, 'font-size': 13 });
    // coolant
    const cl = [L(g, 630, 560, 630, 40, { stroke: K.cool, 'stroke-width': 3, 'stroke-dasharray': '6 8' })];
    T(g, 690, 540, 'liquid-cooling manifolds', { fill: K.cool, 'font-size': 13.5 });
    const ti = 6;
    return {
      hot: [{ x: x0 + 4, y: slotY[ti] - 3, w: w - 8, h: sh + 3, target: 'tray', label: 'Zoom into one compute tray' }],
      update(t, dt) {
        leds.forEach((l, i) => l.setAttribute('fill-opacity', Math.sin(t * 4 + i * 2.3) > 0 ? 1 : 0.3));
        cu.forEach(c => c.setAttribute('stroke-dashoffset', -t * 40));
        cl.forEach(c => c.setAttribute('stroke-dashoffset', t * 20));
        fib.forEach(f => { f.p = (f.p + dt * 0.3) % 1; const p = along(f.pts, f.p); f.el.setAttribute('cx', p[0]); f.el.setAttribute('cy', p[1]); });
      }
    };
  }

  function sTray(g) {
    R(g, 80, 110, 840, 390, { fill: '#0b1016', stroke: '#3b4a5e', 'stroke-width': 2, rx: 8 });
    cap(g, 90, 100, 'FRONT', K.muted); cap(g, 860, 100, 'BACK', K.muted);
    // ports + fibers out the front
    const fib = [];
    for (let i = 0; i < 6; i++) {
      const y = 140 + i * 58, dpu = i >= 4;
      R(g, 84, y, 40, 34, { fill: '#1d0e08', stroke: dpu ? K.data : K.optic, rx: 3 });
      const pts = [[84, y + 17], [40, y + 17], [10, y + 17]];
      L(g, 84, y + 17, 0, y + 17, { stroke: dpu ? K.data : K.optic, 'stroke-width': 2.5, 'stroke-opacity': .7 });
      fib.push({ pts, p: Math.random(), el: O(g, 0, 0, 3.2, { fill: dpu ? K.data : K.optic }) });
    }
    T(g, 14, 128, 'to leaf CPO switch', { fill: K.optic, 'font-size': 13.5, 'font-weight': 600 });
    T(g, 14, 520, 'to front-end network', { fill: K.data, 'font-size': 13.5 });
    // NICs
    for (let i = 0; i < 4; i++) { R(g, 160, 136 + i * 58, 70, 42, { fill: '#08171c', stroke: K.data }); T(g, 195, 162 + i * 58, 'NIC', { 'text-anchor': 'middle', 'font-size': 13.5 }); L(g, 124, 157 + i * 58, 160, 157 + i * 58, { stroke: K.data }); }
    R(g, 160, 368, 70, 74, { fill: '#08171c', stroke: K.data }); T(g, 195, 402, 'DPU', { 'text-anchor': 'middle', 'font-size': 13.5 }); T(g, 195, 418, 'BlueField', { 'text-anchor': 'middle', 'font-size': 11.5, fill: K.muted });
    T(g, 195, 462, 'ConnectX SuperNICs', { 'text-anchor': 'middle', 'font-size': 12.5, fill: K.data });
    // superchips
    const gpus = [];
    [130, 315].forEach((by, b) => {
      R(g, 270, by, 430, 165, { fill: '#0d140e', stroke: '#2f5a12', rx: 6 });
      T(g, 282, by + 18, 'GB200 superchip ' + (b + 1), { fill: K.muted, 'font-size': 13 });
      R(g, 290, by + 40, 95, 95, { fill: '#160f24', stroke: K.ctrl, 'stroke-width': 1.5 }); T(g, 337, by + 92, 'Grace CPU', { 'text-anchor': 'middle', 'font-size': 13.5 });
      [415, 555].forEach(gx => {
        R(g, gx, by + 28, 125, 125, { fill: '#0f1a10', stroke: K.acc, 'stroke-width': 1.8, rx: 5 });
        for (let k = 0; k < 4; k++) { R(g, gx + 8 + k * 29, by + 34, 22, 14, { fill: '#160f24', stroke: K.ctrl, rx: 1 }); R(g, gx + 8 + k * 29, by + 133, 22, 14, { fill: '#160f24', stroke: K.ctrl, rx: 1 }); }
        gpus.push(R(g, gx + 22, by + 58, 81, 64, { fill: '#1b2a10', stroke: '#9bd43a', rx: 2 }));
        T(g, gx + 62, by + 95, 'Blackwell', { 'text-anchor': 'middle', 'font-size': 13.5 });
      });
      L(g, 385, by + 88, 415, by + 88, { stroke: K.acc, 'stroke-width': 3 });
      T(g, 400, by + 80, 'C2C', { 'text-anchor': 'middle', fill: K.acc, 'font-size': 10.5 });
    });
    // PCIe NIC <-> GPU
    const pc = [];
    for (let i = 0; i < 4; i++) {
      const gy = i < 2 ? 220 : 405, gx = i % 2 ? 555 : 415;
      pc.push(P(g, 'M230 ' + (157 + i * 58) + ' C 250 ' + (157 + i * 58) + ' 250 ' + gy + ' ' + gx + ' ' + gy, { stroke: K.data, 'stroke-opacity': .55, 'stroke-dasharray': '5 6' }));
    }
    // cold plate tubes
    const tube = [P(g, 'M300 112 L300 125 L690 125 L690 300 L300 300 L300 488', { stroke: K.cool, 'stroke-width': 3, 'stroke-opacity': .6, 'stroke-dasharray': '7 7' })];
    // back: NVLink + power
    for (let i = 0; i < 4; i++) { R(g, 760, 140 + i * 70, 50, 50, { fill: '#1a1208', stroke: K.copper }); T(g, 785, 170 + i * 70, 'NVL', { 'text-anchor': 'middle', 'font-size': 12.5, fill: K.copper }); }
    T(g, 790, 440, 'NVLink → copper spine', { 'text-anchor': 'middle', fill: K.copper, 'font-size': 13.5 });
    R(g, 840, 150, 60, 230, { fill: '#1d1a06', stroke: K.power }); T(g, 870, 270, '48 V', { 'text-anchor': 'middle', fill: K.power, 'font-size': 13.5 });
    T(g, 870, 400, 'power in', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12.5 });
    return {
      hot: [{ x: 411, y: 154, w: 133, h: 133, target: 'gpu', label: 'Zoom into a GPU' }],
      update(t, dt) {
        fib.forEach(f => { f.p = (f.p + dt * 0.6) % 1; f.el.setAttribute('cx', C.lerp(84, 0, f.p)); f.el.setAttribute('cy', f.pts[0][1]); });
        pc.forEach(p => p.setAttribute('stroke-dashoffset', t * 30));
        tube.forEach(p => p.setAttribute('stroke-dashoffset', -t * 20));
        gpus.forEach((r, i) => r.setAttribute('fill-opacity', 0.6 + 0.4 * Math.sin(t * 5 + i)));
      }
    };
  }

  function sGpu(g) {
    R(g, 110, 60, 780, 480, { fill: '#13110a', stroke: '#5a4d2a', 'stroke-width': 2, rx: 10 });
    T(g, 126, 82, 'package substrate (wires fan out to ~thousands of solder balls)', { fill: K.muted, 'font-size': 13.5 });
    R(g, 160, 100, 680, 410, { fill: '#0f1216', stroke: '#3b4a5e', rx: 6 });
    T(g, 176, 500, 'silicon interposer / bridge (CoWoS-L): micron-scale wiring between dies', { fill: K.muted, 'font-size': 13.5 });
    const dies = [[300, 190], [510, 190]];
    const glow = [];
    dies.forEach(([x, y], i) => {
      R(g, x, y, 190, 220, { fill: '#0f1a10', stroke: K.acc, 'stroke-width': 2 });
      grid(g, x + 8, y + 8, 174, 204, 14.5, 'rgba(118,185,0,.18)');
      glow.push(R(g, x + 8, y + 8, 174, 204, { fill: K.acc, 'fill-opacity': 0.05, stroke: 'none' }));
      T(g, x + 95, y + 115, 'GPU die ' + (i + 1), { 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 600 });
      T(g, x + 95, y + 133, '~104 billion transistors', { 'text-anchor': 'middle', 'font-size': 12.5, fill: K.muted });
    });
    const hbi = [];
    for (let k = 0; k < 9; k++) hbi.push(R(g, 492, 200 + k * 23, 16, 12, { fill: K.data, stroke: 'none', rx: 2 }));
    T(g, 500, 182, 'NV-HBI 10 TB/s', { 'text-anchor': 'middle', fill: K.data, 'font-size': 13.5, 'font-weight': 600 });
    const hbm = [];
    [[300, 112], [400, 112], [510, 112], [610, 112], [300, 425], [400, 425], [510, 425], [610, 425]].forEach(([x, y]) => {
      for (let k = 3; k >= 0; k--) R(g, x + k * 3, y + k * 3, 84, 52, { fill: '#160f24', stroke: K.ctrl, rx: 3 });
      T(g, x + 46, y + 34, 'HBM3e', { 'text-anchor': 'middle', 'font-size': 13.5, fill: '#d9ccff' });
      hbm.push({ x: x + 46, top: y < 300, p: Math.random(), el: O(g, 0, 0, 2.6, { fill: K.ctrl }) });
    });
    return {
      hot: [{ x: 296, y: 186, w: 198, h: 228, target: 'die', label: 'Zoom into a die', inside: true }],
      update(t, dt) {
        hbi.forEach((r, k) => r.setAttribute('fill-opacity', 0.25 + 0.75 * ((Math.sin(t * 8 - k * 0.9) + 1) / 2)));
        glow.forEach((r, i) => r.setAttribute('fill-opacity', 0.05 + 0.08 * (Math.sin(t * 3 + i * 2) + 1)));
        hbm.forEach(o => { o.p = (o.p + dt * 0.9) % 1; o.el.setAttribute('cx', o.x); o.el.setAttribute('cy', o.top ? C.lerp(170, 195, o.p) : C.lerp(425, 405, o.p)); });
      }
    };
  }

  function sDie(g) {
    R(g, 100, 60, 800, 480, { fill: '#0b130c', stroke: K.acc, 'stroke-width': 2, rx: 4 });
    R(g, 140, 64, 720, 32, { fill: '#160f24', stroke: K.ctrl }); T(g, 500, 85, 'HBM memory controllers + PHY', { 'text-anchor': 'middle', 'font-size': 13.5, fill: '#d9ccff' });
    R(g, 140, 504, 720, 32, { fill: '#160f24', stroke: K.ctrl }); T(g, 500, 525, 'HBM memory controllers + PHY', { 'text-anchor': 'middle', 'font-size': 13.5, fill: '#d9ccff' });
    R(g, 104, 100, 32, 400, { fill: '#08171c', stroke: K.data });
    T(g, 124, 300, 'NVLink SerDes', { 'text-anchor': 'middle', 'font-size': 13.5, fill: K.data, transform: 'rotate(-90 124 300)' });
    R(g, 864, 100, 32, 400, { fill: '#08171c', stroke: K.data });
    T(g, 884, 300, 'NV-HBI → other die', { 'text-anchor': 'middle', 'font-size': 13.5, fill: K.data, transform: 'rotate(-90 884 300)' });
    R(g, 145, 286, 710, 30, { fill: '#0b1a2e', stroke: K.cool }); T(g, 500, 306, 'L2 cache (shared by all SMs)', { 'text-anchor': 'middle', 'font-size': 13.5, fill: '#bcd4ff' });
    const tiles = [];
    for (let half = 0; half < 2; half++) for (let r = 0; r < 3; r++) for (let c = 0; c < 12; c++) {
      const x = 150 + c * 59, y = (half ? 326 : 104) + r * 59;
      tiles.push(R(g, x, y, 52, 50, { fill: '#122012', stroke: '#2f5a12', rx: 3 }));
      T(g, x + 26, y + 30, 'SM', { 'text-anchor': 'middle', 'font-size': 12.5, fill: K.muted });
    }
    const io = [];
    for (let k = 0; k < 8; k++) io.push({ y: 120 + k * 48, p: Math.random(), el: O(g, 0, 0, 2.6, { fill: K.data }) });
    return {
      hot: [{ x: 150 + 4 * 59 - 4, y: 104 - 4, w: 60, h: 58, target: 'sm', label: 'Zoom into one SM', below: true }],
      update(t, dt) {
        tiles.forEach((r, i) => { const on = Math.sin(t * 2.3 + i * 12.9898) > 0.55; r.setAttribute('fill', on ? '#2b4a12' : '#122012'); r.setAttribute('stroke', on ? K.acc : '#2f5a12'); });
        io.forEach(o => { o.p = (o.p + dt * 0.7) % 1; o.el.setAttribute('cx', C.lerp(136, 60, o.p)); o.el.setAttribute('cy', o.y); });
      }
    };
  }

  function sSm(g) {
    R(g, 60, 36, 880, 528, { fill: '#0b130c', stroke: K.acc, 'stroke-width': 2, rx: 8 });
    R(g, 80, 50, 840, 30, { fill: '#160f24', stroke: K.ctrl }); T(g, 500, 70, 'Instruction cache', { 'text-anchor': 'middle', 'font-size': 13.5, fill: '#d9ccff' });
    const cores = [], tcs = [];
    [[80, 92], [505, 92], [80, 277], [505, 277]].forEach(([px, py], q) => {
      R(g, px, py, 415, 177, { fill: '#0d150e', stroke: '#2f5a12', rx: 6 });
      R(g, px + 10, py + 10, 395, 24, { fill: '#160f24', stroke: K.ctrl, rx: 3 });
      T(g, px + 207, py + 27, 'Warp scheduler · picks 32 threads to run', { 'text-anchor': 'middle', 'font-size': 13, fill: '#d9ccff' });
      R(g, px + 10, py + 42, 110, 125, { fill: '#0b1a2e', stroke: K.cool, rx: 3 });
      T(g, px + 65, py + 100, 'Register', { 'text-anchor': 'middle', 'font-size': 13.5, fill: '#bcd4ff' });
      T(g, px + 65, py + 116, 'file', { 'text-anchor': 'middle', 'font-size': 13.5, fill: '#bcd4ff' });
      for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) cores.push(R(g, px + 132 + c * 16, py + 50 + r * 26, 12, 20, { fill: '#0f1a10', stroke: '#3b6a16', rx: 1 }));
      T(g, px + 194, py + 162, '32 CUDA cores', { 'text-anchor': 'middle', 'font-size': 12.5, fill: K.muted });
      tcs.push(R(g, px + 266, py + 42, 139, 125, { fill: '#1b2a10', stroke: K.acc, 'stroke-width': 2, rx: 4 }));
      T(g, px + 335, py + 100, 'Tensor Core', { 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700 });
      T(g, px + 335, py + 118, 'matrix math', { 'text-anchor': 'middle', 'font-size': 12.5, fill: K.muted });
    });
    R(g, 80, 466, 840, 82, { fill: '#0b1a2e', stroke: K.cool, rx: 4 });
    T(g, 500, 500, 'L1 cache / shared memory', { 'text-anchor': 'middle', 'font-size': 14, fill: '#bcd4ff' });
    T(g, 500, 520, 'fast scratchpad shared by all four partitions', { 'text-anchor': 'middle', 'font-size': 13, fill: K.muted });
    return {
      hot: [{ x: 342, y: 130, w: 147, h: 133, target: 'tensor', label: 'Zoom into a Tensor Core' }],
      update(t) {
        cores.forEach((r, i) => r.setAttribute('fill', Math.sin(t * 6 + i * 7.31) > 0.3 ? '#3b6a16' : '#0f1a10'));
        tcs.forEach((r, i) => r.setAttribute('fill-opacity', 0.55 + 0.45 * Math.abs(Math.sin(t * 2.5 + i))));
      }
    };
  }

  function sTensor(g) {
    const cell = 46, ax = 70, ay = 230, bx = 330, by = 20, cx = 330, cy = 230;
    cap(g, ax, ay - 14, 'A · INPUTS (activations)', K.data);
    cap(g, bx + 200, by + 16, 'B · WEIGHTS', K.ctrl);
    cap(g, cx, cy + 4 * cell + 22, 'C = A × B · OUTPUTS', K.acc);
    let A, Bm;
    function rnd() { return Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => Math.floor(Math.random() * 4))); }
    const aEl = [], bEl = [], cEl = [];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      aEl.push([R(g, ax + j * cell, ay + i * cell, cell - 4, cell - 4, { fill: '#08171c', stroke: K.data }), T(g, ax + j * cell + 21, ay + i * cell + 28, '', { 'text-anchor': 'middle', 'font-size': 16 })]);
      bEl.push([R(g, bx + j * cell, by + i * cell, cell - 4, cell - 4, { fill: '#160f24', stroke: K.ctrl }), T(g, bx + j * cell + 21, by + i * cell + 28, '', { 'text-anchor': 'middle', 'font-size': 16 })]);
      cEl.push([R(g, cx + j * cell, cy + i * cell, cell - 4, cell - 4, { fill: '#0f1a10', stroke: K.acc }), T(g, cx + j * cell + 21, cy + i * cell + 28, '', { 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 700 })]);
    }
    R(g, 560, 230, 410, 180, { fill: K.panel, stroke: K.line, rx: 8 });
    cap(g, 576, 254, 'ONE OUTPUT = ROW × COLUMN', K.text);
    const eq1 = T(g, 576, 290, '', { 'font-size': 15, 'font-family': 'ui-monospace,Consolas,monospace', fill: '#d8f5a8' });
    const eq2 = T(g, 576, 318, '', { 'font-size': 15, 'font-family': 'ui-monospace,Consolas,monospace', fill: '#d8f5a8' });
    T(g, 576, 352, 'Shown one at a time so you can follow.', { 'font-size': 13.5, fill: K.muted });
    T(g, 576, 370, 'A real Tensor Core does all 16 outputs (64', { 'font-size': 13.5, fill: K.muted });
    T(g, 576, 388, 'multiply-adds) in parallel, every clock tick.', { 'font-size': 13.5, fill: K.muted });
    cap(g, 70, 470, 'INSIDE: AN ARRAY OF MULTIPLY-ADD UNITS', K.muted);
    const mac = [];
    for (let k = 0; k < 16; k++) { mac.push(R(g, 70 + k * 56, 484, 48, 40, { fill: '#0f1a10', stroke: '#3b6a16', rx: 4 })); T(g, 94 + k * 56, 509, '×+', { 'text-anchor': 'middle', 'font-size': 13, fill: K.muted }); }
    let last = -1;
    function reset() { A = rnd(); Bm = rnd(); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { aEl[i * 4 + j][1].textContent = A[i][j]; bEl[i * 4 + j][1].textContent = Bm[i][j]; cEl[i * 4 + j][1].textContent = ''; } }
    reset();
    return {
      hot: [{ x: 62 + 5 * 56, y: 478, w: 64, h: 52, target: 'gates', label: 'Zoom into one multiply-adder', below: true }],
      update(t) {
        const step = Math.floor(t / 0.9) % 17;
        if (step === last) return; last = step;
        if (step === 16) { reset(); return; }
        if (step === 0) cEl.forEach(c => { c[1].textContent = ''; });
        const i = Math.floor(step / 4), j = step % 4;
        aEl.forEach((e, k) => e[0].setAttribute('fill', Math.floor(k / 4) === i ? '#0e4a57' : '#08171c'));
        bEl.forEach((e, k) => e[0].setAttribute('fill', k % 4 === j ? '#3a2470' : '#160f24'));
        cEl.forEach((e, k) => e[0].setAttribute('fill', k === step ? '#3b6a16' : '#0f1a10'));
        mac.forEach((m, k) => m.setAttribute('fill', k === step ? '#3b6a16' : '#0f1a10'));
        let sum = 0; const terms = [];
        for (let k = 0; k < 4; k++) { sum += A[i][k] * Bm[k][j]; terms.push(A[i][k] + '·' + Bm[k][j]); }
        cEl[step][1].textContent = sum;
        eq1.textContent = 'c[' + (i + 1) + '][' + (j + 1) + '] = ' + terms.slice(0, 2).join(' + ') + ' +';
        eq2.textContent = '          ' + terms.slice(2).join(' + ') + ' = ' + sum;
      }
    };
  }

  // gate shapes
  function gAnd(g, x, y, col) { return P(g, 'M' + x + ' ' + y + ' H' + (x + 40) + ' A30 30 0 0 1 ' + (x + 40) + ' ' + (y + 60) + ' H' + x + ' Z', { fill: '#0d150e', stroke: col, 'stroke-width': 2 }); }
  function gOr(g, x, y, col) { return P(g, 'M' + x + ' ' + y + ' Q' + (x + 25) + ' ' + (y + 30) + ' ' + x + ' ' + (y + 60) + ' Q' + (x + 55) + ' ' + (y + 60) + ' ' + (x + 80) + ' ' + (y + 30) + ' Q' + (x + 55) + ' ' + y + ' ' + x + ' ' + y + ' Z', { fill: '#0d150e', stroke: col, 'stroke-width': 2 }); }
  function gXor(g, x, y, col) { P(g, 'M' + (x - 10) + ' ' + y + ' Q' + (x + 15) + ' ' + (y + 30) + ' ' + (x - 10) + ' ' + (y + 60), { stroke: col, 'stroke-width': 2 }); return gOr(g, x, y, col); }

  function sGates(g, api) {
    cap(g, 40, 40, 'A 1-BIT FULL ADDER · the Lego brick of arithmetic', K.text);
    T(g, 40, 62, 'Click the input bits A, B, Carry-in to change them (or let it cycle).', { fill: K.muted, 'font-size': 14 });
    const wires = {
      A: [[[95, 130], [180, 130], [180, 178], [280, 178]], [[180, 178], [180, 318], [280, 318]]],
      B: [[[95, 250], [220, 250], [220, 202], [280, 202]], [[220, 250], [220, 342], [280, 342]]],
      X1: [[[360, 190], [460, 190], [460, 238], [540, 238]], [[460, 238], [460, 418], [540, 418]]],
      Ci: [[[95, 500], [500, 500], [500, 262], [540, 262]], [[500, 442], [540, 442]]],
      N1: [[[350, 330], [660, 330], [660, 358], [720, 358]]],
      N2: [[[610, 430], [680, 430], [680, 382], [720, 382]]],
      S: [[[620, 250], [860, 250]]],
      Co: [[[800, 370], [860, 370]]]
    };
    const wEl = {};
    for (const k in wires) wEl[k] = wires[k].map(pts => P(g, ptsD(pts), { stroke: K.line, 'stroke-width': 3 }));
    gXor(g, 280, 160, K.data); T(g, 318, 195, 'XOR', { 'text-anchor': 'middle', 'font-size': 13.5 });
    gAnd(g, 280, 300, K.acc); T(g, 310, 335, 'AND', { 'text-anchor': 'middle', 'font-size': 13.5 });
    gXor(g, 540, 220, K.data); T(g, 578, 255, 'XOR', { 'text-anchor': 'middle', 'font-size': 13.5 });
    gAnd(g, 540, 400, K.acc); T(g, 570, 435, 'AND', { 'text-anchor': 'middle', 'font-size': 13.5 });
    gOr(g, 720, 340, K.ctrl); T(g, 755, 375, 'OR', { 'text-anchor': 'middle', 'font-size': 13.5 });
    const inp = {};
    let manual = false;
    const st = { A: 0, B: 0, Ci: 0 };
    [['A', 130, 'A'], ['B', 250, 'B'], ['Ci', 500, 'Carry-in']].forEach(([k, y, lbl]) => {
      const grp = G(g, { style: 'cursor:pointer' });
      const c = O(grp, 70, y, 22, { fill: K.panel2, stroke: K.muted, 'stroke-width': 2 });
      const tx = T(grp, 70, y + 6, '0', { 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 700 });
      T(g, 70, y - 30, lbl, { 'text-anchor': 'middle', 'font-size': 13.5, fill: K.muted });
      grp.addEventListener('click', e => { e.stopPropagation(); manual = true; st[k] ^= 1; draw(); });
      inp[k] = [c, tx];
    });
    const out = {};
    [['S', 250, 'Sum'], ['Co', 370, 'Carry-out']].forEach(([k, y, lbl]) => {
      out[k] = [O(g, 885, y, 24, { fill: K.panel2, stroke: K.muted, 'stroke-width': 2 }), T(g, 885, y + 7, '0', { 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 700 })];
      T(g, 885, y - 32, lbl, { 'text-anchor': 'middle', 'font-size': 13.5, fill: K.muted });
    });
    const res = T(g, 640, 520, '', { 'font-size': 16, 'font-family': 'ui-monospace,Consolas,monospace', fill: '#d8f5a8' });
    T(g, 640, 545, 'a Tensor Core has thousands of these', { 'font-size': 13, fill: K.muted });
    function setW(k, v) { wEl[k].forEach(p => { p.setAttribute('stroke', v ? K.acc : '#2a3646'); p.setAttribute('filter', v ? 'drop-shadow(0 0 4px #76b900)' : ''); }); }
    function draw() {
      const a = st.A, b = st.B, ci = st.Ci, x1 = a ^ b, s = x1 ^ ci, n1 = a & b, n2 = x1 & ci, co = n1 | n2;
      setW('A', a); setW('B', b); setW('Ci', ci); setW('X1', x1); setW('N1', n1); setW('N2', n2); setW('S', s); setW('Co', co);
      [['A', a], ['B', b], ['Ci', ci]].forEach(([k, v]) => { inp[k][1].textContent = v; inp[k][0].setAttribute('stroke', v ? K.acc : K.muted); inp[k][0].setAttribute('fill', v ? '#1b2a10' : K.panel2); });
      [['S', s], ['Co', co]].forEach(([k, v]) => { out[k][1].textContent = v; out[k][0].setAttribute('stroke', v ? K.acc : K.muted); out[k][0].setAttribute('fill', v ? '#2b4a12' : K.panel2); });
      res.textContent = a + ' + ' + b + ' + ' + ci + ' = ' + (a + b + ci) + '  →  binary ' + co + s;
    }
    draw();
    let lastStep = -1;
    return {
      hot: [{ x: 272, y: 292, w: 92, h: 76, target: 'cmos', label: 'Zoom into a gate' }],
      update(t) {
        if (manual) return;
        const k = Math.floor(t / 1.3) % 8; if (k === lastStep) return; lastStep = k;
        st.A = k >> 2 & 1; st.B = k >> 1 & 1; st.Ci = k & 1; draw();
      }
    };
  }

  function sCmos(g) {
    cap(g, 40, 40, 'CMOS INVERTER (NOT gate) · 2 transistors', K.text);
    T(g, 40, 62, 'Click the input to flip it. AND/OR/XOR gates are built from the same two kinds of switch.', { fill: K.muted, 'font-size': 14 });
    L(g, 330, 100, 670, 100, { stroke: K.power, 'stroke-width': 4 }); T(g, 680, 105, 'VDD ≈ 0.7 V  (logic 1)', { fill: K.power, 'font-size': 13 });
    L(g, 330, 530, 670, 530, { stroke: K.muted, 'stroke-width': 4 }); T(g, 680, 535, 'Ground  (logic 0)', { fill: K.muted, 'font-size': 13 });
    for (let k = 0; k < 3; k++) L(g, 485 + k * 5, 538 + k * 6, 515 - k * 5, 538 + k * 6, { stroke: K.muted, 'stroke-width': 2 });
    const wires = [L(g, 500, 100, 500, 160, { stroke: K.power, 'stroke-width': 3 }), L(g, 500, 260, 500, 370, { stroke: '#2a3646', 'stroke-width': 3 }), L(g, 500, 470, 500, 530, { stroke: K.muted, 'stroke-width': 3 })];
    const outW = L(g, 500, 315, 790, 315, { stroke: '#2a3646', 'stroke-width': 3 });
    const inW = P(g, 'M172 315 L380 315 M380 210 L380 420 M380 210 L440 210 M380 420 L440 420', { stroke: '#2a3646', 'stroke-width': 3 });
    function sw(y, name, sub, col) {
      R(g, 440, y, 120, 100, { fill: '#0d1219', stroke: col, 'stroke-width': 2, rx: 8 });
      T(g, 580, y + 40, name, { fill: col, 'font-size': 15, 'font-weight': 700 });
      T(g, 580, y + 60, sub, { fill: K.muted, 'font-size': 13.5 });
      O(g, 500, y + 18, 5, { fill: K.text }); O(g, 500, y + 82, 5, { fill: K.text });
      return P(g, '', { stroke: K.text, 'stroke-width': 4, 'stroke-linecap': 'round' });
    }
    const lP = sw(160, 'PMOS', 'closes when input = 0', K.ctrl);
    const lN = sw(370, 'NMOS', 'closes when input = 1', K.data);
    const grp = G(g, { style: 'cursor:pointer' });
    const ic = O(grp, 150, 315, 26, { fill: K.panel2, stroke: K.muted, 'stroke-width': 2 });
    const it = T(grp, 150, 322, '0', { 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 700 });
    T(g, 150, 275, 'Input', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 13.5 });
    const lamp = O(g, 820, 315, 28, { fill: K.panel2, stroke: K.muted, 'stroke-width': 2 });
    const lt = T(g, 820, 322, '1', { 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 700 });
    T(g, 820, 272, 'Output', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 13.5 });
    const dots = []; for (let k = 0; k < 8; k++) dots.push(O(g, -10, -10, 3.5, { fill: K.power }));
    const note = T(g, 40, 590, '', { fill: K.text, 'font-size': 13 });
    // scope
    R(g, 40, 420, 300, 140, { fill: '#05080b', stroke: K.line, rx: 6 });
    T(g, 52, 440, 'in', { fill: K.data, 'font-size': 12.5 }); T(g, 52, 510, 'out', { fill: K.acc, 'font-size': 12.5 });
    const trIn = P(g, '', { stroke: K.data, 'stroke-width': 2 }), trOut = P(g, '', { stroke: K.acc, 'stroke-width': 2 });
    const hist = [];
    let v = 0, manual = false, flipT = 0;
    grp.addEventListener('click', e => { e.stopPropagation(); manual = true; v ^= 1; flipT = performance.now() / 1000; });
    let lastAuto = -1;
    return {
      hot: [{ x: 432, y: 362, w: 136, h: 116, target: 'transistor', label: 'Zoom into one transistor' }],
      update(t, dt) {
        if (!manual) { const k = Math.floor(t / 1.8); if (k !== lastAuto) { lastAuto = k; v = k % 2; flipT = t; } }
        const o = v ? 0 : 1;
        lP.setAttribute('d', v ? 'M500 178 L528 232' : 'M500 178 L500 242');
        lN.setAttribute('d', v ? 'M500 388 L500 452' : 'M500 388 L528 442');
        it.textContent = v; ic.setAttribute('stroke', v ? K.acc : K.muted); ic.setAttribute('fill', v ? '#1b2a10' : K.panel2);
        lt.textContent = o; lamp.setAttribute('fill', o ? '#4d6b12' : K.panel2); lamp.setAttribute('stroke', o ? K.acc : K.muted);
        lamp.setAttribute('filter', o ? 'drop-shadow(0 0 12px #76b900)' : '');
        inW.setAttribute('stroke', v ? K.acc : '#2a3646'); outW.setAttribute('stroke', o ? K.acc : '#2a3646'); wires[1].setAttribute('stroke', o ? K.acc : '#2a3646');
        note.textContent = v ? 'Input 1 → NMOS closed: output is connected to ground → 0.' : 'Input 0 → PMOS closed: output is connected to VDD → 1.';
        const path = v ? [[500, 315], [500, 530]] : [[500, 100], [500, 315], [790, 315]];
        const tt = (manual ? performance.now() / 1000 : t) - flipT;
        const show = tt < 0.9; // charge/discharge current only flows right after switching
        dots.forEach((d, k) => { const p = along(path, (tt * 1.2 + k / 8) % 1); d.setAttribute('cx', p[0]); d.setAttribute('cy', p[1]); d.setAttribute('fill-opacity', show ? 1 : 0); d.setAttribute('fill', v ? K.muted : K.power); });
        hist.push(v); if (hist.length > 140) hist.shift();
        let a = '', b = '';
        hist.forEach((x, i) => { const X = 330 - (hist.length - 1 - i) * 2; a += (i ? 'L' : 'M') + X + ' ' + (x ? 448 : 478); b += (i ? 'L' : 'M') + X + ' ' + (x ? 548 : 518); });
        trIn.setAttribute('d', a); trOut.setAttribute('d', b);
      }
    };
  }

  function sTransistor(g) {
    cap(g, 40, 40, 'FinFET TRANSISTOR · a switch with no moving parts', K.text);
    T(g, 40, 62, 'Click the gate to switch it yourself.', { fill: K.muted, 'font-size': 14 });
    // substrate
    P(g, 'M140 430 L760 430 L880 350 L260 350 Z', { fill: '#141a22', stroke: '#3b4a5e' });
    P(g, 'M140 430 L760 430 L760 500 L140 500 Z', { fill: '#0e131a', stroke: '#3b4a5e' });
    P(g, 'M760 430 L880 350 L880 420 L760 500 Z', { fill: '#0b0f15', stroke: '#3b4a5e' });
    T(g, 450, 480, 'silicon substrate', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 13 });
    // fin (front face + top)
    P(g, 'M200 395 L800 395 L830 375 L230 375 Z', { fill: '#28415e', stroke: '#5c86b8' });
    P(g, 'M200 395 L800 395 L800 430 L200 430 Z', { fill: '#1d3048', stroke: '#5c86b8' });
    R(g, 200, 395, 210, 35, { fill: '#1d4a6b', stroke: 'none', rx: 0, 'fill-opacity': .8 });
    R(g, 590, 395, 210, 35, { fill: '#1d4a6b', stroke: 'none', rx: 0, 'fill-opacity': .8 });
    T(g, 300, 418, 'SOURCE', { 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: '#bcd4ff' });
    T(g, 700, 418, 'DRAIN', { 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: '#bcd4ff' });
    // contacts
    R(g, 270, 300, 50, 85, { fill: '#3a3f47', stroke: '#8a99ad' }); R(g, 680, 300, 50, 85, { fill: '#3a3f47', stroke: '#8a99ad' });
    T(g, 295, 290, '0 V', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 13.5 }); T(g, 705, 290, '+0.7 V', { 'text-anchor': 'middle', fill: K.power, 'font-size': 13.5 });
    // channel glow
    const chan = R(g, 410, 395, 180, 35, { fill: K.data, stroke: 'none', rx: 0, 'fill-opacity': 0 });
    // gate wraps the fin
    const gg = G(g, { style: 'cursor:pointer' });
    const gate = P(gg, 'M410 440 L410 330 L440 310 L620 310 L620 420 L590 440 Z', { fill: '#2c2140', stroke: K.ctrl, 'stroke-width': 2 });
    P(gg, 'M410 330 L590 330 L620 310 M590 330 L590 440', { stroke: K.ctrl, 'stroke-width': 1.5 });
    T(gg, 500, 372, 'GATE', { 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 700, fill: '#e3d9ff' });
    T(gg, 500, 390, '(wraps the fin)', { 'text-anchor': 'middle', 'font-size': 12.5, fill: '#bfb2e8' });
    R(gg, 480, 240, 40, 70, { fill: '#3a3f47', stroke: '#8a99ad' });
    const gv = T(g, 500, 230, '', { 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700 });
    // gate meter
    R(g, 60, 110, 28, 160, { fill: '#05080b', stroke: K.line, rx: 4 });
    const bar = R(g, 63, 260, 22, 7, { fill: K.ctrl, stroke: 'none', rx: 2 });
    T(g, 74, 290, 'gate', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12.5 });
    T(g, 74, 304, 'voltage', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12.5 });
    const status = T(g, 120, 140, '', { 'font-size': 18, 'font-weight': 700 });
    const status2 = T(g, 120, 164, '', { 'font-size': 13, fill: K.muted });
    const el = []; for (let k = 0; k < 22; k++) el.push({ p: Math.random(), y: 400 + Math.random() * 25, el: O(g, -9, -9, 3, { fill: K.data }) });
    // scale info
    R(g, 640, 90, 330, 130, { fill: K.panel, stroke: K.line, rx: 8 });
    cap(g, 656, 114, 'HOW SMALL?', K.data);
    T(g, 656, 138, 'fin width ≈ 5–7 nm  ·  gate pitch ≈ 50 nm', { 'font-size': 14 });
    T(g, 656, 160, '≈ 1,600 gates side by side = 1 human hair', { 'font-size': 14 });
    T(g, 656, 182, 'switches ~2 billion times per second', { 'font-size': 14 });
    T(g, 656, 204, '~208 billion of them in one Blackwell GPU', { 'font-size': 14 });
    T(g, 500, 560, 'electrons flow source → drain only while the gate voltage "opens" the channel', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 14 });
    let manual = false, on = 0, lvl = 0;
    gg.addEventListener('click', e => { e.stopPropagation(); manual = true; on = on ? 0 : 1; });
    return {
      hot: [],
      update(t, dt) {
        if (!manual) on = Math.floor(t / 2.2) % 2 ? 1 : 0;
        lvl += ((on ? 1 : 0) - lvl) * Math.min(1, dt * 6);
        bar.setAttribute('height', 7 + lvl * 145); bar.setAttribute('y', 260 - lvl * 145);
        gate.setAttribute('fill', on ? '#4a3480' : '#2c2140');
        gv.textContent = on ? 'gate = 0.7 V' : 'gate = 0 V'; gv.setAttribute('fill', on ? K.power : K.muted);
        chan.setAttribute('fill-opacity', 0.55 * lvl);
        status.textContent = on ? 'ON  →  logic 1' : 'OFF  →  logic 0'; status.setAttribute('fill', on ? K.acc : K.muted);
        status2.textContent = on ? 'gate attracts electrons → a conducting bridge forms' : 'energy barrier under the gate blocks electrons';
        el.forEach((e, k) => {
          if (lvl > 0.3) e.p = (e.p + dt * 0.45) % 1;           // channel open: drift source → drain
          else if (e.p < 0.31) e.p = (e.p + dt * 0.03) % 0.31;   // closed: electrons wander in the source
          else e.p = Math.min(1.2, e.p + dt * 0.6);             // ones already past the gate drain away
          if (e.p >= 1) e.p = Math.random() * 0.3;
          e.el.setAttribute('cx', C.lerp(220, 790, e.p)); e.el.setAttribute('cy', e.y + (lvl > 0.3 ? 0 : Math.sin(e.p * 90 + k) * 4));
        });
      }
    };
  }

  // ---------------------------------------------------------------- level content
  const LV = [
    { id: 'factory', name: 'AI factory', size: '~500 m', scene: sFactory, cpo: true,
      title: 'The AI factory', sub: 'A building that turns electricity into intelligence',
      plain: 'An <b>AI factory</b> is a data center whose only product is AI. <b>Electricity and cooling go in; tokens come out</b>: the words, code, images and decisions that AI models generate.',
      body: '<p>Inside are tens of thousands to hundreds of thousands of GPUs. They all work on <b>one job at the same time</b>, either training one giant model or serving millions of users, so they must behave like a single enormous computer.</p><p>Three things decide how much it can produce: how much <span class="d-power">power</span> it gets, how well it removes <span class="d-thermal">heat</span>, and how fast the GPUs can <span class="d-data">talk to each other</span>. The last one is the network, and that is where CPO switches come in.</p>',
      facts: [['100 MW – 1 GW+', 'facility power', 'typ'], ['10k – 1M', 'GPUs', 'typ'], ['100k – millions', 'optical links', 'typ'], ['Liquid', 'cooling on every hot chip', 'typ']],
      cpoTxt: 'Every message between GPUs in different racks travels as <b>light in a fiber</b>. At this scale the optics alone draw many megawatts and are among the most common things to fail. CPO switches move the light-to-electricity conversion into the switch chip package. NVIDIA says this makes it 3.5× more power-efficient ' + B('nv') + ' and 10× more resilient ' + B('nv') + '.',
      more: 'A rough way to picture it: a 1 GW factory spends most of its power on GPUs, a fair share on cooling, and the rest on network, storage and conversion losses. Every watt saved in the network can be given to a GPU instead.',
      links: [['architecture', 'Architecture explorer root']] },
    { id: 'fabric', name: 'Topology', size: '~100 m', scene: sFabric, cpo: true,
      title: 'Network topology: spine & leaf', sub: 'How tens of thousands of GPUs reach each other in 3 hops',
      plain: 'Think of a road system. Every rack has an <b>on-ramp</b> (the <b>leaf switch</b>). The leaves are joined by <b>highways</b> (the <b>spine switches</b>). Every leaf has a road to every spine, so any GPU can reach any other GPU with no traffic jam.',
      body: '<p><b>Fat tree (Clos network).</b> Each leaf uses half its ports going <i>down</i> to GPUs and half going <i>up</i> to spines. Because there is as much bandwidth up as down, the tree never narrows toward the top ("fat") and no GPU has to wait for a free lane ("non-blocking").</p><p><b>Hops.</b> A message goes up to its leaf, up to a spine, down to another leaf, and down to the destination: 3 switches. Very large factories add a third tier ("core" or "super-spine"): 5 switches.</p><p><b>Rails.</b> In practice GPU #1 of every server plugs into leaf "rail 1", GPU #2 into rail 2, and so on. GPUs with the same number exchange the most data, so most of their traffic crosses only one switch.</p>',
      facts: [['144 ports', 'Quantum-X Photonics radix (800G)', 'nv'], ['k²/2 ≈ 10,368', 'GPUs reachable with 2 tiers', 'typ'], ['k³/4 ≈ 746k', 'GPUs reachable with 3 tiers', 'typ'], ['3 or 5', 'switch hops worst case', 'typ']],
      cpoTxt: 'The leaf and spine boxes in this picture are the CPO switches: <b>Quantum-X Photonics</b> for InfiniBand and <b>Spectrum-X Photonics</b> for Ethernet. Every line is a fiber. In the old design, every fiber end at a switch needed a pluggable transceiver with its own lasers. In a CPO switch, optical engines inside the package do that job.',
      more: 'Why the network matters so much: during training every GPU shares its results with the others on every step (an "all-reduce"). The step finishes only when the <b>slowest</b> message arrives, so one slow or flapping link can make thousands of GPUs wait. The number of ports per switch (the "radix") matters because more ports mean fewer tiers, fewer hops and fewer optical links.',
      links: [['architecture/system', 'Fabric in the explorer'], ['architecture/switch-chassis', 'Inside a CPO switch']] },
    { id: 'rack', name: 'Rack', size: '~2 m', scene: sRack, cpo: true,
      title: 'The rack: GB200 NVL72', sub: '72 GPUs wired together with copper so they act as one',
      plain: 'A rack is a cabinet about the size of a fridge. In an <b>NVL72</b> rack, <b>72 GPUs</b> are linked so tightly with copper cables that software can treat them as <b>one giant GPU</b>.',
      body: '<p>From top to bottom: power shelves, 10 compute trays, 9 <b>NVLink switch trays</b>, 8 more compute trays, more power shelves. Behind them is the <b>NVLink spine</b>, a bundle of copper cables that connects every GPU to every NVLink switch. This is the <b>scale-up</b> network.</p><p>Copper works here because the distances are under about 2 m. Coolant flows through manifolds to cold plates on every chip, because air cannot carry away ~120 kW.</p>',
      facts: [['72 GPU + 36 CPU', 'Blackwell + Grace', 'nv'], ['1.8 TB/s', 'NVLink per GPU (130 TB/s total)', 'nv'], ['~120 kW', 'per rack', 'typ'], ['Liquid', 'cooled', 'nv']],
      cpoTxt: 'Two networks leave this rack. <b>Copper NVLink</b> stays inside it (scale-up). Each GPU also has a network card with an <b>800G-class optical port</b> that runs over fiber to a leaf CPO switch (scale-out). <b>The edge of the rack is where electricity becomes light.</b>',
      more: 'Why not use copper everywhere? At 200 Gb/s per wire pair, copper loses so much signal that it only reaches 1–2 m. Racks are 10–100+ m apart, and only fiber can cover that distance at these speeds.',
      links: [] },
    { id: 'tray', name: 'Compute tray', size: '~80 cm', scene: sTray, cpo: true,
      title: 'One compute tray', sub: '4 GPUs, 2 CPUs and the network cards',
      plain: 'One drawer of the rack. It holds <b>2 GB200 superchips</b> (each is 1 Grace CPU and 2 Blackwell GPUs) plus the <b>network cards</b> that connect them to the rest of the factory.',
      body: '<p><b>Back (right):</b> NVLink connectors plug into the copper spine, and 48 V power comes in from the busbar.</p><p><b>Middle:</b> the CPU and GPUs under liquid cold plates. Each CPU feeds its GPUs over NVLink-C2C at 900 GB/s.</p><p><b>Front (left):</b> one <b>ConnectX SuperNIC</b> per GPU, connected to it over PCIe. Each one has an optical port, and from there a fiber runs to a leaf switch. A <b>BlueField DPU</b> handles the "front-end" network: storage, users and management.</p>',
      facts: [['4 GPU + 2 CPU', 'per tray', 'nv'], ['900 GB/s', 'NVLink-C2C CPU↔GPU', 'nv'], ['1 NIC / GPU', '400–800 Gb/s each', 'typ'], ['~10–15 W', 'one 800G pluggable transceiver', 'typ']],
      cpoTxt: 'Follow one fiber out of a NIC. At the NIC end, the light today usually still comes from a <b>pluggable transceiver</b>. The other end plugs straight into the <b>front panel of a CPO switch</b> through a detachable fiber connector. Behind that panel, the optical engines sit right next to the switch chip.',
      more: 'Why one network card per GPU? The GPUs work in lock-step, so each one needs its own dedicated lane to the network. If two GPUs shared a lane, both would slow down.',
      links: [] },
    { id: 'gpu', name: 'GPU package', size: '~10 cm', scene: sGpu, cpo: false,
      title: 'The GPU package (Blackwell)', sub: 'Two compute dies and eight memory towers on one base',
      plain: 'The "GPU" you could hold in your hand is really <b>a small city of chips</b> on one base: <b>2 big compute dies</b> and <b>8 towers of memory</b> (HBM).',
      body: '<p>Each die is close to the largest size a chip factory can print in one exposure (the reticle limit), so NVIDIA joins two of them with a 10 TB/s link (NV-HBI). Software sees them as one GPU.</p><p>Each <b>HBM</b> tower is a stack of memory chips wired vertically. It sits only millimetres from the compute die on a silicon interposer. Together they give 192 GB of memory at 8 TB/s.</p><p>Why so close? <b>Moving data costs energy</b>, and shorter wires use less of it while carrying more bandwidth.</p>',
      facts: [['208 billion', 'transistors', 'nv'], ['10 TB/s', 'die-to-die link', 'nv'], ['192 GB · 8 TB/s', 'HBM3e', 'nv'], ['~1 kW', 'power per GPU', 'typ']],
      cpoTxt: '<b>CPO uses exactly the same trick.</b> HBM sits next to the GPU die because they exchange huge amounts of data. Optical engines sit next to the switch die for the same reason. Short wire, less energy per bit.',
      more: 'The package also turns ~1,000 A at under 1 V into thousands of tiny connections, and it must stay flat while it heats up. In a CPO switch the package additionally carries the optical engines and their fiber attach points.',
      links: [['architecture/switch-package', 'Compare: the CPO switch package']] },
    { id: 'die', name: 'GPU die', size: '~3 cm', scene: sDie, cpo: false,
      title: 'Inside one die', sub: 'A grid of identical compute blocks with "doors" on the edges',
      plain: 'Zoom into one die and you see a <b>grid of identical blocks called SMs</b> (streaming multiprocessors). In the middle is a big shared <b>cache</b>, and along the edges are the <b>doors</b> to memory and to other chips.',
      body: '<p><b>SMs</b> do the math. Spreading the work over many identical blocks is what makes GPUs fast.</p><p><b>L2 cache</b> is a large on-chip memory shared by all SMs, so they don\'t always have to go out to HBM.</p><p><b>Edges:</b> memory controllers talk to HBM. <b>SerDes</b> (serializer/deserializer) circuits send data off the chip over NVLink at ~200 Gb/s per lane. The NV-HBI edge connects to the twin die.</p>',
      facts: [['~100+', 'SMs per die (H100: 132 enabled)', 'typ'], ['TSMC 4NP', 'process', 'nv'], ['~800 mm²', 'die area (reticle ≈ 858 mm²)', 'typ'], ['~2 GHz', 'clock', 'typ']],
      cpoTxt: 'The <b>SerDes on this die edge</b> are the same kind of circuit used on the switch ASIC. In a pluggable switch they must push a signal through ~20–30 cm of circuit board. In a <b>CPO switch they only drive a few millimetres to the optical engine</b>, which is a big part of why CPO saves power.',
      more: 'A chip is a balance between compute area (SMs), memory (caches) and I/O (edges). The edge length, called the "shoreline", limits how much data can get in and out. CPO and HBM both exist to get more bandwidth per millimetre of shoreline.',
      links: [['architecture/serdes', 'SerDes in the explorer']] },
    { id: 'sm', name: 'SM', size: '~1 mm', scene: sSm, cpo: false,
      title: 'One SM (streaming multiprocessor)', sub: 'A workshop with four workbenches',
      plain: 'An SM is like a <b>workshop with four workbenches</b>. Each bench has a team of simple calculators (<b>CUDA cores</b>) and one power tool, the <b>Tensor Core</b>, which does a whole block of matrix math in one go.',
      body: '<p><b>Warp scheduler:</b> the foreman. Every clock tick it picks a group of 32 threads (a <i>warp</i>) that all do the same instruction.</p><p><b>Register file:</b> the fastest, smallest memory, right at the bench.</p><p><b>Tensor Core:</b> AI models are mostly giant matrix multiplications, so this block does most of the useful work.</p><p><b>L1 / shared memory:</b> a scratchpad shared by the four benches.</p>',
      facts: [['4', 'Tensor Cores per SM', 'typ'], ['128', 'FP32 cores per SM (Hopper)', 'nv'], ['32', 'threads per warp', 'nv'], ['256 KB', 'L1 / shared per SM (Hopper)', 'nv']],
      cpoTxt: 'When an SM finishes its piece of a calculation and the result is needed by a GPU in <b>another rack</b>, the result leaves the die through SerDes, travels through the NIC and a fiber, and crosses the CPO switches. The faster that trip, the less time this workshop sits idle.',
      more: 'GPUs hide memory delays by keeping many warps ready. When one warp waits for data, the scheduler instantly switches to another. They hide network delays the same way: compute and communication overlap.',
      links: [] },
    { id: 'tensor', name: 'Tensor Core', size: '~100 µm', scene: sTensor, cpo: false,
      title: 'Tensor Core: matrix math', sub: 'Every output = a row × a column, added up',
      plain: '<b>AI is mostly multiplying big tables of numbers.</b> A Tensor Core multiplies small tiles (here 4×4) in a single step. Each output number is one row of A times one column of B, added up.',
      body: '<p>A layer of a neural network computes <i>outputs = inputs × weights</i>. A model with billions of weights needs <b>trillions of multiply-adds for every token</b> it produces.</p><p>Using <b>smaller numbers</b> (8-bit or even 4-bit, called FP8 / FP4) lets the chip do more of them per second and move less data, at a small cost in precision.</p>',
      facts: [['~1.4 EFLOPS', 'NVL72 FP4 (sparse)', 'nv'], ['2 FLOPs', 'per multiply-add', 'typ'], ['FP64 … FP4', 'supported precisions', 'nv'], ['10²⁵+', 'FLOPs to train a frontier model', 'typ']],
      cpoTxt: 'In training, each GPU computes on its own slice of the data. Then all GPUs must <b>add up their results with each other</b> (all-reduce) over NVLink and the CPO fabric. The faster the math gets, the larger the share of time spent communicating, so the network has to keep up.',
      more: 'A 4×4×4 tile is 64 multiplies and 64 adds. Real Tensor Cores work on larger tiles each clock, and thousands of them run in parallel across the GPU.',
      links: [] },
    { id: 'gates', name: 'Logic gates', size: '~1 µm', scene: sGates, cpo: false,
      title: 'Logic gates: adding bits', sub: 'The full adder, the basic brick of arithmetic',
      plain: 'Inside each multiply-adder, numbers are just <b>bits (0 or 1)</b>. Tiny <b>logic gates</b> (AND, OR, XOR) combine bits. The circuit on the left is a <b>full adder</b>: it adds three bits and gives a sum bit and a carry bit.',
      body: '<p><b>Sum</b> = A XOR B XOR Carry-in. <b>Carry-out</b> = (A AND B) OR (Carry-in AND (A XOR B)).</p><p>Chain 8 full adders and you can add two 8-bit numbers, the way you carry the 1 in school arithmetic. A <b>multiplier</b> is a grid of adders. A Tensor Core contains many thousands of these.</p>',
      facts: [['~28', 'transistors per CMOS full adder', 'typ'], ['~2 billion/s', 'times a gate can switch', 'typ'], ['~10 ps', 'delay per gate', 'typ'], ['208 B', 'transistors in a Blackwell GPU', 'nv']],
      cpoTxt: 'The <b>switch ASIC inside a CPO switch</b> is built from exactly the same gates. It uses them to read packet headers, look up where each packet goes and schedule billions of packets per second.',
      more: 'Every gate takes a few picoseconds to settle. Hundreds of gates in a row, plus wire delays, set the clock speed: the clock has to wait for the slowest path.',
      links: [['architecture/pipeline-logic', 'Switch pipeline logic']] },
    { id: 'cmos', name: 'CMOS gate', size: '~200 nm', scene: sCmos, cpo: false,
      title: 'CMOS: gates made of switches', sub: 'The inverter: two transistors, one bit',
      plain: 'Every gate is made of <b>transistors acting as switches</b>. The simplest is the <b>inverter</b> (NOT). Input 0: the top switch closes and the output connects to power (1). Input 1: the bottom switch closes and the output connects to ground (0).',
      body: '<p>CMOS means <i>complementary</i>: one <b>PMOS</b> (on when its input is low) and one <b>NMOS</b> (on when its input is high). Only one is on at a time, so current flows only <b>during the instant of switching</b>.</p><p>Each flip charges or discharges a tiny capacitance, and the energy used is ½·C·V². Billions of gates × billions of flips per second adds up to a GPU\'s ~1 kW.</p>',
      facts: [['~0.7 V', 'supply voltage', 'typ'], ['~fJ', 'energy per switch (10⁻¹⁵ J)', 'typ'], ['2', 'transistors per inverter', 'typ'], ['4', 'transistors per NAND gate', 'typ']],
      cpoTxt: '<b>Energy per bit is the theme all the way up.</b> Flipping a gate costs femtojoules. Sending one bit through a pluggable optic costs ~15–20 picojoules ' + B('typ') + ', thousands of times more. CPO cuts that to ~5 pJ/bit ' + B('typ') + '.',
      more: 'This is why chips run at low voltage: halving V cuts switching energy by 4×. It is also why CPO is worth the trouble: once compute is this efficient, the energy to move bits over a network becomes the bottleneck.',
      links: [] },
    { id: 'transistor', name: 'Transistor', size: '~50 nm', scene: sTransistor, cpo: true,
      title: 'The transistor (FinFET)', sub: 'The bottom of everything: a switch with no moving parts',
      plain: 'A transistor is a <b>switch with no moving parts</b>. A voltage on the <b>gate</b> pulls electrons into a thin layer and creates a <b>bridge</b> between the <b>source</b> and the <b>drain</b>. Remove the voltage and the bridge disappears.',
      body: '<p>In a <b>FinFET</b> the channel is a thin vertical fin of silicon, and the gate wraps around three sides so it can switch the channel off firmly. The next generation (<b>gate-all-around nanosheets</b>) wraps all four sides.</p><p>The scale: fins a few nanometres wide, gates about 50 nm apart, roughly 1,600 of them across one human hair ' + B('est') + '. A Blackwell GPU has 208 billion.</p>',
      facts: [['~5–7 nm', 'fin width', 'typ'], ['~50 nm', 'gate pitch', 'typ'], ['80,000 nm', 'a human hair', 'typ'], ['10⁵–10⁶', 'on/off current ratio', 'typ']],
      cpoTxt: '<b>Full circle.</b> In a CPO optical engine, an <b>electronic chip (EIC)</b> full of transistors like this one is stacked directly on a <b>photonic chip (PIC)</b>. There, <b>micro-ring modulators</b> use a silicon p-n junction to turn these on/off voltages into on/off light. The same silicon that does the math also drives the light.',
      more: 'The transistor\'s physics (threshold voltage, leakage, subthreshold slope) and the micro-ring\'s physics (carrier depletion shifting the refractive index) are both covered in depth in the Architecture explorer.',
      links: [['architecture/transistor', 'Transistor physics (deep)'], ['architecture/mrm', 'Micro-ring modulator'], ['architecture/optical-engine', 'Optical engine']] }
  ];
  const IDX = {}; LV.forEach((l, i) => { IDX[l.id] = i; });

  // ---------------------------------------------------------------- one bit's journey
  const JP = [
    [70, 290, 'Tensor Cores', 'e'], [170, 290, 'HBM', 'e'], [170, 200, 'NVLink', 'e'], [270, 200, 'NIC', 'e'],
    [270, 110, 'Transceiver', 'o'], [420, 110, 'Leaf CPO', 'o'], [500, 45, 'Spine CPO', 'o'], [580, 110, 'Leaf CPO', 'o'],
    [730, 110, 'Transceiver', 'o'], [730, 200, 'NIC', 'e'], [830, 290, 'HBM', 'e'], [930, 290, 'Tensor Cores', 'e']
  ];
  const JS = [
    { r: [0, 0], t: 'Compute', d: 'Transistors in a Tensor Core switch billions of times and produce a result (for example a gradient during training). <b>Electrons, femtojoules, nanometres.</b>' },
    { r: [0, 1], t: 'Write to memory', d: 'The result goes to HBM, millimetres away on the same package. Short wire, low energy.' },
    { r: [1, 2], t: 'Share inside the rack', d: 'Over <b>NVLink copper</b> it reaches the other 71 GPUs in the rack at 1.8 TB/s. This is scale-up: no light needed, the distance is under 2 m.' },
    { r: [2, 3], t: 'Hand to the NIC', d: 'For GPUs in other racks, the data goes over PCIe to the GPU\'s own ConnectX NIC, whose SerDes send it as 200G PAM4 electrical lanes.' },
    { r: [3, 4], t: 'Electricity → light', d: 'In the NIC\'s transceiver a laser and modulator turn the electrical signal into <b>pulses of light</b>. The fiber leaves the rack.' },
    { r: [4, 5], t: 'Into a leaf CPO switch', d: 'After tens of metres of fiber the light reaches the <b>leaf switch\'s front panel</b>. Inside the package an optical engine\'s photodetector turns it back into electricity, <b>millimetres from the switch ASIC</b>. No long board trace and no DSP retimer.' },
    { r: [5, 7], t: 'Switch, spine, switch', d: 'The ASIC reads the destination and sends the data out through another optical engine. The light comes from the <b>external laser source</b>, and ring modulators imprint the data on it. It goes up to a <b>spine</b> CPO switch and down to the destination leaf. Each hop takes well under a microsecond.' },
    { r: [7, 11], t: 'Light → electricity → math', d: 'The destination NIC turns light back into electricity, writes into the other GPU\'s HBM, and its Tensor Cores add the numbers together (all-reduce). The whole trip takes a few microseconds, repeated millions of times per training step.' }
  ];

  // ---------------------------------------------------------------- render
  let live = null;

  // Guided course: every step is one page; the learner only presses Next.
  const LAST_KEY = 'af-last-step';

  function render(el, sub) {
    // ------------------------------------------------ course bar (sticky)
    const btnPrev = h('button', { class: 'btn af-prev', onclick: () => step(-1) }, '← Back');
    const btnNext = h('button', { class: 'btn primary af-next', onclick: () => step(1) }, 'Next →');
    const barTitle = h('div', { class: 'af-bar-title' });
    const barTrack = h('div', { class: 'af-track' });
    const tocBtn = h('button', { class: 'btn af-tocbtn', title: 'All steps', onclick: () => toc.classList.toggle('open') }, '☰ Contents');
    const toc = h('div', { class: 'af-toc' });
    el.appendChild(h('div', { class: 'af-bar' }, btnPrev, h('div', { class: 'af-bar-mid' }, barTitle, barTrack), tocBtn, btnNext, toc));

    const pagesEl = h('div', { class: 'af-pages' });
    el.appendChild(pagesEl);
    const bottomPrev = h('button', { class: 'btn', onclick: () => step(-1) }, '← Back');
    const bottomNext = h('button', { class: 'btn primary af-bignext', onclick: () => step(1) });
    el.appendChild(h('div', { class: 'af-bottom' }, bottomPrev, h('span', { class: 'af-keys muted' }, 'Tip: use the ← → arrow keys'), bottomNext));

    // ------------------------------------------------ pages
    const pages = {};
    function page(id) { const p = h('div', { class: 'af-page', 'data-id': id }); pagesEl.appendChild(p); pages[id] = p; return p; }

    // intro
    const resumeId = (() => { try { return localStorage.getItem(LAST_KEY); } catch (e) { return null; } })();
    const pIntro = page('start');
    pIntro.appendChild(h('div', { class: 'af-hero' },
      h('div', { class: 'af-eyebrow' }, 'Guided course · about 30–45 minutes'),
      h('h1', { html: 'Inside an <em>AI factory</em>: from the building to the transistor' }),
      h('p', { html: 'You don\'t need to choose anything: just press <b>Next</b>. The course zooms through <b>11 levels</b>, from a gigawatt building down to one 50 nm transistor, then puts it all together, and ends with an <b>appendix</b> that goes deeper. At every stop you\'ll see how it connects to the <b style="color:var(--optic)">co-packaged optics (CPO) switches</b>.' }),
      h('div', { class: 'af-analogy', html:
        '<div><span>🏭</span><b>Factory</b>power and cooling in, tokens out</div>' +
        '<div><span>🛣️</span><b>Road network</b>leaf & spine CPO switches connect every rack</div>' +
        '<div><span>👷</span><b>Workers</b>GPUs, each with thousands of calculators</div>' +
        '<div><span>💡</span><b>Light switches</b>transistors, 208 billion per GPU</div>' }),
      h('div', { class: 'af-cta' },
        h('button', { class: 'btn primary af-bignext', onclick: () => step(1) }, 'Start the course →'),
        resumeId && resumeId !== 'start' && resumeId !== 'done' ? h('button', { class: 'btn', onclick: () => goId(resumeId) }, 'Resume where you left off') : null)));
    pIntro.appendChild(h('div', { class: 'card', html: '<h3 style="margin-top:0">The route</h3><ol class="af-route">' +
      '<li><b>Zoom in, 11 steps:</b> AI factory → network topology → rack → compute tray → GPU package → die → SM → Tensor Core → logic gates → CMOS → transistor.</li>' +
      '<li><b>Put it together, 4 steps:</b> the four networks, one piece of data\'s journey through light and copper, what CPO saves at factory scale, and a recap of the sizes.</li>' +
      '<li><b>Appendix, 4 chapters:</b> the AI factory in depth, network topologies in depth, how GPUs work, and how training and inference use the network.</li></ol>' +
      '<p class="muted" style="margin:0">Each level shows a diagram (it animates; the scene zooms into the next level when you press Next), a box <b style="color:var(--accent)">"In plain words"</b>, key numbers, and an orange box <b style="color:var(--optic)">"Connection to the CPO switch"</b>.</p>' }));

    // levels share one stage + panel
    const svg = S('svg', { viewBox: '0 0 1000 600', class: 'af-svg', role: 'img' });
    const cam = S('g', {}); svg.appendChild(cam);
    const scaleTag = h('div', { class: 'af-scale' });
    const stage = h('div', { class: 'af-stage' }, svg);
    const panel = h('div', { class: 'card af-panel' });
    const lvlNote = h('div', { class: 'af-zoomhint', html: 'Press <b>Next</b> and the picture zooms into the highlighted part. (You can also click a <b style="color:var(--accent)">dashed green region</b> yourself.)' });
    const pLevel = page('__level');
    pLevel.appendChild(h('div', { class: 'af-main' }, h('div', null, stage, h('div', { class: 'af-nav' }, scaleTag), lvlNote), panel));

    // networks
    const pNets = page('networks');
    pNets.appendChild(h('h2', { class: 'af-ph' }, 'The four networks of an AI factory'));
    pNets.appendChild(h('p', { class: 'h-sub' }, 'You have now seen every level. Zoom back out: an AI factory actually has several separate networks, each built for a different job. CPO switches live in the scale-out network, which has by far the most optical links.'));
    pNets.appendChild(h('div', { class: 'af-nets', html:
      net('var(--accent)', 'Scale-up', 'NVLink', 'Inside the rack. Lets 72 GPUs share memory and act as one. Extremely fast, very short reach.', 'copper · ≤ ~2 m · 1.8 TB/s per GPU ' + B('nv')) +
      net('var(--optic)', 'Scale-out ★ CPO lives here', 'Compute fabric', 'Between racks. Every GPU gets its own 800G port into a leaf/spine fat tree. InfiniBand (Quantum-X Photonics) or Ethernet (Spectrum-X Photonics).', 'fiber · 10 m – 1 km+ · 800 Gb/s per GPU ' + B('nv')) +
      net('var(--data)', 'Front-end', 'Storage & users', 'Loads training data, saves checkpoints, carries user requests and answers. Uses BlueField DPUs over Ethernet.', 'fiber / copper · 100–400 Gb/s ' + B('typ')) +
      net('var(--ctrl)', 'Management', 'Out-of-band', 'A small, separate, very reliable network for BMCs, telemetry, firmware updates, power and cooling control.', 'copper · 1–10 Gb/s ' + B('typ')) }));
    pNets.appendChild(h('div', { class: 'callout', html: '<b>And beyond the building:</b> "scale-across" links join several AI factories over long-haul fiber, so a single job can span sites. Those use long-reach coherent optics rather than CPO.' }));

    // journey
    const pJour = page('journey');
    pJour.appendChild(h('h2', { class: 'af-ph' }, 'Follow one piece of data: transistor → light → transistor'));
    pJour.appendChild(h('p', { class: 'h-sub' }, 'One result travels from a GPU to a GPU in another rack. The animation steps through it by itself; watch where it is electricity (cyan) and where it is light (orange), and where the CPO switches sit.'));
    const jsvg = S('svg', { viewBox: '0 0 1000 340', class: 'af-jsvg' });
    const jlist = h('ol', { class: 'af-steps' });
    const jdesc = h('div', { class: 'callout' });
    const jplay = h('button', { class: 'btn' }, '⏸ Pause');
    pJour.appendChild(h('div', { class: 'af-journey' }, h('div', null, jsvg, jdesc, h('div', { class: 'af-nav' }, jplay)), h('div', { class: 'card' }, jlist)));
    const jr = buildJourney(jsvg);

    // calculator
    const pCalc = page('savings');
    pCalc.appendChild(h('h2', { class: 'af-ph' }, 'What CPO switches save at factory scale'));
    pCalc.appendChild(h('p', { class: 'h-sub' }, 'Drag the GPU slider. The calculator builds a non-blocking fat tree, counts the optical links, and compares switches with pluggable transceivers against CPO switches.'));
    pCalc.appendChild(buildCalc().el);

    // scale recap
    const pScale = page('scale');
    pScale.appendChild(h('h2', { class: 'af-ph' }, 'Recap: the scale of it all'));
    const tb = h('table', { class: 'table af-pow' });
    tb.innerHTML = '<tr><th>Size</th><th>Level</th><th>Made of</th><th>Talks to its neighbours with</th></tr>';
    const madeOf = ['racks, power, cooling, network', 'leaf & spine CPO switches, fiber', 'trays, NVLink switches, copper spine', 'GPUs, CPUs, NICs', '2 dies + 8 HBM stacks', '~100+ SMs, cache, SerDes', '4 Tensor Cores, 128 CUDA cores', 'arrays of multiply-adders', 'logic gates', 'transistor pairs', 'silicon, atoms, electrons'];
    const talk = ['long-haul fiber (scale-across)', 'fiber + CPO optical engines', 'copper NVLink + fiber out', 'NVLink, PCIe, cold-plate plumbing', 'NV-HBI 10 TB/s, interposer wires', 'on-chip wires, L2 cache', 'registers, shared memory', 'wires a few µm long', 'wires < 1 µm', 'metal layers', 'the electric field of the gate'];
    LV.forEach((l, i) => tb.appendChild(h('tr', { onclick: () => goId(l.id) },
      h('td', null, l.size), h('td', null, h('b', null, l.name)), h('td', { class: 'muted' }, madeOf[i]), h('td', { class: 'muted' }, talk[i]))));
    pScale.appendChild(h('div', { class: 'card' }, tb, h('p', { class: 'muted', style: 'margin:8px 0 0;font-size:13px' }, 'From ~500 m to ~50 nm is a zoom of about 10,000,000,000× (10¹⁰). Click a row to revisit that level.')));
    pScale.appendChild(h('div', { class: 'af-plain', html: '<b>The one idea to keep:</b> at every level, <b>moving data costs more energy and time than computing on it</b>. HBM sits next to the GPU die, NVLink keeps 72 GPUs on copper, and CPO puts the optics next to the switch die, all for the same reason: shorter electrical paths, fewer conversions, less energy per bit.' }));
    pScale.appendChild(h('div', { class: 'callout', html: 'Next comes the <b>appendix</b>: four chapters that go deeper into the AI factory, network topologies, GPUs, and how AI jobs use the network. Keep pressing Next.' }));

    // appendix chapters (content in factory-appendix.js)
    const APX = C.factoryAppendix || [];
    const apxCleanups = [];
    APX.forEach((ch, i) => {
      const p = page(ch.id);
      p.appendChild(h('div', { class: 'af-apx-head' }, h('span', { class: 'af-apx-tag' }, 'Appendix ' + String.fromCharCode(65 + i)), h('h2', { class: 'af-ph' }, ch.title)));
      if (ch.lead) p.appendChild(h('p', { class: 'h-sub', html: ch.lead }));
      const body = h('div', { class: 'af-apx' }); p.appendChild(body);
      body.innerHTML = ch.html;
      if (ch.mount) { const c = ch.mount(body); if (typeof c === 'function') apxCleanups.push(c); }
    });

    // finish
    const pDone = page('done');
    pDone.appendChild(h('div', { class: 'af-hero' },
      h('div', { class: 'af-eyebrow' }, 'Course complete'),
      h('h1', { html: 'You went from a <em>gigawatt</em> to a <em>transistor</em>' }),
      h('ul', { class: 'af-takeaways', html:
        '<li>An AI factory turns <b>power into tokens</b>; its output is limited by power, cooling and how fast GPUs can talk.</li>' +
        '<li>Inside a rack GPUs talk over <b>copper NVLink</b>; between racks they talk over <b>fiber</b> through a <b>leaf/spine fat tree</b>.</li>' +
        '<li>Training stops at the <b>slowest message</b>: one bad link stalls thousands of GPUs, so network reliability is critical.</li>' +
        '<li>A GPU is <b>two dies + HBM</b>; each die is a grid of <b>SMs</b>; each SM has <b>Tensor Cores</b> that do matrix math made of gates made of transistors.</li>' +
        '<li><b>Moving bits costs far more energy than computing on them</b>: femtojoules per gate flip vs ~15–20 pJ per bit through a pluggable optic.</li>' +
        '<li><b>CPO switches</b> put the optics in the switch package: ~3.5× better power efficiency, 4× fewer lasers, 10× better resiliency ' + B('nv') + '.</li>' }),
      h('div', { class: 'af-cta' },
        h('button', { class: 'btn primary', onclick: () => C.go('architecture') }, 'Continue: Architecture Explorer tour →'),
        h('button', { class: 'btn', onclick: () => goId('start') }, '↺ Restart the course'))));
    pDone.appendChild(h('div', { class: 'callout warn', html: 'Numbers marked ' + B('nv') + ' are NVIDIA public announcements (GB200 NVL72, Blackwell, Quantum-X / Spectrum-X Photonics). ' + B('typ') + ' are industry-typical orders of magnitude for intuition, and ' + B('est') + ' are simple model estimates. Diagrams are simplified illustrations, not floor plans or die photos.' }));

    // ------------------------------------------------ step list
    const STEPS = [{ id: 'start', page: 'start', title: 'Welcome', ch: 'Start' }]
      .concat(LV.map((l, i) => ({ id: l.id, page: '__level', lvl: i, title: l.title, ch: 'Zoom in' })))
      .concat([
        { id: 'networks', page: 'networks', title: 'The four networks', ch: 'Put it together' },
        { id: 'journey', page: 'journey', title: 'One piece of data\'s journey', ch: 'Put it together' },
        { id: 'savings', page: 'savings', title: 'What CPO saves', ch: 'Put it together' },
        { id: 'scale', page: 'scale', title: 'Recap: the scale of it all', ch: 'Put it together' }])
      .concat(APX.map((a, i) => ({ id: a.id, page: a.id, title: 'Appendix ' + String.fromCharCode(65 + i) + ': ' + a.short, ch: 'Appendix' })))
      .concat([{ id: 'done', page: 'done', title: 'Course complete', ch: 'Finish' }]);
    const SIDX = {}; STEPS.forEach((s2, i) => { SIDX[s2.id] = i; });

    const dots = STEPS.map((s2, i) => {
      const d = h('button', { class: 'af-dot ch-' + s2.ch.replace(/\W+/g, '').toLowerCase(), title: (i + 1) + '. ' + s2.title, onclick: () => goStep(i) });
      if (i && STEPS[i - 1].ch !== s2.ch) barTrack.appendChild(h('span', { class: 'af-gap' }));
      barTrack.appendChild(d); return d;
    });
    let lastCh = '';
    STEPS.forEach((s2, i) => {
      if (s2.ch !== lastCh) { toc.appendChild(h('div', { class: 'af-toc-ch' }, s2.ch)); lastCh = s2.ch; }
      toc.appendChild(h('a', { href: '#factory/' + s2.id, onclick: e => { e.preventDefault(); toc.classList.remove('open'); goStep(i); } }, (i + 1) + '. ' + s2.title));
    });

    // ------------------------------------------------ scene engine (levels)
    let cur = -1, lvlCur = -1, scene = null, sceneG = null, anim = null, t0 = performance.now() / 1000;
    const seen = new Set();

    function camT(rect, e) {
      if (!rect || e <= 0) return '';
      const s2 = Math.pow(Math.min(1000 / rect.w, 600 / rect.h), e);
      const cx = C.lerp(500, rect.x + rect.w / 2, e), cy = C.lerp(300, rect.y + rect.h / 2, e);
      return 'translate(500 300) scale(' + s2 + ') translate(' + (-cx) + ' ' + (-cy) + ')';
    }
    function build(i) {
      if (sceneG) sceneG.remove();
      sceneG = S('g', {});
      cam.appendChild(sceneG);
      sceneG.appendChild(S('rect', { x: 0, y: 0, width: 1000, height: 600, fill: K.bg }));
      const content = S('g', {}); sceneG.appendChild(content);
      scene = LV[i].scene(content) || {};
      t0 = performance.now() / 1000;
      (scene.hot || []).forEach(hs => {
        const hg = S('g', { class: 'af-hot' + (hs.go ? ' go' : ''), tabindex: 0, role: 'button', 'aria-label': hs.label });
        hg.appendChild(S('rect', { class: 'hz', x: hs.x, y: hs.y, width: hs.w, height: hs.h, rx: 6 }));
        const ty = hs.inside ? hs.y + 24 : hs.below || hs.y <= 40 ? hs.y + hs.h + 20 : hs.y - 8;
        const label = hs.go ? hs.label : 'Next: ' + LV[IDX[hs.target]].name;
        const lw = label.length * 7.4 + 24;
        const lx = C.clamp(hs.x + hs.w / 2 - lw / 2, 4, 996 - lw);
        hg.appendChild(S('rect', { x: lx, y: ty - 15, width: lw, height: 21, rx: 10, fill: hs.go ? '#3a1a0d' : '#1b2a10', stroke: hs.go ? K.optic : K.acc }));
        hg.appendChild(S('text', { x: lx + lw / 2, y: ty, 'text-anchor': 'middle', 'font-size': 12.5, fill: '#fff', 'font-weight': 600 }, (hs.go ? '' : '🔍 ') + label));
        const act = () => hs.go ? C.go(hs.go) : zoomInto(hs);
        hg.addEventListener('click', act);
        hg.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
        content.appendChild(hg);
      });
    }
    function fillPanel(i) {
      const l = LV[i];
      panel.innerHTML = '';
      panel.appendChild(h('div', { class: 'muted', style: 'font-size:12px;font-family:var(--mono)' }, 'Level ' + (i + 1) + ' of ' + LV.length + ' · ' + l.size));
      panel.appendChild(h('h2', null, l.title));
      panel.appendChild(h('div', { class: 'af-sub' }, l.sub));
      panel.appendChild(h('div', { class: 'af-plain', html: '<b>In plain words:</b> ' + l.plain }));
      panel.appendChild(h('div', { html: l.body }));
      panel.appendChild(h('div', { class: 'af-facts', html: l.facts.map(f => '<div class="af-fact"><b>' + f[0] + '</b><span>' + f[1] + ' ' + B(f[2]) + '</span></div>').join('') }));
      panel.appendChild(h('div', { class: 'af-cpo', html: '<h4>🔗 Connection to the CPO switch</h4><p>' + l.cpoTxt + '</p>' }));
      panel.appendChild(h('div', { class: 'af-more', html: '<h4>A little deeper</h4><div>' + l.more + '</div>' }));
      if (l.links.length) panel.appendChild(h('div', { class: 'af-links' }, h('span', { class: 'muted', style: 'font-size:12.5px;align-self:center' }, 'Optional detours:'), l.links.map(([href, lbl]) => h('a', { class: 'btn', href: '#' + href }, lbl + ' ↗'))));
      C.linkify(panel);
      panel.scrollTop = 0;
    }
    function showLevel(i, how) {
      const prev = lvlCur; lvlCur = i; seen.add(i);
      build(i); fillPanel(i);
      scaleTag.innerHTML = 'scale ≈ <b>' + LV[i].size + '</b> across';
      const dur = REDUCED ? 0 : 0.6;
      if (how === 'out' && prev > i) {
        const back = (scene.hot || []).find(x => x.target === LV[prev].id);
        anim = back ? { from: 1, to: 0, rect: back, t: 0, dur } : { fadeIn: true, t: 0, dur: dur * 0.5 };
      } else anim = { fadeIn: true, t: 0, dur: how === 'in' ? dur * 0.8 : dur * 0.5 };
      applyAnim(0);
    }
    function applyAnim(dt) {
      if (!anim) { cam.setAttribute('transform', ''); sceneG && sceneG.setAttribute('opacity', 1); return; }
      anim.t += dt;
      const k = anim.dur ? C.clamp(anim.t / anim.dur, 0, 1) : 1, e = k * k * (3 - 2 * k);
      if (anim.fadeIn) { cam.setAttribute('transform', 'translate(500 300) scale(' + C.lerp(0.92, 1, e) + ') translate(-500 -300)'); sceneG.setAttribute('opacity', e); }
      else { cam.setAttribute('transform', camT(anim.rect, C.lerp(anim.from, anim.to, e))); sceneG.setAttribute('opacity', anim.to === 1 ? 1 - Math.max(0, e - 0.6) * 2.5 : 1); }
      if (k >= 1) { const done = anim.onDone; anim = null; if (done) done(); else applyAnim(0); }
    }
    function zoomInto(hs) {
      if (anim && !anim.fadeIn) return;
      const target = SIDX[hs.target];
      anim = { from: 0, to: 1, rect: hs, t: 0, dur: REDUCED ? 0 : 0.65, onDone: () => goStep(target, 'in') };
    }

    // ------------------------------------------------ stepping
    function goStep(k, how) {
      k = C.clamp(k, 0, STEPS.length - 1);
      if (k === cur) return;
      const prev = cur; cur = k;
      const st = STEPS[k];
      Object.values(pages).forEach(p => p.classList.toggle('on', p === pages[st.page]));
      if (st.page === '__level') showLevel(st.lvl, how || (prev > k ? 'out' : 'jump'));
      btnPrev.disabled = bottomPrev.disabled = k === 0;
      const nx = STEPS[k + 1];
      btnNext.textContent = nx ? 'Next →' : 'Finish ✓';
      bottomNext.textContent = nx ? 'Next: ' + nx.title + ' →' : 'Go to the Architecture Explorer →';
      barTitle.innerHTML = '<span class="af-ch">' + st.ch + '</span> · Step ' + (k + 1) + ' of ' + STEPS.length + ' · <b>' + C.esc(st.title) + '</b>';
      dots.forEach((d, i) => { d.classList.toggle('on', i === k); d.classList.toggle('done', i < k); });
      try { localStorage.setItem(LAST_KEY, st.id); } catch (e) { /* private mode */ }
      const main = document.getElementById('main');
      if (main && prev !== -1) main.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
      const hash = 'factory/' + st.id;
      if (location.hash.replace(/^#\/?/, '') !== hash) C.go(hash);
    }
    function goId(id) { if (SIDX[id] != null) goStep(SIDX[id]); }
    function step(d) {
      if (d > 0 && cur === STEPS.length - 1) { C.go('architecture'); return; }
      const st = STEPS[cur], nx = STEPS[cur + d];
      if (d > 0 && st.page === '__level' && nx && nx.page === '__level') {
        const hs = (scene.hot || []).find(x => x.target === nx.id);
        if (hs && !REDUCED) { zoomInto(hs); return; }
      }
      goStep(cur + d, d < 0 && st.page === '__level' ? 'out' : undefined);
    }
    function onSub(subId) { const i = SIDX[subId] != null ? SIDX[subId] : 0; if (i !== cur) goStep(i); }
    function onKey(e) {
      if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      else if (e.key === 'ArrowLeft' || (e.key === 'Escape' && !toc.classList.contains('open'))) { if (cur > 0) { e.preventDefault(); step(-1); } }
      else if (e.key === 'Escape') toc.classList.remove('open');
    }
    document.addEventListener('keydown', onKey);

    goStep(SIDX[sub] != null ? SIDX[sub] : 0);
    live = { onSub };

    const stop = C.loop((dt) => {
      dt = Math.max(0, dt);
      const now = performance.now() / 1000;
      applyAnim(dt);
      if (STEPS[cur].page === '__level' && scene && scene.update) scene.update(REDUCED ? 0 : now - t0, REDUCED ? 0 : dt);
      if (STEPS[cur].page === 'journey') jr.update(dt);
    });

    jplay.addEventListener('click', () => { jr.auto = !jr.auto; jplay.textContent = jr.auto ? '⏸ Pause' : '▶ Play'; });
    jr.mount(jlist, jdesc, () => { jr.auto = false; jplay.textContent = '▶ Play'; });

    return () => { stop(); document.removeEventListener('keydown', onKey); apxCleanups.forEach(f => { try { f(); } catch (e) { /* ignore */ } }); live = null; };
  }

  function net(col, tag, name, txt, med) {
    return '<div class="card af-net" style="--nc:' + col + '"><div class="tag">' + tag + '</div><h3>' + name + '</h3><p>' + txt + '</p><div class="med">' + med + '</div></div>';
  }

  function buildJourney(svg) {
    const g = S('g', {}); svg.appendChild(g);
    R(g, 20, 160, 300, 170, { fill: 'rgba(118,185,0,.05)', stroke: '#2f5a12', 'stroke-dasharray': '5 5', rx: 10 });
    T(g, 32, 180, 'RACK A', { fill: K.acc, 'font-size': 11, 'font-weight': 700, 'letter-spacing': 2 });
    R(g, 680, 160, 300, 170, { fill: 'rgba(118,185,0,.05)', stroke: '#2f5a12', 'stroke-dasharray': '5 5', rx: 10 });
    T(g, 692, 180, 'RACK B', { fill: K.acc, 'font-size': 11, 'font-weight': 700, 'letter-spacing': 2 });
    R(g, 360, 12, 280, 135, { fill: 'rgba(255,107,61,.06)', stroke: K.optic, 'stroke-dasharray': '5 5', rx: 10 });
    T(g, 500, 168, 'CPO SWITCH FABRIC', { 'text-anchor': 'middle', fill: K.optic, 'font-size': 11, 'font-weight': 700, 'letter-spacing': 2 });
    const segs = [];
    for (let i = 1; i < JP.length; i++) {
      const a = JP[i - 1], b = JP[i], optical = i >= 5 && i <= 8; // fiber segments
      segs.push(L(g, a[0], a[1], b[0], b[1], { stroke: optical ? K.optic : K.data, 'stroke-width': 3, 'stroke-opacity': .3 }));
    }
    const nodes = JP.map(([x, y, lbl, k], i) => {
      const isCpo = /CPO/.test(lbl);
      const c = O(g, x, y, isCpo ? 16 : 11, { fill: isCpo ? '#3a1a0d' : '#0b1a20', stroke: k === 'o' ? K.optic : K.data, 'stroke-width': 2 });
      T(g, x, y + (y < 100 ? -24 : 32), lbl, { 'text-anchor': 'middle', 'font-size': 12, fill: K.text });
      return c;
    });
    const pulse = O(g, 0, 0, 7, { fill: '#fff', filter: 'drop-shadow(0 0 8px #fff)' });
    const st = { auto: true, step: 0, tStep: 0, u: 0, list: null, desc: null };
    function setStep(s) {
      st.step = s; st.tStep = 0; st.u = 0;
      const [a, b] = JS[s].r;
      segs.forEach((l, i) => { const on = i >= a && i < b; l.setAttribute('stroke-opacity', on ? 1 : (i < a ? 0.55 : 0.18)); l.setAttribute('stroke-width', on ? 5 : 3); });
      nodes.forEach((n, i) => n.setAttribute('filter', i >= a && i <= b ? 'drop-shadow(0 0 8px ' + (JP[i][3] === 'o' ? '#ff6b3d' : '#22d3ee') + ')' : ''));
      if (st.list) [...st.list.children].forEach((li, i) => li.classList.toggle('on', i === s));
      if (st.desc) { st.desc.innerHTML = '<b>Step ' + (s + 1) + ' · ' + JS[s].t + '.</b> ' + JS[s].d; C.linkify(st.desc); }
    }
    st.mount = (list, desc, onManual) => {
      st.list = list; st.desc = desc;
      JS.forEach((s, i) => list.appendChild(h('li', { onclick: () => { onManual(); setStep(i); } }, h('span', { class: 'n' }, String(i + 1)), h('span', { html: '<b>' + s.t + '</b>' }))));
      setStep(0);
    };
    st.update = (dt) => {
      if (REDUCED) dt = 0;
      st.tStep += dt;
      if (st.auto && st.tStep > 4.5) setStep((st.step + 1) % JS.length);
      const [a, b] = JS[st.step].r;
      const pts = JP.slice(a, b + 1).map(p => [p[0], p[1]]);
      if (pts.length < 2) { pulse.setAttribute('cx', pts[0][0]); pulse.setAttribute('cy', pts[0][1]); pulse.setAttribute('r', 7 + 4 * Math.abs(Math.sin(st.tStep * 5))); return; }
      st.u = Math.min(1, st.u + dt / Math.max(1, (b - a)) * 0.6);
      const p = along(pts, st.u >= 1 ? 0.9999 : st.u);
      pulse.setAttribute('r', 7);
      pulse.setAttribute('cx', p[0]); pulse.setAttribute('cy', p[1]);
      if (st.u >= 1) st.u = 0;
    };
    return st;
  }

  function buildCalc() {
    const inN = h('input', { type: 'range', min: 0, max: 100, step: 1, value: 50 });
    const outN = h('output');
    const inP = h('input', { type: 'range', min: 8, max: 25, step: 0.5, value: 15 });
    const outP = h('output');
    let k = 144;
    const segBtns = [[144, 'Quantum-X Photonics · 144 × 800G'], [512, 'Spectrum-X Photonics · 512 × 800G']].map(([v, lbl]) => {
      const b = h('button', { class: 'btn' + (v === k ? ' active' : ''), onclick: () => { k = v; segBtns.forEach(x => x.classList.toggle('active', x === b)); upd(); } }, lbl);
      return b;
    });
    const out = h('div', { class: 'af-out' });
    const bars = h('div', { class: 'af-bars' });
    const note = h('div', { class: 'callout' });
    const left = h('div', { class: 'card' },
      h('h3', { style: 'margin-top:0' }, 'Your AI factory'),
      h('div', { class: 'slider-row' }, h('label', null, 'GPUs (one 800G port each)'), inN, outN),
      h('div', { style: 'margin-top:10px', class: 'muted' }, 'Switch used for leaf & spine:'),
      h('div', { class: 'af-seg' }, segBtns),
      h('div', { class: 'slider-row' }, h('label', { html: 'Pluggable 800G transceiver power ' + B('typ') }), inP, outP),
      h('p', { class: 'muted', style: 'font-size:12.5px', html: 'CPO switch ports use 3.5× less optics power ' + B('nv') + ' and 4× fewer lasers ' + B('nv') + '. In this model the NIC end of each GPU link stays a pluggable transceiver, and switch-to-switch links become CPO at both ends.' }));
    const right = h('div', { class: 'card' }, out, bars, note);
    const el = h('div', { class: 'af-calc' }, left, right);
    const nice = n => n >= 1e5 ? Math.round(n / 1e4) * 1e4 : n >= 1e4 ? Math.round(n / 1e3) * 1e3 : Math.round(n / 100) * 100;
    const num = n => Math.round(n).toLocaleString('en-US');
    const MW = w => (w / 1e6 >= 10 ? (w / 1e6).toFixed(0) : (w / 1e6).toFixed(2)) + ' MW';
    function upd() {
      const N = nice(Math.pow(10, 3 + 3 * inN.value / 100));
      const Pw = +inP.value;
      outN.textContent = num(N); outP.textContent = Pw + ' W';
      let tiers, sw;
      if (N <= k) { tiers = 1; sw = 1; }
      else if (N <= k * k / 2) { tiers = 2; sw = Math.ceil(2 * N / k) + Math.ceil(N / k); }
      else { tiers = 3; sw = 2 * Math.ceil(2 * N / k) + Math.ceil(N / k); }
      const links = tiers * N;
      const ends = 2 * links;
      const plugW = ends * Pw;
      const swEnds = ends - N; // all ends except the NIC side
      const cpoW = N * Pw + swEnds * Pw / 3.5;
      const save = plugW - cpoW;
      const gpuEq = save / 1200;
      const lasPlug = swEnds * 4, lasCpo = swEnds * 4 / 4;
      out.innerHTML =
        fact(tiers + '-tier', 'fat tree (' + (tiers === 1 ? 'single switch' : tiers === 2 ? 'leaf + spine' : 'leaf + spine + core') + ')', 'typ') +
        fact(num(sw), 'CPO switches', 'est') +
        fact(num(links), 'optical links (fibers)', 'est') +
        fact(num(swEnds), 'switch-side optical ports', 'est') +
        fact(MW(save), 'optics power saved by CPO', 'est') +
        fact('≈ ' + num(gpuEq), 'more GPUs that power could run (~1.2 kW each)', 'est');
      const max = plugW;
      bars.innerHTML =
        bar('All pluggable', plugW, max, 'var(--muted)', MW(plugW)) +
        bar('CPO switches', cpoW, max, 'var(--optic)', MW(cpoW)) +
        bar('Lasers (pluggable)', lasPlug, lasPlug, 'var(--muted)', num(lasPlug)) +
        bar('Lasers (CPO)', lasCpo, lasPlug, 'var(--optic)', num(lasCpo));
      note.innerHTML = (N > k * k * k / 4 ? '<b>Note:</b> this is beyond a 3-tier fat tree of this switch; real designs add tiers or split into parallel "planes". ' : '') +
        'Every extra tier adds another full set of ' + num(N) + ' links, which is why <b>high-radix switches</b> (more ports, fewer tiers) and <b>cheaper, cooler optics per port</b> (CPO) both matter so much. Fewer lasers and connectors per link also means fewer link flaps that stall the whole job ' + B('nv') + ' 10× resiliency claim.';
    }
    function fact(v, l, tag) { return '<div class="af-fact"><b>' + v + '</b><span>' + l + ' ' + B(tag) + '</span></div>'; }
    function bar(l, v, max, col, txt) { return '<div class="af-bar"><span>' + l + '</span><div class="tr"><i style="width:' + (100 * v / max).toFixed(1) + '%;background:' + col + '"></i></div><output>' + txt + '</output></div>'; }
    inN.addEventListener('input', upd); inP.addEventListener('input', upd);
    upd();
    return { el };
  }

  C.registerSection({
    id: 'factory', title: 'AI Factory Course', icon: '🏭', order: 8, render,
    onSubRoute(sub) { if (live) live.onSub(sub); }
  });
})();
