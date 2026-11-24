"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "./Icons";

/** Product gallery: vertical thumbnail strip (desktop) / horizontal strip (mobile) + main image with arrows. */
export function Gallery({ images, name }: { images: { url: string; alt: string }[]; name: string }) {
  const [active, setActive] = useState(0);
  if (!images.length) {
    return <div className="flex aspect-[655/700] items-center justify-center rounded-3xl bg-[#f4f3f5] text-faint">No image</div>;
  }
  const go = (d: number) => setActive((a) => (a + d + images.length) % images.length);
  return (
    <div className="flex flex-col-reverse gap-4 md:flex-row md:gap-6">
      {images.length > 1 && (
        <div className="scrollbar-none flex gap-3 overflow-auto md:max-h-[700px] md:w-[114px] md:shrink-0 md:flex-col md:gap-4">
          {images.map((img, i) => (
            <button
              key={img.url}
              onClick={() => setActive(i)}
              aria-label={`Show image ${i + 1}`}
              aria-current={i === active}
              className={`relative h-[78px] w-[86px] shrink-0 overflow-hidden rounded-lg bg-[#f9fafb] transition-opacity md:h-[103px] md:w-[114px] ${i === active ? "opacity-100" : "opacity-60 hover:opacity-100"}`}
            >
              <Image src={img.url} alt="" fill sizes="114px" className="object-contain p-2 mix-blend-multiply" />
            </button>
          ))}
        </div>
      )}
      <div className="relative aspect-[655/700] flex-1 overflow-hidden rounded-3xl bg-[#f4f3f5]">
        <Image src={images[active].url} alt={images[active].alt || name} fill priority sizes="(max-width: 1024px) 100vw, 655px" className="object-contain p-10 mix-blend-multiply" />
        {images.length > 1 && (
          <>
            <button onClick={() => go(-1)} aria-label="Previous image" className="absolute left-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-faint shadow-md hover:text-ink">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={() => go(1)} aria-label="Next image" className="absolute right-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-faint shadow-md hover:text-ink">
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
