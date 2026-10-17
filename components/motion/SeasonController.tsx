"use client";
import { useEffect, useRef, useState } from "react";
import type { Chapter } from "@/lib/chapters";
import { gsap } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { SEASONS, type SeasonId, type WeatherKind } from "@/lib/seasons";
import { useActiveChapter } from "./ActiveChapter";
import { WeatherGust } from "./WeatherGust";

export function SeasonController({ chapters }: { chapters: Chapter[] }) {
  const active = useActiveChapter();
  const tier = useMotionTier();
  const season: SeasonId = chapters.find((c) => c.id === active)?.season ?? "top";
  const previous = useRef<SeasonId>(season);
  const [gust, setGust] = useState<{ kind: WeatherKind; n: number } | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const wall = SEASONS[season].wall;
    if (tier === "none") gsap.set(root, { "--wall": wall, overwrite: true });
    else gsap.to(root, { "--wall": wall, duration: 1.2, ease: "power1.inOut", overwrite: true });

    const kind = SEASONS[season].weather;
    if (season !== previous.current && kind && tier === "full") setGust((g) => ({ kind, n: (g?.n ?? 0) + 1 }));
    previous.current = season;
  }, [season, tier]);

  // Leaving the page (e.g. to an event) restores the neutral wall.
  useEffect(
    () => () => {
      gsap.killTweensOf(document.documentElement);
      gsap.set(document.documentElement, { "--wall": SEASONS.top.wall });
    },
    [],
  );

  return gust ? <WeatherGust key={gust.n} kind={gust.kind} /> : null;
}
