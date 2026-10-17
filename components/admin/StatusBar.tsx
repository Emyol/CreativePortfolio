"use client";
import type { SaveStatus } from "@/lib/admin/autosave";
import styles from "./admin.module.css";

const LABEL: Record<SaveStatus, string> = {
  saved: "Saved",
  pending: "Saving soon",
  saving: "Saving",
  offline: "Offline, will retry",
  conflict: "Saved somewhere else since. Reload to get the latest.",
  "signed-out": "Signed out. Sign in again in a new tab, then come back here.",
  error: "Couldn't save.",
};

export type PublishState = { kind: "idle" } | { kind: "confirm" } | { kind: "working" } | { kind: "done" } | { kind: "failed"; message: string };

type Props = {
  status: SaveStatus;
  /** The server's reason for a failed save. */
  message?: string;
  issues: number;
  publish: PublishState;
  onShowIssue: () => void;
  onPublish: () => void;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Always in reach: what autosave is doing, the preview, and publishing. */
export function StatusBar({ status, message, issues, publish, onShowIssue, onPublish, onConfirm, onCancel }: Props) {
  // Publishing goes by the saved draft, so it waits until the latest change is saved.
  const blocked = issues > 0 || status === "conflict" || status === "offline" || status === "signed-out" || status === "error";
  return (
    <div className={styles.bar} role="region" aria-label="Save and publish">
      <p className={styles.status} role="status" data-status={status}>
        <span className={styles.lamp} aria-hidden="true" />
        {status === "error" && message ? `${LABEL.error} ${message}` : LABEL[status]}
      </p>
      {status === "signed-out" && (
        <a className={styles.secondary} href="/auth/login" target="_blank" rel="noopener">Sign in</a>
      )}
      {status === "conflict" && (
        <button type="button" className={styles.secondary} onClick={() => location.reload()}>Reload</button>
      )}
      <a className={styles.secondary} href="/admin/preview" target="_blank" rel="noopener">Preview</a>
      {issues > 0 && (
        <button type="button" className={styles.secondary} onClick={onShowIssue}>
          Fix {issues} {issues === 1 ? "thing" : "things"} first
        </button>
      )}
      {publish.kind === "confirm" ? (
        <span className={styles.confirm}>
          <button type="button" className={styles.primary} onClick={onConfirm}>Publish to the tape</button>
          <button type="button" className={styles.secondary} onClick={onCancel}>Cancel</button>
        </span>
      ) : (
        <button type="button" className={styles.primary} disabled={blocked || publish.kind === "working"} onClick={onPublish}>
          {publish.kind === "working" ? "Publishing" : "Publish"}
        </button>
      )}
      <p className={styles.result} role="status">
        {publish.kind === "done" ? "Published" : publish.kind === "failed" ? publish.message : ""}
      </p>
    </div>
  );
}
