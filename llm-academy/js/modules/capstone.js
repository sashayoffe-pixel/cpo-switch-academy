/* LLM Academy — module: capstone (פרויקט מסכם — מערכת אחת שמחברת הכל)
   "נגה" — AI customer-support assistant for a fictional Israeli electricity supplier ("זרם+").
   Uses every topic: Chat UI, LangGraph, Agents, Skills, RAG, LangChain, ComfyUI, ClearML, model routing. */
(function () {
  'use strict';
  const h = (...a) => LA.h(...a);
  const esc = s => LA.esc(s);
  const MB = t => LA.modelBadge(t);

  /* ---------------- pricing (approximate list prices, USD / 1M tokens) ---------------- */
  const PRICES = {
    haiku: { in: 0.10, out: 0.50, cache: 0.01, color: '#34d399', name: 'Haiku' },
    sonnet: { in: 2.00, out: 10.00, cache: 0.10, color: '#38bdf8', name: 'Sonnet' },
    opus: { in: 4.00, out: 20.00, cache: 0.20, color: '#c4b5fd', name: 'Opus' }
  };
  const GPU_IMAGE_COST = 0.004; // est. self-hosted GPU cost per ComfyUI render (A10G-class, ~6s)
  function callCost(tier, tin, tout, hit) {
    if (!tier) return 0;
    const p = PRICES[tier];
    return (tin * (1 - (hit || 0)) * p.in + tin * (hit || 0) * p.cache + tout * p.out) / 1e6;
  }
  function money(v) {
    if (!isFinite(v)) return '—';
    if (v >= 100) return '$' + Math.round(v).toLocaleString('en-US');
    if (v >= 1) return '$' + v.toFixed(2);
    if (v >= 0.01) return '$' + v.toFixed(4);
    return '$' + v.toFixed(5);
  }
  const intFmt = v => Math.round(v).toLocaleString('en-US');
  const pct = (v, d) => (isFinite(v) ? (v * 100).toFixed(d == null ? 1 : d) + '%' : '—');
  function kpi(label, value, note, cls) {
    return `<div class="cap-kpi ${cls || ''}"><div class="cap-kpi-l">${label}</div><div class="cap-kpi-v">${value}</div>${note ? `<div class="cap-kpi-n">${note}</div>` : ''}</div>`;
  }

  /* ---------------- model routing table ---------------- */
  // calls = average calls per conversation (avg conversation = 3 user turns; mix: 70% FAQ, 25% account, 5% escalation)
  const ROUTING = [
    { id: 'guard_in', step: 'שומר קלט', sub: 'injection + PII', tier: 'haiku', tin: 600, tout: 20, hit: 0.7, calls: 3,
      why: 'סיווג בינארי בנפח מלא (כל הודעה). צריך להיות מהיר (<300ms) וזול; regex משלים להסתרת PII.' },
    { id: 'router', step: 'מנתב כוונות', sub: 'intent router', tier: 'haiku', tin: 900, tout: 30, hit: 0.6, calls: 3,
      why: 'סיווג ל-4 מחלקות עם ביטחון. F1 של Haiku על ה-golden set: 0.94 — Sonnet הוסיף 0.01 בפי 20 מחיר.' },
    { id: 'rewrite', step: 'שכתוב שאילתה', sub: 'query rewrite', tier: 'haiku', tin: 500, tout: 60, hit: 0.5, calls: 2,
      why: 'הופך "ומה עם הקודם?" לשאילתת חיפוש עצמאית. משימה לשונית קצרה.' },
    { id: 'rag', step: 'תשובת RAG', sub: 'policy answer', tier: 'sonnet', tin: 4500, tout: 350, hit: 0.65, calls: 2,
      why: 'תשובה בעברית מתוך מסמכי מדיניות עם ציטוטים. דורש הבנת ניואנסים וחריגים; Haiku נכשל ב-9% יותר בשאלות "חריג בתוך חריג".' },
    { id: 'ground', step: 'בודק groundedness', sub: 'faithfulness check', tier: 'haiku', tin: 2500, tout: 40, hit: 0.0, calls: 2,
      why: 'שאלה סגורה: "האם כל טענה נתמכת בקטעים?". זול מספיק להריץ על כל תשובה.' },
    { id: 'agent', step: 'סוכן חשבון', sub: 'tools loop · צעד', tier: 'sonnet', tin: 3800, tout: 260, hit: 0.7, calls: 1.0,
      why: 'בחירת כלים (get_bill, open_ticket, request_refund) והסקה על נתוני חשבון. ~4 צעדים בשיחת חשבון × 25% מהשיחות.' },
    { id: 'skill', step: 'Skill: הסבר חשבון', sub: 'hebrew-bill-explainer', tier: 'sonnet', tin: 1800, tout: 420, hit: 0.3, calls: 0.3,
      why: 'רץ בתוך הסוכן (אותו מודל); הטוקנים כאן הם תוספת ה-Skill שנטען רק כשצריך.' },
    { id: 'diff', step: 'כותב prompt ויזואלי', sub: 'ל-ComfyUI', tier: 'haiku', tin: 800, tout: 120, hit: 0.5, calls: 0.12, gpu: true,
      why: 'ממיר סיכום חשבון (ללא PII) ל-prompt לדיפוזיה. משימת ניסוח קצרה. + עלות GPU לתמונה.' },
    { id: 'planner', step: 'מתכנן הסלמה', sub: 'escalation planner', tier: 'opus', tin: 9000, tout: 1200, hit: 0.3, calls: 0.1,
      why: 'תיקים מרובי-בעיות: פירוק, סדרי עדיפויות, זיהוי דחיפות (ציוד רפואי!), סינתזה. כאן טעות יקרה — מצדיק את המודל החזק. 5% מהשיחות × 2 קריאות.' },
    { id: 'workers', step: 'תתי-סוכנים', sub: 'workers × 3', tier: 'sonnet', tin: 4000, tout: 400, hit: 0.5, calls: 0.15,
      why: 'כל worker חוקר בעיה אחת עם כלים/RAG ב-context נקי. Sonnet מספיק כי התכנון כבר נעשה.' },
    { id: 'handoff', step: 'סיכום לנציג', sub: 'handoff summary', tier: 'haiku', tin: 3000, tout: 250, hit: 0.0, calls: 0.08,
      why: 'סיכום מובנה לנציג אנושי (מה נבדק, מה הוצע). חילוץ וסיכום — Haiku.' },
    { id: 'judge', step: 'שופט eval (אופליין)', sub: 'דגימה 2% בלילה', tier: 'opus', tin: 3500, tout: 200, hit: 0.4, calls: 0.02,
      why: 'שופט מ-tier שונה מהמודל הנבחן (מפחית self-preference), על תיקים קשים בדגימה. Batch API בלילה (חצי מחיר — לא מחושב כאן).' }
  ];

  /* ---------------- architecture spec with deep drill-down ---------------- */
  const neuronSpec = {
    title: 'נוירון בודד', width: 800, height: 280,
    intro: '<p>היחידה הקטנה ביותר במערכת כולה: נוירון אחד בשכבת MLP של ה-Transformer. כל טוקן שהמערכת מפיקה — כל "{" ב-JSON של קריאת כלי, כל מילה בתשובה — עובר דרך מיליארדי חישובים כאלה.</p><p><a href="#/llm">למודול ה-LLM — צלילה מלאה עד הנוירון ←</a></p>',
    nodes: [
      { id: 'x', x: 680, y: 140, w: 140, label: 'קלט x', sub: 'וקטור הטוקן', color: 'data', info: '<p>הייצוג של הטוקן הנוכחי אחרי ה-attention — "מה ידוע עד עכשיו".</p>' },
      { id: 'z', x: 480, y: 140, w: 140, label: 'z = w·x + b', sub: 'סכום משוקלל', color: 'neuron', info: '<p>משקלים שנלמדו באימון. Prompt, RAG ו-Skills <b>לא</b> משנים אותם — רק את x.</p>' },
      { id: 'a', x: 290, y: 140, w: 130, label: 'GELU(z)', sub: 'הפעלה', color: 'neuron', info: '<p>אי-ליניאריות שמאפשרת לרשת לייצג תבניות מורכבות.</p>' },
      { id: 'y', x: 110, y: 140, w: 100, h: 100, shape: 'circle', label: 'y', sub: 'פלט', color: 'neuron', info: '<p>ערך אחד שנכנס לשכבה הבאה. <a href="#/llm">חזרה למודול ה-LLM ←</a></p>' }
    ],
    edges: [{ from: 'x', to: 'z' }, { from: 'z', to: 'a' }, { from: 'a', to: 'y' }]
  };
  const tokenSpec = {
    title: 'יצירת טוקן', width: 900, height: 260,
    intro: '<p>ה-JSON של קריאת הכלי נוצר <b>טוקן אחר טוקן</b>. כל טוקן = מעבר אחד דרך כל שכבות המודל.</p>',
    nodes: [
      { id: 'ctx', x: 800, y: 130, w: 140, label: 'Context', sub: 'system+כלים+שיחה', color: 'data', info: '<p>כל מה שהמודל רואה. 3,800 טוקנים בממוצע בצעד סוכן; 70% מהם מה-cache.</p>' },
      { id: 'layers', x: 600, y: 130, w: 150, label: 'שכבות ×N', sub: 'attention + MLP', color: 'llm', info: '<p>עשרות בלוקי Transformer. לחצו לצלילה לנוירון בודד בתוך ה-MLP.</p>', children: neuronSpec },
      { id: 'logits', x: 400, y: 130, w: 130, label: 'Logits', sub: 'הסתברות לטוקן', color: 'llm', info: '<p>ציון לכל טוקן במילון. במצב tool_use עם <code>strict: true</code>, הפלט מוגבל ל-JSON תקין לפי ה-schema.</p>' },
      { id: 'tok', x: 200, y: 130, w: 150, label: '"account_id"', sub: 'הטוקן הבא', color: 'neuron', info: '<p>הטוקן נבחר, מתווסף ל-context, והתהליך חוזר עד סוף ה-JSON.</p>' }
    ],
    edges: [{ from: 'ctx', to: 'layers' }, { from: 'layers', to: 'logits' }, { from: 'logits', to: 'tok' }, { from: 'tok', to: 'ctx', bend: 60, dashed: true, label: 'חוזר' }]
  };
  const toolCallSpec = {
    title: 'קריאת כלי: get_bill', width: 940, height: 300,
    intro: '<p>קריאת כלי בודדת של סוכן החשבון — <code>get_bill(account_id, month)</code>. לחצו על <b>tool_use</b> כדי לראות איך המודל "כותב" אותה, עד הנוירון.</p>',
    nodes: [
      { id: 'sch', x: 850, y: 150, w: 130, label: 'Schema', sub: 'get_bill', color: 'tool', info: '<p><code>{"account_id": str, "month": "YYYY-MM"}</code> + תיאור: "מחזיר פירוט חשבון. השתמש כשהלקוח שואל על סכום/שורה בחשבון."</p>' },
      { id: 'tu', x: 680, y: 150, w: 140, label: 'tool_use', sub: 'JSON מהמודל', color: 'llm', info: `<p>${MB('sonnet')} מפיק בלוק tool_use. כאן נמצא ה-LLM בתוך הקריאה.</p>`, children: tokenSpec },
      { id: 'val', x: 510, y: 150, w: 150, label: 'אימות והרשאה', sub: 'policy gate', color: 'warn', info: '<p>בקוד: account_id שייך למשתמש המחובר? month בטווח 24 חודשים? אחרת — <code>is_error</code>. המודל לא מחליט על הרשאות.</p>' },
      { id: 'http', x: 340, y: 150, w: 140, label: 'Billing API', sub: 'timeout 3s', color: 'tool', info: '<p>קריאה למערכת החיוב. retry עם backoff; שגיאה מוחזרת כטקסט ברור למודל.</p>' },
      { id: 'res', x: 160, y: 150, w: 150, label: 'tool_result', sub: 'JSON מסונן', color: 'data', info: '<p>רק השדות הנחוצים (בלי ת״ז, בלי כתובת מלאה) — מזעור PII ב-context. התוצאה היא <b>נתון</b>, לא הוראה.</p>' }
    ],
    edges: [{ from: 'sch', to: 'tu' }, { from: 'tu', to: 'val' }, { from: 'val', to: 'http' }, { from: 'http', to: 'res' }]
  };
  const retrievalSpec = {
    title: 'אחזור בודד', width: 940, height: 280,
    intro: '<p>אחזור אחד לשאלה "מה קורה לחשבון כשעוברים דירה באמצע החודש?"</p>',
    nodes: [
      { id: 'q', x: 860, y: 140, w: 120, label: 'שאילתה', sub: 'אחרי שכתוב', color: 'ui', info: `<p>${MB('haiku')} שכתב: "חיוב יחסי מעבר דירה אמצע מחזור חיוב".</p>` },
      { id: 'emb', x: 700, y: 140, w: 140, label: 'e5 embedding', sub: 'Transformer קטן', color: 'llm', info: '<p>גם מודל ה-embeddings הוא Transformer — ממיר את השאילתה לוקטור 1024. לחצו לצלילה לנוירון.</p>', children: neuronSpec },
      { id: 'hy', x: 540, y: 140, w: 140, label: 'Hybrid search', sub: 'dense + BM25', color: 'store', info: '<p>dense תופס משמעות; BM25 תופס קודי תעריף ומספרים ("תעריף 2-B"). מאוחדים ב-RRF. <b>סינון ACL</b> לפי סגמנט הלקוח כבר כאן.</p>' },
      { id: 'rr', x: 380, y: 140, w: 130, label: 'Rerank', sub: '30 → 5', color: 'tool', info: '<p>cross-encoder רב-לשוני מדרג מחדש. הוסיף +11 נק׳ ל-recall@5 ב-eval.</p>' },
      { id: 'ctx', x: 200, y: 140, w: 160, label: '5 קטעים + מקור', sub: 'pol-112 §3 …', color: 'data', info: '<p>הקטעים עטופים בתגיות &lt;document&gt; עם מזהה — כדי לאפשר ציטוט ולסמן אותם כ"מידע, לא הוראות".</p>' }
    ],
    edges: [{ from: 'q', to: 'emb' }, { from: 'emb', to: 'hy' }, { from: 'hy', to: 'rr' }, { from: 'rr', to: 'ctx' }]
  };
  const agentLoopSpec = {
    title: 'סוכן החשבון', width: 940, height: 340,
    intro: `<p>תת-סוכן ReAct על ${MB('sonnet')} עם 3 כלים, תקציב 8 צעדים, ו-interrupt לפני החזר כספי. לחצו על <b>קריאת כלי</b> לצלילה.</p>`,
    nodes: [
      { id: 'in', x: 860, y: 170, w: 120, label: 'משימה', sub: 'מהנתב', color: 'ui', info: '<p>"חויבתי פעמיים באוקטובר". + system של הסוכן + 3 כלים.</p>' },
      { id: 'think', x: 680, y: 170, w: 150, h: 72, shape: 'diamond', label: 'החלטה', sub: 'Sonnet', color: 'llm', info: '<p>בכל צעד: לענות או להפעיל כלי? מונה צעדים: אחרי 8 — עצירה והסלמה.</p>' },
      { id: 'tool', x: 470, y: 70, w: 150, label: 'קריאת כלי', sub: 'get_bill', color: 'tool', info: '<p>האטום של הסוכן.</p>', children: toolCallSpec },
      { id: 'skill', x: 470, y: 170, w: 150, label: 'טעינת Skill', sub: 'refund-policy', color: 'tool', info: '<p>כשמדובר בהחזר, הסוכן טוען את גוף ה-Skill עם כללי ההחזר (תקרות, מסמכים נדרשים). רק ה-description יושב תמיד ב-context.</p>' },
      { id: 'hitl', x: 470, y: 275, w: 160, label: 'interrupt()', sub: 'אישור נציג', color: 'warn', info: '<p><code>request_refund</code> קורא ל-<code>interrupt()</code>: ה-State נשמר ב-checkpointer והגרף נעצר עד שנציג מאשר/דוחה. ממשיכים עם <code>Command(resume=...)</code>.</p>' },
      { id: 'obs', x: 260, y: 170, w: 140, label: 'tool_result', sub: 'תצפית', color: 'data', info: '<p>חוזר להחלטה הבאה.</p>' },
      { id: 'out', x: 90, y: 170, w: 110, shape: 'round', label: 'תשובה', color: 'ok', info: '<p>סיכום ללקוח + מספר טיקט.</p>' }
    ],
    edges: [{ from: 'in', to: 'think' }, { from: 'think', to: 'tool' }, { from: 'think', to: 'skill' }, { from: 'think', to: 'hitl' }, { from: 'tool', to: 'obs' }, { from: 'skill', to: 'obs' }, { from: 'hitl', to: 'obs' }, { from: 'obs', to: 'out' }]
  };
  const escalationSpec = {
    title: 'מתכנן ההסלמה', width: 940, height: 320,
    intro: `<p>Plan-and-execute: ${MB('opus')} מתכנן ומסנתז, ${MB('sonnet')} מבצע במקביל, ${MB('haiku')} מסכם לנציג.</p>`,
    nodes: [
      { id: 'plan', x: 820, y: 160, w: 150, label: 'תכנון', sub: 'Opus', color: 'ctrl', info: `<p>${MB('opus')} מפרק תלונה מרובת בעיות לתתי-משימות, מזהה דחיפות (תלות רפואית בחשמל → P1) וקובע סדר.</p>` },
      { id: 'w1', x: 590, y: 60, w: 160, label: 'Worker: תעריף', sub: 'Sonnet + RAG', color: 'tool', info: '<p>בודק את מעבר התוכנית ומשווה חשבונות.</p>' },
      { id: 'w2', x: 590, y: 160, w: 160, label: 'Worker: מונה', sub: 'Sonnet + tools', color: 'tool', info: '<p>בודק החלפת מונה וזיכוי שלא ניתן.</p>' },
      { id: 'w3', x: 590, y: 260, w: 160, label: 'Worker: ניתוק', sub: 'Sonnet + tools', color: 'warn', info: '<p>בודק סטטוס ניתוק ורישום כ"תלוי חשמל רפואית". <b>לא</b> מבצע חיבור מחדש — רק מכין לנציג.</p>' },
      { id: 'syn', x: 360, y: 160, w: 150, label: 'סינתזה', sub: 'Opus', color: 'ctrl', info: '<p>מאחד ממצאים, מנסח תוכנית פעולה ותשובה אמפתית ללקוח.</p>' },
      { id: 'ho', x: 150, y: 160, w: 150, label: 'סיכום לנציג', sub: 'Haiku · P1', color: 'ok', info: `<p>${MB('haiku')} מייצר כרטיס מובנה לתור הנציגים. האדם מחליט; המערכת מכינה.</p>` }
    ],
    edges: [{ from: 'plan', to: 'w1' }, { from: 'plan', to: 'w2' }, { from: 'plan', to: 'w3' }, { from: 'w1', to: 'syn' }, { from: 'w2', to: 'syn' }, { from: 'w3', to: 'syn' }, { from: 'syn', to: 'ho' }]
  };
  const graphSpec = {
    title: 'גרף LangGraph', width: 960, height: 400,
    intro: `<p>הגרף המלא. כל צומת עם המודל שלו. צמתים עם ⤵ נפתחים: <b>סוכן החשבון</b> (לולאה עם כלים) ו-<b>מתכנן ההסלמה</b>; <b>RAG</b> נפתח לאחזור בודד.</p>`,
    nodes: [
      { id: 'start', x: 900, y: 200, w: 80, shape: 'round', label: 'START', color: 'ext', info: '<p>הודעת משתמש חדשה + thread_id (=מזהה שיחה) לשחזור State.</p>' },
      { id: 'gin', x: 780, y: 200, w: 120, label: 'guard_in', sub: 'Haiku', color: 'warn', info: `<p>${MB('haiku')} + regex: injection, PII, שפה פוגענית. PII מוסתר לפני כל לוג.</p>` },
      { id: 'route', x: 630, y: 200, w: 140, h: 76, shape: 'diamond', label: 'route', sub: 'Haiku', color: 'llm', info: `<p>${MB('haiku')} עם structured output: intent + confidence. ביטחון &lt; 0.7 → מסלול חזק יותר (הסלמה), לא ניחוש.</p>` },
      { id: 'faq', x: 420, y: 70, w: 160, label: 'faq_rag', sub: 'Haiku→RAG→Sonnet', color: 'tool', info: `<p>שכתוב (${MB('haiku')}) → אחזור → תשובה עם ציטוטים (${MB('sonnet')}) → בדיקת groundedness (${MB('haiku')}).</p>`, children: retrievalSpec },
      { id: 'acct', x: 420, y: 200, w: 160, label: 'account_agent', sub: 'Sonnet + tools', color: 'ctrl', info: `<p>תת-סוכן ${MB('sonnet')} עם get_bill / open_ticket / request_refund ו-Skills.</p>`, children: agentLoopSpec },
      { id: 'esc', x: 420, y: 330, w: 160, label: 'escalate', sub: 'Opus planner', color: 'ctrl', info: `<p>${MB('opus')} למקרים מרובי-בעיות/רגישים. ~5% מהשיחות, ~25% מעלות ה-LLM.</p>`, children: escalationSpec },
      { id: 'gout', x: 220, y: 200, w: 130, label: 'guard_out', sub: 'Haiku', color: 'warn', info: `<p>${MB('haiku')}: אין הבטחות אסורות, אין PII של אחרים, טון מתאים. כללים עסקיים (תקרת החזר) נאכפים בקוד.</p>` },
      { id: 'end', x: 80, y: 200, w: 80, shape: 'round', label: 'END', color: 'ok', info: '<p>התשובה מוזרמת ללקוח; ה-trace נסגר.</p>' },
      { id: 'cp', x: 780, y: 330, w: 140, h: 56, shape: 'db', label: 'Checkpointer', sub: 'Postgres', color: 'store', info: '<p>State אחרי כל צומת. מאפשר: המשך שיחה, interrupt לאישור נציג (גם אחרי שעות), ו-time-travel ל-debug.</p>' }
    ],
    edges: [
      { from: 'start', to: 'gin' }, { from: 'gin', to: 'route' },
      { from: 'route', to: 'faq', label: 'faq' }, { from: 'route', to: 'acct', label: 'account' }, { from: 'route', to: 'esc', label: 'complex' },
      { from: 'faq', to: 'gout' }, { from: 'acct', to: 'gout' }, { from: 'esc', to: 'gout' }, { from: 'gout', to: 'end' },
      { from: 'gin', to: 'cp', dashed: true, color: 'store' }
    ]
  };
  const ARCH = {
    title: 'מערכת "נגה"', width: 1000, height: 480,
    intro: `<p>ארכיטקטורת המערכת. הבקשה זורמת <b>מימין לשמאל</b>: widget → API → LangGraph → מודלים, כלים, RAG ו-Skills. ClearML עוקב מהצד.</p>
      <p>מסלול צלילה מומלץ: <b>LangGraph</b> ⤵ <b>account_agent</b> ⤵ <b>קריאת כלי</b> ⤵ <b>tool_use</b> ⤵ <b>שכבות</b> ⤵ <b>נוירון בודד</b>.</p>`,
    nodes: [
      { id: 'widget', x: 920, y: 90, w: 140, label: 'Chat widget', sub: 'React · SSE · RTL', color: 'ui', info: '<p>רכיב באתר ובאפליקציה. מזרים טוקנים, מציג ציטוטים, כפתורי 👍/👎, וכפתור "דבר עם נציג" תמיד גלוי.</p><p><a href="#/chat">למודול Chat ←</a></p>' },
      { id: 'api', x: 760, y: 90, w: 140, label: 'API Gateway', sub: 'FastAPI · auth', color: 'ctrl', info: '<p>אימות לקוח (OTP), rate limit, יצירת thread_id, פתיחת SSE ופתיחת trace.</p>' },
      { id: 'graph', x: 570, y: 90, w: 170, label: 'LangGraph', sub: 'orchestrator', color: 'ctrl', info: '<p>לב המערכת: גרף מצבים עם ניתוב, תתי-סוכנים, interrupt ו-checkpoint. לחצו לצלילה.</p><p><a href="#/langgraph">למודול LangGraph ←</a></p>', children: graphSpec },
      { id: 'claude', x: 360, y: 90, w: 170, label: 'Claude API', sub: 'Haiku · Sonnet · Opus', color: 'llm', info: `<p>שלושה tiers, נבחרים לכל צומת: ${MB('haiku')} ${MB('sonnet')} ${MB('opus')}. דרך <code>ChatAnthropic</code> של LangChain.</p><p><a href="#/llm">מה קורה בפנים ←</a></p>`, children: tokenSpec },
      { id: 'tools', x: 760, y: 240, w: 150, label: 'Tools / APIs', sub: 'Billing · CRM · Refund', color: 'tool', info: '<p>שירותים פנימיים עטופים ככלים, עם הרשאות לפי לקוח, idempotency ו-timeouts. החזר כספי → אישור נציג.</p><p><a href="#/agents">כלים בסוכנים ←</a></p>', children: toolCallSpec },
      { id: 'rag', x: 570, y: 240, w: 160, label: 'RAG service', sub: 'hybrid + rerank', color: 'tool', info: '<p>אחזור ממסמכי מדיניות, תעריפים ושאלות נפוצות (~4,000 מסמכים, 38K chunks).</p><p><a href="#/rag">למודול RAG ←</a></p>', children: retrievalSpec },
      { id: 'skills', x: 360, y: 240, w: 160, label: 'Skills', sub: 'bill-explainer · refund', color: 'tool', info: '<p>ידע ארוז שנטען לפי צורך: <code>hebrew-bill-explainer</code>, <code>refund-policy</code>, <code>outage-protocol</code>.</p><p><a href="#/skills">למודול Skills ←</a></p>' },
      { id: 'pg', x: 920, y: 240, w: 130, h: 64, shape: 'db', label: 'Postgres', sub: 'state · history', color: 'store', info: '<p>checkpoints של LangGraph, היסטוריית שיחות (אחרי redaction), תור אישורים.</p>' },
      { id: 'vdb', x: 570, y: 390, w: 150, h: 64, shape: 'db', label: 'Vector DB', sub: 'Qdrant · ACL', color: 'store', info: '<p>collection עם גרסה (<code>policies_v12</code>) + alias <code>policies_current</code> שמוחלף רק אחרי שה-eval הלילי עבר.</p>' },
      { id: 'comfy', x: 360, y: 390, w: 160, label: 'ComfyUI', sub: 'GPU · אינפוגרפיקה', color: 'data', info: '<p>יוצר איור אישי להסבר החשבון. ה-LLM כותב את ה-prompt; <b>הטקסט והמספרים מוצבים בקוד</b> מעל התמונה (דיפוזיה לא כותבת עברית טוב).</p><p><a href="#/comfyui">למודול ComfyUI ←</a></p>' },
      { id: 'obs', x: 820, y: 390, w: 150, label: 'Tracing', sub: 'OTel · LangSmith', color: 'ext', info: '<p>span לכל צומת וקריאת מודל: מודל, טוקנים, cache, latency, גרסת prompt. PII מוסתר.</p><p><a href="#/algorithmist">תצפיתיות ←</a></p>' },
      { id: 'clearml', x: 110, y: 240, w: 150, h: 380, label: 'ClearML', sub: 'experiments · pipelines', color: 'store', info: '<p>(1) מעקב ניסויים: מודל embeddings, chunking, גרסאות prompt, תוצאות eval. (2) Pipeline לילי: snapshot מסמכים → re-index → eval → קידום alias. (3) תורי GPU ל-ComfyUI ול-embeddings.</p><p><a href="#/clearml">למודול ClearML ←</a></p>' }
    ],
    edges: [
      { from: 'widget', to: 'api', both: true },
      { from: 'api', to: 'graph' }, { from: 'graph', to: 'claude' },
      { from: 'graph', to: 'tools' }, { from: 'graph', to: 'rag' }, { from: 'graph', to: 'skills' },
      { from: 'api', to: 'pg' }, { from: 'rag', to: 'vdb' }, { from: 'graph', to: 'comfy', bend: 25 },
      { from: 'clearml', to: 'skills', dashed: true, color: 'store', label: 'גרסאות' },
      { from: 'clearml', to: 'comfy', dashed: true, color: 'store' },
      { from: 'clearml', to: 'claude', dashed: true, color: 'store', label: 'eval' }
    ]
  };

  /* =====================================================================
     SECTION 1 — requirements
     ===================================================================== */
  function renderReq(el) {
    el.innerHTML = `
      <p>הפרויקט: <b>"נגה"</b> — עוזרת AI לשירות לקוחות של <b>"זרם+"</b>, ספק חשמל פרטי ישראלי <span class="muted">(חברה בדיונית)</span> עם ~400 אלף לקוחות ביתיים ועסקיים.
      המוקד מקבל ~12,000 פניות ביום; 70% הן שאלות מדיניות חוזרות, 25% פעולות בחשבון, ו-5% תלונות מורכבות שדורשות נציג בכיר.</p>
      ${LA.callout('analogy', `חשבו על <b>מוקד שירות עם דלפק קבלה חכם</b>: פקיד קבלה מהיר (${MB('haiku')}) מבין במה מדובר ומפנה; פקיד ידע (${MB('sonnet')} + RAG) עונה מתוך ספר הנהלים;
        פקיד חשבונות (סוכן ${MB('sonnet')} עם כלים) בודק במערכת ופותח טיקטים — אבל <b>החזר כספי צריך חתימת מנהל</b> (human-in-the-loop);
        ומנהל משמרת מנוסה (${MB('opus')}) מטפל רק בתיקים הסבוכים. ברקע: גרפיקאי (ComfyUI) שמכין איור הסבר, ומחלקת איכות (ClearML) שבודקת כל לילה שהנהלים מעודכנים והתשובות טובות.`)}
      <h3>סיפורי משתמש</h3>
      ${LA.table(['#', 'כמשתמש…', 'אני רוצה…', 'קריטריון קבלה', 'נושאים'], [
        ['1', 'לקוח ביתי', 'לשאול "מה קורה לחשבון כשעוברים דירה?" ולקבל תשובה מדויקת', 'תשובה עם ציטוט לסעיף; faithfulness ≥ 0.95; TTFT &lt; 1.5 שנ׳', '<a href="#/rag">RAG</a> · <a href="#/chat">Chat</a>'],
        ['2', 'לקוח שחויב פעמיים', 'לבקש החזר בלי להמתין למוקד', 'זיהוי חיוב כפול בכלי; החזר רק אחרי אישור נציג; טיקט נפתח', '<a href="#/agents">Agents</a> · <a href="#/langgraph">LangGraph</a>'],
        ['3', 'לקוחה מבוגרת', 'להבין למה החשבון גבוה, בעברית פשוטה ועם הסבר חזותי', 'הסבר שורה-שורה + איור אישי; בלי PII בתמונה', '<a href="#/skills">Skills</a> · <a href="#/comfyui">ComfyUI</a>'],
        ['4', 'לקוח עם תלונה מורכבת', 'שמישהו יבין את כל התמונה ולא "ישלח אותי מנציג לנציג"', 'פירוק לבעיות, זיהוי דחיפות, סיכום לנציג בכיר תוך 2 דק׳', '<a href="#/agents">sub-agents</a>'],
        ['5', 'נציג אנושי', 'לקבל מהבוט סיכום מובנה ולאשר החזרים בקליק', 'כרטיס עם הקשר מלא; אישור/דחייה ממשיכים את הגרף', '<a href="#/langgraph">interrupt</a>'],
        ['6', 'אלגוריתמאית הצוות', 'לדעת כל בוקר אם האינדקס והתשובות עדיין טובים', 'pipeline לילי + דוח eval + קידום אינדקס רק אם עבר סף', '<a href="#/clearml">ClearML</a>']
      ])}
      <h3>דרישות לא-פונקציונליות</h3>
      <div class="cap-nfr">
        ${[
          ['⚡', 'Latency', 'TTFT p95 &lt; 1.5 שנ׳; תשובת FAQ מלאה p95 &lt; 4 שנ׳'],
          ['💰', 'עלות', '&lt; $0.03 לשיחה ממוצעת (ראו טבלת ניתוב)'],
          ['🎯', 'איכות', 'containment ≥ 60% · task success ≥ 85% · faithfulness ≥ 0.95'],
          ['🛡️', 'בטיחות', '0 החזרים בלי אישור · 0 דליפת PII בין לקוחות · red-team ב-CI'],
          ['🇮🇱', 'שפה', 'עברית מלאה (RTL), ערבית ורוסית בשלב 2'],
          ['🔁', 'זמינות', '99.5%; fallback ל-Sonnet אם Opus לא זמין; "דבר עם נציג" תמיד']
        ].map(([i, t, d]) => `<div class="card"><h4>${i} ${t}</h4><div class="muted">${d}</div></div>`).join('')}
      </div>
      ${LA.callout('algo', 'לפני שורת קוד אחת: אוספים 300 פניות אמיתיות (אחרי הסרת PII) ומתייגים כוונה, תשובה נכונה ומסמכים רלוונטיים. זה ה-golden set שעליו יימדד כל רכיב בהמשך.')}`;
  }

  /* =====================================================================
     SECTION 2 — architecture
     ===================================================================== */
  function renderArch(el) {
    el.insertAdjacentHTML('beforeend', `<p>לחצו על כל רכיב. רכיבים עם <b class="dive-ic">⤵</b> נפתחים — עד <b>5 רמות</b>: מערכת → גרף LangGraph → תת-סוכן → קריאת כלי בודדת → יצירת טוקן → נוירון בודד.</p>`);
    const row = h('div', { class: 'pill-row' });
    el.appendChild(row);
    const api = LA.diagram(el, ARCH);
    [['▶ שאלת FAQ', ['widget', 'api', 'graph', 'rag', 'vdb']], ['▶ פעולה בחשבון', ['widget', 'api', 'graph', 'tools']], ['▶ איור חשבון', ['widget', 'api', 'graph', 'comfy']]]
      .forEach(([t, p]) => row.appendChild(h('button', { type: 'button', class: 'btn', onclick: () => { if (api.depth === 0) api.flow(p, 500); } }, t)));
    row.appendChild(h('button', { type: 'button', class: 'btn ghost', onclick: () => { if (api.depth === 0) api.select('graph'); api.dive('graph'); } }, '⤵ קפוץ לגרף'));
    el.insertAdjacentHTML('beforeend', LA.callout('llm', `ה-LLM מופיע במערכת ב-<b>12 תפקידים שונים</b> (ראו הטבלה הבאה) — אבל אף אחד מהם לא "מחליט לבד" על כסף, הרשאות או ניתוק. ההחלטות האלה נאכפות בקוד ובאישור אדם.
      זו ההבחנה החשובה ביותר בתכנון: <b>LLM לשיפוט ושפה, קוד לכללים ולהרשאות</b>.`));
  }

  /* =====================================================================
     SECTION 3 — model routing table
     ===================================================================== */
  function renderRouting(el) {
    el.insertAdjacentHTML('beforeend', `<p>כל סוכן, תת-סוכן וצעד — עם המודל שלו והנימוק. העלות מחושבת מהטוקנים הממוצעים × מספר הקריאות בשיחה ממוצעת
      (3 תורות; תמהיל 70% FAQ / 25% חשבון / 5% הסלמה). מחירים משוערים לפי מחירון — <b>בדקו תמחור עדכני</b>.</p>`);
    const ctrl = h('div', { class: 'pill-row' });
    const tblBox = h('div'), sumBox = h('div');
    let force = null;
    const opts = [[null, 'הניתוב המתוכנן'], ['haiku', 'הכל Haiku'], ['sonnet', 'הכל Sonnet'], ['opus', 'הכל Opus']];
    opts.forEach(([t, l]) => ctrl.appendChild(h('button', { type: 'button', class: 'cap-chip' + (t === null ? ' on' : ''), onclick: ev => {
      force = t; ctrl.querySelectorAll('.cap-chip').forEach(b => b.classList.toggle('on', b === ev.currentTarget)); draw();
    } }, l)));
    let convDay = 12000;
    const sl = LA.slider('שיחות ביום', 1000, 50000, 500, convDay, v => { convDay = v; draw(); }, intFmt);
    el.append(ctrl, tblBox, sl, sumBox);
    const planned = () => ROUTING.reduce((s, r) => s + r.calls * callCost(r.tier, r.tin, r.tout, r.hit) + (r.gpu ? r.calls * GPU_IMAGE_COST : 0), 0);
    function draw() {
      const byTier = { haiku: 0, sonnet: 0, opus: 0 }; let gpu = 0, total = 0;
      const rows = ROUTING.map(r => {
        const t = force || r.tier;
        const c = r.calls * callCost(t, r.tin, r.tout, r.hit);
        const g = r.gpu ? r.calls * GPU_IMAGE_COST : 0;
        byTier[t] += c; gpu += g; total += c + g;
        return [`<b>${r.step}</b><div class="muted cap-small">${r.sub}</div>`, MB(t) + (force && force !== r.tier ? ` <span class="cap-small muted">(במקום ${PRICES[r.tier].name})</span>` : ''),
          `<span class="cap-small">${r.why}</span>`, `<span class="mono cap-nw">${intFmt(r.tin)}/${intFmt(r.tout)}</span><div class="cap-small muted cap-nw">cache ${pct(r.hit, 0)} · ×${r.calls}</div>`,
          `<b class="mono cap-nw">${money(c + g)}</b>` + (g ? '<div class="cap-small muted">כולל GPU</div>' : '')];
      });
      rows.push(['<b>סה״כ לשיחה ממוצעת</b>', '', '', '', `<b class="mono cap-total">${money(total)}</b>`]);
      tblBox.innerHTML = LA.table(['צעד / סוכן', 'מודל', 'למה המודל הזה', 'טוקנים in/out · קריאות לשיחה', 'עלות לשיחה'], rows, 'cap-route');
      const base = planned();
      const seg = Object.entries(byTier).map(([t, v]) => `<i style="width:${(v / total * 100).toFixed(2)}%;background:${PRICES[t].color}" title="${PRICES[t].name}: ${money(v)} (${pct(v / total, 0)})"></i>`).join('') +
        `<i style="width:${(gpu / total * 100).toFixed(2)}%;background:#f59e0b" title="GPU (ComfyUI): ${money(gpu)}"></i>`;
      sumBox.innerHTML = `<div class="cap-kpis">${kpi('עלות לשיחה', money(total), force ? `לעומת ${money(base)} בניתוב המתוכנן (×${(total / base).toFixed(1)})` : 'ניתוב מתוכנן', force ? (total > base ? 'bad' : 'warn') : 'ok')}
        ${kpi('ליום', money(total * convDay), intFmt(convDay) + ' שיחות')}${kpi('לחודש', money(total * convDay * 30), '30 יום')}
        ${kpi('עלות נציג אנושי לשיחה (להשוואה)', '~$4', 'הערכה: 8 דק׳ × שכר + תקורה')}</div>
        <div class="cap-split">${seg}</div>
        <div class="cap-legend">${Object.keys(byTier).map(t => `<span><i style="background:${PRICES[t].color}"></i>${PRICES[t].name} ${money(byTier[t])}</span>`).join('')}<span><i style="background:#f59e0b"></i>GPU ${money(gpu)}</span></div>`;
    }
    draw();
    el.insertAdjacentHTML('beforeend', LA.callout('algo', `שימו לב לתמונה שהטבלה חושפת: ${MB('opus')} רץ רק בכ-5% מהשיחות אבל הוא חלק משמעותי מהעלות — ובכל זאת שם הוא שווה את מחירו (טעות בתיק עם ציוד רפואי עולה הרבה יותר מ-$0.03).
      לעומת זאת, "הכל Opus" מכפיל את העלות כמעט בלי לשפר את ה-FAQ. <b>ניתוב הוא החלטה פר-צעד, מבוססת מדידה</b> — כל שורה בטבלה צריכה מספר מה-eval שמצדיק אותה.`));
  }

  /* =====================================================================
     SECTION 4 — end-to-end trace (3 scenarios)
     ===================================================================== */
  const TRACE_DG = {
    width: 1040, height: 410,
    groups: [{ x: 28, y: 22, w: 482, h: 78, label: 'FAQ', color: 'tool' }, { x: 28, y: 160, w: 472, h: 80, label: 'חשבון', color: 'ctrl' }, { x: 28, y: 300, w: 482, h: 80, label: 'הסלמה', color: 'llm' }],
    nodes: [
      { id: 'user', x: 965, y: 200, w: 120, label: 'לקוח', sub: 'Chat widget', color: 'ui', info: '<p>ההודעה נשלחת; התשובה תוזרם בחזרה ב-SSE.</p>' },
      { id: 'api', x: 835, y: 200, w: 110, label: 'API', sub: 'auth · trace', color: 'ctrl', info: '<p>אימות, thread_id, פתיחת trace.</p>' },
      { id: 'guard', x: 705, y: 200, w: 120, label: 'guard_in', sub: 'Haiku', color: 'warn', info: '<p>injection / PII.</p>' },
      { id: 'router', x: 570, y: 200, w: 120, h: 70, shape: 'diamond', label: 'router', sub: 'Haiku', color: 'llm', info: '<p>intent + confidence.</p>' },
      { id: 'retr', x: 380, y: 60, w: 130, label: 'Retriever', sub: 'hybrid+rerank', color: 'tool', info: '<p>שכתוב שאילתה + אחזור.</p>' },
      { id: 'ans', x: 238, y: 60, w: 130, label: 'Answer', sub: 'Sonnet', color: 'llm', info: '<p>תשובה עם ציטוטים.</p>' },
      { id: 'chk', x: 96, y: 60, w: 130, label: 'Grounded', sub: 'בדיקה · Haiku', color: 'warn', info: '<p>בדיקת נאמנות.</p>' },
      { id: 'agent', x: 380, y: 200, w: 130, label: 'Account agent', sub: 'Sonnet', color: 'ctrl', info: '<p>לולאת כלים.</p>' },
      { id: 'tools', x: 238, y: 200, w: 130, label: 'Billing tools', sub: 'get_bill · refund', color: 'tool', info: '<p>מערכות פנימיות.</p>' },
      { id: 'human', x: 96, y: 200, w: 130, label: 'אישור נציג', sub: 'interrupt', color: 'warn', info: '<p>הגרף ממתין.</p>' },
      { id: 'comfy', x: 238, y: 130, w: 130, h: 44, label: 'ComfyUI', sub: 'איור', color: 'data', info: '<p>אינפוגרפיקה אישית.</p>' },
      { id: 'plan', x: 380, y: 340, w: 130, label: 'Planner', sub: 'Opus', color: 'llm', info: '<p>תכנון וסינתזה.</p>' },
      { id: 'workers', x: 238, y: 340, w: 130, label: 'Workers ×3', sub: 'Sonnet', color: 'tool', info: '<p>חקירה מקבילית.</p>' },
      { id: 'handoff', x: 96, y: 340, w: 130, label: 'Handoff', sub: 'Haiku → נציג', color: 'ok', info: '<p>כרטיס לנציג בכיר.</p>' }
    ],
    edges: [
      { from: 'user', to: 'api' }, { from: 'api', to: 'guard' }, { from: 'guard', to: 'router' },
      { from: 'router', to: 'retr' }, { from: 'retr', to: 'ans' }, { from: 'ans', to: 'chk' },
      { from: 'router', to: 'agent' }, { from: 'agent', to: 'tools', both: true }, { from: 'tools', to: 'human' }, { from: 'agent', to: 'comfy' },
      { from: 'router', to: 'plan' }, { from: 'plan', to: 'workers', both: true }, { from: 'workers', to: 'handoff' }
    ]
  };
  // step: {t, html, path, tier?, tin, tout, hit, ms, par?(parallel calls count), gpu?, wait?}
  const SCEN = {
    faq: { label: '🙋 שאלה פשוטה (FAQ)', q: 'אני עוברת דירה בשבוע הבא באמצע החודש. מה קורה עם החשבון?', steps: [
      { t: 'הודעה נכנסת', path: ['user', 'api'], ms: 40, html: 'ה-widget שולח את ההודעה; ה-API מאמת את הלקוחה (session), פותח trace ושולף את ה-State של השיחה מה-checkpointer.' },
      { t: 'שומר קלט', path: ['api', 'guard'], tier: 'haiku', tin: 600, tout: 20, hit: 0.7, ms: 220, html: `${MB('haiku')}: אין injection; regex מסתיר את מספר הטלפון שהלקוחה הוסיפה. ציון סיכון 0.` },
      { t: 'ניתוב', path: ['guard', 'router'], tier: 'haiku', tin: 900, tout: 30, hit: 0.6, ms: 260, html: `${MB('haiku')} → <code>{"intent": "faq_policy", "confidence": 0.94}</code>. ביטחון גבוה → מסלול FAQ.` },
      { t: 'שכתוב ואחזור', path: ['router', 'retr'], tier: 'haiku', tin: 500, tout: 60, hit: 0.5, ms: 380, html: `${MB('haiku')} משכתב: "חיוב יחסי מעבר דירה אמצע מחזור". embedding + hybrid search (30) + rerank → 5 קטעים מ-<code>pol-112</code> ו-<code>faq-031</code>. (~120ms מתוך הזמן הם LLM, השאר אחזור.)` },
      { t: 'תשובה עם ציטוטים', path: ['retr', 'ans'], tier: 'sonnet', tin: 4200, tout: 320, hit: 0.7, ms: 2100, html: `${MB('sonnet')} עונה מתוך הקטעים, מוזרם טוקן-טוקן (TTFT ≈ 650ms). 70% מהקלט (system + מדיניות קבועה) מה-cache.<div class="cap-quote">"במעבר דירה תקבלי חשבון סופי יחסי לפי מספר הימים בכתובת הנוכחית [pol-112 §3]. חשוב לדווח קריאת מונה ביום המעבר…"</div>` },
      { t: 'בדיקת groundedness', path: ['ans', 'chk'], tier: 'haiku', tin: 2400, tout: 30, hit: 0, ms: 240, html: `${MB('haiku')} מאשר: כל טענה נתמכת בקטע. ה-widget מציג תג "מבוסס על מסמכי זרם+" ושני קישורי ציטוט. Trace נסגר.` }
    ] },
    refund: { label: '💳 החזר שדורש אישור', q: 'חויבתי פעמיים על חשבון אוקטובר! אני רוצה את הכסף בחזרה.', steps: [
      { t: 'הודעה נכנסת', path: ['user', 'api'], ms: 40, html: 'לקוח מאומת (OTP). thread_id חדש.' },
      { t: 'שומר קלט', path: ['api', 'guard'], tier: 'haiku', tin: 600, tout: 20, hit: 0.7, ms: 220, html: `${MB('haiku')}: תקין. זוהה רגש שלילי → דגל "טון אמפתי".` },
      { t: 'ניתוב', path: ['guard', 'router'], tier: 'haiku', tin: 900, tout: 30, hit: 0.6, ms: 260, html: `${MB('haiku')} → <code>account_action</code> (0.91). מסלול לסוכן החשבון.` },
      { t: 'סוכן: get_bill', path: ['router', 'agent', 'tools'], tier: 'sonnet', tin: 3800, tout: 120, hit: 0.7, ms: 1500, html: `${MB('sonnet')} מחליט לקרוא <code>get_bill(account_id, "2026-10")</code>. שער המדיניות מוודא שהחשבון שייך ללקוח. ה-API מחזיר שני חיובים זהים של ₪412.30 בהפרש 2 דקות.` },
      { t: 'סוכן: טוען Skill ומבקש החזר', path: ['tools', 'agent'], tier: 'sonnet', tin: 5600, tout: 260, hit: 0.6, ms: 1900, html: `הסוכן טוען את Skill <code>refund-policy</code> (חיוב כפול → החזר מלא, עד ₪2,000 באישור נציג), וקורא <code>request_refund(412.30, "duplicate charge")</code>.` },
      { t: '⏸ interrupt — ממתין לנציג', path: ['agent', 'tools', 'human'], ms: 0, wait: '≈ 3 דק׳', html: 'הכלי קורא ל-<code>interrupt()</code>. ה-State נשמר ב-Postgres והגרף <b>נעצר</b>. ללקוח מוצג: "הבקשה הועברה לאישור, נעדכן תוך דקות". נציג רואה כרטיס עם שני החיובים ומאשר. <code>Command(resume={"approved": true})</code> ממשיך את הגרף מאותה נקודה. (זמן ההמתנה לא נספר ב-latency של המערכת.)' },
      { t: 'ביצוע ההחזר + טיקט', path: ['human', 'tools', 'agent'], tier: 'sonnet', tin: 6100, tout: 180, hit: 0.75, ms: 1700, html: '<code>billing_api.create_refund(..., idempotency_key)</code> + <code>open_ticket</code>. הסוכן מקבל את מספרי האישור.' },
      { t: 'איור הסבר (ComfyUI)', path: ['agent', 'comfy'], tier: 'haiku', tin: 800, tout: 120, hit: 0.5, ms: 600, gpu: true, html: `${MB('haiku')} כותב prompt לאיור ("illustration of a calendar with two identical bills, one crossed out, friendly flat style") — <b>בלי PII</b>. ComfyUI (seed קבוע) מרנדר ב-~6 שנ׳ <b>אסינכרונית</b> (לא חוסם את התשובה — הזמן כאן הוא רק כתיבת ה-prompt); המספרים בעברית מוצבים בקוד מעל התמונה.` },
      { t: 'תשובה ללקוח', path: ['comfy', 'agent'], tier: 'sonnet', tin: 6500, tout: 240, hit: 0.8, ms: 1600, html: `${MB('sonnet')}: "אישרנו החזר של ₪412.30 על החיוב הכפול (אסמכתא R-88213). הכסף יופיע בכרטיס תוך 5–7 ימי עסקים." + האיור. guard_out מאשר.` }
    ] },
    complex: { label: '🚨 תלונה מורכבת → Opus', q: 'מאז שעברתי לתוכנית "לילה חסכוני" החשבונות הוכפלו, החליפו לי מונה ולא קיבלתי זיכוי, ואתמול ניתקו לי את החשמל בלי התראה — ואני מחובר למכשיר חמצן!', steps: [
      { t: 'הודעה נכנסת', path: ['user', 'api'], ms: 40, html: 'הודעה ארוכה עם 3 בעיות.' },
      { t: 'שומר קלט', path: ['api', 'guard'], tier: 'haiku', tin: 700, tout: 25, hit: 0.6, ms: 230, html: `${MB('haiku')}: תקין. מסווג בטיחות מסמן <b>"תלות רפואית בחשמל"</b> → דגל דחיפות.` },
      { t: 'ניתוב', path: ['guard', 'router'], tier: 'haiku', tin: 1000, tout: 30, hit: 0.5, ms: 270, html: `${MB('haiku')} → <code>complex_escalation</code> (multi_issue + urgent). כאן לא חוסכים — שולחים למתכנן החזק.` },
      { t: 'תכנון (Opus)', path: ['router', 'plan'], tier: 'opus', tin: 9000, tout: 900, hit: 0.3, ms: 7800, html: `${MB('opus')} מפרק ל-3 תתי-משימות ומסדר עדיפות: (1) ניתוק + תלות רפואית — <b>P1, נציג אנושי מיידי</b>; (2) זיכוי מונה; (3) ניתוח תעריף. בנוסף: הודעת ביניים מיידית ללקוח עם מספר מוקד חירום.` },
      { t: 'Workers במקביל (Sonnet ×3)', path: ['plan', 'workers'], tier: 'sonnet', tin: 4000, tout: 400, hit: 0.5, par: 3, ms: 4200, html: `שלושה ${MB('sonnet')} רצים <b>במקביל</b> (latency = האיטי מביניהם, עלות = סכום): worker תעריף (RAG + השוואת 3 חשבונות: עלייה של 87% נובעת מצריכת יום בתעריף לילה), worker מונה (החלפה ב-14/9 בלי זיכוי — חסר טיקט), worker ניתוק (ניתוק לחוב שגוי; הלקוח <b>לא</b> רשום כתלוי רפואית).` },
      { t: 'סינתזה (Opus)', path: ['workers', 'plan'], tier: 'opus', tin: 8000, tout: 700, hit: 0.4, ms: 6100, html: `${MB('opus')} מאחד ממצאים לתוכנית פעולה + טיוטת תשובה אמפתית. <b>לא מבצע</b> חיבור מחדש או זיכויים — רק ממליץ.` },
      { t: 'סיכום לנציג בכיר', path: ['plan', 'workers', 'handoff'], tier: 'haiku', tin: 3000, tout: 250, hit: 0, ms: 900, html: `${MB('haiku')} מייצר כרטיס P1: 3 בעיות, ממצאים, פעולות מומלצות, ציטוטים. נכנס לראש תור הנציגים הבכירים + התראת SMS לכונן.` },
      { t: 'תשובה ללקוח', path: ['handoff'], tier: 'sonnet', tin: 2500, tout: 220, hit: 0.5, ms: 1500, html: '"אני מצטערת מאוד. בגלל המכשיר הרפואי, העברתי את הפנייה בדחיפות עליונה לנציג בכיר שיחזור אליך תוך 15 דקות. אם יש סכנה מיידית — מוקד חירום: …"' }
    ] }
  };
  function renderTrace(el) {
    el.insertAdjacentHTML('beforeend', `<p>בחרו תרחיש ולחצו "הבא" / "הפעל". כל צעד מאיר את הרכיבים שפועלים, ומונה ה<b>טוקנים</b>, ה<b>זמן</b> וה<b>עלות</b> מצטבר.</p>`);
    const btns = h('div', { class: 'pill-row' });
    const qBox = h('div', { class: 'cap-q' });
    const meters = h('div', { class: 'cap-kpis cap-meters' });
    const stage = h('div');
    const logBox = h('div', { class: 'cap-log' });
    el.append(btns, qBox, meters, stage, logBox);
    function drawMeters(ctx) {
      meters.innerHTML = kpi('טוקני קלט', intFmt(ctx.tin), `מתוכם מה-cache: ${intFmt(ctx.cached)}`) + kpi('טוקני פלט', intFmt(ctx.tout)) +
        kpi('זמן מערכת', (ctx.ms / 1000).toFixed(2) + 's', ctx.wait ? 'לא כולל המתנה לנציג ' + ctx.wait : 'מצטבר (סדרתי)') + kpi('עלות', money(ctx.cost), ctx.gpu ? 'כולל GPU' : 'LLM', 'ok') +
        kpi('קריאות מודל', `<span class="cap-calls">${['haiku', 'sonnet', 'opus'].map(t => `<span style="color:${PRICES[t].color}">${PRICES[t].name[0]}×${ctx.calls[t]}</span>`).join(' ')}</span>`, 'Haiku · Sonnet · Opus');
    }
    let gen = 0;
    function load(key) {
      const my = ++gen;
      const sc = SCEN[key];
      btns.querySelectorAll('.cap-chip').forEach(b => b.classList.toggle('on', b.dataset.k === key));
      qBox.innerHTML = `<b>💬 הלקוח:</b> ${esc(sc.q)}`;
      stage.innerHTML = ''; logBox.innerHTML = '';
      const api = LA.diagram(stage, TRACE_DG, { compact: true });
      const fresh = () => ({ tin: 0, tout: 0, cached: 0, ms: 0, cost: 0, gpu: false, wait: '', calls: { haiku: 0, sonnet: 0, opus: 0 }, log: [] });
      const ctx = fresh();
      const reset = c => { Object.assign(c, fresh()); drawMeters(c); logBox.innerHTML = ''; api.highlight([]); };
      LA.stepper(stage, {
        ctx, intro: 'תרחיש: ' + sc.label + ' — לחצו "הבא"',
        onReset: reset, autoplayMs: 2600,
        steps: sc.steps.map((st, j) => ({
          title: st.t,
          html: (st.tier && !st.html.includes('model-badge') ? `<div class="cap-step-model">${MB(st.tier)}${st.par ? ' ×' + st.par : ''}</div>` : '') + `<p>${st.html}</p>`,
          run: async (c, silent) => {
            if (my !== gen) return;
            // recompute totals from step 0..j so any jump (forward or back) is correct
            Object.assign(c, fresh());
            sc.steps.slice(0, j + 1).forEach(s2 => {
              const n = s2.par || 1;
              const cost = (s2.tier ? n * callCost(s2.tier, s2.tin, s2.tout, s2.hit) : 0) + (s2.gpu ? GPU_IMAGE_COST : 0);
              if (s2.tier) { c.tin += n * s2.tin; c.tout += n * s2.tout; c.cached += Math.round(n * s2.tin * s2.hit); c.calls[s2.tier] += n; }
              c.cost += cost; c.ms += s2.ms; if (s2.gpu) c.gpu = true; if (s2.wait) c.wait = s2.wait;
              c.log.push([s2.t, s2.tier ? MB(s2.tier) + (n > 1 ? ' ×' + n : '') : '—', s2.tier ? intFmt(n * s2.tin) + ' / ' + intFmt(n * s2.tout) : '—', s2.wait ? '⏸ ' + s2.wait : s2.ms + 'ms', money(cost)]);
            });
            drawMeters(c);
            logBox.innerHTML = LA.table(['צעד', 'מודל', 'טוקנים in/out', 'זמן', 'עלות'], c.log);
            if (!silent) { api.highlight([]); if (st.path.length > 1) await api.flow(st.path, 450); else api.highlight(st.path); }
          }
        }))
      });
      drawMeters(ctx);
    }
    Object.entries(SCEN).forEach(([k, sc]) => btns.appendChild(h('button', { type: 'button', class: 'cap-chip', 'data-k': k, onclick: () => load(k) }, sc.label)));
    load('faq');
    el.insertAdjacentHTML('beforeend', LA.callout('algo', `השוו את שלושת התרחישים: FAQ עולה פחות מסנט ולוקח ~3 שנ׳; החזר עולה פי 4 ובעיקר <b>ממתין לאדם</b> (והאיור מרונדר ברקע); ההסלמה עולה הכי הרבה ולוקחת ~20 שנ׳ — ולכן חייבת הודעת ביניים ללקוח.
      הממוצע המשוקלל (70/25/5) הוא מה שקובע את התקציב — לא התרחיש הזול או היקר.`));
  }

  /* =====================================================================
     SECTION 5 — project structure
     ===================================================================== */
  const TREE = [
    ['noga-support/', '', 0],
    ['app/', 'קוד השירות', 1],
    ['api.py', 'FastAPI: /chat (SSE), /approvals, אימות', 2],
    ['graph.py', 'גרף LangGraph — ניתוב מודלים לכל צומת', 2],
    ['models.py', 'מקום אחד לכל model id + effort + max_tokens', 2],
    ['tools.py', 'get_bill, open_ticket, request_refund (+interrupt)', 2],
    ['retriever.py', 'hybrid search + ACL + rerank', 2],
    ['guards.py', 'שומרי קלט/פלט: regex PII + מסווג Haiku', 2],
    ['visuals/comfy_client.py', 'קריאה ל-ComfyUI API', 2],
    ['prompts/', 'כל prompt בקובץ, עם גרסה (router_v6.md…)', 1],
    ['skills/', 'Skills של הסוכן', 1],
    ['hebrew-bill-explainer/SKILL.md', 'הסבר חשבון שורה-שורה', 2],
    ['refund-policy/SKILL.md', 'כללי החזרים ותקרות', 2],
    ['refund-policy/scripts/check_duplicate.py', 'זיהוי חיוב כפול דטרמיניסטי', 2],
    ['workflows/bill_infographic_api.json', 'workflow של ComfyUI בפורמט API', 1],
    ['pipelines/nightly_reindex_eval.py', 'ClearML pipeline: snapshot → index → eval → promote', 1],
    ['evals/', 'הערכה', 1],
    ['golden_v7.jsonl', '300 פניות מתויגות (dev 200 / test 100)', 2],
    ['redteam_v3.jsonl', '120 תקיפות: injection, PII, פעולות אסורות', 2],
    ['graders.py', 'correctness, faithfulness, tool accuracy, שופט LLM', 2],
    ['tests/', 'pytest: יחידה + רגרסיה ב-CI', 1],
    ['infra/', 'docker-compose: api, qdrant, postgres, comfyui (GPU)', 1]
  ];
  function renderTree(el) {
    el.insertAdjacentHTML('beforeend', '<p>מבנה מאגר שמפריד בין <b>קוד</b>, <b>prompts</b> (מגורסים כמו קוד), <b>Skills</b>, <b>workflows</b> ו-<b>evals</b>. לחצו על קובץ להסבר.</p>');
    const box = h('div', { class: 'cap-tree' });
    const info = h('div', { class: 'cap-tree-info muted' }, 'בחרו קובץ או תיקייה');
    TREE.forEach(([name, desc, lvl]) => {
      const isDir = name.endsWith('/');
      const row = h('div', { class: 'cap-tree-row' + (isDir ? ' dir' : ''), style: { paddingLeft: (lvl * 22 + 6) + 'px' }, tabindex: 0,
        onclick: () => { box.querySelectorAll('.cap-tree-row').forEach(r => r.classList.toggle('sel', r === row)); info.innerHTML = `<b class="mono">${esc(name)}</b> — ${esc(desc || 'שורש הפרויקט')}`; } },
      (isDir ? '📁 ' : '📄 ') + name, desc ? h('span', { class: 'cap-tree-d' }, '# ', h('bdi', null, desc)) : null);
      box.appendChild(row);
    });
    el.append(box, info);
    el.insertAdjacentHTML('beforeend', LA.callout('tip', '<code>models.py</code> הוא קובץ קטן עם השפעה גדולה: כל בחירת מודל במערכת עוברת דרכו. כך החלפת tier לצומת אחת היא שינוי שורה אחת — שעובר eval ב-CI.'));
  }

  /* =====================================================================
     SECTION 6 — key code files
     ===================================================================== */
  function renderCode(el) {
    const box = h('div'); el.appendChild(box);
    LA.tabs(box, [
      { label: 'graph.py', html: `<p>הגרף עם מודל מפורש לכל צומת. ביטחון נמוך בניתוב → מסלול חזק יותר, לא ניחוש.</p>${LA.code(`from typing import Annotated, Literal, TypedDict
from pydantic import BaseModel
from langchain_anthropic import ChatAnthropic
from langchain.agents import create_agent
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import InMemorySaver   # PostgresSaver in production

from app.tools import get_bill, open_ticket, request_refund
from app import retriever, guards, prompts

# ---- model routing: one explicit choice per node --------------------------
HAIKU  = ChatAnthropic(model="claude-haiku-5-5",  max_tokens=512)    # route, guard, rewrite
SONNET = ChatAnthropic(model="claude-sonnet-5-5", max_tokens=2048)   # RAG answer, account agent
OPUS   = ChatAnthropic(model="claude-opus-5-5",   max_tokens=8192)   # escalation planner

class State(TypedDict):
    messages: Annotated[list, add_messages]
    customer_id: str
    segment: str
    intent: str

class Route(BaseModel):
    intent: Literal["faq_policy", "account_action", "complex_escalation", "out_of_scope"]
    confidence: float

router = HAIKU.with_structured_output(Route)

def route(state: State):
    r = router.invoke([("system", prompts.ROUTER), *state["messages"][-4:]])
    # unsure? take the safer, stronger path instead of guessing
    return {"intent": r.intent if r.confidence >= 0.7 else "complex_escalation"}

def faq_rag(state: State):
    question = state["messages"][-1].content
    query = HAIKU.invoke([("system", prompts.REWRITE), *state["messages"][-4:]]).content
    docs = retriever.search(query, segment=state["segment"], k=5)
    if not docs:
        return {"messages": [("ai", prompts.NO_ANSWER_HE)]}
    answer = SONNET.invoke([("system", prompts.RAG_ANSWER),
                            ("user", retriever.format_docs(docs) + "\\n\\n" + question)])
    return {"messages": [guards.require_grounded(answer, docs, judge=HAIKU)]}

account_agent = create_agent(SONNET, tools=[get_bill, open_ticket, request_refund],
                             system_prompt=prompts.ACCOUNT_AGENT)

def escalate(state: State):
    plan = OPUS.invoke([("system", prompts.PLANNER), *state["messages"]])
    tasks = prompts.parse_subtasks(plan.content)                       # 1-4 subtasks
    findings = SONNET.batch([[("system", prompts.WORKER), ("user", t)] for t in tasks])
    final = OPUS.invoke([("system", prompts.SYNTHESIZE), ("user", prompts.join(plan, findings))])
    guards.create_handoff_ticket(state, final, summarizer=HAIKU, priority="P1")
    return {"messages": [final]}

b = StateGraph(State)
b.add_node("guard_in", guards.guard_in)          # Haiku classifier + regex PII
b.add_node("route", route)
b.add_node("faq_rag", faq_rag)
b.add_node("account_agent", account_agent)       # a compiled agent graph as a node
b.add_node("escalate", escalate)
b.add_node("guard_out", guards.guard_out)        # Haiku + hard business rules in code
b.add_edge(START, "guard_in")
b.add_edge("guard_in", "route")
b.add_conditional_edges("route", lambda s: s["intent"], {
    "faq_policy": "faq_rag", "account_action": "account_agent",
    "complex_escalation": "escalate", "out_of_scope": "guard_out"})
for n in ("faq_rag", "account_agent", "escalate"):
    b.add_edge(n, "guard_out")
b.add_edge("guard_out", END)
graph = b.compile(checkpointer=InMemorySaver())`, 'python', 'app/graph.py')}` },
      { label: 'tools.py (interrupt)', html: `<p>החזר כספי: הכלל העסקי נאכף <b>בקוד</b>, והאישור הוא <b>של אדם</b> — דרך <code>interrupt()</code> של LangGraph.</p>${LA.code(`from langchain_core.tools import tool
from langgraph.types import interrupt
from app.services import billing_api, crm, current_customer

MAX_REFUND_ILS = 2000          # business rule lives in code, not in the prompt

@tool
def get_bill(month: str) -> dict:
    """Return the line items of the customer's bill for month 'YYYY-MM'.
    Use when the customer asks about an amount, a charge or a line in a bill."""
    cust = current_customer()                      # identity from the session, never from the model
    bill = billing_api.get_bill(cust.account_id, month, timeout=3)
    return bill.minimal_view()                     # no national ID / address in the context

@tool
def request_refund(amount_ils: float, reason: str) -> str:
    """Request a refund for a verified duplicate or wrong charge. A human agent must approve."""
    if amount_ils <= 0 or amount_ils > MAX_REFUND_ILS:
        return "ERROR: amount outside policy - offer escalation to a human agent."
    cust = current_customer()
    decision = interrupt({                          # graph pauses; state saved by the checkpointer
        "type": "refund_approval", "account_id": cust.account_id,
        "amount_ils": amount_ils, "reason": reason,
    })
    if not decision.get("approved"):
        return "Refund declined by agent: " + decision.get("note", "")
    ref = billing_api.create_refund(cust.account_id, amount_ils,
                                    idempotency_key=decision["request_id"])
    return f"Refund {ref.id} approved: {amount_ils:.2f} ILS"

# --- resuming after the human clicks "approve" in the agent console (api.py) ---
# from langgraph.types import Command
# graph.invoke(Command(resume={"approved": True, "request_id": rid}),
#              config={"configurable": {"thread_id": conversation_id}})`, 'python', 'app/tools.py')}` },
      { label: 'retriever.py', html: `<p>Hybrid (dense + BM25) עם <b>סינון הרשאות באחזור</b>, איחוד RRF ו-rerank.</p>${LA.code(`from qdrant_client import QdrantClient, models
from sentence_transformers import SentenceTransformer, CrossEncoder
from app.bm25 import bm25_search                    # keyword index: tariff codes, numbers

EMB = SentenceTransformer("intfloat/multilingual-e5-large")
RERANK = CrossEncoder("BAAI/bge-reranker-v2-m3")
qdrant = QdrantClient(url="http://qdrant:6333")
COLLECTION = "policies_current"                     # alias -> promoted only after nightly eval
MIN_SCORE = 0.2

def search(query: str, segment: str, k: int = 5):
    acl = models.Filter(must=[models.FieldCondition(
        key="audience", match=models.MatchAny(any=["public", segment]))])
    qv = EMB.encode("query: " + query, normalize_embeddings=True)    # e5 needs the prefix
    dense = qdrant.query_points(COLLECTION, query=qv.tolist(),
                                query_filter=acl, limit=30).points
    sparse = bm25_search(query, audience=["public", segment], limit=30)
    fused = rrf([dense, sparse])[:30]
    scores = RERANK.predict([(query, hit.payload["text"]) for hit in fused])
    ranked = sorted(zip(fused, scores), key=lambda x: -x[1])[:k]
    return [hit for hit, s in ranked if s >= MIN_SCORE]   # empty -> "I don't know"

def rrf(result_lists, k: int = 60):
    """Reciprocal Rank Fusion: score = sum 1 / (k + rank)."""
    score, by_id = {}, {}
    for results in result_lists:
        for rank, hit in enumerate(results):
            score[hit.id] = score.get(hit.id, 0.0) + 1.0 / (k + rank + 1)
            by_id[hit.id] = hit
    return [by_id[i] for i in sorted(score, key=score.get, reverse=True)]

def format_docs(docs):
    return "\\n".join(f'<document id="{d.payload["doc_id"]}">{d.payload["text"]}</document>'
                     for d in docs)`, 'python', 'app/retriever.py')}` },
      { label: 'SKILL.md', html: `<p>Skill שהסוכן טוען רק כשמבקשים הסבר חשבון. ה-<code>description</code> הוא הטריגר — לכן הוא ספציפי.</p>${LA.code(`---
name: hebrew-bill-explainer
description: Explain a Zerem+ electricity bill line by line in plain Hebrew. Use when a
  customer asks why a bill is high, what a line item means, or compares two bills.
  Not for refunds (use refund-policy).
---

# Hebrew bill explainer

## Steps
1. Call get_bill for the month(s) the customer mentions (default: last 2 months).
2. Run scripts/compare_bills.py on the JSON to compute deltas per line item.
   Never do the arithmetic yourself.
3. Explain the top 3 drivers of the change, largest first, in short Hebrew sentences
   (reading level: age 12). Use the customer's own words for the plan name.
4. If consumption rose > 40% while the tariff stayed the same, suggest a meter reading check.
5. Offer a visual explanation (render_bill_visual) only when the customer seems confused.

## Rules
- Amounts: "412.30 ש״ח". Dates: DD/MM/YYYY.
- Do not promise credits or refunds. Do not mention other customers.
- Cite the tariff page id for every tariff fact, e.g. [tariff-2026 §4].`, 'yaml', 'skills/hebrew-bill-explainer/SKILL.md')}` },
      { label: 'comfy_client.py', html: `<p>ה-LLM כותב את ה-prompt לדיפוזיה (בלי PII); ComfyUI מרנדר דרך ה-HTTP API שלו; <b>הטקסט בעברית מוצב בקוד</b> על התמונה.</p>${LA.code(`import json, time, uuid, requests
from app.graph import HAIKU
from app import prompts

COMFY = "http://comfyui-gpu:8188"
WORKFLOW = json.load(open("workflows/bill_infographic_api.json"))   # exported "API format"

def render_bill_visual(summary: dict) -> bytes:
    # 1) LLM writes the image prompt - from an anonymised summary only
    image_prompt = HAIKU.invoke([("system", prompts.VISUAL_PROMPT_WRITER),
                                 ("user", json.dumps(summary))]).content
    wf = json.loads(json.dumps(WORKFLOW))                # deep copy
    wf["6"]["inputs"]["text"] = image_prompt             # CLIPTextEncode (positive)
    wf["3"]["inputs"]["seed"] = 421337                   # KSampler: fixed seed -> reproducible
    # 2) queue the job
    r = requests.post(f"{COMFY}/prompt", json={"prompt": wf, "client_id": str(uuid.uuid4())}, timeout=5)
    prompt_id = r.json()["prompt_id"]
    # 3) poll history (a websocket on /ws is the push-based alternative)
    for _ in range(60):
        hist = requests.get(f"{COMFY}/history/{prompt_id}", timeout=5).json()
        if prompt_id in hist:
            img = hist[prompt_id]["outputs"]["9"]["images"][0]     # SaveImage node
            return requests.get(f"{COMFY}/view", params=img, timeout=10).content
        time.sleep(0.5)
    raise TimeoutError("ComfyUI render timed out")       # UI falls back to text-only`, 'python', 'app/visuals/comfy_client.py')}` },
      { label: 'ClearML pipeline', html: `<p>Pipeline לילי: snapshot של המסמכים כ-Dataset מגורס → אינדוקס ל-collection חדש → eval → <b>קידום alias רק אם עבר את הספים</b>. כל שלב הוא Task עם פרמטרים ומדדים.</p>${LA.code(`from clearml import PipelineDecorator, Dataset, Task

@PipelineDecorator.component(return_values=["dataset_id"], cache=False)
def snapshot_docs(source_dir: str):
    ds = Dataset.create(dataset_project="zerem/support", dataset_name="policies")
    ds.add_files(path=source_dir)
    ds.upload(); ds.finalize()
    return ds.id

@PipelineDecorator.component(return_values=["collection"])
def build_index(dataset_id: str, chunk_size: int, embedding_model: str):
    from app.indexing import index_dataset             # imports inside: runs on a worker
    return index_dataset(dataset_id, chunk_size=chunk_size, model=embedding_model)

@PipelineDecorator.component(return_values=["scores"])
def run_eval(collection: str, golden: str):
    from evals.harness import evaluate
    scores = evaluate(collection=collection, golden=golden)   # recall@5, faithfulness, cost...
    log = Task.current_task().get_logger()
    for name, value in scores.items():
        log.report_scalar(title="nightly_eval", series=name, value=value, iteration=0)
    return scores

@PipelineDecorator.pipeline(name="nightly-reindex-eval", project="zerem/support", version="1.4.0")
def nightly(source_dir="/mnt/policies", chunk_size=400,
            embedding_model="intfloat/multilingual-e5-large"):
    ds = snapshot_docs(source_dir)
    col = build_index(ds, chunk_size, embedding_model)
    scores = run_eval(col, golden="golden_v7")
    if scores["recall@5"] >= 0.88 and scores["faithfulness"] >= 0.95:
        from app.indexing import promote_alias
        promote_alias("policies_current", col)          # atomic switch; yesterday's stays as fallback
    else:
        raise RuntimeError(f"quality gate failed: {scores}")    # alert, keep old index

if __name__ == "__main__":
    PipelineDecorator.set_default_execution_queue("cpu-workers")
    nightly()        # scheduled nightly (ClearML scheduler or an external cron)`, 'python', 'pipelines/nightly_reindex_eval.py')}` }
    ]);
  }

  /* =====================================================================
     SECTION 7 — evaluation plan + dashboard
     ===================================================================== */
  const DASH = [
    { k: 'containment', t: 'Containment', u: '%', target: 60, dir: 1, d: [52, 54, 53, 56, 57, 58, 57, 60, 61, 62, 61, 63, 64, 63] },
    { k: 'faith', t: 'Faithfulness', u: '', target: 0.95, dir: 1, d: [0.94, 0.95, 0.95, 0.96, 0.95, 0.96, 0.96, 0.97, 0.96, 0.93, 0.96, 0.97, 0.97, 0.97] },
    { k: 'p95', t: 'p95 latency', u: 's', target: 4, dir: -1, d: [4.6, 4.4, 4.3, 4.1, 3.9, 3.9, 3.8, 3.7, 3.8, 3.6, 3.6, 3.5, 3.6, 3.5] },
    { k: 'cost', t: 'עלות לשיחה', u: '$', target: 0.03, dir: -1, d: [0.041, 0.039, 0.036, 0.034, 0.033, 0.031, 0.030, 0.029, 0.029, 0.028, 0.028, 0.027, 0.028, 0.027] }
  ];
  function spark(series, target, dir) {
    const W = 220, H = 56, P = 6, mn = Math.min(...series, target), mx = Math.max(...series, target);
    const X = i => P + i * (W - 2 * P) / (series.length - 1), Y = v => H - P - (v - mn) / ((mx - mn) || 1) * (H - 2 * P);
    const svg = LA.s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'cap-spark', style: 'direction:ltr' });
    svg.appendChild(LA.s('line', { x1: P, x2: W - P, y1: Y(target), y2: Y(target), class: 'cap-spark-t' }));
    svg.appendChild(LA.s('polyline', { points: series.map((v, i) => X(i) + ',' + Y(v)).join(' '), class: 'cap-spark-l' }));
    series.forEach((v, i) => {
      const bad = dir > 0 ? v < target : v > target;
      svg.appendChild(LA.s('circle', { cx: X(i), cy: Y(v), r: i === series.length - 1 ? 4 : 2.6, class: 'cap-spark-p' + (bad ? ' bad' : '') },
        LA.s('title', null, `יום ${i + 1}: ${v}`)));
    });
    return svg;
  }
  function renderEval(el) {
    el.insertAdjacentHTML('beforeend', `<h3>תוכנית הערכה</h3>${LA.table(['רכיב', 'מדד', 'יעד', 'שיטה', 'תדירות'], [
      ['שומר קלט', 'recall על תקיפות · FP rate', '≥ 0.95 · ≤ 2%', 'redteam_v3 + 500 הודעות תקינות', 'כל PR'],
      ['מנתב', 'macro-F1, confusion matrix', '≥ 0.92', 'golden_v7 (תווית כוונה)', 'כל PR'],
      ['אחזור', 'recall@5, MRR', '≥ 0.88 · ≥ 0.75', 'מסמכים רלוונטיים מתויגים', 'לילי (ClearML)'],
      ['תשובת RAG', 'faithfulness, correctness', '≥ 0.95 · ≥ 0.85', `שופט ${MB('opus')} מכויל (κ=0.71)`, 'לילי + PR'],
      ['סוכן חשבון', 'tool-call accuracy, task success', '≥ 0.95 · ≥ 0.85', 'sandbox של Billing API עם מצבים קבועים', 'כל PR'],
      ['הסלמה', 'זיהוי דחיפות (recall)', '1.0 על מקרים רפואיים', '40 תיקים מסומנים', 'כל PR'],
      ['סוף-לסוף', 'containment, CSAT, הסלמות', '≥ 60% · ≥ 4.2', 'אונליין, A/B', 'יומי'],
      ['כלכלה וביצועים', 'עלות לשיחה, p95, TTFT', '≤ $0.03 · ≤ 4s · ≤ 1.5s', 'traces', 'רציף']
    ])}<h3>דשבורד (הדגמה — 14 ימים אחרונים)</h3>`);
    const grid = h('div', { class: 'cap-dash' });
    DASH.forEach(m => {
      const last = m.d[m.d.length - 1], prev = m.d[m.d.length - 8];
      const ok = m.dir > 0 ? last >= m.target : last <= m.target;
      const fmt = v => m.u === '%' ? v + '%' : m.u === '$' ? '$' + v.toFixed(3) : m.u === 's' ? v.toFixed(1) + 's' : v.toFixed(2);
      const delta = last - prev, good = m.dir * delta >= 0;
      const card = h('div', { class: 'cap-tile' + (ok ? '' : ' bad') },
        h('div', { class: 'cap-tile-h' }, h('span', null, m.t), h('span', { class: 'badge ' + (ok ? 'ok' : 'warn') }, ok ? '✓ ביעד' : '✗ מתחת ליעד')),
        h('div', { class: 'cap-tile-v' }, fmt(last)),
        h('div', { class: 'cap-tile-n' }, `יעד ${fmt(m.target)} · שבוע: `, h('b', { class: good ? 'cap-up' : 'cap-down' }, (delta >= 0 ? '▲ ' : '▼ ') + fmt(Math.abs(+delta.toFixed(3))))),
        spark(m.d, m.target, m.dir));
      grid.appendChild(card);
    });
    el.appendChild(grid);
    el.insertAdjacentHTML('beforeend', '<p class="cap-small muted">הקו המקווקו = היעד; נקודה אדומה = יום מחוץ ליעד (רחפו לערך). שימו לב לצניחת ה-faithfulness ביום 10 — זה היום שבו נכנס מסמך תעריפים חדש עם טבלה שה-chunker חתך. ה-pipeline הלילי תפס את זה ולא קידם את האינדקס.</p>');
    // release gate
    const lab = h('div', { class: 'lab' }, h('div', { class: 'lab-h' }, '🚦 שער שחרור: האם מותר לשחרר את prompt v15?'));
    lab.insertAdjacentHTML('beforeend', '<p class="muted">הזיזו את תוצאות ה-eval של הגרסה החדשה. השער דורש שכל מדד חוסם יעמוד ביעד <b>וגם</b> לא ייסוג ביותר מ-2 נק׳ מהגרסה הנוכחית.</p>');
    const G = [
      { t: 'Router macro-F1', base: 0.94, v: 0.95, min: 0.92, block: true },
      { t: 'recall@5', base: 0.90, v: 0.91, min: 0.88, block: true },
      { t: 'Faithfulness', base: 0.96, v: 0.95, min: 0.95, block: true },
      { t: 'Task success (סוכן)', base: 0.86, v: 0.87, min: 0.85, block: true },
      { t: 'Red-team: תקיפות שהצליחו', base: 0, v: 0, min: 0, block: true, inv: true, max: 10, step: 1 },
      { t: 'עלות לשיחה ($)', base: 0.027, v: 0.029, min: 0.03, block: false, inv: true, max: 0.06, step: 0.001 }
    ];
    const res = h('div');
    function gate() {
      const rows = G.map(g => {
        const meets = g.inv ? g.v <= g.min : g.v >= g.min;
        const regress = g.inv ? (g.step === 1 ? g.v > g.base : g.v > g.base * 1.15) : (g.base - g.v) > 0.02 + 1e-9;
        const pass = meets && !regress;
        return { g, pass, meets, regress };
      });
      const blockFail = rows.filter(r => r.g.block && !r.pass);
      const warn = rows.filter(r => !r.g.block && !r.pass);
      res.innerHTML = LA.table(['מדד', 'נוכחי', 'חדש', 'יעד', 'סטטוס'], rows.map(r => [r.g.t + (r.g.block ? '' : ' <span class="cap-small muted">(מתריע)</span>'), String(r.g.base), `<b>${r.g.v}</b>`, (r.g.inv ? '≤ ' : '≥ ') + r.g.min,
        r.pass ? '<span class="badge ok">עובר</span>' : `<span class="badge warn">${!r.meets ? 'מתחת ליעד' : 'נסיגה'}</span>`])) +
        `<div class="cap-verdict ${blockFail.length ? 'bad' : 'ok'}">${blockFail.length ? '🛑 חסום — ' + blockFail.map(r => r.g.t).join(', ') : warn.length ? '⚠️ מותר לשחרר ל-canary, עם התראה על: ' + warn.map(r => r.g.t).join(', ') : '✅ עובר — אפשר להתקדם ל-shadow/canary'}</div>`;
    }
    G.forEach(g => lab.appendChild(LA.slider(g.t, g.inv ? 0 : 0.7, g.inv ? g.max : 1, g.step || 0.01, g.v, v => { g.v = v; gate(); }, v => g.step === 1 ? String(v) : v.toFixed(g.step === 0.001 ? 3 : 2))));
    lab.appendChild(res); el.appendChild(lab); gate();
  }

  /* =====================================================================
     SECTION 8 — risks & mitigations
     ===================================================================== */
  const RISKS = [
    { id: 'R1', t: 'החזר כספי שגוי', l: 2, i: 3, m: 'interrupt() לכל החזר; תקרה בקוד; idempotency key; דוח יומי של החזרים שאושרו מול חיובים כפולים בפועל.' },
    { id: 'R2', t: 'Indirect injection במסמך', l: 2, i: 3, m: 'מסמכים רק ממקור פנימי חתום; עטיפה בתגיות; סוכן החשבון לא רואה תוכן RAG חופשי; כלים עם least privilege; red-team לילי.' },
    { id: 'R3', t: 'הזיית מדיניות', l: 3, i: 2, m: 'RAG + ציטוט חובה; בדיקת groundedness; "אין לי מידע" + העברה לנציג; faithfulness לילי.' },
    { id: 'R4', t: 'אי-זיהוי דחיפות רפואית', l: 1, i: 3, m: 'מסווג ייעודי + מילות מפתח דטרמיניסטיות (OR, לא AND); recall=1.0 כשער חוסם; ניתוב ישיר לנציג.' },
    { id: 'R5', t: 'דליפת PII בלוגים', l: 2, i: 2, m: 'redaction לפני לוג/trace; retention 30 יום; גישה לפי תפקיד; ת״ז לא נשלחת למודל.' },
    { id: 'R6', t: 'Drift אחרי שינוי תעריפים', l: 3, i: 2, m: 'pipeline לילי ב-ClearML; PSI על תמהיל כוונות; עדכון golden set מהלוגים כל חודש.' },
    { id: 'R7', t: 'עלות מתנפחת', l: 2, i: 1, m: 'תקציב צעדים לסוכן; התראה על עלות לשיחה > $0.05; caching; ניטור תמהיל Opus.' },
    { id: 'R8', t: 'השבתת ספק / latency', l: 1, i: 2, m: 'timeouts; fallback Opus→Sonnet; הודעת "נציג יחזור אליך"; ComfyUI אסינכרוני ואופציונלי.' },
    { id: 'R9', t: 'טקסט משובש בתמונה', l: 3, i: 1, m: 'דיפוזיה לאיור בלבד; כל טקסט ומספר מוצבים בקוד; בדיקה ויזואלית בדגימה.' }
  ];
  function renderRisks(el) {
    el.insertAdjacentHTML('beforeend', '<p>מטריצת סיכונים: <b>סבירות × השפעה</b>. לחצו על סיכון למיטיגציה.</p>');
    const wrap = h('div', { class: 'cap-risk-wrap' });
    const grid = h('div', { class: 'cap-risk' });
    const detail = h('div', { class: 'card cap-risk-d' }, h('div', { class: 'muted' }, 'בחרו סיכון מהמטריצה'));
    const L = ['נמוכה', 'בינונית', 'גבוהה'];
    for (let imp = 3; imp >= 1; imp--) {
      grid.appendChild(h('div', { class: 'cap-risk-ax' }, 'השפעה ' + L[imp - 1]));
      for (let lik = 1; lik <= 3; lik++) {
        const sev = imp * lik;
        const cell = h('div', { class: 'cap-risk-c sev' + (sev >= 6 ? 3 : sev >= 3 ? 2 : 1) });
        RISKS.filter(r => r.l === lik && r.i === imp).forEach(r => cell.appendChild(h('button', { type: 'button', class: 'cap-risk-b', onclick: () => {
          grid.querySelectorAll('.cap-risk-b').forEach(b => b.classList.remove('on')); cell.querySelectorAll('.cap-risk-b').forEach(b => { if (b.textContent.startsWith(r.id)) b.classList.add('on'); });
          detail.innerHTML = `<h4>${r.id} · ${esc(r.t)}</h4><div class="pill-row"><span class="pill">סבירות: ${L[r.l - 1]}</span><span class="pill">השפעה: ${L[r.i - 1]}</span></div><p><b>🛡️ מיטיגציה:</b> ${esc(r.m)}</p>`;
        } }, r.id + ' ' + r.t)));
        grid.appendChild(cell);
      }
    }
    grid.appendChild(h('div'));
    L.forEach(l => grid.appendChild(h('div', { class: 'cap-risk-ax b' }, 'סבירות ' + l)));
    wrap.append(grid, detail);
    el.appendChild(wrap);
  }

  /* =====================================================================
     SECTION 9 — rollout
     ===================================================================== */
  function renderRollout(el) {
    el.insertAdjacentHTML('beforeend', '<p>לא משחררים מערכת כזו ב"מתג". כל שלב פותח רק אחרי שהשער של הקודם עבר.</p>');
    const box = h('div'); el.appendChild(box);
    const phases = [
      ['0 · Offline', 'שבועות 1–4', 'golden set + red-team ב-CI. כל רכיב עובר את היעדים שלו.', 'כל השערים החוסמים ירוקים'],
      ['1 · Shadow', 'שבועות 5–6', 'המערכת רצה על 100% מהפניות <b>בלי להציג ללקוח</b>; התשובות נשמרות ומושוות לתשובות הנציגים. אף כלי כותב (החזר/טיקט) לא פעיל.', 'הסכמה עם נציגים ≥ 85% על דגימה של 500; 0 אירועי בטיחות'],
      ['2 · Canary 5%', 'שבוע 7', '5% מהלקוחות (רק FAQ + צפייה בחשבון). כפתור נציג בולט. ניטור יומי.', 'containment ו-CSAT לא נחותים מהמוקד (ראו מחשבון)'],
      ['3 · Canary 25%', 'שבועות 8–9', 'פותחים את סוכן החשבון עם החזרים באישור נציג.', 'task success ≥ 85%; 0 החזרים שגויים'],
      ['4 · GA', 'שבוע 10+', '100%, כולל מתכנן ההסלמה. Kill switch שמחזיר למוקד אנושי בקליק.', 'ניטור רציף; ביקורת שבועית של 50 שיחות']
    ];
    LA.stepper(box, { intro: 'לחצו "הבא" כדי לעבור בין שלבי ההשקה', steps: phases.map(([t, w, d, g]) => ({ title: t, html: `<div class="cap-phase"><span class="pill">${w}</span><p>${d}</p><p><b>🚦 שער מעבר:</b> ${g}</p></div>` })) });
    // canary duration calculator
    const lab = h('div', { class: 'lab' }, h('div', { class: 'lab-h' }, '🧮 כמה זמן צריך canary כדי לזהות ירידה?'));
    const st = { conv: 12000, share: 0.05, base: 0.62, mde: 0.03 };
    const out = h('div');
    function calc() {
      const p1 = st.base, p2 = Math.max(0.001, p1 - st.mde), pb = (p1 + p2) / 2, za = 1.96, zb = 0.8416;
      const n = Math.ceil(Math.pow(za * Math.sqrt(2 * pb * (1 - pb)) + zb * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2) / Math.pow(p1 - p2, 2));
      const perDay = st.conv * st.share, days = n / perDay;
      out.innerHTML = `<div class="cap-kpis">${kpi('שיחות נדרשות בזרוע ה-canary', intFmt(n), `לזהות ירידה מ-${pct(p1, 0)} ל-${pct(p2, 0)}`)}${kpi('שיחות ביום ב-canary', intFmt(perDay))}${kpi('ימים נדרשים', days < 1 ? '< 1' : days.toFixed(1), 'α=0.05, עוצמה 80%', days > 14 ? 'bad' : 'ok')}</div>
        <p class="cap-small muted">${days > 14 ? 'יותר משבועיים — הגדילו את אחוז ה-canary או קבלו MDE גדול יותר.' : 'זמן סביר. זכרו להריץ לפחות שבוע מלא בגלל עונתיות (ראשון ≠ שישי).'}</p>`;
    }
    lab.append(LA.slider('שיחות ביום (סה״כ)', 1000, 50000, 500, st.conv, v => { st.conv = v; calc(); }, intFmt),
      LA.slider('אחוז canary', 0.01, 0.5, 0.01, st.share, v => { st.share = v; calc(); }, v => pct(v, 0)),
      LA.slider('containment בסיסי', 0.3, 0.9, 0.01, st.base, v => { st.base = v; calc(); }, v => pct(v, 0)),
      LA.slider('ירידה מינימלית לזיהוי', 0.01, 0.1, 0.005, st.mde, v => { st.mde = v; calc(); }, v => pct(v, 1)), out);
    el.appendChild(lab); calc();
  }

  /* =====================================================================
     SECTION 10 — build-it-yourself exercises
     ===================================================================== */
  const EX = [
    ['1', 'מנתב עם eval', 'בנו מנתב כוונות על ' + MB('haiku') + ' ו-golden set של 60 הודעות. חשבו confusion matrix ו-macro-F1.', ['התחילו עם 4 מחלקות + "out_of_scope".', 'השתמשו ב-structured output כדי לקבל JSON תקין.', 'הוסיפו ספי ביטחון: מה קורה ל-F1 אם מעבירים ביטחון < 0.7 למסלול חזק?'], '#/langgraph'],
    ['2', 'RAG על 20 מסמכי מדיניות', 'אינדקסו 20 דפי מדיניות (כתבו בעצמכם או קחו תקנון ציבורי), ומדדו recall@5 על 30 שאלות.', ['השוו chunk של 200 מול 600 טוקנים — רשמו ב-ClearML.', 'הוסיפו BM25 ו-RRF; שאלה עם קוד תעריף היא מבחן טוב.', 'בדקו את המעבדה במודול האלגוריתמאי לחישוב nDCG.'], '#/rag'],
    ['3', 'סוכן עם אישור אדם', 'בנו סוכן LangGraph עם get_bill (מזויף) ו-request_refund שקורא ל-interrupt().', ['השתמשו ב-InMemorySaver ו-thread_id קבוע.', 'בדקו שה-State שורד בין invoke ל-Command(resume=...).', 'נסו להגיע ל-refund בלי אישור — אסור שיצליח.'], '#/agents'],
    ['4', 'Skill ראשון', 'כתבו SKILL.md להסבר חשבון ובדקו שהוא נטען רק בשאלות רלוונטיות.', ['כתבו 10 שאלות שצריכות את ה-Skill ו-10 שלא.', 'מדדו trigger precision/recall; שפרו את ה-description.', 'העבירו חישובים לסקריפט — לא למודל.'], '#/skills'],
    ['5', 'איור מ-ComfyUI', 'בנו workflow בסיסי, ייצאו ב-API format והפעילו מ-Python עם prompt ש-' + MB('haiku') + ' כתב.', ['קבעו seed וודאו שתמונה זהה חוזרת.', 'הוסיפו את המספרים כשכבת טקסט ב-HTML/PIL — לא בדיפוזיה.', 'מדדו זמן רינדור ו-VRAM.'], '#/comfyui'],
    ['6', 'Pipeline לילי + שער', 'בנו pipeline ב-ClearML: snapshot → index → eval → promote, שנכשל כשהמדד יורד.', ['התחילו עם PipelineDecorator והרצה מקומית.', 'הכניסו "באג" מכוון (chunk שחותך טבלה) וודאו שהשער עוצר.', 'השוו שתי ריצות בממשק ClearML.'], '#/clearml']
  ];
  function renderExercises(el) {
    el.insertAdjacentHTML('beforeend', '<p>בנו את המערכת בהדרגה. כל תרגיל עומד בפני עצמו ומתחבר לפרק בקורס. לחצו "רמז" כשנתקעים.</p>');
    const grid = h('div', { class: 'grid2' });
    EX.forEach(([n, t, d, hints, link]) => {
      let shown = 0;
      const hb = h('ol', { class: 'cap-hints' });
      const btn = h('button', { type: 'button', class: 'btn ghost', onclick: () => { if (shown < hints.length) { hb.appendChild(h('li', { html: hints[shown++] })); } if (shown >= hints.length) { btn.disabled = true; btn.textContent = 'אין עוד רמזים'; } else btn.textContent = `💡 רמז (${shown}/${hints.length})`; } }, `💡 רמז (0/${hints.length})`);
      grid.appendChild(h('div', { class: 'card cap-ex' }, h('h4', null, `תרגיל ${n}: ${t}`), h('p', { html: d }), hb, h('div', { class: 'pill-row' }, btn, h('a', { class: 'btn', href: link }, 'לפרק הרלוונטי ←'))));
    });
    el.appendChild(grid);
    el.insertAdjacentHTML('beforeend', LA.callout('tip', 'אתגר מסכם: חברו את תרגילים 1–6 לשירות אחד, הריצו את 3 התרחישים מהסעיף "מעקב בקשה", ומלאו את <a href="#/algorithmist">הצ׳קליסט לפני פרודקשן</a>.'));
  }

  /* =====================================================================
     QUIZ + REGISTER
     ===================================================================== */
  const QUIZ = [
    { q: 'למה המנתב (intent router) רץ על Haiku ולא על Opus?',
      options: ['כי Opus לא תומך ב-structured output', 'כי זה סיווג פשוט בנפח מלא (כל הודעה); Haiku עומד ביעד F1 בשבריר מהעלות וה-latency', 'כי Haiku חכם יותר', 'אין סיבה, זה שרירותי'],
      answer: 1, explain: 'משימה סגורה × נפח גבוה × רגישות ל-latency = Haiku. מדדו F1 על golden set; משדרגים רק אם יש פער שחשוב.' },
    { q: 'איפה נאכפת תקרת ההחזר הכספי (₪2,000) במערכת?',
      options: ['ב-system prompt של הסוכן', 'בקוד של הכלי request_refund, ובנוסף אישור נציג דרך interrupt()', 'בתוך ה-Skill בלבד', 'ב-ClearML'],
      answer: 1, explain: 'כללים עסקיים והרשאות — בקוד. ה-prompt יכול להיעקף (injection, טעות); הקוד לא. אישור אדם מוסיף שכבה לפעולות כספיות.' },
    { q: 'מה התפקיד של ClearML במערכת?',
      options: ['להגיש את התשובות ללקוח', 'מעקב ניסויים (embeddings, chunking, prompts) ו-pipeline לילי שמקדם אינדקס רק אם עבר eval', 'להריץ את ה-LLM', 'לנהל את ה-widget'],
      answer: 1, explain: 'ClearML הוא מסילת ה-MLOps: שחזוריות, השוואת תצורות ואוטומציה של re-index + eval עם שער איכות.' },
    { q: 'למה ComfyUI לא כותב את המספרים והטקסט העברי בתוך האינפוגרפיקה?',
      options: ['כי זה איטי', 'כי מודלי דיפוזיה משבשים טקסט (במיוחד עברית) — מציבים טקסט ומספרים בקוד מעל האיור', 'כי אסור להשתמש בעברית', 'כי ה-LLM לא יודע עברית'],
      answer: 1, explain: 'דיפוזיה טובה באיור, לא בטיפוגרפיה מדויקת. מספר כספי שגוי בתמונה = סיכון אמון. לכן: איור מהדיפוזיה, טקסט מהקוד.' },
    { q: 'במה שונה תרחיש ההסלמה (Opus) מבחינת latency, ומה עושים עם זה?',
      options: ['הוא מהיר יותר כי Opus חזק', 'הוא לוקח ~20 שנ׳ (תכנון + workers + סינתזה) — שולחים הודעת ביניים ומריצים workers במקביל', 'אין הבדל', 'מבטלים את התכנון'],
      answer: 1, explain: 'מקביליות מקצרת (latency = האיטי מבין ה-workers), והודעת ביניים מנהלת ציפיות. בתיק דחוף — נציג אנושי מקבל עדיפות מיד.' },
    { q: 'לפני GA, ה-canary ב-5% מקבל 600 שיחות ביום. כדי לזהות ירידה של 3 נק׳ ב-containment סביב 62% צריך ~4,000 שיחות. מה נכון?',
      options: ['יום אחד מספיק', 'צריך כשבוע (≈ 4,000 / 600) — ולפחות שבוע מלא בגלל עונתיות', 'צריך שנה', 'אי אפשר לדעת'],
      answer: 1, explain: 'חישוב גודל מדגם → משך ה-canary. פחות מזה = "לא ראינו בעיה" לא אומר "אין בעיה".' }
  ];

  LA.register({
    id: 'capstone', order: 110, group: 'pro', icon: '🏗️', short: 'פרויקט מסכם', title: 'פרויקט מסכם — מערכת אחת שמחברת הכל',
    render(main) {
      LA.page(main, {
        icon: '🏗️', title: 'פרויקט מסכם — מערכת אחת שמחברת הכל',
        subtitle: `"נגה" — עוזרת AI לשירות לקוחות של ספק חשמל ישראלי (בדיוני): Chat UI, LangGraph, סוכנים ותתי-סוכנים, Skills, RAG, ComfyUI ו-ClearML — עם ניתוב מודלים מנומק לכל צעד.`,
        sections: [
          { id: 'req', title: 'הבעיה, המשתמשים והדרישות', render: renderReq },
          { id: 'arch', title: 'ארכיטקטורה — מהמערכת עד הנוירון', render: renderArch },
          { id: 'routing', title: 'ניתוב מודלים ועלות לשיחה', render: renderRouting },
          { id: 'trace', title: 'מעקב בקשה מקצה לקצה — 3 תרחישים', render: renderTrace },
          { id: 'tree', title: 'מבנה הפרויקט', render: renderTree },
          { id: 'code', title: 'קבצי קוד מרכזיים', render: renderCode },
          { id: 'eval', title: 'תוכנית הערכה ודשבורד', render: renderEval },
          { id: 'risks', title: 'סיכונים ומיטיגציות', render: renderRisks },
          { id: 'rollout', title: 'תוכנית השקה: shadow → canary → GA', render: renderRollout },
          { id: 'ex', title: 'בנו בעצמכם — תרגילים', render: renderExercises },
          { id: 'profile', title: 'דרישות · חוזקות · חולשות של הארכיטקטורה', html: LA.profile({
            requirements: ['golden set של 300 פניות + red-team לפני קוד', 'API-ים פנימיים עם הרשאות לפי לקוח ו-idempotency', 'Qdrant, Postgres, שרת GPU ל-ComfyUI, שרת ClearML', 'צוות נציגים לאישורים ולהסלמות'],
            strengths: ['כל צעד במודל המתאים — עלות לשיחה ~פי 100 זולה מנציג', 'בקרה דטרמיניסטית (LangGraph) סביב שיקול דעת (LLM)', 'אדם בלולאה בכל פעולה כספית או רגישה', 'שחזוריות מלאה: prompts, אינדקס ו-eval מגורסים'],
            weaknesses: ['מורכבות תפעולית: 6 שירותים + GPU', 'הרבה נקודות שצריך למדוד (12 תפקידי LLM)', 'תלות בספק המודלים — דורש fallback', 'איכות תלויה בעדכניות מסמכי המדיניות'],
            algoTips: ['מדדו כל שורה בטבלת הניתוב — כל בחירת מודל צריכה מספר שמצדיק אותה', 'מעקב אחר תמהיל ה-Opus: אם ההסלמות עולות מ-5% ל-15%, העלות משתנה מהותית', 'שערי איכות ב-CI ובלילה — לא רק לפני שחרור', 'Drift: עדכון golden set חודשי מתוך פניות אמיתיות'],
            whenToUse: ['<b>מתאים:</b> שירות בנפח גבוה עם ידע מתועד ופעולות מוגדרות.', '<b>פחות מתאים:</b> נפח נמוך מאוד (נציג זול יותר מהבנייה), או תחום ללא מסמכים אמינים.']
          }) + LA.callout('llm', `במערכת אחת ה-LLM ממלא תפקידים שונים לגמרי: <b>מסווג</b> (${MB('haiku')}), <b>קורא ומסכם מסמכים</b> (${MB('sonnet')}), <b>מפעיל כלים</b> (${MB('sonnet')}), <b>מתכנן</b> (${MB('opus')}), <b>כותב prompts למודל אחר</b> (ComfyUI) ו<b>שופט</b> (eval). המיומנות של אלגוריתמאי AI היא לזהות לכל תפקיד את המודל, ה-context והבקרה הנכונים.`) },
          { id: 'quiz', title: 'בוחן', render: el => LA.quiz(el, QUIZ) }
        ]
      });
    }
  });
})();
