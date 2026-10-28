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

const REST_INK: [number, number, number] = [255, 90, 31];

/**
 * The persistent desk: the dot field, the 3D player and tapes, and the route's content.
 * The route is the state (a track path is the deck with that tape in), so the 3D follows
 * Back and Forward. Later tasks add the J-card, dock and overlays around the route.
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
            onUnavailable={() => setHas3D(false)}
          />
        )}
        {children}
      </div>
    </DeskContext.Provider>
  );
}
