import { Photo } from "@/components/Photo";
import type { EventItem } from "@/lib/content/schema";

/** The event's cover photo. Shared by the bento tile and the event page so Task 15 can morph one into the other. */
export function EventPhoto({ event, sizes, className }: { event: EventItem; sizes: string; className?: string }) {
  return <Photo photo={event.photos[0]} sizes={sizes} className={className} />;
}
