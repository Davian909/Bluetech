"use client";

/* Bluetech — Marine GIS Viewer berbasis Leaflet.
   Basemap OpenStreetMap / Esri World Imagery, overlay GeoJSON demo,
   heatmap kesesuaian (grid), pengukuran jarak & luas, dan gambar area kajian. */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, ImageOverlay, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { BBOX, GRID_W, GRID_H, ZONE_POLYGONS, KONSERVASI_CORE, SHIPPING_LANE, PORTS } from "@/lib/analysis-engine";
import { haversineKm, polylineLengthKm, polygonAreaKm2 } from "./gis-utils";

export type BasemapId = "standard" | "satelit";

export interface GisMarker {
  id: string;
  lat: number;
  lon: number;
  color: string;
  label: string;
  desc: string;
  glyph?: string; // kunci glyph kecil
  /* Popup kaya: foto tempat + titik koordinat (menu Kesesuaian Pariwisata) */
  photo?: string;
  photoAlt?: string;
  badge?: string; // label status di atas foto, cth. "Wisata Eksisting"
  badgeColor?: string;
  jenis?: string;
  showCoords?: boolean; // tampilkan titik koordinat di popup
}

export interface GisOverlays {
  zona: boolean;
  zoneIds?: number[];
  alur: boolean;
  konservasiCore: boolean;
  studyBoundary?: boolean;
  batimetriHeat?: { data: string } | null; // dataURL
  kelasHeat?: { data: string } | null; // dataURL dari grid kelas
  flood?: { data: string } | null;
  heatOpacity?: number;
  candidatePoints?: { lat: number; lon: number; label: string; score: number; kelas: string; color: string; rank: number }[];
  shorelines?: { year: number; color: string; points: [number, number][] }[];
}

export interface GisMapProps {
  height?: string;
  basemap: BasemapId;
  overlays: GisOverlays;
  markers?: GisMarker[];
  focus?: { lat: number; lon: number; zoom: number; seq: number } | null;
  fitSeq?: number;
  measureMode?: "off" | "distance" | "area";
  drawMode?: boolean;
  onDrawDone?: (areaKm2: number, ring: [number, number][]) => void;
  onMapClick?: (lat: number, lon: number) => void;
  onMapReady?: (map: L.Map) => void;
  showAttribution?: boolean;
  showPorts?: boolean; // marker pelabuhan DEMO — matikan untuk peta pariwisata/mitigasi
  extraLegend?: ReactNode;
}

/* ---------- marker ikon (divIcon) ---------- */

const GLYPHS: Record<string, string> = {
  camera: "M9 7h6l1 2h3v9H5V9h3l1-2z M12 16.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z",
  tree: "M12 3l5 6h-2.5l3.5 5h-4v3h-4v-3H6l3.5-5H7l5-6z",
  anchor: "M12 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM11 8h2v11h-2zM8 11h8M12 19c-3 0-5-2-5-4H5c0 4 3 6 7 6s7-2 7-6h-2c0 2-2 4-5 4z",
  ship: "M4 15l8-3 8 3-2 5H6l-2-5zM6 12l6-8 6 8M12 4v8",
  check: "M5 13l4 4L19 7",
  pin: "M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7zm0 9.5A2.5 2.5 0 1 0 12 6a2.5 2.5 0 0 0 0 5.5z",
  warn: "M12 3l10 18H2L12 3zm0 6v6m0 3v.5",
};

/* ---------- format titik koordinat (desimal + DMS) ---------- */

const fmtDecimal = (lat: number, lon: number) =>
  `${Math.abs(lat).toFixed(4)}°S, ${Math.abs(lon).toFixed(4)}°E`;

function fmtDms(v: number, isLat: boolean): string {
  const hemi = isLat ? (v < 0 ? "S" : "N") : v < 0 ? "W" : "E";
  const totalSec = Math.round(Math.abs(v) * 3600);
  const d = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${d}°${String(m).padStart(2, "0")}′${String(s).padStart(2, "0")}″${hemi}`;
}

const fmtDmsPair = (lat: number, lon: number) => `${fmtDms(lat, true)} ${fmtDms(lon, false)}`;

function makeDivIcon(color: string, glyph = "pin", size = 34): L.DivIcon {
  const path = GLYPHS[glyph] ?? GLYPHS.pin;
  const filled = glyph === "pin";
  const iconSvg = `<svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:relative;top:${size * 0.14}px"><path d="${path}" ${filled ? 'fill="white" stroke="#fff"' : ""}/></svg>`;
  return L.divIcon({
    className: "bluetech-gis-marker",
    html: `<div style="filter:drop-shadow(0 2px 3px rgba(2,20,40,.35));width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;">
      ${filled
        ? `<div style="width:${size}px;height:${size}px;transform:rotate(45deg);border-radius:${size * 0.5}px ${size * 0.5}px ${size * 0.5}px 2px;background:${color};display:flex;align-items:center;justify-content:center;">
             <div style="transform:rotate(-45deg);display:flex;">${iconSvg}</div>
           </div>`
        : `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;">${iconSvg}</div>`}
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size + 2],
    popupAnchor: [0, -size],
  });
}

/* ---------- helper komponen leaflet ---------- */

function MapEventsBridge({
  onMapClick,
  onMapReady,
  focus,
  fitSeq,
}: {
  onMapClick?: (lat: number, lon: number) => void;
  onMapReady?: (m: L.Map) => void;
  focus?: GisMapProps["focus"];
  fitSeq?: number;
}) {
  const map = useMap();
  useEffect(() => {
    onMapReady?.(map);
  }, [map, onMapReady]);
  useMapEvents({
    click(e) {
      onMapClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  useEffect(() => {
    if (focus) map.flyTo([focus.lat, focus.lon], focus.zoom, { duration: 0.8 });
  }, [focus, map]);
  useEffect(() => {
    if (fitSeq) {
      map.flyToBounds([
        [BBOX.south, BBOX.west],
        [BBOX.north, BBOX.east],
      ]);
    }
  }, [fitSeq, map]);
  return null;
}

/* Lapisan pengukuran & gambar — state internal, reset otomatis via key */

function MeasureLayer({
  measureMode,
  drawMode,
  onDrawDone,
}: {
  measureMode: "off" | "distance" | "area";
  drawMode: boolean;
  onDrawDone?: (areaKm2: number, ring: [number, number][]) => void;
}) {
  const [points, setPoints] = useState<[number, number][]>([]);
  const pointsRef = useRef<[number, number][]>([]);

  useMapEvents({
    click(e) {
      if (measureMode === "off" && !drawMode) return;
      const next: [number, number][] = [...pointsRef.current, [e.latlng.lat, e.latlng.lng]];
      pointsRef.current = next;
      setPoints(next);
    },
  });

  const measureLen = measureMode === "distance" ? polylineLengthKm(points) : 0;
  const measureArea = drawMode ? polygonAreaKm2(points.length >= 3 ? points : []) : 0;

  const finishDraw = () => {
    if (points.length < 3) return;
    const area = polygonAreaKm2(points);
    onDrawDone?.(area, [...points]);
    pointsRef.current = [];
    setPoints([]);
  };

  const liveLine = measureMode === "distance" && points.length > 1 ? points : null;
  const livePoly = drawMode && points.length > 2 ? points : null;

  return (
    <>
      {liveLine && <Polyline positions={liveLine} pathOptions={{ color: "#E75B55", weight: 3, dashArray: "2 6" }} />}
      {points.length > 0 &&
        measureMode === "distance" &&
        points.map((p, i) => <Marker key={`mp-${i}`} position={p} icon={makeDivIcon("#E75B55", "check", 18)} />)}
      {livePoly && <Polygon positions={livePoly} pathOptions={{ color: "#1768B5", fillColor: "#1768B5", fillOpacity: 0.18, weight: 2.5, dashArray: "2 6" }} />}
      {points.length > 0 &&
        drawMode &&
        points.map((p, i) => <Marker key={`dp-${i}`} position={p} icon={makeDivIcon("#1768B5", "check", 18)} />)}

      {/* Info pengukuran / gambar */}
      <div className="absolute top-2.5 left-1/2 z-[500] -translate-x-1/2 rounded-lg border border-cream-300 bg-white/95 px-3.5 py-2 text-[12px] shadow-lg">
        {measureMode === "distance" && (
          <span className="font-medium text-ocean-800">
            Jarak: <b className="text-[#E75B55]">{measureLen.toFixed(2)} km</b>{" "}
            <span className="text-ocean-400">({points.length} titik)</span>
          </span>
        )}
        {drawMode && (
          <span className="flex items-center gap-2 font-medium text-ocean-800">
            Luas: <b className="text-[#1768B5]">{measureArea.toFixed(2)} km²</b>
            <span className="text-ocean-400">({points.length} titik)</span>
            <button
              onClick={finishDraw}
              disabled={points.length < 3}
              className="rounded-md btn-hero px-2.5 py-1 text-[11.5px] font-semibold text-white disabled:opacity-40"
            >
              Selesai
            </button>
          </span>
        )}
      </div>
    </>
  );
}

/* ------------------------------ Komponen utama ------------------------------ */

export function GisMap({
  height = "470px",
  basemap,
  overlays,
  markers = [],
  focus = null,
  fitSeq,
  measureMode = "off",
  drawMode = false,
  onDrawDone,
  onMapClick,
  onMapReady,
  showPorts = false,
  extraLegend,
}: GisMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const measuring = measureMode !== "off" || drawMode;

  const basemapUrl =
    basemap === "satelit"
      ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const basemapAttrib =
    basemap === "satelit"
      ? "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics"
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  const demoMarkers: GisMarker[] = useMemo(
    () =>
      showPorts
        ? PORTS.map((p) => ({
            id: `port-${p.id}`,
            lat: p.lat,
            lon: p.lon,
            color: "#a866dd",
            label: p.name,
            desc: `Kedalaman kolam ${p.depth} m — pelabuhan (DEMO)`,
            glyph: "anchor",
          }))
        : [],
    [showPorts]
  );

  const allMarkers = [...demoMarkers, ...markers];

  return (
    <div className="relative overflow-hidden" style={{ height }}>
      <MapContainer
        center={[(BBOX.south + BBOX.north) / 2, (BBOX.west + BBOX.east) / 2]}
        zoom={10}
        minZoom={8}
        maxZoom={15}
        className="h-full w-full"
        zoomControl={false}
        attributionControl
      >
        <TileLayer url={basemapUrl} attribution={basemapAttrib} />
        <MapEventsBridge onMapReady={onMapReady} focus={focus} fitSeq={fitSeq} />
        {measuring && <MeasureLayer key={`${measureMode}-${drawMode}`} measureMode={measureMode} drawMode={drawMode} onDrawDone={onDrawDone} />}

        {/* Batas area kajian (garis putus-putus putih) */}
        {overlays.studyBoundary && (
          <Polygon
            positions={[
              [BBOX.south, BBOX.west],
              [BBOX.south, BBOX.east],
              [BBOX.north, BBOX.east],
              [BBOX.north, BBOX.west],
            ]}
            pathOptions={{ color: "#ffffff", fillColor: "#ffffff", fillOpacity: 0.03, weight: 2.5, dashArray: "11 8" }}
          >
            <Popup>
              <b>Batas Area Kajian (DEMO)</b>
              <br />
              Teluk Ambon Utara — luas 2.850 km² (grid 72×48).
            </Popup>
          </Polygon>
        )}

        {/* Alur pelayaran */}
        {overlays.alur && (
          <>
            <Polyline positions={SHIPPING_LANE} pathOptions={{ color: "#0B2D4B", weight: 3, dashArray: "10 6", opacity: 0.85 }}>
              <Popup>
                <b>Alur Pelayaran (DEMO)</b>
                <br />
                Jalur kapal utama menuju pelabuhan — batasan analisis 400 m.
              </Popup>
            </Polyline>
          </>
        )}

        {/* Zona tata ruang */}
        {overlays.zona &&
          ZONE_POLYGONS.filter((z) => !overlays.zoneIds || overlays.zoneIds.includes(z.id)).map((z) => (
            <Polygon key={z.id} positions={z.ring} pathOptions={{ color: z.color, fillColor: z.color, fillOpacity: 0.32, weight: 2 }}>
              <Popup>
                <b>Zona {z.label}</b>
                <br />
                Zona pemanfaatan ruang laut (data DEMO).
              </Popup>
            </Polygon>
          ))}

        {/* Inti kawasan konservasi (batasan) */}
        {overlays.konservasiCore && (
          <Polygon
            positions={KONSERVASI_CORE}
            pathOptions={{ color: "#B3261E", fillColor: "#E75B55", fillOpacity: 0.22, weight: 2, dashArray: "4 4" }}
          >
            <Popup>
              <b>Inti Kawasan Konservasi (DEMO)</b>
              <br />
              Kawasan perlindungan — batasan Boolean: tidak boleh dimanfaatkan.
            </Popup>
          </Polygon>
        )}

        {/* Heatmap kelas kesesuaian */}
        {overlays.kelasHeat?.data && (
          <ImageOverlay
            url={overlays.kelasHeat.data}
            bounds={[
              [BBOX.south, BBOX.west],
              [BBOX.north, BBOX.east],
            ]}
            opacity={overlays.heatOpacity ?? 0.62}
          />
        )}

        {/* Heatmap batimetri */}
        {overlays.batimetriHeat?.data && (
          <ImageOverlay
            url={overlays.batimetriHeat.data}
            bounds={[
              [BBOX.south, BBOX.west],
              [BBOX.north, BBOX.east],
            ]}
            opacity={0.55}
          />
        )}

        {/* Genangan */}
        {overlays.flood?.data && (
          <ImageOverlay
            url={overlays.flood.data}
            bounds={[
              [BBOX.south, BBOX.west],
              [BBOX.north, BBOX.east],
            ]}
            opacity={0.6}
          />
        )}

        {/* Garis pantai multitemporal */}
        {overlays.shorelines?.map((s) => (
          <Polyline key={s.year} positions={s.points} pathOptions={{ color: s.color, weight: s.year === 2025 ? 3.5 : 2.2, opacity: 0.95 }}>
            <Popup>
              <b>Garis Pantai {s.year}</b>
              <br />
              Posisi garis pantai hasil interpretasi citra (DEMO).
            </Popup>
          </Polyline>
        ))}

        {/* Kandidat lokasi */}
        {overlays.candidatePoints?.map((c) => (
          <Marker key={`cand-${c.rank}`} position={[c.lat, c.lon]} icon={makeDivIcon(c.color, "pin", 34)}>
            <Popup>
              <b>
                #{c.rank} · {c.label}
              </b>
              <br />
              Skor: <b>{c.score}</b> ({c.kelas})
            </Popup>
          </Marker>
        ))}

        {/* Marker umum — popup foto tempat + titik koordinat utk marker wisata */}
        {allMarkers.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lon]} icon={makeDivIcon(m.color, m.glyph ?? "pin", 30)}>
            {m.photo ? (
              <Popup maxWidth={264} className="bluetech-photo-popup">
                <div className="w-[240px]">
                  <div className="relative h-36 w-full overflow-hidden rounded-xl border border-cream-300">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.photo} alt={m.photoAlt ?? m.label} className="h-36 w-full object-cover" />
                    {m.badge && (
                      <span
                        className="absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow-md"
                        style={{ backgroundColor: m.badgeColor ?? m.color }}
                      >
                        {m.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-[13.5px] font-bold leading-tight text-ocean-900">{m.label}</p>
                  {m.jenis && <p className="mt-0.5 text-[11px] font-semibold text-[#1686C5]">{m.jenis}</p>}
                  <p className="mt-1 text-[11.5px] leading-snug text-ocean-600">{m.desc}</p>
                  {m.showCoords && (
                    <div className="mt-2 rounded-lg bg-cream-100/80 px-2.5 py-1.5 text-[10.5px] leading-relaxed text-ocean-700">
                      <p className="flex items-center gap-1 font-bold text-ocean-800">
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d={GLYPHS.pin} />
                        </svg>
                        Titik Koordinat
                      </p>
                      <p className="font-mono">{fmtDecimal(m.lat, m.lon)}</p>
                      <p className="font-mono text-ocean-500/85">{fmtDmsPair(m.lat, m.lon)}</p>
                    </div>
                  )}
                </div>
              </Popup>
            ) : (
              <Popup maxWidth={248}>
                <b>{m.label}</b>
                <br />
                {m.desc}
                {m.showCoords && (
                  <div className="mt-1.5 rounded-lg bg-cream-100/80 px-2 py-1 font-mono text-[10.5px] leading-relaxed text-ocean-700">
                    {fmtDecimal(m.lat, m.lon)}
                    <br />
                    {fmtDmsPair(m.lat, m.lon)}
                  </div>
                )}
              </Popup>
            )}
          </Marker>
        ))}
      </MapContainer>

      {extraLegend && (
        <div className="absolute right-2.5 bottom-2.5 z-[500] max-w-[240px] rounded-lg border border-cream-300 bg-white/95 p-3 text-[11.5px] shadow-lg">
          {extraLegend}
        </div>
      )}
    </div>
  );
}
