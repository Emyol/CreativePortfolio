import { ViewTransition } from "react";
import { Photo } from "@/components/Photo";
import type { EventItem } from "@/lib/content/schema";

/**
 * The event's cover photo. The same name on the bento tile and the event page lets the
 * browser morph one into the other. share + default="none" (Next 16 view-transitions guide)
 * keeps it from crossfading on unrelated transitions.
 */
export function EventPhoto({ event, sizes, className }: { event: EventItem; sizes: string; className?: string }) {
  return (
    <ViewTransition name={`event-photo-${event.slug}`} share="morph" default="none">
      <Photo photo={event.photos[0]} sizes={sizes} className={className} />
    </ViewTransition>
  );
}
