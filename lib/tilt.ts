type Rect = { left: number; top: number; width: number; height: number };

/** Degrees to rotate a tile so it leans toward the pointer. */
export function tiltFor(clientX: number, clientY: number, rect: Rect, max = 8): { rotationX: number; rotationY: number } {
  const clamp = (v: number) => Math.min(0.5, Math.max(-0.5, v));
  const nx = clamp((clientX - rect.left) / rect.width - 0.5);
  const ny = clamp((clientY - rect.top) / rect.height - 0.5);
  const round = (v: number) => Math.round(v * 100) / 100 || 0; // avoid -0
  return { rotationX: round(-ny * max), rotationY: round(nx * max) };
}
