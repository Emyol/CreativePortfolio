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

type Props = {
  id: TrackId;
  /** The tape to show: the published one unless given (the admin's preview gives the draft). */
  content?: SiteContent;
  /** Where the desk's paths start (lib/desk/location): "" or "/admin/preview". */
  base?: string;
};

/**
 * A track's page: 404 while it is empty, otherwise its section's panels. The desk's J-card
 * holds them, and is the page's main region with the track's title. Only Events has its own
 * device (EventsSection); every other track's body sits on a stand-in screen
 * (`[data-interim-screen]`), dark as the body was designed for.
 */
export async function TrackRoute({ id, content: given, base = "" }: Props) {
  const content = given ?? (await getContent());
  if (!hasContent(id, content)) notFound();
  if (id === "events") return <EventsSection events={content.events} base={base} />;
  return <Section device={<div data-interim-screen>{body(id, content)}</div>} liner={null} />;
}
