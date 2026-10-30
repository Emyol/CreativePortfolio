import type { TrackId } from "@/lib/tape";

/** What the pointer can ask of the desk scene (deskScene.ts). */
export type PointerScene = {
  el: HTMLElement;
  pickTape(x: number, y: number): TrackId | null;
  overPlayer(x: number, y: number): boolean;
  hover(id: TrackId | null): void;
  grab(id: TrackId, x: number, y: number): void;
  dragTo(x: number, y: number): void;
  /** Lets go of the held tape; `at` is the pointer-up time, for the throw. */
  release(at: number): void;
  inspecting(): TrackId | null;
  beginTurn(): void;
  turnInspect(dx: number, dy: number): void;
  inspect(id: TrackId | null): void;
  putBack(): void;
  turnKnob(steps: number): void;
  aimLamp(x: number, y: number): void;
};

const MOVE = 7; // px a press may wander and still be a click
const DOUBLE = 250; // ms a second click has to make it a double-click
const KNOB_PX = 60; // px of drag across the player per knob step
const NOTCH = 100; // wheel delta per knob step (one notch of a mouse wheel)

/**
 * Hands on the desk (apple-design §2–6, ported from the prototype): a tape follows the
 * pointer 1:1 from where it was grabbed and is thrown with the release velocity; a click
 * loads it, a double-click picks it up to look at (drag turns it; Esc, on the back ladder in
 * Desk3D, puts it back); a drag across the player or the wheel over it turns the knob.
 * Nothing waits for a motion to end.
 */
export function attachDeskPointer(s: PointerScene, cb: { onTapeClick(id: TrackId): void; onKnob(steps: number): void }): () => void {
  const { el } = s;
  let down: { x: number; y: number; id: TrackId | null; moved: boolean; knob: boolean; kx: number; turn: boolean; pointerId: number } | null = null;
  let clickWait: { id: TrackId; timer: number } | null = null;
  let wheel = 0;

  const cursor = (c: string) => {
    if (el.style.cursor !== c) el.style.cursor = c;
  };
  const click = (id: TrackId) => {
    if (clickWait?.id === id) {
      window.clearTimeout(clickWait.timer);
      clickWait = null;
      s.inspect(id);
      return;
    }
    // A click on another tape first loads the one waiting: the last pick still wins.
    if (clickWait) {
      window.clearTimeout(clickWait.timer);
      cb.onTapeClick(clickWait.id);
    }
    clickWait = {
      id,
      timer: window.setTimeout(() => {
        clickWait = null;
        cb.onTapeClick(id);
      }, DOUBLE),
    };
  };

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0 || e.target !== el) return;
    const base = { x: e.clientX, y: e.clientY, moved: false, kx: e.clientX, pointerId: e.pointerId };
    if (s.inspecting()) {
      down = { ...base, id: null, knob: false, turn: true };
      s.beginTurn();
    } else {
      const id = s.pickTape(e.clientX, e.clientY);
      down = { ...base, id, knob: !id && s.overPlayer(e.clientX, e.clientY), turn: false };
      if (id) s.grab(id, e.clientX, e.clientY);
    }
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // A pointer the browser no longer tracks: the drag still works while over the view.
    }
  };
  const onMove = (e: PointerEvent) => {
    s.aimLamp(e.clientX, e.clientY);
    if (!down) {
      if (e.target !== el || s.inspecting()) return;
      const id = s.pickTape(e.clientX, e.clientY);
      s.hover(id);
      cursor(id ? "grab" : "");
      return;
    }
    if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) > MOVE) down.moved = true;
    if (down.turn) return s.turnInspect(e.clientX - down.x, e.clientY - down.y);
    if (down.id && down.moved) {
      s.dragTo(e.clientX, e.clientY);
      cursor("grabbing");
      return;
    }
    if (down.knob) {
      const steps = Math.trunc((e.clientX - down.kx) / KNOB_PX);
      if (steps) {
        down.kx += steps * KNOB_PX;
        s.turnKnob(steps);
        cb.onKnob(steps);
      }
    }
  };
  const onUp = (e: PointerEvent) => {
    const at = performance.now();
    const d = down;
    down = null;
    if (!d) return;
    if (el.hasPointerCapture?.(d.pointerId)) el.releasePointerCapture(d.pointerId);
    if (d.turn || !d.id) return;
    s.release(at);
    cursor("");
    if (!d.moved && e.type === "pointerup") click(d.id);
  };
  const onLeave = () => {
    if (!down) s.hover(null);
  };
  const onWheel = (e: WheelEvent) => {
    if (!s.overPlayer(e.clientX, e.clientY)) return;
    e.preventDefault();
    wheel += e.deltaMode ? Math.sign(e.deltaY) * NOTCH : e.deltaY;
    const steps = Math.trunc(wheel / NOTCH);
    if (!steps) return;
    wheel -= steps * NOTCH;
    s.turnKnob(steps);
    cb.onKnob(steps);
  };

  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointercancel", onUp);
  el.addEventListener("pointerleave", onLeave);
  el.addEventListener("wheel", onWheel, { passive: false });
  return () => {
    if (clickWait) window.clearTimeout(clickWait.timer);
    el.removeEventListener("pointerdown", onDown);
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerup", onUp);
    el.removeEventListener("pointercancel", onUp);
    el.removeEventListener("pointerleave", onLeave);
    el.removeEventListener("wheel", onWheel);
    el.style.cursor = "";
  };
}
