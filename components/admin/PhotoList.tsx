"use client";
import { useRef, useState } from "react";
import { PhotoError, prepareImage, uploadPhoto } from "@/lib/admin/photo";
import { FieldFrame } from "./fields";
import { fieldId, useEditor, type Path } from "./editorContext";
import styles from "./admin.module.css";

type Photo = { src: string; alt: string; width: number; height: number };
type Pending = { id: number; name: string; progress: number; error?: string };

type Props = { path: Path; label: string; hint?: string; single?: boolean };

/**
 * Photos straight from the camera roll: pick several at once, each shrinks and uploads
 * with its own progress, then joins the list. The first is the cover; move, describe or
 * remove each. `single` is the one-photo variant (the candid, a "made" photo).
 */
export function PhotoList({ path, label, hint, single = false }: Props) {
  const { get, set, update: updateIn } = useEditor();
  const value = get(path) as Photo[] | Photo | undefined;
  const photos: Photo[] = single ? (value ? [value as Photo] : []) : ((value as Photo[] | undefined) ?? []);
  const [pending, setPending] = useState<Pending[]>([]);
  const nextId = useRef(0);

  const write = (next: Photo[]) => set(path, single ? next[0] : next);
  const update = (id: number, patch: Partial<Pending>) => setPending((all) => all.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  async function add(files: FileList | null) {
    if (!files?.length) return;
    const list = single ? [files[0]] : [...files];
    const jobs = list.map((file) => ({ id: nextId.current++, name: file.name, progress: 0, file }));
    setPending((all) => [...all, ...jobs.map(({ file: _f, ...p }) => p)]);
    // One at a time, in the order picked, so the list keeps that order.
    for (const job of jobs) {
      try {
        const { blob, width, height } = await prepareImage(job.file);
        const src = await uploadPhoto(blob, (f) => update(job.id, { progress: f }));
        const photo = { src, alt: "", width, height };
        // Appended to the latest list, so quick uploads and edits made meanwhile all survive.
        updateIn(path, (now) => (single ? photo : [...((now as Photo[] | undefined) ?? []), photo]));
        setPending((all) => all.filter((p) => p.id !== job.id));
      } catch (e) {
        update(job.id, { error: e instanceof PhotoError ? e.message : "Upload failed. Try again." });
      }
    }
  }

  const move = (from: number, to: number) => {
    const next = [...photos];
    const [p] = next.splice(from, 1);
    next.splice(to, 0, p);
    write(next);
  };
  const inputId = `${fieldId(path)}-file`;

  return (
    <FieldFrame path={path} label={label} hint={hint} group>
      {({ describedBy }) => (
        <div className={styles.photoField}>
          {photos.length > 0 && (
            <ul className={styles.photos}>
              {photos.map((p, i) => {
                const altPath = single ? [...path, "alt"] : [...path, i, "alt"];
                return (
                  <li key={`${p.src}-${i}`} className={styles.photo}>
                    <div className={styles.thumbWrap}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnails of draft uploads */}
                      <img src={p.src} alt="" width={p.width} height={p.height} className={styles.thumb} />
                      {!single && i === 0 && <span className={styles.cover}>Cover</span>}
                    </div>
                    <div className={styles.photoBody}>
                      <FieldFrame path={altPath} label="Describe this photo" hint={i === 0 ? "What's in it, for people who can't see it." : undefined}>
                        {({ id, describedBy, invalid }) => (
                          <input id={id} className={styles.input} value={p.alt} aria-describedby={describedBy} aria-invalid={invalid || undefined} onChange={(e) => set(altPath, e.target.value)} />
                        )}
                      </FieldFrame>
                      <div className={styles.itemTools}>
                        {!single && (
                          <>
                            <button type="button" className={styles.tool} disabled={i === 0} onClick={() => move(i, i - 1)}>Move earlier</button>
                            <button type="button" className={styles.tool} disabled={i === photos.length - 1} onClick={() => move(i, i + 1)}>Move later</button>
                          </>
                        )}
                        <button type="button" className={styles.danger} aria-label={`Remove photo ${i + 1}`} onClick={() => write(photos.filter((_, k) => k !== i))}>Remove</button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {pending.map((p) => (
            <p key={p.id} className={p.error ? styles.error : styles.hint} role={p.error ? "alert" : "status"}>
              {p.error ? `${p.name}: ${p.error}` : `Uploading ${p.name}, ${Math.round(p.progress * 100)}%`}
            </p>
          ))}
          <label className={styles.pick} htmlFor={inputId}>
            {single ? (photos.length ? "Replace the photo" : "Add a photo") : "Add photos"}
          </label>
          <input
            id={inputId}
            className={styles.file}
            type="file"
            accept="image/*"
            multiple={!single}
            aria-describedby={describedBy}
            onChange={(e) => {
              void add(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      )}
    </FieldFrame>
  );
}
