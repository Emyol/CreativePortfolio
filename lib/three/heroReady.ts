import type { gsap } from "@/lib/motion/gsap";

/**
 * What the 3D hero offers the entrance once it is ready: where its screen is (for the dark
 * to shrink into), and its own tape load added to the entrance timeline at `at` seconds.
 * With none registered, the entrance plays on the sprite device.
 */
export type HeroApi = { screenRect(): DOMRect; entrance(tl: gsap.core.Timeline, at: number): void };

let hero: HeroApi | null = null;
// What the entrance chose when the dark began to shrink (spec: "If the 3D hero isn't ready
// when the shrink starts, the dark shrinks into the static device image instead").
let decision: "3d" | "sprite" | null = null;

export function setHero(api: HeroApi | null): void {
  hero = api;
}

export function getHero(): HeroApi | null {
  return hero;
}

/** Called by the entrance as the shrink starts: the 3D hero if it's ready, else the sprites. */
export function decideEntrance(): HeroApi | null {
  decision = hero ? "3d" : "sprite";
  return hero;
}

/** What the running entrance chose, or null before it has chosen (or with no entrance). */
export function entranceDecision(): "3d" | "sprite" | null {
  return decision;
}

/** The entrance is over: the next one decides afresh. */
export function resetEntranceDecision(): void {
  decision = null;
}
