"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { SiteContent } from "@/lib/content/schema";
import { runBack } from "@/lib/desk/back";
import { deskScreenLines, markHintSeen } from "@/lib/desk/hint";
import { deskKeyAction } from "@/lib/desk/keyboard";
import { deskHref, hashRedirect, parseDeskPath } from "@/lib/desk/location";
import { nightOn, useNight } from "@/lib/desk/night";
import { TRACK_INK } from "@/lib/desk/tapeLabel";
import { TIMING } from "@/lib/desk/timing";
import { markInserted, markLanded } from "@/lib/desk/visit";
import { trackKeysEnabled } from "@/lib/keys";
import { visibleTracks, type TrackId } from "@/lib/tape";
import { Desk3D, type Desk3DHandle, type ScreenText } from "./Desk3D";
import { DeskContext, knobStack, type DeskApi } from "./deskContext";
import { DeskHint } from "./DeskHint";
import { DotField, type DotFieldHandle } from "./DotField";
import { JCard } from "./JCard";
import { LampCord } from "./LampCord";
import type { OverlayHandle, Project } from "./overlayPlace";
import { PlayerKeys } from "./PlayerKeys";
import { SpriteDesk } from "./SpriteDesk";
import { TapeLinks, type TapeLinksHandle } from "./TapeLinks";
import { Transport } from "./Transport";

const REST_INK: [number, number, number] = [255, 90, 31];

/** What a section last wrote to the player's screen, and for which track. */
type Written = ScreenText & { track: TrackId | null };

/**
 * The persistent desk: the dot field, the 3D player and tapes (or, without 3D, the sprite
 * player), the tape and key links over them, and the route's content. The route is the state
 * (a track path is the deck with that tape in), so the 3D follows Back and Forward. With a
 * tape in, the route's panels sit in its J-card, which takes focus when a tape loads; after
 * an eject, focus goes back to that tape. The keys drive it too (lib/desk/keyboard: 1 to 6,
 * Esc and Backspace one level back, ←/→ on the J-card), as do the transport under the flap
 * and, on the desk, the lamp cord, which with the transport's night key switches the
 * lighting: the 3D's, and the room's (night is lighting, not a dark page).
 *
 * A section writes to the player's screen through the desk (DeskContext). The desk keeps
 * the latest lines with the track they were written for and hands them to the player as a
 * prop, so they show whichever runs first: the section's effect, the 3D following the
 * route, or the 3D's scene becoming ready; without 3D the sprite player shows them too.
 * With no tape in, the desk writes its own: `PICK A TAPE` and how many there are.
 *
 * A first visit is welcomed (spec "First visit and discoverability"): the screen asks for a
 * tape, a one-line hint under the player names the less obvious toys until the first tape
 * goes in, and the 3D nudges the first tape after two idle seconds (Desk3D).
 *
 * The admin's preview (`preview`, under its own `base`) is the same desk with the draft. It
 * shares the browser with the public site, so a tape loaded there uses the hint up for that
 * visit only, not for good. The first insert needs nothing: it is module memory, and the
 * preview opens in a tab of its own.
 */
export function Desk({ content, base, preview = false, children }: { content: SiteContent; base: string; preview?: boolean; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const loc = parseDeskPath(pathname, base);
  const current = loc.track;
  const state = current ? "deck" : "desk";
  const tracks = useMemo(() => visibleTracks(content), [content]);
  // The page's one h1 (JCard): an event's page is headed by the event's name.
  const heading = (loc.event && content.events.find((e) => e.slug === loc.event)?.name) || "Miel";
  const desk3d = useRef<Desk3DHandle>(null);
  const dots = useRef<DotFieldHandle>(null);
  const [has3D, setHas3D] = useState(true);
  const tapeLinks = useRef<TapeLinksHandle>(null);
  const keyLinks = useRef<OverlayHandle>(null);
  const hint = useRef<OverlayHandle>(null);
  const night = useNight();

  useEffect(() => {
    const to = hashRedirect(location.pathname, location.hash, base);
    if (to) router.replace(to);
  }, [router, base]);

  useEffect(() => {
    const html = document.documentElement;
    html.dataset.desk = state;
    if (current) html.dataset.loaded = current;
    else delete html.dataset.loaded;
  }, [state, current]);
  // Night darkens the room (globals.css). A visit that starts at night is dark from its first
  // paint (NIGHT_PREPAINT, app/layout.tsx); a switch eases the light. The store's own value
  // is read every time (while hydrating, the render still has the server's day), and only a
  // change of it that this desk saw eases: anything else (the first application, or StrictMode
  // running the mount effects again after the cleanup took the attribute off) goes on with
  // the transition off, its style taken before the transition is back.
  const nightSeen = useRef<boolean | null>(null);
  useEffect(() => {
    const html = document.documentElement;
    const on = nightOn();
    const eased = nightSeen.current !== null && nightSeen.current !== on;
    nightSeen.current = on;
    if (on === "night" in html.dataset) return;
    if (!eased) html.dataset.nightInstant = "";
    if (on) html.dataset.night = "";
    else delete html.dataset.night;
    if (eased) return;
    void getComputedStyle(html).backgroundColor;
    delete html.dataset.nightInstant;
  }, [night]);
  useEffect(
    () => () => {
      delete document.documentElement.dataset.desk;
      delete document.documentElement.dataset.loaded;
      delete document.documentElement.dataset.night;
    },
    [],
  );

  // The control grammar's keys. Esc and Backspace step out one level: the newest open
  // device's back handler first (a tape held up is put back, an event goes back to its
  // list), else the tape is ejected to the desk.
  const where = useRef(loc);
  useEffect(() => {
    where.current = loc;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat) return;
      const at = where.current;
      const action = deskKeyAction(e, { loc: at, tracks, keysOn: trackKeysEnabled(), base });
      if (!action) return;
      if (action.kind === "go") {
        e.preventDefault();
        router.push(action.href);
        return;
      }
      if (runBack()) return e.preventDefault();
      if (!at.track) return;
      e.preventDefault();
      router.push(deskHref(base, { track: null, event: null }));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, base, tracks]);

  const onTapeClick = useCallback((id: TrackId) => router.push(deskHref(base, { track: id, event: null })), [router, base]);
  const onInsert = useCallback(() => {
    const p = desk3d.current?.slotOnScreen();
    if (p) dots.current?.ripple(p.x, p.y);
  }, []);

  // Ejected: focus goes back to the tape that was in (when a tape loads, the J-card takes it).
  const shown = useRef(current);
  useEffect(() => {
    const was = shown.current;
    shown.current = current;
    if (was && !current) tapeLinks.current?.focus(was);
  }, [current]);

  // A tape is in: the visit's first insert is used up. Marked here, in the parent, because a
  // parent's effects run after all of its children's: the 3D (its sync) and the J-card (its
  // layout effect) have each read the flag for this insert by now. The 3D marks it too, when
  // the tape seats; without the 3D, this is the only mark.
  // The hint is used up with it, for good in this browser (in the preview, for this visit).
  useEffect(() => {
    if (!current) return;
    markInserted();
    markHintSeen({ remember: !preview });
  }, [current, preview]);

  // The page the visit landed on is on screen: sections mounting from now on came by a move.
  // A task later, so effects run again on mount (React's StrictMode, in development) still
  // count as the landing.
  useEffect(() => {
    const t = window.setTimeout(markLanded, 0);
    return () => window.clearTimeout(t);
  }, []);

  // The screen's lines are kept for the track they were written for. The track is read when
  // they are written (a section's effects), so it is the committed one: a layout effect, run
  // before any section's passive effects in the same commit.
  const [written, setWritten] = useState<Written | null>(null);
  const writing = useRef(current);
  useLayoutEffect(() => {
    writing.current = current;
  });
  const deskLines = useMemo<ScreenText>(() => ({ lines: deskScreenLines(tracks.length) }), [tracks.length]);
  const screen = written && written.track === current ? written : current ? null : deskLines;
  // For tests: the lines the player was last handed (null: its own).
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as { __deskScreen?: [string, string] | null };
    w.__deskScreen = screen?.lines ?? null;
  }, [screen]);
  useEffect(
    () => () => {
      if (process.env.NODE_ENV !== "production") delete (window as unknown as { __deskScreen?: unknown }).__deskScreen;
    },
    [],
  );

  const project = useCallback<Project>((id) => desk3d.current?.project(id) ?? null, []);
  const onFrame = useCallback(() => {
    tapeLinks.current?.place();
    keyLinks.current?.place();
    hint.current?.place();
  }, []);
  const onHover = useCallback((id: TrackId | null) => desk3d.current?.hover(id), []);
  const onHot = useCallback((id: TrackId | null) => tapeLinks.current?.hot(id), []);
  const onInspect = useCallback((id: TrackId) => desk3d.current?.inspect(id), []);
  // The pointer over a tape link is the 3D's: its view gets the same move or press (a press
  // then holds the pointer, by pointer capture, for the drag and the release). The copy
  // bubbles too, so a document-level pointer listener sees such a move or press twice.
  const onPointer = useCallback((e: PointerEvent) => {
    document.querySelector("[data-desk-view]")?.dispatchEvent(new PointerEvent(e.type, e));
  }, []);
  // The wheel over a key is the knob's, as over the rest of the player: the 3D's view gets a
  // copy, and when it turns the knob (it cancels the copy), the page does not scroll.
  const onKeyWheel = useCallback((e: WheelEvent) => {
    const copy = new WheelEvent(e.type, { ...wheelInit(e), bubbles: false, cancelable: true });
    document.querySelector("[data-desk-view]")?.dispatchEvent(copy);
    if (copy.defaultPrevented) e.preventDefault();
  }, []);

  const knob = useMemo(() => knobStack(), []);
  const api = useMemo<DeskApi>(
    () => ({
      // The same lines again are not a change (no re-render, no repaint).
      setScreen: (lines, progress) =>
        setWritten((was) => {
          const track = writing.current;
          const same = was && was.track === track && was.progress === progress && was.lines[0] === lines[0] && was.lines[1] === lines[1];
          return same ? was : { lines, progress, track };
        }),
      useKnob: knob.useKnob,
      wiggleKnob: () => desk3d.current?.wiggle(),
    }),
    [knob],
  );

  return (
    <DeskContext.Provider value={api}>
      <div data-desk-root>
        <DotField ref={dots} tint={current ? TRACK_INK[current] : REST_INK} playing={!!current} night={night} />
        {has3D && (
          <Desk3D
            ref={desk3d}
            tracks={tracks}
            content={content}
            state={state}
            current={current}
            screen={screen}
            night={night}
            onTapeClick={onTapeClick}
            onKnob={knob.step}
            onInsert={onInsert}
            onFrame={onFrame}
            onHover={onHot}
            onUnavailable={() => setHas3D(false)}
          />
        )}
        {!has3D && <SpriteDesk tracks={tracks} current={current} screen={screen?.lines ?? null} />}
        <TapeLinks
          ref={tapeLinks}
          tracks={tracks}
          base={base}
          current={current}
          project={has3D ? project : null}
          onHover={onHover}
          onInspect={onInspect}
          onPointer={onPointer}
        />
        {state === "desk" && <LampCord />}
        {state === "desk" && <DeskHint ref={hint} project={has3D ? project : null} />}
        {current && <Transport tracks={tracks} base={base} current={current} />}
        <PlayerKeys ref={keyLinks} tracks={tracks} base={base} current={current} project={has3D ? project : null} onWheel={has3D ? onKeyWheel : undefined} />
        <JCard tracks={tracks} base={base} current={current} heading={heading} seatDelay={has3D ? TIMING.fly + TIMING.drop + TIMING.load : 0}>
          {children}
        </JCard>
      </div>
    </DeskContext.Provider>
  );
}

/** A wheel event's own fields, for a copy (a spread of the event would copy none of them). */
function wheelInit(e: WheelEvent): WheelEventInit {
  const { deltaX, deltaY, deltaZ, deltaMode, clientX, clientY, screenX, screenY, ctrlKey, shiftKey, altKey, metaKey, buttons } = e;
  return { deltaX, deltaY, deltaZ, deltaMode, clientX, clientY, screenX, screenY, ctrlKey, shiftKey, altKey, metaKey, buttons };
}
