/* Interview & Practice: spaced-repetition flashcards (Leitner boxes, saved per device), a multiple-choice quiz,
   open design questions with model answers, and behavioural (STAR) preparation. Uses js/course-engine.js. */
(function () {
  'use strict';
  const C = window.CPO;
  const h = C.h, B = C.badge, CE = C.course;
  const LS = 'iv-leitner-v1';
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } };

  const CARDS = [
    ['CPO', 'What are NVIDIA\'s four headline CPO claims vs pluggables?', '3.5× power efficiency, 63× signal integrity, 10× network resiliency, 4× fewer lasers (plus 1.3× faster deployment).'],
    ['CPO', 'Quantum-X Photonics port configuration and total bandwidth?', '144 × 800 Gb/s = 115 Tb/s, InfiniBand, liquid cooled.'],
    ['CPO', 'Spectrum-X Photonics configurations?', '128 × 800G or 512 × 200G (102.4 Tb/s); larger: 512 × 800G or 2,048 × 200G (409.6 Tb/s).'],
    ['CPO', 'Why are the lasers external in NVIDIA\'s CPO switches?', 'Lasers are temperature-sensitive and the parts most likely to wear out: keeping them at the cooler front panel improves efficiency, wavelength stability and life, and makes them replaceable.'],
    ['CPO', 'What is TSMC COUPE?', 'Compact Universal Photonic Engine: an electronic IC stacked on a photonic IC with SoIC 3D bonding, used for the optical engines.'],
    ['Optics', 'How does a micro-ring modulator switch light?', 'At resonance the ring traps light (dip in transmission). A voltage shifts the resonance slightly so the laser line passes or is trapped: on/off modulation.'],
    ['Optics', 'Ring resonance thermal drift?', 'About 0.07–0.1 nm per °C (silicon dn/dT ≈ 1.8e-4/K).'],
    ['Optics', 'Ring linewidth relation to Q?', 'Δλ = λ / Q; with Q ~10k at 1310 nm, Δλ ≈ 0.13 nm.'],
    ['Optics', 'Typical Ge photodetector responsivity at 1310 nm?', '~0.8–1.0 A/W.'],
    ['Optics', 'Fiber-to-chip coupling loss, typical?', '~1–3 dB per coupler.'],
    ['Optics', 'dBm to mW: 0, +10, −3 dBm?', '1 mW, 10 mW, 0.5 mW.'],
    ['Optics', 'Optical vs electrical dB: what does 1 dB optical loss do to the photocurrent signal in electrical dB?', 'Photocurrent ∝ optical power, so 1 dB optical ≈ 2 dB electrical (20·log for voltage/current).'],
    ['SI', 'Symbol rate of a 200G PAM4 lane?', '~106–113 GBd (2 bits per symbol + FEC overhead).'],
    ['SI', 'KP4 FEC pre-FEC BER threshold and output?', '≈2.4e-4 pre-FEC → post-FEC ≤1e-13…1e-15 (RS(544,514)).'],
    ['SI', 'Why is PAM4 ~9.5 dB worse in SNR than NRZ?', 'Three eyes in the same swing: each eye is 1/3 the height → 20·log10(3) ≈ 9.5 dB.'],
    ['SI', 'Nyquist frequency of a 106 GBd lane?', '~53 GHz (baud / 2).'],
    ['SI', 'Reflection coefficient formula?', 'Γ = (Z₂ − Z₁)/(Z₂ + Z₁), the electrical twin of Fresnel reflection.'],
    ['Power', 'Energy per bit: CPO vs pluggable (typical)?', '~5 pJ/b vs ~15–20 pJ/b.'],
    ['Power', 'Why distribute 48–54 V instead of 12 V in the rack?', 'Same power at ~4× lower current → ~16× lower I²R loss in busbars and connectors.'],
    ['Power', 'Target impedance of a PDN?', 'Z = allowed ripple ΔV / current step ΔI (e.g. 3 % of 0.75 V / 300 A ≈ 0.075 mΩ).'],
    ['Power', 'Ideal buck converter duty cycle?', 'D = Vout / Vin.'],
    ['Thermal', 'Junction temperature from a thermal stack?', 'Tj = T_coolant + P · Σθ.'],
    ['Thermal', 'Coolant energy balance?', 'Q = ṁ · cp · ΔT (water cp ≈ 4.18 kJ/kg·K; 1 L/min ≈ 0.0167 kg/s).'],
    ['Thermal', 'Defining thermal problem of CPO?', 'Thermal crosstalk: ASIC heat shifts ring resonances; heaters + lock loops must compensate, which costs power.'],
    ['Thermal', 'Biggest θ items in a liquid-cooled package stack, typically?', 'The TIMs (and cold-plate convection); thinner/better TIMs pay most.'],
    ['Networking', 'What is RDMA and why do AI fabrics use it?', 'NIC reads/writes remote memory directly with reliability in hardware: µs latency and no CPU copies, versus tens of µs with kernel TCP.'],
    ['Networking', 'RoCEv2 encapsulation?', 'InfiniBand transport (BTH) inside UDP/IP/Ethernet (UDP port 4791), plus ICRC.'],
    ['Networking', 'How does InfiniBand avoid drops?', 'Credit-based flow control: a port only sends when the receiver has buffer space.'],
    ['Networking', 'ECN vs PFC?', 'ECN marks packets early so senders slow down; PFC pauses a traffic class upstream as a last resort.'],
    ['Networking', '2-tier and 3-tier fat-tree reach with radix k?', 'k²/2 and k³/4 endpoints (k = 144 → 10,368 and ~746k).'],
    ['Networking', 'NVLink 5 bandwidth per GPU and NVL72 domain size?', '1.8 TB/s per GPU; 72 GPUs, 130 TB/s total.'],
    ['Networking', 'What is CMIS?', 'Common Management Interface Specification: standard register map and state machine for optics, read over I2C/I3C.'],
    ['Reliability', 'FIT definition and fleet failures per year?', 'Failures per 10⁹ device-hours; fleet failures/yr = FIT × N × 8760 / 10⁹.'],
    ['Reliability', 'Weibull β meaning?', 'β < 1 infant mortality, β = 1 random (constant rate), β > 1 wear-out.'],
    ['Reliability', 'Arrhenius acceleration factor?', 'AF = exp[(Ea/k)(1/T_use − 1/T_stress)], k = 8.617e-5 eV/K.'],
    ['Reliability', 'Zero-failure demonstrated FIT?', 'λ ≤ χ²(CL; 2) / (2T) = −ln(1−CL)/T for zero failures, with T the equivalent device-hours.'],
    ['Reliability', 'Why does link FIT matter so much for AI training?', 'A training job is a series system across tens of thousands of links: total interruption rate is the sum of all link FITs, which lowers goodput.'],
    ['Manufacturing', 'Why "known-good engines"?', 'Yields multiply on a package (0.98¹⁰ ≈ 82 %); a bad engine found after assembly scraps the ASIC and all good engines.'],
    ['Manufacturing', 'What is active alignment?', 'Moving a fiber while measuring coupled light, peaking, then fixing it (e.g. UV epoxy), accounting for cure shrinkage.'],
    ['Manufacturing', 'Cpk 1.33 means?', 'Nearest spec limit is 4σ from the mean: ~32 ppm out of spec on that side.'],
    ['SE', 'Four verification methods?', 'Test, Analysis, Inspection, Demonstration.'],
    ['SE', 'FMEA RPN?', 'Severity × Occurrence × Detection (each 1–10); also act on any severity ≥ 9.'],
    ['SE', 'Traits of a good requirement?', 'Necessary, unambiguous, verifiable, singular, feasible, complete (conditions + units), traceable.'],
    ['SE', 'What is an N² diagram?', 'Matrix with subsystems on the diagonal and interfaces in off-diagonal cells; each dot becomes an ICD.'],
    ['Firmware', 'A/B firmware update?', 'Write the new image to the inactive bank, verify its signature, boot it, health-check, and roll back automatically on failure.'],
    ['Firmware', 'Why must lasers be enabled late in the boot sequence?', 'Only after engines are powered, calibration is loaded and interlocks are satisfied: safety and protecting the optics.'],
    ['Firmware', 'What limits how aggressive a control loop can be?', 'Delay (sensor, compute, actuator) and plant dynamics: too much gain with delay → oscillation.']
  ];

  function pFlash(p) {
    let st = load(LS, {}); const topics = ['All'].concat([...new Set(CARDS.map(c => c[0]))]); let topic = 'All', cur = null, shown = false;
    const tbar = h('div', { class: 'af-seg' }); const card = h('div', { class: 'card', style: 'min-height:220px;display:flex;flex-direction:column;justify-content:center;text-align:center;font-size:18px;padding:30px' });
    const ctl = h('div', { class: 'af-cta', style: 'justify-content:center' }); const stats = h('div', { class: 'af-bars' });
    topics.forEach(t => tbar.appendChild(h('button', { class: 'btn' + (t === topic ? ' active' : ''), onclick: e => { topic = t; [...tbar.children].forEach(b => b.classList.toggle('active', b === e.target)); next(); } }, t)));
    p.appendChild(tbar); p.appendChild(card); p.appendChild(ctl); p.appendChild(h('div', { class: 'card', style: 'margin-top:14px' }, h('h3', { style: 'margin-top:0' }, 'Your progress (Leitner boxes)'), stats, h('p', { class: 'muted', style: 'font-size:12.5px' }, 'Cards you know move up a box and come back less often; cards you miss go back to box 1. Progress is saved on this device.'), h('button', { class: 'btn', onclick: () => { st = {}; save(LS, st); next(); } }, 'Reset progress')));
    function pool() { return CARDS.map((c, i) => [c, i]).filter(([c]) => topic === 'All' || c[0] === topic); }
    function next() {
      const pl = pool(); if (!pl.length) return; shown = false;
      const minBox = Math.min(...pl.map(([, i]) => st[i] || 1)); const cands = pl.filter(([, i]) => (st[i] || 1) <= minBox + (Math.random() < 0.25 ? 1 : 0));
      cur = cands[Math.floor(Math.random() * cands.length)]; render();
    }
    function render() {
      const [c, i] = cur; card.innerHTML = '<div class="muted" style="font-size:12px;text-transform:uppercase;letter-spacing:1.5px">' + c[0] + ' · box ' + (st[i] || 1) + '</div><div style="margin:14px 0;font-weight:600">' + c[1] + '</div>' + (shown ? '<div style="color:var(--accent);font-size:16px">' + c[2] + '</div>' : '');
      C.linkify(card); ctl.innerHTML = '';
      if (!shown) ctl.appendChild(h('button', { class: 'btn primary af-bignext', onclick: () => { shown = true; render(); } }, 'Show answer'));
      else { ctl.appendChild(h('button', { class: 'btn', onclick: () => { st[i] = 1; save(LS, st); next(); } }, '✗ Not yet')); ctl.appendChild(h('button', { class: 'btn primary', onclick: () => { st[i] = Math.min(5, (st[i] || 1) + 1); save(LS, st); next(); } }, '✓ Knew it')); }
      const counts = [1, 2, 3, 4, 5].map(b => CARDS.filter((_, k) => (st[k] || 1) === b).length);
      stats.innerHTML = counts.map((n, b) => '<div class="af-hbar"><span>Box ' + (b + 1) + (b === 4 ? ' (mastered)' : '') + '</span><div class="tr"><i style="width:' + (100 * n / CARDS.length).toFixed(1) + '%;background:' + (b === 4 ? 'var(--accent)' : 'var(--accent2)') + '"></i></div><output>' + n + '</output></div>').join('');
    }
    next();
  }

  const QUIZ = [
    ['A ring\'s resonance drifts 0.08 nm/K and its linewidth is ~0.1 nm. Roughly what uncorrected temperature change breaks the link?', ['~10 °C', '~1 °C', '~0.01 °C', '~50 °C'], 1, 'About one linewidth of drift ≈ 1.25 °C → a ~1 °C change already detunes the ring badly.'],
    ['Received −6 dBm, sensitivity −9 dBm. Margin?', ['+3 dB', '−3 dB', '+15 dB', '0.5×'], 0, 'Margin = received − sensitivity = −6 − (−9) = +3 dB.'],
    ['Splitting one laser equally over 8 lanes costs per lane:', ['3 dB', '6 dB', '9 dB', '8 dB'], 2, '10·log10(8) ≈ 9 dB.'],
    ['600 W through a stack with Σθ = 0.1 °C/W and 35 °C coolant gives Tj ≈', ['60 °C', '95 °C', '135 °C', '41 °C'], 1, '35 + 600 × 0.1 = 95 °C.'],
    ['2 kW removed by 2 L/min of water: coolant temperature rise ≈', ['~1 °C', '~14 °C', '~50 °C', '~4 °C'], 1, 'ΔT = 2000 / (0.0333 kg/s × 4180) ≈ 14 °C.'],
    ['Which symptom points to an aging shared laser rather than a dirty connector?', ['one port, steady 6 dB step after maintenance', 'several lanes on the same ELS degrading slowly together with rising drive current', 'BER depends on neighbouring lanes', 'drops with clean BER'], 1, 'Group correlation by laser plus a rising bias current is the laser-aging signature.'],
    ['Drops and tail latency with perfectly clean BER and FEC most likely mean:', ['laser aging', 'congestion / incast', 'ring detuning', 'dirty connector'], 1, 'A clean physical layer exonerates the optics: look at queues, ECN and routing.'],
    ['Weibull β = 0.6 indicates:', ['wear-out', 'random failures', 'infant mortality', 'perfect reliability'], 2, 'β < 1: decreasing failure rate, so screen with burn-in.'],
    ['100 FIT per switch, 10,000 switches: failures per year ≈', ['0.9', '8.8', '88', '876'], 1, '100 × 10,000 × 8760 / 1e9 ≈ 8.8.'],
    ['Which is the best requirement?', ['The switch shall be energy efficient.', 'Power shall be minimized.', 'At full line rate and 35 °C coolant, input power at 54 V shall be ≤ X W.', 'Power should be low.'], 2, 'Measurable, conditional and verifiable.'],
    ['RoCEv2 carries RDMA over:', ['TCP/IP', 'UDP/IP/Ethernet', 'PCIe', 'NVLink'], 1, 'InfiniBand transport header inside UDP/IP/Ethernet.'],
    ['InfiniBand prevents buffer-overflow drops using:', ['ECN only', 'credit-based flow control', 'TCP retransmission', 'jumbo frames'], 1, 'Senders transmit only with credits from the receiver.'],
    ['With radix k = 144, a 2-tier non-blocking fat tree reaches about:', ['288 GPUs', '10,368 GPUs', '746,496 GPUs', '20,736 GPUs'], 1, 'k²/2 = 10,368.'],
    ['Why do pluggable links at 200G/lane need DSP retimers?', ['to add lasers', 'the long board + connector channel loses ~25–35 dB at Nyquist', 'to convert IB to Ethernet', 'for encryption'], 1, 'Heavy channel loss requires equalization and retiming. CPO shortens the channel to mm.'],
    ['Known-good engines matter because:', ['engines are cheap', 'package yield ≈ product of all part yields', 'they increase laser power', 'they remove FEC'], 1, 'Yields multiply; testing before assembly avoids scrapping expensive packages.'],
    ['Arrhenius with Ea = 0.7 eV, 55 → 85 °C gives AF of roughly:', ['~1.5', '~8', '~80', '~800'], 1, 'exp(0.7/8.617e-5 × (1/328 − 1/358)) ≈ 8.'],
    ['Which loop must be fastest?', ['fan speed control', 'ring lock vs package thermal rise', 'facility chiller', 'firmware update rollout'], 1, 'Ring lock must outpace temperature changes at the rings (ms–s).'],
    ['PFC\'s main risk is:', ['too many drops', 'pause spreading upstream (head-of-line blocking)', 'higher BER', 'laser aging'], 1, 'Pauses can cascade and stall unrelated traffic.'],
    ['A good thermal model is trustworthy when:', ['it uses CFD', 'it has been correlated to measurements', 'it shows low temperatures', 'it uses many mesh cells'], 1, 'Uncorrelated models are hypotheses.'],
    ['FMEA: S=9, O=2, D=3 (RPN 54). Act on it?', ['No, RPN is low', 'Yes: severity ≥ 9 is always acted on', 'Only if O increases', 'Never'], 1, 'High-severity items are addressed regardless of RPN.']
  ];
  function pQuiz(p) {
    const order = QUIZ.map((_, i) => i).sort(() => Math.random() - 0.5); let score = 0, answered = 0;
    const sc = h('div', { class: 'callout' });
    order.forEach((qi, n) => {
      const [q, opts, ok, why] = QUIZ[qi]; const fb = h('div', { class: 'cs-fb' }); const box = h('div', { class: 'cs-opts' }); let done = false;
      opts.forEach((o, j) => { const b = h('button', { class: 'btn cs-opt', onclick: () => { if (done) return; done = true; answered++; if (j === ok) score++; b.classList.add('picked', j === ok ? 'right' : 'wrong'); if (j !== ok) box.children[ok].classList.add('picked', 'right'); fb.className = 'cs-fb callout' + (j === ok ? '' : ' warn'); fb.innerHTML = (j === ok ? '✅ ' : '❌ ') + why; C.linkify(fb); sc.innerHTML = 'Score: <b>' + score + ' / ' + answered + '</b> answered (' + QUIZ.length + ' total)' + (answered === QUIZ.length ? ' · ' + (score >= 16 ? '🎉 excellent' : score >= 12 ? 'good, so review the misses' : 'review the related courses and try again') : ''); } }, o); box.appendChild(b); });
      p.appendChild(h('div', { class: 'card', style: 'margin:10px 0' }, h('div', { html: '<b>' + (n + 1) + '.</b> ' + q }), box, fb));
    });
    sc.innerHTML = 'Score: <b>0 / 0</b> answered (' + QUIZ.length + ' total)'; p.insertBefore(sc, p.children[2] || null);
    p.appendChild(h('button', { class: 'btn', onclick: () => location.reload() }, '↺ New random order (reload)'));
  }

  const OPEN = [
    ['Walk me through the optical link budget of a CPO lane.', ['Start from laser output per lane (after splitting: 10·log N).', 'Subtract: laser→engine connectors/couplers, modulator insertion loss + extinction penalty, on-chip waveguide/mux, chip→fiber coupler, link connectors, fiber, far-end coupler/demux.', 'Compare received OMA/power with sensitivity at the FEC threshold → margin.', 'Hold margin for aging, temperature, contamination, part variation; show worst-case and statistical views.', 'Name the biggest items and the cheapest dB to recover.']],
    ['A lane fails only at hot coolant temperature. How do you debug it?', ['Reproduce: controlled coolant sweep, log BER, Rx power, heater codes, ring temperature, laser bias.', 'Check ring tuning range at temperature (heater saturating?), laser wavelength drift vs ring, TIM/thermal path, fiber-attach shift (loss vs temperature), supply noise vs temperature.', 'Compare with neighbouring lanes/engines: one lane (local defect) vs all (design margin).', 'Root cause → fix (design, calibration, screen) → add a test so it can\'t escape again.']],
    ['How would you set the coolant inlet temperature requirement?', ['Facility side: warmer water → no chillers, better PUE, heat reuse.', 'Component side: Tj limit with end-of-life TIM, ring heater range and power, laser case temperature and aging, condensation risk at the low end.', 'Run the thermal stack at the proposed range and both extremes; check every margin.', 'Agree with customers/facility teams; write the range plus minimum flow and maximum pressure drop.']],
    ['Explain to an executive why CPO saves power.', ['In a pluggable switch, every bit crosses ~20–30 cm of board and a connector, losing most of its signal, so both ends need power-hungry equalization plus a DSP in every module, and every module has its own lasers.', 'CPO moves the optics next to the switch chip: millimetres of wire, no module DSP, shared front-panel lasers.', 'NVIDIA cites 3.5× better power efficiency and 4× fewer lasers; at AI-factory scale that frees megawatts for GPUs.']],
    ['How do you decide burn-in duration for lasers?', ['Look at the early-life failure distribution (Weibull β < 1 part) from screening data.', 'Model failures removed vs burn-in time; cost of factory time vs cost of field failures (replacement, downtime, reputation).', 'Check burn-in doesn\'t consume meaningful wear-out life.', 'Use field returns to adjust: if early failures persist, lengthen or tighten screening criteria.']],
    ['What telemetry would you require from each optical engine and laser module?', ['Per lane: Tx/Rx optical power, pre-FEC BER/FEC histogram, ring heater code and lock state, temperatures.', 'Per laser: bias current, output power, temperature, TEC (if any), wavelength-related monitors.', 'Events: lock loss, re-lock, faults with timestamps (PTP-synced).', 'Rates, resolution, thresholds from budgets; polling budget on the management buses checked.']],
    ['Thermal crosstalk is shifting rings when traffic ramps. Options?', ['Reduce coupling: thermal breaks, distance, separate cold-plate zones, coolant ordering.', 'Faster or feed-forward lock control (use ASIC power telemetry).', 'Reserve heater headroom at both temperature extremes (power cost).', 'Ramp ASIC power, i.e. smooth load steps.', 'Quantify each with the thermal and power budgets; choose by trade study.']],
    ['How would you structure validation for a new CPO switch?', ['Start from requirements with verification methods (V&V matrix).', 'Component/engine tests, package tests, system tests: functional, performance across temperature/voltage/aging corners, interoperability with standard NICs/optics, reliability (life, cycling, shock/vibe), fault injection, EMC/safety.', 'Define pass/fail before testing; correlate results with models.', 'Track coverage and open risks at each gate (EVT/DVT/PVT).']],
    ['What is the biggest reliability risk in CPO and how do you manage it?', ['Lasers (wear-out) → external, replaceable, screened, telemetry-predicted.', 'Fiber attach (creep, thermal cycling) → qualification, adhesives, mechanical design.', 'Co-packaged engines (can\'t be swapped) → KGD testing, design margin, derating.', 'Show it as a FIT Pareto and a field-telemetry plan.']],
    ['A supplier changes an adhesive in the fiber-attach process. What do you do?', ['Treat it as a change request: impact on requirements (loss, stability, reliability), on ICDs and on the verification matrix.', 'Ask for qualification data (cure shrinkage, CTE, Tg, humidity, cycling).', 'Re-run the affected reliability tests; track lots; consider a phased introduction with telemetry monitoring.']],
    ['How do you know whether a field problem is optics or network?', ['Bottom-up: physical-layer KPIs first (BER/FEC, Rx power, lock events, link flaps).', 'If clean: queues, ECN, PFC, drops, routing balance: network layer.', 'Correlate in time with jobs, maintenance and firmware changes.']],
    ['Why use LPO in some places and CPO in others?', ['LPO: pluggable serviceability and lower power than DSP pluggables, but needs a good host channel and co-validation; fits shorter, controlled links.', 'CPO: best power/SI for very high-radix switches, fewer lasers; engines fixed.', 'Choose per link type based on power, reach, serviceability, interop and maturity.']]
  ];
  function pOpen(p) {
    p.appendChild(h('div', { class: 'callout', html: 'Answer out loud (or write bullet points) <b>before</b> revealing the model answer. Good answers are structured: clarify the goal, state assumptions, use numbers, name trade-offs, end with how you would verify.' }));
    OPEN.forEach(([q, pts], i) => {
      const rev = h('div', { style: 'display:none;margin-top:8px' }, h('ul', { html: pts.map(x => '<li>' + x + '</li>').join('') }));
      const btn = h('button', { class: 'btn', onclick: () => { rev.style.display = ''; btn.remove(); C.linkify(rev); } }, 'Show model answer');
      p.appendChild(h('div', { class: 'card', style: 'margin:10px 0' }, h('div', { html: '<b>' + (i + 1) + '. ' + q + '</b>' }), btn, rev));
    });
  }

  function pStar(p) {
    p.appendChild(h('div', { class: 'grid2', html:
      '<div class="card"><h3 style="margin-top:0">The STAR structure</h3><ul><li><b>S</b>ituation: the context in one or two sentences.</li><li><b>T</b>ask: what you were responsible for.</li><li><b>A</b>ction: what <i>you</i> did, with technical specifics and trade-offs.</li><li><b>R</b>esult: measurable outcome + what you learned.</li></ul><p class="muted">Keep it to ~2 minutes. Prepare 6–8 stories you can adapt.</p></div>' +
      '<div class="card"><h3 style="margin-top:0">Bridge your background</h3><ul><li><b>Mechanics →</b> tolerance stacks, FEA, warpage, alignment stability: link them to optical loss and reliability.</li><li><b>Optics →</b> coupling, losses, modes, resonators, metrology: the photonics core of CPO.</li><li><b>Systems engineering →</b> requirements, budgets, interfaces, V&V, trade studies: exactly the SE role.</li></ul></div>' }));
    const qs = ['Tell me about a time you found a problem nobody else saw, at an interface between two teams.', 'Describe a trade-off you made between performance, cost and schedule. How did you decide?', 'Tell me about a test or analysis that changed a design decision.', 'Describe a disagreement with a specialist (e.g. electrical, firmware) and how you resolved it.', 'Tell me about a field failure or test failure you root-caused.', 'How did you manage margins or budgets across several teams?', 'Describe a time you had to learn a new domain fast. How did you do it?', 'Tell me about a requirement that turned out to be wrong, and what you did.'];
    p.appendChild(h('h3', null, 'Behavioural questions to prepare (write your STAR notes)'));
    const key = 'iv-star-v1', notes = load(key, {});
    qs.forEach((q, i) => { const ta = h('textarea', { rows: 3, style: 'width:100%;background:var(--panel2);color:var(--text);border:1px solid var(--line);border-radius:8px;padding:8px;font:inherit;font-size:14px', placeholder: 'S… T… A… R…' }); ta.value = notes[i] || ''; ta.addEventListener('input', () => { notes[i] = ta.value; save(key, notes); }); p.appendChild(h('div', { class: 'card', style: 'margin:8px 0' }, h('div', { html: '<b>' + (i + 1) + '. ' + q + '</b>' }), ta)); });
    p.appendChild(h('p', { class: 'muted', style: 'font-size:12.5px' }, 'Notes are saved only in this browser on this device.'));
  }

  CE.register({
    id: 'interview', title: 'Interview & Practice', icon: '🎤', order: 9.9, storeKey: 'iv-last-step',
    finish: { go: 'plan90', label: 'Go to your First 90 Days plan →' },
    pages: [
      CE.startPage({ eyebrow: 'Practice · revisit often', title: '<em>Interview</em> and <em>design-discussion</em> practice', startLabel: 'Start practising',
        intro: 'Turn what you learned into fast recall and confident answers: <b>flashcards</b> with spaced repetition (saved on this device), a 20-question <b>quiz</b> with explanations, <b>open design questions</b> with model answers, and <b>behavioural</b> (STAR) preparation that bridges your mechanics, optics and systems-engineering background.',
        analogy: [['🃏', 'Flashcards', '47 cards, Leitner boxes'], ['✅', 'Quiz', '20 questions, explained'], ['🧠', 'Open questions', 'model answers'], ['⭐', 'STAR', 'your stories, saved']],
        route: ['Flashcards (spaced repetition).', 'Quiz.', 'Open design questions.', 'Behavioural / STAR preparation.'] }),
      CE.page('iv-flash', 'Flashcards', 'Practice', 'Flashcards with spaced repetition', 'Pick a topic, recall the answer, then be honest. Missed cards come back sooner.', pFlash),
      CE.page('iv-quiz', 'Quiz', 'Practice', 'Quiz: 20 questions across all courses', 'Numbers, signatures and judgement calls. Each answer explains itself.', pQuiz),
      CE.page('iv-open', 'Open design questions', 'Practice', 'Open design questions', 'The kind of questions a senior CPO system engineer is asked, in interviews and in design reviews.', pOpen),
      CE.page('iv-star', 'Behavioural (STAR)', 'Practice', 'Behavioural questions and your stories', null, pStar),
      CE.donePage({ stepTitle: 'Keep practising', eyebrow: 'Practice makes permanent', title: 'Come back to <em>practise</em> regularly', takeaways: ['A few minutes of flashcards on most days beats one long session.', 'Answer open questions out loud, with numbers and trade-offs.', 'Keep your STAR stories current as you learn on the job.', 'Use the First 90 Days plan to turn learning into contribution.'], next: [['Go to your First 90 Days plan →', 'plan90'], ['Flashcards again', 'interview/iv-flash']] })
    ]
  });
})();
