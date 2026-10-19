"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { DotPhoto } from "@/components/tracks/DotPhoto";
import { draft } from "@/components/tape/preview";
import { PROFESSIONAL_STACK, type Photo } from "@/lib/content/schema";
import { DOT_RANGES, DOTS, type DotSettings } from "@/lib/dotPhoto";
import type { FieldSpec } from "@/lib/admin/sections";
import { fieldId, useEditor, type Path } from "./editorContext";
import { PhotoList } from "./PhotoList";
import styles from "./admin.module.css";

/** Label, hint and the field's own problem, wired to the control for screen readers. */
export function FieldFrame({ path, label, hint, children, group = false }: { path: Path; label: string; hint?: string; children: (a11y: { id: string; describedBy?: string; invalid: boolean }) => ReactNode; group?: boolean }) {
  const { issue, shown, touch } = useEditor();
  const id = fieldId(path);
  // A problem waits until the field has been touched, so a new entry isn't all red at once.
  const problem = shown(path) ? issue(path) : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = problem ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const Label = group ? "span" : "label";
  // A group (photos, the toolbox) has no single control, so the group itself is what
  // "Fix" focuses and what carries the label and the problem.
  const groupProps = group ? { id, role: "group", tabIndex: -1, "aria-labelledby": `${id}-label`, "aria-describedby": describedBy } : {};
  return (
    <div className={styles.field} data-invalid={problem ? "" : undefined} onBlur={() => touch(path)} {...groupProps}>
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

const SPOTIFY_TRACK = /^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]{22}(\?.*)?$/;

/**
 * A pasted song link fills in the title and artist from Spotify when they are still empty.
 * Spotify may not answer; then nothing happens and they are typed by hand.
 */
function SpotifyField({ spec, path }: { spec: FieldSpec; path: Path }) {
  const { get, set, update } = useEditor();
  const value = (get(path) as string | undefined) ?? "";
  const [filled, setFilled] = useState(false);
  const looked = useRef("");
  const item = path.slice(0, -1);

  async function lookUp(link: string) {
    const url = link.trim();
    if (!SPOTIFY_TRACK.test(url) || looked.current === url) return;
    looked.current = url;
    try {
      const res = await fetch(`/api/admin/spotify?url=${encodeURIComponent(url)}`);
      if (!res.ok) return;
      const found = (await res.json()) as { title?: string; artist?: string };
      let changed = false;
      for (const key of ["title", "artist"] as const) {
        const v = found[key];
        if (!v) continue;
        update([...item, key], (now) => {
          if (typeof now === "string" && now.trim()) return now;
          changed = true;
          return v;
        });
      }
      if (changed) {
        setFilled(true);
        window.setTimeout(() => setFilled(false), 4000);
      }
    } catch {
      /* Spotify unreachable: the fields stay for typing. */
    }
  }

  return (
    <FieldFrame path={path} label={spec.label} hint={spec.hint}>
      {({ id, describedBy, invalid }) => (
        <>
          <input
            id={id}
            className={styles.input}
            type="url"
            inputMode="url"
            autoComplete="off"
            value={value}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            onChange={(e) => {
              set(path, e.target.value.trim());
              void lookUp(e.target.value);
            }}
            onBlur={(e) => void lookUp(e.target.value)}
          />
          <p className={styles.hint} role="status">{filled ? "Filled in from Spotify. Check it." : ""}</p>
        </>
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
          <input id={id} className={styles.input} placeholder="2026-10-18" value={value} aria-describedby={describedBy} aria-invalid={invalid || undefined} onChange={(e) => set(path, e.target.value.trim())} />
          <input className={styles.calendar} type="date" aria-label="Pick a day" value={/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ""} onChange={(e) => e.target.value && set(path, e.target.value)} />
        </div>
      )}
    </FieldFrame>
  );
}

function ToolboxField({ spec, path }: { spec: FieldSpec; path: Path }) {
  const { get, set } = useEditor();
  const chosen = new Set((get(path) as string[] | undefined) ?? []);
  return (
    <FieldFrame path={path} label={spec.label} hint={spec.hint} group>
      {() => (
        <div className={styles.chips}>
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

const DOT_SLIDERS: { key: keyof DotSettings; label: string; show: (v: number) => string }[] = [
  { key: "across", label: "Dots across", show: (v) => String(v) },
  { key: "brightness", label: "Brightness", show: (v) => `${v > 0 ? "+" : ""}${Math.round(v * 100)}%` },
  { key: "contrast", label: "Contrast", show: (v) => `×${v.toFixed(2)}` },
];

/**
 * How the candid is drawn as dots on the tape: how fine, how bright, how much contrast,
 * with the candid drawn beside them exactly as the tape will. Left as it is, nothing is saved.
 */
function DotsField({ spec, path }: { spec: FieldSpec; path: Path }) {
  const { get, set } = useEditor();
  const candid = get([...path.slice(0, -1), "candid"]) as Photo | undefined;
  const dots: DotSettings = { ...DOTS, ...(get(path) as DotSettings | undefined) };
  const untouched = DOT_SLIDERS.every(({ key }) => dots[key] === DOTS[key]);
  const change = (key: keyof DotSettings, value: number) => {
    const next = { ...dots, [key]: Number(value.toFixed(2)) };
    set(path, DOT_SLIDERS.every(({ key: k }) => next[k] === DOTS[k]) ? undefined : next);
  };
  return (
    <FieldFrame path={path} label={spec.label} hint={spec.hint} group>
      {({ id }) => (
        <div className={styles.dots}>
          <div className={styles.dotControls}>
            {DOT_SLIDERS.map(({ key, label, show }) => (
              <label key={key} className={styles.slider}>
                <span className={styles.sliderLabel}>{label}</span>
                <input id={`${id}-${key}`} type="range" {...DOT_RANGES[key]} value={dots[key]} onChange={(e) => change(key, Number(e.target.value))} aria-valuetext={show(dots[key])} />
                <output htmlFor={`${id}-${key}`} className={styles.sliderValue}>{show(dots[key])}</output>
              </label>
            ))}
            <button type="button" className={styles.tool} onClick={() => set(path, undefined)} disabled={untouched}>Reset</button>
          </div>
          {candid ? <DotPhoto photo={draft(candid)} dots={dots} className={styles.dotPreview} /> : <p className={styles.hint}>Add a candid photo to see it in dots.</p>}
        </div>
      )}
    </FieldFrame>
  );
}

export function Field({ spec, path }: { spec: FieldSpec; path: Path }) {
  switch (spec.kind) {
    case "text":
    case "slug":
      return <TextField spec={spec} path={path} />;
    case "spotify":
      return <SpotifyField spec={spec} path={path} />;
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
      return <PhotoList path={path} label={spec.label} hint={spec.hint} />;
    case "photo":
      return <PhotoList path={path} label={spec.label} hint={spec.hint} single />;
    case "dots":
      return <DotsField spec={spec} path={path} />;
  }
}
