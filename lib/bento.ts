export type BentoShape = "a" | "b" | "c" | "d" | "e" | "f" | "full" | "half";

const SIX: BentoShape[] = ["a", "b", "c", "d", "e", "f"];

/**
 * Tile shapes for n events on a 6-column grid, chosen so every count fills whole rows.
 * Full groups of six use the a-f pattern; the remainder gets a pattern that closes the grid
 * (a, b and c already fill a 6x3 block, full is one 6x2 row, half is 3x2).
 */
export function bentoShapes(n: number): BentoShape[] {
  const shapes: BentoShape[] = [];
  for (let i = 0; i < Math.floor(n / 6); i++) shapes.push(...SIX);
  const rest: Record<number, BentoShape[]> = {
    0: [],
    1: ["full"],
    2: ["half", "half"],
    3: ["a", "b", "c"],
    4: ["a", "b", "c", "full"],
    5: ["a", "b", "c", "half", "half"],
  };
  return shapes.concat(rest[n % 6]);
}
