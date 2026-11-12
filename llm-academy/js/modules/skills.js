/* Skills module */
(function () {
  'use strict';
  const h = LA.h;
  const M = LA.modelBadge;

  /* ===================== CONTENT: example skill ===================== */
  const SKILL_MD = `---
name: hebrew-invoice-extractor
description: Extracts structured fields (vendor name, VAT/company ID, invoice number, date, line items, subtotal, VAT, total) from Hebrew or bilingual invoices (חשבונית מס) given as text or OCR output, and returns validated JSON. Use when the user pastes or uploads an invoice, receipt, or asks to extract/parse invoice data.
---

# Hebrew Invoice Extractor

## Overview
Turn the text of an Israeli tax invoice into JSON that matches
\`references/field-schema.md\`. Amounts are in ILS unless stated.

## Workflow
1. Read the invoice text. Identify: vendor, VAT/company ID (9 digits),
   invoice number, issue date (DD/MM/YYYY -> ISO 8601), currency.
2. Extract line items: description, quantity, unit price, line total.
3. Write the result to \`/tmp/invoice.json\` and run:
   \`python scripts/validate.py /tmp/invoice.json\`
4. If the script prints errors, fix ONLY the fields it names and re-run
   (max 2 retries). If it still fails, return the JSON with
   \`"needs_review": true\` and list the errors.
5. Reply with the final JSON only - no commentary.

## Rules
- Never invent a value. Missing field -> \`null\`.
- Numbers: strip thousand separators, use "." as decimal point.
- Hebrew text stays Hebrew; do not translate descriptions.

## Examples
See \`references/examples.md\` for 3 annotated invoices.`;

  const SKILL_PY = `#!/usr/bin/env python3
"""validate.py - deterministic checks on extracted invoice JSON."""
import json, sys

VAT_RATE = 0.18          # Israeli VAT; keep configurable

def valid_israeli_id(s: str) -> bool:
    """Check digit for 9-digit Israeli ID / company number."""
    s = str(s).strip().zfill(9)
    if not s.isdigit() or len(s) != 9:
        return False
    total = 0
    for i, ch in enumerate(s):
        d = int(ch) * (1 if i % 2 == 0 else 2)
        total += d - 9 if d > 9 else d
    return total % 10 == 0

def main(path: str) -> int:
    inv = json.load(open(path, encoding="utf-8"))
    errors = []
    if inv.get("vendor_id") and not valid_israeli_id(inv["vendor_id"]):
        errors.append("vendor_id: failed check-digit")
    items = inv.get("line_items") or []
    for k, it in enumerate(items):
        if abs(it["qty"] * it["unit_price"] - it["line_total"]) > 0.01:
            errors.append(f"line_items[{k}]: qty*unit_price != line_total")
    sub = round(sum(it["line_total"] for it in items), 2)
    if inv.get("subtotal") is not None and abs(sub - inv["subtotal"]) > 0.01:
        errors.append(f"subtotal: expected {sub}")
    if None not in (inv.get("subtotal"), inv.get("vat"), inv.get("total")):
        if abs(inv["subtotal"] + inv["vat"] - inv["total"]) > 0.02:
            errors.append("total: subtotal + vat != total")
        if abs(inv["subtotal"] * VAT_RATE - inv["vat"]) > 0.05:
            errors.append(f"vat: not {VAT_RATE:.0%} of subtotal (zero-rated?)")
    print("OK" if not errors else "\\n".join(errors))
    return 0 if not errors else 1

if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))`;

  const TREE = `hebrew-invoice-extractor/
├── SKILL.md                  # L1: name+description  |  L2: the body
├── scripts/
│   └── validate.py           # L3: executed, only its OUTPUT enters context
└── references/
    ├── field-schema.md       # L3: read only when needed
    └── examples.md           # L3: 3 annotated invoices`;

  const CODE_API = `import anthropic

client = anthropic.Anthropic()

# Skills run inside the code-execution container. The Skills API itself is GA (no skills beta header);
# the code-execution tool still uses the beta endpoint + header below. Verify against current docs.
resp = client.beta.messages.create(
    model="claude-haiku-5-5",          # a well-specified skill + validator: Haiku is often enough
    max_tokens=2048,
    betas=["code-execution-2025-08-25"],
    container={
        "skills": [
            {"type": "custom", "skill_id": "skill_01ABC...", "version": "latest"},   # your uploaded skill
            # {"type": "anthropic", "skill_id": "pptx", "version": "latest"},        # a built-in skill
        ]
    },
    tools=[{"type": "code_execution_20260521", "name": "code_execution"}],
    messages=[{"role": "user", "content": "Extract this invoice:\\n" + invoice_text}],
)
print(resp.content[-1].text)`;

  const CODE_CC = `# Claude Code - a skill is just a folder on disk
~/.claude/skills/hebrew-invoice-extractor/SKILL.md      # personal (all projects)
<repo>/.claude/skills/hebrew-invoice-extractor/SKILL.md # project (shared via git)

# Optional frontmatter in Claude Code: limit what the skill may use
---
name: sql-query-reviewer
description: Reviews SQL for correctness, performance and injection risks. Use when the user pastes SQL or asks to optimize a query.
allowed-tools: Read, Grep
---`;

  /* ===================== LIBRARY FOR LAB 1 ===================== */
  const LIB = [
    { name: 'hebrew-invoice-extractor', d: 'Extracts structured fields (vendor, VAT ID, invoice number, line items, totals) from Hebrew invoices into JSON. Use when the user uploads or pastes an invoice or asks to extract invoice data. חשבונית חשבוניות מע"מ חילוץ', t2: 1800, t3: 2600, scripts: true },
    { name: 'quarterly-report-pptx', d: 'Builds a quarterly business review PowerPoint deck from KPI data with charts and speaker notes. Use when asked to create slides, a presentation, deck or quarterly report. מצגת שקפים דוח רבעוני', t2: 3200, t3: 5200, scripts: true },
    { name: 'sql-query-reviewer', d: 'Reviews SQL queries for correctness, performance, indexes and injection risks. Use when the user pastes SQL or asks to optimize or review a query. שאילתה שאילתות אופטימיזציה', t2: 1500, t3: 1800, scripts: false },
    { name: 'brand-style-guide', d: 'Applies company brand voice, colors and typography to documents and marketing copy. Use when writing customer-facing copy, emails, landing pages or formatting any branded document. מיתוג סגנון טון', t2: 2200, t3: 3000, scripts: false },
    { name: 'pdf-form-filler', d: 'Fills PDF forms programmatically from JSON data and flattens the result. Use when the user has a PDF form to fill, sign or complete. טופס טפסים PDF מילוי', t2: 1400, t3: 2400, scripts: true },
    { name: 'meeting-notes-summarizer', d: 'Turns meeting transcripts into a summary, decisions and action items with owners and due dates. Use when given a transcript, meeting notes or asked to summarize a meeting. פרוטוקול ישיבה סיכום תמלול', t2: 1100, t3: 0, scripts: false },
    { name: 'code-review-checklist', d: 'Reviews pull requests and diffs against the team checklist: tests, security, naming, error handling. Use when asked to review a PR, a diff or code changes. ביקורת קוד פול ריקווסט', t2: 1700, t3: 1500, scripts: false },
    { name: 'data-viz-guidelines', d: 'Chooses chart types and applies accessible color palettes for charts, graphs and dashboards. Use when building a chart, graph, plot or dashboard. גרף גרפים תרשים לוח מחוונים', t2: 1600, t3: 2000, scripts: true }
  ];
  const STOP = new Set('the a an of to and or for in on with from is are this that it as at by be use when user asks please can you i me my שלי את של על עם אני לי מה זה זו הוא היא או גם כל'.split(' '));
  const tokenize = txt => (txt.toLowerCase().match(/[a-z0-9֐-׿]+/g) || []).filter(w => w.length > 1 && !STOP.has(w));
  function variants(w) { const v = [w]; if (/^[֐-׿]/.test(w) && w.length > 3 && 'הבלושמכ'.includes(w[0])) v.push(w.slice(1)); if (/s$/.test(w) && w.length > 3) v.push(w.slice(0, -1)); return v; }
  const SYSTEM_BASE = 1200;
  const l1Tokens = s => Math.ceil((s.name.length + s.d.length) / 4) + 20;

  /* ===================== DIAGRAMS ===================== */
  function stepSpec() {
    return {
      title: 'צעד הוראה בודד', width: 900, height: 300,
      intro: '<div class="dg-hint">הרמה הקטנה ביותר: <b>שורה אחת ב-Workflow</b> של ה-SKILL.md — "הרץ את הסקריפט, ואם נכשל תקן רק את השדות שהוא מזכיר". המודל קורא אותה ופועל.</div>',
      nodes: [
        { id: 'ins', x: 790, y: 150, w: 170, h: 70, label: 'הוראה בגוף SKILL.md', sub: '"3. הרץ validate.py"', color: 'data', info: '<p>שורת הוראה ספציפית וניתנת לביצוע. הוראות טובות: <b>פעולה אחת, כלי מפורש, קריטריון הצלחה</b>. הוראות עמומות ("ודא שהכל טוב") מייצרות התנהגות לא יציבה.</p>' },
        { id: 'act', x: 560, y: 150, w: 150, label: 'המודל מבצע', sub: 'קורא לכלי bash', color: 'llm', info: '<p>המודל מתרגם את ההוראה לקריאת כלי (<code>bash</code>/<code>code_execution</code>): <code>python scripts/validate.py /tmp/invoice.json</code>. ' + M('haiku') + ' מספיק להוראות מוגדרות היטב כאלה.</p>' },
        { id: 'run', x: 340, y: 150, w: 150, label: 'הסקריפט רץ', sub: 'בקונטיינר', color: 'tool', info: '<p>הקוד <b>לא נכנס ל-context</b> — רק הפלט שלו. זה היתרון הגדול של סקריפטים: דטרמיניזם (בדיקת ספרת ביקורת של ח.פ.) בלי לבזבז טוקנים ובלי להסתמך על "חישוב בראש" של המודל.</p>' },
        { id: 'chk', x: 130, y: 150, w: 150, h: 90, label: 'OK?', sub: 'stdout / exit code', color: 'ctrl', shape: 'diamond', info: '<p>פלט <code>OK</code> → ממשיכים לשלב הבא. אחרת — שגיאות ברשימה, והמודל מתקן <b>רק</b> את מה שצוין וחוזר (עד מגבלת ניסיונות שהוגדרה בהוראה).</p>' },
        { id: 'fix', x: 450, y: 260, w: 170, label: 'תיקון ושליחה חוזרת', sub: 'עד 2 ניסיונות', color: 'warn', info: '<p>לולאת תיקון מוגבלת. אחרי מיצוי ניסיונות: <code>needs_review: true</code> ולא ניחוש.</p>' }
      ],
      edges: [{ from: 'ins', to: 'act' }, { from: 'act', to: 'run' }, { from: 'run', to: 'chk' }, { from: 'chk', to: 'fix', label: 'שגיאות', color: 'warn', dashed: true }, { from: 'fix', to: 'act', dashed: true, color: 'warn', bend: -30 }]
    };
  }
  function anatomySpec() {
    return {
      title: 'אנטומיה של SKILL.md', width: 900, height: 280,
      intro: '<div class="dg-hint">קובץ SKILL.md = <b>frontmatter</b> (YAML) + <b>גוף</b> (Markdown). רק ה-frontmatter נטען תמיד; הגוף נטען כשה-Skill נבחר. לחצו על "Workflow" וצללו לצעד בודד.</div>',
      nodes: [
        { id: 'fm', x: 800, y: 140, w: 150, h: 80, label: 'Frontmatter', sub: 'name + description', color: 'data', info: '<p>שני שדות חובה:</p><ul><li><code>name</code> — אותיות קטנות, ספרות ומקפים (עד 64 תווים)</li><li><code>description</code> — עד 1024 תווים: <b>מה עושה + מתי להשתמש</b></li></ul><p>זה רמה 1: נכנס ל-system prompt תמיד (~100 טוקנים לכל Skill). ה-description הוא מה שמודל משתמש בו כדי להחליט אם לטעון את ה-Skill.</p>' },
        { id: 'ov', x: 620, y: 140, w: 140, label: 'Overview', sub: 'מטרה ופורמט פלט', color: 'ctrl', info: '<p>פסקה קצרה: מה ה-Skill מייצר ובאיזה פורמט (קישור ל-schema ב-references). המטרה: הקשר מינימלי כדי שההוראות יובנו.</p>' },
        { id: 'wf', x: 440, y: 140, w: 140, label: 'Workflow', sub: 'שלבים ממוספרים ⤵', color: 'llm', info: '<p>ליבת ה-Skill: רשימת שלבים ממוספרת, בסדר ביצוע. כל שלב — פעולה אחת עם קריטריון ברור. כאן מפנים לסקריפטים ("הרץ <code>scripts/validate.py</code>").</p>', children: stepSpec() },
        { id: 'rules', x: 270, y: 140, w: 140, label: 'Rules', sub: 'מגבלות ואיסורים', color: 'warn', info: '<p>"לעולם אל תמציא ערך", פורמט מספרים, שפה. כללים קצרים וקשיחים; כל כלל שנוסף בעקבות כשל אמיתי בבדיקות.</p>' },
        { id: 'ex', x: 110, y: 140, w: 140, label: 'Examples', sub: 'או קישור ל-references', color: 'store', info: '<p>1–3 דוגמאות קלט→פלט. דוגמאות ארוכות עוברות ל-<code>references/examples.md</code> (רמה 3) כדי לא להכביד על הגוף.</p>' }
      ],
      edges: [{ from: 'fm', to: 'ov' }, { from: 'ov', to: 'wf' }, { from: 'wf', to: 'rules' }, { from: 'rules', to: 'ex' }]
    };
  }
  function folderSpec() {
    return {
      title: 'תיקיית Skill', width: 900, height: 380,
      intro: '<div class="dg-hint">Skill = <b>תיקייה</b>. רק SKILL.md חובה; השאר אופציונלי ונטען לפי דרישה. לחצו על SKILL.md וצללו.</div>',
      nodes: [
        { id: 'dir', x: 800, y: 190, w: 160, h: 70, label: 'hebrew-invoice-', sub: 'extractor/', icon: '📁', color: 'ext', info: '<p>שם התיקייה = שם ה-Skill. בקלוד קוד: <code>.claude/skills/&lt;name&gt;/</code>. ב-API: מעלים את התיקייה כ-Skill מותאם אישית.</p>' },
        { id: 'md', x: 520, y: 190, w: 160, h: 70, label: 'SKILL.md', sub: 'חובה · לחצו ⤵', icon: '📄', color: 'llm', info: '<p>הקובץ היחיד החובה. frontmatter נטען תמיד (רמה 1), הגוף — כשהמודל מחליט שה-Skill רלוונטי (רמה 2).</p>', children: anatomySpec() },
        { id: 'scr', x: 240, y: 70, w: 160, label: 'scripts/', sub: 'קוד שרץ (רמה 3)', icon: '⚙️', color: 'tool', info: '<p>קוד שהמודל מריץ דרך bash. <b>רק הפלט</b> נכנס ל-context, לא הקוד. מצוין לפעולות דטרמיניסטיות: ולידציה, המרות, פרסור, יצירת קבצים — ובמקום לבקש מהמודל "לחשב".</p>' },
        { id: 'ref', x: 240, y: 190, w: 160, label: 'references/', sub: 'מסמכים (רמה 3)', icon: '📚', color: 'store', info: '<p>מסמכי עזר שנקראים רק כשצריך: schema מלא, מדריך מדיניות, דוגמאות. 10 קבצים שכל אחד נקרא רק כשרלוונטי = אפס עלות ב-context כשלא רלוונטי.</p>' },
        { id: 'ast', x: 240, y: 310, w: 160, label: 'assets/', sub: 'תבניות וקבצים', icon: '🧩', color: 'data', info: '<p>קבצים שהסקריפטים משתמשים בהם או שמעתיקים לפלט: תבנית PPTX, לוגו, גופן, קובץ טופס ריק. לרוב לא נקראים ע"י המודל כלל.</p>' }
      ],
      edges: [{ from: 'dir', to: 'md', label: 'L1+L2' }, { from: 'md', to: 'scr', dashed: true, label: 'L3' }, { from: 'md', to: 'ref', dashed: true }, { from: 'md', to: 'ast', dashed: true }]
    };
  }
  function systemSpec() {
    return {
      title: 'סוכן עם ספריית Skills', width: 900, height: 420,
      intro: '<div class="dg-hint">הסוכן רואה בתחילה רק <b>אינדקס</b> של Skills (שם+תיאור). כשבקשה מתאימה — הוא <b>קורא</b> את SKILL.md מהדיסק (דרך כלי קבצים/bash) ופועל לפיו. לחצו על "Skill: invoice" וצללו.</div>',
      groups: [{ x: 230, y: 20, w: 340, h: 380, label: 'ספריית Skills (דיסק / קונטיינר)', color: 'ext' }],
      nodes: [
        { id: 'user', x: 830, y: 210, w: 110, label: 'משתמש', icon: '👤', color: 'ui', shape: 'round', info: '<p>"חלץ לי את הנתונים מהחשבונית הזו" (+ קובץ).</p>' },
        { id: 'agent', x: 670, y: 210, w: 150, h: 70, label: 'Claude', sub: 'לולאת סוכן', color: 'llm', info: '<p>מודל + לולאה (ראו <a href="#/agents">מודול הסוכנים</a>) עם כלי bash / קבצים. ה-system prompt מכיל את <b>אינדקס ה-Skills</b>: שורה אחת לכל Skill. ' + M('sonnet') + ' כברירת מחדל; ' + M('haiku') + ' כשה-Skills מוגדרים היטב.</p>' },
        { id: 'idx', x: 670, y: 70, w: 150, label: 'אינדקס (L1)', sub: 'name + description', color: 'data', info: '<p>כ-100 טוקנים לכל Skill, נטען תמיד. עם 50 Skills זה ~5K טוקנים — לעומת מאות אלפי טוקנים אם היו נטענים במלואם. זה ה-<b>progressive disclosure</b>.</p>' },
        { id: 's1', x: 400, y: 80, w: 170, label: 'Skill: invoice', sub: 'לחצו ⤵', color: 'tool', children: folderSpec(), info: '<p>Skill שנבחר: ה-SKILL.md שלו נקרא לתוך ה-context (L2), ואם צריך — גם scripts ו-references (L3).</p>' },
        { id: 's2', x: 400, y: 170, w: 170, label: 'Skill: pptx', color: 'tool', info: '<p>Skill נוסף בספרייה. לא נטען כל עוד הבקשה לא מתאימה לתיאור שלו → עלות context אפסית.</p>' },
        { id: 's3', x: 400, y: 260, w: 170, label: 'Skill: sql-review', color: 'tool', info: '<p>עוד Skill. הספרייה יכולה לגדול לעשרות Skills בלי להכביד, בזכות הטעינה ההדרגתית.</p>' },
        { id: 's4', x: 400, y: 350, w: 170, label: 'Skill: brand-guide', color: 'tool', info: '<p>Skill של ידע/סגנון (ללא קוד) — בעיקר הוראות ו-references.</p>' },
        { id: 'sbx', x: 110, y: 210, w: 150, h: 90, label: 'Sandbox', sub: 'קבצים + הרצת קוד', color: 'warn', shape: 'db', info: '<p>סביבת הרצה (קונטיינר code execution, מחשב המשתמש, או Agent SDK). כאן רצים ה-scripts. <b>הסיכון:</b> Skill הוא קוד — התקינו רק מקורות מהימנים.</p>' }
      ],
      edges: [{ from: 'user', to: 'agent', both: true }, { from: 'idx', to: 'agent', color: 'data' }, { from: 'agent', to: 's1', label: 'קורא SKILL.md', color: 'tool' }, { from: 'agent', to: 's2', dashed: true }, { from: 'agent', to: 's3', dashed: true }, { from: 'agent', to: 's4', dashed: true }, { from: 's1', to: 'sbx', color: 'warn' }, { from: 's3', to: 'sbx', dashed: true }]
    };
  }
  function levelsSpec() {
    return {
      title: 'שלוש רמות טעינה', width: 900, height: 240,
      intro: '<div class="dg-hint">לחצו על כל רמה — מה נטען, מתי, וכמה זה עולה.</div>',
      nodes: [
        { id: 'l0', x: 800, y: 120, w: 140, h: 70, label: 'בקשה', sub: 'מהמשתמש', color: 'ui', shape: 'round', info: '<p>הבקשה מגיעה, והמודל משווה אותה לתיאורים ברמה 1.</p>' },
        { id: 'l1', x: 590, y: 120, w: 160, h: 70, label: 'רמה 1: Metadata', sub: '~100 טוקנים / Skill', color: 'data', info: '<p><b>תמיד נטען</b> ל-system prompt: name + description של כל Skill. זה המנגנון לבחירה — לכן ה-description הוא החלק הקריטי ביותר.</p>' },
        { id: 'l2', x: 370, y: 120, w: 160, h: 70, label: 'רמה 2: הוראות', sub: 'גוף SKILL.md · <5K', color: 'llm', info: '<p><b>נטען כשהמודל בוחר את ה-Skill</b> — הוא קורא את SKILL.md דרך bash. מומלץ לשמור על גוף קצר (פחות מ-~500 שורות).</p>' },
        { id: 'l3', x: 140, y: 120, w: 160, h: 70, label: 'רמה 3: משאבים', sub: 'scripts / references', color: 'tool', info: '<p><b>נטען/מורץ לפי צורך</b>: קבצים נקראים רק כשההוראות מפנות אליהם; סקריפטים רצים ורק הפלט נכנס ל-context. כמעט אין תקרה לגודל המשאבים.</p>' }
      ],
      edges: [{ from: 'l0', to: 'l1' }, { from: 'l1', to: 'l2', label: 'רלוונטי?' }, { from: 'l2', to: 'l3', label: 'צריך עוד?', dashed: true }]
    };
  }

  /* ===================== LAB 1: progressive disclosure ===================== */
  function discLab(el) {
    const st = { thr: 2 };
    const ta = h('textarea', { rows: 3, style: { width: '100%' }, dir: 'auto' });
    ta.value = 'יש לי חשבונית מס בעברית, תחלץ לי ממנה את הנתונים ל-JSON';
    const presets = [
      ['חשבונית', 'יש לי חשבונית מס בעברית, תחלץ לי ממנה את הנתונים ל-JSON'],
      ['SQL', 'Please review this SQL query and optimize it, it is slow'],
      ['מצגת', 'צריך מצגת רבעונית עם גרפים ל-QBR'],
      ['אף Skill', 'מה מזג האוויר מחר בחיפה?'],
      ['שניים', 'Build a dashboard chart and a quarterly deck from KPI data']
    ];
    const prow = h('div', { class: 'pill-row' }, ...presets.map(p => h('button', { type: 'button', class: 'btn ghost', onclick: () => { ta.value = p[1]; draw(); } }, p[0])));
    const lib = h('div', { class: 'skills-lib' });
    const out = h('div');
    const thr = LA.slider('סף התאמה (מילים תואמות)', 1, 4, 1, st.thr, v => { st.thr = v; draw(); });
    ta.addEventListener('input', draw);
    el.appendChild(h('div', { class: 'lab' }, h('div', { class: 'lab-h' }, '🧰 מעבדה: Progressive Disclosure'),
      h('p', { class: 'muted' }, 'כתבו בקשה. המעבדה משווה אותה לתיאורי ה-Skills (חפיפת מילות מפתח — הדמיה פשוטה; המודל האמיתי משתמש בהבנה סמנטית) ומציגה מה נטען לכל רמה.'),
      ta, prow, thr, lib, out));
    function draw() {
      const req = new Set();
      tokenize(ta.value).forEach(w => variants(w).forEach(v => req.add(v)));
      const scored = LIB.map(s => {
        const dt = new Set(); tokenize(s.name.replace(/-/g, ' ') + ' ' + s.d).forEach(w => variants(w).forEach(v => dt.add(v)));
        const hits = [...req].filter(w => dt.has(w));
        // count unique descriptive words (avoid double count of variants)
        return { s, score: new Set(hits).size, hits };
      });
      const best = Math.max(...scored.map(x => x.score));
      let l1 = 0, l2 = 0, l3 = 0, full = SYSTEM_BASE;
      lib.innerHTML = '';
      scored.forEach(x => {
        const s = x.s, loaded = x.score >= st.thr;
        const needL3 = loaded && s.scripts && x.score >= st.thr + 1 && x.score === best || (loaded && s.t3 > 0 && x.score >= st.thr + 2);
        l1 += l1Tokens(s); full += l1Tokens(s) + s.t2 + s.t3;
        if (loaded) l2 += s.t2; if (needL3) l3 += s.t3;
        const card = h('div', { class: 'skills-card' + (needL3 ? ' l3' : loaded ? ' l2' : ' l1') },
          h('span', { class: 'skills-score' }, 'התאמה: ' + x.score), h('b', null, s.name),
          h('span', { class: 'muted' }, needL3 ? 'L1 + L2 + L3 נטענו (' + (s.t2 + s.t3).toLocaleString('en-US') + ' טוקנים)' : loaded ? 'L1 + L2 נטענו (' + s.t2.toLocaleString('en-US') + ' טוקנים)' : 'רק L1 (~' + l1Tokens(s) + ' טוקנים)'),
          x.hits.length ? h('div', { class: 'agents-note', style: { direction: 'ltr', textAlign: 'left' } }, x.hits.slice(0, 5).join(', ')) : null);
        lib.appendChild(card);
      });
      const prog = SYSTEM_BASE + l1 + l2 + l3;
      const pct = v => (v / full * 100).toFixed(1) + '%';
      const loadedNames = scored.filter(x => x.score >= st.thr).sort((a, b) => b.score - a.score).map(x => x.s.name);
      out.innerHTML =
        `<div class="agents-stat"><span>הכל נטען במלואו: <b>${full.toLocaleString('en-US')}</b> טוקנים</span><span>Progressive: <b>${prog.toLocaleString('en-US')}</b> טוקנים</span><span>חיסכון: <b>${Math.round((1 - prog / full) * 100)}%</b></span></div>` +
        `<p class="muted" style="margin:8px 0 2px">הכל נטען (system ${SYSTEM_BASE.toLocaleString('en-US')} + כל ה-Skills):</p><div class="skills-meter"><i class="s0" style="width:100%;background:#f87171"></i></div>` +
        `<p class="muted" style="margin:8px 0 2px">Progressive disclosure:</p><div class="skills-meter"><i class="s3" style="width:${pct(SYSTEM_BASE)};background:#64748b"></i><i class="s0" style="width:${pct(l1)}"></i><i class="s1" style="width:${pct(l2)}"></i><i class="s2" style="width:${pct(l3)}"></i></div>` +
        `<div class="skills-legend"><span>⬜ system בסיסי</span><span>🟦 L1 (אינדקס)</span><span>🟪 L2 (SKILL.md)</span><span>🟧 L3 (scripts/references)</span></div>` +
        (loadedNames.length ? `<div class="agents-rec"><h4>מה קורה:</h4><ul><li>המודל רואה את האינדקס (L1) ומזהה התאמה: <b dir="ltr">${loadedNames.join(', ')}</b></li><li>הוא קורא את SKILL.md של ${loadedNames.length > 1 ? 'כל אחד מהם' : 'ה-Skill'} (L2).</li>${l3 ? '<li>הוא מריץ סקריפט / קורא reference (L3) — ורק הפלט נכנס ל-context.</li>' : ''}</ul></div>` :
          '<div class="agents-rec"><h4>מה קורה:</h4><p>אף תיאור לא מתאים מעל הסף → <b>אף Skill לא נטען</b>, והמודל עונה לבד. עלות ה-Skills: רק האינדקס. (בפועל המודל מחליט סמנטית; חפיפת מילים היא רק הדמיה.)</p></div>');
    }
    draw();
  }

  /* ===================== LAB 2: builder / linter ===================== */
  function lintLab(el) {
    const f = {
      name: 'hebrew-invoice-extractor',
      desc: 'Helps with invoices.',
      body: '# Invoice extractor\n\n## Workflow\n1. Read the invoice text.\n2. Extract the fields to JSON.\n3. Run `python scripts/validate.py /tmp/invoice.json`.\n4. Return the JSON only.\n'
    };
    const inName = h('input', { type: 'text', value: f.name, dir: 'ltr' });
    const inDesc = h('textarea', { rows: 4, dir: 'auto' }); inDesc.value = f.desc;
    const inBody = h('textarea', { rows: 8, dir: 'ltr', style: { fontFamily: 'var(--mono)' } }); inBody.value = f.body;
    const fill = h('button', { type: 'button', class: 'btn ghost', onclick: () => { inDesc.value = 'Extracts structured fields (vendor, VAT ID, invoice number, line items, totals) from Hebrew or bilingual invoices and returns validated JSON. Use when the user pastes or uploads an invoice, receipt, or asks to parse invoice data.'; draw(); } }, 'טען תיאור טוב');
    const bad = h('button', { type: 'button', class: 'btn ghost', onclick: () => { inDesc.value = 'I can help you with documents and stuff'; draw(); } }, 'טען תיאור גרוע');
    const prev = h('div'), res = h('div');
    el.appendChild(h('div', { class: 'lab' }, h('div', { class: 'lab-h' }, '🛠️ מעבדה: בונה SKILL.md ומנקה (linter)'),
      h('div', { class: 'skills-grid' },
        h('div', { class: 'skills-form' },
          h('label', null, 'name (אותיות קטנות, ספרות, מקפים)', inName),
          h('label', null, 'description (מה עושה + מתי להשתמש)', inDesc), h('div', { class: 'pill-row' }, fill, bad),
          h('label', null, 'גוף ההוראות (Markdown)', inBody)),
        h('div', null, res, prev))));
    [inName, inDesc, inBody].forEach(x => x.addEventListener('input', draw));
    function draw() {
      const name = inName.value.trim(), desc = inDesc.value.trim(), body = inBody.value;
      const w = []; let score = 100;
      const add = (lvl, msg, pen) => { w.push([lvl, msg]); score -= pen; };
      if (!name) add('bad', 'חסר name.', 25);
      else {
        if (!/^[a-z0-9-]+$/.test(name)) add('bad', 'name חייב להכיל רק אותיות קטנות באנגלית, ספרות ומקפים.', 20);
        if (name.length > 64) add('bad', 'name ארוך מ-64 תווים.', 20);
        if (/anthropic|claude/.test(name)) add('bad', 'שמות שמורים: אסור להכיל "anthropic" או "claude".', 20);
      }
      if (!desc) add('bad', 'חסר description — בלעדיו המודל לא יידע מתי להפעיל את ה-Skill.', 40);
      else {
        if (desc.length < 60) add('bad', `description קצר/עמום (${desc.length} תווים). פרטו מה ה-Skill עושה, על אילו קבצים/נושאים.`, 25);
        if (desc.length > 1024) add('bad', `description ארוך מדי (${desc.length}/1024).`, 25);
        else if (desc.length > 600) add('mid', 'description ארוך (>600): הוא נטען תמיד ל-context ב-L1; קצרו.', 8);
        if (!/\b(use when|use this when|when the user|when asked|whenever|השתמש)/i.test(desc)) add('bad', 'חסר "מתי להשתמש": הוסיפו משפט "Use when …" עם טריגרים (מילים שהמשתמש יגיד, סוגי קבצים).', 25);
        if (/\b(i can|i will|i help|you can|אני )/i.test(desc)) add('mid', 'כתבו בגוף שלישי ("Extracts…", "Reviews…") — התיאור נכנס ל-system prompt; גוף ראשון/שני מבלבל.', 8);
        if (/\b(helps? with|stuff|things|various|misc|etc\b|documents?\.?$)/i.test(desc)) add('mid', 'ניסוח עמום ("helps with", "stuff", "documents"): השתמשו בפעלים ובשמות עצם קונקרטיים.', 12);
        if (/[<>]/.test(desc)) add('mid', 'הימנעו מתגי XML/HTML ב-description.', 5);
      }
      const lines = body.split('\n').length;
      if (lines > 500) add('mid', `גוף ארוך (${lines} שורות). שמרו SKILL.md מתחת ל~500 שורות; העבירו פרטים ל-references/.`, 10);
      if (!/^\s*\d+\./m.test(body)) add('mid', 'אין שלבים ממוספרים. Workflow ברור משפר עקביות.', 8);
      if (!/never|do not|don't|אל |לעולם/i.test(body)) add('mid', 'אין כללים/איסורים מפורשים (למשל "never invent values").', 4);
      if (/scripts\//.test(body) && !/(retry|ניסיונות|if .*fail|errors?)/i.test(body)) add('mid', 'מפנה לסקריפט אך לא מגדיר מה לעשות כשהוא נכשל.', 6);
      score = Math.max(0, score);
      const lv = score >= 85 ? 'ok' : score >= 60 ? 'mid' : 'bad';
      res.innerHTML = `<div class="skills-warn ${lv}"><b>ציון איכות: ${score}/100</b> · description: ${desc.length} תווים · גוף: ${lines} שורות · L1 ≈ ${Math.ceil((name.length + desc.length) / 4) + 20} טוקנים</div>` +
        (w.length ? w.map(x => `<div class="skills-warn ${x[0]}">${x[0] === 'bad' ? '⛔' : '⚠️'} ${LA.esc(x[1])}</div>`).join('') : '<div class="skills-warn ok">✅ נראה טוב! בדקו כעת טריגרים אמיתיים (שאלות חיוביות ושליליות).</div>');
      const md = `---\nname: ${name}\ndescription: ${desc.replace(/\n/g, ' ')}\n---\n\n${body}`;
      prev.innerHTML = '<h4 style="margin-top:10px">תצוגה מקדימה: SKILL.md</h4>' + LA.code(md, 'yaml', 'SKILL.md');
    }
    draw();
  }

  /* ===================== MODULE ===================== */
  LA.register({
    id: 'skills', order: 70, group: 'build', icon: '🧰', short: 'Skills',
    title: 'Skills — יכולות ארוזות לסוכנים',
    render(main) {
      LA.page(main, {
        icon: '🧰', title: 'Skills — יכולות ארוזות לסוכנים',
        subtitle: 'תיקיית הוראות, סקריפטים ומשאבים שהסוכן <b>טוען רק כשצריך</b>. הופכים מודל כללי למומחה — בלי להעמיס על ה-context ובלי fine-tuning.',
        sections: [
          { id: 'what', title: 'בשורה אחת + אנלוגיה', html:
            '<p><b>Agent Skill</b> = <b>תיקייה</b> שמכילה קובץ <code>SKILL.md</code> (frontmatter של YAML עם <code>name</code> ו-<code>description</code>, ואחריו הוראות ב-Markdown) ואופציונלית <code>scripts/</code>, <code>references/</code> ו-<code>assets/</code>. הסוכן רואה את התיאור בלבד, ואם הבקשה מתאימה — קורא את ההוראות ופועל לפיהן.</p>' +
            LA.callout('analogy', 'דמיינו עובד חדש בחברה. אתם לא מקריאים לו את כל חוברות הנהלים ביום הראשון. אתם נותנים <b>מדף עם תוויות על הכריכות</b> (רמה 1); כשצריך להנפיק חשבונית — הוא שולף את <b>החוברת הרלוונטית</b> (רמה 2), ובתוכה יש הפניה ל<b>נספחים וטפסים</b> שפותחים רק לפי צורך (רמה 3). Skill = חוברת נהלים ארוזה למודל.') +
            LA.callout('info', 'שימו לב לשם: בספרות ובפריימוורקים אחרים (Semantic Kernel, Alexa, GPTs) "skill" יכול להיות משהו אחר. כאן מדובר בתקן <b>Agent Skills</b> של Anthropic. ראו הסבר בסוף המודול.') },

          { id: 'levels', title: 'Progressive Disclosure — למה זה חוסך טוקנים', render(el) {
            el.insertAdjacentHTML('beforeend', '<p>הרעיון המרכזי: <b>לא לשלם context על מה שלא בשימוש</b>. שלוש רמות טעינה:</p>');
            LA.diagram(el, levelsSpec());
            el.insertAdjacentHTML('beforeend', LA.table(['רמה', 'מה נטען', 'מתי', 'עלות'], [
              ['1 — Metadata', '<code>name</code> + <code>description</code> מכל Skill', 'תמיד (בהתחלה)', '~100 טוקנים / Skill'],
              ['2 — Instructions', 'גוף SKILL.md', 'כשהבקשה מתאימה לתיאור', 'עד כמה אלפי טוקנים'],
              ['3 — Resources', 'קבצי references, סקריפטים, assets', 'רק כשההוראות מפנות אליהם', 'כמעט ללא תקרה; סקריפט = רק הפלט נספר']]));
            el.insertAdjacentHTML('beforeend', LA.callout('algo', 'חשבון פשוט: 40 Skills × 3,000 טוקנים בגוף = 120K טוקנים אם הכל טעון מראש (לא סביר גם בחלון גדול, ויקר: כל קריאה נושאת אותם). עם progressive disclosure: 40 × ~100 = 4K טוקנים לאינדקס, ועוד 3K לכל Skill שנבחר. בנוסף, פחות רעש = בחירה ודיוק טובים יותר. נסו זאת במעבדה למטה.'));
          } },

          { id: 'arch', title: 'דיאגרמה וצלילה פנימה', render(el) {
            el.insertAdjacentHTML('beforeend', '<p>ארבע רמות זום: <b>סוכן עם ספרייה</b> ← <b>תיקיית Skill אחד</b> ← <b>אנטומיה של SKILL.md</b> ← <b>צעד הוראה בודד</b>. לחצו על "Skill: invoice", אחר כך על SKILL.md, ואז על Workflow.</p>');
            LA.diagram(el, systemSpec());
            el.insertAdjacentHTML('beforeend', LA.callout('tip', 'המנגנון פשוט להפליא: ה-"בחירה" של Skill היא <b>המודל שקורא קובץ</b> (<code>cat SKILL.md</code>) — אין מנוע ניתוב נפרד. לכן איכות ה-description קובעת הכל.'));
          } },

          { id: 'example', title: 'דוגמה מוחשית: Skill לחילוץ חשבוניות בעברית', render(el) {
            el.insertAdjacentHTML('beforeend', '<p>צוות כספים ישראלי מקבל מאות חשבוניות מס בחודש. בונים Skill שמחלץ שדות ל-JSON ומאמת אותם בקוד דטרמיניסטי (ספרת ביקורת של ח.פ., התאמת סכומים ומע"מ).</p>');
            el.insertAdjacentHTML('beforeend', '<div class="skills-tree">' + LA.esc(TREE) + '</div>');
            LA.tabs(el, [
              { label: 'SKILL.md', html: LA.code(SKILL_MD, 'yaml', 'hebrew-invoice-extractor/SKILL.md') },
              { label: 'scripts/validate.py', html: LA.code(SKILL_PY, 'python', 'scripts/validate.py') + '<p class="muted">המודל מחלץ (בינה), הסקריפט מאמת (דטרמיניזם). הסקריפט לא נכנס ל-context — רק המילה <code>OK</code> או רשימת שגיאות.</p>' },
              { label: 'מה קורה בריצה', html: LA.list([
                '<b>L1:</b> ה-system מכיל שורה: <code>hebrew-invoice-extractor: Extracts structured fields … Use when the user pastes an invoice…</code>',
                'המשתמש מדביק חשבונית ← המודל מזהה התאמה וקורא את <code>SKILL.md</code> (<b>L2</b>, ~600 טוקנים).',
                'הוא מחלץ ל-JSON וקורא ל-<code>python scripts/validate.py</code> (<b>L3</b>) ← שגיאה: <code>subtotal: expected 1250.0</code>.',
                'הוא מתקן את השדה ומריץ שוב ← <code>OK</code>. מחזיר JSON.']) }
            ]);
            el.insertAdjacentHTML('beforeend', '<h3>איזה מודל מריץ אותו?</h3>' + LA.table(['מצב', 'מודל', 'נימוק'], [
              ['חשבוניות סטנדרטיות, Skill מוגדר היטב + ולידטור', M('haiku'), 'משימה צרה ומוגדרת, הסקריפט תופס טעויות. זול ומהיר (אלפי חשבוניות ביום).'],
              ['חשבוניות מבולגנות/סרוקות/רב-שפתיות', M('sonnet'), 'דורש פרשנות; יציב יותר בכלים ובקריאת מסמכים.'],
              ['Skill פתוח: "נתח את הוצאות הרבעון והמלץ"', M('opus'), 'הוראות פתוחות שדורשות שיקול דעת ותכנון.'],
              ['Pipeline מומלץ', 'cascade', 'Haiku קודם; אם <code>validate.py</code> נכשל פעמיים ← Sonnet; <code>needs_review</code> ← בן אדם.']]));
            el.insertAdjacentHTML('beforeend', LA.callout('tip', 'כלל אצבע: ככל שה-Skill מפורט וניתן לאימות — כך אפשר לרדת דרגה. <b>Skill טוב הוא "מכפיל כוח" למודל קטן.</b> אבל בדקו: Skill שעובד על Opus עלול להיכשל על Haiku אם ההוראות מניחות הסקה. הריצו את אותו סט בדיקות על כל הדרגות. ראו <a href="#/agents">ניתוב מודלים</a>.'));
          } },

          { id: 'lab1', title: 'מעבדה: סימולטור Progressive Disclosure', render: discLab },
          { id: 'lab2', title: 'מעבדה: בונה SKILL.md ו-linter', render: lintLab },

          { id: 'compare', title: 'Skills מול Tools, MCP, Sub-agents, System prompt ו-Fine-tuning', render(el) {
            el.insertAdjacentHTML('beforeend', LA.table(['מנגנון', 'מה זה', 'נטען ל-context', 'מריץ קוד?', 'הכי מתאים ל-', 'חיסרון'], [
              ['<b>Skill</b>', 'תיקיית הוראות + קוד + משאבים', 'הדרגתי (L1 תמיד)', 'כן (scripts)', 'נהלים, פורמטים, מומחיות חוזרת', 'דורש סביבת הרצה/קבצים; תלוי באיכות description'],
              ['<b>Tool</b>', 'פונקציה עם schema שהמודל קורא לה', 'הגדרת הכלי תמיד', 'הקוד שלכם', 'פעולה אחת בעולם (API call)', 'כל כלי ב-context תמיד; אין "ידע נהלים"'],
              ['<b>MCP server</b>', 'חשיפת כלים/משאבים בפרוטוקול סטנדרטי', 'הגדרות כלים', 'שרת חיצוני', 'חיבור למערכות חיצוניות (Jira, DB)', 'תשתית; אבטחה; תיאורי כלים מנפחים context'],
              ['<b>Sub-agent</b>', 'סוכן נפרד עם context משלו', 'context נפרד', 'כן', 'חקירה בנפח, מקביליות, בידוד', 'עלות טוקנים; תיאום'],
              ['<b>System prompt</b>', 'הוראות קבועות לכל שיחה', 'תמיד ובמלואו', 'לא', 'כללים גלובליים קצרים', 'לא מתרחב: כל הוראה יקרה תמיד'],
              ['<b>Fine-tuning</b>', 'שינוי משקולות המודל', 'לא (בתוך המודל)', 'לא', 'סגנון/פורמט יציב בנפח עצום', 'יקר, איטי לעדכון, לא מתאים לידע משתנה']]));
            el.insertAdjacentHTML('beforeend', LA.callout('info', 'הם משלימים, לא מתחרים: Skill אומר <b>איך</b> לעבוד (נוהל), Tool/MCP נותנים <b>גישה</b> למערכות, Sub-agent נותן <b>בידוד ומקביליות</b>, ו-RAG נותן <b>ידע עדכני</b>. Skill יכול להורות "קרא ל-tool X ואז בדוק עם הסקריפט Y". ' + 'ואפשר להריץ סוכן-משנה עם Skills משלו.'));
          } },

          { id: 'where', title: 'איפה Skills רצים ואיך משתמשים', render(el) {
            el.insertAdjacentHTML('beforeend', LA.table(['סביבה', 'איך מוסיפים Skill'], [
              ['<b>אפליקציות Claude</b>', 'העלאת Skill מותאם אישית בהגדרות (ויש Skills מובנים כמו יצירת קבצי Office/PDF)'],
              ['<b>Claude Code</b>', 'תיקייה ב-<code>~/.claude/skills/</code> (אישי) או <code>.claude/skills/</code> בפרויקט (משותף דרך git)'],
              ['<b>Claude API</b>', 'פרמטר <code>container={"skills": [...]}</code> יחד עם כלי code execution'],
              ['<b>Agent SDK</b>', 'טעינת Skills מהדיסק דרך הגדרות הפרויקט (אותו פורמט תיקייה)']]));
            LA.tabs(el, [
              { label: 'Claude API', html: LA.code(CODE_API, 'python', 'Skills via the Messages API') },
              { label: 'Claude Code', html: LA.code(CODE_CC, 'bash', 'Claude Code skills') }
            ]);
            el.insertAdjacentHTML('beforeend', LA.callout('warn', 'פרטי ה-beta (שמות ה-betas, גרסאות כלי ה-code execution, זמינות בסביבות שונות) משתנים. הקוד כאן מדגים את המבנה — אמתו מול התיעוד העדכני לפני העלאה לייצור.'));
          } },

          { id: 'craft', title: 'כתיבה, בדיקה, גרסאות ואבטחה', render(el) {
            el.insertAdjacentHTML('beforeend', '<h3>כתיבת description טוב (טריגרים)</h3>' + LA.table(['', 'דוגמה', 'בעיה / יתרון'], [
              ['⛔ עמום', '<code>Helps with documents</code>', 'יתפוס הכל או כלום; אין טריגרים'],
              ['⛔ בגוף ראשון', '<code>I can help you process PDFs</code>', 'נכנס ל-system prompt; יש לכתוב בגוף שלישי'],
              ['⚠️ בלי "מתי"', '<code>Extracts invoice fields to JSON</code>', 'חסר משפט טריגר — לא ברור מתי להפעיל'],
              ['✅ טוב', '<code>Extracts structured fields from Hebrew invoices and returns validated JSON. Use when the user pastes or uploads an invoice or asks to parse invoice data.</code>', 'מה + מתי + מילות טריגר + סוג קלט']]));
            el.insertAdjacentHTML('beforeend', LA.list([
              '<b>כללי כתיבה:</b> גוף שלישי; פעלים קונקרטיים; כללו מילים שמשתמשים באמת אומרים (גם בעברית); ציינו סוגי קבצים; הבדילו מ-Skills קרובים ("not for SQL").',
              '<b>גוף:</b> קצר (מתחת ל~500 שורות), שלבים ממוספרים, כללי "לעולם לא", ופיצול לקבצי references. הפנו ישירות מ-SKILL.md (עומק הפניה אחד).',
              '<b>סקריפטים:</b> העדיפו קוד לכל מה שדטרמיניסטי; טפלו בשגיאות והחזירו הודעות ברורות שהמודל יכול לפעול לפיהן.']));
            el.insertAdjacentHTML('beforeend', '<h3>בדיקות (evals) ל-Skill</h3>' + LA.list([
              '<b>טריגרים:</b> סט של 20+ בקשות חיוביות (צריך להפעיל) ושליליות (לא להפעיל, כולל כמעט-התאמות). מדדו precision ו-recall של ההפעלה.',
              '<b>איכות פלט:</b> השוו עם Skill ובלעדיו (A/B) על משימות אמיתיות; הגדירו קריטריונים (schema תקין, שדות נכונים).',
              '<b>מודלים:</b> הריצו על Haiku, Sonnet ו-Opus. מה שעובד על Opus אולי דורש הוראות מפורשות יותר ל-Haiku.',
              '<b>רגרסיה:</b> כל עריכה של description או הוראות — הריצו שוב את הסט. שינוי מילה אחת ב-description יכול לשנות את ההפעלה.']));
            el.insertAdjacentHTML('beforeend', '<h3>גרסאות</h3>' + LA.list(['תיקיית ה-Skill ב-git; תיוג גרסאות (v1.2.0) ו-changelog קצר.', 'ב-API אפשר לנעול גרסה או להצביע על <code>latest</code> — בייצור נעלו גרסה ושדרגו אחרי evals.', 'שמרו את סט הבדיקות לצד ה-Skill באותה תיקייה/ריפו.']));
            el.insertAdjacentHTML('beforeend', LA.callout('warn', '<b>אבטחה:</b> Skill הוא <b>קוד והוראות שהמודל מבצע</b> — כמו חבילת תוכנה. Skill זדוני יכול להורות להדליף נתונים, להריץ סקריפט מזיק או לגרום לשימוש לרעה בכלים. התקינו רק Skills שכתבתם או ממקור מהימן, סקרו את כל הקבצים (כולל scripts ו-references), הגבילו הרשאות (<code>allowed-tools</code> ב-Claude Code), הריצו בסביבה מבודדת בלי סודות וגישת רשת מיותרת, וזכרו ש-SKILL.md עצמו הוא וקטור ל-prompt injection.'));
          } },

          { id: 'generic', title: 'ובמסגרות אחרות — "skill" אחר', html:
            LA.table(['מונח', 'משמעות'], [
              ['<b>Agent Skills (Anthropic)</b>', 'תיקיית SKILL.md עם טעינה הדרגתית — נושא המודול הזה.'],
              ['<b>Semantic Kernel</b>', 'במקור "skills", כיום <b>plugins</b>: אוספי פונקציות (native או prompt) שה-planner/המודל יכול לקרוא — קרוב יותר ל-<i>tools</i>.'],
              ['<b>LangChain / LangGraph</b>', 'אין מושג "skill" מקביל; משתמשים ב-<i>tools</i>, ב-<i>subgraphs</i> או ב-<i>prompts</i> שנטענים לפי צורך.'],
              ['<b>Alexa Skills / GPT Actions</b>', 'אפליקציות/אינטגרציות חיצוניות — ללא קשר לתקן SKILL.md.'],
              ['<b>Skill library (מחקר, למשל Voyager)</b>', 'ספרייה של קטעי קוד שסוכן למד ושומר ושולף — רעיון דומה, מימוש אחר.']]) +
            '<p class="muted">כלל: כששומעים "skill", שאלו — האם זה הוראות+קבצים שנטענים הדרגתית (Agent Skill), או פונקציה שנקראת (tool/plugin)?</p>' },

          { id: 'llm', title: 'הקשר ל-LLM', html:
            LA.callout('llm', LA.list([
              'Skills עובדים כי המודל <b>יודע לקרוא קבצים ולהריץ bash</b> (tool use) ולמלא הוראות — יכולת סוכן. בלי כלי קבצים אין טעינה הדרגתית. ראו <a href="#/agents">סוכנים</a>.',
              '<b>הבחירה</b> ב-Skill היא הסקה של המודל על בסיס ה-description — לא רגקס ולא embedding. לכן היא מושפעת מניסוח ומחוזק המודל.',
              '<b>Context window</b> הוא המשאב המוגבל; progressive disclosure שומר אותו פנוי להיסטוריה ולנתונים, ומפחית "context rot".',
              '<b>ניתוב דרגות:</b> Skill מפורט מאפשר ל-' + M('haiku') + ' לבצע משימות שלולא כן דרשו ' + M('sonnet') + '. סקריפטים מוציאים חישובים מהמודל לקוד.',
              'ההוראות הן "פרומפט מנוהל גרסאות": כל הכללים של הנדסת פרומפט חלים (ספציפיות, דוגמאות, פורמט פלט).']), 'איך זה מתחבר') },

          { id: 'profile', title: 'דרישות · חוזקות · חולשות', html: LA.profile({
            requirements: ['סוכן/מודל עם גישה לקבצים ו-bash (או code execution)', 'תיקיית Skill עם SKILL.md תקין (name + description)', 'description מנוסח היטב עם טריגרים', 'סביבת הרצה בטוחה לסקריפטים', 'סט בדיקות לטריגרים ולפלט'],
            strengths: ['חסכון בטוקנים בזכות טעינה הדרגתית', 'ידע ונהלים חוזרים ארוזים ומשותפים (git)', 'שילוב הוראות + קוד דטרמיניסטי', 'אין צורך ב-fine-tuning; עדכון = עריכת קובץ', 'מאפשר למודלים קטנים לבצע משימות מומחה', 'ניתן להרכבה — הרבה Skills בספרייה אחת'],
            weaknesses: ['תלוי באיכות ה-description — שגוי = לא מופעל או מופעל בטעות', 'דורש סביבת ביצוע (קבצים, קוד)', 'סיכון אבטחה: קוד והוראות לא מהימנים', 'קשה לבדוק טריגרים — התנהגות הסתברותית', 'הוראות עמוסות מדי מקשות על מודלים קטנים', 'ניהול גרסאות והפצה בארגון דורש משמעת'],
            algoTips: ['כתבו evals לטריגרים (חיוביים/שליליים) ולפלט', 'הריצו כל Skill על כל דרגות המודל שבשימוש', 'העבירו כל מה שדטרמיניסטי לסקריפט', 'שמרו SKILL.md קצר; פרטים ב-references', 'סקרו Skills צד-שלישי כמו תלות בקוד (supply chain)', 'עקבו אחרי שיעור ההפעלה ב-production (observability)'],
            whenToUse: ['כן: נוהל חוזר (דוחות, חילוץ, סקירת קוד), סגנון/מותג, כלים מורכבים עם הוראות שימוש', 'לא: גישה למערכת חיצונית (השתמשו ב-tool/MCP), ידע עובדתי עצום ומשתנה (RAG), או כלל קצר גלובלי (system prompt)']
          }) },

          { id: 'algo', title: 'עין של אלגוריתמאי', html:
            LA.callout('algo', '<b>צ\'קליסט Skill לייצור</b>') +
            '<h3>איכות והערכה</h3>' + LA.list(['מדדו <b>trigger precision/recall</b> על סט שאלות חיוביות ושליליות (כולל כמעט-התאמות וניסוחים בעברית ובאנגלית).', 'A/B: עם Skill מול בלעדיו — האם באמת משפר? לא כל Skill משתלם.', 'הריצו כמה פעמים; ההפעלה והפלט לא דטרמיניסטיים.', 'בדקו על כל הדרגות; Haiku דורש הוראות מפורשות יותר.', 'התנגשויות: האם שני Skills מתחרים על אותן בקשות? צרו הבחנה ב-description.']) +
            '<h3>עלות והשהיה</h3>' + LA.list(['L1 נספר בכל בקשה: 100 Skills ≈ 10K טוקנים קבועים. עם prompt caching העלות קטנה מאוד.', 'כל קריאת קובץ/סקריפט = סבב נוסף בלולאה (latency). שלבו קריאות כשאפשר.', 'ה-trade-off: סקריפט מוסיף סבב אבל חוסך טוקני הנמקה ומשפר אמינות.']) +
            '<h3>כשלים נפוצים</h3>' + LA.list(['Skill לא מופעל — description עמום או חסר מילות טריגר.', 'Skill מופעל מדי — description רחב מדי.', 'SKILL.md ענק שמזהם את ה-context ומבלבל.', 'הפניות מקוננות עמוקות (reference → reference): המודל קורא חלקית.', 'הוראות שסותרות את ה-system prompt.']) +
            '<h3>אבטחה ושחזור</h3>' + LA.list(['Supply chain: ביקורת קוד על כל Skill, נעילת גרסאות, מקורות מהימנים בלבד.', 'Sandbox בלי סודות, ובלי רשת אם אפשר.', 'לוג הפעלות: איזה Skill נטען, איזה סקריפט רץ, עם אילו פרמטרים.', 'שחזור: גרסת Skill + גרסת מודל + סט evals נשמרים יחד.']) },

          { id: 'quiz', title: 'בוחן', render(el) {
            LA.quiz(el, [
              { q: 'מה נכנס ל-system prompt <b>תמיד</b> עבור כל Skill מותקן?', options: ['כל גוף ה-SKILL.md', 'רק ה-name וה-description', 'כל הסקריפטים', 'שום דבר'], answer: 1, explain: 'רמה 1 (Metadata): name+description בלבד, כ-100 טוקנים. שאר הרמות נטענות לפי צורך.' },
              { q: 'איך סקריפט ב-<code>scripts/</code> משפיע על ה-context?', options: ['הקוד המלא נטען ל-context', 'רק הפלט של הסקריפט נכנס ל-context', 'הוא לא ניתן להרצה', 'הוא מחליף את ה-description'], answer: 1, explain: 'הסקריפט רץ בסביבה והמודל מקבל רק את הפלט — לכן שימושי לפעולות דטרמיניסטיות בלי עלות טוקנים.' },
              { q: 'איזה description הכי טוב?', options: ['"Helps with documents"', '"I can help you with invoices"', '"Extracts fields from Hebrew invoices into validated JSON. Use when the user pastes or uploads an invoice."', '"invoice"'], answer: 2, explain: 'מה עושה + מתי להשתמש + גוף שלישי + מילות טריגר.' },
              { q: 'מה ההבדל בין Skill ל-Tool?', options: ['אין הבדל', 'Tool הוא פונקציה שהמודל קורא לה; Skill הוא חבילת הוראות/קוד/משאבים הנטענת הדרגתית', 'Skill הוא סוג מודל', 'Tool תמיד איטי יותר'], answer: 1, explain: 'Tool = פעולה בעולם. Skill = נוהל/מומחיות ארוזים. הם משלימים זה את זה.' },
              { q: 'Skill מוגדר היטב עם סקריפט ולידציה לחילוץ חשבוניות. איזו דרגת מודל תנסו ראשונה?', options: ['Opus תמיד', 'Haiku, עם הסלמה ל-Sonnet כשהוולידציה נכשלת', 'אף מודל', 'Sonnet עם effort מקסימלי'], answer: 1, explain: 'משימה צרה עם אימות דטרמיניסטי: Haiku זול ומהיר, וה-cascade מגן על האיכות. אמתו בסט הערכה.' },
              { q: 'למה חשוב לסקור Skills של צד שלישי?', options: ['הם איטיים', 'הם יכולים להכיל קוד והוראות זדוניים, כמו כל תלות', 'הם לא נתמכים ב-API', 'כי הם תמיד גדולים'], answer: 1, explain: 'Skill מריץ קוד ומכוון את המודל — supply-chain risk. קוראים את כל הקבצים, מגבילים הרשאות ומריצים ב-sandbox.' },
              { q: 'ב-Semantic Kernel המונח "skill" (כיום plugin) מתייחס ל:', options: ['תיקיית SKILL.md של Anthropic', 'אוסף פונקציות שה-planner/מודל יכול לקרוא — קרוב ל-tools', 'סוג של embedding', 'מודל קטן'], answer: 1, explain: 'מונח זהה, משמעות שונה. כאן זה Agent Skills עם טעינה הדרגתית.' },
              { q: 'Skill לא מופעל אף שהבקשה רלוונטית. מה הגורם הסביר ביותר?', options: ['ה-description עמום או חסר מילות טריגר', 'גוף ה-SKILL.md קצר מדי', 'חסר קובץ assets', 'המודל קטן מדי תמיד'], answer: 0, explain: 'הבחירה מתבצעת על בסיס ה-description בלבד (רמה 1). שפרו אותו ובדקו טריגרים.' }
            ]);
          } }
        ]
      });
    }
  });
})();
