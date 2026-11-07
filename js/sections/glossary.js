/* Glossary section — searchable, filterable, cross-linked. */
(function () {
  'use strict';
  const CATS = [
    ['optics', 'Optics', 'var(--optic)'],
    ['electrical', 'Electrical', 'var(--data)'],
    ['network', 'Network', 'var(--accent)'],
    ['package', 'Package', 'var(--mech, #8a94a6)'],
    ['power', 'Power', 'var(--power)'],
    ['thermal', 'Thermal', 'var(--therm)'],
    ['control', 'Control', 'var(--ctrl)'],
    ['test', 'Test / Rel.', 'var(--sense)'],
    ['general', 'General', 'var(--muted)']
  ];
  const CATMAP = {}; CATS.forEach(c => CATMAP[c[0]] = c);

  let st = null; // live UI state of the current render

  function letterOf(k) {
    const c = k.charAt(0).toUpperCase();
    return /[A-Z]/.test(c) ? c : '#';
  }

  function render(container, sub) {
    const h = CPO.h;
    const gl = CPO.glossary;
    const keys = Object.keys(gl).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
    const state = { q: '', cat: 'all', letter: '', cards: new Map(), items: [] };
    st = state;

    const count = h('span', { class: 'gl-count' });
    const search = h('input', { class: 'gl-search', type: 'search', placeholder: 'Search abbreviation, name or definition…', autocomplete: 'off', spellcheck: 'false' });
    const chips = h('div', { class: 'gl-chips' });
    const az = h('div', { class: 'gl-az' });
    const grid = h('div', { class: 'gl-grid' });
    const empty = h('div', { class: 'gl-empty', style: 'display:none' }, 'No matching terms.');

    // chips
    const chipEls = {};
    function mkChip(id, label, color) {
      const c = h('button', { class: 'gl-chip' + (id === 'all' ? ' active' : ''), type: 'button', style: '--c:' + color, onclick: () => { state.cat = id; apply(); } }, label);
      chipEls[id] = c; chips.appendChild(c);
    }
    mkChip('all', 'All', 'var(--text)');
    CATS.forEach(c => mkChip(c[0], c[1], c[2]));

    // cards
    const letters = {};
    keys.forEach((k, i) => {
      const g = gl[k]; const cat = CATMAP[g.cat] || CATMAP.general;
      const L = letterOf(k); letters[L] = (letters[L] || 0) + 1;
      const card = h('div', { class: 'gl-card', 'data-key': k, style: '--c:' + cat[2] + ';--i:' + Math.min(i % 24, 23) },
        h('div', { class: 'gl-head' },
          h('h3', { class: 'gl-term no-tip' }, k),
          h('span', { class: 'gl-cat' }, cat[1])),
        h('div', { class: 'gl-full no-tip' }, g.full || ''),
        h('p', { class: 'gl-def' }, g.def || ''));
      card.addEventListener('click', e => {
        const a = e.target.closest && e.target.closest('abbr[data-term]');
        if (a) { e.preventDefault(); CPO.go('glossary/' + encodeURIComponent(a.dataset.term)); return; }
        CPO.go('glossary/' + encodeURIComponent(k));
      });
      grid.appendChild(card);
      state.cards.set(k, card);
      state.items.push({ k, card, letter: L, cat: g.cat, hay: (k + ' ' + (g.full || '') + ' ' + (g.def || '')).toLowerCase(), keyLow: k.toLowerCase() });
    });

    // A-Z bar
    const azEls = {};
    '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(L => {
      const has = !!letters[L];
      const b = h('button', { class: 'gl-az-b' + (has ? '' : ' off'), type: 'button', disabled: has ? null : true, onclick: () => { state.letter = state.letter === L ? '' : L; apply(); } }, L);
      azEls[L] = b; az.appendChild(b);
    });

    function apply() {
      const q = state.q.trim().toLowerCase();
      const terms = q ? q.split(/\s+/) : [];
      let n = 0;
      for (const it of state.items) {
        let ok = (state.cat === 'all' || it.cat === state.cat) && (!state.letter || it.letter === state.letter);
        if (ok && terms.length) ok = terms.every(t => it.hay.indexOf(t) >= 0);
        it.card.classList.toggle('gl-hide', !ok);
        if (ok) n++;
      }
      for (const id in chipEls) chipEls[id].classList.toggle('active', id === state.cat);
      for (const L in azEls) azEls[L].classList.toggle('active', L === state.letter);
      count.textContent = n + ' / ' + state.items.length + ' terms';
      empty.style.display = n ? 'none' : '';
    }
    state.apply = apply;

    search.addEventListener('input', () => { state.q = search.value; apply(); });

    container.appendChild(h('div', { class: 'gl-wrap' },
      h('div', { class: 'gl-hero' },
        h('h1', null, 'Glossary'),
        h('p', { class: 'muted' }, 'Abbreviations and terms a CPO switch hardware engineer meets. Click any underlined term inside a card to jump to it; hover any acronym anywhere in the app for a quick definition (Alt+click opens it here).'),
        h('div', { class: 'gl-bar' }, search, count)),
      chips, az, grid, empty));

    apply();
    // Initial subroute after layout
    setTimeout(() => focusTerm(sub), 30);
    return function cleanup() { st = null; };
  }

  function focusTerm(sub) {
    if (!st) return;
    const prev = document.querySelector('.gl-card.gl-focus');
    if (prev) prev.classList.remove('gl-focus');
    if (!sub) return;
    let key = sub;
    try { key = decodeURIComponent(sub); } catch (e) { /* keep raw */ }
    let card = st.cards.get(key);
    if (!card) { // case-insensitive fallback
      const low = key.toLowerCase();
      for (const [k, c] of st.cards) if (k.toLowerCase() === low) { card = c; break; }
    }
    if (!card) return;
    if (card.classList.contains('gl-hide')) { st.q = ''; st.cat = 'all'; st.letter = ''; const inp = document.querySelector('.gl-search'); if (inp) inp.value = ''; st.apply(); }
    card.classList.add('gl-focus');
    card.scrollIntoView({ behavior: window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  }

  CPO.registerSection({
    id: 'glossary', title: 'Glossary', icon: '📖', order: 90,
    render: render,
    onSubRoute: function (sub) { focusTerm(sub); }
  });
})();
