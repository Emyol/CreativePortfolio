import type { EventItem } from "@/lib/content/schema";
import { formatDate } from "@/lib/dates";
import styles from "./liner.module.css";

/**
 * An opened event's liner: its name, printed as the liner's heading (an h3 under the J-card's
 * h2; the page's own h1 is the J-card's, with the same name) and given focus by LiveRec when
 * the event opens, then when and where, and the story, printed on the J-card's paper.
 */
export function EventStory({ event }: { event: EventItem }) {
  return (
    <article className={styles.liner}>
      <h3 tabIndex={-1} className={styles.title} data-event-heading>
        {event.name}
      </h3>
      <p className={styles.meta}>
        <time dateTime={event.date}>{formatDate(event.date)}</time>
        {event.place && <span>{event.place}</span>}
      </p>
      {event.story.map((p, i) => (
        <p key={i} className={styles.text}>
          {p}
        </p>
      ))}
    </article>
  );
}
