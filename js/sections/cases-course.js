/* Engineering Case Studies & Pareto course: realistic CPO-switch problems solved with the app's tools
   (KPIs, Data-Flow Simulator, Noise Lab, Budgets), then a Pareto plan to improve the three main KPIs by 20 %.
   Uses js/course-engine.js and js/scenario.js. Telemetry shown is synthetic and illustrative. */
(function () {
  'use strict';
  const C = window.CPO;
  const h = C.h, B = C.badge;

  // ---------------------------------------------------------------- tiny helpers
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const esc = C.esc;

  /* lineChart({ title, xlab, ylab, log, ymin, ymax, xmax, series:[{name,color,pts:[[x,y]],dash}], thr:[{v,label,color}], marks:[{x,label}] }) → svg */
  function lineChart(o) {
    const W = 560, H = 230, x0 = 58, x1 = W - 14, y0 = 30, y1 = H - 36;
    const tv = v => o.log ? Math.log10(v) : v;
    const lo = tv(o.ymin), hi = tv(o.ymax);
    const X = x => x0 + (x / o.xmax) * (x1 - x0), Y = v => y1 - (tv(v) - lo) / (hi - lo) * (y1 - y0);
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="cs-chart" role="img" aria-label="' + esc(o.title) + '">';
    s += '<text x="' + x0 + '" y="18" fill="#e6edf5" font-size="13" font-weight="700">' + esc(o.title) + '</text>';
    s += '<rect x="' + x0 + '" y="' + y0 + '" width="' + (x1 - x0) + '" height="' + (y1 - y0) + '" fill="#05080b" stroke="#243042"/>';
    const ticks = o.log ? Array.from({ length: Math.round(hi - lo) + 1 }, (_, i) => Math.pow(10, lo + i)) : [o.ymin, (o.ymin + o.ymax) / 2, o.ymax];
    ticks.forEach(v => { const y = Y(v); s += '<line x1="' + x0 + '" y1="' + y + '" x2="' + x1 + '" y2="' + y + '" stroke="#243042" stroke-dasharray="2 4"/><text x="' + (x0 - 6) + '" y="' + (y + 4) + '" text-anchor="end" fill="#8a99ad" font-size="10.5">' + (o.log ? '1e' + Math.round(Math.log10(v)) : (+v.toFixed(1))) + '</text>'; });
    (o.thr || []).forEach(t => { const y = Y(t.v); s += '<line x1="' + x0 + '" y1="' + y + '" x2="' + x1 + '" y2="' + y + '" stroke="' + t.color + '" stroke-width="1.5" stroke-dasharray="6 4"/><text x="' + (x1 - 4) + '" y="' + (y - 5) + '" text-anchor="end" fill="' + t.color + '" font-size="11">' + esc(t.label) + '</text>'; });
    (o.marks || []).forEach(m => { const x = X(m.x); s += '<line x1="' + x + '" y1="' + y0 + '" x2="' + x + '" y2="' + y1 + '" stroke="#a78bfa" stroke-dasharray="3 3"/><text x="' + (x + 4) + '" y="' + (y0 + 13) + '" fill="#a78bfa" font-size="11">' + esc(m.label) + '</text>'; });
    o.series.forEach(se => { s += '<path d="' + se.pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(Math.max(o.ymin, Math.min(o.ymax, p[1]))).toFixed(1)).join(' ') + '" fill="none" stroke="' + se.color + '" stroke-width="' + (se.w || 2) + '"' + (se.dash ? ' stroke-dasharray="' + se.dash + '"' : '') + ' stroke-opacity="' + (se.op || 1) + '"/>'; });
    s += '<text x="' + ((x0 + x1) / 2) + '" y="' + (H - 8) + '" text-anchor="middle" fill="#8a99ad" font-size="11.5">' + esc(o.xlab) + '</text>';
    s += '<text x="14" y="' + ((y0 + y1) / 2) + '" fill="#8a99ad" font-size="11.5" transform="rotate(-90 14 ' + ((y0 + y1) / 2) + ')" text-anchor="middle">' + esc(o.ylab) + '</text>';
    let lx = x0 + 6; const ly = y1 + 0;
    s += '<g>' + o.series.filter(se => se.name).map(se => { const t = '<rect x="' + lx + '" y="' + (ly - 12) + '" width="10" height="3" fill="' + se.color + '"/><text x="' + (lx + 14) + '" y="' + (ly - 8) + '" fill="#c9d4e0" font-size="10.5">' + esc(se.name) + '</text>'; lx += 22 + se.name.length * 6; return t; }).join('') + '</g>';
    return s + '</svg>';
  }
  function barChart(o) { // { title, ylab, log, ymin, ymax, bars:[[label, value, color]], thr:[{v,label,color}] }
    const W = 560, H = 230, x0 = 58, x1 = W - 14, y0 = 30, y1 = H - 40;
    const tv = v => o.log ? Math.log10(v) : v, lo = tv(o.ymin), hi = tv(o.ymax);
    const Y = v => y1 - (tv(v) - lo) / (hi - lo) * (y1 - y0);
    const bw = (x1 - x0) / o.bars.length;
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="cs-chart" role="img" aria-label="' + esc(o.title) + '">';
    s += '<text x="' + x0 + '" y="18" fill="#e6edf5" font-size="13" font-weight="700">' + esc(o.title) + '</text>';
    s += '<rect x="' + x0 + '" y="' + y0 + '" width="' + (x1 - x0) + '" height="' + (y1 - y0) + '" fill="#05080b" stroke="#243042"/>';
    const ticks = o.log ? Array.from({ length: Math.round(hi - lo) + 1 }, (_, i) => Math.pow(10, lo + i)) : [o.ymin, (o.ymin + o.ymax) / 2, o.ymax];
    ticks.forEach(v => { const y = Y(v); s += '<line x1="' + x0 + '" y1="' + y + '" x2="' + x1 + '" y2="' + y + '" stroke="#243042" stroke-dasharray="2 4"/><text x="' + (x0 - 6) + '" y="' + (y + 4) + '" text-anchor="end" fill="#8a99ad" font-size="10.5">' + (o.log ? '1e' + Math.round(Math.log10(v)) : (+v.toFixed(1))) + '</text>'; });
    o.bars.forEach(([l, v, col], i) => { const x = x0 + i * bw + bw * 0.18, y = Y(v); s += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + (bw * 0.64).toFixed(1) + '" height="' + Math.max(1, y1 - y).toFixed(1) + '" fill="' + col + '" rx="2"/><text x="' + (x + bw * 0.32).toFixed(1) + '" y="' + (y1 + 14) + '" text-anchor="middle" fill="#8a99ad" font-size="10.5">' + esc(l) + '</text>'; });
    (o.thr || []).forEach(t => { const y = Y(t.v); s += '<line x1="' + x0 + '" y1="' + y + '" x2="' + x1 + '" y2="' + y + '" stroke="' + t.color + '" stroke-width="1.5" stroke-dasharray="6 4"/><text x="' + (x1 - 4) + '" y="' + (y - 5) + '" text-anchor="end" fill="' + t.color + '" font-size="11">' + esc(t.label) + '</text>'; });
    s += '<text x="14" y="' + ((y0 + y1) / 2) + '" fill="#8a99ad" font-size="11.5" transform="rotate(-90 14 ' + ((y0 + y1) / 2) + ')" text-anchor="middle">' + esc(o.ylab) + '</text>';
    return s + '</svg>';
  }
  const series = (n, f, seed) => { const r = rng(seed || 1); return Array.from({ length: n + 1 }, (_, i) => [i, f(i, r)]); };

  const TOOL = {
    kpis: { ico: '🎯', name: 'KPIs' }, dataflow: { ico: '⚡', name: 'Data-Flow Simulator' },
    noise: { ico: '〰️', name: 'Noise Lab' }, budgets: { ico: '📊', name: 'System Budgets' }
  };

  // ================================================================ the cases
  const CASES = [
    {
      id: 'case-laser', short: 'Lanes on one laser fade together', tag: 'Reliability · laser aging',
      title: 'Case 1 · Slow fade: eight lanes degrade together',
      story: '<p>The fleet dashboard flags switch <b>leaf-217</b>. Over six weeks, the pre-FEC BER on <b>ports 33–40</b> has crept up from ~1e-7 to ~3e-5. Nothing else in the box changed, and there have been no link flaps <i>yet</i>. The network team asks: "is this switch about to fail?"</p>',
      alarm: 'Pre-FEC BER trend alarm on 8 lanes, still below the FEC limit.',
      charts: [
        lineChart({ title: 'Pre-FEC BER, ports 33–40 vs the rest', xlab: 'weeks', ylab: 'pre-FEC BER', log: true, ymin: 1e-9, ymax: 1e-3, xmax: 6,
          thr: [{ v: 2.4e-4, label: 'FEC limit 2.4e-4', color: '#f5b301' }],
          series: [{ name: 'ports 33–40', color: '#ff6b3d', pts: series(30, (i, r) => 1e-7 * Math.pow(10, 2.5 * Math.pow(i / 30, 1.6)) * (0.7 + 0.6 * r())).map(p => [p[0] / 5, p[1]]) },
            { name: 'other ports', color: '#22d3ee', op: .8, pts: series(30, (i, r) => 2e-8 * (0.6 + 0.8 * r()), 7).map(p => [p[0] / 5, p[1]]) }] }),
        lineChart({ title: 'External laser #3: drive current and output', xlab: 'weeks', ylab: '% of day-1 value', ymin: 70, ymax: 130, xmax: 6,
          series: [{ name: 'drive current', color: '#f5b301', pts: series(30, (i, r) => 100 + 22 * Math.pow(i / 30, 1.3) + r() * 1.5, 3).map(p => [p[0] / 5, p[1]]) },
            { name: 'optical output', color: '#ff6b3d', pts: series(30, (i, r) => (i < 22 ? 100 : 100 - (i - 22) * 1.6) + r() * 1, 4).map(p => [p[0] / 5, p[1]]) }] })
      ],
      clues: ['All 8 affected lanes are fed by the <b>same external laser source (ELS #3)</b>.', 'The laser\'s <b>drive current is up ~22 %</b> while its output stayed flat, until week 5.', 'Received optical power on those lanes is <b>~2.5 dB below</b> their install baseline.'],
      steps: [
        { tool: 'kpis', q: 'laser', do: 'Look up <b>Laser output power</b>, <b>Pre-FEC BER</b> and <b>Receiver sensitivity</b>: their targets and how each is measured.', look: ['Laser output power: target and margin', 'Pre-FEC BER: the FEC limit 2.4e-4', 'Receiver sensitivity: how much loss the link can survive'] },
        { tool: 'dataflow', set: { laserDrop: 3, detuneK: 0, extraLoss: 0, xt: -40, load: 0.7 }, do: 'Inject <b>laser aging −3 dB</b> and watch the receive side.', look: ['Received optical power falls', 'Pre-FEC BER rises and FEC corrections increase', 'The link stays up, but the margin banner shrinks'] },
        { tool: 'noise', set: { prx: -8 }, do: 'Lower the <b>received power by 3 dB</b> (−5 → −8 dBm) in the Signal Lab.', look: ['The PAM4 eye closes vertically', 'SNR drops and BER rises by orders of magnitude', 'Compare with the "Typical CPO link" preset'] },
        { tool: 'budgets', sub: 'link', set: { laser: 12 }, do: 'Run the <b>link budget</b> with the laser 3 dB weaker (15 → 12 dBm).', look: ['How much margin is left at end of life', 'Which loss items would buy it back'] }
      ],
      quiz: { q: 'What is the most likely root cause?', opts: [
        ['A dirty front-panel connector on port 33', false, 'A connector affects <b>one</b> port. Here eight ports degrade together, and all of them share one laser.'],
        ['External laser source #3 is wearing out', true, 'Yes. The power-control loop raised the current to hold the output until it ran out of headroom. Because one laser feeds eight lanes, they fail <b>together</b>.'],
        ['A SerDes problem in the switch ASIC', false, 'An electrical fault would not lower the <b>received optical power</b>, and it would not follow the laser grouping.'],
        ['Network congestion', false, 'Congestion causes queueing and drops, not a higher <b>bit-error rate</b>.']] },
      root: 'Laser aging. As the laser ages, it needs more current for the same light (automatic power control hides this at first). Once the current hits its limit, output and received power fall and BER climbs. A shared laser makes this a <b>correlated failure group</b>.',
      fix: ['Drain traffic from ports 33–40 and <b>hot-swap ELS #3</b> from the front panel in a maintenance window. This is exactly why the lasers are external.', 'Confirm Rx power and BER return to baseline; keep the removed laser for failure analysis.'],
      prevent: ['Alarm on <b>laser drive-current trend</b> (e.g. +15 % vs day 1), not only on BER: it warns weeks earlier.', 'Group BER alarms by laser: several lanes on one ELS degrading together is a laser signature.', 'Size spare ELS stock from the laser FIT and the fleet size.'],
      kpis: 'laser drive current · laser output power · Rx optical power per lane · pre-FEC BER trend · FEC histogram'
    },
    {
      id: 'case-thermal', short: 'Errors every time a job starts', tag: 'Control loop · thermal transient',
      title: 'Case 2 · Errors every time a training job starts',
      story: '<p>Customers report short bursts of <b>uncorrectable FEC codewords</b>, and occasionally a <b>link flap</b>, on many ports. It always happens within ~2 seconds of a large training job starting, and the switch is clean the rest of the time. The optics look healthy in every static test.</p>',
      alarm: 'FEC uncorrectable bursts + 2 link flaps, correlated with job start.',
      charts: [
        lineChart({ title: 'At job start: ASIC power and package temperature', xlab: 'seconds', ylab: 'relative', ymin: 0, ymax: 1.2, xmax: 20, marks: [{ x: 5, label: 'job starts' }],
          series: [{ name: 'ASIC power', color: '#facc15', pts: series(80, i => i / 4 < 5 ? 0.45 : 0.95).map(p => [p[0] / 4, p[1]]) },
            { name: 'package temp', color: '#ff5a36', pts: series(80, i => { const t = i / 4; return t < 5 ? 0.4 : 0.4 + 0.45 * (1 - Math.exp(-(t - 5) / 1.5)); }).map(p => [p[0] / 4, p[1]]) },
            { name: 'ring error', color: '#a78bfa', pts: series(80, i => { const t = i / 4; return t < 5 ? 0.05 : 0.05 + 0.9 * Math.exp(-(t - 5) / 2.2) * (1 - Math.exp(-(t - 5) / 0.4)); }).map(p => [p[0] / 4, p[1]]) }] }),
        lineChart({ title: 'Pre-FEC BER on a typical port', xlab: 'seconds', ylab: 'pre-FEC BER', log: true, ymin: 1e-9, ymax: 1e-2, xmax: 20, marks: [{ x: 5, label: 'job starts' }],
          thr: [{ v: 2.4e-4, label: 'FEC limit', color: '#f5b301' }],
          series: [{ name: 'BER', color: '#ff6b3d', pts: series(80, (i, r) => { const t = i / 4; return t < 5 ? 1e-8 * (0.5 + r()) : 1e-8 * Math.pow(10, 5.6 * Math.exp(-(t - 5) / 1.6) * (1 - Math.exp(-(t - 5) / 0.3))) * (0.5 + r()); }, 9).map(p => [p[0] / 4, p[1]]) }] })
      ],
      clues: ['The errors line up with the <b>ASIC power step</b> (traffic going from idle to full load).', 'Package temperature rises several °C in a few seconds.', 'Ring-lock error spikes, then recovers on its own; laser power is steady.'],
      steps: [
        { tool: 'kpis', q: 'ring', do: 'Look up the ring-related KPIs: <b>ring lock accuracy</b>, <b>wavelength accuracy</b>, and how they are measured.', look: ['How small the allowed lock error is (tens of pm)', 'Drift of ~0.07–0.1 nm per K'] },
        { tool: 'dataflow', set: { detuneK: 1.2, laserDrop: 0, extraLoss: 0, xt: -40, load: 0.7 }, do: 'Inject <b>ring lock lost +1.2 K</b> (a thermal step the loop has not corrected yet).', look: ['Optical modulation amplitude collapses', 'BER spikes past the FEC limit; possible link flap', 'Compare with "Healthy"'] },
        { tool: 'noise', set: { dT: 0.8, heat: 60 }, do: 'Set <b>lock residual ΔT = 0.8 K</b> and <b>thermal noise 60 mK</b>.', look: ['The ring-thermal noise source grows in the noise breakdown', 'The eye closes as the ring slides off the laser'] },
        { tool: 'budgets', sub: 'accuracy', do: 'Open the <b>accuracy / control</b> budget: how much temperature error the lock loop may leave.', look: ['Allowed ring error vs heater resolution and loop bandwidth'] }
      ],
      quiz: { q: 'What is the most likely root cause?', opts: [
        ['External lasers are aging', false, 'Aging is slow and steady. This problem comes and goes in seconds, together with the ASIC power.'],
        ['The ring-lock loop is too slow for the thermal step at job start', true, 'Yes. The ASIC heats the package faster than the loop can retune the rings. For a few seconds the rings sit off the laser wavelength.'],
        ['Damaged fiber', false, 'Fiber damage would not recover by itself after a few seconds.'],
        ['Wrong FEC configuration', false, 'FEC settings don\'t change with traffic. The physics (temperature) does.']] },
      root: 'A thermal transient. The ASIC power step heats the package and shifts every ring\'s resonance (~0.08 nm/K). The lock loop corrects it, but too slowly, so for a moment many rings are detuned and BER bursts above the FEC limit.',
      fix: ['Add <b>feed-forward</b>: use ASIC power or temperature telemetry to pre-adjust the heaters before the error builds up.', 'Raise the lock-loop bandwidth (within stability limits) and keep heater headroom at both temperature corners.', 'Optionally ramp ASIC power over ~1 s instead of a step.'],
      prevent: ['Add a <b>load-step test</b> (idle → 100 % traffic) at hot and cold coolant temperatures to validation, recording max ring error and BER.', 'Specify loop response time vs maximum package dT/dt in the interface spec between thermal and firmware.'],
      kpis: 'ring lock error · heater code headroom · package temperature dT/dt · FEC uncorrectables · link-flap count'
    },
    {
      id: 'case-connector', short: 'One bad port after maintenance', tag: 'Optics · contamination',
      title: 'Case 3 · One port goes bad after maintenance',
      story: '<p>After a re-cabling job in the data hall, <b>port 12 on leaf-07</b> runs with pre-FEC BER around 1e-4, close to the limit. Its neighbours are fine. The technician says "I just moved two cables".</p>',
      alarm: 'Port 12: Rx power 5.6 dB below its install baseline; pre-FEC BER near the limit.',
      charts: [
        barChart({ title: 'Rx power change vs install baseline (dB)', ylab: 'Δ dB', ymin: -7, ymax: 1,
          bars: [['p9', -0.2, '#22d3ee'], ['p10', 0.1, '#22d3ee'], ['p11', -0.3, '#22d3ee'], ['p12', -5.6, '#ff4d5e'], ['p13', -0.1, '#22d3ee'], ['p14', 0.2, '#22d3ee'], ['p15', -0.4, '#22d3ee'], ['p16', 0, '#22d3ee']],
          thr: [{ v: -2, label: 'alarm −2 dB', color: '#f5b301' }] }),
        barChart({ title: 'Pre-FEC BER per port', ylab: 'BER', log: true, ymin: 1e-10, ymax: 1e-3,
          bars: [['p9', 3e-9, '#22d3ee'], ['p10', 1e-9, '#22d3ee'], ['p11', 4e-9, '#22d3ee'], ['p12', 1.1e-4, '#ff4d5e'], ['p13', 2e-9, '#22d3ee'], ['p14', 1e-9, '#22d3ee'], ['p15', 6e-9, '#22d3ee'], ['p16', 2e-9, '#22d3ee']],
          thr: [{ v: 2.4e-4, label: 'FEC limit', color: '#f5b301' }] })
      ],
      clues: ['Only <b>one port</b> is affected; the lanes sharing its laser on other ports are fine.', 'Its Rx power is a steady <b>5–6 dB low</b>, and it started exactly at the maintenance time.', 'Ring heater codes and laser current are normal.'],
      steps: [
        { tool: 'kpis', q: 'loss', do: 'Look up <b>Insertion loss</b> and <b>Return loss</b>: what a good connector looks like.', look: ['Connector ≤ ~0.5 dB each', 'Return loss ≥ 35 dB (UPC) / ≥ 60 dB (APC)'] },
        { tool: 'dataflow', set: { extraLoss: 6, laserDrop: 0, detuneK: 0, xt: -40, load: 0.7 }, do: 'Inject the <b>dirty connector +6 dB</b> fault.', look: ['Rx power drops by 6 dB on this link only', 'BER jumps close to the FEC limit'] },
        { tool: 'budgets', sub: 'link', set: { connL: 3.1 }, do: 'Run the <b>link budget</b> with one connector at ~6 dB loss (2 connectors averaging 3.1 dB).', look: ['Margin goes negative or nearly so', 'Compare with clean connectors (0.3 dB)'] }
      ],
      quiz: { q: 'What is the most likely root cause?', opts: [
        ['A dirty or damaged connector at the patch point', true, 'Yes. A single port with a steady loss step that started at the moment of the cable work is a contamination or damage signature.'],
        ['The shared external laser is aging', false, 'Then every lane on that laser would degrade, and the drive current would rise. Neither is true here.'],
        ['The ring-lock loop lost lock', false, 'Lock problems come and go with temperature, and the heater codes would look abnormal. This loss is steady.'],
        ['A firmware bug from the maintenance', false, 'No firmware changed. Only cables were touched.']] },
      root: 'Contamination (or a scratched end-face) on a connector that was unplugged and re-plugged. One dust particle on a ~9 µm fiber core can block several dB of light and add reflections.',
      fix: ['<b>Inspect</b> both end-faces with a fiber scope, <b>clean</b>, re-inspect, then reconnect. Replace the jumper if the end-face is scratched.', 'Confirm Rx power is back within ~0.5 dB of baseline.'],
      prevent: ['Enforce "<b>inspect before you connect</b>" in every maintenance procedure.', 'Store each port\'s Rx-power baseline at installation and alarm when it drops more than ~2 dB.', 'Use dust caps; prefer low-loss, keyed connector grades for front-panel links.'],
      kpis: 'Rx optical power vs baseline · insertion loss · return loss · pre-FEC BER per port'
    },
    {
      id: 'case-xtalk', short: 'Fails only at full load: crosstalk', tag: 'Optics · WDM crosstalk',
      title: 'Case 4 · A new engine lot fails only when every lane is on',
      story: '<p>A new lot of optical engines passes the supplier\'s single-lane tests. In your system test, some lanes\' BER rises <b>~10×</b>, but only when <b>all the wavelengths sharing a fiber are active</b>. With one lane at a time, everything passes.</p>',
      alarm: 'System-test failure: lane BER depends on how many neighbouring lanes are running.',
      charts: [
        lineChart({ title: 'Lane λ2 BER vs active neighbour lanes', xlab: 'active neighbouring lanes', ylab: 'pre-FEC BER', log: true, ymin: 1e-9, ymax: 1e-3, xmax: 3,
          thr: [{ v: 2.4e-4, label: 'FEC limit', color: '#f5b301' }],
          series: [{ name: 'previous lot', color: '#22d3ee', pts: [[0, 3e-8], [1, 4e-8], [2, 6e-8], [3, 8e-8]] }, { name: 'new lot', color: '#ff6b3d', pts: [[0, 3e-8], [1, 2e-7], [2, 9e-7], [3, 4e-6]] }] })
      ],
      clues: ['Errors scale with the <b>number of active neighbouring wavelengths</b>.', 'Single-lane received power and extinction ratio are normal.', 'Only engines from the new lot are affected.'],
      steps: [
        { tool: 'kpis', q: 'crosstalk', do: 'Look up the <b>crosstalk</b> KPIs and their limits.', look: ['Typical adjacent-channel crosstalk targets'] },
        { tool: 'dataflow', set: { xt: -25, laserDrop: 0, detuneK: 0, extraLoss: 0, load: 0.7 }, do: 'Inject <b>WDM crosstalk −25 dB</b> (healthy is about −40 dB).', look: ['BER rises although power and lock are fine', 'The penalty grows with each aggressor lane'] },
        { tool: 'noise', set: { xw: -18 }, do: 'Set <b>WDM ring crosstalk to −18 dB</b>.', look: ['Crosstalk becomes a top noise source in the breakdown', 'The eye fills in at the levels, not just shrinks'] }
      ],
      quiz: { q: 'What is the most likely root cause?', opts: [
        ['Laser power is too low', false, 'Low power would hurt even with one lane active.'],
        ['Rings in the new lot leak light between neighbouring wavelengths (WDM crosstalk)', true, 'Yes. The resonance shape or spacing of the new lot\'s rings lets neighbouring wavelengths leak into each lane. A test with one lane at a time cannot see it.'],
        ['A dirty connector', false, 'Connector loss doesn\'t depend on how many lanes are on.'],
        ['A software bug in the traffic generator', false, 'The dependence on neighbouring wavelengths points to optics, and only the new lot is affected.']] },
      root: 'WDM crosstalk. In the new lot the ring resonances are a little wider, or the channel spacing a little tighter, so each lane picks up some light from its neighbours. It is invisible when lanes are tested one at a time.',
      fix: ['Work with the supplier on the process shift (ring Q, coupling gap, spacing).', 'Short term: adjust ring tuning offsets or the wavelength plan to increase separation; screen the lot.'],
      prevent: ['Add an <b>all-lanes-active</b> test to incoming inspection and to the supplier\'s outgoing test.', 'Carry an explicit crosstalk penalty in the link budget and track it per lot.'],
      kpis: 'adjacent-channel crosstalk · BER with all lanes active · ring linewidth/Q per lot · wavelength accuracy'
    },
    {
      id: 'case-incast', short: 'Drops, but the optics are clean', tag: 'Network · congestion',
      title: 'Case 5 · Packet drops, but the optics are clean',
      story: '<p>During the all-to-all phase of a mixture-of-experts job, operators see <b>tail-latency spikes and drops</b> and open a ticket against "the new CPO optics". You check the switch.</p>',
      alarm: 'Tail latency ×8, ECN marks and drops during all-to-all phases.',
      charts: [
        lineChart({ title: 'Queue depth and drops vs time', xlab: 'seconds', ylab: 'relative', ymin: 0, ymax: 1.1, xmax: 30, marks: [{ x: 10, label: 'all-to-all' }, { x: 20, label: 'compute' }],
          series: [{ name: 'queue depth', color: '#a78bfa', pts: series(120, (i, r) => { const t = i / 4; return t > 10 && t < 20 ? 0.75 + 0.25 * r() : 0.1 + 0.05 * r(); }, 11).map(p => [p[0] / 4, p[1]]) },
            { name: 'drops', color: '#ff4d5e', pts: series(120, (i, r) => { const t = i / 4; return t > 10 && t < 20 && r() > 0.6 ? 0.4 + 0.4 * r() : 0; }, 12).map(p => [p[0] / 4, p[1]]) }] }),
        lineChart({ title: 'Pre-FEC BER on the same ports', xlab: 'seconds', ylab: 'pre-FEC BER', log: true, ymin: 1e-10, ymax: 1e-3, xmax: 30,
          thr: [{ v: 2.4e-4, label: 'FEC limit', color: '#f5b301' }],
          series: [{ name: 'BER', color: '#22d3ee', pts: series(60, (i, r) => 2e-9 * (0.5 + r()), 13).map(p => [p[0] / 2, p[1]]) }] })
      ],
      clues: ['Pre-FEC BER, FEC histograms, optical power and ring locks are all <b>normal</b>.', 'Problems appear only when <b>many senders target the same receivers</b> at once.', 'Queues fill and ECN marking rises at the same moments.'],
      steps: [
        { tool: 'kpis', q: 'latency', do: 'Look up <b>latency</b>, <b>tail latency</b> and congestion KPIs: these are network-layer, not optical.', look: ['Which KPIs belong to the physical layer and which to the network layer'] },
        { tool: 'dataflow', set: { load: 1.4, laserDrop: 0, detuneK: 0, extraLoss: 0, xt: -40 }, do: 'Run the <b>Incast 140 %</b> preset.', look: ['Queues fill, ECN marks and pauses/drops appear', 'BER and FEC stay perfectly clean'] }
      ],
      quiz: { q: 'What is the problem?', opts: [
        ['The CPO optics are failing', false, 'BER, FEC, power and locks are clean. The optics are delivering every bit correctly.'],
        ['Network congestion (incast): too many senders to one receiver at once', true, 'Yes. This is a network-layer problem: queues overflow when many flows converge. It is not a physical-layer problem.'],
        ['Laser aging', false, 'Laser aging would raise BER. Here BER is flat.'],
        ['A thermal transient', false, 'A thermal transient would show ring-lock error and BER bursts. Neither appears.']] },
      root: 'Incast congestion. The all-to-all pattern sends many flows to the same ports at once, so queues overflow. The optics are fine.',
      fix: ['Hand over to the network team with evidence (clean physical-layer KPIs).', 'Tune congestion control / ECN thresholds, enable adaptive routing, review buffer allocation and job placement.'],
      prevent: ['Build dashboards that separate <b>physical-layer</b> KPIs (BER, FEC, power, locks) from <b>network-layer</b> ones (queues, ECN, drops, latency), so tickets go to the right team first time.'],
      kpis: 'queue depth · ECN marks · drops / pauses · tail latency — and, to exonerate optics: pre-FEC BER, FEC histogram, Rx power'
    },
    {
      id: 'case-vrm', short: 'Jitter from the power supply', tag: 'Power integrity · jitter',
      title: 'Case 6 · BER got worse after a power-firmware update',
      story: '<p>After a voltage-regulator firmware update, which changed how phases are shed at light load, some lanes show <b>higher BER at low traffic</b>. Oddly, they look better at full load. Optical power and locks are normal.</p>',
      alarm: 'BER regression after VRM firmware update, worst at light load.',
      charts: [
        lineChart({ title: 'BER vs traffic load: before vs after the update', xlab: 'traffic load (%)', ylab: 'pre-FEC BER', log: true, ymin: 1e-9, ymax: 1e-3, xmax: 100,
          thr: [{ v: 2.4e-4, label: 'FEC limit', color: '#f5b301' }],
          series: [{ name: 'before', color: '#22d3ee', pts: [[0, 5e-8], [20, 5e-8], [40, 6e-8], [60, 6e-8], [80, 7e-8], [100, 8e-8]] }, { name: 'after', color: '#ff6b3d', pts: [[0, 4e-5], [20, 2e-5], [40, 3e-6], [60, 2e-7], [80, 9e-8], [100, 9e-8]] }] }),
        lineChart({ title: 'Supply ripple on the driver/TIA rail', xlab: 'traffic load (%)', ylab: 'ripple (mVpp)', ymin: 0, ymax: 50, xmax: 100,
          series: [{ name: 'before', color: '#22d3ee', pts: [[0, 6], [50, 5], [100, 6]] }, { name: 'after', color: '#facc15', pts: [[0, 38], [20, 30], [40, 18], [60, 8], [80, 6], [100, 6]] }] })
      ],
      clues: ['The regression started with the <b>VRM firmware update</b>, not with any optical change.', 'It is worst at <b>light load</b>, exactly where the new firmware sheds phases.', 'Spectrum analysis shows a tone at the VRM switching frequency on the lane jitter.'],
      steps: [
        { tool: 'kpis', q: 'jitter', do: 'Look up the <b>jitter</b> and power-supply noise KPIs.', look: ['Periodic jitter limits, and how supply noise couples in'] },
        { tool: 'noise', set: { vrm: 40, pj: 60 }, do: 'Set <b>VRM ripple 40 mV</b> and <b>periodic jitter 60 mUI</b>.', look: ['The eye narrows horizontally (jitter) and thickens', 'VRM ripple coupling appears in the noise breakdown'] },
        { tool: 'budgets', sub: 'jitter', do: 'Open the <b>jitter budget</b>: how much periodic jitter the lane can afford.', look: ['Total jitter vs the unit interval at the target BER'] }
      ],
      quiz: { q: 'What is the most likely root cause?', opts: [
        ['Supply ripple from the new VRM phase-shedding couples into the driver/TIA/PLL rails', true, 'Yes. Fewer active phases at light load means more ripple at the switching frequency. It turns into periodic jitter and noise on sensitive rails.'],
        ['Laser aging', false, 'Laser aging is not load-dependent, and optical power is normal.'],
        ['A dirty connector', false, 'A connector doesn\'t care about traffic load or firmware versions.'],
        ['Congestion', false, 'Congestion is worst at <b>high</b> load, and it doesn\'t raise BER.']] },
      root: 'Power-integrity regression. Shedding phases at light load raised the ripple on the rail that feeds the drivers, TIAs or clocking. That ripple appears as periodic jitter and amplitude noise in the lanes.',
      fix: ['Roll back or retune the phase-shedding thresholds for rails that feed the optics.', 'Add filtering or a separate low-noise regulator for the sensitive rails.'],
      prevent: ['Write rail ripple limits into the power-integrity spec, at <b>all</b> load points.', 'Make "BER vs load sweep" a mandatory regression test for any power/firmware change.'],
      kpis: 'rail ripple (mVpp) · periodic jitter · BER vs load · eye width'
    }
  ];

  function casePage(cs, i) {
    return {
      id: cs.id, title: 'Case ' + (i + 1) + ': ' + cs.short, ch: 'Case studies', build(p) {
        p.appendChild(h('div', { class: 'cs-head' }, h('span', { class: 'af-apx-tag' }, cs.tag), h('h2', { class: 'af-ph' }, cs.title)));
        p.appendChild(h('div', { class: 'cs-grid' },
          h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, 'The situation'), h('div', { html: cs.story }),
            h('div', { class: 'cs-alarm', html: '🚨 <b>Alarm:</b> ' + cs.alarm }),
            h('h3', null, 'Clues in the telemetry'), h('ul', { html: cs.clues.map(c => '<li>' + c + '</li>').join('') })),
          h('div', { class: 'cs-charts', html: cs.charts.join('') + '<div class="muted" style="font-size:12px">Synthetic, illustrative telemetry ' + B('est') + '</div>' })));
        p.appendChild(h('h3', null, '🔎 Investigate: reproduce it in the app\'s tools'));
        p.appendChild(h('p', { class: 'muted', style: 'margin-top:0' }, 'Each button opens the tool with the fault already injected and a purple banner telling you what to look for. Use "← Back to the case" to return.'));
        const steps = h('div', { class: 'cs-steps' });
        cs.steps.forEach((s2, k) => {
          const t = TOOL[s2.tool];
          steps.appendChild(h('div', { class: 'card cs-step' },
            h('div', { class: 'cs-stepn' }, String(k + 1)),
            h('div', { class: 'cs-stepb' }, h('div', { class: 'cs-tool' }, t.ico + ' ' + t.name), h('div', { html: s2.do }),
              h('ul', { class: 'cs-look', html: s2.look.map(x => '<li>' + x + '</li>').join('') }),
              h('button', { class: 'btn primary', onclick: () => C.scenario.open(s2.tool, s2.sub, {
                title: cs.title + ' · step ' + (k + 1), set: s2.q ? { q: s2.q } : s2.set, note: s2.do, look: s2.look, back: 'cases/' + cs.id
              }) }, 'Open ' + t.name + ' with this setup →'))));
        });
        p.appendChild(steps);
        // diagnosis
        const reveal = h('div', { class: 'cs-reveal' },
          h('div', { class: 'grid2' },
            h('div', { class: 'card cs-root', html: '<h3 style="margin-top:0">Root cause</h3><p>' + cs.root + '</p><h3>Fix</h3><ul>' + cs.fix.map(x => '<li>' + x + '</li>').join('') + '</ul>' }),
            h('div', { class: 'card', html: '<h3 style="margin-top:0">Prevent it next time</h3><ul>' + cs.prevent.map(x => '<li>' + x + '</li>').join('') + '</ul><h3>KPIs that catch it early</h3><p>' + cs.kpis + '</p>' })));
        const fb = h('div', { class: 'cs-fb' });
        const opts = h('div', { class: 'cs-opts' });
        cs.quiz.opts.forEach(([txt, ok, why]) => {
          const b = h('button', { class: 'btn cs-opt', onclick: () => {
            [...opts.children].forEach(x => x.classList.remove('picked'));
            b.classList.add('picked', ok ? 'right' : 'wrong');
            fb.className = 'cs-fb callout' + (ok ? '' : ' warn');
            fb.innerHTML = (ok ? '✅ ' : '❌ ') + why + (ok ? '' : ' <i>Try another answer.</i>');
            C.linkify(fb);
            if (ok) reveal.classList.add('open');
          } }, txt);
          opts.appendChild(b);
        });
        p.appendChild(h('h3', null, '🧠 Your diagnosis: ' + cs.quiz.q));
        p.appendChild(opts); p.appendChild(fb);
        p.appendChild(h('button', { class: 'btn cs-show', onclick: () => reveal.classList.add('open') }, 'Show the answer'));
        p.appendChild(reveal);
      }
    };
  }

  // ================================================================ Pareto: the three main KPIs
  const KPIS = [
    {
      id: 'pareto-power', short: 'Energy per bit −20 %', name: 'Energy per bit', unit: 'pJ/b', base: 5.0, better: 'lower', fmt: 2,
      why: 'Sets the switch power, cooling and the customer\'s cost per bit, and it is the headline CPO claim (3.5× better than pluggable ' + B('nv') + ').',
      contrib: [['ASIC SerDes', 1.8, '#22d3ee'], ['Driver + TIA (EIC)', 1.4, '#76b900'], ['Lasers (wall plug)', 1.0, '#ff6b3d'], ['Ring heaters', 0.4, '#ff5a36'], ['Control & monitors', 0.4, '#a78bfa']],
      levers: [
        { n: 'Right-size the SerDes for the mm channel', d: 'Turn off equalization the short CPO channel doesn\'t need (DFE taps, CTLE boost) and lower the transmit swing. Re-check margin.', g: 0.45, eff: 'Medium', time: '3–6 mo', rec: true, side: 'Slightly less electrical margin; verify at corners.' },
        { n: 'Cut optical loss by ~1.5 dB, then turn the lasers down', d: 'Better couplers and connectors mean the same received power needs ~30 % less laser light.', g: 0.29, eff: 'High', time: '6–18 mo', rec: true, side: '<b>Also improves link margin and reliability.</b> This is the "golden lever".' },
        { n: 'Reduce heater power', d: 'Better thermal isolation of the rings, trimming to reduce the average tuning needed, smarter lock set-points.', g: 0.2, eff: 'Medium', time: '6–12 mo', rec: true, side: 'Less heater headroom; check lock range at cold and hot corners.' },
        { n: 'Power down idle lanes, scale control-plane clocks', d: 'Firmware-only: idle ports and monitoring circuits use less power.', g: 0.1, eff: 'Low', time: '1–3 mo', rec: true, side: 'Workload-dependent; wake-up time must not affect links.' },
        { n: 'Higher-efficiency lasers (10 % → 14 % wall-plug)', d: 'Supplier roadmap: more light per electrical watt.', g: 0.29, eff: 'Medium', time: 'next ELS gen', rec: false, side: 'Supplier dependency and qualification time.' },
        { n: 'More efficient rings (lower drive swing)', d: 'Next-generation PIC with better modulation efficiency so the driver swings less.', g: 0.3, eff: 'High', time: 'next PIC gen', rec: false, side: 'New silicon: long lead time and risk.' }
      ]
    },
    {
      id: 'pareto-rel', short: 'Link interruptions −20 %', name: 'Link interruption rate', unit: 'events / 1k links / month', base: 10, better: 'lower', fmt: 1,
      why: 'One interrupted link can stall a training job across thousands of GPUs, so customers feel this KPI directly as lost "goodput". NVIDIA claims 10× better resiliency vs pluggables ' + B('nv') + '.',
      contrib: [['Connectors / handling', 3.2, '#ff6b3d'], ['Laser degradation', 2.4, '#f5b301'], ['Ring-lock transients', 1.8, '#a78bfa'], ['Firmware / control', 1.2, '#22d3ee'], ['SerDes / electrical', 0.8, '#76b900'], ['Other', 0.6, '#8a99ad']],
      levers: [
        { n: 'Inspect-before-connect + Rx-power baseline alarms', d: 'A maintenance procedure plus telemetry: catch dirty connectors on day 0 and alarm at −2 dB vs baseline (case 3).', g: 1.6, eff: 'Low', time: '1–2 mo', rec: true, side: 'None; also protects margin.' },
        { n: 'Predictive laser replacement', d: 'Trend each laser\'s drive current; swap at +15 % before BER is affected (case 1).', g: 1.2, eff: 'Low–Med', time: '2–4 mo', rec: true, side: 'Some lasers replaced early; plan spares.' },
        { n: 'Feed-forward ring-lock on load steps', d: 'Use ASIC power telemetry to pre-correct heaters (case 2).', g: 0.9, eff: 'Medium', time: '3–6 mo', rec: false, side: 'Firmware complexity; needs load-step validation.' },
        { n: 'Firmware hardening and staged roll-outs', d: 'Watchdogs, safe re-lock, canary deployments, regression tests (case 6).', g: 0.5, eff: 'Medium', time: '3–6 mo', rec: false, side: 'Slower release cadence.' },
        { n: 'Burn-in screening', d: 'Stress units before shipping to remove early-life failures.', g: 0.3, eff: 'Medium', time: '2–3 mo', rec: false, side: 'Factory time and cost per unit.' }
      ]
    },
    {
      id: 'pareto-margin', short: 'Link margin +20 %', name: 'Optical link margin', unit: 'dB', base: 3.0, better: 'higher', fmt: 1,
      why: 'Margin is what absorbs laser aging, dirty connectors, temperature corners and part-to-part variation. More margin means higher yield and fewer field failures.',
      contrib: [['Modulator loss + ER penalty', 3.0, '#ff6b3d'], ['Far-end coupler + demux', 2.5, '#22d3ee'], ['Laser → engine path', 2.5, '#f5b301'], ['Chip → fiber coupler', 1.5, '#a78bfa'], ['Link connectors', 1.0, '#ff5a36'], ['On-chip waveguides / mux', 1.0, '#76b900']],
      contribNote: 'Loss items (dB) that eat the margin, sorted Pareto-style.',
      levers: [
        { n: 'Per-ring bias and drive calibration at bring-up', d: 'Optimize each ring\'s operating point for the best OMA vs insertion-loss trade-off, instead of one setting for all.', g: 0.4, eff: 'Low–Med', time: '2–4 mo', rec: true, side: 'Longer calibration time per unit.' },
        { n: 'Low-loss connectors and cleaning discipline', d: 'Better connector grade and cleanliness on front-panel and patch links.', g: 0.4, eff: 'Low', time: '1–3 mo', rec: true, side: 'None; also improves reliability.' },
        { n: 'Better fiber couplers (−0.3 dB on each of 3)', d: 'Coupler design and assembly improvements with the PIC and packaging teams.', g: 0.9, eff: 'High', time: '9–18 mo', rec: false, side: 'Also lets the lasers run lower (energy/bit).' },
        { n: 'Better receiver sensitivity', d: 'Lower-noise TIA and improved equalization.', g: 0.5, eff: 'High', time: 'next EIC gen', rec: false, side: 'New silicon.' },
        { n: 'Raise laser power by 1 dB', d: 'The quick fix everyone proposes first.', g: 1.0, eff: 'Low', time: 'now', rec: false, trap: true, side: '⚠️ <b>Trap:</b> costs ~+0.2 pJ/b, makes lasers run hotter and age faster (more interruptions), and pushes eye safety limits. It wins one KPI and loses two.' }
      ]
    }
  ];

  function paretoSvg(k) {
    const items = k.contrib.slice().sort((a, b) => b[1] - a[1]);
    const tot = items.reduce((a, x) => a + x[1], 0);
    const W = 620, H = 260, x0 = 50, x1 = W - 40, y0 = 20, y1 = H - 60, bw = (x1 - x0) / items.length;
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="cs-chart" role="img" aria-label="Pareto chart">';
    s += '<rect x="' + x0 + '" y="' + y0 + '" width="' + (x1 - x0) + '" height="' + (y1 - y0) + '" fill="#05080b" stroke="#243042"/>';
    const yb = v => y1 - v / items[0][1] * (y1 - y0) * 0.95, yc = p => y1 - p * (y1 - y0);
    s += '<line x1="' + x0 + '" y1="' + yc(0.8) + '" x2="' + x1 + '" y2="' + yc(0.8) + '" stroke="#f5b301" stroke-dasharray="6 4"/><text x="' + (x1 + 4) + '" y="' + (yc(0.8) + 4) + '" fill="#f5b301" font-size="11">80%</text>';
    let cum = 0, line = '';
    items.forEach(([l, v, col], i) => {
      const x = x0 + i * bw, y = yb(v);
      s += '<rect x="' + (x + bw * 0.12).toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + (bw * 0.76).toFixed(1) + '" height="' + (y1 - y).toFixed(1) + '" fill="' + col + '" rx="3" fill-opacity=".85"/>';
      s += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (y - 5).toFixed(1) + '" text-anchor="middle" fill="#e6edf5" font-size="11.5">' + v + ' (' + Math.round(100 * v / tot) + '%)</text>';
      const words = l.split(' '), half = Math.ceil(words.length / 2);
      s += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (y1 + 16) + '" text-anchor="middle" fill="#c9d4e0" font-size="11">' + esc(words.slice(0, half).join(' ')) + '</text>';
      s += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (y1 + 30) + '" text-anchor="middle" fill="#c9d4e0" font-size="11">' + esc(words.slice(half).join(' ')) + '</text>';
      cum += v; line += (i ? 'L' : 'M') + (x + bw / 2).toFixed(1) + ' ' + yc(cum / tot).toFixed(1);
    });
    s += '<path d="' + line + '" fill="none" stroke="#e6edf5" stroke-width="2"/>';
    cum = 0; items.forEach(([, v], i) => { cum += v; s += '<circle cx="' + (x0 + i * bw + bw / 2).toFixed(1) + '" cy="' + yc(cum / tot).toFixed(1) + '" r="3.5" fill="#e6edf5"/>'; });
    s += '<text x="' + (x1 + 4) + '" y="' + (yc(1) + 4) + '" fill="#e6edf5" font-size="11">100%</text>';
    s += '<text x="' + x0 + '" y="' + (H - 6) + '" fill="#8a99ad" font-size="11">bars: contribution (' + esc(k.unit) + ') · line: cumulative %</text>';
    return s + '</svg>';
  }

  function kpiPage(k) {
    return {
      id: k.id, title: 'Pareto: ' + k.short, ch: 'Pareto: +20 % on 3 KPIs', build(p) {
        p.appendChild(h('h2', { class: 'af-ph' }, 'Improve ' + k.name.toLowerCase() + ' by 20 %'));
        p.appendChild(h('p', { class: 'h-sub', html: '<b>Why this KPI:</b> ' + k.why }));
        const tot = k.contrib.reduce((a, x) => a + x[1], 0), top2 = k.contrib.slice().sort((a, b) => b[1] - a[1]).slice(0, 2);
        const target = k.better === 'lower' ? k.base * 0.8 : k.base * 1.2;
        p.appendChild(h('div', { class: 'cs-grid' },
          h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, '1 · Where does it come from? (Pareto chart)'),
            h('div', { html: paretoSvg(k) }),
            h('p', { class: 'muted', style: 'font-size:13px', html: (k.contribNote || 'Breakdown of today\'s ' + k.base + ' ' + k.unit + '.') + ' Illustrative values ' + B('est') + '.' }),
            h('div', { class: 'af-plain', html: '<b>Pareto reading:</b> the top two items, <b>' + top2[0][0] + '</b> and <b>' + top2[1][0] + '</b>, make up <b>' + Math.round(100 * (top2[0][1] + top2[1][1]) / tot) + ' %</b> of the total. Start there.' })),
          h('div', { class: 'card cs-levers' }, h('h3', { style: 'margin-top:0' }, '2 · Pick levers to reach the target'),
            h('div', { class: 'cs-target' }), h('div', { class: 'cs-lever-list' }), h('div', { class: 'cs-rec' }))));
        const targetEl = p.querySelector('.cs-target'), list = p.querySelector('.cs-lever-list'), recEl = p.querySelector('.cs-rec');
        const on = k.levers.map(l => !!l.rec);
        k.levers.forEach((l, i) => {
          const cb = h('input', { type: 'checkbox' }); cb.checked = on[i];
          cb.addEventListener('change', () => { on[i] = cb.checked; upd(); });
          list.appendChild(h('label', { class: 'cs-lever' + (l.trap ? ' trap' : '') }, cb,
            h('div', null, h('div', { class: 'cs-lv-top' }, h('b', null, l.n), h('span', { class: 'cs-gain' }, (k.better === 'lower' ? '−' : '+') + l.g + ' ' + (k.unit === 'dB' ? 'dB' : k.unit.split(' ')[0]))),
              h('div', { class: 'cs-lv-d', html: l.d }),
              h('div', { class: 'cs-lv-m', html: '<span>effort: <b>' + l.eff + '</b></span><span>time: <b>' + l.time + '</b></span>' + (l.rec ? '<span class="cs-recb">recommended</span>' : '') }),
              h('div', { class: 'cs-lv-s', html: '↳ ' + l.side }))));
        });
        function upd() {
          const g = k.levers.reduce((a, l, i) => a + (on[i] ? l.g : 0), 0);
          const val = k.better === 'lower' ? k.base - g : k.base + g;
          const pct = 100 * g / k.base, ok = pct >= 20 - 1e-9, trap = k.levers.some((l, i) => on[i] && l.trap);
          targetEl.innerHTML = '<div class="cs-tgt-row"><span>today <b>' + k.base.toFixed(k.fmt) + '</b></span><span>target <b>' + target.toFixed(k.fmt) + '</b></span><span>with your levers <b class="' + (ok ? 'ok' : 'no') + '">' + val.toFixed(k.fmt) + '</b> ' + esc(k.unit) + '</span></div>' +
            '<div class="cs-prog"><i style="width:' + Math.min(100, pct / 30 * 100).toFixed(1) + '%;background:' + (ok ? 'var(--accent)' : 'var(--warn)') + '"></i><span class="cs-mark" style="left:' + (20 / 30 * 100).toFixed(1) + '%"></span></div>' +
            '<div class="cs-pct">' + (k.better === 'lower' ? '−' : '+') + pct.toFixed(0) + ' % ' + (ok ? '✅ meets the 20 % goal' : '— not yet 20 %') + (trap ? ' · ⚠️ includes a trap lever' : '') + '</div>';
        }
        upd();
        const recs = k.levers.filter(l => l.rec), rg = recs.reduce((a, l) => a + l.g, 0);
        recEl.innerHTML = '<div class="callout"><b>Recommended approach</b> (pre-selected): ' + recs.map(l => l.n).join(' · ') + '. Together <b>' + (k.better === 'lower' ? '−' : '+') + (100 * rg / k.base).toFixed(0) + ' %</b>, using mostly low-to-medium-effort levers aimed at the biggest Pareto bars. The others are next-generation options.</div>';
        C.linkify(p);
      }
    };
  }

  // ================================================================ course
  C.course.register({
    id: 'cases', title: 'Case Studies & Pareto', icon: '🧪', order: 9.75, storeKey: 'cases-last-step',
    finish: { go: 'landscape', label: 'Continue: Industry Landscape →' },
    pages: [
      { id: 'start', title: 'Welcome', ch: 'Start', build(p, ctx) {
        p.appendChild(h('div', { class: 'af-hero' },
          h('div', { class: 'af-eyebrow' }, 'Guided course · hands-on · about 45–60 minutes'),
          h('h1', { html: 'Engineering <em>case studies</em> and a <em>Pareto</em> plan' }),
          h('p', { html: 'Six realistic CPO-switch problems, each solved the way a system engineer would: read the telemetry, form a hypothesis, <b>reproduce it in the app\'s tools</b> (KPIs, Data-Flow Simulator, Noise Lab, Budgets) with one click, name the root cause, then fix it and prevent it. After that, a <b>Pareto analysis</b> shows how to improve the three main KPIs by 20 %.' }),
          h('div', { class: 'af-cta' },
            h('button', { class: 'btn primary af-bignext', onclick: () => ctx.next() }, 'Start →'),
            ctx.resumeId && ctx.resumeId !== 'start' && ctx.resumeId !== 'done' ? h('button', { class: 'btn', onclick: () => ctx.goId(ctx.resumeId) }, 'Resume where you left off') : null)));
        p.appendChild(h('div', { class: 'grid2' },
          h('div', { class: 'card', html: '<h3 style="margin-top:0">The debug method used in every case</h3><ol class="af-route">' +
            '<li><b>Symptom:</b> what exactly is wrong, where, and since when?</li>' +
            '<li><b>Correlate:</b> which ports, lasers, temperatures, loads or changes line up with it?</li>' +
            '<li><b>Hypothesis:</b> which physical mechanism fits <i>all</i> the clues?</li>' +
            '<li><b>Reproduce:</b> inject that fault in a model or the lab and check you get the same signature.</li>' +
            '<li><b>Root cause → fix → verify</b>, then <b>prevent</b>: a test, an alarm or a spec change so it never surprises you again.</li></ol>' }),
          h('div', { class: 'card', html: '<h3 style="margin-top:0">Which tool answers which question</h3><table class="table">' +
            '<tr><td>🎯 KPIs</td><td>What should this number be? How is it measured?</td></tr>' +
            '<tr><td>⚡ Data-Flow</td><td>What does this fault do to the whole link: power, BER, FEC, queues, flaps?</td></tr>' +
            '<tr><td>〰️ Noise Lab</td><td>Which noise source is it, and what does it do to the eye?</td></tr>' +
            '<tr><td>📊 Budgets</td><td>How much margin is left? Which item buys it back?</td></tr></table>' })));
        p.appendChild(h('div', { class: 'callout', html: 'Telemetry in these cases is <b>synthetic and illustrative</b> ' + B('est') + ', modelled on typical failure mechanisms. It is not data from real NVIDIA products.' }));
      } }
    ].concat(CASES.map(casePage)).concat([
      { id: 'pareto', title: 'The Pareto method', ch: 'Pareto: +20 % on 3 KPIs', build(p) {
        p.appendChild(h('h2', { class: 'af-ph' }, 'Pareto: improve the three main KPIs by 20 %'));
        p.appendChild(h('p', { class: 'h-sub' }, 'The Pareto principle: roughly 80 % of an effect comes from 20 % of its causes. So measure the breakdown first, attack the biggest bars, and check what each lever does to the other KPIs.'));
        p.appendChild(h('div', { class: 'grid3', html:
          '<div class="card"><h4 style="margin:0 0 6px;color:var(--accent)">⚡ Energy per bit</h4><p style="margin:0">Power, cooling and cost per bit, and the headline CPO claim.</p></div>' +
          '<div class="card"><h4 style="margin:0 0 6px;color:var(--accent)">🔗 Link interruption rate</h4><p style="margin:0">Reliability as customers feel it: every flap can stall a whole training job.</p></div>' +
          '<div class="card"><h4 style="margin:0 0 6px;color:var(--accent)">📏 Optical link margin</h4><p style="margin:0">The safety buffer against aging, dirt, temperature and variation, which drives yield and field failures.</p></div>' }));
        p.appendChild(h('h3', null, 'The method, step by step'));
        p.appendChild(h('ol', { html:
          '<li><b>Baseline</b> the KPI and <b>break it down</b> into contributors (measured where possible).</li>' +
          '<li><b>Sort</b> the contributors largest first and draw the cumulative line: a Pareto chart.</li>' +
          '<li>List <b>levers</b> for the top bars, each with an estimated gain, effort, time and side effects.</li>' +
          '<li>Pick the <b>smallest set</b> that reaches the goal, preferring low effort and levers that help several KPIs.</li>' +
          '<li>Check <b>cross-KPI effects</b>: avoid levers that win one KPI and lose another.</li>' +
          '<li><b>Verify</b> with measurements, then update the budgets.</li>' }));
        p.appendChild(h('div', { class: 'callout warn', html: 'All numbers on the next three pages are <b>illustrative estimates</b> ' + B('est') + ' for teaching the method. Replace them with your team\'s measured breakdowns.' }));
      } }
    ]).concat(KPIS.map(kpiPage)).concat([
      { id: 'pareto-plan', title: 'The combined plan', ch: 'Pareto: +20 % on 3 KPIs', build(p) {
        p.appendChild(h('h2', { class: 'af-ph' }, 'The combined plan: levers vs all three KPIs'));
        p.appendChild(h('p', { class: 'h-sub' }, 'A lever that helps one KPI can hurt another. Before committing, check every lever against all three.'));
        const Y = '<span style="color:var(--accent)">▲ helps</span>', N = '<span style="color:var(--bad)">▼ hurts</span>', O = '<span class="muted">—</span>', y = '<span style="color:var(--accent)">△ a little</span>', n = '<span style="color:var(--warn)">▽ a little</span>';
        p.appendChild(h('table', { class: 'table', html: '<tr><th>Lever</th><th>Energy / bit</th><th>Interruptions</th><th>Link margin</th><th>Verdict</th></tr>' +
          '<tr><td><b>Reduce optical loss</b> (couplers, connectors, cleaning)</td><td>' + Y + '</td><td>' + Y + '</td><td>' + Y + '</td><td><b style="color:var(--accent)">Golden lever: do it</b></td></tr>' +
          '<tr><td>Predictive laser replacement</td><td>' + O + '</td><td>' + Y + '</td><td>' + y + '</td><td>Quick win</td></tr>' +
          '<tr><td>Inspect-before-connect + Rx baselines</td><td>' + O + '</td><td>' + Y + '</td><td>' + Y + '</td><td>Quick win</td></tr>' +
          '<tr><td>Per-ring bias/drive calibration</td><td>' + y + '</td><td>' + O + '</td><td>' + Y + '</td><td>Quick win</td></tr>' +
          '<tr><td>Right-size SerDes equalization</td><td>' + Y + '</td><td>' + O + '</td><td>' + n + '</td><td>Do it, verify margin</td></tr>' +
          '<tr><td>Lower heater power</td><td>' + Y + '</td><td>' + n + '</td><td>' + O + '</td><td>Keep lock headroom</td></tr>' +
          '<tr><td>Ring-lock feed-forward</td><td>' + O + '</td><td>' + Y + '</td><td>' + y + '</td><td>Medium term</td></tr>' +
          '<tr><td><b>Raise laser power</b></td><td>' + N + '</td><td>' + N + '</td><td>' + Y + '</td><td><b style="color:var(--bad)">Trap: avoid</b></td></tr>' }));
        p.appendChild(h('h3', null, 'Roadmap'));
        p.appendChild(h('div', { class: 'grid3', html:
          '<div class="card"><h4 style="margin:0 0 6px;color:var(--accent)">Now · 0–3 months</h4><ul style="margin:0;padding-left:18px"><li>Inspect-before-connect procedure</li><li>Rx-power baselines + alarms</li><li>Laser drive-current trending</li><li>Idle-lane power-down</li><li>Per-ring calibration</li></ul></div>' +
          '<div class="card"><h4 style="margin:0 0 6px;color:var(--accent)">Next · 3–9 months</h4><ul style="margin:0;padding-left:18px"><li>SerDes right-sizing for the mm channel</li><li>Ring-lock feed-forward</li><li>Heater-power reduction</li><li>Load-step and BER-vs-load regression tests</li></ul></div>' +
          '<div class="card"><h4 style="margin:0 0 6px;color:var(--accent)">Later · next generation</h4><ul style="margin:0;padding-left:18px"><li>Lower-loss couplers</li><li>Higher-efficiency lasers</li><li>More efficient rings</li><li>Lower-noise receivers</li></ul></div>' }));
        p.appendChild(h('div', { class: 'af-plain', html: '<b>The big insight:</b> almost every problem in the case studies, and most of the Pareto bars, trace back to <b>optical loss and its variability</b> (connectors, couplers, laser aging). Reducing loss improves all three KPIs at once. Turning the laser up instead wins margin but loses on power and reliability.' }));
      } },
      { id: 'done', title: 'Your playbook', ch: 'Finish', build(p, ctx) {
        p.appendChild(h('div', { class: 'af-hero' },
          h('div', { class: 'af-eyebrow' }, 'Done'),
          h('h1', { html: 'Your <em>debug playbook</em>' }),
          h('table', { class: 'table', html: '<tr><th>Signature</th><th>Think first of…</th><th>Check</th></tr>' +
            '<tr><td>Several lanes on one laser degrade slowly together</td><td>laser aging</td><td>drive-current trend, ELS monitor</td></tr>' +
            '<tr><td>Error bursts at load or temperature steps that recover</td><td>ring-lock loop / thermal transient</td><td>ring error, heater headroom, dT/dt</td></tr>' +
            '<tr><td>One port, steady loss step after handling</td><td>dirty or damaged connector</td><td>Rx power vs baseline, fiber scope</td></tr>' +
            '<tr><td>BER depends on neighbouring lanes</td><td>WDM crosstalk</td><td>all-lanes-active test, ring Q per lot</td></tr>' +
            '<tr><td>Drops / latency with clean BER</td><td>congestion, not optics</td><td>queues, ECN, drops</td></tr>' +
            '<tr><td>BER changes with load after a power/firmware change</td><td>supply ripple → jitter</td><td>rail ripple, BER-vs-load sweep</td></tr>' }),
          h('div', { class: 'af-cta' },
            h('button', { class: 'btn primary', onclick: () => C.go('kpis') }, 'Go to the KPI catalogue →'),
            h('button', { class: 'btn', onclick: () => C.go('dataflow') }, 'Free play: Data-Flow Simulator'),
            h('button', { class: 'btn', onclick: () => ctx.goId('start') }, '↺ Restart'))));
      } }
    ])
  });
})();
