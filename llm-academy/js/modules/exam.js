(function () {
  'use strict';

  /* מבחן מסכם — 30 שאלות, 3 לכל נושא. אפשרויות מעורבבות בכל הרצה (והאינדקס הנכון מתעדכן בהתאם).
     שאלה: [נושא, שאלה, [4 אפשרויות], אינדקס נכון, הסבר] */

  const TOPICS = [
    { id: 'llm', label: 'LLM פנימה', mod: 'llm' },
    { id: 'chat', label: 'ממשקי צ׳אט', mod: 'chat' },
    { id: 'rag', label: 'RAG', mod: 'rag' },
    { id: 'langchain', label: 'LangChain', mod: 'langchain' },
    { id: 'langgraph', label: 'LangGraph', mod: 'langgraph' },
    { id: 'agents', label: 'סוכנים וניתוב מודלים', mod: 'agents' },
    { id: 'skills', label: 'Skills', mod: 'skills' },
    { id: 'comfyui', label: 'ComfyUI', mod: 'comfyui' },
    { id: 'clearml', label: 'ClearML', mod: 'clearml' },
    { id: 'algorithmist', label: 'פרקטיקות אלגוריתמאי', mod: 'algorithmist' }
  ];
  const TOPIC_BY_ID = Object.fromEntries(TOPICS.map(t => [t.id, t]));

  const QUESTIONS = [
    /* ---------- LLM פנימה ---------- */
    ['llm', 'מהו טוקן (token) במודל שפה?', [
      'תו בודד בלבד',
      'משפט שלם',
      'מספר בין 0 ל-1 שמייצג משמעות',
      'חתיכת טקסט (לרוב חלק ממילה) שהמודל קורא ומפיק'
    ], 3, 'טוקן הוא יחידת העיבוד של המודל, לרוב חלק ממילה. עלות, זמן וחלון ההקשר נמדדים בטוקנים, ולכן טקסט בעברית עשוי לצרוך יותר טוקנים מאותו טקסט באנגלית.'],
    ['llm', 'מה עושה פונקציית softmax בשכבת הפלט של LLM?', [
      'מאפסת משקלים חריגים',
      'מחשבת את מספר הטוקנים בחלון ההקשר',
      'ממירה לוגיטים להתפלגות הסתברות שסכומה 1 על פני הטוקנים',
      'שומרת את מטמון ה-KV'
    ], 2, 'Softmax לוקחת ציונים גולמיים (logits) ומחזירה הסתברויות חיוביות שסכומן 1. מהן דוגמים את הטוקן הבא.'],
    ['llm', 'מדוע משתמשים ב-KV cache בזמן יצירת טקסט?', [
      'כדי לאמן מחדש את המודל בכל בקשה',
      'כדי לדחוס את המשקלים ל-4 ביט',
      'כדי לשמור את היסטוריית השיחה בדיסק לשנה',
      'כדי לשמור מפתחות וערכים של טוקנים שכבר עובדו ולא לחשב אותם שוב בכל טוקן פלט'
    ], 3, 'בפענוח אוטורגרסיבי כל טוקן חדש ניגש לכל הקודמים. ה-KV cache מונע חישוב מחדש שלהם, ולכן התשובה נכתבת מהר יותר. המחיר הוא זיכרון GPU שגדל עם אורך ההקשר.'],

    /* ---------- ממשקי צ׳אט ---------- */
    ['chat', 'מה נכון לגבי זיכרון השיחה במודל שפה?', [
      'המודל זוכר אוטומטית את כל השיחות הקודמות של המשתמש',
      'השיחה נשמרת אוטומטית בתוך ערך ה-temperature',
      'המודל מעדכן את משקליו אחרי כל תור',
      'המודל חסר מצב: האפליקציה שולחת מחדש את היסטוריית השיחה בכל קריאה'
    ], 3, 'ה-API של LLM הוא חסר מצב (stateless). לכן עלות השיחה גדלה עם אורכה, וניהול ההיסטוריה (חיתוך, סיכום, אחזור) הוא תפקיד האפליקציה.'],
    ['chat', 'מה התפקיד של ה-system prompt?', [
      'להחליף את הודעת המשתמש הראשונה',
      'לקבוע את גודל חלון ההקשר',
      'להפעיל כלים באופן אוטומטי',
      'להגדיר את התפקיד, הטון והכללים של העוזר לכל השיחה'
    ], 3, 'ה-system prompt הוא הוראות קבועות שמלוות את כל השיחה. בדרך כלל המשתמש לא רואה אותו, ולכן מתאים לשמור בו מדיניות, פורמט וטון.'],
    ['chat', 'מה מודד TTFT (Time To First Token)?', [
      'מספר הטוקנים שנוצרים בשנייה',
      'עלות הטוקן הראשון',
      'את אורך ההקשר המקסימלי',
      'הזמן עד הטוקן הראשון, והוא מה שהמשתמש מרגיש כ"תגובה"'
    ], 3, 'TTFT הוא המדד של תחושת המהירות בצ׳אט עם סטרימינג. הוא תלוי בעיקר באורך הקלט ובעומס על השרת, ולא בקצב הכתיבה.'],

    /* ---------- RAG ---------- */
    ['rag', 'מה התפקיד של reranker במערכת RAG?', [
      'ליצור embeddings למסמכים',
      'לחלק מסמכים לקטעים',
      'לשמור את האינדקס בדיסק',
      'לדרג מחדש את המועמדים מהאחזור הראשוני, מדויק יותר ואיטי יותר'
    ], 3, 'Reranker (בדרך כלל cross-encoder) רואה את השאילתה והמסמך יחד ולכן מדויק יותר. הוא איטי, לכן מפעילים אותו רק על מאות מועמדים מובילים ולא על כל המאגר.'],
    ['rag', 'מתי חיפוש היברידי (BM25 + וקטורי) הוא הבחירה הטובה?', [
      'כשהמסמכים קצרים מ-10 טוקנים',
      'כשאין GPU זמין',
      'רק כשאין מילות מפתח בשאלה',
      'כשצריך גם התאמה מילולית מדויקת (שמות, מזהים) וגם הבנה סמנטית'
    ], 3, 'BM25 תופס מונחים מדויקים שאמבדינג עלול לטשטש, והחיפוש הוקטורי תופס ניסוחים שונים לאותה משמעות. השילוב, לרוב עם RRF, הוא ברירת מחדל טובה בייצור.'],
    ['rag', 'מה מודד Recall@5?', [
      'איכות התשובה הסופית של ה-LLM',
      'זמן האחזור הממוצע במילישניות',
      'כמה מהטוקנים בפרומפט הם מהמאגר',
      'האחוז מהשאילתות שבהן מסמך רלוונטי נמצא בחמש התוצאות הראשונות'
    ], 3, 'Recall@k בודק אם האחזור מוצא את המידע בכלל בתוך k התוצאות. אם המידע לא הגיע ל-LLM, הוא לא יוכל לענות נכון, גם אם הוא מודל מצוין.'],

    /* ---------- LangChain ---------- */
    ['langchain', 'מה עושה האופרטור | ב-LCEL?', [
      'מבצע OR לוגי על ערכים בוליאניים',
      'פותח קובץ לכתיבה',
      'משווה שני טקסטים',
      'משרשר רכיבים כך שהפלט של אחד נכנס כקלט של הבא'
    ], 3, 'לדוגמה: chain = prompt | llm | StrOutputParser(). הרכיבים הם Runnables, ולכן השרשרת מקבלת invoke, stream ו-batch בלי קוד נוסף.'],
    ['langchain', 'מה ההבדל בין PromptTemplate ל-ChatPromptTemplate?', [
      'PromptTemplate מיועדת רק ל-JSON',
      'ChatPromptTemplate מחליפה את מודל הצ׳אט',
      'ChatPromptTemplate מייצרת רשימת הודעות בתפקידים (system, user) לשיחה',
      'אין הבדל מהותי'
    ], 2, 'מודלי צ׳אט מקבלים רשימת הודעות בתפקידים, ולכן ChatPromptTemplate היא הבחירה הטבעית. PromptTemplate מייצרת מחרוזת אחת.'],
    ['langchain', 'מה מחזיר Retriever?', [
      'רשימה של מסמכים (Document) רלוונטיים לשאילתה',
      'תשובה סופית בטקסט חופשי',
      'וקטור יחיד שמייצג את כל המאגר',
      'מודל מותאם אישית'
    ], 0, 'Retriever הוא ממשק אחיד לאחזור. מאחוריו יכול להיות חיפוש וקטורי, BM25 או היברידי, וכך אפשר להחליף אסטרטגיה בלי לשנות את השרשרת.'],

    /* ---------- LangGraph ---------- */
    ['langgraph', 'מה תפקיד reducer ב-LangGraph?', [
      'מקטין את מספר הצמתים בגרף',
      'מוחק checkpoints ישנים',
      'מחשב את ה-CFG בזמן ריצה',
      'מגדיר איך עדכון מצומת ממוזג עם הערך הקיים ב-state, למשל הוספה לרשימת ההודעות'
    ], 3, 'ברירת המחדל היא דריסת השדה. Reducer כמו add_messages מאפשר לצמתים להוסיף הודעות בלי לאבד את ההיסטוריה.'],
    ['langgraph', 'מה עושה checkpointer?', [
      'מקמפל את הקוד ל-GPU',
      'מחשב embeddings לכל צומת',
      'מתזמן את הגרף ב-cron',
      'שומר snapshot של ה-state לפי thread, כדי לאפשר זיכרון, המשך אחרי עצירה ו-time travel'
    ], 3, 'Checkpointer שומר את ה-state אחרי כל super-step. בלעדיו אין זיכרון בין הרצות, ואין interrupt שאפשר להמשיך ממנו.'],
    ['langgraph', 'מתי משתמשים ב-interrupt() ב-LangGraph?', [
      'כשיש שגיאת תחביר בצומת',
      'כדי להאיץ את הגרף על ידי דילוג על צמתים',
      'כדי למחוק את ה-thread',
      'כדי לעצור את הגרף ולחכות לקלט או אישור אנושי, ואז להמשיך מאותו מקום'
    ], 3, 'זהו כלי ההתערבות האנושית: הגרף נעצר, הערך שהועבר מוצג לאדם, והריצה נמשכת עם Command(resume=...) באותו thread_id.'],

    /* ---------- סוכנים וניתוב מודלים ---------- */
    ['agents', 'מה מאפיין את דפוס ReAct?', [
      'המודל לא משתמש בכלים',
      'תשובה קצרה של פחות מ-100 טוקנים',
      'לולאה של נימוק, פעולה ותצפית, כשהמודל מפעיל כלים ומשתמש בתוצאותיהם',
      'אין הבדל בינו לבין צ׳אט רגיל'
    ], 2, 'ReAct הוא הבסיס למרבית הסוכנים שמשתמשים בכלים: המודל מחליט, האפליקציה מבצעת, והתוצאה חוזרת למודל לצעד הבא.'],
    ['agents', 'סוכן מסווג פניות תמיכה לקטגוריות, כ-100,000 פניות ביום. איזה מודל לשייך לו?', [
      'Haiku, כי מדובר בסיווג בנפח גבוה שדורש מהירות וזול',
      'Opus, כי הוא הכי חזק',
      'Opus עם effort מקסימלי',
      'לא משנה, כל המודלים עולים אותו דבר'
    ], 0, 'ניתוב לפי מורכבות: סיווג הוא משימה פשוטה וחוזרת. Haiku נותן דיוק טוב במחיר ובזמן תגובה נמוכים, ואילו Opus יקר בהרבה לאותה משימה.'],
    ['agents', 'סוכן ראשי מתכנן מחקר ומפזר משימות לארבעה תתי-סוכנים. באיזה מודל כדאי להשתמש בתפקיד הראשי?', [
      'Haiku, כי התכנון זול',
      'Sonnet בלבד, ללא שינוי',
      'Opus, כי תכנון, היגיון מורכב ותיאום הם החלק הקשה והמשפיע ביותר',
      'מודל מקומי קטן, כי אין צורך ב-LLM'
    ], 2, 'במערכות multi-agent ההחלטות של המתזמן קובעות את איכות כל התוצאה, ולכן הוא שווה את המודל החזק ביותר. תתי-הסוכנים הממוקדים יכולים לרוץ על Haiku או Sonnet.'],

    /* ---------- Skills ---------- */
    ['skills', 'מה תפקיד השדה description ב-frontmatter של SKILL.md?', [
      'שם הקובץ בדיסק',
      'מגבלת הגודל של הסקריפטים',
      'קובע את צבע ה-Skill בממשק',
      'הטקסט שהסוכן רואה כדי להחליט מתי להפעיל את ה-Skill'
    ], 3, 'ה-description הוא מנגנון הניתוב של Skill. תיאור מעורפל יגרום להפעלה שגויה או להחמצה, ולכן כדאי לכתוב בו מתי להשתמש ומתי לא.'],
    ['skills', 'מה המשמעות של progressive disclosure ב-Skills?', [
      'בתחילה נטענים רק שם ותיאור, ואת הגוף והקבצים הנלווים טוענים לפי הצורך',
      'כל ה-Skill נטען לחלון ההקשר מההתחלה',
      'המשתמש רואה את ה-Skill בהדרגה במסך',
      'הסקריפטים מוצפנים בשלבים'
    ], 0, 'כך Skill יכול להכיל ידע רב בלי להעמיס על חלון ההקשר. רק מה שנדרש לשלב הנוכחי נכנס בפועל.'],
    ['skills', 'מדוע לעטוף חישוב דטרמיניסטי בסקריפט בתוך Skill?', [
      'כי LLM לא יכול לקרוא טקסט',
      'כי סקריפטים מאיצים את ספירת הטוקנים',
      'כדי לחסוך שמות קבצים',
      'כדי שהחישוב יהיה מדויק ועקבי, ולא יסתמך על יצירת הטקסט של המודל'
    ], 3, 'מודל עלול להשתבש בחשבון או בעיבוד קבצים, אבל סקריפט מחזיר את אותה תוצאה בכל הרצה. המודל מתזמן ומפרש, והסקריפט מבצע.'],

    /* ---------- ComfyUI ---------- */
    ['comfyui', 'מה עושה צומת KSampler?', [
      'טוען מודל מהדיסק',
      'ממיר פיקסלים ל-latent',
      'מקטין את התמונה לגודל תצוגה',
      'מריץ את לולאת הדנוזינג על ה-latent לפי המודל, הפרומפטים, seed, steps, CFG, sampler ו-scheduler'
    ], 3, 'KSampler הוא ליבת היצירה. Load Checkpoint ו-CLIP Text Encode מספקים לו את המודל והתנאים, ו-VAE Decode בהמשך הופך את התוצאה לתמונה.'],
    ['comfyui', 'מה קורה כשמורידים מאוד את ערך CFG?', [
      'התמונה נאמנה לפרומפט מאוד ומגושמת',
      'הפרומפט נמחק מהזיכרון',
      'היצירה חופשית ופחות נאמנה לפרומפט',
      'ה-VAE מפסיק לעבוד'
    ], 2, 'CFG שולט בעוצמת ההיצמדות לפרומפט. CFG נמוך נותן יצירה חופשית יותר אך פחות תואמת לתיאור; CFG גבוה מדי עלול ל"שרוף" את התמונה.'],
    ['comfyui', 'מה תפקיד ה-seed?', [
      'קובע את גודל התמונה בפיקסלים',
      'מאתחל את הרעש ההתחלתי: אותו seed והגדרות נותנים את אותה תמונה',
      'מוסיף טוקנים לפרומפט',
      'בוחר את כרטיס ה-GPU'
    ], 1, 'Seed מאפשר שחזור והשוואה מסודרת: משנים גורם אחד בכל פעם ושומרים על אותו seed. זה הבסיס לניסויים מבוקרים ב-ComfyUI.'],

    /* ---------- ClearML ---------- */
    ['clearml', 'מה ההבדל בין Task ל-Logger ב-ClearML?', [
      'Logger מריץ את המשימות על ה-GPU',
      'Task הוא מסד נתונים לתמונות',
      'אין הבדל',
      'Task הוא יחידת ההרצה המתועדת; Logger הוא ה-API לרישום מטריקות וגרפים בתוכה'
    ], 3, 'כל ניסוי הוא Task, ובתוכו מרשמים מטריקות דרך ה-Logger. ה-Task שומר גם קוד, פרמטרים ותוצרים, ומאפשר השוואה ושכפול.'],
    ['clearml', 'מה תפקיד ClearML Agent?', [
      'לאחסן מודלים לטווח ארוך',
      'לכתוב דוחות לבעלי עניין',
      'לשלוף משימות מתור ולהריץ אותן על מכונה עם CPU/GPU בסביבה מבודדת',
      'לתרגם את הקוד ל-Python'
    ], 2, 'הפרדה בין שליחת המשימה להרצתה מאפשרת לנצל שרתי GPU משותפים ומכונות ענן, בלי שכל מפתח יצטרך להתקין סביבה אצלו.'],
    ['clearml', 'למה משתמשים ב-Dataset גרסתי ב-ClearML?', [
      'כדי לדחוס את הקבצים',
      'כדי לשנות את התוויות כל יום',
      'כדי לדעת בדיוק על אילו נתונים אומן כל מודל ולשחזר את אותו סט בעתיד',
      'כדי לשתף סיסמאות בין הצוותים'
    ], 2, 'Dataset עם hash ושושלת מאפשר לענות על השאלה "מאילו נתונים נוצר המודל הזה?". זה קריטי לשחזור, לביקורת ולהשוואה הוגנת בין ניסויים.'],

    /* ---------- פרקטיקות אלגוריתמאי ---------- */
    ['algorithmist', 'מהו data leakage בהערכת מערכת LLM?', [
      'מידע שנשלח ל-API בלי הצפנה',
      'מודל שנשכח לשמור לדיסק',
      'טוקנים שהלכו לאיבוד בסטרימינג',
      'מידע מסט הבדיקה מגיע לאימון, לפרומפט או לאינדקס ומנפח את התוצאות'
    ], 3, 'כשהמודל "רואה" את התשובות בזמן ההערכה, המדד נראה טוב מדי ולא משקף ביצועים בייצור. יש לשמור את סט הבדיקה נפרד מכל שלב בצינור.'],
    ['algorithmist', 'מהו prompt injection?', [
      'הוספת דוגמאות few-shot לפרומפט',
      'הגדלת חלון ההקשר',
      'ניסוי A/B בין שני פרומפטים',
      'טקסט זדוני בתוך נתונים שהסוכן קורא, שמנסה לשנות את הוראותיו'
    ], 3, 'כשהסוכן קורא דף, מייל או תוצאת כלי, כל מה שכתוב שם עלול להתפרש כהוראה. ההגנה: הפרדה בין הוראות לנתונים, הרשאות מינימליות ואישור אנושי לפעולות רגישות.'],
    ['algorithmist', 'איך נכון להשתמש ב-LLM-as-a-judge?', [
      'כמחליף מלא להערכה אנושית',
      'כשיטה לדחיסת מודל',
      'כ-guardrail שחוסם שאלות',
      'מודל חזק מדרג פלטים לפי רובריקה ברורה, כשהוא מכויל מול שיפוט אנושי על מדגם'
    ], 3, 'שופט אוטומטי חסכוני וניתן להרחבה, אבל הוא מוטה (למשל מעדיף תשובה ארוכה או כזו בסגנונו). כיול מול בני אדם מוכיח שהוא עוקב אחרי איכות אמיתית.']
  ];

  /* קורא ל-LA.quiz עם {id:'exam'}; הנתונים מוצגים בקובץ זה ולא ב-core */
  const QS = QUESTIONS.map(([t, q, o, a, e], i) => ({ i, t, q, o, a, e }));

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  LA.register({
    id: 'exam', order: 210, group: 'ref', icon: '🎓', short: 'מבחן מסכם', title: 'מבחן מסכם',
    render(main) {
      const st = { topics: new Set(TOPICS.map(t => t.id)), mode: 'all' };
      const refs = {};

      function pool() { return QS.filter(q => st.topics.has(q.t)); }

      function paintSetup() {
        if (!refs.start) return;
        const n = pool().length;
        const want = st.mode === 'rand' ? Math.min(15, n) : n;
        refs.start.textContent = n ? '▶ התחל מבחן (' + want + ' שאלות)' : 'בחרו לפחות נושא אחד';
        refs.start.disabled = !n;
        refs.topicEls.forEach(({ btn, id }) => btn.classList.toggle('on', st.topics.has(id)));
        refs.modeEls.forEach(({ btn, m }) => btn.classList.toggle('on', st.mode === m));
        refs.topicCount.textContent = 'נבחרו ' + st.topics.size + ' מתוך ' + TOPICS.length + ' נושאים · ' + n + ' שאלות זמינות';
      }

      function renderResults(items, answers, host) {
        const byTopic = {};
        TOPICS.forEach(t => { byTopic[t.id] = { c: 0, n: 0 }; });
        items.forEach((it, k) => { byTopic[it.topic].n++; if (answers[k]) byTopic[it.topic].c++; });
        const total = answers.filter(Boolean).length;
        const pct = Math.round(total / items.length * 100);
        const pass = pct >= 70;
        const rows = TOPICS.filter(t => byTopic[t.id].n > 0).map(t => {
          const { c, n } = byTopic[t.id];
          const ratio = c / n, weak = ratio < 0.7;
          return LA.h('div', { class: 'exam-row' + (weak ? ' weak' : '') },
            LA.h('div', { class: 'exam-row-h' },
              LA.h('b', { text: t.label }),
              LA.h('span', { class: 'exam-frac', text: c + '/' + n + ' · ' + Math.round(ratio * 100) + '%' })),
            LA.h('div', { class: 'exam-bar' }, LA.h('i', { style: { width: Math.round(ratio * 100) + '%' } })),
            weak
              ? LA.h('a', { class: 'exam-review', href: '#/' + t.mod, text: '🔁 לחזרה על ' + t.label + ' ←' })
              : LA.h('span', { class: 'exam-ok', text: '✅ שליטה טובה' }));
        });
        host.appendChild(LA.h('div', { class: 'exam-results' },
          LA.h('div', { class: 'exam-verdict ' + (pass ? 'pass' : 'fail') },
            LA.h('div', { class: 'exam-big', text: total + '/' + items.length }),
            LA.h('div', { text: pct + '% — ' + (pass ? 'עברתם את המבחן! 🎉' : 'לא הגעתם ל-70% הפעם. חזרו על הנושאים החלשים למטה 👇') })),
          LA.h('h4', { text: 'ציון לפי נושא' }),
          LA.h('div', { class: 'exam-rows' }, rows),
          LA.h('div', { class: 'exam-again' },
            LA.h('button', { type: 'button', class: 'btn primary', onclick: () => startExam(), text: '↻ מבחן חדש' }))));
      }

      function startExam() {
        const area = refs.area;
        let list = pool();
        if (!list.length) return;
        list = shuffle(list);
        if (st.mode === 'rand') list = list.slice(0, 15);
        area.innerHTML = '';

        const items = list.map(q => {
          const perm = shuffle([0, 1, 2, 3]);
          return { topic: q.t, q: q.q, options: perm.map(k => q.o[k]), answer: perm.indexOf(q.a), explain: q.e };
        });
        const answers = new Array(items.length).fill(null);
        const progressLine = LA.h('div', { class: 'exam-progress' });
        const quizHost = LA.h('div', { class: 'exam-quiz' });
        const resultsHost = LA.h('div');
        area.appendChild(progressLine);
        area.appendChild(quizHost);
        area.appendChild(resultsHost);

        LA.quiz(quizHost, items.map(it => ({
          q: '<span class="exam-tag">' + TOPIC_BY_ID[it.topic].label + '</span> ' + it.q,
          options: it.options,
          answer: it.answer,
          explain: it.explain
        })), { id: 'exam' });

        const wrap = quizHost.querySelector('.quiz');
        const boxes = wrap ? [...wrap.querySelectorAll('.quiz-q')] : [];
        const updateProgress = () => {
          const done = answers.filter(x => x !== null).length;
          const right = answers.filter(Boolean).length;
          progressLine.textContent = 'נענו ' + done + ' מתוך ' + items.length + ' · נכונות: ' + right;
        };
        updateProgress();

        // מאזין לקליקים על כל התשובות כדי לחשב תוצאה לכל נושא; רק התשובה הראשונה לכל שאלה נספרת
        wrap && wrap.addEventListener('click', ev => {
          const b = ev.target.closest('.quiz-opt');
          if (!b) return;
          const k = boxes.indexOf(b.parentElement);
          if (k < 0 || answers[k] !== null) return;
          answers[k] = b.classList.contains('right');
          updateProgress();
          if (answers.every(x => x !== null)) {
            renderResults(items, answers, resultsHost);
            progressLine.textContent = 'סיימתם את המבחן. התוצאות והנושאים לחזרה מופיעים למטה.';
            resultsHost.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
        area.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      LA.page(main, {
        icon: '🎓', title: 'מבחן מסכם',
        subtitle: 'שלושים שאלות על כל הקורס, שלוש לכל נושא: LLM, צ׳אט, RAG, LangChain, LangGraph, סוכנים וניתוב מודלים, Skills, ComfyUI, ClearML ופרקטיקות אלגוריתמאי. ' +
          'אפשר לבחור נושאים, להתחיל עם כל השאלות או עם 15 אקראיות. ציון של 70% ומעלה נחשב עבר.',
        sections: [
          {
            id: 'setup', title: 'הגדרות המבחן', render(el) {
              refs.topicEls = TOPICS.map(t => ({
                id: t.id, btn: LA.h('button', {
                  type: 'button', class: 'exam-chip', onclick: () => {
                    if (st.topics.has(t.id)) st.topics.delete(t.id); else st.topics.add(t.id);
                    paintSetup();
                  }
                }, t.label)
              }));
              refs.modeEls = [['all', 'כל השאלות'], ['rand', '15 אקראיות']].map(([m, label]) => ({
                m, btn: LA.h('button', { type: 'button', class: 'exam-chip', onclick: () => { st.mode = m; paintSetup(); } }, label)
              }));
              refs.topicCount = LA.h('div', { class: 'exam-note' });
              refs.start = LA.h('button', { type: 'button', class: 'btn primary exam-start', onclick: () => startExam() });
              el.appendChild(LA.h('div', { class: 'exam-set-h' }, 'נושאים'));
              el.appendChild(LA.h('div', { class: 'exam-chips' }, refs.topicEls.map(x => x.btn)));
              el.appendChild(refs.topicCount);
              el.appendChild(LA.h('div', { class: 'exam-set-h' }, 'אורך המבחן'));
              el.appendChild(LA.h('div', { class: 'exam-chips' }, refs.modeEls.map(x => x.btn)));
              el.appendChild(LA.h('div', { class: 'exam-actions' }, refs.start));
              paintSetup();
            }
          },
          {
            id: 'run', title: 'המבחן', render(el) {
              refs.area = el;
              el.appendChild(LA.h('div', { class: 'exam-idle' },
                LA.h('p', { text: 'לחצו על "התחל מבחן" כדי לקבל שאלות. אפשר לחזור לכל פרק דרך הקישורים שבסוף המבחן.' })));
            }
          }
        ]
      });
    }
  });
})();
