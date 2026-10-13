/**
 * A blocking inline script that runs before first paint on hard loads.
 * Next 16 docs (preventing-flash-before-hydration): render it as text/javascript on the
 * server and text/plain on the client so React doesn't warn and it never re-runs.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
