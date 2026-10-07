import { useEffect, useRef } from 'react';

/* ---------------------------------------------------------------------------
   ONE ESCAPE, ONE SURFACE.

   Every dismissible surface in this app used to bind its own capture-phase
   keydown listener to `window` and call `stopPropagation` on Escape, with a
   comment explaining that this was to stop App's handler also sending the
   reader back to the map. It does not do that, and it cannot: propagation is
   about moving between *targets*, and these listeners are all on the same one.
   Two overlays open at once therefore both closed on a single Escape, and on
   one measured occasion the key closed an overlay and left the book in the same
   keystroke.

   `stopImmediatePropagation` is the tool that actually silences siblings, but
   on its own it hands the event to whichever listener registered first, and
   registration order is mount order, which has nothing to do with what is on
   top. So the order has to be kept explicitly.

   This is that order. A surface pushes its dismiss when it opens and pops it
   when it closes; one listener, bound once, gives Escape to the top of the
   stack and to nothing else. When the stack is empty it does nothing at all,
   and App's own handler — zen mode, then back to the map — runs exactly as
   before. That fallback stays in App deliberately: leaving the book is not a
   dismissal of anything, so it does not belong on a dismiss stack.
--------------------------------------------------------------------------- */

type Dismiss = () => void;

const stack: Dismiss[] = [];
let bound = false;

function onKey(e: KeyboardEvent) {
  if (e.key !== 'Escape' || stack.length === 0) return;
  /* A field that handles its own Escape — a search input clearing itself —
     would be inside the topmost surface anyway, so the surface decides. */
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  stack[stack.length - 1]();
}

/**
 * Registers a dismiss handler as the topmost surface.
 * Returns the function that removes it again.
 */
export function pushDismiss(fn: Dismiss): () => void {
  stack.push(fn);
  if (!bound && typeof window !== 'undefined') {
    window.addEventListener('keydown', onKey, true);
    bound = true;
  }
  return () => {
    const i = stack.lastIndexOf(fn);
    if (i >= 0) stack.splice(i, 1);
  };
}

/** How many dismissible surfaces are open. Zero means Escape is App's. */
export function dismissDepth(): number {
  return stack.length;
}

/**
 * The hook form.
 *
 * The handler is held in a ref so that a surface re-rendering — which every one
 * of these does constantly, being animated — does not pop and re-push itself
 * and quietly become the topmost surface again ahead of something opened after
 * it. Registration happens once per open, which is the whole point.
 */
export function useDismiss(active: boolean, fn: Dismiss): void {
  const held = useRef(fn);
  held.current = fn;
  useEffect(() => {
    if (!active) return;
    return pushDismiss(() => held.current());
  }, [active]);
}
