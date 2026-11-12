(function () {
  'use strict';
  const { h, s, esc } = LA;

  /* ---------- shared helpers ---------- */
  // Crude, illustrative token estimator: Hebrew ~2.3 chars/token, Latin ~4 chars/token, +4 overhead per message.
  function estTok(text) {
    let heb = 0, other = 0;
    for (const ch of String(text)) { if (ch >= '֐' && ch <= '׿') heb++; else other++; }
    return Math.max(1, Math.ceil(heb / 2.3 + other / 4));
  }
  const fmtMoney = v => '$' + (v < 0.01 ? v.toFixed(5) : v.toFixed(4));

  /* ---------- diagrams ---------- */
  function messageSpec() {
    return {
      title: 'אובייקט הודעה אחד', width: 900, height: 420,
      intro: `<h4>הרמה הקטנה ביותר: הודעה אחת</h4><p>כל ה"שיחה" היא רשימה של אובייקטים כאלה. לחצו על כל חלק כדי לראות מה הוא עושה.</p>`,
      nodes: [
        { id: 'msg', x: 780, y: 210, w: 150, h: 70, label: 'Message', sub: '{role, content}', color: 'ui', info: `<p>אובייקט JSON אחד ברשימת <code>messages</code>. אין לו "זיכרון" משלו — הוא סתם נתונים. המודל רואה את כל הרשימה כטקסט אחד ארוך (אחרי tokenization).</p>` },
        { id: 'role', x: 520, y: 60, w: 170, label: 'role', sub: 'user | assistant', color: 'ctrl', info: `<p>מי "דיבר". ב-Anthropic API התפקידים בתוך <code>messages</code> הם <code>user</code> ו-<code>assistant</code> בלבד; ה-system prompt נשלח בשדה נפרד <code>system</code>. תוצאות כלים חוזרות כ-<code>user</code> עם בלוק <code>tool_result</code>. ב-API של ספקים אחרים יש גם <code>system</code> ו-<code>tool</code> כ-roles.</p><p>הודעות חייבות להתחלף user/assistant (או שה-API ימזג רצפים).</p>` },
        { id: 'text', x: 520, y: 150, w: 170, label: 'בלוק text', sub: '{type:"text"}', color: 'data', info: `<p><code>content</code> יכול להיות מחרוזת פשוטה או רשימת בלוקים. בלוק טקסט = מה שהמשתמש כתב / מה שהמודל ענה.</p>${LA.code('{"type": "text", "text": "מה יתרת החוב שלי?"}', 'json')}` },
        { id: 'tool_use', x: 520, y: 240, w: 170, label: 'בלוק tool_use', sub: 'המודל מבקש כלי', color: 'tool', info: `<p>המודל <b>לא מריץ</b> כלים. הוא מחזיר בלוק שמבקש מהאפליקציה שלכם להריץ פונקציה. ה-<code>id</code> חשוב — ה-tool_result חייב להפנות אליו.</p>${LA.code('{"type":"tool_use","id":"toolu_01A","name":"get_balance",\n "input":{"customer_id":"C-1042"}}', 'json')}` },
        { id: 'tool_result', x: 520, y: 330, w: 170, label: 'בלוק tool_result', sub: 'התשובה מהאפליקציה', color: 'tool', info: `<p>האפליקציה מריצה את הפונקציה ושולחת את התוצאה חזרה בהודעת <code>user</code>. בצ'אט UI זה נראה כ"חושב... בודק חשבון..." ואז התשובה.</p>${LA.code('{"type":"tool_result","tool_use_id":"toolu_01A",\n "content":"יתרה: 312.40 ש\\"ח"}', 'json')}` },
        { id: 'stop', x: 230, y: 130, w: 170, label: 'stop_reason', sub: 'רק בתשובת המודל', color: 'warn', info: `<p>למה המודל עצר: <code>end_turn</code> (סיים), <code>max_tokens</code> (נחתך — בדקו!), <code>tool_use</code> (מחכה לכם להריץ כלי), <code>stop_sequence</code>, <code>refusal</code>.</p><p>באלגוריתמאי: לוגו את stop_reason; עלייה ב-<code>max_tokens</code> = תשובות שנחתכות באמצע.</p>` },
        { id: 'usage', x: 230, y: 290, w: 170, label: 'usage', sub: 'input/output tokens', color: 'store', info: `<p>ספירת הטוקנים האמיתית שחויבתם עליה: <code>input_tokens</code>, <code>output_tokens</code> (ובנוסף cache_creation/cache_read אם משתמשים ב-prompt caching). זו הדרך היחידה לדעת מה עלות כל תור — אל תנחשו.</p>` }
      ],
      edges: [{ from: 'msg', to: 'role' }, { from: 'msg', to: 'text' }, { from: 'msg', to: 'tool_use' }, { from: 'msg', to: 'tool_result' }, { from: 'tool_use', to: 'stop', dashed: true }, { from: 'tool_result', to: 'usage', dashed: true }]
    };
  }

  function builderSpec() {
    return {
      title: 'Prompt builder', width: 900, height: 430,
      intro: `<h4>איך מרכיבים את ה-prompt</h4><p>לפני כל קריאה ל-LLM ה-backend "מרכיב" את כל מה שהמודל יראה. כל חלק תופס טוקנים — וכל טוקן עולה כסף ו-latency.</p>`,
      nodes: [
        { id: 'sys', x: 790, y: 60, w: 170, label: 'System prompt', sub: 'זהות, כללים, פורמט', color: 'ctrl', info: `<p>הוראות קבועות: מי אתם, מה מותר ואסור, טון, פורמט פלט, מדיניות סירוב. יציב בין תורות — מועמד מצוין ל-<b>prompt caching</b>.</p><p>נתון בשדה <code>system</code> ולא ב-messages.</p>` },
        { id: 'mem', x: 790, y: 150, w: 170, label: 'זיכרון / סיכום', sub: 'long-term memory', color: 'store', info: `<p>עובדות על המשתמש ("לקוח עסקי, תעריף ב'") שנשלפו ממאגר, או סיכום של תורות ישנות שנדחסו (compaction). מוזרק כטקסט בתחילת ה-prompt.</p>` },
        { id: 'hist', x: 790, y: 240, w: 170, label: 'חלון היסטוריה', sub: 'N תורות אחרונות', color: 'data', info: `<p>ההודעות האחרונות מה-session store. כאן מתקבלת ההחלטה: כמה להחזיק? כל החלון, חלון הזזה, או סיכום + זנב.</p>` },
        { id: 'rag', x: 790, y: 330, w: 170, label: 'הקשר (RAG)', sub: 'chunks שנשלפו', color: 'data', info: `<p>מסמכים רלוונטיים לשאלה הנוכחית, בתוך תגיות ברורות כמו <code>&lt;documents&gt;</code>. ראו מודול RAG. שימו לב: טקסט שנשלף הוא <b>נתון</b>, לא הוראה (הגנה מ-prompt injection).</p>` },
        { id: 'tools', x: 790, y: 400, w: 170, h: 44, label: 'הגדרות כלים', color: 'tool', info: `<p>JSON schema של כל כלי. תופס טוקנים בכל קריאה — 30 כלים גדולים יכולים לתפוס אלפי טוקנים. נתנו רק כלים רלוונטיים לתור.</p>` },
        { id: 'user', x: 480, y: 330, w: 150, label: 'הודעת משתמש', sub: 'התור הנוכחי', color: 'ui', info: `<p>מה שנשלח זה עתה. אחרי sanitization (אורך, תווים, סינון).</p>` },
        { id: 'asm', x: 480, y: 190, w: 170, h: 80, label: 'הרכבה', sub: 'ספירת טוקנים + תקציב', shape: 'round', color: 'llm', info: `<p>הלוגיקה: מחשבים טוקנים (<code>count_tokens</code>), משווים לתקציב (חלון − מקום לפלט), ואם חורגים — חותכים/מסכמים לפי מדיניות. סדר מומלץ: חומר יציב קודם (system, tools), חומר משתנה אחרון — לטובת caching.</p>` },
        { id: 'out', x: 130, y: 190, w: 170, h: 70, label: 'Request body', sub: 'system + messages[] + tools', color: 'ok', children: messageSpec(), info: `<p>הפלט: גוף הבקשה ל-API. <b>לחצו "צלול"</b> כדי לראות מבנה של הודעה בודדת.</p>${LA.code('{\n  "model": "claude-sonnet-5-5",\n  "max_tokens": 1024,\n  "system": "...",\n  "messages": [ {...}, {...} ],\n  "tools": [ ... ]\n}', 'json')}` }
      ],
      edges: [{ from: 'sys', to: 'asm' }, { from: 'mem', to: 'asm' }, { from: 'hist', to: 'asm' }, { from: 'rag', to: 'asm' }, { from: 'tools', to: 'asm' }, { from: 'user', to: 'asm' }, { from: 'asm', to: 'out' }]
    };
  }

  function backendSpec() {
    return {
      title: 'Backend', width: 920, height: 440,
      intro: `<h4>בתוך ה-Backend</h4><p>ה-backend הוא המוח התפעולי של הצ'אט: הוא מחזיק את ה-API key, את ההיסטוריה, ואת כללי הבטיחות. זרימה מימין לשמאל.</p>`,
      nodes: [
        { id: 'req', x: 840, y: 200, w: 120, label: 'בקשה', sub: 'POST /chat', color: 'ui', info: `<p>מגיעה מה-frontend: <code>{session_id, message}</code>. שימו לב — ה-frontend שולח רק את ההודעה החדשה, לא את ההיסטוריה (השרת מחזיק אותה, וגם כך המשתמש לא יכול "לשכתב" היסטוריה).</p>` },
        { id: 'gin', x: 690, y: 200, w: 130, label: 'Guardrails', sub: 'קלט', color: 'warn', info: `<p>Auth, rate limit, הגבלת אורך, זיהוי PII, סיווג כוונה/מודרציה. אידיאלי למודל קטן ומהיר (${LA.modelBadge('haiku')}) שרץ <i>לפני</i> המודל היקר, ואפילו במקביל אליו.</p>` },
        { id: 'builder', x: 530, y: 200, w: 140, h: 66, label: 'Prompt builder', sub: 'לחצו וצללו', color: 'llm', children: builderSpec(), info: `<p>מרכיב system + זיכרון + היסטוריה + הקשר + כלים. כאן נקבע מה המודל בכלל "יודע" בתור הזה. <b>צלילה פנימה</b> מראה את החלקים.</p>` },
        { id: 'llmc', x: 365, y: 200, w: 130, label: 'LLM client', sub: 'retry · timeout', color: 'llm', info: `<p>עטיפה סביב ה-SDK: timeouts, retry עם backoff על 429/529, בחירת מודל (routing), מדידת usage, מניעת שליחת ה-key הלאה. כאן מנתבים: Haiku → Sonnet → Opus.</p>` },
        { id: 'relay', x: 215, y: 200, w: 130, label: 'Streaming', sub: 'SSE relay', color: 'ui', info: `<p>מקבל <code>text_delta</code> מה-SDK ומעביר ל-browser כ-Server-Sent Events. חשוב: לבטל את הקריאה ל-LLM אם הלקוח התנתק (אחרת משלמים על טוקנים שאף אחד לא קורא).</p>` },
        { id: 'gout', x: 215, y: 330, w: 130, label: 'Guardrails', sub: 'פלט', color: 'warn', info: `<p>בדיקת פלט: דליפת סודות/PII, ציות לפורמט, סירוב נדרש. בזרימה: בודקים כל chunk או מחזיקים buffer קצר; או בודקים רק בסוף ומסמנים.</p>` },
        { id: 'store', x: 530, y: 360, w: 140, h: 62, label: 'Session store', sub: 'Redis / Postgres', shape: 'db', color: 'store', info: `<p>היסטוריה לפי <code>session_id</code>. כל הודעה נשמרת אחרי תור מוצלח, יחד עם usage, stop_reason ומזהה גרסת prompt — בסיס ל-evals ולדיבוג.</p>` },
        { id: 'obs', x: 365, y: 70, w: 130, label: 'Observability', sub: 'logs · cost · traces', color: 'ext', info: `<p>לוג כל קריאה: טוקנים, latency (TTFT + סה"כ), עלות, גרסת prompt, 👍/👎. בלי זה אי אפשר לשפר או לדבג.</p>` },
        { id: 'tools', x: 690, y: 70, w: 130, label: 'Tool executor', sub: 'מריץ בקשות tool_use', color: 'tool', info: `<p>כשהמודל מחזיר <code>tool_use</code>, ה-backend מריץ את הפונקציה (עם הרשאות של המשתמש!), ומחזיר tool_result — בלולאה עד <code>end_turn</code>.</p>` }
      ],
      edges: [{ from: 'req', to: 'gin' }, { from: 'gin', to: 'builder' }, { from: 'builder', to: 'llmc' }, { from: 'llmc', to: 'relay' }, { from: 'relay', to: 'gout', dashed: true }, { from: 'builder', to: 'store', both: true }, { from: 'llmc', to: 'obs', dashed: true }, { from: 'llmc', to: 'tools', both: true, bend: 40, dashed: true }]
    };
  }

  function topSpec() {
    return {
      width: 940, height: 430, title: 'מערכת צ\'אט',
      intro: `<h4>מערכת צ'אט — מבט על</h4><p>הצ'אט הוא <b>אפליקציה רגילה</b> סביב קריאה ל-API. לחצו על רכיב לפרטים; ל-"Backend" יש צלילה של 3 רמות.</p>`,
      groups: [
        { x: 600, y: 30, w: 330, h: 370, label: 'דפדפן (לא אמין)', color: 'ui' },
        { x: 230, y: 30, w: 360, h: 370, label: 'שרת שלכם (אמין)', color: 'ctrl' }
      ],
      nodes: [
        { id: 'user', x: 840, y: 215, w: 120, label: 'משתמש', icon: '🙂', color: 'ui', info: `<p>מקליד, קורא תשובה זורמת, לוחץ Stop / 🔄 / 👍👎. מה שהוא רואה הוא רינדור של רשימת ההודעות.</p>` },
        { id: 'fe', x: 680, y: 215, w: 130, label: 'Frontend', sub: 'React / Web', color: 'ui', info: `<p>רינדור Markdown, חיבור SSE / WebSocket, כפתורי UX. <b>לא</b> מחזיק את ה-API key ולא קורא ישירות ל-LLM — כל מה שבדפדפן אפשר לראות ב-DevTools.</p>` },
        { id: 'be', x: 420, y: 215, w: 170, h: 72, label: 'Backend', sub: 'לחצו וצללו ⤵', color: 'ctrl', children: backendSpec(), info: `<p>כאן יושבים session store, prompt builder, guardrails, LLM client ו-streaming. הצלילה מראה כל חלק.</p>` },
        { id: 'llm', x: 100, y: 130, w: 130, label: 'LLM API', sub: 'Claude', color: 'llm', info: `<p><b>Stateless.</b> כל קריאה עצמאית: הוא לא זוכר כלום מהקריאה הקודמת. כל "הזיכרון" הוא מה שה-backend שולח שוב בכל תור.</p>` },
        { id: 'ext', x: 100, y: 310, w: 130, label: 'כלים / RAG', sub: 'DB · API · חיפוש', color: 'tool', info: `<p>מערכות חיצוניות שהמודל יכול "לבקש": בדיקת חשבון, חיפוש במסמכים, פתיחת כרטיס. מורצים ע"י ה-backend.</p>` },
        { id: 'key', x: 420, y: 345, w: 150, h: 46, label: '🔑 API key', color: 'warn', info: `<p>נשמר ב-secret manager / משתנה סביבה בשרת בלבד. מפתח בדפדפן = כל מבקר יכול לגנוב אותו ולרוקן את התקציב.</p>` }
      ],
      edges: [{ from: 'user', to: 'fe', both: true, label: 'UI' }, { from: 'fe', to: 'be', both: true, label: 'HTTPS + SSE' }, { from: 'be', to: 'llm', label: 'messages' }, { from: 'be', to: 'ext', both: true, dashed: true }, { from: 'key', to: 'be', dashed: true }]
    };
  }

  /* ---------- Lab 1: chat + context ---------- */
  const SCRIPT_Q = [
    'שלום, יש לי חשבון חשמל גבוה מהרגיל החודש. למה זה קורה?',
    'מה הצריכה הממוצעת של משפחה של 4 נפשות?',
    'האם כדאי לעבור לתעריף לילה?',
    'איך אני יכול לקרוא את המונה בעצמי?',
    'אפשר לפרוס את התשלום ל-6 תשלומים?',
    'מה קורה אם אני מאחר בתשלום?',
    'ואיך אפשר לדווח על תקלה בבית?',
    'חזרה לשאלה הראשונה: מה אמרת שהסיבה העיקרית?'
  ];
  const SCRIPT_A = [
    'חשבון גבוה בדרך כלל נובע מצריכה גבוהה בעונה (מזגן), מונה שנקרא בהערכה ולא בפועל, או מעבר לתעריף חדש. אפשר לבדוק בחשבון המפורט את הצריכה בקוט"ש ולהשוות לתקופה המקבילה אשתקד. אם יש חריגה חדה, כדאי לבדוק מכשיר שנשאר דולק.',
    'משפחה ממוצעת של ארבע נפשות בדירה מצרכת בערך 500–700 קוט"ש לחודש, ובקיץ יותר מכך בגלל מיזוג. זה ממוצע כללי בלבד — הצריכה האמיתית שלכם מופיעה בחשבון.',
    'תעריף לילה משתלם אם רוב הצריכה שלכם בשעות הלילה, למשל טעינת רכב חשמלי או דוד שמש חשמלי. אם עיקר הצריכה ביום — דווקא לא. כדאי לחשב לפי הצריכה בפועל לפני שמחליטים.',
    'כדי לקרוא את המונה בעצמכם: צלמו את לוח הספרות, ודווחו דרך האפליקציה או האתר עד מועד הדיווח. קריאה עצמית מונעת הערכות ומתקנת חיובים מנופחים.',
    'כן, אפשר לבקש פריסה של עד 6 תשלומים ללא ריבית בכפוף לאישור. נדרש לאמת זהות ולהגדיר אמצעי תשלום. אני יכול להפנות אתכם לטופס המתאים.',
    'איחור בתשלום עלול לגרור ריבית פיגורים ובמקרים קיצוניים התראה לפני ניתוק. מומלץ ליצור קשר לפני המועד כדי לתאם הסדר.',
    'לדיווח על תקלה: מספר המוקד 103 פועל 24/7, או דרך האפליקציה. תקלה בבית פנימי (לוח חשמל) באחריות חשמלאי מורשה.',
    'בשיחה הזו (לפי מה שמופיע בהקשר) הסיבה העיקרית שהוזכרה היתה צריכה גבוהה בעונה וקריאת מונה בהערכה. אם התור הזה כבר דחוס/סוכם — ייתכן שאני מסתמך על הסיכום ולא על הניסוח המקורי.'
  ];

  function chatLab(el) {
    const st = {
      ctx: [], turns: [], fullTokens: 0, cum: 0, cumFull: 0, n: 0, summaries: 0, dropped: 0, win: 900, policy: 'summarize', scriptIdx: 0, lastEvent: ''
    };
    const PIN = 3, POUT = 15; // $/M tokens, illustrative
    const sysBox = h('textarea', { class: 'chat-sysbox', dir: 'rtl' });
    sysBox.value = 'אתה עוזר שירות לקוחות של חברת חשמל ישראלית. ענה בעברית, בקצרה ובנימוס. אל תמציא מספרי חשבון.';
    const win = h('div', { class: 'chat-win' });
    const input = h('input', { type: 'text', placeholder: 'הקלידו הודעה (או השתמשו בהדגמה אוטומטית)...', dir: 'rtl' });
    const jsonOut = h('pre', { class: 'out chat-json' });
    const bar = h('div', { class: 'chat-bar' });
    const kpis = h('div', { class: 'chat-kpis' });
    const spark = h('div', { class: 'chat-spark' });
    const tblBox = h('div');
    const polSel = h('select', null,
      h('option', { value: 'none' }, 'ללא ניהול (ייכשל כשחורגים)'),
      h('option', { value: 'truncate' }, 'חיתוך תורות ישנות'),
      h('option', { value: 'summarize', selected: true }, 'סיכום תורות ישנות (compaction)'));
    polSel.addEventListener('change', () => { st.policy = polSel.value; render(); });
    const winSl = LA.slider('גודל חלון הקשר (טוקנים, מוקטן להדגמה)', 400, 4000, 100, st.win, v => { st.win = v; render(); });

    const sysTok = () => estTok(sysBox.value) + 4;
    const ctxTok = () => st.ctx.reduce((a, m) => a + estTok(m.content) + 4, 0);
    const total = () => sysTok() + ctxTok();

    function bubble(role, text, meta) {
      const b = h('div', { class: 'chat-msg ' + role }, text);
      if (meta) b.appendChild(h('small', null, meta));
      win.appendChild(b); win.scrollTop = win.scrollHeight;
    }
    function compact() {
      // returns event string or ''
      if (total() <= st.win * 0.8) return '';
      if (st.policy === 'none') return '';
      if (st.policy === 'truncate') {
        let n = 0;
        while (total() > st.win * 0.8 && st.ctx.length > 1) { st.ctx.shift(); n++; }
        st.dropped += n; return `חיתוך: נמחקו ${n} הודעות ישנות (המודל "שכח" אותן)`;
      }
      // summarize: keep last 2 messages, replace the rest by a short summary message
      const keep = Math.min(2, st.ctx.length - 1);
      const old = st.ctx.slice(0, st.ctx.length - keep), tail = st.ctx.slice(st.ctx.length - keep);
      if (!old.length) return '';
      const topics = old.filter(m => m.role === 'user' && !m.content.startsWith('[סיכום')).map(m => m.content.replace(/[?.!]/g, '').split(' ').slice(0, 5).join(' '));
      const prev = old.find(m => m.content.startsWith('[סיכום'));
      const sum = '[סיכום שיחה קודמת] המשתמש שאל על: ' + ((prev ? prev.content.replace('[סיכום שיחה קודמת] המשתמש שאל על: ', '') + '; ' : '') + topics.join('; ')).slice(0, 220) + '. נתנו הסברים והמלצות.';
      st.ctx = [{ role: 'user', content: sum }, ...tail];
      st.summaries++;
      return `סיכום: ${old.length} הודעות ישנות נדחסו להודעת סיכום אחת (~${estTok(sum)} טוקנים) — נשמר "הרעיון", אבד הניסוח המדויק`;
    }
    function send(text) {
      text = (text || '').trim(); if (!text) return;
      st.n++;
      st.ctx.push({ role: 'user', content: text });
      bubble('user', text);
      const ev = compact();
      if (ev) { bubble('sys', '⚙ ' + ev); }
      const inTok = total();
      // counterfactual: full history, never compacted
      st.fullTokens += estTok(text) + 4;
      const inFull = sysTok() + st.fullTokens;
      if (inTok > st.win) {
        bubble('err', `400 invalid_request: הקלט (${inTok} טוקנים) גדול מחלון ההקשר (${st.win}). בלי מדיניות ניהול — השיחה נשברה.`);
        st.ctx.pop(); st.fullTokens -= estTok(text) + 4; st.n--; render(); return;
      }
      const reply = SCRIPT_A[st.scriptIdx % SCRIPT_A.length]; st.scriptIdx++;
      const outTok = estTok(reply);
      const cost = (inTok * PIN + outTok * POUT) / 1e6;
      const costFull = (inFull * PIN + outTok * POUT) / 1e6;
      st.cum += cost; st.cumFull += costFull;
      st.ctx.push({ role: 'assistant', content: reply });
      st.fullTokens += outTok + 4;
      st.turns.push({ n: st.n, inTok, outTok, cost, cum: st.cum, inFull, ev: !!ev });
      bubble('assistant', reply, `in=${inTok} out=${outTok} · ${fmtMoney(cost)}`);
      st.lastEvent = ev; render();
    }
    function reset() {
      Object.assign(st, { ctx: [], turns: [], fullTokens: 0, cum: 0, cumFull: 0, n: 0, summaries: 0, dropped: 0, scriptIdx: 0, lastEvent: '' });
      win.innerHTML = ''; render();
    }
    function render() {
      const t = total(), pct = Math.min(100, t / st.win * 100);
      bar.className = 'chat-bar' + (t > st.win * 0.8 ? ' hot' : '');
      bar.innerHTML = `<i style="width:${pct}%"></i><div class="chat-mark" style="left:80%"></div><span>${t} / ${st.win} טוקנים (קו לבן = סף compaction 80%)</span>`;
      jsonOut.textContent = JSON.stringify({ model: 'claude-sonnet-5-5', max_tokens: 1024, system: sysBox.value, messages: st.ctx.length ? st.ctx : [{ role: 'user', content: '...' }] }, null, 2);
      const last = st.turns[st.turns.length - 1];
      kpis.innerHTML = `<div class="chat-kpi"><b>${st.turns.length}</b><span>תורות</span></div>` +
        `<div class="chat-kpi"><b>${last ? last.inTok : 0}</b><span>input בתור האחרון</span></div>` +
        `<div class="chat-kpi"><b>${fmtMoney(st.cum)}</b><span>עלות מצטברת (מנוהל)</span></div>` +
        `<div class="chat-kpi"><b>${fmtMoney(st.cumFull)}</b><span>עלות מצטברת (בלי ניהול)</span></div>` +
        `<div class="chat-kpi"><b>${st.summaries}</b><span>סיכומים</span></div>` +
        `<div class="chat-kpi"><b>${st.dropped}</b><span>הודעות שנמחקו</span></div>`;
      const mx = Math.max(10, ...st.turns.map(x => x.inFull));
      spark.innerHTML = st.turns.map(x => `<i title="תור ${x.n}: ${x.inTok} (מנוהל) מול ${x.inFull} (מלא)" class="${x.ev ? 'c' : ''}" style="height:${Math.max(4, x.inTok / mx * 100)}%"></i>`).join('') || '<span class="muted" style="font-size:12px">עמודות input לכל תור יופיעו כאן (כתום = תור שבו בוצע compaction)</span>';
      tblBox.innerHTML = st.turns.length ? `<table class="chat-tbl"><thead><tr><th>תור</th><th>in</th><th>in (מלא)</th><th>out</th><th>עלות</th><th>מצטבר</th></tr></thead><tbody>` +
        st.turns.map(x => `<tr class="${x.ev ? 'ev' : ''}"><td>${x.n}${x.ev ? ' ⚙' : ''}</td><td>${x.inTok}</td><td>${x.inFull}</td><td>${x.outTok}</td><td>${fmtMoney(x.cost)}</td><td>${fmtMoney(x.cum)}</td></tr>`).join('') + '</tbody></table>' : '';
    }
    sysBox.addEventListener('input', render);
    const sendBtn = h('button', { type: 'button', class: 'btn primary', onclick: () => { send(input.value); input.value = ''; input.focus(); } }, 'שלח');
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { send(input.value); input.value = ''; } });
    const autoBtn = h('button', { type: 'button', class: 'btn', onclick: () => { for (let i = 0; i < 4; i++) send(SCRIPT_Q[(st.scriptIdx) % SCRIPT_Q.length]); } }, '▶ שלח 4 שאלות מוכנות');
    const resetBtn = h('button', { type: 'button', class: 'btn ghost', onclick: reset }, '⟲ איפוס');
    el.appendChild(h('div', { class: 'lab' },
      h('div', { class: 'lab-h' }, '🧪 מעבדה 1: מה באמת נשלח ל-LLM בכל תור, וכמה זה עולה'),
      h('p', { class: 'muted', html: `התשובות <b>מדומות</b> (סקריפט) — אין קריאת API אמיתית. מה שאמיתי: בניית ה-<code>messages</code>, אמידת הטוקנים (<i>הערכה גסה</i>), החישוב המצטבר, ומדיניות ה-compaction. שלחו 6–8 הודעות והשוו את עמודת "in" לעמודת "in (מלא)". המחיר להדגמה: $${PIN}/$${POUT} למיליון טוקנים (input/output) — מספרים להמחשה בלבד.` }),
      h('div', { class: 'chat-ctrl' }, winSl, h('label', null, 'מדיניות: ', polSel)),
      h('div', { class: 'chat-lab-grid' },
        h('div', null, h('div', { class: 'muted', style: { fontSize: '12.5px' } }, 'System prompt (ניתן לעריכה — משפיע על ספירת הטוקנים):'), sysBox, win,
          h('div', { class: 'chat-inrow' }, input, sendBtn), h('div', { class: 'pill-row' }, autoBtn, resetBtn)),
        h('div', null, h('div', { class: 'muted', style: { fontSize: '12.5px' } }, 'גוף הבקשה שיישלח עכשיו (JSON):'), jsonOut, bar, kpis, spark, tblBox))));
    render();
  }

  /* ---------- Lab 2: streaming ---------- */
  function streamLab(el) {
    const TEXT = 'בהחלט! חשבון חשמל גבוה נובע בדרך כלל משלושה גורמים עיקריים: צריכה עונתית של מזגן, קריאת מונה בהערכה שמתוקנת בחשבון הבא, או מעבר בין תעריפים. כדאי להשוות את הצריכה בקוט"ש לתקופה המקבילה אשתקד, ולבדוק אם מכשיר ישן נשאר דולק. אם תרצו, אפשר לעבור יחד על החשבון המפורט שלכם צעד אחר צעד ולמצוא את החריגה.'.split(' ');
    const st = { ttft: 800, tps: 40, len: 80, raf: 0 };
    const box = h('div', { class: 'chat-stream-box' });
    const tl = h('div', { class: 'chat-tl' });
    const stats = h('div', { class: 'chat-kpis' });
    const sse = h('pre', { class: 'out chat-sse' });
    const sliders = h('div', { class: 'chat-ctrl' },
      LA.slider('TTFT — זמן עד הטוקן הראשון', 100, 3000, 50, st.ttft, v => { st.ttft = v; stat(); }, v => v + ' ms'),
      LA.slider('מהירות (tokens/sec)', 5, 150, 5, st.tps, v => { st.tps = v; stat(); }, v => v + ' tok/s'),
      LA.slider('אורך תשובה (טוקנים)', 20, 600, 10, st.len, v => { st.len = v; stat(); }));
    function total() { return st.ttft + st.len / st.tps * 1000; }
    function stat() {
      const T = total();
      stats.innerHTML = `<div class="chat-kpi"><b>${(st.ttft / 1000).toFixed(2)}s</b><span>המשתמש רואה תגובה (עם streaming)</span></div>` +
        `<div class="chat-kpi"><b>${(T / 1000).toFixed(1)}s</b><span>סה"כ עד סוף התשובה</span></div>` +
        `<div class="chat-kpi"><b>${(T / 1000).toFixed(1)}s</b><span>המתנה בלי streaming (מסך ריק)</span></div>`;
      const pct = Math.min(100, st.ttft / T * 100);
      tl.innerHTML = `<i class="w" style="left:0;width:${pct}%"></i><i class="s" style="left:${pct}%;right:0"></i><span style="left:4px">TTFT ${st.ttft}ms</span><span style="right:4px">streaming ${((T - st.ttft) / 1000).toFixed(1)}s</span>`;
    }
    function run() {
      cancelAnimationFrame(st.raf); box.innerHTML = ''; sse.textContent = '';
      const t0 = performance.now(); let shown = -1; const lines = [];
      const scale = Math.max(1, total() / 8000); // never take > ~8s of real time
      const tick = now => {
        if (!box.isConnected) return;
        const t = (now - t0) * scale; let n = 0;
        if (t >= st.ttft) n = Math.min(st.len, Math.floor((t - st.ttft) / 1000 * st.tps) + 1);
        if (n !== shown) {
          for (let i = Math.max(0, shown); i < n; i++) if (i < 12) lines.push(`event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"${TEXT[i % TEXT.length]} "}}`);
          shown = n;
          const words = [];
          // ~1 word ≈ 1.6 tokens for Hebrew (illustrative)
          const w = Math.min(Math.floor(n / 1.6), 400);
          for (let i = 0; i < w; i++) words.push(TEXT[i % TEXT.length]);
          box.innerHTML = esc(words.join(' ')) + (n < st.len ? '<span class="chat-cur"></span>' : '') || '<span class="muted">⏳ ממתין לטוקן הראשון...</span>';
          if (!n) box.innerHTML = '<span class="muted">⏳ ממתין לטוקן הראשון (TTFT)...</span>';
          sse.textContent = 'event: message_start\ndata: {"type":"message_start",...}\n\n' + lines.join('\n\n') + (n >= 12 ? '\n\n... (' + (n - 12) + ' אירועים נוספים)' : '') + (n >= st.len ? '\n\nevent: message_stop\ndata: {"type":"message_stop"}' : '');
        }
        if (n < st.len) st.raf = requestAnimationFrame(tick);
      };
      st.raf = requestAnimationFrame(tick);
      LA.onCleanup(() => cancelAnimationFrame(st.raf));
    }
    el.appendChild(h('div', { class: 'lab' },
      h('div', { class: 'lab-h' }, '🧪 מעבדה 2: Streaming — TTFT מול קצב טוקנים'),
      h('p', { class: 'muted', html: `<b>TTFT</b> (Time To First Token) נקבע בעיקר ע"י אורך הקלט (prefill), עומס ובחירת המודל; <b>tokens/sec</b> נקבע ע"י ה-decode. ה-UX הנתפס תלוי ב-TTFT, לא באורך הכולל. הסימולציה מוקטנת בזמן אם התשובה ארוכה מדי.` }),
      sliders, tl, stats,
      h('div', { class: 'pill-row' }, h('button', { type: 'button', class: 'btn primary', onclick: run }, '▶ שלח וראו את הזרימה'), h('button', { type: 'button', class: 'btn ghost', onclick: () => { cancelAnimationFrame(st.raf); box.innerHTML = '<span class="muted">⏹ הופסק (כמו כפתור Stop)</span>'; } }, '⏹ Stop')),
      box, h('div', { class: 'muted', style: { fontSize: '12.5px', marginTop: '8px' } }, 'אירועי SSE כפי שהם מגיעים מה-API (12 הראשונים):'), sse));
    stat();
    box.innerHTML = '<span class="muted">לחצו "שלח"...</span>';
  }

  /* ---------- turn-by-turn stepper (stateless demo) ---------- */
  function statelessStepper(el) {
    const J = x => LA.code(JSON.stringify(x, null, 2), 'json');
    const steps = [
      { title: 'תור 1 — המשתמש שואל', html: `<p>ה-backend שולח הודעה אחת. המודל עונה ו<b>שוכח הכל</b> ברגע שהתשובה הסתיימה.</p>${J({ system: 'את/ה עוזר שירות...', messages: [{ role: 'user', content: 'קוראים לי דנה.' }] })}<p class="muted">תשובה: "נעים להכיר, דנה!"</p>` },
      { title: 'תור 2 — שאלה שתלויה בתור 1', html: `<p>אם נשלח רק "מה שמי?" — המודל לא יידע. ה-backend חייב לצרף את כל מה שקרה קודם:</p>${J({ system: 'את/ה עוזר שירות...', messages: [{ role: 'user', content: 'קוראים לי דנה.' }, { role: 'assistant', content: 'נעים להכיר, דנה!' }, { role: 'user', content: 'מה שמי?' }] })}<p class="muted">עכשיו הוא עונה "דנה" — לא כי "זכר", אלא כי זה כתוב ב-prompt.</p>` },
      { title: 'תור 3 — הקלט גדל', html: `<p>כל תור מוסיף שתי הודעות (user + assistant). הקלט של תור n כולל את <b>כל</b> התורות 1..n−1 מחדש. סך הטוקנים שמעובדים בשיחה של n תורות גדל <b>ריבועית</b>: ~n²/2 × אורך-תור.</p>${LA.table(['תור', 'הודעות שנשלחות', 'טוקנים (הערכה, 150/תור)'], [['1', '1', '~150'], ['5', '9', '~1,350'], ['10', '19', '~2,850'], ['20', '39', '~5,850 (סה"כ מצטבר: ~60,000)']])}` },
      { title: 'הפתרונות', html: LA.list(['<b>Prompt caching</b> — קידומת יציבה (system + היסטוריה ישנה) נקראת מהמטמון בזול ובמהירות', '<b>חלון הזזה</b> — רק N תורות אחרונות', '<b>סיכום (compaction)</b> — דוחסים תורות ישנות להודעה קצרה', '<b>זיכרון חיצוני</b> — עובדות חשובות נשמרות ב-DB ונשלפות רק כשצריך (RAG על היסטוריה)', '<b>Context editing</b> — הסרת תוצאות כלים ישנות וגדולות']) }
    ];
    LA.stepper(el, { intro: 'לחצו "הבא" כדי לראות מה נשלח בכל תור', steps });
  }

  /* ---------- checklist ---------- */
  function checklist(el, items) {
    const prog = h('div', { class: 'muted', style: { margin: '6px 0' } });
    const ul = h('ul', { class: 'chat-check' });
    const upd = () => { const n = ul.querySelectorAll('input:checked').length; prog.textContent = `סומנו ${n}/${items.length}`; };
    items.forEach(it => {
      const cb = h('input', { type: 'checkbox' });
      const li = h('li', null, h('label', null, cb, h('span', { html: it })));
      cb.addEventListener('change', () => { li.classList.toggle('done', cb.checked); upd(); });
      ul.appendChild(li);
    });
    el.appendChild(prog); el.appendChild(ul); upd();
  }

  /* ---------- code samples ---------- */
  const CODE_LOOP = `import anthropic

client = anthropic.Anthropic()          # קורא ANTHROPIC_API_KEY מהסביבה (בשרת!)

SYSTEM = "את/ה עוזר שירות לקוחות של חברת חשמל. ענה בעברית, בקצרה."
history: list[dict] = []                 # ההיסטוריה חיה אצלנו - לא אצל המודל

def chat_turn(user_text: str) -> str:
    history.append({"role": "user", "content": user_text})
    resp = client.messages.create(
        model="claude-sonnet-5-5",
        max_tokens=1024,
        system=SYSTEM,
        messages=history,                # <-- כל ההיסטוריה, בכל קריאה
    )
    answer = resp.content[0].text
    history.append({"role": "assistant", "content": answer})
    print(f"in={resp.usage.input_tokens} out={resp.usage.output_tokens}")  # שימו לב שin גדל
    return answer

while True:
    q = input("you> ")
    if q in ("exit", "quit"):
        break
    print("bot>", chat_turn(q))`;

  const CODE_STREAM = `import anthropic

client = anthropic.Anthropic()

def stream_turn(history: list[dict], system: str) -> str:
    chunks = []
    with client.messages.stream(
        model="claude-sonnet-5-5",
        max_tokens=1024,
        system=system,
        messages=history,
    ) as stream:
        for text in stream.text_stream:      # delta-ים של טקסט כשהם מגיעים
            print(text, end="", flush=True)  # בפרודקשן: שולחים ל-UI דרך SSE
            chunks.append(text)
        final = stream.get_final_message()   # ההודעה המלאה + usage + stop_reason
    if final.stop_reason == "max_tokens":
        print("\\n[אזהרה: התשובה נחתכה]")
    print(f"\\n(in={final.usage.input_tokens}, out={final.usage.output_tokens})")
    return "".join(chunks)`;

  const CODE_TOOLS = `# לולאת כלים ידנית: המודל מבקש -> אנחנו מריצים -> מחזירים tool_result
tools = [{
    "name": "get_balance",
    "description": "מחזיר יתרת חוב של לקוח לפי מזהה לקוח",
    "input_schema": {"type": "object",
                     "properties": {"customer_id": {"type": "string"}},
                     "required": ["customer_id"]},
}]

def run_agentic_turn(history):
    while True:
        resp = client.messages.create(model="claude-sonnet-5-5", max_tokens=1024,
                                      system=SYSTEM, tools=tools, messages=history)
        history.append({"role": "assistant", "content": resp.content})
        if resp.stop_reason != "tool_use":
            return resp                      # end_turn: סיימנו
        results = []
        for block in resp.content:
            if block.type == "tool_use":
                out = TOOL_IMPL[block.name](**block.input)   # הרשאות של המשתמש!
                results.append({"type": "tool_result",
                                "tool_use_id": block.id, "content": str(out)})
        history.append({"role": "user", "content": results})`;

  const CODE_API = `# main.py — שלד backend מינימלי. הרצה: uvicorn main:app --reload
import json
import anthropic
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

app = FastAPI()
client = anthropic.AsyncAnthropic()      # ה-API key רק כאן, בשרת
SESSIONS: dict[str, list[dict]] = {}      # בפרודקשן: Redis / Postgres
SYSTEM = "את/ה עוזר שירות לקוחות. ענה בעברית."

class ChatIn(BaseModel):
    session_id: str
    message: str

@app.post("/chat")
async def chat(body: ChatIn):
    if len(body.message) > 4000:
        raise HTTPException(413, "message too long")        # guardrail בסיסי
    history = SESSIONS.setdefault(body.session_id, [])
    history.append({"role": "user", "content": body.message})

    async def sse():
        parts = []
        async with client.messages.stream(
            model="claude-sonnet-5-5", max_tokens=1024,
            system=SYSTEM, messages=history[-20:],          # חלון הזזה פשוט
        ) as stream:
            async for text in stream.text_stream:
                parts.append(text)
                yield f"data: {json.dumps({'delta': text}, ensure_ascii=False)}\\n\\n"
        history.append({"role": "assistant", "content": "".join(parts)})
        yield "data: [DONE]\\n\\n"

    return StreamingResponse(sse(), media_type="text/event-stream")`;

  const CODE_JS = `// frontend: קריאת SSE עם fetch (EventSource תומך רק ב-GET)
const res = await fetch("/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ session_id, message }),
  signal: abortController.signal,          // כפתור Stop = abortController.abort()
});
const reader = res.body.getReader();
const dec = new TextDecoder();
let buf = "";
while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  buf += dec.decode(value, { stream: true });
  for (const line of buf.split("\\n\\n").slice(0, -1)) {
    if (line.startsWith("data: ") && line !== "data: [DONE]")
      bubble.textContent += JSON.parse(line.slice(6)).delta;   // רינדור הדרגתי
  }
  buf = buf.slice(buf.lastIndexOf("\\n\\n") + 2);
}`;

  const CODE_ROUTE = `# ניתוב מודלים בצ'אט: זול ומהיר קודם, יקר רק כשצריך
import json
CLASSIFY_SYSTEM = """סווג את ההודעה. החזר JSON בלבד:
{"intent": "faq|billing|complaint|technical|other",
 "difficulty": "easy|medium|hard", "unsafe": true|false}"""

def route(user_msg: str) -> dict:
    r = client.messages.create(model="claude-haiku-5-5", max_tokens=100,
                               system=CLASSIFY_SYSTEM,
                               messages=[{"role": "user", "content": user_msg}])
    return json.loads(r.content[0].text)

MODEL_BY_DIFFICULTY = {
    "easy": "claude-haiku-5-5",     # שאלות נפוצות / small talk
    "medium": "claude-sonnet-5-5",  # ברירת המחדל לשיחה
    "hard": "claude-opus-5-5",      # תלונה מורכבת, ניתוח רב-שלבי
}

def answer(history, user_msg):
    meta = route(user_msg)
    if meta["unsafe"]:
        return "מצטער, אני לא יכול לעזור בזה."
    model = MODEL_BY_DIFFICULTY[meta["difficulty"]]
    return client.messages.create(model=model, max_tokens=1024, system=SYSTEM,
                                  messages=history).content[0].text`;

  /* ---------- module ---------- */
  LA.register({
    id: 'chat', order: 20, group: 'core', icon: '💬', short: 'ממשק צ\'אט',
    title: 'ממשק צ\'אט — איך שיחה עם LLM עובדת באמת',
    render(main) {
      LA.page(main, {
        icon: '💬', title: 'ממשק צ\'אט — איך שיחה עם LLM עובדת באמת',
        subtitle: `הצ'אט נראה כמו שיחה עם מי ש"זוכר", אבל מאחורי הקלעים זו <b>קריאה ללא-מצב (stateless)</b> שחוזרת על עצמה, עם היסטוריה שנשלחת מחדש בכל פעם. כאן נפרק את זה — מהדפדפן ועד ההודעה הבודדת.`,
        sections: [
          {
            id: 'intro', title: 'בשורה אחת + אנלוגיה', html: `
<p><b>ממשק צ'אט</b> = אפליקציית web (frontend) + שרת (backend) שמחזיק היסטוריה ובונה בכל תור בקשה חדשה ל-LLM, ומזרים את התשובה בחזרה לדפדפן טוקן אחר טוקן.</p>
${LA.callout('analogy', `דמיינו <b>יועץ בעל זיכרון של דג זהב</b> שנכנס לחדר בכל פעם מחדש. כדי שהשיחה תמשיך, מזכירה (ה-backend) מגישה לו בכל כניסה תיק ובו תמלול כל השיחה עד כה, ורק אז הוא עונה על השאלה האחרונה. הוא נראה כאילו הוא "זוכר" — אבל בכל פעם הוא קורא את התיק מההתחלה. תיק עבה = קריאה איטית ויקרה, ובסוף התיק לא נכנס לשולחן (חלון ההקשר).`, 'אנלוגיה')}
${LA.table(['מה המשתמש חושב', 'מה קורה בפועל'], [['"הבוט זוכר אותי"', 'ה-backend שומר היסטוריה ושולח אותה שוב בכל תור'], ['"הוא חושב ומקליד"', 'Streaming: טוקנים מגיעים דרך SSE ומרונדרים בהדרגה'], ['"הוא חיפש בחשבון שלי"', 'המודל ביקש tool_use; השרת הריץ פונקציה והחזיר tool_result'], ['"הוא נתקע בשיחה ארוכה"', 'חלון ההקשר התמלא — חיתוך/סיכום/שגיאה']])}`
          },
          {
            id: 'stateless', title: 'ה-LLM חסר מצב: מה נשלח בכל תור', render(el) {
              el.insertAdjacentHTML('beforeend', `<p>זה הרעיון החשוב ביותר במודול. צעדו דרך שלושה תורות וראו מה ה-API מקבל:</p>`);
              statelessStepper(el);
              el.insertAdjacentHTML('beforeend', LA.callout('algo', `<b>מסקנה הנדסית:</b> "זיכרון" הוא <i>החלטת עיצוב שלכם</i>: מה נכנס ל-prompt בכל תור. זו בעיית אופטימיזציה — מקסימום רלוונטיות בתקציב טוקנים נתון.`, 'אלגוריתמאי'));
            }
          },
          {
            id: 'arch', title: 'ארכיטקטורה — דיאגרמה וצלילה', render(el) {
              el.insertAdjacentHTML('beforeend', `<p>לחצו על רכיבים; לחצו "צלול" על <b>Backend</b> ← <b>Prompt builder</b> ← <b>Request body</b> כדי להגיע להודעה הבודדת (4 רמות).</p>`);
              const d = LA.diagram(el, topSpec());
              el.insertAdjacentHTML('beforeend', `<div class="pill-row"></div>`);
              const btn = h('button', { type: 'button', class: 'btn', onclick: () => { d.flow(['user', 'fe', 'be', 'llm'], 600, 'acc'); } }, '▶ הדגמת בקשה: משתמש ← LLM');
              el.lastElementChild.appendChild(btn);
              el.insertAdjacentHTML('beforeend', LA.callout('warn', `<b>לעולם לא API key בדפדפן.</b> גם "רק לפרוטוטיפ". כל מה שנשלח ל-client גלוי. ה-frontend מדבר עם ה-backend שלכם (עם auth ו-rate limit), וה-backend מדבר עם ה-LLM. אותו עיקרון חל על system prompt סודי: הניחו שמשתמש מתוחכם יכול לחלץ אותו.`));
            }
          },
          {
            id: 'concepts', title: 'מושגי יסוד: roles, חלון הקשר וזיכרון', render(el) {
              LA.tabs(el, [
                {
                  label: 'Roles', html: `${LA.table(['Role', 'מי', 'הערות'], [['system', 'המפתח', 'זהות, כללים, פורמט. ב-Anthropic: שדה <code>system</code> נפרד; ב-OpenAI-style: הודעה ראשונה ברשימה'], ['user', 'המשתמש (או האפליקציה)', 'כולל tool_result — גם תוצאות כלים חוזרות כ-user'], ['assistant', 'המודל', 'יכול להכיל text ו-tool_use. ניתן גם "למלא מראש" (prefill) תחילת תשובה בחלק מהמודלים'], ['tool', 'הכלי', 'ב-APIs מסוימים role נפרד; ב-Anthropic זה בלוק tool_result']])}
${LA.callout('tip', `System prompt טוב: <b>תפקיד</b> (מי אתה) + <b>הקשר</b> (מי הקהל) + <b>כללים</b> (מה אסור) + <b>פורמט</b> (איך לענות) + <b>דוגמאות</b>. כתבו אותו כמו מסמך onboarding לעובד חדש, לא כמו קסם.`)}`
                },
                {
                  label: 'חלון הקשר', html: `<p><b>Context window</b> = מקסימום טוקנים (קלט + פלט) שהמודל יכול לראות בקריאה אחת. כשחורגים: שגיאה או — בלי ניהול — איבוד מידע.</p>
${LA.table(['אסטרטגיה', 'איך', 'יתרון', 'חיסרון'], [['חלון הזזה (truncation)', 'שומרים N תורות אחרונות', 'פשוט, חינמי', 'שוכח עובדות מוקדמות ("שמי דנה")'], ['סיכום (summarization/compaction)', 'מודל קטן מסכם תורות ישנות', 'שומר רעיון כללי', 'עלות קריאה נוספת, אובדן פרטים, סיכום יכול להכיל טעויות'], ['זיכרון חיצוני', 'עובדות ל-DB, שליפה לפי רלוונטיות', 'סקיילבילי, חוצה sessions', 'מורכב; שליפה שגויה = זיכרון שגוי'], ['Prompt caching', 'קידומת יציבה נקראת מהמטמון', 'זול ומהיר משמעותית', 'דורש סדר prompt יציב; ה-cache פג'], ['Context editing', 'מסירים tool_results ישנים', 'חוסך הרבה בסוכנים', 'צריך לוודא שלא מוחקים מה שנחוץ']])}
${LA.callout('info', `<b>עלות מצטברת:</b> בלי ניהול, סך הטוקנים המעובדים בשיחה גדל ~ריבועית במספר התורות. למשל 20 תורות × 300 טוקנים לתור ≈ 63,000 טוקני קלט (ולא 6,000). זה מה שתראו במעבדה 1.`)}
${LA.callout('warn', `<b>Lost in the middle:</b> גם כשהכל נכנס, מודלים משתמשים טוב יותר במידע בתחילת/סוף ההקשר. ארוך ≠ טוב.`)}`
                },
                {
                  label: 'זיכרון', html: `<p>"זיכרון" בצ'אט הוא <b>שלוש שכבות</b> שונות:</p>${LA.list([`<b>זיכרון עבודה (short-term)</b> — ההיסטוריה שבחלון ההקשר הנוכחי.`, `<b>זיכרון סשן</b> — היסטוריה מלאה ב-DB לפי session_id, שממנה בונים את החלון (וגם מציגים ב-UI).`, `<b>זיכרון ארוך-טווח</b> — עובדות/העדפות על משתמש (<i>"מעדיף תשובות קצרות"</i>) שחולצו ע"י מודל (${LA.modelBadge('haiku')}) ונשמרו; נשלפות בתחילת שיחה חדשה.`])}${LA.callout('algo', `<b>סכנות זיכרון:</b> (1) פרטיות — מה מותר לשמור? GDPR/זכות למחיקה; (2) <i>memory poisoning</i> — משתמש/מסמך מזריע "עובדה" שקרית; (3) זיכרון מיושן שסותר מציאות; (4) זליגה בין משתמשים אם מפתח ה-DB שגוי.`)}`
                },
                {
                  label: 'Tool calls בצ\'אט', html: `<p>כשהמודל צריך נתון/פעולה, הוא מחזיר <code>stop_reason: "tool_use"</code> ובלוק <code>tool_use</code>. ה-UI מציג "🔍 בודק את החשבון שלך..." בזמן שה-backend מריץ. אחר כך נשלחת הודעת <code>user</code> עם <code>tool_result</code> והמודל ממשיך. כל סבב = קריאת LLM נוספת (עלות + latency) שבה כל ההיסטוריה נשלחת שוב.</p>${LA.code('# היסטוריה אחרי תור עם כלי (מקוצר)\n[\n {"role":"user","content":"מה היתרה שלי?"},\n {"role":"assistant","content":[{"type":"tool_use","id":"toolu_01A","name":"get_balance","input":{"customer_id":"C-1042"}}]},\n {"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_01A","content":"312.40"}]},\n {"role":"assistant","content":"היתרה שלך היא 312.40 ש\\"ח."}\n]', 'python')}${LA.callout('warn', `פעולות עם תוצאה בעולם (החזר כספי, מחיקה) — דורשות אישור משתמש (<i>human-in-the-loop</i>) והרשאות מוגבלות. ראו מודולי Agents/LangGraph.`)}`
                },
                {
                  label: 'Streaming', html: `<p>במקום לחכות לתשובה שלמה, ה-API שולח <b>אירועי SSE</b> (<i>Server-Sent Events</i>, זרם HTTP חד-כיווני): <code>message_start</code> → <code>content_block_delta</code> (חתיכות טקסט) → <code>message_stop</code>. ה-SDK עוטף אותם ב-<code>stream.text_stream</code>.</p>${LA.list(['<b>TTFT</b> — זמן עד הטוקן הראשון: מה שהמשתמש חש כ"מהירות".', '<b>tokens/sec</b> — קצב ה-decode; נקבע ע"י המודל והחומרה.', 'ביטול: סגירת החיבור = הפסקת חיוב על טוקנים שלא נוצרו (וודאו שהשרת באמת מבטל).', 'Markdown חלקי (בלוק קוד שלא נסגר) — רינדור צריך לסבול טקסט לא שלם.', 'Guardrails על פלט זורם: buffer קצר או בדיקה בסוף.'])}`
                },
                {
                  label: 'Guardrails ו-UX', html: `${LA.table(['שכבה', 'מה בודקים', 'מודל מומלץ'], [['קלט', 'מודרציה, prompt injection, PII, מחוץ-לתחום', LA.modelBadge('haiku')], ['הרשאות כלים', 'האם למשתמש מותר לבצע את הפעולה', 'קוד דטרמיניסטי, לא LLM'], ['פלט', 'דליפת סודות, הלוצינציות מסוכנות, ציות לפורמט', LA.modelBadge('haiku') + ' / כללים'], ['מדיניות', 'סירוב מנומס עם כיוון אלטרנטיבי', LA.modelBadge('sonnet')]])}
<p><b>UX שחשוב לבנות:</b></p>${LA.list(['⏹ <b>Stop</b> — חייב לבטל את הקריאה בפועל', '🔄 <b>Regenerate</b> — תשובה חדשה לאותו תור (ולא להוסיף לשיחה את הישנה)', '📎 <b>ציטוטים/מקורות</b> — ב-RAG: קישור לכל טענה', '👍👎 <b>פידבק</b> — נשמר עם מזהה הקריאה ו-prompt version; זה הזהב של ה-evals', '✏️ עריכת הודעה קודמת = "ענף" חדש של שיחה (מקטינים את ההיסטוריה מאותה נקודה)', 'מצב "מקליד..." / ספינר עד TTFT, הצגת שימוש בכלי'])}`
                }
              ]);
            }
          },
          {
            id: 'code', title: 'דוגמה מוחשית: בוט שירות לקוחות לחברת חשמל', render(el) {
              el.insertAdjacentHTML('beforeend', `<p>הצ'אט מחזיק היסטוריה, מזרים תשובה, יכול לקרוא לכלי "בדיקת יתרה", ומנתב בין מודלים לפי קושי. ארבעה שלבים בקוד:</p>`);
              LA.tabs(el, [
                { label: '1. לולאה multi-turn', html: LA.code(CODE_LOOP, 'python', 'chat_loop.py') + LA.callout('tip', `הריצו וצפו בהדפסה <code>in=...</code> — היא גדלה בכל תור. זה ה-"stateless" בפעולה.`) },
                { label: '2. Streaming', html: LA.code(CODE_STREAM, 'python', 'stream.py') },
                { label: '3. כלים', html: LA.code(CODE_TOOLS, 'python', 'tools_loop.py') },
                { label: '4. FastAPI backend', html: LA.code(CODE_API, 'python', 'main.py') + LA.code(CODE_JS, 'js', 'frontend.js') + LA.callout('info', `שלד לימודי. בפרודקשן הוסיפו: auth (JWT), rate limit לפי משתמש, שמירה ב-DB, ביטול כשהלקוח מתנתק, לוגים וגבולות תקציב.`) },
                { label: '5. ניתוב מודלים', html: LA.code(CODE_ROUTE, 'python', 'routing.py') }
              ]);
            }
          },
          { id: 'lab1', title: 'מעבדה: ההיסטוריה, העלות וחלון ההקשר', render: chatLab },
          { id: 'lab2', title: 'מעבדה: Streaming', render: streamLab },
          {
            id: 'routing', title: 'ניתוב מודלים בצ\'אט', html: `
<p>לא כל הודעה דורשת את המודל החזק ביותר. תבנית מקובלת — <b>cascade</b>: קודם מודל קטן, ואם צריך — עולים רמה.</p>
${LA.table(['תפקיד בצ\'אט', 'מודל', 'למה'], [
              ['סיווג כוונה, מודרציה, זיהוי שפה/PII, חילוץ שדות', LA.modelBadge('haiku'), 'נפח גבוה, פלט קצר, latency קריטי; עשרות אחוזים זול יותר'],
              ['שיחה רגילה, שאלות ידע (RAG), סיכום היסטוריה, tool use פשוט', LA.modelBadge('sonnet'), 'האיזון הנכון בין איכות לעלות — ברירת המחדל'],
              ['תלונה מורכבת, ניתוח רב-מסמכי, תכנון, הסלמה כשהאמון נמוך', LA.modelBadge('opus'), 'היגיון עמוק; משתמשים בו במעט כדי לא להכביד על עלות/latency']
            ])}
${LA.callout('algo', `<b>איך מחליטים על הסלמה?</b> (1) מסווג Haiku מחזיר <code>difficulty</code>; (2) ציון ביטחון נמוך/הגרלה של verifier; (3) המשתמש לחץ 👎 או "דבר עם נציג"; (4) כשל בפורמט/כלי. מודדים: איכות לכל tier על סט evals, ועלות ממוצעת לשיחה.`)}
<p class="muted">עומק החשיבה אפשר לשלוט גם דרך <code>output_config.effort</code> (<code>low|medium|high|xhigh|max</code>) בלי להחליף מודל; ב-Claude הנוכחי לא מעבירים temperature/top_p.</p>`
          },
          {
            id: 'llm', title: 'הקשר ל-LLM', html: LA.callout('llm', `
<b>הצ'אט הוא עטיפה; ה-LLM הוא פונקציה.</b> ה-LLM מקבל רצף טוקנים ומחזיר המשך סביר. כל מה שנחשב "צ'אט" — roles, היסטוריה, זיכרון, סירובים, כלים — הוא <b>פורמט ושיטת הרכבה של הרצף הזה</b>. ה-chat template הופך את ה-messages לטקסט אחד עם סימני תפקיד מיוחדים. לכן: מה שלא בקלט — לא קיים עבור המודל; ומה שנמצא בקלט — מקבל משקל לפי מיקומו וניסוחו.<br>
מודולים קשורים: <a href="#/llm">LLM</a> (טוקנים ו-context), <a href="#/rag">RAG</a> (הקשר ממקורות), <a href="#/agents">Agents</a> (לולאת כלים).`)
          },
          {
            id: 'profile', title: 'דרישות · חוזקות · חולשות', html: LA.profile({
              requirements: ['Backend עם secret management ל-API key', 'Session store (Redis/Postgres) ומדיניות retention', 'Streaming (SSE/WebSocket) ותשתית שתומכת בחיבורים ארוכים', 'System prompt מנוהל בגרסאות + סט evals', 'Observability: טוקנים, latency, עלות, פידבק', 'מנגנון guardrails ו-rate limiting'],
              strengths: ['ממשק טבעי, כמעט אפס עקומת למידה', 'גמישות עצומה — אותה ממשק לשאלות, כתיבה, קוד', 'Streaming נותן תחושת מהירות', 'קל להרחיב ב-RAG וכלים', 'פידבק משתמשים מזין שיפור מתמיד'],
              weaknesses: ['עלות גדלה ריבועית עם אורך השיחה', 'חלון הקשר סופי; סיכום מאבד מידע', 'לא דטרמיניסטי — קשה לבדוק', 'הלוצינציות עם ביטחון עצמי', 'פגיע ל-prompt injection ו-jailbreak', 'פרטיות: היסטוריה = מידע אישי'],
              algoTips: ['מדדו TTFT, tokens/sec, עלות/שיחה, אורך שיחה ממוצע ו-p95', 'בנו סט evals משיחות אמיתיות (מאונונמות), כולל שיחות ארוכות', 'השוו מדיניות compaction ב-A/B: שימור עובדות מול עלות', 'שמרו את גרסת ה-prompt והמודל בכל לוג', 'בדקו regression אחרי שינוי system prompt או מודל'],
              whenToUse: ['✅ שאלות פתוחות, תמיכה, יועץ, עוזר כתיבה', '✅ כשהמשתמש מבצע חקירה איטרטיבית', '❌ משימה דטרמיניסטית מוגדרת היטב (טופס, חישוב) — עדיף UI מובנה', '❌ כשצריך אחריות משפטית על כל תשובה בלי אימות אנושי']
            })
          },
          {
            id: 'algo', title: 'עין של אלגוריתמאי', render(el) {
              el.insertAdjacentHTML('beforeend', `<p>רשימת בדיקה — סמנו כשבדקתם בפרויקט שלכם:</p>`);
              checklist(el, [
                '<b>מדדים:</b> TTFT p50/p95, tokens/sec, עלות לשיחה, אחוז שיחות שנחתכו/סוכמו, רגרסיה אחרי שינוי prompt.',
                '<b>איכות:</b> פידבק 👍👎 מקושר ל-trace; LLM-as-judge מכויל מול דגימה אנושית; סט שיחות ארוכות.',
                '<b>Context:</b> אמוד טוקנים עם <code>count_tokens</code> ולא באורך תווים; שמרו מרווח לפלט (max_tokens).',
                '<b>Compaction:</b> בדקו שעובדות קריטיות (שם, מספר הזמנה, העדפות) שורדות סיכום — "pin" אותן.',
                '<b>עלות:</b> prompt caching לקידומת יציבה; Haiku לסיווג; הגבלת max_tokens; התראות תקציב למשתמש.',
                '<b>אבטחה:</b> לא API key בדפדפן; הנחה שהמשתמש עוין; הרשאות כלים לפי המשתמש; תוכן שנשלף = נתון, לא הוראה.',
                '<b>פרטיות:</b> מיסוך PII בלוגים, retention, מחיקה לפי בקשה, הפרדה בין tenants.',
                '<b>אמינות:</b> timeouts, retry עם backoff על 429/5xx, fallback למודל אחר, טיפול ב-<code>max_tokens</code> ו-<code>refusal</code>.',
                '<b>ביטול:</b> Stop מבטל באמת את הקריאה בשרת; אין המשך חיוב.',
                '<b>רפרודוקביליות:</b> גרסת system prompt ומודל נשמרים בכל הודעה; snapshot לנתוני evals.'
              ]);
            }
          },
          {
            id: 'quiz', title: 'בוחן', render(el) {
              LA.quiz(el, [
                { q: 'משתמש כתב בתור 1 "קוראים לי דנה" ובתור 5 שאל "מה שמי?" והמודל ענה נכון. מה הסיבה הנכונה?', options: ['המודל שומר זיכרון פנימי בין קריאות', 'ה-backend שלח שוב את ההיסטוריה (כולל תור 1) בקריאה', 'ה-API key מזהה את המשתמש', 'המודל למד את השם בזמן השיחה (fine-tuning)'], answer: 1, explain: 'LLM חסר מצב. ה"זיכרון" הוא ההיסטוריה שנשלחת מחדש כחלק מה-prompt.' },
                { q: 'בשיחה ללא ניהול היסטוריה, איך גדל סך טוקני הקלט המעובדים כפונקציה של מספר התורות n?', options: ['קבוע', 'לינארית', 'בקירוב ריבועית (~n²)', 'אקספוננציאלית'], answer: 2, explain: 'תור k שולח k תורות; הסכום 1+2+…+n ≈ n²/2.' },
                { q: 'איפה נכון לשמור את ה-API key של ה-LLM?', options: ['בקוד ה-JavaScript בדפדפן, מוסתר ע"י minify', 'ב-localStorage', 'בשרת, ב-secret manager/משתנה סביבה', 'ב-system prompt'], answer: 2, explain: 'כל מה שבצד לקוח ניתן לחילוץ. ה-backend הוא שכבת הבטחון.' },
                { q: 'למה streaming משפר חוויית משתמש גם כשזמן הסיום הכולל זהה?', options: ['הוא מקטין את עלות הטוקנים', 'הוא מקטין את זמן ההמתנה הנתפס — התגובה הראשונה מופיעה מוקדם (TTFT)', 'הוא משפר את איכות התשובה', 'הוא מבטל את מגבלת חלון ההקשר'], answer: 1, explain: 'המשתמש מתחיל לקרוא מיד. TTFT הוא המדד הנתפס; tokens/sec קובע כמה מהר ממשיך.' },
                { q: 'סיכום (compaction) של תורות ישנות — מה החיסרון העיקרי?', options: ['הוא גורם לשגיאת 400', 'אובדן פרטים מדויקים ועלות קריאת סיכום; הסיכום עצמו עלול לשגות', 'אי אפשר לעשות streaming אחריו', 'הוא מחייב מודל גדול יותר'], answer: 1, explain: 'סיכום הוא דחיסה עם אובדן. לכן "מצמידים" עובדות קריטיות ובודקים אותן ב-evals.' },
                { q: 'איזה מודל מתאים ביותר לסיווג כוונה/מודרציה לפני השיחה עצמה?', options: ['Opus — כי זה קריטי לבטיחות', 'Sonnet בלבד', 'Haiku — נפח גבוה, פלט קצר, latency ועלות נמוכים', 'אף מודל, רק regex'], answer: 2, explain: 'סיווג הוא משימה קלה ומהירה. Haiku כשער קדמי, ו-Sonnet/Opus רק למי שעבר.' },
                { q: 'המודל החזיר stop_reason="tool_use". מה ה-backend צריך לעשות?', options: ['להציג למשתמש את בלוק ה-tool_use כטקסט', 'להריץ את הכלי בעצמו ולשלוח הודעת user עם tool_result, ואז לקרוא שוב למודל', 'לסיים את התור', 'לשלוח את אותה הבקשה שוב'], answer: 1, explain: 'המודל רק מבקש. האפליקציה מריצה ומחזירה tool_result; הלולאה נמשכת עד end_turn.' },
                { q: 'משתמש לחץ Stop באמצע תשובה זורמת. מה חשוב לוודא?', options: ['שה-UI מסתיר את הטקסט', 'שהשרת מבטל את הקריאה ל-LLM כדי שלא ימשיך לחייב ולהאריך', 'שהשיחה נמחקת', 'שה-API key מתחלף'], answer: 1, explain: 'ביטול אמיתי (abort של הבקשה) חוסך כסף ומשאבים; הסתרה ב-UI לא עושה זאת.' }
              ]);
            }
          }
        ]
      });
    }
  });
})();
