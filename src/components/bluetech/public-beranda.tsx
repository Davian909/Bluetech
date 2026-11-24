"use client";

/* Menu BERANDA — disusun sesuai spesifikasi antarmuka publik:
   1. Paling atas: ringkasan yang menjelaskan apa itu Bluetech (Kawasan Pantai
      Losari) beserta daftar ringkasan seluruh menu yang tersedia.
   2. Di bawahnya: ringkasan isi nyata dari seluruh menu lainnya (Peta Interaktif,
      Zona Potensial Wisata, Mitigasi Bencana & Pasang Surut, serta Edukasi Mitigasi). */

import { useEffect, useState } from "react";
import {
  BookOpenCheck,
  ChevronRight,
  Compass,
  Database,
  GraduationCap,
  Layers,
  Map as MapIcon,
  MapPin,
  ShieldAlert,
  Waves,
} from "lucide-react";
import type { MenuKey } from "@/lib/bluetech-data";
import {
  EDUKASI_MITIGASI_LOSARI,
  fetchManifest,
  formatTanggalWaktuId,
  type LosariManifest,
} from "@/lib/losari-data";
import { cn } from "@/lib/utils";

const DAFTAR_MENU: {
  key: MenuKey;
  judul: string;
  desc: string;
  icon: React.ElementType;
}[] = [
  {
    key: "pub-peta",
    judul: "Peta Interaktif",
    desc: "Eksplorasi seluruh 7 output raster bahaya, kelas wisata, dan fasilitas umum dalam satu peta.",
    icon: MapIcon,
  },
  {
    key: "pub-pariwisata",
    judul: "Zona Potensial Wisata",
    desc: "Zonasi potensi wisata kelas Tinggi, Sedang, Rendah dengan deskripsi hover & 8 titik atraksi.",
    icon: Compass,
  },
  {
    key: "pub-mitigasi",
    judul: "Mitigasi Bencana",
    desc: "Peta zona mitigasi & sempadan pantai, grafik pasang surut, serta formulir Lapor Masyarakat.",
    icon: ShieldAlert,
  },
  {
    key: "pub-edukasi",
    judul: "Edukasi Mitigasi",
    desc: "Panduan kesiapsiagaan banjir, gelombang & abrasi, cuaca ekstrem, gempa, rob, dan sempadan.",
    icon: GraduationCap,
  },
];

export function PublicBeranda({ onNavigate }: { onNavigate: (key: MenuKey) => void }) {
  const [manifest, setManifest] = useState<LosariManifest | null>(null);
  const [liveRasters, setLiveRasters] = useState<{ id: string; name: string }[] | null>(null);
  const [liveAtraksiCount, setLiveAtraksiCount] = useState<number | null>(null);
  const [liveEdukasi, setLiveEdukasi] = useState<{ id: string; judul: string }[] | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetchManifest(),
      fetch("/api/datasets?public=1", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch("/api/attractions", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch("/api/education", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([m, dsResp, attrResp, eduResp]) => {
        if (!mounted) return;
        setManifest(m);
        if (Array.isArray(dsResp?.items)) {
          const rList = dsResp.items
            .filter((d: { dataType: string }) => d.dataType === "Raster")
            .map((d: { slug: string; name: string }) => ({ id: d.slug, name: d.name }));
          setLiveRasters(rList);
        }
        if (Array.isArray(attrResp?.items)) {
          setLiveAtraksiCount(attrResp.items.length);
        }
        if (Array.isArray(eduResp?.items) && eduResp.items.length > 0) {
          setLiveEdukasi(
            eduResp.items.map((e: { id: string; title: string }) => ({ id: e.id, judul: e.title })),
          );
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const rasters = liveRasters ?? manifest?.rasters.map((r) => ({ id: r.id, name: r.name })) ?? [];
  const zonaWisata = manifest?.vectors.ringkasan.zonaWisata ?? [];
  const atraksiCount = liveAtraksiCount ?? manifest?.vectors.ringkasan.atraksiWisata.length ?? 8;
  const edukasiList =
    liveEdukasi ?? EDUKASI_MITIGASI_LOSARI.map((m) => ({ id: m.id, judul: m.judul }));
  const zonaMitigasi = manifest?.vectors.ringkasan.zonaMitigasi ?? [];
  const pasutEkstrem = manifest?.pasangSurut.ringkasan.ekstrem;
  const totalWisataHa = zonaWisata.reduce((s, z) => s + z.luasHa, 0);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-7 md:px-6 md:py-9">
      {/* ===== 1. PALING ATAS: Penjelasan Apa Itu Bluetech + Daftar Ringkasan Menu ===== */}
      <section className="pub-hero relative overflow-hidden rounded-3xl p-6 md:p-8">
        <Waves
          aria-hidden
          className="pointer-events-none absolute -top-10 -right-8 size-52 rotate-12 text-white/8"
          strokeWidth={1.1}
        />

        <div className="relative flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold tracking-wide text-white backdrop-blur-sm">
              <MapPin className="size-3.5" />
              KAWASAN PANTAI LOSARI · KOTA MAKASSAR
            </span>
            <h1 className="max-w-3xl text-[25px] leading-tight font-bold text-white md:text-[32px]">
              Bluetech — WebGIS Perencanaan Ruang Laut &amp; Mitigasi Bencana Pesisir
            </h1>
            <p className="max-w-3xl text-[14px] leading-relaxed text-white/88 md:text-[15px]">
              <b className="text-white">Bluetech</b> adalah sistem informasi geografis berbasis web
              yang mengintegrasikan pemetaan <b className="text-white">potensi wisata pesisir</b>{" "}
              dan <b className="text-white">mitigasi kebencanaan</b> untuk wilayah studi{" "}
              <b className="text-white">Kawasan Pantai Losari</b>. Platform ini menyajikan hasil
              pengolahan data spasial dari <b className="text-white">inaRISK, BIG, OSM, dan BMKG</b>{" "}
              ke dalam peta interaktif yang mudah dipahami masyarakat maupun pengelola.
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px] text-white/80">
              <span className="inline-flex items-center gap-1.5">
                <Layers className="size-3.5" /> {rasters.length || 7} Output Raster Aktif
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Database className="size-3.5" /> 3 Layer Vektor GeoJSON &amp; 2 Data Pasang Surut
              </span>
            </div>
          </div>

          {/* Daftar ringkasan seluruh menu langsung di bagian atas */}
          <div className="border-t border-white/20 pt-5">
            <p className="mb-3 text-[11.5px] font-bold uppercase tracking-wider text-white/75">
              Daftar Menu Utama Bluetech
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {DAFTAR_MENU.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => onNavigate(m.key)}
                    className="group flex flex-col rounded-2xl bg-white/12 p-4 text-left ring-1 ring-white/22 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/20"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex size-9 items-center justify-center rounded-xl bg-white/20 text-white">
                        <Icon className="size-4.5" strokeWidth={2.1} />
                      </span>
                      <ChevronRight className="size-4 text-white/75 transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <span className="mt-3 text-[14px] font-bold text-white">{m.judul}</span>
                    <span className="mt-1 text-[12px] leading-snug text-white/80">{m.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ===== 2. DI BAWAHNYA: Ringkasan Isi dari Seluruh Menu Lainnya ===== */}
      <section className="flex flex-col gap-5">
        <div>
          <h2 className="text-[19px] font-bold tracking-tight text-foreground">
            Ringkasan Informasi Setiap Menu
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Ikhtisar data utama dari Peta Interaktif, Zona Potensial Wisata, Mitigasi Bencana, dan
            Edukasi Mitigasi pada Kawasan Pantai Losari.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Ringkasan Menu 1: Peta Interaktif */}
          <article className="pub-card flex flex-col rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-ocean-500/12 text-ocean-600 dark:text-ocean-200">
                  <MapIcon className="size-5" />
                </span>
                <div>
                  <h3 className="text-[15.5px] font-bold text-foreground">Peta Interaktif</h3>
                  <p className="text-[12px] text-muted-foreground">
                    {rasters.length || 7} layer raster aktif dalam 1 peta (OSM &amp; Satelit Esri)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("pub-peta")}
                className="inline-flex items-center gap-0.5 text-[12.5px] font-semibold text-primary hover:underline"
              >
                Buka <ChevronRight className="size-3.5" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {(rasters.length > 0
                ? rasters
                : [
                    { id: "1", name: "Bahaya Terpadu" },
                    { id: "2", name: "Kelas Potensi Wisata" },
                    { id: "3", name: "Bahaya Banjir" },
                    { id: "4", name: "Gelombang & Abrasi" },
                    { id: "5", name: "Cuaca Ekstrem" },
                    { id: "6", name: "Gempa Bumi" },
                    { id: "7", name: "Fasilitas Umum" },
                  ]
              ).map((r) => (
                <span
                  key={r.id}
                  className="rounded-lg bg-secondary px-2.5 py-1 text-[11.5px] font-medium text-foreground/90"
                >
                  {r.name}
                </span>
              ))}
            </div>

            <p className="mt-4 text-[12.5px] leading-relaxed text-muted-foreground">
              Seluruh layer raster sudah diselaraskan ke sistem koordinat <b>WGS 84 (EPSG:4326)</b>{" "}
              dan dipotong ke area studi Kawasan Pantai Losari, lengkap dengan pengatur transparansi
              dan legenda masing-masing.
            </p>
          </article>

          {/* Ringkasan Menu 2: Zona Potensial Wisata */}
          <article className="pub-card flex flex-col rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-reef-500/12 text-reef-600 dark:text-reef-200">
                  <Compass className="size-5" />
                </span>
                <div>
                  <h3 className="text-[15.5px] font-bold text-foreground">Zona Potensial Wisata</h3>
                  <p className="text-[12px] text-muted-foreground">
                    3 kelas zonasi (hover tooltip) + {atraksiCount} titik atraksi OSM
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("pub-pariwisata")}
                className="inline-flex items-center gap-0.5 text-[12.5px] font-semibold text-primary hover:underline"
              >
                Buka <ChevronRight className="size-3.5" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-2.5">
              {zonaWisata.map((z) => {
                const pct = totalWisataHa > 0 ? Math.round((z.luasHa / totalWisataHa) * 100) : 0;
                return (
                  <div key={z.kelas} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-semibold text-foreground">Potensi {z.kelas}</span>
                      <span className="font-mono text-muted-foreground">
                        {z.luasHa.toLocaleString("id-ID")} Ha ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: z.warna }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mt-3.5 text-[12px] text-muted-foreground">
              Dilengkapi titik atraksi eksisting seperti Gedung Mulo, Museum Kota Makassar, Patung
              Tedong Bonga, Tugu Sultan Hasanuddin, Patung Macan, dan karya seni pesisir.
            </p>
          </article>

          {/* Ringkasan Menu 3: Mitigasi Bencana */}
          <article className="pub-card flex flex-col rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                  <ShieldAlert className="size-5" />
                </span>
                <div>
                  <h3 className="text-[15.5px] font-bold text-foreground">Mitigasi Bencana</h3>
                  <p className="text-[12px] text-muted-foreground">
                    4 zona mitigasi, data pasang surut, &amp; Lapor Masyarakat
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("pub-mitigasi")}
                className="inline-flex items-center gap-0.5 text-[12.5px] font-semibold text-primary hover:underline"
              >
                Buka <ChevronRight className="size-3.5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {zonaMitigasi.map((z) => (
                <div key={z.zona} className="pub-row flex items-center justify-between gap-2 rounded-xl px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
                    <span className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: z.warna }} />
                    {z.zona}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {z.luasHa.toLocaleString("id-ID")} Ha
                  </span>
                </div>
              ))}
            </div>

            {pasutEkstrem ? (
              <div className="mt-3.5 rounded-xl bg-secondary/70 p-3 text-[12px] leading-relaxed text-muted-foreground">
                <b className="text-foreground">Pasang Surut (21 Nov – 20 Des 2026):</b> Pasang
                tertinggi <b className="text-foreground">+{pasutEkstrem.pasangTertinggi.ketinggian.toFixed(2)} m</b> (
                {formatTanggalWaktuId(pasutEkstrem.pasangTertinggi.waktu)}) dan surut terendah{" "}
                <b className="text-foreground">{pasutEkstrem.surutTerendah.ketinggian.toFixed(2)} m</b> MSL.
              </div>
            ) : null}
          </article>

          {/* Ringkasan Menu 4: Edukasi Mitigasi */}
          <article className="pub-card flex flex-col rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-[#1686C5]/12 text-[#1686C5]">
                  <BookOpenCheck className="size-5" />
                </span>
                <div>
                  <h3 className="text-[15.5px] font-bold text-foreground">Edukasi Mitigasi</h3>
                  <p className="text-[12px] text-muted-foreground">
                    {edukasiList.length} panduan bahaya pesisir &amp; nomor darurat
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("pub-edukasi")}
                className="inline-flex items-center gap-0.5 text-[12.5px] font-semibold text-primary hover:underline"
              >
                Buka <ChevronRight className="size-3.5" />
              </button>
            </div>

            <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {edukasiList.map((m) => (
                <li
                  key={m.id}
                  className={cn(
                    "pub-row flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium text-foreground/90",
                  )}
                >
                  <span className="size-1.5 shrink-0 rounded-full bg-reef-500" />
                  <span className="truncate">{m.judul}</span>
                </li>
              ))}
            </ul>

            <p className="mt-3.5 text-[12px] leading-relaxed text-muted-foreground">
              Dilengkapi persiapan dasar keluarga (rute evakuasi, tas siaga, pantau BMKG/BPBD) serta
              kontak darurat nasional <b>112</b>, <b>115 (Basarnas)</b>, <b>113</b>, dan <b>119</b>.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
