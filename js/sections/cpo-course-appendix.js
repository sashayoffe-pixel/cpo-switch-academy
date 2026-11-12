/* Appendix chapters for the CPO Switch course (read by js/sections/cpo-course.js). */
(function () {
  'use strict';
  const C = window.CPO;
  const B = C.badge;

  function svgDb() {
    const rows = [[20, '100 mW'], [10, '10 mW'], [3, '2 mW'], [0, '1 mW'], [-3, '0.5 mW'], [-10, '0.1 mW'], [-20, '10 µW']];
    let s = '<svg viewBox="0 0 1000 170" role="img" aria-label="dBm scale">';
    s += '<line x1="60" y1="80" x2="940" y2="80" stroke="#3b4a5e" stroke-width="2"/>';
    rows.forEach(([d, mw]) => {
      const x = 940 - (20 - d) * 22;
      s += '<line x1="' + x + '" y1="68" x2="' + x + '" y2="92" stroke="#ff6b3d" stroke-width="2"/>';
      s += '<text x="' + x + '" y="56" text-anchor="middle" fill="#e6edf5" font-size="14" font-weight="700">' + (d > 0 ? '+' : '') + d + ' dBm</text>';
      s += '<text x="' + x + '" y="114" text-anchor="middle" fill="#8a99ad" font-size="13">' + mw + '</text>';
    });
    s += '<text x="500" y="152" text-anchor="middle" fill="#8a99ad" font-size="13">every 10 dB = ×10 power · every 3 dB ≈ ×2 · losses in dB simply add up</text>';
    return s + '</svg>';
  }

  function svgBathtub() {
    let s = '<svg viewBox="0 0 1000 260" role="img" aria-label="BER waterfall">';
    s += '<line x1="80" y1="220" x2="960" y2="220" stroke="#3b4a5e"/><line x1="80" y1="20" x2="80" y2="220" stroke="#3b4a5e"/>';
    s += '<text x="520" y="252" text-anchor="middle" fill="#8a99ad" font-size="13">received optical power (dBm) →</text>';
    s += '<text x="30" y="120" fill="#8a99ad" font-size="13" transform="rotate(-90 30 120)" text-anchor="middle">BER (log)</text>';
    let d = '';
    for (let i = 0; i <= 100; i++) { const x = 90 + i * 8.6, y = 30 + 185 * (1 - Math.exp(-Math.pow(i / 42, 2))); d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); }
    s += '<path d="' + d + '" stroke="#22d3ee" stroke-width="3" fill="none"/>';
    s += '<line x1="80" y1="95" x2="960" y2="95" stroke="#f5b301" stroke-dasharray="6 5"/><text x="955" y="88" text-anchor="end" fill="#f5b301" font-size="13">FEC threshold ≈ 2.4e-4 (KP4)</text>';
    s += '<line x1="388" y1="20" x2="388" y2="220" stroke="#76b900" stroke-dasharray="4 4"/><text x="392" y="38" fill="#76b900" font-size="13">sensitivity</text>';
    s += '<line x1="640" y1="20" x2="640" y2="220" stroke="#ff6b3d" stroke-dasharray="4 4"/><text x="644" y="38" fill="#ff6b3d" font-size="13">your link today</text>';
    s += '<path d="M392 200 L636 200" stroke="#76b900" stroke-width="2"/><text x="514" y="194" text-anchor="middle" fill="#76b900" font-size="13">margin (dB)</text>';
    return s + '</svg>';
  }

  function svgTestFlow() {
    const st = [['Wafer test', 'PIC/EIC on wafer: rings, PDs, couplers'], ['Known-good engine', 'engine tested before assembly'], ['Package test', 'ASIC + engines + fiber attach'], ['System test', 'whole switch: BER on every lane, temp corners'], ['Burn-in / screen', 'stress to catch early failures'], ['Field telemetry', 'trend every link for years']];
    let s = '<svg viewBox="0 0 1000 150" role="img" aria-label="Test flow">';
    st.forEach(([t, d], i) => {
      const x = 10 + i * 165;
      s += '<rect x="' + x + '" y="25" width="150" height="90" rx="10" fill="#0b130c" stroke="#76b900"/>';
      s += '<text x="' + (x + 75) + '" y="55" text-anchor="middle" fill="#e6edf5" font-size="13.5" font-weight="700">' + t + '</text>';
      const words = d.split(' '), l1 = [], l2 = [];
      words.forEach(w => ((l1.join(' ') + ' ' + w).length < 22 && !l2.length ? l1 : l2).push(w));
      s += '<text x="' + (x + 75) + '" y="78" text-anchor="middle" fill="#8a99ad" font-size="11.5">' + l1.join(' ') + '</text>';
      s += '<text x="' + (x + 75) + '" y="94" text-anchor="middle" fill="#8a99ad" font-size="11.5">' + l2.join(' ') + '</text>';
      if (i < st.length - 1) s += '<path d="M' + (x + 151) + ' 70 L' + (x + 164) + ' 70" stroke="#76b900" stroke-width="2.5"/>';
    });
    s += '<text x="500" y="140" text-anchor="middle" fill="#8a99ad" font-size="12.5">the earlier a defect is caught, the cheaper it is: a bad engine found after packaging can scrap the whole package</text>';
    return s + '</svg>';
  }

  const CH = [];

  CH.push({
    id: 'apx-photonics', short: 'Photonics basics for engineers', title: 'Photonics basics for electrical engineers',
    lead: 'Light as a signal, decibels and dBm, waveguides, resonators, lasers and detectors, explained with the electrical analogies you already know.',
    html:
      '<h3>1 · Light as a carrier</h3>' +
      '<p>Light is an electromagnetic wave like a radio signal, just at a much higher frequency: ~230 THz for 1310 nm. We don\'t follow the individual oscillations. We switch the light\'s <b>power</b> on and off (intensity modulation) and the photodetector measures power. Think of the laser as a DC supply and the modulator as a very fast switch on it.</p>' +
      '<table class="table"><tr><th>Band</th><th>Wavelength</th><th>Used for</th></tr>' +
      '<tr><td>O-band</td><td>~1260–1360 nm</td><td>data-center links incl. CPO: low dispersion in standard fiber ' + B('typ') + '</td></tr>' +
      '<tr><td>C-band</td><td>~1530–1565 nm</td><td>long-haul telecom: lowest loss, optical amplifiers</td></tr>' +
      '<tr><td>850 nm</td><td>short-wave</td><td>multimode fiber with VCSEL lasers, short reach</td></tr></table>' +

      '<h3>2 · Decibels and dBm: the language of the link budget</h3>' +
      '<div class="af-fig">' + svgDb() + '</div>' +
      '<div class="eq">dB  = 10·log₁₀(P_out / P_in)        (a ratio: loss or gain)\ndBm = 10·log₁₀(P / 1 mW)            (an absolute power)\nP_received[dBm] = P_laser[dBm] − Σ losses[dB]</div>' +
      '<p>The beauty: a chain of losses that multiply in watts simply <b>add</b> in dB. 3 dB is half the power, 10 dB is a tenth, 20 dB is a hundredth.</p>' +

      '<h3>3 · Waveguides: wires for light</h3>' +
      '<p>A silicon waveguide is a strip of silicon (~0.5 µm × 0.2 µm) surrounded by glass. Light stays inside because silicon\'s refractive index (~3.5) is much higher than glass\'s (~1.45): total internal reflection. Losses come from sidewall roughness (~dB per cm), bends and crossings. Single-mode fiber works the same way, with a ~9 µm core and a much smaller index difference.</p>' +

      '<h3>4 · Resonators: the ring as an optical tuned circuit</h3>' +
      '<p>A ring resonator is the optical equivalent of an <b>LC tank</b>. Light whose wavelength fits a whole number of times around the ring builds up inside it. On the bus waveguide that shows up as a sharp <b>notch</b> in transmission.</p>' +
      '<div class="eq">resonance:  m·λ = n_eff·L            (L = ring circumference)\nFSR  ≈ λ² / (n_g·L)                  spacing between resonances (8–20 nm typ)\nQ    = λ / Δλ                          sharpness (3k–20k typ → Δλ ≈ 0.07–0.4 nm)\nthermal shift: dλ/dT ≈ λ·(dn/dT)/n_g ≈ 0.07–0.1 nm/K</div>' +
      '<p>High Q means a sharp notch: a big on/off effect from a small voltage, but tighter temperature control. Lower Q is more forgiving but needs more voltage. Choosing Q is a classic trade-off ' + B('typ') + '.</p>' +

      '<h3>5 · Lasers and photodetectors</h3>' +
      '<div class="grid2"><div class="card"><h4>Laser (DFB, in the ELS)</h4><p>A III-V semiconductor (e.g. InP) diode with a built-in grating that picks one wavelength. Above a <b>threshold current</b>, light output rises roughly linearly with current. Key specs: output power, wavelength and its drift with temperature, linewidth, relative intensity noise (RIN), wall-plug efficiency, life.</p></div>' +
      '<div class="card"><h4>Photodetector (Ge on Si)</h4><p>Germanium absorbs 1310 nm light that silicon cannot. Each absorbed photon frees an electron. Key specs: <b>responsivity</b> (~0.8–1.0 A/W ' + B('typ') + '), bandwidth (tens of GHz), dark current (nA), capacitance (which sets the TIA design).</p></div></div>' +

      '<h3>6 · Electrical ↔ optical cheat-sheet</h3>' +
      '<table class="table"><tr><th>Electrical idea</th><th>Optical equivalent</th></tr>' +
      '<tr><td>DC supply</td><td>CW laser</td></tr><tr><td>switch / mixer</td><td>modulator (ring, MZM)</td></tr><tr><td>LC tank / band-stop filter</td><td>ring resonator</td></tr>' +
      '<tr><td>transmission line</td><td>waveguide / fiber</td></tr><tr><td>connector insertion loss</td><td>coupler / connector loss (dB)</td></tr>' +
      '<tr><td>return loss / reflections</td><td>optical return loss (ORL), back-reflections into the laser</td></tr><tr><td>diode current sensor</td><td>photodetector</td></tr>' +
      '<tr><td>frequency-division multiplexing</td><td>WDM</td></tr></table>'
  });

  CH.push({
    id: 'apx-si', short: 'Signal integrity, BER & FEC', title: 'Signal integrity, BER and FEC',
    lead: 'How noise turns into bit errors, why we measure margin in dB, what FEC does, and the receiver metrics you will see in every report.',
    html:
      '<h3>1 · From noise to errors</h3>' +
      '<p>At the receiver each PAM4 level is a fuzzy cloud because noise is added. An error happens when a cloud crosses a decision threshold. With Gaussian noise the error rate falls off <b>very</b> steeply as the eye opens: a little more signal or a little less noise changes BER by orders of magnitude.</p>' +
      '<div class="eq">BER ≈ ½·erfc(Q/√2)        Q = (eye opening / 2) / σ_noise   (per eye)\nQ ≈ 7  → BER ≈ 1e-12        Q ≈ 3.5 → BER ≈ 2.4e-4 (KP4 threshold)</div>' +

      '<h3>2 · BER curve and margin</h3>' +
      '<div class="af-fig">' + svgBathtub() + '</div>' +
      '<p>Plot BER against received optical power and you get a "waterfall". <b>Sensitivity</b> is where the curve crosses the FEC threshold. <b>Margin</b> is how many dB stronger your link is than that. You keep margin for laser aging, temperature corners, dirty connectors and part-to-part variation.</p>' +

      '<h3>3 · Forward error correction (FEC)</h3>' +
      '<p>The transmitter adds redundant symbols, and the receiver uses them to fix errors without asking for a resend. 200G-per-lane Ethernet and InfiniBand use Reed-Solomon codes. The common <b>KP4 RS(544,514)</b> adds ~6 % overhead, corrects up to 15 symbol errors per codeword, and turns a pre-FEC BER of ~2.4e-4 into a post-FEC BER below 1e-13…1e-15 ' + B('typ') + '.</p>' +
      '<ul><li><b>Pre-FEC BER</b>: the raw error rate the optics deliver. This is your health metric.</li>' +
      '<li><b>FEC histogram</b>: how many codewords needed 0, 1, 2 … 15 corrections. A healthy link sits in the low bins. A tail creeping toward 15 means trouble ahead.</li>' +
      '<li><b>Uncorrectable codewords</b>: FEC failed and packets are lost. Should be essentially zero.</li>' +
      '<li><b>Burst errors</b> (many errors close together) hurt FEC more than random ones. Some impairments (e.g. a ring briefly unlocking) cause bursts.</li></ul>' +

      '<h3>4 · Optical transmitter metrics you\'ll see</h3>' +
      '<table class="table">' +
      '<tr><td>OMA</td><td>Optical modulation amplitude: power difference between highest and lowest level. What the receiver actually "sees".</td></tr>' +
      '<tr><td>Extinction ratio (ER)</td><td>Ratio of "1" to "0" power, in dB. Rings with a deeper notch give a higher ER.</td></tr>' +
      '<tr><td>TDECQ</td><td>A single number (dB) for how much worse your transmitter\'s eye is than an ideal one. It is measured with a reference receiver and equalizer.</td></tr>' +
      '<tr><td>RIN</td><td>Relative intensity noise of the laser: tiny random power fluctuations that add noise.</td></tr>' +
      '<tr><td>Jitter</td><td>Timing noise on symbol edges; it narrows the eye horizontally.</td></tr></table>' +

      '<h3>5 · Why CPO helps signal integrity</h3>' +
      '<p>In a pluggable design the electrical signal crosses 20–30 cm of board and a connector twice (host and module), with heavy equalization and a DSP retimer in between. Every stage adds noise, reflections and crosstalk. CPO\'s millimetre link removes most of that, which is the main source of NVIDIA\'s <b>63× signal integrity</b> claim ' + B('nv') + '. The remaining challenges move into the optics: laser noise, ring nonlinearity, crosstalk between wavelengths, and thermal drift.</p>' +
      '<p>Try it in the <a href="#noise">Noise & Signal Integrity Lab</a> and the <a href="#budgets">System Budgets</a> sections.</p>'
  });

  CH.push({
    id: 'apx-ppt', short: 'Packaging, power & thermal', title: 'Packaging, power and thermal for CPO',
    lead: 'How the package is built, how fibers are attached, how a few hundred amps reach the ASIC, and why temperature is the variable that touches everything.',
    html:
      '<h3>1 · Building the package</h3>' +
      '<ul><li><b>Optical engine:</b> EIC bonded face-to-face on the PIC (TSMC COUPE using SoIC hybrid bonding ' + B('nv') + '). Bond pitches of a few micrometres give very short, low-capacitance connections.</li>' +
      '<li><b>Substrate:</b> the multi-layer organic board that carries the ASIC and engines, fans their signals out, and delivers power. It must stay flat as temperature changes, because different materials expand at different rates (CTE mismatch), and warpage can stress joints and fiber alignment.</li>' +
      '<li><b>Fiber attach:</b> fiber arrays are aligned to the couplers to within about a micrometre, then fixed (e.g. UV-cured epoxy). A <b>detachable</b> fiber interface ' + B('nv') + ' lets the package and the fiber plant be assembled and serviced separately.</li>' +
      '<li><b>Known-good engines:</b> each engine is tested before it goes onto the expensive package, because rework after assembly is difficult.</li></ul>' +

      '<h3>2 · Power delivery</h3>' +
      '<div class="eq">ASIC power ~ hundreds of W  at  ~0.7–0.9 V   →   hundreds of amps\nIR drop: 0.5 mΩ × 500 A = 0.25 V  (!) → power must be converted right next to the package</div>' +
      '<p>Power arrives on a rack busbar (48–54 V ' + B('typ') + '), is stepped down (intermediate bus), and is finally converted by multi-phase <b>VRMs</b> placed as close to the ASIC as possible. Optical engines need several extra, very clean rails (drivers, TIAs, heaters). Noise on those rails turns directly into optical noise and jitter. Power sequencing (which rail comes up first) matters: lasers should not shine into engines that are not yet powered and controlled.</p>' +

      '<h3>3 · Thermal: the variable that touches everything</h3>' +
      '<table class="table"><tr><th>What temperature affects</th><th>How</th></tr>' +
      '<tr><td>Ring resonance</td><td>~0.07–0.1 nm/°C drift → heater power and lock-loop range ' + B('typ') + '</td></tr>' +
      '<tr><td>Laser</td><td>hotter = lower efficiency, wavelength drift, faster aging. A reason the lasers are external.</td></tr>' +
      '<tr><td>Photodetector</td><td>dark current roughly doubles every ~8–10 °C ' + B('typ') + '</td></tr>' +
      '<tr><td>ASIC</td><td>leakage power rises with temperature; junction limits throttle performance</td></tr>' +
      '<tr><td>Mechanics</td><td>warpage and expansion move fibers relative to couplers</td></tr></table>' +
      '<p>Liquid cooling ' + B('nv') + ' keeps the whole package at a stable temperature. Even so, the ASIC\'s power swings with traffic, and its heat spreads into the neighbouring engines (<b>thermal crosstalk</b>). The thermal design and the ring-lock loop design must be done together.</p>' +
      '<div class="eq">ΔT = P × θ          (θ = thermal resistance, °C/W)\n500 W × 0.05 °C/W = 25 °C rise from coolant to chip</div>' +

      '<h3>4 · Mechanical & service</h3>' +
      '<ul><li>Fiber bend radius, strain relief and routing inside the box.</li>' +
      '<li>Front-panel laser modules: hot-swap, eye safety (interlocks, Class 1), keying so the wrong module cannot be inserted.</li>' +
      '<li>Cleanliness: a single dust particle on a connector can cost several dB. Inspection and cleaning procedures are part of the design.</li></ul>'
  });

  CH.push({
    id: 'apx-rel', short: 'Reliability, test & bring-up', title: 'Reliability, test and bring-up',
    lead: 'How long the parts last, how they are tested from wafer to field, what bring-up looks like, and the failure modes to recognise.',
    html:
      '<h3>1 · Reliability vocabulary</h3>' +
      '<table class="table"><tr><td>FIT</td><td>Failures In Time: failures per 10⁹ device-hours. 100 FIT ≈ one failure per ~1,140 device-years.</td></tr>' +
      '<tr><td>MTBF</td><td>Mean time between failures = 10⁹ / FIT hours (for constant failure rates).</td></tr>' +
      '<tr><td>Bathtub curve</td><td>early failures (infant mortality, caught by burn-in), a flat useful life, then wear-out (e.g. laser aging).</td></tr>' +
      '<tr><td>Arrhenius</td><td>chemical/aging processes speed up exponentially with temperature, which is the basis of accelerated life tests at high temperature.</td></tr></table>' +
      '<div class="eq">switch FIT ≈ Σ (FIT of each component)  → fewer components per link = fewer failures\nfailures per year in a fleet = FIT × devices × 8760 h / 1e9</div>' +
      '<p>This is the arithmetic behind NVIDIA\'s <b>10× resiliency</b> claim ' + B('nv') + '. Removing the per-port DSP, laser and module connector removes their FIT from every link.</p>' +

      '<h3>2 · Test from wafer to field</h3>' +
      '<div class="af-fig">' + svgTestFlow() + '</div>' +

      '<h3>3 · Bring-up: the first weeks with new hardware</h3>' +
      '<ol><li><b>Power-on:</b> rails, sequencing, currents within limits, no hot spots (thermal camera).</li>' +
      '<li><b>Management up:</b> BMC/CPU boots and talks to the CPLDs, laser modules and engines over the management buses.</li>' +
      '<li><b>Lasers on:</b> power and temperature loops settle, monitor readings make sense.</li>' +
      '<li><b>Rings lock:</b> every ring finds its resonance; check heater codes and lock status lane by lane.</li>' +
      '<li><b>Loopback & PRBS:</b> run test patterns (PRBS) through electrical, then optical loopbacks; measure pre-FEC BER per lane.</li>' +
      '<li><b>Links up:</b> connect to a partner (another switch or a NIC), train links, run traffic.</li>' +
      '<li><b>Margin & corners:</b> sweep temperature, voltage, laser power and attenuation; find the edges; compare with the budgets.</li>' +
      '<li><b>Soak:</b> long runs with traffic to catch rare events (flaps, bursts, lock loss).</li></ol>' +

      '<h3>4 · Failure modes to recognise</h3>' +
      '<table class="table"><tr><th>Symptom</th><th>Possible cause</th><th>Where to look</th></tr>' +
      '<tr><td>All lanes fed by one laser degrade together</td><td>laser aging or ELS fault, dirty laser-side connector</td><td>laser current trend, ELS monitor PD, connector inspection</td></tr>' +
      '<tr><td>One lane has high pre-FEC BER</td><td>ring off-lock or poor ER, coupler misalignment, bad fiber</td><td>heater code, lock status, per-lane optical power</td></tr>' +
      '<tr><td>Errors when traffic or temperature changes</td><td>lock loop too slow, thermal crosstalk, supply noise</td><td>correlate BER with ASIC power, coolant temperature, rail noise</td></tr>' +
      '<tr><td>Link flaps</td><td>burst errors exceeding FEC, intermittent connector, firmware re-lock</td><td>FEC histogram tail, event logs, timestamps</td></tr>' +
      '<tr><td>Wrong-wavelength lock</td><td>ring locked to the neighbouring laser line or next resonance</td><td>lock algorithm, start-up sequence, wavelength plan</td></tr></table>' +

      '<h3>5 · Telemetry: your view into the fleet</h3>' +
      '<p>Per lane: pre-FEC BER, FEC histogram, received optical power, heater code / lock state. Per laser: drive current, output power, temperature. Per box: rail voltages/currents, temperatures, coolant flow. Trending these across thousands of switches is how you predict failures and improve the next design. Management interfaces such as <b>CMIS</b> (for optics) and Redfish (for the box) expose them.</p>'
  });

  CH.push({
    id: 'apx-cheat', short: 'Day-1 cheat sheet', title: 'Day-1 cheat sheet',
    lead: 'The numbers, formulas and abbreviations to have at hand in your first meetings. Badges show where each number comes from.',
    html:
      '<h3>1 · NVIDIA public facts</h3>' +
      '<table class="table">' +
      '<tr><td>Quantum-X Photonics (InfiniBand)</td><td>144 × 800 Gb/s = 115 Tb/s, liquid cooled, 200G-per-lane SerDes class ' + B('nv') + '</td></tr>' +
      '<tr><td>Spectrum-X Photonics (Ethernet)</td><td>128 × 800G or 512 × 200G (102.4 Tb/s); 512 × 800G or 2,048 × 200G (409.6 Tb/s) ' + B('nv') + '</td></tr>' +
      '<tr><td>vs pluggables</td><td>3.5× power efficiency · 63× signal integrity · 10× resiliency · 4× fewer lasers · 1.3× faster deployment ' + B('nv') + '</td></tr>' +
      '<tr><td>Technology</td><td>silicon photonics, micro-ring modulators, TSMC COUPE (EIC on PIC, SoIC), 1.6T-class engines, external laser sources, detachable fiber ' + B('nv') + '</td></tr></table>' +

      '<h3>2 · Typical numbers</h3>' +
      '<table class="table">' +
      '<tr><td>Lane</td><td>200G PAM4, ~106–113 GBd, O-band ~1310 nm ' + B('typ') + '</td></tr>' +
      '<tr><td>Energy per bit</td><td>CPO ~5 pJ/b vs pluggable ~15–20 pJ/b ' + B('typ') + '</td></tr>' +
      '<tr><td>Ring</td><td>radius 5–10 µm, Q 3k–20k, FSR 8–20 nm, drift 0.07–0.1 nm/K, heater 0.1–0.3 nm/mW ' + B('typ') + '</td></tr>' +
      '<tr><td>Photodetector</td><td>Ge, 0.8–1.0 A/W at 1310 nm, nA dark current ' + B('typ') + '</td></tr>' +
      '<tr><td>Losses</td><td>fiber-chip coupling 1–3 dB, fiber 0.33 dB/km at 1310 nm ' + B('typ') + '</td></tr>' +
      '<tr><td>FEC</td><td>KP4 RS(544,514): pre-FEC BER threshold ≈ 2.4e-4 → post-FEC ≤ 1e-13…1e-15 ' + B('typ') + '</td></tr>' +
      '<tr><td>Power in</td><td>rack busbar 48–54 V (ORv3-style) ' + B('typ') + '</td></tr></table>' +

      '<h3>3 · Formulas</h3>' +
      '<div class="eq">dBm = 10·log₁₀(P/1mW)          P_rx = P_tx − Σ losses       margin = P_rx − sensitivity\nsplit loss = 10·log₁₀(N)        (1 laser → N lanes)\nenergy/bit [pJ/b] = power [W] / bit-rate [Tb/s]\nphotocurrent I = R·P            (R ≈ 0.9 A/W)\nring linewidth Δλ = λ/Q          ring drift ≈ 0.08 nm/K\nBER ≈ ½·erfc(Q/√2)              FIT → failures/yr = FIT·N·8760/1e9\nΔT = P·θ                         P_dyn = α·C·V²·f</div>' +

      '<h3>4 · Abbreviations you\'ll hear on day 1</h3>' +
      '<p>CPO · OE · EIC · PIC · MRM · ELS · WDM · SerDes · PAM4 · FEC · BER · OMA · ER · TDECQ · RIN · TIA · PD · CDR · DSP · COUPE · SoIC · VRM · BMC · CPLD · CMIS · FIT · EVT/DVT/PVT · PRBS</p>' +
      '<p class="muted">Hover any of them for a definition, or open the <a href="#glossary">Glossary</a>.</p>' +

      '<h3>5 · Where to go next in this app</h3>' +
      '<ul><li><a href="#architecture">Architecture Explorer</a>: press Next to tour all 67 blocks, from the system down to laser quantum wells.</li>' +
      '<li><a href="#dataflow">Data-Flow Simulator</a>: watch a lane live and inject faults (laser drop, ring detuning, extra loss).</li>' +
      '<li><a href="#noise">Noise Lab</a> and <a href="#budgets">System Budgets</a>: practise SNR, BER, link and power budgets.</li>' +
      '<li><a href="#kpis">KPIs</a>: the 35 numbers that define a CPO switch.</li></ul>'
  });

  C.cpoAppendix = CH;
})();
