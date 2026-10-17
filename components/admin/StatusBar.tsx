"use client";
import { useEffect, useRef } from "react";
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

// Only what needs the owner's attention is read out; routine saving stays quiet.
const POLITE: SaveStatus[] = ["offline", "signed-out"];
const URGENT: SaveStatus[] = ["conflict", "error"];

/** Always in reach: what autosave is doing, the preview, and publishing. */
export function StatusBar({ status, message, issues, publish, onShowIssue, onPublish, onConfirm, onCancel }: Props) {
  // Publishing goes by the saved draft, so it waits until the latest change is saved.
  const blocked = issues > 0 || status === "conflict" || status === "offline" || status === "signed-out" || status === "error";
  const text = status === "error" && message ? `${LABEL.error} ${message}` : LABEL[status];
  const confirmRef = useRef<HTMLButtonElement>(null);
  const publishRef = useRef<HTMLButtonElement>(null);
  const cancelled = useRef(false);
  useEffect(() => {
    if (publish.kind === "confirm") confirmRef.current?.focus();
    else if (cancelled.current) publishRef.current?.focus();
    cancelled.current = false;
  }, [publish.kind]);
  return (
    <div className={styles.bar} role="region" aria-label="Save and publish">
      <p className={styles.status} data-status={status}>
        <span className={styles.lamp} aria-hidden="true" />
        {text}
      </p>
      <p className="sr-only" role="status">{POLITE.includes(status) ? text : ""}</p>
      <p className="sr-only" role="alert">{URGENT.includes(status) ? text : ""}</p>
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
          <button ref={confirmRef} type="button" className={styles.primary} onClick={onConfirm}>Publish to the tape</button>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => {
              cancelled.current = true;
              onCancel();
            }}
          >
            Cancel
          </button>
        </span>
      ) : (
        <button ref={publishRef} type="button" className={styles.primary} disabled={blocked || publish.kind === "working"} onClick={onPublish}>
          {publish.kind === "working" ? "Publishing" : "Publish"}
        </button>
      )}
      <p className={styles.result} role="status">
        {publish.kind === "done" ? "Published" : publish.kind === "failed" ? publish.message : ""}
      </p>
    </div>
  );
}
