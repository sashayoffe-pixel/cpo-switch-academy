/* Data-Flow Simulator — a bit's journey through a CPO switch (Agent D). See CONTRACT.md */
(function () {
  'use strict';
  const C = window.CPO;
  if (!C) return;

  C.addGlossary({
    'CPO': { full: 'Co-Packaged Optics', def: 'Optical engines placed on the switch package next to the ASIC, replacing front-panel pluggable transceivers.', cat: 'optics' },
    'MRM': { full: 'Micro-Ring Modulator', def: 'Resonant silicon ring whose resonance is shifted by carrier depletion to modulate CW light.', cat: 'optics' },
    'ELS': { full: 'External Laser Source', def: 'Front-panel serviceable laser module feeding CW light to the optical engines over fiber.', cat: 'optics' },
    'WDM': { full: 'Wavelength-Division Multiplexing', def: 'Several wavelengths (lanes) share one fiber; rings act as mux/demux filters.', cat: 'optics' },
    'TIA': { full: 'Transimpedance Amplifier', def: 'Converts photodiode current into a voltage with low input-referred noise.', cat: 'optics' },
    'CDR': { full: 'Clock and Data Recovery', def: 'Extracts the symbol clock from the data stream and retimes the samples.', cat: 'data' },
    'ADC': { full: 'Analog-to-Digital Converter', def: 'Samples the received analog waveform (typ. 6–8 bit) for DSP equalization.', cat: 'data' },
    'DSP': { full: 'Digital Signal Processing', def: 'FFE/DFE/MLSE equalization, CDR and slicing performed digitally on ADC samples.', cat: 'data' },
    'SerDes': { full: 'Serializer / Deserializer', def: 'High-speed I/O that converts parallel data to a serial PAM4/NRZ lane and back.', cat: 'data' },
    'PCS': { full: 'Physical Coding Sublayer', def: '64b/66b encoding, 256b/257b transcoding, lane distribution, alignment markers.', cat: 'data' },
    'FEC': { full: 'Forward Error Correction', def: 'Redundant parity lets the receiver correct symbol errors without retransmission.', cat: 'data' },
    'KP4': { full: 'RS(544,514) "KP4" FEC', def: 'Reed–Solomon code over GF(2^10): 514 data + 30 parity 10-bit symbols, corrects t = 15 symbol errors.', cat: 'data' },
    'PAM4': { full: '4-level Pulse Amplitude Modulation', def: '2 bits per symbol, 4 amplitude levels; 1/3 the eye height of NRZ for the same swing.', cat: 'data' },
    'NRZ': { full: 'Non-Return-to-Zero', def: '2-level signalling, 1 bit per symbol.', cat: 'data' },
    'ISI': { full: 'Inter-Symbol Interference', def: 'Energy of one symbol smeared into its neighbours by limited channel bandwidth.', cat: 'data' },
    'ER': { full: 'Extinction Ratio', def: 'Ratio of optical power in the highest vs lowest level (P1/P0).', cat: 'optics' },
    'OMA': { full: 'Optical Modulation Amplitude', def: 'P1 − P0: the optical swing that actually carries information.', cat: 'optics' },
    'RIN': { full: 'Relative Intensity Noise', def: 'Laser intensity noise relative to mean power, dB/Hz.', cat: 'optics' },
    'SNR': { full: 'Signal-to-Noise Ratio', def: 'Here: (peak signal swing / rms noise)^2 at the slicer.', cat: 'data' },
    'SER': { full: 'Symbol Error Rate', def: 'Probability a received symbol is decided wrongly.', cat: 'data' },
    'BER': { full: 'Bit Error Rate', def: 'Errored bits / total bits. Pre-FEC BER is the raw link quality; post-FEC is what the MAC sees.', cat: 'data' },
    'ECN': { full: 'Explicit Congestion Notification', def: 'Switch marks the IP ECN field (CE) when a queue exceeds a threshold, so senders slow down.', cat: 'data' },
    'PFC': { full: 'Priority Flow Control (802.1Qbb)', def: 'Per-priority PAUSE frames making an Ethernet class lossless.', cat: 'data' },
    'DCQCN': { full: 'Data Center Quantized Congestion Notification', def: 'ECN-based rate control used with RoCEv2.', cat: 'data' },
    'RoCEv2': { full: 'RDMA over Converged Ethernet v2', def: 'RDMA transport over UDP/IP (dport 4791).', cat: 'data' },
    'PHV': { full: 'Packet Header Vector', def: 'Parsed header fields carried through the match-action pipeline.', cat: 'data' },
    'DWRR': { full: 'Deficit Weighted Round Robin', def: 'Scheduler that shares bandwidth between queues by byte weights.', cat: 'data' },
    'FFE': { full: 'Feed-Forward Equalizer', def: 'FIR filter that cancels pre/post-cursor ISI.', cat: 'data' },
    'DFE': { full: 'Decision-Feedback Equalizer', def: 'Subtracts post-cursor ISI using previous decisions.', cat: 'data' },
    'RED': { full: 'Random Early Detection', def: 'Mark/drop probability ramps linearly between Kmin and Kmax queue depth.', cat: 'data' },
    'IFG': { full: 'Inter-Frame Gap', def: '12 idle bytes between Ethernet frames (plus 8 B preamble/SFD).', cat: 'data' },
    'FCS': { full: 'Frame Check Sequence', def: 'CRC-32 at the end of every Ethernet frame.', cat: 'data' },
    'BTH': { full: 'Base Transport Header', def: 'InfiniBand/RoCE transport header (opcode, QP, PSN).', cat: 'data' },
    'LOS': { full: 'Loss Of Signal', def: 'Received optical power below the detection threshold.', cat: 'optics' },
    'EML': { full: 'Electro-absorption Modulated Laser', def: 'Laser + EA modulator used in many pluggable transceivers.', cat: 'optics' },
    'GBd': { full: 'Gigabaud', def: '10^9 symbols per second.', cat: 'data' },
    'CW': { full: 'Continuous Wave', def: 'Un-modulated, constant-power laser light.', cat: 'optics' },
    'UI': { full: 'Unit Interval', def: 'One symbol period (≈9.4 ps at 106.25 GBd).', cat: 'data' },
    'XOFF': { full: 'Transmit-off threshold', def: 'Buffer level at which PFC PAUSE is sent upstream (XON resumes).', cat: 'data' },
    'TM': { full: 'Traffic Manager', def: 'Admits packets into the shared buffer, queues them per port/class, applies AQM.', cat: 'data' },
    'OSFP': { full: 'Octal Small Form-factor Pluggable', def: '8-lane pluggable transceiver form factor (800G/1.6T).', cat: 'mechanical' },
    'AGC': { full: 'Automatic Gain Control', def: 'Normalises signal amplitude before slicing.', cat: 'data' }
  });

  // ------------------------------------------------------------------ physics
  const SQ2 = Math.SQRT2;
  function erfc(x) {
    const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 +
      t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }
  const Qf = x => 0.5 * erfc(x / SQ2);
  const dB = x => 10 * Math.log10(x);
  const unDB = x => Math.pow(10, x / 10);
  function berFromSnr(snr, M) {
    const x = Math.sqrt(snr) / (M - 1);
    return Math.min(0.5, 2 * (1 - 1 / M) * Qf(x) / Math.log2(M));
  }
  function snrDbFromBer(ber, M) {
    let lo = -10, hi = 70;
    for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (berFromSnr(unDB(m), M) > ber) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  const LNF = [0]; for (let i = 1; i <= 600; i++) LNF[i] = LNF[i - 1] + Math.log(i);
  const RS_N = 544, RS_K = 514, RS_T = 15, RS_M = 10;
  function fecStats(ber) {
    const ps = ber > 0 ? -Math.expm1(RS_M * Math.log1p(-Math.min(ber, 0.4999))) : 0;
    const hist = new Array(17).fill(-Infinity); // log10 P(i errors), bin 16 = ">15"
    if (ps <= 1e-300) { hist[0] = 0; return { ps: 0, pFail: 0, pAny: 0, berPost: 0, hist, mean: 0 }; }
    const lp = Math.log(ps), lq = Math.log1p(-ps);
    const lt = i => LNF[RS_N] - LNF[i] - LNF[RS_N - i] + i * lp + (RS_N - i) * lq;
    for (let i = 0; i <= RS_T; i++) hist[i] = lt(i) / Math.LN10;
    let mx = -Infinity; const terms = [];
    for (let i = RS_T + 1; i <= RS_N; i++) { const v = lt(i); terms.push(v); if (v > mx) mx = v; }
    let s = 0, si = 0;
    terms.forEach((v, j) => { const e = Math.exp(v - mx); s += e; si += e * (RS_T + 1 + j) / RS_N; });
    const lnFail = mx + Math.log(s);
    hist[16] = lnFail / Math.LN10;
    const pFail = Math.exp(lnFail);
    const berPost = Math.exp(mx + Math.log(si)) * (ber / ps);
    const pAny = -Math.expm1(RS_N * lq);
    return { ps, pFail, pAny, berPost, hist, mean: RS_N * ps };
  }

  function budget(p, nominal) {
    const cpo = p.path === 'cpo';
    const M = p.mod === 'PAM4' ? 4 : 2;
    const line = p.rate === 200 ? 212.5 : 106.25;        // Gb/s per lane incl. FEC overhead
    const baud = line / Math.log2(M);                    // GBd
    const BW = 0.55 * baud * 1e9;                        // receiver noise bandwidth (Hz)
    const laserDrop = nominal ? 0 : p.laserDrop, detK = nominal ? 0 : p.detuneK,
      extra = nominal ? 0 : p.extraLoss, xt = nominal ? -60 : p.xt;
    const delta = cpo ? 0.08 * detK : 0;                 // nm resonance drift (0.08 nm/K)
    const FWHM = 1310 / 8000;                            // loaded Q 8k → ~0.16 nm
    const eta = 1 / (1 + Math.pow(2 * delta / FWHM, 2)); // modulation-efficiency loss from detuning
    const demuxXL = cpo ? dB(1 + Math.pow(2 * delta / 0.6, 2)) : 0;
    const Plaunch = (cpo ? 6 : 0) - laserDrop;           // dBm per λ: ELS at OE input | EML launch
    const ILtx = cpo ? 4.0 + 1.0 + 1.5 : 0;              // MRM + mux + coupler
    const link = 1.0 + 0.33e-3 * p.fiberL + extra;       // connectors + fiber + injected
    const ILrx = cpo ? 1.5 + 1.0 + demuxXL : 0.5;
    const Prx = Plaunch - ILtx - link - ILrx;            // dBm average per lane
    const ER = cpo ? 4.5 : 4.0, r = unDB(ER);
    const Pavg = unDB(Prx) * 1e-3;
    const OMA = 2 * Pavg * (r - 1) / (r + 1) * eta;
    const R = 0.9, Iavg = R * Pavg, A = R * OMA / 2;
    const sTh = 16e-12 * Math.sqrt(BW);
    const sSh = Math.sqrt(2 * 1.602e-19 * Iavg * BW);
    const sRin = Iavg * Math.sqrt(unDB(-150) * BW);
    const xtEff = xt + (cpo ? demuxXL : 0);
    const sXt = A * SQ2 * Math.pow(10, xtEff / 20);
    const sig = Math.sqrt(sTh * sTh + sSh * sSh + sRin * sRin + sXt * sXt);
    const snrRx = (A * A) / (sig * sig);
    const bwPen = 15 * Math.log2(baud / 106.25);
    const snrImplDb = Math.min(40, 26 - bwPen);
    const snrHostDb = Math.min(45, (cpo ? 34 : 23.5) - bwPen);
    const snrOpt = 1 / (1 / snrRx + 1 / unDB(snrImplDb));
    const los = Prx < -15;
    const berOpt = los ? 0.5 : berFromSnr(snrOpt, M);
    const berHost = berFromSnr(unDB(snrHostDb), M);
    const ber = Math.min(0.5, berOpt + berHost);
    return { cpo, M, line, baud, BW, delta, FWHM, eta, demuxXL, Plaunch, ILtx, link, ILrx, Prx, ER, r, Pavg, OMA, R, Iavg, A,
      sTh, sSh, sRin, sXt, sig, snrRx, snrImplDb, snrHostDb, snrOpt, los, berOpt, berHost, ber, xtEff,
      xRx: Math.sqrt(snrRx) / (M - 1), xTot: Math.sqrt(snrOpt) / (M - 1), nLam: 800 / p.rate };
  }
  function physics(p) {
    const L = budget(p, false), N = budget(p, true);
    L.A0 = N.A;
    L.fec = fecStats(L.ber);
    L.snrThrDb = snrDbFromBer(2.4e-4, L.M);
    L.snrEffDb = L.ber >= 0.5 ? -10 : snrDbFromBer(Math.max(L.ber, 1e-300), L.M);
    L.margin = L.snrEffDb - L.snrThrDb;
    L.cwRate = 800e9 * (257 / 256) / (RS_K * RS_M);   // codewords/s on an 800G port
    return L;
  }

  // ------------------------------------------------------------------ stages
  // lat(p,L,q) ns, pj(p) pJ/bit.  path: both|cpo|plug.  row 0: L→R, row 1: R→L (ASIC), row 2: L→R
  const rf = p => (p.rate === 100 ? 2 : 1);
  const STAGES = [
    { id: 'src', row: 0, grp: 'host', dom: 'data', label: 'GPU / NIC\nMAC+PCS+FEC', sig: 'packet', rs: 'Packet',
      rep: 'Packet: Ethernet/RoCEv2 frame (bytes) → 64b/66b → RS(544,514) codewords',
      what: 'The NIC (e.g. a SuperNIC next to the GPU) builds a RoCEv2 frame, the MAC adds preamble/FCS, the PCS 64b/66b-encodes, transcodes to 256b/257b and the KP4 FEC encoder adds 30 parity symbols per 514. Serialization of the whole frame onto the 800G port is included here.',
      lat: (p) => 50 + p.size * 8 / 800, pj: () => 0, fail: 'Host PCIe/NIC stalls show up as idle gaps, not errors.', mon: 'NIC counters: tx_pause, ecn_marked, cnp_sent.' },
    { id: 'hser', row: 0, grp: 'host', dom: 'data', label: 'NIC SerDes TX', sig: 'tx', rs: 'PAM4 V',
      rep: 'PAM4 symbols → analog voltage with TX FFE (pre-emphasis)',
      what: 'Gray-coded bit pairs map to 4 levels; a 3–5-tap TX FFE pre-distorts transitions to fight channel ISI, and a DAC/driver launches ~0.8 Vppd onto the channel.',
      lat: () => 8, pj: () => 0, fail: 'Poor TX FFE tuning → ISI at far end; jitter → horizontal eye closure.', mon: 'Link-training adapts FFE taps; TX SNDR (SNDR ≥ ~32 dB) checked at test.' },
    { id: 'fibin', row: 0, grp: 'link', dom: 'optics', label: 'Fiber in\n(from NIC optics)', sig: 'optical', rs: 'Light',
      rep: 'Optical intensity, several λ on one fiber (O-band)',
      what: 'Light travels in single-mode fiber at ~2/3 c: ≈5 ns per metre. Attenuation at 1310 nm ≈0.33 dB/km is negligible inside a data center; connectors (~0.25–0.5 dB each) and dirt dominate.',
      lat: (p) => 5 * p.fiberL, pj: () => 0, fail: 'Dirty/damaged connector, macro-bend → extra loss → LOS or BER rise.', mon: 'RX power per lane (DDM), LOS alarm.' },
    { id: 'cplin', row: 0, grp: 'ingoe', dom: 'optics', label: 'Fiber→chip\ncoupler', sig: 'optical', rs: 'Waveguide mode',
      rep: 'Optical mode converted from 9 µm fiber core to sub-µm Si waveguide',
      what: 'An edge coupler (spot-size converter) or grating coupler matches the fiber mode to the silicon waveguide. Typical loss 1–3 dB; edge couplers are broadband and polarization-tolerant-ish, gratings are alignment-friendly.',
      lat: () => 0.01, pj: () => 0, fail: 'Misalignment / epoxy creep / thermal warp → dB-level loss drift.', mon: 'Inferred from RX power trend vs. ELS output.' },
    { id: 'demux', row: 0, grp: 'ingoe', dom: 'optics', lanes: true, label: 'WDM demux\nring filters', sig: 'spectrum', rs: 'Light per λ',
      rep: 'Optical intensity per wavelength (drop port of each ring)',
      what: 'A cascade of add-drop rings (or a ring-assisted filter) drops each wavelength to its own photodiode. Each drop ring must stay locked to its channel: heaters + monitor PD feedback track temperature (≈0.08 nm/K).',
      lat: () => 0.02, pj: () => 0, fail: 'Ring drift → drop loss + adjacent-channel crosstalk.', mon: 'Heater lock loop maximising drop-port photocurrent.' },
    { id: 'pd', row: 0, grp: 'ingoe', dom: 'data', lanes: true, label: 'Ge\nphotodiode', sig: 'current', rs: 'Photocurrent',
      rep: 'Photocurrent I = R·P (A/W × W), plus shot noise',
      what: 'A waveguide-coupled Ge PIN photodiode absorbs O-band light (responsivity ~0.9 A/W). Bandwidth >50 GHz, dark current nA-level. Shot noise √(2qIB) appears here.',
      lat: () => 0.01, pj: () => 0, fail: 'Low responsivity, capacitance limiting BW, dark-current rise with temperature.', mon: 'Average photocurrent = RX power monitor.' },
    { id: 'tia', row: 0, grp: 'ingoe', dom: 'data', lanes: true, label: 'TIA', sig: 'tia', rs: 'Analog V',
      rep: 'Analog voltage (mV) with thermal noise, BW-limited ISI',
      what: 'The transimpedance amplifier (in the EIC stacked on the PIC — very short PD–TIA connection, low capacitance) converts µA to mV. Its input-referred noise current (~10–20 pA/√Hz) usually dominates the noise budget.',
      lat: () => 0.03, pj: (p) => (p.path === 'cpo' ? 0.6 : 0.8), fail: 'Overload at high power, peaking, noise rise with temperature.', mon: 'AGC level, RSSI.' },
    { id: 'cdr', row: 0, grp: 'ingoe', dom: 'data', lanes: true, label: 'CDR / CTLE\n(linear in CPO)', sig: 'eq', rs: 'Eq. samples',
      rep: 'Equalized waveform / recovered clock; decisions in the SerDes ADC-DSP',
      what: 'In CPO the engine can be (near-)linear: a CTLE/AGC conditions the signal and the ASIC\'s ADC-DSP SerDes does clock recovery + FFE/DFE. This removes a full DSP retimer from the path — a major power/latency saving.',
      lat: (p) => (p.path === 'cpo' ? 1.5 : 3), pj: (p) => (p.path === 'cpo' ? 0.3 : 0), fail: 'CDR loses lock under large jitter/frequency offset → link down.', mon: 'CDR lock status, eye margin monitors.' },
    { id: 'retrx', row: 0, grp: 'mod', dom: 'data', lanes: true, path: 'plug', label: 'Module DSP\nretimer (RX)', sig: 'eq', rs: 'ADC→symbols',
      rep: 'ADC samples → symbols → re-launched PAM4 towards the host',
      what: 'A pluggable has a full 7 nm/5 nm DSP: ADC, CDR, FFE/DFE/MLSE, then a new SerDes TX drives the host channel. Robust, but costs ~4 pJ/b and tens of ns each way.',
      lat: () => 45, pj: () => 4.4, fail: 'DSP thermal throttling, firmware bugs.', mon: 'CMIS VDM: pre-FEC BER, SNR per lane.' },
    { id: 'pcbin', row: 0, grp: 'pcb', dom: 'data', lanes: true, path: 'plug', label: 'Host PCB trace\n+ connector', sig: 'channel', rs: 'Lossy analog',
      rep: 'Analog voltage with heavy ISI (≈20–30 dB loss @ Nyquist)',
      what: 'From the OSFP cage to the ASIC: ~8–12 inch of PCB, a cage connector, BGA and package vias. At 53 GHz Nyquist, loss and reflections close the eye completely before equalization.',
      lat: () => 1.7, pj: () => 0, fail: 'Reflections, crosstalk, connector wear.', mon: 'SerDes eye/SNR readback.' },

    { id: 'srx', row: 1, grp: 'asic', dom: 'data', label: 'SerDes RX\nADC-DSP', sig: 'symbols', rs: 'Symbols',
      rep: 'ADC samples → slicer decisions → bits',
      what: 'ADC (≈6–8 b at 1 sample/UI) + DSP: FFE (tens of taps), DFE, CDR, then PAM4 slicing and Gray decoding. In CPO the channel to the optical engine is short (substrate), so the SerDes can be simpler and lower power.',
      lat: () => 15, pj: (p) => (p.path === 'cpo' ? 0.9 : 2.2), fail: 'DFE error propagation creates error bursts (stress FEC).', mon: 'Per-lane SNR, eye height/width, pre-FEC BER.' },
    { id: 'fecd', row: 1, grp: 'asic', dom: 'data', label: 'PCS / FEC\ndecode', sig: 'fec', rs: 'RS codewords',
      rep: 'RS(544,514) codewords → 257b → 66b blocks → MAC frames',
      what: 'Lane deskew via alignment markers, then the KP4 Reed–Solomon decoder (syndromes, Berlekamp–Massey, Chien/Forney) corrects up to 15 errored 10-bit symbols per codeword. The decoder must buffer a whole codeword: this is the largest PHY latency term.',
      lat: (p) => 50 + 40 * rf(p), pj: () => 0.4, fail: '>15 symbol errors → uncorrectable CW → frame errors/link flaps.', mon: 'FEC corrected/uncorrected counters, FEC histogram bins.' },
    { id: 'parse', row: 1, grp: 'asic', dom: 'data', label: 'Parser', sig: 'header', rs: 'Header fields',
      rep: 'Packet Header Vector (PHV): parsed fields',
      what: 'A programmable state machine walks Ethernet → VLAN → IPv4/v6 → UDP → BTH and extracts fields into the PHV; the payload is written to the shared buffer in cells.',
      lat: () => 25, pj: () => 0.4, fail: 'Unknown/deep headers → punt to CPU or default action.', mon: 'Parser error counters.' },
    { id: 'lookup', row: 1, grp: 'asic', dom: 'data', label: 'Lookup /\nmatch-action', sig: 'header', rs: 'Match → action',
      rep: 'Match keys → table hits → actions (egress port, TC, rewrite)',
      what: 'Pipelined SRAM exact-match (L2 FDB), algorithmic LPM / TCAM (L3, ACL), ECMP / adaptive-routing hash. Each stage reads PHV fields and writes actions; throughput = 1 packet per clock per pipe.',
      lat: () => 110, pj: () => 1.2, fail: 'Table miss, hash polarization → elephant collisions.', mon: 'Table utilisation, drop reasons, telemetry.' },
    { id: 'tm', row: 1, grp: 'asic', dom: 'data', label: 'Traffic mgr\nshared buffer', sig: 'queue', rs: 'Buffer cells',
      rep: 'Packet descriptors + cells in on-die shared buffer',
      what: 'Admission control (dynamic thresholds), per-port/per-TC queues, RED/ECN marking, PFC XOFF/XON generation (Ethernet) or credit return (InfiniBand). Queueing delay = occupancy / drain rate.',
      lat: (p, L, q) => 40 + (q ? q.q / 100 : 0), pj: () => 1.5, fail: 'Incast → buffer exhaustion → drops (lossy) or PAUSE storms (lossless).', mon: 'Queue watermarks, ECN marks, PFC counters.' },
    { id: 'sched', row: 1, grp: 'asic', dom: 'data', label: 'Scheduler', sig: 'sched', rs: 'Queue select',
      rep: 'Queue selection: strict priority + DWRR',
      what: 'Picks which traffic class sends next on each egress port (strict priority for control, DWRR between data classes), and shapes rates.',
      lat: () => 30, pj: () => 0.3, fail: 'Starvation of low-priority classes; HOL blocking.', mon: 'Per-queue TX bytes, shaper drops.' },
    { id: 'egp', row: 1, grp: 'asic', dom: 'data', label: 'Egress\npipeline', sig: 'header', rs: 'Rewrite',
      rep: 'Rewritten headers: TTL−1, ECN CE mark, VLAN, telemetry',
      what: 'Egress match-action: header rewrite, ECN CE marking if the queue exceeded Kmin, mirroring/telemetry, then the deparser reassembles the packet from PHV + buffer.',
      lat: () => 70, pj: () => 0.6, fail: 'Mis-programmed rewrite → blackholing.', mon: 'Egress counters, INT telemetry.' },
    { id: 'fece', row: 1, grp: 'asic', dom: 'data', label: 'PCS / FEC\nencode', sig: 'pcs', rs: '66b→257b→CW',
      rep: '64b/66b → 256b/257b transcode → RS(544,514) codewords',
      what: 'MAC frames are 64b/66b encoded, 4 blocks transcoded into 257 bits, 20 × 257 b = 5140 b = 514 symbols, + 30 parity symbols → 544-symbol codeword, interleaved over the physical lanes with alignment markers.',
      lat: (p) => 20 + 10 * rf(p), pj: () => 0.2, fail: 'Rare; logic soft errors.', mon: 'PCS block lock status.' },
    { id: 'stx', row: 1, grp: 'asic', dom: 'data', lanes: true, label: 'SerDes TX', sig: 'tx', rs: 'PAM4 V',
      rep: 'PAM4 symbols → DAC → analog voltage with FFE',
      what: 'DAC-based TX with FFE. In CPO it drives a millimetre-scale substrate route into the optical engine\'s MRM driver; in a pluggable it must drive a long, lossy host channel (bigger swing, more FFE, more power).',
      lat: () => 8, pj: (p) => (p.path === 'cpo' ? 0.7 : 2.0), fail: 'PLL jitter, supply noise coupling.', mon: 'TX FIR settings, PLL lock.' },

    { id: 'pcbout', row: 2, grp: 'pcb', dom: 'data', lanes: true, path: 'plug', label: 'Host PCB trace\n+ connector', sig: 'channel', rs: 'Lossy analog',
      rep: 'Analog voltage with heavy ISI', what: 'Same long host channel in the egress direction: the electrical signal crosses the board to the front-panel cage.',
      lat: () => 1.7, pj: () => 0, fail: 'Insertion loss, reflections, crosstalk.', mon: 'Module host-side SNR (CMIS VDM).' },
    { id: 'rettx', row: 2, grp: 'mod2', dom: 'data', lanes: true, path: 'plug', label: 'Module DSP\nretimer (TX)', sig: 'eq', rs: 'ADC→symbols',
      rep: 'Host-side ADC-DSP recovers symbols, re-times and pre-distorts for the laser',
      what: 'The module DSP fully recovers the host signal, then drives the optical modulator with its own FFE and non-linearity compensation.',
      lat: () => 45, pj: () => 4.4, fail: 'DSP thermal limits, power.', mon: 'CMIS VDM.' },
    { id: 'drv', row: 2, grp: 'egoe', dom: 'data', lanes: true, label: 'Modulator\ndriver', sig: 'drive', rs: 'Drive V',
      rep: 'Drive voltage (≈1–2 Vpp) onto ring junction',
      what: 'In CPO the EIC driver sits directly above the ring (3D-stacked, µm interconnect, tiny capacitance) → very low energy per bit. Often a segmented / PAM4 DAC driver with pre-distortion for the ring\'s nonlinear transfer.',
      lat: () => 0.05, pj: (p) => (p.path === 'cpo' ? 0.5 : 1.2), fail: 'Swing compression, supply droop.', mon: 'Driver bias telemetry.' },
    { id: 'mrm', row: 2, grp: 'egoe', dom: 'optics', lanes: true, label: 'Micro-ring\nmodulator', sig: 'ring', rs: 'Modulated λ',
      rep: 'Optical intensity: CW light from ELS modulated by ring resonance shift',
      what: 'Reverse-biased PN junction in a ~5–10 µm-radius ring: voltage changes carrier density → refractive index → resonance shifts (tens of pm/V). The laser sits on the resonance slope, so the through-port intensity follows the drive. Narrow resonance (Q≈8k, FWHM≈0.16 nm) means ~1 K of uncompensated drift is already a large penalty.',
      lat: () => 0.02, pj: (p) => (p.path === 'cpo' ? 0.6 : 2.5), fail: 'Thermal drift off-resonance → OMA/ER collapse; self-heating bistability.', mon: 'Heater + monitor-PD lock loop (dither or power-tap based).' },
    { id: 'mux', row: 2, grp: 'egoe', dom: 'optics', label: 'WDM mux', sig: 'spectrum', rs: 'WDM light',
      rep: 'WDM optical: n λ multiplexed onto one waveguide/fiber',
      what: 'With rings, each modulator only touches its own wavelength, so a single bus waveguide carries all λ: modulators double as the mux. Spacing set by ring FSR and heater range.',
      lat: () => 0.01, pj: () => 0, fail: 'Inter-ring thermal crosstalk, FSR mismatch.', mon: 'Per-λ monitor taps.' },
    { id: 'cplout', row: 2, grp: 'egoe', dom: 'optics', label: 'Chip→fiber\ncoupler', sig: 'optical', rs: 'Fiber mode',
      rep: 'Optical mode into SMF; detachable fiber connector',
      what: 'Waveguide-to-fiber coupling into a detachable fiber array connector, then routed to the front panel.',
      lat: () => 0.01, pj: () => 0, fail: 'Connector contamination, mechanical stress.', mon: 'Loopback / far-end RX power.' },
    { id: 'fibout', row: 2, grp: 'link2', dom: 'optics', label: 'Fiber to\nnext hop', sig: 'optical', rs: 'Light',
      rep: 'Optical intensity in fiber (~5 ns/m)', what: 'Same propagation physics as the ingress link: about 5 ns per metre of fiber.',
      lat: (p) => 5 * p.fiberL, pj: () => 0, fail: 'Cable cut / bend / dirt.', mon: 'Far-end RX power, BER.' },
    { id: 'next', row: 2, grp: 'next', dom: 'data', label: 'Next hop\n(switch / NIC)', sig: 'packet', rs: 'Packet',
      rep: 'Packet again (after the far-end PHY decodes it)', what: 'The far end repeats the receive chain: PD → TIA → SerDes RX → FEC decode → packet. End-to-end FEC is decoded per link (802.3dj-style), so each hop adds its PHY latency.',
      lat: () => 0, pj: () => 0, fail: '—', mon: '—' }
  ];
  const ELS = { id: 'els', grp: 'egoe', dom: 'optics', label: 'External laser\nsource (CW)', sig: 'cw', rs: 'CW light', path: 'cpo',
    rep: 'Continuous-wave light, one line per λ (no data)',
    what: 'NVIDIA uses front-panel, serviceable external laser sources: CW lasers sit away from the hot ASIC and feed the engines over fiber; one laser can be split to several modulators (4× fewer lasers claimed ' + 'vs pluggables). Laser power drop (aging, connector) lowers every downstream OMA.',
    lat: () => 0, pj: () => 1.4, fail: 'Laser aging, connector dirt, back-reflection → power drop / RIN.', mon: 'APC loop on laser bias, monitor PD, ELS telemetry.' };
  const ALL = STAGES.concat([ELS]);
  const BYID = {}; ALL.forEach(s => { BYID[s.id] = s; });
  const GROUPS = {
    host: () => 'Host: GPU / NIC', link: () => 'Fiber link', link2: () => 'Fiber link',
    ingoe: p => (p.path === 'cpo' ? 'Ingress optical engine (CPO, EIC-on-PIC)' : 'Pluggable module (RX optics)'),
    mod: () => 'Pluggable DSP', pcb: () => 'Host PCB', mod2: () => 'Pluggable DSP',
    asic: () => 'Switch ASIC (port-to-port pipeline)',
    egoe: p => (p.path === 'cpo' ? 'Egress optical engine (CPO)' : 'Pluggable module (TX optics)'),
    next: () => 'Next hop'
  };
  const PATH_LABEL = { mrm: { plug: 'EML / MZM\nmodulator' }, cdr: { plug: 'CDR / CTLE' } };
  const labelOf = (s, p) => (PATH_LABEL[s.id] && PATH_LABEL[s.id][p.path]) || s.label;
  const LAMC = ['#ff4d4d', '#ff9a1f', '#ffd23f', '#ff5cc8', '#ff6b3d', '#ffb37a', '#e2405f', '#ffe08a'];
  const SPU = 16;               // samples per UI for scope waveforms

  // ------------------------------------------------------------------ render
  function render(root) {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const st = { playing: true, speed: reduce ? 0.4 : 1, gran: 'packet', load: 0.7, size: 4096, rate: 200, mod: 'PAM4',
      path: 'cpo', fc: 'pfc', cc: true, fiberL: 30, laserDrop: 0, detuneK: 0, extraLoss: 0, xt: -40, sel: 'cdr' };
    let L = physics(st);
    const css = getComputedStyle(document.documentElement);
    const col = n => (css.getPropertyValue('--' + n) || '').trim() || '#22d3ee';
    const COL = { data: col('data'), optic: col('optic'), accent: col('accent'), warn: col('warn'), bad: col('bad'), good: col('good'),
      violet: col('violet'), power: col('power'), muted: col('muted'), line: col('line'), text: col('text'), panel: col('panel'), panel2: col('panel2'), bg: col('bg') };
    const cleanups = [];
    const h = C.h;

    // ---------- DOM skeleton
    root.classList.add('df-root');
    root.appendChild(h('h1', null, '⚡ Data-Flow Simulator'));
    root.appendChild(h('p', { class: 'h-sub', html: 'Follow a packet — and the bits, symbols, volts, photons and electrons it becomes — through a co-packaged-optics switch, in real time. Click any stage for its physics, latency, energy and a live oscilloscope probe. Inject impairments and watch the ' + C.tip('BER') + ', ' + C.tip('FEC') + ' counters and link state react. All numbers are ' + C.badge('typ') + ' unless marked.' }));

    const ctlCard = h('div', { class: 'card df-controls' });
    const stageCard = h('div', { class: 'card df-stagecard' });
    const mainCv = h('canvas', { class: 'df-main' });
    const linkBanner = h('div', { class: 'df-banner' });
    stageCard.appendChild(h('div', { class: 'df-legend' },
      h('span', null, h('i', { class: 'df-sw', style: { background: COL.data } }), 'electrical data'),
      h('span', null, h('i', { class: 'df-sw df-sw-l' }), 'light (false colour per λ)'),
      h('span', null, h('i', { class: 'df-sw', style: { background: COL.warn } }), 'ECN-marked'),
      h('span', null, h('i', { class: 'df-sw', style: { background: COL.violet } }), 'PFC pause / credit'),
      h('span', null, h('i', { class: 'df-sw', style: { background: COL.bad } }), 'drop / error'),
      h('span', { class: 'muted' }, 'click a stage ↓')));
    const cvWrap = h('div', { class: 'df-cvwrap' }, mainCv, linkBanner);
    stageCard.appendChild(cvWrap);

    const scopeCv = h('canvas', { class: 'df-scope' });
    const eyeCv = h('canvas', { class: 'df-eye' });
    const scopeTitle = h('div', { class: 'df-scope-title' });
    const chainEl = h('div', { class: 'df-chain' });
    const scopeCard = h('div', { class: 'card df-scopecard' },
      h('div', { class: 'df-cardhead' }, h('b', null, 'Oscilloscope probe'), scopeTitle),
      h('div', { class: 'df-scopes' }, h('div', { class: 'df-scopebox' }, scopeCv), h('div', { class: 'df-eyebox' }, eyeCv)),
      chainEl);
    const detail = h('div', { class: 'card df-detail' });

    const kpiRow = h('div', { class: 'df-kpis' });
    const latBar = h('div', { class: 'df-stack' }), latLeg = h('div', { class: 'df-stackleg' });
    const pjBar = h('div', { class: 'df-stack' }), pjLeg = h('div', { class: 'df-stackleg' });
    const bufCv = h('canvas', { class: 'df-buf' });
    const fecBox = h('div', { class: 'df-fecbox' });
    const metrics = h('div', { class: 'card df-metrics' },
      h('div', { class: 'df-cardhead' }, h('b', null, 'Live metrics'), h('span', { class: 'muted', html: ' 800G port · ' + C.badge('typ') })),
      kpiRow,
      h('div', { class: 'grid2' },
        h('div', null, h('h3', null, 'End-to-end latency breakdown (ns)'), latBar, latLeg),
        h('div', null, h('h3', null, 'Energy per bit through the switch (pJ/b)'), pjBar, pjLeg)),
      h('div', { class: 'grid2' },
        h('div', null, h('h3', null, 'Buffer occupancy (egress queue, TC3 RoCE)'), bufCv),
        h('div', null, h('h3', null, 'FEC & link counters'), fecBox)));

    const howVals = h('div', { class: 'df-howvals no-tip' });
    const berCv = h('canvas', { class: 'df-bercv' });
    const how = h('details', { class: 'card df-how' },
      h('summary', null, h('b', null, 'How this is computed'), h('span', { class: 'muted' }, ' — link budget → SNR → SER/BER → RS(544,514) statistics')),
      h('div', { class: 'grid2' },
        h('div', { html:
          '<div class="eq">P_rx [dBm] = P_laser − IL_tx(MRM 4 + mux 1 + coupler 1.5) − (connectors 1 + 0.33 dB/km·L + extra) − IL_rx(coupler 1.5 + demux 1 + Δdemux)\n' +
          'OMA = 2·P_avg·(r−1)/(r+1) · η(δ),   r = 10^(ER/10),   η = 1 / (1 + (2δ/FWHM)²),   δ = 0.08 nm/K · ΔT\n' +
          'A = R·OMA/2   (peak photocurrent swing, R = 0.9 A/W)\n' +
          'σ² = σ_th² + σ_shot² + σ_RIN² + σ_xt²\n' +
          '   σ_th = 16 pA/√Hz·√B,  σ_shot = √(2q·I_avg·B),  σ_RIN = I_avg·√(RIN·B), RIN = −150 dB/Hz\n' +
          '   σ_xt = √2·A·10^(XT/20),  B = 0.55 × baud\n' +
          'SNR_rx = (A/σ)²   →   SNR = 1 / (1/SNR_rx + 1/SNR_impl)   (SNR_impl: residual ISI, jitter, ADC/DSP ≈ 26 dB @106 GBd)\n' +
          'SER ≈ 2(1 − 1/M) · Q( √SNR / (M−1) )      Q(x) = ½·erfc(x/√2),  M = 4 (PAM4) or 2 (NRZ)\n' +
          'BER ≈ SER / log2(M)  (Gray coding)     pre-FEC BER = BER_optical + BER_host-electrical\n' +
          'p_s = 1 − (1 − BER)^10     (10-bit RS symbol, random errors)\n' +
          'P(i errors in CW) = C(544,i)·p_s^i·(1−p_s)^(544−i);   P_uncorr = Σ_{i≥16} P(i)\n' +
          'post-FEC BER ≈ (BER/p_s)·Σ_{i≥16} (i/544)·P(i)\n' +
          'FEC margin [dB] = SNR_eff(BER) − SNR at the KP4 threshold BER 2.4e-4</div>' +
          '<p class="muted">The SNR used is the peak-amplitude definition: with levels ±1, ±3 and noise σ the half eye opening is 1, so the Q-argument is 1/σ = √SNR/(M−1). Equivalent average-power form: SER = 2(1−1/M)·Q(√(3·SNR_avg/(M²−1))). Real links also see error bursts (DFE propagation) that make FEC behave worse than this independent-error model — 802.3dj adds an inner code for that.</p>' }),
        h('div', null, berCv, howVals)));

    root.appendChild(ctlCard);
    root.appendChild(stageCard);
    root.appendChild(h('div', { class: 'df-lower' }, scopeCard, detail));
    root.appendChild(metrics);
    root.appendChild(how);

    // ---------- controls
    function seg(label, key, opts, onchg) {
      const wrap = h('div', { class: 'df-seg' }, h('span', { class: 'df-seglbl' }, label));
      const btns = opts.map(([v, t]) => {
        const b = h('button', { class: 'btn df-segbtn' + (st[key] === v ? ' active' : ''), onclick: () => {
          st[key] = v; btns.forEach(x => x.classList.toggle('active', x === b)); onchg && onchg(); paramsChanged();
        } }, t);
        return b;
      });
      btns.forEach(b => wrap.appendChild(b));
      wrap._sync = () => btns.forEach((b, i) => b.classList.toggle('active', st[key] === opts[i][0]));
      return wrap;
    }
    const sliders = {};
    function slider(label, key, min, max, step, fmtv, cls) {
      const out = h('output');
      const inp = h('input', { type: 'range', min, max, step, value: st[key] });
      const set = () => { out.textContent = fmtv(st[key]); };
      inp.addEventListener('input', () => { st[key] = +inp.value; set(); paramsChanged(); });
      set();
      sliders[key] = { inp, set };
      return h('div', { class: 'slider-row ' + (cls || '') }, h('label', null, label), inp, out);
    }
    const playBtn = h('button', { class: 'btn primary df-play', onclick: () => { st.playing = !st.playing; playBtn.textContent = st.playing ? '❚❚ Pause' : '▶ Play'; } }, '❚❚ Pause');
    const speedIn = h('input', { type: 'range', min: -1.3, max: 0.6, step: 0.01, value: Math.log10(st.speed) });
    const speedOut = h('output');
    const setSpeed = () => { st.speed = Math.pow(10, +speedIn.value); speedOut.textContent = st.speed.toFixed(st.speed < 1 ? 2 : 1) + '×'; };
    speedIn.addEventListener('input', setSpeed); setSpeed();
    const segs = [
      seg('View', 'gran', [['packet', 'Packets'], ['symbol', 'Symbols (slow-mo)']], () => { particles.length = 0; }),
      seg('Lane rate', 'rate', [[100, '100G'], [200, '200G']]),
      seg('Modulation', 'mod', [['PAM4', 'PAM4'], ['NRZ', 'NRZ']]),
      seg('Optics', 'path', [['cpo', 'CPO'], ['plug', 'Pluggable']], () => { relayout(); }),
      seg('Flow ctrl', 'fc', [['pfc', 'PFC'], ['credit', 'IB credit'], ['none', 'None (lossy)']]),
      seg('ECN / CC', 'cc', [[true, 'On'], [false, 'Off']])
    ];
    const sizeSel = h('select', { onchange: () => { st.size = +sizeSel.value; paramsChanged(); } },
      [64, 256, 1024, 4096, 9000].map(v => h('option', { value: v, selected: v === st.size }, v + ' B')));
    const presets = [
      ['Healthy', { laserDrop: 0, detuneK: 0, extraLoss: 0, xt: -40, load: 0.7 }],
      ['Incast 140%', { load: 1.4 }],
      ['Laser aging −3 dB', { laserDrop: 3 }],
      ['Ring lock lost +1.2 K', { detuneK: 1.2 }],
      ['Dirty connector +6 dB', { extraLoss: 6 }],
      ['WDM crosstalk −25 dB', { xt: -25 }]
    ].map(([n, o]) => h('button', { class: 'btn df-preset', onclick: () => { Object.assign(st, o); syncControls(); paramsChanged(); } }, n));
    ctlCard.appendChild(h('div', { class: 'df-ctlgrid' },
      h('div', { class: 'df-ctlcol' },
        h('div', { class: 'df-ctltitle' }, 'Simulation'),
        h('div', { class: 'df-row' }, playBtn, h('button', { class: 'btn', onclick: resetCounters }, '↺ Reset counters')),
        h('div', { class: 'slider-row' }, h('label', null, 'Speed'), speedIn, speedOut),
        segs[0],
        h('div', { class: 'df-ctltitle' }, 'Traffic'),
        slider('Offered load', 'load', 0.05, 1.6, 0.01, v => Math.round(v * 100) + ' %'),
        h('div', { class: 'df-row' }, h('span', { class: 'df-seglbl' }, 'Packet size'), sizeSel),
        segs[4], segs[5]),
      h('div', { class: 'df-ctlcol' },
        h('div', { class: 'df-ctltitle' }, 'Physical layer'),
        segs[1], segs[2], segs[3],
        slider('Fiber length / hop', 'fiberL', 1, 500, 1, v => v + ' m'),
        h('div', { class: 'df-plugnote', html: 'Pluggable adds a module DSP retimer + long host PCB trace in each direction. NVIDIA claims ' + C.badge('nv') + ' 3.5× power efficiency and 63× signal integrity for its photonics switches vs pluggables.' })),
      h('div', { class: 'df-ctlcol df-imp' },
        h('div', { class: 'df-ctltitle' }, 'Inject impairments'),
        slider('Laser power drop', 'laserDrop', 0, 8, 0.1, v => '−' + v.toFixed(1) + ' dB'),
        slider('Ring detuning ΔT (uncompensated)', 'detuneK', 0, 2.5, 0.05, v => '+' + v.toFixed(2) + ' K'),
        slider('Extra fiber/connector loss', 'extraLoss', 0, 12, 0.1, v => v.toFixed(1) + ' dB'),
        slider('Crosstalk (adjacent λ / lane)', 'xt', -45, -12, 0.5, v => v.toFixed(1) + ' dB'),
        h('div', { class: 'df-presets' }, presets))));
    function syncControls() {
      for (const k in sliders) { sliders[k].inp.value = st[k]; sliders[k].set(); }
      segs.forEach(s => s._sync());
    }

    // ---------- link / queue model state
    const BUF = 1.5e6, KMIN = 50e3, KMAX = 300e3, PMAX = 0.2, XOFF = 600e3, XON = 450e3, CREDIT = 800e3, MU = 1e5; // bytes, B/µs
    const q = { q: 0, paused: false, rcc: 1, burstOn: false, burstT: 2, pm: 0, thr: 0, served: 0, drops: 0, ecn: 0, pfc: 0, dropFlag: 0, lam: 0 };
    const lk = { up: true, downT: 0, badT: 0, flaps: 0, corr: 0, unc: 0, cw: 0, linkTime: 0, lastCwErr: 0 };
    const qHist = [];
    function resetCounters() { lk.flaps = lk.corr = lk.unc = lk.cw = lk.linkTime = 0; q.drops = q.ecn = q.pfc = 0; }
    function poisson(lam) {
      if (lam <= 0) return 0;
      if (lam > 30) return Math.max(0, Math.round(lam + Math.sqrt(lam) * C.randn()));
      let k = 0, p = Math.exp(-lam), s = p; const u = Math.random();
      while (u > s && k < 200) { k++; p *= lam / k; s += p; }
      return k;
    }
    function stepQueue(dtUs) {
      const n = Math.max(1, Math.ceil(dtUs / 0.1)), d = dtUs / n;
      let served = 0;
      for (let i = 0; i < n; i++) {
        q.burstT -= d;
        if (q.burstT <= 0) { q.burstOn = !q.burstOn; q.burstT = -Math.log(Math.random() + 1e-9) * (q.burstOn ? 2.5 : 3.5); }
        const bf = q.burstOn ? 1.55 : 0.6;
        let lam = st.load * MU * bf * (st.cc ? q.rcc : 1);
        if (st.fc === 'pfc') {
          if (q.q > XOFF && !q.paused) { q.paused = true; q.pfc++; }
          else if (q.q < XON) q.paused = false;
          if (q.paused) lam = 0;
        } else q.paused = false;
        if (st.fc === 'credit') lam *= C.clamp((CREDIT - q.q) / (0.3 * CREDIT), 0, 1);
        if (!lk.up) lam = 0;
        const out = lk.up ? Math.min(q.q + lam * d, MU * d) : 0;
        q.q += lam * d - out; served += out;
        if (q.q > BUF) { q.drops += (q.q - BUF) / st.size; q.q = BUF; q.dropFlag = 1; }
        const pm = q.q <= KMIN ? 0 : q.q >= KMAX ? 1 : PMAX * (q.q - KMIN) / (KMAX - KMIN);
        q.pm = pm;
        q.ecn += st.cc ? pm * out / st.size : 0;
        if (st.cc) { if (pm > 0) q.rcc *= Math.exp(-pm * d / 4); q.rcc += (1 - q.rcc) * d / 60; q.rcc = C.clamp(q.rcc, 0.05, 1); }
        else q.rcc = 1;
        q.lam = lam;
      }
      const eff = st.size / (st.size + 20);
      const inst = served / dtUs * 8e-3 * eff; // Gb/s goodput
      q.thr += (inst - q.thr) * Math.min(1, dtUs / 3);
    }
    function stepLink(dt) {
      // dt = real seconds (counters run in real link time)
      const f = L.fec;
      const bad = L.los || L.ber > 2e-3 || f.pFail > 1e-4;
      if (lk.up) {
        lk.linkTime += dt;
        const ncw = L.cwRate * dt; lk.cw += ncw;
        const u = poisson(ncw * f.pFail), c = poisson(ncw * Math.max(0, f.pAny - f.pFail));
        lk.unc += u; lk.corr += c;
        if (u || c) lk.lastCwErr = performance.now();
        if (bad) { lk.badT += dt; if (lk.badT > 0.45) { lk.up = false; lk.downT = 1.4; lk.flaps++; lk.badT = 0; } }
        else lk.badT = Math.max(0, lk.badT - dt);
      } else {
        lk.downT -= dt;
        if (lk.downT <= 0) { lk.up = true; lk.badT = 0; }
      }
    }

    // ---------- main canvas layout
    let W = 0, H = 0, dpr = 1, nodes = [], segsP = [], sidx = {}, needFit = true;
    const ctx = mainCv.getContext('2d'), sctx = scopeCv.getContext('2d'), ectx = eyeCv.getContext('2d'),
      bctx = bufCv.getContext('2d'), rctx = berCv.getContext('2d');
    const active = () => STAGES.filter(s => !s.path || s.path === st.path);
    function fitCanvas(cv, c2, hgt) {
      const r = cv.getBoundingClientRect();
      const w = Math.max(200, Math.floor(r.width));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.floor(w * dpr); cv.height = Math.floor(hgt * dpr); cv.style.height = hgt + 'px';
      c2.setTransform(dpr, 0, 0, dpr, 0, 0);
      return w;
    }
    function relayout() {
      W = fitCanvas(mainCv, ctx, 520); H = 520;
      const act = active();
      const rows = [0, 1, 2].map(r => act.filter(s => s.row === r));
      const ys = [78, 238, 398];
      nodes = []; sidx = {};
      const mx = 46;
      rows.forEach((rw, r) => {
        const n = rw.length, span = (W - 2 * mx) / n;
        const w = Math.min(122, span - 12);
        rw.forEach((s, i) => {
          const k = r === 1 ? n - 1 - i : i;
          nodes.push({ s, x: mx + (k + 0.5) * span, y: ys[r], w, h: 50, row: r });
        });
      });
      nodes.sort((a, b) => act.indexOf(a.s) - act.indexOf(b.s));
      nodes.forEach((n, i) => { sidx[n.s.id] = i; });
      if (st.path === 'cpo') {
        const m = nodes[sidx.mrm];
        nodes.push({ s: ELS, x: m.x, y: 482, w: m.w + 10, h: 40, row: 3, els: true });
      }
      segsP = [];
      for (let i = 0; i < act.length - 1; i++) {
        const a = nodes[i], b = nodes[i + 1];
        let pts;
        if (a.row === b.row) pts = [[a.x, a.y], [b.x, b.y]];
        else if (a.row === 0) pts = [[a.x, a.y], [W - 16, a.y], [W - 16, b.y], [b.x, b.y]];
        else pts = [[a.x, a.y], [16, a.y], [16, b.y], [b.x, b.y]];
        const lens = []; let tot = 0;
        for (let j = 1; j < pts.length; j++) { const l = Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]); lens.push(l); tot += l; }
        segsP.push({ pts, lens, len: tot });
      }
      particles.forEach(p => { p.i = sidx[p.sid]; if (p.i == null || p.i >= segsP.length) p.dead = true; else p.d = Math.min(p.d, segsP[p.i].len); });
      ctl.forEach(p => { p.i = sidx[p.sid]; if (p.i == null || p.i >= segsP.length) p.dead = true; else p.d = Math.min(p.d, segsP[p.i].len); });
      if (!BYID[st.sel] || (BYID[st.sel].path && BYID[st.sel].path !== st.path)) select('cdr');
    }
    function posOn(i, d) {
      const sg = segsP[i]; let rem = d;
      for (let j = 0; j < sg.lens.length; j++) {
        if (rem <= sg.lens[j] || j === sg.lens.length - 1) {
          const t = sg.lens[j] ? C.clamp(rem / sg.lens[j], 0, 1) : 0, a = sg.pts[j], b = sg.pts[j + 1];
          return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[1] - a[1], b[0] - a[0])];
        }
        rem -= sg.lens[j];
      }
      return sg.pts[0];
    }

    // glow sprites
    const sprites = {};
    function sprite(c) {
      if (sprites[c]) return sprites[c];
      const s = document.createElement('canvas'); s.width = s.height = 48;
      const g = s.getContext('2d'), gr = g.createRadialGradient(24, 24, 0, 24, 24, 24);
      gr.addColorStop(0, c); gr.addColorStop(0.25, c); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = 0.9; g.fillStyle = gr; g.fillRect(0, 0, 48, 48);
      return (sprites[c] = s);
    }

    // ---------- particles
    const particles = [], ctl = [];
    let spawnAcc = 0, ctlAcc = 0, elsPh = 0;
    function spawn() {
      const sym = st.gran === 'symbol';
      particles.push({ i: 0, sid: nodes[0].s.id, d: 0, hold: 0, lane: (Math.random() * L.nLam) | 0, lvl: (Math.random() * L.M) | 0,
        len: sym ? 0 : C.clamp(4 + Math.log2(st.size) * 2, 8, 30), ecn: false, drop: false, err: false, age: 0 });
    }
    function arrive(p) {
      const s = nodes[p.i] && nodes[p.i].s; if (!s) return;
      const sym = st.gran === 'symbol';
      if (s.id === 'tm' && !sym) {
        p.hold = 0.12 + 2.2 * Math.min(1, q.q / XOFF);
        if (st.cc && Math.random() < q.pm) p.ecn = true;
        if (st.fc === 'none' && q.q > BUF * 0.97 && Math.random() < 0.5) p.drop = true;
      }
      if (s.id === 'fecd' && !sym) p.hold = 0.12;
      if (s.id === 'srx' && Math.random() < Math.min(0.5, L.ber * (sym ? 1 : 2000))) p.err = true;
      if (s.id === 'fecd' && p.err && L.fec.pFail < 1e-3) p.err = false; // corrected
    }
    function stepParticles(dt) {
      const sym = st.gran === 'symbol';
      const v = (sym ? 55 : 150) * st.speed;
      const rate = (sym ? 26 : 3 + 9 * Math.min(1.6, st.load * (st.cc ? q.rcc : 1))) * st.speed;
      const creditF = st.fc === 'credit' && !sym ? C.clamp((CREDIT - q.q) / (0.3 * CREDIT), 0, 1) : 1;
      if (lk.up && !(q.paused && st.fc === 'pfc' && !sym)) spawnAcc += dt * rate * creditF;
      while (spawnAcc >= 1 && particles.length < 260) { spawn(); spawnAcc -= 1; }
      if (spawnAcc > 3) spawnAcc = 0;
      for (const p of particles) {
        if (p.dead) continue;
        p.age += dt;
        if (p.drop) { p.fade = (p.fade || 1) - dt * 1.5; if (p.fade <= 0) p.dead = true; continue; }
        if (p.hold > 0) { p.hold -= dt * st.speed; continue; }
        p.d += v * dt;
        while (!p.dead && p.d >= segsP[p.i].len) {
          p.d -= segsP[p.i].len; p.i++;
          if (p.i >= segsP.length) { p.dead = true; break; }
          p.sid = nodes[p.i].s.id; arrive(p);
          if (p.hold > 0) { p.d = 0; break; }
        }
      }
      // control (PFC pause / credits) travelling upstream from TM
      const tmI = sidx.tm;
      if (!sym && tmI != null) {
        if (st.fc === 'pfc' && q.paused) ctlAcc += dt * 3 * st.speed;
        if (st.fc === 'credit') ctlAcc += dt * 4 * st.speed;
        while (ctlAcc >= 1) { ctl.push({ i: tmI - 1, sid: nodes[tmI - 1].s.id, d: segsP[tmI - 1].len, kind: st.fc }); ctlAcc -= 1; }
      }
      for (const c of ctl) {
        if (c.dead) continue;
        c.d -= v * 1.4 * dt;
        while (c.d < 0) { c.i--; if (c.i < 0) { c.dead = true; break; } c.sid = nodes[c.i].s.id; c.d += segsP[c.i].len; }
      }
      for (let i = particles.length - 1; i >= 0; i--) if (particles[i].dead) particles.splice(i, 1);
      for (let i = ctl.length - 1; i >= 0; i--) if (ctl[i].dead) ctl.splice(i, 1);
    }

    // ---------- main draw
    function rr(c, x, y, w, hh, r) {
      c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + hh, r); c.arcTo(x + w, y + hh, x, y + hh, r);
      c.arcTo(x, y + hh, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
    }
    let hover = null;
    function nodeAt(mx, my) { return nodes.find(n => Math.abs(mx - n.x) <= n.w / 2 && Math.abs(my - n.y) <= n.h / 2) || null; }
    function lamCol(l) { return LAMC[l % LAMC.length]; }
    function drawMain(t) {
      const c = ctx;
      c.clearRect(0, 0, W, H);
      // groups
      const groups = [];
      nodes.forEach(n => {
        if (n.els) return;
        const g = groups.find(x => x.grp === n.s.grp && x.row === n.row && x.last === nodes.indexOf(n) - 1);
        if (g) { g.x0 = Math.min(g.x0, n.x - n.w / 2); g.x1 = Math.max(g.x1, n.x + n.w / 2); g.last = nodes.indexOf(n); }
        else groups.push({ grp: n.s.grp, row: n.row, x0: n.x - n.w / 2, x1: n.x + n.w / 2, y: n.y, last: nodes.indexOf(n) });
      });
      groups.forEach(g => {
        const opt = g.grp === 'ingoe' || g.grp === 'egoe' || g.grp === 'link' || g.grp === 'link2';
        const asic = g.grp === 'asic';
        const pad = 7, y0 = g.y - 46, hh = 82 + (g.grp === 'egoe' && st.path === 'cpo' ? 74 : 0);
        rr(c, g.x0 - pad, y0, g.x1 - g.x0 + 2 * pad, hh, 10);
        c.fillStyle = asic ? 'rgba(118,185,0,0.06)' : opt ? 'rgba(255,107,61,0.05)' : 'rgba(34,211,238,0.04)';
        c.fill();
        c.setLineDash([4, 4]); c.strokeStyle = asic ? 'rgba(118,185,0,0.45)' : opt ? 'rgba(255,107,61,0.4)' : 'rgba(138,153,173,0.35)';
        c.lineWidth = 1; c.stroke(); c.setLineDash([]);
        c.fillStyle = asic ? COL.accent : opt ? COL.optic : COL.muted;
        c.font = '600 10.5px "Segoe UI", sans-serif'; c.textAlign = 'left';
        c.fillText(GROUPS[g.grp](st).toUpperCase(), g.x0 - pad + 8, y0 + 12);
      });
      // track
      segsP.forEach((sg, i) => {
        const optical = nodes[i].s.dom === 'optics';
        c.beginPath(); c.moveTo(sg.pts[0][0], sg.pts[0][1]);
        for (let j = 1; j < sg.pts.length; j++) c.lineTo(sg.pts[j][0], sg.pts[j][1]);
        c.strokeStyle = optical ? 'rgba(255,107,61,' + (0.35 * dimFiber(i)) + ')' : 'rgba(34,211,238,0.22)';
        c.lineWidth = optical ? 3 : 2; c.stroke();
      });
      // ELS feed
      if (st.path === 'cpo') {
        const e = nodes[nodes.length - 1], m = nodes[sidx.mrm];
        const alpha = Math.pow(10, -st.laserDrop / 10);
        c.strokeStyle = 'rgba(255,107,61,' + (0.25 + 0.4 * alpha) + ')'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(e.x, e.y - e.h / 2); c.lineTo(m.x, m.y + m.h / 2); c.stroke();
        c.globalCompositeOperation = 'lighter';
        const len = (e.y - e.h / 2) - (m.y + m.h / 2);
        for (let k = 0; k < 7; k++) {
          const f = ((elsPh * 0.9 + k / 7) % 1);
          const y = e.y - e.h / 2 - f * len;
          c.globalAlpha = 0.25 + 0.75 * alpha;
          c.drawImage(sprite(lamCol(k % L.nLam)), m.x - 9 + (k % 3 - 1) * 3, y - 9, 18, 18);
        }
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      }
      // nodes
      c.textAlign = 'center';
      nodes.forEach(n => {
        const s = n.s, sel = st.sel === s.id, hov = hover === n;
        const dc = s.dom === 'optics' ? COL.optic : COL.data;
        const x = n.x - n.w / 2, y = n.y - n.h / 2;
        if (sel) {
          c.save(); c.shadowColor = COL.accent; c.shadowBlur = 16 + 6 * Math.sin(t * 4);
          rr(c, x - 2, y - 2, n.w + 4, n.h + 4, 10); c.strokeStyle = COL.accent; c.lineWidth = 2; c.stroke(); c.restore();
        }
        rr(c, x, y, n.w, n.h, 8);
        const gr = c.createLinearGradient(0, y, 0, y + n.h);
        gr.addColorStop(0, hov ? '#1f2b3b' : '#162030'); gr.addColorStop(1, '#0c121a');
        c.fillStyle = gr; c.fill();
        c.strokeStyle = sel ? COL.accent : dc; c.globalAlpha = sel ? 1 : 0.65; c.lineWidth = 1.2; c.stroke(); c.globalAlpha = 1;
        c.fillStyle = dc; c.fillRect(x + 8, y + 1, n.w - 16, 2);
        // status tint
        let warn = false;
        if (s.id === 'tm' && q.q > KMIN) warn = true;
        if ((s.id === 'mrm' || s.id === 'demux') && st.detuneK > 0.3 && st.path === 'cpo') warn = true;
        if (s.id === 'els' && st.laserDrop > 1.5) warn = true;
        if ((s.id === 'fibin' || s.id === 'fibout') && st.extraLoss > 2) warn = true;
        if (s.id === 'fecd' && L.fec.pFail > 1e-12) warn = true;
        if (warn) { c.fillStyle = 'rgba(245,179,1,' + (0.5 + 0.4 * Math.sin(t * 6)) + ')'; c.beginPath(); c.arc(x + n.w - 8, y + 9, 3.5, 0, 7); c.fill(); }
        c.fillStyle = COL.text; c.font = '600 11px "Segoe UI", sans-serif';
        const lines = labelOf(s, st).split('\n');
        lines.forEach((ln, k) => c.fillText(ln, n.x, n.y - (lines.length - 1) * 6.5 + k * 13 + 1, n.w - 6));
        // latency under node
        const lat = s.lat(st, L, q);
        c.font = '10px ' + 'Consolas, monospace'; c.fillStyle = COL.muted;
        c.fillText(fmtNs(lat), n.x, n.y + n.h / 2 + 12);
        if (s.id === 'tm') { // buffer gauge
          const f = Math.min(1, q.q / XOFF);
          c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(x + 4, y + n.h - 7, n.w - 8, 4);
          c.fillStyle = f > 0.75 ? COL.bad : f > KMIN / XOFF ? COL.warn : COL.good; c.fillRect(x + 4, y + n.h - 7, (n.w - 8) * f, 4);
        }
        if (s.id === 'mrm' && st.path === 'cpo' && st.detuneK > 0) {
          c.fillStyle = COL.warn; c.font = '10px Consolas, monospace';
          c.fillText('Δλ +' + (L.delta * 1000).toFixed(0) + ' pm', n.x, y - 5);
        }
      });
      // particles
      c.globalCompositeOperation = 'lighter';
      const sym = st.gran === 'symbol';
      for (const p of particles) {
        if (p.i >= segsP.length) continue;
        const pos = posOn(p.i, p.d);
        const s = nodes[p.i].s, optical = s.dom === 'optics';
        let x = pos[0], y = pos[1];
        if (s.lanes || (nodes[p.i + 1] && nodes[p.i + 1].s.lanes && s.id !== 'cplin')) {
          const off = (p.lane - (L.nLam - 1) / 2) * (L.nLam > 4 ? 3 : 5);
          const ang = pos[2]; x += -Math.sin(ang) * off; y += Math.cos(ang) * off;
        }
        let colr = optical ? lamCol(p.lane) : COL.data;
        if (p.ecn) colr = COL.warn;
        if (p.err || p.drop) colr = COL.bad;
        let a = p.drop ? Math.max(0, p.fade) : 1;
        if (optical) a *= dimFiber(p.i);
        if (sym) a *= 0.35 + 0.65 * (p.lvl + 1) / L.M;
        c.globalAlpha = a;
        const sz = sym ? 10 : 18;
        c.drawImage(sprite(colr), x - sz / 2, y - sz / 2, sz, sz);
        if (!sym) {
          c.save(); c.translate(x, y); c.rotate(pos[2]);
          c.fillStyle = colr; c.globalAlpha = a * 0.9;
          rr(c, -p.len / 2, -2.2, p.len, 4.4, 2.2); c.fill();
          c.restore();
        } else {
          c.fillStyle = '#fff'; c.globalAlpha = a * 0.7; c.fillRect(x - 1, y - 1, 2, 2);
          if (st.speed < 0.25) { c.globalCompositeOperation = 'source-over'; c.fillStyle = colr; c.font = '9px Consolas, monospace'; c.fillText(String(p.lvl), x, y - 6); c.globalCompositeOperation = 'lighter'; }
        }
        if (p.drop) { c.globalCompositeOperation = 'source-over'; c.strokeStyle = COL.bad; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 5, y - 5); c.lineTo(x + 5, y + 5); c.moveTo(x + 5, y - 5); c.lineTo(x - 5, y + 5); c.stroke(); c.globalCompositeOperation = 'lighter'; }
      }
      for (const k of ctl) {
        if (k.i < 0 || k.i >= segsP.length) continue;
        const pos = posOn(k.i, k.d);
        c.globalAlpha = 0.9; c.drawImage(sprite(COL.violet), pos[0] - 8, pos[1] - 14, 16, 16);
      }
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      for (const k of ctl) {
        if (k.kind !== 'pfc' || k.i < 0 || k.i >= segsP.length) continue;
        const pos = posOn(k.i, k.d); c.fillStyle = COL.violet; c.font = '700 8px Consolas, monospace'; c.fillText('PAUSE', pos[0], pos[1] - 13);
      }
      if (q.paused && st.fc === 'pfc') {
        const n = nodes[sidx.tm]; c.fillStyle = COL.violet; c.font = '700 11px "Segoe UI", sans-serif';
        c.fillText('PFC XOFF → upstream paused', n.x, n.y - n.h / 2 - 8);
      }
      c.textAlign = 'left'; c.fillStyle = COL.muted; c.font = '11px "Segoe UI", sans-serif';
      c.fillText(st.gran === 'symbol' ? 'Symbol view: each dot = one ' + st.mod + ' symbol (brightness = level' + (st.speed < 0.25 ? ', digit shown' : ', slow below 0.25× to read levels') + ')' : 'Packet view: capsule length ∝ log(packet size). Time is slowed ~10^9× for visibility.', 12, H - 8);
    }
    function dimFiber(i) {
      const id = nodes[i] && nodes[i].s.id;
      if (id === 'fibin' || id === 'cplin' || id === 'demux') return C.clamp(Math.pow(10, -(st.extraLoss + st.laserDrop) / 14), 0.25, 1);
      if (id === 'mrm' || id === 'mux' || id === 'cplout' || id === 'fibout') return C.clamp(Math.pow(10, -st.laserDrop / 14) * L.eta, 0.25, 1);
      return 1;
    }
    function fmtNs(v) { return v < 1 ? (v * 1000).toFixed(0) + ' ps' : v < 1000 ? v.toFixed(v < 10 ? 1 : 0) + ' ns' : (v / 1000).toFixed(2) + ' µs'; }

    // ---------- signal generators (scope + eye)
    function waveCfg(id) {
      const s = BYID[id];
      const amp = C.clamp(L.A / L.A0, 0, 1.5);
      const dEye = 3 / (L.M - 1);
      const sEq = L.los ? 3 : dEye / Math.max(0.3, L.xTot);
      const sRx = L.los ? 3 : dEye * amp / Math.max(0.3, L.xRx);
      const host = st.path === 'cpo' ? 0 : 1;
      switch (s.sig) {
        case 'tx': return { kind: 'tx', tau: 0.22, pre: 0.14, amp: 1, sigma: 0.04, unit: 'mVppd', scale: 400 / 3, color: COL.data };
        case 'drive': return { kind: 'drive', tau: 0.24, pre: 0.08, amp: 1, sigma: 0.04, unit: 'V', scale: 0.75 / 3, color: COL.data };
        case 'channel': return { kind: 'channel', tau: 1.15, pre: 0, amp: 0.55, sigma: 0.06, unit: 'mV', scale: 60 / 3, color: COL.data };
        case 'optical': case 'ring': return { kind: 'optical', tau: 0.3, pre: 0, amp: amp, sigma: sRx * 0.35, unit: 'mW', color: COL.optic };
        case 'current': return { kind: 'current', tau: 0.33, pre: 0, amp: amp, sigma: sRx * 0.6, unit: 'µA', color: COL.data };
        case 'tia': return { kind: 'tia', tau: 0.42, pre: 0, amp: amp, sigma: sRx, unit: 'mV', color: COL.data };
        case 'eq': case 'symbols': return { kind: 'eq', tau: 0.12 + 0.03 * host, pre: 0, amp: 1, sigma: sEq, unit: 'norm.', color: COL.data };
        default: return null;
      }
    }
    function newGen() { return { l1: 0, l2: 0, prev: 0, n: 0, buf: new Float32Array(SPU * 80), syms: [] }; }
    function genSym(g, cfg) {
      const k = (Math.random() * L.M) | 0;
      const v = -3 + 6 * k / (L.M - 1);
      const drive = v + cfg.pre * (v - g.prev); g.prev = v;
      const a = 1 - Math.exp(-1 / (Math.max(0.05, cfg.tau / 2) * SPU));
      const N = g.buf.length;
      for (let i = 0; i < SPU; i++) {
        g.l1 += a * (drive - g.l1); g.l2 += a * (g.l1 - g.l2);
        g.buf[g.n % N] = g.l2 * cfg.amp + cfg.sigma * C.randn();
        g.n++;
      }
      g.syms.push({ start: g.n - SPU, k });
      if (g.syms.length > 80) g.syms.shift();
      return k;
    }
    let scopeGen = newGen(), eyeGen = newGen(), scopeAcc = 0, eyeAcc = 0, scopeFrac = 0, cfgKey = '';
    const EW = 220, EH = 170; const eyeHist = new Float32Array(EW * EH); let eyeMax = 1;
    const eyeOff = document.createElement('canvas'); eyeOff.width = EW; eyeOff.height = EH;
    const eoctx = eyeOff.getContext('2d'); const eyeImg = eoctx.createImageData(EW, EH);
    function lut(hex) {
      const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex) || [0, '22', 'd3', 'ee'];
      const c = [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)], out = [];
      for (let i = 0; i < 256; i++) {
        const t = i / 255;
        const a = Math.min(1, t * 1.8), w = Math.max(0, (t - 0.6) / 0.4);
        out.push([c[0] * a + (255 - c[0] * a) * w, c[1] * a + (255 - c[1] * a) * w, c[2] * a + (255 - c[2] * a) * w, t > 0.004 ? 255 : 0]);
      }
      return out;
    }
    const LUTS = { data: lut(COL.data), optic: lut(COL.optic) };
    function eyeCfgId() { const c = waveCfg(st.sel); return c ? st.sel : 'cdr'; }
    function accumulateEye(g, cfg) {
      // center of symbol (latest - back)
      const back = Math.ceil(1.68 * cfg.tau + 1.6);
      const sy = g.syms[g.syms.length - 1 - back]; if (!sy) return;
      const center = sy.start + Math.round((1.68 * cfg.tau + 0.5) * SPU);
      const N = g.buf.length;
      let px = -1, py = 0;
      for (let i = -SPU; i <= SPU; i++) {
        const idx = center + i; if (idx < 0 || idx >= g.n) { px = -1; continue; }
        const v = g.buf[idx % N];
        const x = (i + SPU) / (2 * SPU) * (EW - 1), y = (1 - (v + 5) / 10) * (EH - 1);
        if (px >= 0) {
          const steps = Math.ceil(Math.abs(x - px)) + 1;
          for (let s = 0; s <= steps; s++) {
            const xx = Math.round(px + (x - px) * s / steps), yy = Math.round(py + (y - py) * s / steps);
            if (xx >= 0 && xx < EW && yy >= 0 && yy < EH) eyeHist[yy * EW + xx] += 1;
          }
        }
        px = x; py = y;
      }
    }
    function stepScope(dt) {
      const id = eyeCfgId();
      const cfgS = waveCfg(st.sel) || waveCfg('cdr');
      const key = id + st.mod + st.path + st.rate;
      if (key !== cfgKey) { cfgKey = key; eyeHist.fill(0); eyeMax = 1; scopeGen = newGen(); eyeGen = newGen(); for (let i = 0; i < 60; i++) genSym(scopeGen, cfgS); }
      const sym = st.gran === 'symbol';
      scopeAcc += dt * st.speed * (sym ? 3 : 60);
      let n = 0;
      while (scopeAcc >= 1 && n < 40) { genSym(scopeGen, cfgS); scopeAcc -= 1; n++; }
      if (scopeAcc > 1) scopeAcc = 0;
      scopeFrac = scopeAcc;
      const cfgE = waveCfg(id);
      eyeAcc += dt * st.speed * (sym ? 40 : 2500);
      n = 0;
      while (eyeAcc >= 1 && n < 500) { genSym(eyeGen, cfgE); accumulateEye(eyeGen, cfgE); eyeAcc -= 1; n++; }
      if (eyeAcc > 500) eyeAcc = 0;
      const decay = Math.pow(0.5, dt * st.speed / 1.2); // persistence half-life ~1.2 s
      let mx = 0;
      for (let i = 0; i < eyeHist.length; i++) { eyeHist[i] *= decay; if (eyeHist[i] > mx) mx = eyeHist[i]; }
      eyeMax = Math.max(1, mx);
    }

    // ---------- scope drawing
    let SW = 0, SH = 0, EWc = 0, EHc = 0, BW2 = 0, RW = 0;
    function scopeGrid(c, w, hh) {
      c.fillStyle = '#04070a'; c.fillRect(0, 0, w, hh);
      c.strokeStyle = 'rgba(118,185,0,0.10)'; c.lineWidth = 1;
      for (let i = 1; i < 10; i++) { const x = Math.round(i * w / 10) + 0.5; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, hh); c.stroke(); }
      for (let i = 1; i < 8; i++) { const y = Math.round(i * hh / 8) + 0.5; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
      c.strokeStyle = 'rgba(118,185,0,0.22)'; c.beginPath(); c.moveTo(0, hh / 2 + 0.5); c.lineTo(w, hh / 2 + 0.5); c.stroke();
    }
    function txt(c, s, x, y, colr, font, align) { c.fillStyle = colr || COL.muted; c.font = font || '11px Consolas, monospace'; c.textAlign = align || 'left'; c.fillText(s, x, y); }
    function drawAnalog(c, w, hh, cfg, s) {
      const g = scopeGen, N = g.buf.length, NUI = 20, ns = NUI * SPU;
      const end = g.n - SPU * 2 + Math.floor(scopeFrac * SPU);
      const y = v => hh / 2 - v / 5 * (hh / 2 - 10);
      // decision thresholds
      if (cfg.kind === 'eq') {
        c.setLineDash([3, 4]); c.strokeStyle = 'rgba(245,179,1,0.35)';
        for (let k = 1; k < L.M; k++) { const v = -3 + 6 * (k - 0.5) / (L.M - 1); c.beginPath(); c.moveTo(0, y(v)); c.lineTo(w, y(v)); c.stroke(); }
        c.setLineDash([]);
      }
      c.save(); c.shadowColor = cfg.color; c.shadowBlur = 8; c.strokeStyle = cfg.color; c.lineWidth = 1.6; c.beginPath();
      for (let i = 0; i < ns; i++) {
        const idx = end - ns + i; if (idx < 0) continue;
        const v = g.buf[idx % N], x = i / (ns - 1) * w;
        if (i === 0) c.moveTo(x, y(v)); else c.lineTo(x, y(v));
      }
      c.stroke(); c.restore();
      // sample dots / level labels
      const off = Math.round((1.68 * cfg.tau + 0.5) * SPU);
      for (const sy of g.syms) {
        const idx = sy.start + off; const i = idx - (end - ns);
        if (i < 0 || i >= ns) continue;
        const x = i / (ns - 1) * w;
        if (s.sig === 'symbols') {
          const v = g.buf[idx % N];
          const dec = C.clamp(Math.round((v + 3) / 6 * (L.M - 1)), 0, L.M - 1);
          const ok = dec === sy.k;
          c.fillStyle = ok ? COL.accent : COL.bad; c.beginPath(); c.arc(x, y(v), 3.2, 0, 7); c.fill();
          txt(c, String(dec), x, hh - 6, ok ? COL.accent : COL.bad, '10px Consolas, monospace', 'center');
        } else if (st.gran === 'symbol' || cfg.kind === 'tx' || cfg.kind === 'drive') {
          txt(c, String(sy.k), x, 14, 'rgba(230,237,245,0.55)', '10px Consolas, monospace', 'center');
        }
      }
      // physical-unit axis
      const lab = [];
      if (cfg.kind === 'optical') {
        const P1 = L.Pavg * (1 + L.eta * (L.r - 1) / (L.r + 1)) * 1e3, P0 = L.Pavg * (1 - L.eta * (L.r - 1) / (L.r + 1)) * 1e3;
        const erEff = dB(P1 / Math.max(1e-9, P0));
        lab.push('P_avg ' + L.Prx.toFixed(1) + ' dBm', 'P1 ' + P1.toFixed(3) + ' mW  P0 ' + P0.toFixed(3) + ' mW', 'ER ' + erEff.toFixed(2) + ' dB · OMA ' + dB(L.OMA * 1e3).toFixed(1) + ' dBm');
        c.setLineDash([2, 4]); c.strokeStyle = 'rgba(255,107,61,0.5)';
        [3, -3].forEach(v => { c.beginPath(); c.moveTo(0, y(v * cfg.amp)); c.lineTo(w, y(v * cfg.amp)); c.stroke(); });
        c.setLineDash([]);
      } else if (cfg.kind === 'current') {
        lab.push('I_avg ' + (L.Iavg * 1e6).toFixed(0) + ' µA', 'swing ±' + (L.A * 1e6).toFixed(0) + ' µA', 'σ_rx ' + (L.sig * 1e6).toFixed(1) + ' µA');
      } else if (cfg.kind === 'tia') {
        lab.push('Z_T ≈ 1 kΩ → ±' + (L.A * 1e6).toFixed(0) + ' mV', 'thermal ' + (L.sTh * 1e6).toFixed(1) + ' µA rms in', 'BW-limited ISI');
      } else if (cfg.kind === 'eq') {
        lab.push('after FFE/DFE + AGC', 'SNR ' + dB(L.snrOpt).toFixed(1) + ' dB', 'slicer thresholds dashed');
      } else if (cfg.kind === 'channel') {
        lab.push('IL ≈ 22–30 dB @ Nyquist', 'eye closed before EQ', 'compare CPO: ~4 dB');
      } else if (cfg.kind === 'tx') {
        lab.push('≈800 mVppd', 'TX FFE pre-emphasis', L.baud.toFixed(2) + ' GBd');
      } else if (cfg.kind === 'drive') {
        lab.push('≈1.5 Vpp reverse bias swing', 'pre-distorted for ring', 'EIC 3D-stacked on PIC');
      }
      lab.forEach((l, i) => txt(c, l, w - 8, 30 + i * 14, cfg.color, '11px Consolas, monospace', 'right'));
      txt(c, NUI + ' UI = ' + (NUI / L.baud * 1000).toFixed(0) + ' ps', 8, hh - 6, COL.muted);
    }
    function drawSpectrum(c, w, hh, t, isMux) {
      const n = L.nLam, sp = n > 4 ? 0.8 : 1.6, lo = 1310 - sp * (n / 2 + 0.6), hi = 1310 + sp * (n / 2 + 0.6);
      const X = l => (l - lo) / (hi - lo) * w, Y = v => hh - 26 - v * (hh - 60);
      // ring responses
      const fw = isMux ? L.FWHM : 0.6 * 0.5;
      for (let k = 0; k < n; k++) {
        const lc = 1310 + (k - (n - 1) / 2) * sp, lr = lc + L.delta;
        c.strokeStyle = lamCol(k); c.globalAlpha = 0.5; c.lineWidth = 1.2; c.beginPath();
        for (let i = 0; i <= 200; i++) {
          const l = lo + (hi - lo) * i / 200; const v = 1 / (1 + Math.pow(2 * (l - lr) / fw, 2));
          if (i === 0) c.moveTo(X(l), Y(v)); else c.lineTo(X(l), Y(v));
        }
        c.stroke(); c.globalAlpha = 1;
        // laser line
        const mod = 0.55 + 0.45 * Math.sin(t * 9 + k * 1.7) * L.eta;
        const p = Math.pow(10, -(st.laserDrop + st.extraLoss * (isMux ? 0 : 1)) / 10) * (isMux ? mod : mod / (1 + Math.pow(2 * L.delta / fw, 2)));
        c.save(); c.shadowColor = lamCol(k); c.shadowBlur = 12; c.strokeStyle = lamCol(k); c.lineWidth = 3;
        c.beginPath(); c.moveTo(X(lc), Y(0)); c.lineTo(X(lc), Y(C.clamp(p, 0, 1))); c.stroke(); c.restore();
        txt(c, 'λ' + k, X(lc), hh - 10, lamCol(k), '10px Consolas, monospace', 'center');
      }
      c.strokeStyle = 'rgba(255,255,255,0.15)'; c.beginPath(); c.moveTo(0, Y(0)); c.lineTo(w, Y(0)); c.stroke();
      txt(c, isMux ? 'Ring resonances (thin) vs laser lines; each ring modulates only its λ' : 'Drop-ring passbands (thin) vs incoming λ; detuning shifts the filters', 8, 16, COL.optic);
      txt(c, (lo).toFixed(1) + ' nm', 6, hh - 30, COL.muted); txt(c, hi.toFixed(1) + ' nm', w - 6, hh - 30, COL.muted, null, 'right');
      txt(c, 'drift +' + (L.delta * 1000).toFixed(0) + ' pm  (ΔT ' + st.detuneK.toFixed(2) + ' K × 80 pm/K)' + (isMux ? '' : '  drop loss +' + L.demuxXL.toFixed(2) + ' dB'), w - 8, 32, L.delta > 0.05 ? COL.warn : COL.muted, null, 'right');
      txt(c, 'XT_eff ' + L.xtEff.toFixed(1) + ' dB · ' + n + ' λ × ' + st.rate + 'G', w - 8, 46, COL.muted, null, 'right');
    }
    function drawRing(c, w, hh, t) {
      const hw = w * 0.42;
      const lo = -0.45, hi = 0.45, X = d => 10 + (d - lo) / (hi - lo) * (hw - 20), Y = v => 30 + (1 - v) * (hh - 70);
      const Tmin = 0.08, fw = L.FWHM;
      const T = dl => 1 - (1 - Tmin) / (1 + Math.pow(2 * dl / fw, 2));
      const lvl = scopeGen.syms.length ? scopeGen.syms[scopeGen.syms.length - 1].k : 0;
      const swing = 0.04; // nm peak resonance shift across the drive range [typ ~20-40 pm/V]
      const cen = fw / 2 + L.delta + (lvl / (L.M - 1) - 0.5) * swing; // resonance centre relative to laser (laser at 0)
      c.strokeStyle = COL.optic; c.lineWidth = 2; c.save(); c.shadowColor = COL.optic; c.shadowBlur = 6; c.beginPath();
      for (let i = 0; i <= 160; i++) { const d = lo + (hi - lo) * i / 160; const v = T(d - cen); if (i) c.lineTo(X(d), Y(v)); else c.moveTo(X(d), Y(v)); }
      c.stroke(); c.restore();
      c.strokeStyle = 'rgba(255,107,61,0.25)'; c.setLineDash([2, 3]); c.beginPath();
      for (let i = 0; i <= 160; i++) { const d = lo + (hi - lo) * i / 160; const v = T(d - fw / 2); if (i) c.lineTo(X(d), Y(v)); else c.moveTo(X(d), Y(v)); }
      c.stroke(); c.setLineDash([]);
      const lx = X(0);
      c.strokeStyle = COL.power; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(lx, 24); c.lineTo(lx, hh - 38); c.stroke(); c.setLineDash([]);
      const out = T(-cen);
      c.save(); c.shadowColor = '#fff'; c.shadowBlur = 10; c.fillStyle = '#fff'; c.beginPath(); c.arc(lx, Y(out), 4, 0, 7); c.fill(); c.restore();
      txt(c, 'ring through-port T(λ)', 10, 16, COL.optic);
      txt(c, 'laser λ', lx + 4, hh - 40, COL.power);
      txt(c, 'Q≈8k, FWHM ' + (fw * 1000).toFixed(0) + ' pm', 10, hh - 22, COL.muted);
      txt(c, 'η(δ) = ' + L.eta.toFixed(2) + (L.delta > 0 ? '  ⚠ detuned' : ''), 10, hh - 8, L.eta < 0.8 ? COL.warn : COL.muted);
      c.save(); c.translate(hw, 0);
      drawAnalog(c, w - hw, hh, waveCfg('mrm'), BYID.mrm);
      c.restore();
      c.strokeStyle = COL.line; c.beginPath(); c.moveTo(hw + 0.5, 0); c.lineTo(hw + 0.5, hh); c.stroke();
    }
    function drawCW(c, w, hh, t) {
      const p = 6 - st.laserDrop, y = v => hh / 2 - v * (hh / 2 - 20);
      c.save(); c.shadowColor = COL.optic; c.shadowBlur = 10; c.strokeStyle = COL.optic; c.lineWidth = 2; c.beginPath();
      const lvl = 0.5 * Math.pow(10, -st.laserDrop / 10) + 0.2;
      for (let i = 0; i < w; i += 2) { const v = lvl + 0.01 * C.randn(); if (i) c.lineTo(i, y(v)); else c.moveTo(i, y(v)); }
      c.stroke(); c.restore();
      txt(c, 'CW power per λ into engine: ' + p.toFixed(1) + ' dBm (' + Math.pow(10, p / 10).toFixed(2) + ' mW)', 8, 18, COL.optic);
      txt(c, 'RIN ≈ −150 dB/Hz (tiny ripple) · no data yet — the ring imprints it', 8, 34, COL.muted);
      txt(c, 'APC loop holds power; aging → slider "laser power drop"', 8, hh - 10, COL.muted);
    }
    const FIELDS = [['Pre/SFD', 8, '#3a4a5e'], ['DA', 6, '#22d3ee'], ['SA', 6, '#22d3ee'], ['VLAN', 4, '#a78bfa'], ['Type', 2, '#a78bfa'], ['IPv4 (DSCP/ECN)', 20, '#76b900'], ['UDP 4791', 8, '#76b900'], ['BTH', 12, '#facc15'], ['Payload', -1, '#2b6d7a'], ['ICRC', 4, '#f472b6'], ['FCS', 4, '#f472b6'], ['IFG', 12, '#1a222d']];
    function drawPacket(c, w, hh, t) {
      const pay = Math.max(0, st.size - 18 - 4 - 20 - 8 - 12 - 4);
      const f = FIELDS.map(x => [x[0], x[1] < 0 ? pay : x[1], x[2]]);
      const wts = f.map(x => Math.max(18, Math.log2(2 + x[1]) * 14 + (x[0] === 'Payload' ? 80 : 0)));
      const tot = wts.reduce((a, b) => a + b, 0), sx = (w - 20) / tot;
      let x = 10;
      const prog = (t * st.speed * 0.25) % 1;
      f.forEach((fl, i) => {
        const ww = wts[i] * sx;
        rr(c, x, 34, ww - 2, 40, 5); c.fillStyle = fl[2]; c.globalAlpha = 0.85; c.fill(); c.globalAlpha = 1;
        txt(c, fl[0], x + ww / 2, 52, '#071018', '600 10px "Segoe UI", sans-serif', 'center');
        txt(c, fl[1] + ' B', x + ww / 2, 66, '#071018', '9px Consolas, monospace', 'center');
        x += ww;
      });
      const cx = 10 + prog * (w - 20);
      c.save(); c.shadowColor = COL.accent; c.shadowBlur = 10; c.fillStyle = COL.accent; c.fillRect(cx, 28, 2, 52); c.restore();
      txt(c, 'Frame on the wire: ' + st.size + ' B + 20 B preamble/IFG → serialization ' + (st.size * 8 / 800).toFixed(1) + ' ns @ 800G', 10, 18, COL.text);
      // bits underneath as NRZ logic
      const by = 110, bh = 30; const nb = 64;
      c.strokeStyle = COL.data; c.lineWidth = 1.5; c.beginPath();
      let seed = Math.floor(t * st.speed * 8);
      for (let i = 0; i < nb; i++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff; const b = (seed >> 16) & 1;
        const x0 = 10 + i * (w - 20) / nb, x1 = 10 + (i + 1) * (w - 20) / nb, yy = by + (b ? 0 : bh);
        if (i === 0) c.moveTo(x0, yy); else c.lineTo(x0, yy);
        c.lineTo(x1, yy);
      }
      c.stroke();
      txt(c, 'bits (MSB first) → pairs Gray-mapped to PAM4: 00→0 01→1 11→2 10→3', 10, by + bh + 22, COL.muted);
      const ecnTxt = q.pm > 0 && st.cc ? 'IP ECN field: 11 (CE — congestion experienced) on ~' + Math.round(q.pm * 100) + '% of packets' : 'IP ECN field: 10 (ECT(0), ECN-capable)';
      txt(c, ecnTxt, 10, hh - 12, q.pm > 0 && st.cc ? COL.warn : COL.muted);
    }
    function drawPCS(c, w, hh, t) {
      const off = (t * st.speed * 40) % 60;
      txt(c, '64b/66b blocks (2-bit sync header 01/10 + 64 b)', 10, 16, COL.text);
      for (let i = -1; i < w / 60 + 1; i++) {
        const x = i * 60 + off;
        rr(c, x, 24, 8, 22, 2); c.fillStyle = COL.violet; c.fill();
        rr(c, x + 9, 24, 48, 22, 2); c.fillStyle = 'rgba(34,211,238,0.6)'; c.fill();
      }
      txt(c, '↓ 4 × 66b → 256b/257b transcode (saves 7 bits / 264)', 10, 66, COL.text);
      for (let i = -1; i < w / 120 + 1; i++) {
        const x = i * 120 + (off * 2 % 120);
        rr(c, x, 74, 4, 20, 2); c.fillStyle = COL.violet; c.fill();
        rr(c, x + 5, 74, 112, 20, 2); c.fillStyle = 'rgba(34,211,238,0.45)'; c.fill();
      }
      txt(c, '↓ 20 × 257b = 5140 b = 514 symbols (10 b) + 30 parity symbols = RS(544,514) codeword', 10, 116, COL.text);
      const cw = w - 20, dat = cw * 514 / 544;
      rr(c, 10, 124, dat, 26, 3); c.fillStyle = 'rgba(34,211,238,0.55)'; c.fill();
      rr(c, 10 + dat, 124, cw - dat, 26, 3); c.fillStyle = COL.violet; c.fill();
      txt(c, '514 message symbols', 10 + dat / 2, 141, '#071018', '600 11px "Segoe UI", sans-serif', 'center');
      txt(c, '30', 10 + dat + (cw - dat) / 2, 141, '#071018', '600 11px "Segoe UI", sans-serif', 'center');
      const sweep = (t * st.speed * 0.5) % 1;
      c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(10 + sweep * cw, 122, 2, 30);
      txt(c, 'Rate overhead 544/514 = 5.8 % → ' + st.rate + 'G lane runs at ' + L.line + ' Gb/s = ' + L.baud.toFixed(2) + ' GBd ' + st.mod, 10, 176, COL.muted);
      txt(c, 'Codewords are symbol-interleaved over lanes (with alignment markers) so a burst on one lane spreads.', 10, 192, COL.muted);
    }
    let fecVis = { k: 0, t: 0, errs: [] };
    function drawFEC(c, w, hh, t, dt) {
      fecVis.t -= dt * st.speed;
      if (fecVis.t <= 0) {
        fecVis.t = 0.6;
        const k = Math.min(60, poisson(RS_N * L.fec.ps));
        const e = new Set(); while (e.size < k) e.add((Math.random() * RS_N) | 0);
        fecVis.errs = [...e]; fecVis.k = k;
      }
      const lw = w * 0.56, cols = 68, rows = 8, cs = (lw - 20) / cols, ch = 11;
      txt(c, 'One RS(544,514) codeword — 10-bit symbols (data cyan, parity violet)', 10, 16, COL.text);
      for (let i = 0; i < RS_N; i++) {
        const x = 10 + (i % cols) * cs, y = 26 + Math.floor(i / cols) * (ch + 2);
        c.fillStyle = i < RS_K ? 'rgba(34,211,238,0.35)' : 'rgba(167,139,250,0.7)';
        c.fillRect(x, y, cs - 1, ch);
      }
      const unc = fecVis.k > RS_T;
      for (const i of fecVis.errs) {
        const x = 10 + (i % cols) * cs, y = 26 + Math.floor(i / cols) * (ch + 2);
        c.save(); c.shadowColor = COL.bad; c.shadowBlur = 8; c.fillStyle = unc ? COL.bad : COL.warn; c.fillRect(x - 1, y - 1, cs + 1, ch + 2); c.restore();
      }
      const yb = 26 + rows * (ch + 2) + 18;
      txt(c, 'errored symbols this CW: ' + fecVis.k + ' / t = 15  →  ' + (fecVis.k === 0 ? 'clean' : unc ? 'UNCORRECTABLE' : 'corrected'), 10, yb, unc ? COL.bad : fecVis.k ? COL.warn : COL.good, '600 12px Consolas, monospace');
      txt(c, 'E[errors/CW] = 544·p_s = ' + C.fmt(L.fec.mean, 3) + '   (p_s = ' + C.fmt(L.fec.ps, 3) + ')', 10, yb + 16, COL.muted);
      txt(c, 'Decoder: syndromes → Berlekamp–Massey → Chien search → Forney', 10, yb + 32, COL.muted);
      // histogram
      const hx = lw + 10, hw = w - hx - 10, hb = hh - 30, ht = 34;
      txt(c, 'FEC histogram  log10 P(i errors / CW)', hx, 16, COL.text);
      const lo = -20;
      for (let i = 0; i <= 16; i++) {
        const v = L.fec.hist[i]; const f = isFinite(v) ? C.clamp((v - lo) / -lo, 0, 1) : 0;
        const bw = hw / 17, x = hx + i * bw, bh = f * (hb - ht);
        c.fillStyle = i === 16 ? COL.bad : i > 10 ? COL.warn : COL.data; c.globalAlpha = 0.85;
        c.fillRect(x + 1, hb - bh, bw - 2, bh); c.globalAlpha = 1;
        if (i % 3 === 0 || i === 16) txt(c, i === 16 ? '>15' : String(i), x + bw / 2, hb + 12, COL.muted, '9px Consolas, monospace', 'center');
      }
      [0, -5, -10, -15, -20].forEach(v => { const y = hb - (v - lo) / -lo * (hb - ht); txt(c, '1e' + v, hx + hw, y + 3, 'rgba(138,153,173,0.6)', '9px Consolas, monospace', 'right'); });
    }
    function drawHeader(c, w, hh, t, id) {
      const prog = (t * st.speed * 0.6) % 1;
      if (id === 'parse') {
        const f = [['eth.dst', '0c:42:a1:3f:00:17'], ['eth.src', 'b8:3f:d2:00:9a:01'], ['vlan.pcp', '3 (RoCE lossless TC)'], ['ipv4.dscp/ecn', '26 / ' + (q.pm > 0 && st.cc ? '11 CE' : '10 ECT0')], ['ipv4.dst', '10.17.3.41'], ['udp.dport', '4791 → RoCEv2'], ['bth.opcode', 'RDMA WRITE'], ['bth.dest_qp / psn', '0x00a3 / 77120']];
        txt(c, 'Parser state machine → PHV', 10, 16, COL.text);
        f.forEach((r, i) => {
          const y = 30 + i * 21, on = prog * f.length > i;
          rr(c, 10, y, w - 20, 18, 4); c.fillStyle = on ? 'rgba(34,211,238,0.16)' : 'rgba(255,255,255,0.03)'; c.fill();
          txt(c, r[0], 18, y + 13, on ? COL.data : COL.muted); txt(c, on ? r[1] : '…', w - 18, y + 13, on ? COL.text : COL.muted, null, 'right');
        });
      } else if (id === 'lookup') {
        const tb = [['L2 FDB (exact, SRAM)', 'hit: dst MAC → bridge'], ['L3 LPM (algorithmic TCAM)', '10.17.0.0/16 → ECMP grp 5'], ['ACL (ternary)', 'permit, TC 3'], ['ECMP / adaptive routing', 'hash(5-tuple) → port 17 (least loaded)'], ['QoS map', 'DSCP 26 → TC 3, PG 3 lossless']];
        txt(c, 'Pipelined match-action stages (1 pkt / clock / pipe)', 10, 16, COL.text);
        tb.forEach((r, i) => {
          const y = 30 + i * 30, on = prog * tb.length > i, cur = Math.floor(prog * tb.length) === i;
          rr(c, 10, y, w - 20, 25, 5); c.fillStyle = cur ? 'rgba(118,185,0,0.22)' : on ? 'rgba(118,185,0,0.08)' : 'rgba(255,255,255,0.03)'; c.fill();
          if (cur) { c.strokeStyle = COL.accent; c.stroke(); }
          txt(c, 'stage ' + i + ' · ' + r[0], 18, y + 17, on ? COL.accent : COL.muted); txt(c, on ? r[1] : '', w - 18, y + 17, COL.text, null, 'right');
        });
        txt(c, 'Result → egress port 17, TC 3, queue to traffic manager', 10, hh - 12, COL.accent);
      } else {
        const mk = q.pm > 0 && st.cc;
        const a = [['TTL / hop-limit', '64 → 63'], ['ECN', mk ? 'ECT0 → CE (queue > Kmin, p=' + q.pm.toFixed(2) + ')' : 'unchanged (queue < Kmin)'], ['VLAN', 'keep PCP 3'], ['Telemetry', 'queue depth ' + (q.q / 1e3).toFixed(0) + ' KB stamped'], ['Deparser', 'PHV + buffer cells → frame']];
        txt(c, 'Egress match-action + deparser', 10, 16, COL.text);
        a.forEach((r, i) => {
          const y = 30 + i * 30, on = prog * a.length > i;
          rr(c, 10, y, w - 20, 25, 5); c.fillStyle = on ? (i === 1 && mk ? 'rgba(245,179,1,0.18)' : 'rgba(34,211,238,0.10)') : 'rgba(255,255,255,0.03)'; c.fill();
          txt(c, r[0], 18, y + 17, i === 1 && mk ? COL.warn : COL.data); txt(c, on ? r[1] : '', w - 18, y + 17, COL.text, null, 'right');
        });
      }
    }
    function drawQueueChart(c, w, hh, labels) {
      c.fillStyle = '#04070a'; c.fillRect(0, 0, w, hh);
      const maxB = st.fc === 'none' ? BUF : st.fc === 'credit' ? CREDIT * 1.1 : XOFF * 1.4;
      const Y = v => hh - 16 - Math.min(1, v / maxB) * (hh - 30);
      const lines = [[KMIN, 'Kmin', COL.warn], [KMAX, 'Kmax', COL.warn]];
      if (st.fc === 'pfc') lines.push([XOFF, 'XOFF', COL.violet], [XON, 'XON', 'rgba(167,139,250,0.6)']);
      if (st.fc === 'credit') lines.push([CREDIT, 'credit limit', COL.violet]);
      if (st.fc === 'none') lines.push([BUF, 'buffer full → drop', COL.bad]);
      lines.forEach(([v, l, cc]) => { c.setLineDash([4, 4]); c.strokeStyle = cc; c.globalAlpha = 0.6; c.beginPath(); c.moveTo(0, Y(v)); c.lineTo(w, Y(v)); c.stroke(); c.setLineDash([]); c.globalAlpha = 1; if (labels) txt(c, l, w - 4, Y(v) - 3, cc, '10px Consolas, monospace', 'right'); });
      if (qHist.length > 1) {
        const n = 300;
        c.beginPath(); c.moveTo(0, Y(0));
        qHist.forEach((v, i) => c.lineTo((i + n - qHist.length) / (n - 1) * w, Y(v.q)));
        c.lineTo(w, Y(0)); c.closePath();
        const gr = c.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, 'rgba(34,211,238,0.45)'); gr.addColorStop(1, 'rgba(34,211,238,0.02)');
        c.fillStyle = gr; c.fill();
        c.save(); c.shadowColor = COL.data; c.shadowBlur = 6; c.strokeStyle = COL.data; c.lineWidth = 1.5; c.beginPath();
        qHist.forEach((v, i) => { const x = (i + n - qHist.length) / (n - 1) * w; if (i) c.lineTo(x, Y(v.q)); else c.moveTo(x, Y(v.q)); });
        c.stroke(); c.restore();
        qHist.forEach((v, i) => { if (v.p) { const x = (i + n - qHist.length) / (n - 1) * w; c.fillStyle = 'rgba(167,139,250,0.35)'; c.fillRect(x, 0, w / n + 0.5, 6); } });
      }
      txt(c, 'occupancy ' + (q.q / 1e3).toFixed(0) + ' KB · queue delay ' + fmtNs(q.q / 100) + ' · sender rate ' + Math.round((st.cc ? q.rcc : 1) * 100) + '%', 8, 14, COL.text, '11px Consolas, monospace');
    }
    function drawSched(c, w, hh, t) {
      const tcs = 8, bw = (w - 40) / tcs;
      txt(c, 'Per-TC egress queues → strict priority (TC7 control) + DWRR between data TCs', 10, 16, COL.text);
      const cur = Math.floor(t * st.speed * 3) % tcs;
      for (let i = 0; i < tcs; i++) {
        const occ = i === 3 ? Math.min(1, q.q / XOFF) : 0.08 + 0.06 * Math.sin(t * 1.3 + i * 2);
        const x = 20 + i * bw, top = 34, hgt = hh - 80;
        rr(c, x + 4, top, bw - 8, hgt, 5); c.fillStyle = 'rgba(255,255,255,0.04)'; c.fill();
        const fh = occ * hgt; rr(c, x + 4, top + hgt - fh, bw - 8, Math.max(2, fh), 5);
        c.fillStyle = i === 3 ? (occ > 0.75 ? COL.bad : COL.data) : 'rgba(138,153,173,0.45)'; c.fill();
        if (i === cur) { c.strokeStyle = COL.accent; c.lineWidth = 2; rr(c, x + 2, top - 2, bw - 4, hgt + 4, 6); c.stroke(); }
        txt(c, 'TC' + i, x + bw / 2, hh - 32, i === 3 ? COL.data : COL.muted, '10px Consolas, monospace', 'center');
        txt(c, i === 7 ? 'SP' : 'w' + [1, 1, 2, 4, 1, 1, 1, 0][i], x + bw / 2, hh - 18, COL.muted, '9px Consolas, monospace', 'center');
      }
      txt(c, 'TC3 = RoCE (lossless, PFC/ECN). Pointer = DWRR grant.', 10, hh - 4, COL.muted);
    }
    function drawScope(t, dt) {
      const c = sctx, w = SW, hh = SH, s = BYID[st.sel];
      scopeGrid(c, w, hh);
      switch (s.sig) {
        case 'packet': drawPacket(c, w, hh, t); break;
        case 'pcs': drawPCS(c, w, hh, t); break;
        case 'fec': drawFEC(c, w, hh, t, dt); break;
        case 'header': drawHeader(c, w, hh, t, s.id); break;
        case 'queue': drawQueueChart(c, w, hh, true); break;
        case 'sched': drawSched(c, w, hh, t); break;
        case 'spectrum': drawSpectrum(c, w, hh, t, s.id === 'mux'); break;
        case 'ring': drawRing(c, w, hh, t); break;
        case 'cw': drawCW(c, w, hh, t); break;
        default: drawAnalog(c, w, hh, waveCfg(s.id), s);
      }
      if (!lk.up && ['eq', 'symbols', 'fec', 'current', 'tia'].includes(s.sig)) {
        c.fillStyle = 'rgba(255,77,94,0.18)'; c.fillRect(0, 0, w, hh);
        txt(c, 'LINK DOWN — retraining', w / 2, hh / 2, COL.bad, '700 18px "Segoe UI", sans-serif', 'center');
      }
    }
    function drawEye() {
      const id = eyeCfgId(), cfg = waveCfg(id);
      const lt = cfg.color === COL.optic ? LUTS.optic : LUTS.data;
      const d = eyeImg.data, lm = Math.log1p(eyeMax);
      for (let i = 0; i < eyeHist.length; i++) {
        const v = eyeHist[i]; const k = v > 0 ? Math.min(255, (Math.log1p(v) / lm * 255) | 0) : 0;
        const cc = lt[k]; d[i * 4] = cc[0]; d[i * 4 + 1] = cc[1]; d[i * 4 + 2] = cc[2]; d[i * 4 + 3] = cc[3];
      }
      eoctx.putImageData(eyeImg, 0, 0);
      const c = ectx, w = EWc, hh = EHc;
      scopeGrid(c, w, hh);
      c.imageSmoothingEnabled = true;
      c.drawImage(eyeOff, 0, 0, w, hh);
      txt(c, 'Eye @ ' + labelOf(BYID[id], st).replace('\n', ' ') + (id !== st.sel ? ' (recovered)' : ''), 8, 14, COL.text, '600 11px "Segoe UI", sans-serif');
      txt(c, '2 UI · persistence', 8, hh - 8, COL.muted, '10px Consolas, monospace');
      if (cfg.kind === 'eq') {
        const dEye = 3 / (L.M - 1);
        const open = Math.max(0, 2 * dEye - 2 * 3.1 * cfg.sigma); // ~1e-3-ish inner eye estimate
        txt(c, 'inner eye ≈ ' + Math.round(open / (2 * dEye) * 100) + '%', w - 8, hh - 8, open > 0.3 ? COL.good : COL.bad, '10px Consolas, monospace', 'right');
      }
    }
    function drawBerCurve() {
      const c = rctx, w = RW, hh = 230;
      c.fillStyle = '#04070a'; c.fillRect(0, 0, w, hh);
      const x0 = 44, y0 = 12, x1 = w - 10, y1 = hh - 28;
      const sx = s => x0 + (s - 8) / 28 * (x1 - x0), sy = lb => y0 + (-lb) / 15 * (y1 - y0) - (y1 - y0) / 15 * 0;
      const Y = lb => y0 + (Math.min(0, lb) / -15) * (y1 - y0);
      c.strokeStyle = 'rgba(255,255,255,0.06)';
      for (let e = 0; e <= 15; e += 3) { c.beginPath(); c.moveTo(x0, Y(-e)); c.lineTo(x1, Y(-e)); c.stroke(); txt(c, '1e-' + e, x0 - 4, Y(-e) + 3, COL.muted, '9px Consolas, monospace', 'right'); }
      for (let s = 8; s <= 36; s += 4) { txt(c, s + '', sx(s), hh - 14, COL.muted, '9px Consolas, monospace', 'center'); }
      txt(c, 'SNR (dB)', (x0 + x1) / 2, hh - 2, COL.muted, '10px "Segoe UI", sans-serif', 'center');
      [[4, COL.data, 'PAM4'], [2, COL.violet, 'NRZ']].forEach(([M, cc, nm]) => {
        c.strokeStyle = cc; c.lineWidth = M === L.M ? 2 : 1; c.globalAlpha = M === L.M ? 1 : 0.5; c.beginPath();
        for (let s = 8; s <= 36; s += 0.25) { const b = berFromSnr(unDB(s), M); const lb = Math.log10(Math.max(1e-16, b)); if (s === 8) c.moveTo(sx(s), Y(lb)); else c.lineTo(sx(s), Y(lb)); }
        c.stroke(); c.globalAlpha = 1;
        txt(c, nm, M === 4 ? sx(30) : sx(15), M === 4 ? Y(-12) : Y(-13), cc, '10px Consolas, monospace');
      });
      c.setLineDash([4, 4]); c.strokeStyle = COL.warn; c.beginPath(); c.moveTo(x0, Y(Math.log10(2.4e-4))); c.lineTo(x1, Y(Math.log10(2.4e-4))); c.stroke(); c.setLineDash([]);
      txt(c, 'KP4 threshold 2.4e-4', x1 - 4, Y(Math.log10(2.4e-4)) - 4, COL.warn, '10px Consolas, monospace', 'right');
      const se = C.clamp(L.snrEffDb, 8, 36), lb = Math.log10(Math.max(1e-16, L.ber));
      c.save(); c.shadowColor = COL.accent; c.shadowBlur = 12; c.fillStyle = COL.accent; c.beginPath(); c.arc(sx(se), Y(lb), 5, 0, 7); c.fill(); c.restore();
      txt(c, 'operating point', sx(se) + 8, Y(lb) + 4, COL.accent, '10px Consolas, monospace');
    }

    // ---------- detail panel
    function select(id) {
      st.sel = id;
      const s = BYID[id];
      const lat = s.lat(st, L, q), pj = s.pj(st);
      detail.innerHTML = '';
      detail.appendChild(h('div', { class: 'df-cardhead' }, h('b', { class: s.dom === 'optics' ? 'd-optics' : 'd-data' }, labelOf(s, st).replace('\n', ' ')),
        h('span', { class: 'pill' }, GROUPS[s.grp](st)), h('span', { class: 'pill df-dom-' + (s.dom === 'optics' ? 'o' : 'e') }, s.dom === 'optics' ? 'optical' : 'electrical')));
      detail.appendChild(h('p', { html: s.what }));
      const kp = h('div', { class: 'df-dkpis' },
        h('div', { class: 'df-dk' }, h('small', null, 'Latency here'), h('b', { class: 'df-dk-lat' }, fmtNs(lat)), h('span', { html: C.badge('typ') })),
        h('div', { class: 'df-dk' }, h('small', null, 'Energy / bit'), h('b', null, pj ? pj.toFixed(1) + ' pJ/b' : '≈0 (passive)'), h('span', { html: C.badge('typ') })),
        h('div', { class: 'df-dk df-dk-wide' }, h('small', null, 'Signal representation'), h('b', { class: 'df-rep' }, s.rep)));
      detail.appendChild(kp);
      detail.appendChild(h('div', { class: 'df-fm' }, h('div', null, h('small', null, 'What goes wrong'), h('p', null, s.fail)), h('div', null, h('small', null, 'Monitored / controlled by'), h('p', null, s.mon))));
      C.linkify(detail);
      scopeTitle.innerHTML = ''; scopeTitle.appendChild(h('span', { class: 'df-probe' }, '● probe: ' + labelOf(s, st).replace('\n', ' ')));
      // representation chain
      chainEl.innerHTML = '';
      const act = active();
      let last = '';
      act.forEach((x, i) => {
        if (x.rs === last && x.id !== id) return; last = x.rs;
        if (chainEl.childNodes.length) chainEl.appendChild(h('span', { class: 'df-arrow' }, '→'));
        chainEl.appendChild(h('span', { class: 'df-chip' + (x.id === id || (x.rs === s.rs && Math.abs(act.indexOf(s) - i) < 2) ? ' on' : '') + (x.dom === 'optics' ? ' o' : ''), onclick: () => select(x.id), title: labelOf(x, st).replace('\n', ' ') }, x.rs));
      });
      cfgKey = '';
    }

    // ---------- metrics DOM
    const kpis = {};
    [['thr', 'Throughput', 'Gb/s'], ['lat', 'End-to-end latency', ''], ['p2p', 'ASIC port-to-port', ''], ['pre', 'Pre-FEC BER', ''], ['post', 'Post-FEC BER', ''],
      ['mar', 'FEC margin', 'dB'], ['prx', 'RX power / lane', 'dBm'], ['pj', 'Optics energy', 'pJ/b'], ['link', 'Link', '']].forEach(([k, l, u]) => {
      const v = h('div', { class: 'df-kv' }), sub = h('div', { class: 'df-ksub' });
      kpis[k] = { v, sub, el: h('div', { class: 'df-kpi' }, h('small', null, l), v, sub) };
      kpis[k].u = u; kpiRow.appendChild(kpis[k].el);
    });
    const latColors = { host: '#4fb3c8', link: '#ff6b3d', link2: '#ff8a5c', ingoe: '#ff9f6b', mod: '#f472b6', pcb: '#f9a8d4', mod2: '#f472b6', asic: '#76b900', egoe: '#ffb37a', next: '#888', queue: '#facc15' };
    function stackBar(el, leg, items, unit, total) {
      const tot = total || items.reduce((a, b) => a + b.v, 0) || 1;
      if (el.childNodes.length !== items.length) { el.innerHTML = ''; items.forEach(() => el.appendChild(h('div', { class: 'df-segm' }))); }
      items.forEach((it, i) => {
        const d = el.childNodes[i];
        d.style.width = (it.v / tot * 100) + '%'; d.style.background = it.c; d.title = it.n + ': ' + it.f;
        d.textContent = it.v / tot > 0.09 ? it.short : '';
      });
      leg.innerHTML = '';
      items.filter(it => it.v / tot > 0.015).sort((a, b) => b.v - a.v).slice(0, 8).forEach(it =>
        leg.appendChild(h('span', null, h('i', { style: { background: it.c } }), it.n + ' ', h('b', null, it.f))));
    }
    function updateMetrics() {
      const act = active();
      const latItems = [];
      let tot = 0, p2p = 0;
      act.forEach(s => {
        let v = s.lat(st, L, q);
        if (s.id === 'tm') { const qd = q.q / 100; v -= qd; if (qd > 0.5) latItems.push({ n: 'Queueing delay', short: 'queue', v: qd, c: latColors.queue, f: fmtNs(qd) }); tot += qd; p2p += qd; }
        if (s.grp === 'asic') p2p += v;
        tot += v;
        if (v > 0.2) latItems.push({ n: labelOf(s, st).replace('\n', ' '), short: labelOf(s, st).split('\n')[0], v, c: s.dom === 'optics' ? latColors[s.grp] || '#ff6b3d' : latColors[s.grp] || '#22d3ee', f: fmtNs(v) });
      });
      stackBar(latBar, latLeg, latItems, 'ns');
      const pjItems = [];
      let opt = 0, core = 0;
      act.concat(st.path === 'cpo' ? [ELS] : []).forEach(s => {
        const v = s.pj(st); if (!v) return;
        const isCore = ['parse', 'lookup', 'tm', 'sched', 'egp', 'fecd', 'fece'].includes(s.id);
        if (isCore) core += v; else opt += v;
        pjItems.push({ n: labelOf(s, st).replace('\n', ' ') + (isCore ? ' (ASIC core)' : ''), short: labelOf(s, st).split('\n')[0], v, c: isCore ? (pjItems.length % 2 ? '#76b900' : '#5a8f00') : (s.dom === 'optics' || s.id === 'els' ? '#ff6b3d' : s.grp === 'mod' || s.grp === 'mod2' ? '#f472b6' : '#22d3ee'), f: v.toFixed(1) + ' pJ/b' });
      });
      stackBar(pjBar, pjLeg, pjItems, 'pJ/b');
      const f = L.fec;
      const berTxt = b => (b <= 0 || b < 1e-30 ? '<1e-30' : C.fmt(b, 3));
      kpis.thr.v.textContent = (lk.up ? q.thr : 0).toFixed(0) + ' Gb/s';
      kpis.thr.sub.textContent = 'offered ' + Math.round(st.load * 100) + '% · goodput eff ' + (st.size / (st.size + 20) * 100).toFixed(1) + '%';
      kpis.lat.v.textContent = fmtNs(tot); kpis.lat.sub.innerHTML = 'NIC → next hop, ' + st.fiberL + ' m fiber ×2';
      kpis.p2p.v.textContent = fmtNs(p2p); kpis.p2p.sub.textContent = 'SerDes RX → SerDes TX (cut-through)';
      kpis.pre.v.textContent = berTxt(L.ber); kpis.pre.v.className = 'df-kv ' + (L.ber > 2.4e-4 ? 'bad' : L.ber > 1e-5 ? 'warn' : 'good');
      kpis.pre.sub.textContent = 'optical ' + berTxt(L.berOpt) + ' + host ' + berTxt(L.berHost);
      kpis.post.v.textContent = berTxt(f.berPost); kpis.post.v.className = 'df-kv ' + (f.berPost > 1e-12 ? 'bad' : f.berPost > 1e-15 ? 'warn' : 'good');
      kpis.post.sub.textContent = 'target ≤ 1e-13…1e-15';
      kpis.mar.v.textContent = (L.margin >= 0 ? '+' : '') + L.margin.toFixed(1) + ' dB'; kpis.mar.v.className = 'df-kv ' + (L.margin < 0 ? 'bad' : L.margin < 1.5 ? 'warn' : 'good');
      kpis.mar.sub.textContent = 'SNR ' + L.snrEffDb.toFixed(1) + ' vs ' + L.snrThrDb.toFixed(1) + ' dB thr';
      kpis.prx.v.textContent = L.Prx.toFixed(1) + ' dBm'; kpis.prx.v.className = 'df-kv ' + (L.los ? 'bad' : L.Prx < -9 ? 'warn' : '');
      kpis.prx.sub.textContent = 'OMA ' + dB(Math.max(1e-12, L.OMA) * 1e3).toFixed(1) + ' dBm · ' + (L.los ? 'LOS!' : 'sens. LOS −15 dBm');
      kpis.pj.v.textContent = opt.toFixed(1) + ' pJ/b'; kpis.pj.sub.textContent = '+ ASIC core ' + core.toFixed(1) + ' · ' + (st.path === 'cpo' ? 'CPO' : 'pluggable');
      const degraded = f.pFail > 1e-12 || L.margin < 1;
      kpis.link.v.textContent = !lk.up ? 'DOWN' : degraded ? 'DEGRADED' : 'UP';
      kpis.link.v.className = 'df-kv ' + (!lk.up ? 'bad' : degraded ? 'warn' : 'good');
      kpis.link.sub.textContent = lk.flaps + ' flap' + (lk.flaps === 1 ? '' : 's') + (q.paused && st.fc === 'pfc' ? ' · PFC paused' : '');
      const fmtc = n => n < 1e4 ? Math.round(n).toString() : C.fmt(n, 3);
      fecBox.innerHTML = '';
      const rows = [
        ['Codewords received', fmtc(lk.cw), ''], ['Corrected codewords', fmtc(lk.corr), lk.corr ? 'warn' : ''], ['Uncorrectable codewords', fmtc(lk.unc), lk.unc ? 'bad' : ''],
        ['Corrected CW rate', C.fmt(L.cwRate * Math.max(0, f.pAny - f.pFail), 3) + ' /s', ''], ['P(uncorrectable) / CW', f.pFail < 1e-30 ? '<1e-30' : C.fmt(f.pFail, 3), f.pFail > 1e-12 ? 'bad' : ''],
        ['Link flaps', String(lk.flaps), lk.flaps ? 'bad' : ''], ['ECN-marked packets', fmtc(q.ecn), q.ecn ? 'warn' : ''], ['PFC pause events', fmtc(q.pfc), q.pfc ? 'warn' : ''],
        ['Dropped packets', fmtc(q.drops), q.drops ? 'bad' : ''], ['Link time (real s)', lk.linkTime.toFixed(1), '']
      ];
      rows.forEach(r => fecBox.appendChild(h('div', { class: 'df-frow' }, h('span', null, r[0]), h('b', { class: r[2] }, r[1]))));
      linkBanner.className = 'df-banner' + (!lk.up ? ' show' : '');
      linkBanner.textContent = !lk.up ? (L.los ? '⚠ LOS — received power below sensitivity. Link down, retraining…' : '⚠ FEC failure (uncorrectable codewords) → link down, retraining… flap #' + lk.flaps) : '';
      // how values
      howVals.innerHTML = '<div class="eq">' + [
        'mode            ' + (st.path === 'cpo' ? 'CPO (MRM + ELS)' : 'Pluggable (EML + DSP)') + ', ' + st.rate + 'G ' + st.mod + ', ' + L.baud.toFixed(2) + ' GBd, B = ' + (L.BW / 1e9).toFixed(1) + ' GHz',
        'P_laser         ' + L.Plaunch.toFixed(1) + ' dBm   IL_tx ' + L.ILtx.toFixed(1) + '  link ' + L.link.toFixed(2) + '  IL_rx ' + L.ILrx.toFixed(2) + ' dB',
        'P_rx            ' + L.Prx.toFixed(2) + ' dBm   ER ' + L.ER + ' dB   δ ' + (L.delta * 1000).toFixed(0) + ' pm   η ' + L.eta.toFixed(3),
        'OMA             ' + (L.OMA * 1e3).toFixed(4) + ' mW   A = ' + (L.A * 1e6).toFixed(1) + ' µA',
        'σ_th/sh/RIN/xt  ' + [L.sTh, L.sSh, L.sRin, L.sXt].map(v => (v * 1e6).toFixed(2)).join(' / ') + ' µA',
        'SNR_rx          ' + dB(L.snrRx).toFixed(2) + ' dB   SNR_impl ' + L.snrImplDb.toFixed(1) + ' dB   → SNR ' + dB(L.snrOpt).toFixed(2) + ' dB',
        'Q-arg √SNR/(M−1) ' + L.xTot.toFixed(3) + '   BER_opt ' + berTxt(L.berOpt),
        'SNR_host        ' + L.snrHostDb.toFixed(1) + ' dB   BER_host ' + berTxt(L.berHost),
        'pre-FEC BER     ' + berTxt(L.ber) + '   p_s ' + C.fmt(f.ps, 3),
        'P_uncorr/CW     ' + (f.pFail < 1e-30 ? '<1e-30' : C.fmt(f.pFail, 3)) + '   post-FEC ' + berTxt(f.berPost),
        'margin          ' + L.margin.toFixed(2) + ' dB  (SNR_eff ' + L.snrEffDb.toFixed(2) + ' − thr ' + L.snrThrDb.toFixed(2) + ')'
      ].map(C.esc).join('\n') + '</div>';
      const lt = detail.querySelector('.df-dk-lat'); if (lt) lt.textContent = fmtNs(BYID[st.sel].lat(st, L, q));
    }
    function paramsChanged() { L = physics(st); fecVis.t = 0; cfgKey = ''; select(st.sel); updateMetrics(); drawBerCurve(); }

    // ---------- events
    function mpos(e) { const r = mainCv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    const onMove = e => { const [x, y] = mpos(e); hover = nodeAt(x, y); mainCv.style.cursor = hover ? 'pointer' : 'default'; };
    const onClick = e => { const [x, y] = mpos(e); const n = nodeAt(x, y); if (n) select(n.s.id); };
    const onLeave = () => { hover = null; };
    mainCv.addEventListener('mousemove', onMove); mainCv.addEventListener('click', onClick); mainCv.addEventListener('mouseleave', onLeave);
    cleanups.push(() => { mainCv.removeEventListener('mousemove', onMove); mainCv.removeEventListener('click', onClick); mainCv.removeEventListener('mouseleave', onLeave); });
    const onResize = () => { needFit = true; };
    let ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(onResize); ro.observe(root); }
    window.addEventListener('resize', onResize);
    cleanups.push(() => { window.removeEventListener('resize', onResize); if (ro) ro.disconnect(); });
    const onKey = e => { if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); playBtn.click(); } };
    document.addEventListener('keydown', onKey);
    cleanups.push(() => document.removeEventListener('keydown', onKey));

    function fitAll() {
      relayout();
      SW = fitCanvas(scopeCv, sctx, 250); SH = 250;
      EWc = fitCanvas(eyeCv, ectx, 250); EHc = 250;
      BW2 = fitCanvas(bufCv, bctx, 170);
      RW = fitCanvas(berCv, rctx, 230);
      drawBerCurve();
      needFit = false;
    }

    // ---------- main loop
    let metT = 0, histT = 0;
    select(st.sel);
    const stop = C.loop((dt, t) => {
      if (needFit) fitAll();
      if (st.playing) {
        const simUs = dt * st.speed * (st.gran === 'packet' ? 10 : 0.05);
        stepQueue(simUs);
        stepLink(dt);
        stepParticles(dt);
        stepScope(dt);
        elsPh += dt * st.speed;
        histT += dt;
        if (histT > 1 / 30) { histT = 0; qHist.push({ q: q.q, p: q.paused }); if (qHist.length > 300) qHist.shift(); }
      }
      drawMain(t);
      drawScope(t, st.playing ? dt : 0);
      drawEye();
      drawQueueChart(bctx, BW2, 170, true);
      metT += dt;
      if (metT > 0.25) { metT = 0; updateMetrics(); }
    });
    updateMetrics();

    return function cleanup() { stop(); cleanups.forEach(f => { try { f(); } catch (e) { /* ignore */ } }); };
  }

  C.registerSection({ id: 'dataflow', title: 'Data-Flow Simulator', icon: '⚡', order: 30, render });
})();
