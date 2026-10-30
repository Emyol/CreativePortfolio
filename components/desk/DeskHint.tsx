"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { HINT_TEXT, useHintSeen } from "@/lib/desk/hint";
import type { OverlayHandle, Project } from "./overlayPlace";
import styles from "./DeskHint.module.css";

const GAP = 14; // px between the player and the hint
const EDGE = 16; // px the hint keeps from the viewport's sides

/**
 * The first visit's one line under the player, printed on a slip of paper: the toys a
 * visitor wouldn't find by looking (spec "First visit and discoverability"). Shown on the
 * desk until the first tape goes in, then never again in this browser (lib/desk/hint).
 * Over the 3D it follows the player's drawing (`place`, every frame) and waits unseen for
 * the first one; without the 3D it sits under the sprite player by CSS.
 */
export const DeskHint = forwardRef<OverlayHandle, { project: Project | null }>(function DeskHint({ project }, ref) {
  const seen = useHintSeen();
  const el = useRef<HTMLParagraphElement>(null);
  const latest = useRef(project);
  const last = useRef("");
  // The 3D gone: back to the CSS place under the sprite player.
  useEffect(() => {
    latest.current = project;
    const p = el.current;
    if (project || !p) return;
    last.current = "";
    p.style.removeProperty("transform");
    delete p.dataset.placed;
  }, [project]);

  useImperativeHandle(
    ref,
    () => ({
      place() {
        const p = el.current;
        const r = latest.current?.("player");
        if (!p || !r) return;
        const half = p.offsetWidth / 2;
        const x = Math.round(Math.min(Math.max(r.x + r.width / 2, half + EDGE), window.innerWidth - half - EDGE));
        const y = Math.round(r.bottom + GAP);
        const key = `${x} ${y}`;
        if (last.current === key) return;
        last.current = key;
        p.style.transform = `translate3d(${x - half}px, ${y}px, 0)`;
        p.dataset.placed = "";
      },
    }),
    [],
  );

  if (seen) return null;
  return (
    <p ref={el} className={styles.hint} data-desk-hint data-over3d={project ? "" : undefined}>
      {HINT_TEXT}
    </p>
  );
});
