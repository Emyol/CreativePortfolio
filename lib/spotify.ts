// Spotify's iFrame API: the only way songs play on this site. Nothing from Spotify loads
// until a visitor presses play (privacy: no script, iframe or cookie before that).
export const SPOTIFY_IFRAME_API = "https://open.spotify.com/embed/iframe-api/v1";

export function spotifyUri(url: string): string {
  const id = url.match(/open\.spotify\.com\/track\/([A-Za-z0-9]{22})/)?.[1];
  if (!id) throw new Error(`Not a Spotify track link: ${url}`);
  return `spotify:track:${id}`;
}

/** Position and duration are in milliseconds. */
export type PlaybackUpdate = { playingURI: string; isPaused: boolean; isBuffering: boolean; duration: number; position: number };

export type EmbedController = {
  /** Current API; `loadUri` is its legacy name. */
  loadEntity?: (uriOrUrl: string) => void;
  loadUri: (uri: string) => void;
  play: () => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  destroy: () => void;
  addListener: (event: "ready" | "playback_update" | "playback_started", cb: (e: { data: PlaybackUpdate }) => void) => void;
};

export type SpotifyIFrameAPI = {
  createController: (el: HTMLElement, opts: { uri: string; width?: string | number; height?: number }, cb: (c: EmbedController) => void) => void;
};

type ReadyWindow = Window & { onSpotifyIframeApiReady?: (api: SpotifyIFrameAPI) => void };

let pending: Promise<SpotifyIFrameAPI> | null = null;
// Whatever Spotify hands over is kept, even if it arrives after a timeout gave up on it.
let loaded: SpotifyIFrameAPI | null = null;

/**
 * Loads the iFrame API once. Rejects when the script errors (blocked, offline) or never
 * answers within `timeoutMs`; a rejection clears the cache so a later press can retry.
 */
export function loadSpotifyApi(timeoutMs = 8000): Promise<SpotifyIFrameAPI> {
  if (loaded) return Promise.resolve(loaded);
  if (pending) return pending;
  pending = new Promise<SpotifyIFrameAPI>((resolve, reject) => {
    const w = window as ReadyWindow;
    const fail = (why: string) => {
      window.clearTimeout(timer);
      pending = null;
      reject(new Error(`Spotify didn't load: ${why}`));
    };
    const timer = window.setTimeout(() => fail("timed out"), timeoutMs);
    w.onSpotifyIframeApiReady = (api) => {
      window.clearTimeout(timer);
      loaded = api;
      resolve(api);
    };
    const script = document.createElement("script");
    script.src = SPOTIFY_IFRAME_API;
    script.async = true;
    script.addEventListener("error", () => {
      script.remove();
      fail("the script was blocked or offline");
    });
    document.head.append(script);
  });
  return pending;
}

export function __resetSpotifyForTests(): void {
  pending = null;
  loaded = null;
  delete (window as ReadyWindow).onSpotifyIframeApiReady;
}
