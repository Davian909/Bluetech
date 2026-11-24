"use client";

import { useEffect, useRef, useState } from "react";

/* Angka dengan animasi hitung-naik (count-up) saat masuk layar.
   Dipakai pada kartu statistik dashboard agar tampilan lebih hidup. */

function formatId(n: number, decimals: number, thousands: boolean) {
  const fixed = n.toFixed(decimals);
  if (!thousands) return fixed;
  const [int, dec] = fixed.split(".");
  const withDots = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return dec ? `${withDots}.${dec}` : withDots;
}

export function AnimatedNumber({
  value,
  decimals = 0,
  thousands = false,
  prefix = "",
  suffix = "",
  duration = 1300,
  delay = 0,
  className,
}: {
  value: number;
  decimals?: number;
  thousands?: boolean;
  prefix?: string;
  suffix?: string;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const holder = useRef<HTMLSpanElement>(null);
  const played = useRef(false);

  useEffect(() => {
    const el = holder.current;
    if (!el) return;

    const run = () => {
      if (played.current) return;
      played.current = true;
      let raf = 0;
      let start = 0;
      const step = (now: number) => {
        if (!start) start = now;
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 4); // ease-out quart
        setDisplay(value * eased);
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      return () => cancelAnimationFrame(raf);
    };

    if (typeof IntersectionObserver === "undefined") {
      run();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          const t = setTimeout(run, delay);
          io.disconnect();
          return () => clearTimeout(t);
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration, delay]);

  return (
    <span ref={holder} className={className}>
      {prefix}
      {formatId(display, decimals, thousands)}
      {suffix}
    </span>
  );
}
