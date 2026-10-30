"use client";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Section } from "@/components/desk/Section";
import type { EventItem } from "@/lib/content/schema";
import { formatDate } from "@/lib/dates";
import { newestFirst, recalledEvent } from "@/lib/devices/events";
import { DeviceFrame } from "../DeviceFrame";
import { eventHref, EventsScreen } from "./EventsScreen";
import styles from "./liner.module.css";

/**
 * The events track on the J-card: the Events device (its screen menu) in the centre, and on
 * the liner the event under the screen's cursor, printed: its name, when and where, its
 * summary, and a link to its live recording.
 */
export function EventsSection({ events, base }: { events: EventItem[]; base: string }) {
  const list = useMemo(() => newestFirst(events), [events]);
  const [slug, setSlug] = useState(() => recalledEvent());
  const shown = list.find((e) => e.slug === slug) ?? list[0];
  const onSelect = useCallback((e: EventItem) => setSlug(e.slug), []);
  return (
    <Section
      device={
        <DeviceFrame id="events" label="Events">
          <EventsScreen events={events} base={base} onSelect={onSelect} />
        </DeviceFrame>
      }
      liner={
        shown && (
          <div className={styles.liner}>
            <h3 className={styles.name}>{shown.name}</h3>
            <p className={styles.meta}>
              <time dateTime={shown.date}>{formatDate(shown.date)}</time>
              {shown.place && <span>{shown.place}</span>}
            </p>
            <p className={styles.text}>{shown.summary}</p>
            <Link href={eventHref(base, shown.slug)} className={styles.open}>
              open the live recording <span aria-hidden="true">→</span>
            </Link>
          </div>
        )
      }
    />
  );
}
