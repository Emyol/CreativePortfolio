import type { Metadata } from "next";
import Link from "next/link";
import { IndexBody } from "@/components/IndexBody";
import { Ja } from "@/components/Ja";
import { visibleChapters } from "@/lib/chapters";
import { getContent } from "@/lib/content/load";
import { GLOSSARY } from "@/lib/glossary";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Index · Miel", description: "Everything on Miel's scroll, as a plain list." };

export default async function Mokuroku() {
  const content = await getContent();
  const chapters = visibleChapters(content);

  return (
    <main id="main" tabIndex={-1} className={styles.page}>
      <h1>
        Index <Ja className={styles.ja}>目録</Ja>
      </h1>
      <p>
        Everything on the scroll, as a plain list with no motion. <Link href="/">Back to the scroll</Link>
      </p>

      {chapters.length === 0 ? (
        <p>Nothing on the scroll yet.</p>
      ) : (
        <nav aria-label="Sections">
          <ul>
            {chapters.map((c) => (
              <li key={c.id}><a href={`#index-${c.id}`}>{c.label}</a></li>
            ))}
          </ul>
        </nav>
      )}

      {chapters.map((c) => (
        <section key={c.id} id={`index-${c.id}`} aria-labelledby={`index-${c.id}-title`}>
          <h2 id={`index-${c.id}-title`}>{c.label}</h2>
          <IndexBody id={c.id} content={content} />
        </section>
      ))}

      <section aria-labelledby="glossary-title">
        <h2 id="glossary-title">Japanese on this site</h2>
        <table aria-labelledby="glossary-title" className={styles.glossary}>
          <thead>
            <tr><th scope="col">Term</th><th scope="col">Reading</th><th scope="col">Meaning</th></tr>
          </thead>
          <tbody>
            {GLOSSARY.map((g) => (
              <tr key={g.term}><td><Ja>{g.term}</Ja></td><td>{g.reading}</td><td>{g.meaning}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="credits-title">
        <h2 id="credits-title">Credits</h2>
        <p>
          Stroke order data: <a href="http://kanjivg.tagaini.net">KanjiVG</a> by Ulrich Apel,{" "}
          <a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a>. Fonts from Google Fonts under the OFL.
        </p>
      </section>
    </main>
  );
}
