import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

/**
 * Overlay focus management for the drawers and the search well.
 *
 * Three things a keyboard reader needs and none of the overlays had:
 *   1. focus moves into the overlay when it opens,
 *   2. Tab cannot walk out of it into the page underneath,
 *   3. focus returns to whatever opened it on close, so position is not lost.
 *
 * Returns the ref to attach to the overlay's outermost element.
 */
export function useOverlayFocus<T extends HTMLElement>(isOpen: boolean) {
  const containerRef = useRef<T | null>(null);
  const restoreToRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    restoreToRef.current = document.activeElement as HTMLElement | null;

    const container = containerRef.current;
    if (!container) return;

    const focusables = () =>
      (Array.from(container.querySelectorAll(FOCUSABLE)) as HTMLElement[]).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );

    // Move focus in without snapping the page: the first control, else the panel.
    const first = focusables()[0];
    if (first) first.focus();
    else {
      container.setAttribute('tabindex', '-1');
      container.focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey && (active === firstEl || !container.contains(active))) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && (active === lastEl || !container.contains(active))) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      const restoreTo = restoreToRef.current;
      if (restoreTo && document.contains(restoreTo)) restoreTo.focus();
    };
  }, [isOpen]);

  return containerRef;
}
