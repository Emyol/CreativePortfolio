export type SaveStatus = "saved" | "pending" | "saving" | "offline" | "conflict" | "signed-out" | "error";

type Options = {
  /** Resolves with the new revision; rejects with { status, message } or a network error. */
  save: (content: unknown, revision: number) => Promise<number>;
  revision: number;
  delay?: number;
};

const BACKOFF = [2000, 4000, 8000, 16000, 30000];

/**
 * Saves the draft a moment after typing stops. One save at a time; a change made during
 * a save goes out next, against the new revision. Offline it retries with backoff; a
 * conflict (another tab or device saved first) stops it until the page is reloaded.
 */
export function createAutosave({ save, revision: initial, delay = 800 }: Options) {
  let revision = initial;
  let status: SaveStatus = "saved";
  let message: string | undefined;
  let latest: unknown;
  let dirty = false;
  let inFlight: Promise<void> | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let attempt = 0;
  const listeners = new Set<() => void>();

  const set = (next: SaveStatus) => {
    status = next;
    listeners.forEach((l) => l());
  };

  const schedule = (ms: number) => {
    clearTimeout(timer);
    timer = setTimeout(() => void run(), ms);
  };

  async function run(): Promise<void> {
    if (status === "conflict" || !dirty) return;
    if (inFlight) return inFlight;
    dirty = false;
    const content = latest;
    set("saving");
    inFlight = (async () => {
      try {
        revision = await save(content, revision);
        attempt = 0;
        if (dirty) {
          set("pending");
          schedule(delay);
        } else set("saved");
      } catch (e) {
        dirty = true;
        const code = (e as { status?: number })?.status;
        message = (e as { message?: string })?.message;
        if (code === 409) set("conflict");
        else if (code === 401) set("signed-out");
        else if (code === undefined || code === 502 || code === 503 || code === 504) {
          // No answer, or the server says it's briefly unavailable: wait and try again.
          set("offline");
          schedule(BACKOFF[Math.min(attempt++, BACKOFF.length - 1)]);
        } else set("error"); // a real refusal: retrying won't help, so say why
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  }

  return {
    change(content: unknown) {
      if (status === "conflict") return;
      if (status === "error" || status === "signed-out") status = "pending"; // the next edit tries again
      latest = content;
      dirty = true;
      if (status !== "saving" && status !== "offline") set("pending");
      if (status !== "offline") schedule(delay);
    },
    async flush() {
      clearTimeout(timer);
      if (inFlight) await inFlight;
      await run();
    },
    status: () => status,
    /** The server's reason for the last failed save, if it gave one. */
    message: () => message,
    revision: () => revision,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export type Autosave = ReturnType<typeof createAutosave>;
