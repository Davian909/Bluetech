#!/usr/bin/env node
/**
 * Bluetech — Skrip Pra-proses Data GIS untuk Web (Kawasan Pantai Losari)
 * ----------------------------------------------------------------------
 * Menggunakan Node.js bawaan (tanpa ketergantungan eksternal) untuk:
 *   1. Memotong 5 raster besar EPSG:4326 (~55 MB) ke area studi Pantai Losari
 *      dan mengonversinya menjadi PNG overlay ringan (tanpa memuat penuh 55 MB).
 *   2. Mereproyeksi 2 raster kecil UTM 50S (EPSG:32750) ke EPSG:4326 dan
 *      mengonversinya menjadi PNG overlay (nilai 0 = transparan).
 *   3. Membersihkan 3 file GeoJSON vektor dan menyalinnya ke public/data/vector/.
 *   4. Mengonversi 2 file CSV pasang surut ke JSON ringan di public/data/parameter/.
 *   5. Menyimpan katalog metadata & legenda di public/data/manifest.json.
 *
 * Aturan data:
 *   - data/raw/ dan file asli di data/processed/ TIDAK PERNAH diubah.
 *   - Skrip aman dijalankan ulang kapan saja: node scripts/prepare_public_data.mjs
 */

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const RASTER_SRC = path.join(ROOT, "data", "processed", "raster");
const VECTOR_SRC = path.join(ROOT, "data", "processed", "vector");
const PARAM_SRC = path.join(ROOT, "data", "parameter");

const OUT_BASE = path.join(ROOT, "public", "data");
const OUT_RASTER = path.join(OUT_BASE, "raster");
const OUT_VECTOR = path.join(OUT_BASE, "vector");
const OUT_PARAM = path.join(OUT_BASE, "parameter");

for (const dir of [OUT_BASE, OUT_RASTER, OUT_VECTOR, OUT_PARAM]) {
  fs.mkdirSync(dir, { recursive: true });
}

// Batas area studi Kawasan Pantai Losari (menyelaraskan raster kecil + GeoJSON)
const STUDY_CROP = {
  west: 119.380,
  east: 119.418,
  south: -5.161,
  north: -5.127,
};

/* =====================================================================
 * 1. Utilitas Proyeksi WGS 84 (EPSG:4326) <-> UTM Zona 50S (EPSG:32750)
 * ===================================================================== */

const WGS84_A = 6378137.0;
const WGS84_F = 1 / 298.257223563;
const WGS84_E2 = 2 * WGS84_F - WGS84_F * WGS84_F;
const WGS84_EP2 = WGS84_E2 / (1 - WGS84_E2);
const UTM_K0 = 0.9996;
const UTM50_LON0 = (117.0 * Math.PI) / 180; // Meridian tengah UTM 50 = 117°E

function wgs84ToUtm50s(lonDeg, latDeg) {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const tanLat = Math.tan(lat);

  const N = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);
  const T = tanLat * tanLat;
  const C = WGS84_EP2 * cosLat * cosLat;
  const A = cosLat * (lon - UTM50_LON0);

  const e2 = WGS84_E2;
  const M =
    WGS84_A *
    ((1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 ** 3) / 256) * lat -
      ((3 * e2) / 8 + (3 * e2 * e2) / 32 + (45 * e2 ** 3) / 1024) * Math.sin(2 * lat) +
      ((15 * e2 * e2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * lat) -
      ((35 * e2 ** 3) / 3072) * Math.sin(6 * lat));

  const easting =
    500000.0 +
    UTM_K0 *
      N *
      (A +
        ((1 - T + C) * A ** 3) / 6 +
        ((5 - 18 * T + T * T + 72 * C - 58 * WGS84_EP2) * A ** 5) / 120);

  const northing =
    10000000.0 +
    UTM_K0 *
      (M +
        N *
          tanLat *
          ((A * A) / 2 +
            ((5 - T + 9 * C + 4 * C * C) * A ** 4) / 24 +
            ((61 - 58 * T + T * T + 600 * C - 330 * WGS84_EP2) * A ** 6) / 720));

  return { easting, northing };
}

function utm50sToWgs84(easting, northing) {
  const e2 = WGS84_E2;
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const x = easting - 500000.0;
  const y = northing - 10000000.0;
  const M = y / UTM_K0;
  const mu = M / (WGS84_A * (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 ** 3) / 256));

  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);

  const sin1 = Math.sin(phi1);
  const cos1 = Math.cos(phi1);
  const tan1 = Math.tan(phi1);
  const C1 = WGS84_EP2 * cos1 * cos1;
  const T1 = tan1 * tan1;
  const N1 = WGS84_A / Math.sqrt(1 - e2 * sin1 * sin1);
  const R1 = (WGS84_A * (1 - e2)) / Math.pow(1 - e2 * sin1 * sin1, 1.5);
  const D = x / (N1 * UTM_K0);

  const lat =
    phi1 -
    ((N1 * tan1) / R1) *
      ((D * D) / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * WGS84_EP2) * D ** 4) / 24 +
        ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * WGS84_EP2 - 3 * C1 * C1) * D ** 6) / 720);

  const lon =
    UTM50_LON0 +
    (D -
      ((1 + 2 * T1 + C1) * D ** 3) / 6 +
      ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * WGS84_EP2 + 24 * T1 * T1) * D ** 5) / 120) /
      cos1;

  return { lon: (lon * 180) / Math.PI, lat: (lat * 180) / Math.PI };
}

// Uji akurasi bolak-balik proyeksi
{
  const test = wgs84ToUtm50s(119.405, -5.143);
  const back = utm50sToWgs84(test.easting, test.northing);
  if (Math.abs(back.lon - 119.405) > 1e-8 || Math.abs(back.lat - -5.143) > 1e-8) {
    throw new Error("Verifikasi proyeksi UTM 50S gagal");
  }
}

/* =====================================================================
 * 2. Encoder PNG RGBA Murni (tanpa dependensi)
 * ===================================================================== */

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePngRgba(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowOff = y * (stride + 1);
    raw[rowOff] = 0; // filter None
    rgba.copy(raw, rowOff + 1, y * stride, (y + 1) * stride);
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/* =====================================================================
 * 3. Pembaca Header GeoTIFF Ringan (tidak memuat seluruh file besar)
 * ===================================================================== */

const TIFF_TYPE_SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 };

function readExact(fd, pos, len) {
  const buf = Buffer.alloc(len);
  fs.readSync(fd, buf, 0, len, pos);
  return buf;
}

function readTiffHeader(fd) {
  const hdr = readExact(fd, 0, 8);
  const le = hdr.toString("ascii", 0, 2) === "II";
  const rU16 = (b, o) => (le ? b.readUInt16LE(o) : b.readUInt16BE(o));
  const rU32 = (b, o) => (le ? b.readUInt32LE(o) : b.readUInt32BE(o));
  const rF32 = (b, o) => (le ? b.readFloatLE(o) : b.readFloatBE(o));
  const rF64 = (b, o) => (le ? b.readDoubleLE(o) : b.readDoubleBE(o));

  const ifdOff = rU32(hdr, 4);
  const num = rU16(readExact(fd, ifdOff, 2), 0);
  const ent = readExact(fd, ifdOff + 2, num * 12);
  const tags = {};

  for (let i = 0; i < num; i++) {
    const o = i * 12;
    const tag = rU16(ent, o);
    const type = rU16(ent, o + 2);
    const cnt = rU32(ent, o + 4);
    const bl = cnt * (TIFF_TYPE_SIZE[type] || 1);
    const vb = bl <= 4 ? ent.subarray(o + 8, o + 8 + bl) : readExact(fd, rU32(ent, o + 8), bl);

    if (type === 2) tags[tag] = vb.toString("ascii").replace(/\0+$/, "");
    else if (type === 3) {
      tags[tag] = [];
      for (let k = 0; k < cnt; k++) tags[tag].push(rU16(vb, k * 2));
    } else if (type === 4) {
      tags[tag] = [];
      for (let k = 0; k < cnt; k++) tags[tag].push(rU32(vb, k * 4));
    } else if (type === 11) {
      tags[tag] = [];
      for (let k = 0; k < cnt; k++) tags[tag].push(rF32(vb, k * 4));
    } else if (type === 12) {
      tags[tag] = [];
      for (let k = 0; k < cnt; k++) tags[tag].push(rF64(vb, k * 8));
    }
  }

  return {
    le,
    rF32,
    width: tags[256][0],
    height: tags[257][0],
    bps: tags[258][0],
    compression: tags[259][0],
    stripOffsets: tags[273],
    tileWidth: tags[322]?.[0],
    tileHeight: tags[323]?.[0],
    tileOffsets: tags[324],
    tileByteCounts: tags[325],
    pixelScale: tags[33550],
    tiepoint: tags[33922],
    nodata: tags[42113] !== undefined ? Number(tags[42113]) : null,
  };
}

/* =====================================================================
 * 4. Skema Warna Standar GIS
 * ===================================================================== */

function lerpColor(c1, c2, t) {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ];
}

// Gradasi bahaya standar 0–1: hijau (0) -> kuning (0.33) -> oranye (0.66) -> merah (1.0)
function hazardRamp01(v, alpha = 215) {
  const t = Math.max(0, Math.min(1, v));
  const stops = [
    [0.0, [34, 197, 94]],   // #22c55e (Hijau — sangat rendah)
    [0.33, [234, 179, 8]],  // #eab308 (Kuning — rendah-sedang)
    [0.66, [249, 115, 22]], // #f97316 (Oranye — sedang-tinggi)
    [1.0, [220, 38, 38]],   // #dc2626 (Merah — sangat tinggi)
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [p0, c0] = stops[i];
    const [p1, c1] = stops[i + 1];
    if (t <= p1) {
      const rgb = lerpColor(c0, c1, (t - p0) / (p1 - p0));
      return [rgb[0], rgb[1], rgb[2], alpha];
    }
  }
  return [220, 38, 38, alpha];
}

// Warna diskrit untuk fasilitas_umum.tif (nilai 0 tetap tampil lembut sesuai arahan pengguna)
function fasilitasColor(v) {
  const rv = Math.round(v);
  if (rv <= 0) return [186, 214, 232, 135];   // dasar area darat (0, tidak transparan)
  if (rv <= 500) return [56, 189, 248, 235];  // #38bdf8
  if (rv <= 2000) return [2, 132, 199, 240];  // #0284c7
  if (rv <= 3000) return [37, 99, 235, 245];  // #2563eb
  if (rv <= 3200) return [79, 70, 229, 245];  // #4f46e5
  if (rv <= 6000) return [124, 58, 237, 250]; // #7c3aed
  return [147, 51, 234, 255];                 // #9333ea (10000)
}

const CLASS_HAZARD_COLORS = {
  0: [0, 0, 0, 0],
  1: [34, 197, 94, 220],  // #22c55e Bahaya Rendah
  2: [245, 158, 11, 220], // #f59e0b Bahaya Sedang
  3: [239, 68, 68, 225],  // #ef4444 Bahaya Tinggi
};

const CLASS_WISATA_COLORS = {
  0: [0, 0, 0, 0],
  1: [245, 158, 11, 215], // #f59e0b Potensi Rendah
  2: [14, 165, 233, 215], // #0ea5e9 Potensi Sedang
  3: [16, 185, 129, 225], // #10b981 Potensi Tinggi
};

function upscaleNearestRgba(srcRgba, srcW, srcH, scale) {
  if (scale === 1) return { width: srcW, height: srcH, rgba: srcRgba };
  const dstW = srcW * scale;
  const dstH = srcH * scale;
  const dst = Buffer.alloc(dstW * dstH * 4);
  for (let y = 0; y < srcH; y++) {
    for (let x = 0; x < srcW; x++) {
      const si = (y * srcW + x) * 4;
      const r = srcRgba[si], g = srcRgba[si + 1], b = srcRgba[si + 2], a = srcRgba[si + 3];
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const di = ((y * scale + dy) * dstW + (x * scale + dx)) * 4;
          dst[di] = r;
          dst[di + 1] = g;
          dst[di + 2] = b;
          dst[di + 3] = a;
        }
      }
    }
  }
  return { width: dstW, height: dstH, rgba: dst };
}

/* =====================================================================
 * 5. Proses 5 Raster Besar EPSG:4326 (Crop ke Area Studi Losari)
 * ===================================================================== */

function processLarge4326Raster(cfg) {
  const srcPath = path.join(RASTER_SRC, cfg.srcFile);
  const fd = fs.openSync(srcPath, "r");
  try {
    const h = readTiffHeader(fd);
    const [sx, sy] = h.pixelScale;
    const x0 = h.tiepoint[3];
    const y0 = h.tiepoint[4];

    const cMin = Math.max(0, Math.floor((STUDY_CROP.west - x0) / sx));
    const cMax = Math.min(h.width - 1, Math.ceil((STUDY_CROP.east - x0) / sx) - 1);
    const rMin = Math.max(0, Math.floor((y0 - STUDY_CROP.north) / sy));
    const rMax = Math.min(h.height - 1, Math.ceil((y0 - STUDY_CROP.south) / sy) - 1);

    const cropW = cMax - cMin + 1;
    const cropH = rMax - rMin + 1;
    const west = x0 + cMin * sx;
    const east = x0 + (cMax + 1) * sx;
    const north = y0 - rMin * sy;
    const south = y0 - (rMax + 1) * sy;

    const rgba = Buffer.alloc(cropW * cropH * 4);
    let validCount = 0;
    let nodataCount = 0;
    let minVal = Infinity;
    let maxVal = -Infinity;

    for (let r = 0; r < cropH; r++) {
      const srcRow = rMin + r;
      const rowBuf = readExact(fd, h.stripOffsets[srcRow] + cMin * 4, cropW * 4);
      for (let c = 0; c < cropW; c++) {
        const v = h.rF32(rowBuf, c * 4);
        const isNoData =
          Number.isNaN(v) ||
          (h.nodata !== null &&
            (Math.abs(h.nodata) > 1e30 ? v < -1e37 : Math.abs(v - h.nodata) < 1e-4));

        const di = (r * cropW + c) * 4;
        if (isNoData) {
          nodataCount++;
          rgba[di + 3] = 0;
        } else {
          validCount++;
          if (v < minVal) minVal = v;
          if (v > maxVal) maxVal = v;
          const col = cfg.colorFn(v);
          rgba[di] = col[0];
          rgba[di + 1] = col[1];
          rgba[di + 2] = col[2];
          rgba[di + 3] = col[3];
        }
      }
    }

    const up = upscaleNearestRgba(rgba, cropW, cropH, 4);
    const pngBuf = encodePngRgba(up.width, up.height, up.rgba);
    const outPath = path.join(OUT_RASTER, cfg.outFile);
    fs.writeFileSync(outPath, pngBuf);

    return {
      id: cfg.id,
      name: cfg.name,
      category: cfg.category,
      description: cfg.description,
      sourceFile: `data/processed/raster/${cfg.srcFile}`,
      url: `/data/raster/${cfg.outFile}`,
      sourceCrs: "EPSG:4326",
      webCrs: "EPSG:4326",
      bounds: [
        [Number(south.toFixed(6)), Number(west.toFixed(6))],
        [Number(north.toFixed(6)), Number(east.toFixed(6))],
      ],
      nativeCropPx: [cropW, cropH],
      pngPx: [up.width, up.height],
      pngBytes: pngBuf.length,
      validPixels: validCount,
      nodataPixels: nodataCount,
      valueRangeLocal: validCount ? [Number(minVal.toFixed(4)), Number(maxVal.toFixed(4))] : null,
      legend: cfg.legend,
      note: cfg.note ?? null,
      defaultVisible: cfg.defaultVisible ?? false,
    };
  } finally {
    fs.closeSync(fd);
  }
}

/* =====================================================================
 * 6. Proses 2 Raster Kecil UTM 50S -> Reproyeksi ke EPSG:4326
 * ===================================================================== */

function processUtm50sRaster(cfg) {
  const srcPath = path.join(RASTER_SRC, cfg.srcFile);
  const fd = fs.openSync(srcPath, "r");
  try {
    const h = readTiffHeader(fd);
    const W = h.width;
    const H = h.height;
    const tw = h.tileWidth;
    const th = h.tileHeight;
    const tilesAcross = Math.ceil(W / tw);
    const tilesDown = Math.ceil(H / th);

    // Dekode seluruh grid uint8 sumber (kecil: 15K–133K piksel)
    const srcGrid = new Uint8Array(W * H);
    for (let ty = 0; ty < tilesDown; ty++) {
      for (let tx = 0; tx < tilesAcross; tx++) {
        const ti = ty * tilesAcross + tx;
        const tileBuf = readExact(fd, h.tileOffsets[ti], h.tileByteCounts[ti]);
        const validW = Math.min(tw, W - tx * tw);
        const validH = Math.min(th, H - ty * th);
        for (let py = 0; py < validH; py++) {
          for (let px = 0; px < validW; px++) {
            srcGrid[(ty * th + py) * W + (tx * tw + px)] = tileBuf[py * tw + px];
          }
        }
      }
    }

    const [sx, sy] = h.pixelScale;
    const minE = h.tiepoint[3];
    const maxN = h.tiepoint[4];
    const maxE = minE + W * sx;
    const minN = maxN - H * sy;

    // Hitung kotak batas WGS84 dari 4 sudut UTM
    const corners = [
      utm50sToWgs84(minE, minN),
      utm50sToWgs84(maxE, minN),
      utm50sToWgs84(minE, maxN),
      utm50sToWgs84(maxE, maxN),
    ];
    const west = Math.min(...corners.map((c) => c.lon));
    const east = Math.max(...corners.map((c) => c.lon));
    const south = Math.min(...corners.map((c) => c.lat));
    const north = Math.max(...corners.map((c) => c.lat));

    const outW = cfg.outWidth;
    const outH = Math.round((outW * (north - south)) / (east - west));
    const rgba = Buffer.alloc(outW * outH * 4);
    const classCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };

    // Hitung jumlah piksel kelas asli dari sumber UTM (akurat untuk statistik luas)
    for (let i = 0; i < srcGrid.length; i++) {
      const v = srcGrid[i];
      if (classCounts[v] !== undefined) classCounts[v]++;
    }

    // Reproyeksi inverse: tiap piksel output WGS84 -> UTM 50S -> lookup nearest-neighbor
    for (let oy = 0; oy < outH; oy++) {
      const lat = north - ((oy + 0.5) / outH) * (north - south);
      for (let ox = 0; ox < outW; ox++) {
        const lon = west + ((ox + 0.5) / outW) * (east - west);
        const { easting, northing } = wgs84ToUtm50s(lon, lat);
        const sxIdx = Math.floor((easting - minE) / sx);
        const syIdx = Math.floor((maxN - northing) / sy);
        if (sxIdx < 0 || sxIdx >= W || syIdx < 0 || syIdx >= H) continue;
        const cls = srcGrid[syIdx * W + sxIdx];
        const col = cfg.palette[cls] || [0, 0, 0, 0];
        const di = (oy * outW + ox) * 4;
        rgba[di] = col[0];
        rgba[di + 1] = col[1];
        rgba[di + 2] = col[2];
        rgba[di + 3] = col[3];
      }
    }

    const pngBuf = encodePngRgba(outW, outH, rgba);
    const outPath = path.join(OUT_RASTER, cfg.outFile);
    fs.writeFileSync(outPath, pngBuf);

    return {
      id: cfg.id,
      name: cfg.name,
      category: cfg.category,
      description: cfg.description,
      sourceFile: `data/processed/raster/${cfg.srcFile}`,
      url: `/data/raster/${cfg.outFile}`,
      sourceCrs: "EPSG:32750",
      webCrs: "EPSG:4326",
      bounds: [
        [Number(south.toFixed(6)), Number(west.toFixed(6))],
        [Number(north.toFixed(6)), Number(east.toFixed(6))],
      ],
      nativePx: [W, H],
      pixelSizeMeters: [Number(sx.toFixed(2)), Number(sy.toFixed(2))],
      pngPx: [outW, outH],
      pngBytes: pngBuf.length,
      classCounts,
      legend: cfg.legend,
      note: cfg.note ?? null,
      defaultVisible: cfg.defaultVisible ?? false,
    };
  } finally {
    fs.closeSync(fd);
  }
}

/* =====================================================================
 * 7. Proses 3 GeoJSON Vektor -> public/data/vector/
 * ===================================================================== */

const WISATA_DESC = {
  Tinggi: {
    warna: "#10b981",
    ringkas:
      "Area paling potensial untuk pengembangan wisata pesisir dan bahari di Kawasan Pantai Losari. Didukung kedekatan garis pantai, aksesibilitas kota yang baik, dan keragaman daya tarik di sekitarnya.",
    aktivitas: "Wisata pantai & promenade, kuliner pesisir, ruang publik rekreasi, dan pusat kegiatan wisata bahari.",
  },
  Sedang: {
    warna: "#0ea5e9",
    ringkas:
      "Area berpotensi cukup baik sebagai zona pendukung wisata maupun perluasan kegiatan rekreasi pesisir dengan penataan akses dan fasilitas tambahan.",
    aktivitas: "Zona penunjang wisata, sentra UMKM & kuliner lokal, ruang terbuka hijau, dan penginapan.",
  },
  Rendah: {
    warna: "#f59e0b",
    ringkas:
      "Area dengan tingkat kesesuaian wisata lebih terbatas karena karakteristik ruang, fungsi lahan eksisting, atau pertimbangan kondisi lingkungan setempat.",
    aktivitas: "Pemanfaatan terbatas, zona penyangga, atau perlu kajian kelayakan tambahan sebelum pengembangan wisata.",
  },
};

const MITIGASI_DESC = {
  "Bahaya Tinggi": {
    warna: "#ef4444",
    urutan: 1,
    ringkas:
      "Zona prioritas mitigasi dengan tingkat bahaya terpadu paling tinggi. Memerlukan kewaspadaan tinggi, pembatasan pembangunan baru yang rentan, serta kesiapan jalur evakuasi menuju area aman.",
    arahan: "Utamakan keselamatan jiwa, perkuat proteksi pesisir/drainase, dan pastikan akses evakuasi bebas hambatan.",
  },
  "Bahaya Sedang": {
    warna: "#f59e0b",
    urutan: 2,
    ringkas:
      "Zona dengan tingkat potensi bahaya menengah yang tetap memerlukan kesiapsiagaan warga terutama saat cuaca ekstrem, hujan lebat, atau pasang purnama.",
    arahan: "Terapkan bangunan adaptif, jaga saluran drainase, dan pantau informasi resmi BMKG & BPBD.",
  },
  "Bahaya Rendah": {
    warna: "#22c55e",
    urutan: 3,
    ringkas:
      "Zona relatif lebih aman dibanding area pesisir rawan lainnya, sehingga berpotensi dimanfaatkan sebagai kawasan penyangga atau lokasi titik aman sementara.",
    arahan: "Pertahankan fungsi ruang yang aman dan tetap ikuti rambu serta arahan kesiapsiagaan daerah.",
  },
  "Sempadan Pantai": {
    warna: "#0284c7",
    urutan: 4,
    ringkas:
      "Kawasan lindung di sepanjang tepi pantai yang berfungsi menahan hempasan gelombang, abrasi, dan pasang laut untuk melindungi daratan di belakangnya.",
    arahan: "Jaga fungsi lindung sempadan, hindari pembangunan permanen yang merusak pantai, dan dukung vegetasi/struktur pelindung pantai.",
  },
};

function processVectors() {
  // 7a. Zona Potensial Wisata
  const rawWisata = JSON.parse(
    fs.readFileSync(path.join(VECTOR_SRC, "zona_wisata_FeaturesToJSON.geojson"), "utf8"),
  );
  const wisataSummary = [];
  const cleanWisata = {
    type: "FeatureCollection",
    name: "zona_wisata_losari",
    features: rawWisata.features.map((f) => {
      const kelas = f.properties.kelas;
      const meta = WISATA_DESC[kelas] || WISATA_DESC.Sedang;
      const luasM2 = Number(f.properties.Shape_Area || 0);
      const luasHa = Number((luasM2 / 10000).toFixed(2));
      wisataSummary.push({
        gridcode: f.properties.gridcode,
        kelas,
        warna: meta.warna,
        luasHa,
        luasKm2: Number((luasM2 / 1e6).toFixed(2)),
        ringkas: meta.ringkas,
        aktivitas: meta.aktivitas,
      });
      return {
        type: "Feature",
        id: f.id,
        properties: {
          gridcode: f.properties.gridcode,
          kelas,
          warna: meta.warna,
          luas_m2: Math.round(luasM2),
          luas_ha: luasHa,
          ringkas: meta.ringkas,
          aktivitas: meta.aktivitas,
        },
        geometry: f.geometry,
      };
    }),
  };
  fs.writeFileSync(path.join(OUT_VECTOR, "zona_wisata.geojson"), JSON.stringify(cleanWisata));

  // 7b. Atraksi Wisata (8 titik OSM, termasuk 2 karya seni tanpa nama)
  const rawAtraksi = JSON.parse(
    fs.readFileSync(path.join(VECTOR_SRC, "atraksi_wisata.geojson"), "utf8"),
  );
  const atraksiList = [];
  const cleanAtraksi = {
    type: "FeatureCollection",
    name: "atraksi_wisata_losari",
    features: rawAtraksi.features.map((f) => {
      const p = f.properties || {};
      const [lon, lat] = f.geometry.coordinates;
      const artType = p.artwork_type;
      let displayName = p.name;
      if (!displayName) {
        if (artType === "graffiti") displayName = "Karya Seni — Grafiti Pesisir Losari";
        else if (artType === "sculpture") displayName = "Karya Seni — Patung/Instalasi Pesisir";
        else displayName = `Objek Atraksi OSM #${p.OBJECTID}`;
      }
      const kategori =
        p.tourism === "museum"
          ? "Museum"
          : artType === "statue"
            ? "Patung / Monumen"
            : artType === "graffiti"
              ? "Karya Seni (Grafiti)"
              : artType === "sculpture"
                ? "Karya Seni (Patung)"
                : "Karya Seni / Atraksi";

      const deskripsi =
        p.description ||
        (p.tourism === "museum"
          ? `Objek wisata budaya & sejarah di Kawasan Pantai Losari${p.operator ? ` (dikelola ${p.operator})` : ""}.`
          : p.name
            ? `Daya tarik ${kategori.toLowerCase()} di sekitar Kawasan Pantai Losari, Kota Makassar.`
            : `Titik ${kategori.toLowerCase()} terdata di OpenStreetMap pada Kawasan Pantai Losari.`);

      const cleanProps = {
        id: `atr-${p.OBJECTID}`,
        osm_id: p.osm_id,
        name: displayName,
        original_name: p.name ?? null,
        tourism: p.tourism,
        kategori,
        artwork_type: artType ?? null,
        operator: p.operator ?? null,
        deskripsi,
        lat: Number(lat.toFixed(6)),
        lon: Number(lon.toFixed(6)),
      };
      atraksiList.push(cleanProps);
      return {
        type: "Feature",
        id: f.id,
        properties: cleanProps,
        geometry: f.geometry,
      };
    }),
  };
  fs.writeFileSync(path.join(OUT_VECTOR, "atraksi_wisata.geojson"), JSON.stringify(cleanAtraksi));

  // 7c. Zona Mitigasi Bencana (4 fitur)
  const rawMitigasi = JSON.parse(
    fs.readFileSync(path.join(VECTOR_SRC, "zona_mitigasi.geojson"), "utf8"),
  );
  const mitigasiSummary = [];
  const cleanMitigasi = {
    type: "FeatureCollection",
    name: "zona_mitigasi_losari",
    features: rawMitigasi.features.map((f) => {
      const p = f.properties || {};
      const namaZona = p.zona_mitigasi_bencana;
      const meta = MITIGASI_DESC[namaZona] || MITIGASI_DESC["Bahaya Sedang"];
      const luasM2 = Number(p.Shape_Area || 0);
      const luasHa = Number((luasM2 / 10000).toFixed(2));
      mitigasiSummary.push({
        gridcode: p.gridcode ?? null,
        zona: namaZona,
        warna: meta.warna,
        urutan: meta.urutan,
        luasHa,
        luasKm2: Number((luasM2 / 1e6).toFixed(2)),
        ringkas: meta.ringkas,
        arahan: meta.arahan,
      });
      return {
        type: "Feature",
        id: f.id,
        properties: {
          gridcode: p.gridcode ?? null,
          zona_mitigasi_bencana: namaZona,
          warna: meta.warna,
          luas_m2: Math.round(luasM2),
          luas_ha: luasHa,
          ringkas: meta.ringkas,
          arahan: meta.arahan,
        },
        geometry: f.geometry,
      };
    }),
  };
  fs.writeFileSync(path.join(OUT_VECTOR, "zona_mitigasi.geojson"), JSON.stringify(cleanMitigasi));

  return {
    zonaWisata: wisataSummary.sort((a, b) => b.gridcode - a.gridcode),
    atraksiWisata: atraksiList,
    zonaMitigasi: mitigasiSummary.sort((a, b) => a.urutan - b.urutan),
  };
}

/* =====================================================================
 * 8. Proses 2 File CSV Pasang Surut -> public/data/parameter/
 * ===================================================================== */

function processTidalCsvs() {
  // 8a. pasang_surut_terendah.csv (75 kejadian puncak Pasang & lembah Surut)
  const lowLines = fs
    .readFileSync(path.join(PARAM_SRC, "pasang_surut_terendah.csv"), "utf8")
    .trim()
    .split(/\r?\n/);
  const ekstremRows = lowLines.slice(1).map((line) => {
    const [waktu, tinggi, jenis] = line.split(",");
    return { waktu, ketinggian: Number(tinggi), jenis };
  });

  let maxPasang = ekstremRows[0];
  let minSurut = ekstremRows[0];
  let nPasang = 0;
  let nSurut = 0;
  for (const r of ekstremRows) {
    if (r.jenis === "Pasang") nPasang++;
    else nSurut++;
    if (r.ketinggian > maxPasang.ketinggian) maxPasang = r;
    if (r.ketinggian < minSurut.ketinggian) minSurut = r;
  }

  const ekstremOut = {
    sourceFile: "data/parameter/pasang_surut_terendah.csv",
    periode: {
      mulai: ekstremRows[0].waktu,
      akhir: ekstremRows[ekstremRows.length - 1].waktu,
    },
    ringkasan: {
      totalKejadian: ekstremRows.length,
      jumlahPasang: nPasang,
      jumlahSurut: nSurut,
      pasangTertinggi: maxPasang,
      surutTerendah: minSurut,
    },
    data: ekstremRows,
  };
  fs.writeFileSync(path.join(OUT_PARAM, "pasang_surut_ekstrem.json"), JSON.stringify(ekstremOut));

  // 8b. pasang_surut_tertinggi.csv (4.320 titik deret waktu tiap 10 menit)
  const highLines = fs
    .readFileSync(path.join(PARAM_SRC, "pasang_surut_tertinggi.csv"), "utf8")
    .trim()
    .split(/\r?\n/);

  const allSeries = [];
  const hourlySeries = [];
  const datesSet = new Set();
  const minMax = {
    est: [Infinity, -Infinity],
    msl: [Infinity, -Infinity],
    lat: [Infinity, -Infinity],
  };

  for (let i = 1; i < highLines.length; i++) {
    const [dateStr, estS, mslS, latS] = highLines[i].split(",");
    const est = Number(estS);
    const msl = Number(mslS);
    const lat = Number(latS);
    datesSet.add(dateStr.slice(0, 10));

    if (est < minMax.est[0]) minMax.est[0] = est;
    if (est > minMax.est[1]) minMax.est[1] = est;
    if (msl < minMax.msl[0]) minMax.msl[0] = msl;
    if (msl > minMax.msl[1]) minMax.msl[1] = msl;
    if (lat < minMax.lat[0]) minMax.lat[0] = lat;
    if (lat > minMax.lat[1]) minMax.lat[1] = lat;

    // Format ringkas [waktu, EST, MSL, LAT] agar ukuran JSON hemat
    allSeries.push([dateStr, est, msl, lat]);
    if (dateStr.endsWith(":00:00")) {
      hourlySeries.push({ t: dateStr.slice(5, 16), full: dateStr, est, msl, lat });
    }
  }

  const deretOut = {
    sourceFile: "data/parameter/pasang_surut_tertinggi.csv",
    intervalMenit: 10,
    totalBaris: allSeries.length,
    periode: {
      mulai: allSeries[0][0],
      akhir: allSeries[allSeries.length - 1][0],
    },
    tanggalTersedia: [...datesSet],
    rentang: minMax,
    perJam: hourlySeries,
    lengkap: allSeries,
  };
  fs.writeFileSync(path.join(OUT_PARAM, "pasang_surut_deret.json"), JSON.stringify(deretOut));

  return {
    ekstrem: ekstremOut.ringkasan,
    deret: {
      totalBaris: deretOut.totalBaris,
      periode: deretOut.periode,
      rentang: deretOut.rentang,
      jumlahHari: deretOut.tanggalTersedia.length,
    },
  };
}

/* =====================================================================
 * 9. Eksekusi Utama & Penulisan manifest.json
 * ===================================================================== */

console.log("Memulai pra-proses data GIS Kawasan Pantai Losari...");

const hazardGradientLegend = {
  type: "gradient",
  gradient: "linear-gradient(90deg, #22c55e 0%, #eab308 33%, #f97316 66%, #dc2626 100%)",
  minLabel: "0,0 (Rendah)",
  midLabel: "0,5 (Sedang)",
  maxLabel: "1,0 (Tinggi)",
};

const rasters = [
  processUtm50sRaster({
    id: "bahaya_terpadu",
    name: "Bahaya Terpadu (Multi-Ancaman)",
    category: "Kebencanaan",
    description: "Peta kelas bahaya terpadu hasil penggabungan ancaman pesisir di Kawasan Pantai Losari.",
    srcFile: "bahaya_terpadu.tif",
    outFile: "bahaya_terpadu.png",
    outWidth: 420,
    palette: CLASS_HAZARD_COLORS,
    defaultVisible: true,
    legend: {
      type: "classes",
      items: [
        { label: "Kelas 1 — Rendah", color: "#22c55e" },
        { label: "Kelas 2 — Sedang", color: "#f59e0b" },
        { label: "Kelas 3 — Tinggi", color: "#ef4444" },
      ],
    },
  }),
  processUtm50sRaster({
    id: "potensi_wisata",
    name: "Kelas Potensi Wisata",
    category: "Pariwisata",
    description: "Peta raster resolusi 10 m yang mengelompokkan tingkat potensi pengembangan wisata pesisir.",
    srcFile: "potensi_wisata_kelass.tif",
    outFile: "potensi_wisata.png",
    outWidth: 420,
    palette: CLASS_WISATA_COLORS,
    defaultVisible: false,
    legend: {
      type: "classes",
      items: [
        { label: "Kelas 1 — Potensi Rendah", color: "#f59e0b" },
        { label: "Kelas 2 — Potensi Sedang", color: "#0ea5e9" },
        { label: "Kelas 3 — Potensi Tinggi", color: "#10b981" },
      ],
    },
  }),
  processLarge4326Raster({
    id: "bahaya_banjir",
    name: "Indeks Bahaya Banjir",
    category: "Kebencanaan",
    description: "Indeks bahaya banjir skala 0–1 (inaRISK) dipotong pada wilayah studi Kawasan Pantai Losari.",
    srcFile: "bahaya_banjir.tif",
    outFile: "bahaya_banjir.png",
    colorFn: (v) => hazardRamp01(v, 215),
    legend: hazardGradientLegend,
  }),
  processLarge4326Raster({
    id: "bahaya_gelombang_abrasi",
    name: "Indeks Bahaya Gelombang Ekstrem & Abrasi",
    category: "Kebencanaan",
    description: "Indeks bahaya gelombang ekstrem dan abrasi pantai skala 0–1 pada koridor pesisir Losari.",
    srcFile: "bahaya_gelombang_abrasi.tif",
    outFile: "bahaya_gelombang_abrasi.png",
    colorFn: (v) => hazardRamp01(v, 225),
    legend: hazardGradientLegend,
  }),
  processLarge4326Raster({
    id: "bahaya_cuaca_ekstrem",
    name: "Indeks Bahaya Cuaca Ekstrem",
    category: "Kebencanaan",
    description: "Indeks bahaya cuaca ekstrem skala 0–1 (inaRISK) pada Kawasan Pantai Losari.",
    srcFile: "bahaya_cuaca_ekstrem.tif",
    outFile: "bahaya_cuaca_ekstrem.png",
    colorFn: (v) => hazardRamp01(v, 210),
    legend: hazardGradientLegend,
    note: "Catatan data sumber: file raster cuaca ekstrem dan gempa bumi dari sumber aslinya memiliki nilai piksel yang identik (MD5 sama).",
  }),
  processLarge4326Raster({
    id: "bahaya_gempa_bumi",
    name: "Indeks Bahaya Gempa Bumi",
    category: "Kebencanaan",
    description: "Indeks bahaya gempa bumi skala 0–1 pada Kawasan Pantai Losari.",
    srcFile: "bahaya_gempa_bumi.tif",
    outFile: "bahaya_gempa_bumi.png",
    colorFn: (v) => hazardRamp01(v, 210),
    legend: hazardGradientLegend,
    note: "Catatan data sumber: file raster gempa bumi yang diterima memiliki isi piksel yang identik dengan raster cuaca ekstrem (MD5 sama).",
  }),
  processLarge4326Raster({
    id: "fasilitas_umum",
    name: "Raster Fasilitas Umum",
    category: "Infrastruktur",
    description: "Sebaran nilai kelas fasilitas umum (0 hingga 10.000) pada Kawasan Pantai Losari.",
    srcFile: "fasilitas_umum.tif",
    outFile: "fasilitas_umum.png",
    colorFn: fasilitasColor,
    legend: {
      type: "classes",
      items: [
        { label: "0 (Latar daratan)", color: "#bad6e8" },
        { label: "500 – 2.000", color: "#0284c7" },
        { label: "3.000 – 3.200", color: "#4f46e5" },
        { label: "6.000 – 10.000", color: "#9333ea" },
      ],
    },
  }),
];

const vectors = processVectors();
const tidal = processTidalCsvs();

const manifest = {
  generatedAt: new Date().toISOString(),
  wilayahStudi: {
    nama: "Kawasan Pantai Losari",
    kota: "Kota Makassar, Sulawesi Selatan",
    sumberData: ["inaRISK (BNPB)", "BIG", "OpenStreetMap (OSM)", "BMKG"],
    center: [-5.1438, 119.4005],
    defaultZoom: 14,
    bounds: [
      [STUDY_CROP.south, STUDY_CROP.west],
      [STUDY_CROP.north, STUDY_CROP.east],
    ],
  },
  rasters,
  vectors: {
    zonaWisataUrl: "/data/vector/zona_wisata.geojson",
    atraksiWisataUrl: "/data/vector/atraksi_wisata.geojson",
    zonaMitigasiUrl: "/data/vector/zona_mitigasi.geojson",
    ringkasan: vectors,
  },
  pasangSurut: {
    ekstremUrl: "/data/parameter/pasang_surut_ekstrem.json",
    deretUrl: "/data/parameter/pasang_surut_deret.json",
    ringkasan: tidal,
  },
};

fs.writeFileSync(path.join(OUT_BASE, "manifest.json"), JSON.stringify(manifest, null, 2));

console.log("\nSelesai! Ringkasan output di public/data/:");
for (const r of rasters) {
  console.log(`  [Raster] ${r.id}: ${r.pngPx.join("x")} px (${(r.pngBytes / 1024).toFixed(1)} KB) | bounds=${JSON.stringify(r.bounds)}`);
}
console.log(`  [Vector] zona_wisata: ${vectors.zonaWisata.length} kelas | atraksi_wisata: ${vectors.atraksiWisata.length} titik | zona_mitigasi: ${vectors.zonaMitigasi.length} zona`);
console.log(`  [Tidal]  ekstrem: ${tidal.ekstrem.totalKejadian} kejadian | deret: ${tidal.deret.totalBaris} baris (${tidal.deret.jumlahHari} hari)`);
