import { publicClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Called once a day by Vercel Cron (vercel.json). One cheap read keeps the free Supabase
 * project from pausing for inactivity, so uploaded photos never go dark. It also keeps the
 * professional site's tables awake: they share the project.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Failing loudly here makes the cron show as failing in Vercel, instead of the project
    // quietly pausing a week later.
    console.error("[keepalive] CRON_SECRET is not set; the database is not being kept awake");
    return new Response("Keep-alive is not configured", { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const { error } = await publicClient().from("tape_published").select("id").limit(1);
    if (error) throw error;
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[keepalive] the database didn't answer", e);
    return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
