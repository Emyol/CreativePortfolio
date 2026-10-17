import type { MixtapeSong } from "@/lib/content/schema";

/** Placeholder track list; the Spotify deck replaces it. */
export function Mixtape({ songs }: { songs: MixtapeSong[] }) {
  return (
    <ol>
      {songs.map((s, i) => (
        <li key={i}>
          <a href={s.spotify}>{s.title}</a>, {s.artist}
        </li>
      ))}
    </ol>
  );
}
