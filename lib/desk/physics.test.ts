import { describe, expect, it } from "vitest";
import { MAX_THROW, SCATTER, projectRest, releaseVelocity, stepDesk, type Body } from "./physics";

const body = (o: Partial<Body> = {}): Body => ({ x: 0, z: 0, yaw: 0, vx: 0, vz: 0, va: 0, ...o });
const bounds = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };
const far = { minX: 100, maxX: 101, minZ: 100, maxZ: 101 };

describe("stepDesk", () => {
  it("separates overlapping bodies to at least twice the radius", () => {
    const bodies = [body({ x: 0 }), body({ x: 0.5 })];
    stepDesk(bodies, 1 / 60, { radius: 1, bounds, obstacle: far });
    expect(Math.hypot(bodies[1].x - bodies[0].x, bodies[1].z - bodies[0].z)).toBeGreaterThanOrEqual(2 - 1e-9);
  });

  it("separates two bodies on the same x along z", () => {
    const bodies = [body({ x: 0, z: 0 }), body({ x: 0, z: 0.5 })];
    stepDesk(bodies, 1 / 60, { radius: 1, bounds, obstacle: far });
    expect(bodies[0].x).toBe(0);
    expect(bodies[1].x).toBe(0);
    expect(bodies[1].z - bodies[0].z).toBeGreaterThanOrEqual(2 - 1e-9);
  });

  it("bounces a body off the wall, inside bounds, with velocity reversed and halved", () => {
    const bodies = [body({ x: 8.9, vx: 10 })];
    stepDesk(bodies, 0.1, { radius: 1, bounds, obstacle: far });
    expect(bodies[0].x).toBeLessThanOrEqual(9);
    expect(bodies[0].vx).toBeCloseTo(-10 * Math.exp(-0.24) * 0.5, 5);
  });

  it("pushes a body out of the obstacle box", () => {
    const obstacle = { minX: -2, maxX: 2, minZ: -2, maxZ: 2 };
    const bodies = [body({ x: 1.5, z: 0 })];
    stepDesk(bodies, 1 / 60, { radius: 0.5, bounds, obstacle });
    expect(bodies[0].x).toBeGreaterThanOrEqual(2.5 - 1e-9);
    expect(bodies[0].x).toBeLessThan(2.6);
  });

  it("reports an impact over 1.5 when bodies meet at speed", () => {
    const bodies = [body({ x: -0.9, vx: 10 }), body({ x: 0.9, vx: -10 })];
    const { impacts } = stepDesk(bodies, 1 / 60, { radius: 1, bounds, obstacle: far });
    expect(Math.max(...impacts)).toBeGreaterThan(1.5);
  });

  it("does not move or push the held body", () => {
    const bodies = [body({ x: 0, vx: 5 }), body({ x: 1.5 })];
    stepDesk(bodies, 1 / 60, { radius: 1, bounds, obstacle: far, held: 0 });
    expect(bodies[0].x).toBe(0);
    expect(bodies[1].x).toBeCloseTo(2, 5);
  });
});

describe("releaseVelocity", () => {
  it("is zero when the last sample is 120 ms older than release", () => {
    const samples = [{ x: 0, z: 0, t: 800 }, { x: 5, z: 0, t: 880 }];
    expect(releaseVelocity(samples, 1000)).toEqual({ vx: 0, vz: 0 });
  });

  it("measures the last 80 ms and ignores older samples", () => {
    const samples = [{ x: -50, z: 0, t: 0 }, { x: 0, z: 0, t: 920 }, { x: 1, z: 0.5, t: 1000 }];
    const v = releaseVelocity(samples, 1010);
    expect(v.vx).toBeCloseTo(12.5, 5);
    expect(v.vz).toBeCloseTo(6.25, 5);
  });

  it("caps the throw at MAX_THROW", () => {
    const v = releaseVelocity([{ x: 0, z: 0, t: 950 }, { x: 100, z: 0, t: 1000 }], 1000);
    expect(Math.hypot(v.vx, v.vz)).toBeCloseTo(MAX_THROW, 5);
  });

  it("is zero without enough samples", () => {
    expect(releaseVelocity([], 0)).toEqual({ vx: 0, vz: 0 });
    expect(releaseVelocity([{ x: 1, z: 1, t: 10 }], 20)).toEqual({ vx: 0, vz: 0 });
  });
});

describe("projectRest", () => {
  it("projects 1000 to about 499", () => {
    expect(projectRest(1000)).toBeCloseTo(499, 0);
  });
});

describe("SCATTER", () => {
  it("has the prototype's six tapes", () => {
    expect(SCATTER).toHaveLength(6);
  });
});
