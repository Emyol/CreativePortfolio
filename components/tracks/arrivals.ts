import { gsap } from "@/lib/motion/gsap";
import type { Arrival } from "@/lib/motion/useHold";
import type { TrackId } from "@/lib/tape";
import { flickerDots, revealDots } from "./DotPhoto";

/** A mixtape row printed in: its title revealed a character's width at a time (visual only; the text is always there). */
function print(tl: gsap.core.Timeline, li: HTMLElement, at: number) {
  const title = li.querySelector<HTMLElement>("[data-print]");
  const number = li.querySelector<HTMLElement>("[class*='number']");
  if (title) {
    const chars = Math.max(1, (title.textContent ?? "").length);
    tl.fromTo(title, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", ease: `steps(${chars})`, duration: 0.5 }, at);
  }
  if (number) tl.fromTo(number, { scale: 1.6, opacity: 0 }, { scale: 1, opacity: 1, ease: "back.out(3)", duration: 0.15 }, at);
}

/** Clears what record() set, so a print stands as it would with no arrival at all. */
function unrecord(li: HTMLElement) {
  li.style.clipPath = "";
  const media = li.querySelector<HTMLElement>("[data-media]");
  if (media) media.style.filter = "";
}

/** A thing dropped onto the table from above: big and soft-shadowed, then set down. (The li moves; the thing inside is what's thrown.) */
function drop(tl: gsap.core.Timeline, li: HTMLElement, at: number) {
  tl.fromTo(li, { opacity: 0, scale: 1.35, yPercent: -30, rotate: (li.dataset.photo === undefined ? 1 : -1) * 6 }, { opacity: 1, scale: 1, yPercent: 0, rotate: 0, ease: "power3.in", duration: 0.35 }, at)
    .fromTo(li, { scaleY: 0.97 }, { scaleY: 1, ease: "back.out(4)", duration: 0.12 }, at + 0.35);
}

/** A print recorded in to `share` (0 to 1): revealed from the left, dark and grey to full colour. */
function record(li: HTMLElement, share: number) {
  const f = gsap.utils.clamp(0, 1, share);
  // Recorded in full, it clips nothing: an inset left in place would clip the focus ring.
  li.style.clipPath = f >= 1 ? "" : `inset(0 ${((1 - f) * 100).toFixed(1)}% 0 0)`;
  const media = li.querySelector<HTMLElement>("[data-media]");
  if (media) media.style.filter = f >= 1 ? "" : `brightness(${(0.35 + 0.65 * f).toFixed(3)}) saturate(${f.toFixed(3)})`;
}

/**
 * Each track's own arrival, played while it holds (docs/superpowers/specs/2026-10-18-motion-design.md).
 * Distances are the desktop hold lengths measured in the mockups.
 */
export const ARRIVALS: Record<TrackId, Arrival> = {
  // The letter unfolds like a folded J-card insert: the lower fold swings down and open,
  // while the candid's screen powers on, a scanline lighting it row by row, then flickers.
  about: {
    distance: 650,
    hold: (tl, { root }) => {
      const top = root.querySelector("[data-fold=top]");
      const bottom = root.querySelector("[data-fold=bottom]");
      if (top) tl.fromTo(top, { opacity: 0.4 }, { opacity: 1, duration: 0.3 }, 0);
      if (bottom) tl.fromTo(bottom, { rotateX: -178, transformPerspective: 1400, transformOrigin: "50% 0%" }, { rotateX: 0, ease: "power2.inOut", duration: 1 }, 0.1);
      const screen = root.querySelector("[data-dot-photo]");
      if (!screen) return;
      const power = { on: 0 };
      revealDots(screen, 0);
      tl.to(power, { on: 1, ease: "none", duration: 0.8, onUpdate: () => revealDots(screen, power.on) }, 0.15).call(() => flickerDots(screen), undefined, 0.98);
      // Without the hold (reduced motion, or torn down), the screen is simply on.
      return () => revealDots(screen, 1);
    },
  },
  // A red REC playhead sweeps across and records each print in as it passes.
  events: {
    distance: 900,
    items: "li",
    hold: (tl, { root, held }) => {
      const rec = root.querySelector<HTMLElement>("[data-rec]");
      const list = root.querySelector<HTMLElement>("ul");
      if (!list) return;
      const head = { at: 0 };
      const paint = () => {
        const x = head.at * (list.offsetWidth + 40) - 20;
        // Hidden at either end, parked at the start so it never sticks out past the grid.
        const sweeping = head.at > 0 && head.at < 1;
        if (rec) gsap.set(rec, { x: sweeping ? x : 0, opacity: sweeping ? 1 : 0 });
        for (const li of held) record(li, (x - li.offsetLeft) / li.offsetWidth);
      };
      paint();
      tl.to(head, { at: 1, duration: 1, onUpdate: paint }, 0);
      // record() writes styles directly, which GSAP's revert can't undo.
      return () => root.querySelectorAll<HTMLElement>("li").forEach(unrecord);
    },
    enter: (tl, li) => {
      const row = { at: 0 };
      record(li, 0);
      tl.to(row, { at: 1, duration: 1, onUpdate: () => record(li, row.at) });
      return () => unrecord(li);
    },
  },
  // Each title prints out like a label maker, a character at a time, and its number punches in.
  mixtape: {
    distance: 800,
    items: "li",
    hold: (tl, { held }) => held.forEach((li, i) => print(tl, li, i * 0.15)),
    enter: (tl, li) => print(tl, li, 0),
  },
  // The credits roll up into their window from below and settle in place, the window's
  // lower edge fading while they roll (never at rest, so no name is left half-hidden).
  people: {
    distance: 1100,
    items: "li",
    hold: (tl, { root, held }) => {
      const win = root.querySelector<HTMLElement>("[data-credits-window]");
      const list = win?.querySelector<HTMLElement>("ul");
      if (!win || !list) return;
      const fade = "linear-gradient(#000 70%, transparent)";
      const edge = (on: boolean) => {
        win.style.maskImage = on ? fade : "";
        win.style.webkitMaskImage = on ? fade : "";
      };
      // A long list holds what fits; its later names rise in as they enter.
      const rolled = held.length === list.children.length ? [list] : held;
      tl.fromTo(rolled, { y: () => win.offsetHeight }, { y: 0, ease: "power2.out", duration: 1, stagger: rolled.length > 1 ? 0.04 : 0, onUpdate() { edge(this.progress() < 1); } }, 0);
      return () => edge(false);
    },
    enter: (tl, li) => {
      tl.fromTo(li, { y: 60, opacity: 0 }, { y: 0, opacity: 1, ease: "power2.out", duration: 1 });
    },
  },
  // Things are dropped onto the table one by one, landing with a small squash.
  made: {
    distance: 850,
    items: "li",
    hold: (tl, { held }) => held.forEach((li, i) => drop(tl, li, i * 0.16)),
    enter: (tl, li) => drop(tl, li, 0),
  },
  // Cassette spines drop into the rack one by one, with a bounce.
  "on-rotation": {
    distance: 700,
    items: "li",
    hold: (tl, { held }) => {
      const spines = held.map((li) => li.querySelector("[data-spine]")).filter((el): el is HTMLElement => el !== null);
      if (spines.length) tl.fromTo(spines, { yPercent: -130, opacity: 0 }, { yPercent: 0, opacity: 1, ease: "bounce.out", duration: 0.4, stagger: 0.08 }, 0);
    },
    enter: (tl, li) => {
      const spine = li.querySelector("[data-spine]");
      if (spine) tl.fromTo(spine, { yPercent: -130, opacity: 0 }, { yPercent: 0, opacity: 1, ease: "bounce.out", duration: 1 });
    },
  },
};
