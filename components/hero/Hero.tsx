import { Ja } from "@/components/Ja";
import type { Chapter } from "@/lib/chapters";
import { HeroName } from "./HeroName";
import { InkMountains } from "./InkMountains";
import styles from "./Hero.module.css";

export function Hero({ chapters }: { chapters: Chapter[] }) {
  return (
    <header id="top" className={styles.hero} data-hero>
      <div className={styles.unrollRoller} data-unroll-roller aria-hidden="true" />
      <InkMountains className={styles.mountains} />
      <h1 className={styles.name} data-hero-name>
        <HeroName />
        <span className={styles.nameEn}>Miel</span>
      </h1>
      {chapters.length > 0 && (
        <nav aria-label="Chapters" className={styles.menu} data-hero-menu>
          <ol>
            {chapters.map((c) => (
              <li key={c.id}>
                <a href={`#${c.id}`} className={styles.item}>
                  <Ja aria-hidden="true" className={styles.column}>{c.kanji}</Ja>
                  <span className={styles.label}>{c.label}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}
    </header>
  );
}
