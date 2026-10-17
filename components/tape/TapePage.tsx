import { Flip } from "@/components/device/Flip";
import { HomeTape } from "@/components/device/HomeTape";
import { Underside } from "@/components/frame/Underside";
import { ActiveTrackProvider } from "@/components/motion/ActiveTrack";
import { TapeBody } from "@/components/tracks/TapeBody";
import type { SiteContent } from "@/lib/content/schema";
import { visibleTracks } from "@/lib/tape";

/** The whole tape from content: shared by the home page and the admin preview. */
export function TapePage({ content, eventHref }: { content: SiteContent; eventHref?: (slug: string) => string }) {
  const tracks = visibleTracks(content);
  return (
    <ActiveTrackProvider ids={tracks.map((t) => t.id)}>
      <HomeTape tracks={tracks} songs={content.music.map(({ title, artist }) => ({ title, artist }))}>
        <main id="main" tabIndex={-1}>
          <TapeBody tracks={tracks} content={content} flip={<Flip />} eventHref={eventHref} />
        </main>
        <Underside toolbox={content.about.toolbox} links={content.links} />
      </HomeTape>
    </ActiveTrackProvider>
  );
}
