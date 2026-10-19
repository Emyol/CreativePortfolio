// @vitest-environment node
import * as THREE from "three";
import { expect, test } from "vitest";
import { levelFaces } from "./loadDevice";

const faces = (tris: number[][], normals: number[][]) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(tris.flat(), 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(normals.flat(), 3));
  return g;
};
const ny = (g: THREE.BufferGeometry) => [...Array(g.getAttribute("normal").count).keys()].map((i) => +g.getAttribute("normal").getY(i).toFixed(3));

test("a sliver a hair off level, tilted by its shape, points straight up", () => {
  const tilt = [0.5, 0.8, 0.33];
  const g = levelFaces(faces([[0, 1, 0], [4, 1.003, 0], [4, 1, 0.01]], [tilt, tilt, tilt]), 0.005);
  expect(ny(g)).toEqual([1, 1, 1]);
});

test("a wall and a bevel span more height and keep their normals", () => {
  const side = [1, 0, 0];
  const bevel = [0.7, 0.71, 0];
  const g = levelFaces(faces([[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 1, 0], [0.05, 0.98, 0], [0.05, 0.98, 1]], [side, side, side, bevel, bevel, bevel]), 0.005);
  expect(ny(g)).toEqual([0, 0, 0, 0.71, 0.71, 0.71]);
});

test("a level face pointing down (the underside) is left alone", () => {
  const down = [0, -1, 0];
  const g = levelFaces(faces([[0, 0, 0], [1, 0, 0], [0, 0, 1]], [down, down, down]), 0.005);
  expect(ny(g)).toEqual([-1, -1, -1]);
});
