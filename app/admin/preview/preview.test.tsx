import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
const redirect = vi.fn((to: string) => {
  throw new Error(`NEXT_REDIRECT ${to}`);
});
vi.mock("next/navigation", () => ({ notFound: () => notFound(), redirect: (to: string) => redirect(to) }));
const getAdminStatus = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ getAdminStatus: () => getAdminStatus() }));
const getDraft = vi.fn();
vi.mock("@/lib/content/repository", () => ({ getDraft: () => getDraft() }));

import { Desk } from "@/components/desk/Desk";
import { Section } from "@/components/desk/Section";
import { TrackRoute } from "@/components/desk/TrackRoute";
import { LiveRec } from "@/components/devices/events/LiveRec";
import { FIXTURES } from "@/lib/content/fixtures";
import { newestFirst } from "@/lib/devices/events";
import TrackPage, * as trackModule from "./[track]/page";
import EventPage, * as eventModule from "./events/[slug]/page";
import PreviewLayout, * as layoutModule from "./layout";
import HomePage from "./page";
import { PreviewLabel } from "./PreviewLabel";

const params = <T,>(p: T) => ({ params: Promise.resolve(p) });
/** The draft with one unfinished event (no date), which the preview leaves out. */
const DRAFT = { ...FIXTURES, events: [...FIXTURES.events, { name: "Unfinished", slug: "unfinished", summary: "", story: [], photos: [] }] };

beforeEach(() => {
  vi.clearAllMocks();
  getAdminStatus.mockResolvedValue({ status: "ready" });
  getDraft.mockResolvedValue({ content: DRAFT, revision: 3 });
});

describe("the preview", () => {
  it("is never cached", () => {
    expect(layoutModule.dynamic).toBe("force-dynamic");
    expect(trackModule.dynamic).toBe("force-dynamic");
    expect(eventModule.dynamic).toBe("force-dynamic");
  });

  it("sends anyone but the signed-in owner to the admin, from every route", async () => {
    getAdminStatus.mockResolvedValue({ status: "signed-out" });
    await expect(PreviewLayout({ children: null })).rejects.toThrow("NEXT_REDIRECT /admin");
    await expect(HomePage()).rejects.toThrow("NEXT_REDIRECT /admin");
    await expect(TrackPage(params({ track: "about" }))).rejects.toThrow("NEXT_REDIRECT /admin");
    await expect(EventPage(params({ slug: "fixture-event-1" }))).rejects.toThrow("NEXT_REDIRECT /admin");
    expect(getDraft).not.toHaveBeenCalled();
  });

  it("is the desk with the draft under /admin/preview, labelled as a preview", async () => {
    const el = (await PreviewLayout({ children: "route" })) as ReactElement<{ children: ReactElement[]; "data-notes"?: string }>;
    // Two rows on the label (the note on unfinished entries): the flap leaves room for both.
    expect(el.props["data-notes"]).toBe("");
    const [label, desk] = el.props.children;
    expect(label.type).toBe(PreviewLabel);
    expect(label.props).toEqual({ hidden: 1 });
    expect(desk.type).toBe(Desk);
    expect(desk.props).toMatchObject({ base: "/admin/preview", preview: true, children: "route" });
    expect((desk.props as { content: typeof FIXTURES }).content.events.map((e) => e.slug)).toEqual(FIXTURES.events.map((e) => e.slug));
  });

  it("gives a track the draft and the preview's base", async () => {
    const el = (await TrackPage(params({ track: "events" }))) as ReactElement<Record<string, unknown>>;
    expect(el.type).toBe(TrackRoute);
    expect(el.props).toMatchObject({ id: "events", base: "/admin/preview" });
    expect((el.props.content as typeof FIXTURES).events).toHaveLength(FIXTURES.events.length);
  });

  it("404s for anything that isn't a track", async () => {
    await expect(TrackPage(params({ track: "side-b" }))).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(TrackPage(params({ track: "tracklist" }))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("opens an event of the draft on its live recording, numbered as the list has it, its links in the preview", async () => {
    const list = newestFirst(FIXTURES.events);
    const el = (await EventPage(params({ slug: list[2].slug }))) as ReactElement<{ device: ReactElement; liner: ReactElement }>;
    expect(el.type).toBe(Section);
    expect(el.props.device.type).toBe(LiveRec);
    expect(el.props.device.props).toMatchObject({ number: 3, base: "/admin/preview" });
    expect((el.props.device.props as { event: { slug: string } }).event.slug).toBe(list[2].slug);
    expect((el.props.liner.props as { event: { slug: string } }).event.slug).toBe(list[2].slug);
  });

  it("404s for an event the draft doesn't show", async () => {
    await expect(EventPage(params({ slug: "unfinished" }))).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(EventPage(params({ slug: "no-such-event" }))).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
