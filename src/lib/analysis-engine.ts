/* =====================================================================
   Bluetech — Analysis Engine (MCDA: AHP + Weighted Overlay + Boolean)
   ---------------------------------------------------------------------
   Semua data spasial pada modul ini adalah DATA DEMO / SIMULASI yang
   dibangkitkan secara deterministik (bukan hasil observasi lapangan).
   Setiap hasil analisis diberi label DEMO di antarmuka.
   ===================================================================== */

/* --------------------------- Grid & Area Kajian --------------------------- */

export const GRID_W = 72;
export const GRID_H = 48;
export const CELL_AREA_KM2 = 0.825; // ≈ 0,9 km resolusi — total 2.850 km²
export const TOTAL_AREA_KM2 = GRID_W * GRID_H * CELL_AREA_KM2; // 2.850

// BBox area kajian (Teluk Ambon & sekitarnya) — DEMO
export const BBOX = { south: -3.9, north: -3.28, west: 127.85, east: 128.55 };

export function cellToLatLon(idx: number): { lat: number; lon: number } {
  const cx = idx % GRID_W;
  const cy = Math.floor(idx / GRID_W);
  const lat = BBOX.south + ((cy + 0.5) / GRID_H) * (BBOX.north - BBOX.south);
  const lon = BBOX.west + ((cx + 0.5) / GRID_W) * (BBOX.east - BBOX.west);
  return { lat, lon };
}

export function latLonToCell(lat: number, lon: number): number {
  const fx = ((lon - BBOX.west) / (BBOX.east - BBOX.west)) * GRID_W;
  const fy = ((lat - BBOX.south) / (BBOX.north - BBOX.south)) * GRID_H;
  const cx = Math.min(GRID_W - 1, Math.max(0, Math.floor(fx)));
  const cy = Math.min(GRID_H - 1, Math.max(0, Math.floor(fy)));
  return cy * GRID_W + cx;
}

/* --------------------------- Deterministic noise --------------------------- */

function hash2(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

// value-noise dengan bilinear interpolation → medan halus & deterministik
function noise2(x: number, y: number, seed: number, scale: number): number {
  const fx = (x / GRID_W) * scale;
  const fy = (y / GRID_H) * scale;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const v00 = hash2(x0, y0, seed);
  const v10 = hash2(x0 + 1, y0, seed);
  const v01 = hash2(x0, y0 + 1, seed);
  const v11 = hash2(x0 + 1, y0 + 1, seed);
  return v00 + (v10 - v00) * sx + (v01 - v00) * sy + (v10 - v00 + v11 - v01) * sx * sy * 0.5 + (v01 - v00) * sy * (1 - sx) * 0.5;
}

function fbm(x: number, y: number, seed: number): number {
  return (
    noise2(x, y, seed, 5) * 0.55 +
    noise2(x, y, seed + 7, 11) * 0.28 +
    noise2(x, y, seed + 13, 21) * 0.17
  );
}

/* --------------------------- Geometri dasar (demosi) --------------------------- */

// Garis pantai sintetis — geografi mirip Ambon (DEMO): massa daratan Leitimur
// di selatan, pita Leihitu di tepi utara, Teluk Ambon memotong dari barat,
// satu pulau kecil di timur. Hasil = jarak bertanda ke daratan terdekat
// (positif = laut, negatif = daratan), dalam satuan ny (1 unit ≈ 1,43 km).
function shoreFunction(cx: number, cy: number): number {
  const nx = cx / GRID_W;
  const ny = cy / GRID_H;
  const rough = fbm(nx * 40, ny * 40, 3) - 0.5; // -0,5..0,5

  // Leitimur: daratan selatan; laut bila ny > pantai ATAU nx > 0,80
  const southCoast = 0.40 + 0.05 * Math.sin(nx * 9.5 + 0.8) + rough * 0.10;
  // Teluk Ambon: teluk memotong massa daratan dari barat (nx ≈ 0,10..0,55)
  const bay = Math.exp(-Math.pow((nx - 0.32) / 0.15, 2)) * 0.26;
  const dLeitimur = Math.max(ny - southCoast + bay + rough * 0.04, nx - 0.80);

  // Leihitu: pita daratan tepi utara — laut bila ny < 0,885 ATAU nx di luar 0,30..0,66
  const dLeihitu = Math.max(0.885 - ny - 0.018 * Math.sin(nx * 13), 0.30 - nx, nx - 0.66);

  // pulau kecil di timur (mirip Haruku — DEMO)
  const dIsland = Math.hypot((nx - 0.86) * 2.4, (ny - 0.285) * 4.6) - 0.085;

  // negatif = berada di dalam salah satu massa daratan (union)
  return Math.min(dLeitimur, dLeihitu, dIsland);
}

export const KM_PER_CELL_X = 1.08; // ≈ jarak tengah sel (DEMO)
export const KM_PER_CELL_Y = 1.43;

export interface BaseLayers {
  distLand: Float32Array; // km dari garis pantai (laut > 0)
  isLand: Uint8Array;
  depth: Float32Array; // m
  slope: Float32Array; // derajat
  waveHs: Float32Array; // m
  currentSpeed: Float32Array; // m/s
  tideRange: Float32Array; // m
  elevation: Float32Array; // m daratan
  mangrove: Float32Array; // 0–1 kerapatan
  coral: Float32Array; // 0–1 penutupan
  seagrass: Float32Array; // 0–1 penutupan
  substrate: Uint8Array; // 0 lumpur, 1 pasir, 2 karang/batuan
  distPort: Float32Array; // km
  distCoast: Float32Array; // km (≈ distLand untuk laut)
  laneDist: Float32Array; // km ke alur pelayaran
  zoneId: Uint8Array; // 0 none, 1 pariwisata, 2 mangrove, 3 tambak, 4 pelabuhan, 5 konservasi
  konservasiCore: Uint8Array;
  abrasionRate: Float32Array; // m/tahun (negatif = abrasi)
  sedimentRate: Float32Array; // m/5 tahun (positif = pendangkalan)
  exposure: Float32Array; // 0–1 paparan laut terbuka
  windSpeed: Float32Array; // m/s kecepatan angin (DEMO)
}

export const PORTS = [
  { id: "P1", name: "Pelabuhan Bitung Baru", lat: -3.38, lon: 128.17, depth: 18 },
  { id: "P2", name: "Pelabuhan Perikanan Tual", lat: -3.66, lon: 128.02, depth: 8 },
];

// Alur pelayaran (polyline lat/lon) — DEMO
export const SHIPPING_LANE: [number, number][] = [
  [-3.86, 128.52],
  [-3.72, 128.4],
  [-3.55, 128.3],
  [-3.48, 128.18],
  [-3.44, 128.05],
  [-3.5, 127.92],
];

// Zona tata ruang laut (polygon lat/lon) — DEMO
export const ZONE_POLYGONS: { id: number; label: string; color: string; ring: [number, number][] }[] = [
  {
    id: 1,
    label: "Pariwisata Bahari",
    color: "#4285f4",
    ring: [
      [-3.35, 128.35], [-3.33, 128.47], [-3.45, 128.5], [-3.52, 128.42], [-3.47, 128.33],
    ],
  },
  {
    id: 2,
    label: "Mangrove",
    color: "#2e9e4f",
    ring: [
      [-3.5, 127.88], [-3.49, 127.98], [-3.58, 128.02], [-3.66, 127.99], [-3.68, 127.9], [-3.6, 127.86],
    ],
  },
  {
    id: 3,
    label: "Tambak",
    color: "#e7c33f",
    ring: [
      [-3.7, 128.08], [-3.68, 128.18], [-3.76, 128.22], [-3.82, 128.15], [-3.79, 128.06],
    ],
  },
  {
    id: 4,
    label: "Pelabuhan",
    color: "#a866dd",
    ring: [
      [-3.33, 128.12], [-3.32, 128.2], [-3.4, 128.23], [-3.42, 128.15],
    ],
  },
  {
    id: 5,
    label: "Konservasi",
    color: "#3bc2a8",
    ring: [
      [-3.34, 127.9], [-3.32, 128.0], [-3.42, 128.04], [-3.5, 128.0], [-3.52, 127.9], [-3.44, 127.86],
    ],
  },
];

export const KONSERVASI_CORE: [number, number][] = [
  [-3.36, 127.92], [-3.35, 127.99], [-3.42, 128.02], [-3.47, 127.99], [-3.48, 127.91], [-3.42, 127.88],
];

function pointInRing(lat: number, lon: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [latI, lonI] = ring[i];
    const [latJ, lonJ] = ring[j];
    if (lonI > lon !== lonJ > lon && lat < ((latJ - latI) * (lon - lonI)) / (lonJ - lonI) + latI) {
      inside = !inside;
    }
  }
  return inside;
}

function segDistKm(lat: number, lon: number, a: [number, number], b: [number, number]): number {
  // proyeksi equirectangular lokal
  const kx = 111.32 * Math.cos(((lat * Math.PI) / 180));
  const ky = 110.57;
  const px = lon * kx;
  const py = lat * ky;
  const ax = a[1] * kx;
  const ay = a[0] * ky;
  const bx = b[1] * kx;
  const by = b[0] * ky;
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1e-9)));
  const ex = ax + t * dx;
  const ey = ay + t * dy;
  return Math.hypot(px - ex, py - ey);
}

/* --------------------------- Pembangkitan layer DEMO --------------------------- */

let _layers: BaseLayers | null = null;

export function getBaseLayers(): BaseLayers {
  if (_layers) return _layers;
  const n = GRID_W * GRID_H;
  const L: BaseLayers = {
    distLand: new Float32Array(n),
    isLand: new Uint8Array(n),
    depth: new Float32Array(n),
    slope: new Float32Array(n),
    waveHs: new Float32Array(n),
    currentSpeed: new Float32Array(n),
    tideRange: new Float32Array(n),
    elevation: new Float32Array(n),
    mangrove: new Float32Array(n),
    coral: new Float32Array(n),
    seagrass: new Float32Array(n),
    substrate: new Uint8Array(n),
    distPort: new Float32Array(n),
    distCoast: new Float32Array(n),
    laneDist: new Float32Array(n),
    zoneId: new Uint8Array(n),
    konservasiCore: new Uint8Array(n),
    abrasionRate: new Float32Array(n),
    sedimentRate: new Float32Array(n),
    exposure: new Float32Array(n),
    windSpeed: new Float32Array(n),
  };

  // pass 1: garis pantai + kedalaman + oseanografi
  for (let cy = 0; cy < GRID_H; cy++) {
    for (let cx = 0; cx < GRID_W; cx++) {
      const idx = cy * GRID_W + cx;
      const s = shoreFunction(cx, cy);
      const rough = fbm(cx, cy, 11);
      if (s <= 0.005) {
        L.isLand[idx] = 1;
        L.distLand[idx] = -0.2;
        L.depth[idx] = 0;
        // dataran rendah pesisir: elevasi naik menjauh dari pantai (DEMO)
        // s ≈ jarak bertanda (negatif di darat); |s| kecil = tepat di garis pantai
        const inland = Math.min(0.6, Math.abs(s));
        L.elevation[idx] = Math.max(0.12, Math.min(14, (0.35 + inland * 26) * (0.55 + fbm(cx, cy, 17) * 0.9)));
      } else {
        const distKm = s * 26 * (0.75 + rough * 0.5);
        L.distLand[idx] = distKm;
        L.distCoast[idx] = distKm;
        // rak pantai: 0,3 m di garis pantai, ≈ 8 m pada 1 km, membuka ke laut lepas
        L.depth[idx] = Math.min(60, 0.3 + distKm * 7.5 + rough * 8 + fbm(cx, cy, 41) * 6);
        L.elevation[idx] = 0;
      }
      const nx = cx / GRID_W;
      const ny = cy / GRID_H;
      // paparan: timur & selatan = laut terbuka; teluk/perairan tertutup = tenang
      const shelter = Math.min(1, (L.distCoast[idx] || 0) / 4);
      L.exposure[idx] = Math.max(0, Math.min(1, (0.25 + nx * 0.55 + ny * 0.3 + (rough - 0.5) * 0.25) * (0.25 + 0.75 * shelter)));
      L.waveHs[idx] = L.isLand[idx] ? 0 : 0.35 + L.exposure[idx] * 4.2 + (rough - 0.5) * 0.8;
      // angin: makin terbuka makin kencang (DEMO) — ≈ 2,2–9,6 m/s
      L.windSpeed[idx] = L.isLand[idx] ? 0 : 2.2 + L.exposure[idx] * 5.8 + (rough - 0.5) * 1.6;
      L.currentSpeed[idx] = L.isLand[idx] ? 0 : (0.12 + 0.65 * Math.abs(Math.sin(nx * 6.5 + ny * 3.2))) * (0.4 + 0.6 * shelter) + rough * 0.1;
      L.tideRange[idx] = 1.4 + rough * 0.9;
    }
  }

  // pass 2: lereng (gradien kedalaman), ekosistem, substrat
  for (let cy = 0; cy < GRID_H; cy++) {
    for (let cx = 0; cx < GRID_W; cx++) {
      const idx = cy * GRID_W + cx;
      if (L.isLand[idx]) {
        L.slope[idx] = 2.5;
        continue;
      }
      const dE = (L.depth[idx + (cx < GRID_W - 1 ? 1 : 0)] ?? L.depth[idx]) - L.depth[idx - (cx > 0 ? 1 : 0)];
      const dS = (L.depth[idx + (cy < GRID_H - 1 ? GRID_W : 0)] ?? L.depth[idx]) - L.depth[idx - (cy > 0 ? GRID_W : 0)];
      const grad = Math.hypot(dE, dS) * 7.5; // m per km
      L.slope[idx] = Math.min(12, (Math.atan(grad / 100) * 180) / Math.PI * 2.2);

      const rough = fbm(cx, cy, 23);
      const d = L.depth[idx];
      // mangrove: pesisir dangkal barat-daya
      const mgBand = Math.exp(-Math.pow(d / 2.2, 2)) * Math.exp(-Math.pow((cy / GRID_H - 0.62) * 2.1, 2));
      L.mangrove[idx] = Math.max(0, Math.min(1, mgBand * (0.35 + rough * 0.9)));
      // karang: dangkal–menengah, paparan sedang
      const crBand = Math.exp(-Math.pow((d - 7) / 5.5, 2)) * (0.35 + L.exposure[idx] * 0.6);
      L.coral[idx] = Math.max(0, Math.min(1, crBand * (0.3 + rough * 0.85)));
      // lamun: teluk dangkal tenang
      const sgBand = Math.exp(-Math.pow((d - 3.5) / 2.6, 2)) * (1 - L.exposure[idx] * 0.7);
      L.seagrass[idx] = Math.max(0, Math.min(1, sgBand * (0.3 + rough * 0.8)));
      // substrat
      L.substrate[idx] = d < 2 ? 0 : L.coral[idx] > 0.45 ? 2 : rough > 0.55 ? 1 : 0;
    }
  }

  // pass 3: infrastruktur, alur, zona, risiko
  for (let cy = 0; cy < GRID_H; cy++) {
    for (let cx = 0; cx < GRID_W; cx++) {
      const idx = cy * GRID_W + cx;
      const { lat, lon } = cellToLatLon(idx);
      let dp = Infinity;
      for (const p of PORTS) dp = Math.min(dp, Math.hypot((lat - p.lat) * 110.57, (lon - p.lon) * 111.32 * Math.cos((lat * Math.PI) / 180)));
      L.distPort[idx] = dp;
      let dl = Infinity;
      for (let i = 0; i < SHIPPING_LANE.length - 1; i++) {
        dl = Math.min(dl, segDistKm(lat, lon, SHIPPING_LANE[i], SHIPPING_LANE[i + 1]));
      }
      L.laneDist[idx] = dl;
      let z = 0;
      for (const zp of ZONE_POLYGONS) if (pointInRing(lat, lon, zp.ring)) z = zp.id;
      L.zoneId[idx] = z;
      L.konservasiCore[idx] = pointInRing(lat, lon, KONSERVASI_CORE) ? 1 : 0;
      // abrasi: pantai terbuka tanpa mangrove
      if (!L.isLand[idx] && L.distLand[idx] < 1.2) {
        L.abrasionRate[idx] = -(0.2 + L.exposure[idx] * 2.6) * (1 - L.mangrove[idx] * 0.85) * (0.5 + fbm(cx, cy, 31) * 0.8);
      } else if (L.isLand[idx] && L.elevation[idx] < 1.5) {
        L.abrasionRate[idx] = -(0.1 + fbm(cx, cy, 31) * 1.2);
      } else {
        L.abrasionRate[idx] = L.distLand[idx] < 3 && L.mangrove[idx] > 0.25 ? 0.15 + fbm(cx, cy, 33) * 1.4 : 0;
      }
      // sedimentasi: pendangkalan di teluk tenang
      L.sedimentRate[idx] = L.isLand[idx] ? 0 : Math.max(0, (0.9 - L.exposure[idx]) * (0.25 + fbm(cx, cy, 37) * 1.5) * (L.depth[idx] < 12 ? 1 : 0.4));
    }
  }

  _layers = L;
  return L;
}

/* --------------------------- AHP --------------------------- */

export interface AhpResult {
  weights: number[];
  cr: number;
  lambdaMax: number;
  ci: number;
}

/** Hitung bobot AHP dari matriks perbandingan berpasangan (metode eigenvector / power iteration). */
export function ahpWeights(matrix: number[][]): AhpResult {
  const n = matrix.length;
  // normalisasi kolom
  const colSum = new Array(n).fill(0);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) colSum[j] += matrix[i][j];
  let w = new Array(n).fill(1 / n);
  for (let i = 0; i < n; i++) w[i] = matrix[i].reduce((a, v, j) => a + v / colSum[j], 0) / n;
  // power iteration untuk eigenvector utama
  for (let iter = 0; iter < 60; iter++) {
    const nw = new Array(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) nw[i] += matrix[i][j] * w[j];
    const norm = nw.reduce((a, v) => a + v, 0);
    for (let i = 0; i < n; i++) nw[i] /= norm || 1;
    let diff = 0;
    for (let i = 0; i < n; i++) diff = Math.max(diff, Math.abs(nw[i] - w[i]));
    w = nw;
    if (diff < 1e-9) break;
  }
  const lambdaMax = w.reduce((a, wi, i) => a + matrix[i].reduce((b, v, j) => b + v * w[j], 0) / wi, 0) / n;
  const ci = (lambdaMax - n) / (n - 1 || 1);
  const RI = [0, 0, 0.58, 0.9, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49];
  const cr = n > 2 ? ci / (RI[n - 1] || 1.49) : 0;
  return { weights: w, cr, lambdaMax, ci };
}

/* --------------------------- Kriteria & konfigurasi pemanfaatan --------------------------- */

export const CRITERIA_GROUPS = [
  { id: "batimetri", label: "Batimetri" },
  { id: "oseanografi", label: "Oseanografi" },
  { id: "ekosistem", label: "Ekosistem" },
  { id: "aksesibilitas", label: "Aksesibilitas" },
  { id: "kebencanaan", label: "Kebencanaan" },
  { id: "tataruang", label: "Tata Ruang" },
] as const;

export type CriterionId =
  | "kedalaman" | "kemiringan"
  | "gelombang" | "arus" | "angin"
  | "ekosistem"
  | "jarakPantai" | "jarakPelabuhan" | "aksesJalan"
  | "risikoBencana" | "perubahanGarisPantai"
  | "kesesuaianZona";

export const CRITERIA_LABEL: Record<CriterionId, string> = {
  kedalaman: "Kedalaman Perairan",
  kemiringan: "Kemiringan Dasar Perairan",
  gelombang: "Tinggi Gelombang",
  arus: "Kecepatan Arus",
  angin: "Kecepatan Angin",
  ekosistem: "Kondisi Ekosistem",
  jarakPantai: "Jarak dari Garis Pantai",
  jarakPelabuhan: "Jarak dari Pelabuhan",
  aksesJalan: "Akses Infrastruktur",
  risikoBencana: "Risiko Bencana",
  perubahanGarisPantai: "Perubahan Garis Pantai",
  kesesuaianZona: "Kesesuaian Zona Tata Ruang",
};

export interface PemanfaatanConfig {
  id: string;
  label: string;
  short: string;
  icon: "waves" | "tree" | "fish" | "ship" | "anchor" | "shield";
  color: string;
  desc: string;
  /** matriks AHP 6×6 antar kelompok kriteria (Saaty) */
  ahpMatrix: number[][];
  /** sub-bobot dalam kelompok (dirata-ratakan ke 1 per kelompok) */
  subWeights: Partial<Record<CriterionId, number>>;
  /** fungsi kesesuaian tiap kriteria (nilai fisik → skor 0–100) */
  score: Record<CriterionId, (L: BaseLayers, idx: number) => number>;
  /** batasan Boolean — true = sel TERLARANG */
  constraints: (L: BaseLayers, idx: number) => boolean;
  /** kedalaman bawaan (m) */
  defaultDepth: number;
  kedalamanRange: [number, number];
  /** ambang kelas khusus (opsional) — bawaan: S1 78 / S2 62 / S3 47 */
  threshold?: { s1: number; s2: number; s3: number };
}

const bell = (v: number, lo: number, hi: number, ramp: number) => {
  if (v >= lo && v <= hi) return 100;
  if (v < lo) return Math.max(0, 100 - ((lo - v) / ramp) * 100);
  return Math.max(0, 100 - ((v - hi) / ramp) * 100);
};
const rampDown = (v: number, ideal: number, zeroAt: number) =>
  v <= ideal ? 100 : Math.max(0, 100 - ((v - ideal) / (zeroAt - ideal)) * 100);
const rampUp = (v: number, ideal: number, zeroAt: number) =>
  v >= ideal ? 100 : Math.max(0, (v / ideal) * 100 - (0 / zeroAt) * 100);

const ecoRichness = (L: BaseLayers, idx: number) => Math.min(1, L.mangrove[idx] * 1.2 + L.coral[idx] + L.seagrass[idx] * 0.9);

const CRIT = {
  kedalaman: (lo: number, hi: number, ramp: number) => (L: BaseLayers, i: number) => bell(L.depth[i], lo, hi, ramp),
  kemiringan: (ideal: number, zero: number) => (L: BaseLayers, i: number) => rampDown(L.slope[i], ideal, zero),
  gelombang: (ideal: number, zero: number) => (L: BaseLayers, i: number) => rampDown(L.waveHs[i], ideal, zero),
  arus: (ideal: number, zero: number) => (L: BaseLayers, i: number) => rampDown(L.currentSpeed[i], ideal, zero),
  ekosistem: (mode: "tinggi" | "rendah") => (L: BaseLayers, i: number) =>
    mode === "tinggi" ? Math.min(100, ecoRichness(L, i) * 100 + 15) : Math.max(0, 100 - ecoRichness(L, i) * 130),
  jarakPantai: (lo: number, hi: number, ramp: number) => (L: BaseLayers, i: number) => bell(L.distCoast[i], lo, hi, ramp),
  jarakPelabuhan: (lo: number, hi: number, ramp: number) => (L: BaseLayers, i: number) => bell(L.distPort[i], lo, hi, ramp),
  aksesJalan: (L: BaseLayers, i: number) => rampDown(L.distPort[i] / 1.6 + L.distCoast[i] * 0.4, 2, 26),
  risikoBencana: (L: BaseLayers, i: number) =>
    Math.max(0, 100 - (Math.min(1, -L.abrasionRate[i] / 2.5) * 55 + Math.min(1, L.waveHs[i] / 5) * 25 + (L.laneDist[i] < 0.5 ? 20 : 0))),
  // prioritas mitigasi: makin tinggi risiko = makin layak dituju aksi mitigasi
  prioritasMitigasi: (L: BaseLayers, i: number) =>
    Math.min(
      100,
      Math.min(1, -L.abrasionRate[i] / 0.9) * 50 +
        Math.min(1, L.waveHs[i] / 1.6) * 30 +
        Math.min(1, L.windSpeed[i] / 3.6) * 20
    ),
  // angin: mode "tenang" (wisata) vs "kuat" (prioritas mitigasi, skala pesisir)
  angin: (mode: "tenang" | "kuat") => (L: BaseLayers, i: number) =>
    mode === "tenang" ? rampDown(L.windSpeed[i], 5.5, 9) : Math.min(100, (L.windSpeed[i] / 3.6) * 100),
  // perubahan garis pantai: "stabil" (wisata menghindari abrasi) vs "berubah" (prioritas mitigasi)
  perubahanGarisPantai: (mode: "stabil" | "berubah") => (L: BaseLayers, i: number) =>
    mode === "stabil"
      ? rampDown(Math.abs(L.abrasionRate[i]), 0.8, 2.6)
      : Math.min(100, (Math.abs(L.abrasionRate[i]) / 0.9) * 100),
  kesesuaianZona: (L: BaseLayers, i: number) => (L.konservasiCore[i] ? 0 : L.zoneId[i] === 0 ? 70 : 100),
};

export const PEMANFAATAN: PemanfaatanConfig[] = [
  {
    id: "pariwisata",
    label: "Pariwisata Bahari & Pantai",
    short: "Pariwisata",
    icon: "waves",
    color: "#1686C5",
    desc: "Pengembangan wisata bahari: pantai, snorkeling/diving, dan wahana laut.",
    defaultDepth: 5,
    kedalamanRange: [1, 15],
    ahpMatrix: [
      [1, 3, 2, 3, 5, 3],
      [1 / 3, 1, 1 / 2, 2, 3, 1],
      [1 / 2, 2, 1, 3, 4, 2],
      [1 / 3, 1 / 2, 1 / 3, 1, 2, 1 / 2],
      [1 / 5, 1 / 3, 1 / 4, 1 / 2, 1, 1 / 3],
      [1 / 3, 1, 1 / 2, 2, 3, 1],
    ],
    subWeights: {
      kedalaman: 0.7, kemiringan: 0.3,
      gelombang: 0.45, arus: 0.25, angin: 0.3,
      ekosistem: 1,
      jarakPantai: 0.6, jarakPelabuhan: 0.4, aksesJalan: 1,
      risikoBencana: 0.6, perubahanGarisPantai: 0.4,
      kesesuaianZona: 1,
    },
    score: {
      kedalaman: CRIT.kedalaman(1.5, 8, 6),
      kemiringan: CRIT.kemiringan(3, 10),
      gelombang: CRIT.gelombang(1.0, 2.5),
      arus: CRIT.arus(0.4, 0.9),
      angin: CRIT.angin("tenang"),
      ekosistem: CRIT.ekosistem("tinggi"),
      jarakPantai: CRIT.jarakPantai(0.2, 2.5, 4),
      jarakPelabuhan: CRIT.jarakPelabuhan(1, 8, 12),
      aksesJalan: CRIT.aksesJalan,
      risikoBencana: CRIT.risikoBencana,
      perubahanGarisPantai: CRIT.perubahanGarisPantai("stabil"),
      kesesuaianZona: CRIT.kesesuaianZona,
    },
    constraints: (L, i) => L.isLand[i] === 1 || L.konservasiCore[i] === 1 || L.zoneId[i] === 3 || L.laneDist[i] < 0.4,
  },
  {
    id: "mitigasi-bencana",
    label: "Mitigasi Bencana Pesisir",
    short: "Mitigasi Bencana",
    icon: "shield",
    color: "#147d67",
    desc: "Penempatan aksi & prasarana mitigasi: breakwater, tanggul, rehabilitasi pantai, dan shelter evakuasi.",
    defaultDepth: 4,
    kedalamanRange: [0.5, 12],
    ahpMatrix: [
      [1, 1 / 2, 2, 3, 1 / 3, 2],
      [2, 1, 3, 4, 1 / 2, 3],
      [1 / 2, 1 / 3, 1, 2, 1 / 3, 1],
      [1 / 3, 1 / 4, 1 / 2, 1, 1 / 4, 1 / 2],
      [3, 2, 3, 4, 1, 4],
      [1 / 2, 1 / 3, 1, 2, 1 / 4, 1],
    ],
    subWeights: {
      kedalaman: 0.7, kemiringan: 0.3,
      gelombang: 0.4, arus: 0.2, angin: 0.4,
      ekosistem: 1,
      jarakPantai: 0.7, jarakPelabuhan: 0.3, aksesJalan: 1,
      risikoBencana: 0.5, perubahanGarisPantai: 0.5,
      kesesuaianZona: 1,
    },
    score: {
      kedalaman: CRIT.kedalaman(1, 6, 5),
      kemiringan: CRIT.kemiringan(2, 7),
      // tinggi gelombang & angin kencang = prioritas lokasi mitigasi (skala pesisir)
      gelombang: (L, i) => Math.min(100, (L.waveHs[i] / 1.6) * 100),
      arus: (L, i) => Math.min(100, (L.currentSpeed[i] / 0.35) * 100),
      angin: CRIT.angin("kuat"),
      ekosistem: CRIT.ekosistem("rendah"),
      jarakPantai: CRIT.jarakPantai(0.1, 1.5, 3),
      jarakPelabuhan: CRIT.jarakPelabuhan(1, 12, 18),
      aksesJalan: CRIT.aksesJalan,
      risikoBencana: CRIT.prioritasMitigasi,
      perubahanGarisPantai: CRIT.perubahanGarisPantai("berubah"),
      kesesuaianZona: CRIT.kesesuaianZona,
    },
    constraints: (L, i) =>
      L.isLand[i] === 1 || L.konservasiCore[i] === 1 || L.depth[i] > 14 || L.laneDist[i] < 0.3,
    threshold: { s1: 66, s2: 52, s3: 40 },
  },
];

export const PEMANFAATAN_LABEL = (id: string) => PEMANFAATAN.find((p) => p.id === id)?.label ?? id;

/* --------------------------- Mesin Weighted Overlay --------------------------- */

export interface ClassStats {
  kelas: "S1" | "S2" | "S3" | "N";
  label: string;
  pct: number;
  luasKm2: number;
  color: string;
}

export interface Candidate {
  rank: number;
  lat: number;
  lon: number;
  score: number;
  kelas: "S1" | "S2" | "S3";
  depth: number;
  luasHa: number;
  factorsPos: string[];
  factorsNeg: string[];
  riskLevel: string;
  rekomendasi: string;
  cellIdx: number;
}

export interface SuitabilityResult {
  configId: string;
  configLabel: string;
  wilayah: string;
  scores: Float32Array;
  classes: Uint8Array; // 0=S1,1=S2,2=S3,3=N,4=terlarang
  stats: ClassStats[];
  candidates: Candidate[];
  groupWeights: Record<string, number>;
  critWeights: Record<string, number>;
  cr: number;
  threshold: { s1: number; s2: number; s3: number };
  kedalamanMin: number;
  countS1: number;
  totalValid: number;
  demo: true;
}

export const CLASS_META = [
  { kelas: "S1", label: "Sangat Sesuai", color: "#2EAA70" },
  { kelas: "S2", label: "Cukup Sesuai", color: "#1686C5" },
  { kelas: "S3", label: "Sesuai Bersyarat", color: "#F3C747" },
  { kelas: "N", label: "Tidak Sesuai", color: "#E75B55" },
] as const;

function classify(score: number, t: { s1: number; s2: number; s3: number }): number {
  if (score >= t.s1) return 0;
  if (score >= t.s2) return 1;
  if (score >= t.s3) return 2;
  return 3;
}

/** Pemilihan kandidat: pencarian max lokal pada grid skor + klastroid sederhana. */
function pickCandidates(scores: Float32Array, classes: Uint8Array, max = 5): Candidate[] {
  const scored: { idx: number; score: number }[] = [];
  for (let i = 0; i < scores.length; i++) {
    if (classes[i] > 1) continue;
    scored.push({ idx: i, score: scores[i] });
  }
  scored.sort((a, b) => b.score - a.score);
  const chosen: number[] = [];
  // Jarak minimum antar kandidat: mulai 7 sel, dilonggarkan bertahap
  // hingga 2 sel bila kandidat yang lolos kurang (wilayah kecil/terkluster).
  const target = max;
  for (let minCellDist = 7; minCellDist >= 2; minCellDist -= 1.5) {
    for (const s of scored) {
      if (chosen.includes(s.idx)) continue;
      const cx = s.idx % GRID_W;
      const cy = Math.floor(s.idx / GRID_W);
      let ok = true;
      for (const c of chosen) {
        const dx = ((c % GRID_W) - cx) ** 2;
        const dy = (Math.floor(c / GRID_W) - cy) ** 2;
        if (dx + dy < minCellDist * minCellDist) {
          ok = false;
          break;
        }
      }
      if (ok) chosen.push(s.idx);
      if (chosen.length >= target) break;
    }
    if (chosen.length >= Math.min(3, target)) break;
  }
  chosen.sort((a, b) => scores[b] - scores[a]);

  const L = getBaseLayers();
  return chosen.map((idx, i) => {
    const { lat, lon } = cellToLatLon(idx);
    const s = scores[idx];
    const cls: Candidate["kelas"] = s >= 80 ? "S1" : s >= 65 ? "S2" : "S3";
    // faktor pendukung & pembatas dari kriteria utama
    const vals: [string, number][] = [
      ["Kedalaman sesuai", CRIT.kedalaman(2, 12, 10)(L, idx)],
      ["Gelombang tenang", CRIT.gelombang(1, 3)(L, idx)],
      ["Ekosistem baik", Math.min(100, ecoRichness(L, idx) * 115)],
      ["Dekat pelabuhan", rampUp(20 - L.distPort[idx], 20, 20)],
      ["Jauh dari alur", rampUp(L.laneDist[idx], 2, 2)],
      ["Risiko rendah", CRIT.risikoBencana(L, idx)],
    ];
    vals.sort((a, b) => b[1] - a[1]);
    const factorsPos = vals.filter((v) => v[1] >= 75).slice(0, 3).map((v) => v[0]);
    const factorsNeg = vals.filter((v) => v[1] < 55).slice(0, 3).map((v) => v[0]);
    const risk = CRIT.risikoBencana(L, idx);
    const riskLevel = risk >= 70 ? "Rendah" : risk >= 45 ? "Sedang" : "Tinggi";
    return {
      rank: i + 1,
      lat,
      lon,
      score: Math.round(s * 10) / 10,
      kelas: cls,
      depth: Math.round(L.depth[idx] * 10) / 10,
      luasHa: Math.round(CELL_AREA_KM2 * 100),
      factorsPos,
      factorsNeg,
      riskLevel,
      rekomendasi:
        cls === "S1"
          ? "Prioritaskan untuk pengembangan; lanjutkan dengan survei lapangan terperinci."
          : cls === "S2"
            ? "Layak dimanfaatkan dengan mitigasi teknis pada parameter terbatas."
            : "Perlu penyesuaian parameter dan kajian tambahan sebelum pemanfaatan.",
      cellIdx: idx,
    };
  });
}

export interface RunParams {
  kedalamanMin?: number;
  wilayah?: string;
}

export function runSuitability(configId: string, params: RunParams = {}): SuitabilityResult {
  const cfg = PEMANFAATAN.find((p) => p.id === configId) ?? PEMANFAATAN[0];
  const L = getBaseLayers();
  const n = GRID_W * GRID_H;
  const thr = cfg.threshold ?? { s1: 78, s2: 62, s3: 47 };

  // AHP kelompok
  const ahp = ahpWeights(cfg.ahpMatrix);
  const gw: Record<string, number> = {};
  CRITERIA_GROUPS.forEach((g, i) => (gw[g.id] = ahp.weights[i]));

  // gabung sub-bobot → bobot kriteria akhir (ternormalisasi)
  const groupOf: Record<CriterionId, string> = {
    kedalaman: "batimetri", kemiringan: "batimetri",
    gelombang: "oseanografi", arus: "oseanografi", angin: "oseanografi",
    ekosistem: "ekosistem",
    jarakPantai: "aksesibilitas", jarakPelabuhan: "aksesibilitas", aksesJalan: "aksesibilitas",
    risikoBencana: "kebencanaan", perubahanGarisPantai: "kebencanaan",
    kesesuaianZona: "tataruang",
  };
  const critWeights: Record<string, number> = {};
  const ids = Object.keys(groupOf) as CriterionId[];
  for (const g of CRITERIA_GROUPS) {
    const subs = ids.filter((c) => groupOf[c] === g.id);
    const subW = subs.map((c) => cfg.subWeights[c] ?? 1 / subs.length);
    const sum = subW.reduce((a, v) => a + v, 0);
    subs.forEach((c, i) => (critWeights[c] = gw[g.id] * (subW[i] / sum)));
  }

  const depthMin = params.kedalamanMin ?? cfg.defaultDepth;
  const scores = new Float32Array(n);
  const classes = new Uint8Array(n);
  let countS1 = 0;
  let totalValid = 0;

  for (let i = 0; i < n; i++) {
    if (L.isLand[i]) {
      classes[i] = 4;
      continue;
    }
    if (cfg.constraints(L, i)) {
      classes[i] = 4;
      continue;
    }
    // Boolean constraint: kedalaman minimum pengguna
    const dAdj = L.depth[i] < depthMin * 0.6 ? 0 : Math.min(100, (L.depth[i] / Math.max(depthMin, 0.5)) * 100);
    let s = 0;
    s += (0.7 * cfg.score.kedalaman(L, i) + 0.3 * Math.min(100, dAdj)) * (critWeights["kedalaman"] ?? 0);
    s += cfg.score.kemiringan(L, i) * (critWeights["kemiringan"] ?? 0);
    s += cfg.score.gelombang(L, i) * (critWeights["gelombang"] ?? 0);
    s += cfg.score.arus(L, i) * (critWeights["arus"] ?? 0);
    s += cfg.score.angin(L, i) * (critWeights["angin"] ?? 0);
    s += cfg.score.ekosistem(L, i) * (critWeights["ekosistem"] ?? 0);
    s += cfg.score.jarakPantai(L, i) * (critWeights["jarakPantai"] ?? 0);
    s += cfg.score.jarakPelabuhan(L, i) * (critWeights["jarakPelabuhan"] ?? 0);
    s += cfg.score.aksesJalan(L, i) * (critWeights["aksesJalan"] ?? 0);
    s += cfg.score.risikoBencana(L, i) * (critWeights["risikoBencana"] ?? 0);
    s += cfg.score.perubahanGarisPantai(L, i) * (critWeights["perubahanGarisPantai"] ?? 0);
    s += cfg.score.kesesuaianZona(L, i) * (critWeights["kesesuaianZona"] ?? 0);
    scores[i] = Math.max(0, Math.min(100, s));
    classes[i] = classify(scores[i], thr);
    totalValid++;
    if (classes[i] === 0) countS1++;
  }

  const stats: ClassStats[] = CLASS_META.map((m, k) => {
    let c = 0;
    for (let i = 0; i < n; i++) if (classes[i] === k) c++;
    const pct = (c / n) * 100;
    return { kelas: m.kelas, label: m.label, pct, luasKm2: c * CELL_AREA_KM2, color: m.color };
  });

  return {
    configId: cfg.id,
    configLabel: cfg.label,
    wilayah: params.wilayah ?? "Teluk Ambon Utara",
    scores,
    classes,
    stats,
    candidates: pickCandidates(scores, classes),
    groupWeights: gw,
    critWeights,
    cr: ahp.cr,
    threshold: thr,
    kedalamanMin: depthMin,
    countS1,
    totalValid,
    demo: true,
  };
}

/* --------------------------- Risiko (H × V × E) --------------------------- */

export interface HazardRisk {
  id: string;
  label: string;
  hazard: number; // 0–100
  vulnerability: number;
  exposure: number;
  index: number;
  kategori: "Rendah" | "Sedang" | "Tinggi" | "Sangat Tinggi";
  kategoriColor: string;
  luasTerdampakKm2: number;
  infrastruktur: string[];
  description: string;
  rekomendasi: string;
}

export const RISK_KATEGORI_COLOR: Record<string, string> = {
  Rendah: "#2EAA70",
  Sedang: "#F3C747",
  Tinggi: "#E75B55",
  "Sangat Tinggi": "#B3261E",
};

function riskKategori(index: number): HazardRisk["kategori"] {
  if (index < 25) return "Rendah";
  if (index < 45) return "Sedang";
  if (index < 65) return "Tinggi";
  return "Sangat Tinggi";
}

export const HAZARDS: { id: string; label: string; icon: "waves" | "droplets" | "wave" | "wind" | "layers" | "trending-up" }[] = [
  { id: "abrasi", label: "Abrasi Pantai", icon: "waves" },
  { id: "banjir-rob", label: "Banjir Rob", icon: "droplets" },
  { id: "tsunami", label: "Tsunami", icon: "wave" },
  { id: "gelombang-ekstrem", label: "Gelombang Ekstrem", icon: "wind" },
  { id: "sedimentasi", label: "Sedimentasi", icon: "layers" },
  { id: "kenaikan-mlaut", label: "Kenaikan Muka Air Laut", icon: "trending-up" },
];

export function computeRisks(): HazardRisk[] {
  const L = getBaseLayers();
  const n = GRID_W * GRID_H;

  const agg = { abrasi: 0, rob: 0, tsunami: 0, geks: 0, sedim: 0, slr: 0 };
  for (let i = 0; i < n; i++) {
    if (L.isLand[i]) {
      // kerentanan daratan pesisir rendah
      agg.rob += Math.max(0, (1.5 - L.elevation[i]) / 1.5) * 100;
      agg.slr += Math.max(0, (2.0 - L.elevation[i]) / 2.0) * 90;
      agg.abrasi += Math.max(0, -L.abrasionRate[i]) * 36;
    } else {
      agg.abrasi += Math.max(0, -L.abrasionRate[i]) * 40;
      agg.geks += Math.min(100, (L.waveHs[i] / 5) * 100);
      agg.tsunami += L.exposure[i] * 62 * (L.depth[i] > 25 ? 1 : 0.55);
      agg.sedim += Math.min(100, (L.sedimentRate[i] / 1.8) * 100);
    }
  }
  const coastalCells = n;
  // sel pesisir tererosi & sel pendangkalan — untuk luas terdampak (DEMO)
  let abrasiCells = 0;
  let sedimCells = 0;
  for (let i = 0; i < n; i++) {
    if (L.isLand[i]) continue;
    if (L.abrasionRate[i] < -0.45) abrasiCells++;
    if (L.sedimentRate[i] > 0.55) sedimCells++;
  }
  const mk = (hazard: number, vuln: number, expo: number): number => {
    const idx = 0.42 * hazard + 0.3 * vuln + 0.28 * expo;
    return Math.round(idx * 10) / 10;
  };

  const robFloodPct = floodScenarioPct(1.5);
  const tsunamiPct = Math.min(30, (agg.tsunami / coastalCells) * 0.45);
  const out: HazardRisk[] = [
    {
      id: "abrasi",
      label: "Abrasi Pantai",
      hazard: Math.round(agg.abrasi / coastalCells),
      vulnerability: 52,
      exposure: 58,
      index: 0,
      kategori: "Rendah",
      kategoriColor: "",
      luasTerdampakKm2: Math.round(abrasiCells * CELL_AREA_KM2),
      infrastruktur: ["Permukiman pesisir Utara", "Jalan pantai 6,2 km", "Kolam pelabuhan perikanan"],
      description: 'Abrasi adalah erosi garis pantai akibat gelombang dan arus sejalan pantai. Pesisir Utara memiliki laju erosi hingga 2,4 m/tahun (DEMO).',
      rekomendasi: "Penanaman vegetasi pantai, groin + sand bypass, rehabilitasi mangrove 45 ha.",
    },
    {
      id: "banjir-rob",
      label: "Banjir Rob",
      hazard: Math.round(agg.rob / coastalCells * 2.6),
      vulnerability: 61,
      exposure: 55,
      index: 0,
      kategori: "Rendah",
      kategoriColor: "",
      luasTerdampakKm2: Math.round(robFloodPct.km2),
      infrastruktur: ["Permukiman Teluk Timur", "Tambak budidaya 320 ha", "Drainase kota"],
      description: 'Genangan rob musiman mengancam pesisir dataran rendah; puncak terjadi saat pasang purnama dan musim angin barat (DEMO).',
      rekomendasi: "Tanggul rob + pompa, sistem drainase dua arah, penataan permukiman pesisir rendah.",
    },
    {
      id: "tsunami",
      label: "Tsunami",
      hazard: Math.round(agg.tsunami / coastalCells),
      vulnerability: 38,
      exposure: 30,
      index: 0,
      kategori: "Rendah",
      kategoriColor: "",
      luasTerdampakKm2: Math.round((tsunamiPct / 100) * TOTAL_AREA_KM2),
      infrastruktur: ["Pelabuhan Bitung Baru", "Fasilitas kesehatan 2 titik"],
      description: 'Pemodelan run-up tsunami menunjukkan zona genangan terbatas pada teluk terbuka; waktu tiba gelombang 28–45 menit dari sumber terdekat (DEMO).',
      rekomendasi: "Penyusunan jalur evakuasi, shelter vertikal, edukasi dan simulasi berkala.",
    },
    {
      id: "gelombang-ekstrem",
      label: "Gelombang Ekstrem",
      hazard: Math.round(agg.geks / coastalCells),
      vulnerability: 44,
      exposure: 47,
      index: 0,
      kategori: "Rendah",
      kategoriColor: "",
      luasTerdampakKm2: Math.round((agg.geks / coastalCells / 100) * 0.34 * TOTAL_AREA_KM2),
      infrastruktur: [" Dermaga nelayan Barat", "Budidaya laut keramba"],
      description: 'Gelombang tinggi dari Barat Laut mencapai 4–6 m saat musim transisi; paparan tertinggi pada pantai terbuka tanpa pemecah gelombang alami (DEMO).',
      rekomendasi: "Breakwater alami, standar desain konstruksi pesisir, penghentian sementara operasi saat gelombang > 4 m.",
    },
    {
      id: "sedimentasi",
      label: "Sedimentasi",
      hazard: Math.round(agg.sedim / coastalCells),
      vulnerability: 33,
      exposure: 40,
      index: 0,
      kategori: "Rendah",
      kategoriColor: "",
      luasTerdampakKm2: Math.round(sedimCells * CELL_AREA_KM2),
      infrastruktur: ["Alur pelayaran pelabuhan", "Kolam pelabuhan perikanan"],
      description: 'Pendangkalan mengubah kontur dasar laut di muara dan teluk tenang; laju maksimum terjadi dekat muaran sungai (DEMO).',
      rekomendasi: "Pengerukan berkala alur, pengendalian erosi di DAS, konservasi mangrove penahan sedimen.",
    },
    {
      id: "kenaikan-mlaut",
      label: "Kenaikan Muka Air Laut",
      hazard: 34,
      vulnerability: 49,
      exposure: 46,
      index: 0,
      kategori: "Rendah",
      kategoriColor: "",
      luasTerdampakKm2: Math.round(floodScenarioPct(0.45).km2),
      infrastruktur: ["Permukiman pesisir rendah", "Tambak & akuakultur", "Jalan penghubung pantai"],
      description: 'Tren altimetri menunjukkan kenaikan muka laut sekitar 3,9 mm/tahun; pesisir rendah di bawah +0,45 m paling rentan (DEMO).',
      rekomendasi: "Perencanaan tata ruang berbasis proyeksi SLR, peningkatan elevasi infrastruktur strategis.",
    },
  ];
  for (const r of out) {
    r.index = mk(r.hazard, r.vulnerability, r.exposure);
    r.kategori = riskKategori(r.index);
    r.kategoriColor = RISK_KATEGORI_COLOR[r.kategori];
  }
  return out;
}

/* --------------------------- Modul mitigasi (perhitungan demo) --------------------------- */

export interface ShoreTransect {
  id: string;
  lat: number;
  lon: number;
  nsm: number; // m 2015→2025 (negatif = abrasi)
  rate: number; // m/tahun
  status: "Abrasi" | "Akresi" | "Stabil";
}

/** Garis pantai multitemporal 2015–2025 (offset dari garis dasar) + perhitungan NSM per transek. */
export function shorelineAnalysis(): {
  shorelines: { year: number; offsetM: number; color: string; points: [number, number][] }[];
  transects: ShoreTransect[];
  summary: { abrasi: number; akresi: number; stabil: number; maxRate: number; avgRate: number };
} {
  const years = [2015, 2018, 2021, 2025];
  const offsets = [0, -3.2, -6.1, -9.6]; // rata-rata mundur (abrasi) dalam meter — DEMO
  const colors = ["#94a3b8", "#60a5fa", "#2563eb", "#E75B55"];
  const base: [number, number][] = [];
  for (let t = 0; t <= 20; t++) {
    const lon = 128.0 + (t / 20) * 0.5;
    const lat = -3.34 - 0.045 * Math.sin(t / 3.1) - (t / 20) * 0.1;
    base.push([lat, lon]);
  }
  const shorelines = years.map((y, i) => ({
    year: y,
    offsetM: offsets[i],
    color: colors[i],
    points: base.map(([lat, lon]) => {
      const nx = (lon - 128.0) / 0.5;
      const local = offsets[i] * (0.55 + 0.75 * Math.abs(Math.sin(nx * 5.4 + 0.7)));
      const dLat = (local / 1000) / 110.57;
      return [lat + dLat, lon] as [number, number];
    }),
  }));

  const transects: ShoreTransect[] = base
    .filter((_, i) => i % 2 === 0)
    .map((p, i) => {
      const nx = (p[1] - 128.0) / 0.5;
      // erosivitas pantai × bias lokal — sebagian transek stabil/akresi (DEMO)
      const erosiv = (0.35 + 0.95 * Math.abs(Math.sin(nx * 5.4 + 0.7))) * (0.35 + fbm(i * 2, 3, 41));
      const bias = 6.5 * Math.sin(i * 2.3 + 1.1) + 2.2 * Math.sin(i * 0.9 + 0.3);
      const nsm = -5.2 * erosiv + bias;
      const rate = nsm / 10;
      const status = nsm < -3 ? "Abrasi" : nsm > 1.5 ? "Akresi" : "Stabil";
      return {
        id: `T${String(i + 1).padStart(2, "0")}`,
        lat: p[0],
        lon: p[1],
        nsm: Math.round(nsm * 10) / 10,
        rate: Math.round(rate * 100) / 100,
        status,
      };
    });

  const summary = {
    abrasi: transects.filter((t) => t.status === "Abrasi").length,
    akresi: transects.filter((t) => t.status === "Akresi").length,
    stabil: transects.filter((t) => t.status === "Stabil").length,
    maxRate: Math.min(...transects.map((t) => t.rate)),
    avgRate: transects.reduce((a, t) => a + t.rate, 0) / transects.length,
  };
  return { shorelines, transects, summary };
}

export interface FloodScenarioResult {
  mukaAir: number; // m
  km2: number;
  pct: number;
  cells: Uint8Array; // 1 = genangan
}

/** Simulasi genangan daratan pesisir (rob/SLR): daratan dengan elevasi < muka air — DEMO. */
export function floodScenario(mukaAir: number): FloodScenarioResult {
  const L = getBaseLayers();
  const n = GRID_W * GRID_H;
  const cells = new Uint8Array(n);
  let c = 0;
  for (let i = 0; i < n; i++) {
    if (L.isLand[i] && L.elevation[i] < mukaAir) {
      cells[i] = 1;
      c++;
    }
  }
  const km2 = c * CELL_AREA_KM2;
  return { mukaAir, km2, pct: (c / n) * 100, cells };
}

export function floodScenarioPct(mukaAir: number): { km2: number; pct: number } {
  const r = floodScenario(mukaAir);
  return { km2: r.km2, pct: r.pct };
}

/** Sedimentasi: perbandingan batimetri 2020 vs 2025 — DEMO. */
export function sedimentationAnalysis(): {
  shallowCells: number;
  km2: number;
  avgRate: number; // cm/tahun
  maxRate: number;
  laneImpactKm: number;
} {
  const L = getBaseLayers();
  const n = GRID_W * GRID_H;
  let shallow = 0;
  let sum = 0;
  let max = 0;
  let laneImpact = 0;
  for (let i = 0; i < n; i++) {
    if (L.isLand[i]) continue;
    const r = L.sedimentRate[i]; // m per 5 tahun
    if (r > 0.6) {
      shallow++;
      sum += r / 5;
      max = Math.max(max, r / 5);
      if (L.laneDist[i] < 0.8) laneImpact++;
    }
  }
  return {
    shallowCells: shallow,
    km2: Math.round(shallow * CELL_AREA_KM2),
    avgRate: Math.round((sum / Math.max(1, shallow)) * 100 * 2) / 10,
    maxRate: Math.round(max * 100 * 2) / 10,
    laneImpactKm: Math.round(laneImpact * 1.08 * 10) / 10,
  };
}

/** Tren kenaikan muka air laut 1993–2025 — DEMO (satelit altimetri). */
export function slrTrend(): { years: number[]; values: number[]; rateMmPerYear: number; projection: { year: number; cm: number }[] } {
  const rate = 3.9; // mm/tahun — DEMO
  const years: number[] = [];
  const values: number[] = [];
  for (let y = 1993; y <= 2025; y++) {
    years.push(y);
    values.push((y - 1993) * (rate / 10) + Math.sin((y - 1993) / 6) * 0.35);
  }
  const projection = [2030, 2040, 2050].map((y) => ({ year: y, cm: Math.round(((y - 2025) * rate) / 10 * 10) / 10 }));
  return { years, values, rateMmPerYear: rate, projection };
}

/* --------------------------- Heat overlay (canvas → dataURL) --------------------------- */

function gridToDataUrl(paint: (idx: number) => [number, number, number, number] | null): string {
  const scale = 8;
  const canvas = document.createElement("canvas");
  canvas.width = GRID_W * scale;
  canvas.height = GRID_H * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  for (let cy = 0; cy < GRID_H; cy++) {
    for (let cx = 0; cx < GRID_W; cx++) {
      const idx = cy * GRID_W + cx;
      const px = paint(idx);
      if (!px) continue;
      const [r, g, b, a] = px;
      ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
      ctx.fillRect(cx * scale, cy * scale, scale, scale);
    }
  }
  return canvas.toDataURL();
}

/** Heatmap batimetri (DEMO): biru muda = dangkal → biru tua = dalam. */
export function depthHeatDataUrl(): string {
  const L = getBaseLayers();
  return gridToDataUrl((idx) => {
    if (L.isLand[idx]) return null;
    const t = Math.max(0, Math.min(1, L.depth[idx] / 40));
    // interpolasi: #bfe6f8 (0) → #1663a8 (1)
    const r = Math.round(191 + (22 - 191) * t);
    const g = Math.round(230 + (99 - 230) * t);
    const b = Math.round(248 + (168 - 248) * t);
    return [r, g, b, 200];
  });
}

/** Heatmap risiko bencana gabungan (DEMO): merah = risiko tinggi. */
export function riskHeatDataUrl(): string {
  const L = getBaseLayers();
  return gridToDataUrl((idx) => {
    if (L.isLand[idx]) {
      if (L.elevation[idx] < 1.2) return [227, 91, 85, 150];
      return null;
    }
    const haz =
      Math.min(1, -L.abrasionRate[idx] / 2.6) * 0.4 +
      Math.min(1, L.waveHs[idx] / 5.5) * 0.35 +
      (L.laneDist[idx] < 0.5 ? 0.15 : 0);
    const a = Math.round(haz * 165);
    return a > 12 ? [227, 91, 85, a] : null;
  });
}

/** Peta genangan (DEMO): sel daratan dengan elevasi < muka air. */
export function floodHeatDataUrl(cells: Uint8Array): string {
  return gridToDataUrl((idx) => (cells[idx] === 1 ? [41, 121, 201, 150] : null));
}

/** Peta bahaya tsunami (DEMO): paparan laut terbuka + kedalaman. */
export function tsunamiHeatDataUrl(): string {
  const L = getBaseLayers();
  return gridToDataUrl((idx) => {
    if (L.isLand[idx]) return null;
    const haz = L.exposure[idx] * (L.depth[idx] > 25 ? 1 : 0.6);
    const a = Math.round(haz * 140);
    return a > 15 ? [230, 126, 60, a] : null;
  });
}

/** Peta paparan gelombang ekstrem (DEMO). */
export function waveExposureHeatDataUrl(): string {
  const L = getBaseLayers();
  return gridToDataUrl((idx) => {
    if (L.isLand[idx]) return null;
    const haz = Math.min(1, L.waveHs[idx] / 5.5);
    const a = Math.round(haz * 150);
    return a > 12 ? [155, 110, 230, a] : null;
  });
}

/** Peta pendangkalan/sedimentasi (DEMO). */
export function sedimentHeatDataUrl(): string {
  const L = getBaseLayers();
  return gridToDataUrl((idx) => {
    if (L.isLand[idx]) return null;
    const haz = Math.min(1, L.sedimentRate[idx] / 1.8);
    const a = Math.round(haz * 150);
    return a > 12 ? [180, 150, 60, a] : null;
  });
}

/* --------------------------- Ekspor --------------------------- */

export function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function resultToCsv(r: SuitabilityResult): string {
  const lines = [
    "Bluetech — Hasil Analisis Kesesuaian Lokasi (DEMO)",
    `Jenis Pemanfaatan,${r.configLabel}`,
    `Wilayah,${r.wilayah}`,
    `Metode,MCDA (AHP + Weighted Overlay + Boolean Constraint)`,
    `Consistency Ratio (CR),${r.cr.toFixed(3)}`,
    `Kedalaman minimum,${r.kedalamanMin} m`,
    "",
    "Kelas,Label,Persentase (%),Luas (km2)",
    ...r.stats.map((s) => `${s.kelas},${s.label},${s.pct.toFixed(2)},${s.luasKm2.toFixed(1)}`),
    "",
    "Kandidat,Rank,Latitude,Longitude,Skor,Kelas,Kedalaman (m),Risiko",
    ...r.candidates.map((c) => `${c.rank},${c.rank},${c.lat.toFixed(4)},${c.lon.toFixed(4)},${c.score},${c.kelas},${c.depth},${c.riskLevel}`),
  ];
  return lines.join("\n");
}

export function resultToGeoJson(r: SuitabilityResult): string {
  const features: object[] = r.candidates.map((c) => ({
    type: "Feature",
    properties: {
      rank: c.rank,
      skor: c.score,
      kelas: c.kelas,
      kedalaman_m: c.depth,
      risiko: c.riskLevel,
      rekomendasi: c.rekomendasi,
      demo: true,
    },
    geometry: { type: "Point", coordinates: [c.lon, c.lat] },
  }));
  return JSON.stringify({ type: "FeatureCollection", name: `bluetech-kandidat-${r.configId}-DEMO`, features }, null, 2);
}
