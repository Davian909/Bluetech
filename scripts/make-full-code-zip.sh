#!/bin/bash
# Paketkan SELURUH file & folder bagian "code" proyek Bluetech.
# Output: /home/z/my-project/download/bluetech-code-lengkap.zip
set -e

SRC=/home/z/my-project
STG=/tmp/bluetech-code-full
OUT=/home/z/my-project/download/bluetech-code-lengkap.zip

rm -rf "$STG"
mkdir -p "$STG"

# 1) SEMUA folder kode (tanpa node_modules/.next/.git/.env/logs/upload/download)
cp -r "$SRC/src"          "$STG/src"
cp -r "$SRC/public"       "$STG/public"
cp -r "$SRC/prisma"       "$STG/prisma"
cp -r "$SRC/db"           "$STG/db"
cp -r "$SRC/python"       "$STG/python"
cp -r "$SRC/scripts"      "$STG/scripts"
cp -r "$SRC/tests"        "$STG/tests"
cp -r "$SRC/examples"     "$STG/examples"

# 2) SEMUA file konfigurasi di root proyek
cp "$SRC/package.json"        "$STG/package.json"
cp "$SRC/bun.lock"            "$STG/bun.lock"
cp "$SRC/next.config.ts"      "$STG/next.config.ts"
cp "$SRC/next-env.d.ts"       "$STG/next-env.d.ts"
cp "$SRC/tsconfig.json"       "$STG/tsconfig.json"
cp "$SRC/postcss.config.mjs"  "$STG/postcss.config.mjs"
cp "$SRC/tailwind.config.ts"  "$STG/tailwind.config.ts"
cp "$SRC/components.json"     "$STG/components.json"
cp "$SRC/eslint.config.mjs"   "$STG/eslint.config.mjs"
cp "$SRC/Caddyfile"           "$STG/Caddyfile"
cp "$SRC/.gitignore"          "$STG/.gitignore"

# 3) Rapikan package.json: nama proyek + script portabel
node -e '
const fs = require("fs");
const p = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
p.name = "bluetech-webgis";
p.version = "1.1.0";
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

# 4) .env.example (placeholder, tanpa kredensial)
cat > "$STG/.env.example" <<'EOF'
# Salin file ini menjadi ".env" di folder utama:
#   cp .env.example .env
# Prisma (SQLite) — path dihitung relatif terhadap folder prisma/
DATABASE_URL="file:../db/custom.db"

# Opsional: lokasi Python untuk fitur Monte Carlo (/api/mcda).
# Kosongkan bila "python3" sudah tersedia di PATH.
# PYTHON_BIN="python3"
EOF

# 5) Petunjuk pemakaian (Bahasa Indonesia) — mencakup SELURUH isi paket
cat > "$STG/PETUNJUK-HOSTING.txt" <<'EOF'
================================================================
 BLUETECH — WEBGIS PERENCANAAN RUANG LAUT & MITIGASI BENCANA
 Paket KODE LENGKAP (seluruh file & folder bagian "code")
================================================================

ISI PAKET (struktur sama dengan pohon file di editor kode)
----------------------------------------------------------
  src/            Kode aplikasi (Next.js 16 + React 19 + Tailwind v4 + shadcn/ui)
    app/          Layout, halaman, API route (/api/mcda)
    components/   bluetech/ = 32 komponen antarmuka; ui/ = komponen shadcn
    hooks/        use-toast, use-mobile
    lib/          bluetech-data.ts (pusat data), analysis-engine, db, utils
  public/         Aset statis: logo.svg, images/bg/, wisata/, robots.txt
  prisma/         schema.prisma — skema database
  db/             custom.db — database SQLite (sudah berisi data demo)
  python/         mcda_engine.py — mesin Monte Carlo (Analisis Sensitivitas)
  scripts/        Skrip utilitas proyek (paket, ekspor data, penempatan titik)
  tests/          Skrip uji runtime (python/database/container)
  examples/       Contoh WebSocket (frontend.tsx, server.ts) — referensi saja
  package.json    Dependensi & script npm (versi portabel)
  bun.lock        Lockfile dependensi
  next.config.ts / tsconfig.json / tailwind.config.ts / postcss.config.mjs
  eslint.config.mjs / components.json / next-env.d.ts / .gitignore
  Caddyfile       Contoh konfigurasi reverse proxy Caddy
  .env.example    Contoh variabel lingkungan
  PETUNJUK-HOSTING.txt   File ini

CATATAN PENTING: proyek ini TIDAK memakai file TIFF/GeoTIFF.
Seluruh peta digambar dari data simulasi vektor (src/lib/bluetech-data.ts)
dan peta dasar Leaflet/OpenStreetMap.

A. MENJALANKAN DI KOMPUTER (VSCode)
-----------------------------------
  1. Ekstrak ZIP, buka folder hasil ekstrak di VSCode.
  2. Pastikan Node.js 20+ terpasang (cek: node -v).
  3. Buat file .env:
       cp .env.example .env
     (Windows PowerShell: copy .env.example .env)
  4. Pasang dependensi:
       npm install
     Bila muncul error Prisma: npx prisma generate
  5. Jalankan mode pengembangan:
       npm run dev
     Buka http://localhost:3000
  6. Build produksi (Linux/macOS/Git Bash):
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
  3. Tambahkan Environment Variable:
       DATABASE_URL = file:../db/custom.db
  4. Deploy. Catatan: serverless Vercel tidak menjalankan proses
     Python, sehingga fitur "Analisis Sensitivitas (Monte Carlo)"
     mungkin tidak tersedia; fitur lain tetap normal.

C. HOSTING DI VPS / NODE HOSTING (semua fitur berjalan)
-------------------------------------------------------
  1. VPS (Ubuntu) dengan Node.js 20+ dan Python 3:
       sudo apt update && sudo apt install -y nodejs npm python3
  2. Salin proyek ke server, lalu:
       cp .env.example .env
       npm install
       npm run build
       npm run start        # port 3000
  3. Reverse proxy (contoh Caddy — lihat juga Caddyfile):
       nama-domain-anda.com {
           reverse_proxy localhost:3000
       }
  4. Proses manager:
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

# 6) Bersihkan berkas sampah dari salinan
find "$STG" -name "*.DS_Store" -delete 2>/dev/null || true
find "$STG" -name "*.log" -delete 2>/dev/null || true

# 7) ZIP + verifikasi
mkdir -p /home/z/my-project/download
rm -f "$OUT"
cd "$STG"
zip -rq "$OUT" .
echo "=== SELESAI ==="
du -h "$OUT"
unzip -l "$OUT" | tail -3
echo "--- cek keamanan (harus 0 atau AMAN) ---"
unzip -l "$OUT" | rg -c "node_modules|\.next/|tool-results|dev\.log" || echo "AMAN: tanpa node_modules/.next/tool-results"
unzip -l "$OUT" | rg -c "\.env$" || echo "AMAN: tanpa .env asli (hanya .env.example)"
echo "--- folder utama dalam zip ---"
unzip -l "$OUT" | awk '{print $4}' | rg "^[a-z]+/$" | sort -u
