import { notFound } from "next/navigation";
import { Section } from "@/components/desk/Section";
import { EventStory } from "@/components/devices/events/EventStory";
import { LiveRec } from "@/components/devices/events/LiveRec";
import { newestFirst } from "@/lib/devices/events";
import { PREVIEW_BASE, previewDraft } from "../../draft";

export const dynamic = "force-dynamic";

/** An event of the draft, as the public event page: the Events device on its live recording, the story on the liner. */
export default async function PreviewEvent({ params }: { params: Promise<{ slug: string }> }) {
  const { content } = await previewDraft();
  const { slug } = await params;
  const list = newestFirst(content.events);
  const at = list.findIndex((e) => e.slug === slug);
  if (at < 0) notFound();
  const event = list[at];
  return <Section device={<LiveRec event={event} number={at + 1} base={PREVIEW_BASE} />} liner={<EventStory event={event} />} />;
}
