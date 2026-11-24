"use client";

import { useState } from "react";
import { Braces, Gauge, Loader2, ServerCog, Sigma, TriangleAlert } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";

/* ------------------------------------------------------------------ */
/* PythonSensitivityCard — Monte Carlo uncertainty via /api/mcda      */
/* (engine: python3 + NumPy, lihat python/mcda_engine.py)             */
/* ------------------------------------------------------------------ */

interface McdaResponse {
  engine: string;
  numpyVersion: string;
  nIter: number;
  nCells: number;
  nCrit: number;
  sigma: number;
  agreement: { meanDiff: number; maxDiff: number; pctWithin1: number };
  global: {
    mean: number;
    std: number;
    ci95: number;
    s1ShareMean: number;
    s1ShareStd: number;
    hist: { bins: number[]; counts: number[] };
  };
  classProbMean: Record<"S1" | "S2" | "S3" | "N", number>;
  stabilityMean: number;
  stabilityMin: number;
  sensitivity: { id: string; label: string; sens: number; norm: number }[];
  unstableCells: { lat?: number; lon?: number; stability: number; probS1: number; probS2: number; probS3: number; probN: number }[];
  meta?: { configLabel: string; kedalamanMin: number; areaKm2: number };
  error?: string;
}

const CLASS_COLOR: Record<string, string> = {
  S1: "#1e9c80",
  S2: "#1d80b2",
  S3: "#d4b876",
  N: "#e86a5e",
};

export function PythonSensitivityCard({ configId, kedalamanMin, disabled }: { configId: string; kedalamanMin: number; disabled?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<McdaResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/mcda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configId, kedalamanMin, nIter: 3000 }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      setRes(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal memanggil engine Python");
    } finally {
      setLoading(false);
    }
  };

  const histData =
    res?.global.hist.bins.slice(0, -1).map((b, i) => ({
      bin: Math.round(b),
      frek: res.global.hist.counts[i],
    })) ?? [];

  return (
    <div className="card-marine card-lift overflow-hidden">
      {/* header — python identity */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cream-200 bg-[linear-gradient(92deg,#041d30,#0b3d5f_55%,#0c4a40)] px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-reef-300 ring-1 ring-white/15">
            <ServerCog className="h-5 w-5" />
          </span>
          <div>
            <h3 className="flex items-center gap-2 text-[15.5px] font-bold text-cream-50">
              Analisis Sensitivitas Monte Carlo
              <span className="rounded-md bg-reef-500/25 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-reef-200 uppercase ring-1 ring-reef-300/40">
                Python · NumPy
              </span>
            </h3>
            <p className="text-[11.5px] text-ocean-200/85">
              Backend Python memvalidasi mesin JS &amp; menguji ketidakpastian data spasial (3.000 iterasi)
            </p>
          </div>
        </div>
        <button
          onClick={run}
          disabled={loading || disabled}
          className="group relative flex h-10 items-center gap-2 overflow-hidden rounded-lg bg-[linear-gradient(92deg,#1e9c80,#3cb899)] px-4 text-[13px] font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Braces className="h-4 w-4" />}
          {loading ? "Menghitung di Python…" : res ? "Hitung Ulang" : "Jalankan Engine Python"}
        </button>
      </div>

      <div className="p-5">
        {!res && !err && !loading && (
          <p className="rounded-xl border border-dashed border-cream-300 bg-cream-100/50 px-4 py-6 text-center text-[13px] text-ocean-600/80">
            Tekan <b>Jalankan Engine Python</b> — skor kesesuaian akan diuji ulang di sisi server dengan
            <b> NumPy</b> (weighted overlay) lalu disimulasikan <b>3.000× Monte Carlo</b> untuk mengukur
            kestabilan klasifikasi S1–N.
          </p>
        )}

        {err && (
          <div className="flex items-start gap-2 rounded-lg bg-[#fdeeea] p-3 text-[13px] text-coral-600 ring-1 ring-coral-500/25">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Engine Python gagal: {err}
              <span className="mt-1 block text-[11.5px] text-ocean-500">
                Pastikan python3 + numpy tersedia di server.
              </span>
            </span>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-reef-300/70 bg-reef-50/60 px-4 py-6">
            <Loader2 className="h-5 w-5 animate-spin text-reef-600" />
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-ocean-800">Menghubungi engine Python (subprocess)…</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream-200">
                <div className="shimmer-line h-full w-full" />
              </div>
            </div>
          </div>
        )}

        {res && !loading && (
          <div className="flex flex-col gap-4">
            {/* meta chips */}
            <div className="flex flex-wrap gap-2">
              {[
                { icon: Sigma, t: `${res.engine} v${res.numpyVersion}` },
                { icon: Gauge, t: `${res.nIter.toLocaleString("id-ID")} iterasi · ${res.nCells.toLocaleString("id-ID")} sel · σ=${res.sigma}` },
                { icon: ServerCog, t: res.meta ? `${res.meta.configLabel} · ≥${res.meta.kedalamanMin} m · ${res.meta.areaKm2} km²` : "" },
              ].map(
                (c, i) =>
                  c.t && (
                    <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-cream-100 px-3 py-1 text-[11.5px] font-medium text-ocean-800 ring-1 ring-cream-300">
                      <c.icon className="h-3.5 w-3.5 text-reef-600" /> {c.t}
                    </span>
                  ),
              )}
            </div>

            {/* row 1: agreement + stability */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-[linear-gradient(135deg,#eff7fb,#d9edf6)] p-3.5 ring-1 ring-ocean-200/60">
                <p className="text-[11px] font-semibold tracking-wide text-ocean-600 uppercase">Validasi Silang JS ↔ Python</p>
                <p className="mt-1 text-[22px] leading-none font-extrabold text-ocean-800">
                  {res.agreement.meanDiff.toFixed(3)}
                  <span className="ml-1 text-[11px] font-medium text-ocean-600">skor rata² beda</span>
                </p>
                <p className="mt-1.5 text-[11.5px] text-ocean-600/85">
                  Maks {res.agreement.maxDiff.toFixed(2)} · {res.agreement.pctWithin1.toFixed(1)}% sel beda ≤ 1 poin
                </p>
              </div>
              <div className="rounded-xl bg-[linear-gradient(135deg,#ecfaf5,#d0f2e6)] p-3.5 ring-1 ring-reef-200/70">
                <p className="text-[11px] font-semibold tracking-wide text-reef-700 uppercase">Stabilitas Kesimpulan</p>
                <p className="mt-1 text-[22px] leading-none font-extrabold text-reef-800">
                  {(res.stabilityMean * 100).toFixed(1)}
                  <span className="ml-1 text-[11px] font-medium text-reef-700">% rata-rata prob. kelas dominan</span>
                </p>
                <p className="mt-1.5 text-[11.5px] text-reef-700/85">
                  Sel paling goyah: {(res.stabilityMin * 100).toFixed(1)}%
                </p>
              </div>
              <div className="rounded-xl bg-[linear-gradient(135deg,#faf4e4,#f5ecd4)] p-3.5 ring-1 ring-cream-300">
                <p className="text-[11px] font-semibold tracking-wide text-[#8a6d1f] uppercase">Distribusi S1 (Monte Carlo)</p>
                <p className="mt-1 text-[22px] leading-none font-extrabold text-[#8a6d1f]">
                  {(res.global.s1ShareMean * 100).toFixed(1)}
                  <span className="ml-1 text-[11px] font-medium text-[#8a6d1f]">% area ±{(res.global.s1ShareStd * 100).toFixed(1)}%</span>
                </p>
                <p className="mt-1.5 text-[11.5px] text-[#8a6d1f]/85">
                  Rata-rata skor {res.global.mean.toFixed(1)} ± {res.global.ci95.toFixed(2)} (CI95)
                </p>
              </div>
            </div>

            {/* row 2: histogram + class probabilities */}
            <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
              <div className="rounded-xl border border-cream-200 bg-white/70 p-3">
                <p className="mb-1 px-1 text-[12.5px] font-bold text-ocean-900">Sebaran Skor Sel — ±{res.nIter.toLocaleString("id-ID")} Sampel Monte Carlo</p>
                <div className="h-[190px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={histData} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
                      <XAxis dataKey="bin" tick={{ fontSize: 10, fill: "#5b7285" }} tickLine={false} axisLine={{ stroke: "#e7d9b4" }} interval={2} />
                      <YAxis tick={{ fontSize: 10, fill: "#5b7285" }} tickLine={false} axisLine={false} />
                      <Tooltip
                        cursor={{ fill: "rgba(60,184,153,0.08)" }}
                        contentStyle={{ borderRadius: 10, border: "1px solid #e7d9b4", fontSize: 12 }}
                        formatter={(v) => [`${v} iterasi`, "Frekuensi"]}
                        labelFormatter={(l) => `Skor ≈ ${l}`}
                      />
                      <Bar dataKey="frek" radius={[3, 3, 0, 0]}>
                        {histData.map((d, i) => (
                          <Cell key={i} fill={d.bin >= 78 ? "#1e9c80" : d.bin >= 62 ? "#1d80b2" : d.bin >= 47 ? "#d4b876" : "#e86a5e"} />
                        ))}
                      </Bar>
                      <ReferenceLine x={78} stroke="#0b3d5f" strokeDasharray="4 4" label={{ value: "S1", fontSize: 10, fill: "#0b3d5f", position: "top" }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-xl border border-cream-200 bg-white/70 p-3">
                <p className="mb-2 px-1 text-[12.5px] font-bold text-ocean-900">Peluang Kelas per Sel (rata-rata)</p>
                <div className="flex flex-col gap-2.5 px-1">
                  {(["S1", "S2", "S3", "N"] as const).map((k) => (
                    <div key={k} className="flex items-center gap-2">
                      <span className="w-7 shrink-0 rounded-md px-1 py-0.5 text-center text-[10.5px] font-extrabold text-white" style={{ backgroundColor: CLASS_COLOR[k] }}>
                        {k}
                      </span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-cream-200/70">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${res.classProbMean[k] * 100}%`, backgroundColor: CLASS_COLOR[k] }} />
                      </div>
                      <span className="w-11 text-right text-[11px] font-bold" style={{ color: CLASS_COLOR[k] }}>
                        {(res.classProbMean[k] * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 rounded-lg bg-cream-100 px-2.5 py-2 text-[11px] leading-relaxed text-ocean-600">
                  Semakin tinggi peluang kelas dominan, semakin mantap rekomendasi zonasi terhadap ketidakpastian data.
                </p>
              </div>
            </div>

            {/* row 3: sensitivity ranking + unstable cells */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-cream-200 bg-white/70 p-3">
                <p className="mb-2 px-1 text-[12.5px] font-bold text-ocean-900">Sensitivitas Kriteria (σ kontribusi)</p>
                <div className="flex flex-col gap-1.5 px-1">
                  {res.sensitivity.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <span className="w-4 text-right text-[10px] font-bold text-ocean-400">{i + 1}</span>
                      <span className="w-32 shrink-0 truncate text-[11.5px] text-ocean-700">{s.label}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream-200/70">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#146795,#3cb899)] transition-all duration-700"
                          style={{ width: `${s.norm}%` }}
                        />
                      </div>
                      <span className="w-9 text-right text-[10.5px] font-semibold text-ocean-600">{s.sens.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-cream-200 bg-white/70 p-3">
                <p className="mb-2 px-1 text-[12.5px] font-bold text-ocean-900">Sel Paling Goya (perlu survei lanjutan)</p>
                <div className="max-h-[150px] overflow-y-auto pr-1">
                  <table className="w-full text-[11.5px]">
                    <thead>
                      <tr className="text-left text-[10.5px] text-ocean-500/80">
                        <th className="pb-1 font-semibold">Koordinat</th>
                        <th className="pb-1 font-semibold">Stabilitas</th>
                        <th className="pb-1 font-semibold">Kelas dominan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {res.unstableCells.slice(0, 6).map((c, i) => {
                        const probs: [string, number][] = [
                          ["S1", c.probS1],
                          ["S2", c.probS2],
                          ["S3", c.probS3],
                          ["N", c.probN],
                        ];
                        const dom = probs.reduce((a, b) => (b[1] > a[1] ? b : a));
                        return (
                          <tr key={i} className="border-t border-cream-200/70">
                            <td className="py-1.5 font-mono text-[10.5px] text-ocean-700">
                              {c.lat?.toFixed(3)}°, {c.lon?.toFixed(3)}°
                            </td>
                            <td className="py-1.5 font-semibold text-coral-600">{(c.stability * 100).toFixed(1)}%</td>
                            <td className="py-1.5">
                              <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: CLASS_COLOR[dom[0]] }}>
                                {dom[0]} {(dom[1] * 100).toFixed(0)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <p className="text-[11px] leading-relaxed text-ocean-500/80">
              ⚙️ Perhitungan dilakukan di server oleh <b>python/mcda_engine.py</b> (NumPy matmul + Monte Carlo
              vektorisasi) yang dipanggil Next.js API <code className="rounded bg-cream-100 px-1">/api/mcda</code>.
              Data tetap bersifat DEMO — bukan hasil kajian resmi.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
