/* LLM Academy — module "llm": LLM internals, from the product down to a single neuron.
   Labs: neuron playground (+gradient descent), toy tokenizer, attention heatmap, sampling,
   end-to-end generation stepper, memory (weights + KV cache) calculator, cost/latency calculator. */
(function () {
  'use strict';
  const { h, s, esc } = LA;

  /* =====================================================================
     small math helpers
     ===================================================================== */
  const fx = (v, d) => { d = d == null ? 2 : d; const r = Number(v).toFixed(d); return /^-0(\.0+)?$/.test(r) ? r.slice(1) : r; };
  const sigmoid = z => 1 / (1 + Math.exp(-z));
  const GK = Math.sqrt(2 / Math.PI);
  const ACTS = {
    relu: { name: 'ReLU', formula: 'max(0, z)', f: z => Math.max(0, z), d: z => (z > 0 ? 1 : 0) },
    gelu: {
      name: 'GELU', formula: '0.5·z·(1+tanh(√(2/π)(z+0.044715z³)))',
      f: z => 0.5 * z * (1 + Math.tanh(GK * (z + 0.044715 * z * z * z))),
      d: z => { const t = Math.tanh(GK * (z + 0.044715 * z * z * z)); return 0.5 * (1 + t) + 0.5 * z * (1 - t * t) * GK * (1 + 3 * 0.044715 * z * z); }
    },
    silu: { name: 'SiLU / Swish', formula: 'z·σ(z)', f: z => z * sigmoid(z), d: z => { const g = sigmoid(z); return g * (1 + z * (1 - g)); } },
    sigmoid: { name: 'Sigmoid', formula: '1/(1+e^(−z))', f: sigmoid, d: z => { const g = sigmoid(z); return g * (1 - g); } },
    tanh: { name: 'tanh', formula: 'tanh(z)', f: Math.tanh, d: z => 1 - Math.tanh(z) ** 2 },
    linear: { name: 'ללא (ליניארי)', formula: 'z', f: z => z, d: () => 1 }
  };
  function softmax(arr) {
    const m = Math.max(...arr.filter(v => v !== -Infinity));
    const e = arr.map(v => (v === -Infinity ? 0 : Math.exp(v - m)));
    const sum = e.reduce((a, b) => a + b, 0) || 1;
    return e.map(v => v / sum);
  }
  function fnv(str) { let x = 0x811c9dc5; for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 0x01000193) >>> 0; } return x >>> 0; }
  const fmtInt = n => Math.round(n).toLocaleString('en-US');
  function fmtBytes(b) {
    if (b >= 1e12) return fx(b / 1e12, 2) + ' TB';
    if (b >= 1e9) return fx(b / 1e9, 1) + ' GB';
    if (b >= 1e6) return fx(b / 1e6, 1) + ' MB';
    if (b >= 1e3) return fx(b / 1e3, 1) + ' KB';
    return fmtInt(b) + ' B';
  }
  const money = v => (v >= 100 ? '$' + fmtInt(v) : v >= 1 ? '$' + fx(v, 2) : '$' + fx(v, 4));
  const M = t => `<span class="mono">${t}</span>`;

  /* =====================================================================
     toy tokenizer (greedy longest-match over a tiny hand-made vocabulary,
     byte fallback for unknown non-ASCII characters) — an illustration, not a real BPE.
     ===================================================================== */
  const TOKENIZER = (function () {
    const vocab = new Set();
    const add = w => { vocab.add(w); vocab.add(' ' + w); };
    ('the a an is are was were be been of to and in on at that this it its for with as by from or not no yes because tired cat cats sat mat dog ' +
      'my your our their bill high low month why what how when where who which electric electricity power order cost costs price model models ' +
      'token tokens language large learn learning neural network networks data def return add print import hello world you we they he she do does ' +
      'did can will would should please help me thanks support customer account payment unusual very much more most than time day year new good bad ' +
      'first last one two three about into over after before up down out if else then all some any each other only also just like so such use used using ' +
      'self class lambda true false none sum list dict str int float range len').split(' ').forEach(w => { add(w); add(w[0].toUpperCase() + w.slice(1)); });
    ['ing', 'ed', 's', 'es', 'er', 'ers', 'ly', 'tion', 'tions', 'ity', 'al', 'ic', 'ous', 'ment', 'ness', 'able', 'ful', 'est', 'un', 're', 'in'].forEach(x => vocab.add(x));
    ('של על את זה זו לא כן יש אין אני אתה הוא היא היה היו הם מה למה כי גם עם או אם כל רק עוד שלי שלך לי לך זאת אבל כמו מאוד יותר חשבון').split(' ').forEach(add);
    'אבגדהוזחטיכךלמםנןסעפףצץקרשת'.split('').forEach(add);
    ('ים ות ית ול תי נו כם הם חש מל שב טי יח עי יף גב וה במ יו חד וד שת מש תמ רה בה לה נה דה קה ני רי לי די מי בי ור ום ון ער פר ' +
      'הח הש המ הת תו תה ית יד ות גד חד שה ').trim().split(' ').forEach(add);
    '.,?!:;()[]{}"\'-+=*/<>@#$%&_'.split('').forEach(c => { vocab.add(c); vocab.add(' ' + c); });
    vocab.add(' '); vocab.add('):'); vocab.add('()');
    const enc = new TextEncoder();
    const re = / ?[\p{L}\p{M}]+| ?\p{N}{1,3}| ?[^\s\p{L}\p{N}]+|\s+/gu;
    function encode(text) {
      const out = [];
      const chunks = text.match(re) || [];
      for (const ch of chunks) {
        if (/^ ?\p{N}{1,3}$/u.test(ch) || /^\s+$/.test(ch) && ch.length <= 4) { out.push({ t: ch, id: 1000 + fnv(ch) % 99000 }); continue; }
        let i = 0;
        while (i < ch.length) {
          let found = 0;
          for (let L = Math.min(14, ch.length - i); L >= 1; L--) if (vocab.has(ch.substr(i, L))) { found = L; break; }
          if (found) { const t = ch.substr(i, found); out.push({ t, id: 1000 + fnv(t) % 99000 }); i += found; continue; }
          const cp = ch.codePointAt(i), c = String.fromCodePoint(cp);
          if (cp < 128) out.push({ t: c, id: 1000 + fnv(c) % 99000 });
          else enc.encode(c).forEach(byte => out.push({ t: c, id: byte, byte }));
          i += c.length;
        }
      }
      return out;
    }
    return { encode, size: vocab.size };
  })();

  /* =====================================================================
     the "dive" diagram: product → server → transformer → block → head/MLP → neuron
     ===================================================================== */
  const NEURON_SPEC = {
    width: 900, height: 420,
    intro: '<p><b>רמה 4 — נוירון בודד.</b> זו היחידה הקטנה ביותר: מכפלה פנימית של קלטים במשקלים, ועוד הטיה, דרך פונקציית אקטיבציה. ' +
      'מודל של 70B פרמטרים הוא בעיקר מיליארדי משקלים <code>w</code> כאלה. לחצו על כל רכיב — ונסו את <b>מעבדת הנוירון</b> בהמשך העמוד.</p>',
    nodes: [
      { id: 'x1', x: 810, y: 80, w: 70, h: 70, shape: 'circle', label: 'x₁', sub: '1.0', color: 'data', info: '<p>קלט ראשון. בתוך MLP של LLM, ה"קלטים" של נוירון הם <b>כל 4,096 (או יותר) הרכיבים</b> של וקטור הטוקן אחרי RMSNorm — כאן הקטנו ל-3 כדי שאפשר יהיה לראות.</p><p>בדוגמה: <code>x₁ = 1.0</code>.</p>' },
      { id: 'x2', x: 810, y: 200, w: 70, h: 70, shape: 'circle', label: 'x₂', sub: '0.5', color: 'data', info: '<p>קלט שני: <code>x₂ = 0.5</code>.</p><p>הקלטים עצמם אינם נלמדים — הם תוצאה של השכבות הקודמות. מה שנלמד הם המשקלים על הקשתות.</p>' },
      { id: 'x3', x: 810, y: 320, w: 70, h: 70, shape: 'circle', label: 'x₃', sub: '−1.0', color: 'data', info: '<p>קלט שלישי: <code>x₃ = −1.0</code>. קלט שלילי כפול משקל חיובי <b>מוריד</b> את z.</p>' },
      { id: 'sum', x: 520, y: 200, w: 100, h: 100, shape: 'circle', label: 'Σ + b', sub: 'z = 0.35', color: 'neuron', info: '<p><b>הסכום המשוקלל:</b></p><p class="mono">z = w₁x₁ + w₂x₂ + w₃x₃ + b<br>= 0.8·1.0 + (−0.5)·0.5 + 0.3·(−1.0) + 0.1<br>= 0.8 − 0.25 − 0.3 + 0.1 = 0.35</p><p>זו בדיוק <b>מכפלה פנימית</b> (dot product). כשמסדרים אלפי נוירונים זה ליד זה מקבלים <b>כפל מטריצה</b> <code>z = W·x + b</code> — ולכן GPU (שמצטיין בכפל מטריצות) הוא החומרה של עולם ה-LLM.</p><p class="muted">הערה: ב-LLM מודרניים רבים (Llama וכו׳) שכבות ה-MLP <b>ללא bias</b> — ה-RMSNorm מספק את הגמישות. ההטיה כאן לצורך הלימוד.</p>' },
      { id: 'bias', x: 520, y: 360, w: 120, h: 50, label: 'b (הטיה)', sub: '0.1', color: 'neuron', info: '<p>ההטיה <code>b</code> מזיזה את סף ההפעלה: היא מאפשרת לנוירון "לירות" גם כשכל הקלטים אפס, או לדרוש קלט חזק יותר כדי להפעיל.</p><p>גם היא פרמטר נלמד, והגרדיאנט שלה הוא פשוט <code>∂L/∂b = ∂L/∂z</code>.</p>' },
      { id: 'act', x: 330, y: 200, w: 130, h: 60, label: 'f(z)', sub: 'ReLU · GELU · SiLU', color: 'ctrl', info: '<p><b>פונקציית אקטיבציה</b> — ה"עיקום" שהופך את הרשת ללא-ליניארית. בלעדיה, 100 שכבות של כפל מטריצות שקולות לכפל מטריצה אחד, ושום דבר מעניין לא נלמד.</p><ul><li><b>ReLU</b> <code>max(0,z)</code> — פשוט ומהיר; סכנה של "נוירון מת" (z&lt;0 ⇒ גרדיאנט 0).</li><li><b>GELU</b> — גרסה חלקה; שימשה ב-GPT-2/3 ו-BERT.</li><li><b>SiLU/Swish</b> <code>z·σ(z)</code> — בתוך SwiGLU, הנפוצה ב-LLM מודרניים (Llama, Qwen, Mistral...).</li></ul><p>בדוגמה (ReLU): <code>y = max(0, 0.35) = 0.35</code>.</p>' },
      { id: 'out', x: 140, y: 200, w: 130, h: 60, label: 'פלט y', sub: '0.35', color: 'ok', info: '<p>הפלט ממשיך לשכבה הבאה. ב-MLP של LLM, פלט הנוירון החבוי <code>j</code> מוכפל ב<b>עמודה j של W_down</b> ומתווסף לזרם השארית — כלומר כל נוירון "כותב" כיוון מסוים לתוך וקטור הטוקן.</p>' },
      { id: 'loss', x: 140, y: 350, w: 150, h: 60, label: 'Loss', sub: 'L = (y − t)²', color: 'warn', info: '<p><b>איך הנוירון לומד?</b> משווים את הפלט ליעד <code>t</code> ומחשבים שגיאה (כאן MSE; ב-LLM אמיתי — cross-entropy על הטוקן הבא).</p><p class="mono">t = 1.0 → L = (0.35 − 1)² = 0.4225</p><p><b>Backprop</b> — כלל השרשרת אחורה:</p><p class="mono">∂L/∂y = 2(y−t) = −1.3<br>∂L/∂z = ∂L/∂y · f′(z) = −1.3 · 1 = −1.3<br>∂L/∂wᵢ = ∂L/∂z · xᵢ = [−1.3, −0.65, +1.3]<br>∂L/∂b = −1.3</p><p><b>Gradient descent</b> עם learning rate <code>η = 0.1</code>:</p><p class="mono">w ← w − η·∂L/∂w = [0.93, −0.435, 0.17]<br>b ← 0.1 + 0.13 = 0.23<br>z חדש = 0.7725 → L = 0.0518 ✓</p><p>הלוס ירד פי 8 בצעד אחד. אימון LLM הוא אותו דבר בדיוק — רק על מיליארדי משקלים במקביל, ועם אופטימייזר חכם יותר (AdamW).</p>' }
    ],
    edges: [
      { from: 'x1', to: 'sum', label: 'w₁ = 0.8', color: 'ok' },
      { from: 'x2', to: 'sum', label: 'w₂ = −0.5', color: 'warn' },
      { from: 'x3', to: 'sum', label: 'w₃ = 0.3', color: 'ok' },
      { from: 'bias', to: 'sum' },
      { from: 'sum', to: 'act', label: 'z' },
      { from: 'act', to: 'out', label: 'y' },
      { from: 'out', to: 'loss' },
      { from: 'loss', to: 'sum', label: '∂L/∂w', dashed: true, color: 'warn', bend: -40 }
    ]
  };

  const MLP_SPEC = {
    width: 900, height: 430,
    intro: '<p><b>רמה 3ב — ה-MLP (Feed-Forward).</b> מעבד <b>כל טוקן לחוד</b> (בלי לדבר עם טוקנים אחרים). כאן יושבים בערך <b>שני שלישים מהפרמטרים</b> של מודל צפוף, וכאן — לפי מחקרי interpretability — מאוחסן חלק גדול מה"ידע העובדתי". ' +
      'המבנה המודרני הוא <b>SwiGLU</b>: <code>FFN(x) = W_down( SiLU(W_gate·x) ⊙ (W_up·x) )</code>.</p>',
    nodes: [
      { id: 'x', x: 820, y: 210, w: 130, label: 'x מנורמל', sub: 'd = 4096', color: 'data', info: '<p>וקטור הטוקן אחרי RMSNorm. במודל בגודל ~8B (כמו Llama 3 8B): <code>d = 4096</code>.</p>' },
      { id: 'gate', x: 630, y: 100, w: 150, label: 'W_gate', sub: 'd → d_ff', color: 'llm', info: '<p>הקרנה למעלה, ענף ה"שער". מטריצה <code>d × d_ff</code>. ב-Llama 3 8B: <code>4096 × 14336</code> ≈ 58.7M פרמטרים — בשכבה אחת!</p><p>ב-GPT הקלאסי היה רק ענף אחד עם <code>d_ff = 4d</code> ו-GELU. ב-SwiGLU יש שתי מטריצות קלט, ולכן נוהגים לבחור <code>d_ff ≈ 8/3·d</code> כדי לשמור על אותו מספר פרמטרים (בפועל מעגלים — אצל Llama 3 זה 3.5d).</p>' },
      { id: 'up', x: 630, y: 320, w: 150, label: 'W_up', sub: 'd → d_ff', color: 'llm', info: '<p>הקרנה למעלה, ענף ה"ערך". אותו גודל כמו W_gate. כל <b>שורה</b> במטריצה הזו היא וקטור המשקלים של <b>נוירון חבוי אחד</b> — בדיוק ה-<code>w</code> מרמה 4.</p>' },
      { id: 'act', x: 440, y: 100, w: 130, label: 'SiLU', sub: 'z·σ(z)', color: 'ctrl', info: '<p>אקטיבציה חלקה על ענף השער. ערכים שליליים גדולים → כמעט 0 ("שער סגור"); חיוביים → עוברים כמעט כמו שהם.</p>' },
      { id: 'mul', x: 300, y: 210, w: 60, h: 60, shape: 'circle', label: '⊙', color: 'ctrl', info: '<p>כפל <b>איבר-איבר</b> (Hadamard): השער (אחרי SiLU) מחליט <b>כמה</b> מכל רכיב בענף ה-up יעבור. זה מנגנון "gating" — הרשת לומדת לפתוח/לסגור נוירונים לפי ההקשר.</p>' },
      { id: 'down', x: 140, y: 210, w: 140, label: 'W_down', sub: 'd_ff → d', color: 'llm', info: '<p>הקרנה חזרה למימד המודל. הפלט מתווסף לזרם השארית (residual). כל <b>עמודה</b> ב-W_down היא "הכיוון" שנוירון חבוי אחד כותב לתוך וקטור הטוקן.</p><p>סה״כ MLP בשכבה: <code>3 · d · d_ff</code> = 3·4096·14336 ≈ <b>176M</b> פרמטרים, ×32 שכבות ≈ 5.6B — רוב 8B הפרמטרים.</p>' },
      { id: 'neuron', x: 440, y: 330, w: 150, h: 64, label: 'נוירון חבוי j', sub: '1 מתוך 14,336', color: 'neuron', info: '<p>"נוירון" אחד ב-MLP הוא אינדקס <code>j</code> אחד בשכבה החבויה: <code>z_j = w_j · x</code> (שורה j של W_gate/W_up), אקטיבציה, כפל בשער, ואז כתיבה דרך עמודה j של W_down.</p><p>צללו פנימה כדי לראות את המתמטיקה של נוירון בודד — עם 3 קלטים במקום 4,096.</p>', children: NEURON_SPEC }
    ],
    edges: [
      { from: 'x', to: 'gate' }, { from: 'x', to: 'up' },
      { from: 'gate', to: 'act' }, { from: 'act', to: 'mul' }, { from: 'up', to: 'mul' },
      { from: 'mul', to: 'down', label: 'd_ff' },
      { from: 'up', to: 'neuron', dashed: true, color: 'neuron', label: 'שורה j' }
    ]
  };

  const ATTN_SPEC = {
    width: 900, height: 500,
    intro: '<p><b>רמה 3א — ראש Attention אחד.</b> המקום היחיד במודל שבו טוקנים "מדברים" זה עם זה. כל טוקן שואל שאלה (<b>Q</b>), כל טוקן מפרסם "תווית" (<b>K</b>) ותוכן (<b>V</b>). ' +
      'הנוסחה: <code>Attention(Q,K,V) = softmax(QKᵀ/√dₖ + mask) · V</code>. נסו את <b>מעבדת ה-Attention</b> בהמשך כדי לראות את המטריצה מחושבת.</p>',
    nodes: [
      { id: 'x', x: 820, y: 250, w: 130, label: 'x מנורמל', sub: 'T × d', color: 'data', info: '<p>T וקטורים (אחד לכל טוקן בהקשר), כל אחד באורך d. אותם וקטורים נכנסים לשלוש הקרנות שונות.</p>' },
      { id: 'q', x: 650, y: 100, w: 140, label: 'Q = x·W_Q', sub: '"מה אני מחפש"', color: 'llm', info: '<p><b>Query</b>: לכל טוקן, וקטור שמבטא מה הוא מחפש בהקשר. לדוגמה, המילה "הוא" מחפשת "שם עצם זכר שהוזכר קודם".</p><p>מימד לראש: <code>dₕ = d / H</code>, למשל 4096/32 = <b>128</b>.</p><p>על Q ו-K מפעילים <b>RoPE</b> — סיבוב בזווית שתלויה במיקום — כך שהמכפלה Q·K תלויה במרחק היחסי בין הטוקנים.</p>' },
      { id: 'k', x: 650, y: 250, w: 140, label: 'K = x·W_K', sub: '"מה אני מציע"', color: 'llm', info: '<p><b>Key</b>: התווית של כל טוקן — מה הוא "מפרסם" כדי שאחרים ימצאו אותו. "החתול" מפרסם משהו כמו "שם עצם, חי, זכר".</p><p><b>GQA</b> (Grouped-Query Attention): כמה ראשי Q חולקים ראש K/V אחד (למשל 32 ראשי Q, 8 ראשי KV) — חוסך פי 4 בזיכרון ה-KV cache.</p>' },
      { id: 'v', x: 650, y: 410, w: 140, label: 'V = x·W_V', sub: '"התוכן שלי"', color: 'llm', info: '<p><b>Value</b>: המידע שהטוקן ימסור למי שבחר להסתכל עליו. ההפרדה בין K (איך מוצאים אותי) ל-V (מה אני מוסר) היא מה שהופך את המנגנון לגמיש.</p>' },
      { id: 'score', x: 470, y: 175, w: 140, label: 'QKᵀ / √dₖ', sub: 'ציונים T×T', color: 'ctrl', info: '<p>לכל זוג (i, j): מכפלה פנימית <code>qᵢ·kⱼ</code> — עד כמה המפתח של j עונה לשאלה של i.</p><p><b>למה לחלק ב-√dₖ?</b> אם רכיבי q ו-k בעלי שונות ~1, השונות של המכפלה היא ~dₖ. בלי הנרמול, הציונים גדולים, ה-softmax "רווי" (כמעט one-hot) והגרדיאנטים נעלמים.</p><p class="muted">בפועל לא בונים את מטריצת T×T המלאה בזיכרון — kernels כמו FlashAttention מחשבים אותה בבלוקים.</p>' },
      { id: 'mask', x: 310, y: 175, w: 140, label: 'מסכה סיבתית', sub: 'עתיד = −∞', color: 'warn', info: '<p>טוקן i מורשה להסתכל רק על j ≤ i. מוסיפים <code>−∞</code> לכל ציון "עתידי", ואחרי softmax המשקל שלו 0.</p><p>זה מה שהופך את המודל ל-<b>decoder</b> אוטורגרסיבי: באימון אפשר לחזות את <b>כל</b> המיקומים במקביל (כל אחד רואה רק את העבר), ובהסקה — ההתנהגות זהה.</p>' },
      { id: 'smax', x: 150, y: 175, w: 130, label: 'Softmax', sub: 'משקלי קשב', color: 'ctrl', info: '<p>כל שורה הופכת להתפלגות (סכום 1): "כמה אחוז מתשומת הלב של טוקן i הולכים לכל טוקן j".</p>' },
      { id: 'wsum', x: 310, y: 410, w: 140, label: 'A · V', sub: 'סכום משוקלל', color: 'ctrl', info: '<p>הפלט של טוקן i הוא <b>ממוצע משוקלל של וקטורי ה-V</b> לפי משקלי הקשב: <code>outᵢ = Σⱼ Aᵢⱼ·vⱼ</code>. כך "הוא" מקבל לתוכו מידע מ"החתול".</p>' },
      { id: 'wo', x: 140, y: 410, w: 140, label: 'Concat + W_O', sub: 'H ראשים → d', color: 'llm', info: '<p>כל H הראשים רצים במקביל, כל אחד לומד דפוס אחר (תחביר, הפניה לאחור, "הטוקן הקודם"...). משרשרים את הפלטים ומקרינים עם <code>W_O</code> חזרה ל-d, ואז מוסיפים ל-residual.</p>' },
      { id: 'kv', x: 480, y: 330, w: 120, h: 60, shape: 'db', label: 'KV cache', color: 'store', info: '<p>בזמן יצירה, K ו-V של טוקנים קודמים <b>לא משתנים</b> (בזכות המסכה הסיבתית). לכן שומרים אותם בזיכרון ומחשבים בכל צעד רק את ה-Q/K/V של הטוקן החדש.</p><p>המחיר: זיכרון שגדל ליניארית עם אורך ההקשר — <code>2 · L · H_kv · dₕ · bytes</code> לכל טוקן. ראו את מחשבון הזיכרון בהמשך.</p>' },
      { id: 'heads', x: 820, y: 420, w: 130, h: 56, label: '× H ראשים', sub: 'למשל 32–128', color: 'ext', info: '<p><b>Multi-Head</b>: במקום ראש קשב אחד ברוחב d, מפצלים ל-H ראשים צרים. כל ראש יכול להתמחות בקשר אחר. דוגמאות שנמצאו במחקר: "previous-token head", "induction head" (מעתיק דפוסים שחוזרים בהקשר), ראשים תחביריים.</p>' }
    ],
    edges: [
      { from: 'x', to: 'q' }, { from: 'x', to: 'k' }, { from: 'x', to: 'v' },
      { from: 'q', to: 'score' }, { from: 'k', to: 'score' },
      { from: 'score', to: 'mask' }, { from: 'mask', to: 'smax' },
      { from: 'smax', to: 'wsum', label: 'A' }, { from: 'v', to: 'wsum' },
      { from: 'wsum', to: 'wo' },
      { from: 'k', to: 'kv', dashed: true, color: 'store' }, { from: 'v', to: 'kv', dashed: true, color: 'store' }
    ]
  };

  const BLOCK_SPEC = {
    width: 900, height: 580,
    intro: '<p><b>רמה 2 — בלוק Decoder אחד</b> (בסגנון "pre-norm" של מודלים מודרניים). שני תת-שלבים, כל אחד עטוף בחיבור שארית:</p>' +
      '<p class="mono">h = x + Attention(RMSNorm(x))<br>out = h + MLP(RMSNorm(h))</p><p>ה-<b>residual stream</b> הוא "אוטובוס" משותף: כל תת-שכבה קוראת ממנו ומוסיפה לו תיקון קטן.</p>',
    nodes: [
      { id: 'xin', x: 450, y: 535, w: 170, label: 'x (קלט לבלוק)', sub: 'T × d', color: 'data', info: '<p>וקטורי הטוקנים כפי שיצאו מהבלוק הקודם (או מה-Embedding, בבלוק הראשון).</p>' },
      { id: 'norm1', x: 450, y: 450, w: 150, label: 'RMSNorm', sub: 'לפני Attention', color: 'ext', info: '<p><code>RMSNorm(x) = x / √(mean(x²) + ε) · g</code></p><p>מנרמל את "גודל" הווקטור (לא מחסר ממוצע כמו LayerNorm — זול יותר ועובד באותה מידה). <code>g</code> הוא וקטור משקלים נלמד. מייצב את האימון בעשרות-מאות שכבות.</p>' },
      { id: 'attn', x: 450, y: 365, w: 230, h: 62, label: 'Multi-Head Attention', sub: 'ערבוב בין טוקנים', color: 'llm', info: '<p>השלב שבו כל טוקן אוסף מידע מטוקנים קודמים. בערך <b>שליש</b> מהפרמטרים של בלוק צפוף (W_Q, W_K, W_V, W_O).</p><p>צללו פנימה לראש קשב בודד.</p>', children: ATTN_SPEC },
      { id: 'add1', x: 450, y: 280, w: 46, h: 46, shape: 'circle', label: '+', color: 'ok', info: '<p><b>חיבור שארית (residual)</b>: <code>h = x + Attn(...)</code>. מאפשר לגרדיאנט לזרום ישירות דרך עשרות שכבות ("כביש מהיר"), ומאפשר לכל שכבה ללמוד רק <b>תיקון</b> קטן במקום לבנות את הייצוג מחדש.</p>' },
      { id: 'norm2', x: 450, y: 205, w: 150, label: 'RMSNorm', sub: 'לפני MLP', color: 'ext', info: '<p>נרמול שני, לפני ה-MLP. אותה נוסחה, משקלי g נפרדים.</p>' },
      { id: 'mlp', x: 450, y: 125, w: 230, h: 62, label: 'MLP / FFN', sub: 'עיבוד לכל טוקן', color: 'llm', info: '<p>רשת feed-forward שפועלת על כל טוקן בנפרד: הרחבה למימד גבוה (~3.5d–4d), אקטיבציה, וכיווץ חזרה. כ<b>שני שלישים</b> מהפרמטרים.</p><p>צללו פנימה — שם נמצא הנוירון הבודד.</p>', children: MLP_SPEC },
      { id: 'add2', x: 450, y: 45, w: 46, h: 46, shape: 'circle', label: '+', color: 'ok', info: '<p>חיבור שארית שני: <code>out = h + MLP(...)</code>. הפלט עובר לבלוק הבא — וכך N פעמים.</p>' },
      { id: 'out', x: 170, y: 45, w: 170, label: 'לבלוק הבא', sub: 'T × d', color: 'data', info: '<p>אותו צורה בדיוק כמו הקלט (<code>T × d</code>) — ולכן אפשר לערום בלוקים כמו לבנים. מה שמשתנה הוא <b>התוכן</b>: ככל שעולים, הייצוג הופך מופשט יותר ומכוון יותר לחיזוי הטוקן הבא.</p>' },
      { id: 'moe', x: 760, y: 125, w: 170, h: 62, label: 'MoE Router', sub: 'אופציונלי', color: 'tool', info: '<p><b>Mixture of Experts</b>: במקום MLP אחד יש E "מומחים" (MLPs), ו-router קטן בוחר לכל טוקן את ה-top-k (למשל 2 מתוך 8, או 8 מתוך 256).</p><ul><li><b>פרמטרים כוללים</b> ≫ <b>פרמטרים פעילים</b> לטוקן — יכולת של מודל ענק בעלות חישוב של מודל קטן יותר.</li><li>אבל כל המומחים חייבים לשבת בזיכרון ה-GPU.</li><li>אתגרים: איזון עומסים בין מומחים, תקשורת בין GPUs, ואי-דטרמיניזם (ניתוב תלוי ב-batch).</li></ul><p class="muted">בשימוש במודלים פתוחים רבים (Mixtral, DeepSeek-V3, Qwen-MoE). פרטי הארכיטקטורה של מודלים סגורים — כולל Claude — אינם פומביים.</p>' }
    ],
    edges: [
      { from: 'xin', to: 'norm1' }, { from: 'norm1', to: 'attn' }, { from: 'attn', to: 'add1' },
      { from: 'xin', to: 'add1', bend: -300, dashed: true, color: 'ok', label: 'residual' },
      { from: 'add1', to: 'norm2' }, { from: 'norm2', to: 'mlp' }, { from: 'mlp', to: 'add2' },
      { from: 'add1', to: 'add2', bend: -300, dashed: true, color: 'ok', label: 'residual' },
      { from: 'add2', to: 'out' },
      { from: 'moe', to: 'mlp', dashed: true, color: 'tool', label: 'בוחר מומחים' }
    ]
  };

  const TRANSFORMER_SPEC = {
    width: 900, height: 560,
    intro: '<p><b>רמה 1 — ה-Transformer Decoder.</b> פונקציה ענקית אחת: רצף מזהי טוקנים נכנס ← התפלגות הסתברויות על הטוקן הבא יוצאת. הזרימה מלמטה למעלה, ואז ימינה-לשמאל לדגימה.</p>' +
      '<p class="muted">המספרים בתוויות הם <b>טיפוסיים</b> למודלים פתוחים מוכרים (למשל Llama 3: 32 שכבות ו-d=4096 ב-8B; 80 שכבות ו-d=8192 ב-70B). מספרי הארכיטקטורה של מודלים סגורים אינם פומביים.</p>',
    nodes: [
      { id: 'ids', x: 450, y: 515, w: 170, label: 'מזהי טוקנים', sub: '[1532, 87, 9921, …]', color: 'data', info: '<p>הקלט של הרשת הוא <b>רק מספרים שלמים</b> — אינדקסים לאוצר המילים (vocab) בגודל V ≈ 100k–260k טיפוסית. הרשת אף פעם לא רואה "אותיות".</p>' },
      { id: 'emb', x: 450, y: 425, w: 170, label: 'Embedding', sub: 'טבלה V × d', color: 'llm', info: '<p>מטריצה <code>E</code> בגודל <code>V × d</code>; כל מזהה בוחר <b>שורה</b> — וקטור של d מספרים. דוגמה: 128,256 × 4,096 ≈ <b>525M</b> פרמטרים.</p><p>הווקטורים נלמדים: טוקנים בעלי שימוש דומה מסתיימים קרובים במרחב. זה לא "embedding model" לחיפוש (ראו סעיף Embeddings) — אבל אותו רעיון.</p>' },
      { id: 'pos', x: 760, y: 330, w: 170, label: 'מידע מיקום', sub: 'RoPE בתוך Q,K', color: 'ctrl', info: '<p>Attention עצמו "עיוור לסדר" — הוא רואה קבוצה, לא רצף. צריך להזריק מיקום:</p><ul><li><b>RoPE</b> (Rotary, הנפוץ היום): מסובבים את Q ו-K בזווית שתלויה במיקום. התוצאה: המכפלה q·k תלויה ב<b>מרחק היחסי</b>.</li><li>ישן יותר: וקטור מיקום נלמד/סינוסי שמתווסף ל-embedding (GPT-2, Transformer המקורי).</li></ul><p>הארכת חלון ההקשר (למשל מ-8k ל-128k+) נעשית בין השאר ע״י שינוי סקאלת הזוויות של RoPE ואימון המשך.</p>' },
      { id: 'blocks', x: 450, y: 330, w: 250, h: 66, label: 'בלוקי Decoder × N', sub: 'טיפוסי: 32–120+ שכבות', color: 'llm', info: '<p>אותו מבנה חוזר N פעמים, עם משקלים שונים בכל שכבה. כאן נמצאים כמעט כל הפרמטרים.</p><ul><li>מודל ~8B: 32 שכבות, d=4096</li><li>מודל ~70B: 80 שכבות, d=8192</li><li>מודלי חזית: עשרות עד 100+ שכבות, d של אלפים רבים, לעתים MoE עם מאות מיליארדי פרמטרים.</li></ul><p>כלל אצבע למודל צפוף: <code>P ≈ 12 · L · d²</code> (+ embeddings). ל-32 שכבות ו-d=4096: ≈ 6.4B.</p><p>צללו פנימה לבלוק אחד.</p>', children: BLOCK_SPEC },
      { id: 'norm', x: 450, y: 235, w: 170, label: 'RMSNorm סופי', color: 'ext', info: '<p>נרמול אחרון על ה-residual stream לפני ההקרנה לאוצר המילים.</p>' },
      { id: 'head', x: 450, y: 145, w: 170, label: 'LM Head', sub: 'unembedding d × V', color: 'llm', info: '<p>כפל מטריצה <code>logits = h · W_U</code> שממפה את וקטור המיקום <b>האחרון</b> (d מספרים) ל-<b>V ציונים</b> — logit אחד לכל טוקן אפשרי.</p><p>במודלים קטנים מרבים "לקשור" (weight tying) את W_U למטריצת ה-Embedding כדי לחסוך פרמטרים.</p>' },
      { id: 'softmax', x: 250, y: 60, w: 150, label: 'Softmax', sub: 'logits → p', color: 'ctrl', info: '<p class="mono">pᵢ = exp(zᵢ / T) / Σⱼ exp(zⱼ / T)</p><p>הופך ציונים להתפלגות הסתברות. <code>T</code> (temperature) מחדד/משטח אותה — ראו מעבדת הדגימה.</p>' },
      { id: 'sample', x: 80, y: 60, w: 130, label: 'דגימה', sub: 'טוקן אחד', color: 'ok', info: '<p>בוחרים טוקן אחד מההתפלגות (greedy / temperature / top-p). הטוקן נוסף לרצף — וכל המכונה רצה שוב לטוקן הבא. זה ה-<b>autoregressive loop</b>.</p>' },
      { id: 'params', x: 760, y: 515, w: 190, label: 'איפה הפרמטרים?', sub: 'מיליארדים', color: 'neuron', info: '<p>חלוקה טיפוסית במודל צפוף (~8B):</p><ul><li>MLP: ~65–70%</li><li>Attention: ~20%</li><li>Embedding + LM head: ~10–15%</li><li>Norms: זניח</li></ul><p>זיכרון המשקלים = פרמטרים × בייטים: 8B ב-bf16 ≈ 16GB; 70B ≈ 140GB (יותר מכרטיס 80GB אחד — ולכן מפצלים בין GPUs או עושים קוונטיזציה).</p>' }
    ],
    edges: [
      { from: 'ids', to: 'emb', label: 'T' },
      { from: 'emb', to: 'blocks', label: 'T × d' },
      { from: 'pos', to: 'blocks', dashed: true, color: 'ctrl' },
      { from: 'blocks', to: 'norm', label: 'T × d' },
      { from: 'norm', to: 'head', label: 'd (מיקום אחרון)' },
      { from: 'head', to: 'softmax', label: 'V logits' },
      { from: 'softmax', to: 'sample' }
    ]
  };

  const SERVER_SPEC = {
    width: 900, height: 400,
    intro: '<p><b>בתוך שרת ההסקה.</b> שלושה חלקים עיקריים: <b>Tokenizer</b> (טקסט ↔ מספרים, דטרמיניסטי), <b>המודל</b> (רשת הנוירונים — כאן הכסף והחישוב), ו-<b>Sampler</b> (בחירת טוקן). מסביבם: scheduler שמאחד בקשות של משתמשים רבים, ו-KV cache.</p>',
    nodes: [
      { id: 'in', x: 830, y: 190, w: 120, label: 'פרומפט מלא', sub: 'system + היסטוריה', color: 'data', info: '<p>ההודעות (system, user, assistant, תוצאות כלים) מרונדרות לטקסט אחד לפי <b>chat template</b> עם טוקנים מיוחדים שמסמנים "כאן מתחיל תור המשתמש" וכו׳. המודל לא יודע מה זה "הודעה" — הוא רואה רצף טוקנים אחד ארוך.</p>' },
      { id: 'tok', x: 670, y: 190, w: 130, label: 'Tokenizer', sub: 'טקסט → מזהים', color: 'tool', info: '<p>אלגוריתם <b>דטרמיניסטי</b> (לא נוירוני) — בדרך כלל byte-level BPE: מתחילים מבייטים ומיזוגים שנלמדו מקורפוס. אוצר מילים טיפוסי: 100k–260k.</p><p>השלכות: עלות, אורך הקשר, ובעיות מוכרות (ספירת אותיות, חשבון עם מספרים ארוכים). <b>עברית</b> בדרך כלל עולה יותר טוקנים לאותו תוכן. ראו מעבדת הטוקנייזר.</p>' },
      { id: 'model', x: 470, y: 190, w: 160, h: 64, label: 'Transformer', sub: 'מיליארדי פרמטרים', color: 'llm', info: '<p>רשת הנוירונים. מקבלת T מזהים, מחזירה <b>logits</b> לטוקן הבא. רצה על מאיצים (GPU/TPU/Trainium), המשקלים מפוצלים בין כמה שבבים (tensor/pipeline parallelism).</p><p>שני מצבי עבודה:</p><ul><li><b>Prefill</b> — כל הפרומפט במקביל; חסום-חישוב (compute-bound); קובע את זמן התגובה הראשונה (TTFT).</li><li><b>Decode</b> — טוקן אחד בכל צעד; חסום-רוחב-פס-זיכרון; קובע את קצב הזרימה.</li></ul><p>צללו פנימה לארכיטקטורה.</p>', children: TRANSFORMER_SPEC },
      { id: 'sampler', x: 275, y: 190, w: 130, label: 'Sampler', sub: 'logits → טוקן', color: 'ctrl', info: '<p>מקבל וקטור logits באורך V ובוחר טוקן: greedy, temperature, top-k, top-p, וגם בדיקות עצירה — טוקן סיום (EOS), <code>max_tokens</code>, stop sequences. כאן גם נאכפים <b>structured outputs</b> (מסכת טוקנים שאינם תואמים לסכמה).</p>' },
      { id: 'detok', x: 95, y: 190, w: 130, label: 'Detokenizer', sub: 'מזהה → טקסט', color: 'tool', info: '<p>ממיר מזהה חזרה לבייטים ולטקסט וזורם ללקוח (streaming). אות עברית היא 2 בייטים ב-UTF-8 — טוקן יכול להסתיים באמצע תו, ולכן השרת מחזיק בייטים עד שתו שלם מוכן.</p>' },
      { id: 'kv', x: 470, y: 335, w: 150, h: 64, shape: 'db', label: 'KV cache', sub: 'לכל רצף', color: 'store', info: '<p>זיכרון ה-K וה-V של כל הטוקנים הקודמים, בכל השכבות. מאפשר ל-decode לחשב רק את הטוקן החדש. מנוהל בדפים (PagedAttention) כדי לשרת אלפי רצפים במקביל. <b>Prompt caching</b> ב-API שומר את הקידומת הזו בין בקשות.</p>' },
      { id: 'sched', x: 470, y: 55, w: 170, label: 'Scheduler', sub: 'continuous batching', color: 'ext', info: '<p>מאחד בקשות של משתמשים רבים לאותו forward pass כדי לנצל את ה-GPU. בקשות נכנסות ויוצאות מה-batch בכל צעד.</p><p>תופעת לוואי: סדר פעולות נקודה-צפה תלוי ב-batch — אחד המקורות ל<b>אי-דטרמיניזם</b> גם כשהדגימה "חמדנית".</p>' }
    ],
    edges: [
      { from: 'in', to: 'tok' }, { from: 'tok', to: 'model', label: 'ids' }, { from: 'model', to: 'sampler', label: 'logits' },
      { from: 'sampler', to: 'detok', label: 'id' },
      { from: 'sampler', to: 'model', bend: 140, dashed: true, color: 'neuron', label: 'חוזר לקלט' },
      { from: 'model', to: 'kv', both: true, color: 'store' },
      { from: 'sched', to: 'model', dashed: true }
    ]
  };

  const ROOT_SPEC = {
    title: 'מוצר LLM', width: 900, height: 330,
    intro: '<p><b>רמה 0 — המוצר.</b> כשמשתמש מקליד שאלה בצ׳אט, ההודעה עוברת דרך האפליקציה וה-API אל שרת הסקה, ושם — רשת נוירונים. לחצו על רכיב; רכיב עם <b class="dive-ic">⤵</b> אפשר לפתוח. הנתיב המלא: מוצר ← שרת ← Transformer ← בלוק ← Attention / MLP ← <b>נוירון</b>.</p>',
    nodes: [
      { id: 'user', x: 835, y: 120, w: 110, label: 'משתמש', sub: 'שואל שאלה', color: 'ui', icon: '👤', info: '<p>"חשבון החשמל שלי גבוה פי 2 מהרגיל, למה?" — מבחינת המודל, זה רק רצף של כ-15–25 טוקנים.</p>' },
      { id: 'app', x: 660, y: 120, w: 140, label: 'אפליקציית צ׳אט', sub: 'UI + היסטוריה', color: 'ui', info: '<p>שומרת את היסטוריית השיחה, מוסיפה system prompt, כלים ומסמכים (RAG), ומציגה את התשובה בזרימה.</p><p><b>חשוב:</b> ה-API הוא <b>חסר-מצב</b> (stateless) — בכל תור האפליקציה שולחת מחדש את כל ההיסטוריה. לכן שיחה ארוכה = יותר טוקני קלט = יותר כסף. ראו <a href="#/chat">ממשקי צ׳אט</a>.</p>' },
      { id: 'api', x: 480, y: 120, w: 110, label: 'API', sub: 'auth · limits', color: 'ext', info: '<p>נקודת קצה HTTPS (אצל Anthropic: <code>POST /v1/messages</code>). אחראית על אימות מפתח, rate limits, ניתוב לשרת עם המודל המבוקש, ספירת טוקנים לחיוב, והחזרת התשובה בזרם (SSE).</p><p>התשובה כוללת <code>usage</code> — <code>input_tokens</code> ו-<code>output_tokens</code> — הבסיס לכל חישוב עלות.</p>' },
      { id: 'llm', x: 245, y: 120, w: 190, h: 64, label: 'שרת הסקה (LLM)', sub: 'inference server', color: 'llm', info: '<p>אשכול מאיצים שמחזיק את משקלי המודל בזיכרון ומריץ את הרשת. בתוכו: tokenizer, המודל, sampler, ו-KV cache.</p><p>צללו פנימה — מכאן מתחיל המסע אל הנוירון.</p>', children: SERVER_SPEC },
      { id: 'kb', x: 660, y: 260, w: 160, label: 'כלים ומסמכים', sub: 'RAG · tools', color: 'store', shape: 'db', h: 64, info: '<p>המודל לא "מחובר לאינטרנט" ולא "זוכר" את המסמכים שלכם. האפליקציה (או לולאת סוכן) מאחזרת מידע ומוסיפה אותו <b>לחלון ההקשר</b>. ראו <a href="#/rag">RAG</a> ו-<a href="#/agents">סוכנים</a>.</p>' },
      { id: 'out', x: 80, y: 260, w: 130, label: 'תשובה', sub: 'טוקן אחר טוקן', color: 'ok', info: '<p>התשובה נוצרת טוקן-טוקן וזורמת חזרה דרך ה-API לאפליקציה. לכן רואים את הטקסט "מוקלד" בהדרגה.</p>' }
    ],
    edges: [
      { from: 'user', to: 'app', label: 'הודעה' }, { from: 'app', to: 'api', label: 'JSON' }, { from: 'api', to: 'llm' },
      { from: 'kb', to: 'app', dashed: true, color: 'store', label: 'הקשר' },
      { from: 'llm', to: 'out', label: 'stream' }
    ]
  };

  const DIVE_PATHS = [
    { label: '0 · מוצר', path: [] },
    { label: '1 · שרת הסקה', path: ['llm'] },
    { label: '2 · Transformer', path: ['llm', 'model'] },
    { label: '3 · בלוק', path: ['llm', 'model', 'blocks'] },
    { label: '4א · Attention', path: ['llm', 'model', 'blocks', 'attn'] },
    { label: '4ב · MLP', path: ['llm', 'model', 'blocks', 'mlp'] },
    { label: '5 · נוירון', path: ['llm', 'model', 'blocks', 'mlp', 'neuron'] }
  ];

  /* =====================================================================
     LAB 1 — single neuron playground
     ===================================================================== */
  function neuronLab(el) {
    const st = { x: [1, 0.5, -1], w: [0.8, -0.5, 0.3], b: 0.1, act: 'relu', t: 1, lr: 0.1, hist: [], last: '' };
    const svgBox = h('div', { class: 'llm-neuron-box' });
    const calc = h('div', { class: 'out llm-calc' });
    const actPlot = h('div', { class: 'llm-actplot' });
    const warn = h('div', { class: 'llm-warnline' });
    const sliders = { x: [], w: [] };
    const setRow = (row, v) => { row.input.value = v; row.querySelector('.sl-val').textContent = fx(v); };

    function forward() {
      const z = st.w[0] * st.x[0] + st.w[1] * st.x[1] + st.w[2] * st.x[2] + st.b;
      const A = ACTS[st.act]; const y = A.f(z);
      const loss = (y - st.t) ** 2; const dy = 2 * (y - st.t); const fp = A.d(z); const dz = dy * fp;
      return { z, y, loss, dy, fp, dz, gw: st.x.map(x => dz * x), gb: dz };
    }
    function drawNeuron(r) {
      const W = 540, H = 300;
      const g = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'llm-neuron-svg', style: 'direction:ltr' });
      const ys = [55, 150, 245], ix = 470, sx = 285, sy = 150;
      st.w.forEach((w, i) => {
        const col = w >= 0 ? '#4ade80' : '#f87171';
        g.appendChild(s('line', { x1: ix - 26, y1: ys[i], x2: sx + 40, y2: sy, stroke: col, 'stroke-width': 1.2 + 4.5 * Math.min(2, Math.abs(w)), 'stroke-opacity': 0.35 + 0.3 * Math.min(2, Math.abs(w)), 'stroke-linecap': 'round' }));
        const lx = ix - 26 + (sx + 40 - (ix - 26)) * 0.42, ly = ys[i] + (sy - ys[i]) * 0.42;
        g.appendChild(s('rect', { x: lx - 40, y: ly - 11, width: 80, height: 20, rx: 10, fill: '#0e1530', stroke: col, 'stroke-opacity': 0.6 }));
        g.appendChild(s('text', { x: lx, y: ly + 4, 'text-anchor': 'middle', class: 'llm-svg-t small' }, `w${i + 1}=${fx(w)}`));
        g.appendChild(s('circle', { cx: ix, cy: ys[i], r: 26, fill: '#141c36', stroke: '#38bdf8', 'stroke-width': 2 }));
        g.appendChild(s('text', { x: ix, y: ys[i] - 3, 'text-anchor': 'middle', class: 'llm-svg-t small muted' }, `x${i + 1}`));
        g.appendChild(s('text', { x: ix, y: ys[i] + 12, 'text-anchor': 'middle', class: 'llm-svg-t' }, fx(st.x[i])));
      });
      // bias
      g.appendChild(s('line', { x1: sx, y1: 262, x2: sx, y2: sy + 42, stroke: '#fbbf24', 'stroke-width': 1.5 + 3 * Math.min(2, Math.abs(st.b)), 'stroke-opacity': 0.6 }));
      g.appendChild(s('rect', { x: sx - 42, y: 258, width: 84, height: 30, rx: 8, fill: '#141c36', stroke: '#fbbf24', 'stroke-width': 1.5 }));
      g.appendChild(s('text', { x: sx, y: 278, 'text-anchor': 'middle', class: 'llm-svg-t small' }, `b=${fx(st.b)}`));
      // sum
      g.appendChild(s('circle', { cx: sx, cy: sy, r: 42, fill: '#1d2246', stroke: '#fbbf24', 'stroke-width': 2.5 }));
      g.appendChild(s('text', { x: sx, y: sy - 6, 'text-anchor': 'middle', class: 'llm-svg-t big' }, 'Σ'));
      g.appendChild(s('text', { x: sx, y: sy + 16, 'text-anchor': 'middle', class: 'llm-svg-t small' }, `z=${fx(r.z, 3)}`));
      // activation
      const ax = 155;
      g.appendChild(s('line', { x1: sx - 42, y1: sy, x2: ax + 46, y2: sy, stroke: '#94a3b8', 'stroke-width': 2 }));
      g.appendChild(s('rect', { x: ax - 46, y: sy - 26, width: 92, height: 52, rx: 10, fill: '#141c36', stroke: '#f472b6', 'stroke-width': 2 }));
      g.appendChild(s('text', { x: ax, y: sy - 4, 'text-anchor': 'middle', class: 'llm-svg-t small' }, ACTS[st.act].name.split(' ')[0]));
      g.appendChild(s('text', { x: ax, y: sy + 14, 'text-anchor': 'middle', class: 'llm-svg-t small muted' }, 'f(z)'));
      // output
      const ox = 50;
      g.appendChild(s('line', { x1: ax - 46, y1: sy, x2: ox + 30, y2: sy, stroke: '#94a3b8', 'stroke-width': 2 }));
      g.appendChild(s('circle', { cx: ox, cy: sy, r: 30, fill: '#14301f', stroke: '#4ade80', 'stroke-width': 2 }));
      g.appendChild(s('text', { x: ox, y: sy - 4, 'text-anchor': 'middle', class: 'llm-svg-t small muted' }, 'y'));
      g.appendChild(s('text', { x: ox, y: sy + 12, 'text-anchor': 'middle', class: 'llm-svg-t' }, fx(r.y, 3)));
      g.appendChild(s('text', { x: ox, y: sy + 56, 'text-anchor': 'middle', class: 'llm-svg-t small muted' }, `t=${fx(st.t)}`));
      g.appendChild(s('text', { x: ox, y: sy + 74, 'text-anchor': 'middle', class: 'llm-svg-t small' }, `L=${fx(r.loss, 4)}`));
      svgBox.innerHTML = ''; svgBox.appendChild(g);
    }
    function drawAct(r) {
      const W = 300, H = 150, x0 = 30, x1 = 290, y0 = 10, y1 = 135, A = ACTS[st.act];
      const X = v => x0 + (v + 4) / 8 * (x1 - x0), Y = v => y1 - (v + 1.5) / 5.5 * (y1 - y0);
      const g = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'llm-actplot-svg', style: 'direction:ltr' });
      g.appendChild(s('line', { x1: x0, y1: Y(0), x2: x1, y2: Y(0), stroke: '#34427a' }));
      g.appendChild(s('line', { x1: X(0), y1: y0, x2: X(0), y2: y1, stroke: '#34427a' }));
      let d = '';
      for (let k = 0; k <= 80; k++) { const v = -4 + k * 0.1; const fy = Math.max(-1.5, Math.min(4, A.f(v))); d += (k ? 'L' : 'M') + X(v).toFixed(1) + ',' + Y(fy).toFixed(1); }
      g.appendChild(s('path', { d, fill: 'none', stroke: '#f472b6', 'stroke-width': 2 }));
      const zc = Math.max(-4, Math.min(4, r.z)), yc = Math.max(-1.5, Math.min(4, A.f(zc)));
      g.appendChild(s('line', { x1: X(zc), y1: Y(0), x2: X(zc), y2: Y(yc), stroke: '#fbbf24', 'stroke-dasharray': '3 3' }));
      g.appendChild(s('circle', { cx: X(zc), cy: Y(yc), r: 5, fill: '#fbbf24', stroke: '#0b1020', 'stroke-width': 2 }));
      g.appendChild(s('text', { x: x1, y: Y(0) + 14, 'text-anchor': 'end', class: 'llm-svg-t tiny muted' }, 'z'));
      g.appendChild(s('text', { x: X(0) + 6, y: y0 + 8, 'text-anchor': 'start', class: 'llm-svg-t tiny muted' }, `f(z) = ${A.formula}`));
      // loss sparkline
      if (st.hist.length > 1) {
        const mx = Math.max(...st.hist) || 1; const n = st.hist.length;
        const pts = st.hist.map((v, k) => `${(200 + k / (n - 1) * 90).toFixed(1)},${(130 - v / mx * 40).toFixed(1)}`).join(' ');
        g.appendChild(s('polyline', { points: pts, fill: 'none', stroke: '#38bdf8', 'stroke-width': 2 }));
        g.appendChild(s('text', { x: 245, y: 84, 'text-anchor': 'middle', class: 'llm-svg-t tiny muted' }, 'loss לאורך האימון'));
      }
      actPlot.innerHTML = ''; actPlot.appendChild(g);
    }
    function update() {
      const r = forward();
      drawNeuron(r); drawAct(r);
      const terms = st.w.map((w, i) => `(${fx(w)})(${fx(st.x[i])})`).join(' + ');
      calc.textContent =
        `z = w·x + b\n  = ${terms} + ${fx(st.b)}\n  = ${fx(r.z, 4)}\n` +
        `y = ${ACTS[st.act].name.split(' ')[0]}(z) = ${fx(r.y, 4)}\n` +
        `L = (y − t)² = (${fx(r.y, 3)} − ${fx(st.t)})² = ${fx(r.loss, 4)}\n\n` +
        `∂L/∂y = 2(y − t)          = ${fx(r.dy, 4)}\n` +
        `∂L/∂z = ∂L/∂y · f'(z)     = ${fx(r.dy, 3)} · ${fx(r.fp, 3)} = ${fx(r.dz, 4)}\n` +
        `∂L/∂w = ∂L/∂z · x         = [${r.gw.map(v => fx(v, 3)).join(', ')}]\n` +
        `∂L/∂b = ∂L/∂z             = ${fx(r.gb, 4)}\n` +
        `next: w ← w − ${fx(st.lr)}·∂L/∂w ,  b ← b − ${fx(st.lr)}·∂L/∂b` + (st.last ? `\n\n${st.last}` : '');
      const msgs = [];
      if (st.act === 'relu' && r.z <= 0) msgs.push('⚠️ <b>נוירון ReLU "מת":</b> z ≤ 0 ולכן f′(z)=0 — הגרדיאנט אפס ושום צעד אימון לא ישנה את המשקלים. נסו GELU/SiLU, או שנו קלטים/הטיה.');
      if (st.hist.length > 2 && st.hist[st.hist.length - 1] > st.hist[st.hist.length - 2] * 1.0001) msgs.push('⚠️ <b>הלוס עלה</b> — ה-learning rate גדול מדי וקופץ מעבר למינימום ("overshoot"). הקטינו η.');
      if (r.loss < 1e-4) msgs.push('✅ הנוירון הגיע ליעד (loss ≈ 0).');
      warn.innerHTML = msgs.join('<br>');
    }
    function train(n) {
      for (let k = 0; k < n; k++) {
        const r = forward();
        if (!st.hist.length) st.hist.push(r.loss);
        st.w = st.w.map((w, i) => w - st.lr * r.gw[i]); st.b -= st.lr * r.gb;
        const r2 = forward(); st.hist.push(r2.loss);
        st.last = `last step: loss ${fx(r.loss, 4)} → ${fx(r2.loss, 4)}   (w = [${st.w.map(v => fx(v, 3)).join(', ')}], b = ${fx(st.b, 3)})`;
      }
      if (st.hist.length > 60) st.hist = st.hist.slice(-60);
      st.w.forEach((w, i) => setRow(sliders.w[i], w)); setRow(sliders.b, st.b);
      update();
    }
    const reset = () => {
      Object.assign(st, { x: [1, 0.5, -1], w: [0.8, -0.5, 0.3], b: 0.1, t: 1, lr: 0.1, hist: [], last: '' });
      st.x.forEach((v, i) => setRow(sliders.x[i], v)); st.w.forEach((v, i) => setRow(sliders.w[i], v));
      setRow(sliders.b, st.b); setRow(sliders.t, st.t); setRow(sliders.lr, st.lr); update();
    };
    const ctrl = h('div', { class: 'llm-ctrl' });
    ctrl.appendChild(h('div', { class: 'llm-ctrl-h' }, 'קלטים (מהשכבה הקודמת)'));
    st.x.forEach((v, i) => { const r = LA.slider(`x${i + 1}`, -2, 2, 0.1, v, val => { st.x[i] = val; st.hist = []; st.last = ''; update(); }, fx); sliders.x.push(r); ctrl.appendChild(r); });
    ctrl.appendChild(h('div', { class: 'llm-ctrl-h' }, 'פרמטרים נלמדים'));
    st.w.forEach((v, i) => { const r = LA.slider(`w${i + 1}`, -2, 2, 0.05, v, val => { st.w[i] = val; st.hist = []; st.last = ''; update(); }, fx); sliders.w.push(r); ctrl.appendChild(r); });
    sliders.b = LA.slider('b (הטיה)', -2, 2, 0.05, st.b, val => { st.b = val; st.hist = []; st.last = ''; update(); }, fx); ctrl.appendChild(sliders.b);
    ctrl.appendChild(h('div', { class: 'llm-ctrl-h' }, 'אימון'));
    sliders.t = LA.slider('יעד t', -1, 2, 0.1, st.t, val => { st.t = val; st.hist = []; update(); }, fx); ctrl.appendChild(sliders.t);
    sliders.lr = LA.slider('learning rate η', 0.01, 1.5, 0.01, st.lr, val => { st.lr = val; update(); }, fx); ctrl.appendChild(sliders.lr);
    const sel = h('select', { class: 'llm-select', onchange: () => { st.act = sel.value; st.hist = []; st.last = ''; update(); } },
      Object.entries(ACTS).map(([k, a]) => h('option', { value: k }, a.name)));
    ctrl.appendChild(h('label', { class: 'slider' }, h('span', null, 'אקטיבציה'), sel, h('span')));
    ctrl.appendChild(h('div', { class: 'pill-row' },
      h('button', { type: 'button', class: 'btn primary', onclick: () => train(1) }, '🎯 צעד אימון אחד'),
      h('button', { type: 'button', class: 'btn', onclick: () => train(10) }, '×10 צעדים'),
      h('button', { type: 'button', class: 'btn ghost', onclick: reset }, '⟲ איפוס')));
    el.appendChild(h('div', { class: 'lab' },
      h('div', { class: 'lab-h' }, '🧪 מעבדה 1 — נוירון בודד: forward, loss, backprop, gradient descent'),
      h('div', { class: 'llm-lab-grid' },
        h('div', null, svgBox, h('div', { class: 'llm-plotrow' }, actPlot, h('div', { class: 'llm-legend' },
          h('div', { html: '<i class="llm-sw pos"></i> משקל חיובי (מעודד)' }), h('div', { html: '<i class="llm-sw neg"></i> משקל שלילי (מדכא)' }),
          h('div', { class: 'muted', text: 'עובי הקשת ∝ |w|' }))), warn),
        h('div', null, ctrl)),
      calc));
    update();
  }

  /* =====================================================================
     LAB 2 — tokenizer toy
     ===================================================================== */
  const TOK_PRESETS = [
    { label: 'EN: חתול', text: 'The cat sat on the mat because it was tired.' },
    { label: 'HE: חתול', text: 'החתול ישב על השטיח כי הוא היה עייף.' },
    { label: 'EN: חשבון חשמל', text: 'My electricity bill is unusually high this month, why?' },
    { label: 'HE: חשבון חשמל', text: 'חשבון החשמל שלי גבוה במיוחד החודש, למה?' },
    { label: 'קוד', text: 'def add(a, b): return a + b' },
    { label: 'מספרים', text: 'Order 1234567 costs 1999.90 NIS' },
    { label: 'אימוג׳י', text: 'thanks 🙏 תודה' }
  ];
  function tokenizerLab(el) {
    const inp = h('textarea', { rows: 2, class: 'llm-tok-in', dir: 'auto' });
    const chips = h('div', { class: 'llm-tok-chips' });
    const stats = h('div', { class: 'llm-stats' });
    const idsOut = h('div', { class: 'out llm-ids' });
    const cmp = h('div', { class: 'llm-tok-cmp' });
    function run() {
      const text = inp.value; const toks = TOKENIZER.encode(text);
      chips.innerHTML = ''; chips.setAttribute('dir', /[֐-׿]/.test(text) ? 'rtl' : 'ltr');
      let prevByteChar = null, colorIdx = -1;
      toks.forEach(t => {
        if (!(t.byte != null && t.t === prevByteChar)) colorIdx++;
        prevByteChar = t.byte != null ? t.t : null;
        const shown = t.byte != null ? `<0x${t.byte.toString(16).toUpperCase().padStart(2, '0')}>` : t.t.replace(/ /g, '␣').replace(/\n/g, '⏎');
        chips.appendChild(h('span', { class: `llm-chip llm-c${colorIdx % 6}` + (t.byte != null ? ' byte' : ''), title: `id ${t.id}` + (t.byte != null ? ` — בייט של "${t.t}"` : '') },
          h('span', { class: 'llm-chip-t' }, shown), h('small', null, String(t.id))));
      });
      idsOut.textContent = '[' + toks.map(t => t.id).join(', ') + ']';
      const chars = [...text].length, words = (text.trim().match(/\S+/g) || []).length;
      const tile = (v, l) => h('div', { class: 'llm-stat' }, h('b', null, v), h('span', null, l));
      stats.innerHTML = '';
      stats.append(tile(String(toks.length), 'טוקנים'), tile(String(chars), 'תווים'), tile(String(words), 'מילים'),
        tile(toks.length ? fx(chars / toks.length, 2) : '—', 'תווים לטוקן'), tile(words ? fx(toks.length / words, 2) : '—', 'טוקנים למילה'),
        tile(money(toks.length * 2), 'קלט ×1M הודעות (Sonnet 5.5)'));
    }
    function renderCmp() {
      const pairs = [[TOK_PRESETS[0], TOK_PRESETS[1]], [TOK_PRESETS[2], TOK_PRESETS[3]]];
      cmp.innerHTML = '<div class="llm-ctrl-h">השוואה: אותו תוכן, אנגלית מול עברית (בטוקנייזר הצעצוע)</div>';
      pairs.forEach(([en, he]) => {
        const a = TOKENIZER.encode(en.text).length, b = TOKENIZER.encode(he.text).length, mx = Math.max(a, b);
        cmp.appendChild(h('div', { class: 'llm-cmp-row' },
          h('div', { class: 'llm-bars' },
            h('div', { class: 'llm-bar-row' }, h('span', null, 'EN'), h('div', { class: 'llm-bar-track' }, h('div', { class: 'llm-bar en', style: { width: (a / mx * 100) + '%' } })), h('b', null, String(a))),
            h('div', { class: 'llm-bar-row' }, h('span', null, 'HE'), h('div', { class: 'llm-bar-track' }, h('div', { class: 'llm-bar he', style: { width: (b / mx * 100) + '%' } })), h('b', null, String(b)))),
          h('div', { class: 'muted llm-cmp-x' }, `עברית: פי ${fx(b / a, 2)}`)));
      });
    }
    inp.addEventListener('input', run);
    const presets = h('div', { class: 'pill-row' }, TOK_PRESETS.map(p => h('button', { type: 'button', class: 'btn', onclick: () => { inp.value = p.text; run(); } }, p.label)));
    el.appendChild(h('div', { class: 'lab' },
      h('div', { class: 'lab-h' }, '🧪 מעבדה 2 — טוקנייזר צעצוע (להמחשה בלבד)'),
      h('p', { class: 'muted', html: `טוקנייזר "greedy longest-match" על אוצר מילים זעיר של ${TOKENIZER.size} פריטים, עם נפילה לבייטים (UTF-8) לתווים לא מוכרים. טוקנייזר אמיתי (byte-level BPE) לומד ~100k–260k מיזוגים מקורפוס — המספרים כאן <b>לא</b> מייצגים את Claude; לספירה אמיתית השתמשו ב-<code>client.messages.count_tokens</code>. הסימן ␣ מסמן רווח שמודבק לתחילת טוקן.` }),
      presets, inp, chips, stats, h('div', { class: 'llm-ctrl-h' }, 'מה המודל באמת מקבל — רשימת מזהים:'), idsOut, cmp));
    inp.value = TOK_PRESETS[3].text; run(); renderCmp();
  }

  /* =====================================================================
     LAB 3 — attention heatmap (toy Q/K from hand-built feature embeddings)
     ===================================================================== */
  const FEATS = ['animal', 'object', 'verb', 'pronoun', 'func', 'state', 'const'];
  const FEAT_HE = { animal: 'בעל-חיים', object: 'חפץ', verb: 'פועל', pronoun: 'כינוי', func: 'מילת קישור', state: 'תואר מצב', const: 'קבוע' };
  const ATT_SENTS = {
    he: [['החתול', 'animal'], ['ישב', 'verb'], ['על', 'func'], ['השטיח', 'object'], ['כי', 'func'], ['הוא', 'pronoun'], ['היה', 'verb'], ['עייף', 'state']],
    en: [['The', 'func'], ['cat', 'animal'], ['sat', 'verb'], ['on', 'func'], ['the', 'func'], ['mat', 'object'], ['because', 'func'], ['it', 'pronoun'], ['was', 'verb'], ['tired', 'state']]
  };
  // W_Q (rows = query feature, cols = key feature). W_K = identity. Hand-designed "semantic head".
  const WQ = [
    [1.5, 0, 0, 0, 1, 0, 0],
    [1, 0, 2.5, 0, 2, 0, 0],
    [5, 1.5, 0, 0, 0, 0, 0],
    [7, 2, 0.5, 0, 0, 0, 0],
    [1, 1, 2.5, 0, 0, 0, 0],
    [4, 0, 1, 5, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1]
  ];
  function embedTok(word, feat) {
    const e = FEATS.map((f, k) => (f === feat || f === 'const' ? 1 : 0) + ((fnv(word + '#' + k) % 1000) / 1000 - 0.5) * 0.2);
    return e;
  }
  function attentionLab(el) {
    const st = { lang: 'he', head: 'sem', causal: true, lambda: 0.1, row: 5, cell: null };
    const grid = h('div', { class: 'llm-heat' });
    const sentence = h('div', { class: 'llm-att-sent' });
    const detail = h('div', { class: 'out llm-att-detail' });
    function compute() {
      const toks = ATT_SENTS[st.lang]; const n = toks.length; const d = FEATS.length;
      const E = toks.map(([w, f]) => embedTok(w, f));
      const Q = E.map(e => FEATS.map((_, c) => e.reduce((acc, ev, r) => acc + ev * WQ[r][c], 0)));
      const K = E.map(e => e.slice());
      const raw = [], S = [], A = [];
      for (let i = 0; i < n; i++) {
        raw.push([]); S.push([]);
        for (let j = 0; j < n; j++) {
          let sc;
          if (st.head === 'sem') sc = Q[i].reduce((a, q, k) => a + q * K[j][k], 0) / Math.sqrt(d) - st.lambda * Math.abs(i - j);
          else if (st.head === 'prev') sc = (j === i - 1 ? 5 : j === i ? 1.5 : 0) - 0.2 * Math.abs(i - j);
          else sc = j === 0 ? 4 : 0.5;
          raw[i].push(sc); S[i].push(st.causal && j > i ? -Infinity : sc);
        }
        A.push(softmax(S[i]));
      }
      return { toks, n, E, Q, K, raw, S, A, d };
    }
    function render() {
      const c = compute(); const { toks, n, A } = c;
      if (st.row >= n) st.row = n - 1;
      grid.innerHTML = ''; grid.style.gridTemplateColumns = `auto repeat(${n}, minmax(34px, 1fr))`;
      grid.setAttribute('dir', st.lang === 'he' ? 'rtl' : 'ltr');
      grid.appendChild(h('div', { class: 'llm-heat-corner', html: 'שאילתה ↓ / מפתח →' }));
      toks.forEach(([w], j) => grid.appendChild(h('div', { class: 'llm-heat-col' }, w)));
      for (let i = 0; i < n; i++) {
        grid.appendChild(h('div', { class: 'llm-heat-rowh' + (i === st.row ? ' on' : ''), onmouseenter: () => { st.row = i; renderSide(c); markRow(); } }, toks[i][0]));
        for (let j = 0; j < n; j++) {
          const masked = c.S[i][j] === -Infinity; const a = A[i][j];
          const cell = h('div', {
            class: 'llm-heat-cell' + (masked ? ' masked' : '') + (i === st.row ? ' row' : ''), 'data-i': i,
            title: masked ? `${toks[i][0]} ← ${toks[j][0]}: חסום (עתיד)` : `${toks[i][0]} ← ${toks[j][0]}: ${fx(a * 100, 1)}%`,
            style: masked ? null : { background: `rgba(167,139,250,${(0.06 + 0.94 * Math.sqrt(a)).toFixed(3)})`, color: a > 0.35 ? '#0b1020' : '#e6e9f5' },
            onmouseenter: () => { st.row = i; st.cell = j; renderSide(c); markRow(); },
            onclick: () => { st.row = i; st.cell = j; renderSide(c); markRow(); }
          }, masked ? '−∞' : (a >= 0.005 ? Math.round(a * 100) : '·'));
          grid.appendChild(cell);
        }
      }
      renderSide(c); markRow();
    }
    function markRow() {
      grid.querySelectorAll('.llm-heat-cell').forEach(x => x.classList.toggle('row', +x.getAttribute('data-i') === st.row));
      grid.querySelectorAll('.llm-heat-rowh').forEach((x, k) => x.classList.toggle('on', k === st.row));
    }
    function renderSide(c) {
      const i = st.row, row = c.A[i];
      sentence.innerHTML = ''; sentence.setAttribute('dir', st.lang === 'he' ? 'rtl' : 'ltr');
      c.toks.forEach(([w], j) => sentence.appendChild(h('span', {
        class: 'llm-att-w' + (j === i ? ' q' : '') + (st.causal && j > i ? ' fut' : ''),
        style: { background: j === i ? null : `rgba(245,158,11,${(row[j] * 0.95).toFixed(3)})` }, title: fx(row[j] * 100, 1) + '%'
      }, w)));
      const top = row.map((a, j) => [a, j]).sort((a, b) => b[0] - a[0]).slice(0, 3).map(([a, j]) => `${c.toks[j][0]} ${fx(a * 100, 1)}%`).join(' · ');
      const j = st.cell == null || st.cell > c.n - 1 ? row.indexOf(Math.max(...row)) : st.cell;
      let txt = `query  "${c.toks[i][0]}"  (${FEAT_HE[c.toks[i][1]]})   top-3 → ${top}\n`;
      if (st.head === 'sem') {
        txt += `q = e·W_Q = [${c.Q[i].map(v => fx(v, 2)).join(', ')}]\n` +
          `k("${c.toks[j][0]}") = e·W_K = [${c.K[j].map(v => fx(v, 2)).join(', ')}]\n` +
          `q·k = ${fx(c.Q[i].reduce((a, q, k) => a + q * c.K[j][k], 0), 3)}   ÷ √${c.d} = ${fx(c.Q[i].reduce((a, q, k) => a + q * c.K[j][k], 0) / Math.sqrt(c.d), 3)}` +
          `   − λ·|i−j| = ${fx(c.raw[i][j], 3)}\n`;
      } else txt += `score("${c.toks[j][0]}") = ${fx(c.raw[i][j], 3)}   (ראש מיקומי — תלוי רק במרחק/מיקום)\n`;
      txt += c.S[i][j] === -Infinity ? `mask: j > i → −∞ → weight 0` : `softmax over row → weight = ${fx(row[j], 4)}`;
      detail.textContent = txt;
    }
    const headSel = h('select', { class: 'llm-select', onchange: () => { st.head = headSel.value; render(); } },
      h('option', { value: 'sem' }, 'ראש 1 — סמנטי (QKᵀ מחושב)'), h('option', { value: 'prev' }, 'ראש 2 — "הטוקן הקודם"'), h('option', { value: 'sink' }, 'ראש 3 — "attention sink" לטוקן הראשון'));
    const langBtns = h('div', { class: 'pill-row' },
      h('button', { type: 'button', class: 'btn', onclick: () => { st.lang = 'he'; st.row = 5; st.cell = null; render(); } }, 'עברית'),
      h('button', { type: 'button', class: 'btn', onclick: () => { st.lang = 'en'; st.row = 7; st.cell = null; render(); } }, 'English'));
    const causal = h('input', { type: 'checkbox', checked: true, onchange: () => { st.causal = causal.checked; render(); } });
    const lam = LA.slider('הטיית קרבה λ', 0, 1, 0.05, st.lambda, v => { st.lambda = v; render(); }, v => fx(v));
    el.appendChild(h('div', { class: 'lab' },
      h('div', { class: 'lab-h' }, '🧪 מעבדה 3 — מפת חום של Attention (עם מסכה סיבתית)'),
      h('p', { class: 'muted', html: 'כל מילה = טוקן אחד (לשם הפשטות). ה-embedding של כל מילה בנוי מ-7 "תכונות" (בעל-חיים, חפץ, פועל, כינוי, מילת קישור, תואר מצב, קבוע) + רעש קטן דטרמיניסטי. <code>Q = e·W_Q</code>, <code>K = e·W_K</code> (כאן W_K = I), ציון = <code>q·k/√7 − λ·|i−j|</code>, ואז softmax על כל שורה. במודל אמיתי W_Q ו-W_K <b>נלמדים</b> ו-d של כל ראש ~128; כאן תכננו אותם ידנית כדי לראות דפוס שמתאים לאינטואיציה. העבירו עכבר על שורה.' }),
      h('div', { class: 'llm-att-ctrl' }, langBtns, h('label', { class: 'llm-inline' }, 'ראש: ', headSel), h('label', { class: 'llm-inline' }, causal, ' מסכה סיבתית (decoder)'), lam),
      sentence, h('div', { class: 'llm-heat-wrap' }, grid), detail,
      h('p', { class: 'muted', html: 'שימו לב לשורה של <b>"הוא"/"it"</b>: רוב הקשב הולך ל"חתול" — כך המודל פותר הפניה (coreference). כבו את המסכה הסיבתית וקיבלתם attention דו-כיווני כמו ב-BERT (מודל encoder, שמשמש ל-embeddings ולא ליצירה).' })));
    render();
  }

  /* =====================================================================
     LAB 4 — next-token sampling
     ===================================================================== */
  const CANDS = [['גבוה', 3.2], ['יקר', 2.6], ['הגיע', 2.1], ['נמוך', 1.4], ['מוזר', 1.0], ['כפול', 0.7], ['שגוי', 0.3], ['ירוק', -1.5]];
  function samplingLab(el) {
    const st = { T: 1, k: 8, p: 1, counts: CANDS.map(() => 0), last: null };
    const bars = h('div', { class: 'llm-samp-bars' });
    const info = h('div', { class: 'llm-stats' });
    const result = h('div', { class: 'llm-samp-result' });
    function dist() {
      const base = softmax(CANDS.map(c => c[1]));
      let p;
      if (st.T === 0) { const mx = Math.max(...CANDS.map(c => c[1])); p = CANDS.map(c => (c[1] === mx ? 1 : 0)); }
      else p = softmax(CANDS.map(c => c[1] / st.T));
      const order = p.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]);
      const keep = new Set(); let cum = 0;
      for (let r = 0; r < order.length; r++) {
        if (r >= st.k) break;
        keep.add(order[r][1]); cum += order[r][0];
        if (cum >= st.p - 1e-12) break;
      }
      const z = [...keep].reduce((a, i) => a + p[i], 0) || 1;
      const fin = p.map((v, i) => (keep.has(i) ? v / z : 0));
      return { base, p, fin, keep };
    }
    function render() {
      const d = dist(); bars.innerHTML = '';
      const total = st.counts.reduce((a, b) => a + b, 0);
      CANDS.forEach(([w, logit], i) => {
        const cut = !d.keep.has(i);
        bars.appendChild(h('div', { class: 'llm-samp-row' + (cut ? ' cut' : '') + (st.last === i ? ' picked' : ''), title: `logit ${logit} · p(T=1) ${fx(d.base[i] * 100, 1)}% · p סופי ${fx(d.fin[i] * 100, 1)}%` },
          h('span', { class: 'llm-samp-w' }, w),
          h('span', { class: 'llm-samp-l mono' }, fx(logit, 1)),
          h('div', { class: 'llm-bar-track' }, h('div', { class: 'llm-bar ghost', style: { width: (d.base[i] * 100) + '%' } }), h('div', { class: 'llm-bar main', style: { width: (d.fin[i] * 100) + '%' } })),
          h('b', { class: 'mono' }, cut ? 'נחתך' : fx(d.fin[i] * 100, 1) + '%'),
          h('span', { class: 'llm-samp-c mono' }, total ? `${st.counts[i]}` : '')));
      });
      const H = -d.fin.reduce((a, v) => a + (v > 0 ? v * Math.log2(v) : 0), 0);
      const tile = (v, l) => h('div', { class: 'llm-stat' }, h('b', null, v), h('span', null, l));
      info.innerHTML = '';
      info.append(tile(st.T === 0 ? 'greedy' : fx(st.T, 2), 'temperature'), tile(String(d.keep.size), 'מועמדים שנשארו'), tile(fx(H, 2) + ' bit', 'אנטרופיה'),
        tile(fx(Math.max(...d.fin) * 100, 1) + '%', 'p של המוביל'), tile(total ? String(total) : '—', 'דגימות שנספרו'));
    }
    function sampleOnce() {
      const d = dist(); let r = Math.random(), i = 0;
      for (; i < d.fin.length; i++) { r -= d.fin[i]; if (r <= 0) break; }
      return Math.min(i, d.fin.length - 1);
    }
    const tS = LA.slider('Temperature T', 0, 2, 0.05, 1, v => { st.T = v; st.counts = CANDS.map(() => 0); render(); }, v => (v === 0 ? 'greedy' : fx(v)));
    const kS = LA.slider('top-k', 1, 8, 1, 8, v => { st.k = v; st.counts = CANDS.map(() => 0); render(); }, v => String(v));
    const pS = LA.slider('top-p', 0.05, 1, 0.05, 1, v => { st.p = v; st.counts = CANDS.map(() => 0); render(); }, v => fx(v));
    const btns = h('div', { class: 'pill-row' },
      h('button', { type: 'button', class: 'btn primary', onclick: () => { const i = sampleOnce(); st.last = i; st.counts[i]++; result.innerHTML = `חשבון החשמל שלי החודש <b class="llm-picked">${CANDS[i][0]}</b>`; render(); } }, '🎲 דגום טוקן'),
      h('button', { type: 'button', class: 'btn', onclick: () => { for (let k = 0; k < 200; k++) st.counts[sampleOnce()]++; st.last = null; render(); } }, 'דגום 200 פעם'),
      h('button', { type: 'button', class: 'btn', onclick: () => { tS.input.value = 0; tS.fire(); } }, 'Greedy (T=0)'),
      h('button', { type: 'button', class: 'btn ghost', onclick: () => { tS.input.value = 1; kS.input.value = 8; pS.input.value = 1; st.T = 1; st.k = 8; st.p = 1; tS.fire(); kS.fire(); pS.fire(); result.textContent = ''; st.last = null; render(); } }, '⟲ איפוס'));
    el.appendChild(h('div', { class: 'lab' },
      h('div', { class: 'lab-h' }, '🧪 מעבדה 4 — דגימת הטוקן הבא: temperature · top-k · top-p'),
      h('p', { class: 'muted', html: 'הקשר: <b>"חשבון החשמל שלי החודש ___"</b>. ה-LM head החזיר logits ל-8 מועמדים (במציאות — ל-~100k+). סדר הפעולות: logits ÷ T → softmax → top-k → top-p (nucleus) → נרמול מחדש → דגימה. הפס השקוף = ההתפלגות המקורית (T=1).' }),
      h('div', { class: 'llm-lab-grid' }, h('div', null, bars, result), h('div', null, tS, kS, pS, btns, info))));
    render();
  }

  /* =====================================================================
     LAB 5 — one token end-to-end (stepper + animated flow)
     ===================================================================== */
  function genLab(el) {
    const spec = {
      width: 900, height: 300,
      nodes: [
        { id: 'user', x: 830, y: 70, w: 120, label: 'משתמש', color: 'ui', info: '<p>שולח שאלה.</p>' },
        { id: 'app', x: 665, y: 70, w: 140, label: 'אפליקציה', sub: 'messages[]', color: 'ui', info: '<p>בונה את רשימת ההודעות + system prompt.</p>' },
        { id: 'api', x: 495, y: 70, w: 130, label: 'API', color: 'ext', info: '<p>אימות, rate limit, ניתוב.</p>' },
        { id: 'tok', x: 325, y: 70, w: 140, label: 'Tokenizer', color: 'tool', info: '<p>טקסט → מזהים.</p>' },
        { id: 'emb', x: 140, y: 70, w: 150, label: 'Embedding', sub: '+ מיקום', color: 'llm', info: '<p>מזהה → וקטור.</p>' },
        { id: 'blocks', x: 140, y: 225, w: 150, label: 'N בלוקים', sub: 'prefill / decode', color: 'llm', info: '<p>Attention + MLP × N.</p>' },
        { id: 'head', x: 325, y: 225, w: 140, label: 'LM Head', sub: 'logits', color: 'llm', info: '<p>וקטור אחרון → V ציונים.</p>' },
        { id: 'samp', x: 495, y: 225, w: 130, label: 'Sampler', color: 'ctrl', info: '<p>בחירת טוקן.</p>' },
        { id: 'detok', x: 665, y: 225, w: 140, label: 'Detokenizer', sub: 'stream', color: 'tool', info: '<p>מזהה → טקסט, זורם ללקוח.</p>' },
        { id: 'kv', x: 325, y: 150, w: 110, h: 44, shape: 'db', label: 'KV cache', color: 'store', info: '<p>K,V של כל הטוקנים הקודמים.</p>' }
      ],
      edges: [
        { from: 'user', to: 'app' }, { from: 'app', to: 'api' }, { from: 'api', to: 'tok' }, { from: 'tok', to: 'emb' },
        { from: 'emb', to: 'blocks' }, { from: 'blocks', to: 'head' }, { from: 'head', to: 'samp' }, { from: 'samp', to: 'detok' },
        { from: 'detok', to: 'app', label: 'SSE' }, { from: 'blocks', to: 'kv', dashed: true, both: true, color: 'store' },
        { from: 'samp', to: 'emb', dashed: true, color: 'neuron', bend: -60, label: 'הטוקן החדש' }
      ]
    };
    const box = h('div'); el.appendChild(box);
    const api = LA.diagram(box, spec, { compact: true });
    const trace = h('div', { class: 'out llm-trace' });
    const question = 'חשבון החשמל שלי גבוה במיוחד החודש, למה?';
    const qtoks = TOKENIZER.encode(question);
    const emb0 = embedTok(qtoks[0].t, 'object').slice(0, 6);
    const logits = CANDS.slice(0, 5);
    const pr = softmax(CANDS.map(c => c[1]));
    const log = (ctx, line) => { ctx.lines.push(line); trace.textContent = ctx.lines.join('\n'); };
    const anim = (silent, path, ms) => (silent ? Promise.resolve() : api.flow(path, ms || 450));
    const steps = [
      { title: 'המשתמש שולח הודעה', html: `<p>המשתמש כותב: <b>"${question}"</b>. האפליקציה מוסיפה system prompt ("אתה נציג שירות של חברת החשמל...") ואת כל ההיסטוריה — ה-API חסר-מצב.</p>`, run: (c, s0) => { log(c, 't=0ms     user → app: build messages[] (system + history + new turn)'); return anim(s0, ['user', 'app']); } },
      { title: 'ה-API מקבל את הבקשה', html: '<p>אימות מפתח, בדיקת rate limit, בחירת שרת שמחזיק את המודל המבוקש (למשל <code>claude-sonnet-5-5</code>), והכנסה לתור של ה-scheduler.</p>', run: (c, s0) => { log(c, 't≈30ms    app → API: POST /v1/messages (auth, limits, route)'); return anim(s0, ['app', 'api']); } },
      { title: 'Tokenization', html: `<p>הטקסט כולו (system + הודעות, לפי chat template) הופך למזהים. בטוקנייזר הצעצוע שלנו השאלה לבדה היא <b>${qtoks.length}</b> טוקנים:</p><p class="mono">[${qtoks.slice(0, 12).map(t => t.id).join(', ')}${qtoks.length > 12 ? ', …' : ''}]</p>`, run: (c, s0) => { log(c, `t≈35ms    tokenizer: ${qtoks.length} ids (question only) + system/template tokens`); return anim(s0, ['api', 'tok']); } },
      { title: 'Embedding', html: `<p>כל מזהה שולף שורה ממטריצת ה-Embedding — וקטור באורך d (אלפים). 6 הרכיבים הראשונים (צעצוע) של הטוקן הראשון:</p><p class="mono">[${emb0.map(v => fx(v, 3)).join(', ')}, …]</p><p>מידע מיקום יוזרק בתוך ה-attention (RoPE).</p>`, run: (c, s0) => { log(c, 't≈36ms    embedding lookup: T × d matrix'); return anim(s0, ['tok', 'emb']); } },
      { title: 'Prefill: כל השכבות, כל הטוקנים במקביל', html: '<p>כל הפרומפט עובר דרך N הבלוקים <b>בבת אחת</b> (מקביליות מלאה על ה-GPU). בדרך, ה-K וה-V של כל טוקן בכל שכבה נשמרים ב-<b>KV cache</b>.</p><p>עלות חישוב: ≈ <code>2 × P</code> FLOPs לכל טוקן (P = מספר הפרמטרים). זה מה שקובע את <b>TTFT</b> — הזמן עד הטוקן הראשון.</p>', run: async (c, s0) => { log(c, 't≈36–250ms PREFILL: N blocks over all T tokens, fill KV cache (compute-bound)'); await anim(s0, ['emb', 'blocks']); if (!s0) await api.flowEdge('blocks', 'kv', 400, 'store'); } },
      { title: 'LM Head → logits', html: '<p>רק וקטור <b>המיקום האחרון</b> עובר RMSNorm סופי וכפל ב-W_U → logit לכל אחד מ-~100k+ הטוקנים. חמשת המובילים (מתוך מעבדה 4):</p>' + LA.table(['מועמד', 'logit', 'p (T=1)'], logits.map(([w, l], i) => [w, M(fx(l, 1)), M(fx(pr[i] * 100, 1) + '%')])), run: (c, s0) => { log(c, 't≈250ms   LM head: h_last · W_U → V logits'); return anim(s0, ['blocks', 'head']); } },
      { title: 'Sampling', html: '<p>ה-Sampler מחיל temperature/top-p (בדגמי Claude הנוכחיים אלו לא פרמטרים שאתם שולטים בהם) ובוחר את הטוקן הראשון של התשובה — למשל <b>"החשבון"</b>. בודקים תנאי עצירה: EOS? <code>max_tokens</code>? stop sequence?</p>', run: (c, s0) => { log(c, 't≈251ms   sampler: softmax → top-p → pick token, check stop conditions'); return anim(s0, ['head', 'samp']); } },
      { title: 'Detokenize + stream', html: '<p>המזהה הופך לטקסט ונשלח כ-event ב-SSE. המשתמש רואה את המילה הראשונה — זה ה-<b>TTFT</b> שמודדים בפועל.</p>', run: (c, s0) => { log(c, 't≈260ms   first token streamed to client (TTFT)'); return anim(s0, ['samp', 'detok', 'app']); } },
      { title: 'Decode: הטוקן הבא', html: '<p>הטוקן החדש חוזר לקלט. הפעם רק <b>טוקן אחד</b> עובר בשכבות — ה-attention שלו קורא את K/V של כל הקודמים מה-KV cache. כל צעד decode דורש לקרוא את <b>כל משקלי המודל</b> מהזיכרון בשביל טוקן יחיד → חסום ברוחב פס זיכרון.</p><p>חוזרים על זה מאות-אלפי פעמים. לכן <b>טוקני פלט יקרים יותר</b> (בדרך כלל פי ~5 ממחיר קלט) ואיטיים יותר מטוקני קלט.</p>', run: async (c, s0) => { log(c, 't≈270ms+  DECODE loop: 1 token/step, read weights + KV cache (memory-bound) … until EOS'); if (!s0) { await api.flowEdge('samp', 'emb', 600, 'neuron'); await api.flow(['emb', 'blocks', 'head', 'samp'], 300); } } }
    ];
    LA.stepper(el, { steps, ctx: { lines: [] }, onReset: c => { c.lines = []; trace.textContent = ''; api.highlight([]); }, intro: 'לחצו "הבא" כדי לעקוב אחרי טוקן אחד מהמקלדת ועד המסך', autoplayMs: 2600 });
    el.appendChild(trace);
  }

  /* =====================================================================
     memory calculator: weights + KV cache
     ===================================================================== */
  function memoryLab(el) {
    const st = { P: 8, wb: 2, L: 32, kvh: 8, hd: 128, e: 17, batch: 1, kvb: 2 };
    const out = h('div', { class: 'llm-stats' });
    const bar = h('div', { class: 'llm-membar' });
    const note = h('div', { class: 'out' });
    function render() {
      const T = 2 ** st.e;
      const weights = st.P * 1e9 * st.wb;
      const perTok = 2 * st.L * st.kvh * st.hd * st.kvb;
      const kv = perTok * T * st.batch;
      const total = weights + kv;
      const tile = (v, l) => h('div', { class: 'llm-stat' }, h('b', null, v), h('span', null, l));
      out.innerHTML = '';
      out.append(tile(fmtBytes(weights), 'משקלים'), tile(fmtBytes(perTok), 'KV לטוקן'), tile(fmtBytes(kv), `KV ל-${fmtInt(T)} טוקנים × ${st.batch}`),
        tile(fmtBytes(total), 'סה״כ (ללא תקורה)'), tile(String(Math.ceil(total / 80e9)), 'כרטיסי 80GB לפחות'));
      bar.innerHTML = '';
      bar.append(h('div', { class: 'llm-membar-w', style: { width: (weights / total * 100) + '%' }, title: 'משקלים' }), h('div', { class: 'llm-membar-kv', style: { width: (kv / total * 100) + '%' }, title: 'KV cache' }));
      note.textContent = `KV per token = 2 (K,V) × L × H_kv × d_head × bytes = 2 × ${st.L} × ${st.kvh} × ${st.hd} × ${st.kvb} = ${fmtInt(perTok)} B\n` +
        `KV total     = per_token × T × batch = ${fmtInt(perTok)} × ${fmtInt(T)} × ${st.batch} = ${fmtBytes(kv)}\n` +
        `weights      = params × bytes = ${st.P}e9 × ${st.wb} = ${fmtBytes(weights)}`;
    }
    const sl = {};
    const mk = (key, label, min, max, step, f) => { sl[key] = LA.slider(label, min, max, step, st[key], v => { st[key] = v; render(); }, f || (v => String(v))); return sl[key]; };
    const wsel = h('select', { class: 'llm-select', onchange: () => { st.wb = +wsel.value; render(); } }, h('option', { value: 2 }, 'bf16 (2 בייט)'), h('option', { value: 1 }, 'fp8 / int8 (1)'), h('option', { value: 0.5 }, 'int4 (0.5)'));
    const ksel = h('select', { class: 'llm-select', onchange: () => { st.kvb = +ksel.value; render(); } }, h('option', { value: 2 }, 'bf16 (2)'), h('option', { value: 1 }, 'fp8 (1)'));
    const preset = (P, L, kvh, hd) => () => { [['P', P], ['L', L], ['kvh', kvh], ['hd', hd]].forEach(([k, v]) => { sl[k].input.value = v; sl[k].fire(); }); };
    el.appendChild(h('div', { class: 'lab' },
      h('div', { class: 'lab-h' }, '🧪 מחשבון זיכרון הסקה: משקלים + KV cache'),
      h('div', { class: 'pill-row' },
        h('button', { type: 'button', class: 'btn', onclick: preset(8, 32, 8, 128) }, 'מודל 8B טיפוסי'),
        h('button', { type: 'button', class: 'btn', onclick: preset(70, 80, 8, 128) }, 'מודל 70B טיפוסי'),
        h('button', { type: 'button', class: 'btn', onclick: preset(70, 80, 64, 128) }, '70B בלי GQA (64 ראשי KV)')),
      h('div', { class: 'llm-lab-grid' },
        h('div', null, mk('P', 'פרמטרים (B)', 1, 400, 1), h('label', { class: 'slider' }, h('span', null, 'דיוק משקלים'), wsel, h('span')),
          mk('L', 'שכבות L', 8, 128, 1), mk('kvh', 'ראשי KV', 1, 64, 1), mk('hd', 'd_head', 32, 256, 32)),
        h('div', null, mk('e', 'אורך הקשר T', 10, 20, 1, v => fmtInt(2 ** v)), mk('batch', 'בקשות במקביל', 1, 64, 1),
          h('label', { class: 'slider' }, h('span', null, 'דיוק KV'), ksel, h('span')))),
      out, bar, h('div', { class: 'llm-membar-leg muted', html: '<i class="llm-sw w"></i> משקלים &nbsp; <i class="llm-sw kv"></i> KV cache' }), note,
      h('p', { class: 'muted', html: 'הערכים "טיפוסיים" מבוססים על ארכיטקטורות open-weights מוכרות (Llama 3). מודלים סגורים לא מפרסמים מספרים אלה. נסו: 70B, הקשר 128k, 16 בקשות — ה-KV cache עוקף את המשקלים. זו הסיבה ש-GQA, KV ב-fp8 ו-PagedAttention הם קריטיים.' })));
    render();
  }

  /* =====================================================================
     cost & latency calculator (algorithmist)
     ===================================================================== */
  const PRICES = {
    haiku: { in: 0.10, out: 0.50, cache: 0.01, tps: 200, pre: 20000 },
    sonnet: { in: 2, out: 10, cache: 0.10, tps: 90, pre: 10000 },
    opus: { in: 4, out: 20, cache: 0.20, tps: 60, pre: 6000 }
  };
  function costLab(el) {
    const st = { tier: 'sonnet', inT: 3000, outT: 400, think: 0, reqE: 4, cached: 0.6 };
    const out = h('div', { class: 'llm-stats' });
    const formula = h('div', { class: 'out' });
    function render() {
      const p = PRICES[st.tier], req = Math.round(10 ** st.reqE);
      const cachedT = st.inT * st.cached, freshT = st.inT - cachedT, outAll = st.outT + st.think;
      const cIn = freshT * p.in / 1e6, cCache = cachedT * p.cache / 1e6, cOut = outAll * p.out / 1e6, c = cIn + cCache + cOut;
      const ttft = 0.3 + freshT / p.pre + cachedT / (p.pre * 10), total = ttft + outAll / p.tps;
      const tile = (v, l) => h('div', { class: 'llm-stat' }, h('b', null, v), h('span', null, l));
      out.innerHTML = '';
      out.append(tile(money(c), 'לבקשה'), tile(money(c * req), `ליום (${fmtInt(req)} בקשות)`), tile(money(c * req * 30), 'לחודש'),
        tile(fx(cOut / c * 100, 0) + '%', 'מהעלות — פלט'), tile(fx(ttft, 2) + 's', 'TTFT משוער'), tile(fx(total, 1) + 's', 'זמן כולל משוער'));
      formula.textContent =
        `cost = fresh_in × $${p.in}/M + cached_in × $${p.cache}/M + (out + thinking) × $${p.out}/M\n` +
        `     = ${fmtInt(freshT)} × ${p.in}/1e6 + ${fmtInt(cachedT)} × ${p.cache}/1e6 + ${fmtInt(outAll)} × ${p.out}/1e6 = ${money(c)}\n` +
        `latency ≈ overhead 0.3s + prefill(${fmtInt(freshT)} / ${fmtInt(p.pre)} tok/s) + decode(${fmtInt(outAll)} / ${p.tps} tok/s) ≈ ${fx(total, 2)}s   [illustrative]`;
    }
    const tierSel = h('div', { class: 'pill-row' }, ['haiku', 'sonnet', 'opus'].map(t => {
      const b = h('button', { type: 'button', class: 'btn llm-tier' + (t === st.tier ? ' on' : ''), html: LA.modelBadge(t), onclick: () => { st.tier = t; tierSel.querySelectorAll('.llm-tier').forEach(x => x.classList.toggle('on', x === b)); render(); } });
      return b;
    }));
    el.appendChild(h('div', { class: 'lab' },
      h('div', { class: 'lab-h' }, '🧪 מחשבון עלות וזמן תגובה'), tierSel,
      h('div', { class: 'llm-lab-grid' },
        h('div', null,
          LA.slider('טוקני קלט לבקשה', 200, 100000, 100, st.inT, v => { st.inT = v; render(); }, fmtInt),
          LA.slider('מתוכם מ-cache', 0, 0.95, 0.05, st.cached, v => { st.cached = v; render(); }, v => fx(v * 100, 0) + '%'),
          LA.slider('בקשות ביום', 2, 6, 0.25, st.reqE, v => { st.reqE = v; render(); }, v => fmtInt(10 ** v))),
        h('div', null,
          LA.slider('טוקני פלט', 50, 8000, 50, st.outT, v => { st.outT = v; render(); }, fmtInt),
          LA.slider('טוקני חשיבה', 0, 16000, 100, st.think, v => { st.think = v; render(); }, fmtInt))),
      out, formula,
      h('p', { class: 'muted', html: 'מחירים לפי מחירון Anthropic (נובמבר 2026, $ למיליון טוקנים): Opus 5.5 — 4 / 20, Sonnet 5.5 — 2 / 10, Haiku 5.5 — 0.10 / 0.50; קריאת cache: Opus 0.20, Sonnet 0.10, Haiku — הערכה. <b>בדקו תמיד בדף המחירים העדכני.</b> מהירויות ה-prefill/decode הן <b>הנחות להמחשה בלבד</b> — מדדו אצלכם. טוקני חשיבה (thinking) מחויבים כפלט; את כמותם מכוונים דרך <code>effort</code>.' })));
    render();
  }

  /* =====================================================================
     small computed widgets: cross-entropy, cosine similarity
     ===================================================================== */
  function ceWidget(el) {
    const o = h('div', { class: 'out' });
    const sl = LA.slider('p(הטוקן הנכון)', 0.01, 0.99, 0.01, 0.25, v => {
      const L = -Math.log(v);
      o.textContent = `loss = −ln p = −ln(${fx(v, 2)}) = ${fx(L, 3)} nats  (= ${fx(L / Math.LN2, 3)} bits)\nperplexity = e^loss = ${fx(Math.exp(L), 2)}   ← "כאילו המודל מתלבט בין ~${fx(1 / v, 1)} אפשרויות שוות"`;
    }, v => fx(v));
    el.appendChild(h('div', { class: 'lab' }, h('div', { class: 'lab-h' }, '🧪 Cross-entropy — פונקציית המטרה של pretraining'), sl, o));
    sl.fire();
  }
  function cosineWidget(el) {
    const S = [
      ['חשבון החשמל שלי גבוה', [0.9, 0.8, 0.1, 0.05]],
      ['למה החיוב החודש עלה?', [0.8, 0.85, 0.15, 0.1]],
      ['איך מדווחים על הפסקת חשמל?', [0.7, 0.1, 0.9, 0.1]],
      ['מתכון לעוגת שוקולד', [0.02, 0.05, 0.05, 0.95]]
    ];
    const cos = (a, b) => { const d = a.reduce((x, v, i) => x + v * b[i], 0); return d / (Math.hypot(...a) * Math.hypot(...b)); };
    const rows = S.map(([t, v]) => [t].concat(S.map(([, u]) => { const c = cos(v, u); return `<span class="llm-cos" style="background:rgba(56,189,248,${(c * c * 0.85).toFixed(2)})">${fx(c, 2)}</span>`; })));
    el.insertAdjacentHTML('beforeend', '<div class="lab"><div class="lab-h">🧪 Cosine similarity בין embeddings (וקטורי צעצוע ב-4 מימדים: חשמל, חיוב, תקלה, אוכל)</div>' +
      LA.table(['משפט'].concat(S.map((x, i) => `#${i + 1}`)), rows.map((r, i) => [`#${i + 1} ${r[0]}`].concat(r.slice(1)))) +
      '<p class="muted">cos = a·b / (|a||b|). משפטים 1 ו-2 כמעט זהים במשמעות למרות שאין להם כמעט מילים משותפות — זה הכוח של embeddings לחיפוש (RAG). מודלי embedding אמיתיים מחזירים 256–3072 מימדים.</p></div>');
  }

  /* =====================================================================
     section renderers
     ===================================================================== */
  function renderIntro(el) {
    el.innerHTML =
      '<p><b>בשורה אחת:</b> מודל שפה גדול (LLM) הוא רשת נוירונים מסוג <b>Transformer decoder</b> שאומנה על טריליוני טוקנים לבצע משימה אחת פשוטה להפליא — <b>לחזות את הטוקן הבא</b>. כשחוזרים על החיזוי הזה שוב ושוב, טוקן אחר טוקן, מקבלים תשובות, קוד, סיכומים ותוכניות עבודה.</p>' +
      LA.callout('analogy', '<p>דמיינו <b>השלמה אוטומטית של המקלדת בטלפון</b> — אבל כזו שקראה כמעט את כל הטקסט הכתוב, ושה"זיכרון" שלה דחוס לתוך מיליארדי כפתורי ווליום קטנים (המשקלים). אין בתוכה מסד נתונים של עובדות ואין בה "חיפוש"; יש בה פונקציה אחת שממפה <i>"מה נכתב עד עכשיו"</i> ל<i>"מה סביר שיבוא אחרי"</i>.</p><p>וכמו תזמורת: כל נוירון הוא נגן שמנגן תו פשוט (כפל וחיבור). המוזיקה — ההבנה, ההיגיון — נובעת מהתיאום בין מיליארדים מהם, שכבה אחר שכבה.</p>') +
      '<h3>סולם הזום של המודול</h3>' +
      LA.table(['רמה', 'מה רואים', 'יחידת עבודה', 'סדר גודל טיפוסי'], [
        ['0 · מוצר', 'צ׳אט ← API ← שרת הסקה', 'בקשה (request)', 'מאות ms עד דקות לבקשה'],
        ['1 · שרת', 'Tokenizer · Model · Sampler · KV cache', 'טוקן', 'אוצר מילים 100k–260k'],
        ['2 · Transformer', 'Embedding ← N בלוקים ← LM head', 'וקטור לטוקן', 'd = 4,096–16,384; N = 32–120+'],
        ['3 · בלוק', 'RMSNorm ← Attention ← MLP + residual', 'מטריצה T×d', 'עשרות-מאות מיליוני פרמטרים לבלוק'],
        ['4 · Attention / MLP', 'Q,K,V · softmax · SwiGLU', 'ראש / נוירון חבוי', '32–128 ראשים; 11k–50k+ נוירונים חבויים'],
        ['5 · נוירון', 'z = w·x + b → f(z)', 'מספר בודד', 'מיליארדי משקלים כאלה']
      ]) +
      LA.callout('info', '<p>המודול הזה הוא ה<b>יסוד</b> של כל השאר: <a href="#/chat">ממשקי צ׳אט</a> עוטפים את לולאת היצירה, <a href="#/rag">RAG</a> ממלא את חלון ההקשר, <a href="#/langchain">LangChain</a> ו-<a href="#/langgraph">LangGraph</a> מתזמרים קריאות למודל, <a href="#/agents">סוכנים</a> מריצים את המודל בלולאה עם כלים, ו-<a href="#/clearml">ClearML</a> עוקב אחרי אימון והערכה. בכל פעם שמשהו "מוזר" קורה שם — התשובה כמעט תמיד נמצאת כאן.</p>', 'למה להתחיל כאן');
  }

  function renderDive(el) {
    el.insertAdjacentHTML('beforeend', '<p>זה הלב של המודול: דיאגרמה אחת שאפשר <b>לצלול</b> לתוכה — מהמוצר, דרך שרת ההסקה, ה-Transformer, בלוק בודד, ראש attention / שכבת MLP, ועד <b>נוירון אחד</b> עם המספרים שלו. לחצו על רכיב כדי לקרוא, ועל ⤵ כדי לצלול. או קפצו ישר לרמה:</p>');
    const jump = h('div', { class: 'pill-row llm-jump' });
    el.appendChild(jump);
    const box = h('div'); el.appendChild(box);
    const api = LA.diagram(box, ROOT_SPEC);
    DIVE_PATHS.forEach(dp => jump.appendChild(h('button', {
      type: 'button', class: 'btn', onclick: () => {
        const first = api.el.querySelector('.dg-crumbs button'); if (api.depth > 0 && first) first.click();
        dp.path.forEach(id => api.dive(id));
      }
    }, dp.label)));
    el.insertAdjacentHTML('beforeend', LA.callout('tip', '<p><b>איך לקרוא את הדיאגרמות:</b> ברמות 2–3 הזרימה <b>מלמטה למעלה</b> (כמו בציור הקלאסי של ה-Transformer). הקווים הירוקים המקווקווים הם <b>חיבורי שארית</b>. ה-KV cache מסומן כמסד נתונים כי הוא זיכרון — לא חישוב.</p>'));
  }

  function renderExample(el) {
    el.insertAdjacentHTML('beforeend',
      LA.callout('example', '<p><b>התרחיש:</b> בוט שירות לקוחות של חברת חשמל. לקוח שואל "חשבון החשמל שלי גבוה פי 2 מהרגיל, למה?". נעקוב אחרי הבקשה מהקוד ועד הלוגיטים — ונחשב כמה זה עולה.</p>') +
      '<p>ארבע זוויות על אותו רעיון: מה שאתם כותבים כמהנדסים (API), מה שקורה בפנים (logits במודל פתוח), ושני הרכיבים המתמטיים — מימוש נקי ב-NumPy של attention ושל נוירון לומד.</p>');
    const tabsBox = h('div'); el.appendChild(tabsBox);
    LA.tabs(tabsBox, [
      {
        label: '1 · קריאת API + עלות', html: LA.code(`
import anthropic

client = anthropic.Anthropic()          # reads ANTHROPIC_API_KEY
MODEL = "claude-sonnet-5-5"             # balanced tier: customer-facing answers

SYSTEM = (
    "You are a customer-service agent for an Israeli electricity company. "
    "Answer in Hebrew. If the answer is not in the provided account data, say you don't know."
)
question = "חשבון החשמל שלי גבוה פי 2 מהרגיל, למה?"
messages = [{"role": "user", "content": question}]

# 1) How many input tokens will this cost? (dedicated counting endpoint)
count = client.messages.count_tokens(model=MODEL, system=SYSTEM, messages=messages)
print("input tokens:", count.input_tokens)

# 2) The call. No temperature/top_p: depth is steered with effort.
resp = client.messages.create(
    model=MODEL,
    max_tokens=2048,
    system=SYSTEM,
    output_config={"effort": "low"},     # simple FAQ-style answer -> low effort
    messages=messages,
)

if resp.stop_reason == "refusal":
    raise RuntimeError("declined by safety classifier")
answer = "".join(b.text for b in resp.content if b.type == "text")  # skip thinking blocks
print(answer)

# 3) Cost from the usage block (prices: $ per 1M tokens, check the pricing page)
PRICE_IN, PRICE_OUT = 2.00, 10.00
u = resp.usage
cost = u.input_tokens * PRICE_IN / 1e6 + u.output_tokens * PRICE_OUT / 1e6
print(f"in={u.input_tokens} out={u.output_tokens} cost=\${cost:.5f}")
`, 'python', 'call_and_cost.py') + LA.callout('algo', '<p>שימו לב: (1) <code>output_tokens</code> כולל גם טוקני חשיבה — ולכן <code>effort</code> הוא ידית עלות; (2) תמיד בודקים <code>stop_reason</code> לפני קריאת התוכן (<code>max_tokens</code> = תשובה קטועה); (3) ה-API חסר-מצב: בתור הבא תשלחו שוב את כל ההיסטוריה — עלות הקלט גדלה בכל תור (ופה prompt caching חוסך).</p>')
      },
      {
        label: '2 · לראות logits במודל פתוח', html: '<p>עם מודל open-weights קטן אפשר לראות בדיוק את מה שה-LM head מחזיר — ההתפלגות על הטוקן הבא:</p>' + LA.code(`
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

name = "Qwen/Qwen2.5-0.5B"               # any small causal LM works
tok = AutoTokenizer.from_pretrained(name)
model = AutoModelForCausalLM.from_pretrained(name)
model.eval()

prompt = "My electricity bill this month is unusually"
ids = tok(prompt, return_tensors="pt")
print(ids["input_ids"])                  # the integers the network actually sees

with torch.no_grad():
    out = model(**ids)                   # one forward pass = prefill
logits = out.logits[0, -1]               # (vocab_size,) -> scores for the NEXT token
probs = torch.softmax(logits, dim=-1)

top = torch.topk(probs, k=8)
for p, i in zip(top.values, top.indices):
    print(f"{tok.decode(i)!r:>12}  {p.item():.3f}")

# temperature, by hand:
T = 0.7
probs_T = torch.softmax(logits / T, dim=-1)
next_id = torch.multinomial(probs_T, num_samples=1)
print("sampled:", tok.decode(next_id))
`, 'python', 'peek_logits.py') + '<p class="muted">כאן (במודל שאתם מריצים בעצמכם) temperature הוא פשוט חלוקה של הלוגיטים. במודלים המתארחים של Claude אין פרמטר כזה — ראו מעבדה 4.</p>'
      },
      {
        label: '3 · Attention ב-NumPy', html: LA.code(`
import numpy as np

def softmax(x, axis=-1):
    x = x - x.max(axis=axis, keepdims=True)      # numerical stability
    e = np.exp(x)
    return e / e.sum(axis=axis, keepdims=True)

def causal_self_attention(X, Wq, Wk, Wv, Wo, n_heads):
    T, d = X.shape
    dh = d // n_heads
    Q, K, V = X @ Wq, X @ Wk, X @ Wv                   # (T, d) each
    split = lambda M: M.reshape(T, n_heads, dh).transpose(1, 0, 2)   # (H, T, dh)
    Q, K, V = split(Q), split(K), split(V)
    scores = Q @ K.transpose(0, 2, 1) / np.sqrt(dh)    # (H, T, T)
    future = np.triu(np.ones((T, T), dtype=bool), k=1)
    scores[:, future] = -np.inf                         # causal mask
    A = softmax(scores, axis=-1)                        # attention weights
    out = (A @ V).transpose(1, 0, 2).reshape(T, d)      # concat heads
    return out @ Wo, A

rng = np.random.default_rng(0)
T, d, H = 5, 16, 4
X = rng.normal(size=(T, d))
W = [rng.normal(size=(d, d)) / np.sqrt(d) for _ in range(4)]
Y, A = causal_self_attention(X, *W, n_heads=H)
print(Y.shape)            # (5, 16)  same shape in, same shape out
print(A[0].round(2))      # head 0: lower-triangular, rows sum to 1
`, 'python', 'attention_numpy.py')
      },
      {
        label: '4 · נוירון לומד ב-NumPy', html: LA.code(`
import numpy as np

x = np.array([1.0, 0.5, -1.0])     # inputs
w = np.array([0.8, -0.5, 0.3])     # weights
b, t, lr = 0.1, 1.0, 0.1           # bias, target, learning rate

for step in range(3):
    z = w @ x + b                  # weighted sum
    y = max(z, 0.0)                # ReLU
    loss = (y - t) ** 2            # MSE
    dz = 2 * (y - t) * (1.0 if z > 0 else 0.0)   # chain rule through ReLU
    w -= lr * dz * x               # dL/dw = dz * x
    b -= lr * dz                   # dL/db = dz
    print(f"step {step}: z={z:.4f} loss={loss:.4f} w={w.round(4)} b={b:.4f}")

# step 0: z=0.3500 loss=0.4225 w=[ 0.93  -0.435  0.17 ] b=0.2300
`, 'python', 'neuron_numpy.py') + '<p>אלה בדיוק המספרים במעבדה 1 וברמה 5 של הדיאגרמה. אימון LLM = אותו לולאה, על מיליארדי משקלים, עם cross-entropy במקום MSE ו-AdamW במקום SGD.</p>'
      }
    ]);
  }

  function renderTraining(el) {
    el.insertAdjacentHTML('beforeend', '<p>מודל לא "נולד" עוזר. הוא עובר כמה שלבי אימון, וכל שלב משנה את <b>אותם משקלים</b> עם מטרה אחרת:</p>');
    const box = h('div'); el.appendChild(box);
    LA.diagram(box, {
      width: 900, height: 270,
      nodes: [
        { id: 'pre', x: 790, y: 80, w: 160, label: 'Pretraining', sub: 'חיזוי הטוקן הבא', color: 'llm', info: '<p>המודל קורא כמויות עצומות של טקסט וקוד ולומד לחזות את הטוקן הבא (cross-entropy). זה השלב היקר ביותר — חודשים על אלפי מאיצים.</p><p>התוצאה: <b>base model</b> — יודע המון, ממשיך כל טקסט, אבל לא "עונה" — אם תשאלו שאלה הוא עלול להמשיך עם עוד שאלות.</p><p>כלל אצבע (Chinchilla): לאימון יעיל-חישוב ~20 טוקנים לכל פרמטר; בפועל מודלים מאומנים על הרבה יותר.</p>' },
        { id: 'sft', x: 560, y: 80, w: 160, label: 'SFT', sub: 'כוונון להוראות', color: 'llm', info: '<p><b>Supervised Fine-Tuning</b>: אימון על דוגמאות "פרומפט → תשובה טובה" (כתובות ע״י אנשים או מסוננות). המודל לומד את פורמט השיחה, לענות במקום להמשיך, להשתמש בכלים.</p><p>אותה פונקציית loss — אבל רק על טוקני התשובה.</p>' },
        { id: 'pref', x: 330, y: 80, w: 170, label: 'RLHF / RLAIF', sub: 'העדפות + RL', color: 'llm', info: '<p>מייצרים כמה תשובות, ומדרגים מה עדיף. <b>RLHF</b>: בני אדם משווים → מאמנים reward model → מאמנים את המודל ב-RL למקסם אותו. <b>RLAIF / Constitutional AI</b> (הגישה ש-Anthropic פיתחה): מודל AI שופט לפי עקרונות כתובים ("חוקה").</p><p>בנוסף: <b>RL עם תגמול בר-אימות</b> (בדיקות קוד, תשובות מתמטיות) — מקור עיקרי לשיפור ביכולות היגיון ו"חשיבה" (thinking).</p><p>סכנות: reward hacking, חנפנות (sycophancy) — המודל לומד מה מתגמלים, לא בהכרח מה נכון.</p>' },
        { id: 'dep', x: 110, y: 80, w: 160, label: 'Eval → פריסה', sub: 'מדדים, בטיחות', color: 'ok', info: '<p>בדיקות יכולת (benchmarks), red-teaming, הערכות בטיחות, ואז פריסה כ-API. מכאן המשקלים <b>קפואים</b> — המודל לא לומד מהשיחות שלכם בזמן אמת. "ידע חדש" נכנס רק דרך ההקשר (RAG/כלים) או גרסת מודל חדשה.</p>' },
        { id: 'd1', x: 790, y: 215, w: 160, h: 60, shape: 'db', label: 'קורפוס ענק', sub: 'טריליוני טוקנים', color: 'store', info: '<p>אינטרנט ציבורי מסונן, ספרים, קוד, מאמרים, דאטה סינתטי. איכות וסינון (dedup, הסרת זבל) חשובים לא פחות מכמות. כאן נקבע ה-<b>knowledge cutoff</b>.</p>' },
        { id: 'd2', x: 560, y: 215, w: 160, h: 60, shape: 'db', label: 'דוגמאות הדגמה', sub: 'פרומפט → תשובה', color: 'store', info: '<p>עשרות עד מאות אלפי דוגמאות איכותיות. כאן גם נכנסים פורמטים: tool use, JSON, סירוב מנומק.</p>' },
        { id: 'd3', x: 330, y: 215, w: 160, h: 60, shape: 'db', label: 'השוואות A/B', sub: 'אדם / AI + חוקה', color: 'store', info: '<p>זוגות תשובות עם העדפה, או סביבות עם תגמול אוטומטי (טסטים, פותרי מתמטיקה).</p>' },
        { id: 'd4', x: 110, y: 215, w: 160, h: 60, shape: 'db', label: 'סטי בדיקה', sub: 'benchmarks · red-team', color: 'store', info: '<p>חייבים להיות <b>נקיים</b> מדאטה האימון — אחרת "זיהום" (contamination) מנפח את התוצאות. ראו "עין של אלגוריתמאי".</p>' }
      ],
      edges: [
        { from: 'pre', to: 'sft', label: 'base model' }, { from: 'sft', to: 'pref', label: 'instruct' }, { from: 'pref', to: 'dep', label: 'aligned' },
        { from: 'd1', to: 'pre', dashed: true, color: 'store' }, { from: 'd2', to: 'sft', dashed: true, color: 'store' },
        { from: 'd3', to: 'pref', dashed: true, color: 'store' }, { from: 'd4', to: 'dep', dashed: true, color: 'store' }
      ]
    });
    el.insertAdjacentHTML('beforeend', LA.table(['שלב', 'מטרה', 'דאטה', 'עלות יחסית', 'מה זה נותן'], [
      ['Pretraining', 'מינימום cross-entropy על הטוקן הבא', 'טריליוני טוקנים', '🔥🔥🔥🔥 (רוב החישוב)', 'ידע, שפה, דפוסי היגיון'],
      ['SFT', 'חיקוי תשובות טובות', '10⁴–10⁶ דוגמאות', '🔥', 'פורמט שיחה, ציות להוראות, כלים'],
      ['RLHF / RLAIF', 'מקסום העדפה / תגמול', 'השוואות, חוקה, סביבות', '🔥🔥', 'מועילות, בטיחות, טון, היגיון רב-שלבי'],
      ['Fine-tune שלכם', 'התאמה לדומיין (כשהספק מאפשר)', 'מאות–אלפים', '💲', 'סגנון/פורמט עקבי; לרוב RAG עדיף לידע']
    ]));
    ceWidget(el);
  }

  function renderContext(el) {
    el.insertAdjacentHTML('beforeend',
      '<h3>חלון ההקשר (context window)</h3>' +
      '<p>כל מה שהמודל "יודע" על השיחה הנוכחית נמצא בחלון ההקשר: system prompt, היסטוריה, מסמכים, תוצאות כלים — <b>וגם</b> התשובה שהוא כותב. בדגמי Claude הנוכחיים החלון מגיע ל-<b>1M טוקנים</b>, ו-<code>max_tokens</code> מגביל את אורך הפלט.</p>' +
      LA.list([
        '<b>אין זיכרון בין קריאות.</b> ה-API חסר-מצב; "זיכרון" של צ׳אט = האפליקציה ששולחת שוב את ההיסטוריה (או מסכמת אותה).',
        '<b>יותר הקשר ≠ תשובה טובה יותר.</b> מידע רלוונטי שקבור באמצע הקשר ארוך מנוצל פחות טוב ("lost in the middle"); הקשר רועש מסיח. RAG טוב שולח <i>מעט ונכון</i>.',
        '<b>עלות וזמן</b> גדלים עם ההקשר: prefill ארוך יותר (TTFT), ו-attention עולה עם T (חישוב ריבועי בפרפיל, KV cache ליניארי בזיכרון).'
      ]) +
      '<h3>KV cache — ולמה טוקני פלט יקרים יותר</h3>' +
      LA.table(['', 'Prefill (קלט)', 'Decode (פלט)'], [
        ['מה קורה', 'כל טוקני הפרומפט עוברים בשכבות במקביל', 'טוקן אחד לכל forward pass'],
        ['צוואר בקבוק', 'חישוב (FLOPs) — ה-GPU עמוס', 'רוחב פס זיכרון — לקרוא את כל המשקלים + KV לכל טוקן'],
        ['מדד זמן', 'TTFT (time to first token)', 'tokens/sec, זמן בין טוקנים'],
        ['מחיר טיפוסי', 'בסיס', 'בדרך כלל פי ~5 ממחיר קלט (למשל $2 מול $10 למיליון ב-Sonnet 5.5)'],
        ['חיסכון', '<b>Prompt caching</b>: קידומת זהה נשמרת — קריאה ממנה זולה בהרבה ומהירה', 'תשובות קצרות, structured output, effort נמוך יותר']
      ]) +
      LA.callout('analogy', '<p>Prefill זה כמו לקרוא מסמך שלם בבת אחת; decode זה לכתוב תשובה בכתב יד — מילה-מילה, ולפני כל מילה צריך להעיף מבט בכל הספרייה (המשקלים) ובכל ההערות שרשמתם (KV cache). קריאה מהירה; כתיבה איטית ויקרה.</p>'));
    memoryLab(el);
  }

  function renderHalluc(el) {
    el.insertAdjacentHTML('beforeend',
      '<p><b>הזיה (hallucination)</b> = תשובה שוטפת ובטוחה שאינה נכונה או אינה מבוססת על המקורות. זה לא "באג" נקודתי — זו תוצאה ישירה של המנגנון שראינו: המודל ממקסם <i>סבירות</i> של טקסט, לא <i>אמת</i>.</p>' +
      LA.table(['שורש הבעיה', 'המנגנון', 'מה עושים'], [
        ['מטרת האימון', 'next-token מתגמל המשך סביר; תשובה "נשמעת נכון" מקבלת הסתברות גבוהה גם כשהעובדה חסרה', 'לבקש ציטוטים/מקורות; לאפשר במפורש "לא יודע"'],
        ['ידע דליל / cutoff', 'עובדה שהופיעה מעט פעמים (או אחרי ה-cutoff) לא נדחסה היטב למשקלים', '<b>RAG</b> — לשים את העובדות בהקשר; כלים (חיפוש, DB)'],
        ['תמריצים בהערכה', 'מדדים שמענישים "לא יודע" באותה מידה כמו טעות מלמדים לנחש', 'במדדים שלכם: לתגמל הימנעות מנומקת, להעניש ביטחון שגוי'],
        ['פרומפט מוביל', '"למה X נכון?" מניח ש-X נכון; חנפנות מ-RLHF', 'ניסוח ניטרלי; לבקש לבדוק הנחות'],
        ['דגימה', 'גם טוקן בהסתברות 5% ייבחר מתישהו; טעות מוקדמת "נגררת"', 'אימות/בדיקה עצמית, self-consistency, structured outputs'],
        ['הקשר ארוך/רועש', 'המידע הנכון קיים אבל לא נוצל (lost in the middle) או מסמך סותר', 'אחזור מדויק יותר, פחות chunks, סדר נכון'],
        ['טוקניזציה', 'המודל לא "רואה" אותיות/ספרות בודדות — ספירה, איות, חשבון', 'כלי חישוב (code execution) במקום "ראש"']
      ]) +
      LA.callout('example', '<p>בוט חברת החשמל עונה: "יש תעריף לילה מוזל ב-30% בין 23:00 ל-07:00". נשמע אמין — אבל לא מופיע באף מסמך. <b>תיקון:</b> RAG על מסמכי התעריפים, הנחיה "ענה רק מהמקורות המצורפים וצטט; אם אין — אמור שאינך יודע והפנה לנציג", ו-eval אוטומטי שבודק שכל מספר בתשובה מופיע במקור (groundedness).</p>'));
  }

  function renderEmbed(el) {
    el.insertAdjacentHTML('beforeend',
      '<p>"Embedding" מופיע בשני מקומות שונים, וחשוב לא לבלבל:</p>' +
      LA.list([
        '<b>שכבת ה-Embedding בתוך LLM</b> — טבלה שממירה מזהה טוקן לווקטור (רמה 2 בדיאגרמה). פנימית, לא חשופה ב-API.',
        '<b>מודל Embedding</b> — מודל נפרד (לרוב encoder דו-כיווני) שמקבל טקסט שלם ומחזיר <b>וקטור אחד</b> שמייצג את המשמעות. משמש לחיפוש סמנטי, RAG, clustering, זיהוי כפילויות.'
      ]) +
      LA.table(['', 'מודל Embedding', 'מודל יצירה (LLM decoder)'], [
        ['קלט → פלט', 'טקסט → וקטור (למשל 1024 מספרים)', 'טקסט → טקסט (טוקן אחר טוקן)'],
        ['Attention', 'לרוב דו-כיווני (כל טוקן רואה הכול)', 'סיבתי (רק עבר)'],
        ['עלות', 'זול מאוד, מהיר, ניתן ל-batch ענק', 'יקר יותר, במיוחד פלט'],
        ['שימוש טיפוסי', 'אינדוקס ואחזור ב-RAG, המלצות, סיווג', 'תשובות, סיכום, קוד, סוכנים'],
        ['בעולם של Anthropic', 'Anthropic לא מציעה מודל embeddings משלה; התיעוד מפנה לספקים חיצוניים', 'Claude Haiku / Sonnet / Opus']
      ]));
    cosineWidget(el);
    el.insertAdjacentHTML('beforeend', LA.callout('llm', '<p>ב-<a href="#/rag">RAG</a> שני הסוגים עובדים יחד: מודל embedding מוצא את הקטעים הרלוונטיים, ומודל היצירה קורא אותם בחלון ההקשר וכותב תשובה. שגיאה באחזור = הזיה בתשובה.</p>'));
  }

  function renderTiers(el) {
    el.insertAdjacentHTML('beforeend',
      '<p><b>גודל מודל</b> (פרמטרים, עומק, כמות אימון) קונה יכולת — במחיר זמן ועלות. בפועל ספקים מציעים "שכבות" (tiers). מעבר לגודל הגולמי: <b>MoE</b> (פרמטרים כוללים ≠ פעילים), <b>distillation</b> (מודל קטן לומד ממודל גדול), ו-<b>test-time compute</b> — לתת למודל "לחשוב" יותר (ב-Claude: <code>effort</code>).</p>');
    const cards = h('div', { class: 'grid3' }); el.appendChild(cards);
    [
      ['haiku', 'מהיר וזול מאוד', ['ניתוב וסיווג כוונות', 'חילוץ שדות, תיוג, סינון', 'סוכני-משנה בנפח גבוה', 'סיכומים קצרים, תרגום פשוט'], '$0.10 / $0.50'],
      ['sonnet', 'האיזון היומיומי', ['תשובות RAG ללקוחות', 'קוד ו-tool use שגרתי', 'רוב עבודת הסוכן', 'כתיבה וניתוח בינוניים'], '$2 / $10'],
      ['opus', 'הכי חזק', ['תכנון ותזמור (orchestrator)', 'היגיון רב-שלבי, מקרי קצה', 'ארכיטקטורה, קוד קשה', 'שופט (LLM-as-judge) לבעיות קשות'], '$4 / $20']
    ].forEach(([t, tag, uses, price]) => {
      cards.appendChild(h('div', { class: 'card llm-tier-card', html: `<div>${LA.modelBadge(t)}</div><div class="mono llm-tier-id">${LA.MODELS[t].id}</div><h4>${tag}</h4>${LA.list(uses)}<div class="muted">קלט / פלט למיליון: <span class="mono">${price}</span></div>` }));
    });
    el.insertAdjacentHTML('beforeend',
      '<h3>ניתוב לפי מורכבות — בוט חברת החשמל</h3>' +
      LA.table(['שלב / סוכן-משנה', 'מודל', 'למה'], [
        ['סיווג כוונה (חיוב / תקלה / מעבר דירה / אחר)', LA.modelBadge('haiku'), 'נפח ענק, משימה צרה, latency קריטי'],
        ['חילוץ פרטי חשבון מטקסט חופשי ל-JSON', LA.modelBadge('haiku'), 'סכמה קבועה; structured outputs מבטיחים פורמט'],
        ['תשובה ללקוח על בסיס RAG', LA.modelBadge('sonnet'), 'צריך הבנת מסמכים, ניסוח בעברית טובה וזהירות'],
        ['ניתוח מחלוקת חיוב מורכבת (קריאות מונה, תעריפים, היסטוריה)', LA.modelBadge('opus'), 'היגיון רב-שלבי, מחיר טעות גבוה, נפח נמוך'],
        ['הערכה אוטומטית (LLM-as-judge) על דגימה', LA.modelBadge('sonnet'), 'שיפוט עקבי במחיר סביר; Opus לדגימת ביקורת']
      ]) +
      LA.code(`
import anthropic
client = anthropic.Anthropic()

ROUTES = {                      # route by complexity, not by habit
    "simple":  ("claude-haiku-5-5",  "low"),
    "standard": ("claude-sonnet-5-5", "medium"),
    "complex": ("claude-opus-5-5",   "high"),
}

def classify(question: str) -> str:
    r = client.messages.create(
        model="claude-haiku-5-5", max_tokens=256,
        output_config={"effort": "low"},
        system="Classify the customer question as exactly one word: simple, standard or complex.",
        messages=[{"role": "user", "content": question}],
    )
    label = "".join(b.text for b in r.content if b.type == "text").strip().lower()
    return label if label in ROUTES else "standard"   # safe default

def answer(question: str, context: str) -> str:
    model, effort = ROUTES[classify(question)]
    r = client.messages.create(
        model=model, max_tokens=4096,
        output_config={"effort": effort},
        system="Answer in Hebrew using ONLY the provided documents. Cite them.",
        messages=[{"role": "user", "content": f"<docs>{context}</docs>\\n\\n{question}"}],
    )
    return "".join(b.text for b in r.content if b.type == "text")
`, 'python', 'router.py') +
      LA.callout('tip', '<p>לפני שבונים מפל מודלים, מדדו את החלופה הפשוטה: המודל החזק עם <code>effort</code> נמוך. לפעמים זה זול ומדויק לא פחות, ונשאר cache אחד (ה-cache נפרד לכל מודל). <b>תמיד</b> השוו עלות למשימה שהושלמה — לא עלות לבקשה.</p>'));
  }

  function renderLLMLink(el) {
    el.innerHTML = LA.callout('llm', '<p>במודול הזה <b>ה-LLM הוא הנושא עצמו</b>. כל מודול אחר בקורס נוגע בחלק מסוים של המכונה שראינו:</p>') +
      LA.table(['מודול', 'איזה חלק של ה-LLM הוא מפעיל', 'הפרמטר שהכי משפיע'], [
        ['<a href="#/chat">ממשקי צ׳אט</a>', 'לולאת decode + streaming; היסטוריה בחלון ההקשר', 'TTFT, אורך היסטוריה, prompt caching'],
        ['<a href="#/rag">RAG</a>', 'ממלא את חלון ההקשר במסמכים; משתמש במודל embedding', 'איכות האחזור, מיקום בהקשר, groundedness'],
        ['<a href="#/langchain">LangChain</a>', 'עוטף קריאה בודדת (prompt → model → parser)', 'פורמט פלט, structured outputs'],
        ['<a href="#/langgraph">LangGraph</a>', 'כמה קריאות עם state משותף ותנאים', 'מספר הקריאות × עלות כל אחת'],
        ['<a href="#/agents">סוכנים</a>', 'המודל בלולאה: מחליט על tool calls, קורא תוצאות', 'בחירת tier לכל סוכן-משנה, effort, תקציב'],
        ['<a href="#/skills">Skills</a>', 'חבילות הוראות/קוד שנטענות להקשר רק כשצריך', 'חיסכון בחלון ההקשר'],
        ['<a href="#/comfyui">ComfyUI</a>', 'מודלי דיפוזיה — עם text encoders (Transformer) ו-attention דומים', 'גודל מודל, VRAM, קוונטיזציה'],
        ['<a href="#/clearml">ClearML</a>', 'מעקב אחרי אימון/כוונון וניסויי eval', 'רפרודוקציה, גרסאות דאטה ומודל']
      ]);
  }

  function renderProfile(el) {
    el.innerHTML = LA.profile({
      requirements: [
        'חומרה: מאיצים עם הרבה זיכרון (משקלים + KV cache) — או API של ספק',
        'טוקנייזר תואם למודל; chat template נכון (במודלים פתוחים)',
        'חלון הקשר שמספיק לפרומפט + מסמכים + פלט',
        'הגדרה ברורה של המשימה, פורמט פלט, ומדד הצלחה (eval)',
        'תקציב: עלות לטוקן × נפח; SLA של זמן תגובה'
      ],
      strengths: [
        'כלליות: אותו מודל מסכם, מסווג, כותב קוד, מתרגם ומתכנן',
        'הבנת שפה טבעית ועברית ללא אימון ייעודי (zero/few-shot)',
        'In-context learning: מלמדים התנהגות חדשה דרך הפרומפט',
        'שימוש בכלים ו-structured outputs — מתחבר לכל מערכת',
        'משתפר עם scale ו-test-time compute (effort/thinking)'
      ],
      weaknesses: [
        'הזיות: ביטחון גבוה גם כשאין ידע',
        'ידע קפוא (cutoff) ואין זיכרון בין קריאות',
        'אי-דטרמיניזם: אותה שאלה → תשובות שונות',
        'עלות וזמן גדלים עם אורך קלט ובעיקר פלט',
        'רגישות לניסוח, prompt injection, וטוקניזציה (ספירה, ספרות, עברית יקרה יותר)'
      ],
      algoTips: [
        'חשבו עלות/latency לפני שבונים: (קלט × מחיר) + (פלט + thinking) × מחיר; TTFT ≈ prefill',
        'מדדו בטוקנים אמיתיים (count_tokens) — במיוחד בעברית',
        'בנו eval set מייצג לפני שמשנים מודל/פרומפט/effort; הריצו כמה דגימות לכל שאלה',
        'לוגו model id, effort, גרסת פרומפט ו-usage לכל קריאה',
        'הפרידו "ידע" (RAG/כלים) מ"מיומנות" (המודל)'
      ],
      whenToUse: [
        '✅ שפה טבעית לא-מובנית, משימות פתוחות, ניסוח, הבנה, תכנון, קוד',
        '✅ כשאפשר לאמת את הפלט (טסטים, סכמה, מקורות) או שמחיר טעות נמוך',
        '❌ חישוב מדויק, חיפוש מדויק ב-DB, לוגיקה עסקית דטרמיניסטית — השתמשו בקוד/כלים',
        '❌ כשצריך תשובה זהה בכל ריצה בלי שכבת ולידציה'
      ]
    });
  }

  function renderAlgo(el) {
    el.insertAdjacentHTML('beforeend', LA.callout('algo', '<p>כאלגוריתמאי AI, התפקיד שלכם הוא להפוך "המודל נראה טוב" ל<b>מספרים</b>: איכות, עלות, זמן, ויציבות — ולדעת איזה חלק של המכונה אחראי לכל תקלה.</p>'));
    const tb = h('div'); el.appendChild(tb);
    LA.tabs(tb, [
      {
        label: 'Evals', html: LA.list([
          '<b>eval set מייצג</b> (50–500 דוגמאות אמיתיות, כולל מקרי קצה וקלטים בעברית) — לפני כל שינוי מודל/פרומפט/effort.',
          '<b>סוג בודק לפי משימה:</b> התאמה מדויקת/regex/JSON-schema לחילוץ; בדיקות קוד; LLM-as-judge עם rubric לטקסט חופשי (וכיילו אותו מול שיפוט אנושי).',
          '<b>מדדים:</b> accuracy/F1, groundedness (כל טענה מבוססת מקור), שיעור "לא יודע" נכון, עלות למשימה, p50/p95 latency.',
          '<b>כמה דגימות לשאלה</b> — דווחו ממוצע ± סטיית תקן, pass@k, או "עקביות" (כמה מתוך 5 ריצות נכונות).',
          '<b>רגרסיה:</b> הריצו את ה-eval ב-CI על כל שינוי פרומפט; שמרו גרסאות (ראו <a href="#/clearml">ClearML</a>).'
        ])
      },
      { label: 'עלות וזמן', render: costLab },
      {
        label: 'אי-דטרמיניזם', html: LA.list([
          '<b>דגימה</b> — מקור מובן מאליו. בדגמי Claude הנוכחיים אין <code>temperature</code>/<code>top_p</code>; לא מבקשים מהם "T=0".',
          '<b>גם greedy אינו דטרמיניסטי</b> בשרתים: batching משתנה, סדר חיבור נקודה-צפה, ניתוב MoE התלוי ב-batch.',
          '<b>מה עושים:</b> ולידציה דטרמיניסטית אחרי המודל (סכמה, כללים), structured outputs, retry עם בדיקה, ו-evals סטטיסטיים.',
          '<b>רפרודוקציה:</b> שמרו את הפרומפט המלא, model id מדויק, effort, גרסת כלים — ואת הפלט. אל תניחו שתוכלו "לשחזר" ריצה.'
        ])
      },
      {
        label: 'גבולות הקשר', html: LA.list([
          '<b>תקציב טוקנים:</b> system + כלים + היסטוריה + מסמכים + פלט ≤ חלון. השאירו מרווח ל-<code>max_tokens</code> ולחשיבה.',
          '<b>היסטוריה גדלה</b> בכל תור — קיצוץ, סיכום, או compaction בצד השרת; שימו לב שהמידע הקריטי לא נחתך.',
          '<b>"Lost in the middle":</b> הוראות חשובות בהתחלה/בסוף; מסמכים רלוונטיים בסדר הגיוני; פחות chunks איכותיים > הרבה רועשים.',
          '<b>Prompt caching:</b> שמרו קידומת יציבה (system, כלים, מסמכים קבועים) ותוכן משתנה בסוף. חותמת זמן ב-system prompt שוברת את ה-cache.',
          '<b>Prompt injection:</b> כל טקסט בהקשר (מסמך, דף אינטרנט, תוצאת כלי) יכול לנסות לתת הוראות. התייחסו אליו כ"דאטה", הגבילו הרשאות כלים.'
        ])
      },
      {
        label: 'קוונטיזציה', html: '<p>רלוונטי כשמריצים מודלים פתוחים בעצמכם (או מודלי <a href="#/comfyui">ComfyUI</a>):</p>' + LA.table(['דיוק', 'בייטים לפרמטר', '70B משקלים', 'איכות', 'הערות'], [
          ['fp32', '4', '280GB', 'ייחוס', 'כמעט לא בשימוש בהסקה'],
          ['bf16 / fp16', '2', '140GB', '≈ ייחוס', 'ברירת המחדל'],
          ['fp8 / int8', '1', '70GB', 'ירידה קטנה בדרך כלל', 'חומרה חדשה מאיצה fp8 נטיבית'],
          ['int4 (GPTQ/AWQ/GGUF)', '~0.5', '~35–40GB', 'ירידה מורגשת לעתים, במיוחד בהיגיון/קוד/שפות פחות נפוצות', 'מאפשר להריץ על כרטיס יחיד']
        ]) + LA.list(['בדקו על <b>ה-eval שלכם</b> — במיוחד בעברית — לא רק על benchmark כללי.', 'קוונטיזציה של KV cache (fp8) חוסכת זיכרון בהקשרים ארוכים.', 'ירידה במהירות אינה מובטחת: תלוי ב-kernels ובחומרה.'])
      },
      {
        label: 'זיהום בנצ׳מרקים', html: LA.list([
          '<b>Contamination:</b> שאלות benchmark ציבורי דלפו לדאטה האימון → המודל "זוכר" תשובות, והציון מנופח.',
          '<b>סימנים:</b> ציון גבוה בחשד על benchmark ישן לעומת גרסה חדשה/מנוסחת מחדש; המודל משלים את השאלה מילה במילה.',
          '<b>מה עושים:</b> eval פרטי מהדאטה שלכם (שלא פורסם ברשת), ניסוח מחדש, דאטה חדש יותר מה-cutoff, holdout שמור.',
          '<b>Goodhart:</b> ברגע שמדד הופך ליעד הוא מפסיק למדוד. אל תכווננו פרומפטים על ה-test set — פצלו train/validation/test גם ל-prompt engineering.'
        ])
      }
    ]);
  }

  function renderQuiz(el) {
    LA.quiz(el, [
      { q: 'מה בדיוק מחשב ה-LLM בכל צעד יצירה?', options: ['את התשובה המלאה בבת אחת', 'התפלגות הסתברויות על כל אוצר המילים עבור הטוקן הבא', 'חיפוש במסד נתונים של עובדות', 'את ה-embedding של השאלה בלבד'], answer: 1, explain: 'ה-LM head מחזיר logit לכל טוקן ב-vocab, softmax הופך אותם להסתברויות, וה-sampler בוחר טוקן אחד. התשובה כולה נבנית בלולאה אוטורגרסיבית.' },
      { q: 'למה מחלקים את QKᵀ ב-√dₖ?', options: ['כדי לחסוך זיכרון', 'כדי שהשונות של הציונים לא תגדל עם המימד, וה-softmax לא יירווה', 'כדי לממש את המסכה הסיבתית', 'כדי לנרמל את V'], answer: 1, explain: 'מכפלה פנימית של וקטורים באורך dₖ עם רכיבים בשונות ~1 היא בשונות ~dₖ. בלי הנרמול ה-softmax הופך ל-one-hot והגרדיאנטים נעלמים.' },
      { q: 'מה ה-KV cache חוסך, ומה מחירו?', options: ['חוסך את חישוב ה-LM head; עולה בדיוק', 'חוסך חישוב מחדש של K ו-V לטוקנים קודמים בכל צעד decode; מחירו זיכרון שגדל ליניארית עם אורך ההקשר', 'חוסך טוקני קלט בחיוב; אין לו מחיר', 'שומר את התשובות הקודמות של המודל לשימוש חוזר'], answer: 1, explain: 'בזכות המסכה הסיבתית, K ו-V של טוקנים קודמים לא משתנים. שומרים אותם (2·L·H_kv·d_head·bytes לטוקן) — ובהקשרים ארוכים ה-cache יכול לעבור את גודל המשקלים.' },
      { q: 'למה טוקני פלט יקרים ואיטיים יותר מטוקני קלט?', options: ['כי הם ארוכים יותר', 'כי decode מייצר טוקן אחד בכל forward pass, וכל צעד קורא את כל המשקלים וה-KV מהזיכרון — חסום ברוחב פס', 'כי הם עוברים סינון בטיחות', 'כי הטוקנייזר שונה'], answer: 1, explain: 'Prefill מעבד את כל הקלט במקביל (ניצול חישוב גבוה). Decode סדרתי ו-memory-bound — ולכן המחיר לטוקן פלט בדרך כלל פי ~5.' },
      { q: 'בנוירון עם ReLU, z = −0.4. מה יקרה בצעד gradient descent?', options: ['המשקלים יגדלו', 'המשקלים יקטנו', 'כלום — f′(z)=0 ולכן כל הגרדיאנטים אפס ("נוירון מת")', 'ה-loss יהפוך לשלילי'], answer: 2, explain: '∂L/∂z = ∂L/∂y · f′(z), ו-ReLU שטוחה מתחת ל-0. לכן GELU/SiLU (חלקות) נפוצות ב-LLM מודרניים. נסו זאת במעבדה 1.' },
      { q: 'מה קורה כש-temperature → 0, ואיך שולטים ב"עומק" במודלי Claude הנוכחיים?', options: ['ההתפלגות משתטחת; temperature=0 בפרמטר', 'בוחרים תמיד את הטוקן הסביר ביותר (greedy); ב-Claude הנוכחי לא שולחים temperature אלא מכוונים עומק עם output_config.effort', 'המודל מפסיק לייצר; max_tokens', 'top-p עולה ל-1; system prompt'], answer: 1, explain: 'חלוקה ב-T קטן מחדדת את ההתפלגות עד argmax. דגמי Claude הנוכחיים דוחים temperature/top_p/top_k; העומק והעלות נשלטים ע״י effort (low…max).' },
      { q: 'למה עברית בדרך כלל "יקרה" יותר בטוקנים?', options: ['כי היא נכתבת מימין לשמאל', 'כי הטוקנייזר למד פחות מיזוגים לעברית (פחות דאטה), אז כל מילה מתפרקת ליותר חלקים', 'כי Claude מתרגם לאנגלית קודם', 'זה לא נכון — תמיד שווה'], answer: 1, explain: 'מיזוגי BPE נלמדים מתדירות בקורפוס. לשפות עם פחות דאטה יש פחות טוקנים "שלמים" → יותר טוקנים לאותו תוכן → יותר עלות ופחות מקום בחלון. מדדו עם count_tokens.' },
      { q: 'מודל קיבל 92% ב-benchmark ציבורי ישן אבל 61% בגרסה מנוסחת מחדש של אותן שאלות. ההסבר הסביר ביותר?', options: ['קוונטיזציה', 'זיהום (contamination) — השאלות המקוריות דלפו לדאטה האימון', 'temperature גבוה מדי', 'חלון הקשר קטן'], answer: 1, explain: 'פער כזה מעיד על שינון. לכן בונים eval פרטי מהדאטה שלכם, שלא פורסם, ומפרידים בין סט כוונון לסט בדיקה.' }
    ]);
  }

  /* =====================================================================
     RTL/bidi fixer (local workaround; core has none): in an RTL page, numeric ranges such as
     "32–120" render reversed ("120–32") and LTR-only strings with neutrals ("d = 4096",
     "messages[]") get scrambled. We wrap such runs in Unicode isolates (LRI…PDI), which works
     for HTML and SVG text alike, and keep watching the page because panels/labs re-render.
     ===================================================================== */
  const HEB = /[֐-׿]/;
  const NUM = '[~≈$]?\\d[\\d.,]*(?:[kKMBGT%]|d(?![A-Za-z_]))?\\+?';
  const RANGE = new RegExp(NUM + '(?:\\s?[–\\-/×]\\s?' + NUM + ')+', 'g');
  const BIDI_SKIP = 'pre,code,textarea,script,style,select,option,.mono,.out,.llm-chip,[dir="ltr"],svg[style*="ltr"]';
  function fixTextNode(node) {
    const t = node.data, par = node.parentNode;
    if (!t || !par || t.indexOf('⁦') >= 0 || !/\S/.test(t)) return;
    if (par.closest && par.closest(BIDI_SKIP)) return;
    const inSvg = par instanceof SVGElement;
    if (!HEB.test(t) && (inSvg ? /[^\sA-Za-z]/.test(t) : /\d/.test(t))) {
      const m = t.match(/^(\s*)([\s\S]*?)(\s*)$/);
      node.data = m[1] + '⁦' + m[2] + '⁩' + m[3];
      return;
    }
    if (HEB.test(t)) { const r = t.replace(RANGE, x => '⁦' + x + '⁩'); if (r !== t) node.data = r; }
  }
  function fixTree(root) {
    if (root.nodeType === 3) return fixTextNode(root);
    if (root.nodeType !== 1) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const list = []; while (w.nextNode()) list.push(w.currentNode);
    list.forEach(fixTextNode);
  }
  function installBidiFix(main) {
    fixTree(main);
    if (typeof MutationObserver === 'undefined') return;
    const mo = new MutationObserver(muts => {
      muts.forEach(m => {
        if (m.type === 'characterData') fixTextNode(m.target);
        else m.addedNodes.forEach(fixTree);
      });
    });
    mo.observe(main, { childList: true, subtree: true, characterData: true });
    LA.onCleanup(() => mo.disconnect());
  }

  /* =====================================================================
     registration
     ===================================================================== */
  LA.register({
    id: 'llm', order: 10, group: 'core', icon: '🧠', short: 'LLM מבפנים', title: 'LLM מבפנים — מטוקן ועד נוירון בודד',
    render(main) {
      LA.page(main, {
        icon: '🧠', title: 'LLM מבפנים — מטוקן ועד נוירון בודד',
        subtitle: 'מהמוצר שאתם מכירים, דרך שרת ההסקה וה-Transformer, ועד <b>נוירון אחד</b> שמכפיל, מחבר ולומד. עם מעבדות שמחשבות באמת: נוירון, טוקנייזר, attention, דגימה, זיכרון ועלות.',
        sections: [
          { id: 'intro', title: 'בשורה אחת + אנלוגיה', render: renderIntro },
          { id: 'dive', title: 'צלילה: מהמוצר ועד הנוירון', render: renderDive },
          { id: 'tok', title: 'טוקנים — מה המודל באמת רואה', render: el => { el.insertAdjacentHTML('beforeend', '<p>לפני שהרשת רואה משהו, הטקסט מפורק ל<b>טוקנים</b> — יחידות של מילה, חלק מילה, סימן או בייט. כל טוקן מקבל מזהה (מספר שלם). זה קובע את <b>העלות</b> (מחייבים לפי טוקן), את <b>המקום בחלון ההקשר</b>, ומסביר טעויות "מוזרות" — המודל לא רואה אותיות בודדות, ולכן ספירת אותיות או היפוך מילה קשים לו.</p>'); tokenizerLab(el); el.insertAdjacentHTML('beforeend', LA.callout('warn', '<p><b>עברית:</b> בטוקנייזרים רבים עברית עולה יותר טוקנים מאנגלית לאותו תוכן (פחות מיזוגים נלמדו לעברית). ההשפעה: עלות גבוהה יותר, פחות תוכן נכנס לחלון, ולעתים זמן תגובה ארוך יותר. <b>מדדו על הדאטה שלכם</b> — אל תסתמכו על "מילים × 1.3".</p>')); } },
          { id: 'neuron', title: 'מעבדה: נוירון בודד שלומד', render: el => { el.insertAdjacentHTML('beforeend', '<p>הנה הרמה הנמוכה ביותר בפעולה. הזיזו קלטים ומשקלים, החליפו אקטיבציה, ולחצו "צעד אימון" כדי לראות את <b>backpropagation</b> ו-<b>gradient descent</b> מחושבים מספר-מספר. נסו: (1) ReLU עם x₂=2 ו-w₂=−1 — נוירון "מת"; (2) η=1.2 — הלוס קופץ; (3) SiLU — הגרדיאנט אף פעם לא בדיוק 0.</p>'); neuronLab(el); } },
          { id: 'attn', title: 'מעבדה: מפת Attention', render: attentionLab },
          { id: 'sample', title: 'מעבדה: דגימת הטוקן הבא', render: el => { samplingLab(el); el.insertAdjacentHTML('beforeend', LA.table(['שיטה', 'מה עושה', 'מתי'], [['Greedy (T=0)', 'תמיד argmax', 'דטרמיניסטי יותר; עלול לחזור על עצמו ולהיתקע בלולאות'], ['Temperature', 'T<1 מחדד, T>1 משטח', 'יצירתיות מול עקביות'], ['Top-k', 'רק k המובילים', 'חוסם "זנב" של טוקנים מוזרים'], ['Top-p (nucleus)', 'הקבוצה הקטנה שמצטברת ל-p', 'מסתגל: מעט מועמדים כשהמודל בטוח, הרבה כשלא']]) + LA.callout('warn', '<p><b>בדגמי Claude הנוכחיים</b> (<code>claude-haiku-5-5</code>, <code>claude-sonnet-5-5</code>, <code>claude-opus-5-5</code>) לא שולחים <code>temperature</code>/<code>top_p</code>/<code>top_k</code> — ה-API דוחה אותם. את "כמה עמוק לחשוב" (וכמה טוקנים לשלם) מכוונים עם <code>output_config={"effort": "low" | "medium" | "high" | "xhigh" | "max"}</code>. עדיין חשוב להבין דגימה: היא מסבירה אי-דטרמיניזם, ותפגשו אותה במודלים פתוחים ובמודלי תמונה.</p>')); } },
          { id: 'gen', title: 'מעבדה: טוקן אחד מקצה לקצה', render: el => { el.insertAdjacentHTML('beforeend', '<p>עכשיו נחבר הכול: עקבו אחרי בקשה אחת מהמשתמש ועד שהמילה הראשונה מופיעה על המסך — ואז הלולאה שמייצרת את השאר. הנקודה הזוהרת מראה איפה הנתונים נמצאים בכל רגע.</p>'); genLab(el); } },
          { id: 'example', title: 'דוגמה מוחשית: בוט חברת החשמל', render: renderExample },
          { id: 'train', title: 'איך מודל נוצר: שלבי האימון', render: renderTraining },
          { id: 'context', title: 'חלון הקשר, KV cache ועלות פלט', render: renderContext },
          { id: 'halluc', title: 'למה מודלים "הוזים"', render: renderHalluc },
          { id: 'embed', title: 'Embeddings מול מודלי יצירה', render: renderEmbed },
          { id: 'tiers', title: 'גודל מודל ובחירת tier', render: renderTiers },
          { id: 'llm', title: 'הקשר ל-LLM — איך שאר הקורס נשען על זה', render: renderLLMLink },
          { id: 'profile', title: 'דרישות · חוזקות · חולשות', render: renderProfile },
          { id: 'algo', title: 'עין של אלגוריתמאי', render: renderAlgo },
          { id: 'quiz', title: 'בוחן', render: renderQuiz }
        ]
      });
      installBidiFix(main);
    }
  });
})();
