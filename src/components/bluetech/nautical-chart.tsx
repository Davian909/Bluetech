"use client";

/* Peta Laut (nautical chart) gaya peta navigasi klasik untuk Dashboard —
   Selat Sunda dan perairan sekitarnya. Elemen ala chart:
   daratan kuning, zona perairan dangkal sian, garis isobath (10–200 m),
   titik ukur kedalaman (klik → popup koordinat desimal & DMS),
   alur pelayaran putus-putus, graticule, rose kompas, blok judul & skala.
   SELURUH DATA BERSIFAT DEMO / ILUSTRATIF — tidak untuk navigasi. */

import { useEffect, useMemo, useRef } from "react";
import {
  CircleMarker,
  MapContainer,
  Polygon,
  Polyline,
  Popup,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type L from "leaflet";
import { Minus, MousePointerClick, Plus, Waves } from "lucide-react";

type LL = [number, number]; // [lat, lng]

/* --------------------------- Geometri daratan --------------------------- */

const SUMATRA: LL[] = [
  [-5.855, 105.775], [-5.81, 105.83], [-5.76, 105.92], [-5.71, 106.02], [-5.5, 106.1],
  [-5.5, 104.63], [-5.65, 104.66], [-5.78, 104.7], [-5.88, 104.74], [-5.96, 104.8],
  [-6.03, 104.86], [-6.08, 104.92], [-6.11, 105.0], [-6.12, 105.08], [-6.11, 105.16],
  [-6.09, 105.24], [-6.06, 105.32], [-6.02, 105.4], [-5.98, 105.47], [-5.93, 105.58],
  [-5.89, 105.68],
];

const JAVA: LL[] = [
  [-6.786, 105.197], [-6.755, 105.26], [-6.715, 105.335], [-6.685, 105.42], [-6.6, 105.5],
  [-6.52, 105.58], [-6.42, 105.68], [-6.3, 105.78], [-6.2, 105.84], [-6.1, 105.9],
  [-6.02, 105.94], [-5.94, 105.985], [-5.9, 106.06], [-5.88, 106.16], [-5.875, 106.3],
  [-5.87, 106.5], [-5.86, 106.75], [-7.3, 106.85], [-7.22, 106.7], [-7.15, 106.55],
  [-7.1, 106.4], [-7.06, 106.25], [-7.0, 106.1], [-6.97, 105.95], [-6.94, 105.8],
  [-6.91, 105.65], [-6.885, 105.52], [-6.86, 105.4], [-6.83, 105.3], [-6.8, 105.22],
];

const ISLANDS: LL[][] = [
  // Pulau Panaitan
  [[-6.575, 105.255], [-6.585, 105.33], [-6.61, 105.35], [-6.645, 105.34], [-6.665, 105.3], [-6.655, 105.25], [-6.62, 105.225], [-6.59, 105.225]],
  // Pulau Peucang
  [[-6.755, 105.255], [-6.755, 105.29], [-6.78, 105.295], [-6.79, 105.27], [-6.78, 105.25]],
  // Pulau Umang
  [[-6.635, 105.465], [-6.635, 105.485], [-6.655, 105.49], [-6.66, 105.47], [-6.65, 105.46]],
  // Pulau Deli
  [[-6.575, 105.525], [-6.575, 105.545], [-6.595, 105.55], [-6.6, 105.53], [-6.585, 105.52]],
  // Pulau Sertung (Krakatau)
  [[-6.115, 105.385], [-6.125, 105.4], [-6.135, 105.415], [-6.125, 105.425], [-6.11, 105.415], [-6.105, 105.4]],
  // Pulau Rakata (Krakatau)
  [[-6.135, 105.425], [-6.145, 105.445], [-6.155, 105.455], [-6.17, 105.445], [-6.175, 105.425], [-6.165, 105.405], [-6.15, 105.4], [-6.14, 105.41]],
  // Anak Krakatau
  [[-6.105, 105.418], [-6.105, 105.428], [-6.115, 105.43], [-6.118, 105.422], [-6.112, 105.416]],
  // Pulau Sebesi
  [[-6.02, 105.48], [-6.02, 105.51], [-6.04, 105.53], [-6.06, 105.52], [-6.065, 105.49], [-6.05, 105.47]],
  // Pulau Sebuku
  [[-6.1, 105.47], [-6.1, 105.49], [-6.12, 105.495], [-6.125, 105.48], [-6.115, 105.465]],
];

/* ---------------------- Zona perairan dangkal ---------------------- */

const SHALLOW: LL[][] = [
  // Gugus Krakatau (kerucut vulkanik dangkal)
  [[-6.05, 105.36], [-6.07, 105.28], [-6.13, 105.24], [-6.21, 105.25], [-6.28, 105.31], [-6.31, 105.39], [-6.29, 105.47], [-6.23, 105.53], [-6.15, 105.54], [-6.08, 105.48], [-6.05, 105.42]],
  // Perairan Ujung Kulon & Panaitan
  [[-6.72, 105.14], [-6.66, 105.16], [-6.58, 105.2], [-6.52, 105.24], [-6.5, 105.3], [-6.52, 105.36], [-6.58, 105.4], [-6.66, 105.42], [-6.72, 105.38], [-6.76, 105.3], [-6.76, 105.2]],
  // Perairan Sebesi–Sebuku
  [[-6.01, 105.45], [-5.99, 105.5], [-6.01, 105.55], [-6.06, 105.58], [-6.11, 105.56], [-6.12, 105.5], [-6.08, 105.44]],
];

/* ----------------------------- Isobath ----------------------------- */

const ISOBATHS: { d: number; deep?: boolean; line: LL[] }[] = [
  { d: 10, line: [[-5.92, 105.95], [-5.98, 105.91], [-6.06, 105.85], [-6.16, 105.82], [-6.26, 105.79], [-6.4, 105.71], [-6.48, 105.61], [-6.56, 105.52], [-6.62, 105.44], [-6.68, 105.36]] },
  { d: 10, line: [[-5.9, 105.7], [-5.95, 105.6], [-6.01, 105.5], [-6.04, 105.42], [-6.08, 105.34], [-6.12, 105.26], [-6.13, 105.16]] },
  { d: 10, line: [[-6.6, 105.22], [-6.64, 105.18], [-6.7, 105.13], [-6.76, 105.13], [-6.8, 105.17], [-6.84, 105.24], [-6.86, 105.31]] },
  { d: 20, line: [[-5.9, 105.99], [-5.98, 105.94], [-6.08, 105.88], [-6.2, 105.82], [-6.3, 105.76], [-6.4, 105.68], [-6.48, 105.58], [-6.58, 105.5], [-6.62, 105.42]] },
  { d: 20, line: [[-5.94, 105.72], [-5.99, 105.62], [-6.04, 105.52], [-6.08, 105.44], [-6.12, 105.36], [-6.16, 105.28], [-6.18, 105.18]] },
  { d: 20, line: [[-6.06, 105.34], [-6.09, 105.26], [-6.13, 105.22], [-6.21, 105.23], [-6.27, 105.29], [-6.29, 105.37], [-6.27, 105.45], [-6.21, 105.51], [-6.13, 105.51], [-6.07, 105.45], [-6.06, 105.34]] },
  { d: 20, line: [[-6.55, 105.2], [-6.6, 105.14], [-6.68, 105.1], [-6.76, 105.12], [-6.82, 105.18], [-6.85, 105.26], [-6.85, 105.33]] },
  { d: 50, line: [[-5.86, 106.0], [-5.9, 105.96], [-6.02, 105.91], [-6.14, 105.85], [-6.26, 105.8], [-6.38, 105.74], [-6.44, 105.66], [-6.56, 105.57], [-6.6, 105.48]] },
  { d: 50, line: [[-6.87, 105.3], [-6.9, 105.42], [-6.92, 105.56], [-6.94, 105.7]] },
  { d: 50, line: [[-6.0, 105.76], [-6.06, 105.64], [-6.11, 105.54], [-6.15, 105.46], [-6.19, 105.38], [-6.23, 105.3], [-6.26, 105.2]] },
  { d: 50, line: [[-6.08, 105.34], [-6.11, 105.26], [-6.16, 105.21], [-6.24, 105.22], [-6.31, 105.28], [-6.34, 105.36], [-6.32, 105.46], [-6.25, 105.54], [-6.16, 105.57], [-6.07, 105.51], [-6.04, 105.44], [-6.08, 105.34]] },
  { d: 50, line: [[-6.01, 105.45], [-6.0, 105.49], [-6.01, 105.54], [-6.06, 105.58], [-6.11, 105.55], [-6.12, 105.49], [-6.08, 105.43]] },
  { d: 100, deep: true, line: [[-5.82, 106.04], [-5.86, 106.0], [-5.94, 105.94], [-6.04, 105.89], [-6.12, 105.83], [-6.28, 105.77], [-6.38, 105.7], [-6.46, 105.62], [-6.52, 105.52], [-6.54, 105.42]] },
  { d: 100, deep: true, line: [[-6.08, 105.76], [-6.14, 105.64], [-6.19, 105.54], [-6.23, 105.46], [-6.27, 105.38], [-6.3, 105.3], [-6.33, 105.2]] },
  { d: 100, deep: true, line: [[-6.89, 105.28], [-6.91, 105.44], [-6.93, 105.6], [-6.95, 105.78], [-6.99, 105.96], [-7.04, 106.12]] },
  { d: 200, deep: true, line: [[-5.78, 106.06], [-5.84, 106.0], [-5.92, 105.93], [-6.02, 105.87], [-6.14, 105.81], [-6.26, 105.74], [-6.36, 105.67], [-6.44, 105.58], [-6.5, 105.48]] },
  { d: 200, deep: true, line: [[-6.16, 105.72], [-6.22, 105.62], [-6.27, 105.52], [-6.31, 105.44], [-6.35, 105.36], [-6.39, 105.28], [-6.42, 105.18]] },
  { d: 200, deep: true, line: [[-6.92, 105.2], [-6.95, 105.4], [-6.97, 105.62], [-7.0, 105.85], [-7.04, 106.05]] },
];

const CONTOUR_LABELS: { lat: number; lon: number; t: string }[] = [
  { lat: -6.265, lon: 105.8, t: "10" },
  { lat: -6.1, lon: 105.3, t: "10" },
  { lat: -6.845, lon: 105.25, t: "10" },
  { lat: -6.33, lon: 105.75, t: "20" },
  { lat: -6.175, lon: 105.24, t: "20" },
  { lat: -6.395, lon: 105.72, t: "50" },
  { lat: -6.335, lon: 105.345, t: "50" },
  { lat: -6.07, lon: 105.615, t: "50" },
  { lat: -6.16, lon: 105.83, t: "100" },
  { lat: -6.245, lon: 105.48, t: "100" },
  { lat: -6.99, lon: 105.96, t: "100" },
  { lat: -6.37, lon: 105.66, t: "200" },
  { lat: -7.0, lon: 105.845, t: "200" },
];

/* ------------------- Titik ukur kedalaman (soundings) ------------------- */

const SOUNDINGS: { lat: number; lon: number; d: number }[] = [
  // Selat bagian timur laut (Merak-Bakauheni & muara)
  { lat: -5.8, lon: 105.95, d: 22 }, { lat: -5.86, lon: 105.9, d: 28 }, { lat: -5.876, lon: 105.838, d: 34 },
  { lat: -5.852, lon: 106.0, d: 25 }, { lat: -5.77, lon: 106.05, d: 18 }, { lat: -5.86, lon: 106.1, d: 42 },
  { lat: -5.72, lon: 106.16, d: 36 }, { lat: -5.78, lon: 106.24, d: 29 }, { lat: -5.84, lon: 106.32, d: 44 },
  { lat: -5.74, lon: 106.4, d: 31 }, { lat: -5.7, lon: 106.47, d: 39 }, { lat: -5.76, lon: 106.5, d: 27 },
  { lat: -5.85, lon: 106.392, d: 55 }, { lat: -5.82, lon: 106.462, d: 49 }, { lat: -5.8, lon: 106.112, d: 19 },
  { lat: -5.878, lon: 105.762, d: 48 },
  // Badan selat utama & lereng Banten
  { lat: -5.94, lon: 105.62, d: 44 }, { lat: -6.062, lon: 105.7, d: 62 }, { lat: -6.186, lon: 105.756, d: 74 },
  { lat: -6.25, lon: 105.72, d: 89 }, { lat: -6.064, lon: 105.828, d: 31 }, { lat: -6.065, lon: 105.762, d: 38 },
  { lat: -6.189, lon: 105.676, d: 38 },
  // Gugus Krakatau & lereng barat
  { lat: -6.184, lon: 105.604, d: 58 }, { lat: -6.108, lon: 105.232, d: 48 }, { lat: -6.246, lon: 105.4, d: 71 },
  { lat: -6.246, lon: 105.564, d: 88 }, { lat: -6.24, lon: 105.65, d: 77 }, { lat: -6.304, lon: 105.55, d: 83 },
  { lat: -6.3, lon: 105.62, d: 95 }, { lat: -6.38, lon: 105.52, d: 102 }, { lat: -6.308, lon: 105.42, d: 71 },
  { lat: -6.132, lon: 105.16, d: 60 }, { lat: -6.364, lon: 105.444, d: 77 }, { lat: -6.142, lon: 105.092, d: 58 },
  { lat: -6.3, lon: 105.488, d: 63 },
  // Cekungan dalam (palung tengah selat)
  { lat: -6.256, lon: 105.2, d: 254 }, { lat: -6.312, lon: 105.24, d: 318 }, { lat: -6.38, lon: 105.244, d: 376 },
  { lat: -6.46, lon: 105.26, d: 342 }, { lat: -6.52, lon: 105.2, d: 289 }, { lat: -6.548, lon: 105.288, d: 236 },
  { lat: -6.408, lon: 105.332, d: 315 }, { lat: -6.348, lon: 105.14, d: 287 }, { lat: -6.28, lon: 105.116, d: 331 },
  { lat: -6.276, lon: 105.328, d: 354 }, { lat: -6.488, lon: 105.344, d: 267 }, { lat: -6.538, lon: 105.376, d: 218 },
  // Lereng selatan (Banten-Anyer)
  { lat: -6.414, lon: 105.435, d: 52 }, { lat: -6.432, lon: 105.496, d: 74 }, { lat: -6.436, lon: 105.56, d: 82 },
  { lat: -6.422, lon: 105.626, d: 90 }, { lat: -6.484, lon: 105.44, d: 118 }, { lat: -6.54, lon: 105.452, d: 52 },
  // Pendekatan Ujung Kulon & Panaitan
  { lat: -6.45, lon: 105.18, d: 110 }, { lat: -6.658, lon: 105.36, d: 128 }, { lat: -6.656, lon: 105.16, d: 96 },
  { lat: -6.712, lon: 105.22, d: 34 }, { lat: -6.748, lon: 105.088, d: 120 }, { lat: -6.68, lon: 105.288, d: 28 },
  { lat: -6.46, lon: 105.096, d: 134 }, { lat: -6.33, lon: 105.056, d: 142 }, { lat: -6.28, lon: 105.036, d: 155 },
  { lat: -6.512, lon: 105.116, d: 105 }, { lat: -6.69, lon: 105.08, d: 116 },
  // Samudra Hindia (selatan Jawa - makin dalam ke lepas pantai)
  { lat: -6.92, lon: 105.3, d: 84 }, { lat: -6.94, lon: 105.42, d: 172 }, { lat: -6.96, lon: 105.54, d: 246 },
  { lat: -6.98, lon: 105.66, d: 298 }, { lat: -7.0, lon: 105.752, d: 352 }, { lat: -7.104, lon: 105.94, d: 386 },
  { lat: -7.1, lon: 106.1, d: 361 }, { lat: -7.104, lon: 106.26, d: 315 }, { lat: -6.944, lon: 105.2, d: 58 },
  { lat: -6.888, lon: 105.16, d: 71 }, { lat: -6.852, lon: 105.096, d: 92 },
];

/* ------------------------- Alur pelayaran ------------------------- */

const LANES: LL[][] = [
  // Alur lalu lintas pelayaran (TSS) — jalur utama & jalur balik
  [[-5.78, 105.88], [-5.9, 105.74], [-6.02, 105.62], [-6.14, 105.5], [-6.24, 105.4], [-6.32, 105.3], [-6.42, 105.22], [-6.55, 105.16], [-6.7, 105.12]],
  [[-5.83, 105.92], [-5.95, 105.78], [-6.07, 105.66], [-6.19, 105.55], [-6.29, 105.45], [-6.37, 105.35], [-6.46, 105.27], [-6.59, 105.21], [-6.74, 105.17]],
];

const FERRY_LANE: LL[] = [[-5.94, 105.985], [-5.9, 105.92], [-5.87, 105.86], [-5.855, 105.785]];

const LANE_LABELS: { lat: number; lon: number; t: string }[] = [
  { lat: -6.13, lon: 105.64, t: "Alur Lalu Lintas Pelayaran (DEMO)" },
  { lat: -5.93, lon: 105.89, t: "Jalur Feri Merak–Bakauheni" },
];

/* --------------------------- Nama tempat --------------------------- */

const PLACES: { name: string; lat: number; lon: number; size?: "lg" | "sm" }[] = [
  { name: "Selat Sunda", lat: -6.0, lon: 105.7, size: "lg" },
  { name: "Samudra Hindia", lat: -7.02, lon: 105.24, size: "lg" },
  { name: "Lampung (Sumatera)", lat: -5.85, lon: 105.36 },
  { name: "Banten (Jawa Barat)", lat: -6.2, lon: 106.15 },
  { name: "Ujung Kulon", lat: -6.845, lon: 105.4 },
  { name: "Pulau Panaitan", lat: -6.6, lon: 105.3 },
  { name: "Pulau Peucang", lat: -6.78, lon: 105.245, size: "sm" },
  { name: "Gugus Krakatau", lat: -6.19, lon: 105.42 },
  { name: "Pulau Sebesi", lat: -6.045, lon: 105.415 },
  { name: "Pulau Sebuku", lat: -6.125, lon: 105.53, size: "sm" },
  { name: "Merak", lat: -5.975, lon: 106.045, size: "sm" },
  { name: "Bakauheni", lat: -5.805, lon: 105.785, size: "sm" },
  { name: "Anyer", lat: -6.11, lon: 105.915, size: "sm" },
];

/* ------------------------------ Graticule ------------------------------ */

const GRAT_LATS = [-5.8, -6.0, -6.2, -6.4, -6.6, -6.8, -7.0];
const GRAT_LNGS = [104.8, 105.2, 105.4, 105.6, 105.8, 106.0, 106.2, 106.4, 106.6];
const GRAT_W = 104.62;
const GRAT_E = 106.98;
const GRAT_N = -5.58;
const GRAT_S = -7.22;

/* ------------------------------ Util format ------------------------------ */

const fmtDecimal = (lat: number, lon: number) =>
  `${Math.abs(lat).toFixed(4)}° S, ${Math.abs(lon).toFixed(4)}° E`;

function fmtDms(v: number, isLat: boolean): string {
  const hemi = isLat ? (v < 0 ? "S" : "N") : v < 0 ? "W" : "E";
  const totalSec = Math.round(Math.abs(v) * 3600);
  const d = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${d}°${String(m).padStart(2, "0")}′${String(s).padStart(2, "0")}″${hemi}`;
}

const fmtDmsPair = (lat: number, lon: number) =>
  `${fmtDms(lat, true)} ${fmtDms(lon, false)}`;

const fmtGratLat = (v: number) => {
  const d = Math.floor(Math.abs(v));
  const m = Math.round((Math.abs(v) - d) * 60);
  return `${d}°${String(m).padStart(2, "0")}′ S`;
};

const fmtGratLng = (v: number) => {
  const d = Math.floor(v);
  const m = Math.round((v - d) * 60);
  return `${d}°${String(m).padStart(2, "0")}′ E`;
};

const zoneOf = (d: number) =>
  d < 20
    ? "Perairan Sangat Dangkal"
    : d < 50
      ? "Perairan Dangkal"
      : d < 200
        ? "Perairan Menengah"
        : "Cekungan Dalam";

/* --------------------------- Komponen kecil --------------------------- */

function ChartBridge({ onReady }: { onReady: (m: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onReady(map);
  }, [map, onReady]);
  return null;
}

function ChartLabel({
  lat,
  lon,
  className,
  children,
}: {
  lat: number;
  lon: number;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <CircleMarker
      center={[lat, lon]}
      radius={0.5}
      stroke={false}
      fill={false}
      interactive={false}
    >
      <Tooltip permanent direction="center" offset={[0, 0]} className={className}>
        {children}
      </Tooltip>
    </CircleMarker>
  );
}

function CompassRose() {
  return (
    <svg viewBox="0 0 110 110" className="chart-compass size-[76px]" aria-hidden="true">
      <circle cx="55" cy="55" r="38" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="55" cy="55" r="30" fill="none" stroke="currentColor" strokeWidth="0.7" strokeDasharray="2 3" />
      {[0, 90, 180, 270].map((a) => (
        <path key={a} d="M55 17 L59 51 L55 55 L51 51 Z" fill="currentColor" transform={`rotate(${a} 55 55)`} />
      ))}
      {[45, 135, 225, 315].map((a) => (
        <path key={a} d="M55 29 L58 51.5 L55 55 L52 51.5 Z" fill="currentColor" opacity="0.55" transform={`rotate(${a} 55 55)`} />
      ))}
      <circle cx="55" cy="55" r="2.6" fill="currentColor" />
      <text x="55" y="10" textAnchor="middle" fontSize="10" fontFamily="Georgia, serif" fontWeight="700" fill="currentColor">N</text>
      <text x="103" y="58.5" textAnchor="middle" fontSize="8" fontFamily="Georgia, serif" fill="currentColor">E</text>
      <text x="55" y="106" textAnchor="middle" fontSize="8" fontFamily="Georgia, serif" fill="currentColor">S</text>
      <text x="7" y="58.5" textAnchor="middle" fontSize="8" fontFamily="Georgia, serif" fill="currentColor">W</text>
    </svg>
  );
}

function LegendItem({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-2 text-[12px] text-ocean-600">
      <span className="flex w-7 shrink-0 justify-center">{swatch}</span>
      {label}
    </span>
  );
}

/* ------------------------------ Kartu utama ------------------------------ */

export function NauticalChartCard() {
  const mapRef = useRef<L.Map | null>(null);
  const maks = useMemo(() => Math.max(...SOUNDINGS.map((s) => s.d)), []);

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      {/* Header kartu */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Waves className="size-5 text-ocean-700" strokeWidth={2.2} />
          <h3 className="text-[16px] font-bold text-ocean-900">
            Peta Laut Selat Sunda — Kedalaman Perairan
          </h3>
        </div>
        <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
          DEMO · Kedalaman ilustratif
        </span>
      </div>

      <div className="grid lg:h-[540px] lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* ------------------------- Peta ------------------------- */}
        <div className="relative h-[440px] border-b border-border/60 md:h-[470px] lg:h-full lg:border-b-0 lg:border-r">
          <MapContainer
            center={[-6.42, 105.72]}
            zoom={9}
            minZoom={9}
            maxZoom={12}
            zoomSnap={0.25}
            zoomControl={false}
            attributionControl={false}
            maxBounds={[[-7.42, 104.42], [-5.38, 107.02]]}
            maxBoundsViscosity={0.95}
            className="chart-sea size-full"
          >
            {/* Graticule */}
            {GRAT_LNGS.map((lng) => (
              <Polyline
                key={`mer-${lng}`}
                positions={[[GRAT_S, lng], [GRAT_N, lng]]}
                className="nl-graticule"
                interactive={false}
              />
            ))}
            {GRAT_LATS.map((lat) => (
              <Polyline
                key={`par-${lat}`}
                positions={[[lat, GRAT_W], [lat, GRAT_E]]}
                className="nl-graticule"
                interactive={false}
              />
            ))}
            {GRAT_LATS.map((lat) => (
              <ChartLabel key={`lbl-lat-${lat}`} lat={lat} lon={105.13} className="nl-grat-label">
                {fmtGratLat(lat)}
              </ChartLabel>
            ))}
            {GRAT_LNGS.map((lng) => (
              <ChartLabel key={`lbl-lng-${lng}`} lat={-7.05} lon={lng} className="nl-grat-label">
                {fmtGratLng(lng)}
              </ChartLabel>
            ))}

            {/* Zona perairan dangkal */}
            {SHALLOW.map((ring, i) => (
              <Polygon key={`shal-${i}`} positions={ring} className="nl-shallow" interactive={false} />
            ))}

            {/* Daratan */}
            <Polygon positions={SUMATRA} className="nl-land" interactive={false} />
            <Polygon positions={JAVA} className="nl-land" interactive={false} />
            {ISLANDS.map((ring, i) => (
              <Polygon key={`isl-${i}`} positions={ring} className="nl-land" interactive={false} />
            ))}

            {/* Isobath + label kedalaman garis */}
            {ISOBATHS.map((c, i) => (
              <Polyline
                key={`iso-${i}`}
                positions={c.line}
                className={c.deep ? "nl-contour nl-contour-deep" : "nl-contour"}
                interactive={false}
              />
            ))}
            {CONTOUR_LABELS.map((c, i) => (
              <ChartLabel key={`clbl-${i}`} lat={c.lat} lon={c.lon} className="nl-contour-label">
                {c.t}
              </ChartLabel>
            ))}

            {/* Alur pelayaran */}
            {LANES.map((line, i) => (
              <Polyline key={`lane-${i}`} positions={line} className="nl-lane" interactive={false} />
            ))}
            <Polyline positions={FERRY_LANE} className="nl-ferry" interactive={false} />
            {LANE_LABELS.map((l, i) => (
              <ChartLabel key={`lbl-lane-${i}`} lat={l.lat} lon={l.lon} className="nl-lane-label">
                {l.t}
              </ChartLabel>
            ))}

            {/* Nama tempat */}
            {PLACES.map((p, i) => (
              <ChartLabel
                key={`place-${i}`}
                lat={p.lat}
                lon={p.lon}
                className={p.size === "lg" ? "nl-place nl-place-lg" : p.size === "sm" ? "nl-place nl-place-sm" : "nl-place"}
              >
                {p.name}
              </ChartLabel>
            ))}

            {/* Titik ukur kedalaman */}
            {SOUNDINGS.map((s, i) => (
              <CircleMarker
                key={`snd-${i}`}
                center={[s.lat, s.lon]}
                radius={7}
                stroke={false}
                fill={true}
                fillOpacity={0}
              >
                <Tooltip permanent direction="center" offset={[0, 0]} className="nl-sounding">
                  {s.d}
                </Tooltip>
                <Popup className="bluetech-depth-popup">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold tracking-wider text-ocean-500 uppercase">
                      {zoneOf(s.d)}
                    </p>
                    <p className="text-base font-bold text-ocean-900">Kedalaman {s.d} m</p>
                    <p className="text-[11px] text-ocean-600">{fmtDecimal(s.lat, s.lon)}</p>
                    <p className="text-[11px] text-ocean-600">{fmtDmsPair(s.lat, s.lon)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Titik ukur batimetri · DEMO ilustratif
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            <ChartBridge onReady={(m) => (mapRef.current = m)} />
          </MapContainer>

          {/* Blok judul chart */}
          <div className="pointer-events-none absolute top-3 left-3 z-[800] rounded-lg border border-[#8a7c4e] bg-white/90 px-3.5 py-2.5 shadow-sm">
            <p className="chart-title">SELAT SUNDA DAN PERAIRAN SEKITARNYA</p>
            <p className="chart-subtitle">PETA LAUT No. 71 · DEMO</p>
            <p className="chart-scaleline">Skala 1 : 250.000 — kedalaman dalam meter</p>
          </div>

          {/* Rose kompas */}
          <div className="pointer-events-none absolute top-3 right-3 z-[800]">
            <CompassRose />
          </div>

          {/* Skala */}
          <div className="chart-scalebar pointer-events-none absolute bottom-3 left-3 z-[800] flex flex-col items-start gap-1">
            <div className="bar-label flex items-center">
              <span className="w-5">0</span>
              <span className="w-5">5</span>
              <span className="w-5">10</span>
              <span className="w-9">20</span>
              <span className="ml-0.5">km</span>
            </div>
            <div className="flex">
              <span className="bar-d h-[5px] w-5" />
              <span className="bar-l h-[5px] w-5" />
              <span className="bar-d h-[5px] w-5" />
              <span className="bar-l h-[5px] w-9" />
            </div>
          </div>

          {/* Kontrol zoom */}
          <div className="absolute right-3 bottom-3 z-[810] flex flex-col overflow-hidden rounded-lg border border-cream-300 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => mapRef.current?.zoomIn()}
              className="flex h-8 w-8 items-center justify-center text-ocean-700 hover:bg-cream-100"
              aria-label="Perbesar peta laut"
            >
              <Plus className="size-4" />
            </button>
            <div className="border-t border-cream-300" />
            <button
              type="button"
              onClick={() => mapRef.current?.zoomOut()}
              className="flex h-8 w-8 items-center justify-center text-ocean-700 hover:bg-cream-100"
              aria-label="Perkecil peta laut"
            >
              <Minus className="size-4" />
            </button>
          </div>

          {/* Catatan singkat */}
          <div className="pointer-events-none absolute bottom-3 left-1/2 z-[800] hidden -translate-x-1/2 rounded-full border border-cream-300 bg-white/90 px-3 py-1 text-[10.5px] font-medium whitespace-nowrap text-ocean-700 sm:block">
            Angka di laut = kedalaman (m) · klik angka untuk detail koordinat
          </div>
        </div>

        {/* ------------------------- Panel info ------------------------- */}
        <aside className="flex flex-col gap-5 overflow-y-auto p-4 lg:p-5">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-ocean-400 uppercase">Legenda</p>
            <div className="mt-2.5 flex flex-col gap-2">
              <LegendItem
                swatch={<span className="leg-land h-3 w-6 rounded-sm border" />}
                label="Daratan"
              />
              <LegendItem
                swatch={<span className="leg-shallow h-3 w-6 rounded-sm border" />}
                label="Perairan dangkal (< 20 m)"
              />
              <LegendItem
                swatch={<span className="leg-contour h-0 w-6 border-t-2" />}
                label="Isobath 10–50 m"
              />
              <LegendItem
                swatch={<span className="leg-contour-deep h-0 w-6 border-t-2 border-dashed" />}
                label="Isobath 100–200 m"
              />
              <LegendItem
                swatch={<span className="leg-lane h-0 w-6 border-t-2 border-dashed" />}
                label="Alur pelayaran & jalur feri"
              />
              <LegendItem
                swatch={<span className="text-[12px] font-bold text-ocean-700">68</span>}
                label="Titik ukur kedalaman (m)"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: "Kedalaman Maksimum", val: `± ${maks} m` },
              { label: "Lebar Selat", val: "± 25 km" },
              { label: "Titik Ukur", val: `${SOUNDINGS.length} titik` },
              { label: "Skala Peta", val: "1 : 250.000" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-cream-300 bg-cream-100/70 p-2.5">
                <p className="text-[10.5px] text-ocean-500">{s.label}</p>
                <p className="mt-0.5 text-[13px] font-bold text-ocean-900">{s.val}</p>
              </div>
            ))}
          </div>

          <p className="flex items-start gap-2 text-[12px] leading-relaxed text-ocean-600">
            <MousePointerClick className="mt-0.5 size-4 shrink-0 text-ocean-500" />
            Klik angka kedalaman di peta untuk melihat detail titik ukur beserta koordinat
            desimal &amp; DMS.
          </p>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11.5px] leading-relaxed text-amber-800">
            <b>Catatan DEMO:</b> geometri pesisir disederhanakan dan angka kedalaman bersifat
            ilustratif — peta ini tidak dapat digunakan sebagai acuan navigasi.
          </div>
        </aside>
      </div>
    </div>
  );
}
