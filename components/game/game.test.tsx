import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test } from "vitest";
import { KONAMI } from "@/lib/konami";
import { MotionTierContext } from "@/lib/motion/MotionProvider";
import { __resetSoundForTests } from "@/lib/sound";
import { Konami } from "./Konami";
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
  expect(localStorage.getItem("kakejiku:sound")).toBe("on");
});

test("the Konami code shows a polite toast", () => {
  render(<MotionTierContext.Provider value="none"><Konami /></MotionTierContext.Provider>);
  const status = screen.getByRole("status");
  expect(status).toBeEmptyDOMElement();
  act(() => {
    for (const key of KONAMI) fireEvent.keyDown(window, { key });
  });
  expect(status).toHaveTextContent("A crane passes by.");
});
