import { notFound } from "next/navigation";
import { TrackRoute } from "@/components/desk/TrackRoute";
import { TRACK_ORDER, type TrackId } from "@/lib/tape";
import { PREVIEW_BASE, previewDraft } from "../draft";

export const dynamic = "force-dynamic";

const isTrack = (s: string): s is TrackId => TRACK_ORDER.some((t) => t.id === s);

/** A track of the draft in the J-card; 404 for anything else, and for a track the draft leaves empty. */
export default async function PreviewTrack({ params }: { params: Promise<{ track: string }> }) {
  const { content } = await previewDraft();
  const { track } = await params;
  if (!isTrack(track)) notFound();
  return <TrackRoute id={track} content={content} base={PREVIEW_BASE} />;
}
