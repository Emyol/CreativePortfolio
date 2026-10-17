import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventPageBody } from "@/components/tape/EventPageBody";
import { getContent } from "@/lib/content/load";

type Props = { params: Promise<{ slug: string }> };

// Events published from the admin get their page on first visit, without a deploy;
// unknown slugs still 404 (notFound below). Pages refresh hourly and on publish.
export const dynamicParams = true;
export const revalidate = 3600;

export async function generateStaticParams() {
  const { events } = await getContent();
  return events.map((e) => ({ slug: e.slug }));
}

async function findEvent(slug: string) {
  const { events } = await getContent();
  return events.find((e) => e.slug === slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await findEvent((await params).slug);
  return event ? { title: `${event.name} · Miel`, description: event.summary } : {};
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  const content = await getContent();
  const event = content.events.find((e) => e.slug === slug);
  if (!event) notFound();
  return <EventPageBody content={content} event={event} />;
}
