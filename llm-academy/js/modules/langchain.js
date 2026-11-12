(function () {
  'use strict';
  const h = LA.h, esc = LA.esc;

  /* ------------------------------------------------------------------ */
  /* Diagram specs                                                       */
  /* ------------------------------------------------------------------ */
  function ecosystemSpec() {
    return {
      title: 'מפת האקוסיסטם', width: 900, height: 420,
      intro: '<div class="dg-hint">🗺️ זו מפת החבילות של LangChain. לחצו על כל חבילה כדי להבין מה היא מכילה ולמה היא מופרדת. <b>langchain-core</b> הוא הלב: ממשקי הבסיס (Runnable, Message, Tool) שכל השאר מממש או משתמש בהם.</div>',
      groups: [{ x: 20, y: 40, w: 330, h: 340, label: 'אינטגרציות (ספקים)', color: 'ext' }],
      nodes: [
        { id: 'app', x: 790, y: 80, w: 150, label: 'האפליקציה שלך', sub: 'Python / JS', color: 'ui', info: '<p>הקוד שלכם: בוט תמיכה, RAG, סוכן. הוא מייבא מ-<code>langchain</code> ומחבילות הספקים.</p>' },
        { id: 'lc', x: 560, y: 80, w: 170, label: 'langchain (v1)', sub: 'create_agent · chains', color: 'ctrl', info: '<p>החבילה "הראשית". ב-v1 היא רזה ומתמקדת ב-<code>create_agent</code>, middleware והבסיס של agents. את הלוגיקה ה"ישנה" (Chains, memory classes) העבירו ל-<code>langchain-classic</code>.</p>' },
        { id: 'core', x: 560, y: 210, w: 170, h: 64, label: 'langchain-core', sub: 'Runnable · LCEL · Messages', color: 'llm', info: '<p>ההפשטות: <code>Runnable</code>, <code>BaseChatModel</code>, <code>ChatPromptTemplate</code>, <code>BaseOutputParser</code>, <code>@tool</code>, <code>BaseRetriever</code>. אין בו תלות בספק מסוים - לכן אפשר להחליף מודל בשורה אחת.</p>' },
        { id: 'lg', x: 790, y: 210, w: 150, label: 'LangGraph', sub: 'runtime לסוכנים', color: 'tool', info: '<p>מנוע הביצוע של סוכנים: גרפים, מצב, checkpoints, human-in-the-loop. <code>create_agent</code> של LangChain v1 בנוי עליו. ראו מודול LangGraph.</p>' },
        { id: 'ls', x: 790, y: 340, w: 150, label: 'LangSmith', sub: 'tracing · evals', color: 'data', info: '<p>פלטפורמת observability ו-evaluation: כל <code>invoke</code> נרשם כ-trace עם עץ ריצות, tokens, latency ועלות. מופעל ע"י משתני סביבה, בלי לשנות קוד.</p>' },
        { id: 'anth', x: 200, y: 110, w: 190, label: 'langchain-anthropic', sub: 'ChatAnthropic', color: 'llm', info: '<p>חבילת שותף. <code>ChatAnthropic(model="claude-sonnet-5-5")</code> מממש את <code>BaseChatModel</code> מעל ה-SDK של Anthropic, כולל tool calling ו-structured output.</p>' },
        { id: 'comm', x: 200, y: 210, w: 190, label: 'langchain-community', sub: 'loaders · vector stores', color: 'store', info: '<p>מאות אינטגרציות בתחזוקת הקהילה: loaders (PDF, Confluence), vector stores, retrievers. איכות משתנה - בדקו תחזוקה לפני שמסתמכים.</p>' },
        { id: 'part', x: 200, y: 310, w: 190, label: 'חבילות שותפים', sub: 'openai · chroma · pinecone…', color: 'ext', info: '<p>כל ספק גדול מקבל חבילה משלו עם גרסאות ותלויות עצמאיות (למשל <code>langchain-chroma</code>). מונע "תלויות ענק" באפליקציה.</p>' }
      ],
      edges: [
        { from: 'app', to: 'lc' }, { from: 'lc', to: 'core' }, { from: 'lc', to: 'lg', label: 'בנוי על' },
        { from: 'lg', to: 'core', dashed: true }, { from: 'anth', to: 'core', label: 'מממש' },
        { from: 'comm', to: 'core' }, { from: 'part', to: 'core', bend: -30 },
        { from: 'core', to: 'ls', dashed: true, color: 'data', label: 'traces', bend: 20 }
      ]
    };
  }

  function invokeSpec() {
    const N = (id, x, label, sub, info, color) => ({ id, x, y: 120, w: 140, h: 62, label, sub, color: color || 'data', info });
    return {
      title: 'invoke() בפנים', width: 900, height: 280,
      intro: '<div class="dg-hint">🔬 זה הרובד הקטן ביותר: מה קורה בקריאת <code>invoke</code> אחת על Runnable בודד. הזרימה מימין לשמאל.</div>',
      nodes: [
        N('i1', 800, 'קלט', 'dict / str / messages', '<p>הקלט הגולמי, למשל <code>{"ticket": "החשבונית שלי הוכפלה"}</code>. כל Runnable מגדיר <code>input_schema</code> - הצורה שהוא מצפה לה.</p>'),
        N('i2', 640, 'coerce + validate', 'הפיכה לטיפוס פנימי', '<p>מחרוזת הופכת ל-<code>HumanMessage</code>, רשימת tuples הופכת להודעות, dict נבדק מול הסכמה. שגיאת מפתח חסר (<code>KeyError: ticket</code>) צצה כאן.</p>', 'ctrl'),
        N('i3', 480, 'config + callbacks', 'on_chain_start', '<p>נוצר <code>RunnableConfig</code> (tags, metadata, callbacks, max_concurrency, run_name). נשלח אירוע <code>on_chain_start</code> - כאן LangSmith "נולד" כ-run חדש בעץ.</p>', 'tool'),
        N('i4', 320, 'הלוגיקה', '_invoke / API call', '<p>הלוגיקה האמיתית: פורמט תבנית, קריאת HTTP למודל (עם <code>max_retries</code> פנימי), או הפעלת פונקציה. זה הצעד היחיד שעולה זמן/כסף.</p>', 'llm'),
        N('i5', 160, 'פלט + on_end', 'dict / msg / str', '<p>הפלט מוחזר, ו-<code>on_chain_end</code> נשלח (או <code>on_chain_error</code> אם נזרקה חריגה). הפלט הוא הקלט של ה-Runnable הבא בשרשרת.</p>', 'ok')
      ],
      edges: [{ from: 'i1', to: 'i2' }, { from: 'i2', to: 'i3' }, { from: 'i3', to: 'i4' }, { from: 'i4', to: 'i5' }]
    };
  }

  function protocolSpec() {
    const m = (id, x, label, sub, info, kids) => ({ id, x, y: 170, w: 140, h: 60, label, sub, color: 'data', info, children: kids });
    return {
      title: 'פרוטוקול Runnable', width: 900, height: 360,
      intro: '<div class="dg-hint">🧬 <b>Runnable</b> הוא "חוזה" אחד שכל רכיב ב-LangChain מקיים. בגלל זה אפשר לשרשר prompt, מודל, parser ופונקציה רגילה עם <code>|</code>. לחצו על <b>invoke</b> ואז "צלול פנימה".</div>',
      nodes: [
        { id: 'r', x: 450, y: 50, w: 240, h: 56, label: 'Runnable[Input, Output]', sub: 'ממשק אבסטרקטי', color: 'llm', info: '<p>המחלקה האבסטרקטית. מי שמממש אותה מקבל בחינם: <code>batch</code> (במקביל), <code>stream</code>, <code>ainvoke</code>, <code>with_retry</code>, <code>with_fallbacks</code>, <code>pipe</code>, <code>|</code>, וטרייסינג.</p>' },
        m('invoke', 800, 'invoke(x)', 'קלט אחד → פלט', '<p>הקריאה הבסיסית, סינכרונית. <b>לחצו "צלול פנימה"</b> לראות את השלבים.</p>', invokeSpec()),
        m('batch', 640, 'batch([x…])', 'מקבילי', '<p>מריץ רשימת קלטים במקביל (thread pool), מוגבל ע"י <code>max_concurrency</code> ב-config. מתאים ל-1,000 פניות לסיווג לילי. <code>batch_as_completed</code> מחזיר לפי סדר סיום.</p>'),
        m('stream', 480, 'stream(x)', 'chunks בזרימה', '<p>מחזיר iterator של חלקי פלט (tokens). רכיבים שלא יודעים לזרום (כמו parser של JSON מלא) מצברים. מאפשר UX של "הטקסט מופיע בהדרגה".</p>'),
        m('ainvoke', 320, 'ainvoke / astream', 'async', '<p>גרסאות async של הכל, עבור שרתי FastAPI. ברירת מחדל שלהן רצה ב-executor, אבל מודלים מממשים async אמיתי.</p>'),
        m('events', 160, 'astream_events', 'אירועי ביניים', '<p>זרם אירועים מכל שלב פנימי בשרשרת (on_chat_model_stream, on_tool_start…). בסיס לממשקי UI שמראים "הסוכן מחפש ברשת...".</p>'),
        { id: 'cfg', x: 640, y: 310, w: 200, h: 50, label: 'RunnableConfig', sub: 'tags · callbacks · concurrency', color: 'tool', info: '<p>הפרמטר השני של כל קריאה: <code>chain.invoke(x, config={"tags":["prod"], "callbacks":[...]})</code>. מועבר אוטומטית לכל הרכיבים בשרשרת (propagation).</p>' }
      ],
      edges: [
        { from: 'r', to: 'invoke' }, { from: 'r', to: 'batch' }, { from: 'r', to: 'stream' }, { from: 'r', to: 'ainvoke' }, { from: 'r', to: 'events' },
        { from: 'cfg', to: 'invoke', dashed: true, color: 'tool' }, { from: 'cfg', to: 'batch', dashed: true, color: 'tool' }
      ]
    };
  }

  function chainSpec() {
    const sh = (id, x, label, sub, info, kids) => ({ id, x, y: 150, w: 130, h: 62, label, sub, color: 'data', info, children: kids });
    return {
      title: 'שרשרת (chain)', width: 900, height: 330,
      intro: '<div class="dg-hint">⛓️ <code>chain = prompt | llm | parser</code>: שלושה Runnables, והפלט של כל אחד הוא הקלט של הבא. לחצו על <b>ChatModel</b> וצללו לפרוטוקול Runnable.</div>',
      groups: [{ x: 235, y: 70, w: 450, h: 160, label: 'RunnableSequence', color: 'llm' }],
      nodes: [
        { id: 'in', x: 810, y: 150, w: 120, h: 56, label: 'קלט', sub: '{"ticket": …}', color: 'ui', info: '<p>dict עם המשתנים שהתבנית צריכה. זה הפורמט האוניברסלי בין רכיבים ב-LCEL.</p>' },
        { id: 'p', x: 640, y: 150, w: 130, h: 62, label: 'Prompt', sub: 'dict → PromptValue', color: 'ctrl', info: '<p><code>ChatPromptTemplate</code>: ממלא משתנים ומחזיר <code>PromptValue</code> (רשימת הודעות: system + human). אין כאן קריאת רשת - דטרמיניסטי וזול.</p>' },
        { id: 'm', x: 480, y: 150, w: 130, h: 62, label: 'ChatModel', sub: 'PromptValue → AIMessage', color: 'llm', info: '<p><code>ChatAnthropic</code>: ממיר הודעות לבקשת API, קורא ל-Claude, ומחזיר <code>AIMessage</code> (תוכן + usage + tool_calls). <b>צלול פנימה</b> ל-Runnable.</p>', children: protocolSpec() },
        { id: 'o', x: 320, y: 150, w: 130, h: 62, label: 'Parser', sub: 'AIMessage → str/obj', color: 'ctrl', info: '<p><code>StrOutputParser</code> שולף את הטקסט. <code>PydanticOutputParser</code> / <code>with_structured_output</code> מחזיר אובייקט מטופס ומאומת.</p>' },
        { id: 'out', x: 110, y: 150, w: 120, h: 56, label: 'פלט', sub: 'str / Pydantic', color: 'ok', info: '<p>הערך הסופי לאפליקציה: טקסט לתצוגה או אובייקט טיפוסי לקוד.</p>' },
        { id: 'tr', x: 480, y: 290, w: 190, h: 44, label: 'LangSmith trace', sub: 'callbacks', color: 'data', info: '<p>כל Runnable בשרשרת משדר אירועי start/end ל-callbacks. עם <code>LANGSMITH_TRACING=true</code> תראו עץ ריצה לכל קריאה.</p>' }
      ],
      edges: [{ from: 'in', to: 'p' }, { from: 'p', to: 'm' }, { from: 'm', to: 'o' }, { from: 'o', to: 'out' }, { from: 'm', to: 'tr', dashed: true, color: 'data' }]
    };
  }

  function appSpec() {
    return {
      title: 'אפליקציית LangChain', width: 900, height: 420,
      intro: '<div class="dg-hint">🧭 זו אפליקציה אופיינית. לחצו על <b>Chain</b> וצללו: אפליקציה → שרשרת → פרוטוקול Runnable → קריאת <code>invoke()</code> בודדת.</div>',
      nodes: [
        { id: 'user', x: 810, y: 210, w: 120, label: 'משתמש / API', color: 'ui', info: '<p>פנייה מגיעה מ-FastAPI, תור הודעות, או UI של צ\'אט.</p>' },
        { id: 'chain', x: 600, y: 210, w: 150, h: 70, label: 'Chain (LCEL)', sub: 'prompt | llm | parser', color: 'llm', info: '<p>לב האפליקציה: שרשרת Runnables. <b>זה הרובד הראשון של הצלילה.</b></p>', children: chainSpec() },
        { id: 'ret', x: 600, y: 70, w: 150, label: 'Retriever', sub: 'vector store', color: 'store', info: '<p>אחזור מסמכים רלוונטיים והזרקתם ל-prompt. ראו מודול RAG.</p>' },
        { id: 'tools', x: 600, y: 350, w: 150, label: 'Tools', sub: '@tool functions', color: 'tool', info: '<p>פונקציות שהמודל יכול לבקש להפעיל (בדיקת הזמנה, שליחת מייל).</p>' },
        { id: 'prov', x: 360, y: 210, w: 150, label: 'Provider API', sub: 'Anthropic', color: 'ext', info: '<p>הקריאה האמיתית ל-Claude. LangChain עוטף אותה ב-<code>ChatAnthropic</code>.</p>' },
        { id: 'parse', x: 160, y: 210, w: 140, label: 'Typed output', sub: 'Pydantic', color: 'ok', info: '<p>התוצאה כאובייקט שאפשר להעביר לקוד רגיל: <code>ticket.urgency == "high"</code>.</p>' },
        { id: 'smith', x: 360, y: 70, w: 150, label: 'LangSmith', sub: 'traces & evals', color: 'data', info: '<p>צופה פסיבי: כל הרצה נרשמת ואפשר להריץ עליה evals.</p>' }
      ],
      edges: [
        { from: 'user', to: 'chain' }, { from: 'ret', to: 'chain', label: 'docs' }, { from: 'chain', to: 'tools', both: true, dashed: true },
        { from: 'chain', to: 'prov', both: true }, { from: 'prov', to: 'parse' }, { from: 'chain', to: 'smith', dashed: true, color: 'data' }
      ]
    };
  }

  /* ------------------------------------------------------------------ */
  /* Code samples                                                        */
  /* ------------------------------------------------------------------ */
  const CODE_TICKET = `
from typing import Literal
from operator import itemgetter
from pydantic import BaseModel, Field
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableLambda

# 1) סכמת הפלט - החוזה בין ה-LLM לקוד שלנו
class Triage(BaseModel):
    category: Literal["billing", "outage", "meter", "other"]
    urgency: Literal["low", "medium", "high"]
    sentiment: Literal["negative", "neutral", "positive"]
    summary: str = Field(description="משפט אחד שמתאר את הבעיה")

# 2) שלושה מודלים - כל אחד לפי המשימה
haiku  = ChatAnthropic(model="claude-haiku-5-5",  max_tokens=300)   # סיווג: נפח גבוה, פשוט
sonnet = ChatAnthropic(model="claude-sonnet-5-5", max_tokens=800)   # ניסוח תשובה לנציג/לקוח
opus   = ChatAnthropic(model="claude-opus-5-5",   max_tokens=1200)  # מקרים דחופים ורגישים

# 3) סיווג: Haiku עם structured output, ו-Sonnet כ-fallback אם נכשל/לא עומד בסכמה
classify_prompt = ChatPromptTemplate.from_messages([
    ("system", "אתה מסווג פניות של חברת חשמל. החזר סיווג מדויק בלבד."),
    ("human", "{ticket}"),
])
classifier = (classify_prompt | haiku.with_structured_output(Triage)).with_fallbacks(
    [classify_prompt | sonnet.with_structured_output(Triage)]
)

# 4) מנסחים תשובה: Sonnet כברירת מחדל, Opus לפניות דחופות+שליליות
reply_prompt = ChatPromptTemplate.from_messages([
    ("system", "אתה נציג שירות אמפתי של חברת חשמל. כתוב תשובה קצרה בעברית."),
    ("human", "פנייה: {ticket}\\nסיווג: {triage}"),
])
draft_std = (reply_prompt | sonnet | StrOutputParser()).with_retry(stop_after_attempt=3)
draft_vip = (reply_prompt | opus   | StrOutputParser()).with_retry(stop_after_attempt=3)

def pick_drafter(x: dict):
    t: Triage = x["triage"]
    hot = t.urgency == "high" and t.sentiment == "negative"
    return draft_vip if hot else draft_std      # RunnableLambda שמחזיר Runnable - מופעל אוטומטית

# 5) ההרכבה: מוסיפים את מפתח triage ל-dict, ואז בוחרים את הכותב
chain = RunnablePassthrough.assign(triage=classifier) | RunnableLambda(pick_drafter)

# 6) שימוש - אותו אובייקט תומך invoke / batch / stream / ainvoke
reply = chain.invoke({"ticket": "החשבונית הוכפלה והחשמל נותק אצלי כבר יומיים! דחוף"})
replies = chain.batch([{"ticket": t} for t in tickets], config={"max_concurrency": 8})
`;

  const CODE_AGENT = `
from langchain.agents import create_agent
from langchain_anthropic import ChatAnthropic
from langchain_core.tools import tool

@tool
def lookup_invoice(invoice_id: str) -> dict:
    """מחזיר סטטוס ופרטי חשבונית לפי מספר חשבונית."""
    return {"id": invoice_id, "amount": 412.5, "status": "paid_twice"}

# create_agent (LangChain v1): לולאת "מודל <-> כלים" מוכנה, בנויה על LangGraph
agent = create_agent(
    model=ChatAnthropic(model="claude-sonnet-5-5", max_tokens=1000),
    tools=[lookup_invoice],
    system_prompt="אתה נציג שירות של חברת חשמל. בדוק עובדות בכלים לפני שאתה עונה.",
)
result = agent.invoke({"messages": [{"role": "user", "content": "חויבתי פעמיים בחשבונית 8841"}]})
print(result["messages"][-1].content)
`;

  const CODE_RAG = `
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from operator import itemgetter

docs = PyPDFLoader("hr_policy.pdf").load()                       # Document Loader
chunks = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100).split_documents(docs)
store = Chroma.from_documents(chunks, embedding=embeddings)       # Vector store (embeddings מוגדר בנפרד)
retriever = store.as_retriever(search_kwargs={"k": 4})            # Retriever = Runnable: str -> list[Document]

format_docs = lambda ds: "\\n\\n".join(d.page_content for d in ds)
prompt = ChatPromptTemplate.from_template("ענה רק לפי ההקשר.\\nהקשר:\\n{context}\\n\\nשאלה: {question}")

rag = (
    {"context": itemgetter("question") | retriever | format_docs,  # RunnableParallel מובלע מ-dict
     "question": itemgetter("question")}
    | prompt | sonnet | StrOutputParser()
)
rag.invoke({"question": "כמה ימי חופשה מגיעים לי?"})
`;

  /* ------------------------------------------------------------------ */
  /* Lab 1: chain builder                                                */
  /* ------------------------------------------------------------------ */
  const TIERS = { haiku: 'claude-haiku-5-5', sonnet: 'claude-sonnet-5-5', opus: 'claude-opus-5-5' };
  const FALLBACK_OF = { haiku: 'sonnet', sonnet: 'opus', opus: 'sonnet' };
  const COMP = {
    prompt: { label: 'PromptTemplate', icon: '📝', cls: 'ctrl' },
    retriever: { label: 'Retriever', icon: '🔎', cls: 'store' },
    model: { label: 'ChatModel', icon: '🧠', cls: 'llm' },
    tool: { label: 'Tool (bind_tools)', icon: '🛠️', cls: 'tool' },
    parser: { label: 'Parser', icon: '🧾', cls: 'ctrl' }
  };
  const PRESETS = {
    simple: { name: 'פשוט: prompt | llm | str', items: [{ k: 'prompt' }, { k: 'model', tier: 'sonnet' }, { k: 'parser', kind: 'str' }] },
    ticket: { name: 'סיווג פניות (Haiku, structured)', items: [{ k: 'prompt' }, { k: 'model', tier: 'haiku', structured: true, fallback: true }] },
    rag: { name: 'RAG', items: [{ k: 'retriever' }, { k: 'prompt' }, { k: 'model', tier: 'sonnet' }, { k: 'parser', kind: 'str' }] },
    broken: { name: 'שרשרת שבורה (לדיבוג)', items: [{ k: 'model', tier: 'sonnet' }, { k: 'prompt' }, { k: 'parser', kind: 'pydantic' }] }
  };

  function classify(text) {
    const t = text.toLowerCase();
    let category = 'other';
    if (/חשבונית|חיוב|חויב|תשלום|כפול|הוכפל|החזר/.test(t)) category = 'billing';
    else if (/ניתוק|נותק|הפסקת|אין חשמל|שבלול|קצר|נפל/.test(t)) category = 'outage';
    else if (/מונה|קריאה|צריכה/.test(t)) category = 'meter';
    let score = 0;
    if (/דחוף|מיד|עכשיו|בהקדם|סכנה/.test(t)) score += 2;
    if (/יומיים|שבוע|שעות|שוב ושוב|כל פעם/.test(t)) score += 1;
    if (category === 'outage') score += 1;
    if (/!/.test(t)) score += 1;
    const urgency = score >= 3 ? 'high' : score >= 1 ? 'medium' : 'low';
    const neg = (t.match(/נורא|מעצבן|גרוע|זועם|מתוסכל|בושה|לא יתכן|כעס|שוב|!|הוכפל|נותק/g) || []).length;
    const pos = (t.match(/תודה|מעולה|מרוצה|שירות טוב/g) || []).length;
    const sentiment = neg > pos ? 'negative' : pos > neg ? 'positive' : 'neutral';
    const summary = { billing: 'בעיה בחיוב/חשבונית', outage: 'תקלת אספקה / ניתוק', meter: 'שאלה בנושא מונה וקריאות', other: 'פנייה כללית' }[category];
    return { category, urgency, sentiment, summary };
  }
  const tok = s => Math.max(1, Math.round(s.length / 3.5));

  function validate(items) {
    const steps = []; const warnings = []; let cur = 'dict'; let err = null; let lastModel = null;
    if (!items.length) return { steps, warnings, error: 'השרשרת ריקה - הוסיפו רכיבים מהפלטה.', out: null };
    items.forEach((it, idx) => {
      const st = { it, inT: cur, outT: cur, msg: '' };
      if (err) { st.skipped = true; steps.push(st); return; }
      const fail = m => { err = `צעד ${idx + 1} (${COMP[it.k].label}): ${m}`; st.error = m; st.outT = '✗'; };
      if (it.k === 'retriever') {
        if (cur !== 'dict') fail(`Retriever (בתצורת assign) מצפה ל-dict, קיבל ${cur}.`); else { st.outT = 'dict'; st.msg = 'מוסיף מפתח context'; }
      } else if (it.k === 'prompt') {
        if (cur !== 'dict') fail(`ChatPromptTemplate מצפה ל-dict של משתנים, קיבל ${cur}.`); else { st.outT = 'PromptValue'; }
      } else if (it.k === 'model') {
        if (cur === 'dict') fail('המודל מצפה ל-PromptValue/הודעות ולא ל-dict. חסר PromptTemplate לפניו.');
        else if (cur !== 'PromptValue' && cur !== 'str') fail(`המודל לא יודע לקבל ${cur}.`);
        else { st.outT = it.structured ? 'Pydantic' : 'AIMessage'; lastModel = it; if (cur === 'str') warnings.push('str מומר ל-HumanMessage אוטומטית - עדיף prompt מפורש עם system.'); }
        if (!st.error && it.structured) st.msg = 'with_structured_output(Triage)';
      } else if (it.k === 'tool') {
        const prev = items[idx - 1];
        if (!prev || prev.k !== 'model') fail('bind_tools חל על מודל בלבד - הניחו את Tool מיד אחרי ChatModel.');
        else { prev.tools = true; st.msg = 'model.bind_tools([lookup_invoice])'; if (prev.structured) warnings.push('שילוב structured output עם bind_tools לא מומלץ: בחרו אחד, או השתמשו ב-create_agent.'); }
      } else if (it.k === 'parser') {
        if (cur === 'Pydantic') fail('הפלט כבר אובייקט מטופס (structured output). Parser נוסף מיותר ויישבר.');
        else if (cur !== 'AIMessage' && cur !== 'str') fail(`Parser מצפה ל-AIMessage, קיבל ${cur}. בדרך כלל חסר מודל לפניו.`);
        else {
          st.outT = it.kind === 'str' ? 'str' : it.kind === 'json' ? 'dict' : 'Pydantic';
          if (lastModel && lastModel.tools && it.kind === 'str') warnings.push('מודל עם tools שמחליט לקרוא לכלי מחזיר content ריק - StrOutputParser יוציא "". טפלו ב-tool_calls (או השתמשו ב-create_agent).');
        }
      }
      if (!st.error && it.k !== 'tool') cur = st.outT;
      steps.push(st);
    });
    if (!err) {
      const pi = items.findIndex(x => x.k === 'prompt'), ri = items.findIndex(x => x.k === 'retriever');
      if (ri >= 0 && (pi < 0 || pi < ri)) warnings.push('ה-Retriever מוסיף context, אבל אין Prompt אחריו שמשתמש בו - המידע לא יגיע למודל.');
      if (cur === 'PromptValue') warnings.push('השרשרת מסתיימת ב-PromptValue: אין קריאת מודל.');
      if (cur === 'AIMessage') warnings.push('הפלט הוא AIMessage ולא טקסט: ייתכן שתרצו StrOutputParser.');
    }
    return { steps, warnings, error: err, out: err ? null : cur };
  }

  function genCode(items, tools) {
    const models = {}; items.forEach(i => { if (i.k === 'model') { models[i.tier] = 1; if (i.fallback) models[FALLBACK_OF[i.tier]] = 1; } });
    let c = 'from operator import itemgetter\nfrom langchain_anthropic import ChatAnthropic\n';
    c += 'from langchain_core.prompts import ChatPromptTemplate\nfrom langchain_core.runnables import RunnablePassthrough\n';
    if (items.some(i => i.k === 'parser')) c += 'from langchain_core.output_parsers import StrOutputParser, JsonOutputParser, PydanticOutputParser\n';
    if (items.some(i => i.k === 'tool')) c += 'from langchain_core.tools import tool\n';
    if (items.some(i => i.structured || (i.k === 'parser' && i.kind === 'pydantic'))) c += 'from pydantic import BaseModel\n';
    c += '\n';
    if (items.some(i => i.structured || (i.k === 'parser' && i.kind === 'pydantic'))) c += 'class Triage(BaseModel):\n    category: str\n    urgency: str\n    sentiment: str\n\n';
    if (items.some(i => i.k === 'tool')) c += '@tool\ndef lookup_invoice(invoice_id: str) -> dict:\n    """בדיקת חשבונית"""\n    ...\n\n';
    Object.keys(models).forEach(t => { c += `${t} = ChatAnthropic(model="${TIERS[t]}", max_tokens=1024)\n`; });
    if (Object.keys(models).length) c += '\n';
    const hasR = items.some(i => i.k === 'retriever');
    if (items.some(i => i.k === 'prompt')) c += `prompt = ChatPromptTemplate.from_messages([\n    ("system", "אתה נציג שירות של חברת חשמל."),\n    ("human", "${hasR ? 'הקשר:\\n{context}\\n\\n' : ''}{ticket}"),\n])\n\n`;
    const modExpr = (tier, it) => {
      let e = tier; if (it.structured) e += '.with_structured_output(Triage)';
      if (it.tools) e += '.bind_tools([lookup_invoice])'; return e;
    };
    const parts = [];
    items.forEach(it => {
      if (it.k === 'retriever') parts.push('RunnablePassthrough.assign(context=itemgetter("ticket") | retriever | format_docs)');
      else if (it.k === 'prompt') parts.push('prompt');
      else if (it.k === 'model') {
        let e = modExpr(it.tier, it);
        if (it.fallback) e += `.with_fallbacks([${modExpr(FALLBACK_OF[it.tier], it)}])`;
        parts.push(e);
      } else if (it.k === 'parser') parts.push(it.kind === 'str' ? 'StrOutputParser()' : it.kind === 'json' ? 'JsonOutputParser()' : 'PydanticOutputParser(pydantic_object=Triage)');
    });
    if (hasR) c += '# retriever = vectorstore.as_retriever(search_kwargs={"k": 3})\n# format_docs = lambda ds: "\\n".join(d.page_content for d in ds)\n\n';
    c += parts.length ? 'chain = (\n    ' + parts.join('\n    | ') + '\n)\n\nresult = chain.invoke({"ticket": "..."})' : 'chain = ...';
    return c;
  }

  function simulate(items, text, failPrimary) {
    const tri = classify(text);
    const rows = [];
    let cur = { t: 'dict', v: JSON.stringify({ ticket: text }, null, 1).replace(/\n\s*/g, ' ') };
    rows.push({ name: 'קלט', t: 'dict', v: cur.v, c: 'ui' });
    let promptMsgs = '', ctxDocs = '';
    let lastTokens = 0;
    items.forEach(it => {
      if (it.k === 'retriever') {
        const dd = tri.category === 'billing' ? ['נוהל החזר כספי כפול', 'מדיניות חיוב חוזר'] : tri.category === 'outage' ? ['נוהל ניתוק ושחזור אספקה', 'מוקד תקלות 24/7'] : ['שאלות נפוצות - מונה', 'מדריך קריאת צריכה'];
        ctxDocs = dd.join('\n'); rows.push({ name: 'Retriever', t: 'dict + context', v: `{"ticket": "...", "context": [Document("${dd[0]}"), Document("${dd[1]}")]}`, c: 'store' });
      } else if (it.k === 'prompt') {
        promptMsgs = `[SystemMessage("אתה נציג שירות של חברת חשמל."), HumanMessage("${(ctxDocs ? 'הקשר: ' + ctxDocs.replace(/\n/g, '; ') + ' | ' : '') + text.slice(0, 60)}${text.length > 60 ? '…' : ''}")]`;
        lastTokens = tok(text + ctxDocs) + 18;
        rows.push({ name: 'Prompt', t: 'PromptValue', v: promptMsgs, c: 'ctrl', extra: `~${lastTokens} tokens נכנסים` });
      } else if (it.k === 'model') {
        let tier = it.tier, note = '';
        if (failPrimary && it.fallback) { note = `⚠️ ${TIERS[it.tier]} זרק RateLimitError ← with_fallbacks עבר ל-${TIERS[FALLBACK_OF[it.tier]]}`; tier = FALLBACK_OF[it.tier]; }
        else if (failPrimary) note = `❌ ${TIERS[it.tier]} זרק RateLimitError ואין fallback: כל השרשרת נופלת`;
        if (failPrimary && !it.fallback) { rows.push({ name: 'ChatModel · ' + it.tier, t: 'Exception', v: 'anthropic.RateLimitError: 429', c: 'warn', extra: note, bad: true }); cur = null; return; }
        if (!cur) return;
        let v, t;
        if (it.structured) { t = 'Triage (Pydantic)'; v = `Triage(category="${tri.category}", urgency="${tri.urgency}", sentiment="${tri.sentiment}", summary="${tri.summary}")`; }
        else if (it.tools) { t = 'AIMessage (tool_calls)'; v = `AIMessage(content="", tool_calls=[{"name": "lookup_invoice", "args": {"invoice_id": "8841"}}])`; }
        else { t = 'AIMessage'; v = `AIMessage(content="שלום, ${tri.category === 'outage' ? 'אנחנו מטפלים בתקלה ונעדכן בהקדם' : 'בדקנו את הפנייה ונחזור עם פתרון'}.", usage_metadata={input_tokens: ${lastTokens}, output_tokens: ${it.structured ? 45 : 38}})`; }
        rows.push({ name: 'ChatModel · ' + tier, t, v, c: 'llm', extra: note || `מודל: ${TIERS[tier]}` });
        cur = { t, v, tri };
      } else if (it.k === 'tool') {
        rows.push({ name: 'bind_tools', t: '(config)', v: 'ה-schema של lookup_invoice נשלח למודל בבקשה', c: 'tool' });
      } else if (it.k === 'parser' && cur) {
        if (it.kind === 'str') rows.push({ name: 'StrOutputParser', t: 'str', v: cur.t.indexOf('tool_calls') > 0 ? '""   ← ריק! המודל ביקש כלי' : '"שלום, בדקנו את הפנייה ונחזור עם פתרון."', c: 'ctrl' });
        else if (it.kind === 'json') rows.push({ name: 'JsonOutputParser', t: 'dict', v: JSON.stringify({ category: tri.category, urgency: tri.urgency, sentiment: tri.sentiment }), c: 'ctrl' });
        else rows.push({ name: 'PydanticOutputParser', t: 'Triage', v: `Triage(category="${tri.category}", urgency="${tri.urgency}", sentiment="${tri.sentiment}")`, c: 'ctrl' });
      }
    });
    return rows;
  }

  function chainBuilderLab(el) {
    const st = { items: PRESETS.ticket.items.map(x => Object.assign({}, x)), text: 'החשבונית הוכפלה והחשמל נותק אצלי כבר יומיים! דחוף, זה לא יתכן', fail: false };
    const root = h('div', { class: 'lab lc-lab' });
    root.appendChild(h('div', { class: 'lab-h' }, '🔧 Chain Builder - חברו רכיבים וראו קוד + ריצה'));
    root.appendChild(h('p', { class: 'muted' }, 'בחרו תבנית מוכנה או הוסיפו רכיבים מהפלטה בסדר הרצוי. המעבדה בודקת תאימות טיפוסים בין כל זוג רכיבים, מייצרת קוד LCEL, ומדמה ריצה עם צורת הנתונים בכל צעד.'));
    const presetRow = h('div', { class: 'pill-row' });
    Object.entries(PRESETS).forEach(([k, p]) => presetRow.appendChild(h('button', { type: 'button', class: 'btn ghost', onclick: () => { st.items = p.items.map(x => Object.assign({}, x)); draw(); } }, p.name)));
    const palette = h('div', { class: 'pill-row lc-palette' }, h('b', null, 'פלטה: '));
    Object.entries(COMP).forEach(([k, c]) => palette.appendChild(h('button', { type: 'button', class: 'btn lc-pal lc-' + c.cls, onclick: () => { st.items.push(k === 'model' ? { k, tier: 'sonnet' } : k === 'parser' ? { k, kind: 'str' } : { k }); draw(); } }, c.icon + ' ' + c.label)));
    palette.appendChild(h('button', { type: 'button', class: 'btn ghost', onclick: () => { st.items = []; draw(); } }, 'נקה'));
    const chainBox = h('div', { class: 'lc-chain' });
    const ta = h('textarea', { class: 'lc-ta', rows: 2, oninput: () => { st.text = ta.value; drawOut(); } }); ta.value = st.text;
    const failCb = h('input', { type: 'checkbox', onchange: () => { st.fail = failCb.checked; drawOut(); } });
    const verdict = h('div', { class: 'lc-verdict' });
    const codeBox = h('div'); const runBox = h('div');
    root.append(presetRow, palette, h('div', { class: 'muted' }, 'השרשרת (מימין לשמאל = סדר הריצה):'), chainBox,
      h('label', { class: 'lc-lbl' }, 'טקסט הפנייה לדוגמה:'), ta, h('label', { class: 'lc-lbl' }, failCb, ' דמה כשל ב-API של המודל (429 RateLimit)'), verdict,
      h('div', { class: 'grid2' }, h('div', null, h('h4', null, 'קוד LCEL שנוצר'), codeBox), h('div', null, h('h4', null, 'ריצה מדומה - צורת הנתונים'), runBox)));
    function draw() { drawChain(); drawOut(); }
    function drawChain() {
      chainBox.innerHTML = '';
      const v = validate(st.items);
      if (!st.items.length) chainBox.appendChild(h('div', { class: 'muted' }, 'אין רכיבים עדיין.'));
      st.items.forEach((it, i) => {
        const c = COMP[it.k]; const s = v.steps[i];
        const card = h('div', { class: 'lc-node lc-' + c.cls + (s && s.error ? ' bad' : '') + (s && s.skipped ? ' skip' : '') });
        card.appendChild(h('div', { class: 'lc-node-h' }, c.icon + ' ' + c.label));
        if (it.k === 'model') {
          const sel = h('select', { onchange: () => { it.tier = sel.value; draw(); } }, ...Object.keys(TIERS).map(t => h('option', { value: t, selected: it.tier === t ? true : null }, t)));
          const mk = (lab, key) => h('label', { class: 'lc-opt' }, h('input', { type: 'checkbox', checked: it[key] ? true : null, onchange: ev => { it[key] = ev.target.checked; draw(); } }), lab);
          card.append(sel, mk('structured', 'structured'), mk('fallback', 'fallback'));
        }
        if (it.k === 'parser') {
          const sel = h('select', { onchange: () => { it.kind = sel.value; draw(); } }, ...[['str', 'StrOutputParser'], ['json', 'JsonOutputParser'], ['pydantic', 'PydanticOutputParser']].map(([a, b]) => h('option', { value: a, selected: it.kind === a ? true : null }, b)));
          card.appendChild(sel);
        }
        if (s) card.appendChild(h('div', { class: 'lc-types' }, `${s.inT} → ${s.outT}`));
        if (s && s.error) card.appendChild(h('div', { class: 'lc-err' }, s.error));
        const ctl = h('div', { class: 'lc-ctl' },
          h('button', { type: 'button', title: 'הזז ימינה', onclick: () => { if (i > 0) { [st.items[i - 1], st.items[i]] = [st.items[i], st.items[i - 1]]; draw(); } } }, '→'),
          h('button', { type: 'button', title: 'הזז שמאלה', onclick: () => { if (i < st.items.length - 1) { [st.items[i + 1], st.items[i]] = [st.items[i], st.items[i + 1]]; draw(); } } }, '←'),
          h('button', { type: 'button', title: 'הסר', onclick: () => { st.items.splice(i, 1); draw(); } }, '✕'));
        card.appendChild(ctl);
        chainBox.appendChild(card);
        if (i < st.items.length - 1) chainBox.appendChild(h('div', { class: 'lc-pipe' }, '|'));
      });
    }
    function drawOut() {
      st.items.forEach(i => { if (i.k === 'model') i.tools = false; });
      const v = validate(st.items);
      verdict.className = 'lc-verdict ' + (v.error ? 'bad' : v.warnings.length ? 'warn' : 'ok');
      verdict.innerHTML = v.error ? '❌ ' + esc(v.error) : (st.items.length ? `✅ השרשרת תקינה. טיפוס פלט: <b>${esc(v.out)}</b>` : 'ℹ️ הוסיפו רכיבים.') + v.warnings.map(w => '<div>⚠️ ' + esc(w) + '</div>').join('');
      codeBox.innerHTML = v.error ? '<div class="muted">תקנו את השגיאה כדי לקבל קוד.</div>' : LA.code(genCode(st.items), 'python', 'chain.py');
      runBox.innerHTML = '';
      if (v.error) { runBox.appendChild(h('div', { class: 'muted' }, 'לא ניתן להריץ שרשרת לא תקינה (בפועל: חריגת טיפוס/KeyError בריצה הראשונה).')); return; }
      simulate(st.items, st.text, st.fail).forEach((r, i) => {
        runBox.appendChild(h('div', { class: 'lc-run lc-' + r.c + (r.bad ? ' bad' : '') },
          h('div', { class: 'lc-run-h' }, h('span', { class: 'lc-run-n' }, String(i + 1)), h('b', null, r.name), h('span', { class: 'badge acc' }, r.t)),
          h('div', { class: 'out lc-run-v' }, r.v), r.extra ? h('div', { class: 'muted lc-run-x' }, r.extra) : null));
      });
    }
    draw(); el.appendChild(root);
  }

  /* ------------------------------------------------------------------ */
  /* Lab 2: prompt template                                              */
  /* ------------------------------------------------------------------ */
  function promptLab(el) {
    const st = {
      sys: 'אתה נציג שירות של {company}. ענה ב{tone} ובעברית, עד {max_words} מילים.\nאם חסר מידע - בקש אותו. כתוב {{"status"}} במילים, לא בסוגריים מסולסלים.',
      hum: 'לקוח: {customer_name}\nפנייה: {ticket}',
      hist: true,
      vals: { company: 'חברת החשמל', tone: 'טון חם ומקצועי', max_words: '60', customer_name: 'דנה לוי', ticket: 'מתי יחזור החשמל לרחוב הרצל?' },
      history: 'human: שלום\nai: שלום דנה, איך אפשר לעזור?'
    };
    const root = h('div', { class: 'lab lc-lab' });
    root.appendChild(h('div', { class: 'lab-h' }, '📝 Prompt Template Lab'));
    root.appendChild(h('p', { class: 'muted' }, 'ערכו את התבניות. משתנים בסוגריים מסולסלים {name} מזוהים אוטומטית; כדי לכתוב סוגר מסולסל ממש משתמשים ב-{{ }}. אם תשאירו משתנה בלי ערך תקבלו שגיאה כמו ב-LangChain.'));
    const sys = h('textarea', { class: 'lc-ta', rows: 4, oninput: () => { st.sys = sys.value; draw(); } }); sys.value = st.sys;
    const hum = h('textarea', { class: 'lc-ta', rows: 3, oninput: () => { st.hum = hum.value; draw(); } }); hum.value = st.hum;
    const histCb = h('input', { type: 'checkbox', checked: true, onchange: () => { st.hist = histCb.checked; draw(); } });
    const histTa = h('textarea', { class: 'lc-ta', rows: 3, oninput: () => { st.history = histTa.value; draw(); } }); histTa.value = st.history;
    const vars = h('div', { class: 'lc-vars' }); const out = h('div'); const codeBox = h('div');
    root.append(h('label', { class: 'lc-lbl' }, 'system template'), sys, h('label', { class: 'lc-lbl' }, 'human template'), hum,
      h('label', { class: 'lc-lbl' }, histCb, ' הוסף MessagesPlaceholder("history")  (פורמט: שורה לכל הודעה, human:/ai:)'), histTa,
      h('h4', null, 'ערכי המשתנים'), vars, h('h4', null, 'ההודעות שיישלחו למודל'), out, codeBox);
    const varsOf = t => { const r = []; t.replace(/\{\{|\}\}/g, '').replace(/\{(\w+)\}/g, (m, n) => { if (!r.includes(n)) r.push(n); }); return r; };
    const fill = (t, missing) => t.replace(/\{\{/g, '\u0001').replace(/\}\}/g, '\u0002').replace(/\{(\w+)\}/g, (m, n) => { if (st.vals[n] === undefined || st.vals[n] === '') { missing.add(n); return m; } return st.vals[n]; }).replace(/\u0001/g, '{').replace(/\u0002/g, '}');
    function draw() {
      const all = [...new Set([...varsOf(st.sys), ...varsOf(st.hum)])];
      const need = all.join('|');
      if (vars.dataset.k !== need) {
        vars.dataset.k = need; vars.innerHTML = '';
        all.forEach(n => {
          const inp = h('input', { type: 'text', class: 'lc-inp', oninput: () => { st.vals[n] = inp.value; renderOut(); } }); inp.value = st.vals[n] || '';
          vars.appendChild(h('label', { class: 'lc-var' }, h('code', null, '{' + n + '}'), inp));
        });
        if (!all.length) vars.appendChild(h('div', { class: 'muted' }, 'אין משתנים בתבנית.'));
      }
      renderOut(all);
    }
    function renderOut(all) {
      all = all || [...new Set([...varsOf(st.sys), ...varsOf(st.hum)])];
      const missing = new Set(); out.innerHTML = '';
      const msgs = [];
      msgs.push(['SystemMessage', fill(st.sys, missing), 'system']);
      if (st.hist) st.history.split('\n').filter(Boolean).forEach(l => { const m = /^(human|ai)\s*:\s*(.*)$/i.exec(l); if (m) msgs.push([m[1].toLowerCase() === 'ai' ? 'AIMessage' : 'HumanMessage', m[2], m[1].toLowerCase() === 'ai' ? 'ai' : 'human']); });
      msgs.push(['HumanMessage', fill(st.hum, missing), 'human']);
      if (missing.size) out.appendChild(h('div', { class: 'lc-verdict bad' }, '❌ KeyError / "Input missing: ' + [...missing].join(', ') + '" - ' + 'ב-LangChain זו שגיאה כבר ב-invoke, לפני קריאת המודל (ולכן זולה לגילוי).'));
      let totalChars = 0;
      msgs.forEach(([cls, txt, role]) => {
        totalChars += txt.length;
        out.appendChild(h('div', { class: 'lc-msg lc-m-' + role }, h('div', { class: 'lc-msg-h' }, cls), h('div', { class: 'lc-msg-b', text: txt })));
      });
      out.appendChild(h('div', { class: 'muted' }, `סה"כ ${msgs.length} הודעות · ~${tok(msgs.map(m => m[1]).join(' '))} tokens (הערכה גסה: תו/3.5; עברית עולה לרוב יותר tokens מאנגלית) · משתנים בתבנית: ${all.length}`));
      codeBox.innerHTML = LA.code(
        `prompt = ChatPromptTemplate.from_messages([\n    ("system", ${JSON.stringify(st.sys)}),\n${st.hist ? '    MessagesPlaceholder("history"),\n' : ''}    ("human", ${JSON.stringify(st.hum)}),\n])\n\nprompt.invoke({${all.map(n => `"${n}": ...`).join(', ')}${st.hist ? ', "history": [...]' : ''}})  # -> ChatPromptValue(messages=[...])`, 'python', 'prompt.py');
    }
    draw(); el.appendChild(root);
  }

  /* ------------------------------------------------------------------ */
  /* Module                                                              */
  /* ------------------------------------------------------------------ */
  LA.register({
    id: 'langchain', order: 40, group: 'build', icon: '🔗', short: 'LangChain', title: 'LangChain — לבני לגו לאפליקציות LLM',
    render(main) {
      LA.page(main, {
        icon: '🔗', title: 'LangChain — לבני לגו לאפליקציות LLM',
        subtitle: 'שכבת הפשטה מעל מודלים וספקים: prompt, מודל, parser, כלים ו-retriever כרכיבים תואמים שמחברים עם <code>|</code>.',
        sections: [
          {
            id: 'intro', title: 'בשורה אחת + אנלוגיה',
            html: `<p><b>LangChain</b> היא ספריית קוד פתוח (Python / JS) שמגדירה <b>ממשקים אחידים</b> לרכיבים שחוזרים בכל אפליקציית LLM: מודל שיחה, הודעות, תבניות prompt, parsers, כלים, retrievers, vector stores ו-loaders. מעליהם יושב <b>LCEL</b> - דרך להרכיב רכיבים בצינור אחד: <code>prompt | llm | parser</code>.</p>
            ${LA.callout('analogy', 'דמיינו <b>לגו</b>: לכל לבנה יש אותם חריצים (ממשק <code>Runnable</code>), אז אפשר לחבר לבנת "מודל Claude" במקום לבנת "מודל אחר" בלי לבנות מחדש את כל המבנה. LangChain לא מייצרת לבנים חדשות מופלאות - היא מבטיחה שהן <em>מתחברות</em>.')}
            <p>ב-v1 (אוקטובר 2025 ואילך) הספרייה התמקדה והפכה רזה יותר: <b>langchain-core</b> מחזיקה את ההפשטות, <code>create_agent</code> הוא הדרך הסטנדרטית לבנות סוכן (בנוי מעל <b>LangGraph</b>), ורכיבים ישנים (Chains קלאסיים, memory classes) עברו ל-<code>langchain-classic</code>.</p>
            ${LA.callout('example', 'נעבור לאורך המודול על דוגמה אחת: <b>מסווג פניות + מנסח תשובות</b> לחברת חשמל. ' + LA.modelBadge('haiku') + ' מסווג כל פנייה (קטגוריה, דחיפות, סנטימנט) כ-structured output, ' + LA.modelBadge('sonnet') + ' מנסח תשובה, ' + LA.modelBadge('opus') + ' רק לפניות דחופות ושליליות, ויש fallback אם מודל נכשל.')}`
          },
          { id: 'eco', title: 'איך זה עובד — מפת האקוסיסטם', render(el) { LA.diagram(el, ecosystemSpec()); el.insertAdjacentHTML('beforeend', LA.callout('tip', 'ההפרדה לחבילות היא החלטה הנדסית: תלויות קלות (לא מתקינים SDK של כל ספק), וגרסאות עצמאיות לאינטגרציות. בפועל מתקינים: <code>pip install langchain langchain-anthropic</code> ועוד חבילת vector store לפי הצורך.')); } },
          { id: 'dive', title: 'צלילה פנימה — מאפליקציה ועד invoke() בודד', render(el) {
            el.insertAdjacentHTML('beforeend', '<p>ארבע רמות: <b>אפליקציה</b> → <b>שרשרת</b> → <b>פרוטוקול Runnable</b> → <b>קריאת invoke אחת</b>. התחילו מלחיצה על Chain ← "צלול פנימה", ואז על ChatModel, ואז על invoke().</p>');
            LA.diagram(el, appSpec());
            el.insertAdjacentHTML('beforeend', LA.callout('info', 'התובנה המרכזית: <b>הכל Runnable</b>. prompt הוא Runnable, מודל הוא Runnable, parser הוא Runnable, פונקציית Python רגילה עטופה ב-<code>RunnableLambda</code> היא Runnable, ושרשרת שלמה היא Runnable (<code>RunnableSequence</code>) - ולכן אפשר לשרשר שרשראות.'));
          } },
          { id: 'components', title: 'רכיבי הליבה', render(el) {
            LA.tabs(el, [
              { label: '💬 Chat models + Messages', html: `<p>מודל שיחה מקבל <b>רשימת הודעות</b> ומחזיר <code>AIMessage</code>. סוגי הודעות: <code>SystemMessage</code>, <code>HumanMessage</code>, <code>AIMessage</code> (עם <code>tool_calls</code> ו-<code>usage_metadata</code>), <code>ToolMessage</code>. אותו ממשק לכל ספק: מחליפים <code>ChatAnthropic</code> במודל של ספק אחר בלי לשנות את השרשרת.</p>${LA.code(`from langchain_anthropic import ChatAnthropic
llm = ChatAnthropic(model="claude-sonnet-5-5", max_tokens=1024)

msg = llm.invoke([("system", "ענה בקצרה"), ("human", "מהו RAG?")])
print(type(msg).__name__)         # AIMessage
print(msg.content)                # הטקסט
print(msg.usage_metadata)         # {'input_tokens': ..., 'output_tokens': ...}

for chunk in llm.stream("ספר בדיחה"):   # זרימה token-token
    print(chunk.content, end="")`, 'python')}<p>בחירת מודל לפי משימה: ${LA.modelBadge('haiku')} לסיווג/חילוץ בנפח, ${LA.modelBadge('sonnet')} לכתיבה וקוד, ${LA.modelBadge('opus')} לתכנון מורכב. אל תעבירו <code>temperature</code> למודלים הנוכחיים - הם דוחים אותו; עומק חשיבה נשלט ב-<code>output_config.effort</code> (נתמך דרך פרמטרים ייעודיים של האינטגרציה בגרסאות עדכניות; בדקו בתיעוד החבילה).</p>` },
              { label: '📝 Prompt templates', html: `<p><code>ChatPromptTemplate</code> הופך dict של משתנים לרשימת הודעות. מפריד בין <b>קוד</b> (תבנית קבועה, בגיט) לבין <b>נתונים</b> (משתנים בזמן ריצה), ומאפשר גרסאות, בדיקות ו-A/B. <code>MessagesPlaceholder</code> מזריק היסטוריית שיחה. ראו מעבדה למטה.</p>${LA.code(`from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
prompt = ChatPromptTemplate.from_messages([
    ("system", "אתה נציג של {company}."),
    MessagesPlaceholder("history"),
    ("human", "{question}"),
])
prompt.invoke({"company": "חברת החשמל", "history": [], "question": "מה שעות הפעילות?"})`, 'python')}` },
              { label: '🧾 Output parsers + structured output', html: `<p>הבעיה: מודל מחזיר טקסט, ואתם צריכים אובייקט. הפתרון המודרני: <code>llm.with_structured_output(PydanticModel)</code> - LangChain משתמש ביכולת tool-calling/הסכמה של המודל כדי להחזיר אובייקט מאומת. Parsers קלאסיים (<code>StrOutputParser</code>, <code>JsonOutputParser</code>) עדיין שימושיים לטקסט חופשי.</p>${LA.code(`class Triage(BaseModel):
    category: Literal["billing", "outage", "meter", "other"]
    urgency: Literal["low", "medium", "high"]

structured = ChatAnthropic(model="claude-haiku-5-5").with_structured_output(Triage)
t = structured.invoke("החשמל נותק!")     # Triage(category='outage', urgency='high')
assert t.urgency in ("low", "medium", "high")   # טיפוסי, בלי regex`, 'python')}${LA.callout('warn', 'אימות סכמה (Pydantic) מבטיח <b>צורה</b>, לא <b>נכונות</b>. מודל יכול להחזיר urgency="low" לפנייה על שריפה - בדקו נכונות ב-eval.')}` },
              { label: '🛠️ Tools', html: `<p>כלי הוא פונקציית Python עם שם, תיאור וסכמת קלט. <code>@tool</code> בונה את כל זה מ-docstring ו-type hints. <code>llm.bind_tools([...])</code> שולח את הסכמות למודל; המודל מחזיר <code>AIMessage.tool_calls</code> - <b>הוא לא מריץ שום דבר בעצמו</b>; הקוד שלכם (או <code>create_agent</code>) מריץ את הכלי ומחזיר <code>ToolMessage</code>.</p>${LA.code(`from langchain_core.tools import tool

@tool
def lookup_invoice(invoice_id: str) -> dict:
    """בדיקת סטטוס חשבונית לפי מספר."""   # ה-docstring הוא התיאור שהמודל רואה!
    ...

llm_t = llm.bind_tools([lookup_invoice])
ai = llm_t.invoke("מה הסטטוס של חשבונית 8841?")
ai.tool_calls   # [{'name': 'lookup_invoice', 'args': {'invoice_id': '8841'}, 'id': '...'}]`, 'python')}` },
              { label: '🔎 Retrievers + Vector stores', html: `<p><b>Retriever</b> הוא Runnable שמקבל שאילתה (str) ומחזיר <code>list[Document]</code>. <b>VectorStore</b> שומר embeddings ומבצע חיפוש דמיון; <code>store.as_retriever()</code> הופך אותו ל-retriever. עקרונות RAG מפורטים במודול RAG; כאן רואים איך זה מתחבר ב-LCEL.</p>${LA.code(CODE_RAG, 'python', 'rag_chain.py')}` },
              { label: '📄 Loaders + Splitters', html: `<p><b>Document Loaders</b> קוראים מקורות (PDF, Confluence, S3, Slack) ל-<code>Document(page_content, metadata)</code>. <b>Text Splitters</b> (חבילת <code>langchain-text-splitters</code>) חותכים לצ'אנקים. <code>RecursiveCharacterTextSplitter</code> מנסה לחתוך לפי פסקאות, אז שורות, אז משפטים, כדי לשמר משמעות.</p>${LA.list(['<code>chunk_size</code> ו-<code>chunk_overlap</code> הם היפר-פרמטרים שמשפיעים ישירות על איכות האחזור - כוונו ב-eval, לא בתחושה.', 'שמרו metadata (מקור, עמוד, תאריך) - נדרש לציטוט ולסינון.', 'לטבלאות/PDF סרוקים - loader רגיל לא יספיק; שקלו parser ייעודי.'])}` },
              { label: '🧠 Memory / היסטוריה', html: `<p>ב-v1 <b>"memory" כמחלקות</b> (ConversationBufferMemory וכו') נחשבות legacy. הגישה המודרנית: <b>ההיסטוריה היא חלק מה-state</b>. בסוכנים ובגרפים - checkpointer של LangGraph שומר את ה-messages לפי <code>thread_id</code>. בשרשרת פשוטה - <code>MessagesPlaceholder</code> + אחסון הודעות משלכם (או <code>RunnableWithMessageHistory</code>).</p>${LA.callout('warn', 'היסטוריה ארוכה = יותר tokens = יותר עלות וזמן, ו"אובדן באמצע". גזרו (trim) או סכמו הודעות ישנות; מדדו את אורך ההקשר ב-LangSmith.')}` },
              { label: '📡 Callbacks + LangSmith', html: `<p>כל Runnable משדר אירועים (start/end/error/token). <b>Callbacks</b> מאפשרים לוג, מדידה, streaming ל-UI. <b>LangSmith</b> אוסף אותם לעץ trace עם קלט/פלט, tokens, latency ועלות לכל צעד, ומאפשר להריץ evals על datasets.</p>${LA.code(`# בלי לשנות שורת קוד בשרשרת:
export LANGSMITH_TRACING=true
export LANGSMITH_API_KEY=...
export LANGSMITH_PROJECT=ticket-triage

# ובקוד: תיוג להרצה ספציפית
chain.invoke(x, config={"tags": ["prod", "v3"], "metadata": {"tenant": "acme"}})`, 'bash')}${LA.callout('algo', 'בלי tracing אי אפשר לדבג שרשרת: כשהתשובה שגויה צריך לדעת <em>איזה צעד</em> שגה - האחזור? ה-prompt? המודל? ה-parser?')}` }
            ]);
          } },
          { id: 'lcel', title: 'Runnable ו-LCEL — הרכבה', render(el) {
            el.insertAdjacentHTML('beforeend', `<p>האופרטור <code>|</code> יוצר <code>RunnableSequence</code>. מעבר לכך, כמה "לבני הרכבה" מרכזיות:</p>` + LA.table(['רכיב', 'מה עושה', 'דוגמה'], [
              ['<code>RunnableSequence</code> / <code>|</code>', 'פלט שלב N = קלט שלב N+1', '<code>prompt | llm | parser</code>'],
              ['<code>RunnableParallel</code> (dict)', 'מריץ ענפים במקביל על אותו קלט, מחזיר dict', '<code>{"a": chain_a, "b": chain_b}</code>'],
              ['<code>RunnablePassthrough</code> / <code>.assign</code>', 'מעביר קלט כמו שהוא / מוסיף מפתחות מחושבים', '<code>RunnablePassthrough.assign(triage=classifier)</code>'],
              ['<code>RunnableLambda</code>', 'עוטף פונקציה רגילה כ-Runnable', '<code>RunnableLambda(pick_drafter)</code>'],
              ['<code>.with_retry()</code>', 'ניסיון חוזר על חריגות זמניות (עם backoff)', '<code>.with_retry(stop_after_attempt=3)</code>'],
              ['<code>.with_fallbacks([...])</code>', 'אם הראשי נכשל - מנסה חלופה בסדר', '<code>haiku_chain.with_fallbacks([sonnet_chain])</code>']
            ]));
            el.insertAdjacentHTML('beforeend', '<h4>ארבעת מצבי ההרצה של אותה שרשרת</h4>' + LA.code(`chain.invoke({"ticket": t})                          # קלט אחד
chain.batch([{"ticket": t} for t in tickets],        # רבים, במקביל
            config={"max_concurrency": 8})
for chunk in chain.stream({"ticket": t}): ...         # זרימה
await chain.ainvoke({"ticket": t})                    # async (FastAPI)`, 'python'));
            el.insertAdjacentHTML('beforeend', LA.callout('tip', 'עקרון fallback נכון: <b>החלופה חייבת להיות שונה בכשל</b>. fallback מ-Haiku ל-Sonnet עוזר ל-429/timeout ולכשל סכמה (שימושי כשמודל קטן "מפספס" את הפורמט), אבל fallback לאותו מודל באותו ספק לא יעזור בהפסקת שירות. לכשלים עסקיים (תשובה שגויה) צריך <em>הערכה</em>, לא fallback.'));
            el.insertAdjacentHTML('beforeend', '<h4>סוכן ב-v1: create_agent</h4><p>כשהמודל צריך להחליט בעצמו אילו כלים להפעיל ובאיזה סדר - כבר אין צורך בשרשרת קבועה. <code>create_agent</code> נותן לולאת "מודל ↔ כלים" מוכנה (מעל LangGraph), תומך ב-middleware (סיכום הקשר, אישור אנושי, guardrails).</p>' + LA.code(CODE_AGENT, 'python', 'agent.py'));
          } },
          { id: 'example', title: 'דוגמה מוחשית — מסווג פניות + מנסח תשובות', render(el) {
            el.insertAdjacentHTML('beforeend', `<p>חברת חשמל מקבלת אלפי פניות ביום. הדרישות: סיווג מובנה לניתוב לנציג, ניסוח טיוטת תשובה, ו-SLA קשיח. <b>ניתוב מודלים לפי מורכבות:</b></p>` + LA.table(['שלב', 'מודל', 'למה'], [
              ['סיווג (category/urgency/sentiment)', LA.modelBadge('haiku'), 'משימה צרה, נפח גבוה, latency נמוך, עלות זניחה לפנייה'],
              ['fallback לסיווג', LA.modelBadge('sonnet'), 'אם Haiku נכשל בסכמה או חרג (429/timeout) - עדיף עלות קטנה מפנייה אבודה'],
              ['טיוטת תשובה רגילה', LA.modelBadge('sonnet'), 'ניסוח איכותי בעברית, מדיניות, טון'],
              ['פניות דחופות + שליליות', LA.modelBadge('opus'), 'נדירות, רגישות מותגית/משפטית - שווה מודל חזק']
            ]));
            el.insertAdjacentHTML('beforeend', LA.code(CODE_TICKET, 'python', 'triage_chain.py'));
            el.insertAdjacentHTML('beforeend', LA.callout('info', 'שימו לב לשלושה דברים: (1) <code>Triage</code> הוא החוזה - שינוי סכמה הוא שינוי API. (2) <code>RunnableLambda(pick_drafter)</code> מחזיר Runnable והוא מורץ על אותו קלט - זה "ניתוב" ב-LCEL. (3) ניתוב מורכב יותר (לולאות, אישור אנושי) הוא כבר עבודה ל-<a href="#/langgraph">LangGraph</a>.'));
          } },
          { id: 'lab1', title: 'מעבדה 1 — Chain Builder', render: chainBuilderLab },
          { id: 'lab2', title: 'מעבדה 2 — Prompt Template', render: promptLab },
          { id: 'llm', title: 'הקשר ל-LLM', html: LA.callout('llm', `LangChain <b>לא</b> מוסיפה אינטליגנציה - היא מארגנת את הקריאות ל-LLM. כל הערך שלה נמצא ב"מסביב": הפיכת קלט מובנה להודעות (prompt), הפיכת טקסט חוזר לנתונים (parser/structured output), חיבור יכולות (tools, retrieval), עמידות (retry/fallback) ותצפית (tracing). איכות התוצאה עדיין תלויה ב<b>מודל שבחרתם</b> וב<b>prompt</b>: ' + LA.modelBadge('haiku') + ' מתאים לצעדים צרים, ' + LA.modelBadge('sonnet') + ' ברירת מחדל לניסוח, ' + LA.modelBadge('opus') + ' לצעדי תכנון/הכרעה.<br><br>יתרון הפשטה אמיתי: מעבר בין מודלים (או ספקים) = שורה אחת, ולכן A/B בין Haiku ל-Sonnet על אותו eval הוא קל. מחיר ההפשטה: לפעמים יכולת ייחודית של ספק (כמו prompt caching, extended thinking) נגישה רק דרך פרמטרים של החבילה הספציפית.`) + `
            <h4>מתי לא להשתמש ב-LangChain</h4>` + LA.table(['מצב', 'עדיף'], [
              ['קריאה בודדת למודל + טקסט חוזר', 'ה-SDK של Anthropic ישירות: פחות תלויות, שליטה מלאה'],
              ['צריך את כל התכונות החדשות של API ביום ההשקה', 'SDK ישיר (העטיפה מתעכבת)'],
              ['לולאת סוכן עם מצב, אישור אנושי, שחזור מכשל', 'LangGraph (או לולאה ידנית אם פשוט)'],
              ['צוות שלא מכיר את ההפשטות, אב-טיפוס חד פעמי', 'SDK + פונקציות Python רגילות'],
              ['צריך מגוון אינטגרציות (loaders, vector stores, ספקים)', 'LangChain - כאן היא מצטיינת']
            ]) },
          { id: 'profile', title: 'דרישות · חוזקות · חולשות', html: LA.profile({
            requirements: ['Python 3.10+ (או Node) וחבילות: <code>langchain</code>, <code>langchain-anthropic</code>, חבילת vector store', 'מפתח API לספק המודל (<code>ANTHROPIC_API_KEY</code>) וסביבה עם גישת רשת', 'הבנת מודל Runnable (קלט/פלט של כל רכיב) כדי לדבג', 'מומלץ: חשבון LangSmith ל-tracing ו-evals', 'נעילת גרסאות (pin) - ה-API זז'],
            strengths: ['ממשק אחיד: החלפת מודל/ספק/vector store בשורה אחת', 'LCEL: batch / stream / async חינם לכל שרשרת', 'structured output טיפוסי עם Pydantic', 'אקוסיסטם גדול של אינטגרציות ו-loaders', 'retry / fallback / tracing מובנים', 'מעבר טבעי ל-LangGraph כשהלוגיקה גדלה'],
            weaknesses: ['שכבות הפשטה: דיבוג בלי tracing קשה ("איפה נשבר ה-prompt?")', 'שינויים תכופים ו-deprecations בין גרסאות (ראו מעבר v0.x ל-v1)', 'אינטגרציות community באיכות משתנה', 'overhead של תלויות ולמידה לעומת SDK ישיר', 'יכולות ייחודיות של ספק מגיעות באיחור', 'קל ליצור שרשראות "קסומות" שאף אחד לא מבין'],
            algoTips: ['הפעילו LangSmith מהיום הראשון, וצרו dataset של 50-200 קלטים אמיתיים עם תשובות רצויות', 'מדדו כל צעד בנפרד: דיוק הסיווג (F1), איכות אחזור (recall@k), איכות תשובה (LLM-judge + בדיקה ידנית)', 'נתבו מודלים לפי צעד, ואמתו ב-eval שה-Haiku באמת מספיק לסיווג לפני שחוסכים', 'הגדירו timeouts ו-<code>max_retries</code>, ו-fallback שנבדק בפועל (הזריקו כשל בבדיקה)', 'שמרו prompts כקבצים בגרסאות, ושימו metadata (גרסת prompt) ב-trace'],
            whenToUse: ['כן: צינורות LLM קבועים (סיווג→ניסוח, RAG), אב-טיפוס מהיר עם אינטגרציות', 'כן: צריך batch/stream/async וטרייסינג בלי לבנות הכל', 'לא: קריאה בודדת פשוטה (SDK)', 'לא: זרימת סוכן מורכבת עם מצב ולולאות (LangGraph)']
          }) },
          { id: 'algo', title: 'עין של אלגוריתמאי', render(el) {
            el.insertAdjacentHTML('beforeend', LA.callout('algo', 'רשימת בדיקה לפני שמעלים שרשרת LangChain לפרודקשן:') + LA.list([
              '<b>Eval לפני אופטימיזציה</b>: dataset מתויג; מדדי צעד (F1 לסיווג, recall@k לאחזור) ומדד קצה-לקצה. שינוי prompt/מודל ללא eval הוא ניחוש.',
              '<b>Structured output לא שווה נכונות</b>: הסכמה תקינה ≠ תוכן נכון. בדקו גם שיעור כשלי parsing ושיעור הפעלת fallback (אם 30% מהקריאות נופלות ל-fallback - הצעד הראשי לא מתאים).',
              '<b>עלות ו-latency</b>: חשבו tokens לפנייה × נפח; batch + <code>max_concurrency</code> מתחשב ב-rate limits. מעקב אחר p95, לא רק ממוצע.',
              '<b>Prompt injection</b>: טקסט פנייה/מסמך מאוחזר הוא נתון לא מהימן. אל תתנו לטקסט כזה לקבוע אילו כלים יופעלו בלי הרשאות מינימליות ואישור.',
              '<b>הדלפת נתונים</b>: מה נשלח ל-LangSmith? הסוו PII ב-traces, או הגדירו הסתרת קלט/פלט.',
              '<b>שחזוריות</b>: נעלו גרסאות חבילות ומזהי מודל מדויקים; תעדו גרסת prompt; מודלים נשארים לא-דטרמיניסטיים - אל תסתמכו על שוויון פלט מילה במילה בבדיקות.',
              '<b>Fallback בלי מדיניות</b>: ודאו שה-fallback לא מסלים עלות בלי שליטה (למשל fallback ל-Opus על כל 429).',
              '<b>גרסאות</b>: קראו changelog של כל שדרוג; בדקו ש-<code>with_structured_output</code> ו-tool calling עדיין מתנהגים אותו דבר ב-eval שלכם.'
            ]));
          } },
          { id: 'quiz', title: 'בוחן', render(el) {
            LA.quiz(el, [
              { q: 'מה הופך את <code>prompt | llm | parser</code> לאפשרי?', options: ['LangChain מקמפלת את השרשרת לקוד מכונה', 'כל רכיב מממש את ממשק Runnable (invoke/stream/batch), והאופרטור | יוצר RunnableSequence', 'כל הרכיבים חייבים להיות מאותו ספק', 'האופרטור | הוא תחביר של Python שמריץ מודל'], answer: 1, explain: 'Runnable הוא החוזה האחיד. הפלט של רכיב הוא הקלט של הבא, ולכן ההרכבה עובדת.' },
              { q: 'בשרשרת <code>llm | prompt</code> (הפוכה) מה יקרה?', options: ['תעבוד, הסדר לא משנה', 'שגיאה: המודל מצפה ל-PromptValue/הודעות, לא ל-dict של משתנים', 'LangChain תסדר אוטומטית', 'המודל יתעלם מה-prompt'], answer: 1, explain: 'המעבדה מדגימה את זה: הרכיבים תואמים רק כשהטיפוס של היציאה מתאים לקלט הבא.' },
              { q: 'מה <code>llm.bind_tools([t])</code> גורם למודל לעשות?', options: ['להריץ את הפונקציה t', 'להחזיר AIMessage עם tool_calls שמבקש להפעיל את t - ההפעלה בפועל נעשית אצלכם/ב-agent', 'להוריד את t מהאינטרנט', 'להחליף את המודל בכלי'], answer: 1, explain: 'מודל רק מציע קריאה לכלי עם ארגומנטים. הרצה ו-ToolMessage הם באחריות הקוד או create_agent.' },
              { q: 'באיזה מצב עדיף SDK ישיר על פני LangChain?', options: ['RAG עם 5 ספקי vector store', 'קריאה בודדת למודל עם prompt קבוע', 'צריך batch ו-tracing', 'מעבר בין ספקים'], answer: 1, explain: 'לקריאה פשוטה, הפשטה היא תלות מיותרת. LangChain מצדיקה את עצמה כשיש הרכבה, אינטגרציות ו-observability.' },
              { q: 'מסווג פניות עם נפח גבוה ומשימה צרה. איזה מודל וברירת fallback הגיוניים?', options: ['Opus בלי fallback', 'Haiku עם structured output, ו-fallback ל-Sonnet', 'Sonnet עם fallback ל-Haiku', 'אין צורך בהחלטה'], answer: 1, explain: 'Haiku זול ומהיר למשימה צרה; fallback חזק יותר מכסה כשלי סכמה/זמינות. תמיד אמתו ב-eval.' },
              { q: 'מה הסיכון בשימוש ב-<code>StrOutputParser</code> אחרי מודל עם bind_tools?', options: ['אין סיכון', 'כשהמודל מחליט לקרוא לכלי, ה-content ריק ותקבלו מחרוזת ריקה', 'ה-parser מריץ את הכלי', 'המודל מפסיק לקרוא לכלים'], answer: 1, explain: 'כשיש tool_calls ה-content לרוב ריק. טפלו ב-tool_calls או השתמשו ב-create_agent.' },
              { q: 'מה ההבדל בין RunnableParallel ל-RunnableSequence?', options: ['אין הבדל', 'Parallel מריץ ענפים במקביל על אותו קלט ומחזיר dict; Sequence מעביר פלט כקלט הבא', 'Parallel עובד רק עם tools', 'Sequence תמיד אסינכרוני'], answer: 1, explain: 'Parallel = פיצול על אותו קלט ואיחוד ל-dict. Sequence = צינור.' },
              { q: 'למה tracing (LangSmith) קריטי בשרשרת?', options: ['הוא מאיץ את המודל', 'כשפלט שגוי, רואים באיזה צעד הבעיה: אחזור, prompt, מודל או parser', 'הוא מחליף eval', 'נדרש כדי להריץ LCEL'], answer: 1, explain: 'ההפשטה מסתירה את הצעדים. tracing מחזיר נראות; הוא לא מחליף eval אך משלים אותו.' }
            ]);
          } }
        ]
      });
    }
  });
})();
