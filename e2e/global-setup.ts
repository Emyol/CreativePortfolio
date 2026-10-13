// The dev server compiles routes on first request; warm them so the first tests
// measure the site, not the compiler.
export default async function globalSetup() {
  const base = "http://localhost:3100";
  for (const path of ["/", "/events/fixture-event-1", "/mokuroku"]) {
    await fetch(base + path).catch(() => undefined);
  }
}
