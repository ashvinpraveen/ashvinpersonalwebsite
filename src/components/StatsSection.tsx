"use client";

import { useEffect, useRef, useState } from "react";
import { pageShellClassName } from "@/lib/layout";
import { heading } from "@/lib/styles";

const stats = [
  {
    value: 16,
    suffix: "k",
    label: "followers across channels",
  },
  {
    value: 40,
    suffix: "k",
    label: "users on Cleve",
  },
  {
    value: 120,
    suffix: "k",
    label: "users on past products",
  },
];

function CountUpNumber({ suffix, value }: { suffix: string; value: number }) {
  const elementRef = useRef<HTMLSpanElement | null>(null);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setDisplayValue(value);
      return;
    }

    let frame = 0;
    let started = false;
    let startTime = 0;
    const duration = 1100;

    const animateValue = (timestamp: number) => {
      if (startTime === 0) startTime = timestamp;

      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      setDisplayValue(Math.round(value * easedProgress));

      if (progress < 1) {
        frame = requestAnimationFrame(animateValue);
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || started) return;

        started = true;
        frame = requestAnimationFrame(animateValue);
        observer.disconnect();
      },
      { threshold: 0.35 },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <span ref={elementRef}>
      {displayValue}
      {suffix}
    </span>
  );
}

const StatsSection = () => {
  return (
    <section className="bg-background/95">
      <div className={`${pageShellClassName} grid grid-cols-3 gap-3 py-8 md:gap-6 md:py-10`}>
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-0">
            <p className={`text-3xl font-bold leading-none text-link sm:text-4xl md:text-5xl ${heading}`}>
              <CountUpNumber value={stat.value} suffix={stat.suffix} />
            </p>
            <p className="mt-2 text-xs font-medium leading-snug text-foreground/60 sm:text-sm">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default StatsSection;
