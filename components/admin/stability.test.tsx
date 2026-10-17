import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { FIXTURES } from "@/lib/content/fixtures";
import { AdminEditor } from "./AdminEditor";

const uploads = vi.hoisted(() => ({ release: [] as ((url: string) => void)[] }));
vi.mock("@/lib/admin/photo", async (orig) => ({
  ...(await orig<typeof import("@/lib/admin/photo")>()),
  prepareImage: vi.fn(async () => ({ blob: new Blob(["x"], { type: "image/webp" }), width: 2400, height: 1600 })),
  uploadPhoto: vi.fn(() => new Promise<string>((resolve) => uploads.release.push(resolve))),
}));

const saved: unknown[] = [];
beforeEach(() => {
  saved.length = 0;
  uploads.release = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/admin/content") {
        const body = JSON.parse(String(init?.body));
        saved.push(body.content);
        return Response.json({ revision: body.revision + 1 });
      }
      return Response.json({});
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const entry = (region: HTMLElement, label: string) =>
  within(region).getAllByRole("listitem").find((li) => li.querySelector("summary")?.textContent?.startsWith(label))!;

test("a photo that finishes uploading after a new event was added lands on its own event", async () => {
  const user = userEvent.setup();
  render(<AdminEditor initialContent={FIXTURES} initialRevision={1} />);
  const events = screen.getByRole("region", { name: "events" });
  const first = entry(events, "Fixture event 1");
  await user.click(within(first).getByText("Fixture event 1"));
  const before = within(first).getAllByLabelText("Describe this photo").length;
  await user.upload(within(first).getByLabelText("Add photos"), new File(["a"], "a.jpg", { type: "image/jpeg" }));
  await user.click(within(events).getByRole("button", { name: "Add an event" }));
  await act(async () => uploads.release[0]("/api/media/0b0e5c3c-1f2a-4b3c-9d8e-000000000001.webp"));
  await waitFor(() => expect(within(entry(events, "Fixture event 1")).getAllByLabelText("Describe this photo")).toHaveLength(before + 1));
  expect(within(entry(events, "New event")).queryAllByLabelText("Describe this photo")).toHaveLength(0);
});

test("removing an entry moves focus to Undo, so a second Enter can't remove the next one", async () => {
  const user = userEvent.setup();
  render(<AdminEditor initialContent={FIXTURES} initialRevision={1} />);
  const people = screen.getByRole("region", { name: "people" });
  const count = within(people).getAllByRole("listitem").length;
  await user.click(within(entry(people, "Fixture person A")).getByText("Fixture person A"));
  within(people).getByRole("button", { name: "Remove Fixture person A" }).focus();
  await user.keyboard("{Enter}");
  expect(within(people).getByRole("button", { name: "Undo" })).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(within(people).getAllByRole("listitem")).toHaveLength(count);
});

test("moving an entry keeps focus on the moved entry's control", async () => {
  const user = userEvent.setup();
  render(<AdminEditor initialContent={FIXTURES} initialRevision={1} />);
  const people = screen.getByRole("region", { name: "people" });
  await user.click(within(entry(people, "Fixture person A")).getByText("Fixture person A"));
  await user.click(within(people).getByRole("button", { name: "Move Fixture person A down" }));
  await waitFor(() => expect(document.activeElement).toHaveAccessibleName("Move Fixture person A down"));
  expect(within(people).getAllByRole("listitem")[1].querySelector("summary")).toHaveTextContent("Fixture person A");
});

test("entry identities never reach the saved draft", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<AdminEditor initialContent={FIXTURES} initialRevision={1} />);
  const links = screen.getByRole("region", { name: "links" });
  await user.click(within(entry(links, "GitHub")).getByText("GitHub"));
  await user.type(within(links).getAllByLabelText("Label")[0], "!");
  await act(async () => vi.advanceTimersByTime(900));
  await waitFor(() => expect(saved.length).toBeGreaterThan(0));
  expect(JSON.stringify(saved.at(-1))).not.toMatch(/_key/);
});
