import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FIXTURES } from "@/lib/content/fixtures";
import { visibleTracks, type TrackId } from "@/lib/tape";
import type { ProjectId } from "./deskScene";
import { PlayerKeys } from "./PlayerKeys";
import { TapeLinks } from "./TapeLinks";
import type { OverlayHandle } from "./overlayPlace";

const tracks = visibleTracks(FIXTURES);
const rect = (x: number, y: number, w: number, h: number) => new DOMRect(x, y, w, h);

describe("TapeLinks", () => {
  it("renders one link per tape with its route, the current one marked", () => {
    render(<TapeLinks tracks={tracks} base="" current="events" project={null} onHover={() => {}} />);
    const links = screen.getAllByRole("link");
    expect(links.map((a) => a.getAttribute("aria-label"))).toEqual([
      "01 about, tape",
      "02 events, tape",
      "03 mixtape, tape",
      "04 people, tape",
      "05 made, tape",
      "06 on rotation, tape",
    ]);
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/about", "/events", "/mixtape", "/people", "/made", "/on-rotation"]);
    expect(screen.getByRole("link", { name: "02 events, tape" })).toHaveAttribute("aria-current", "page");
    expect(links.filter((a) => a.hasAttribute("aria-current"))).toHaveLength(1);
  });

  it("leaves empty tracks off the desk and follows the base", () => {
    render(<TapeLinks tracks={tracks.filter((t) => t.id !== "mixtape")} base="/admin/preview" current={null} project={null} onHover={() => {}} />);
    expect(screen.queryByRole("link", { name: /mixtape/ })).toBeNull();
    expect(screen.getByRole("link", { name: "04 people, tape" })).toHaveAttribute("href", "/admin/preview/people");
  });

  it("moves each link onto its projected tape, at least 44 px, and hides one off the view", () => {
    const ref = createRef<OverlayHandle>();
    const project = (id: ProjectId) => (id === "about" ? rect(100, 200, 120, 30) : id === "events" ? null : rect(0, 0, 80, 60));
    render(<TapeLinks ref={ref} tracks={tracks} base="" current={null} project={project} onHover={() => {}} />);
    ref.current!.place();
    const box = (id: TrackId) => document.querySelector<HTMLElement>(`[data-tape="${id}"]`)!;
    expect(box("about").style.transform).toBe("translate3d(100px, 193px, 0)");
    expect(box("about").style.width).toBe("120px");
    expect(box("about").style.height).toBe("44px");
    expect(box("events")).toHaveAttribute("data-off");
    expect(box("about")).not.toHaveAttribute("data-off");
  });

  it("hides the tapes that aren't in the deck once one is", () => {
    render(<TapeLinks tracks={tracks} base="" current="people" project={null} onHover={() => {}} />);
    const away = [...document.querySelectorAll("[data-tape][data-away]")].map((e) => e.getAttribute("data-tape"));
    expect(away).toEqual(["about", "events", "mixtape", "made", "on-rotation"]);
  });

  it("hovering or focusing a tape link lifts its tape; leaving drops it", () => {
    const onHover = vi.fn();
    render(<TapeLinks tracks={tracks} base="" current={null} project={() => null} onHover={onHover} />);
    const link = screen.getByRole("link", { name: "03 mixtape, tape" });
    fireEvent.focus(link);
    expect(onHover).toHaveBeenLastCalledWith("mixtape");
    fireEvent.blur(link);
    expect(onHover).toHaveBeenLastCalledWith(null);
    fireEvent.pointerEnter(link);
    expect(onHover).toHaveBeenLastCalledWith("mixtape");
  });

  it("hands a plain press to the 3D once placed, but leaves middle and modified clicks to the link", () => {
    const ref = createRef<OverlayHandle>();
    const onPointer = vi.fn();
    render(<TapeLinks ref={ref} tracks={tracks} base="" current={null} project={() => rect(0, 0, 50, 50)} onHover={() => {}} onPointer={onPointer} />);
    const link = screen.getByRole("link", { name: "01 about, tape" });
    fireEvent.pointerDown(link, { button: 0 });
    expect(onPointer).not.toHaveBeenCalled(); // not on the 3D yet: a link is a link
    ref.current!.place();
    fireEvent.pointerDown(link, { button: 1 });
    fireEvent.pointerDown(link, { button: 0, ctrlKey: true });
    expect(onPointer).not.toHaveBeenCalled();
    fireEvent.pointerDown(link, { button: 0 });
    expect(onPointer).toHaveBeenCalledTimes(1);
    expect(onPointer.mock.calls[0][0].type).toBe("pointerdown");
    // The 3D loads the tape on a pointer click; Enter (a click with no detail) still navigates.
    // (Seen last, on window; then stopped, as jsdom can't navigate.)
    const prevented: boolean[] = [];
    const seen = (e: Event) => {
      prevented.push(e.defaultPrevented);
      e.preventDefault();
    };
    window.addEventListener("click", seen);
    fireEvent.click(link, { button: 0, detail: 1 });
    fireEvent.click(link, { button: 0, detail: 0 });
    window.removeEventListener("click", seen);
    expect(prevented).toEqual([true, false]);
  });

  it("offers an inspect button on each tape while the 3D is there and no tape is in", () => {
    const onInspect = vi.fn();
    const { rerender } = render(<TapeLinks tracks={tracks} base="" current={null} project={() => null} onHover={() => {}} onInspect={onInspect} />);
    fireEvent.click(screen.getByRole("button", { name: "inspect 05 made" }));
    expect(onInspect).toHaveBeenCalledWith("made");
    rerender(<TapeLinks tracks={tracks} base="" current="made" project={() => null} onHover={() => {}} onInspect={onInspect} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    rerender(<TapeLinks tracks={tracks} base="" current={null} project={null} onHover={() => {}} onInspect={onInspect} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("draws sprite tapes only without the 3D", () => {
    const { rerender } = render(<TapeLinks tracks={tracks} base="" current={null} project={() => null} onHover={() => {}} />);
    expect(document.querySelectorAll("[data-tape] img")).toHaveLength(0);
    rerender(<TapeLinks tracks={tracks} base="" current={null} project={null} onHover={() => {}} />);
    expect(document.querySelectorAll("[data-tape] [data-cassette]")).toHaveLength(6);
  });
});

describe("PlayerKeys", () => {
  it("draws a link for each key the model has, the playing one latched", () => {
    render(<PlayerKeys tracks={tracks} base="" current="mixtape" project={null} />);
    const links = screen.getAllByRole("link");
    expect(links.map((a) => a.getAttribute("aria-label"))).toEqual(["01 about, key", "02 events, key", "03 mixtape, key", "04 people, key"]);
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/about", "/events", "/mixtape", "/people"]);
    expect(screen.getByRole("link", { name: "03 mixtape, key" })).toHaveAttribute("aria-current", "page");
  });

  it("an empty track's key is a blank, hidden span", () => {
    render(<PlayerKeys tracks={tracks.filter((t) => t.id !== "events")} base="" current={null} project={null} />);
    expect(screen.queryByRole("link", { name: /events/ })).toBeNull();
    const blank = document.querySelector("[data-blank-key]")!;
    expect(blank.tagName).toBe("SPAN");
    expect(blank).toHaveAttribute("aria-hidden", "true");
  });

  it("moves each key onto its projected key face", () => {
    const ref = createRef<OverlayHandle>();
    render(<PlayerKeys ref={ref} tracks={tracks} base="" current={null} project={(id) => (id === "key2" ? rect(300, 400, 50, 46) : null)} />);
    ref.current!.place();
    const key = document.querySelector<HTMLElement>('[data-key="2"]')!;
    expect(key.style.transform).toBe("translate3d(300px, 400px, 0)");
    expect(key.style.width).toBe("50px");
    expect(document.querySelector('[data-key="0"]')).toHaveAttribute("data-off");
  });
});
