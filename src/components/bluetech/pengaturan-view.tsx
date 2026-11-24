"use client";

/* Halaman Pengaturan Admin — profil, wilayah studi, tema, dan notifikasi
   tersimpan permanen ke SQLite lewat /api/settings. */

import { useEffect, useState } from "react";
import { Bell, Globe, Loader2, Save, Settings, User } from "lucide-react";
import { Card, PageHeader } from "./page-ui";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

function readStoredTheme(): string {
  if (typeof window === "undefined") return "Terang";
  try {
    const t = localStorage.getItem("bluetech-theme") ?? "terang";
    return t === "gelap" ? "Gelap" : t === "sistem" ? "Ikuti Sistem" : "Terang";
  } catch {
    return "Terang";
  }
}

export function PengaturanView() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [nama, setNama] = useState("Pengelola Bluetech");
  const [email, setEmail] = useState("admin@bluetech-losari.id");
  const [instansi, setInstansi] = useState("Proyek Konsultansi — WebGIS Kawasan Pantai Losari");
  const [wilayahStudi, setWilayahStudi] = useState("Kawasan Pantai Losari, Kota Makassar");
  const [zonaWaktu, setZonaWaktu] = useState("WITA (UTC+8)");
  const [satuanKoordinat, setSatuanKoordinat] = useState("Derajat Desimal (WGS 84)");
  const [tema, setTema] = useState(readStoredTheme);
  const [notifLaporanBaru, setNotifLaporanBaru] = useState(true);
  const [notifValidasiDataset, setNotifValidasiDataset] = useState(true);

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const s = data?.settings;
        if (!s) return;
        if (s.adminName) setNama(s.adminName);
        if (s.adminEmail) setEmail(s.adminEmail);
        if (s.instansi) setInstansi(s.instansi);
        if (s.wilayahStudi) setWilayahStudi(s.wilayahStudi);
        if (s.zonaWaktu) setZonaWaktu(s.zonaWaktu);
        if (s.satuanKoordinat) setSatuanKoordinat(s.satuanKoordinat);
        if (s.notifLaporanBaru !== undefined) setNotifLaporanBaru(s.notifLaporanBaru === "true");
        if (s.notifValidasiDataset !== undefined) setNotifValidasiDataset(s.notifValidasiDataset === "true");
      })
      .catch(() => {});
  }, []);

  const applyTheme = (nextTema: string) => {
    setTema(nextTema);
    const root = document.documentElement;
    const gelap =
      nextTema === "Gelap" ||
      (nextTema === "Ikuti Sistem" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    try {
      localStorage.setItem(
        "bluetech-theme",
        nextTema === "Gelap" ? "gelap" : nextTema === "Ikuti Sistem" ? "sistem" : "terang",
      );
    } catch {}
    if (gelap !== root.classList.contains("dark")) {
      root.classList.toggle("dark", gelap);
      window.dispatchEvent(new Event("bluetech-theme-change"));
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            adminName: nama,
            adminEmail: email,
            instansi,
            wilayahStudi,
            zonaWaktu,
            satuanKoordinat,
            notifLaporanBaru: String(notifLaporanBaru),
            notifValidasiDataset: String(notifValidasiDataset),
          },
        }),
      });
      if (!res.ok) {
        toast({ title: "Gagal menyimpan pengaturan", description: "Pastikan sesi login Admin aktif." });
        return;
      }
      toast({
        title: "Pengaturan tersimpan",
        description: "Seluruh preferensi berhasil diperbarui di database SQLite.",
      });
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "mt-1.5 h-10.5 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-primary";

  return (
    <div className="flex flex-col gap-5 p-5 pb-10 md:p-6">
      <PageHeader
        icon={Settings}
        title="Pengaturan Sistem"
        subtitle="Kelola profil pengelola, informasi wilayah studi, dan preferensi tampilan"
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="Profil Pengelola" action={<User className="size-4.5 text-muted-foreground" />}>
          <div className="flex flex-col gap-3.5">
            <div>
              <label className="text-[12.5px] font-semibold text-foreground">Nama Pengelola</label>
              <input value={nama} onChange={(e) => setNama(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-[12.5px] font-semibold text-foreground">Email Kontak</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[12.5px] font-semibold text-foreground">Instansi / Proyek</label>
              <input value={instansi} onChange={(e) => setInstansi(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-[12.5px] font-semibold text-foreground">Wilayah Studi Aktif</label>
              <input
                value={wilayahStudi}
                onChange={(e) => setWilayahStudi(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-5">
          <Card title="Preferensi Aplikasi" action={<Globe className="size-4.5 text-muted-foreground" />}>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label className="text-[12.5px] font-semibold text-foreground">Format Koordinat</label>
                <select
                  value={satuanKoordinat}
                  onChange={(e) => setSatuanKoordinat(e.target.value)}
                  className={inputCls}
                >
                  <option>Derajat Desimal (WGS 84)</option>
                  <option>Derajat-Menit-Detik (DMS)</option>
                  <option>UTM Zona 50S (Meter)</option>
                </select>
              </div>
              <div>
                <label className="text-[12.5px] font-semibold text-foreground">Zona Waktu</label>
                <select
                  value={zonaWaktu}
                  onChange={(e) => setZonaWaktu(e.target.value)}
                  className={inputCls}
                >
                  <option>WITA (UTC+8)</option>
                  <option>WIB (UTC+7)</option>
                  <option>WIT (UTC+9)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-[12.5px] font-semibold text-foreground">Tema Tampilan</label>
                <select
                  value={tema}
                  onChange={(e) => applyTheme(e.target.value)}
                  className={inputCls}
                >
                  <option>Terang</option>
                  <option>Gelap</option>
                  <option>Ikuti Sistem</option>
                </select>
              </div>
            </div>
          </Card>

          <Card title="Notifikasi Pengelola" action={<Bell className="size-4.5 text-muted-foreground" />}>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[13px] font-semibold text-foreground">Laporan Warga Masuk</p>
                  <p className="text-[11.5px] text-muted-foreground">
                    Tampilkan penanda pada lonceng notifikasi saat ada laporan berstatus belum selesai.
                  </p>
                </div>
                <Switch checked={notifLaporanBaru} onCheckedChange={setNotifLaporanBaru} />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[13px] font-semibold text-foreground">Status Validasi Dataset</p>
                  <p className="text-[11.5px] text-muted-foreground">
                    Sorot dataset yang masih berstatus Perlu Cek atau Menunggu validasi.
                  </p>
                </div>
                <Switch checked={notifValidasiDataset} onCheckedChange={setNotifValidasiDataset} />
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="btn-hero flex h-11 items-center justify-center gap-2 rounded-xl px-6 text-[13.5px] font-semibold text-white disabled:opacity-60"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Simpan Pengaturan
        </button>
      </div>
    </div>
  );
}
