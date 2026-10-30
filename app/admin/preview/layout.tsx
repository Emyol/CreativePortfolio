import type { ReactNode } from "react";
import { Desk } from "@/components/desk/Desk";
import { PREVIEW_BASE, previewDraft } from "./draft";
import { PreviewLabel } from "./PreviewLabel";
import styles from "./preview.module.css";

export const dynamic = "force-dynamic";

/**
 * The draft on the real desk, owner-only and never cached: the same desk, J-card and devices
 * as the public site, its paths under /admin/preview, and the label saying it isn't live.
 */
export default async function PreviewLayout({ children }: { children: ReactNode }) {
  const { content, hidden } = await previewDraft();
  return (
    <div className={styles.room} data-notes={hidden > 0 ? "" : undefined}>
      <PreviewLabel hidden={hidden} />
      <Desk content={content} base={PREVIEW_BASE} preview>
        {children}
      </Desk>
    </div>
  );
}
