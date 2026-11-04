"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Section } from "@/components/desk/Section";
import { parseDeskPath } from "@/lib/desk/location";
import styles from "./error.module.css";

/**
 * The last resort for a track that throws while it renders: the desk stays, and the track's
 * J-card says so on its device panel, with a retry and the way back to the desk (on the
 * desk itself, its own main with the desk's h1). The desk's own failures don't reach here:
 * its 3D falls back to the flat drawing (Desk3D), and anything else in the desk is the root
 * boundary's (app/error.tsx).
 */
export default function TapeError({ error, retry }: { error: unknown; retry: () => void }) {
  const onTrack = parseDeskPath(usePathname(), "").track !== null;
  useEffect(() => console.info("[desk] the track failed to show:", error), [error]);
  const body = (
    <div className={styles.box} role="alert">
      <p className={styles.line}>This track didn&rsquo;t play.</p>
      <p className={styles.actions}>
        <button type="button" className={styles.button} onClick={() => retry()}>
          Try again
        </button>
        <Link href="/">Back to the desk</Link>
      </p>
    </div>
  );
  if (onTrack) return <Section device={body} liner={null} />;
  return (
    <main id="jcard" tabIndex={-1} className={styles.page}>
      <h1 className="sr-only">Miel</h1>
      {body}
    </main>
  );
}
