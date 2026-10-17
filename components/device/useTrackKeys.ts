"use client";
import { useEffect, useRef } from "react";
import { trackKeysEnabled } from "@/lib/keys";
import { scrollToId } from "@/lib/motion/navigate";
import { playKey } from "@/lib/sound";
import { shouldHandleTrackKey, sideTracks, trackForKey, type SideId, type Track } from "@/lib/tape";

const FLASH_MS = 140;

/** Briefly sinks the live key for track `index`, so a shortcut shows which key it pressed. */
export function flashKey(index: number): void {
  const key = document.querySelector<HTMLElement>(`[data-tape-keys]:not([inert]) [data-key-index="${index}"]`);
  if (!key) return;
  key.setAttribute("data-pressed", "");
  window.setTimeout(() => key.removeAttribute("data-pressed"), FLASH_MS);
}

/**
 * Keys 1 to 4 jump to the current side's tracks; B flips to the other side's first track.
 * The side a jump lands on is remembered at once, so "B" then "2" works before the page
 * has finished scrolling and the active track has caught up.
 */
export function useTrackKeys(tracks: Track[], side: SideId): void {
  const sideRef = useRef(side);
  useEffect(() => {
    sideRef.current = side;
  }, [side]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!trackKeysEnabled() || !shouldHandleTrackKey(e)) return;
      if (e.key === "b" || e.key === "B") {
        const other: SideId = sideRef.current === "a" ? "b" : "a";
        const first = sideTracks(tracks, other)[0];
        if (!first) return;
        e.preventDefault();
        playKey();
        sideRef.current = other;
        scrollToId(first.id);
        return;
      }
      const track = trackForKey(e.key, tracks, sideRef.current);
      if (!track) return;
      e.preventDefault();
      flashKey(Number(e.key) - 1);
      playKey();
      scrollToId(track.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tracks]);
}

/** Pointer and Enter presses sink a tape key while held, with its click. */
export function useKeyPress(): void {
  useEffect(() => {
    const keyOf = (t: EventTarget | null) => (t instanceof Element ? t.closest<HTMLElement>("[data-key-index]") : null);
    const release = () => document.querySelectorAll("[data-key-index][data-pressed]").forEach((k) => k.removeAttribute("data-pressed"));
    const down = (e: PointerEvent) => {
      const key = keyOf(e.target);
      if (!key || e.button !== 0) return;
      key.setAttribute("data-pressed", "");
      playKey();
    };
    const keyDown = (e: KeyboardEvent) => {
      const key = keyOf(e.target);
      if (!key || e.key !== "Enter" || e.repeat) return;
      key.setAttribute("data-pressed", "");
      playKey();
    };
    document.addEventListener("pointerdown", down);
    document.addEventListener("pointerup", release);
    document.addEventListener("pointercancel", release);
    document.addEventListener("keydown", keyDown);
    document.addEventListener("keyup", release);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("pointerup", release);
      document.removeEventListener("pointercancel", release);
      document.removeEventListener("keydown", keyDown);
      document.removeEventListener("keyup", release);
    };
  }, []);
}
