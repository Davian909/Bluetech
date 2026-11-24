"use client";

/* Kartu "Peta Potensi Pariwisata & Wilayah Rawan Bencana" — peta dashboard
   diselaraskan dengan analisis kesesuaian (2 jenis): hanya menampilkan
   wilayah berpotensi pariwisata (wisata eksisting & potensi wisata baru)
   dan wilayah berpotensi terjadi bencana (untuk kedepannya).
   Mesin peta GIS Leaflet (basemap OSM/Esri, overlay DEMO, pengukuran,
   dan gambar area kajian). */

import { useMemo, useRef, useState } from "react";
import {
  Map as MapIcon,
  BarChart3,
  Info,
  Maximize2,
  Plus,
  Minus,
  Crosshair,
  Layers,
  ChevronUp,
  ChevronRight,
  X,
  Ruler,
  Pentagon,
  Globe,
  Camera,
  MapPin,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ZONA_PEMANFAATAN, MAP_MARKERS, RISK_MARKERS } from "@/lib/bluetech-data";
import { GisMapNoSsr, type BasemapId, type GisMarker, type GisOverlays } from "./gis-map-loader";
import { BBOX, depthHeatDataUrl, riskHeatDataUrl } from "@/lib/analysis-engine";
import type L from "leaflet";

export interface MapLayers {
  batimetri: boolean;
  zona: boolean;
  subEksisting: boolean;
  subPotensi: boolean;
  risiko: boolean;
  batas: boolean;
  risikoSub: Record<string, boolean>;
}

/* --------------------------- Layer panel ---------------------------- */

function LayerPanel({
  layers,
  setLayers,
}: {
  layers: MapLayers;
  setLayers: (fn: (l: MapLayers) => MapLayers) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [riskOpen, setRiskOpen] = useState(true);

  return (
    <div className="absolute top-3 right-3 z-[600] w-[218px] rounded-xl border border-cream-300 bg-white p-3.5 shadow-lg">
      <button
        className="flex w-full items-center justify-between"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
      >
        <span className="text-[14px] font-bold text-ocean-900">Layer Peta</span>
        {collapsed ? <ChevronUp className="h-4 w-4 rotate-180 text-ocean-500/85" /> : <ChevronUp className="h-4 w-4 text-ocean-500/85" />}
      </button>

      {!collapsed && (
        <div className="mt-3 flex flex-col gap-2.5">
          {/* Potensi Pariwisata */}
          <div>
            <div className="flex items-center gap-2">
              <label className="flex flex-1 cursor-pointer items-center gap-2">
                <Checkbox checked={layers.zona} onCheckedChange={(v) => setLayers((l) => ({ ...l, zona: !!v }))} />
                <span className="text-[13px] font-bold text-ocean-800">Potensi Pariwisata</span>
              </label>
              <button onClick={() => setRiskOpen((o) => !o)} aria-label="Buka sub-layer pariwisata" className="text-ocean-400 hover:text-ocean-600">
                <ChevronRight className={`h-3.5 w-3.5 transition-transform ${riskOpen ? "rotate-90" : ""}`} />
              </button>
            </div>
            {layers.zona && riskOpen && (
              <div className="mt-1.5 ml-6 flex flex-col gap-1">
                <label className="flex cursor-pointer items-center gap-1.5 text-[11.5px] text-ocean-600">
                  <Checkbox
                    checked={layers.subEksisting}
                    onCheckedChange={(v) => setLayers((l) => ({ ...l, subEksisting: !!v }))}
                    className="h-3 w-3"
                  />
                  <span className="h-2 w-2 rounded-full bg-[#1e9c80]" /> Wisata Eksisting
                </label>
                <label className="flex cursor-pointer items-center gap-1.5 text-[11.5px] text-ocean-600">
                  <Checkbox
                    checked={layers.subPotensi}
                    onCheckedChange={(v) => setLayers((l) => ({ ...l, subPotensi: !!v }))}
                    className="h-3 w-3"
                  />
                  <span className="h-2 w-2 rounded-full bg-[#1686C5]" /> Potensi Wisata Baru
                </label>
              </div>
            )}
          </div>

          {/* Wilayah Rawan Bencana */}
          <div>
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox checked={layers.risiko} onCheckedChange={(v) => setLayers((l) => ({ ...l, risiko: !!v }))} />
              <span className="text-[13px] font-bold text-ocean-800">Wilayah Rawan Bencana</span>
            </label>
            {layers.risiko && (
              <div className="mt-1.5 ml-6 flex flex-col gap-1">
                {RISK_MARKERS.map((r) => (
                  <label key={r.id} className="flex cursor-pointer items-center gap-1.5 text-[11.5px] text-ocean-600">
                    <Checkbox
                      checked={layers.risikoSub[r.type] ?? true}
                      onCheckedChange={(v) => setLayers((l) => ({ ...l, risikoSub: { ...l.risikoSub, [r.type]: !!v } }))}
                      className="h-3 w-3"
                    />
                    {r.label}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Batimetri */}
          <div>
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox checked={layers.batimetri} onCheckedChange={(v) => setLayers((l) => ({ ...l, batimetri: !!v }))} />
              <span className="text-[13px] font-medium text-ocean-800">Batimetri</span>
            </label>
            {layers.batimetri && (
              <div className="mt-1.5 ml-6">
                <div className="h-2 w-32 rounded-full bg-gradient-to-r from-[#bfe6f8] to-[#1663a8]" />
                <div className="mt-0.5 flex w-32 justify-between text-[9.5px] text-ocean-400">
                  <span>0 m</span>
                  <span>40 m</span>
                </div>
              </div>
            )}
          </div>

          {/* Batas Wilayah */}
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox checked={layers.batas} onCheckedChange={(v) => setLayers((l) => ({ ...l, batas: !!v }))} />
            <span className="text-[13px] font-medium text-ocean-800">Batas Wilayah</span>
          </label>
          {layers.batas && (
            <div className="ml-6 flex items-center gap-2 text-[11.5px] text-ocean-600">
              <span className="inline-block h-0 w-6 border-t-2 border-dashed border-ocean-300" />
              Batas area kajian
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* --------------------------- Map controls --------------------------- */

function MapControls({
  showPanel,
  onTogglePanel,
  onZoomIn,
  onZoomOut,
  onLocate,
  measureMode,
  onToggleMeasure,
  drawMode,
  onToggleDraw,
  basemap,
  onToggleBasemap,
}: {
  showPanel: boolean;
  onTogglePanel: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onLocate: () => void;
  measureMode: "off" | "distance" | "area";
  onToggleMeasure: () => void;
  drawMode: boolean;
  onToggleDraw: () => void;
  basemap: BasemapId;
  onToggleBasemap: () => void;
}) {
  const { toast } = useToast();
  const btn = "flex h-9 w-9 items-center justify-center";
  const on = "border-[#1d80b2] bg-[#e3efff] text-[#1d80b2]";
  const off = "border-cream-300 bg-white text-ocean-600 hover:bg-cream-100";
  return (
    <div className="absolute top-3 left-3 z-[600] flex flex-col gap-2">
      <div className="flex flex-col overflow-hidden rounded-lg border border-cream-300 bg-white shadow-sm">
        <button className={btn} onClick={onZoomIn} aria-label="Perbesar peta">
          <Plus className="h-4.5 w-4.5" />
        </button>
        <div className="mx-1.5 border-t border-cream-300" />
        <button className={btn} onClick={onZoomOut} aria-label="Perkecil peta">
          <Minus className="h-4.5 w-4.5" />
        </button>
      </div>
      <button
        className={`flex h-9 w-9 items-center justify-center rounded-lg border shadow-sm ${off}`}
        onClick={onLocate}
        aria-label="Pusatkan peta"
      >
        <Crosshair className="h-4.5 w-4.5" />
      </button>
      <button
        className={`flex h-9 w-9 items-center justify-center rounded-lg border shadow-sm ${measureMode !== "off" ? on : off}`}
        onClick={() => {
          onToggleMeasure();
          toast({ title: measureMode === "off" ? "Alat ukur jarak aktif" : "Alat ukur dimatikan", description: measureMode === "off" ? "Klik peta untuk mengukur jarak antar titik." : "Peta kembali ke mode jelajah." });
        }}
        aria-label="Ukur jarak"
        title="Ukur jarak"
      >
        <Ruler className="h-4.5 w-4.5" />
      </button>
      <button
        className={`flex h-9 w-9 items-center justify-center rounded-lg border shadow-sm ${drawMode ? on : off}`}
        onClick={onToggleDraw}
        aria-label="Gambar area kajian"
        title="Gambar area kajian (polygon)"
      >
        <Pentagon className="h-4.5 w-4.5" />
      </button>
      <button
        className={`flex h-9 w-9 items-center justify-center rounded-lg border shadow-sm ${basemap === "satelit" ? on : off}`}
        onClick={onToggleBasemap}
        aria-label="Ganti basemap"
        title="Basemap: Peta / Satelit"
      >
        <Globe className="h-4.5 w-4.5" />
      </button>
      <button
        className={`flex h-9 w-9 items-center justify-center rounded-lg border shadow-sm ${showPanel ? on : off}`}
        onClick={onTogglePanel}
        aria-label="Tampilkan panel layer"
      >
        <Layers className="h-4.5 w-4.5" />
      </button>
    </div>
  );
}

function ScaleBar() {
  return (
    <div className="absolute bottom-3 left-4 z-[600] flex flex-col items-start gap-0.5">
      <div className="flex items-center text-[10px] font-medium text-ocean-900 [text-shadow:0_0_3px_#fff]">
        <span className="w-8">0</span>
        <span className="w-8">5</span>
        <span className="w-8">10</span>
        <span className="w-14">20</span>
        <span className="ml-1">km</span>
      </div>
      <div className="flex">
        <span className="h-[5px] w-8 bg-slate-900" />
        <span className="h-[5px] w-8 border border-slate-900 bg-white" />
        <span className="h-[5px] w-8 bg-slate-900" />
        <span className="h-[5px] w-16 border border-slate-900 bg-white" />
      </div>
    </div>
  );
}

/* ------------------------------ Main card ------------------------------- */

export function CoastalMapCard({ embedded = false }: { embedded?: boolean }) {
  const [tab, setTab] = useState<"peta" | "analisis" | "informasi">("peta");
  const [showPanel, setShowPanel] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [layers, setLayers] = useState<MapLayers>({
    batimetri: true,
    zona: true,
    subEksisting: true,
    subPotensi: true,
    risiko: true,
    batas: true,
    risikoSub: {},
  });
  const [basemap, setBasemap] = useState<BasemapId>("standard");
  const [measureMode, setMeasureMode] = useState<"off" | "distance" | "area">("off");
  const [drawMode, setDrawMode] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  // dataURL heatmap hanya bisa dibuat di client (canvas)
  const heat = useMemo<{ batimetri: string | null; risiko: string | null }>(() => {
    if (typeof document === "undefined") return { batimetri: null, risiko: null };
    return { batimetri: depthHeatDataUrl(), risiko: riskHeatDataUrl() };
  }, []);

  const tabs = [
    { id: "peta" as const, label: "Peta", icon: MapIcon },
    { id: "analisis" as const, label: "Analisis", icon: BarChart3 },
    { id: "informasi" as const, label: "Informasi", icon: Info },
  ];

  const maxLuas = Math.max(...ZONA_PEMANFAATAN.map((z) => z.luas));

  const gisMarkers: GisMarker[] = useMemo(() => {
    const wisata = MAP_MARKERS.filter((m) =>
      m.kind === "wisata-eksisting" ? layers.subEksisting : layers.subPotensi
    );
    const bahaya = layers.risiko
      ? RISK_MARKERS.filter((r) => layers.risikoSub[r.type] ?? true).map((r) => ({
          id: r.id,
          lat: r.lat,
          lon: r.lon,
          color: "#E75B55",
          label: r.label,
          desc: "Wilayah berpotensi terjadi bencana (DEMO)",
          glyph: "warn",
        }))
      : [];
    return [...wisata, ...bahaya];
  }, [layers.subEksisting, layers.subPotensi, layers.risiko, layers.risikoSub]);

  const overlays: GisOverlays = {
    zona: layers.zona,
    zoneIds: [1], // hanya zona potensi pariwisata
    alur: false,
    konservasiCore: false,
    studyBoundary: layers.batas,
    batimetriHeat: layers.batimetri && heat.batimetri ? { data: heat.batimetri } : null,
    flood: layers.risiko && heat.risiko ? { data: heat.risiko } : null,
  };

  const mapBody = (
    <div className="relative h-full min-h-[380px] w-full flex-1 overflow-hidden">
      <GisMapNoSsr
        height="100%"
        basemap={basemap}
        overlays={overlays}
        markers={gisMarkers}
        measureMode={measureMode}
        drawMode={drawMode}
        onMapReady={(m) => (mapRef.current = m)}
        extraLegend={
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-bold tracking-wide text-ocean-400">LEGENDA (DEMO)</p>
            {layers.batimetri && (
              <span className="flex items-center gap-1.5 text-[11px] text-ocean-600">
                <span className="h-2 w-4 rounded-sm bg-gradient-to-r from-[#bfe6f8] to-[#1663a8]" /> Batimetri
              </span>
            )}
            {layers.zona && (
              <span className="flex items-center gap-1.5 text-[11px] text-ocean-600">
                <span className="h-2 w-3 rounded-sm bg-[#4285f4]/60" /> Zona potensi pariwisata
              </span>
            )}
            {layers.zona && layers.subEksisting && (
              <span className="flex items-center gap-1.5 text-[11px] text-ocean-600">
                <span className="h-2 w-2 rounded-full bg-[#1e9c80]" /> Wisata eksisting
              </span>
            )}
            {layers.zona && layers.subPotensi && (
              <span className="flex items-center gap-1.5 text-[11px] text-ocean-600">
                <span className="h-2 w-2 rounded-full bg-[#1686C5]" /> Potensi wisata baru
              </span>
            )}
            {layers.risiko && (
              <span className="flex items-center gap-1.5 text-[11px] text-ocean-600">
                <span className="h-2 w-3 rounded-sm bg-[#E75B55]" /> Wilayah rawan bencana
              </span>
            )}
          </div>
        }
      />
      <MapControls
        showPanel={showPanel}
        onTogglePanel={() => setShowPanel((p) => !p)}
        onZoomIn={() => mapRef.current?.zoomIn()}
        onZoomOut={() => mapRef.current?.zoomOut()}
        onLocate={() =>
          mapRef.current?.flyToBounds([
            [BBOX.south, BBOX.west],
            [BBOX.north, BBOX.east],
          ])
        }
        measureMode={measureMode}
        onToggleMeasure={() => {
          setDrawMode(false);
          setMeasureMode((m) => (m === "off" ? "distance" : "off"));
        }}
        drawMode={drawMode}
        onToggleDraw={() => {
          setMeasureMode("off");
          setDrawMode((d) => !d);
        }}
        basemap={basemap}
        onToggleBasemap={() => setBasemap((b) => (b === "standard" ? "satelit" : "standard"))}
      />
      {tab === "peta" && showPanel && <LayerPanel layers={layers} setLayers={setLayers} />}
      <ScaleBar />
    </div>
  );

  return (
    <div
      className={
        embedded
          ? "flex h-full flex-col overflow-hidden bg-card"
          : "flex h-full flex-col overflow-hidden rounded-xl border border-cream-300 bg-white shadow-sm"
      }
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <MapIcon className="h-5 w-5 text-[#1e3a8a]" strokeWidth={2.2} />
          <h3 className="text-[16px] font-bold text-ocean-900">Peta Potensi Pariwisata &amp; Wilayah Rawan Bencana</h3>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  active ? "bg-[#1e40af] text-white shadow-sm" : "border border-cream-300 text-ocean-500/85 hover:bg-cream-100"
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            );
          })}
          <button
            onClick={() => setFullscreen(true)}
            aria-label="Perbesar peta ke layar penuh"
            className="ml-1 shrink-0 rounded-lg p-1.5 text-ocean-500/85 hover:bg-cream-200 hover:text-ocean-800"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      {tab === "peta" && (
        <div className="relative flex-1 border-t border-cream-200">{mapBody}</div>
      )}

      {tab === "analisis" && (
        <div className="flex-1 border-t border-cream-200 p-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div>
              <h4 className="text-[14px] font-bold text-ocean-900">Indeks Kesesuaian Kawasan</h4>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-[26px] font-extrabold text-[#1e40af]">72.5</span>
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[12px] font-semibold text-amber-600">Kategori Baik</span>
              </div>
              <Progress value={72.5} className="mt-2 h-2.5 bg-cream-200 [&>div]:bg-[#1e40af]" />
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { label: "Titik Pantau", val: "16" },
                  { label: "Survei Lapangan", val: "42" },
                  { label: "Akurasi Data", val: "91%" },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-cream-300 bg-cream-100/70 p-3 text-center">
                    <p className="text-[18px] font-bold text-ocean-900">{s.val}</p>
                    <p className="text-[11px] text-ocean-500/85">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-[14px] font-bold text-ocean-900">Luas per Potensi Kesesuaian</h4>
              <div className="mt-3 flex flex-col gap-2.5">
                {ZONA_PEMANFAATAN.map((z) => (
                  <div key={z.id} className="flex items-center gap-3">
                    <span className="w-44 text-[12.5px] text-ocean-600">{z.label}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-cream-200">
                      <div className="h-full rounded-full" style={{ width: `${(z.luas / maxLuas) * 100}%`, backgroundColor: z.color }} />
                    </div>
                    <span className="w-20 text-right text-[12px] font-semibold text-ocean-800">{z.luas.toLocaleString("id-ID")} km²</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ocean-500/85">
                <span className="flex items-center gap-1.5">
                  <Camera className="h-3 w-3 text-[#1e9c80]" /> Wisata eksisting — sudah ada &amp; aktif
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 text-[#1686C5]" /> Potensi wisata baru — berpotensi dikembangkan
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {tab === "informasi" && (
        <div className="flex-1 border-t border-cream-200 p-5">
          <h4 className="text-[14px] font-bold text-ocean-900">Informasi Kawasan</h4>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ocean-600">
            Kawasan kajian mencakup teluk dan pesisir utara dengan luas total 2.850 km². Sesuai analisis kesesuaian
            wilayah, peta ini hanya menampilkan dua kelompok wilayah: <b>potensi pariwisata</b> — baik wisata yang
            sudah ada (eksisting) maupun yang belum ada tetapi berpotensi dikembangkan — dan <b>wilayah rawan
            bencana</b> pesisir yang menjadi perhatian mitigasi untuk kedepannya. Pemantauan batimetri dilakukan
            melalui 16 titik pantau dengan pembaruan data setiap kuartal.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 lg:grid-cols-4">
            {[
              { label: "Koordinat Pusat", val: "3°41′ S, 128°11′ E" },
              { label: "Sistem Koordinat", val: "WGS 84 / UTM 51S" },
              { label: "Sumber Data", val: "Sentinel-2, GEBCO, BMKG" },
              { label: "Pembaruan Terakhir", val: "12 Oktober 2025" },
            ].map((m) => (
              <div key={m.label} className="rounded-lg border border-cream-300 bg-cream-100/70 p-3">
                <p className="text-[11px] text-ocean-500/85">{m.label}</p>
                <p className="mt-0.5 text-[12.5px] font-semibold text-ocean-900">{m.val}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen dialog */}
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="h-[88vh] w-[calc(100%-2rem)] max-w-[1250px] sm:max-w-[1250px] p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Peta Potensi Pariwisata &amp; Wilayah Rawan Bencana — Layar Penuh</DialogTitle>
          </DialogHeader>
          <div className="flex h-full flex-col p-4">
            <div className="flex items-center justify-between pb-3">
              <h3 className="text-[16px] font-bold text-ocean-900">Peta Potensi Pariwisata &amp; Wilayah Rawan Bencana</h3>
              <button
                onClick={() => setFullscreen(false)}
                className="flex items-center gap-1.5 rounded-lg border border-cream-300 px-3 py-1.5 text-[13px] text-ocean-600 hover:bg-cream-100"
              >
                <X className="h-4 w-4" /> Tutup
              </button>
            </div>
            <div className="min-h-0 flex-1">{mapBody}</div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
