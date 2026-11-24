"use client";

/* Menu MITIGASI BENCANA — Kawasan Pantai Losari:
   1. Peta Zona Mitigasi Bencana (zona_mitigasi.geojson: Bahaya Tinggi, Sedang,
      Rendah, dan Sempadan Pantai) dengan filter & tooltip hover
   2. Grafik & tabel pasang surut dari kedua CSV (deret 10-menitan & 75 kejadian ekstrem)
   3. Formulir Lapor Masyarakat (dipertahankan, khusus Kawasan Pantai Losari) */

import { useCallback, useEffect, useMemo, useState } from "react";
import type L from "leaflet";
import {
  ArrowDown,
  ArrowUp,
  Info,
  Layers,
  Megaphone,
  MousePointerClick,
  ShieldAlert,
  Waves,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  fetchManifest,
  fetchPasangSurutDeret,
  fetchPasangSurutEkstrem,
  fetchZonaMitigasi,
  formatTanggalSingkat,
  formatTanggalWaktuId,
  type LosariManifest,
  type PasangSurutDeretData,
  type PasangSurutEkstremData,
} from "@/lib/losari-data";
import { LosariMapNoSsr } from "./losari-map-loader";
import { PublicLapor } from "./public-lapor";
import { cn } from "@/lib/utils";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function BagianHeader({
  icon: Icon,
  judul,
  desc,
  warna,
}: {
  icon: React.ElementType;
  judul: string;
  desc: string;
  warna: string;
}) {
  return (
    <div className="flex items-start gap-3.5">
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_6px_14px_-8px_rgba(11,61,95,0.7)]",
          warna,
        )}
      >
        <Icon className="size-5" strokeWidth={2.1} />
      </span>
      <div className="min-w-0">
        <h2 className="text-[18px] font-bold tracking-tight text-foreground">{judul}</h2>
        <p className="mt-0.5 max-w-3xl text-[13px] leading-relaxed text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

export function PublicMitigasi() {
  const [manifest, setManifest] = useState<LosariManifest | null>(null);
  const [mitigasiGeo, setMitigasiGeo] = useState<GeoJSON.FeatureCollection | null>(null);
  const [ekstrem, setEkstrem] = useState<PasangSurutEkstremData | null>(null);
  const [deret, setDeret] = useState<PasangSurutDeretData | null>(null);

  const [aktifZona, setAktifZona] = useState<Record<string, boolean>>({
    "Bahaya Tinggi": true,
    "Bahaya Sedang": true,
    "Bahaya Rendah": true,
    "Sempadan Pantai": true,
  });

  // Kontrol grafik pasang surut
  const [modeGrafik, setModeGrafik] = useState<"30hari" | "harian">("30hari");
  const [tanggalPilih, setTanggalPilih] = useState<string>("2026-11-26");
  const [tampilSeri, setTampilSeri] = useState({ msl: true, lat: true, est: false });
  const [filterJenisPasut, setFilterJenisPasut] = useState<"Semua" | "Pasang" | "Surut">("Semua");

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetchManifest(),
      fetchZonaMitigasi(),
      fetchPasangSurutEkstrem(),
      fetchPasangSurutDeret(),
    ])
      .then(([m, g, e, d]) => {
        if (!mounted) return;
        setManifest(m);
        setMitigasiGeo(g);
        setEkstrem(e);
        setDeret(d);
        if (d.tanggalTersedia.length > 0 && !d.tanggalTersedia.includes("2026-11-26")) {
          setTanggalPilih(d.tanggalTersedia[0]);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const filteredGeo = useMemo<GeoJSON.FeatureCollection | null>(() => {
    if (!mitigasiGeo) return null;
    return {
      ...mitigasiGeo,
      features: mitigasiGeo.features.filter(
        (f) => aktifZona[String(f.properties?.zona_mitigasi_bencana ?? "")] !== false,
      ),
    };
  }, [mitigasiGeo, aktifZona]);

  const geoKey = useMemo(
    () =>
      Object.entries(aktifZona)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join("|"),
    [aktifZona],
  );

  const geojsonStyle = useCallback((feature?: GeoJSON.Feature): L.PathOptions => {
    const warna = (feature?.properties?.warna as string) || "#0284c7";
    const isSempadan = feature?.properties?.zona_mitigasi_bencana === "Sempadan Pantai";
    return {
      color: warna,
      fillColor: warna,
      weight: isSempadan ? 2 : 1.6,
      dashArray: isSempadan ? "5 4" : undefined,
      opacity: 0.95,
      fillOpacity: isSempadan ? 0.35 : 0.5,
    };
  }, []);

  const geojsonHoverTooltip = useCallback((feature: GeoJSON.Feature): string => {
    const p = feature.properties || {};
    const nama = escapeHtml(String(p.zona_mitigasi_bencana ?? "-"));
    const warna = escapeHtml(String(p.warna ?? "#ef4444"));
    const luasHa = Number(p.luas_ha ?? 0).toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const ringkas = escapeHtml(String(p.ringkas ?? ""));
    const arahan = escapeHtml(String(p.arahan ?? ""));
    return `
      <div style="font-family:var(--font-sans),sans-serif;line-height:1.45;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${warna};flex-shrink:0;"></span>
          <strong style="font-size:13px;color:#072c47;">${nama}</strong>
        </div>
        <div style="font-size:11px;font-weight:600;color:#146795;margin-bottom:5px;">
          Luas Area: ${luasHa} Ha
        </div>
        <p style="margin:0 0 5px;font-size:11.5px;color:#0b3d5f;">${ringkas}</p>
        <p style="margin:0;font-size:11px;color:#3f6b8d;"><b>Arahan:</b> ${arahan}</p>
      </div>
    `;
  }, []);

  // Data grafik pasang surut sesuai mode 30 hari (per jam) atau harian (per 10 menit)
  const chartData = useMemo(() => {
    if (!deret) return [];
    if (modeGrafik === "30hari") {
      return deret.perJam.map((p) => ({
        label: formatTanggalSingkat(p.full.slice(0, 10)),
        waktuPenuh: p.full,
        est: p.est,
        msl: p.msl,
        lat: p.lat,
      }));
    }
    return deret.lengkap
      .filter((row) => row[0].startsWith(tanggalPilih))
      .map((row) => ({
        label: row[0].slice(11, 16),
        waktuPenuh: row[0],
        est: row[1],
        msl: row[2],
        lat: row[3],
      }));
  }, [deret, modeGrafik, tanggalPilih]);

  const ekstremFiltered = useMemo(() => {
    if (!ekstrem) return [];
    if (filterJenisPasut === "Semua") return ekstrem.data;
    return ekstrem.data.filter((r) => r.jenis === filterJenisPasut);
  }, [ekstrem, filterJenisPasut]);

  const zonaRingkasan = manifest?.vectors.ringkasan.zonaMitigasi ?? [];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-9 px-4 py-7 md:px-6 md:py-9">
      {/* Kepala halaman */}
      <section className="flex flex-col gap-2">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-[11.5px] font-semibold text-destructive">
          <ShieldAlert className="size-3.5" />
          Kawasan Pantai Losari · Mitigasi &amp; Pasang Surut
        </span>
        <h1 className="text-[23px] font-bold tracking-tight text-foreground md:text-[26px]">
          Mitigasi Bencana Pesisir
        </h1>
        <p className="max-w-3xl text-[13.5px] leading-relaxed text-muted-foreground">
          Peta zonasi mitigasi bencana (Bahaya Tinggi, Sedang, Rendah, serta Sempadan Pantai),
          data pasang surut pesisir periode 21 November – 20 Desember 2026, serta layanan partisipasi
          pelaporan kondisi pesisir untuk warga sekitar Kawasan Pantai Losari.
        </p>
      </section>

      {/* ===== Bagian 1: Peta Zona Mitigasi ===== */}
      <section className="flex flex-col gap-4">
        <BagianHeader
          icon={Layers}
          judul="Peta Zona Mitigasi Bencana"
          desc="Distribusi spasial 4 zona mitigasi hasil pengolahan data kebencanaan di Kawasan Pantai Losari. Arahkan kursor ke area peta untuk membaca luas dan arahan mitigasi."
          warna="bg-[linear-gradient(135deg,#0B3D5F,#1686C5)]"
        />

        <div className="pub-card flex flex-col gap-3 rounded-2xl p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <MousePointerClick className="size-3.5 text-primary" />
              Klik tombol zona untuk menyalakan/mematikan layer di peta:
            </p>
            <div className="flex flex-wrap gap-2">
              {zonaRingkasan.map((z) => {
                const on = aktifZona[z.zona] !== false;
                return (
                  <button
                    key={z.zona}
                    type="button"
                    onClick={() => setAktifZona((prev) => ({ ...prev, [z.zona]: !on }))}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[12px] font-semibold transition-colors",
                      on
                        ? "border-foreground/25 bg-card text-foreground shadow-xs"
                        : "border-border/70 bg-secondary/50 text-muted-foreground opacity-65",
                    )}
                  >
                    <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: z.warna }} />
                    {z.zona}
                  </button>
                );
              })}
            </div>
          </div>

          <LosariMapNoSsr
            height="500px"
            geojson={filteredGeo}
            geojsonKey={`mitigasi-${geoKey}`}
            geojsonStyle={geojsonStyle}
            geojsonHoverTooltip={geojsonHoverTooltip}
            bottomRightSlot={
              <div className="rounded-xl border border-border/80 bg-white/95 p-3 shadow-md backdrop-blur-sm dark:bg-ocean-900/95">
                <p className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
                  Legenda Zona Mitigasi
                </p>
                <div className="mt-2 flex flex-col gap-1.5 text-[11.5px] text-foreground">
                  {zonaRingkasan.map((z) => (
                    <span key={z.zona} className="flex items-center gap-2">
                      <span className="h-2.5 w-4 rounded-[3px]" style={{ backgroundColor: z.warna }} />
                      {z.zona} ({z.luasHa.toLocaleString("id-ID")} Ha)
                    </span>
                  ))}
                </div>
              </div>
            }
          />
        </div>

        {/* Kartu arahan per zona mitigasi */}
        <div className="grid gap-4 md:grid-cols-2">
          {zonaRingkasan.map((z) => (
            <article key={z.zona} className="pub-card flex flex-col gap-2.5 rounded-2xl p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-[15px] font-bold text-foreground">
                  <span className="size-3 rounded-[4px]" style={{ backgroundColor: z.warna }} />
                  {z.zona}
                </span>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 font-mono text-[11.5px] font-semibold text-foreground">
                  {z.luasHa.toLocaleString("id-ID")} Ha
                </span>
              </div>
              <p className="text-[13px] leading-relaxed text-foreground/90">{z.ringkas}</p>
              <p className="mt-auto rounded-xl bg-secondary/70 p-3 text-[12px] leading-relaxed text-muted-foreground">
                <b className="text-foreground">Arahan mitigasi:</b> {z.arahan}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ===== Bagian 2: Data Pasang Surut (Kedua CSV) ===== */}
      <section className="flex flex-col gap-4">
        <BagianHeader
          icon={Waves}
          judul="Pemantauan Pasang Surut Pesisir (21 Nov – 20 Des 2026)"
          desc="Visualisasi deret waktu muka air laut interval 10 menit (4.320 catatan) dan daftar 75 kejadian puncak pasang serta lembah surut."
          warna="bg-[linear-gradient(135deg,#0f507a,#1e9c80)]"
        />

        {/* Ringkasan angka pasang surut */}
        {ekstrem && deret ? (
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <article className="pub-card rounded-2xl p-4">
              <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-muted-foreground">
                <ArrowUp className="size-3.5 text-ocean-600" />
                Pasang Tertinggi (MSL)
              </p>
              <p className="mt-1.5 text-[22px] font-bold text-foreground tabular-nums">
                +{ekstrem.ringkasan.pasangTertinggi.ketinggian.toFixed(2)} m
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {formatTanggalWaktuId(ekstrem.ringkasan.pasangTertinggi.waktu)}
              </p>
            </article>

            <article className="pub-card rounded-2xl p-4">
              <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-muted-foreground">
                <ArrowDown className="size-3.5 text-reef-600" />
                Surut Terendah (MSL)
              </p>
              <p className="mt-1.5 text-[22px] font-bold text-foreground tabular-nums">
                {ekstrem.ringkasan.surutTerendah.ketinggian.toFixed(2)} m
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {formatTanggalWaktuId(ekstrem.ringkasan.surutTerendah.waktu)}
              </p>
            </article>

            <article className="pub-card rounded-2xl p-4">
              <p className="text-[11.5px] font-semibold text-muted-foreground">Rentang Elevasi LAT</p>
              <p className="mt-1.5 text-[22px] font-bold text-foreground tabular-nums">
                {deret.rentang.lat[0].toFixed(2)} – {deret.rentang.lat[1].toFixed(2)} m
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                EST: {deret.rentang.est[0].toFixed(2)} – {deret.rentang.est[1].toFixed(2)} m
              </p>
            </article>

            <article className="pub-card rounded-2xl p-4">
              <p className="text-[11.5px] font-semibold text-muted-foreground">Total Kejadian Ekstrem</p>
              <p className="mt-1.5 text-[22px] font-bold text-foreground tabular-nums">
                {ekstrem.ringkasan.totalKejadian}{" "}
                <span className="text-[13px] font-medium text-muted-foreground">titik</span>
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {ekstrem.ringkasan.jumlahPasang} Pasang · {ekstrem.ringkasan.jumlahSurut} Surut
              </p>
            </article>
          </div>
        ) : null}

        {/* Grafik deret waktu (pasang_surut_tertinggi.csv) */}
        <div className="pub-card flex flex-col gap-4 rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-bold text-foreground">
                Kurva Pasang Surut ({modeGrafik === "30hari" ? "Ringkasan 30 Hari · Per Jam" : `Detail ${formatTanggalSingkat(tanggalPilih)} · Tiap 10 Menit`})
              </h3>
              <p className="text-[12px] text-muted-foreground">
                Sumber: <code className="text-[11px]">pasang_surut_tertinggi.csv</code> (4.320 catatan)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl border border-border bg-secondary/50 p-0.5">
                <button
                  type="button"
                  onClick={() => setModeGrafik("30hari")}
                  className={cn(
                    "rounded-lg px-3 py-1 text-[12px] font-semibold transition-colors",
                    modeGrafik === "30hari"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  30 Hari
                </button>
                <button
                  type="button"
                  onClick={() => setModeGrafik("harian")}
                  className={cn(
                    "rounded-lg px-3 py-1 text-[12px] font-semibold transition-colors",
                    modeGrafik === "harian"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Detail Harian (10 mnt)
                </button>
              </div>

              {modeGrafik === "harian" && deret ? (
                <select
                  value={tanggalPilih}
                  onChange={(e) => setTanggalPilih(e.target.value)}
                  aria-label="Pilih tanggal pasang surut"
                  className="pub-input h-8.5 w-auto rounded-xl px-2.5 text-[12px] font-medium outline-none"
                >
                  {deret.tanggalTersedia.map((tgl) => (
                    <option key={tgl} value={tgl}>
                      {formatTanggalSingkat(tgl)} 2026
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          </div>

          {/* Pemilih kolom seri */}
          <div className="flex flex-wrap items-center gap-3 text-[12px]">
            <span className="font-semibold text-muted-foreground">Tampilkan kolom:</span>
            {(
              [
                { key: "msl", label: "MSL (m)", color: "#1d80b2" },
                { key: "lat", label: "LAT (m)", color: "#1e9c80" },
                { key: "est", label: "EST (m)", color: "#d97706" },
              ] as const
            ).map((s) => (
              <label key={s.key} className="inline-flex cursor-pointer items-center gap-1.5 font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={tampilSeri[s.key]}
                  onChange={(e) => setTampilSeri((prev) => ({ ...prev, [s.key]: e.target.checked }))}
                  className="accent-primary"
                />
                <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label}
              </label>
            ))}
          </div>

          <div className="h-[300px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-15" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    minTickGap={modeGrafik === "30hari" ? 45 : 24}
                  />
                  <YAxis tick={{ fontSize: 11 }} unit=" m" width={48} />
                  <ReferenceLine y={0} stroke="#64748b" strokeDasharray="4 4" />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #b7d8ec",
                      fontSize: "12px",
                    }}
                    labelFormatter={(_, payload) => {
                      const full = payload?.[0]?.payload?.waktuPenuh;
                      return full ? formatTanggalWaktuId(String(full)) : "";
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  {tampilSeri.est ? (
                    <Area
                      type="monotone"
                      dataKey="est"
                      name="EST (m)"
                      stroke="#d97706"
                      fill="#f59e0b"
                      fillOpacity={0.1}
                      strokeWidth={1.8}
                      dot={false}
                    />
                  ) : null}
                  {tampilSeri.lat ? (
                    <Area
                      type="monotone"
                      dataKey="lat"
                      name="LAT (m)"
                      stroke="#1e9c80"
                      fill="#1e9c80"
                      fillOpacity={0.14}
                      strokeWidth={1.8}
                      dot={false}
                    />
                  ) : null}
                  {tampilSeri.msl ? (
                    <Area
                      type="monotone"
                      dataKey="msl"
                      name="MSL (m)"
                      stroke="#1d80b2"
                      fill="#1d80b2"
                      fillOpacity={0.18}
                      strokeWidth={2}
                      dot={false}
                    />
                  ) : null}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-[13px] text-muted-foreground">
                Memuat grafik pasang surut...
              </div>
            )}
          </div>
        </div>

        {/* Tabel 75 kejadian puncak Pasang & lembah Surut (pasang_surut_terendah.csv) */}
        <div className="pub-card flex flex-col gap-3 rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div>
              <h3 className="text-[15px] font-bold text-foreground">
                Jadwal Puncak Pasang &amp; Lembah Surut
              </h3>
              <p className="text-[12px] text-muted-foreground">
                Sumber: <code className="text-[11px]">pasang_surut_terendah.csv</code> ({ekstremFiltered.length} baris ditampilkan)
              </p>
            </div>
            <div className="flex gap-1.5">
              {(["Semua", "Pasang", "Surut"] as const).map((j) => (
                <button
                  key={j}
                  type="button"
                  onClick={() => setFilterJenisPasut(j)}
                  className={cn(
                    "rounded-xl border px-3 py-1 text-[12px] font-semibold transition-colors",
                    filterJenisPasut === j
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {j}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto rounded-xl border border-border/70">
            <table className="w-full border-collapse text-left text-[12.5px]">
              <thead className="sticky top-0 bg-secondary/95 text-[11.5px] text-muted-foreground backdrop-blur-sm">
                <tr>
                  <th className="px-3.5 py-2.5 font-semibold">Waktu</th>
                  <th className="px-3.5 py-2.5 font-semibold">Ketinggian (m MSL)</th>
                  <th className="px-3.5 py-2.5 font-semibold">Jenis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {ekstremFiltered.map((r) => (
                  <tr key={`${r.waktu}-${r.jenis}`} className="hover:bg-secondary/40">
                    <td className="px-3.5 py-2 font-medium text-foreground">
                      {formatTanggalWaktuId(r.waktu)}
                    </td>
                    <td className="px-3.5 py-2 font-mono font-semibold tabular-nums text-foreground">
                      {r.ketinggian > 0 ? `+${r.ketinggian.toFixed(2)}` : r.ketinggian.toFixed(2)} m
                    </td>
                    <td className="px-3.5 py-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                          r.jenis === "Pasang"
                            ? "bg-ocean-500/12 text-ocean-700 dark:text-ocean-200"
                            : "bg-reef-500/12 text-reef-700 dark:text-reef-200",
                        )}
                      >
                        {r.jenis === "Pasang" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                        {r.jenis}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="flex items-start gap-2 text-[11.5px] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0 text-info" />
            <span>
              Ketinggian pada tabel di atas mengacu pada kolom <b>MSL</b> (Mean Sea Level). Untuk
              peringatan dini operasional di lapangan, tetap rujuk kanal resmi <b>BMKG</b> dan{" "}
              <b>BPBD Kota Makassar</b>.
            </span>
          </p>
        </div>
      </section>

      {/* ===== Bagian 3: Lapor Masyarakat (dipertahankan untuk Kawasan Pantai Losari) ===== */}
      <section className="flex flex-col gap-4">
        <BagianHeader
          icon={Megaphone}
          judul="Lapor Masyarakat — Kawasan Pantai Losari"
          desc="Laporkan kejadian abrasi, genangan, gelombang tinggi, kerusakan fasilitas pantai, atau sampah pesisir di sekitar Kawasan Pantai Losari."
          warna="bg-[linear-gradient(135deg,#1e9c80,#3cb899)]"
        />
        <PublicLapor />
      </section>
    </div>
  );
}
