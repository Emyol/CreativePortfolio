import { Flip } from "@/components/device/Flip";
import { HomeTape } from "@/components/device/HomeTape";
import { Footer } from "@/components/frame/Footer";
import { ActiveTrackProvider } from "@/components/motion/ActiveTrack";
import { TapeBody } from "@/components/tracks/TapeBody";
import { getContent } from "@/lib/content/load";
import { visibleTracks } from "@/lib/tape";

export default async function Home() {
  const content = await getContent();
  const tracks = visibleTracks(content);

  return (
    <ActiveTrackProvider ids={tracks.map((t) => t.id)}>
      <HomeTape tracks={tracks}>
        <main id="main" tabIndex={-1}>
          <TapeBody tracks={tracks} content={content} flip={<Flip />} />
        </main>
        <Footer />
      </HomeTape>
    </ActiveTrackProvider>
  );
}
