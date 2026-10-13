import Image from "next/image";
import type { Photo as PhotoData } from "@/lib/content/schema";

type Props = { photo: PhotoData; sizes: string; className?: string };

export function Photo({ photo, sizes, className }: Props) {
  return (
    <Image
      src={photo.src}
      alt={photo.alt}
      width={photo.width}
      height={photo.height}
      sizes={sizes}
      className={className}
      // Fixture swatches are data: URIs, which the optimiser can't process.
      unoptimized={photo.src.startsWith("data:")}
    />
  );
}
