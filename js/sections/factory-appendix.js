/* Appendix chapters for the AI Factory course (read by js/sections/factory.js at render time).
   Each chapter: { id, short, title, lead, html, mount(bodyEl) → cleanup? } */
(function () {
  'use strict';
  const C = window.CPO;
  const B = C.badge;
  const num = n => Math.round(n).toLocaleString('en-US');

  C.addGlossary({
    'PUE': { full: 'Power Usage Effectiveness', def: 'Total facility power ÷ IT power. 1.0 would mean every watt goes to computers; liquid-cooled AI factories reach ~1.1–1.3.', cat: 'power' },
    'CDU': { full: 'Coolant Distribution Unit', def: 'Pump + heat exchanger that moves heat from the rack coolant loop into the facility water loop.', cat: 'thermal' },
    'SIMT': { full: 'Single Instruction, Multiple Threads', def: 'GPU execution style: 32 threads (a warp) run the same instruction on different data.', cat: 'system' },
    'MoE': { full: 'Mixture of Experts', def: 'Model architecture where each token is routed to a few "expert" sub-networks, which may live on other GPUs. Creates all-to-all traffic.', cat: 'system' },
    'KV cache': { full: 'Key-Value cache', def: 'Memory a language model keeps of the conversation so far, so it does not recompute it for every new token.', cat: 'system' },
    'BF16': { full: 'Brain Float 16', def: '16-bit number format with the same range as FP32 but less precision; standard for AI training.', cat: 'system' },
    'FP8': { full: '8-bit floating point', def: 'Compact number format used for fast AI training and inference.', cat: 'system' },
    'FP4': { full: '4-bit floating point', def: 'Very compact number format used mainly for fast inference on Blackwell-class GPUs.', cat: 'system' },
    'Dragonfly': { full: 'Dragonfly topology', def: 'Network of groups; each group is fully connected inside and has direct global links to other groups. Used in HPC supercomputers.', cat: 'network' },
    'Torus': { full: 'Torus topology', def: 'Grid network where each node links to its neighbours and the edges wrap around. Cheap wiring, more hops.', cat: 'network' }
  });

  function svgPower() {
    const st = [
      ['Grid', '100s kV AC', '#facc15'], ['Substation', '→ 10–35 kV', '#facc15'], ['Transformer', '→ 400–480 V AC', '#facc15'],
      ['UPS / batteries', 'ride-through', '#f5b301'], ['Rack power shelf', 'AC → 48–54 V DC', '#facc15'], ['Tray converters', '→ ~12 V / direct', '#facc15'], ['VRM at the chip', '→ ~0.7 V, ~1000 A', '#76b900']
    ];
    let s = '<svg viewBox="0 0 1000 170" role="img" aria-label="Power chain">';
    st.forEach((x, i) => {
      const X = 12 + i * 141;
      s += '<rect x="' + X + '" y="40" width="122" height="78" rx="10" fill="#1a1705" stroke="' + x[2] + '"/>';
      s += '<text x="' + (X + 61) + '" y="72" text-anchor="middle" fill="#e6edf5" font-size="13.5" font-weight="700">' + x[0] + '</text>';
      s += '<text x="' + (X + 61) + '" y="94" text-anchor="middle" fill="#8a99ad" font-size="12">' + x[1] + '</text>';
      if (i < st.length - 1) s += '<path d="M' + (X + 124) + ' 79 L' + (X + 139) + ' 79" stroke="#facc15" stroke-width="2.5" marker-end="url(#afar)"/>';
    });
    s += '<defs><marker id="afar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#facc15"/></marker></defs>';
    s += '<text x="500" y="152" text-anchor="middle" fill="#8a99ad" font-size="12.5">each conversion step loses ~1–3 %; the last one, right next to the GPU, has to deliver about a thousand amps</text>';
    return s + '</svg>';
  }

  function svgCooling() {
    const st = [['GPU die', '~1 kW of heat', '#ff5a36'], ['Cold plate', 'micro-channel metal block', '#ff5a36'], ['Rack loop', 'coolant ~25–45 °C in', '#3b82f6'],
      ['CDU', 'pump + heat exchanger', '#3b82f6'], ['Facility water', 'building loop', '#3b82f6'], ['Dry cooler / tower', 'heat to the outside air', '#22d3ee']];
    let s = '<svg viewBox="0 0 1000 150" role="img" aria-label="Cooling chain">';
    st.forEach((x, i) => {
      const X = 14 + i * 164;
      s += '<rect x="' + X + '" y="30" width="146" height="74" rx="10" fill="#0b1220" stroke="' + x[2] + '"/>';
      s += '<text x="' + (X + 73) + '" y="62" text-anchor="middle" fill="#e6edf5" font-size="13.5" font-weight="700">' + x[0] + '</text>';
      s += '<text x="' + (X + 73) + '" y="84" text-anchor="middle" fill="#8a99ad" font-size="11.5">' + x[1] + '</text>';
      if (i < st.length - 1) s += '<path d="M' + (X + 148) + ' 67 L' + (X + 162) + ' 67" stroke="#3b82f6" stroke-width="2.5"/>';
    });
    s += '<text x="500" y="135" text-anchor="middle" fill="#8a99ad" font-size="12.5">heat flows left → right; every step is a heat exchanger or a pump</text>';
    return s + '</svg>';
  }

  function svgRails() {
    const col = ['#22d3ee', '#76b900', '#f472b6', '#facc15'];
    let s = '<svg viewBox="0 0 1000 400" role="img" aria-label="Rail-optimized network">';
    // spines
    for (let i = 0; i < 2; i++) { const x = 330 + i * 220; s += '<rect x="' + x + '" y="20" width="120" height="40" rx="8" fill="#1d0e08" stroke="#ff6b3d"/><text x="' + (x + 60) + '" y="45" text-anchor="middle" fill="#e6edf5" font-size="13">Spine</text>'; }
    // leaves
    for (let r = 0; r < 4; r++) {
      const x = 90 + r * 220;
      for (let i = 0; i < 2; i++) s += '<line x1="' + (x + 60) + '" y1="140" x2="' + (390 + i * 220) + '" y2="60" stroke="#ff6b3d" stroke-opacity=".35"/>';
      s += '<rect x="' + x + '" y="140" width="120" height="40" rx="8" fill="#1d0e08" stroke="' + col[r] + '" stroke-width="2"/><text x="' + (x + 60) + '" y="165" text-anchor="middle" fill="' + col[r] + '" font-size="13" font-weight="700">Rail ' + (r + 1) + ' leaf</text>';
    }
    // servers
    for (let sv = 0; sv < 4; sv++) {
      const x = 70 + sv * 230;
      s += '<rect x="' + x + '" y="270" width="170" height="100" rx="10" fill="#0c1219" stroke="#3b4a5e"/><text x="' + (x + 85) + '" y="390" text-anchor="middle" fill="#8a99ad" font-size="12.5">server ' + (sv + 1) + '</text>';
      for (let g = 0; g < 4; g++) {
        const gx = x + 12 + g * 39;
        s += '<line x1="' + (gx + 16) + '" y1="290" x2="' + (150 + g * 220) + '" y2="180" stroke="' + col[g] + '" stroke-opacity=".7" stroke-width="1.6"/>';
        s += '<rect x="' + gx + '" y="290" width="32" height="56" rx="4" fill="#0f1a10" stroke="' + col[g] + '"/><text x="' + (gx + 16) + '" y="323" text-anchor="middle" fill="#e6edf5" font-size="11">GPU' + (g + 1) + '</text>';
      }
    }
    return s + '</svg>';
  }

  function svgExec() {
    let s = '<svg viewBox="0 0 1000 250" role="img" aria-label="Grid, blocks, warps, threads">';
    s += '<rect x="10" y="10" width="980" height="230" rx="12" fill="#0b130c" stroke="#76b900"/><text x="24" y="34" fill="#76b900" font-size="13" font-weight="700">KERNEL LAUNCH = a grid of thread blocks (spread over all SMs)</text>';
    for (let b = 0; b < 4; b++) {
      const x = 26 + b * 240;
      s += '<rect x="' + x + '" y="48" width="222" height="178" rx="10" fill="#0d150e" stroke="#2f5a12"/><text x="' + (x + 12) + '" y="68" fill="#cfe3b0" font-size="12.5">block ' + b + ' → runs on one SM</text>';
      for (let w = 0; w < 3; w++) {
        const y = 80 + w * 46;
        s += '<rect x="' + (x + 10) + '" y="' + y + '" width="202" height="38" rx="6" fill="#160f24" stroke="#a78bfa"/><text x="' + (x + 18) + '" y="' + (y + 14) + '" fill="#d9ccff" font-size="11">warp ' + w + ' · 32 threads</text>';
        for (let t = 0; t < 16; t++) s += '<rect x="' + (x + 18 + t * 12) + '" y="' + (y + 20) + '" width="9" height="12" rx="1.5" fill="#22d3ee" fill-opacity="' + (w === 0 ? 0.9 : 0.35) + '"/>';
      }
    }
    return s + '</svg>';
  }

  function svgRoofline() {
    let s = '<svg viewBox="0 0 1000 330" role="img" aria-label="Roofline">';
    s += '<line x1="90" y1="280" x2="960" y2="280" stroke="#3b4a5e"/><line x1="90" y1="280" x2="90" y2="20" stroke="#3b4a5e"/>';
    s += '<text x="525" y="318" text-anchor="middle" fill="#8a99ad" font-size="13">arithmetic intensity: FLOPs done per byte read from memory (log scale) →</text>';
    s += '<text x="30" y="150" fill="#8a99ad" font-size="13" transform="rotate(-90 30 150)" text-anchor="middle">achieved FLOPS (log) →</text>';
    s += '<path d="M90 270 L520 60 L960 60" stroke="#76b900" stroke-width="4" fill="none"/>';
    s += '<text x="250" y="210" fill="#22d3ee" font-size="13.5" transform="rotate(-26 250 210)">memory-bound: limited by HBM bandwidth</text>';
    s += '<text x="740" y="50" text-anchor="middle" fill="#76b900" font-size="13.5">compute-bound: limited by Tensor Cores</text>';
    s += '<line x1="520" y1="60" x2="520" y2="280" stroke="#76b900" stroke-dasharray="4 5" stroke-opacity=".6"/><text x="520" y="298" text-anchor="middle" fill="#76b900" font-size="12">ridge point ≈ peak FLOPS ÷ bandwidth</text>';
    s += '<circle cx="200" cy="216" r="9" fill="#f472b6"/><text x="214" y="240" fill="#f472b6" font-size="13">LLM decode (1 token at a time)</text>';
    s += '<circle cx="800" cy="60" r="9" fill="#facc15"/><text x="800" y="90" text-anchor="middle" fill="#facc15" font-size="13">training: big matrix multiplies</text>';
    return s + '</svg>';
  }

  function svgTimeline() {
    function row(y, label, segs) {
      let s = '<text x="10" y="' + (y + 20) + '" fill="#8a99ad" font-size="12.5">' + label + '</text>';
      segs.forEach(([x, w, col, t]) => { s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="30" rx="5" fill="' + col + '" fill-opacity=".85"/><text x="' + (x + w / 2) + '" y="' + (y + 20) + '" text-anchor="middle" fill="#05070a" font-size="12" font-weight="700">' + t + '</text>'; });
      return s;
    }
    let s = '<svg viewBox="0 0 1000 300" role="img" aria-label="Training step timeline">';
    s += '<text x="10" y="22" fill="#e6edf5" font-size="13.5" font-weight="700">Fast network: communication hides behind compute</text>';
    s += row(34, 'GPU compute', [[130, 230, '#76b900', 'forward'], [362, 420, '#9bd43a', 'backward'], [784, 80, '#facc15', 'update']]);
    s += row(70, 'network', [[470, 120, '#ff6b3d', 'all-reduce'], [600, 120, '#ff6b3d', 'all-reduce'], [730, 54, '#ff6b3d', '']]);
    s += '<text x="10" y="150" fill="#e6edf5" font-size="13.5" font-weight="700">Slow or flapping link: GPUs sit idle waiting</text>';
    s += row(162, 'GPU compute', [[130, 230, '#76b900', 'forward'], [362, 420, '#9bd43a', 'backward'], [910, 80, '#facc15', 'update']]);
    s += row(198, 'network', [[470, 200, '#ff6b3d', 'all-reduce'], [672, 236, '#ff6b3d', 'all-reduce (late)']]);
    s += '<rect x="784" y="162" width="124" height="30" rx="5" fill="none" stroke="#ff4d5e" stroke-dasharray="5 4"/><text x="846" y="182" text-anchor="middle" fill="#ff4d5e" font-size="12" font-weight="700">idle!</text>';
    s += '<text x="500" y="270" text-anchor="middle" fill="#8a99ad" font-size="12.5">every one of the thousands of GPUs waits for the last all-reduce to finish before it can update and start the next step</text>';
    return s + '</svg>';
  }

  function logbars(rows) {
    const mx = Math.log10(rows[0][1]), mn = Math.log10(rows[rows.length - 1][1]) - 0.6;
    return rows.map(([l, v, txt, col, tag]) => '<div class="af-logbar"><span>' + l + '</span><div class="tr"><i style="width:' + (100 * (Math.log10(v) - mn) / (mx - mn)).toFixed(1) + '%;background:' + col + '"></i></div><output>' + txt + ' ' + B(tag) + '</output></div>').join('');
  }

  const CH = [];

  // ================================================================ A · AI factory in depth
  CH.push({
    id: 'apx-factory', short: 'The AI factory in depth', title: 'The AI factory in depth',
    lead: 'What the building actually produces, how power and cooling get to the chips, how to size one on the back of an envelope, and why reliability becomes the hard part at scale.',
    html:
      '<h3>1 · What it produces: training and inference</h3>' +
      '<p>An AI factory runs two kinds of work. They stress the factory in different ways:</p>' +
      '<table class="table"><tr><th></th><th>Training</th><th>Inference (serving)</th></tr>' +
      '<tr><td>What</td><td>Teach one model by showing it trillions of tokens</td><td>Answer users: generate tokens from a finished model</td></tr>' +
      '<tr><td>Shape of the job</td><td>One giant job on thousands to 100k+ GPUs for weeks or months, all in lock-step</td><td>Millions of small requests, each needing a few GPUs for milliseconds to seconds</td></tr>' +
      '<tr><td>What limits it</td><td>Compute and the network (every step ends with GPUs exchanging results)</td><td>Memory bandwidth (reading the model\'s weights for every token) and latency</td></tr>' +
      '<tr><td>Network pattern</td><td>All-reduce: every GPU shares gradients with every other</td><td>All-to-all for mixture-of-experts models, moving KV cache between GPUs, front-end requests</td></tr>' +
      '<tr><td>KPI</td><td>Time to train, "goodput" (useful work ÷ time)</td><td>Tokens per second per megawatt, time to first token</td></tr></table>' +
      '<p>Either way, the business metric is <b>useful tokens per megawatt</b>. Power is the scarcest resource, so every watt not spent on GPUs (cooling, conversion losses, optics) is a watt of lost output.</p>' +

      '<h3>2 · The power chain: from the grid to 0.7 V</h3>' +
      '<div class="af-fig">' + svgPower() + '</div>' +
      '<p>Electricity arrives at very high voltage, because high voltage means low current and low losses on long wires. It is stepped down several times. Inside the rack it travels on a <b>48–54 V DC busbar</b> ' + B('typ') + ', a copper bar running down the back. The final conversion happens in <b>voltage regulators (VRMs)</b> centimetres from the GPU, which deliver roughly 0.7 V at around a thousand amps.</p>' +
      '<p>Rack power has risen from ~10 kW (classic servers) to ~120 kW (NVL72) ' + B('typ') + ', and it keeps rising. At these currents copper busbars get heavy and losses grow, so the industry is moving to higher-voltage DC distribution. NVIDIA has announced 800 V DC plans for future AI factories ' + B('nv') + '.</p>' +
      '<p>Batteries or UPS units cover short grid hiccups. Training jobs also cause large, fast swings in power: thousands of GPUs go from compute to waiting at the same instant. The power system has to handle that without tripping.</p>' +

      '<h3>3 · The cooling chain: removing a megawatt per few racks</h3>' +
      '<div class="af-fig">' + svgCooling() + '</div>' +
      '<p>Practically every watt that goes in comes out as heat. Air cannot remove ~120 kW from one rack, while water carries about <b>3,500× more heat per litre</b> than air ' + B('typ') + '. So AI racks use <b>direct liquid cooling</b>: coolant flows through cold plates screwed onto every GPU, CPU, NVLink switch and CPO switch package.</p>' +
      '<p><b>PUE</b> (power usage effectiveness) = total facility power ÷ IT power. Air-cooled data centers are typically ~1.4–1.6, liquid-cooled AI factories ~1.1–1.3 ' + B('typ') + '. Warm-water cooling (inlet ~30–45 °C) lets the building reject heat to outside air without energy-hungry chillers for much of the year.</p>' +
      '<p><b>CPO link:</b> Quantum-X Photonics switches are liquid cooled ' + B('nv') + ', so the optics share the same cold plate as the switch chip. This only works because the lasers were moved out to front-panel <b>external laser sources</b>, away from the hot ASIC: lasers age faster when hot.</p>' +

      '<h3>4 · Sizing a factory on the back of an envelope</h3>' +
      '<div class="af-mini"><div class="card" id="afx-size-in"></div><div class="card" id="afx-size-out"></div></div>' +

      '<h3>5 · Reliability: the hard part at scale</h3>' +
      '<p>Suppose a single part fails on average once every 100 years. With a million such parts in the building, one fails roughly every hour. A 100k-GPU factory contains millions of lasers, connectors, fans, pumps, memory chips and power stages, so <b>something is always broken</b> ' + B('typ') + '.</p>' +
      '<p>A training job runs on all GPUs at once, so <b>one failure can stop the whole job</b>. It then restarts from its last <b>checkpoint</b>, a saved copy of the model, and every minute since that checkpoint is lost work. Operators track <b>goodput</b>: the fraction of time spent on useful progress.</p>' +
      '<ul><li><b>Optical links are among the most frequent causes of interruptions</b> ' + B('typ') + ': aging lasers, dirty connectors and marginal signal quality cause "link flaps" (a link goes down and comes back).</li>' +
      '<li>Every component you remove from a link removes a way for it to fail. CPO removes the per-link pluggable module with its DSP, laser and connector, and shares fewer, front-serviceable lasers. Hence NVIDIA\'s claim of <b>10× better resiliency</b> ' + B('nv') + '.</li>' +
      '<li>Telemetry (BER, FEC counters, optical power, temperatures) helps spot a link that is going bad <i>before</i> it fails, so it can be drained and fixed between jobs.</li></ul>' +

      '<h3>6 · The software that runs the factory</h3>' +
      '<table class="table"><tr><td>Job scheduler</td><td>Slurm or Kubernetes decides which GPUs run which job, ideally placing a job\'s GPUs close together in the network.</td></tr>' +
      '<tr><td>Communication library</td><td>NCCL turns "add up these numbers across 10,000 GPUs" into an efficient pattern of messages over NVLink and the network.</td></tr>' +
      '<tr><td>Fabric manager</td><td>Sets up routes, watches congestion and link health (e.g. UFM for InfiniBand, or network OS + telemetry for Ethernet).</td></tr>' +
      '<tr><td>Facility management</td><td>BMCs and the management network watch power, temperatures, coolant flow and leaks, and shut things down safely if needed.</td></tr></table>',
    mount(body) {
      const inEl = body.querySelector('#afx-size-in'), outEl = body.querySelector('#afx-size-out');
      const mw = C.h('input', { type: 'range', min: 10, max: 1000, step: 10, value: 100 }), mwo = C.h('output');
      const pue = C.h('input', { type: 'range', min: 1.05, max: 1.6, step: 0.05, value: 1.2 }), pueo = C.h('output');
      inEl.appendChild(C.h('h4', null, 'Your factory'));
      inEl.appendChild(C.h('div', { class: 'slider-row' }, C.h('label', null, 'Facility power'), mw, mwo));
      inEl.appendChild(C.h('div', { class: 'slider-row' }, C.h('label', null, 'PUE'), pue, pueo));
      inEl.appendChild(C.h('p', { class: 'muted', style: 'font-size:12.5px', html: 'Assumes ~90 % of IT power goes to GPU racks at ~125 kW per NVL72 rack, a 3-tier network with 3 links per GPU, and an 800G pluggable optic at ~15 W ' + B('est') + '.' }));
      function upd() {
        const P = +mw.value, U = +pue.value;
        mwo.textContent = P + ' MW'; pueo.textContent = U.toFixed(2);
        const it = P / U, racks = it * 0.9 / 0.125, gpus = racks * 72;
        const ends = gpus * 3 * 2, plug = ends * 15 / 1e6, cpo = (gpus * 15 + (ends - gpus) * 15 / 3.5) / 1e6;
        outEl.innerHTML = '<div class="af-out">' +
          f(it.toFixed(0) + ' MW', 'reaches the IT equipment') + f(num(racks), 'NVL72 racks') + f(num(gpus), 'GPUs') +
          f((P - it).toFixed(0) + ' MW', 'cooling & conversion overhead') + f(plug.toFixed(1) + ' MW', 'network optics, all pluggable') + f(cpo.toFixed(1) + ' MW', 'network optics with CPO switches') + '</div>' +
          '<p class="muted" style="margin:8px 0 0;font-size:13px">With pluggables the optics alone are ~' + (100 * plug / it).toFixed(1) + ' % of IT power. That saving can run ~' + num((plug - cpo) * 1e6 / 1200) + ' more GPUs ' + B('est') + '.</p>';
      }
      function f(v, l) { return '<div class="af-fact"><b>' + v + '</b><span>' + l + ' ' + B('est') + '</span></div>'; }
      mw.addEventListener('input', upd); pue.addEventListener('input', upd); upd();
    }
  });

  // ================================================================ B · Topologies in depth
  CH.push({
    id: 'apx-topology', short: 'Network topologies in depth', title: 'Network topologies in depth',
    lead: 'The vocabulary, the math of fat trees, rail-optimized and multi-plane designs, other topologies, InfiniBand vs Ethernet, congestion, and exactly where CPO changes the design.',
    html:
      '<h3>1 · Vocabulary</h3>' +
      '<table class="table">' +
      '<tr><td>Radix</td><td>How many ports a switch has. Quantum-X Photonics: 144 × 800G; Spectrum-X Photonics: up to 512 × 800G or 2,048 × 200G ' + B('nv') + '. Higher radix = flatter network.</td></tr>' +
      '<tr><td>Tier</td><td>A layer of switches (leaf, spine, core). Each extra tier multiplies how many GPUs you can connect, but adds hops, switches and optics.</td></tr>' +
      '<tr><td>Hop</td><td>One pass through a switch. Each hop adds latency (well under a microsecond in a modern switch ' + B('typ') + ') and another chance of congestion.</td></tr>' +
      '<tr><td>Bisection bandwidth</td><td>Cut the network into two halves; how much data can cross the cut per second? For AI you want "full bisection": half the GPUs can talk to the other half at full speed.</td></tr>' +
      '<tr><td>Oversubscription</td><td>Ratio of downlinks to uplinks at a switch. 1:1 = non-blocking (AI back-end networks); 3:1 is common in cheaper cloud networks.</td></tr>' +
      '<tr><td>Blast radius</td><td>How much of the network is affected when one switch or link fails.</td></tr></table>' +

      '<h3>2 · Fat tree (Clos) math</h3>' +
      '<p>Take switches with <b>k</b> ports. In a non-blocking tree each leaf uses k/2 ports down (to GPUs) and k/2 up. That gives:</p>' +
      '<div class="eq">1 tier : up to k GPUs (a single switch)\n2 tiers: up to k²/2 GPUs     leaves = 2N/k, spines = N/k, hops ≤ 3\n3 tiers: up to k³/4 GPUs     + a core layer,          hops ≤ 5\nfiber links ≈ tiers × N     (one per GPU per tier)</div>' +
      '<div class="af-mini"><div class="card" id="afx-ft-in"></div><div class="card" id="afx-ft-out"></div></div>' +
      '<p>Notice how a jump in radix can <b>remove a whole tier</b>. A tier is a full set of N more fiber links, 2N more optical ends, more switches and more hops. That is why switch vendors push radix as hard as they push speed.</p>' +

      '<h3>3 · Rail-optimized design</h3>' +
      '<div class="af-fig">' + svgRails() + '</div>' +
      '<p>A server (or compute tray) has several GPUs, each with its own NIC. Instead of plugging all of a server\'s NICs into the same leaf, <b>GPU 1 of every server goes to the "rail 1" leaf, GPU 2 to rail 2</b>, and so on. Communication libraries arrange most traffic between "same-numbered" GPUs, so that traffic crosses <b>only one switch</b>. Traffic that needs to change rails can often do so for free inside the server or rack over NVLink.</p>' +

      '<h3>4 · Multi-plane networks</h3>' +
      '<p>An 800G NIC port is really several lanes (e.g. 4 × 200G). Instead of running all of them to one 800G switch port, you can split them into <b>independent "planes"</b>, each a separate fat tree built from 200G ports. A switch with 2,048 × 200G ports has an enormous radix, so each plane needs fewer tiers: with k = 2,048 a 2-tier plane can reach ~2 million endpoints ' + B('est') + '.</p>' +
      '<ul><li><b>Pro:</b> fewer tiers means fewer optics, lower latency, and if one plane has a problem the others keep running.</li><li><b>Con:</b> more switches and cables to manage, and traffic must be balanced across planes.</li></ul>' +

      '<h3>5 · Other topologies, and why AI mostly uses fat trees</h3>' +
      '<table class="table"><tr><th>Topology</th><th>Idea</th><th>Good at</th><th>Weak at</th></tr>' +
      '<tr><td>Fat tree / Clos</td><td>Leaves + spines (+ core), every leaf to every spine</td><td>Any-to-any traffic at full speed; simple, uniform</td><td>Most switches and optics</td></tr>' +
      '<tr><td>Dragonfly</td><td>Groups fully connected inside; one or a few long links between every pair of groups</td><td>Huge HPC systems with fewer long cables</td><td>Needs smart adaptive routing; uneven under heavy all-to-all</td></tr>' +
      '<tr><td>Torus / mesh</td><td>Each node links to its neighbours in 2D/3D, edges wrap around</td><td>Cheap wiring, great for neighbour traffic</td><td>Many hops for far-away traffic</td></tr>' +
      '<tr><td>NVLink switch domain</td><td>Every GPU in the rack connects to every NVLink switch</td><td>One hop between any 2 of 72 GPUs at 1.8 TB/s ' + B('nv') + '</td><td>Copper reach: limited to about a rack</td></tr></table>' +
      '<p>AI jobs are scheduled onto whatever GPUs are free, and their traffic is all-to-all. A fat tree gives the same performance no matter where the job lands, which makes it the safe default.</p>' +

      '<h3>6 · InfiniBand vs Ethernet for AI</h3>' +
      '<table class="table"><tr><th></th><th>InfiniBand (Quantum-X)</th><th>Ethernet (Spectrum-X)</th></tr>' +
      '<tr><td>Losing packets?</td><td>Lossless by design: a sender only transmits when the receiver has buffer space (credit-based flow control)</td><td>Standard Ethernet may drop; AI Ethernet adds congestion control and priority flow control to avoid it</td></tr>' +
      '<tr><td>Routing</td><td>Subnet manager computes routes; adaptive routing spreads load</td><td>Adaptive routing / packet spraying with SuperNICs reordering packets</td></tr>' +
      '<tr><td>Special features</td><td>SHARP: the switches themselves add up numbers for all-reduce ("in-network computing")</td><td>Works with the huge existing Ethernet ecosystem and tooling</td></tr>' +
      '<tr><td>CPO version</td><td>Quantum-X Photonics ' + B('nv') + '</td><td>Spectrum-X Photonics ' + B('nv') + '</td></tr></table>' +

      '<h3>7 · Congestion: why AI traffic is hard to route</h3>' +
      '<p>Normal internet traffic is millions of small, random flows, which spread evenly over the links by hashing (ECMP). AI traffic is a <b>few gigantic, synchronized flows</b>. If two of them hash onto the same spine link, that link is overloaded while others sit idle, and the whole step waits. Cures: <b>adaptive routing</b> (choose the least-loaded path packet by packet), <b>congestion control</b> (slow senders before queues overflow), and <b>job placement</b> that keeps traffic local.</p>' +
      '<p><b>Incast</b> is when many GPUs send to one at the same instant. The receiving port is overwhelmed and buffers fill. The switch\'s packet buffer and the flow-control loop absorb it.</p>' +

      '<h3>8 · Where CPO changes the topology</h3>' +
      '<ul><li><b>Radix at the same power:</b> pluggable optics limit how many 800G ports fit in a box\'s power and front-panel space. CPO cuts optics power ~3.5× ' + B('nv') + ' and removes the cages, so bigger, flatter switches become practical, and therefore fewer tiers.</li>' +
      '<li><b>Full bisection becomes affordable:</b> the network\'s optics bill (watts and dollars) scales with tiers × N. Cheaper ports mean no need to oversubscribe.</li>' +
      '<li><b>Reliability:</b> fewer lasers (4× fewer ' + B('nv') + ') and no pluggable module per port means fewer link flaps that stall jobs.</li>' +
      '<li><b>Serviceability:</b> the parts that age (lasers) are in front-panel external laser sources you can swap. Fibers attach through detachable connectors.</li></ul>',
    mount(body) {
      const inEl = body.querySelector('#afx-ft-in'), outEl = body.querySelector('#afx-ft-out');
      const kk = C.h('select', null, [32, 64, 128, 144, 256, 512, 2048].map(v => C.h('option', { value: v, selected: v === 144 }, v + ' ports')));
      const nn = C.h('input', { type: 'range', min: 0, max: 100, value: 45 }), nno = C.h('output');
      inEl.appendChild(C.h('h4', null, 'Try it'));
      inEl.appendChild(C.h('div', { class: 'slider-row' }, C.h('label', null, 'Switch radix k'), kk, C.h('span')));
      inEl.appendChild(C.h('div', { class: 'slider-row' }, C.h('label', null, 'GPUs N'), nn, nno));
      function upd() {
        const k = +kk.value, N = Math.round(Math.pow(10, 2 + 4 * nn.value / 100) / 100) * 100 || 100;
        nno.textContent = num(N);
        let t, sw, hops;
        if (N <= k) { t = 1; sw = 1; hops = 1; }
        else if (N <= k * k / 2) { t = 2; sw = Math.ceil(2 * N / k) + Math.ceil(N / k); hops = 3; }
        else if (N <= k * k * k / 4) { t = 3; sw = 2 * Math.ceil(2 * N / k) + Math.ceil(N / k); hops = 5; }
        else { t = 4; sw = NaN; hops = 7; }
        const fx = (v, l, tag) => '<div class="af-fact"><b>' + v + '</b><span>' + l + ' ' + B(tag || 'est') + '</span></div>';
        outEl.innerHTML = '<div class="af-out">' + fx(t > 3 ? '> 3' : t, 'tiers needed', 'typ') + fx(t > 3 ? '—' : num(sw), 'switches') + fx(hops, 'switch hops (worst case)', 'typ') +
          fx(num(t * N), 'fiber links') + fx(num(k * k / 2), 'max GPUs with 2 tiers', 'typ') + fx(num(k * k * k / 4), 'max GPUs with 3 tiers', 'typ') + '</div>' +
          (t > 3 ? '<p class="muted" style="margin:8px 0 0">Too many GPUs for 3 tiers of this switch: use a higher radix or multiple planes.</p>' : '');
      }
      kk.addEventListener('change', upd); nn.addEventListener('input', upd); upd();
    }
  });

  // ================================================================ C · How GPUs work
  CH.push({
    id: 'apx-gpu', short: 'How GPUs work', title: 'How GPUs work',
    lead: 'Why a GPU is built so differently from a CPU, how it runs thousands of threads, its memory ladder, number formats, the roofline, and where the power goes.',
    html:
      '<h3>1 · CPU vs GPU: a few experts vs a huge team</h3>' +
      '<div class="grid2"><div class="card"><h4>CPU (e.g. Grace)</h4><p>Tens of big, clever cores. Each one guesses branches, reorders instructions and has big caches, so it can finish <b>one</b> complicated task as fast as possible. Optimized for <b>latency</b>.</p></div>' +
      '<div class="card"><h4>GPU (e.g. Blackwell)</h4><p>Thousands of simple arithmetic units, grouped into SMs, all doing the <b>same</b> operation on different numbers. Each one is slow and simple, but together they do enormous amounts of work. Optimized for <b>throughput</b>.</p></div></div>' +
      '<p>Analogy: a CPU is a few master chefs cooking à la carte. A GPU is a stadium kitchen where a thousand cooks all chop onions at the same moment. AI is almost all "chop onions": the same multiply-add repeated trillions of times.</p>' +

      '<h3>2 · How work runs: grids, blocks, warps, threads</h3>' +
      '<div class="af-fig">' + svgExec() + '</div>' +
      '<ul><li>A program on the GPU is a <b>kernel</b>, launched as a <b>grid</b> of thousands of <b>thread blocks</b>.</li>' +
      '<li>Each block runs on one SM and shares that SM\'s fast shared memory.</li>' +
      '<li>Inside a block, threads are grouped into <b>warps of 32</b> ' + B('nv') + '. A warp executes one instruction for all 32 threads at once (SIMT).</li>' +
      '<li><b>Hiding waits:</b> reading from HBM takes hundreds of clock cycles ' + B('typ') + '. Instead of waiting, the scheduler switches instantly to another warp that is ready. With enough warps the arithmetic units never idle. GPUs hide network waits the same way, by overlapping communication with computation.</li></ul>' +

      '<h3>3 · The memory ladder: each step out is slower</h3>' +
      '<p>Bandwidth available to one GPU at each level (log scale, very rough):</p>' +
      '<div id="afx-mem"></div>' +
      '<p>Each step outward is roughly <b>3–20× slower</b>. Data in HBM arrives ~4× faster than over NVLink and ~80× faster than over a single 800G network port. Programmers and libraries work hard to keep data as close to the Tensor Cores as possible. They split models so that the heaviest traffic stays on NVLink, and only the unavoidable part goes over the scale-out network. This is also why every gain in network speed or efficiency (CPO) matters.</p>' +

      '<h3>4 · Number formats: fewer bits, more math</h3>' +
      '<table class="table"><tr><th>Format</th><th>Bits</th><th>Typical use</th><th>Speed relative to FP16 on Tensor Cores</th></tr>' +
      '<tr><td>FP32</td><td>32</td><td>classic scientific computing, master copy of weights</td><td>much slower</td></tr>' +
      '<tr><td>BF16 / FP16</td><td>16</td><td>standard training</td><td>1×</td></tr>' +
      '<tr><td>FP8</td><td>8</td><td>fast training and inference</td><td>~2× ' + B('typ') + '</td></tr>' +
      '<tr><td>FP4</td><td>4</td><td>inference on Blackwell</td><td>~4× ' + B('typ') + '</td></tr></table>' +
      '<p>Halving the bits halves the memory and network traffic and roughly doubles the math per second. Clever scaling factors keep the small numbers accurate enough for AI, which tolerates small errors well.</p>' +

      '<h3>5 · The roofline: is it compute-bound or memory-bound?</h3>' +
      '<div class="af-fig">' + svgRoofline() + '</div>' +
      '<p><b>Arithmetic intensity</b> = how many FLOPs you do per byte you fetch. Multiplying two big matrices reuses every number many times (high intensity), so it runs at the Tensor Cores\' peak. Generating one token at a time in inference reads every weight once for very little math (low intensity), so it is limited by HBM bandwidth. The same logic applies one level up: if a job needs more bytes over the <b>network</b> per FLOP than the network can supply, the network becomes the roof.</p>' +

      '<h3>6 · Where a GPU\'s power goes</h3>' +
      '<div class="eq">P ≈ α · C · V² · f  +  leakage\nα = fraction of gates switching each cycle, C = switched capacitance,\nV = supply voltage (~0.7 V), f = clock (~2 GHz)</div>' +
      '<ul><li><b>V² is the big lever:</b> 10 % lower voltage = ~19 % less switching energy. GPUs constantly adjust voltage and clock (DVFS) to stay within their power and temperature limits.</li>' +
      '<li><b>Moving data costs more than math:</b> reading a number from HBM costs far more energy than multiplying it ' + B('typ') + ', and sending it over a pluggable optic costs more again (~15–20 pJ/bit ' + B('typ') + ').</li>' +
      '<li>~1 kW in a few square centimetres is why every GPU sits under a liquid cold plate, and why packaging (CoWoS, HBM) and CPO are about <b>shortening wires</b>.</li></ul>' +

      '<h3>7 · The numbers in one place</h3>' +
      '<table class="table"><tr><td>Transistors per Blackwell GPU</td><td>208 billion ' + B('nv') + '</td></tr>' +
      '<tr><td>HBM3e</td><td>192 GB at 8 TB/s ' + B('nv') + '</td></tr>' +
      '<tr><td>NVLink per GPU</td><td>1.8 TB/s ' + B('nv') + '</td></tr>' +
      '<tr><td>Scale-out per GPU</td><td>400–800 Gb/s (50–100 GB/s) ' + B('typ') + '</td></tr>' +
      '<tr><td>NVL72 rack, FP4</td><td>~1.4 exaFLOPS (sparse) ' + B('nv') + '</td></tr></table>',
    mount(body) {
      body.querySelector('#afx-mem').innerHTML = logbars([
        ['Registers (all SMs)', 3e14, '~100s TB/s', 'var(--accent)', 'est'],
        ['L1 / shared memory', 1e14, '~100 TB/s', 'var(--accent)', 'est'],
        ['L2 cache', 3e13, '~10s TB/s', 'var(--accent2)', 'est'],
        ['HBM3e', 8e12, '8 TB/s', 'var(--violet)', 'nv'],
        ['NVLink (to rack)', 1.8e12, '1.8 TB/s', 'var(--accent)', 'nv'],
        ['Scale-out NIC', 1e11, '0.1 TB/s', 'var(--optic)', 'typ']]);
    }
  });

  // ================================================================ D · How AI jobs use the network
  CH.push({
    id: 'apx-traffic', short: 'How AI jobs use the network', title: 'How training and inference use the network',
    lead: 'Why the network sets the pace of training, how a big model is split over GPUs, what an all-reduce is, what inference traffic looks like, and why one slow link matters so much.',
    html:
      '<h3>1 · One training step</h3>' +
      '<div class="af-fig">' + svgTimeline() + '</div>' +
      '<p>Every step: <b>forward</b> (run a batch of data through the model), <b>backward</b> (work out how each weight should change, the "gradients"), <b>all-reduce</b> (average the gradients across all GPUs), <b>update</b> (change the weights). Good software starts sending gradients for the last layers while the first layers are still being computed, so communication <b>hides behind computation</b>. If the network is too slow, or one link is flaky, the hiding fails and thousands of GPUs sit idle.</p>' +

      '<h3>2 · Splitting a giant model across GPUs</h3>' +
      '<table class="table"><tr><th>Parallelism</th><th>What is split</th><th>Traffic</th><th>Usually runs on</th></tr>' +
      '<tr><td>Data parallel</td><td>Each group of GPUs holds a copy of the model and gets different data</td><td>All-reduce of gradients every step: large, periodic</td><td>Scale-out (CPO fabric)</td></tr>' +
      '<tr><td>Tensor parallel</td><td>Each layer\'s matrices are cut into pieces on different GPUs</td><td>Many small exchanges inside every layer, very latency-sensitive</td><td>NVLink (inside the rack)</td></tr>' +
      '<tr><td>Pipeline parallel</td><td>Different layers on different GPU groups, like an assembly line</td><td>Point-to-point hand-offs between stages</td><td>NVLink or scale-out</td></tr>' +
      '<tr><td>Expert parallel (MoE)</td><td>Different "experts" on different GPUs; each token visits a few</td><td>All-to-all: every GPU sends to every GPU</td><td>NVLink + scale-out</td></tr></table>' +
      '<p>Big training runs combine all of these ("3D/4D parallelism"). They are arranged so the chattiest kind (tensor parallel) stays inside an NVLink domain, and the kind that tolerates more delay (data parallel) crosses the CPO fabric.</p>' +

      '<h3>3 · The all-reduce, and how long it takes</h3>' +
      '<p><b>All-reduce</b> = every GPU starts with its own list of numbers and ends with the sum of everyone\'s lists. In the common <b>ring</b> algorithm, GPUs pass chunks around a ring, adding as they go. Each GPU sends about twice the data size no matter how many GPUs there are:</p>' +
      '<div class="eq">time ≈ 2 · (N−1)/N · S / B   ≈  2 · S / B     (S = data size, B = per-GPU bandwidth)</div>' +
      '<div class="af-mini"><div class="card" id="afx-ar-in"></div><div class="card" id="afx-ar-out"></div></div>' +
      '<p>With InfiniBand <b>SHARP</b>, the switches add the numbers themselves as data flows through. Each GPU then sends its data roughly once instead of twice ' + B('typ') + ', and fewer bytes cross the optics.</p>' +

      '<h3>4 · Inference traffic</h3>' +
      '<ul><li><b>Prefill vs decode:</b> reading the prompt (prefill) is compute-heavy; generating each new token (decode) is memory-bound. Large services run them on <b>different GPUs</b> ("disaggregated serving") and ship the conversation\'s <b>KV cache</b> over the network between them.</li>' +
      '<li><b>Mixture-of-experts</b> models send every token to a few experts that may live on other GPUs: all-to-all traffic with tight latency budgets.</li>' +
      '<li><b>Reasoning models</b> generate many more tokens per answer, which multiplies all of the above.</li>' +
      '<li>User requests and answers travel on the <b>front-end</b> network; GPU-to-GPU traffic on NVLink and the scale-out fabric.</li></ul>' +

      '<h3>5 · Why one slow link matters so much</h3>' +
      '<p>A synchronized step finishes when the <b>slowest</b> GPU finishes. Say each link has only a 0.01 % chance of misbehaving (retrying, flapping, congesting) during a given step. With many links, the chance that <i>at least one</i> misbehaves is:</p>' +
      '<div class="eq">P(step is slowed) = 1 − (1 − p)^L</div>' +
      '<div id="afx-strag"></div>' +
      '<p>That is why AI networks are judged on <b>tail behaviour</b> (the worst link and the worst microsecond), not the average. It is also why CPO\'s claims of <b>63× better signal integrity and 10× better resiliency</b> ' + B('nv') + ' matter as much as its power savings: cleaner signals mean fewer errors and retries, and fewer components mean fewer flaps.</p>' +

      '<h3>6 · Putting it all together</h3>' +
      '<p>The GPUs set how fast the factory <i>could</i> go. The network decides how much of that it <i>actually</i> achieves. CPO attacks the network\'s three biggest costs at once: <b>power per bit</b>, <b>component count per link</b> (reliability), and <b>radix per box</b> (fewer tiers). Those are the reasons NVIDIA is putting optics inside the switch package.</p>',
    mount(body) {
      const inEl = body.querySelector('#afx-ar-in'), outEl = body.querySelector('#afx-ar-out');
      const sz = C.h('input', { type: 'range', min: 1, max: 200, value: 20 }), szo = C.h('output');
      const bw = C.h('select', null, [[400, '400 Gb/s'], [800, '800 Gb/s'], [1600, '1.6 Tb/s']].map(([v, l]) => C.h('option', { value: v, selected: v === 800 }, l)));
      inEl.appendChild(C.h('h4', null, 'All-reduce time'));
      inEl.appendChild(C.h('div', { class: 'slider-row' }, C.h('label', null, 'Gradient data per GPU'), sz, szo));
      inEl.appendChild(C.h('div', { class: 'slider-row' }, C.h('label', null, 'Scale-out bandwidth per GPU'), bw, C.h('span')));
      function upd() {
        const S = +sz.value, B2 = +bw.value / 8; // GB/s
        szo.textContent = S + ' GB';
        const t = 2 * S / B2, tSharp = S / B2, tNv = 2 * S / 1800;
        const fx = (v, l, tag) => '<div class="af-fact"><b>' + v + '</b><span>' + l + ' ' + B(tag) + '</span></div>';
        outEl.innerHTML = '<div class="af-out">' + fx(t.toFixed(2) + ' s', 'ring all-reduce over the scale-out network', 'est') +
          fx(tSharp.toFixed(2) + ' s', 'with in-network reduction (≈ half the data)', 'est') + fx((tNv * 1000).toFixed(0) + ' ms', 'same data over NVLink (1.8 TB/s)', 'est') + '</div>' +
          '<p class="muted" style="margin:8px 0 0;font-size:13px">If a step\'s compute takes about this long or less, the network decides the step time unless the transfer is hidden behind computation.</p>';
      }
      sz.addEventListener('input', upd); bw.addEventListener('change', upd); upd();
      const rows = [100, 1000, 10000, 100000, 1000000].map(L => [L, 1 - Math.pow(1 - 1e-4, L)]);
      body.querySelector('#afx-strag').innerHTML = '<table class="table"><tr><th>Links in the job (L)</th><th>Chance a step is slowed (p = 0.01 %)</th></tr>' +
        rows.map(([L, P]) => '<tr><td>' + num(L) + '</td><td>' + (P * 100).toFixed(P < 0.1 ? 2 : 0) + ' %</td></tr>').join('') + '</table>';
    }
  });

  C.factoryAppendix = CH;
})();
