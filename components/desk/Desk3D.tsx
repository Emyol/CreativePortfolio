"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { SiteContent } from "@/lib/content/schema";
import { pushBack } from "@/lib/desk/back";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { computeTier, NARROW_QUERY, REDUCE_QUERY } from "@/lib/motion/tier";
import { formatTrackNumber, type Track, type TrackId } from "@/lib/tape";
import { getStage } from "@/lib/three/stage";
import { canDraw3D } from "@/lib/three/support";
import { attachDeskPointer } from "./deskPointer";
import { createDeskScene, type DeskScene, type DeskState, type ProjectId } from "./deskScene";
import styles from "./Desk3D.module.css";

export type Desk3DHandle = {
  project(id: ProjectId): DOMRect | null;
  hover(id: TrackId | null): void;
  screen(lines: [string, string], progress?: number): void;
  led(on: boolean): void;
  slotOnScreen(): { x: number; y: number };
  inspect(id: TrackId | null): void;
  /** The knob's short wiggle, the first time a device that uses it opens. */
  wiggle(): void;
};

type Props = {
  tracks: Track[];
  content: SiteContent;
  state: DeskState;
  current: TrackId | null;
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

/**
 * The desk's 3D: the player and the six tapes on the shared stage (deskScene.ts), driven by
 * the route (`state`, `current`) so Back and Forward animate too, with the pointer's play on
 * top (deskPointer.ts). Its box is the viewport on the desk and the lower-left corner on the
 * deck. Picking a tape up shows a small bar to play it or put it back.
 */
export const Desk3D = forwardRef<Desk3DHandle, Props>(function Desk3D(props, ref) {
  const tier = useMotionTier();
  const view = useRef<HTMLDivElement>(null);
  const scene = useRef<DeskScene | null>(null);
  const latest = useRef(props);
  const [held, setHeld] = useState<TrackId | null>(null);
  const [gone, setGone] = useState(false);
  const putBack = useRef<HTMLButtonElement>(null);
  const before = useRef<Element | null>(null);
  useEffect(() => {
    latest.current = props;
  });

  useImperativeHandle(
    ref,
    () => ({
      project: (id) => scene.current?.project(id) ?? null,
      hover: (id) => scene.current?.hover(id),
      screen: (lines, progress) => scene.current?.screen(lines, progress),
      led: (on) => void scene.current?.led(on),
      slotOnScreen: () => scene.current?.slotOnScreen() ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      inspect: (id) => scene.current?.inspect(id),
      wiggle: () => scene.current?.wiggle(),
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
    // Hydration renders with the "full" tier first; the right one remounts this straight after.
    if (tier !== computeTier(matchMedia(REDUCE_QUERY).matches, matchMedia(NARROW_QUERY).matches)) return;
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
      s.sync(latest.current.state, latest.current.current, true);
      s.setNight(latest.current.night, true);
      undo.push(stage.add(s.view));
      undo.push(stage.onLost(fail));
      window.clearTimeout(timer);
      undo.push(attachDeskPointer(s, { onTapeClick: (id) => latest.current.onTapeClick(id), onKnob: (n) => latest.current.onKnob(n) }));
      if (process.env.NODE_ENV !== "production") {
        const w = window as unknown as { __deskProject?: (id: ProjectId) => DOMRect | null };
        w.__deskProject = (id) => s.project(id);
        undo.push(() => delete w.__deskProject);
      }
      // Drawn once unseen (shaders compile, the screen paints), then it counts as ready.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (dead) return;
      el.dataset.ready = "";
      undo.push(() => {
        delete el.dataset.ready;
        delete el.dataset.seated;
      });
    })().catch((e) => {
      console.warn("[3D] the desk fell back:", e);
      fail();
    });
    return stop;
  }, [tier, gone]);

  // The route drives the 3D, so Back and Forward animate as a click does.
  useEffect(() => scene.current?.sync(props.state, props.current), [props.state, props.current]);
  useEffect(() => scene.current?.setNight(props.night), [props.night]);

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
      {/* Lenis would scroll the page under the knob's wheel (it ignores a cancelled wheel). */}
      <div ref={view} className={styles.view} data-desk-view data-state={props.state} aria-hidden="true" data-lenis-prevent-wheel />
      {heldTrack && (
        <div className={styles.inspect} role="group" aria-label={`Holding ${formatTrackNumber(heldTrack.number)} ${heldTrack.label}`}>
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
