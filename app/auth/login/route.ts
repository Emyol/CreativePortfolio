import { serverClient } from "@/lib/supabase/server";
import { failure } from "@/lib/supabase/http";
export async function GET(request: Request) {
  try {
    const client = await serverClient();
    const origin = process.env.SITE_URL || new URL(request.url).origin;
    const { data, error } = await client.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${origin}/auth/callback` },
    });
    if (error || !data.url) throw error || new Error("Login unavailable");
    return Response.redirect(data.url);
  } catch (e) {
    return failure(e);
  }
}
