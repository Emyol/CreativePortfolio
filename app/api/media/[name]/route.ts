import { publicClient, serverClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NAME = /^[a-f0-9-]{36}\.(jpg|png|webp)$/;
/** An outage, logged, never cached, never disguised as a missing photo. */
function unavailable(what: string, cause: unknown) {
  console.error(`[media] ${what} failed`, cause);
  return new Response("Photo unavailable", { status: 503, headers: { "Cache-Control": "private, no-store" } });
}

/** Storage reports a missing or unreadable (RLS) object as 400/404 or "not found". */
function isNotFound(error: unknown): boolean {
  const e = error as { status?: number; statusCode?: string | number; message?: string };
  const code = Number(e.status ?? e.statusCode);
  return code === 400 || code === 404 || /not.?found/i.test(e.message ?? "");
}

const SAFE = { "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" };

/**
 * Photos uploaded in the admin. Published ones are immutable (random names never reused),
 * so the CDN and next/image keep them and Supabase is asked once per photo, not per view.
 * Draft photos are owner-only and never cached.
 */
export async function GET(_request: Request, context: { params: Promise<{ name: string }> }) {
  const { name } = await context.params;
  if (!NAME.test(name)) return new Response("Not found", { status: 404 });
  try {
    const anonymous = publicClient();
    const { data: published, error: lookupError } = await anonymous.from("tape_published_assets").select("name").eq("name", name).maybeSingle();
    if (lookupError) return unavailable("published photo lookup", lookupError);
    const client = published ? anonymous : await serverClient();
    const { data, error } = await client.storage.from("tape-assets").download(name);
    if (error && !isNotFound(error)) return unavailable("photo download", error);
    if (error || !data) return new Response("Not found", { status: 404, headers: { "Cache-Control": "private, no-store" } });
    return new Response(data, {
      headers: {
        ...SAFE,
        "Content-Type": data.type,
        "Cache-Control": published ? "public, max-age=31536000, immutable" : "private, no-store",
      },
    });
  } catch (e) {
    return unavailable("photo route", e);
  }
}
