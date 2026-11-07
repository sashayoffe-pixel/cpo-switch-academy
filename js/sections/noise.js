/* Noise & Signal Integrity Lab — Agent E. Section id 'noise'. See CONTRACT.md */
(function () {
  'use strict';
  const C = window.CPO;
  if (!C) return;

  // ---------------------------------------------------------------- constants
  const QE = 1.602176634e-19, KB = 1.380649e-23, CL = 2.99792458e8, TK = 358; // 85 C junction
  const RESP = 0.9, SPS = 16, KP4 = 2.4e-4, LAM0 = 1310, S0 = 0.092, F_RO = 7e9;
  const NP = 41; // sampling phases for bathtub

  // erfc: Chebyshev fit (Numerical Recipes erfcc), fractional error < 1.2e-7 everywhere
  function erfc(x) {
    const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
      t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }
  const Qf = x => 0.5 * erfc(x / Math.SQRT2);
  function Qinv(p) { let lo = 0, hi = 40; for (let i = 0; i < 90; i++) { const m = (lo + hi) / 2; if (Qf(m) > p) lo = m; else hi = m; } return (lo + hi) / 2; }
  const QT4 = Qinv(KP4 / 0.75), QT2 = Qinv(KP4);
  const db10 = x => 10 * Math.log10(x);

  C.addGlossary({
    RIN: { full: 'Relative Intensity Noise', def: 'Laser power fluctuation spectral density normalised to mean power squared, in dB/Hz.', cat: 'optics' },
    MPI: { full: 'Multi-Path Interference', def: 'Beat noise between the signal and doubly-reflected delayed copies of itself.', cat: 'optics' },
    PDL: { full: 'Polarization-Dependent Loss', def: 'Difference in insertion loss between best and worst input polarization states.', cat: 'optics' },
    TIA: { full: 'Trans-Impedance Amplifier', def: 'Converts photodiode current to voltage; its input-referred noise usually sets receiver sensitivity.', cat: 'electrical' },
    ISI: { full: 'Inter-Symbol Interference', def: 'Energy from neighbouring symbols leaking into the current one due to limited bandwidth.', cat: 'electrical' },
    RJ: { full: 'Random Jitter', def: 'Unbounded Gaussian timing noise, specified as rms.', cat: 'electrical' },
    DJ: { full: 'Deterministic Jitter', def: 'Bounded timing error: periodic jitter, DCD, data-dependent jitter.', cat: 'electrical' },
    PJ: { full: 'Periodic Jitter', def: 'Sinusoidal timing modulation, e.g. from supply or clock spurs.', cat: 'electrical' },
    DCD: { full: 'Duty-Cycle Distortion', def: 'Rising and falling (or even/odd UI) edges displaced from each other.', cat: 'electrical' },
    NEXT: { full: 'Near-End Crosstalk', def: 'Coupling from an aggressor into a victim measured at the same end as the aggressor transmitter.', cat: 'electrical' },
    FEXT: { full: 'Far-End Crosstalk', def: 'Coupling from an aggressor into a victim measured at the far end.', cat: 'electrical' },
    PSD: { full: 'Power Spectral Density', def: 'Noise power per unit bandwidth versus frequency.', cat: 'general' },
    BER: { full: 'Bit Error Ratio', def: 'Fraction of bits received in error.', cat: 'general' },
    SNR: { full: 'Signal-to-Noise Ratio', def: 'Signal power divided by noise power.', cat: 'general' },
    TDECQ: { full: 'Transmitter and Dispersion Eye Closure Quaternary', def: 'IEEE PAM4 transmitter quality metric: dB of extra noise margin consumed relative to an ideal eye at the reference BER.', cat: 'test' },
    OMA: { full: 'Optical Modulation Amplitude', def: 'Difference between high and low optical power levels (outer levels for PAM4).', cat: 'optics' },
    ER: { full: 'Extinction Ratio', def: 'Ratio of high to low optical power levels.', cat: 'optics' },
    ENOB: { full: 'Effective Number Of Bits', def: 'ADC resolution after accounting for its noise and distortion.', cat: 'electrical' },
    FFE: { full: 'Feed-Forward Equalizer', def: 'FIR filter on received samples that cancels ISI, at the cost of noise enhancement.', cat: 'electrical' },
    CTLE: { full: 'Continuous-Time Linear Equalizer', def: 'Analog high-frequency peaking filter compensating channel loss.', cat: 'electrical' },
    DFE: { full: 'Decision-Feedback Equalizer', def: 'Subtracts post-cursor ISI using past decisions; no noise enhancement.', cat: 'electrical' },
    PLL: { full: 'Phase-Locked Loop', def: 'Generates a low-jitter clock locked to a reference.', cat: 'electrical' },
    CDR: { full: 'Clock and Data Recovery', def: 'Extracts the sampling clock from data; tracks low-frequency jitter.', cat: 'electrical' },
    VRM: { full: 'Voltage Regulator Module', def: 'Point-of-load DC-DC converter; its switching ripple is a noise source.', cat: 'power' },
    PSRR: { full: 'Power-Supply Rejection Ratio', def: 'How strongly a circuit attenuates supply noise at its output.', cat: 'power' },
    RLM: { full: 'Ratio of Level Mismatch', def: 'PAM4 linearity metric: smallest level spacing relative to the ideal third of the outer swing.', cat: 'test' },
    ZF: { full: 'Zero-Forcing', def: 'Equalizer criterion that forces ISI cursors to zero regardless of noise.', cat: 'electrical' },
    MPN: { full: 'Mode-Partition Noise', def: 'Power fluctuation between longitudinal modes of a multimode laser converted to noise by dispersion.', cat: 'optics' },
    CD: { full: 'Chromatic Dispersion', def: 'Wavelength-dependent group delay in fiber; near zero around 1310 nm in standard SMF.', cat: 'optics' },
    KP4: { full: 'KP4 FEC, RS(544,514)', def: 'Reed-Solomon FEC used for 100G/200G PAM4 lanes; pre-FEC BER threshold about 2.4e-4.', cat: 'network' },
    UI: { full: 'Unit Interval', def: 'One symbol period (9.4 ps at 106.25 GBd).', cat: 'general' },
    EH: { full: 'Eye Height', def: 'Vertical eye opening at a given BER.', cat: 'test' },
    EW: { full: 'Eye Width', def: 'Horizontal eye opening at a given BER.', cat: 'test' },
    DFB: { full: 'Distributed-Feedback laser', def: 'Single-longitudinal-mode semiconductor laser.', cat: 'optics' },
    ELS: { full: 'External Laser Source', def: 'Front-panel laser module feeding CW light to co-packaged optical engines.', cat: 'optics' },
    PAM4: { full: '4-level Pulse Amplitude Modulation', def: 'Two bits per symbol on four amplitude levels: three stacked eyes.', cat: 'electrical' },
    NRZ: { full: 'Non-Return-to-Zero', def: 'Two-level (PAM2) signalling.', cat: 'electrical' },
    MRM: { full: 'Micro-Ring Modulator', def: 'Resonant silicon ring whose resonance is shifted by a PN junction to modulate light.', cat: 'optics' },
    WDM: { full: 'Wavelength-Division Multiplexing', def: 'Several wavelengths sharing one fiber.', cat: 'optics' },
    ADC: { full: 'Analog-to-Digital Converter', def: 'Samples the received waveform for DSP equalization.', cat: 'electrical' },
    DSP: { full: 'Digital Signal Processor', def: 'Digital equalization, timing recovery and detection after the ADC.', cat: 'electrical' },
    LPO: { full: 'Linear Pluggable Optics', def: 'Optics without retiming DSP; host SerDes equalizes the whole link.', cat: 'optics' },
    PMF: { full: 'Polarization-Maintaining Fiber', def: 'Fiber that preserves linear polarization; used for laser feed into TE-only photonics.', cat: 'optics' },
    SOP: { full: 'State Of Polarization', def: 'Polarization state of light, drifts randomly in standard fiber.', cat: 'optics' },
    APC: { full: 'Angled Physical Contact / Automatic Power Control', def: 'Angled (8 degree) connector polish that suppresses back-reflection; also laser power-control loop.', cat: 'optics' },
    FSR: { full: 'Free Spectral Range', def: 'Wavelength spacing between adjacent ring resonances.', cat: 'optics' }
  });

  // ---------------------------------------------------------------- parameters
  const GROUPS = [
    ['link', 'Link & optical power', '--accent'], ['laser', 'Laser (ELS)', '--optic'], ['rx', 'PD + TIA receiver', '--data'],
    ['ring', 'Micro-ring modulator', '--therm'], ['bw', 'Bandwidth, ISI & DSP', '--accent'], ['jit', 'Jitter / clocking', '--ctrl'],
    ['xt', 'Crosstalk', '--optic'], ['refl', 'Reflections & polarization', '--optic'], ['psu', 'Power supply', '--power'],
    ['fiber', 'Fiber / dispersion', '--optic']
  ];
  const P = [
    { k: 'prx', g: 'link', l: 'Avg received power', min: -16, max: 4, st: 0.1, d: -5, u: 'dBm' },
    { k: 'er', g: 'link', l: 'Extinction ratio (ER)', min: 2, max: 9, st: 0.1, d: 5, u: 'dB' },
    { k: 'rin', g: 'laser', l: 'Laser RIN', min: -165, max: -120, st: 1, d: -145, u: 'dB/Hz' },
    { k: 'lw', g: 'laser', l: 'Linewidth Δν', min: 0.05, max: 50, log: 1, d: 1, u: 'MHz' },
    { k: 'rf', g: 'rx', l: 'TIA feedback R_f', min: 100, max: 20000, log: 1, d: 600, u: 'Ω' },
    { k: 'en', g: 'rx', l: 'TIA input e_n', min: 0.1, max: 4, st: 0.05, d: 1.2, u: 'nV/√Hz' },
    { k: 'ct', g: 'rx', l: 'Input capacitance C_T', min: 20, max: 250, st: 5, d: 80, u: 'fF' },
    { k: 'id', g: 'rx', l: 'PD dark current', min: 0.1, max: 1000, log: 1, d: 10, u: 'nA' },
    { k: 'q', g: 'ring', l: 'Ring loaded Q', min: 2000, max: 25000, st: 100, d: 5000, u: '' },
    { k: 'dT', g: 'ring', l: 'Lock residual ΔT', min: -2, max: 2, st: 0.01, d: 0.2, u: 'K' },
    { k: 'dldT', g: 'ring', l: 'Resonance shift dλ/dT', min: 0.07, max: 0.1, st: 0.005, d: 0.08, u: 'nm/K' },
    { k: 'heat', g: 'ring', l: 'Heater / thermal noise σ_T', min: 0, max: 100, st: 1, d: 10, u: 'mK' },
    { k: 'nl', g: 'ring', l: 'MRM nonlinearity', min: 0, max: 100, st: 1, d: 15, u: '%' },
    { k: 'fe', g: 'bw', l: 'Electrical BW (drv+TIA)', min: 20, max: 100, st: 1, d: 50, u: 'GHz' },
    { k: 'enob', g: 'bw', l: 'ADC ENOB', min: 3, max: 10, st: 0.1, d: 6, u: 'bit' },
    { k: 'rj', g: 'jit', l: 'Random jitter RJ', min: 0, max: 40, st: 0.5, d: 10, u: 'mUI rms' },
    { k: 'pj', g: 'jit', l: 'Periodic jitter PJ', min: 0, max: 150, st: 1, d: 10, u: 'mUI pk' },
    { k: 'dcd', g: 'jit', l: 'Duty-cycle distortion DCD', min: 0, max: 100, st: 1, d: 5, u: 'mUI' },
    { k: 'xw', g: 'xt', l: 'WDM ring crosstalk (2 aggr.)', min: -50, max: -10, st: 0.5, d: -28, u: 'dB' },
    { k: 'xe', g: 'xt', l: 'Electrical NEXT/FEXT', min: -60, max: -20, st: 0.5, d: -40, u: 'dB' },
    { k: 'xth', g: 'xt', l: 'Thermal crosstalk offset', min: 0, max: 1.5, st: 0.01, d: 0.05, u: 'K' },
    { k: 'mpi', g: 'refl', l: 'MPI ratio', min: -70, max: -20, st: 0.5, d: -45, u: 'dB' },
    { k: 'pdl', g: 'refl', l: 'PDL', min: 0, max: 3, st: 0.05, d: 0.3, u: 'dB' },
    { k: 'vrm', g: 'psu', l: 'VRM ripple at load', min: 0, max: 60, st: 0.5, d: 5, u: 'mVpp' },
    { k: 'len', g: 'fiber', l: 'Fiber length', min: 0, max: 10000, st: 10, d: 100, u: 'm' },
    { k: 'lam', g: 'fiber', l: 'Wavelength λ', min: 1265, max: 1345, st: 1, d: 1311, u: 'nm' }
  ];
  const SP = [
    { k: 'pnIn', l: 'PLL in-band phase noise', min: -120, max: -80, st: 1, d: -100, u: 'dBc/Hz' },
    { k: 'pnBw', l: 'PLL loop bandwidth', min: 1, max: 50, st: 0.5, d: 10, u: 'MHz' },
    { k: 'pnFl', l: 'Phase-noise floor', min: -160, max: -130, st: 1, d: -150, u: 'dBc/Hz' },
    { k: 'fsw', l: 'VRM switching frequency', min: 0.2, max: 5, st: 0.1, d: 1, u: 'MHz' }
  ];
  const DEF = { fmt: 'pam4', baud: 106.25, ffe: true };
  P.concat(SP).forEach(p => { DEF[p.k] = p.d; });

  const CLEAN = { prx: 0, rin: -165, lw: 0.1, rf: 2000, en: 0.4, ct: 40, id: 1, q: 5000, dT: 0, heat: 0, nl: 0, fe: 90, ffe: true,
    rj: 2, pj: 0, dcd: 0, xw: -50, xe: -60, xth: 0, mpi: -70, pdl: 0, vrm: 0, enob: 10, len: 10, lam: 1310, er: 5 };
  const PRESETS = {
    clean: CLEAN,
    typical: Object.assign({}, DEF),
    stressed: { prx: -8, er: 4.5, rin: -136, lw: 5, rf: 400, en: 1.6, ct: 120, id: 50, q: 9000, dT: 0.6, heat: 30, nl: 40, fe: 38, ffe: true, enob: 5, rj: 16, pj: 40, dcd: 20, xw: -22, xe: -32, xth: 0.2, mpi: -35, pdl: 1, vrm: 20, len: 500, lam: 1295 },
    worst: { prx: -10, er: 4, rin: -130, lw: 15, rf: 300, en: 2.2, ct: 180, id: 200, q: 14000, dT: 1.0, heat: 60, nl: 65, fe: 30, ffe: true, enob: 4.5, rj: 22, pj: 70, dcd: 35, xw: -18, xe: -27, xth: 0.5, mpi: -30, pdl: 2, vrm: 40, len: 2000, lam: 1280 }
  };

  // budget variance sources
  const SRC = [
    ['thermal', 'TIA thermal 4kT/R_f', '--data', 0], ['amp', 'TIA amplifier e_n·ωC_T', '--data', 0.45],
    ['shot', 'Shot noise 2qIB', '--sense', 0], ['dark', 'Dark current', '--sense', 0.55],
    ['rin', 'Laser RIN', '--optic', 0], ['fmam', 'Phase noise → FM-AM', '--optic', 0.45],
    ['mpi', 'MPI / reflections', '--optic', -0.35], ['pdl', 'PDL / polarization', '--optic', 0.75],
    ['xwdm', 'WDM ring crosstalk', '--optic', -0.6], ['heat', 'Ring thermal wander', '--therm', -0.2],
    ['vrm', 'VRM ripple coupling', '--power', 0], ['xel', 'Electrical NEXT/FEXT', '--data', -0.45],
    ['isi', 'Residual ISI', '--accent', 0], ['jit', 'Jitter → amplitude', '--ctrl', 0], ['quant', 'ADC quantization', '--mech', 0]
  ];
  const RXSRC = { thermal: 1, amp: 1, shot: 1, dark: 1, quant: 1 };

  // ---------------------------------------------------------------- noise source cards
  const STAGES = [
    { id: 'laser', l: 'ELS laser', x: 10, y: 50, w: 92, d: 'optics' },
    { id: 'fib1', l: 'PM fiber feed', x: 118, y: 50, w: 92, d: 'optics' },
    { id: 'mrm', l: 'MRM (TX ring)', x: 226, y: 50, w: 104, d: 'optics' },
    { id: 'drv', l: 'Driver (EIC)', x: 226, y: 140, w: 104, d: 'data' },
    { id: 'fib2', l: 'Fiber + connectors', x: 346, y: 50, w: 124, d: 'optics' },
    { id: 'demux', l: 'RX ring demux', x: 486, y: 50, w: 108, d: 'optics' },
    { id: 'pd', l: 'Ge PD', x: 610, y: 50, w: 66, d: 'sensing' },
    { id: 'tia', l: 'TIA', x: 692, y: 50, w: 66, d: 'data' },
    { id: 'adc', l: 'ADC + FFE', x: 774, y: 50, w: 96, d: 'data' },
    { id: 'cdr', l: 'CDR / PLL', x: 774, y: 140, w: 96, d: 'control' },
    { id: 'vrm', l: 'VRM / rails', x: 10, y: 140, w: 92, d: 'power' }
  ];
  const SOURCES = [
    { id: 'rin', n: 'Laser RIN', dom: 'optics', st: ['laser'], demo: { rin: -138 },
      o: 'Spontaneous emission and carrier/photon-number fluctuations in the CW DFB inside the external laser source make the optical power fluctuate. The spectrum peaks near the relaxation-oscillation frequency (several GHz) and rises sharply with optical feedback from reflections.',
      eq: 'RIN = <δP²> / P̄²   [1/Hz, quoted in dB/Hz]\nσ²_RIN,k = RIN · (R·P_k)² · B_n\n→ σ ∝ P : Q saturates at  Q_max ≈ ΔI / (2·I·√(RIN·B_n))',
      m: 'High-power CW DFB for ELS ≈ −150…−140 dB/Hz; 200G/λ optical specs allow ≈ −136 dB/Hz (RIN OMA)',
      e: 'Level-dependent: upper PAM4 levels thicker. More power does not help — it creates a BER floor in the waterfall.',
      x: 'Low-RIN high-power DFB, optical isolator in the ELS, laser APC loop, suppress reflections. Splitting one ELS to many lanes copies the same RIN to all of them (correlated).' },
    { id: 'phase', n: 'Laser phase noise / linewidth', dom: 'optics', st: ['laser', 'mrm', 'demux'], demo: { lw: 1.5, q: 12000 },
      o: 'Spontaneous emission randomly kicks the optical phase → Lorentzian linewidth Δν (white frequency noise) plus 1/f frequency noise. A photodiode is phase-blind, but a ring is a frequency discriminator: sitting on its steep slope, frequency jitter becomes intensity jitter (FM→AM). Linewidth also sets how fast MPI beat noise fluctuates.',
      eq: 'S_ν(f) = Δν/π  [Hz²/Hz]      δν_ring = ν/Q\nRIN_FM ≈ [ (1/T)·dT/dν ]² · S_ν = [ (2D/δν)·s(x)/T(x) ]² · Δν/π\nτ_p = Qλ/(2πc)  — higher Q ⇒ steeper slope ⇒ worse',
      m: 'DFB Δν ≈ 0.1–2 MHz; ring δν ≈ 10–100 GHz (Q 3k–20k) → RIN_FM ≈ −160…−135 dB/Hz',
      e: 'Behaves like extra RIN (level-dependent), grows ∝ Q² and ∝ Δν. Invisible for a non-resonant (MZM) modulator.',
      x: 'Narrow-linewidth DFB, moderate Q, choose bias side with lower slope, avoid optical feedback (broadens linewidth, causes mode hops).' },
    { id: 'shot', n: 'Shot noise', dom: 'sensing', st: ['pd'], demo: { prx: -15, rf: 20000, en: 0.1, ct: 20 },
      o: 'Photo-generated carriers arrive as a Poisson process of discrete charges q — the quantum limit of direct detection.',
      eq: 'σ²_shot = 2q·(I_ph + I_d)·B_n\ni_n = √(2qI) ≈ 0.57 pA/√Hz · √(I / 1 µA)',
      m: 'At I = 300 µA: ≈ 9.8 pA/√Hz → σ ≈ 2.5 µA in 64 GHz',
      e: 'Level-dependent ∝ √I: top level slightly fuzzier. Rarely dominant in thermal-limited CPO receivers.',
      x: 'Fundamental. Higher responsivity / lower coupling loss improves SNR ∝ √P in the shot-limited regime.' },
    { id: 'thermal', n: 'TIA thermal (Johnson) noise', dom: 'data', st: ['tia'], demo: { rf: 150, prx: -8 },
      o: 'Thermal agitation of carriers in the TIA feedback resistor R_f (and bias resistors) produces white current noise at the TIA input.',
      eq: 'i²_n,R = 4kT / R_f   [A²/Hz]\nσ² = 4kT·B_n / R_f        (358 K, 600 Ω → 5.7 pA/√Hz)\nf_3dB ≈ A / (2π·R_f·C_T)  ⇒ R_f limited by bandwidth',
      m: 'Total TIA input-referred noise ≈ 15–30 pA/√Hz at 50–60 GHz bandwidth',
      e: 'Signal-independent: all levels equally thick. Dominates at low power and sets the sensitivity (steep waterfall).',
      x: 'Larger R_f (needs lower C_T for the same bandwidth), 3D-stacked PD–TIA with tiny C_T — a key CPO advantage — and a cooler TIA.' },
    { id: 'amp', n: 'TIA amplifier noise (e_n · ωC_T, 1/f)', dom: 'data', st: ['tia'], demo: { en: 2.5, ct: 180, prx: -8 },
      o: 'Input-device channel/shot noise appears as voltage noise e_n. Across the total input capacitance (PD + pad + ESD + device) it becomes a current noise rising with f², plus 1/f flicker at low frequency.',
      eq: 'i²_amp(f) = i_a²·(1 + f_c/f) + (2π f · C_T · e_n)²\n∫₀ᴮ (2πf C_T e_n)² df = (2π C_T e_n)² · B³/3',
      m: 'e_n ≈ 0.7–2 nV/√Hz, C_T ≈ 50–150 fF',
      e: 'Signal-independent but blue (high-frequency) → strongly amplified by FFE peaking.',
      x: 'Minimise C_T (hybrid bonding / µbumps, small Ge PD, no ESD on the optical input); optimise input device for e_n. This is why short PD–TIA interconnect matters.' },
    { id: 'dark', n: 'PD dark-current noise', dom: 'sensing', st: ['pd'], demo: { id: 1000, prx: -14 },
      o: 'Thermally generated carriers in the Ge photodiode (defects at the Ge/Si interface, SRH generation). Roughly doubles every ~10 K.',
      eq: 'σ²_dark = 2q · I_d · B_n       (I_d = 10 nA → 0.057 pA/√Hz)',
      m: '1–100 nA at −1…−2 V, 85 °C; ~100× below thermal noise',
      e: 'Invisible on the data eye even at 1 µA. Matters as an offset for monitor PDs used by ring-lock loops, and as a reliability indicator.',
      x: 'Ge material quality, small area, lower bias, temperature control.' },
    { id: 'ring', n: 'Ring thermal drift, heater noise & detuning', dom: 'thermal', st: ['mrm', 'demux'], demo: { dT: 1.2, heat: 60, q: 10000 },
      o: 'Si thermo-optic dn/dT ≈ 1.8e-4 /K shifts the resonance 0.07–0.1 nm/K. The lock loop (heater + monitor PD) holds the bias point, but residual error, heater DAC/driver noise and traffic-dependent self-heating remain. Off the optimum the modulation slope (OMA) drops; fluctuations become multiplicative noise.',
      eq: 'Δλ = (dλ/dT)·ΔT        δλ = λ/Q\nx = 2(λ−λ_r)/δλ ;  slope s(x) = 2x/(1+x²)² ; optimum x₀ = 1/√3\nOMA ∝ s(x)/s(x₀)  →  penalty = −10·log10(s/s₀) dB',
      m: 'Q = 5k → δλ ≈ 0.26 nm ≈ 3 K of drift; lock to ±0.1 K → < 0.05 dB; heater 0.1–0.3 nm/mW',
      e: 'Eye shrinks (OMA penalty) and breathes. Heater noise is 2nd-order at the lock point and becomes 1st-order once detuned.',
      x: 'Dither / power-monitor lock loops, fast heater PID, lower Q (trade vs. efficiency), thermal isolation trenches, athermal cladding.' },
    { id: 'nl', n: 'MRM nonlinearity / PAM4 level compression', dom: 'optics', st: ['mrm', 'drv'], demo: { nl: 85 },
      o: 'Ring transmission is Lorentzian and the PN-junction index change Δn(V) is sub-linear (depletion width ∝ √V), so equally spaced drive voltages give unequally spaced optical levels.',
      eq: 'P(V) = P_in · T(λ − λ_r(V)),  T = 1 − D/(1+x²)\nRLM = 3·min(ΔP_j) / (P₃ − P₀)\npenalty ≈ −10·log10(RLM)',
      m: 'Uncompensated RLM ≈ 0.85–0.95; specs typically require ≥ 0.95',
      e: 'Unequal eye heights — usually the eye nearest resonance (lowest power) is compressed. NRZ is immune.',
      x: 'DAC-based driver pre-distortion (level LUT), bias-point choice, adaptive slicer thresholds in DSP, MLSE.' },
    { id: 'isi', n: 'Inter-symbol interference (bandwidth)', dom: 'data', st: ['drv', 'mrm', 'tia'], demo: { fe: 30, q: 12000, ffe: false },
      o: 'Finite bandwidth everywhere: driver and TIA RC poles, µbump/trace parasitics, PD transit time and the ring photon lifetime — the cavity stores energy for τ_p and cannot change faster.',
      eq: 'τ_p = Qλ/(2πc)      f_ring ≈ 1/(2πτ_p) = c/(λQ)\nf_RC = 1/(2πRC)\nσ²_ISI = Var(s) · Σ_{k≠0} g_k²\nFFE noise gain = Σ_i Σ_j c_i c_j ρ_n(i−j)',
      m: 'Q = 5k @ 1310 nm → τ_p ≈ 3.5 ps, f ≈ 46 GHz; 200G PAM4 needs ≈ 45–60 GHz end to end',
      e: 'Vertical and horizontal closure, multiple rails per level. Equalization reopens the eye but enhances noise.',
      x: 'FFE / CTLE / DFE in the SerDes DSP, lower Q, short EIC↔PIC interconnect (3D stacking), driver peaking; detuned rings show optical peaking.' },
    { id: 'jitter', n: 'Jitter (RJ / DJ / PJ / DCD, PLL)', dom: 'control', st: ['drv', 'cdr'], demo: { rj: 25, pj: 60, dcd: 40 },
      o: 'RJ: PLL/VCO phase noise and device thermal noise (Gaussian, unbounded). DJ: periodic jitter from supply/clock spurs, DCD from clock duty-cycle error (half-rate clocking), data-dependent jitter from ISI, bounded jitter from crosstalk.',
      eq: 'σ_t = √(2∫L(f)df) / (2π f_c)\nTJ@BER ≈ DJ_δδ + 2·Q_BER·RJ\nσ²_amp ≈ σ_t² · Var(s) · Σ_k g\'_k²',
      m: '200G-class SerDes RJ ≈ 100–200 fs rms (1–2 % UI at 106 GBd, UI = 9.4 ps)',
      e: 'Horizontal closure, fuzzy crossings, bathtub walls move in; DCD → double crossing; PJ → bimodal edges.',
      x: 'Low-noise LC PLL, CDR tracking (removes jitter below its bandwidth), clean PLL supply, duty-cycle correction.' },
    { id: 'xtalk', n: 'Crosstalk (WDM, NEXT/FEXT, thermal)', dom: 'optics', st: ['demux', 'drv', 'mrm'], demo: { xw: -15, xe: -24, xth: 0.6 },
      o: 'WDM: a neighbour ring\'s Lorentzian tail passes part of the adjacent wavelength (incoherent — powers add). Electrical: dense µbump/trace lanes in EIC and substrate couple (NEXT/FEXT). Thermal: neighbour heaters and drivers warm your ring and detune it.',
      eq: 'Ring drop leakage  X ≈ 1 / (1 + (2Δλ_ch/δλ)²)\n200 GHz spacing (1.14 nm), δλ = 0.26 nm → X ≈ −19 dB per ring\nσ²_XT = Σ_a ε_a² · Var(s_a)',
      m: 'Optical −20…−30 dB (multi-stage filtering), electrical −35…−45 dB',
      e: 'Bounded, noise-like thickening (sum of independent PAM4 aggressors); thermal crosstalk adds detuning penalty.',
      x: 'Wider channel spacing or higher-Q / 2nd-order demux (trade vs FM-AM & ISI), lane spacing & shielding, thermal trenches, crosstalk-aware lock loops.' },
    { id: 'mpi', n: 'Reflections & multi-path interference', dom: 'optics', st: ['fib1', 'fib2'], demo: { mpi: -24, lw: 5 },
      o: 'Two reflections (connectors, fiber-to-chip interface, PD facet) create a delayed copy of the signal that interferes with it at the PD. The beat term has a random, slowly drifting phase.',
      eq: 'σ²_MPI ≈ 2·ε·I_k·Ī        (ε ≈ R₁·R₂ · coupling)\nbeat spectrum: Lorentzian, HWHM ≈ Δν\nPDF is arcsine-like (bounded), not Gaussian',
      m: 'Connector reflectance −35…−55 dB; MPI −40…−50 dB. PAM4 is ~3× more sensitive than NRZ',
      e: 'Level-dependent and slow — the eye breathes; with narrow linewidth the beat is quasi-static (thick bands in persistence).',
      x: 'APC (angled) connectors, low-reflectance couplers, index matching, ELS isolators, DSP MPI-tracking.' },
    { id: 'pdl', n: 'PDL / polarization effects', dom: 'optics', st: ['fib1', 'fib2', 'demux'], demo: { pdl: 2.5 },
      o: 'Silicon waveguides and grating couplers are polarization-dependent (usually TE-only). The laser feed uses PM fiber. On the receive side the random SOP in standard fiber meets the PDL of couplers/demux, so received power drifts with temperature and fiber handling.',
      eq: 'PDL = 10·log10(P_max/P_min)\ng(t) ∈ [10^(−PDL/10), 1]\nmean penalty ≈ −10·log10(1 − δ/2),  δ = 1 − 10^(−PDL/10)',
      m: 'Edge coupler < 0.5 dB; 1-D grating without diversity 1–3 dB',
      e: 'Slow amplitude fade; with AGC it looks mostly like a power penalty.',
      x: 'PM fiber for the ELS feed, polarization-diversity receiver (2-D grating / splitter-rotator), edge couplers.' },
    { id: 'psn', n: 'Power-supply noise coupling', dom: 'power', st: ['vrm', 'drv', 'laser', 'cdr'], demo: { vrm: 45 },
      o: 'VRM switching ripple (0.2–2 MHz plus ringing) and load transients pass through finite PSRR into driver swing, laser bias current, TIA and the PLL/VCO — where they become spurs and periodic jitter.',
      eq: 'ΔOMA/OMA ≈ k_v · V_ripple       (here 0.1 %/mV pk)\nPJ ≈ K_vco · V_ripple / PSRR    (here 1 mUI per mVpp)\nspur [dBc] = 20·log10(β/2)',
      m: 'Point-of-load ripple 2–20 mVpp; PSRR 30–50 dB',
      e: 'Periodic breathing (AM) plus periodic jitter; discrete spurs in the noise PSD and phase-noise plots.',
      x: 'LDOs on analog/PLL rails, on-package decoupling, separate PLL supply, higher or spread-spectrum switching frequency.' },
    { id: 'quant', n: 'ADC quantization (DSP receiver)', dom: 'data', st: ['adc'], demo: { enob: 3.5 },
      o: 'ADC/DSP receivers sample at the baud rate with finite ENOB, which lumps quantization, ADC thermal noise, sampling-clock jitter and nonlinearity.',
      eq: 'Δ = FS / 2^ENOB        σ_q² = Δ²/12\nSQNR = 6.02·ENOB + 1.76 dB (full-scale sine)',
      m: '200G-class ADC ENOB ≈ 5–6 bits',
      e: 'Uniform, level-independent noise; visible staircase at low ENOB; clipping if AGC is wrong.',
      x: 'Correct AGC/full-scale, more ENOB (power cost), or linear analog receive (LPO-style) without ADC — trading away DSP equalization.' },
    { id: 'cd', n: 'Chromatic dispersion & mode partition', dom: 'optics', st: ['fib2'], demo: { len: 6000, lam: 1271 },
      o: 'SMF has zero dispersion near 1310 nm, so in the O-band |D| ≤ ~4 ps/nm/km. The modulated signal occupies ≈ λ²B/c ≈ 0.6 nm at 106 GBd. Mode-partition noise requires a multimode laser; the CW DFB in an ELS is single-mode, so MPN is essentially absent.',
      eq: 'D(λ) = (S₀/4)·(λ − λ₀⁴/λ³),  S₀ ≈ 0.092 ps/(nm²·km)\nΔτ = |D| · L · Δλ_sig,   Δλ_sig ≈ λ²·B/c',
      m: '500 m @ 1311 nm → Δτ ≈ 0.03 ps; 2 km @ 1271 nm → 4.6 ps (0.49 UI)',
      e: 'Small extra ISI; negligible at CPO reaches (< 500 m) in the O-band.',
      x: 'Operate near λ₀, keep reach short, FFE.' }
  ];

  // ---------------------------------------------------------------- physics model
  function solve(A, b) {
    const n = b.length, M = A.map((r, i) => r.concat([b[i]]));
    for (let c = 0; c < n; c++) {
      let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
      if (Math.abs(M[piv][c]) < 1e-12) return null;
      const t = M[c]; M[c] = M[piv]; M[piv] = t;
      for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
    }
    return M.map((r, i) => r[n] / r[i]);
  }
  const X0 = 1 / Math.sqrt(3);
  const sfun = x => 2 * x / ((1 + x * x) * (1 + x * x));

  function derive(S) {
    const M = S.fmt === 'nrz' ? 2 : 4;
    const baud = S.baud * 1e9, fs = SPS * baud, lamNm = S.lam, lam = lamNm * 1e-9, nu = CL / lam;
    const dnu = nu / S.q, tauP = S.q * lam / (2 * Math.PI * CL), fRing = 1 / (2 * Math.PI * tauP), dlRing = lamNm / S.q;
    const xOf = dT => X0 + 2 * S.dldT * dT / dlRing;
    const fdet = dT => Math.max(0.02, sfun(xOf(dT)) / sfun(X0));
    const dTt = S.dT + S.xth, fd = fdet(dTt);
    const sT = S.heat / 1000, gn = [0, Math.sqrt(3) * sT, -Math.sqrt(3) * sT], gw = [2 / 3, 1 / 6, 1 / 6];
    let hm = 0, h2 = 0; for (let i = 0; i < 3; i++) { const g = fdet(dTt + gn[i]) / fd; hm += gw[i] * g; h2 += gw[i] * g * g; }
    const hv = Math.max(0, h2 - hm * hm);
    const DEP = 0.9, x = xOf(dTt), Tx = 1 - DEP / (1 + x * x);
    const rel = (2 / dnu) * DEP * Math.abs(sfun(x)) / Math.max(0.05, Tx);
    const rinFM = rel * rel * (S.lw * 1e6 / Math.PI);
    const Dps = S0 / 4 * (lamNm - Math.pow(LAM0, 4) / Math.pow(lamNm, 3));
    const dlSig = lam * lam * baud / CL * 1e9;
    const dtau = Math.abs(Dps) * (S.len / 1000) * dlSig; // ps
    const fcd = dtau > 1e-4 ? 0.44 / (dtau * 1e-12) : Infinity;
    const pole = f => (isFinite(f) ? Math.exp(-2 * Math.PI * f / fs) : 0);
    const aR = pole(fRing), aE = pole(S.fe * 1e9), aC = pole(fcd);
    const Bn = Math.min(Math.PI / 2 * S.fe * 1e9, 0.6 * baud), aN = pole(Bn * 2 / Math.PI);
    const L = 40 * SPS, h = new Float64Array(L), hA = new Float64Array(L);
    let r = 0, e = 0, c = 0, ea = 0;
    for (let n = 0; n < L; n++) {
      const u = n < SPS ? 1 : 0;
      r += (1 - aR) * (u - r); e += (1 - aE) * (r - e); c += (1 - aC) * (e - c); h[n] = c;
      ea += (1 - aE) * (u - ea); hA[n] = ea;
    }
    let p = 0; for (let n = 0; n < L; n++) if (h[n] > h[p]) p = n;
    const hc = k => { const i = p + k * SPS; return i >= 0 && i < L ? h[i] : 0; };
    let J = [0], cf = [1];
    if (S.ffe) {
      const JJ = [-1, 0, 1, 2, 3];
      const A = JJ.map(k => JJ.map(j => hc(k - j))), b = JJ.map(k => (k === 0 ? 1 : 0));
      const sol = solve(A, b); if (sol) { J = JJ; cf = sol; }
    }
    const conv = src => { const g = new Float64Array(L); for (let n = 0; n < L; n++) { let s = 0; for (let j = 0; j < J.length; j++) { const i = n - J[j] * SPS; if (i >= 0 && i < L) s += cf[j] * src[i]; } g[n] = s; } return g; };
    const g = conv(h), gA = conv(hA);
    const g0 = g[p];
    let isi = 0, isiMean = 0, jit = 0;
    for (let k = -3; k <= 36; k++) {
      const i = p + k * SPS; if (i < 1 || i >= L - 1) continue;
      const gd = (g[i + 1] - g[i - 1]) / 2 * SPS; jit += gd * gd;
      if (k !== 0) { isi += g[i] * g[i]; isiMean += g[i]; }
    }
    let enh = 0, enhW = 0, dcg = 0;
    for (let i = 0; i < J.length; i++) { dcg += cf[i]; for (let j = 0; j < J.length; j++) { enh += cf[i] * cf[j] * Math.pow(aN, Math.abs(J[i] - J[j]) * SPS); if (i === j) enhW += cf[i] * cf[i]; } }
    let xtG = 0; for (let n = 0; n < L; n++) xtG += gA[n] * gA[n]; xtG /= SPS;
    const base = M === 4 ? [-1, -1 / 3, 1 / 3, 1] : [-1, 1];
    const cn = S.nl / 100;
    const y = base.map(d => (M === 4 ? d - 0.45 * cn * (d * d * d - d) + 0.2 * cn * (d * d - 1) : d));
    let mind = Infinity; for (let i = 0; i < M - 1; i++) mind = Math.min(mind, y[i + 1] - y[i]);
    const rlm = (M - 1) * mind / (y[M - 1] - y[0]);
    const varD = base.reduce((a, v) => a + v * v, 0) / M;
    return { M, baud, fs, dnu, tauP, fRing, dlRing, fd, hm, hv, fdet, dTt, rinFM, rel, Dps, dlSig, dtau, fcd, aR, aE, aC, aN, Bn,
      h, g, p, J, cf, g0, isi, isiMean, jit, enh, enhW, dcg, xtG, base, y, rlm, varD, x };
  }

  function analyze(S, D, prx, mode, addVar) {
    const ref = mode === 'ref', tx = mode === 'tx', M = D.M;
    const Pavg = 1e-3 * Math.pow(10, prx / 10), rER = Math.pow(10, S.er / 10), OMA = 2 * Pavg * (rER - 1) / (rER + 1);
    const Ib = RESP * Pavg, fd = ref ? 1 : D.fd, half0 = RESP * OMA / 2, half = half0 * fd;
    const yv = ref ? D.base : D.y;
    const pdlD = ref ? 0 : 1 - Math.pow(10, -S.pdl / 10), pm = 1 - pdlD / 2, pv = pdlD * pdlD / 8;
    const hm = ref ? 1 : D.hm, hv = ref ? 0 : D.hv, g0 = ref ? 1 : D.g0;
    const enh = ref ? 1 : D.enh, enhW = ref ? 1 : D.enhW, dcg2 = D.dcg * D.dcg, Bn = D.Bn;
    const s = yv.map(v => half * v);
    const meanS = s.reduce((a, v) => a + v, 0) / M;
    const varS = s.reduce((a, v) => a + (v - meanS) * (v - meanS), 0) / M;
    const ia = 6e-12 * S.en, ce = 2 * Math.PI * S.ct * 1e-15 * S.en * 1e-9;
    const rinL = Math.pow(10, S.rin / 10), epsM = Math.pow(10, S.mpi / 10), epsW = Math.pow(10, S.xw / 10), aEl = Math.pow(10, S.xe / 20);
    const mv = 0.001 * S.vrm / 2;
    const st2 = Math.pow(S.rj / 1000, 2) + Math.pow(S.pj / 1000, 2) / 2 + Math.pow(S.dcd / 1000, 2) / 4 + Math.pow(S.vrm * 0.5e-3, 2) / 2;
    const dq = 2.6 * half0 / Math.pow(2, S.enob);
    const by = {}; SRC.forEach(x => { by[x[0]] = 0; });
    const mu = [], v2 = [];
    for (let i = 0; i < M; i++) {
      const Ii = Math.max(0, Ib + s[i]), sg = s[i] * g0, t = {};
      if (!tx) {
        t.thermal = 4 * KB * TK / S.rf * Bn * enh;
        t.amp = (ia * ia * Bn + ce * ce * Bn * Bn * Bn / 3) * enh;
        t.shot = 2 * QE * Ii * Bn * enh;
        t.dark = 2 * QE * S.id * 1e-9 * Bn * enh;
        if (!ref) t.quant = dq * dq / 12 * enhW;
      }
      if (!ref) {
        t.rin = rinL * Ii * Ii * Bn * enh;
        t.fmam = D.rinFM * Ii * Ii * Bn * enh;
        t.heat = hv * sg * sg * pm * pm;
        t.mpi = 2 * epsM * Ii * Ib * dcg2;
        t.pdl = pv * sg * sg * hm * hm;
        t.vrm = mv * mv / 2 * sg * sg;
        t.xwdm = 2 * epsW * epsW * half0 * half0 * D.varD * D.xtG;
        t.xel = aEl * aEl * half0 * half0 * D.varD * D.xtG;
        t.isi = varS * D.isi * pm * pm;
        t.jit = st2 * varS * D.jit * pm * pm;
      }
      let tot = (addVar || 0) * enh;
      for (const k in t) { tot += t[k]; by[k] += t[k] / M; }
      mu.push((sg * hm + (ref ? 0 : meanS * D.isiMean)) * pm);
      v2.push(tot);
    }
    const Q = []; let ber = 0;
    for (let j = 0; j < M - 1; j++) {
      const d = mu[j + 1] - mu[j], q = d > 0 ? d / (Math.sqrt(v2[j]) + Math.sqrt(v2[j + 1])) : 0;
      Q.push(q); ber += Qf(q);
    }
    ber = M === 4 ? 0.25 * ber : ber;
    const mm = mu.reduce((a, v) => a + v, 0) / M;
    const vmu = mu.reduce((a, v) => a + (v - mm) * (v - mm), 0) / M, vn = v2.reduce((a, v) => a + v, 0) / M;
    return { mu, v2, by, Q, ber, snr: vmu / vn, Ib, OMA, half0, half, pm, hm, totVar: vn };
  }

  function tdecq(S, D, prx) {
    const a = analyze(S, D, prx, 'tx');
    if (a.ber >= KP4) return Infinity;
    const yv = D.y, outer = (yv[D.M - 1] - yv[0]) * a.half * a.pm * a.hm;
    const sid = D.M === 4 ? outer / (6 * QT4) : outer / (2 * QT2);
    let lo = 0, hi = outer;
    for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (analyze(S, D, prx, 'tx', m * m).ber < KP4) lo = m; else hi = m; }
    return lo > 0 ? db10(sid / lo) : Infinity;
  }
  function sens(S, D, mode) {
    const f = x => Math.log10(Math.max(1e-300, analyze(S, D, x, mode).ber)) - Math.log10(KP4);
    if (f(20) > 0) return null;
    let lo = -40, hi = 20; if (f(lo) < 0) return lo;
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (f(m) > 0) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }

  // ---------------------------------------------------------------- time-domain simulator
  function makeSim(S, D, prx) {
    const M = D.M, sps = SPS;
    const Pavg = 1e-3 * Math.pow(10, prx / 10), rER = Math.pow(10, S.er / 10), OMA = 2 * Pavg * (rER - 1) / (rER + 1);
    const Ib = RESP * Pavg, half0 = RESP * OMA / 2, half = half0 * D.fd, Bn = D.Bn;
    const ia = 6e-12 * S.en, ce = 2 * Math.PI * S.ct * 1e-15 * S.en * 1e-9;
    const vConst = (4 * KB * TK / S.rf + ia * ia + 2 * QE * S.id * 1e-9) * Bn + ce * ce * Bn * Bn * Bn / 3;
    const kShot = 2 * QE * Bn, kRin = (Math.pow(10, S.rin / 10) + D.rinFM) * Bn;
    const aR = D.aR, aE = D.aE, aC = D.aC, aN = D.aN, kN = Math.sqrt((1 + aN) / (1 - aN));
    const epsM = Math.pow(10, S.mpi / 10), epsW = Math.pow(10, S.xw / 10), aEl = Math.pow(10, S.xe / 20);
    const pdlD = 1 - Math.pow(10, -S.pdl / 10), mV = 0.001 * S.vrm / 2, pjV = S.vrm * 0.5e-3;
    const rj = S.rj / 1000, pj = S.pj / 1000, dcd = S.dcd / 1000;
    const FS = 2.6 * half0, dq = FS / Math.pow(2, S.enob);
    const rhoH = Math.exp(-1 / 400), kH = Math.sqrt(1 - rhoH * rhoH), sT = S.heat / 1000;
    const stepM = Math.sqrt(2 * Math.PI * S.lw * 1e6 / (S.baud * 1e9) * 50);
    const y = D.y, base = D.base, J = D.J, cf = D.cf, p = D.p, nJ = J.length, randn = C.randn;
    let xR = 0, xE = 0, xC = 0, nz = 0, a1 = 0, a2 = 0, a3 = 0, dTh = 0, thP = Math.random() * 6.28, phM = Math.random() * 6.28, phV = 0, phP = 0, kg = 0;
    let v = null, w = null, sym = null, jit = null;
    function run(N, eye, stats) {
      const nS = N * sps;
      if (!v || v.length !== nS) { v = new Float32Array(nS); w = new Float32Array(nS); sym = new Uint8Array(N); jit = new Float32Array(N); }
      for (let k = 0; k < N; k++) {
        const sy = (Math.random() * M) | 0; sym[k] = sy;
        let gh = 1;
        if (sT > 0) { dTh = rhoH * dTh + kH * sT * randn(); gh = D.fdet(D.dTt + dTh) / D.fd; }
        thP += 0.004 * randn(); phM += stepM * randn(); phV += 2 * Math.PI / 6000; phP += 2 * Math.PI / 211;
        const gp = 1 - pdlD * (1 + Math.sin(thP)) / 2, G = gh * (1 + mV * Math.sin(phV)) * gp;
        jit[k] = rj * randn() + pj * Math.sin(phP) + ((kg & 1) ? dcd / 2 : -dcd / 2) + pjV * Math.sin(phV);
        kg++;
        const drv = y[sy], b1 = base[(Math.random() * M) | 0], b2 = base[(Math.random() * M) | 0], b3 = base[(Math.random() * M) | 0];
        const cm = 2 * Math.cos(phM), off = k * sps, Ibp = gp * Ib;
        for (let s = 0; s < sps; s++) {
          xR += (1 - aR) * (drv - xR); xE += (1 - aE) * (xR - xE); xC += (1 - aC) * (xE - xC);
          a1 += (1 - aE) * (b1 - a1); a2 += (1 - aE) * (b2 - a2); a3 += (1 - aE) * (b3 - a3);
          const sig = half * G * xC, Ia = Math.max(0, Ibp + sig);
          nz = aN * nz + (1 - aN) * kN * Math.sqrt(vConst + kShot * Ia + kRin * Ia * Ia) * randn();
          let val = sig + nz + cm * Math.sqrt(epsM * Ia * Ib) + half0 * (epsW * (a1 + a2) + aEl * a3);
          if (S.enob < 10) { val = Math.round(val / dq) * dq; if (val > FS / 2) val = FS / 2; else if (val < -FS / 2) val = -FS / 2; }
          v[off + s] = val;
        }
      }
      const lo = 3 * sps, hi = nS - sps;
      for (let m = lo; m < hi; m++) { let a = 0; for (let j = 0; j < nJ; j++) a += cf[j] * v[m - J[j] * sps]; w[m] = a; }
      if (eye) drawTraces(N, eye, lo, hi);
      if (stats) collect(N, stats, eye, lo, hi);
    }
    function drawTraces(N, eye, lo, hi) {
      const W = eye.W, H = eye.H, acc = eye.acc, ys = (H / 2) / (half0 * 1.45), yc = H / 2, dx = W / (2 * sps);
      for (let k = 0; k < N; k++) {
        const i0 = k * sps + p - sps / 2;
        if (i0 < lo || i0 + 2 * sps + 1 >= hi) continue;
        const sh = -jit[k] * sps * dx;
        let prev = -1;
        for (let i = 0; i < 2 * sps; i++) {
          const xa = i * dx + sh, ya = yc - w[i0 + i] * ys, yb = yc - w[i0 + i + 1] * ys;
          const c0 = Math.ceil(xa), c1 = Math.floor(xa + dx);
          for (let c = c0; c <= c1; c++) {
            if (c < 0 || c >= W) { prev = -1; continue; }
            let r = Math.round(ya + (yb - ya) * (c - xa) / dx); if (r < 0) r = 0; else if (r >= H) r = H - 1;
            if (prev < 0 || prev === r) acc[r * W + c] += 1;
            else {
              const r0 = prev < r ? prev : r, r1 = prev < r ? r : prev, wt = 1 / Math.sqrt(r1 - r0 + 1);
              for (let rr = r0; rr <= r1; rr++) acc[rr * W + c] += wt;
            }
            prev = r;
          }
        }
      }
    }
    function collect(N, st, eye, lo, hi) {
      const H = st.H, ys = (H / 2) / (half0 * 1.45), yc = H / 2, mid = (NP - 1) / 2;
      for (let k = 0; k < N; k++) {
        const mc = k * sps + p;
        if (mc - sps < lo || mc + sps + 1 >= hi) continue;
        const sy = sym[k];
        for (let ph = 0; ph < NP; ph++) {
          const t = mc + (ph / (NP - 1) - 0.5 + jit[k]) * sps, i = Math.floor(t), f = t - i;
          const val = w[i] * (1 - f) + w[i + 1] * f, idx = ph * 4 + sy;
          st.n[idx] += 1; st.s1[idx] += val; st.s2[idx] += val * val;
          if (ph === mid) { let r = Math.round(yc - val * ys); if (r < 0) r = 0; else if (r >= H) r = H - 1; st.hist[sy * H + r] += 1; }
        }
      }
    }
    return { run, half0, Ib, scale: half0 };
  }

  // ---------------------------------------------------------------- colour + canvas helpers
  let PAL = null, LUT = null;
  function cssv(n) { const v = getComputedStyle(document.documentElement).getPropertyValue(n).trim(); return v || '#888888'; }
  function rgb(hex) {
    hex = String(hex).replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const n = parseInt(hex.slice(0, 6), 16);
    return isNaN(n) ? [136, 136, 136] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const shade = (c, s) => (s >= 0 ? c.map(v => Math.round(v + (255 - v) * s)) : c.map(v => Math.round(v * (1 + s))));
  const css = (c, a) => (a == null ? 'rgb(' + c.join(',') + ')' : 'rgba(' + c.join(',') + ',' + a + ')');
  function initPalette() {
    PAL = {};
    ['--bg', '--bg2', '--panel', '--panel2', '--line', '--text', '--muted', '--accent', '--accent2', '--warn', '--bad', '--good', '--violet',
      '--optic', '--power', '--data', '--ctrl', '--therm', '--sense', '--mech'].forEach(k => { PAL[k] = rgb(cssv(k)); });
    const stops = [[0, PAL['--bg2']], [0.12, shade(PAL['--violet'], -0.45)], [0.35, PAL['--data']], [0.6, PAL['--accent']], [0.82, PAL['--power']], [1, [255, 255, 255]]];
    LUT = new Uint8ClampedArray(256 * 3);
    for (let i = 0; i < 256; i++) {
      const t = i / 255; let j = 0; while (j < stops.length - 2 && t > stops[j + 1][0]) j++;
      const a = stops[j], b = stops[j + 1], u = (t - a[0]) / (b[0] - a[0]);
      for (let c = 0; c < 3; c++) LUT[i * 3 + c] = a[1][c] + (b[1][c] - a[1][c]) * u;
    }
  }
  const srcColor = s => shade(PAL[s[2]], s[3]);
  const LVCOL = ['--data', '--accent', '--power', '--optic'];
  function lvColor(i, M) { return PAL[M === 2 ? (i ? '--optic' : '--data') : LVCOL[i]]; }
  const FONT = '13px "Segoe UI", system-ui, sans-serif';
  function mkCanvas(w, h, cls) { return C.h('canvas', { class: cls || '', width: w, height: h }); }

  // plot frame. o: {x0,y0,x1,y1, X(v), Y(v), xt:[[v,label]], yt:[[v,label]], xl, yl}
  function axes(ctx, o) {
    ctx.save(); ctx.font = FONT; ctx.lineWidth = 1;
    ctx.strokeStyle = css(PAL['--line'], 0.7); ctx.fillStyle = css(PAL['--muted']);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    o.xt.forEach(t => { const x = o.X(t[0]); ctx.beginPath(); ctx.moveTo(x, o.y0); ctx.lineTo(x, o.y1); ctx.stroke(); ctx.fillText(t[1], x, o.y1 + 5); });
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    o.yt.forEach(t => { const y = o.Y(t[0]); ctx.beginPath(); ctx.moveTo(o.x0, y); ctx.lineTo(o.x1, y); ctx.stroke(); ctx.fillText(t[1], o.x0 - 6, y); });
    ctx.strokeStyle = css(PAL['--line']); ctx.strokeRect(o.x0, o.y0, o.x1 - o.x0, o.y1 - o.y0);
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    if (o.xl) ctx.fillText(o.xl, (o.x0 + o.x1) / 2, ctx.canvas.height - 2);
    if (o.yl) { ctx.translate(12, (o.y0 + o.y1) / 2); ctx.rotate(-Math.PI / 2); ctx.textBaseline = 'middle'; ctx.fillText(o.yl, 0, 0); }
    ctx.restore();
  }
  const fmtUA = a => C.fmt(a * 1e6, 3) + ' µA';
  function decimals(st) { return st >= 1 ? 0 : Math.ceil(-Math.log10(st) - 1e-9); }
  function fmtP(p, v) { return (p.log ? C.fmt(v, 3) : v.toFixed(decimals(p.st))) + (p.u ? ' ' + p.u : ''); }

  // ---------------------------------------------------------------- section state
  let inst = null;
  const TABS = [['lab', 'Signal Lab'], ['sources', 'Noise Sources'], ['spectrum', 'Spectrum'], ['math', 'Math & Formulas']];

  function sliderRow(p, S, onChange) {
    const inp = C.h('input', { type: 'range', min: p.log ? Math.log10(p.min) : p.min, max: p.log ? Math.log10(p.max) : p.max, step: p.log ? 0.01 : p.st });
    const out = C.h('output', {});
    const row = C.h('div', { class: 'slider-row nz-row', 'data-k': p.k }, C.h('label', { html: p.l }), inp, out);
    const sync = () => { inp.value = p.log ? Math.log10(S[p.k]) : S[p.k]; out.textContent = fmtP(p, S[p.k]); };
    inp.addEventListener('input', () => {
      let v = parseFloat(inp.value); if (p.log) v = Math.pow(10, v);
      S[p.k] = v; out.textContent = fmtP(p, v); onChange(p.k);
    });
    sync(); row._sync = sync; return row;
  }

  function render(container, sub) {
    initPalette();
    const S = Object.assign({}, DEF);
    const st = { S, D: null, A: null, tab: 'lab', stopLab: null, stopThumbs: null, rows: [], spRows: [], paused: false, decay: 0.93, frame: 0, pending: 0 };
    inst = st;
    container.classList.add('nz');
    container.appendChild(C.h('h1', {}, 'Noise & Signal Integrity Lab'));
    container.appendChild(C.h('p', { class: 'h-sub', html: 'Every impairment between the external laser and the DSP slicer of a co-packaged micro-ring optical link — where it enters, its physics, and what it does to a live ' +
      C.tip('PAM4') + ' eye. Numbers are ' + C.badge('typ') + ' industry values or ' + C.badge('est') + ' model assumptions; none are NVIDIA-internal specs.' }));
    const tabs = C.h('div', { class: 'tabs' });
    const panes = {};
    TABS.forEach(t => {
      tabs.appendChild(C.h('div', { class: 'tab', 'data-t': t[0], onclick: () => C.go('noise/' + t[0]) }, t[1]));
      panes[t[0]] = C.h('div', { class: 'nz-pane', 'data-t': t[0] });
    });
    container.appendChild(tabs);
    TABS.forEach(t => container.appendChild(panes[t[0]]));
    st.panes = panes; st.tabsEl = tabs;
    buildLab(st, panes.lab);
    buildSources(st, panes.sources);
    buildSpectrum(st, panes.spectrum);
    buildMath(st, panes.math);
    update(st);
    setTab(st, TABS.some(t => t[0] === sub) ? sub : 'lab');
    return function cleanup() {
      if (st.stopLab) st.stopLab(); st.stopLab = null;
      if (st.stopThumbs) st.stopThumbs(); st.stopThumbs = null;
      if (st.pending) cancelAnimationFrame(st.pending);
      if (inst === st) inst = null;
    };
  }

  function setTab(st, id) {
    if (!st.panes[id]) id = 'lab';
    st.tab = id;
    st.tabsEl.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.t === id));
    Object.keys(st.panes).forEach(k => { st.panes[k].style.display = k === id ? '' : 'none'; });
    if (id === 'lab') startLab(st); else if (st.stopLab) { st.stopLab(); st.stopLab = null; }
    if (id === 'sources') startThumbs(st);
    if (id === 'spectrum') drawSpectrum(st);
  }

  // ---------------------------------------------------------------- Signal Lab UI
  function buildLab(st, pane) {
    const S = st.S;
    const onChange = () => scheduleUpdate(st);
    const bar = C.h('div', { class: 'nz-bar' });
    bar.appendChild(C.h('span', { class: 'muted' }, 'Presets:'));
    [['clean', 'Clean'], ['typical', 'Typical CPO link'], ['stressed', 'Stressed'], ['worst', 'Worst case']].forEach(pz => {
      bar.appendChild(C.h('button', { class: 'btn', onclick: () => applyPreset(st, PRESETS[pz[0]]) }, pz[1]));
    });
    const fmtBtns = C.h('span', { class: 'nz-seg' });
    [['pam4', 'PAM4'], ['nrz', 'NRZ']].forEach(f => {
      fmtBtns.appendChild(C.h('button', { class: 'btn' + (S.fmt === f[0] ? ' active' : ''), 'data-f': f[0], onclick: () => {
        S.fmt = f[0]; fmtBtns.querySelectorAll('button').forEach(x => x.classList.toggle('active', x.dataset.f === S.fmt)); update(st);
      } }, f[1]));
    });
    bar.appendChild(fmtBtns);
    const baudSel = C.h('select', { onchange: () => { S.baud = parseFloat(baudSel.value); update(st); } });
    [[53.125, '53.125 GBd (100G PAM4)'], [106.25, '106.25 GBd (200G PAM4)'], [113.4375, '113.4 GBd (200G + overhead)']].forEach(o => {
      const op = C.h('option', { value: o[0] }, o[1]); if (o[0] === S.baud) op.selected = true; baudSel.appendChild(op);
    });
    bar.appendChild(baudSel);
    const pers = C.h('select', { title: 'Persistence', onchange: () => { st.decay = parseFloat(pers.value); } });
    [[0.85, 'Short persistence'], [0.93, 'Medium persistence'], [0.975, 'Long persistence'], [1, 'Infinite persistence']].forEach(o => {
      const op = C.h('option', { value: o[0] }, o[1]); if (o[0] === 0.93) op.selected = true; pers.appendChild(op);
    });
    bar.appendChild(pers);
    const pauseBtn = C.h('button', { class: 'btn', onclick: () => { st.paused = !st.paused; pauseBtn.textContent = st.paused ? '▶ Run' : '❚❚ Pause'; } }, '❚❚ Pause');
    bar.appendChild(pauseBtn);
    bar.appendChild(C.h('button', { class: 'btn', onclick: () => clearAcc(st) }, 'Clear'));
    pane.appendChild(bar);

    const lab = C.h('div', { class: 'nz-lab' });
    const ctrl = C.h('aside', { class: 'card nz-ctrl' });
    ctrl.appendChild(C.h('div', { class: 'nz-ctrl-h' }, 'Impairment controls'));
    GROUPS.forEach(g => {
      const det = C.h('details', { open: (g[0] === 'link' || g[0] === 'laser' || g[0] === 'ring') ? true : null });
      det.appendChild(C.h('summary', {}, C.h('span', { class: 'nz-dot', style: { background: 'var(' + g[2] + ')' } }), g[1]));
      P.filter(p => p.g === g[0]).forEach(p => { const r = sliderRow(p, S, onChange); st.rows.push(r); det.appendChild(r); });
      if (g[0] === 'bw') {
        const cb = C.h('input', { type: 'checkbox', checked: S.ffe ? true : null, onchange: () => { S.ffe = cb.checked; update(st); } });
        st.ffeBox = cb;
        det.appendChild(C.h('label', { class: 'nz-check' }, cb, ' 5-tap zero-forcing FFE (DSP)'));
      }
      det.appendChild(C.h('div', { class: 'nz-gnote muted', 'data-g': g[0] }));
      ctrl.appendChild(det);
    });
    lab.appendChild(ctrl);

    const main = C.h('div', { class: 'nz-main' });
    const kp = C.h('div', { class: 'nz-kpis' });
    const KP = [['q', 'Q (worst eye)'], ['snr', 'SNR (electrical)'], ['ber', 'BER (model)'], ['bers', 'BER (sim, Gauss fit)'], ['eh', 'Eye height @KP4'],
      ['ew', 'Eye width @KP4'], ['tdecq', 'TDECQ-like'], ['sens', 'Sensitivity @2.4e-4'], ['pen', 'Penalty vs ideal']];
    st.kpi = {};
    KP.forEach(k => {
      const v = C.h('div', { class: 'nz-kv' }, '—'), s = C.h('div', { class: 'nz-ks muted' }, '');
      kp.appendChild(C.h('div', { class: 'nz-kpi' }, C.h('div', { class: 'nz-kl' }, k[1]), v, s));
      st.kpi[k[0]] = { v, s };
    });
    main.appendChild(kp);

    const eyeCard = C.h('div', { class: 'card nz-eyecard' });
    eyeCard.appendChild(C.h('div', { class: 'nz-head' }, C.h('h3', {}, 'Live eye diagram — persistence heat-map'),
      C.h('span', { class: 'muted nz-small', html: 'Simulated photocurrent, ' + SPS + ' samples/UI, after the ' + C.tip('FFE') + '. Dashed amber = slicer thresholds, brackets = eye height at the KP4 Q. Right: level histograms at the sampling instant.' })));
    st.eyeC = mkCanvas(720, 400, 'nz-eye'); st.histC = mkCanvas(160, 400, 'nz-hist');
    eyeCard.appendChild(C.h('div', { class: 'nz-eyewrap' }, st.eyeC, st.histC));
    main.appendChild(eyeCard);
    st.eye = { W: 720, H: 400, acc: new Float32Array(720 * 400) };
    st.img = st.eyeC.getContext('2d').createImageData(720, 400);
    st.stats = { H: 400, n: new Float64Array(NP * 4), s1: new Float64Array(NP * 4), s2: new Float64Array(NP * 4), hist: new Float32Array(4 * 400) };

    const g1 = C.h('div', { class: 'grid2 nz-g' });
    const bt = C.h('div', { class: 'card' }, C.h('h3', {}, 'Bathtub — BER vs sampling phase'));
    st.btC = mkCanvas(720, 260, 'nz-plot'); bt.appendChild(st.btC);
    bt.appendChild(C.h('div', { class: 'muted nz-small', html: 'Per phase the simulator collects mean and σ of every level (jitter, ISI, crosstalk included) and evaluates BER = ¼·Σ Q(Q<sub>j</sub>). Orange dot = analytic model at the optimum phase. Gaussian extrapolation over-estimates bounded impairments (PJ, MPI, crosstalk) in the deep tails.' }));
    const bud = C.h('div', { class: 'card' }, C.h('h3', {}, 'Noise budget — σ²ᵢ / σ²_total at the slicer'));
    st.donC = mkCanvas(260, 260, 'nz-donut'); st.budList = C.h('div', { class: 'nz-budlist' });
    bud.appendChild(C.h('div', { class: 'nz-budwrap' }, st.donC, st.budList));
    g1.appendChild(bt); g1.appendChild(bud); main.appendChild(g1);

    const g2 = C.h('div', { class: 'grid2 nz-g' });
    const wf = C.h('div', { class: 'card' }, C.h('h3', {}, 'Waterfall — BER vs received optical power'));
    st.wfC = mkCanvas(720, 340, 'nz-plot'); wf.appendChild(st.wfC);
    wf.appendChild(C.h('div', { class: 'muted nz-small', html: 'Grey: ideal transmitter, receiver noise only (thermal + amplifier + shot + dark). Green: all current impairments. The horizontal gap at the KP4 threshold is the sensitivity penalty; a curve that flattens is a BER floor (RIN, MPI and crosstalk scale with power).' }));
    const pen = C.h('div', { class: 'card' }, C.h('h3', {}, 'Penalties & live equations'));
    st.penEl = C.h('div', { class: 'nz-pen' }); st.eqEl = C.h('div', { class: 'eq nz-live' });
    pen.appendChild(st.penEl); pen.appendChild(st.eqEl);
    g2.appendChild(wf); g2.appendChild(pen); main.appendChild(g2);
    lab.appendChild(main);
    pane.appendChild(lab);
  }

  function scheduleUpdate(st) {
    if (st.pending) return;
    st.pending = requestAnimationFrame(() => { st.pending = 0; if (inst === st) update(st); });
  }
  function applyPreset(st, pz) {
    Object.assign(st.S, PRESETS.typical, pz);
    st.rows.forEach(r => r._sync());
    st.spRows.forEach(r => r._sync());
    if (st.ffeBox) st.ffeBox.checked = !!st.S.ffe;
    update(st);
  }
  function clearAcc(st) { st.eye.acc.fill(0); resetStats(st); }
  function resetStats(st) { const s = st.stats; s.n.fill(0); s.s1.fill(0); s.s2.fill(0); s.hist.fill(0); st.sres = null; }

  function update(st) {
    const S = st.S;
    st.D = derive(S);
    st.A = analyze(S, st.D, S.prx, 'full');
    st.sensF = sens(S, st.D, 'full'); st.sensR = sens(S, st.D, 'ref');
    st.tdecq = tdecq(S, st.D, S.prx);
    st.sim = makeSim(S, st.D, S.prx);
    const acc = st.eye.acc; for (let i = 0; i < acc.length; i++) acc[i] *= 0.25;
    resetStats(st);
    updateKPIs(st); drawBudget(st); drawWaterfall(st); drawPenalties(st); groupNotes(st);
    if (st.tab === 'spectrum') drawSpectrum(st);
  }

  function groupNotes(st) {
    const D = st.D, S = st.S;
    const set = (g, html) => { const el = st.panes.lab.querySelector('.nz-gnote[data-g="' + g + '"]'); if (el) el.innerHTML = html; };
    set('link', 'OMA = ' + C.fmt(st.A.OMA * 1e3, 3) + ' mW · Ī = ' + fmtUA(st.A.Ib) + ' · R = ' + RESP + ' A/W');
    set('laser', 'RIN<sub>FM</sub> (FM→AM on ring slope) = ' + db10(Math.max(1e-30, D.rinFM)).toFixed(1) + ' dB/Hz');
    set('rx', '√(4kT/R<sub>f</sub>) = ' + (Math.sqrt(4 * KB * TK / S.rf) * 1e12).toFixed(1) + ' pA/√Hz · B<sub>n</sub> = ' + (D.Bn / 1e9).toFixed(1) + ' GHz');
    set('ring', 'δλ = λ/Q = ' + D.dlRing.toFixed(3) + ' nm · τ<sub>p</sub> = ' + (D.tauP * 1e12).toFixed(2) + ' ps · f<sub>ring</sub> ≈ ' + (D.fRing / 1e9).toFixed(1) +
      ' GHz · shift ' + ((S.dT + S.xth) * S.dldT * 1000).toFixed(1) + ' pm → OMA ×' + D.fd.toFixed(3));
    set('bw', 'h₀ = ' + D.h[D.p].toFixed(3) + ' · FFE [' + D.cf.map(c => c.toFixed(2)).join(', ') + '] · noise gain ' + db10(D.enh).toFixed(2) + ' dB');
    set('jit', 'UI = ' + (1e12 / D.baud).toFixed(2) + ' ps · RJ = ' + (S.rj / 1000 / D.baud * 1e15).toFixed(0) + ' fs rms');
    set('xt', 'Thermal crosstalk shifts resonance by ' + (S.xth * S.dldT * 1000).toFixed(1) + ' pm');
    set('refl', 'PDL mean loss ' + (-db10(1 - (1 - Math.pow(10, -S.pdl / 10)) / 2)).toFixed(2) + ' dB');
    set('psu', 'AM ' + (0.1 * S.vrm / 2).toFixed(2) + ' % pk · PJ ' + (S.vrm * 0.5).toFixed(1) + ' mUI pk ' + C.badge('est'));
    set('fiber', 'D(λ) = ' + D.Dps.toFixed(2) + ' ps/nm/km · Δτ = ' + D.dtau.toFixed(3) + ' ps (' + (D.dtau * 1e-12 * D.baud * 100).toFixed(1) + ' % UI) · MPN ≈ 0 (single-mode DFB)');
  }

  function setK(st, k, v, s, bad) {
    const e = st.kpi[k]; e.v.textContent = v; e.s.textContent = s || '';
    e.v.classList.toggle('bad', bad === true); e.v.classList.toggle('good', bad === false);
  }
  function updateKPIs(st) {
    const A = st.A, D = st.D, qt = D.M === 4 ? QT4 : QT2;
    const qmin = Math.min.apply(null, A.Q);
    setK(st, 'q', qmin.toFixed(2), (qmin > 0 ? (20 * Math.log10(qmin)).toFixed(1) + ' dB' : 'eye closed') + ' · KP4 needs ' + qt.toFixed(2), qmin < qt);
    setK(st, 'snr', db10(A.snr).toFixed(1) + ' dB', 'σ_total = ' + fmtUA(Math.sqrt(A.totVar)));
    setK(st, 'ber', A.ber.toExponential(2), A.ber < KP4 ? 'below KP4 pre-FEC limit' : 'above KP4 limit', A.ber >= KP4);
    setK(st, 'tdecq', isFinite(st.tdecq) ? Math.max(0, st.tdecq).toFixed(2) + ' dB' : 'closed', 'TX-side only (RX noise removed)', !isFinite(st.tdecq) || st.tdecq > 3.4);
    setK(st, 'sens', st.sensF == null ? 'floor' : st.sensF.toFixed(2) + ' dBm', 'ideal: ' + (st.sensR == null ? '—' : st.sensR.toFixed(2) + ' dBm'), st.sensF == null);
    const pen = st.sensF == null ? Infinity : st.sensF - st.sensR;
    setK(st, 'pen', isFinite(pen) ? pen.toFixed(2) + ' dB' : '∞ (BER floor)', 'margin at ' + st.S.prx.toFixed(1) + ' dBm: ' + (st.sensF == null ? '—' : (st.S.prx - st.sensF).toFixed(2) + ' dB'),
      !isFinite(pen) || st.S.prx < st.sensF);
    setK(st, 'bers', '…', 'collecting'); setK(st, 'eh', '…', ''); setK(st, 'ew', '…', '');
  }

  function evalStats(st) {
    const M = st.D.M, s = st.stats, res = { ber: new Float64Array(NP), mu: [], sg: [], ok: false };
    for (let ph = 0; ph < NP; ph++) {
      const mu = [], sg = []; let ok = true;
      for (let i = 0; i < M; i++) {
        const idx = ph * 4 + i, n = s.n[idx];
        if (n < 30) { ok = false; break; }
        const m = s.s1[idx] / n; mu.push(m); sg.push(Math.sqrt(Math.max(1e-30, s.s2[idx] / n - m * m)));
      }
      if (!ok) { res.ber[ph] = NaN; continue; }
      let b = 0;
      for (let j = 0; j < M - 1; j++) { const d = mu[j + 1] - mu[j]; b += Qf(d > 0 ? d / (sg[j] + sg[j + 1]) : 0); }
      res.ber[ph] = M === 4 ? 0.25 * b : b;
      if (ph === (NP - 1) / 2) { res.mu = mu; res.sg = sg; res.ok = true; }
    }
    return res;
  }

  function startLab(st) {
    if (st.stopLab) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    st.stopLab = C.loop(() => {
      st.frame++;
      if (st.paused || (reduce && st.frame % 3)) return;
      const acc = st.eye.acc, dec = st.decay, s = st.stats;
      if (dec < 1) for (let i = 0; i < acc.length; i++) acc[i] *= dec;
      for (let i = 0; i < s.n.length; i++) { s.n[i] *= 0.996; s.s1[i] *= 0.996; s.s2[i] *= 0.996; }
      const hd = dec < 1 ? Math.max(dec, 0.97) : 1; for (let i = 0; i < s.hist.length; i++) s.hist[i] *= hd;
      st.sim.run(700, st.eye, st.stats);
      drawEye(st);
      if (st.frame % 4 === 0) { st.sres = evalStats(st); drawHist(st); }
      if (st.frame % 8 === 0) { drawBathtub(st); simKPIs(st); }
    });
  }

  // ---------------------------------------------------------------- lab drawing
  function drawEye(st) {
    const E = st.eye, acc = E.acc, W = E.W, H = E.H, img = st.img, d = img.data;
    let mx = 1; for (let i = 0; i < acc.length; i++) if (acc[i] > mx) mx = acc[i];
    const lm = 255 / Math.log1p(mx), bg = PAL['--bg'];
    for (let i = 0, j = 0; i < acc.length; i++, j += 4) {
      const a = acc[i];
      if (a < 0.02) { d[j] = bg[0]; d[j + 1] = bg[1]; d[j + 2] = bg[2]; d[j + 3] = 255; continue; }
      const li = Math.min(255, (Math.pow(Math.log1p(a) * lm / 255, 1.7) * 255) | 0) * 3;
      d[j] = LUT[li]; d[j + 1] = LUT[li + 1]; d[j + 2] = LUT[li + 2]; d[j + 3] = 255;
    }
    const ctx = st.eyeC.getContext('2d');
    ctx.putImageData(img, 0, 0);
    const half0 = st.sim.half0, ys = (H / 2) / (half0 * 1.45);
    ctx.save(); ctx.font = FONT; ctx.fillStyle = css(PAL['--muted']); ctx.strokeStyle = css(PAL['--line'], 0.9);
    ctx.setLineDash([3, 5]);
    (st.D.M === 4 ? [-1, -1 / 3, 1 / 3, 1] : [-1, 1]).forEach(v => {
      const y = H / 2 - v * half0 * ys; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      ctx.fillText(C.fmt(v * half0 * 1e6, 3) + ' µA', 4, y - 4);
    });
    ctx.strokeStyle = css(PAL['--accent'], 0.6);
    [W / 4, 3 * W / 4].forEach(x => { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); });
    ctx.setLineDash([]); ctx.textAlign = 'center';
    [['0', W / 4], ['0.5', W / 2], ['1 UI', 3 * W / 4]].forEach(t => ctx.fillText(t[0], t[1], H - 6));
    const r = st.sres;
    if (r && r.ok) {
      const M = st.D.M, qt = M === 4 ? QT4 : QT2;
      for (let j = 0; j < M - 1; j++) {
        const top = r.mu[j + 1] - qt * r.sg[j + 1], bot = r.mu[j] + qt * r.sg[j];
        const thr = (r.mu[j] * r.sg[j + 1] + r.mu[j + 1] * r.sg[j]) / (r.sg[j] + r.sg[j + 1]), yt = H / 2 - thr * ys;
        ctx.strokeStyle = css(PAL['--warn'], 0.85); ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(W / 4 - 70, yt); ctx.lineTo(W / 4 + 70, yt); ctx.stroke(); ctx.setLineDash([]);
        const open = top > bot, col = open ? PAL['--good'] : PAL['--bad'];
        const y1 = H / 2 - top * ys, y2 = H / 2 - bot * ys, x = W / 4 + 12;
        ctx.strokeStyle = css(col); ctx.lineWidth = 2;
        if (open) { ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.moveTo(x - 5, y1); ctx.lineTo(x + 5, y1); ctx.moveTo(x - 5, y2); ctx.lineTo(x + 5, y2); ctx.stroke(); }
        ctx.lineWidth = 1; ctx.fillStyle = css(col); ctx.textAlign = 'left';
        ctx.fillText(open ? 'EH ' + C.fmt((top - bot) * 1e6, 2) + ' µA' : 'closed', x + 8, open ? (y1 + y2) / 2 + 4 : yt - 4);
      }
    }
    ctx.restore();
  }

  function drawHist(st) {
    const ctx = st.histC.getContext('2d'), W = 160, H = 400, M = st.D.M, h = st.stats.hist;
    ctx.fillStyle = css(PAL['--bg']); ctx.fillRect(0, 0, W, H);
    let mx = 1e-9; for (let i = 0; i < M * H; i++) if (h[i] > mx) mx = h[i];
    for (let l = 0; l < M; l++) {
      const col = lvColor(l, M);
      ctx.fillStyle = css(col, 0.5); ctx.strokeStyle = css(col); ctx.beginPath(); ctx.moveTo(0, 0);
      for (let r = 0; r < H; r++) ctx.lineTo(h[l * H + r] / mx * (W - 12), r);
      ctx.lineTo(0, H); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    const r = st.sres;
    if (r && r.ok) {
      const ys = (H / 2) / (st.sim.half0 * 1.45);
      ctx.font = '11px "Segoe UI", sans-serif'; ctx.textAlign = 'right';
      for (let l = 0; l < M; l++) { ctx.fillStyle = css(lvColor(l, M)); ctx.fillText('σ ' + C.fmt(r.sg[l] * 1e6, 2) + ' µA', W - 3, H / 2 - r.mu[l] * ys - 6); }
    }
    ctx.strokeStyle = css(PAL['--line']); ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
  }

  function eyeWidth(r) {
    const mid = (NP - 1) / 2; if (!(r.ber[mid] < KP4)) return { w: 0 };
    let a = mid, b = mid;
    while (a > 0 && r.ber[a - 1] < KP4) a--;
    while (b < NP - 1 && r.ber[b + 1] < KP4) b++;
    const ua = a / (NP - 1) - 0.5, ub = b / (NP - 1) - 0.5;
    return { a: ua, b: ub, w: Math.min(1, ub - ua + 1 / (NP - 1)) };
  }

  function drawBathtub(st) {
    const ctx = st.btC.getContext('2d'), W = 720, H = 260;
    ctx.clearRect(0, 0, W, H);
    const o = { x0: 58, y0: 10, x1: W - 12, y1: H - 36 };
    o.X = v => o.x0 + (v + 0.5) * (o.x1 - o.x0); o.Y = v => o.y0 + (-v / 16) * (o.y1 - o.y0);
    o.xt = [[-0.5, '−0.5'], [-0.25, '−0.25'], [0, '0'], [0.25, '0.25'], [0.5, '0.5']];
    o.yt = [0, -3, -6, -9, -12, -15].map(v => [v, '1e' + v]); o.xl = 'sampling phase (UI)'; o.yl = 'BER';
    axes(ctx, o);
    const lk = Math.log10(KP4);
    ctx.font = FONT;
    ctx.strokeStyle = css(PAL['--warn']); ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(o.x0, o.Y(lk)); ctx.lineTo(o.x1, o.Y(lk)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = css(PAL['--warn']); ctx.fillText('KP4 2.4e-4', o.x1 - 84, o.Y(lk) - 5);
    const r = st.sres; if (!r) return;
    const pts = [];
    for (let ph = 0; ph < NP; ph++) { const b = r.ber[ph]; if (!isNaN(b)) pts.push([ph / (NP - 1) - 0.5, Math.max(-16, Math.log10(Math.max(1e-17, b)))]); }
    if (pts.length < 2) return;
    const g = ctx.createLinearGradient(0, o.y0, 0, o.y1);
    g.addColorStop(0, css(PAL['--accent'], 0.05)); g.addColorStop(1, css(PAL['--accent'], 0.35));
    ctx.beginPath(); ctx.moveTo(o.X(pts[0][0]), o.y1);
    pts.forEach(p => ctx.lineTo(o.X(p[0]), o.Y(p[1]))); ctx.lineTo(o.X(pts[pts.length - 1][0]), o.y1); ctx.closePath();
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = css(PAL['--accent']); ctx.lineWidth = 2.5; ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(o.X(p[0]), o.Y(p[1])) : ctx.moveTo(o.X(p[0]), o.Y(p[1])))); ctx.stroke(); ctx.lineWidth = 1;
    const mb = Math.max(-16, Math.log10(Math.max(1e-17, st.A.ber)));
    ctx.fillStyle = css(PAL['--optic']); ctx.beginPath(); ctx.arc(o.X(0), o.Y(mb), 5, 0, 7); ctx.fill();
    ctx.fillText('model', o.X(0) + 8, o.Y(mb) - 6);
    const ew = eyeWidth(r);
    if (ew.w > 0) {
      const y = o.Y(lk);
      ctx.strokeStyle = css(PAL['--good']); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(o.X(ew.a), y); ctx.lineTo(o.X(ew.b), y); ctx.stroke(); ctx.lineWidth = 1;
      ctx.fillStyle = css(PAL['--good']); ctx.textAlign = 'center'; ctx.fillText('EW ' + ew.w.toFixed(2) + ' UI', o.X((ew.a + ew.b) / 2), y + 16); ctx.textAlign = 'left';
    }
  }

  function simKPIs(st) {
    const r = st.sres; if (!r) return;
    let best = 1; for (let i = 0; i < NP; i++) if (r.ber[i] < best) best = r.ber[i];
    if (!r.ok) return;
    setK(st, 'bers', best.toExponential(2), 'best phase, ' + C.fmt(st.stats.n[((NP - 1) / 2) * 4], 3) + ' samples/level', best >= KP4);
    const M = st.D.M, qt = M === 4 ? QT4 : QT2; let eh = Infinity;
    for (let j = 0; j < M - 1; j++) eh = Math.min(eh, (r.mu[j + 1] - qt * r.sg[j + 1]) - (r.mu[j] + qt * r.sg[j]));
    const nom = 2 * st.sim.half0 / (M - 1);
    setK(st, 'eh', eh > 0 ? C.fmt(eh * 1e6, 3) + ' µA' : 'closed', (eh > 0 ? (100 * eh / nom).toFixed(0) : 0) + ' % of ideal eye', eh <= 0);
    const ew = eyeWidth(r);
    setK(st, 'ew', ew.w > 0 ? ew.w.toFixed(2) + ' UI' : 'closed', ew.w > 0 ? (ew.w / st.D.baud * 1e12).toFixed(2) + ' ps' : '', ew.w <= 0);
  }

  function drawBudget(st) {
    const A = st.A, ctx = st.donC.getContext('2d'), W = 260, cx = 130, cy = 130;
    ctx.clearRect(0, 0, W, W);
    const items = SRC.map(s => ({ s, v: A.by[s[0]] || 0 })), tot = items.reduce((a, i) => a + i.v, 0) || 1;
    let a0 = -Math.PI / 2;
    items.forEach(it => {
      const da = it.v / tot * Math.PI * 2; if (da <= 0) return;
      ctx.beginPath(); ctx.arc(cx, cy, 118, a0, a0 + da); ctx.arc(cx, cy, 76, a0 + da, a0, true); ctx.closePath();
      ctx.fillStyle = css(srcColor(it.s)); ctx.fill(); ctx.strokeStyle = css(PAL['--bg']); ctx.lineWidth = 1.5; ctx.stroke();
      a0 += da;
    });
    ctx.fillStyle = css(PAL['--text']); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '600 21px "Segoe UI", sans-serif';
    ctx.fillText(C.fmt(Math.sqrt(tot) * 1e6, 3) + ' µA', cx, cy);
    ctx.font = FONT; ctx.fillStyle = css(PAL['--muted']); ctx.fillText('σ_total rms', cx, cy + 22); ctx.fillText('√Σσᵢ²', cx, cy - 22);
    st.budList.innerHTML = '';
    items.slice().sort((a, b) => b.v - a.v).forEach(it => {
      const pc = 100 * it.v / tot;
      st.budList.appendChild(C.h('div', { class: 'nz-brow' + (pc < 0.5 ? ' dim' : '') },
        C.h('span', { class: 'nz-sw', style: { background: css(srcColor(it.s)) } }),
        C.h('span', { class: 'nz-bn' }, it.s[1]),
        C.h('span', { class: 'nz-bbar' }, C.h('i', { style: { width: Math.min(100, pc) + '%', background: css(srcColor(it.s)) } })),
        C.h('span', { class: 'nz-bv' }, pc.toFixed(1) + '%'),
        C.h('span', { class: 'nz-bs muted' }, C.fmt(Math.sqrt(it.v) * 1e6, 2) + ' µA')));
    });
  }

  function drawWaterfall(st) {
    const S = st.S, D = st.D, ctx = st.wfC.getContext('2d'), W = 720, H = 340;
    ctx.clearRect(0, 0, W, H);
    const o = { x0: 62, y0: 10, x1: W - 12, y1: H - 36 };
    const yv = b => Math.log10(-Math.log10(Math.min(0.1, Math.max(1e-16, b))));
    const yMax = Math.log10(16);
    o.X = v => o.x0 + (v + 16) / 20 * (o.x1 - o.x0); o.Y = v => o.y0 + v / yMax * (o.y1 - o.y0);
    o.xt = [-16, -12, -8, -4, 0, 4].map(v => [v, String(v)]);
    o.yt = [1e-1, 1e-2, 1e-3, 1e-4, 1e-6, 1e-9, 1e-12, 1e-15].map(b => [yv(b), b.toExponential(0)]);
    o.xl = 'average received optical power (dBm)'; o.yl = 'BER';
    axes(ctx, o);
    const lk = yv(KP4), y = o.Y(lk);
    ctx.strokeStyle = css(PAL['--warn']); ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(o.x0, y); ctx.lineTo(o.x1, y); ctx.stroke(); ctx.setLineDash([]);
    const curve = (mode, col, wd) => {
      ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath(); let started = false;
      for (let x = -16; x <= 4.001; x += 0.25) {
        const b = analyze(S, D, x, mode).ber, px = o.X(x);
        if (b < 1e-16) { if (started) ctx.lineTo(px, o.y1 + 4); break; }
        const py = o.Y(Math.max(0, yv(b)));
        if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
      }
      ctx.stroke(); ctx.lineWidth = 1;
    };
    ctx.save(); ctx.beginPath(); ctx.rect(o.x0, o.y0, o.x1 - o.x0, o.y1 - o.y0); ctx.clip();
    curve('ref', css(PAL['--mech']), 2);
    ctx.shadowColor = css(PAL['--accent']); ctx.shadowBlur = 8; curve('full', css(PAL['--accent']), 3); ctx.shadowBlur = 0;
    ctx.restore();
    ctx.font = FONT;
    if (st.sensR != null && st.sensR > -16) { ctx.fillStyle = css(PAL['--mech']); ctx.beginPath(); ctx.arc(o.X(st.sensR), y, 5, 0, 7); ctx.fill(); }
    if (st.sensF != null && st.sensF > -16 && st.sensF < 4) {
      ctx.fillStyle = css(PAL['--accent']); ctx.beginPath(); ctx.arc(o.X(st.sensF), y, 5, 0, 7); ctx.fill();
      if (st.sensR != null) {
        const xa = o.X(Math.max(-16, st.sensR)), xb = o.X(st.sensF);
        ctx.strokeStyle = css(PAL['--bad']); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xa, y - 14); ctx.lineTo(xb, y - 14); ctx.lineTo(xb - 6, y - 18); ctx.moveTo(xb, y - 14); ctx.lineTo(xb - 6, y - 10); ctx.stroke(); ctx.lineWidth = 1;
        ctx.fillStyle = css(PAL['--bad']); ctx.textAlign = 'center'; ctx.fillText('penalty ' + (st.sensF - st.sensR).toFixed(2) + ' dB', (xa + xb) / 2, y - 22); ctx.textAlign = 'left';
      }
    } else if (st.sensF == null) { ctx.fillStyle = css(PAL['--bad']); ctx.fillText('BER floor above KP4 — no received power closes the link', o.x0 + 12, o.y0 + 18); }
    const xp = o.X(S.prx);
    ctx.strokeStyle = css(PAL['--accent2'], 0.8); ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(xp, o.y0); ctx.lineTo(xp, o.y1); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = css(PAL['--accent2']); ctx.fillText('P_rx now', xp + 4, o.y0 + 34);
    ctx.fillStyle = css(PAL['--warn']); ctx.fillText('KP4 pre-FEC 2.4e-4', o.x1 - 140, y + 16);
  }

  function drawPenalties(st) {
    const S = st.S, D = st.D, A = st.A, pdlD = 1 - Math.pow(10, -S.pdl / 10);
    const rows = [
      ['Ring detuning (OMA loss)', -db10(D.fd), '--therm'],
      ['MRM level compression (RLM ' + D.rlm.toFixed(3) + ')', -db10(D.rlm), '--optic'],
      ['PDL mean loss', -db10(1 - pdlD / 2), '--optic'],
      ['FFE noise enhancement (optical dB)', 5 * Math.log10(D.enh), '--accent'],
      ['Total sensitivity penalty', st.sensF == null ? Infinity : st.sensF - st.sensR, '--bad']
    ];
    st.penEl.innerHTML = '';
    rows.forEach(r => {
      const v = r[1], w = isFinite(v) ? Math.min(100, Math.max(0, v) / 6 * 100) : 100;
      st.penEl.appendChild(C.h('div', { class: 'nz-prow' }, C.h('span', {}, r[0]),
        C.h('span', { class: 'nz-bbar' }, C.h('i', { style: { width: w + '%', background: 'var(' + r[2] + ')' } })),
        C.h('b', {}, isFinite(v) ? v.toFixed(2) + ' dB' : '∞')));
    });
    const sg = A.v2.map(v => Math.sqrt(v));
    let txt = 'σ²_total,k = Σᵢ σ²ᵢ,k     (independent sources add in variance)\n';
    txt += 'μ_k [µA] = ' + A.mu.map(m => (m * 1e6).toFixed(1)).join(', ') + '\n';
    txt += 'σ_k [µA] = ' + sg.map(s => (s * 1e6).toFixed(2)).join(', ') + '\n';
    txt += 'Q_j = (μ_j+1 − μ_j)/(σ_j + σ_j+1) = ' + A.Q.map(q => q.toFixed(2)).join(', ') + '\n';
    txt += (D.M === 4 ? 'BER ≈ ¼·Σ_j Q(Q_j)   (= ¾·Q(Q) for equal eyes) = ' : 'BER = Q(Q) = ') + A.ber.toExponential(2) + '\n';
    txt += 'Q(x) = ½·erfc(x/√2)     SNR = ' + db10(A.snr).toFixed(1) + ' dB';
    st.eqEl.textContent = txt;
  }

  // ---------------------------------------------------------------- Noise Sources tab
  function buildSources(st, pane) {
    pane.appendChild(C.h('p', { class: 'muted', html: 'Where each impairment enters the link. Hover a card to highlight its entry points; click a marker to jump to its card. <b>Isolate in lab</b> loads a clean link with only that impairment exaggerated.' }));
    const svg = C.s('svg', { viewBox: '0 0 890 200', class: 'nz-chain' });
    const sx = id => STAGES.find(s => s.id === id);
    const flow = 'M102 72 H118 M210 72 H226 M330 72 H346 M470 72 H486 M594 72 H610 M676 72 H692 M758 72 H774';
    svg.appendChild(C.s('path', { d: flow, class: 'nz-flow optic' }));
    svg.appendChild(C.s('path', { d: 'M278 140 V96', class: 'nz-flow data' }));
    svg.appendChild(C.s('path', { d: 'M822 140 V96', class: 'nz-flow ctrl' }));
    svg.appendChild(C.s('path', { d: 'M102 162 H226 M56 140 V96 M56 186 H880 V172 M725 186 V96', class: 'nz-flow power' }));
    st.stageEls = {};
    STAGES.forEach(s => {
      const g = C.s('g', { class: 'nz-stage' });
      g.appendChild(C.s('rect', { x: s.x, y: s.y, width: s.w, height: 44, rx: 8, style: 'stroke:' + C.domainColor(s.d) }));
      g.appendChild(C.s('text', { x: s.x + s.w / 2, y: s.y + 27, 'text-anchor': 'middle' }, s.l));
      svg.appendChild(g); st.stageEls[s.id] = g;
    });
    const count = {};
    SOURCES.forEach((src, i) => {
      const s = sx(src.st[0]), n = count[s.id] = (count[s.id] || 0) + 1;
      const cx = s.x + 12 + (n - 1) * 17, cy = s.y - 12;
      const m = C.s('g', { class: 'nz-mark', onclick: () => { const c = st.cardEls[src.id]; if (c) c.scrollIntoView({ behavior: 'smooth', block: 'center' }); } },
        C.s('title', {}, src.n), C.s('circle', { cx, cy, r: 8, style: 'fill:' + C.domainColor(src.dom) }), C.s('text', { x: cx, y: cy + 4, 'text-anchor': 'middle' }, String(i + 1)));
      svg.appendChild(m);
    });
    pane.appendChild(C.h('div', { class: 'card nz-chaincard' }, svg));

    const grid = C.h('div', { class: 'grid3 nz-cards' });
    st.cardEls = {}; st.thumbs = [];
    SOURCES.forEach((src, i) => {
      const cv = mkCanvas(240, 120, 'nz-thumb');
      const btn = C.h('button', { class: 'btn primary', onclick: () => isolate(st, src) }, 'Isolate in lab →');
      const card = C.h('div', { class: 'card nz-src', style: { borderTopColor: C.domainColor(src.dom) } },
        C.h('div', { class: 'nz-src-h' }, C.h('span', { class: 'nz-num', style: { background: C.domainColor(src.dom) } }, String(i + 1)), C.h('h3', {}, src.n)),
        C.h('div', { class: 'nz-thumbwrap' }, cv, C.h('span', { class: 'nz-thumbl' }, 'eye with only this impairment')),
        C.h('p', { html: '<b>Physical origin.</b> ' + src.o }),
        C.h('div', { class: 'eq' }, src.eq),
        C.h('p', { html: '<b>Typical magnitude</b> ' + C.badge('typ') + ' ' + src.m }),
        C.h('p', { html: '<b>Enters at:</b> ' + src.st.map(id => '<span class="pill">' + sx(id).l + '</span>').join(' ') }),
        C.h('p', { html: '<b>On the eye / histogram:</b> ' + src.e }),
        C.h('p', { html: '<b>Mitigation:</b> ' + src.x }),
        btn);
      card.addEventListener('mouseenter', () => src.st.forEach(id => st.stageEls[id].classList.add('hl')));
      card.addEventListener('mouseleave', () => src.st.forEach(id => st.stageEls[id].classList.remove('hl')));
      st.cardEls[src.id] = card; st.thumbs.push({ src, cv, done: false });
      grid.appendChild(card);
    });
    pane.appendChild(grid);
  }

  function isolate(st, src) {
    applyPreset(st, Object.assign({}, CLEAN, src.demo));
    C.go('noise/lab');
  }

  function renderThumb(t) {
    const S = Object.assign({}, DEF, CLEAN, t.src.demo), D = derive(S), sim = makeSim(S, D, S.prx);
    const W = 240, H = 120, eye = { W, H, acc: new Float32Array(W * H) };
    for (let i = 0; i < 5; i++) sim.run(500, eye, null);
    const ctx = t.cv.getContext('2d'), img = ctx.createImageData(W, H), d = img.data;
    let mx = 1; for (let i = 0; i < eye.acc.length; i++) if (eye.acc[i] > mx) mx = eye.acc[i];
    const lm = 255 / Math.log1p(mx), bg = PAL['--bg'];
    for (let i = 0, j = 0; i < eye.acc.length; i++, j += 4) {
      const a = eye.acc[i];
      if (a < 0.02) { d[j] = bg[0]; d[j + 1] = bg[1]; d[j + 2] = bg[2]; }
      else { const li = Math.min(255, (Math.pow(Math.log1p(a) * lm / 255, 1.7) * 255) | 0) * 3; d[j] = LUT[li]; d[j + 1] = LUT[li + 1]; d[j + 2] = LUT[li + 2]; }
      d[j + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    t.done = true;
  }
  function startThumbs(st) {
    if (st.stopThumbs || st.thumbs.every(t => t.done)) return;
    st.stopThumbs = C.loop(() => {
      const t = st.thumbs.find(x => !x.done);
      if (!t) { st.stopThumbs(); st.stopThumbs = null; return; }
      renderThumb(t);
    });
  }

  // ---------------------------------------------------------------- Spectrum tab
  function buildSpectrum(st, pane) {
    const wrap = C.h('div', { class: 'nz-spec' });
    const left = C.h('div', {});
    const c1 = C.h('div', { class: 'card' }, C.h('h3', {}, 'Input-referred current-noise density at the TIA input'));
    st.psdC = mkCanvas(900, 420, 'nz-plot'); c1.appendChild(st.psdC);
    st.psdLeg = C.h('div', { class: 'nz-leg' }); c1.appendChild(st.psdLeg);
    c1.appendChild(C.h('div', { class: 'muted nz-small', html: 'Uses the Signal-Lab settings at the current received power. Thermal and shot are white; amplifier noise has a 1/f corner and rises as f² (e<sub>n</sub>·ωC<sub>T</sub>); RIN shows the relaxation-oscillation hump; FM→AM rolls off above the ring half-linewidth; MPI beat noise is a narrow Lorentzian (≈Δν) — that is why it looks like slow wander on the eye; VRM ripple appears as discrete spurs.' }));
    const c2 = C.h('div', { class: 'card nz-g' }, C.h('h3', {}, 'Clock phase noise L(f) and integrated random jitter'));
    st.pnC = mkCanvas(900, 340, 'nz-plot'); c2.appendChild(st.pnC);
    left.appendChild(c1); left.appendChild(c2);
    const right = C.h('div', { class: 'card nz-specctl' }, C.h('h3', {}, 'PLL & supply'));
    SP.forEach(p => { const r = sliderRow(p, st.S, () => drawSpectrum(st)); st.spRows.push(r); right.appendChild(r); });
    st.rjOut = C.h('div', { class: 'nz-rj' });
    right.appendChild(st.rjOut);
    right.appendChild(C.h('button', { class: 'btn primary', onclick: () => {
      st.S.rj = Math.min(40, Math.round(st.rjCalc * 2) / 2);
      st.rows.forEach(r => r._sync()); update(st); C.go('noise/lab');
    } }, 'Use this RJ in the Signal Lab →'));
    right.appendChild(C.h('div', { class: 'eq' }, 'σ_φ² = 2·∫ L(f) df   (f_CDR … B/2)\nσ_t = σ_φ / (2π·f_c),  f_c = B/2 (half-rate)\nRJ[UI] = σ_t · B'));
    right.appendChild(C.h('p', { class: 'muted nz-small', html: 'Jitter below the CDR tracking bandwidth (≈4 MHz here ' + C.badge('est') + ') is followed by the receiver clock and does not close the eye — so low-frequency VRM spurs below it are harmless for timing, while spurs above it become PJ. Widening the PLL loop suppresses VCO noise but passes more reference noise.' }));
    wrap.appendChild(left); wrap.appendChild(right);
    pane.appendChild(wrap);
  }

  function logAxis(lo, hi, unitFn) { const t = []; for (let e = Math.ceil(Math.log10(lo)); e <= Math.floor(Math.log10(hi)); e++) t.push([Math.pow(10, e), unitFn(Math.pow(10, e))]); return t; }
  const fLabel = f => (f >= 1e9 ? f / 1e9 + 'G' : f >= 1e6 ? f / 1e6 + 'M' : f >= 1e3 ? f / 1e3 + 'k' : String(f));

  function drawSpectrum(st) {
    if (!st.psdC) return;
    const S = st.S, D = st.D, A = st.A, Ib = A.Ib;
    // ---- current PSD
    let ctx = st.psdC.getContext('2d'), W = 900, H = 420;
    ctx.clearRect(0, 0, W, H);
    const o = { x0: 70, y0: 10, x1: W - 14, y1: H - 38 }, f0 = 1e5, f1 = 2e11, p0 = 0.01, p1 = 1e4;
    o.X = f => o.x0 + Math.log10(f / f0) / Math.log10(f1 / f0) * (o.x1 - o.x0);
    o.Y = v => o.y1 - Math.log10(Math.max(p0, v) / p0) / Math.log10(p1 / p0) * (o.y1 - o.y0);
    o.xt = logAxis(f0, f1, f => fLabel(f) + 'Hz'); o.yt = logAxis(p0, p1, v => C.fmt(v, 2));
    o.xl = 'frequency'; o.yl = 'pA/√Hz';
    axes(ctx, o);
    const ia = 6e-12 * S.en, ce = 2 * Math.PI * S.ct * 1e-15 * S.en * 1e-9, rin0 = Math.pow(10, S.rin / 10), gam = 0.5 * F_RO, lw = S.lw * 1e6;
    const comps = [
      ['Thermal 4kT/R_f', '--data', 0, f => 4 * KB * TK / S.rf],
      ['TIA amplifier (1/f, f²)', '--data', 0.5, f => ia * ia * (1 + 2e7 / f) + Math.pow(ce * f, 2)],
      ['Shot 2qĪ', '--sense', 0, f => 2 * QE * Ib],
      ['Dark 2qI_d', '--sense', 0.55, f => 2 * QE * S.id * 1e-9],
      ['Laser RIN', '--optic', 0, f => { const Hh = Math.pow(F_RO, 4) / (Math.pow(F_RO * F_RO - f * f, 2) + Math.pow(gam * f, 2)); return rin0 * (0.2 + 0.8 * Hh) * Ib * Ib; }],
      ['Phase noise → FM-AM', '--optic', 0.45, f => D.rel * D.rel * (lw / Math.PI) * (1 + 1e7 / f) / (1 + Math.pow(2 * f / D.dnu, 2)) * Ib * Ib],
      ['MPI beat (Lorentzian ≈Δν)', '--optic', -0.35, f => 2 * Math.pow(10, S.mpi / 10) * Ib * Ib * (2 / Math.PI) * lw / (lw * lw + f * f)]
    ];
    const N = 320, fsAt = i => f0 * Math.pow(f1 / f0, i / (N - 1));
    const tot = new Float64Array(N);
    ctx.save(); ctx.beginPath(); ctx.rect(o.x0, o.y0, o.x1 - o.x0, o.y1 - o.y0); ctx.clip();
    // band shading
    ctx.fillStyle = css(PAL['--accent'], 0.06); ctx.fillRect(o.x0, o.y0, o.X(D.Bn) - o.x0, o.y1 - o.y0);
    st.psdLeg.innerHTML = '';
    comps.forEach(c => {
      const col = shade(PAL[c[1]], c[2]);
      ctx.strokeStyle = css(col); ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i < N; i++) { const f = fsAt(i), v = c[3](f); tot[i] += v; const x = o.X(f), y = o.Y(Math.sqrt(v) * 1e12); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
      st.psdLeg.appendChild(C.h('span', { class: 'nz-chip' }, C.h('i', { style: { background: css(col) } }), c[0]));
    });
    ctx.strokeStyle = css(PAL['--text']); ctx.lineWidth = 2.5; ctx.setLineDash([7, 4]); ctx.beginPath();
    for (let i = 0; i < N; i++) { const x = o.X(fsAt(i)), y = o.Y(Math.sqrt(tot[i]) * 1e12); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.setLineDash([]);
    st.psdLeg.appendChild(C.h('span', { class: 'nz-chip' }, C.h('i', { style: { background: css(PAL['--text']) } }), 'Total'));
    // VRM spurs (RBW 100 kHz)
    const mV = 0.001 * S.vrm / 2, rbw = 1e5, pcol = PAL['--power'];
    if (S.vrm > 0) for (let n = 1; n <= 8; n++) {
      const f = n * S.fsw * 1e6, amp = mV * Ib * Math.pow(0.5, n - 1), dens = Math.sqrt(amp * amp / 2 / rbw) * 1e12;
      const x = o.X(f); ctx.strokeStyle = css(pcol); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, o.y1); ctx.lineTo(x, o.Y(dens)); ctx.stroke();
      ctx.fillStyle = css(pcol); ctx.beginPath(); ctx.arc(x, o.Y(dens), 3, 0, 7); ctx.fill();
    }
    ctx.restore();
    st.psdLeg.appendChild(C.h('span', { class: 'nz-chip' }, C.h('i', { style: { background: css(pcol) } }), 'VRM ripple spurs (RBW 100 kHz)'));
    ctx.font = FONT; ctx.lineWidth = 1;
    [[D.Bn, 'B_n ' + C.fmt(D.Bn / 1e9, 3) + ' GHz', '--accent'], [D.baud / 2, 'Nyquist', '--accent2'], [D.dnu / 2, 'ring δν/2', '--therm'], [F_RO, 'RIN f_RO', '--optic']].forEach((m, i) => {
      const x = o.X(m[0]); if (x < o.x0 || x > o.x1) return;
      ctx.strokeStyle = css(PAL[m[2]], 0.7); ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(x, o.y0); ctx.lineTo(x, o.y1); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = css(PAL[m[2]]); ctx.textAlign = 'right'; ctx.fillText(m[1], x - 3, o.y0 + 14 + i * 15);
    });
    ctx.textAlign = 'left';

    // ---- phase noise
    ctx = st.pnC.getContext('2d'); W = 900; H = 340; ctx.clearRect(0, 0, W, H);
    const q = { x0: 70, y0: 10, x1: W - 14, y1: H - 38 }, g0 = 1e4, g1 = 1e11, l0 = -170, l1 = -40;
    q.X = f => q.x0 + Math.log10(f / g0) / Math.log10(g1 / g0) * (q.x1 - q.x0);
    q.Y = v => q.y1 - (v - l0) / (l1 - l0) * (q.y1 - q.y0);
    q.xt = logAxis(g0, g1, f => fLabel(f) + 'Hz'); q.yt = [-160, -140, -120, -100, -80, -60].map(v => [v, String(v)]);
    q.xl = 'offset frequency'; q.yl = 'L(f) dBc/Hz';
    axes(ctx, q);
    const bw = S.pnBw * 1e6, Lin = Math.pow(10, S.pnIn / 10), Lfl = Math.pow(10, S.pnFl / 10);
    const Lf = f => { const u = f / bw; return Lin * (1 + 0.8 * u * u / (1 + u * u * u * u)) / (1 + u * u) + Lfl; };
    const fLo = 4e6, fHi = D.baud / 2, fc = D.baud / 2;
    ctx.fillStyle = css(PAL['--ctrl'], 0.12); ctx.fillRect(q.X(fLo), q.y0, q.X(Math.min(g1, fHi)) - q.X(fLo), q.y1 - q.y0);
    ctx.strokeStyle = css(PAL['--ctrl']); ctx.lineWidth = 2.5; ctx.beginPath();
    for (let i = 0; i < N; i++) { const f = g0 * Math.pow(g1 / g0, i / (N - 1)), x = q.X(f), y = q.Y(db10(Lf(f))); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.lineWidth = 1;
    let ph2 = 0; const NI = 400;
    for (let i = 0; i < NI; i++) { const fa = fLo * Math.pow(fHi / fLo, i / NI), fb = fLo * Math.pow(fHi / fLo, (i + 1) / NI); ph2 += 0.5 * (Lf(fa) + Lf(fb)) * (fb - fa); }
    ph2 *= 2;
    // VRM spurs on the clock: −20log10 model, spur dBc = 20log10(β/2)
    const spurs = []; let spPh2 = 0;
    if (S.vrm > 0) for (let n = 1; n <= 8; n++) {
      const f = n * S.fsw * 1e6, beta = 2 * Math.PI * fc * (S.vrm * 0.5e-3 / D.baud) * Math.pow(0.5, n - 1), dbc = 20 * Math.log10(beta / 2);
      spurs.push([f, dbc]); if (f >= fLo && f <= fHi) spPh2 += 2 * Math.pow(10, dbc / 10);
    }
    ctx.strokeStyle = css(PAL['--power']); ctx.lineWidth = 2;
    spurs.forEach(s => { const x = q.X(s[0]); ctx.beginPath(); ctx.moveTo(x, q.y1); ctx.lineTo(x, q.Y(Math.min(l1, s[1]))); ctx.stroke(); });
    ctx.lineWidth = 1;
    const sigT = Math.sqrt(ph2) / (2 * Math.PI * fc), rjUI = sigT * D.baud * 1000;
    st.rjCalc = rjUI;
    ctx.font = FONT; ctx.fillStyle = css(PAL['--ctrl']); ctx.fillText('integration band ' + fLabel(fLo) + 'Hz … ' + fLabel(Math.round(fHi / 1e9) * 1e9) + 'Hz (shaded)', q.X(fLo) + 6, q.y0 + 16);
    ctx.fillStyle = css(PAL['--power']); if (spurs.length) ctx.fillText('VRM spurs', q.X(spurs[0][0]) + 4, q.Y(Math.min(l1, spurs[0][1])) + 14);
    st.rjOut.innerHTML = '<div class="nz-kl">Integrated RJ</div><div class="nz-kv">' + (sigT * 1e15).toFixed(1) + ' fs</div><div class="muted">' + rjUI.toFixed(2) +
      ' mUI rms · σ<sub>φ</sub> = ' + (Math.sqrt(ph2) * 1e3).toFixed(1) + ' mrad · lab RJ now ' + S.rj.toFixed(1) + ' mUI<br>VRM spurs above CDR BW (→ PJ, not RJ): ' + (Math.sqrt(spPh2) / (2 * Math.PI * fc) * D.baud * 1000).toFixed(2) + ' mUI rms</div>';
  }

  // ---------------------------------------------------------------- Math tab
  function buildMath(st, pane) {
    const B = [
      ['Variance addition (per PAM level k)', 'σ²_total,k = σ²_th + σ²_amp + σ²_shot,k + σ²_dark + σ²_RIN,k + σ²_FM-AM,k + σ²_MPI,k\n            + σ²_heat,k + σ²_PDL,k + σ²_VRM,k + σ²_XT + σ²_ISI + σ²_jit + σ²_q\nIndependent sources add in VARIANCE, never in rms.', 'Level-dependent terms (shot, RIN, MPI, gain-type noise) make the upper PAM4 levels thicker; the optimum slicer therefore sits closer to the quieter level.'],
      ['Signal levels', 'P_k = P̄ + (OMA/2)·y_k ,   y ∈ {−1, −⅓, +⅓, +1}  (PAM4)\nOMA = 2P̄·(ER − 1)/(ER + 1)\nI_k = R·P_k  (R ≈ 0.9 A/W Ge @ 1310 nm)\nμ_k = (I_k − Ī)·g₀ + ISI mean', 'A PAM4 eye is one-third of the outer OMA: ≈ 4.8 dB less than NRZ at equal OMA and noise.'],
      ['Q and BER', 'Q_j = (μ_j+1 − μ_j) / (σ_j + σ_j+1)\nNRZ:   BER = Q(Q)\nPAM4:  SER = ½·Σ_j Q(Q_j),  BER(Gray) ≈ SER/2 = ¼·Σ_j Q(Q_j)\n       equal eyes → BER ≈ (3/4)·Q(Q)\nQ(x) = ½·erfc(x/√2)', 'KP4 RS(544,514) pre-FEC threshold 2.4e-4 → Q_T = ' + QT4.toFixed(3) + ' (PAM4), ' + QT2.toFixed(3) + ' (NRZ).'],
      ['erfc implementation used here', 't = 1/(1 + z/2),  z = |x|\nerfc(z) ≈ t·exp(−z² − 1.26551223 + t(1.00002368 + t(0.37409196 + t(0.09678418\n        + t(−0.18628806 + t(0.27886807 + t(−1.13520398 + t(1.48851587\n        + t(−0.82215223 + 0.17087277 t)))))))))\nerfc(−z) = 2 − erfc(z)        |relative error| < 1.2e-7', 'Accurate deep into the tails (1e-20), unlike the series expansions — necessary for waterfall curves.'],
      ['SNR ↔ Q for PAM-M', 'Var(levels) = (M² − 1)/3 · (Δ/2)² ,  Q = Δ/(2σ)\nSNR = (M² − 1)/3 · Q²   → PAM4: SNR = 5·Q²\nQ_T = 3.41 → SNR ≈ 17.7 dB at the KP4 limit', ''],
      ['TDECQ-like penalty', 'σ_ideal = OMA_outer / (6·Q_T)\nσ_G   = largest added Gaussian noise (before the reference FFE)\n        that still meets BER = 2.4e-4 with TX impairments only\nTDECQ = 10·log10(σ_ideal / σ_G)', 'Receiver noise (thermal, amplifier, shot, dark, ADC) is removed: it isolates the transmitter + channel eye closure.'],
      ['Sensitivity penalty', 'P_sens = P̄ such that BER(P̄) = 2.4e-4\nΔP [dB] = P_sens(all impairments) − P_sens(RX noise only, ideal TX)\nBER floor: signal-proportional noise (RIN, MPI, XT) ⇒ Q → const as P̄ → ∞', ''],
      ['Receiver noise', 'σ²_th  = 4kT·B_n / R_f\nσ²_amp = i_a²·B_n + (2π·C_T·e_n)²·B_n³/3\nσ²_shot = 2q·(I_k + I_d)·B_n\nB_n = min(π/2·f_e, 0.6·B)', 'The f³ term is why C_T dominates at 100+ GBd: halving C_T cuts it by 4×.'],
      ['Ring physics', 'τ_p = Q·λ/(2πc)      δν = ν/Q = 1/(2πτ_p)\nδλ = λ/Q            Δλ_res = (dλ/dT)·ΔT ≈ 0.07–0.1 nm/K\nslope s(x) = 2x/(1+x²)², x = 2Δλ/δλ, optimum x₀ = 1/√3\nRIN_FM ≈ [(2D/δν)·s(x)/T(x)]²·Δν/π', ''],
      ['Jitter → amplitude, PLL integration', 'σ²_jit,amp ≈ σ_t² · Var(s) · Σ_k (dg/dt)²|_k\nσ_t² = RJ² + PJ²/2 + DCD²/4\nσ_φ² = 2∫ L(f) df,  σ_t = σ_φ/(2π f_c)', ''],
      ['ISI, FFE, crosstalk', 'g = c ∗ h  (zero-forcing on 5 cursors)\nσ²_ISI = Var(s)·Σ_{k≠0} g_k²\nnoise gain = Σ_i Σ_j c_i c_j ρ_n((i−j)T)\nσ²_XT = Σ_a ε_a²·Var(s_a)·⟨g_a²⟩', ''],
      ['MPI, PDL, quantization, dispersion', 'σ²_MPI ≈ 2ε·I_k·Ī      (arcsine PDF, Lorentzian spectrum ≈ Δν)\nPDL: g ∈ [1−δ, 1], δ = 1 − 10^(−PDL/10), Var = δ²/8\nσ_q² = Δ²/12, Δ = FS/2^ENOB\nΔτ_CD = |D(λ)|·L·λ²B/c', '']
    ];
    const g = C.h('div', { class: 'grid2' });
    B.forEach(b => g.appendChild(C.h('div', { class: 'card' }, C.h('h3', {}, b[0]), C.h('div', { class: 'eq' }, b[1]), b[2] ? C.h('p', { class: 'muted', text: b[2] }) : null)));
    pane.appendChild(g);
    pane.appendChild(C.h('div', { class: 'callout warn', html: 'Model limits: noise is treated as Gaussian for the analytic BER; slow processes (heater, PDL, MPI phase, VRM) are time-compressed in the simulator so their effect is visible within seconds; the ring is approximated by a single photon-lifetime pole (detuned rings show peaking). Values are ' + C.badge('typ') + '/' + C.badge('est') + ', not NVIDIA specifications.' }));
  }

  // ---------------------------------------------------------------- register
  C.registerSection({
    id: 'noise', title: 'Noise & Signal Integrity Lab', icon: '〰️', order: 40,
    render,
    onSubRoute(sub) { if (inst) setTab(inst, sub || 'lab'); }
  });
})();
