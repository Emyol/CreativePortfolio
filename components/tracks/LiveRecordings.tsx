import Link from "next/link";
import type { EventItem } from "@/lib/content/schema";
import { formatDate } from "@/lib/dates";
import { EventPhoto } from "./EventPhoto";
import styles from "./LiveRecordings.module.css";

/** Events Miel attended, newest first, each a "live recording" that opens its own page. */
export function LiveRecordings({ events }: { events: EventItem[] }) {
  const newest = [...events].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <ul className={styles.list}>
      {newest.map((event) => (
        <li key={event.slug} className={styles.item}>
          <Link href={`/events/${event.slug}`} className={styles.card}>
            <div className={styles.media}>
              <EventPhoto event={event} sizes="(min-width: 1100px) 360px, (min-width: 640px) 45vw, 90vw" className={styles.img} decorative />
            </div>
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
  );
}
