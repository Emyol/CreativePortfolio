import Image from "next/image";
import type { Photo as PhotoData } from "@/lib/content/schema";

type Props = {
  photo: PhotoData;
  sizes: string;
  className?: string;
  /** Decorative where something else names the image (e.g. a tile link with a heading). */
  decorative?: boolean;
  /** The page's main image: load it eagerly at high priority instead of lazily. */
  priority?: boolean;
};

export function Photo({ photo, sizes, className, decorative = false, priority = false }: Props) {
  return (
    <Image
      src={photo.src}
      alt={decorative ? "" : photo.alt}
      width={photo.width}
      height={photo.height}
      sizes={sizes}
      className={className}
      loading={priority ? "eager" : undefined}
      fetchPriority={priority ? "high" : undefined}
      // Fixture swatches are data: URIs, which the optimiser can't process.
      unoptimized={photo.src.startsWith("data:")}
    />
  );
}
