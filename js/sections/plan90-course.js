/* First 90 Days plan: self-assessment radar, phase checklists (saved per device), stakeholder map, documents to
   request, and an overall progress summary. Ties the academy courses to the first months in the role. */
(function () {
  'use strict';
  const C = window.CPO;
  const h = C.h, CE = C.course;
  const KEY = 'plan90-v1';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const save = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* ignore */ } };

  const AREAS = [['Optics & photonics', 'cpo-course'], ['Thermal & heat transfer', 'thermal-course'], ['Mechanics & packaging', 'optics-mfg'], ['Electronics, SI & PI', 'elec-course'], ['Networking & protocols', 'net-course'], ['Firmware & software', 'firmware'], ['Reliability statistics', 'reliability'], ['Manufacturing & test', 'optics-mfg'], ['Requirements & V&V', 'requirements'], ['AI factory & industry', 'landscape']];

  function pAssess(p) {
    const st = load(); st.assess = st.assess || {};
    const card = h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, 'Rate yourself 1 (new to me) … 5 (could teach it)'));
    const rows = AREAS.map(([a], i) => { const inp = h('input', { type: 'range', min: 1, max: 5, step: 1, value: st.assess[i] || (i === 0 || i === 2 ? 4 : i === 8 ? 4 : 2) }), o = h('output'); inp.addEventListener('input', upd); card.appendChild(h('div', { class: 'slider-row' }, h('label', null, a), inp, o)); return [inp, o]; });
    const right = h('div', { class: 'card' }); p.appendChild(h('div', { class: 'af-calc' }, card, right));
    function upd() {
      rows.forEach(([i, o], k) => { o.textContent = i.value; st.assess[k] = +i.value; }); save(st);
      const N = AREAS.length, cx = 230, cy = 210, Rr = 160; let poly = '', grid = '', labels = '';
      for (let lv = 1; lv <= 5; lv++) { let g2 = ''; for (let k = 0; k < N; k++) { const a = -Math.PI / 2 + k * 2 * Math.PI / N, r = Rr * lv / 5; g2 += (k ? 'L' : 'M') + (cx + r * Math.cos(a)).toFixed(1) + ' ' + (cy + r * Math.sin(a)).toFixed(1); } grid += '<path d="' + g2 + 'Z" fill="none" stroke="#243042"/>'; }
      AREAS.forEach(([a], k) => { const an = -Math.PI / 2 + k * 2 * Math.PI / N, r = Rr * (+rows[k][0].value) / 5; poly += (k ? 'L' : 'M') + (cx + r * Math.cos(an)).toFixed(1) + ' ' + (cy + r * Math.sin(an)).toFixed(1); const lx = cx + (Rr + 18) * Math.cos(an), ly = cy + (Rr + 18) * Math.sin(an); labels += '<text x="' + lx.toFixed(1) + '" y="' + (ly + 4).toFixed(1) + '" text-anchor="' + (Math.abs(Math.cos(an)) < 0.2 ? 'middle' : Math.cos(an) > 0 ? 'start' : 'end') + '" fill="#c9d4e0" font-size="11">' + a + '</text>'; });
      const weak = AREAS.map((a, k) => [a, +rows[k][0].value]).sort((x, y) => x[1] - y[1]).slice(0, 3);
      right.innerHTML = '<svg viewBox="-90 0 640 420" style="width:100%;height:auto">' + grid + '<path d="' + poly + 'Z" fill="rgba(118,185,0,.25)" stroke="#76b900" stroke-width="2.5"/>' + labels + '</svg>' +
        '<div class="callout"><b>Focus first on:</b> ' + weak.map(([[a, hs], v]) => '<a href="#' + hs + '">' + a + '</a> (' + v + '/5)').join(' · ') + '. Re-rate yourself at day 30, 60 and 90; the shape should grow toward the edges.</div>';
    }
    upd();
  }

  function checklist(p, id, items) {
    const st = load(); st.done = st.done || {};
    const prog = h('div', { class: 'cs-prog', style: 'margin:6px 0 14px' }); const pt = h('div', { class: 'cs-pct' });
    p.appendChild(pt); p.appendChild(prog);
    const groups = {};
    items.forEach(([grp, txt, link], i) => {
      const k = id + ':' + i; const cb = h('input', { type: 'checkbox' }); cb.checked = !!st.done[k];
      cb.addEventListener('change', () => { const s2 = load(); s2.done = s2.done || {}; s2.done[k] = cb.checked; save(s2); upd(); });
      if (!groups[grp]) { groups[grp] = h('div', { class: 'card', style: 'margin:10px 0' }, h('h3', { style: 'margin-top:0' }, grp)); p.appendChild(groups[grp]); }
      groups[grp].appendChild(h('label', { class: 'cs-lever', style: 'grid-template-columns:22px 1fr' }, cb, h('div', { html: txt + (link ? ' <a href="#' + link + '" style="font-size:12.5px">→ open</a>' : '') })));
    });
    function upd() { const s2 = load(); const n = items.filter((_, i) => s2.done && s2.done[id + ':' + i]).length; prog.innerHTML = '<i style="width:' + (100 * n / items.length).toFixed(0) + '%;background:var(--accent)"></i>'; pt.textContent = n + ' / ' + items.length + ' done'; }
    upd();
  }

  const P30 = [
    ['Learn the product', 'Complete the AI Factory and CPO Switch courses.', 'factory'],
    ['Learn the product', 'Complete Thermal, Electronics & Boards, and Networking courses (skim what you know).', 'thermal-course'],
    ['Learn the product', 'Read the product requirements document and the top-level block diagram.', null],
    ['Learn the product', 'Walk through the current link, power, thermal and reliability budgets with their owners.', 'budgets'],
    ['Learn the product', 'See real hardware: lab bring-up bench, a package, an engine, an ELS module.', null],
    ['Meet people', 'Meet each team lead on the stakeholder map; ask the same 5 questions (see "People").', 'plan90/p-people'],
    ['Meet people', 'Find your "go-to" expert for photonics, SerDes, packaging, thermal, power, firmware, test.', null],
    ['Set up', 'Get access: requirement tools, design repositories, lab schedules, telemetry dashboards, bug tracker.', null],
    ['Set up', 'Start a personal glossary and open-questions list; review weekly with your manager.', 'glossary'],
    ['Set up', 'Rate yourself in the self-assessment; plan learning for the three weakest areas.', 'plan90/p-assess']
  ];
  const P60 = [
    ['Contribute', 'Take ownership of one budget section (e.g. thermal crosstalk or fiber-attach loss) and update it with measured data.', null],
    ['Contribute', 'Review one ICD (e.g. engine ↔ ELS or engine ↔ firmware) and log gaps and ambiguities.', 'requirements/req-n2'],
    ['Contribute', 'Participate in a design review; use the board-review and requirement checklists.', 'elec-course/el-review'],
    ['Contribute', 'Join a bring-up or validation session; write up the results and open issues.', null],
    ['Contribute', 'Pick one open failure or anomaly and drive its root cause with the case-study method.', 'cases'],
    ['Strengthen', 'Run the FMEA workshop on a real subsystem with the team.', 'requirements/req-fmea'],
    ['Strengthen', 'Build a FIT roll-up or Pareto for one KPI with real data.', 'reliability/rel-fit'],
    ['Strengthen', 'Re-rate yourself; focus learning on the remaining weak areas.', 'plan90/p-assess']
  ];
  const P90 = [
    ['Own', 'Own a set of system requirements end to end: IDs, parents, verification methods, status.', 'requirements/req-tree'],
    ['Own', 'Maintain the verification matrix for your area and report coverage and risks at the next gate.', 'requirements/req-vv'],
    ['Own', 'Propose one Pareto-driven improvement (e.g. loss reduction) with numbers and a plan.', 'cases/pareto'],
    ['Own', 'Present a short "state of the system" for your area: budgets, margins, top risks, next steps.', null],
    ['Influence', 'Define telemetry and alarm thresholds for your area with firmware and operations.', 'firmware/fw-telemetry'],
    ['Influence', 'Write down three lessons learned and one process improvement you would like to drive.', null],
    ['Influence', 'Agree with your manager on goals for the next two quarters.', null]
  ];
  const PEOPLE = [['Switch ASIC / SerDes', 'channel budget, equalization presets, FEC statistics, lane mapping'], ['Silicon photonics (PIC)', 'ring design, resonance spread, losses, wafer-test data'], ['Electronics (EIC)', 'drivers, TIAs, control loops, power per lane'], ['Lasers / ELS', 'power, wavelength, aging, reliability data, hot-swap'], ['Packaging & fiber attach', 'warpage, alignment stability, KGD testing, yield'], ['Thermal & mechanical', 'thermal stack, crosstalk, cold plate, coolant specs'], ['Power', 'power tree, rails, sequencing, ripple, telemetry'], ['Firmware & NOS software', 'bring-up, lock loops, telemetry, updates, state machines'], ['Test & manufacturing', 'test coverage, limits, Cpk, calibration flow, traceability'], ['Reliability & quality', 'FIT model, qualification plan, field returns'], ['Product management & customers', 'requirements, priorities, deployment environment, field issues'], ['Suppliers & supply chain', 'ICDs, qualification, change notices, capacity']];

  function pPeople(p) {
    p.appendChild(h('div', { class: 'callout', html: 'Ask every team the same five questions: <b>1</b> What do you own? <b>2</b> What do you need from other teams? <b>3</b> What worries you most (top risk)? <b>4</b> Which numbers should I know? <b>5</b> What would make my role most useful to you?' }));
    const st = load(); st.met = st.met || {};
    const grid = h('div', { class: 'grid2' });
    PEOPLE.forEach(([t, w], i) => {
      const cb = h('input', { type: 'checkbox' }); cb.checked = !!st.met[i];
      const note = h('textarea', { rows: 2, placeholder: 'names, notes, follow-ups…', style: 'width:100%;margin-top:6px;background:var(--panel2);color:var(--text);border:1px solid var(--line);border-radius:8px;padding:6px;font:inherit;font-size:13px' }); note.value = (st.notes || {})[i] || '';
      cb.addEventListener('change', () => { const s2 = load(); s2.met = s2.met || {}; s2.met[i] = cb.checked; save(s2); });
      note.addEventListener('input', () => { const s2 = load(); s2.notes = s2.notes || {}; s2.notes[i] = note.value; save(s2); });
      grid.appendChild(h('div', { class: 'card' }, h('label', { style: 'display:flex;gap:8px;align-items:center;font-weight:700' }, cb, t), h('div', { class: 'muted', style: 'font-size:13px;margin-top:4px' }, 'Talk about: ' + w), note));
    });
    p.appendChild(grid);
    p.appendChild(h('p', { class: 'muted', style: 'font-size:12.5px' }, 'Saved only in this browser on this device. Don\'t store confidential information here.'));
  }

  const DOCS = [['Core', 'Product requirements / marketing requirements'], ['Core', 'System architecture and block diagram'], ['Core', 'Requirement tree with verification matrix'], ['Budgets', 'Optical link budget (all reach classes)'], ['Budgets', 'Power budget and power tree'], ['Budgets', 'Thermal budget, thermal models and correlation reports'], ['Budgets', 'Reliability / FIT model and qualification plan'], ['Interfaces', 'ICDs: ASIC↔engine, engine↔ELS, engine↔fiber, engine↔firmware'], ['Interfaces', 'Register maps, CMIS-like pages, telemetry list'], ['Interfaces', 'Supplier specifications for engines, lasers, connectors'], ['Build & test', 'Bring-up plan, test plans, test limits'], ['Build & test', 'EVT/DVT reports, open issue list, FMEA'], ['Field', 'Telemetry dashboards and alarm definitions'], ['Field', 'Field returns / failure analysis reports from previous products']];

  CE.register({
    id: 'plan90', title: 'Your First 90 Days', icon: '🗓️', order: 6, storeKey: 'plan90-last-step',
    finish: { go: 'factory', label: 'Start learning: AI Factory course →' },
    pages: [
      CE.startPage({ eyebrow: 'Personal plan · saved on this device', title: 'Your <em>first 90 days</em> as a senior CPO system engineer', startLabel: 'Start the plan',
        intro: 'A practical plan that turns the academy into a successful start: rate yourself, then follow three phases (<b>learn</b>, <b>contribute</b>, <b>own</b>) with checklists linked to the right courses, the people to meet and the documents to ask for. Your ticks and notes are saved in this browser only.',
        analogy: [['📊', 'Self-assessment', 'radar of 10 areas'], ['1️⃣', 'Days 1–30', 'learn the system'], ['2️⃣', 'Days 31–60', 'contribute'], ['3️⃣', 'Days 61–90', 'own an area']],
        route: ['Self-assessment and focus areas.', 'Days 1–30: learn.', 'Days 31–60: contribute.', 'Days 61–90: own.', 'People to meet.', 'Documents to ask for.'] }),
      CE.page('p-assess', 'Self-assessment', 'Plan', 'Where are you today?', 'Starting values reflect a mechanics, optics and systems-engineering background; adjust them honestly.', pAssess),
      CE.page('p-30', 'Days 1–30: learn', 'Plan', 'Days 1–30: learn the system and the people', 'Goal: understand the product, its budgets and who owns what.', p => checklist(p, 'p30', P30)),
      CE.page('p-60', 'Days 31–60: contribute', 'Plan', 'Days 31–60: contribute', 'Goal: add value in reviews, bring-up and root-cause work while filling the remaining gaps.', p => checklist(p, 'p60', P60)),
      CE.page('p-90', 'Days 61–90: own', 'Plan', 'Days 61–90: own an area', 'Goal: be the system owner for a clear slice of the product.', p => checklist(p, 'p90', P90)),
      CE.page('p-people', 'People to meet', 'Plan', 'The people to meet: stakeholder map', null, pPeople),
      CE.page('p-docs', 'Documents to ask for', 'Plan', 'Documents to ask for', 'Tick them off as you get access.', p => checklist(p, 'docs', DOCS.map(([g, d]) => [g, d, null]))),
      CE.donePage({ stepTitle: 'Plan summary', eyebrow: 'Your plan', title: 'Make it <em>yours</em>', takeaways: ['Re-rate yourself at days 30, 60 and 90.', 'Use the case-study method on real issues: symptom → correlate → hypothesis → reproduce → root cause → prevent.', 'Own budgets and interfaces: they are where a system engineer adds the most value.', 'Keep practising with the Interview & Practice flashcards a few minutes a day.'], next: [['Start learning: AI Factory course →', 'factory'], ['Interview & Practice', 'interview']] })
    ]
  });
})();
