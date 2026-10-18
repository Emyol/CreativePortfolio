import type { gsap } from "@/lib/motion/gsap";

/**
 * What the 3D hero offers the entrance once it is ready: where its screen is (for the dark
 * to shrink into), and its own tape load added to the entrance timeline at `at` seconds.
 * With none registered, the entrance plays on the sprite device.
 */
export type HeroApi = { screenRect(): DOMRect; entrance(tl: gsap.core.Timeline, at: number): void };

let hero: HeroApi | null = null;

export function setHero(api: HeroApi | null): void {
  hero = api;
}

export function getHero(): HeroApi | null {
  return hero;
}
