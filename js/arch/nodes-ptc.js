/* CPO Switch Academy — Architecture nodes: power delivery, thermal, control plane, sensing & feedback.
 * Owner: Agent C. Follows CONTRACT.md. All scenes draw into an SVG <g> (viewBox 0 0 1000 600).
 * Only api.loop / api.color are used from the engine (with CPO.* fallbacks). */
(function () {
  'use strict';
  if (!window.CPO || !CPO.arch) return;
  const S = CPO.s;
  const RM = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const TAU = Math.PI * 2;
  let UID = 0;

  /* ------------------------------------------------------------------ glossary */
  CPO.addGlossary({
    PSU: { full: 'Power Supply Unit', def: 'Converts AC (or HVDC) to the rack/chassis DC bus, e.g. 54 V. Usually N+1 or N+N redundant.', cat: 'power' },
    PFC: { full: 'Power Factor Correction', def: 'Front-end stage of a PSU that draws sinusoidal, in-phase AC current and produces a ~400 V DC link.', cat: 'power' },
    LLC: { full: 'LLC resonant converter', def: 'Resonant DC-DC topology (Lr, Lm, Cr) that achieves zero-voltage switching; used in PSUs and fixed-ratio bus converters.', cat: 'power' },
    ORv3: { full: 'Open Rack v3', def: 'OCP rack standard with a 48–54 V DC busbar fed by power shelves and battery backup units.', cat: 'power' },
    OCP: { full: 'Open Compute Project', def: 'Industry consortium publishing open hardware standards (racks, power, cooling, management).', cat: 'system' },
    BBU: { full: 'Battery Backup Unit', def: 'Rack-level Li-ion backup that holds up the 48–54 V busbar during AC loss.', cat: 'power' },
    IBC: { full: 'Intermediate Bus Converter', def: 'Converts the 48–54 V input to an intermediate bus (typically ~12 V) feeding the point-of-load regulators.', cat: 'power' },
    VRM: { full: 'Voltage Regulator Module', def: 'Point-of-load multiphase converter producing the ASIC core and other low-voltage rails.', cat: 'power' },
    PoL: { full: 'Point-of-Load converter', def: 'DC-DC regulator placed next to the load it supplies, minimizing low-voltage high-current distribution loss.', cat: 'power' },
    DrMOS: { full: 'Driver-MOSFET integrated power stage', def: 'Package combining gate driver, high-side and low-side MOSFETs (often with current/temperature sense) for one buck phase.', cat: 'power' },
    SPS: { full: 'Smart Power Stage', def: 'DrMOS with integrated current (IMON) and temperature (TMON) sensing and fault protection.', cat: 'power' },
    GaN: { full: 'Gallium Nitride', def: 'Wide-bandgap semiconductor; GaN HEMTs switch faster with lower gate charge and no reverse-recovery charge.', cat: 'power' },
    HEMT: { full: 'High-Electron-Mobility Transistor', def: 'Lateral transistor conducting through a 2D electron gas at an AlGaN/GaN heterojunction.', cat: 'power' },
    '2DEG': { full: 'Two-Dimensional Electron Gas', def: 'Sheet of high-mobility electrons confined at a heterojunction by polarization fields (≈1e13 cm⁻² in AlGaN/GaN).', cat: 'power' },
    MOSFET: { full: 'Metal-Oxide-Semiconductor Field-Effect Transistor', def: 'Voltage-controlled switch; power versions use vertical trench structures for low Rds(on).', cat: 'power' },
    ZVS: { full: 'Zero-Voltage Switching', def: 'Turning a switch on when its drain-source voltage is ~0, eliminating Coss and overlap switching loss.', cat: 'power' },
    ESL: { full: 'Equivalent Series Inductance', def: 'Parasitic inductance of a capacitor/path; causes voltage spikes ΔV = L·dI/dt.', cat: 'power' },
    ESR: { full: 'Equivalent Series Resistance', def: 'Resistive loss term of a capacitor; adds ΔV = ESR·ΔI and damps resonances.', cat: 'power' },
    MLCC: { full: 'Multi-Layer Ceramic Capacitor', def: 'Low-ESL/ESR ceramic decoupling capacitor; capacitance drops with DC bias and temperature.', cat: 'power' },
    PDN: { full: 'Power Delivery Network', def: 'Everything between the regulator and the transistors: planes, vias, bumps and decoupling capacitors.', cat: 'power' },
    AVS: { full: 'Adaptive Voltage Scaling', def: 'Setting the supply voltage per die (process corner, temperature, workload) to the minimum that meets timing.', cat: 'power' },
    AVP: { full: 'Adaptive Voltage Positioning', def: 'Deliberate load-line: Vout = Vset − R_LL·Iout, halving the transient window and lowering power at high load.', cat: 'power' },
    TLVR: { full: 'Trans-Inductor Voltage Regulator', def: 'Multiphase buck whose inductors have coupled secondary windings in series, so all phases react to a load step at once.', cat: 'power' },
    COT: { full: 'Constant On-Time control', def: 'Ripple-based hysteretic-like control: fixed on-time pulse triggered when Vout falls below reference; very fast transient response.', cat: 'power' },
    PMBus: { full: 'Power Management Bus', def: 'SMBus-based command protocol for power converters: READ_VOUT/IOUT/TEMPERATURE, STATUS_WORD, VOUT_COMMAND, fault limits.', cat: 'control' },
    SMBus: { full: 'System Management Bus', def: 'I2C derivative with timeouts (35 ms), defined voltage levels and optional PEC (CRC-8).', cat: 'control' },
    I2C: { full: 'Inter-Integrated Circuit bus', def: 'Two-wire open-drain bus (SCL/SDA), 100 k–1 MHz, 7-bit addressing; ubiquitous for sensors, EEPROMs, optics management.', cat: 'control' },
    I3C: { full: 'Improved Inter-Integrated Circuit', def: 'MIPI successor to I2C: push-pull up to 12.5 MHz SDR, in-band interrupts and dynamic addressing.', cat: 'control' },
    MDIO: { full: 'Management Data Input/Output', def: 'IEEE 802.3 Clause 22/45 two-wire management bus for PHY/retimer registers.', cat: 'control' },
    SPI: { full: 'Serial Peripheral Interface', def: 'Four-wire synchronous bus (SCLK, MOSI, MISO, CS); quad-SPI NOR flash holds boot firmware.', cat: 'control' },
    JTAG: { full: 'Joint Test Action Group (IEEE 1149.1)', def: 'Test access port (TCK/TMS/TDI/TDO) for boundary scan, debug and CPLD/FPGA programming.', cat: 'control' },
    UART: { full: 'Universal Asynchronous Receiver-Transmitter', def: 'Serial console (typically 115200 baud) used for boot logs and recovery.', cat: 'control' },
    OOB: { full: 'Out-Of-Band management', def: 'Management network path independent of the data-plane ports (e.g. a dedicated 1 GbE RJ45 port).', cat: 'control' },
    BMC: { full: 'Baseboard Management Controller', def: 'Always-on service processor that powers, monitors, logs and updates the system independent of the host OS.', cat: 'control' },
    CPLD: { full: 'Complex Programmable Logic Device', def: 'Small non-volatile programmable logic doing power sequencing, resets, interrupts, LEDs and hard safety interlocks.', cat: 'control' },
    FPGA: { full: 'Field-Programmable Gate Array', def: 'Reconfigurable logic; sometimes replaces CPLDs for richer board management.', cat: 'control' },
    NOS: { full: 'Network Operating System', def: 'The switch OS running on the management CPU (Linux-based), hosting routing/fabric management and the ASIC SDK.', cat: 'control' },
    SDK: { full: 'Software Development Kit', def: 'Vendor driver/library stack that programs the switch ASIC (tables, SerDes, counters).', cat: 'control' },
    SAI: { full: 'Switch Abstraction Interface', def: 'OCP-standard API between a NOS (e.g. SONiC) and the vendor ASIC SDK.', cat: 'control' },
    DMA: { full: 'Direct Memory Access', def: 'Hardware moving data between device and host memory without CPU copies (descriptor rings).', cat: 'control' },
    'MSI-X': { full: 'Message-Signaled Interrupts (extended)', def: 'PCIe interrupt mechanism: a memory write to a vector address, up to 2048 vectors.', cat: 'control' },
    CMIS: { full: 'Common Management Interface Specification', def: 'OIF memory-map and state-machine standard for managing optical modules (pages, DDM, alarms, data-path control).', cat: 'control' },
    DDM: { full: 'Digital Diagnostic Monitoring', def: 'Module telemetry: temperature, supply voltage, laser bias, Tx/Rx optical power with alarm/warning thresholds (also DOM).', cat: 'sensing' },
    DOM: { full: 'Digital Optical Monitoring', def: 'Same as DDM: real-time optical/electrical diagnostics read via the management interface.', cat: 'sensing' },
    ELSFP: { full: 'External Laser Small Form-factor Pluggable', def: 'OIF implementation agreement for front-panel pluggable laser source modules feeding CPO engines.', cat: 'optics' },
    APC: { full: 'Automatic Power Control', def: 'Closed loop that adjusts laser bias current to hold monitor-photodiode (optical) power constant.', cat: 'sensing' },
    ACC: { full: 'Automatic Current Control', def: 'Laser driven at constant bias current; optical power then drifts with temperature and aging.', cat: 'sensing' },
    TEC: { full: 'Thermo-Electric Cooler', def: 'Peltier device pumping heat with current; holds a laser at a fixed temperature (and wavelength).', cat: 'thermal' },
    MPD: { full: 'Monitor Photodiode', def: 'Photodiode sampling a small fraction of optical power (back facet or tap) for control and telemetry.', cat: 'sensing' },
    NTC: { full: 'Negative Temperature Coefficient thermistor', def: 'Resistor whose resistance falls with temperature: R = R25·exp(B(1/T − 1/T25)).', cat: 'sensing' },
    PTAT: { full: 'Proportional To Absolute Temperature', def: 'Voltage/current ∝ T, e.g. ΔVbe = (kT/q)·ln N between two BJTs at different current densities.', cat: 'sensing' },
    CTAT: { full: 'Complementary To Absolute Temperature', def: 'Quantity falling with temperature, e.g. a diode Vbe (≈ −2 mV/K).', cat: 'sensing' },
    ADC: { full: 'Analog-to-Digital Converter', def: 'Samples and quantizes an analog signal; SAR and sigma-delta types dominate telemetry.', cat: 'sensing' },
    SAR: { full: 'Successive-Approximation Register ADC', def: 'Binary-search ADC: one comparator decision per bit using a capacitive DAC.', cat: 'sensing' },
    ENOB: { full: 'Effective Number Of Bits', def: 'ENOB = (SINAD − 1.76 dB)/6.02 — the resolution actually achieved including noise and distortion.', cat: 'sensing' },
    LSB: { full: 'Least Significant Bit', def: 'Smallest ADC step: LSB = Vref/2^N.', cat: 'sensing' },
    CDU: { full: 'Coolant Distribution Unit', def: 'Pumps, heat exchanger, filtration and controls that separate the IT coolant loop from facility water.', cat: 'thermal' },
    QD: { full: 'Quick Disconnect', def: 'Dripless blind-mate or hand-mate fluid coupling between chassis and rack manifold.', cat: 'thermal' },
    TIM: { full: 'Thermal Interface Material', def: 'Grease, gel, pad, phase-change, indium or liquid metal filling microscopic gaps between hot surfaces.', cat: 'thermal' },
    BLT: { full: 'Bond-Line Thickness', def: 'Final thickness of a TIM layer; R_TIM ≈ BLT/k + contact resistances.', cat: 'thermal' },
    PG25: { full: '25 % Propylene-Glycol coolant', def: 'Common liquid-cooling fluid: water + 25 % PG + inhibitors; cp ≈ 3.9–4.0 kJ/kg·K.', cat: 'thermal' },
    TCS: { full: 'Technology Cooling System', def: 'The secondary coolant loop between the CDU and the IT equipment.', cat: 'thermal' },
    FWS: { full: 'Facility Water System', def: 'Primary building water loop that takes heat from the CDU to chillers/dry coolers.', cat: 'thermal' },
    PID: { full: 'Proportional-Integral-Derivative controller', def: 'u = Kp·e + Ki·∫e dt + Kd·de/dt; the workhorse feedback law for fans, pumps, heaters, TECs.', cat: 'control' },
    Redfish: { full: 'DMTF Redfish', def: 'RESTful JSON/HTTPS management API for servers and switches (inventory, telemetry, power, firmware update).', cat: 'control' },
    IPMI: { full: 'Intelligent Platform Management Interface', def: 'Legacy BMC management protocol (sensors, SEL, power control), largely replaced by Redfish.', cat: 'control' },
    SEL: { full: 'System Event Log', def: 'Non-volatile BMC log of hardware events (thresholds crossed, faults, power cycles).', cat: 'control' },
    RoT: { full: 'Root of Trust', def: 'Immutable hardware/firmware that verifies the first mutable firmware, anchoring secure boot and attestation.', cat: 'control' },
    ISSU: { full: 'In-Service Software Upgrade', def: 'Upgrading software/firmware while the data plane keeps forwarding.', cat: 'control' },
    PGOOD: { full: 'Power Good', def: 'Open-drain status signal asserted by a regulator when its output is within regulation window.', cat: 'power' },
    OVP: { full: 'Over-Voltage Protection', def: 'Shuts down/crowbars a rail when it exceeds its limit (e.g. +10–15 %).', cat: 'power' },
    UVP: { full: 'Under-Voltage Protection', def: 'Flags/shuts down a rail when it drops below its limit.', cat: 'power' },
    SOA: { full: 'Safe Operating Area', def: 'Voltage–current–time envelope a MOSFET can survive in linear mode (critical for hot-swap FETs).', cat: 'power' },
    EIC: { full: 'Electronic Integrated Circuit', def: 'CMOS die (drivers, TIAs, control) stacked on the photonic IC in an optical engine.', cat: 'optics' },
    TIA: { full: 'Trans-Impedance Amplifier', def: 'Converts photodiode current to voltage.', cat: 'optics' },
    ELS: { full: 'External Laser Source', def: 'Front-panel serviceable laser module supplying CW light to co-packaged optical engines.', cat: 'optics' },
    PCIe: { full: 'PCI Express', def: 'Serial host interconnect; connects the management CPU to the switch ASIC.', cat: 'control' },
    RGMII: { full: 'Reduced Gigabit Media-Independent Interface', def: 'Parallel MAC-PHY interface for 1 GbE.', cat: 'control' },
    'NC-SI': { full: 'Network Controller Sideband Interface', def: 'DMTF interface letting a BMC share a host NIC for management traffic.', cat: 'control' },
    PEC: { full: 'Packet Error Code', def: 'SMBus CRC-8 appended to transactions.', cat: 'control' },
    RTD: { full: 'Resistance Temperature Detector', def: 'Platinum resistor thermometer (Pt100/Pt1000), very linear and stable.', cat: 'sensing' },
    BJT: { full: 'Bipolar Junction Transistor', def: 'Its base-emitter voltage is the basis of on-die temperature sensors and bandgap references.', cat: 'sensing' },
    DFB: { full: 'Distributed-FeedBack laser', def: 'Single-longitudinal-mode laser with a grating; wavelength drifts ≈0.08–0.1 nm/K.', cat: 'optics' },
    SFDR: { full: 'Spurious-Free Dynamic Range', def: 'Ratio between the signal and the largest spur in an ADC/DAC output spectrum.', cat: 'sensing' },
    SoC: { full: 'System on Chip', def: 'Single die integrating CPU cores, memory controllers and peripherals.', cat: 'control' },
    FRU: { full: 'Field-Replaceable Unit', def: 'Component replaceable on site (PSU, fan, laser module); FRU EEPROM holds its inventory data.', cat: 'mechanical' },
    UEFI: { full: 'Unified Extensible Firmware Interface', def: 'Host CPU boot firmware.', cat: 'control' },
    TPM: { full: 'Trusted Platform Module', def: 'Security chip storing keys and boot measurements for attestation.', cat: 'control' },
    THERMTRIP: { full: 'Thermal trip signal', def: 'Hard-wired over-temperature output of an ASIC/CPU that forces immediate power-off, independent of software.', cat: 'thermal' },
    DPS: { full: 'Data Path State machine', def: 'CMIS per-lane state machine (Deactivated → Init → Initialized → Activated).', cat: 'control' }
  });

  /* ------------------------------------------------------------------ helpers */
  function st(o) { let s = ''; for (const k in o) if (o[k] != null && o[k] !== '') s += k + ':' + o[k] + ';'; return s; }
  function P(pts) { return 'M' + pts.map(p => (+p[0]).toFixed(1) + ' ' + (+p[1]).toFixed(1)).join(' L'); }
  function polyline(pts) {
    const seg = []; let L = 0;
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
    L = L || 1;
    return {
      L,
      at(s) {
        s = ((s % L) + L) % L;
        for (let i = 0; i < seg.length; i++) {
          if (s <= seg[i] || i === seg.length - 1) {
            const f = seg[i] ? Math.min(1, s / seg[i]) : 0, a = pts[i], b = pts[i + 1];
            return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
          }
          s -= seg[i];
        }
        return pts[0];
      }
    };
  }
  // temperature → color (blue cold … red hot)
  function tcol(T, lo, hi) {
    const f = CPO.clamp((T - lo) / (hi - lo), 0, 1);
    return 'hsl(' + (215 - 215 * f).toFixed(0) + ',92%,' + (56 + 4 * f).toFixed(0) + '%)';
  }
  // complex arithmetic (for impedance / Bode)
  const cx = (re, im) => ({ re, im: im || 0 });
  const cadd = (a, b) => cx(a.re + b.re, a.im + b.im);
  const cmul = (a, b) => cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
  const cdiv = (a, b) => { const d = b.re * b.re + b.im * b.im; return cx((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); };
  const cpar = (a, b) => cdiv(cmul(a, b), cadd(a, b));
  const cabs = a => Math.hypot(a.re, a.im);
  const carg = a => Math.atan2(a.im, a.re);
  const fmtSI = (v, unit, d) => { const a = Math.abs(v); const p = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']]; for (const [m, s] of p) if (a >= m * 0.9995) return (v / m).toFixed(d == null ? 1 : d) + ' ' + s + unit; return v.toExponential(1) + ' ' + unit; };

  /* Scene kit: one per scene() call. Own <defs> with unique 'ptc-N-*' ids. */
  function kit(g, api) {
    const pre = 'ptc-' + (++UID) + '-';
    const C = d => (api && typeof api.color === 'function') ? api.color(d) : CPO.domainColor(d);
    const K = { g, C, pre };
    const mk = (tag, attrs, parent) => { const e = S(tag, attrs || {}); (parent || g).appendChild(e); return e; };
    K.mk = mk;
    const defs = mk('defs');
    defs.appendChild(S('filter', { id: pre + 'glow', x: '-60%', y: '-60%', width: '220%', height: '220%' },
      S('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: '2.4', result: 'b' }),
      S('feMerge', {}, S('feMergeNode', { in: 'b' }), S('feMergeNode', { in: 'SourceGraphic' }))));
    defs.appendChild(S('filter', { id: pre + 'blur', x: '-50%', y: '-50%', width: '200%', height: '200%' },
      S('feGaussianBlur', { stdDeviation: '8' })));
    defs.appendChild(S('linearGradient', { id: pre + 'panel', x1: 0, y1: 0, x2: 0, y2: 1 },
      S('stop', { offset: '0', style: 'stop-color:#18202c' }), S('stop', { offset: '1', style: 'stop-color:#0c1016' })));
    K.defs = defs;
    K.glow = 'url(#' + pre + 'glow)';
    K.blur = 'url(#' + pre + 'blur)';
    K.panel = 'url(#' + pre + 'panel)';
    K.grad = (name, stops, dir) => {
      const id = pre + name, v = dir === 'v';
      defs.appendChild(S('linearGradient', { id, x1: 0, y1: 0, x2: v ? 0 : 1, y2: v ? 1 : 0 },
        stops.map(s => S('stop', { offset: s[0], style: 'stop-color:' + s[1] + (s[2] != null ? ';stop-opacity:' + s[2] : '') }))));
      return 'url(#' + id + ')';
    };
    const marks = {};
    K.arrow = color => {
      if (marks[color]) return marks[color];
      const id = pre + 'arw' + Object.keys(marks).length;
      defs.appendChild(S('marker', { id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' },
        S('path', { d: 'M0 0 L10 5 L0 10 z', style: 'fill:' + color })));
      return (marks[color] = 'url(#' + id + ')');
    };
    // animation ticker (single api.loop per scene)
    const ticks = []; let running = false; const sp = RM ? 0.3 : 1;
    const runner = (dt, t) => {
      dt *= sp;
      for (let i = 0; i < ticks.length; i++) {
        try { ticks[i](dt, t * sp); } catch (e) { console.error('[nodes-ptc]', e); ticks.splice(i--, 1); }
      }
    };
    K.tick = fn => {
      ticks.push(fn);
      if (!running) { running = true; if (api && typeof api.loop === 'function') api.loop(runner); else CPO.loop(runner); }
    };
    K.layer = (d, attrs) => mk('g', Object.assign(d ? { 'data-domain': d } : {}, attrs || {}));
    K.text = (p, x, y, s, o) => {
      o = o || {};
      const e = mk('text', {
        x, y, 'text-anchor': o.anchor || 'start', transform: o.rot ? 'rotate(' + o.rot + ' ' + x + ' ' + y + ')' : null,
        style: st({ fill: o.fill || (o.d ? C(o.d) : 'var(--text)'), 'font-size': (o.size || 13) + 'px', 'font-weight': o.weight, 'font-family': o.mono ? 'var(--mono)' : null, opacity: o.op, 'letter-spacing': o.ls, 'pointer-events': 'none' })
      }, p);
      e.textContent = s; return e;
    };
    K.lines = (p, x, y, arr, o) => { o = o || {}; const lh = o.lh || (o.size || 12) * 1.45; return arr.map((s, i) => K.text(p, x, y + i * lh, s, o)); };
    K.box = (p, x, y, w, h, o) => {
      o = o || {};
      const grp = mk('g', o.d ? { 'data-domain': o.d } : {}, p);
      const col = o.stroke || (o.d ? C(o.d) : 'var(--line)');
      grp.rect = mk('rect', { x, y, width: w, height: h, rx: o.rx != null ? o.rx : 8, filter: o.glow ? K.glow : null,
        style: st({ fill: o.fill || K.panel, stroke: col, 'stroke-width': o.sw || 1.5, 'stroke-dasharray': o.dash, opacity: o.op }) }, grp);
      const cxp = x + w / 2;
      if (o.label) K.text(grp, o.center ? cxp : x + 10, o.center ? y + h / 2 + (o.sub ? -2 : 5) : y + 19, o.label, { anchor: o.center ? 'middle' : 'start', size: o.ls || 14, weight: 600, fill: o.lc || 'var(--text)' });
      if (o.sub) K.text(grp, o.center ? cxp : x + 10, o.center ? y + h / 2 + 14 : y + 35, o.sub, { anchor: o.center ? 'middle' : 'start', size: o.ss || 11.5, fill: 'var(--muted)' });
      return grp;
    };
    K.chip = (p, x, y, w, h, o) => {
      o = o || {};
      const grp = K.box(p, x, y, w, h, o); const col = o.stroke || C(o.d || 'control');
      const np = o.pins || Math.max(3, Math.floor(w / 16));
      for (let i = 0; i < np; i++) {
        const px = x + (i + 0.5) * w / np;
        mk('line', { x1: px, y1: y - 5, x2: px, y2: y, style: st({ stroke: col, 'stroke-width': 2, opacity: 0.55 }) }, grp);
        mk('line', { x1: px, y1: y + h, x2: px, y2: y + h + 5, style: st({ stroke: col, 'stroke-width': 2, opacity: 0.55 }) }, grp);
      }
      return grp;
    };
    K.wire = (p, pts, o) => {
      o = o || {}; const col = o.color || C(o.d || 'power');
      return mk('path', { d: P(pts), 'data-domain': o.d || null, filter: o.glow ? K.glow : null, 'marker-end': o.arrow ? K.arrow(col) : null,
        style: st({ fill: 'none', stroke: col, 'stroke-width': o.w || 2, opacity: o.op != null ? o.op : 0.55, 'stroke-dasharray': o.dash, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }) }, p);
    };
    // particles flowing along a polyline. F.speed (px/s), F.color, F.on, F.colorAt(frac,i) mutable.
    K.flow = (p, pts, o) => {
      o = o || {};
      const pl = polyline(pts), n = o.n || Math.max(3, Math.round(pl.L / 38));
      const grp = mk('g', { 'data-domain': o.d || null, filter: o.glow === false ? null : K.glow }, p);
      const F = { speed: o.speed != null ? o.speed : 60, color: o.color || C(o.d || 'power'), r: o.r || 3, on: o.on !== false, colorAt: o.colorAt || null, op: o.op != null ? o.op : 1, s: Math.random() * pl.L, grp, L: pl.L };
      const dots = []; for (let i = 0; i < n; i++) dots.push(mk('circle', { r: F.r, style: 'fill:' + F.color }, grp));
      K.tick(dt => {
        grp.style.display = F.on ? '' : 'none'; if (!F.on) return;
        grp.style.opacity = F.op;
        F.s += F.speed * dt;
        for (let i = 0; i < n; i++) {
          const s = F.s + i * pl.L / n, q = pl.at(s), d = dots[i];
          d.setAttribute('cx', q[0].toFixed(1)); d.setAttribute('cy', q[1].toFixed(1)); d.setAttribute('r', F.r);
          d.style.fill = F.colorAt ? F.colorAt((((s % pl.L) + pl.L) % pl.L) / pl.L, i) : F.color;
        }
      });
      return F;
    };
    // mini plot with traces; values mapped linearly between min..max (pass log10 values for log axes)
    K.plot = (p, x, y, w, h, o) => {
      o = o || {};
      const grp = mk('g', { 'data-domain': o.d || null }, p);
      mk('rect', { x, y, width: w, height: h, rx: 6, style: 'fill:#05080b;stroke:var(--line);stroke-width:1' }, grp);
      const gl = o.grid != null ? o.grid : 4, vg = o.vgrid != null ? o.vgrid : 6;
      for (let i = 1; i < gl; i++) mk('line', { x1: x, x2: x + w, y1: y + i * h / gl, y2: y + i * h / gl, style: 'stroke:var(--line);stroke-width:.6;opacity:.6' }, grp);
      for (let i = 1; i < vg; i++) mk('line', { y1: y, y2: y + h, x1: x + i * w / vg, x2: x + i * w / vg, style: 'stroke:var(--line);stroke-width:.6;opacity:.35' }, grp);
      if (o.label) K.text(grp, x + 2, y - 7, o.label, { size: 11.5, fill: 'var(--muted)' });
      if (o.xl) K.text(grp, x + w, y + h + 14, o.xl, { size: 10.5, fill: 'var(--muted)', anchor: 'end' });
      if (o.yl) K.text(grp, x - 6, y + 10, o.yl, { size: 10.5, fill: 'var(--muted)', anchor: 'end' });
      const Pl = { grp, x, y, w, h, min: o.min != null ? o.min : 0, max: o.max != null ? o.max : 1 };
      Pl.X = f => x + CPO.clamp(f, 0, 1) * w;
      Pl.Y = v => y + h - CPO.clamp((v - Pl.min) / (Pl.max - Pl.min), -0.01, 1.01) * h;
      Pl.trace = to => {
        to = to || {};
        const col = to.color || (to.d ? C(to.d) : C(o.d || 'power'));
        const el = mk('path', { filter: to.glow ? K.glow : null, style: st({ fill: 'none', stroke: col, 'stroke-width': to.w || 1.8, opacity: to.op, 'stroke-dasharray': to.dash, 'stroke-linejoin': 'round' }) }, grp);
        const buf = [], N = to.n || o.n || 160;
        const T = {
          el, buf,
          setXY(pts) { if (pts.length) el.setAttribute('d', P(pts.map(q => [Pl.X(q[0]), Pl.Y(q[1])]))); },
          set(arr) { const m = arr.length; T.setXY(arr.map((v, i) => [m > 1 ? i / (m - 1) : 0, v])); },
          push(v) { buf.push(v); if (buf.length > N) buf.shift(); T.setXY(buf.map((vv, i) => [i / (N - 1), vv])); }
        };
        return T;
      };
      Pl.hline = (v, to) => {
        to = to || {}; const yy = Pl.Y(v);
        mk('line', { x1: x, x2: x + w, y1: yy, y2: yy, style: st({ stroke: to.color || 'var(--bad)', 'stroke-width': 1.2, 'stroke-dasharray': to.dash || '5 4', opacity: 0.85 }) }, grp);
        if (to.label) K.text(grp, x + w - 4, yy - 4, to.label, { size: 10.5, anchor: 'end', fill: to.color || 'var(--bad)' });
      };
      Pl.cursor = to => {
        to = to || {};
        const ln = mk('line', { y1: y, y2: y + h, x1: x, x2: x, style: st({ stroke: to.color || 'var(--text)', 'stroke-width': 1, opacity: 0.5 }) }, grp);
        return { el: ln, set(f) { const xx = Pl.X(f); ln.setAttribute('x1', xx); ln.setAttribute('x2', xx); } };
      };
      Pl.dot = to => {
        to = to || {};
        const c = mk('circle', { r: to.r || 4.5, filter: K.glow, style: 'fill:' + (to.color || C(o.d || 'power')) }, grp);
        return { el: c, set(f, v) { c.setAttribute('cx', Pl.X(f)); c.setAttribute('cy', Pl.Y(v)); } };
      };
      const main = Pl.trace(o);
      Pl.main = main; Pl.push = main.push; Pl.set = main.set; Pl.setXY = main.setXY;
      return Pl;
    };
    K.readout = (p, x, y, label, o) => {
      o = o || {};
      K.text(p, x, y, label, { size: 11, fill: 'var(--muted)' });
      const v = K.text(p, x, y + 20, o.init || '—', { size: o.size || 17, mono: true, weight: 600, fill: o.color || C(o.d || 'power') });
      return { el: v, set(s) { v.textContent = s; }, color(c) { v.style.fill = c; } };
    };
    K.button = (p, x, y, w, label, onclick, o) => {
      o = o || {};
      const grp = mk('g', { style: 'cursor:pointer', class: 'ptc-btn' }, p);
      const r = mk('rect', { x, y, width: w, height: 22, rx: 11 }, grp);
      K.text(grp, x + w / 2, y + 15, label, { anchor: 'middle', size: 11.5 });
      const stop = e => e.stopPropagation();
      grp.addEventListener('pointerdown', stop); grp.addEventListener('mousedown', stop);
      grp.addEventListener('click', e => { e.stopPropagation(); onclick(); });
      const B = { grp, set(a) { r.setAttribute('style', a ? 'fill:rgba(118,185,0,.25);stroke:var(--accent);stroke-width:1.3' : 'fill:var(--panel2);stroke:var(--line);stroke-width:1'); } };
      B.set(!!o.active); return B;
    };
    K.radio = (p, x, y, labels, w, onSel, init) => {
      const bs = labels.map((l, i) => K.button(p, x + i * (w + 6), y, w, l, () => { bs.forEach((b, j) => b.set(j === i)); onSel(i); }, { active: i === (init || 0) }));
      return bs;
    };
    K.bar = (p, x, y, w, h, o) => {
      o = o || {};
      mk('rect', { x, y, width: w, height: h, rx: 3, style: 'fill:#05080b;stroke:var(--line)' }, p);
      const f = mk('rect', { x, y, width: 0, height: h, rx: 3, style: 'fill:' + (o.color || C(o.d || 'power')) }, p);
      return { set(fr, col) { f.setAttribute('width', (CPO.clamp(fr, 0, 1) * w).toFixed(1)); if (col) f.style.fill = col; } };
    };
    K.pulse = (el, period, lo, hi, ph) => K.tick((dt, t) => { el.style.opacity = lo + (hi - lo) * (0.5 + 0.5 * Math.sin(TAU * (t / period + (ph || 0)))); });
    K.coil = (p, x, y, len, o) => {
      o = o || {}; const n = o.n || 5, r = len / n / 2; let d = 'M' + x + ' ' + y;
      for (let i = 0; i < n; i++) d += ' a' + r + ' ' + r + ' 0 0 1 ' + (2 * r) + ' 0';
      return mk('path', { d, transform: o.vert ? 'rotate(90 ' + x + ' ' + y + ')' : null, style: st({ fill: 'none', stroke: o.color || C(o.d || 'power'), 'stroke-width': o.w || 2.2 }) }, p);
    };
    K.cap = (p, x, y, o) => { // vertical capacitor from y (top lead) down to ground
      o = o || {}; const col = o.color || C(o.d || 'power'), wd = o.wd || 18;
      const grp = mk('g', {}, p);
      mk('line', { x1: x, y1: y, x2: x, y2: y + 14, style: st({ stroke: col, 'stroke-width': 1.6 }) }, grp);
      mk('line', { x1: x - wd / 2, y1: y + 14, x2: x + wd / 2, y2: y + 14, style: st({ stroke: col, 'stroke-width': 3 }) }, grp);
      mk('line', { x1: x - wd / 2, y1: y + 21, x2: x + wd / 2, y2: y + 21, style: st({ stroke: col, 'stroke-width': 3 }) }, grp);
      mk('line', { x1: x, y1: y + 21, x2: x, y2: y + (o.len || 36), style: st({ stroke: col, 'stroke-width': 1.6 }) }, grp);
      return grp;
    };
    K.sensor = (p, x, y, o) => {
      o = o || {}; const grp = mk('g', { 'data-domain': 'sensing' }, p);
      const ring = mk('circle', { cx: x, cy: y, r: 9, style: 'fill:none;stroke:var(--sense);stroke-width:1.2' }, grp);
      mk('circle', { cx: x, cy: y, r: 4, filter: K.glow, style: 'fill:var(--sense)' }, grp);
      if (o.label) K.text(grp, x + (o.dx != null ? o.dx : 12), y + (o.dy != null ? o.dy : 4), o.label, { size: o.size || 11, fill: 'var(--sense)', anchor: o.anchor });
      const ph = Math.random();
      K.tick((dt, t) => { const f = ((t * 0.7 + ph) % 1); ring.setAttribute('r', (5 + 12 * f).toFixed(1)); ring.style.opacity = (1 - f).toFixed(2); });
      return grp;
    };
    K.cap0 = s => K.text(g, 16, 590, s, { size: 11.5, fill: 'var(--muted)' });
    return K;
  }

  const NODES = [];
  const add = n => NODES.push(n);

  /* ================================================================== POWER DELIVERY */
  add({
    id: 'power-delivery', parent: 'switch-chassis', domain: 'power', level: 2,
    title: 'Power Delivery', subtitle: '54 V busbar → IBC → multiphase VRMs → ~0.75 V at up to >1 kA',
    summary: 'The power tree takes 48–54 V DC from the rack busbar and steps it down — through a hot-swap/eFuse, an intermediate bus converter and many point-of-load regulators — to the sub-1 V, kilo-ampere ASIC core rail plus dozens of quieter rails for SerDes, optical-engine electronics, micro-ring heaters and the external laser sources. Its job is to deliver every rail within a few-percent window, through microsecond load steps, at >85 % end-to-end efficiency, in the right order, while reporting every volt, amp and degree to the management plane.',
    what: `<p><b>Why 48–54 V into the chassis?</b> Distribution loss scales as I²R. Carrying 2 kW at 12 V needs 167 A; at 54 V only 37 A — <b>~20× lower conduction loss</b> in the same copper, and much smaller connectors and busbar clips. OCP ORv3-style racks therefore distribute 48–54 V ${CPO.badge('typ')} from power shelves (with battery backup) to every tray.</p>
<p><b>The conversion chain</b> ${CPO.badge('typ')}:</p>
<ol>
<li><b>Input protection</b>: busbar clip → OR-ing "ideal diode" FET → hot-swap FET/eFuse limiting inrush and over-current.</li>
<li><b>IBC</b>: a fixed-ratio (e.g. 4:1 LLC/DCX, or switched-capacitor/hybrid) or regulated converter producing a ~12 V (10–14 V) intermediate bus at 97–98.5 % efficiency. Some designs skip it and convert 48 V → Vcore directly (factorized power, 48 V-input multiphase stages).</li>
<li><b>Multiphase VRMs</b>: 12 V → 0.7–0.9 V ASIC core with N interleaved phases (tens of phases for ~1 kA), each a DrMOS/smart power stage + inductor, under a digital controller with AVS and load-line.</li>
<li><b>Auxiliary PoLs</b>: SerDes analog/PLL rails (low-noise, sometimes LDO-filtered), I/O and always-on rails — a large switch ASIC typically needs 10–30 distinct rails.</li>
<li><b>Optical-engine rails</b>: EIC digital/analog (≈0.75–1.8 V), modulator driver supplies, TIA, micro-ring heater DAC rails, photodiode bias; and for the <b>External Laser Sources</b> (front-panel modules) laser-diode bias currents and TEC drive.</li>
</ol>
<p><b>Power scale (estimate).</b> A 102.4 Tb/s switch with optics at ~5 pJ/b ${CPO.badge('typ')} spends ≈0.5 kW in optics (vs ≈1.5–2 kW at 15–20 pJ/b with pluggables) — which is why CPO's 3.5× power-efficiency claim ${CPO.badge('nv')} matters at the power-tree level: fewer watts → fewer phases, less copper, less coolant flow. The ASIC core itself draws hundreds of amps to >1 kA ${CPO.badge('est')} at ~0.75 V.</p>
<p><b>Sequencing & telemetry.</b> A CPLD enables rails in a defined order (standby → core → SerDes/IO → optics → lasers last) and checks PGOOD at each step. Every converter reports V/I/T/status over PMBus to the BMC, which logs, alarms, and exposes it via Redfish.</p>`,
    needs: ['Low-impedance path from busbar to die: target impedance tens of µΩ across DC → hundreds of MHz',
      'Stable 54 V input with hold-up and redundant PSUs (N+1) and inrush control on hot-plug',
      'High efficiency at every stage (heat in VRMs must also be liquid/air cooled)',
      'Fast transient response: hundreds of amps in < 1 µs as traffic bursts or ASIC blocks wake',
      'Clean, isolated low-noise rails for SerDes PLLs, TIAs and ring heaters (noise → jitter, ring detuning)',
      'Correct power-on / power-off ordering and laser-safe enable last',
      'Complete telemetry & fault logging over PMBus'],
    interfaces: [
      { with: 'Rack busbar / power shelf', type: 'power', detail: '48–54 V DC, tens of amps per switch tray; hot-plug clip' },
      { with: 'switch-package (ASIC + OEs)', type: 'power', detail: 'Vcore ≈0.75 V via BGA balls + package planes; many auxiliary rails' },
      { with: 'external-laser', type: 'power', detail: 'Laser-diode bias (100s of mA per laser) and TEC drive in each ELS module' },
      { with: 'CPLD / BMC', type: 'mgmt', detail: 'Enable/PGOOD GPIOs, PMBus/SMBus telemetry, ALERT# interrupts, fault logs' },
      { with: 'thermal-system', type: 'thermal', detail: 'Conversion losses (several % of total power) dissipated in VRM power stages and inductors' }],
    kpis: [
      { name: 'Bus voltage', value: '48–54 V DC', tag: 'typ', note: 'ORv3-style busbar' },
      { name: 'Core rail', value: '~0.7–0.9 V', tag: 'typ', note: 'AVS-trimmed per die' },
      { name: 'Core current', value: 'hundreds A → >1 kA', tag: 'est', note: 'large switch ASIC' },
      { name: 'IBC efficiency', value: '97–98.5 %', tag: 'typ' },
      { name: 'VRM efficiency', value: '88–92 %', tag: 'typ', note: '12 V → 0.75 V at load' },
      { name: 'End-to-end (busbar→die)', value: '~85–89 %', tag: 'est' },
      { name: 'Core regulation window', value: '±2–3 %', tag: 'typ', note: '≈ ±15–25 mV' },
      { name: 'Optics power @102.4 T', value: '≈0.5 kW @5 pJ/b', tag: 'est', note: 'vs ≈1.5–2 kW pluggable' }],
    physics: `<div class="eq">P_loss,dist = (P/V)²·R      2 kW over 1 mΩ:  12 V → 27.8 W,  54 V → 1.37 W
η_chain = η_hotswap·η_IBC·η_VRM ≈ 0.998 × 0.978 × 0.90 ≈ 0.88
Z_target = ΔV_allowed / ΔI_step = (0.75 V × 3 %) / 500 A ≈ 45 µΩ
P_optics = E_bit × throughput = 5 pJ/b × 102.4 Tb/s ≈ 512 W</div>
<p>The last few centimetres matter most: at 1 kA, 50 µΩ of lateral board resistance already burns 50 W and drops 50 mV — more than the whole regulation window. That is why VRMs crowd around (or under) the package and why vertical power delivery is an industry trend ${CPO.badge('typ')}.</p>`,
    failures: ['PSU loss → busbar sag → redundant PSU / BBU holds up; OR-ing FET blocks back-feed',
      'Hot-plug inrush exceeds hot-swap FET SOA → FET fails short → eFuse/upstream fuse; dv/dt soft-start',
      'VRM phase failure (DrMOS short) → OCP trips, rail shuts → whole ASIC down; phase-shedding/redundant phases rare at PoL',
      'Load-step droop below Vmin → timing failures/CRC errors → better PDN, faster loop, AVP',
      'Noisy OE/SerDes rails → jitter, ring-heater noise → BER rise; LDO post-regulation, ferrites, separate planes',
      'Wrong sequencing → latch-up, laser on before engine bias ready → CPLD state machine with PGOOD checks',
      'Capacitor aging / MLCC cracks → impedance peaks; telemetry trending'],
    monitoring: ['PMBus READ_VIN/VOUT/IOUT/POUT/TEMPERATURE per converter, STATUS_WORD faults → BMC',
      'Remote-sense differential feedback from die to VRM controller (vrm-control-loop)',
      'Power-stage IMON (current) and TMON (temperature) per phase',
      'PGOOD chain into CPLD; ALERT# interrupts; black-box fault logging',
      'Power capping: BMC/NOS can throttle if PSU budget exceeded'],
    hotspots: [
      { target: 'busbar-psu', x: 14, y: 140, w: 262, h: 190, label: 'Busbar, PSU & hot-swap' },
      { target: 'ibc', x: 290, y: 180, w: 135, h: 110, label: 'Intermediate bus converter' },
      { target: 'vrm', x: 474, y: 54, w: 172, h: 180, label: 'Multiphase Vcore VRM' },
      { target: 'vrm-control-loop', x: 474, y: 238, w: 172, h: 40, label: 'VRM control loop' },
      { target: 'pdn', x: 652, y: 70, w: 100, h: 160, label: 'PDN & decoupling' },
      { target: 'asic-die', x: 760, y: 66, w: 222, h: 158, label: 'ASIC core load' },
      { target: 'optical-engine', x: 760, y: 362, w: 222, h: 66, label: 'Optical-engine rails' },
      { target: 'external-laser', x: 760, y: 437, w: 222, h: 62, label: 'ELS laser rails' },
      { target: 'power-sequencing', x: 14, y: 516, w: 972, h: 58, label: 'Sequencing & PMBus telemetry' }],
    scene(g, api) {
      const K = kit(g, api), pw = K.layer('power'), ct = K.layer('control'), se = K.layer('sensing');
      const cu = K.grad('cu', [[0, '#b87333'], [0.5, '#f0b27a'], [1, '#8a5523']], 'h');
      // busbar
      K.box(pw, 20, 150, 120, 170, { d: 'power', label: 'Rack busbar', sub: '48–54 V DC' });
      K.mk('rect', { x: 45, y: 196, width: 14, height: 112, rx: 3, style: 'fill:' + cu }, pw);
      K.mk('rect', { x: 75, y: 196, width: 14, height: 112, rx: 3, style: 'fill:' + cu + ';opacity:.7' }, pw);
      K.text(pw, 52, 318, '+', { anchor: 'middle', size: 12 }); K.text(pw, 82, 318, '−', { anchor: 'middle', size: 12 });
      K.box(pw, 165, 195, 105, 80, { d: 'power', label: 'Hot-swap', sub: 'eFuse · OR-ing FET' });
      K.box(pw, 295, 185, 125, 100, { d: 'power', label: 'IBC', sub: '54 V → 12 V' });
      K.text(pw, 305, 268, '≈97–98.5 %', { size: 11, fill: 'var(--good)', mono: true });
      // 12 V bus
      K.wire(pw, [[450, 70], [450, 470]], { w: 6, op: 0.7 }); K.text(pw, 444, 64, '12 V bus', { size: 11, anchor: 'middle', fill: 'var(--power)' });
      // VRMs
      const vr = K.box(pw, 480, 60, 160, 170, { d: 'power', label: 'Vcore VRM', sub: 'multiphase ×N (DrMOS + L)' });
      const phases = [];
      for (let i = 0; i < 6; i++) { const r = K.mk('rect', { x: 492 + i * 24, y: 110, width: 18, height: 90, rx: 3, style: 'fill:#1d2636;stroke:var(--power);stroke-width:1' }, vr); phases.push(r); }
      K.text(vr, 560, 220, 'interleaved 360°/N', { size: 10.5, anchor: 'middle', fill: 'var(--muted)' });
      K.box(ct, 480, 242, 160, 32, { d: 'control', label: 'Digital controller · AVS', ls: 12 });
      K.box(pw, 480, 290, 160, 60, { d: 'power', label: 'SerDes / analog PoL', sub: '0.75–1.2 V low-noise' });
      K.box(pw, 480, 365, 160, 60, { d: 'power', label: 'OE rails PoL', sub: 'EIC · driver · TIA · heaters' });
      K.box(pw, 480, 440, 160, 55, { d: 'power', label: 'ELS laser rails', sub: 'LD bias · TEC ±' });
      // PDN decaps
      K.box(pw, 655, 75, 92, 150, { d: 'power', label: 'PDN', sub: 'decaps', dash: '4 3', fill: 'rgba(0,0,0,.2)' });
      for (let i = 0; i < 3; i++) K.cap(pw, 680 + i * 22, 150, { len: 40, wd: 14 });
      // loads
      const asic = K.box(pw, 760, 70, 220, 150, { d: 'power', label: 'Switch ASIC core', sub: '~0.75 V · hundreds A → >1 kA', stroke: 'var(--accent)' });
      for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) K.mk('rect', { x: 790 + i * 34, y: 130 + j * 26, width: 28, height: 20, rx: 2, style: 'fill:rgba(118,185,0,.12);stroke:rgba(118,185,0,.5)' }, asic);
      K.box(pw, 760, 290, 220, 60, { d: 'power', label: 'SerDes / PLL / IO rails', sub: '200G-class SerDes analog' });
      K.box(pw, 760, 365, 220, 60, { d: 'power', label: 'Optical engines (EIC on PIC)', sub: 'drivers · TIAs · ring heaters' });
      K.box(pw, 760, 440, 220, 55, { d: 'power', label: 'External laser sources', sub: 'front-panel ELS modules' });
      // wires + flows
      const w54 = [[140, 235], [165, 235]], w54b = [[270, 235], [295, 235]], w12 = [[420, 235], [450, 235]];
      [w54, w54b, w12].forEach(p => K.wire(pw, p, { w: 4 }));
      const f54 = K.flow(pw, [[60, 200], [60, 235], [165, 235], [270, 235], [295, 235]], { n: 7, r: 3.2 });
      const f12 = K.flow(pw, [[420, 235], [450, 235], [450, 145], [480, 145]], { n: 6, r: 4 });
      const fcore = K.flow(pw, [[640, 145], [760, 145]], { n: 9, r: 5.5 });
      K.wire(pw, [[640, 145], [760, 145]], { w: 11, op: 0.35 });
      const rails = [[320, 'SerDes'], [395, 'OE'], [467, 'ELS']].map(([y]) => {
        K.wire(pw, [[450, y], [480, y]], { w: 3 }); K.wire(pw, [[640, y], [760, y]], { w: 3 });
        return [K.flow(pw, [[450, y], [480, y]], { n: 2, r: 2.6, speed: 30 }), K.flow(pw, [[640, y], [760, y]], { n: 5, r: 2.6, speed: 40 })];
      });
      // sequencing / telemetry bar
      K.box(ct, 20, 520, 960, 50, { d: 'control', label: 'CPLD power sequencing · PMBus/SMBus telemetry → BMC → Redfish', sub: 'EN / PGOOD / ALERT# · READ_VOUT · READ_IOUT · STATUS_WORD' });
      [[217, 275], [357, 285], [560, 274], [560, 350], [560, 425], [560, 495]].forEach(([x, y]) => {
        K.wire(ct, [[x, 520], [x, y]], { d: 'control', dash: '3 4', w: 1.3, op: 0.6 });
        K.flow(ct, [[x, 520], [x, y]], { d: 'control', n: 1, r: 2.5, speed: 50 });
        K.flow(ct, [[x, y], [x, 520]], { d: 'sensing', n: 1, r: 2.2, speed: 38 });
      });
      // live readouts & droop plot
      const rIn = K.readout(se, 20, 40, 'Busbar input (est.)', { d: 'power' });
      const rI54 = K.readout(se, 150, 40, 'I @ 54 V', { d: 'power' });
      const rIc = K.readout(se, 20, 90, 'ASIC core current', { d: 'sensing' });
      const rVc = K.readout(se, 150, 90, 'Vcore @ die', { d: 'sensing' });
      const pl = K.plot(se, 165, 340, 265, 150, { d: 'sensing', min: 690, max: 800, label: 'Vcore at die (mV) during traffic bursts', n: 220, color: 'var(--power)', glow: true });
      pl.hline(735, { label: 'Vmin', color: 'var(--bad)' });
      const ipl = pl.trace({ color: 'var(--sense)', op: 0.65, w: 1.3 });
      K.text(se, 172, 484, 'pink: I_core (300–1000 A)', { size: 10, fill: 'var(--sense)' });
      let I = 600, Itgt = 600, tn = 0, dev = 0, dvel = 0, Vset = 785;
      K.tick((dt, t) => {
        tn -= dt;
        if (tn <= 0) { Itgt = 300 + Math.random() * 700; tn = 0.7 + Math.random() * 1.2; }
        const dI = Itgt - I; I = Itgt;
        dev -= dI * 0.055;
        // damped 2nd-order recovery toward 0 (slow-motion of a µs event)
        const w0 = 22, z = 0.35; const acc = -w0 * w0 * dev - 2 * z * w0 * dvel; dvel += acc * dt; dev += dvel * dt;
        const V = Vset - 0.03 * I + dev + CPO.randn() * 0.6;
        pl.push(V); ipl.push(690 + (I - 300) / 700 * 100);
        const Pcore = V / 1000 * I, Pin = (Pcore / 0.9 + 450) / 0.978 / 0.998;
        rIn.set((Pin / 1000).toFixed(2) + ' kW'); rI54.set((Pin / 54).toFixed(1) + ' A');
        rIc.set(I.toFixed(0) + ' A'); rVc.set(V.toFixed(0) + ' mV'); rVc.color(V < 735 ? 'var(--bad)' : 'var(--sense)');
        const k = I / 1000;
        fcore.speed = 40 + 140 * k; fcore.r = 3.5 + 3 * k; f12.speed = 30 + 70 * k; f54.speed = 18 + 30 * k;
        phases.forEach((r, i) => { const on = ((t * 3 + i / 6) % 1) < 0.18; r.style.fill = on ? 'rgba(250,204,21,.55)' : '#1d2636'; });
        rails.forEach(([a, b], i) => { a.speed = 22 + 6 * Math.sin(t + i); b.speed = 34 + 8 * Math.sin(t * 1.3 + i); });
      });
      K.cap0('Dot speed ∝ current. Click a block to zoom in. Numbers are typical/estimated, not NVIDIA specs.');
    }
  });

  add({
    id: 'busbar-psu', parent: 'power-delivery', domain: 'power', level: 3,
    title: 'Busbar, PSUs & Hot-Swap Input', subtitle: '48–54 V rack DC, N+1 power shelves, OR-ing and inrush control',
    summary: 'Power shelves rectify AC (PFC + isolated LLC) to a 48–54 V busbar that runs the height of the rack; battery backup units float on the same bus. Each switch tray clips onto the busbar through an OR-ing ideal-diode FET (blocks back-feed between redundant feeds) and a hot-swap/eFuse controller that softly charges the input capacitance and trips on over-current within microseconds.',
    what: `<p><b>Power shelf</b> ${CPO.badge('typ')}: 3-phase AC → bridgeless/totem-pole PFC (≈400 V DC link, PF > 0.99) → isolated LLC → 54 V. Titanium-class PSUs reach ≈97–97.5 % peak. N+1 (or N+N across two feeds) redundancy; BBUs (Li-ion) hold the bus for seconds–minutes during AC loss.</p>
<p><b>Busbar</b>: copper bars with milliohm-scale resistance; the tray clip makes contact on insertion. Even 0.2 mΩ at 40 A is 0.32 W per contact and 8 mV drop — fine at 54 V, catastrophic at 12 V-class currents.</p>
<p><b>OR-ing FET</b>: an N-MOSFET driven as an "ideal diode" (forward drop ≈ I·Rds(on), e.g. 40 A × 1 mΩ = 40 mV instead of ~0.5 V for a Schottky) that turns off in < 1 µs on reverse current, so a shorted feed cannot drag down the healthy one.</p>
<p><b>Hot-swap / eFuse</b>: a series MOSFET + sense resistor + controller. On plug-in it ramps the gate so the output rises at a controlled dV/dt; the inrush current I = C_in·dV/dt is held well below the trip level. The FET is in its linear region during the ramp, dissipating up to V·I — so the ramp must stay inside the FET's SOA. Afterwards the FET is fully enhanced (sub-mΩ) and the controller watches for over-current (fast trip ~1–2× limit within µs, slower circuit-breaker timer), UV/OV, and reports V/I/P via PMBus.</p>`,
    needs: ['Low-resistance clip contact and adequate busbar cross-section', 'Hot-swap FET with enough SOA for the input-capacitor charge',
      'Fast reverse-current blocking for redundancy', 'Input filtering (EMI, transients from neighbouring loads)', 'Telemetry on input power for rack power capping'],
    interfaces: [{ with: 'Power shelf / BBU', type: 'power', detail: '48–54 V busbar' }, { with: 'IBC', type: 'power', detail: 'Protected 54 V into the bus converter' },
      { with: 'CPLD / BMC', type: 'mgmt', detail: 'Hot-swap enable, PGOOD, FAULT#, PMBus READ_EIN/READ_PIN' }],
    kpis: [{ name: 'Bus voltage', value: '48–54 V', tag: 'typ' }, { name: 'PSU peak efficiency', value: '≈96–97.5 %', tag: 'typ', note: 'Titanium class' },
      { name: 'OR-ing drop', value: 'tens of mV', tag: 'typ' }, { name: 'Inrush dV/dt', value: '~0.5–5 V/ms', tag: 'typ' }, { name: 'OC fast-trip', value: '< 1–5 µs', tag: 'typ' }],
    physics: `<div class="eq">I_inrush = C_in · dV/dt        e.g. 2 mF × 2 V/ms = 4 A
E_FET(ramp) ≈ ½ · C_in · V²   (energy the FET burns while charging C_in)  2 mF·54² /2 ≈ 2.9 J
P_cond = I² · (R_clip + R_oring + R_hotswap + R_sense)
Uncontrolled plug-in:  I_peak ≈ V / (R_loop) — thousands of amps for µs, arcing at the clip</div>`,
    failures: ['Inrush outside SOA → hot-swap FET short → upstream fuse; mitigate with dV/dt timer & SOA-rated FETs',
      'Busbar clip corrosion / poor insertion → hot contact → IR thermography, input voltage telemetry',
      'Feed short → OR-ing FET must block in < 1 µs, else both feeds sag',
      'PSU fan/AC failure → shelf de-rates → power capping by BMC'],
    monitoring: ['Hot-swap controller PMBus: READ_VIN, READ_IIN, READ_PIN, peak/avg power, fault latch', 'PSU telemetry (AC in, DC out, fan, temperature) to rack manager', 'CPLD gets PGOOD/FAULT# from hot-swap'],
    hotspots: [{ target: 'ibc', x: 700, y: 365, w: 125, h: 70, label: '→ IBC' },
      { target: 'power-stage-fet', x: 395, y: 375, w: 90, h: 55, label: 'Hot-swap MOSFET' },
      { target: 'power-sequencing', x: 300, y: 455, w: 200, h: 60, label: 'Controller / sequencing' }],
    scene(g, api) {
      const K = kit(g, api), pw = K.layer('power'), se = K.layer('sensing'), ct = K.layer('control');
      const cu = K.grad('cu', [[0, '#8a5523'], [0.5, '#f0b27a'], [1, '#8a5523']], 'h');
      K.mk('rect', { x: 50, y: 30, width: 22, height: 540, rx: 4, style: 'fill:' + cu }, pw);
      K.mk('rect', { x: 84, y: 30, width: 22, height: 540, rx: 4, style: 'fill:' + cu + ';opacity:.7' }, pw);
      K.text(pw, 78, 24, 'busbar 54 V / RTN', { anchor: 'middle', size: 11, fill: 'var(--power)' });
      K.flow(pw, [[61, 40], [61, 560]], { n: 14, r: 3, speed: 50 });
      // shelf
      K.box(pw, 140, 50, 320, 140, { d: 'power', label: 'Power shelf (PSUs N+1)', sub: '3φ AC → PFC → LLC → 54 V' });
      const st1 = [['AC 3φ', 155], ['PFC', 240], ['LLC', 320], ['54 V', 395]];
      st1.forEach(([l, x], i) => { K.box(pw, x, 110, 58, 40, { d: 'power', label: l, center: true, ls: 12 }); if (i) K.wire(pw, [[x - 22, 130], [x, 130]], { arrow: true, w: 1.5 }); });
      K.text(pw, 300, 175, '~400 V DC link · PF > 0.99 · η ≈ 97 %', { anchor: 'middle', size: 11, fill: 'var(--muted)' });
      K.wire(pw, [[453, 130], [480, 130], [480, 40], [72, 40]], { w: 2 });
      K.flow(pw, [[453, 130], [480, 130], [480, 40], [72, 40]], { n: 7, r: 2.6, speed: 45 });
      K.box(pw, 140, 210, 320, 60, { d: 'power', label: 'Battery backup unit (BBU)', sub: 'floats on bus, holds up during AC loss' });
      K.wire(pw, [[140, 240], [106, 240]], { w: 2, dash: '4 3' });
      // input chain
      K.text(pw, 130, 360, 'Switch tray input', { size: 12, fill: 'var(--muted)' });
      const y = 400;
      K.wire(pw, [[72, y], [700, y]], { w: 3.5, op: 0.6 });
      K.box(pw, 125, y - 22, 70, 44, { d: 'power', label: 'clip', center: true, ls: 12 });
      K.box(pw, 220, y - 25, 90, 50, { d: 'power', label: 'OR-ing FET', sub: 'ideal diode', center: true, ls: 12 });
      K.mk('rect', { x: 330, y: y - 8, width: 40, height: 16, style: 'fill:#2a2f38;stroke:var(--power)' }, pw);
      K.text(pw, 350, y - 14, 'R_sense', { anchor: 'middle', size: 10.5, fill: 'var(--muted)' });
      const hsf = K.box(pw, 400, y - 25, 80, 50, { d: 'power', label: 'Hot-swap', sub: 'MOSFET', center: true, ls: 12 });
      K.cap(pw, 560, y, { len: 50, wd: 24 }); K.text(pw, 575, y + 40, 'C_in ≈ 2 mF', { size: 11, fill: 'var(--muted)' });
      K.box(pw, 700, y - 30, 120, 60, { d: 'power', label: '→ IBC', sub: '54 V protected', center: true });
      K.box(ct, 300, 458, 200, 52, { d: 'control', label: 'Hot-swap / eFuse controller', sub: 'dV/dt · OC · UV/OV · PMBus', ls: 12 });
      K.wire(ct, [[440, 458], [440, y + 25]], { d: 'control', dash: '3 3', w: 1.3, op: 0.8 });
      K.wire(se, [[350, y + 8], [350, 458]], { d: 'sensing', dash: '3 3', w: 1.3, op: 0.8 });
      const fin = K.flow(pw, [[72, y], [700, y]], { n: 16, r: 3.4, speed: 60 });
      // inrush plot
      const pl = K.plot(se, 520, 50, 450, 150, { min: 0, max: 60, label: 'Plug-in event: V_out (yellow), I_in controlled (pink), uncontrolled (red, ÷50)', n: 200, color: 'var(--power)', glow: true });
      const pi = pl.trace({ color: 'var(--sense)', w: 1.6 }), pu = pl.trace({ color: 'var(--bad)', dash: '4 3', w: 1.3 });
      const cur = pl.cursor();
      const rI = K.readout(se, 520, 225, 'Inrush I = C·dV/dt', { d: 'sensing' });
      const rE = K.readout(se, 690, 225, 'FET energy ½CV²', { d: 'sensing' });
      const rP = K.readout(se, 840, 225, 'FET peak P', { d: 'sensing' });
      // I2R comparison
      K.text(pw, 520, 300, 'Distribution loss, 2 kW over 1 mΩ (I²R):', { size: 12, fill: 'var(--muted)' });
      [['12 V → 167 A', 27.8, 'var(--bad)'], ['54 V → 37 A', 1.37, 'var(--good)']].forEach(([l, v, c], i) => {
        K.text(pw, 520, 328 + i * 26, l, { size: 11.5 }); const b = K.bar(pw, 640, 316 + i * 26, 250, 14, { color: c }); b.set(v / 30);
        K.text(pw, 900, 328 + i * 26, v + ' W', { size: 11.5, mono: true, fill: c });
      });
      const Cin = 2e-3, dvdt = 2.2; // V/ms
      K.tick((dt, t) => {
        const T = 6, tc = t % T, tr = 54 / dvdt / 1000; // s actual ramp
        const ramp = 0.8 + tr * 25; // visual seconds
        const pts = [], pti = [], ptu = [];
        for (let i = 0; i <= 200; i++) {
          const tt = i / 200 * T; let v = 0, ii = 0, iu = 0;
          if (tt > 0.6) { const f = (tt - 0.6) / ramp; v = 54 * CPO.clamp(f, 0, 1); ii = f < 1 ? Cin * dvdt * 1000 + 1.5 : 1.5 + 0.4 * Math.sin(tt * 9); iu = Math.max(0, 55 * Math.exp(-(tt - 0.6) * 25)) + (tt > 0.65 ? 1.5 : 0); }
          pts.push(v); pti.push(ii * 5); ptu.push(iu);
        }
        pl.set(pts); pi.set(pti); pu.set(ptu); cur.set(tc / T);
        const live = tc > 0.6; fin.on = live; fin.speed = (tc - 0.6) < ramp ? 25 : 70;
        hsf.rect.style.fill = live && (tc - 0.6) < ramp ? 'rgba(255,90,54,.35)' : '';
        rI.set((Cin * dvdt * 1000).toFixed(1) + ' A'); rE.set((0.5 * Cin * 54 * 54).toFixed(1) + ' J'); rP.set((54 / 2 * Cin * dvdt * 1000).toFixed(0) + ' W');
      });
      K.cap0('Controlled dV/dt keeps the hot-swap FET inside its SOA; without it the input capacitors draw a destructive current spike.');
    }
  });

  add({
    id: 'ibc', parent: 'power-delivery', domain: 'power', level: 3,
    title: 'Intermediate Bus Converter (IBC)', subtitle: '54 V → ~12 V, fixed-ratio resonant, ~98 %',
    summary: 'The IBC turns the 48–54 V input into a ~12 V intermediate bus for the point-of-load regulators. Modern IBCs are often unregulated fixed-ratio "DC transformers" (e.g. 4:1 LLC running at resonance with zero-voltage switching), or hybrid switched-capacitor converters, reaching ≈98 % efficiency at kW-per-cubic-inch power densities. Alternatives skip the 12 V stage and convert 48 V straight to the core voltage.',
    what: `<p><b>Fixed-ratio LLC (DCX)</b> ${CPO.badge('typ')}: a half/full bridge drives a series resonant tank (Lr, Cr) into a transformer with turns ratio N. Switching at the tank's resonance f_r, the tank current is sinusoidal, the primary FETs turn on at zero voltage (ZVS — the magnetizing current discharges Coss during dead time) and the secondary synchronous rectifiers turn off near zero current (ZCS). Because it is not regulating, it behaves like an ideal transformer with a small output resistance: V_out ≈ V_in/N − I·R_out. The downstream VRMs tolerate the resulting 10–14 V range.</p>
<p><b>Regulated IBC</b>: a phase-shifted full bridge or buck-boost gives a fixed 12 V at the cost of ~0.5–1 % efficiency.</p>
<p><b>Switched-capacitor / hybrid</b> (Dickson, series-capacitor buck): capacitors do most of the voltage division (higher energy density than magnetics), very flat efficiency.</p>
<p><b>Direct 48 V → Vcore</b>: factorized power (regulator + current-multiplier "VTM" near the load), or 48 V-input stacked/hybrid multiphase converters remove one stage; attractive as currents grow beyond 1 kA ${CPO.badge('typ')}.</p>`,
    needs: ['Accurate tank tuning (f_s ≈ f_r) across temperature and component tolerance', 'Low-loss magnetics (planar transformer, PCB windings) and low-Rds(on) SR FETs',
      'Dead-time tuned to the magnetizing current for ZVS', 'Good thermal path (≈2 % of kW = tens of W)', 'Input/output capacitance sized for VRM transients'],
    interfaces: [{ with: 'Hot-swap / busbar', type: 'power', detail: '48–54 V in' }, { with: 'VRMs / PoLs', type: 'power', detail: '~12 V intermediate bus' },
      { with: 'BMC via PMBus', type: 'mgmt', detail: 'READ_VIN/VOUT/IOUT/TEMP, fault status' }, { with: 'Cold plate / airflow', type: 'thermal', detail: 'transformer + FET losses' }],
    kpis: [{ name: 'Ratio', value: '4:1 (54 → 13.5 V)', tag: 'typ' }, { name: 'Peak efficiency', value: '97.5–98.5 %', tag: 'typ' }, { name: 'Switching freq.', value: '~0.5–1.5 MHz', tag: 'typ' },
      { name: 'Power density', value: '≈1–3 kW/in³', tag: 'typ' }, { name: 'Output resistance', value: 'few mΩ', tag: 'typ' }],
    physics: `<div class="eq">f_r = 1 / (2π·√(Lr·Cr))           Lr = 25 nH, Cr = 1 µF  →  f_r ≈ 1.0 MHz
V_out = V_in / N − I_out·R_out       54 / 4 = 13.5 V
ZVS condition:  ½·L_m·I_m,pk² ≥ ½·(2·C_oss)·V_in²    (magnetizing energy swings the switch node)
P_SR,cond = I_rms² · R_ds(on)        I_rms = (π/(2√2))·I_out for sinusoidal half-waves</div>`,
    failures: ['Tank drift off resonance → loss of ZVS → hot FETs, EMI', 'SR timing error → reverse current / shoot-through', 'Transformer insulation/thermal stress', 'Unregulated output follows input transients → VRMs must reject them'],
    monitoring: ['PMBus telemetry and OT/OC faults', 'Temperature sensor on transformer/FETs', 'Input/output voltage ratio check (detects tank or SR faults)'],
    hotspots: [{ target: 'power-stage-fet', x: 130, y: 75, w: 100, h: 230, label: 'Primary MOSFET leg' },
      { target: 'vrm', x: 720, y: 155, w: 160, h: 70, label: '→ 12 V VRMs' }, { target: 'busbar-psu', x: 25, y: 145, w: 80, h: 100, label: '54 V input' }],
    scene(g, api) {
      const K = kit(g, api), pw = K.layer('power'), se = K.layer('sensing'), ct = K.layer('control');
      K.box(pw, 30, 150, 70, 90, { d: 'power', label: '54 V', sub: 'in', center: true });
      K.wire(pw, [[100, 170], [120, 170], [120, 70], [180, 70]], { w: 2.5 }); K.wire(pw, [[180, 70], [180, 320]], { w: 2.5, op: 0.35 });
      K.wire(pw, [[100, 220], [100, 320], [420, 320]], { w: 2.5 });
      const q1 = K.box(pw, 150, 88, 60, 40, { d: 'power', label: 'Q1', center: true });
      const q2 = K.box(pw, 150, 250, 60, 40, { d: 'power', label: 'Q2', center: true });
      K.wire(pw, [[180, 190], [240, 190]], { w: 2.5 });
      K.mk('line', { x1: 248, y1: 176, x2: 248, y2: 204, style: 'stroke:var(--power);stroke-width:3' }, pw);
      K.mk('line', { x1: 256, y1: 176, x2: 256, y2: 204, style: 'stroke:var(--power);stroke-width:3' }, pw);
      K.text(pw, 252, 170, 'Cr', { anchor: 'middle', size: 11, fill: 'var(--muted)' });
      K.wire(pw, [[256, 190], [290, 190]], { w: 2.5 }); K.coil(pw, 290, 190, 70, { n: 4 }); K.text(pw, 325, 172, 'Lr', { anchor: 'middle', size: 11, fill: 'var(--muted)' });
      K.wire(pw, [[360, 190], [400, 190], [400, 150], [420, 150]], { w: 2.5 });
      K.coil(pw, 420, 150, 80, { n: 5, vert: true }); K.coil(pw, 470, 150, 80, { n: 5, vert: true });
      K.mk('rect', { x: 441, y: 140, width: 5, height: 100, style: 'fill:#94a3b8' }, pw); K.mk('rect', { x: 450, y: 140, width: 5, height: 100, style: 'fill:#94a3b8' }, pw);
      K.text(pw, 448, 132, 'N = 4:1', { anchor: 'middle', size: 11.5, fill: 'var(--muted)' });
      K.wire(pw, [[420, 230], [420, 320]], { w: 2.5 });
      // secondary (center-tapped)
      K.wire(pw, [[470, 150], [505, 150]], { w: 2.5 }); const sr1 = K.box(pw, 505, 135, 55, 30, { d: 'power', label: 'SR1', center: true, ls: 12 });
      K.wire(pw, [[560, 150], [590, 150], [590, 320]], { w: 2.5 });
      K.wire(pw, [[470, 230], [505, 230]], { w: 2.5 }); const sr2 = K.box(pw, 505, 215, 55, 30, { d: 'power', label: 'SR2', center: true, ls: 12 });
      K.wire(pw, [[560, 230], [590, 230]], { w: 2.5 }); K.wire(pw, [[590, 320], [700, 320]], { w: 2.5 });
      K.wire(pw, [[465, 190], [660, 190], [720, 190]], { w: 3.5 }); K.cap(pw, 660, 190, { len: 130, wd: 22 });
      K.text(pw, 470, 196, '·CT', { size: 10, fill: 'var(--muted)' });
      K.box(pw, 720, 160, 155, 60, { d: 'power', label: '13.5 V → VRMs', sub: 'unregulated: Vin/N', center: true });
      K.box(ct, 230, 30, 160, 34, { d: 'control', label: 'Controller · dead-time', ls: 12, center: true });
      K.wire(ct, [[230, 47], [215, 47], [215, 108], [210, 108]], { d: 'control', dash: '3 3', w: 1.2 });
      K.wire(ct, [[390, 47], [532, 47], [532, 135]], { d: 'control', dash: '3 3', w: 1.2 });
      const pA = K.flow(pw, [[100, 170], [120, 170], [120, 70], [180, 70], [180, 190], [290, 190], [400, 190], [400, 150], [420, 150], [420, 320], [100, 320]], { n: 16, r: 3 });
      const pB = K.flow(pw, [[420, 320], [420, 150], [400, 150], [400, 190], [180, 190], [180, 290], [180, 320], [420, 320]], { n: 14, r: 3 });
      const sA = K.flow(pw, [[590, 320], [590, 150], [470, 150], [470, 190], [720, 190]], { n: 10, r: 3.5 });
      const sB = K.flow(pw, [[590, 320], [590, 230], [470, 230], [470, 190], [720, 190]], { n: 10, r: 3.5 });
      // waveforms
      const pl = K.plot(se, 40, 380, 540, 170, { min: -1.2, max: 1.2, label: 'Switch node v_sw (yellow) · tank current i_Lr (pink) · magnetizing i_m (cyan)', n: 300, color: 'var(--power)', vgrid: 4 });
      const pi = pl.trace({ color: 'var(--sense)', w: 2 }), pm = pl.trace({ color: 'var(--data)', w: 1.4, dash: '4 3' });
      const cur = pl.cursor();
      const N = 300, a = [], b = [], c = [];
      for (let i = 0; i <= N; i++) { const ph = (i / N) * 2 % 1; const half = ph < 0.5; a.push(half ? 1 : -1); b.push(Math.sin(TAU * ph) * 0.95); c.push(half ? -0.3 + 2.4 * ph * 0.5 : 0.3 - 2.4 * (ph - 0.5) * 0.5); }
      pl.set(a); pi.set(b); pm.set(c);
      [0.25, 0.5, 0.75].forEach(f => K.text(se, 40 + f * 540 + 3, 395, 'ZVS', { size: 10, fill: 'var(--good)' }));
      const rVin = K.readout(se, 620, 390, 'V_in (busbar)', { d: 'power' }), rVo = K.readout(se, 790, 390, 'V_out = V_in/4 − I·R_o', { d: 'power' });
      const rF = K.readout(se, 620, 450, 'f_r = 1/2π√(LrCr)', { d: 'sensing', init: '1.01 MHz' }), rE = K.readout(se, 790, 450, 'Efficiency', { d: 'sensing' });
      K.lines(se, 620, 512, ['Alternatives: regulated FB / buck-boost (−0.5–1 %),', 'switched-cap / hybrid Dickson, direct 48 V→Vcore.'], { size: 11, fill: 'var(--muted)' });
      K.tick((dt, t) => {
        const ph = (t / 1.6) % 1, first = ph < 0.5;
        pA.on = first; sA.on = first; pB.on = !first; sB.on = !first;
        q1.rect.style.fill = first ? 'rgba(250,204,21,.35)' : ''; q2.rect.style.fill = first ? '' : 'rgba(250,204,21,.35)';
        sr1.rect.style.fill = first ? 'rgba(250,204,21,.35)' : ''; sr2.rect.style.fill = first ? '' : 'rgba(250,204,21,.35)';
        cur.set(ph * 0.5 + (Math.floor(t / 1.6) % 2) * 0.5);
        const vin = 51 + 3 * Math.sin(t * 0.4), io = 60 + 30 * Math.sin(t * 0.7);
        rVin.set(vin.toFixed(1) + ' V'); rVo.set((vin / 4 - io * 0.002).toFixed(2) + ' V');
        rE.set((98.3 - 0.4 * Math.abs(io - 55) / 30).toFixed(1) + ' %');
      });
      K.cap0('Half-bridge LLC drawn for clarity (full-bridge with 4:1 ratio is common). Flow alternates each half-cycle; resonance gives sinusoidal current and ZVS.');
    }
  });

  add({
    id: 'vrm', parent: 'power-delivery', domain: 'power', level: 3,
    title: 'Multiphase Vcore VRM', subtitle: '12 V → ~0.75 V, N interleaved buck phases, ripple cancellation',
    summary: 'The core regulator is a synchronous buck converter split into many parallel phases — each a smart power stage plus inductor carrying ~40–70 A — whose PWM signals are shifted by 360°/N. Interleaving multiplies the effective ripple frequency by N, cancels much of the inductor ripple current at the output capacitors, spreads heat, and lets the controller add or shed phases with load.',
    what: `<p><b>Buck basics.</b> The high-side FET connects the switch node to 12 V for a fraction D = V_out/V_in ≈ 0.75/12 ≈ 6 % of each period; the low-side FET freewheels the inductor current the rest of the time. The inductor averages the switch-node square wave into DC; capacitors absorb the residual triangle ripple.</p>
<p><b>Why many phases?</b> One phase cannot sensibly carry 1 kA: losses scale with I², inductors would saturate, and the needed output capacitance would be enormous. With N phases ${CPO.badge('typ')} (16–30+ for ~1 kA-class ASICs) each carries I/N. Interleaving places phase k's turn-on at k/N of the period, so ripple currents partially cancel: when N·D is an integer the summed ripple vanishes.</p>
<p><b>Controller.</b> A digital multiphase controller generates the PWMs, senses each phase current (DrMOS IMON) for current balancing, implements the voltage loop with load-line (AVP), takes a target voltage from the ASIC (AVS / VID), sheds phases at light load, and reports telemetry via PMBus.</p>
<p><b>Trends</b> ${CPO.badge('typ')}: coupled inductors and TLVR (trans-inductor) to speed transient response; vertical power delivery placing power stages under the package; 48 V-input stages.</p>`,
    needs: ['Phase current balance (sensed IMON) so no phase overheats', 'Low-DCR inductors with saturation margin (> 1.3× peak)', 'Output capacitance + low-ESL decoupling (see PDN)', 'Precise remote sensing of die voltage', 'Thermal path for power stages (liquid or forced air)'],
    interfaces: [{ with: 'IBC', type: 'power', detail: '~12 V input bus' }, { with: 'ASIC die', type: 'power', detail: 'Vcore through package planes; remote-sense pair back' },
      { with: 'ASIC AVS/SVID', type: 'mgmt', detail: 'voltage ID / AVSBus commands from the die' }, { with: 'BMC/CPLD', type: 'mgmt', detail: 'PMBus, EN, PGOOD, ALERT#' }],
    kpis: [{ name: 'Phases', value: '16–30+', tag: 'est', note: 'for ~1 kA' }, { name: 'Current / phase', value: '40–70 A', tag: 'typ' }, { name: 'f_sw / phase', value: '400 kHz–1 MHz', tag: 'typ' },
      { name: 'Inductor', value: '50–150 nH', tag: 'typ' }, { name: 'Efficiency', value: '88–92 %', tag: 'typ' }, { name: 'Duty cycle', value: '≈6 %', tag: 'typ', note: '0.75 / 12' }],
    physics: `<div class="eq">D = V_out / V_in = 0.75 / 12 = 0.0625
ΔI_L = (V_in − V_out)·D / (L·f_sw) = 11.25 × 0.0625 / (100 nH × 600 kHz) ≈ 11.7 A p-p
Effective ripple frequency = N · f_sw
ΔV_out ≈ ΔI_sum / (8 · C_out · N · f_sw)      (capacitive ripple term)
Ripple cancellation:  ΔI_sum = 0 when N·D is an integer</div>`,
    failures: ['Current imbalance → one phase hot → derate / thermal shutdown', 'DrMOS short → rail collapse; controller OCP/OVP latches off', 'Inductor saturation at large steps → current spikes', 'Phase-shedding glitches at load transitions', 'Controller NVM corruption → wrong VOUT → BMC verifies configuration checksum'],
    monitoring: ['Per-phase IMON / TMON', 'READ_VOUT/IOUT/TEMP, STATUS_WORD via PMBus', 'Remote-sense voltage loop (vrm-control-loop)', 'Fault log in controller NVM'],
    hotspots: [{ target: 'power-stage-fet', x: 92, y: 60, w: 106, h: 58, label: 'Smart power stage (DrMOS)' },
      { target: 'vrm-control-loop', x: 92, y: 485, w: 280, h: 70, label: 'Multiphase controller' },
      { target: 'pdn', x: 372, y: 200, w: 100, h: 140, label: 'Output caps & PDN' }],
    scene(g, api) {
      const K = kit(g, api), pw = K.layer('power'), ct = K.layer('control'), se = K.layer('sensing');
      K.wire(pw, [[60, 60], [60, 470]], { w: 5, op: 0.7 }); K.text(pw, 60, 52, '12 V', { anchor: 'middle', size: 11, fill: 'var(--power)' });
      K.wire(pw, [[360, 70], [360, 460]], { w: 7, op: 0.6 }); K.text(pw, 360, 62, 'Vout', { anchor: 'middle', size: 11, fill: 'var(--power)' });
      const rows = [], flows = [];
      for (let i = 0; i < 6; i++) {
        const y = 66 + i * 66;
        const b = K.box(pw, 100, y, 90, 46, { d: 'power', label: 'DrMOS ' + (i + 1), sub: 'HS/LS', ls: 12 });
        K.wire(pw, [[60, y + 23], [100, y + 23]], { w: 2 });
        K.wire(pw, [[190, y + 23], [225, y + 23]], { w: 2 }); K.coil(pw, 225, y + 23, 80, { n: 5 }); K.wire(pw, [[305, y + 23], [360, y + 23]], { w: 2 });
        rows.push(b); flows.push(K.flow(pw, [[190, y + 23], [360, y + 23]], { n: 5, r: 3 }));
      }
      for (let i = 0; i < 3; i++) K.cap(pw, 392 + i * 30, 230, { len: 60, wd: 18 });
      K.wire(pw, [[360, 230], [490, 230]], { w: 6 });
      K.box(pw, 490, 200, 80, 120, { d: 'power', label: 'ASIC', sub: '0.75 V', center: true, stroke: 'var(--accent)' });
      K.flow(pw, [[360, 230], [490, 230]], { n: 6, r: 5, speed: 120 });
      K.box(ct, 100, 490, 265, 60, { d: 'control', label: 'Multiphase controller', sub: 'PWM1…N · ISEN · VSEN · AVS · PMBus' });
      for (let i = 0; i < 6; i++) { const y = 66 + i * 66 + 40; K.wire(ct, [[100, 520], [80, 520], [80, y], [100, y]], { d: 'control', dash: '2 3', w: 1, op: 0.45 }); }
      K.wire(se, [[530, 320], [530, 520], [365, 520]], { d: 'sensing', dash: '4 3', w: 1.4, arrow: true });
      K.text(se, 540, 400, 'remote sense', { size: 10.5, fill: 'var(--sense)', rot: 90 });
      K.flow(se, [[530, 320], [530, 520], [365, 520]], { d: 'sensing', color: 'var(--sense)', n: 3, r: 2.2, speed: 60 });
      const p1 = K.plot(se, 600, 50, 380, 190, { min: 25, max: 55, label: 'Phase inductor currents i_L,k (A)', n: 200, color: 'var(--power)' });
      const tr = [p1.main]; const cols = ['var(--power)', 'var(--sense)', 'var(--data)', 'var(--therm)', 'var(--violet)', 'var(--good)', '#fde68a', '#93c5fd'];
      for (let k = 1; k < 8; k++) tr.push(p1.trace({ color: cols[k], w: 1.4 }));
      const p2 = K.plot(se, 600, 310, 380, 130, { min: -7, max: 7, label: 'Σ i_L − mean (A): ripple current into C_out', n: 200, color: 'var(--sense)', glow: true });
      let N = 4;
      K.text(se, 600, 280, 'phases N:', { size: 11.5, fill: 'var(--muted)' });
      K.radio(se, 665, 264, ['1', '2', '4', '6', '8'], 46, i => { N = [1, 2, 4, 6, 8][i]; }, 2);
      K.readout(se, 600, 465, 'ΔI per phase', { d: 'power', init: '11.7 A' });
      const rB = K.readout(se, 730, 465, 'ΔI sum / ΔI phase', { d: 'sensing' });
      const rC = K.readout(se, 870, 465, 'ripple freq', { d: 'sensing' }), rD = K.readout(se, 600, 520, 'I per phase @1 kA', { d: 'power' });
      K.readout(se, 780, 520, 'Duty D', { d: 'power', init: '6.25 %' });
      const D = 0.0625, dI = 11.7;
      const il = ph => { ph = ((ph % 1) + 1) % 1; return ph < D ? -dI / 2 + dI * ph / D : dI / 2 - dI * (ph - D) / (1 - D); };
      let tt = 0;
      K.tick(dt => {
        tt += dt * 0.35;
        const M = 200; let mx = -1e9, mn = 1e9; const sum = [];
        for (let k = 0; k < 8; k++) {
          if (k >= N) { tr[k].el.style.display = 'none'; continue; }
          tr[k].el.style.display = '';
          const pts = []; for (let i = 0; i <= M; i++) pts.push(40 + il(tt + i / M * 2 - k / N));
          tr[k].set(pts);
        }
        for (let i = 0; i <= M; i++) { let s = 0; for (let k = 0; k < N; k++) s += il(tt + i / M * 2 - k / N); sum.push(s); mx = Math.max(mx, s); mn = Math.min(mn, s); }
        const mean = (mx + mn) / 2; p2.set(sum.map(v => v - mean));
        rB.set(((mx - mn) / dI).toFixed(2)); rC.set((0.6 * N).toFixed(1) + ' MHz'); rD.set((1000 / 20).toFixed(0) + ' A (N=20)');
        rows.forEach((b, i) => { const ph = ((tt - i / N) % 1 + 1) % 1; b.rect.style.fill = i < N && ph < 0.12 ? 'rgba(250,204,21,.4)' : ''; b.style.opacity = i < N ? 1 : 0.3; flows[i].on = i < N; });
      });
      K.cap0('Six phases drawn; real ~1 kA rails use tens. Change N: ripple cancels as N·D approaches an integer. f_sw 600 kHz, L 100 nH (typical).');
    }
  });

  add({
    id: 'power-stage-fet', parent: 'vrm', domain: 'power', level: 6,
    title: 'Power Stage & MOSFET / GaN Physics', subtitle: 'DrMOS: driver + HS/LS FETs; loss mechanisms down to the channel',
    summary: 'Each VRM phase is a smart power stage: a gate driver and two power transistors (high-side control FET, low-side synchronous FET) in a ~5×6 mm package, with integrated current and temperature sensing. Efficiency is decided by conduction loss (I²·Rds(on)), switching overlap loss, gate charge, dead-time body-diode conduction, reverse recovery and output capacitance — all traced back to how electrons move in a silicon trench MOSFET or a GaN HEMT 2DEG.',
    what: `<p><b>Silicon trench MOSFET</b>: a vertical device. A positive gate voltage on the poly-Si gate buried in a trench inverts the p-body along the trench sidewall, forming an n-channel; electrons flow from the n+ source down the channel, through the lightly doped n− drift region into the n+ substrate (drain). Rds(on) = R_channel + R_drift + R_substrate + package. Shield-gate (split-gate) trenches reduce Qgd (Miller charge) for fast switching.</p>
<p><b>GaN HEMT</b>: a lateral device. Spontaneous + piezoelectric polarization at the AlGaN/GaN interface induces a 2DEG (≈1e13 cm⁻², mobility ≈1500–2000 cm²/V·s) without doping. Enhancement-mode devices use a p-GaN gate to deplete the 2DEG at 0 V. No p-n body diode → <b>zero reverse-recovery charge</b>, but reverse ("third-quadrant") conduction drops ≈2–3 V during dead time, so dead time must be short.</p>
<p><b>At 12 V → 0.75 V</b> ${CPO.badge('typ')} Si trench FETs dominate (mature, cheap, very low Rds(on) at 25–30 V rating); GaN shines in 48 V stages and at higher switching frequencies where its lower Qg·Rds(on) figure of merit pays off.</p>
<p><b>Why HS and LS differ</b>: at D ≈ 6 % the high-side FET conducts briefly but switches the full voltage (optimize low Qgd, fast edges); the low-side FET conducts 94 % of the time (optimize low Rds(on), larger die).</p>`,
    needs: ['Low Rds(on) LS FET and low-Qgd HS FET', 'Tight driver–FET loop (low common-source inductance) — hence integration', 'Adaptive dead time', 'Accurate IMON (≈ ±2–5 %) and TMON', 'Low thermal resistance to board/cold plate'],
    interfaces: [{ with: 'Controller', type: 'electrical', detail: 'PWM (tri-state), EN, IMON (current mirror), TMON (voltage ∝ T), FAULT' },
      { with: 'Inductor / output', type: 'power', detail: 'switch node (SW)' }, { with: '12 V bus', type: 'power', detail: 'VIN, PGND' }],
    kpis: [{ name: 'Rated current', value: '50–90 A', tag: 'typ' }, { name: 'Rds(on) LS', value: '~0.6–1.5 mΩ', tag: 'typ' }, { name: 'Edge time', value: '1–5 ns', tag: 'typ' },
      { name: 'Peak eff. (12→0.8 V)', value: '~91–93 %', tag: 'typ' }, { name: 'GaN Qrr', value: '0', tag: 'typ' }],
    physics: `<div class="eq">P_cond,HS = I²·R_HS·D         P_cond,LS = I²·R_LS·(1−D)
P_sw      = ½·V_in·I·(t_r + t_f)·f_sw
P_gate    = Q_g·V_drv·f_sw  (per FET)
P_dead    = V_f·I·2·t_dead·f_sw
P_Qrr     = Q_rr·V_in·f_sw          P_Coss ≈ C_oss·V_in²·f_sw
Channel:  R_ch = L / (W·µ_n·C_ox·(V_GS − V_th))     2DEG: R_sh = 1/(q·n_s·µ)
          n_s = 1e13 cm⁻², µ = 1800 cm²/Vs → R_sh ≈ 350 Ω/□</div>`,
    failures: ['Shoot-through (both FETs on) → destructive current; driver dead-time & tri-state', 'Switch-node ringing exceeding V_DS rating → avalanche; snubbers, layout', 'Gate-oxide / p-GaN gate over-voltage', 'Thermal runaway in paralleled stages without current balancing', 'Solder fatigue from thermal cycling'],
    monitoring: ['IMON per phase into controller', 'TMON / OT flag', 'Driver UVLO and OC fault pins → controller → PMBus STATUS_IOUT/STATUS_TEMPERATURE'],
    hotspots: [{ target: 'transistor', x: 838, y: 538, w: 149, h: 44, label: 'Compare: logic transistor' },
      { target: 'vrm-control-loop', x: 26, y: 290, w: 308, h: 135, label: 'Switching waveform / control' }],
    scene(g, api) {
      const K = kit(g, api), pw = K.layer('power'), se = K.layer('sensing'), ct = K.layer('control');
      K.box(pw, 30, 40, 300, 230, { d: 'power', label: 'Smart power stage (≈5×6 mm)', sub: 'VIN · SW · PGND · PWM · IMON · TMON' });
      K.box(ct, 45, 85, 80, 170, { d: 'control', label: 'Driver', sub: 'IMON/TMON', ls: 12 });
      const hs = K.box(pw, 145, 80, 170, 60, { d: 'power', label: 'HS FET (control)', sub: 'low Qgd', ls: 12 });
      const ls = K.box(pw, 145, 160, 170, 95, { d: 'power', label: 'LS FET (sync)', sub: 'low Rds(on), bigger die', ls: 12 });
      const fh = K.flow(pw, [[300, 70], [230, 100], [230, 150], [320, 150]], { n: 6, r: 3 });
      const fl = K.flow(pw, [[300, 262], [230, 240], [230, 155], [320, 150]], { n: 6, r: 3 });
      const pl = K.plot(se, 30, 310, 300, 110, { min: -0.1, max: 1.15, label: 'v_SW (yellow) & i_L (pink), D ≈ 6 %', n: 300, color: 'var(--power)', vgrid: 3 });
      const pi = pl.trace({ color: 'var(--sense)' }); const cur = pl.cursor();
      const vs = [], is = []; for (let i = 0; i <= 300; i++) { const ph = (i / 300 * 3) % 1; vs.push(ph < 0.0625 ? 1 : (ph < 0.075 ? -0.05 : 0)); is.push(0.55 + (ph < 0.0625 ? -0.2 + 0.4 * ph / 0.0625 : 0.2 - 0.4 * (ph - 0.0625) / 0.9375)); }
      pl.set(vs); pi.set(is);
      K.text(pw, 30, 448, 'Loss breakdown @ 40 A, 12 → 0.75 V', { size: 12, fill: 'var(--muted)' });
      const names = ['HS cond', 'LS cond', 'switching', 'gate', 'dead-time', 'Qrr', 'Coss'], bars = [], vals = [];
      const th = K.layer('thermal');
      names.forEach((n, i) => { K.text(th, 30, 470 + i * 15, n, { size: 10.5 }); bars.push(K.bar(th, 105, 461 + i * 15, 160, 10, { color: 'var(--therm)' })); vals.push(K.text(th, 272, 470 + i * 15, '', { size: 10.5, mono: true, fill: 'var(--muted)' })); });
      let tech = 0, fi = 1;
      K.radio(ct, 360, 440, ['Si trench', 'GaN HEMT'], 90, i => { tech = i; }, 0);
      K.radio(ct, 560, 440, ['300 kHz', '600 kHz', '1.2 MHz'], 70, i => { fi = i; }, 1);
      const rEff = K.readout(se, 360, 485, 'Stage efficiency', { d: 'sensing' }), rL = K.readout(se, 520, 485, 'Total loss', { color: 'var(--therm)' });
      K.lines(se, 360, 540, ['Si wins at 12 V on cost & Rds(on); GaN cuts switching,', 'gate and Qrr loss → higher f_sw, smaller L & C.'], { size: 11, fill: 'var(--muted)' });
      const x0 = 360, w0 = 270;
      K.text(pw, x0, 40, 'Si trench MOSFET (vertical)', { size: 13, weight: 600 });
      [[60, 18, '#9aa4b1', 'source'], [78, 50, '#3b2a5c', 'n+/p-body'], [128, 140, '#1e3a5f', 'n− drift'], [268, 40, '#0f2a4a', 'n+ sub'], [308, 16, '#9aa4b1', 'drain']].forEach(([y, h, c, l]) => { K.mk('rect', { x: x0, y, width: w0, height: h, style: 'fill:' + c }, pw); K.text(pw, x0 + w0 + 4, y + h / 2 + 4, l, { size: 9.5, fill: 'var(--muted)' }); });
      const chans = [], el = [];
      for (let i = 0; i < 3; i++) {
        const tx = x0 + 45 + i * 90;
        K.mk('rect', { x: tx - 14, y: 78, width: 28, height: 110, rx: 6, style: 'fill:#2b313b;stroke:#cbd5e1;stroke-width:1' }, pw);
        K.mk('rect', { x: tx - 8, y: 84, width: 16, height: 95, rx: 4, style: 'fill:#7c3aed;opacity:.7' }, ct);
        [-1, 1].forEach(sd => {
          chans.push(K.mk('rect', { x: sd < 0 ? tx - 17 : tx + 14, y: 85, width: 3, height: 45, filter: K.glow, style: 'fill:var(--data)' }, se));
          const ex = tx + sd * 19; el.push(K.flow(se, [[ex, 66], [ex, 130], [ex + sd * 10, 200], [ex + sd * 10, 300]], { color: 'var(--data)', n: 5, r: 2.2, speed: 70 }));
        });
      }
      const gl = K.text(ct, x0, 345, '', { size: 11, mono: true, fill: 'var(--ctrl)' });
      const x1 = 680, w1 = 260;
      K.text(pw, x1, 40, 'GaN HEMT (lateral, e-mode)', { size: 13, weight: 600 });
      [[250, 60, '#1f2937', 'Si sub'], [160, 90, '#1e3a5f', 'GaN'], [140, 20, '#3b4a6b', 'AlGaN']].forEach(([y, h, c, l]) => { K.mk('rect', { x: x1, y, width: w1, height: h, style: 'fill:' + c }, pw); K.text(pw, x1 + w1 + 4, y + h / 2 + 4, l, { size: 9.5, fill: 'var(--muted)' }); });
      K.mk('rect', { x: x1 + 10, y: 100, width: 40, height: 40, style: 'fill:#9aa4b1' }, pw); K.text(pw, x1 + 30, 95, 'S', { anchor: 'middle', size: 11 });
      K.mk('rect', { x: x1 + 210, y: 100, width: 40, height: 40, style: 'fill:#9aa4b1' }, pw); K.text(pw, x1 + 230, 95, 'D', { anchor: 'middle', size: 11 });
      K.mk('rect', { x: x1 + 85, y: 115, width: 34, height: 25, style: 'fill:#7f1d1d' }, pw); K.mk('rect', { x: x1 + 89, y: 100, width: 26, height: 15, style: 'fill:#7c3aed' }, ct);
      K.text(pw, x1 + 102, 95, 'G (p-GaN)', { anchor: 'middle', size: 10.5 });
      K.mk('rect', { x: x1, y: 160, width: 85, height: 3, filter: K.glow, style: 'fill:var(--data)' }, se);
      const d2 = K.mk('rect', { x: x1 + 85, y: 160, width: 34, height: 3, filter: K.glow, style: 'fill:var(--data)' }, se);
      K.mk('rect', { x: x1 + 119, y: 160, width: 141, height: 3, filter: K.glow, style: 'fill:var(--data)' }, se);
      K.text(se, x1 + 130, 180, '2DEG ≈1e13 cm⁻²', { size: 10.5, fill: 'var(--data)' });
      const eg = K.flow(se, [[x1 + 30, 140], [x1 + 30, 161], [x1 + 230, 161], [x1 + 230, 140]], { color: 'var(--data)', n: 10, r: 2.2, speed: 90 });
      const FOM = [['', 'Si trench', 'GaN e-mode'], ['Qg', '~20 nC', '~6 nC'], ['Qrr', '~30 nC', '0'], ['Edges', '3–5 ns', '< 1–2 ns'], ['Reverse Vf', '0.7 V', '≈2–3 V'], ['Sweet spot', '12 V PoL', '48 V, >1 MHz']];
      FOM.forEach((r, i) => r.forEach((c, j) => K.text(pw, 680 + j * 95, 380 + i * 22, c, { size: 11, fill: i === 0 || j === 0 ? 'var(--muted)' : 'var(--text)', mono: j > 0 && i > 0 })));
      K.box(pw, 840, 540, 145, 40, { d: 'data', label: '→ logic transistor', center: true, ls: 12, dash: '4 3' });
      const L = (f, gn) => { const I = 40, V = 12, Dd = 0.0625; const p = gn ? { rh: 3e-3, rl: 1.2e-3, tr: 2e-9, qg: 6e-9, td: 5e-9, vf: 2.2, qrr: 0, co: 0.8e-9 } : { rh: 3e-3, rl: 1e-3, tr: 8e-9, qg: 20e-9, td: 20e-9, vf: 0.7, qrr: 30e-9, co: 1.5e-9 };
        return [I * I * p.rh * Dd, I * I * p.rl * (1 - Dd), 0.5 * V * I * p.tr * f, p.qg * 5 * f * 2, p.vf * I * 2 * p.td * f, p.qrr * V * f, p.co * V * V * f]; };
      K.tick((dt, t) => {
        const f = [300e3, 600e3, 1.2e6][fi], lv = L(f, tech), tot = lv.reduce((a, b) => a + b, 0);
        lv.forEach((v, i) => { bars[i].set(v / 4); vals[i].textContent = v.toFixed(2) + ' W'; });
        rEff.set((30 / (30 + tot) * 100).toFixed(1) + ' %'); rL.set(tot.toFixed(2) + ' W');
        const on = ((t / 2) % 1) < 0.55;
        chans.forEach(c => { c.style.opacity = on ? 0.95 : 0.05; }); el.forEach(e => { e.on = on; });
        gl.textContent = on ? 'V_GS = 5 V → inversion channel, e⁻ flow ↓' : 'V_GS = 0 V → channel off, drift blocks V_DS';
        d2.style.opacity = on ? 0.95 : 0.05; eg.on = on;
        const sp = (t / 1.2) % 1, ph = (sp * 3) % 1; cur.set(sp);
        hs.rect.style.fill = ph < 0.0625 ? 'rgba(250,204,21,.4)' : ''; ls.rect.style.fill = ph >= 0.075 ? 'rgba(250,204,21,.18)' : '';
        fh.on = ph < 0.2; fl.on = !fh.on;
      });
      K.cap0('Loss model: I = 40 A, V_in = 12 V, D = 6.25 %, typical device parameters (not a specific product).');
    }
  });

  add({
    id: 'vrm-control-loop', parent: 'vrm', domain: 'control', level: 4,
    title: 'VRM Control Loop', subtitle: 'voltage / current-mode / COT, load-line, AVS, transient droop, Bode',
    summary: 'The VRM controller is a feedback loop: it compares the remotely-sensed die voltage with a reference (set by AVS and shifted by the load-line), filters the error through a compensator and drives PWM duty cycles. Its bandwidth (crossover ~50–250 kHz) and phase margin decide how far Vcore droops when hundreds of amps arrive in a microsecond — and the decoupling network must cover everything faster than the loop.',
    what: `<p><b>Control modes</b> ${CPO.badge('typ')}:</p><ul>
<li><b>Voltage mode</b>: error amp + type-III compensator (two zeros cancel the LC double pole). Simple, but bandwidth limited by the LC resonance.</li>
<li><b>Peak/valley current mode</b>: an inner loop controls inductor current — the inductor becomes a current source, the plant becomes first-order and phase currents balance naturally.</li>
<li><b>Constant on-time (COT)</b> / ripple-based: fires a fixed-width pulse whenever Vout falls below reference; response to a step is essentially immediate (phases can overlap). Variable frequency; needs ripple injection for stability.</li>
<li><b>Digital controllers</b> combine these with non-linear transient boosts (phase overlap on detected dV/dt), auto-tuning, and PMBus-configurable compensation.</li></ul>
<p><b>Load-line / AVP</b>: V_out = V_ref − R_LL·I_out. With R_LL equal to the target impedance, the output sits high at light load and low at heavy load, so the whole tolerance window is usable for a transient instead of half — and power drops at high current.</p>
<p><b>AVS</b>: the die reports (fuses / a bus such as SVID or AVSBus) the minimum voltage its silicon corner needs; the controller sets V_ref accordingly (tens of mV saved ≈ several % of core power, since P ∝ V²).</p>
<p><b>Remote sense</b>: a differential pair from on-die sense points removes the I·R drop of planes and package from the regulation error.</p>`,
    needs: ['Crossover typically f_sw/5 … f_sw/10 (averaged-model validity)', 'Phase margin 45–60°', 'Remote differential sensing with noise filtering', 'Decoupling that keeps impedance flat above f_c', 'Current-sense accuracy for AVP and phase balancing'],
    interfaces: [{ with: 'Die sense points', type: 'electrical', detail: 'VSENSE+/− differential' }, { with: 'ASIC AVS', type: 'mgmt', detail: 'VID/AVS commands' }, { with: 'Power stages', type: 'electrical', detail: 'PWM out, IMON in' }, { with: 'BMC', type: 'mgmt', detail: 'PMBus loop config, telemetry' }],
    kpis: [{ name: 'Loop crossover f_c', value: '50–250 kHz', tag: 'typ' }, { name: 'Phase margin', value: '45–60°', tag: 'typ' }, { name: 'Load-line R_LL', value: '~0.03–0.2 mΩ', tag: 'est' },
      { name: 'Load step', value: '≥ 50 % I_max in ≤ 1 µs', tag: 'est' }, { name: 'AVS resolution', value: '~5 mV', tag: 'typ' }],
    physics: `<div class="eq">T(s) = G_c(s)·G_mod·G_plant(s)·H(s)       crossover |T(j2πf_c)| = 1,  PM = 180° + ∠T(j2πf_c)
LC double pole:  f_0 = 1/(2π√((L/N)·C_out))
Transient droop components (step ΔI, rise t_r):
  ESL spike  ΔV₁ = ESL·ΔI/t_r            10 pH × 500 A / 0.5 µs = 10 mV
  ESR step   ΔV₂ = ESR·ΔI
  bulk droop ΔV₃ ≈ ΔI / (2π·f_c·C_out)   500 A / (2π·100 kHz·15 mF) ≈ 53 mV
  AVP final  ΔV_LL = R_LL·ΔI             50 µΩ × 500 A = 25 mV</div>`,
    failures: ['Low phase margin → ringing / oscillation on load steps', 'Noisy sense lines → jitter on Vcore', 'Broken sense line → regulator raises output (OVP must catch)', 'Mis-programmed AVS → under-voltage timing failures or wasted power', 'Beat frequencies between switching and periodic load patterns'],
    monitoring: ['READ_VOUT vs VOUT_COMMAND', 'Transient capture (some digital controllers record droop events)', 'OV/UV fault thresholds', 'BMC compares telemetry against AVS target'],
    hotspots: [{ target: 'power-stage-fet', x: 466, y: 66, w: 118, h: 58, label: 'Power stage' }, { target: 'pdn', x: 466, y: 166, w: 118, h: 58, label: 'L/C + PDN' },
      { target: 'adc', x: 196, y: 166, w: 118, h: 58, label: 'Sense & digitize' }, { target: 'sensing-feedback', x: 26, y: 166, w: 128, h: 58, label: 'All feedback loops' }],
    scene(g, api) {
      const K = kit(g, api), ct = K.layer('control'), pw = K.layer('power'), se = K.layer('sensing');
      K.box(ct, 30, 70, 90, 50, { d: 'control', label: 'V_ref', sub: 'AVS / VID', center: true, ls: 13 });
      K.mk('circle', { cx: 160, cy: 95, r: 14, style: 'fill:var(--panel2);stroke:var(--ctrl);stroke-width:1.5' }, ct); K.text(ct, 160, 100, 'Σ', { anchor: 'middle', size: 14 });
      K.box(ct, 200, 70, 110, 50, { d: 'control', label: 'G_c(s)', sub: 'compensator', center: true });
      K.box(ct, 340, 70, 100, 50, { d: 'control', label: 'PWM', sub: 'modulator', center: true });
      K.box(pw, 470, 70, 110, 50, { d: 'power', label: 'Power stage', sub: 'N phases', center: true });
      K.box(pw, 470, 170, 110, 50, { d: 'power', label: 'L / C_out', sub: 'PDN', center: true });
      K.box(pw, 330, 170, 110, 50, { d: 'power', label: 'Die load', sub: 'ΔI step', center: true, stroke: 'var(--accent)' });
      K.box(se, 200, 170, 110, 50, { d: 'sensing', label: 'Remote sense', sub: 'diff amp + ADC', center: true });
      K.box(ct, 30, 170, 120, 50, { d: 'control', label: 'Load-line', sub: '−R_LL · I_out', center: true });
      [[[120, 95], [146, 95]], [[174, 95], [200, 95]], [[310, 95], [340, 95]], [[440, 95], [470, 95]]].forEach(p => K.wire(ct, p, { d: 'control', arrow: true, w: 1.6, op: 0.9 }));
      K.wire(pw, [[525, 120], [525, 170]], { arrow: true, w: 2 }); K.wire(pw, [[470, 195], [440, 195]], { arrow: true, w: 2 });
      K.wire(se, [[330, 195], [310, 195]], { d: 'sensing', arrow: true, w: 1.6, op: 0.9 }); K.wire(se, [[255, 170], [255, 140], [160, 140], [160, 109]], { d: 'sensing', arrow: true, w: 1.6, op: 0.9 });
      K.wire(ct, [[90, 170], [90, 140], [150, 140], [152, 106]], { d: 'control', arrow: true, w: 1.3, dash: '3 3' });
      const imon = K.wire(se, [[580, 95], [600, 95], [600, 40], [390, 40], [390, 70]], { d: 'sensing', dash: '3 3', w: 1.3, arrow: true });
      const imt = K.text(se, 500, 34, 'inner current loop (IMON)', { size: 10.5, fill: 'var(--sense)', anchor: 'middle' });
      K.flow(ct, [[120, 95], [160, 95], [200, 95], [310, 95], [340, 95], [470, 95]], { d: 'control', color: 'var(--ctrl)', n: 6, r: 3, speed: 90 });
      K.flow(pw, [[525, 120], [525, 195], [440, 195]], { n: 4, r: 3.5, speed: 70 });
      K.flow(se, [[330, 195], [255, 195], [255, 140], [160, 140], [160, 109]], { d: 'sensing', color: 'var(--sense)', n: 5, r: 2.6, speed: 80 });
      const fim = K.flow(se, [[580, 95], [600, 95], [600, 40], [390, 40], [390, 70]], { color: 'var(--sense)', n: 4, r: 2.2, speed: 80 });
      const modes = [{ n: 'Voltage mode', fc: 60e3, fz: 35e3, fp: 600e3, td: 0.4e-6, lc: true }, { n: 'Current mode', fc: 110e3, fz: 25e3, fp: 900e3, td: 0.2e-6 }, { n: 'COT', fc: 200e3, fz: 40e3, fp: 2e6, td: 0.15e-6 }];
      let mi = 1;
      const desc = K.text(ct, 30, 296, '', { size: 11, fill: 'var(--muted)' });
      const bm = K.plot(se, 650, 40, 330, 230, { min: -40, max: 80, label: 'Loop gain |T| dB (violet) & phase (pink, −270…0°)', n: 200, color: 'var(--ctrl)', glow: true, vgrid: 5 });
      const bp = bm.trace({ color: 'var(--sense)', w: 1.5 }); bm.hline(0, { color: 'var(--muted)', label: '0 dB' });
      K.text(se, 650, 286, '100 Hz', { size: 10, fill: 'var(--muted)' }); K.text(se, 980, 286, '10 MHz', { size: 10, fill: 'var(--muted)', anchor: 'end' });
      const bdot = bm.dot({ color: 'var(--ctrl)' }), bcur = bm.cursor();
      const rFc = K.readout(se, 650, 300, 'crossover f_c', { d: 'control' }), rPm = K.readout(se, 770, 300, 'phase margin', { d: 'control' }), rG = K.readout(se, 880, 300, 'sweep |T|', { d: 'control', size: 13 });
      const TF = (f, m) => {
        const w = TAU * f, s = cx(0, w);
        let T = cdiv(cx(TAU * m.fc, 0), s); // integrator with crossover f_c
        T = cmul(T, cadd(cx(1), cdiv(cx(TAU * m.fz), s))); // low-freq boost zero
        T = cdiv(T, cadd(cx(1), cdiv(s, cx(TAU * m.fp)))); // HF pole
        T = cmul(T, cx(Math.cos(-w * m.td), Math.sin(-w * m.td)));
        if (m.lc) { const w0 = TAU * 15e3, r = w / w0; T = cmul(T, cdiv(cx(1 - r * r, r / 0.5), cx(1 - r * r, r / 3))); }
        return T;
      };
      let curve = [], fcm = 1e5, pm = 50;
      function recompute() {
        const m = modes[mi]; const mag = [], phs = []; curve = []; let prev = null; fcm = NaN; pm = NaN;
        for (let i = 0; i <= 200; i++) {
          const f = Math.pow(10, 2 + 5 * i / 200), T = TF(f, m), dB = 20 * Math.log10(cabs(T));
          let ph = carg(T) * 180 / Math.PI; if (ph > 0) ph -= 360;
          if (prev != null) { while (ph - prev > 180) ph -= 360; while (prev - ph > 180) ph += 360; } prev = ph;
          mag.push(dB); phs.push(-40 + (ph + 270) / 270 * 120); curve.push([i / 200, dB, f, ph]);
          if (isNaN(fcm) && dB < 0) { fcm = f; pm = 180 + ph; }
        }
        bm.set(mag); bp.set(phs); rFc.set(fmtSI(fcm, 'Hz', 0)); rPm.set(pm.toFixed(0) + '°'); rPm.color(pm < 45 ? 'var(--warn)' : 'var(--ctrl)');
        desc.textContent = ['Voltage mode: type-III comp. cancels the LC double pole (~15 kHz)', 'Current mode: inner current loop → first-order plant, natural phase balance', 'COT: on-time pulse on demand → highest bandwidth, variable frequency'][mi];
        const v = mi === 1 ? '' : 'none'; imon.style.display = v; imt.style.display = v; fim.on = mi === 1;
      }
      K.radio(ct, 30, 250, modes.map(m => m.n), 120, i => { mi = i; recompute(); }, 1);
      recompute();
      const dp = K.plot(pw, 30, 330, 590, 230, { min: 680, max: 800, label: 'Vcore at die (mV, yellow) · load current (pink) · AVP target (grey) — 200 ⇄ 700 A, ~µs scale', n: 400, color: 'var(--power)', glow: true });
      const di = dp.trace({ color: 'var(--sense)', w: 1.3, op: 0.7 }), llt = dp.trace({ color: 'var(--muted)', dash: '4 4', w: 1 });
      dp.hline(705, { label: 'V_min', color: 'var(--bad)' });
      K.readout(se, 650, 360, 'ESL spike', { d: 'sensing', init: '10 mV' });
      const rB = K.readout(se, 780, 360, 'bulk droop ΔI/2πf_cC', { d: 'sensing' });
      K.readout(se, 650, 420, 'load-line R_LL·ΔI', { d: 'sensing', init: '25 mV' });
      const rMin = K.readout(se, 780, 420, 'worst V_min', { d: 'sensing' });
      K.lines(se, 650, 480, ['ΔI = 500 A, t_r = 0.5 µs, ESL_eff = 10 pH,', 'C_out = 15 mF, R_LL = 50 µΩ, V_set = 790 mV (est.)'], { size: 10.5, fill: 'var(--muted)' });
      let since = 0, up = true, from = 200, worst = 800; const RLL = 0.05, dI = 500, C = 0.015, Vset = 790;
      K.tick((dt, t) => {
        const c = curve[Math.floor(((t * 0.12) % 1) * 200)]; if (c) { bdot.set(c[0], c[1]); bcur.set(c[0]); rG.set(c[1].toFixed(0) + ' dB @ ' + fmtSI(c[2], 'Hz', 0)); }
        const m = modes[mi], Vb = dI / (TAU * m.fc * C), wc = TAU * m.fc;
        rB.set(Vb.toFixed(0) + ' mV');
        for (let k = 0; k < 2; k++) {
          since += 0.12;
          if (since > 22) { since = 0; from = up ? 700 : 200; up = !up; if (up) worst = 800; }
          const sgn = up ? 1 : -1, x = since * 1e-6 * wc;
          const spike = since < 0.5 ? 10 : 0;
          const ring = pm < 55 ? Vb * 0.5 * Math.exp(-x / 3) * Math.sin(x * 1.6) * (55 - pm) / 20 : 0;
          const dev = spike + dI * RLL * (1 - Math.exp(-x)) + Math.max(0, Vb - dI * RLL * 0.5) * x * Math.exp(1 - x) * 0.7 + ring;
          const V = Vset - RLL * from - sgn * dev + CPO.randn() * 0.4;
          if (up) worst = Math.min(worst, V);
          const Inow = since < 0.5 ? from + sgn * dI * since / 0.5 : from + sgn * dI;
          dp.push(V); di.push(680 + Inow / 1000 * 100); llt.push(Vset - RLL * Inow);
        }
        rMin.set(worst.toFixed(0) + ' mV'); rMin.color(worst < 705 ? 'var(--bad)' : 'var(--good)');
      });
      K.cap0('Switch modes: higher f_c → smaller bulk droop; low phase margin → ringing. Loop models are illustrative, not a specific controller.');
    }
  });

  add({
    id: 'pdn', parent: 'vrm', domain: 'power', level: 4,
    title: 'Power Delivery Network (PDN)', subtitle: 'target impedance, decoupling hierarchy, plane inductance, resonances',
    summary: 'Between the VRM and the transistors sits a ladder of inductances (board planes, vias, BGA balls, package planes, bumps) and capacitances (bulk polymer, board MLCCs, package caps, on-die capacitance). Each capacitor stage holds the impedance down over roughly a decade of frequency; where one stage hands over to the next, LC anti-resonances create impedance peaks. The goal: |Z(f)| below the target impedance from DC to the highest frequency in the die current.',
    what: `<p><b>Target impedance</b>: Z_t = ΔV_allowed / ΔI. For 0.75 V with 3 % tolerance and a 500 A step: Z_t ≈ 45 µΩ ${CPO.badge('est')} — about the resistance of a few millimetres of thick copper plane.</p>
<p><b>Hierarchy</b> ${CPO.badge('typ')}:</p><ul>
<li><b>VRM</b> (DC → loop crossover ~100 kHz): looks like R_LL; above f_c it becomes inductive.</li>
<li><b>Bulk polymer caps</b> (mF total, ~100 kHz–1 MHz).</li>
<li><b>Board MLCCs</b> under/around the package (~1–30 MHz); effective ESL dominated by via and mounting loop.</li>
<li><b>Package capacitors</b> (land-side / die-side, ~10–100 MHz).</li>
<li><b>On-die capacitance</b> (MOS + MIM / deep-trench, µF-class on huge dies) — the only defence above ~100–200 MHz.</li></ul>
<p><b>First droop</b>: the die capacitance resonates with package/bump inductance, typically ~50–200 MHz ${CPO.badge('typ')}; it is the deepest, fastest dip in a load step and the VRM cannot help. Chips counter it with adaptive clocking (stretch the clock when droop detectors fire).</p>
<p><b>Damping</b> matters as much as capacitance: ESR lowers anti-resonance Q; many identical high-Q MLCCs make sharp peaks.</p>`,
    needs: ['|Z| < Z_t over the load-current spectrum', 'Many parallel low-inductance paths (thousands of bumps/balls, via arrays)', 'Staggered capacitor values with damping', 'MLCC DC-bias derating (−30…−70 %) accounted for', 'Measurement: VNA 2-port shunt-through, on-die droop detectors'],
    interfaces: [{ with: 'VRM', type: 'power', detail: 'source impedance R_LL + loop' }, { with: 'package-substrate', type: 'power', detail: 'planes, package caps, bumps' }, { with: 'asic-die', type: 'power', detail: 'on-die cap, switching current profile' }],
    kpis: [{ name: 'Target impedance', value: '~30–100 µΩ', tag: 'est' }, { name: 'First-droop resonance', value: '~50–200 MHz', tag: 'typ' }, { name: 'On-die cap (large die)', value: '~µF', tag: 'est' },
      { name: 'Package loop L', value: 'sub-pH…pH', tag: 'est' }, { name: 'MLCC DC-bias loss', value: '30–70 %', tag: 'typ' }],
    physics: `<div class="eq">Z_t = V_dd·tol / ΔI = 0.75 × 0.03 / 500 ≈ 45 µΩ
Capacitor:  Z_C = ESR + jωESL + 1/(jωC)        self-resonance f_SR = 1/(2π√(ESL·C))
Anti-resonance of L with C:  f_AR = 1/(2π√(L·C)),   Z_peak ≈ √(L/C)·Q
die–package: L = 0.5 pH, C = 3 µF → f ≈ 130 MHz,  √(L/C) ≈ 0.41 mΩ (≈9× Z_t before damping)
Plane inductance ≈ µ0·h per square   (h = 50 µm dielectric → ≈63 pH/□)</div>`,
    failures: ['Impedance peak coinciding with a periodic workload frequency → resonant noise build-up', 'Missing/cracked MLCCs → shifted resonance', 'Supply noise → SerDes jitter, OE heater noise, timing failures', 'Excessive Q from identical caps'],
    monitoring: ['On-die droop detectors / critical-path monitors (adaptive clocking)', 'VRM telemetry only sees low-frequency behaviour', 'Bench: VNA impedance, scope at sense points'],
    hotspots: [{ target: 'vrm-control-loop', x: 16, y: 84, w: 98, h: 82, label: 'VRM loop' }, { target: 'package-substrate', x: 538, y: 58, w: 114, h: 184, label: 'Package caps & planes' },
      { target: 'asic-die', x: 733, y: 58, w: 252, h: 184, label: 'On-die cap & die load' }],
    scene(g, api) {
      const K = kit(g, api), pw = K.layer('power'), se = K.layer('sensing'), ct = K.layer('control');
      const yr = 100, yg = 220;
      K.box(ct, 20, 88, 90, 74, { d: 'control', label: 'VRM', sub: 'R_LL + loop', center: true });
      K.wire(pw, [[110, yr], [880, yr]], { w: 3, op: 0.5 }); K.wire(pw, [[110, yg], [880, yg]], { w: 2, op: 0.3, color: 'var(--muted)' });
      const stg = [{ x: 220, n: 'C_bulk', s: '15 mF' }, { x: 400, n: 'C_MLCC', s: '2 mF' }, { x: 590, n: 'C_pkg', s: '200 µF' }, { x: 770, n: 'C_die', s: '3 µF' }];
      [[130, 'L_vrm'], [290, 'L_board'], [470, 'L_BGA/pkg'], [650, 'L_bump']].forEach(([x, l]) => { K.mk('rect', { x: x - 4, y: yr - 10, width: 76, height: 20, style: 'fill:var(--bg)' }, pw); K.coil(pw, x, yr, 68, { n: 4 }); K.text(pw, x + 34, yr - 16, l, { anchor: 'middle', size: 10.5, fill: 'var(--muted)' }); });
      const capg = stg.map(s => { const gg = K.cap(pw, s.x, yr, { len: yg - yr, wd: 22 }); K.text(pw, s.x + 16, 160, s.n, { size: 11 }); K.text(pw, s.x + 16, 174, s.s, { size: 10.5, fill: 'var(--muted)' }); return gg; });
      K.box(pw, 880, 70, 100, 170, { d: 'power', label: 'Die', sub: 'i(t) load', center: true, stroke: 'var(--accent)' });
      K.box(pw, 540, 60, 110, 180, { d: 'power', dash: '3 4', fill: 'rgba(0,0,0,0)', op: 0.6 }); K.text(pw, 595, 254, 'package', { anchor: 'middle', size: 10.5, fill: 'var(--muted)' });
      K.box(pw, 735, 60, 140, 180, { d: 'power', dash: '3 4', fill: 'rgba(0,0,0,0)', op: 0.6 }); K.text(pw, 805, 254, 'die', { anchor: 'middle', size: 10.5, fill: 'var(--muted)' });
      const fsrc = [K.flow(pw, [[110, yr], [880, yr]], { n: 12, r: 3 })].concat(stg.map(s => K.flow(pw, [[s.x, yr + 14], [s.x, yr], [880, yr]], { n: 6, r: 3.2, speed: 90, color: 'var(--sense)' })));
      let dieX = 1, mlccX = 1;
      const Zc = (w, C, R, L) => cadd(cx(R, w * L), cdiv(cx(1), cx(0, w * C)));
      const Zs = (w, R, L) => cx(R, w * L);
      const Zat = f => {
        const w = TAU * f;
        let z = cadd(Zs(w, 40e-6, 80e-12), Zs(w, 20e-6, 30e-12));
        z = cpar(Zc(w, 15e-3, 30e-6, 15e-12), z); z = cadd(z, Zs(w, 10e-6, 20e-12));
        z = cpar(Zc(w, 2e-3 * mlccX, 20e-6 / mlccX, 3e-12 / mlccX), z); z = cadd(z, Zs(w, 10e-6, 3e-12));
        z = cpar(Zc(w, 200e-6, 30e-6, 1e-12), z); z = cadd(z, Zs(w, 8e-6, 0.5e-12));
        return cpar(Zc(w, 3e-6 * dieX, 15e-6, 0), z);
      };
      const zp = K.plot(se, 70, 300, 600, 250, { min: -6, max: -2, label: '|Z(f)| seen by the die — log-log, 10 kHz … 1 GHz', n: 240, color: 'var(--power)', glow: true, vgrid: 5, grid: 4 });
      ['1 µΩ', '10 µΩ', '100 µΩ', '1 mΩ', '10 mΩ'].forEach((l, i) => K.text(se, 64, 554 - i * 62.5, l, { size: 10, anchor: 'end', fill: 'var(--muted)' }));
      ['10k', '100k', '1M', '10M', '100M', '1G'].forEach((l, i) => K.text(se, 70 + i * 120, 568, l, { size: 10, anchor: 'middle', fill: 'var(--muted)' }));
      const Zt = 45e-6; zp.hline(Math.log10(Zt), { label: 'Z_target 45 µΩ', color: 'var(--bad)' });
      const zd = zp.dot({ color: 'var(--sense)' }), zc = zp.cursor();
      let curve = [];
      const recompute = () => { curve = []; const v = []; for (let i = 0; i <= 240; i++) { const f = Math.pow(10, 4 + 5 * i / 240), z = cabs(Zat(f)); curve.push([f, z]); v.push(Math.log10(z)); } zp.set(v); };
      recompute();
      const B1 = K.button(ct, 700, 300, 130, 'on-die cap ×2', () => { dieX = dieX === 1 ? 2 : 1; B1.set(dieX === 2); recompute(); });
      const B2 = K.button(ct, 840, 300, 140, 'remove ½ MLCCs', () => { mlccX = mlccX === 1 ? 0.5 : 1; B2.set(mlccX === 0.5); recompute(); });
      const rF = K.readout(se, 700, 345, 'frequency', { d: 'sensing' }), rZ = K.readout(se, 850, 345, '|Z| / Z_target', { d: 'sensing' });
      const rD = K.readout(se, 700, 405, 'dominant element', { d: 'power', size: 15 });
      K.lines(se, 700, 470, ['Z_t = ΔV/ΔI = 0.75·3 % / 500 A ≈ 45 µΩ', 'die–pkg resonance ≈ 1/2π√(0.5 pH·3 µF) ≈ 130 MHz', 'Element values are illustrative estimates.'], { size: 10.5, fill: 'var(--muted)' });
      K.tick(t0 => {
        const t = (K._t = (K._t || 0) + t0);
        const i = Math.floor(((t * 0.06) % 1) * 240), c = curve[i]; if (!c) return;
        zd.set(i / 240, Math.log10(c[1])); zc.set(i / 240);
        rF.set(fmtSI(c[0], 'Hz', 1)); const r = c[1] / Zt; rZ.set(r.toFixed(2) + '×'); rZ.color(r > 1 ? 'var(--bad)' : 'var(--good)');
        const f = c[0], dom = f < 2e5 ? 0 : f < 2e6 ? 1 : f < 2e7 ? 2 : f < 1e8 ? 3 : 4;
        rD.set(['VRM (loop)', 'bulk caps', 'board MLCCs', 'package caps', 'on-die cap'][dom]);
        fsrc.forEach((F, k) => { F.op = k === dom ? 1 : 0.12; F.speed = k === dom ? 70 + 40 * k : 30; });
        capg.forEach((cg, k) => { cg.setAttribute('filter', k + 1 === dom ? K.glow : 'none'); });
      });
      K.cap0('A frequency cursor sweeps |Z|; current is drawn from whichever stage dominates at that frequency. Peaks above the red line = droop risk.');
    }
  });

  add({
    id: 'power-sequencing', parent: 'power-delivery', domain: 'control', level: 3,
    title: 'Power Sequencing & PMBus Telemetry', subtitle: 'CPLD-driven rail order, PGOOD chain, lasers last, LINEAR16 telemetry',
    summary: 'Rails must come up (and go down) in a defined order: standby power for the BMC/CPLD, then the core, then SerDes/IO, then optical-engine electronics and heaters, and only when everything is good the external lasers. The CPLD runs this as a hardware state machine checking PGOOD at each step, with timeouts that latch faults; the BMC reads every converter over PMBus and logs anomalies.',
    what: `<p><b>Why order matters</b> ${CPO.badge('typ')}: I/O ESD diodes forward-biasing into unpowered rails (latch-up), analog blocks needing bias before signals, PLLs requiring a stable core, and <b>laser safety</b>: CW laser light should only be enabled when the engines are powered, rings controllable, and fibers/connectors in place.</p>
<p><b>Typical sequence</b>: 54 V in → 3.3 V standby (BMC, CPLD, sensors) → BMC boots → host "power on" → IBC → Vcore (soft-start ~1–3 ms, monotonic) → SerDes analog/PLL → I/O (1.2/1.8/3.3 V) → OE EIC rails → heater rails (rings parked) → PGOOD all → release resets → PCIe link up → SDK init → ELS enable per port → ring lock → link training.</p>
<p><b>Power-down</b> is the reverse; on a fault the CPLD can do an emergency shutdown (THERMTRIP, OVP) in microseconds without software.</p>
<p><b>PMBus</b>: SMBus transactions with standardized commands: READ_VIN (0x88), READ_VOUT (0x8B), READ_IOUT (0x8C), READ_TEMPERATURE_1 (0x8D), STATUS_WORD (0x79), VOUT_COMMAND (0x21). VOUT uses LINEAR16 (mantissa × 2^N, N from VOUT_MODE); most other values LINEAR11 (5-bit exponent, 11-bit mantissa).</p>`,
    needs: ['Deterministic hardware sequencer independent of software', 'PGOOD and timeout per rail', 'Fault latching with first-fault capture', 'Always-on standby domain for management', 'Laser-enable interlock'],
    interfaces: [{ with: 'All regulators', type: 'mgmt', detail: 'EN, PGOOD, PMBus address' }, { with: 'BMC', type: 'mgmt', detail: 'power on/off requests, fault logs' }, { with: 'ASIC / OEs', type: 'electrical', detail: 'resets, PCIe PERST#' }, { with: 'ELS modules', type: 'mgmt', detail: 'laser enable / disable' }],
    kpis: [{ name: 'Rails sequenced', value: '10–40', tag: 'est' }, { name: 'Soft-start', value: '0.5–5 ms / rail', tag: 'typ' }, { name: 'Emergency off', value: '< 10 µs', tag: 'typ' }, { name: 'PMBus clock', value: '100 k–1 MHz', tag: 'typ' }],
    physics: `<div class="eq">LINEAR16:  V = mantissa × 2^N     (N from VOUT_MODE, e.g. −12)
           0x0C00 = 3072 → 3072 × 2⁻¹² = 0.750 V
LINEAR11:  X = Y × 2^N   (Y: 11-bit two's complement, N: 5-bit two's complement)
Soft-start charging current:  I = C_out · V / t_ss   (15 mF × 0.75 V / 2 ms ≈ 5.6 A)</div>`,
    failures: ['Rail never reaches PGOOD → sequencer timeout → fault latched & logged', 'Glitching PGOOD → spurious resets; debounce', 'Out-of-order power-down → back-powering', 'PMBus hang → BMC loses telemetry; bus recovery and watchdog'],
    monitoring: ['CPLD registers: state, first-fault, PGOOD snapshot', 'BMC polling of PMBus every ~0.1–1 s', 'ALERT# line for instant fault notification', 'SEL / Redfish log entries'],
    hotspots: [{ target: 'cpld', x: 14, y: 36, w: 244, h: 530, label: 'CPLD sequencer' }, { target: 'mgmt-buses', x: 276, y: 486, w: 710, h: 88, label: 'PMBus / SMBus' }],
    scene(g, api) {
      const K = kit(g, api), ct = K.layer('control'), pw = K.layer('power'), se = K.layer('sensing');
      const states = ['STANDBY (3V3_AUX)', 'BMC READY', 'MAIN_EN → IBC', 'VCORE ramp', 'SerDes / IO rails', 'OE EIC rails', 'Ring heaters (parked)', 'PGOOD_ALL', 'RESET release / PCIe', 'ELS laser enable', 'RUN'];
      K.box(ct, 20, 40, 232, 520, { d: 'control', label: 'CPLD state machine' });
      const sb = states.map((s, i) => K.box(ct, 32, 68 + i * 44, 208, 34, { d: 'control', label: s, ls: 12, center: true }));
      const rows = [['54V_IN', 0, 0.02], ['3V3_AUX', 0.03, 0.03], ['12V_IBC', 0.15, 0.04], ['VCORE', 0.22, 0.06], ['VDD_SERDES', 0.32, 0.04], ['VIO_1V8', 0.37, 0.03], ['OE_EIC', 0.43, 0.04], ['OE_HEATER', 0.50, 0.03], ['PGOOD_ALL', 0.57, 0.005], ['RESET_N', 0.63, 0.005], ['PCIe LINK', 0.70, 0.01], ['ELS_LASER', 0.80, 0.05]];
      const x0 = 390, w = 580, y0 = 50, rh = 35;
      K.text(ct, 290, 44, 'Timing (not to scale, ~100 ms total)', { size: 11, fill: 'var(--muted)' });
      const live = rows.map((r, i) => {
        const y = y0 + i * rh + 24, dom = i >= 8 && i <= 10 ? 'control' : i === 11 ? 'optics' : 'power';
        K.text(ct, 288, y - 4, r[0], { size: 11, mono: true, fill: 'var(--muted)' });
        const pts = [[0, y], [r[1], y], [r[1] + r[2], y - 18], [1, y - 18]].map(p => [x0 + p[0] * w, p[1]]);
        K.wire(pw, pts, { color: 'var(--line)', w: 1.5, op: 0.9 });
        return { el: K.wire(pw, pts, { color: K.C(dom), w: 2.2, op: 1, glow: true }), pts };
      });
      const cur = K.mk('line', { x1: x0, x2: x0, y1: 46, y2: 470, style: 'stroke:var(--text);opacity:.4' }, ct);
      K.box(ct, 280, 490, 700, 80, { d: 'control', label: 'PMBus READ_VOUT transaction (BMC → Vcore controller @0x40)' });
      const fr = ['S', '0x40 W', 'A', '0x8B', 'A', 'Sr', '0x40 R', 'A', '0x00', 'A', '0x0C', 'NA', 'P'];
      const fw = [22, 58, 22, 48, 22, 26, 58, 22, 46, 22, 46, 28, 22];
      let fx = 292; const fb = fr.map((f, i) => { const b = K.box(ct, fx, 520, fw[i], 24, { d: i >= 8 && i <= 10 ? 'sensing' : 'control', label: f, center: true, ls: 10.5, rx: 3 }); fx += fw[i] + 3; return b; });
      const dec = K.text(se, 820, 536, '', { size: 11.5, mono: true, fill: 'var(--sense)' });
      K.text(se, 820, 556, 'LINEAR16, N = −12', { size: 10, fill: 'var(--muted)' });
      const thr = [0, 0.03, 0.15, 0.22, 0.32, 0.43, 0.50, 0.57, 0.63, 0.80, 0.86];
      K.tick((dt, t) => {
        const f = (t % 12) / 12, xs = x0 + f * w;
        cur.setAttribute('x1', xs); cur.setAttribute('x2', xs);
        live.forEach(L => { const pts = []; for (const p of L.pts) { if (p[0] <= xs) pts.push(p); else { const a = pts[pts.length - 1]; if (a) { const k = (xs - a[0]) / ((p[0] - a[0]) || 1); pts.push([xs, a[1] + (p[1] - a[1]) * k]); } break; } } L.el.setAttribute('d', pts.length > 1 ? P(pts) : 'M0 0'); });
        let si = 0; thr.forEach((v, i) => { if (f >= v) si = i; });
        sb.forEach((b, i) => { b.rect.style.fill = i === si ? 'rgba(167,139,250,.35)' : ''; b.rect.setAttribute('filter', i === si ? K.glow : 'none'); });
        const k = Math.floor(((t % 3) / 3) * (fr.length + 3));
        fb.forEach((b, i) => { b.rect.style.fill = i === k ? 'rgba(167,139,250,.5)' : i < k ? 'rgba(167,139,250,.15)' : ''; });
        dec.textContent = k >= fr.length ? '0x0C00 → 0.750 V' : '…';
      });
      K.cap0('Lasers are enabled last — only after every rail is good, resets are released and the engines are under control.');
    }
  });

  /* ================================================================== THERMAL */
  add({
    id: 'thermal-system', parent: 'switch-chassis', domain: 'thermal', level: 2,
    title: 'Thermal System (Liquid Cooling)', subtitle: 'cold plate over ASIC + OEs, manifold, QDs, CDU; θ network',
    summary: 'The CPO switches are liquid-cooled: a cold plate sits on the package (ASIC plus the ring of optical engines), coolant flows through chassis tubing and dripless quick-disconnects to a rack manifold and a CDU that rejects the heat to facility water. The thermal system must keep the ASIC junction below its limit and — just as important for CPO — keep the optical engines at a stable temperature, because micro-ring resonances move ≈0.07–0.1 nm per kelvin.',
    what: `<p><b>Liquid cooling</b> ${CPO.badge('nv')}: Quantum-X Photonics switches are announced as liquid-cooled. Heat path ${CPO.badge('typ')}: junction → die → TIM1 → lid (or direct-die) → TIM2 → cold-plate base → fins → coolant → CDU heat exchanger → facility water.</p>
<p><b>Why liquid?</b> Water's volumetric heat capacity is ~3500× that of air. A ~1 kW package at ~100+ W/cm² average (hot spots 2–3× higher) cannot be cooled by air within the allowed ΔT and acoustics; liquid also gives a <b>stable, low-variance temperature</b> for the optics.</p>
<p><b>Optics temperature matters</b>: Si dn/dT ≈ 1.8e-4 /K shifts ring resonances by ≈0.07–0.1 nm/K, while a ring linewidth is only ~0.1 nm (λ/Q, Q ≈ 10k). Heaters lock the rings (ring-lock-loop), but every kelvin of drift costs heater power and tuning range. Lasers are hosted in front-panel ELS modules ${CPO.badge('nv')} partly so they stay cool: laser efficiency and lifetime fall steeply with temperature.</p>
<p><b>Air side</b>: fans still cool PSUs, ELS modules and residual components in many liquid-cooled designs ${CPO.badge('typ')}.</p>`,
    needs: ['Low total θ junction→coolant (≈0.03–0.06 K/W for ~1 kW)', 'Adequate flow (~1.5 L/min per kW at ΔT ≈ 10 K)', 'Uniform & stable OE temperatures', 'Leak-free, serviceable connections', 'Inlet temperature above dew point'],
    interfaces: [{ with: 'switch-package', type: 'thermal', detail: 'TIM + cold plate on ASIC and OEs' }, { with: 'Rack manifold / CDU', type: 'thermal', detail: 'supply/return via QDs' },
      { with: 'BMC', type: 'mgmt', detail: 'temperatures, flow, pressure, leak, pump/fan control' }, { with: 'power-delivery', type: 'thermal', detail: 'VRM losses also cooled' }],
    kpis: [{ name: 'Cooling', value: 'liquid-cooled', tag: 'nv' }, { name: 'Package power', value: '~0.5–1.5 kW', tag: 'est' }, { name: 'Avg heat flux (ASIC)', value: '~50–150 W/cm²', tag: 'est' },
      { name: 'Coolant inlet', value: '25–45 °C', tag: 'typ' }, { name: 'Coolant ΔT', value: '~5–15 K', tag: 'typ' }, { name: 'Ring drift', value: '0.07–0.1 nm/K', tag: 'typ' }],
    physics: `<div class="eq">Q = ṁ·c_p·ΔT_coolant      1 kW, ΔT 10 K, water → ṁ = 0.024 kg/s ≈ 1.44 L/min
T_j = T_in + Q·(θ_jc + θ_TIM + θ_cp) + Q/(2ṁc_p)
heat flux q" = Q/A = 1000 W / 8 cm² ≈ 125 W/cm²
Δλ_ring = λ·(∂n_eff/∂T)/n_g·ΔT ≈ 0.08 nm/K</div>`,
    failures: ['Flow loss (pump, QD not latched, clog) → rapid Tj rise → throttle / THERMTRIP', 'TIM pump-out/voids → hot spots', 'Leak → leak sensors → isolate & shutdown', 'Condensation if inlet below dew point', 'OE temperature gradients → rings out of heater range'],
    monitoring: ['ASIC on-die sensors, OE sensors, coolant inlet/outlet, flow, pressure (sensing-feedback)', 'thermal-control-loop: pump/fan PID, ASIC throttling', 'Leak detection'],
    hotspots: [{ target: 'cold-plate', x: 290, y: 100, w: 400, h: 150, label: 'Cold plate' }, { target: 'tim', x: 290, y: 252, w: 400, h: 40, label: 'TIM layers' },
      { target: 'coolant-loop', x: 720, y: 60, w: 270, h: 250, label: 'Coolant loop / CDU' }, { target: 'thermal-control-loop', x: 20, y: 60, w: 250, h: 120, label: 'Thermal control' },
      { target: 'switch-package', x: 290, y: 294, w: 400, h: 60, label: 'Package' }],
    scene(g, api) {
      const K = kit(g, api), th = K.layer('thermal'), se = K.layer('sensing'), ct = K.layer('control');
      // package + cold plate cross-section
      K.box(th, 300, 300, 380, 50, { d: 'mechanical', label: 'substrate', ls: 11 });
      const asic = K.mk('rect', { x: 420, y: 268, width: 140, height: 32, rx: 2, style: 'fill:#334155' }, th);
      K.text(th, 490, 289, 'ASIC', { anchor: 'middle', size: 11 });
      const oes = [330, 370, 580, 620].map(x => { K.mk('rect', { x, y: 276, width: 32, height: 24, rx: 2, style: 'fill:#3b2a20' }, th); K.text(th, x + 16, 292, 'OE', { anchor: 'middle', size: 9 }); return x; });
      K.mk('rect', { x: 300, y: 258, width: 380, height: 10, style: 'fill:var(--therm);opacity:.35' }, th); K.text(th, 690, 266, 'TIM', { size: 10, fill: 'var(--muted)' });
      K.box(th, 300, 110, 380, 148, { d: 'thermal', label: 'Cold plate (Cu, microchannels)' });
      for (let i = 0; i < 28; i++) K.mk('rect', { x: 312 + i * 13, y: 170, width: 5, height: 84, style: 'fill:#b87333;opacity:.6' }, th);
      // heat rising
      const heat = [];
      for (let i = 0; i < 7; i++) heat.push(K.flow(th, [[440 + i * 17, 268], [440 + i * 17, 170]], { color: 'var(--therm)', n: 3, r: 2.4, speed: 40 }));
      oes.forEach(x => K.flow(th, [[x + 16, 276], [x + 16, 180]], { color: '#fb923c', n: 2, r: 2, speed: 25 }));
      // coolant
      const Tin = 35; let Tout = 45;
      const loop = [[300, 150], [300, 140], [690, 140], [720, 140], [720, 80], [960, 80], [960, 290], [720, 290], [720, 160], [690, 160]];
      K.wire(th, [[690, 140], [720, 140], [720, 80], [960, 80], [960, 290], [720, 290], [720, 160], [690, 160]], { color: 'var(--data)', w: 8, op: 0.25 });
      K.mk('path', { d: 'M690 140 L300 140 L300 160 L690 160', style: 'fill:none;stroke:var(--data);stroke-width:5;opacity:.18' }, th);
      const cf = K.flow(th, [[690, 160], [310, 160], [310, 140], [690, 140], [720, 140], [720, 80], [960, 80], [960, 290], [720, 290], [720, 160], [690, 160]], { n: 46, r: 3.4, speed: 80 });
      K.box(th, 780, 120, 160, 120, { d: 'thermal', label: 'Rack manifold → CDU', sub: 'pump · HX · filter' });
      K.text(th, 735, 72, 'QD', { size: 10.5, fill: 'var(--muted)' }); K.text(th, 735, 306, 'QD', { size: 10.5, fill: 'var(--muted)' });
      K.text(th, 850, 268, 'facility water ⇄', { anchor: 'middle', size: 11, fill: 'var(--data)' });
      // θ network
      K.text(th, 30, 380, 'Thermal resistance network (ASIC, estimates)', { size: 12, fill: 'var(--muted)' });
      const nodes = [['T_j', 60], ['T_case', 220], ['T_cp', 380], ['T_fluid', 540], ['T_in', 700]];
      const th_ = [['θ_jc 0.020', 140], ['θ_TIM 0.012', 300], ['θ_cp-fl 0.018', 460], ['1/2ṁc_p', 620]];
      const circ = nodes.map(([l, x]) => { const c = K.mk('circle', { cx: x, cy: 430, r: 20, filter: K.glow, style: 'fill:var(--therm)' }, th); K.text(th, x, 470, l, { anchor: 'middle', size: 11 }); return [c, K.text(th, x, 434, '', { anchor: 'middle', size: 10, mono: true, fill: '#000' })]; });
      th_.forEach(([l, x]) => { K.mk('rect', { x: x - 40, y: 424, width: 80, height: 12, rx: 3, style: 'fill:none;stroke:var(--therm);stroke-width:1.5' }, th); K.text(th, x, 416, l, { anchor: 'middle', size: 10, fill: 'var(--muted)' }); });
      K.wire(th, [[80, 430], [680, 430]], { color: 'var(--therm)', w: 1, op: 0.4 });
      K.flow(th, [[80, 430], [680, 430]], { color: 'var(--therm)', n: 14, r: 2.4, speed: 70 });
      const rQ = K.readout(se, 780, 380, 'ASIC power (workload)', { color: 'var(--therm)' }), rF = K.readout(se, 780, 430, 'flow (ṁ for ΔT)', { d: 'data', color: 'var(--data)' });
      const rDr = K.readout(se, 780, 480, 'OE ring drift if ±ΔT', { d: 'optics', color: 'var(--optic)' });
      // control box
      K.box(ct, 20, 60, 250, 110, { d: 'control', label: 'Thermal control', sub: 'pump/fan PID · throttling · alarms' });
      const sTj = K.sensor(se, 490, 284, { label: 'T_j', dy: -16, dx: -6 }); K.sensor(se, 346, 288, { label: 'T_OE', dy: -16, dx: -12 });
      K.sensor(se, 705, 140, { label: 'T_out', dy: -12 }); K.sensor(se, 705, 160, { label: 'T_in', dy: 22 });
      K.wire(ct, [[270, 115], [300, 115]], { d: 'control', dash: '3 3', w: 1.2 });
      K.tick((dt, t) => {
        const Q = 800 + 300 * Math.sin(t * 0.35) + 80 * Math.sin(t * 1.7), flow = 1.6; // L/min
        const mdot = flow / 60 * 1.0, dT = Q / (mdot * 4000); Tout = Tin + dT;
        const Tf = Tin + dT / 2, Tcp = Tf + Q * 0.018, Tc = Tcp + Q * 0.012, Tj = Tc + Q * 0.02;
        [Tj, Tc, Tcp, Tf, Tin].forEach((T, i) => { circ[i][0].style.fill = tcol(T, 30, 95); circ[i][1].textContent = T.toFixed(0) + '°'; });
        rQ.set(Q.toFixed(0) + ' W'); rF.set(flow.toFixed(1) + ' L/min · ΔT ' + dT.toFixed(1) + ' K'); rDr.set('±' + (0.08 * 3).toFixed(2) + ' nm @ ±3 K');
        asic.style.fill = tcol(Tj, 30, 95);
        cf.colorAt = (fr, i) => { // along path: cold side 0..~0.27 under plate heating, then return
          const p = fr; let T = Tin; if (p < 0.3) T = Tin + (p / 0.3) * dT; else if (p < 0.55) T = Tout; else if (p < 0.85) T = Tout - (p - 0.55) / 0.3 * dT; return tcol(T, Tin - 2, Tin + 14); };
        heat.forEach(h => { h.speed = 25 + Q / 25; });
      });
      K.cap0('Coolant particles are coloured by temperature (blue cold → red hot). Power/flow/θ values are estimates.');
    }
  });

  add({
    id: 'cold-plate', parent: 'thermal-system', domain: 'thermal', level: 3,
    title: 'Cold Plate', subtitle: 'skived/microchannel copper, split-flow over the ASIC, OE zones',
    summary: 'The cold plate is a copper block with hundreds of fine fins (microchannels ~0.1–0.3 mm) machined or skived into its base. Coolant enters over the hottest region (often center-fed "split flow") and exits at the edges. Its convective resistance, spreading resistance and pressure drop are traded against each other; in CPO it must also cover optical engines that sit at different heights and need temperature stability rather than just a low temperature.',
    what: `<p><b>Heat transfer</b> ${CPO.badge('typ')}: fins multiply the wetted area 5–20×; laminar flow in narrow channels gives high h because h = Nu·k/D_h scales as 1/D_h. Effective h on the base area of 20–100 kW/m²·K is achievable.</p>
<p><b>Split flow / jet impingement</b> brings the coldest fluid to the die center (hot spot), halving the flow length and pressure drop.</p>
<p><b>Spreading</b>: the base (1–3 mm Cu) spreads heat from a hot spot; vapor chambers or embedded heat pipes can help.</p>
<p><b>CPO specifics</b> ${CPO.badge('est')}: the ASIC and the OEs may have separate pedestals or separate cold-plate zones because of height tolerances; OE zones see lower flux but tighter stability requirements. Downstream OEs see warmer coolant — flow routing must equalize them.</p>`,
    needs: ['Low θ_cp (≈0.01–0.03 K/W for kW-class)', 'Acceptable ΔP (≈10–50 kPa)', 'Flatness/height control for TIM bond lines', 'Filtration (fine channels clog)', 'Corrosion-compatible wetted materials'],
    interfaces: [{ with: 'TIM / package', type: 'thermal', detail: 'base contact with controlled pressure' }, { with: 'coolant-loop', type: 'thermal', detail: 'inlet/outlet tubes' }, { with: 'Mechanical', type: 'mechanical', detail: 'loading springs / bolster' }],
    kpis: [{ name: 'θ cold plate', value: '0.01–0.03 K/W', tag: 'typ' }, { name: 'Fin pitch', value: '0.1–0.3 mm', tag: 'typ' }, { name: 'ΔP', value: '10–50 kPa', tag: 'typ' }, { name: 'h (effective)', value: '20–100 kW/m²K', tag: 'typ' }],
    physics: `<div class="eq">R_conv = 1 / (h · A_wet · η_fin)        η_fin = tanh(mL)/(mL),  m = √(2h/(k·t))
h = Nu · k_fluid / D_h       (laminar, Nu ≈ 4–8;  D_h = 0.2 mm, k = 0.6 → h ≈ 18 kW/m²K)
ΔP = f·(L/D_h)·ρv²/2          P_pump = ΔP · V̇   (30 kPa × 1.5 L/min ≈ 0.75 W)</div>`,
    failures: ['Channel clogging (debris, biofilm) → hot spot; filters, coolant chemistry', 'Non-flat base → thick TIM → θ up', 'Erosion/corrosion over years', 'Uneven flow split → OE temperature gradient'],
    monitoring: ['Inlet/outlet temperature & ΔP across plate', 'ASIC/OE sensor temperatures vs power (θ trending)', 'Flow meter'],
    hotspots: [{ target: 'tim', x: 30, y: 470, w: 420, h: 100, label: 'TIM interface' }, { target: 'coolant-loop', x: 860, y: 60, w: 130, h: 80, label: 'Coolant loop' }, { target: 'temp-sensor', x: 470, y: 470, w: 200, h: 100, label: 'Temperature sensors' }],
    scene(g, api) {
      const K = kit(g, api), th = K.layer('thermal'), se = K.layer('sensing');
      K.text(th, 30, 40, 'Top view: split-flow cold plate over package (temperature map underneath)', { size: 12, fill: 'var(--muted)' });
      const X = 60, Y = 60, W = 760, H = 380, cols = 38, rows = 19, cells = [];
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) cells.push({ i, j, el: K.mk('rect', { x: X + i * W / cols, y: Y + j * H / rows, width: W / cols + 0.5, height: H / rows + 0.5, style: 'fill:#000' }, th) });
      K.mk('rect', { x: X + 240, y: Y + 110, width: 280, height: 160, style: 'fill:none;stroke:#fff;stroke-width:1;opacity:.5;stroke-dasharray:4 3' }, th);
      K.text(th, X + 380, Y + 105, 'ASIC', { anchor: 'middle', size: 11 });
      const oe = [[60, 30], [60, 290], [560, 30], [560, 290], [240, 20], [440, 300]];
      oe.forEach(([x, y]) => { K.mk('rect', { x: X + x, y: Y + y, width: 140, height: 60, style: 'fill:none;stroke:#fdba74;stroke-width:1;opacity:.6;stroke-dasharray:3 3' }, th); K.text(th, X + x + 70, Y + y + 34, 'OE', { anchor: 'middle', size: 10, fill: '#fdba74' }); });
      for (let i = 1; i < 30; i++) K.mk('line', { x1: X + i * W / 30, x2: X + i * W / 30, y1: Y, y2: Y + H, style: 'stroke:#b87333;stroke-width:1.2;opacity:.35' }, th);
      // coolant: center inlet manifold slot, flows up & down to edges
      const flows = [];
      for (let i = 0; i < 14; i++) {
        const x = X + 30 + i * 52;
        flows.push(K.flow(th, [[x, Y + H / 2], [x, Y + 6]], { n: 4, r: 2.6, speed: 55 }));
        flows.push(K.flow(th, [[x, Y + H / 2], [x, Y + H - 6]], { n: 4, r: 2.6, speed: 55 }));
      }
      K.mk('rect', { x: X, y: Y + H / 2 - 4, width: W, height: 8, style: 'fill:var(--data);opacity:.5' }, th);
      K.text(th, X + W + 8, Y + H / 2 + 4, '← inlet', { size: 11, fill: 'var(--data)' });
      K.text(th, X + W + 8, Y + 14, 'outlet →', { size: 11, fill: 'var(--therm)' }); K.text(th, X + W + 8, Y + H - 4, 'outlet →', { size: 11, fill: 'var(--therm)' });
      K.box(th, 860, 60, 130, 80, { d: 'thermal', label: 'Coolant loop', sub: 'to manifold', center: true });
      // side section
      K.box(th, 30, 470, 420, 100, { d: 'thermal', label: 'Side section: base + fins + TIM + die' });
      for (let i = 0; i < 26; i++) K.mk('rect', { x: 45 + i * 15, y: 495, width: 6, height: 40, style: 'fill:#b87333' }, th);
      K.mk('rect', { x: 40, y: 535, width: 400, height: 10, style: 'fill:#b87333' }, th);
      K.mk('rect', { x: 120, y: 545, width: 240, height: 5, style: 'fill:var(--therm);opacity:.6' }, th);
      K.mk('rect', { x: 120, y: 550, width: 240, height: 14, style: 'fill:#334155' }, th);
      K.box(se, 470, 470, 200, 100, { d: 'sensing', label: 'Sensors', sub: 'on-die diodes, OE temp, T_in/T_out' });
      const rT = K.readout(se, 700, 480, 'ASIC hot spot', { color: 'var(--therm)' }), rO = K.readout(se, 840, 480, 'OE spread', { color: 'var(--optic)' });
      const rP = K.readout(se, 700, 530, 'ΔP / pump power', { d: 'data', color: 'var(--data)' });
      K.tick((dt, t) => {
        const load = 0.75 + 0.25 * Math.sin(t * 0.5);
        let mx = 0, oeMin = 99, oeMax = 0;
        cells.forEach(c => {
          const u = (c.i + 0.5) / cols, v = (c.j + 0.5) / rows;
          const dx = (u - 0.5) / 0.18, dy = (v - 0.5) / 0.22;
          let T = 36 + 30 * load * Math.exp(-(dx * dx + dy * dy) / 2) + 6 * Math.abs(v - 0.5) * 2; // warmer downstream
          T += 8 * load * Math.exp(-(((u - 0.47) / 0.05) ** 2 + ((v - 0.45) / 0.06) ** 2)); // hotspot
          const inOE = oe.some(([x, y]) => u * W >= x && u * W <= x + 140 && v * H >= y && v * H <= y + 60);
          if (inOE) { T = 38 + 4 * load + 5 * Math.abs(v - 0.5) * 2; oeMin = Math.min(oeMin, T); oeMax = Math.max(oeMax, T); }
          mx = Math.max(mx, T); c.el.style.fill = tcol(T, 32, 85);
        });
        rT.set(mx.toFixed(1) + ' °C'); rO.set((oeMax - oeMin).toFixed(1) + ' K → ' + ((oeMax - oeMin) * 0.08).toFixed(2) + ' nm'); rP.set('30 kPa · 0.75 W');
        flows.forEach(f => { f.colorAt = fr => tcol(36 + fr * 12 * load, 32, 60); });
      });
      K.cap0('Illustrative temperature map: center-fed coolant, warmer toward the outlets; OEs downstream run warmer → ring heater power differs.');
    }
  });

  add({
    id: 'coolant-loop', parent: 'thermal-system', domain: 'thermal', level: 3,
    title: 'Coolant Loop & CDU', subtitle: 'manifold, dripless QDs, CDU pump + HX, facility water; pump vs system curve',
    summary: 'Coolant leaves the switch cold plate, passes chassis tubing and dripless quick-disconnects into the rack manifold and returns to a Coolant Distribution Unit. The CDU pumps the secondary (TCS) loop, controls supply temperature and differential pressure, filters the fluid, and dumps the heat through a liquid-to-liquid heat exchanger into facility water. The operating point is where the pump curve meets the system pressure-drop curve.',
    what: `<p><b>Loop elements</b> ${CPO.badge('typ')}: cold plate → chassis manifold → QD pair (dripless, blind- or hand-mate) → rack manifold → CDU (redundant pumps, plate HX, 25–50 µm filter, expansion tank, sensors) → facility water system (FWS).</p>
<p><b>Fluid</b>: often PG25 (25 % propylene glycol + inhibitors) or treated water; cp ≈ 3.9–4.2 kJ/kg·K. Wetted materials (Cu, brass, stainless, EPDM) must be galvanically compatible; coolant chemistry is monitored (pH, conductivity, inhibitor level).</p>
<p><b>Temperatures</b>: secondary supply ≈ 25–45 °C (warm-water cooling enables chiller-free heat rejection and heat reuse); return 5–15 K higher. Supply must stay above room dew point to avoid condensation.</p>
<p><b>Hydraulics</b>: system ΔP ≈ k·V̇² (turbulent) ; pump curve ΔP falls with flow; pump speed (affinity laws: V̇ ∝ n, ΔP ∝ n², P ∝ n³) sets the intersection.</p>`,
    needs: ['Redundant pumps and power', 'Balanced flow across many parallel trays', 'Clean fluid (filtration, chemistry)', 'Leak-free QDs with low ΔP', 'Supply temperature control above dew point'],
    interfaces: [{ with: 'cold-plate', type: 'thermal', detail: 'supply/return' }, { with: 'Facility water', type: 'thermal', detail: 'plate heat exchanger' }, { with: 'BMC / CDU controller', type: 'mgmt', detail: 'flow, ΔP, T, leak; Redfish/Modbus/SNMP' }],
    kpis: [{ name: 'Flow per kW', value: '~1.5 L/min @ ΔT 10 K', tag: 'typ' }, { name: 'Supply temp', value: '25–45 °C', tag: 'typ' }, { name: 'QD ΔP', value: '~5–20 kPa', tag: 'typ' }, { name: 'Filter', value: '25–50 µm', tag: 'typ' }],
    physics: `<div class="eq">Q = ṁ·c_p·(T_out − T_in)
system curve: ΔP_sys = k·V̇²        pump curve: ΔP_pump = ΔP_0·(n/n_0)² − a·V̇²
affinity laws: V̇ ∝ n,  ΔP ∝ n²,  P_shaft ∝ n³
HX: Q = U·A·ΔT_lm</div>`,
    failures: ['Pump failure → redundant pump takeover; flow-loss alarm', 'QD not fully latched → low flow on one tray', 'Air ingestion → cavitation, hot spots; bleed, expansion tank', 'Corrosion / biofilm → clogging; chemistry monitoring', 'Facility water too warm → supply drifts up → throttling'],
    monitoring: ['Flow meters, ΔP sensors, T_in/T_out at CDU and per tray', 'Pump speed/current', 'Leak detection (leak-detect)', 'Conductivity/pH'],
    hotspots: [{ target: 'cold-plate', x: 40, y: 70, w: 200, h: 110, label: 'Switch cold plate' }, { target: 'leak-detect', x: 270, y: 60, w: 120, h: 70, label: 'QDs / leak detection' }, { target: 'thermal-control-loop', x: 520, y: 220, w: 230, h: 120, label: 'CDU control' }],
    scene(g, api) {
      const K = kit(g, api), th = K.layer('thermal'), se = K.layer('sensing'), ct = K.layer('control');
      K.box(th, 40, 70, 200, 110, { d: 'thermal', label: 'Switch tray', sub: 'cold plate · Q ≈ 1 kW' });
      K.box(th, 280, 70, 100, 50, { d: 'thermal', label: 'QDs', sub: 'dripless', center: true });
      K.box(th, 420, 40, 80, 300, { d: 'thermal', label: 'Rack', sub: 'manifold', center: true });
      const cdu = K.box(th, 540, 60, 200, 140, { d: 'thermal', label: 'CDU', sub: 'pump · plate HX · filter' });
      const imp = K.mk('g', {}, th); K.mk('circle', { cx: 600, cy: 140, r: 22, style: 'fill:none;stroke:var(--data);stroke-width:2' }, imp);
      for (let i = 0; i < 4; i++) K.mk('line', { x1: 600, y1: 140, x2: 600 + 18 * Math.cos(i * Math.PI / 2), y2: 140 + 18 * Math.sin(i * Math.PI / 2), style: 'stroke:var(--data);stroke-width:2' }, imp);
      K.mk('rect', { x: 650, y: 115, width: 70, height: 55, rx: 4, style: 'fill:none;stroke:var(--therm);stroke-dasharray:3 2' }, th); K.text(th, 685, 147, 'HX', { anchor: 'middle', size: 12 });
      K.box(th, 800, 60, 180, 140, { d: 'thermal', label: 'Facility water', sub: 'dry cooler / chiller' });
      let Tin = 35, Tout = 45;
      const sup = [[740, 100], [760, 100], [760, 30], [460, 30], [460, 100], [380, 100], [240, 100]];
      const ret = [[240, 150], [380, 110], [460, 110], [460, 330], [520, 330], [520, 180], [540, 180]];
      K.wire(th, sup, { color: 'var(--data)', w: 6, op: 0.25 }); K.wire(th, ret, { color: 'var(--therm)', w: 6, op: 0.25 });
      const f1 = K.flow(th, sup, { n: 22, r: 3.4, speed: 70 }), f2 = K.flow(th, ret, { n: 22, r: 3.4, speed: 70 });
      const f3 = K.flow(th, [[720, 130], [800, 130]], { n: 4, r: 3, speed: 50, color: tcol(30, 25, 50) });
      const f4 = K.flow(th, [[800, 160], [720, 160]], { n: 4, r: 3, speed: 50, color: tcol(40, 25, 50) });
      // pump vs system curve
      const pp = K.plot(se, 60, 380, 420, 180, { min: 0, max: 200, label: 'ΔP (kPa) vs flow (0…40 L/min): pump curve (cyan) · system curve (orange)', n: 60, color: 'var(--data)', glow: true });
      const sys = pp.trace({ color: 'var(--therm)' }), op = pp.dot({ color: 'var(--good)' });
      const ctl = K.box(ct, 520, 220, 230, 120, { d: 'control', label: 'CDU controller', sub: 'PID on ΔP / supply T · N+1 pumps' });
      const rF = K.readout(se, 530, 380, 'flow', { color: 'var(--data)' }), rP = K.readout(se, 660, 380, 'ΔP', { color: 'var(--data)' }), rW = K.readout(se, 790, 380, 'pump power ∝ n³', { color: 'var(--power)' });
      const rT = K.readout(se, 530, 440, 'T_supply → T_return', { color: 'var(--therm)' }), rN = K.readout(se, 790, 440, 'pump speed', { d: 'control' });
      K.lines(se, 530, 500, ['Rack of ~20 trays × 1 kW → ~30 L/min at ΔT 10 K.', 'Operating point = pump ∩ system curve (affinity laws).'], { size: 11, fill: 'var(--muted)' });
      K.sensor(se, 250, 100, { label: 'T_in', dy: -10 }); K.sensor(se, 250, 150, { label: 'T_out', dy: 20 });
      let ang = 0;
      K.tick((dt, t) => {
        const n = 0.75 + 0.2 * Math.sin(t * 0.4), k = 0.11, P0 = 190, a = 0.05;
        const pump = [], sy = []; for (let i = 0; i <= 60; i++) { const v = i / 60 * 40; pump.push(Math.max(0, P0 * n * n - a * v * v)); sy.push(k * v * v); }
        pp.set(pump); sys.set(sy);
        const V = Math.sqrt(P0 * n * n / (k + a)), dP = k * V * V; op.set(V / 40, dP);
        rF.set(V.toFixed(1) + ' L/min'); rP.set(dP.toFixed(0) + ' kPa'); rW.set((dP * V / 60 / 0.5).toFixed(0) + ' W'); rN.set((n * 100).toFixed(0) + ' %');
        const dT = 20000 / (V / 60 * 4000); Tout = Tin + dT; rT.set(Tin.toFixed(0) + ' → ' + Tout.toFixed(1) + ' °C');
        f1.speed = f2.speed = 20 + V * 2.5; f1.color = tcol(Tin, Tin - 2, Tin + 14); f2.color = tcol(Tout, Tin - 2, Tin + 14);
        ang += dt * 360 * n; imp.setAttribute('transform', 'rotate(' + ang.toFixed(0) + ' 600 140)');
      });
      K.cap0('Illustrative rack-level loop (20 kW). Coolant colour = temperature. Pump speed varies to show how the operating point moves.');
    }
  });

  add({
    id: 'tim', parent: 'thermal-system', domain: 'thermal', level: 4,
    title: 'Thermal Interface Materials (TIM)', subtitle: 'TIM1 / TIM2, bond-line thickness, voids, pump-out, warpage',
    summary: 'No two machined surfaces touch over more than a few percent of their area; air in the gaps is a terrible conductor (0.026 W/m·K). TIMs fill those gaps: TIM1 between die and lid (indium, liquid metal, polymer), TIM2 between lid and cold plate (grease, phase-change, graphite pad). On a large, warping CPO package the TIM layer can be a dominant part of the junction-to-coolant resistance.',
    what: `<p><b>Resistance</b>: R″ = BLT/k + R_c1 + R_c2 (area-specific, K·cm²/W). Grease (k 3–8 W/m·K, BLT 20–50 µm) → ≈0.05–0.15 K·cm²/W; indium solder TIM1 (k ≈ 86) → ≈0.02–0.05; liquid metal (k ≈ 20–40, very thin) → ≈0.01–0.03 ${CPO.badge('typ')}.</p>
<p><b>Over an area A</b>, θ = R″/A: 0.08 K·cm²/W over 8 cm² = 0.01 K/W → 10 K at 1 kW.</p>
<p><b>Reliability</b>: thermal cycling makes the package warp ("smile/frown", tens of µm on large substrates); greases pump out, voids grow, dry-out. Phase-change materials and gels resist pump-out; graphite pads trade higher R for no pump-out.</p>
<p><b>CPO specifics</b> ${CPO.badge('est')}: ASIC and optical engines have different heights and flux; a thicker TIM or separate pedestals may serve the OEs, whose temperature stability matters for ring tuning.</p>`,
    needs: ['Thin, uniform bond line', 'Controlled clamping pressure', 'Void-free application (X-ray/SAM inspection)', 'Stability over thousands of thermal cycles'],
    interfaces: [{ with: 'Die / lid', type: 'thermal', detail: 'TIM1' }, { with: 'Lid / cold plate', type: 'thermal', detail: 'TIM2' }, { with: 'Mechanical', type: 'mechanical', detail: 'clamp load, flatness' }],
    kpis: [{ name: 'Grease R″', value: '0.05–0.15 K·cm²/W', tag: 'typ' }, { name: 'Indium TIM1 R″', value: '0.02–0.05 K·cm²/W', tag: 'typ' }, { name: 'BLT', value: '20–75 µm', tag: 'typ' }, { name: 'Package warpage', value: 'tens of µm', tag: 'typ' }],
    physics: `<div class="eq">R″_TIM = BLT/k_TIM + R″_c1 + R″_c2           θ = R″ / A
ΔT_TIM = q″ · R″     125 W/cm² × 0.08 K·cm²/W = 10 K
void fraction φ → local q″ rises ≈ 1/(1−φ) and hot spots form above voids</div>`,
    failures: ['Pump-out after thermal cycling → θ rises over months', 'Voids from dispensing → local hot spots', 'Liquid metal migration → shorts (needs dams)', 'Uneven clamp → wedge-shaped bond line'],
    monitoring: ['θ_jc trend: (T_j − T_coolant)/P over life', 'On-die sensor gradients (hot spot over a void)'],
    hotspots: [{ target: 'cold-plate', x: 40, y: 40, w: 560, h: 80, label: 'Cold plate' }, { target: 'temp-sensor', x: 40, y: 330, w: 560, h: 60, label: 'Die sensors' }],
    scene(g, api) {
      const K = kit(g, api), th = K.layer('thermal'), se = K.layer('sensing');
      K.box(th, 40, 40, 560, 80, { d: 'thermal', label: 'Cold-plate base (Cu)', fill: 'rgba(184,115,51,.25)' });
      const tim2 = K.mk('rect', { x: 40, y: 120, width: 560, height: 40, style: 'fill:var(--therm);opacity:.25' }, th); K.text(th, 610, 145, 'TIM2', { size: 12 });
      K.mk('rect', { x: 40, y: 160, width: 560, height: 70, style: 'fill:#64748b;opacity:.6' }, th); K.text(th, 610, 200, 'lid', { size: 12 });
      K.mk('rect', { x: 40, y: 230, width: 560, height: 40, style: 'fill:var(--therm);opacity:.35' }, th); K.text(th, 610, 255, 'TIM1', { size: 12 });
      const die = K.mk('rect', { x: 40, y: 270, width: 560, height: 60, style: 'fill:#334155' }, th); K.text(th, 610, 305, 'die', { size: 12 });
      // filler particles in TIMs
      for (let i = 0; i < 90; i++) { const y = i % 2 ? 125 + Math.random() * 30 : 235 + Math.random() * 30; K.mk('circle', { cx: 45 + Math.random() * 550, cy: y, r: 2 + Math.random() * 3, style: 'fill:#e2e8f0;opacity:.5' }, th); }
      const voids = [[180, 250, 18], [430, 140, 14]].map(([x, y, r]) => K.mk('ellipse', { cx: x, cy: y, rx: r * 1.8, ry: r * 0.7, style: 'fill:#000;stroke:#475569' }, th));
      const heat = []; for (let i = 0; i < 16; i++) { const x = 60 + i * 34; heat.push(K.flow(th, [[x, 325], [x, 45]], { color: 'var(--therm)', n: 5, r: 2.2, speed: 60 })); }
      K.box(se, 40, 330, 560, 60, { d: 'sensing', label: 'on-die temperature sensors', fill: 'rgba(0,0,0,0)', dash: '3 3' });
      const sens = [120, 180, 300, 450, 540].map(x => K.sensor(se, x, 360, {}));
      // temperature profile plot
      const pl = K.plot(se, 680, 40, 300, 290, { min: 30, max: 100, label: 'Temperature through the stack (°C)', n: 60, color: 'var(--therm)', glow: true });
      const rBL = K.readout(se, 680, 360, 'TIM1 BLT', { color: 'var(--therm)' }), rR = K.readout(se, 830, 360, 'R″ TIM1+TIM2', { color: 'var(--therm)' });
      const rH = K.readout(se, 680, 420, 'hot spot over void', { color: 'var(--bad)' });
      K.lines(se, 40, 430, ['q″ = 125 W/cm² (est.). Grease k = 5 W/m·K. Animation cycles warpage: the bond line', 'breathes with thermal cycles (pump-out). Voids block heat → local hot spots.'], { size: 11.5, fill: 'var(--muted)' });
      K.tick((dt, t) => {
        const blt = 30 + 25 * (0.5 + 0.5 * Math.sin(t * 0.5)); // µm
        const R1 = blt * 1e-4 / 5 + 0.01, R2 = 0.06, q = 125;
        const Tc = 38, T2 = Tc + q * R2, Tl = T2 + 3, T1 = Tl + q * R1, Tj = T1 + 8;
        pl.setXY([[0, 33], [0.15, Tc], [0.3, T2], [0.5, Tl], [0.7, T1], [1, Tj]]);
        rBL.set(blt.toFixed(0) + ' µm'); rR.set((R1 + R2).toFixed(3) + ' K·cm²/W'); rH.set('+' + (q * R1 * 0.8).toFixed(1) + ' K');
        die.style.fill = tcol(Tj, 40, 100);
        sens.forEach((s, i) => { s.style.opacity = i === 1 ? 1 : 0.6; });
        heat.forEach((h, i) => { const x = 60 + i * 34, nearVoid = Math.abs(x - 180) < 30; h.op = nearVoid ? 0.25 : 1; });
        voids[0].setAttribute('rx', (32 + 6 * Math.sin(t * 0.5)).toFixed(1));
      });
      K.cap0('Values typical. TIM resistance grows if bond line thickens or voids form — tracked by θ trending in telemetry.');
    }
  });

  add({
    id: 'thermal-control-loop', parent: 'thermal-system', domain: 'control', level: 4,
    title: 'Thermal Control Loop', subtitle: 'pump/fan PID, multi-sensor max-select, ASIC throttling, THERMTRIP',
    summary: 'The BMC (and CDU controller) run PID loops that set pump and fan speeds from the hottest of many temperatures — ASIC junction, optical engines, coolant outlet, VRMs, ELS modules. If cooling cannot keep up, the switch escalates: warning → throttling/power capping → orderly shutdown → hard THERMTRIP that the CPLD executes in hardware within microseconds.',
    what: `<p><b>Loop</b>: e = T_target − T_meas (max-select across sensor groups with per-group targets) → PID → pump/fan PWM. Time constants ${CPO.badge('typ')}: die ~ms, package/cold plate ~s, coolant loop ~10–100 s; the loop runs at ~1 Hz with anti-windup and rate limits (acoustics, pump wear).</p>
<p><b>Thresholds</b> ${CPO.badge('typ')}: warning ≈ 90–100 °C, critical ≈ 105–110 °C, THERMTRIP ≈ 110–125 °C junction (silicon-specific). OE temperatures have their own windows tied to ring-heater headroom.</p>
<p><b>Throttling</b> on a switch: power capping, port/link power reduction, or shutting ports — unlike CPUs, switch ASICs cannot simply slow clocks without dropping traffic, so the thermal design must avoid it in normal operation.</p>
<p><b>Interaction with optics</b>: ring-lock heaters respond to the same temperature changes (faster, µs–ms); the slow thermal loop sets the baseline so heaters stay mid-range.</p>`,
    needs: ['Many reliable sensors (ADC, diode sensors)', 'Tuned PID with anti-windup', 'Fail-safe: sensor loss → full speed', 'Hardware THERMTRIP path independent of firmware'],
    interfaces: [{ with: 'temp-sensor / ADC', type: 'mgmt', detail: 'readings over I2C/I3C/PECI-like' }, { with: 'Pumps/fans', type: 'electrical', detail: 'PWM + tach' }, { with: 'CPLD', type: 'electrical', detail: 'THERMTRIP → power off' }, { with: 'NOS', type: 'mgmt', detail: 'power capping, alarms' }],
    kpis: [{ name: 'Loop rate', value: '~1 Hz', tag: 'typ' }, { name: 'Tj warning / critical', value: '~95 / ~105 °C', tag: 'typ' }, { name: 'THERMTRIP response', value: '< 10 µs (HW)', tag: 'typ' }],
    physics: `<div class="eq">u(t) = Kp·e + Ki·∫e dt + Kd·de/dt          e = T_meas − T_set
thermal plant: C_th·dT/dt = P − (T − T_cool)/θ(flow)       θ(flow) ↓ as flow ↑
τ = θ·C_th      (0.05 K/W × 200 J/K = 10 s)</div>`,
    failures: ['Sensor stuck/failed → fan/pump to 100 %, alarm', 'Integrator windup → overshoot', 'Loop oscillation with slow coolant transport delay', 'Firmware hang → hardware watchdog + THERMTRIP backstop'],
    monitoring: ['BMC sensor readings, SEL events, Redfish Thermal resource', 'Pump/fan tach feedback', 'Throttle event counters'],
    hotspots: [{ target: 'temp-sensor', x: 20, y: 60, w: 160, h: 70, label: 'Temperature sensors' }, { target: 'coolant-loop', x: 560, y: 60, w: 160, h: 70, label: 'Pump / coolant' }, { target: 'bmc', x: 200, y: 60, w: 160, h: 70, label: 'BMC' }, { target: 'cpld', x: 780, y: 160, w: 200, h: 70, label: 'THERMTRIP (CPLD)' }, { target: 'ring-lock-loop', x: 780, y: 60, w: 200, h: 70, label: 'Ring lock (fast loop)' }],
    scene(g, api) {
      const K = kit(g, api), ct = K.layer('control'), se = K.layer('sensing'), th = K.layer('thermal');
      K.box(se, 20, 60, 160, 70, { d: 'sensing', label: 'Sensors', sub: 'Tj, T_OE, T_out (max)', center: true });
      K.box(ct, 200, 60, 160, 70, { d: 'control', label: 'BMC PID', sub: 'Kp · Ki · Kd', center: true });
      K.box(ct, 380, 60, 160, 70, { d: 'control', label: 'PWM', sub: 'pump / fan', center: true });
      K.box(th, 560, 60, 160, 70, { d: 'thermal', label: 'Pump + cold plate', sub: 'θ(flow)', center: true });
      K.box(se, 780, 60, 200, 70, { d: 'optics', label: 'Ring heaters (fast)', sub: 'track residual ΔT', center: true });
      const trip = K.box(ct, 780, 160, 200, 70, { d: 'control', label: 'THERMTRIP → CPLD', sub: 'hardware power-off', center: true });
      [[[180, 95], [200, 95]], [[360, 95], [380, 95]], [[540, 95], [560, 95]]].forEach(p => K.wire(ct, p, { d: 'control', arrow: true }));
      K.wire(se, [[640, 130], [640, 160], [100, 160], [100, 130]], { d: 'sensing', arrow: true, dash: '4 3' });
      K.flow(ct, [[100, 95], [640, 95]], { color: 'var(--ctrl)', n: 8, r: 3, speed: 90 });
      K.flow(se, [[640, 130], [640, 160], [100, 160], [100, 130]], { color: 'var(--sense)', n: 6, r: 2.6, speed: 80 });
      const pl = K.plot(se, 40, 270, 600, 280, { min: 30, max: 120, label: 'Tj (°C, orange) · pump speed (cyan, 0–100 %) · ASIC power (yellow, scaled)', n: 300, color: 'var(--therm)', glow: true });
      const pu = pl.trace({ color: 'var(--data)', w: 1.5 }), pp = pl.trace({ color: 'var(--power)', w: 1.2, op: 0.6 });
      pl.hline(95, { label: 'warning 95', color: 'var(--warn)' }); pl.hline(105, { label: 'throttle 105', color: 'var(--bad)' });
      const rT = K.readout(se, 680, 280, 'T_j', { color: 'var(--therm)' }), rU = K.readout(se, 800, 280, 'pump', { color: 'var(--data)' });
      const rS = K.readout(se, 680, 340, 'state', { d: 'control' });
      let mode = 0; K.radio(ct, 680, 410, ['normal', 'pump degraded'], 120, i => { mode = i; }, 0);
      K.lines(se, 680, 460, ['Plant: C_th dT/dt = P − (T − T_in)/θ(flow)', 'PID on Tj with anti-windup; slow motion.'], { size: 11, fill: 'var(--muted)' });
      let T = 70, I = 0, u = 0.5, sim = 0, thr = false;
      K.tick(dt => {
        sim += dt;
        const P = 750 + 350 * (Math.sin(sim * 0.25) > 0.3 ? 1 : 0) - (thr ? 300 : 0);
        const flowMax = mode ? 0.35 : 1, flow = Math.max(0.05, u * flowMax);
        const theta = 0.035 + 0.04 / (0.2 + flow), Tin = 35;
        T += dt * 0.6 * ((P - (T - Tin) / theta) / 60);
        const e = T - 85; I = CPO.clamp(I + e * dt * 0.02, 0, 1); u = CPO.clamp(0.25 + 0.04 * e + I, 0.2, 1);
        thr = T > 105 ? true : (T < 98 ? false : thr);
        pl.push(T); pu.push(30 + u * 90); pp.push(30 + P / 1500 * 90);
        rT.set(T.toFixed(1) + ' °C'); rU.set((u * 100).toFixed(0) + ' %');
        rS.set(thr ? 'THROTTLE / cap' : T > 95 ? 'WARNING' : 'OK'); rS.color(thr ? 'var(--bad)' : T > 95 ? 'var(--warn)' : 'var(--good)');
        trip.rect.style.fill = T > 115 ? 'rgba(255,77,94,.4)' : '';
      });
      K.cap0('Toggle “pump degraded”: the PID saturates, Tj crosses warning and throttle thresholds. Thresholds are typical, silicon-specific.');
    }
  });

  /* ================================================================== SENSING & FEEDBACK */
  add({
    id: 'sensing-feedback', parent: 'switch-chassis', domain: 'sensing', level: 2,
    title: 'Sensing & Feedback Loops', subtitle: 'sensor inventory, ADCs, thresholds/DOM, and the four control loops',
    summary: 'A CPO switch is held in its operating window by hundreds of sensors and several nested feedback loops running at very different speeds: the VRM loop (µs), micro-ring lock (µs–ms), laser automatic power control and TEC (ms), and the thermal loop (s). Sensors feed ADCs, firmware compares readings with warning/alarm thresholds, and everything is exposed as telemetry (DOM/DDM, PMBus, Redfish).',
    what: `<p><b>Inventory</b> ${CPO.badge('typ')}:</p><ul>
<li><b>Temperature</b>: tens of on-die diode/BJT sensors in the ASIC; sensors in each EIC/OE; laser and TEC thermistors in each ELS; VRM/power-stage TMON; PSU; coolant inlet/outlet.</li>
<li><b>Electrical</b>: V/I/P per rail (PMBus), per-phase IMON, input power.</li>
<li><b>Optical</b>: monitor photodiodes — tap/drop-port PDs for ring lock, Rx power per lane, laser back-facet MPDs in ELS.</li>
<li><b>Fluid/mechanical</b>: flow, pressure, leak ropes, humidity, fan tach, module presence, fiber-connector presence.</li>
<li><b>Link health</b>: SerDes eye/SNR, pre-FEC BER, FEC corrected symbols — the ultimate "sensor" of optical margin.</li></ul>
<p><b>Thresholds</b>: CMIS-style high/low alarm and warning per quantity, latched flags, masks; BMC/NOS raise events and logs.</p>
<p><b>Loop hierarchy</b>: fast loops sit inside slow ones — the thermal loop keeps the baseline so ring heaters and TECs stay mid-range; APC holds laser power so ring-lock signals stay calibrated.</p>`,
    needs: ['Accurate, calibrated sensors (offset, gain, ideality)', 'Adequate ADC resolution and sampling', 'Sensible thresholds with hysteresis', 'Separation of time scales between nested loops', 'Fail-safe defaults on sensor loss'],
    interfaces: [{ with: 'BMC / NOS', type: 'mgmt', detail: 'telemetry, alarms, logs' }, { with: 'Optics', type: 'optical', detail: 'monitor PDs, ring lock' }, { with: 'Power', type: 'power', detail: 'IMON/VSENSE' }, { with: 'Thermal', type: 'thermal', detail: 'temperatures, flow, leak' }],
    kpis: [{ name: 'Sensors per switch', value: 'hundreds–thousands', tag: 'est' }, { name: 'VRM loop BW', value: '~50–250 kHz', tag: 'typ' }, { name: 'Ring lock BW', value: '~1–100 kHz', tag: 'typ' }, { name: 'APC/TEC BW', value: '~1–100 Hz', tag: 'typ' }, { name: 'Thermal loop', value: '~0.01–1 Hz', tag: 'typ' }],
    physics: `<div class="eq">Nested-loop rule of thumb: f_c,inner ≥ 5–10 × f_c,outer
Threshold with hysteresis:  alarm if x > x_H ; clear if x < x_H − h
Telemetry resolution:  LSB = V_ref / 2^N</div>`,
    failures: ['Sensor drift/miscalibration → wrong control action', 'Loops fighting (similar bandwidths)', 'Alarm storms without hysteresis', 'Silent sensor failure → plausibility checks'],
    monitoring: ['This node is the monitoring system — see child nodes'],
    hotspots: [{ target: 'temp-sensor', x: 20, y: 50, w: 220, h: 60, label: 'Temperature sensors' }, { target: 'monitor-pd', x: 20, y: 120, w: 220, h: 60, label: 'Monitor photodiodes' },
      { target: 'adc', x: 20, y: 190, w: 220, h: 60, label: 'ADC / telemetry' }, { target: 'leak-detect', x: 20, y: 260, w: 220, h: 60, label: 'Leak / flow / pressure' },
      { target: 'vrm-control-loop', x: 300, y: 330, w: 160, h: 160, label: 'VRM loop (µs)' }, { target: 'ring-lock-loop', x: 480, y: 330, w: 160, h: 160, label: 'Ring lock (µs–ms)' },
      { target: 'laser-apc-loop', x: 660, y: 330, w: 160, h: 160, label: 'Laser APC/TEC (ms)' }, { target: 'thermal-control-loop', x: 840, y: 330, w: 150, h: 160, label: 'Thermal (s)' }],
    scene(g, api) {
      const K = kit(g, api), se = K.layer('sensing'), ct = K.layer('control');
      const inv = [['Temperature', 'diodes · NTC · TMON'], ['Monitor PDs', 'ring lock · Rx · laser MPD'], ['ADC / telemetry', 'SAR · ΣΔ · PMBus'], ['Leak / flow / ΔP', 'rope · flow · fans']];
      inv.forEach(([a, b], i) => K.box(se, 20, 50 + i * 70, 220, 60, { d: 'sensing', label: a, sub: b }));
      // chassis map with sensors
      K.box(se, 280, 40, 700, 260, { d: 'mechanical', label: 'Chassis sensor map', fill: 'rgba(0,0,0,.2)', dash: '4 3' });
      K.mk('rect', { x: 560, y: 110, width: 140, height: 110, rx: 4, style: 'fill:#1f2a1a;stroke:var(--accent)' }, se); K.text(se, 630, 170, 'ASIC', { anchor: 'middle', size: 12 });
      [[520, 100], [520, 200], [740, 100], [740, 200]].forEach(([x, y]) => { K.mk('rect', { x: x - 18, y: y - 12, width: 36, height: 24, style: 'fill:#3b2a20;stroke:var(--optic)' }, se); K.sensor(se, x, y, {}); });
      for (let i = 0; i < 6; i++) K.sensor(se, 580 + (i % 3) * 50, 135 + Math.floor(i / 3) * 50, {});
      for (let i = 0; i < 5; i++) { K.mk('rect', { x: 300 + i * 40, y: 250, width: 32, height: 30, style: 'fill:#2a1a14;stroke:var(--optic)' }, se); K.sensor(se, 316 + i * 40, 265, {}); }
      K.text(se, 300, 244, 'ELS modules (laser T, bias, MPD)', { size: 10.5, fill: 'var(--muted)' });
      K.sensor(se, 900, 90, { label: 'T_in/T_out, flow', anchor: 'end', dx: -12 }); K.sensor(se, 900, 270, { label: 'leak rope', anchor: 'end', dx: -12 });
      K.sensor(se, 320, 90, { label: 'VRM IMON/TMON' }); K.sensor(se, 320, 150, { label: 'PSU / fans' });
      // loops
      const loops = [['VRM', 'µs', 'power', 380], ['Ring lock', 'µs–ms', 'optics', 560], ['Laser APC/TEC', 'ms', 'optics', 740], ['Thermal', 's', 'thermal', 915]];
      const dots = loops.map(([n, ts, d, x], i) => {
        K.mk('circle', { cx: x, cy: 410, r: 62, style: 'fill:rgba(0,0,0,.25);stroke:' + K.C(d) + ';stroke-width:2;stroke-dasharray:5 4' }, ct);
        K.text(ct, x, 405, n, { anchor: 'middle', size: 13, weight: 600 }); K.text(ct, x, 424, ts, { anchor: 'middle', size: 11, fill: 'var(--muted)', mono: true });
        return [K.mk('circle', { r: 6, filter: K.glow, style: 'fill:' + K.C(d) }, ct), x, [8, 3, 1, 0.25][i]];
      });
      // timescale axis
      K.wire(ct, [[300, 520], [990, 520]], { d: 'control', arrow: true, w: 1.5 });
      ['1 µs', '1 ms', '1 s', '1 min'].forEach((l, i) => K.text(ct, 320 + i * 210, 540, l, { size: 11, fill: 'var(--muted)', anchor: 'middle' }));
      K.text(ct, 990, 560, 'loop time constant →', { size: 11, fill: 'var(--muted)', anchor: 'end' });
      K.lines(se, 20, 370, ['Nested loops:', 'fast inside slow,', '≥5–10× separation', 'so they do not fight.'], { size: 12, fill: 'var(--muted)' });
      K.tick((dt, t) => dots.forEach(([c, x, w]) => { const a = t * w; c.setAttribute('cx', (x + 62 * Math.cos(a)).toFixed(1)); c.setAttribute('cy', (410 + 62 * Math.sin(a)).toFixed(1)); }));
      K.cap0('Each ring shows one feedback loop; dot speed hints at its relative bandwidth (not to scale). Click a loop to drill in.');
    }
  });

  add({
    id: 'laser-apc-loop', parent: 'sensing-feedback', domain: 'sensing', level: 4,
    title: 'Laser APC & TEC Loops (ELS)', subtitle: 'constant-current vs constant-power, MPD feedback, TEC temperature control',
    summary: 'Each external laser source must deliver stable CW power at a stable wavelength for years. Two loops do that: automatic power control (APC) adjusts bias current to hold the monitor-photodiode signal constant (compensating temperature and aging), and a TEC loop holds the laser chip temperature (and therefore wavelength) using a thermistor and a Peltier element. Bias current creep under APC is the key end-of-life indicator.',
    what: `<p><b>L–I physics</b>: P_opt = η_s·(I − I_th) above threshold; I_th rises exponentially with temperature (I_th = I_0·e^{T/T_0}, T_0 ≈ 50–100 K for InP lasers) and slope efficiency falls ${CPO.badge('typ')}.</p>
<p><b>ACC (constant current)</b>: simple, low noise, but power drops as the laser heats or ages. <b>APC (constant power)</b>: a back-facet or tap MPD measures power; a PI loop moves bias to hold it. APC hides degradation — so firmware tracks bias vs beginning-of-life and alarms (e.g. at +20–50 %).</p>
<p><b>TEC loop</b>: NTC thermistor → ADC → PID → bidirectional TEC driver (H-bridge). Holding ±0.1 K keeps a DFB within ≈±0.01 nm (0.08–0.1 nm/K drift), important for WDM grid alignment with ring resonances.</p>
<p><b>In CPO</b> ${CPO.badge('nv')}: lasers live in front-panel serviceable ELS modules feeding the optical engines via fiber; fewer lasers in total (4× fewer claimed) means each one serves several lanes — power and wavelength stability directly hit many lanes. Management is typically CMIS-like (OIF ELSFP) ${CPO.badge('typ')}.</p>`,
    needs: ['Stable, calibrated MPD (tracking error < ~0.5 dB over T)', 'Low-noise bias driver', 'TEC sized for ambient and laser heat', 'Eye-safety interlocks / shutdown when fiber unplugged'],
    interfaces: [{ with: 'external-laser', type: 'optical', detail: 'CW light into fiber' }, { with: 'monitor-pd', type: 'optical', detail: 'MPD photocurrent' }, { with: 'cmis', type: 'mgmt', detail: 'bias, power, temperature DDM, alarms, enable' }],
    kpis: [{ name: 'Power stability (APC)', value: '±0.2–0.5 dB', tag: 'typ' }, { name: 'TEC stability', value: '±0.1 K', tag: 'typ' }, { name: 'DFB drift', value: '0.08–0.1 nm/K', tag: 'typ' }, { name: 'EOL bias alarm', value: '+20–50 % vs BOL', tag: 'typ' }],
    physics: `<div class="eq">P = η_s·(I − I_th(T)),   I_th(T) = I_0·exp(T/T_0)
I_MPD = R·κ·P   (κ: tap/back-facet fraction, R ≈ 0.8–0.9 A/W)
TEC:  Q_c = S·I·T_c − ½·I²·R − K·ΔT
APC:  I_bias(k+1) = I_bias(k) + Ki·(P_set − P_meas)</div>`,
    failures: ['Laser aging → bias rises → EOL alarm → hot-swap ELS module', 'MPD tracking error → wrong output power', 'TEC saturation at high ambient → wavelength walks off', 'Facet damage / COD at high power'],
    monitoring: ['DDM: laser temperature, bias, output power, TEC current', 'Alarm/warning thresholds in CMIS pages', 'Bias trend vs BOL'],
    hotspots: [{ target: 'monitor-pd', x: 330, y: 150, w: 120, h: 60, label: 'Monitor PD' }, { target: 'temp-sensor', x: 30, y: 300, w: 140, h: 60, label: 'Thermistor' }, { target: 'external-laser', x: 700, y: 60, w: 280, h: 70, label: 'ELS module' }, { target: 'laser-diode', x: 180, y: 60, w: 140, h: 70, label: 'Laser diode' }, { target: 'cmis', x: 700, y: 150, w: 280, h: 60, label: 'CMIS management' }],
    scene(g, api) {
      const K = kit(g, api), op = K.layer('optics'), se = K.layer('sensing'), ct = K.layer('control'), th = K.layer('thermal');
      const ld = K.box(op, 180, 60, 140, 70, { d: 'optics', label: 'Laser diode', sub: 'DFB, CW', center: true });
      K.wire(op, [[320, 95], [700, 95]], { color: 'var(--optic)', w: 3, op: 0.6 });
      const beam = K.flow(op, [[320, 95], [700, 95]], { color: 'var(--optic)', n: 14, r: 3, speed: 160 });
      K.box(op, 700, 60, 280, 70, { d: 'optics', label: '→ fiber → optical engines', sub: 'one laser feeds several lanes' });
      K.box(se, 330, 150, 120, 60, { d: 'sensing', label: 'MPD', sub: 'tap / back facet', center: true });
      K.wire(op, [[390, 95], [390, 150]], { color: 'var(--optic)', w: 1.5, dash: '3 3' });
      K.box(ct, 490, 150, 160, 60, { d: 'control', label: 'APC: PI', sub: 'P_set − P_meas', center: true });
      K.box(ct, 180, 160, 120, 50, { d: 'power', label: 'Bias driver', center: true });
      K.wire(se, [[450, 180], [490, 180]], { d: 'sensing', arrow: true }); K.wire(ct, [[570, 210], [570, 235], [240, 235], [240, 210]], { d: 'control', arrow: true });
      K.wire(ct, [[240, 160], [240, 130]], { d: 'power', arrow: true });
      const apcF = K.flow(ct, [[450, 180], [490, 180], [570, 180], [570, 235], [240, 235], [240, 160], [240, 130]], { color: 'var(--ctrl)', n: 8, r: 2.6, speed: 70 });
      K.box(ct, 700, 150, 280, 60, { d: 'control', label: 'CMIS / DDM', sub: 'bias · power · T · alarms' });
      // TEC loop
      const tec = K.mk('rect', { x: 180, y: 260, width: 140, height: 24, rx: 3, style: 'fill:#1e3a5f;stroke:var(--therm)' }, th); K.text(th, 250, 277, 'TEC (Peltier)', { anchor: 'middle', size: 11 });
      K.wire(th, [[250, 130], [250, 260]], { color: 'var(--therm)', w: 1, op: 0.3 });
      K.box(se, 30, 300, 140, 60, { d: 'sensing', label: 'NTC', sub: 'laser temp', center: true });
      K.box(ct, 200, 310, 160, 50, { d: 'control', label: 'TEC PID + H-bridge', center: true, ls: 12 });
      K.wire(se, [[170, 330], [200, 330]], { d: 'sensing', arrow: true }); K.wire(ct, [[280, 310], [280, 284]], { d: 'control', arrow: true });
      K.flow(ct, [[100, 300], [100, 290], [170, 330], [200, 335], [280, 310], [280, 284]], { color: 'var(--ctrl)', n: 5, r: 2.4, speed: 50 });
      const heatF = K.flow(th, [[250, 284], [250, 300]], { color: 'var(--therm)', n: 2, r: 2, speed: 20 });
      let mode = 1; K.radio(ct, 500, 260, ['ACC (const. I)', 'APC (const. P)'], 130, i => { mode = i; }, 1);
      const pLI = K.plot(se, 400, 320, 260, 230, { min: 0, max: 100, label: 'L–I curves @25/50/75 °C (P mW vs I 0–400 mA)', n: 60, color: 'var(--optic)' });
      const c2 = pLI.trace({ color: '#fb923c' }), c3 = pLI.trace({ color: 'var(--bad)' }), opd = pLI.dot({ color: 'var(--sense)' });
      const LI = (I, T) => { const Ith = 15 * Math.exp(T / 60), eta = 0.35 * (1 - (T - 25) / 250); return Math.max(0, eta * (I - Ith)); };
      [[pLI.main, 25], [c2, 50], [c3, 75]].forEach(([tr, T]) => { const a = []; for (let i = 0; i <= 60; i++) a.push(LI(i / 60 * 400, T)); tr.set(a); });
      const pt = K.plot(se, 700, 320, 280, 140, { min: 0, max: 100, label: 'P_out (red) · bias/4 (violet) · laser T (orange) vs time', n: 240, color: 'var(--optic)', glow: true });
      const tb = pt.trace({ color: 'var(--ctrl)' }), tt = pt.trace({ color: 'var(--therm)', w: 1.2 });
      const rP = K.readout(se, 700, 480, 'P_out', { color: 'var(--optic)' }), rI = K.readout(se, 800, 480, 'bias', { d: 'control' }), rT = K.readout(se, 900, 480, 'T_laser', { color: 'var(--therm)' });
      K.text(se, 700, 545, 'Disturbance: ambient swing + slow aging. TEC on.', { size: 11, fill: 'var(--muted)' });
      let I = 250, Tl = 45, s = 0, age = 0;
      K.tick(dt => {
        s += dt; age = (age + dt * 0.02) % 1;
        const Tamb = 45 + 25 * Math.sin(s * 0.3);
        const Tset = 45; Tl += dt * ((Tset - Tl) * 2.5 + (Tamb - Tl) * 0.6) * 0.5; // TEC + leak
        const eff = 1 - 0.25 * age; let P = LI(I, Tl) * eff;
        if (mode) { I = CPO.clamp(I + (60 - P) * dt * 6, 0, 400); P = LI(I, Tl) * eff; } else I = 250;
        pt.push(P); tb.push(I / 4); tt.push(Tl);
        opd.set(I / 400, LI(I, Tl));
        rP.set(P.toFixed(1) + ' mW'); rI.set(I.toFixed(0) + ' mA'); rT.set(Tl.toFixed(1) + ' °C');
        rI.color(I > 330 ? 'var(--bad)' : 'var(--ctrl)');
        beam.op = 0.3 + 0.7 * P / 70; beam.speed = 160; apcF.on = mode === 1;
        tec.style.fill = tcol(Tl, 30, 70); heatF.speed = 10 + Math.abs(Tamb - Tset) * 2;
        ld.rect.style.fill = 'rgba(255,107,61,' + (0.1 + 0.4 * P / 70).toFixed(2) + ')';
      });
      K.cap0('ACC: power sags as laser warms/ages. APC: power held, bias creeps up → end-of-life alarm (red bias). Curve values are illustrative.');
    }
  });

  add({
    id: 'monitor-pd', parent: 'sensing-feedback', domain: 'sensing', level: 5,
    title: 'Monitor Photodiodes', subtitle: 'tap/drop-port Ge PDs for ring lock, Rx power, laser MPD',
    summary: 'Monitor photodiodes turn a small sampled fraction of light into current so the control loops can "see" the optics: a 1–5 % tap or a ring drop port feeds a germanium PD whose photocurrent tells the ring-lock loop how far the ring is from resonance, tells the APC loop how much laser power there is, and reports per-lane receive power as DOM telemetry.',
    what: `<p><b>Photocurrent</b>: I_ph = R·P, with R = η·q·λ/(h·c) = η·λ[µm]/1.24 A/W → at 1.31 µm and η ≈ 0.7 ≈ 0.74 A/W (Ge PDs 0.8–1.0 A/W) ${CPO.badge('typ')}. Dark current nA-level sets the floor.</p>
<p><b>Ring lock use</b>: a drop-port or through-port monitor shows a Lorentzian dip/peak as the ring is tuned; dithering the heater and lock-in detection (or a min/max-seeking algorithm) keeps the ring on the desired point of the resonance. Some designs use in-ring photoconductive or defect-mediated detection to avoid a separate tap.</p>
<p><b>Dynamic range</b>: optical powers from ~µW to mW → photocurrents nA–mA: log amplifiers or programmable-gain TIAs plus ADC; 40–60 dB range.</p>
<p><b>Tap cost</b>: every percent tapped is ~0.04 dB of link budget — monitors are placed sparingly.</p>`,
    needs: ['Stable tap ratio over T and λ', 'Low dark current', 'Wide-range TIA / log amp', 'Calibration of R·κ per lane'],
    interfaces: [{ with: 'Waveguide / ring', type: 'optical', detail: 'tap coupler or drop port' }, { with: 'ADC / EIC', type: 'electrical', detail: 'photocurrent → TIA → ADC' }, { with: 'ring-lock-loop / laser-apc-loop', type: 'mgmt', detail: 'feedback signal' }],
    kpis: [{ name: 'Responsivity', value: '0.8–1.0 A/W @1310', tag: 'typ' }, { name: 'Tap ratio', value: '1–5 %', tag: 'typ' }, { name: 'Dark current', value: '~nA', tag: 'typ' }, { name: 'Dynamic range', value: '40–60 dB', tag: 'typ' }],
    physics: `<div class="eq">I_ph = R·κ·P        R = η·λ/1.24  [A/W, λ in µm]
1 mW, κ = 2 %, R = 0.9 → I_ph = 18 µA
Shot noise:  i_n = √(2q(I_ph + I_d)·B)
Lorentzian drop: T_d(Δλ) = T_max / (1 + (2Δλ/δλ)²),  δλ = λ/Q ≈ 0.13 nm (Q = 10k)</div>`,
    failures: ['Tap ratio drift → miscalibrated power', 'PD dark current rises with T/aging', 'Back-reflection into monitor path', 'Saturation at high power'],
    monitoring: ['Rx power DOM per lane', 'Lock-loop error signals', 'Laser MPD current in DDM'],
    hotspots: [{ target: 'adc', x: 700, y: 230, w: 130, h: 60, label: 'TIA → ADC' }, { target: 'ring-lock-loop', x: 520, y: 330, w: 460, h: 220, label: 'Ring lock' }, { target: 'laser-apc-loop', x: 860, y: 230, w: 120, h: 60, label: 'Laser APC' }, { target: 'photodetector', x: 380, y: 210, w: 120, h: 100, label: 'Ge photodetector' }],
    scene(g, api) {
      const K = kit(g, api), op = K.layer('optics'), se = K.layer('sensing'), ct = K.layer('control');
      K.wire(op, [[30, 120], [970, 120]], { color: 'var(--optic)', w: 6, op: 0.35 });
      K.flow(op, [[30, 120], [970, 120]], { color: 'var(--optic)', n: 30, r: 3, speed: 150 });
      K.text(op, 30, 105, 'waveguide (main light, 95–99 %)', { size: 11, fill: 'var(--optic)' });
      const ring = K.mk('circle', { cx: 240, cy: 175, r: 40, style: 'fill:none;stroke:var(--optic);stroke-width:4' }, op); K.text(op, 240, 180, 'ring', { anchor: 'middle', size: 11 });
      K.wire(op, [[180, 230], [440, 230]], { color: 'var(--optic)', w: 3, op: 0.5 }); K.text(op, 190, 250, 'drop port', { size: 10.5, fill: 'var(--muted)' });
      const dropF = K.flow(op, [[240, 215], [240, 230], [400, 230]], { color: 'var(--optic)', n: 6, r: 2.4, speed: 100 });
      K.mk('path', { d: 'M600 120 Q640 120 660 160 L660 230', style: 'fill:none;stroke:var(--optic);stroke-width:2;opacity:.6' }, op); K.text(op, 640, 150, '2 % tap', { size: 10.5, fill: 'var(--muted)', anchor: 'end' });
      K.flow(op, [[620, 122], [660, 160], [660, 230]], { color: 'var(--optic)', n: 3, r: 2.2, speed: 80 });
      const pd1 = K.box(se, 390, 215, 100, 90, { d: 'sensing', label: 'Ge PD', sub: 'drop monitor', center: true });
      K.box(se, 610, 230, 80, 60, { d: 'sensing', label: 'Ge PD', sub: 'tap', center: true, ls: 12 });
      K.box(se, 700, 230, 130, 60, { d: 'sensing', label: 'TIA / log amp', sub: '→ ADC', center: true, ls: 12 });
      K.box(ct, 860, 230, 120, 60, { d: 'control', label: 'APC / DOM', center: true, ls: 12 });
      K.wire(se, [[690, 260], [700, 260]], { d: 'sensing', arrow: true }); K.wire(se, [[830, 260], [860, 260]], { d: 'sensing', arrow: true });
      K.flow(se, [[690, 260], [860, 260]], { color: 'var(--sense)', n: 5, r: 2.2, speed: 60 });
      const eF = K.flow(se, [[440, 305], [440, 360], [520, 360]], { color: 'var(--sense)', n: 4, r: 2.4, speed: 60 });
      // ring lock illustration: Lorentzian with dither
      const pl = K.plot(se, 520, 340, 450, 200, { min: 0, max: 1.05, label: 'Drop-port photocurrent vs ring detuning (Lorentzian, δλ ≈ 0.13 nm)', n: 200, color: 'var(--sense)', glow: true });
      const a = []; for (let i = 0; i <= 200; i++) { const d = (i / 200 - 0.5) * 1.0; a.push(1 / (1 + Math.pow(2 * d / 0.13, 2))); } pl.set(a);
      const dot = pl.dot({ color: 'var(--optic)' });
      K.text(se, 745, 556, '−0.5 nm          detuning          +0.5 nm', { anchor: 'middle', size: 10, fill: 'var(--muted)' });
      const ts = K.plot(se, 30, 340, 450, 200, { min: 0, max: 1.05, label: 'Monitor current vs time (thermal drift + dither; lock on/off)', n: 240, color: 'var(--sense)' });
      let lock = true; K.radio(ct, 30, 290, ['lock ON', 'lock OFF'], 90, i => { lock = i === 0; }, 0);
      const rI = K.readout(se, 250, 280, 'I_ph (1 mW × 2 % × 0.9 A/W)', { d: 'sensing', init: '18 µA' });
      let det = 0, heat = 0, s = 0;
      K.tick(dt => {
        s += dt;
        const drift = 0.3 * Math.sin(s * 0.4); // nm from temperature
        const dither = 0.02 * Math.sin(s * 25);
        if (lock) heat += (0 - (drift + heat)) * dt * 3;
        det = drift + heat + dither;
        const y = 1 / (1 + Math.pow(2 * det / 0.13, 2));
        dot.set(CPO.clamp(det + 0.5, 0, 1), y); ts.push(y);
        dropF.op = 0.15 + 0.85 * y; eF.op = 0.2 + 0.8 * y; pd1.rect.style.fill = 'rgba(244,114,182,' + (0.08 + 0.35 * y).toFixed(2) + ')';
        ring.style.stroke = y > 0.7 ? 'var(--optic)' : '#7c2d12';
      });
      K.cap0('Drop-port power peaks at resonance; a small dither + lock-in gives the sign of the error for the ring heater loop.');
    }
  });

  add({
    id: 'adc', parent: 'sensing-feedback', domain: 'sensing', level: 5,
    title: 'ADCs for Telemetry & Control', subtitle: 'SAR binary search, sigma-delta, quantization, ENOB',
    summary: 'Every sensor reaches firmware through an analog-to-digital converter: SAR ADCs (10–16 bit, kS/s–MS/s) for general monitoring and fast loops, sigma-delta ADCs (16–24 bit, slow) for precise temperature and current, and high-speed ADCs inside digital VRM controllers and EICs for the control loops themselves. Resolution, reference accuracy and sampling rate set how precisely the system can see and control itself.',
    what: `<p><b>SAR</b>: sample the input on a capacitor array, then binary-search: for each bit from MSB, switch that capacitor to Vref, compare, keep or drop. N comparator decisions per conversion; power-efficient (fJ–pJ per step).</p>
<p><b>Sigma-delta</b>: oversample with a 1-bit (or few-bit) quantizer inside a loop that shapes quantization noise to high frequency, then decimate — high resolution at low bandwidth, ideal for temperature sensors.</p>
<p><b>Errors</b> ${CPO.badge('typ')}: offset, gain, INL/DNL, reference drift (ppm/K), noise; ENOB is what you really get. For temperature telemetry ±0.25–1 °C is typical; for power telemetry ±1–2 %.</p>
<p><b>Sampling</b>: anti-alias filters before slow ADCs; multiplexed channels (BMC ADCs often 10–12 bit × 16 ch).</p>`,
    needs: ['Stable voltage reference', 'Anti-alias filtering', 'Calibration (offset/gain)', 'Adequate sample rate for the loop it serves'],
    interfaces: [{ with: 'Sensors', type: 'electrical', detail: 'analog inputs' }, { with: 'BMC / controllers', type: 'mgmt', detail: 'digital readings via I2C/SPI/internal bus' }],
    kpis: [{ name: 'Telemetry SAR', value: '10–16 bit, 0.1–5 MS/s', tag: 'typ' }, { name: 'ΣΔ', value: '16–24 bit, Hz–kHz', tag: 'typ' }, { name: 'Ideal SNR', value: '6.02N + 1.76 dB', tag: 'typ' }],
    physics: `<div class="eq">LSB = V_ref / 2^N           12 bit, 1.2 V → 293 µV
quantization noise σ_q = LSB/√12
SNR_ideal = 6.02·N + 1.76 dB         ENOB = (SINAD − 1.76)/6.02
oversampling gain (no shaping): +3 dB per ×2 OSR ; 1st-order ΣΔ: +9 dB per ×2</div>`,
    failures: ['Reference drift → all readings off', 'Aliasing of switching noise into slow readings', 'Channel crosstalk in multiplexed ADCs', 'Missing codes (DNL < −1 LSB)'],
    monitoring: ['Plausibility checks (redundant sensors)', 'Self-test / reference channel readback'],
    hotspots: [{ target: 'temp-sensor', x: 20, y: 60, w: 160, h: 60, label: 'Temperature input' }, { target: 'monitor-pd', x: 20, y: 140, w: 160, h: 60, label: 'Photodiode input' }],
    scene(g, api) {
      const K = kit(g, api), se = K.layer('sensing'), ct = K.layer('control');
      K.box(se, 20, 60, 160, 60, { d: 'sensing', label: 'Temp sensor', sub: 'ΔVbe / NTC', center: true });
      K.box(se, 20, 140, 160, 60, { d: 'sensing', label: 'Monitor PD', sub: 'via TIA', center: true });
      K.box(se, 20, 220, 160, 60, { d: 'sensing', label: 'IMON / VSENSE', center: true });
      K.box(se, 220, 120, 90, 80, { d: 'sensing', label: 'MUX', sub: '+ AAF', center: true });
      [90, 170, 250].forEach(y => K.wire(se, [[180, y], [220, 160]], { d: 'sensing', w: 1.4 }));
      K.box(se, 340, 120, 90, 80, { d: 'sensing', label: 'S/H', sub: 'cap array', center: true });
      const cmp = K.box(ct, 460, 120, 100, 80, { d: 'control', label: 'Comparator', center: true, ls: 12 });
      K.box(ct, 590, 120, 120, 80, { d: 'control', label: 'SAR logic', sub: 'bit register', center: true });
      K.box(ct, 460, 230, 250, 50, { d: 'control', label: 'Capacitive DAC  (C, C/2, C/4 …)', center: true, ls: 12 });
      [[310, 160, 340], [430, 160, 460], [560, 160, 590]].forEach(([a, y, b]) => K.wire(se, [[a, y], [b, y]], { d: 'sensing', arrow: true }));
      K.wire(ct, [[650, 200], [650, 230]], { d: 'control', arrow: true }); K.wire(ct, [[510, 230], [510, 200]], { d: 'control', arrow: true });
      K.flow(se, [[180, 90], [220, 160], [460, 160]], { color: 'var(--sense)', n: 6, r: 2.6, speed: 80 });
      const bits = []; for (let i = 0; i < 8; i++) { bits.push(K.box(ct, 740 + i * 30, 140, 26, 34, { d: 'control', label: '0', center: true, ls: 13, rx: 3 })); }
      K.text(ct, 740, 130, 'MSB … LSB (8-bit demo)', { size: 11, fill: 'var(--muted)' });
      const rC = K.readout(se, 740, 200, 'code', { d: 'control' }), rV = K.readout(se, 860, 200, 'V_in / V_dac', { d: 'sensing', size: 14 });
      const pl = K.plot(se, 40, 330, 440, 230, { min: 0, max: 1, label: 'SAR binary search: V_DAC (violet) converging to V_in (pink)', n: 9, color: 'var(--ctrl)', glow: true, vgrid: 8 });
      const vin = pl.trace({ color: 'var(--sense)', dash: '5 4' });
      const q = K.plot(se, 530, 330, 440, 230, { min: 0, max: 1, label: 'Quantization: 3-bit staircase vs input; error ≤ ½ LSB', n: 200, color: 'var(--sense)' });
      const qs = q.trace({ color: 'var(--ctrl)', w: 2 }), qe = q.trace({ color: 'var(--warn)', w: 1 });
      const ra = [], st_ = [], er = []; for (let i = 0; i <= 200; i++) { const x = i / 200, c = Math.min(7, Math.floor(x * 8)); ra.push(x); st_.push((c + 0.5) / 8); er.push(0.5 + (x - (c + 0.5) / 8) * 4); }
      q.set(ra); qs.set(st_); qe.set(er);
      let Vin = 0.62, cyc = -1;
      K.tick((dt, t) => {
        const T = 6, c = Math.floor(t / T); if (c !== cyc) { cyc = c; Vin = 0.1 + Math.random() * 0.8; }
        const step = Math.min(8, Math.floor(((t % T) / T) * 10));
        let code = 0; const hist = [0.5];
        for (let b = 7; b >= 0 && 7 - b < step; b--) { const trial = code | (1 << b); if (trial / 256 <= Vin) code = trial; hist.push((code + (b > 0 ? (1 << (b - 1)) : 0)) / 256); }
        pl.set(hist.concat(Array(9 - hist.length).fill(hist[hist.length - 1])).slice(0, 9)); vin.set(Array(9).fill(Vin));
        bits.forEach((bx, i) => { const b = 7 - i, decided = i < step; const on = decided && (code >> b) & 1; bx.childNodes[1].textContent = decided ? (on ? '1' : '0') : '·'; bx.rect.style.fill = i === step ? 'rgba(167,139,250,.45)' : on ? 'rgba(167,139,250,.2)' : ''; });
        rC.set(code + ' / 255'); rV.set(Vin.toFixed(3) + ' / ' + (code / 256).toFixed(3));
        cmp.rect.style.fill = ((t * 6) % 1) < 0.3 ? 'rgba(167,139,250,.3)' : '';
      });
      K.cap0('One comparator decision per bit, MSB first. Real telemetry ADCs use 10–16 bits; same algorithm.');
    }
  });

  add({
    id: 'temp-sensor', parent: 'sensing-feedback', domain: 'sensing', level: 6,
    title: 'Temperature Sensors', subtitle: 'BJT ΔVbe (PTAT), bandgap, remote diodes, NTC thermistors — down to Boltzmann statistics',
    summary: 'On-die temperature sensors exploit the most reliable physics in a chip: the base-emitter voltage of a bipolar transistor. Vbe falls ≈2 mV/K (CTAT), while the difference ΔVbe between two current densities is exactly (kT/q)·ln N — proportional to absolute temperature. Ratioing the two against a bandgap reference gives ±0.5–2 °C accuracy. Off-die, NTC thermistors and RTDs measure lasers, coolant and boards.',
    what: `<p><b>Junction physics</b>: carriers cross the p-n barrier with Boltzmann probability ∝ exp(−q(V_bi − V)/kT), so I_C = I_S·exp(qV_BE/ηkT). I_S itself grows steeply with T (∝ T^{3..4}·e^{−E_g/kT}), which is why V_BE at constant current <i>falls</i> with temperature (CTAT ≈ −2 mV/K).</p>
<p><b>ΔV_BE</b>: drive the same BJT at I and N·I (or two BJTs with area ratio N): ΔV_BE = (ηkT/q)·ln N — independent of I_S, so it is a clean PTAT signal (≈179 µV/K for N = 8).</p>
<p><b>Bandgap</b>: V_REF = V_BE + K·ΔV_BE cancels the slopes at ≈1.2 V (≈ E_g/q of Si). A sensor ADC computes T ∝ ΔV_BE/(V_BE + K·ΔV_BE).</p>
<p><b>Remote diode sensing</b>: an external controller forces 2–3 currents into a diode-connected transistor on the die; series resistance and β errors are cancelled with 3-current methods; ideality factor η (≈1.004–1.01) must be programmed.</p>
<p><b>NTC</b>: R(T) = R25·exp(B(1/T − 1/T25)), B ≈ 3400–4000 K — sensitive (~−4 %/K) and cheap; used for laser/TEC control. <b>RTD</b> (Pt1000) for coolant precision.</p>
<p><b>CPO</b>: the micro-ring itself is a thermometer (resonance shifts 0.07–0.1 nm/K) — heater power needed to stay locked is an indirect temperature reading ${CPO.badge('typ')}.</p>`,
    needs: ['Matched BJTs, accurate current ratio', 'Calibration (single-point trim)', 'Placement at hot spots (ASIC has tens of sensors)', 'Noise filtering / averaging'],
    interfaces: [{ with: 'ADC', type: 'electrical', detail: 'ΔVbe / Vbe or NTC divider' }, { with: 'BMC / thermal loop', type: 'mgmt', detail: 'readings, THERMTRIP comparator' }],
    kpis: [{ name: 'Vbe slope', value: '≈ −2 mV/K', tag: 'typ' }, { name: 'ΔVbe (N=8)', value: '≈179 µV/K', tag: 'typ' }, { name: 'On-die accuracy', value: '±0.5–2 °C', tag: 'typ' }, { name: 'NTC sensitivity', value: '≈ −4 %/K', tag: 'typ' }],
    physics: `<div class="eq">I_C = I_S·exp(qV_BE / ηkT)
ΔV_BE = (ηk/q)·T·ln N = 86.17 µV/K × ln 8 × T = 179 µV/K × T     (300 K → 53.7 mV)
V_BE(T) ≈ V_G0 − (V_G0 − V_BE0)·T/T0 − (η' − 1)(kT/q)ln(T/T0)     (CTAT, ≈ −2 mV/K)
V_REF = V_BE + K·ΔV_BE ≈ 1.2 V       NTC: R = R25·e^{B(1/T − 1/T25)}</div>`,
    failures: ['Self-heating of NTC (too much bias current)', 'Series resistance error in remote diodes', 'Sensor not at real hot spot → underestimation', 'Drift / mechanical stress shifts Vbe'],
    monitoring: ['BMC reads all sensors; plausibility vs neighbours', 'Hardware comparator for THERMTRIP'],
    hotspots: [{ target: 'adc', x: 260, y: 40, w: 140, h: 60, label: 'Sensor ADC' }],
    scene(g, api) {
      const K = kit(g, api), se = K.layer('sensing'), ct = K.layer('control');
      // BJT with switched currents
      K.box(se, 20, 40, 220, 220, { d: 'sensing', label: 'ΔV_BE sensor core' });
      const iA = K.box(se, 40, 70, 80, 36, { d: 'sensing', label: 'I', center: true }); const iB = K.box(se, 140, 70, 80, 36, { d: 'sensing', label: '8·I', center: true });
      K.wire(se, [[80, 106], [80, 130], [130, 130]], { d: 'sensing' }); K.wire(se, [[180, 106], [180, 130], [130, 130]], { d: 'sensing' });
      K.mk('circle', { cx: 130, cy: 175, r: 28, style: 'fill:none;stroke:var(--sense);stroke-width:2' }, se);
      K.mk('path', { d: 'M118 160 L118 190 M118 168 L140 152 M118 182 L140 198', style: 'fill:none;stroke:var(--sense);stroke-width:2' }, se);
      K.wire(se, [[130, 130], [140, 152]], { d: 'sensing' }); K.text(se, 130, 235, 'diode-connected BJT', { anchor: 'middle', size: 10.5, fill: 'var(--muted)' });
      const cf = K.flow(se, [[80, 106], [80, 130], [130, 130], [140, 152], [140, 198], [140, 225]], { color: 'var(--sense)', n: 5, r: 2.4, speed: 50 });
      K.box(se, 260, 40, 140, 60, { d: 'sensing', label: 'ΣΔ ADC', sub: 'T = f(ΔVbe/Vref)', center: true, ls: 12 });
      K.wire(se, [[240, 140], [330, 140], [330, 100]], { d: 'sensing', arrow: true });
      // Vbe / dVbe / bandgap plot
      const pl = K.plot(se, 460, 40, 510, 220, { min: 0, max: 1.4, label: 'V vs T (−40…150 °C): V_BE (CTAT, orange) · K·ΔV_BE (PTAT, cyan) · sum = bandgap (green)', n: 100, color: 'var(--therm)', glow: true });
      const pp = pl.trace({ color: 'var(--data)' }), pb = pl.trace({ color: 'var(--good)', w: 2.4 });
      const vb = [], dv = [], bg = []; for (let i = 0; i <= 100; i++) { const T = 233 + i * 190 / 100; const v = 1.2 - 0.002 * (T - 233) * 1 - 0.47 + 0.0; const vbe = 0.73 - 0.0019 * (T - 233); const d = 0.000179 * T * 9.6; vb.push(vbe); dv.push(d); bg.push(vbe + d - 0.0); }
      pl.set(vb); pp.set(dv); pb.set(bg);
      const pd = pl.dot({ color: 'var(--sense)' }), pc = pl.cursor();
      const rT = K.readout(se, 260, 130, 'T', { d: 'sensing' }), rD = K.readout(se, 260, 180, 'ΔV_BE (N=8)', { d: 'sensing' }), rN = K.readout(se, 260, 230, 'NTC 10k, B3435', { d: 'sensing', size: 14 });
      // band diagram with Boltzmann electrons
      K.text(ct, 20, 300, 'p-n junction band diagram: electrons with Boltzmann energies; only the tail above the barrier crosses → I ∝ exp(−qΦ/kT)', { size: 11.5, fill: 'var(--muted)' });
      const bx = 30, bw = 940, by = 330;
      K.mk('path', { d: `M${bx} ${by + 150} L${bx + 420} ${by + 150} C${bx + 480} ${by + 150} ${bx + 480} ${by + 60} ${bx + 540} ${by + 60} L${bx + bw} ${by + 60}`, style: 'fill:none;stroke:var(--data);stroke-width:2' }, ct);
      K.mk('path', { d: `M${bx} ${by + 240} L${bx + 420} ${by + 240} C${bx + 480} ${by + 240} ${bx + 480} ${by + 150} ${bx + 540} ${by + 150} L${bx + bw} ${by + 150}`, style: 'fill:none;stroke:var(--violet);stroke-width:2' }, ct);
      K.text(ct, bx + 5, by + 145, 'E_c (n side)', { size: 10.5, fill: 'var(--data)' }); K.text(ct, bx + bw - 5, by + 55, 'E_c (p side)', { size: 10.5, fill: 'var(--data)', anchor: 'end' });
      K.text(ct, bx + 480, by + 105, 'barrier qΦ', { size: 10.5, fill: 'var(--muted)' });
      const N = 60, el = []; for (let i = 0; i < N; i++) el.push({ c: K.mk('circle', { r: 3, filter: K.glow, style: 'fill:var(--data)' }, se), x: bx + Math.random() * 400, e: 0, vx: 0 });
      const rC = K.readout(se, 800, 470, 'crossing rate ∝ e^{−qΦ/kT}', { d: 'sensing', size: 14 });
      let T = 300;
      K.tick((dt, t) => {
        T = 273 + 50 + 60 * Math.sin(t * 0.3); const f = (T - 233) / 190; const kT = T / 300;
        pd.set(f, 0.73 - 0.0019 * (T - 233)); pc.set(f);
        rT.set((T - 273).toFixed(1) + ' °C'); rD.set((0.0862 * Math.log(8) * T).toFixed(2) + ' mV');
        rN.set((10 * Math.exp(3435 * (1 / T - 1 / 298.15))).toFixed(2) + ' kΩ');
        const ph = (t * 2) % 1; iA.rect.style.fill = ph < 0.5 ? 'rgba(244,114,182,.35)' : ''; iB.rect.style.fill = ph >= 0.5 ? 'rgba(244,114,182,.35)' : ''; cf.speed = ph < 0.5 ? 30 : 120;
        let cross = 0;
        el.forEach(p => {
          if (p.x < bx + 440) { if (Math.random() < dt * 2) p.e = -kT * 30 * Math.log(Math.random() + 1e-6); p.x += (Math.random() - 0.5) * 120 * dt + 25 * dt; if (p.x > bx + 430) { if (p.e > 90) { p.vx = 120; p.x = bx + 445; cross++; } else p.x = bx + 300; } if (p.x < bx) p.x = bx + 10; }
          else { p.x += p.vx * dt; if (p.x > bx + bw - 10) { p.x = bx + Math.random() * 200; p.vx = 0; } }
          const yb = p.x < bx + 440 ? by + 150 : by + 60; p.c.setAttribute('cx', p.x.toFixed(1)); p.c.setAttribute('cy', (yb - Math.min(p.e, 140) * (p.x < bx + 440 ? 1 : 0) - 4).toFixed(1));
        });
        rC.set('×' + Math.exp(-0.7 / (8.617e-5 * T) + 0.7 / (8.617e-5 * 300)).toFixed(2) + ' vs 27 °C');
      });
      K.cap0('Temperature sweeps −; current toggles I/8·I. The ΔV_BE between the two currents is purely PTAT; adding it to V_BE yields a flat bandgap (≈1.2 V).');
    }
  });

  add({
    id: 'leak-detect', parent: 'sensing-feedback', domain: 'sensing', level: 4,
    title: 'Leak, Flow & Pressure Detection', subtitle: 'sensing rope, spot sensors, flow imbalance, dew point; response chain',
    summary: 'Liquid cooling inside an electrically live chassis needs fast leak detection: conductive sensing cables routed under QDs and cold-plate fittings, spot sensors in drip trays, plus indirect detection from pressure decay and supply/return flow imbalance. A detected leak triggers alarms to the BMC and CDU, and depending on severity isolation valves close and the tray powers down.',
    what: `<p><b>Sensing cable</b> ${CPO.badge('typ')}: two conductors separated by a porous jacket; liquid bridges them, the resistance drops from MΩ to kΩ, and a monitor measures the change (some cables locate the leak by ratiometric measurement along the length).</p>
<p><b>Indirect</b>: supply flow − return flow mismatch, pressure decay with pump off, expansion-tank level in the CDU, conductivity changes.</p>
<p><b>Condensation</b>: keep supply temperature above the dew point (humidity + temperature sensors); otherwise water forms on cold surfaces without any leak.</p>
<p><b>Response</b>: warn → isolate (valves at manifold) → orderly shutdown of the affected tray; logs via Redfish / SEL.</p>`,
    needs: ['Sensor coverage under every fitting/QD', 'Fast detection (seconds)', 'Low false-alarm rate (dust, humidity)', 'Defined automated response'],
    interfaces: [{ with: 'coolant-loop', type: 'thermal', detail: 'valves, flow sensors' }, { with: 'BMC', type: 'mgmt', detail: 'GPIO/ADC alarm, Redfish events' }, { with: 'CDU', type: 'mgmt', detail: 'isolation commands' }],
    kpis: [{ name: 'Rope dry / wet', value: 'MΩ → kΩ', tag: 'typ' }, { name: 'Detection time', value: 'seconds', tag: 'typ' }, { name: 'Flow imbalance alarm', value: '~few %', tag: 'est' }],
    physics: `<div class="eq">R_wet ≈ ρ_liquid·gap / (wetted length × width)
mass balance: ṁ_supply − ṁ_return = leak rate
dew point (Magnus): T_d = b·γ/(a − γ),  γ = ln(RH) + a·T/(b + T)</div>`,
    failures: ['False positives from humidity/dust', 'Rope not under actual drip path', 'Slow seep below flow-meter resolution', 'Sensor cable damage'],
    monitoring: ['Rope monitor ADC reading', 'Flow/pressure telemetry', 'Humidity/dew-point margin'],
    hotspots: [{ target: 'coolant-loop', x: 30, y: 40, w: 420, h: 120, label: 'Coolant loop' }, { target: 'bmc', x: 560, y: 60, w: 160, h: 60, label: 'BMC' }, { target: 'adc', x: 560, y: 150, w: 160, h: 60, label: 'Rope monitor ADC' }],
    scene(g, api) {
      const K = kit(g, api), th = K.layer('thermal'), se = K.layer('sensing'), ct = K.layer('control');
      K.box(th, 30, 40, 420, 120, { d: 'thermal', label: 'Chassis: cold-plate tubes & QDs' });
      K.wire(th, [[60, 100], [420, 100]], { color: 'var(--data)', w: 8, op: 0.3 });
      K.flow(th, [[60, 100], [420, 100]], { color: 'var(--data)', n: 12, r: 3, speed: 60 });
      const qd = K.mk('rect', { x: 230, y: 88, width: 30, height: 24, rx: 4, style: 'fill:#475569;stroke:var(--mech)' }, th); K.text(th, 245, 82, 'QD', { anchor: 'middle', size: 10.5 });
      K.mk('rect', { x: 40, y: 250, width: 400, height: 40, rx: 6, style: 'fill:#0b1118;stroke:var(--line)' }, th); K.text(th, 50, 305, 'drip tray', { size: 10.5, fill: 'var(--muted)' });
      const rope = K.mk('path', { d: 'M50 270 L430 270', style: 'stroke:var(--sense);stroke-width:4;stroke-dasharray:8 4' }, se); K.text(se, 430, 262, 'sensing rope', { size: 10.5, fill: 'var(--sense)', anchor: 'end' });
      const drop = K.mk('ellipse', { cx: 245, cy: 120, rx: 4, ry: 6, style: 'fill:var(--data)' }, th);
      const puddle = K.mk('ellipse', { cx: 245, cy: 270, rx: 0, ry: 6, style: 'fill:var(--data);opacity:.6' }, th);
      K.box(se, 560, 150, 160, 60, { d: 'sensing', label: 'Rope monitor', sub: 'R → ADC', center: true });
      K.box(ct, 560, 60, 160, 60, { d: 'control', label: 'BMC', sub: 'alarm · SEL · Redfish', center: true });
      const cdu = K.box(ct, 780, 60, 200, 60, { d: 'control', label: 'CDU / valves', sub: 'isolate tray', center: true });
      const pwr = K.box(ct, 780, 150, 200, 60, { d: 'power', label: 'Tray power', sub: 'orderly shutdown', center: true });
      K.wire(se, [[440, 270], [640, 270], [640, 210]], { d: 'sensing', arrow: true }); K.wire(se, [[640, 150], [640, 120]], { d: 'sensing', arrow: true });
      K.wire(ct, [[720, 90], [780, 90]], { d: 'control', arrow: true }); K.wire(ct, [[720, 100], [760, 100], [760, 180], [780, 180]], { d: 'control', arrow: true });
      const aF = K.flow(ct, [[440, 270], [640, 270], [640, 120], [720, 90], [780, 90]], { color: 'var(--bad)', n: 6, r: 3, speed: 120 });
      const pl = K.plot(se, 40, 360, 440, 190, { min: 0, max: 7, label: 'log10 rope resistance (Ω)', n: 240, color: 'var(--sense)', glow: true });
      pl.hline(5, { label: 'alarm 100 kΩ', color: 'var(--bad)' });
      const fp = K.plot(se, 530, 360, 440, 190, { min: 0, max: 2, label: 'supply − return flow (L/min) — mass-balance leak indicator', n: 240, color: 'var(--data)' });
      fp.hline(0.3, { label: 'imbalance alarm', color: 'var(--warn)' });
      const st_ = K.readout(se, 560, 230, 'state', { d: 'sensing' });
      K.tick((dt, t) => {
        const T = 14, p = (t % T) / T;
        let R = 6.5, y = 120, w = 0;
        if (p > 0.15 && p < 0.35) y = 120 + (p - 0.15) / 0.2 * 150;
        if (p >= 0.35) { w = Math.min(120, (p - 0.35) * 600); R = 6.5 - Math.min(3.5, (p - 0.35) * 40); }
        drop.setAttribute('cy', y.toFixed(0)); drop.style.opacity = p > 0.15 && p < 0.35 ? 1 : 0;
        puddle.setAttribute('rx', w.toFixed(0)); qd.style.stroke = p > 0.1 ? 'var(--bad)' : 'var(--mech)';
        const alarm = R < 5; pl.push(R + CPO.randn() * 0.03); fp.push((p > 0.1 ? 0.15 + Math.min(0.4, (p - 0.1) * 2) : 0.02) + CPO.randn() * 0.02);
        aF.on = alarm; rope.style.stroke = alarm ? 'var(--bad)' : 'var(--sense)';
        cdu.rect.style.fill = alarm && p > 0.5 ? 'rgba(255,77,94,.3)' : ''; pwr.rect.style.fill = alarm && p > 0.65 ? 'rgba(255,77,94,.3)' : '';
        st_.set(!alarm ? (p > 0.1 ? 'seep (flow)…' : 'dry') : p > 0.65 ? 'tray shut down' : p > 0.5 ? 'valves closed' : 'LEAK alarm');
        st_.color(alarm ? 'var(--bad)' : p > 0.1 ? 'var(--warn)' : 'var(--good)');
      });
      K.cap0('Simulated drip from a QD: rope resistance collapses, BMC alarms, CDU isolates, tray powers down. Thresholds typical.');
    }
  });

  /* ================================================================== CONTROL PLANE */
  add({
    id: 'control-plane', parent: 'switch-chassis', domain: 'control', level: 2,
    title: 'Control & Management Plane', subtitle: 'BMC, management CPU + NOS/SDK, CPLD, buses, CMIS optics management',
    summary: 'Beside the 100+ Tb/s data plane runs a small computer system that makes the switch work: a management CPU running the network OS and the ASIC SDK over PCIe, a BMC that is always on for power, health and firmware, a CPLD doing hard-wired sequencing and resets, and a web of low-speed buses (I2C/I3C, PMBus, MDIO, SPI, JTAG, UART) reaching every regulator, sensor, optical engine and laser module.',
    what: `<p><b>Management CPU</b> ${CPO.badge('typ')} (x86 or Arm SoC, 8–32 GB DRAM, SSD): runs a Linux-based NOS, the ASIC SDK/driver, routing or fabric-management agents, telemetry streaming; talks to the ASIC over PCIe (register access, DMA of control packets and counters).</p>
<p><b>BMC</b>: an always-on service processor (OpenBMC-class) on standby power: power control, sensor polling, fan/pump control, event logs, firmware update, console, exposed through Redfish over the OOB Ethernet port.</p>
<p><b>CPLD/FPGA</b>: power sequencing, reset tree, interrupt aggregation, I2C muxing, presence detect, LEDs, and hard safety (THERMTRIP, laser interlocks).</p>
<p><b>Optics management</b>: in pluggable systems each module is managed via CMIS over I2C; for CPO, the optical engines and front-panel ELS modules need equivalent control (laser enable, bias, ring-tuning status, DOM) — CMIS-style abstractions are the industry-typical approach ${CPO.badge('typ')}.</p>
<p><b>Separation</b>: the control plane never touches the data path at line rate; it configures and observes it. A management failure must not drop traffic (graceful/hitless restarts).</p>`,
    needs: ['Independent always-on management domain', 'Reliable buses with recovery (I2C hang)', 'Secure boot & signed firmware', 'Scalable optics management for hundreds of lanes', 'Hitless restarts / ISSU'],
    interfaces: [{ with: 'switch-asic', type: 'electrical', detail: 'PCIe Gen4/5 ×4–×8, interrupts, resets' }, { with: 'Optics / ELS', type: 'mgmt', detail: 'I2C/I3C/SPI, CMIS-like' }, { with: 'Power', type: 'mgmt', detail: 'PMBus, EN/PGOOD' }, { with: 'Data center', type: 'mgmt', detail: 'OOB Ethernet: Redfish, SSH, gNMI/telemetry' }],
    kpis: [{ name: 'Host link to ASIC', value: 'PCIe ×4–×8', tag: 'typ' }, { name: 'I2C devices', value: 'hundreds', tag: 'est' }, { name: 'BMC boot', value: '~30–120 s', tag: 'typ' }, { name: 'OOB port', value: '1 GbE', tag: 'typ' }],
    physics: `<div class="eq">Optics polling load: N_lanes × N_regs × bytes / bus rate
  e.g. 512 lanes × 32 B × 10 bit/B ÷ 400 kb/s ≈ 0.4 s per full sweep on one I2C bus
  → parallel buses / I3C / aggregation in the engine controller</div>`,
    failures: ['I2C bus hang → lost visibility; mux isolation + 9-clock recovery', 'Management CPU crash → data plane keeps forwarding; watchdog restart', 'Bad firmware image → A/B fallback', 'BMC compromise → secure boot, RoT'],
    monitoring: ['BMC health & SEL', 'NOS logs, streaming telemetry', 'Watchdogs on CPU and BMC'],
    hotspots: [{ target: 'bmc', x: 40, y: 60, w: 200, h: 120, label: 'BMC' }, { target: 'mgmt-cpu', x: 400, y: 60, w: 220, h: 120, label: 'Management CPU' }, { target: 'cpld', x: 40, y: 250, w: 200, h: 100, label: 'CPLD' },
      { target: 'mgmt-buses', x: 260, y: 250, w: 360, h: 100, label: 'Management buses' }, { target: 'cmis', x: 660, y: 370, w: 320, h: 100, label: 'CMIS optics management' }, { target: 'firmware', x: 40, y: 400, w: 240, h: 110, label: 'Firmware & secure boot' },
      { target: 'switch-package', x: 760, y: 60, w: 220, h: 140, label: 'Switch ASIC + OEs' }],
    scene(g, api) {
      const K = kit(g, api), ct = K.layer('control'), da = K.layer('data');
      K.chip(ct, 40, 60, 200, 120, { d: 'control', label: 'BMC', sub: 'OpenBMC-class · Redfish' });
      K.chip(ct, 400, 60, 220, 120, { d: 'control', label: 'Management CPU', sub: 'x86/Arm · NOS · SDK' });
      K.chip(da, 760, 60, 220, 140, { d: 'data', label: 'Switch ASIC + OEs', sub: '100+ Tb/s data plane', stroke: 'var(--accent)' });
      K.chip(ct, 40, 250, 200, 100, { d: 'control', label: 'CPLD', sub: 'sequencing · resets · IRQ' });
      K.box(ct, 260, 250, 360, 100, { d: 'control', label: 'Buses', sub: 'I2C/I3C · PMBus · MDIO · SPI · JTAG · UART' });
      K.box(ct, 660, 250, 150, 100, { d: 'power', label: 'VRMs / PSU', sub: 'PMBus', center: true });
      K.box(ct, 830, 250, 150, 100, { d: 'thermal', label: 'Fans / pumps', sub: 'PWM · tach', center: true });
      K.box(ct, 660, 370, 320, 100, { d: 'optics', label: 'ELS modules + OE controllers', sub: 'CMIS-style: enable, bias, DOM, alarms' });
      K.box(ct, 40, 400, 240, 110, { d: 'control', label: 'Firmware', sub: 'SPI NOR A/B · secure boot · RoT' });
      K.box(ct, 320, 400, 300, 110, { d: 'control', label: 'OOB Ethernet (1 GbE)', sub: 'Redfish · SSH · telemetry → DC manager' });
      const links = [
        [[620, 120], [760, 120], 'PCIe', 'data'], [[240, 110], [400, 110], 'LPC/eSPI · USB · NC-SI', 'control'],
        [[140, 180], [140, 250], 'I2C/GPIO', 'control'], [[240, 300], [260, 300], '', 'control'], [[620, 300], [660, 300], 'PMBus', 'control'],
        [[440, 350], [440, 380], [820, 380], [820, 370], 'I2C/I3C', 'control'], [[810, 300], [830, 300], '', 'control'], [[140, 350], [140, 400], 'SPI', 'control'],
        [[200, 180], [200, 220], [470, 220], [470, 400], '', 'control'], [[510, 180], [510, 220], [470, 220], '', 'control']];
      links.forEach(l => { const pts = l.filter(p => Array.isArray(p)), lab = l.find(p => typeof p === 'string'), d = l[l.length - 1];
        K.wire(ct, pts, { d, w: d === 'data' ? 5 : 1.8, op: 0.6 });
        K.flow(ct, pts, { d, color: K.C(d === 'data' ? 'data' : 'control'), n: d === 'data' ? 8 : 3, r: d === 'data' ? 3.4 : 2.4, speed: d === 'data' ? 140 : 60 });
        K.flow(ct, pts.slice().reverse(), { color: 'var(--sense)', n: 2, r: 2, speed: 45 });
        if (lab) { const a = pts[0], b = pts[1]; K.text(ct, (a[0] + b[0]) / 2 + 4, (a[1] + b[1]) / 2 - 6, lab, { size: 10.5, fill: 'var(--muted)', anchor: 'middle' }); } });
      K.text(ct, 660, 520, 'violet = commands · pink = telemetry · cyan = PCIe', { size: 11, fill: 'var(--muted)' });
      K.cap0('Management architecture is typical of modern switches; exact NVIDIA implementation is not public.');
    }
  });

  add({
    id: 'bmc', parent: 'control-plane', domain: 'control', level: 3,
    title: 'Baseboard Management Controller (BMC)', subtitle: 'always-on SoC: sensors, power, logs, Redfish, firmware update',
    summary: 'The BMC is a small Arm SoC on standby power that boots before anything else and keeps running when the host is off or crashed. It reads hundreds of sensors, runs fan/pump control, sequences power with the CPLD, logs events, hosts the serial console, updates firmware, and presents everything to the data-center manager through Redfish over the out-of-band network.',
    what: `<p><b>Hardware</b> ${CPO.badge('typ')}: AST2600-class SoC (dual Cortex-A7 ~1.2 GHz), 512 MB–1 GB DDR, dual SPI NOR (A/B), 10–16 I2C/I3C masters, ADC, PWM/tach, GPIO, UARTs, eSPI/LPC/PCIe to the host, RGMII/RMII MAC for OOB Ethernet, often an external RoT chip.</p>
<p><b>Software</b>: OpenBMC (Linux, D-Bus, phosphor services) or vendor stacks: sensor daemons, PID fan/pump control, SEL/journal, Redfish (bmcweb), IPMI (legacy), SSH, serial-over-LAN, firmware update.</p>
<p><b>Redfish</b>: REST/JSON over HTTPS — e.g. GET /redfish/v1/Chassis/1/Thermal (temperatures, fans), /Power (PSUs), /UpdateService (firmware), EventService subscriptions for alarms.</p>`,
    needs: ['Standby power independent of main rails', 'Secure boot, signed images, RoT', 'Robust I2C handling with muxes', 'Watchdog'],
    interfaces: [{ with: 'CPLD', type: 'mgmt', detail: 'power requests, fault registers' }, { with: 'Sensors / PMBus', type: 'mgmt', detail: 'I2C/I3C' }, { with: 'Mgmt CPU', type: 'mgmt', detail: 'eSPI/LPC/USB, console' }, { with: 'DC manager', type: 'mgmt', detail: 'Redfish over OOB Ethernet' }],
    kpis: [{ name: 'CPU', value: 'dual Cortex-A7 class', tag: 'typ' }, { name: 'I2C masters', value: '10–16', tag: 'typ' }, { name: 'Sensor poll', value: '~1 s', tag: 'typ' }, { name: 'Boot', value: '30–120 s', tag: 'typ' }],
    physics: '<p>The BMC is a digital system — its "physics" is reliability: watchdogs, A/B flash, rate-limited polling so slow buses do not starve control loops.</p>',
    failures: ['BMC hang → watchdog reset (host unaffected)', 'Flash corruption → boot alternate image', 'Bus contention with host → arbitration/muxing', 'Security vulnerabilities → signed updates, minimal services'],
    monitoring: ['Self health, SEL, journal; external heartbeat from DC manager'],
    hotspots: [{ target: 'firmware', x: 40, y: 360, w: 200, h: 70, label: 'Dual SPI flash' }, { target: 'mgmt-buses', x: 260, y: 360, w: 200, h: 70, label: 'I2C/I3C masters' }, { target: 'thermal-control-loop', x: 480, y: 360, w: 200, h: 70, label: 'PWM/tach control' }, { target: 'sensing-feedback', x: 700, y: 360, w: 200, h: 70, label: 'ADC / sensors' }],
    scene(g, api) {
      const K = kit(g, api), ct = K.layer('control'), se = K.layer('sensing');
      K.box(ct, 30, 40, 900, 300, { d: 'control', label: 'BMC SoC' });
      const blocks = [['Arm cores ×2', 50, 80], ['DDR ctrl', 230, 80], ['Crypto / secure boot', 410, 80], ['Ethernet MAC', 590, 80], ['eSPI / PCIe / USB to host', 750, 80]];
      blocks.forEach(([l, x, y]) => K.box(ct, x, y, 160, 60, { d: 'control', label: l, center: true, ls: 12 }));
      K.mk('rect', { x: 50, y: 175, width: 860, height: 14, rx: 4, style: 'fill:var(--ctrl);opacity:.25' }, ct); K.text(ct, 480, 186, 'internal AXI/AHB bus', { anchor: 'middle', size: 10.5 });
      K.flow(ct, [[55, 182], [905, 182]], { color: 'var(--ctrl)', n: 18, r: 2.4, speed: 120 });
      const per = [['SPI flash A/B', 50], ['I2C/I3C ×16', 270], ['PWM / tach', 490], ['ADC ×16', 710]];
      per.forEach(([l, x]) => { K.box(ct, x, 220, 180, 60, { d: x === 710 ? 'sensing' : 'control', label: l, center: true, ls: 12 }); K.wire(ct, [[x + 90, 189], [x + 90, 220]], { d: 'control', w: 1.5 }); });
      [['Firmware flash', 40], ['PSU/VRM/optics/sensors', 260], ['Fans/pumps', 480], ['Thermistors/rails', 700]].forEach(([l, x]) => { K.box(ct, x, 360, 200, 70, { d: x === 700 ? 'sensing' : 'control', label: l, center: true, ls: 12 }); K.wire(ct, [[x + 100, 280], [x + 100, 360]], { d: 'control', w: 1.4, dash: '3 3' }); K.flow(se, [[x + 100, 360], [x + 100, 280]], { color: 'var(--sense)', n: 2, r: 2.2, speed: 40 }); });
      // Redfish exchange
      K.box(ct, 30, 460, 300, 110, { d: 'control', label: 'DC manager', sub: 'Redfish client' });
      const req = K.text(ct, 350, 485, '', { size: 11.5, mono: true, fill: 'var(--ctrl)' });
      const resp = K.mk('g', {}, se); const rl = K.lines(resp, 350, 510, ['{ "Temperatures": [', '   { "Name": "ASIC_Tj", "ReadingCelsius": 0 },', '   { "Name": "Coolant_Out", "ReadingCelsius": 0 } ] }'], { size: 11, mono: true, fill: 'var(--sense)' });
      const pk = K.flow(ct, [[330, 515], [670, 515], [670, 120]], { color: 'var(--ctrl)', n: 1, r: 4, speed: 200 });
      K.tick((dt, t) => {
        const p = (t % 4) / 4;
        req.textContent = p < 0.4 ? 'GET /redfish/v1/Chassis/1/Thermal  →' : '← 200 OK (JSON)';
        resp.style.opacity = p > 0.45 ? 1 : 0.15;
        rl[1].textContent = '   { "Name": "ASIC_Tj", "ReadingCelsius": ' + (78 + 3 * Math.sin(t * 0.7)).toFixed(1) + ' },';
        rl[2].textContent = '   { "Name": "Coolant_Out", "ReadingCelsius": ' + (44 + Math.sin(t * 0.3)).toFixed(1) + ' } ] }';
        pk.on = p < 0.4;
      });
      K.cap0('Typical BMC SoC architecture (AST2600-class); values illustrative.');
    }
  });

  add({
    id: 'mgmt-cpu', parent: 'control-plane', domain: 'control', level: 3,
    title: 'Management CPU, NOS & SDK', subtitle: 'host SoC running the switch OS; PCIe, DMA rings, MSI-X to the ASIC',
    summary: 'The management CPU is the switch\'s brain for the control plane: it boots a Linux-based network OS, loads the ASIC SDK/driver, programs forwarding tables, brings up SerDes and optical links, runs routing or fabric-management agents and streams telemetry. It talks to the switch ASIC over PCIe — memory-mapped registers for configuration and DMA descriptor rings for packets punted to the CPU and bulk counter reads.',
    what: `<p><b>Hardware</b> ${CPO.badge('typ')}: x86 (embedded server class) or Arm SoC, 4–16 cores, 8–32 GB DRAM, M.2 SSD, PCIe Gen3–5 ×4–×8 to the ASIC, plus connections to BMC (eSPI/LPC/USB), CPLD and buses.</p>
<p><b>Software stack</b>: applications (routing protocols for Ethernet; for InfiniBand a subnet-manager agent or external fabric manager) → NOS (Linux, e.g. SONiC-class with SAI, or vendor OS) → vendor SDK → kernel driver → PCIe.</p>
<p><b>Data path to CPU</b>: control packets (BGP, LLDP, management MADs) are trapped by the ASIC and DMA-written into host memory via RX descriptor rings; an MSI-X interrupt (or polling) signals the driver. TX works the same way in reverse.</p>
<p><b>Optics bring-up</b>: the NOS/SDK enables ELS lasers, waits for ring lock and receiver CDR lock, trains SerDes, then declares links up — orchestrated via CMIS-style state machines.</p>`,
    needs: ['Reliable PCIe link to ASIC (link training, AER)', 'Enough CPU for routing convergence & telemetry', 'Watchdog and hitless restart', 'Secure boot of NOS'],
    interfaces: [{ with: 'switch ASIC', type: 'electrical', detail: 'PCIe BARs, DMA, MSI-X' }, { with: 'BMC', type: 'mgmt', detail: 'console, power, IPMI/Redfish host interface' }, { with: 'Optics', type: 'mgmt', detail: 'CMIS via buses or ASIC sideband' }],
    kpis: [{ name: 'PCIe', value: 'Gen3–5 ×4–×8', tag: 'typ' }, { name: 'DRAM', value: '8–32 GB', tag: 'typ' }, { name: 'Punt rate', value: '~10k–1M pkt/s', tag: 'typ' }],
    physics: `<div class="eq">PCIe Gen4 ×4 ≈ 4 × 16 GT/s × 128/130 ≈ 63 Gb/s raw (~7.9 GB/s)
DMA ring: head/tail pointers; producer writes descriptor → doorbell register → device DMAs → MSI-X</div>`,
    failures: ['PCIe link down → SDK cannot program ASIC; data plane keeps last state', 'CPU overload (control-plane DoS) → policers (CoPP) on punted traffic', 'NOS crash → watchdog/hitless restart'],
    monitoring: ['NOS health, CPU/memory, PCIe AER counters', 'Streaming telemetry (gNMI)'],
    hotspots: [{ target: 'firmware', x: 30, y: 40, w: 330, h: 300, label: 'Software / firmware stack' }, { target: 'asic-die', x: 780, y: 40, w: 200, h: 300, label: 'Switch ASIC' }, { target: 'cmis', x: 30, y: 470, w: 330, h: 80, label: 'Optics management' }],
    scene(g, api) {
      const K = kit(g, api), ct = K.layer('control'), da = K.layer('data');
      const stack = ['Apps: routing / fabric mgr / telemetry', 'NOS (Linux-based)', 'SAI / vendor SDK', 'Kernel driver', 'PCIe root complex'];
      const sb = stack.map((s, i) => K.box(ct, 30, 40 + i * 60, 330, 50, { d: 'control', label: s, center: true, ls: 12.5 }));
      K.box(ct, 400, 40, 340, 300, { d: 'control', label: 'Host DRAM' });
      K.text(ct, 420, 80, 'RX descriptor ring', { size: 11.5, fill: 'var(--muted)' });
      const slots = []; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; slots.push(K.mk('rect', { x: 570 + 90 * Math.cos(a) - 18, y: 200 + 90 * Math.sin(a) - 10, width: 36, height: 20, rx: 3, style: 'fill:var(--panel2);stroke:var(--ctrl)' }, ct)); }
      const head = K.text(ct, 570, 205, 'head/tail', { anchor: 'middle', size: 11, fill: 'var(--muted)' });
      K.chip(da, 780, 40, 200, 300, { d: 'data', label: 'Switch ASIC', sub: 'BARs · DMA engine', stroke: 'var(--accent)' });
      K.wire(da, [[780, 300], [740, 300]], { d: 'data', w: 6, op: 0.5 }); K.text(da, 760, 290, 'PCIe', { anchor: 'middle', size: 10.5, fill: 'var(--data)' });
      const pkt = K.flow(da, [[880, 200], [880, 300], [660, 300], [660, 200]], { color: 'var(--data)', n: 3, r: 4, speed: 120 });
      const irq = K.flow(ct, [[780, 120], [360, 120]], { color: 'var(--ctrl)', n: 1, r: 4, speed: 300 }); K.text(ct, 560, 112, 'MSI-X', { anchor: 'middle', size: 10.5, fill: 'var(--ctrl)' });
      const reg = K.flow(ct, [[360, 260], [780, 260]], { color: 'var(--ctrl)', n: 2, r: 3, speed: 200 }); K.text(ct, 560, 252, 'MMIO register writes (tables, SerDes)', { anchor: 'middle', size: 10.5, fill: 'var(--muted)' });
      K.box(ct, 30, 380, 950, 70, { d: 'control', label: 'Link bring-up (per port)', sub: '' });
      const steps = ['ELS enable', 'ring lock', 'CDR lock', 'SerDes train', 'FEC lock', 'LINK UP'], sx = [];
      steps.forEach((s, i) => sx.push(K.box(ct, 200 + i * 128, 395, 118, 40, { d: i < 2 ? 'optics' : 'data', label: s, center: true, ls: 12 })));
      K.box(ct, 30, 470, 330, 80, { d: 'optics', label: 'Optics management', sub: 'CMIS-style pages for ELS/OE' });
      const rP = K.readout(ct, 400, 480, 'punted packets', { d: 'control' });
      let n = 0, hp = 0;
      K.tick((dt, t) => {
        hp = Math.floor(t * 3) % 8; slots.forEach((s, i) => { s.style.fill = i === hp ? 'rgba(34,211,238,.45)' : ((i + 8 - hp) % 8) < 3 ? 'rgba(167,139,250,.25)' : 'var(--panel2)'; });
        n += dt * 4200; rP.set(Math.floor(n).toLocaleString());
        const k = Math.floor((t % 9) / 1.3); sx.forEach((b, i) => { b.rect.style.fill = i < k ? 'rgba(61,220,132,.2)' : i === k ? 'rgba(167,139,250,.35)' : ''; });
        sb.forEach((b, i) => { b.rect.style.fill = Math.floor(t * 2) % 5 === i ? 'rgba(167,139,250,.2)' : ''; });
      });
      K.cap0('Control packets trapped by the ASIC are DMA-written into a host ring and signalled with MSI-X. Stack shown is typical.');
    }
  });

  add({
    id: 'cpld', parent: 'control-plane', domain: 'control', level: 3,
    title: 'CPLD / Board FPGA', subtitle: 'hardware state machines: sequencing, resets, interrupts, THERMTRIP, laser interlocks',
    summary: 'The CPLD is the board\'s reflex system: non-volatile programmable logic that is alive as soon as standby power is, and that implements everything that must work without software — power sequencing with PGOOD checks, the reset tree, interrupt aggregation, I2C muxing/presence detection, front-panel LEDs, and hard-wired safety such as THERMTRIP power-off and laser-enable interlocks.',
    what: `<p><b>Why logic, not firmware?</b> Deterministic µs-level response, no boot time, immune to OS crashes. A THERMTRIP from the ASIC must cut power within microseconds; a missing fiber/ELS interlock must keep lasers dark regardless of software state ${CPO.badge('typ')}.</p>
<p><b>Register file</b>: the BMC and CPU access status/control registers over I2C, LPC/eSPI or SPI: power state, first-fault latch, reset controls, LED modes, module presence, interrupt status/mask.</p>
<p><b>Updates</b>: bitstream via JTAG or the BMC (background flash + refresh on next power cycle).</p>`,
    needs: ['Standby power', 'Well-defined state machine with timeouts', 'Glitch filtering on inputs', 'Safe defaults (lasers off, rails off)'],
    interfaces: [{ with: 'Regulators', type: 'electrical', detail: 'EN, PGOOD' }, { with: 'ASIC / CPU', type: 'electrical', detail: 'resets, THERMTRIP, interrupts' }, { with: 'BMC', type: 'mgmt', detail: 'register access' }, { with: 'ELS modules', type: 'electrical', detail: 'presence, laser enable' }],
    kpis: [{ name: 'Response time', value: '< 1–10 µs', tag: 'typ' }, { name: 'I/O count', value: 'hundreds', tag: 'est' }, { name: 'Logic', value: '~1–10k LUTs', tag: 'typ' }],
    physics: '<div class="eq">PWR_KILL = THERMTRIP_N̄ ∨ OVP ∨ (state = FAULT)\nLASER_EN = PGOOD_ALL ∧ ELS_PRESENT ∧ FIBER_OK ∧ SW_ENABLE ∧ ¬FAULT</div>',
    failures: ['Logic bug → wrong sequence (field-update risk)', 'Input glitch → spurious shutdown; filtering', 'Bitstream corruption → golden image'],
    monitoring: ['First-fault register read by BMC after any shutdown', 'State register telemetry'],
    hotspots: [{ target: 'power-sequencing', x: 30, y: 40, w: 560, h: 280, label: 'Power-sequencing FSM' }, { target: 'mgmt-buses', x: 620, y: 40, w: 360, h: 120, label: 'Register access' }, { target: 'firmware', x: 620, y: 180, w: 360, h: 140, label: 'Bitstream update' }],
    scene(g, api) {
      const K = kit(g, api), ct = K.layer('control'), se = K.layer('sensing');
      K.box(ct, 30, 40, 560, 280, { d: 'control', label: 'Power state machine' });
      const S_ = [['OFF', 80, 110], ['STBY', 220, 110], ['SEQ_UP', 360, 110], ['RUN', 500, 110], ['SEQ_DN', 360, 240], ['FAULT', 160, 240]];
      const nodes = S_.map(([l, x, y]) => { const c = K.mk('circle', { cx: x, cy: y, r: 36, style: 'fill:var(--panel2);stroke:var(--ctrl);stroke-width:2' }, ct); K.text(ct, x, y + 4, l, { anchor: 'middle', size: 12, weight: 600 }); return c; });
      [[0, 1], [1, 2], [2, 3], [3, 4], [4, 1], [2, 5], [3, 5], [5, 0]].forEach(([a, b]) => { const A = S_[a], B = S_[b]; const dx = B[1] - A[1], dy = B[2] - A[2], L = Math.hypot(dx, dy); K.wire(ct, [[A[1] + dx / L * 38, A[2] + dy / L * 38], [B[1] - dx / L * 40, B[2] - dy / L * 40]], { d: 'control', arrow: true, w: 1.4, op: 0.7 }); });
      K.text(ct, 290, 300, 'timeout / PGOOD lost / THERMTRIP → FAULT (latched)', { anchor: 'middle', size: 11, fill: 'var(--bad)' });
      K.box(ct, 620, 40, 360, 120, { d: 'control', label: 'Register file (via I2C / eSPI)', sub: 'STATE · FIRST_FAULT · RESET_CTRL · IRQ_STATUS · LED' });
      const regs = K.text(ct, 640, 135, '', { size: 11.5, mono: true, fill: 'var(--ctrl)' });
      K.box(ct, 620, 180, 360, 140, { d: 'control', label: 'Bitstream / update', sub: 'JTAG or BMC background flash; golden image' });
      // interlock gates
      K.text(ct, 30, 360, 'Hard-wired interlocks', { size: 13, weight: 600 });
      const ins = ['PGOOD_ALL', 'ELS_PRESENT', 'FIBER_OK', 'SW_ENABLE', 'NOT FAULT'], lamps = [];
      ins.forEach((l, i) => { K.text(se, 40, 395 + i * 32, l, { size: 11.5, mono: true }); lamps.push(K.mk('circle', { cx: 170, cy: 391 + i * 32, r: 7, style: 'fill:var(--good)' }, se)); K.wire(ct, [[180, 391 + i * 32], [300, 391 + i * 32], [300, 455]], { d: 'control', w: 1.2, op: 0.5 }); });
      K.mk('path', { d: 'M300 410 L340 410 A45 45 0 0 1 340 500 L300 500 Z', style: 'fill:var(--panel2);stroke:var(--ctrl);stroke-width:2' }, ct); K.text(ct, 330, 460, 'AND', { anchor: 'middle', size: 12 });
      const out = K.box(ct, 420, 430, 160, 50, { d: 'optics', label: 'LASER_EN', center: true });
      K.wire(ct, [[385, 455], [420, 455]], { d: 'control', arrow: true });
      K.mk('path', { d: 'M640 410 L680 410 A45 45 0 0 1 680 500 L640 500 Q665 455 640 410 Z', style: 'fill:var(--panel2);stroke:var(--bad);stroke-width:2' }, ct); K.text(ct, 672, 460, 'OR', { anchor: 'middle', size: 12 });
      ['THERMTRIP', 'OVP', 'FAULT'].forEach((l, i) => { K.text(se, 620, 425 + i * 30, l, { size: 11, mono: true, anchor: 'end' }); K.wire(ct, [[625, 421 + i * 30], [650, 421 + i * 30]], { color: 'var(--bad)', w: 1.2 }); });
      const kill = K.box(ct, 760, 430, 200, 50, { d: 'power', label: 'PWR_KILL (< 10 µs)', center: true });
      K.wire(ct, [[725, 455], [760, 455]], { color: 'var(--bad)', arrow: true });
      const seq = [0, 1, 2, 3, 3, 3, 4, 1, 2, 5, 0];
      K.tick((dt, t) => {
        const i = seq[Math.floor(t / 1.2) % seq.length];
        nodes.forEach((c, j) => { c.style.fill = j === i ? (j === 5 ? 'rgba(255,77,94,.4)' : 'rgba(167,139,250,.45)') : 'var(--panel2)'; c.setAttribute('filter', j === i ? K.glow : 'none'); });
        regs.textContent = 'STATE=' + S_[i][0].padEnd(6) + ' FIRST_FAULT=' + (i === 5 ? '0x12 VCORE_PG' : '0x00');
        const fiber = Math.sin(t * 0.5) > -0.6, run = i === 3;
        const v = [run, true, fiber, true, i !== 5];
        lamps.forEach((l, j) => { l.style.fill = v[j] ? 'var(--good)' : 'var(--bad)'; });
        const en = v.every(Boolean); out.rect.style.fill = en ? 'rgba(255,107,61,.4)' : ''; out.rect.setAttribute('filter', en ? K.glow : 'none');
        kill.rect.style.fill = i === 5 ? 'rgba(255,77,94,.4)' : '';
      });
      K.cap0('LASER_EN only when all interlocks are true (fiber unplug drops it instantly). Fault path latches and powers off in hardware.');
    }
  });

  add({
    id: 'mgmt-buses', parent: 'control-plane', domain: 'control', level: 4,
    title: 'Management Buses', subtitle: 'I2C/I3C/SMBus/PMBus, MDIO, SPI, JTAG, UART, PCIe, OOB Ethernet',
    summary: 'Low-speed buses tie the management plane to hundreds of devices. I2C/SMBus/PMBus (open-drain, two wires) reach sensors, regulators, EEPROMs and optics; I3C adds push-pull speed and in-band interrupts; MDIO configures PHY-like devices; SPI carries boot flash; JTAG does boundary scan and programming; UART gives consoles; PCIe and Ethernet carry the high-bandwidth management traffic.',
    what: `<p><b>I2C electrical</b> ${CPO.badge('typ')}: open-drain with pull-ups; rising edges are RC-limited: t_r(30→70 %) = 0.8473·R_p·C_b. Standard 100 kHz (t_r ≤ 1 µs), Fast 400 kHz (≤ 300 ns), Fm+ 1 MHz (≤ 120 ns); C_b ≤ 400 pF (Fm+ 550 pF). Many devices per switch → muxes (PCA954x-style) segment the bus and isolate a stuck device.</p>
<p><b>Protocol</b>: START, 7-bit address + R/W, ACK, data bytes + ACK, STOP; clock stretching; a hung slave holding SDA low is recovered with up to 9 SCL pulses.</p>
<p><b>SMBus/PMBus</b>: timeouts (35 ms), PEC CRC-8, ALERT#. <b>I3C</b>: 12.5 MHz SDR push-pull, dynamic addressing, in-band interrupts — attractive for many-lane optics telemetry.</p>
<p><b>Others</b>: MDIO (Clause 22/45, ~2.5 MHz), QSPI NOR (50–133 MHz), JTAG (TCK/TMS/TDI/TDO), UART 115200 Bd, PCIe ×4–×8 CPU↔ASIC, 1 GbE OOB (RGMII/NC-SI).</p>`,
    needs: ['Correct pull-up sizing vs capacitance and speed', 'Address planning and muxing', 'Bus-hang recovery', 'Level shifting between voltage domains'],
    interfaces: [{ with: 'BMC / CPU / CPLD', type: 'mgmt', detail: 'bus masters' }, { with: 'All managed devices', type: 'mgmt', detail: 'slaves/targets' }],
    kpis: [{ name: 'I2C speeds', value: '100 k / 400 k / 1 MHz', tag: 'typ' }, { name: 'I3C', value: '12.5 MHz SDR', tag: 'typ' }, { name: 'Max C_b', value: '400 pF', tag: 'typ' }, { name: 'SMBus timeout', value: '35 ms', tag: 'typ' }],
    physics: `<div class="eq">t_r = 0.8473·R_p·C_b        R_p = 2.2 kΩ, C_b = 200 pF → 373 ns (too slow for 400 kHz!)
R_p,min = (V_DD − V_OL,max)/I_OL = (3.3 − 0.4)/3 mA ≈ 1 kΩ
Throughput ≈ f_SCL × 8/9 (ACK) minus address/protocol overhead</div>`,
    failures: ['Stuck SDA → bus hang → 9-clock recovery, mux isolation, power-cycle device', 'Slow edges → bit errors at speed', 'Address conflicts', 'Back-powering unpowered devices through bus pins'],
    monitoring: ['Bus error/NACK counters in BMC', 'Transaction timeouts', 'Scope/logic analyzer during bring-up'],
    hotspots: [{ target: 'cmis', x: 640, y: 380, w: 340, h: 70, label: 'CMIS over I2C/I3C' }, { target: 'bmc', x: 30, y: 380, w: 180, h: 70, label: 'Bus master (BMC)' }, { target: 'cpld', x: 230, y: 380, w: 180, h: 70, label: 'CPLD mux / registers' }],
    scene(g, api) {
      const K = kit(g, api), ct = K.layer('control'), se = K.layer('sensing');
      const X = 60, W = 900;
      K.text(ct, 30, 70, 'SCL', { size: 12, mono: true }); K.text(ct, 30, 160, 'SDA', { size: 12, mono: true });
      const scl = K.mk('path', { filter: K.glow, style: 'fill:none;stroke:var(--ctrl);stroke-width:2' }, ct);
      const sda = K.mk('path', { filter: K.glow, style: 'fill:none;stroke:var(--sense);stroke-width:2' }, se);
      const lab = K.mk('g', {}, ct);
      // frame: S, addr 0x50 (7 bits) + R(1), ACK, data 0xA7, ACK, P
      const bits = ['S'].concat('1010000'.split(''), ['1', 'A'], '10100111'.split(''), ['N', 'P']);
      const names = ['START'].concat(Array(7).fill('addr'), ['R', 'ACK'], Array(8).fill('data'), ['NACK', 'STOP']);
      let RC = 0.3;
      const build = () => {
        const n = bits.length, bw = W / n; let pc = '', pd = '';
        const tau = RC * bw * 0.25; const rise = (y0, y1, x0, x1) => { let s = ''; for (let k = 0; k <= 8; k++) { const x = x0 + (x1 - x0) * k / 8; const f = y1 < y0 ? 1 - Math.exp(-(x - x0) / Math.max(1, tau)) : 1; s += ' L' + x.toFixed(1) + ' ' + (y0 + (y1 - y0) * f).toFixed(1); } return s; };
        let sd = 150; pd = 'M' + X + ' 100';
        for (let i = 0; i < n; i++) {
          const x0 = X + i * bw, b = bits[i];
          // SCL: high-low-high per bit (except S/P markers)
          if (i === 0) pc += 'M' + x0 + ' 50 L' + (x0 + bw * 0.7) + ' 50 L' + (x0 + bw * 0.7) + ' 90';
          else if (i === n - 1) pc += ' L' + x0 + ' 90 L' + (x0 + bw * 0.3) + ' 90' + rise(90, 50, x0 + bw * 0.3, x0 + bw * 0.6) + ' L' + (x0 + bw) + ' 50';
          else pc += ' L' + (x0 + bw * 0.25) + ' 90' + rise(90, 50, x0 + bw * 0.25, x0 + bw * 0.5) + ' L' + (x0 + bw * 0.75) + ' 50 L' + (x0 + bw * 0.75) + ' 90';
          let level = b === '1' || b === 'N' ? 100 : 140; if (b === 'S') level = 140; if (b === 'P') level = 100;
          if (b === 'S') pd += ' L' + (x0 + bw * 0.35) + ' 100 L' + (x0 + bw * 0.35) + ' 140';
          else if (b === 'P') pd += ' L' + (x0 + bw * 0.4) + ' 140' + rise(140, 100, x0 + bw * 0.4, x0 + bw * 0.8) + ' L' + (x0 + bw) + ' 100';
          else { pd += (level < sd ? rise(sd, level, x0, x0 + bw * 0.2) : ' L' + x0 + ' ' + sd + ' L' + x0 + ' ' + level) + ' L' + (x0 + bw) + ' ' + level; }
          sd = b === 'P' ? 100 : level;
        }
        scl.setAttribute('d', pc); sda.setAttribute('d', pd);
        while (lab.firstChild) lab.removeChild(lab.firstChild);
        bits.forEach((b, i) => K.text(lab, X + (i + 0.5) * bw, 185, b, { anchor: 'middle', size: 11, mono: true, fill: names[i] === 'ACK' || names[i] === 'NACK' ? 'var(--good)' : 'var(--muted)' }));
      };
      build();
      K.text(ct, X, 210, 'addr 0x50 (EEPROM/CMIS lower page) · R · ACK by target · data 0xA7 · NACK by host · STOP', { size: 11, fill: 'var(--muted)' });
      const cur = K.mk('line', { x1: X, x2: X, y1: 40, y2: 195, style: 'stroke:var(--text);opacity:.4' }, ct);
      K.text(ct, 30, 250, 'Pull-up × bus capacitance (rise time):', { size: 12, fill: 'var(--muted)' });
      const rT = K.readout(se, 520, 236, 't_r = 0.8473·R_p·C_b', { d: 'sensing' });
      const opts = [[1, 100], [2.2, 200], [4.7, 400]];
      K.radio(ct, 260, 238, ['1 kΩ·100 pF', '2.2 kΩ·200 pF', '4.7 kΩ·400 pF'], 110, i => { const [r, c] = opts[i]; RC = r * c / 220 * 0.3; build(); rT.set((0.8473 * r * c).toFixed(0) + ' ns ' + (0.8473 * r * c > 300 ? '✗ 400 kHz' : '✓ 400 kHz')); }, 0);
      rT.set('85 ns ✓ 400 kHz');
      const tbl = [['Bus', 'Speed', 'Wires', 'Use'], ['I2C/SMBus', '0.1–1 MHz', '2 OD', 'sensors, EEPROM, optics'], ['PMBus', '0.1–1 MHz', '2+ALERT', 'VRM/PSU telemetry'], ['I3C', '12.5 MHz', '2 PP', 'many-lane telemetry'], ['MDIO', '~2.5 MHz', '2', 'PHY/retimer regs'], ['QSPI', '50–133 MHz', '6', 'boot flash'], ['JTAG', '~10–50 MHz', '4–5', 'scan, CPLD prog'], ['UART', '115.2 kBd', '2', 'console']];
      tbl.forEach((r, i) => r.forEach((c, j) => K.text(ct, 30 + [0, 120, 230, 320][j], 290 + i * 11.5 + (i ? 4 : 0), c, { size: 10.5, fill: i ? 'var(--text)' : 'var(--muted)', mono: j === 1 })));
      K.box(ct, 30, 380, 180, 70, { d: 'control', label: 'BMC master', center: true });
      K.box(ct, 230, 380, 180, 70, { d: 'control', label: 'I2C mux (CPLD)', center: true });
      K.box(ct, 640, 380, 340, 70, { d: 'optics', label: 'ELS / OE management targets', sub: 'CMIS pages', center: true });
      ['PSU', 'VRMs', 'sensors', 'FRU EEPROM'].forEach((l, i) => K.box(ct, 430 + (i % 2) * 105, 380 + Math.floor(i / 2) * 38, 100, 32, { d: 'control', label: l, center: true, ls: 11 }));
      K.wire(ct, [[210, 415], [230, 415]], { d: 'control' }); K.wire(ct, [[410, 415], [640, 415]], { d: 'control', op: 0.3 });
      K.flow(ct, [[120, 450], [120, 480], [810, 480], [810, 450]], { color: 'var(--ctrl)', n: 10, r: 2.6, speed: 100 });
      K.wire(ct, [[120, 450], [120, 480], [810, 480], [810, 450]], { d: 'control', dash: '3 3', w: 1.2 });
      K.tick((dt, t) => { const x = X + ((t * 0.15) % 1) * W; cur.setAttribute('x1', x); cur.setAttribute('x2', x); });
      K.cap0('I2C waveform drawn with RC-limited rising edges (open drain); falling edges are driven hard. Pick a pull-up/capacitance pair to see slow edges.');
    }
  });

  add({
    id: 'cmis', parent: 'control-plane', domain: 'control', level: 4,
    title: 'CMIS-style Optics Management', subtitle: 'memory map pages, module & data-path state machines, DDM alarms',
    summary: 'CMIS (OIF Common Management Interface Specification) defines how a host manages an optical module: a paged register map (identity, status, DDM, thresholds, per-lane controls), a module state machine (LowPwr → PwrUp → Ready) and per-lane data-path state machines. Pluggables use it over I2C; for CPO, the same concepts apply to front-panel ELS modules (OIF ELSFP work) and to the control of co-packaged engines.',
    what: `<p><b>Memory map</b> ${CPO.badge('typ')}: lower page 00h (status, flags, module monitors: temperature, Vcc), upper pages 00h (identity/advertising), 01h (capabilities), 02h (alarm/warning thresholds), 10h/11h (per-lane control and status: Tx disable, Rx LOS, laser bias, Tx/Rx power), banks for >8 lanes, CDB for firmware download.</p>
<p><b>Module state machine</b>: ModuleLowPwr → ModulePwrUp → ModuleReady (and PwrDn / Fault). <b>Data-path</b> per lane group: DPDeactivated → DPInit → DPInitialized → DPActivated.</p>
<p><b>DDM thresholds</b>: high-alarm / high-warning / low-warning / low-alarm per quantity; latched flags + interrupt (IntL) so the host does not need to poll constantly.</p>
<p><b>CPO</b>: lasers are external, so laser-related monitors (bias, power, temperature, wavelength-lock) live in the ELS module, while ring tuning, TIA/CDR status live in the engine ${CPO.badge('est')}.</p>`,
    needs: ['Consistent register semantics across vendors', 'Scalable polling or interrupts for hundreds of lanes', 'Firmware download (CDB) with integrity checks'],
    interfaces: [{ with: 'Host (NOS/SDK)', type: 'mgmt', detail: 'I2C/I3C register access' }, { with: 'ELS / OE', type: 'optical', detail: 'laser enable, bias, DOM' }],
    kpis: [{ name: 'Page size', value: '128 B upper pages', tag: 'typ' }, { name: 'Lanes per bank', value: '8', tag: 'typ' }, { name: 'DDM quantities', value: 'T, Vcc, bias, Tx/Rx power', tag: 'typ' }],
    physics: '<div class="eq">Rx power DOM is encoded in 0.1 µW LSB: 0x2710 = 10000 → 1.000 mW (0 dBm)\nP[dBm] = 10·log10(P / 1 mW)</div>',
    failures: ['Threshold misconfiguration → missed or nuisance alarms', 'State machine stuck in DPInit → link never comes up', 'Firmware download interrupted → module recovery image'],
    monitoring: ['Latched flags + IntL', 'Periodic DDM polling, trended by NOS'],
    hotspots: [{ target: 'laser-apc-loop', x: 560, y: 360, w: 420, h: 120, label: 'Laser monitors (APC)' }, { target: 'monitor-pd', x: 560, y: 490, w: 420, h: 70, label: 'Rx power monitors' }, { target: 'mgmt-buses', x: 30, y: 490, w: 500, h: 70, label: 'I2C/I3C transport' }],
    scene(g, api) {
      const K = kit(g, api), ct = K.layer('control'), se = K.layer('sensing');
      const ms = ['ModuleLowPwr', 'ModulePwrUp', 'ModuleReady'], dp = ['DPDeactivated', 'DPInit', 'DPInitialized', 'DPActivated'];
      K.text(ct, 30, 50, 'Module state machine', { size: 12, fill: 'var(--muted)' });
      const mb = ms.map((s, i) => K.box(ct, 30 + i * 175, 60, 160, 44, { d: 'control', label: s, center: true, ls: 12 }));
      K.text(ct, 30, 140, 'Data-path state machine (per lane group)', { size: 12, fill: 'var(--muted)' });
      const db = dp.map((s, i) => K.box(ct, 30 + i * 130, 150, 120, 44, { d: 'data', label: s, center: true, ls: 11 }));
      // memory map
      K.box(ct, 560, 40, 420, 300, { d: 'control', label: 'Memory map' });
      const pages = [['Lower 00h', 'status · flags · temp · Vcc'], ['Upper 00h', 'identity / vendor'], ['Upper 01h', 'advertising'], ['Upper 02h', 'alarm / warning thresholds'], ['Upper 10h', 'lane control (Tx disable…)'], ['Upper 11h', 'lane status · bias · Tx/Rx power'], ['CDB', 'firmware download']];
      const pb = pages.map(([a, b], i) => { const gg = K.box(ct, 575, 70 + i * 37, 390, 32, { d: 'control', rx: 4 }); K.text(gg, 585, 91 + i * 37, a, { size: 11.5, mono: true, fill: 'var(--ctrl)' }); K.text(gg, 690, 91 + i * 37, b, { size: 11, fill: 'var(--muted)' }); return gg; });
      K.flow(ct, [[530, 520], [540, 520], [540, 200], [575, 200]], { color: 'var(--ctrl)', n: 4, r: 2.6, speed: 90 });
      // DDM with thresholds
      const pl = K.plot(se, 40, 250, 480, 210, { min: -8, max: 4, label: 'Lane Rx power DOM (dBm) with alarm/warning thresholds', n: 240, color: 'var(--sense)', glow: true });
      pl.hline(2, { label: 'high warn', color: 'var(--warn)' }); pl.hline(-4, { label: 'low warn', color: 'var(--warn)' }); pl.hline(-6, { label: 'low alarm', color: 'var(--bad)' });
      const flag = K.readout(se, 560, 370, 'Latched flags (page 11h)', { d: 'sensing' });
      const rd = K.readout(se, 800, 370, 'Rx power read', { d: 'sensing' });
      K.box(se, 560, 420, 420, 60, { d: 'optics', label: 'ELS module: laser T · bias · output power · lock', sub: '' });
      K.box(se, 560, 490, 420, 70, { d: 'sensing', label: 'Engine: Rx power per lane · ring-tune status · CDR lock' });
      K.box(ct, 30, 490, 500, 70, { d: 'control', label: 'Host access: I2C/I3C reads, IntL interrupt on flag change' });
      let s = 0, latched = false;
      K.tick((dt, t) => {
        s += dt;
        const k = Math.floor((t % 12) / 1.5);
        mb.forEach((b, i) => { b.rect.style.fill = i === Math.min(2, k) ? 'rgba(167,139,250,.4)' : ''; });
        db.forEach((b, i) => { b.rect.style.fill = i === CPO.clamp(k - 3, 0, 3) && k >= 3 ? 'rgba(34,211,238,.35)' : ''; });
        pb.forEach((b, i) => { b.rect.style.fill = i === Math.floor(t * 1.5) % 7 ? 'rgba(167,139,250,.3)' : ''; });
        let P = -1.5 + 0.4 * Math.sin(s * 0.9) + CPO.randn() * 0.08; if ((s % 20) > 14) P -= 4.5 * Math.min(1, ((s % 20) - 14) / 2);
        pl.push(P); if (P < -4) latched = true; if ((s % 20) < 0.1) latched = false;
        flag.set(latched ? 'L-Rx LOW WARN (latched)' : 'none'); flag.color(latched ? 'var(--warn)' : 'var(--good)');
        rd.set(P.toFixed(2) + ' dBm = 0x' + Math.round(Math.pow(10, P / 10) * 10000).toString(16).toUpperCase().padStart(4, '0'));
      });
      K.cap0('A fiber/connector degradation event drives Rx power below the warning threshold; the flag latches until the host reads it.');
    }
  });

  add({
    id: 'firmware', parent: 'control-plane', domain: 'control', level: 4,
    title: 'Firmware & Secure Boot', subtitle: 'chain of trust, A/B images, staged updates, inventory',
    summary: 'A CPO switch carries a dozen firmware images: BMC, host UEFI/bootloader, NOS, ASIC/SDK microcode, CPLD bitstream, VRM controller NVM, PSU, optical-engine microcontrollers and ELS modules. Each must be authenticated at boot (chain of trust from a hardware root of trust), updatable in the field with A/B fallback, and reported in an inventory so a fleet of thousands of switches stays consistent.',
    what: `<p><b>Chain of trust</b> ${CPO.badge('typ')}: immutable RoT (ROM or discrete RoT chip) verifies the BMC/boot loader signature → which verifies the kernel → which verifies the NOS and device firmware images; measurements go to a TPM/RoT for remote attestation.</p>
<p><b>A/B images</b>: update writes the inactive bank, verifies hash/signature, switches the boot pointer; a watchdog falls back to the old bank if the new one does not come up. Anti-rollback counters block downgrades to vulnerable versions.</p>
<p><b>Update channels</b>: Redfish UpdateService (BMC), NOS package manager, CMIS CDB for optics modules, PMBus for VRM NVM, JTAG/BMC for CPLD.</p>
<p><b>Hitless?</b> Data-plane forwarding can often continue through NOS/BMC updates (ISSU / warm boot); ASIC firmware or CPLD changes usually need a planned reboot.</p>`,
    needs: ['Hardware RoT + signed images', 'A/B redundancy for every critical image', 'Version compatibility matrix', 'Fleet-wide staged rollout'],
    interfaces: [{ with: 'BMC / CPU', type: 'mgmt', detail: 'SPI flash, SSD' }, { with: 'Devices', type: 'mgmt', detail: 'PMBus, CMIS CDB, JTAG' }, { with: 'DC manager', type: 'mgmt', detail: 'Redfish UpdateService, inventory' }],
    kpis: [{ name: 'Images per switch', value: '~10–20', tag: 'est' }, { name: 'Signature', value: 'RSA-3072/ECDSA-P384 class', tag: 'typ' }, { name: 'Hash', value: 'SHA-384 class', tag: 'typ' }],
    physics: '<div class="eq">verify:  Sig⁻¹(pubkey, signature) == SHA-384(image)\nboot pointer flips only after verify ∧ health-check within watchdog window</div>',
    failures: ['Power loss mid-update → inactive bank corrupt → still boots active bank', 'Incompatible versions (e.g. CPLD vs NOS) → compatibility checks', 'Compromised key → revocation, RoT key rotation'],
    monitoring: ['Firmware inventory via Redfish', 'Boot measurements / attestation logs'],
    hotspots: [{ target: 'bmc', x: 200, y: 60, w: 150, h: 70, label: 'BMC' }, { target: 'mgmt-cpu', x: 380, y: 60, w: 150, h: 70, label: 'Host / NOS' }, { target: 'cpld', x: 740, y: 60, w: 130, h: 70, label: 'CPLD bitstream' }, { target: 'cmis', x: 880, y: 60, w: 100, h: 70, label: 'Optics FW' }],
    scene(g, api) {
      const K = kit(g, api), ct = K.layer('control');
      const chain = [['RoT', 'immutable'], ['BMC', 'boot'], ['Host', 'UEFI/kernel'], ['NOS', 'image'], ['SDK', 'ASIC FW'], ['CPLD', 'bitstream'], ['Optics', 'OE/ELS FW']];
      const cb = chain.map(([a, b], i) => K.box(ct, 20 + i * 140 + (i > 4 ? -0 : 0), 60, 120, 70, { d: i === 6 ? 'optics' : 'control', label: a, sub: b, center: true }));
      cb[0].rect.style.stroke = 'var(--accent)';
      for (let i = 0; i < 6; i++) K.wire(ct, [[140 + i * 140, 95], [160 + i * 140, 95]], { d: 'control', arrow: true });
      const key = K.flow(ct, [[80, 95], [960, 95]], { color: 'var(--accent)', n: 1, r: 5, speed: 160 });
      K.text(ct, 20, 160, 'Each stage verifies the signature of the next before handing over (chain of trust).', { size: 11.5, fill: 'var(--muted)' });
      // A/B flash
      K.box(ct, 20, 200, 460, 200, { d: 'control', label: 'SPI flash A/B update' });
      const bA = K.box(ct, 40, 240, 200, 50, { d: 'control', label: 'Bank A  v1.4 (active)', center: true, ls: 12 });
      const bB = K.box(ct, 260, 240, 200, 50, { d: 'control', label: 'Bank B', center: true, ls: 12 });
      const prog = K.bar(ct, 260, 300, 200, 12, { color: 'var(--ctrl)' });
      const st_ = K.readout(ct, 40, 320, 'update state', { d: 'control' });
      K.box(ct, 520, 200, 460, 200, { d: 'control', label: 'Redfish UpdateService / inventory' });
      const inv = K.lines(ct, 540, 245, ['BMC        2.14.1   ✓ signed', 'NOS        4.2.0    ✓', 'CPLD       0x1A     ✓', 'VRM NVM    cfg-07   ✓', 'ELS ×N     1.3.2    ✓', 'OE MCU ×N  0.9.8    ✓'], { size: 11.5, mono: true, fill: 'var(--text)', lh: 22 });
      K.box(ct, 20, 430, 960, 120, { d: 'control', label: 'Fleet rollout', sub: 'canary → 1 % → 10 % → all, with health gates (link flaps, BER, temperatures)' });
      const fleet = []; for (let i = 0; i < 60; i++) fleet.push(K.mk('rect', { x: 40 + i * 15.5, y: 495, width: 12, height: 30, rx: 2, style: 'fill:var(--panel2)' }, ct));
      K.tick((dt, t) => {
        const p = (t % 10) / 10;
        let state;
        if (p < 0.5) { prog.set(p / 0.5); state = 'writing bank B v1.5…'; bB.rect.style.fill = 'rgba(167,139,250,.2)'; }
        else if (p < 0.6) { prog.set(1); state = 'verify SHA-384 + signature ✓'; }
        else if (p < 0.75) { state = 'reboot → watchdog health check'; }
        else { state = 'bank B active (A kept for rollback)'; bB.rect.style.fill = 'rgba(61,220,132,.25)'; }
        st_.set(state); bA.childNodes[1].textContent = p >= 0.75 ? 'Bank A  v1.4 (fallback)' : 'Bank A  v1.4 (active)'; bB.childNodes[1].textContent = p >= 0.75 ? 'Bank B  v1.5 (active)' : 'Bank B  v1.5';
        const n = Math.floor(Math.pow(((t % 20) / 20), 2) * 60);
        fleet.forEach((r, i) => { r.style.fill = i < n ? 'rgba(61,220,132,.6)' : 'var(--panel2)'; });
        cb.forEach((b, i) => { b.rect.style.fill = Math.floor((t * 1.2) % 7) === i ? 'rgba(118,185,0,.2)' : ''; });
        inv[0].textContent = 'BMC        2.14.' + (p >= 0.75 ? '2' : '1') + '   ✓ signed';
      });
      K.cap0('Illustrative versions. A/B banks make any interrupted update recoverable.');
    }
  });


  CPO.arch.addNodes(NODES);
})();
