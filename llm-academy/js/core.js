/* LLM Academy — core runtime: registry, router, UI helpers, interactive diagrams with drill-down.
   Vanilla JS, no modules, no CDNs — works from file://. API documented in ../CONTRACT.md */
(function () {
  'use strict';
  const SVGNS = 'http://www.w3.org/2000/svg';
  const modules = [];
  let cleanups = [];
  const LS_KEY = 'llm-academy-progress-v1';

  /* ---------- tiny DOM helpers ---------- */
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
    for (const c of (children || []).flat(Infinity)) {
      if (c == null || c === false) continue;
      el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  }
  const h = (tag, attrs, ...children) => build(null, tag, attrs, children);
  const s = (tag, attrs, ...children) => build(SVGNS, tag, attrs, children);
  const esc = str => String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  function onCleanup(fn) { cleanups.push(fn); }
  function interval(fn, ms) { const id = setInterval(fn, ms); onCleanup(() => clearInterval(id)); return id; }
  function timeout(fn, ms) { const id = setTimeout(fn, ms); onCleanup(() => clearTimeout(id)); return id; }

  /* ---------- progress ---------- */
  function loadProg() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch (e) { return {}; } }
  function saveProg(p) { try { localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch (e) { /* file:// in some browsers */ } }
  function mark(id, key, val) { const p = loadProg(); p[id] = p[id] || {}; p[id][key] = val; saveProg(p); renderNav(); }
  function progress(id) { return loadProg()[id] || {}; }

  /* ---------- palette ---------- */
  const COLORS = {
    llm: '#a78bfa', data: '#38bdf8', tool: '#f59e0b', store: '#34d399', ctrl: '#f472b6',
    ui: '#60a5fa', ext: '#94a3b8', warn: '#f87171', ok: '#4ade80', neuron: '#fbbf24'
  };
  const color = c => COLORS[c] || c || COLORS.data;

  /* ---------- HTML-string helpers ---------- */
  const CALLOUT = {
    info: ['ℹ️', 'לידיעה'], tip: ['💡', 'טיפ'], warn: ['⚠️', 'זהירות'], llm: ['🧠', 'הקשר ל-LLM'],
    algo: ['🧪', 'עין של אלגוריתמאי'], example: ['🧩', 'דוגמה מוחשית'], analogy: ['🎭', 'אנלוגיה']
  };
  function callout(kind, html, title) {
    const [ic, def] = CALLOUT[kind] || CALLOUT.info;
    return `<div class="callout ${kind}"><div class="callout-h">${ic} ${esc(title || def)}</div><div class="callout-b">${html}</div></div>`;
  }
  function badge(text, kind) { return `<span class="badge ${kind || ''}">${esc(text)}</span>`; }
  const MODELS = {
    haiku: { name: 'Claude Haiku 5.5', id: 'claude-haiku-5-5', note: 'מהיר וזול — סיווג, ניתוב, חילוץ, סיכומים קצרים' },
    sonnet: { name: 'Claude Sonnet 5.5', id: 'claude-sonnet-5-5', note: 'איזון — עבודת סוכן יומיומית, קוד, RAG' },
    opus: { name: 'Claude Opus 5.5', id: 'claude-opus-5-5', note: 'חזק — תכנון, היגיון מורכב, ארכיטקטורה' }
  };
  function modelBadge(tier) {
    const m = MODELS[tier]; if (!m) return badge(tier);
    return `<span class="model-badge ${tier}" title="${esc(m.note)}"><i></i>${esc(m.name)}</span>`;
  }

  /* simple, safe syntax highlighter (python / js / json / bash / yaml / text) */
  const KW = {
    python: 'False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield',
    js: 'const|let|var|function|return|if|else|for|while|of|in|new|class|extends|import|from|export|default|async|await|try|catch|throw|true|false|null|undefined|this',
    bash: 'if|then|fi|for|do|done|export|echo|cd|pip|python|npm|git|docker|curl',
    yaml: 'true|false|null', json: 'true|false|null', text: '___none___'
  };
  function highlight(src, lang) {
    lang = KW[lang] ? lang : (lang === 'py' ? 'python' : lang === 'javascript' ? 'js' : lang === 'sh' ? 'bash' : 'text');
    const comment = (lang === 'python' || lang === 'bash' || lang === 'yaml') ? '#[^\\n]*' : (lang === 'js' ? '\\/\\/[^\\n]*' : '___nocomment___');
    const re = new RegExp(
      '(' + comment + ')|("""[\\s\\S]*?"""|\'\'\'[\\s\\S]*?\'\'\'|"(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\'|`(?:\\\\.|[^`\\\\])*`)' +
      '|\\b(' + KW[lang] + ')\\b|\\b(\\d+(?:\\.\\d+)?)\\b|(@\\w+)|\\b([A-Za-z_]\\w*)(?=\\()', 'g');
    let out = '', last = 0, m;
    while ((m = re.exec(src))) {
      out += esc(src.slice(last, m.index));
      const t = esc(m[0]);
      out += m[1] ? `<span class="tk-c">${t}</span>` : m[2] ? `<span class="tk-s">${t}</span>` : m[3] ? `<span class="tk-k">${t}</span>` :
        m[4] ? `<span class="tk-n">${t}</span>` : m[5] ? `<span class="tk-d">${t}</span>` : `<span class="tk-f">${t}</span>`;
      last = m.index + m[0].length;
      if (m[0].length === 0) re.lastIndex++;
    }
    return out + esc(src.slice(last));
  }
  function code(src, lang, title) {
    src = String(src).replace(/^\n+|\s+$/g, '');
    return `<div class="code"><div class="code-h"><span>${esc(title || lang || 'code')}</span><button class="copy" type="button">העתק</button></div>` +
      `<pre dir="ltr"><code data-raw="${esc(src)}">${highlight(src, lang || 'text')}</code></pre></div>`;
  }
  function table(headers, rows, cls) {
    return `<div class="tbl-wrap"><table class="tbl ${cls || ''}"><thead><tr>${headers.map(x => `<th>${x}</th>`).join('')}</tr></thead>` +
      `<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  function list(items) { return '<ul>' + items.map(i => `<li>${i}</li>`).join('') + '</ul>'; }
  /* standard "profile" card: requirements / strengths / weaknesses / algorithmist tips / LLM link */
  function profile(p) {
    const col = (cls, icon, title, items) => items && items.length ?
      `<div class="pf-col ${cls}"><h4>${icon} ${title}</h4>${list(items)}</div>` : '';
    return `<div class="profile">` +
      col('req', '📋', 'דרישות (מה צריך כדי שזה יעבוד)', p.requirements) +
      col('str', '💪', 'חוזקות', p.strengths) +
      col('weak', '🩹', 'חולשות ומגבלות', p.weaknesses) +
      col('algo', '🧪', 'על מה לשים לב כאלגוריתמאי AI', p.algoTips) +
      (p.whenToUse ? col('when', '🎯', 'מתי להשתמש / מתי לא', p.whenToUse) : '') +
      `</div>`;
  }

  /* ---------- interactive widgets (mount into a container) ---------- */
  function tabs(el, items) {
    const bar = h('div', { class: 'tabs-bar', role: 'tablist' });
    const body = h('div', { class: 'tabs-body' });
    let idx = 0;
    function show(i) {
      idx = i; [...bar.children].forEach((b, j) => b.classList.toggle('on', j === i));
      body.innerHTML = '';
      const it = items[i];
      if (typeof it.render === 'function') it.render(body); else body.innerHTML = it.html || '';
    }
    items.forEach((it, i) => bar.appendChild(h('button', { type: 'button', class: 'tab', onclick: () => show(i) }, it.label)));
    el.appendChild(h('div', { class: 'tabs' }, bar, body));
    show(0);
    return { show };
  }

  function quiz(el, questions, opts) {
    opts = opts || {};
    const modId = opts.id || (current && current.id);
    let answered = 0, correct = 0;
    const score = h('div', { class: 'quiz-score' });
    const upd = () => {
      score.textContent = `ציון: ${correct}/${questions.length}` + (answered === questions.length ? (correct / questions.length >= 0.7 ? ' — כל הכבוד! ✅' : ' — כדאי לחזור על החומר 🔁') : '');
      if (answered === questions.length && modId) {
        const prev = progress(modId).quiz || 0;
        if (correct / questions.length > prev) mark(modId, 'quiz', correct / questions.length);
      }
    };
    const wrap = h('div', { class: 'quiz' });
    questions.forEach((q, qi) => {
      const box = h('div', { class: 'quiz-q' }, h('div', { class: 'quiz-title', html: `<b>${qi + 1}.</b> ${q.q}` }));
      const ex = h('div', { class: 'quiz-ex', html: q.explain || '' });
      let done = false;
      q.options.forEach((o, oi) => {
        const b = h('button', {
          type: 'button', class: 'quiz-opt', html: o, onclick: () => {
            if (done) return; done = true; answered++;
            if (oi === q.answer) { correct++; b.classList.add('right'); } else { b.classList.add('wrong'); box.querySelectorAll('.quiz-opt')[q.answer].classList.add('right'); }
            ex.classList.add('show'); upd();
          }
        });
        box.appendChild(b);
      });
      box.appendChild(ex); wrap.appendChild(box);
    });
    wrap.appendChild(score); upd(); el.appendChild(wrap);
  }

  function slider(label, min, max, step, value, onInput, fmtFn) {
    const val = h('b', { class: 'sl-val' });
    const inp = h('input', { type: 'range', min, max, step, value });
    const f = fmtFn || (v => v);
    const fire = () => { val.textContent = f(+inp.value); onInput && onInput(+inp.value); };
    inp.addEventListener('input', fire);
    const row = h('label', { class: 'slider' }, h('span', null, label), inp, val);
    val.textContent = f(+value);
    row.input = inp; row.fire = fire;
    return row;
  }

  /* Step-by-step simulation player.
     spec: { steps:[{title, html, run?:(ctx)=>void|Promise}], ctx?:{}, autoplayMs?:1800, onReset?:(ctx)=>void } */
  function stepper(el, spec) {
    let i = -1, playing = false, timer = null;
    const ctx = spec.ctx || {};
    const title = h('div', { class: 'st-title' });
    const body = h('div', { class: 'st-body' });
    const dots = h('div', { class: 'st-dots' });
    spec.steps.forEach((st, k) => dots.appendChild(h('button', { type: 'button', title: st.title, onclick: () => goTo(k) })));
    const prev = h('button', { type: 'button', class: 'btn', onclick: () => goTo(i - 1) }, '→ הקודם');
    const next = h('button', { type: 'button', class: 'btn primary', onclick: () => goTo(i + 1) }, 'הבא ←');
    const play = h('button', { type: 'button', class: 'btn', onclick: () => toggle() }, '▶ הפעל');
    const reset = h('button', { type: 'button', class: 'btn ghost', onclick: () => { stop(); i = -1; spec.onReset && spec.onReset(ctx); render(); } }, '⟲ התחל מחדש');
    function render() {
      [...dots.children].forEach((d, k) => { d.classList.toggle('on', k === i); d.classList.toggle('past', k < i); });
      if (i < 0) { title.textContent = spec.intro || 'לחצו "הבא" או "הפעל" כדי להתחיל'; body.innerHTML = ''; }
      else { const st = spec.steps[i]; title.innerHTML = `<span class="st-n">${i + 1}/${spec.steps.length}</span> ${st.title}`; body.innerHTML = st.html || ''; }
      prev.disabled = i <= 0; next.disabled = i >= spec.steps.length - 1;
    }
    async function goTo(k) {
      if (k < 0 || k >= spec.steps.length) return;
      if (k < i) { spec.onReset && spec.onReset(ctx); for (let j = 0; j < k; j++) { const r = spec.steps[j].run; if (r) { try { r(ctx, true); } catch (e) { console.error(e); } } } }
      i = k; render();
      const r = spec.steps[i].run; if (r) { try { await r(ctx, false); } catch (e) { console.error(e); } }
    }
    function stop() { playing = false; clearTimeout(timer); play.textContent = '▶ הפעל'; }
    function toggle() {
      if (playing) return stop();
      playing = true; play.textContent = '⏸ עצור';
      const tick = async () => { if (!playing) return; if (i >= spec.steps.length - 1) return stop(); await goTo(i + 1); timer = setTimeout(tick, spec.autoplayMs || 2200); };
      tick();
    }
    onCleanup(stop);
    el.appendChild(h('div', { class: 'stepper' }, h('div', { class: 'st-head' }, title, dots), body, h('div', { class: 'st-ctrl' }, prev, play, next, reset)));
    render();
    return { goTo, ctx, get index() { return i; } };
  }

  /* ---------- Interactive diagram with drill-down ----------
     spec = { width, height, title?, nodes:[{id,x,y,w,h,label,sub,color,shape,icon,info,children}], edges:[{from,to,label,dashed,color,bend,both}], groups:[{x,y,w,h,label,color}] }
     x,y = node CENTER. Clicking a node shows `info` in the side panel; if it has `children` (a nested spec) a "dive in" button zooms in. */
  let diagSeq = 0;
  function diagram(el, rootSpec, opts) {
    opts = opts || {};
    const uid = 'd' + (++diagSeq);
    const stack = [{ spec: rootSpec, label: rootSpec.title || 'מבט על' }];
    const crumbs = h('div', { class: 'dg-crumbs' });
    const stage = h('div', { class: 'dg-stage' });
    const panel = h('div', { class: 'dg-panel' });
    const wrap = h('div', { class: 'diagram' + (opts.compact ? ' compact' : '') }, crumbs, h('div', { class: 'dg-grid' }, stage, panel));
    el.appendChild(wrap);
    let nodeEls = {}, edgeEls = [], svg = null, selected = null;

    function defaultPanel(spec) {
      panel.innerHTML = spec.intro || `<div class="dg-hint">👆 לחצו על רכיב בדיאגרמה כדי לקרוא עליו.<br>רכיב עם הסימן <b class="dive-ic">⤵</b> אפשר לפתוח ולצלול פנימה.</div>`;
    }
    function anchor(n, tx, ty) {
      const w = (n.w || 150) / 2, hh = (n.h || 56) / 2, dx = tx - n.x, dy = ty - n.y;
      if (n.shape === 'circle') { const r = Math.max(w, hh), d = Math.hypot(dx, dy) || 1; return [n.x + dx / d * r, n.y + dy / d * r]; }
      const sx = dx === 0 ? Infinity : w / Math.abs(dx), sy = dy === 0 ? Infinity : hh / Math.abs(dy), k = Math.min(sx, sy);
      return [n.x + dx * k, n.y + dy * k];
    }
    function render() {
      const top = stack[stack.length - 1], spec = top.spec;
      crumbs.innerHTML = '';
      stack.forEach((f, k) => {
        if (k) crumbs.appendChild(h('span', { class: 'sep' }, '‹'));
        crumbs.appendChild(h('button', { type: 'button', class: k === stack.length - 1 ? 'on' : '', onclick: () => { stack.length = k + 1; render(); } }, f.label));
      });
      crumbs.style.display = stack.length > 1 || rootSpec.title ? '' : 'none';
      const W = spec.width || 900, H = spec.height || 420;
      svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'dg-svg', role: 'img' });
      const defs = s('defs');
      ['#94a3b8', ...Object.values(COLORS)].forEach((c, k) => {
        defs.appendChild(s('marker', { id: `${uid}-ar${k}`, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' },
          s('path', { d: 'M0,0 L10,5 L0,10 z', fill: c })));
      });
      const glow = s('filter', { id: `${uid}-glow`, x: '-50%', y: '-50%', width: '200%', height: '200%' },
        s('feGaussianBlur', { stdDeviation: 4, result: 'b' }), s('feMerge', null, s('feMergeNode', { in: 'b' }), s('feMergeNode', { in: 'SourceGraphic' })));
      defs.appendChild(glow); svg.appendChild(defs);
      const markerFor = c => { const all = ['#94a3b8', ...Object.values(COLORS)]; const k = all.indexOf(c); return `url(#${uid}-ar${k < 0 ? 0 : k})`; };
      (spec.groups || []).forEach(g => {
        const c = color(g.color || 'ext');
        svg.appendChild(s('rect', { x: g.x, y: g.y, width: g.w, height: g.h, rx: 14, class: 'dg-group', stroke: c, fill: c }));
        if (g.label) svg.appendChild(s('text', { x: g.x + g.w - 12, y: g.y + 20, class: 'dg-group-l', fill: c, 'text-anchor': 'start' }, g.label)); /* RTL: start = right edge */
      });
      const byId = {}; spec.nodes.forEach(n => byId[n.id] = n);
      const eLayer = s('g'), nLayer = s('g'), fxLayer = s('g');
      edgeEls = [];
      (spec.edges || []).forEach((e, k) => {
        const a = byId[e.from], b = byId[e.to]; if (!a || !b) { console.warn('diagram edge to unknown node', e); return; }
        const [x1, y1] = anchor(a, b.x, b.y), [x2, y2] = anchor(b, a.x, a.y);
        const bend = e.bend || 0, mx = (x1 + x2) / 2, my = (y1 + y2) / 2, len = Math.hypot(x2 - x1, y2 - y1) || 1;
        const cx = mx - (y2 - y1) / len * bend, cy = my + (x2 - x1) / len * bend;
        const d = bend ? `M${x1},${y1} Q${cx},${cy} ${x2},${y2}` : `M${x1},${y1} L${x2},${y2}`;
        const c = e.color ? color(e.color) : '#94a3b8';
        const p = s('path', { d, class: 'dg-edge' + (e.dashed ? ' dashed' : ''), stroke: c, 'marker-end': markerFor(c), 'marker-start': e.both ? markerFor(c) : null });
        eLayer.appendChild(p);
        if (e.label) {
          const lx = bend ? (mx + cx) / 2 : mx, ly = bend ? (my + cy) / 2 : my;
          const t = s('text', { x: lx, y: ly + 4, class: 'dg-edge-l', 'text-anchor': 'middle' }, e.label);
          const bgw = Math.max(30, e.label.length * 6.4 + 12);
          eLayer.appendChild(s('rect', { x: lx - bgw / 2, y: ly - 9, width: bgw, height: 18, rx: 9, class: 'dg-edge-lbg' }));
          eLayer.appendChild(t);
        }
        edgeEls.push({ e, p, from: e.from, to: e.to });
      });
      nodeEls = {};
      spec.nodes.forEach(n => {
        const w = n.w || 150, hh = n.h || 56, c = color(n.color);
        const g = s('g', { class: 'dg-node' + (n.children ? ' has-kids' : '') + (n.info || n.children ? ' clickable' : ''), tabindex: n.info || n.children ? 0 : null, transform: `translate(${n.x},${n.y})` });
        let shape;
        if (n.shape === 'circle') shape = s('circle', { r: Math.max(w, hh) / 2, class: 'dg-shape', stroke: c });
        else if (n.shape === 'diamond') shape = s('polygon', { points: `0,${-hh / 2} ${w / 2},0 0,${hh / 2} ${-w / 2},0`, class: 'dg-shape', stroke: c });
        else if (n.shape === 'db') {
          const rx = w / 2, ry = 8;
          shape = s('g', null,
            s('path', { d: `M${-rx},${-hh / 2 + ry} L${-rx},${hh / 2 - ry} A${rx},${ry} 0 0 0 ${rx},${hh / 2 - ry} L${rx},${-hh / 2 + ry}`, class: 'dg-shape', stroke: c }),
            s('ellipse', { cx: 0, cy: -hh / 2 + ry, rx, ry, class: 'dg-shape', stroke: c }));
        } else shape = s('rect', { x: -w / 2, y: -hh / 2, width: w, height: hh, rx: n.shape === 'round' ? hh / 2 : 12, class: 'dg-shape', stroke: c });
        g.appendChild(shape);
        g.appendChild(s('rect', { x: -w / 2, y: -hh / 2, width: w, height: 4, rx: 2, fill: c, opacity: n.shape && n.shape !== 'rect' ? 0 : 0.9, class: 'dg-accent' }));
        const label = (n.icon ? n.icon + ' ' : '') + (n.label || n.id);
        const ly = n.sub ? -4 : 5;
        g.appendChild(s('text', { y: ly, class: 'dg-label', 'text-anchor': 'middle' }, label));
        if (n.sub) g.appendChild(s('text', { y: 14, class: 'dg-sub', 'text-anchor': 'middle' }, n.sub));
        if (n.children) g.appendChild(s('text', { x: w / 2 - 12, y: -hh / 2 + 16, class: 'dg-dive', 'text-anchor': 'middle' }, '⤵'));
        const act = () => select(n);
        g.addEventListener('click', act);
        g.addEventListener('dblclick', () => { if (n.children) dive(n); });
        g.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); act(); } });
        nLayer.appendChild(g); nodeEls[n.id] = { g, n, shape };
      });
      svg.appendChild(eLayer); svg.appendChild(nLayer); svg.appendChild(fxLayer);
      svg.fx = fxLayer;
      stage.innerHTML = ''; stage.appendChild(svg);
      fitLabels();
      selected = null; defaultPanel(spec);
      opts.onRender && opts.onRender(api, stack.length - 1);
    }
    /* shrink node labels that are wider than their shape (needs the svg in the DOM) */
    function fitLabels() {
      Object.values(nodeEls).forEach(o => {
        const n = o.n, w = (n.shape === 'circle' ? Math.max(n.w || 150, n.h || 56) * 0.86 : (n.shape === 'diamond' ? (n.w || 150) * 0.7 : (n.w || 150))) - 10;
        o.g.querySelectorAll('.dg-label,.dg-sub').forEach(tx => {
          let bw = 0; try { bw = tx.getBBox().width; } catch (e) { return; }
          if (bw > w && bw > 0) {
            const fs = parseFloat(getComputedStyle(tx).fontSize) || 14;
            tx.style.fontSize = Math.max(8, fs * w / bw).toFixed(1) + 'px';
          }
        });
      });
    }
    function select(n) {
      Object.values(nodeEls).forEach(o => o.g.classList.toggle('sel', o.n === n));
      selected = n;
      panel.innerHTML = '';
      panel.appendChild(h('h4', { class: 'dg-p-title' }, (n.icon ? n.icon + ' ' : '') + (n.label || n.id)));
      if (n.sub) panel.appendChild(h('div', { class: 'dg-p-sub' }, n.sub));
      panel.appendChild(h('div', { class: 'dg-p-body', html: n.info || '' }));
      if (n.children) panel.appendChild(h('button', { type: 'button', class: 'btn primary dive-btn', onclick: () => dive(n) }, '⤵ צלול פנימה: ' + (n.label || n.id)));
      opts.onSelect && opts.onSelect(n, api);
    }
    function dive(n) { stack.push({ spec: n.children, label: n.label || n.id }); render(); stage.classList.remove('zoom'); void stage.offsetWidth; stage.classList.add('zoom'); }
    function highlight(ids, cls) {
      cls = cls || 'hl'; ids = ids || [];
      Object.entries(nodeEls).forEach(([id, o]) => o.g.classList.toggle(cls, ids.includes(id)));
      edgeEls.forEach(x => x.p.classList.toggle(cls, ids.includes(x.from) && ids.includes(x.to)));
    }
    function setSub(id, text) {
      const o = nodeEls[id]; if (!o) return;
      const t = o.g.querySelector('.dg-sub'); if (t) t.textContent = text;
      else { o.g.querySelector('.dg-label').setAttribute('y', -4); o.g.appendChild(s('text', { y: 14, class: 'dg-sub', 'text-anchor': 'middle' }, text)); }
    }
    function flowEdge(from, to, ms, c) {
      return new Promise(res => {
        const x = edgeEls.find(q => q.from === from && q.to === to) || edgeEls.find(q => q.from === to && q.to === from && q.e.both);
        if (!x || !svg) return res();
        const rev = x.from !== from; const L = x.p.getTotalLength();
        const dot = s('circle', { r: 6, class: 'dg-dot', fill: color(c || 'neuron'), filter: `url(#${uid}-glow)` });
        svg.fx.appendChild(dot); x.p.classList.add('active');
        const t0 = performance.now(); ms = ms || 700;
        (function f(now) {
          const k = Math.min(1, (now - t0) / ms), pt = x.p.getPointAtLength((rev ? 1 - k : k) * L);
          dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
          if (k < 1 && dot.isConnected) requestAnimationFrame(f); else { dot.remove(); x.p.classList.remove('active'); res(); }
        })(t0);
      });
    }
    async function flow(path, ms, c) {
      for (let k = 0; k < path.length - 1; k++) {
        if (!svg || !svg.isConnected) return;
        highlight([path[k], path[k + 1]]);
        await flowEdge(path[k], path[k + 1], ms, c);
      }
      highlight([path[path.length - 1]]);
    }
    const api = { select: id => { const o = nodeEls[id]; if (o) select(o.n); }, highlight, flow, flowEdge, setSub, render, get svg() { return svg; }, get depth() { return stack.length - 1; }, dive: id => { const o = nodeEls[id]; if (o && o.n.children) dive(o.n); }, el: wrap };
    render();
    return api;
  }

  /* ---------- page scaffold with in-page TOC ---------- */
  /* sections: [{id, title, html? , render?(el)}] */
  function page(main, cfg) {
    const toc = h('nav', { class: 'toc' }, h('div', { class: 'toc-h' }, 'בעמוד הזה'));
    const content = h('div', { class: 'page-content' });
    const header = h('header', { class: 'page-head' },
      h('div', { class: 'page-icon' }, cfg.icon || '📘'),
      h('div', null, h('h1', null, cfg.title), cfg.subtitle ? h('p', { class: 'lead', html: cfg.subtitle }) : null));
    cfg.sections.forEach((sec, k) => {
      const id = 'sec-' + (sec.id || k);
      const box = h('section', { class: 'sec', id }, h('h2', null, h('span', { class: 'sec-n' }, String(k + 1)), sec.title));
      const body = h('div', { class: 'sec-body' });
      box.appendChild(body); content.appendChild(box);
      try {
        if (sec.html) body.innerHTML = sec.html;
        if (sec.render) sec.render(body);
      } catch (e) { console.error(e); body.appendChild(h('div', { class: 'callout warn' }, 'שגיאה בטעינת החלק: ' + e.message)); }
      toc.appendChild(h('a', { href: '#', onclick: ev => { ev.preventDefault(); box.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, sec.title));
    });
    const nextMod = neighbors(current && current.id);
    const foot = h('div', { class: 'page-foot' },
      nextMod.prev ? h('a', { class: 'btn', href: '#/' + nextMod.prev.id }, '→ ' + nextMod.prev.title) : h('span'),
      nextMod.next ? h('a', { class: 'btn primary', href: '#/' + nextMod.next.id }, nextMod.next.title + ' ←') : h('span'));
    content.appendChild(foot);
    main.appendChild(header);
    main.appendChild(h('div', { class: 'page-grid' }, content, toc));
    const io = new IntersectionObserver(ents => ents.forEach(en => {
      if (en.isIntersecting) { const k = [...content.querySelectorAll('section.sec')].indexOf(en.target); [...toc.querySelectorAll('a')].forEach((a, j) => a.classList.toggle('on', j === k)); }
    }), { rootMargin: '-20% 0px -70% 0px' });
    content.querySelectorAll('section.sec').forEach(x => io.observe(x));
    onCleanup(() => io.disconnect());
  }

  /* ---------- registry & router ---------- */
  let current = null;
  const GROUPS = { start: 'התחלה', core: 'יסודות', build: 'בונים מערכות LLM', ops: 'הרחבות ו-MLOps', pro: 'מקצועי', ref: 'עזרים' };
  function register(mod) { modules.push(mod); modules.sort((a, b) => (a.order || 0) - (b.order || 0)); }
  function ordered() { return modules.filter(m => !m.hidden); }
  function neighbors(id) { const L = ordered(); const k = L.findIndex(m => m.id === id); return { prev: L[k - 1], next: k >= 0 ? L[k + 1] : null }; }
  function renderNav() {
    const nav = document.getElementById('navlinks'); if (!nav) return;
    nav.innerHTML = '';
    let g = null;
    ordered().forEach(m => {
      if (m.group !== g) { g = m.group; nav.appendChild(h('div', { class: 'nav-g' }, GROUPS[g] || g || '')); }
      const pr = progress(m.id);
      const st = pr.quiz >= 0.7 ? '✅' : pr.visited ? '◐' : '';
      nav.appendChild(h('a', { href: '#/' + m.id, class: current && current.id === m.id ? 'on' : '' },
        h('span', { class: 'nav-ic' }, m.icon || '•'), h('span', { class: 'nav-t' }, m.short || m.title), h('span', { class: 'nav-st' }, st)));
    });
  }
  function route() {
    const id = (location.hash.replace(/^#\/?/, '') || 'home').split('/')[0];
    const mod = modules.find(m => m.id === id) || modules.find(m => m.id === 'home') || modules[0];
    cleanups.forEach(f => { try { f(); } catch (e) { /* ignore */ } }); cleanups = [];
    current = mod;
    const main = document.getElementById('main');
    main.innerHTML = ''; main.scrollTop = 0; window.scrollTo(0, 0);
    document.body.classList.remove('nav-open');
    if (mod) {
      document.title = mod.title + ' · LLM Academy';
      try { mod.render(main); } catch (e) { console.error(e); main.appendChild(h('div', { class: 'callout warn' }, 'שגיאה בטעינת המודול: ' + e.message)); }
      mark(mod.id, 'visited', true);
    }
    renderNav();
  }
  /* RTL fix: isolate numeric ranges like "32–120" or "0.1-0.3" so the bidi algorithm doesn't reverse them */
  const RANGE_RE = /(\d[\d.,]*\s?[%kKMB×]?\s?[–—-]\s?\d[\d.,]*)/g;
  function isolateRanges(root) {
    if (!root || root.nodeType === 3 && !root.parentNode) return;
    const walker = document.createTreeWalker(root.nodeType === 3 ? root.parentNode : root, NodeFilter.SHOW_TEXT, {
      acceptNode: n => (!/\d[\d.,]*\s?[%kKMB×]?\s?[–—-]\s?\d/.test(n.nodeValue) || n.nodeValue.indexOf('\u2066') >= 0 ||
        n.parentNode.closest('pre,code,textarea,script,style,.mono,.out,[dir=ltr]')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    const hits = []; while (walker.nextNode()) hits.push(walker.currentNode);
    hits.forEach(n => { n.nodeValue = n.nodeValue.replace(RANGE_RE, '\u2066$1\u2069'); });
  }
  function start() {
    const mainEl = document.getElementById('main');
    if (window.MutationObserver && mainEl) {
      let pending = false;
      new MutationObserver(() => { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; isolateRanges(mainEl); }); })
        .observe(mainEl, { childList: true, subtree: true, characterData: true });
    }
    document.addEventListener('click', ev => {
      const b = ev.target.closest('.code .copy'); if (!b) return;
      const raw = b.closest('.code').querySelector('code').getAttribute('data-raw');
      const done = () => { b.textContent = 'הועתק ✓'; setTimeout(() => b.textContent = 'העתק', 1200); };
      if (navigator.clipboard) navigator.clipboard.writeText(raw).then(done, done); else done();
    });
    const tog = document.getElementById('navtoggle');
    if (tog) tog.addEventListener('click', () => document.body.classList.toggle('nav-open'));
    window.addEventListener('hashchange', route);
    route();
  }

  window.LA = {
    h, s, esc, sleep, interval, timeout, onCleanup, register, start, go: id => { location.hash = '#/' + id; },
    callout, badge, modelBadge, MODELS, code, highlight, table, list, profile,
    tabs, quiz, slider, stepper, diagram, page, COLORS, color, progress, mark,
    get modules() { return ordered(); }, get current() { return current; }
  };
})();
