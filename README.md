# CPO Switch Academy

Interactive, browser-based training on NVIDIA-style **co-packaged optics (CPO) switches**: architecture
(power, data, control, optics, thermal, sensing, feedback loops, interfaces), a plain-language
guided **AI factory course** (building → network topology → rack → GPU → transistor, tied to the CPO switches,
plus an appendix on AI factories, topologies and GPUs), a guided **CPO switch course** for new system
engineers (network → box → package → ASIC → optical engine → laser → ring modulator → receiver, link/power budgets,
control loops, the SE job, and an appendix), and **case studies & Pareto**: six debug cases that open the
simulators with the fault injected, plus a plan to improve energy/bit, link interruptions and link margin by 20 %, and a **networking & protocols**
course (Ethernet, IP, TCP/UDP, RDMA/RoCE, InfiniBand, lossless Ethernet, NVLink, PCIe, I2C/SPI/UART/JTAG/MDIO/PMBus,
CMIS, out-of-band management, standards map), and an **electronics & board design** course for engineers from a
mechanics/optics background (power delivery, PDN, signal integrity, PCB, thermal/mechanics, EMC, design reviews), KPIs, a real-time data-flow
simulator, a noise & signal-integrity lab, system budgets (link, BER/FEC, power, thermal, accuracy, jitter)
and a 650+ term glossary.

**Live:** https://sashayoffe-pixel.github.io/cpo-switch-academy/

* Pure HTML/CSS/JS, no build step, no dependencies. Open `index.html` via any static server
  (e.g. `python -m http.server`) or use the live site.
* Built only from public information. Numbers are badged **NVIDIA public** (announced figures),
  **typical** (industry-typical) or **estimate** (model assumptions). Not an official NVIDIA resource.
* `CONTRACT.md` documents the internal API and the architecture-node schema for contributors.

## Offline use (flights, no internet)

* **Laptop:** download the repo (Code → Download ZIP), unzip, and double-click `index.html`. Everything is local; no
  internet is needed.
* **Tablet / phone:** open the live site once while online, then use **Add to Home Screen** (iPad/iPhone: Safari →
  Share → Add to Home Screen; Android: Chrome → ⋮ → Install app / Add to Home screen). Open it from the new icon,
  click through a few sections, and it is cached for offline use. After an update, open it once online to refresh.
