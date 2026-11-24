"use client";

/* Halaman Bantuan Admin — panduan operasional CRUD & sinkronisasi data
   Kawasan Pantai Losari untuk pengelola WebGIS Bluetech. */

import { useState } from "react";
import { ChevronDown, Database, HelpCircle, Layers, MapPin, ShieldAlert } from "lucide-react";
import { Card, PageHeader } from "./page-ui";

const FAQ_ADMIN = [
  {
    q: "Bagaimana sinkronisasi antara halaman Admin dan Publik bekerja?",
    a: "Setiap perubahan (tambah, ubah, toggle tampil, atau hapus) pada Manajemen Data, Zona & Atraksi Wisata, Mitigasi & Laporan Warga, serta Kelola Edukasi langsung disimpan ke database SQLite (db/custom.db) melalui REST API (/api/...). Saat pengunjung membuka antarmuka publik, data terbaru langsung dimuat otomatis.",
  },
  {
    q: "Bagaimana cara menambah titik atraksi wisata baru di Kawasan Pantai Losari?",
    a: "Buka menu Zona & Atraksi Wisata, klik tombol 'Pilih Titik di Peta', lalu klik langsung lokasi yang diinginkan pada peta Kawasan Pantai Losari. Koordinat lintang dan bujur akan terisi otomatis pada formulir.",
  },
  {
    q: "Bagaimana cara mengubah status laporan masyarakat yang masuk?",
    a: "Buka menu Mitigasi & Laporan Warga pada tab Laporan Warga. Anda dapat mengganti status langsung (Diterima → Diproses → Selesai) atau klik ikon edit untuk menambahkan catatan tindak lanjut petugas yang akan terlihat oleh masyarakat.",
  },
  {
    q: "Bagaimana cara memperbarui layer raster dari folder data/processed/raster/?",
    a: "Simpan file GeoTIFF baru di folder data/processed/raster/ (tanpa menimpa data/raw/), lalu jalankan ulang perintah 'node scripts/prepare_public_data.mjs' di terminal untuk memperbarui PNG overlay ringan dan manifest.json di public/data/.",
  },
  {
    q: "Di mana kredensial login Admin disimpan?",
    a: "Nama pengguna dan kata sandi Admin diatur melalui variabel ADMIN_USERNAME dan ADMIN_PASSWORD pada file .env di folder utama proyek dan diperiksa di sisi server (/api/admin/login), bukan di kode browser.",
  },
];

export function BantuanView() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="flex flex-col gap-5 p-5 pb-10 md:p-6">
      <PageHeader
        icon={HelpCircle}
        title="Bantuan & Panduan Pengelola"
        subtitle="Alur pengelolaan data spasial, CRUD, dan sinkronisasi antarmuka publik Bluetech"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            icon: Database,
            judul: "Manajemen Data",
            desc: "Atur visibilitas 7 raster, 3 GeoJSON, dan 2 data pasang surut ke Peta Interaktif.",
          },
          {
            icon: MapPin,
            judul: "Titik Wisata Losari",
            desc: "Tambah, ubah, atau hapus titik atraksi langsung lewat klik koordinat pada peta.",
          },
          {
            icon: ShieldAlert,
            judul: "Laporan & Edukasi",
            desc: "Tindak lanjuti laporan warga dan kelola panduan mitigasi berbasis data olahan.",
          },
        ].map((g) => {
          const Icon = g.icon;
          return (
            <div key={g.judul} className="card-marine flex items-start gap-3 p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-[14px] font-bold text-foreground">{g.judul}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{g.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      <Card title="Pertanyaan Umum Pengelola (FAQ)">
        <div className="flex flex-col divide-y divide-border/70">
          {FAQ_ADMIN.map((f, i) => (
            <div key={f.q}>
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-3 py-3.5 text-left"
                aria-expanded={open === i}
              >
                <span className="text-[13.5px] font-semibold text-foreground">{f.q}</span>
                <ChevronDown
                  className={`size-4 shrink-0 text-muted-foreground transition-transform ${open === i ? "rotate-180" : ""}`}
                />
              </button>
              {open === i ? (
                <p className="pb-4 text-[13px] leading-relaxed text-muted-foreground">{f.a}</p>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      <Card title="Sumber Data & Arsitektur Sistem">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-secondary/50 p-3.5 text-[12.5px]">
            <p className="flex items-center gap-1.5 font-bold text-foreground">
              <Layers className="size-4 text-primary" /> Sumber Data Spasial
            </p>
            <p className="mt-1 text-muted-foreground">inaRISK (BNPB), BIG, OpenStreetMap, dan BMKG.</p>
          </div>
          <div className="rounded-xl bg-secondary/50 p-3.5 text-[12.5px]">
            <p className="font-bold text-foreground">Database &amp; ORM</p>
            <p className="mt-1 text-muted-foreground">SQLite (db/custom.db) + Prisma ORM (6 tabel aktif).</p>
          </div>
          <div className="rounded-xl bg-secondary/50 p-3.5 text-[12.5px]">
            <p className="font-bold text-foreground">Wilayah Studi</p>
            <p className="mt-1 text-muted-foreground">Kawasan Pantai Losari, Kota Makassar (WGS 84).</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
