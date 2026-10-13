import { afterEach, describe, expect, test, vi } from "vitest";
import { getContent, parseContent } from "./load";
import seed from "./seed.json";

afterEach(() => vi.unstubAllEnvs());

describe("content loading", () => {
  test("seed.json is valid", () => {
    expect(() => parseContent(seed, "seed.json")).not.toThrow();
  });
  test("seed.json never contains fixture text", () => {
    expect(JSON.stringify(seed)).not.toMatch(/fixture/i);
  });
  test("invalid content fails loudly with the source and the field", () => {
    expect(() => parseContent({ events: "nope" }, "seed.json")).toThrow(/seed\.json[\s\S]*events/);
  });
  test("fixtures load in development", async () => {
    vi.stubEnv("CONTENT_SOURCE", "fixtures");
    vi.stubEnv("NODE_ENV", "development");
    const c = await getContent();
    expect(c.events.length).toBeGreaterThan(0);
  });
  test("fixtures are refused in a production build", async () => {
    vi.stubEnv("CONTENT_SOURCE", "fixtures");
    vi.stubEnv("NODE_ENV", "production");
    await expect(getContent()).rejects.toThrow(/development only/);
  });
  test("without the flag, the real seed is used", async () => {
    const c = await getContent();
    expect(c).toEqual(parseContent(seed, "seed.json"));
  });
});
