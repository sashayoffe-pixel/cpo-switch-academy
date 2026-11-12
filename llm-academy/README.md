# LLM Academy — קורס אינטראקטיבי על LLM ומה שסביבו

קורס web אינטראקטיבי בעברית שמלמד את המושגים המרכזיים בבניית מערכות מבוססות מודלי שפה גדולים, ואת הקשר של כל אחד מהם ל-LLM:

| # | מודול | מה לומדים |
|---|-------|-----------|
| 1 | 🧠 LLM מבפנים | טוקנים, embeddings, Transformer, attention, MLP — צלילה עד **נוירון בודד**, כולל מעבדות חישוב |
| 2 | 💬 ממשק צ'אט | היסטוריה, roles, context window, streaming, עלות מצטברת |
| 3 | 📚 RAG | chunking, embeddings, חיפוש וקטורי (HNSW), reranking, ציטוטים, הערכה |
| 4 | 🔗 LangChain | Runnables, LCEL, prompt templates, structured output, tools |
| 5 | 🕸️ LangGraph | State, nodes, conditional edges, reducers, checkpoints, interrupt — סימולטור הרצה |
| 6 | 🤖 סוכנים ותתי-סוכנים | לולאת tool-use, ReAct, MCP, multi-agent, **ניתוב מודלים לפי מורכבות** |
| 7 | 🧰 Skills | SKILL.md, progressive disclosure, השוואה ל-tools/MCP/sub-agents |
| 8 | 🎨 ComfyUI | גרף nodes לדיפוזיה, KSampler, CFG, cross-attention והקשר לטרנספורמרים |
| 9 | 📈 ClearML | ניסויים, Datasets, תורים ו-agents, pipelines, serving — עבור LLM |
| 10 | 🧪 עין של אלגוריתמאי | מטריצת השוואה, evals, עלות/latency, אבטחה, צ'קליסט לפני ייצור |
| 11 | 🏗️ פרויקט מסכם | מערכת שירות לקוחות אחת שמחברת את כל הנושאים |
| 12 | 📖 מילון + 🎓 מבחן מסכם | |

בכל מודול: אנלוגיה → דיאגרמה לחיצה עם **drill-down** → דוגמה מוחשית עם קוד → מעבדה אינטראקטיבית →
הקשר ל-LLM → דרישות / חוזקות / חולשות → מה לבדוק כאלגוריתמאי AI → בוחן.

## הרצה
אין build ואין תלויות. פותחים את `index.html` בדפדפן (עובד גם מ-`file://` וגם בלי אינטרנט), או:
```bash
python -m http.server 8000   # ואז http://localhost:8000
```

## מבנה
```
index.html            # טוען את כל הסקריפטים
css/main.css          # ערכת עיצוב (RTL, כהה)
css/modules/*.css     # עיצוב לכל מודול
js/core.js            # router, דיאגרמות עם drill-down, stepper, quiz, sliders
js/modules/*.js       # מודול לכל נושא
CONTRACT.md           # ה-API הפנימי וכללי התרומה
```
התיקייה עצמאית לגמרי — אפשר להעתיק אותה כמו שהיא לריפוזיטורי נפרד.

> מזהי המודלים בדוגמאות (`claude-haiku-5-5`, `claude-sonnet-5-5`, `claude-opus-5-5`) ומחירים — נכונים לנובמבר 2026; בדקו מחירון עדכני.
