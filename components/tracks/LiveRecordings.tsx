import Link from "next/link";
import { Tilt } from "@/components/motion/Tilt";
import type { EventItem } from "@/lib/content/schema";
import { formatDate } from "@/lib/dates";
import { EventPhoto } from "./EventPhoto";
import styles from "./LiveRecordings.module.css";

/**
 * Events Miel attended, newest first, each a "live recording" that opens its own page. As
 * the track arrives, a REC playhead sweeps across and records each photo in (arrivals.ts);
 * each print tilts toward the cursor.
 */
export function LiveRecordings({ events, eventHref = (slug) => `/events/${slug}` }: { events: EventItem[]; eventHref?: (slug: string) => string }) {
  const newest = [...events].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className={styles.recorder}>
      <span className={styles.rec} data-rec aria-hidden="true">
        <span>● rec</span>
      </span>
      <ul className={styles.list}>
        {newest.map((event) => (
          <li key={event.slug} className={styles.item}>
            <Link href={eventHref(event.slug)} className={styles.card}>
              <Tilt className={styles.tilt}>
                <div className={styles.media} data-media>
                  <EventPhoto event={event} sizes="(min-width: 1100px) 360px, (min-width: 640px) 45vw, 90vw" className={styles.img} decorative />
                </div>
              </Tilt>
              <h3 className={styles.name}>{event.name}</h3>
              <p className={styles.meta}>
                <span className={styles.live} aria-hidden="true">live</span>
                <time dateTime={event.date}>{formatDate(event.date)}</time>
                {event.place && <span>{event.place}</span>}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
