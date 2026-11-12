/* Shared engine for guided "Next, Next" courses (AI Factory course, CPO Switch course).
   Provides SVG helpers, an animated zoom stage for "level" steps, a page stepper with a sticky
   progress bar, and a reusable "journey" (one signal travelling along a path) widget.

   C.course.register({
     id, title, icon, order, storeKey,
     levels: [ { id, name, size, scene(g) → { hot:[{x,y,w,h,target|go,label,inside?,below?}], update(t,dt) },
                 title, sub, plain, body, facts:[[value,label,badge]], cpoTxt, more, links:[[hash,label]] } ],
     levelBoxTitle: '🔗 …', levelCh: 'Zoom in', levelHint: 'html',
     pages: [ { id, title, ch, build(el, ctx) } | '@levels' ],
     finish: { go: 'architecture', label: '…' }
   })
   ctx = { goId(id), next(), onFrame(fn(dt)), onCleanup(fn) }  — onFrame runs only while that page is shown. */
(function () {
  'use strict';
  const C = window.CPO;
  const h = C.h, S = C.s, B = C.badge;

  const K = {
    bg: '#05070a', panel: '#111720', panel2: '#18202c', line: '#243042', text: '#e6edf5', muted: '#8a99ad',
    acc: '#76b900', data: '#22d3ee', optic: '#ff6b3d', power: '#facc15', ctrl: '#a78bfa', therm: '#ff5a36',
    cool: '#3b82f6', copper: '#d08a4a', sense: '#f472b6', bad: '#ff4d5e', warn: '#f5b301'
  };
  const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---------------------------------------------------------------- SVG helpers
  function add(g, el) { g.appendChild(el); return el; }
  function R(g, x, y, w, hh, o) { return add(g, S('rect', Object.assign({ x, y, width: w, height: hh, rx: 4, fill: K.panel, stroke: K.line }, o || {}))); }
  function T(g, x, y, str, o) { return add(g, S('text', Object.assign({ x, y, fill: K.text, 'font-size': 14 }, o || {}), str)); }
  function L(g, x1, y1, x2, y2, o) { return add(g, S('line', Object.assign({ x1, y1, x2, y2, stroke: K.line, 'stroke-width': 1.5 }, o || {}))); }
  function P(g, d, o) { return add(g, S('path', Object.assign({ d, fill: 'none', stroke: K.line, 'stroke-width': 1.5 }, o || {}))); }
  function O(g, cx, cy, r, o) { return add(g, S('circle', Object.assign({ cx, cy, r, fill: K.data }, o || {}))); }
  function G(g, o) { return add(g, S('g', o || {})); }
  function cap(g, x, y, str, col) { return T(g, x, y, str, { fill: col || K.muted, 'font-size': 13, 'font-weight': 700, 'letter-spacing': 1.6 }); }
  function polyLen(pts) { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; }
  function along(pts, u) {
    const tot = polyLen(pts); let d = ((u % 1) + 1) % 1 * tot;
    for (let i = 1; i < pts.length; i++) {
      const sl = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (d <= sl || i === pts.length - 1) { const k = sl ? Math.min(1, d / sl) : 0; return [C.lerp(pts[i - 1][0], pts[i][0], k), C.lerp(pts[i - 1][1], pts[i][1], k)]; }
      d -= sl;
    }
    return pts[pts.length - 1];
  }
  function ptsD(pts) { return 'M' + pts.map(p => p[0] + ' ' + p[1]).join(' L'); }
  function grid(g, x, y, w, hh, step, col) {
    for (let i = x; i <= x + w; i += step) L(g, i, y, i, y + hh, { stroke: col, 'stroke-width': 0.6 });
    for (let j = y; j <= y + hh; j += step) L(g, x, j, x + w, j, { stroke: col, 'stroke-width': 0.6 });
  }

  // ---------------------------------------------------------------- journey widget
  /* journey(svg, { pts:[[x,y,label,kind 'e'|'o'|'x']], steps:[{r:[a,b], t, d}], optical(i) → bool for segment i (pts[i-1]→pts[i]),
                    decorate(g) (background boxes), big(label) → bool }) */
  function journey(svg, o) {
    const g = S('g', {}); svg.appendChild(g);
    if (o.decorate) o.decorate(g);
    const JP = o.pts, JS = o.steps;
    const segs = [];
    for (let i = 1; i < JP.length; i++) {
      const a = JP[i - 1], b = JP[i], optical = o.optical(i);
      segs.push(L(g, a[0], a[1], b[0], b[1], { stroke: optical ? K.optic : K.data, 'stroke-width': 3, 'stroke-opacity': .3 }));
    }
    const nodes = JP.map(([x, y, lbl, k, lp]) => {
      const big = o.big ? o.big(lbl) : false;
      const c = O(g, x, y, big ? 16 : 11, { fill: big ? '#3a1a0d' : '#0b1a20', stroke: k === 'o' ? K.optic : K.data, 'stroke-width': 2 });
      const ly = lp === 'up' ? y - 24 : lp === 'down' ? y + 32 : (y < 100 ? y - 24 : y + 32);
      T(g, x, ly, lbl, { 'text-anchor': 'middle', 'font-size': 12, fill: K.text });
      return c;
    });
    const pulse = O(g, 0, 0, 7, { fill: '#fff', filter: 'drop-shadow(0 0 8px #fff)' });
    const st = { auto: true, step: 0, tStep: 0, u: 0, list: null, desc: null };
    function setStep(s) {
      st.step = s; st.tStep = 0; st.u = 0;
      const [a, b] = JS[s].r;
      segs.forEach((l, i) => { const on = i >= a && i < b; l.setAttribute('stroke-opacity', on ? 1 : (i < a ? 0.55 : 0.18)); l.setAttribute('stroke-width', on ? 5 : 3); });
      nodes.forEach((n, i) => n.setAttribute('filter', i >= a && i <= b ? 'drop-shadow(0 0 8px ' + (JP[i][3] === 'o' ? '#ff6b3d' : '#22d3ee') + ')' : ''));
      if (st.list) [...st.list.children].forEach((li, i) => li.classList.toggle('on', i === s));
      if (st.desc) { st.desc.innerHTML = '<b>Step ' + (s + 1) + ' · ' + JS[s].t + '.</b> ' + JS[s].d; C.linkify(st.desc); }
    }
    st.mount = (list, desc, onManual) => {
      st.list = list; st.desc = desc;
      JS.forEach((s, i) => list.appendChild(h('li', { onclick: () => { onManual(); setStep(i); } }, h('span', { class: 'n' }, String(i + 1)), h('span', { html: '<b>' + s.t + '</b>' }))));
      setStep(0);
    };
    st.update = (dt) => {
      if (REDUCED) dt = 0;
      st.tStep += dt;
      if (st.auto && st.tStep > (o.stepTime || 4.5)) setStep((st.step + 1) % JS.length);
      const [a, b] = JS[st.step].r;
      const pts = JP.slice(a, b + 1).map(p => [p[0], p[1]]);
      if (pts.length < 2) { pulse.setAttribute('cx', pts[0][0]); pulse.setAttribute('cy', pts[0][1]); pulse.setAttribute('r', 7 + 4 * Math.abs(Math.sin(st.tStep * 5))); return; }
      st.u = Math.min(1, st.u + dt / Math.max(1, (b - a)) * 0.6);
      const p = along(pts, st.u >= 1 ? 0.9999 : st.u);
      pulse.setAttribute('r', 7);
      pulse.setAttribute('cx', p[0]); pulse.setAttribute('cy', p[1]);
      if (st.u >= 1) st.u = 0;
    };
    return st;
  }
  // Full journey page block: svg + description + play/pause + step list. Returns update(dt).
  function journeyBlock(el, o) {
    const jsvg = S('svg', { viewBox: '0 0 1000 ' + (o.height || 340), class: 'af-jsvg' });
    const jlist = h('ol', { class: 'af-steps' });
    const jdesc = h('div', { class: 'callout' });
    const jplay = h('button', { class: 'btn' }, '⏸ Pause');
    el.appendChild(h('div', { class: 'af-journey' }, h('div', null, jsvg, jdesc, h('div', { class: 'af-nav' }, jplay)), h('div', { class: 'card' }, jlist)));
    const jr = journey(jsvg, o);
    jplay.addEventListener('click', () => { jr.auto = !jr.auto; jplay.textContent = jr.auto ? '⏸ Pause' : '▶ Play'; });
    jr.mount(jlist, jdesc, () => { jr.auto = false; jplay.textContent = '▶ Play'; });
    return dt => jr.update(dt);
  }

  // Appendix chapters → course pages
  function appendixPages(chapters) {
    return (chapters || []).map((ch, i) => ({
      id: ch.id, title: 'Appendix ' + String.fromCharCode(65 + i) + ': ' + ch.short, ch: 'Appendix',
      build(p, ctx) {
        p.appendChild(h('div', { class: 'af-apx-head' }, h('span', { class: 'af-apx-tag' }, 'Appendix ' + String.fromCharCode(65 + i)), h('h2', { class: 'af-ph' }, ch.title)));
        if (ch.lead) p.appendChild(h('p', { class: 'h-sub', html: ch.lead }));
        const body = h('div', { class: 'af-apx' }); p.appendChild(body);
        body.innerHTML = ch.html;
        if (ch.mount) { const c = ch.mount(body, ctx); if (typeof c === 'function') ctx.onCleanup(c); }
      }
    }));
  }

  // ---------------------------------------------------------------- the course runner
  function run(el, sub, def) {
    const LV = def.levels || [];
    const IDX = {}; LV.forEach((l, i) => { IDX[l.id] = i; });

    // course bar
    const btnPrev = h('button', { class: 'btn af-prev', onclick: () => step(-1) }, '← Back');
    const btnNext = h('button', { class: 'btn primary af-next', onclick: () => step(1) }, 'Next →');
    const barTitle = h('div', { class: 'af-bar-title' });
    const barTrack = h('div', { class: 'af-track' });
    const toc = h('div', { class: 'af-toc' });
    const tocBtn = h('button', { class: 'btn af-tocbtn', title: 'All steps', onclick: () => toc.classList.toggle('open') }, '☰ Contents');
    el.appendChild(h('div', { class: 'af-bar' }, btnPrev, h('div', { class: 'af-bar-mid' }, barTitle, barTrack), tocBtn, btnNext, toc));
    const pagesEl = h('div', { class: 'af-pages' });
    el.appendChild(pagesEl);
    const bottomPrev = h('button', { class: 'btn', onclick: () => step(-1) }, '← Back');
    const bottomNext = h('button', { class: 'btn primary af-bignext', onclick: () => step(1) });
    el.appendChild(h('div', { class: 'af-bottom' }, bottomPrev, h('span', { class: 'af-keys muted' }, 'Tip: use the ← → arrow keys'), bottomNext));

    const pages = {}, frameFns = {}, cleanups = [];
    function page(id) { const p = h('div', { class: 'af-page', 'data-id': id }); pagesEl.appendChild(p); pages[id] = p; return p; }

    // level stage (shared by all level steps)
    const svg = S('svg', { viewBox: '0 0 1000 600', class: 'af-svg', role: 'img' });
    const cam = S('g', {}); svg.appendChild(cam);
    const scaleTag = h('div', { class: 'af-scale' });
    const panel = h('div', { class: 'card af-panel' });
    if (LV.length) {
      const pL = page('__level');
      pL.appendChild(h('div', { class: 'af-main' },
        h('div', null, h('div', { class: 'af-stage' }, svg), h('div', { class: 'af-nav' }, scaleTag),
          h('div', { class: 'af-zoomhint', html: def.levelHint || 'Press <b>Next</b> and the picture zooms into the highlighted part. (You can also click a <b style="color:var(--accent)">dashed green region</b> yourself.)' })),
        panel));
    }

    // steps
    const STEPS = [];
    let curBuildId = null;
    const ctx = {
      goId: id => goId(id), next: () => step(1),
      onFrame(fn) { (frameFns[curBuildId] = frameFns[curBuildId] || []).push(fn); },
      onCleanup(fn) { cleanups.push(fn); },
      resumeId: (() => { try { return localStorage.getItem(def.storeKey); } catch (e) { return null; } })()
    };
    for (const pg of def.pages) {
      if (pg === '@levels') { LV.forEach((l, i) => STEPS.push({ id: l.id, page: '__level', lvl: i, title: l.title, ch: def.levelCh || 'Zoom in' })); continue; }
      const p = page(pg.id); curBuildId = pg.id;
      pg.build(p, ctx);
      STEPS.push({ id: pg.id, page: pg.id, title: pg.title, ch: pg.ch });
    }
    curBuildId = null;
    const SIDX = {}; STEPS.forEach((s2, i) => { SIDX[s2.id] = i; });

    const dots = STEPS.map((s2, i) => {
      const d = h('button', { class: 'af-dot ch-' + s2.ch.replace(/\W+/g, '').toLowerCase(), title: (i + 1) + '. ' + s2.title, onclick: () => goStep(i) });
      if (i && STEPS[i - 1].ch !== s2.ch) barTrack.appendChild(h('span', { class: 'af-gap' }));
      barTrack.appendChild(d); return d;
    });
    let lastCh = '';
    STEPS.forEach((s2, i) => {
      if (s2.ch !== lastCh) { toc.appendChild(h('div', { class: 'af-toc-ch' }, s2.ch)); lastCh = s2.ch; }
      toc.appendChild(h('a', { href: '#' + def.id + '/' + s2.id, onclick: e => { e.preventDefault(); toc.classList.remove('open'); goStep(i); } }, (i + 1) + '. ' + s2.title));
    });

    // level scene engine
    let cur = -1, lvlCur = -1, scene = null, sceneG = null, anim = null, t0 = performance.now() / 1000;
    function camT(rect, e) {
      if (!rect || e <= 0) return '';
      const s2 = Math.pow(Math.min(1000 / rect.w, 600 / rect.h), e);
      const cx = C.lerp(500, rect.x + rect.w / 2, e), cy = C.lerp(300, rect.y + rect.h / 2, e);
      return 'translate(500 300) scale(' + s2 + ') translate(' + (-cx) + ' ' + (-cy) + ')';
    }
    function build(i) {
      if (sceneG) sceneG.remove();
      sceneG = S('g', {});
      cam.appendChild(sceneG);
      sceneG.appendChild(S('rect', { x: 0, y: 0, width: 1000, height: 600, fill: K.bg }));
      const content = S('g', {}); sceneG.appendChild(content);
      scene = LV[i].scene(content) || {};
      t0 = performance.now() / 1000;
      (scene.hot || []).forEach(hs => {
        const hg = S('g', { class: 'af-hot' + (hs.go ? ' go' : ''), tabindex: 0, role: 'button', 'aria-label': hs.label });
        hg.appendChild(S('rect', { class: 'hz', x: hs.x, y: hs.y, width: hs.w, height: hs.h, rx: 6 }));
        const ty = hs.inside ? hs.y + 24 : hs.below || hs.y <= 40 ? hs.y + hs.h + 20 : hs.y - 8;
        const label = hs.go ? hs.label : 'Next: ' + (IDX[hs.target] != null ? LV[IDX[hs.target]].name : hs.label);
        const lw = label.length * 7.4 + 24;
        const lx = C.clamp(hs.x + hs.w / 2 - lw / 2, 4, 996 - lw);
        hg.appendChild(S('rect', { x: lx, y: ty - 15, width: lw, height: 21, rx: 10, fill: hs.go ? '#3a1a0d' : '#1b2a10', stroke: hs.go ? K.optic : K.acc }));
        hg.appendChild(S('text', { x: lx + lw / 2, y: ty, 'text-anchor': 'middle', 'font-size': 12.5, fill: '#fff', 'font-weight': 600 }, (hs.go ? '' : '🔍 ') + label));
        const act = () => hs.go ? C.go(hs.go) : zoomInto(hs);
        hg.addEventListener('click', act);
        hg.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
        content.appendChild(hg);
      });
    }
    function fillPanel(i) {
      const l = LV[i];
      panel.innerHTML = '';
      panel.appendChild(h('div', { class: 'muted', style: 'font-size:12px;font-family:var(--mono)' }, 'Level ' + (i + 1) + ' of ' + LV.length + (l.size ? ' · ' + l.size : '')));
      panel.appendChild(h('h2', null, l.title));
      panel.appendChild(h('div', { class: 'af-sub' }, l.sub));
      panel.appendChild(h('div', { class: 'af-plain', html: '<b>In plain words:</b> ' + l.plain }));
      panel.appendChild(h('div', { html: l.body }));
      if (l.facts && l.facts.length) panel.appendChild(h('div', { class: 'af-facts', html: l.facts.map(f => '<div class="af-fact"><b>' + f[0] + '</b><span>' + f[1] + ' ' + B(f[2]) + '</span></div>').join('') }));
      panel.appendChild(h('div', { class: 'af-cpo', html: '<h4>' + (def.levelBoxTitle || '🔗 Connection to the CPO switch') + '</h4><p>' + l.cpoTxt + '</p>' }));
      if (l.more) panel.appendChild(h('div', { class: 'af-more', html: '<h4>A little deeper</h4><div>' + l.more + '</div>' }));
      if (l.links && l.links.length) panel.appendChild(h('div', { class: 'af-links' }, h('span', { class: 'muted', style: 'font-size:12.5px;align-self:center' }, 'Optional detours:'), l.links.map(([href, lbl]) => h('a', { class: 'btn', href: '#' + href }, lbl + ' ↗'))));
      C.linkify(panel);
      panel.scrollTop = 0;
    }
    function showLevel(i, how) {
      const prev = lvlCur; lvlCur = i;
      build(i); fillPanel(i);
      scaleTag.innerHTML = LV[i].size ? 'scale ≈ <b>' + LV[i].size + '</b> across' : '';
      scaleTag.style.display = LV[i].size ? '' : 'none';
      const dur = REDUCED ? 0 : 0.6;
      if (how === 'out' && prev > i) {
        const back = (scene.hot || []).find(x => x.target === LV[prev].id);
        anim = back ? { from: 1, to: 0, rect: back, t: 0, dur } : { fadeIn: true, t: 0, dur: dur * 0.5 };
      } else anim = { fadeIn: true, t: 0, dur: how === 'in' ? dur * 0.8 : dur * 0.5 };
      applyAnim(0);
    }
    function applyAnim(dt) {
      if (!anim) { cam.setAttribute('transform', ''); sceneG && sceneG.setAttribute('opacity', 1); return; }
      anim.t += dt;
      const k = anim.dur ? C.clamp(anim.t / anim.dur, 0, 1) : 1, e = k * k * (3 - 2 * k);
      if (anim.fadeIn) { cam.setAttribute('transform', 'translate(500 300) scale(' + C.lerp(0.92, 1, e) + ') translate(-500 -300)'); sceneG.setAttribute('opacity', e); }
      else { cam.setAttribute('transform', camT(anim.rect, C.lerp(anim.from, anim.to, e))); sceneG.setAttribute('opacity', anim.to === 1 ? 1 - Math.max(0, e - 0.6) * 2.5 : 1); }
      if (k >= 1) { const done = anim.onDone; anim = null; if (done) done(); else applyAnim(0); }
    }
    function zoomInto(hs) {
      if (anim && !anim.fadeIn) return;
      const target = SIDX[hs.target];
      if (target == null) return;
      anim = { from: 0, to: 1, rect: hs, t: 0, dur: REDUCED ? 0 : 0.65, onDone: () => goStep(target, 'in') };
    }

    // stepping
    function goStep(k, how) {
      k = C.clamp(k, 0, STEPS.length - 1);
      if (k === cur) return;
      const prev = cur; cur = k;
      const st = STEPS[k];
      Object.values(pages).forEach(p => p.classList.toggle('on', p === pages[st.page]));
      if (st.page === '__level') showLevel(st.lvl, how || (prev > k ? 'out' : 'jump'));
      btnPrev.disabled = bottomPrev.disabled = k === 0;
      const nx = STEPS[k + 1];
      btnNext.textContent = nx ? 'Next →' : 'Finish ✓';
      bottomNext.textContent = nx ? 'Next: ' + nx.title + ' →' : ((def.finish && def.finish.label) || 'Finish ✓');
      barTitle.innerHTML = '<span class="af-ch">' + C.esc(st.ch) + '</span> · Step ' + (k + 1) + ' of ' + STEPS.length + ' · <b>' + C.esc(st.title) + '</b>';
      dots.forEach((d, i) => { d.classList.toggle('on', i === k); d.classList.toggle('done', i < k); });
      try { localStorage.setItem(def.storeKey, st.id); } catch (e) { /* private mode */ }
      const main = document.getElementById('main');
      if (main && prev !== -1) main.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
      const hash = def.id + '/' + st.id;
      if (location.hash.replace(/^#\/?/, '') !== hash) C.go(hash);
    }
    function goId(id) { if (SIDX[id] != null) goStep(SIDX[id]); }
    function step(d) {
      if (d > 0 && cur === STEPS.length - 1) { if (def.finish && def.finish.go) C.go(def.finish.go); return; }
      const st = STEPS[cur], nx = STEPS[cur + d];
      if (d > 0 && st.page === '__level' && nx && nx.page === '__level') {
        const hs = (scene.hot || []).find(x => x.target === nx.id);
        if (hs && !REDUCED) { zoomInto(hs); return; }
      }
      goStep(cur + d, d < 0 && st.page === '__level' ? 'out' : undefined);
    }
    function onSub(subId) { const i = SIDX[subId] != null ? SIDX[subId] : 0; if (i !== cur) goStep(i); }
    function onKey(e) {
      if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      else if (e.key === 'ArrowLeft' || (e.key === 'Escape' && !toc.classList.contains('open'))) { if (cur > 0) { e.preventDefault(); step(-1); } }
      else if (e.key === 'Escape') toc.classList.remove('open');
    }
    document.addEventListener('keydown', onKey);

    goStep(SIDX[sub] != null ? SIDX[sub] : 0);

    const stop = C.loop((dt) => {
      dt = Math.max(0, dt);
      const now = performance.now() / 1000;
      applyAnim(dt);
      const st = STEPS[cur];
      if (st.page === '__level' && scene && scene.update) scene.update(REDUCED ? 0 : Math.max(0, now - t0), REDUCED ? 0 : dt);
      (frameFns[st.page] || []).forEach(f => f(dt));
    });

    return {
      onSub,
      cleanup() { stop(); document.removeEventListener('keydown', onKey); cleanups.forEach(f => { try { f(); } catch (e) { /* ignore */ } }); }
    };
  }

  function register(def) {
    let live = null;
    C.registerSection({
      id: def.id, title: def.title, icon: def.icon, order: def.order,
      render(el, sub) { const r = run(el, sub, def); live = r; return () => { r.cleanup(); if (live === r) live = null; }; },
      onSubRoute(sub) { if (live) live.onSub(sub); }
    });
  }

  C.course = {
    K, REDUCED, register, journeyBlock, appendixPages,
    svg: { add, R, T, L, P, O, G, cap, along, ptsD, grid, polyLen }
  };
})();
