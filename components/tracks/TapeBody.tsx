import { Fragment, type ReactNode } from "react";
import type { SiteContent } from "@/lib/content/schema";
import { hasSide, sideTracks, type Track, type TrackId } from "@/lib/tape";
import { Featuring } from "./Featuring";
import { LinerNotes } from "./LinerNotes";
import { LiveRecordings } from "./LiveRecordings";
import { Made } from "./Made";
import { Mixtape } from "./Mixtape";
import { OnRotation } from "./OnRotation";
import { TrackSection } from "./TrackSection";

function TrackBody({ id, content, eventHref }: { id: TrackId; content: SiteContent; eventHref?: (slug: string) => string }) {
  switch (id) {
    case "about": return <LinerNotes about={content.about} />;
    case "events": return <LiveRecordings events={content.events} eventHref={eventHref} />;
    case "mixtape": return <Mixtape songs={content.music} />;
    case "people": return <Featuring people={content.people} />;
    case "made": return <Made hobbies={content.hobbies} />;
    case "on-rotation": return <OnRotation items={content.shelf} />;
  }
}

/** Side A, then the flip (only when side B has tracks), then side B. */
export function TapeBody({ tracks, content, flip, eventHref }: { tracks: Track[]; content: SiteContent; flip?: ReactNode; eventHref?: (slug: string) => string }) {
  const section = (t: Track) => (
    <TrackSection key={t.id} track={t}>
      <TrackBody id={t.id} content={content} eventHref={eventHref} />
    </TrackSection>
  );
  return (
    <>
      {sideTracks(tracks, "a").map(section)}
      {hasSide(tracks, "b") && <Fragment key="flip">{flip}</Fragment>}
      {sideTracks(tracks, "b").map(section)}
    </>
  );
}
