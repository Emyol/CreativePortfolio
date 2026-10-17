"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { MixtapeSong } from "@/lib/content/schema";
import { getPlayback, getServerPlayback, resetPlayback, setPlayback, subscribePlayback } from "@/lib/playback";
import { loadSpotifyApi, spotifyUri, type EmbedController } from "@/lib/spotify";
import { formatTrackNumber } from "@/lib/tape";
import styles from "./Mixtape.module.css";

// If play() hasn't produced playback by then, the browser blocked it (Safari autoplay).
const STALL_MS = 3000;

export const clock = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * The mixtape: songs Miel loves, by their real artists, played in the page through one
 * Spotify embed. Nothing from Spotify loads until the first press; each row keeps a plain
 * link to the song so the page works without the script.
 */
export function Mixtape({ songs }: { songs: MixtapeSong[] }) {
  const playback = useSyncExternalStore(subscribePlayback, getPlayback, getServerPlayback);
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<EmbedController | null>(null);
  const stall = useRef<number | undefined>(undefined);
  const [stalled, setStalled] = useState(false);
  const [announced, setAnnounced] = useState("");
  const [failed, setFailed] = useState(false);

  // Leaving the page (an event page, say) takes the deck with it: stop and reset.
  useEffect(
    () => () => {
      window.clearTimeout(stall.current);
      controller.current?.destroy();
      controller.current = null;
      resetPlayback();
    },
    [],
  );

  // Announce each new song once it actually plays.
  const playingSong = playback.status === "playing" ? playback.song : null;
  useEffect(() => {
    if (playingSong === null) return;
    const s = songs[playingSong];
    if (s) setAnnounced(`Now playing: ${s.title} by ${s.artist}`);
  }, [playingSong, songs]);

  const armStall = () => {
    window.clearTimeout(stall.current);
    setStalled(false);
    stall.current = window.setTimeout(() => setStalled(true), STALL_MS);
  };

  const onUpdate = ({ data }: { data: { isPaused: boolean; isBuffering: boolean; position: number; duration: number } }) => {
    const moving = !data.isPaused && !data.isBuffering;
    if (moving) {
      window.clearTimeout(stall.current);
      setStalled(false);
    }
    setPlayback({ status: moving ? "playing" : "paused", position: data.position, duration: data.duration });
  };

  async function press(i: number) {
    const current = getPlayback();
    if (controller.current && current.song === i && (current.status === "playing" || current.status === "paused")) {
      controller.current.togglePlay();
      return;
    }
    const uri = spotifyUri(songs[i].spotify);
    setFailed(false);
    setPlayback({ status: "loading", song: i, position: 0, duration: 0 });
    armStall();
    if (controller.current) {
      if (controller.current.loadEntity) controller.current.loadEntity(uri);
      else controller.current.loadUri(uri);
      controller.current.play();
      return;
    }
    try {
      const api = await loadSpotifyApi();
      if (!host.current) return;
      // The API replaces the element it is given; hand it one React doesn't manage.
      const mount = document.createElement("div");
      host.current.append(mount);
      api.createController(mount, { uri, width: "100%", height: 152 }, (c) => {
        controller.current = c;
        c.addListener("playback_update", onUpdate);
        c.addListener("ready", () => c.play());
        c.play();
      });
    } catch {
      window.clearTimeout(stall.current);
      setFailed(true);
      setPlayback({ status: "error" });
    }
  }

  const active = playback.song !== null && playback.status !== "idle" && playback.status !== "error" ? playback.song : null;
  const now = active !== null ? songs[active] : null;
  const progress = playback.duration > 0 ? Math.min(1, playback.position / playback.duration) : 0;

  return (
    <div className={styles.mixtape}>
      <ol className={styles.songs}>
        {songs.map((s, i) => {
          const isActive = active === i;
          const playing = isActive && playback.status === "playing";
          return (
            <li key={`${s.spotify}-${i}`} className={styles.song} data-active={isActive ? "" : undefined} data-playing={playing ? "" : undefined}>
              <span className={styles.number} aria-hidden="true">
                {playing ? (
                  <span className={styles.bars}>
                    <i />
                    <i />
                    <i />
                  </span>
                ) : (
                  formatTrackNumber(i + 1)
                )}
              </span>
              <button
                type="button"
                className={styles.play}
                onClick={() => press(i)}
                aria-label={playing ? `Pause ${s.title}` : `Play ${s.title} on Spotify`}
                data-state={playing ? "playing" : isActive && playback.status === "loading" ? "loading" : "idle"}
              >
                <span className={styles.glyph} aria-hidden="true" />
              </button>
              <div className={styles.text}>
                <p className={styles.title}>{s.title}</p>
                <p className={styles.artist}>{s.artist}</p>
                {s.note && <p className={styles.note}>{s.note}</p>}
              </div>
              <a href={s.spotify} className={styles.open} aria-label={`Open in Spotify: ${s.title}`} target="_blank" rel="noopener">
                Open in Spotify
              </a>
            </li>
          );
        })}
      </ol>

      <aside className={styles.deck} aria-label="Now playing" data-deck>
        <div className={styles.readout} data-state={playback.status}>
          <p className={styles.readoutLabel}>{playback.status === "playing" ? "now playing" : playback.status === "paused" ? "paused" : playback.status === "loading" ? "loading" : "pick a song"}</p>
          <p className={styles.readoutTitle} title={now?.title}>{now ? now.title : "the mixtape"}</p>
          <p className={styles.readoutMeta}>
            <span>{now ? now.artist : `${songs.length} songs`}</span>
            {now && <span>{clock(playback.position)} / {clock(playback.duration)}</span>}
          </p>
          <span className={styles.playhead} aria-hidden="true">
            <span style={{ transform: `scaleX(${progress})` }} />
          </span>
        </div>
        <div ref={host} className={styles.embed} data-embed />
        {failed && <p className={styles.warn} role="alert">Spotify didn&apos;t load. Open the song in Spotify instead.</p>}
        {stalled && !failed && <p className={styles.warn}>Press play in the Spotify player.</p>}
        <p className={styles.preview}>Logged-out listeners hear a preview from Spotify.</p>
        <p className="sr-only" role="status">{announced}</p>
      </aside>
    </div>
  );
}
