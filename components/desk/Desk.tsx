"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { SiteContent } from "@/lib/content/schema";
import { deskHref, hashRedirect, parseDeskPath } from "@/lib/desk/location";
import { TRACK_INK } from "@/lib/desk/tapeLabel";
import { visibleTracks, type TrackId } from "@/lib/tape";
import { Desk3D, type Desk3DHandle } from "./Desk3D";
import { DeskContext, knobStack, type DeskApi } from "./deskContext";
import { DotField, type DotFieldHandle } from "./DotField";
import type { OverlayHandle, Project } from "./overlayPlace";
import { PlayerKeys } from "./PlayerKeys";
import { SpriteDesk } from "./SpriteDesk";
import { TapeLinks } from "./TapeLinks";

const REST_INK: [number, number, number] = [255, 90, 31];

/**
 * The persistent desk: the dot field, the 3D player and tapes (or, without 3D, the sprite
 * player), the tape and key links over them, and the route's content. The route is the state
 * (a track path is the deck with that tape in), so the 3D follows Back and Forward. When a
 * tape loads, focus moves to its heading. Later tasks add the J-card and dock.
 */
export function Desk({ content, base, children }: { content: SiteContent; base: string; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const current = parseDeskPath(pathname, base).track;
  const state = current ? "deck" : "desk";
  const tracks = useMemo(() => visibleTracks(content), [content]);
  const desk3d = useRef<Desk3DHandle>(null);
  const dots = useRef<DotFieldHandle>(null);
  const [has3D, setHas3D] = useState(true);
  const tapeLinks = useRef<OverlayHandle>(null);
  const keyLinks = useRef<OverlayHandle>(null);

  useEffect(() => {
    const to = hashRedirect(location.pathname, location.hash, base);
    if (to) router.replace(to);
    // v1's power-on prepaint still darkens `/` until its entrance lifts it, and the desk has
    // no such entrance: lift it now (Task 15 removes the prepaint).
    delete document.documentElement.dataset.boot;
  }, [router, base]);

  useEffect(() => {
    const html = document.documentElement;
    html.dataset.desk = state;
    if (current) html.dataset.loaded = current;
    else delete html.dataset.loaded;
  }, [state, current]);
  useEffect(
    () => () => {
      delete document.documentElement.dataset.desk;
      delete document.documentElement.dataset.loaded;
    },
    [],
  );

  const onTapeClick = useCallback((id: TrackId) => router.push(deskHref(base, { track: id, event: null })), [router, base]);
  const onInsert = useCallback(() => {
    const p = desk3d.current?.slotOnScreen();
    if (p) dots.current?.ripple(p.x, p.y);
  }, []);

  // A tape loaded (not a direct load): focus its heading once the route's content is in.
  const shown = useRef(current);
  useEffect(() => {
    const was = shown.current;
    shown.current = current;
    if (!current || current === was) return;
    let raf = 0;
    let tries = 0;
    const seek = () => {
      const h = document.querySelector<HTMLElement>("main#main h2");
      if (h) h.focus();
      else if (tries++ < 120) raf = requestAnimationFrame(seek);
    };
    seek();
    return () => cancelAnimationFrame(raf);
  }, [current]);

  const project = useCallback<Project>((id) => desk3d.current?.project(id) ?? null, []);
  const onFrame = useCallback(() => {
    tapeLinks.current?.place();
    keyLinks.current?.place();
  }, []);
  const onHover = useCallback((id: TrackId | null) => desk3d.current?.hover(id), []);
  const onInspect = useCallback((id: TrackId) => desk3d.current?.inspect(id), []);
  // The pointer over a tape link is the 3D's: its view gets the same move or press (a press
  // then holds the pointer, by pointer capture, for the drag and the release).
  const onPointer = useCallback((e: PointerEvent) => {
    document.querySelector("[data-desk-view]")?.dispatchEvent(new PointerEvent(e.type, e));
  }, []);

  const knob = useMemo(() => knobStack(), []);
  const api = useMemo<DeskApi>(
    () => ({
      setScreen: (lines, progress) => desk3d.current?.screen(lines, progress),
      useKnob: knob.useKnob,
      wiggleKnob: () => desk3d.current?.wiggle(),
    }),
    [knob],
  );

  return (
    <DeskContext.Provider value={api}>
      <div data-desk-root>
        <DotField ref={dots} tint={current ? TRACK_INK[current] : REST_INK} playing={!!current} night={false} />
        {has3D && (
          <Desk3D
            ref={desk3d}
            tracks={tracks}
            content={content}
            state={state}
            current={current}
            night={false}
            onTapeClick={onTapeClick}
            onKnob={knob.step}
            onInsert={onInsert}
            onFrame={onFrame}
            onUnavailable={() => setHas3D(false)}
          />
        )}
        {!has3D && <SpriteDesk tracks={tracks} current={current} />}
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
        <PlayerKeys ref={keyLinks} tracks={tracks} base={base} current={current} project={has3D ? project : null} />
        {children}
      </div>
    </DeskContext.Provider>
  );
}
