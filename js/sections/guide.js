/* How-to-use guide section */
(function () {
  'use strict';
  const C = window.CPO;

  const css = `
  .gd-hero{display:grid;grid-template-columns:1.2fr 1fr;gap:20px;align-items:center}
  @media (max-width:1000px){.gd-hero{grid-template-columns:1fr}}
  .gd-steps{counter-reset:s;list-style:none;padding:0;margin:0}
  .gd-steps li{counter-increment:s;position:relative;padding:8px 0 8px 42px}
  .gd-steps li::before{content:counter(s);position:absolute;left:0;top:7px;width:28px;height:28px;border-radius:50%;
    background:rgba(118,185,0,.15);border:1px solid var(--accent);color:var(--accent);display:grid;place-items:center;font-weight:700;font-size:13px}
  .gd-sec{display:grid;grid-template-columns:52px 1fr;gap:14px;align-items:start}
  .gd-ico{font-size:28px;width:52px;height:52px;border-radius:12px;display:grid;place-items:center;background:var(--panel2);border:1px solid var(--line)}
  .gd-sec h3{margin:0 0 4px;color:var(--text)}
  .gd-sec ul{margin:6px 0 0;padding-left:18px}
  .gd-sec li{margin:3px 0}
  .gd-kbd{font-family:var(--mono);font-size:12px;background:#05080b;border:1px solid var(--line);border-bottom-width:2px;border-radius:5px;padding:1px 6px}
  .gd-open{margin-top:10px}
  .gd-toc{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 18px}
  .gd-toc a{text-decoration:none}
  .gd-demo{width:100%;height:auto;border-radius:12px;border:1px solid var(--line);background:#05080b}
  `;

  const sections = [
    { id: 'home', ico: '🏠', t: 'Overview', what: 'Big-picture intro: what CPO is, why NVIDIA builds it, the public product facts and a 4-week study plan.',
      how: ['Read the pluggable-vs-CPO animation first: it is the "why" behind every design choice in the rest of the app.',
        'Tick off items in the 4-week study plan. Ticks are saved in this browser only (localStorage), so each device keeps its own progress.',
        'Use the learning-path cards to jump to any section.'] },
    { id: 'factory', ico: '🏭', t: 'AI Factory Course', what: 'A guided, plain-language course you click through with Next: 11 zoom levels (AI factory, network topology, NVL72 rack, compute tray, GPU package, die, SM, Tensor Core, logic gates, CMOS, transistor), 4 "put it together" steps, and a 4-chapter appendix (the AI factory, network topologies, how GPUs work, how AI jobs use the network). Every level shows how it connects to the CPO switches.',
      how: ['Just press <b>Next →</b> (or the <span class="gd-kbd">→</span> key). <b>← Back</b> or <span class="gd-kbd">←</span> goes back. The diagram zooms into the next level by itself.',
        'The progress bar at the top shows where you are; <b>☰ Contents</b> lets you jump. Your place is remembered, so you can resume later.',
        'Read the <b>"In plain words"</b> box first, then the orange <b>"Connection to the CPO switch"</b> box.',
        'In the gate, CMOS and transistor levels you can <b>click the inputs or the gate</b> to flip them yourself. The appendix has small calculators to play with.'] },
    { id: 'architecture', ico: '🔬', t: 'Architecture Explorer', what: 'The centerpiece: a zoomable map of the whole system, 67 levels deep, from the AI-factory network down to transistors, ring resonators and laser quantum wells.',
      how: ['<b>Guided tour:</b> press <b>Next ▶</b> (or <span class="gd-kbd">→</span>) to visit every block in order, from the system down to the deepest physics; <b>◀ Prev</b> / <span class="gd-kbd">←</span> goes back.',
        'Or explore freely: <b>click a glowing region</b> in the diagram to zoom into that block. Hover a region to see its label.',
        '<b>Zoom out:</b> <span class="gd-kbd">Esc</span> or <b>↑ Up</b>. <b>← Back</b> returns to where you were. Click any breadcrumb to jump to that level.',
        '<b>🗺 Tree</b> opens the full node tree with a filter box, which is the fastest way to jump anywhere ("ring", "vrm", "tia"…).',
        '<b>🏷 Labels</b> shows every hotspot label at once, useful on a touch screen where you cannot hover.',
        '<b>Overlay chips</b> (Data, Optics, Power, Control, Thermal, Sensing) highlight one domain and dim the rest. You can combine them.',
        'The <b>right panel tabs</b> give each block\'s Overview, Needs, Interfaces, KPIs, Physics, Failure modes and Monitoring, plus a list of child blocks.',
        'Some deep scenes (ring physics, MRM junction, ring-lock loop, TIA, laser, fiber, etc.) have <b>sliders and buttons inside the diagram</b>. Drag them to change the physics live.',
        'Gray dashed regions are cross-links to blocks in another branch: clicking them still works.'] },
    { id: 'kpis', ico: '🎯', t: 'KPIs', what: '35 key performance indicators of a CPO switch: definition, formula, typical target, what limits it and how it is measured.',
      how: ['Type in the search box or click a category chip to filter.', 'The radar chart compares pluggable optics vs CPO on normalized axes (illustrative).'] },
    { id: 'dataflow', ico: '⚡', t: 'Data-Flow Simulator', what: 'A live simulation of traffic crossing the whole pipe: NIC → optical engine → switch ASIC → optical engine → fiber.',
      how: ['<b>Click any stage</b> in the pipeline to open its detail panel and oscilloscope probe (bits, PAM4 levels, optical power, photocurrent, eye).',
        'Use <b>play / pause / speed</b> to slow down to symbol level.', 'Toggle <b>Pluggable vs CPO</b> to see the extra trace, retimer, power and latency.',
        'Try the <b>presets</b> or inject impairments (laser drop, ring detuning, extra loss, crosstalk), then watch pre-FEC BER, FEC corrections and link flaps.',
        'Open "How this is computed" to see the exact formulas behind the numbers.'] },
    { id: 'noise', ico: '〰️', t: 'Noise & Signal Integrity Lab', what: 'Every noise source in the link, how it enters, and what it does to a live PAM4 eye.',
      how: ['<b>Signal Lab</b>: move the noise sliders and watch the eye, histograms, SNR, BER and bathtub curve react. Start from a preset (Clean → Worst case).',
        '<b>Noise Sources</b>: 16 cards with physics, equation, typical magnitude and mitigation. Hover a card to see where it enters the chain.',
        '<b>Spectrum</b>: noise density vs frequency. <b>Math & Formulas</b>: every equation the lab uses.'] },
    { id: 'budgets', ico: '📊', t: 'System Budgets', what: 'Interactive budgets: optical link, BER/FEC, power, thermal, accuracy/control and jitter.',
      how: ['Each tab has sliders. The charts, margins and the "what dominates / design levers" callout update live.',
        'Good exercise: make the link fail (negative margin), then fix it with the cheapest lever.'] },
    { id: 'glossary', ico: '📖', t: 'Glossary', what: '659 abbreviations and terms used across CPO, SerDes, packaging, power, thermal and management.',
      how: ['Search, filter by category, or use the A–Z bar.', 'Click a term inside a definition to jump to it.'] },
  ];

  function demoSvg() {
    const s = C.s;
    const svg = s('svg', { viewBox: '0 0 420 220', class: 'gd-demo', 'aria-label': 'Zoom animation demo' });
    const g = s('g', {});
    const chassis = s('rect', { x: 20, y: 20, width: 380, height: 180, rx: 10, fill: '#0d141c', stroke: '#243042' });
    const pkg = s('rect', { x: 160, y: 70, width: 100, height: 80, rx: 6, fill: '#122013', stroke: '#76b900', 'stroke-width': 2 });
    const asic = s('rect', { x: 190, y: 92, width: 40, height: 36, rx: 3, fill: '#1b2a10', stroke: '#9bd43a' });
    const oes = [[168, 78], [236, 78], [168, 132], [236, 132]].map(([x, y]) => s('rect', { x, y, width: 16, height: 10, rx: 2, fill: '#ff6b3d' }));
    const fibers = [0, 1, 2].map(i => s('line', { x1: 260, y1: 95 + i * 15, x2: 395, y2: 95 + i * 15, stroke: '#ff6b3d', 'stroke-opacity': .5, 'stroke-width': 1.5, 'stroke-dasharray': '6 8' }));
    const cursor = s('path', { d: 'M0 0 L0 16 L4 12 L7 19 L10 18 L7 11 L12 11 Z', fill: '#fff', stroke: '#000', 'stroke-width': .8 });
    const label = s('text', { x: 30, y: 40, fill: '#8a99ad', 'font-size': 12, 'font-family': 'Segoe UI, sans-serif' }, 'Switch chassis');
    g.append(chassis, ...fibers, pkg, asic, ...oes, label);
    svg.append(g, cursor);
    const labels = ['Switch chassis', 'Switch package', 'ASIC + optical engines'];
    return { svg, g, cursor, pkg, label, labels, fibers };
  }

  function render(el) {
    el.appendChild(C.h('style', { html: css }));
    el.appendChild(C.h('h1', null, 'How to use this app'));
    el.appendChild(C.h('p', { class: 'h-sub' }, 'A five-minute guide to getting the most out of CPO Switch Academy, on a laptop, tablet or phone.'));

    const d = demoSvg();
    el.appendChild(C.h('div', { class: 'gd-hero' },
      C.h('div', { class: 'card' },
        C.h('h3', { style: 'margin-top:0' }, 'Quick start'),
        C.h('ol', { class: 'gd-steps', html:
          '<li>Use the <b>left menu</b> to switch sections. On narrow screens it shrinks to icons.</li>' +
          '<li>Start with the <b>AI Factory Course</b> and just press <b>Next</b> until the end, then continue with the <b>Architecture Explorer</b> tour (also Next, Next…).</li>' +
          '<li>Use <b>Next ▶</b> / the <span class="gd-kbd">→</span> key to move step by step; you never have to choose where to click.</li>' +
          '<li><b>Hover any dotted-underlined abbreviation</b> (e.g. ' + C.tip('MRM') + ') for its definition. <span class="gd-kbd">Alt</span>+click opens it in the Glossary.</li>' +
          '<li>Move the <b>sliders</b> in the Simulator, Noise Lab and Budgets and watch everything update live.</li>' })),
      C.h('div', null, d.svg, C.h('div', { class: 'muted', style: 'font-size:12px;margin-top:4px' }, 'Demo: click a region → the view zooms into it.'))));

    // animate demo: cursor moves to package, view zooms, then resets
    let stop = null;
    const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) {
      stop = C.loop((dt, t) => {
        const p = t % 6;
        let cx, cy, z = 1, ox = 0, oy = 0, li = 0;
        if (p < 1.6) { const k = p / 1.6; cx = C.lerp(60, 205, k); cy = C.lerp(180, 105, k); }
        else if (p < 2.0) { cx = 205; cy = 105; d.pkg.setAttribute('stroke-width', 4); }
        else if (p < 3.0) { const k = (p - 2) / 1; const e = k * k * (3 - 2 * k); z = C.lerp(1, 3.2, e); ox = 210; oy = 110; cx = -50; cy = -50; li = 1; }
        else if (p < 5.2) { z = 3.2; ox = 210; oy = 110; cx = -50; cy = -50; li = 2; }
        else { const k = (p - 5.2) / .8; z = C.lerp(3.2, 1, k); ox = 210; oy = 110; cx = -50; cy = -50; li = 0; }
        if (p < 2.0 && p >= 1.6) { } else d.pkg.setAttribute('stroke-width', 2);
        d.g.setAttribute('transform', z === 1 ? '' : 'translate(' + ox + ' ' + oy + ') scale(' + z + ') translate(' + (-ox) + ' ' + (-oy) + ')');
        d.cursor.setAttribute('transform', 'translate(' + cx + ' ' + cy + ')');
        d.label.textContent = d.labels[li];
        d.fibers.forEach((f, i) => f.setAttribute('stroke-dashoffset', -t * 30 - i * 4));
      });
    }

    el.appendChild(C.h('h2', null, 'Section by section'));
    el.appendChild(C.h('div', { class: 'gd-toc' }, sections.map(s => C.h('a', { href: '#guide', class: 'pill', onclick: e => { e.preventDefault(); const t = document.getElementById('gd-' + s.id); t && t.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, s.ico + ' ' + s.t))));
    const grid = C.h('div', { class: 'grid2' });
    for (const s of sections) {
      grid.appendChild(C.h('div', { class: 'card gd-sec', id: 'gd-' + s.id },
        C.h('div', { class: 'gd-ico' }, s.ico),
        C.h('div', null,
          C.h('h3', null, s.t),
          C.h('div', { class: 'muted' }, s.what),
          C.h('ul', { html: s.how.map(x => '<li>' + x + '</li>').join('') }),
          C.h('button', { class: 'btn gd-open', onclick: () => C.go(s.id) }, 'Open ' + s.t + ' →'))));
    }
    el.appendChild(grid);

    el.appendChild(C.h('h2', null, 'Reading the numbers'));
    el.appendChild(C.h('div', { class: 'grid3' },
      C.h('div', { class: 'card', html: C.badge('nv') + '<p>Figures NVIDIA has <b>announced publicly</b> (e.g. GTC 2025 Quantum-X / Spectrum-X Photonics: 115 Tb/s, 3.5× power efficiency, 4× fewer lasers).</p>' }),
      C.h('div', { class: 'card', html: C.badge('typ') + '<p><b>Industry-typical</b> values from public literature and standards, for orientation only. Confirm against internal NVIDIA specs.</p>' }),
      C.h('div', { class: 'card', html: C.badge('est') + '<p><b>Model assumptions or estimates</b> used by the simulators and budgets. They are good for intuition, not for design sign-off.</p>' })));

    el.appendChild(C.h('h2', null, 'Tips'));
    el.appendChild(C.h('div', { class: 'grid2' },
      C.h('div', { class: 'card', html: '<h3 style="margin-top:0">Links & bookmarks</h3><ul>' +
        '<li>Every view has its own address, e.g. <code>#architecture/ring-physics</code> or <code>#budgets/fec</code>. Bookmark or share it.</li>' +
        '<li>The browser Back button works between views.</li>' +
        '<li>Glossary entries open directly with <code>#glossary/TERM</code>.</li></ul>' }),
      C.h('div', { class: 'card', html: '<h3 style="margin-top:0">Phone & tablet</h3><ul>' +
        '<li>Best experience is landscape on a tablet or a laptop. The explorer and labs are wide.</li>' +
        '<li>No hover on touch screens: turn on <b>🏷 Labels</b> in the explorer and tap abbreviations to see their meaning.</li>' +
        '<li>Progress (study-plan ticks) is stored per device.</li></ul>' }),
      C.h('div', { class: 'card', html: '<h3 style="margin-top:0">Suggested route (first day)</h3><ol>' +
        '<li>Overview → why CPO.</li><li>Explorer: system → chassis → package → optical engine → PIC → MRM → ring physics.</li>' +
        '<li>Back up to chassis → External laser and Fiber plant.</li><li>Data-Flow Simulator with the CPO vs pluggable toggle.</li>' +
        '<li>Noise Lab → Budgets → link budget.</li></ol>' }),
      C.h('div', { class: 'card', html: '<h3 style="margin-top:0">Keyboard</h3><ul>' +
        '<li><span class="gd-kbd">Esc</span>: zoom out one level, or close the node tree.</li>' +
        '<li><span class="gd-kbd">Alt</span> + click an abbreviation: open it in the Glossary.</li>' +
        '<li><span class="gd-kbd">Tab</span> / <span class="gd-kbd">Enter</span>: standard navigation through buttons and links.</li></ul>' })));

    return () => { if (stop) stop(); };
  }

  C.registerSection({ id: 'guide', title: 'How to Use', icon: '🧭', order: 5, render });
})();
