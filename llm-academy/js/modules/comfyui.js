(function () {
  'use strict';
  const h = LA.h, s = LA.s;

  /* ====================================================================
     Code samples (String.raw keeps backslashes intact)
     ==================================================================== */
  const WORKFLOW_JSON = String.raw`{
  "4": {
    "class_type": "CheckpointLoaderSimple",
    "inputs": { "ckpt_name": "sd_xl_base_1.0.safetensors" }
  },
  "5": {
    "class_type": "EmptyLatentImage",
    "inputs": { "width": 1024, "height": 1024, "batch_size": 1 }
  },
  "6": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "text": "warm Hanukkah poster, girl lighting candles by a window, soft light",
      "clip": ["4", 1]
    }
  },
  "7": {
    "class_type": "CLIPTextEncode",
    "inputs": { "text": "blurry, extra fingers, watermark, text", "clip": ["4", 1] }
  },
  "3": {
    "class_type": "KSampler",
    "inputs": {
      "seed": 156680208700286,
      "steps": 25,
      "cfg": 6.5,
      "sampler_name": "euler",
      "scheduler": "normal",
      "denoise": 1.0,
      "model": ["4", 0],
      "positive": ["6", 0],
      "negative": ["7", 0],
      "latent_image": ["5", 0]
    }
  },
  "8": {
    "class_type": "VAEDecode",
    "inputs": { "samples": ["3", 0], "vae": ["4", 2] }
  },
  "9": {
    "class_type": "SaveImage",
    "inputs": { "filename_prefix": "poster", "images": ["8", 0] }
  }
}`;

  const PY_CLIENT = String.raw`import json, time, uuid
import urllib.request, urllib.parse

SERVER = "http://127.0.0.1:8188"          # ComfyUI default port
CLIENT_ID = str(uuid.uuid4())             # lets the websocket route progress events to us

def queue_prompt(workflow: dict) -> str:
    """POST the API-format graph. Returns prompt_id."""
    body = json.dumps({"prompt": workflow, "client_id": CLIENT_ID}).encode()
    req = urllib.request.Request(f"{SERVER}/prompt", data=body,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        return json.load(r)["prompt_id"]   # a 400 here = validation error (node_errors)

def wait_for_result(prompt_id: str, poll_s: float = 1.0) -> dict:
    """Poll /history until the job appears there (= finished)."""
    while True:
        with urllib.request.urlopen(f"{SERVER}/history/{prompt_id}") as r:
            hist = json.load(r)
        if prompt_id in hist:
            return hist[prompt_id]["outputs"]   # {"9": {"images": [{filename, subfolder, type}]}}
        time.sleep(poll_s)

def fetch_image(info: dict) -> bytes:
    q = urllib.parse.urlencode(info)       # filename, subfolder, type
    with urllib.request.urlopen(f"{SERVER}/view?{q}") as r:
        return r.read()

if __name__ == "__main__":
    wf = json.load(open("txt2img_api.json"))      # exported with "Save (API Format)"
    wf["3"]["inputs"]["seed"] = 42                # patch parameters programmatically
    wf["6"]["inputs"]["text"] = "a lighthouse at dawn, 35mm photo"
    pid = queue_prompt(wf)
    outputs = wait_for_result(pid)
    img = fetch_image(outputs["9"]["images"][0])
    open("out.png", "wb").write(img)
    print("saved out.png for prompt", pid)`;

  const PY_CLAUDE = String.raw`import base64, json
import anthropic
from comfy_client import queue_prompt, wait_for_result, fetch_image   # the script above

client = anthropic.Anthropic()
HAIKU, SONNET = "claude-haiku-5-5", "claude-sonnet-5-5"

PROMPT_SYSTEM = """You write prompts for an SDXL text-to-image model.
Input: a short request in Hebrew. Output ONLY JSON:
{"positive": "<English, comma separated visual descriptors>",
 "negative": "<English, things to avoid>", "width": 1024, "height": 1024}"""

def expand_prompt(request_he: str, feedback: str = "") -> dict:
    # cheap + fast + high volume -> Haiku
    msg = client.messages.create(
        model=HAIKU, max_tokens=500, system=PROMPT_SYSTEM,
        messages=[{"role": "user", "content": request_he + ("\nFix: " + feedback if feedback else "")}],
    )
    return json.loads(msg.content[0].text)

def judge(image_png: bytes, request_he: str) -> dict:
    # needs real visual understanding -> Sonnet (Opus only if you escalate hard cases)
    b64 = base64.standard_b64encode(image_png).decode()
    msg = client.messages.create(
        model=SONNET, max_tokens=400,
        system='Judge the image against the request. Return ONLY JSON: {"score": 0-1, "issues": ["..."], "fix": "<prompt change>"}',
        messages=[{"role": "user", "content": [
            {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": b64}},
            {"type": "text", "text": "Original request (Hebrew): " + request_he},
        ]}],
    )
    return json.loads(msg.content[0].text)

def generate(request_he: str, workflow: dict, max_rounds: int = 3, threshold: float = 0.75):
    feedback = ""
    for round_no in range(max_rounds):
        p = expand_prompt(request_he, feedback)
        wf = json.loads(json.dumps(workflow))               # deep copy of the template
        wf["6"]["inputs"]["text"] = p["positive"]
        wf["7"]["inputs"]["text"] = p["negative"]
        wf["5"]["inputs"].update(width=p["width"], height=p["height"])
        wf["3"]["inputs"]["seed"] = 1000 + round_no          # new seed => only KSampler.. re-run
        out = wait_for_result(queue_prompt(wf))
        png = fetch_image(out["9"]["images"][0])
        verdict = judge(png, request_he)
        if verdict["score"] >= threshold:
            return png, verdict
        feedback = verdict["fix"]                             # close the loop
    return png, verdict                                       # best effort + flag for a human`;

  const PY_TOOL = String.raw`# Exposing ComfyUI to an agent as a TOOL (the agent decides when to render)
from anthropic import beta_tool

@beta_tool
def render_image(positive: str, negative: str = "", width: int = 1024, height: int = 1024, seed: int = 0) -> str:
    """Render an image with the local ComfyUI server and return the saved file path.

    Args:
        positive: English diffusion prompt.
        negative: Things to avoid.
        width: Pixel width (multiple of 8, model-native sizes work best).
        height: Pixel height.
        seed: Seed for reproducibility.
    """
    wf = load_template("txt2img_api.json")        # your helper
    wf["6"]["inputs"]["text"] = positive
    wf["7"]["inputs"]["text"] = negative
    wf["5"]["inputs"].update(width=width, height=height)
    wf["3"]["inputs"]["seed"] = seed
    out = wait_for_result(queue_prompt(wf))
    path = save_png(fetch_image(out["9"]["images"][0]))   # your helper
    return path

client = anthropic.Anthropic()
runner = client.beta.messages.tool_runner(
    model="claude-sonnet-5-5", max_tokens=2000, tools=[render_image],
    messages=[{"role": "user", "content": "תכין לי באנר לחנוכה לאתר החברה, ושלח לי נתיב לקובץ"}],
)
for message in runner:
    print(message.content)
# The same capability can be offered over MCP: a small MCP server that wraps the
# 3 HTTP calls above, so any MCP-capable agent can call "render_image".`;

  /* ====================================================================
     Drill-down diagram specs
     ==================================================================== */
  const T = { MODEL: '#b39ddb', CLIP: '#ffd500', VAE: '#ff6e6e', COND: '#ffa931', LATENT: '#ff9cf9', IMAGE: '#64b5f6' };

  // --- level 4: one cross-attention unit
  const crossAttnSpec = {
    title: 'Cross-Attention', width: 900, height: 400,
    intro: '<p><b>יחידת Cross-Attention אחת</b> — הנקודה שבה הטקסט "נכנס" לתמונה. כל מיקום בלטנט שואל "לאיזו מילה בפרומפט אני צריך להקשיב?".</p>',
    nodes: [
      { id: 'lat', x: 780, y: 90, w: 160, h: 60, label: 'פיצ׳רים של הלטנט', sub: '4096 מיקומים × d', color: 'ctrl', info: '<p>במפת הלטנט 64×64 יש 4096 "טלאי" (positions). כל אחד הוא וקטור פיצ׳רים בגודל <code>d</code> (למשל 640). ממנו נוצרת <b>Query</b>.</p>' },
      { id: 'txt', x: 780, y: 310, w: 160, h: 60, label: 'טוקני טקסט', sub: '77 × 768 (CONDITIONING)', color: 'llm', info: '<p>הפלט של מקודד הטקסט. כל שורה = טוקן אחד בהקשרו. ממנו נוצרים <b>Key</b> ו-<b>Value</b>. שימו לב: הטקסט כבר "מוכן" — Transformer רגיל, כמו LLM, חישב אותו קודם.</p>' },
      { id: 'q', x: 570, y: 90, w: 120, h: 50, label: 'Q = X·Wq', color: 'data', info: '<p><b>Query</b>: "מה אני מחפש?" — נגזר מהתמונה. צורה: 4096 × d<sub>k</sub>.</p>' },
      { id: 'k', x: 570, y: 250, w: 120, h: 50, label: 'K = C·Wk', color: 'tool', info: '<p><b>Key</b>: "על מה אני מדבר?" — נגזר מהטקסט. צורה: 77 × d<sub>k</sub>.</p>' },
      { id: 'v', x: 570, y: 340, w: 120, h: 50, label: 'V = C·Wv', color: 'tool', info: '<p><b>Value</b>: "מה אני תורם אם מקשיבים לי" — התוכן שיוזרק לתמונה. צורה: 77 × d<sub>v</sub>.</p>' },
      { id: 'sc', x: 380, y: 170, w: 150, h: 56, label: 'softmax(QKᵀ/√d)', sub: 'מפת קשב 4096×77', color: 'neuron', info: '<p>לכל מיקום בתמונה מתקבלת התפלגות על 77 הטוקנים. בקוד של ניתוח "היכן המילה <i>כובע</i> משפיעה" מציירים בדיוק את העמודה של הטוקן הזה כתמונה (attention map) — כך עובדים כלי כמו Prompt-to-Prompt.</p><p>זו אותה נוסחת attention כמו ב-LLM; ההבדל היחיד: ה-Q וה-K/V באים משני מקורות שונים (לכן "cross").</p>' },
      { id: 'mix', x: 220, y: 250, w: 130, h: 50, label: '× V', sub: 'ממוצע משוקלל', color: 'neuron', info: '<p>כל מיקום מקבל <b>ממוצע משוקלל של ה-Values</b> של הטוקנים שבהם הוא התעניין. צורה: 4096 × d<sub>v</sub>.</p>' },
      { id: 'out', x: 70, y: 170, w: 120, h: 56, label: 'פלט + residual', sub: 'חזרה לתמונה', color: 'ok', info: '<p>הפלט עובר היטל פלט <code>Wo</code> ונוסף (residual) לפיצ׳רים של הלטנט. כך המידע "יש כאן כובע" משנה את החיזוי של הרעש בדיוק במקומות הרלוונטיים.</p>' }
    ],
    edges: [
      { from: 'lat', to: 'q' }, { from: 'txt', to: 'k' }, { from: 'txt', to: 'v' },
      { from: 'q', to: 'sc', label: 'Q' }, { from: 'k', to: 'sc', label: 'Kᵀ' },
      { from: 'sc', to: 'mix' }, { from: 'v', to: 'mix', label: 'V' }, { from: 'mix', to: 'out' }
    ]
  };

  // --- level 3: one denoising step (U-Net / DiT forward + CFG + scheduler)
  const stepSpec = {
    title: 'צעד דנויזינג אחד', width: 900, height: 440,
    intro: '<p><b>צעד אחד מתוך N.</b> הרשת (U-Net או DiT) מקבלת לטנט רועש, חותמת זמן והתניה, ומחזירה "ניחוש" של הרעש. שני מעברים (עם/בלי פרומפט) נשלבים ב-CFG ומעדכנים את הלטנט.</p>',
    nodes: [
      { id: 'xt', x: 790, y: 220, w: 130, h: 60, label: 'לטנט xₜ', sub: 'רועש', color: 'ctrl', info: '<p>הלטנט הנוכחי, למשל <code>[1,4,128,128]</code> ב-SDXL ברזולוציה 1024. בצעד הראשון זה רעש גאוסי טהור (או לטנט מקודד + רעש ב-img2img).</p>' },
      { id: 'temb', x: 790, y: 90, w: 130, h: 50, label: 'Timestep / σ', color: 'data', info: '<p>מספר הצעד (רמת הרעש) מומר ל-embedding סינוסואידי ומוזרק לכל בלוק — כך הרשת יודעת "כמה רעש יש כאן" ושונה בהתנהגותה בתחילת הדרך מאשר בסוף.</p>' },
      { id: 'cond', x: 790, y: 350, w: 130, h: 50, label: 'positive/negative', sub: 'CONDITIONING', color: 'llm', info: '<p>שני טנסורי טקסט: החיובי והשלילי. השלילי משמש כ"unconditional" ב-CFG (במקום פרומפט ריק).</p>' },
      { id: 'net', x: 570, y: 220, w: 160, h: 80, label: 'U-Net / DiT', sub: '×2 מעברים', color: 'llm', info: '<p>הרשת עצמה: בלוקי קונבולוציה/טרנספורמר עם <b>self-attention</b> (על הלטנט) ו-<b>cross-attention</b> (לטקסט). עם cfg&gt;1 מריצים אותה פעמיים (batch של 2) — לכן <b>cfg=1 כמעט מחצית מהזמן</b>.</p><p>מודלים חדשים (SD3, Flux) מחליפים U-Net ב-<b>DiT</b> — Transformer על טלאי-לטנט, קרוב עוד יותר לארכיטקטורת LLM.</p>', children: crossAttnWrap() },
      { id: 'epsc', x: 380, y: 140, w: 130, h: 50, label: 'ε(cond)', color: 'ok', info: '<p>ניחוש הרעש כשהרשת רואה את הפרומפט החיובי.</p>' },
      { id: 'epsu', x: 380, y: 300, w: 130, h: 50, label: 'ε(uncond)', color: 'warn', info: '<p>ניחוש הרעש עם הפרומפט השלילי / ריק — "מה היה קורה בלי הנחיה".</p>' },
      { id: 'cfg', x: 210, y: 220, w: 170, h: 70, label: 'CFG', sub: 'u + s·(c − u)', color: 'neuron', info: '<p><b>Classifier-Free Guidance</b>: <code>ε = ε_u + cfg·(ε_c − ε_u)</code>. מרחיקים את הניחוש מכיוון "בלי פרומפט" לכיוון "עם פרומפט". cfg גבוה = הקפדה על הפרומפט, אבל גם צבעים צורבים וחוסר גיוון.</p>' },
      { id: 'sch', x: 60, y: 90, w: 110, h: 56, label: 'Scheduler', sub: 'xₜ → xₜ₋₁', color: 'tool', info: '<p>ה-<b>sampler/scheduler</b> (euler, dpmpp_2m, karras...) מחליט כמה רעש להוריד בצעד הזה ואיך (סדר 1, סדר 2...). זה לא "למידה" — זו נוסחת אינטגרציה של משוואה דיפרנציאלית.</p>' },
      { id: 'xn', x: 60, y: 330, w: 110, h: 56, label: 'xₜ₋₁', sub: 'פחות רעש', color: 'ctrl', info: '<p>הלטנט המעודכן — נכנס כקלט לצעד הבא. אחרי הצעד האחרון זה הלטנט הנקי שיעבור ל-VAE Decode.</p>' }
    ],
    edges: [
      { from: 'xt', to: 'net' }, { from: 'temb', to: 'net', dashed: true }, { from: 'cond', to: 'net', dashed: true },
      { from: 'net', to: 'epsc' }, { from: 'net', to: 'epsu' },
      { from: 'epsc', to: 'cfg' }, { from: 'epsu', to: 'cfg' },
      { from: 'cfg', to: 'sch' }, { from: 'xt', to: 'sch', dashed: true, bend: -90 }, { from: 'sch', to: 'xn' }
    ]
  };
  function crossAttnWrap() { return crossAttnSpec; }

  // --- level 2: KSampler's loop
  const loopSpec = {
    title: 'KSampler — הלולאה', width: 900, height: 360,
    intro: '<p>KSampler הוא <b>לולאה</b>, לא רשת. הוא קורא לרשת הדנויזינג N פעמים ומעדכן את הלטנט.</p>',
    nodes: [
      { id: 'noise', x: 790, y: 180, w: 130, h: 60, label: 'רעש התחלתי', sub: 'מה-seed', color: 'ctrl', info: '<p>רעש גאוסי שנוצר מה-<b>seed</b>: אותו seed + אותם הגדרות + אותו חומרה/גרסה = אותה תמונה. לכן שומרים seed בכל ניסוי.</p><p>ב-img2img: הלטנט של התמונה המקורית + רעש לפי <code>denoise</code>.</p>' },
      { id: 'sig', x: 620, y: 70, w: 150, h: 50, label: 'לוח σ', sub: 'scheduler + steps', color: 'tool', info: '<p>רשימת רמות רעש יורדת (σ₀ &gt; σ₁ &gt; ... &gt; 0) באורך <code>steps</code>. ה-scheduler (normal, karras, simple...) קובע את הצורה שלה. <code>denoise&lt;1</code> חותך את ההתחלה ומשאיר רק את הסוף.</p>' },
      { id: 'stp', x: 440, y: 180, w: 170, h: 80, label: 'צעד דנויזינג', sub: 'חוזרים steps פעמים', color: 'llm', info: '<p>לחצו "צלול" כדי לראות מה קורה בצעד אחד: הרשת + CFG + עדכון.</p>', children: stepSpec },
      { id: 'chk', x: 260, y: 180, w: 120, h: 64, label: 'עוד צעדים?', shape: 'diamond', color: 'ctrl', info: '<p>אם נשארו צעדים — חוזרים. אחרת סיימנו.</p>' },
      { id: 'fin', x: 80, y: 180, w: 120, h: 60, label: 'לטנט נקי', sub: 'LATENT', color: 'ok', info: '<p>הלטנט הסופי עובר ל-VAE Decode. הוא עדיין לא תמונה — זה טנסור קטן פי 8 בכל ציר.</p>' }
    ],
    edges: [
      { from: 'noise', to: 'stp' }, { from: 'sig', to: 'stp', dashed: true },
      { from: 'stp', to: 'chk' }, { from: 'chk', to: 'stp', label: 'כן', bend: 70, color: 'ctrl' }, { from: 'chk', to: 'fin', label: 'לא' }
    ]
  };

  function smallChain(items, W) {
    // right-to-left chain of boxes
    W = W || 900;
    const n = items.length, gap = (W - 80) / n, nodes = [], edges = [];
    items.forEach((it, i) => {
      nodes.push(Object.assign({ id: 'n' + i, x: W - 40 - gap * (i + 0.5), y: 110, w: Math.min(140, gap - 24), h: 62, color: 'data' }, it));
      if (i) edges.push({ from: 'n' + (i - 1), to: 'n' + i });
    });
    return { width: W, height: 220, nodes, edges };
  }

  const ckptSpec = {
    title: 'קובץ ה-checkpoint', width: 900, height: 340,
    intro: '<p>קובץ <code>.safetensors</code> אחד מכיל <b>שלושה מודלים נפרדים</b>, ו-Load Checkpoint מפצל אותם לשלושה שקעים.</p>',
    nodes: [
      { id: 'file', x: 790, y: 170, w: 150, h: 70, label: '.safetensors', sub: '2–7GB בדיסק', shape: 'db', color: 'store', info: '<p>פורמט טנסורים בטוח (לא pickle — לא מריץ קוד בטעינה). פורמט <code>.ckpt</code> ישן מבוסס pickle ויכול להריץ קוד זדוני — העדיפו safetensors.</p>' },
      { id: 'unet', x: 470, y: 60, w: 190, h: 70, label: 'MODEL: U-Net / DiT', sub: '~2.6B פרמטרים (SDXL)', color: 'llm', info: '<p>רשת הדנויזינג — הלב. SD1.5: ~860M פרמטרים. SDXL: ~2.6B. Flux/SD3: DiT של מיליארדים.</p><p>זה ה-MODEL שמוזן ל-KSampler, וגם זה ש-LoRA "מטלאת".</p>' },
      { id: 'clip', x: 470, y: 170, w: 190, h: 70, label: 'CLIP: מקודד טקסט', sub: 'Transformer — קרוב ל-LLM', color: 'llm', info: '<p>Transformer של טקסט (SD1.5: CLIP ViT-L, ~123M; SDXL: שניים; SD3/Flux: גם T5-XXL ענק). <b>זו אותה משפחה של LLM</b> — טוקנייזר, embeddings, שכבות attention. נבחן אותו בצלילה לצומת ה-CLIP Text Encode.</p>' },
      { id: 'vae', x: 470, y: 280, w: 190, h: 70, label: 'VAE', sub: 'פיקסלים ↔ לטנט', color: 'data', info: '<p>Autoencoder: Encoder דוחס תמונה ללטנט קטן פי 8×8; Decoder משחזר. הדיפוזיה עובדת בלטנט כי זה זול בסדרי גודל (64×64×4 במקום 512×512×3).</p>' },
      { id: 'ks', x: 150, y: 60, w: 130, h: 50, label: 'אל KSampler', color: 'ext', info: '<p>שקע MODEL.</p>' },
      { id: 'ce', x: 150, y: 170, w: 130, h: 50, label: 'אל CLIP Text Encode', color: 'ext', info: '<p>שקע CLIP.</p>' },
      { id: 'vd', x: 150, y: 280, w: 130, h: 50, label: 'אל VAE Decode', color: 'ext', info: '<p>שקע VAE.</p>' }
    ],
    edges: [{ from: 'file', to: 'unet' }, { from: 'file', to: 'clip' }, { from: 'file', to: 'vae' }, { from: 'unet', to: 'ks', color: T.MODEL }, { from: 'clip', to: 'ce', color: T.CLIP }, { from: 'vae', to: 'vd', color: T.VAE }]
  };

  const clipSpec = {
    title: 'CLIP Text Encode', width: 900, height: 250,
    intro: '<p>מהמחרוזת לטנסור התניה — <b>בדיוק כמו תחילת הדרך של LLM</b>: טוקניזציה → embeddings → שכבות Transformer.</p>',
    nodes: [
      { id: 'txt', x: 810, y: 120, w: 130, h: 60, label: 'מחרוזת', sub: '"a red hat"', color: 'ui', info: '<p>הפרומפט כטקסט. שימו לב: מקודדי CLIP אוהבים אנגלית ותיאורים חזותיים; עברית עובדת גרוע במודלים ישנים (נתוני האימון באנגלית) — לכן מתרגמים עם LLM.</p>' },
      { id: 'tok', x: 650, y: 120, w: 120, h: 60, label: 'Tokenizer', sub: 'BPE · חותך ל-77', color: 'data', info: '<p>אותו רעיון כמו LLM: מחרוזת → מזהי טוקנים. ב-CLIP יש <b>חלון של 77 טוקנים</b> (כולל התחלה/סיום) — פרומפט ארוך נחתך או מפוצל ל-chunks (ComfyUI מטפל בזה אוטומטית). מודלים חדשים עם T5/LLM מקבלים הרבה יותר.</p>' },
      { id: 'emb', x: 490, y: 120, w: 130, h: 60, label: 'Embedding', sub: '+ מיקום', color: 'neuron', info: '<p>כל טוקן הופך לוקטור (768 ב-CLIP ViT-L) + embedding מיקום — בדיוק כמו בשכבה הראשונה של LLM.</p>' },
      { id: 'trf', x: 320, y: 120, w: 150, h: 60, label: '12 שכבות Transformer', sub: 'causal self-attention', color: 'llm', info: '<p>שכבות self-attention + MLP. CLIP משתמש במסכה סיבתית — ממש כמו LLM מסוג decoder. ההבדל: אומן <i>ביחד עם</i> מקודד תמונה כך שטקסט ותמונה "חיים" באותו מרחב.</p><p>ב-SDXL: שני מקודדים משורשרים. ב-SD3/Flux: T5-XXL (מודל שפה של ~4.7B פרמטרים בצד המקודד) נוסף. מודלים חדשים משתמשים אפילו ב-LLM מלא בתור מקודד טקסט.</p>' },
      { id: 'cond', x: 110, y: 120, w: 150, h: 60, label: 'CONDITIONING', sub: '77 × 768', color: 'warn', info: '<p>טנסור <code>[77, 768]</code> (וגם וקטור pooled). זה מה שנכנס כ-K/V ל-cross-attention בכל בלוק של הרשת. <b>הוא לא תמונה ולא טקסט — זה "משמעות" מספרית.</b></p>' }
    ],
    edges: [{ from: 'txt', to: 'tok' }, { from: 'tok', to: 'emb' }, { from: 'emb', to: 'trf' }, { from: 'trf', to: 'cond' }]
  };

  const vaeSpec = {
    title: 'VAE Decode', width: 900, height: 230,
    nodes: [
      { id: 'l', x: 790, y: 110, w: 150, h: 64, label: 'לטנט', sub: '4 × 128 × 128', color: 'ctrl', info: '<p>ב-SDXL ברזולוציה 1024: לטנט 128×128 עם 4 ערוצים (~65K מספרים) לעומת 3.1M ערכי פיקסל.</p>' },
      { id: 'u', x: 540, y: 110, w: 170, h: 64, label: 'Upsample ×8', sub: 'conv + resnet + attn', color: 'data', info: '<p>ה-Decoder של ה-VAE: בלוקי קונבולוציה, כמה שכבות attention, והגדלה פי 8 בכל ציר. זה גם הצוואר-בקבוק של VRAM — לכן יש Tiled VAE Decode לתמונות גדולות.</p>' },
      { id: 'p', x: 290, y: 110, w: 150, h: 64, label: 'IMAGE', sub: '3 × 1024 × 1024', color: 'ok', info: '<p>טנסור פיקסלים בטווח 0..1. הוא יכול להמשיך לצומת אחר (upscale, face-fix) או ל-Save Image.</p>' },
      { id: 'f', x: 80, y: 110, w: 110, h: 56, label: 'PNG', sub: 'עם workflow ב-metadata', color: 'store', info: '<p>Save Image מטמיע את <b>כל גרף ה-workflow כ-JSON בתוך מטא-דאטה של ה-PNG</b>. גוררים את ה-PNG חזרה ל-ComfyUI והגרף חוזר. מעולה לשחזור — ושימו לב לדליפת פרומפטים כשמפרסמים תמונות.</p>' }
    ],
    edges: [{ from: 'l', to: 'u' }, { from: 'u', to: 'p' }, { from: 'p', to: 'f' }]
  };

  const graphSpec = {
    title: 'גרף txt2img', width: 900, height: 420,
    intro: '<p><b>Workflow של ComfyUI = גרף מכוון חסר-מעגלים (DAG)</b>. כל צומת = פונקציה; כל חוט = טנסור מסוג מוגדר. לחצו על צומת, ו-⤵ מסמן צמתים שאפשר לפתוח עד רמת צעד דנויזינג בודד ועד יחידת attention אחת.</p>',
    groups: [{ x: 500, y: 20, w: 190, h: 350, label: 'מקודדי קלט', color: 'llm' }],
    nodes: [
      { id: 'ckpt', x: 800, y: 210, w: 150, h: 64, icon: '📦', label: 'Load Checkpoint', sub: 'MODEL·CLIP·VAE', color: 'store', children: ckptSpec, info: '<p>טוען את קובץ המשקולות מהדיסק ל-VRAM/RAM ומוציא <b>שלושה שקעים</b>. זה הצומת <b>היקר ביותר בריצה הראשונה</b> (שניות), ואחר כך הוא נשמר ב-cache.</p><p>פרמטר: <code>ckpt_name</code>.</p>' },
      { id: 'pos', x: 600, y: 70, w: 160, h: 56, icon: '➕', label: 'CLIP Text Encode', sub: 'positive', color: 'llm', children: clipSpec, info: '<p>הופך את הפרומפט החיובי ל-CONDITIONING. קלט: <code>clip</code> + טקסט. כאן ה-Transformer "של ה-LLM" נכנס לתמונה.</p>' },
      { id: 'neg', x: 600, y: 160, w: 160, h: 56, icon: '➖', label: 'CLIP Text Encode', sub: 'negative', color: 'llm', children: clipSpec, info: '<p>אותו צומת, פרומפט שני — "מה לא רוצים". מוזן כ-negative ל-KSampler ומשמש כ-uncond ב-CFG.</p>' },
      { id: 'lat', x: 600, y: 345, w: 160, h: 56, icon: '▦', label: 'Empty Latent Image', sub: 'width·height·batch', color: 'ctrl', info: '<p>לטנט ריק (אפסים) בגודל <code>H/8 × W/8 × 4</code>. הוא קובע את <b>רזולוציית הפלט</b> ואת ה-batch. ה-KSampler יחליף אותו ברעש לפי ה-seed. (ב-img2img מחליפים אותו ב-VAE Encode של תמונה.)</p>' },
      { id: 'ks', x: 400, y: 210, w: 160, h: 80, icon: '🎲', label: 'KSampler', sub: 'seed·steps·cfg·sampler', color: 'neuron', children: loopSpec, info: '<p>הלב: לולאת הדנויזינג. פרמטרים: <code>seed, steps, cfg, sampler_name, scheduler, denoise</code>. קלט: model, positive, negative, latent_image.</p><p>זה צומת ה"חישוב": 95% מהזמן והזיכרון. צלול פנימה ⤵</p>' },
      { id: 'vae', x: 235, y: 210, w: 140, h: 60, icon: '🖼️', label: 'VAE Decode', sub: 'לטנט → פיקסלים', color: 'data', children: vaeSpec, info: '<p>ממיר לטנט לתמונה אמיתית. קלט: samples + vae.</p>' },
      { id: 'save', x: 80, y: 210, w: 120, h: 56, icon: '💾', label: 'Save Image', sub: 'IMAGE → קובץ', color: 'ok', info: '<p>צומת פלט. הוא גם <b>מה שמפעיל את הגרף</b>: ComfyUI מריץ רק צמתים שמובילים לצומת פלט (Output node) — לא הכול.</p>' }
    ],
    edges: [
      { from: 'ckpt', to: 'pos', label: 'CLIP', color: T.CLIP }, { from: 'ckpt', to: 'neg', color: T.CLIP },
      { from: 'ckpt', to: 'ks', label: 'MODEL', color: T.MODEL },
      { from: 'ckpt', to: 'vae', label: 'VAE', color: T.VAE, bend: -150 },
      { from: 'pos', to: 'ks', label: 'COND', color: T.COND }, { from: 'neg', to: 'ks', color: T.COND },
      { from: 'lat', to: 'ks', label: 'LATENT', color: T.LATENT },
      { from: 'ks', to: 'vae', label: 'LATENT', color: T.LATENT }, { from: 'vae', to: 'save', label: 'IMAGE', color: T.IMAGE }
    ]
  };

  /* ====================================================================
     LAB 1 — node editor with re-execution tracking
     ==================================================================== */
  function labEditor(el) {
    const SOCK = T;
    const nodes = [
      { id: 'ckpt', title: 'Load Checkpoint', x: 12, y: 95, w: 175, ins: [], outs: [['MODEL', 'MODEL'], ['CLIP', 'CLIP'], ['VAE', 'VAE']], hint: 'טוען משקולות מהדיסק — ריצה ראשונה בלבד', widgets: [['ckpt_name', 'select', 'sd_xl_base_1.0', ['sd_xl_base_1.0', 'sd15_pruned', 'flux1-dev-fp8']]] },
      { id: 'pos', title: 'CLIP Text Encode (+)', x: 232, y: 8, w: 190, ins: [['clip', 'CLIP']], outs: [['COND', 'CONDITIONING']], widgets: [['text', 'text', 'warm hanukkah poster, soft candle light']] },
      { id: 'neg', title: 'CLIP Text Encode (−)', x: 232, y: 118, w: 190, ins: [['clip', 'CLIP']], outs: [['COND', 'CONDITIONING']], widgets: [['text', 'text', 'blurry, watermark, extra fingers']] },
      { id: 'lat', title: 'Empty Latent Image', x: 232, y: 232, w: 190, ins: [], outs: [['LATENT', 'LATENT']], widgets: [['width', 'num', 1024], ['height', 'num', 1024], ['batch_size', 'num', 1]] },
      { id: 'ks', title: 'KSampler', x: 470, y: 62, w: 200, ins: [['model', 'MODEL'], ['positive', 'CONDITIONING'], ['negative', 'CONDITIONING'], ['latent_image', 'LATENT']], outs: [['LATENT', 'LATENT']], widgets: [['seed', 'num', 156680], ['steps', 'num', 25], ['cfg', 'num', 6.5], ['sampler_name', 'select', 'euler', ['euler', 'dpmpp_2m', 'dpmpp_sde', 'uni_pc']], ['scheduler', 'select', 'normal', ['normal', 'karras', 'simple']], ['denoise', 'num', 1]] },
      { id: 'vae', title: 'VAE Decode', x: 712, y: 62, w: 160, ins: [['samples', 'LATENT'], ['vae', 'VAE']], outs: [['IMAGE', 'IMAGE']], widgets: [] },
      { id: 'save', title: 'Save Image', x: 712, y: 200, w: 160, ins: [['images', 'IMAGE']], outs: [], widgets: [['filename_prefix', 'text', 'poster']] }
    ];
    const byId = {}; nodes.forEach(n => { byId[n.id] = n; n.vals = {}; n.widgets.forEach(w => n.vals[w[0]] = w[2]); n.h = 36 + Math.max(n.ins.length, n.outs.length) * 20 + n.widgets.length * 18 + 4; });
    const edges = [['ckpt', 0, 'pos', 0], ['ckpt', 1, 'neg', 0], ['ckpt', 0, 'ks', 0], ['pos', 0, 'ks', 1], ['neg', 0, 'ks', 2], ['lat', 0, 'ks', 3], ['ks', 0, 'vae', 0], ['ckpt', 2, 'vae', 1], ['vae', 0, 'save', 0]];
    // fix: ckpt CLIP output index 1 feeds both encoders
    edges[0][1] = 1; edges[1][1] = 1;
    const down = id => { const seen = new Set([id]), q = [id]; while (q.length) { const c = q.shift(); edges.forEach(e => { if (e[0] === c && !seen.has(e[2])) { seen.add(e[2]); q.push(e[2]); } }); } return seen; };
    const dirty = new Set(nodes.map(n => n.id));
    let selected = 'ks', randomize = false, runs = 0, totalSaved = 0;

    const svg = s('svg', { viewBox: '0 0 890 330', style: 'direction:ltr' });
    const canvas = h('div', { class: 'comfyui-canvas' }, svg);
    const panel = h('div', { class: 'comfyui-panel' });
    const log = h('div', { class: 'out', style: { marginTop: '10px', minHeight: '90px' } });
    const nodeEls = {};

    const cost = n => {
      const v = byId.lat.vals, mp = (v.width * v.height) / (1024 * 1024), k = byId.ks.vals;
      if (n.id === 'ckpt') return 3500;
      if (n.id === 'pos' || n.id === 'neg') return 60;
      if (n.id === 'lat') return 3;
      if (n.id === 'ks') return Math.round(k.steps * (k.cfg > 1 ? 2 : 1) * 95 * mp * v.batch_size * (k.denoise));
      if (n.id === 'vae') return Math.round(450 * mp * v.batch_size);
      return 40;
    };
    const sp = (n, kind, i) => [kind === 'in' ? n.x : n.x + n.w, n.y + 38 + i * 20];

    function draw() {
      svg.innerHTML = '';
      edges.forEach(e => {
        const a = byId[e[0]], b = byId[e[2]], [x1, y1] = sp(a, 'out', e[1]), [x2, y2] = sp(b, 'in', e[3]);
        const col = SOCK[a.outs[e[1]][1] === 'CONDITIONING' ? 'COND' : a.outs[e[1]][1]];
        const dx = Math.max(40, (x2 - x1) / 2);
        svg.appendChild(s('path', { d: `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`, class: 'comfyui-wire' + (dirty.has(b.id) ? ' dirty' : ''), stroke: col }));
      });
      nodes.forEach(n => {
        const g = s('g', { class: 'comfyui-node' + (selected === n.id ? ' sel' : '') + (dirty.has(n.id) ? ' dirty' : ''), transform: `translate(0,0)`, tabindex: 0 });
        g.appendChild(s('rect', { x: n.x, y: n.y, width: n.w, height: n.h, rx: 8, class: 'cu-body' }));
        g.appendChild(s('rect', { x: n.x, y: n.y, width: n.w, height: 22, rx: 8, fill: '#222' }));
        g.appendChild(s('text', { x: n.x + 9, y: n.y + 15, class: 'cu-title' }, n.title));
        g.appendChild(s('circle', { cx: n.x + n.w - 10, cy: n.y + 11, r: 4.5, fill: dirty.has(n.id) ? '#f59e0b' : '#4ade80' }));
        n.ins.forEach((p, i) => { const [x, y] = sp(n, 'in', i); g.appendChild(s('circle', { cx: x, cy: y, r: 5, fill: SOCK[p[1] === 'CONDITIONING' ? 'COND' : p[1]] })); g.appendChild(s('text', { x: x + 9, y: y + 4 }, p[0])); });
        n.outs.forEach((p, i) => { const [x, y] = sp(n, 'out', i); g.appendChild(s('circle', { cx: x, cy: y, r: 5, fill: SOCK[p[1] === 'CONDITIONING' ? 'COND' : p[1]] })); g.appendChild(s('text', { x: x - 9, y: y + 4, 'text-anchor': 'end' }, p[0])); });
        const wy = n.y + 38 + Math.max(n.ins.length, n.outs.length) * 20;
        n.widgets.forEach((w, i) => {
          g.appendChild(s('rect', { x: n.x + 8, y: wy + i * 18 - 6, width: n.w - 16, height: 16, rx: 4, fill: '#222' }));
          const v = String(n.vals[w[0]]); g.appendChild(s('text', { x: n.x + 13, y: wy + i * 18 + 6 }, w[0] + ': ' + (v.length > 16 ? v.slice(0, 15) + '…' : v)));
        });
        g.addEventListener('click', () => { selected = n.id; draw(); drawPanel(); });
        svg.appendChild(g); nodeEls[n.id] = g;
      });
    }

    function touch(id) { down(id).forEach(x => dirty.add(x)); draw(); drawPanel(true); }
    function drawPanel(keepFocus) {
      const n = byId[selected];
      panel.innerHTML = '';
      panel.appendChild(h('h4', null, n.title));
      panel.appendChild(h('div', { class: 'muted', style: { fontSize: '13px' } }, dirty.has(n.id) ? '🟠 ישוב לרוץ בתור הבא' : '🟢 תוצאה ב-cache — לא ירוץ שוב'));
      if (n.hint) panel.appendChild(h('div', { class: 'muted', style: { fontSize: '13px' } }, n.hint));
      n.widgets.forEach(w => {
        let inp;
        if (w[1] === 'select') { inp = h('select', null, w[3].map(o => h('option', { value: o, selected: o === n.vals[w[0]] ? '' : null }, o))); inp.addEventListener('change', () => { n.vals[w[0]] = inp.value; touch(n.id); }); }
        else if (w[1] === 'text') { inp = h('textarea'); inp.value = n.vals[w[0]]; inp.addEventListener('input', () => { n.vals[w[0]] = inp.value; down(n.id).forEach(x => dirty.add(x)); draw(); }); }
        else { inp = h('input', { type: 'number', step: w[0] === 'cfg' || w[0] === 'denoise' ? 0.5 : 1, value: n.vals[w[0]] }); inp.addEventListener('input', () => { const v = parseFloat(inp.value); if (!isNaN(v) && v > 0) { n.vals[w[0]] = v; down(n.id).forEach(x => dirty.add(x)); draw(); } }); }
        panel.appendChild(h('label', { class: 'comfyui-w' }, h('span', null, w[0]), inp));
      });
      if (!n.widgets.length) panel.appendChild(h('div', { class: 'muted' }, 'אין widgets — צומת "טהור" שרק מעביר טנסורים.'));
      const dn = [...down(n.id)].filter(x => x !== n.id).map(x => byId[x].title);
      panel.appendChild(h('div', { style: { marginTop: '10px', fontSize: '13px' }, html: `<b>צמתים במורד הזרם:</b> ${dn.length ? dn.map(x => `<span class="pill">${LA.esc(x)}</span>`).join(' ') : 'אין (צומת סופי)'}` }));
      panel.appendChild(h('div', { class: 'muted', style: { marginTop: '8px', fontSize: '12.5px' } }, 'שינוי כאן מסמן את הצומת + כל מי שמחובר אחריו כ"מלוכלך". מי שלא בתלות — נשאר ב-cache.'));
    }

    async function queue() {
      if (!dirty.size) { log.textContent = 'Prompt executed in 0.01s — כל הצמתים ב-cache, אין מה להריץ.\n(זה מה שקורה כשמריצים שוב עם אותו seed קבוע ואותן הגדרות.)'; return; }
      const order = nodes.filter(n => dirty.has(n.id)), cached = nodes.filter(n => !dirty.has(n.id));
      let t = 0, full = 0; nodes.forEach(n => full += cost(n));
      let txt = `got prompt #${++runs}\n`;
      for (const n of order) {
        nodeEls[n.id].classList.add('run'); await LA.sleep(140);
        const c = cost(n); t += c; txt += `  ▶ executing ${n.title.padEnd(22)} ${String(c).padStart(5)} ms\n`; log.textContent = txt;
      }
      cached.forEach(n => txt += `  ✔ cached    ${n.title}\n`);
      const saved = full - t; totalSaved += saved;
      txt += `\nPrompt executed in ${(t / 1000).toFixed(2)}s (בלי cache: ${(full / 1000).toFixed(2)}s, נחסך ${(saved / 1000).toFixed(2)}s)`;
      log.textContent = txt;
      dirty.clear();
      if (randomize) { byId.ks.vals.seed = Math.floor(Math.random() * 1e6); touch('ks'); log.textContent += `\nseed → ${byId.ks.vals.seed} (control_after_generate=randomize: ה-KSampler "מלוכלך" לתור הבא)`; }
      draw(); drawPanel();
    }

    const bQ = h('button', { class: 'btn primary', type: 'button', onclick: queue }, '▶ Queue Prompt');
    const cb = h('input', { type: 'checkbox' }); cb.addEventListener('change', () => { randomize = cb.checked; });
    const legend = h('div', { class: 'comfyui-legend' }, ...Object.entries({ MODEL: T.MODEL, CLIP: T.CLIP, VAE: T.VAE, CONDITIONING: T.COND, LATENT: T.LATENT, IMAGE: T.IMAGE }).map(([k, c]) => h('span', null, h('i', { class: 'comfyui-sock', style: { background: c } }), k)));
    el.appendChild(h('div', { class: 'lab' },
      h('div', { class: 'lab-h' }, '🎛️ מעבדה 1 — עורך צמתים בסגנון ComfyUI + מעקב Cache'),
      h('p', { class: 'muted', html: 'לחצו על צומת כדי לערוך את ה-widgets שלו. שימו לב אילו צמתים מסומנים 🟠 (יורצו מחדש) ואילו 🟢 (cache). לחצו <b>Queue Prompt</b> כדי "להריץ" — הזמנים מדומים אך ביחס נכון: הרבה steps × CFG&gt;1 × רזולוציה = יקר; טקסט וטעינת מודל — שונים לגמרי.' }),
      legend,
      h('div', { class: 'comfyui-row' }, bQ, h('label', { style: { fontSize: '14px' } }, cb, ' seed: randomize after queue')),
      h('div', { class: 'comfyui-ed' }, canvas, panel), log,
      h('div', { class: 'muted', style: { fontSize: '13px', marginTop: '8px' }, html: 'נסו: (1) Queue ראשון — הכול רץ. (2) שנו רק <code>seed</code> — ckpt/CLIP/Latent נשארים ב-cache. (3) שנו את הפרומפט החיובי — רק ה-CLIP החיובי והמורד. (4) החליפו <code>ckpt_name</code> — הכול מחדש. (5) הורידו cfg ל-1 וראו את הזמן יורד בחצי.' })));
    draw(); drawPanel();
  }

  /* ====================================================================
     LAB 2 — denoising toy
     ==================================================================== */
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const N = 24;
  function shape(name) {
    const g = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = (x + 0.5) / N * 2 - 1, v = (y + 0.5) / N * 2 - 1; let on = 0;
      if (name === 'smiley') {
        const r = Math.hypot(u, v);
        on = (Math.abs(r - 0.85) < 0.1) || (Math.hypot(u + 0.35, v + 0.28) < 0.14) || (Math.hypot(u - 0.35, v + 0.28) < 0.14) || (r > 0.42 && r < 0.56 && v > 0.12 && Math.abs(u) < 0.5 && v > 0.1 + 0.0 * u && Math.hypot(u, v - 0.0) > 0.45) ? 1 : 0;
        if (v > 0.15 && v < 0.5 && Math.abs(Math.hypot(u, v - 0.05) - 0.52) < 0.09) on = 1;
      } else if (name === 'heart') {
        const X = u * 1.25, Y = -v * 1.25 + 0.15; on = (Math.pow(X * X + Y * Y - 1, 3) - X * X * Y * Y * Y) < 0 ? 1 : 0;
      } else if (name === 'bolt') {
        // lightning bolt polygon test via simple band geometry
        const inBolt = (v > -0.9 && v < 0.05 && Math.abs(u - (0.35 - (v + 0.9) * 0.6)) < 0.2) || (v >= 0.05 && v < 0.9 && Math.abs(u - (-0.05 - (v - 0.05) * 0.5)) < 0.2) || (Math.abs(v - 0.0) < 0.12 && u > -0.4 && u < 0.4);
        on = inBolt ? 1 : 0;
      }
      g[y * N + x] = on;
    }
    return g;
  }
  function blur(src, r) {
    let a = src;
    for (let k = 0; k < r; k++) {
      const b = new Float32Array(N * N);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        let sum = 0, c = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < N && yy < N) { sum += a[yy * N + xx]; c++; } }
        b[y * N + x] = sum / c;
      }
      a = b;
    }
    return a;
  }
  function simulate(target, T, cfg, seed) {
    const rnd = mulberry(seed * 7919 + 13);
    const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
    let x = new Float32Array(N * N); for (let i = 0; i < x.length; i++) x[i] = gauss();
    const frames = [{ x: x.slice(), x0: null, s: 1 }];
    const g = 1 + (cfg - 1) * 0.15;       // exaggerated guidance scale for the toy
    const generic = blur(target, 7);
    const baseU = new Float32Array(N * N); for (let i = 0; i < baseU.length; i++) baseU[i] = 0.35 + 0.3 * generic[i];
    for (let k = T; k >= 1; k--) {
      const sg = k / T, sn = (k - 1) / T, lvl = Math.max(0, Math.round(sg * 3));
      const tb = blur(target, lvl);
      const x0 = new Float32Array(N * N), nx = new Float32Array(N * N);
      for (let i = 0; i < x.length; i++) {
        const u = baseU[i], c = u + 0.55 * (tb[i] - u);        // the "model" is only 55% sure of the prompt
        const hat = u + g * (c - u);                              // CFG: uncond + g*(cond-uncond)
        x0[i] = Math.max(-0.6, Math.min(1.6, hat));
        const eps = (x[i] - (1 - sg) * x0[i]) / sg;               // deterministic DDIM-like step
        nx[i] = (1 - sn) * x0[i] + sn * eps;
      }
      x = nx; frames.push({ x: x.slice(), x0, s: sn });
    }
    return { frames, g, baseU, target };
  }
  function drawGrid(cv, arr, mode) {
    const ctx = cv.getContext('2d'), img = ctx.createImageData(N, N);
    for (let i = 0; i < arr.length; i++) {
      const v = Math.max(0, Math.min(1, arr[i]));
      // warm palette: dark navy -> amber
      const r = 12 + v * 243, gg = 16 + v * 190, b = 40 + v * (mode === 'tint' ? 40 : 30);
      img.data[i * 4] = r; img.data[i * 4 + 1] = gg; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }

  function labDenoise(el) {
    const st = { shape: 'smiley', steps: 12, cfg: 7, seed: 3, idx: 0, sim: null };
    const mk = () => { const c = h('canvas', { width: N, height: N }); return c; };
    const cX = mk(), cH = mk(), cT = mk();
    const info = h('div', { class: 'out', style: { minHeight: '120px' } });
    const res = h('div', { class: 'muted', style: { margin: '6px 0' } });
    const scrub = LA.slider('צעד', 0, 12, 1, 0, v => { st.idx = v; paint(); }, v => v + ' / ' + st.steps);
    const sel = h('select', { class: 'comfyui-sel' }, h('option', { value: 'smiley' }, '🙂 סמיילי'), h('option', { value: 'heart' }, '❤️ לב'), h('option', { value: 'bolt' }, '⚡ ברק'));
    sel.addEventListener('change', () => { st.shape = sel.value; recompute(); });
    let playTimer = null;
    const play = h('button', { class: 'btn primary', type: 'button', onclick: () => {
      if (playTimer) { clearInterval(playTimer); playTimer = null; play.textContent = '▶ נגן דנויזינג'; return; }
      st.idx = 0; play.textContent = '⏸ עצור';
      playTimer = LA.interval(() => { if (st.idx >= st.steps) { clearInterval(playTimer); playTimer = null; play.textContent = '▶ נגן דנויזינג'; return; } st.idx++; scrub.input.value = st.idx; scrub.fire(); }, 400);
    } }, '▶ נגן דנויזינג');
    const sSteps = LA.slider('steps', 2, 30, 1, st.steps, v => { st.steps = v; scrub.input.max = v; recompute(); });
    const sCfg = LA.slider('cfg', 1, 20, 0.5, st.cfg, v => { st.cfg = v; recompute(); });
    const sSeed = LA.slider('seed', 0, 99, 1, st.seed, v => { st.seed = v; recompute(); });

    function recompute() {
      st.sim = simulate(shape(st.shape), st.steps, st.cfg, st.seed);
      scrub.input.max = st.steps; if (st.idx > st.steps) st.idx = st.steps; scrub.input.value = st.idx; scrub.fire();
    }
    function paint() {
      const f = st.sim.frames[st.idx], t = st.sim.target;
      drawGrid(cX, f.x); drawGrid(cT, t);
      if (f.x0) drawGrid(cH, f.x0); else { const z = new Float32Array(N * N).fill(0.08); drawGrid(cH, z); }
      const last = st.sim.frames[st.sim.frames.length - 1];
      let mse = 0, burn = 0; const fx = last.x0;
      for (let i = 0; i < N * N; i++) { const v = Math.max(0, Math.min(1, last.x[i])); mse += (v - t[i]) * (v - t[i]); if (fx && (fx[i] < -0.02 || fx[i] > 1.02)) burn++; }
      mse /= N * N; burn = burn / (N * N) * 100;
      const px = 8 * N + 12, u = st.sim.baseU[px], tb = blur(t, Math.round(f.s * 3))[px], c = u + 0.55 * (tb - u), hat = u + st.sim.g * (c - u);
      info.textContent = `צעד ${st.idx}/${st.steps}   σ (רמת רעש) = ${f.s.toFixed(2)}\n` +
        `פיקסל בדיקה (שורה 8, עמודה 12) לפי הנוסחה של CFG:\n` +
        `  uncond = ${u.toFixed(2)}   cond = ${c.toFixed(2)}   g = 1+(cfg−1)·0.15 = ${st.sim.g.toFixed(2)}\n` +
        `  guided = uncond + g·(cond − uncond) = ${hat.toFixed(2)}${hat < 0 || hat > 1 ? '   ← חורג מטווח 0..1 (cfg גבוה = "שרוף")' : ''}`;
      res.innerHTML = `תוצאה סופית: שגיאה מהיעד (MSE) = <b>${mse.toFixed(3)}</b> · פיקסלים "שרופים" (חריגה מהטווח) = <b>${burn.toFixed(0)}%</b> · ` +
        (st.cfg < 3 ? '🟡 cfg נמוך: התמונה חלשה/מטושטשת — הפרומפט כמעט לא מכוון.' : st.cfg > 13 ? '🔴 cfg גבוה מדי: ניגודיות קיצונית וקצוות שרופים.' : '🟢 טווח סביר.') +
        (st.steps < 6 ? ' ⚠️ מעט steps → פחות פירוט (טשטוש).' : '');
    }
    el.appendChild(h('div', { class: 'lab' },
      h('div', { class: 'lab-h' }, '🌫️ מעבדה 2 — דנויזינג צעד אחר צעד (צעצוע) ', h('span', { class: 'comfyui-toy' }, 'מתמטיקה מוגזמת/מפושטת — לא מודל אמיתי')),
      h('p', { class: 'muted', html: 'רשת 24×24 מתחילה כרעש (מה-seed). בכל צעד ה"רשת" מנחשת את התמונה הנקייה: <b>uncond</b> = "תמונה גנרית", <b>cond</b> = "מה שהפרומפט דורש". ה-CFG משלב ביניהם, וה-scheduler מתקדם כך שה-σ יורד ל-0. שחקו עם <b>steps</b> ו-<b>cfg</b> וראו את שני הכשלים הקלאסיים.' }),
      h('div', { class: 'comfyui-row' }, h('span', null, 'יעד ("הפרומפט"):'), sel, play),
      sSteps, sCfg, sSeed, scrub,
      h('div', { class: 'comfyui-cvs' },
        h('div', { class: 'comfyui-cv' }, cX, 'xₜ — הלטנט הנוכחי'),
        h('div', { class: 'comfyui-cv' }, cH, 'x̂₀ — ניחוש הרשת (אחרי CFG)'),
        h('div', { class: 'comfyui-cv' }, cT, 'היעד האמיתי')),
      res, info));
    recompute();
  }

  /* ====================================================================
     LAB 3 — LLM -> prompt -> ComfyUI -> judge stepper
     ==================================================================== */
  const EXAMPLES = [
    { id: 'hanuka', he: 'פוסטר חג לחברת חשמל: ילדה מדליקה נרות חנוכה ליד חלון, אווירה חמה',
      pos: 'young girl lighting Hanukkah candles by a window at dusk, warm golden candlelight, soft bokeh, cozy home interior, cinematic lighting, shallow depth of field, high detail',
      neg: 'blurry, extra fingers, deformed hands, text, watermark, low quality',
      s1: 0.62, issues: ['ידיים עם 6 אצבעות', 'נראות 9 נרות במקום 8 + שמש'], fix: 'add "hands out of frame, exactly eight candles on a menorah", lower cfg 7 -> 6', s2: 0.88 },
    { id: 'logo', he: 'לוגו מינימליסטי: ברק בתוך כיפת בית, קווים נקיים',
      pos: 'minimalist vector logo, lightning bolt inside a house silhouette, flat design, clean lines, two colors, white background, centered',
      neg: 'photo, gradient, text, 3d, shadow, clutter',
      s1: 0.55, issues: ['נוסף טקסט מומצא מתחת ללוגו', 'שלושה צבעים'], fix: 'add "no lettering", emphasize "two colors only: navy and yellow"', s2: 0.84 },
    { id: 'bottle', he: 'צילום מוצר: בקבוק מים על רקע הרי הגליל בשקיעה',
      pos: 'product photo of a water bottle on a rock, Galilee mountains at sunset in background, golden hour, 85mm lens, shallow depth of field, crisp reflections, commercial photography',
      neg: 'logo text, watermark, distorted bottle, oversaturated, low resolution',
      s1: 0.79, issues: ['הבקבוק מעט עקום בקצה'], fix: 'none needed', s2: 0.79 }
  ];

  function labPipeline(el) {
    let cur = EXAMPLES[0];
    const box = h('div');
    const sel = h('select', { class: 'comfyui-sel' }, EXAMPLES.map(e => h('option', { value: e.id }, e.he.slice(0, 48) + '…')));
    sel.addEventListener('change', () => { cur = EXAMPLES.find(e => e.id === sel.value); mount(); });
    const chat = (cls, label, html) => `<div class="comfyui-chat ${cls}"><b>${label}</b><br>${html}</div>`;
    function mount() {
      box.innerHTML = '';
      const e = cur, needFix = e.s1 < 0.75;
      LA.stepper(box, {
        intro: 'לחצו "הבא" כדי לעבור על הצינור: בקשה → LLM → ComfyUI → שופט → לולאה',
        autoplayMs: 3200,
        steps: [
          { title: '1. הבקשה בעברית מהמשתמש', html: chat('user', '👤 משתמש', LA.esc(e.he)) + '<p>מודל הדיפוזיה (CLIP/T5) אומן בעיקר על כיתובים באנגלית, ולכן עברית <b>ישירות</b> לפרומפט נותנת תוצאות חלשות. צריך שכבת תרגום והעשרה — משימה קלאסית ל-LLM.</p>' },
          { title: '2. ' + 'Haiku מרחיב לפרומפט דיפוזיה', html: LA.modelBadge('haiku') + chat('llm', '🤖 פלט JSON', `<span class="comfyui-mono">${LA.esc(JSON.stringify({ positive: e.pos, negative: e.neg, width: 1024, height: 1024 }, null, 2))}</span>`) + '<p><b>למה Haiku?</b> משימה מוגדרת-היטב, קצרה, בנפח גבוה ועם latency שחשוב — כמו סיווג. פורמט JSON קבוע חוסך כשלי פענוח.</p>' },
          { title: '3. הזרקה לתבנית ה-workflow', html: LA.code(`wf["6"]["inputs"]["text"] = p["positive"]   # CLIPTextEncode (+)\nwf["7"]["inputs"]["text"] = p["negative"]   # CLIPTextEncode (-)\nwf["5"]["inputs"].update(width=1024, height=1024)\nwf["3"]["inputs"]["seed"] = 1000          # KSampler`, 'python', 'patch של תבנית API') + '<p>התבנית (גרף שתוכנן ידנית ונבדק) נשארת קבועה; ה-LLM משנה רק <b>פרמטרים</b>. לא נותנים ל-LLM לכתוב גרף שלם בלי ולידציה — קל לייצר חיבור שגוי.</p>' },
          { title: '4. POST /prompt → תור', html: LA.code('POST http://127.0.0.1:8188/prompt\n{"prompt": {...}, "client_id": "…"}\n\n→ 200 {"prompt_id": "a1b2…", "number": 0, "node_errors": {}}\n→ 400 {"error": {...}, "node_errors": {"3": {...}}}   # ולידציה נכשלה', 'text') + '<p>ComfyUI מוודא טיפוסים/ערכים <i>לפני</i> התור. שגיאות מגיעות ב-<code>node_errors</code> — הסוכן יכול לקרוא אותן ולתקן.</p>' },
          { title: '5. WebSocket — התקדמות בזמן אמת', html: LA.code('ws://127.0.0.1:8188/ws?clientId=…\n{"type":"execution_start", ...}\n{"type":"execution_cached", "data":{"nodes":["4","5"]}}   # cache hit!\n{"type":"executing", "data":{"node":"3"}}\n{"type":"progress", "data":{"value":12,"max":25}}          # צעד 12 מתוך 25\n{"type":"executed", "data":{"node":"9","output":{"images":[…]}}}', 'json') + '<p>בסיבוב השני (' + (needFix ? 'אחרי התיקון' : 'אם תריצו שוב') + ') תראו <code>execution_cached</code> עבור ה-checkpoint — לא נטען מחדש.</p>' },
          { title: '6. GET /history + /view', html: LA.code('GET /history/a1b2…  →  {"a1b2…": {"outputs": {"9": {"images": [{"filename":"poster_00001_.png","subfolder":"","type":"output"}]}}}}\nGET /view?filename=poster_00001_.png&subfolder=&type=output  →  <PNG bytes>', 'text') },
          { title: '7. Sonnet שופט את התמונה (VLM)', html: LA.modelBadge('sonnet') + chat(e.s1 >= 0.75 ? 'ok' : 'bad', '👁️ שיפוט סיבוב 1', `ציון: <b>${e.s1}</b><br>בעיות: ${e.issues.map(LA.esc).join(' · ')}<br>הצעת תיקון: <code>${LA.esc(e.fix)}</code>`) + '<p>נדרש מודל <b>רב-מודאלי</b> שמבין תמונה: Sonnet מספק איזון מחיר/איכות. מקרים גבוליים או שיפוט אסתטי עדין אפשר להסלים ל-' + LA.modelBadge('opus') + '. <b>הערה:</b> שופט LLM הוא היוריסטיקה — מכיילים אותו מול דירוג אנושי.</p>' },
          { title: '8. החלטה ולולאה', html: needFix
            ? chat('bad', '🔁 ציון ' + e.s1 + ' < סף 0.75', 'Haiku מקבל את ה-fix ומתקן את הפרומפט; seed חדש; מריצים שוב. ה-checkpoint וה-CLIP-של-השלילי יוצאים מה-cache, רק מה שהשתנה רץ.') + chat('ok', '✅ סיבוב 2 — ציון ' + e.s2, 'עובר את הסף → מחזירים למשתמש. הגבלת <code>max_rounds=3</code> מונעת לולאה אינסופית (ועלות בלתי מוגבלת).')
            : chat('ok', '✅ ציון ' + e.s1 + ' ≥ סף 0.75', 'מוחזר ישר למשתמש — סיבוב אחד. לא תמיד צריך לולאה; הסף והתקציב הם החלטה עסקית.') + '<p>גם כאן שומרים: seed, פרומפט, גרסת מודל, ציון השופט — לצורך שחזור ומעקב (ראו מודול ClearML).</p>' }
        ]
      });
    }
    el.appendChild(h('div', { class: 'lab' },
      h('div', { class: 'lab-h' }, '🔗 מעבדה 3 — LLM ← פרומפט ← ComfyUI ← שופט (סימולציה של צינור סוכן)'),
      h('div', { class: 'comfyui-row' }, h('span', null, 'בקשה:'), sel), box));
    mount();
  }

  /* ====================================================================
     Variants (tabs)
     ==================================================================== */
  function variantsTabs(el) {
    const dia = (spec, info) => el2 => { el2.insertAdjacentHTML('beforeend', info); LA.diagram(el2, spec, { compact: true }); };
    const ck = id => ({ color: 'store', icon: '📦', label: 'Load Checkpoint' });
    LA.tabs(el, [
      { label: 'img2img', render: dia(smallChain([
        { label: 'Load Image', sub: 'תמונה מקורית', color: 'ui', info: '<p>תמונת מקור מהדיסק.</p>' },
        { label: 'VAE Encode', sub: 'פיקסלים → לטנט', color: 'data', info: '<p>במקום Empty Latent: מקודדים תמונה ללטנט.</p>' },
        { label: 'KSampler', sub: 'denoise = 0.6', color: 'neuron', info: '<p>denoise&lt;1 = מתחילים באמצע לוח ה-σ: מוסיפים רעש חלקי ומנקים. 0.3 = שינוי עדין; 0.8 = כמעט תמונה חדשה.</p>' },
        { label: 'VAE Decode', color: 'data', info: '<p>חזרה לפיקסלים.</p>' },
        { label: 'Save', color: 'ok', info: '<p>שמירה.</p>' }]),
        '<p><b>img2img</b>: מחליפים את Empty Latent ב-<b>VAE Encode</b> של תמונה, ומורידים <code>denoise</code> מתחת ל-1. מקרה שימוש: "אותו מוצר, רקע אחר", או ליטוש סקיצה.</p>') },
      { label: 'Inpainting', render: dia(smallChain([
        { label: 'Image + Mask', sub: 'מה לשנות', color: 'ui', info: '<p>מסכה (ידנית, או ממודל סגמנטציה/VLM שמוצא "את הכובע").</p>' },
        { label: 'Set Latent Noise Mask', color: 'ctrl', info: '<p>מגביל את הדנויזינג לאזור המסכה בלבד; השאר נשמר.</p>' },
        { label: 'KSampler', sub: 'denoise 0.7–1', color: 'neuron', info: '<p>ממלא רק את האזור.</p>' },
        { label: 'VAE Decode', color: 'data', info: '<p>.</p>' },
        { label: 'Composite', sub: 'שילוב עם המקור', color: 'ok', info: '<p>מומלץ להדביק רק את האזור המשתנה חזרה על המקור — כדי לא "להזיז" פיקסלים שלא נגעו בהם (VAE הולך ובא בסטייה קלה).</p>' }]),
        '<p><b>Inpainting</b> = ייצור מקומי. כאן שילוב עם LLM/VLM חזק: VLM מזהה אזור פגום ("ידיים מעוותות"), מייצר מסכה, והלולאה מתקנת רק אותו.</p>') },
      { label: 'ControlNet', render: dia(smallChain([
        { label: 'תמונת בקרה', sub: 'קצוות / עומק / תנוחה', color: 'ui', info: '<p>למשל Canny edges, depth map או OpenPose skeleton — מבנה שרוצים לשמר.</p>' },
        { label: 'Preprocessor', sub: 'Canny / Depth', color: 'data', info: '<p>ממיר תמונה לאות הבקרה.</p>' },
        { label: 'Apply ControlNet', sub: 'strength', color: 'tool', info: '<p>ControlNet הוא עותק מאומן של חצי ה-U-Net שמזריק פיצ׳רים בכל רמה. מקבל conditioning נוסף ומשנה אותו. <code>strength</code> שולט בהשפעה.</p>' },
        { label: 'KSampler', color: 'neuron', info: '<p>מקבל conditioning שכולל גם את תנאי המבנה.</p>' },
        { label: 'Decode+Save', color: 'ok', info: '<p>.</p>' }]),
        '<p><b>ControlNet</b>: שולט ב<i>מבנה</i> (קומפוזיציה, תנוחה) בלי להיות תלוי רק בטקסט. טקסט אומר "מה", ControlNet אומר "איפה/איך".</p>') },
      { label: 'LoRA', render: dia(smallChain([
        { label: 'Load Checkpoint', sub: 'MODEL + CLIP', color: 'store', info: '<p>המודל הבסיסי.</p>' },
        { label: 'Load LoRA', sub: 'strength_model/clip', color: 'tool', info: '<p>LoRA = <b>מטריצות דרגה-נמוכה</b> (ΔW = B·A) שמוסיפים למשקולות. קובץ קטן (עשרות עד מאות MB), אומן על סגנון/דמות/מוצר. אותו רעיון בדיוק כמו LoRA ב-fine-tuning של LLM.</p>' },
        { label: 'מודל מתוקן', sub: 'MODEL′ + CLIP′', color: 'llm', info: '<p>היציאות של Load LoRA מחליפות את המקוריות בכל מקום אחר בגרף.</p>' },
        { label: 'KSampler …', color: 'neuron', info: '<p>המשך הגרף כרגיל.</p>' }]),
        '<p><b>LoRA</b>: התאמה זולה של סגנון. בשרשרת: מחברים כמה LoRA ברצף. <b>אותו מנגנון שמשמש ל-fine-tuning של LLM</b> — ראו מודול ClearML לדוגמה של מעקב אחרי ריצות כאלה.</p>') },
      { label: 'Upscale / וידאו', render: dia(smallChain([
        { label: 'תמונה 1024²', color: 'ui', info: '<p>פלט ראשון.</p>' },
        { label: 'Upscale Model', sub: 'ESRGAN ×4', color: 'data', info: '<p>רשת super-resolution — מגדילה בלי prompt.</p>' },
        { label: 'VAE Encode', color: 'data', info: '<p>חזרה ללטנט.</p>' },
        { label: 'KSampler', sub: 'denoise 0.3', color: 'neuron', info: '<p>"Hires fix": דנויזינג עדין שמוסיף פירוט אמיתי.</p>' },
        { label: 'Decode+Save', color: 'ok', info: '<p>.</p>' }]),
        '<p><b>Upscale</b>: שני שלבים — הגדלה ואז דנויזינג חלקי. <b>וידאו</b> (AnimateDiff, Wan, ועוד): הלטנט מקבל ציר זמן נוסף [T,C,H,W] והרשת כוללת temporal attention — אותם צמתים KSampler, גרף גדול יותר, VRAM גדול בהרבה.</p>') }
    ]);
  }

  /* ====================================================================
     Module
     ==================================================================== */
  LA.register({
    id: 'comfyui', order: 80, group: 'ops', icon: '🎨', short: 'ComfyUI',
    title: 'ComfyUI — זרימות עבודה ויזואליות למודלים גנרטיביים',
    render(main) {
      LA.page(main, {
        icon: '🎨', title: 'ComfyUI — זרימות עבודה ויזואליות למודלים גנרטיביים',
        subtitle: 'מעבדת גרפים שבה מודל דיפוזיה הוא לא "כפתור" אלא <b>תרשים זרימה</b> שאפשר לפתוח, להבין, לשנות ולהפעיל מקוד — וגם לתת לסוכן LLM לתפעל. <span class="muted">(הערת פרשנות: כתבת "configui" — פירשנו כ-<b>ComfyUI</b>.)</span>',
        sections: [
          {
            id: 'what', title: 'בשורה אחת + אנלוגיה',
            html:
              `<p><b>ComfyUI</b> הוא ממשק ומנוע קוד-פתוח מבוסס <b>גרף צמתים</b> (node graph) להרצת מודלים גנרטיביים — בראש ובראשונה מודלי <b>דיפוזיה</b> לתמונה (Stable Diffusion, SDXL, Flux ועוד), ובהמשך וידאו, שמע ו-3D. כל שלב בתהליך הוא צומת; מחברים ביניהם בחוטים; כל הגרף נשמר כקובץ <b>JSON</b>. הוא רץ <b>מקומית על ה-GPU שלכם</b> ומחשוף API ב-HTTP/WebSocket (ברירת מחדל: פורט <code>8188</code>).</p>` +
              LA.callout('analogy', 'חשבו על <b>מטבח מקצועי עם קו ייצור פתוח</b>: במקום מכונת קפה אחת עם כפתור "אספרסו", יש לכם תחנות (טחינה, הרתחה, הקצפה) ואתם מחברים ביניהן. אפשר להחליף תחנה, להוסיף תחנה, ולהריץ שוב רק את החלק שהשתנה — והמתכון כולו נכתב על דף (JSON) שאפשר להעביר לשף אחר.') +
              LA.table(['מושג', 'מה זה'], [
                ['Workflow', 'גרף DAG של צמתים, נשמר כ-JSON (פורמט UI עם מיקומים, ופורמט API קומפקטי לשליחה לשרת)'],
                ['Node', 'פונקציה עם קלטים/פלטים מטיפוס מוגדר + widgets (פרמטרים). כל צומת = מחלקת Python'],
                ['Custom nodes', 'אקוסיסטם ענק של צמתים של הקהילה (ControlNet, וידאו, LLM...). מותקנים בתיקייה <code>custom_nodes/</code>; <b>ComfyUI Manager</b> מנהל התקנה ועדכון'],
                ['Server', 'שרת Python (aiohttp) על 8188: <code>POST /prompt</code>, <code>GET /history</code>, <code>/view</code>, <code>/ws</code>'],
                ['Models', 'קבצי משקולות בתיקיות: <code>checkpoints/ loras/ vae/ controlnet/ upscale_models/</code>']
              ]) +
              LA.callout('info', 'מה שמבדיל אותו מ"עוד כלי תמונות": <b>שקיפות והרכבה</b>. הוא חושף את הארכיטקטורה בצורה שאפשר ללמוד ממנה — ולכן הוא מושלם לקורס שבו צוללים עד לרמת הצומת הבודד.')
          },
          {
            id: 'graph', title: 'איך זה עובד — גרף txt2img (דיאגרמה לחיצה)',
            render(el) {
              el.insertAdjacentHTML('beforeend', '<p>זהו הגרף הקנוני — "Hello World" של ComfyUI. <b>לחצו על כל צומת</b> לקריאה; צמתים עם ⤵ (Load Checkpoint, CLIP Text Encode, KSampler, VAE Decode) אפשר לפתוח. <b>בתוך KSampler</b> תגיעו ללולאת הדנויזינג, משם לצעד בודד, ומשם ליחידת cross-attention אחת — 4 רמות עומק.</p>');
              LA.diagram(el, graphSpec);
              el.insertAdjacentHTML('beforeend', LA.callout('tip', 'התמונה שמתקבלת היא <b>תוצאה של לולאה</b>: KSampler מתחיל מרעש ו"מגלף" תמונה ב-20–50 צעדים. כל צעד הוא הרצה של רשת ענקית. לכן זמן היצירה תלוי ב-steps × (cfg&gt;1 ? 2 : 1) × רזולוציה.'));
            }
          },
          {
            id: 'inside', title: 'צלילה פנימה: טיפוסים, מנוע הביצוע והווריאציות',
            render(el) {
              el.insertAdjacentHTML('beforeend',
                '<h3>שקעים מטיפוסים (typed sockets)</h3><p>חוט מחבר רק פלט וקלט <b>מאותו טיפוס</b> — ComfyUI מונע חיבורים שגויים בצורה חזותית (צבעים) ובצד השרת (ולידציה). זה ה"טיפוסיות" של השפה.</p>' +
                LA.table(['טיפוס', 'מה הוא נושא', 'צורה לדוגמה', 'מי מייצר ← מי צורך'], [
                  ['<span class="comfyui-sock" style="background:#b39ddb"></span>MODEL', 'רשת הדנויזינג (U-Net/DiT)', 'משקולות ~GB', 'Load Checkpoint/LoRA ← KSampler'],
                  ['<span class="comfyui-sock" style="background:#ffd500"></span>CLIP', 'מקודד טקסט', 'משקולות', 'Load Checkpoint ← CLIP Text Encode'],
                  ['<span class="comfyui-sock" style="background:#ff6e6e"></span>VAE', 'מקודד/מפענח לטנט', 'משקולות', 'Load Checkpoint ← VAE Encode/Decode'],
                  ['<span class="comfyui-sock" style="background:#ffa931"></span>CONDITIONING', 'טקסט כמספרים (+ מטא)', '[77, 768]', 'CLIP Text Encode ← KSampler'],
                  ['<span class="comfyui-sock" style="background:#ff9cf9"></span>LATENT', 'מצב הדנויזינג', '[B, 4, H/8, W/8]', 'Empty Latent/KSampler ← KSampler/VAE Decode'],
                  ['<span class="comfyui-sock" style="background:#64b5f6"></span>IMAGE', 'פיקסלים', '[B, H, W, 3] ב-0..1', 'VAE Decode ← Save/Preview/Upscale']
                ]) +
                '<h3>מנוע הביצוע: רק מה שהשתנה</h3>' +
                '<p>כשלוחצים Queue, ComfyUI <b>מחשב את הגרף מהסוף להתחלה</b>: מתחיל מצמתי פלט, עובר אחורה על התלויות, ומריץ בסדר טופולוגי. לכל צומת הוא מחשב <b>חתימה</b> (שם הצומת + ערכי ה-widgets + חתימות הקלטים). אם החתימה זהה לריצה הקודמת — <b>התוצאה נלקחת מ-cache</b>, והצומת לא רץ. עקרונית זה כמו <code>make</code> או Bazel.</p>' +
                LA.callout('algo', 'זה מסביר למה בכיוונון seed אתם מחכים 8 שניות, אבל בהחלפת הפרומפט של השלילי — פחות; ולמה "צומת שמניב תוצאה אקראית" (random seed ללא fixed) שובר את ה-cache של כל מה שאחריו. נסו זאת במעבדה 1 למטה.') +
                '<h3>וריאציות של הגרף</h3><p>כמעט כל יכולת היא "הוסף/החלף צומת". לחצו בין הלשוניות:</p>');
              variantsTabs(el);
            }
          },
          {
            id: 'example', title: 'דוגמה מוחשית: workflow ב-API format וסוכן שמפעיל אותו',
            render(el) {
              el.insertAdjacentHTML('beforeend',
                '<p><b>תרחיש:</b> צוות השיווק של חברת חשמל בישראל צריך עשרות באנרים עונתיים. במקום שמעצב ילחץ ידנית, בונים צינור: <i>בקשה בעברית → LLM כותב פרומפט → ComfyUI מייצר → VLM שופט → חוזרים אם צריך</i>.</p>' +
                '<p>ב-ComfyUI יש שני פורמטים: <b>UI format</b> (כולל מיקומי צמתים, לשמירה ושיתוף) ו-<b>API format</b> (דרך "Save (API Format)") — מילון קומפקטי <code>{node_id: {class_type, inputs}}</code>. חיבור בין צמתים נכתב כ-<code>["מזהה_צומת", אינדקס_פלט]</code>.</p>');
              LA.tabs(el, [
                { label: 'workflow (JSON, API format)', html: LA.code(WORKFLOW_JSON, 'json', 'txt2img_api.json — אותו גרף כמו בדיאגרמה') + LA.callout('info', 'שימו לב: <code>"clip": ["4", 1]</code> = "הפלט מספר 1 (CLIP) של צומת 4". זו כל המשמעות של חוט. אין סדר ב-JSON; הסדר נגזר מהתלויות.') },
                { label: 'לקוח Python (/prompt)', html: LA.code(PY_CLIENT, 'python', 'comfy_client.py') + LA.callout('warn', 'אל תחשפו את פורט 8188 לאינטרנט ללא אימות: מי שמגיע ל-API מריץ קוד על המכונה שלכם (דרך צמתים) ויכול לצרוך את כל ה-GPU.') },
                { label: 'Claude מפעיל את ComfyUI', html: '<p>' + LA.modelBadge('haiku') + ' מרחיב בקשה בעברית לפרומפט אנגלי, ' + LA.modelBadge('sonnet') + ' משמש שופט ויזואלי (vision). זו לולאה: צור → שפוט → תקן.</p>' + LA.code(PY_CLAUDE, 'python', 'llm_driven_generation.py') },
                { label: 'הכלי כ-Tool / MCP', html: LA.code(PY_TOOL, 'python', 'render_image כ-tool של סוכן') + LA.callout('tip', 'כשהסוכן הוא <b>מנגנון הרכבה</b> (רוצים מגוון תבניות workflow לפי משימה), הרצוי הוא: כמה תבניות מוכנות כ-tools ("render_banner", "inpaint_region") — לא גרף חופשי. פחות כשלים, אפשר לבדוק כל תבנית.') }
              ]);
            }
          },
          {
            id: 'lab', title: 'מעבדה אינטראקטיבית',
            render(el) {
              LA.tabs(el, [
                { label: '1 · עורך צמתים + cache', render: labEditor },
                { label: '2 · דנויזינג (צעצוע)', render: labDenoise },
                { label: '3 · LLM → ComfyUI → שופט', render: labPipeline }
              ]);
            }
          },
          {
            id: 'llm', title: 'הקשר ל-LLM — איפה זה נוגע במודלי שפה',
            render(el) {
              el.insertAdjacentHTML('beforeend',
                LA.callout('llm', '<p>ComfyUI אינו LLM — אבל <b>הוא עמוס ב-Transformers ובמודלי שפה</b>, ומתחבר אליהם בחמש דרכים:</p>' +
                  LA.list([
                    '<b>מקודד הטקסט הוא Transformer כמו LLM.</b> CLIP: 12 שכבות causal self-attention על טוקנים. SD3/Flux מוסיפים <b>T5-XXL</b> (מודל שפה בן ~4.7B). ובמודלים חדשים יותר מקודד הטקסט הוא כבר <b>LLM-מלא</b>. אותו דבר: טוקניזציה, embeddings, attention.',
                    '<b>Cross-attention מזריק את הטקסט לתמונה.</b> Q מהלטנט, K/V מהטוקנים. ב-DiT (SD3/Flux) הטקסט והתמונה אפילו נערכים כטוקנים ברצף אחד ועוברים attention משותף — ארכיטקטורת LLM כמעט טהורה.',
                    '<b>LLM כותב ומרחיב פרומפטים.</b> תרגום מעברית, הוספת סגנון/תאורה/עדשה, פורמט JSON. זה מה שהמעבדה 3 ממחישה.',
                    '<b>צמתי LLM בתוך ComfyUI</b> (custom nodes): קריאה ל-API של Claude או למודל מקומי (Ollama/llama.cpp) מתוך הגרף עצמו, כדי שפרומפט נוצר באותו workflow.',
                    '<b>סוכן LLM מפעיל את ComfyUI כ-tool</b> דרך ה-API (או דרך שרת MCP/skill עוטף), ו-<b>VLM</b> (מודל ראייה-שפה) מתאר/מעריך תמונות שנוצרו (captioning, שיפוט איכות, בדיקת ציות לבריף).'
                  ])) +
                '<h3>ניתוב מודלים בצינור יצירת תמונות</h3>' +
                LA.table(['שלב', 'מודל מומלץ', 'למה'], [
                  ['סיווג בקשה (תמונה/לוגו/מוצר) + בחירת תבנית', LA.modelBadge('haiku'), 'משימה קצרה, נפח גבוה, latency נמוך'],
                  ['הרחבת/תרגום פרומפט + JSON', LA.modelBadge('haiku'), 'מבנה קבוע, זול; אפשר Sonnet אם הסגנון חשוב'],
                  ['שיפוט תמונה מול הבריף (vision) והצעת תיקון', LA.modelBadge('sonnet'), 'הבנה ויזואלית טובה במחיר סביר; מסלול ברירת המחדל'],
                  ['תכנון קמפיין (10 תמונות עקביות, בחירת LoRA/ControlNet), תיקון גרף מורכב', LA.modelBadge('opus'), 'תכנון רב-שלבי, שיקולי עקביות — נפח נמוך, ערך גבוה']
                ]) +
                LA.callout('warn', 'מנגנון "השופט" (VLM) לא נייטרלי: הוא עשוי להעדיף סגנונות מסוימים או להחמיץ פגמים קטנים (אצבעות, טקסט בתמונה). שלבו בדיקות דטרמיניסטיות (גודל, OCR לטקסט אסור) ודגימת בדיקה אנושית.'));
            }
          },
          {
            id: 'profile', title: 'דרישות · חוזקות · חולשות',
            html: LA.profile({
              requirements: [
                'GPU עם VRAM מספיק: SD1.5 ~4–6GB, SDXL ~8–12GB, Flux/וידאו ~16–24GB+ (אפשר quantization fp8/GGUF ו-offload ל-RAM במחיר מהירות)',
                'Python + PyTorch תואם CUDA/ROCm/MPS; דיסק מהיר לקבצי משקולות (עשרות GB)',
                'מודלי בסיס (checkpoints) ו-LoRA עם <b>רישיון</b> שמתאים לשימוש מסחרי',
                'לשימוש מתוכנת: שרת מקומי/פנימי + לקוח HTTP/WebSocket; ניהול גרסאות של ה-workflow JSON'
              ],
              strengths: [
                'שקיפות ושליטה מלאה — רואים וגם משנים כל שלב (לכן מצוין ללמידה)',
                'Cache חכם: ריצה חוזרת מריצה רק מה שהשתנה',
                'API פשוט, ו-workflow הוא JSON — קל לשלב בצינורות, סוכנים ו-CI',
                'אקוסיסטם ענק של custom nodes ומודלים; תמיכה מהירה במודלים חדשים',
                'שחזוריות: ה-workflow מוטמע ב-PNG'
              ],
              weaknesses: [
                'עקומת למידה: גרף גדול הופך ל"ספגטי"; תחזוקה קשה בלי מוסכמות',
                'Custom nodes = קוד לא מבוקר שרץ אצלכם: סיכון אבטחה, וגם שבירת תאימות בין גרסאות',
                'חלש בסקיילינג רב-משתמשים "כמו שהוא" (תור יחיד, GPU יחיד) — צריך שכבת תזמור מעליו',
                'איכות לא דטרמיניסטית בין חומרה/גרסאות; קשה לבדוק אוטומטית "האם התמונה טובה"',
                'אין אימות/הרשאות מובנים ב-API'
              ],
              algoTips: [
                'תנו ל-LLM לשנות <b>פרמטרים של תבנית בדוקה</b>, לא לייצר גרף חופשי',
                'רשמו לכל תמונה: seed, פרומפט, checkpoint hash, LoRA ומשקליהם, גרסת ComfyUI וגרסאות custom nodes',
                'מדדו איכות במספר שכבות: CLIP score לציות לפרומפט, העדפה אנושית/זוגית, VLM-judge מכויל, ו-FID/KID בבדיקות אצווה',
                'שימו לב לעלות: זמן ≈ steps × (2 אם cfg>1) × פיקסלים; batch וצנרת cache מורידים עלות'
              ],
              whenToUse: [
                '✅ יצירת תמונות/וידאו בצינור, ניסויים, שליטה מבנית (ControlNet/inpaint), עיבוד מקומי של נכסים רגישים',
                '❌ אם צריך רק "תמונה אחת מהירה" — שירות API מנוהל יפשוט; אם צריך SLA רב-משתמשים — דורש תזמור'
              ]
            })
          },
          {
            id: 'algo', title: 'עין של אלגוריתמאי — צ׳קליסט',
            html: LA.callout('algo', '<b>צ׳קליסט לפני שמעלים צינור ComfyUI + LLM לפרודקשן</b>') +
              LA.table(['תחום', 'מה לבדוק'], [
                ['שחזוריות', 'נעילת seed; שמירת hash של ה-checkpoint/LoRA; הצמדת גרסאות ComfyUI + custom nodes (commit); ה-workflow JSON בגיט. שימו לב ש-GPU/דרייבר/אופטימיזציות (xformers/SDPA) יכולים לשנות פיקסלים בודדים'],
                ['הערכה', 'CLIP-score (ציות לטקסט), הערכה אנושית בזוגות, VLM-judge מכויל מול תיוג אנושי, בדיקות דטרמיניסטיות (OCR/גודל/היסטוגרמה). דוגו לפי seeds מרובים — תמונה אחת אינה מדגם'],
                ['כשלים נפוצים', 'ידיים/טקסט בתמונה; אובייקטים חסרים/עודפים ("8 נרות"); צבעים צורבים (cfg גבוה); פרטים שטוחים (steps נמוך); "פרומפט ארוך נחתך" אחרי 77 טוקנים'],
                ['ביצועים ועלות', 'VRAM (fp16/fp8, tiled VAE, offload); תור GPU; אצווה; cfg=1 במודלים מזוקקים (Turbo/Lightning); cache. מדדו שניות-GPU לתמונה מקובלת'],
                ['אבטחה', 'Custom nodes = הרצת קוד: נעלו גרסאות, קראו קוד, הריצו בקונטיינר/רשת מבודדת. אל תחשפו 8188. העדיפו safetensors על ckpt/pickle. הסיכון של prompt-injection: טקסט מ-OCR/מטא-דאטה של קובץ שמוזן ל-LLM יכול להשפיע על הסוכן'],
                ['תוכן ורישוי', 'רישיון המודל והנתונים; סינון תוכן בטוח; שקיפות לגבי תוכן שנוצר ב-AI; מידע אישי בפרומפטים ובמטא-דאטה של PNG'],
                ['עלות LLM בלולאה', 'הגבילו <code>max_rounds</code>; Haiku לכתיבת פרומפט, Sonnet לשיפוט, Opus רק בהסלמה; שמרו ציונים כדי ללמוד סף מתאים'],
                ['Observability', 'לוגו prompt_id, זמן לכל צומת, cache hits (<code>execution_cached</code>), שגיאות <code>node_errors</code>; מעקב ריצות — ראו מודול ClearML']
              ])
          },
          {
            id: 'quiz', title: 'בוחן',
            render(el) {
              LA.quiz(el, [
                { q: 'מה מקבל ה-KSampler כקלט (בגרף txt2img הקנוני)?', options: ['רק את הפרומפט', 'model, positive, negative, latent_image', 'IMAGE ו-VAE', 'CLIP ו-seed בלבד'], answer: 1, explain: 'KSampler מקבל MODEL, שני CONDITIONING (חיובי/שלילי) ו-LATENT. פרמטרים כמו seed/steps/cfg הם widgets, לא שקעים.' },
                { q: 'שיניתם רק את ה-seed ב-KSampler ולחצתם Queue. מה ירוץ?', options: ['הכול מחדש', 'רק Load Checkpoint', 'KSampler + VAE Decode + Save Image; השאר מה-cache', 'רק Save Image'], answer: 2, explain: 'הצמתים שלפני KSampler לא תלויים ב-seed ולכן נשארים ב-cache; KSampler וכל מה שמחובר אחריו מחושבים מחדש.' },
                { q: 'מה עושה CFG בכל צעד דנויזינג?', options: ['מוסיף רעש', 'משלב ניחוש-רעש עם פרומפט וניחוש בלעדיו: u + s·(c − u)', 'מקטין את הרזולוציה', 'מחליף את ה-VAE'], answer: 1, explain: 'Classifier-Free Guidance מרחיק את הניחוש מכיוון "בלי פרומפט" לכיוון "עם פרומפט". לכן cfg>1 מריץ את הרשת פעמיים.' },
                { q: 'איפה הטקסט "נכנס" לרשת הדנויזינג?', options: ['ב-VAE Decode', 'ב-cross-attention: Q מהלטנט, K ו-V מטוקני הטקסט', 'ב-Save Image', 'בטעינת הקובץ'], answer: 1, explain: 'כל בלוק מחשב attention שבו מיקומי התמונה "מקשיבים" לטוקני הטקסט (ב-DiT: attention משותף על רצף אחד).' },
                { q: 'מה הקשר בין מקודד הטקסט ב-ComfyUI למשפחת ה-LLM?', options: ['אין קשר', 'הוא Transformer עם טוקניזציה ו-embeddings — אותה משפחה; מודלים חדשים משתמשים ב-T5 או אפילו ב-LLM מלא', 'הוא מסד נתונים וקטורי', 'הוא מקבל תמונות בלבד'], answer: 1, explain: 'CLIP הוא Transformer על טקסט; T5-XXL הוא מודל שפה; הטקסט הופך ל-CONDITIONING באותה צורה שבה LLM מייצר hidden states.' },
                { q: 'באיזה מודל Claude מתאים להשתמש להרחבת בקשה קצרה בעברית לפרומפט אנגלי בנפח גבוה?', options: ['claude-opus-5-5 לכל בקשה', 'claude-haiku-5-5', 'אף LLM לא יכול', 'רק מודל תמונה'], answer: 1, explain: 'משימה מוגדרת, קצרה ובנפח גבוה — Haiku. Sonnet לשיפוט ויזואלי; Opus לתכנון קמפיין מורכב.' },
                { q: 'מה הסיכון העיקרי בהתקנת custom nodes מהקהילה?', options: ['הם איטיים בלבד', 'הם קוד Python שרץ עם הרשאות שלכם — סיכון אבטחה ותאימות', 'הם מוחקים את ה-cache', 'הם משנים את ה-seed'], answer: 1, explain: 'זו שרשרת אספקה: קוד לא מבוקר. מבודדים, מצמידים גרסאות וקוראים קוד.' },
                { q: 'מה ההבדל בין denoise=1 ל-denoise=0.5 ב-KSampler עם לטנט מוצא מ-VAE Encode?', options: ['אין', 'עם 0.5 מתחילים מהרעש חלקי ושומרים יותר ממבנה התמונה המקורית', 'עם 0.5 הרשת רצה פי 2 מהר ויוצרת תמונה גדולה יותר', 'עם 0.5 ה-VAE מושבת'], answer: 1, explain: 'denoise<1 חותך את תחילת לוח ה-σ: רמת רעש נמוכה יותר = תמונה קרובה יותר למקור (img2img).' }
              ]);
            }
          }
        ]
      });
    }
  });
})();
