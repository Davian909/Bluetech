"use client";

/* Menu PETA INTERAKTIF — menampilkan seluruh 7 output raster hasil pengolahan
   pada Kawasan Pantai Losari dalam satu peta interaktif (Leaflet + OSM/Satelit Esri). */

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Info,
  Layers,
  Map as MapIcon,
  RotateCcw,
} from "lucide-react";
import {
  fetchManifest,
  type LosariManifest,
  type RasterLayerMeta,
} from "@/lib/losari-data";
import {
  LosariMapNoSsr,
  type LosariBasemap,
  type LosariRasterOverlay,
} from "./losari-map-loader";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const KATEGORI_URUT: RasterLayerMeta["category"][] = [
  "Kebencanaan",
  "Pariwisata",
  "Infrastruktur",
];

function RasterLegendBlock({ layer }: { layer: RasterLayerMeta }) {
  if (layer.legend.type === "gradient") {
    return (
      <div className="mt-1.5">
        <div
          className="h-2.5 w-full rounded-full border border-black/10"
          style={{ background: layer.legend.gradient }}
        />
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>{layer.legend.minLabel}</span>
          <span>{layer.legend.midLabel}</span>
          <span>{layer.legend.maxLabel}</span>
        </div>
        {layer.valueRangeLocal ? (
          <p className="mt-1 text-[10.5px] text-muted-foreground">
            Rentang lokal Losari:{" "}
            <b className="font-mono text-foreground">
              {layer.valueRangeLocal[0]} – {layer.valueRangeLocal[1]}
            </b>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
      {layer.legend.items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5 text-[11px] text-foreground/90">
          <span
            className="size-2.5 shrink-0 rounded-[3px] border border-black/15"
            style={{ backgroundColor: it.color }}
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}

export function PublicPeta() {
  const [manifest, setManifest] = useState<LosariManifest | null>(null);
  const [syncedRasters, setSyncedRasters] = useState<RasterLayerMeta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [basemap, setBasemap] = useState<LosariBasemap>("standard");
  const [visibleMap, setVisibleMap] = useState<Record<string, boolean>>({});
  const [opacityMap, setOpacityMap] = useState<Record<string, number>>({});

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetchManifest(),
      fetch("/api/datasets?public=1", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([m, dsResp]) => {
        if (!mounted) return;
        setManifest(m);

        // Sinkronisasi metadata & status tampil publik dari SQLite (Admin Manajemen Data)
        const dbItems: {
          slug: string;
          name: string;
          description: string;
          note: string | null;
          category: string;
          defaultOn: boolean;
        }[] | null = Array.isArray(dsResp?.items) ? dsResp.items : null;

        let merged: RasterLayerMeta[] = m.rasters;
        if (dbItems) {
          const bySlug = new Map(dbItems.map((d) => [d.slug, d]));
          merged = m.rasters
            .filter((r) => bySlug.has(r.id))
            .map((r) => {
              const d = bySlug.get(r.id)!;
              const cat = (
                d.category === "Kebencanaan" ||
                d.category === "Pariwisata" ||
                d.category === "Infrastruktur"
                  ? d.category
                  : r.category
              ) as RasterLayerMeta["category"];
              return {
                ...r,
                name: d.name || r.name,
                description: d.description || r.description,
                note: d.note,
                category: cat,
                defaultVisible: d.defaultOn,
              };
            });
        }

        setSyncedRasters(merged);
        const vis: Record<string, boolean> = {};
        const op: Record<string, number> = {};
        for (const r of merged) {
          vis[r.id] = r.defaultVisible;
          op[r.id] = 0.78;
        }
        // Jika tidak ada default aktif, aktifkan layer pertama agar peta tidak kosong
        if (merged.length > 0 && !Object.values(vis).some(Boolean)) {
          vis[merged[0].id] = true;
        }
        setVisibleMap(vis);
        setOpacityMap(op);
      })
      .catch((e) => {
        if (mounted) setError(e instanceof Error ? e.message : "Gagal memuat katalog peta");
      });
    return () => {
      mounted = false;
    };
  }, []);

  const activeLayers = useMemo(() => {
    return syncedRasters.filter((r) => visibleMap[r.id]);
  }, [syncedRasters, visibleMap]);

  const mapRasters: LosariRasterOverlay[] = useMemo(
    () =>
      activeLayers.map((r, idx) => ({
        id: r.id,
        url: r.url,
        bounds: r.bounds,
        opacity: opacityMap[r.id] ?? 0.78,
        zIndex: 200 + idx,
      })),
    [activeLayers, opacityMap],
  );

  const toggleLayer = (id: string, checked: boolean) => {
    setVisibleMap((prev) => ({ ...prev, [id]: checked }));
  };

  const soloLayer = (id: string, scrollToMap = false) => {
    const next: Record<string, boolean> = {};
    for (const r of syncedRasters) next[r.id] = r.id === id;
    setVisibleMap(next);
    if (scrollToMap) {
      requestAnimationFrame(() => {
        document.getElementById("kanvas-peta-raster")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  const resetDefault = () => {
    const vis: Record<string, boolean> = {};
    const op: Record<string, number> = {};
    for (const r of syncedRasters) {
      vis[r.id] = r.defaultVisible;
      op[r.id] = 0.78;
    }
    if (syncedRasters.length > 0 && !Object.values(vis).some(Boolean)) {
      vis[syncedRasters[0].id] = true;
    }
    setVisibleMap(vis);
    setOpacityMap(op);
  };

  const hideAll = () => {
    const vis: Record<string, boolean> = {};
    for (const r of syncedRasters) vis[r.id] = false;
    setVisibleMap(vis);
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-7 md:px-6 md:py-9">
      {/* Kepala halaman */}
      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ocean-500/12 px-3 py-1 text-[11.5px] font-semibold text-ocean-700 dark:text-ocean-200">
              <MapIcon className="size-3.5" />
              Kawasan Pantai Losari · Kota Makassar
            </span>
            <h1 className="mt-2 text-[23px] font-bold tracking-tight text-foreground md:text-[26px]">
              Peta Interaktif Output Raster
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBasemap("standard")}
              className={cn(
                "rounded-xl border px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
                basemap === "standard"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              Peta Jalan (OSM)
            </button>
            <button
              type="button"
              onClick={() => setBasemap("satelit")}
              className={cn(
                "rounded-xl border px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
                basemap === "satelit"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              Satelit (Esri)
            </button>
          </div>
        </div>
        <p className="max-w-3xl text-[13.5px] leading-relaxed text-muted-foreground">
          Menampilkan seluruh <b>7 layer raster hasil pengolahan</b> (kebencanaan, kelas potensi wisata,
          dan fasilitas umum) dalam satu peta. Nyalakan satu atau beberapa layer sekaligus dan atur
          transparansinya untuk membandingkan sebaran spasial di Kawasan Pantai Losari.
        </p>
      </section>

      {error ? (
        <div className="flex items-center gap-2.5 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-[13px] text-destructive">
          <AlertCircle className="size-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* Workbench Peta: Panel Layer Kiri + Peta Kanan */}
      <section className="grid gap-5 lg:grid-cols-[330px_1fr]">
        {/* Panel kontrol 7 layer raster */}
        <aside className="pub-card flex flex-col gap-4 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-2 border-b border-border/70 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="size-4.5 text-primary" />
              <div>
                <h2 className="text-[14.5px] font-bold text-foreground">
                  Layer Raster ({syncedRasters.length})
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  {activeLayers.length} layer aktif ditampilkan
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={hideAll}
                title="Matikan semua layer"
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <EyeOff className="size-4" />
              </button>
              <button
                type="button"
                onClick={resetDefault}
                title="Reset ke tampilan awal"
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <RotateCcw className="size-4" />
              </button>
            </div>
          </div>

          {!manifest ? (
            <p className="py-6 text-center text-[12.5px] text-muted-foreground">
              Memuat daftar layer raster...
            </p>
          ) : (
            <div className="flex max-h-[520px] flex-col gap-4 overflow-y-auto pr-1">
              {KATEGORI_URUT.map((kat) => {
                const items = syncedRasters.filter((r) => r.category === kat);
                if (items.length === 0) return null;
                return (
                  <div key={kat} className="flex flex-col gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {kat}
                    </p>
                    {items.map((layer) => {
                      const isOn = !!visibleMap[layer.id];
                      const op = opacityMap[layer.id] ?? 0.78;
                      return (
                        <div
                          key={layer.id}
                          className={cn(
                            "rounded-xl border p-3 transition-colors",
                            isOn
                              ? "border-primary/45 bg-primary/[0.04]"
                              : "border-border/70 bg-card/60 hover:border-border",
                          )}
                        >
                          <div className="flex items-start gap-2.5">
                            <Checkbox
                              id={`layer-${layer.id}`}
                              checked={isOn}
                              onCheckedChange={(v) => toggleLayer(layer.id, !!v)}
                              className="mt-0.5"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-1.5">
                                <label
                                  htmlFor={`layer-${layer.id}`}
                                  className="cursor-pointer text-[13px] font-semibold leading-snug text-foreground"
                                >
                                  {layer.name}
                                </label>
                                <button
                                  type="button"
                                  onClick={() => soloLayer(layer.id)}
                                  title="Tampilkan hanya layer ini"
                                  className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary/10"
                                >
                                  Fokus
                                </button>
                              </div>
                              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                                {layer.description}
                              </p>
                            </div>
                          </div>

                          {isOn ? (
                            <div className="mt-2.5 border-t border-border/60 pt-2.5">
                              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <span>Transparansi</span>
                                <span className="font-mono font-semibold text-foreground">
                                  {Math.round(op * 100)}%
                                </span>
                              </div>
                              <Slider
                                value={[Math.round(op * 100)]}
                                min={15}
                                max={100}
                                step={5}
                                onValueChange={(vals) =>
                                  setOpacityMap((prev) => ({
                                    ...prev,
                                    [layer.id]: (vals[0] ?? 78) / 100,
                                  }))
                                }
                                className="mt-1.5"
                              />
                              <RasterLegendBlock layer={layer} />
                              {layer.note ? (
                                <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-warning/10 p-2 text-[10.5px] leading-snug text-warning">
                                  <Info className="mt-0.5 size-3.5 shrink-0" />
                                  <span>{layer.note}</span>
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </aside>

        {/* Kanvas peta utama */}
        <div id="kanvas-peta-raster" className="scroll-mt-24 flex flex-col gap-3">
          <div className="pub-card overflow-hidden rounded-2xl p-3">
            <LosariMapNoSsr
              height="560px"
              basemap={basemap}
              onBasemapChange={setBasemap}
              rasters={mapRasters}
              bottomRightSlot={
                activeLayers.length > 0 ? (
                  <div className="rounded-xl border border-border/80 bg-white/95 p-3 shadow-md backdrop-blur-sm dark:bg-ocean-900/95">
                    <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
                      <Eye className="size-3.5 text-primary" />
                      Legenda Aktif ({activeLayers.length})
                    </p>
                    <div className="mt-2 flex max-h-[210px] flex-col gap-2.5 overflow-y-auto pr-1">
                      {activeLayers.map((layer) => (
                        <div key={layer.id} className="border-t border-border/50 pt-2 first:border-0 first:pt-0">
                          <p className="text-[11.5px] font-bold text-foreground">{layer.name}</p>
                          <RasterLegendBlock layer={layer} />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null
              }
            />
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-info/25 bg-info/8 p-3.5 text-[12px] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0 text-info" />
            <p>
              Seluruh raster telah diselaraskan ke sistem koordinat <b>WGS 84 (EPSG:4326)</b> dan
              dipotong pada cakupan studi <b>Kawasan Pantai Losari</b> (119,38°–119,42° BT,
              5,16°–5,13° LS) agar ringan dimuat di browser. Klik tombol <b>Fokus</b> pada panel
              kiri untuk memeriksa satu layer secara terpisah.
            </p>
          </div>
        </div>
      </section>

      {/* Tabel metadata ringkas seluruh raster */}
      {manifest ? (
        <section className="pub-card overflow-hidden rounded-2xl p-5">
          <h2 className="text-[15.5px] font-bold text-foreground">
            Ringkasan Metadata Layer Raster
          </h2>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            Daftar teknis 7 output raster yang ditampilkan pada peta interaktif di atas (sumber:
            inaRISK, BIG, OSM, BMKG).
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-border text-[11.5px] text-muted-foreground">
                  <th className="py-2 pr-3 font-semibold">Nama Layer</th>
                  <th className="py-2 pr-3 font-semibold">Kategori</th>
                  <th className="py-2 pr-3 font-semibold">CRS Sumber</th>
                  <th className="py-2 pr-3 font-semibold">Nilai / Skala</th>
                  <th className="py-2 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {syncedRasters.map((r) => (
                  <tr key={r.id} className="hover:bg-secondary/40">
                    <td className="py-2.5 pr-3 font-semibold text-foreground">{r.name}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{r.category}</td>
                    <td className="py-2.5 pr-3 font-mono text-[11.5px] text-muted-foreground">
                      {r.sourceCrs}
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">
                      {r.legend.type === "classes"
                        ? r.legend.items.map((i) => i.label.split(" — ")[0]).join(", ")
                        : r.valueRangeLocal
                          ? `Skala 0–1 (Losari: ${r.valueRangeLocal[0]}–${r.valueRangeLocal[1]})`
                          : "Skala 0–1"}
                    </td>
                    <td className="py-2.5">
                      <button
                        type="button"
                        onClick={() => soloLayer(r.id, true)}
                        className="rounded-lg bg-primary/10 px-2.5 py-1 text-[11.5px] font-semibold text-primary hover:bg-primary/20"
                      >
                        Tampilkan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
