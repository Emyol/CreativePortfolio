import { serverClient } from "@/lib/supabase/server";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = process.env.SITE_URL || url.origin;
  const code = url.searchParams.get("code");
  if (code) {
    try {
      const client = await serverClient();
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (!error) return Response.redirect(`${origin}/admin`);
      console.error("[auth/callback] code exchange failed", error);
    } catch (e) {
      // The owner gets a stable message; the log keeps the reason.
      console.error("[auth/callback] code exchange threw", e);
    }
  }
  if (!code) console.error("[auth/callback] no code", url.searchParams.get("error_description") ?? url.searchParams.get("error") ?? "");
  return Response.redirect(`${origin}/admin?error=login`);
}
