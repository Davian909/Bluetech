"use client";

import { useState } from "react";
import { Shield, ArrowRight, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RISK_TYPES, LEVEL_COLORS } from "@/lib/bluetech-data";

function Donut({ score, level }: { score: number; level: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const filled = (score / 100) * c;
  const color = LEVEL_COLORS[level] ?? "#f59e0b";
  return (
    <div className="relative h-[136px] w-[136px] shrink-0">
      <svg viewBox="0 0 130 130" className="h-full w-full -rotate-90">
        <circle cx="65" cy="65" r={r} fill="none" stroke="#f0e6cc" strokeWidth="11" />
        <circle
          cx="65"
          cy="65"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[12px] text-ocean-500/85">Risiko</span>
        <span className="text-[19px] leading-tight font-bold" style={{ color }}>
          {level}
        </span>
      </div>
    </div>
  );
}

/* Risk map used inside the dialog */
function RiskMap({ activeId }: { activeId: string }) {
  const zones = [
    { id: "abrasi", color: LEVEL_COLORS.Sedang, d: "M120 90 C 200 40, 340 34, 430 70 C 505 100, 530 150, 480 190 C 410 240, 280 236, 200 208 C 130 184, 80 130, 120 90 Z", label: "Zona Abrasi" },
    { id: "tsunami", color: LEVEL_COLORS.Rendah, d: "M60 260 C 110 230, 200 236, 230 272 C 258 306, 214 340, 152 334 C 96 328, 26 290, 60 260 Z", label: "Zona Tsunami" },
    { id: "banjir-rob", color: LEVEL_COLORS.Tinggi, d: "M300 280 C 360 252, 460 258, 500 296 C 536 330, 500 362, 420 360 C 350 358, 250 306, 300 280 Z", label: "Zona Banjir Rob" },
    { id: "gelombang-ekstrem", color: LEVEL_COLORS.Sedang, d: "M470 120 C 530 92, 620 100, 650 140 C 674 174, 630 200, 560 194 C 500 188, 420 146, 470 120 Z", label: "Zona Gelombang Ekstrem" },
  ];
  return (
    <div className="relative min-h-[260px] overflow-hidden rounded-xl border border-cream-300">
      <svg viewBox="0 0 700 380" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <rect width="700" height="380" fill="#f5ecd4" />
        <path d="M0 0 H700 V54 C 520 74, 340 52, 180 72 C 90 84, 30 70, 0 84 Z" fill="#d9edf6" />
        <path d="M0 380 V330 C 160 312, 340 336, 520 322 C 600 316, 660 324, 700 320 V380 Z" fill="#d9edf6" />
        {zones.map((z) => (
          <g key={z.id}>
            <path
              d={z.d}
              fill={z.color}
              opacity={z.id === activeId ? 0.85 : 0.35}
              stroke={z.id === activeId ? "#1e293b" : "none"}
              strokeWidth={z.id === activeId ? 2 : 0}
            />
          </g>
        ))}
      </svg>
      <div className="absolute top-3 left-3 flex flex-col gap-1.5 rounded-lg bg-white/90 p-2.5 shadow">
        {Object.entries(LEVEL_COLORS).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5 text-[11.5px] text-ocean-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: v }} /> {k}
          </span>
        ))}
      </div>
      <span className="absolute bottom-2.5 right-3 rounded-md bg-cream-50/85 px-2 py-0.5 text-[11px] font-medium text-ocean-600">
        {zones.find((z) => z.id === activeId)?.label} ditandai
      </span>
    </div>
  );
}

export function RiskCard({ activeRisk, onActiveRiskChange }: { activeRisk?: string; onActiveRiskChange?: (id: string) => void }) {
  const [internal, setInternal] = useState(RISK_TYPES[0].id);
  const [showMap, setShowMap] = useState(false);
  const current = RISK_TYPES.find((r) => r.id === (activeRisk ?? internal)) ?? RISK_TYPES[0];

  const setTab = (id: string) => {
    setInternal(id);
    onActiveRiskChange?.(id);
  };

  return (
    <div className="card-marine card-lift flex h-full flex-col p-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#0b3d5f,#146795)] text-cream-50 shadow-sm">
          <Shield className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <h3 className="text-[16px] font-bold text-ocean-900">Analisis Risiko Bencana</h3>
      </div>

      {/* Tabs */}
      <div className="mt-2 flex gap-4 overflow-x-auto border-b border-cream-300">
        {RISK_TYPES.map((r) => (
          <button
            key={r.id}
            onClick={() => setTab(r.id)}
            className={`relative pb-2 whitespace-nowrap text-[13px] transition-colors ${
              current.id === r.id ? "font-semibold text-ocean-700" : "font-medium text-ocean-500/70 hover:text-ocean-800"
            }`}
          >
            {r.label}
            {current.id === r.id && <span className="absolute inset-x-0 -bottom-px h-[2.5px] rounded-full bg-[linear-gradient(90deg,#1d80b2,#3cb899)]" />}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-1 items-center gap-4">
        <Donut score={current.score} level={current.level} />
        <div className="min-w-0 flex-1">
          <h4 className="text-[14px] font-bold text-ocean-900">Detail Risiko:</h4>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {[
              ["Area terdampak", `${current.affectedArea}%`],
              ["Tingkat kerentanan", current.vulnerability],
              ["Rekomendasi", current.recommendation],
            ].map(([k, v]) => (
              <li key={k} className="flex items-start gap-2 text-[12.8px] leading-snug text-ocean-800">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-ocean-300" />
                <span>
                  {k} : {v}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <button
        onClick={() => setShowMap(true)}
        className="group relative mt-3 flex h-10 w-full items-center justify-center gap-2 overflow-hidden rounded-lg bg-[linear-gradient(92deg,#146795,#1e9c80)] text-[13.5px] font-semibold text-cream-50 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
      >
        <span className="pointer-events-none absolute inset-0 -translate-x-[120%] skew-x-[-12deg] bg-[linear-gradient(100deg,transparent_30%,rgba(255,255,255,0.3)_50%,transparent_70%)] transition-transform duration-700 group-hover:translate-x-[120%]" />
        Lihat Peta Risiko <ArrowRight className="h-4 w-4" />
      </button>

      <Dialog open={showMap} onOpenChange={setShowMap}>
        <DialogContent className="max-w-2xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-bold text-ocean-900">
              Peta Risiko {current.label}
            </DialogTitle>
          </DialogHeader>
          <RiskMap activeId={current.id} />
          <div className="flex items-center justify-between rounded-lg bg-cream-100 p-3">
            <div className="text-[12.5px] text-ocean-700">
              Area terdampak <b className="text-ocean-900">{current.affectedArea}%</b> · Kerentanan{" "}
              <b className="text-ocean-900">{current.vulnerability}</b>
            </div>
            <button
              onClick={() => setShowMap(false)}
              className="flex items-center gap-1 rounded-lg border border-cream-300 bg-white px-3 py-1.5 text-[12.5px] text-ocean-700 hover:bg-cream-100"
            >
              <X className="h-3.5 w-3.5" /> Tutup
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
