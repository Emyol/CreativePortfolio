import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FIXTURES } from "@/lib/content/fixtures";
import { TRACK_INK } from "@/lib/desk/tapeLabel";
import { __resetVisitForTests, isFirstInsert } from "@/lib/desk/visit";
import { gsap } from "@/lib/motion/gsap";
import { MotionTierContext } from "@/lib/motion/MotionProvider";
import { visibleTracks, type TrackId } from "@/lib/tape";
import { Flap } from "./Flap";
import { JCard, PAPER, WIPE, paperInk } from "./JCard";
import { Section } from "./Section";

const tracks = visibleTracks(FIXTURES);

// WCAG 2.x relative luminance and contrast ratio, computed here independently of the code.
const channel = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]: readonly number[]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrast = (a: readonly number[], b: readonly number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

describe("Flap", () => {
  it("prints the six tracks under SIDE A and SIDE B, the current one marked", () => {
    render(<Flap tracks={tracks} base="" current="events" />);
    const nav = screen.getByRole("navigation", { name: "Tape" });
    expect(within(nav).getByRole("heading", { name: "SIDE A" })).toBeInTheDocument();
    expect(within(nav).getByRole("heading", { name: "SIDE B" })).toBeInTheDocument();
    expect(within(nav).getAllByRole("listitem")).toHaveLength(6);
    const links = within(nav).getAllByRole("link");
    expect(links.map((a) => a.textContent)).toEqual(["01 about", "02 events", "03 mixtape", "04 people", "05 made", "06 on rotation"]);
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/about", "/events", "/mixtape", "/people", "/made", "/on-rotation"]);
    expect(within(nav).getByRole("link", { name: "02 events" })).toHaveAttribute("aria-current", "page");
    expect(links.filter((a) => a.hasAttribute("aria-current"))).toHaveLength(1);
  });

  it("prints an empty track as text, not a link, and keeps the others' numbers and the base", () => {
    render(<Flap tracks={tracks.filter((t) => t.id !== "mixtape")} base="/admin/preview" current="people" />);
    const nav = screen.getByRole("navigation", { name: "Tape" });
    expect(within(nav).getAllByRole("listitem")).toHaveLength(6);
    expect(within(nav).queryByRole("link", { name: /mixtape/ })).toBeNull();
    expect(within(nav).getByText("03 mixtape")).toBeInTheDocument();
    expect(within(nav).getAllByRole("link")).toHaveLength(5);
    expect(within(nav).getByRole("link", { name: "04 people" })).toHaveAttribute("href", "/admin/preview/people");
  });
});

describe("paperInk", () => {
  it.each(Object.entries(TRACK_INK))("prints %s at 4.5:1 or more on the paper", (_, ink) => {
    expect(contrast(paperInk(ink), hex(PAPER))).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps an ink that already reads, and only darkens one that doesn't, keeping its hue", () => {
    expect(paperInk([20, 30, 120])).toEqual([20, 30, 120]);
    const events = paperInk(TRACK_INK.events);
    expect(events).not.toEqual(TRACK_INK.events);
    events.forEach((c, i) => expect(c).toBeLessThanOrEqual(TRACK_INK.events[i]));
    expect(events[2]).toBe(Math.max(...events));
  });
});

const card = (current: TrackId | null, body = "Fixture device", seatDelay = 0) => (
  <JCard tracks={tracks} base="" current={current} seatDelay={seatDelay}>
    {/* Keyed as a route's page is: a new track's panels are new elements. */}
    {current ? <Section key={current} device={<p>{body}</p>} liner={<p>Fixture liner</p>} /> : <main id="main">the desk</main>}
  </JCard>
);

describe("JCard", () => {
  it("is the main region: the track's heading, the flap and the two panels, in the track's ink", () => {
    render(card("events"));
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main");
    expect(main.style.getPropertyValue("--ink")).toBe("rgb(70 110 255)");
    expect(main.style.getPropertyValue("--print-ink")).toBe(`rgb(${paperInk(TRACK_INK.events).join(" ")})`);
    const h2 = within(main).getByRole("heading", { level: 2, name: "events" });
    expect(h2).toHaveAttribute("tabindex", "-1");
    expect([...main.querySelectorAll("[data-panel]")].map((p) => p.getAttribute("data-panel"))).toEqual(["flap", "device", "liner"]);
  });

  it("leaves the desk's own content alone with no tape in", () => {
    render(card(null));
    expect(screen.getByRole("main")).toHaveTextContent("the desk");
    expect(document.querySelector("[data-panel]")).toBeNull();
  });

  it("does not take focus on a direct load, and moves it to the heading when a tape loads", () => {
    const { rerender } = render(card("events"));
    expect(document.activeElement).toBe(document.body);
    rerender(card("mixtape"));
    expect(screen.getByRole("heading", { level: 2, name: "mixtape" })).toHaveFocus();
  });

  it("on eject, folds the card away hidden and inert, then gives the desk its content back", async () => {
    const { rerender } = render(<MotionTierContext.Provider value="none">{card("events")}</MotionTierContext.Provider>);
    const main = screen.getByRole("main");
    rerender(<MotionTierContext.Provider value="none">{card(null)}</MotionTierContext.Provider>);
    expect(main).toHaveAttribute("aria-hidden", "true");
    expect(main).toHaveAttribute("inert");
    expect(main).not.toHaveAttribute("id");
    // The folding copy still shows what was in (the route has moved on), and is the only main meanwhile.
    expect(main).toHaveTextContent("Fixture device");
    expect(main).not.toHaveTextContent("the desk");
    expect(document.querySelectorAll("main")).toHaveLength(1);
    await waitFor(() => expect(screen.getByRole("main")).toHaveTextContent("the desk"), { timeout: 2000 });
    expect(document.querySelector("[data-panel]")).toBeNull();
  });

  it("a new tape mid-fold opens the same card again, from where it is", () => {
    const { rerender } = render(card("events"));
    const main = screen.getByRole("main");
    rerender(card(null));
    rerender(card("people", "Fixture people"));
    expect(screen.getByRole("main")).toBe(main);
    expect(main).toHaveAttribute("id", "main");
    expect(main).not.toHaveAttribute("inert");
    expect(main).toHaveTextContent("Fixture people");
    expect(main).not.toHaveTextContent("Fixture device");
    expect(main.querySelectorAll("[data-panel]")).toHaveLength(3);
    expect(screen.getByRole("heading", { level: 2, name: "people" })).toHaveFocus();
  });

  it("a switch while the first insert is still unfolding joins the unfold, not shown at once", () => {
    __resetVisitForTests();
    const { rerender } = render(card(null));
    rerender(card("events", "Fixture device", 1));
    const title = screen.getByRole("heading", { level: 2, name: "events" });
    // Waiting for the tape to seat: folded, the title not up yet.
    expect(title.style.opacity).toBe("0");
    rerender(card("people", "Fixture people", 1));
    const device = document.querySelector<HTMLElement>('[data-panel="device"]')!;
    expect(device).toHaveTextContent("Fixture people");
    expect(device.style.opacity).toBe("0");
    expect(document.querySelector<HTMLElement>('[data-panel="liner"]')!.style.transform).toMatch(/rotateY\(-96deg\)/);
  });

  it("only reads the first-insert flag: the desk marks it, after the 3D has read it too", () => {
    __resetVisitForTests();
    const { rerender } = render(card(null));
    rerender(card("events", "Fixture device", 1));
    expect(isFirstInsert()).toBe(true);
  });

  it("a fold cut short by unmounting leaves nothing running", () => {
    const { rerender, unmount } = render(card("events"));
    rerender(card(null));
    const copy = document.querySelector<HTMLElement>('[data-fold-copy] [data-panel="liner"]')!;
    expect(copy).not.toBeNull();
    unmount();
    expect(gsap.getTweensOf(copy)).toHaveLength(0);
  });

  it("while the first insert waits for the tape to seat, the turned-away panels can't be reached", () => {
    __resetVisitForTests();
    const { rerender } = render(card(null));
    rerender(card("events", "Fixture device", 1));
    const flap = document.querySelector<HTMLElement>('[data-panel="flap"]')!;
    const liner = document.querySelector<HTMLElement>('[data-panel="liner"]')!;
    expect(flap).toHaveAttribute("inert");
    expect(liner).toHaveAttribute("inert");
    // The move finished (here at once): they turn to face the reader and can be reached.
    gsap.getTweensOf(flap).forEach((t) => (t.parent ?? t).progress(1));
    expect(flap).not.toHaveAttribute("inert");
    expect(liner).not.toHaveAttribute("inert");
  });

  it("under reduced motion an insert cross-fades and leaves nothing inline on the card", async () => {
    const tiered = (current: TrackId | null) => <MotionTierContext.Provider value="none">{card(current)}</MotionTierContext.Provider>;
    const { rerender } = render(tiered(null));
    rerender(tiered("events"));
    const main = screen.getByRole("main");
    expect(main.style.opacity).toBe("0");
    const inline = () =>
      [main, ...main.querySelectorAll<HTMLElement>("[data-panel], :scope > h2")].filter((el) => el.style.transform || el.style.opacity || el.hasAttribute("inert"));
    await waitFor(() => expect(inline()).toEqual([]), { timeout: 1000 });
  });

  it("wipes the new ink across within 0.4 s", () => {
    // Three in turn: the flap, the centre (title and device) and the liner.
    expect(WIPE.sweep + WIPE.stagger * 2).toBeLessThanOrEqual(0.4);
  });
});
