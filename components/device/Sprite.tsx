import type { CSSProperties } from "react";
import { DEVICE } from "@/lib/device/layout";

export type SpriteName =
  | "plate" | "shadow" | "shell-a" | "shell-b" | "hub" | "pack" | "knob" | "knob-mark"
  | "key-up" | "key-down" | "underside" | "beauty";

type Props = {
  name: SpriteName;
  className?: string;
  style?: CSSProperties;
  /** Intrinsic size, for the aspect ratio before load. Defaults to the plate. */
  width?: number;
  height?: number;
  eager?: boolean;
};

/** One layer of the rendered device. Always decorative: what it shows is also live text. */
export function Sprite({ name, className, style, width = DEVICE.plate.width, height = DEVICE.plate.height, eager = false }: Props) {
  return (
    <picture style={{ display: "contents" }}>
      <source type="image/avif" srcSet={`/device/${name}.avif`} />
      <img
        src={`/device/${name}.webp`}
        alt=""
        width={width}
        height={height}
        className={className}
        style={style}
        decoding="async"
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : undefined}
        draggable={false}
      />
    </picture>
  );
}
