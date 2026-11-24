"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "./Icons";

export type Slide = { tag: string; badge: string; title: string; text: string; href: string; cta: string; image?: string; alt: string };

export function HeroSlider({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-brand-900">
      {slides.map((s, n) => (
        <div
          key={n}
          className={`grid min-h-[420px] items-center gap-6 px-6 pb-20 pt-10 transition-opacity duration-700 sm:px-12 md:grid-cols-2 lg:min-h-[480px] lg:px-24 ${n === i ? "relative opacity-100" : "pointer-events-none absolute inset-0 opacity-0"}`}
          aria-hidden={n !== i}
        >
          <div className={`text-white ${n === i ? "hero-in" : ""}`}>
            <p className="flex items-center gap-2 font-heading text-lg font-bold">
              {s.tag} <span className="rounded-full bg-accent px-2 py-0.5 font-sans text-xs font-medium text-ink">{s.badge}</span>
            </p>
            <h2 className="mt-4 max-w-lg font-heading text-[34px] font-bold leading-[1.15] sm:text-5xl sm:leading-[1.2]">{s.title}</h2>
            <p className="mt-4 max-w-md text-base text-white/90">{s.text}</p>
            <Link href={s.href} tabIndex={n === i ? 0 : -1} className="mt-8 inline-flex items-center gap-3 rounded-full bg-brand-600 py-1.5 pl-5 pr-1.5 text-base font-semibold text-white hover:bg-brand-500">
              {s.cta}
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink"><ArrowUpRight className="h-4 w-4" /></span>
            </Link>
          </div>
          {s.image && (
            <div className="relative mx-auto hidden aspect-square w-full max-w-[380px] md:block">
              <div className="keep-white absolute inset-0 rounded-full bg-white" />
              <Image src={s.image} alt={s.alt} fill priority={n === 0} sizes="380px" className="object-contain p-14" />
            </div>
          )}
        </div>
      ))}
      {/* bottom notch with dots */}
      <div className="absolute bottom-0 left-1/2 flex h-[42px] w-[200px] -translate-x-1/2 items-center justify-center gap-2.5 rounded-t-[42px] bg-white">
        {slides.map((_, n) => (
          <button key={n} onClick={() => setI(n)} aria-label={`Show slide ${n + 1}`} className={`h-2.5 rounded-full transition-all ${n === i ? "w-11 bg-brand-600" : "w-2.5 bg-line"}`} />
        ))}
      </div>
    </div>
  );
}
