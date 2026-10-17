import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, isAuthApiError, isAuthSessionMissingError } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export class AdminError extends Error {
  constructor(
    message: string,
    public status = 400,
    options?: { cause?: unknown },
  ) {
    super(message, options);
  }
}
/** Development only: CONTENT_SOURCE=fixtures runs the admin against fixtures with no Supabase. */
export const fixturesMode = () => process.env.CONTENT_SOURCE === "fixtures" && process.env.NODE_ENV !== "production";

export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}
export function publicClient() {
  const config = supabaseConfig();
  if (!config)
    throw new AdminError("Connect Supabase using docs/admin-setup.md.", 503);
  return createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function serverClient() {
  const config = supabaseConfig();
  if (!config)
    throw new AdminError("Connect Supabase using docs/admin-setup.md.", 503);
  const jar = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => {
        try {
          values.forEach(({ name, value, options }) =>
            jar.set(name, value, options),
          );
        } catch {
          /* Server render cannot write; handlers refresh sessions. */
        }
      },
    },
  });
}
export async function requireOwner() {
  const client = await serverClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (!user) {
    // Only a missing or rejected session means "signed out". Anything else (Supabase paused,
    // unreachable, 5xx) is an outage: saying "sign in" would send the owner away from an
    // open draft for nothing.
    const signedOut = !error || isAuthSessionMissingError(error) || (isAuthApiError(error) && error.status < 500);
    if (signedOut) throw new AdminError("Sign in to continue.", 401);
    throw new AdminError("Couldn't reach the database. Try again in a moment.", 503, { cause: error });
  }
  const { data, error: lookupError } = await client
    .from("tape_admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (lookupError)
    throw new AdminError("Database setup is incomplete or unavailable.", 503);
  if (!data)
    throw new AdminError("This GitHub account isn't the tape's owner.", 403);
  return client;
}
export async function getAdminStatus(): Promise<{
  status: "setup" | "signed-out" | "forbidden" | "ready" | "error";
  message?: string;
}> {
  if (fixturesMode()) return { status: "ready" };
  if (!supabaseConfig()) return { status: "setup" };
  try {
    await requireOwner();
    return { status: "ready" };
  } catch (error) {
    const e = error as AdminError;
    return {
      status:
        e.status === 401
          ? "signed-out"
          : e.status === 403
            ? "forbidden"
            : "error",
      message: e.message,
    };
  }
}
