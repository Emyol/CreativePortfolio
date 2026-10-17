import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventPhoto } from "@/components/chapters/EventPhoto";
import { Footer } from "@/components/frame/Footer";
import { ScrollFrame } from "@/components/frame/ScrollFrame";
import { InkBleed } from "@/components/motion/InkBleed";
import { Photo } from "@/components/Photo";
import { getContent } from "@/lib/content/load";
import { formatDate } from "@/lib/dates";
import { seasonVars } from "@/lib/seasons";
import styles from "./page.module.css";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export async function generateStaticParams() {
  const { events } = await getContent();
  return events.map((e) => ({ slug: e.slug }));
}

async function findEvent(slug: string) {
  const { events } = await getContent();
  return events.find((e) => e.slug === slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await findEvent((await params).slug);
  return event ? { title: `${event.name} · Miel`, description: event.summary } : {};
}

export default async function EventPage({ params }: Props) {
  const event = await findEvent((await params).slug);
  if (!event) notFound();
  const rest = event.photos.slice(1);

  return (
    <ScrollFrame>
      <main id="main" tabIndex={-1} className={styles.page} style={seasonVars("summer-night")}>
        <article>
          <header className={styles.header}>
            {/* The tile-to-page morph is the cover's entrance; it gets no ink bleed of its own. */}
            <div className={styles.cover}>
              <EventPhoto event={event} sizes="(min-width: 1180px) 1100px, 100vw" className={styles.coverImg} priority />
            </div>
            <p className={styles.kicker}>Event attended</p>
            <h1 className={styles.title}>{event.name}</h1>
            <p className={styles.meta}>
              <time dateTime={event.date}>{formatDate(event.date)}</time>
              {event.place && <> · {event.place}</>}
            </p>
          </header>
          <div className={styles.story}>
            <p className={styles.summary}>{event.summary}</p>
            {event.story.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          {rest.length > 0 && (
            <ul className={styles.gallery}>
              {rest.map((photo, i) => (
                <li key={`${photo.src}-${i}`}>
                  <InkBleed origin="random">
                    <Photo photo={photo} sizes="(min-width: 768px) 50vw, 100vw" className={styles.galleryImg} />
                  </InkBleed>
                </li>
              ))}
            </ul>
          )}
        </article>
        <nav aria-label="Event" className={styles.nav}>
          <Link href="/#events">Back to Events</Link>
          <Link href="/mokuroku">Plain index</Link>
        </nav>
      </main>
      <Footer />
    </ScrollFrame>
  );
}
