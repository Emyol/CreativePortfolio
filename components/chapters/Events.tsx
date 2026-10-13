"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { InkBleed } from "@/components/motion/InkBleed";
import type { EventItem } from "@/lib/content/schema";
import { formatDate } from "@/lib/dates";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { tiltFor } from "@/lib/tilt";
import { EventPhoto } from "./EventPhoto";
import styles from "./Events.module.css";

export const BENTO_SHAPES = ["a", "b", "c", "d", "e", "f"] as const;

export function Events({ events }: { events: EventItem[] }) {
  const ref = useRef<HTMLUListElement>(null);
  const tier = useMotionTier();

  // Inner parallax: the photo drifts inside its mount as the tile crosses the viewport.
  useGSAP(
    () => {
      if (tier !== "full") return;
      for (const el of gsap.utils.toArray<HTMLElement>("[data-parallax]")) {
        gsap.fromTo(el, { yPercent: -6 }, {
          yPercent: 6, ease: "none",
          scrollTrigger: { trigger: el.closest("li"), start: "top bottom", end: "bottom top", scrub: true },
        });
      }
    },
    { scope: ref, dependencies: [tier, events.length], revertOnUpdate: true },
  );

  // Pointer tilt, mouse only, full motion only.
  useEffect(() => {
    if (tier !== "full" || !ref.current) return;
    const cleanups = [...ref.current.querySelectorAll<HTMLElement>("[data-tilt]")].map((el) => {
      const rx = gsap.quickTo(el, "rotationX", { duration: 0.4, ease: "power2.out" });
      const ry = gsap.quickTo(el, "rotationY", { duration: 0.4, ease: "power2.out" });
      const move = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        const t = tiltFor(e.clientX, e.clientY, el.getBoundingClientRect());
        rx(t.rotationX);
        ry(t.rotationY);
      };
      const leave = () => {
        rx(0);
        ry(0);
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerleave", leave);
      return () => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerleave", leave);
        gsap.killTweensOf(el);
        gsap.set(el, { clearProps: "transform" });
      };
    });
    return () => cleanups.forEach((c) => c());
  }, [tier, events.length]);

  return (
    <ul ref={ref} className={styles.bento}>
      {events.map((event, i) => (
        <li key={event.slug} className={styles.tile} data-shape={BENTO_SHAPES[i % BENTO_SHAPES.length]}>
          <Link href={`/events/${event.slug}`} className={styles.print} data-tilt>
            <InkBleed origin="random" className={styles.media}>
              <div className={styles.parallax} data-parallax>
                <EventPhoto event={event} sizes="(min-width: 1180px) 700px, (min-width: 768px) 60vw, 100vw" className={styles.img} />
              </div>
            </InkBleed>
            <div className={styles.caption}>
              <h3 className={styles.name}>{event.name}</h3>
              <p className={styles.meta}>
                <time dateTime={event.date}>{formatDate(event.date)}</time>
                {event.place && <> · {event.place}</>}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
