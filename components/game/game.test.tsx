import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test } from "vitest";
import { __resetSoundForTests } from "@/lib/sound";
import { SoundToggle } from "./SoundToggle";

beforeEach(() => {
  localStorage.clear();
  __resetSoundForTests();
});

test("the sound toggle is a pressed/unpressed button named Sound, off at first", async () => {
  const user = userEvent.setup();
  render(<SoundToggle />);
  const button = screen.getByRole("button", { name: "Sound" });
  expect(button).toHaveAttribute("aria-pressed", "false");
  await user.click(button);
  expect(button).toHaveAttribute("aria-pressed", "true");
  expect(localStorage.getItem("side-a:sound")).toBe("on");
});
