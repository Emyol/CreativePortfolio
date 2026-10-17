const ENTITIES: Record<string, string> = { amp: "&", quot: '"', "#39": "'", apos: "'", lt: "<", gt: ">" };
const decode = (s: string) => s.replace(/&(amp|quot|#39|apos|lt|gt);/g, (_, e: string) => ENTITIES[e]).trim();

function meta(html: string, attr: "property" | "name", key: string): string | undefined {
  const re = new RegExp(`<meta[^>]*${attr}=["']${key.replace(/[.:]/g, "\$&")}["'][^>]*content=["']([^"']*)["']`, "i");
  return html.match(re)?.[1];
}

/**
 * A song's title (from Spotify's public oEmbed) and, best effort, its artist (from the track
 * page's metadata). Anything that doesn't parse is simply left out, for typing.
 */
export function parseSpotifyMeta(oembed: unknown, html: string): { title?: string; artist?: string } {
  const out: { title?: string; artist?: string } = {};
  const raw = (oembed as { title?: unknown } | null)?.title;
  if (typeof raw === "string" && raw.trim()) out.title = decode(raw);

  const musician = meta(html, "name", "music:musician_description");
  let artist = musician ? decode(musician) : undefined;
  if (!artist) {
    const description = meta(html, "property", "og:description");
    if (description) {
      // "NIKI · Song · 2022", sometimes after "Listen to lowkey on Spotify."
      const parts = decode(description).replace(/^Listen to .*? on Spotify\.\s*/i, "").split(" · ");
      if (parts.length >= 2) artist = parts[0];
    }
  }
  if (artist && artist !== out.title) out.artist = artist;
  return out;
}
