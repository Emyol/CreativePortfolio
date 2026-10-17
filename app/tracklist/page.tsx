import type { Metadata } from "next";
import Link from "next/link";
import { IndexBody } from "@/components/IndexBody";
import { getContent } from "@/lib/content/load";
import { formatTrackNumber, visibleTracks } from "@/lib/tape";
import styles from "./page.module.css";

// Rebuilt hourly and whenever the tape is published; a failed rebuild keeps the last good page.
export const revalidate = 3600;

export const metadata: Metadata = { title: "Track list · Miel", description: "Everything on Miel's tape, as a plain list." };

export default async function TrackList() {
  const content = await getContent();
  const tracks = visibleTracks(content);

  return (
    <main id="main" tabIndex={-1} className={styles.page}>
      <h1>Track list</h1>
      <p>
        Everything on the tape, as a plain list with no motion. <Link href="/">Back to the tape</Link>
      </p>

      {tracks.length === 0 ? (
        <p>Nothing on the tape yet.</p>
      ) : (
        <nav aria-label="Tracks">
          <ol className={styles.toc}>
            {tracks.map((t) => (
              <li key={t.id}>
                <span aria-hidden="true">{formatTrackNumber(t.number)} </span>
                <a href={`#list-${t.id}`}>{t.label}</a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {tracks.map((t) => (
        <section key={t.id} id={`list-${t.id}`} aria-labelledby={`list-${t.id}-title`}>
          <h2 id={`list-${t.id}-title`}>{t.label}</h2>
          <IndexBody id={t.id} content={content} />
        </section>
      ))}

      {content.links.length > 0 && (
        <section aria-labelledby="links-title">
          <h2 id="links-title">Links</h2>
          <ul>
            {content.links.map((l) => (
              <li key={l.url}><a href={l.url}>{l.label}</a></li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="credits-title">
        <h2 id="credits-title">Credits</h2>
        <p>Fonts: Archivo, Space Mono and Doto, from Google Fonts under the OFL.</p>
      </section>
    </main>
  );
}
