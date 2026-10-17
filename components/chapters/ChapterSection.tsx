import type { ReactNode } from "react";
import { StrokeKanjiInView } from "@/components/kanji/StrokeKanjiInView";
import { SealStamp } from "@/components/motion/SealStamp";
import type { Chapter } from "@/lib/chapters";
import { seasonVars } from "@/lib/seasons";
import styles from "./ChapterSection.module.css";

export function ChapterSection({ chapter, children }: { chapter: Chapter; children: ReactNode }) {
  const titleId = `${chapter.id}-title`;
  return (
    <section id={chapter.id} aria-labelledby={titleId} className={styles.chapter} style={seasonVars(chapter.season)} data-chapter={chapter.id}>
      <header className={styles.head}>
        <StrokeKanjiInView char={chapter.kanji} className={styles.kanji} />
        <h2 id={titleId} tabIndex={-1} data-chapter-heading className={styles.title}>
          {chapter.label}
          <SealStamp decorative lang="ja" className={styles.seal}>{chapter.kanji}</SealStamp>
        </h2>
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
