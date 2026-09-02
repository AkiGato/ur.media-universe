/**
 * DOM audit — TY-08, "Labels Have a Collision Budget".
 *
 * Compares every <text> rect in a figure against every other and against the
 * SVG frame. Both collisions and frame overruns shipped invisibly before this
 * audit existed, because a label that overlaps its neighbour still *renders*.
 *
 * Run: paste into the browser console with a figure or the map on screen.
 * Returns { ok, checked, collisions[], overruns[] }.
 */
(function labelAudit() {
  const svgs = Array.from(document.querySelectorAll('svg[viewBox]'));
  if (svgs.length === 0) return { ok: false, error: 'No SVG on screen.' };

  const collisions = [];
  const overruns = [];
  let checked = 0;

  const overlaps = (a, b) =>
    a.x < b.x + b.width && b.x < a.x + a.width &&
    a.y < b.y + b.height && b.y < a.y + a.height;

  for (const svg of svgs) {
    const vb = svg.viewBox.baseVal;
    const texts = Array.from(svg.querySelectorAll('text')).filter(
      (t) => (t.textContent || '').trim().length > 0 && t.getClientRects().length > 0
    );

    const boxes = texts.map((t) => {
      const b = t.getBBox();
      return { label: t.textContent.trim().slice(0, 40), x: b.x, y: b.y, width: b.width, height: b.height };
    });

    checked += boxes.length;

    for (let i = 0; i < boxes.length; i++) {
      const a = boxes[i];

      if (vb && vb.width) {
        const out =
          a.x < vb.x - 1 ||
          a.y < vb.y - 1 ||
          a.x + a.width > vb.x + vb.width + 1 ||
          a.y + a.height > vb.y + vb.height + 1;
        if (out) overruns.push(a.label);
      }

      for (let j = i + 1; j < boxes.length; j++) {
        if (overlaps(a, boxes[j])) collisions.push([a.label, boxes[j].label]);
      }
    }
  }

  return { ok: collisions.length === 0 && overruns.length === 0, checked, collisions, overruns };
})();
