import type { CSSProperties } from "react";

export type SeasonId = "top" | "spring" | "summer-night" | "autumn" | "late-autumn" | "winter" | "plum";
export type WeatherKind = "petal" | "lantern" | "maple" | "ginkgo" | "snow" | "plum";
export type Season = { wall: string; paper: string; ink: string; muted: string; focus: string; weather: WeatherKind | null };

/** The only strong accent in the World. */
export const SEAL_RED = "#a8281f";
export const BROCADE = "#1f2a4d";
export const GOLD = "#b8954a";

export const SEASONS: Record<SeasonId, Season> = {
  top: { wall: "#26231f", paper: "#efe6d2", ink: "#1d1b18", muted: "#5a5248", focus: SEAL_RED, weather: null },
  spring: { wall: "#3a3032", paper: "#f3e7e1", ink: "#1d1b18", muted: "#5c4f4c", focus: SEAL_RED, weather: "petal" },
  "summer-night": { wall: "#0f1426", paper: "#18203a", ink: "#f1e8d6", muted: "#c9bfa8", focus: "#f2c14e", weather: "lantern" },
  autumn: { wall: "#3a2b22", paper: "#f1e3cd", ink: "#1d1b18", muted: "#5d4c3c", focus: SEAL_RED, weather: "maple" },
  "late-autumn": { wall: "#35301c", paper: "#f0e6c6", ink: "#1d1b18", muted: "#585036", focus: SEAL_RED, weather: "ginkgo" },
  winter: { wall: "#262d33", paper: "#eef0ee", ink: "#1d1b18", muted: "#4f5559", focus: SEAL_RED, weather: "snow" },
  plum: { wall: "#34232a", paper: "#f4e5e7", ink: "#1d1b18", muted: "#5e4a50", focus: SEAL_RED, weather: "plum" },
};

export function seasonVars(id: SeasonId): CSSProperties {
  const s = SEASONS[id];
  return { "--wall": s.wall, "--paper": s.paper, "--ink": s.ink, "--muted": s.muted, "--focus": s.focus } as CSSProperties;
}
