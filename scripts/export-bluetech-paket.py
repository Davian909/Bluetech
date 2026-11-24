# -*- coding: utf-8 -*-
"""Paketkan seluruh data web Bluetech ke folder + ZIP:
   1_json/  2_geojson/  3_geotiff/  4_csv/  database/  + XLSX + README
   Input : /tmp/bluetech-export/all-data.json  (dari export-bluetech-node.mjs)
   Output: /home/z/my-project/download/bluetech-data-export/ (+ .zip)
"""
import csv, json, os, shutil, sqlite3, sys

XLSX_SKILL_DIR = "/home/z/my-project/skills/xlsx"
for sub in [XLSX_SKILL_DIR, os.path.join(XLSX_SKILL_DIR, "templates")]:
    if sub not in sys.path:
        sys.path.insert(0, sub)

import numpy as np
import rasterio
from rasterio.transform import from_origin

from openpyxl import Workbook
from openpyxl.styles import Alignment
from openpyxl.utils import get_column_letter
from templates.base import (
    font_body, font_caption, font_title, fill_header, font_header, align_header,
    border_header, setup_sheet, style_header_row, style_data_row,
    auto_fit_columns, ROW_HEIGHTS, normalize_cell_value,
    PRIMARY, NEUTRAL_600,
)

SRC = "/tmp/bluetech-export/all-data.json"
ROOT = "/home/z/my-project/download/bluetech-data-export"
ZIP = "/home/z/my-project/download/bluetech-data-export.zip"

with open(SRC, encoding="utf-8") as f:
    A = json.load(f)
META, PUB, ENG = A["meta"], A["dataPublik"], A["engine"]

shutil.rmtree(ROOT, ignore_errors=True)  # bersihkan hasil run sebelumnya
for sub in ["1_json", "2_geojson", "3_geotiff", "4_csv"]:
    os.makedirs(os.path.join(ROOT, sub), exist_ok=True)

# ============================== 1) JSON ==============================
for name, val in PUB.items():
    with open(f"{ROOT}/1_json/{name}.json", "w", encoding="utf-8") as f:
        json.dump(val, f, ensure_ascii=False, indent=1)
for name, val in ENG.items():
    if name == "selGrid":
        continue  # 3.456 baris tersedia di CSV/GeoJSON
    with open(f"{ROOT}/1_json/engine-{name}.json", "w", encoding="utf-8") as f:
        json.dump(val, f, ensure_ascii=False, indent=1)
with open(f"{ROOT}/1_json/bluetech-data-lengkap.json", "w", encoding="utf-8") as f:
    json.dump(A, f, ensure_ascii=False, indent=1)

# ============================== 2) GEOJSON ==============================
def pt(lat, lon):
    return {"type": "Point", "coordinates": [round(lon, 6), round(lat, 6)]}

def feat(geom, props):
    return {"type": "Feature", "geometry": geom, "properties": props}

def flat(props):
    out = {}
    for k, v in props.items():
        out[k] = json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else v
    return out

def dump_geojson(fname, feats):
    with open(f"{ROOT}/2_geojson/{fname}", "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": feats}, f, ensure_ascii=False, indent=1)

dump_geojson("titik-wisata.geojson",
             [feat(pt(t["lat"], t["lon"]), flat(t)) for t in PUB["wisata"]])
dump_geojson("penanda-peta-publik.geojson",
             [feat(pt(m["lat"], m["lon"]), flat(m)) for m in PUB["penanda-peta"]])
dump_geojson("titik-risiko-bencana.geojson",
             [feat(pt(m["lat"], m["lon"]), flat(m)) for m in PUB["titik-risiko"]])
dump_geojson("titik-potensi-bencana.geojson",
             [feat(pt(b["lat"], b["lon"]), flat(b)) for b in PUB["potensi-bencana"]])
dump_geojson("pelabuhan.geojson",
             [feat(pt(p["lat"], p["lon"]), flat(p)) for p in ENG["pelabuhan"]])
dump_geojson("alur-pelayaran.geojson",
             [feat({"type": "LineString",
                    "coordinates": [[lon, lat] for lat, lon in ENG["alurPelayaran"]]},
                   {"nama": "Alur pelayaran utama (DEMO)"})])
dump_geojson("zona-tata-ruang-laut.geojson",
             [feat({"type": "Polygon",
                    "coordinates": [[[lon, lat] for lat, lon in z["ring"]]]},
                   {"id": z["id"], "label": z["label"], "warna": z["color"]})
              for z in ENG["zonaTataRuang"]])
dump_geojson("kawasan-inti-konservasi.geojson",
             [feat({"type": "Polygon",
                    "coordinates": [[[lon, lat] for lat, lon in ENG["intiKonservasi"]]]},
                   {"nama": "Kawasan inti konservasi (DEMO)"})])

# Grid MCDA -> satu titik per sel dengan 21 atribut lapisan
layer_keys = list(ENG["lapisanGrid"].keys())
grid_feats = []
for row in ENG["selGrid"]:
    props = {k: row[k] for k in row if k not in ("idx", "lat", "lon")}
    grid_feats.append(feat(pt(row["lat"], row["lon"]), {"idx": row["idx"], **props}))
dump_geojson("grid-analisis-mcda.geojson", grid_feats)

# ============================== 3) GEOTIFF ==============================
cfg = ENG["konfigurasiGrid"]
GW, GH = cfg["GRID_W"], cfg["GRID_H"]
px_w = (cfg["BBOX"]["east"] - cfg["BBOX"]["west"]) / GW
px_h = (cfg["BBOX"]["north"] - cfg["BBOX"]["south"]) / GH
transform = from_origin(cfg["BBOX"]["west"], cfg["BBOX"]["north"], px_w, px_h)

RASTERS = [
    ("lapisanGrid", "depth",        "batimetri-kedalaman-laut.tif",   "Kedalaman laut (m) — model DEMO"),
    ("lapisanGrid", "waveHs",       "tinggi-gelombang-hs.tif",        "Tinggi gelombang signifikan (m)"),
    ("lapisanGrid", "abrasionRate", "laju-abrasi-m-per-tahun.tif",    "Laju perubahan garis pantai (m/tahun)"),
    ("lapisanGrid", "elevation",    "elevasi-daratan.tif",            "Elevasi daratan (m)"),
]
for group, key, fname, desc in RASTERS:
    arr = np.array(ENG[group][key], dtype="float32").reshape(GH, GW)
    arr = np.flipud(arr)  # baris 0 array = selatan -> raster utara-di-atas
    nodata = None
    if np.isnan(arr).any():
        nodata = -9999.0
        arr = np.where(np.isnan(arr), nodata, arr)
    with rasterio.open(
        f"{ROOT}/3_geotiff/{fname}", "w", driver="GTiff",
        height=GH, width=GW, count=1, dtype="float32",
        crs="EPSG:4326", transform=transform, nodata=nodata,
    ) as dst:
        dst.write(arr, 1)
        dst.set_band_description(1, desc)

# ============================== 4) CSV ==============================
def rows_from_list(items):
    cols, rows = [], []
    for it in items:
        r = {}
        for k, v in (it.items() if isinstance(it, dict) else [("nilai", it)]):
            r[k + "_json"] = json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else v
        rows.append(r)
        for c in r:
            if c not in cols:
                cols.append(c)
    return cols, rows

def rows_from_dict(dikt, key_label="kunci"):
    cols, rows = [key_label], []
    for k, v in dikt.items():
        vals = v if isinstance(v, dict) else {"nilai": v}
        r = {key_label: k}
        for kk, vv in vals.items():
            r[kk] = json.dumps(vv, ensure_ascii=False) if isinstance(vv, (dict, list)) else vv
        rows.append(r)
        for c in r:
            if c not in cols:
                cols.append(c)
    return cols, rows

TABULAR = {
    "wilayah": ("list", PUB["wilayah"]),
    "notifikasi": ("list", PUB["notifikasi"]),
    "jenis-pemanfaatan": ("list", PUB["jenis-pemanfaatan"]),
    "opsi-kedalaman": ("list", PUB["opsi-kedalaman"]),
    "zona-pemanfaatan": ("list", PUB["zona-pemanfaatan"]),
    "jenis-risiko": ("list", PUB["jenis-risiko"]),
    "penanda-peta": ("list", PUB["penanda-peta"]),
    "titik-risiko": ("list", PUB["titik-risiko"]),
    "wisata": ("list", PUB["wisata"]),
    "potensi-bencana": ("list", PUB["potensi-bencana"]),
    "pemantauan": ("list", PUB["pemantauan"]),
    "kontak-darurat": ("list", PUB["kontak-darurat"]),
    "edukasi-mitigasi": ("list", PUB["edukasi-mitigasi"]),
    "jenis-lapor": ("list", PUB["jenis-lapor"]),
    "prediksi-pariwisata": ("list", PUB["prediksi-pariwisata"]),
    "langkah-buka-wisata": ("list", PUB["langkah-buka-wisata"]),
    "parameter-publik": ("dict", PUB["parameter-publik"]),
    "arti-kelas-publik": ("dict", PUB["arti-kelas-publik"]),
    "tautan-potensi-pemantauan": ("dict", PUB["tautan-potensi-pemantauan"]),
    "pelabuhan": ("list", ENG["pelabuhan"]),
    "zona-tata-ruang": ("list", ENG["zonaTataRuang"]),
    "kelompok-kriteria-mcda": ("list", ENG["kelompokKriteria"]),
    "pemanfaatan-mcda": ("list", ENG["pemanfaatan"]),
    "kelas-kesesuaian": ("list", ENG["metaKelasKesesuaian"]),
}
csv_meta = {}
for name, (kind, data) in TABULAR.items():
    cols, rows = rows_from_list(data) if kind == "list" else rows_from_dict(data)
    csv_meta[name] = {"cols": cols, "rows": rows, "n": len(rows)}
    with open(f"{ROOT}/4_csv/{name}.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow({c: r.get(c, "") for c in cols})

grid_cols = ["idx", "lat", "lon"] + layer_keys
with open(f"{ROOT}/4_csv/grid-analisis-mcda.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.DictWriter(f, fieldnames=grid_cols, extrasaction="ignore")
    w.writeheader()
    for r in ENG["selGrid"]:
        w.writerow(r)
csv_meta["grid-analisis-mcda"] = {"cols": grid_cols, "n": len(ENG["selGrid"]), "grid": True}

# (Catatan: db/custom.db hanya berisi tabel template kosong Post/User yang
#  tidak dipakai fitur web — tidak diekspor.)

# ============================== XLSX ==============================
wb = Workbook()
wb.properties.creator = "Z.ai"
SHEETS = []  # (judul, sumber, ket, jumlah baris) untuk Daftar Isi

def write_table(ws, judul, cols, rows, number_cols=(), plain_rows=False):
    setup_sheet(ws, title=judul, last_col=min(len(cols) + 1, 12))
    for c, name in enumerate(cols, 2):
        ws.cell(row=4, column=c, value=name)
    style_header_row(ws, 4, 2, len(cols) + 1)
    for i, r in enumerate(rows):
        for c, name in enumerate(cols, 2):
            v = r.get(name, "") if isinstance(r, dict) else (r[c - 2] if c - 2 < len(r) else "")
            if isinstance(v, bool):
                v = "Ya" if v else "Tidak"
            cell = ws.cell(row=5 + i, column=c, value=normalize_cell_value(v))
            if not plain_rows:
                cell.fill = fill_data_row_local(i)
                cell.font = font_body()
            if name in number_cols and isinstance(v, (int, float)):
                cell.number_format = "0.000"
                cell.alignment = Alignment(horizontal="right", vertical="center")
    ws.freeze_panes = "B5"
    auto_fit_columns(ws, header_row=4, data_start_row=5)

def fill_data_row_local(i):
    from openpyxl.styles import PatternFill
    return PatternFill("solid", fgColor="FFFFFF" if i % 2 == 0 else "F7F7F5")

SHEET_TITLES = {
    "wilayah": "Wilayah Studi", "notifikasi": "Notifikasi",
    "jenis-pemanfaatan": "Jenis Pemanfaatan", "opsi-kedalaman": "Opsi Kedalaman",
    "zona-pemanfaatan": "Zona Pemanfaatan", "jenis-risiko": "Jenis Risiko",
    "penanda-peta": "Penanda Peta Publik", "titik-risiko": "Titik Risiko Bencana",
    "wisata": "Wisata Bahari", "potensi-bencana": "Potensi Bencana",
    "pemantauan": "Pemantauan Terkini", "kontak-darurat": "Kontak Darurat",
    "edukasi-mitigasi": "Edukasi Mitigasi", "jenis-lapor": "Jenis Lapor Warga",
    "prediksi-pariwisata": "Prediksi Pariwisata", "langkah-buka-wisata": "Langkah Buka Wisata",
    "parameter-publik": "Parameter Publik", "arti-kelas-publik": "Arti Kelas Publik",
    "tautan-potensi-pemantauan": "Tautan Potensi Pemantauan",
    "pelabuhan": "Pelabuhan", "zona-tata-ruang": "Zona Tata Ruang",
    "kelompok-kriteria-mcda": "Kriteria MCDA", "pemanfaatan-mcda": "Pemanfaatan MCDA",
    "kelas-kesesuaian": "Kelas Kesesuaian",
}
NUM_COLS = {"lat", "lon", "skor", "score", "depth", "luas", "affectedArea"}

for name, (kind, _) in TABULAR.items():
    ws = wb.create_sheet(SHEET_TITLES[name])
    m = csv_meta[name]
    write_table(ws, SHEET_TITLES[name], m["cols"], m["rows"],
                number_cols={c for c in m["cols"] if c in NUM_COLS})
    SHEETS.append((SHEET_TITLES[name], f"4_csv/{name}.csv", m["n"]))

ws = wb.create_sheet("Grid MCDA")
write_table(ws, "Grid Analisis MCDA — 3.456 sel (1 baris = 1 sel grid)",
            grid_cols, ENG["selGrid"], plain_rows=True)
SHEETS.append(("Grid MCDA", "4_csv/grid-analisis-mcda.csv", len(ENG["selGrid"])))

# Sheet Daftar Isi (paling depan)
idx = wb.active
idx.title = "Daftar Isi"
setup_sheet(idx, title="Katalog Data Web Bluetech — Ekspor Lengkap", last_col=5)
hdr = ["Sheet", "Berkas Sumber", "Jumlah Baris", "Keterangan"]
for c, h in enumerate(hdr, 2):
    idx.cell(row=4, column=c, value=h)
style_header_row(idx, 4, 2, 5)
KET = {
    "Wilayah Studi": "7 wilayah studi (teluk/pesisir/selat) + luas",
    "Wisata Bahari": "Titik wisata eksisting & potensi (lat/lon, fakta, foto)",
    "Penanda Peta Publik": "Marker peta mode masyarakat (wisata & potensi)",
    "Titik Risiko Bencana": "Marker wilayah rawan bencana (peta admin)",
    "Potensi Bencana": "Potensi bencana per titik: tingkat, skor, faktor, waspada",
    "Pemantauan Terkini": "Arus pemantauan: gelombang, angin, rob, abrasi, hujan",
    "Prediksi Pariwisata": "Prediksi peluang wisata baru",
    "Jenis Risiko": "Risiko bencana: level, skor, kerentanan, rekomendasi",
    "Kontak Darurat": "Kontak penting mitigasi",
    "Edukasi Mitigasi": "Materi edukasi siap siaga",
    "Jenis Lapor Warga": "Kategori laporan masyarakat",
    "Parameter Publik": "Arti & saran bahasa awam per parameter pemantauan",
    "Arti Kelas Publik": "Makna kelas kesesuaian versi publik",
    "Pelabuhan": "Pelabuhan acuan (lat/lon, kedalaman)",
    "Zona Tata Ruang": "Polygon zona ruang laut (koordinat JSON)",
    "Kriteria MCDA": "Kelompok kriteria analisis MCDA/AHP",
    "Pemanfaatan MCDA": "Konfigurasi bobot per jenis pemanfaatan",
    "Kelas Kesesuaian": "Kelas hasil analisis (S1/S2/dst.)",
    "Grid MCDA": "3.456 sel × 21 lapisan (kedalaman, gelombang, mangrove, dll.)",
}
r_i = 5
for judul, sumber, n in SHEETS:
    idx.cell(row=r_i, column=2, value=judul).font = font_body()
    idx.cell(row=r_i, column=3, value=sumber).font = font_body()
    c = idx.cell(row=r_i, column=4, value=n)
    c.font = font_body(); c.alignment = Alignment(horizontal="right", vertical="center")
    idx.cell(row=r_i, column=5, value=KET.get(judul, "Tabel data aplikasi")).font = font_body()
    fill = fill_data_row_local(r_i - 5)
    for cc in range(2, 6):
        idx.cell(row=r_i, column=cc).fill = fill
    idx.row_dimensions[r_i].height = ROW_HEIGHTS["data"]
    r_i += 1
cat = idx.cell(row=r_i + 1, column=2, value=(
    "Sistem koordinat: WGS 84 (EPSG:4326). Seluruh nilai adalah simulasi DEMO — "
    "bukan data resmi, bukan untuk navigasi. Sumber: src/lib/bluetech-data.ts, "
    "src/lib/analysis-engine.ts, db/custom.db. Diekspor " + META["diekspor"]))
cat.font = font_caption()
cat.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
idx.merge_cells(start_row=r_i + 1, start_column=2, end_row=r_i + 3, end_column=5)
auto_fit_columns(idx, header_row=4, data_start_row=5)
for col, w in (("B", 24), ("C", 30), ("D", 12), ("E", 46)):
    idx.column_dimensions[col].width = w

xlsx_path = f"{ROOT}/bluetech-data-export.xlsx"
wb.save(xlsx_path)

# ============================== README ==============================
readme = f"""================================================================
 EKSPOR DATA WEB BLUETECH — {META['diekspor']}
================================================================

Folder ini berisi SEMUA data yang dipakai aplikasi web Bluetech
(sumber: src/lib/bluetech-data.ts, src/lib/analysis-engine.ts,
db/custom.db). Sistem koordinat: WGS 84 (EPSG:4326).
Seluruh nilai adalah simulasi DEMO — bukan data resmi,
bukan untuk navigasi.

STRUKTUR
--------
  1_json/      Data mentah lengkap (22 dataset + mesin MCDA + gabungan
               bluetech-data-lengkap.json)
  2_geojson/   Lapisan peta vektor (9 berkas, siap pakai di web/QGIS)
  3_geotiff/   Raster grid analisis (4 berkas, 72x48 piksel, WGS84)
  4_csv/       Semua tabel dalam CSV (utf-8-sig, aman untuk Excel)
  bluetech-data-export.xlsx   Katalog Excel multi-sheet (mulai "Daftar Isi")

CATATAN DATABASE: berkas db/custom.db pada proyek hanya berisi tabel
template kosong (Post/User) yang tidak dipakai fitur web, sehingga
yang diekspor di sini adalah data konten asli dari kode aplikasi.

REKOMENDASI FORMAT (jawaban "bagusnya pakai apa")
------------------------------------------------
  * Untuk PETA / GIS        -> GEOJSON (2_geojson/). Standar web GIS:
        langsung bisa dimuat Leaflet/MapLibre/OpenLayers, bisa dibuka
        QGIS, bisa dilihat di geojson.io. Ini format TERBAIK untuk
        data titik/garis/poligon.
  * Untuk RASTER PERAIRAN   -> GEOTIFF (3_geotiff/). Batimetri & grid
        analisis untuk QGIS/ArcGIS/GDAL; 1 piksel = 1 sel grid
        (±1,08 km x 1,43 km).
  * Untuk EXCEL / manusia   -> XLSX (bluetech-data-export.xlsx), mulai
        dari sheet "Daftar Isi".
  * Untuk PENGOLAHAN LANJUT -> CSV (4_csv/): pandas, SQL, import
        database.
  * Untuk DIPAKAI KEMBALI OLEH WEB -> JSON (1_json/): format asli
        kode aplikasi; bluetech-data-lengkap.json = backup satu berkas.

CARA PAKAI CEPAT
----------------
  QGIS          : Layer > Add Layer > Add Vector Layer (GeoJSON)
                  / Add Raster Layer (GeoTIFF).
  Leaflet.js    : fetch('titik-wisata.geojson') -> L.geoJSON(data)
                  .addTo(map);
  Google MyMaps / geojson.io : unggah berkas GeoJSON langsung.

LAPISAN GEOTIFF
---------------
  batimetri-kedalaman-laut.tif   Kedalaman laut (m)
  tinggi-gelombang-hs.tif        Tinggi gelombang signifikan (m)
  laju-abrasi-m-per-tahun.tif    Laju perubahan garis pantai (m/tahun)
  elevasi-daratan.tif            Elevasi daratan (m)
  Grid: 72 kolom x 48 baris, luas total 2.850 km2 (sel 0,825 km2).

LAPISAN GRID MCDA (kolom di grid-analisis-mcda.csv/geojson)
----------------------------------------------------------
  depth=kedalaman(m), waveHs=gelombang(m), currentSpeed=arus(m/s),
  tideRange=pasang(m), elevation=elevasi(m), slope=kemiringan(deg),
  mangrove/coral/seagrass=kerapatan 0-1, substrate=0 lumpur 1 pasir
  2 karang, distLand/distCoast/distPort/laneDist=jarak(km),
  zoneId=0-5 zona tata ruang, konservasiCore=0/1, abrasionRate &
  sedimentRate=m/tahun, exposure=paparan 0-1, windSpeed=angin(m/s),
  isLand=0 laut 1 darat, distLand=jarak pantai(km).
"""
with open(f"{ROOT}/README-EXPORT.txt", "w", encoding="utf-8") as f:
    f.write(readme)

# ============================== VERIFIKASI + ZIP ==============================
print("== VERIFIKASI ==")
for fname, exp in [("titik-wisata.geojson", 6), ("grid-analisis-mcda.geojson", 3456)]:
    with open(f"{ROOT}/2_geojson/{fname}", encoding="utf-8") as f:
        n = len(json.load(f)["features"])
    print(f"  {fname}: {n} fitur {'OK' if n == exp else 'SALAH!'}")
with rasterio.open(f"{ROOT}/3_geotiff/batimetri-kedalaman-laut.tif") as r:
    arr = r.read(1)
    print(f"  GeoTIFF batimetri: {r.width}x{r.height} CRS={r.crs} "
          f"min={arr.min():.1f} max={arr.max():.1f}")
print(f"  CSV: {len(os.listdir(f'{ROOT}/4_csv'))} berkas | "
      f"GeoTIFF: {len(os.listdir(f'{ROOT}/3_geotiff'))} berkas | "
      f"GeoJSON: {len(os.listdir(f'{ROOT}/2_geojson'))} berkas | "
      f"JSON: {len(os.listdir(f'{ROOT}/1_json'))} berkas")

if os.path.exists(ZIP):
    os.remove(ZIP)
base = os.path.basename(ROOT)
src_dir = os.path.dirname(ROOT)
import subprocess
subprocess.run(["zip", "-rq", ZIP, base], cwd=src_dir, check=True)
print(f"== ZIP: {ZIP} ==")
