/* Scenario hand-off: a case study opens a tool (Data-Flow, Noise Lab, Budgets, KPIs) with a fault already
   applied, and the tool shows a banner with what to look at and a button back to the case.
     C.scenario.open(tool, sub, { title, set, note, look:[...], back })   → stores it and navigates to #tool/sub
     C.scenario.take(tool)  → the pending scenario for that tool (once), or null
     C.scenario.banner(container, sc)  → inserts the banner at the top of a section */
(function () {
  'use strict';
  const C = window.CPO;
  const KEY = 'cpo-scenario';
  let mem = null; // fallback when sessionStorage is unavailable

  function open(tool, sub, sc) {
    const v = Object.assign({ tool: tool }, sc);
    mem = v;
    try { sessionStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* private mode */ }
    C.go(tool + (sub ? '/' + sub : ''));
  }
  function take(tool) {
    let v = mem;
    try { const s = sessionStorage.getItem(KEY); if (s) v = JSON.parse(s); } catch (e) { /* ignore */ }
    if (!v || v.tool !== tool) return null;
    mem = null;
    try { sessionStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    return v;
  }
  function banner(container, sc) {
    if (!container || !sc) return null;
    const b = C.h('div', { class: 'scn-banner', role: 'note' },
      C.h('div', { class: 'scn-tag' }, '🧪 Case study'),
      C.h('div', { class: 'scn-body' },
        C.h('b', null, sc.title || 'Scenario'),
        sc.note ? C.h('div', { class: 'scn-note', html: sc.note }) : null,
        sc.look && sc.look.length ? C.h('ul', { html: sc.look.map(x => '<li>' + x + '</li>').join('') }) : null),
      C.h('div', { class: 'scn-actions' },
        sc.back ? C.h('button', { class: 'btn primary', onclick: () => C.go(sc.back) }, '← Back to the case') : null,
        C.h('button', { class: 'btn', title: 'Hide', onclick: () => b.remove() }, '✕')));
    container.insertBefore(b, container.firstChild);
    return b;
  }

  // banner styles (kept here so every tool gets them without touching its CSS file)
  const css = document.createElement('style');
  css.textContent =
    '.scn-banner{display:flex;gap:14px;align-items:flex-start;border:1px solid var(--violet);border-radius:12px;padding:12px 14px;margin:0 0 16px;' +
    'background:linear-gradient(90deg,rgba(167,139,250,.14),rgba(167,139,250,.04))}' +
    '.scn-tag{flex:none;font-size:11.5px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--violet);padding-top:2px}' +
    '.scn-body{flex:1;min-width:0;font-size:14px}.scn-body b{font-size:15px}.scn-note{color:#c9d4e0;margin:3px 0}' +
    '.scn-body ul{margin:6px 0 0;padding-left:18px}.scn-body li{margin:2px 0}' +
    '.scn-actions{display:flex;gap:6px;flex:none}' +
    '@media (max-width:800px){.scn-banner{flex-direction:column}}';
  document.head.appendChild(css);

  C.scenario = { open, take, banner };
})();
