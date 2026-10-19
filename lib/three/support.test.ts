import { expect, test } from "vitest";
import { canUse3D, dprFor, scissorFor, isSoftwareRenderer } from "./support";

test("full motion renders sharp up to 2x; phones cap at 1.5x", () => {
  expect(dprFor("full", 3)).toBe(2);
  expect(dprFor("lite", 3)).toBe(1.5);
  expect(dprFor("full", 1)).toBe(1);
});

test("3D needs motion and WebGL", () => {
  expect(canUse3D("none", true)).toBe(false);
  expect(canUse3D("full", false)).toBe(false);
  expect(canUse3D("full", true)).toBe(true);
  expect(canUse3D("lite", true)).toBe(true);
});

test("a view's scissor is its box, measured from the canvas bottom", () => {
  expect(scissorFor({ left: 10, top: 20, width: 100, height: 50 } as DOMRect, 800)).toEqual([10, 730, 100, 50]);
});

test("software renderers can't keep up; real GPUs can", () => {
  expect(isSoftwareRenderer("ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)")).toBe(true);
  expect(isSoftwareRenderer("llvmpipe (LLVM 15.0.7, 256 bits)")).toBe(true);
  expect(isSoftwareRenderer("ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0)")).toBe(true);
  expect(isSoftwareRenderer("ANGLE (Intel, Intel(R) UHD Graphics (0x00009A68) Direct3D11 vs_5_0 ps_5_0, D3D11)")).toBe(false);
  expect(isSoftwareRenderer("Apple M2")).toBe(false);
});
