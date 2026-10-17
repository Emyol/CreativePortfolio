"use client";
import { useState } from "react";
import type { SectionSpec } from "@/lib/admin/sections";
import { useEditor } from "./editorContext";
import { Field } from "./fields";
import styles from "./admin.module.css";

type Item = Record<string, unknown> & { archived?: boolean };

/**
 * One list on the tape. Entries open and close; each can move, be hidden from the tape
 * without deleting it, or be removed (with an Undo until the next change).
 */
export function ListEditor({ section }: { section: SectionSpec }) {
  const { get, set, issue, issuesUnder } = useEditor();
  const items = (get([section.id]) as Item[] | undefined) ?? [];
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [removed, setRemoved] = useState<{ index: number; item: Item } | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  const write = (next: Item[]) => set([section.id], next);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    write(next);
    setRemoved(null);
  };
  const add = () => {
    const blank = section.blank?.() ?? {};
    const atStart = section.addAt === "start";
    write(atStart ? [blank, ...items] : [...items, blank]);
    setOpen(new Set([atStart ? 0 : items.length]));
    setRemoved(null);
  };
  const remove = (index: number) => {
    setRemoved({ index, item: items[index] });
    write(items.filter((_, i) => i !== index));
  };
  const undo = () => {
    if (!removed) return;
    const next = [...items];
    next.splice(removed.index, 0, removed.item);
    write(next);
    setRemoved(null);
  };
  const listIssue = issue([section.id]);
  // Entries with a problem inside stay open, so the problem is seen.
  const hasIssue = (i: number) => issuesUnder([section.id, i]) > 0;

  return (
    <div className={styles.list}>
      {listIssue && <p className={styles.error}>{listIssue}</p>}
      <button type="button" className={styles.add} onClick={add}>
        {section.addLabel ?? "Add"}
      </button>
      {removed && (
        <p className={styles.undo} role="status">
          Removed.{" "}
          <button type="button" className={styles.link} onClick={undo}>Undo</button>
        </p>
      )}
      <ol className={styles.items}>
        {items.map((item, i) => {
          const label = section.itemLabel?.(item) ?? `Entry ${i + 1}`;
          const isOpen = open.has(i) || hasIssue(i);
          return (
            <li
              key={i}
              className={styles.item}
              data-archived={item.archived ? "" : undefined}
              draggable
              onDragStart={() => setDragFrom(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => dragFrom !== null && move(dragFrom, i)}
            >
              <details
                open={isOpen}
                onToggle={(e) => {
                  const now = (e.currentTarget as HTMLDetailsElement).open;
                  setOpen((prev) => {
                    const next = new Set(prev);
                    if (now) next.add(i);
                    else next.delete(i);
                    return next;
                  });
                }}
              >
                <summary className={styles.summary}>
                  <span className={styles.summaryLabel}>{label}</span>
                  {item.archived && <span className={styles.badge}>hidden</span>}
                </summary>
                <div className={styles.itemBody}>
                  {section.fields.map((f) => (
                    <Field key={f.key} spec={f} path={[section.id, i, f.key]} />
                  ))}
                  <div className={styles.itemTools}>
                    <button type="button" className={styles.tool} onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Move ${label} up`}>Move up</button>
                    <button type="button" className={styles.tool} onClick={() => move(i, i + 1)} disabled={i === items.length - 1} aria-label={`Move ${label} down`}>Move down</button>
                    <label className={styles.toggle}>
                      <input type="checkbox" checked={!!item.archived} onChange={(e) => set([section.id, i, "archived"], e.target.checked || undefined)} />
                      <span>Hide from the tape</span>
                    </label>
                    <button type="button" className={styles.danger} onClick={() => remove(i)} aria-label={`Remove ${label}`}>Remove</button>
                  </div>
                </div>
              </details>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
