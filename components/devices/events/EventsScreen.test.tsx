import { act, fireEvent, render, screen } from "@testing-library/react";
import { useMemo, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const prefetch = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, prefetch }) }));

import { DeskContext, knobStack, type DeskApi } from "@/components/desk/deskContext";
import { FIXTURES } from "@/lib/content/fixtures";
import { __resetEventsMemoryForTests, newestFirst } from "@/lib/devices/events";
import { EventsScreen, WHEEL_THROTTLE } from "./EventsScreen";

const events = FIXTURES.events;
const newest = newestFirst(events);

const NO_KNOB = knobStack();

function Desk({ api, knob = NO_KNOB, children }: { api: Partial<DeskApi>; knob?: ReturnType<typeof knobStack>; children: ReactNode }) {
  const value = useMemo<DeskApi>(() => ({ setScreen() {}, wiggleKnob() {}, useKnob: knob.useKnob, ...api }), [api, knob]);
  return <DeskContext.Provider value={value}>{children}</DeskContext.Provider>;
}

const listbox = () => screen.getByRole("listbox");
const selected = () => screen.getAllByRole("option").findIndex((o) => o.getAttribute("aria-selected") === "true");

describe("EventsScreen", () => {
  beforeEach(() => {
    __resetEventsMemoryForTests();
    push.mockClear();
    prefetch.mockClear();
  });
  afterEach(() => vi.restoreAllMocks());

  it("lists one option per event, newest first by date", () => {
    render(<EventsScreen events={events} base="" />);
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(events.length);
    const dates = newest.map((e) => e.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    options.forEach((o, i) => expect(o).toHaveTextContent(newest[i].name));
    // The newest leads: fixture event 6 (June 2025).
    expect(options[0]).toHaveTextContent("Fixture event 6");
  });

  it("moves the selection with ArrowDown, and opens it with Enter", () => {
    render(<EventsScreen events={events} base="" />);
    const box = listbox();
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    expect(box).toHaveAttribute("aria-activedescendant", options[0].id);
    fireEvent.keyDown(box, { key: "ArrowDown" });
    expect(options[0]).toHaveAttribute("aria-selected", "false");
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    expect(box).toHaveAttribute("aria-activedescendant", options[1].id);
    fireEvent.keyDown(box, { key: "Enter" });
    expect(push).toHaveBeenCalledWith(`/events/${newest[1].slug}`);
  });

  it("stops at the ends, and Home and End jump to them", () => {
    render(<EventsScreen events={events} base="" />);
    const box = listbox();
    fireEvent.keyDown(box, { key: "ArrowUp" });
    expect(selected()).toBe(0);
    fireEvent.keyDown(box, { key: "End" });
    expect(selected()).toBe(events.length - 1);
    fireEvent.keyDown(box, { key: "ArrowDown" });
    expect(selected()).toBe(events.length - 1);
    fireEvent.keyDown(box, { key: "Home" });
    expect(selected()).toBe(0);
  });

  it("opens an event on a click", () => {
    render(<EventsScreen events={events} base="/admin/preview" />);
    fireEvent.click(screen.getAllByRole("option")[3]);
    expect(push).toHaveBeenCalledWith(`/admin/preview/events/${newest[3].slug}`);
  });

  it("remembers the selection for the rest of the visit", () => {
    const { unmount } = render(<EventsScreen events={events} base="" />);
    fireEvent.keyDown(listbox(), { key: "ArrowDown" });
    fireEvent.keyDown(listbox(), { key: "ArrowDown" });
    unmount();
    render(<EventsScreen events={events} base="" />);
    expect(selected()).toBe(2);
  });

  it("gives a long name the stepping class when it is selected", () => {
    // jsdom lays nothing out: a name is as wide as its letters, a row's name cell 200 px.
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function (this: HTMLElement) {
      return (this.textContent?.length ?? 0) * 10;
    });
    vi.spyOn(Element.prototype, "clientWidth", "get").mockReturnValue(200);
    render(<EventsScreen events={events} base="" />);
    const long = newest.findIndex((e) => e.name.length > 20);
    const cell = (i: number) => screen.getAllByRole("option")[i].querySelector("[data-name]")!;
    expect(cell(0)).not.toHaveAttribute("data-stepping");
    expect(cell(long)).not.toHaveAttribute("data-stepping"); // only the cursor's row steps
    fireEvent.keyDown(listbox(), { key: "End" });
    for (let i = events.length - 1; i > long; i--) fireEvent.keyDown(listbox(), { key: "ArrowUp" });
    expect(selected()).toBe(long);
    expect(cell(long)).toHaveAttribute("data-stepping");
    expect(cell(long).className).toMatch(/stepping/);
  });

  it("writes where it is to the player's screen, and wiggles the knob once a visit", () => {
    const setScreen = vi.fn();
    const wiggleKnob = vi.fn();
    const api = { setScreen, wiggleKnob };
    const { unmount } = render(
      <Desk api={api}>
        <EventsScreen events={events} base="" />
      </Desk>,
    );
    expect(setScreen).toHaveBeenLastCalledWith(["02 EVENTS", "> 01 OF 07"]);
    fireEvent.keyDown(listbox(), { key: "ArrowDown" });
    fireEvent.keyDown(listbox(), { key: "ArrowDown" });
    expect(setScreen).toHaveBeenLastCalledWith(["02 EVENTS", "> 03 OF 07"]);
    expect(wiggleKnob).toHaveBeenCalledTimes(1);
    unmount();
    render(
      <Desk api={api}>
        <EventsScreen events={events} base="" />
      </Desk>,
    );
    expect(wiggleKnob).toHaveBeenCalledTimes(1);
  });

  it("moves with the player's knob", () => {
    const knob = knobStack();
    render(
      <Desk api={{}} knob={knob}>
        <EventsScreen events={events} base="" />
      </Desk>,
    );
    act(() => knob.step(2));
    expect(selected()).toBe(2);
    act(() => knob.step(-1));
    expect(selected()).toBe(1);
  });

  it("moves one row per wheel turn, at most one every 110 ms", () => {
    let now = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    render(<EventsScreen events={events} base="" />);
    fireEvent.wheel(listbox(), { deltaY: 100 });
    fireEvent.wheel(listbox(), { deltaY: 100 });
    expect(selected()).toBe(1);
    now += WHEEL_THROTTLE;
    fireEvent.wheel(listbox(), { deltaY: 100 });
    expect(selected()).toBe(2);
    now += WHEEL_THROTTLE;
    fireEvent.wheel(listbox(), { deltaY: -100 });
    expect(selected()).toBe(1);
  });

  it("previews the selected event's date and place", () => {
    render(<EventsScreen events={events} base="" />);
    const preview = document.querySelector("[data-events-preview]");
    expect(preview).toHaveTextContent("June 2025");
    expect(preview).toHaveTextContent("Fixture place 6");
  });
});
