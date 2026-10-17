import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventPhoto } from "@/components/tracks/EventPhoto";
import { Footer } from "@/components/frame/Footer";
import { Photo } from "@/components/Photo";
import { getContent } from "@/lib/content/load";
import { formatDate } from "@/lib/dates";
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
    <>
      <main id="main" tabIndex={-1} className={styles.page}>
        <article>
          <header className={styles.header}>
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
                  <Photo photo={photo} sizes="(min-width: 768px) 50vw, 100vw" className={styles.galleryImg} />
                </li>
              ))}
            </ul>
          )}
        </article>
        <nav aria-label="Event" className={styles.nav}>
          <Link href="/#events">Back to Events</Link>
          <Link href="/tracklist">Track list</Link>
        </nav>
      </main>
      <Footer />
    </>
  );
}
