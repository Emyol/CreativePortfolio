"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDeskScreen } from "@/components/desk/deskContext";
import { DotPhoto } from "@/components/tracks/DotPhoto";
import type { EventItem } from "@/lib/content/schema";
import { formatDate } from "@/lib/dates";
import { pushBack } from "@/lib/desk/back";
import { hasLanded } from "@/lib/desk/visit";
import { rememberEvent } from "@/lib/devices/events";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { formatTrackNumber } from "@/lib/tape";
import { DeviceFrame } from "../DeviceFrame";
import { EVENTS_HEAD } from "./EventsScreen";
import styles from "./LiveRec.module.css";

type Props = {
  event: EventItem;
  /** Its row on the Events screen, newest first, from 1. */
  number: number;
  base?: string;
};

const mmss = (s: number) => `${formatTrackNumber(Math.floor(s / 60))}:${formatTrackNumber(s % 60)}`;

/**
 * An opened event on the Events device: the screen wipes to a live recording (when opened
 * from within the site, motion allowing), `● LIVE REC`
 * with its row's number and a clock running from the moment it opened (held still under
 * reduced motion), the event's first photo dithered into the screen's dots, its date, place
 * and summary. The story is printed on the liner beside it (EventStory), whose heading takes
 * focus when the event opens. One step back (Esc, Backspace, or the screen's own link) is the
 * Events list, the same row still under the cursor.
 */
export function LiveRec({ event, number, base = "" }: Props) {
  const router = useRouter();
  const setScreen = useDeskScreen();
  const still = useMotionTier() === "none";
  const nn = formatTrackNumber(number);
  const list = `${base}/events`;
  // The wipe is for opening an event by a move within the site, decided once as it opens:
  // never on the server or the page a visit lands on (a direct load only settles), never
  // under reduced motion, and not replayed if the motion setting changes while it is open.
  const [wipes] = useState(() => typeof window !== "undefined" && hasLanded() && !still);

  useEffect(() => {
    rememberEvent(event.slug);
    setScreen([EVENTS_HEAD, `● LIVE REC ${nn}`]);
  }, [event.slug, nn, setScreen]);

  useEffect(
    () =>
      pushBack(() => {
        router.push(list);
        return true;
      }),
    [router, list],
  );

  // Opened by a move within the site (from the list, from the desk, by Back or Forward):
  // focus goes to the event's heading, after the J-card has given its own title focus.
  useEffect(() => {
    if (hasLanded()) document.querySelector<HTMLElement>("#jcard [data-event-heading]")?.focus({ preventScroll: true });
  }, [event.slug]);

  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (still) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [still]);

  const where = [formatDate(event.date), event.place].filter(Boolean).join(" · ");
  return (
    <DeviceFrame id="events" label={`Live recording ${nn}`}>
      <div className={styles.rec} data-live-rec data-wipe={wipes ? "" : undefined}>
        <p className={styles.head}>
          <span>● LIVE REC {nn}</span>
          <span aria-hidden="true" data-rec-clock>
            {mmss(seconds)}
          </span>
        </p>
        <DotPhoto photo={event.photos[0]} className={styles.photo} />
        <div className={styles.words}>
          <p className={styles.meta}>{where}</p>
          <p className={styles.summary}>{event.summary}</p>
        </div>
        <Link href={list} className={styles.back} data-hint>
          <span aria-hidden="true">◂ ESC</span> back to the list
        </Link>
      </div>
    </DeviceFrame>
  );
}
