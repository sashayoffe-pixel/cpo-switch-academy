/* LLM Academy — module: algorithmist (המדריך לאלגוריתמאי AI — על מה לשים לב)
   Cross-cutting synthesis: role, comparison matrix, stack diagram, evaluation, cost/latency,
   safety, data, observability, pre-production checklist. */
(function () {
  'use strict';
  const h = (...a) => LA.h(...a);
  const esc = s => LA.esc(s);
  const MB = t => LA.modelBadge(t);
  const LS_CHECK = 'la-algorithmist-checklist-v1';

  /* ---------------- small numeric helpers ---------------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pct = (v, d) => (isFinite(v) ? (v * 100).toFixed(d == null ? 1 : d) + '%' : '—');
  const f3 = v => (isFinite(v) ? v.toFixed(3) : '—');
  function money(v) {
    if (!isFinite(v)) return '—';
    if (v >= 1000) return '$' + Math.round(v).toLocaleString('en-US');
    if (v >= 1) return '$' + v.toFixed(2);
    if (v >= 0.01) return '$' + v.toFixed(3);
    return '$' + v.toFixed(5);
  }
  const intFmt = v => Math.round(v).toLocaleString('en-US');
  /* erf — Abramowitz & Stegun 7.1.26 (abs error < 1.5e-7) */
  function erf(x) {
    const s = x < 0 ? -1 : 1; x = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  }
  const Phi = z => 0.5 * (1 + erf(z / Math.SQRT2));
  function wilson(s, n, z) {
    if (!n) return [NaN, NaN];
    const p = s / n, z2 = z * z, den = 1 + z2 / n;
    const c = (p + z2 / (2 * n)) / den, hw = z * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n)) / den;
    return [c - hw, c + hw];
  }
  /* number input row used by several labs */
  function numIn(label, value, onInput, attrs) {
    const inp = h('input', Object.assign({ type: 'number', value, class: 'alg-num' }, attrs || {}));
    inp.addEventListener('input', () => onInput(+inp.value || 0));
    const row = h('label', { class: 'alg-numrow' }, h('span', null, label), inp);
    row.input = inp;
    return row;
  }
  function kpi(label, value, note, cls) {
    return `<div class="alg-kpi ${cls || ''}"><div class="alg-kpi-l">${label}</div><div class="alg-kpi-v">${value}</div>${note ? `<div class="alg-kpi-n">${note}</div>` : ''}</div>`;
  }

  /* ---------------- pricing (approximate list prices, USD per 1M tokens) ---------------- */
  const PRICES = {
    haiku: { in: 0.10, out: 0.50, cache: 0.01, color: '#34d399' },
    sonnet: { in: 2.00, out: 10.00, cache: 0.10, color: '#38bdf8' },
    opus: { in: 4.00, out: 20.00, cache: 0.20, color: '#c4b5fd' }
  };
  function reqCost(tier, tin, tout, hit) {
    const p = PRICES[tier];
    return (tin * (1 - hit) * p.in + tin * hit * p.cache + tout * p.out) / 1e6;
  }

  /* ---------------- comparison matrix data ---------------- */
  const LAYERS = { models: 'מודלים', ui: 'ממשק', cap: 'יכולות', fw: 'Frameworks', agents: 'סוכנים', mlops: 'MLOps' };
  const COLS = [
    { k: 'what', t: 'מה זה' },
    { k: 'layer', t: 'שכבה' },
    { k: 'req', t: 'דרישות' },
    { k: 'str', t: 'חוזקות' },
    { k: 'weak', t: 'חולשות' },
    { k: 'fail', t: 'כשל אופייני' },
    { k: 'metric', t: 'מדד מפתח' }
  ];
  const ROWS = [
    { id: 'llm', icon: '🧠', name: 'LLM', layer: 'models',
      what: 'רשת Transformer שחוזה את הטוקן הבא — המנוע שכל השאר עוטף',
      req: 'גישה ל-API או GPU, חלון context מספק, prompt ברור',
      str: 'כלליות עצומה, few-shot, הבנת שפה טבעית ועברית',
      weak: 'הזיות, ידע קפוא בזמן, עלות לפי טוקן, אי-דטרמיניזם',
      fail: 'תשובה שגויה בביטחון מלא; "lost in the middle" ב-context ארוך',
      metric: 'דיוק על golden set · TTFT · $ ל-1M טוקנים',
      llm: 'זה ה-LLM עצמו. כל הרכיבים האחרים קיימים כדי לתת לו context נכון, כלים, זיכרון ובקרה.' },
    { id: 'chat', icon: '💬', name: 'Chat UI', layer: 'ui',
      what: 'ממשק שיחה: streaming, היסטוריה, ניהול state ומשוב',
      req: 'SSE/WebSocket, ניהול חלון היסטוריה, RTL ו-Markdown תקין',
      str: 'UX טבעי, משוב ישיר מהמשתמש (👍/👎), נגישות',
      weak: 'ציפיות לא מוגדרות, קשה לבדיקה אוטומטית',
      fail: 'היסטוריה מתנפחת → קיטוע/שכחה; markdown שבור בעברית',
      metric: 'TTFT · שיעור 👍 · containment',
      llm: 'הממשק מחליט מה נשלח ל-LLM בכל תור (היסטוריה, system, קבצים) ומזרים טוקנים בחזרה.' },
    { id: 'rag', icon: '📚', name: 'RAG', layer: 'cap',
      what: 'אחזור קטעי מסמכים רלוונטיים והזרקתם ל-prompt',
      req: 'קורפוס נקי, chunking, מודל embeddings, vector DB, הרשאות',
      str: 'ידע עדכני ופרטי, ציטוטים, פחות הזיות',
      weak: 'איכות האחזור = תקרת התשובה; latency; תחזוקת אינדקס',
      fail: 'retrieval miss → תשובה בטוחה ושגויה; chunk שחותך טבלה',
      metric: 'recall@k · MRR · faithfulness',
      llm: 'RAG לא משנה את משקלי המודל — הוא משנה את ה-context. ה-LLM צריך לדעת "להודות שאין מידע".' },
    { id: 'langchain', icon: '🔗', name: 'LangChain', layer: 'fw',
      what: 'ספריית רכיבים: prompts, models, retrievers, parsers, LCEL',
      req: 'Python/JS, הבנת ההפשטות, נעילת גרסאות',
      str: 'מאות אינטגרציות, החלפת מודל בשורה, אב-טיפוס מהיר',
      weak: 'שכבות הפשטה, שינויי API תכופים, debugging קשה',
      fail: 'prompt פנימי "קסום" שלא ראית; תלות שנשברת בשדרוג',
      metric: 'זמן לאב-טיפוס · כיסוי tracing',
      llm: 'עוטף את קריאות ה-LLM בממשק אחיד (ChatAnthropic וכו\') ומחבר אותן לשרשראות.' },
    { id: 'langgraph', icon: '🕸️', name: 'LangGraph', layer: 'fw',
      what: 'תזמור כגרף מצבים: צמתים, קשתות, לולאות, checkpoint, HITL',
      req: 'הגדרת State, צמתים וקשתות; checkpointer; תכנון זרימה',
      str: 'שליטה ודטרמיניזם, resume אחרי קריסה, interrupt לאישור אדם',
      weak: 'עקומת למידה; over-engineering לבעיות פשוטות',
      fail: 'לולאה אינסופית / recursion limit; State שמתנפח',
      metric: 'task success · צעדים למשימה · עלות למשימה',
      llm: 'כל צומת יכול לקרוא למודל אחר — כאן מממשים ניתוב מודלים לפי מורכבות.' },
    { id: 'agents', icon: '🤖', name: 'Agents', layer: 'agents',
      what: 'LLM בלולאה שמחליט בעצמו אילו כלים להפעיל ומתי לעצור',
      req: 'כלים מוגדרים היטב, הרשאות, תקציב צעדים, eval',
      str: 'גמישות, משימות פתוחות רב-שלביות',
      weak: 'יקר, איטי, לא צפוי, קשה להעריך',
      fail: 'שימוש שגוי בכלי, לולאה, פעולה הרסנית, injection מתוצאת כלי',
      metric: 'task success · tool-call accuracy · $ למשימה',
      llm: 'הסוכן הוא LLM + לולאה + כלים. איכות ההחלטות = איכות המודל + תיאורי הכלים.' },
    { id: 'skills', icon: '🧰', name: 'Skills', layer: 'cap',
      what: 'חבילות הוראות+סקריפטים שנטענות רק כשצריך (progressive disclosure)',
      req: 'SKILL.md עם description חד, סקריפטים בדוקים',
      str: 'חיסכון ב-context, שימוש חוזר, מומחיות מקודדת',
      weak: 'תלוי בטריגר נכון של ה-description; תחזוקה',
      fail: 'Skill לא נטען כשצריך — או נטען כשלא צריך',
      metric: 'trigger precision/recall · הצלחה עם/בלי Skill',
      llm: 'רק ה-description נמצא תמיד ב-context; ה-LLM מחליט לטעון את הגוף כשהוא רלוונטי.' },
    { id: 'comfyui', icon: '🎨', name: 'ComfyUI', layer: 'fw',
      what: 'גרף צמתים להרצת מודלי diffusion (תמונה/וידאו)',
      req: 'GPU עם VRAM, checkpoints, workflow JSON',
      str: 'שליטה מלאה, שחזור עם seed, API להרצה אוטומטית',
      weak: 'GPU יקר, ניהול מודלים, עקומת למידה',
      fail: 'OOM ב-VRAM; תוצאות לא עקביות בלי seed קבוע',
      metric: 'העדפה אנושית · CLIP score · שניות לתמונה',
      llm: 'ה-LLM כותב את ה-prompt לדיפוזיה או בונה workflow; ComfyUI מריץ את המודל הוויזואלי.' },
    { id: 'clearml', icon: '📈', name: 'ClearML', layer: 'mlops',
      what: 'MLOps: ניסויים, datasets, pipelines, תורי ריצה, מודלים',
      req: 'שרת (מנוהל/עצמי), agents על מכונות, הרגלי logging',
      str: 'שחזוריות, השוואת ניסויים, אוטומציה של pipelines',
      weak: 'תפעול שרת, overhead ראשוני',
      fail: 'ניסוי בלי גרסת דאטה/prompt → אי אפשר לשחזר תוצאה',
      metric: '% ניסויים משוחזרים · זמן-לניסוי',
      llm: 'עוקב אחרי כל "כפתור" של מערכת ה-LLM: גרסת prompt, embeddings, chunking, תוצאות eval.' }
  ];

  /* ---------------- stack diagram (with drill-down) ---------------- */
  const neuronSpec = {
    title: 'נוירון בודד', width: 760, height: 300,
    intro: '<p>הגענו ליחידה הקטנה ביותר: <b>נוירון</b> אחד בשכבת ה-MLP. מיליארדי כאלה, מוכפלים במטריצות, הם "המוח" של ה-LLM.</p><p><a href="#/llm">למודול ה-LLM — עד הנוירון הבודד ←</a></p>',
    nodes: [
      { id: 'x', x: 640, y: 150, w: 130, label: 'קלט x', sub: 'וקטור d=4096', color: 'data', info: '<p>וקטור הייצוג של הטוקן אחרי ה-attention. כל רכיב הוא מספר עשרוני.</p>' },
      { id: 'w', x: 430, y: 80, w: 130, label: 'w · x + b', sub: 'מכפלה פנימית', color: 'neuron', info: '<p>הנוירון מכפיל כל רכיב בקלט במשקל שנלמד ומחבר: <code>z = Σ wᵢxᵢ + b</code>. המשקלים "קפואים" אחרי האימון — RAG ו-prompting לא משנים אותם.</p>' },
      { id: 'act', x: 430, y: 220, w: 130, label: 'GELU / SwiGLU', sub: 'אי-ליניאריות', color: 'neuron', info: '<p>פונקציית ההפעלה מאפשרת לרשת ללמוד פונקציות לא-ליניאריות. בלעדיה כל הרשת הייתה טרנספורמציה ליניארית אחת.</p>' },
      { id: 'n', x: 200, y: 150, w: 110, h: 110, shape: 'circle', label: 'y', sub: 'פלט הנוירון', color: 'neuron', info: '<p>ערך יחיד שנכנס לשכבה הבאה. כאלגוריתמאי — אינכם מכווננים נוירונים; אבל להבין אותם עוזר להבין למה המודל "יודע" דברים ולמה fine-tuning משנה התנהגות.</p><p><a href="#/llm">צלילה מלאה במודול ה-LLM ←</a></p>' }
    ],
    edges: [{ from: 'x', to: 'w' }, { from: 'w', to: 'act' }, { from: 'act', to: 'n' }]
  };
  const llmSpec = {
    title: 'בתוך ה-LLM', width: 900, height: 300,
    intro: '<p>מסלול טוקן בתוך מודל שפה. לחצו על <b>Transformer block</b> כדי לצלול לשכבה.</p>',
    nodes: [
      { id: 'tok', x: 800, y: 150, w: 130, label: 'Tokenizer', sub: 'טקסט → מזהים', color: 'data', info: '<p>מפרק טקסט לטוקנים. עברית "יקרה" יותר בטוקנים מאנגלית — חשוב לחישובי עלות.</p>' },
      { id: 'emb', x: 630, y: 150, w: 130, label: 'Embedding', sub: 'מזהה → וקטור', color: 'data', info: '<p>טבלת חיפוש שממירה כל טוקן לוקטור. (זה <b>לא</b> מודל ה-embeddings של RAG — שם זה מודל נפרד.)</p>' },
      { id: 'blk', x: 450, y: 150, w: 150, label: 'Transformer ×N', sub: 'attention + MLP', color: 'llm', info: '<p>עשרות בלוקים זהים. כל אחד: self-attention (מי מסתכל על מי) ואז MLP (עיבוד לכל טוקן).</p>',
        children: {
          title: 'Transformer block', width: 900, height: 300,
          nodes: [
            { id: 'ln1', x: 800, y: 150, w: 120, label: 'LayerNorm', color: 'ext', info: '<p>נרמול יציבות לפני ה-attention.</p>' },
            { id: 'att', x: 620, y: 150, w: 150, label: 'Self-Attention', sub: 'Q·Kᵀ → softmax → V', color: 'llm', info: '<p>כל טוקן "שואל" (Q) את כל הטוקנים הקודמים (K) ומקבל ממוצע משוקלל של הערכים (V). כאן נוצר ה-KV cache שעליו מבוסס prompt caching.</p>' },
            { id: 'res', x: 440, y: 150, w: 120, label: 'Residual +', color: 'ext', info: '<p>חיבור שיורי: הקלט מתווסף לפלט — שומר מידע לאורך עשרות שכבות.</p>' },
            { id: 'mlp', x: 250, y: 150, w: 150, label: 'MLP', sub: 'אלפי נוירונים', color: 'neuron', info: '<p>רשת feed-forward לכל טוקן. כאן "מאוחסן" חלק גדול מהידע העובדתי של המודל.</p>', children: neuronSpec }
          ],
          edges: [{ from: 'ln1', to: 'att' }, { from: 'att', to: 'res' }, { from: 'res', to: 'mlp' }]
        } },
      { id: 'head', x: 270, y: 150, w: 130, label: 'LM Head', sub: 'logits', color: 'llm', info: '<p>ממיר את הייצוג האחרון להסתברות לכל טוקן במילון.</p>' },
      { id: 'samp', x: 100, y: 150, w: 120, label: 'Sampling', sub: 'הטוקן הבא', color: 'neuron', info: '<p>בחירת הטוקן הבא. במודלים מתארחים עכשוויים לא שולחים temperature; עומק החשיבה נשלט ע״י <code>output_config.effort</code>.</p>' }
    ],
    edges: [{ from: 'tok', to: 'emb' }, { from: 'emb', to: 'blk' }, { from: 'blk', to: 'head' }, { from: 'head', to: 'samp' }]
  };
  const toolCallSpec = {
    title: 'קריאת כלי בודדת', width: 900, height: 300,
    intro: '<p>האטום של כל סוכן: <b>קריאת כלי אחת</b>. כאן נמצאים רוב הבאגים — ורוב סיכוני האבטחה.</p>',
    nodes: [
      { id: 'schema', x: 810, y: 150, w: 130, label: 'Schema', sub: 'name + JSON', color: 'tool', info: '<p>תיאור הכלי (שם, תיאור, input_schema). התיאור הוא "prompt" לכל דבר — ניסוח עמום = שימוש שגוי.</p>' },
      { id: 'emit', x: 640, y: 150, w: 140, label: 'tool_use', sub: 'המודל מפיק JSON', color: 'llm', info: '<p>המודל מחזיר בלוק <code>tool_use</code> עם קלט. מפרשים תמיד עם <code>json.loads</code>, אף פעם לא בהשוואת מחרוזות.</p>' },
      { id: 'val', x: 470, y: 150, w: 140, label: 'אימות + הרשאה', sub: 'schema · policy', color: 'warn', info: '<p>בדקו schema, טווחי ערכים והרשאות המשתמש <b>בקוד</b>, לא ב-prompt. פעולה בלתי הפיכה → אישור אדם.</p>' },
      { id: 'exec', x: 300, y: 150, w: 130, label: 'הרצה', sub: 'API / DB', color: 'tool', info: '<p>timeout, retries, idempotency key. שגיאה מוחזרת כ-<code>is_error: true</code> — לא נבלעת.</p>' },
      { id: 'res', x: 130, y: 150, w: 140, label: 'tool_result', sub: 'חוזר ל-context', color: 'data', info: '<p>התוצאה נכנסת ל-context. זה ערוץ ל-<b>indirect prompt injection</b>: טקסט מכלי הוא נתון, לא הוראה.</p>' }
    ],
    edges: [{ from: 'schema', to: 'emit' }, { from: 'emit', to: 'val' }, { from: 'val', to: 'exec' }, { from: 'exec', to: 'res' }]
  };
  const STACK = {
    title: 'מפת השכבות', width: 1000, height: 600,
    intro: `<p>כל הנושאים בקורס על מפה אחת: מהתשתית למטה ועד הממשק למעלה, ו-<b>ClearML</b> כ"מסילה" צדדית שחוצה את כל השכבות.</p><p>לחצו על רכיב לקריאה; רכיב עם <b class="dive-ic">⤵</b> אפשר לפתוח עד היחידה הקטנה ביותר.</p>`,
    groups: [
      { x: 140, y: 22, w: 850, h: 76, label: 'ממשק', color: 'ui' },
      { x: 140, y: 117, w: 850, h: 76, label: 'סוכנים', color: 'ctrl' },
      { x: 140, y: 212, w: 850, h: 76, label: 'יכולות', color: 'tool' },
      { x: 140, y: 307, w: 850, h: 76, label: 'Frameworks', color: 'data' },
      { x: 140, y: 402, w: 850, h: 76, label: 'מודלים', color: 'llm' },
      { x: 140, y: 497, w: 850, h: 76, label: 'תשתית', color: 'ext' }
    ],
    nodes: [
      { id: 'chat', x: 620, y: 60, label: "ממשק צ'אט", sub: 'Web · Slack · קול', color: 'ui',
        info: '<p>נקודת המגע עם המשתמש. אחראי על streaming, היסטוריה, הצגת ציטוטים ואיסוף משוב.</p><p><a href="#/chat">למודול Chat ←</a></p>',
        children: {
          title: 'מבנה ממשק צ׳אט', width: 900, height: 280,
          nodes: [
            { id: 'w', x: 800, y: 140, w: 130, label: 'Widget', sub: 'דפדפן', color: 'ui', info: '<p>רכיב הלקוח: מציג טוקנים בזמן אמת, RTL, כפתורי משוב.</p>' },
            { id: 'sse', x: 620, y: 140, w: 130, label: 'SSE stream', sub: 'טוקן-טוקן', color: 'data', info: '<p>Server-Sent Events: TTFT נמוך מרגיש מהיר גם כשהתשובה ארוכה.</p>' },
            { id: 'sess', x: 440, y: 140, w: 130, label: 'Session API', sub: 'backend', color: 'ctrl', info: '<p>מזהה שיחה, אימות משתמש, rate limit.</p>' },
            { id: 'hist', x: 260, y: 80, w: 130, label: 'היסטוריה', sub: 'DB', shape: 'db', h: 66, color: 'store', info: '<p>כל התורות. לא הכל נשלח למודל — רק מה שנבחר.</p>' },
            { id: 'ctx', x: 260, y: 210, w: 140, label: 'Context builder', sub: 'מה נשלח ל-LLM', color: 'llm', info: '<p>בונה את ה-prompt: system קבוע (נשמר ב-cache), סיכום היסטוריה, מסמכים, שאלה. כאן חוסכים או מבזבזים כסף.</p>' }
          ],
          edges: [{ from: 'w', to: 'sse', both: true }, { from: 'sse', to: 'sess', both: true }, { from: 'sess', to: 'hist' }, { from: 'sess', to: 'ctx' }]
        } },
      { id: 'agent', x: 700, y: 155, label: 'סוכן מתזמר', sub: 'orchestrator', color: 'ctrl',
        info: `<p>מקבל מטרה, מתכנן ומחליט אילו יכולות להפעיל. מתאים ל-${MB('opus')} כשהתכנון מורכב, או ${MB('sonnet')} לעבודה יומיומית.</p><p><a href="#/agents">למודול Agents ←</a></p>`,
        children: {
          title: 'לולאת הסוכן', width: 900, height: 320,
          intro: '<p>לולאת ReAct: חשוב → פעל → צפה → חזור. לחצו על <b>tool_use</b> כדי לצלול לקריאת כלי בודדת.</p>',
          nodes: [
            { id: 'goal', x: 810, y: 160, w: 120, label: 'מטרה', sub: 'מהמשתמש', color: 'ui', info: '<p>בקשת המשתמש + system prompt + כלים זמינים.</p>' },
            { id: 'think', x: 620, y: 160, w: 140, h: 70, shape: 'diamond', label: 'חשוב', sub: 'LLM', color: 'llm', info: '<p>המודל מחליט: לענות או להפעיל כלי. <code>stop_reason</code> אומר מה קרה.</p>' },
            { id: 'act', x: 420, y: 80, w: 140, label: 'tool_use', sub: 'פעולה', color: 'tool', info: '<p>הקריאה לכלי — האטום של כל סוכן.</p>', children: toolCallSpec },
            { id: 'obs', x: 420, y: 240, w: 140, label: 'tool_result', sub: 'תצפית', color: 'data', info: '<p>התוצאה חוזרת לשיחה והלולאה ממשיכה. ספרו צעדים — תקציב צעדים מונע לולאות אינסופיות.</p>' },
            { id: 'done', x: 160, y: 160, w: 120, shape: 'round', label: 'תשובה', sub: 'end_turn', color: 'ok', info: '<p>כשאין עוד קריאות כלים — תשובה סופית.</p>' }
          ],
          edges: [{ from: 'goal', to: 'think' }, { from: 'think', to: 'act', label: 'כלי' }, { from: 'act', to: 'obs', dashed: true }, { from: 'obs', to: 'think', bend: -30 }, { from: 'think', to: 'done', label: 'סיום' }]
        } },
      { id: 'sub', x: 450, y: 155, label: 'תתי-סוכנים', sub: 'workers', color: 'ctrl',
        info: `<p>סוכנים ממוקדים שמקבלים תת-משימה ו-context נקי. לרוב ${MB('sonnet')} או ${MB('haiku')} לעבודה קריאה-כבדה — זול ומקבילי.</p><p><a href="#/agents">ניתוב תתי-סוכנים ←</a></p>` },
      { id: 'rag', x: 790, y: 250, label: 'RAG', sub: 'אחזור ידע', color: 'tool',
        info: '<p>מביא ידע פרטי ועדכני לתוך ה-context.</p><p><a href="#/rag">למודול RAG ←</a></p>',
        children: {
          title: 'צינור RAG', width: 900, height: 330,
          groups: [{ x: 20, y: 20, w: 860, h: 120, label: 'אופליין (אינדוקס)', color: 'store' }, { x: 20, y: 180, w: 860, h: 130, label: 'אונליין (שאילתה)', color: 'llm' }],
          nodes: [
            { id: 'ing', x: 700, y: 85, w: 120, label: 'Ingest', sub: 'PDF/HTML', color: 'data', info: '<p>ניקוי, OCR, הסרת כפילויות, metadata (תאריך, הרשאות).</p>' },
            { id: 'chk', x: 540, y: 85, w: 120, label: 'Chunking', sub: '300-800 טוקן', color: 'data', info: '<p>חיתוך לפי מבנה (כותרות, טבלאות) עדיף על חיתוך עיוור.</p>' },
            { id: 'emb', x: 380, y: 85, w: 120, label: 'Embed', sub: 'וקטורים', color: 'llm', info: '<p>מודל embeddings רב-לשוני. החלפת מודל = אינדוקס מחדש.</p>' },
            { id: 'idx', x: 200, y: 85, w: 120, h: 62, shape: 'db', label: 'Vector DB', color: 'store', info: '<p>HNSW/IVF + metadata לסינון והרשאות.</p>' },
            { id: 'q', x: 770, y: 250, w: 110, label: 'שאילתה', color: 'ui', info: '<p>אפשר לשכתב אותה (query rewrite) עם ' + MB('haiku') + '.</p>' },
            { id: 'ret', x: 600, y: 250, w: 130, label: 'Retrieve', sub: 'top-k', color: 'tool', info: '<p>אחזור המועמדים. לחצו לצלילה.</p>',
              children: {
                title: 'אחזור בודד', width: 900, height: 260,
                nodes: [
                  { id: 'qe', x: 790, y: 130, w: 130, label: 'Query → וקטור', sub: 'd=1024', color: 'llm', info: '<p>אותו מודל embeddings כמו באינדוקס — אחרת המרחבים לא תואמים.</p>' },
                  { id: 'ann', x: 600, y: 130, w: 140, label: 'ANN search', sub: 'HNSW', color: 'store', info: '<p>חיפוש שכנים קרובים בקירוב: מהיר מאוד, אבל recall לא 100%. פרמטר <code>ef_search</code> מחליף latency ב-recall.</p>' },
                  { id: 'flt', x: 410, y: 130, w: 140, label: 'סינון הרשאות', sub: 'ACL metadata', color: 'warn', info: '<p><b>לפני</b> שהקטע מגיע ל-LLM! מסמך שהמשתמש לא מורשה לראות לא נכנס ל-context.</p>' },
                  { id: 'topk', x: 220, y: 130, w: 130, label: 'Top-k', sub: 'קטעים + ציון', color: 'data', info: '<p>הפלט: k קטעים עם ציון דמיון. כאן מודדים recall@k.</p>' }
                ],
                edges: [{ from: 'qe', to: 'ann' }, { from: 'ann', to: 'flt' }, { from: 'flt', to: 'topk' }]
              } },
            { id: 'rr', x: 430, y: 250, w: 120, label: 'Rerank', sub: 'cross-encoder', color: 'tool', info: '<p>מדרג מחדש 50 מועמדים ל-5 הטובים. משפר precision משמעותית.</p>' },
            { id: 'gen', x: 250, y: 250, w: 130, label: 'Generate', sub: 'LLM + ציטוטים', color: 'llm', info: '<p>' + MB('sonnet') + ' עונה רק מתוך הקטעים, עם ציטוטים. כאן מודדים faithfulness.</p>' }
          ],
          edges: [{ from: 'ing', to: 'chk' }, { from: 'chk', to: 'emb' }, { from: 'emb', to: 'idx' }, { from: 'q', to: 'ret' }, { from: 'ret', to: 'rr' }, { from: 'rr', to: 'gen' }, { from: 'idx', to: 'ret', dashed: true }]
        } },
      { id: 'tools', x: 620, y: 250, label: 'כלים / APIs', sub: 'function calling', color: 'tool',
        info: '<p>פונקציות שהמודל יכול להפעיל: DB, CRM, חיפוש, קוד. כל כלי = משטח תקיפה.</p><p><a href="#/agents">כלים בסוכנים ←</a></p>', children: toolCallSpec },
      { id: 'skills', x: 450, y: 250, label: 'Skills', sub: 'ידע ארוז', color: 'tool',
        info: '<p>הוראות + סקריפטים שנטענים לפי צורך.</p><p><a href="#/skills">למודול Skills ←</a></p>',
        children: {
          title: 'טעינה הדרגתית של Skill', width: 900, height: 240,
          nodes: [
            { id: 'meta', x: 760, y: 120, w: 170, label: 'name + description', sub: 'תמיד ב-context (~100 טוקן)', color: 'tool', info: '<p>זה מה שהמודל רואה כדי להחליט. description עמום = טריגר שגוי.</p>' },
            { id: 'body', x: 470, y: 120, w: 170, label: 'גוף SKILL.md', sub: 'נטען כשרלוונטי', color: 'llm', info: '<p>ההוראות המלאות — נטענות רק כשהמודל החליט שה-Skill רלוונטי.</p>' },
            { id: 'res', x: 180, y: 120, w: 170, label: 'סקריפטים ומשאבים', sub: 'לפי דרישה', color: 'data', info: '<p>קבצים וקוד שרצים רק אם צריך — לא צורכים context בכלל עד אז.</p>' }
          ],
          edges: [{ from: 'meta', to: 'body', label: 'טריגר' }, { from: 'body', to: 'res', label: 'צורך' }]
        } },
      { id: 'mcp', x: 280, y: 250, label: 'MCP', sub: 'פרוטוקול כלים', color: 'tool',
        info: '<p>Model Context Protocol: תקן לחיבור כלים, משאבים ו-prompts משרתים חיצוניים לכל סוכן.</p><p><a href="#/agents">MCP במודול הסוכנים ←</a></p>',
        children: {
          title: 'MCP', width: 900, height: 240,
          nodes: [
            { id: 'host', x: 760, y: 120, w: 150, label: 'Host / Client', sub: 'האפליקציה', color: 'ctrl', info: '<p>האפליקציה שמריצה את ה-LLM ומתחברת לשרתים.</p>' },
            { id: 'srv', x: 470, y: 120, w: 150, label: 'MCP Server', sub: 'stdio / HTTP', color: 'tool', info: '<p>חושף tools, resources, prompts. אמתו מקור ונעלו גרסאות — שרת זדוני = injection.</p>' },
            { id: 'sys', x: 180, y: 120, w: 150, label: 'מערכת יעד', sub: 'Jira, DB, Drive', color: 'ext', info: '<p>המערכת האמיתית שמאחורי השרת.</p>' }
          ],
          edges: [{ from: 'host', to: 'srv', both: true }, { from: 'srv', to: 'sys', both: true }]
        } },
      { id: 'langchain', x: 790, y: 345, label: 'LangChain', sub: 'רכיבים', color: 'data',
        info: '<p>ספריית אבני בניין: מודלים, prompts, retrievers, parsers.</p><p><a href="#/langchain">למודול LangChain ←</a></p>' },
      { id: 'langgraph', x: 560, y: 345, label: 'LangGraph', sub: 'תזמור כגרף', color: 'data',
        info: '<p>מריץ סוכנים וזרימות כגרף מצבים עם checkpoint ו-interrupt. כאן קובעים מודל לכל צומת.</p><p><a href="#/langgraph">למודול LangGraph ←</a></p>',
        children: {
          title: 'גרף LangGraph', width: 900, height: 300,
          nodes: [
            { id: 's', x: 820, y: 150, w: 90, shape: 'round', label: 'START', color: 'ext', info: '<p>נקודת כניסה.</p>' },
            { id: 'r', x: 650, y: 150, w: 130, h: 70, shape: 'diamond', label: 'Router', sub: 'Haiku', color: 'llm', info: '<p>' + MB('haiku') + ' מסווג כוונה — זול ומהיר. <code>add_conditional_edges</code>.</p>' },
            { id: 'a', x: 430, y: 70, w: 130, label: 'RAG node', sub: 'Sonnet', color: 'tool', info: '<p>' + MB('sonnet') + ' עונה מתוך מסמכים.</p>' },
            { id: 'b', x: 430, y: 230, w: 130, label: 'Planner', sub: 'Opus', color: 'ctrl', info: '<p>' + MB('opus') + ' רק למקרים מורכבים.</p>' },
            { id: 'cp', x: 650, y: 265, w: 120, h: 50, shape: 'db', label: 'Checkpointer', color: 'store', info: '<p>שומר State אחרי כל צעד — מאפשר resume ו-interrupt.</p>' },
            { id: 'e', x: 200, y: 150, w: 90, shape: 'round', label: 'END', color: 'ok', info: '<p>סיום.</p>' }
          ],
          edges: [{ from: 's', to: 'r' }, { from: 'r', to: 'a', label: 'faq' }, { from: 'r', to: 'b', label: 'complex' }, { from: 'a', to: 'e' }, { from: 'b', to: 'e' }, { from: 'r', to: 'cp', dashed: true }]
        } },
      { id: 'comfyui', x: 280, y: 345, label: 'ComfyUI', sub: 'גרף diffusion', color: 'data',
        info: '<p>מריץ workflows של מודלי תמונה דרך API.</p><p><a href="#/comfyui">למודול ComfyUI ←</a></p>',
        children: {
          title: 'Workflow בסיסי', width: 900, height: 260,
          nodes: [
            { id: 'ck', x: 800, y: 130, w: 130, label: 'Load Checkpoint', color: 'store', info: '<p>טוען UNet + CLIP + VAE.</p>' },
            { id: 'clip', x: 630, y: 130, w: 130, label: 'CLIP Encode', sub: 'prompt', color: 'llm', info: '<p>הופך את הטקסט (שה-LLM כתב) לוקטור התניה.</p>' },
            { id: 'ks', x: 450, y: 130, w: 130, label: 'KSampler', sub: 'seed · steps', color: 'neuron', info: '<p>לולאת denoising: בכל צעד ה-UNet חוזה רעש ומחסיר אותו. seed קבוע = שחזוריות.</p>' },
            { id: 'vae', x: 280, y: 130, w: 120, label: 'VAE Decode', color: 'data', info: '<p>מ-latent לפיקסלים.</p>' },
            { id: 'save', x: 120, y: 130, w: 110, label: 'Save Image', color: 'ok', info: '<p>הפלט.</p>' }
          ],
          edges: [{ from: 'ck', to: 'clip' }, { from: 'clip', to: 'ks' }, { from: 'ks', to: 'vae' }, { from: 'vae', to: 'save' }]
        } },
      { id: 'llm', x: 720, y: 440, label: 'LLM', sub: 'Haiku · Sonnet · Opus', color: 'llm', w: 170,
        info: `<p>המנוע. בחרו tier לפי משימה: ${MB('haiku')} ${MB('sonnet')} ${MB('opus')}</p><p><a href="#/llm">למודול LLM ←</a></p>`, children: llmSpec },
      { id: 'emb', x: 480, y: 440, label: 'Embeddings', sub: 'טקסט → וקטור', color: 'llm',
        info: '<p>מודל נפרד (לא Claude) שממיר טקסט לוקטור לחיפוש סמנטי. בחירתו משפיעה ישירות על recall.</p><p><a href="#/rag">embeddings ב-RAG ←</a></p>' },
      { id: 'diff', x: 280, y: 440, label: 'Diffusion', sub: 'תמונה / וידאו', color: 'llm',
        info: '<p>מודלי דיפוזיה (SDXL, Flux וכו׳) — ComfyUI מריץ אותם.</p><p><a href="#/comfyui">ComfyUI ←</a></p>' },
      { id: 'gpu', x: 540, y: 535, w: 560, label: 'GPU / Serving', sub: 'API מנוהל · vLLM · batching · KV cache', color: 'ext',
        info: '<p>מאיפה מגיע החישוב: API מנוהל (Anthropic) או שרת עצמי ל-embeddings/diffusion.</p>',
        children: {
          title: 'שרת inference', width: 900, height: 260,
          nodes: [
            { id: 'q', x: 790, y: 130, w: 130, label: 'תור בקשות', color: 'ctrl', info: '<p>בקשות נכנסות; rate limits ו-429.</p>' },
            { id: 'bat', x: 610, y: 130, w: 140, label: 'Continuous batching', color: 'tool', info: '<p>מאחד בקשות לניצול GPU מרבי.</p>' },
            { id: 'pre', x: 430, y: 130, w: 120, label: 'Prefill', sub: 'קלט במקביל', color: 'llm', info: '<p>עיבוד ה-prompt כולו — קובע את ה-TTFT. prompt caching חוסך בדיוק את השלב הזה.</p>' },
            { id: 'dec', x: 260, y: 130, w: 120, label: 'Decode', sub: 'טוקן-טוקן', color: 'llm', info: '<p>יצירה סדרתית — קובעת tokens/sec. פלט ארוך = איטי ויקר (פלט יקר פי 5 מקלט).</p>' },
            { id: 'kv', x: 345, y: 220, w: 120, h: 50, shape: 'db', label: 'KV cache', color: 'store', info: '<p>זיכרון ה-attention של טוקנים קודמים.</p>' }
          ],
          edges: [{ from: 'q', to: 'bat' }, { from: 'bat', to: 'pre' }, { from: 'pre', to: 'dec' }, { from: 'pre', to: 'kv', dashed: true }, { from: 'kv', to: 'dec', dashed: true }]
        } },
      { id: 'clearml', x: 70, y: 300, w: 100, h: 540, label: 'ClearML', sub: 'MLOps', color: 'store',
        info: '<p>מסילה צדדית לכל השכבות: מעקב ניסויים (prompts, chunking, embeddings), גרסאות datasets, pipelines לילתיים ותורי GPU.</p><p><a href="#/clearml">למודול ClearML ←</a></p>',
        children: {
          title: 'רכיבי ClearML', width: 900, height: 260,
          nodes: [
            { id: 't', x: 790, y: 80, w: 130, label: 'Task', sub: 'ניסוי', color: 'store', info: '<p><code>Task.init()</code> — לוכד קוד, פרמטרים, מדדים.</p>' },
            { id: 'd', x: 790, y: 190, w: 130, label: 'Dataset', sub: 'גרסאות', color: 'data', info: '<p>גרסאות immutable של קורפוס ו-eval set.</p>' },
            { id: 'p', x: 520, y: 135, w: 140, label: 'Pipeline', sub: 'DAG של שלבים', color: 'ctrl', info: '<p>re-index → eval → דוח, אוטומטית.</p>' },
            { id: 'q', x: 260, y: 80, w: 130, label: 'Queue + Agent', sub: 'מכונות GPU', color: 'tool', info: '<p>clearml-agent מושך משימות מהתור ומריץ.</p>' },
            { id: 'm', x: 260, y: 190, w: 130, label: 'Model Registry', color: 'llm', info: '<p>מודלים מאומנים (embeddings, LoRA) עם lineage.</p>' }
          ],
          edges: [{ from: 't', to: 'p' }, { from: 'd', to: 'p' }, { from: 'p', to: 'q' }, { from: 'p', to: 'm' }]
        } }
    ],
    edges: [
      { from: 'chat', to: 'agent', label: 'בקשה' },
      { from: 'agent', to: 'sub', label: 'מאציל' },
      { from: 'agent', to: 'rag' }, { from: 'agent', to: 'tools' }, { from: 'agent', to: 'skills' },
      { from: 'sub', to: 'mcp' },
      { from: 'rag', to: 'langchain', dashed: true },
      { from: 'langchain', to: 'llm' }, { from: 'langgraph', to: 'llm' },
      { from: 'comfyui', to: 'diff' },
      { from: 'llm', to: 'gpu' }, { from: 'emb', to: 'gpu' }, { from: 'diff', to: 'gpu' },
      { from: 'clearml', to: 'comfyui', dashed: true, color: 'store' },
      { from: 'clearml', to: 'diff', dashed: true, color: 'store' },
      { from: 'clearml', to: 'mcp', dashed: true, color: 'store' }
    ]
  };
