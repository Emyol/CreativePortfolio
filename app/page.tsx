import { Device } from "@/components/device/Device";
import { Footer } from "@/components/frame/Footer";
import { ActiveTrackProvider } from "@/components/motion/ActiveTrack";
import { TapeBody } from "@/components/tracks/TapeBody";
import { getContent } from "@/lib/content/load";
import { visibleTracks } from "@/lib/tape";
import styles from "./page.module.css";

export default async function Home() {
  const content = await getContent();
  const tracks = visibleTracks(content);

  return (
    <ActiveTrackProvider ids={tracks.map((t) => t.id)}>
      <header data-hero id="top" className={styles.hero}>
        <Device tracks={tracks} side="a" current={null} interactive className={styles.device} />
      </header>
      <main id="main" tabIndex={-1}>
        <TapeBody tracks={tracks} content={content} />
      </main>
      <Footer />
    </ActiveTrackProvider>
  );
}
