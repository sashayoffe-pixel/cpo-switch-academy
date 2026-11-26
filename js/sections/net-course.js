/* Networking & Communication course: every way data moves in and around a CPO switch and an AI factory,
   from Ethernet / InfiniBand / TCP/IP / RDMA / NVLink down to I2C, SPI, UART, MDIO, PMBus and CMIS.
   Written for a system engineer (not a board designer). Uses js/course-engine.js. */
(function () {
  'use strict';
  const C = window.CPO;
  const h = C.h, S = C.s, B = C.badge;
  const K = C.course.K;
  const { R, T, L, P, O, G, cap, along, ptsD } = C.course.svg;
  const num = n => Math.round(n).toLocaleString('en-US');

  C.addGlossary({
    'NVLink': { full: 'NVIDIA NVLink', def: 'NVIDIA\'s GPU-to-GPU interconnect. Fifth generation: 1.8 TB/s per Blackwell GPU. GPUs can read and write each other\'s memory directly.', cat: 'network' },
    'NVSwitch': { full: 'NVLink Switch', def: 'Switch chip that connects many GPUs over NVLink so every GPU can reach every other at full speed (e.g. 72 GPUs in an NVL72 rack).', cat: 'network' },
    'TCP': { full: 'Transmission Control Protocol', def: 'Reliable, ordered byte stream over IP: handshakes, acknowledgements, retransmission and congestion control, usually done by the CPU.', cat: 'network' },
    'UDP': { full: 'User Datagram Protocol', def: 'Minimal transport over IP: no connection, no retransmission. RoCEv2 rides on UDP.', cat: 'network' },
    'IP': { full: 'Internet Protocol', def: 'Network layer: addresses (e.g. 10.0.4.7) and routing of packets between subnets.', cat: 'network' },
    'IPv4': { full: 'Internet Protocol version 4', def: '32-bit addresses written as four numbers, e.g. 10.0.4.7.', cat: 'network' },
    'VLAN': { full: 'Virtual LAN (IEEE 802.1Q)', def: 'A 4-byte tag in the Ethernet frame that splits one physical network into separate logical networks.', cat: 'network' },
    'ARP': { full: 'Address Resolution Protocol', def: 'Finds the MAC address that belongs to an IP address on the local network.', cat: 'network' },
    'FCS': { full: 'Frame Check Sequence', def: '4-byte CRC at the end of every Ethernet frame; a mismatch means the frame was corrupted.', cat: 'network' },
    'LID': { full: 'Local Identifier (InfiniBand)', def: '16-bit address the Subnet Manager assigns to each InfiniBand port.', cat: 'network' },
    'QP': { full: 'Queue Pair (RDMA)', def: 'A send queue + receive queue: the "socket" of RDMA through which an application posts work requests.', cat: 'network' },
    'DCQCN': { full: 'Data Center Quantized Congestion Notification', def: 'Common RoCE congestion-control algorithm: senders slow down when they receive ECN-based congestion notifications.', cat: 'network' },
    'GPUDirect': { full: 'NVIDIA GPUDirect RDMA', def: 'Lets the network card read and write GPU memory directly, without copying through the CPU.', cat: 'network' },
    'BTH': { full: 'Base Transport Header', def: 'The 12-byte InfiniBand transport header, also used inside RoCE packets.', cat: 'network' },
    'CXL': { full: 'Compute Express Link', def: 'Cache-coherent protocol that runs on PCIe wiring, used for memory expansion and accelerators.', cat: 'electrical' },
    'UALink': { full: 'Ultra Accelerator Link', def: 'Industry consortium standard for scale-up accelerator interconnect.', cat: 'network' },
    'gNMI': { full: 'gRPC Network Management Interface', def: 'Modern API for streaming telemetry and configuration from network devices.', cat: 'control' },
    'BMC': { full: 'Baseboard Management Controller', def: 'Small always-on computer in the box that powers it up, watches sensors, logs events and offers remote management.', cat: 'control' }
  });

  // ================================================================ scenes
  function dots(g, n, col, r) { const a = []; for (let k = 0; k < n; k++) a.push(O(g, -9, -9, r || 3, { fill: col })); return a; }
  function run(ds, pts, t, sp, off) { ds.forEach((d, k) => { const p = along(pts, (t * sp + k / ds.length + (off || 0)) % 1); d.setAttribute('cx', p[0]); d.setAttribute('cy', p[1]); }); }

  function sMap(g) {
    cap(g, 20, 30, 'EVERY CONVERSATION IN AND AROUND A CPO SWITCH', K.text);
    R(g, 260, 110, 480, 380, { fill: '#0b1016', stroke: '#3b4a5e', 'stroke-width': 2, rx: 12 });
    T(g, 500, 132, 'CPO switch', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 13 });
    R(g, 300, 170, 160, 120, { fill: '#1b2a10', stroke: K.acc, 'stroke-width': 2 }); T(g, 380, 225, 'Switch ASIC', { 'text-anchor': 'middle', 'font-weight': 700 }); T(g, 380, 245, '+ optical engines', { 'text-anchor': 'middle', 'font-size': 12, fill: K.muted });
    R(g, 540, 170, 160, 70, { fill: '#160f24', stroke: K.ctrl }); T(g, 620, 200, 'Host CPU', { 'text-anchor': 'middle', 'font-size': 13.5 }); T(g, 620, 220, 'runs the network OS', { 'text-anchor': 'middle', 'font-size': 11.5, fill: K.muted });
    R(g, 540, 330, 160, 70, { fill: '#160f24', stroke: K.ctrl }); T(g, 620, 360, 'BMC', { 'text-anchor': 'middle', 'font-size': 13.5 }); T(g, 620, 380, 'box management', { 'text-anchor': 'middle', 'font-size': 11.5, fill: K.muted });
    const devs = [['Optical engines / lasers', 290, 330, 'I2C / I3C · CMIS'], ['Power (VRMs)', 290, 390, 'PMBus'], ['Fans, sensors, EEPROMs', 290, 440, 'I2C / SMBus'], ['Flash / CPLD', 440, 440, 'SPI · JTAG']];
    devs.forEach(([n, x, y]) => { R(g, x, y, 140, 34, { fill: K.panel2, stroke: K.line, rx: 6 }); T(g, x + 70, y + 21, n, { 'text-anchor': 'middle', 'font-size': 11.5 }); });
    // links
    const links = [
      { pts: [[30, 200], [300, 200]], col: K.optic, sp: 0.8, n: 6, lbl: ['Ethernet / InfiniBand', 40, 188], lbl2: ['144 × 800 Gb/s ports (fiber)', 40, 222] },
      { pts: [[30, 260], [300, 260]], col: K.optic, sp: 0.8, n: 6 },
      { pts: [[460, 205], [540, 205]], col: K.data, sp: 0.6, n: 3, lbl: ['PCIe', 478, 196] },
      { pts: [[620, 240], [620, 330]], col: K.ctrl, sp: 0.4, n: 2, lbl: ['UART / LPC', 628, 290] },
      { pts: [[540, 360], [430, 347]], col: K.ctrl, sp: 0.25, n: 2 }, { pts: [[540, 372], [430, 407]], col: K.power, sp: 0.25, n: 2 },
      { pts: [[560, 400], [430, 455]], col: K.ctrl, sp: 0.25, n: 2 }, { pts: [[600, 400], [540, 440]], col: K.ctrl, sp: 0.25, n: 2 },
      { pts: [[700, 365], [970, 365]], col: K.ctrl, sp: 0.35, n: 3, lbl: ['management Ethernet (RJ45, 1 Gb/s)', 712, 352], lbl2: ['Redfish · SSH · telemetry', 712, 386] },
      { pts: [[700, 205], [970, 205]], col: K.ctrl, sp: 0.35, n: 3, lbl: ['network OS → fabric manager', 712, 192] }
    ];
    links.forEach(l => { P(g, ptsD(l.pts), { stroke: l.col, 'stroke-width': 2.5, 'stroke-opacity': .55 }); l.d = dots(g, l.n, l.col, 3.2); if (l.lbl) T(g, l.lbl[1], l.lbl[2], l.lbl[0], { fill: l.col, 'font-size': 12.5, 'font-weight': 600 }); if (l.lbl2) T(g, l.lbl2[1], l.lbl2[2], l.lbl2[0], { fill: K.muted, 'font-size': 11.5 }); });
    T(g, 500, 520, 'Fast data plane (orange) · host bus (cyan) · slow management buses (violet / yellow)', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 13 });
    T(g, 500, 545, 'Speeds span ~10 orders of magnitude: 100 kb/s on I2C up to 115 Tb/s through the ASIC', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12.5 });
    return {
      hot: [{ x: 26, y: 176, w: 280, h: 100, target: 'nw-layers', label: 'Layers' }],
      update(t) { links.forEach(l => run(l.d, l.pts, t, l.sp)); }
    };
  }

  function sLayers(g) {
    const layers = [['7 · Application', 'NCCL all-reduce, storage, web', K.acc], ['4 · Transport', 'TCP · UDP · InfiniBand / RDMA transport', K.data], ['3 · Network', 'IP addresses, routing', K.ctrl], ['2 · Link', 'Ethernet / InfiniBand frames, MAC', K.optic], ['1 · Physical', 'lanes, FEC, PAM4, light / copper', K.therm]];
    const boxes = layers.map(([n, d, c], i) => {
      const y = 60 + i * 96;
      const r = R(g, 30, y, 330, 80, { fill: K.panel, stroke: c, 'stroke-width': 2, rx: 10 });
      T(g, 48, y + 34, n, { 'font-size': 16, 'font-weight': 700, fill: c }); T(g, 48, y + 58, d, { 'font-size': 12.5, fill: K.muted });
      return r;
    });
    cap(g, 420, 50, 'ENCAPSULATION: EACH LAYER ADDS ITS OWN ENVELOPE', K.text);
    // envelope rows
    const parts = [
      [['data', K.acc, 300]],
      [['UDP/BTH', K.data, 90], ['data', K.acc, 300]],
      [['IP', K.ctrl, 60], ['UDP/BTH', K.data, 90], ['data', K.acc, 300]],
      [['Eth', K.optic, 60], ['IP', K.ctrl, 60], ['UDP/BTH', K.data, 90], ['data', K.acc, 300], ['FCS', K.optic, 40]]
    ];
    const rows = parts.map((pp, i) => {
      const gg = G(g, {}); let x = 960 - pp.reduce((a, q) => a + q[2], 0) * 0.95;
      pp.forEach(([n, c, w]) => { R(gg, x, 80 + i * 96, w * 0.95 - 3, 50, { fill: c, 'fill-opacity': .25, stroke: c, rx: 4 }); T(gg, x + w * 0.475, 111 + i * 96, n, { 'text-anchor': 'middle', 'font-size': 12.5 }); x += w * 0.95; });
      return gg;
    });
    const bits = G(g, {}); const bitT = T(bits, 420, 520, '', { 'font-family': 'ui-monospace,monospace', 'font-size': 15, fill: K.therm });
    T(g, 420, 556, '→ FEC-coded, PAM4 symbols, light pulses', { fill: K.muted, 'font-size': 12.5 });
    const arrow = P(g, '', { stroke: '#fff', 'stroke-width': 3 });
    return {
      hot: [{ x: 26, y: 440, w: 338, h: 88, target: 'nw-phy', label: 'Physical layer' }],
      update(t) {
        const k = Math.floor(t / 1.3) % 6;
        boxes.forEach((b, i) => b.setAttribute('fill', i === Math.min(4, k) ? '#1d2a38' : K.panel));
        rows.forEach((r, i) => r.setAttribute('opacity', i <= k - 0 ? 1 : 0.1));
        bitT.textContent = k >= 4 ? Array.from({ length: 34 }, (_, i) => ((i * 7 + Math.floor(t * 8)) % 3 ? '1' : '0')).join('') : '';
        const y = 100 + Math.min(4, k) * 96;
        arrow.setAttribute('d', 'M365 ' + y + ' L410 ' + y);
      }
    };
  }

  function sPhy(g) {
    cap(g, 20, 34, 'ONE 800G PORT = 4 LANES × 200 Gb/s', K.text);
    R(g, 20, 60, 150, 470, { fill: '#08171c', stroke: K.data, rx: 10 }); T(g, 95, 290, 'MAC', { 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 700 }); T(g, 95, 312, '800 Gb/s', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12.5 });
    const cols = [['PCS + FEC', 'encode, add RS(544,514) check symbols', 220, K.acc], ['PMA', 'serialize, 2 bits → 1 PAM4 symbol', 440, K.ctrl], ['PMD', 'drive the medium: laser / copper', 660, K.optic]];
    cols.forEach(([n, d, x, c]) => { R(g, x, 60, 180, 470, { fill: K.panel, stroke: c, rx: 10 }); T(g, x + 90, 86, n, { 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: c }); T(g, x + 90, 106, d, { 'text-anchor': 'middle', 'font-size': 11, fill: K.muted }); });
    const lanes = [0, 1, 2, 3].map(i => 170 + i * 92);
    const blocks = [], waves = [];
    lanes.forEach((y, i) => {
      L(g, 170, y, 960, y, { stroke: K.line, 'stroke-width': 2 });
      T(g, 980, y + 4, 'λ / lane ' + (i + 1), { 'text-anchor': 'end', fill: K.optic, 'font-size': 11 });
      for (let k = 0; k < 4; k++) blocks.push({ y, k, el: R(g, 0, y - 10, 30, 20, { fill: K.acc, stroke: 'none', rx: 2 }), fec: R(g, 0, y - 10, 8, 20, { fill: K.warn, stroke: 'none', rx: 1 }) });
      waves.push(P(g, '', { stroke: K.optic, 'stroke-width': 2 }));
    });
    T(g, 310, 560, 'yellow = FEC check symbols (~6 %)', { 'text-anchor': 'middle', fill: K.warn, 'font-size': 12 });
    T(g, 750, 560, '~106–113 GBd PAM4 per lane', { 'text-anchor': 'middle', fill: K.optic, 'font-size': 12 });
    return {
      hot: [{ x: 840, y: 140, w: 150, h: 330, target: 'nw-cabling', label: 'Cables & fiber' }],
      update(t) {
        blocks.forEach(b => { const x = 180 + ((t * 120 + b.k * 120) % 480); b.el.setAttribute('x', x); b.fec.setAttribute('x', x + 30); b.fec.setAttribute('opacity', x > 260 ? 1 : 0); b.el.setAttribute('opacity', x > 640 ? 0 : 1); b.fec.setAttribute('opacity', x > 260 && x < 640 ? 1 : 0); });
        waves.forEach((w, i) => { let d = ''; for (let x = 0; x <= 290; x += 10) { const v = [3, 0, 2, 1, 3, 1, 0, 2][(Math.floor((x + t * 160) / 20) + i * 3) % 8]; d += (x ? 'L' : 'M') + (670 + x) + ' ' + (lanes[i] - 6 - v * 7) + ' L' + (680 + x) + ' ' + (lanes[i] - 6 - v * 7); } w.setAttribute('d', d); });
      }
    };
  }

  function sCabling(g) {
    cap(g, 20, 34, 'WHICH CABLE FOR WHICH DISTANCE (200G-per-lane era, typical)', K.text);
    const X = m => 160 + Math.log10(m / 0.3) / Math.log10(10000 / 0.3) * 800;
    [[0.3, '0.3 m'], [1, '1 m'], [3, '3 m'], [10, '10 m'], [100, '100 m'], [500, '500 m'], [2000, '2 km'], [10000, '10 km']].forEach(([m, l]) => { L(g, X(m), 60, X(m), 420, { stroke: K.line, 'stroke-dasharray': '2 5' }); T(g, X(m), 440, l, { 'text-anchor': 'middle', fill: K.muted, 'font-size': 11.5 }); });
    const rows = [
      ['DAC · passive copper', 0.3, 1.5, K.copper, 'inside the rack; no power, cheapest'],
      ['AEC · active copper', 0.5, 5, '#e3a35a', 'copper + retimer chip; a few metres'],
      ['SR · multimode fiber', 3, 60, '#22d3ee', 'VCSEL lasers on OM4 fiber; short reach'],
      ['DR · single-mode, 500 m', 3, 500, K.optic, 'one fiber pair per lane; CPO-class'],
      ['FR · single-mode, 2 km', 3, 2000, '#ffa53d', 'several wavelengths per fiber'],
      ['LR · single-mode, 10 km', 3, 10000, '#ffc23d', 'campus / between buildings']];
    const ds = [];
    rows.forEach(([n, a, b2, c, d], i) => {
      const y = 80 + i * 56;
      T(g, 20, y + 18, n, { fill: c, 'font-size': 12.5, 'font-weight': 700 });
      R(g, X(a), y, X(b2) - X(a), 26, { fill: c, 'fill-opacity': .3, stroke: c, rx: 6 });
      const tx = X(b2) + 8 > 820 ? X(a) + 8 : X(b2) + 8; T(g, tx, y + 18, d, { 'font-size': 11.5, fill: tx > X(a) + 10 ? K.muted : K.text });
      ds.push({ a: X(a), b: X(b2), y: y + 13, d: dots(g, 2, c, 3.5) });
    });
    R(g, 20, 470, 960, 110, { fill: K.panel, stroke: K.line, rx: 10 });
    T(g, 40, 496, 'Fibers:', { 'font-weight': 700, 'font-size': 13.5 }); T(g, 110, 496, 'single-mode OS2 (9 µm core, 1310 nm: CPO and DR/FR)  ·  multimode OM4/OM5 (50 µm core, 850 nm VCSELs, short reach)', { 'font-size': 13 });
    T(g, 40, 522, 'Connectors:', { 'font-weight': 700, 'font-size': 13.5 }); T(g, 130, 522, 'LC duplex (1 pair)  ·  MPO/MTP-12/16 (many fibers in one plug)  ·  CPO: detachable multi-fiber front-panel connectors', { 'font-size': 13 });
    T(g, 40, 548, 'Modules:', { 'font-weight': 700, 'font-size': 13.5 }); T(g, 110, 548, 'OSFP and QSFP-DD cages for pluggables (also used on the NIC side of CPO links)', { 'font-size': 13 });
    return {
      hot: [{ x: X(3) - 4, y: 128, w: X(500) - X(3) + 8, h: 90, target: 'nw-ethernet', label: 'Ethernet frames' }],
      update(t) { ds.forEach(r => r.d.forEach((d, k) => { const u = (t * 0.4 + k / 2) % 1; d.setAttribute('cx', r.a + u * (r.b - r.a)); d.setAttribute('cy', r.y); })); }
    };
  }

  function sEthernet(g) {
    cap(g, 20, 34, 'AN ETHERNET FRAME (bytes)', K.text);
    const f = [['Preamble', 8, K.muted], ['Dst MAC', 6, K.optic], ['Src MAC', 6, K.optic], ['VLAN', 4, K.ctrl], ['Type', 2, K.data], ['Payload: IP packet', 46, K.acc], ['FCS', 4, K.warn], ['Gap', 12, '#3b4a5e']];
    const tot = f.reduce((a, x) => a + x[1], 0); let x = 20;
    f.forEach(([n, b2, c]) => { const w = 960 * b2 / tot; R(g, x, 50, w - 3, 54, { fill: c, 'fill-opacity': .25, stroke: c, rx: 4 }); T(g, x + w / 2, 75, n, { 'text-anchor': 'middle', 'font-size': 11.5 }); T(g, x + w / 2, 94, b2 === 46 ? '46–1500 (9000 jumbo)' : String(b2), { 'text-anchor': 'middle', 'font-size': 11, fill: K.muted }); x += w; });
    cap(g, 20, 150, 'A SWITCH LEARNS WHERE EACH MAC ADDRESS LIVES', K.text);
    R(g, 380, 250, 240, 110, { fill: '#1d0e08', stroke: K.optic, 'stroke-width': 2, rx: 10 }); T(g, 500, 300, 'Ethernet switch', { 'text-anchor': 'middle', 'font-weight': 700 }); T(g, 500, 320, 'forwards by destination MAC', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12 });
    const hosts = [['A', 90, 200], ['B', 910, 200], ['C', 90, 430], ['D', 910, 430]], port = { A: [380, 270], B: [620, 270], C: [380, 340], D: [620, 340] };
    hosts.forEach(([n, hx, hy]) => { R(g, hx - 50, hy - 30, 100, 60, { fill: K.panel2, stroke: K.line, rx: 8 }); T(g, hx, hy - 2, 'Host ' + n, { 'text-anchor': 'middle', 'font-size': 13.5 }); T(g, hx, hy + 16, 'MAC …:0' + n, { 'text-anchor': 'middle', 'font-size': 11, fill: K.muted }); L(g, hx + (hx < 500 ? 50 : -50), hy, port[n][0], port[n][1], { stroke: K.line, 'stroke-width': 2 }); });
    R(g, 380, 400, 240, 150, { fill: K.panel, stroke: K.line, rx: 8 }); cap(g, 396, 422, 'MAC TABLE', K.text);
    const tbl = [0, 1, 2].map(i => T(g, 396, 450 + i * 24, '', { 'font-family': 'ui-monospace,monospace', 'font-size': 13 }));
    const pkt = R(g, 0, 0, 34, 18, { fill: K.optic, stroke: 'none', rx: 3 }), pk2 = R(g, 0, 0, 34, 18, { fill: K.optic, stroke: 'none', rx: 3, opacity: 0 }), pk3 = R(g, 0, 0, 34, 18, { fill: K.optic, stroke: 'none', rx: 3, opacity: 0 });
    const note = T(g, 500, 585, '', { 'text-anchor': 'middle', 'font-size': 13.5, fill: K.text });
    const mv = (r, a, b2, u) => { r.setAttribute('x', C.lerp(a[0], b2[0], u) - 17); r.setAttribute('y', C.lerp(a[1], b2[1], u) - 9); };
    return {
      hot: [{ x: 20, y: 46, w: 960, h: 62, target: 'nw-ip', label: 'IP & routing', below: true }],
      update(t) {
        const c = t % 9, A = [140, 200], sw = [500, 300];
        pk2.setAttribute('opacity', 0); pk3.setAttribute('opacity', 0);
        if (c < 1.5) { mv(pkt, A, sw, c / 1.5); note.textContent = 'A sends a frame to B. The switch notes "A is on port 1".'; tbl[0].textContent = c > 1.2 ? '…:0A → port 1' : ''; tbl[1].textContent = ''; }
        else if (c < 3.5) { const u = (c - 1.5) / 2; mv(pkt, sw, [860, 200], u); pk2.setAttribute('opacity', 1); mv(pk2, sw, [140, 430], u); pk3.setAttribute('opacity', 1); mv(pk3, sw, [860, 430], u); note.textContent = 'B is unknown, so the switch floods the frame to every other port.'; }
        else if (c < 5.5) { const u = (c - 3.5) / 2; mv(pkt, [860, 200], sw, u); note.textContent = 'B replies. The switch learns "B is on port 2".'; tbl[1].textContent = u > 0.8 ? '…:0B → port 2' : ''; }
        else if (c < 7.5) { const u = (c - 5.5) / 2; mv(pkt, sw, A, u); note.textContent = 'Now it knows: the reply goes only to A. No more flooding.'; }
        else { pkt.setAttribute('x', -50); note.textContent = 'Large AI fabrics route with IP (layer 3) between switches rather than flooding.'; }
        tbl[2].textContent = '';
      }
    };
  }

  function sIp(g) {
    cap(g, 20, 34, 'IP ROUTING ACROSS A LEAF/SPINE FABRIC, WITH ECMP', K.text);
    const sp = [0, 1, 2, 3].map(i => [230 + i * 160, 90]);
    const la = [150, 300], lb = [850, 300];
    sp.forEach(([x, y], i) => { R(g, x - 55, y - 22, 110, 44, { fill: '#1d0e08', stroke: K.optic, rx: 6 }); T(g, x, y + 5, 'spine ' + (i + 1), { 'text-anchor': 'middle', 'font-size': 13 }); L(g, la[0], la[1] - 22, x, y + 22, { stroke: K.optic, 'stroke-opacity': .3 }); L(g, lb[0], lb[1] - 22, x, y + 22, { stroke: K.optic, 'stroke-opacity': .3 }); });
    [[la, 'leaf A', '10.0.1.0/24'], [lb, 'leaf D', '10.0.4.0/24']].forEach(([p, n, s]) => { R(g, p[0] - 70, p[1] - 22, 140, 44, { fill: '#1d0e08', stroke: K.optic, 'stroke-width': 2, rx: 6 }); T(g, p[0], p[1] - 1, n, { 'text-anchor': 'middle', 'font-size': 13.5, 'font-weight': 700 }); T(g, p[0], p[1] + 15, s, { 'text-anchor': 'middle', 'font-size': 11, fill: K.muted }); });
    R(g, 80, 360, 140, 50, { fill: K.panel2, stroke: K.line, rx: 8 }); T(g, 150, 382, 'GPU NIC', { 'text-anchor': 'middle', 'font-size': 13 }); T(g, 150, 400, '10.0.1.5', { 'text-anchor': 'middle', 'font-size': 12, fill: K.acc });
    R(g, 780, 360, 140, 50, { fill: K.panel2, stroke: K.line, rx: 8 }); T(g, 850, 382, 'GPU NIC', { 'text-anchor': 'middle', 'font-size': 13 }); T(g, 850, 400, '10.0.4.7', { 'text-anchor': 'middle', 'font-size': 12, fill: K.acc });
    L(g, 150, 360, 150, 322, { stroke: K.optic, 'stroke-width': 2 }); L(g, 850, 360, 850, 322, { stroke: K.optic, 'stroke-width': 2 });
    R(g, 260, 330, 480, 110, { fill: K.panel, stroke: K.line, rx: 8 }); cap(g, 276, 352, 'LEAF A ROUTING TABLE', K.text);
    T(g, 276, 378, '10.0.1.0/24  → local ports', { 'font-family': 'ui-monospace,monospace', 'font-size': 13 });
    T(g, 276, 402, '10.0.4.0/24  → spine 1 | 2 | 3 | 4   (ECMP)', { 'font-family': 'ui-monospace,monospace', 'font-size': 13, fill: K.acc });
    T(g, 276, 426, 'longest matching prefix wins; learned via BGP', { 'font-size': 12, fill: K.muted });
    const cols = ['#ff6b3d', '#22d3ee', '#a78bfa', '#facc15'];
    const flows = cols.map((c, i) => ({ c, pts: [[150, 360], [la[0], la[1] - 22], [sp[i][0], sp[i][1] + 22], [lb[0], lb[1] - 22], [850, 360]], d: dots(g, 2, c, 5) }));
    R(g, 20, 470, 960, 110, { fill: K.panel, stroke: K.line, rx: 10 });
    T(g, 40, 498, 'ECMP = Equal-Cost Multi-Path: the switch hashes each flow\'s header fields (addresses, ports) to pick one spine.', { 'font-size': 13.5 });
    T(g, 40, 522, 'One flow stays on one path (no reordering), different flows spread out. Each colour above is one flow.', { 'font-size': 13.5 });
    T(g, 40, 546, 'Problem for AI: a few huge flows can collide on the same spine → adaptive routing / packet spraying (see Lossless).', { 'font-size': 13.5, fill: K.warn });
    return {
      hot: [{ x: 776, y: 356, w: 148, h: 58, target: 'nw-tcp', label: 'TCP & UDP', below: true }],
      update(t) { flows.forEach((f, i) => run(f.d, f.pts, t, 0.22, i * 0.12)); }
    };
  }

  function sTcp(g) {
    cap(g, 20, 34, 'TCP: RELIABLE, ORDERED, AND DONE IN SOFTWARE', K.text);
    const xa = 120, xb = 480;
    T(g, xa, 70, 'Sender', { 'text-anchor': 'middle', 'font-weight': 700 }); T(g, xb, 70, 'Receiver', { 'text-anchor': 'middle', 'font-weight': 700 });
    L(g, xa, 80, xa, 580, { stroke: K.line, 'stroke-width': 3 }); L(g, xb, 80, xb, 580, { stroke: K.line, 'stroke-width': 3 });
    const msgs = [['SYN', 0, K.ctrl], ['SYN-ACK', 1, K.ctrl], ['ACK', 0, K.ctrl], ['data seq 1', 0, K.acc], ['ACK 2', 1, K.data], ['data seq 2', 0, K.acc], ['data seq 3 ✕ lost', 0, K.bad, true], ['ACK 3 (dup)', 1, K.data], ['resend seq 3', 0, K.warn], ['ACK 4', 1, K.data]];
    const arr = msgs.map(([lbl, dir, c, lost], i) => { const y = 100 + i * 46; const p = P(g, '', { stroke: c, 'stroke-width': 2.5 }); const tx = T(g, (xa + xb) / 2, y + 12, lbl, { 'text-anchor': 'middle', 'font-size': 12.5, fill: c }); return { y, dir, lost, p, tx }; });
    // cwnd graph
    R(g, 560, 80, 420, 250, { fill: '#05080b', stroke: K.line, rx: 8 }); cap(g, 576, 104, 'CONGESTION WINDOW (how much is in flight)', K.muted);
    let d = ''; for (let i = 0; i <= 100; i++) { const tt = i / 100 * 4; const ph = tt % 1.3; const v = Math.min(1, 0.15 + ph * 0.65); d += (i ? 'L' : 'M') + (580 + i * 3.8) + ' ' + (310 - v * 170); }
    P(g, d, { stroke: K.acc, 'stroke-width': 2.5 }); T(g, 770, 320, 'grow until a loss, then halve: a "sawtooth"', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 11.5 });
    R(g, 560, 350, 420, 220, { fill: K.panel, stroke: K.line, rx: 8 }); cap(g, 576, 374, 'WHY AI FABRICS AVOID TCP FOR GPU DATA', K.optic);
    ['Every byte passes through the CPU and the OS kernel:', '  copies + interrupts → tens of µs, lots of CPU time.', 'A lost packet waits for a timeout or duplicate ACKs.', 'UDP: no handshake, no retransmission: fast but unreliable.', '→ GPU traffic uses RDMA (InfiniBand or RoCE), with', '  reliability in the NIC hardware. TCP/IP stays for', '  management, storage and the front-end network.'].forEach((s, i) => T(g, 576, 400 + i * 23, s, { 'font-size': 12.5, fill: i >= 4 ? K.acc : K.text }));
    return {
      hot: [{ x: 556, y: 346, w: 428, h: 228, target: 'nw-rdma', label: 'RDMA' }],
      update(t) {
        const shown = (t * 1.3) % (msgs.length + 3);
        arr.forEach((a, i) => {
          const u = C.clamp(shown - i, 0, 1), x0 = a.dir ? xb : xa, x1 = a.dir ? xa : xb, xe = a.lost ? C.lerp(x0, x1, 0.6) : x1;
          const xc = C.lerp(x0, xe, u), y1 = a.y + 30 * u;
          a.p.setAttribute('d', u > 0 ? 'M' + x0 + ' ' + a.y + ' L' + xc + ' ' + y1 : '');
          a.tx.setAttribute('opacity', u > 0.3 ? 1 : 0);
        });
      }
    };
  }

  function sRdma(g) {
    cap(g, 20, 34, 'RDMA: GPU MEMORY TO GPU MEMORY, NO CPU IN THE WAY', K.text);
    function server(x, lbl) {
      R(g, x, 70, 380, 330, { fill: '#0b1016', stroke: '#3b4a5e', rx: 10 }); T(g, x + 190, 92, lbl, { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12.5 });
      R(g, x + 20, 110, 150, 60, { fill: '#160f24', stroke: K.ctrl }); T(g, x + 95, 145, 'CPU + OS kernel', { 'text-anchor': 'middle', 'font-size': 12.5 });
      R(g, x + 210, 110, 150, 60, { fill: '#0b1a2e', stroke: K.cool }); T(g, x + 285, 145, 'system memory', { 'text-anchor': 'middle', 'font-size': 12.5 });
      R(g, x + 20, 230, 150, 70, { fill: '#1b2a10', stroke: K.acc, 'stroke-width': 2 }); T(g, x + 95, 270, 'GPU memory', { 'text-anchor': 'middle', 'font-size': 13 });
      R(g, x + 210, 320, 150, 60, { fill: '#08171c', stroke: K.data, 'stroke-width': 2 }); T(g, x + 285, 348, 'NIC', { 'text-anchor': 'middle', 'font-size': 13 }); T(g, x + 285, 366, '(ConnectX)', { 'text-anchor': 'middle', 'font-size': 11, fill: K.muted });
    }
    server(30, 'server A'); server(590, 'server B');
    L(g, 410, 350, 590, 350, { stroke: K.optic, 'stroke-width': 3 }); T(g, 500, 340, 'network', { 'text-anchor': 'middle', fill: K.optic, 'font-size': 12.5 });
    const tcp = [[125, 230], [125, 170], [240, 140], [315, 170], [315, 320], [410, 350], [590, 350], [875, 320], [875, 170], [800, 140], [685, 170], [685, 230]];
    const rd = [[200, 265], [315, 320], [410, 350], [590, 350], [685, 320], [760, 265]];
    P(g, ptsD(tcp), { stroke: K.ctrl, 'stroke-width': 2, 'stroke-dasharray': '5 5', 'stroke-opacity': .7 });
    P(g, ptsD(rd), { stroke: K.acc, 'stroke-width': 3, 'stroke-opacity': .8 });
    const dT = dots(g, 3, K.ctrl, 5), dR = dots(g, 4, K.acc, 5);
    R(g, 30, 420, 470, 160, { fill: K.panel, stroke: K.ctrl, rx: 10 }); cap(g, 46, 444, 'TCP/IP SOCKETS (dashed)', K.ctrl);
    ['copy GPU → system memory → kernel buffers', 'CPU builds packets, handles every ACK', 'latency: tens of µs, CPU-heavy'].forEach((s, i) => T(g, 46, 472 + i * 24, s, { 'font-size': 13 }));
    R(g, 520, 420, 450, 160, { fill: K.panel, stroke: K.acc, rx: 10 }); cap(g, 536, 444, 'RDMA + GPUDirect (solid)', K.acc);
    ['NIC reads GPU memory directly (zero copy)', 'NIC handles reliability and ordering in hardware', 'latency: a few µs, almost no CPU use'].forEach((s, i) => T(g, 536, 472 + i * 24, s, { 'font-size': 13 }));
    return {
      hot: [{ x: 516, y: 416, w: 458, h: 168, target: 'nw-ib', label: 'InfiniBand' }],
      update(t) { run(dT, tcp, t, 0.1); run(dR, rd, t, 0.4); }
    };
  }

  function sIb(g) {
    cap(g, 20, 34, 'INFINIBAND: LOSSLESS BY DESIGN, MANAGED CENTRALLY', K.text);
    R(g, 360, 60, 280, 70, { fill: '#160f24', stroke: K.ctrl, 'stroke-width': 2, rx: 10 }); T(g, 500, 90, 'Subnet Manager', { 'text-anchor': 'middle', 'font-weight': 700 }); T(g, 500, 110, 'discovers the fabric, assigns LIDs, computes routes', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 11.5 });
    const sw = [[220, 220, 'LID 1'], [500, 220, 'LID 2'], [780, 220, 'LID 3']];
    sw.forEach(([x, y, l]) => { R(g, x - 70, y - 25, 140, 50, { fill: '#1d0e08', stroke: K.optic, rx: 6 }); T(g, x, y + 5, 'IB switch · ' + l, { 'text-anchor': 'middle', 'font-size': 12.5 }); P(g, 'M500 130 L' + x + ' ' + (y - 25), { stroke: K.ctrl, 'stroke-dasharray': '4 4' }); });
    L(g, 290, 220, 430, 220, { stroke: K.optic, 'stroke-width': 2 }); L(g, 570, 220, 710, 220, { stroke: K.optic, 'stroke-width': 2 });
    // credit flow demo
    cap(g, 40, 310, 'CREDIT-BASED FLOW CONTROL: SEND ONLY WHEN THE RECEIVER HAS ROOM', K.text);
    R(g, 40, 330, 200, 120, { fill: K.panel2, stroke: K.data, rx: 8 }); T(g, 140, 360, 'Sender port', { 'text-anchor': 'middle', 'font-size': 13.5 });
    const cr = T(g, 140, 395, '', { 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 700, fill: K.acc }); T(g, 140, 420, 'credits left', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12 });
    R(g, 700, 330, 260, 120, { fill: K.panel2, stroke: K.data, rx: 8 }); T(g, 830, 352, 'Receiver buffer', { 'text-anchor': 'middle', 'font-size': 13.5 });
    const slots = [0, 1, 2, 3, 4, 5].map(i => R(g, 716 + i * 40, 372, 32, 56, { fill: '#0b1016', stroke: K.line, rx: 3 }));
    L(g, 240, 375, 700, 375, { stroke: K.optic, 'stroke-width': 2 }); L(g, 700, 415, 240, 415, { stroke: K.ctrl, 'stroke-width': 1.5, 'stroke-dasharray': '4 4' });
    T(g, 470, 365, 'data packets →', { 'text-anchor': 'middle', fill: K.optic, 'font-size': 12 }); T(g, 470, 433, '← credits returned as buffers drain', { 'text-anchor': 'middle', fill: K.ctrl, 'font-size': 12 });
    const pk = dots(g, 3, K.optic, 6), cd = dots(g, 2, K.ctrl, 4);
    R(g, 40, 470, 920, 110, { fill: K.panel, stroke: K.line, rx: 10 });
    T(g, 60, 498, 'No buffer overflow → no drops, unlike classic Ethernet. Adaptive routing spreads traffic over many paths.', { 'font-size': 13.5 });
    T(g, 60, 522, 'SHARP: the switches themselves add up numbers for all-reduce ("in-network computing"), halving traffic.', { 'font-size': 13.5 });
    T(g, 60, 546, 'Generations: HDR 200G → NDR 400G → XDR 800G per port (Quantum-X800 / Quantum-X Photonics).', { 'font-size': 13.5, fill: K.acc });
    return {
      hot: [{ x: 36, y: 466, w: 928, h: 118, target: 'nw-lossless', label: 'Lossless Ethernet' }],
      update(t) {
        const fill = Math.floor((Math.sin(t * 0.8) + 1) * 3.2);
        slots.forEach((s, i) => s.setAttribute('fill', i < fill ? '#3a1a0d' : '#0b1016'));
        cr.textContent = String(6 - fill);
        pk.forEach((d, k) => { const u = (t * 0.5 + k / 3) % 1; d.setAttribute('cx', 6 - fill > 0 ? 240 + u * 460 : -9); d.setAttribute('cy', 375); });
        cd.forEach((d, k) => { const u = (t * 0.4 + k / 2) % 1; d.setAttribute('cx', 700 - u * 460); d.setAttribute('cy', 415); });
      }
    };
  }

  function sLossless(g) {
    cap(g, 20, 34, 'LOSSLESS ETHERNET FOR AI: ECN, PFC AND ADAPTIVE ROUTING', K.text);
    const snd = [[120, 120], [120, 260], [120, 400]];
    snd.forEach(([x, y], i) => { R(g, x - 70, y - 28, 140, 56, { fill: K.panel2, stroke: K.data, rx: 8 }); T(g, x, y + 5, 'sender ' + (i + 1), { 'text-anchor': 'middle', 'font-size': 13 }); L(g, x + 70, y, 420, 260, { stroke: K.optic, 'stroke-opacity': .4, 'stroke-width': 2 }); });
    R(g, 420, 180, 200, 160, { fill: '#1d0e08', stroke: K.optic, 'stroke-width': 2, rx: 10 }); T(g, 520, 204, 'switch egress queue', { 'text-anchor': 'middle', 'font-size': 12.5 });
    const q = [0, 1, 2, 3, 4, 5, 6, 7].map(i => R(g, 440 + i * 21, 230, 17, 80, { fill: '#0b1016', stroke: K.line, rx: 2 }));
    L(g, 440 + 4 * 21 - 2, 222, 440 + 4 * 21 - 2, 318, { stroke: K.warn, 'stroke-width': 2, 'stroke-dasharray': '3 3' }); T(g, 522, 334, 'ECN', { fill: K.warn, 'font-size': 11, 'text-anchor': 'middle' });
    L(g, 440 + 7 * 21 - 2, 222, 440 + 7 * 21 - 2, 318, { stroke: K.ctrl, 'stroke-width': 2, 'stroke-dasharray': '3 3' }); T(g, 585, 334, 'PFC', { fill: K.ctrl, 'font-size': 11, 'text-anchor': 'middle' });
    L(g, 620, 260, 860, 260, { stroke: K.optic, 'stroke-width': 3 });
    R(g, 860, 230, 120, 60, { fill: K.panel2, stroke: K.data, rx: 8 }); T(g, 920, 265, 'receiver', { 'text-anchor': 'middle', 'font-size': 13 });
    const pk = snd.map(([x, y]) => ({ pts: [[x + 70, y], [420, 260]], d: dots(g, 2, K.optic, 5) }));
    const out = dots(g, 3, K.optic, 5);
    const pause = T(g, 260, 470, '', { 'font-size': 14, 'font-weight': 700, fill: K.ctrl });
    const ecn = T(g, 260, 496, '', { 'font-size': 14, 'font-weight': 700, fill: K.warn });
    R(g, 640, 340, 340, 240, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 656, 364, 'THE THREE TOOLS', K.text);
    [['ECN', 'switch marks packets when the queue grows;', 'receiver echoes it; sender slows (DCQCN).', K.warn], ['PFC', 'last resort: a PAUSE frame tells the upstream', 'port to stop one traffic class briefly.', K.ctrl], ['Adaptive routing', 'Spectrum-X sprays packets over all paths;', 'the SuperNIC puts them back in order.', K.acc]].forEach(([n, a, b2, c], i) => { T(g, 656, 392 + i * 62, n, { 'font-weight': 700, fill: c, 'font-size': 13.5 }); T(g, 656, 410 + i * 62, a, { 'font-size': 12.5 }); T(g, 656, 427 + i * 62, b2, { 'font-size': 12.5 }); });
    T(g, 40, 540, 'Three senders → one receiver at full rate = "incast": the queue must absorb, mark or pause.', { 'font-size': 13, fill: K.muted });
    return {
      hot: [{ x: 636, y: 336, w: 348, h: 248, target: 'nw-nvlink', label: 'NVLink' }],
      update(t) {
        const lvl = Math.floor((Math.sin(t * 0.7) * 0.5 + 0.5) * 8.99);
        q.forEach((r, i) => r.setAttribute('fill', i < lvl ? (i >= 7 ? K.ctrl : i >= 4 ? K.warn : K.optic) : '#0b1016'));
        pause.textContent = lvl >= 8 ? '⏸ PFC PAUSE sent upstream' : '';
        ecn.textContent = lvl >= 4 ? '⚠ ECN marks → senders slow down' : '';
        pk.forEach(p => run(p.d, p.pts, t, lvl >= 8 ? 0 : 0.5));
        run(out, [[620, 260], [860, 260]], t, 0.6);
      }
    };
  }

  function sNvlink(g) {
    cap(g, 20, 34, 'NVLINK: THE SCALE-UP NETWORK INSIDE THE RACK', K.text);
    const gpus = [], swx = [];
    for (let i = 0; i < 9; i++) swx.push(R(g, 120 + i * 85, 250, 70, 60, { fill: '#08171c', stroke: K.data, 'stroke-width': 1.5, rx: 6 }));

    for (let i = 0; i < 12; i++) { const top = i < 6, x = 90 + (i % 6) * 150, y = top ? 80 : 420; gpus.push([x + 50, y + (top ? 60 : 0)]); R(g, x, y, 100, 60, { fill: '#1b2a10', stroke: K.acc, rx: 6 }); T(g, x + 50, y + 35, 'GPU', { 'text-anchor': 'middle', 'font-size': 13 }); }
    T(g, 500, 70, '… 72 GPUs in an NVL72 rack (12 shown)', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12 });
    const ln = [];
    gpus.forEach(([x, y], i) => [0, 4, 8].forEach(s => { const sx = 155 + s * 85, sy = y < 300 ? 250 : 310; ln.push({ a: [x, y], b: [sx, sy] }); L(g, x, y, sx, sy, { stroke: K.copper, 'stroke-opacity': .25 }); }));
    const pk = []; for (let k = 0; k < 18; k++) { const l = ln[(k * 7) % ln.length]; pk.push({ l, p: Math.random(), el: O(g, 0, 0, 3.5, { fill: K.copper }) }); }
    R(g, 380, 222, 240, 22, { fill: '#05070a', stroke: K.data, rx: 11 }); T(g, 500, 237, 'NVLink switch chips (NVSwitch)', { 'text-anchor': 'middle', 'font-size': 12.5, fill: K.data });
    R(g, 20, 500, 960, 90, { fill: K.panel, stroke: K.line, rx: 10 });
    T(g, 40, 526, 'Memory semantics: a GPU can directly load/store into another GPU\'s memory, as if it were its own.', { 'font-size': 13.5 });
    T(g, 40, 550, 'Copper, ≤ ~2 m, 1.8 TB/s per GPU (NVLink 5): ~18× one 800G network port. Every GPU reaches every GPU in one hop.', { 'font-size': 13.5, fill: K.acc });
    T(g, 40, 574, 'Scale-out (Ethernet / InfiniBand + CPO) joins thousands of these NVLink domains together.', { 'font-size': 13.5, fill: K.muted });
    return {
      hot: [{ x: 86, y: 76, w: 108, h: 68, target: 'nw-pcie', label: 'PCIe' }],
      update(t, dt) { pk.forEach(q => { q.p += dt * 0.7; if (q.p > 1) { q.p = 0; q.l = ln[Math.floor(Math.random() * ln.length)]; } q.el.setAttribute('cx', C.lerp(q.l.a[0], q.l.b[0], q.p)); q.el.setAttribute('cy', C.lerp(q.l.a[1], q.l.b[1], q.p)); }); swx.forEach((s, i) => s.setAttribute('fill-opacity', 0.6 + 0.4 * Math.sin(t * 3 + i))); }
    };
  }

  function sPcie(g) {
    cap(g, 20, 34, 'PCIe: THE HOST BUS THAT CONNECTS CPU, GPUs, NICs AND SSDs', K.text);
    R(g, 400, 60, 200, 70, { fill: '#160f24', stroke: K.ctrl, 'stroke-width': 2, rx: 8 }); T(g, 500, 95, 'CPU (root complex)', { 'text-anchor': 'middle', 'font-size': 13.5 }); T(g, 500, 115, 'starts the tree', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 11.5 });
    R(g, 380, 200, 240, 60, { fill: '#08171c', stroke: K.data, 'stroke-width': 2, rx: 8 }); T(g, 500, 236, 'PCIe switch', { 'text-anchor': 'middle', 'font-size': 13.5 });
    const leaves = [['GPU', 120, K.acc], ['NIC (800G)', 340, K.optic], ['NIC (800G)', 560, K.optic], ['NVMe SSD', 780, K.cool]];
    const paths = [];
    leaves.forEach(([n, x, c]) => { R(g, x, 340, 140, 60, { fill: K.panel2, stroke: c, rx: 8 }); T(g, x + 70, 375, n, { 'text-anchor': 'middle', 'font-size': 13 }); L(g, 500, 260, x + 70, 340, { stroke: K.data, 'stroke-width': 2.5, 'stroke-opacity': .6 }); paths.push([[500, 130], [500, 200], [500, 260], [x + 70, 340]]); });
    L(g, 500, 130, 500, 200, { stroke: K.data, 'stroke-width': 3 });
    T(g, 512, 172, 'x16 link', { fill: K.data, 'font-size': 12 });
    const ds = paths.map(p => dots(g, 2, K.data, 4));
    R(g, 20, 430, 470, 150, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 36, 454, 'HOW FAST (per direction, x16)', K.text);
    [['Gen4', '16 GT/s', '~32 GB/s'], ['Gen5', '32 GT/s', '~64 GB/s'], ['Gen6', '64 GT/s, PAM4', '~128 GB/s']].forEach(([a, b2, c], i) => { T(g, 36, 482 + i * 26, a, { 'font-weight': 700, 'font-size': 13.5 }); T(g, 110, 482 + i * 26, b2, { 'font-size': 13 }); T(g, 300, 482 + i * 26, c, { 'font-size': 13, fill: K.acc }); });
    R(g, 510, 430, 470, 150, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 526, 454, 'WHERE IT MATTERS FOR YOU', K.text);
    ['an 800G NIC needs ~100 GB/s: Gen5 x16 is ~64 GB/s,', 'so 800G NICs need Gen6 or a wider/dual link', 'in the switch: the host CPU reaches the ASIC over PCIe', 'CXL reuses PCIe wiring for coherent memory'].forEach((s, i) => T(g, 526, 482 + i * 24, s, { 'font-size': 12.5, fill: i < 2 ? K.warn : K.text }));
    return {
      hot: [{ x: 336, y: 336, w: 148, h: 68, target: 'nw-mgmt', label: 'Management buses', below: true }],
      update(t) { ds.forEach((d, i) => run(d, paths[i], t, 0.4, i * 0.2)); }
    };
  }

  function sMgmt(g) {
    cap(g, 20, 34, 'THE SLOW BUT ESSENTIAL MANAGEMENT BUSES INSIDE THE BOX', K.text);
    R(g, 410, 230, 180, 90, { fill: '#160f24', stroke: K.ctrl, 'stroke-width': 2, rx: 10 }); T(g, 500, 270, 'BMC / CPLD', { 'text-anchor': 'middle', 'font-weight': 700 }); T(g, 500, 292, 'the box\'s caretaker', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12 });
    const buses = [
      ['I2C / SMBus / I3C', '2 wires · 0.1–1 MHz (I3C ~12 MHz)', 'sensors, EEPROMs, optics (CMIS)', 60, 70, K.ctrl],
      ['SPI', '4 wires · 10s of MHz', 'boot flash, CPLD/FPGA images', 720, 70, K.data],
      ['UART', '2 wires · 115.2 kb/s', 'serial console for debugging', 60, 420, K.sense],
      ['JTAG', '4–5 wires', 'chip debug and programming', 720, 420, K.warn],
      ['MDIO', '2 wires', 'configure PHY / retimer chips', 60, 245, K.optic],
      ['PMBus', 'I2C-based', 'read/set voltage regulators', 720, 245, K.power]];
    const ds = [];
    buses.forEach(([n, a, b2, x, y, c]) => {
      R(g, x, y, 220, 90, { fill: K.panel, stroke: c, rx: 8 }); T(g, x + 12, y + 26, n, { 'font-weight': 700, fill: c, 'font-size': 14 }); T(g, x + 12, y + 48, a, { 'font-size': 12 }); T(g, x + 12, y + 68, b2, { 'font-size': 12, fill: K.muted });
      const pts = [[x < 500 ? x + 220 : x, y + 45], [500, 275]]; L(g, pts[0][0], pts[0][1], 500, 275, { stroke: c, 'stroke-opacity': .35, 'stroke-width': 2 }); ds.push({ pts, d: dots(g, 2, c, 3.5) });
    });
    // I2C waveform
    R(g, 290, 360, 420, 160, { fill: '#05080b', stroke: K.line, rx: 8 }); cap(g, 304, 382, 'ONE I2C READ, BIT BY BIT', K.muted);
    T(g, 304, 410, 'SCL', { fill: K.muted, 'font-size': 11 }); T(g, 304, 455, 'SDA', { fill: K.muted, 'font-size': 11 });
    const scl = P(g, '', { stroke: K.data, 'stroke-width': 2 }), sda = P(g, '', { stroke: K.ctrl, 'stroke-width': 2 });
    const lab = T(g, 500, 500, '', { 'text-anchor': 'middle', 'font-size': 12.5, fill: K.text });
    const bits = 'S1010000R A00011010A P'.split('');
    T(g, 500, 580, 'Rule of thumb: if it\'s slow, 2–4 wires and inside the box, it\'s management, not data.', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12.5 });
    return {
      hot: [{ x: 56, y: 66, w: 228, h: 98, target: 'nw-cmis', label: 'CMIS optics management', below: true }],
      update(t) {
        ds.forEach(b2 => run(b2.d, b2.pts, t, 0.2));
        const n = Math.floor(t * 4) % (bits.length + 4);
        let ds1 = '', ds2 = '', x = 340;
        for (let i = 0; i < Math.min(n, bits.length); i++) {
          const b3 = bits[i], hi = b3 === '1' || b3 === 'R' || b3 === 'P' || b3 === ' ';
          ds1 += (i ? 'L' : 'M') + x + ' 415 L' + (x + 7) + ' 415 L' + (x + 7) + ' 400 L' + (x + 14) + ' 400 L' + (x + 14) + ' 415';
          ds2 += (i ? 'L' : 'M') + x + ' ' + (hi ? 445 : 465) + ' L' + (x + 16) + ' ' + (hi ? 445 : 465);
          x += 16;
        }
        scl.setAttribute('d', ds1); sda.setAttribute('d', ds2);
        lab.textContent = 'START · address 0x50 · read · ACK · data byte 0x1A · ACK · STOP';
      }
    };
  }

  function sCmis(g) {
    cap(g, 20, 34, 'CMIS: HOW SOFTWARE READS AND CONTROLS OPTICS', K.text);
    R(g, 40, 80, 220, 120, { fill: '#160f24', stroke: K.ctrl, 'stroke-width': 2, rx: 10 }); T(g, 150, 125, 'Network OS', { 'text-anchor': 'middle', 'font-weight': 700 }); T(g, 150, 147, '(on the host CPU)', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 12 }); T(g, 150, 172, '"show interface transceiver"', { 'text-anchor': 'middle', fill: K.acc, 'font-size': 11.5 });
    R(g, 740, 60, 240, 500, { fill: '#1d0e08', stroke: K.optic, 'stroke-width': 2, rx: 10 }); T(g, 860, 84, 'optical module / engine', { 'text-anchor': 'middle', 'font-size': 13 }); T(g, 860, 102, 'register "memory map"', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 11.5 });
    const pages = [['Lower page 00h', 'identity, status, interrupt flags'], ['Page 00h', 'vendor, part number, serial'], ['Page 01h', 'what it supports (capabilities)'], ['Page 02h', 'alarm / warning thresholds'], ['Page 10h', 'per-lane controls (enable, squelch)'], ['Page 11h', 'per-lane live monitors']];
    const pr = pages.map(([a, b2], i) => { const r = R(g, 756, 116 + i * 70, 208, 60, { fill: K.panel, stroke: K.line, rx: 6 }); T(g, 768, 140 + i * 70, a, { 'font-size': 13, 'font-weight': 700 }); T(g, 768, 160 + i * 70, b2, { 'font-size': 11.5, fill: K.muted }); return r; });
    L(g, 260, 140, 740, 140, { stroke: K.ctrl, 'stroke-width': 2.5 }); T(g, 500, 130, 'I2C / I3C reads and writes (via the BMC or CPLD)', { 'text-anchor': 'middle', fill: K.ctrl, 'font-size': 12.5 });
    const rq = dots(g, 2, K.ctrl, 5);
    R(g, 40, 240, 640, 320, { fill: '#05080b', stroke: K.line, rx: 10 }); cap(g, 60, 266, 'LIVE MONITORS (DOM) THE OS POLLS EVERY FEW SECONDS', K.muted);
    const rows = [['Module temperature', '°C'], ['Supply voltage', 'V'], ['Laser bias current, lane 1', 'mA'], ['Tx optical power, lane 1', 'dBm'], ['Rx optical power, lane 1', 'dBm'], ['Pre-FEC BER (VDM), lane 1', '']];
    const vals = rows.map(([n], i) => { T(g, 60, 302 + i * 40, n, { 'font-size': 14 }); return T(g, 640, 302 + i * 40, '', { 'text-anchor': 'end', 'font-family': 'ui-monospace,monospace', 'font-size': 15, fill: K.acc }); });
    return {
      hot: [{ x: 36, y: 76, w: 228, h: 128, target: 'nw-oob', label: 'Out-of-band management', below: true }],
      update(t) {
        run(rq, [[260, 140], [740, 140]], t, 0.5);
        const k = Math.floor(t * 1.2) % pages.length; pr.forEach((r, i) => r.setAttribute('stroke', i === k || i === 5 ? K.acc : K.line));
        const n = Math.sin(t * 0.7);
        const v = [(48 + 1.2 * n).toFixed(1) + ' °C', (3.30 + 0.01 * n).toFixed(2) + ' V', (62 + 0.8 * n).toFixed(1) + ' mA', (1.8 + 0.05 * n).toFixed(2) + ' dBm', (-3.4 + 0.08 * n).toFixed(2) + ' dBm', (2.1 + 0.4 * n).toFixed(1) + 'e-7'];
        vals.forEach((e, i) => { e.textContent = v[i]; });
      }
    };
  }

  function sOob(g) {
    cap(g, 20, 34, 'OUT-OF-BAND: A SEPARATE NETWORK JUST FOR MANAGING THE FABRIC', K.text);
    const sw = [];
    for (let i = 0; i < 6; i++) { const x = 70 + i * 150; sw.push([x + 50, 120]); R(g, x, 90, 100, 60, { fill: '#1d0e08', stroke: K.optic, rx: 6 }); T(g, x + 50, 118, 'CPO switch', { 'text-anchor': 'middle', 'font-size': 12 }); T(g, x + 50, 136, 'BMC + host', { 'text-anchor': 'middle', 'font-size': 10.5, fill: K.muted }); }
    R(g, 380, 250, 240, 60, { fill: '#160f24', stroke: K.ctrl, 'stroke-width': 2, rx: 8 }); T(g, 500, 285, 'management switch (1–10G)', { 'text-anchor': 'middle', 'font-size': 13 });
    const ds = sw.map(([x]) => { L(g, x, 150, 500, 250, { stroke: K.ctrl, 'stroke-opacity': .4, 'stroke-width': 1.5 }); return dots(g, 1, K.ctrl, 4); });
    const svc = [['Fabric manager', 'UFM (InfiniBand) / NetQ-style tools', 80], ['Telemetry collector', 'streaming counters (gNMI)', 320], ['Time server', 'PTP / NTP clock sync', 560], ['Provisioning', 'ONIE install, firmware, Redfish', 800]];
    svc.forEach(([n, d, x]) => { R(g, x - 70, 380, 200, 70, { fill: K.panel, stroke: K.line, rx: 8 }); T(g, x + 30, 410, n, { 'text-anchor': 'middle', 'font-size': 13.5, 'font-weight': 700 }); T(g, x + 30, 430, d, { 'text-anchor': 'middle', 'font-size': 11, fill: K.muted }); L(g, 500, 310, x + 30, 380, { stroke: K.ctrl, 'stroke-opacity': .4, 'stroke-width': 1.5 }); });
    const sd = svc.map(() => dots(g, 1, K.acc, 4));
    R(g, 20, 480, 960, 100, { fill: K.panel, stroke: K.line, rx: 10 });
    T(g, 40, 508, 'Why separate? If the data fabric breaks, you can still reach every box to diagnose and fix it.', { 'font-size': 13.5 });
    T(g, 40, 532, 'Redfish (REST/JSON from the BMC): power, temperatures, inventory, logs, firmware updates. IPMI is its older ancestor.', { 'font-size': 13.5 });
    T(g, 40, 556, 'Inside the switch, the network OS (e.g. SONiC-class) talks to the ASIC over PCIe and to the optics over I2C/CMIS.', { 'font-size': 13.5, fill: K.muted });
    return {
      hot: [],
      update(t) { ds.forEach((d, i) => run(d, [sw[i], [500, 250]], t, 0.3, i * 0.15)); sd.forEach((d, i) => run(d, [[500, 310], [svc[i][2] + 30, 380]], t, 0.3, i * 0.2)); }
    };
  }

  // ================================================================ levels
  const LV = [
    { id: 'nw-map', name: 'The map', size: '', scene: sMap,
      title: 'Every conversation in a CPO switch', sub: 'Data plane, host bus, management buses, management network',
      plain: 'A switch is full of conversations at very different speeds. The <b>data plane</b> moves customer traffic at up to 800 Gb/s per port. The <b>host bus</b> (PCIe) lets the switch\'s own CPU control the switch chip. Slow <b>management buses</b> (I2C, SPI, PMBus…) read sensors and set up chips. A <b>management network</b> lets you reach the box from outside.',
      body: '<p>This course goes through them roughly in order of importance for an AI fabric. First the <b>data networks</b>: the layer model, the physical layer, cables, Ethernet, IP, TCP/UDP, RDMA, InfiniBand, lossless Ethernet and NVLink. Then the <b>inside-the-box</b> buses: PCIe, I2C/SPI/UART/JTAG/MDIO/PMBus, CMIS, and out-of-band management.</p>',
      facts: [['115 Tb/s', 'data plane (Quantum-X Photonics)', 'nv'], ['~64–128 GB/s', 'PCIe Gen5/6 x16 host bus', 'typ'], ['0.1–1 MHz', 'I2C management bus', 'typ'], ['1 Gb/s', 'management Ethernet port', 'typ']],
      cpoTxt: 'As system engineer you own the <b>interfaces</b> between all of these: which bus reaches which device, at what speed, with what timeouts, and what happens when one of them hangs. Many field bugs live in the slow buses, not the fast ones: a stuck I2C bus can make the OS think an optical engine is missing.',
      more: 'Keep two mental groups: the <b>data path</b> (must be fast, lossless and error-free) and the <b>control path</b> (must be reliable and always reachable, even when the data path is broken).',
      links: [] },
    { id: 'nw-layers', name: 'Layers', size: '', scene: sLayers,
      title: 'The layer model: envelopes inside envelopes', sub: 'OSI / TCP-IP layers and encapsulation',
      plain: 'Networking is split into <b>layers</b>, each solving one problem. On the way out, every layer puts the data into its own <b>envelope</b> (a header): transport, then network (IP), then link (Ethernet). The physical layer turns the result into bits and then light. The receiver opens the envelopes in reverse order.',
      body: '<p>Layer <b>1 Physical</b>: bits on a wire or fiber (lanes, FEC, PAM4). Layer <b>2 Link</b>: frames between neighbours (Ethernet or InfiniBand, MAC addresses). Layer <b>3 Network</b>: packets across the whole network (IP addresses, routing). Layer <b>4 Transport</b>: end-to-end delivery (TCP, UDP, InfiniBand transport). Layers 5–7 are the application (e.g. NCCL doing an all-reduce).</p><p>A switch mostly works at layers 1–3. A NIC also does layer 4 in hardware for RDMA.</p>',
      facts: [['7', 'OSI layers (TCP/IP uses ~4)', 'typ'], ['L1–L3', 'what a switch handles', 'typ'], ['~50–100 B', 'headers per packet', 'typ'], ['L4 in HW', 'RDMA NICs', 'typ']],
      cpoTxt: 'When something breaks, the first question is <b>which layer?</b> BER and FEC errors are layer 1. CRC/FCS errors are layer 2. Routing problems are layer 3. Retransmits and timeouts are layer 4. CPO changes only layer 1, so proving whether a problem is <i>below</i> or <i>above</i> layer 1 is a key skill.',
      more: 'Encapsulation also explains "overhead": a small payload carries the same headers as a big one, which is why AI traffic uses large messages (see the efficiency calculator later in this course).',
      links: [] },
    { id: 'nw-phy', name: 'Physical layer', size: '', scene: sPhy,
      title: 'The physical layer: lanes, FEC and PAM4', sub: 'How an 800G port actually sends bits',
      plain: 'An <b>800G port</b> is really several <b>lanes</b> side by side, e.g. <b>4 × 200 Gb/s</b>. The bits are first protected with <b>FEC</b> (extra check symbols that let the receiver fix errors), then packed <b>2 bits per symbol</b> (PAM4) and sent as light or electricity.',
      body: '<p>The physical layer has three sub-layers. <b>PCS</b> encodes the data and adds FEC. <b>PMA</b> serializes, turning parallel bits into one fast stream per lane. <b>PMD</b> drives the medium (the laser and fiber, or copper). Standard names tell you the medium and reach: e.g. <b>800GBASE-DR4</b> = 800 Gb/s over 4 lanes of single-mode fiber up to 500 m.</p>',
      facts: [['4 × 200G', '= one 800G port', 'typ'], ['RS(544,514)', 'KP4 FEC, ~6 % overhead', 'typ'], ['~2.4e-4', 'pre-FEC BER the FEC can fix', 'typ'], ['IEEE 802.3', 'Ethernet physical-layer standards', 'typ']],
      cpoTxt: 'This is exactly where CPO sits. Everything above the PMD stays standard, so a CPO switch must still interoperate with a NIC\'s pluggable optic at the other end of the fiber. <b>Interoperability testing</b> against standard optics is part of your validation plan.',
      more: 'The CPO Switch Course and the Noise Lab cover the physics of this layer in depth (PAM4 eyes, SNR, BER).',
      links: [['cpo-course/cs-serdes', 'CPO course: SerDes & PAM4'], ['noise', 'Noise Lab']] },
    { id: 'nw-cabling', name: 'Cables & fiber', size: '', scene: sCabling,
      title: 'Cables, fibers and connectors', sub: 'Copper or fiber, which fiber, which connector, how far',
      plain: 'Short links inside a rack use <b>copper</b> cables (cheap, no lasers). Longer links use <b>fiber</b>. <b>Multimode</b> fiber is for short distances with cheap lasers. <b>Single-mode</b> fiber (what CPO uses) goes hundreds of metres to kilometres.',
      body: '<p>At 200 Gb/s per lane, passive copper (<b>DAC</b>) reaches only about a metre or two. Active copper cables (<b>AEC</b>), with a retimer chip, reach a few metres. Beyond that it\'s optics: <b>SR</b> on multimode fiber, and <b>DR/FR/LR</b> on single-mode fiber.</p><p><b>Connectors:</b> LC for one fiber pair, MPO/MTP for many fibers in one plug. On a CPO switch the front panel has detachable multi-fiber connectors instead of module cages.</p>',
      facts: [['~1–2 m', 'passive copper at 200G/lane', 'typ'], ['500 m / 2 km', 'DR / FR single-mode reach', 'typ'], ['9 µm', 'single-mode fiber core', 'typ'], ['MPO', 'multi-fiber connector', 'typ']],
      cpoTxt: 'You will help write the <b>cabling plan</b>: which reach class each link needs, how many fibers per port, connector types and polarity (which fiber is transmit and which is receive), and the allowed loss per patch point. That allowed loss feeds straight into your link budget.',
      more: 'The two most common cabling mistakes in the field: wrong <b>polarity</b> (Tx connected to Tx), and dirty or damaged <b>connectors</b> (see Case Study 3).',
      links: [['cases/case-connector', 'Case study: dirty connector']] },
    { id: 'nw-ethernet', name: 'Ethernet', size: '', scene: sEthernet,
      title: 'Ethernet: frames and MAC addresses', sub: 'Layer 2: talking to your neighbours',
      plain: 'Ethernet sends data in <b>frames</b>. Each frame has a <b>destination</b> and <b>source MAC address</b> (a hardware address burned into each port), the payload, and a <b>checksum (FCS)</b> to detect corruption. A switch <b>learns</b> which port each MAC address lives on and forwards frames only where they need to go.',
      body: '<p><b>VLAN tags</b> (802.1Q) split one physical network into separate logical ones and carry a <b>priority</b>, which lossless Ethernet uses. The normal maximum payload is 1500 bytes; AI and storage networks usually enable <b>jumbo frames</b> (~9000 bytes) to cut overhead.</p><p>In large fabrics, layer-2 flooding doesn\'t scale, so switches <b>route at layer 3</b> (IP) between each other.</p>',
      facts: [['6 bytes', 'MAC address', 'typ'], ['1500 / 9000 B', 'standard / jumbo payload', 'typ'], ['4 bytes', 'FCS (CRC-32)', 'typ'], ['802.1Q', 'VLAN + priority tag', 'typ']],
      cpoTxt: 'FCS (CRC) errors are the first layer-2 sign that the physical layer let errors through, i.e. FEC failed. On a healthy CPO link they should be essentially zero. Rising CRC counters mean "go back to layer 1": BER, FEC histograms, optical power.',
      more: 'Spectrum-X Photonics is an Ethernet switch, so everything here applies directly. Quantum-X Photonics speaks InfiniBand, which has its own link layer (see the InfiniBand step).',
      links: [] },
    { id: 'nw-ip', name: 'IP & routing', size: '', scene: sIp,
      title: 'IP addresses, routing and ECMP', sub: 'Layer 3: getting across the whole fabric',
      plain: 'Every NIC has an <b>IP address</b> (e.g. 10.0.4.7). Addresses are grouped into <b>subnets</b> (e.g. 10.0.4.0/24 = everything starting with 10.0.4). Each switch has a <b>routing table</b> that says which way to send each subnet. When several equally good paths exist, <b>ECMP</b> spreads the flows over all of them.',
      body: '<p>In AI data centers, switches typically learn routes with <b>BGP</b> (the same protocol the internet uses), and every leaf has many equal-cost paths through the spines.</p><p>ECMP picks a path by <b>hashing</b> header fields, so one flow always takes the same path and its packets arrive in order. With few, huge AI flows, hashing can be unlucky and pile two big flows onto one spine. Hence adaptive routing.</p>',
      facts: [['32 bits', 'IPv4 address (IPv6: 128)', 'typ'], ['/24', '= 256 addresses', 'typ'], ['BGP', 'routing protocol in DC fabrics', 'typ'], ['ECMP', 'hash flows over equal paths', 'typ']],
      cpoTxt: 'Routing is mostly owned by the network software team, but it explains a symptom you will see: <b>one link congested while its neighbours are idle</b>. That is hash collision, not an optics problem (see Case Study 5).',
      more: 'Longest-prefix match: if a packet matches both 10.0.0.0/8 and 10.0.4.0/24, the more specific /24 route wins.',
      links: [['cases/case-incast', 'Case study: congestion vs optics']] },
    { id: 'nw-tcp', name: 'TCP & UDP', size: '', scene: sTcp,
      title: 'TCP and UDP: the transport layer', sub: 'Reliable streams vs simple datagrams',
      plain: '<b>TCP</b> gives applications a reliable, ordered stream. It sets up a connection (handshake), numbers every byte, waits for acknowledgements, resends what is lost, and slows down when the network is congested. <b>UDP</b> just sends packets: no guarantees, very little overhead.',
      body: '<p>TCP is perfect for the internet, management and storage, but it is normally run by the <b>CPU and the OS kernel</b>: data is copied several times, and every packet costs CPU time. At 800 Gb/s per GPU that would swamp the CPU and add tens of microseconds of latency.</p><p>So GPU-to-GPU traffic uses <b>RDMA</b> instead. Its reliability is built into the NIC hardware. RoCE rides on UDP.</p>',
      facts: [['3-way', 'handshake (SYN, SYN-ACK, ACK)', 'typ'], ['20–60 B', 'TCP header', 'typ'], ['8 B', 'UDP header', 'typ'], ['10s of µs', 'kernel TCP latency', 'typ']],
      cpoTxt: 'Your switch\'s own management (SSH, telemetry, Redfish, firmware updates) runs over TCP/IP on the management network. Customer GPU traffic through the data ports is mostly RDMA. Know which is which when you read logs and counters.',
      more: 'TCP congestion control (the sawtooth) reacts to <b>packet loss</b>. RDMA fabrics try never to lose packets and react to <b>ECN marks</b> or credits instead, which is faster and gentler.',
      links: [] },
    { id: 'nw-rdma', name: 'RDMA & RoCE', size: '', scene: sRdma,
      title: 'RDMA, RoCE and GPUDirect', sub: 'Memory-to-memory transfers handled by the NIC',
      plain: '<b>RDMA</b> (Remote Direct Memory Access) lets one machine write straight into another machine\'s memory. The <b>NIC</b> does all the work in hardware, and the CPUs aren\'t involved. With <b>GPUDirect</b>, the NIC reads and writes <b>GPU memory</b> directly. It runs natively on InfiniBand, or on Ethernet as <b>RoCE</b>.',
      body: '<p>Applications use RDMA through <b>queue pairs</b>: they post "send this buffer" or "write into that remote address" requests, and the NIC handles packetizing, reliability and ordering. <b>RoCEv2</b> wraps the InfiniBand transport header inside UDP/IP/Ethernet, so it can be routed across a normal IP fabric. That fabric must avoid drops, though.</p><p>NCCL, NVIDIA\'s collective library, uses RDMA over the network and NVLink inside the rack.</p>',
      facts: [['~µs', 'RDMA latency', 'typ'], ['zero-copy', 'no CPU data copies', 'typ'], ['RoCEv2', 'RDMA over UDP/IP/Ethernet', 'typ'], ['ConnectX', 'NVIDIA SuperNICs', 'nv']],
      cpoTxt: 'RDMA performance collapses if packets are dropped: the NIC has to go back and resend. That is why AI fabrics are built to be <b>lossless</b>, and why physical-layer errors that slip past FEC are so costly. One uncorrectable codeword can cost far more than one packet\'s worth of time.',
      more: 'RDMA transport types: <b>RC</b> (reliable connected, most common), <b>UD</b> (unreliable datagram), and newer designs that scale to many peers. The Ultra Ethernet Consortium is defining a new Ethernet transport for AI and HPC.',
      links: [] },
    { id: 'nw-ib', name: 'InfiniBand', size: '', scene: sIb,
      title: 'InfiniBand', sub: 'A network designed for HPC and AI from the start',
      plain: '<b>InfiniBand</b> is a complete network stack built for supercomputers and AI. A central <b>Subnet Manager</b> discovers every switch and NIC, gives each port an address (<b>LID</b>) and computes the routes. <b>Credit-based flow control</b> means a port only sends when the next one has room, so packets are <b>never dropped</b> for lack of buffer.',
      body: '<p>Other key features: <b>adaptive routing</b> (packets take the least-busy path), <b>SHARP</b> (switches perform the all-reduce additions themselves), very low latency, and RDMA as the native transport.</p><p>Speeds per 4-lane port: HDR 200G, NDR 400G, XDR 800G. NVIDIA\'s Quantum-X800 and <b>Quantum-X Photonics</b> are XDR-class switches.</p>',
      facts: [['144 × 800G', 'Quantum-X Photonics', 'nv'], ['Lossless', 'credit-based flow control', 'typ'], ['SHARP', 'in-network reduction', 'nv'], ['IBTA', 'standards body', 'typ']],
      cpoTxt: 'For Quantum-X Photonics you\'ll work with InfiniBand-specific counters: symbol errors, link-error recovery, port-receive errors, and the Subnet Manager\'s view of the fabric (e.g. through UFM). Link flaps are visible to the SM, so physical-layer health becomes fabric-wide events.',
      more: 'InfiniBand and Ethernet both run over the same CPO physics. The optics don\'t care which link layer sits on top, but the protocol\'s error handling and counters differ.',
      links: [] },
    { id: 'nw-lossless', name: 'Lossless Ethernet', size: '', scene: sLossless,
      title: 'Lossless Ethernet for AI', sub: 'ECN, PFC, congestion control and adaptive routing',
      plain: 'Classic Ethernet drops packets when a queue overflows, and RDMA hates drops. AI Ethernet adds three tools. <b>ECN</b> marks packets early so senders slow down. <b>PFC</b> sends a "pause" to the upstream port as a last resort. <b>Adaptive routing</b> spreads traffic so queues don\'t build up in the first place.',
      body: '<p><b>Incast</b> (many senders, one receiver) is the classic trigger. The common RoCE congestion-control scheme is <b>DCQCN</b>: the switch marks, the receiver notifies, the sender reduces its rate. PFC is powerful but risky: pauses can spread upstream and stall unrelated traffic ("head-of-line blocking"), so it is tuned carefully.</p><p><b>Spectrum-X</b> combines switch adaptive routing with SuperNICs that reorder packets, for high utilization on Ethernet.</p>',
      facts: [['802.1Qbb', 'PFC standard', 'typ'], ['RFC 3168', 'ECN standard', 'typ'], ['DCQCN', 'RoCE congestion control', 'typ'], ['Spectrum-X', 'AI Ethernet platform', 'nv']],
      cpoTxt: 'You\'ll see PFC pause counters and ECN marks in switch telemetry. High values point to <b>congestion</b> (network layer), not optics. Pairing them with clean BER/FEC counters is how you prove an issue is not in your CPO physical layer.',
      more: 'Data-Flow Simulator: try "Incast 140 %" with flow control set to PFC, IB credit, or none (lossy), and watch drops vs pauses.',
      links: [['dataflow', 'Data-Flow Simulator']] },
    { id: 'nw-nvlink', name: 'NVLink', size: '', scene: sNvlink,
      title: 'NVLink and NVSwitch: the scale-up network', sub: 'GPUs sharing memory across the rack',
      plain: '<b>NVLink</b> is NVIDIA\'s GPU-to-GPU interconnect. It is much faster than the network, and it lets a GPU <b>directly read and write another GPU\'s memory</b>. <b>NVLink Switch</b> chips connect all 72 GPUs of an NVL72 rack so each one reaches every other in one hop. Software can treat the rack as one giant GPU.',
      body: '<p><b>Generations:</b> NVLink 4 (Hopper) gives 900 GB/s per GPU; NVLink 5 (Blackwell) gives <b>1.8 TB/s per GPU</b>, and an NVL72 rack totals 130 TB/s.</p><p><b>Memory semantics vs message passing:</b> over NVLink a GPU does loads and stores to remote memory. Over the scale-out network, the NIC sends RDMA messages. NVLink is for the chattiest traffic (tensor-parallel and expert-parallel). Scale-out joins many NVLink domains together.</p><p><b>NVLink-C2C</b> links a Grace CPU to a Blackwell GPU at 900 GB/s. NVIDIA has also announced <b>NVLink Fusion</b>, which opens NVLink to partner CPUs and accelerators. The industry consortium <b>UALink</b> is a separate standard for scale-up.</p>',
      facts: [['1.8 TB/s', 'per GPU (NVLink 5)', 'nv'], ['72 GPUs', 'one NVLink domain (NVL72)', 'nv'], ['130 TB/s', 'NVL72 total NVLink bandwidth', 'nv'], ['900 GB/s', 'NVLink-C2C CPU↔GPU', 'nv']],
      cpoTxt: 'Today NVLink in the rack runs on copper, because the distances are short. As NVLink domains grow beyond one rack, the same reach problem that drove CPO for scale-out appears, and <b>optics for scale-up</b> is a widely discussed industry direction. Knowing both worlds puts you in a good spot.',
      more: 'NVSwitch also supports SHARP-style in-network reductions for NVLink traffic, so collectives inside the rack are accelerated by the switch chips as well.',
      links: [['factory/rack', 'AI Factory course: the NVL72 rack']] },
    { id: 'nw-pcie', name: 'PCIe', size: '', scene: sPcie,
      title: 'PCIe: the host bus', sub: 'How CPUs, GPUs, NICs and SSDs connect inside a server or switch',
      plain: '<b>PCI Express</b> is the standard internal bus of servers. It\'s a tree: the CPU at the root, <b>PCIe switches</b> in the middle, and devices (GPUs, NICs, SSDs) at the leaves. Links are made of <b>lanes</b> (x1, x4, x16), and each generation doubles the speed per lane.',
      body: '<p>In a GPU server the NIC usually connects to the GPU through a PCIe switch, so GPUDirect RDMA traffic doesn\'t have to go through the CPU. In a switch, the host CPU reaches the switch ASIC over PCIe to program its tables and read its counters.</p><p><b>CXL</b> reuses PCIe\'s physical wiring for cache-coherent memory and accelerators.</p>',
      facts: [['~64 GB/s', 'Gen5 x16, per direction', 'typ'], ['~128 GB/s', 'Gen6 x16 (PAM4)', 'typ'], ['PCI-SIG', 'standards body', 'typ'], ['tree', 'root → switches → devices', 'typ']],
      cpoTxt: 'A quick sanity check you should always do: <b>can the host bus feed the network port?</b> An 800 Gb/s NIC needs ~100 GB/s, more than Gen5 x16 provides, so 800G NICs use Gen6 or multiple links. Similar "pipe-size" checks apply everywhere in the system.',
      more: 'PCIe has its own error counters (correctable and uncorrectable) and link-training states, much like a network link. A degraded PCIe link (fewer lanes or a lower generation) is a classic hidden bottleneck.',
      links: [] },
    { id: 'nw-mgmt', name: 'Management buses', size: '', scene: sMgmt,
      title: 'Management buses: I2C, SMBus, I3C, SPI, UART, JTAG, MDIO, PMBus', sub: 'The slow wires that keep the box alive',
      plain: 'Inside the box, a <b>BMC</b> and <b>CPLDs</b> talk to hundreds of small devices over simple, slow buses. <b>I2C</b> uses 2 wires and addresses, for sensors, EEPROMs and optics. <b>SPI</b> is faster, for flash memory. <b>UART</b> is a serial console. <b>JTAG</b> debugs chips. <b>MDIO</b> configures PHYs. <b>PMBus</b> controls power regulators.',
      body: '<p><b>I2C</b>: one clock wire (SCL) and one data wire (SDA). Every device has a 7-bit address, and the controller starts a transaction, sends the address, the device acknowledges, then data flows. It is simple but fragile: one misbehaving device can hold the bus and block everyone. <b>SMBus</b> and <b>PMBus</b> are stricter variants (timeouts, standard commands), and <b>I3C</b> is a faster successor.</p><p><b>SPI</b>: separate clock, data-in, data-out and chip-select wires, used for boot flash. <b>UART</b>: the classic serial console for low-level debugging. <b>JTAG</b>: chip test and programming.</p>',
      facts: [['2 wires', 'I2C (SCL + SDA)', 'typ'], ['100 kHz – 1 MHz', 'I2C speeds', 'typ'], ['10s of MHz', 'SPI', 'typ'], ['115.2 kb/s', 'typical UART console', 'typ']],
      cpoTxt: 'In a CPO switch, optical engines and laser sources are monitored and controlled over these buses, often hundreds of devices. <b>Bus topology</b> (muxes, segments, addresses), <b>polling load</b> and <b>error recovery</b> (what happens when a device hangs the bus) are system-level design decisions you\'ll review.',
      more: 'Classic field bug: an I2C device holds SDA low after a glitch, the whole segment hangs, and the OS reports "optics not present". Good designs use bus muxes, timeouts and reset lines to recover automatically.',
      links: [['architecture/mgmt-buses', 'Management buses in the explorer']] },
    { id: 'nw-cmis', name: 'CMIS', size: '', scene: sCmis,
      title: 'CMIS: managing optics', sub: 'The standard register map for optical modules and engines',
      plain: '<b>CMIS</b> (Common Management Interface Specification) is a standard "memory map" inside optical modules. Software reads and writes it over I2C. Some pages identify the module (vendor, part, serial number). Others report <b>live monitors</b> (temperature, voltage, laser current, Tx/Rx power, BER), hold <b>alarm thresholds</b>, or provide <b>controls</b> (turn lanes on/off).',
      body: '<p>The network OS polls these registers every few seconds, and that is how <code>show interface transceiver</code> works. CMIS also defines a <b>state machine</b> for bringing a module up (low power → initialized → ready) and versatile diagnostic monitors such as pre-FEC BER per lane.</p><p>For CPO, the optical engines and external laser sources need the same kind of management, so CMIS-style register maps and state machines carry over.</p>',
      facts: [['OIF', 'maintains CMIS', 'typ'], ['pages', '128-byte register pages', 'typ'], ['DOM', 'live monitors', 'typ'], ['I2C / I3C', 'transport', 'typ']],
      cpoTxt: 'CMIS registers are where your <b>telemetry</b> comes from: the laser bias trend, Rx power baseline and per-lane BER in the case studies are all read this way. You\'ll define which values are exposed, their alarm thresholds and how often they\'re polled.',
      more: 'Polling budget: 144 ports × many registers × every few seconds over a ~1 MHz bus adds up. Prioritize what is read fast (alarms) vs slow (inventory).',
      links: [['architecture/cmis', 'CMIS in the explorer'], ['cases/case-laser', 'Case study: laser trend']] },
    { id: 'nw-oob', name: 'Out-of-band', size: '', scene: sOob,
      title: 'Out-of-band management and the network OS', sub: 'Managing thousands of switches safely',
      plain: 'Every switch has a separate <b>management Ethernet port</b> on its own small network, the <b>out-of-band (OOB)</b> network. Through it, operators and tools install software, read telemetry, sync clocks and fix problems, <b>even when the main fabric is down</b>.',
      body: '<p><b>BMC + Redfish</b>: a REST/JSON API for power, temperatures, inventory, logs and firmware (IPMI is the older protocol). <b>Network OS</b>: runs on the switch\'s host CPU and programs the ASIC. <b>Fabric manager</b>: UFM for InfiniBand, or management tools for Ethernet. <b>Streaming telemetry</b>: counters pushed continuously (e.g. gNMI). <b>PTP/NTP</b>: synchronized clocks, so events from many switches can be lined up in time.</p>',
      facts: [['Redfish', 'DMTF REST API for BMCs', 'typ'], ['gNMI', 'streaming telemetry', 'typ'], ['PTP', 'IEEE 1588 time sync', 'typ'], ['ONIE', 'network OS installer', 'typ']],
      cpoTxt: 'Synchronized time and streaming telemetry are what make <b>fleet-level debugging</b> possible: "every link on laser #3 degraded together" or "errors line up with job start" are only visible if timestamps agree and counters are collected continuously.',
      more: 'You have now seen every communication path in the system. Next, put it together: follow one AI message through every layer, decode port names, calculate protocol efficiency, map the standards, and build a debugging checklist.',
      links: [] }
  ];

  // ================================================================ journey through all layers
  const JP = [
    [60, 280, 'GPU memory', 'e', 'down'], [150, 280, 'NCCL / verbs', 'e', 'up'], [240, 280, 'NIC: RoCE / IB headers', 'e', 'down'],
    [330, 280, 'PCS + FEC', 'e', 'up'], [410, 280, 'optics → light', 'o', 'down'], [500, 200, 'leaf: PHY + FEC check', 'o', 'up'],
    [580, 140, 'leaf: lookup + queue', 'e', 'up'], [660, 200, 'spine', 'o', 'up'], [740, 280, 'leaf → optics', 'o', 'down'],
    [820, 280, 'NIC: check + ACK', 'e', 'up'], [900, 280, 'GPUDirect write', 'e', 'down'], [960, 200, 'GPU memory', 'e', 'up']
  ];
  const JS = [
    { r: [0, 1], t: 'Application (L7)', d: 'NCCL decides this GPU must send a chunk of gradients to a GPU in another rack, and posts an RDMA write through a <b>queue pair</b>.' },
    { r: [1, 2], t: 'Transport (L4) in the NIC', d: 'The ConnectX NIC reads the data straight from GPU memory (<b>GPUDirect</b>) and adds transport headers: an InfiniBand BTH, or for RoCEv2 also UDP + IP + Ethernet.' },
    { r: [2, 4], t: 'Physical (L1)', d: 'The PCS adds <b>FEC</b>, the PMA packs bits into <b>PAM4</b> on 4 × 200G lanes, and the optics turn them into light.' },
    { r: [4, 5], t: 'Into the leaf CPO switch', d: 'The optical engine turns the light back into bits; the switch\'s PHY decodes and <b>FEC-corrects</b> them, then checks the frame CRC.' },
    { r: [5, 6], t: 'Link + network (L2/L3)', d: 'The pipeline reads the destination (IP address or LID), looks up the route, picks a spine (ECMP / adaptive routing) and queues the packet, marking ECN if the queue grows.' },
    { r: [6, 8], t: 'Spine and down', d: 'The same happens in the spine switch and the destination leaf: optics, FEC, lookup, queue, optics.' },
    { r: [8, 9], t: 'Destination NIC', d: 'The NIC checks the transport sequence and CRC and sends an <b>ACK</b> back. A lost or corrupted packet would be resent from here.' },
    { r: [9, 11], t: 'Into GPU memory', d: 'The NIC writes the data directly into the destination GPU\'s memory, and NCCL adds it to the local gradients. A few microseconds end to end.' }
  ];

  // ================================================================ interactive: port names & efficiency
  function decoder(p) {
    const rate = h('select', null, ['100', '200', '400', '800', '1.6T'].map(v => h('option', { value: v, selected: v === '800' }, v === '1.6T' ? '1.6 Tb/s' : v + ' Gb/s')));
    const reach = h('select', null, [['CR', 'copper cable (CR)'], ['SR', 'multimode fiber, short (SR)'], ['DR', 'single-mode, 500 m (DR)'], ['FR', 'single-mode, 2 km (FR)'], ['LR', 'single-mode, 10 km (LR)']].map(([v, l]) => h('option', { value: v, selected: v === 'DR' }, l)));
    const lpl = h('select', null, [[100, '100 Gb/s per lane'], [200, '200 Gb/s per lane']].map(([v, l]) => h('option', { value: v, selected: v === 200 }, l)));
    const out = h('div', { class: 'callout' });
    p.appendChild(h('div', { class: 'grid2' },
      h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, 'Ethernet port-name decoder'),
        h('div', { class: 'slider-row' }, h('label', null, 'Port speed'), rate, h('span')),
        h('div', { class: 'slider-row' }, h('label', null, 'Medium / reach'), reach, h('span')),
        h('div', { class: 'slider-row' }, h('label', null, 'Lane speed'), lpl, h('span')), out),
      h('div', { class: 'card', html: '<h3 style="margin-top:0">How to read the name</h3><div class="eq">800GBASE-DR4\n│    │    ││ └ number of lanes (fiber pairs or wavelengths)\n│    │    │└── R = uses the 64b/66b-family coding + FEC\n│    │    └─── reach / medium: C copper, S short MMF,\n│    │          D 500 m SMF, F 2 km, L 10 km, E 40 km\n│    └──────── BASE = baseband signalling\n└───────────── MAC data rate</div><p class="muted" style="margin:0;font-size:13px">InfiniBand uses generation names instead: HDR (200G/port), NDR (400G), XDR (800G). Exact names and reaches depend on the standard revision ' + B('typ') + '.</p>' })));
    function upd() {
      const r = rate.value, rv = r === '1.6T' ? 1600 : +r, l = +lpl.value, n = Math.max(1, Math.round(rv / l)), m = reach.value;
      const name = (r === '1.6T' ? '1.6T' : r + 'G') + 'BASE-' + m + n;
      const what = { CR: 'twinax copper cable, ~1–2 m at 200G/lane, inside the rack', SR: 'multimode fiber with VCSEL lasers, tens of metres', DR: 'single-mode fiber, one fiber pair per lane, up to ~500 m (CPO-class links)', FR: 'single-mode, wavelengths combined on fiber, up to ~2 km', LR: 'single-mode, up to ~10 km' }[m];
      out.innerHTML = '<div style="font-family:var(--mono);font-size:22px;color:var(--accent);margin-bottom:4px">' + name + '</div>' + rv + ' Gb/s = <b>' + n + ' × ' + l + ' Gb/s</b> lanes · ' + what + '.' + (m === 'CR' && l === 200 && rv >= 800 ? ' <i>(copper at this speed is very short)</i>' : '');
    }
    [rate, reach, lpl].forEach(e => e.addEventListener('change', upd)); upd();
  }

  function efficiency(p) {
    const proto = h('select', null, [['roce', 'RoCEv2 (RDMA over Ethernet)'], ['ib', 'InfiniBand'], ['tcp', 'TCP/IPv4 over Ethernet']].map(([v, l]) => h('option', { value: v }, l)));
    const pay = h('input', { type: 'range', min: 6, max: 13.14, step: 0.01, value: 12 }), payo = h('output');
    const rate = h('select', null, [[400, '400 Gb/s'], [800, '800 Gb/s'], [1600, '1.6 Tb/s']].map(([v, l]) => h('option', { value: v, selected: v === 800 }, l)));
    const out = h('div', { class: 'af-out' }), bar = h('div', { class: 'af-bars' }), note = h('div', { class: 'callout' });
    p.appendChild(h('div', { class: 'af-calc' },
      h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, 'How much of the line rate is real data?'),
        h('div', { class: 'slider-row' }, h('label', null, 'Protocol'), proto, h('span')),
        h('div', { class: 'slider-row' }, h('label', null, 'Port speed'), rate, h('span')),
        h('div', { class: 'slider-row' }, h('label', null, 'Payload per packet'), pay, payo),
        h('p', { class: 'muted', style: 'font-size:12.5px', html: 'Per-packet overheads ' + B('typ') + ': Ethernet preamble 8 + header 14 + FCS 4 + gap 12 B; RoCEv2 adds IPv4 20 + UDP 8 + BTH 12 + ICRC 4; TCP adds IPv4 20 + TCP 32; InfiniBand LRH 8 + BTH 12 + CRCs 6. Simplified.' })),
      h('div', { class: 'card' }, out, bar, note)));
    function upd() {
      const pr = proto.value, maxP = pr === 'ib' ? 4096 : 9000;
      let P2 = Math.min(maxP, Math.round(Math.pow(2, +pay.value)));
      payo.textContent = P2 + ' B';
      const ov = { roce: 38 + 44, ib: 26, tcp: 38 + 52 }[pr];
      const eff = P2 / (P2 + ov), R2 = +rate.value;
      const fx = (v, l, tag) => '<div class="af-fact"><b>' + v + '</b><span>' + l + ' ' + B(tag || 'est') + '</span></div>';
      out.innerHTML = fx((eff * 100).toFixed(1) + ' %', 'of the line rate is payload') + fx((R2 * eff).toFixed(0) + ' Gb/s', 'goodput') + fx(num(R2 * 1e9 / ((P2 + ov) * 8) / 1e6) + ' M', 'packets per second per port') +
        fx(ov + ' B', 'overhead per packet', 'typ') + fx(maxP + ' B', 'max payload (MTU)', 'typ') + fx(((P2 + ov) * 8 / R2).toFixed(1) + ' ns', 'time to send one packet');
      bar.innerHTML = '<div class="af-hbar"><span>payload</span><div class="tr"><i style="width:' + (eff * 100).toFixed(1) + '%;background:var(--accent)"></i></div><output>' + P2 + ' B</output></div><div class="af-hbar"><span>headers</span><div class="tr"><i style="width:' + ((1 - eff) * 100).toFixed(1) + '%;background:var(--warn)"></i></div><output>' + ov + ' B</output></div>';
      note.innerHTML = P2 < 512 ? 'Small packets waste a big share of the link on headers, and the switch must process <b>' + num(R2 * 1e9 / ((P2 + ov) * 8) / 1e6) + ' million packets per second</b> per port. That is why AI libraries send large messages and use jumbo/large MTUs.' : 'With large packets, headers cost only a few percent. AI collectives are mostly large transfers, so the fabric runs close to line rate when congestion is under control.';
    }
    [proto, rate].forEach(e => e.addEventListener('change', upd)); pay.addEventListener('input', upd); upd();
  }

  // ================================================================ course
  C.course.register({
    id: 'net-course', title: 'Networking & Protocols', icon: '🌐', order: 9.4, storeKey: 'nw-last-step',
    levels: LV, levelCh: 'The stack', levelBoxTitle: '🛠 What this means for you as system engineer',
    levelHint: 'Press <b>Next</b> to move on; the dashed green region shows where the next step zooms in.',
    finish: { go: 'firmware', label: 'Continue: Firmware & Software →' },
    pages: [
      { id: 'start', title: 'Welcome', ch: 'Start', build(p, ctx) {
        p.appendChild(h('div', { class: 'af-hero' },
          h('div', { class: 'af-eyebrow' }, 'Guided course · about 60 minutes'),
          h('h1', { html: '<em>Networking</em> and communication in an AI factory' }),
          h('p', { html: 'Every protocol, cable and bus your CPO switch uses, explained for a system engineer, not a board designer. The <b>data networks</b> come first: layers, physical layer, cables, Ethernet, IP, TCP/UDP, RDMA, InfiniBand, lossless Ethernet, <b>NVLink</b>. Then everything <b>inside the box</b>: PCIe, I2C/SPI/UART/JTAG/MDIO/PMBus, CMIS, and out-of-band management. Just press <b>Next</b>.' }),
          h('div', { class: 'af-analogy', html:
            '<div><span>✉️</span><b>Layers</b>envelopes inside envelopes</div>' +
            '<div><span>🛣️</span><b>Routing</b>road signs at every junction</div>' +
            '<div><span>🚦</span><b>Flow control</b>traffic lights so nobody crashes</div>' +
            '<div><span>🧰</span><b>Management buses</b>the building\'s maintenance intercom</div>' }),
          h('div', { class: 'af-cta' },
            h('button', { class: 'btn primary af-bignext', onclick: () => ctx.next() }, 'Start the course →'),
            ctx.resumeId && ctx.resumeId !== 'start' && ctx.resumeId !== 'done' ? h('button', { class: 'btn', onclick: () => ctx.goId(ctx.resumeId) }, 'Resume where you left off') : null)));
        p.appendChild(h('div', { class: 'card', html: '<h3 style="margin-top:0">The route</h3><ol class="af-route">' +
          '<li><b>The stack, 15 steps:</b> map → layers → physical layer → cables → Ethernet → IP & routing → TCP & UDP → RDMA & RoCE → InfiniBand → lossless Ethernet → NVLink → PCIe → management buses → CMIS → out-of-band.</li>' +
          '<li><b>Put it together, 5 steps:</b> one AI message through every layer, a port-name decoder, a protocol-efficiency calculator, the standards map, and a layer-by-layer debug checklist.</li>' +
          '<li><b>Appendix, 4 chapters:</b> networking numbers, Ethernet & IP details, InfiniBand / RDMA / NVLink details, and a reference table of every bus.</li></ol>' }));
      } },
      '@levels',
      { id: 'nw-trace', title: 'One AI message through every layer', ch: 'Put it together', build(p, ctx) {
        p.appendChild(h('h2', { class: 'af-ph' }, 'Follow one AI message through every layer'));
        p.appendChild(h('p', { class: 'h-sub' }, 'An all-reduce chunk goes from a GPU in one rack to a GPU in another, through two leaf switches and a spine. The animation steps through it; each step names the layer at work.'));
        ctx.onFrame(C.course.journeyBlock(p, {
          pts: JP, steps: JS, optical: i => (i >= 4 && i <= 5) || (i >= 7 && i <= 8), big: l => /leaf|spine/.test(l),
          decorate(g) {
            R(g, 20, 230, 400, 100, { fill: 'rgba(118,185,0,.05)', stroke: '#2f5a12', 'stroke-dasharray': '5 5', rx: 10 });
            T(g, 32, 322, 'SENDING SERVER', { fill: K.acc, 'font-size': 11, 'font-weight': 700, 'letter-spacing': 2 });
            R(g, 450, 100, 260, 130, { fill: 'rgba(255,107,61,.06)', stroke: K.optic, 'stroke-dasharray': '5 5', rx: 10 });
            T(g, 580, 222, 'CPO SWITCH FABRIC', { 'text-anchor': 'middle', fill: K.optic, 'font-size': 11, 'font-weight': 700, 'letter-spacing': 2 });
            R(g, 720, 230, 270, 100, { fill: 'rgba(118,185,0,.05)', stroke: '#2f5a12', 'stroke-dasharray': '5 5', rx: 10 });
            T(g, 732, 322, 'RECEIVING SERVER', { fill: K.acc, 'font-size': 11, 'font-weight': 700, 'letter-spacing': 2 });
          }
        }));
      } },
      { id: 'nw-names', title: 'Port names decoded', ch: 'Put it together', build(p) {
        p.appendChild(h('h2', { class: 'af-ph' }, 'Decode port and cable names'));
        p.appendChild(h('p', { class: 'h-sub' }, 'Names like 800GBASE-DR4 look cryptic, but they follow simple rules. Pick a speed, a reach and a lane speed to see the name and what it means.'));
        decoder(p);
      } },
      { id: 'nw-eff', title: 'Protocol efficiency', ch: 'Put it together', build(p) {
        p.appendChild(h('h2', { class: 'af-ph' }, 'Protocol overhead: how much is real data?'));
        p.appendChild(h('p', { class: 'h-sub' }, 'Every packet carries headers. Move the payload size and compare RoCEv2, InfiniBand and TCP/IP.'));
        efficiency(p);
      } },
      { id: 'nw-standards', title: 'The standards map', ch: 'Put it together', build(p) {
        p.appendChild(h('h2', { class: 'af-ph' }, 'Who defines what: the standards map'));
        p.appendChild(h('p', { class: 'h-sub' }, 'You don\'t need to read these documents cover to cover, but you should know which body owns which part, so you know where to look.'));
        p.appendChild(h('table', { class: 'table', html: '<tr><th>Area</th><th>Body</th><th>Key documents (examples)</th><th>Why you care</th></tr>' +
          '<tr><td><b>Ethernet physical & MAC</b></td><td>IEEE 802.3</td><td>802.3ck (100G/lane), 802.3df (800G), 802.3dj (200G/lane, 1.6T, in progress) ' + B('typ') + '</td><td>port types, FEC, optical specs, compliance</td></tr>' +
          '<tr><td><b>Bridging, VLANs, lossless</b></td><td>IEEE 802.1</td><td>802.1Q (VLAN, priority), 802.1Qbb (PFC), 802.1Qaz (ETS)</td><td>lossless Ethernet behaviour</td></tr>' +
          '<tr><td><b>IP, TCP, UDP, ECN, BGP</b></td><td>IETF (RFCs)</td><td>IPv4 RFC 791, TCP RFC 9293, UDP RFC 768, ECN RFC 3168, BGP RFC 4271</td><td>layers 3–4, routing, congestion signals</td></tr>' +
          '<tr><td><b>InfiniBand</b></td><td>IBTA</td><td>InfiniBand Architecture Specification (incl. RoCE annexes)</td><td>Quantum-X Photonics protocol and counters</td></tr>' +
          '<tr><td><b>AI Ethernet transport</b></td><td>Ultra Ethernet Consortium</td><td>UEC specification</td><td>future Ethernet transport for AI/HPC</td></tr>' +
          '<tr><td><b>NVLink</b></td><td>NVIDIA (proprietary)</td><td>NVLink / NVLink Switch / NVLink-C2C / NVLink Fusion ' + B('nv') + '</td><td>scale-up inside the rack</td></tr>' +
          '<tr><td><b>Scale-up (industry)</b></td><td>UALink Consortium</td><td>UALink specification</td><td>industry alternative for accelerator scale-up</td></tr>' +
          '<tr><td><b>Electrical lanes, CPO</b></td><td>OIF</td><td>CEI (electrical interfaces), CPO / ELSFP implementation agreements, CMIS</td><td>ASIC↔engine and laser interfaces, optics management</td></tr>' +
          '<tr><td><b>Pluggable form factors</b></td><td>MSAs</td><td>OSFP MSA, QSFP-DD MSA</td><td>the NIC end of CPO links</td></tr>' +
          '<tr><td><b>Host bus</b></td><td>PCI-SIG / CXL Consortium</td><td>PCIe 5.0 / 6.0, CXL</td><td>host CPU ↔ ASIC, NIC ↔ GPU</td></tr>' +
          '<tr><td><b>Management buses</b></td><td>NXP · MIPI · SMIF</td><td>I2C spec (UM10204), MIPI I3C, SMBus, PMBus</td><td>in-box monitoring and control</td></tr>' +
          '<tr><td><b>Platform management</b></td><td>DMTF</td><td>Redfish, MCTP, PLDM, SPDM</td><td>BMC APIs, firmware update, security</td></tr>' +
          '<tr><td><b>Time sync</b></td><td>IEEE</td><td>IEEE 1588 (PTP)</td><td>timestamps that line up across the fleet</td></tr>' +
          '<tr><td><b>Open hardware</b></td><td>OCP</td><td>rack / power / management specs (e.g. ORv3)</td><td>rack power and mechanical integration</td></tr>' }));
      } },
      { id: 'nw-debug', title: 'Debug checklist by layer', ch: 'Put it together', build(p) {
        p.appendChild(h('h2', { class: 'af-ph' }, 'Where does the problem live? A layer-by-layer checklist'));
        p.appendChild(h('p', { class: 'h-sub' }, 'Start at the bottom: if layer 1 is clean, the optics are innocent and you can hand the issue to the right team with evidence.'));
        p.appendChild(h('table', { class: 'table', html: '<tr><th>Layer</th><th>Look at</th><th>Healthy</th><th>Typical tools / commands</th></tr>' +
          '<tr><td><b>1 · Physical</b></td><td>link up/down events, pre-FEC BER, FEC histogram, uncorrectables, optical Tx/Rx power, laser bias</td><td>stable link, BER ≪ 2.4e-4, uncorrectables ≈ 0, power near baseline</td><td>transceiver/CMIS readout, PHY counters, eye/BER scans</td></tr>' +
          '<tr><td><b>2 · Link</b></td><td>CRC/FCS errors, symbol errors (IB), pause frames, link-level retries</td><td>CRC ≈ 0</td><td>interface counters, IB port counters</td></tr>' +
          '<tr><td><b>3 · Network</b></td><td>drops, ECN marks, queue depths, routing / ECMP balance, unreachable routes</td><td>balanced paths, few marks, no drops</td><td>routing table, queue telemetry, traceroute-style probes</td></tr>' +
          '<tr><td><b>4 · Transport</b></td><td>retransmits, RDMA NAKs / timeouts, out-of-order packets</td><td>near zero</td><td>NIC counters, perftest-style bandwidth/latency tests</td></tr>' +
          '<tr><td><b>7 · Application</b></td><td>NCCL bus bandwidth, all-reduce time, job step time</td><td>matches the expected bandwidth</td><td>NCCL tests, job logs</td></tr>' +
          '<tr><td><b>In the box</b></td><td>I2C/PMBus errors, "module not present", BMC sensor alarms, PCIe link width/speed</td><td>all devices answer, PCIe at full width</td><td>BMC logs / Redfish, OS device lists</td></tr>' }));
        p.appendChild(h('div', { class: 'af-plain', html: '<b>Golden rule:</b> correlate in time. Synchronized clocks (PTP) and streaming telemetry let you line up "BER rose" with "job started", "laser current rose" or "firmware changed". Most root causes show up as a <b>coincidence in the timeline</b>.' }));
        p.appendChild(h('div', { class: 'callout', html: 'Practise this in the <a href="#cases">Case Studies & Pareto</a> course: every case is a layer-by-layer investigation.' }));
      } }
    ].concat(C.course.appendixPages(C.netAppendix)).concat([
      { id: 'done', title: 'Course complete', ch: 'Finish', build(p, ctx) {
        p.appendChild(h('div', { class: 'af-hero' },
          h('div', { class: 'af-eyebrow' }, 'Course complete'),
          h('h1', { html: 'From <em>I2C</em> at 100 kb/s to <em>115 Tb/s</em> through one chip' }),
          h('ul', { class: 'af-takeaways', html:
            '<li><b>Layers</b> split the problem: physical (lanes, FEC, light), link (Ethernet/IB frames), network (IP routing), transport (TCP/UDP/RDMA), application (NCCL).</li>' +
            '<li><b>AI traffic uses RDMA</b> (InfiniBand or RoCE), with GPUDirect and reliability in the NIC, over a <b>lossless</b> fabric (credits, or ECN + PFC + adaptive routing).</li>' +
            '<li><b>NVLink</b> is the scale-up network (1.8 TB/s per GPU, 72 GPUs, memory semantics). Ethernet/InfiniBand with CPO is the scale-out network that joins NVLink domains.</li>' +
            '<li>Inside the box, <b>PCIe</b> connects the host CPU and ASIC, and slow buses (<b>I2C/I3C, SPI, UART, JTAG, MDIO, PMBus</b>) plus <b>CMIS</b> manage optics, power and sensors.</li>' +
            '<li>Debug <b>bottom-up</b> and <b>by timeline</b>: prove layer 1 clean or guilty first.</li>' }),
          h('div', { class: 'af-cta' },
            h('button', { class: 'btn primary', onclick: () => C.go('cases') }, 'Continue: Case Studies & Pareto →'),
            h('button', { class: 'btn', onclick: () => C.go('dataflow') }, 'Data-Flow Simulator'),
            h('button', { class: 'btn', onclick: () => ctx.goId('start') }, '↺ Restart'))));
        p.appendChild(h('div', { class: 'callout warn', html: 'Numbers marked ' + B('nv') + ' are NVIDIA public announcements; ' + B('typ') + ' are industry-typical values from public standards and literature; ' + B('est') + ' are illustrative estimates. Standards evolve: check the current revision for exact figures.' }));
      } }
    ])
  });
})();
