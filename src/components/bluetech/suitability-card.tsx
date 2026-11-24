"use client";

import { useState } from "react";
import { Star, ArrowRight, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import type { AnalysisResult } from "./quick-analysis";

/* Patches for the suitability map — variant 0 mirrors the reference layout */
interface Patch {
  d: string;
  cat: 0 | 1 | 2 | 3; // sangat, cukup, bersyarat, tidak
}

const BASE_PATCHES: Patch[] = [
  // green — sangat sesuai (big top blob)
  { cat: 0, d: "M120 96 C 180 30, 330 20, 430 58 C 508 88, 546 140, 504 192 C 462 242, 378 252, 298 236 C 216 220, 138 190, 120 96 Z" },
  { cat: 0, d: "M50 250 C 80 220, 140 224, 158 258 C 172 288, 140 312, 102 308 C 66 304, 30 278, 50 250 Z" },
  { cat: 0, d: "M420 60 C 450 42, 500 48, 516 76 C 530 102, 506 124, 474 120 C 444 116, 400 84, 420 60 Z" },
  { cat: 0, d: "M240 300 C 270 282, 320 286, 338 312 C 352 334, 326 352, 292 348 C 260 344, 218 318, 240 300 Z" },
  // blue — cukup sesuai
  { cat: 1, d: "M36 120 C 58 88, 112 92, 124 128 C 134 164, 98 196, 60 190 C 28 184, 20 152, 36 120 Z" },
  { cat: 1, d: "M560 224 C 592 202, 642 212, 656 246 C 668 280, 630 306, 590 298 C 554 292, 544 246, 560 224 Z" },
  { cat: 1, d: "M380 320 C 410 306, 452 312, 464 336 C 474 358, 446 372, 414 366 C 386 360, 358 334, 380 320 Z" },
  { cat: 1, d: "M180 160 C 200 144, 234 148, 244 170 C 252 190, 234 206, 208 202 C 186 198, 164 176, 180 160 Z" },
  // yellow — sesuai bersyarat
  { cat: 2, d: "M246 238 C 278 214, 348 214, 380 240 C 410 264, 390 300, 340 306 C 288 310, 230 274, 246 238 Z" },
  { cat: 2, d: "M166 66 C 188 50, 222 54, 232 76 C 240 96, 220 112, 194 108 C 172 104, 154 84, 166 66 Z" },
  { cat: 2, d: "M480 250 C 502 236, 534 240, 544 260 C 552 278, 536 292, 512 290 C 490 288, 462 264, 480 250 Z" },
  // orange-red — tidak sesuai
  { cat: 3, d: "M428 166 C 444 146, 480 144, 496 166 C 508 184, 494 206, 468 210 C 444 214, 416 188, 428 166 Z" },
  { cat: 3, d: "M540 150 C 554 136, 580 138, 590 154 C 598 168, 586 182, 568 182 C 552 182, 530 164, 540 150 Z" },
  // base terrain accents
  { cat: 0, d: "M560 60 C 590 44, 630 50, 640 72 C 648 92, 622 106, 594 100 C 570 94, 544 74, 560 60 Z" },
];

const CATEGORY_COLORS = ["#1e9c80", "#1d80b2", "#d4b876", "#e86a5e"];

function shiftedPatches(variant: number, dominantCat: 0 | 1 | 2 | 3): Patch[] {
  if (variant === 0) return BASE_PATCHES;
  return BASE_PATCHES.map((p, i) => {
    if (i === 0) return { ...p, cat: dominantCat }; // blob utama mengikuti kategori skor
    const shift = i % 2 === 0 ? variant % 4 : (variant + 1) % 2;
    return { ...p, cat: (((p.cat + shift) % 4) as 0 | 1 | 2 | 3) };
  });
}

const CATEGORY_INDEX: Record<string, 0 | 1 | 2 | 3> = {
  "Sangat Sesuai": 0,
  "Cukup Sesuai": 1,
  "Sesuai Bersyarat": 2,
  "Tidak Sesuai": 3,
};

function SuitabilityMap({ variant, dominantCat }: { variant: number; dominantCat: 0 | 1 | 2 | 3 }) {
  const patches = shiftedPatches(variant, dominantCat);
  return (
    <svg viewBox="0 0 700 380" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
      <rect x="0" y="0" width="700" height="380" fill="#f5ecd4" />
      <path d="M0 0 H700 V70 C 560 90, 420 60, 260 84 C 140 100, 60 80, 0 96 Z" fill="#ecf3dd" opacity="0.75" />
      <path d="M0 380 V300 C 120 280, 260 310, 420 296 C 540 286, 640 300, 700 292 V380 Z" fill="#edf3dd" opacity="0.85" />
      {patches.map((p, i) => (
        <path key={i} d={p.d} fill={CATEGORY_COLORS[p.cat]} opacity={0.92} />
      ))}
      <g fill="#ffffff" opacity="0.75">
        <circle cx="90" cy="60" r="3" />
        <circle cx="620" cy="200" r="3" />
        <circle cx="320" cy="150" r="3" />
        <circle cx="150" cy="340" r="3" />
        <circle cx="660" cy="330" r="3" />
      </g>
    </svg>
  );
}

export function SuitabilityCard({ result }: { result: AnalysisResult }) {
  const [detail, setDetail] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [shownVariant, setShownVariant] = useState(result.variant);

  // animate refresh when a new analysis arrives
  if (shownVariant !== result.variant && !refreshing) {
    setRefreshing(true);
    setTimeout(() => {
      setShownVariant(result.variant);
      setRefreshing(false);
    }, 800);
  }

  const criteria = [
    { label: "Kedalaman Perairan", score: Math.min(98, result.score + 6) },
    { label: "Arus & Gelombang", score: Math.max(40, result.score - 8) },
    { label: "Jarak ke Fasilitas", score: Math.min(95, result.score + 2) },
    { label: "Kondisi Ekosistem", score: Math.max(45, result.score - (result.ekosistem ? 2 : 10)) },
    { label: "Aksesibilitas", score: Math.min(96, result.score + 4) },
  ];

  return (
    <div className="card-marine card-lift flex h-full flex-col p-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#146795,#1e9c80)] text-cream-50 shadow-sm">
          <Star className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <h3 className="text-[16px] font-bold text-ocean-900">Hasil Kesesuaian Lokasi</h3>
      </div>

      {/* Legend */}
      <div className="mt-2.5 flex items-center gap-x-3 overflow-hidden">
        {[
          ["Sangat Sesuai", "#1e9c80"],
          ["Cukup Sesuai", "#1d80b2"],
          ["Sesuai Bersyarat", "#d4b876"],
          ["Tidak Sesuai", "#e86a5e"],
        ].map(([label, color]) => (
          <span key={label} className="flex shrink-0 items-center gap-1 text-[11px] whitespace-nowrap text-ocean-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>

      {/* Map */}
      <div className="relative mt-2.5 min-h-[190px] flex-1 overflow-hidden rounded-xl border border-cream-300 shadow-inner">
        <SuitabilityMap variant={shownVariant} dominantCat={CATEGORY_INDEX[result.category] ?? 0} />
        {refreshing && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-cream-50/60 backdrop-blur-[2px]">
            <Loader2 className="h-7 w-7 animate-spin text-ocean-600" />
          </div>
        )}
        <button
          onClick={() => setDetail(true)}
          className="btn-sweep group absolute right-3 bottom-3 flex items-center gap-1.5 rounded-lg bg-ocean-800 px-3.5 py-2 text-[13px] font-semibold text-cream-50 shadow-lg transition-all hover:-translate-y-0.5 hover:bg-ocean-700"
        >
          <span className="pointer-events-none absolute inset-0 -translate-x-[120%] skew-x-[-12deg] bg-[linear-gradient(100deg,transparent_30%,rgba(255,255,255,0.28)_50%,transparent_70%)] transition-transform duration-700 group-hover:translate-x-[120%]" />
          Lihat Detail <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Detail dialog */}
      <Dialog open={detail} onOpenChange={setDetail}>
        <DialogContent className="max-w-lg rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-bold text-ocean-900">
              Detail Kesesuaian — {result.jenisLabel}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3">
            <span className="text-[34px] leading-none font-extrabold text-[#1e40af]">{result.score}</span>
            <div>
              <span
                className="rounded-full px-3 py-1 text-[12.5px] font-semibold text-white"
                style={{
                  backgroundColor:
                    result.category === "Sangat Sesuai"
                      ? "#1e9c80"
                      : result.category === "Cukup Sesuai"
                        ? "#1d80b2"
                        : result.category === "Sesuai Bersyarat"
                          ? "#d4b876"
                          : "#e86a5e",
                }}
              >
                {result.category}
              </span>
              <p className="mt-1 text-[12px] text-ocean-500/85">
                Syarat: kedalaman ≥ {result.kedalaman} · Batimetri {result.batimetri ? "aktif" : "nonaktif"} ·
                Ekosistem {result.ekosistem ? "dianalisis" : "dilewati"}
              </p>
            </div>
          </div>
          <div className="mt-2 flex flex-col gap-3">
            {criteria.map((c) => (
              <div key={c.label}>
                <div className="mb-1 flex justify-between text-[12.5px]">
                  <span className="text-ocean-600">{c.label}</span>
                  <span className="font-semibold text-ocean-900">{c.score}</span>
                </div>
                <Progress value={c.score} className="h-2 bg-cream-200 [&>div]:bg-[linear-gradient(90deg,#1d80b2,#3cb899)]" />
              </div>
            ))}
          </div>
          <p className="rounded-lg bg-reef-50 p-3 text-[12.5px] leading-relaxed text-ocean-700 ring-1 ring-reef-200/60">
            <b>Rekomendasi:</b>{" "}
            {result.score >= 80
              ? "Lokasi sangat direkomendasikan untuk pengembangan skenario ini."
              : result.score >= 65
                ? "Lokasi dapat dimanfaatkan dengan mitigasi ringan di sebagian titik."
                : result.score >= 50
                  ? "Pemanfaatan memerlukan persyaratan khusus dan pemantauan berkala."
                  : "Lokasi tidak direkomendasikan; pertimbangkan skenario alternatif."}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
