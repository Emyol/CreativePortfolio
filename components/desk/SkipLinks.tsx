"use client";
import { usePathname } from "next/navigation";
import { parseDeskPath } from "@/lib/desk/location";

/**
 * The desk's skip links, first in the tab order: to its main region (`#jcard`: the J-card
 * with a tape in, else the desk's own), then to the track list. On the public site that is
 * the plain index at /tracklist; the admin's preview has no index of its own and never links
 * to a public path, so there it is the J-card's flap, once a tape is in.
 */
export function SkipLinks({ base }: { base: string }) {
  const track = parseDeskPath(usePathname(), base).track;
  return (
    <>
      <a className="skip-link" href="#jcard">
        Skip to content
      </a>
      {!base ? (
        <a className="skip-link" href="/tracklist">
          Skip to the track list
        </a>
      ) : (
        track && (
          <a className="skip-link" href="#flap">
            Skip to the track list
          </a>
        )
      )}
    </>
  );
}
