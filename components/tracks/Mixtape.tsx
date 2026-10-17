"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { MixtapeSong } from "@/lib/content/schema";
import { getPlayback, getServerPlayback, resetPlayback, setPlayback, subscribePlayback } from "@/lib/playback";
import { loadSpotifyApi, spotifyUri, type EmbedController, type PlaybackUpdate } from "@/lib/spotify";
import { formatTrackNumber } from "@/lib/tape";
import styles from "./Mixtape.module.css";

// If play() hasn't produced playback by then, the browser blocked it (Safari autoplay).
const STALL_MS = 3000;
// The script can load while the embed itself is blocked; give the player this long to answer.
const EMBED_MS = 8000;
const STALL_HINT = "Press play in the Spotify player.";

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
  // One player is ever made: presses while it is being made only change what it will load.
  const creating = useRef(false);
  const wanted = useRef<string | null>(null);
  const disposed = useRef(false);
  const stall = useRef<number | undefined>(undefined);
  const embed = useRef<number | undefined>(undefined);
  const [stalled, setStalled] = useState(false);
  const [announced, setAnnounced] = useState("");
  const [failed, setFailed] = useState(false);

  // Leaving the page (an event page, say) takes the deck with it: stop and reset. A player
  // that answers after this is destroyed on arrival (see the createController callback).
  useEffect(() => {
    disposed.current = false;
    return () => {
      disposed.current = true;
      window.clearTimeout(stall.current);
      window.clearTimeout(embed.current);
      controller.current?.destroy();
      controller.current = null;
      resetPlayback();
    };
  }, []);

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

  const fail = (why: unknown) => {
    console.warn("[mixtape] Spotify didn't load", why);
    window.clearTimeout(stall.current);
    window.clearTimeout(embed.current);
    creating.current = false;
    setStalled(false);
    setFailed(true);
    setPlayback({ status: "error" });
  };

  const load = (c: EmbedController, uri: string) => {
    if (c.loadEntity) c.loadEntity(uri);
    else c.loadUri(uri);
  };

  const onUpdate = ({ data }: { data: PlaybackUpdate }) => {
    if (disposed.current) return;
    // Updates still in flight from the previous song say nothing about this one.
    if (data.playingURI && wanted.current && data.playingURI !== wanted.current) return;
    window.clearTimeout(embed.current);
    if (data.isBuffering) {
      setPlayback({ status: "loading", position: data.position, duration: data.duration });
      return;
    }
    if (!data.isPaused) {
      window.clearTimeout(stall.current);
      setStalled(false);
    }
    setPlayback({ status: data.isPaused ? "paused" : "playing", position: data.position, duration: data.duration });
  };

  async function press(i: number) {
    const current = getPlayback();
    if (controller.current && current.song === i && (current.status === "playing" || current.status === "paused")) {
      controller.current.togglePlay();
      return;
    }
    let uri: string;
    try {
      uri = spotifyUri(songs[i].spotify);
    } catch (err) {
      fail(err);
      return;
    }
    wanted.current = uri;
    setFailed(false);
    setPlayback({ status: "loading", song: i, position: 0, duration: 0 });
    if (controller.current) {
      load(controller.current, uri);
      controller.current.play();
      armStall();
      return;
    }
    if (creating.current) return; // the player being made loads wanted.current when it arrives
    creating.current = true;
    try {
      const api = await loadSpotifyApi();
      if (disposed.current || !host.current) return;
      // The API replaces the element it is given; hand it one React doesn't manage.
      const mount = document.createElement("div");
      host.current.append(mount);
      let abandoned = false;
      embed.current = window.setTimeout(() => {
        abandoned = true;
        mount.remove();
        fail("the player never answered");
      }, EMBED_MS);
      api.createController(mount, { uri, width: "100%", height: 152 }, (c) => {
        if (disposed.current || abandoned) {
          c.destroy();
          return;
        }
        creating.current = false;
        controller.current = c;
        c.addListener("playback_update", onUpdate);
        c.addListener("ready", () => {
          if (!disposed.current) c.play();
        });
        if (wanted.current && wanted.current !== uri) load(c, wanted.current);
        c.play();
        armStall();
      });
    } catch (err) {
      fail(err);
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
        <p className={stalled && !failed ? styles.warn : "sr-only"} role="status">
          {stalled && !failed ? STALL_HINT : announced}
        </p>
        <p className={styles.preview}>Logged-out listeners hear a preview from Spotify.</p>
      </aside>
    </div>
  );
}
