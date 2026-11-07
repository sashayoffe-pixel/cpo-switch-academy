/* KPI catalogue section */
(function () {
  'use strict';
  const h = CPO.h, s = CPO.s;

  CPO.addGlossary({
    'OMA': { full: 'Optical Modulation Amplitude', def: 'Difference between the optical power of the high and low symbol levels (P1 - P0).', cat: 'optics' },
    'ER': { full: 'Extinction Ratio', def: 'Ratio of the high-level to low-level optical power, usually in dB.', cat: 'optics' },
    'TDECQ': { full: 'Transmitter and Dispersion Eye Closure Penalty (Quaternary)', def: 'IEEE 802.3 PAM4 transmitter quality metric: the SNR penalty versus an ideal transmitter after a reference equalizer.', cat: 'optics' },
    'BER': { full: 'Bit Error Ratio', def: 'Fraction of received bits in error.', cat: 'electrical' },
    'FEC': { full: 'Forward Error Correction', def: 'Redundancy added so that the receiver can correct errors; KP4 uses RS(544,514).', cat: 'electrical' },
    'KP4': { full: 'KP4 FEC (RS(544,514))', def: 'Reed-Solomon FEC used by 100G/200G-per-lane PAM4 Ethernet; pre-FEC BER threshold about 2.4e-4.', cat: 'electrical' },
    'FIT': { full: 'Failures In Time', def: 'Failures per 10^9 device-hours.', cat: 'reliability' },
    'MTBF': { full: 'Mean Time Between Failures', def: 'Average operating time between failures, 1e9 / FIT hours for a constant failure rate.', cat: 'reliability' },
    'KGD': { full: 'Known Good Die', def: 'A die tested before assembly so that bad dies do not ruin an expensive package.', cat: 'manufacturing' },
    'WPE': { full: 'Wall-Plug Efficiency', def: 'Optical output power divided by total electrical input power (including drive and cooling).', cat: 'optics' },
    'OSA': { full: 'Optical Spectrum Analyzer', def: 'Instrument that measures optical power versus wavelength.', cat: 'test' },
    'BERT': { full: 'Bit Error Ratio Tester', def: 'Pattern generator plus error detector used to measure BER.', cat: 'test' },
    'OTDR': { full: 'Optical Time-Domain Reflectometer', def: 'Instrument that locates loss and reflection events along a fiber.', cat: 'test' },
    'TIA': { full: 'Transimpedance Amplifier', def: 'Converts photodiode current into a voltage.', cat: 'optics' },
    'Tj': { full: 'Junction temperature', def: 'Temperature of the silicon junction.', cat: 'thermal' }
  });

  const CATS = [
    { id: 'thru', name: 'Throughput & ports', color: 'var(--data)', note: 'What the box moves.', gauge: ['Capacity', 0.82, '115 Tb/s'] },
    { id: 'opt', name: 'Optical', color: 'var(--optic)', note: 'Quality of light going in and out of the fiber.', gauge: ['TDECQ', 0.55, '< ~3.4 dB'] },
    { id: 'si', name: 'Electrical / SI', color: 'var(--accent2)', note: 'Is the received bit stream clean enough for FEC?', gauge: ['pre-FEC BER', 0.7, '< 2.4e-4'] },
    { id: 'pow', name: 'Power', color: 'var(--power)', note: 'Energy spent per bit, per port and per box.', gauge: ['Energy', 0.3, '~5 pJ/b'] },
    { id: 'therm', name: 'Thermal', color: 'var(--therm)', note: 'Silicon, rings and coolant.', gauge: ['Coolant dT', 0.5, '~10 K'] },
    { id: 'lat', name: 'Latency', color: 'var(--violet)', note: 'Time through the box.', gauge: ['Port-port', 0.35, '100s ns'] },
    { id: 'rel', name: 'Reliability', color: 'var(--sense)', note: 'Staying up for years across thousands of links.', gauge: ['FIT', 0.25, 'low FIT'] },
    { id: 'mfg', name: 'Manufacturing', color: 'var(--mech)', note: 'Build and test cost drivers.', gauge: ['Yield', 0.78, 'stacked Y'] }
  ];

  // k(cat, name, unit, def, formula, target, tag, why, limits, measure)
  const K = (cat, name, unit, def, eq, target, tag, why, limits, measure) => ({ cat, name, unit, def, eq, target, tag, why, limits, measure });
  const DATA = [
    K('thru', 'Aggregate switching capacity', 'Tb/s', 'Total bidirectional-per-direction bandwidth of all ports.', 'C = N_ports x R_port\n144 x 800G = 115.2 Tb/s', '115.2 Tb/s (Quantum-X); 102.4-409.6 Tb/s (Spectrum-X)', 'nv', 'Sets the cluster radix and number of switch tiers needed.', 'ASIC SerDes count, package/shoreline size, optical engine bandwidth density.', 'Traffic generator (e.g. line-rate RFC 2544-style tests) on all ports.'),
    K('thru', 'Port count & radix', 'ports', 'Number of external ports at a given speed, trading speed for count.', 'radix = C / R_port\n102.4T: 128x800G or 512x200G', '144x800G; 128x800G / 512x200G; 512x800G / 2048x200G', 'nv', 'Higher radix flattens the network and reduces hops.', 'Faceplate fiber count, connector density, SerDes breakout.', 'Link bring-up and port-mapping validation.'),
    K('thru', 'Per-lane rate & baud', 'Gb/s, GBd', 'Line rate per lane and its symbol rate after PAM4 and FEC overhead.', 'baud = R_bit x (544/514) / 2\n200G -> ~106-113 GBd', '200G PAM4, ~106-113 GBd', 'typ', 'Fewer lanes per port lowers cost, but bandwidth demands on every component rise.', 'Modulator and photodiode bandwidth, TIA/driver bandwidth, channel loss.', 'Sampling oscilloscope / BERT at the lane rate.'),
    K('opt', 'OMA (Optical Modulation Amplitude)', 'dBm', 'Optical swing between the outer PAM4 levels; the useful signal power.', 'OMA = P_high - P_low  [mW]\nOMA_dBm = 10 log10(OMA)', 'about 0 to +3 dBm per lane at the transmitter (module-class)', 'typ', 'Directly sets the received SNR for a given channel loss.', 'Laser power, modulator depth and insertion loss, ring detuning.', 'Optical oscilloscope with reference receiver or OMA-capable power meter.'),
    K('opt', 'Extinction ratio', 'dB', 'How well the modulator suppresses the low level.', 'ER = 10 log10(P_high / P_low)', 'about 3.5-5 dB for PAM4 (typical 802.3-class minimum ~3.5 dB)', 'typ', 'Low ER wastes laser power as a DC offset; too high costs insertion loss.', 'Ring Q and detuning range, drive swing, bias drift.', 'Sampling oscilloscope with optical plug-in.'),
    K('opt', 'TDECQ', 'dB', 'IEEE PAM4 transmitter quality metric: SNR penalty vs an ideal transmitter after reference equalization.', 'TDECQ = 10 log10(OMA_outer / (6 sigma_G Q_t))', '< about 3.4 dB (spec-class limit)', 'typ', 'Single number that predicts how much link margin the transmitter consumes.', 'Modulator nonlinearity, bandwidth, driver noise, laser RIN.', 'Oscilloscope running IEEE TDECQ algorithm.'),
    K('opt', 'Laser output power (per fiber)', 'dBm', 'CW power delivered by the external laser source into each fiber.', 'P_out = eta_slope (I - I_th)\ndBm = 10 log10(P / 1 mW)', 'tens of mW per fiber (about +10 to +17 dBm), with margin for losses', 'typ', 'Every dB lost downstream is paid for in laser power and heat.', 'Diode power, coupling, TEC power, eye safety class.', 'Calibrated power meter; integrating sphere; ELS internal monitor PD.'),
    K('opt', 'Wavelength accuracy', 'nm / pm', 'Offset of laser (and ring resonance) from its target channel.', 'd_lambda = lambda_meas - lambda_target\nring: 0.07-0.1 nm per K', 'laser within about +/-1 nm grid; ring lock within tens of pm', 'typ', 'A ring off-resonance loses OMA; mis-set lasers collide on the WDM grid.', 'Laser temperature stability, ring thermal drift, heater resolution.', 'Wavemeter / OSA.'),
    K('opt', 'Insertion loss', 'dB', 'Total optical loss of a path (coupler, waveguide, ring, connectors, fiber).', 'IL = 10 log10(P_in / P_out)\nfiber ~0.33 dB/km @1310', 'chip coupling 1-3 dB; connector <= ~0.5 dB each', 'typ', 'Dominant term in the optical power budget.', 'Mode mismatch, alignment, contamination, waveguide sidewall roughness.', 'Power meter pair; insertion-loss test set; OTDR for fiber plant.'),
    K('opt', 'Return loss', 'dB', 'How much light is reflected back; reflections add noise and disturb lasers.', 'RL = -10 log10(P_refl / P_in)', 'connector about >= 35 dB (UPC) / >= 60 dB (APC) class', 'typ', 'Reflections cause RIN and multipath interference, degrading SNR.', 'Connector polish, contamination, air gaps, index steps.', 'OTDR / return-loss meter.'),
    K('opt', 'Receiver sensitivity', 'dBm (OMA)', 'Minimum received OMA for BER at the FEC threshold.', 'P_sens = Q_req * sigma_n / R (V) \nR(Ge PD) ~ 0.8-1.0 A/W', 'about -5 to -8 dBm OMA at BER 2.4e-4 for 200G PAM4 module-class', 'typ', 'Defines how much channel loss the link can survive.', 'TIA noise, PD responsivity and bandwidth, equalizer gain.', 'BERT with variable optical attenuator.'),
    K('si', 'Pre-FEC BER', 'ratio', 'Raw bit error ratio at the receiver before correction.', 'BER ~ 0.75 Q( sqrt(SNR/5) )  (PAM4, Gray)', '<= 2.4e-4 (KP4 RS(544,514) threshold)', 'typ', 'Must stay below the FEC limit with margin or the link fails.', 'Receiver noise, ISI, jitter, crosstalk, laser RIN.', 'BERT or on-chip PRBS checkers/error counters.'),
    K('si', 'Post-FEC BER', 'ratio', 'Residual error ratio after FEC; what the network sees.', 'post-FEC <= 1e-13 ... 1e-15\n(t = 15 symbol errors per 544)', '<= 1e-13 to 1e-15', 'typ', 'Frame loss and retransmits in RDMA/AI collectives.', 'FEC burst errors, pre-FEC BER excursions.', 'FEC counters (uncorrectable codeword count), long-duration soak.'),
    K('si', 'FEC margin', 'dB / decades', 'Distance between operating pre-FEC BER and the threshold.', 'margin = log10(2.4e-4 / BER_op)', '1-2 decades of BER (or about 1-2 dB SNR) typical design target', 'typ', 'Absorbs aging, temperature and manufacturing spread.', 'Everything that increases noise; slow drift in ring tuning.', 'FEC symbol-error histograms; margin sweeps (attenuator).'),
    K('si', 'Jitter (TJ / RJ / DJ)', 'ps or UI', 'Timing variation of data edges or CDR clock.', 'TJ = DJ + 2 Q_BER x RJ_rms', 'sub-UI at ~9 ps symbol period; rms jitter on the order of 100 fs', 'typ', 'Eats horizontal eye opening and BER margin.', 'PLL phase noise, supply noise, driver bandwidth.', 'Real-time or sampling scope with jitter decomposition; BERT bathtub.'),
    K('si', 'Electrical SNR', 'dB', 'Signal power over total noise at the slicer.', 'SNR = (OMA R)^2 / (sigma_th^2 + sigma_shot^2 + sigma_RIN^2)\nPAM4 @2.4e-4 needs about 17.7 dB', 'about 17-18 dB needed at the KP4 threshold', 'typ', 'The bridge between optical power and BER.', 'Thermal noise of TIA, shot noise, laser RIN, ISI.', 'Eye diagram analysis; equalizer SNR monitor on-chip.'),
    K('pow', 'Energy per bit', 'pJ/bit', 'Optical-I/O power divided by bit rate; the headline CPO metric.', 'E_bit = P_link / R_bit', '~5 pJ/bit CPO vs ~15-20 pJ/bit pluggable; claimed 3.5x better', 'typ', 'Total switch power and rack cooling cost scale with it.', 'Laser WPE, SerDes power, driver/TIA design, ELS overhead.', 'Power analyzer at rails divided by traffic rate under load.'),
    K('pow', 'Power per port', 'W', 'Optics-related power for one 800G port.', 'P_port = E_bit x 800e9 \n5 pJ -> 4 W ; 17.5 pJ -> 14 W', 'about 4 W (CPO) vs 12-16 W (pluggable) per 800G [estimated]', 'typ', 'Determines per-switch optics budget (a 144-port switch).', 'Same as E_bit; link count.', 'Per-rail current sensing on the package, BMC telemetry.'),
    K('pow', 'Total switch power', 'kW', 'Wall power of the complete switch, including fans/pumps and conversion loss.', 'P_sw = P_asic + P_optics + P_laser + P_aux\nP_wall = P_sw / eta_psu', 'multi-kW class for 100T-class liquid-cooled switches [estimated]', 'est', 'Defines rack power density and cooling.', 'ASIC core power, PSU/VRM efficiency, laser overhead.', 'AC power meter / PMBus telemetry.'),
    K('pow', 'Power-conversion efficiency', '%', 'DC-DC efficiency from 48-54 V busbar to the die rails.', 'eta = P_out / P_in\nloss = I^2 R + switching', 'about 90-95% overall chain [typical]', 'typ', 'Every % lost is heat inside the box and at the cold plate.', 'Voltage ratio, VRM topology, distance to the load (I^2R).', 'Electronic load plus precision power analyzer.'),
    K('pow', 'Laser wall-plug efficiency', '%', 'Optical power out over electrical power in (drive, TEC, control).', 'WPE = P_opt / (V I + P_TEC + P_ctrl)', 'about 10-30% for DFB-class lasers with TEC [typical]', 'typ', 'Laser power is a large share of optics energy in CPO.', 'Threshold current, series resistance, TEC load, coupling.', 'Power meter and DC supply measurement.'),
    K('therm', 'Max junction temperature', 'deg C', 'Peak silicon temperature of ASIC and optical dies.', 'Tj = T_coolant + P x R_th', 'ASIC ~ 100-110 C limit; photonics preferably far lower (e.g. <= 70-85 C) [typical]', 'typ', 'Drives leakage, reliability and ring drift.', 'Cold-plate thermal resistance, hot spots, ASIC next to OEs.', 'On-die temperature sensors; IR camera on thermal test vehicles.'),
    K('therm', 'Ring temperature stability', 'K (mK)', 'How steady the micro-ring temperature is, which decides resonance drift.', 'd_lambda = (d lambda / dT) x dT\n~0.07-0.1 nm/K; Q 3k-20k', 'control to within tens of mK around the lock point [typical]', 'typ', 'A 1 K swing moves the resonance ~0.1 nm, roughly a ring linewidth or more.', 'ASIC power transients, heater resolution, sensor noise.', 'Monitor-PD feedback, thermistor/diode readout, step-load tests.'),
    K('therm', 'Coolant delta-T and flow', 'K, L/min', 'Temperature rise and flow rate of the liquid loop through the cold plate.', 'Q = P / (rho c_p dT)\n1 kW at dT=10 K -> ~1.4 L/min', 'dT about 5-15 K; flow set by switch power [typical]', 'typ', 'Sizes the pump, CDU and facility water loop.', 'Fluid properties, cold-plate pressure drop, facility supply temp.', 'Flow meters, RTDs on inlet/outlet, CDU telemetry.'),
    K('lat', 'Port-to-port latency', 'ns', 'Time from first bit in to first bit out in cut-through mode.', 'L = L_PHY_rx + L_pipeline + L_queue + L_PHY_tx', 'switch silicon in the 100s of ns; retimer/FEC adds tens of ns per hop [estimated]', 'est', 'Collectives are latency-sensitive at scale.', 'FEC decode, pipeline depth, queueing, DSP in pluggable path.', 'Hardware-timestamped traffic generator.'),
    K('rel', 'FIT rate', 'failures / 1e9 h', 'Failure rate of a component or link.', 'FIT = lambda x 1e9 h', 'laser FIT dominates optics FIT in pluggables; CPO claims 4x fewer lasers', 'typ', 'Failures at AI-cluster scale are inevitable; FIT sets how often.', 'Laser wearout, connector contamination, ESD, solder fatigue.', 'Accelerated life tests (HTOL), Arrhenius analysis.'),
    K('rel', 'MTBF', 'hours', 'Expected time between failures for the system or a fleet.', 'MTBF = 1e9 / FIT\nsystem lambda = sum of lambda_i', 'fleet-level design target; claimed 10x better resiliency', 'nv', 'Directly drives training-job interruptions.', 'Series dependency of many links, redundancy, serviceability.', 'Field return data; reliability modelling.'),
    K('rel', 'Link-flap rate', 'flaps / link / day', 'Frequency of link up/down events.', 'rate = N_flaps / (N_links x days)', 'target near zero; one flap can stall a collective [typical]', 'typ', 'Link flaps cause training stalls and retries.', 'Marginal BER, ring unlock, thermal events, contamination.', 'Switch event logs, fleet telemetry.'),
    K('rel', 'Laser lifetime', 'hours', 'Time until laser output falls to a threshold (e.g. -20%).', 'P(t) = P0 exp(-t/tau) ; tau ~ exp(Ea/kT)', 'many 100k hours at controlled temperature [typical]', 'typ', 'Lasers are the main wear-out item; ELS keeps them replaceable.', 'Junction temperature, drive current, facet damage.', 'Burn-in and accelerated aging with power tracking.'),
    K('rel', 'Serviceability', 'MTTR / swap', 'Ability to replace a failed element without replacing the switch.', 'availability = MTBF / (MTBF + MTTR)', 'external laser modules are front-panel serviceable', 'nv', 'Co-packaged engines cannot be swapped, so lasers (most likely to fail) are made removable.', 'Fiber connector cleanliness, hot-swap procedure.', 'Service drills; MTTR logs.'),
    K('mfg', 'Assembly yield', '%', 'Fraction of units passing after packaging and test.', 'Y_total = Y_die1 x Y_die2 x ... x Y_assembly', 'must be high because many dies share one package [typical]', 'typ', 'A bad optical engine can scrap an expensive ASIC package.', 'Alignment tolerance, bonding yield, die quality.', 'Production test, binning statistics.'),
    K('mfg', 'Test time', 'min / unit', 'Time on the tester per switch package.', 'cost_test ~ T_test x tester_rate', 'minimize with parallel optical lane testing [typical]', 'typ', 'Dominant cost contributor at volume.', 'Number of lanes, wavelength sweeps, thermal settling.', 'ATE with optical probing; wafer-level optical test.'),
    K('mfg', 'Known-good-die (KGD)', '% pass', 'Confidence in a die before it is bonded into the package.', 'Y_pkg = Y_asic x Y_oe^N x Y_assy\nN = number of engines', 'wafer-level test to reach very high KGD [typical]', 'typ', 'N optical engines multiply the risk; KGD protects the ASIC.', 'Test coverage at wafer level, burn-in.', 'Wafer prober with optical coupling, scan/BIST.')
  ];

  // Radar: illustrative 0-10 scores (not measured)
  const RADAR = [
    ['Energy efficiency', 3, 8.5], ['Signal integrity', 3.5, 9], ['Laser count / resilience', 3, 8],
    ['Faceplate density', 6, 8], ['Latency', 5, 7], ['Serviceability', 9, 6], ['Ecosystem maturity', 9, 5], ['Deployment speed', 5, 6.5]
  ];

  function gauge(cat) {
    const g = cat.gauge;
    const arc = 'M10 62 A50 50 0 0 1 110 62';
    const val = s('path', { d: arc, pathLength: 100, fill: 'none', stroke: cat.color, 'stroke-width': 8, 'stroke-linecap': 'round', 'stroke-dasharray': '0 100' });
    const needle = s('line', { x1: 60, y1: 62, x2: 60, y2: 20, stroke: 'var(--text)', 'stroke-width': 2, 'stroke-linecap': 'round' });
    const svg = s('svg', { class: 'kp-gauge', viewBox: '0 0 120 84' },
      s('path', { d: arc, pathLength: 100, fill: 'none', stroke: 'var(--line)', 'stroke-width': 8, 'stroke-linecap': 'round' }),
      val, needle, s('circle', { cx: 60, cy: 62, r: 4, fill: 'var(--text)' }),
      s('text', { x: 60, y: 76, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700 }, g[2]),
      s('text', { x: 60, y: 83, 'text-anchor': 'middle', class: 'gl' }, ''));
    return { svg, set(v) { val.setAttribute('stroke-dasharray', (v * 100) + ' 100'); needle.setAttribute('transform', 'rotate(' + (-90 + v * 180) + ' 60 62)'); }, target: g[1] };
  }

  function card(k, cat) {
    return h('div', { class: 'card kp-card', style: '--kc:' + cat.color, 'data-cat': k.cat },
      h('h3', {}, k.name, h('span', { class: 'unit' }, '[' + k.unit + ']')),
      h('p', { class: 'def' }, k.def),
      h('div', { class: 'eq', text: k.eq }),
      h('div', { class: 'kp-target', html: '<b>' + CPO.esc(k.target) + '</b> ' + CPO.badge(k.tag) }),
      h('div', { class: 'kp-rows' },
        h('div', {}, h('span', { class: 'k' }, 'Why'), h('span', {}, k.why)),
        h('div', {}, h('span', { class: 'k' }, 'Limits'), h('span', {}, k.limits)),
        h('div', {}, h('span', { class: 'k' }, 'Measured'), h('span', {}, k.measure))));
  }

  function radar(register) {
    const N = RADAR.length, R = 150, cx = 200, cy = 200;
    const pt = (i, v, p) => { const a = -Math.PI / 2 + i / N * Math.PI * 2; const r = R * v / 10 * p; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
    const svg = s('svg', { class: 'kp-radar', viewBox: '0 0 400 400', role: 'img', 'aria-label': 'Pluggable vs CPO radar' });
    for (let r = 2; r <= 10; r += 2) svg.appendChild(s('polygon', { class: 'ring', points: RADAR.map((_, i) => pt(i, r, 1).join(',')).join(' ') }));
    RADAR.forEach((d, i) => {
      const e = pt(i, 10, 1), l = pt(i, 11.7, 1);
      svg.appendChild(s('line', { class: 'ax', x1: cx, y1: cy, x2: e[0], y2: e[1] }));
      svg.appendChild(s('text', { x: l[0], y: l[1] + 4, 'text-anchor': Math.abs(l[0] - cx) < 8 ? 'middle' : (l[0] > cx ? 'start' : 'end') }, d[0]));
    });
    const pPlug = s('polygon', { fill: 'rgba(255,107,61,.18)', stroke: 'var(--optic)', 'stroke-width': 2 });
    const pCpo = s('polygon', { fill: 'rgba(118,185,0,.22)', stroke: 'var(--accent)', 'stroke-width': 2.5, style: 'filter:drop-shadow(0 0 6px rgba(118,185,0,.5))' });
    svg.append(pPlug, pCpo);
    const dotsP = RADAR.map(() => s('circle', { r: 3.5, fill: 'var(--optic)' }));
    const dotsC = RADAR.map(() => s('circle', { r: 4, fill: 'var(--accent)' }));
    svg.append(...dotsP, ...dotsC);
    function draw(p) {
      pPlug.setAttribute('points', RADAR.map((d, i) => pt(i, d[1], p).join(',')).join(' '));
      pCpo.setAttribute('points', RADAR.map((d, i) => pt(i, d[2], p).join(',')).join(' '));
      RADAR.forEach((d, i) => {
        const a = pt(i, d[1], p), b = pt(i, d[2], p);
        dotsP[i].setAttribute('cx', a[0]); dotsP[i].setAttribute('cy', a[1]);
        dotsC[i].setAttribute('cx', b[0]); dotsC[i].setAttribute('cy', b[1]);
      });
    }
    draw(0);
    register(draw);
    return svg;
  }

  CPO.registerSection({
    id: 'kpis', title: 'KPIs', icon: '🎯', order: 20,
    render(c) {
      const stops = [];
      let query = '', active = 'all';
      const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

      c.appendChild(h('h1', {}, 'KPI catalogue'));
      c.appendChild(h('p', { class: 'h-sub', html: 'Every number that defines and validates a co-packaged optics switch: what it is, how it is computed, what a good value looks like, what limits it and how it is measured. ' + CPO.badge('nv') + ' = announced by NVIDIA; ' + CPO.badge('typ') + ' = industry-typical value; ' + CPO.badge('est') + ' = engineering estimate. Targets are not NVIDIA internal specs.' }));

      // radar
      let radarDraw = null;
      const rsvg = radar(fn => { radarDraw = fn; });
      c.appendChild(h('div', { class: 'card' },
        h('h2', { style: 'margin-top:0' }, 'Pluggable vs CPO at a glance'),
        h('div', { class: 'kp-radar-wrap' }, rsvg,
          h('div', {},
            h('div', { class: 'kp-radar-legend' }, h('span', { html: '<i style="background:var(--optic)"></i>Pluggable' }), h('span', { html: '<i style="background:var(--accent)"></i>CPO' })),
            h('table', { class: 'table kp-radar-table' },
              h('thead', {}, h('tr', {}, h('th', {}, 'Dimension'), h('th', {}, 'Plug.'), h('th', {}, 'CPO'))),
              h('tbody', {}, RADAR.map(r => h('tr', {}, h('td', {}, r[0]), h('td', {}, String(r[1])), h('td', {}, String(r[2])))))),
            h('div', { class: 'callout warn', html: 'Scores (0-10, higher is better) are an <b>illustrative</b> qualitative normalization ' + CPO.badge('est') + ', shaped by NVIDIA’s public claims ' + CPO.badge('nv') + ' (3.5x power efficiency, 63x signal integrity, 10x resiliency, 4x fewer lasers, 1.3x faster deployment). CPO gives up easy field swapping and ecosystem maturity.' })))));

      // toolbar
      const search = h('input', { type: 'search', placeholder: 'Search KPIs (e.g. BER, laser, pJ)...' });
      const count = h('span', { class: 'kp-count' });
      const chips = [{ id: 'all', name: 'All' }].concat(CATS).map(ct => {
        const b = h('span', { class: 'pill kp-chip' + (ct.id === 'all' ? ' on' : ''), onclick: () => { active = ct.id; chips.forEach(x => x.classList.toggle('on', x === b)); apply(); } }, ct.name);
        return b;
      });
      c.appendChild(h('div', { class: 'kp-toolbar' }, search, chips, count));

      // categories
      const gauges = [];
      const catEls = [];
      const body = h('div', {});
      CATS.forEach(ct => {
        const g = gauge(ct); gauges.push(g);
        const items = DATA.filter(k => k.cat === ct.id).map(k => ({ k, el: card(k, ct) }));
        const grid = h('div', { class: 'kp-grid' }, items.map(i => i.el));
        const sec = h('section', { class: 'kp-cat' },
          h('div', { class: 'kp-cathead' }, g.svg, h('div', {}, h('h2', { style: 'color:' + ct.color }, ct.name), h('p', {}, ct.note + ' (gauge fill illustrative)'))),
          grid);
        catEls.push({ ct, sec, items });
        body.appendChild(sec);
      });
      const empty = h('div', { class: 'kp-empty', style: 'display:none' }, 'No KPIs match your filter.');
      body.appendChild(empty);
      c.appendChild(body);

      function apply() {
        const q = query.trim().toLowerCase();
        let n = 0;
        catEls.forEach(ce => {
          let vis = 0;
          ce.items.forEach(i => {
            const hay = (i.k.name + ' ' + i.k.def + ' ' + i.k.eq + ' ' + i.k.target + ' ' + i.k.why + ' ' + i.k.limits + ' ' + i.k.measure + ' ' + ce.ct.name).toLowerCase();
            const ok = (active === 'all' || active === ce.ct.id) && (!q || hay.indexOf(q) >= 0);
            i.el.style.display = ok ? '' : 'none'; if (ok) vis++;
          });
          ce.sec.style.display = vis ? '' : 'none'; n += vis;
        });
        empty.style.display = n ? 'none' : '';
        count.textContent = n + ' of ' + DATA.length + ' KPIs';
      }
      search.addEventListener('input', () => { query = search.value; apply(); });
      apply();

      // animation: radar sweep + gauge ease with live jitter
      let t0 = null;
      if (reduce) { radarDraw(1); gauges.forEach(g => g.set(g.target)); }
      else {
        stops.push(CPO.loop((dt, t) => {
          const p = CPO.clamp(t / 1.4, 0, 1), e = 1 - Math.pow(1 - p, 3);
          radarDraw(e);
          gauges.forEach((g, i) => g.set(CPO.clamp(g.target * e + (e >= 1 ? 0.02 * Math.sin(t * 1.5 + i) : 0), 0, 1)));
        }));
      }

      return function cleanup() { stops.forEach(f => f()); };
    }
  });
})();
