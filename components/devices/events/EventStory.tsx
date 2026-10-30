import type { EventItem } from "@/lib/content/schema";
import { formatDate } from "@/lib/dates";
import styles from "./liner.module.css";

/**
 * An opened event's liner: its name as the page's heading (LiveRec gives it focus when the
 * event opens), when and where, and the story, printed on the J-card's paper.
 */
export function EventStory({ event }: { event: EventItem }) {
  return (
    <article className={styles.liner}>
      <h1 tabIndex={-1} className={styles.title} data-event-heading>
        {event.name}
      </h1>
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
