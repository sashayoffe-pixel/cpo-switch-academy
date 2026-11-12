/* LLM Academy — home: the big map of how every topic connects to the LLM */
(function () {
  'use strict';
  const go = (id, t) => `<p style="margin-top:10px"><a class="btn primary" href="#/${id}">${t || 'למודול המלא'} ←</a></p>`;

  const TOPICS = [
    { id: 'llm', icon: '🧠', t: 'LLM מבפנים', d: 'טוקנים, embeddings, טרנספורמר, attention — עד הנוירון הבודד.' },
    { id: 'chat', icon: '💬', t: "ממשק צ'אט", d: 'למה המודל "שוכח", איך היסטוריה, streaming ו-context window עובדים.' },
    { id: 'rag', icon: '📚', t: 'RAG', d: 'לחבר את המודל למסמכים שלכם: chunking, embeddings, חיפוש וקטורי, ציטוטים.' },
    { id: 'langchain', icon: '🔗', t: 'LangChain', d: 'לבני הלגו: prompt | model | parser, retrievers, tools.' },
    { id: 'langgraph', icon: '🕸️', t: 'LangGraph', d: 'גרף מצבים: לולאות, הסתעפויות, checkpoint ואישור אנושי.' },
    { id: 'agents', icon: '🤖', t: 'סוכנים ותתי-סוכנים', d: 'LLM + כלים + לולאה. וגם: איזה מודל לכל תת-סוכן.' },
    { id: 'skills', icon: '🧰', t: 'Skills', d: 'יכולות ארוזות (SKILL.md) שנטענות רק כשצריך.' },
    { id: 'comfyui', icon: '🎨', t: 'ComfyUI', d: 'גרף nodes ויזואלי למודלי דיפוזיה — והקשר לטרנספורמרים.' },
    { id: 'clearml', icon: '📈', t: 'ClearML', d: 'MLOps: מעקב ניסויים, נתונים, צינורות, תורים ופריסה.' },
    { id: 'algorithmist', icon: '🧪', t: 'עין של אלגוריתמאי', d: 'השוואה בין כל התחומים, הערכה, עלויות, אבטחה, צ׳קליסט.' },
    { id: 'capstone', icon: '🏗️', t: 'פרויקט מסכם', d: 'מערכת שירות לקוחות אחת שמחברת את כל הנושאים.' },
    { id: 'exam', icon: '🎓', t: 'מבחן מסכם', d: '30 שאלות על כל החומר + סיכום חוזקות/חולשות.' }
  ];

  const MAP = {
    width: 900, height: 540,
    intro: `<div class="dg-hint">👆 לחצו על כל רכיב כדי להבין את תפקידו ביחס ל-LLM שבמרכז.<br>
      בכל מודול תמצאו דיאגרמה כזו שאפשר <b class="dive-ic">⤵</b> לצלול לתוכה עד הרכיב הקטן ביותר.</div>`,
    groups: [
      { x: 655, y: 30, w: 230, h: 485, label: 'מול המשתמש ותזמור', color: 'ui' },
      { x: 15, y: 30, w: 230, h: 485, label: 'יכולות והרחבות', color: 'tool' }
    ],
    nodes: [
      { id: 'llm', x: 450, y: 272, w: 150, h: 150, shape: 'circle', icon: '🧠', label: 'LLM', sub: 'המוח: מנבא טוקן הבא', color: 'llm',
        info: `<p>מודל שפה גדול הוא רשת נוירונים (Transformer) שאומנה לחזות את <b>הטוקן הבא</b>. כל שאר הרכיבים במפה קיימים כדי
        להזין אותו בהקשר הנכון, לתת לו ידיים (כלים), לנהל את הזרימה סביבו או למדוד אותו.</p>
        <p>בפנים: embeddings → עשרות שכבות של attention + MLP → הסתברות לכל טוקן במילון. בקורס נצלול עד <b>נוירון בודד</b>.</p>${go('llm')}` },
      { id: 'chat', x: 770, y: 92, icon: '💬', label: "ממשק צ'אט", sub: 'Chat UI', color: 'ui',
        info: `<p>החלון שבו המשתמש מדבר עם המודל. הסוד: המודל <b>חסר זיכרון</b> — הממשק שולח בכל תור את כל ההיסטוריה
        (system + user + assistant), מזרים תשובה טוקן-אחר-טוקן ומנהל את גבולות ה-context window.</p>${go('chat')}` },
      { id: 'langgraph', x: 770, y: 272, icon: '🕸️', label: 'LangGraph', sub: 'גרף מצבים / תזמור', color: 'ctrl',
        info: `<p>מנוע תזמור: מגדירים <b>State</b>, <b>nodes</b> (פונקציות/קריאות LLM) ו-<b>edges</b> (כולל תנאים ולולאות).
        מאפשר זיכרון מתמשך (checkpoints), עצירה לאישור אנושי ומערכות מרובות סוכנים.</p>${go('langgraph')}` },
      { id: 'agents', x: 770, y: 452, icon: '🤖', label: 'סוכנים', sub: 'LLM + כלים + לולאה', color: 'tool',
        info: `<p>סוכן = LLM שמחליט בעצמו <b>איזה כלי להפעיל ומתי לעצור</b>. תת-סוכנים מקבלים משימות ממוקדות —
        וכל אחד מהם מקבל מודל לפי מורכבות: ${LA.modelBadge('haiku')} לסיווג, ${LA.modelBadge('sonnet')} לעבודה שוטפת,
        ${LA.modelBadge('opus')} לתכנון.</p>${go('agents')}` },
      { id: 'rag', x: 450, y: 78, icon: '📚', label: 'RAG', sub: 'אחזור מסמכים → הקשר', color: 'store',
        info: `<p>Retrieval-Augmented Generation: לפני שהמודל עונה, מאחזרים את קטעי המסמכים הרלוונטיים (חיפוש וקטורי)
        ומדביקים אותם לפרומפט. כך המודל עונה על <b>המידע שלכם</b>, עדכני ועם ציטוטים.</p>${go('rag')}` },
      { id: 'clearml', x: 450, y: 470, icon: '📈', label: 'ClearML', sub: 'MLOps: ניסויים ופריסה', color: 'data',
        info: `<p>פלטפורמת MLOps: רושמת כל ניסוי (קוד, פרמטרים, מדדים), מנהלת גרסאות דאטה, מריצה צינורות על GPU דרך תורים
        ומגישה מודלים. סביב LLM: מעקב אחרי fine-tuning, ניסויי RAG ו-evals.</p>${go('clearml')}` },
      { id: 'skills', x: 130, y: 92, icon: '🧰', label: 'Skills', sub: 'SKILL.md נטען לפי צורך', color: 'tool',
        info: `<p>חבילת ידע+כלים לסוכן: תיקייה עם SKILL.md (שם, תיאור, הוראות) וסקריפטים. המודל רואה רק את התיאור הקצר,
        וטוען את השאר רק כשהמשימה דורשת — חוסך context.</p>${go('skills')}` },
      { id: 'langchain', x: 130, y: 272, icon: '🔗', label: 'LangChain', sub: 'רכיבים: prompt|llm|parser', color: 'ctrl',
        info: `<p>ספריית רכיבים שעוטפת מודלים מכל הספקים בממשק אחיד: תבניות פרומפט, parsers, retrievers, tools,
        וחיבור ב-<code>|</code>. LangGraph בנוי מעליה לתזמור מורכב.</p>${go('langchain')}` },
      { id: 'comfyui', x: 130, y: 452, icon: '🎨', label: 'ComfyUI', sub: 'גרף nodes לדיפוזיה', color: 'neuron',
        info: `<p>ממשק nodes ויזואלי למודלי תמונה/וידאו. ה-text encoder שבו הוא טרנספורמר — אותה משפחה של LLM;
        ו-LLM יכול לכתוב לו פרומפטים או להפעיל אותו ככלי דרך API.</p>${go('comfyui')}` }
    ],
    edges: [
      { from: 'chat', to: 'langgraph', label: 'הודעה' },
      { from: 'langgraph', to: 'agents', label: 'ניתוב' },
      { from: 'agents', to: 'rag', label: 'כלי חיפוש', bend: -40 },
      { from: 'rag', to: 'llm', label: 'הקשר', color: 'store' },
      { from: 'agents', to: 'llm', label: 'קריאות מודל', color: 'llm' },
      { from: 'llm', to: 'chat', label: 'תשובה בזרימה', bend: -60, color: 'ui' },
      { from: 'skills', to: 'llm', label: 'הוראות', color: 'tool' },
      { from: 'langchain', to: 'llm', label: 'עוטף', dashed: true, both: true },
      { from: 'llm', to: 'comfyui', label: 'prompt לתמונה', color: 'neuron' },
      { from: 'clearml', to: 'llm', label: 'מעקב/הערכה', dashed: true, color: 'data' }
    ]
  };

  const JOURNEY = [
    { id: 'chat', t: '1. המשתמש כותב', d: 'עובדת שואלת בצ׳אט הפנימי: <b>"כמה ימי חופשה נשארו לי ואיך מגישים בקשה?"</b>. הממשק מוסיף את ההיסטוריה ושולח לשרת.', path: ['chat'] },
    { id: 'langgraph', t: '2. התזמור מנתב', d: 'גרף LangGraph מקבל את ההודעה ל-State. node ראשון — מסווג כוונה עם ' + LA.modelBadge('haiku') + ' (מהיר וזול): "שאלת מדיניות + נתון אישי".', path: ['chat', 'langgraph'] },
    { id: 'agents', t: '3. סוכן בוחר כלים', d: 'סוכן ' + LA.modelBadge('sonnet') + ' מחליט: (א) לחפש במסמכי נוהל החופשות (RAG), (ב) להפעיל כלי <code>get_vacation_balance(employee_id)</code>.', path: ['langgraph', 'agents'] },
    { id: 'rag', t: '4. אחזור מסמכים', d: 'השאלה הופכת ל-embedding, מחפשים במאגר וקטורי, ומחזירים 3 קטעים מ"נוהל חופשות 2026" עם מקור.', path: ['agents', 'rag'] },
    { id: 'llm', t: '5. ה-LLM מנסח', d: 'הקטעים + היתרה (12.5 ימים) נכנסים לפרומפט. המודל מנבא טוקן אחר טוקן תשובה מבוססת עם ציטוט [1].', path: ['rag', 'llm'] },
    { id: 'chat', t: '6. תשובה בזרימה', d: 'התשובה מוזרמת לצ׳אט: "נותרו לך 12.5 ימים. מגישים דרך פורטל HR עד 14 יום מראש [1]". 👍/👎 של המשתמש נשמר ל-evals.', path: ['llm', 'chat'] },
    { id: 'clearml', t: '7. מדידה ושיפור', d: 'ClearML רושם את גרסת הפרומפט, הגדרות ה-chunking ותוצאות ה-eval הלילי — כדי שכל שינוי יימדד לפני שעולה לייצור.', path: ['clearml', 'llm'] }
  ];

  function hero() {
    return `<div class="home-hero">
      <div class="home-hero-t">
        <h2>מהנוירון הבודד ועד מערכת סוכנים שלמה</h2>
        <p>קורס אינטראקטיבי שמסביר את המושגים החמים בעולם ה-LLM — <b>ממשק צ'אט, RAG, LangChain, LangGraph, סוכנים ותתי-סוכנים,
        Skills, ComfyUI ו-ClearML</b> — דרך דיאגרמות שאפשר לצלול לתוכן, מעבדות שמחשבות באמת, דוגמאות קוד מוחשיות, וטבלאות
        של דרישות, חוזקות וחולשות לכל תחום. בסוף כל מודול: מה אלגוריתמאי AI חייב לבדוק, ובוחן.</p>
        <div class="pill-row"><span class="pill">🧭 12 מודולים</span><span class="pill">🔬 דיאגרמות עם drill-down</span><span class="pill">🧪 מעבדות אינטראקטיביות</span><span class="pill">🎯 ניתוב מודלים לפי מורכבות</span></div>
      </div>
      <div class="home-hero-art" aria-hidden="true">${heroArt()}</div>
    </div>`;
  }
  function heroArt() {
    // decorative mini neural net
    const L = [3, 5, 5, 2], W = 260, H = 190; let out = `<svg viewBox="0 0 ${W} ${H}" class="home-net">`;
    const pos = L.map((n, i) => Array.from({ length: n }, (_, j) => [30 + i * (W - 60) / (L.length - 1), H / 2 + (j - (n - 1) / 2) * 34]));
    for (let i = 0; i < L.length - 1; i++) pos[i].forEach(a => pos[i + 1].forEach(b => {
      out += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" class="home-syn" style="animation-delay:${((a[1] + b[0]) % 7) * .3}s"/>`;
    }));
    pos.forEach((col, i) => col.forEach(p => out += `<circle cx="${p[0]}" cy="${p[1]}" r="9" class="home-neu l${i}"/>`));
    return out + '</svg>';
  }

  function cards(el) {
    const grid = LA.h('div', { class: 'home-cards' });
    TOPICS.forEach((t, k) => {
      const pr = LA.progress(t.id);
      const st = pr.quiz >= 0.7 ? '<span class="badge ok">✅ עבר בוחן</span>' : pr.visited ? '<span class="badge acc">◐ התחלתם</span>' : '<span class="badge">טרם התחלתם</span>';
      grid.appendChild(LA.h('a', { class: 'home-card', href: '#/' + t.id, html:
        `<div class="home-card-n">${k + 1}</div><div class="home-card-ic">${t.icon}</div><h4>${t.t}</h4><p>${t.d}</p>${st}` }));
    });
    el.appendChild(grid);
  }

  LA.register({
    id: 'home', order: 0, group: 'start', icon: '🏠', short: 'דף הבית', title: 'LLM Academy — דף הבית',
    render(main) {
      LA.page(main, {
        icon: '🧠', title: 'LLM Academy',
        subtitle: 'קורס אינטראקטיבי: איך כל הכלים והמושגים מתחברים סביב מודל שפה גדול',
        sections: [
          {
            id: 'welcome', title: 'ברוכים הבאים', html: hero() +
              LA.callout('info', `<p>כמה הבהרות לגבי המונחים שביקשת:</p>${LA.list([
                '<b>"configui"</b> — פירשנו כ-<b>ComfyUI</b>: ממשק ה-nodes הפופולרי לזרימות עבודה של מודלים גנרטיביים (תמונה/וידאו). זה מתאים גם לבקשה "לצלול עד רמת ה-node".',
                '<b>"ממש צאט"</b> — פירשנו כ-<b>ממשק צ\'אט (Chat UI)</b>: השכבה שדרכה משתמשים מדברים עם LLM.',
                '<b>ClearML</b> — נכלל כמודול מלא (MLOps), כולל ההבדל בין "ClearML Agent" (תהליך עבודה) לבין "סוכן AI".'
              ])}`, 'איך פירשנו את הבקשה') +
              LA.callout('analogy', `<p>דמיינו מסעדה: <b>ה-LLM הוא השף</b> — מוכשר מאוד אבל לא יודע מה יש במקרר שלכם ולא זוכר הזמנות קודמות.
              <b>ממשק הצ'אט</b> הוא המלצר שמעביר את ההזמנה (וכל ההיסטוריה) בכל פעם. <b>RAG</b> הוא העוזר שרץ למזווה ומביא את המצרכים הנכונים.
              <b>כלים וסוכנים</b> הם הידיים של השף — הוא מחליט מתי לחתוך ומתי לטגן. <b>Skills</b> הם ספרי מתכונים שנפתחים רק כשצריך.
              <b>LangChain</b> הוא סט כלי המטבח האחיד, <b>LangGraph</b> הוא תרשים הזרימה של המטבח (מי עושה מה, ומתי מחכים לאישור המנהל),
              <b>ComfyUI</b> הוא מחלקת הקונדיטוריה שמעצבת את הצלחת, ו-<b>ClearML</b> הוא ספר הבקרה שרושם כל מתכון וכל טעימה כדי להשתפר.</p>`)
          },
          {
            id: 'map', title: 'המפה הגדולה — הכל סביב ה-LLM', render(el) {
              el.insertAdjacentHTML('beforeend', '<p>זו מפת הקורס. במרכז — ה-LLM. מימין: מה שפוגש את המשתמש ומתזמר את העבודה. משמאל: יכולות שמרחיבות את המודל. למטה: MLOps שמודד ומשפר את הכל.</p>');
              const api = LA.diagram(el, MAP);
              el.insertAdjacentHTML('beforeend', '<h3>מסע של בקשה אחת דרך המערכת</h3><p>לחצו "הפעל" כדי לראות שאלה אמיתית עוברת בין הרכיבים — והנקודה הזוהרת זזה על המפה למעלה.</p>');
              LA.stepper(el, {
                intro: 'תרחיש: בוט HR פנימי של חברה ישראלית. לחצו "הבא" או "הפעל".',
                autoplayMs: 2600,
                onReset: () => api.highlight([]),
                steps: JOURNEY.map(j => ({
                  title: j.t, html: `<p>${j.d}</p>`,
                  run: (ctx, silent) => { if (silent) return; api.select(j.id); return j.path.length > 1 ? api.flow(j.path, 650) : api.highlight(j.path); }
                }))
              });
            }
          },
          {
            id: 'path', title: 'מסלול הלימוד', render(el) {
              el.insertAdjacentHTML('beforeend', '<p>מומלץ ללמוד לפי הסדר: קודם להבין מה קורה <b>בתוך</b> המודל, אחר כך איך מדברים איתו, איך מזינים לו ידע, ואיך בונים סביבו מערכות. סימון ✅ מופיע אחרי ציון 70%+ בבוחן.</p>');
              cards(el);
            }
          },
          {
            id: 'routing', title: 'עיקרון שחוזר בכל הקורס: ניתוב מודלים לפי מורכבות',
            html: `<p>כשמגדירים סוכנים ותתי-סוכנים, לא כל משימה צריכה את המודל החזק (והיקר והאיטי) ביותר. בכל מודול נציין לכל רכיב איזה מודל מתאים לו ולמה.</p>` +
              LA.table(['שכבה', 'מודל', 'מתאים ל…', 'דוגמאות בקורס'], [
                ['מהיר וזול', LA.modelBadge('haiku') + `<br><code>claude-haiku-5-5</code>`, 'נפח גבוה, משימות מוגדרות היטב, latency נמוך', 'סיווג כוונה, ניתוב, חילוץ שדות, שכתוב שאילתה ל-RAG, moderation'],
                ['מאוזן', LA.modelBadge('sonnet') + `<br><code>claude-sonnet-5-5</code>`, 'רוב עבודת הסוכנים היומיומית', 'ניסוח תשובת RAG, סוכן עם כלים, כתיבת קוד, ביקורת'],
                ['חזק', LA.modelBadge('opus') + `<br><code>claude-opus-5-5</code>`, 'תכנון, היגיון רב-שלבי, החלטות בסיכון גבוה', 'orchestrator שמפרק משימה, הסלמת מקרים מורכבים, תכנון ארכיטקטורה']
              ]) +
              LA.callout('algo', `כלל אצבע: התחילו מהמודל שעובר את סט ההערכה שלכם בעלות הנמוכה ביותר <b>לכל משימה שהושלמה</b> (לא לכל קריאה) — מודל זול שנכשל ומחייב ניסיון חוזר אינו באמת זול. נסו גם את המודל החזק ב-effort נמוך לפני שבונים מפל (cascade) של מודלים.`)
          },
          {
            id: 'how', title: 'איך ללמוד מהקורס',
            html: `<div class="grid3">
              <div class="card"><h4>🔍 לחצו על הכל</h4><p class="muted">כל רכיב בדיאגרמה פותח הסבר. רכיב עם ⤵ נפתח לדיאגרמה פנימית — כך יורדים מהמערכת עד ה-node הבודד.</p></div>
              <div class="card"><h4>🧪 שחקו במעבדות</h4><p class="muted">כל מעבדה מחשבת באמת (בדפדפן, בלי API): נוירון, attention, חיפוש וקטורי, הרצת גרף, ניתוב מודלים ועוד.</p></div>
              <div class="card"><h4>🧾 העתיקו קוד</h4><p class="muted">דוגמאות הקוד ב-Python עם ספריות אמיתיות (anthropic, langchain, langgraph, clearml) — כפתור "העתק" בכל בלוק.</p></div>
            </div>` + LA.callout('tip', 'הקורס עובד גם בלי אינטרנט — פשוט פותחים את <code>index.html</code> בדפדפן. ההתקדמות נשמרת מקומית בדפדפן.')
          }
        ]
      });
    }
  });
})();
