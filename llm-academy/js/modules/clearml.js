(function () {
  'use strict';
  const h = LA.h, s = LA.s;

  /* ====================================================================
     Code samples
     ==================================================================== */
  const PY_TASK = String.raw`from clearml import Task

# 1) One line turns the script into a tracked experiment.
task = Task.init(
    project_name="HR-Policy-RAG",
    task_name="chunk400-top5-embed-base",
    task_type=Task.TaskTypes.testing,        # training / testing / inference / data_processing ...
    tags=["rag", "baseline"],
)

# 2) Hyperparameters: a plain dict, editable later in the UI (and by clones!).
params = {
    "chunk_size": 400,
    "chunk_overlap": 60,
    "top_k": 5,
    "embedding_model": "embed-base",
    "reranker": False,
    "prompt_version": "v3",          # prompts are config -> track them too
}
params = task.connect(params)        # IMPORTANT: use the returned dict (remote runs may override it)

# 3) The pipeline you are evaluating
index = build_index(docs, params["chunk_size"], params["chunk_overlap"], params["embedding_model"])
results = evaluate(index, eval_set, top_k=params["top_k"], rerank=params["reranker"])

# 4) Metrics -> live charts in the web UI
logger = task.get_logger()
logger.report_scalar(title="retrieval", series="recall@k", value=results.recall_at_k, iteration=0)
logger.report_scalar(title="generation", series="faithfulness", value=results.faithfulness, iteration=0)
logger.report_scalar(title="ops", series="p95_latency_ms", value=results.p95_ms, iteration=0)

# 5) Rich output: tables / debug samples (failed questions!) / artifacts
logger.report_table(title="worst_questions", series="top-10", iteration=0, table_plot=results.worst_df)
task.upload_artifact(name="eval_results", artifact_object=results.df)   # DataFrame -> stored + previewed
task.close()`;

  const PY_DATASET = String.raw`from clearml import Dataset

# Version 1: raw HR documents
ds = Dataset.create(
    dataset_name="hr-eval-set",
    dataset_project="HR-Policy-RAG",
    dataset_version="1.0.0",
)
ds.add_files(path="data/eval_questions/")        # adds files (hash-based, only changes are stored)
ds.upload()                                      # to the ClearML fileserver / S3 / GCS ...
ds.finalize()                                    # freezes the version: it is now immutable

# Version 2 inherits v1 and adds/changes only some files (lineage!)
ds2 = Dataset.create(
    dataset_name="hr-eval-set", dataset_project="HR-Policy-RAG",
    parent_datasets=[ds.id],
)
ds2.add_files(path="data/new_questions_2026Q4/")
ds2.upload(); ds2.finalize()

# Consuming a specific version, in any experiment, on any machine
local = Dataset.get(dataset_project="HR-Policy-RAG", dataset_name="hr-eval-set",
                    dataset_version="1.0.0").get_local_copy()      # cached read-only folder`;

  const PY_PIPE = String.raw`from clearml import PipelineDecorator

@PipelineDecorator.component(return_values=["dataset_id"], cache=True, execution_queue="cpu")
def prepare_data(source_version: str):
    from clearml import Dataset
    # ... clean, dedupe, format as chat-style SFT jsonl ...
    ds = Dataset.create(dataset_name="sft-hr", dataset_project="HR-Policy-RAG", parent_datasets=[])
    ds.add_files("out/"); ds.upload(); ds.finalize()
    return ds.id

@PipelineDecorator.component(return_values=["model_id"], execution_queue="gpu")   # <- goes to a GPU worker
def finetune(dataset_id: str, lora_r: int = 16, lr: float = 2e-4, epochs: int = 3):
    from clearml import Task, Dataset, OutputModel
    task = Task.current_task()
    task.get_logger().report_scalar("train", "loss", 0.0, 0)   # ... training loop ...
    model = OutputModel(task=task, framework="PyTorch")
    model.update_weights("lora_adapter/adapter_model.safetensors")
    return model.id

@PipelineDecorator.component(return_values=["score"], execution_queue="services")
def evaluate(model_id: str, eval_ds: str):
    # cheap checks (format, length, banned words) -> Haiku;  rubric judging -> Sonnet
    return run_llm_judge(model_id, eval_ds)

@PipelineDecorator.pipeline(name="hr-bot-finetune", project="HR-Policy-RAG", version="1.0.0")
def pipeline(source_version: str = "1.0.0", min_score: float = 0.8):
    ds_id = prepare_data(source_version)
    model_id = finetune(ds_id)
    score = evaluate(model_id, eval_ds="hr-eval-set")
    if score >= min_score:
        print("promote", model_id)             # in real life: publish the model / tag "production"

if __name__ == "__main__":
    # PipelineDecorator.run_locally()          # debug: all steps as local functions
    pipeline()                                 # the controller itself is enqueued/run by an agent`;

  const SH_AGENT = String.raw`# --- one-time, on the server side (docker compose / helm) -> web :8080, api :8008, files :8081
# --- on every worker machine (laptop, GPU box, k8s pod):
pip install clearml clearml-agent
clearml-agent init                      # point at your server + credentials

# a daemon that pulls jobs from the "gpu" queue; one worker per GPU
clearml-agent daemon --queue gpu --gpus 0 --docker nvidia/cuda:12.4.1-runtime-ubuntu22.04 --detached
clearml-agent daemon --queue gpu --gpus 1 --detached
clearml-agent daemon --queue cpu --detached                 # cheap jobs (data prep)

# the "clone & enqueue" workflow from the SDK:
#   t = Task.clone(source_task="<task-id>", name="try top_k=8")
#   t.set_parameters({"General/top_k": 8})
#   Task.enqueue(t, queue_name="gpu")
# or: task.execute_remotely(queue_name="gpu")  inside your script (stops local run, continues on the agent)`;

  const PY_LORA = String.raw`# Tracking a LoRA fine-tune of an LLM
task = Task.init("HR-Policy-RAG", "lora-r16-lr2e-4", task_type=Task.TaskTypes.training)
cfg = task.connect({"base_model": "open-8b", "lora_r": 16, "lora_alpha": 32, "lr": 2e-4,
                    "epochs": 3, "train_dataset": "sft-hr:2.1.0", "seed": 42})
for step, batch in enumerate(loader):
    loss = train_step(batch)
    logger.report_scalar("train", "loss", loss, iteration=step)
task.update_output_model(model_path="adapter/", name="hr-bot-lora")   # registry entry with lineage
# Later: "which dataset + code commit + hyperparams produced the adapter in prod?" -> one click.`;

  /* ====================================================================
     Diagram specs
     ==================================================================== */
  const scalarSpec = {
    title: 'ערך סקלר בודד', width: 900, height: 230,
    intro: '<p>הדרך של <b>מספר אחד</b> — <code>report_scalar(...)</code> — עד גרף על המסך.</p>',
    nodes: [
      { id: 'call', x: 800, y: 110, w: 150, h: 62, label: 'report_scalar()', sub: 'title·series·value·iter', color: 'ui', info: '<p>הקריאה בקוד שלכם. <code>title</code> = שם הגרף, <code>series</code> = קו בגרף, <code>iteration</code> = ציר X. הקריאה <b>לא חוסמת</b>: היא רק מוסיפה לתור פנימי.</p>' },
      { id: 'buf', x: 600, y: 110, w: 150, h: 62, label: 'באפר בתהליך', sub: 'thread ברקע', color: 'tool', info: '<p>ה-SDK אוסף אירועים וקורא ל-API בקבוצות (batch) כל כמה שניות — כך לולאת אימון לא מאטה בגלל רשת. שימו לב: אם התהליך נהרג בפתאומיות, חלק מהאירועים האחרונים עלולים ללכת לאיבוד.</p>' },
      { id: 'api', x: 400, y: 110, w: 150, h: 62, label: 'API: events.add_batch', sub: ':8008', color: 'ctrl', info: '<p>שרת ה-API מקבל batch של אירועים, מאמת הרשאות/Task ומאחסן.</p>' },
      { id: 'es', x: 210, y: 110, w: 150, h: 62, label: 'Elasticsearch', sub: 'סדרות עתיות', shape: 'db', color: 'store', info: '<p>סקלרים, plots ולוגי קונסול נשמרים ב-Elasticsearch (בגרסאות שרת הנוכחיות; פרטי הגרסה יכולים להשתנות — בדקו בתיעוד שלכם) ומוגשים מהר ל-UI.</p>' },
      { id: 'ui', x: 62, y: 110, w: 100, h: 62, label: 'גרף ב-UI', color: 'ok', info: '<p>הדפדפן שואל את ה-API ומצייר. אפשר גם <b>להשוות</b> כמה Tasks על אותו גרף, ולהוסיף ל-Report.</p>' }
    ],
    edges: [{ from: 'call', to: 'buf' }, { from: 'buf', to: 'api', label: 'HTTP' }, { from: 'api', to: 'es' }, { from: 'es', to: 'ui' }]
  };

  const taskSpec = {
    title: 'Task אחד — מה נשמר', width: 900, height: 440,
    intro: '<p><b>Task = ריצה אחת (ניסוי)</b> עם כל מה שצריך כדי לשחזר אותה. לחצו על כל מרכיב. ל"Scalars" יש ⤵ — מסלול ערך בודד.</p>',
    nodes: [
      { id: 'task', x: 760, y: 220, w: 150, h: 70, label: 'Task', sub: 'ID · status · type', color: 'neuron', info: '<p>רשומה במסד הנתונים עם מזהה ייחודי. <b>Status</b>: draft → queued → in_progress → completed/failed/stopped. Task ב-draft אפשר לערוך ולשלוח לתור — זה הבסיס ל-clone &amp; enqueue.</p>' },
      { id: 'code', x: 500, y: 60, w: 190, h: 56, label: 'Git: repo + commit', sub: '+ diff לא-committed', color: 'data', info: '<p>ClearML שומר את כתובת ה-repo, ה-commit וגם את ה-<b>diff של שינויים שלא נעשה להם commit</b> — כך אפשר לשחזר ריצה גם כשבדקתם משהו "מהיר" על המחשב. (ב-Jupyter שומר את ה-notebook כסקריפט.)</p>' },
      { id: 'pkg', x: 500, y: 140, w: 190, h: 56, label: 'סביבה: packages', sub: 'pip freeze + גרסת Python', color: 'data', info: '<p>רשימת החבילות המדויקות (requirements). הסוכן ישחזר סביבה ב-venv/Docker מהרשימה. לכן חשוב שהקוד ירוץ <b>נקי</b> מהרשימה, לא "ממה שהיה מותקן במקרה".</p>' },
      { id: 'hp', x: 500, y: 220, w: 190, h: 56, label: 'Hyperparameters', sub: 'task.connect(dict)', color: 'tool', info: '<p>שלושה מקורות: <code>task.connect(dict)</code>, argparse (נקלט אוטומטית), ופרמטרים של frameworks. ב-UI אפשר לערוך אותם בטיוטה — ולכן clone עם פרמטר שונה לא דורש שינוי קוד.</p><p><b>טיפ ל-LLM:</b> הוסיפו כאן גם prompt_version, שם מודל ה-LLM, system-prompt hash וגרסת dataset.</p>' },
      { id: 'sc', x: 500, y: 300, w: 190, h: 56, label: 'Scalars / Plots', sub: 'Logger.report_*', color: 'ok', children: scalarSpec, info: '<p>כל מה שמדווחים ב-Logger: סקלרים (loss, recall@k), היסטוגרמות, טבלאות, תמונות ("debug samples"). TensorBoard/matplotlib נקלטים אוטומטית. ⤵ לראות איך ערך בודד מגיע לגרף.</p>' },
      { id: 'con', x: 500, y: 380, w: 190, h: 56, label: 'Console', sub: 'stdout/stderr + לוג', color: 'ext', info: '<p>כל מה שמודפס — זורם חי ל-UI (וגם משם אפשר לדבג ריצה שרצה על מכונה אחרת). שימו לב: אל תדפיסו סודות/מפתחות API.</p>' },
      { id: 'art', x: 220, y: 100, w: 180, h: 56, label: 'Artifacts', sub: 'upload_artifact()', color: 'store', info: '<p>כל אובייקט: DataFrame, dict, קובץ, תיקייה. נשמרים ב-fileserver/S3 ומוצגים ב-UI. דוגמה: טבלת תוצאות הערכה, קובץ prompts, ה-index.</p>' },
      { id: 'mod', x: 220, y: 220, w: 180, h: 56, label: 'Models (input/output)', sub: 'Model Registry', color: 'llm', info: '<p>משקולות/מודל שהריצה יצרה (או צרכה) — עם קישור חזרה ל-Task שיצר אותו. אפשר לתייג ("staging", "production") ולפרוס.</p>' },
      { id: 'ds', x: 220, y: 340, w: 180, h: 56, label: 'Dataset inputs', sub: 'lineage', color: 'data', info: '<p>אילו גרסאות Dataset נצרכו — כך מקבלים שרשרת מקור: מודל ← ריצה ← dataset v2.1 ← v2.0.</p>' }
    ],
    edges: [
      { from: 'task', to: 'code' }, { from: 'task', to: 'pkg' }, { from: 'task', to: 'hp' }, { from: 'task', to: 'sc' }, { from: 'task', to: 'con' },
      { from: 'hp', to: 'art', dashed: true }, { from: 'hp', to: 'mod', dashed: true }, { from: 'sc', to: 'ds', dashed: true }
    ]
  };

  const agentSpec = {
    title: 'מחזור חיים של agent', width: 900, height: 260,
    intro: '<p><b>clearml-agent = worker</b> (תהליך daemon) — <u>לא</u> סוכן LLM. הוא מריץ עבודות, לא "חושב".</p>',
    nodes: [
      { id: 'pull', x: 800, y: 130, w: 130, h: 64, label: 'Pull', sub: 'מהתור', color: 'ctrl', info: '<p>ה-daemon שואל את השרת "יש משהו בתור שלי?" לפי עדיפות/סדר. תור יכול להיות משותף לכמה workers (פיזור עומס).</p>' },
      { id: 'env', x: 640, y: 130, w: 130, h: 64, label: 'Build env', sub: 'venv / Docker', color: 'tool', info: '<p>יוצר סביבה מבודדת (virtualenv או קונטיינר), מתקין את ה-packages מה-Task.</p>' },
      { id: 'repo', x: 480, y: 130, w: 130, h: 64, label: 'Clone code', sub: 'commit + diff', color: 'data', info: '<p>עושה clone ל-repo, checkout ל-commit המדויק, ומחיל את ה-diff שנשמר.</p>' },
      { id: 'run', x: 320, y: 130, w: 130, h: 64, label: 'Run', sub: 'python script.py', color: 'neuron', info: '<p>מריץ את הסקריפט. בתוכו <code>Task.init()</code> מזהה שהוא רץ מרחוק, מושך את הפרמטרים (אולי ערוכים) ומדווח כרגיל.</p>' },
      { id: 'rep', x: 160, y: 130, w: 130, h: 64, label: 'Report', sub: 'לוגים · מדדים', color: 'ok', info: '<p>סטטוס, console ומדדים חוזרים לשרת בזמן אמת. כשעוצר: status = completed/failed. אפשר גם לעצור/לאפס דרך ה-UI.</p>' },
      { id: 'gpu', x: 480, y: 220, w: 200, h: 36, label: 'GPU נבחר ע"י --gpus', color: 'warn', info: '<p>אחד daemon לכל GPU (או קבוצת GPUs). כך עובדים יכולים לחלוק שרת אחד בלי להתנגש ב-VRAM.</p>' }
    ],
    edges: [{ from: 'pull', to: 'env' }, { from: 'env', to: 'repo' }, { from: 'repo', to: 'run' }, { from: 'run', to: 'rep' }, { from: 'gpu', to: 'run', dashed: true }]
  };

  const queueSpec = {
    title: 'תורים', width: 900, height: 250,
    intro: '<p>תור = שם. מי שמאזין לשם (agent) לוקח עבודה.</p>',
    nodes: [
      { id: 'q1', x: 760, y: 70, w: 150, h: 50, label: 'queue: cpu', sub: 'עיבוד נתונים, evals זולים', color: 'data', info: '<p>עבודות שלא צריכות GPU. סוכנים זולים (או הרבה pods).</p>' },
      { id: 'q2', x: 760, y: 140, w: 150, h: 50, label: 'queue: gpu', sub: 'אימון / fine-tune', color: 'warn', info: '<p>רק מכונות עם GPU מאזינות. הגבלת קונקרנטיות = הגבלת עלות.</p>' },
      { id: 'q3', x: 760, y: 210, w: 150, h: 50, label: 'queue: services', sub: 'בקרים, pipelines', color: 'ctrl', info: '<p>"תור שירותים": תהליכים ארוכי-חיים (pipeline controller, HPO controller, dashboards).</p>' },
      { id: 'w1', x: 420, y: 70, w: 160, h: 50, label: 'worker cpu-1..N', color: 'ext', info: '<p>agent ללא GPU.</p>' },
      { id: 'w2', x: 420, y: 140, w: 160, h: 50, label: 'worker a100-gpu0', color: 'ext', info: '<p>agent שקשור ל-GPU 0.</p>' },
      { id: 'w3', x: 420, y: 210, w: 160, h: 50, label: 'worker svc', color: 'ext', info: '<p>agent שמריץ controller-ים.</p>' }
    ],
    edges: [{ from: 'w1', to: 'q1', label: 'pull' }, { from: 'w2', to: 'q2', label: 'pull' }, { from: 'w3', to: 'q3', label: 'pull' }]
  };

  const platformSpec = {
    title: 'פלטפורמת ClearML', width: 900, height: 440,
    intro: '<p><b>ארכיטקטורה בשלושה חלקים:</b> (1) ה-SDK בתוך הקוד שלכם, (2) השרת, (3) ה-agents על המכונות. כל השאר הוא תוצר של השילוב. לחצו על רכיב; ⤵ = אפשר לצלול (SDK → Task → ערך בודד).</p>',
    groups: [{ x: 330, y: 30, w: 360, h: 390, label: 'ClearML Server', color: 'ctrl' }],
    nodes: [
      { id: 'sdk', x: 800, y: 200, w: 150, h: 72, icon: '🐍', label: 'הקוד שלך + SDK', sub: 'Task.init()', color: 'ui', children: taskSpec, info: '<p>אתם מוסיפים שורה אחת (<code>Task.init</code>) ו-ClearML <b>מתחבר</b> לריצה: לוכד קוד, סביבה, פרמטרים, פלטים ומדדים. לא צריך לשנות את מבנה הקוד. ⤵ צלול ל-Task.</p>' },
      { id: 'user', x: 800, y: 350, w: 120, h: 50, icon: '🧑‍💻', label: 'אתם בדפדפן', color: 'ext', info: '<p>משווים ריצות, עורכים טיוטות, שולחים לתור, כותבים Reports.</p>' },
      { id: 'api', x: 600, y: 100, w: 150, h: 56, label: 'API Server', sub: ':8008', color: 'ctrl', info: '<p>REST API של הכול: Tasks, queues, models, datasets, events. כל הרכיבים (SDK, agent, UI) מדברים איתו.</p>' },
      { id: 'files', x: 600, y: 200, w: 150, h: 56, label: 'Fileserver / S3', sub: ':8081 · artifacts', shape: 'db', color: 'store', info: '<p>קבצים גדולים: artifacts, models, dataset files. בייצור מפנים ל-S3/GCS/Azure/MinIO במקום להשאיר בדיסק של השרת.</p>' },
      { id: 'web', x: 600, y: 330, w: 150, h: 56, label: 'Web UI', sub: ':8080', color: 'ui', info: '<p>דשבורד: Experiments, Datasets, Pipelines, Models, Queues/Workers, Reports. שימו לב שזה רק לקוח של ה-API.</p>' },
      { id: 'db', x: 440, y: 100, w: 170, h: 56, label: 'MongoDB · Elastic · Redis', shape: 'db', color: 'store', info: '<p>MongoDB: מטא-דאטה של Tasks/Models/Projects. Elasticsearch: אירועים (scalars, logs). Redis: מטמון וניהול תורים/sessions. <b>גיבוי</b> של אלה = גיבוי "ההיסטוריה המדעית" שלכם.</p>' },
      { id: 'queue', x: 440, y: 230, w: 170, h: 56, label: 'Queues', sub: 'cpu · gpu · services', color: 'warn', children: queueSpec, info: '<p>תור עבודות בשם. אתם מוסיפים Task לתור; agent שמאזין לתור לוקח אותו. ⤵ תורים לדוגמה.</p>' },
      { id: 'agent', x: 160, y: 230, w: 170, h: 72, icon: '⚙️', label: 'clearml-agent', sub: 'worker על מכונת GPU', color: 'neuron', children: agentSpec, info: '<p><b>שימו לב לשם:</b> "agent" כאן = תהליך worker שמריץ קוד. לא סוכן LLM (שמחליט ומשתמש בכלים). בקורס: "ClearML Agent" = worker; "agent" בלי תוספת = סוכן LLM.</p><p>⤵ צלול למחזור החיים.</p>' },
      { id: 'gpu', x: 160, y: 370, w: 170, h: 52, icon: '🖥️', label: 'מכונות GPU', sub: 'on-prem / ענן / k8s', color: 'ext', info: '<p>אפשר לשלב מכונות ממקורות שונים: A100 מקומי, ספוט בענן, pods ב-Kubernetes.</p>' }
    ],
    edges: [
      { from: 'sdk', to: 'api', label: 'metrics/logs', color: '#38bdf8' }, { from: 'sdk', to: 'files', label: 'artifacts' },
      { from: 'user', to: 'web' }, { from: 'web', to: 'api', both: true },
      { from: 'api', to: 'db' }, { from: 'api', to: 'queue', dashed: true, label: 'enqueue' },
      { from: 'agent', to: 'queue', label: 'pull' }, { from: 'agent', to: 'api', label: 'status', dashed: true },
      { from: 'gpu', to: 'agent' }, { from: 'agent', to: 'sdk', dashed: true, bend: 160, label: 'מריץ קוד שמשתמש ב-SDK' }
    ]
  };

  /* ====================================================================
     LAB 1 — simulated experiment dashboard (RAG hyperparameters)
     ==================================================================== */
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hash(str) { let x = 2166136261; for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
  const EMB = { 'embed-small': { base: 0.56, ms: 20, usd: 0.02, q: 'cpu' }, 'embed-base': { base: 0.65, ms: 45, usd: 0.06, q: 'cpu' }, 'embed-large': { base: 0.72, ms: 110, usd: 0.13, q: 'gpu' } };
  function simRun(p, n) {
    // deterministic plausible toy function + small seeded noise (NOT real RAG behavior)
    const e = EMB[p.embed], rnd = mulberry(hash(JSON.stringify(p)) + n * 17);
    const noise = () => (rnd() - 0.5) * 0.03;
    const chunkPen = -0.07 * Math.pow(Math.log2(p.chunk / 400), 2);          // sweet spot near 400
    const r = p.overlap / p.chunk;
    const ovl = 0.04 * Math.min(r, 0.2) / 0.2 - 0.06 * Math.max(0, r - 0.3);
    const kGain = 0.55 + 0.45 * (1 - Math.exp(-p.k / 3.5));
    let recall = (e.base + chunkPen + ovl) * kGain + (p.rerank ? 0.07 * (1 - p.k / 20) : 0) + noise();
    recall = Math.max(0.05, Math.min(0.97, recall));
    const ctxTok = p.k * p.chunk;
    const faith = Math.max(0.1, Math.min(0.98, 0.48 + 0.42 * recall - 0.1 * Math.max(0, (ctxTok - 3000) / 4000) + noise()));
    const lat = Math.round(160 + e.ms + ctxTok * 0.06 + (p.rerank ? 130 : 0) + rnd() * 25);
    const cost = +(e.usd + ctxTok * 0.00009 + (p.rerank ? 0.05 : 0)).toFixed(3);   // $ / 1k queries (toy units)
    return { recall: +recall.toFixed(3), faith: +faith.toFixed(3), lat, cost };
  }

  function labDashboard(el) {
    const P = { chunk: 400, overlap: 60, k: 5, embed: 'embed-base', rerank: false };
    const runs = []; let sel = -1, mode = 'line', objective = 'faith', tickN = 0;
    const queues = { cpu: [], gpu: [] };
    const agents = [{ name: 'worker-cpu-1', q: 'cpu', job: null, left: 0 }, { name: 'worker-gpu-0', q: 'gpu', job: null, left: 0 }, { name: 'worker-gpu-1', q: 'gpu', job: null, left: 0 }];
    let jobSeq = 0;
    const tbody = h('tbody'), chart = h('div', { class: 'clearml-chart' }), qBox = h('div', { class: 'clearml-queues' }), note = h('div', { class: 'muted', style: { fontSize: '13px' } });

    function addRun(p, worker) {
      const m = simRun(p, runs.length + 1);
      runs.push(Object.assign({ id: runs.length + 1, p: Object.assign({}, p), worker: worker || 'local' }, m));
      sel = runs.length - 1; redraw();
    }
    const score = r => objective === 'recall' ? r.recall : objective === 'faith' ? r.faith : r.faith / (r.cost + 0.1);
    const bestIdx = () => { let b = -1, bv = -1; runs.forEach((r, i) => { if (score(r) > bv) { bv = score(r); b = i; } }); return b; };

    function drawTable() {
      tbody.innerHTML = ''; const b = bestIdx();
      runs.forEach((r, i) => {
        const tr = h('tr', { class: (i === sel ? 'sel ' : '') + (i === b ? 'best' : '') },
          h('td', null, (i === b ? '⭐ ' : '') + '#' + r.id), h('td', null, r.p.chunk), h('td', null, r.p.overlap), h('td', null, r.p.k), h('td', null, r.p.embed), h('td', null, r.p.rerank ? 'yes' : 'no'),
          h('td', null, r.recall.toFixed(3)), h('td', null, r.faith.toFixed(3)), h('td', null, r.lat + 'ms'), h('td', null, '$' + r.cost.toFixed(2)), h('td', null, r.worker));
        tr.addEventListener('click', () => { sel = i; redraw(); });
        tbody.appendChild(tr);
      });
    }
    function drawChart() {
      chart.innerHTML = '';
      const W = 640, H = 250, L = 46, R = 14, Tp = 18, B = 36;
      const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, style: 'direction:ltr' });
      const b = bestIdx();
      const axis = (x1, y1, x2, y2) => svg.appendChild(s('line', { x1, y1, x2, y2, stroke: '#26325a' }));
      let yMin = 0.3, yMax = 1.0; const yy = v => H - B - (v - yMin) / (yMax - yMin) * (H - B - Tp);
      for (let v = 0.3; v <= 1.0001; v += 0.1) { axis(L, yy(v), W - R, yy(v)); svg.appendChild(s('text', { x: L - 6, y: yy(v) + 3, 'text-anchor': 'end' }, v.toFixed(1))); }
      if (!runs.length) { svg.appendChild(s('text', { x: W / 2, y: H / 2, 'text-anchor': 'middle' }, 'אין עדיין ריצות — הריצו ניסוי')); chart.appendChild(svg); return; }
      if (mode === 'line') {
        const xx = i => L + (runs.length === 1 ? 0.5 : i / (runs.length - 1)) * (W - L - R - 20) + 10;
        [['recall', '#38bdf8', 'recall@k'], ['faith', '#4ade80', 'faithfulness']].forEach(([key, col, name], si) => {
          const d = runs.map((r, i) => (i ? 'L' : 'M') + xx(i) + ',' + yy(r[key])).join(' ');
          svg.appendChild(s('path', { d, fill: 'none', stroke: col, 'stroke-width': 2 }));
          runs.forEach((r, i) => { const c = s('circle', { cx: xx(i), cy: yy(r[key]), r: i === sel ? 6 : 4, fill: col, stroke: i === b ? '#fbbf24' : 'none', 'stroke-width': 2, style: 'cursor:pointer' }); c.addEventListener('click', () => { sel = i; redraw(); }); svg.appendChild(c); });
          svg.appendChild(s('text', { x: L + 6 + si * 110, y: 12, fill: col, style: 'fill:' + col }, '● ' + name));
        });
        runs.forEach((r, i) => svg.appendChild(s('text', { x: xx(i), y: H - 18, 'text-anchor': 'middle' }, '#' + r.id)));
        svg.appendChild(s('text', { x: W / 2, y: H - 3, 'text-anchor': 'middle' }, 'run (iteration axis)'));
      } else {
        const cMax = Math.max(0.5, ...runs.map(r => r.cost)) * 1.1, xx = c => L + c / cMax * (W - L - R - 10);
        runs.forEach((r, i) => {
          const c = s('circle', { cx: xx(r.cost), cy: yy(r.faith), r: i === sel ? 8 : 6, fill: i === b ? '#fbbf24' : '#a78bfa', 'fill-opacity': .85, style: 'cursor:pointer' }); c.addEventListener('click', () => { sel = i; redraw(); });
          svg.appendChild(c); svg.appendChild(s('text', { x: xx(r.cost) + 9, y: yy(r.faith) + 3 }, '#' + r.id));
        });
        svg.appendChild(s('text', { x: W / 2, y: H - 3, 'text-anchor': 'middle' }, 'cost $ / 1k queries (toy) →     y: faithfulness'));
        // Pareto frontier
        const pts = runs.map(r => [r.cost, r.faith]).sort((a, c) => a[0] - c[0]); let best = -1; const fr = [];
        pts.forEach(pt => { if (pt[1] > best) { best = pt[1]; fr.push(pt); } });
        if (fr.length > 1) svg.appendChild(s('path', { d: fr.map((pt, i) => (i ? 'L' : 'M') + xx(pt[0]) + ',' + yy(pt[1])).join(' '), fill: 'none', stroke: '#fbbf24', 'stroke-dasharray': '5 4' }));
      }
      chart.appendChild(svg);
    }
    function drawQueues() {
      qBox.innerHTML = '';
      ['cpu', 'gpu'].forEach(q => {
        const box = h('div', { class: 'clearml-q' }, h('h5', null, h('span', null, 'queue: ' + q), h('span', { class: 'muted' }, queues[q].length + ' ממתינים')));
        queues[q].forEach(j => box.appendChild(h('span', { class: 'clearml-chip' }, 'job-' + j.id + ' · ' + j.p.embed.replace('embed-', ''))));
        agents.filter(a => a.q === q).forEach(a => box.appendChild(h('div', { class: 'clearml-ag' + (a.job ? ' busy' : '') }, h('i', { class: 'clearml-dot' }), h('span', { class: 'mono' }, a.name), h('span', { class: 'muted' }, a.job ? 'מריץ job-' + a.job.id + ' (' + a.left + ')' : 'idle — ממתין לעבודה'))));
        qBox.appendChild(box);
      });
    }
    function redraw() {
      drawTable(); drawChart(); drawQueues();
      const r = runs[sel];
      note.innerHTML = r ? `נבחרה ריצה <b>#${r.id}</b>. אפשר <b>Clone</b> (מעתיק את ההיפר-פרמטרים לפקדים) ואז לשנות <i>פרמטר אחד</i> ולשלוח <b>Enqueue</b> — כך מבצעים ניסוי מבוקר.` : '';
    }
    function enqueue() {
      const p = Object.assign({}, P), q = EMB[p.embed].q; queues[q].push({ id: ++jobSeq, p });
      drawQueues();
    }
    LA.interval(() => {
      let changed = false;
      agents.forEach(a => {
        if (a.job) { a.left--; changed = true; if (a.left <= 0) { const j = a.job; a.job = null; addRun(j.p, a.name); } }
        if (!a.job && queues[a.q].length) { a.job = queues[a.q].shift(); a.left = 3; changed = true; }
      });
      if (changed) drawQueues();
    }, 700);

    const sChunk = LA.slider('chunk_size (tokens)', 128, 1024, 16, P.chunk, v => P.chunk = v);
    const sOvl = LA.slider('chunk_overlap', 0, 256, 10, P.overlap, v => P.overlap = v);
    const sK = LA.slider('top_k', 1, 15, 1, P.k, v => P.k = v);
    const selE = h('select', { class: 'clearml-sel' }, Object.keys(EMB).map(k => h('option', { value: k, selected: k === P.embed ? '' : null }, k)));
    selE.addEventListener('change', () => P.embed = selE.value);
    const cb = h('input', { type: 'checkbox' }); cb.addEventListener('change', () => P.rerank = cb.checked);
    const syncCtl = () => { sChunk.input.value = P.chunk; sOvl.input.value = P.overlap; sK.input.value = P.k; selE.value = P.embed; cb.checked = P.rerank; [sChunk, sOvl, sK].forEach(x => x.fire()); };
    const objSel = h('select', { class: 'clearml-sel' }, h('option', { value: 'faith' }, 'faithfulness'), h('option', { value: 'recall' }, 'recall@k'), h('option', { value: 'eff' }, 'faithfulness / cost'));
    objSel.addEventListener('change', () => { objective = objSel.value; redraw(); });
    const modeSel = h('select', { class: 'clearml-sel' }, h('option', { value: 'line' }, 'גרף ריצות'), h('option', { value: 'sc' }, 'Pareto: עלות ↔ איכות'));
    modeSel.addEventListener('change', () => { mode = modeSel.value; redraw(); });

    el.appendChild(h('div', { class: 'lab' },
      h('div', { class: 'lab-h' }, '📊 מעבדה 1 — דשבורד ניסויים (RAG של מדיניות HR) ', h('span', { class: 'clearml-toy' }, 'מדדים מדומים: פונקציה דטרמיניסטית + רעש קטן')),
      h('p', { class: 'muted', html: 'אתם מכווננים את צינור ה-RAG. כל <b>Run</b> = Task חדש שנוסף לטבלה (כמו ב-ClearML Experiments) עם מדדים. נסו: להעלות top_k (recall עולה — אבל קונטקסט ארוך פוגע ב-faithfulness ובעלות), לשנות chunk_size (יש "נקודה מתוקה"), להפעיל reranker (איכות+latency). ואז בחרו ריצה, <b>Clone</b>, שנו פרמטר אחד, ו-<b>Enqueue</b> לתור — agent יקח אותה (GPU לתור gpu, embed-large).' }),
      h('div', { class: 'clearml-ctl' }, sChunk, sOvl, sK,
        h('div', { class: 'clearml-row' }, h('span', null, 'embedding:'), selE, h('label', null, cb, ' reranker'))),
      h('div', { class: 'clearml-row' },
        h('button', { class: 'btn primary', type: 'button', onclick: () => addRun(P, 'local') }, '▶ Run (מקומי)'),
        h('button', { class: 'btn', type: 'button', onclick: enqueue }, '📤 Enqueue לתור'),
        h('button', { class: 'btn', type: 'button', onclick: () => { if (sel >= 0) { Object.assign(P, runs[sel].p); syncCtl(); } } }, '🧬 Clone ריצה נבחרת'),
        h('span', null, 'ציון "הטוב ביותר":'), objSel, modeSel),
      chart,
      h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl clearml-runs' }, h('thead', null, h('tr', null, ['run', 'chunk', 'ovl', 'k', 'embedding', 'rerank', 'recall@k', 'faithful', 'p95', '$/1k', 'worker'].map(x => h('th', null, x)))), tbody)),
      note,
      h('h4', null, 'תורים ו-agents (clone → enqueue → pull)'), qBox));
    [{ chunk: 200, overlap: 20, k: 3, embed: 'embed-small', rerank: false }, { chunk: 400, overlap: 60, k: 5, embed: 'embed-base', rerank: false }, { chunk: 800, overlap: 80, k: 10, embed: 'embed-base', rerank: false }].forEach(p => addRun(p, 'local'));
    sel = 1; redraw();
  }

  /* ====================================================================
     LAB 2 — fine-tuning pipeline stepper
     ==================================================================== */
  function labPipeline(el) {
    const STEPS = [
      { k: 'ds', t: 'Dataset', q: null, qc: 'svc', ic: '🗂️', desc: 'hr-sft v2.1.0' },
      { k: 'pre', t: 'Preprocess', q: 'cpu', qc: 'cpu', ic: '🧹', desc: 'dedup · PII · jsonl' },
      { k: 'ft', t: 'Fine-tune LoRA', q: 'gpu', qc: 'gpu', ic: '🔥', desc: 'worker-gpu-0 (A100)' },
      { k: 'ev', t: 'Eval', q: 'services', qc: 'svc', ic: '⚖️', desc: 'Haiku + Sonnet judge' },
      { k: 'reg', t: 'Register', q: null, qc: 'svc', ic: '🏷️', desc: 'Model Registry' },
      { k: 'srv', t: 'Serve', q: 'gpu', qc: 'gpu', ic: '🚀', desc: 'clearml-serving' }
    ];
    const strip = h('div', { class: 'clearml-pipe' }, STEPS.map(x => h('div', { class: 'clearml-ps' }, h('b', null, x.ic + ' ' + x.t), h('span', { class: 'muted' }, x.desc), h('br'), x.q ? h('span', { class: 'clearml-q-tag ' + x.qc }, 'queue: ' + x.q) : h('span', { class: 'clearml-q-tag svc' }, 'no worker'))));
    const mark = i => [...strip.children].forEach((c, k) => { c.classList.toggle('on', k === i); c.classList.toggle('done', k < i); });
    const st = (title, i, html) => ({ title, html, run: () => mark(i) });
    const host = h('div');
    LA.stepper(host, {
      intro: 'צינור fine-tuning של מודל תמיכה לחברת חשמל — לחצו "הבא"',
      autoplayMs: 3000,
      onReset: () => mark(-1),
      steps: [
        st('1. גרסת Dataset', 0, '<p><code>Dataset.get("hr-sft", version="2.1.0")</code> — גרסה <b>מקובעת</b> (לא "latest"), עם lineage ל-v2.0.0. אותה גרסה תירשם בריצה, כך אפשר לענות "על מה אומן המודל?". ' + LA.badge('אין worker — מטא-דאטה בלבד', 'acc') + '</p>' + '<p>גם <b>eval set</b> עובר גרסה, ובמנותק מנתוני האימון — מונע דליפה (data leakage).</p>'),
        st('2. Preprocess — תור cpu', 1, '<p>ניקוי, הסרת כפילויות, טשטוש PII (מספרי חשבון/ת"ז), המרה לפורמט שיחה. לא צריך GPU → <b>תור cpu</b>, סוכן זול. <code>cache=True</code> — אם הקלט והקוד זהים, הצעד <b>מדולג</b>.</p>' + LA.code('@PipelineDecorator.component(return_values=["ds_id"], cache=True, execution_queue="cpu")\ndef prepare_data(src_version): ...', 'python')),
        st('3. Fine-tune — תור gpu', 2, '<p>LoRA על מודל בסיס פתוח. <b>רק כאן</b> צריך GPU יקר: <code>execution_queue="gpu"</code> → agent על <span class="mono">worker-gpu-0</span>. ה-Logger מדווח loss לאורך הצעדים, ה-checkpoint נשמר כ-OutputModel.</p><p>היפר-פרמטרים ב-<code>task.connect</code>: r, alpha, lr, epochs, seed, גרסת dataset.</p>' + LA.code(PY_LORA, 'python', 'מעקב אחרי fine-tune')),
        st('4. Eval — LLM-as-judge', 3, '<p>שני מנגנונים ביחד:</p>' + LA.table(['בדיקה', 'מודל', 'למה'], [['פורמט JSON, אורך, מילים אסורות, שפה', LA.modelBadge('haiku'), 'בדיקות זולות ובנפח גבוה על כל דוגמה'], ['שיפוט איכות מול rubric: נכונות לפי המדיניות, טון, ציטוט מקור', LA.modelBadge('sonnet'), 'שיפוט עדין בעלות סבירה; דגימות גבוליות אפשר להסלים ל-' + LA.modelBadge('opus')]]) + '<p>רץ ב-<b>תור services</b> (קורא ל-API חיצוני, לא צריך GPU). מדווח <code>report_scalar("eval","judge_score",...)</code>. <b>שימו לב:</b> שופט LLM מוטה (למשל להעדפת תשובות ארוכות) — מכיילים מול דגימה אנושית, ושומרים את גרסת ה-judge-prompt.</p>'),
        st('5. Register — שער איכות', 4, '<p>אם <code>judge_score ≥ baseline</code> וגם אין רגרסיה בבדיקות הבטיחות — רושמים את המודל ב-Registry ומתייגים <code>staging</code>. אחרת — הצינור נעצר. הרישום שומר קישור ל-Task, ל-commit ול-dataset.</p>'),
        st('6. Serve — canary', 5, '<p>פריסה עם <b>ClearML Serving</b> (או כל מנוע אחר): endpoint, גרסאות, canary של 10% מהתעבורה, מדידת latency. ה-Registry הוא "מקור האמת" למה שרץ. ' + LA.badge('תור gpu או k8s', 'warn') + '</p>' + LA.callout('algo', 'בכל שלב נשמר: מי רץ, איפה (worker), על איזו גרסת קוד/נתונים, ובכמה זמן. זה מה שמאפשר "חזרה לגרסה הקודמת" ושחזור.'))
      ]
    });
    el.appendChild(h('div', { class: 'lab' },
      h('div', { class: 'lab-h' }, '🔧 מעבדה 2 — צינור fine-tuning: איזה צעד הולך לאיזה תור'),
      h('p', { class: 'muted' }, 'שימו לב לתגית ה-queue בכל צעד: רק צעד אחד (והפריסה) צריך GPU. זה הכוח של Pipelines — כל צעד Task עצמאי שרץ על ה-worker המתאים.'),
      strip, host));
    mark(-1);
  }

  /* ====================================================================
     Module
     ==================================================================== */
  function tabsComponents(el) {
    LA.tabs(el, [
      { label: 'Experiment Manager', html: '<p>הליבה. <code>Task.init()</code> + <code>task.connect()</code> + <code>Logger</code>. מקבלים טבלת ריצות עם מיון/סינון/השוואה (diff של פרמטרים וגרפים זה לצד זה), תגיות, ו-Reports.</p>' + LA.callout('example', 'RAG של מדיניות HR: מריצים 40 ריצות (chunk/overlap/top_k/embedding/reranker). ב-UI ממיינים לפי faithfulness, משווים את 3 המובילות — ורואים שהמנצח לא הכי יקר.') },
      { label: 'Data Management', html: '<p><code>clearml.Dataset</code>: גרסאות <b>בלתי משתנות</b> עם lineage (parent_datasets), מעקב hash — מאחסנים רק שינויים. <code>get_local_copy()</code> מוריד ל-cache מקומי. חשוב ל-LLM: <b>eval sets</b>, נתוני SFT, מסמכי RAG ו-prompts.</p>' },
      { label: 'Orchestration', html: '<p><b>clearml-agent</b> + תורים: מריצים Tasks על כל מכונה. מנוהל דרך ה-UI (Workers &amp; Queues). תומך virtualenv, Docker, Kubernetes (glue), עדיפויות, GPU לכל worker.</p>' + LA.callout('warn', '<b>בלבול שמות:</b> "ClearML Agent" הוא <b>worker</b> (תהליך שמריץ קוד שלכם). הוא לא "סוכן" במובן של LLM agents (מודל שמחליט איזה כלי להפעיל). בקורס זה: <b>agent</b> = LLM agent; ו-<b>ClearML agent</b> = worker.') },
      { label: 'Pipelines', html: '<p>גרף של Tasks: <code>PipelineController</code> (add_step) או <code>@PipelineDecorator.component</code> + <code>@PipelineDecorator.pipeline</code> (כתיבה כפייתון רגיל). לכל צעד: <b>תור משלו</b>, caching, ופרמטרים. אפשר לשכפל ולהריץ עם פרמטרים אחרים, ולשלב לוגיקה (תנאי) כמו שער איכות.</p>' },
      { label: 'HPO', html: '<p><code>HyperParameterOptimizer</code> משכפל Task-בסיס שוב ושוב עם פרמטרים שונים (grid/random/Optuna/BOHB), שולח לתור, ומחפש את אופטימום המדד. לניסויי RAG: לחפש chunk_size/top_k ביעד faithfulness תחת מגבלת עלות. ⚠️ חפשו על <b>validation</b> ובדקו פעם אחת על test, אחרת מתאימים-יתר.</p>' },
      { label: 'Model Registry + Serving', html: '<p>Models נרשמים עם קישור ל-Task שיצר אותם; תגיות (staging/production); <b>clearml-serving</b> מפרסם endpoints עם גרסאות, canary ומדידה. ל-LLM גדולים אפשר לשלב מנועי inference ייעודיים (למשל vLLM) כשכבת הפריסה בפועל.</p>' },
      { label: 'מול MLflow / W&B', html: LA.table(['', 'ClearML', 'MLflow', 'Weights &amp; Biases'], [
        ['מודל פריסה', 'קוד-פתוח, self-host מלא (או מנוהל)', 'קוד-פתוח, self-host', 'בעיקר SaaS (יש self-host)'],
        ['איסוף אוטומטי (git diff, packages)', 'מעולה, "Task.init" ודי', 'חלקי/ידני (autolog)', 'טוב; דורש wandb.init'],
        ['תזמור הרצה על מכונות (agent/queues)', '✅ מובנה', '❌ (דורש כלים חיצוניים)', 'חלקי (Launch/Sweeps)'],
        ['Pipelines', '✅ מובנה', 'חלקי (Projects/Recipes)', 'חלקי'],
        ['UI והשוואות', 'טוב', 'בסיסי-טוב', 'מצוין ומלוטש'],
        ['מתאים כש...', 'רוצים פלטפורמה אחת: ניסויים+נתונים+הרצה', 'רוצים רישום פשוט + registry', 'רוצים UX וצוותים בענן']
      ]) + '<p class="muted">ההשוואה כללית; תכונות כל כלי משתנות בין גרסאות — בדקו מול הצורך שלכם.</p>' }
    ]);
  }

  LA.register({
    id: 'clearml', order: 90, group: 'ops', icon: '📈', short: 'ClearML',
    title: 'ClearML — MLOps: ניסויים, נתונים, צינורות ופריסה',
    render(main) {
      LA.page(main, {
        icon: '📈', title: 'ClearML — MLOps: ניסויים, נתונים, צינורות ופריסה',
        subtitle: 'הפלטפורמה שהופכת ניסויי ML ו-LLM ל<b>הנדסה</b>: כל ריצה נרשמת עם קוד, נתונים, פרמטרים ותוצאות — וניתן לשכפל, להשוות, להריץ על GPU ולפרוס.',
        sections: [
          {
            id: 'what', title: 'בשורה אחת + אנלוגיה',
            html:
              '<p><b>ClearML</b> היא פלטפורמת <b>MLOps</b> בקוד-פתוח: <b>שרת</b> + <b>ממשק web</b> + <b>SDK</b> לפייתון + <b>agents</b> שמריצים עבודות על מכונות. היא עוקבת אחרי ניסויים, מנהלת גרסאות נתונים, מריצה צינורות על GPU, ומנהלת רישום ופריסה של מודלים.</p>' +
              LA.callout('analogy', 'דמיינו <b>יומן מעבדה אוטומטי</b> שכותב לבד מה עשיתם (איזה קוד, איזה נתונים, איזו הגדרה, מה יצא) <b>וגם</b> יודע לחזור על הניסוי על מכונה אחרת בלחיצה. בלי זה, "איזו גרסה של ה-prompt והצ׳אנקינג נתנה את 0.82?" נשארת בלי תשובה אחרי שבועיים.') +
              LA.callout('warn', '<b>בלבול שמות חשוב:</b> "<b>ClearML Agent</b>" הוא <b>worker</b> — תהליך שמושך Task מתור ומריץ את הקוד. הוא <u>לא</u> "סוכן" LLM שמחליט ומפעיל כלים (ראו מודול הסוכנים). אותה מילה, שני דברים שונים.') +
              LA.table(['רכיב', 'תפקיד'], [
                ['Experiment Manager', 'מעקב ריצות: קוד, git diff, packages, פרמטרים, console, מדדים, artifacts, models'],
                ['Data Management', '<code>Dataset</code>: גרסאות ו-lineage לנתונים'],
                ['Orchestration', '<code>clearml-agent</code> + תורים: הרצה על מכונות/Docker/k8s'],
                ['Pipelines', 'צעדים שרשורים (PipelineController / @PipelineDecorator), כל צעד בתור משלו'],
                ['HPO', 'חיפוש היפר-פרמטרים אוטומטי'],
                ['Model Registry · Serving', 'רישום מודלים, גרסאות, פריסה (<code>clearml-serving</code>)'],
                ['Reports / Dashboards', 'מסמכי Markdown חיים עם גרפים של ריצות']
              ])
          },
          {
            id: 'arch', title: 'איך זה עובד — ארכיטקטורה (דיאגרמה לחיצה)',
            render(el) {
              el.insertAdjacentHTML('beforeend', '<p>לחצו על כל רכיב. <b>⤵</b> = צלילה: <b>SDK ← Task ← ערך סקלר בודד</b>, <b>Queues</b>, <b>agent</b>. שימו לב לחץ המקווקו האחרון: ה-agent מריץ קוד <i>שמשתמש בעצמו ב-SDK</i>.</p>');
              LA.diagram(el, platformSpec);
            }
          },
          {
            id: 'inside', title: 'צלילה פנימה: הרכיבים והשוואה',
            render(el) {
              el.insertAdjacentHTML('beforeend',
                '<p>כל לשונית היא יכולת אחת. ההנחה: <b>reproducibility</b> — ניתן לשחזר ריצה אם יודעים את הקוד, הסביבה, הנתונים והפרמטרים; ClearML אוסף את ארבעתם אוטומטית.</p>');
              tabsComponents(el);
              el.insertAdjacentHTML('beforeend',
                '<h3>Clone &amp; Enqueue — זרימת העבודה שמשנה הכול</h3>' +
                '<p>Task שרץ נשמר עם קוד+סביבה+פרמטרים. <b>Clone</b> יוצר ממנו טיוטה; משנים פרמטר (למשל <code>top_k: 5→8</code>) ב-UI או ב-SDK; <b>Enqueue</b> שולח לתור; agent מריץ. בלי לגעת בקוד ובלי להתחבר למכונה. ' +
                'במעבדה 1 תוכלו לנסות את זה.</p>');
            }
          },
          {
            id: 'example', title: 'דוגמה מוחשית: ניסוי RAG, Dataset, Pipeline ו-agent',
            render(el) {
              el.insertAdjacentHTML('beforeend', '<p><b>תרחיש:</b> בוט שאלות על מדיניות HR לעובדי חברה גדולה. רוצים לבחור chunk_size, top_k ו-embedding באופן מדעי — ולהיות מסוגלים לשחזר את ההחלטה בעוד חצי שנה.</p>');
              LA.tabs(el, [
                { label: 'Task + connect + Logger', html: LA.code(PY_TASK, 'python', 'rag_experiment.py') + LA.callout('tip', 'שימו ב-<code>connect</code> גם את <b>גרסת ה-prompt</b>, שם המודל, וגרסת ה-eval set. אחרת, ניסויים "זהים" יתנו תוצאות שונות ואף אחד לא יבין למה.') },
                { label: 'Dataset', html: LA.code(PY_DATASET, 'python', 'versioned datasets') + LA.callout('algo', 'כל eval set הוא <b>אומן-קפוא</b> (finalize). שינוי = גרסה חדשה. כך אפשר להשוות ריצות רק על אותה גרסה, ולהימנע מדליפת eval לאימון.') },
                { label: 'Pipeline', html: LA.code(PY_PIPE, 'python', 'PipelineDecorator') },
                { label: 'Agent + clone/enqueue', html: LA.code(SH_AGENT, 'bash', 'clearml-agent') + LA.callout('info', 'סימון נפוץ: לוקחים GPU אחד לכל daemon, ומוסיפים daemon נפרד לתור cpu. כך אימון לא מתחרה על משאבים עם data prep.') }
              ]);
            }
          },
          {
            id: 'lab', title: 'מעבדה אינטראקטיבית',
            render(el) {
              LA.tabs(el, [
                { label: '1 · דשבורד ניסויי RAG', render: labDashboard },
                { label: '2 · צינור fine-tuning', render: labPipeline }
              ]);
            }
          },
          {
            id: 'llm', title: 'הקשר ל-LLM — איפה ClearML פוגש מודלי שפה',
            render(el) {
              el.insertAdjacentHTML('beforeend',
                LA.callout('llm', '<p>ClearML לא מריץ LLM בעצמו — הוא <b>הופך עבודה עם LLM לניתנת-ניהול</b>:</p>' + LA.list([
                  '<b>Fine-tuning (LoRA/SFT):</b> מעקב loss, היפר-פרמטרים (r, alpha, lr), גרסת dataset, checkpoint כ-OutputModel, והרצה על תור GPU.',
                  '<b>ניסויי RAG/embeddings:</b> chunk_size, overlap, top_k, מודל embedding, reranker מול recall@k / faithfulness / latency / עלות (מעבדה 1).',
                  '<b>גרסאות eval sets ו-prompts:</b> כ-Datasets/artifacts/פרמטרים; בלי זה אי אפשר לדעת אם שיפור הוא אמיתי או שהמבחן השתנה.',
                  '<b>צינורות הערכה:</b> LLM-as-judge ו-regression suites שרצים כצעד בצינור ושומרים את הציונים כסקלרים.',
                  '<b>פריסה:</b> Model Registry + serving; שמירת קשר בין מה שרץ בפרודקשן לריצה שיצרה אותו.',
                  '<b>שחזוריות ו-clone-and-enqueue:</b> לשכפל ניסוי שמצליח ולהריץ אותו על נתונים חדשים בלחיצה.'
                ])) +
                '<h3>ניתוב מודלים בצינור הערכה ו-MLOps</h3>' +
                LA.table(['צעד בצינור', 'מודל', 'למה'], [
                  ['בדיקות מבנה/פורמט/אורך על אלפי דוגמאות', LA.modelBadge('haiku'), 'זול ומהיר; ברוב המקרים אפילו בדיקה דטרמיניסטית בלי LLM'],
                  ['שיפוט איכות/נאמנות מול rubric (LLM-as-judge)', LA.modelBadge('sonnet'), 'איזון עלות/איכות על כל ה-eval set'],
                  ['ניתוח כשלים עמוק, כתיבת rubric, ניתוח השוואת ריצות, מקרים גבוליים', LA.modelBadge('opus'), 'נפח נמוך, שיקול דעת גבוה'],
                  ['Controller של pipeline (תנאים, ניתוב)', 'קוד רגיל', 'אל תשלמו על LLM כשאפשר if/else']
                ]) +
                LA.callout('info', 'שימו לב שגם ClearML עצמו נשאר <b>דטרמיניסטי</b>: הוא מתעד, מריץ ומשכפל; ה-LLM הוא נושא הניסוי או כלי בצעד. ואם בונים סוכן LLM שמפעיל ClearML (למשל "שכפל את הריצה הטובה והחלף dataset"), זה כלי נוסף שהסוכן יכול לקרוא — דרך ה-SDK או שרת MCP עוטף.'));
            }
          },
          {
            id: 'profile', title: 'דרישות · חוזקות · חולשות',
            html: LA.profile({
              requirements: [
                'שרת (Docker Compose / Helm / ClearML מנוהל): MongoDB + Elasticsearch + Redis + fileserver; בייצור — storage חיצוני (S3/GCS/MinIO) וגיבויים',
                'מכונות ל-agents (GPU / CPU), רשת בינן לבין השרת, וגישה ל-git של הקוד',
                'קוד שמותקן ממאגר git נקי עם requirements ברורים (כדי שהשחזור יעבוד)',
                'משמעת צוות: שמות פרויקטים/Tasks, תגיות, והיפר-פרמטרים ב-connect — ולא ב-"קבועים בקוד"'
              ],
              strengths: [
                'איסוף אוטומטי: קוד + git diff + packages + console — בקריאה אחת',
                'פלטפורמה אחת: ניסויים, נתונים, orchestration, pipelines, HPO, registry',
                'Clone &amp; enqueue: ניסוי מבוקר בלי להתחבר למכונה',
                'קוד-פתוח ו-self-host — נתונים רגישים נשארים אצלכם',
                'עובד עם כל framework (PyTorch, HF Transformers, sklearn…) ועם קוד שאינו ML'
              ],
              weaknesses: [
                'תחזוקת שרת: Elasticsearch/Mongo דורשים משאבים וגיבוי ושדרוגים',
                'עקומת למידה: agents, queues, Docker mode, הרשאות',
                'ה-UI פחות מלוטש מ-W&amp;B בחלק מהתרחישים; האקוסיסטם קטן יותר',
                'לא נועד להיות כלי observability ל-LLM בפרודקשן (traces של שיחות) — לזה יש כלים ייעודיים; ClearML חזק ב<i>ניסויים ופיתוח</i>',
                'שחזור "מושלם" תלוי בסביבה (דרייבר CUDA, חומרה) ובנתונים חיצוניים שלא נשמרו'
              ],
              algoTips: [
                'דווחו גם מדדי <b>עלות ו-latency</b>, לא רק איכות — בחירת ה-RAG הטובה ביותר היא Pareto',
                'שמרו על <b>eval set מוקפא</b> ומגורסא; אל תשנו אותו בלי לייצר גרסה חדשה ולחשב ריצות מחדש',
                'הריצו כל קונפיגורציה על כמה seeds ודווחו על טווח, לא נקודה; אל תבחרו מנצח מרעש',
                'הפרידו train/validation/test ב-HPO — אחרת "המנצח" הוא תוצר של overfitting לבדיקה',
                'תייגו את גרסת prompt, מודל ה-LLM של ה-judge, ושם ה-embedding כפרמטרים'
              ],
              whenToUse: [
                '✅ צוות שמריץ הרבה ניסויים, צריך שחזוריות, GPUs משותפים, וגם רוצה self-host',
                '❌ פרויקט קטן עם שלושה ניסויים — גיליון נתונים או MLflow מקומי יספיקו; או צוות שרוצה SaaS מלוטש ולא רוצה לתחזק שרת'
              ]
            })
          },
          {
            id: 'algo', title: 'עין של אלגוריתמאי — צ׳קליסט',
            html: LA.callout('algo', '<b>צ׳קליסט MLOps לצוות שעובד עם LLM</b>') + LA.table(['תחום', 'מה לבדוק'], [
              ['שחזוריות', 'Task.init בכל ריצה; seed מדווח; גרסת dataset נעולה; commit נקי (בלי "uncommitted" בריצות שנספרות); requirements מקובעים; גרסת מודל ה-LLM/ה-API (המודלים המנוהלים משתנים — רשמו מזהה מודל מדויק)'],
              ['הערכה', 'eval מוקפא וחסוי; מדדים לפי שכבה: retrieval (recall@k, MRR), generation (faithfulness, answer relevance), end-to-end; כיול ה-LLM-judge מול תיוג אנושי'],
              ['דליפת נתונים', 'לא לערבב eval ו-train; בדיקת כפילויות בין הקבוצות; תשובות הזהב לא נכנסות ל-index/prompt'],
              ['מובהקות סטטיסטית', 'רעש בין seeds; גודל eval מספיק; אל תסיקו מהפרש 0.01 בריצה אחת'],
              ['עלות ו-latency', 'דווחו $/1k queries ו-p95; HPO עם תקציב; תורים עם הגבלת קונקרנטיות; כיבוי workers חסרי עבודה'],
              ['אבטחה', 'סודות (מפתחות API) לא בפרמטרים/לוגים — משתני סביבה/vault; הרשאות לפרויקטים; סינון PII בנתוני אימון ובלוגים; גישה לשרת רק דרך TLS/אימות'],
              ['בקרת שינויים', 'שער איכות לפני Registry; גרסאות prompt כ-artifacts/פרמטרים; Rollback דרך Registry; canary לפני פריסה מלאה'],
              ['Observability', 'התראה על ריצות שנכשלות/תקועות; מעקב אחרי שימוש GPU; שמירת הדגימות הגרועות ("worst questions") כ-artifact לניתוח']
            ])
          },
          {
            id: 'quiz', title: 'בוחן',
            render(el) {
              LA.quiz(el, [
                { q: 'מה עושה <code>Task.init()</code> מעבר ליצירת רשומה?', options: ['רק פותח חיבור לשרת', 'לוכד אוטומטית קוד (git+diff), סביבה, פרמטרים, console ומדדים', 'מריץ את הקוד על GPU', 'מוחק ריצות ישנות'], answer: 1, explain: 'זה הקסם של ה-Experiment Manager: שורה אחת ו-ClearML לוכד את כל מה שנדרש לשחזור.' },
                { q: 'מה זה "ClearML Agent"?', options: ['סוכן LLM שמפעיל כלים', 'תהליך worker שמושך Tasks מתור ומריץ אותם', 'ספריית RAG', 'משתמש ב-UI'], answer: 1, explain: 'זה worker — לא LLM agent. בלבול שמות נפוץ, חשוב להבחין.' },
                { q: 'איך מבצעים "clone &amp; enqueue" ?', options: ['מעתיקים את הקוד ידנית למכונה', 'משכפלים Task (טיוטה), משנים פרמטר, ושולחים לתור שבו agent מאזין', 'מוחקים את הניסוי המקורי', 'משנים את ה-git'], answer: 1, explain: 'הטיוטה שומרת קוד+סביבה; משנים פרמטרים ושולחים לתור. ה-agent בונה סביבה ומריץ.' },
                { q: 'למה לגרסא eval set בעזרת <code>Dataset</code> ו-<code>finalize()</code>?', options: ['כדי שיתפוס פחות מקום', 'כדי שכל ריצה תושווה על אותו נתונים בלתי משתנים ושיהיה lineage', 'כדי להאיץ את ה-GPU', 'זה חובה של ה-SDK'], answer: 1, explain: 'השוואת ריצות תקפה רק על אותו eval; finalize מקפיא גרסה.' },
                { q: 'בצינור fine-tuning, איזה צעד שייך לתור gpu?', options: ['Preprocess של JSON', 'Fine-tune', 'רישום במטא-דאטה', 'בדיקת פורמט'], answer: 1, explain: 'רק האימון (והפריסה) צריכים GPU. ניקוי נתונים ורישום — cpu/services.' },
                { q: 'באיזה מודל Claude מתאים להריץ בדיקות פורמט זולות על אלפי תשובות, ובאיזה לשיפוט איכות (LLM-as-judge)?', options: ['Opus לשניהם', 'Haiku לבדיקות זולות, Sonnet לשיפוט', 'Sonnet לבדיקות, Haiku לשיפוט', 'אף LLM לא מתאים'], answer: 1, explain: 'משימות פשוטות בנפח גבוה: Haiku (או קוד); שיפוט עדין: Sonnet; Opus להסלמה ולניתוחי עומק.' },
                { q: 'במעבדת ה-RAG, העלאת top_k מ-5 ל-15 עשויה...', options: ['לשפר תמיד את כל המדדים', 'להעלות recall אך להאריך קונטקסט, להעלות עלות ולפגוע ב-faithfulness', 'להקטין עלות', 'לא להשפיע'], answer: 1, explain: 'יש trade-off: יותר קטעים = יותר recall פוטנציאלי, אבל רעש/אורך/עלות. לכן מודדים את כולם ובוחרים לפי Pareto.' },
                { q: 'מה הסיכון בקביעת "המנצח" ב-HPO על אותו validation set שוב ושוב?', options: ['אין סיכון', 'התאמת-יתר למבחן — צריך test נפרד שנבדק פעם אחת', 'ה-agent נתקע', 'ה-UI קורס'], answer: 1, explain: 'כל בחירה לפי validation "מנצלת" את הרעש שלו. test נפרד נותן הערכה כנה.' }
              ]);
            }
          }
        ]
      });
    }
  });
})();
