import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ path: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.path }));

const { default: TapeError } = await import("./error");

describe("the tape's error boundary", () => {
  afterEach(() => vi.restoreAllMocks());

  it("on a track, says so on the J-card's device panel and retries", () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    nav.path = "/people";
    const retry = vi.fn();
    const { container } = render(<TapeError error={new Error("boom")} retry={retry} />);
    expect(container.querySelector('[data-panel="device"] [role="alert"]')).toHaveTextContent("This track didn’t play.");
    expect(container.querySelector("main")).toBeNull(); // the J-card is the main
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Back to the desk" })).toHaveAttribute("href", "/");
    expect(console.info).toHaveBeenCalledWith(expect.stringContaining("failed"), expect.any(Error));
  });

  it("on the desk, is its own main with the desk's one h1", () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    nav.path = "/";
    render(<TapeError error={new Error("boom")} retry={() => {}} />);
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "jcard");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Miel");
  });
});
