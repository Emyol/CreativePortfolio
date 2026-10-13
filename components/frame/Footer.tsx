import Link from "next/link";
import { Ja } from "@/components/Ja";
import { SoundToggle } from "@/components/game/SoundToggle";
import { StrokeKanjiInView } from "@/components/kanji/StrokeKanjiInView";
import { Roller } from "./ScrollFrame";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.end}>
        <StrokeKanjiInView char="終" label="The end" className={styles.owari} />
      </div>
      <div className={styles.meta}>
        <p>
          Stroke order data: <a href="http://kanjivg.tagaini.net">KanjiVG</a> by Ulrich Apel,{" "}
          <a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a>. Fonts from Google Fonts under the OFL.
        </p>
        <p>
          <Link href="/mokuroku">Plain index <Ja aria-hidden="true">目録</Ja></Link>
        </p>
        <p>
          <SoundToggle />
        </p>
      </div>
      <div className={styles.bottom}>
        <Roller />
      </div>
    </footer>
  );
}
