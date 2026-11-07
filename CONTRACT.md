# NVIDIA CPO Switch — Interactive Training: Build Contract

Every contributor (human or agent) MUST follow this file. The app is **vanilla HTML/CSS/JS, no build step,
no ES modules, no external CDNs** — it must work when `index.html` is opened directly from disk (`file://`).
All scripts are classic `<script>` tags already listed in `index.html`. Do NOT edit `index.html`,
`css/base.css`, or `js/core.js` — if you need something from them, work around it inside your own files and
mention the need in your final report.

## Audience & tone
A senior CPO (co-packaged optics) system hardware engineer starting at NVIDIA. Go deep: physics, circuits,
numbers, equations, failure modes, design trade-offs. Explain intuitively first, then quantitatively.
Every module/topic should answer: **What it does · What it needs to work well · Its interfaces to the system ·
Key numbers/KPIs · What goes wrong (failure modes) · How it is monitored/controlled.**

## Accuracy policy (important)
* Use only public information about NVIDIA products. Never invent NVIDIA-internal specs.
* Label numbers: **[NVIDIA public]** for announced figures, **[typical]** for industry-typical/estimated values.
  Use the helper `CPO.badge('nv')` / `CPO.badge('typ')` which returns a small HTML badge.
* Public facts you may use (GTC 2025 announcements and public press):
  - **NVIDIA Quantum-X Photonics** (InfiniBand): 144 ports × 800 Gb/s (115 Tb/s), liquid-cooled, 200 Gb/s-per-lane SerDes class, based on Quantum-X800 generation silicon.
  - **NVIDIA Spectrum-X Photonics** (Ethernet): 128 × 800 Gb/s or 512 × 200 Gb/s (102.4 Tb/s); larger config 512 × 800 Gb/s or 2,048 × 200 Gb/s (409.6 Tb/s).
  - Claimed vs pluggable transceivers: **3.5× better power efficiency, 63× better signal integrity, 10× better network resiliency (fewer lasers / components), 4× fewer lasers, 1.3× faster deployment.**
  - Silicon photonics optical engines using **micro-ring modulators (MRM)**, built with **TSMC COUPE** (Compact Universal Photonic Engine) / SoIC 3D stacking (electronic IC stacked on photonic IC). 1.6 Tb/s-class optical engines co-packaged around the switch ASIC.
  - **External laser sources (ELS)**: front-panel-serviceable laser modules feed continuous-wave light to the engines via fiber (lasers kept away from the hot ASIC, replaceable).
  - Detachable fiber connectivity; ecosystem partners include TSMC, Coherent, Corning, Fabrinet, Foxconn, Lumentum, SENKO, SPIL, Sumitomo Electric, Browave, TFC.
  - Typical lane: 200G PAM4 (~106–113 GBd), O-band (~1310 nm region), multi-wavelength (WDM) per fiber is industry-typical for MRM engines [typical].
* Useful [typical] numbers: Si dn/dT ≈ 1.8e-4 /K → ring resonance drift ≈ 0.07–0.1 nm/K; MRM radius 5–10 µm, loaded Q 3k–20k, FSR 8–20 nm; heater tuning efficiency 0.1–0.3 nm/mW; Ge PD responsivity 0.8–1.0 A/W @1310 nm, dark current nA-level; fiber loss ≈0.33 dB/km @1310; fiber-to-chip coupling 1–3 dB; KP4 FEC RS(544,514) pre-FEC BER threshold ≈2.4e-4, post-FEC target ≤1e-13…1e-15; rack power 48–54 V busbar (OCP ORv3-style); optics energy targets ~5 pJ/bit CPO vs ~15–20 pJ/bit pluggable.

## Global API (provided by js/core.js — available as `window.CPO`)
```js
CPO.registerSection({ id, title, icon, order, render(container) { ...; return cleanupFn /*optional*/ } })
   // container is an empty <div class="section">. Router calls cleanupFn when user leaves (stop RAF loops!).
   // Section is reachable at index.html#<id>. Sub-routes: #<id>/<sub> → render(container, sub) 2nd arg and
   // CPO.route.sub. Optional onSubRoute(sub) on the def: if present, sub-route changes call it instead of re-rendering.
CPO.addGlossary({ 'MRM': { full: 'Micro-Ring Modulator', def: '...', cat: 'optics' }, ... })
CPO.glossary            // merged object of all terms
CPO.tip('MRM', label?)  // → HTML string <abbr class="g" data-term="MRM">MRM</abbr> with hover tooltip
CPO.linkify(element)    // auto-wraps every known glossary acronym inside element's text with tooltips
                        // (core calls this automatically on each section after render; call again after dynamic HTML)
CPO.badge('nv'|'typ'|'est') // → HTML badge string
CPO.h(tag, attrs, ...children) // DOM builder. attrs: {class, style (string|object), onclick, html, ...}
CPO.s(tag, attrs, ...children) // same for SVG namespace
CPO.loop(fn)            // requestAnimationFrame loop; fn(dtSeconds, tSeconds). returns stop()
CPO.fmt(n, digits=3)    // engineering formatting, e.g. 1.2e-12 → "1.20e-12", 12345 → "12.3k"
CPO.clamp, CPO.lerp, CPO.randn() // gaussian N(0,1)
CPO.on(evt, fn) / CPO.emit(evt, data)   // tiny event bus
CPO.go(hash)            // navigate, e.g. CPO.go('architecture/mrm')
CPO.arch.addNodes([...]) / CPO.arch.nodes  // architecture tree (see below)
```

## Theme (css/base.css — use these CSS variables, don't hardcode colors)
`--bg --bg2 --panel --panel2 --line --text --muted --accent(#76b900 NVIDIA green) --accent2(cyan) --warn --bad
--good --violet --optic(laser red/orange) --power(yellow) --data(cyan) --ctrl(violet) --therm(orange-red) --sense(pink)`
Reusable classes: `.card .grid2 .grid3 .pill .btn .btn.primary .muted .kpi .tabs .tab.active .callout .callout.warn
 .eq` (equation box, monospace) `.table` `.slider-row` (label + input[type=range] + output) `.h-sub`.
Domain colors MUST be consistent everywhere: data=cyan, optics=--optic, power=yellow, control=violet,
thermal=orange-red, sensing=pink, mechanical=grey.

## Architecture explorer node schema (js/arch/*)
`js/arch/engine.js` (owner: Agent A) registers section `architecture` and renders nodes; content files call
`CPO.arch.addNodes([...])`. Load order does not matter (engine reads nodes at render time).
```js
{
  id: 'optical-engine',          // kebab-case, unique
  parent: 'switch-package',      // parent id (root 'system' has parent null)
  title: 'Optical Engine (OE)',
  subtitle: '1.6T silicon-photonics engine, EIC-on-PIC',
  domain: 'optics',              // data|optics|power|control|thermal|sensing|mechanical
  level: 3,                      // depth hint 0=system … 7=atoms/transistor physics
  summary: 'one-paragraph plain-language summary',
  what: '<p>HTML: what it does, how it works internally (deep)</p>',
  needs: ['what is required for it to work well', ...],
  interfaces: [{ with: 'switch-asic / Laser / Fiber / BMC …', type: 'electrical|optical|thermal|mgmt|mechanical|power', detail: '...' }],
  kpis: [{ name: 'Energy/bit', value: '~5 pJ/b', tag: 'typ', note: '...' }],
  physics: '<div class="eq">equations</div><p>…</p>',   // optional deep physics / math
  failures: ['failure mode → effect → mitigation', ...],
  monitoring: ['how it is sensed / controlled / which feedback loop', ...],
  scene(g, api) { ... },          // draw into SVG <g>; viewBox is 0 0 1000 600. Use CPO.s(). Animate with
                                  // api.loop(fn) (auto-stopped on navigation). api.color(domain) → css color.
  hotspots: [ { target: 'child-id', x, y, w, h, label } ]  // clickable zoom regions in scene coordinates
}
```
Clicking a hotspot zoom-animates into that rectangle then shows the child's scene. If a target id does not
exist the engine shows it disabled ("coming soon"), so cross-agent ids below are FIXED — use them exactly.

### Fixed ids and ownership
* **Agent A (engine + core electrical):** `system` (root: the AI-factory / scale-out network & rack),
  `switch-chassis` (child of system), `switch-package` (child of switch-chassis: ASIC + OEs on substrate),
  `asic-die`, `package-substrate` (children of switch-package), `serdes`, `packet-buffer`, `pipeline-logic`
  (children of asic-die), `transistor` (child of serdes and conceptually of all logic; parent: 'asic-die'),
  plus any deeper children of those.
  Chassis scene MUST include hotspots to: `switch-package`, `external-laser`, `fiber-plant`, `power-delivery`,
  `thermal-system`, `control-plane`, `sensing-feedback`. Package scene MUST include hotspots to `asic-die`,
  `package-substrate`, `optical-engine` (several OE sites around the ASIC may all target `optical-engine`).
* **Agent B (optics):** `optical-engine` (parent switch-package), `external-laser` (parent switch-chassis),
  `fiber-plant` (parent switch-chassis) and all optical sub-nodes, e.g. `eic`, `pic`, `mrm`, `ring-physics`,
  `ring-lock-loop`, `waveguide`, `fiber-coupler`, `photodetector`, `tia`, `mrm-driver`, `wdm-mux`,
  `laser-diode`, `fiber-connector` … (prefix new ids freely; keep them unique).
* **Agent C (power/thermal/control/sensing):** `power-delivery`, `thermal-system`, `control-plane`,
  `sensing-feedback` (all parent switch-chassis) and their sub-nodes (e.g. `busbar-psu`, `vrm`,
  `power-stage-fet`, `cold-plate`, `coolant-loop`, `bmc`, `mgmt-cpu`, `cpld`, `cmis`, `temp-sensor`,
  `monitor-pd`, `adc`, `vrm-control-loop`, `thermal-control-loop`, `laser-apc-loop`).

## File ownership (write ONLY your files)
| Agent | Files |
|---|---|
| A Architecture engine + core | js/arch/engine.js, js/arch/nodes-core.js, css/arch.css |
| B Optics nodes | js/arch/nodes-optics.js |
| C Power/thermal/control nodes | js/arch/nodes-ptc.js |
| D Data-flow simulator | js/sections/dataflow.js, css/dataflow.css |
| E Noise lab | js/sections/noise.js, css/noise.css |
| F System budgets | js/sections/budgets.js, css/budgets.css |
| G Home + KPIs | js/sections/home.js, js/sections/kpis.js, css/kpis.css |
| H Glossary | js/data/glossary.js, js/sections/glossary.js, css/glossary.css |

Section ids/orders: home 0, architecture 10, kpis 20, dataflow 30, noise 40, budgets 50, glossary 90.

## Quality bar
* Visual: lots of SVG/canvas animation, glow, flowing particles, live plots; smooth transitions. Respect
  `prefers-reduced-motion` where easy. Must look good at 1280–1920 px wide.
* Robust: wrap your file in an IIFE `(function(){ 'use strict'; ... })();`. No globals besides via CPO.
  Every RAF loop must stop in cleanup. No console errors. Check syntax with `node --check <file>`.
* Use `CPO.tip()` for abbreviations in your HTML where helpful; add any new acronyms you use to the
  glossary via `CPO.addGlossary({...})` in your own file (Agent H owns the main list; duplicates are fine,
  first definition wins).
