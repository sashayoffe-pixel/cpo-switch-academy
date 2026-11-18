/* Appendix chapters for the Networking & Protocols course (read by js/sections/net-course.js). */
(function () {
  'use strict';
  const C = window.CPO;
  const B = C.badge;

  function svgFrameStack() {
    const rows = [
      ['RoCEv2', [['Eth 14', 14, '#ff6b3d'], ['IPv4 20', 20, '#a78bfa'], ['UDP 8', 8, '#22d3ee'], ['BTH 12', 12, '#22d3ee'], ['payload', 60, '#76b900'], ['ICRC 4', 4, '#22d3ee'], ['FCS 4', 4, '#ff6b3d']]],
      ['TCP/IP', [['Eth 14', 14, '#ff6b3d'], ['IPv4 20', 20, '#a78bfa'], ['TCP 20–60', 32, '#22d3ee'], ['payload', 60, '#76b900'], ['FCS 4', 4, '#ff6b3d']]],
      ['InfiniBand', [['LRH 8', 8, '#ff6b3d'], ['BTH 12', 12, '#22d3ee'], ['payload', 60, '#76b900'], ['ICRC 4', 4, '#22d3ee'], ['VCRC 2', 2, '#ff6b3d']]]
    ];
    let s = '<svg viewBox="0 0 1000 220" role="img" aria-label="Header stacks">';
    rows.forEach(([n, parts], i) => {
      const y = 20 + i * 66; s += '<text x="10" y="' + (y + 30) + '" fill="#e6edf5" font-size="14" font-weight="700">' + n + '</text>';
      const tot = parts.reduce((a, p) => a + p[1], 0); let x = 120;
      parts.forEach(([l, w, c]) => { const ww = 860 * w / tot; s += '<rect x="' + x + '" y="' + y + '" width="' + (ww - 3) + '" height="44" rx="4" fill="' + c + '" fill-opacity=".25" stroke="' + c + '"/><text x="' + (x + ww / 2) + '" y="' + (y + 27) + '" text-anchor="middle" fill="#e6edf5" font-size="12">' + l + '</text>'; x += ww; });
    });
    return s + '</svg>';
  }

  const CH = [];

  CH.push({
    id: 'apx-numbers', short: 'Networking numbers', title: 'Networking numbers you should feel in your bones',
    lead: 'Bits vs bytes, rates vs symbol rates, latency, and the bandwidth-delay product. The arithmetic behind every networking discussion.',
    html:
      '<h3>1 · Bits, bytes and rates</h3>' +
      '<table class="table"><tr><td>b vs B</td><td>8 bits = 1 byte. Network speeds use <b>bits</b> (800 Gb/s); memory and buses use <b>bytes</b> (1.8 TB/s). 800 Gb/s = 100 GB/s.</td></tr>' +
      '<tr><td>Gb/s vs GBd</td><td>Bit rate vs symbol rate. PAM4 carries 2 bits per symbol, so 200 Gb/s per lane is ~106–113 GBd once FEC overhead is included ' + B('typ') + '.</td></tr>' +
      '<tr><td>MAC rate vs line rate</td><td>"800G" is the MAC data rate. The line carries a bit more because of coding and FEC.</td></tr>' +
      '<tr><td>Bidirectional</td><td>Port speeds are per direction: an 800G port sends 800 and receives 800 at the same time.</td></tr></table>' +
      '<h3>2 · Latency building blocks</h3>' +
      '<table class="table"><tr><th>Item</th><th>Typical value ' + B('typ') + '</th></tr>' +
      '<tr><td>Light in fiber</td><td>~5 ns per metre (100 m ≈ 0.5 µs)</td></tr>' +
      '<tr><td>One switch hop (cut-through)</td><td>a few hundred ns to ~1 µs</td></tr>' +
      '<tr><td>FEC decoding</td><td>tens to ~100+ ns per hop</td></tr>' +
      '<tr><td>Serializing a 4 KB packet at 800G</td><td>~41 ns</td></tr>' +
      '<tr><td>RDMA end to end, same data hall</td><td>a few µs</td></tr>' +
      '<tr><td>Kernel TCP round trip</td><td>tens of µs</td></tr></table>' +
      '<h3>3 · Bandwidth-delay product: how much data is "in the pipe"</h3>' +
      '<div class="eq">in-flight data = bandwidth × round-trip time\n800 Gb/s × 5 µs = 4,000,000 bits = 500 kB per port</div>' +
      '<p>Buffers, flow-control credits and congestion windows have to cover this amount. Otherwise the sender stalls waiting for acknowledgements or credits even though the link is free. Longer links (more fiber) need more buffering.</p>' +
      '<h3>4 · Handy conversions</h3>' +
      '<div class="eq">1 Tb/s = 1000 Gb/s = 125 GB/s\npackets/s = rate / (packet bits incl. overhead)   → 800G with 4 KB packets ≈ 24 M packets/s\nbit time at 800 Gb/s ≈ 1.25 ps (per port; each 200G lane ≈ 5 ps per bit)</div>'
  });

  CH.push({
    id: 'apx-ethip', short: 'Ethernet & IP details', title: 'Ethernet and IP details',
    lead: 'Header layouts, addressing and subnet math, ARP, MTU, and how ECMP hashing really works.',
    html:
      '<h3>1 · What the headers look like</h3><div class="af-fig">' + svgFrameStack() + '</div>' +
      '<p>RoCEv2 is "InfiniBand transport inside UDP/IP/Ethernet": the BTH is the same transport header InfiniBand uses, and UDP destination port 4791 marks the packet as RoCE ' + B('typ') + '.</p>' +
      '<h3>2 · IP addressing and subnets</h3>' +
      '<div class="eq">10.0.4.7/24   → network 10.0.4.0, hosts 10.0.4.1 … 10.0.4.254, broadcast 10.0.4.255\n/24 = 256 addresses   /30 = 4 (point-to-point links)   /16 = 65,536</div>' +
      '<p>Data-center fabrics often give every switch-to-switch link its own tiny subnet (/31 or /30) and every rack or server its own /24-style block, then distribute the routes with BGP.</p>' +
      '<h3>3 · ARP and neighbour discovery</h3>' +
      '<p>To send to an IP address on the same subnet, a host must know the MAC address that goes with it. <b>ARP</b> asks "who has 10.0.4.7?", and the owner replies with its MAC. IPv6 does the same with Neighbour Discovery.</p>' +
      '<h3>4 · MTU and jumbo frames</h3>' +
      '<p>The MTU is the largest payload a link carries in one frame: 1500 bytes by default, ~9000 with jumbo frames. RoCE commonly uses a 4096-byte RDMA MTU inside jumbo Ethernet frames. Mismatched MTUs along a path are a classic cause of mysterious drops.</p>' +
      '<h3>5 · ECMP hashing</h3>' +
      '<div class="eq">path = hash(src IP, dst IP, protocol, src port, dst port) mod (number of equal paths)</div>' +
      '<p>With thousands of small flows this spreads evenly. With a few huge, long-lived AI flows, two of them can land on the same path by chance, and that link saturates. Remedies: more entropy in the hash (e.g. varying UDP source ports per queue pair), <b>adaptive routing / packet spraying</b>, and in-order delivery restored by the NIC.</p>' +
      '<h3>6 · Priorities and traffic classes</h3>' +
      '<p>The VLAN tag\'s 3-bit priority (PCP) or the IP DSCP field put traffic into classes. Lossless RDMA usually gets its own class with PFC enabled, and a separate class carries congestion notifications.</p>'
  });

  CH.push({
    id: 'apx-ibnv', short: 'InfiniBand, RDMA & NVLink details', title: 'InfiniBand, RDMA and NVLink details',
    lead: 'Queue pairs and verbs, InfiniBand management, SHARP, GPUDirect, and how NVLink differs from a network.',
    html:
      '<h3>1 · RDMA in four words: queue pairs and verbs</h3>' +
      '<ul><li>An application registers memory (pins it, gets keys) and creates a <b>queue pair (QP)</b>: a send queue and a receive queue.</li>' +
      '<li>It posts <b>work requests</b>: SEND, RDMA WRITE (put data into remote memory), RDMA READ (fetch remote memory), atomics.</li>' +
      '<li>The NIC executes them, handles reliability (sequence numbers, ACKs, retransmits for reliable-connected QPs), and posts a <b>completion</b>.</li>' +
      '<li>The CPU only posts and polls. Data moves NIC ↔ memory directly, and with GPUDirect, NIC ↔ GPU memory.</li></ul>' +
      '<h3>2 · InfiniBand management</h3>' +
      '<table class="table"><tr><td>Subnet Manager (SM)</td><td>discovers the topology, assigns LIDs, programs forwarding tables, reacts to link changes</td></tr>' +
      '<tr><td>Partitions (P_Keys)</td><td>isolate tenants, a bit like VLANs</td></tr>' +
      '<tr><td>Virtual lanes / service levels</td><td>separate traffic classes, each with its own credits</td></tr>' +
      '<tr><td>UFM</td><td>NVIDIA\'s fabric-management platform for InfiniBand: monitoring, telemetry, health ' + B('nv') + '</td></tr></table>' +
      '<h3>3 · SHARP: let the network do the math</h3>' +
      '<p>In an all-reduce, every GPU needs the sum of everyone\'s data. With SHARP the switches add the numbers as packets pass through, so each GPU sends its data up once and receives the result once. That roughly halves the traffic compared with a ring all-reduce ' + B('typ') + ', and it cuts latency. NVLink Switch offers a similar in-switch reduction inside the rack.</p>' +
      '<h3>4 · NVLink vs the network</h3>' +
      '<table class="table"><tr><th></th><th>NVLink (scale-up)</th><th>Ethernet / InfiniBand (scale-out)</th></tr>' +
      '<tr><td>Reach</td><td>rack (copper, ≤ ~2 m)</td><td>data hall to campus (fiber, CPO)</td></tr>' +
      '<tr><td>Bandwidth per GPU</td><td>1.8 TB/s (NVLink 5) ' + B('nv') + '</td><td>400–800 Gb/s = 50–100 GB/s ' + B('typ') + '</td></tr>' +
      '<tr><td>Model</td><td>memory semantics: load/store/atomics to remote GPU memory</td><td>messages: RDMA send/write/read through a NIC</td></tr>' +
      '<tr><td>Scale</td><td>72 GPUs per NVL72 domain ' + B('nv') + '</td><td>tens to hundreds of thousands of GPUs</td></tr>' +
      '<tr><td>Best for</td><td>tensor- and expert-parallel traffic (very chatty)</td><td>data-parallel all-reduce, pipeline stages, storage</td></tr></table>' +
      '<p>NVLink generations: NVLink 4 (Hopper) 900 GB/s per GPU, NVLink 5 (Blackwell) 1.8 TB/s per GPU ' + B('nv') + '. NVLink-C2C connects Grace and Blackwell at 900 GB/s ' + B('nv') + '. NVLink Fusion opens NVLink to partner silicon ' + B('nv') + '.</p>' +
      '<h3>5 · GPUDirect family</h3>' +
      '<ul><li><b>GPUDirect RDMA</b>: the NIC reads and writes GPU memory directly.</li><li><b>GPUDirect Storage</b>: storage to GPU memory without a CPU bounce buffer.</li><li><b>Peer-to-peer</b>: GPU to GPU over PCIe or NVLink inside a server.</li></ul>'
  });

  CH.push({
    id: 'apx-buses', short: 'Every bus at a glance', title: 'Every bus in the system at a glance',
    lead: 'One reference table from the slowest wire to the fastest port, with what each is used for in a CPO switch.',
    html:
      '<table class="table"><tr><th>Interface</th><th>Wires / lanes</th><th>Typical speed ' + B('typ') + '</th><th>Reach</th><th>Used for in a CPO switch</th></tr>' +
      '<tr><td><b>GPIO</b></td><td>1 per signal</td><td>static</td><td>on board</td><td>resets, interrupts, presence detect, LEDs</td></tr>' +
      '<tr><td><b>UART</b></td><td>2 (Tx, Rx)</td><td>115.2 kb/s</td><td>on board / cable</td><td>serial console for the CPU, BMC, microcontrollers</td></tr>' +
      '<tr><td><b>I2C / SMBus</b></td><td>2 (SCL, SDA)</td><td>100 kHz – 1 MHz</td><td>on board</td><td>temperature sensors, EEPROMs (FRU data), optics management (CMIS), fan controllers</td></tr>' +
      '<tr><td><b>PMBus</b></td><td>I2C + alert</td><td>100 kHz – 1 MHz</td><td>on board</td><td>read/set voltage regulators, power telemetry</td></tr>' +
      '<tr><td><b>I3C</b></td><td>2</td><td>up to ~12.5 MHz</td><td>on board</td><td>faster, more efficient successor to I2C for sensors and optics</td></tr>' +
      '<tr><td><b>MDIO</b></td><td>2 (MDC, MDIO)</td><td>~2.5–10 MHz</td><td>on board</td><td>configure PHYs, retimers, gearboxes</td></tr>' +
      '<tr><td><b>SPI / QSPI</b></td><td>4 (or 6 for quad)</td><td>10s – 100+ MHz</td><td>on board</td><td>boot flash for BMC, CPU, CPLD/FPGA images</td></tr>' +
      '<tr><td><b>JTAG</b></td><td>4–5</td><td>~10s of MHz</td><td>header / cable</td><td>chip debug, boundary-scan test, programming CPLDs</td></tr>' +
      '<tr><td><b>LPC / eSPI</b></td><td>a few</td><td>~33–66 MHz</td><td>on board</td><td>CPU ↔ BMC/CPLD low-speed link</td></tr>' +
      '<tr><td><b>Management Ethernet</b></td><td>RJ45</td><td>1–10 Gb/s</td><td>100 m copper</td><td>out-of-band access: SSH, Redfish, telemetry, OS install</td></tr>' +
      '<tr><td><b>PCIe</b></td><td>x1 … x16 lanes</td><td>Gen5 ~4 GB/s per lane, Gen6 ~8 GB/s per lane</td><td>on board / short cable</td><td>host CPU ↔ switch ASIC; in servers GPU ↔ NIC ↔ SSD</td></tr>' +
      '<tr><td><b>NVLink</b></td><td>many high-speed lanes</td><td>1.8 TB/s per GPU ' + B('nv') + '</td><td>rack (copper)</td><td>GPU ↔ GPU scale-up (not in the CPO switch itself)</td></tr>' +
      '<tr><td><b>Data ports</b></td><td>4 × 200G lanes</td><td>800 Gb/s per port, 115 Tb/s per switch ' + B('nv') + '</td><td>fiber (CPO)</td><td>Ethernet / InfiniBand scale-out traffic</td></tr></table>' +
      '<h3>How to tell them apart in a schematic or log</h3>' +
      '<ul><li>Two wires named <b>SCL/SDA</b> → I2C family. <b>SCLK/MOSI/MISO/CS</b> → SPI. <b>TCK/TMS/TDI/TDO</b> → JTAG. <b>MDC/MDIO</b> → MDIO.</li>' +
      '<li>Addresses like <b>0x50</b>, <b>0x51</b> → I2C devices (0x50 is the classic EEPROM / optics address).</li>' +
      '<li>"PCIe link width x8 (expected x16)" or "speed Gen4 (expected Gen5)" → a degraded host link, a hidden bottleneck worth chasing.</li></ul>' +
      '<p class="muted">Deeper hardware detail on these buses is in the <a href="#architecture/mgmt-buses">Architecture Explorer: management buses</a>.</p>'
  });

  C.netAppendix = CH;
})();
