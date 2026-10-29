import { notFound } from "next/navigation";
import { Featuring } from "@/components/tracks/Featuring";
import { LinerNotes } from "@/components/tracks/LinerNotes";
import { LiveRecordings } from "@/components/tracks/LiveRecordings";
import { Made } from "@/components/tracks/Made";
import { Mixtape } from "@/components/tracks/Mixtape";
import { OnRotation } from "@/components/tracks/OnRotation";
import { getContent } from "@/lib/content/load";
import type { SiteContent } from "@/lib/content/schema";
import { TRACK_ORDER, hasContent, type TrackId } from "@/lib/tape";
import { Section } from "./Section";

function body(id: TrackId, c: SiteContent) {
  switch (id) {
    case "about": return <LinerNotes about={c.about} />;
    case "events": return <LiveRecordings events={c.events} eventHref={(slug) => `/events/${slug}`} />;
    case "mixtape": return <Mixtape songs={c.music} />;
    case "people": return <Featuring people={c.people} />;
    case "made": return <Made hobbies={c.hobbies} />;
    case "on-rotation": return <OnRotation items={c.shelf} />;
  }
}

/** A track's page: 404 while it is empty, otherwise its section under the track's own heading. */
export async function TrackRoute({ id }: { id: TrackId }) {
  const content = await getContent();
  if (!hasContent(id, content)) notFound();
  const label = TRACK_ORDER.find((t) => t.id === id)?.label ?? id;
  return (
    <main id="main" tabIndex={-1}>
      <h2 tabIndex={-1}>{label}</h2>
      <Section device={body(id, content)} liner={null} />
    </main>
  );
}
