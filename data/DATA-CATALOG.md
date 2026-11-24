# DATA-CATALOG — Bluetech

Daftar data proyek. Informasi bertanda **[terverifikasi]** dibaca langsung dari file (header TIFF, isi CSV/GeoJSON, daftar arsip). Bertanda **[dugaan]** berarti belum pasti dan perlu dikonfirmasi pemilik data.

Terakhir diperiksa: 22 November 2026. Total data sekitar 1,8 GB, 126 entri dalam arsip asli.

## Pemetaan nama folder dan file

| Nama asli | Nama baru (yang dipakai di dokumen ini) |
|---|---|
| `Data/Raw/Citra Satelit` | `data/raw/citra_satelit` |
| `Data/Raw/Data Jalanan Sulawesi` | `data/raw/osm_sulawesi` |
| `Data/Processed/Raster` | `data/processed/raster` |
| `Data/Processed/Vector` | `data/processed/vector` |
| `Data/Parameter` | `data/parameter` |

Folder `osm_sulawesi` dipakai karena isinya bukan hanya jalan, tapi seluruh layer OpenStreetMap Sulawesi.
Nama file olahan dan parameter sudah dirapikan (tanpa spasi dan tanda kurung). Nama aslinya tetap tercatat di kolom "Nama asli".

---

## 1. Data olahan — raster (`data/processed/raster/`)

Semua berformat GeoTIFF, tanpa kompresi, 1 band.

### 1a. Raster besar (EPSG:4326, WGS 84) — [terverifikasi]

Semua mencakup area yang sama: **119,0–120,0 BT dan 6,0–5,0 LS** (sekitar 1° × 1°). Resolusi sekitar 30 m. Ukuran tiap file sekitar 55 MB.

| Nama baru | Nama asli | Piksel | Tipe | NoData | Rentang nilai valid | Dugaan isi |
|---|---|---|---|---|---|---|
| `bahaya_cuaca_ekstrem.tif` | `Cuaca Ekstrem.tif` | 3709 × 3709 | float32 | -999 | sekitar 0,16 – 0,35 | indeks bahaya cuaca ekstrem [dugaan] |
| `bahaya_gelombang_abrasi.tif` | `Peta Bahaya Bencana (Gelombang Ekstrim dan Abrasi.tif` | 3709 × 3709 | float32 | -9999 | sekitar 0,44 – 0,63 | indeks bahaya gelombang ekstrem dan abrasi [dugaan] |
| `bahaya_banjir.tif` | `Peta Bencana Bahaya (Banjir).tif` | 3721 × 3721 | float32 | -9999 | 0 – 1 | indeks bahaya banjir (ternormalisasi) [dugaan] |
| `fasilitas_umum.tif` | `Raster Fasilitas Umum.tif` | 3709 × 3709 | float32 | -3,4e38 | nilai diskrit: 0, 500, 2000, 3000, 3200, 6000, 10000 | belum diketahui; mungkin kelas jarak (meter) [dugaan] |
| `bahaya_gempa_bumi.tif` | `Raster Gempa Bumi.tif` | 3709 × 3709 | float32 | -999 | sama dengan cuaca ekstrem | **identik dengan `bahaya_cuaca_ekstrem.tif`** |

> **Perlu dicek:** `bahaya_cuaca_ekstrem.tif` (asli: `Cuaca Ekstrem.tif`) dan `bahaya_gempa_bumi.tif` (asli: `Raster Gempa Bumi.tif`) mempunyai hash MD5 yang sama (`98da16c8...`), artinya isinya persis sama. Kemungkinan salah ekspor. Jangan dipakai untuk analisis sebelum dikonfirmasi.
>
> Nama asli file gelombang punya tanda kurung yang tidak berpasangan, itu sebabnya namanya sudah diganti.

### 1b. Raster kecil (EPSG:32750, WGS 84 / UTM zona 50S) — [terverifikasi]

Mencakup area kecil sekitar 4 km × 3,5 km, tipe uint8.

| Nama | Piksel | Resolusi | Nilai | Dugaan isi |
|---|---|---|---|---|
| `bahaya_terpadu.tif` | 116 × 132 | sekitar 30 m | 0 (9.770 piksel), 1 (413), 2 (1.688), 3 (3.441) | kelas bahaya terpadu: 1 rendah, 2 sedang, 3 tinggi; 0 di luar area [dugaan] |
| `potensi_wisata_kelass.tif` | 344 × 387 | 10 m | 0 (57.695), 1 (10.406), 2 (33.188), 3 (31.839) | kelas potensi wisata: 1 rendah, 2 sedang, 3 tinggi; 0 di luar area [dugaan] |

Dugaan kelas 1–3 didukung oleh file GeoJSON di bawah (gridcode 1 = Rendah, 2 = Sedang, 3 = Tinggi). Nama file `potensi_wisata_kelass` mengandung salah ketik ("kelass"). Boleh diganti, tapi ubah juga rujukan di kode.

> Raster besar (EPSG:4326) dan kecil (EPSG:32750) memakai CRS berbeda. Samakan CRS sebelum dioverlay atau dihitung bersama.

---

## 2. Data olahan — vektor (`data/processed/vector/`) — [terverifikasi]

Semua GeoJSON, EPSG:4326.

| File | Geometri | Jumlah fitur | Atribut penting | Isi |
|---|---|---|---|---|
| `zona_mitigasi.geojson` | Polygon / MultiPolygon | 4 | `gridcode`, `zona_mitigasi_bencana`, `Shape_Length`, `Shape_Area` | Bahaya Rendah (1), Sedang (2), Tinggi (3), dan Sempadan Pantai (tanpa gridcode). Area 119,39–119,41 BT, 5,155–5,133 LS |
| `zona_wisata_FeaturesToJSON.geojson` | Polygon / MultiPolygon | 3 | `gridcode`, `kelas`, `osm_type`, `Shape_Area` | Zona wisata kelas Rendah (1), Sedang (2), Tinggi (3) |
| `atraksi_wisata.geojson` | Point | 8 | `tourism`, `name`, `osm_id`, `addr_*` | Titik atraksi dari OSM: Gedung Mulo, Museum Kota Makassar, Tugu Sultan Hasanuddin, Patung Tedong Bonga, Patung Macan, Kanebo Art Shop, dan 2 karya seni tanpa nama |

`atraksi_wisata.geojson` punya banyak kolom kosong (hasil ekspor OSM). Aman diabaikan.

---

## 3. Data parameter (`data/parameter/`) — [terverifikasi, arti kolom sebagian dugaan]

Keduanya mencakup **21 November – 20 Desember 2026**.

| Nama baru | Nama asli | Baris | Kolom | Isi |
|---|---|---|---|---|
| `pasang_surut_terendah.csv` | `Pasang Surut Terendah.csv` | 74 | `Waktu`, `Ketinggian (m)`, `Jenis` | Daftar kejadian puncak pasang dan lembah surut (37 Pasang, 38 Surut). Ketinggian -0,83 s.d. 0,83 m |
| `pasang_surut_tertinggi.csv` | `Pasang Surut Tertinggi.csv` | 4.319 | `Date`, `EST`, `MSL`, `LAT` | Deret waktu tiap 10 menit. `MSL` -0,83 s.d. 0,83; `LAT` 0,05 s.d. 1,72; `EST` 0,64 s.d. 2,30 |

> **Perlu dicek:** nama file tampaknya tidak mencerminkan isi (file "Terendah" berisi daftar kejadian, file "Tertinggi" berisi deret waktu). Arti `EST` belum diketahui. `MSL` diduga ketinggian terhadap Mean Sea Level dan `LAT` terhadap Lowest Astronomical Tide. Konfirmasi dengan sumber data.

---

## 4. Data mentah — citra satelit (`data/raw/citra_satelit/`) — [terverifikasi]

Sentinel-2 L2A, tanggal 14 November 2026. EPSG:4326, 793 × 526 piksel, resolusi sekitar 10 m, kompresi DEFLATE.
Cakupan: sekitar 119,376–119,448 BT dan 5,163–5,116 LS.

| File (awalan `2026-11-14-00_00_2026-11-14-23_59_Sentinel-2_L2A_`) | Isi | Tipe |
|---|---|---|
| `B02_(Raw).tiff` | Band 2 (biru) | uint16 |
| `B03_(Raw).tiff` | Band 3 (hijau) | uint16 |
| `B04_(Raw).tiff` | Band 4 (merah) | uint16 |
| `B08_(Raw).tiff` | Band 8 (NIR) | uint16 |
| `True_color.tiff` | Komposit warna asli, 3 band | uint16 |

Nilai 65535 muncul sebagai maksimum di tiap band, kemungkinan nilai penanda (NoData atau saturasi). Periksa sebelum menghitung indeks seperti NDVI atau NDWI.

---

## 5. Data mentah — OpenStreetMap Sulawesi (`data/raw/osm_sulawesi/`) — [terverifikasi]

Shapefile dari Geofabrik, diambil per **20 November 2026**, EPSG:4326, lisensi ODbL. Dokumentasi layer: https://download.geofabrik.de/osm-data-in-gis-formats-free.pdf

Tiap layer terdiri atas `.shp`, `.shx`, `.dbf`, `.prj`, `.cpg`. Jangan dipisahkan atau dihapus sebagian. Akhiran `_a_` berarti poligon, tanpa itu berarti titik atau garis.

| Layer | Ukuran `.shp` | Catatan |
|---|---|---|
| `gis_osm_buildings_a_free_1` | **548 MB** (+ `.dbf` 646 MB) | **Sangat besar, sekitar 1,2 GB.** Filter dengan batas wilayah dulu |
| `gis_osm_roads_free_1` | 122 MB (+ `.dbf` 70 MB) | Jaringan jalan |
| `gis_osm_landuse_a_free_1` | 15 MB | Tata guna lahan |
| `gis_osm_waterways_free_1` | 14 MB | Sungai dan saluran |
| `gis_osm_adminareas_a_free_1` | 13 MB | Batas administrasi |
| `gis_osm_places_a_free_1`, `gis_osm_places_free_1` | 9 MB, 0,4 MB | Tempat/permukiman |
| `gis_osm_water_a_free_1` | 6 MB | Badan air |
| `gis_osm_pois_a_free_1`, `gis_osm_pois_free_1` | 3,5 MB, 0,2 MB | Titik kepentingan |
| `gis_osm_protected_areas_a_free_1` | 3 MB | Kawasan lindung |
| `gis_osm_pofw_*`, `gis_osm_traffic_*`, `gis_osm_transport_*`, `gis_osm_natural_*`, `gis_osm_railways_free_1` | di bawah 2 MB | Tempat ibadah, lalu lintas, transportasi, alam, rel |

---

## 6. Data ringan untuk web (`public/data/`) — [terverifikasi]

Dihasilkan otomatis oleh skrip `scripts/prepare_public_data.mjs` (Node.js murni) dari `data/processed/` dan `data/parameter/` tanpa mengubah file sumber. Semua sudah dalam **EPSG:4326** dan dipotong ke wilayah studi **Kawasan Pantai Losari** (`119,380–119,418°E`, `-5,161 s.d. -5,127°S`):

| File di `public/data/` | Sumber | Metode Olah |
|---|---|---|
| `raster/bahaya_terpadu.png` | `data/processed/raster/bahaya_terpadu.tif` | Reproyeksi UTM 50S (`EPSG:32750`) → `EPSG:4326`, nilai `0` transparan, kelas 1–3 warna standar |
| `raster/potensi_wisata.png` | `data/processed/raster/potensi_wisata_kelass.tif` | Reproyeksi UTM 50S (`EPSG:32750`) → `EPSG:4326`, nilai `0` transparan, kelas 1–3 warna standar |
| `raster/bahaya_banjir.png` | `data/processed/raster/bahaya_banjir.tif` | Crop area studi Losari, NoData `-9999` transparan, gradasi bahaya `0–1` |
| `raster/bahaya_gelombang_abrasi.png` | `data/processed/raster/bahaya_gelombang_abrasi.tif` | Crop area studi Losari, NoData `-9999` transparan, gradasi bahaya `0–1` |
| `raster/bahaya_cuaca_ekstrem.png` | `data/processed/raster/bahaya_cuaca_ekstrem.tif` | Crop area studi Losari, NoData `-999` transparan, gradasi bahaya `0–1` |
| `raster/bahaya_gempa_bumi.png` | `data/processed/raster/bahaya_gempa_bumi.tif` | Crop area studi Losari, NoData `-999` transparan, gradasi bahaya `0–1` (catatan: sumber identik dengan cuaca ekstrem) |
| `raster/fasilitas_umum.png` | `data/processed/raster/fasilitas_umum.tif` | Crop area studi Losari, NoData `-3,4e38` transparan, nilai `0` latar lembut + kelas `500–10000` |
| `vector/zona_wisata.geojson` | `data/processed/vector/zona_wisata_FeaturesToJSON.geojson` | Salin bersih + tambah luas (Ha) & ringkasan per kelas (`Rendah`, `Sedang`, `Tinggi`) |
| `vector/atraksi_wisata.geojson` | `data/processed/vector/atraksi_wisata.geojson` | Bersihkan atribut kosong + normalisasi nama 8 titik atraksi (termasuk 2 karya seni) |
| `vector/zona_mitigasi.geojson` | `data/processed/vector/zona_mitigasi.geojson` | Salin bersih + tambah luas (Ha), warna, & arahan mitigasi 4 zona |
| `parameter/pasang_surut_ekstrem.json` | `data/parameter/pasang_surut_terendah.csv` | Konversi 75 kejadian puncak Pasang & lembah Surut ke JSON |
| `parameter/pasang_surut_deret.json` | `data/parameter/pasang_surut_tertinggi.csv` | Konversi 4.320 baris deret waktu 10-menitan + ringkasan per jam ke JSON |
| `manifest.json` | Semua sumber di atas | Metadata koordinat batas (`bounds`), legenda, dan statistik ringkas untuk antarmuka publik |

---

## Catatan untuk pengerjaan berikutnya
- Jalankan ulang `node scripts/prepare_public_data.mjs` setiap kali ada pembaruan file di `data/processed/` atau `data/parameter/`.
- Catat setiap file baru yang dibuat di dokumen ini, lengkap dengan sumber, CRS, dan metode pembuatannya.
