/* The desk's 2D physics (x/z plane): tapes slide, spin, bump into each other,
 * the desk's edges and the player's box. Pure and mutating, so the 3D scene
 * calls it every frame and tests can call it directly. */

export type Body = { x: number; z: number; yaw: number; vx: number; vz: number; va: number };
export type Box = { minX: number; maxX: number; minZ: number; maxZ: number };
export type Bounds = Box;

export const MAX_THROW = 42;

/** Where the six tapes start, in units of the player's width and depth: [x, z, yaw]. */
export const SCATTER: readonly [x: number, z: number, yaw: number][] = [
  [-1.0, -0.3, 0.45],
  [-0.52, -0.46, -0.25],
  [-0.86, 0.2, -0.6],
  [-0.4, 0.2, 0.3],
  [-1.12, 0.74, 0.15],
  [-0.6, 0.8, -0.4],
];

const FRICTION = 2.4;
const SPIN_FRICTION = 2.8;
const PAIR_RESTITUTION = 0.85;
const EDGE_BOUNCE = 0.5;
const OBSTACLE_BOUNCE = 1.5; // reflects the normal speed at half strength

type Options = { radius: number; bounds: Bounds; obstacle: Box; held?: number };

/** Advance the desk by dt seconds. Returns the strength of every impact this step, for sound. */
export function stepDesk(bodies: Body[], dt: number, o: Options): { impacts: number[] } {
  const { radius, bounds, obstacle, held } = o;
  const impacts: number[] = [];
  const k = Math.exp(-FRICTION * dt);
  const ka = Math.exp(-SPIN_FRICTION * dt);

  bodies.forEach((b, i) => {
    if (i === held) return;
    b.x += b.vx * dt;
    b.z += b.vz * dt;
    b.yaw += b.va * dt;
    b.vx *= k;
    b.vz *= k;
    b.va *= ka;
  });

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i];
      const c = bodies[j];
      const dx = c.x - a.x;
      const dz = c.z - a.z;
      const d = Math.hypot(dx, dz) || 1e-4;
      const min = radius * 2;
      if (d >= min) continue;
      // Exactly coincident bodies get an arbitrary but fixed axis.
      const nx = dx ? dx / d : 1;
      const nz = dx ? dz / d : 0;
      const push = (min - d) / 2;
      const aHeld = i === held;
      const cHeld = j === held;
      if (!aHeld) {
        a.x -= nx * push * (cHeld ? 2 : 1);
        a.z -= nz * push * (cHeld ? 2 : 1);
      }
      if (!cHeld) {
        c.x += nx * push * (aHeld ? 2 : 1);
        c.z += nz * push * (aHeld ? 2 : 1);
      }
      const rel = (c.vx - a.vx) * nx + (c.vz - a.vz) * nz;
      if (rel < 0) {
        const imp = -rel * PAIR_RESTITUTION;
        if (!aHeld) {
          a.vx -= nx * imp;
          a.vz -= nz * imp;
          a.va += (Math.random() - 0.5) * imp * 0.5;
        }
        if (!cHeld) {
          c.vx += nx * imp;
          c.vz += nz * imp;
          c.va += (Math.random() - 0.5) * imp * 0.5;
        }
        impacts.push(imp);
      }
    }
  }

  bodies.forEach((b, i) => {
    if (i === held) return;
    if (b.x < bounds.minX + radius) { b.x = bounds.minX + radius; b.vx = Math.abs(b.vx) * EDGE_BOUNCE; }
    if (b.x > bounds.maxX - radius) { b.x = bounds.maxX - radius; b.vx = -Math.abs(b.vx) * EDGE_BOUNCE; }
    if (b.z < bounds.minZ + radius) { b.z = bounds.minZ + radius; b.vz = Math.abs(b.vz) * EDGE_BOUNCE; }
    if (b.z > bounds.maxZ - radius) { b.z = bounds.maxZ - radius; b.vz = -Math.abs(b.vz) * EDGE_BOUNCE; }

    // The obstacle is a rounded box: the box grown by the tape's radius.
    const cx = Math.max(obstacle.minX, Math.min(b.x, obstacle.maxX));
    const cz = Math.max(obstacle.minZ, Math.min(b.z, obstacle.maxZ));
    const ox = b.x - cx;
    const oz = b.z - cz;
    const od = Math.hypot(ox, oz);
    if (od < radius) {
      let nx = 0;
      let nz = 0;
      let px = cx;
      let pz = cz;
      if (od) {
        nx = ox / od;
        nz = oz / od;
      } else {
        // Centre inside the box: leave through the nearest face.
        const faces: [number, number, number, number][] = [
          [b.x - obstacle.minX, -1, 0, obstacle.minX],
          [obstacle.maxX - b.x, 1, 0, obstacle.maxX],
          [b.z - obstacle.minZ, 0, -1, obstacle.minZ],
          [obstacle.maxZ - b.z, 0, 1, obstacle.maxZ],
        ];
        const [, fx, fz, at] = faces.reduce((m, f) => (f[0] < m[0] ? f : m));
        nx = fx;
        nz = fz;
        if (fx) px = at;
        else pz = at;
      }
      b.x = px + nx * radius;
      b.z = pz + nz * radius;
      const vn = b.vx * nx + b.vz * nz;
      if (vn < 0) {
        b.vx -= OBSTACLE_BOUNCE * vn * nx;
        b.vz -= OBSTACLE_BOUNCE * vn * nz;
        impacts.push(-vn);
      }
    }
  });

  return { impacts };
}

/**
 * Throw velocity from recent pointer samples (t in ms): the average over the
 * last 80 ms, capped at MAX_THROW. Zero if the pointer had stopped for more
 * than 90 ms before release (`releasedAt`, default now).
 */
export function releaseVelocity(
  samples: { x: number; z: number; t: number }[],
  releasedAt: number = performance.now(),
): { vx: number; vz: number } {
  const last = samples[samples.length - 1];
  if (!last || releasedAt - last.t > 90) return { vx: 0, vz: 0 };
  const first = samples.find((s) => last.t - s.t <= 80) ?? last;
  const dt = (last.t - first.t) / 1000;
  if (dt <= 0) return { vx: 0, vz: 0 };
  let vx = (last.x - first.x) / dt;
  let vz = (last.z - first.z) / dt;
  const s = Math.hypot(vx, vz);
  if (s > MAX_THROW) {
    vx *= MAX_THROW / s;
    vz *= MAX_THROW / s;
  }
  return { vx, vz };
}

/** Where a value moving at v (per second) comes to rest: apple-design projection. */
export function projectRest(v: number, decel = 0.998): number {
  return ((v / 1000) * decel) / (1 - decel);
}
