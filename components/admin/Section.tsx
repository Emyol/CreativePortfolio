"use client";
import type { SectionSpec } from "@/lib/admin/sections";
import { Field } from "./fields";
import { ListEditor } from "./ListEditor";
import styles from "./admin.module.css";

export function Section({ section }: { section: SectionSpec }) {
  const titleId = `section-${section.id}`;
  return (
    <section className={styles.section} aria-labelledby={titleId} id={`edit-${section.id}`}>
      <header className={styles.sectionHead}>
        <h2 id={titleId} className={styles.sectionTitle}>{section.title}</h2>
        {section.hint && <p className={styles.sectionHint}>{section.hint}</p>}
      </header>
      {section.list ? (
        <ListEditor section={section} />
      ) : (
        <div className={styles.itemBody}>
          {section.fields.map((f) => (
            <Field key={f.key} spec={f} path={[section.id, f.key]} />
          ))}
        </div>
      )}
    </section>
  );
}
