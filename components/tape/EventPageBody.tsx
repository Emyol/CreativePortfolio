import Link from "next/link";
import { Dock } from "@/components/device/Dock";
import { Underside } from "@/components/frame/Underside";
import { Photo } from "@/components/Photo";
import { EventPhoto } from "@/components/tracks/EventPhoto";
import type { EventItem, SiteContent } from "@/lib/content/schema";
import { formatDate } from "@/lib/dates";
import { visibleTracks } from "@/lib/tape";
import styles from "./EventPageBody.module.css";

/**
 * A live recording: the event page itself, shared by the public site and the admin preview.
 * `home` is where its links lead back to: "/" on the site, "/admin/preview" in the preview.
 */
export function EventPageBody({ content, event, home = "/" }: { content: SiteContent; event: EventItem; home?: string }) {
  const rest = event.photos.slice(1);

  const tracks = visibleTracks(content);
  const when = formatDate(event.date);

  return (
    <>
      <main id="main" tabIndex={-1} className={styles.page}>
        <article className={styles.recording}>
          <header className={styles.header}>
            <h1 className={styles.title}>{event.name}</h1>
            <p className={styles.meta}>
              <time dateTime={event.date}>{when}</time>
              {event.place && <span>{event.place}</span>}
            </p>
          </header>
          {/* The card-to-page morph lands here; the cover loads eagerly as the page's main image. */}
          <div className={styles.cover}>
            <EventPhoto event={event} sizes="(min-width: 1180px) 1100px, 100vw" className={styles.coverImg} priority />
          </div>
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
                  <Photo photo={photo} sizes="(min-width: 900px) 820px, 100vw" className={styles.galleryImg} />
                </li>
              ))}
            </ul>
          )}
        </article>
        <nav aria-label="Event" className={styles.nav}>
          <Link href={`${home}#events`}>Back to events</Link>
          <Link href="/tracklist">Track list</Link>
        </nav>
      </main>
      <Underside toolbox={content.about.toolbox} links={content.links} />
      <Dock tracks={tracks} side="a" current={null} visible screen={["LIVE", event.place ? `${event.place}  ${when}` : when]} hrefBase={home} />
    </>
  );
}
