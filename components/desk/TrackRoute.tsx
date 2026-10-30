import { notFound } from "next/navigation";
import { EventsSection } from "@/components/devices/events/EventsSection";
import { Featuring } from "@/components/tracks/Featuring";
import { LinerNotes } from "@/components/tracks/LinerNotes";
import { Made } from "@/components/tracks/Made";
import { Mixtape } from "@/components/tracks/Mixtape";
import { OnRotation } from "@/components/tracks/OnRotation";
import { getContent } from "@/lib/content/load";
import type { SiteContent } from "@/lib/content/schema";
import { hasContent, type TrackId } from "@/lib/tape";
import { Section } from "./Section";

function body(id: Exclude<TrackId, "events">, c: SiteContent) {
  switch (id) {
    case "about": return <LinerNotes about={c.about} />;
    case "mixtape": return <Mixtape songs={c.music} />;
    case "people": return <Featuring people={c.people} />;
    case "made": return <Made hobbies={c.hobbies} />;
    case "on-rotation": return <OnRotation items={c.shelf} />;
  }
}

/**
 * A track's page: 404 while it is empty, otherwise its section's panels. The desk's J-card
 * holds them, and is the page's main region with the track's title. Events has its own
 * device; until the other sections have theirs, each v1 body sits on a stand-in screen,
 * dark as the body was designed for.
 */
export async function TrackRoute({ id }: { id: TrackId }) {
  const content = await getContent();
  if (!hasContent(id, content)) notFound();
  if (id === "events") return <EventsSection events={content.events} base="" />;
  return <Section device={<div data-interim-screen>{body(id, content)}</div>} liner={null} />;
}
