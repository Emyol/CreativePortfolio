import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { FIXTURES } from "@/lib/content/fixtures";
import { __resetNightForTests } from "@/lib/desk/night";
import { __resetKeysForTests } from "@/lib/keys";
import { __resetSoundForTests } from "@/lib/sound";
import { visibleTracks } from "@/lib/tape";
import { LampCord } from "./LampCord";
import { Transport } from "./Transport";

const tracks = visibleTracks(FIXTURES);

beforeEach(() => {
  localStorage.clear();
  __resetNightForTests();
  __resetKeysForTests();
  __resetSoundForTests();
});

describe("Transport", () => {
  it("names both neighbours and ejects to the desk", () => {
    render(<Transport tracks={tracks} base="" current="mixtape" />);
    const nav = screen.getByRole("navigation", { name: "Transport" });
    const prev = within(nav).getByRole("link", { name: /02 events/ });
    const next = within(nav).getByRole("link", { name: /04 people/ });
    expect(prev).toHaveAttribute("href", "/events");
    expect(prev).toHaveTextContent("02 events");
    expect(next).toHaveAttribute("href", "/people");
    expect(within(nav).getByRole("link", { name: "eject" })).toHaveAttribute("href", "/");
  });

  it("skips an empty track: without mixtape, ▶▶ from events is 04 people (Review Focus 5)", () => {
    render(<Transport tracks={tracks.filter((t) => t.id !== "mixtape")} base="" current="events" />);
    const nav = screen.getByRole("navigation", { name: "Transport" });
    const next = within(nav).getByRole("link", { name: /next track/ });
    expect(next).toHaveAttribute("href", "/people");
    expect(next).toHaveTextContent("04 people");
    expect(within(nav).queryByText(/mixtape/)).toBeNull();
  });

  it("keeps the base on the admin preview", () => {
    render(<Transport tracks={tracks} base="/admin/preview" current="about" />);
    expect(screen.getByRole("link", { name: /next track/ })).toHaveAttribute("href", "/admin/preview/events");
    expect(screen.getByRole("link", { name: /previous track/ })).toHaveAttribute("href", "/admin/preview/on-rotation");
    expect(screen.getByRole("link", { name: "eject" })).toHaveAttribute("href", "/admin/preview");
  });

  it("carries the sound, night and track-key toggles, sound off by default", () => {
    render(<Transport tracks={tracks} base="" current="about" />);
    expect(screen.getByRole("button", { name: "Sound" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Night" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Track keys" })).toHaveAttribute("aria-pressed", "true");
  });

  it("renders nothing with no tape in", () => {
    const { container } = render(<Transport tracks={tracks} base="" current={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("LampCord", () => {
  it("toggles night, and the transport's night toggle agrees with it", () => {
    render(
      <>
        <LampCord />
        <Transport tracks={tracks} base="" current="about" />
      </>,
    );
    const cord = screen.getByRole("button", { name: "Night lamp" });
    const toggle = screen.getByRole("button", { name: "Night" });
    expect(cord).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(cord);
    expect(cord).toHaveAttribute("aria-pressed", "true");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(toggle);
    expect(cord).toHaveAttribute("aria-pressed", "false");
    expect(localStorage.getItem("side-a:night")).toBe("off");
  });
});
