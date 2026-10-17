import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, test, vi } from "vitest";
import { issuesByPath } from "@/lib/admin/issues";
import { FIXTURES } from "@/lib/content/fixtures";
import { EditorContext, fieldId, getIn, pathKey, setIn, type Editor } from "./editorContext";
import { PhotoList } from "./PhotoList";

vi.mock("@/lib/admin/photo", async (orig) => ({
  ...(await orig<typeof import("@/lib/admin/photo")>()),
  prepareImage: vi.fn(async (file: File) => ({ blob: new Blob([file.name], { type: "image/webp" }), width: 2400, height: 1600 })),
  uploadPhoto: vi.fn(async (blob: Blob, onProgress: (f: number) => void) => {
    onProgress(1);
    return `/api/media/${(await blob.text()).padEnd(36, "0").slice(0, 36)}.webp`;
  }),
}));

function Harness() {
  const [content, setContent] = useState({ ...FIXTURES, events: [{ ...FIXTURES.events[0], photos: [] }] });
  const issues = issuesByPath(content);
  const editor: Editor = {
    get: (p) => getIn(content, p),
    set: (p, v) => setContent((c) => setIn(c, p, v)),
    update: (p, fn) => setContent((c) => setIn(c, p, fn(getIn(c, p)))),
    issue: (p) => issues.get(pathKey(p)),
    issuesUnder: () => 0,
    newKey: () => "k",
  };
  return (
    <EditorContext.Provider value={editor}>
      <PhotoList path={["events", 0, "photos"]} label="Photos" />
    </EditorContext.Provider>
  );
}

test("picking two photos adds both, in order, sized, the first as the cover", async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.upload(screen.getByLabelText("Add photos"), [new File(["a"], "a.jpg", { type: "image/jpeg" }), new File(["b"], "b.jpg", { type: "image/jpeg" })]);
  await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(2));
  const [first, second] = screen.getAllByRole("listitem");
  expect(within(first).getByText("Cover")).toBeInTheDocument();
  expect(within(second).queryByText("Cover")).toBeNull();
  expect(first.querySelector("img")).toHaveAttribute("width", "2400");
  await user.click(within(second).getByRole("button", { name: "Move earlier" }));
  expect(screen.getAllByRole("listitem")[0].querySelector("img")).toHaveAttribute("src", expect.stringMatching(/^\/api\/media\/b/));
});

test("a new photo asks for its description", async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.upload(screen.getByLabelText("Add photos"), new File(["a"], "a.jpg", { type: "image/jpeg" }));
  await waitFor(() => expect(screen.getByText("every photo needs alt text")).toBeInTheDocument());
});

test("removing a photo takes it off the list", async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.upload(screen.getByLabelText("Add photos"), new File(["a"], "a.jpg", { type: "image/jpeg" }));
  await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(1));
  await user.click(screen.getByRole("button", { name: "Remove photo 1" }));
  expect(screen.queryAllByRole("listitem")).toHaveLength(0);
});

test("the photo field is a named group that Fix can focus, and the picker reads its problem", () => {
  render(<Harness />);
  const group = screen.getByRole("group", { name: "Photos" });
  expect(group).toHaveAttribute("id", fieldId(["events", 0, "photos"]));
  expect(group).toHaveAttribute("tabindex", "-1");
  const problem = screen.getByText("an event needs at least one photo");
  expect(screen.getByLabelText("Add photos").getAttribute("aria-describedby")).toContain(problem.id);
});
