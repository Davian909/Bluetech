"use client";

import { useState } from "react";
import { BarChart3, Search, ChevronDown, Waves, ShieldAlert, Siren, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { RISK_TYPES } from "@/lib/bluetech-data";

export interface AnalysisResult {
  jenis: string;
  jenisLabel: string;
  kedalaman: string;
  variant: number;
  score: number;
  category: string;
  batimetri: boolean;
  ekosistem: boolean;
}

const JENIS_OPTIONS = [
  { value: "pariwisata", label: "Pariwisata Bahari", icon: Waves, bonus: 8 },
  { value: "mitigasi-bencana", label: "Mitigasi Bencana", icon: ShieldAlert, bonus: 12 },
];

const KEDALAMAN_OPTIONS = ["5 m", "10 m", "15 m", "20 m"];

export function categorize(score: number): string {
  if (score >= 80) return "Sangat Sesuai";
  if (score >= 65) return "Cukup Sesuai";
  if (score >= 50) return "Sesuai Bersyarat";
  return "Tidak Sesuai";
}

interface QuickAnalysisProps {
  onResult: (r: AnalysisResult) => void;
  onRiskTab: (riskId: string) => void;
}

export function QuickAnalysis({ onResult, onRiskTab }: QuickAnalysisProps) {
  const { toast } = useToast();
  const [tab, setTab] = useState<"kesesuaian" | "risiko">("kesesuaian");
  const [jenis, setJenis] = useState(JENIS_OPTIONS[0]);
  const [kedalaman, setKedalaman] = useState("10 m");
  const [batimetri, setBatimetri] = useState(true);
  const [ekosistem, setEkosistem] = useState(false);
  const [jenisRisiko, setJenisRisiko] = useState(RISK_TYPES[0]);
  const [radius, setRadius] = useState("5 km");
  const [loading, setLoading] = useState(false);

  const run = () => {
    setLoading(true);
    const depthVal = parseInt(kedalaman);
    const score = Math.min(
      96,
      Math.round(58 + (depthVal - 5) * 1.4 + jenis.bonus + (batimetri ? 4 : 0) + (ekosistem ? 3 : 0))
    );
    setTimeout(() => {
      onResult({
        jenis: jenis.value,
        jenisLabel: jenis.label,
        kedalaman,
        variant: Math.abs(score) % 5,
        score,
        category: categorize(score),
        batimetri,
        ekosistem,
      });
      setLoading(false);
      toast({
        title: "Analisis selesai",
        description: `Kesesuaian ${jenis.label} (≥ ${kedalaman}) telah diperbarui. Skor: ${score}.`,
      });
    }, 900);
  };

  const runRisk = () => {
    setLoading(true);
    setTimeout(() => {
      onRiskTab(jenisRisiko.id);
      setLoading(false);
      toast({
        title: "Analisis risiko selesai",
        description: `Analisis ${jenisRisiko.label} radius ${radius} diperbarui — Risiko ${jenisRisiko.level}.`,
      });
    }, 900);
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-cream-300 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2.5">
        <BarChart3 className="h-5 w-5 text-ocean-700" strokeWidth={2.2} />
        <h3 className="text-[16px] font-bold text-ocean-900">Analisis Cepat</h3>
      </div>

      {/* Tabs */}
      <div className="mt-2 flex gap-5 border-b border-cream-300">
        {(
          [
            { id: "kesesuaian", label: "Kesesuaian Lokasi" },
            { id: "risiko", label: "Risiko Bencana" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative pb-2 text-[13.5px] transition-colors ${
              tab === t.id ? "font-semibold text-ocean-600" : "font-medium text-ocean-500/85 hover:text-ocean-800"
            }`}
          >
            {t.label}
            {tab === t.id && <span className="absolute inset-x-0 -bottom-px h-[2.5px] rounded-full bg-ocean-600" />}
          </button>
        ))}
      </div>

      {tab === "kesesuaian" ? (
        <div className="mt-4 flex flex-1 flex-col gap-3.5">
          <div>
            <label className="text-[13px] font-medium text-ocean-800">Jenis Pemanfaatan</label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="mt-1.5 flex h-11 w-full items-center gap-2.5 rounded-lg border border-cream-300 px-3 text-left hover:border-ocean-300">
                  <jenis.icon className="h-[18px] w-[18px] text-ocean-500/85" />
                  <span className="flex-1 text-[13.5px] text-ocean-800">{jenis.label}</span>
                  <ChevronDown className="h-4 w-4 text-ocean-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 rounded-lg">
                {JENIS_OPTIONS.map((o) => (
                  <DropdownMenuItem key={o.value} onClick={() => setJenis(o)} className="gap-2 text-[13.5px]">
                    <o.icon className="h-4 w-4 text-ocean-500/85" /> {o.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div>
            <label className="text-[13px] font-medium text-ocean-800">Kedalaman Minimum</label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="mt-1.5 flex h-11 w-full items-center gap-2.5 rounded-lg border border-cream-300 px-3 text-left hover:border-ocean-300">
                  <Waves className="h-[18px] w-[18px] text-ocean-500/85" />
                  <span className="flex-1 text-[13.5px] text-ocean-800">{kedalaman}</span>
                  <ChevronDown className="h-4 w-4 text-ocean-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 rounded-lg">
                {KEDALAMAN_OPTIONS.map((d) => (
                  <DropdownMenuItem key={d} onClick={() => setKedalaman(d)} className="gap-2 text-[13.5px]">
                    <Waves className="h-4 w-4 text-ocean-500/85" /> {d}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-col gap-2.5">
            <label className="flex cursor-pointer items-center gap-2.5">
              <Checkbox
                checked={batimetri}
                onCheckedChange={(v) => setBatimetri(!!v)}
                className="data-[state=checked]:border-ocean-600 data-[state=checked]:bg-ocean-600"
              />
              <span className="text-[13.5px] text-ocean-800">Batimetri</span>
            </label>
            <label className="flex cursor-not-allowed items-center gap-2.5 opacity-60" title="Data arus & gelombang otomatis diikutkan dari sensor">
              <Checkbox checked disabled className="data-[state=checked]:border-reef-500 data-[state=checked]:bg-reef-500" />
              <span className="text-[13.5px] text-ocean-500/85">Arus &amp; Gelombang</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2.5">
              <Checkbox
                checked={ekosistem}
                onCheckedChange={(v) => setEkosistem(!!v)}
                className="data-[state=checked]:border-ocean-600 data-[state=checked]:bg-ocean-600"
              />
              <span className="text-[13.5px] text-ocean-800">Ekosistem</span>
            </label>
          </div>

          <button
            onClick={run}
            disabled={loading}
            className="mt-auto flex h-11 w-full items-center justify-center gap-2 rounded-lg btn-hero text-[14px] font-semibold text-white shadow-sm transition-colors disabled:opacity-70"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Proses Analisis
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-1 flex-col gap-3.5">
          <div>
            <label className="text-[13px] font-medium text-ocean-800">Jenis Bencana</label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="mt-1.5 flex h-11 w-full items-center gap-2.5 rounded-lg border border-cream-300 px-3 text-left hover:border-ocean-300">
                  <Siren className="h-[18px] w-[18px] text-ocean-500/85" />
                  <span className="flex-1 text-[13.5px] text-ocean-800">{jenisRisiko.label}</span>
                  <ChevronDown className="h-4 w-4 text-ocean-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 rounded-lg">
                {RISK_TYPES.map((r) => (
                  <DropdownMenuItem key={r.id} onClick={() => setJenisRisiko(r)} className="text-[13.5px]">
                    {r.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div>
            <label className="text-[13px] font-medium text-ocean-800">Radius Analisis</label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="mt-1.5 flex h-11 w-full items-center gap-2.5 rounded-lg border border-cream-300 px-3 text-left hover:border-ocean-300">
                  <Waves className="h-[18px] w-[18px] text-ocean-500/85" />
                  <span className="flex-1 text-[13.5px] text-ocean-800">{radius}</span>
                  <ChevronDown className="h-4 w-4 text-ocean-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 rounded-lg">
                {["2 km", "5 km", "10 km", "20 km"].map((r) => (
                  <DropdownMenuItem key={r} onClick={() => setRadius(r)} className="text-[13.5px]">
                    {r}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="rounded-lg bg-blue-50 p-3 text-[12.5px] leading-relaxed text-ocean-600">
            Analisis risiko menggunakan model hidrodinamik terkini dengan data batimetri dan historis kejadian 10 tahun terakhir.
          </p>
          <button
            onClick={runRisk}
            disabled={loading}
            className="mt-auto flex h-11 w-full items-center justify-center gap-2 rounded-lg btn-hero text-[14px] font-semibold text-white shadow-sm transition-colors disabled:opacity-70"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Proses Analisis Risiko
          </button>
        </div>
      )}
    </div>
  );
}
