(function () {
  'use strict';
  const h = LA.h, esc = LA.esc;

  /* ------------------------------------------------------------------ */
  /* Diagram specs                                                       */
  /* ------------------------------------------------------------------ */
  function nodeFnSpec() {
    return {
      title: 'פונקציית צומת', width: 900, height: 300,
      intro: '<div class="dg-hint">🔬 הרובד הקטן ביותר: <b>צומת = פונקציית Python רגילה</b>. מקבלת snapshot של ה-state ומחזירה <b>עדכון חלקי</b>. היא לא כותבת ל-state ישירות - ה-runtime ממזג את מה שהיא מחזירה באמצעות ה-reducers.</div>',
      nodes: [
        { id: 'in', x: 800, y: 150, w: 150, h: 70, label: 'state (קריאה)', sub: 'snapshot של תחילת הצעד', color: 'store', info: '<p>הצומת רואה את ה-state כפי שהיה <b>בתחילת ה-super-step</b>. צמתים מקבילים באותו צעד לא רואים זה את זה - אין race conditions.</p>' + LA.code('state["messages"][-1].content   # הפנייה\nstate["attempts"]               # 0', 'python') },
        { id: 'fn', x: 610, y: 150, w: 160, h: 70, label: 'def classify(state)', sub: 'לוגיקה רגילה', color: 'ctrl', info: '<p>כל קוד Python: קריאת LLM, כלי, DB, חישוב. צומת יכול להיות גם Runnable/שרשרת LangChain שלמה, או גרף משנה (subgraph).</p>' },
        { id: 'llm', x: 410, y: 150, w: 150, h: 70, label: 'Claude Haiku', sub: 'structured output', color: 'llm', info: '<p>צומת הסיווג משתמש ב-' + LA.modelBadge('haiku') + ': משימה צרה וחוזרת בנפח גבוה, ולכן המודל הקטן והמהיר מספיק. <code>with_structured_output(Intake)</code> מחזיר אובייקט טיפוסי.</p>' },
        { id: 'upd', x: 210, y: 150, w: 170, h: 70, label: 'עדכון חלקי', sub: '{"intent": "refund", ...}', color: 'tool', info: '<p>מחזירים רק את המפתחות שמשתנים. מפתח בלי reducer - נדרס; מפתח עם reducer (למשל <code>add_messages</code>) - מתמזג.</p>' + LA.code('return {"intent": out.intent,\n        "order_id": out.order_id,\n        "attempts": state.get("attempts", 0) + 1}', 'python') },
        { id: 'red', x: 60, y: 150, w: 100, h: 56, label: 'reducers', color: 'ok', info: '<p>היעד: שלב המיזוג של ה-super-step (ראו רובד קודם).</p>' }
      ],
      edges: [{ from: 'in', to: 'fn' }, { from: 'fn', to: 'llm', both: true }, { from: 'fn', to: 'upd', bend: -40 }, { from: 'upd', to: 'red' }]
    };
  }

  function superStepSpec() {
    const n = (id, x, label, sub, info, color, kids) => ({ id, x, y: 150, w: 140, h: 66, label, sub, color, info, children: kids });
    return {
      title: 'super-step', width: 900, height: 300,
      intro: '<div class="dg-hint">⚙️ LangGraph רץ בסגנון <b>Pregel</b> (Bulk Synchronous Parallel): כל "סיבוב" הוא super-step עם ארבעה שלבים. לחצו על <b>הרצת צמתים</b> וצללו לצומת בודד.</div>',
      nodes: [
        n('read', 800, '1. קריאת state', 'checkpoint אחרון', '<p>ה-runtime טוען את ה-state העדכני (ב-resume: מה-checkpointer).</p>', 'store'),
        n('plan', 640, '2. תכנון', 'מי רץ עכשיו?', '<p>הצמתים שקיבלו הודעה בצעד הקודם (דרך edge או conditional edge) מוגדרים כ"פעילים". אם יש כמה - הם ירוצו <b>במקביל</b>.</p>', 'ctrl'),
        n('run', 480, '3. הרצת צמתים', 'במקביל, על אותו snapshot', '<p>כל צומת פעיל רץ על אותו snapshot. עדכונים <b>לא נראים</b> לצמתים אחרים עד סוף הצעד. כאן קוראים ל-LLM ולכלים. <b>צלול פנימה</b> לצומת בודד.</p>', 'llm', nodeFnSpec()),
        n('merge', 320, '4. הפעלת reducers', 'מיזוג עדכונים', '<p>כל העדכונים החלקיים ממוזגים ל-state לפי ה-reducer של כל מפתח. שני צמתים שכתבו למפתח בלי reducer = <code>InvalidUpdateError</code>.</p>', 'tool'),
        n('ckpt', 160, '5. checkpoint', 'שמירה ל-thread', '<p>ה-state החדש נשמר (InMemory/SQLite/Postgres) תחת <code>thread_id</code>. כל checkpoint הוא נקודת שחזור ל-time-travel ו-resume אחרי קריסה או interrupt.</p>', 'ok')
      ],
      edges: [{ from: 'read', to: 'plan' }, { from: 'plan', to: 'run' }, { from: 'run', to: 'merge' }, { from: 'merge', to: 'ckpt' }, { from: 'ckpt', to: 'read', bend: 90, dashed: true, label: 'צעד הבא' }]
    };
  }

  function graphSpec(kids) {
    const N = (id, x, y, label, sub, color, info, extra) => Object.assign({ id, x, y, w: 128, h: 58, label, sub, color, info }, extra || {});
    return {
      title: 'גרף הבקשות להחזר', width: 900, height: 460,
      intro: '<div class="dg-hint">🕸️ גרף "סוכן החזרים" לחברת מסחר: סיווג, שליפת הזמנה ומדיניות במקביל, החלטה, אישור אנושי מעל 500 ₪, ותשובה. לחצו על צומת לפרטים' + (kids ? '; <b>classify</b> נפתח ל-super-step ומשם לצומת בודד.' : '.') + '</div>',
      nodes: [
        { id: 'START', x: 850, y: 230, w: 62, h: 62, shape: 'circle', label: 'START', color: 'ext', info: '<p>נקודת הכניסה. הקלט <code>{"messages": [...]}</code> הופך ל-state ההתחלתי.</p>' },
        N('classify', 730, 230, 'classify', 'Haiku · structured', 'llm', '<p>' + LA.modelBadge('haiku') + ' מחלץ <code>intent</code> ו-<code>order_id</code>. סיווג צר ומהיר, בנפח גבוה - בדיוק מה ש-Haiku עושה היטב.</p>', kids ? { children: superStepSpec() } : {}),
        N('request_info', 730, 80, 'request_info', 'interrupt · משתמש', 'ui', '<p>חסר מספר הזמנה: הצומת קורא ל-<code>interrupt()</code> כדי לשאול את הלקוח. אחרי התשובה חוזרים ל-classify - זה <b>מחזור</b> (cycle). הגבול: <code>attempts</code> ו-<code>recursion_limit</code>.</p>'),
        N('lookup_order', 570, 150, 'lookup_order', 'tool · RetryPolicy', 'tool', '<p>קריאת API למערכת ההזמנות. אין כאן LLM. רץ <b>במקביל</b> ל-fetch_policy; עטוף ב-<code>RetryPolicy</code> לטיפול בכשלי רשת.</p>'),
        N('fetch_policy', 570, 310, 'fetch_policy', 'retriever · RAG', 'store', '<p>שליפת מדיניות ההחזרים ממאגר מסמכים (retriever). רץ במקביל ל-lookup_order ומוסיף ל-<code>notes</code> דרך reducer מסוג <code>operator.add</code>.</p>'),
        N('decide', 410, 230, 'decide', 'Sonnet · החלטה', 'llm', '<p>' + LA.modelBadge('sonnet') + ' משקלל הזמנה + מדיניות ומחזיר <code>Decision(approve, amount, reason)</code>. דורש שיפוט וקריאת מדיניות - רמה מעל סיווג, אך לא דורש Opus.</p>'),
        N('human_approval', 300, 80, 'human_approval', 'interrupt · מנהל', 'ctrl', '<p>החזר מעל 500 ₪ דורש אישור מנהל. <code>interrupt()</code> עוצר את הגרף, שומר checkpoint, וממתין ל-<code>Command(resume=...)</code> - אפילו אחרי ימים.</p>'),
        N('respond', 250, 230, 'respond', 'Sonnet · ניסוח', 'llm', '<p>' + LA.modelBadge('sonnet') + ' מנסח תשובה ללקוח בעברית לפי ההחלטה. (לתשובות תבניתיות לגמרי אפשר גם Haiku.)</p>'),
        { id: 'END', x: 90, y: 230, w: 56, h: 56, shape: 'circle', label: 'END', color: 'ext', info: '<p>סיום. ה-state הסופי נשמר ב-checkpoint האחרון.</p>' }
      ],
      edges: [
        { from: 'START', to: 'classify' },
        { from: 'classify', to: 'lookup_order', label: 'החזר + יש מס׳', color: 'ctrl' },
        { from: 'classify', to: 'fetch_policy', color: 'ctrl' },
        { from: 'classify', to: 'request_info', label: 'חסר מס׳', color: 'ctrl', bend: 20 },
        { from: 'request_info', to: 'classify', label: 'לולאה', dashed: true, bend: 20 },
        { from: 'classify', to: 'respond', label: 'לא החזר', color: 'ctrl', bend: -330, dashed: true },
        { from: 'lookup_order', to: 'decide' }, { from: 'fetch_policy', to: 'decide' },
        { from: 'decide', to: 'human_approval', label: '> 500 ₪', color: 'ctrl' },
        { from: 'decide', to: 'respond', color: 'ctrl' },
        { from: 'human_approval', to: 'respond' },
        { from: 'respond', to: 'END' }
      ]
    };
  }

  function appSpec() {
    return {
      title: 'אפליקציית LangGraph', width: 900, height: 400,
      intro: '<div class="dg-hint">🧭 אפליקציה אופיינית. לחצו על <b>Compiled graph</b> וצללו: גרף → super-step → צומת בודד.</div>',
      nodes: [
        { id: 'cl', x: 810, y: 200, w: 120, label: 'Client / API', sub: 'thread_id', color: 'ui', info: '<p>כל שיחה/בקשה מזוהה ב-<code>thread_id</code> ב-<code>config</code>. אותו thread = אותו state מתמשך.</p>' },
        { id: 'g', x: 600, y: 200, w: 170, h: 74, label: 'Compiled graph', sub: 'builder.compile()', color: 'ctrl', info: '<p>התוצאה של <code>StateGraph(...).compile(checkpointer=...)</code>: Runnable לכל דבר (<code>invoke/stream/ainvoke</code>). <b>צלול פנימה</b> לגרף.</p>', children: graphSpec(true) },
        { id: 'cp', x: 600, y: 340, w: 170, label: 'Checkpointer', sub: 'InMemory/SQLite/Postgres', shape: 'db', h: 66, color: 'store', info: '<p>שומר checkpoint אחרי כל super-step. מאפשר: המשך אחרי interrupt, שחזור מקריסה, time-travel, שיחות ארוכות.</p>' },
        { id: 'h', x: 370, y: 80, w: 150, label: 'Haiku', sub: 'classify / route', color: 'llm', info: '<p>' + LA.modelBadge('haiku') + ' לצמתי סיווג וניתוב.</p>' },
        { id: 's', x: 370, y: 200, w: 150, label: 'Sonnet', sub: 'decide / respond', color: 'llm', info: '<p>' + LA.modelBadge('sonnet') + ' לצמתי החלטה וניסוח.</p>' },
        { id: 'o', x: 370, y: 320, w: 150, label: 'Opus', sub: 'planner / supervisor', color: 'llm', info: '<p>' + LA.modelBadge('opus') + ' רק למתכנן/מפקח בתבניות multi-agent.</p>' },
        { id: 't', x: 150, y: 140, w: 140, label: 'Tools / APIs', color: 'tool', info: '<p>מערכת הזמנות, CRM, מאגר מסמכים.</p>' },
        { id: 'ls', x: 150, y: 270, w: 140, label: 'LangSmith', sub: 'traces', color: 'data', info: '<p>trace לכל super-step וצומת, כולל קלט/פלט ו-tokens.</p>' }
      ],
      edges: [
        { from: 'cl', to: 'g', both: true, label: 'invoke / stream' }, { from: 'g', to: 'cp', both: true, label: 'checkpoint' },
        { from: 'g', to: 'h', dashed: true, color: 'llm' }, { from: 'g', to: 's', color: 'llm' }, { from: 'g', to: 'o', dashed: true, color: 'llm' },
        { from: 's', to: 't', dashed: true, color: 'tool' }, { from: 'g', to: 'ls', dashed: true, color: 'data', bend: -60 }
      ]
    };
  }

  function reactSpec() {
    return {
      title: 'ReAct כגרף', width: 800, height: 280,
      intro: '<div class="dg-hint">♻️ סוכן ReAct הוא הגרף הפשוט ביותר שיש בו <b>מחזור</b>: צומת agent (LLM) וצומת tools. אם המודל ביקש כלים - הולכים ל-tools וחוזרים; אחרת מסיימים.</div>',
      nodes: [
        { id: 's', x: 720, y: 140, w: 60, h: 60, shape: 'circle', label: 'START', color: 'ext', info: '<p>קלט: <code>{"messages": [HumanMessage]}</code>.</p>' },
        { id: 'a', x: 520, y: 140, w: 150, h: 66, label: 'agent', sub: 'LLM + bind_tools', color: 'llm', info: '<p>קורא למודל עם כל ההודעות עד כה. מחזיר <code>AIMessage</code> - עם <code>tool_calls</code> או בלי. ' + LA.modelBadge('sonnet') + ' ברירת מחדל טובה; ' + LA.modelBadge('opus') + ' למשימות מורכבות; ' + LA.modelBadge('haiku') + ' כשהכלים פשוטים והמשימה צרה.</p>' },
        { id: 't', x: 280, y: 140, w: 150, h: 66, label: 'tools', sub: 'ToolNode', color: 'tool', info: '<p><code>ToolNode</code> מריץ את כל ה-tool_calls (במקביל) ומחזיר <code>ToolMessage</code> לכל אחד - הוא מצטרף ל-messages דרך <code>add_messages</code>.</p>' },
        { id: 'e', x: 90, y: 140, w: 60, h: 60, shape: 'circle', label: 'END', color: 'ext', info: '<p>כשהמודל עונה בלי tool_calls.</p>' }
      ],
      edges: [{ from: 's', to: 'a' }, { from: 'a', to: 't', label: 'יש tool_calls', color: 'ctrl', bend: 40 }, { from: 't', to: 'a', label: 'ToolMessage', dashed: true, bend: 40 }, { from: 'a', to: 'e', label: 'אין', color: 'ok', bend: -110 }]
    };
  }

  function multiSpec() {
    return {
      title: 'Supervisor multi-agent', width: 900, height: 380,
      intro: '<div class="dg-hint">👥 תבנית <b>Supervisor</b>: מתכנן/מפקח אחד מנתב בין סוכנים מתמחים. <b>ניתוב מודלים</b>: מודל חזק למי שמחליט, מודלים זולים למבצעים.</div>',
      nodes: [
        { id: 'u', x: 820, y: 190, w: 110, label: 'משימה', color: 'ui', info: '<p>למשל: "הכן דוח אנומליות חודשי על צריכת חשמל ושלח לנהל".</p>' },
        { id: 'sup', x: 600, y: 190, w: 170, h: 76, label: 'Supervisor', sub: 'Opus · מתכנן', color: 'llm', info: '<p>' + LA.modelBadge('opus') + ' מפרק את המשימה, בוחר את הסוכן הבא ומחליט מתי סיימנו. מעט קריאות, החלטות כבדות - שם Opus משתלם.</p>' + LA.code('def supervisor(state) -> Command[Literal["researcher","coder","summarizer","__end__"]]:\n    plan = opus.with_structured_output(Route).invoke(state["messages"])\n    return Command(goto=plan.next, update={"plan": plan.reason})', 'python') },
        { id: 'r', x: 330, y: 60, w: 150, label: 'researcher', sub: 'Sonnet + search', color: 'llm', info: '<p>' + LA.modelBadge('sonnet') + ' עם כלי חיפוש/RAG. נפח בינוני, צריך שיפוט על מקורות.</p>' },
        { id: 'c', x: 330, y: 190, w: 150, label: 'coder', sub: 'Sonnet + python', color: 'llm', info: '<p>' + LA.modelBadge('sonnet') + ' כותב ומריץ קוד ניתוח בסנדבוקס. (למשימות קוד מורכבות מאוד - שקלו Opus.)</p>' },
        { id: 'sm', x: 330, y: 320, w: 150, label: 'summarizer', sub: 'Haiku', color: 'llm', info: '<p>' + LA.modelBadge('haiku') + ' לסיכום וניסוח תבניתי: משימה קלה, נפח גבוה.</p>' },
        { id: 'end', x: 90, y: 190, w: 70, h: 70, shape: 'circle', label: 'END', color: 'ext', info: '<p>כשה-Supervisor מחליט שהמשימה הושלמה.</p>' }
      ],
      edges: [
        { from: 'u', to: 'sup' }, { from: 'sup', to: 'r', color: 'ctrl' }, { from: 'sup', to: 'c', color: 'ctrl' }, { from: 'sup', to: 'sm', color: 'ctrl' },
        { from: 'r', to: 'sup', dashed: true, bend: 30 }, { from: 'sm', to: 'end', label: 'סיום', color: 'ok' }
      ]
    };
  }

  /* ------------------------------------------------------------------ */
  /* Code                                                                */
  /* ------------------------------------------------------------------ */
  const CODE_GRAPH = `
import operator
from typing import Annotated, Literal, Optional, TypedDict
from pydantic import BaseModel
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import AIMessage, AnyMessage, HumanMessage
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import interrupt, RetryPolicy

# ---- בחירת מודל לפי מורכבות הצומת ----
haiku  = ChatAnthropic(model="claude-haiku-5-5",  max_tokens=300)    # סיווג / ניתוב
sonnet = ChatAnthropic(model="claude-sonnet-5-5", max_tokens=1000)   # החלטה / ניסוח
# opus   = ChatAnthropic(model="claude-opus-5-5")                    # רק למתכנן ב-multi-agent

# ---- State: הסכימה המשותפת + reducers ----
class State(TypedDict, total=False):
    messages: Annotated[list[AnyMessage], add_messages]   # reducer: מוסיף/מעדכן לפי id
    notes:    Annotated[list[str], operator.add]          # reducer: שרשור (צמתים מקבילים)
    intent: str
    order_id: Optional[str]
    attempts: int          # בלי reducer: דריסה
    order: dict
    policy: str
    decision: dict
    approved: bool

class Intake(BaseModel):
    intent: Literal["refund", "other"]
    order_id: Optional[str] = None

class Decision(BaseModel):
    approve: bool
    amount: float
    reason: str

# ---- צמתים: state בכניסה -> עדכון חלקי ----
def classify(state: State):
    out = haiku.with_structured_output(Intake).invoke(state["messages"])
    return {"intent": out.intent, "order_id": out.order_id,
            "attempts": state.get("attempts", 0) + 1}

def request_info(state: State):
    answer = interrupt({"question": "מה מספר ההזמנה?"})      # עוצר ומחכה ללקוח
    return {"messages": [HumanMessage(answer)]}

def lookup_order(state: State):
    order = orders_api.get(state["order_id"])                  # קריאת רשת - ייתכן כשל
    return {"order": order, "notes": [f"order {state['order_id']} found"]}

def fetch_policy(state: State):
    docs = policy_retriever.invoke("מדיניות החזרים")
    return {"policy": "\\n".join(d.page_content for d in docs), "notes": ["policy fetched"]}

def decide(state: State):
    d = sonnet.with_structured_output(Decision).invoke(
        f"הזמנה: {state['order']}\\nמדיניות: {state['policy']}\\nהחלט על החזר.")
    return {"decision": d.model_dump()}

def human_approval(state: State):
    ok = interrupt({"action": "refund", "amount": state["decision"]["amount"],
                    "order_id": state["order_id"]})            # True / False מהמנהל
    return {"approved": bool(ok)}

def respond(state: State):
    msg = sonnet.invoke([("system", "נסח תשובה קצרה וחמה בעברית ללקוח."),
                         ("human", f"מצב: {state}")])
    return {"messages": [msg]}

# ---- Conditional edges: פונקציות ניתוב קוראות state ומחזירות יעד/ים ----
def route_after_classify(state: State):
    if state["intent"] != "refund":
        return "respond"
    if not state.get("order_id"):
        return "request_info" if state["attempts"] < 3 else "respond"   # הגנה מלולאה אינסופית
    return ["lookup_order", "fetch_policy"]                     # fan-out: ירוצו במקביל

def route_after_decide(state: State):
    d = state["decision"]
    return "human_approval" if d["approve"] and d["amount"] > 500 else "respond"

# ---- בניית הגרף ----
b = StateGraph(State)
b.add_node("classify", classify)
b.add_node("request_info", request_info)
b.add_node("lookup_order", lookup_order, retry_policy=RetryPolicy(max_attempts=3))
b.add_node("fetch_policy", fetch_policy)
b.add_node("decide", decide)
b.add_node("human_approval", human_approval)
b.add_node("respond", respond)

b.add_edge(START, "classify")
b.add_conditional_edges("classify", route_after_classify,
                        ["request_info", "lookup_order", "fetch_policy", "respond"])
b.add_edge("request_info", "classify")                            # המחזור
b.add_edge(["lookup_order", "fetch_policy"], "decide")            # join: מחכה לשניהם
b.add_conditional_edges("decide", route_after_decide, ["human_approval", "respond"])
b.add_edge("human_approval", "respond")
b.add_edge("respond", END)

graph = b.compile(checkpointer=InMemorySaver())   # בפרודקשן: SqliteSaver / PostgresSaver
`;

  const CODE_RUN = `
from langgraph.types import Command

cfg = {"configurable": {"thread_id": "refund-7731"}, "recursion_limit": 25}

# 1) הרצה ראשונה: נעצרת ב-interrupt (החזר > 500 ₪)
res = graph.invoke({"messages": [("human", "ההזמנה A-2002 הגיעה פגומה, מגיע לי החזר")]}, cfg)
print(res["__interrupt__"])      # [Interrupt(value={'action': 'refund', 'amount': 870.0, ...})]

# 2) המנהל מאשר (אפשר שעות/ימים אחר כך, גם מתהליך אחר, כי ה-state בצ'קפוינט)
final = graph.invoke(Command(resume=True), cfg)

# 3) streaming: עדכון אחרי כל צומת + tokens של ה-LLM
for mode, chunk in graph.stream({"messages": [...]}, cfg, stream_mode=["updates", "messages"]):
    ...

# 4) time-travel: לראות היסטוריה, ולהמשיך מנקודה קודמת (fork)
history = list(graph.get_state_history(cfg))        # מהחדש לישן
before_decide = next(s for s in history if s.next == ("decide",))
graph.invoke(None, before_decide.config)             # ריצה מחדש מאותה נקודה
`;

  const CODE_REACT = `
from langgraph.prebuilt import ToolNode, tools_condition

llm_tools = sonnet.bind_tools(tools)

def agent(state: MessagesState):
    return {"messages": [llm_tools.invoke(state["messages"])]}

b = StateGraph(MessagesState)
b.add_node("agent", agent)
b.add_node("tools", ToolNode(tools))
b.add_edge(START, "agent")
b.add_conditional_edges("agent", tools_condition)   # tool_calls -> "tools", אחרת END
b.add_edge("tools", "agent")                        # המחזור
react = b.compile()
# בפועל: from langchain.agents import create_agent  -> אותו דבר, מוכן + middleware
`;

  /* ------------------------------------------------------------------ */
  /* Execution simulator engine (mini-Pregel, computed)                  */
  /* ------------------------------------------------------------------ */
  const SCEN = {
    small: { name: 'החזר קטן (120 ₪) - אוטומטי', msg: 'אני רוצה החזר על הזמנה A-1001, המטען הגיע שבור', orders: { 'A-1001': { amount: 120, days: 5, item: 'מטען סולארי' } } },
    big: { name: 'החזר גדול (870 ₪) - אישור אנושי', msg: 'ההזמנה A-2002 הגיעה פגומה, מגיע לי החזר מלא', orders: { 'A-2002': { amount: 870, days: 9, item: 'סוללת גיבוי ביתית' } } },
    missing: { name: 'חסר מספר הזמנה - לולאה', msg: 'שלום, אני רוצה החזר כי המוצר לא עובד', followup: 'A-1001', orders: { 'A-1001': { amount: 120, days: 5, item: 'מטען סולארי' } } },
    flaky: { name: 'הכלי נכשל פעם אחת - retry', msg: 'החזר להזמנה A-3003 בבקשה', flaky: true, orders: { 'A-3003': { amount: 240, days: 12, item: 'מצלמת אבטחה' } } },
    late: { name: 'מחוץ למדיניות (47 ימים)', msg: 'רוצה החזר על הזמנה A-4004', orders: { 'A-4004': { amount: 300, days: 47, item: 'מתאם חשמל' } } },
    other: { name: 'שאלה כללית - לא החזר', msg: 'מה שעות הפעילות של מוקד השירות?', orders: {} }
  };
  const KEYS = ['messages', 'intent', 'order_id', 'attempts', 'order', 'policy', 'notes', 'decision', 'approved', 'reply'];
  const REDUCER = { messages: 'add_messages', notes: 'operator.add' };
  const NODE_INFO = {
    classify: { tier: 'haiku', kind: 'llm', reads: ['messages', 'attempts'] },
    request_info: { tier: null, kind: 'interrupt', reads: ['messages'] },
    lookup_order: { tier: null, kind: 'tool', reads: ['order_id'] },
    fetch_policy: { tier: null, kind: 'retriever', reads: ['intent'] },
    decide: { tier: 'sonnet', kind: 'llm', reads: ['order', 'policy'] },
    human_approval: { tier: null, kind: 'interrupt', reads: ['decision', 'order_id'] },
    respond: { tier: 'sonnet', kind: 'llm', reads: ['decision', 'approved', 'intent'] }
  };
  const INTERRUPTING = { request_info: 'input', human_approval: 'approve' };
  const tok = s => Math.max(1, Math.round(String(s).length / 3.5));
  const clone = o => JSON.parse(JSON.stringify(o));

  function runNode(node, st, scn, resume) {
    const humanText = st.messages.filter(m => m.role === 'human').map(m => m.content).join(' ');
    switch (node) {
      case 'classify': {
        const idm = humanText.match(/[A-Z]-\d{4}/g);
        const intent = /החזר|זיכוי|כסף בחזרה/.test(humanText) ? 'refund' : 'other';
        const order_id = idm ? idm[idm.length - 1] : null;
        return { upd: { intent, order_id, attempts: (st.attempts || 0) + 1 }, log: `Haiku → Intake(intent="${intent}", order_id=${order_id ? '"' + order_id + '"' : 'None'})`, llm: { tier: 'haiku', t: tok(humanText) + 60 } };
      }
      case 'request_info':
        if (resume === undefined) return { interrupt: { kind: 'input', q: 'מה מספר ההזמנה שלך?', def: scn.followup || '' }, log: 'interrupt({"question": "מה מספר ההזמנה?"}) - הגרף נעצר' };
        return { upd: { messages: [{ role: 'human', content: String(resume) }] }, log: 'resume → הלקוח ענה: "' + resume + '"' };
      case 'lookup_order': {
        const o = scn.orders[st.order_id];
        const retry = scn.flaky ? 'ניסיון 1: ConnectionTimeout → RetryPolicy → ניסיון 2: הצליח. ' : '';
        return { upd: { order: o ? Object.assign({ id: st.order_id }, o) : { error: 'not_found' }, notes: [o ? `lookup_order: ${o.amount}₪, לפני ${o.days} ימים` : 'lookup_order: לא נמצאה הזמנה'] }, log: retry + 'קריאת API להזמנה ' + st.order_id };
      }
      case 'fetch_policy':
        return { upd: { policy: 'החזר עד 30 יום; מעל 500 ₪ דורש אישור מנהל', notes: ['fetch_policy: 2 מסמכי מדיניות אוחזרו'] }, log: 'retriever.invoke("מדיניות החזרים") → 2 Documents' };
      case 'decide': {
        const o = st.order || {}; let d;
        if (o.error) d = { approve: false, amount: 0, reason: 'הזמנה לא נמצאה' };
        else if (o.days > 30) d = { approve: false, amount: 0, reason: `חלפו ${o.days} ימים (מגבלה 30)` };
        else d = { approve: true, amount: o.amount, reason: 'בתוך המדיניות' };
        return { upd: { decision: d }, log: `Sonnet → Decision(approve=${d.approve}, amount=${d.amount})`, llm: { tier: 'sonnet', t: tok(JSON.stringify(o) + st.policy) + 120 } };
      }
      case 'human_approval':
        if (resume === undefined) return { interrupt: { kind: 'approve', q: `לאשר החזר של ${st.decision.amount} ₪ להזמנה ${st.order_id}?` }, log: 'interrupt({"action": "refund", ...}) - הגרף נעצר' };
        return { upd: { approved: !!resume }, log: 'resume → ' + (resume ? 'אושר' : 'נדחה') + ' (הצומת הורץ מחדש מההתחלה)' };
      case 'respond': {
        let r;
        if (st.intent !== 'refund') r = 'שלום! מוקד השירות פעיל א׳-ה׳ 8:00-18:00. אפשר לעזור במשהו נוסף?';
        else if (!st.order_id) r = 'לא הצלחנו לזהות הזמנה - מעבירים אותך לנציג אנושי.';
        else if (!st.decision.approve) r = `מצטערים, לא ניתן לאשר החזר: ${st.decision.reason}.`;
        else if (st.decision.amount > 500 && st.approved === false) r = 'מנהל השירות בחן את הבקשה ולא אישר את ההחזר. ניצור קשר עם פרטים.';
        else r = `אישרנו החזר של ${st.decision.amount} ₪ להזמנה ${st.order_id}` + (st.approved ? ' (באישור מנהל).' : '.');
        return { upd: { messages: [{ role: 'ai', content: r }], reply: r }, log: 'Sonnet → AIMessage', llm: { tier: 'sonnet', t: tok(r) + 80 } };
      }
    }
    return { upd: {}, log: '' };
  }
  function routeAfter(node, st) {
    switch (node) {
      case 'classify':
        if (st.intent !== 'refund') return ['respond'];
        if (!st.order_id) return st.attempts >= 3 ? ['respond'] : ['request_info'];
        return ['lookup_order', 'fetch_policy'];
      case 'request_info': return ['classify'];
      case 'lookup_order': case 'fetch_policy': return ['decide'];
      case 'decide': return (st.decision.approve && st.decision.amount > 500) ? ['human_approval'] : ['respond'];
      case 'human_approval': return ['respond'];
      default: return [];
    }
  }
  /* merge partial updates with reducers; throws on conflicting overwrite writes */
  function mergeUpdates(state, updates) {
    const ns = clone(state); const written = {}; let mid = ns.messages.length;
    updates.forEach(({ node, upd }) => {
      Object.keys(upd).forEach(k => {
        if (REDUCER[k] === 'add_messages') upd[k].forEach(m => { ns.messages.push(Object.assign({ id: 'm' + (++mid) }, m)); });
        else if (REDUCER[k] === 'operator.add') ns[k] = (ns[k] || []).concat(upd[k]);
        else { if (written[k]) throw new Error(`InvalidUpdateError: At key '${k}': Can receive only one value per step. Use an Annotated key to handle multiple values.`); ns[k] = upd[k]; }
        written[k] = written[k] || (REDUCER[k] ? 0 : node);
      });
    });
    return ns;
  }
  const fmtVal = (k, v) => {
    if (v === undefined) return '—';
    if (k === 'messages') return v.map(m => `${m.role === 'ai' ? 'ai' : 'human'}: ${m.content}`).join('\n');
    if (k === 'notes') return v.length ? v.map(x => '• ' + x).join('\n') : '[]';
    return typeof v === 'string' ? '"' + v + '"' : JSON.stringify(v);
  };

  function simLab(el) {
    let scenKey = 'small', cps = [], head = 0, seq = 0, busy = false, api = null, error = null;
    const root = h('div', { class: 'lab lg-lab' });
    root.appendChild(h('div', { class: 'lab-h' }, '🧪 סימולטור ביצוע LangGraph - מנוע Pregel מוקטן'));
    root.appendChild(h('p', { class: 'muted' }, 'בחרו תרחיש ולחצו "super-step הבא". בכל צעד: הצמתים הפעילים רצים (במקביל אם יש כמה), העדכונים החלקיים ממוזגים ב-reducers, ונשמר checkpoint. לחצו על checkpoint ישן כדי לחזור אליו (time-travel) ולהמשיך ממנו בענף חדש, למשל לדחות במקום לאשר.'));
    const sel = h('select', { class: 'lg-sel', onchange: () => { scenKey = sel.value; reset(); } }, ...Object.entries(SCEN).map(([k, v]) => h('option', { value: k }, v.name)));
    const msgBox = h('div', { class: 'lg-userbox' });
    const btnNext = h('button', { type: 'button', class: 'btn primary', onclick: () => doStep() }, 'super-step הבא ←');
    const btnRun = h('button', { type: 'button', class: 'btn', onclick: () => runAll() }, '⏩ הרץ עד עצירה');
    const btnReset = h('button', { type: 'button', class: 'btn ghost', onclick: () => reset() }, '⟲ איפוס');
    const ctl = h('div', { class: 'pill-row lg-ctl' }, sel, btnNext, btnRun, btnReset);
    const diagBox = h('div');
    const intBox = h('div', { class: 'lg-int' });
    const counters = h('div', { class: 'lg-counters' });
    const statePanel = h('div', { class: 'lg-state' });
    const cpPanel = h('div', { class: 'lg-cps' });
    const logPanel = h('div', { class: 'lg-log' });
    root.append(h('label', { class: 'lg-lbl' }, 'תרחיש קלט: '), ctl, msgBox, diagBox, intBox, counters,
      h('div', { class: 'grid2 lg-cols' }, h('div', null, h('h4', null, 'State אחרי הצעד (עם diff)'), statePanel), h('div', null, h('h4', null, 'Checkpoints (לחצו לחזרה בזמן)'), cpPanel)),
      h('h4', null, 'מה קרה בצעד הזה'), logPanel);
    el.appendChild(root);
    api = LA.diagram(diagBox, graphSpec(false), { compact: true });

    const ancestry = () => { const s = new Set(); let c = cps[head]; while (c) { s.add(c.id); c = cps.find(x => x.id === c.parent); } return s; };
    function reset() {
      seq = 0; error = null; const sc = SCEN[scenKey];
      const init = { messages: [{ id: 'm1', role: 'human', content: sc.msg }], attempts: 0, notes: [] };
      cps = [{ id: 'cp' + (seq++), step: -1, parent: null, state: init, next: ['classify'], ran: [], writes: {}, logs: [], diff: {}, label: 'קלט (START)' }]; head = 0;
      msgBox.innerHTML = ''; msgBox.appendChild(h('div', { class: 'lg-bubble' }, h('b', null, '👤 לקוח: '), sc.msg));
      render(); highlightHead();
    }
    function waiting() { const c = cps[head]; return c.next.length === 1 && INTERRUPTING[c.next[0]] ? c.next[0] : null; }
    function highlightHead() { const c = cps[head]; if (api) { api.highlight(c.ran, 'hl'); api.highlight(c.next, 'lg-next'); } }
    async function animate(prevRan, c) {
      const from = prevRan.length ? prevRan : ['START'];
      await Promise.all(c.ran.map(n => Promise.all(from.map(f => api.flowEdge(f, n, 450, 'neuron')))));
      highlightHead();
    }
    function doStep(resume) {
      if (busy) return Promise.resolve(); error = null;
      const base = cps[head]; if (!base.next.length) return Promise.resolve();
      const sc = SCEN[scenKey]; const w = waiting();
      if (w && resume === undefined) { render(); return Promise.resolve(); }
      const updates = [], logs = [], llm = [];
      for (const node of base.next) {
        const r = runNode(node, base.state, sc, resume);
        updates.push({ node, upd: r.upd || {} }); logs.push({ node, log: r.log, upd: r.upd || {}, llm: r.llm });
        if (r.llm) llm.push(r.llm);
      }
      let ns;
      try { ns = mergeUpdates(base.state, updates); } catch (e) { error = e.message; render(); return Promise.resolve(); }
      const diff = {}; KEYS.forEach(k => { if (JSON.stringify(base.state[k]) !== JSON.stringify(ns[k])) diff[k] = { old: base.state[k], nw: ns[k] }; });
      const next = []; base.next.forEach(n => routeAfter(n, ns).forEach(t => { if (!next.includes(t)) next.push(t); }));
      const c = { id: 'cp' + (seq++), step: base.step + 1, parent: base.id, state: ns, next, ran: base.next.slice(), logs, diff, label: base.next.join(' ‖ ') };
      cps.push(c); head = cps.length - 1; render();
      busy = true; const p = animate(base.ran, c).then(() => { busy = false; }); return p;
    }
    async function runAll() {
      while (el.isConnected && !busy && cps[head].next.length && !waiting()) { await doStep(); await LA.sleep(250); }
    }
    function render() {
      const c = cps[head], anc = ancestry(), w = waiting();
      btnNext.disabled = !!w || !c.next.length;
      btnRun.disabled = btnNext.disabled;
      // interrupt box
      intBox.innerHTML = '';
      if (error) intBox.appendChild(h('div', { class: 'lg-err' }, '❌ ' + error));
      if (w) {
        const kind = INTERRUPTING[w];
        const q = kind === 'approve' ? `לאשר החזר של ${c.state.decision.amount} ₪ להזמנה ${c.state.order_id}?` : 'מה מספר ההזמנה שלך?';
        const box = h('div', { class: 'lg-interrupt' }, h('div', { class: 'lg-int-h' }, '⏸️ הגרף עצר ב-interrupt() בצומת ' + w), h('div', null, q),
          h('div', { class: 'muted' }, 'ה-state נשמר ב-checkpoint. כשנמשיך, הצומת ירוץ מחדש מההתחלה וה-interrupt יחזיר את ערך ה-resume.'));
        if (kind === 'approve') box.appendChild(h('div', { class: 'pill-row' }, h('button', { type: 'button', class: 'btn primary', onclick: () => doStep(true) }, '✅ Approve  (Command(resume=True))'), h('button', { type: 'button', class: 'btn', onclick: () => doStep(false) }, '⛔ Reject  (Command(resume=False))')));
        else { const inp = h('input', { type: 'text', class: 'lc-inp lg-inp' }); inp.value = SCEN[scenKey].followup || 'A-1001'; box.appendChild(h('div', { class: 'pill-row' }, inp, h('button', { type: 'button', class: 'btn primary', onclick: () => doStep(inp.value) }, 'שלח (Command(resume=...))'))); }
        intBox.appendChild(box);
      } else if (!c.next.length) intBox.appendChild(h('div', { class: 'lg-done' }, '🏁 הגרף הגיע ל-END. אפשר לחזור ל-checkpoint קודם ולנסות ענף אחר.'));
      // counters
      const cnt = { haiku: 0, sonnet: 0, opus: 0 }; let tokens = 0;
      cps.filter(x => anc.has(x.id)).forEach(x => x.logs.forEach(l => { if (l.llm) { cnt[l.llm.tier]++; tokens += l.llm.t; } }));
      counters.innerHTML = `<span class="pill">super-steps: <b>${Math.max(0, c.step + 1)}</b></span> <span class="pill">קריאות LLM: ${LA.modelBadge('haiku')} ×${cnt.haiku} · ${LA.modelBadge('sonnet')} ×${cnt.sonnet}</span> <span class="pill">tokens (הערכה): ~${tokens}</span> <span class="pill">next: <b class="mono">${c.next.length ? esc(c.next.join(', ')) : 'END'}</b></span>`;
      // state
      statePanel.innerHTML = '';
      KEYS.forEach(k => {
        const v = c.state[k]; const d = c.diff[k];
        const row = h('div', { class: 'lg-row' + (d ? ' chg' : '') + (v === undefined ? ' unset' : '') });
        row.appendChild(h('div', { class: 'lg-k' }, h('code', null, k), REDUCER[k] ? h('span', { class: 'badge acc' }, REDUCER[k]) : null, d ? h('span', { class: 'lg-chg' }, REDUCER[k] ? 'מוזג' : 'נדרס') : null));
        row.appendChild(h('pre', { class: 'lg-v' }, fmtVal(k, v)));
        if (d && !REDUCER[k] && d.old !== undefined) row.appendChild(h('div', { class: 'lg-old' }, 'קודם: ' + fmtVal(k, d.old)));
        if (d && REDUCER[k]) row.appendChild(h('div', { class: 'lg-old' }, '+' + ((d.nw || []).length - (d.old || []).length) + ' פריטים נוספו'));
        statePanel.appendChild(row);
      });
      // checkpoints
      cpPanel.innerHTML = '';
      cps.forEach((x, i) => {
        const isAnc = anc.has(x.id);
        cpPanel.appendChild(h('button', { type: 'button', class: 'lg-cp' + (i === head ? ' on' : '') + (isAnc ? '' : ' off'), onclick: () => { head = i; error = null; render(); highlightHead(); } },
          h('span', { class: 'lg-cp-n' }, x.step < 0 ? 'input' : 'step ' + x.step), h('span', { class: 'lg-cp-l' }, x.step < 0 ? 'קלט' : 'רצו: ' + x.label), h('span', { class: 'muted lg-cp-x' }, isAnc ? (x.next.length ? '→ ' + x.next.join(', ') : 'END') : 'ענף שננטש (fork)')));
      });
      // log
      logPanel.innerHTML = '';
      if (!c.logs.length) logPanel.appendChild(h('div', { class: 'muted' }, 'עוד לא רץ אף צומת. הצעד הראשון יריץ את classify.'));
      if (c.logs.length > 1) logPanel.appendChild(h('div', { class: 'lg-par' }, `⚡ ${c.logs.length} צמתים רצו במקביל באותו super-step - כל אחד על אותו snapshot, והעדכונים מוזגו רק בסוף.`));
      c.logs.forEach(l => {
        const info = NODE_INFO[l.node];
        logPanel.appendChild(h('div', { class: 'lg-node' }, h('div', { class: 'lg-node-h' }, h('b', null, l.node), info.tier ? h('span', { html: LA.modelBadge(info.tier) }) : h('span', { class: 'badge' }, info.kind)),
          h('div', { class: 'muted' }, 'קורא: ' + info.reads.join(', ')), h('div', null, l.log),
          Object.keys(l.upd).length ? h('div', { class: 'out lg-upd' }, 'return ' + JSON.stringify(l.upd)) : null));
      });
    }
    reset();
  }

  /* ------------------------------------------------------------------ */
  /* Reducer lab                                                         */
  /* ------------------------------------------------------------------ */
  function reducerLab(el) {
    const st = { red: 'none', init: 'שלום', a: 'חיפוש הזמנה הושלם', b: 'מדיניות נשלפה', both: true, ia: '5', ib: '9', i0: '3' };
    const root = h('div', { class: 'lab lg-lab' });
    root.appendChild(h('div', { class: 'lab-h' }, '🔀 Reducer Lab - שני צמתים מקבילים כותבים לאותו מפתח'));
    root.appendChild(h('p', { class: 'muted' }, 'בסופר-סטפ אחד רצים node_a ו-node_b במקביל וכל אחד מחזיר עדכון למפתח <code>key</code>. בחרו reducer וראו מה יוצא. לרשימות הכתיבו פריטים מופרדים בפסיק; ב-add_messages אפשר לתת מזהה כך: <code>id1:טקסט</code>.'.replace(/<code>|<\/code>/g, '')));
    const sel = h('select', { class: 'lg-sel', onchange: () => { st.red = sel.value; if (st.red === 'add_messages') { st.init = 'm1:שלום'; st.a = 'm2:חיפוש הזמנה הושלם'; st.b = 'm1:שלום (עודכן)'; } else if (st.red === 'operator.add') { st.init = 'שלום'; st.a = 'a1,a2'; st.b = 'b1'; } else if (['max', 'sum'].includes(st.red)) { st.init = '3'; st.a = '5'; st.b = '9'; } else { st.init = 'שלום'; st.a = 'A'; st.b = 'B'; } sync(); draw(); } },
      ...[['none', 'ללא reducer (ברירת מחדל: LastValue)'], ['operator.add', 'Annotated[list, operator.add]'], ['add_messages', 'Annotated[list, add_messages]'], ['max', 'Annotated[int, max-reducer מותאם]'], ['sum', 'Annotated[int, operator.add]']].map(([v, l]) => h('option', { value: v }, l)));
    const mk = (lab, key) => { const i = h('input', { type: 'text', class: 'lc-inp', oninput: () => { st[key] = i.value; draw(); } }); i.value = st[key]; i._k = key; return h('label', { class: 'lc-var' }, lab, i); };
    const fInit = mk('ערך התחלתי של key', 'init'), fA = mk('node_a מחזיר', 'a'), fB = mk('node_b מחזיר', 'b');
    const both = h('input', { type: 'checkbox', checked: true, onchange: () => { st.both = both.checked; draw(); } });
    const out = h('div');
    function sync() { [fInit, fA, fB].forEach(f => { const i = f.querySelector('input'); i.value = st[i._k]; }); }
    root.append(h('label', { class: 'lg-lbl' }, 'reducer של המפתח: '), sel, h('div', { class: 'lc-vars' }, fInit, fA, fB), h('label', { class: 'lg-lbl' }, both, ' שני הצמתים כותבים (בטל כדי שרק node_a יכתוב)'), out);
    const items = s => s.split(',').map(x => x.trim()).filter(Boolean);
    const msgs = s => items(s).map((x, i) => { const m = /^([\w-]+):(.*)$/.exec(x); return m ? { id: m[1], content: m[2] } : { id: null, content: x }; });
    function draw() {
      out.innerHTML = ''; let result = '', note = '', code = '', bad = false;
      const writers = st.both ? ['a', 'b'] : ['a'];
      if (st.red === 'none') {
        code = 'class State(TypedDict):\n    key: str          # בלי Annotated => LastValue';
        if (writers.length > 1) { bad = true; result = "InvalidUpdateError: At key 'key': Can receive only one value per step. Use an Annotated key to handle multiple values."; note = 'ב-LangGraph, שני צמתים מקבילים שכותבים למפתח בלי reducer זו <b>שגיאה</b> (לא "האחרון מנצח"). המנוע מסרב להחליט עבורכם איזו כתיבה תקפה.'; }
        else { result = JSON.stringify(st.a); note = 'כותב יחיד: הערך פשוט נדרס. זה בסדר כשרק צומת אחד כותב למפתח בכל צעד.'; }
      } else if (st.red === 'operator.add') {
        const r = items(st.init).concat(items(st.a), writers.length > 1 ? items(st.b) : []);
        result = JSON.stringify(r); code = 'notes: Annotated[list[str], operator.add]'; note = 'שרשור רשימות. כל הפריטים נשמרים. הסדר בין עדכוני צמתים מקבילים נקבע ע"י המנוע (דטרמיניסטי אך לא כדאי להסתמך עליו) - אל תקודדו תלות בסדר.';
      } else if (st.red === 'add_messages') {
        const list = msgs(st.init).map((m, i) => ({ id: m.id || 'auto' + (i + 1), content: m.content }));
        let auto = 100; const replaced = [];
        [st.a].concat(writers.length > 1 ? [st.b] : []).forEach(src => msgs(src).forEach(m => {
          const id = m.id || 'auto' + (++auto); const ix = list.findIndex(x => x.id === id);
          if (ix >= 0) { list[ix] = { id, content: m.content }; replaced.push(id); } else list.push({ id, content: m.content });
        }));
        result = JSON.stringify(list, null, 1); code = 'messages: Annotated[list[AnyMessage], add_messages]';
        note = 'מוסיף הודעות חדשות <b>ומחליף</b> הודעה קיימת אם ה-id זהה' + (replaced.length ? ` (כאן הוחלפו: ${replaced.join(', ')})` : '') + '. כך אפשר גם "לתקן" הודעה וגם למחוק עם RemoveMessage. הודעות בלי id מקבלות id אוטומטי.';
      } else {
        const nums = [st.init, st.a].concat(writers.length > 1 ? [st.b] : []).map(Number);
        if (nums.some(isNaN)) { bad = true; result = 'יש להזין מספרים'; }
        else if (st.red === 'max') { result = String(Math.max(...nums)); code = 'def max_reducer(old: int, new: int) -> int:\n    return max(old, new)\n\nscore: Annotated[int, max_reducer]'; note = 'reducer מותאם: כל פונקציה בינארית (old, new) → ערך. מתאים ל"הציון הכי גבוה", איחוד קבוצות, מיזוג dict. חשוב שיהיה אסוציאטיבי ושלא תלוי בסדר.'; }
        else { result = String(nums.reduce((p, c) => p + c, 0)); code = 'count: Annotated[int, operator.add]'; note = 'סכימה של כל התרומות - טוב לספירות (מספר ניסיונות, עלות מצטברת).'; }
      }
      out.appendChild(h('div', { class: 'lg-red-res' + (bad ? ' bad' : '') }, h('div', { class: 'muted' }, 'state["key"] אחרי הצעד:'), h('pre', { class: 'out' }, result)));
      out.appendChild(h('div', { class: 'callout info', html: '<div class="callout-b">' + note + '</div>' }));
      if (code) out.insertAdjacentHTML('beforeend', LA.code(code, 'python', 'state.py'));
    }
    draw(); el.appendChild(root);
  }

  /* ------------------------------------------------------------------ */
  /* Module                                                              */
  /* ------------------------------------------------------------------ */
  LA.register({
    id: 'langgraph', order: 50, group: 'build', icon: '🕸️', short: 'LangGraph', title: 'LangGraph — גרפים של מצבים לסוכנים אמינים',
    render(main) {
      LA.page(main, {
        icon: '🕸️', title: 'LangGraph — גרפים של מצבים לסוכנים אמינים',
        subtitle: 'במקום שרשרת ליניארית: <b>גרף</b> עם state משותף, לולאות, הסתעפויות, checkpoints ואישור אנושי. התשתית שעליה בנויים סוכנים אמינים.',
        sections: [
          {
            id: 'intro', title: 'בשורה אחת + אנלוגיה',
            html: `<p><b>LangGraph</b> היא ספריית ארקסטרציה ל-workflows עם LLM, שמגדירה תוכנית כ<b>גרף מכוון</b>: <b>צמתים</b> (פונקציות), <b>קשתות</b> (מי רץ אחרי מי), ו-<b>state</b> משותף ומוגדר בסכימה. היא <b>לא</b> מחליפה את LangChain - היא משלימה אותה: אפשר להשתמש ברכיבי LangChain בתוך הצמתים.</p>
            ${LA.callout('analogy', 'שרשרת LCEL היא <b>מסלול ליניארי בפס ייצור</b>. LangGraph היא <b>מפת מטרו</b> עם צמתי מעבר: אפשר להסתעף, לחזור לתחנה קודמת, לחכות שמישהו יאשר, ולהמשיך מאותה תחנה גם אחרי שהמערכת כובתה. ה"כרטיס" שמלווה את הנוסע הוא ה-state.')}
            ${LA.callout('example', 'הדוגמה לאורך המודול: <b>סוכן בקשות החזר</b> לחנות. ' + LA.modelBadge('haiku') + ' מסווג ומחלץ מספר הזמנה, כלי שולף הזמנה ו-retriever שולף מדיניות <b>במקביל</b>, ' + LA.modelBadge('sonnet') + ' מחליט ומנסח, ומעל 500 ₪ הגרף <b>עוצר</b> לאישור מנהל. חסר מספר הזמנה? <b>לולאה</b> חזרה לשאלת הלקוח.')}`
          },
          {
            id: 'why', title: 'למה גרפים? שרשרת מול סוכן מול גרף', render(el) {
              el.insertAdjacentHTML('beforeend', `<p>שרשרת (DAG ליניארי) מספיקה כשהצעדים ידועים מראש. סוכנים אמיתיים דורשים דברים שבשרשרת קשה לבטא:</p>` + LA.list([
                '<b>לולאות</b>: לנסות שוב, לשאול הבהרה, לתקן לפי ביקורת - עד תנאי עצירה.',
                '<b>הסתעפות</b> לפי תוכן (conditional edges): ניתוב לפי הסיווג, הסכום, רמת הביטחון.',
                '<b>state מפורש</b>: במקום "הכל בתוך הפרומפט", מפתחות מוגדרים עם טיפוס ו-reducer.',
                '<b>עמידות (persistence)</b>: checkpoint אחרי כל צעד - המשך אחרי קריסה, שיחות ארוכות, time-travel.',
                '<b>אדם בלולאה</b>: <code>interrupt()</code> עוצר ומחכה לאישור/עריכה, בלי לתפוס thread או לאבד הקשר.',
                '<b>מקביליות</b>: צמתים עצמאיים רצים יחד, והתוצאות ממוזגות בצורה מוגדרת.'
              ]));
              el.insertAdjacentHTML('beforeend', '<h4>השוואה: איזה כלי למה?</h4>' + LA.table(['', 'LangChain chain (LCEL)', 'LangChain create_agent', 'LangGraph', 'SDK + לולאה ידנית'], [
                ['זרימה', 'ליניארית קבועה', 'לולאת מודל↔כלים', 'גרף חופשי: לולאות, הסתעפות, מקביליות', 'while + if (אתם כותבים)'],
                ['State', 'dict עובר בצינור', 'messages (+ שדות מותאמים)', 'סכימה מלאה + reducers', 'משתנים בקוד'],
                ['Persistence / resume', 'אין', 'דרך checkpointer (כי בנוי על LangGraph)', 'מובנה: threads, time-travel', 'בונים לבד (DB, סריאליזציה)'],
                ['אדם בלולאה', 'אין', 'middleware לאישור כלים', 'interrupt() בכל צומת', 'בונים לבד'],
                ['מורכבות', 'נמוכה', 'נמוכה', 'בינונית-גבוהה', 'נמוכה בהתחלה, גדלה מהר'],
                ['דיבוג', 'trace ליניארי', 'trace של לולאה', 'trace לפי super-step, state בכל צעד', 'הדפסות ו-logs שלכם'],
                ['מתאים כש...', 'צינור קבוע (סיווג→ניסוח, RAG)', 'סוכן עם כלים, מבנה סטנדרטי', 'תהליך עסקי עם מצב, אישורים, multi-agent', 'סוכן קטן, שליטה מלאה, אפס תלויות']
              ]));
              el.insertAdjacentHTML('beforeend', LA.callout('tip', 'כלל אצבע: התחילו מהפשוט ביותר שעובד. קריאה בודדת → SDK. צינור קבוע → LCEL. סוכן סטנדרטי עם כלים → <code>create_agent</code>. צריכים מחזורים מותאמים, אישור אנושי, שחזור או כמה סוכנים → LangGraph.'));
            }
          },
          {
            id: 'concepts', title: 'מושגי הליבה', render(el) {
              LA.tabs(el, [
                { label: '🗃️ State + Reducers', html: `<p>ה-state הוא <code>TypedDict</code> (או Pydantic/dataclass). לכל מפתח אפשר להצמיד <b>reducer</b> באמצעות <code>Annotated</code>: פונקציה שמגדירה <b>איך לשלב</b> עדכון חדש עם הערך הקיים. בלי reducer - הערך החדש דורס.</p>${LA.code(`class State(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]  # מצרף / מעדכן לפי id
    notes: Annotated[list[str], operator.add]            # משרשר
    attempts: int                                        # דורס`, 'python')}${LA.callout('algo', 'ה-reducer הוא נקודת התורפה של מקביליות: בלי reducer, שני צמתים מקבילים שכותבים לאותו מפתח מקבלים <code>InvalidUpdateError</code>. נסו במעבדה 2.')}` },
                { label: '🔵 צמתים (Nodes)', html: `<p>צומת הוא <b>פונקציה</b> <code>(state) -> partial_update</code> (או async). היא יכולה לקרוא ל-LLM, לכלי, לשרשרת LCEL או לגרף משנה. מחזירה רק את מה שמשתנה. אפשר להוסיף לצומת <code>retry_policy</code>, <code>cache_policy</code> ו-metadata.</p>${LA.code(`def classify(state: State):
    out = haiku.with_structured_output(Intake).invoke(state["messages"])
    return {"intent": out.intent, "attempts": state.get("attempts", 0) + 1}

builder.add_node("classify", classify)
builder.add_node("lookup_order", lookup_order, retry_policy=RetryPolicy(max_attempts=3))`, 'python')}<p><b>ניתוב מודלים לפי צומת</b> הוא אחד היתרונות: כל צומת בוחר מודל משלו לפי מורכבות - ${LA.modelBadge('haiku')} לסיווג וניתוב, ${LA.modelBadge('sonnet')} להחלטה וניסוח, ${LA.modelBadge('opus')} למתכנן.</p>` },
                { label: '➡️ קשתות + Conditional', html: `<p><code>add_edge(a, b)</code>: אחרי a תמיד b. <code>add_conditional_edges(a, router)</code>: פונקציית ניתוב קוראת את ה-state ומחזירה את שם הצומת הבא (או רשימה = fan-out מקבילי, או <code>END</code>). אפשר גם לנתב מתוך הצומת עצמו עם <code>Command(goto=..., update=...)</code>.</p>${LA.code(`def route(state) -> Literal["human_approval", "respond"]:
    d = state["decision"]
    return "human_approval" if d["approve"] and d["amount"] > 500 else "respond"

builder.add_conditional_edges("decide", route, ["human_approval", "respond"])

# או: צומת שמחליט וגם מעדכן
def decide(state) -> Command[Literal["human_approval", "respond"]]:
    ...
    return Command(update={"decision": d}, goto="human_approval")`, 'python')}${LA.callout('tip', 'פונקציית ניתוב צריכה להיות <b>דטרמיניסטית וזולה</b> (כללים על ה-state). אם הניתוב דורש LLM - הפכו אותו לצומת נפרד (Haiku) שכותב את ההחלטה ל-state, ובדקו אותו ב-eval.')}` },
                { label: '🔁 מחזורים + גבולות', html: `<p>מחזור = edge שחוזר לצומת קודם (ReAct, "נסה שוב", "שאל הבהרה"). הסכנה: לולאה אינסופית ועלות שמתפוצצת. ההגנות:</p>${LA.list(['<code>recursion_limit</code> ב-config: מקסימום super-steps לריצה; חריגה זורקת <code>GraphRecursionError</code> (הערך ברירת-המחדל משתנה בין גרסאות - הגדירו במפורש).', 'מונה ב-state (<code>attempts</code>) ותנאי יציאה בפונקציית הניתוב (כמו בדוגמה: אחרי 3 ניסיונות - העברה לנציג).', 'תקרת tokens/עלות לריצה, ו-timeout חיצוני.'])}${LA.code(`graph.invoke(inp, {"recursion_limit": 25, "configurable": {"thread_id": "t1"}})`, 'python')}` },
                { label: '💾 Checkpointer + Threads + Time-travel', html: `<p>קומפילציה עם <code>checkpointer</code> שומרת snapshot של ה-state אחרי כל super-step. <b>thread_id</b> מזהה "שיחה/ריצה": אותו thread ממשיך מהמצב האחרון. מכאן: זיכרון שיחה, resume אחרי קריסה, ו-time-travel.</p>${LA.table(['Checkpointer', 'שימוש'], [['<code>InMemorySaver</code>', 'פיתוח ובדיקות; נעלם בהפעלה מחדש'], ['<code>SqliteSaver</code> (langgraph-checkpoint-sqlite)', 'אפליקציה מקומית / שרת בודד'], ['<code>PostgresSaver</code> (langgraph-checkpoint-postgres)', 'פרודקשן מבוזר, מספר workers']])}${LA.code(`graph.get_state(cfg)                 # State נוכחי + next + metadata
list(graph.get_state_history(cfg))   # כל ה-checkpoints, מהחדש לישן
graph.update_state(cfg, {"approved": True})   # עריכת state = checkpoint חדש (fork)
graph.invoke(None, old_checkpoint.config)     # המשך מנקודה ישנה`, 'python')}${LA.callout('warn', 'ה-state נשמר ב-DB - כולל PII. הצפינו/הגבילו גישה, והגדירו מדיניות retention. וגם: שינוי סכימת ה-State בין גרסאות הופך checkpoints ישנים לבעיית מיגרציה.')}` },
                { label: '⏸️ interrupt() - אדם בלולאה', html: `<p><code>interrupt(value)</code> בתוך צומת <b>עוצר</b> את הריצה, שומר checkpoint, ומחזיר ללקוח את <code>value</code>. ההמשך: <code>graph.invoke(Command(resume=answer), cfg)</code> - ו-<code>interrupt()</code> מחזיר את <code>answer</code>. נדרש checkpointer.</p>${LA.code(`def human_approval(state):
    ok = interrupt({"action": "refund", "amount": state["decision"]["amount"]})
    return {"approved": bool(ok)}`, 'python')}${LA.callout('warn', 'אחרי resume הצומת <b>רץ מחדש מההתחלה</b>. כל קוד לפני ה-<code>interrupt()</code> חייב להיות idempotent (בלי תופעות לוואי כמו שליחת מייל או חיוב) - או שיועבר לצומת נפרד אחרי האישור.')}` },
                { label: '📡 Streaming', html: `<p>ארבעה מצבי stream עיקריים:</p>${LA.table(['mode', 'מה מקבלים', 'שימוש'], [['<code>values</code>', 'ה-state המלא אחרי כל צעד', 'דיבוג, מעקב מצב'], ['<code>updates</code>', 'רק העדכון החלקי של כל צומת', 'התקדמות ("שלב 2/5 הושלם")'], ['<code>messages</code>', 'tokens של ה-LLM תוך כדי יצירה', 'UI של צ\'אט'], ['<code>custom</code>', 'אירועים שהצומת שולח בעצמו', 'progress bar מותאם']])}${LA.code(`for mode, chunk in graph.stream(inp, cfg, stream_mode=["updates", "messages"]):
    if mode == "messages": print(chunk[0].content, end="")   # token
    else: print("צומת הסתיים:", list(chunk))`, 'python')}` },
                { label: '🧩 Subgraphs', html: `<p>גרף מקומפל יכול לשמש <b>צומת</b> בגרף אחר. מתאים לפירוק מערכת גדולה למודולים עם סכמת state פנימית משלהם (ובדיקות עצמאיות), ולצוותים שעובדים במקביל. אם הסכמות חולקות מפתחות - אפשר לחבר ישירות; אחרת עוטפים בפונקציה שמתרגמת state.</p>${LA.code(`research_graph = research_builder.compile()
parent.add_node("research", research_graph)       # סכימה משותפת

def call_billing(state: Parent):                  # סכימות שונות: מתרגמים
    out = billing_graph.invoke({"query": state["question"]})
    return {"answer": out["result"]}`, 'python')}` },
                { label: '👥 Multi-agent', render(box) {
                  box.insertAdjacentHTML('beforeend', `<p>כמה סוכנים מתמחים, כל אחד גרף/צומת עם כלים ומודל משלו. תבניות נפוצות:</p>` + LA.table(['תבנית', 'איך עובד', 'יתרון', 'סיכון'], [
                    ['Supervisor', 'מפקח מרכזי בוחר את הסוכן הבא ומחליט מתי סיימנו', 'שליטה וצפיות; קל לדבג', 'צוואר בקבוק; עלות מודל חזק על כל סיבוב'],
                    ['Swarm / Handoffs', 'כל סוכן מחליט למי להעביר (Command goto)', 'גמיש, פחות קריאות מרכזיות', 'קשה לנבא, לולאות העברה'],
                    ['Hierarchical', 'מפקחים של מפקחים (צוותים)', 'מתרחב למשימות גדולות', 'מורכבות וזמן תגובה'],
                    ['Network', 'כל סוכן יכול לדבר עם כל סוכן', 'מקסימום חופש', 'כמעט בלתי אפשרי לדבג']
                  ]));
                  LA.diagram(box, multiSpec());
                  box.insertAdjacentHTML('beforeend', LA.callout('tip', 'ניתוב מודלים: Opus רק בצומת שמחליט (מעט קריאות, החלטות יקרות לטעות), Sonnet לעובדים עם כלים, Haiku לסיכום/סיווג בנפח. זה חוסך עלות משמעותית לעומת Opus בכל מקום - אבל אמתו שהעובדים הקטנים לא פוגעים באיכות הסופית.'));
                } },
                { label: '⚙️ Pregel / Super-step', html: `<p>המנוע בנוי על מודל <b>Pregel</b> (Bulk Synchronous Parallel): ריצה מחולקת ל-<b>super-steps</b>. בכל אחד: <b>Plan</b> (מי פעיל), <b>Execution</b> (הפעילים רצים במקביל על snapshot זהה), <b>Update</b> (העדכונים ממוזגים ב-reducers). צמתים בצעד לא רואים עדכונים זה של זה - לכן אין race conditions, ולכן reducers הכרחיים. כל super-step מייצר checkpoint אחד.</p>${LA.callout('info', 'שימו לב לדיוק: "צעד" מוגדר לפי <b>מרחק בגרף</b>, לא לפי זמן. אם שני צמתים מקבילים ואחד לוקח 10 שניות, הצעד הבא מחכה לשניהם (barrier).')}` },
                { label: '🛡️ Retries + שגיאות', html: `<p>שלוש שכבות: (1) <code>RetryPolicy</code> לצומת - ניסיונות חוזרים עם backoff לחריגות זמניות (רשת, 429). (2) <code>max_retries</code> של הלקוח של המודל. (3) טיפול עסקי בגרף: ענף "כשל" עם fallback (מודל חזק יותר, נציג אנושי). ריצה שנקטעה באמצע ממשיכה מה-checkpoint האחרון - מה שכבר הושלם בצעדים קודמים לא יורץ מחדש.</p>${LA.code(`builder.add_node("lookup_order", lookup_order,
    retry_policy=RetryPolicy(max_attempts=3, initial_interval=0.5, backoff_factor=2.0))`, 'python')}${LA.callout('warn', 'Retry מריץ את הצומת שוב: ודאו idempotency לצמתים עם תופעות לוואי (חיוב, שליחת מייל) - מפתח idempotency או הפרדה לצומת נפרד.')}` }
              ]);
            }
          },
          {
            id: 'dive', title: 'צלילה פנימה — מאפליקציה ועד צומת בודד', render(el) {
              el.insertAdjacentHTML('beforeend', '<p>ארבע רמות: <b>אפליקציה</b> → <b>גרף מקומפל</b> (צמתים וקשתות) → <b>super-step</b> → <b>פונקציית צומת בודדת</b>. לחצו על Compiled graph ← "צלול פנימה", אחר כך על classify, ואז על "הרצת צמתים".</p>');
              LA.diagram(el, appSpec());
              el.insertAdjacentHTML('beforeend', '<h4>סוכן ReAct כגרף - המחזור הבסיסי</h4>');
              LA.diagram(el, reactSpec());
              el.insertAdjacentHTML('beforeend', LA.code(CODE_REACT, 'python', 'react_graph.py'));
            }
          },
          {
            id: 'example', title: 'דוגמה מוחשית — סוכן בקשות החזר (קוד מלא)', render(el) {
              el.insertAdjacentHTML('beforeend', '<p><b>ניתוב מודלים לפי צומת</b> - הטבלה מסבירה את ההחלטה:</p>' + LA.table(['צומת', 'סוג', 'מודל', 'נימוק'], [
                ['classify', 'LLM + structured', LA.modelBadge('haiku'), 'חילוץ intent ומספר הזמנה: צר, מהיר, נפח גבוה'],
                ['lookup_order', 'Tool (API)', '—', 'אין LLM; דטרמיניסטי, עם RetryPolicy'],
                ['fetch_policy', 'Retriever', '—', 'embedding + חיפוש דמיון; ללא מודל שפה'],
                ['decide', 'LLM + structured', LA.modelBadge('sonnet'), 'שקלול הזמנה מול מדיניות - דורש שיפוט'],
                ['human_approval', 'interrupt', '—', 'אדם מחליט כשיש סיכון כספי'],
                ['respond', 'LLM', LA.modelBadge('sonnet'), 'ניסוח בעברית וטון; (Haiku לתבניתי)'],
                ['(אופציונלי) planner', 'LLM', LA.modelBadge('opus'), 'רק אם מוסיפים מפקח/מתכנן לתיקים מורכבים ומרובי-מסמכים']
              ]));
              el.insertAdjacentHTML('beforeend', LA.code(CODE_GRAPH, 'python', 'refund_graph.py'));
              el.insertAdjacentHTML('beforeend', '<h4>הרצה, resume, streaming ו-time-travel</h4>' + LA.code(CODE_RUN, 'python', 'run.py'));
              el.insertAdjacentHTML('beforeend', LA.callout('info', 'הסימולטור שבמעבדה 1 מריץ <b>בדיוק את הגרף הזה</b> במנוע Pregel מוקטן ב-JavaScript: אותם צמתים, אותם ניתובים, אותם reducers (<code>add_messages</code> ו-<code>operator.add</code>), אותם interrupts. מודלי השפה מדומים בכללים דטרמיניסטיים.'));
            }
          },
          { id: 'lab1', title: 'מעבדה 1 — סימולטור ביצוע גרף', render: simLab },
          { id: 'lab2', title: 'מעבדה 2 — Reducers', render: reducerLab },
          {
            id: 'llm', title: 'הקשר ל-LLM',
            html: LA.callout('llm', `ב-LangGraph ה-LLM הוא <b>רכיב בתוך צומת</b>, לא המנצח של התהליך: <b>הקוד</b> (הגרף) קובע את הזרימה והגבולות, וה-LLM מחליט בתוך נקודות מוגדרות (סיווג, החלטה, ניסוח, בחירת כלי). זה ההבדל בין "סוכן חופשי" ל"workflow עם LLM": ככל שהמשימה צפויה יותר, כדאי יותר מבנה בגרף ופחות חופש למודל.<br><br>כל צומת בוחר מודל לפי מורכבות: ${LA.modelBadge('haiku')} לצמתי ניתוב וסיווג (נפח, latency), ${LA.modelBadge('sonnet')} לצמתי עבודה (החלטה, כתיבה, קוד), ${LA.modelBadge('opus')} למתכנן/מפקח (מעט קריאות, החלטות כבדות). ה-state הוא "הזיכרון" ש-LLM לא מחזיק לבד: מה שלא נכנס להודעות בקריאה - המודל לא יודע. ולכן מה שמכניסים מה-state אל הפרומפט (וגודלו) הוא החלטת עיצוב מרכזית.`)
          },
          {
            id: 'profile', title: 'דרישות · חוזקות · חולשות', html: LA.profile({
              requirements: ['Python 3.10+ (או JS), חבילות: <code>langgraph</code>, <code>langchain-anthropic</code>, checkpointer לפרודקשן', 'הגדרת State מפורשת (סכימה + reducers) לפני שכותבים צמתים', 'תשתית persistence (Postgres/SQLite) אם צריך resume ו-interrupts', 'מדיניות הרשאות לכלים ולאישור אנושי', 'LangSmith או tracing אחר - חובה כמעט בכל גרף לא טריוויאלי'],
              strengths: ['שליטה מלאה בזרימה: לולאות, הסתעפויות, מקביליות', 'עמידות: checkpoints, resume, time-travel, זיכרון שיחה', 'human-in-the-loop כאזרח מהשורה הראשונה', 'streaming מכמה סוגים', 'ניתוב מודלים לכל צומת בנפרד (עלות/latency)', 'מודולריות: subgraphs ובדיקות לצומת בודד', 'אינטגרציה עם LangChain ו-LangSmith'],
              weaknesses: ['עקומת למידה: מושגים (reducers, super-steps, checkpointer)', 'boilerplate יחסית לסקריפט פשוט', 'דיבוג ריצות מקביליות ומחזורים דורש כלי נראות', 'ריצה מחדש של צומת אחרי interrupt/retry: קשה לעשות idempotency נכון', 'מיגרציית סכמת State בין גרסאות כשיש checkpoints ישנים', 'קל לבנות גרף מורכב מדי בעוד לולאה של 30 שורות הייתה מספיקה'],
              algoTips: ['הגדירו eval ברמת <b>מסלול</b> (trajectory): האם עבר בצמתים הנכונים, בסדר הנכון, וכמה צעדים - לא רק האם התשובה הסופית טובה', 'מדדו לכל צומת: דיוק, latency, tokens, שיעור retries; אתרו את הצומת היקר', 'תקרות: <code>recursion_limit</code>, מונה ניסיונות, תקציב tokens, timeout', 'שמרו ב-State רק מה שנחוץ (גודל state = גודל checkpoint = עלות אחסון והקשר)', 'אל תשלחו את כל ה-messages לכל צומת: חתכו/סכמו לפי צורך הצומת'],
              whenToUse: ['כן: תהליך עסקי עם מצב, אישורים, וכשלים שצריך להתאושש מהם', 'כן: multi-agent עם ניתוב מודלים', 'כן: שיחות ארוכות / סוכנים שרצים זמן רב', 'לא: צינור ליניארי פשוט (LCEL) או קריאה בודדת (SDK)', 'לא: אב-טיפוס חד-פעמי שלא יגיע לפרודקשן']
            })
          },
          {
            id: 'algo', title: 'עין של אלגוריתמאי', render(el) {
              el.insertAdjacentHTML('beforeend', LA.callout('algo', 'רשימת בדיקה לגרף שעולה לפרודקשן:') + LA.list([
                '<b>Trajectory eval</b>: dataset של תרחישים (כולל קצה: חסר מזהה, כלי נכשל, מחוץ למדיניות, ניסיון הנחיה זדוני) עם המסלול והתוצאה הצפויים. הריצו בכל שינוי prompt/מודל/גרף.',
                '<b>עלות ו-latency</b>: ספרו קריאות LLM לריצה לפי tier; בדקו שה-Haiku באמת מחזיק את הסיווג (confusion matrix) לפני שמורידים מ-Sonnet.',
                '<b>לולאות אינסופיות</b>: recursion_limit + מונה ב-state + תקציב; בדקו במכוון תרחיש שנתקע.',
                '<b>Idempotency</b>: צמתים עם תופעות לוואי חייבים לשרוד retry ו-resume (שמות פעולה ייחודיים, בדיקת "כבר בוצע").',
                '<b>Prompt injection</b>: תוכן הלקוח/מסמכים לא מהימן. כלים מסוכנים (החזר כספי, מחיקה) מאחורי interrupt וכללי קוד - לא רק "הוראות בפרומפט".',
                '<b>Reducers</b>: בדקו מפתחות שנכתבים במקביל; הימנעו מתלות בסדר מיזוג; ודאו ש-<code>add_messages</code> לא גורם לגידול הקשר ללא גבול.',
                '<b>Persistence</b>: PII ב-checkpoints, retention, הצפנה, ותוכנית מיגרציה לשינוי סכמה.',
                '<b>שחזוריות</b>: נעלו מזהי מודל מדויקים ו-version לגרף; שמרו thread_id ו-checkpoint_id בלוגים כדי לשחזר תקלה (time-travel לתוך ה-bug).',
                '<b>נראות</b>: trace לכל ריצה עם תגיות (גרסת גרף, tenant), התראות על שיעור interrupts שלא טופלו ועל ריצות שחצו 80% מתקרת הצעדים.'
              ]));
            }
          },
          {
            id: 'quiz', title: 'בוחן', render(el) {
              LA.quiz(el, [
                { q: 'מה קורה כששני צמתים מקבילים באותו super-step כותבים למפתח state <b>בלי</b> reducer?', options: ['האחרון מנצח', 'הראשון מנצח', 'InvalidUpdateError - צריך reducer כדי להגדיר איך לשלב', 'LangGraph מריץ אותם ברצף'], answer: 2, explain: 'המנוע מסרב לנחש. הגדירו Annotated עם reducer (operator.add, add_messages או פונקציה מותאמת). נסו במעבדה 2.' },
                { q: 'מה ההבדל המרכזי בין LCEL chain ל-LangGraph?', options: ['LangGraph מהירה יותר', 'LCEL לא תומכת ב-LLM', 'LangGraph מוסיפה state מפורש, לולאות/הסתעפויות, checkpoints ו-interrupt; chain היא צינור ליניארי', 'אין הבדל, רק שם'], answer: 2, explain: 'מתחילים מ-LCEL לצינורות קבועים; עוברים ל-LangGraph כשצריך בקרת זרימה ועמידות.' },
                { q: 'מה נדרש כדי ש-<code>interrupt()</code> יעבוד?', options: ['מודל Opus', 'checkpointer ו-thread_id, כדי לשמור את המצב ולהמשיך אחר כך', 'subgraph', 'stream_mode="values"'], answer: 1, explain: 'interrupt שומר checkpoint וממשיך ב-Command(resume=...) על אותו thread. בלי checkpointer אין היכן לשמור.' },
                { q: 'אחרי resume מ-interrupt, מה קורה לקוד שלפני ה-<code>interrupt()</code> באותו צומת?', options: ['לא רץ שוב', 'רץ מחדש מההתחלה - ולכן חייב להיות idempotent', 'נשמר במטמון', 'נמחק מהגרף'], answer: 1, explain: 'הצומת מתחיל מחדש ו-interrupt מחזיר את ערך ה-resume. תופעות לוואי לפני interrupt - סכנה.' },
                { q: 'בגרף ההחזרים, איזה מודל הכי הגיוני לצומת <code>classify</code> ולמה?', options: ['Opus - כי סיווג קשה', 'Haiku - משימה צרה בנפח גבוה, latency ועלות נמוכים', 'Sonnet תמיד', 'בלי מודל, רק regex'], answer: 1, explain: 'סיווג/חילוץ בסכימה קבועה הוא התחום של Haiku. מאמתים ב-eval, ושומרים Sonnet לשיפוט ו-Opus למתכנן.' },
                { q: 'מה הם "צמתים באותו super-step"?', options: ['צמתים שמחוברים ב-edge ישיר זה לזה', 'צמתים שפעילים יחד, רצים במקביל על אותו snapshot, והעדכונים ממוזגים בסוף', 'כל הצמתים בגרף', 'צמתים של אותו מודל'], answer: 1, explain: 'מודל Pregel: Plan, Execution, Update. צמתים באותו צעד לא רואים זה את זה.' },
                { q: 'איך מגנים על סוכן עם מחזור מפני לולאה אינסופית?', options: ['אי אפשר', 'recursion_limit, מונה ניסיונות ב-state ותנאי יציאה בפונקציית הניתוב, ותקציב tokens', 'להוסיף עוד LLM', 'להשתמש ב-InMemorySaver'], answer: 1, explain: 'חריגה מהגבול זורקת GraphRecursionError; עדיף תנאי יציאה עסקי שמסלים לאדם לפני כן.' },
                { q: 'מה ה-time-travel מאפשר?', options: ['להריץ את המודל אחורה בזמן', 'לחזור ל-checkpoint קודם של thread, לערוך state אם צריך, ולהמשיך בענף חדש (למשל לדבג או לנסות החלטה אחרת)', 'לשנות את ה-prompt של העבר', 'למחוק את ה-thread'], answer: 1, explain: 'get_state_history + invoke(None, checkpoint_config) או update_state יוצרים fork. מעולה לדיבוג ו-"מה אם" - ראו במעבדה 1.' }
              ]);
            }
          }
        ]
      });
    }
  });
})();
