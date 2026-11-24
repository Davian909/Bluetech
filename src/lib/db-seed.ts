/**
 * Pengisian data awal (seed) otomatis dan idempoten untuk SQLite (db/custom.db).
 * Memastikan seluruh data nyata Kawasan Pantai Losari dari public/data/manifest.json
 * dan materi edukasi tersedia sejak permintaan pertama tanpa menimpa perubahan admin.
 */

import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import { EDUKASI_MITIGASI_LOSARI, type LosariManifest } from "@/lib/losari-data";
import bundledManifest from "../../public/data/manifest.json";

let seedPromise: Promise<void> | null = null;

function readManifestFromDisk(): LosariManifest | null {
  try {
    const p = path.join(process.cwd(), "public", "data", "manifest.json");
    return JSON.parse(fs.readFileSync(p, "utf8")) as LosariManifest;
  } catch {
    return bundledManifest as unknown as LosariManifest;
  }
}

async function runSeedIfNeeded() {
  const manifest = readManifestFromDisk();

  // 1. Seed 8 titik atraksi wisata OSM (Kawasan Pantai Losari)
  const attrCount = await db.tourismAttraction.count();
  if (attrCount === 0 && manifest?.vectors.ringkasan.atraksiWisata) {
    for (const a of manifest.vectors.ringkasan.atraksiWisata) {
      await db.tourismAttraction.upsert({
        where: { code: a.id },
        update: {},
        create: {
          code: a.id,
          name: a.name,
          category: a.kategori,
          tourismType: a.tourism === "museum" ? "museum" : "artwork",
          zoneClass: "Tinggi",
          description: a.deskripsi,
          operator: a.operator ?? "OpenStreetMap / Umum",
          lat: a.lat,
          lon: a.lon,
          active: true,
        },
      });
    }
  }

  // 2. Seed 12 katalog dataset nyata (7 raster + 3 vektor + 2 CSV pasang surut)
  const dsCount = await db.spatialDataset.count();
  if (dsCount === 0 && manifest) {
    for (const r of manifest.rasters) {
      const sizeStr =
        r.sourceCrs === "EPSG:32750"
          ? `${(r.pngBytes / 1024).toFixed(1)} KB (PNG) / UTM 50S`
          : `55 MB (GeoTIFF) → ${(r.pngBytes / 1024).toFixed(1)} KB (PNG)`;
      await db.spatialDataset.upsert({
        where: { slug: r.id },
        update: {},
        create: {
          slug: r.id,
          name: r.name,
          category: r.category,
          dataType: "Raster",
          format: "GeoTIFF",
          source: r.id.startsWith("bahaya_") ? "inaRISK (BNPB) / Olahan" : "BIG / OSM / Olahan",
          crs: r.sourceCrs === "EPSG:32750" ? "EPSG:32750 → EPSG:4326" : "EPSG:4326 (WGS 84)",
          coverage: "Kawasan Pantai Losari",
          fileSize: sizeStr,
          description: r.description,
          note: r.note,
          publicUrl: r.url,
          validationStatus: r.note ? "Perlu Cek" : "Tervalidasi",
          visiblePublic: true,
          defaultOn: r.defaultVisible,
        },
      });
    }

    const extraDatasets = [
      {
        slug: "zona_wisata",
        name: "Poligon Zona Potensial Wisata",
        category: "Pariwisata",
        dataType: "Vektor",
        format: "GeoJSON",
        source: "Olahan Spasial / OSM / BIG",
        crs: "EPSG:4326 (WGS 84)",
        coverage: "Kawasan Pantai Losari",
        fileSize: "45 KB (3 kelas)",
        description: "Zonasi potensi pengembangan wisata pesisir kelas Tinggi, Sedang, dan Rendah.",
        note: null,
        publicUrl: "/data/vector/zona_wisata.geojson",
        validationStatus: "Tervalidasi",
        visiblePublic: true,
        defaultOn: true,
      },
      {
        slug: "atraksi_wisata",
        name: "Titik Atraksi Wisata Kawasan Losari",
        category: "Pariwisata",
        dataType: "Vektor",
        format: "GeoJSON",
        source: "OpenStreetMap (OSM)",
        crs: "EPSG:4326 (WGS 84)",
        coverage: "Kawasan Pantai Losari",
        fileSize: "4,7 KB (8 titik)",
        description: "Sebaran titik museum, monumen, dan karya seni di sekitar Pantai Losari.",
        note: null,
        publicUrl: "/data/vector/atraksi_wisata.geojson",
        validationStatus: "Tervalidasi",
        visiblePublic: true,
        defaultOn: true,
      },
      {
        slug: "zona_mitigasi",
        name: "Poligon Zona Mitigasi Bencana & Sempadan Pantai",
        category: "Kebencanaan",
        dataType: "Vektor",
        format: "GeoJSON",
        source: "inaRISK (BNPB) / BIG",
        crs: "EPSG:4326 (WGS 84)",
        coverage: "Kawasan Pantai Losari",
        fileSize: "69 KB (4 zona)",
        description: "Zonasi Bahaya Rendah, Sedang, Tinggi, dan koridor lindung Sempadan Pantai.",
        note: null,
        publicUrl: "/data/vector/zona_mitigasi.geojson",
        validationStatus: "Tervalidasi",
        visiblePublic: true,
        defaultOn: true,
      },
      {
        slug: "pasang_surut_ekstrem",
        name: "Jadwal Puncak Pasang & Lembah Surut (Nov–Des 2026)",
        category: "Pasang Surut",
        dataType: "Parameter",
        format: "CSV",
        source: "BIG / BMKG",
        crs: "Non-spasial",
        coverage: "Kawasan Pantai Losari",
        fileSize: "2,4 KB (75 kejadian)",
        description: "Daftar 37 kejadian pasang dan 38 surut beserta ketinggian terhadap MSL.",
        note: "Nama file asli: pasang_surut_terendah.csv",
        publicUrl: "/data/parameter/pasang_surut_ekstrem.json",
        validationStatus: "Tervalidasi",
        visiblePublic: true,
        defaultOn: true,
      },
      {
        slug: "pasang_surut_deret",
        name: "Deret Waktu Pasang Surut 10-Menitan (Nov–Des 2026)",
        category: "Pasang Surut",
        dataType: "Parameter",
        format: "CSV",
        source: "BIG / BMKG",
        crs: "Non-spasial",
        coverage: "Kawasan Pantai Losari",
        fileSize: "153 KB (4.320 baris)",
        description: "Pengamatan pasang surut tiap 10 menit selama 30 hari pada kolom EST, MSL, dan LAT.",
        note: "Nama file asli: pasang_surut_tertinggi.csv",
        publicUrl: "/data/parameter/pasang_surut_deret.json",
        validationStatus: "Tervalidasi",
        visiblePublic: true,
        defaultOn: true,
      },
    ];

    for (const d of extraDatasets) {
      await db.spatialDataset.upsert({
        where: { slug: d.slug },
        update: {},
        create: d,
      });
    }
  }

  // 3. Seed 3 laporan warga awal Kawasan Pantai Losari
  const repCount = await db.citizenReport.count();
  if (repCount === 0) {
    const initialReports = [
      {
        code: "LP-0201",
        reporterName: "Daeng Sila (pengemudi perahu)",
        category: "Sampah Laut & Pantai",
        location: "Pulau Lae-Lae",
        description:
          "Kiriman sampah plastik menumpuk di sisi timur dermaga penyeberangan setelah angin kencang semalam.",
        photoName: null,
        status: "selesai",
        adminNote: "Sudah dikoordinasikan dengan petugas kebersihan pesisir dan dibersihkan.",
      },
      {
        code: "LP-0202",
        reporterName: "Ibu Rahma (pedagang kuliner)",
        category: "Gelombang Ekstrem",
        location: "Anjungan Pantai Losari",
        description:
          "Hempasan ombak dari arah barat cukup tinggi hingga membasahi tepi pelataran anjungan menjelang sore.",
        photoName: "ombak-anjungan.jpg",
        status: "diterima",
        adminNote: null,
      },
      {
        code: "LP-0203",
        reporterName: "Andi Baso (warga Mariso)",
        category: "Banjir Rob",
        location: "Kawasan Mariso & Mattoangin",
        description:
          "Air pasang mulai naik ke saluran dekat jalan lingkungan sekitar pukul 10.30 WITA saat hujan gerimis.",
        photoName: "genangan-mariso.jpg",
        status: "diproses",
        adminNote: "Tim lapangan sedang memeriksa pintu saluran pembuangan di koridor Mariso.",
      },
    ];
    for (const r of initialReports) {
      await db.citizenReport.upsert({
        where: { code: r.code },
        update: {},
        create: r,
      });
    }
  }

  // 4. Seed 6 materi edukasi mitigasi Losari
  const eduCount = await db.educationContent.count();
  if (eduCount === 0) {
    for (let i = 0; i < EDUKASI_MITIGASI_LOSARI.length; i++) {
      const m = EDUKASI_MITIGASI_LOSARI[i];
      await db.educationContent.upsert({
        where: { slug: m.id },
        update: {},
        create: {
          slug: m.id,
          title: m.judul,
          category: m.kategori,
          summary: m.ringkas,
          contextLosari: m.kenali,
          stepsJson: JSON.stringify(m.langkah),
          sortOrder: i + 1,
          published: true,
        },
      });
    }
  }

  // 5. Seed program aksi mitigasi Kawasan Pantai Losari
  const actCount = await db.mitigationAction.count();
  if (actCount === 0) {
    const actions = [
      {
        title: "Pemeliharaan struktur penahan ombak & talud koridor Anjungan Losari",
        hazardType: "Gelombang Ekstrem & Abrasi",
        location: "Anjungan Pantai Losari & Jl. Penghibur",
        priority: "Tinggi",
        status: "Berjalan",
        progress: 65,
        notes: "Prioritas menghadapi musim angin barat pada zona sempadan pantai.",
      },
      {
        title: "Normalisasi saluran drainase pesisir & katup balik air pasang",
        hazardType: "Banjir",
        location: "Kawasan Mariso & Mattoangin",
        priority: "Tinggi",
        status: "Berjalan",
        progress: 45,
        notes: "Mengurangi genangan saat hujan lebat bersamaan puncak pasang (+0,83 m MSL).",
      },
      {
        title: "Pemasangan papan informasi rambu evakuasi & titik kumpul ruang publik",
        hazardType: "Gempa Bumi",
        location: "Centre Point of Indonesia (CPI) & Losari",
        priority: "Sedang",
        status: "Direncanakan",
        progress: 20,
        notes: "Arahkan pengunjung menuju jalur daratan aman menjauhi garis pantai.",
      },
      {
        title: "Penertiban pemanfaatan ruang pada koridor Sempadan Pantai (133 Ha)",
        hazardType: "Sempadan Pantai",
        location: "Sepanjang Pesisir Kawasan Pantai Losari",
        priority: "Tinggi",
        status: "Berjalan",
        progress: 55,
        notes: "Menjaga fungsi lindung pantai sesuai zonasi mitigasi.",
      },
      {
        title: "Sosialisasi peringatan dini cuaca ekstrem untuk pelaku wisata & perahu",
        hazardType: "Cuaca Ekstrem",
        location: "Dermaga Penyeberangan Pulau Lae-Lae",
        priority: "Sedang",
        status: "Selesai",
        progress: 100,
        notes: "Rujukan harian kanal informasi maritim BMKG Wilayah IV Makassar.",
      },
    ];
    for (const a of actions) {
      await db.mitigationAction.create({ data: a });
    }
  }

  // 6. Seed pengaturan default aplikasi
  const setCount = await db.appSetting.count();
  if (setCount === 0) {
    const defaults: Record<string, string> = {
      adminName: "Pengelola Bluetech",
      adminEmail: "admin@bluetech-losari.id",
      instansi: "Proyek Konsultansi — WebGIS Kawasan Pantai Losari",
      wilayahStudi: "Kawasan Pantai Losari, Kota Makassar",
      sumberData: "inaRISK (BNPB), BIG, OpenStreetMap (OSM), BMKG",
      zonaWaktu: "WITA (UTC+8)",
      satuanKoordinat: "Derajat Desimal (WGS 84)",
      notifLaporanBaru: "true",
      notifValidasiDataset: "true",
    };
    for (const [key, value] of Object.entries(defaults)) {
      await db.appSetting.upsert({ where: { key }, update: {}, create: { key, value } });
    }
  }
}

export async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeedIfNeeded().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  await seedPromise;
}
