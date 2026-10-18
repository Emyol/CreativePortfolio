"use client";
import { throwableTidy } from "@/components/motion/Throwable";

/** Puts every thing on a table back where it started. */
export function TidyButton({ group, className }: { group: string; className?: string }) {
  return (
    <button type="button" className={className} onClick={() => throwableTidy(group)}>
      Tidy up
    </button>
  );
}
