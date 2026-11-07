/* Home / Overview section */
(function () {
  'use strict';
  const h = CPO.h, s = CPO.s;

  CPO.addGlossary({
    'CPO': { full: 'Co-Packaged Optics', def: 'Optical engines placed on the same package substrate as the switch ASIC, replacing long electrical traces and pluggable modules.', cat: 'system' },
    'ELS': { full: 'External Laser Source', def: 'Front-panel-serviceable laser module that supplies continuous-wave light over fiber to the optical engines.', cat: 'optics' },
    'MRM': { full: 'Micro-Ring Modulator', def: 'Compact silicon ring resonator whose resonance is shifted electrically to modulate a CW laser.', cat: 'optics' },
    'COUPE': { full: 'Compact Universal Photonic Engine', def: 'TSMC silicon-photonics engine platform using SoIC 3D stacking of an electronic IC on a photonic IC.', cat: 'optics' },
    'DSP': { full: 'Digital Signal Processor', def: 'Retimer/equalizer chip inside pluggable modules that cleans up the electrical signal; a major power and latency contributor.', cat: 'electrical' },
    'SerDes': { full: 'Serializer/Deserializer', def: 'High-speed electrical I/O block of the switch ASIC (here 200 Gb/s-per-lane class).', cat: 'electrical' },
    'PAM4': { full: '4-level Pulse Amplitude Modulation', def: 'Modulation with 4 amplitude levels, 2 bits per symbol; 200G/lane runs about 106-113 GBd.', cat: 'electrical' },
    'WDM': { full: 'Wavelength Division Multiplexing', def: 'Several wavelengths carried on one fiber.', cat: 'optics' }
  });

  const PLAN = [
    { t: 'Week 1', n: 'Foundations', items: [
      'Read the Overview and why-CPO explainer', 'Explore Architecture from system down to the optical engine',
      'Learn lane math: 200G PAM4, baud rate, FEC overhead', 'Skim the Glossary and tag 20 unfamiliar terms'] },
    { t: 'Week 2', n: 'Photonics deep dive', items: [
      'Micro-ring physics: Q, FSR, thermal drift', 'Ring lock loop and heater control',
      'External laser source: power, wavelength, safety', 'Fiber plant: connectors, loss and return loss'] },
    { t: 'Week 3', n: 'System & KPIs', items: [
      'Study the KPI catalogue; memorize pre-FEC BER threshold', 'Run the Data-flow simulator with different impairments',
      'Use the Noise lab to see SNR vs BER', 'Review power and thermal delivery nodes'] },
    { t: 'Week 4', n: 'Budgets & ownership', items: [
      'Work the Budgets section: link, power and thermal', 'Trace a failure end-to-end (laser droop, ring unlock)',
      'Write your own KPI dashboard for a bring-up', 'Meet the team: list 5 open questions to ask'] }
  ];

  const PATH = [
    ['architecture', '🧩', 'Architecture', 'Zoom from the rack to the transistor. Every block: function, interfaces, KPIs, failure modes.'],
    ['kpis', '🎯', 'KPIs', 'The numbers that define a CPO switch: optical, electrical, power, thermal, reliability.'],
    ['dataflow', '🌊', 'Data flow', 'Watch packets become light and back; inspect each stage of the lane.'],
    ['noise', '📉', 'Noise lab', 'Interactive SNR, eye diagrams and BER: what noise sources dominate and why.'],
    ['budgets', '🧮', 'Budgets', 'Optical loss, power and thermal budgets with live sliders.'],
    ['glossary', '📖', 'Glossary', 'Every acronym with a definition. Hover any dotted term anywhere in the app.']
  ];

  function heroCanvas(canvas, host) {
    const ctx = canvas.getContext('2d');
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W = 0, H = 0, dpr = 1;
    const FIB = 9;
    const parts = [];
    for (let i = 0; i < FIB; i++) for (let k = 0; k < 4; k++) parts.push({ f: i, p: Math.random(), v: 0.12 + Math.random() * 0.1 });
    function size() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = host.clientWidth; H = host.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    window.addEventListener('resize', size);
    function bez(f, t) {
      const y0 = H * (0.12 + 0.76 * f / (FIB - 1));
      const cx = W * 0.78, cy = H * 0.5, ex = cx - W * 0.1;
      const ey = cy + (f - (FIB - 1) / 2) * H * 0.028;
      const x0 = -10, c1x = W * 0.35, c2x = W * 0.5;
      const u = 1 - t;
      return [u * u * u * x0 + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * ex,
        u * u * u * y0 + 3 * u * u * t * y0 + 3 * u * t * t * ey + t * t * t * ey];
    }
    function frame(dt, t) {
      if (W !== host.clientWidth || H !== host.clientHeight) size();
      ctx.clearRect(0, 0, W, H);
      const cx = W * 0.78, cy = H * 0.5, pw = Math.min(W * 0.2, 190), ph = Math.min(H * 0.55, 190);
      // fibers
      for (let f = 0; f < FIB; f++) {
        ctx.beginPath();
        for (let i = 0; i <= 40; i++) { const p = bez(f, i / 40); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
        ctx.strokeStyle = 'rgba(255,107,61,0.16)'; ctx.lineWidth = 1.5; ctx.stroke();
      }
      // package glow
      const pulse = 0.6 + 0.4 * Math.sin(t * 2);
      const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, pw * 1.6);
      g.addColorStop(0, 'rgba(118,185,0,' + (0.35 * pulse) + ')'); g.addColorStop(1, 'rgba(118,185,0,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - pw * 2, cy - pw * 2, pw * 4, pw * 4);
      ctx.fillStyle = '#0c1410'; ctx.strokeStyle = 'rgba(118,185,0,0.8)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(cx - pw / 2, cy - ph / 2, pw, ph, 8) : ctx.rect(cx - pw / 2, cy - ph / 2, pw, ph);
      ctx.fill(); ctx.stroke();
      // ASIC die
      ctx.fillStyle = 'rgba(118,185,0,' + (0.25 + 0.15 * pulse) + ')';
      ctx.fillRect(cx - pw * 0.22, cy - ph * 0.22, pw * 0.44, ph * 0.44);
      ctx.strokeStyle = 'rgba(118,185,0,0.9)'; ctx.strokeRect(cx - pw * 0.22, cy - ph * 0.22, pw * 0.44, ph * 0.44);
      // micro rings around die
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2;
        const rx = cx + Math.cos(a) * pw * 0.38, ry = cy + Math.sin(a) * ph * 0.38;
        const ph2 = 0.5 + 0.5 * Math.sin(t * 3 + i * 0.9);
        ctx.beginPath(); ctx.arc(rx, ry, 4 + ph2 * 2, 0, 6.283);
        ctx.strokeStyle = 'rgba(34,211,238,' + (0.4 + 0.5 * ph2) + ')'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 8 * ph2; ctx.stroke(); ctx.shadowBlur = 0;
      }
      // photons
      for (const q of parts) {
        q.p += q.v * dt; if (q.p > 1) q.p -= 1;
        const p = bez(q.f, q.p), tail = bez(q.f, Math.max(0, q.p - 0.03));
        const grad = ctx.createLinearGradient(tail[0], tail[1], p[0], p[1]);
        grad.addColorStop(0, 'rgba(255,107,61,0)'); grad.addColorStop(1, q.p > 0.9 ? 'rgba(34,211,238,1)' : 'rgba(255,140,90,1)');
        ctx.strokeStyle = grad; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(tail[0], tail[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
      }
    }
    if (reduce) { frame(0, 1); return function () { window.removeEventListener('resize', size); }; }
    const stop = CPO.loop(frame);
    return function () { stop(); window.removeEventListener('resize', size); };
  }

  function dot(path, dur, color, delay, r) {
    const c = s('circle', { r: r || 3.5, fill: color, style: 'filter:drop-shadow(0 0 4px ' + color + ')' });
    c.appendChild(s('animateMotion', { path, dur: dur + 's', begin: (delay || 0) + 's', repeatCount: 'indefinite' }));
    return c;
  }
  function box(x, y, w, hh, label, col, sub) {
    return s('g', {},
      s('rect', { x, y, width: w, height: hh, rx: 6, fill: 'var(--panel2)', stroke: col, 'stroke-width': 1.5 }),
      s('text', { x: x + w / 2, y: y + hh / 2 + (sub ? -2 : 4), 'text-anchor': 'middle', fill: 'var(--text)', 'font-size': 12, 'font-weight': 600 }, label),
      sub ? s('text', { x: x + w / 2, y: y + hh / 2 + 12, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 10 }, sub) : null);
  }

  function pluggableSvg() {
    const svg = s('svg', { viewBox: '0 0 500 230', role: 'img', 'aria-label': 'Pluggable optics path' });
    const tr = 'M120 100 C150 60,170 140,200 100 S250 60,280 100';
    svg.append(
      s('rect', { x: 0, y: 40, width: 500, height: 120, rx: 8, fill: 'rgba(255,255,255,.015)' }),
      box(20, 70, 100, 60, 'Switch ASIC', 'var(--data)', 'SerDes'),
      s('path', { d: tr, fill: 'none', stroke: 'var(--data)', 'stroke-width': 2.5, opacity: .8 }),
      s('path', { d: tr, fill: 'none', stroke: 'var(--data)', 'stroke-width': 7, opacity: .12 }),
      box(280, 70, 70, 60, 'DSP', 'var(--power)', 'retimer'),
      box(350, 70, 80, 60, 'Optics', 'var(--optic)', 'laser+TIA'),
      s('path', { d: 'M430 100 L495 100', stroke: 'var(--optic)', 'stroke-width': 2 }),
      s('text', { x: 200, y: 36, 'text-anchor': 'middle', fill: 'var(--data)', 'font-size': 11 }, 'long electrical trace + connector'),
      s('text', { x: 250, y: 180, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 11 }, 'cm of PCB loss at ~100 GHz class -> DSP needed [typical]'),
      s('text', { x: 250, y: 200, 'text-anchor': 'middle', fill: 'var(--power)', 'font-size': 11 }, '~15-20 pJ/bit [typical]'),
      dot(tr, 2.6, 'var(--data)', 0), dot(tr, 2.6, 'var(--data)', 0.9), dot(tr, 2.6, 'var(--data)', 1.8),
      dot('M430 100 L495 100', 0.9, 'var(--optic)', 0), dot('M430 100 L495 100', 0.9, 'var(--optic)', 0.45));
    return svg;
  }
  function cpoSvg() {
    const svg = s('svg', { viewBox: '0 0 500 230', role: 'img', 'aria-label': 'CPO path' });
    svg.append(
      s('rect', { x: 0, y: 40, width: 500, height: 120, rx: 8, fill: 'rgba(255,255,255,.015)' }),
      s('rect', { x: 20, y: 55, width: 260, height: 90, rx: 8, fill: 'none', stroke: 'var(--accent)', 'stroke-dasharray': '4 3' }),
      box(110, 70, 80, 60, 'ASIC', 'var(--data)'),
      box(40, 80, 45, 40, 'OE', 'var(--optic)'),
      box(215, 80, 45, 40, 'OE', 'var(--optic)'),
      s('path', { d: 'M85 100 L110 100', stroke: 'var(--data)', 'stroke-width': 3 }),
      s('path', { d: 'M190 100 L215 100', stroke: 'var(--data)', 'stroke-width': 3 }),
      s('path', { d: 'M260 100 L420 100', stroke: 'var(--optic)', 'stroke-width': 2 }),
      box(420, 70, 75, 60, 'ELS', 'var(--optic)', 'external laser'),
      s('path', { d: 'M20 120 L10 120 M20 90 L10 90', stroke: 'var(--optic)' }),
      s('text', { x: 150, y: 36, 'text-anchor': 'middle', fill: 'var(--accent)', 'font-size': 11 }, 'mm-scale electrical link on one package'),
      s('text', { x: 250, y: 180, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 11 }, 'no DSP in the path; CW light from external laser [NVIDIA public design]'),
      s('text', { x: 250, y: 200, 'text-anchor': 'middle', fill: 'var(--accent)', 'font-size': 11 }, '~5 pJ/bit class target [typical]'),
      dot('M85 100 L110 100', 0.5, 'var(--data)', 0, 3), dot('M190 100 L215 100', 0.5, 'var(--data)', 0.25, 3),
      dot('M420 90 L260 90', 1.6, 'var(--optic)', 0), dot('M420 90 L260 90', 1.6, 'var(--optic)', 0.8),
      dot('M260 110 L130 110 L130 160', 1.9, 'var(--accent2)', 0.3, 3));
    return svg;
  }

  CPO.registerSection({
    id: 'home', title: 'Overview', icon: '🏠', order: 0,
    render(c) {
      // hero
      const canvas = h('canvas', { class: 'hm-canvas' });
      const hero = h('div', { class: 'hm-hero' }, canvas,
        h('div', { class: 'hm-hero-inner' },
          h('div', { class: 'hm-eyebrow' }, 'CPO Switch Academy'),
          h('h1', { html: 'Light-speed switching: <em>co-packaged optics</em> from rack to transistor' }),
          h('p', { html: 'An interactive deep dive for hardware engineers joining NVIDIA’s photonic networking effort. Zoom through the architecture, quantify the KPIs, break the link, and rebuild the budgets.' }),
          h('div', { class: 'hm-cta' },
            h('button', { class: 'btn primary', onclick: () => CPO.go('architecture') }, 'Start exploring the architecture'),
            h('button', { class: 'btn', onclick: () => CPO.go('kpis') }, 'Browse KPIs')),
          h('div', { class: 'hm-stats' },
            h('div', { class: 'hm-stat' }, h('b', {}, '115 Tb/s'), h('span', {}, 'Quantum-X Photonics')),
            h('div', { class: 'hm-stat' }, h('b', {}, '409.6 Tb/s'), h('span', {}, 'Spectrum-X Photonics (largest)')),
            h('div', { class: 'hm-stat' }, h('b', {}, '200G'), h('span', {}, 'per lane, PAM4')))));
      c.appendChild(hero);
      const stopHero = heroCanvas(canvas, hero);

      // explainer
      c.appendChild(h('h2', {}, 'What is CPO, and why does NVIDIA do it?'));
      c.appendChild(h('div', { class: 'grid2' },
        h('div', { class: 'card', html:
          '<p><b>The problem.</b> At 200 Gb/s per lane the electrical channel between the switch ASIC and a front-panel pluggable module is lossy: the signal needs a power-hungry ' + CPO.tip('DSP') + ' retimer in every module, and the ' + CPO.tip('SerDes') + ' must drive a long, high-loss trace. Tens of thousands of lasers and DSPs in an AI factory also mean more failures.</p>' +
          '<p><b>The idea.</b> Move the optical engine next to the ASIC, on the same package. The electrical link shrinks to millimetres, so SerDes power and the DSP largely vanish. The lasers move out to a serviceable ' + CPO.tip('ELS') + '; the package carries only modulators (' + CPO.tip('MRM') + ') and photodiodes.</p>' +
          '<p class="muted">Public NVIDIA claims versus pluggable transceivers ' + CPO.badge('nv') + ':</p>' }),
        h('div', { class: 'card', html:
          '<div class="hm-claims" style="margin-top:0;grid-template-columns:repeat(2,minmax(0,1fr))">' +
          '<div class="hm-claim"><b>3.5×</b><span>power efficiency</span></div>' +
          '<div class="hm-claim"><b>63×</b><span>signal integrity</span></div>' +
          '<div class="hm-claim"><b>10×</b><span>network resiliency</span></div>' +
          '<div class="hm-claim"><b>4×</b><span>fewer lasers</span></div>' +
          '<div class="hm-claim"><b>1.3×</b><span>faster deployment</span></div>' +
          '<div class="hm-claim"><span>' + CPO.badge('nv') + '<br>GTC 2025 announcements</span></div></div>' })));

      c.appendChild(h('div', { class: 'hm-legend' },
        h('span', { html: '<i style="background:var(--data)"></i>electrical data' }),
        h('span', { html: '<i style="background:var(--optic)"></i>optical (laser light)' }),
        h('span', { html: '<i style="background:var(--power)"></i>DSP / power-hungry' }),
        h('span', { html: '<i style="background:var(--accent)"></i>co-packaged' })));
      c.appendChild(h('div', { class: 'grid2' },
        h('div', { class: 'card hm-diagram' }, h('h3', {}, 'Pluggable optics'), pluggableSvg(),
          h('p', { class: 'hm-cap' }, 'ASIC SerDes drives a long channel to a front-panel module whose DSP re-conditions the signal; every module carries its own laser.')),
        h('div', { class: 'card hm-diagram' }, h('h3', {}, 'Co-packaged optics'), cpoSvg(),
          h('p', { class: 'hm-cap' }, 'Optical engines sit millimetres from the ASIC; CW light arrives from a detachable external laser source over fiber.'))));

      // products
      c.appendChild(h('h2', {}, 'Product facts'));
      c.appendChild(h('div', { class: 'grid2' },
        h('div', { class: 'card hm-prod' },
          h('h3', {}, 'NVIDIA Quantum-X Photonics '), h('span', { class: 'pill' }, 'InfiniBand'),
          h('div', { class: 'hm-big' }, h('div', {}, h('b', {}, '144'), h('span', {}, 'ports')), h('div', {}, h('b', {}, '800G'), h('span', {}, 'per port')), h('div', {}, h('b', {}, '115 Tb/s'), h('span', {}, 'aggregate'))),
          h('ul', { html: '<li>144 × 800 Gb/s, liquid-cooled ' + CPO.badge('nv') + '</li><li>200 Gb/s-per-lane SerDes class ' + CPO.badge('nv') + '</li><li>Based on Quantum-X800 generation silicon ' + CPO.badge('nv') + '</li><li>Micro-ring modulators in silicon photonics, TSMC COUPE ' + CPO.badge('nv') + '</li>' })),
        h('div', { class: 'card hm-prod' },
          h('h3', {}, 'NVIDIA Spectrum-X Photonics '), h('span', { class: 'pill' }, 'Ethernet'),
          h('div', { class: 'hm-big' }, h('div', {}, h('b', {}, '102.4T'), h('span', {}, '128×800G or 512×200G')), h('div', {}, h('b', {}, '409.6T'), h('span', {}, '512×800G or 2,048×200G'))),
          h('ul', { html: '<li>Two announced tiers: 102.4 Tb/s and 409.6 Tb/s ' + CPO.badge('nv') + '</li><li>1.6 Tb/s-class optical engines co-packaged around the ASIC ' + CPO.badge('nv') + '</li><li>External laser sources, front-panel serviceable ' + CPO.badge('nv') + '</li><li>Ecosystem: TSMC, Coherent, Corning, Fabrinet, Foxconn, Lumentum, SENKO, SPIL, Sumitomo Electric, Browave, TFC ' + CPO.badge('nv') + '</li>' }))));

      // learning path
      c.appendChild(h('h2', {}, 'Learning path'));
      c.appendChild(h('div', { class: 'hm-path' }, PATH.map((p, i) =>
        h('div', { class: 'card hm-step', tabindex: 0, onclick: () => CPO.go(p[0]), onkeydown: e => { if (e.key === 'Enter') CPO.go(p[0]); } },
          h('div', { class: 'n' }, String(i + 1).padStart(2, '0')), h('div', { class: 'ic' }, p[1]),
          h('h3', {}, p[2]), h('p', {}, p[3]), h('div', { class: 'go' }, 'Open ->')))));

      // plan
      let saved = {};
      try { saved = JSON.parse(localStorage.getItem('cpo-plan') || '{}') || {}; } catch (e) { saved = {}; }
      const total = PLAN.reduce((a, w) => a + w.items.length, 0);
      const bar = h('i', {}), cnt = h('span', { class: 'muted' });
      function upd() {
        const n = Object.keys(saved).filter(k => saved[k]).length;
        bar.style.width = (100 * n / total) + '%'; cnt.textContent = n + ' / ' + total + ' done';
      }
      c.appendChild(h('h2', {}, 'Suggested 4-week onboarding plan'));
      c.appendChild(h('div', { class: 'card' },
        h('div', { class: 'hm-plan-head' }, h('div', { class: 'hm-bar' }, bar), cnt,
          h('button', { class: 'btn', onclick: () => { saved = {}; try { localStorage.setItem('cpo-plan', '{}'); } catch (e) {} c.querySelectorAll('.hm-week input').forEach(i => { i.checked = false; i.parentNode.classList.remove('done'); }); upd(); } }, 'Reset')),
        h('div', { class: 'hm-weeks' }, PLAN.map((w, wi) =>
          h('div', { class: 'hm-week' }, h('div', { class: 't' }, w.t), h('h3', {}, w.n),
            w.items.map((it, ii) => {
              const key = 'w' + wi + 'i' + ii;
              const cb = h('input', { type: 'checkbox' });
              cb.checked = !!saved[key];
              const lab = h('label', { class: cb.checked ? 'done' : '' }, cb, h('span', {}, it));
              cb.addEventListener('change', () => {
                saved[key] = cb.checked; if (!cb.checked) delete saved[key];
                lab.classList.toggle('done', cb.checked);
                try { localStorage.setItem('cpo-plan', JSON.stringify(saved)); } catch (e) {}
                upd();
              });
              return lab;
            }))))));
      upd();

      return function cleanup() { stopHero(); };
    }
  });
})();
