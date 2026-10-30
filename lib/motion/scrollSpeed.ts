/**
 * Watches scrolling anywhere on the page: the window, or a panel that scrolls on its own (the
 * J-card's). `read()` returns the pixels scrolled since the last read (down positive), so
 * read once a frame it is the scroll speed in px per frame.
 * `stop()` removes the listener.
 */
export function trackScroll(): { read: () => number; stop: () => void } {
  const tops = new WeakMap<Element, number>();
  const page = document.scrollingElement;
  if (page) tops.set(page, page.scrollTop);
  let moved = 0;
  const onScroll = (e: Event) => {
    const el = e.target === document ? document.scrollingElement : e.target instanceof Element ? e.target : null;
    if (!el) return;
    const top = el.scrollTop;
    const was = tops.get(el);
    tops.set(el, top);
    if (was !== undefined) moved += top - was;
  };
  // Scroll events don't bubble from elements; capturing on the document sees them all.
  document.addEventListener("scroll", onScroll, { capture: true, passive: true });
  return {
    read: () => {
      const m = moved;
      moved = 0;
      return m;
    },
    stop: () => document.removeEventListener("scroll", onScroll, { capture: true }),
  };
}
