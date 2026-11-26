/* Firmware & Software course: the software that runs a CPO switch, for a hardware/system engineer.
   Stack, boot, control loops, telemetry, updates, security, state machines, quality. Uses js/course-engine.js. */
(function () {
  'use strict';
  const C = window.CPO;
  const h = C.h, B = C.badge, CE = C.course;
  const K = CE.K;
  const { R, T, L, P, O, G, cap, along, ptsD } = CE.svg;
  const fx = CE.fact;

  C.addGlossary({
    'RTOS': { full: 'Real-Time Operating System', def: 'Small operating system for microcontrollers that guarantees tasks run on time.', cat: 'control' },
    'UEFI': { full: 'Unified Extensible Firmware Interface', def: 'Modern firmware that initializes a CPU platform and starts the operating system (successor to BIOS).', cat: 'control' },
    'A/B update': { full: 'A/B (dual-bank) firmware update', def: 'Two copies of firmware: the new one is written to the inactive bank, verified, then booted; if it fails, the device rolls back.', cat: 'control' },
    'Canary': { full: 'Canary release', def: 'Deploying a new version to a small part of the fleet first and watching for problems before rolling out widely.', cat: 'control' },
    'HIL': { full: 'Hardware-in-the-loop test', def: 'Automated tests that run new software on real hardware in the lab.', cat: 'test' },
    'Driver': { full: 'Device driver', def: 'Software that lets the operating system talk to a specific piece of hardware through its registers.', cat: 'control' }
  });

  function dots(g, n, col, r) { const a = []; for (let k = 0; k < n; k++) a.push(O(g, -9, -9, r || 3, { fill: col })); return a; }

  function sStack(g) {
    cap(g, 30, 34, 'THE SOFTWARE STACK OF A CPO SWITCH (typical layering)', K.text);
    const rows = [
      ['Fleet / management', K.acc, ['Fabric manager (e.g. UFM)', 'Telemetry & dashboards', 'Provisioning / config', 'Ticketing & analytics']],
      ['Network OS (host CPU, Linux)', K.data, ['Routing & protocol apps', 'Switch state DB', 'Platform drivers (optics, fans)', 'ASIC SDK + driver']],
      ['Boot & platform firmware', K.ctrl, ['UEFI / bootloader', 'BMC firmware', 'CPLD / FPGA logic', 'Secure-boot root of trust']],
      ['Device firmware', K.optic, ['Optical-engine microcontroller', 'External laser module MCU', 'VRM / power controllers', 'SerDes & PHY microcode']],
      ['Hardware', K.muted, ['Switch ASIC', 'Optical engines', 'Lasers, sensors, fans', 'Power, management buses']]];
    const bx = [];
    rows.forEach(([n, c, items], i) => { const y = 60 + i * 86; T(g, 30, y + 40, n, { 'font-size': 13, 'font-weight': 700, fill: c }); items.forEach((it, j) => { const x = 250 + j * 182; bx.push(R(g, x, y + 10, 170, 56, { fill: K.panel, stroke: c, rx: 8 })); const w = it.split(' '), l1 = [], l2 = []; w.forEach(x2 => ((l1.join(' ') + ' ' + x2).length < 22 && !l2.length ? l1 : l2).push(x2)); T(g, x + 85, y + (l2.length ? 34 : 43), l1.join(' '), { 'text-anchor': 'middle', 'font-size': 12.5 }); if (l2.length) T(g, x + 85, y + 52, l2.join(' '), { 'text-anchor': 'middle', 'font-size': 12.5 }); }); });
    const pk = dots(g, 3, '#fff', 5);
    R(g, 30, 500, 940, 80, { fill: K.panel, stroke: K.line, rx: 10 });
    T(g, 50, 528, 'Each layer runs on different hardware, is often written by a different team or supplier, and is updated on its own schedule.', { 'font-size': 13 });
    T(g, 50, 552, 'The system engineer owns the interfaces between layers and the version compatibility between them.', { 'font-size': 13, fill: K.acc });
    return { hot: [{ x: 246, y: 226, w: 734, h: 82, target: 'fw-boot', label: 'The boot sequence' }], update(t) { const k = Math.floor(t * 2) % bx.length; bx.forEach((r, i) => r.setAttribute('fill', i === k ? '#1d2a38' : K.panel)); pk.forEach((d, i) => { const u = (t * 0.3 + i / 3) % 1; d.setAttribute('cx', 980 - 10); d.setAttribute('cy', 470 - u * 400); }); } };
  }

  function sBoot(g) {
    cap(g, 30, 34, 'POWER ON TO TRAFFIC: THE BOOT SEQUENCE (illustrative order)', K.text);
    const st = [['Power applied', 'standby rails up', K.power], ['CPLD sequences rails', 'in a defined order, checks "power good"', K.power], ['BMC boots', 'monitoring starts first', K.ctrl], ['Host CPU: UEFI', 'firmware checks + secure boot', K.ctrl], ['Linux + network OS', 'services start', K.data], ['ASIC SDK init', 'load config, tables, SerDes', K.acc], ['Optical engines', 'power up, load firmware + calibration', K.optic], ['Lasers enabled', 'only after interlocks & engine ready', K.therm], ['Rings lock', 'heaters find resonances', K.optic], ['Links train', 'SerDes adapt, FEC locks, links up', K.acc], ['Traffic', 'routing converges, telemetry flows', K.acc]];
    const bx = st.map(([a, b2, c], i) => { const col = i % 4, row = Math.floor(i / 4), x = 30 + col * 238, y = 60 + row * 130; const r = R(g, x, y, 220, 96, { fill: K.panel, stroke: c, rx: 10 }); T(g, x + 14, y + 26, (i + 1) + '. ' + a, { 'font-size': 13.5, 'font-weight': 700, fill: c }); const w = b2.split(' '), l1 = [], l2 = []; w.forEach(x2 => ((l1.join(' ') + ' ' + x2).length < 30 && !l2.length ? l1 : l2).push(x2)); T(g, x + 14, y + 52, l1.join(' '), { 'font-size': 12 }); T(g, x + 14, y + 70, l2.join(' '), { 'font-size': 12 }); return r; });
    const bar = R(g, 30, 470, 0, 14, { fill: K.acc, stroke: 'none', rx: 7 }); R(g, 30, 470, 940, 14, { fill: 'none', stroke: K.line, rx: 7 });
    const lt = T(g, 30, 510, '', { 'font-size': 13.5, 'font-weight': 700 });
    T(g, 30, 540, 'Why order matters: lasers must never shine into unpowered or unlocked optics, and links shouldn\'t be declared up before calibration loads.', { 'font-size': 12.8 });
    T(g, 30, 562, 'Every step needs a timeout, a log message and a defined failure behaviour. Boot time (minutes) also matters for maintenance windows.', { 'font-size': 12.8, fill: K.acc });
    return { hot: [{ x: 26, y: 316, w: 228, h: 104, target: 'fw-loops', label: 'Control loops in firmware' }], update(t) { const n = Math.floor((t * 0.9) % (st.length + 2)); bx.forEach((r, i) => r.setAttribute('fill', i < n ? '#16240f' : i === n ? '#1d2a38' : K.panel)); bar.setAttribute('width', 940 * Math.min(1, n / st.length)); lt.textContent = n >= st.length ? '✓ switch is up and forwarding' : 'now: ' + st[n][0]; lt.setAttribute('fill', n >= st.length ? K.acc : K.text); } };
  }

  function sLoops(g) {
    cap(g, 30, 34, 'CONTROL LOOPS IN FIRMWARE: SENSE → DECIDE → ACT, OVER AND OVER', K.text);
    const blocks = [['Sensor', 'monitor PD, thermistor', 80, K.sense], ['ADC', 'sample', 270, K.sense], ['Controller', 'error → P + I + D', 460, K.ctrl], ['DAC / driver', 'set heater, current', 650, K.therm], ['Plant', 'ring, laser, fan…', 840, K.optic]];
    blocks.forEach(([a, b2, x, c]) => { R(g, x - 70, 70, 140, 70, { fill: K.panel, stroke: c, 'stroke-width': 2, rx: 8 }); T(g, x, 100, a, { 'text-anchor': 'middle', 'font-size': 13.5, 'font-weight': 700 }); T(g, x, 120, b2, { 'text-anchor': 'middle', 'font-size': 11.5, fill: K.muted }); });
    const lp = [[150, 105], [200, 105], [340, 105], [390, 105], [530, 105], [580, 105], [720, 105], [770, 105], [910, 105], [940, 105], [940, 175], [80, 175], [80, 140]];
    P(g, ptsD(lp), { stroke: K.ctrl, 'stroke-width': 2, 'stroke-dasharray': '5 5' }); const ld = dots(g, 4, K.ctrl, 4);
    R(g, 30, 200, 600, 260, { fill: '#05080b', stroke: K.line, rx: 8 }); T(g, 46, 222, 'step response: setpoint (dashed) and output', { fill: K.muted, 'font-size': 12 });
    const sp = P(g, 'M50 400 L120 400 L120 280 L620 280', { stroke: K.muted, 'stroke-dasharray': '6 4', 'stroke-width': 2 });
    const curves = [[K.bad, 'P only: offset remains'], [K.warn, 'too aggressive: overshoot, ringing'], [K.acc, 'well tuned PI(D)']].map(([c, l], i) => { T(g, 60, 440 - i * 18 + 0, '— ' + l, { fill: c, 'font-size': 11.5 }); return P(g, '', { stroke: c, 'stroke-width': 2.5 }); });
    void sp;
    R(g, 650, 200, 320, 380, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 666, 226, 'LOOPS IN A CPO SWITCH', K.text);
    [['Ring lock', 'µs–ms', K.optic], ['Laser power (APC)', 'ms', K.therm], ['Laser temperature', 'ms–s', K.therm], ['VRM voltage', 'µs (hardware)', K.power], ['SerDes adaptation', 'continuous (HW)', K.data], ['Fans / pumps', 's', K.cool], ['Thermal throttling', 's', K.bad]].forEach(([a, b2, c], i) => { T(g, 666, 260 + i * 32, a, { 'font-size': 13, fill: c, 'font-weight': 700 }); T(g, 954, 260 + i * 32, b2, { 'text-anchor': 'end', 'font-size': 12, fill: K.muted }); });
    T(g, 666, 500, 'Rule: sample at least ~10× faster', { 'font-size': 12.5, fill: K.acc }); T(g, 666, 520, 'than the loop bandwidth, and the loop', { 'font-size': 12.5, fill: K.acc }); T(g, 666, 540, 'faster than the disturbance it fights.', { 'font-size': 12.5, fill: K.acc });
    R(g, 30, 480, 600, 100, { fill: K.panel, stroke: K.line, rx: 10 });
    T(g, 46, 508, 'P reacts to the error now, I removes remaining offset over time,', { 'font-size': 12.8 }); T(g, 46, 530, 'D damps fast changes. Too much gain → oscillation.', { 'font-size': 12.8 }); T(g, 46, 556, 'Your mechanics intuition: it is a damped spring-mass system.', { 'font-size': 12.8, fill: K.acc });
    return { hot: [{ x: 646, y: 196, w: 328, h: 388, target: 'fw-telemetry', label: 'Telemetry pipeline' }], update(t) {
      ld.forEach((d, k) => { const p2 = along(lp, (t * 0.2 + k / 4) % 1); d.setAttribute('cx', p2[0]); d.setAttribute('cy', p2[1]); });
      const tm = (t % 6) / 6;
      const resp = [x => 1 - 0.3 - 0.7 * Math.exp(-x * 4), x => 1 - Math.exp(-x * 3) * Math.cos(x * 14) * 1.0, x => 1 - Math.exp(-x * 7) * (1 + x * 2)];
      curves.forEach((c, i) => { let d = ''; for (let k = 0; k <= 100; k++) { const x = k / 100; if (x > tm) break; const v = resp[i](x * 1.3); d += (d ? 'L' : 'M') + (120 + x * 500) + ' ' + (400 - v * 120); } c.setAttribute('d', d); });
    } };
  }

  function sTelemetry(g) {
    cap(g, 30, 34, 'TELEMETRY: FROM A REGISTER IN A CHIP TO AN ALERT ON A SCREEN', K.text);
    const st = [['Sensors & counters', 'temperatures, optical power, laser bias, FEC counters, BER', 60, K.sense], ['Drivers poll', 'I2C/CMIS, PCIe reads, every 1–10 s (or streamed by the ASIC)', 250, K.ctrl], ['Switch state DB', 'latest values + history on the box', 440, K.data], ['Streaming', 'gNMI / push to collectors', 630, K.acc], ['Fleet store & alerts', 'time-series DB, dashboards, alerts, ML anomaly detection', 820, K.warn]];
    st.forEach(([a, b2, x, c]) => { R(g, x - 80, 70, 170, 140, { fill: K.panel, stroke: c, 'stroke-width': 2, rx: 10 }); T(g, x + 5, 98, a, { 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: c }); const w = b2.split(' '), ls = [[]]; w.forEach(x2 => { const cur = ls[ls.length - 1]; if ((cur.join(' ') + ' ' + x2).length > 22) ls.push([x2]); else cur.push(x2); }); ls.forEach((l, j) => T(g, x + 5, 124 + j * 18, l.join(' '), { 'text-anchor': 'middle', 'font-size': 11.5 })); });
    const ds = [0, 1, 2, 3].map(i => ({ pts: [[60 + i * 190 + 90, 140], [60 + (i + 1) * 190 - 80, 140]], d: dots(g, 2, '#fff', 4) }));
    R(g, 30, 230, 600, 200, { fill: '#05080b', stroke: K.line, rx: 8 }); T(g, 46, 252, 'a laser-bias trend with an alert threshold', { fill: K.muted, 'font-size': 12 });
    L(g, 50, 300, 620, 300, { stroke: K.warn, 'stroke-dasharray': '6 4' }); T(g, 616, 294, 'alert: +15 % vs day 1', { 'text-anchor': 'end', fill: K.warn, 'font-size': 11.5 });
    const tr = P(g, '', { stroke: K.optic, 'stroke-width': 2.5 }); const al = T(g, 330, 420, '', { 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: K.bad });
    R(g, 650, 230, 320, 350, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 666, 256, 'DESIGN QUESTIONS', K.text);
    ['What is collected, how often,', 'and at what resolution?', 'Polling load on slow buses', '(see the calculator later).', 'Timestamps: synchronized clocks', '(PTP) so events line up.', 'Thresholds: from budgets and', 'models, not guesses.', 'Retention: how long, where,', 'linked to serial numbers.', 'Who gets alerted, and what', 'do they do? (runbooks)'].forEach((s, i) => T(g, 666, 284 + i * 23, s, { 'font-size': 12.6, fill: i % 2 ? K.muted : K.text }));
    R(g, 30, 450, 600, 130, { fill: K.panel, stroke: K.line, rx: 10 });
    T(g, 46, 478, 'Telemetry is how the case studies were solved: trends, groupings', { 'font-size': 12.8 }); T(g, 46, 500, '(all lanes on one laser) and coincidences in time (job start).', { 'font-size': 12.8 }); T(g, 46, 530, 'If a parameter isn\'t collected, its failure mode can\'t be', { 'font-size': 12.8, fill: K.acc }); T(g, 46, 552, 'predicted, only discovered.', { 'font-size': 12.8, fill: K.acc });
    return { hot: [{ x: 646, y: 226, w: 328, h: 358, target: 'fw-update', label: 'Firmware updates' }], update(t) {
      ds.forEach((s2, i) => s2.d.forEach((d, k) => { const p2 = along(s2.pts, (t * 0.6 + k / 2 + i * 0.1) % 1); d.setAttribute('cx', p2[0]); d.setAttribute('cy', p2[1]); }));
      const tm = (t % 8) / 8; let d = ''; let crossed = false; for (let i = 0; i <= 100; i++) { const x = i / 100; if (x > tm) break; const v = 380 - 90 * Math.pow(x, 1.6) + 6 * Math.sin(x * 40); if (v < 300) crossed = true; d += (d ? 'L' : 'M') + (50 + x * 570) + ' ' + v; } tr.setAttribute('d', d); al.textContent = crossed ? '🔔 ALERT: replace laser module in next maintenance window' : '';
    } };
  }

  function sUpdate(g) {
    cap(g, 30, 34, 'UPDATING FIRMWARE SAFELY: A/B BANKS, VERIFICATION, ROLLBACK', K.text);
    const A = R(g, 80, 80, 260, 120, { fill: K.panel, stroke: K.acc, 'stroke-width': 2, rx: 10 }), Bb = R(g, 380, 80, 260, 120, { fill: K.panel, stroke: K.line, 'stroke-width': 2, rx: 10 });
    T(g, 210, 110, 'Bank A', { 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700 }); T(g, 510, 110, 'Bank B', { 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700 });
    const at = T(g, 210, 150, '', { 'text-anchor': 'middle', 'font-size': 12.5 }), bt = T(g, 510, 150, '', { 'text-anchor': 'middle', 'font-size': 12.5 });
    const st = T(g, 360, 240, '', { 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700 });
    R(g, 680, 60, 290, 200, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 696, 86, 'FLEET ROLLOUT', K.text);
    const fleet = []; for (let i = 0; i < 60; i++) fleet.push(R(g, 700 + (i % 12) * 22, 104 + Math.floor(i / 12) * 26, 16, 18, { fill: '#26323f', stroke: 'none', rx: 3 }));
    const ft = T(g, 696, 250, '', { 'font-size': 12, fill: K.muted });
    R(g, 30, 280, 940, 300, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 50, 306, 'RULES FOR UPDATES IN A FLEET OF THOUSANDS OF SWITCHES', K.text);
    [['Never brick', 'keep a known-good image (A/B or golden image) so a failed or interrupted update can always recover.'], ['Verify', 'check the image\'s cryptographic signature and integrity before booting it.'], ['Health check', 'after booting the new version, run self-tests; roll back automatically if they fail.'], ['Canary first', 'update a few switches, watch telemetry, then expand in waves; stop on anomalies.'], ['Hitless where possible', 'update without dropping traffic, or drain traffic first during maintenance windows.'], ['Compatibility', 'publish which combinations of ASIC SDK, engine firmware, laser firmware and NOS are supported.']]
      .forEach(([a, b2], i) => { T(g, 50, 340 + i * 38, a, { 'font-size': 13.5, 'font-weight': 700, fill: K.acc }); T(g, 210, 340 + i * 38, b2, { 'font-size': 12.8 }); });
    return { hot: [{ x: 676, y: 56, w: 298, h: 208, target: 'fw-security', label: 'Security & secure boot' }], update(t) {
      const ph = Math.floor(t / 1.4) % 6; const lab = ['running v1.4 from A', 'writing v1.5 into B', 'verifying signature of B', 'rebooting into B', 'health check on B…', 'v1.5 running from B ✓ (A kept as fallback)'];
      st.textContent = lab[ph]; st.setAttribute('fill', ph === 5 ? K.acc : K.text);
      at.textContent = 'v1.4 ' + (ph < 3 ? '(active)' : '(fallback)'); bt.textContent = ph === 0 ? 'empty / old' : ph === 1 ? 'writing…' : 'v1.5 ' + (ph >= 3 ? '(active)' : '');
      A.setAttribute('stroke', ph < 3 ? K.acc : K.line); Bb.setAttribute('stroke', ph >= 3 ? K.acc : ph >= 1 ? K.warn : K.line);
      const wave = Math.floor(t / 2) % 4, n = [1, 6, 24, 60][wave]; fleet.forEach((f, i) => f.setAttribute('fill', i < n ? '#3b6a16' : '#26323f')); ft.textContent = ['canary: 1 switch', 'wave 1: 10 %', 'wave 2: 40 %', 'all switches'][wave];
    } };
  }

  function sSecurity(g) {
    cap(g, 30, 34, 'SECURE BOOT: A CHAIN OF TRUST FROM SILICON TO SOFTWARE', K.text);
    const ch = [['Hardware root of trust', 'immutable ROM + keys in silicon', K.acc], ['Bootloader', 'verified by the root of trust', K.data], ['Platform firmware', 'UEFI / BMC verified by the bootloader', K.ctrl], ['Operating system', 'kernel + network OS verified', K.data], ['Device firmware', 'engines, lasers, VRMs: signed images; attested with SPDM', K.optic]];
    const bx = ch.map(([a, b2, c], i) => { const y = 60 + i * 76; const r = R(g, 80, y, 420, 60, { fill: K.panel, stroke: c, 'stroke-width': 2, rx: 10 }); T(g, 100, y + 26, (i + 1) + '. ' + a, { 'font-size': 14, 'font-weight': 700, fill: c }); T(g, 100, y + 46, b2, { 'font-size': 12 }); if (i < 4) T(g, 290, y + 70, '↓ checks signature of', { 'text-anchor': 'middle', 'font-size': 11, fill: K.muted }); return r; });
    const lk = T(g, 290, 470, '', { 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700 });
    R(g, 540, 60, 430, 400, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 556, 86, 'WHY IT MATTERS IN AI FACTORIES', K.text);
    ['Switches carry every byte of a customer\'s', 'training data and model. Tampered firmware', 'could copy, drop or corrupt traffic invisibly.', '', 'Each link of the chain only runs code that is', 'signed by a trusted key; if a check fails, the', 'device stops or falls back to a known image.', '', 'SPDM lets the host ask a device "prove what', 'firmware you run" (attestation).', '', 'For you: every programmable device (engines,', 'laser modules, CPLDs, VRM controllers) is part', 'of the attack surface and needs signed updates.'].forEach((s, i) => T(g, 556, 114 + i * 23, s, { 'font-size': 12.6, fill: i >= 11 ? K.acc : K.text }));
    return { hot: [{ x: 536, y: 56, w: 438, h: 408, target: 'fw-fsm', label: 'State machines' }], update(t) { const n = Math.floor(t * 1.2) % (ch.length + 3); bx.forEach((r, i) => r.setAttribute('fill', i < n ? '#16240f' : K.panel)); lk.textContent = n >= ch.length ? '🔒 every layer verified: trusted boot complete' : 'verifying layer ' + (n + 1) + '…'; lk.setAttribute('fill', n >= ch.length ? K.acc : K.text); } };
  }

  function sFsm(g) {
    cap(g, 30, 34, 'STATE MACHINES: HOW FIRMWARE BRINGS A LANE UP (simplified, CMIS-like)', K.text);
    const S2 = [['Off', 90, 140], ['Low power', 260, 140], ['Powering up', 430, 140], ['Ready', 600, 140], ['Lasers on', 770, 140], ['Rings locking', 770, 300], ['Link training', 600, 300], ['Up', 430, 300], ['Fault', 260, 300]];
    const pos = {}; S2.forEach(([n, x, y]) => { pos[n] = [x, y]; });
    const nodes = S2.map(([n, x, y]) => { const r = R(g, x - 72, y - 26, 144, 52, { fill: K.panel, stroke: n === 'Fault' ? K.bad : n === 'Up' ? K.acc : K.line, 'stroke-width': 2, rx: 26 }); T(g, x, y + 5, n, { 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700 }); return r; });
    const edges = [['Off', 'Low power'], ['Low power', 'Powering up'], ['Powering up', 'Ready'], ['Ready', 'Lasers on'], ['Lasers on', 'Rings locking'], ['Rings locking', 'Link training'], ['Link training', 'Up']];
    edges.forEach(([a, b2]) => { const [x1, y1] = pos[a], [x2, y2] = pos[b2]; P(g, 'M' + (x1 + (x2 > x1 ? 72 : x2 < x1 ? -72 : 0)) + ' ' + (y1 + (y2 > y1 ? 26 : 0)) + ' L' + (x2 + (x2 > x1 ? -72 : x2 < x1 ? 72 : 0)) + ' ' + (y2 - (y2 > y1 ? 26 : 0)), { stroke: K.muted, 'stroke-width': 2 }); });
    P(g, 'M430 326 C 430 380, 260 380, 260 326', { stroke: K.bad, 'stroke-width': 2, 'stroke-dasharray': '5 4' }); T(g, 345, 392, 'loss of lock / BER alarm', { 'text-anchor': 'middle', fill: K.bad, 'font-size': 11.5 });
    P(g, 'M188 300 C 120 300, 90 240, 90 166', { stroke: K.bad, 'stroke-width': 2, 'stroke-dasharray': '5 4' }); T(g, 80, 250, 'reset / retry', { 'text-anchor': 'end', fill: K.bad, 'font-size': 11.5 });
    const tok = O(g, 0, 0, 9, { fill: '#fff', filter: 'drop-shadow(0 0 6px #76b900)' });
    R(g, 30, 420, 940, 160, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 50, 446, 'WHY STATE MACHINES ARE A SYSTEM ENGINEERING TOPIC', K.text);
    ['Every state needs entry conditions, a timeout and a defined way out (including to "Fault"). Undefined transitions are where field bugs live.', 'Hardware and firmware must agree on them: which register shows the state, which interrupt signals a change, which telemetry logs it.', 'Retry policies matter at fleet scale: thousands of lanes retrying too aggressively after an event can cause their own outage.', 'Draw them in the interface spec, and test the fault paths (pull fibers, drop lasers, heat the package), not just the happy path.'].forEach((s, i) => T(g, 50, 478 + i * 25, s, { 'font-size': 12.6 }));
    const path = ['Off', 'Low power', 'Powering up', 'Ready', 'Lasers on', 'Rings locking', 'Link training', 'Up', 'Up', 'Fault', 'Fault', 'Off'];
    return { hot: [{ x: 26, y: 416, w: 948, h: 168, target: 'fw-quality', label: 'Software quality & releases' }], update(t) { const k = Math.floor(t * 0.9) % path.length, nx = path[(k + 1) % path.length], u = (t * 0.9) % 1; const a = pos[path[k]], b2 = pos[nx]; tok.setAttribute('cx', C.lerp(a[0], b2[0], Math.min(1, u * 2))); tok.setAttribute('cy', C.lerp(a[1], b2[1], Math.min(1, u * 2)) - 30); nodes.forEach((r, i) => r.setAttribute('fill', S2[i][0] === path[k] ? '#1d2a38' : K.panel)); } };
  }

  function sQuality(g) {
    cap(g, 30, 34, 'HOW SOFTWARE QUALITY IS BUILT AND PROVEN', K.text);
    const st = [['Code + review', 'every change reviewed', K.data], ['Unit tests', 'automatic, minutes', K.acc], ['Simulation', 'models of the hardware', K.ctrl], ['HIL tests', 'real switches in the lab', K.warn], ['Fabric regression', 'many switches, real traffic', K.optic], ['Staged release', 'canary → waves', K.acc], ['Field monitoring', 'telemetry → bugs → fixes', K.sense]];
    const bx = st.map(([a, b2, c], i) => { const x = 30 + i * 135; const r = R(g, x, 70, 125, 90, { fill: K.panel, stroke: c, rx: 10 }); T(g, x + 62, 104, a, { 'text-anchor': 'middle', 'font-size': 12.5, 'font-weight': 700, fill: c }); T(g, x + 62, 126, b2, { 'text-anchor': 'middle', 'font-size': 10.8 }); return r; });
    P(g, 'M900 165 L900 190 L90 190 L90 165', { stroke: K.muted, 'stroke-dasharray': '4 4' }); T(g, 495, 206, 'field findings feed new tests', { 'text-anchor': 'middle', fill: K.muted, 'font-size': 11.5 });
    R(g, 30, 230, 460, 350, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 46, 256, 'WHAT YOU SHOULD ASK SOFTWARE TEAMS', K.text);
    ['Which requirements are covered by automated tests?', 'Are fault paths tested (fiber pulled, laser off,', 'over-temperature, bus hung, power glitch)?', 'Is there a hardware-in-the-loop setup with real', 'CPO hardware, and how many configurations?', 'What is the supported version matrix, and how is', 'compatibility checked at upgrade time?', 'How quickly can a fix reach the fleet safely?', 'What telemetry would reveal a bug in the field?'].forEach((s, i) => T(g, 46, 286 + i * 28, s, { 'font-size': 12.8, fill: i % 2 ? K.muted : K.text }));
    R(g, 510, 230, 460, 350, { fill: K.panel, stroke: K.line, rx: 10 }); cap(g, 526, 256, 'HARDWARE ↔ SOFTWARE CONTRACT', K.acc);
    ['The interface spec between hardware and software:', '• register maps (address, meaning, units, reset value)', '• timing (how long after power-up, max poll rates)', '• interrupts vs polling, error codes', '• calibration data format and location', '• telemetry list with units and resolution', '• state machines and their timeouts', '• version and compatibility rules', 'Owning this contract is a core SE job: most', '"software bugs" in hardware products are really', 'mismatched assumptions at this interface.'].forEach((s, i) => T(g, 526, 286 + i * 26, s, { 'font-size': 12.6, fill: i >= 8 ? K.acc : K.text }));
    return { hot: [], update(t) { const k = Math.floor(t * 1.1) % st.length; bx.forEach((r, i) => r.setAttribute('fill', i === k ? '#1d2a38' : K.panel)); } };
  }

  const LV = [
    { id: 'fw-stack', name: 'The stack', scene: sStack, title: 'The software stack of a CPO switch', sub: 'Who runs where',
      plain: 'A CPO switch runs software at every level. <b>Device firmware</b> runs on small microcontrollers in engines, laser modules and power controllers. <b>Platform firmware</b> (BMC, CPLD logic, UEFI) brings the box up. The <b>network OS</b> on the host CPU programs the ASIC. <b>Fleet tools</b> manage thousands of switches.',
      body: '<p>Different teams and suppliers often own different layers, each updated on its own schedule. The interfaces between them (register maps, APIs, telemetry formats) and the <b>version compatibility</b> between them are system-level concerns.</p>',
      facts: [['5 layers', 'device FW → fleet tools', 'typ'], ['Linux', 'typical network-OS base', 'typ'], ['SDK', 'library that programs the ASIC', 'typ'], ['many MCUs', 'in one CPO switch', 'est']],
      cpoTxt: 'CPO adds firmware-controlled optics: hundreds of rings, lasers and engines whose behaviour depends on firmware. Optical performance is now partly a <b>software property</b>, so it needs requirements, tests and version control like any other.',
      more: 'Firmware is software stored in a device\'s non-volatile memory that runs close to the hardware, usually without a full operating system.', links: [['architecture/firmware', 'Firmware in the explorer']] },
    { id: 'fw-boot', name: 'Boot sequence', scene: sBoot, title: 'From power-on to traffic', sub: 'The boot and bring-up sequence',
      plain: 'Switching on a CPO switch is a carefully ordered sequence. Power rails come up in order, the BMC starts monitoring, the host CPU boots and loads the network OS, the ASIC is initialized, then the optical engines, then (only when safe) the <b>lasers</b>. The rings lock, links train, and traffic starts.',
      body: '<p>Each step has prerequisites, a timeout and a failure path. Order matters for safety (lasers), for reliability (don\'t stress parts), and for correctness (calibration must be loaded before links come up).</p>',
      facts: [['minutes', 'typical full boot time', 'est'], ['interlocks', 'before lasers turn on', 'typ'], ['ordered', 'power sequencing', 'typ'], ['logs', 'every step timestamped', 'typ']],
      cpoTxt: 'You will help define and verify the <b>bring-up sequence</b> across hardware, firmware and software, and its failure behaviour: what happens if one engine fails to start, or a laser module is missing? Does the rest of the box still come up?',
      more: 'Boot time matters operationally: a shorter boot means shorter maintenance windows and faster recovery after a power event.', links: [['architecture/power-sequencing', 'Power sequencing in the explorer']] },
    { id: 'fw-loops', name: 'Control loops', scene: sLoops, title: 'Control loops in firmware', sub: 'Sense, decide, act',
      plain: 'Many CPO functions are <b>feedback loops</b> run by firmware: measure something (light, temperature), compare with a target, adjust an actuator (heater, laser current, fan), and repeat. A <b>PID</b> controller is the classic recipe: <b>P</b>roportional reacts now, <b>I</b>ntegral removes leftover error, <b>D</b>erivative damps fast changes.',
      body: '<p>Loop speed must match the disturbance: ring-lock loops must be faster than the package\'s thermal rise, and laser power loops must outpace aging and temperature drift. Sampling must be well above the loop bandwidth.</p>',
      facts: [['PID', 'the classic controller', 'typ'], ['µs–s', 'loop timescales in a switch', 'typ'], ['≥10×', 'sample rate vs loop bandwidth', 'typ'], ['stability', 'phase margin, no oscillation', 'typ']],
      cpoTxt: 'Specify loops by what they must achieve (maximum error, settling time, disturbance rejection) and verify them with the disturbances that really occur: load steps, coolant changes, aging. The PID tuner later in this course lets you feel the trade-offs.',
      more: 'Mechanics view: a closed loop is a spring–mass–damper whose stiffness and damping you choose in software.', links: [['architecture/ring-lock-loop', 'Ring-lock loop'], ['architecture/laser-apc-loop', 'Laser power loop']] },
    { id: 'fw-telemetry', name: 'Telemetry', scene: sTelemetry, title: 'Telemetry: from register to alert', sub: 'Collecting the data that keeps a fleet healthy',
      plain: 'Thousands of values (temperatures, optical powers, laser currents, error counters) are read from chips, stored on the switch, <b>streamed</b> to collectors and kept in time-series databases. Dashboards and <b>alerts</b> turn them into actions, such as "replace this laser module next week".',
      body: '<p>Key decisions: what to collect, how often, at what resolution, with which thresholds, for how long, and who acts on each alert. Slow management buses limit how fast things can be polled. The second calculator in this course estimates that load.</p>',
      facts: [['1–10 s', 'typical polling interval', 'typ'], ['gNMI', 'streaming telemetry', 'typ'], ['PTP', 'synchronized timestamps', 'typ'], ['runbooks', 'what to do on each alert', 'typ']],
      cpoTxt: 'You decide which physical parameters become telemetry and where the thresholds come from (budgets and models). The case studies show why: <b>predictive maintenance</b> only works if the right signal is collected.',
      more: 'Anomaly detection across a fleet (comparing similar parts against each other) often finds problems that fixed thresholds miss.', links: [['cases', 'Case Studies & Pareto']] },
    { id: 'fw-update', name: 'Updates', scene: sUpdate, title: 'Updating firmware safely', sub: 'A/B banks, verification, rollback, staged rollout',
      plain: 'Firmware updates must <b>never brick</b> a device. The usual approach is <b>A/B banks</b>: write the new version to the inactive bank, check its signature, boot it, run a health check, and <b>roll back</b> automatically if anything fails. Across a fleet, updates go to a few <b>canary</b> switches first, then out in waves.',
      body: '<p>Hitless or traffic-drained updates, a published compatibility matrix, and the ability to stop a rollout quickly are all part of operating thousands of switches.</p>',
      facts: [['A/B', 'dual-bank firmware', 'typ'], ['signed', 'images verified before boot', 'typ'], ['canary', 'small first wave', 'typ'], ['rollback', 'automatic on failed health check', 'typ']],
      cpoTxt: 'Every programmable device in a CPO switch needs an update path: engines, laser modules, CPLDs, power controllers. Check that the hardware supports it (flash size for two images, recovery path) early. It is expensive to add later.',
      more: 'Updating optics firmware may need re-locking rings or retraining links, so plan whether it can be done without dropping traffic.', links: [] },
    { id: 'fw-security', name: 'Security', scene: sSecurity, title: 'Security and the chain of trust', sub: 'Secure boot, signed images, attestation',
      plain: '<b>Secure boot</b> builds a chain of trust: a <b>hardware root of trust</b> (code and keys that can\'t be changed) checks the bootloader\'s signature, which checks the next layer, and so on up to the OS. Devices can also <b>prove</b> what firmware they run (attestation, e.g. SPDM).',
      body: '<p>Switches carry customers\' most sensitive data: training sets and model weights. Tampered firmware in any programmable part could leak or corrupt it. Every device with firmware is part of the attack surface.</p>',
      facts: [['RoT', 'hardware root of trust', 'typ'], ['signatures', 'on every image', 'typ'], ['SPDM', 'device attestation (DMTF)', 'typ'], ['MCTP / PLDM', 'management transport & firmware update', 'typ']],
      cpoTxt: 'Security requirements flow down to suppliers: engine and laser-module firmware must be signed, updatable, and support attestation. Include them in supplier specifications from the start.',
      more: 'Security also covers debug interfaces: JTAG and UART consoles must be locked or disabled in production.', links: [] },
    { id: 'fw-fsm', name: 'State machines', scene: sFsm, title: 'State machines', sub: 'How firmware brings a lane up, and back down',
      plain: 'Firmware manages each lane with a <b>state machine</b>: a set of states (off, low power, powering up, ready, lasers on, locking, training, up, fault) and rules for moving between them. Good state machines have a <b>timeout</b> and a defined exit in every state, including a path to <b>fault</b> and back.',
      body: '<p>CMIS defines such a state machine for optical modules, and CPO engines need equivalents. The fault paths (loss of lock, laser failure, over-temperature) are where most field bugs hide, so they need explicit tests.</p>',
      facts: [['CMIS', 'module state machine', 'typ'], ['timeouts', 'in every state', 'typ'], ['retry policy', 'avoid fleet-wide storms', 'typ'], ['fault paths', 'must be tested', 'typ']],
      cpoTxt: 'Put the state machines in the <b>interface spec</b>, agree them between hardware and firmware teams, and require fault-injection tests (pull a fiber, kill a laser, heat the package) in validation.',
      more: 'Retry storms are a real fleet issue: after a power event, thousands of lanes retrying at once can overload management buses or controllers. Randomized back-off prevents it.', links: [['net-course/nw-cmis', 'Networking course: CMIS']] },
    { id: 'fw-quality', name: 'Quality', scene: sQuality, title: 'Software quality and releases', sub: 'From code review to field monitoring',
      plain: 'Software quality comes from layers of checks: code review, automatic unit tests, simulation, <b>hardware-in-the-loop</b> tests on real switches, fabric-level regression with real traffic, staged releases, and field monitoring that feeds new tests.',
      body: '<p>The most valuable document between hardware and software is the <b>interface contract</b>: register maps, timing, interrupts, calibration data, telemetry, state machines and version rules. Most "software bugs" in hardware products are mismatched assumptions at this interface.</p>',
      facts: [['HIL', 'hardware-in-the-loop tests', 'typ'], ['CI', 'continuous integration', 'typ'], ['matrix', 'supported version combinations', 'typ'], ['regression', 'every release', 'typ']],
      cpoTxt: 'Ask which requirements are covered by automated tests, whether fault paths are tested, and how fast a safe fix can reach the fleet. The next pages give you a PID tuner and a telemetry-polling calculator.',
      more: '', links: [] }
  ];

  function pidCalc(p) {
    CE.sliders(p, 'Tune a loop (e.g. ring-heater lock)', [['kp', 'P gain', 0, 5, 0.05, 2.0, ''], ['ki', 'I gain', 0, 5, 0.05, 2.5, ''], ['kd', 'D gain', 0, 1, 0.01, 0.05, ''], ['tau', 'Plant time constant', 0.05, 2, 0.05, 0.5, 's'], ['dead', 'Delay (sensor + compute)', 0, 0.5, 0.01, 0.05, 's'], ['dist', 'Disturbance at t = 6 s', 0, 1, 0.05, 0.4, '']], (v, el) => {
      const dt = 0.005, N = 2400, delayN = Math.round(v.dead / dt); let y = 0, integ = 0, prevE = 0; const ys = [], us = [], buf = [];
      for (let i = 0; i < N; i++) {
        const t = i * dt, sp = t > 0.5 ? 1 : 0;
        const yMeas = buf.length > delayN ? buf[buf.length - 1 - delayN] : 0;
        const e = sp - yMeas; integ += e * dt; const der = (e - prevE) / dt; prevE = e;
        const u = C.clamp(v.kp * e + v.ki * integ + v.kd * der, -5, 5);
        y += dt / v.tau * (u - y);                       // first-order plant
        const yt = y - (t > 6 ? v.dist : 0);             // load disturbance after 6 s
        buf.push(yt); ys.push(yt); us.push(u);
      }
      let ov = 0, setT = null; for (let i = 100; i < 1200; i++) { ov = Math.max(ov, ys[i] - 1); } for (let i = 1199; i > 100; i--) { if (Math.abs(ys[i] - 1) > 0.05) { setT = (i + 1) * dt - 0.5; break; } }
      const fin = ys[1190], osc = ov > 0.6;
      let s = '<svg viewBox="0 0 560 220" style="width:100%;height:auto;background:#05070a;border:1px solid var(--line);border-radius:10px"><text x="10" y="18" fill="#e6edf5" font-size="12.5" font-weight="700">step response (setpoint dashed) and disturbance at 6 s</text>';
      s += '<path d="M20 190 L' + (20 + 0.5 / 12 * 530) + ' 190 L' + (20 + 0.5 / 12 * 530) + ' 90 L550 90" fill="none" stroke="#8a99ad" stroke-dasharray="5 4"/>';
      let d = ''; for (let i = 0; i < N; i += 6) d += (i ? 'L' : 'M') + (20 + i * dt / 12 * 530).toFixed(1) + ' ' + (190 - C.clamp(ys[i], -0.5, 2) * 100).toFixed(1); s += '<path d="' + d + '" fill="none" stroke="#76b900" stroke-width="2.5"/>';
      s += '<line x1="' + (20 + 6 / 12 * 530) + '" y1="30" x2="' + (20 + 6 / 12 * 530) + '" y2="200" stroke="#a78bfa" stroke-dasharray="3 3"/><text x="' + (24 + 6 / 12 * 530) + '" y="40" fill="#a78bfa" font-size="11">disturbance</text></svg>';
      el.innerHTML = '<div class="af-out">' + fx((ov * 100).toFixed(0) + ' %', 'overshoot', 'est') + fx(setT === null ? '—' : setT.toFixed(2) + ' s', 'settling time (±5 %)', 'est') + fx(((1 - fin) * 100).toFixed(1) + ' %', 'error before disturbance', 'est') + '</div>' + s +
        '<div class="callout' + (osc ? ' warn' : '') + '" style="margin-top:10px">' + (osc ? 'Too aggressive for this delay: the loop oscillates. Reduce P or I gain, add a little D, or reduce the delay (faster sensor, faster firmware).' : v.ki === 0 ? 'Without integral action, a steady error remains, so the ring would sit slightly off resonance.' : 'Stable. Notice how delay limits how aggressive you can be: delay is the enemy of every control loop.') + '</div>';
    }, 'Simple first-order plant with delay, discrete PID ' + B('est') + '.');
  }
  function pollCalc(p) {
    CE.sliders(p, 'Telemetry polling over I2C', [['dev', 'Devices on one bus segment', 1, 64, 1, 16, ''], ['reg', 'Bytes read per device per poll', 8, 512, 8, 128, 'B'], ['bus', 'Bus speed', 100, 1000, 100, 400, 'kHz'], ['per', 'Poll interval', 0.1, 10, 0.1, 2, 's']], (v, el) => {
      const bitsPerByte = 9, over = 30; const bitsPerDev = v.reg * bitsPerByte + over * 9 / 8 * 4; const tDev = bitsPerDev / (v.bus * 1000); const tAll = tDev * v.dev, util = tAll / v.per;
      el.innerHTML = '<div class="af-out">' + fx((tDev * 1000).toFixed(2) + ' ms', 'time to read one device', 'est') + fx((tAll * 1000).toFixed(0) + ' ms', 'time to read the whole segment', 'est') + fx((util * 100).toFixed(0) + ' %', 'bus utilization', 'est') + fx(v.per + ' s', 'worst-case delay to see a change', 'est') + '</div>' +
        '<div class="callout' + (util > 0.5 ? ' warn' : '') + '">' + (util > 1 ? 'Impossible: reading everything takes longer than the poll interval. Split devices across more bus segments, read fewer bytes (only changing values), use faster buses (I3C), or let devices raise interrupts for alarms.' : util > 0.5 ? 'Busy bus: there is little room left for control writes, firmware updates or retries. Consider more segments or reading slow-changing data less often.' : 'Comfortable. Alarms that need faster reaction should use interrupts rather than faster polling.') + '</div>' +
        '<p class="muted" style="font-size:12.5px">Each byte on I2C costs 9 clock cycles (8 data + ACK) plus addressing overhead ' + B('typ') + '.</p>';
    });
  }

  const APX = [
    { id: 'apx-swvocab', short: 'Software vocabulary', title: 'Software vocabulary for hardware engineers', lead: 'Terms you will hear in every software discussion.',
      html: '<table class="table">' + [['Firmware', 'software stored in a device\'s flash that runs close to the hardware'], ['Bootloader', 'the first code that runs; loads and verifies the next stage'], ['Kernel / user space', 'the OS core (drivers, scheduling) vs applications'], ['Driver', 'code that talks to a device through its registers'], ['SDK', 'software development kit: libraries to program a chip, like the switch ASIC'], ['API', 'the defined way one piece of software calls another'], ['Register map', 'the list of addresses a chip exposes and what each bit means'], ['Interrupt vs polling', 'device signals an event vs software asks repeatedly'], ['Watchdog', 'a timer that resets a device if its software stops responding'], ['RTOS', 'small real-time OS for microcontrollers'], ['Daemon / service', 'a program running in the background (e.g. the telemetry agent)'], ['Container', 'packaged application with its dependencies, common in network OSes'], ['CI/CD', 'automatic build, test and delivery of every change'], ['Semantic versioning', 'MAJOR.MINOR.PATCH: what a version number promises about compatibility'], ['Regression', 'something that used to work and broke after a change']].map(([a, b2]) => '<tr><td><b>' + a + '</b></td><td>' + b2 + '</td></tr>').join('') + '</table>' },
    { id: 'apx-hwsw', short: 'HW/SW interface spec', title: 'What goes in a hardware/software interface specification', lead: 'A checklist for the most important contract in the product.',
      html: '<ol><li><b>Register map</b>: address, name, access (read/write), reset value, units, scaling, which bits are reserved.</li><li><b>Timing</b>: power-up to first access, minimum time between accesses, maximum poll rates, timeouts.</li><li><b>Events</b>: which conditions raise interrupts, how they are cleared, priorities.</li><li><b>State machines</b>: states, transitions, timeouts, fault handling, how the state is reported.</li><li><b>Calibration data</b>: format, location, versioning, checksum, what happens if it is missing or corrupt.</li><li><b>Telemetry</b>: list of values, units, resolution, accuracy, update rate, alarm thresholds and hysteresis.</li><li><b>Firmware update</b>: protocol, image format, signing, rollback, duration, effect on traffic.</li><li><b>Versioning</b>: how compatibility is declared and checked, and the supported combinations.</li><li><b>Error handling</b>: error codes, logging, retries and back-off.</li><li><b>Security</b>: debug-port policy, attestation, key management.</li></ol><div class="callout">Review it with both hardware and software teams in the room. Disagreements found here are cheap; disagreements found in the field are not.</div>' }
  ];

  CE.register({
    id: 'firmware', title: 'Firmware & Software', icon: '💾', order: 9.45, storeKey: 'fw-last-step',
    levels: LV, levelCh: 'The software side', levelBoxTitle: '🛠 What this means for you as system engineer',
    finish: { go: 'reliability', label: 'Continue: Reliability Statistics →' },
    pages: [
      CE.startPage({ eyebrow: 'Guided course · about 45 minutes', title: '<em>Firmware</em> and <em>software</em> in a CPO switch',
        intro: 'The software side of a hardware product, for a system engineer who doesn\'t write code: which software runs where, how the box boots, how firmware control loops keep optics locked, how telemetry and updates work across a fleet, and how to write a good hardware/software contract. Just press <b>Next</b>.',
        analogy: [['🏗️', 'Stack', 'device firmware → fleet tools'], ['🔁', 'Loops', 'sense → decide → act'], ['📈', 'Telemetry', 'registers become alerts'], ['🔐', 'Trust', 'every layer verifies the next']],
        route: ['<b>The software side, 8 steps:</b> the stack → boot sequence → control loops → telemetry → safe updates → security → state machines → quality & releases.', '<b>Hands-on:</b> a PID loop tuner and an I2C telemetry-polling calculator.', '<b>Appendix:</b> software vocabulary and the hardware/software interface specification checklist.'] }),
      '@levels',
      CE.page('fw-pid', 'Hands-on: PID tuner', 'Hands-on', 'Tune a control loop', 'Change the gains and the delay, add a disturbance, and see overshoot, settling time and stability. The same trade-offs apply to ring locking, laser power and thermal control.', pidCalc),
      CE.page('fw-poll', 'Hands-on: polling budget', 'Hands-on', 'Can the management bus keep up with telemetry?', 'Estimate how long it takes to read all devices on an I2C segment, and how much of the bus that uses.', pollCalc)
    ].concat(CE.appendixPages(APX)).concat([
      CE.donePage({ title: 'You can now hold your own in <em>software</em> discussions', takeaways: [
        'Software runs at every level: device firmware, platform firmware, network OS, fleet tools. <b>Interfaces and version compatibility</b> are yours to own.',
        'The <b>boot sequence</b> is a safety and reliability design: order, timeouts and failure paths.',
        'Optics performance depends on <b>firmware control loops</b>; delay limits how aggressive they can be.',
        '<b>Telemetry</b> makes predictive maintenance possible, within the limits of slow management buses.',
        'Updates must never brick a device (<b>A/B, signatures, rollback, canaries</b>); every programmable part needs a <b>secure update path</b>.',
        'Specify <b>state machines</b> and test the fault paths; most product bugs live at the hardware/software interface.'],
        next: [['Continue: Reliability Statistics →', 'reliability'], ['Networking & Protocols', 'net-course']] })
    ])
  });
})();
