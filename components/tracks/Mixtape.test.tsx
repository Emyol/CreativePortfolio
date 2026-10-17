import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { FIXTURES } from "@/lib/content/fixtures";
import { getPlayback, resetPlayback } from "@/lib/playback";
import type { EmbedController, PlaybackUpdate } from "@/lib/spotify";

type Listener = (e: { data: PlaybackUpdate }) => void;
const fake = vi.hoisted(() => ({
  created: 0,
  calls: [] as string[],
  listeners: {} as Record<string, Listener[]>,
  fail: false,
}));

vi.mock("@/lib/spotify", async (orig) => {
  const real = await orig<typeof import("@/lib/spotify")>();
  return {
    ...real,
    loadSpotifyApi: vi.fn(async () => {
      if (fake.fail) throw new Error("Spotify didn't load: blocked");
      return {
        createController: (_el: HTMLElement, opts: { uri: string }, cb: (c: EmbedController) => void) => {
          fake.created++;
          fake.calls.push(`create ${opts.uri}`);
          cb({
            loadEntity: (u: string) => fake.calls.push(`load ${u}`),
            loadUri: (u: string) => fake.calls.push(`loadUri ${u}`),
            play: () => fake.calls.push("play"),
            pause: () => fake.calls.push("pause"),
            resume: () => fake.calls.push("resume"),
            togglePlay: () => fake.calls.push("toggle"),
            destroy: () => fake.calls.push("destroy"),
            addListener: (ev: string, l: Listener) => (fake.listeners[ev] ??= []).push(l),
          });
        },
      };
    }),
  };
});

import { loadSpotifyApi, spotifyUri } from "@/lib/spotify";
import { Mixtape } from "./Mixtape";

const songs = FIXTURES.music;
const emit = (data: Partial<PlaybackUpdate>) =>
  act(() => fake.listeners.playback_update?.forEach((l) => l({ data: { playingURI: "", isPaused: false, isBuffering: false, duration: 30000, position: 0, ...data } })));

beforeEach(() => {
  fake.created = 0;
  fake.calls = [];
  fake.listeners = {};
  fake.fail = false;
  vi.mocked(loadSpotifyApi).mockClear();
});
afterEach(() => resetPlayback());

test("nothing from Spotify loads before the first press", () => {
  render(<Mixtape songs={songs} />);
  expect(loadSpotifyApi).not.toHaveBeenCalled();
  expect(document.querySelector("[data-deck] iframe")).toBeNull();
});

test("every row has a plain Spotify link and a labelled play button", () => {
  render(<Mixtape songs={songs} />);
  expect(screen.getByRole("button", { name: "Play Fixture song 1 on Spotify" })).toBeInTheDocument();
  const links = screen.getAllByRole("link", { name: /^Open in Spotify: / });
  expect(links.map((a) => a.getAttribute("href"))).toEqual(songs.map((s) => s.spotify));
});

test("first press creates one controller, later presses reuse it", async () => {
  const user = userEvent.setup();
  render(<Mixtape songs={songs} />);
  await user.click(screen.getByRole("button", { name: "Play Fixture song 1 on Spotify" }));
  await user.click(screen.getByRole("button", { name: "Play Fixture song 2 on Spotify" }));
  expect(fake.created).toBe(1);
  expect(fake.calls).toContain(`create ${spotifyUri(songs[0].spotify)}`);
  expect(fake.calls).toContain(`load ${spotifyUri(songs[1].spotify)}`);
  expect(fake.calls.filter((c) => c === "play").length).toBeGreaterThanOrEqual(2);
  expect(getPlayback().song).toBe(1);
});

test("playback updates drive the store and the announcement", async () => {
  const user = userEvent.setup();
  render(<Mixtape songs={songs} />);
  await user.click(screen.getByRole("button", { name: "Play Fixture song 1 on Spotify" }));
  emit({ isPaused: false, position: 1000, duration: 30000 });
  expect(getPlayback()).toMatchObject({ status: "playing", song: 0, position: 1000, duration: 30000 });
  expect(screen.getByRole("status")).toHaveTextContent("Now playing: Fixture song 1 by Fixture artist");
  emit({ isBuffering: true });
  expect(getPlayback().status).toBe("paused"); // buffering stops the reels too
});

test("pressing the playing song pauses it", async () => {
  const user = userEvent.setup();
  render(<Mixtape songs={songs} />);
  await user.click(screen.getByRole("button", { name: "Play Fixture song 1 on Spotify" }));
  emit({ isPaused: false });
  await user.click(screen.getByRole("button", { name: "Pause Fixture song 1" }));
  expect(fake.calls.at(-1)).toBe("toggle");
});

test("a blocked script falls back to the plain link", async () => {
  fake.fail = true;
  const user = userEvent.setup();
  render(<Mixtape songs={songs} />);
  await user.click(screen.getByRole("button", { name: "Play Fixture song 1 on Spotify" }));
  expect(getPlayback().status).toBe("error");
  expect(screen.getByText(/Spotify didn't load/)).toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: /^Open in Spotify: / })).toHaveLength(songs.length);
});

test("if playback doesn't start, the deck asks for a press in the player", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<Mixtape songs={songs} />);
  await user.click(screen.getByRole("button", { name: "Play Fixture song 1 on Spotify" }));
  await act(async () => vi.advanceTimersByTime(3100));
  expect(screen.getByText("Press play in the Spotify player.")).toBeInTheDocument();
  vi.useRealTimers();
});

test("unmount destroys the controller and resets playback", async () => {
  const user = userEvent.setup();
  const { unmount } = render(<Mixtape songs={songs} />);
  await user.click(screen.getByRole("button", { name: "Play Fixture song 1 on Spotify" }));
  emit({ isPaused: false });
  unmount();
  expect(fake.calls).toContain("destroy");
  expect(getPlayback().status).toBe("idle");
});
