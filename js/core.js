/* CPO Switch Academy — core runtime (router, registry, glossary tooltips, helpers). See CONTRACT.md */
(function () {
  'use strict';
  const SVGNS = 'http://www.w3.org/2000/svg';
  const sections = [];
  const glossary = {};
  const bus = {};
  let current = null, cleanup = null;

  function build(ns, tag, attrs, children) {
    const el = ns ? document.createElementNS(ns, tag) : document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'class' && !ns) el.className = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat(Infinity)) {
      if (c == null || c === false) continue;
      el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  }

  function fmt(n, d) {
    d = d == null ? 3 : d;
    if (n == null || isNaN(n)) return '—';
    if (!isFinite(n)) return n > 0 ? '∞' : '-∞';
    const a = Math.abs(n);
    if (a !== 0 && (a < 1e-3 || a >= 1e9)) return n.toExponential(Math.max(0, d - 1));
    const units = [[1e6, 'M'], [1e3, 'k']];
    for (const [v, u] of units) if (a >= v) return +(n / v).toPrecision(d) + u;
    return String(+n.toPrecision(d));
  }

  let spare = null;
  function randn() {
    if (spare != null) { const s = spare; spare = null; return s; }
    let u = 0, v = 0; while (u === 0) u = Math.random(); v = Math.random();
    const r = Math.sqrt(-2 * Math.log(u)); spare = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  }

  function loop(fn) {
    let id, last = performance.now(), t0 = last, alive = true;
    function f(now) {
      if (!alive) return;
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      try { fn(dt, (now - t0) / 1000); } catch (e) { console.error(e); alive = false; return; }
      id = requestAnimationFrame(f);
    }
    id = requestAnimationFrame(f);
    return function stop() { alive = false; cancelAnimationFrame(id); };
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  // ---------- glossary tooltips ----------
  let linkRe = null;
  function rebuildRe() {
    const keys = Object.keys(glossary).filter(k => k.length >= 2 && /[A-Z]/.test(k)).sort((a, b) => b.length - a.length);
    linkRe = keys.length ? new RegExp('(?<![\\w-])(' + keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?![\\w-])', 'g') : null;
  }
  function linkify(root) {
    if (!root) return;
    if (!linkRe) rebuildRe();
    if (!linkRe) return;
    const skip = { SCRIPT: 1, STYLE: 1, ABBR: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1, OPTION: 1, CODE: 1, BUTTON: 1, H1: 1 };
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        let p = n.parentNode;
        while (p && p !== root) {
          if (skip[p.nodeName] || (p.namespaceURI === SVGNS) || (p.classList && p.classList.contains('no-tip'))) return NodeFilter.FILTER_REJECT;
          p = p.parentNode;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = []; let n;
    while ((n = walker.nextNode())) { linkRe.lastIndex = 0; if (linkRe.test(n.nodeValue)) nodes.push(n); }
    for (const t of nodes) {
      const frag = document.createDocumentFragment(); const s = t.nodeValue; let last = 0;
      linkRe.lastIndex = 0; let m;
      while ((m = linkRe.exec(s))) {
        if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)));
        const a = document.createElement('abbr'); a.className = 'g'; a.dataset.term = m[1]; a.textContent = m[1];
        frag.appendChild(a); last = m.index + m[1].length;
      }
      if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
      t.parentNode.replaceChild(frag, t);
    }
  }
  function setupTooltip() {
    const tip = document.getElementById('gtip');
    document.addEventListener('mouseover', e => {
      const a = e.target.closest && e.target.closest('[data-term]');
      if (!a) { tip.classList.remove('show'); return; }
      const g = glossary[a.dataset.term];
      if (!g) return;
      tip.innerHTML = '<b>' + esc(a.dataset.term) + '</b> — <span class="full">' + esc(g.full || '') + '</span>' + (g.def ? '<p>' + esc(g.def) + '</p>' : '');
      const r = a.getBoundingClientRect();
      tip.classList.add('show');
      const tw = tip.offsetWidth, th = tip.offsetHeight;
      let x = Math.min(window.innerWidth - tw - 8, Math.max(8, r.left));
      let y = r.bottom + 8; if (y + th > window.innerHeight - 8) y = r.top - th - 8;
      tip.style.left = x + 'px'; tip.style.top = y + 'px';
    });
    document.addEventListener('click', e => {
      const a = e.target.closest && e.target.closest('abbr[data-term]');
      if (a && e.altKey) CPO.go('glossary/' + encodeURIComponent(a.dataset.term));
    });
  }

  // ---------- router ----------
  function parseHash() {
    const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
    const i = h.indexOf('/');
    return i < 0 ? { id: h, sub: '' } : { id: h.slice(0, i), sub: h.slice(i + 1) };
  }
  function renderNav() {
    const nav = document.getElementById('navlinks'); nav.innerHTML = '';
    sections.sort((a, b) => (a.order || 0) - (b.order || 0));
    for (const s of sections) {
      nav.appendChild(build(null, 'a', { href: '#' + s.id, 'data-id': s.id },
        [build(null, 'span', { class: 'ico' }, [s.icon || '•']), build(null, 'span', { class: 'lbl' }, [s.title])]));
    }
  }
  function route() {
    const r = parseHash();
    CPO.route = r;
    let s = sections.find(x => x.id === r.id) || sections[0];
    if (!s) return;
    if (current === s && s.onSubRoute) { s.onSubRoute(r.sub); CPO.emit('subroute', r); return; }
    if (current === s && !s.onSubRoute && current._sub === r.sub) return;
    if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
    current = s; s._sub = r.sub;
    document.querySelectorAll('#navlinks a').forEach(a => a.classList.toggle('active', a.dataset.id === s.id));
    const main = document.getElementById('main'); main.innerHTML = ''; main.scrollTop = 0;
    const c = build(null, 'div', { class: 'section', id: 'sec-' + s.id }, []);
    main.appendChild(c);
    try { const r2 = s.render(c, r.sub); if (typeof r2 === 'function') cleanup = r2; }
    catch (e) { console.error(e); c.innerHTML = '<div class="callout warn">Section failed to render: ' + esc(e.message) + '</div>'; }
    linkify(c);
    CPO.emit('section', s.id);
  }

  window.CPO = {
    route: { id: '', sub: '' },
    registerSection(def) { if (!def || !def.id) return; const i = sections.findIndex(s => s.id === def.id); if (i >= 0) sections[i] = def; else sections.push(def); },
    sections,
    glossary,
    addGlossary(obj) { for (const k in obj) if (!glossary[k]) glossary[k] = obj[k]; linkRe = null; },
    tip(term, label) { return '<abbr class="g" data-term="' + esc(term) + '">' + esc(label || term) + '</abbr>'; },
    linkify,
    badge(kind) { const t = { nv: 'NVIDIA public', typ: 'typical', est: 'estimate' }[kind] || kind; return '<span class="badge ' + esc(kind) + '">' + t + '</span>'; },
    h(tag, attrs, ...ch) { return build(null, tag, attrs, ch); },
    s(tag, attrs, ...ch) { return build(SVGNS, tag, attrs, ch); },
    SVGNS, esc, loop, fmt, randn,
    clamp: (x, a, b) => Math.max(a, Math.min(b, x)),
    lerp: (a, b, t) => a + (b - a) * t,
    on(e, f) { (bus[e] = bus[e] || []).push(f); return () => { bus[e] = bus[e].filter(x => x !== f); }; },
    emit(e, d) { (bus[e] || []).slice().forEach(f => { try { f(d); } catch (err) { console.error(err); } }); },
    go(hash) { location.hash = '#' + hash; },
    domainColor(d) { return 'var(--' + ({ data: 'data', optics: 'optic', power: 'power', control: 'ctrl', thermal: 'therm', sensing: 'sense', mechanical: 'mech' }[d] || 'accent') + ')'; },
    arch: {
      nodes: {},
      addNodes(arr) { for (const n of arr) { if (!n || !n.id) continue; if (CPO.arch.nodes[n.id]) console.warn('arch: duplicate node id', n.id); CPO.arch.nodes[n.id] = n; } },
      children(id) { return Object.values(CPO.arch.nodes).filter(n => n.parent === id); }
    },
    start() {
      renderNav(); setupTooltip();
      window.addEventListener('hashchange', route);
      if (!location.hash) location.hash = '#home'; else route();
      if (!sections.length) document.getElementById('main').innerHTML = '<div class="section"><h1>No sections loaded</h1></div>';
    }
  };
})();
