"use client";
import { createContext, useContext } from "react";

/**
 * A path into the draft. Inside lists the editor uses an entry's identity token ("#k:3")
 * rather than its position, so a path keeps pointing at the same entry while entries are
 * added, moved or removed (an upload finishing late lands where it started, or nowhere).
 */
export type Path = (string | number)[];

export type Editor = {
  get: (path: Path) => unknown;
  /** Sets a value; undefined removes the key (empty optional fields). No-op if the entry is gone. */
  set: (path: Path, value: unknown) => void;
  /** Applies `fn` to the latest value at `path` (for async work like uploads finishing). */
  update: (path: Path, fn: (current: unknown) => unknown) => void;
  issue: (path: Path) => string | undefined;
  /** How many problems sit at or below `path`. */
  issuesUnder: (path: Path) => number;
  /** A fresh identity for a new list entry. */
  newKey: () => string;
};

export const EditorContext = createContext<Editor | null>(null);

export function useEditor(): Editor {
  const editor = useContext(EditorContext);
  if (!editor) throw new Error("useEditor outside AdminEditor");
  return editor;
}

export const KEY = "_key";
const TOKEN = "#k:";
export const token = (key: string) => `${TOKEN}${key}`;
const isToken = (seg: unknown): seg is string => typeof seg === "string" && seg.startsWith(TOKEN);

export const pathKey = (path: Path) => path.join(".");
export const fieldId = (path: Path) => `field-${path.join("-").replace(/[^A-Za-z0-9_-]/g, "_")}`;

/** Replaces identity tokens with the entries' current positions; null if an entry is gone. */
export function resolve(value: unknown, path: Path): Path | null {
  const out: Path = [];
  let node = value;
  for (const seg of path) {
    let step: string | number = seg;
    if (isToken(seg)) {
      if (!Array.isArray(node)) return null;
      const key = seg.slice(TOKEN.length);
      step = node.findIndex((item) => (item as Record<string, unknown> | null)?.[KEY] === key);
      if (step < 0) return null;
    }
    out.push(step);
    node = node == null ? undefined : (node as Record<string | number, unknown>)[step];
  }
  return out;
}

/** The inverse, for turning a schema issue's numeric path into the editor's path. */
export function toTokens(value: unknown, path: Path): Path {
  const out: Path = [];
  let node = value;
  for (const seg of path) {
    const item = node == null ? undefined : (node as Record<string | number, unknown>)[seg];
    const key = Array.isArray(node) && typeof seg === "number" ? (item as Record<string, unknown> | undefined)?.[KEY] : undefined;
    out.push(typeof key === "string" ? token(key) : seg);
    node = item;
  }
  return out;
}

export function getIn(value: unknown, path: Path): unknown {
  return path.reduce<unknown>((v, k) => (v == null ? undefined : (v as Record<string | number, unknown>)[k]), value);
}

/** An immutable copy of `value` with `path` set (or removed when `next` is undefined). */
export function setIn<T>(value: T, path: Path, next: unknown): T {
  if (path.length === 0) return next as T;
  const [head, ...rest] = path;
  const container = (Array.isArray(value) ? [...value] : { ...(value as object) }) as Record<string | number, unknown>;
  const child = setIn(container[head], rest, next);
  if (child === undefined && !Array.isArray(container)) delete container[head];
  else container[head] = child;
  return container as T;
}

const LISTS = ["events", "music", "hobbies", "shelf", "people", "links"] as const;

/** Gives every list entry an in-session identity. */
export function withKeys<T>(content: T, newKey: () => string): T {
  const out = { ...(content as Record<string, unknown>) };
  for (const list of LISTS) {
    if (Array.isArray(out[list])) out[list] = (out[list] as Record<string, unknown>[]).map((item) => (item?.[KEY] ? item : { ...item, [KEY]: newKey() }));
  }
  return out as T;
}

/** The draft as saved: identities removed. */
export function withoutKeys<T>(content: T): T {
  const out = { ...(content as Record<string, unknown>) };
  for (const list of LISTS) {
    if (Array.isArray(out[list])) out[list] = (out[list] as Record<string, unknown>[]).map(({ [KEY]: _drop, ...item }) => item);
  }
  return out as T;
}
