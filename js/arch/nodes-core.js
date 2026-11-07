/* CPO Switch Academy — Architecture nodes: system, chassis, package, ASIC & electrical core (owner: Agent A).
 * Schema: see CONTRACT.md. Scenes use the engine api documented at the top of js/arch/engine.js. */
(function () {
  'use strict';
  const C = window.CPO;
  if (!C || !C.arch) return;
  const B = k => C.badge(k);
  const T = (t, l) => C.tip(t, l);

  C.addGlossary({
    'SerDes': { full: 'Serializer / Deserializer', def: 'High-speed PHY that converts wide parallel on-chip data to one fast serial lane (and back), incl. equalization and clock recovery.', cat: 'electrical' },
    'PAM4': { full: '4-level Pulse Amplitude Modulation', def: '2 bits per symbol (levels 0,1,2,3). 200G lanes run ~106 GBd PAM4. Costs ~9.5 dB SNR vs NRZ at the same symbol rate.', cat: 'electrical' },
    'FFE': { full: 'Feed-Forward Equalizer', def: 'FIR filter (taps on past/future symbols) that cancels ISI; in the TX (pre-emphasis) or RX DSP.', cat: 'electrical' },
    'CTLE': { full: 'Continuous-Time Linear Equalizer', def: 'Analog high-pass peaking stage that boosts high frequencies attenuated by the channel.', cat: 'electrical' },
    'DFE': { full: 'Decision-Feedback Equalizer', def: 'Subtracts post-cursor ISI using already-decided symbols; does not amplify noise but can propagate errors.', cat: 'electrical' },
    'CDR': { full: 'Clock and Data Recovery', def: 'Loop that extracts sampling phase/frequency from the received data.', cat: 'electrical' },
    'PLL': { full: 'Phase-Locked Loop', def: 'Feedback loop locking a VCO to a reference; generates the low-jitter SerDes clocks.', cat: 'electrical' },
    'VCO': { full: 'Voltage-Controlled Oscillator', def: 'Oscillator whose frequency is set by a control voltage (LC tank for low jitter).', cat: 'electrical' },
    'PFD': { full: 'Phase-Frequency Detector', def: 'Compares reference and divided VCO edges; drives the charge pump.', cat: 'electrical' },
    'ISI': { full: 'Inter-Symbol Interference', def: 'Energy of one symbol smeared into neighbors by channel bandwidth limits/reflections.', cat: 'electrical' },
    'UI': { full: 'Unit Interval', def: 'One symbol period; ~9.4 ps at 106.25 GBd.', cat: 'electrical' },
    'ADC': { full: 'Analog-to-Digital Converter', def: 'In 200G receivers: 6–8 bit, >100 GS/s time-interleaved SAR array feeding DSP equalization.', cat: 'electrical' },
    'DSP': { full: 'Digital Signal Processor', def: 'Digital equalization/CDR/FEC; in pluggables also the retimer chip inside the module.', cat: 'electrical' },
    'LR': { full: 'Long Reach (electrical SerDes)', def: 'SerDes class for ~30–40+ dB channels (backplanes, long host traces).', cat: 'electrical' },
    'XSR': { full: 'Extra Short Reach', def: 'SerDes class for mm-scale on-package links (few dB loss), much lower power.', cat: 'electrical' },
    'TSV': { full: 'Through-Silicon Via', def: 'Copper-filled vertical via through a thinned Si die/interposer (≈5–10 µm Ø).', cat: 'packaging' },
    'C4': { full: 'Controlled-Collapse Chip Connection', def: 'Solder flip-chip bump, ~100–200 µm pitch, joining die/interposer to substrate.', cat: 'packaging' },
    'RDL': { full: 'Redistribution Layer', def: 'Fine-pitch metal routing layers on an interposer/die/fan-out package.', cat: 'packaging' },
    'CTE': { full: 'Coefficient of Thermal Expansion', def: 'ppm/K; Si ≈2.6, Cu ≈17, organic substrate ≈10–17. Mismatch → warpage & joint fatigue.', cat: 'packaging' },
    'BGA': { full: 'Ball Grid Array', def: 'Array of solder balls (~1 mm pitch) joining package substrate to the PCB.', cat: 'packaging' },
    'ABF': { full: 'Ajinomoto Build-up Film', def: 'Dielectric used for build-up layers of organic package substrates.', cat: 'packaging' },
    'SoIC': { full: 'System on Integrated Chips (TSMC)', def: 'TSMC 3D stacking with hybrid (Cu–Cu) bonding; used to stack EIC on PIC in COUPE.', cat: 'packaging' },
    'COUPE': { full: 'Compact Universal Photonic Engine (TSMC)', def: 'TSMC silicon-photonics engine platform: EIC stacked on PIC with SoIC.', cat: 'optics' },
    'SRAM': { full: 'Static Random-Access Memory', def: '6-transistor bistable cell memory; fast, on-die, used for packet buffers and tables.', cat: 'electrical' },
    'TCAM': { full: 'Ternary Content-Addressable Memory', def: 'Memory matching 0/1/X per bit in parallel — longest-prefix/ACL lookups in one cycle.', cat: 'electrical' },
    'VOQ': { full: 'Virtual Output Queue', def: 'Per-(input,output) queues avoiding head-of-line blocking.', cat: 'electrical' },
    'ECN': { full: 'Explicit Congestion Notification', def: 'Switch marks packets when queues exceed a threshold so senders slow down.', cat: 'network' },
    'PFC': { full: 'Priority Flow Control (802.1Qbb)', def: 'Per-priority PAUSE frames for lossless Ethernet (RoCE).', cat: 'network' },
    'MAU': { full: 'Match-Action Unit', def: 'One pipeline stage: table lookup (SRAM/TCAM) + action ALUs that edit header fields.', cat: 'electrical' },
    'FinFET': { full: 'Fin Field-Effect Transistor', def: 'Tri-gate transistor: gate wraps a thin vertical Si fin on 3 sides.', cat: 'device' },
    'GAA': { full: 'Gate-All-Around (nanosheet) transistor', def: 'Stacked horizontal Si nanosheets fully wrapped by the gate — best electrostatics (N2-class).', cat: 'device' },
    'CPP': { full: 'Contacted Poly Pitch', def: 'Gate pitch of a logic process; ~48–51 nm in N5/N3-class nodes.', cat: 'device' },
    'DIBL': { full: 'Drain-Induced Barrier Lowering', def: 'Short-channel effect: drain voltage lowers the source barrier → Vt drops, leakage rises.', cat: 'device' },
    'PDN': { full: 'Power Delivery Network', def: 'VRM → planes → BGA → substrate → bumps → on-die grid; must hold target impedance.', cat: 'power' },
    'VRM': { full: 'Voltage Regulator Module', def: 'Multiphase buck converters next to the package producing ~0.7–0.9 V core rails at hundreds of A.', cat: 'power' },
    'ELS': { full: 'External Laser Source', def: 'Front-panel-serviceable CW laser module feeding optical engines through fiber.', cat: 'optics' },
    'OE': { full: 'Optical Engine', def: 'Silicon-photonics transceiver chiplet (EIC on PIC) co-packaged with the switch ASIC.', cat: 'optics' },
    'MPO': { full: 'Multi-fiber Push-On connector', def: 'Ribbon connector with 8–24+ fibers in one ferrule.', cat: 'optics' },
    'KP4': { full: 'RS(544,514) Reed-Solomon FEC', def: 'Standard Ethernet/IB FEC for 50–200G PAM4 lanes; pre-FEC BER threshold ≈2.4e-4.', cat: 'electrical' },
    'TIM': { full: 'Thermal Interface Material', def: 'Layer between die and lid/cold plate; often the dominant conduction resistance.', cat: 'thermal' },
    'KOZ': { full: 'Keep-Out Zone', def: 'Region around a TSV where stress-sensitive transistors are not placed.', cat: 'packaging' },
    'EM': { full: 'Electromigration', def: 'Metal atoms pushed by electron wind at high current density → voids/opens over time.', cat: 'reliability' },
    'BER': { full: 'Bit Error Ratio', def: 'Errored bits / total bits. Pre-FEC ~1e-5…2.4e-4; post-FEC ≤1e-13…1e-15.', cat: 'electrical' },
    'SNR': { full: 'Signal-to-Noise Ratio', def: 'Signal power over noise power; sets achievable BER.', cat: 'electrical' },
    'MLSD': { full: 'Maximum-Likelihood Sequence Detection', def: 'Viterbi-style detector used in DSP receivers instead of/after DFE.', cat: 'electrical' },
    'RoCE': { full: 'RDMA over Converged Ethernet', def: 'RDMA transport on Ethernet; needs low loss / congestion control.', cat: 'network' }
  });

  // ---------------------------------------------------------------- helpers
  function H(api) {
    const A = (tag, attrs, p) => api.add(tag, attrs, p);
    const G = (dom, p, attrs) => A('g', Object.assign({ 'data-domain': dom || null }, attrs || {}), p);
    const R = (p, x, y, w, h, o) => {
      o = o || {};
      return A('rect', Object.assign({ x: x, y: y, width: w, height: h, rx: o.rx != null ? o.rx : 6, fill: o.fill || 'url(#g-panel)', stroke: o.stroke || api.rgba('line', 1), 'stroke-width': o.sw || 1 }, o.a || {}), p);
    };
    const P = (p, d, o) => { o = o || {}; return A('path', Object.assign({ d: d, fill: o.fill || 'none', stroke: o.stroke || api.rgba('muted', 0.6), 'stroke-width': o.sw || 1.5 }, o.a || {}), p); };
    const L = (x, y, t, o) => api.label(x, y, t, o || {});
    const flow = (p, d, o) => {
      o = o || {};
      const path = A('path', { d: d, fill: 'none', stroke: o.stroke || api.rgba(o.color || 'data', o.alpha != null ? o.alpha : 0.35), 'stroke-width': o.sw || 1.5, 'stroke-dasharray': o.dash || null, 'marker-end': o.arrow ? 'url(#arrow-' + (o.color || 'data') + ')' : null }, p);
      if (o.count !== 0) api.particlesAlong(path, { color: o.color || 'data', count: o.count || 6, speed: o.speed || 110, r: o.r || 2.4, shape: o.shape, reverse: o.reverse, dashLen: o.dashLen, jitter: o.jitter });
      return path;
    };
    // labeled block
    const box = (p, x, y, w, h, title, sub, dom, o) => {
      o = o || {};
      const gg = G(dom, p);
      R(gg, x, y, w, h, { fill: o.fill || 'url(#g-panel)', stroke: api.rgba(dom || 'line', o.alpha != null ? o.alpha : 0.85), sw: o.sw || 1.3, rx: o.rx != null ? o.rx : 8 });
      if (o.bar !== false) R(gg, x, y, 4, h, { fill: api.color(dom || 'muted'), stroke: 'none', rx: 2 });
      const fs = o.fs || 14;
      L(x + w / 2, y + (sub ? h / 2 - 2 : h / 2 + fs * 0.35), title, { parent: gg, anchor: 'middle', size: fs, weight: 700 });
      if (sub) L(x + w / 2, y + h / 2 + fs * 0.95, sub, { parent: gg, anchor: 'middle', size: o.sfs || 11, color: 'muted' });
      return gg;
    };
    return { A, G, R, P, L, flow, box };
  }

  // PAM4 eye diagram with persistence. o: {sigma(fn|num), isi(fn|num), jitter, color, domain, traces, rate, title}
  function eye(api, parent, x, y, w, h, o) {
    o = o || {};
    const g = api.add('g', { 'data-domain': o.domain || 'data' }, parent);
    api.add('rect', { x: x, y: y, width: w, height: h, rx: 6, fill: 'rgba(3,6,9,.9)', stroke: api.rgba('line', 1) }, g);
    for (let i = 1; i < 4; i++) api.add('line', { x1: x, x2: x + w, y1: y + h * i / 4, y2: y + h * i / 4, stroke: api.rgba('line', 0.5), 'stroke-width': 0.5 }, g);
    const col = api.color(o.color || 'data'), N = o.traces || 34, lines = [];
    for (let i = 0; i < N; i++) lines.push(api.add('polyline', { fill: 'none', stroke: col, 'stroke-width': 1, opacity: 0.3 }, g));
    const lv = [-1, -1 / 3, 1 / 3, 1];
    const val = v => (typeof v === 'function' ? v() : v || 0);
    function trace() {
      const sig = val(o.sigma != null ? o.sigma : 0.04), isi = val(o.isi), jit = val(o.jitter) * C.randn();
      const a = [0, 1, 2, 3, 4].map(() => lv[(Math.random() * 4) | 0]);
      const n0 = C.randn() * sig, pts = [], S = 20;
      for (let j = 0; j <= S * 2; j++) {
        const u = j / S - 0.5 + jit, idx = Math.floor(u), f = u - idx;
        const s0 = a[idx + 1] != null ? a[idx + 1] : 0, s1 = a[idx + 2] != null ? a[idx + 2] : 0, sp = a[idx] != null ? a[idx] : 0;
        const sm = 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, f)));
        let v = s0 + (s1 - s0) * sm + isi * sp * (1 - sm) + isi * s0 * sm * 0.6 + n0 + C.randn() * sig * 0.25;
        v = Math.max(-1.6, Math.min(1.6, v));
        pts.push((x + ((j / S) / 2) * w).toFixed(1) + ',' + (y + h / 2 - v * h * 0.36).toFixed(1));
      }
      return pts.join(' ');
    }
    lines.forEach(l => l.setAttribute('points', trace()));
    let k = 0;
    api.loop(() => { for (let r = 0; r < (o.rate || 2); r++) { lines[k].setAttribute('points', trace()); k = (k + 1) % N; } });
    if (o.title) api.label(x + 6, y + 14, o.title, { parent: g, size: 11, color: 'muted' });
    return g;
  }

  // small plot frame; returns mapping fns
  function plot(api, parent, x, y, w, h, o) {
    o = o || {};
    const g = api.add('g', { 'data-domain': o.domain || null }, parent);
    api.add('rect', { x: x, y: y, width: w, height: h, rx: 6, fill: 'rgba(3,6,9,.82)', stroke: api.rgba('line', 1) }, g);
    for (let i = 1; i < 5; i++) {
      api.add('line', { x1: x + w * i / 5, x2: x + w * i / 5, y1: y, y2: y + h, stroke: api.rgba('line', 0.45), 'stroke-width': 0.5 }, g);
      api.add('line', { x1: x, x2: x + w, y1: y + h * i / 5, y2: y + h * i / 5, stroke: api.rgba('line', 0.45), 'stroke-width': 0.5 }, g);
    }
    if (o.title) api.label(x + 8, y + 16, o.title, { parent: g, size: 12, color: 'text', weight: 600 });
    if (o.xl) api.label(x + w - 6, y + h - 6, o.xl, { parent: g, size: 10.5, color: 'muted', anchor: 'end' });
    if (o.yl) api.label(x + 8, y + 32, o.yl, { parent: g, size: 10.5, color: 'muted' });
    const X = (v, a, b) => x + (v - a) / (b - a) * w, Y = (v, a, b) => y + h - (v - a) / (b - a) * h;
    return { g: g, X: X, Y: Y };
  }

  // generic switch box (used in system scene)
  function drawSwitch(api, p, cx, y, w, h, spine) {
    const h_ = H(api);
    const gg = h_.G('data', p);
    h_.R(gg, cx - w / 2, y, w, h, { fill: 'url(#g-metal)', stroke: api.rgba('accent', 0.8), sw: 1.2, rx: 5 });
    api.add('rect', { x: cx - 11, y: y + h / 2 - 9, width: 22, height: 18, rx: 3, fill: 'url(#g-die)', stroke: api.color('accent'), filter: 'url(#glow)' }, gg);
    const leds = [];
    for (let i = 0; i < 6; i++) {
      leds.push(api.add('rect', { x: cx - w / 2 + 6 + i * 6, y: y + h - 8, width: 3.5, height: 3.5, fill: api.color('accent'), opacity: 0.6 }, gg));
      leds.push(api.add('rect', { x: cx + w / 2 - 9 - i * 6, y: y + h - 8, width: 3.5, height: 3.5, fill: api.color(i % 2 ? 'accent' : 'optics'), opacity: 0.6 }, gg));
    }
    api.loop((dt, t) => { for (let i = 0; i < leds.length; i++) leds[i].setAttribute('opacity', (Math.sin(t * (6 + i % 5) + i * 1.7) > 0.2 ? 0.95 : 0.25)); });
    if (spine) h_.L(cx, y - 6, 'CPO spine', { parent: gg, anchor: 'middle', size: 10.5, color: 'muted' });
    return gg;
  }

  // ================================================================ SYSTEM
  function sceneSystem(g, api) {
    const { A, G, R, L, flow } = H(api);
    const rx = i => 113 + i * 108, sx = [158, 308, 458, 608];
    // row labels
    [['SPINE', 121], ['LEAF', 277], ['GPU RACKS', 480]].forEach(([t, y]) => L(36, y, t, { anchor: 'middle', size: 11, color: 'muted', weight: 700, cls: 'arch-vert' }).setAttribute('transform', 'rotate(-90 36 ' + y + ')'));
    // fibers rack→leaf (behind)
    const fib = G('optics', g);
    for (let r = 0; r < 6; r++) for (let l = 0; l < 6; l++) {
      const x1 = rx(r), x2 = rx(l);
      const p = A('path', { d: 'M' + x1 + ' 398 C ' + x1 + ' 345, ' + x2 + ' 345, ' + x2 + ' 293', fill: 'none', stroke: api.rgba('optics', 0.15), 'stroke-width': 1 }, fib);
      if ((r + l) % 2 === 0) api.particlesAlong(p, { color: 'optics', count: 2, speed: 95 + ((r * 7 + l * 3) % 5) * 16, shape: 'dash', r: 1.6, dashLen: 9, reverse: (r + l) % 4 === 0 });
    }
    for (let l = 0; l < 6; l++) for (let s = 0; s < 4; s++) {
      const x1 = rx(l), x2 = sx[s];
      const p = A('path', { d: 'M' + x1 + ' 262 C ' + x1 + ' 205, ' + x2 + ' 200, ' + x2 + ' 139', fill: 'none', stroke: api.rgba('optics', 0.2), 'stroke-width': 1.2 }, fib);
      api.particlesAlong(p, { color: 'optics', count: 2, speed: 120 + ((l * 5 + s * 3) % 4) * 18, shape: 'dash', r: 1.7, dashLen: 10, reverse: (l + s) % 2 === 1 });
    }
    // spines + leaves
    sx.forEach(x => drawSwitch(api, g, x, 104, 112, 34, true));
    for (let l = 0; l < 6; l++) drawSwitch(api, g, rx(l), 262, 94, 30);
    L(383, 92, 'Spine tier — every leaf connects to every spine (non-blocking Clos / fat-tree)', { anchor: 'middle', size: 11.5, color: 'muted' });
    L(383, 318, 'Leaf tier — CPO switches; front-panel fibers instead of pluggable transceivers', { anchor: 'middle', size: 11.5, color: 'muted' });
    // racks
    const twinkle = [];
    for (let r = 0; r < 6; r++) {
      const gg = G('data', g), x = rx(r) - 43;
      R(gg, x, 400, 86, 160, { fill: 'url(#g-metal)', stroke: api.rgba('mechanical', 0.6), rx: 4 });
      for (let k = 0; k < 10; k++) {
        R(gg, x + 6, 408 + k * 14.6, 74, 10.5, { fill: k === 4 || k === 5 ? '#1d1730' : '#121a26', stroke: 'none', rx: 2 });
        if (k === 4 || k === 5) { A('rect', { x: x + 12, y: 411 + k * 14.6, width: 62, height: 4, rx: 2, fill: api.rgba('control', 0.55) }, gg); }
        else for (let q = 0; q < 4; q++) twinkle.push(A('rect', { x: x + 12 + q * 17, y: 411 + k * 14.6, width: 10, height: 4.5, rx: 1, fill: api.color('accent'), opacity: 0.5 }, gg));
      }
    }
    api.loop((dt, t) => { for (let i = 0; i < twinkle.length; i++) twinkle[i].setAttribute('opacity', (0.35 + 0.6 * Math.max(0, Math.sin(t * 2.2 + i * 0.77))).toFixed(2)); });
    L(383, 588, 'GPU racks: compute trays (green) + NVLink switch trays (violet) = scale-up domain; NICs fan out to the scale-out fabric', { anchor: 'middle', size: 11, color: 'muted' });

    // right column: stats
    const st = G('data', g);
    R(st, 728, 78, 258, 228, { fill: 'rgba(12,17,24,.92)', stroke: api.rgba('accent', 0.6), rx: 10 });
    L(742, 102, 'NVIDIA CPO switches (public)', { parent: st, size: 13.5, weight: 700, color: 'accent' });
    const facts = [
      ['Quantum-X Photonics (InfiniBand)', '144 × 800 Gb/s = 115 Tb/s, liquid-cooled'],
      ['Spectrum-X Photonics (Ethernet)', '128×800G / 512×200G = 102.4 Tb/s'],
      ['', '512×800G / 2048×200G = 409.6 Tb/s'],
      ['vs pluggable optics', '3.5× power efficiency · 63× signal integrity'],
      ['', '10× resiliency · 4× fewer lasers']
    ];
    let yy = 126;
    for (const [a, b] of facts) {
      if (a) { L(742, yy, a, { parent: st, size: 11.5, color: 'muted' }); yy += 16; }
      L(742, yy, b, { parent: st, size: 12.5, color: 'text', mono: false }); yy += 22;
    }
    L(742, 296, '200G/lane SerDes · 1.6T silicon-photonics engines', { parent: st, size: 11, color: 'muted' });

    // why-cpo card
    const wc = G('optics', g);
    R(wc, 728, 322, 258, 238, { fill: 'rgba(12,17,24,.92)', stroke: api.rgba('optics', 0.6), rx: 10 });
    L(742, 346, 'Why co-packaged optics?', { parent: wc, size: 13.5, weight: 700, color: 'optics' });
    L(742, 370, 'Pluggable', { parent: wc, size: 11, color: 'muted' });
    R(wc, 742, 378, 30, 20, { fill: 'url(#g-die)', stroke: api.color('accent'), rx: 3 });
    const longp = flow(wc, 'M772 388 C 790 370, 800 406, 818 388 S 846 370, 864 388 S 890 406, 900 388', { color: 'data', count: 4, speed: 60, alpha: 0.5 });
    longp.setAttribute('stroke-dasharray', '3 2');
    R(wc, 900, 378, 24, 20, { fill: '#2a1d10', stroke: api.color('warn'), rx: 3 });
    L(912, 392, 'DSP', { parent: wc, size: 8, anchor: 'middle', color: 'warn' });
    R(wc, 928, 378, 44, 20, { fill: '#2a140c', stroke: api.color('optics'), rx: 3 });
    L(950, 392, 'optics', { parent: wc, size: 8.5, anchor: 'middle', color: 'optics' });
    L(742, 420, 'CPO', { parent: wc, size: 11, color: 'muted' });
    R(wc, 742, 428, 30, 20, { fill: 'url(#g-die)', stroke: api.color('accent'), rx: 3 });
    flow(wc, 'M772 438 H 790', { color: 'data', count: 2, speed: 30 });
    R(wc, 790, 428, 34, 20, { fill: '#2a140c', stroke: api.color('optics'), rx: 3 });
    L(807, 442, 'OE', { parent: wc, size: 9, anchor: 'middle', color: 'optics' });
    flow(wc, 'M824 438 H 972', { color: 'optics', count: 6, speed: 120, shape: 'dash', alpha: 0.4 });
    // energy bars
    L(742, 474, 'Optics energy / bit', { parent: wc, size: 11, color: 'muted' });
    R(wc, 742, 482, 230, 12, { fill: '#0a0e13', stroke: 'none', rx: 3 });
    const b1 = R(wc, 742, 482, 0, 12, { fill: api.color('bad'), stroke: 'none', rx: 3 });
    R(wc, 742, 502, 230, 12, { fill: '#0a0e13', stroke: 'none', rx: 3 });
    const b2 = R(wc, 742, 502, 0, 12, { fill: api.color('accent'), stroke: 'none', rx: 3 });
    L(976, 492, '~15–20 pJ/b', { parent: wc, size: 10, anchor: 'end', color: 'text' });
    L(976, 512, '~5 pJ/b', { parent: wc, size: 10, anchor: 'end', color: 'text' });
    L(742, 540, 'click → the full pluggable-vs-CPO story', { parent: wc, size: 11, color: 'accent2' });
    api.loop((dt, t) => { const k = Math.min(1, t / 1.6); const e = 1 - Math.pow(1 - k, 3); b1.setAttribute('width', (230 * 0.95 * e).toFixed(1)); b2.setAttribute('width', (230 * 0.27 * e).toFixed(1)); });
  }

  // ================================================================ WHY CPO
  function sceneWhy(g, api) {
    const { A, G, R, L, flow, box } = H(api);
    // lane titles
    L(40, 92, 'PLUGGABLE PATH', { size: 13, weight: 700, color: 'bad' });
    L(40, 340, 'CO-PACKAGED PATH', { size: 13, weight: 700, color: 'accent' });
    // --- pluggable lane
    const pl = G('data', g);
    box(pl, 40, 110, 110, 70, 'Switch ASIC', 'LR SerDes', 'data');
    const tr = flow(pl, 'M150 145 C 185 115, 205 175, 240 145 S 295 115, 330 145 S 385 175, 420 145 S 470 120, 500 145', { color: 'data', count: 7, speed: 75, sw: 3, alpha: 0.45 });
    L(325, 196, 'PCB trace 15–30 cm + package + connector', { parent: pl, anchor: 'middle', size: 11.5, color: 'muted' });
    L(325, 212, '≈ 25–40 dB loss @ 53 GHz Nyquist', { parent: pl, anchor: 'middle', size: 12, color: 'warn', weight: 700 });
    tr.setAttribute('stroke-linecap', 'round');
    R(pl, 500, 112, 12, 66, { fill: 'url(#g-gold)', stroke: 'none', rx: 2 });
    L(506, 104, 'cage', { parent: pl, anchor: 'middle', size: 10, color: 'muted' });
    box(pl, 520, 110, 110, 70, 'Retimer DSP', 'CDR · FFE · FEC?', 'data', { fill: '#1d150c' });
    flow(pl, 'M630 145 H 660', { color: 'data', count: 2, speed: 40 });
    box(G('optics', g), 660, 110, 110, 70, 'Driver + laser', 'EML / VCSEL / SiPh', 'optics', { fill: '#24120b' });
    flow(G('optics', g), 'M770 145 H 960', { color: 'optics', count: 8, speed: 150, shape: 'dash', alpha: 0.4 });
    L(865, 135, 'fiber', { anchor: 'middle', size: 11, color: 'optics' });
    eye(api, g, 830, 175, 130, 80, { sigma: 0.11, isi: 0.28, jitter: 0.06, title: 'host-side eye' });

    // --- CPO lane
    const cp = G('data', g);
    box(cp, 40, 360, 110, 70, 'Switch ASIC', 'XSR-class SerDes', 'data');
    flow(cp, 'M150 395 H 200', { color: 'data', count: 3, speed: 40, sw: 3, alpha: 0.5 });
    L(175, 448, 'mm-scale', { parent: cp, anchor: 'middle', size: 11, color: 'muted' });
    L(175, 463, '≈ few dB', { parent: cp, anchor: 'middle', size: 12, color: 'good', weight: 700 });
    const oe = G('optics', g);
    box(oe, 200, 360, 140, 70, 'Optical engine', 'EIC on PIC · MRM', 'optics', { fill: '#24120b' });
    flow(oe, 'M340 395 H 960', { color: 'optics', count: 12, speed: 160, shape: 'dash', alpha: 0.45 });
    L(650, 385, 'detachable fiber → front panel', { anchor: 'middle', size: 11.5, color: 'optics' });
    // ELS feeding CW light
    const els = G('optics', g);
    box(els, 220, 500, 120, 50, 'ELS (front panel)', 'CW laser, serviceable', 'optics', { fill: '#2a1408', fs: 12.5 });
    flow(els, 'M270 500 V 432', { color: 'optics', count: 4, speed: 50, r: 2, alpha: 0.5, dash: '3 3', reverse: false });
    L(350, 478, 'CW light in via PM fiber — laser kept away from the hot ASIC', { parent: els, size: 11, color: 'muted' });
    eye(api, g, 830, 425, 130, 80, { sigma: 0.035, isi: 0.04, jitter: 0.015, title: 'on-package eye', color: 'accent' });

    // --- comparison bars (middle)
    const cmp = G('power', g);
    R(cmp, 400, 230, 400, 118, { fill: 'rgba(12,17,24,.9)', stroke: api.rgba('line', 1), rx: 10 });
    L(414, 252, 'Energy per bit, electrical + optical I/O (illustrative)', { parent: cmp, size: 12, weight: 700 });
    const rows = [['Pluggable: LR SerDes + DSP + optics', 20, 'bad'], ['CPO: short-reach SerDes + OE', 5.7, 'accent']];
    const bars = [];
    rows.forEach((r, i) => {
      L(414, 276 + i * 36, r[0], { parent: cmp, size: 11, color: 'muted' });
      R(cmp, 414, 281 + i * 36, 300, 11, { fill: '#0a0e13', stroke: 'none', rx: 3 });
      bars.push([R(cmp, 414, 281 + i * 36, 0, 11, { fill: api.color(r[2]), stroke: 'none', rx: 3 }), r[1]]);
      L(790, 291 + i * 36, (i ? '~5–6' : '~15–25') + ' pJ/b', { parent: cmp, size: 11, anchor: 'end', color: 'text' });
    });
    api.loop((dt, t) => { const e = 1 - Math.pow(1 - Math.min(1, t / 1.5), 3); bars.forEach(([b, v]) => b.setAttribute('width', (300 * v / 25 * e).toFixed(1))); });
    L(600, 568, 'NVIDIA public claims vs pluggables: 3.5× power efficiency · 63× signal integrity · 10× resiliency · 4× fewer lasers · 1.3× faster deployment', { anchor: 'middle', size: 12, color: 'accent' });
  }

  // ================================================================ CHASSIS
  function sceneChassis(g, api) {
    const { A, G, R, P, L, flow } = H(api);
    // chassis outline
    const mech = G('mechanical', g);
    R(mech, 20, 70, 965, 505, { fill: 'rgba(14,19,27,.9)', stroke: api.rgba('mechanical', 0.55), sw: 1.5, rx: 10 });
    A('rect', { x: 20, y: 70, width: 965, height: 505, rx: 10, fill: 'url(#p-dots)', opacity: 0.35 }, mech);
    R(mech, 20, 70, 92, 505, { fill: '#0c1016', stroke: api.rgba('mechanical', 0.5), rx: 8 });
    L(14, 322, 'FRONT PANEL', { parent: mech, size: 10, color: 'muted', anchor: 'middle', weight: 700 }).setAttribute('transform', 'rotate(-90 14 322)');
    L(978, 322, 'REAR', { parent: mech, size: 10, color: 'muted', anchor: 'middle', weight: 700 }).setAttribute('transform', 'rotate(90 978 322)');

    // package geometry
    const PX = 370, PY = 180, PS = 260;
    const oePts = [];
    for (let i = 0; i < 4; i++) {
      oePts.push({ x: PX, y: PY + 40 + i * 60, side: 'L' });
      oePts.push({ x: PX + 40 + i * 60, y: PY, side: 'T' });
      oePts.push({ x: PX + 40 + i * 60, y: PY + PS, side: 'B' });
      oePts.push({ x: PX + PS, y: PY + 40 + i * 60, side: 'R' });
    }

    // ELS modules
    const els = G('optics', g);
    const elsY = [];
    for (let i = 0; i < 6; i++) {
      const y = 84 + i * 31; elsY.push(y + 13);
      R(els, 28, y, 76, 26, { fill: '#22130b', stroke: api.rgba('optics', 0.8), rx: 4 });
      R(els, 30, y + 5, 7, 16, { fill: '#3a2a20', stroke: 'none', rx: 2 });
      A('circle', { cx: 94, cy: y + 13, r: 4, fill: api.color('optics'), filter: 'url(#glow)', class: 'arch-els-led' }, els);
      L(62, y + 17, 'ELS ' + (i + 1), { parent: els, size: 10, anchor: 'middle', color: 'optics' });
    }
    // MPO connectors
    const fp = G('optics', g);
    const mpoY = [];
    for (let r = 0; r < 12; r++) for (let c = 0; c < 2; c++) {
      const x = 30 + c * 38, y = 292 + r * 22;
      R(fp, x, y, 32, 15, { fill: '#141c27', stroke: api.rgba('optics', 0.45), rx: 3 });
      for (let k = 0; k < 4; k++) A('rect', { x: x + 5 + k * 6, y: y + 6, width: 3, height: 3, fill: api.rgba('optics', 0.75) }, fp);
      if (c === 1) mpoY.push(y + 7.5);
    }
    // fiber shuffle: MPO → OEs (modulated light, both directions)
    const fib = G('optics', g);
    oePts.forEach((o, i) => {
      const ym = mpoY[i % 12];
      let d;
      if (o.side === 'L') d = 'M106 ' + ym + ' C 230 ' + ym + ', 250 ' + o.y + ', ' + o.x + ' ' + o.y;
      else if (o.side === 'T') d = 'M106 ' + ym + ' C 220 ' + ym + ', ' + (o.x - 30) + ' ' + (o.y - 60) + ', ' + o.x + ' ' + o.y;
      else if (o.side === 'B') d = 'M106 ' + ym + ' C 220 ' + ym + ', ' + (o.x - 30) + ' ' + (o.y + 60) + ', ' + o.x + ' ' + o.y;
      else { const up = o.y < PY + PS / 2, yb = up ? PY - 14 : PY + PS + 14; d = 'M106 ' + ym + ' C 240 ' + ym + ', 300 ' + yb + ', 400 ' + yb + ' H 640 C 660 ' + yb + ', 660 ' + o.y + ', ' + o.x + ' ' + o.y; }
      const p = A('path', { d: d, fill: 'none', stroke: api.rgba('optics', 0.22), 'stroke-width': 1.2 }, fib);
      api.particlesAlong(p, { color: 'optics', count: 3, speed: 130 + (i % 4) * 20, shape: 'dash', r: 1.6, dashLen: 10, reverse: i % 2 === 0 });
    });
    // ELS CW feed fibers (dotted, steady)
    const cw = G('optics', g);
    elsY.forEach((y, i) => {
      const t = oePts[(i * 2 + 1) % oePts.length];
      const tx = t.side === 'T' ? t.x : PX, ty = t.side === 'T' ? PY : PY + 30 + i * 8;
      const p = A('path', { d: 'M100 ' + y + ' C 220 ' + y + ', 280 ' + (ty - 20) + ', ' + tx + ' ' + ty, fill: 'none', stroke: '#ffb38f', 'stroke-opacity': 0.35, 'stroke-width': 1, 'stroke-dasharray': '2 3' }, cw);
      api.particlesAlong(p, { color: '#ffc9a8', count: 10, speed: 70, r: 1.3, glow: false });
    });
    L(240, 82, 'CW laser light → engines', { size: 10.5, color: 'optics', opacity: 0.85 });
    L(170, 570, 'fiber shuffle: front-panel MPO ↔ optical engines', { size: 10.5, color: 'optics', opacity: 0.85 });

    // VRMs
    const pw = G('power', g);
    const vrms = [];
    for (let i = 0; i < 8; i++) for (const y of [134, 464]) {
      const x = 382 + i * 30;
      R(pw, x, y, 22, 22, { fill: '#1f1c0c', stroke: api.rgba('power', 0.75), rx: 3 });
      vrms.push(A('rect', { x: x + 6, y: y + 6, width: 10, height: 10, rx: 2, fill: api.color('power'), opacity: 0.4 }, pw));
    }
    L(500, 126, 'multiphase VRMs (core ~0.75 V, hundreds of A)', { parent: pw, size: 10.5, anchor: 'middle', color: 'power' });
    // PSU / busbar
    R(pw, 690, 495, 180, 70, { fill: '#1b190c', stroke: api.rgba('power', 0.8), rx: 8 });
    L(780, 520, '48–54 V busbar input', { parent: pw, size: 12.5, anchor: 'middle', weight: 700, color: 'power' });
    L(780, 538, 'hot-swap · 48V→12V/IBC · PMBus', { parent: pw, size: 10.5, anchor: 'middle', color: 'muted' });
    flow(pw, 'M690 520 H 660 V 475 H 626', { color: 'power', count: 6, speed: 70, sw: 3, alpha: 0.4 });
    flow(pw, 'M700 495 V 470 H 655 V 145 H 626', { color: 'power', count: 10, speed: 80, sw: 3, alpha: 0.4 });

    // package + cold plate
    const pk = G('data', g);
    R(pk, PX, PY, PS, PS, { fill: 'url(#g-substrate)', stroke: api.rgba('accent', 0.7), sw: 1.5, rx: 6 });
    oePts.forEach(o => {
      const w = o.side === 'L' || o.side === 'R' ? 30 : 24, h = o.side === 'L' || o.side === 'R' ? 24 : 30;
      const x = o.side === 'L' ? PX + 6 : o.side === 'R' ? PX + PS - 36 : o.x - 12;
      const y = o.side === 'T' ? PY + 6 : o.side === 'B' ? PY + PS - 36 : o.y - 12;
      R(pk, x, y, w, h, { fill: '#2a140c', stroke: api.rgba('optics', 0.9), rx: 2, a: { 'data-domain': 'optics' } });
    });
    R(pk, PX + 80, PY + 80, 100, 100, { fill: 'url(#g-die)', stroke: api.color('accent'), sw: 1.5, rx: 3 });
    const hot = A('circle', { cx: PX + 130, cy: PY + 130, r: 70, fill: 'url(#r-hot)', opacity: 0.35, 'data-domain': 'thermal' }, pk);
    L(PX + 130, PY + 128, 'switch ASIC', { parent: pk, size: 12, anchor: 'middle', weight: 700 });
    L(PX + 130, PY + 144, '+ ring of OEs', { parent: pk, size: 10, anchor: 'middle', color: 'muted' });
    const th = G('thermal', g);
    A('rect', { x: PX + 12, y: PY + 46, width: PS - 24, height: PS - 92, rx: 8, fill: 'url(#g-coolant)', opacity: 0.1, stroke: api.rgba('data', 0.5), 'stroke-dasharray': '5 4' }, th);
    const serp = 'M' + (PX + PS - 10) + ' ' + (PY + 52) + ' H ' + (PX + 30) + ' V ' + (PY + 90) + ' H ' + (PX + PS - 30) + ' V ' + (PY + 130) + ' H ' + (PX + 30) + ' V ' + (PY + 170) + ' H ' + (PX + PS - 30) + ' V ' + (PY + 206) + ' H ' + (PX + PS - 10);
    flow(th, serp, { color: '#38bdf8', stroke: 'rgba(56,189,248,.25)', sw: 5, count: 16, speed: 90, r: 2 });
    L(PX + PS / 2, PY + PS + 52, 'cold plate over ASIC + engines (liquid)', { parent: th, size: 10.5, anchor: 'middle', color: '#7dd3fc' });
    // manifolds
    R(th, 882, 78, 34, 490, { fill: 'url(#g-coolant)', stroke: '#38bdf8', rx: 8, a: { opacity: 0.85 } });
    R(th, 928, 78, 34, 490, { fill: '#3b140c', stroke: api.color('thermal'), rx: 8 });
    [899, 945].forEach((x, i) => { A('circle', { cx: x, cy: 98, r: 11, fill: '#0b1017', stroke: i ? api.color('thermal') : '#38bdf8', 'stroke-width': 2 }, th); L(x, 102, 'QD', { parent: th, size: 9, anchor: 'middle', color: 'text' }); });
    L(899, 586, 'supply', { parent: th, size: 10, anchor: 'middle', color: '#7dd3fc' });
    L(945, 586, 'return', { parent: th, size: 10, anchor: 'middle', color: 'thermal' });
    flow(th, 'M882 240 C 780 240, 700 232, ' + (PX + PS - 10) + ' ' + (PY + 52), { color: '#38bdf8', stroke: 'rgba(56,189,248,.35)', sw: 5, count: 7, speed: 90, r: 2.2 });
    flow(th, 'M' + (PX + PS - 10) + ' ' + (PY + 206) + ' C 700 ' + (PY + 206) + ', 800 430, 928 430', { color: 'thermal', stroke: 'rgba(255,90,54,.35)', sw: 5, count: 7, speed: 90, r: 2.2 });
    flow(th, 'M899 120 V 560', { color: '#38bdf8', stroke: 'none', count: 8, speed: 60, r: 1.8 });
    flow(th, 'M945 560 V 120', { color: 'thermal', stroke: 'none', count: 8, speed: 60, r: 1.8 });

    // management board
    const ct = G('control', g);
    R(ct, 690, 80, 180, 105, { fill: '#17122a', stroke: api.rgba('control', 0.85), rx: 8 });
    L(780, 98, 'management / control plane', { parent: ct, size: 11, anchor: 'middle', color: 'control', weight: 700 });
    [['BMC', 702], ['CPU', 762], ['CPLD', 822]].forEach(([t, x]) => { R(ct, x, 110, 46, 36, { fill: '#221a3d', stroke: api.color('control'), rx: 4 }); L(x + 23, 133, t, { parent: ct, size: 11, anchor: 'middle' }); });
    L(780, 172, 'I²C · MDIO · PCIe · CMIS · PMBus', { parent: ct, size: 10, anchor: 'middle', color: 'muted' });
    flow(ct, 'M690 105 H 120', { color: 'control', alpha: 0.35, sw: 1, dash: '4 4', count: 3, speed: 60, r: 2 });
    flow(ct, 'M720 185 V 200 H ' + (PX + PS), { color: 'control', alpha: 0.35, sw: 1, dash: '4 4', count: 3, speed: 50, r: 2 });
    flow(ct, 'M840 185 V 250', { color: 'control', alpha: 0.35, sw: 1, dash: '4 4', count: 2, speed: 40, r: 2 });

    // sensors
    const sn = G('sensing', g);
    R(sn, 690, 250, 180, 100, { fill: '#25101c', stroke: api.rgba('sensing', 0.85), rx: 8 });
    L(780, 272, 'sensing & feedback', { parent: sn, size: 12, anchor: 'middle', color: 'sensing', weight: 700 });
    L(780, 292, 'die temp · coolant T/flow/ΔP', { parent: sn, size: 10.5, anchor: 'middle', color: 'muted' });
    L(780, 308, 'V/I telemetry · laser & ring power', { parent: sn, size: 10.5, anchor: 'middle', color: 'muted' });
    L(780, 324, 'BER / FEC counters → loops', { parent: sn, size: 10.5, anchor: 'middle', color: 'muted' });
    const sensPts = [[PX + 8, PY + 8], [PX + PS - 8, PY + 8], [PX + 8, PY + PS - 8], [PX + PS - 8, PY + PS - 8], [PX + 130, PY + 104], [870, 240], [870, 430], [96, 90], [96 , 245], [660, 520], [380, 470]];
    const rings = sensPts.map(([x, y]) => { A('circle', { cx: x, cy: y, r: 3, fill: api.color('sensing') }, sn); return A('circle', { cx: x, cy: y, r: 3, fill: 'none', stroke: api.color('sensing'), 'stroke-width': 1 }, sn); });
    api.loop((dt, t) => {
      rings.forEach((r, i) => { const k = (t * 0.7 + i * 0.13) % 1; r.setAttribute('r', (3 + k * 12).toFixed(1)); r.setAttribute('opacity', (1 - k).toFixed(2)); });
      vrms.forEach((v, i) => v.setAttribute('opacity', (0.35 + 0.6 * Math.max(0, Math.sin(t * 9 - i * 0.8))).toFixed(2)));
      hot.setAttribute('opacity', (0.28 + 0.1 * Math.sin(t * 1.3)).toFixed(2));
    });
  }

  // ================================================================ NODES (part 1)
  const nodes = [];

  nodes.push({
    id: 'system', parent: null, level: 0, domain: 'data',
    title: 'AI Factory Scale-Out Fabric',
    subtitle: 'GPU racks → leaf/spine CPO switches → fiber plant',
    summary: 'An AI factory is tens of thousands of GPUs that behave like one computer. Inside a rack, GPUs talk over NVLink (scale-up). Between racks they talk over a scale-out network — InfiniBand or Ethernet — built from leaf and spine switches and millions of optical links. Co-packaged optics (CPO) moves the optical conversion from pluggable modules into the switch package itself.',
    what: '<p><b>Traffic pattern.</b> Training jobs run collectives (all-reduce, all-to-all, reduce-scatter) that synchronize gradients every step. Step time is gated by the <i>slowest</i> flow, so the fabric must deliver full bisection bandwidth with low tail latency and almost no loss. Inference (especially mixture-of-experts) adds bursty all-to-all traffic.</p>' +
      '<p><b>Topology.</b> A non-blocking 2- or 3-tier Clos (fat-tree), often <i>rail-optimized</i>: GPU <i>k</i> of every server connects to the same leaf "rail" so most collective traffic stays one hop. Port count per switch (radix) sets how many GPUs a 2-tier fabric can reach: with radix <i>k</i>, a 2-tier non-blocking fat-tree reaches k²/2 endpoints — e.g. radix 144 → ~10k endpoints; 3 tiers → k³/4.</p>' +
      '<p><b>Why optics dominate.</b> Every switch-to-switch and NIC-to-leaf link beyond a few metres is optical. In a pluggable design each link end has its own transceiver with its own lasers and DSP; at hundreds of thousands of GPUs that is millions of transceivers, megawatts of power and the leading source of link flaps. NVIDIA\'s CPO switches (Quantum-X Photonics and Spectrum-X Photonics) integrate silicon-photonics engines next to the switch ASIC and feed them from a few shared, front-panel external lasers ' + B('nv') + '.</p>' +
      '<p><b>Why CPO, in one line:</b> pluggable = ASIC → long lossy PCB trace → retimer DSP → optics; CPO = ASIC → millimetre link → optical engine. The electrical channel shrinks from ~30 dB to a few dB, so the power-hungry long-reach SerDes and DSP disappear (see <a href="#architecture/why-cpo">Why CPO</a>).</p>',
    needs: ['Full bisection bandwidth at 800G/1.6T per port with non-blocking Clos topology', 'Very low and predictable tail latency (collectives wait for the slowest flow)', 'Near-zero packet loss: lossless InfiniBand credit flow control or Ethernet with congestion control / adaptive routing', 'Link reliability: a single flapping link can stall a multi-thousand-GPU job — fewer components per link helps', 'Power and cooling headroom: optics power scales with link count', 'Serviceable, manageable fiber plant and lasers'],
    interfaces: [
      { with: 'GPU NICs / SuperNICs', type: 'optical', detail: '400G–1.6T per GPU scale-out ports; NIC side may still use pluggables' },
      { with: 'switch-chassis', type: 'optical', detail: 'Leaf/spine CPO switches; detachable fiber on the front panel' },
      { with: 'Facility power', type: 'power', detail: 'Rack busbar 48–54 V (ORv3-style) feeding switch PSUs' },
      { with: 'Facility liquid loop', type: 'thermal', detail: 'CDU supplies coolant to liquid-cooled switches and GPU racks' },
      { with: 'Fabric manager / NOS', type: 'mgmt', detail: 'Subnet manager (IB) or NOS + telemetry (Ethernet); routing, congestion control' }
    ],
    kpis: [
      { name: 'Quantum-X Photonics', value: '144 × 800G = 115 Tb/s', tag: 'nv', note: 'InfiniBand, liquid-cooled CPO switch' },
      { name: 'Spectrum-X Photonics', value: '102.4 / 409.6 Tb/s', tag: 'nv', note: '128×800G or 512×200G; 512×800G or 2048×200G' },
      { name: 'Power efficiency vs pluggable', value: '3.5×', tag: 'nv', note: 'Network-level claim' },
      { name: 'Resiliency vs pluggable', value: '10×', tag: 'nv', note: 'Fewer lasers / components per link' },
      { name: 'Lasers', value: '4× fewer', tag: 'nv', note: 'Shared external laser sources' },
      { name: '2-tier fat-tree reach', value: 'k²/2 hosts', tag: 'typ', note: 'Radix k=144 → ~10k ports' },
      { name: 'Optics energy/bit', value: '~5 vs 15–20 pJ/b', tag: 'typ', note: 'CPO vs pluggable (industry-typical)' }
    ],
    physics: '<div class="eq">Link power  P = E_bit × bit-rate\n800G port @ 15 pJ/b  → 12 W per transceiver end\n800G port @  5 pJ/b  →  4 W\nFabric with N links × 2 ends: ΔP = N·2·800e9·(E_plug − E_cpo)\n  e.g. 100k links → 100e3·2·800e9·10e-12 ≈ 1.6 MW saved  [est]</div>' +
      '<p>Reliability compounds: if each link has <i>m</i> independent components with failure rate λ, link FIT ≈ m·λ. Removing per-link lasers and DSPs (and their connectors) cuts <i>m</i>; a job spanning L links sees an interruption rate ∝ L·m·λ.</p>' +
      '<div class="eq">Job MTBI ≈ 1 / (Σ_links FIT_link) — halving components per link ~doubles time between interruptions</div>',
    failures: ['Link flap (laser aging, dirty connector, marginal SI) → collective stalls / job restart from checkpoint → fewer components (CPO), FEC margin monitoring, proactive replacement', 'Congestion hot-spot / incast → tail-latency blow-up → adaptive routing, ECN/credit-based flow control, rail-optimized placement', 'Fiber miscabling → wrong topology, silent bandwidth loss → cable validation, link-layer discovery', 'Cooling loop failure → switch throttling/shutdown → redundant CDUs, leak detection, telemetry'],
    monitoring: ['Per-port BER / FEC corrected-symbol histograms trended over time', 'Link up/down events, optical power telemetry from engines and ELS', 'Fabric manager congestion counters, queue depths, adaptive-routing statistics', 'Facility telemetry: coolant temperatures, flow, rack power'],
    scene: sceneSystem,
    hotspots: [
      { target: 'switch-chassis', x: 271, y: 256, w: 116, h: 42, label: 'Leaf CPO switch' },
      { target: 'switch-chassis', x: 396, y: 98, w: 124, h: 46, label: 'Spine CPO switch' },
      { target: 'why-cpo', x: 728, y: 322, w: 258, h: 238, label: 'Why co-packaged optics?' }
    ]
  });

  nodes.push({
    id: 'why-cpo', parent: 'system', level: 1, domain: 'optics',
    title: 'Why CPO: pluggable vs co-packaged',
    subtitle: 'Shrink the electrical channel from ~30 dB to a few dB',
    summary: 'In a pluggable switch the ASIC drives each 200G lane across 15–30 cm of PCB, a package and a connector to a module that needs its own DSP retimer before the laser. CPO puts the optical engine millimetres from the ASIC, so the lossy channel, the long-reach SerDes power and the DSP disappear, and lasers move to a few shared front-panel modules.',
    what: '<p><b>Pluggable path.</b> ASIC ' + T('LR') + '-class ' + T('SerDes') + ' → package (≈3–5 dB) → PCB trace (≈1–1.5 dB/inch at 53 GHz in low-loss laminate) → connector/cage → module host interface → ' + T('DSP') + ' retimer (re-equalizes, re-times, often FEC-aware) → driver → laser/modulator → fiber. A 200G PAM4 lane runs at ~106 GBd, so the Nyquist frequency is ~53 GHz — where copper loss, dielectric loss and connector reflections are worst.</p>' +
      '<p><b>CPO path.</b> ASIC short-reach SerDes → a few mm of substrate routing (' + T('XSR') + '-class channel, a few dB) → ' + T('OE') + ' electronic IC (driver/TIA) stacked on the photonic IC (TSMC ' + T('COUPE') + ' with ' + T('SoIC') + ' ' + B('nv') + ') → micro-ring modulators → detachable fiber to the front panel. Continuous-wave light comes from front-panel ' + T('ELS') + ' modules ' + B('nv') + '.</p>' +
      '<table><tr><th>Item</th><th>Pluggable</th><th>CPO</th></tr>' +
      '<tr><td>Electrical channel @ Nyquist</td><td>≈25–40 dB ' + B('typ') + '</td><td>≈ few dB ' + B('typ') + '</td></tr>' +
      '<tr><td>Host SerDes</td><td>LR/C2M: big FFE + ADC-DSP</td><td>short-reach, light EQ</td></tr>' +
      '<tr><td>Module DSP</td><td>yes (~several W per 800G)</td><td>none</td></tr>' +
      '<tr><td>Lasers</td><td>one or more per module</td><td>shared ELS, 4× fewer ' + B('nv') + '</td></tr>' +
      '<tr><td>I/O energy</td><td>~15–20 pJ/b optics + SerDes ' + B('typ') + '</td><td>~5 pJ/b ' + B('typ') + '</td></tr>' +
      '<tr><td>Serviceability</td><td>hot-swap module</td><td>ELS + fiber serviceable; engine is not</td></tr></table>' +
      '<p><b>The trade.</b> CPO gives up per-port field replaceability of the electro-optics, and concentrates heat, optics and the ASIC in one package that must be built and tested with very high yield (known-good engines before attach). That is why external, front-panel-replaceable lasers — the least reliable, most temperature-sensitive part — are kept out of the package.</p>',
    needs: ['Known-good optical engines (wafer/engine-level optical test before attach)', 'Low-loss, detachable fiber coupling to the engines', 'Thermal design keeping micro-rings stable next to a hundreds-of-watts ASIC', 'Shared, redundant/serviceable external lasers', 'Ecosystem: foundry (TSMC COUPE), fiber/connector and laser partners ' + B('nv')],
    interfaces: [
      { with: 'asic-die', type: 'electrical', detail: 'Short-reach SerDes lanes to the engines' },
      { with: 'optical-engine', type: 'optical', detail: 'MRM-based engines, 1.6T class ' + B('nv') },
      { with: 'external-laser', type: 'optical', detail: 'CW light in over fiber' },
      { with: 'fiber-plant', type: 'optical', detail: 'Detachable fiber to front-panel connectors' }
    ],
    kpis: [
      { name: 'Power efficiency', value: '3.5×', tag: 'nv', note: 'vs pluggable transceivers' },
      { name: 'Signal integrity', value: '63×', tag: 'nv', note: 'Less electrical loss before the optics' },
      { name: 'Resiliency', value: '10×', tag: 'nv', note: '' },
      { name: 'Lasers', value: '4× fewer', tag: 'nv', note: '' },
      { name: 'Deployment', value: '1.3× faster', tag: 'nv', note: '' },
      { name: 'Nyquist @ 200G PAM4', value: '≈53 GHz', tag: 'typ', note: '106.25 GBd / 2' },
      { name: 'PCB loss @ 53 GHz', value: '≈1–1.5 dB/in', tag: 'typ', note: 'low-loss laminate, stripline' }
    ],
    physics: '<div class="eq">Symbol rate: 212.5 Gb/s line / 2 bits = 106.25 GBd   →  UI = 9.41 ps,  f_Nyq = 53.1 GHz\nCopper loss  α(f) ≈ a·√f (skin effect) + b·f (dielectric: ∝ Df·√εr·f)\nIL_total(dB) = IL_pkg + L·α(f_Nyq) + IL_conn  ≈ 4 + 20 in × 1.2 + 3 ≈ 31 dB  [typ]\nCPO: IL ≈ 1–2 dB pkg routing + bumps  →  ~30× less in linear voltage terms</div>' +
      '<p>Each 6 dB of channel loss halves the received amplitude. Recovering 30 dB requires aggressive equalization (TX FFE, CTLE, ADC + 20–40-tap DSP FFE, DFE/MLSD) — each adding noise, power and latency. Equalization boosts noise along with signal, so SNR at the slicer drops roughly with the boost.</p>' +
      '<div class="eq">Energy budget per bit (illustrative)\nPluggable: host LR SerDes ~5 + module DSP ~6 + driver/laser/TIA ~6  ≈ 17 pJ/b\nCPO:       short-reach SerDes ~1–2 + EIC/MRM/PD ~2 + laser share ~1–2 ≈ 5 pJ/b</div>',
    failures: ['Engine failure inside package → cannot hot-swap one port → very high engine reliability, redundancy, ELS kept external', 'Thermal crosstalk ASIC→rings → resonance drift → ring lock loops, heater budget, thermal design', 'Fiber-attach contamination/damage → loss, reflections → detachable connector with cleaning procedures', 'Pluggable path: SI margin collapse at 200G (crosstalk, reflections) → link errors → retimers, better laminates (the cost CPO avoids)'],
    monitoring: ['Pre-/post-FEC BER on every lane (SI margin proxy)', 'Engine telemetry: ring heater power, monitor-PD photocurrents, temperatures', 'ELS optical output power and bias current'],
    scene: sceneWhy,
    hotspots: [
      { target: 'asic-die', x: 36, y: 356, w: 118, h: 78, label: 'Switch ASIC' },
      { target: 'optical-engine', x: 196, y: 356, w: 148, h: 78, label: 'Optical engine' },
      { target: 'external-laser', x: 216, y: 496, w: 128, h: 58, label: 'External laser source' },
      { target: 'serdes', x: 36, y: 106, w: 118, h: 78, label: 'Long-reach SerDes' }
    ]
  });

  nodes.push({
    id: 'switch-chassis', parent: 'system', level: 1, domain: 'mechanical',
    title: 'CPO Switch Chassis',
    subtitle: 'Liquid-cooled switch: package, ELS, fiber, power, control, sensing',
    summary: 'Top-down view of a liquid-cooled CPO switch. The switch package (ASIC ringed by optical engines) sits under a cold plate in the middle. Fibers run from the engines to front-panel connectors; front-panel external laser modules feed CW light in. Multiphase VRMs surround the package, fed from the 48–54 V busbar. A management board runs control, and sensors everywhere close the feedback loops.',
    what: '<p><b>Front panel.</b> Instead of 64–144 transceiver cages, the faceplate carries dense multi-fiber connectors (detachable fiber to the engines) and a handful of hot-swappable ' + T('ELS') + ' modules ' + B('nv') + '. The lasers are the components most sensitive to temperature and aging, so they live at the cool, serviceable front.</p>' +
      '<p><b>Centre.</b> The package: switch ASIC + co-packaged optical engines on a large substrate, under a liquid cold plate. Rings in the engines must be held to a fraction of a kelvin of their lock point, so thermal design is shared between ASIC (hundreds of W) and photonics (tens of mW per ring heater).</p>' +
      '<p><b>Power.</b> 48–54 V from the rack busbar → intermediate bus / hot-swap → multiphase ' + T('VRM') + 's placed as close as possible to the package (core ~0.75 V at hundreds of amps; separate SerDes analog, EIC and heater rails). Every millimetre of copper at hundreds of amps costs mV of droop and watts of I²R.</p>' +
      '<p><b>Cooling.</b> Liquid enters through rear quick-disconnects (QDs) into a supply manifold, flows through the cold plate and returns. Quantum-X Photonics is liquid-cooled ' + B('nv') + '.</p>' +
      '<p><b>Control & sensing.</b> A BMC/CPU/CPLD complex boots and supervises everything: VRMs via PMBus, ELS and engines via I²C/CMIS-style management, temperature/flow/leak sensors, fan/pump requests, and per-lane BER. Fast loops (ring lock, laser APC, VRM regulation) run locally; slow loops (thermal, health) run in firmware.</p>',
    needs: ['Package cooling with uniform temperature across optical engines', 'Clean, low-impedance power for core + analog + photonics rails', 'Serviceable lasers and fiber at the front panel', 'Fiber routing with bend-radius control and strain relief', 'Out-of-band management and fast hardware protection (over-temp, over-current, leak)'],
    interfaces: [
      { with: 'switch-package', type: 'electrical', detail: 'Power, mgmt, clocks into the package; heat out through cold plate' },
      { with: 'external-laser', type: 'optical', detail: 'CW light to engines via polarization-maintaining fiber' },
      { with: 'fiber-plant', type: 'optical', detail: 'Front-panel multi-fiber connectors' },
      { with: 'power-delivery', type: 'power', detail: '48–54 V busbar → VRMs' },
      { with: 'thermal-system', type: 'thermal', detail: 'Coolant supply/return via QDs, cold plate' },
      { with: 'control-plane', type: 'mgmt', detail: 'BMC, CPU, CPLD; PCIe to ASIC; I²C/MDIO/PMBus' },
      { with: 'sensing-feedback', type: 'sensing', detail: 'Temperatures, flow, voltage/current, optical power' }
    ],
    kpis: [
      { name: 'Capacity (Quantum-X Photonics)', value: '115 Tb/s', tag: 'nv', note: '144 × 800G ports' },
      { name: 'Cooling', value: 'liquid', tag: 'nv', note: 'Quantum-X Photonics' },
      { name: 'Rack input', value: '48–54 V', tag: 'typ', note: 'busbar' },
      { name: 'Core rail', value: '~0.7–0.85 V', tag: 'typ', note: 'hundreds of A' },
      { name: '1.6T engines per 115T', value: '≈72', tag: 'est', note: 'derived: 115.2 T / 1.6 T' },
      { name: 'Lanes @200G', value: '576', tag: 'est', note: 'derived: 115.2 T / 200 G' }
    ],
    physics: '<div class="eq">Core current  I = P / V  ≈ 500 W / 0.75 V ≈ 670 A   [est]\nConduction loss in a 0.2 mΩ path: I²R = 670² × 0.2e-3 ≈ 90 W  → put VRMs next to the package\nCoolant heat removal  Q = ṁ · c_p · ΔT ;  1 L/min water ≈ 70 W/K  → 1 kW at ΔT≈7 K needs ~2 L/min</div>' +
      '<p>Ring resonators drift ≈0.07–0.1 nm/K; with loaded Q ~10k at 1310 nm the resonance FWHM is ~0.13 nm, so ~1 K uncontrolled drift is already a large fraction of the linewidth — thermal uniformity and closed-loop tuning are mandatory.</p>',
    failures: ['Coolant leak → shorts / emergency shutdown → leak sensors, drip trays, dry-break QDs', 'Pump/flow loss → ASIC over-temp and ring unlock → flow sensing, thermal throttling, redundant CDU', 'ELS failure → loss of light on many lanes → front-panel hot-swap, redundancy, APC monitoring', 'VRM phase failure → droop, brown-out → phase shedding, OCP/OVP, PMBus telemetry', 'Fiber pinch / tight bend → optical loss → routing guides, bend-insensitive fiber'],
    monitoring: ['BMC polls VRM PMBus (V, I, T, faults), coolant inlet/outlet temperature and flow', 'Engine and ELS telemetry (laser bias, monitor PD power, ring heater power)', 'ASIC die temperature sensors and per-lane FEC statistics', 'CPLD implements fast hardware interlocks (over-temp, power-good sequencing)'],
    scene: sceneChassis,
    hotspots: [
      { target: 'switch-package', x: 366, y: 176, w: 268, h: 268, label: 'Switch package (ASIC + optical engines)' },
      { target: 'external-laser', x: 24, y: 80, w: 84, h: 194, label: 'External laser sources (ELS)' },
      { target: 'fiber-plant', x: 24, y: 286, w: 84, h: 278, label: 'Front-panel fiber connectors' },
      { target: 'power-delivery', x: 686, y: 491, w: 188, h: 78, label: 'Power delivery' },
      { target: 'thermal-system', x: 878, y: 74, w: 88, h: 498, label: 'Liquid cooling' },
      { target: 'control-plane', x: 686, y: 76, w: 188, h: 113, label: 'Control plane (BMC/CPU/CPLD)' },
      { target: 'sensing-feedback', x: 686, y: 246, w: 188, h: 108, label: 'Sensing & feedback' }
    ]
  });

  // ================================================================ PACKAGE
  function packageOEs() {
    const oes = [];
    for (let i = 0; i < 4; i++) {
      const x = 430 + i * 50;
      oes.push({ x: x, y: 118, w: 40, h: 62, side: 'T' });
      oes.push({ x: x, y: 420, w: 40, h: 62, side: 'B' });
      const y = 200 + i * 50;
      oes.push({ x: 348, y: y, w: 62, h: 40, side: 'L' });
      oes.push({ x: 650, y: y, w: 62, h: 40, side: 'R' });
    }
    return oes;
  }
  function scenePackage(g, api) {
    const { A, G, R, L } = H(api);
    const OES = packageOEs();
    const sub = G('mechanical', g);
    R(sub, 300, 70, 460, 460, { fill: 'url(#g-substrate)', stroke: api.rgba('mechanical', 0.7), sw: 1.5, rx: 8 });
    A('rect', { x: 300, y: 70, width: 460, height: 460, rx: 8, fill: 'url(#p-dots)', opacity: 0.5 }, sub);
    A('rect', { x: 308, y: 78, width: 444, height: 444, rx: 6, fill: 'none', stroke: api.rgba('mechanical', 0.45), 'stroke-width': 6 }, sub);
    const pw = G('power', g);
    for (const [cx, cy] of [[326, 96], [690, 96], [326, 466], [686, 462]]) for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++)
      R(pw, cx + i * 14, cy + j * 22, 9, 16, { fill: '#5a4a24', stroke: api.rgba('power', 0.6), rx: 1 });
    L(712, 520, 'decaps', { parent: pw, size: 9.5, color: 'power', anchor: 'middle' });
    const fib = G('optics', g);
    OES.forEach((o, i) => {
      for (let k = 0; k < 3; k++) {
        const off = (k - 1) * 10;
        let d;
        if (o.side === 'T') d = 'M' + (o.x + 20 + off) + ' ' + o.y + ' V 28';
        else if (o.side === 'B') d = 'M' + (o.x + 20 + off) + ' ' + (o.y + o.h) + ' V 578';
        else if (o.side === 'L') d = 'M' + o.x + ' ' + (o.y + 20 + off) + ' H 262';
        else d = 'M' + (o.x + o.w) + ' ' + (o.y + 20 + off) + ' H 805';
        const p = A('path', { d: d, fill: 'none', stroke: k === 0 ? 'rgba(255,201,168,.35)' : api.rgba('optics', 0.35), 'stroke-width': 1.6, 'stroke-dasharray': k === 0 ? '2 3' : null }, fib);
        if (k === 0) api.particlesAlong(p, { color: '#ffc9a8', count: 4, speed: 50, r: 1.4, glow: false, reverse: true });
        else api.particlesAlong(p, { color: 'optics', count: 2, speed: 110 + (i % 3) * 20, shape: 'dash', r: 1.6, dashLen: 9, reverse: k === 2 });
      }
    });
    const el = G('data', g);
    OES.forEach(o => {
      for (let k = 0; k < 2; k++) {
        const off = (k - 0.5) * 12;
        let d;
        if (o.side === 'T') d = 'M' + (o.x + 20 + off) + ' 210 V 180';
        else if (o.side === 'B') d = 'M' + (o.x + 20 + off) + ' 390 V 420';
        else if (o.side === 'L') d = 'M440 ' + (o.y + 20 + off) + ' H 410';
        else d = 'M620 ' + (o.y + 20 + off) + ' H 650';
        const p = A('path', { d: d, fill: 'none', stroke: api.rgba('data', 0.55), 'stroke-width': 2 }, el);
        api.particlesAlong(p, { color: 'data', count: 2, speed: 40, r: 1.8, reverse: k === 1 });
      }
    });
    const die = G('data', g);
    R(die, 440, 210, 180, 180, { fill: 'url(#g-die)', stroke: api.color('accent'), sw: 1.8, rx: 3, a: { filter: 'url(#shadow)' } });
    A('rect', { x: 448, y: 218, width: 164, height: 164, fill: 'none', stroke: api.rgba('data', 0.7), 'stroke-width': 8, 'stroke-dasharray': '3 2' }, die);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) R(die, 466 + i * 33, 236 + j * 33, 28, 28, { fill: i > 0 && i < 3 && j > 0 && j < 3 ? '#1c2a3a' : '#16231a', stroke: api.rgba('accent', 0.25), rx: 2 });
    L(530, 302, 'switch ASIC', { parent: die, size: 13, anchor: 'middle', weight: 700 });
    L(530, 318, 'SerDes ring at the edge', { parent: die, size: 9.5, anchor: 'middle', color: 'data' });
    const hot = A('circle', { cx: 530, cy: 300, r: 80, fill: 'url(#r-hot)', opacity: 0.2, 'data-domain': 'thermal', 'pointer-events': 'none' }, g);
    const oeg = G('optics', g);
    const rings = [];
    OES.forEach(o => {
      R(oeg, o.x, o.y, o.w, o.h, { fill: '#2a140c', stroke: api.rgba('optics', 0.95), sw: 1.2, rx: 3 });
      const vert = o.side === 'T' || o.side === 'B';
      const ex = vert ? o.x + 6 : (o.side === 'L' ? o.x + 30 : o.x + 6), ey = vert ? (o.side === 'T' ? o.y + 32 : o.y + 6) : o.y + 6;
      R(oeg, ex, ey, vert ? 28 : 26, vert ? 24 : 28, { fill: '#12202c', stroke: api.rgba('data', 0.7), rx: 2 });
      for (let k = 0; k < 4; k++) {
        const rxp = vert ? o.x + 8 + k * 7 : (o.side === 'L' ? o.x + 8 : o.x + 44), ryp = vert ? (o.side === 'T' ? o.y + 14 : o.y + 44) : o.y + 8 + k * 7;
        rings.push(A('circle', { cx: rxp + 3, cy: ryp + 3, r: 2.6, fill: 'none', stroke: api.color('optics'), 'stroke-width': 1 }, oeg));
      }
    });
    api.loop((dt, t) => {
      rings.forEach((r, i) => r.setAttribute('stroke-opacity', (0.4 + 0.6 * Math.max(0, Math.sin(t * 7 + i * 1.3))).toFixed(2)));
      hot.setAttribute('opacity', (0.16 + 0.08 * Math.sin(t * 1.4)).toFixed(2));
    });
    const an = G('data', g);
    R(an, 16, 80, 236, 280, { fill: 'rgba(12,17,24,.9)', stroke: api.rgba('line', 1), rx: 10 });
    L(30, 104, 'Switch package (top view)', { parent: an, size: 13, weight: 700, color: 'accent' });
    const lines = [['data', 'ASIC → EIC: mm-scale links'], ['data', 'short-reach SerDes, few dB'], ['optics', 'OE = EIC stacked on PIC'], ['optics', 'micro-rings + Ge PDs'], ['optics', 'modulated fiber (solid)'], ['optics', 'CW laser light in (dotted)'], ['mechanical', 'substrate + stiffener ring'], ['power', 'decaps / PDN']];
    lines.forEach(([d, t], i) => { A('circle', { cx: 34, cy: 128 + i * 27, r: 4, fill: api.color(d) }, an); L(46, 132 + i * 27, t, { parent: an, size: 11.5 }); });
    L(22, 390, 'Illustrative: 16 engine sites. A 115 Tb/s', { size: 10.5, color: 'muted' });
    L(22, 405, 'switch implies ≈72 × 1.6T engines (derived);', { size: 10.5, color: 'muted' });
    L(22, 420, 'real floorplans are not public.', { size: 10.5, color: 'muted' });
  }

  // ================================================================ SUBSTRATE cross-section
  function sceneSubstrate(g, api) {
    const { A, G, R, L, flow } = H(api);
    const pcb = G('mechanical', g);
    R(pcb, 40, 520, 920, 56, { fill: 'url(#g-pcb)', stroke: api.rgba('good', 0.4), rx: 4 });
    for (let i = 0; i < 4; i++) A('rect', { x: 44, y: 529 + i * 12, width: 912, height: 1.5, fill: api.rgba('power', 0.3) }, pcb);
    L(52, 570, 'PCB (power planes, signal layers)', { parent: pcb, size: 11, color: 'muted' });
    const bga = G('mechanical', g);
    for (let x = 90; x <= 910; x += 26) A('ellipse', { cx: x, cy: 508, rx: 10, ry: 11, fill: 'url(#g-solder)' }, bga);
    L(930, 494, 'BGA ~1 mm pitch', { parent: bga, size: 10.5, color: 'muted', anchor: 'end' });
    const sub = G('mechanical', g);
    R(sub, 70, 398, 860, 99, { fill: 'url(#g-substrate)', stroke: api.rgba('mechanical', 0.7), rx: 3 });
    R(sub, 70, 430, 860, 34, { fill: '#2b2418', stroke: 'none', rx: 0 });
    for (let i = 0; i < 4; i++) { A('rect', { x: 72, y: 404 + i * 7, width: 856, height: 1, fill: api.rgba('power', 0.3) }, sub); A('rect', { x: 72, y: 470 + i * 7, width: 856, height: 1, fill: api.rgba('power', 0.3) }, sub); }
    for (let x = 110; x < 920; x += 52) R(sub, x, 430, 6, 34, { fill: 'url(#g-copper)', stroke: 'none', rx: 1 });
    L(80, 452, 'core (glass-epoxy) + plated through-holes', { parent: sub, size: 10.5, color: 'muted' });
    L(80, 425, 'ABF build-up layers', { parent: sub, size: 10, color: 'muted' });
    R(sub, 72, 352, 60, 46, { fill: 'url(#g-metal)', stroke: api.rgba('mechanical', 0.6), rx: 2 });
    R(sub, 868, 352, 60, 46, { fill: 'url(#g-metal)', stroke: api.rgba('mechanical', 0.6), rx: 2 });
    L(102, 345, 'stiffener', { parent: sub, size: 10, color: 'muted', anchor: 'middle' });
    const c4 = G('mechanical', g);
    for (let x = 340; x <= 660; x += 20) A('ellipse', { cx: x, cy: 391, rx: 7, ry: 7, fill: 'url(#g-solder)' }, c4);
    const ip = G('data', g);
    R(ip, 330, 344, 340, 40, { fill: 'url(#g-silicon)', stroke: api.rgba('data', 0.5), rx: 2 });
    for (let x = 350; x < 660; x += 40) R(ip, x, 348, 4, 34, { fill: 'url(#g-copper)', stroke: 'none', rx: 1 });
    L(500, 378, 'Si interposer / bridge + TSVs (illustrative)', { parent: ip, size: 10, color: 'muted', anchor: 'middle' });
    const mb = G('mechanical', g);
    for (let x = 384; x <= 616; x += 8) A('rect', { x: x, y: 337, width: 4, height: 7, fill: 'url(#g-solder)' }, mb);
    const die = G('data', g);
    R(die, 380, 258, 240, 79, { fill: 'url(#g-die)', stroke: api.color('accent'), sw: 1.5, rx: 2 });
    L(500, 302, 'switch ASIC (flip-chip, thinned)', { parent: die, size: 12, anchor: 'middle', weight: 700 });
    const th = G('thermal', g);
    R(th, 380, 246, 240, 12, { fill: '#7a6a5a', stroke: 'none', rx: 1 });
    R(th, 340, 196, 320, 50, { fill: 'url(#g-metal)', stroke: '#38bdf8', rx: 4, a: { opacity: 0.9 } });
    flow(th, 'M350 221 H 650', { color: '#38bdf8', stroke: 'rgba(56,189,248,.3)', sw: 8, count: 10, speed: 80, r: 2.2 });
    L(500, 190, 'TIM + liquid cold plate', { parent: th, size: 10.5, color: '#7dd3fc', anchor: 'middle' });
    const heat = [];
    for (let i = 0; i < 7; i++) heat.push(A('circle', { cx: 400 + i * 33, cy: 250, r: 2.4, fill: api.color('thermal'), filter: 'url(#glow)' }, th));
    const oe = G('optics', g);
    for (const [x, side] of [[170, -1], [700, 1]]) {
      R(oe, x, 352, 130, 36, { fill: '#2a140c', stroke: api.rgba('optics', 0.9), rx: 2 });
      L(x + 65, 375, 'PIC', { parent: oe, size: 11, anchor: 'middle', color: 'optics' });
      R(oe, x + 30, 318, 70, 32, { fill: '#12202c', stroke: api.rgba('data', 0.8), rx: 2 });
      L(x + 65, 338, 'EIC', { parent: oe, size: 11, anchor: 'middle', color: 'data' });
      A('rect', { x: x + 30, y: 349, width: 70, height: 2, fill: api.color('accent') }, oe);
      for (let k = 0; k < 6; k++) A('ellipse', { cx: x + 15 + k * 20, cy: 393, rx: 6, ry: 5, fill: 'url(#g-solder)' }, oe);
      const fx = side < 0 ? x : x + 130;
      flow(oe, 'M' + fx + ' 368 H ' + (side < 0 ? 20 : 980), { color: 'optics', count: 5, speed: 120, shape: 'dash', sw: 3, alpha: 0.35, reverse: side < 0 });
    }
    L(30, 335, 'edge-coupled fiber', { size: 10.5, color: 'optics' });
    L(170, 308, 'SoIC hybrid bond EIC↔PIC', { size: 10, color: 'accent' });
    const sig = G('data', g);
    flow(sig, 'M380 330 C 350 330, 340 405, 320 410 H 300 C 290 410, 272 400, 266 389', { color: 'data', count: 4, speed: 60, alpha: 0.6 });
    flow(sig, 'M620 330 C 650 330, 660 405, 680 410 H 700 C 712 410, 728 400, 734 389', { color: 'data', count: 4, speed: 60, alpha: 0.6 });
    const pw = G('power', g);
    [420, 500, 580].forEach(x => flow(pw, 'M' + x + ' 560 V 338', { color: 'power', count: 5, speed: 55, sw: 1.2, alpha: 0.3, r: 2 }));
    const wi = G('mechanical', g);
    R(wi, 690, 50, 292, 128, { fill: 'rgba(12,17,24,.92)', stroke: api.rgba('line', 1), rx: 10 });
    L(704, 70, 'Warpage vs temperature (exaggerated)', { parent: wi, size: 11.5, weight: 700 });
    L(704, 88, 'CTE: Si 2.6 · Cu 17 · organic 10–17 ppm/K', { parent: wi, size: 10, color: 'muted' });
    const wp = A('path', { d: 'M720 132 H 950', fill: 'none', stroke: api.color('warn'), 'stroke-width': 4 }, wi);
    const wd = A('path', { d: 'M790 124 H 880', fill: 'none', stroke: api.color('accent'), 'stroke-width': 4 }, wi);
    const wt = L(704, 166, '', { parent: wi, size: 10.5, color: 'muted' });
    api.loop((dt, t) => {
      const T = 25 + 220 * (0.5 + 0.5 * Math.sin(t * 0.7));
      const k = (T - 150) / 120 * 16;
      wp.setAttribute('d', 'M720 132 Q 835 ' + (132 + 2 * k).toFixed(1) + ' 950 132');
      wd.setAttribute('d', 'M790 ' + (124 + k * 0.5).toFixed(1) + ' Q 835 ' + (124 + 1.4 * k).toFixed(1) + ' 880 ' + (124 + k * 0.5).toFixed(1));
      wt.textContent = 'T ≈ ' + T.toFixed(0) + ' °C → ' + (k < 0 ? 'concave (smile)' : 'convex (cry)') + ' · die green, substrate amber';
      heat.forEach((c, i) => { const ph = (t * 0.9 + i * 0.37) % 1; c.setAttribute('cy', (256 - ph * 60).toFixed(1)); c.setAttribute('opacity', (1 - ph).toFixed(2)); });
    });
  }

  // ================================================================ BUMPS
  function sceneBumps(g, api) {
    const { A, G, R, L, flow } = H(api);
    const cols = [
      { x: 60, title: 'C4 solder bump', pitch: 150, note: 'die/interposer → substrate' },
      { x: 380, title: 'Cu-pillar µbump', pitch: 40, note: 'die → interposer (2.5D)' },
      { x: 700, title: 'Hybrid bond (Cu–Cu)', pitch: 9, note: 'SoIC: EIC ↔ PIC (3D)' }
    ];
    cols.forEach((c, ci) => {
      const gg = G(ci === 2 ? 'optics' : 'mechanical', g);
      R(gg, c.x, 70, 260, 340, { fill: 'rgba(12,17,24,.9)', stroke: api.rgba('line', 1), rx: 10 });
      L(c.x + 130, 96, c.title, { parent: gg, anchor: 'middle', size: 15, weight: 700 });
      L(c.x + 130, 114, c.note, { parent: gg, anchor: 'middle', size: 11, color: 'muted' });
      R(gg, c.x + 20, 140, 220, 60, { fill: 'url(#g-silicon)', stroke: api.rgba('data', 0.4), rx: 2 });
      R(gg, c.x + 20, 290, 220, 60, { fill: ci === 0 ? 'url(#g-substrate)' : 'url(#g-silicon)', stroke: api.rgba('mechanical', 0.5), rx: 2 });
      if (ci < 2) for (let i = 0; i < 3; i++) {
        const cx = c.x + 60 + i * 70;
        if (ci === 0) { A('rect', { x: cx - 14, y: 200, width: 28, height: 6, fill: 'url(#g-gold)' }, gg); A('ellipse', { cx: cx, cy: 247, rx: 30, ry: 41, fill: 'url(#g-solder)' }, gg); A('rect', { x: cx - 18, y: 284, width: 36, height: 6, fill: 'url(#g-copper)' }, gg); }
        else { A('rect', { x: cx - 16, y: 200, width: 32, height: 58, fill: 'url(#g-copper)' }, gg); A('rect', { x: cx - 16, y: 258, width: 32, height: 16, rx: 6, fill: 'url(#g-solder)' }, gg); A('rect', { x: cx - 18, y: 274, width: 36, height: 16, fill: 'url(#g-copper)' }, gg); }
      } else {
        R(gg, c.x + 20, 200, 220, 90, { fill: '#2a3547', stroke: 'none', rx: 0 });
        for (let i = 0; i < 10; i++) { A('rect', { x: c.x + 30 + i * 21, y: 200, width: 11, height: 45, fill: 'url(#g-copper)' }, gg); A('rect', { x: c.x + 30 + i * 21, y: 245, width: 11, height: 45, fill: 'url(#g-copper)' }, gg); }
        A('rect', { x: c.x + 20, y: 244, width: 220, height: 2, fill: api.color('accent') }, gg);
        L(c.x + 130, 238, 'oxide–oxide + Cu–Cu interface', { parent: gg, anchor: 'middle', size: 9.5, color: 'accent' });
      }
      L(c.x + 130, 376, 'pitch ≈ ' + c.pitch + ' µm', { parent: gg, anchor: 'middle', size: 14, color: 'accent', weight: 700, mono: true });
      L(c.x + 130, 396, 'density ≈ ' + C.fmt(1e6 / (c.pitch * c.pitch), 3) + ' /mm²', { parent: gg, anchor: 'middle', size: 12, mono: true });
      const xs = ci === 2 ? [c.x + 56, c.x + 140, c.x + 224] : [c.x + 60, c.x + 130, c.x + 200];
      const pg = G('power', gg);
      xs.forEach((x, i) => flow(pg, 'M' + x + ' 340 V 150', { color: 'power', count: 4, speed: 40 + i * 6, stroke: 'none', r: 2 }));
    });
    const ch = G('data', g);
    R(ch, 60, 426, 900, 156, { fill: 'rgba(12,17,24,.9)', stroke: api.rgba('line', 1), rx: 10 });
    L(76, 448, 'Connections per mm² (log scale) — density = 1 / pitch²', { parent: ch, size: 12, weight: 700 });
    const data = [['C4 150 µm', 150], ['µbump 40 µm', 40], ['µbump 25 µm', 25], ['hybrid 9 µm', 9], ['hybrid 3 µm', 3]];
    const bars = [];
    data.forEach((d, i) => {
      const dens = 1e6 / (d[1] * d[1]), y = 462 + i * 22;
      L(76, y + 11, d[0], { parent: ch, size: 11, color: 'muted' });
      R(ch, 190, y, 620, 14, { fill: '#0a0e13', stroke: 'none', rx: 3 });
      bars.push([R(ch, 190, y, 0, 14, { fill: api.color(i > 2 ? 'accent' : 'mechanical'), stroke: 'none', rx: 3 }), Math.log10(dens) / 5.2]);
      L(940, y + 11, C.fmt(dens, 3) + ' /mm²', { parent: ch, size: 11, anchor: 'end', mono: true });
    });
    api.loop((dt, t) => { const e = 1 - Math.pow(1 - Math.min(1, t / 1.4), 3); bars.forEach(([b, v]) => b.setAttribute('width', (620 * v * e).toFixed(1))); });
  }

  // ================================================================ TSV
  function sceneTSV(g, api) {
    const { A, G, R, L, flow } = H(api);
    const m = G('mechanical', g);
    R(m, 120, 200, 620, 260, { fill: 'url(#g-silicon)', stroke: api.rgba('data', 0.4), rx: 4 });
    L(130, 452, 'Si interposer, thinned to ~100 µm', { parent: m, size: 11, color: 'muted' });
    const rdl = G('data', g);
    R(rdl, 120, 140, 620, 60, { fill: '#18222f', stroke: api.rgba('data', 0.4), rx: 2 });
    for (let i = 0; i < 4; i++) for (let x = 130; x < 720; x += 26 + i * 6) R(rdl, x, 146 + i * 13, 14 + i * 3, 5, { fill: 'url(#g-copper)', stroke: 'none', rx: 1 });
    L(752, 175, 'RDL: Cu layers, ~0.4–2 µm L/S', { parent: rdl, size: 11, color: 'data' });
    const mb = G('mechanical', g);
    for (let x = 150; x < 730; x += 40) { A('rect', { x: x, y: 112, width: 18, height: 22, fill: 'url(#g-copper)' }, mb); A('rect', { x: x, y: 134, width: 18, height: 6, fill: 'url(#g-solder)' }, mb); }
    L(752, 128, 'µbumps to dies above', { size: 11, color: 'muted' });
    const tsvs = [200, 330, 460, 590];
    const tg = G('power', g);
    tsvs.forEach(x => {
      A('rect', { x: x - 34, y: 200, width: 88, height: 260, fill: 'url(#p-hatch)', opacity: 0.35 }, tg);
      A('rect', { x: x - 2, y: 200, width: 24, height: 260, fill: '#c9d4e2', opacity: 0.5 }, tg);
      A('rect', { x: x + 1, y: 200, width: 18, height: 260, fill: 'url(#g-copper)' }, tg);
    });
    L(166, 194, 'keep-out zone', { size: 10, color: 'warn' });
    const c4 = G('mechanical', g);
    for (let x = 160; x < 720; x += 65) A('ellipse', { cx: x + 50, cy: 482, rx: 24, ry: 20, fill: 'url(#g-solder)' }, c4);
    L(752, 486, 'C4 to substrate', { size: 11, color: 'muted' });
    [tsvs[0], tsvs[2]].forEach(x => flow(tg, 'M' + (x + 10) + ' 470 V 120', { color: 'power', count: 6, speed: 70, stroke: 'none', r: 2.6 }));
    const dg = G('data', g);
    [tsvs[1], tsvs[3]].forEach(x => flow(dg, 'M' + (x + 10) + ' 470 V 165 H ' + (x + 90) + ' V 120', { color: 'data', count: 5, speed: 90, stroke: 'none', r: 2.4 }));
    flow(dg, 'M160 172 H 720', { color: 'data', count: 10, speed: 120, stroke: 'none', r: 2 });
    const an = G('data', g);
    R(an, 760, 215, 228, 220, { fill: 'rgba(12,17,24,.92)', stroke: api.rgba('line', 1), rx: 10 });
    ['TSV Ø 5–10 µm, depth 50–100 µm', 'aspect ratio ~10:1', 'SiO₂ liner + barrier + Cu fill', 'R ≈ 10s of mΩ, C ≈ 30–100 fF', 'Cu CTE 17 vs Si 2.6 ppm/K', '→ stress, Cu pumping, KOZ', 'power + signals pass vertically', 'between substrate and dies']
      .forEach((t, i) => L(774, 240 + i * 23, t, { parent: an, size: 11.5, color: i % 2 ? 'muted' : 'text' }));
    L(120, 96, 'Cross-section, not to scale', { size: 11, color: 'muted' });
  }

  nodes.push({
    id: 'switch-package', parent: 'switch-chassis', level: 2, domain: 'data',
    title: 'Switch Package (ASIC + Optical Engines)',
    subtitle: 'ASIC ringed by co-packaged silicon-photonics engines on one substrate',
    summary: 'The heart of a CPO switch: the switch ASIC in the middle of a large package substrate, surrounded by optical engines. Each engine sits millimetres from the ASIC edge, so the ASIC SerDes drive only a tiny electrical channel. Fibers leave each engine toward the front panel; CW laser light comes in from external lasers.',
    what: '<p><b>Geometry.</b> The ASIC\'s SerDes sit around its perimeter ("beachfront"); engines face those edges on the substrate. Lanes per mm of die edge × edge length bounds total I/O — which is why engines ring all four sides.</p>' +
      '<p><b>Optical engine</b> = electronic IC (drivers, TIAs, control, heater DACs) stacked on a photonic IC (waveguides, ' + T('MRM', 'micro-ring modulators') + ', Ge photodetectors, couplers) using TSMC ' + T('SoIC') + ' — the TSMC ' + T('COUPE') + ' approach, 1.6 Tb/s-class engines ' + B('nv') + ' (e.g. 8 × 200G lanes ' + B('typ') + ').</p>' +
      '<p><b>ASIC→EIC link.</b> A few mm of substrate routing: low loss and crosstalk, so the SerDes can be a short-reach design with light equalization instead of a long-reach ADC/DSP receiver.</p>' +
      '<p><b>Mechanical.</b> A large organic substrate (thousands of BGA balls) with a stiffener ring fights warpage; the cold plate must contact ASIC and engines without stressing fiber attach. Fiber connectivity is detachable ' + B('nv') + ' so packages can be assembled, tested and serviced.</p>',
    needs: ['Known-good-die and known-good-engine before attach (package yield multiplies)', 'Low-warpage substrate so all bumps and balls join', 'Thermal co-design: ASIC hot spot vs ring-stable engines', 'Separate clean rails: ASIC core, SerDes analog, EIC, ring heaters', 'Low-loss, strain-relieved fiber attach'],
    interfaces: [
      { with: 'asic-die', type: 'electrical', detail: 'Flip-chip bumps: core power, SerDes lanes, clocks, PCIe/mgmt' },
      { with: 'optical-engine', type: 'electrical', detail: 'mm-scale 200G lanes ASIC→EIC; control/telemetry' },
      { with: 'package-substrate', type: 'mechanical', detail: 'Bumps → build-up layers → BGA to PCB' },
      { with: 'external-laser', type: 'optical', detail: 'CW light into the engines' },
      { with: 'fiber-plant', type: 'optical', detail: 'Modulated light to/from the front panel' },
      { with: 'thermal-system', type: 'thermal', detail: 'Cold plate over ASIC and engines' }
    ],
    kpis: [
      { name: 'Engine class', value: '1.6 Tb/s', tag: 'nv', note: 'silicon photonics, micro-ring modulators' },
      { name: 'Integration', value: 'TSMC COUPE / SoIC', tag: 'nv', note: 'EIC stacked on PIC' },
      { name: 'ASIC→EIC channel', value: 'few dB', tag: 'typ', note: 'vs ~30 dB pluggable host path' },
      { name: 'Short-reach SerDes', value: '~1–2 pJ/b', tag: 'est', note: 'vs ~5+ pJ/b long-reach' },
      { name: 'Engines for 115 Tb/s', value: '≈72', tag: 'est', note: 'derived: 115.2 T / 1.6 T' }
    ],
    physics: '<div class="eq">Package yield ≈ y_ASIC · y_OE^N\n  N = 72, y_OE = 0.999 → 0.93      y_OE = 0.99 → 0.48\nShort route loss ≈ 5 mm × ~0.3 dB/mm ≈ 1.5 dB  (vs ≥25 dB pluggable host channel)  [typ]</div>' +
      '<p>Yield compounding is why wafer-level optical test and known-good engines are essential, and why lasers (the least reliable part) stay outside the package.</p>',
    failures: ['Engine defect after attach → whole package scrapped → KGD/KGE testing, rework strategy', 'Warpage at reflow → non-wet / bridged joints → stiffener, CTE engineering, reflow profile', 'Thermal gradient across engines → rings drift differently → per-ring heater lock, heat spreading', 'Fiber-attach shift (creep, thermal) → coupling loss → robust attach, loss monitoring'],
    monitoring: ['On-die temperature sensors in ASIC and EICs', 'Per-lane BER/FEC; per-ring heater power and monitor-PD currents', 'Optical power arriving from the ELS at each engine'],
    scene: scenePackage,
    hotspots: [{ target: 'asic-die', x: 440, y: 210, w: 180, h: 180, label: 'Switch ASIC die' }]
      .concat(packageOEs().map((o, i) => ({ target: 'optical-engine', x: o.x, y: o.y, w: o.w, h: o.h, label: 'Optical engine #' + (i + 1) })))
      .concat([{ target: 'package-substrate', x: 676, y: 452, w: 74, h: 72, label: 'Package substrate & PDN' }])
  });

  nodes.push({
    id: 'package-substrate', parent: 'switch-package', level: 3, domain: 'mechanical',
    title: 'Package Substrate & Interconnect',
    subtitle: 'BGA → build-up substrate → C4 → interposer/bridge → µbumps → die',
    summary: 'The substrate is the multilayer circuit board inside the package: it fans thousands of die bumps out to a 1 mm-pitch ball grid, delivers hundreds of amps, routes the short ASIC-to-engine links, and must stay flat while materials with very different thermal expansion heat and cool.',
    what: '<p><b>Stack (bottom-up):</b> PCB → ' + T('BGA') + ' (~1 mm pitch) → organic substrate: glass-epoxy core with plated through-holes plus ' + T('ABF') + ' build-up layers (line/space ~8–15 µm) → ' + T('C4') + ' bumps (~130–200 µm) → optional silicon interposer/bridge with ' + T('TSV') + 's and fine ' + T('RDL') + ' → µbumps (~25–55 µm) → die. Engines stack EIC on PIC by hybrid bonding (' + T('SoIC') + ') ' + B('nv') + '.</p>' +
      '<p><b>Power.</b> Hundreds of balls and thousands of bumps carry power/ground. Substrate decaps plus on-die MIM/deep-trench caps keep the ' + T('PDN') + ' impedance flat from kHz to GHz.</p>' +
      '<p><b>Warpage.</b> Si (2.6 ppm/K) on organic substrate (~10–17 ppm/K): cooling from reflow bows the stack. Countermeasures: stiffener ring or lid, thick/low-CTE core, symmetric build-up. Too much warpage → non-wet opens or bridges at board assembly; thermal cycling → solder fatigue.</p>' +
      '<p><b>SI.</b> For CPO the ASIC→engine route is mm-scale. In pluggable designs the package alone costs several dB at 53 GHz, and via stubs/BGA transitions cause reflections.</p>',
    needs: ['Low warpage across reflow → operation → storage temperatures', 'Low-loss dielectric (low Df) and smooth copper for 53 GHz', 'Enough power/ground balls and bumps to stay below EM current-density limits', 'Low PDN impedance: Z_target = ΔV/ΔI across a wide band', 'Fine-pitch routing near the die (interposer/bridge where needed)'],
    interfaces: [
      { with: 'asic-die', type: 'electrical', detail: 'C4/µbumps: power and signals' },
      { with: 'optical-engine', type: 'electrical', detail: 'mm routes to EICs; engine power' },
      { with: 'PCB', type: 'mechanical', detail: 'BGA solder joints' },
      { with: 'power-delivery', type: 'power', detail: 'VRM planes → BGA power balls' },
      { with: 'thermal-system', type: 'thermal', detail: 'Lid / cold plate via TIM' }
    ],
    kpis: [
      { name: 'BGA pitch', value: '~1.0 mm', tag: 'typ', note: '' },
      { name: 'C4 pitch', value: '130–200 µm', tag: 'typ', note: '' },
      { name: 'µbump pitch', value: '25–55 µm', tag: 'typ', note: '' },
      { name: 'Hybrid-bond pitch', value: '≤ ~9 µm', tag: 'typ', note: 'SoIC-class' },
      { name: 'Warpage target', value: '< ~100 µm', tag: 'typ', note: 'large bodies at reflow' },
      { name: 'PDN target Z', value: '~0.1 mΩ', tag: 'est', note: '3% of 0.75 V for a 200 A step' }
    ],
    physics: '<div class="eq">Mismatch strain     ε = Δα·ΔT = (15 − 2.6)e-6 × 200 K ≈ 2.5e-3\nBilayer curvature   κ ≈ 6·E_f·t_f·Δα·ΔT / (E_s·t_s²)     warpage w ≈ κ·L²/8\nPDN target          Z_t = V_dd·ripple / ΔI = 0.75 × 0.03 / 200 ≈ 0.11 mΩ\nSolder fatigue      N_f ∝ (Δγ)^-n , n ≈ 2   (Coffin–Manson)</div>',
    failures: ['Warpage → BGA non-wet / head-in-pillow → stiffener, CTE engineering, reflow profiling', 'C4/BGA fatigue under thermal cycling → cracked joints → underfill, joint geometry', 'Electromigration in bumps → voids, opens → more power bumps, Cu pillars', 'Build-up delamination (moisture + reflow) → MSL control, bake', 'PDN anti-resonance → droop at a load-step frequency → decap placement, damping'],
    monitoring: ['Shadow-moiré warpage measurement during qualification', 'VRM remote sense at the package; on-die droop detectors', 'Daisy-chain resistance in thermal-cycle / HAST reliability tests'],
    scene: sceneSubstrate,
    hotspots: [
      { target: 'tsv-interposer', x: 330, y: 344, w: 340, h: 40, label: 'Si interposer with TSVs' },
      { target: 'microbumps', x: 470, y: 384, w: 200, h: 14, label: 'Bumps: C4, µbump, hybrid bond' },
      { target: 'asic-die', x: 380, y: 258, w: 240, h: 78, label: 'ASIC die' },
      { target: 'optical-engine', x: 168, y: 316, w: 134, h: 74, label: 'Optical engine (EIC on PIC)' }
    ]
  });

  nodes.push({
    id: 'microbumps', parent: 'package-substrate', level: 4, domain: 'mechanical',
    title: 'Bumps & Hybrid Bonding',
    subtitle: 'C4 → Cu-pillar µbump → Cu–Cu hybrid bond: pitch sets density and energy',
    summary: 'Each die-to-package connection is a tiny metal joint. Shrinking pitch from ~150 µm (C4) to ~40 µm (µbumps) to under 10 µm (hybrid bonding) raises connection density by up to ~1000× and cuts capacitance per joint — what makes EIC-on-PIC engines and wide die-to-die links energy-efficient.',
    what: '<p><b>C4</b>: SnAg solder spheres that collapse on reflow; warpage-tolerant, ~100 µm tall. <b>Cu-pillar µbumps</b>: Cu post + thin solder cap; finer pitch, better electromigration. <b>Hybrid bonding</b> (' + T('SoIC') + '): planarized oxide surfaces bond at room temperature, then an anneal expands and fuses the Cu pads — no solder, few-µm pitch, ~fF parasitics.</p>' +
      '<p>Energy per toggle ∝ C·V²: going from tens of fF (bump + pad + ESD) to a few fF lets die-to-die interfaces approach ≪0.1 pJ/b ' + B('typ') + '.</p>',
    needs: ['Co-planarity and particle-free surfaces (hybrid bonding fails on sub-µm particles)', 'Underfill for C4/µbumps to share CTE strain', 'Current density below EM limits', 'Alignment accuracy ≪ pitch (sub-µm for hybrid bonding)'],
    interfaces: [{ with: 'package-substrate', type: 'mechanical', detail: 'C4 field' }, { with: 'tsv-interposer', type: 'electrical', detail: 'µbumps on RDL' }, { with: 'optical-engine', type: 'electrical', detail: 'EIC↔PIC hybrid bond' }],
    kpis: [
      { name: 'C4', value: '~150 µm · 44/mm²', tag: 'typ', note: '' },
      { name: 'µbump', value: '~40 µm · 625/mm²', tag: 'typ', note: '' },
      { name: 'Hybrid bond', value: '~9 µm · 12k/mm²', tag: 'typ', note: '3 µm → 111k/mm²' },
      { name: 'Joint capacitance', value: 'few fF vs 10s fF', tag: 'typ', note: '' }
    ],
    physics: '<div class="eq">Density            n = 1 / p²\nDynamic energy     E = α·C·V²\nEM lifetime (Black) MTTF = A·J^-n·exp(Ea/kT),  n ≈ 1–2, Ea ≈ 0.8–1 eV</div>',
    failures: ['Bump EM void → open → current-density rules, Cu pillars', 'Solder bridging at fine pitch → shorts → controlled solder volume', 'Hybrid-bond voids from particles/topography → opens → cleanroom, CMP control', 'Underfill voids/cracks → fatigue → process control, CSAM/X-ray'],
    monitoring: ['Daisy-chain resistance in reliability tests', 'Acoustic microscopy (CSAM) and X-ray for voids', 'In system: lane BER and rail resistance drift'],
    scene: sceneBumps
  });

  nodes.push({
    id: 'tsv-interposer', parent: 'package-substrate', level: 4, domain: 'mechanical',
    title: 'Silicon Interposer & TSVs',
    subtitle: 'Fine RDL routing above, copper TSVs through, C4 below',
    summary: 'A silicon interposer is a thin passive silicon die with very fine wiring between dies and the organic substrate. Through-silicon vias carry power and signals vertically. It enables thousands of fine-pitch die-to-die connections, at the cost of area, money and thermo-mechanical stress.',
    what: '<p>Interposers (or small embedded bridges) provide ' + T('RDL') + ' with ~0.4–2 µm line/space, far denser than organic build-up. ' + T('TSV') + 's are deep-etched, oxide-lined, barrier-coated and Cu-filled; the wafer is then thinned to reveal them.</p>' +
      '<p>Cu expands ~6.5× more than Si, so stress around each TSV shifts transistor mobility — hence a ' + T('KOZ') + '. Whether a given CPO product uses an interposer is not public; the diagram is illustrative ' + B('est') + '.</p>',
    needs: ['Low TSV resistance for power, low capacitance for signals', 'KOZ around TSVs for active devices', 'Thin-wafer handling (temporary carrier bonding)'],
    interfaces: [{ with: 'microbumps', type: 'electrical', detail: 'µbumps on top' }, { with: 'package-substrate', type: 'electrical', detail: 'C4 below' }],
    kpis: [
      { name: 'TSV diameter', value: '5–10 µm', tag: 'typ', note: '' },
      { name: 'Aspect ratio', value: '~10:1', tag: 'typ', note: '' },
      { name: 'TSV capacitance', value: '30–100 fF', tag: 'typ', note: 'liner dependent' },
      { name: 'RDL L/S', value: '0.4–2 µm', tag: 'typ', note: '' }
    ],
    physics: '<div class="eq">R_TSV = ρ·h / (π r²) = 1.7e-8 × 100e-6 / (π·(5e-6)²) ≈ 22 mΩ   (10 µm Ø)\nC_TSV ≈ 2π·ε_ox·h / ln(r_ox / r_cu)\nThermal stress σ ≈ E·Δα·ΔT / (1 − ν)  → mobility shift inside the KOZ</div>',
    failures: ['TSV voids from incomplete fill → high R / opens → plating optimization', 'Cu pumping after anneal → RDL cracks → pre-CMP anneal', 'Wafer breakage in thinning → yield loss → carrier processes'],
    monitoring: ['Kelvin TSV chains on test structures', 'Inline X-ray and cross-sections', 'In system: rail voltage and lane margins'],
    scene: sceneTSV
  });

  // ================================================================ ASIC DIE floorplan
  function sceneDie(g, api) {
    const { A, G, R, L, flow } = H(api);
    const die = G('mechanical', g);
    R(die, 170, 60, 660, 500, { fill: 'url(#g-die)', stroke: api.color('accent'), sw: 2, rx: 4, a: { filter: 'url(#shadow)' } });
    A('rect', { x: 170, y: 60, width: 660, height: 500, rx: 4, fill: 'url(#p-grid)', opacity: 0.4 }, die);
    // SerDes ring
    const sd = G('data', g);
    const lanes = [];
    for (let i = 0; i < 14; i++) {
      for (const x of [172, 792]) { const r = R(sd, x, 102 + i * 30, 36, 26, { fill: '#0f2430', stroke: api.rgba('data', 0.6), rx: 2 }); lanes.push(r); }
    }
    for (let i = 0; i < 18; i++) for (const y of [62, 522]) lanes.push(R(sd, 212 + i * 32, y, 28, 36, { fill: '#0f2430', stroke: api.rgba('data', 0.6), rx: 2 }));
    L(190, 330, 'SerDes PHY', { parent: sd, size: 10, color: 'data', anchor: 'middle' }).setAttribute('transform', 'rotate(-90 190 330)');
    // PLLs in corners
    const cl = G('control', g);
    for (const [x, y] of [[172, 62], [792, 62], [172, 522], [792, 522]]) { R(cl, x, y, 36, 36, { fill: '#1d1636', stroke: api.color('control'), rx: 3 }); L(x + 18, y + 22, 'PLL', { parent: cl, size: 9.5, anchor: 'middle', color: 'control' }); }
    // pipelines
    const pp = G('data', g);
    for (const [x0, name] of [[225, 'Ingress'], [640, 'Egress']]) {
      for (let c = 0; c < 4; c++) for (let s = 0; s < 11; s++) R(pp, x0 + c * 34, 122 + s * 34, 28, 28, { fill: s === 0 || s === 10 ? '#1b2a1e' : '#14202c', stroke: api.rgba('accent', 0.35), rx: 2 });
      L(x0 + 66, 116, name + ' pipelines', { parent: pp, size: 11, anchor: 'middle', color: 'accent' });
    }
    // TM, buffer, crossbar
    const tm = G('data', g);
    R(tm, 380, 115, 240, 56, { fill: '#1b1630', stroke: api.rgba('control', 0.8), rx: 4 });
    L(500, 140, 'Traffic manager', { parent: tm, size: 13, anchor: 'middle', weight: 700 });
    L(500, 157, 'queues · schedulers · shapers · ECN', { parent: tm, size: 10, anchor: 'middle', color: 'muted' });
    const buf = G('data', g);
    const banks = [];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) banks.push(R(buf, 384 + i * 39.5, 188 + j * 42, 35, 37, { fill: '#122033', stroke: api.rgba('data', 0.45), rx: 2 }));
    L(500, 450, 'Shared packet buffer (SRAM banks)', { parent: buf, size: 11, anchor: 'middle', color: 'data' });
    const xb = G('data', g);
    R(xb, 380, 460, 240, 46, { fill: '#162418', stroke: api.rgba('accent', 0.6), rx: 4 });
    L(490, 488, 'crossbar / cell fabric', { parent: xb, size: 11.5, anchor: 'middle' });
    R(xb, 590, 466, 24, 24, { fill: 'url(#p-hatch)', stroke: api.color('accent'), rx: 1 });
    // packets
    const pk = G('data', g);
    for (let i = 0; i < 8; i++) {
      const yin = 120 + i * 50, yout = 140 + ((i * 3) % 8) * 48, yb = 205 + (i % 6) * 42;
      const p = A('path', { d: 'M195 ' + yin + ' H 240 C 300 ' + yin + ', 330 ' + yb + ', 400 ' + yb + ' H 600 C 650 ' + yb + ', 640 ' + yout + ', 700 ' + yout + ' H 805', fill: 'none', stroke: 'rgba(34,211,238,.12)', 'stroke-width': 1 }, pk);
      api.particlesAlong(p, { color: i % 3 ? 'data' : 'accent', count: 3, speed: 120 + i * 9, r: 2.6, jitter: 0.6 });
    }
    api.loop((dt, t) => {
      banks.forEach((b, i) => b.setAttribute('fill-opacity', (0.55 + 0.45 * Math.max(0, Math.sin(t * 3 + i * 1.91))).toFixed(2)));
      lanes.forEach((l, i) => l.setAttribute('stroke-opacity', (0.35 + 0.65 * Math.max(0, Math.sin(t * 5 + i * 0.6))).toFixed(2)));
    });
  }

  // ================================================================ SERDES
  function sceneSerdes(g, api) {
    const { A, G, R, L, flow, box } = H(api);
    L(40, 92, 'TRANSMIT', { size: 12, weight: 700, color: 'data' });
    L(40, 412, 'RECEIVE', { size: 12, weight: 700, color: 'data' });
    const tx = G('data', g);
    const txb = [[40, 'Parallel data', 'e.g. 128b @ ~1.7 GHz'], [160, 'Serializer', 'MUX tree'], [280, 'PAM4 map', 'Gray coded'], [390, 'TX FFE', '3–6 taps, DAC'], [530, 'Driver', '~0.8–1 Vppd']];
    txb.forEach(([x, t, s], i) => box(tx, x, 110, i === 3 ? 120 : (i === 4 ? 90 : 100), 70, t, s, 'data', { fs: 13 }));
    [[140, 160], [260, 280], [380, 390], [510, 530]].forEach(([a, b]) => flow(tx, 'M' + a + ' 145 H ' + b, { color: 'data', count: 2, speed: 40, arrow: true }));
    // channel
    const ch = G('data', g);
    const cp = flow(ch, 'M620 145 H 700 C 800 145, 760 230, 850 250 S 900 380, 800 400 S 700 465, 620 465', { color: 'data', count: 9, speed: 120, sw: 5, alpha: 0.22, r: 3 });
    cp.setAttribute('stroke-linecap', 'round');
    R(ch, 812, 270, 170, 82, { fill: 'rgba(12,17,24,.92)', stroke: api.rgba('line', 1), rx: 8 });
    L(822, 290, 'Channel @ 53 GHz', { parent: ch, size: 11.5, weight: 700 });
    L(822, 308, 'CPO: few dB (XSR-class)', { parent: ch, size: 10.5, color: 'good' });
    L(822, 324, 'pluggable host: 25–40 dB', { parent: ch, size: 10.5, color: 'warn' });
    L(822, 340, 'package + PCB + connector', { parent: ch, size: 10, color: 'muted' });
    const rx = G('data', g);
    const rxb = [[530, 'CTLE + VGA', 'analog peaking', 90], [410, 'ADC', '6–8 b, >100 GS/s', 100], [270, 'DSP EQ', 'FFE · DFE/MLSD', 120], [160, 'CDR', 'phase detect', 90], [40, 'Deserializer', '→ FEC / MAC', 100]];
    rxb.forEach(([x, t, s, w]) => box(rx, x, 430, w, 70, t, s, 'data', { fs: 13 }));
    [[530, 510], [410, 390], [270, 250], [160, 140]].forEach(([a, b]) => flow(rx, 'M' + a + ' 465 H ' + b, { color: 'data', count: 2, speed: 40, arrow: true }));
    // PLL + clocks
    const cl = G('control', g);
    box(cl, 40, 250, 150, 70, 'PLL (LC VCO)', '~53 GHz class clock', 'control', { fs: 13 });
    flow(cl, 'M190 270 H 210 V 180', { color: 'control', count: 3, speed: 50, dash: '4 3', alpha: 0.6 });
    flow(cl, 'M190 300 H 460 V 430', { color: 'control', count: 4, speed: 50, dash: '4 3', alpha: 0.6 });
    flow(cl, 'M205 430 V 330 H 190', { color: 'control', count: 2, speed: 30, dash: '4 3', alpha: 0.6 });
    L(470, 380, 'sampling phase from CDR', { parent: cl, size: 10, color: 'control' });
    // eye
    eye(api, g, 520, 225, 150, 110, { sigma: 0.045, isi: 0.06, jitter: 0.02, title: 'RX eye after EQ (PAM4)' });
    L(595, 352, '3 eyes → 2 bits / symbol', { size: 10, color: 'muted', anchor: 'middle' });
  }

  function sceneFFE(g, api) {
    const { A, G, R, L, flow } = H(api);
    const st = G('data', g);
    L(40, 92, 'TX FFE: y[n] = Σ c_k · x[n−k]   (FIR on symbols, implemented in DAC-based driver)', { size: 13, weight: 700 });
    flow(st, 'M40 140 H 120', { color: 'data', count: 2, speed: 40, arrow: true });
    L(40, 130, 'x[n]', { parent: st, size: 12, color: 'data', mono: true });
    const taps = [];
    for (let i = 0; i < 4; i++) {
      const x = 120 + i * 190;
      if (i < 3) { R(st, x + 70, 120, 60, 40, { fill: '#122033', stroke: api.color('data'), rx: 4 }); L(x + 100, 145, 'z⁻¹', { parent: st, size: 13, anchor: 'middle', mono: true }); flow(st, 'M' + (x + 130) + ' 140 H ' + (x + 190), { color: 'data', count: 1, speed: 40 }); flow(st, 'M' + x + ' 140 H ' + (x + 70), { color: 'data', count: 1, speed: 40 }); }
      A('line', { x1: x, x2: x, y1: 140, y2: 196, stroke: api.rgba('data', 0.6) }, st);
      A('circle', { cx: x, cy: 210, r: 14, fill: '#0b1520', stroke: api.color('accent') }, st);
      L(x, 215, '×', { parent: st, size: 14, anchor: 'middle', color: 'accent' });
      taps.push(L(x + 20, 205, '', { parent: st, size: 11, mono: true, color: 'accent' }));
      flow(st, 'M' + x + ' 224 V 250 H 500', { color: 'data', count: 1, speed: 30, alpha: 0.3 });
    }
    A('circle', { cx: 500, cy: 268, r: 16, fill: '#0b1520', stroke: api.color('accent') }, st);
    L(500, 274, 'Σ', { parent: st, size: 16, anchor: 'middle', color: 'accent' });
    flow(st, 'M516 268 H 620', { color: 'data', count: 2, speed: 40, arrow: true });
    L(630, 272, '→ DAC driver → channel', { parent: st, size: 12, color: 'muted' });
    // pulse responses
    const h = [0.07, 0.5, 0.3, 0.15, 0.07, 0.03, 0.01];
    const p1 = plot(api, g, 60, 320, 420, 240, { title: 'Pulse response at RX: no TX FFE', xl: 'cursor (UI)', domain: 'data' });
    const p2 = plot(api, g, 520, 320, 420, 240, { title: 'With TX FFE (pre/post-cursor taps)', xl: 'cursor (UI)', domain: 'data' });
    const mk = (p, x0) => h.map((v, i) => ({ line: api.add('line', { x1: x0 + 40 + i * 52, x2: x0 + 40 + i * 52, y1: 500, y2: 500, stroke: api.color(i === 1 ? 'accent' : 'warn'), 'stroke-width': 4, 'stroke-linecap': 'round' }, p.g), dot: api.add('circle', { cx: x0 + 40 + i * 52, cy: 500, r: 4, fill: api.color(i === 1 ? 'accent' : 'warn') }, p.g) }));
    [p1, p2].forEach((p, k) => api.add('line', { x1: k ? 530 : 70, x2: k ? 930 : 470, y1: 500, y2: 500, stroke: api.rgba('muted', 0.6) }, p.g));
    const s1 = mk(p1, 60), s2 = mk(p2, 520);
    const isiTxt = [L(76, 548, '', { size: 11.5, color: 'warn', mono: true }), L(536, 548, '', { size: 11.5, color: 'good', mono: true })];
    const set = (stems, y) => { const m = Math.max.apply(null, y.map(Math.abs)) || 1; stems.forEach((s, i) => { const yy = 500 - (y[i] || 0) / 0.6 * 150; s.line.setAttribute('y2', yy.toFixed(1)); s.dot.setAttribute('cy', yy.toFixed(1)); }); return y; };
    const isi = y => { const m = y[1]; let s = 0; y.forEach((v, i) => { if (i !== 1) s += Math.abs(v); }); return s / Math.abs(m); };
    set(s1, h); isiTxt[0].textContent = 'ISI/main = ' + isi(h).toFixed(2);
    api.loop((dt, t) => {
      const a = 0.5 + 0.5 * Math.sin(t * 0.8);
      const c = [-0.14 * a, 1, -0.55 * a, -0.12 * a];
      const norm = c.reduce((s, v) => s + Math.abs(v), 0);
      const cn = c.map(v => v / norm);
      const y = h.map((_, n) => { let s = 0; for (let k = 0; k < 4; k++) { const idx = n - k + 1; if (idx >= 0 && idx < h.length) s += cn[k] * h[idx]; } return s; });
      const ys = y.map(v => v * 1.9);
      set(s2, ys);
      isiTxt[1].textContent = 'ISI/main = ' + isi(ys).toFixed(2) + '  (peak power ÷' + norm.toFixed(2) + ')';
      ['c₋₁', 'c₀', 'c₁', 'c₂'].forEach((n, i) => { taps[i].textContent = n + '=' + cn[i].toFixed(2); });
    });
  }

  function sceneCTLE(g, api) {
    const { A, G, R, L, flow, box } = H(api);
    const p = plot(api, g, 40, 80, 470, 300, { title: 'Frequency response (dB) vs f (0–60 GHz)', xl: 'f → 53 GHz Nyquist', domain: 'data' });
    const X = f => p.X(f, 0, 60), Y = d => p.Y(d, -40, 20);
    api.add('line', { x1: X(53), x2: X(53), y1: 80, y2: 380, stroke: api.rgba('warn', 0.6), 'stroke-dasharray': '4 4' }, p.g);
    api.add('line', { x1: 40, x2: 510, y1: Y(0), y2: Y(0), stroke: api.rgba('muted', 0.5) }, p.g);
    const pc = api.add('path', { fill: 'none', stroke: api.color('bad'), 'stroke-width': 2.4 }, p.g);
    const pe = api.add('path', { fill: 'none', stroke: api.color('data'), 'stroke-width': 2.4 }, p.g);
    const pt = api.add('path', { fill: 'none', stroke: api.color('accent'), 'stroke-width': 3, filter: 'url(#glow)' }, p.g);
    L(60, 402, '— channel', { size: 11.5, color: 'bad' }); L(160, 402, '— CTLE', { size: 11.5, color: 'data' }); L(240, 402, '— combined', { size: 11.5, color: 'accent' });
    const pk = L(360, 402, '', { size: 11.5, mono: true, color: 'muted' });
    // DFE diagram
    const d = G('data', g);
    L(560, 96, 'DFE: subtract post-cursor ISI using past decisions', { parent: d, size: 12.5, weight: 700 });
    A('circle', { cx: 600, cy: 160, r: 16, fill: '#0b1520', stroke: api.color('accent') }, d); L(600, 166, 'Σ', { parent: d, size: 15, anchor: 'middle', color: 'accent' });
    flow(d, 'M540 160 H 584', { color: 'data', count: 2, speed: 40, arrow: true });
    box(d, 650, 135, 90, 50, 'Slicer', '3 thresholds', 'data', { fs: 12 });
    flow(d, 'M616 160 H 650', { color: 'data', count: 1, speed: 40, arrow: true });
    flow(d, 'M740 160 H 960', { color: 'accent', count: 3, speed: 60, arrow: true });
    L(900, 150, 'â[n]', { parent: d, size: 12, mono: true, color: 'accent' });
    box(d, 760, 210, 70, 40, 'z⁻¹', '', 'data', { fs: 13, bar: false });
    box(d, 860, 210, 70, 40, 'z⁻¹', '', 'data', { fs: 13, bar: false });
    flow(d, 'M790 160 V 210', { color: 'accent', count: 1, speed: 30 });
    flow(d, 'M830 230 H 860', { color: 'accent', count: 1, speed: 30 });
    flow(d, 'M795 250 V 290 H 600 V 176', { color: 'warn', count: 3, speed: 50, arrow: true, dash: '4 3' });
    flow(d, 'M895 250 V 300 H 600', { color: 'warn', count: 2, speed: 50, dash: '4 3' });
    L(700, 318, '− h₁·â[n−1] − h₂·â[n−2]', { parent: d, size: 12, mono: true, color: 'warn' });
    L(560, 345, 'Long-reach 200G RX: ADC + 20–40-tap DSP FFE (+1-tap DFE or MLSD).', { parent: d, size: 10.5, color: 'muted' });
    L(560, 361, 'Short-reach CPO links: CTLE + few taps is often enough.', { parent: d, size: 10.5, color: 'muted' });
    let eqLevel = 0;
    eye(api, g, 560, 400, 200, 170, { sigma: () => 0.03 + 0.14 * (1 - eqLevel), isi: () => 0.35 * (1 - eqLevel), jitter: 0.02, traces: 40, rate: 3, title: 'eye at slicer' });
    const eqT = L(780, 430, '', { size: 12, mono: true, color: 'accent' });
    L(780, 455, 'Equalization boosts high-f noise and', { size: 10.5, color: 'muted' });
    L(780, 470, 'crosstalk too: SNR at the slicer, not', { size: 10.5, color: 'muted' });
    L(780, 485, 'eye height alone, sets BER.', { size: 10.5, color: 'muted' });
    api.loop((dt, t) => {
      const k = 0.5 + 0.5 * Math.sin(t * 0.6); // peaking amount 0..1
      eqLevel = k;
      const ch = [], ct = [], tot = [];
      const fz = 6 + (1 - k) * 30, fp1 = 55, fp2 = 90, gdc = -k * 14;
      for (let f = 0.5; f <= 60; f += 1) {
        const c = -(2.4 * Math.sqrt(f) + 0.24 * f);
        const m = gdc + 10 * Math.log10((1 + (f / fz) ** 2) / ((1 + (f / fp1) ** 2) * (1 + (f / fp2) ** 2)));
        ch.push([f, c]); ct.push([f, m]); tot.push([f, c + m]);
      }
      const dd = arr => 'M' + arr.map(([f, v]) => X(f).toFixed(1) + ' ' + Y(Math.max(-40, Math.min(20, v))).toFixed(1)).join(' L ');
      pc.setAttribute('d', dd(ch)); pe.setAttribute('d', dd(ct)); pt.setAttribute('d', dd(tot));
      const pk53 = tot[52][1] - tot[0][1];
      pk.textContent = 'peaking ' + (-gdc).toFixed(1) + ' dB · residual tilt ' + pk53.toFixed(1) + ' dB';
      eqT.textContent = 'EQ strength ' + (k * 100).toFixed(0) + '%';
    });
  }

  function scenePLL(g, api) {
    const { A, G, R, L, flow, box } = H(api);
    const pl = G('control', g);
    L(40, 92, 'PLL: lock a low-noise LC VCO to a clean reference', { parent: pl, size: 13, weight: 700, color: 'control' });
    box(pl, 40, 120, 110, 56, 'REF', '156.25 MHz XO', 'control', { fs: 13 });
    box(pl, 190, 120, 100, 56, 'PFD', 'phase/freq', 'control', { fs: 13 });
    box(pl, 330, 120, 100, 56, 'Charge pump', '± I_cp', 'control', { fs: 12 });
    box(pl, 470, 120, 110, 56, 'Loop filter', 'R + C₁ ‖ C₂', 'control', { fs: 12 });
    box(pl, 620, 120, 120, 56, 'LC VCO', 'tens of GHz', 'control', { fs: 13 });
    box(pl, 400, 220, 120, 46, '÷ N', 'divider', 'control', { fs: 13 });
    [[150, 190], [290, 330], [430, 470], [580, 620]].forEach(([a, b]) => flow(pl, 'M' + a + ' 148 H ' + b, { color: 'control', count: 2, speed: 40, arrow: true }));
    flow(pl, 'M740 148 H 800 V 243 H 520', { color: 'control', count: 4, speed: 60, arrow: true });
    flow(pl, 'M400 243 H 240 V 176', { color: 'control', count: 3, speed: 50, arrow: true });
    flow(pl, 'M800 148 H 960', { color: 'accent', count: 4, speed: 100, arrow: true });
    L(880, 138, 'to TX / RX', { parent: pl, size: 11, color: 'accent', anchor: 'middle' });
    // phasor + lock
    const ph = G('control', g);
    A('circle', { cx: 880, cy: 230, r: 40, fill: 'none', stroke: api.rgba('control', 0.6) }, ph);
    const vec = A('line', { x1: 880, y1: 230, x2: 920, y2: 230, stroke: api.color('accent'), 'stroke-width': 3, 'stroke-linecap': 'round' }, ph);
    const ref = A('line', { x1: 880, y1: 230, x2: 920, y2: 230, stroke: api.rgba('control', 0.9), 'stroke-width': 2, 'stroke-dasharray': '3 2' }, ph);
    const lockT = L(880, 290, '', { parent: ph, size: 11, anchor: 'middle', mono: true });
    // CDR
    const cd = G('data', g);
    L(40, 320, 'CDR: steer the sampling phase to the eye centre', { parent: cd, size: 13, weight: 700, color: 'data' });
    eye(api, g, 40, 340, 300, 220, { sigma: 0.04, isi: 0.05, jitter: 0.025, traces: 40, rate: 3 });
    const samp = A('line', { x1: 190, x2: 190, y1: 340, y2: 560, stroke: api.color('accent'), 'stroke-width': 2, filter: 'url(#glow)' }, cd);
    L(360, 360, 'Bang-bang / Mueller–Müller phase detector', { parent: cd, size: 11.5 });
    L(360, 378, '→ digital loop filter → phase interpolator', { parent: cd, size: 11.5, color: 'muted' });
    L(360, 396, '(ADC-DSP RX: timing recovered from samples)', { parent: cd, size: 11.5, color: 'muted' });
    // jitter histogram
    const hp = plot(api, g, 600, 340, 360, 220, { title: 'Clock jitter histogram (random, Gaussian)', xl: 'time error', domain: 'control' });
    const bars = [];
    for (let i = 0; i < 31; i++) bars.push(api.add('rect', { x: 612 + i * 11, y: 560, width: 9, height: 0, fill: api.color('control'), opacity: 0.85 }, hp.g));
    const counts = new Array(31).fill(0);
    const jT = L(612, 388, 'σ_j ≈ 80 fs rms ⇒ 0.85% of a 9.4 ps UI', { size: 11, mono: true, color: 'muted' });
    api.loop((dt, t) => {
      const cyc = t % 8, err = Math.exp(-cyc * 0.9) * Math.cos(cyc * 3.2) * 1.4;
      const a = t * 4;
      ref.setAttribute('x2', (880 + 40 * Math.cos(a)).toFixed(1)); ref.setAttribute('y2', (230 + 40 * Math.sin(a)).toFixed(1));
      vec.setAttribute('x2', (880 + 40 * Math.cos(a + err)).toFixed(1)); vec.setAttribute('y2', (230 + 40 * Math.sin(a + err)).toFixed(1));
      lockT.textContent = Math.abs(err) < 0.05 ? 'LOCKED  Δφ≈0' : 'acquiring  Δφ=' + err.toFixed(2) + ' rad';
      const ph2 = Math.exp(-cyc * 0.7) * 70 * Math.cos(cyc * 2) + C.randn() * 3;
      samp.setAttribute('x1', (190 + ph2).toFixed(1)); samp.setAttribute('x2', (190 + ph2).toFixed(1));
      for (let k = 0; k < 6; k++) { const b = Math.round(15 + C.randn() * 4.5); if (b >= 0 && b < 31) counts[b]++; }
      const mx = Math.max.apply(null, counts);
      bars.forEach((r, i) => { const hh = counts[i] / mx * 160; r.setAttribute('y', (560 - hh).toFixed(1)); r.setAttribute('height', hh.toFixed(1)); });
      if (mx > 4000) for (let i = 0; i < 31; i++) counts[i] = Math.floor(counts[i] / 2);
    });
  }

  nodes.push({
    id: 'asic-die', parent: 'switch-package', level: 3, domain: 'data',
    title: 'Switch ASIC Die',
    subtitle: 'SerDes ring · pipelines · shared buffer · traffic manager · crossbar',
    summary: 'The switch ASIC is a huge, reticle-scale logic die (or set of chiplets). Its perimeter is lined with SerDes that move data on and off chip; inside, packet-processing pipelines parse and look up every header, a shared SRAM buffer absorbs bursts, and a traffic manager decides which packet leaves which port next.',
    what: '<p><b>Data path.</b> SerDes RX → PCS/FEC decode (' + T('KP4') + ') → MAC → <b>ingress pipeline</b> (parse, L2/L3 lookup, ACL, tunnel, telemetry) → write cells into the <b>shared buffer</b> → <b>traffic manager</b> enqueues to the egress port/class, applies congestion marking (' + T('ECN') + ') or flow control (' + T('PFC') + ' / IB credits) → <b>egress pipeline</b> (rewrite) → MAC → FEC encode → SerDes TX.</p>' +
      '<p><b>Floorplan logic.</b> SerDes must be at the edge (bump beachfront, analog isolation). The buffer is central because every port writes and reads it. Pipelines sit between I/O and buffer. PLLs/clock spines feed groups of lanes.</p>' +
      '<p><b>Scale.</b> 102.4 Tb/s at the minimum Ethernet frame (64 B + 20 B overhead) is ≈152 G packets/s; at ~1.5 GHz that means ~100 packets per clock across the chip — implemented as many parallel pipelines, each handling ≈1 packet/clock ' + B('est') + '.</p>' +
      '<p><b>Latency.</b> Cut-through forwarding starts transmitting after the header is processed instead of waiting for the full packet; port-to-port latency is sub-µs ' + B('typ') + '; FEC decode adds ~100 ns-class delay ' + B('typ') + '.</p>',
    needs: ['Enough beachfront for SerDes lanes (or dense bumps to OEs)', 'Low-noise power: separate analog SerDes rails, low-droop core PDN', 'Uniform cooling — hot spots shift timing and leakage', 'Clean reference clocks', 'Firmware/driver to configure tables, SerDes tuning, telemetry'],
    interfaces: [
      { with: 'serdes', type: 'electrical', detail: '200G PAM4 lanes to optical engines' },
      { with: 'package-substrate', type: 'electrical', detail: 'Bumps: core ~0.75 V at hundreds of A' },
      { with: 'control-plane', type: 'mgmt', detail: 'PCIe to host CPU; I²C/JTAG' },
      { with: 'thermal-system', type: 'thermal', detail: 'Hundreds of W through TIM to cold plate' }
    ],
    kpis: [
      { name: 'Capacity', value: '115.2 Tb/s', tag: 'nv', note: 'Quantum-X Photonics class' },
      { name: 'Lane rate', value: '200G PAM4', tag: 'nv', note: '~106 GBd' },
      { name: 'Packet rate @102.4T', value: '≈152 Gpps', tag: 'est', note: '64B frames' },
      { name: 'Port-to-port latency', value: 'sub-µs', tag: 'typ', note: 'cut-through' },
      { name: 'On-die buffer', value: 'tens–100s MB', tag: 'typ', note: 'shared SRAM' },
      { name: 'Process', value: 'N5/N4/N3-class', tag: 'typ', note: 'FinFET' }
    ],
    physics: '<div class="eq">Packet rate   R_pkt = C / ((L + 20 B)·8)        102.4e12 / (84·8) ≈ 1.52e11 /s\nParallelism   P = R_pkt / f_clk = 1.52e11 / 1.5e9 ≈ 100 packets/clock\nDynamic power P_dyn = α·C_sw·V²·f       Leakage P_leak = V·I_off(T)  (≈2× per +10–20 °C)</div>',
    failures: ['Hot spot → timing violations, leakage runaway → thermal sensors, throttling, floorplan spreading', 'Supply droop on load steps (traffic bursts) → bit errors in logic → PDN design, adaptive clocking', 'SRAM soft errors → corrupted packets/tables → ECC/parity, scrubbing', 'SerDes lane failure → port down → lane remap / degrade, FEC monitoring'],
    monitoring: ['Distributed on-die thermal diodes and voltage/droop monitors', 'Per-port counters: drops, ECN marks, queue depth histograms, FEC statistics', 'ECC error counters for buffers and tables'],
    scene: sceneDie,
    hotspots: [
      { target: 'serdes', x: 170, y: 100, w: 40, h: 420, label: 'SerDes PHY ring' },
      { target: 'serdes', x: 790, y: 100, w: 40, h: 420, label: 'SerDes PHY ring' },
      { target: 'pipeline-logic', x: 222, y: 118, w: 140, h: 380, label: 'Ingress pipelines' },
      { target: 'pipeline-logic', x: 636, y: 118, w: 140, h: 380, label: 'Egress pipelines' },
      { target: 'traffic-manager', x: 378, y: 113, w: 244, h: 60, label: 'Traffic manager' },
      { target: 'packet-buffer', x: 380, y: 184, w: 240, h: 256, label: 'Shared packet buffer' },
      { target: 'pll-cdr', x: 170, y: 60, w: 40, h: 40, label: 'PLL' },
      { target: 'transistor', x: 588, y: 464, w: 28, h: 28, label: 'Standard cells → transistor' }
    ]
  });

  nodes.push({
    id: 'serdes', parent: 'asic-die', level: 4, domain: 'data',
    title: 'SerDes (200G PAM4 PHY)',
    subtitle: 'Serialize → equalize → drive · receive → equalize → recover clock',
    summary: 'A SerDes lane turns wide, slow on-chip buses into a single ~106 GBd PAM4 stream and back. The transmitter pre-distorts the signal (FFE); the receiver amplifies high frequencies (CTLE), digitizes (ADC), equalizes in DSP and recovers the clock. In CPO the channel is so short that much of this machinery can be simplified.',
    what: '<p><b>TX:</b> parallel data → serializer (MUX tree) → ' + T('PAM4') + ' Gray mapping → ' + T('FFE') + ' (a few taps) → DAC-style driver (~0.8–1 Vppd differential) ' + B('typ') + '.</p>' +
      '<p><b>RX:</b> termination → ' + T('CTLE') + '/VGA → time-interleaved ' + T('ADC') + ' (6–8 bit, >100 GS/s) → ' + T('DSP') + ' FFE (tens of taps) + ' + T('DFE') + ' or ' + T('MLSD') + ' → slicer → ' + T('CDR') + ' → deserializer → FEC.</p>' +
      '<p><b>Clocking:</b> an LC-VCO ' + T('PLL') + ' per lane group produces the high-speed clock; RMS jitter must be ~≤100 fs because 1 % of a 9.4 ps ' + T('UI') + ' is 94 fs ' + B('typ') + '.</p>' +
      '<p><b>CPO vs pluggable:</b> a long-reach SerDes is designed for ~35–40 dB of loss and spends several pJ/b, mostly in ADC + DSP. A link of a few dB to a co-packaged EIC can use a much leaner analog or light-DSP receiver — the main source of CPO\'s electrical power saving ' + B('typ') + '.</p>',
    needs: ['Low-jitter clocks (PLL, clean supply)', 'Enough SNR at the slicer for pre-FEC BER below ~2.4e-4 (KP4)', 'Matched 100 Ω differential termination, low return loss (bump/ESD capacitance)', 'Quiet analog supply rails isolated from core switching noise', 'Adaptation firmware (link training, DSP tap convergence)'],
    interfaces: [
      { with: 'optical-engine', type: 'electrical', detail: 'Drives EIC modulator drivers; receives from TIAs' },
      { with: 'pipeline-logic', type: 'electrical', detail: 'Parallel data via PCS/FEC/MAC' },
      { with: 'pll-cdr', type: 'electrical', detail: 'TX clock, RX sampling phase' },
      { with: 'power-delivery', type: 'power', detail: 'Separate analog rails (e.g. ~0.75 V / 1.2 V)' }
    ],
    kpis: [
      { name: 'Lane rate', value: '200G PAM4', tag: 'nv', note: '200 Gb/s-per-lane class' },
      { name: 'Symbol rate', value: '~106–113 GBd', tag: 'typ', note: 'UI ≈ 9 ps' },
      { name: 'LR channel budget', value: '~35–40 dB', tag: 'typ', note: '@ Nyquist' },
      { name: 'LR energy', value: '~4–6 pJ/b', tag: 'est', note: 'ADC-DSP class' },
      { name: 'Short-reach energy', value: '~1–2 pJ/b', tag: 'est', note: '' },
      { name: 'Pre-FEC BER limit', value: '≈2.4e-4', tag: 'typ', note: 'KP4 RS(544,514)' },
      { name: 'Clock jitter', value: '≲100 fs rms', tag: 'typ', note: '' }
    ],
    physics: '<div class="eq">PAM4 levels {−3,−1,+1,+3}: eye height = 1/3 of NRZ swing → −9.5 dB SNR penalty\nSymbol error rate (Gaussian):  SER ≈ 2(1 − 1/M)·Q( √(3·SNR / (M² − 1)) ),  M = 4\nGray coding → BER ≈ SER / 2\nJitter → noise:  σ_v ≈ slope·σ_t  ⇒  random jitter eats vertical margin at fast edges</div>' +
      '<p>Equalization budget: TX FFE ~6–8 dB, CTLE ~10–15 dB, DSP FFE/DFE the rest. Every dB of boost also boosts noise and crosstalk, so SNR at the slicer degrades with channel loss even when the eye "looks" open.</p>',
    failures: ['Insufficient SNR (loss, crosstalk, reflections) → pre-FEC BER rises → FEC margin collapses → link flap → better channel (CPO), tuning, retrain', 'PLL lock loss / high jitter (supply noise) → burst errors → supply isolation, PLL monitoring', 'DSP adaptation stuck in a bad optimum → marginal link → retraining, tap-limit checks', 'ESD or bump damage → lane dead → lane remap'],
    monitoring: ['Per-lane pre-FEC BER, FEC codeword error histograms (bins of corrected symbols)', 'On-chip eye monitors / SNR estimates from the DSP', 'PLL lock detectors, CDR loop status', 'Link-training logs and tap values'],
    scene: sceneSerdes,
    hotspots: [
      { target: 'serdes-tx-ffe', x: 388, y: 106, w: 124, h: 78, label: 'TX FFE' },
      { target: 'transistor', x: 528, y: 106, w: 94, h: 78, label: 'Driver transistors' },
      { target: 'serdes-rx-ctle-dfe', x: 268, y: 426, w: 354, h: 78, label: 'RX: CTLE → ADC → DSP (FFE/DFE)' },
      { target: 'pll-cdr', x: 36, y: 246, w: 158, h: 78, label: 'PLL' },
      { target: 'pll-cdr', x: 156, y: 426, w: 98, h: 78, label: 'CDR' }
    ]
  });

  nodes.push({
    id: 'serdes-tx-ffe', parent: 'serdes', level: 5, domain: 'data',
    title: 'TX Feed-Forward Equalizer',
    subtitle: 'FIR pre-emphasis: pre-cursor and post-cursor taps cancel ISI before the channel',
    summary: 'The channel smears every symbol into its neighbours. A TX FFE sends each symbol together with small, negative-weighted copies of its neighbours, so after the channel\'s low-pass smearing the pulse arrives sharp. The cost: the peak swing is fixed, so the useful low-frequency amplitude shrinks.',
    what: '<p>y[n] = Σ c_k·x[n−k] with 1 pre-cursor tap (c₋₁), the main tap (c₀) and 1–4 post-cursor taps. In a DAC-based driver the taps are implemented by segmenting the output stage into weighted slices. Constraint: Σ|c_k| ≤ 1 (peak swing limited by supply), so de-emphasis reduces the main-cursor amplitude.</p>' +
      '<p>Tap values are negotiated during link training: the RX measures residual ' + T('ISI') + ' and asks the TX to step coefficients up or down (as in Ethernet clause-style training).</p>',
    needs: ['Linear, well-matched DAC slices', 'Fast, low-jitter edges', 'Link-training protocol to adapt taps'],
    interfaces: [{ with: 'serdes', type: 'electrical', detail: 'Driver output → channel' }, { with: 'serdes-rx-ctle-dfe', type: 'electrical', detail: 'Feedback via link training' }],
    kpis: [{ name: 'Taps', value: '3–6', tag: 'typ', note: '1 pre + main + posts' }, { name: 'EQ range', value: '~6–10 dB', tag: 'typ', note: '' }, { name: 'Swing', value: '~0.8–1.0 Vppd', tag: 'typ', note: '' }],
    physics: '<div class="eq">Received pulse   p[n] = Σ_k c_k·h[n−k]\nZero-forcing goal: p[n] = 0 for n ≠ 0 (main cursor)\nPeak constraint  Σ|c_k| = 1  ⇒ main amplitude = c₀·h₀ (de-emphasis loss)\nBoost at Nyquist (2-tap): |H(f_N)| / |H(0)| = (c₀ + |c₁|) / (c₀ − |c₁|)</div>',
    failures: ['Over-equalization → amplified crosstalk/noise and overshoot → adaptive training', 'Tap mismatch from DAC nonlinearity → residual ISI → calibration', 'Training failure → link stuck at defaults → retrain/fallback presets'],
    monitoring: ['Training logs of coefficients', 'RX SNR / eye metrics'],
    scene: sceneFFE
  });

  nodes.push({
    id: 'serdes-rx-ctle-dfe', parent: 'serdes', level: 5, domain: 'data',
    title: 'RX Equalization: CTLE, ADC-DSP, DFE',
    subtitle: 'Undo channel loss in analog, then digitally — without drowning in noise',
    summary: 'The receiver first boosts high frequencies with an analog CTLE (a zero below the poles), then digitizes and runs FIR and decision-feedback equalization. Together they flatten the channel response up to Nyquist and reopen the PAM4 eye — at the price of noise enhancement and power.',
    what: '<p><b>' + T('CTLE') + ':</b> source-degenerated differential pair; RC degeneration places a zero at f_z and poles at f_p → gain rises ~20 dB/dec between them. Typical peaking 10–15 dB ' + B('typ') + '.</p>' +
      '<p><b>' + T('ADC') + ' + DSP:</b> 64–128 time-interleaved SAR sub-ADCs, 6–8 bits; offsets/gains/timing skews between slices must be calibrated in background ' + B('typ') + '. Then a 20–40-tap FFE and a 1-tap ' + T('DFE') + ' or an ' + T('MLSD') + ' detector.</p>' +
      '<p><b>DFE:</b> subtracts h₁·â[n−1]… using past decisions: no noise boost, but a wrong decision feeds back (error propagation → burst errors that stress the RS FEC). The first tap must close within one UI (~9.4 ps) — hence loop-unrolled/speculative DFEs or DSP alternatives.</p>',
    needs: ['Low-noise, linear analog front-end', 'ADC ENOB of ~5–6 bits at full rate', 'Background calibration (interleaving skew, offsets)', 'Adaptive algorithms (LMS) for tap convergence'],
    interfaces: [{ with: 'serdes', type: 'electrical', detail: 'From termination/ESD; to CDR and deserializer' }, { with: 'pll-cdr', type: 'electrical', detail: 'Sampling clock phase' }],
    kpis: [{ name: 'CTLE peaking', value: '10–15 dB', tag: 'typ', note: '' }, { name: 'ADC', value: '6–8 b, >100 GS/s', tag: 'typ', note: 'time-interleaved SAR' }, { name: 'DSP FFE', value: '20–40 taps', tag: 'typ', note: 'long-reach' }, { name: 'RX power share', value: '>50% of LR SerDes', tag: 'est', note: 'ADC + DSP' }],
    physics: '<div class="eq">CTLE:  H(s) = A₀·(1 + s/ω_z) / ((1 + s/ω_p1)(1 + s/ω_p2))\nNoise enhancement (linear EQ):  σ²_out = σ²_in · (1/2π)∫|H_eq(ω)|² dω  ↑ with boost\nDFE:  y[n] = x[n] − Σ_{k=1..N} h_k·â[n−k]\nADC SQNR ≈ 6.02·ENOB + 1.76 dB</div>',
    failures: ['Over-peaking → noise/crosstalk amplification → adaptive CTLE code', 'DFE error propagation → error bursts beyond FEC → limit h₁ / MLSD', 'Interleaving skew drift with temperature → spurs → background calibration', 'ADC saturation (VGA mis-set) → clipping → AGC loop'],
    monitoring: ['DSP SNR / MSE estimate per lane', 'Tap values and adaptation convergence', 'FEC corrected-symbol histograms (burstiness)'],
    scene: sceneCTLE
  });

  nodes.push({
    id: 'pll-cdr', parent: 'serdes', level: 5, domain: 'control',
    title: 'PLL & Clock-Data Recovery',
    subtitle: 'Low-jitter clock synthesis and sampling-phase tracking',
    summary: 'The PLL multiplies a clean ~156 MHz reference up to tens of GHz with an LC oscillator. The CDR then continuously nudges the receiver\'s sampling phase so it stays in the centre of the eye despite frequency offset and wander between the two ends of the link.',
    what: '<p><b>' + T('PLL') + ':</b> ' + T('PFD') + ' → charge pump → loop filter → LC ' + T('VCO') + ' → ÷N back to the PFD. Inside the loop bandwidth the output follows the (clean) reference; outside, the VCO\'s own phase noise dominates. Bandwidth is chosen where the two noise profiles cross.</p>' +
      '<p><b>' + T('CDR') + ':</b> in ADC-DSP receivers the timing error is computed from samples (e.g. Mueller–Müller), filtered digitally and applied via a phase interpolator or by steering the ADC clock. It must track ±100s of ppm frequency offset and spread-spectrum while rejecting high-frequency jitter.</p>',
    needs: ['Very clean supply for VCO (supply pushing → jitter)', 'High-Q inductor, low-noise varactors', 'Stable loop dynamics over PVT', 'Clean reference clock distribution'],
    interfaces: [{ with: 'serdes', type: 'electrical', detail: 'TX serializer clock, RX sampling clocks' }, { with: 'control-plane', type: 'mgmt', detail: 'Lock status, calibration' }],
    kpis: [{ name: 'RMS jitter', value: '≲100 fs', tag: 'typ', note: 'integrated' }, { name: 'Reference', value: '156.25 MHz', tag: 'typ', note: '' }, { name: 'CDR tracking', value: '±100s ppm', tag: 'typ', note: '' }],
    physics: '<div class="eq">Type-II PLL:  ω_n = √(K_pd·K_vco / (N·C)) ,  ζ = (R/2)·√(K_pd·K_vco·C / N)\nJitter from phase noise: σ_t = (1/2πf₀)·√(2∫ L(f) df)\nJitter tolerance: CDR tracks low-frequency jitter (≤ loop BW); high-f jitter eats eye width</div>',
    failures: ['Loss of lock (supply glitch, temperature drift) → burst errors / link down → lock detect, VCO band recalibration', 'Excess jitter from coupled noise → BER floor → isolation, filtering', 'CDR slip under large offsets → error bursts → wider loop, frequency detector'],
    monitoring: ['Lock-detect status bits', 'VCO band/calibration codes, temperature compensation', 'BER versus phase-offset scans (eye-width margining)'],
    scene: scenePLL
  });

  // ================================================================ PACKET BUFFER
  function sceneBuffer(g, api) {
    const { A, G, R, L, flow } = H(api);
    const io = G('data', g);
    L(40, 92, 'INGRESS', { parent: io, size: 11.5, weight: 700, color: 'data' });
    L(960, 92, 'EGRESS', { parent: io, size: 11.5, weight: 700, color: 'data', anchor: 'end' });
    for (let i = 0; i < 8; i++) {
      const y = 120 + i * 38;
      R(io, 40, y - 12, 60, 24, { fill: '#122033', stroke: api.rgba('data', 0.6), rx: 4 }); L(70, y + 4, 'P' + i, { parent: io, size: 11, anchor: 'middle' });
      R(io, 900, y - 12, 60, 24, { fill: '#122033', stroke: api.rgba('data', 0.6), rx: 4 }); L(930, y + 4, 'P' + i, { parent: io, size: 11, anchor: 'middle' });
      const bj = 140 + ((i * 5) % 8) * 36;
      flow(io, 'M100 ' + y + ' C 200 ' + y + ', 240 ' + bj + ', 330 ' + bj, { color: 'data', count: 3, speed: 90 + i * 7, alpha: 0.25, jitter: 0.5 });
      const bo = 140 + ((i * 3 + 2) % 8) * 36;
      flow(io, 'M670 ' + bo + ' C 760 ' + bo + ', 800 ' + y + ', 900 ' + y, { color: 'accent', count: 3, speed: 90 + i * 5, alpha: 0.25, jitter: 0.5 });
    }
    const mem = G('data', g);
    R(mem, 320, 110, 360, 310, { fill: 'rgba(12,17,24,.9)', stroke: api.rgba('data', 0.7), rx: 10 });
    L(500, 132, 'Shared buffer — cells in SRAM banks (multi-bank for read+write BW)', { parent: mem, size: 11.5, anchor: 'middle', color: 'data' });
    const banks = [];
    for (let i = 0; i < 8; i++) for (let j = 0; j < 7; j++) banks.push(R(mem, 336 + i * 42, 146 + j * 38, 36, 32, { fill: '#122033', stroke: api.rgba('data', 0.4), rx: 2 }));
    // queues
    const q = G('data', g);
    R(q, 40, 440, 920, 140, { fill: 'rgba(12,17,24,.9)', stroke: api.rgba('line', 1), rx: 10 });
    L(56, 462, 'Egress queue occupancy (dynamic shared thresholds) — a microburst on P5', { parent: q, size: 12, weight: 700 });
    const qb = [];
    for (let i = 0; i < 8; i++) { R(q, 120 + i * 100, 476, 60, 92, { fill: '#0a0e13', stroke: api.rgba('line', 1), rx: 3 }); qb.push(R(q, 120 + i * 100, 568, 60, 0, { fill: api.color('data'), stroke: 'none', rx: 3 })); L(150 + i * 100, 489, 'P' + i, { parent: q, size: 10, anchor: 'middle', color: 'muted' }); }
    A('rect', { x: 110, y: 516, width: 800, height: 1.5, fill: api.color('warn') }, q);
    A('rect', { x: 110, y: 494, width: 800, height: 1.5, fill: api.color('bad') }, q);
    L(56, 520, 'ECN mark', { parent: q, size: 10, color: 'warn' });
    L(56, 498, 'XOFF / drop', { parent: q, size: 10, color: 'bad' });
    api.loop((dt, t) => {
      banks.forEach((b, i) => b.setAttribute('fill', Math.sin(t * 4 + i * 2.39) > 0.6 ? api.rgba('accent', 0.55) : Math.sin(t * 3 + i * 1.7) > 0.7 ? api.rgba('data', 0.5) : '#122033'));
      qb.forEach((b, i) => {
        let lvl = 0.12 + 0.1 * Math.sin(t * 1.3 + i);
        if (i === 5) { const c = t % 6; lvl = c < 2 ? 0.15 + c * 0.38 : c < 3.2 ? 0.9 - (c - 2) * 0.6 : 0.18; }
        lvl = Math.max(0.03, Math.min(0.95, lvl));
        b.setAttribute('y', (568 - 92 * lvl).toFixed(1)); b.setAttribute('height', (92 * lvl).toFixed(1));
        b.setAttribute('fill', api.color(lvl > 0.8 ? 'bad' : lvl > 0.56 ? 'warn' : 'data'));
      });
    });
  }

  // ================================================================ SRAM 6T
  function sceneSRAM(g, api) {
    const { A, G, R, L } = H(api);
    const w = G('data', g);
    const wire = (d, c) => A('path', { d: d, fill: 'none', stroke: c || api.rgba('muted', 0.8), 'stroke-width': 2 }, w);
    const blL = A('rect', { x: 196, y: 100, width: 8, height: 400, fill: api.color('data') }, w);
    const blR = A('rect', { x: 796, y: 100, width: 8, height: 400, fill: api.color('data') }, w);
    L(200, 92, 'BL', { parent: w, size: 13, anchor: 'middle', weight: 700, color: 'data' });
    L(800, 92, 'BLB', { parent: w, size: 13, anchor: 'middle', weight: 700, color: 'data' });
    const wl = A('rect', { x: 150, y: 128, width: 700, height: 6, fill: api.rgba('control', 0.4) }, w);
    L(150, 122, 'WL (word line)', { parent: w, size: 12, color: 'control' });
    wire('M340 180 H 660', api.color('power')); L(500, 174, 'VDD ~0.75 V', { parent: w, size: 11, anchor: 'middle', color: 'power' });
    wire('M340 460 H 660', api.rgba('muted', 0.9)); L(500, 478, 'VSS', { parent: w, size: 11, anchor: 'middle', color: 'muted' });
    const fet = (x, y, name, pm) => {
      R(w, x - 28, y - 22, 56, 44, { fill: pm ? '#2a2410' : '#0f2430', stroke: api.color(pm ? 'power' : 'data'), rx: 6 });
      L(x, y + 5, name, { parent: w, size: 12, anchor: 'middle', weight: 700 });
    };
    // inverter 1 (x 380) and 2 (x 620)
    wire('M380 180 V 218'); wire('M380 262 V 378'); wire('M380 422 V 460');
    wire('M620 180 V 218'); wire('M620 262 V 378'); wire('M620 422 V 460');
    fet(380, 240, 'PU1', true); fet(380, 400, 'PD1', false); fet(620, 240, 'PU2', true); fet(620, 400, 'PD2', false);
    // cross-couple
    wire('M380 320 H 470 V 300 H 560 V 240 H 592'); wire('M560 300 V 400 H 592');
    wire('M620 340 H 530 V 360 H 440 V 240 H 408'); wire('M440 360 V 400 H 408');
    // access transistors
    wire('M204 320 H 262'); wire('M318 320 H 380'); fet(290, 320, 'PG1', false); wire('M290 298 V 134');
    wire('M796 340 H 738'); wire('M682 340 H 620'); fet(710, 340, 'PG2', false); wire('M710 318 V 134');
    const q = A('circle', { cx: 380, cy: 320, r: 9, fill: api.color('accent'), filter: 'url(#glow)' }, w);
    const qb = A('circle', { cx: 620, cy: 340, r: 9, fill: '#222', stroke: api.color('muted') }, w);
    const qT = L(352, 312, 'Q', { parent: w, size: 13, weight: 700, color: 'accent', anchor: 'end' });
    const qbT = L(648, 332, 'QB', { parent: w, size: 13, weight: 700, color: 'muted' });
    // BL voltage bars + sense amp
    const sa = G('data', g);
    R(sa, 380, 510, 240, 60, { fill: 'rgba(12,17,24,.92)', stroke: api.rgba('accent', 0.6), rx: 8 });
    const saT = L(500, 535, 'sense amp', { parent: sa, size: 12, anchor: 'middle', weight: 700 });
    const ph = L(500, 556, '', { parent: sa, size: 11, anchor: 'middle', color: 'muted', mono: true });
    const vb = [R(sa, 230, 520, 120, 10, { fill: api.color('data'), stroke: 'none', rx: 3 }), R(sa, 650, 520, 120, 10, { fill: api.color('data'), stroke: 'none', rx: 3 })];
    L(230, 548, 'V(BL)', { parent: sa, size: 10.5, color: 'muted' }); L(650, 548, 'V(BLB)', { parent: sa, size: 10.5, color: 'muted' });
    // info box
    const info = G('data', g);
    R(info, 850, 180, 140, 250, { fill: 'rgba(12,17,24,.92)', stroke: api.rgba('line', 1), rx: 8 });
    ['6T bitcell', 'area ≈ 0.02 µm²', '(N5/N3-class HD)', 'read: ΔV_BL', '~50–100 mV', 'then sense', 'ratio PD:PG', 'sets read', 'stability'].forEach((s, i) => L(862, 202 + i * 24, s, { parent: info, size: 11, color: i === 0 ? 'accent' : i % 2 ? 'text' : 'muted', weight: i === 0 ? 700 : null }));
    let state = 1, lastCycle = -1;
    api.loop((dt, t) => {
      const cyc = Math.floor(t / 3), c = t % 3;
      if (cyc !== lastCycle) { lastCycle = cyc; if (cyc % 3 === 2) state = 1 - state; }
      const write = cyc % 3 === 2;
      const wlOn = c > 0.8 && c < 2.2;
      wl.setAttribute('fill', wlOn ? api.color('control') : api.rgba('control', 0.35));
      wl.setAttribute('filter', wlOn ? 'url(#glow)' : '');
      const dis = wlOn ? Math.min(1, (c - 0.8) / 1.0) : c >= 2.2 ? 1 - Math.min(1, (c - 2.2) / 0.5) : 0;
      let vBL = 1, vBLB = 1;
      if (write) { if (state === 1) vBLB = 1 - (wlOn ? 1 : dis); else vBL = 1 - (wlOn ? 1 : dis); }
      else if (state === 1) vBLB = 1 - 0.35 * dis; else vBL = 1 - 0.35 * dis;
      vb[0].setAttribute('width', (120 * vBL).toFixed(1)); vb[1].setAttribute('width', (120 * vBLB).toFixed(1));
      blL.setAttribute('opacity', (0.3 + 0.7 * vBL).toFixed(2)); blR.setAttribute('opacity', (0.3 + 0.7 * vBLB).toFixed(2));
      q.setAttribute('fill', state ? api.color('accent') : '#222'); qb.setAttribute('fill', state ? '#222' : api.color('accent'));
      qT.textContent = 'Q=' + state; qbT.textContent = 'QB=' + (1 - state);
      ph.textContent = c < 0.8 ? 'precharge BL/BLB → VDD' : wlOn ? (write ? 'WRITE: drivers force BL pair' : 'READ: cell discharges one BL') : 'sense → latch → output ' + state;
      saT.setAttribute('fill', c > 1.6 && c < 2.6 ? api.color('accent') : api.color('text'));
    });
  }

  // ================================================================ PIPELINE
  function scenePipeline(g, api) {
    const { A, G, R, L, flow, box } = H(api);
    const p = G('data', g);
    L(40, 92, 'Programmable match-action pipeline (one of many in the ASIC) — ~1 packet per clock', { parent: p, size: 13, weight: 700 });
    box(p, 40, 170, 100, 170, 'Parser', 'state machine', 'data', { fs: 13 });
    const alus = [];
    for (let s = 0; s < 8; s++) {
      const x = 160 + s * 80;
      R(p, x, 170, 70, 170, { fill: '#121b26', stroke: api.rgba('accent', 0.6), rx: 6 });
      L(x + 35, 188, 'MAU ' + (s + 1), { parent: p, size: 11, anchor: 'middle', weight: 700, color: 'accent' });
      R(p, x + 6, 198, 58, 30, { fill: '#1d1636', stroke: api.rgba('control', 0.7), rx: 3 }); L(x + 35, 217, 'TCAM', { parent: p, size: 9.5, anchor: 'middle' });
      R(p, x + 6, 234, 58, 30, { fill: '#122033', stroke: api.rgba('data', 0.7), rx: 3 }); L(x + 35, 253, 'SRAM', { parent: p, size: 9.5, anchor: 'middle' });
      alus.push(R(p, x + 6, 290, 58, 40, { fill: '#162418', stroke: api.rgba('accent', 0.7), rx: 3 })); L(x + 35, 314, 'ALUs', { parent: p, size: 9.5, anchor: 'middle' });
      flow(p, 'M' + (x + 35) + ' 264 V 290', { color: 'accent', count: 1, speed: 20 });
    }
    box(p, 820, 170, 100, 170, 'Deparser', 'rebuild hdr', 'data', { fs: 13 });
    const bus = flow(p, 'M90 380 H 870', { color: 'data', alpha: 0.4, sw: 6, count: 0 });
    L(480, 404, 'Packet Header Vector (PHV) — parsed fields travel stage to stage; payload waits in the buffer', { parent: p, size: 11, anchor: 'middle', color: 'muted' });
    // packet tokens
    const toks = [];
    for (let i = 0; i < 9; i++) toks.push(A('rect', { x: 0, y: 372, width: 26, height: 16, rx: 3, fill: api.color('data'), filter: 'url(#glow)' }, p));
    // stats
    const s = G('data', g);
    R(s, 40, 430, 920, 140, { fill: 'rgba(12,17,24,.9)', stroke: api.rgba('line', 1), rx: 10 });
    [['Lookup types', 'exact (hash in SRAM), LPM / ACL (TCAM), ranges'], ['Per-stage work', 'match → action: rewrite fields, counters, meters, hash for ECMP/adaptive routing'], ['Throughput', 'pipes × f_clk  e.g. 8 pipes × 1.5 GHz ≈ 12 Gpps per die quadrant [est]'], ['Latency', 'tens of stages × ~1 ns ≈ 10s of ns of fixed pipeline delay [typ]'], ['Energy', 'TCAM search is the costliest op: every entry compares in parallel']]
      .forEach(([a, b], i) => { L(56, 456 + i * 24, a, { parent: s, size: 11.5, color: 'accent', weight: 700 }); L(200, 456 + i * 24, b, { parent: s, size: 11.5 }); });
    const cols = ['data', 'accent', 'optics', 'control', 'power', 'sensing'];
    api.loop((dt, t) => {
      toks.forEach((k, i) => {
        const u = ((t * 0.12 + i / toks.length) % 1);
        const x = 90 + u * 760;
        k.setAttribute('x', (x - 13).toFixed(1));
        const stg = Math.max(0, Math.min(9, Math.floor((x - 140) / 80)));
        k.setAttribute('fill', api.color(cols[stg % cols.length]));
      });
      alus.forEach((a, i) => a.setAttribute('fill-opacity', (0.5 + 0.5 * Math.max(0, Math.sin(t * 8 - i * 0.9))).toFixed(2)));
    });
  }

  // ================================================================ TRAFFIC MANAGER
  function sceneTM(g, api) {
    const { A, G, R, L, flow } = H(api);
    const tm = G('data', g);
    L(40, 92, 'Traffic manager: queue, schedule, shape, signal congestion', { parent: tm, size: 13, weight: 700 });
    for (let i = 0; i < 6; i++) flow(tm, 'M40 ' + (150 + i * 50) + ' C 160 ' + (150 + i * 50) + ', 170 ' + (140 + ((i * 3) % 8) * 40) + ', 290 ' + (140 + ((i * 3) % 8) * 40), { color: 'data', count: 3, speed: 90, alpha: 0.25, jitter: 0.5 });
    L(40, 136, 'from ingress', { parent: tm, size: 10.5, color: 'muted' });
    const qs = [];
    for (let i = 0; i < 8; i++) {
      const y = 126 + i * 40;
      R(tm, 300, y, 240, 28, { fill: '#0a0e13', stroke: api.rgba('line', 1), rx: 4 });
      qs.push(R(tm, 300, y, 0, 28, { fill: api.color('data'), stroke: 'none', rx: 4 }));
      L(292, y + 19, 'TC' + i, { parent: tm, size: 10.5, color: 'muted', anchor: 'end' });
      flow(tm, 'M540 ' + (y + 14) + ' C 600 ' + (y + 14) + ', 620 290, 680 290', { color: 'accent', count: 0, alpha: 0.2, sw: 1 });
    }
    A('rect', { x: 470, y: 120, width: 1.5, height: 320, fill: api.color('warn') }, tm);
    L(470, 456, 'ECN threshold', { parent: tm, size: 10, color: 'warn', anchor: 'middle' });
    const sc = G('control', g);
    A('circle', { cx: 720, cy: 290, r: 44, fill: '#1b1630', stroke: api.color('control'), 'stroke-width': 2 }, sc);
    const ptr = A('line', { x1: 720, y1: 290, x2: 760, y2: 290, stroke: api.color('accent'), 'stroke-width': 3, 'stroke-linecap': 'round' }, sc);
    L(720, 354, 'scheduler', { parent: sc, size: 12, anchor: 'middle', weight: 700, color: 'control' });
    L(720, 370, 'strict prio + DWRR', { parent: sc, size: 10.5, anchor: 'middle', color: 'muted' });
    flow(sc, 'M764 290 H 960', { color: 'accent', count: 6, speed: 120, arrow: true });
    L(860, 280, 'to egress port', { parent: sc, size: 10.5, anchor: 'middle', color: 'muted' });
    const info = G('data', g);
    R(info, 40, 480, 920, 96, { fill: 'rgba(12,17,24,.9)', stroke: api.rgba('line', 1), rx: 10 });
    ['Lossless fabrics: Ethernet RoCE uses PFC + ECN-based congestion control; InfiniBand uses credit-based link flow control.', 'AI fabrics add adaptive routing (spray across equal-cost paths) + end-to-end congestion control to keep tail latency low.', 'Shared-buffer thresholds (dynamic α·free) let a bursting queue borrow buffer without starving others.']
      .forEach((s2, i) => L(56, 504 + i * 24, s2, { parent: info, size: 11.5, color: i ? 'muted' : 'text' }));
    api.loop((dt, t) => {
      const a = t * 2.2;
      ptr.setAttribute('x2', (720 + 40 * Math.cos(a)).toFixed(1)); ptr.setAttribute('y2', (290 + 40 * Math.sin(a)).toFixed(1));
      qs.forEach((q, i) => { const l = Math.max(0.04, Math.min(1, 0.3 + 0.28 * Math.sin(t * (0.7 + i * 0.13) + i) + (i === 3 ? 0.35 * Math.max(0, Math.sin(t * 0.5)) : 0))); q.setAttribute('width', (240 * l).toFixed(1)); q.setAttribute('fill', api.color(l > 0.71 ? 'warn' : 'data')); });
    });
  }

  // ================================================================ TRANSISTOR
  function sceneTransistor(g, api) {
    const { A, G, R, L, flow } = H(api);
    // side view
    const sv = G('data', g);
    R(sv, 40, 80, 440, 230, { fill: 'rgba(12,17,24,.9)', stroke: api.rgba('line', 1), rx: 10 });
    L(54, 100, 'nFET along the channel (schematic)', { parent: sv, size: 12, weight: 700 });
    R(sv, 60, 220, 400, 80, { fill: '#1b2533', stroke: 'none', rx: 4 });
    L(70, 292, 'p-type Si / fin body', { parent: sv, size: 10, color: 'muted' });
    R(sv, 70, 200, 110, 40, { fill: '#173048', stroke: api.color('data'), rx: 4 }); L(125, 225, 'Source n+', { parent: sv, size: 11, anchor: 'middle' });
    R(sv, 340, 200, 110, 40, { fill: '#173048', stroke: api.color('data'), rx: 4 }); L(395, 225, 'Drain n+', { parent: sv, size: 11, anchor: 'middle' });
    R(sv, 180, 192, 160, 8, { fill: api.color('violet'), stroke: 'none', rx: 1 }); L(345, 190, 'high-k ~1–2 nm', { parent: sv, size: 9.5, color: 'violet' });
    const gate = R(sv, 180, 140, 160, 52, { fill: 'url(#g-metal)', stroke: api.color('accent'), rx: 4 });
    L(260, 170, 'Metal gate', { parent: sv, size: 12, anchor: 'middle', weight: 700 });
    const ch = A('path', { d: 'M180 208 H 340', stroke: api.rgba('data', 0.3), 'stroke-width': 6, fill: 'none' }, sv);
    const el = api.particlesAlong(ch, { color: 'data', count: 12, speed: 90, r: 2.4 });
    L(260, 260, 'Lg ≈ 12–20 nm effective', { parent: sv, size: 10.5, anchor: 'middle', color: 'muted' });
    const vgT = L(54, 130, '', { parent: sv, size: 12, mono: true, color: 'accent' });
    // cross-sections
    const cs = G('mechanical', g);
    R(cs, 520, 80, 460, 230, { fill: 'rgba(12,17,24,.9)', stroke: api.rgba('line', 1), rx: 10 });
    L(534, 100, 'Cross-section across the channel', { parent: cs, size: 12, weight: 700 });
    // FinFET
    R(cs, 540, 260, 200, 36, { fill: '#1b2533', stroke: 'none', rx: 2 });
    R(cs, 540, 240, 200, 20, { fill: '#2a3340', stroke: 'none', rx: 0 });
    A('path', { d: 'M550 240 V 160 H 730 V 240 Z', fill: 'url(#g-metal)', stroke: api.color('accent'), opacity: 0.85 }, cs);
    for (let i = 0; i < 3; i++) R(cs, 578 + i * 56, 172, 12, 88, { fill: api.color('data'), stroke: 'none', rx: 2 });
    L(640, 130, 'FinFET (N7–N3)', { parent: cs, size: 12, anchor: 'middle', weight: 700, color: 'accent' });
    L(640, 146, 'gate on 3 sides of each fin', { parent: cs, size: 10, anchor: 'middle', color: 'muted' });
    L(640, 290, 'fin w ≈ 5–7 nm, h ≈ 50 nm', { parent: cs, size: 10, anchor: 'middle', color: 'muted' });
    // GAA
    R(cs, 760, 260, 200, 36, { fill: '#1b2533', stroke: 'none', rx: 2 });
    A('rect', { x: 780, y: 160, width: 160, height: 100, rx: 4, fill: 'url(#g-metal)', stroke: api.color('accent'), opacity: 0.85 }, cs);
    for (let i = 0; i < 3; i++) R(cs, 800, 180 + i * 26, 120, 10, { fill: api.color('data'), stroke: api.color('violet'), rx: 2 });
    L(860, 130, 'GAA nanosheet (N2-class)', { parent: cs, size: 12, anchor: 'middle', weight: 700, color: 'accent' });
    L(860, 146, 'gate wraps all 4 sides of 3 sheets', { parent: cs, size: 10, anchor: 'middle', color: 'muted' });
    L(860, 290, 'sheet t ≈ 5 nm, w ≈ 15–45 nm', { parent: cs, size: 10, anchor: 'middle', color: 'muted' });
    // Id-Vg
    const p = plot(api, g, 40, 330, 440, 240, { title: 'Id–Vg (log): subthreshold slope ≈ 65–70 mV/dec', xl: 'Vg 0 → 0.8 V', domain: 'data' });
    const X = v => p.X(v, 0, 0.8), Y = l => p.Y(l, -14, -1);
    const Id = (v, vt) => 1e-4 * Math.pow(Math.log(1 + Math.exp((v - vt) / (1.1 * 0.02585 * 2))), 2);
    const path = (vt) => { let d = ''; for (let v = 0; v <= 0.8001; v += 0.01) d += (d ? ' L ' : 'M') + X(v).toFixed(1) + ' ' + Y(Math.log10(Id(v, vt))).toFixed(1); return d; };
    api.add('path', { d: path(0.3), fill: 'none', stroke: api.color('data'), 'stroke-width': 2.5 }, p.g);
    api.add('path', { d: path(0.25), fill: 'none', stroke: api.color('warn'), 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }, p.g);
    L(330, 520, 'dashed: high Vd (DIBL)', { size: 10, color: 'warn' });
    const dot = api.add('circle', { r: 6, fill: api.color('accent'), filter: 'url(#glow)' }, p.g);
    const ion = L(56, 368, '', { size: 11, mono: true, color: 'muted' });
    // power
    const pw = G('power', g);
    R(pw, 520, 330, 460, 240, { fill: 'rgba(12,17,24,.9)', stroke: api.rgba('line', 1), rx: 10 });
    L(534, 352, 'Power vs supply voltage (relative, at max f)', { parent: pw, size: 12, weight: 700 });
    L(534, 372, 'P_dyn = α·C·V²·f       P_leak = V·I_off(V, T)', { parent: pw, size: 11.5, mono: true, color: 'power' });
    const bars = {};
    [['dyn', 'dynamic', 'power'], ['leak', 'leakage', 'thermal'], ['f', 'max f', 'data']].forEach(([k, n, c], i) => {
      L(534, 404 + i * 34, n, { parent: pw, size: 11, color: 'muted' });
      R(pw, 610, 392 + i * 34, 300, 16, { fill: '#0a0e13', stroke: 'none', rx: 3 });
      bars[k] = R(pw, 610, 392 + i * 34, 0, 16, { fill: api.color(c), stroke: 'none', rx: 3 });
    });
    const vT = L(534, 512, '', { parent: pw, size: 12, mono: true, color: 'accent' });
    L(534, 534, 'Leakage roughly doubles every ~10–20 °C → hot dies leak more,', { parent: pw, size: 10.5, color: 'muted' });
    L(534, 550, 'which is one reason cooling and DVFS matter for switch ASICs.', { parent: pw, size: 10.5, color: 'muted' });
    api.loop((dt, t) => {
      const vg = 0.4 + 0.4 * Math.sin(t * 0.7);
      const i = Id(vg, 0.3);
      dot.setAttribute('cx', X(vg).toFixed(1)); dot.setAttribute('cy', Y(Math.log10(i)).toFixed(1));
      vgT.textContent = 'Vg = ' + vg.toFixed(2) + ' V   ' + (vg > 0.3 ? 'ON — inversion channel' : 'OFF — barrier blocks electrons');
      ion.textContent = 'Id ≈ ' + C.fmt(i, 2) + ' A (illustrative)';
      const on = Math.max(0, Math.min(1, (Math.log10(i) + 9) / 7));
      el.group.setAttribute('opacity', on.toFixed(2)); el.set({ speed: 30 + 140 * on });
      gate.setAttribute('stroke-width', (1 + 2 * on).toFixed(2));
      const V = 0.62 + 0.25 * (0.5 + 0.5 * Math.sin(t * 0.45));
      const f = Math.pow(V - 0.3, 1.3) / V / (Math.pow(0.45, 1.3) / 0.75);
      const dyn = V * V * f / (0.5625), leak = 0.3 * (V / 0.75) * Math.pow(10, (V - 0.75) * 1.2);
      bars.dyn.setAttribute('width', (300 * Math.min(1, dyn / 1.8)).toFixed(1));
      bars.leak.setAttribute('width', (300 * Math.min(1, leak / 1.8)).toFixed(1));
      bars.f.setAttribute('width', (300 * Math.min(1, f / 1.4)).toFixed(1));
      vT.textContent = 'V_DD = ' + V.toFixed(2) + ' V   P_dyn ×' + dyn.toFixed(2) + '   f ×' + f.toFixed(2);
    });
  }

  nodes.push({
    id: 'packet-buffer', parent: 'asic-die', level: 4, domain: 'data',
    title: 'Shared Packet Buffer',
    subtitle: 'On-die SRAM absorbing bursts for all ports',
    summary: 'When several inputs send to the same output at once (incast — common in AI collectives), packets must wait. A switch ASIC stores them in a large on-die SRAM shared by all ports, carved into fixed-size cells, with dynamic thresholds so a congested queue can borrow space without starving others.',
    what: '<p>Packets are split into cells (e.g. ~128–256 B ' + B('typ') + '), written into many parallel ' + T('SRAM') + ' banks and linked by pointers; a free-list tracks empty cells. The buffer must sustain full write <i>and</i> read bandwidth of all ports — e.g. 2 × 102.4 Tb/s ≈ 25.6 TB/s — which is why it is massively banked and placed in the centre of the die.</p>' +
      '<p><b>Sizing.</b> Classic rule: B ≈ RTT × C / √N flows; AI fabrics with lossless flow control and good congestion control try to keep queues short, but microbursts still need tens of MB. <b>Thresholds:</b> dynamic threshold T = α × (free buffer); exceeding ECN or PFC/XOFF thresholds triggers congestion signalling.</p>',
    needs: ['Very high aggregate bandwidth (banking, wide words)', 'ECC to tolerate soft errors', 'Low Vmin SRAM to save power', 'Fair, configurable sharing policies'],
    interfaces: [{ with: 'pipeline-logic', type: 'electrical', detail: 'Ingress writes cells, egress reads' }, { with: 'traffic-manager', type: 'electrical', detail: 'Queue pointers, thresholds' }],
    kpis: [{ name: 'Capacity', value: 'tens–100s MB', tag: 'typ', note: 'per large switch ASIC' }, { name: 'Bandwidth', value: '≈2 × switch capacity', tag: 'typ', note: 'write + read' }, { name: 'Bitcell area', value: '≈0.02 µm²', tag: 'typ', note: 'N5/N3 HD' }, { name: 'Area of 64 MB', value: '~15–25 mm²', tag: 'est', note: 'incl. periphery' }],
    physics: '<div class="eq">Burst absorption:  B_needed ≈ (N_in − 1)·C_port·t_burst\n  e.g. 8 → 1 incast at 800G for 2 µs ≈ 7·800e9·2e-6 / 8 ≈ 1.4 MB per port\nDynamic threshold:  Q_i ≤ α·(B_total − Σ Q_j)</div>',
    failures: ['Buffer exhaustion → drops / PFC storms → congestion control, thresholds, adaptive routing', 'SRAM soft error → corrupted packet → ECC', 'Head-of-line blocking from PFC → fabric-wide slowdown → per-priority isolation, deadlock avoidance'],
    monitoring: ['Queue-depth histograms and watermarks per port/TC', 'Drop, ECN-mark and PAUSE counters', 'ECC corrected/uncorrected counters'],
    scene: sceneBuffer,
    hotspots: [{ target: 'sram-cell', x: 334, y: 144, w: 40, h: 36, label: 'SRAM bank → 6T bitcell' }]
  });

  nodes.push({
    id: 'sram-cell', parent: 'packet-buffer', level: 6, domain: 'data',
    title: '6T SRAM Bitcell',
    subtitle: 'Two cross-coupled inverters + two access transistors',
    summary: 'One bit of packet buffer is a tiny latch: two inverters feeding each other hold Q and its complement. Raising the word line connects the latch to the bit-line pair; on a read the cell slightly discharges one pre-charged bit line and a sense amplifier detects the difference; on a write strong drivers overpower the latch.',
    what: '<p><b>Read:</b> BL/BLB pre-charged to VDD; WL rises; the side storing 0 pulls its bit line down through PG and PD; after ~50–100 mV of split the sense amp fires ' + B('typ') + '. <b>Read stability</b> needs PD stronger than PG (β ratio) so the internal 0-node does not flip.</p>' +
      '<p><b>Write:</b> drivers force one bit line to 0; PG must be stronger than PU (pull-up ratio) to flip the latch. Read and write want opposite sizing — the core SRAM design tension, worsened by random Vt variation at small dimensions; assist circuits (negative bit line, WL under-drive) help.</p>',
    needs: ['Matched transistors (low σVt)', 'Adequate static noise margin at Vmin', 'Assist circuits for low-voltage operation'],
    interfaces: [{ with: 'packet-buffer', type: 'electrical', detail: 'Bit lines to sense amps, word lines from decoders' }, { with: 'transistor', type: 'electrical', detail: 'Built from 6 FinFET/GAA devices' }],
    kpis: [{ name: 'Area', value: '≈0.02 µm²', tag: 'typ', note: 'HD cell, N5/N3-class' }, { name: 'Read ΔV_BL', value: '~50–100 mV', tag: 'typ', note: '' }, { name: 'Vmin', value: '~0.6–0.7 V', tag: 'typ', note: 'w/o assists' }],
    physics: '<div class="eq">Cell ratio β = (W/L)_PD / (W/L)_PG  ≳ 1.2–2 for read stability\nBit-line swing   ΔV = I_read · t / C_BL\nσVt ∝ 1/√(W·L)  (Pelgrom) → many cells per array → 6σ design</div>',
    failures: ['Read disturb (flip) at low V → data corruption → β ratio, assists, ECC', 'Write failure at low V → stale data → write assist', 'Soft error from alpha/neutron → bit flip → ECC, interleaving'],
    monitoring: ['ECC syndrome counters', 'Vmin characterization / BIST at test'],
    scene: sceneSRAM,
    hotspots: [{ target: 'transistor', x: 350, y: 376, w: 60, h: 48, label: 'PD1 → transistor' }]
  });

  nodes.push({
    id: 'pipeline-logic', parent: 'asic-die', level: 4, domain: 'data',
    title: 'Packet-Processing Pipelines',
    subtitle: 'Parser → match-action stages → deparser',
    summary: 'Every packet header passes through a deep pipeline that parses fields, looks them up in tables (forwarding, ACL, tunnels, telemetry) and edits them. Each stage does one lookup + action per clock, so the pipeline processes about one packet per clock regardless of complexity.',
    what: '<p>The parser extracts headers into a Packet Header Vector (PHV). Each ' + T('MAU') + ' stage matches PHV fields against SRAM hash tables (exact match) or ' + T('TCAM') + ' (longest-prefix, ACL wildcards) and then applies actions with ALUs: rewrite, encapsulate, count, meter, choose next hop (ECMP / adaptive routing hash). The deparser re-serializes headers; payload never enters the pipeline — it waits in the buffer.</p>' +
      '<p>Logic is built from standard cells (NAND, flip-flops…) in a FinFET-class process; timing closure at ~1–1.5 GHz with low Vdd is the main physical-design challenge ' + B('typ') + '.</p>',
    needs: ['Enough table capacity (SRAM/TCAM) per stage', 'Timing closure at target frequency across PVT', 'Low-power design (clock gating, low-Vt only on critical paths)'],
    interfaces: [{ with: 'serdes', type: 'electrical', detail: 'Via MAC/PCS' }, { with: 'packet-buffer', type: 'electrical', detail: 'Cell write/read' }, { with: 'control-plane', type: 'mgmt', detail: 'Table programming over PCIe' }],
    kpis: [{ name: 'Packet rate @102.4T', value: '≈152 Gpps', tag: 'est', note: '64B min frames' }, { name: 'Clock', value: '~1–1.5 GHz', tag: 'typ', note: '' }, { name: 'Pipeline latency', value: '10s of ns', tag: 'typ', note: '' }],
    physics: '<div class="eq">Throughput = N_pipes × f_clk (packets/s)\nTCAM search energy ∝ entries × width × C_ML × V²  → the dominant lookup energy</div>',
    failures: ['Table overflow → fallback / drops → capacity planning', 'Timing marginality at hot/low-V corners → bit errors → guard-banding, adaptive voltage', 'Misprogrammed tables → blackholing → validation'],
    monitoring: ['Per-table hit/miss counters', 'Telemetry (in-band network telemetry, sampling)', 'Parity/ECC on tables'],
    scene: scenePipeline,
    hotspots: [{ target: 'transistor', x: 406, y: 288, w: 62, h: 44, label: 'ALU standard cells → transistor' }]
  });

  nodes.push({
    id: 'traffic-manager', parent: 'asic-die', level: 4, domain: 'data',
    title: 'Traffic Manager',
    subtitle: 'Queues, schedulers, shapers and congestion signalling',
    summary: 'The traffic manager decides when each buffered packet leaves. It keeps per-port, per-class queues, schedules them with strict priority and weighted round-robin, shapes rates, and signals congestion with ECN marks or PFC/credit backpressure so senders slow down before buffers overflow.',
    what: '<p>Queues per egress port × traffic class (often 8 classes). Schedulers: strict priority for control traffic, DWRR for bandwidth sharing. Congestion: ' + T('ECN') + ' marking at a configured depth feeds end-to-end congestion control; ' + T('PFC') + ' (Ethernet) or credits (InfiniBand) prevent drops. AI-optimized fabrics also use adaptive routing to spread flows across paths.</p>',
    needs: ['Accurate queue-depth tracking', 'Fast schedulers (decide every packet time)', 'Configurable thresholds and policies'],
    interfaces: [{ with: 'packet-buffer', type: 'electrical', detail: 'Queue pointers in the shared buffer' }, { with: 'pipeline-logic', type: 'electrical', detail: 'Enqueue/dequeue decisions' }],
    kpis: [{ name: 'Traffic classes', value: '8 / port', tag: 'typ', note: '' }, { name: 'Scheduling decision', value: 'every packet time', tag: 'typ', note: '~ns' }],
    physics: '<div class="eq">Little\'s law: queueing delay = Q / C_port      e.g. 1 MB at 800 Gb/s ≈ 10 µs\nDWRR share_i = w_i / Σ w_j</div>',
    failures: ['PFC storm / deadlock → fabric halt → watchdogs, deadlock-free routing', 'Unfair sharing → tail latency → tuning weights/thresholds', 'ECN mis-tuned → under/over-reaction → congestion-control tuning'],
    monitoring: ['Queue watermarks and latency histograms', 'ECN/PFC counters', 'Scheduler statistics'],
    scene: sceneTM,
    hotspots: [{ target: 'packet-buffer', x: 296, y: 120, w: 248, h: 320, label: 'Queues live in the shared buffer' }]
  });

  nodes.push({
    id: 'transistor', parent: 'asic-die', level: 7, domain: 'data',
    title: 'Transistor (FinFET / GAA nanosheet)',
    subtitle: 'The switch at the bottom of everything',
    summary: 'Every SerDes, SRAM cell and logic gate is built from MOSFETs. A voltage on the gate lowers an energy barrier so electrons flow from source to drain. FinFETs wrap the gate around a thin fin on three sides; gate-all-around nanosheets wrap it on all four, giving tighter control, lower leakage and lower supply voltage.',
    what: '<p><b>Switching.</b> Below threshold, current is diffusion over a barrier and falls exponentially: one decade per ~60 mV at room temperature in the ideal limit (' + T('FinFET') + 's ~65–70 mV/dec ' + B('typ') + '). Above Vt an inversion channel forms and current rises roughly as (Vg−Vt)^1.3 in velocity-saturated short channels.</p>' +
      '<p><b>Why 3D gates.</b> At ~15 nm gate length the drain field reaches under the gate (' + T('DIBL') + '), lowering the barrier and raising leakage. Wrapping the gate around a thin body restores electrostatic control. ' + T('GAA') + ' nanosheets (N2-class) also let designers choose sheet width per device ' + B('typ') + '.</p>' +
      '<p><b>Process scale (typical N5/N3 class):</b> ' + T('CPP') + ' ~48–51 nm, metal pitch ~23–28 nm, core Vdd ~0.65–0.85 V ' + B('typ') + '. "N3" is a marketing name, not a physical 3 nm dimension.</p>' +
      '<p><b>In SerDes:</b> analog circuits need gain (g_m/I_d), matching and f_T (several hundred GHz); FinFET quantized widths and high parasitic C make 100+ GBd analog design hard.</p>',
    needs: ['Low Vt variability (dopant-free channels help)', 'Low parasitic capacitance and contact resistance', 'Thermal headroom: self-heating in fins/sheets', 'Reliability margins: BTI, HCI, TDDB'],
    interfaces: [{ with: 'sram-cell', type: 'electrical', detail: '6 per bitcell' }, { with: 'serdes', type: 'electrical', detail: 'Driver, CTLE, ADC devices' }, { with: 'pipeline-logic', type: 'electrical', detail: 'Standard cells' }],
    kpis: [{ name: 'Subthreshold slope', value: '~65–70 mV/dec', tag: 'typ', note: 'ideal 60 @300 K' }, { name: 'Core Vdd', value: '~0.65–0.85 V', tag: 'typ', note: '' }, { name: 'CPP', value: '~48–51 nm', tag: 'typ', note: 'N5/N3-class' }, { name: 'Ion/Ioff', value: '~10⁵–10⁶', tag: 'typ', note: '' }],
    physics: '<div class="eq">Subthreshold: I_d ≈ I₀·exp((V_g − V_t)/(n·kT/q)) ,  SS = n·(kT/q)·ln10 ≈ n·60 mV/dec\nDIBL: V_t(V_d) = V_t0 − η·V_d\nDynamic energy per transition: E = ½·C·V²   (P = α·C·V²·f)\nLeakage power: P_leak = V·I_off ,  I_off ∝ 10^(−V_t/SS)  → strong T dependence</div>',
    failures: ['BTI (bias temperature instability) → Vt shift over life → guard-band, aging-aware timing', 'Hot-carrier injection in high-swing drivers → degradation → derating', 'Gate-oxide TDDB → breakdown → voltage limits', 'Self-heating → mobility loss, accelerated aging → thermal-aware design'],
    monitoring: ['On-die ring-oscillator and aging monitors', 'Process/voltage/temperature (PVT) sensors driving adaptive voltage scaling'],
    scene: sceneTransistor
  });

  C.arch.addNodes(nodes);
})();
