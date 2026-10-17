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
    } catch {
      /* Return a stable login error, never provider details. */
    }
  }
  return Response.redirect(`${origin}/admin?error=login`);
}
