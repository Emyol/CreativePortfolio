"use client";
import { Component, createRef, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { TRACK_INK } from "@/lib/desk/tapeLabel";
import { TIMING } from "@/lib/desk/timing";
import { isFirstInsert } from "@/lib/desk/visit";
import { gsap } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { TRACK_ORDER, type Track, type TrackId } from "@/lib/tape";
import { Flap } from "./Flap";
import styles from "./JCard.module.css";

type Rgb = [number, number, number];

/**
 * The card stock (`--paper` in globals.css), by day. Night's is warmed by the lamp and never
 * dimmer, so an ink that reads on this one reads at night too.
 */
export const PAPER = "#EEF0F2";
const PAPER_RGB: Rgb = [0xee, 0xf0, 0xf2];

// WCAG 2.x relative luminance and contrast ratio.
const channel = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]: Rgb) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrast = (a: Rgb, b: Rgb) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/**
 * The track's ink as printed on the paper: the ink itself where it already reads at 4.5:1
 * on the card, otherwise darkened (every channel by the same factor, so the hue holds) just
 * until it does. The tapes' inks are bright shell colours, so on the light card every one
 * of them is darkened. TRACK_INK stays as it is for the shell, the dot field and the wipe.
 */
export function paperInk(ink: Rgb): Rgb {
  for (let step = 0; step <= 50; step++) {
    const k = 1 - step * 0.02;
    const printed = ink.map((c) => Math.round(c * k)) as Rgb;
    if (contrast(printed, PAPER_RGB) >= 4.5) return printed;
  }
  return [0, 0, 0];
}

const rgb = (c: Rgb) => `rgb(${c.join(" ")})`;

/**
 * A later switch reprints in place: across the flap, then the centre (title and device as
 * one), then the liner, a band of the new ink (`--band` wide, JCard.module.css) sweeps left
 * to right with the new print behind it.
 */
export const WIPE = { sweep: 0.28, stagger: 0.06, end: "125%" } as const;
/** Folded, a panel stands just past edge-on on its hinge, its back (hidden) to the viewer. */
const FOLDED = 96;
const FADE = 0.2; // reduced motion: a cross-fade
const PERSPECTIVE = 1600;

/** Puts the flap on its right-edge hinge and the liner on its left, turned to ±`angle` (null: as they are). */
function hingeAt(flap: HTMLElement | null, liner: HTMLElement | null, angle: number | null) {
  const turn = (a: number) => (angle === null ? {} : { rotationY: a });
  if (flap) gsap.set(flap, { transformOrigin: "100% 50%", transformPerspective: PERSPECTIVE, ...turn(angle ?? 0) });
  if (liner) gsap.set(liner, { transformOrigin: "0% 50%", transformPerspective: PERSPECTIVE, ...turn(-(angle ?? 0)) });
}

/**
 * Turned away (folded past edge-on, or faded out waiting for the tape to seat), a panel's
 * links can't be reached: inert until it turns to face the reader. Marked, so only what the
 * card set is lifted.
 */
function turnAway(els: HTMLElement[], away: boolean) {
  for (const el of els) {
    if (away) {
      el.setAttribute("inert", "");
      el.dataset.turnedAway = "";
    } else if ("turnedAway" in el.dataset) {
      el.removeAttribute("inert");
      delete el.dataset.turnedAway;
    }
  }
}

type Move = { kind: "open" | "wipe" | "fold"; ctx: gsap.Context; tl: gsap.core.Timeline; done: boolean };

type Props = {
  tracks: Track[];
  base: string;
  current: TrackId | null;
  /** The route's panels (`Section`): the device and the liner. */
  children: ReactNode;
  /** How long the first insert of a visit takes to seat the tape before the card unfolds. */
  seatDelay?: number;
  /** The page's one h1, visually hidden (the player prints Miel's name): an event's name on its page. */
  heading?: string;
};

/**
 * The J-card: the printed, folded card that comes with the tape in. It is the page's main
 * region: the track's title, the left flap (the tracklist, also the tape's navigation),
 * and the route's device and liner panels, printed in two inks on cool card stock. With no
 * tape in, the desk's own content shows instead.
 *
 * The first insert of a visit unfolds the panels on their hinges once the tape is seated;
 * a later switch reprints in place with a wipe of the new ink; eject folds the card back
 * along the same path, the folding copy (`Panels`) hidden and inert, before the desk gets its
 * content back. A new tape mid-fold opens the same card again from where it is. Reduced
 * motion (live) cross-fades instead. A direct load only settles (CSS, so it plays before
 * hydration). When a tape loads, focus moves to the title.
 *
 * Its headings: the page's one h1 first (`heading`, read rather than shown), the track's
 * title as the section's h2, then the flap's sides and whatever the panels print as h3s.
 */
export function JCard({ tracks, base, current, children, seatDelay = 0, heading = "Miel" }: Props) {
  const still = useMotionTier() === "none";
  // The card's track: the tape that's in, or while it folds away after an eject, the one that was.
  const [shown, setShown] = useState<TrackId | null>(current);
  if (current && shown !== current) setShown(current);
  const [settle, setSettle] = useState(!!current);

  const root = useRef<HTMLElement>(null);
  const was = useRef<{ open: boolean; id: TrackId | null }>({ open: !!current, id: current });
  // The one move under way. Each move lives in its own GSAP context, killed when the next
  // move takes over or when it finishes, so nothing it touched (the old panels, the fold's
  // copies) stays referenced afterwards; the card reverts the last one when it goes.
  const move = useRef<Move | null>(null);
  const start = (kind: Move["kind"], build: (finish: () => void) => gsap.core.Timeline) => {
    move.current?.ctx.kill();
    const m = { kind, done: false } as Move;
    const finish = () => {
      m.done = true;
      if (move.current === m) move.current = null;
      m.ctx?.kill();
    };
    m.ctx = gsap.context(() => void (m.tl = build(finish)));
    move.current = m.done ? null : m;
  };
  useLayoutEffect(() => () => move.current?.ctx.revert(), []);

  useLayoutEffect(() => {
    const prev = was.current;
    const open = !!current;
    was.current = { open, id: current };
    const el = root.current;
    if (!el) return;
    const running = move.current;
    if (open === prev.open && current === prev.id) {
      // Only the motion tier changed. Reduced motion came on mid-move: end it where it was going.
      if (still) running?.tl.progress(1);
      return;
    }
    setSettle(false);

    const flap = el.querySelector<HTMLElement>('[data-panel="flap"]');
    const liner = el.querySelector<HTMLElement>('[data-panel="liner"]');
    const title = el.querySelector<HTMLElement>(":scope > h2");
    const device = el.querySelector<HTMLElement>('[data-panel="device"]');
    const face = [title, device].filter((e) => !!e);
    const panels = [flap, ...face, liner].filter((e) => !!e);
    const hinged = [flap, liner].filter((e) => !!e);
    // Opens the card from wherever its panels are: the centre comes up, the hinges turn flat.
    const unfold = (delay: number, finish: () => void) => {
      const reached = [...hinged, ...(device ? [device] : [])];
      const tl = gsap.timeline({
        delay,
        onComplete: () => {
          gsap.set([el, ...panels], { clearProps: "transform,opacity" });
          turnAway(reached, false);
          finish();
        },
      });
      // Until the hinges start to turn, the panels face away (the seat wait included).
      turnAway(reached, true);
      tl.call(() => turnAway(reached, false), undefined, TIMING.unfold * 0.12);
      tl.to(el, { opacity: 1, duration: 0.15, ease: "none" }, 0);
      tl.to(face, { opacity: 1, y: 0, duration: TIMING.unfold * 0.4, ease: "power2.out" }, 0);
      tl.to(hinged, { rotationY: 0, duration: TIMING.unfold * 0.88, ease: "power3.out" }, TIMING.unfold * 0.12);
      return tl;
    };

    if (open && !prev.open) {
      // A tape went in: from the desk, or back in while the card was still folding away.
      const fromFolding = running?.kind === "fold";
      // Read before anything marks it: the desk marks the insert after its children's effects.
      const first = isFirstInsert();
      start("open", (finish) => {
        if (fromFolding) takeOverFold(el, still);
        if (still) {
          // The card fades in whole; whatever a fold or a wait left on the panels goes at
          // once, and the fade leaves nothing inline behind it.
          gsap.set(panels, { clearProps: "transform,opacity" });
          turnAway(panels, false);
          if (!fromFolding) gsap.set(el, { opacity: 0 });
          return gsap.timeline({
            onComplete: () => {
              gsap.set(el, { clearProps: "opacity" });
              finish();
            },
          }).to(el, { opacity: 1, duration: FADE, ease: "none" });
        }
        if (!fromFolding) {
          hingeAt(flap, liner, FOLDED);
          gsap.set(face, { opacity: 0, y: 12 });
        }
        // The first insert of a visit waits for the tape to seat, as the 3D does.
        return unfold(!fromFolding && first ? seatDelay : 0, finish);
      });
      title?.focus({ preventScroll: true });
      return;
    }

    if (open) {
      // A later switch: the card stays open and reprints.
      if (running?.kind === "open" && !still) {
        // Still unfolding (quick picks): the new panels join the unfold where the old ones
        // were, and it carries on, its wait for the tape included.
        const wait = Math.max(0, running.tl.startTime() - (running.tl.parent?.time() ?? 0));
        const turned = flap ? (gsap.getProperty(flap, "rotationY") as number) : 0;
        const up = title ? { opacity: gsap.getProperty(title, "opacity"), y: gsap.getProperty(title, "y") } : null;
        start("open", (finish) => {
          hingeAt(null, liner, turned);
          if (device && up) gsap.set(device, up);
          return unfold(wait, finish);
        });
      } else if (still) {
        running?.tl.progress(1);
        start("wipe", (finish) =>
          gsap.timeline({ onComplete: finish }).fromTo(panels, { opacity: 0 }, { opacity: 1, duration: FADE, ease: "none", clearProps: "opacity" }),
        );
      } else {
        start("wipe", (finish) =>
          gsap.timeline({ onComplete: finish }).fromTo(
            panels,
            { "--wipe": "0%" },
            {
              "--wipe": WIPE.end,
              duration: WIPE.sweep,
              ease: "power1.inOut",
              stagger: (_: number, p: HTMLElement) => WIPE.stagger * (p === flap ? 0 : p === liner ? 2 : 1),
              onComplete: () => panels.forEach((p) => p.style.removeProperty("--wipe")),
            },
          ),
        );
      }
      title?.focus({ preventScroll: true });
      return;
    }

    // Eject: fold back along the same path, then hand the desk its content back.
    if (running?.kind === "wipe") running.tl.progress(1);
    start("fold", (finish) => {
      const tl = gsap.timeline({
        onComplete: () => {
          finish();
          setShown(null);
        },
      });
      if (still) return tl.to(el, { opacity: 0, duration: FADE, ease: "none" });
      hingeAt(flap, liner, null);
      if (flap) tl.to(flap, { rotationY: FOLDED, duration: TIMING.fold * 0.8, ease: "power2.in" }, 0);
      if (liner) tl.to(liner, { rotationY: -FOLDED, duration: TIMING.fold * 0.8, ease: "power2.in" }, 0);
      tl.to(face, { opacity: 0, y: 12, duration: TIMING.fold * 0.5, ease: "power1.in" }, TIMING.fold * 0.5);
      return tl;
    });
    // Follows the route and the motion tier; `seatDelay` and the helpers are read as they are.
  }, [current, still]);

  if (!shown) return <>{children}</>;
  const open = !!current;
  const label = TRACK_ORDER.find((t) => t.id === shown)?.label ?? shown;
  const ink = TRACK_INK[shown];
  return (
    <main
      ref={root}
      id={open ? "jcard" : undefined}
      tabIndex={-1}
      aria-hidden={open ? undefined : true}
      inert={!open}
      className={styles.card}
      style={{ "--ink": rgb(ink), "--print-ink": rgb(paperInk(ink)), "--settle": `${TIMING.settle}s` } as CSSProperties}
      data-jcard={shown}
      data-settle={settle ? "" : undefined}
    >
      <h1 className="sr-only">{heading}</h1>
      <h2 tabIndex={-1} className={styles.title}>
        {label}
      </h2>
      <Flap tracks={tracks} base={base} current={shown} />
      <Panels open={open}>{children}</Panels>
    </main>
  );
}

/**
 * Mid-fold, a new tape went in: its own panels take the place of the folding copies, turned
 * as far as they were, so the card opens again from where it is; the copies go.
 */
function takeOverFold(el: HTMLElement, still: boolean) {
  const copies = el.querySelector<HTMLElement>("[data-fold-copy]");
  if (!copies) return;
  if (!still) {
    for (const name of ["device", "liner"]) {
      const from = copies.querySelector<HTMLElement>(`[data-panel="${name}"]`);
      const to = el.querySelector<HTMLElement>(`[data-live-panels] [data-panel="${name}"]`);
      if (!from || !to) continue;
      const at = (p: string) => gsap.getProperty(from, p) as number;
      gsap.set(to, { rotationY: at("rotationY"), y: at("y"), opacity: at("opacity"), transformOrigin: name === "liner" ? "0% 50%" : "50% 50%", transformPerspective: PERSPECTIVE });
    }
  }
  copies.replaceChildren();
}

/**
 * The route's panels. When the tape comes out, the route has already moved on: the layout's
 * `children` is Next's segment renderer, so holding on to the old element renders the new
 * route (the desk's), not the old panels. For the fold this keeps a plain copy of the panels
 * as they last were, taken just before React removes them: aria-hidden and inert, ids
 * stripped, no frame or media that a copy would load again, emptied when a tape goes back in
 * or the card goes. The live panels are never touched.
 */
class Panels extends Component<{ open: boolean; children: ReactNode }> {
  private live = createRef<HTMLDivElement>();
  private copies = createRef<HTMLDivElement>();

  getSnapshotBeforeUpdate(prev: { open: boolean }): HTMLElement[] | null {
    const live = this.live.current;
    if (!prev.open || this.props.open || !live) return null;
    return [...live.children].map((node) => {
      const copy = node.cloneNode(true) as HTMLElement;
      copy.style.removeProperty("--wipe"); // a reprint cut short by the eject
      copy.querySelectorAll("iframe, video, audio, object, embed").forEach((n) => n.remove());
      [copy, ...copy.querySelectorAll("[id]")].forEach((n) => n.removeAttribute("id"));
      return copy;
    });
  }

  componentDidUpdate(_: unknown, __: unknown, snapshot: HTMLElement[] | null) {
    if (snapshot) this.copies.current?.replaceChildren(...snapshot);
  }

  componentWillUnmount() {
    this.copies.current?.replaceChildren();
  }

  render() {
    return (
      <>
        <div ref={this.live} className={styles.body} data-live-panels>
          {this.props.open ? this.props.children : null}
        </div>
        <div ref={this.copies} className={styles.body} data-fold-copy aria-hidden="true" inert />
      </>
    );
  }
}
