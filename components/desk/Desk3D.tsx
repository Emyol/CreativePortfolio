"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { SiteContent } from "@/lib/content/schema";
import { pushBack } from "@/lib/desk/back";
import { isFirstInsert } from "@/lib/desk/visit";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { computeTier, NARROW_QUERY, REDUCE_QUERY, type MotionTier } from "@/lib/motion/tier";
import { formatTrackNumber, type Track, type TrackId } from "@/lib/tape";
import { getStage } from "@/lib/three/stage";
import { canDraw3D } from "@/lib/three/support";
import { attachDeskPointer } from "./deskPointer";
import { createDeskScene, type DeskScene, type DeskState, type ProjectId } from "./deskScene";
import styles from "./Desk3D.module.css";

export type Desk3DHandle = {
  project(id: ProjectId): DOMRect | null;
  hover(id: TrackId | null): void;
  led(on: boolean): void;
  slotOnScreen(): { x: number; y: number };
  inspect(id: TrackId | null): void;
  /** The knob's short wiggle, the first time a device that uses it opens. */
  wiggle(): void;
};

/** Lines a section wrote to the player's screen (DeskContext's `setScreen`). */
export type ScreenText = { lines: [string, string]; progress?: number };

type Props = {
  tracks: Track[];
  content: SiteContent;
  state: DeskState;
  current: TrackId | null;
  /** The loaded track's section's lines, or null for the player's own. */
  screen: ScreenText | null;
  night: boolean;
  onTapeClick(id: TrackId): void;
  onKnob(steps: number): void;
  onFrame?(): void;
  /** The tape the 3D lifts changed: under the pointer (its raycast) or focused (`hover`). */
  onHover?(id: TrackId | null): void;
  /** A tape has just dropped into the slot (the clunk's frame). */
  onInsert?(id: TrackId): void;
  /** No 3D here (no GPU, a failed load, a lost context): the desk falls back. */
  onUnavailable?(): void;
};

const TIMEOUT = 10_000; // without the scene by then, the desk falls back
const NUDGE_IDLE = 2000; // ms of no input on a first visit's desk before the first tape nudges
const NUDGE_LENGTH = 1000; // ms the nudge takes, with room to spare
const INPUT = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;

/**
 * The desk's 3D: the player and the six tapes on the shared stage (deskScene.ts), driven by
 * the route (`state`, `current`) so Back and Forward animate too, with the pointer's play on
 * top (deskPointer.ts). Its box is the viewport on the desk and the lower-left corner on the
 * deck. Picking a tape up shows a small bar to play it or put it back. A section's screen
 * lines (`screen`) are applied after the route is (a change of tape clears the last tape's)
 * and again when the scene is ready, so they show whatever order those come in. What the
 * screen shows is on the view as `data-screen`, for tests.
 *
 * The scene is built once, for the first tier that is really this browser's (hydration
 * renders "full" first). Reduced motion switched mid-visit then changes its motion in place,
 * on the next frame: the tapes, the view and the screen stay as they are.
 */
export const Desk3D = forwardRef<Desk3DHandle, Props>(function Desk3D(props, ref) {
  const tier = useMotionTier();
  const [built, setBuilt] = useState<MotionTier | null>(null);
  if (built === null && typeof window !== "undefined" && tier === computeTier(matchMedia(REDUCE_QUERY).matches, matchMedia(NARROW_QUERY).matches)) setBuilt(tier);
  const tierNow = useRef(tier);
  const view = useRef<HTMLDivElement>(null);
  const scene = useRef<DeskScene | null>(null);
  const latest = useRef(props);
  const [held, setHeld] = useState<TrackId | null>(null);
  const [gone, setGone] = useState(false);
  const [ready, setReady] = useState(false);
  const putBack = useRef<HTMLButtonElement>(null);
  const fullHead = useRef<HTMLParagraphElement>(null);
  const before = useRef<Element | null>(null);
  const wiggleWaiting = useRef(false);
  useEffect(() => {
    latest.current = props;
    tierNow.current = tier;
  });

  useImperativeHandle(
    ref,
    () => ({
      project: (id) => scene.current?.project(id) ?? null,
      hover: (id) => scene.current?.hover(id),
      led: (on) => void scene.current?.led(on),
      slotOnScreen: () => scene.current?.slotOnScreen() ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      inspect: (id) => scene.current?.inspect(id),
      // Asked before the scene is ready (a direct load): the knob wiggles once it is.
      wiggle: () => (scene.current ? scene.current.wiggle() : void (wiggleWaiting.current = true)),
    }),
    [],
  );

  useEffect(() => {
    const el = view.current;
    if (!el || gone) return;
    const giveUp = () => {
      setGone(true);
      latest.current.onUnavailable?.();
    };
    if (!canDraw3D()) return giveUp();
    if (!built) return;
    const tier = built;
    let dead = false;
    const undo: (() => void)[] = [];
    const stop = () => {
      dead = true;
      window.clearTimeout(timer);
      undo.splice(0).reverse().forEach((f) => f());
    };
    const fail = () => {
      if (dead) return;
      stop();
      giveUp();
    };
    const timer = window.setTimeout(fail, TIMEOUT);

    (async () => {
      const s = await createDeskScene({
        el,
        tier,
        tracks: latest.current.tracks,
        content: latest.current.content,
        dead: () => dead,
        hooks: {
          onInsert: (id) => latest.current.onInsert?.(id),
          onInspect: (id) => setHeld(id),
          onHover: (id) => latest.current.onHover?.(id),
          onFrame: () => {
            const seated = s?.seatedId() ?? "";
            if (el.dataset.seated !== seated) el.dataset.seated = seated;
            const shown = s?.screenText() ?? "";
            if (el.dataset.screen !== shown) el.dataset.screen = shown;
            // A headline cut short (reduced motion, too long even set smaller): its full text
            // for assistive tech, since the drawing is hidden from it.
            const head = s?.screenHeadline();
            const whole = shown.split("\n")[0];
            const full = head && head.text !== whole ? whole : "";
            if (fullHead.current && fullHead.current.textContent !== full) fullHead.current.textContent = full;
            if (process.env.NODE_ENV !== "production" && head) {
              const drawn = `${head.text}@${head.size}`;
              if (el.dataset.screenHead !== drawn) el.dataset.screenHead = drawn;
            }
            latest.current.onFrame?.();
          },
          fail,
        },
      });
      if (!s || dead) return s?.dispose();
      undo.push(() => {
        if (scene.current === s) scene.current = null;
        s.dispose();
        setHeld(null);
      });
      const stage = await getStage(tier);
      await stage.prepare(s.view);
      if (dead) return;
      scene.current = s;
      // Reduced motion may have changed while it loaded.
      s.setStill(tierNow.current === "none");
      // The lines first, so the first paint is already theirs (no flicker from the player's own).
      const written = latest.current.screen;
      if (written) s.screen(written.lines, written.progress);
      s.sync(latest.current.state, latest.current.current, true);
      s.setNight(latest.current.night, true);
      undo.push(stage.add(s.view));
      undo.push(stage.onLost(fail));
      window.clearTimeout(timer);
      undo.push(attachDeskPointer(s, { onTapeClick: (id) => latest.current.onTapeClick(id), onKnob: (n) => latest.current.onKnob(n) }));
      if (process.env.NODE_ENV !== "production") {
        const w = window as unknown as {
          __deskProject?: (id: ProjectId) => DOMRect | null;
          __deskPrint?: DeskScene["printQuad"];
          __deskSwatch?: DeskScene["printSwatch"];
          __deskKeyLabels?: DeskScene["keyLabelFit"];
        };
        w.__deskProject = (id) => s.project(id);
        w.__deskPrint = (id) => s.printQuad(id);
        w.__deskSwatch = (id, mode) => s.printSwatch(id, mode);
        w.__deskKeyLabels = () => s.keyLabelFit();
        undo.push(() => {
          delete w.__deskProject;
          delete w.__deskPrint;
          delete w.__deskSwatch;
          delete w.__deskKeyLabels;
        });
      }
      // Drawn once unseen (shaders compile, the screen paints), then it counts as ready.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (dead) return;
      el.dataset.ready = "";
      setReady(true);
      if (wiggleWaiting.current) {
        wiggleWaiting.current = false;
        s.wiggle();
      }
      undo.push(() => {
        setReady(false);
        delete el.dataset.ready;
        delete el.dataset.seated;
        delete el.dataset.screen;
        delete el.dataset.screenHead;
      });
    })().catch((e) => {
      console.warn("[3D] the desk fell back:", e);
      fail();
    });
    return stop;
  }, [built, gone]);
  useEffect(() => scene.current?.setStill(tier === "none"), [tier]);

  // The route drives the 3D, so Back and Forward animate as a click does. The section's lines
  // go on after it: a new tape clears the last one's, never the new section's own.
  useEffect(() => {
    const s = scene.current;
    if (!s) return;
    s.sync(props.state, props.current);
    if (props.screen) s.screen(props.screen.lines, props.screen.progress);
  }, [props.state, props.current, props.screen]);
  useEffect(() => scene.current?.setNight(props.night), [props.night]);

  // A first visit's desk left alone for two seconds: the first tape (01 about) nudges, once.
  // Any input starts the wait again, and settles a nudge under way; leaving the desk, or
  // reduced motion (live: the tier), calls it off.
  const nudged = useRef(false);
  const first = props.tracks[0]?.id;
  useEffect(() => {
    if (!ready || props.state !== "desk" || tier === "none" || !first || nudged.current || !isFirstInsert()) return;
    let timer = 0;
    const stop = () => {
      window.clearTimeout(timer);
      INPUT.forEach((type) => window.removeEventListener(type, onInput, { capture: true }));
    };
    const wait = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        // Not now (the tape lifted or in a hand, a tape held up): wait for the next quiet spell.
        if (!scene.current?.nudge(first)) return wait();
        nudged.current = true;
        // Input may still settle it while it hops; then nothing is left to listen for.
        timer = window.setTimeout(stop, NUDGE_LENGTH);
      }, NUDGE_IDLE);
    };
    const onInput = () => (nudged.current ? scene.current?.calm() : wait());
    INPUT.forEach((type) => window.addEventListener(type, onInput, { capture: true, passive: true }));
    wait();
    return stop;
  }, [ready, props.state, tier, first]);

  // Picked up: the bar takes focus, and the first step back (Esc) puts the tape back; put
  // back by any route, the step is no longer the tape's and focus returns where it was.
  useEffect(() => {
    if (held) {
      before.current = document.activeElement;
      putBack.current?.focus({ preventScroll: true });
      return pushBack(() => {
        scene.current?.putBack();
        return true;
      });
    }
    const b = before.current;
    before.current = null;
    if (b instanceof HTMLElement && b.isConnected && document.activeElement === document.body) b.focus({ preventScroll: true });
  }, [held]);

  if (gone) return null;
  const heldTrack = held ? props.tracks.find((t) => t.id === held) : null;
  return (
    <>
      <div ref={view} className={styles.view} data-desk-view data-state={props.state} aria-hidden="true" />
      <p ref={fullHead} className="sr-only" aria-live="polite" data-screen-full />
      {heldTrack && (
        <div className={styles.inspect} role="group" aria-label={`Holding ${formatTrackNumber(heldTrack.number)} ${heldTrack.label}`} data-holding>
          <span className={styles.name}>
            {formatTrackNumber(heldTrack.number)} {heldTrack.label}
          </span>
          <span className={styles.hint}>drag to turn it over</span>
          <button type="button" className={styles.button} onClick={() => props.onTapeClick(heldTrack.id)}>
            ▶ play it
          </button>
          <button type="button" ref={putBack} className={styles.button} onClick={() => scene.current?.putBack()}>
            put it back
          </button>
        </div>
      )}
    </>
  );
});
