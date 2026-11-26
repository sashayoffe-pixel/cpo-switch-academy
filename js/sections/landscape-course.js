/* Industry Landscape course: why CPO now, interconnect options, the ecosystem, optics for scale-up,
   roadmaps and strategic talking points. Public information only. Uses js/course-engine.js. */
(function () {
  'use strict';
  const C = window.CPO;
  const h = C.h, B = C.badge, CE = C.course;

  C.addGlossary({
    'NPO': { full: 'Near-Packaged Optics', def: 'Optical engines placed on the board very close to the switch package (not on the package substrate itself), often with a short high-quality electrical link.', cat: 'optics' },
    'Optical I/O': { full: 'Optical I/O (chiplet)', def: 'Optical engines co-packaged with compute chips (GPUs, CPUs) rather than switches, for chip-to-chip optical links.', cat: 'optics' },
    'ELSFP': { full: 'External Laser Small Form-factor Pluggable', def: 'OIF implementation agreement for a front-panel pluggable external laser module for CPO.', cat: 'optics' }
  });

  function capChart() {
    const pts = [[2015, 3.2], [2017, 6.4], [2019, 12.8], [2021, 25.6], [2023, 51.2], [2025, 102.4], [2027, 204.8]];
    const X = y => 70 + (y - 2014) / 14 * 820, Y = v => 250 - Math.log2(v / 3.2) / 6 * 210;
    let s = '<svg viewBox="0 0 940 290" style="width:100%;height:auto;background:#05070a;border:1px solid var(--line);border-radius:12px"><text x="16" y="22" fill="#e6edf5" font-size="13" font-weight="700">switch-chip bandwidth roughly doubles every ~2 years (Tb/s, log scale; approximate industry trend)</text>';
    [3.2, 12.8, 51.2, 204.8].forEach(v => { s += '<line x1="70" y1="' + Y(v) + '" x2="890" y2="' + Y(v) + '" stroke="#243042" stroke-dasharray="2 4"/><text x="62" y="' + (Y(v) + 4) + '" text-anchor="end" fill="#8a99ad" font-size="11">' + v + '</text>'; });
    s += '<path d="' + pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]) + ' ' + Y(p[1])).join(' ') + '" fill="none" stroke="#76b900" stroke-width="3"/>';
    pts.forEach(([y, v]) => { s += '<circle cx="' + X(y) + '" cy="' + Y(v) + '" r="5" fill="' + (y >= 2025 ? '#ff6b3d' : '#76b900') + '"/><text x="' + X(y) + '" y="275" text-anchor="middle" fill="#8a99ad" font-size="11">' + y + '</text>'; });
    s += '<text x="' + X(2025) + '" y="' + (Y(102.4) - 12) + '" text-anchor="middle" fill="#ff6b3d" font-size="12">CPO switches arrive</text>';
    return s + '</svg>';
  }

  function optionsSvg() {
    const rows = [['Pluggable (DSP)', 'ASIC → long board trace → module with DSP + lasers', 0.95, '#8a99ad'], ['LPO / LRO (linear pluggable)', 'no DSP (or Rx-only DSP): host SerDes drives the optics directly', 0.7, '#22d3ee'], ['NPO (near-packaged)', 'engines on the board next to the package; short link', 0.5, '#a78bfa'], ['CPO (co-packaged)', 'engines on the package substrate; mm link; external lasers', 0.3, '#ff6b3d'], ['Optical I/O on compute', 'optics co-packaged with GPUs/CPUs themselves', 0.25, '#76b900']];
    let s = '<svg viewBox="0 0 940 300" style="width:100%;height:auto;background:#05070a;border:1px solid var(--line);border-radius:12px"><text x="16" y="22" fill="#e6edf5" font-size="13" font-weight="700">how far the electrical signal travels before becoming light (shorter = less power, harder to service)</text>';
    rows.forEach(([n, d, len, c], i) => { const y = 46 + i * 50; s += '<text x="16" y="' + (y + 18) + '" fill="' + c + '" font-size="13" font-weight="700">' + n + '</text><rect x="250" y="' + (y + 4) + '" width="40" height="22" rx="4" fill="#1b2a10" stroke="#76b900"/><line x1="290" y1="' + (y + 15) + '" x2="' + (290 + len * 300) + '" y2="' + (y + 15) + '" stroke="#d08a4a" stroke-width="4"/><rect x="' + (290 + len * 300) + '" y="' + (y + 4) + '" width="34" height="22" rx="4" fill="#1d0e08" stroke="' + c + '"/><text x="' + (290 + len * 300 + 44) + '" y="' + (y + 19) + '" fill="#c9d4e0" font-size="11.5">' + d + '</text>'; });
    return s + '</svg>';
  }

  CE.register({
    id: 'landscape', title: 'Industry Landscape', icon: '🗺️', order: 9.85, storeKey: 'ls-last-step',
    finish: { go: 'interview', label: 'Continue: Interview & Practice →' },
    pages: [
      CE.startPage({ eyebrow: 'Guided course · about 30 minutes', title: 'The <em>CPO industry landscape</em>: options, players, roadmaps',
        intro: 'To contribute in strategy and design discussions you need the bigger picture: why CPO is arriving now, which alternatives compete with it, who is in the ecosystem, where optics are heading next (scale-up, higher lane rates), and the arguments for and against. Just press <b>Next</b>.',
        analogy: [['📈', 'Why now', 'bandwidth doubles, power doesn\'t'], ['⚖️', 'Options', 'pluggable · LPO · NPO · CPO'], ['🤝', 'Ecosystem', 'many partners, one system'], ['🔭', 'Next', 'scale-up optics, 400G lanes']],
        route: ['Why CPO now: the bandwidth and power wall.', 'The options compared.', 'The ecosystem and standards.', 'Optics for scale-up (beyond the rack).', 'Roadmap trends and what they mean for you.', 'Strategic talking points.'],
        note: 'Company and product mentions are limited to public announcements as of this writing; markets move fast, so check current status before quoting them.' }),
      CE.page('ls-why', 'Why CPO now', 'Landscape', 'Why CPO now: the bandwidth and power wall', null, p => {
        p.appendChild(h('div', { class: 'card', html: capChart() }));
        p.appendChild(h('div', { class: 'grid3', html:
          '<div class="card"><h4 style="margin:0 0 6px;color:var(--accent)">Bandwidth keeps doubling</h4><p style="margin:0">Each switch-chip generation roughly doubles total bandwidth, by doubling the lane rate (100G → 200G → 400G per lane) and/or the lane count.</p></div>' +
          '<div class="card"><h4 style="margin:0 0 6px;color:var(--warn)">The electrical channel gets harder</h4><p style="margin:0">Every lane-rate doubling roughly doubles the Nyquist frequency, and board loss grows with frequency. Driving 20–30 cm of board becomes ever more power-hungry (see the Electronics course).</p></div>' +
          '<div class="card"><h4 style="margin:0 0 6px;color:var(--bad)">Power and reliability walls</h4><p style="margin:0">With pluggables, optics can become a large share of switch and network power, and millions of transceivers mean millions of failure points. AI factories feel both directly.</p></div>' }));
        p.appendChild(h('div', { class: 'af-plain', html: '<b>The argument in one sentence:</b> as bandwidth keeps doubling, the cheapest place to turn electrons into photons moves closer and closer to the switch chip, and CPO is the step where it reaches the package.' }));
      }),
      CE.page('ls-options', 'The options compared', 'Landscape', 'The options: pluggable, LPO, NPO, CPO, optical I/O', 'All aim to cut power per bit; they differ in how close the optics sit to the chip and what that does to serviceability and interoperability.', p => {
        p.appendChild(h('div', { class: 'card', html: optionsSvg() }));
        p.appendChild(h('table', { class: 'table', style: 'margin-top:12px', html: '<tr><th>Option</th><th>Power per bit</th><th>Serviceability</th><th>Interoperability</th><th>Maturity</th><th>Main risk</th></tr>' +
          '<tr><td><b>Pluggable with DSP</b></td><td>highest (~15–20 pJ/b) ' + B('typ') + '</td><td>excellent: swap per port</td><td>excellent, multi-vendor</td><td>mature, huge volume</td><td>power and cost at high speed</td></tr>' +
          '<tr><td><b>LPO / LRO</b></td><td>lower (no or partial DSP)</td><td>excellent</td><td>harder: host SerDes + optics must be co-designed and tested together</td><td>emerging</td><td>link margin, interop across vendors</td></tr>' +
          '<tr><td><b>NPO</b></td><td>lower</td><td>moderate (board-level modules)</td><td>vendor-specific</td><td>niche / transitional</td><td>board real estate, still an electrical link</td></tr>' +
          '<tr><td><b>CPO</b></td><td>lowest for switches (~5 pJ/b) ' + B('typ') + '; 3.5× claim ' + B('nv') + '</td><td>engines fixed; lasers & fibers serviceable</td><td>standard optical interface at the fiber; system is vendor-integrated</td><td>first products shipping ' + B('nv') + '</td><td>reliability of co-packaged parts, manufacturing yield, ecosystem maturity</td></tr>' +
          '<tr><td><b>Optical I/O on compute</b></td><td>very low per bit, very high density</td><td>fixed to the compute package</td><td>mostly proprietary today</td><td>research → early products</td><td>cost, reliability, thermal near hot GPUs</td></tr>' }));
        p.appendChild(h('div', { class: 'callout', html: 'There isn\'t one winner: different link types will use different options for years (e.g. pluggables or LPO at the NIC end, CPO in the switch). As system engineer you should be able to argue the trade-offs for each link in the fabric.' }));
      }),
      CE.page('ls-eco', 'Ecosystem & standards', 'Landscape', 'The ecosystem and standards', null, p => {
        p.appendChild(h('div', { class: 'grid2', html:
          '<div class="card"><h3 style="margin-top:0">Systems & switch silicon (public examples)</h3><ul><li><b>NVIDIA</b>: Quantum-X Photonics (InfiniBand) and Spectrum-X Photonics (Ethernet) CPO switches, announced at GTC 2025 ' + B('nv') + '.</li><li><b>Broadcom</b>: has publicly demonstrated and announced CPO versions of its Tomahawk Ethernet switch families.</li><li>Other switch and system vendors and hyperscalers are evaluating or developing CPO, NPO and LPO.</li></ul></div>' +
          '<div class="card"><h3 style="margin-top:0">Optical I/O & photonics startups (examples)</h3><ul><li><b>Ayar Labs</b>: optical I/O chiplets and external laser sources.</li><li><b>Lightmatter</b>: photonic interconnect platforms.</li><li><b>Celestial AI</b>: photonic fabric for compute and memory.</li><li>Many others in lasers, couplers, fiber attach and test equipment.</li></ul></div>' +
          '<div class="card"><h3 style="margin-top:0">Components & manufacturing</h3><ul><li>Foundry & 3D packaging (e.g. TSMC COUPE / SoIC for NVIDIA\'s engines ' + B('nv') + ').</li><li>Lasers & optical components (e.g. Coherent, Lumentum ' + B('nv') + ' partners).</li><li>Fiber & connectors (e.g. Corning, SENKO, Sumitomo Electric ' + B('nv') + ' partners).</li><li>Assembly & test (e.g. Fabrinet, Foxconn, SPIL ' + B('nv') + ' partners).</li></ul></div>' +
          '<div class="card"><h3 style="margin-top:0">Standards & consortia</h3><ul><li><b>OIF</b>: CPO frameworks, external laser (ELSFP) agreements, electrical interfaces (CEI), CMIS.</li><li><b>IEEE 802.3</b>: Ethernet physical layers (200G/lane, 1.6T in progress).</li><li><b>IBTA</b>: InfiniBand.</li><li><b>UEC</b>: Ultra Ethernet for AI/HPC transport; <b>UALink</b>: scale-up.</li><li><b>OCP</b>: open rack, power and management specs.</li></ul></div>' }));
        p.appendChild(h('div', { class: 'callout warn', html: 'This list is illustrative and based on public announcements; it is not exhaustive and not an endorsement. Partnerships and product status change quickly, so verify before quoting.' }));
      }),
      CE.page('ls-scaleup', 'Optics for scale-up', 'Landscape', 'The next frontier: optics for scale-up', 'Today NVLink inside the rack is copper. What happens when the scale-up domain grows beyond a rack?', p => {
        p.appendChild(h('div', { class: 'grid2', html:
          '<div class="card"><h3 style="margin-top:0">Why it is attractive</h3><ul><li>Bigger NVLink-style domains (more GPUs acting as one) need longer reach than copper allows at very high speeds.</li><li>Optics decouple bandwidth from distance and cable bulk.</li><li>Optical I/O directly on GPU packages could give enormous bandwidth per mm of chip edge.</li></ul></div>' +
          '<div class="card"><h3 style="margin-top:0">Why it is hard</h3><ul><li><b>Power per bit</b> must be lower than for scale-out, because scale-up bandwidth per GPU is ~10–20× higher.</li><li><b>Latency</b>: memory-semantic traffic is latency-sensitive; no room for heavy FEC or retimers.</li><li><b>Reliability</b>: a GPU-attached optical failure takes out a GPU; FIT targets are strict.</li><li><b>Thermal</b>: GPUs are even hotter than switches, with the same ring-sensitivity problem.</li><li><b>Cost</b> per bit must compete with copper.</li></ul></div>' }));
        p.appendChild(h('div', { class: 'af-plain', html: '<b>Why it matters to you:</b> the problems you are learning for CPO switches (thermal crosstalk, laser reliability, fiber-attach stability, test strategy, telemetry) are exactly the ones optical scale-up will face, with even tighter budgets. Experience with CPO switches is the foundation for that next step.' }));
      }),
      CE.page('ls-roadmap', 'Roadmap trends', 'Landscape', 'Roadmap trends and what they mean for a system engineer', null, p => {
        p.appendChild(h('table', { class: 'table', html: '<tr><th>Trend</th><th>Direction</th><th>What it does to your budgets</th></tr>' +
          '<tr><td><b>Lane rate</b></td><td>200G → 400G per lane</td><td>smaller eye and SNR margin; higher modulator and detector bandwidth; FEC and DSP choices matter more</td></tr>' +
          '<tr><td><b>Port speed</b></td><td>800G → 1.6T → 3.2T</td><td>more lanes or wavelengths per port; fiber count vs WDM trade-off</td></tr>' +
          '<tr><td><b>Wavelengths per fiber</b></td><td>more WDM channels</td><td>tighter wavelength control, crosstalk budgets, laser count/power per fiber</td></tr>' +
          '<tr><td><b>External lasers</b></td><td>standardized pluggable laser modules (e.g. OIF ELSFP)</td><td>multi-source lasers; interface specs for power, wavelength, safety, management</td></tr>' +
          '<tr><td><b>Radix</b></td><td>more ports per switch</td><td>flatter networks; more engines per package → yield and thermal pressure</td></tr>' +
          '<tr><td><b>Cooling</b></td><td>liquid everywhere; warmer water; two-phase options</td><td>coolant temperature vs ring/laser margins; condensation and leak management</td></tr>' +
          '<tr><td><b>Packaging</b></td><td>larger substrates, glass substrates, more 3D stacking</td><td>warpage, fiber-attach stability, KGD test strategy</td></tr>' +
          '<tr><td><b>Telemetry & AI ops</b></td><td>fleet analytics, predictive maintenance</td><td>more monitors per lane and laser; data pipelines as part of the product</td></tr>' }));
        p.appendChild(h('div', { class: 'callout', html: 'Directions are industry-typical ' + B('typ') + '; timing depends on each vendor\'s roadmap.' }));
      }),
      CE.page('ls-talk', 'Strategic talking points', 'Landscape', 'Talking points for strategy discussions', 'Questions you are likely to hear, with the shape of a good answer.', p => {
        const qa = [['"Why not just use LPO? It\'s pluggable and lower power."', 'LPO removes the DSP but keeps the long host electrical channel and the per-port lasers. At 200G+ per lane that channel is very hard to close across vendors. CPO removes the channel itself and shares lasers. LPO is a good fit for some links (e.g. shorter, controlled environments); CPO wins where power density, signal integrity and laser count dominate, as in large AI switches.'], ['"Isn\'t CPO a serviceability risk?"', 'The parts most likely to fail (lasers) are external and front-panel replaceable; fibers are detachable. The co-packaged engines must be designed and screened for the switch\'s life, and fewer components per link mean fewer failures overall (10× resiliency claim ' + B('nv') + '). The right metric is fleet goodput, not "can I swap one port".'], ['"Does CPO lock customers into one vendor?"', 'The fiber interface is standard optics, so the far end can be standard NICs or pluggables. The switch itself is an integrated system, like any switch. Standards work (OIF frameworks, ELSFP, CMIS) is reducing lock-in at the component level.'], ['"What will limit the next generation?"', 'Likely thermal (rings next to an even hotter ASIC), laser power and efficiency at more wavelengths, fiber-attach density and stability, and test cost. Each is a system trade-off between thermal, optical, mechanical and manufacturing budgets.'], ['"Where does CPO go after switches?"', 'Toward compute: optical I/O for scale-up domains beyond the rack. Same physics, tighter budgets (power, latency, reliability).']];
        qa.forEach(([q, a]) => p.appendChild(h('details', { class: 'card', style: 'margin:8px 0' }, h('summary', { style: 'cursor:pointer;font-weight:700;color:var(--text)' }, q), h('div', { style: 'margin-top:8px;color:#c9d4e0', html: a }))));
      }),
      CE.donePage({ title: 'You can place CPO in the <em>bigger picture</em>', takeaways: [
        'Bandwidth doubles every generation while channel loss and power don\'t scale: the conversion point moves toward the chip.',
        'Pluggable, LPO/LRO, NPO, CPO and optical I/O <b>coexist</b>; each link type has its best fit.',
        'CPO is an <b>ecosystem</b> product: foundry, lasers, fiber, connectors, assembly and standards bodies.',
        '<b>Scale-up optics</b> is the next frontier, with the same physics and tighter budgets.',
        'Roadmap trends (400G lanes, more wavelengths, warmer coolant, bigger packages) each squeeze a specific budget you own.'],
        next: [['Continue: Interview & Practice →', 'interview'], ['Networking & Protocols', 'net-course']],
        warn: 'Public information only; company and product statements may change. Verify before external use.' })
    ]
  });
})();
