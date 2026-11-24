"use client";

/* Menu ZONA POTENSIAL WISATA — menampilkan poligon zona potensi wisata
   (zona_wisata.geojson) dengan tooltip deskripsi yang muncul saat HOVER,
   dilengkapi 8 titik objek atraksi wisata OSM (atraksi_wisata.geojson) di
   Kawasan Pantai Losari. */

import { useCallback, useEffect, useMemo, useState } from "react";
import type L from "leaflet";
import {
  Compass,
  Info,
  Landmark,
  Layers,
  MapPin,
  MousePointerClick,
  Palette,
} from "lucide-react";
import type { MenuKey } from "@/lib/bluetech-data";
import {
  fetchManifest,
  fetchZonaWisata,
  type AtraksiItem,
  type LosariManifest,
} from "@/lib/losari-data";
import { LosariMapNoSsr, type LosariPointMarker } from "./losari-map-loader";
import { cn } from "@/lib/utils";

type FilterKelas = "Semua" | "Tinggi" | "Sedang" | "Rendah";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function PublicPariwisata({ onNavigate }: { onNavigate: (key: MenuKey) => void }) {
  const [manifest, setManifest] = useState<LosariManifest | null>(null);
  const [zonaGeo, setZonaGeo] = useState<GeoJSON.FeatureCollection | null>(null);
  const [liveAtraksi, setLiveAtraksi] = useState<AtraksiItem[] | null>(null);
  const [filterKelas, setFilterKelas] = useState<FilterKelas>("Semua");
  const [tampilAtraksi, setTampilAtraksi] = useState(true);
  const [focus, setFocus] = useState<{ lat: number; lon: number; zoom?: number; seq: number } | null>(null);
  const [sorotId, setSorotId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetchManifest(),
      fetchZonaWisata(),
      fetch("/api/attractions", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([m, z, attrResp]) => {
        if (!mounted) return;
        setManifest(m);
        setZonaGeo(z);
        if (Array.isArray(attrResp?.items)) {
          setLiveAtraksi(
            attrResp.items.map(
              (it: {
                id: string;
                code?: string | null;
                name: string;
                category: string;
                tourismType: string;
                description: string;
                operator?: string | null;
                lat: number;
                lon: number;
              }) => ({
                id: it.id,
                osm_id: it.code ?? it.id,
                name: it.name,
                original_name: it.name,
                tourism: it.tourismType,
                kategori: it.category,
                artwork_type: null,
                operator: it.operator ?? null,
                deskripsi: it.description,
                lat: it.lat,
                lon: it.lon,
              }),
            ),
          );
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const atraksiList = useMemo(
    () => liveAtraksi ?? manifest?.vectors.ringkasan.atraksiWisata ?? [],
    [liveAtraksi, manifest],
  );

  const filteredGeo = useMemo<GeoJSON.FeatureCollection | null>(() => {
    if (!zonaGeo) return null;
    if (filterKelas === "Semua") return zonaGeo;
    return {
      ...zonaGeo,
      features: zonaGeo.features.filter((f) => f.properties?.kelas === filterKelas),
    };
  }, [zonaGeo, filterKelas]);

  const markers = useMemo<LosariPointMarker[]>(() => {
    if (!tampilAtraksi) return [];
    return atraksiList.map((a) => ({
      id: a.id,
      lat: a.lat,
      lon: a.lon,
      title: a.name,
      category: a.kategori,
      description: a.deskripsi,
      color: a.tourism === "museum" ? "#0f507a" : "#7c3aed",
      glyph: a.tourism === "museum" ? "museum" : "art",
      extra: a.operator ? `Pengelola: ${a.operator}` : "Data tersinkronisasi dengan Admin",
    }));
  }, [atraksiList, tampilAtraksi]);

  const geojsonStyle = useCallback((feature?: GeoJSON.Feature): L.PathOptions => {
    const warna = (feature?.properties?.warna as string) || "#0ea5e9";
    return {
      color: warna,
      fillColor: warna,
      weight: 1.8,
      opacity: 0.95,
      fillOpacity: 0.48,
    };
  }, []);

  // Tooltip yang langsung muncul saat kursor diarahkan (hover) di atas poligon zona
  const geojsonHoverTooltip = useCallback((feature: GeoJSON.Feature): string => {
    const p = feature.properties || {};
    const kelas = escapeHtml(String(p.kelas ?? "-"));
    const warna = escapeHtml(String(p.warna ?? "#0ea5e9"));
    const luasHa = Number(p.luas_ha ?? 0).toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const ringkas = escapeHtml(String(p.ringkas ?? ""));
    const aktivitas = escapeHtml(String(p.aktivitas ?? ""));
    return `
      <div style="font-family:var(--font-sans),sans-serif;line-height:1.45;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${warna};flex-shrink:0;"></span>
          <strong style="font-size:13px;color:#072c47;">Potensi Wisata: ${kelas}</strong>
        </div>
        <div style="font-size:11px;font-weight:600;color:#146795;margin-bottom:5px;">
          Luas Zona: ${luasHa} Ha
        </div>
        <p style="margin:0 0 5px;font-size:11.5px;color:#0b3d5f;">${ringkas}</p>
        <p style="margin:0;font-size:11px;color:#3f6b8d;"><b>Arahan aktivitas:</b> ${aktivitas}</p>
      </div>
    `;
  }, []);

  const zonaRingkasan = manifest?.vectors.ringkasan.zonaWisata ?? [];
  const totalLuasHa = zonaRingkasan.reduce((acc, z) => acc + z.luasHa, 0);

  const lihatAtraksi = (a: AtraksiItem) => {
    setTampilAtraksi(true);
    setSorotId(a.id);
    setFocus({ lat: a.lat, lon: a.lon, zoom: 16, seq: Date.now() });
    requestAnimationFrame(() => {
      document.getElementById("peta-zona-wisata")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 py-7 md:px-6 md:py-9">
      {/* Kepala halaman */}
      <section className="flex flex-col gap-2">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-reef-500/12 px-3 py-1 text-[11.5px] font-semibold text-reef-700 dark:text-reef-200">
          <Compass className="size-3.5" />
          Kawasan Pantai Losari · Perencanaan Pariwisata Pesisir
        </span>
        <h1 className="text-[23px] font-bold tracking-tight text-foreground md:text-[26px]">
          Zona Potensial Wisata
        </h1>
        <p className="max-w-3xl text-[13.5px] leading-relaxed text-muted-foreground">
          Peta zonasi tingkat potensi pengembangan wisata pesisir (kelas <b>Tinggi</b>, <b>Sedang</b>,
          dan <b>Rendah</b>) beserta sebaran <b>{atraksiList.length} titik atraksi wisata</b> terdata di Kawasan Pantai
          Losari. Arahkan kursor (<i>hover</i>) ke area poligon pada peta untuk membaca deskripsi dan
          arahan aktivitas masing-masing zona.
        </p>
      </section>

      {/* Kartu ringkasan luas 3 kelas */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {zonaRingkasan.map((z) => {
          const pct = totalLuasHa > 0 ? Math.round((z.luasHa / totalLuasHa) * 100) : 0;
          return (
            <button
              key={z.kelas}
              type="button"
              onClick={() => setFilterKelas((prev) => (prev === z.kelas ? "Semua" : z.kelas))}
              className={cn(
                "pub-card pub-tile flex flex-col rounded-2xl p-4 text-left",
                filterKelas === z.kelas && "ring-2 ring-primary",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-[12.5px] font-bold text-foreground">
                  <span className="size-3 rounded-[4px]" style={{ backgroundColor: z.warna }} />
                  Potensi {z.kelas}
                </span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground tabular-nums">
                  {pct}%
                </span>
              </div>
              <p className="mt-2.5 text-[24px] font-bold tracking-tight text-foreground tabular-nums">
                {z.luasHa.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{" "}
                <span className="text-[13px] font-medium text-muted-foreground">Ha</span>
              </p>
              <p className="mt-1 text-[11.5px] text-muted-foreground">
                Klik kartu untuk menyaring zona {z.kelas.toLowerCase()} di peta
              </p>
            </button>
          );
        })}

        <article className="pub-card flex flex-col justify-between rounded-2xl p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 text-[12.5px] font-bold text-foreground">
              <Landmark className="size-4 text-ocean-600" />
              Titik Atraksi OSM
            </span>
            <span className="rounded-full bg-ocean-500/12 px-2 py-0.5 text-[11px] font-semibold text-ocean-700 dark:text-ocean-200">
              Eksisting
            </span>
          </div>
          <p className="mt-2.5 text-[24px] font-bold tracking-tight text-foreground tabular-nums">
            {atraksiList.length}{" "}
            <span className="text-[13px] font-medium text-muted-foreground">titik</span>
          </p>
          <p className="mt-1 text-[11.5px] text-muted-foreground">
            Museum, patung/monumen, dan karya seni pesisir
          </p>
        </article>
      </section>

      {/* Peta Zona Potensial Wisata dengan Hover Tooltip */}
      <section id="peta-zona-wisata" className="pub-card scroll-mt-24 flex flex-col gap-3 rounded-2xl p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-[16px] font-bold text-foreground">
              <Layers className="size-4.5 text-primary" />
              Peta Zonasi Potensi Wisata &amp; Titik Atraksi
            </h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <MousePointerClick className="size-3.5 text-primary" />
              Arahkan kursor (hover) ke poligon zona atau titik atraksi untuk menampilkan deskripsi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["Semua", "Tinggi", "Sedang", "Rendah"] as FilterKelas[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilterKelas(k)}
                className={cn(
                  "rounded-xl border px-3 py-1.5 text-[12px] font-semibold transition-colors",
                  filterKelas === k
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {k === "Semua" ? "Semua Zona" : `Potensi ${k}`}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setTampilAtraksi((v) => !v)}
              className={cn(
                "rounded-xl border px-3 py-1.5 text-[12px] font-semibold transition-colors",
                tampilAtraksi
                  ? "border-reef-600 bg-reef-600 text-white"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {tampilAtraksi ? "Titik Atraksi: Aktif" : "Titik Atraksi: Sembunyi"}
            </button>
          </div>
        </div>

        <LosariMapNoSsr
          height="520px"
          geojson={filteredGeo}
          geojsonKey={`wisata-${filterKelas}`}
          geojsonStyle={geojsonStyle}
          geojsonHoverTooltip={geojsonHoverTooltip}
          markers={markers}
          focus={focus}
          bottomRightSlot={
            <div className="rounded-xl border border-border/80 bg-white/95 p-3 shadow-md backdrop-blur-sm dark:bg-ocean-900/95">
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
                Legenda Zona Wisata
              </p>
              <div className="mt-2 flex flex-col gap-1.5 text-[11.5px] text-foreground">
                {zonaRingkasan.map((z) => (
                  <span key={z.kelas} className="flex items-center gap-2">
                    <span className="h-2.5 w-4 rounded-[3px]" style={{ backgroundColor: z.warna }} />
                    Potensi {z.kelas} ({z.luasHa.toLocaleString("id-ID")} Ha)
                  </span>
                ))}
                {tampilAtraksi ? (
                  <div className="mt-1.5 flex flex-col gap-1 border-t border-border/60 pt-1.5">
                    <span className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full bg-[#0f507a]" /> Museum ({atraksiList.filter((a) => a.tourism === "museum").length} titik)
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full bg-[#7c3aed]" /> Atraksi &amp; Karya Seni ({atraksiList.filter((a) => a.tourism !== "museum").length} titik)
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          }
        />
      </section>

      {/* Penjelasan detail 3 kelas zona */}
      <section className="flex flex-col gap-3">
        <h2 className="text-[18px] font-bold text-foreground">Penjelasan Kelas Potensi Wisata</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {zonaRingkasan.map((z) => (
            <article key={z.kelas} className="pub-card flex flex-col gap-2.5 rounded-2xl p-5">
              <div className="flex items-center justify-between gap-2">
                <span
                  className="rounded-full px-3 py-1 text-[11.5px] font-bold text-white"
                  style={{ backgroundColor: z.warna }}
                >
                  Potensi {z.kelas}
                </span>
                <span className="font-mono text-[12px] font-semibold text-muted-foreground">
                  {z.luasHa.toLocaleString("id-ID")} Ha ({z.luasKm2} km²)
                </span>
              </div>
              <p className="text-[13px] leading-relaxed text-foreground/90">{z.ringkas}</p>
              <div className="mt-auto rounded-xl bg-secondary/70 p-3 text-[12px] leading-relaxed text-muted-foreground">
                <b className="text-foreground">Arahan pemanfaatan:</b> {z.aktivitas}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Daftar 8 titik atraksi wisata (OSM) */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-[18px] font-bold text-foreground">
            Sebaran {atraksiList.length} Titik Atraksi Wisata Kawasan Pantai Losari
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Titik objek budaya, monumen, dan karya seni yang berada di sekitar Kawasan Pantai Losari.
            Klik <b>Lihat di Peta</b> untuk menyorot lokasinya.
          </p>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {atraksiList.map((a) => {
            const isMuseum = a.tourism === "museum";
            return (
              <article
                key={a.id}
                className={cn(
                  "pub-card flex flex-col justify-between rounded-2xl p-4",
                  sorotId === a.id && "ring-2 ring-primary",
                )}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg text-white",
                        isMuseum ? "bg-[#0f507a]" : "bg-[#7c3aed]",
                      )}
                    >
                      {isMuseum ? <Landmark className="size-4" /> : <Palette className="size-4" />}
                    </span>
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      {a.kategori}
                    </span>
                  </div>
                  <h3 className="mt-2.5 text-[14px] font-bold leading-snug text-foreground">
                    {a.name}
                  </h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                    {a.deskripsi}
                  </p>
                </div>

                <div className="mt-3 flex flex-col gap-2 border-t border-border/60 pt-2.5">
                  <span className="font-mono text-[10.5px] text-muted-foreground">
                    {Math.abs(a.lat).toFixed(5)}° LS, {a.lon.toFixed(5)}° BT
                  </span>
                  <button
                    type="button"
                    onClick={() => lihatAtraksi(a)}
                    className="flex h-8.5 w-full items-center justify-center gap-1.5 rounded-xl border border-border text-[12px] font-semibold text-primary transition-colors hover:bg-secondary"
                  >
                    <MapPin className="size-3.5" />
                    Lihat di Peta
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-1 flex items-start gap-2 rounded-xl border border-info/25 bg-info/8 p-3.5 text-[12px] leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-info" />
          <p>
            Pengembangan kawasan wisata tetap perlu memperhatikan batas sempadan pantai dan tingkat
            kerawanan bencana pada menu{" "}
            <button
              type="button"
              onClick={() => onNavigate("pub-mitigasi")}
              className="font-semibold text-primary underline underline-offset-2"
            >
              Mitigasi Bencana
            </button>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
