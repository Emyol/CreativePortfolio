import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { FIXTURES } from "@/lib/content/fixtures";
import { AdminEditor } from "./AdminEditor";

const calls: { url: string; body: unknown }[] = [];
beforeEach(() => {
  calls.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ url, body });
      if (url === "/api/admin/content") return Response.json({ revision: (body?.revision ?? 0) + 1 });
      if (url === "/api/admin/publish") return Response.json({ published: true });
      return new Response("{}", { status: 404 });
    }),
  );
});
afterEach(() => {
  vi.useRealTimers(); // also when a fake-timer test fails partway
  vi.unstubAllGlobals();
});

test("a new event's address fills in from its name", async () => {
  const user = userEvent.setup();
  render(<AdminEditor initialContent={FIXTURES} initialRevision={1} />);
  const events = screen.getByRole("region", { name: "events" });
  await user.click(within(events).getByRole("button", { name: "Add an event" }));
  const name = within(events).getAllByLabelText("Name")[0];
  await user.type(name, "PyCon PH 2026");
  expect(within(events).getAllByLabelText("Address")[0]).toHaveValue("pycon-ph-2026");
});

test("a photo without alt text is flagged on the field and blocks publishing", async () => {
  const user = userEvent.setup();
  render(<AdminEditor initialContent={FIXTURES} initialRevision={1} />);
  const alt = screen.getAllByLabelText("Describe this photo")[0];
  await user.clear(alt);
  expect(alt).toHaveAttribute("aria-invalid", "true");
  expect(screen.getAllByText("every photo needs alt text").length).toBeGreaterThan(0);
  expect(screen.getByRole("button", { name: /^Publish/ })).toBeDisabled();
  expect(screen.getByRole("button", { name: /Fix 1 thing first/ })).toBeInTheDocument();
});

test("edits autosave and the bar says so", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<AdminEditor initialContent={FIXTURES} initialRevision={1} />);
  await user.type(screen.getAllByLabelText("Label")[0], "!");
  await act(async () => vi.advanceTimersByTime(900));
  expect(await screen.findByText("Saved")).toBeInTheDocument();
  expect(calls.find((c) => c.url === "/api/admin/content")?.body).toMatchObject({ revision: 1 });
});

test("publishing asks once, then publishes the saved revision", async () => {
  const user = userEvent.setup();
  render(<AdminEditor initialContent={FIXTURES} initialRevision={5} />);
  await user.click(screen.getByRole("button", { name: /^Publish/ }));
  await user.click(screen.getByRole("button", { name: "Publish to the tape" }));
  expect(await screen.findByText("Published")).toBeInTheDocument();
  expect(calls.find((c) => c.url === "/api/admin/publish")?.body).toEqual({ revision: 5 });
});

test("removing an entry can be undone", async () => {
  const user = userEvent.setup();
  render(<AdminEditor initialContent={FIXTURES} initialRevision={1} />);
  const people = screen.getByRole("region", { name: "people" });
  const before = within(people).getAllByLabelText("Name").length;
  await user.click(within(people).getAllByRole("button", { name: /^Remove/ })[0]);
  expect(within(people).getAllByLabelText("Name")).toHaveLength(before - 1);
  await user.click(within(people).getByRole("button", { name: "Undo" }));
  expect(within(people).getAllByLabelText("Name")).toHaveLength(before);
});

test("nothing is published when the latest change couldn't be saved", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (url === "/api/admin/content") return Response.json({ error: "Couldn't save the draft." }, { status: 500 });
      return Response.json({ published: true });
    }),
  );
  const user = userEvent.setup();
  render(<AdminEditor initialContent={FIXTURES} initialRevision={5} />);
  await user.type(screen.getAllByLabelText("Describe this photo")[0], "!");
  await user.click(screen.getByRole("button", { name: /^Publish/ }));
  await user.click(screen.getByRole("button", { name: "Publish to the tape" }));
  expect(await screen.findByText("Your latest changes aren't saved yet, so nothing was published.")).toBeInTheDocument();
  expect(calls.some((c) => c.url === "/api/admin/publish")).toBe(false);
  expect(screen.getByRole("button", { name: /^Publish/ })).toBeDisabled();
});

test("after publishing, the next edit clears 'Published'", async () => {
  const user = userEvent.setup();
  render(<AdminEditor initialContent={FIXTURES} initialRevision={5} />);
  await user.click(screen.getByRole("button", { name: /^Publish/ }));
  await user.click(screen.getByRole("button", { name: "Publish to the tape" }));
  expect(await screen.findByText("Published")).toBeInTheDocument();
  await user.type(screen.getAllByLabelText("Describe this photo")[0], "!");
  expect(screen.queryByText("Published")).toBeNull();
});

test("the editor offers a backup download and a way to sign out", () => {
  render(<AdminEditor initialContent={FIXTURES} initialRevision={1} />);
  const backup = screen.getByRole("link", { name: "Export backup" });
  expect(backup).toHaveAttribute("href", "/api/admin/export");
  expect(backup).toHaveAttribute("download");
  const signOut = screen.getByRole("button", { name: "Sign out" });
  expect(signOut.closest("form")).toHaveAttribute("action", "/auth/logout");
  expect(signOut.closest("form")).toHaveAttribute("method", "post");
});

test("the publish confirmation takes focus, and Cancel gives it back", async () => {
  const user = userEvent.setup();
  render(<AdminEditor initialContent={FIXTURES} initialRevision={5} />);
  await user.click(screen.getByRole("button", { name: /^Publish/ }));
  expect(screen.getByRole("button", { name: "Publish to the tape" })).toHaveFocus();
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByRole("button", { name: /^Publish$/ })).toHaveFocus();
});
