/* Requirements & V&V workshop: good requirements, hierarchy, interfaces (N²), verification matrix, FMEA,
   trade studies and review gates, all applied to a CPO switch. Interactive. Uses js/course-engine.js. */
(function () {
  'use strict';
  const C = window.CPO;
  const h = C.h, B = C.badge, CE = C.course;

  C.addGlossary({
    'V&V': { full: 'Verification & Validation', def: 'Verification: did we build it right (meets the requirements)? Validation: did we build the right thing (meets the customer\'s need)?', cat: 'test' },
    'ICD': { full: 'Interface Control Document', def: 'The agreed specification of an interface between two subsystems or suppliers.', cat: 'general' },
    'RPN': { full: 'Risk Priority Number', def: 'FMEA score = Severity × Occurrence × Detection (each 1–10); higher means act first.', cat: 'test' },
    'SRR': { full: 'System Requirements Review', def: 'Review gate confirming the requirements are complete and agreed.', cat: 'general' },
    'PDR': { full: 'Preliminary Design Review', def: 'Review gate for the architecture and preliminary design.', cat: 'general' },
    'CDR': { full: 'Critical Design Review', def: 'Review gate confirming the detailed design is ready to build.', cat: 'general' },
    'N² diagram': { full: 'N-squared diagram', def: 'Matrix with subsystems on the diagonal and interfaces in the off-diagonal cells.', cat: 'general' }
  });

  // ---------------- 1 · good requirements exercise
  const EX = [
    { bad: 'The switch shall have low power consumption.', opts: ['The switch shall consume less power than competitors.', 'The switch, with all 144 ports at 800 Gb/s line rate and 35 °C coolant inlet, shall consume ≤ X W measured at the 54 V input.', 'The switch shall be as power efficient as possible.'], ok: 1, why: 'Measurable value, defined conditions (traffic, coolant temperature) and a measurement point. "Low", "competitors" and "as possible" cannot be verified.' },
    { bad: 'The optics shall be reliable and easy to service.', opts: ['Each external laser source shall be replaceable from the front panel in ≤ 5 minutes without powering down the switch. (separate requirement for reliability)', 'The optics shall be very reliable and easy to service.', 'Optics shall not fail.'], ok: 0, why: 'One requirement per statement (singular), with a measurable service time and condition. Reliability gets its own requirement with a FIT or failure-rate target.' },
    { bad: 'The link shall work with any fiber.', opts: ['The link shall work with most fibers.', 'Each 800G port shall achieve pre-FEC BER ≤ 2.4e-4 over single-mode fiber (OS2) up to 500 m with up to N connectors of ≤ 0.5 dB each.', 'The link shall support long fibers.'], ok: 1, why: 'Defines the fiber type, length, connectors and the pass criterion. "Any fiber" is not feasible and not verifiable.' },
    { bad: 'The ring heaters should not use too much power.', opts: ['Total ring-heater power shall be ≤ Y W per switch at the worst-case thermal condition (max coolant temperature, full traffic), averaged over 1 minute.', 'Heaters should use minimal power.', 'The heaters shall be efficient.'], ok: 0, why: '"Shall" (mandatory) instead of "should", a number, and the worst-case condition it applies to.' },
    { bad: 'The firmware shall handle errors gracefully.', opts: ['The firmware shall be robust.', 'On loss of ring lock on a lane, firmware shall attempt re-lock within 100 ms, report the event in telemetry within 1 s, and declare the lane down after 3 failed attempts.', 'The firmware shall handle all errors.'], ok: 1, why: 'Turns "gracefully" into observable, testable behaviour: timing, reporting and the end state.' },
    { bad: 'The switch shall operate at all temperatures.', opts: ['The switch shall meet all performance requirements with coolant inlet temperature between A and B °C and flow ≥ F L/min.', 'The switch shall operate in hot and cold conditions.', 'The switch shall not overheat.'], ok: 0, why: 'States the environmental range as conditions under which the other requirements apply. "All temperatures" is impossible.' }
  ];
  function pGood(p) {
    p.appendChild(h('div', { class: 'grid2', html:
      '<div class="card"><h3 style="margin-top:0">A good requirement is…</h3><ul><li><b>Necessary</b>: traces to a real need.</li><li><b>Unambiguous</b>: one interpretation only.</li><li><b>Verifiable</b>: you can prove it with a test, analysis, inspection or demonstration.</li><li><b>Singular</b>: one requirement per statement.</li><li><b>Feasible</b>: achievable within physics and budget.</li><li><b>Complete</b>: states conditions (temperature, traffic, age) and units.</li><li><b>Traceable</b>: has an ID, a parent and a verification method.</li></ul></div>' +
      '<div class="card"><h3 style="margin-top:0">Words that signal trouble</h3><p>"low", "high", "fast", "reliable", "user-friendly", "as possible", "should", "etc.", "and/or", "all", "any", "support".</p><p class="muted">Template:</p><div class="eq">[ID] The [system/item] shall [action/quality] [measurable value + unit]\n     under [conditions], as verified by [method].</div></div>' }));
    p.appendChild(h('h3', null, 'Exercise: pick the best rewrite'));
    let score = 0; const sc = h('div', { class: 'callout' }); const answered = new Set();
    EX.forEach((e, i) => {
      const fb = h('div', { class: 'cs-fb' }); const opts = h('div', { class: 'cs-opts', style: 'grid-template-columns:1fr' });
      e.opts.forEach((o, j) => { const b = h('button', { class: 'btn cs-opt', onclick: () => { [...opts.children].forEach(x => x.classList.remove('picked', 'right', 'wrong')); b.classList.add('picked', j === e.ok ? 'right' : 'wrong'); fb.className = 'cs-fb callout' + (j === e.ok ? '' : ' warn'); fb.innerHTML = (j === e.ok ? '✅ ' : '❌ ') + e.why; if (j === e.ok && !answered.has(i)) { answered.add(i); score++; } sc.innerHTML = 'Score: <b>' + score + ' / ' + EX.length + '</b>' + (score === EX.length ? ' 🎉 you can spot a verifiable requirement.' : ''); } }, o); opts.appendChild(b); });
      p.appendChild(h('div', { class: 'card', style: 'margin:10px 0' }, h('div', { html: '<b>' + (i + 1) + '. Bad:</b> <i>"' + e.bad + '"</i>' }), opts, fb));
    });
    sc.innerHTML = 'Score: <b>0 / ' + EX.length + '</b>'; p.appendChild(sc);
  }

  // ---------------- 2 · hierarchy
  const TREE = { n: 'Customer need: train large models faster, cheaper, without interruptions', c: [
    { n: 'SYS-1 Port capacity: 144 × 800 Gb/s, standards-compliant at the far end', m: 'Test', c: [{ n: 'OPT-1 Per-lane pre-FEC BER ≤ 2.4e-4 over the specified channel', m: 'Test', c: [{ n: 'ENG-1 Engine OMA, ER and Rx sensitivity per lane (engine spec)', m: 'Test (engine)' }, { n: 'LAS-1 Laser output power per output, end of life', m: 'Test + analysis' }] }, { n: 'ELE-1 ASIC↔engine electrical channel loss ≤ budget', m: 'Analysis + test' }] },
    { n: 'SYS-2 Power: ≤ X W at full load, worst-case coolant', m: 'Test', c: [{ n: 'PWR-1 Optics energy ≤ Y pJ/bit', m: 'Test' }, { n: 'PWR-2 Total ring-heater power ≤ Z W worst case', m: 'Analysis + test' }, { n: 'PWR-3 Conversion efficiency per stage ≥ η', m: 'Test' }] },
    { n: 'SYS-3 Reliability: link interruption rate ≤ R per 1,000 links per month', m: 'Analysis (FIT) + field data', c: [{ n: 'REL-1 Laser FIT and wear-out at use temperature', m: 'Analysis + life test' }, { n: 'REL-2 Fiber-attach loss change ≤ Δ dB after N thermal cycles', m: 'Test' }] },
    { n: 'SYS-4 Thermal: all limits met at coolant A–B °C, flow ≥ F', m: 'Test + analysis', c: [{ n: 'THM-1 Ring temperature swing ≤ ΔT over full load step', m: 'Test' }, { n: 'THM-2 ASIC Tj ≤ limit with end-of-life TIM', m: 'Analysis + test' }] },
    { n: 'SYS-5 Serviceability: lasers replaceable from front panel, hot-swap', m: 'Demonstration', c: [{ n: 'MEC-1 ELS insertion force, keying, latching', m: 'Inspection + test' }] },
    { n: 'SYS-6 Manageability & security: telemetry, signed updates, secure boot', m: 'Test + inspection', c: [{ n: 'FW-1 Telemetry list, rates and thresholds per ICD', m: 'Test' }, { n: 'FW-2 All device firmware signed and updatable with rollback', m: 'Test + demonstration' }] }] };
  function pTree(p) {
    const box = h('div', { class: 'card' });
    function node(t, depth) {
      const kids = t.c || [];
      const row = h('div', { style: 'margin-left:' + depth * 22 + 'px;padding:6px 8px;border-left:2px solid ' + ['var(--accent)', 'var(--accent2)', 'var(--violet)', 'var(--optic)'][depth % 4] + ';margin-top:4px;background:var(--panel2);border-radius:0 8px 8px 0;cursor:' + (kids.length ? 'pointer' : 'default') });
      const kidsBox = h('div');
      row.appendChild(h('span', { html: (kids.length ? '▾ ' : '• ') + '<b>' + t.n.split(' ')[0] + '</b> ' + t.n.split(' ').slice(1).join(' ') + (t.m ? ' <span class="pill" style="margin-left:6px">verify: ' + t.m + '</span>' : '') }));
      row.addEventListener('click', e => { e.stopPropagation(); if (!kids.length) return; kidsBox.style.display = kidsBox.style.display === 'none' ? '' : 'none'; row.firstChild.innerHTML = row.firstChild.innerHTML.replace(/^[▾▸]/, kidsBox.style.display === 'none' ? '▸' : '▾'); });
      const wrap = h('div', null, row, kidsBox); kids.forEach(k => kidsBox.appendChild(node(k, depth + 1))); return wrap;
    }
    box.appendChild(node(TREE, 0)); p.appendChild(box);
    p.appendChild(h('div', { class: 'callout', html: 'Every requirement has an <b>ID</b>, a <b>parent</b> (why it exists), <b>children</b> (how it is achieved) and a <b>verification method</b>. If a child changes, you can see which system promise is affected: that is <b>traceability</b>. Values X, Y, Z are placeholders for your real numbers.' }));
  }

  // ---------------- 3 · N² interfaces
  const SUBS = ['Switch ASIC', 'Optical engines', 'Ext. lasers', 'Fiber & front panel', 'Power', 'Thermal / cooling', 'Mgmt & firmware'];
  const IFC = {
    '0-1': 'Electrical: 200G lanes, channel loss, equalization presets, lane mapping', '1-0': 'Received data lanes; link status',
    '2-1': 'Optical: CW power per output, wavelength, RIN, polarization; fiber connectors', '1-2': 'Feedback: power monitors, lock status (via firmware)',
    '1-3': 'Optical: modulated light, fiber attach, coupling loss, polarity', '3-1': 'Received light; contamination & handling risks',
    '4-0': 'Core rails: V, I, ripple, transient response', '4-1': 'Driver/TIA/heater rails: low-noise limits, sequencing', '4-2': 'Laser module power, hot-swap behaviour',
    '0-5': 'Heat: power map, Tj limit, TIM/lid interface', '1-5': 'Heat + temperature sensitivity of rings; max dT/dt', '2-5': 'Laser case temperature limits', '5-1': 'Thermal crosstalk from ASIC; coolant ordering',
    '6-1': 'Registers/CMIS-like pages, calibration data, state machine, firmware updates', '6-2': 'Laser control and telemetry, interlocks', '6-4': 'PMBus telemetry and control, sequencing', '6-5': 'Fan/pump control, temperature telemetry, throttling', '6-0': 'PCIe: SDK, counters, FEC statistics', '0-6': 'Interrupts, counters, telemetry stream',
    '3-6': 'Port presence, mapping, labels', '5-6': 'Temperatures, flow, leak detection'
  };
  function pN2(p) {
    const info = h('div', { class: 'callout' }, 'Click a cell to see what flows across that interface (row → column).');
    const tbl = h('table', { class: 'table', style: 'text-align:center;font-size:12.5px' });
    SUBS.forEach((r, i) => {
      const tr = h('tr');
      SUBS.forEach((c2, j) => {
        if (i === j) { tr.appendChild(h('td', { style: 'background:rgba(118,185,0,.18);font-weight:700;color:var(--text)' }, r)); return; }
        const k = i + '-' + j, has = IFC[k];
        const td = h('td', { style: 'cursor:' + (has ? 'pointer' : 'default') + ';background:' + (has ? 'rgba(34,211,238,.10)' : 'transparent') + ';color:' + (has ? 'var(--accent2)' : 'var(--muted)') }, has ? '●' : '');
        if (has) td.addEventListener('click', () => { info.innerHTML = '<b>' + SUBS[i] + ' → ' + SUBS[j] + ':</b> ' + IFC[k]; C.linkify(info); tbl.querySelectorAll('td').forEach(x => x.style.outline = ''); td.style.outline = '2px solid var(--accent)'; });
        tr.appendChild(td);
      });
      tbl.appendChild(tr);
    });
    p.appendChild(h('div', { class: 'card' }, tbl, info));
    p.appendChild(h('div', { class: 'grid2', html:
      '<div class="card"><h3 style="margin-top:0">Reading an N² diagram</h3><p>Subsystems sit on the diagonal. A dot in row A, column B means "A provides something to B". Rows with many dots are big suppliers; columns with many dots are big consumers. Empty cells that <i>should</i> have something are where integration surprises come from.</p></div>' +
      '<div class="card"><h3 style="margin-top:0">Each dot becomes an ICD</h3><p>An Interface Control Document defines what crosses the interface: signals, power, light, heat, data, mechanical fit, timing, tolerances, test methods, and who owns each side. In CPO, the optical-engine ICDs (to ASIC, lasers, fiber, power, thermal and firmware) are among the most complex.</p></div>' }));
  }

  // ---------------- 4 · verification matrix
  const VREQ = [['Per-lane pre-FEC BER ≤ 2.4e-4 over the specified channel', 'Test', 'System'], ['Ring resonance within tuning range across wafers', 'Test', 'Wafer'], ['Laser output power at end of life ≥ P', 'Analysis', 'Component'], ['ELS replaceable from front panel in ≤ 5 min', 'Demonstration', 'System'], ['Fiber connector keying prevents wrong insertion', 'Inspection', 'Component'], ['Engine energy ≤ Y pJ/bit', 'Test', 'Engine'], ['Link interruption rate ≤ R per 1k links/month', 'Analysis', 'Field'], ['Ring temperature swing ≤ ΔT on full load step', 'Test', 'System'], ['All device firmware signed', 'Inspection', 'System'], ['ASIC Tj ≤ limit with end-of-life TIM', 'Analysis', 'Package']];
  function pVV(p) {
    p.appendChild(h('div', { class: 'card', html: '<svg viewBox="0 0 1000 250" style="width:100%;height:auto"><path d="M60 40 L400 210 L600 210 L940 40" fill="none" stroke="#3b4a5e" stroke-width="3"/>' +
      [['Stakeholder needs', 60, 40], ['System requirements', 150, 85], ['Subsystem design', 240, 130], ['Component design', 330, 175]].map(([t, x, y]) => '<rect x="' + (x - 70) + '" y="' + (y - 16) + '" width="150" height="30" rx="8" fill="#111720" stroke="#22d3ee"/><text x="' + (x + 5) + '" y="' + (y + 4) + '" text-anchor="middle" fill="#e6edf5" font-size="12">' + t + '</text>').join('') +
      [['Validation (customer use)', 940, 40], ['System verification', 850, 85], ['Subsystem verification', 760, 130], ['Component verification', 670, 175]].map(([t, x, y]) => '<rect x="' + (x - 85) + '" y="' + (y - 16) + '" width="170" height="30" rx="8" fill="#111720" stroke="#76b900"/><text x="' + x + '" y="' + (y + 4) + '" text-anchor="middle" fill="#e6edf5" font-size="12">' + t + '</text>').join('') +
      '<text x="500" y="235" text-anchor="middle" fill="#8a99ad" font-size="12">build & integrate</text>' + [40, 85, 130, 175].map(y => '<line x1="' + (240 + (y - 40) * 0) + '" y1="' + y + '" x2="' + (760) + '" y2="' + y + '" stroke="#243042" stroke-dasharray="4 6"/>').join('') + '<text x="500" y="30" text-anchor="middle" fill="#8a99ad" font-size="12">each level on the left is verified by the matching level on the right</text></svg>' }));
    p.appendChild(h('div', { class: 'grid2', html: '<div class="card"><h3 style="margin-top:0">Four verification methods</h3><ul><li><b>Test</b>: measure it under defined conditions.</li><li><b>Analysis</b>: calculation, simulation or statistics (when testing is impossible or too long, e.g. 10-year life).</li><li><b>Inspection</b>: look at it, measure dimensions, check documents and code.</li><li><b>Demonstration</b>: show it works in use, pass/fail without detailed measurement.</li></ul></div><div class="card"><h3 style="margin-top:0">Exercise</h3><p>For each requirement below, choose the <b>method</b> and the <b>stage</b> where it is best verified, then press "Compare".</p></div>' }));
    const sels = [];
    const tbl = h('table', { class: 'table' }, h('tr', null, h('th', null, 'Requirement'), h('th', null, 'Method'), h('th', null, 'Stage'), h('th', null, 'Suggested')));
    VREQ.forEach(([r, m, s2]) => {
      const ms = h('select', null, ['—', 'Test', 'Analysis', 'Inspection', 'Demonstration'].map(x => h('option', { value: x }, x)));
      const ss = h('select', null, ['—', 'Wafer', 'Component', 'Engine', 'Package', 'System', 'Field'].map(x => h('option', { value: x }, x)));
      const sug = h('td', { class: 'muted' }); sels.push([ms, ss, sug, m, s2]);
      tbl.appendChild(h('tr', null, h('td', null, r), h('td', null, ms), h('td', null, ss), sug));
    });
    const res = h('div', { class: 'callout' }, 'Fill in your choices, then compare.');
    p.appendChild(h('div', { class: 'card' }, tbl, h('button', { class: 'btn primary', style: 'margin-top:10px', onclick: () => {
      let ok = 0; sels.forEach(([ms, ss, sug, m, s2]) => { const a = ms.value === m, b = ss.value === s2; if (a) ok++; if (b) ok++; sug.innerHTML = '<span style="color:' + (a ? 'var(--accent)' : 'var(--warn)') + '">' + m + '</span> · <span style="color:' + (b ? 'var(--accent)' : 'var(--warn)') + '">' + s2 + '</span>'; });
      res.innerHTML = '<b>' + ok + ' / ' + sels.length * 2 + '</b> matches with the suggestion. Often there is more than one sensible answer (e.g. test at the engine <i>and</i> at the system). What matters is that every requirement has at least one planned, owned verification. A requirement with no method is a risk.';
    } }, 'Compare with suggested answers'), res));
  }

  // ---------------- 5 · FMEA
  const FM = [['Laser output degrades (aging)', 'BER rises on all lanes of that laser', 7, 6, 4, 'Drive-current trend alarm; front-panel replacement'], ['Dirty connector after maintenance', 'One port near FEC limit / down', 6, 7, 3, 'Inspect-before-connect; Rx-power baseline alarm'], ['Ring lock lost on load step', 'Burst errors, link flap', 7, 5, 5, 'Feed-forward heater control; load-step test'], ['Fiber-attach shift over thermal cycles', 'Slow loss increase on an engine', 8, 3, 6, 'Adhesive qualification; cycling test with loss tracking'], ['WDM crosstalk from lot variation', 'BER worse with all lanes active', 6, 4, 6, 'All-lanes-active incoming test'], ['VRM ripple on driver/TIA rail', 'Periodic jitter, BER vs load', 6, 3, 6, 'Ripple spec at all loads; BER-vs-load regression'], ['I2C bus hang', 'Optics reported missing, no telemetry', 5, 4, 4, 'Bus segmentation, timeouts, reset lines'], ['Coolant flow loss', 'Overheating, shutdown', 9, 2, 3, 'Flow sensors, throttling, redundant pumps'], ['Firmware update interrupted', 'Device bricked', 8, 2, 5, 'A/B banks, verified boot, rollback'], ['Wrong laser module inserted', 'Wrong wavelength, links fail', 5, 3, 3, 'Mechanical keying, ID check at insert']];
  function pFmea(p) {
    p.appendChild(h('div', { class: 'callout', html: 'Score each failure mode 1–10: <b>S</b>everity (how bad the effect is), <b>O</b>ccurrence (how likely), <b>D</b>etection (10 = we would <i>not</i> detect it before the customer does). <b>RPN = S × O × D</b>. Edit the numbers; the table re-sorts by priority. Values are illustrative ' + B('est') + '.' }));
    const body = h('tbody'); const tbl = h('table', { class: 'table' }, h('thead', { html: '<tr><th>Failure mode</th><th>Effect</th><th>S</th><th>O</th><th>D</th><th>RPN</th><th>Mitigation</th></tr>' }), body);
    const rows = FM.map(f => { const ins = [2, 3, 4].map(i => { const e = h('input', { type: 'number', min: 1, max: 10, value: f[i], style: 'width:52px' }); e.addEventListener('change', upd); return e; }); const rpn = h('td', { style: 'font-family:var(--mono);font-weight:700' }); const tr = h('tr', null, h('td', null, h('b', null, f[0])), h('td', { class: 'muted' }, f[1]), ins.map(e => h('td', null, e)), rpn, h('td', { style: 'font-size:13px' }, f[5])); return { tr, ins, rpn }; });
    p.appendChild(h('div', { class: 'card', style: 'overflow-x:auto' }, tbl));
    const top = h('div', { class: 'af-plain' }); p.appendChild(top);
    function upd() {
      rows.forEach(r => { r.v = r.ins.reduce((a, e) => a * C.clamp(+e.value || 1, 1, 10), 1); r.rpn.textContent = r.v; r.rpn.style.color = r.v >= 150 ? 'var(--bad)' : r.v >= 80 ? 'var(--warn)' : 'var(--accent)'; });
      rows.slice().sort((a, b) => b.v - a.v).forEach(r => body.appendChild(r.tr));
      const t3 = rows.slice().sort((a, b) => b.v - a.v).slice(0, 3);
      top.innerHTML = '<b>Act first on:</b> ' + t3.map(r => r.tr.firstChild.textContent + ' (RPN ' + r.v + ')').join(' · ') + '. Also act on anything with severity ≥ 9, whatever its RPN, because safety and catastrophic effects are never "low priority".';
    }
    upd();
  }

  // ---------------- 6 · trade study
  function pTrade(p) {
    const crit = [['Energy per bit', 25], ['Reliability / serviceability', 25], ['Optical link margin', 15], ['Cost', 15], ['Thermal stability of lasers', 10], ['Front-panel fiber count & complexity', 10]];
    const opts = [['External laser source (front panel)', [7, 9, 7, 7, 9, 5]], ['Lasers integrated in the package', [8, 4, 8, 6, 3, 9]], ['Hybrid (some lasers on module near package)', [7, 6, 7, 6, 6, 7]]];
    const ws = crit.map(([n, w]) => { const i = h('input', { type: 'range', min: 0, max: 50, step: 5, value: w }), o = h('output'); i.addEventListener('input', upd); return [n, i, o]; });
    const res = h('div');
    p.appendChild(h('div', { class: 'af-calc' }, h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, 'Criteria weights (what matters most?)'), ws.map(([n, i, o]) => h('div', { class: 'slider-row' }, h('label', null, n), i, o)), h('p', { class: 'muted', style: 'font-size:12.5px', html: 'Scores (1–10) are illustrative ' + B('est') + ' to teach the method, not an evaluation of any real product.' })), h('div', { class: 'card' }, res)));
    function upd() {
      ws.forEach(([, i, o]) => { o.textContent = i.value; });
      const W = ws.reduce((a, x) => a + (+x[1].value), 0) || 1;
      const sc = opts.map(([n, s2]) => [n, s2.reduce((a, v, k) => a + v * (+ws[k][1].value), 0) / W]).sort((a, b) => b[1] - a[1]);
      res.innerHTML = '<table class="table"><tr><th>Option</th>' + crit.map(c => '<th style="font-size:11px">' + c[0] + '</th>').join('') + '</tr>' + opts.map(([n, s2]) => '<tr><td><b>' + n + '</b></td>' + s2.map(v => '<td style="font-family:var(--mono)">' + v + '</td>').join('') + '</tr>').join('') + '</table>' +
        '<div class="af-bars">' + sc.map(([n, v], i) => '<div class="af-hbar"><span style="font-size:12px">' + n + '</span><div class="tr"><i style="width:' + (v * 10).toFixed(1) + '%;background:' + (i ? 'var(--muted)' : 'var(--accent)') + '"></i></div><output>' + v.toFixed(2) + '</output></div>').join('') + '</div>' +
        '<div class="callout">Weighted score = Σ(weight × score) / Σweights. Try shifting weight from reliability to energy per bit and watch whether the winner changes. A <b>trade study</b> is only as good as its weights, so agree them with stakeholders <i>before</i> scoring, and record the rationale. Sensitivity (does the winner change with small weight changes?) tells you how robust the decision is.</div>';
    }
    upd();
  }

  CE.register({
    id: 'requirements', title: 'Requirements & V&V', icon: '📋', order: 9.7, storeKey: 'req-last-step',
    finish: { go: 'cases', label: 'Continue: Case Studies & Pareto →' },
    pages: [
      CE.startPage({ eyebrow: 'Hands-on workshop · about 45 minutes', title: '<em>Requirements</em>, <em>interfaces</em> and <em>verification</em> for a CPO switch', startLabel: 'Start the workshop',
        intro: 'The core tools of systems engineering applied to a CPO switch, as exercises. Rewrite weak requirements, explore a requirement hierarchy, map the interfaces in an N² matrix, build a verification matrix, score an FMEA, and run a weighted trade study. Just press <b>Next</b>.',
        analogy: [['✍️', 'Requirements', 'measurable, verifiable, traceable'], ['🔗', 'Interfaces', 'where integration fails'], ['✔️', 'V&V', 'prove every promise'], ['⚠️', 'FMEA', 'fix the riskiest first']],
        route: ['<b>Good requirements</b>: rules and 6 rewrite exercises.', '<b>Requirement hierarchy</b> for a CPO switch, with traceability.', '<b>Interfaces</b>: an interactive N² matrix and ICDs.', '<b>Verification</b>: the V-model and a verification-matrix exercise.', '<b>FMEA</b> of a CPO link, editable and sorted by RPN.', '<b>Trade study</b>: weighted decision matrix for laser placement.', '<b>Reviews and change control</b>.'] }),
      CE.page('req-good', 'Writing good requirements', 'Workshop', 'Writing good requirements', 'Most project problems trace back to vague requirements. Practise turning wishes into verifiable statements.', pGood),
      CE.page('req-tree', 'Requirement hierarchy', 'Workshop', 'The requirement hierarchy and traceability', 'From the customer\'s need down to engine and laser specifications. Click a line to fold or unfold it.', pTree),
      CE.page('req-n2', 'Interfaces (N²)', 'Workshop', 'Interfaces: the N² matrix', 'Seven subsystems and what flows between them. Click a dot.', pN2),
      CE.page('req-vv', 'Verification matrix', 'Workshop', 'Verification & validation', 'The V-model, the four verification methods, and an exercise.', pVV),
      CE.page('req-fmea', 'FMEA', 'Workshop', 'FMEA: failure modes of a CPO link', 'Failure Mode and Effects Analysis: list what can go wrong, score it, and act on the top risks. Many of these appear in the case studies.', pFmea),
      CE.page('req-trade', 'Trade study', 'Workshop', 'Trade study: where should the lasers live?', 'A weighted decision matrix. Change the weights and see whether the decision is robust.', pTrade),
      CE.page('req-gates', 'Reviews & change control', 'Workshop', 'Review gates and change control', null, p => {
        p.appendChild(h('table', { class: 'table', html: '<tr><th>Gate</th><th>Question</th><th>Typical evidence</th></tr>' +
          '<tr><td><b>SRR</b> system requirements review</td><td>Do we agree what we are building?</td><td>requirements with IDs, owners, verification methods; key budgets at top level</td></tr>' +
          '<tr><td><b>PDR</b> preliminary design review</td><td>Will this architecture meet them?</td><td>architecture, N² / ICD list, budgets with margins, trade studies, risk list (FMEA)</td></tr>' +
          '<tr><td><b>CDR</b> critical design review</td><td>Is the detailed design ready to build?</td><td>schematics/layout reviewed, simulations at corners, test plans, supplier specs</td></tr>' +
          '<tr><td><b>TRR</b> test readiness review</td><td>Are we ready to verify?</td><td>test procedures, equipment, fixtures, pass/fail criteria</td></tr>' +
          '<tr><td><b>PRR</b> production readiness review</td><td>Can the factory build it repeatably?</td><td>yields, Cpk, test limits, traceability, quality plan</td></tr>' }));
        p.appendChild(h('div', { class: 'grid2', html: '<div class="card"><h3 style="margin-top:0">Change control</h3><ul><li>Every change gets an ID, a reason, and an impact analysis across the requirement tree and the budgets.</li><li>A change board (SE leads) approves or rejects it.</li><li>The verification matrix is updated: which tests must be re-run?</li></ul></div><div class="card"><h3 style="margin-top:0">Margins management</h3><ul><li>Each budget (link, power, thermal, reliability) carries a margin owned by the system engineer.</li><li>Release margin consciously as the design matures, and record who got it and why.</li><li>Unplanned margin loss is an early warning: track it at every gate.</li></ul></div>' }));
      }),
      CE.donePage({ title: 'You have the <em>systems engineering toolkit</em> for CPO', takeaways: [
        'Requirements must be <b>measurable, verifiable, singular and conditional</b>; banned words are the warning signs.',
        'A <b>requirement tree</b> with IDs and parents gives traceability: you can see the impact of every change.',
        'Interfaces (<b>N²</b> → ICDs) are where integration fails; CPO\'s optical-engine interfaces are the most complex.',
        'Every requirement needs a planned <b>verification</b> (test, analysis, inspection, demonstration) at the right stage.',
        '<b>FMEA</b> ranks risks by S×O×D, and severity ≥ 9 is always acted on.',
        '<b>Trade studies</b> need agreed weights and a sensitivity check; record the rationale.'],
        next: [['Continue: Case Studies & Pareto →', 'cases'], ['Reliability Statistics', 'reliability']] })
    ]
  });
})();
