# AGENTS.md — Panduan untuk agen AI (Bluetech)

## Gambaran proyek
- **Bluetech**: WebGIS Perencanaan Ruang Laut & Mitigasi Bencana. Ini tugas akhir mata kuliah Proyek Konsultansi.
- Teknologi: Next.js 16, React 19, Tailwind v4, shadcn/ui, Prisma + SQLite (`db/custom.db`), peta Leaflet/OpenStreetMap.
- Analisis Monte Carlo (Analisis Sensitivitas) memakai Python: `python/mcda_engine.py`, dipanggil lewat `/api/mcda`.
- Saat ini peta di web masih memakai **data simulasi** di `src/lib/bluetech-data.ts`. Data asli ada di folder `data/` dan belum terhubung ke web.
- Wilayah studi: koordinat data berada di sekitar Kota Makassar (kira-kira 119,38–119,42 BT dan 5,13–5,16 LS).

## Struktur folder data
```
data/
├── raw/                  DATA MENTAH — hanya baca, jangan diubah atau ditimpa
│   ├── citra_satelit/    Sentinel-2 L2A, 14 Nov 2026 (B02, B03, B04, B08, True color)
│   └── osm_sulawesi/     Shapefile OpenStreetMap (Geofabrik) seluruh Sulawesi, per 20 Nov 2026
├── processed/            Hasil olahan
│   ├── raster/           GeoTIFF bahaya & fasilitas (7 file)
│   └── vector/           GeoJSON zona & atraksi (3 file)
├── parameter/            Data parameter (CSV pasang surut)
└── DATA-CATALOG.md       Daftar rinci setiap file — BACA INI SEBELUM MENYENTUH DATA
```

## Aturan wajib untuk data
1. `data/raw/` **hanya boleh dibaca**. Jangan edit, timpa, atau hapus.
2. Hasil olahan baru disimpan dengan **nama baru** di `data/processed/`. Jangan menimpa file yang ada.
3. Nama file baru: huruf kecil, tanpa spasi, memakai garis bawah (`snake_case`).
4. Jangan membaca seluruh file besar sekaligus. Layer `gis_osm_buildings_a_free_1` berukuran sekitar 1,2 GB dan harus difilter dengan batas wilayah (bounding box) dulu.
5. Jangan menaruh TIFF besar (sekitar 55 MB) atau data mentah di `public/`. Browser tidak bisa menampilkannya langsung. Konversi dulu ke PNG overlay, tile, atau GeoJSON yang sudah disederhanakan, lalu taruh hasil ringannya di `public/data/`.
6. Jangan commit `data/raw/` dan `data/processed/raster/` ke Git (sudah ada di `.gitignore`).

## Sistem koordinat (CRS)
- Vektor (GeoJSON, OSM) dan raster besar: **EPSG:4326** (WGS 84).
- Raster `bahaya_terpadu.tif` dan `potensi_wisata_kelass.tif`: **EPSG:32750** (WGS 84 / UTM zona 50S).
- Web (Leaflet) memakai EPSG:4326. Reproyeksi dulu bila perlu dan catat di `DATA-CATALOG.md`.
- Nilai NoData berbeda-beda per raster. Lihat `DATA-CATALOG.md`. Jangan memperlakukan -999, -9999, atau -3.4e38 sebagai data nyata.

## Hal yang belum pasti — tanya pengguna, jangan menebak
- Arti nilai di raster bahaya (skala 0–1, kelas 0–3, dan lainnya) dan metode pembuatannya.
- Makna kolom `EST` di CSV pasang surut, dan apakah nama kedua file CSV sesuai isinya.
- Dua raster (`bahaya_cuaca_ekstrem.tif` dan `bahaya_gempa_bumi.tif`) **identik byte per byte**. Tanyakan apakah itu disengaja.

## Menjalankan proyek (Windows)
```
copy .env.example .env
npm install
npm run dev          # http://localhost:3000
```
Kredensial Admin: diatur lewat `ADMIN_USERNAME` dan `ADMIN_PASSWORD` di file `.env` (jangan ditulis langsung di repo).

## Cara bekerja
- Jawab dan beri penjelasan dalam **bahasa Indonesia**. Pengguna masih belajar, jadi jelaskan langkah dengan sederhana.
- Jelaskan rencana sebelum mengubah banyak file. Ubah sedikit-sedikit dan mudah dicek.
- Jangan jalankan `npm audit fix --force`, dan jangan menghapus `db/custom.db` tanpa bertanya.
- Skrip pengolahan data ditaruh di `scripts/` dan ditulis supaya bisa dijalankan ulang.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
