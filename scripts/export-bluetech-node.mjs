/* Dump semua data yang dipakai web Bluetech ke satu JSON induk.
   Sumber: src/lib/bluetech-data.ts + src/lib/analysis-engine.ts (imp langsung, Node 24)
   Output: /tmp/bluetech-export/all-data.json
*/
import { writeFileSync, mkdirSync } from "node:fs";
import * as d from "../src/lib/bluetech-data.ts";
import * as a from "../src/lib/analysis-engine.ts";

const plain = (v) => {
  if (v instanceof Float32Array || v instanceof Uint8Array || v instanceof Int8Array ||
      v instanceof Uint16Array || v instanceof Int16Array || v instanceof Uint32Array ||
      v instanceof Int32Array) return Array.from(v);
  if (Array.isArray(v)) return v.map(plain);
  if (v && typeof v === "object") {
    const o = {};
    for (const [k, val] of Object.entries(v)) o[k] = plain(val);
    return o;
  }
  return v;
};

/* Nama file ramah (kebab-case) per dataset — urut sesuai menu aplikasi */
const DATASETS = {
  // Referensi wilayah & notifikasi
  WILAYAH_LIST: "wilayah",
  NOTIFICATIONS: "notifikasi",
  // Konfigurasi pilihan
  JENIS_PEMANFAATAN: "jenis-pemanfaatan",
  KEDALAMAN_MIN: "opsi-kedalaman",
  ZONA_PEMANFAATAN: "zona-pemanfaatan",
  // Risiko admin
  RISK_TYPES: "jenis-risiko",
  LEVEL_COLORS: "warna-level",
  CATEGORY_COLORS: "warna-kategori",
  // Lapisan peta
  MAP_MARKERS: "penanda-peta",
  RISK_MARKERS: "titik-risiko",
  TOURISM_SPOTS: "wisata",
  POTENSI_BENCANA: "potensi-bencana",
  TINGKAT_POTENSI_WARNA: "warna-tingkat-potensi",
  POTENSI_MON_LINK: "tautan-potensi-pemantauan",
  // Pemantauan & konten publik
  MONITORING_STREAM: "pemantauan",
  PARAMETER_PUBLIK: "parameter-publik",
  KONTAK_DARURAT: "kontak-darurat",
  EDUKASI_MITIGASI: "edukasi-mitigasi",
  JENIS_LAPOR_PUBLIK: "jenis-lapor",
  // Pariwisata
  PREDIKSI_PARIWISATA: "prediksi-pariwisata",
  ARTI_KELAS_PUBLIK: "arti-kelas-publik",
  LANGKAH_BUKA_WISATA: "langkah-buka-wisata",
};

const dataPublik = {};
for (const [key, name] of Object.entries(DATASETS)) {
  if (d[key] === undefined) { console.error("HILANG:", key); continue; }
  dataPublik[name] = plain(d[key]);
}

/* Mesin analisis (MCDA) — konfigurasi grid & data lapisan */
const baseLayers = a.getBaseLayers();
const LAYER_KEYS = [
  "distLand", "isLand", "depth", "slope", "waveHs", "currentSpeed", "tideRange",
  "elevation", "mangrove", "coral", "seagrass", "substrate", "distPort", "distCoast",
  "laneDist", "zoneId", "konservasiCore", "abrasionRate", "sedimentRate", "exposure", "windSpeed",
];

// Grid sel: idx, lat, lon + nilai semua lapisan (baris 0 = selatan, sesuai cellToLatLon)
const selGrid = [];
for (let idx = 0; idx < a.GRID_W * a.GRID_H; idx++) {
  const { lat, lon } = a.cellToLatLon(idx);
  const row = { idx, lat: Math.round(lat * 1000) / 1000, lon: Math.round(lon * 1000) / 1000 };
  for (const k of LAYER_KEYS) {
    const arr = baseLayers[k];
    const v = arr[idx];
    row[k] = typeof v === "number" ? (Math.abs(v) < 1000 ? Math.round(v * 1000) / 1000 : Math.round(v)) : v;
  }
  selGrid.push(row);
}

const engine = {
  konfigurasiGrid: {
    GRID_W: a.GRID_W, GRID_H: a.GRID_H,
    CELL_AREA_KM2: a.CELL_AREA_KM2, TOTAL_AREA_KM2: a.TOTAL_AREA_KM2,
    BBOX: plain(a.BBOX), KM_PER_CELL_X: a.KM_PER_CELL_X, KM_PER_CELL_Y: a.KM_PER_CELL_Y,
  },
  lapisanGrid: Object.fromEntries(LAYER_KEYS.map((k) => [k, Array.from(baseLayers[k])])),
  pelabuhan: plain(a.PORTS),
  alurPelayaran: plain(a.SHIPPING_LANE),
  zonaTataRuang: plain(a.ZONE_POLYGONS),
  intiKonservasi: plain(a.KONSERVASI_CORE),
  kelompokKriteria: plain(a.CRITERIA_GROUPS),
  labelKriteria: plain(a.CRITERIA_LABEL),
  pemanfaatan: plain(a.PEMANFAATAN),
  metaKelasKesesuaian: plain(a.CLASS_META),
  selGrid,
};

const out = {
  meta: {
    aplikasi: "Bluetech — WebGIS Perencanaan Ruang Laut & Mitigasi Bencana Pesisir (DEMO)",
    diekspor: new Date().toISOString().slice(0, 19).replace("T", " ") + " WIB+7",
    sistemKoordinat: "WGS 84 (EPSG:4326) — semua lat/lon",
    sumber: [
      "src/lib/bluetech-data.ts (data hub aplikasi)",
      "src/lib/analysis-engine.ts (mesin MCDA & grid analisis)",
    ],
    catatan: [
      "Seluruh nilai adalah simulasi DEMO — bukan data resmi, bukan untuk navigasi.",
      "db/custom.db (SQLite) hanya berisi tabel template kosong (Post/User) yang TIDAK dipakai fitur web — karena itu tidak diekspor.",
      "Kredensial admin (diatur lewat .env) sengaja tidak diekspor karena bukan data konten.",
      "Kunci localStorage aplikasi: 'bluetech-role' (ROLE_STORAGE_KEY), tema: 'bluetech-theme'.",
    ],
  },
  dataPublik,
  engine,
};

mkdirSync("/tmp/bluetech-export", { recursive: true });
writeFileSync("/tmp/bluetech-export/all-data.json", JSON.stringify(out, null, 1), "utf8");

// Ringkasan
const jumlah = Object.entries(out.dataPublik).map(([k, v]) => `${k}(${Array.isArray(v) ? v.length : "obj"})`);
console.log("OK →", "/tmp/bluetech-export/all-data.json");
console.log("dataset publik:", jumlah.join(", "));
console.log("selGrid:", selGrid.length, "sel | lapisan:", LAYER_KEYS.length);
