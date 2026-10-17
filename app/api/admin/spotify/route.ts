import { parseSpotifyMeta } from "@/lib/admin/spotify";
import { failure, json } from "@/lib/supabase/http";
import { AdminError, requireOwner } from "@/lib/supabase/server";

const TRACK = /^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]{22}(\?.*)?$/;
const TIMEOUT_MS = 4000;

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "user-agent": "Mozilla/5.0 (tape admin)" } });
  return res.ok ? res.text() : "";
}

/** Owner-only: a pasted Spotify track link's title and artist, or {} when Spotify won't say. */
export async function GET(request: Request) {
  try {
    await requireOwner();
    const url = new URL(request.url).searchParams.get("url") ?? "";
    if (!TRACK.test(url)) throw new AdminError("That isn't a Spotify song link.");
    const clean = url.split("?")[0];
    const [oembed, page] = await Promise.allSettled([
      fetchText(`https://open.spotify.com/oembed?url=${encodeURIComponent(clean)}`).then((t) => (t ? JSON.parse(t) : null)),
      fetchText(clean),
    ]);
    return json(parseSpotifyMeta(oembed.status === "fulfilled" ? oembed.value : null, page.status === "fulfilled" ? page.value : ""));
  } catch (e) {
    return failure(e);
  }
}
