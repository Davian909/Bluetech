#!/bin/bash
# Paketkan proyek Bluetech (Next.js) untuk dibuka di VSCode & di-hosting.
# Output: /home/z/my-project/download/bluetech-webgis-vscode.zip
set -e

SRC=/home/z/my-project
STG=/tmp/bluetech-pkg
OUT=/home/z/my-project/download/bluetech-webgis-vscode.zip

rm -rf "$STG"
mkdir -p "$STG"

# 1) Salin kode & konfigurasi (tanpa node_modules/.next/.git/.env/logs)
cp -r "$SRC/src"        "$STG/src"
cp -r "$SRC/public"     "$STG/public"
cp -r "$SRC/prisma"     "$STG/prisma"
cp -r "$SRC/db"         "$STG/db"
cp -r "$SRC/python"     "$STG/python"
cp "$SRC/package.json"        "$STG/package.json"
cp "$SRC/bun.lock"            "$STG/bun.lock"
cp "$SRC/next.config.ts"      "$STG/next.config.ts"
cp "$SRC/tsconfig.json"       "$STG/tsconfig.json"
cp "$SRC/postcss.config.mjs"  "$STG/postcss.config.mjs"
cp "$SRC/tailwind.config.ts"  "$STG/tailwind.config.ts"
cp "$SRC/components.json"     "$STG/components.json"
cp "$SRC/eslint.config.mjs"   "$STG/eslint.config.mjs"
cp "$SRC/.gitignore"          "$STG/.gitignore"
cp "$SRC/next-env.d.ts"       "$STG/next-env.d.ts"

# 2) Rapikan package.json: nama proyek + script portabel (tanpa tee/bun)
node -e '
const fs = require("fs");
const p = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
p.name = "bluetech-webgis";
p.version = "1.0.0";
p.scripts = {
  dev: "next dev -p 3000",
  build: "next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/",
  start: "NODE_ENV=production node .next/standalone/server.js",
  lint: "eslint .",
  "db:generate": "prisma generate",
  "db:push": "prisma db push --accept-data-loss"
};
fs.writeFileSync(process.argv[1], JSON.stringify(p, null, 2) + "\n");
' "$STG/package.json"

# 3) .env.example (placeholder, tanpa kredensial)
cat > "$STG/.env.example" <<'EOF'
# Salin file ini menjadi ".env" (tanpa titik di depan contoh) di folder utama:
#   cp .env.example .env
# Prisma (SQLite) — path dihitung relatif terhadap folder prisma/
DATABASE_URL="file:../db/custom.db"

# Opsional: lokasi Python untuk fitur Monte Carlo (/api/mcda).
# Kosongkan bila "python3" sudah tersedia di PATH.
# PYTHON_BIN="python3"
EOF

# 4) Petunjuk pemakaian & hosting (Bahasa Indonesia)
cat > "$STG/PETUNJUK-HOSTING.txt" <<'EOF'
================================================================
 BLUETECH — WEBGIS PERENCANAAN RUANG LAUT & MITIGASI BENCANA
 Paket Kode untuk VSCode + Hosting
================================================================

ISI PAKET
---------
  src/           Kode aplikasi (Next.js 16 + React 19 + Tailwind v4 + shadcn/ui)
  public/        Aset statis (logo, gambar, robots.txt)
  prisma/        Skema database Prisma (SQLite)
  db/            File database SQLite (db/custom.db) — sudah berisi data demo
  python/        mcda_engine.py — mesin Monte Carlo untuk fitur Analisis Sensitivitas
  PETUNJUK-HOSTING.txt   File ini
  .env.example   Contoh variabel lingkungan

CATATAN PENTING: proyek ini TIDAK memakai file TIFF/GeoTIFF.
Seluruh peta digambar dari data simulasi vektor (src/lib/bluetech-data.ts)
dan peta dasar Leaflet/OpenStreetMap, jadi tidak ada berkas .tif yang
perlu disertakan saat hosting.

A. MENJALANKAN DI KOMPUTER (VSCode)
-----------------------------------
  1. Ekstrak ZIP, buka folder hasil ekstrak di VSCode.
  2. Pastikan Node.js 20+ terpasang (cek: node -v).
  3. Buat file .env:
       cp .env.example .env
     (Windows PowerShell: copy .env.example .env)
  4. Pasang dependensi:
       npm install
     Prisma client dibuat otomatis. Bila muncul error Prisma:
       npx prisma generate
  5. Jalankan mode pengembangan:
       npm run dev
     Buka http://localhost:3000
  6. Build produksi (Linux/macOS/Git Bash; di Windows gunakan PowerShell):
       npm run build
       npm run start          -> http://localhost:3000

AKUN ADMIN
----------
  Tombol "Admin" (pojok kanan atas) -> login sesuai variabel
  ADMIN_USERNAME dan ADMIN_PASSWORD pada file .env.

B. HOSTING DI VERCEL (paling mudah, gratis)
-------------------------------------------
  1. Upload proyek ke repositori GitHub.
  2. vercel.com -> Add New Project -> pilih repositori.
  3. Build Command otomatis (npm run build). Tambahkan Environment
     Variable:
       DATABASE_URL = file:../db/custom.db
  4. Deploy. Catatan: serverless Vercel tidak menjalankan proses
     Python jangka panjang, sehingga fitur "Analisis Sensitivitas
     (Monte Carlo)" di panel admin mungkin tidak tersedia; fitur
     peta, pariwisata, mitigasi, edukasi, dan lapor tetap normal.

C. HOSTING DI VPS / NODE HOSTING (semua fitur berjalan)
-------------------------------------------------------
  1. Siapkan VPS (Ubuntu) dengan Node.js 20+ dan Python 3:
       sudo apt update && sudo apt install -y nodejs npm python3
  2. Salin proyek ke server, lalu:
       cp .env.example .env
       npm install
       npm run build
       npm run start        # berjalan di port 3000
  3. Pasang reverse proxy (contoh Caddy):
       nama-domain-anda.com {
           reverse_proxy localhost:3000
       }
  4. Agar tetap berjalan, gunakan proses manager:
       npm i -g pm2
       NODE_ENV=production pm2 start .next/standalone/server.js --name bluetech

D. HOSTING cPANEL (Node.js App)
-------------------------------
  1. Ekstrak proyek di File Manager, buat .env dari .env.example.
  2. Setup Node.js App: Application Root = folder proyek,
     Startup File = .next/standalone/server.js
  3. Jalankan "npm install" lalu "npm run build" dari terminal cPanel.

STRUKTUR MENU APLIKASI
----------------------
  Masyarakat Umum (tanpa login): Beranda, Peta Interaktif, Pariwisata,
  Mitigasi Bencana, Edukasi Mitigasi.
  Admin/Pengelola: Dashboard, Kesesuaian, Pemantauan Risiko, Manajemen
  Data, Laporan, Pengaturan, Bantuan.

SEMUA DATA ADALAH SIMULASI DEMO — BUKAN UNTUK NAVIGASI.
EOF

# 5) Bersihkan berkas cache yang tak diperlukan dari salinan
find "$STG/src" -name "*.DS_Store" -delete 2>/dev/null || true

# 6) ZIP
mkdir -p /home/z/my-project/download
rm -f "$OUT"
cd "$STG"
zip -rq "$OUT" .
echo "=== SELESAI ==="
du -h "$OUT"
unzip -l "$OUT" | tail -3
unzip -l "$OUT" | rg -c "node_modules|\.next/|^.*\.env$" || echo "AMAN: tanpa node_modules/.next/.env"
