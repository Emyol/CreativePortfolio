"use client";
import { Component, createRef, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { TRACK_INK } from "@/lib/desk/tapeLabel";
import { TIMING } from "@/lib/desk/timing";
import { isFirstInsert, markInserted } from "@/lib/desk/visit";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { TRACK_ORDER, type Track, type TrackId } from "@/lib/tape";
import { Flap } from "./Flap";
import styles from "./JCard.module.css";

type Rgb = [number, number, number];

/** The card stock (`--paper` in globals.css). */
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

type Props = {
  tracks: Track[];
  base: string;
  current: TrackId | null;
  /** The route's panels (`Section`): the device and the liner. */
  children: ReactNode;
  /** How long the first insert of a visit takes to seat the tape before the card unfolds. */
  seatDelay?: number;
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
 */
export function JCard({ tracks, base, current, children, seatDelay = 0 }: Props) {
  const still = useMotionTier() === "none";
  // The card's track: the tape that's in, or while it folds away after an eject, the one that was.
  const [shown, setShown] = useState<TrackId | null>(current);
  if (current && shown !== current) setShown(current);
  const [settle, setSettle] = useState(!!current);

  const root = useRef<HTMLElement>(null);
  const was = useRef<{ open: boolean; id: TrackId | null }>({ open: !!current, id: current });
  const hinge = useRef<gsap.core.Timeline | null>(null);
  const wipe = useRef<gsap.core.Timeline | null>(null);
  const folding = useRef(false);

  useGSAP(
    () => {
      const prev = was.current;
      const open = !!current;
      was.current = { open, id: current };
      const el = root.current;
      if (!el) return;
      if (open === prev.open && current === prev.id) {
        // Only the motion tier changed. Reduced motion came on mid-move: end it where it was going.
        if (still) {
          hinge.current?.progress(1);
          wipe.current?.progress(1);
        }
        return;
      }
      setSettle(false);

      const flap = el.querySelector<HTMLElement>('[data-panel="flap"]');
      const liner = el.querySelector<HTMLElement>('[data-panel="liner"]');
      const face = [el.querySelector<HTMLElement>(":scope > h2"), el.querySelector<HTMLElement>('[data-panel="device"]')].filter((e) => !!e);
      const panels = [flap, ...face, liner].filter((e) => !!e);
      const hinged = [flap, liner].filter((e) => !!e);
      const title = el.querySelector<HTMLElement>(":scope > h2");
      // Opens the card from wherever its panels are: the centre comes up, the hinges turn flat.
      const unfold = (delay: number) => {
        const tl = (hinge.current = gsap.timeline({
          delay,
          onComplete: () => {
            hinge.current = null;
            gsap.set([el, ...panels], { clearProps: "transform,opacity" });
          },
        }));
        tl.to(el, { opacity: 1, duration: 0.15, ease: "none" }, 0);
        tl.to(face, { opacity: 1, y: 0, duration: TIMING.unfold * 0.4, ease: "power2.out" }, 0);
        tl.to(hinged, { rotationY: 0, duration: TIMING.unfold * 0.88, ease: "power3.out" }, TIMING.unfold * 0.12);
      };

      if (open && !prev.open) {
        // A tape went in: from the desk, or back in while the card was still folding away.
        const fromFolding = folding.current;
        folding.current = false;
        hinge.current?.kill();
        if (fromFolding) takeOverFold(el, still);
        if (still) {
          // The card fades in whole; whatever a fold left on the panels goes at once.
          gsap.set(panels, { rotationY: 0, y: 0, opacity: 1 });
          if (!fromFolding) gsap.set(el, { opacity: 0 });
          hinge.current = gsap.timeline({ onComplete: () => void (hinge.current = null) }).to(el, { opacity: 1, duration: FADE, ease: "none" });
        } else {
          if (!fromFolding) {
            hingeAt(flap, liner, FOLDED);
            gsap.set(face, { opacity: 0, y: 12 });
          }
          // The first insert of a visit waits for the tape to seat, as the 3D does.
          unfold(!fromFolding && isFirstInsert() ? seatDelay : 0);
        }
        title?.focus({ preventScroll: true });
        return;
      }

      if (open) {
        // A later switch: the card stays open and reprints.
        wipe.current?.kill();
        const opening = hinge.current;
        if (opening && !still) {
          // Still unfolding (quick picks): the new panels join the unfold where the old ones
          // were, and it carries on, its wait for the tape included.
          const wait = Math.max(0, opening.startTime() - (opening.parent?.time() ?? 0));
          opening.kill();
          const device = el.querySelector<HTMLElement>('[data-panel="device"]');
          if (liner && flap) hingeAt(null, liner, gsap.getProperty(flap, "rotationY") as number);
          if (device && title) gsap.set(device, { opacity: gsap.getProperty(title, "opacity"), y: gsap.getProperty(title, "y") });
          unfold(wait);
        } else if (still) {
          hinge.current?.progress(1);
          wipe.current = gsap.timeline({ onComplete: () => void (wipe.current = null) });
          wipe.current.fromTo(panels, { opacity: 0 }, { opacity: 1, duration: FADE, ease: "none", clearProps: "opacity" });
        } else {
          wipe.current = gsap.timeline({ onComplete: () => void (wipe.current = null) });
          wipe.current.fromTo(
            panels,
            { "--wipe": "0%" },
            {
              "--wipe": WIPE.end,
              duration: WIPE.sweep,
              ease: "power1.inOut",
              stagger: (_: number, p: HTMLElement) => WIPE.stagger * (p === flap ? 0 : p === liner ? 2 : 1),
              onComplete: () => panels.forEach((p) => p.style.removeProperty("--wipe")),
            },
          );
        }
        title?.focus({ preventScroll: true });
        return;
      }

      // Eject: fold back along the same path, then hand the desk its content back.
      folding.current = true;
      hinge.current?.kill();
      wipe.current?.progress(1);
      const done = () => {
        hinge.current = null;
        folding.current = false;
        setShown(null);
      };
      const tl = (hinge.current = gsap.timeline({ onComplete: done }));
      if (still) {
        tl.to(el, { opacity: 0, duration: FADE, ease: "none" });
      } else {
        hingeAt(flap, liner, null);
        if (flap) tl.to(flap, { rotationY: FOLDED, duration: TIMING.fold * 0.8, ease: "power2.in" }, 0);
        if (liner) tl.to(liner, { rotationY: -FOLDED, duration: TIMING.fold * 0.8, ease: "power2.in" }, 0);
        tl.to(face, { opacity: 0, y: 12, duration: TIMING.fold * 0.5, ease: "power1.in" }, TIMING.fold * 0.5);
      }
    },
    { dependencies: [current, still], scope: root, revertOnUpdate: false },
  );

  // After the 3D's own effect has read the flag for this insert (it comes first in the desk).
  useEffect(() => {
    if (current) markInserted();
  }, [current]);

  if (!shown) return <>{children}</>;
  const open = !!current;
  const label = TRACK_ORDER.find((t) => t.id === shown)?.label ?? shown;
  const ink = TRACK_INK[shown];
  return (
    <main
      ref={root}
      id={open ? "main" : undefined}
      tabIndex={-1}
      aria-hidden={open ? undefined : true}
      inert={!open}
      className={styles.card}
      style={{ "--ink": rgb(ink), "--print-ink": rgb(paperInk(ink)), "--settle": `${TIMING.settle}s` } as CSSProperties}
      data-jcard={shown}
      data-settle={settle ? "" : undefined}
    >
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
