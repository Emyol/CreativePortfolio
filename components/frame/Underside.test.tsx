import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import seed from "@/lib/content/seed.json";
import { Underside } from "./Underside";

const links = seed.links;

test("the back of the device lists the owner's links", () => {
  render(<Underside toolbox={[]} links={links} />);
  expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute("href", "https://github.com/Emyol");
  expect(screen.getByRole("link", { name: "Professional site" })).toHaveAttribute("href", "https://project-miel.vercel.app");
});

test("the toolbox is the spec printed on the sticker", () => {
  render(<Underside toolbox={["TypeScript", "Python"]} links={links} />);
  const spec = screen.getByRole("list", { name: "spec" });
  expect(within(spec).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["TypeScript", "Python"]);
});

test("an empty toolbox hides the spec but keeps the links", () => {
  render(<Underside toolbox={[]} links={links} />);
  expect(screen.queryByRole("list", { name: "spec" })).toBeNull();
  expect(screen.getAllByRole("link").length).toBeGreaterThanOrEqual(2);
});

test("no phone number, the font credit, and the track list", () => {
  render(<Underside toolbox={["Git"]} links={links} />);
  expect(document.querySelector('a[href^="tel:"]')).toBeNull();
  expect(screen.getByText("Fonts: Archivo, Space Mono and Doto, from Google Fonts under the OFL.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Track list" })).toHaveAttribute("href", "/tracklist");
});

test("the art is decorative", () => {
  render(<Underside toolbox={[]} links={links} />);
  for (const img of document.querySelectorAll("img")) expect(img).toHaveAttribute("alt", "");
});
