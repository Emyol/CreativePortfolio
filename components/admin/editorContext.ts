"use client";
import { createContext, useContext } from "react";

export type Path = (string | number)[];

export type Editor = {
  get: (path: Path) => unknown;
  /** Sets a value; undefined removes the key (empty optional fields). */
  set: (path: Path, value: unknown) => void;
  /** Applies `fn` to the latest value at `path` (for async work like uploads finishing). */
  update: (path: Path, fn: (current: unknown) => unknown) => void;
  issue: (path: Path) => string | undefined;
  /** How many problems sit at or below `path`. */
  issuesUnder: (path: Path) => number;
};

export const EditorContext = createContext<Editor | null>(null);

export function useEditor(): Editor {
  const editor = useContext(EditorContext);
  if (!editor) throw new Error("useEditor outside AdminEditor");
  return editor;
}

export const pathKey = (path: Path) => path.join(".");
export const fieldId = (path: Path) => `field-${path.join("-")}`;

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
