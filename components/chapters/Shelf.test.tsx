import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { FIXTURES } from "@/lib/content/fixtures";
import { MotionTierContext } from "@/lib/motion/MotionProvider";
import { Shelf } from "./Shelf";

const renderShelf = () => render(<MotionTierContext.Provider value="none"><Shelf items={FIXTURES.shelf} /></MotionTierContext.Provider>);

test("spines are buttons that control the dialogue", () => {
  renderShelf();
  const spine = screen.getByRole("button", { name: /Fixture manga/ });
  expect(spine).toHaveAttribute("aria-controls", "shelf-dialogue");
  expect(spine).toHaveAttribute("aria-expanded", "false");
});

test("pulling a spine opens the dialogue on its first page and focuses Next", async () => {
  const user = userEvent.setup();
  renderShelf();
  await user.click(screen.getByRole("button", { name: /Fixture manga/ }));
  expect(screen.getByRole("button", { name: /Fixture manga/ })).toHaveAttribute("aria-expanded", "true");
  expect(screen.getAllByText("Fixture page one.")[0]).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Next/ })).toHaveFocus();
});

test("Enter advances through pages, then closes and returns focus to the spine", async () => {
  const user = userEvent.setup();
  renderShelf();
  await user.click(screen.getByRole("button", { name: /Fixture manga/ }));
  await user.keyboard("{Enter}");
  expect(screen.getAllByText("Fixture page two.")[0]).toBeInTheDocument();
  await user.keyboard(" ");
  expect(screen.getByRole("button", { name: /Close/ })).toBeInTheDocument();
  await user.keyboard("{Enter}");
  expect(screen.queryByRole("button", { name: /Close/ })).toBeNull();
  expect(screen.getByRole("button", { name: /Fixture manga/ })).toHaveFocus();
});

test("Escape closes and returns focus to the spine", async () => {
  const user = userEvent.setup();
  renderShelf();
  await user.click(screen.getByRole("button", { name: /Fixture anime/ }));
  await user.keyboard("{Escape}");
  expect(screen.getByRole("button", { name: /Fixture anime/ })).toHaveFocus();
  expect(screen.getByRole("button", { name: /Fixture anime/ })).toHaveAttribute("aria-expanded", "false");
});

test("the full page text is announced politely, not letter by letter", async () => {
  const user = userEvent.setup();
  const { container } = renderShelf();
  await user.click(screen.getByRole("button", { name: /Fixture game/ }));
  await act(async () => {});
  expect(container.querySelector("[aria-live='polite']")).toHaveTextContent("Fixture game with a long title. Fixture single page.");
});
