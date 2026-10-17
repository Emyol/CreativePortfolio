"use client";
import { useEffect, useRef, useState } from "react";
import type { SectionSpec } from "@/lib/admin/sections";
import { fieldId, KEY, token, useEditor } from "./editorContext";
import { Field } from "./fields";
import styles from "./admin.module.css";

type Item = Record<string, unknown> & { archived?: boolean; [KEY]?: string };

/**
 * One list on the tape. Entries open and close; each can move, be hidden from the tape
 * without deleting it, or be removed (with an Undo until the next change). Entries are
 * keyed by identity, so focus and open state follow an entry when it moves.
 */
export function ListEditor({ section }: { section: SectionSpec }) {
  const { get, set, issue, issuesUnder, newKey } = useEditor();
  const items = (get([section.id]) as Item[] | undefined) ?? [];
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [removed, setRemoved] = useState<{ index: number; item: Item } | null>(null);
  const dragFrom = useRef<number | null>(null);
  const undoButton = useRef<HTMLButtonElement>(null);
  const [focusAfter, setFocusAfter] = useState<string | null>(null);

  // After a move, focus goes back to the moved entry's control (by id, as it re-renders).
  useEffect(() => {
    if (!focusAfter) return;
    document.getElementById(focusAfter)?.focus();
    setFocusAfter(null);
  }, [focusAfter, items]);

  const write = (next: Item[]) => set([section.id], next);
  const keyOf = (item: Item) => item[KEY] ?? "";
  const pathOf = (item: Item) => [section.id, token(keyOf(item))];

  const move = (from: number, to: number, focus?: "up" | "down") => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    write(next);
    setRemoved(null);
    if (focus) {
      // At the ends the button disables; then focus the entry's summary instead.
      const stuck = (focus === "up" && to === 0) || (focus === "down" && to === items.length - 1);
      setFocusAfter(`${fieldId(pathOf(item))}-${stuck ? "summary" : focus}`);
    }
  };
  const add = () => {
    const blank = { ...(section.blank?.() ?? {}), [KEY]: newKey() } as Item;
    const atStart = section.addAt === "start";
    write(atStart ? [blank, ...items] : [...items, blank]);
    setOpen((prev) => new Set(prev).add(keyOf(blank)));
    setRemoved(null);
  };
  const remove = (index: number) => {
    setRemoved({ index, item: items[index] });
    write(items.filter((_, i) => i !== index));
  };
  useEffect(() => {
    if (removed) undoButton.current?.focus();
  }, [removed]);
  const undo = () => {
    if (!removed) return;
    const next = [...items];
    next.splice(Math.min(removed.index, next.length), 0, removed.item);
    write(next);
    setRemoved(null);
    setFocusAfter(`${fieldId(pathOf(removed.item))}-summary`);
  };
  const listIssue = issue([section.id]);

  return (
    <div className={styles.list}>
      {listIssue && (
        <p id={fieldId([section.id])} tabIndex={-1} className={styles.error}>{listIssue}</p>
      )}
      <button type="button" className={styles.add} onClick={add}>
        {section.addLabel ?? "Add"}
      </button>
      {removed && (
        <p className={styles.undo}>
          Removed.{" "}
          <button ref={undoButton} type="button" className={styles.link} onClick={undo}>Undo</button>
        </p>
      )}
      <ol className={styles.items}>
        {items.map((item, i) => {
          const key = keyOf(item);
          const path = pathOf(item);
          const id = fieldId(path);
          const label = section.itemLabel?.(item) ?? `Entry ${i + 1}`;
          // Entries with a problem inside open, so the problem is seen.
          const isOpen = open.has(key) || issuesUnder(path) > 0;
          return (
            <li
              key={key || i}
              className={styles.item}
              data-archived={item.archived ? "" : undefined}
              onDragOver={(e) => dragFrom.current !== null && e.preventDefault()}
              onDrop={() => {
                if (dragFrom.current !== null) move(dragFrom.current, i);
                dragFrom.current = null;
              }}
            >
              <details
                open={isOpen}
                onToggle={(e) => {
                  const now = (e.currentTarget as HTMLDetailsElement).open;
                  setOpen((prev) => {
                    const next = new Set(prev);
                    if (now) next.add(key);
                    else next.delete(key);
                    return next;
                  });
                }}
              >
                <summary
                  id={`${id}-summary`}
                  className={styles.summary}
                  draggable
                  onDragStart={() => (dragFrom.current = i)}
                  onDragEnd={() => (dragFrom.current = null)}
                >
                  <span className={styles.summaryLabel}>{label}</span>
                  {item.archived && <span className={styles.badge}>hidden</span>}
                </summary>
                <div className={styles.itemBody}>
                  {section.fields.map((f) => (
                    <Field key={f.key} spec={f} path={[...path, f.key]} />
                  ))}
                  <div className={styles.itemTools}>
                    <button id={`${id}-up`} type="button" className={styles.tool} onClick={() => move(i, i - 1, "up")} disabled={i === 0} aria-label={`Move ${label} up`}>Move up</button>
                    <button id={`${id}-down`} type="button" className={styles.tool} onClick={() => move(i, i + 1, "down")} disabled={i === items.length - 1} aria-label={`Move ${label} down`}>Move down</button>
                    <label className={styles.toggle}>
                      <input type="checkbox" checked={!!item.archived} onChange={(e) => set([...path, "archived"], e.target.checked || undefined)} />
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
