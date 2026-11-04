import { TRACK_ORDER } from "@/lib/tape";

// What night is read from (lib/desk/night.ts), kept here, free of React, so the root layout
// (a Server Component) can carry the pre-paint script.
export const NIGHT_KEY = "side-a:night";
export const DARK = "(prefers-color-scheme: dark)";

// The desk's own paths, public and under the admin's preview: the desk, a track, an event.
const DESK_PATH = new RegExp(
  `^(/admin/preview)?(/(${TRACK_ORDER.map((t) => (t.id === "events" ? "events(/[^/]+)?" : t.id)).join("|")}))?/?$`,
);

/** Whether `pathname` is one of the desk's routes (the only ones night darkens). */
export function isDeskPath(pathname: string): boolean {
  return DESK_PATH.test(pathname);
}

/**
 * Runs in <head> before first paint (app/layout.tsx): on a desk route, a visit that starts
 * at night is dark from its first frame, by the same rule as `initialNight`
 * (lib/desk/night.ts), instead of showing the server's day until hydration. Set before any
 * style, so nothing eases in.
 */
export const NIGHT_PREPAINT = `try{if(${DESK_PATH}.test(location.pathname)){var s=null;try{s=localStorage.getItem(${JSON.stringify(NIGHT_KEY)})}catch(e){}if(s==="on"||(s!=="off"&&matchMedia(${JSON.stringify(DARK)}).matches))document.documentElement.dataset.night=""}}catch(e){}`;
