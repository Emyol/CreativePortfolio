import type { ReactNode } from "react";

/** One track's two panels: what sits on the device and what the J-card carries. */
export function Section({ device, liner }: { device: ReactNode; liner: ReactNode }) {
  return (
    <>
      <div data-panel="device">{device}</div>
      <div data-panel="liner">{liner}</div>
    </>
  );
}
