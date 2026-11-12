# CPO Switch Academy

Interactive, browser-based training on NVIDIA-style **co-packaged optics (CPO) switches**: architecture
(power, data, control, optics, thermal, sensing, feedback loops, interfaces), a plain-language
guided **AI factory course** (building → network topology → rack → GPU → transistor, tied to the CPO switches,
plus an appendix on AI factories, topologies and GPUs), a guided **CPO switch course** for new system
engineers (network → box → package → ASIC → optical engine → laser → ring modulator → receiver, link/power budgets,
control loops, the SE job, and an appendix), KPIs, a real-time data-flow
simulator, a noise & signal-integrity lab, system budgets (link, BER/FEC, power, thermal, accuracy, jitter)
and a 650+ term glossary.

**Live:** https://sashayoffe-pixel.github.io/cpo-switch-academy/

* Pure HTML/CSS/JS, no build step, no dependencies. Open `index.html` via any static server
  (e.g. `python -m http.server`) or use the live site.
* Built only from public information. Numbers are badged **NVIDIA public** (announced figures),
  **typical** (industry-typical) or **estimate** (model assumptions). Not an official NVIDIA resource.
* `CONTRACT.md` documents the internal API and the architecture-node schema for contributors.
