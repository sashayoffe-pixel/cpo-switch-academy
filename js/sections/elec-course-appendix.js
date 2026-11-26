/* Appendix chapters for the Electronics & Boards course (read by js/sections/elec-course.js). */
(function () {
  'use strict';
  const C = window.CPO;
  const B = C.badge;

  function svgSymbols() {
    const items = [
      ['R', 'resistor', '<path d="M10 30 l8 -12 l12 24 l12 -24 l12 24 l12 -24 l8 12" fill="none" stroke="#76b900" stroke-width="3"/>'],
      ['C', 'capacitor', '<line x1="10" y1="30" x2="38" y2="30" stroke="#22d3ee" stroke-width="3"/><line x1="38" y1="12" x2="38" y2="48" stroke="#22d3ee" stroke-width="4"/><line x1="48" y1="12" x2="48" y2="48" stroke="#22d3ee" stroke-width="4"/><line x1="48" y1="30" x2="76" y2="30" stroke="#22d3ee" stroke-width="3"/>'],
      ['L', 'inductor', '<path d="M8 30 a8 10 0 0 1 16 0 a8 10 0 0 1 16 0 a8 10 0 0 1 16 0 a8 10 0 0 1 16 0" fill="none" stroke="#ff6b3d" stroke-width="3"/>'],
      ['D', 'diode', '<line x1="8" y1="30" x2="30" y2="30" stroke="#76b900" stroke-width="3"/><path d="M30 14 L30 46 L54 30 Z" fill="#76b900"/><line x1="56" y1="14" x2="56" y2="46" stroke="#76b900" stroke-width="4"/><line x1="56" y1="30" x2="78" y2="30" stroke="#76b900" stroke-width="3"/>'],
      ['Q', 'MOSFET', '<line x1="40" y1="12" x2="40" y2="48" stroke="#a78bfa" stroke-width="3"/><line x1="48" y1="12" x2="48" y2="48" stroke="#a78bfa" stroke-width="3"/><line x1="12" y1="30" x2="40" y2="30" stroke="#a78bfa" stroke-width="3"/><line x1="48" y1="16" x2="74" y2="16" stroke="#a78bfa" stroke-width="3"/><line x1="48" y1="44" x2="74" y2="44" stroke="#a78bfa" stroke-width="3"/>'],
      ['U', 'IC (chip)', '<rect x="16" y="10" width="50" height="40" rx="3" fill="none" stroke="#facc15" stroke-width="3"/><line x1="6" y1="20" x2="16" y2="20" stroke="#facc15" stroke-width="2"/><line x1="6" y1="40" x2="16" y2="40" stroke="#facc15" stroke-width="2"/><line x1="66" y1="20" x2="76" y2="20" stroke="#facc15" stroke-width="2"/><line x1="66" y1="40" x2="76" y2="40" stroke="#facc15" stroke-width="2"/>'],
      ['J', 'connector', '<rect x="20" y="10" width="40" height="40" rx="4" fill="none" stroke="#94a3b8" stroke-width="3"/><circle cx="32" cy="22" r="3" fill="#94a3b8"/><circle cx="48" cy="22" r="3" fill="#94a3b8"/><circle cx="32" cy="38" r="3" fill="#94a3b8"/><circle cx="48" cy="38" r="3" fill="#94a3b8"/>'],
      ['⏚', 'ground', '<line x1="40" y1="8" x2="40" y2="28" stroke="#8a99ad" stroke-width="3"/><line x1="22" y1="28" x2="58" y2="28" stroke="#8a99ad" stroke-width="3"/><line x1="28" y1="36" x2="52" y2="36" stroke="#8a99ad" stroke-width="3"/><line x1="34" y1="44" x2="46" y2="44" stroke="#8a99ad" stroke-width="3"/>']
    ];
    let s = '<svg viewBox="0 0 1000 130" role="img" aria-label="Schematic symbols">';
    items.forEach(([d, n, g], i) => { const x = 10 + i * 124; s += '<g transform="translate(' + (x + 20) + ' 6)">' + g + '</g><text x="' + (x + 60) + '" y="92" text-anchor="middle" fill="#e6edf5" font-size="15" font-weight="700">' + d + '</text><text x="' + (x + 60) + '" y="114" text-anchor="middle" fill="#8a99ad" font-size="12.5">' + n + '</text>'; });
    return s + '</svg>';
  }

  const CH = [];

  CH.push({
    id: 'apx-dict', short: 'Mechanics & optics ↔ electronics', title: 'Dictionary: mechanics & optics ↔ electronics',
    lead: 'Use what you already know. Most electronics concepts have a direct twin in mechanics, thermal or optics, with the same equations and different symbols.',
    html:
      '<h3>1 · Mechanics ↔ electronics</h3>' +
      '<table class="table"><tr><th>Mechanics</th><th>Electronics</th><th>Shared equation / idea</th></tr>' +
      '<tr><td>force F</td><td>voltage V</td><td>the "push"</td></tr>' +
      '<tr><td>velocity v</td><td>current I</td><td>the "flow"</td></tr>' +
      '<tr><td>damper c</td><td>resistor R</td><td>F = c·v ↔ V = R·I; both turn energy into heat</td></tr>' +
      '<tr><td>mass m</td><td>inductor L</td><td>F = m·dv/dt ↔ V = L·dI/dt; stores ½·m·v² ↔ ½·L·I²</td></tr>' +
      '<tr><td>spring k</td><td>capacitor 1/C</td><td>stores ½·k·x² ↔ ½·C·V²</td></tr>' +
      '<tr><td>natural frequency √(k/m)</td><td>1/√(L·C)</td><td>resonance in PDNs, filters, ringing</td></tr>' +
      '<tr><td>damping ratio / Q</td><td>Q of an RLC circuit</td><td>sharp vs damped response</td></tr>' +
      '<tr><td>transmissibility, modes</td><td>PDN impedance peaks, resonances</td><td>find them, damp them</td></tr>' +
      '<tr><td>stiffness of a structure</td><td>low impedance of a power network</td><td>"stiff" supply = voltage hardly moves under load</td></tr></table>' +
      '<h3>2 · Thermal ↔ electronics</h3>' +
      '<table class="table"><tr><th>Thermal</th><th>Electronics</th></tr>' +
      '<tr><td>temperature difference ΔT</td><td>voltage V</td></tr><tr><td>heat flow P (W)</td><td>current I</td></tr>' +
      '<tr><td>thermal resistance θ (°C/W)</td><td>resistance R (Ω): ΔT = P·θ ↔ V = I·R</td></tr>' +
      '<tr><td>heat capacity</td><td>capacitance: thermal time constant τ = R_th·C_th ↔ R·C</td></tr></table>' +
      '<h3>3 · Optics ↔ electronics</h3>' +
      '<table class="table"><tr><th>Optics</th><th>Electronics (high speed)</th></tr>' +
      '<tr><td>refractive index n</td><td>characteristic impedance Z₀ (and Dk sets speed: v = c/√Dk)</td></tr>' +
      '<tr><td>Fresnel reflection ((n₂−n₁)/(n₂+n₁))</td><td>reflection coefficient Γ = (Z₂−Z₁)/(Z₂+Z₁)</td></tr>' +
      '<tr><td>anti-reflection coating</td><td>impedance matching, termination resistors</td></tr>' +
      '<tr><td>waveguide / fiber</td><td>transmission line / differential pair</td></tr>' +
      '<tr><td>absorption loss (dB/km)</td><td>dielectric + conductor loss (dB/inch, grows with frequency)</td></tr>' +
      '<tr><td>insertion loss, return loss, back-reflection</td><td>S21 insertion loss, S11 return loss</td></tr>' +
      '<tr><td>modal / chromatic dispersion</td><td>frequency-dependent loss and delay → ISI</td></tr>' +
      '<tr><td>ring resonator Q, FSR</td><td>LC resonator Q, resonance spacing</td></tr>' +
      '<tr><td>balanced detection</td><td>differential signalling (common-mode rejection)</td></tr></table>' +
      '<div class="callout">Careful with dB: optical power uses <b>10·log₁₀</b>; electrical <b>voltage</b> uses <b>20·log₁₀</b>. "−3 dB" is half the optical power but 71 % of the voltage. A photodiode turns optical power into current, so 1 dB of optical loss becomes 2 dB of electrical signal loss.</div>'
  });

  CH.push({
    id: 'apx-schem', short: 'Reading schematics & datasheets', title: 'Reading schematics, block diagrams and datasheets',
    lead: 'Enough to follow a review: the symbols, the reference designators, the diagrams engineers draw, and where to look in a datasheet.',
    html:
      '<h3>1 · Symbols and reference designators</h3><div class="af-fig">' + svgSymbols() + '</div>' +
      '<p>Every part on a board has a <b>reference designator</b>: R12 is resistor number 12, C305 a capacitor, U1 a chip, Q4 a transistor, J2 a connector, L7 an inductor, D3 a diode, TP9 a test point. Reviews and failure reports always use these names.</p>' +
      '<h3>2 · The diagrams you will see</h3>' +
      '<table class="table"><tr><td><b>Block diagram</b></td><td>boxes and arrows: major chips and the interfaces between them. Your home ground as system engineer.</td></tr>' +
      '<tr><td><b>Power tree</b></td><td>from the input (54 V) through every converter to every rail, with voltages, currents and efficiencies. The basis of the power budget.</td></tr>' +
      '<tr><td><b>Sequencing diagram</b></td><td>the order and timing in which rails, resets and enables come up and go down.</td></tr>' +
      '<tr><td><b>Clock tree</b></td><td>where each reference clock comes from and goes to, with frequencies and jitter.</td></tr>' +
      '<tr><td><b>Management bus map</b></td><td>I2C/PMBus/SPI segments, muxes and the address of every device.</td></tr>' +
      '<tr><td><b>Schematic</b></td><td>the detailed circuit, many pages, page per function. Read the block diagram first.</td></tr>' +
      '<tr><td><b>Stackup drawing</b></td><td>layer order, thicknesses, materials, impedance targets.</td></tr></table>' +
      '<h3>3 · How to read a datasheet quickly</h3>' +
      '<ol><li><b>Front page:</b> what it is, key features, and the headline numbers (often best case).</li>' +
      '<li><b>Absolute maximum ratings:</b> limits that destroy the part, not operating conditions.</li>' +
      '<li><b>Recommended operating conditions:</b> where the specs below actually apply (temperature, voltage).</li>' +
      '<li><b>Electrical characteristics table:</b> min / typ / max. Design to <b>min/max</b>, not typ.</li>' +
      '<li><b>Graphs:</b> how parameters move with temperature, voltage and frequency.</li>' +
      '<li><b>Application section and layout guidelines:</b> what the vendor recommends around the part.</li></ol>' +
      '<div class="callout warn">The most common review mistake: using a "typical" value as if it were guaranteed. Budgets use worst-case or statistical limits.</div>'
  });

  CH.push({
    id: 'apx-mfg', short: 'Board materials & manufacturing', title: 'Board materials and manufacturing',
    lead: 'What boards are made of, how they are built and assembled, and where defects come from.',
    html:
      '<h3>1 · Materials</h3>' +
      '<table class="table"><tr><th>Property</th><th>What it means</th><th>Why you care</th></tr>' +
      '<tr><td><b>Dk</b> (dielectric constant)</td><td>how much the material slows signals (≈ 3–4.5) ' + B('typ') + '</td><td>sets impedance and delay</td></tr>' +
      '<tr><td><b>Df</b> (loss tangent)</td><td>how much signal energy the material absorbs</td><td>low-loss laminates for 100+ GHz signals</td></tr>' +
      '<tr><td><b>Tg</b></td><td>glass-transition temperature of the resin</td><td>above Tg, expansion jumps: warpage, via stress</td></tr>' +
      '<tr><td><b>CTE</b> (x/y and z)</td><td>expansion per °C</td><td>solder-joint and via reliability</td></tr>' +
      '<tr><td><b>Copper roughness</b></td><td>surface texture of the foil</td><td>rough copper adds loss at high frequency</td></tr>' +
      '<tr><td><b>Glass weave</b></td><td>the fiberglass cloth pattern</td><td>can cause skew between the two wires of a pair</td></tr></table>' +
      '<h3>2 · Fabrication (bare board)</h3>' +
      '<ol><li>Image and etch copper on each inner layer.</li><li>Laminate the layers under heat and pressure.</li><li>Drill (mechanical; laser for microvias), plate the holes with copper.</li><li>Image and etch the outer layers; add solder mask and surface finish.</li><li>Backdrill stubs where needed; electrical test every net; measure impedance coupons.</li></ol>' +
      '<h3>3 · Assembly</h3>' +
      '<ol><li>Print solder paste through a stencil.</li><li>Place components (thousands, by machine).</li><li>Reflow: melt the solder in a controlled temperature profile. This is where warpage bites.</li><li>Inspect: optical (AOI) and <b>X-ray</b> for hidden BGA joints.</li><li>Test: in-circuit / boundary scan (JTAG), then functional test.</li></ol>' +
      '<h3>4 · Typical defects and where they show up</h3>' +
      '<table class="table"><tr><th>Defect</th><th>Cause</th><th>Symptom later</th></tr>' +
      '<tr><td>BGA head-in-pillow / open</td><td>warpage during reflow</td><td>intermittent faults, often temperature-dependent</td></tr>' +
      '<tr><td>Cracked solder joint</td><td>thermal-cycling fatigue, shock</td><td>link flaps or resets that come and go</td></tr>' +
      '<tr><td>Via barrel crack</td><td>z-axis expansion above Tg</td><td>open circuits at temperature</td></tr>' +
      '<tr><td>Impedance out of tolerance</td><td>etch / laminate variation</td><td>reduced SI margin on some boards</td></tr>' +
      '<tr><td>Contamination / residues</td><td>flux, handling</td><td>leakage, corrosion over time</td></tr></table>'
  });

  CH.push({
    id: 'apx-lab', short: 'Lab instruments & formulas', title: 'Lab instruments and a formula sheet',
    lead: 'What each instrument in a bring-up lab measures, and the formulas you will use most.',
    html:
      '<h3>1 · Instruments</h3>' +
      '<table class="table"><tr><th>Instrument</th><th>Measures</th><th>Used for</th></tr>' +
      '<tr><td><b>Multimeter (DMM)</b></td><td>DC voltage, current, resistance</td><td>rail voltages, shorts, continuity</td></tr>' +
      '<tr><td><b>Oscilloscope</b> (+ probes)</td><td>voltage vs time</td><td>power-up sequencing, ripple, resets, slow buses</td></tr>' +
      '<tr><td><b>Sampling / high-bandwidth scope</b></td><td>very fast waveforms, eye diagrams</td><td>SerDes and optical eyes (with an optical plug-in), TDECQ</td></tr>' +
      '<tr><td><b>Logic / protocol analyzer</b></td><td>digital buses decoded</td><td>I2C/SPI/MDIO debugging</td></tr>' +
      '<tr><td><b>Power analyzer / electronic load</b></td><td>power, efficiency, load steps</td><td>VRM validation, PDN load-step tests</td></tr>' +
      '<tr><td><b>Spectrum analyzer</b></td><td>signal vs frequency</td><td>EMI pre-scans, spurs, switching noise</td></tr>' +
      '<tr><td><b>VNA</b></td><td>S-parameters (insertion / return loss vs frequency)</td><td>channels, connectors, cables</td></tr>' +
      '<tr><td><b>TDR</b></td><td>impedance along a path</td><td>locating discontinuities</td></tr>' +
      '<tr><td><b>BERT</b></td><td>bit-error ratio with test patterns</td><td>link margin, jitter tolerance</td></tr>' +
      '<tr><td><b>Optical power meter / OSA</b></td><td>optical power / spectrum</td><td>laser output, wavelengths, link loss</td></tr>' +
      '<tr><td><b>Thermal camera</b></td><td>surface temperature map</td><td>hot spots at power-on</td></tr></table>' +
      '<div class="callout">Probe with care: a long ground lead on a scope probe adds inductance and creates fake ringing. Ripple measurements need a short ground spring and the right bandwidth limit.</div>' +
      '<h3>2 · Formula sheet</h3>' +
      '<div class="eq">V = I·R          P = V·I = I²·R = V²/R\nτ = R·C           f_res = 1 / (2π·√(L·C))\nE_C = ½·C·V²      E_L = ½·L·I²\nbuck: D = Vout/Vin        ΔI_L = (Vin − Vout)·D / (L·f_sw)\nZ_target = ΔV_allowed / ΔI_step\nΓ = (Z₂ − Z₁)/(Z₂ + Z₁)     return loss = −20·log₁₀|Γ|\ndB (voltage) = 20·log₁₀(V₂/V₁)   dB (power) = 10·log₁₀(P₂/P₁)\nsignal speed in board ≈ c/√Dk  (≈ 6–7 ps/mm for Dk ≈ 3.5–4)\nNyquist f = baud / 2   (106 GBd → ~53 GHz)\nswitching energy per transition ≈ ½·C·V²     P_dyn = α·C·V²·f\nthermal: ΔT = P·θ</div>'
  });

  C.elecAppendix = CH;
})();
