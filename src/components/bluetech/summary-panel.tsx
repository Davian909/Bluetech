"use client";

import { useEffect, useState } from "react";
import { Waves, MapPin, ArrowRight, Database, Map as MapIcon, TriangleAlert } from "lucide-react";
import type { MenuKey } from "@/lib/bluetech-data";
import { computeRisks } from "@/lib/analysis-engine";
import { AnimatedNumber } from "./animated-number";

/* ---------------------------- Ringkasan Wilayah --------------------------- */

function Sparkline() {
  return (
    <svg viewBox="0 0 64 36" className="h-9 w-16" aria-hidden="true" fill="none">
      <path d="M2 24 C 10 12, 16 30, 24 20 C 32 10, 38 26, 46 16 C 52 9, 58 14, 62 8" stroke="#1d80b2" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M2 31 C 12 24, 20 34, 30 28 C 40 22, 50 30, 62 22" stroke="#a3e4cf" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function AreaBlob() {
  return (
    <svg viewBox="0 0 64 36" className="h-9 w-16" aria-hidden="true">
      <path d="M10 24 C 6 16, 14 8, 24 9 C 32 4, 46 6, 52 13 C 60 15, 60 24, 52 28 C 42 33, 24 32, 16 30 C 12 29, 12 27, 10 24 Z" fill="#a3e4cf" opacity="0.9" />
      <path d="M20 18 C 26 14, 38 14, 44 18" stroke="#1e9c80" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function RiskBars() {
  return (
    <svg viewBox="0 0 64 36" className="h-9 w-16" aria-hidden="true">
      <rect x="6" y="22" width="8" height="12" rx="2" fill="#e2cd97" />
      <rect x="20" y="16" width="8" height="18" rx="2" fill="#d4b876" />
      <rect x="34" y="10" width="8" height="24" rx="2" fill="#d4a94d" />
      <rect x="48" y="4" width="8" height="30" rx="2" fill="#d4a94d" opacity="0.45" />
    </svg>
  );
}

export function RegionSummary() {
  const rows = [
    {
      icon: Waves,
      iconBg: "bg-[linear-gradient(135deg,#d9edf6,#aed8ea)] text-ocean-700",
      label: "Kedalaman Rata-rata",
      value: "27.5 m",
      valueClass: "text-ocean-800",
      graphic: <Sparkline />,
    },
    {
      icon: MapPin,
      iconBg: "bg-[linear-gradient(135deg,#d0f2e6,#a3e4cf)] text-reef-700",
      label: "Luas Area Analisis",
      value: "2.850 km²",
      valueClass: "text-reef-700",
      graphic: <AreaBlob />,
    },
    {
      icon: TriangleAlert,
      iconBg: "bg-[linear-gradient(135deg,#f5ecd4,#eddfba)] text-[#a07818]",
      label: "Tingkat Risiko Pesisir",
      value: "Sedang",
      valueClass: "text-[#a07818]",
      graphic: <RiskBars />,
    },
  ];

  return (
    <div className="card-marine card-lift p-4">
      <h3 className="flex items-center gap-2 text-[16px] font-bold text-ocean-900">
        <span className="h-4 w-1 rounded-full bg-[linear-gradient(180deg,#1d80b2,#3cb899)]" /> Ringkasan Wilayah
      </h3>
      <div className="mt-1">
        {rows.map((r) => {
          const Icon = r.icon;
          return (
            <div key={r.label} className="group flex items-center gap-3 rounded-xl px-1.5 py-2.5 transition-colors hover:bg-cream-100/60">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-transform duration-300 group-hover:scale-110 ${r.iconBg}`}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] text-ocean-600/80">{r.label}</p>
                <p className={`text-[19px] leading-tight font-bold ${r.valueClass}`}>
                  {r.label === "Kedalaman Rata-rata" && <AnimatedNumber value={27.5} decimals={1} suffix=" m" duration={1400} />}
                  {r.label === "Luas Area Analisis" && <AnimatedNumber value={2850} thousands suffix=" km²" duration={1600} delay={120} />}
                  {r.label === "Tingkat Risiko Pesisir" && "Sedang"}
                </p>
              </div>
              {r.graphic}
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-2 border-t border-cream-200 pt-3">
        <div className="rounded-lg bg-[linear-gradient(135deg,#eff7fb,#d9edf6)]/70 p-2.5">
          <p className="flex items-center gap-1.5 text-[11px] text-ocean-600">
            <MapIcon className="h-3.5 w-3.5" /> Wilayah Dianalisis
          </p>
          <p className="mt-0.5 text-[16px] font-bold text-ocean-800">
            <AnimatedNumber value={7} duration={1100} delay={250} /> wilayah
          </p>
        </div>
        <div className="rounded-lg bg-[linear-gradient(135deg,#ecfaf5,#d0f2e6)]/70 p-2.5">
          <p className="flex items-center gap-1.5 text-[11px] text-reef-700">
            <Database className="h-3.5 w-3.5" /> Data Spasial
          </p>
          <p className="mt-0.5 text-[16px] font-bold text-reef-800">
            <AnimatedNumber value={12} duration={1100} delay={350} /> dataset
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Peringatan Dini ---------------------------- */

export function EarlyWarning({ onNavigate }: { onNavigate: (key: MenuKey) => void }) {
  const risks = computeRisks();
  const top5 = [...risks].sort((a, b) => b.index - a.index).slice(0, 5);
  const maxIdx = Math.max(...top5.map((r) => r.index), 1);

  /* bar tumbuh berurutan setelah kartu masuk */
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGrown(true), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="card-marine card-lift p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[16px] font-bold text-ocean-900">
          <span className="h-4 w-1 rounded-full bg-[linear-gradient(180deg,#d24d42,#e86a5e)]" /> Peringatan Dini
        </h3>
        <button
          onClick={() => onNavigate("mitigasi")}
          className="flex items-center gap-1 text-[13px] font-medium text-ocean-600 hover:underline"
        >
          Lihat Semua <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <button
        onClick={() => onNavigate("mitigasi")}
        className="group mt-3 flex w-full items-start gap-3 rounded-xl bg-[linear-gradient(120deg,#fdeeea,#fbe3dd)] p-3.5 text-left ring-1 ring-coral-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
      >
        <span className="mt-0.5 shrink-0 transition-transform duration-300 group-hover:scale-110">
          <TriangleAlert className="h-6 w-6" fill="#d24d42" stroke="#ffffff" strokeWidth={1.8} />
        </span>
        <span>
          <span className="block text-[14px] leading-snug font-semibold text-ocean-900">Potensi Abrasi Tinggi</span>
          <span className="block text-[13px] text-ocean-600/90">di Pesisir Utara</span>
          <span className="block text-[13px] text-ocean-500/70">(0–5 tahun)</span>
        </span>
      </button>

      {/* Ringkasan risiko pesisir — grafik mini (DEMO) */}
      <div className="mt-4 border-t border-cream-200 pt-3">
        <div className="flex items-center justify-between">
          <p className="text-[12.5px] font-bold text-ocean-800">Ringkasan Risiko Pesisir</p>
          <span className="rounded-full bg-cream-200 px-2 py-0.5 text-[10px] font-bold text-[#8a6d1f]">DEMO</span>
        </div>
        <div className="mt-2 flex flex-col gap-1.5">
          {top5.map((r, i) => (
            <div key={r.id} className="flex items-center gap-2">
              <span className="w-28 shrink-0 truncate text-[11px] text-ocean-600/90">{r.label}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream-200/80">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: grown ? `${(r.index / maxIdx) * 100}%` : "0%",
                    backgroundColor: r.kategoriColor,
                    transitionDelay: `${i * 90}ms`,
                  }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-[10.5px] font-semibold" style={{ color: r.kategoriColor }}>
                {r.index}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
