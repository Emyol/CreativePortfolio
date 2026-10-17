"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Ja } from "@/components/Ja";
import { useActiveChapter } from "@/components/motion/ActiveChapter";
import { chapterForKey, shouldHandleChapterKey, type Chapter } from "@/lib/chapters";
import { scrollToId } from "@/lib/motion/navigate";
import styles from "./SealRail.module.css";

export function SealRail({ chapters }: { chapters: Chapter[] }) {
  const active = useActiveChapter();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("top");
    if (!hero) return;
    const io = new IntersectionObserver(([e]) => setShown(!e.isIntersecting), { rootMargin: "0px 0px -60% 0px" });
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!shouldHandleChapterKey(e)) return;
      const chapter = chapterForKey(e.key, chapters);
      if (!chapter) return;
      e.preventDefault();
      scrollToId(chapter.id);
      // Task 20 adds playTap() here.
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chapters]);

  if (chapters.length === 0) return null;

  return (
    <nav aria-label="Chapter rail" className={styles.rail} data-shown={shown} inert={!shown}>
      <ol className={styles.list}>
        {chapters.map((c, i) => (
          <li key={c.id}>
            <a href={`#${c.id}`} className={styles.item} aria-current={active === c.id ? "location" : undefined} aria-keyshortcuts={String(i + 1)}>
              <Ja aria-hidden="true" className={styles.seal}>{c.kanji}</Ja>
              <span className={styles.label}>{c.label}</span>
              <kbd className={styles.key} aria-hidden="true">{i + 1}</kbd>
            </a>
          </li>
        ))}
      </ol>
      <Link href="/mokuroku" className={styles.index}>Index</Link>
    </nav>
  );
}
