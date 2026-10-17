import { afterEach, expect, test, vi } from "vitest";
import { failure, readBody, sameOrigin } from "./http";
import { AdminError } from "./server";

afterEach(() => vi.unstubAllEnvs());

const req = (body: string, headers: Record<string, string> = {}) =>
  new Request("https://tape.test/api/admin/content", { method: "PUT", body, headers: { "content-type": "application/json", ...headers } });

test("a request from another origin is refused", () => {
  vi.stubEnv("SITE_URL", "https://tape.test");
  expect(() => sameOrigin(req("{}", { origin: "https://evil.test" }))).toThrow(expect.objectContaining({ status: 403 }));
  expect(() => sameOrigin(req("{}", { origin: "https://tape.test" }))).not.toThrow();
});

test("bodies must be JSON, small and well formed", async () => {
  await expect(readBody(req("{}", { "content-type": "text/plain" }))).rejects.toMatchObject({ status: 415 });
  await expect(readBody(req("x".repeat(1_000_001)))).rejects.toMatchObject({ status: 413 });
  await expect(readBody(req("{nope"))).rejects.toMatchObject({ status: 400 });
  await expect(readBody(req('{"a":1}'))).resolves.toEqual({ a: 1 });
});

test("failures carry their own status and message, never cached", async () => {
  const known = failure(new AdminError("x", 409));
  expect(known.status).toBe(409);
  expect(await known.json()).toEqual({ error: "x" });
  expect(known.headers.get("cache-control")).toBe("private, no-store");
  const unknown = failure(new Error("db password is hunter2"));
  expect(unknown.status).toBe(500);
  expect(await unknown.json()).toEqual({ error: "The operation failed. Please try again." });
});
