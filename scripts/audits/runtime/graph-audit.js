/**
 * DOM audit — OG-02 "Nothing Floats" / OG-01 "One Organism, One Routine".
 *
 * Reconstructs the map's graph from RENDERED geometry (not from the source
 * NODES table, which is what a source-level check would trust) and BFS-checks
 * that every soma is reachable from the core. An isolated bibliography node
 * survived several rounds of "looks connected" before this audit existed.
 *
 * Run: paste into the browser console with the Orrery on screen.
 * Returns { ok, nodes, edges, unreachable[] }.
 */
(function graphAudit() {
  // The ambience flowers are SVGs too — the organism is the biggest one.
  const svg = Array.from(document.querySelectorAll('svg[viewBox]')).sort(
    (a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width
  )[0];
  if (!svg) return { ok: false, error: 'No Orrery SVG on screen.' };

  const toPoint = (el) => {
    const b = el.getBBox();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };

  // Every interactive soma carries data-node-id — including auxiliary ones like
  // the bibliography, which is precisely the node that once floated.
  const nodes = Array.from(svg.querySelectorAll('[data-node-id]')).map((el) => ({
    id: el.getAttribute('data-node-id'),
    ...toPoint(el)
  }));

  if (nodes.length === 0) {
    return { ok: false, error: 'No [data-node-id] somas found — is the Orrery on screen?' };
  }

  // An edge is a path whose two endpoints each land near a node.
  const paths = Array.from(svg.querySelectorAll('path')).filter((p) => {
    const d = p.getAttribute('d') || '';
    return d.length > 20 && p.getAttribute('fill') === 'none';
  });

  const NEAR = 34; // user units; bundles converge exactly at the somas
  const nearest = (pt) => {
    let best = null;
    let bestD = Infinity;
    for (const n of nodes) {
      const d = Math.hypot(n.x - pt.x, n.y - pt.y);
      if (d < bestD) { bestD = d; best = n; }
    }
    return bestD <= NEAR ? best : null;
  };

  /*
   * A connection may be drawn in several chained pieces (the taper draws two,
   * each with its own stroke width), so a single path's endpoints need not
   * touch two somas. Free endpoints that coincide are therefore merged into
   * junction vertices first, and reachability is walked over somas AND
   * junctions. Without this, every tapered link reports as disconnected.
   */
  const adjacency = new Map(nodes.map((n) => [n.id, new Set()]));
  const JOIN = 6; // px: two segment ends this close are the same point
  const junctions = [];
  const junctionAt = (pt) => {
    for (const j of junctions) {
      if (Math.hypot(j.x - pt.x, j.y - pt.y) <= JOIN) return j;
    }
    const j = { id: `jx${junctions.length}`, x: pt.x, y: pt.y };
    junctions.push(j);
    adjacency.set(j.id, new Set());
    return j;
  };
  const endpointVertex = (pt) => nearest(pt) || junctionAt(pt);

  let edgeCount = 0;
  for (const p of paths) {
    let len;
    try { len = p.getTotalLength(); } catch { continue; }
    if (!len) continue;
    const a = endpointVertex(p.getPointAtLength(0));
    const b = endpointVertex(p.getPointAtLength(len));
    if (a && b && a.id !== b.id) {
      adjacency.get(a.id).add(b.id);
      adjacency.get(b.id).add(a.id);
      edgeCount++;
    }
  }

  // BFS from the core (falling back to the most central node if it is absent).
  const cx = nodes.reduce((s, n) => s + n.x, 0) / nodes.length;
  const cy = nodes.reduce((s, n) => s + n.y, 0) / nodes.length;
  const core =
    nodes.find((n) => n.id === 'core') ||
    nodes.reduce(
      (best, n) => (Math.hypot(n.x - cx, n.y - cy) < Math.hypot(best.x - cx, best.y - cy) ? n : best),
      nodes[0]
    );

  const seen = new Set([core.id]);
  const queue = [core.id];
  while (queue.length) {
    for (const next of adjacency.get(queue.shift()) || []) {
      if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }

  const unreachable = nodes.filter((n) => !seen.has(n.id)).map((n) => n.id);
  return { ok: unreachable.length === 0, nodes: nodes.length, edges: edgeCount, unreachable };
})();
