"use client";

import Link from "next/link";
import { useEffect } from "react";
import styles from "./not-found.module.css";

/**
 * The root's last resort: something in a layout (the desk itself, the admin) threw while it
 * rendered. A track's own failure is app/(tape)/error.tsx's, and the desk's 3D falls back to
 * the flat drawing on its own (Desk3D); this is for whatever is left.
 */
export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => console.info("[site] a page failed to show:", error), [error]);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <main id="main" tabIndex={-1} className={styles.page}>
        <h1 className={styles.title}>The tape skipped.</h1>
        <p className={styles.back}>
          <button type="button" className={styles.retry} onClick={() => retry()}>
            Try again
          </button>{" "}
          or <Link href="/">back to the tape</Link>
        </p>
      </main>
    </>
  );
}
