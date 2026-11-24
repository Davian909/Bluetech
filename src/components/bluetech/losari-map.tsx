"use client";

/**
 * Komponen Peta WebGIS Kawasan Pantai Losari (Leaflet + react-leaflet).
 * Mendukung:
 *   - Basemap OpenStreetMap & Satelit Esri World Imagery
 *   - Banyak layer overlay raster PNG secara bersamaan (dengan kontrol opacity)
 *   - Layer poligon GeoJSON dengan tooltip yang langsung muncul saat HOVER (sticky)
 *   - Marker titik atraksi dengan hover tooltip dan popup detail
 *   - Kontrol zoom, reset area studi, koordinat kursor langsung, dan skala grafis
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  GeoJSON as LeafletGeoJSON,
  ImageOverlay,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair, Globe, Minus, Plus } from "lucide-react";
import { LOSARI_BOUNDS, LOSARI_CENTER, LOSARI_DEFAULT_ZOOM } from "@/lib/losari-data";

export type LosariBasemap = "standard" | "satelit";

export interface LosariRasterOverlay {
  id: string;
  url: string;
  bounds: [[number, number], [number, number]];
  opacity: number;
  zIndex?: number;
}

export interface LosariPointMarker {
  id: string;
  lat: number;
  lon: number;
  title: string;
  category: string;
  description: string;
  color: string;
  glyph?: "museum" | "art" | "pin";
  extra?: string | null;
}

export interface LosariMapProps {
  height?: string;
  basemap?: LosariBasemap;
  onBasemapChange?: (b: LosariBasemap) => void;
  rasters?: LosariRasterOverlay[];
  geojson?: GeoJSON.FeatureCollection | null;
  geojsonKey?: string;
  geojsonStyle?: (feature?: GeoJSON.Feature) => L.PathOptions;
  geojsonHoverTooltip?: (feature: GeoJSON.Feature) => string;
  geojsonClickHandler?: (feature: GeoJSON.Feature) => void;
  markers?: LosariPointMarker[];
  focus?: { lat: number; lon: number; zoom?: number; seq: number } | null;
  fitBounds?: [[number, number], [number, number]];
  onMapClick?: (lat: number, lon: number) => void;
  pickedPoint?: { lat: number; lon: number } | null;
  showBasemapToggle?: boolean;
  topRightSlot?: ReactNode;
  bottomRightSlot?: ReactNode;
}

/* ---------------- Ikon marker kustom (SVG) ---------------- */

const MARKER_GLYPHS = {
  museum:
    "M3 21h18M4 18h16M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 3L3 8v2h18V8l-9-5z",
  art: "M12 2l2.4 7.2H22l-6 4.4 2.3 7.2L12 16.5l-6.3 4.3 2.3-7.2-6-4.4h7.6L12 2z",
  pin: "M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7zm0 9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
};

const ICON_CACHE = new Map<string, L.DivIcon>();

function createMarkerIcon(color: string, glyph: "museum" | "art" | "pin" = "pin"): L.DivIcon {
  const key = `${color}:${glyph}`;
  const cached = ICON_CACHE.get(key);
  if (cached) return cached;

  const size = 28;
  const path = MARKER_GLYPHS[glyph] ?? MARKER_GLYPHS.pin;
  const icon = L.divIcon({
    className: "bluetech-losari-marker",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2.5px solid #ffffff;box-shadow:0 3px 8px rgba(4,29,48,0.38);display:flex;align-items:center;justify-content:center;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -14],
    tooltipAnchor: [0, -14],
  });
  ICON_CACHE.set(key, icon);
  return icon;
}

function fmtCoord(lat: number, lon: number): string {
  const ns = lat < 0 ? "LS" : "LU";
  const ew = lon < 0 ? "BB" : "BT";
  return `${Math.abs(lat).toFixed(5)}° ${ns}, ${Math.abs(lon).toFixed(5)}° ${ew}`;
}

/* ---------------- Bridge event & fokus peta ---------------- */

function MapController({
  focus,
  fitBounds,
  onReady,
  onCursorMove,
  onMapClick,
}: {
  focus?: LosariMapProps["focus"];
  fitBounds: [[number, number], [number, number]];
  onReady: (map: L.Map) => void;
  onCursorMove: (pos: [number, number] | null) => void;
  onMapClick?: (lat: number, lon: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    onReady(map);
  }, [map, onReady]);

  useEffect(() => {
    if (focus) {
      map.flyTo([focus.lat, focus.lon], focus.zoom ?? 16, { duration: 0.7 });
    }
  }, [focus, map]);

  useEffect(() => {
    // Sesuaikan pandangan awal ke batas Kawasan Pantai Losari
    map.fitBounds(fitBounds, { padding: [20, 20], maxZoom: 15 });
  }, [map, fitBounds]);

  useMapEvents({
    mousemove(e) {
      onCursorMove([e.latlng.lat, e.latlng.lng]);
    },
    mouseout() {
      onCursorMove(null);
    },
    click(e) {
      onMapClick?.(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
    },
  });

  return null;
}

/* ---------------- Komponen Utama ---------------- */

export function LosariMap({
  height = "500px",
  basemap: controlledBasemap,
  onBasemapChange,
  rasters = [],
  geojson = null,
  geojsonKey = "gj",
  geojsonStyle,
  geojsonHoverTooltip,
  geojsonClickHandler,
  markers = [],
  focus = null,
  fitBounds = LOSARI_BOUNDS,
  onMapClick,
  pickedPoint = null,
  showBasemapToggle = true,
  topRightSlot,
  bottomRightSlot,
}: LosariMapProps) {
  const [internalBasemap, setInternalBasemap] = useState<LosariBasemap>("standard");
  const basemap = controlledBasemap ?? internalBasemap;
  const mapRef = useRef<L.Map | null>(null);
  const coordRef = useRef<HTMLDivElement | null>(null);

  const handleCursorMove = useCallback((pos: [number, number] | null) => {
    if (!coordRef.current) return;
    coordRef.current.textContent = pos
      ? fmtCoord(pos[0], pos[1])
      : "Kawasan Pantai Losari · WGS 84";
  }, []);

  const toggleBasemap = () => {
    const next: LosariBasemap = basemap === "standard" ? "satelit" : "standard";
    if (onBasemapChange) onBasemapChange(next);
    else setInternalBasemap(next);
  };

  const handleReady = useCallback((m: L.Map) => {
    mapRef.current = m;
  }, []);

  const basemapUrl =
    basemap === "satelit"
      ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const basemapAttrib =
    basemap === "satelit"
      ? "Citra &copy; Esri, Maxar, Earthstar Geographics"
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  const onEachFeature = useMemo(() => {
    if (!geojsonHoverTooltip && !geojsonClickHandler) return undefined;
    return (feature: GeoJSON.Feature, layer: L.Layer) => {
      if (geojsonHoverTooltip) {
        const html = geojsonHoverTooltip(feature);
        layer.bindTooltip(html, {
          sticky: true,
          direction: "top",
          offset: [0, -10],
          opacity: 0.98,
          className: "losari-hover-tooltip",
        });
      }

      if (layer instanceof L.Path) {
        const baseStyle = geojsonStyle ? geojsonStyle(feature) : {};
        layer.on({
          mouseover(e) {
            const target = e.target as L.Path;
            target.setStyle({
              weight: (baseStyle.weight ?? 1.5) + 1.5,
              fillOpacity: Math.min(0.82, (baseStyle.fillOpacity ?? 0.45) + 0.2),
            });
            target.bringToFront();
          },
          mouseout(e) {
            const target = e.target as L.Path;
            target.setStyle(baseStyle);
          },
          click() {
            geojsonClickHandler?.(feature);
          },
        });
      }
    };
  }, [geojsonHoverTooltip, geojsonClickHandler, geojsonStyle]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-secondary/40" style={{ height }}>
      <MapContainer
        center={LOSARI_CENTER}
        zoom={LOSARI_DEFAULT_ZOOM}
        minZoom={11}
        maxZoom={18}
        zoomControl={false}
        attributionControl
        className="h-full w-full"
      >
        <TileLayer key={basemap} url={basemapUrl} attribution={basemapAttrib} maxZoom={19} />

        <MapController
          focus={focus}
          fitBounds={fitBounds}
          onReady={handleReady}
          onCursorMove={handleCursorMove}
          onMapClick={onMapClick}
        />

        {/* Titik terpilih (mode input koordinat Admin) */}
        {pickedPoint ? (
          <Marker
            position={[pickedPoint.lat, pickedPoint.lon]}
            icon={createMarkerIcon("#e11d48", "pin")}
            zIndexOffset={700}
          >
            <Tooltip permanent direction="top" offset={[0, -14]} className="losari-hover-tooltip">
              <span className="font-mono text-[11px] font-semibold text-ocean-900">
                Titik dipilih: {pickedPoint.lat.toFixed(5)}, {pickedPoint.lon.toFixed(5)}
              </span>
            </Tooltip>
          </Marker>
        ) : null}

        {/* Layer overlay raster PNG (hasil pra-proses EPSG:4326) */}
        {rasters.map((r, idx) => (
          <ImageOverlay
            key={r.id}
            url={r.url}
            bounds={r.bounds}
            opacity={r.opacity}
            zIndex={r.zIndex ?? 200 + idx}
            className="losari-raster-overlay"
          />
        ))}

        {/* Layer poligon GeoJSON dengan tooltip hover */}
        {geojson && (
          <LeafletGeoJSON
            key={geojsonKey}
            data={geojson}
            style={geojsonStyle}
            onEachFeature={onEachFeature}
          />
        )}

        {/* Marker titik atraksi / lokasi */}
        {markers.map((m) => (
          <Marker
            key={m.id}
            position={[m.lat, m.lon]}
            icon={createMarkerIcon(m.color, m.glyph)}
            zIndexOffset={500}
          >
            <Tooltip direction="top" offset={[0, -14]} opacity={0.97} className="losari-hover-tooltip">
              <div className="min-w-[170px] max-w-[230px]">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ocean-500">
                  {m.category}
                </p>
                <p className="text-[12.5px] font-bold text-ocean-900">{m.title}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-ocean-700">{m.description}</p>
              </div>
            </Tooltip>
            <Popup maxWidth={250}>
              <div className="text-[12px] leading-snug text-ocean-900">
                <span
                  className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                  style={{ backgroundColor: m.color }}
                >
                  {m.category}
                </span>
                <p className="mt-1.5 text-[13.5px] font-bold">{m.title}</p>
                <p className="mt-1 text-ocean-700">{m.description}</p>
                {m.extra ? <p className="mt-1 text-[11px] text-ocean-500">{m.extra}</p> : null}
                <p className="mt-2 rounded bg-ocean-50 px-2 py-1 font-mono text-[10.5px] text-ocean-700">
                  {fmtCoord(m.lat, m.lon)}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Kontrol peta kiri atas */}
      <div className="absolute top-3 left-3 z-[500] flex flex-col gap-1.5">
        <div className="flex flex-col overflow-hidden rounded-xl border border-border/80 bg-white/95 shadow-sm backdrop-blur-sm dark:bg-ocean-900/95">
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            aria-label="Perbesar peta"
            title="Perbesar peta"
            className="flex size-9 items-center justify-center text-foreground transition-colors hover:bg-secondary"
          >
            <Plus className="size-4" />
          </button>
          <div className="mx-1.5 border-t border-border/70" />
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            aria-label="Perkecil peta"
            title="Perkecil peta"
            className="flex size-9 items-center justify-center text-foreground transition-colors hover:bg-secondary"
          >
            <Minus className="size-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => mapRef.current?.fitBounds(fitBounds, { padding: [20, 20], maxZoom: 15 })}
          aria-label="Pusatkan ke Kawasan Pantai Losari"
          title="Pusatkan ke Kawasan Pantai Losari"
          className="flex size-9 items-center justify-center rounded-xl border border-border/80 bg-white/95 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-secondary dark:bg-ocean-900/95"
        >
          <Crosshair className="size-4" />
        </button>

        {showBasemapToggle && (
          <button
            type="button"
            onClick={toggleBasemap}
            aria-label={basemap === "satelit" ? "Ganti ke Peta Jalan OSM" : "Ganti ke Citra Satelit Esri"}
            title={basemap === "satelit" ? "Basemap: Satelit Esri (klik untuk Peta Jalan)" : "Basemap: Peta Jalan OSM (klik untuk Satelit)"}
            className={`flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-[11.5px] font-semibold shadow-sm backdrop-blur-sm transition-colors ${
              basemap === "satelit"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/80 bg-white/95 text-foreground hover:bg-secondary dark:bg-ocean-900/95"
            }`}
          >
            <Globe className="size-3.5 shrink-0" />
            <span className="hidden sm:inline">{basemap === "satelit" ? "Satelit" : "Peta"}</span>
          </button>
        )}
      </div>

      {/* Slot kanan atas (panel layer jika ada) */}
      {topRightSlot ? <div className="absolute top-3 right-3 z-[500]">{topRightSlot}</div> : null}

      {/* Koordinat kursor kiri bawah (diperbarui langsung via ref tanpa re-render) */}
      <div
        ref={coordRef}
        className="pointer-events-none absolute bottom-3 left-3 z-[500] hidden rounded-lg border border-border/70 bg-white/90 px-2.5 py-1 font-mono text-[10.5px] text-foreground/85 shadow-sm backdrop-blur-sm sm:block dark:bg-ocean-900/90"
      >
        Kawasan Pantai Losari · WGS 84
      </div>

      {/* Slot kanan bawah (legenda) */}
      {bottomRightSlot ? (
        <div className="absolute right-3 bottom-7 z-[500] max-w-[260px]">{bottomRightSlot}</div>
      ) : null}
    </div>
  );
}
