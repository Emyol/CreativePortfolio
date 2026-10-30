import { beforeEach, describe, expect, it, vi } from "vitest";

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({ notFound: () => notFound() }));
const getContent = vi.fn();
vi.mock("@/lib/content/load", () => ({ getContent: () => getContent() }));

import { EventsSection } from "@/components/devices/events/EventsSection";
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

  it("gives events its own device instead of the stand-in screen", async () => {
    getContent.mockResolvedValue(FIXTURES);
    const el = await TrackRoute({ id: "events" });
    expect(el.type).toBe(EventsSection);
    expect(el.props).toMatchObject({ events: FIXTURES.events, base: "" });
  });

  it("renders given content under a given base without loading the published tape (the admin's preview)", async () => {
    getContent.mockClear();
    const draft = { ...FIXTURES, events: FIXTURES.events.slice(0, 1) };
    const el = await TrackRoute({ id: "events", content: draft, base: "/admin/preview" });
    expect(el.props).toMatchObject({ events: draft.events, base: "/admin/preview" });
    expect(getContent).not.toHaveBeenCalled();
  });

  it("calls notFound when the given content leaves the track empty", async () => {
    await expect(TrackRoute({ id: "people", content: { ...FIXTURES, people: [] }, base: "/admin/preview" })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
