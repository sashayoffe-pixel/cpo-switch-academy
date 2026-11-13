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
      { from: 'widget', to: 'api', label: 'SSE', both: true },
      { from: 'api', to: 'graph' }, { from: 'graph', to: 'claude', label: 'per-node model' },
      { from: 'graph', to: 'tools' }, { from: 'graph', to: 'rag' }, { from: 'graph', to: 'skills' },
      { from: 'api', to: 'pg' }, { from: 'rag', to: 'vdb' }, { from: 'graph', to: 'comfy', bend: 25 },
      { from: 'clearml', to: 'skills', dashed: true, color: 'store', label: 'גרסאות' },
      { from: 'clearml', to: 'comfy', dashed: true, color: 'store' },
      { from: 'clearml', to: 'claude', dashed: true, color: 'store', label: 'eval' }
    ]
  };
