"use client";
import { useEffect, useId, useState, type ReactNode } from "react";
import { PROFESSIONAL_STACK } from "@/lib/content/schema";
import type { FieldSpec } from "@/lib/admin/sections";
import { fieldId, useEditor, type Path } from "./editorContext";
import styles from "./admin.module.css";

type Photo = { src: string; alt: string; width: number; height: number };

/** Label, hint and the field's own problem, wired to the control for screen readers. */
export function FieldFrame({ path, label, hint, children, group = false }: { path: Path; label: string; hint?: string; children: (a11y: { id: string; describedBy?: string; invalid: boolean }) => ReactNode; group?: boolean }) {
  const { issue } = useEditor();
  const id = fieldId(path);
  const problem = issue(path);
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = problem ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const Label = group ? "span" : "label";
  return (
    <div className={styles.field} data-invalid={problem ? "" : undefined}>
      <Label className={styles.label} {...(group ? { id: `${id}-label` } : { htmlFor: id })}>{label}</Label>
      {hint && <p id={hintId} className={styles.hint}>{hint}</p>}
      {children({ id, describedBy, invalid: !!problem })}
      {problem && <p id={errorId} className={styles.error}>{problem}</p>}
    </div>
  );
}

const optionalText = (value: string, optional?: boolean) => (optional && value.trim() === "" ? undefined : value);

function TextField({ spec, path, type = "text" }: { spec: FieldSpec; path: Path; type?: "text" | "url" }) {
  const { get, set } = useEditor();
  const value = (get(path) as string | undefined) ?? "";
  return (
    <FieldFrame path={path} label={spec.label} hint={spec.hint}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          className={styles.input}
          type={type}
          inputMode={type === "url" ? "url" : undefined}
          autoComplete="off"
          value={value}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          onChange={(e) => set(path, optionalText(e.target.value, spec.optional))}
        />
      )}
    </FieldFrame>
  );
}

function LongTextField({ spec, path }: { spec: FieldSpec; path: Path }) {
  const { get, set } = useEditor();
  const value = (get(path) as string | undefined) ?? "";
  return (
    <FieldFrame path={path} label={spec.label} hint={spec.hint}>
      {({ id, describedBy, invalid }) => (
        <textarea id={id} className={styles.textarea} rows={4} value={value} aria-describedby={describedBy} aria-invalid={invalid || undefined} onChange={(e) => set(path, optionalText(e.target.value, spec.optional))} />
      )}
    </FieldFrame>
  );
}

/**
 * Paragraphs as one text box with blank lines between them. The raw text is kept while
 * typing (so a blank line being typed doesn't vanish); the content gets the paragraphs.
 */
function ParagraphsField({ spec, path }: { spec: FieldSpec; path: Path }) {
  const { get, set } = useEditor();
  const stored = ((get(path) as string[] | undefined) ?? []).join("\n\n");
  const [raw, setRaw] = useState(stored);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setRaw(stored);
  }, [stored, focused]);
  return (
    <FieldFrame path={path} label={spec.label} hint={spec.hint}>
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          className={styles.textarea}
          rows={6}
          value={raw}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            setRaw(e.target.value);
            set(path, e.target.value.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean));
          }}
        />
      )}
    </FieldFrame>
  );
}

function SelectField({ spec, path }: { spec: FieldSpec; path: Path }) {
  const { get, set } = useEditor();
  return (
    <FieldFrame path={path} label={spec.label} hint={spec.hint}>
      {({ id, describedBy, invalid }) => (
        <select id={id} className={styles.input} value={(get(path) as string) ?? ""} aria-describedby={describedBy} aria-invalid={invalid || undefined} onChange={(e) => set(path, e.target.value)}>
          {spec.options?.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      )}
    </FieldFrame>
  );
}

/** YYYY, YYYY-MM or YYYY-MM-DD as text, with a calendar for the common case of a day. */
function DateField({ spec, path }: { spec: FieldSpec; path: Path }) {
  const { get, set } = useEditor();
  const value = (get(path) as string | undefined) ?? "";
  return (
    <FieldFrame path={path} label={spec.label} hint={spec.hint}>
      {({ id, describedBy, invalid }) => (
        <div className={styles.row}>
          <input id={id} className={styles.input} inputMode="numeric" placeholder="2026-10-18" value={value} aria-describedby={describedBy} aria-invalid={invalid || undefined} onChange={(e) => set(path, e.target.value.trim())} />
          <input className={styles.calendar} type="date" aria-label="Pick a day" value={/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ""} onChange={(e) => e.target.value && set(path, e.target.value)} />
        </div>
      )}
    </FieldFrame>
  );
}

function ToolboxField({ spec, path }: { spec: FieldSpec; path: Path }) {
  const { get, set } = useEditor();
  const chosen = new Set((get(path) as string[] | undefined) ?? []);
  const groupId = useId();
  return (
    <FieldFrame path={path} label={spec.label} hint={spec.hint} group>
      {({ id, describedBy }) => (
        <div role="group" aria-labelledby={`${id}-label`} aria-describedby={describedBy} className={styles.chips} id={groupId}>
          {PROFESSIONAL_STACK.map((tool) => (
            <label key={tool} className={styles.chip}>
              <input
                type="checkbox"
                checked={chosen.has(tool)}
                onChange={(e) => {
                  const next = new Set(chosen);
                  if (e.target.checked) next.add(tool);
                  else next.delete(tool);
                  set(path, PROFESSIONAL_STACK.filter((t) => next.has(t)));
                }}
              />
              <span>{tool}</span>
            </label>
          ))}
        </div>
      )}
    </FieldFrame>
  );
}

/** Existing photos with their descriptions; uploading and reordering arrive with PhotoList. */
function PhotosField({ spec, path, single }: { spec: FieldSpec; path: Path; single?: boolean }) {
  const { get, set } = useEditor();
  const value = get(path) as Photo[] | Photo | undefined;
  const photos = single ? (value ? [value as Photo] : []) : ((value as Photo[] | undefined) ?? []);
  return (
    <FieldFrame path={path} label={spec.label} hint={spec.hint} group>
      {() => (
        <ul className={styles.photos}>
          {photos.map((p, i) => {
            const altPath = single ? [...path, "alt"] : [...path, i, "alt"];
            return (
              <li key={`${p.src}-${i}`} className={styles.photo}>
                {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnails of draft uploads */}
                <img src={p.src} alt="" width={p.width} height={p.height} className={styles.thumb} />
                <FieldFrame path={altPath} label="Describe this photo">
                  {({ id, describedBy, invalid }) => (
                    <input id={id} className={styles.input} value={p.alt} aria-describedby={describedBy} aria-invalid={invalid || undefined} onChange={(e) => set(altPath, e.target.value)} />
                  )}
                </FieldFrame>
              </li>
            );
          })}
        </ul>
      )}
    </FieldFrame>
  );
}

export function Field({ spec, path }: { spec: FieldSpec; path: Path }) {
  switch (spec.kind) {
    case "text":
    case "slug":
    case "spotify":
      return <TextField spec={spec} path={path} />;
    case "url":
      return <TextField spec={spec} path={path} type="url" />;
    case "longtext":
      return <LongTextField spec={spec} path={path} />;
    case "paragraphs":
      return <ParagraphsField spec={spec} path={path} />;
    case "select":
      return <SelectField spec={spec} path={path} />;
    case "date":
      return <DateField spec={spec} path={path} />;
    case "toolbox":
      return <ToolboxField spec={spec} path={path} />;
    case "photos":
      return <PhotosField spec={spec} path={path} />;
    case "photo":
      return <PhotosField spec={spec} path={path} single />;
  }
}
