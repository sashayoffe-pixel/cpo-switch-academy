# LLM Academy — Build Contract (for every contributor, human or agent)

Interactive **Hebrew (RTL)** web course teaching: LLM internals (down to a single neuron), Chat interfaces,
RAG, LangChain, LangGraph, Agents & sub-agents, Skills, ComfyUI, ClearML — and how each one relates to LLMs.

## Hard technical rules
* **Vanilla HTML/CSS/JS. No build step, no ES modules, no external CDNs, no fonts/images from the net.**
  Must work when `index.html` is opened directly from disk (`file://`).
* Every module is ONE classic script `js/modules/<id>.js` (wrap in an IIFE, `'use strict'`) that calls `LA.register({...})`,
  plus optional styles in `css/modules/<id>.css` (already created & linked — only edit your own).
* **Do NOT edit** `index.html`, `css/main.css`, `js/core.js`, or other people's module files. If you need a core
  feature, implement it locally inside your module and mention it in your final report.
* Prefix every CSS class you add with your module id (e.g. `.rag-chunk`) to avoid collisions.
* No `console.log` noise; no uncaught errors. Use `LA.interval/LA.timeout/LA.onCleanup` for timers/animations so
  they stop when the user navigates away (router calls cleanups). For requestAnimationFrame loops, check
  `el.isConnected` and stop when false.
* Validate syntax when done: `node --check js/modules/<id>.js`.

## Language & tone
* All prose in **Hebrew**, right-to-left. Technical terms in English where that is how practitioners say it
  (e.g. "embedding", "retriever", "StateGraph"), optionally with a Hebrew gloss the first time.
* Code is in English (Python preferred; LTR is handled automatically by `LA.code`).
* Audience: an engineer becoming an **AI algorithm engineer** (אלגוריתמאי AI). Intuition first (analogy), then mechanics,
  then numbers/code, then pitfalls. Concrete, tangible examples (e.g. "a customer-support bot for an Israeli
  electricity company", "an HR policy Q&A bot", "a bug-triage agent") — not abstract fluff.
* Be accurate. Do not invent APIs. When unsure of an exact signature, show it as clearly-labelled pseudo-code.

## Current model facts to use (Nov 2026)
* Anthropic models — use exactly these IDs: `claude-haiku-5-5` (fast/cheap: routing, classification, extraction),
  `claude-sonnet-5-5` (balanced: everyday agent work, RAG answers, code), `claude-opus-5-5` (strongest: planning, complex
  reasoning, orchestration). `LA.modelBadge('haiku'|'sonnet'|'opus')` renders a pill; `LA.MODELS` has names/ids.
* Do NOT pass `temperature`/`top_p`/`top_k` in Claude code examples (current Claude models reject them). Temperature
  can still be *taught conceptually* (sampling), noting that on current hosted models depth is controlled by
  `output_config.effort` (`low|medium|high|xhigh|max`) instead.
* Anthropic Python SDK: `client = anthropic.Anthropic()`; `client.messages.create(model=..., max_tokens=..., system=..., messages=[...], tools=[...])`.
  Tool runner: `from anthropic import beta_tool` + `client.beta.messages.tool_runner(model=..., max_tokens=..., tools=[fn], messages=[...])`.
* LangChain ≥1.0: `from langchain_anthropic import ChatAnthropic`; `llm = ChatAnthropic(model="claude-sonnet-5-5")`;
  LCEL `chain = prompt | llm | StrOutputParser()`; agents via `from langchain.agents import create_agent`.
  LangGraph: `from langgraph.graph import StateGraph, START, END`; `add_node/add_edge/add_conditional_edges`;
  `compile(checkpointer=InMemorySaver())` (`from langgraph.checkpoint.memory import InMemorySaver`); `interrupt()` for human-in-the-loop.
* **Model routing principle** (the user explicitly asked for it): whenever you define agents / sub-agents / pipeline
  steps, say which model tier each one should use and WHY (complexity, latency, cost, volume). Show it with `LA.modelBadge`.

## Required page structure for a topic module
Use `LA.page(main, {icon, title, subtitle, sections:[...]})`. Each topic module should contain (adapt titles):
1. **בשורה אחת + אנלוגיה** — what it is, in one sentence, and an everyday analogy (`LA.callout('analogy', ...)`).
2. **איך זה עובד — דיאגרמה** — an `LA.diagram` of the architecture/flow, clickable, with `info` for every node.
3. **צלילה פנימה** — drill-down: nodes with `children` (nested diagram specs) so the learner can zoom from the system
   level down to the smallest unit (a single node/neuron/function/step). At least 2 levels deep; 3 is better.
4. **דוגמה מוחשית** — a full worked example with realistic data + code (`LA.code`).
5. **מעבדה אינטראקטיבית** — at least one real interactive simulation (sliders, step-through with `LA.stepper`,
   animated flow with `api.flow([...])`, text input that changes results...). It must actually compute something.
6. **הקשר ל-LLM** — exactly how this topic plugs into / depends on an LLM (`LA.callout('llm', ...)`).
7. **דרישות · חוזקות · חולשות** — `LA.profile({requirements, strengths, weaknesses, algoTips, whenToUse})`.
8. **עין של אלגוריתמאי** — what an AI algorithm engineer must watch: evaluation metrics, failure modes, cost/latency,
   data leakage, security (prompt injection), observability, reproducibility. Concrete checklists.
9. **בוחן** — `LA.quiz(el, [...])` with 5–8 questions, each with an explanation.

## Core API (window.LA) — see js/core.js
HTML-string helpers (return strings):
* `LA.callout(kind, html, title?)` kinds: `info|tip|warn|llm|algo|example|analogy`
* `LA.code(src, lang, title?)` lang: `python|js|json|bash|yaml|text`
* `LA.table(headers[], rows[][])`, `LA.list(items[])`, `LA.badge(text, kind?)` kind `ok|warn|acc`
* `LA.modelBadge('haiku'|'sonnet'|'opus')`, `LA.profile({...})`, `LA.esc(str)`
Mounting widgets (take a container element):
* `LA.page(main, {icon, title, subtitle(html), sections:[{id, title, html?, render?(el)}]})` — builds header, sections, TOC, prev/next.
* `LA.tabs(el, [{label, html? | render?(el)}])`
* `LA.quiz(el, [{q(html), options:[html...], answer:index, explain(html)}])` — records progress automatically.
* `LA.slider(label, min, max, step, value, onInput(v), fmt?)` → returns a `<label>` element (append it yourself; `.input`, `.fire()`).
* `LA.stepper(el, {intro?, steps:[{title, html, run?(ctx, silent)}], ctx?, onReset?(ctx), autoplayMs?})` — step-through player.
  `run` is called when the step is entered; when jumping backwards it replays earlier `run`s with `silent=true` after `onReset`.
* `LA.diagram(el, spec, opts?)` → api. spec:
  `{ title?, width:900, height:420, intro?(html for side panel), nodes:[{id, x, y (CENTER), w=150, h=56, label, sub?, icon?, color?, shape?, info?(html), children?(nested spec)}], edges:[{from, to, label?, dashed?, color?, bend?(px curvature), both?}], groups:[{x, y (top-left), w, h, label, color}] }`
  colors: `llm|data|tool|store|ctrl|ui|ext|warn|ok|neuron` or any hex. shapes: `rect(default)|round|circle|db|diamond`.
  Click a node → its `info` in the side panel; nodes with `children` show ⤵ and a "dive in" button; breadcrumbs go back.
  api: `select(id)`, `highlight([ids])`, `flow([id1,id2,...], msPerEdge?, color?)` (Promise, animates a glowing dot along edges),
  `flowEdge(from,to,ms,color)`, `setSub(id, text)`, `dive(id)`, `depth`, `svg`, `el`; `opts.onRender(api, depth)`, `opts.onSelect(node, api)`, `opts.compact` (panel under the svg).
  Layout tip: viewBox is `width × height`; keep labels short (≤ ~18 chars Hebrew at w=150; use `sub` for a second line);
  main flows go **right → left** (Hebrew reading order). Use `LA.s(tag, attrs, ...children)` to draw custom SVG.
* DOM: `LA.h(tag, attrs, ...children)` (attrs: `class`, `style` obj, `html`, `text`, `onclick`...), `LA.s(...)` for SVG.
* Timers: `LA.interval(fn, ms)`, `LA.timeout(fn, ms)`, `LA.onCleanup(fn)`, `LA.sleep(ms)`.
* Navigation: `LA.go(id)`; links `<a href="#/rag">`.
* CSS utility classes available: `.grid2 .grid3 .card .btn .btn.primary .btn.ghost .pill-row .pill .lab .lab-h .out .mono .muted .kbd`.

## Module registration
```js
(function () {
  'use strict';
  LA.register({
    id: 'rag', order: 30, group: 'build', icon: '📚', short: 'RAG', title: 'RAG — אחזור + יצירה',
    render(main) { LA.page(main, { icon: '📚', title: '...', subtitle: '...', sections: [ ... ] }); }
  });
})();
```
Groups/orders (fixed): home 0 `start` · llm 10 `core` · chat 20 `core` · rag 30 `build` · langchain 40 `build` ·
langgraph 50 `build` · agents 60 `build` · skills 70 `build` · comfyui 80 `ops` · clearml 90 `ops` ·
algorithmist 100 `pro` · capstone 110 `pro` · glossary 200 `ref` · exam 210 `ref`.
