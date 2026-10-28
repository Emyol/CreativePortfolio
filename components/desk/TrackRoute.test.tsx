import { beforeEach, describe, expect, it, vi } from "vitest";

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({ notFound: () => notFound() }));
const getContent = vi.fn();
vi.mock("@/lib/content/load", () => ({ getContent: () => getContent() }));

import { FIXTURES } from "@/lib/content/fixtures";
import { TrackRoute } from "./TrackRoute";

describe("TrackRoute", () => {
  beforeEach(() => {
    notFound.mockClear();
  });

  it("calls notFound when the track has no content", async () => {
    getContent.mockResolvedValue({ ...FIXTURES, music: [] });
    await expect(TrackRoute({ id: "mixtape" })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  it("renders when the track has content", async () => {
    getContent.mockResolvedValue(FIXTURES);
    await expect(TrackRoute({ id: "about" })).resolves.toBeTruthy();
    expect(notFound).not.toHaveBeenCalled();
  });
});
