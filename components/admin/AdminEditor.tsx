"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createAutosave } from "@/lib/admin/autosave";
import { issuesByPath, slugify } from "@/lib/admin/issues";
import { SECTIONS } from "@/lib/admin/sections";
import type { SiteContent } from "@/lib/content/schema";
import { EditorContext, fieldId, getIn, pathKey, resolve, setIn, toTokens, withKeys, withoutKeys, type Editor, type Path } from "./editorContext";
import { Section } from "./Section";
import { StatusBar, type PublishState } from "./StatusBar";
import styles from "./admin.module.css";

async function saveDraft(content: unknown, revision: number): Promise<number> {
  const res = await fetch("/api/admin/content", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: withoutKeys(content), revision }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw { status: res.status, message: body.error };
  }
  return ((await res.json()) as { revision: number }).revision;
}

/** An event's address follows its name until it is edited by hand. */
function withSlug(content: SiteContent, path: Path, value: unknown): SiteContent {
  const [list, index, key] = path;
  if (list !== "events" || key !== "name" || typeof index !== "number") return setIn(content, path, value);
  const event = content.events[index] as { name?: string; slug?: string } | undefined;
  const followsName = !event?.slug || event.slug === slugify(event.name ?? "");
  const next = setIn(content, path, value);
  return followsName ? setIn(next, ["events", index, "slug"], slugify(String(value ?? ""))) : next;
}

export function AdminEditor({ initialContent, initialRevision }: { initialContent: SiteContent; initialRevision: number }) {
  const counter = useRef(0);
  const newKey = useCallback(() => `k${++counter.current}`, []);
  const [content, setContent] = useState<SiteContent>(() => withKeys(initialContent, newKey));
  // The latest content, so quick successive edits never build on a stale copy.
  const latest = useRef(content);
  const [autosave] = useState(() => createAutosave({ save: saveDraft, revision: initialRevision }));
  const status = useSyncExternalStore(autosave.subscribe, autosave.status, autosave.status);
  const [publish, setPublish] = useState<PublishState>({ kind: "idle" });
  const issues = useMemo(() => issuesByPath(content), [content]);
  // Fields the owner has edited or left (by the editor's paths), and whether Fix showed all.
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set());
  const [revealed, setRevealed] = useState(false);
  const touch = useCallback((path: Path) => setTouched((t) => (t.has(pathKey(path)) ? t : new Set(t).add(pathKey(path)))), []);
  // An edit after publishing means what's on screen is no longer what's live.
  const edited = useCallback(() => setPublish((p) => (p.kind === "done" || p.kind === "failed" ? { kind: "idle" } : p)), []);

  // Leaving with unsaved changes: save now and let the browser warn.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (autosave.status() === "saved") return;
      void autosave.flush();
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [autosave]);

  const editor = useMemo<Editor>(
    () => ({
      get: (path) => {
        const at = resolve(content, path);
        return at ? getIn(content, at) : undefined;
      },
      set: (path, value) => {
        const at = resolve(latest.current, path);
        if (!at) return; // the entry was removed meanwhile
        const next = withSlug(latest.current, at, value);
        latest.current = next;
        setContent(next);
        autosave.change(next);
        edited();
        touch(path);
      },
      update: (path, fn) => {
        const at = resolve(latest.current, path);
        if (!at) return;
        const next = setIn(latest.current, at, fn(getIn(latest.current, at)));
        latest.current = next;
        setContent(next);
        autosave.change(next);
        edited();
      },
      issue: (path) => {
        const at = resolve(content, path);
        return at ? issues.get(pathKey(at)) : undefined;
      },
      shown: (path) => revealed || touched.has(pathKey(path)),
      touch,
      issuesUnder: (path) => {
        const at = resolve(content, path);
        if (!at) return 0;
        const key = pathKey(at);
        let n = 0;
        for (const k of issues.keys()) if (k === key || k.startsWith(`${key}.`)) n++;
        return n;
      },
      newKey,
    }),
    [content, issues, autosave, newKey, edited, touched, revealed, touch],
  );

  const showIssue = useCallback(() => {
    const first = issues.keys().next().value;
    if (first === undefined) return;
    setRevealed(true);
    const parts = toTokens(content, first.split(".").map((p) => (/^\d+$/.test(p) ? Number(p) : p)));
    // The deepest field that exists on the page (a list-wide problem points at its section).
    for (let n = parts.length; n > 0; n--) {
      const el = document.getElementById(fieldId(parts.slice(0, n))) ?? (n === 1 ? document.getElementById(`edit-${parts[0]}`) : null);
      if (el) {
        el.scrollIntoView({ block: "center" });
        el.focus({ preventScroll: true });
        return;
      }
    }
  }, [issues, content]);

  const confirmPublish = async () => {
    setPublish({ kind: "working" });
    try {
      await autosave.flush();
      // Publishing goes by the saved draft: if the latest change didn't save, publishing
      // now would put an older version live while the screen shows the newer one.
      if (autosave.status() !== "saved") {
        setPublish({ kind: "failed", message: "Your latest changes aren't saved yet, so nothing was published." });
        return;
      }
      const res = await fetch("/api/admin/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ revision: autosave.revision() }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setPublish(res.ok ? { kind: "done" } : { kind: "failed", message: body.error ?? "Couldn't publish. Try again." });
    } catch {
      setPublish({ kind: "failed", message: "Couldn't reach the server. Try again." });
    }
  };

  return (
    <EditorContext.Provider value={editor}>
      <div className={styles.editorBody}>
        <h1 className={styles.title}>Edit the tape</h1>
        <p className={styles.lede}>Changes save as you go. Nothing reaches visitors until you publish.</p>
        <div className={styles.account}>
          <a className={styles.secondary} href="/api/admin/export" download>Export backup</a>
          <form action="/auth/logout" method="post">
            <button className={styles.secondary} type="submit">Sign out</button>
          </form>
        </div>
        <nav aria-label="Sections" className={styles.jump}>
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#edit-${s.id}`} data-issues={editor.issuesUnder([s.id]) || undefined}>{s.title}</a>
          ))}
        </nav>
        {SECTIONS.map((s) => (
          <Section key={s.id} section={s} />
        ))}
      </div>
      <StatusBar
        status={status}
        message={autosave.message()}
        issues={issues.size}
        publish={publish}
        onShowIssue={showIssue}
        onPublish={() => setPublish({ kind: "confirm" })}
        onConfirm={confirmPublish}
        onCancel={() => setPublish({ kind: "idle" })}
      />
    </EditorContext.Provider>
  );
}
