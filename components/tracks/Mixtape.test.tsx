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
  /** When set, the API resolves only when the test calls release(). */
  gate: null as Promise<void> | null,
  /** When true, createController never calls back (an embed that never answers). */
  hold: false,
  held: [] as (() => void)[],
}));

vi.mock("@/lib/spotify", async (orig) => {
  const real = await orig<typeof import("@/lib/spotify")>();
  return {
    ...real,
    loadSpotifyApi: vi.fn(async () => {
      if (fake.gate) await fake.gate;
      if (fake.fail) throw new Error("Spotify didn't load: blocked");
      return {
        createController: (_el: HTMLElement, opts: { uri: string }, cb: (c: EmbedController) => void) => {
          fake.created++;
          fake.calls.push(`create ${opts.uri}`);
          const answer = () => cb({
            loadEntity: (u: string) => fake.calls.push(`load ${u}`),
            loadUri: (u: string) => fake.calls.push(`loadUri ${u}`),
            play: () => fake.calls.push("play"),
            pause: () => fake.calls.push("pause"),
            resume: () => fake.calls.push("resume"),
            togglePlay: () => fake.calls.push("toggle"),
            destroy: () => fake.calls.push("destroy"),
            addListener: (ev: string, l: Listener) => (fake.listeners[ev] ??= []).push(l),
          });
          if (fake.hold) fake.held.push(answer);
          else answer();
        },
      };
    }),
  };
});

import { loadSpotifyApi, spotifyUri } from "@/lib/spotify";
import { Mixtape } from "./Mixtape";

const songs = FIXTURES.music;
const emit = (data: Partial<PlaybackUpdate>) =>
  act(() => fake.listeners.playback_update?.forEach((l) => l({ data: { playingURI: uriOf(0), isPaused: false, isBuffering: false, duration: 30000, position: 0, ...data } })));

beforeEach(() => {
  fake.created = 0;
  fake.calls = [];
  fake.listeners = {};
  fake.fail = false;
  fake.gate = null;
  fake.hold = false;
  fake.held = [];
  vi.mocked(loadSpotifyApi).mockClear();
});
afterEach(() => {
  vi.useRealTimers();
  resetPlayback();
});

const uriOf = (i: number) => spotifyUri(songs[i].spotify);

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
  expect(getPlayback().status).toBe("loading"); // buffering stops the reels too (not "playing")
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

test("pressing twice while Spotify loads makes one player, playing the latest choice", async () => {
  let release!: () => void;
  fake.gate = new Promise((r) => (release = r));
  const user = userEvent.setup();
  render(<Mixtape songs={songs} />);
  await user.click(screen.getByRole("button", { name: "Play Fixture song 1 on Spotify" }));
  await user.click(screen.getByRole("button", { name: "Play Fixture song 2 on Spotify" }));
  await act(async () => release());
  expect(fake.created).toBe(1);
  expect(document.querySelectorAll("[data-embed] > *")).toHaveLength(1);
  expect(fake.calls).toContain(`load ${uriOf(1)}`);
  expect(getPlayback().song).toBe(1);
});

test("leaving before the player answers destroys it when it does, and nothing plays", async () => {
  fake.hold = true;
  const user = userEvent.setup();
  const { unmount } = render(<Mixtape songs={songs} />);
  await user.click(screen.getByRole("button", { name: "Play Fixture song 1 on Spotify" }));
  unmount();
  act(() => fake.held.forEach((answer) => answer()));
  expect(fake.calls).toContain("destroy");
  expect(fake.calls).not.toContain("play");
  expect(getPlayback().status).toBe("idle");
});

test("updates still arriving from the previous song are ignored after a switch", async () => {
  const user = userEvent.setup();
  render(<Mixtape songs={songs} />);
  await user.click(screen.getByRole("button", { name: "Play Fixture song 1 on Spotify" }));
  emit({ isPaused: false, position: 5000 });
  await user.click(screen.getByRole("button", { name: "Play Fixture song 2 on Spotify" }));
  emit({ playingURI: uriOf(0), isPaused: false, position: 6000 });
  expect(getPlayback()).toMatchObject({ status: "loading", song: 1 });
  emit({ playingURI: uriOf(1), isPaused: false, position: 0 });
  expect(getPlayback()).toMatchObject({ status: "playing", song: 1 });
});

test("buffering while a song starts keeps the deck loading, so a second press doesn't pause it", async () => {
  const user = userEvent.setup();
  render(<Mixtape songs={songs} />);
  await user.click(screen.getByRole("button", { name: "Play Fixture song 1 on Spotify" }));
  emit({ isPaused: false, isBuffering: true });
  expect(getPlayback().status).toBe("loading");
});

test("a player that never answers falls back to the plain links", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  fake.hold = true;
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<Mixtape songs={songs} />);
  await user.click(screen.getByRole("button", { name: "Play Fixture song 1 on Spotify" }));
  await act(async () => vi.advanceTimersByTime(10_000));
  expect(getPlayback().status).toBe("error");
  expect(screen.getByRole("alert")).toHaveTextContent("Spotify didn't load");
  expect(screen.queryByText("Press play in the Spotify player.")).toBeNull();
});

test("the press-play hint is announced, and only once a player exists", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<Mixtape songs={songs} />);
  await user.click(screen.getByRole("button", { name: "Play Fixture song 1 on Spotify" }));
  await act(async () => vi.advanceTimersByTime(3100));
  expect(screen.getByRole("status")).toHaveTextContent("Press play in the Spotify player.");
});
