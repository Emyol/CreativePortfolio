"use client";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { DeskContext, useDeskKnob, useDeskScreen } from "@/components/desk/deskContext";
import { DotPhoto } from "@/components/tracks/DotPhoto";
import type { EventItem } from "@/lib/content/schema";
import { formatDate } from "@/lib/dates";
import { hasLanded } from "@/lib/desk/visit";
import { newestFirst, recalledEvent, rememberEvent, takeKnobHint } from "@/lib/devices/events";
import { MARQUEE, marqueePass } from "@/lib/motion/marquee";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { formatTrackNumber, trackNumber } from "@/lib/tape";
import styles from "./EventsScreen.module.css";

/** The wheel over the list moves one row at most this often, in ms (one detent per turn). */
export const WHEEL_THROTTLE = 110;

/** The player's screen while Events is open: `02 EVENTS`, then where the cursor is. */
export const EVENTS_HEAD = `${formatTrackNumber(trackNumber("events"))} EVENTS`;
export const eventsLine = (index: number, count: number) => `> ${formatTrackNumber(index + 1)} OF ${formatTrackNumber(count)}`;

export const eventHref = (base: string, slug: string) => `${base}/events/${slug}`;

type Props = {
  events: EventItem[];
  /** "" on the site, "/admin/preview" in the preview. */
  base: string;
  /** The cursor moved (and once on mount): the event it is on. */
  onSelect?(event: EventItem): void;
};

/**
 * The Events device's screen: the player's own screen grown large, a menu you drive like
 * the device. A listbox of the events, newest first, beside a preview of the one under the
 * cursor (its first photo dithered into the screen's dots, its date and place). ↑/↓, Home
 * and End, the wheel over the list, the player's knob and the pointer's hover move the
 * cursor; Enter, Space or a click open the event's page. The cursor is remembered for the
 * rest of the visit, so coming back from an event finds it where it was; a long name steps
 * across its row while the cursor is on it, as on the player. Without JS, plain links.
 */
export function EventsScreen({ events, base, onSelect }: Props) {
  const router = useRouter();
  const setScreen = useDeskScreen();
  const { wiggleKnob } = useContext(DeskContext);
  const still = useMotionTier() === "none";
  const list = useMemo(() => newestFirst(events), [events]);
  const [at, setAt] = useState(() => Math.max(0, list.findIndex((e) => e.slug === recalledEvent())));
  const index = Math.min(at, list.length - 1);
  const event = list[index];
  const ids = useId();
  const optionId = (i: number) => `${ids}-option-${i}`;

  const box = useRef<HTMLUListElement>(null);
  const options = useRef<(HTMLLIElement | null)[]>([]);
  const latest = useRef({ index, count: list.length });
  useEffect(() => {
    latest.current = { index, count: list.length };
  });

  const move = (steps: number) => setAt((i) => Math.max(0, Math.min(list.length - 1, Math.min(i, list.length - 1) + steps)));
  const open = (i: number) => {
    setAt(i);
    router.push(eventHref(base, list[i].slug));
  };
  useDeskKnob(move);

  // Where the cursor is: remembered, on the player's screen, beside the list, in view.
  const slug = event?.slug;
  useEffect(() => {
    if (!slug) return;
    rememberEvent(slug);
    setScreen([EVENTS_HEAD, eventsLine(index, list.length)]);
    router.prefetch(eventHref(base, slug));
    const lb = box.current;
    const opt = options.current[index];
    if (lb && opt) {
      const top = opt.offsetTop;
      const bottom = top + opt.offsetHeight;
      if (top < lb.scrollTop) lb.scrollTop = top;
      else if (bottom > lb.scrollTop + lb.clientHeight) lb.scrollTop = bottom - lb.clientHeight;
    }
    // `setScreen` and `router` are the desk's and Next's, the same for the screen's life.
  }, [slug, index, list.length, base]);
  useEffect(() => {
    if (event) onSelect?.(event);
  }, [event, onSelect]);

  // Opened: the knob's hint, once a visit. Arrived here by a move whose focus went with the
  // page it left (Back from an event): focus comes to the list, not to the page's end.
  useEffect(() => {
    if (takeKnobHint()) wiggleKnob();
    if (!hasLanded()) return;
    const a = document.activeElement;
    if (!a || a === document.body) box.current?.focus({ preventScroll: true });
    // Once, on opening.
  }, []);

  // The wheel over the list is the device's: a row per detent, the page left alone, unless
  // the cursor is already at the end it turns toward (then the page scrolls on).
  useEffect(() => {
    const lb = box.current;
    if (!lb) return;
    let last = -Infinity;
    const onWheel = (e: WheelEvent) => {
      if (!e.deltaY) return;
      const { index: i, count } = latest.current;
      const step = Math.sign(e.deltaY);
      if (i + step < 0 || i + step >= count) return;
      e.preventDefault();
      const now = performance.now();
      if (now - last < WHEEL_THROTTLE) return;
      last = now;
      setAt((x) => Math.max(0, Math.min(count - 1, x + step)));
    };
    lb.addEventListener("wheel", onWheel, { passive: false });
    return () => lb.removeEventListener("wheel", onWheel);
  }, []);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "ArrowDown") move(1);
    else if (e.key === "ArrowUp") move(-1);
    else if (e.key === "Home") setAt(0);
    else if (e.key === "End") setAt(list.length - 1);
    else if (e.key === "Enter" || e.key === " ") open(index);
    else return;
    e.preventDefault();
  };

  if (!event) return null;
  const where = (e: EventItem) => [formatDate(e.date), e.place].filter(Boolean).join(" · ");
  return (
    <div className={styles.screen} data-events-screen>
      <div className={styles.side}>
        <p className={styles.bar} aria-hidden="true">
          <span>LIVE RECS</span>
          <span>{formatTrackNumber(list.length)}</span>
        </p>
        <ul
          ref={box}
          role="listbox"
          tabIndex={0}
          aria-label="Events"
          aria-activedescendant={optionId(index)}
          className={styles.options}
          onKeyDown={onKeyDown}
          data-lenis-prevent-wheel
        >
          {list.map((e, i) => (
            <li
              key={e.slug}
              ref={(el) => {
                options.current[i] = el;
              }}
              id={optionId(i)}
              role="option"
              aria-selected={i === index}
              className={styles.option}
              onPointerEnter={(p) => p.pointerType === "mouse" && setAt(i)}
              onClick={() => open(i)}
            >
              <span className={styles.cursor} aria-hidden="true">
                ▸
              </span>
              <span>{formatTrackNumber(i + 1)}</span>
              <Name text={e.name} running={i === index && !still} />
              <span className={styles.hidden}>, {where(e)}</span>
            </li>
          ))}
        </ul>
        <noscript>
          <ul className={styles.plain}>
            {list.map((e) => (
              <li key={e.slug}>
                <a href={eventHref(base, e.slug)}>{e.name}</a>
              </li>
            ))}
          </ul>
        </noscript>
      </div>
      <div className={styles.preview} data-events-preview>
        <DotPhoto photo={event.photos[0]} className={styles.photo} />
        <p className={styles.previewName} aria-hidden="true">
          {event.name}
        </p>
        <p className={styles.meta} aria-hidden="true">
          {where(event)}
        </p>
        <p className={styles.hint} aria-hidden="true" data-hint>
          ▲▼ choose · ENTER open · ESC back
        </p>
      </div>
    </div>
  );
}

/**
 * A row's name. Too long for its row, it is cut short, and while the cursor is on it, it
 * steps across a dot column at a time as the player's screen does (lib/motion/marquee.ts;
 * components/device/Screen.tsx's Row): its text and a copy (hidden from screen readers)
 * move left as one strip until the copy stands where the text began, again and again.
 * Under reduced motion it rests cut short; the preview beside it shows it whole.
 */
function Name({ text, running }: { text: string; running: boolean }) {
  const cell = useRef<HTMLSpanElement>(null);
  const own = useRef<HTMLSpanElement>(null);
  const [long, setLong] = useState(false);
  const stepping = running && long;

  // Measured before paint on every render, again as the screen resizes and once Doto loads.
  const measure = () => {
    if (cell.current && own.current) setLong(own.current.offsetWidth > cell.current.clientWidth + 1);
  };
  useLayoutEffect(measure);
  const remeasure = useRef(measure);
  useEffect(() => {
    remeasure.current = measure;
  });
  useEffect(() => {
    const again = () => remeasure.current();
    const resized = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(again);
    if (cell.current) resized?.observe(cell.current);
    document.fonts?.addEventListener("loadingdone", again);
    return () => {
      resized?.disconnect();
      document.fonts?.removeEventListener("loadingdone", again);
    };
  }, []);

  useEffect(() => {
    const strip = own.current?.parentElement;
    if (!stepping || !cell.current || !own.current || typeof strip?.animate !== "function") return;
    // Timed in its own font size, so a resize mid-pass changes nothing.
    const size = parseFloat(getComputedStyle(cell.current).fontSize) || 16;
    const shift = own.current.offsetWidth / size + MARQUEE.gap;
    const pass = marqueePass(shift, 1);
    const moving = strip.animate(
      [
        { transform: "none" },
        { transform: "none", offset: MARQUEE.rest / pass, easing: `steps(${Math.max(1, Math.round(shift / MARQUEE.dot))})` },
        { transform: "translateX(-50%)" },
      ],
      { duration: pass, iterations: Infinity },
    );
    return () => moving.cancel();
  }, [stepping]);

  return (
    <span ref={cell} className={[styles.name, stepping && styles.stepping].filter(Boolean).join(" ")} data-name data-stepping={stepping ? "" : undefined}>
      <span>
        <span ref={own}>{text}</span>
        {stepping && (
          <span aria-hidden="true" style={{ paddingInline: `${MARQUEE.gap}em` }}>
            {text}
          </span>
        )}
      </span>
    </span>
  );
}
