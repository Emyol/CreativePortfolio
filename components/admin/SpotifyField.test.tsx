import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { FIXTURES } from "@/lib/content/fixtures";
import { AdminEditor } from "./AdminEditor";

const LINK = "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=abc";
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      String(url).startsWith("/api/admin/spotify") ? Response.json({ title: "lowkey", artist: "NIKI" }) : Response.json({ revision: 2 }),
    ),
  );
});
afterEach(() => vi.unstubAllGlobals());

test("pasting a song link fills in its title and artist", async () => {
  const user = userEvent.setup();
  render(<AdminEditor initialContent={{ ...FIXTURES, music: [] }} initialRevision={1} />);
  const mixtape = screen.getByRole("region", { name: "mixtape" });
  await user.click(within(mixtape).getByRole("button", { name: "Add a song" }));
  await user.click(within(mixtape).getByLabelText("Spotify link"));
  await user.paste(LINK);
  expect(await within(mixtape).findByDisplayValue("lowkey")).toBeInTheDocument();
  expect(within(mixtape).getByLabelText("Artist")).toHaveValue("NIKI");
  expect(within(mixtape).getByText("Filled in from Spotify. Check it.")).toBeInTheDocument();
});

test("a title already typed is never replaced", async () => {
  const user = userEvent.setup();
  const music = [{ title: "My own title", artist: "", spotify: "" }];
  render(<AdminEditor initialContent={{ ...FIXTURES, music } as never} initialRevision={1} />);
  const mixtape = screen.getByRole("region", { name: "mixtape" });
  await user.click(within(mixtape).getByText("My own title"));
  await user.click(within(mixtape).getByLabelText("Spotify link"));
  await user.paste(LINK);
  expect(await within(mixtape).findByDisplayValue("NIKI")).toBeInTheDocument();
  expect(within(mixtape).getByLabelText("Title")).toHaveValue("My own title");
});
