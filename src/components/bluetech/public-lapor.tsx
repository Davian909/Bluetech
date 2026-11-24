"use client";

/* Panel LAPOR MASYARAKAT — tersinkronisasi penuh dengan database SQLite (/api/reports).
   Laporan yang dikirim warga langsung tersimpan di backend dan tampil di halaman Admin;
   pembaruan status & catatan tindak lanjut petugas dari Admin langsung muncul di sini. */

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  MapPin,
  Megaphone,
  MessageSquareText,
  Paperclip,
  Send,
} from "lucide-react";
import type { LaporStatus } from "@/lib/bluetech-data";
import { JENIS_LAPOR_PUBLIK } from "@/lib/bluetech-data";
import { LOKASI_LOSARI } from "@/lib/losari-data";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface LaporanWarga {
  id: string;
  code: string;
  reporterName: string;
  category: string;
  location: string;
  description: string;
  photoName: string | null;
  status: LaporStatus;
  adminNote: string | null;
  createdAt: string;
}

const STATUS_CFG: Record<LaporStatus, { label: string; cls: string; icon: React.ElementType }> = {
  diterima: { label: "Diterima", cls: "bg-ocean-500/12 text-ocean-600 dark:text-ocean-200", icon: FileText },
  diproses: { label: "Diproses", cls: "bg-warning/12 text-warning", icon: Loader2 },
  selesai: { label: "Selesai", cls: "bg-reef-500/12 text-reef-600 dark:text-reef-200", icon: CheckCircle2 },
};

function StatusLapor({ status }: { status: LaporStatus }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.diterima;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex h-7.5 items-center gap-1.5 rounded-xl px-2.5 text-[11.5px] font-semibold", cfg.cls)}>
      <Icon className={cn("size-3.5", status === "diproses" && "animate-spin")} />
      {cfg.label}
    </span>
  );
}

function formatWaktu(iso: string): string {
  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function PublicLapor() {
  const { toast } = useToast();
  const [laporan, setLaporan] = useState<LaporanWarga[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [nama, setNama] = useState("");
  const [jenis, setJenis] = useState(JENIS_LAPOR_PUBLIK[0]);
  const [lokasi, setLokasi] = useState(LOKASI_LOSARI[0]);
  const [deskripsi, setDeskripsi] = useState("");
  const [fotoNama, setFotoNama] = useState<string | null>(null);
  const [mengirim, setMengirim] = useState(false);

  const muatLaporan = useCallback(async () => {
    try {
      const res = await fetch("/api/reports", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.items)) setLaporan(data.items);
      }
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    muatLaporan();
  }, [muatLaporan]);

  const submit = async () => {
    if (!nama.trim() || !deskripsi.trim()) {
      toast({
        title: "Formulir belum lengkap",
        description: "Mohon isi nama Anda dan uraian kondisi pesisir yang ditemukan.",
      });
      return;
    }
    setMengirim(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporterName: nama.trim(),
          category: jenis,
          location: lokasi,
          description: deskripsi.trim(),
          photoName: fotoNama,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "Gagal mengirim laporan",
          description: data?.error || "Terjadi kesalahan saat menyimpan ke server.",
        });
        return;
      }
      if (data?.item) {
        setLaporan((prev) => [data.item, ...prev]);
      }
      setNama("");
      setDeskripsi("");
      setFotoNama(null);
      toast({
        title: "Laporan tersimpan",
        description: `Nomor laporan ${data?.item?.code ?? ""} berhasil masuk ke sistem dan siap ditinjau Admin.`,
      });
    } catch {
      toast({
        title: "Koneksi gagal",
        description: "Tidak dapat menghubungi server saat mengirim laporan.",
      });
    } finally {
      setMengirim(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
      {/* Formulir */}
      <div className="pub-card rounded-2xl p-5 md:p-6">
        <h3 className="flex items-center gap-2 text-[15.5px] font-bold text-foreground">
          <Megaphone className="size-4.5 text-reef-500" />
          Formulir Laporan Warga
        </h3>

        <div className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-foreground">Nama Pelapor</span>
            <input
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: Pak Rudi (warga Losari)"
              className="pub-input h-11 rounded-xl px-3.5 text-[13.5px] outline-none"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-foreground">Jenis Kejadian</span>
              <select
                value={jenis}
                onChange={(e) => setJenis(e.target.value)}
                className="pub-input h-11 rounded-xl px-3 text-[13.5px] outline-none"
              >
                {JENIS_LAPOR_PUBLIK.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-foreground">Lokasi (Pantai Losari)</span>
              <select
                value={lokasi}
                onChange={(e) => setLokasi(e.target.value)}
                className="pub-input h-11 rounded-xl px-3 text-[13.5px] outline-none"
              >
                {LOKASI_LOSARI.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-foreground">Uraian Kondisi</span>
            <textarea
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              rows={4}
              placeholder="Jelaskan kondisi yang ditemui di lapangan (ketinggian air, lokasi spesifik, perkiraan waktu kejadian)..."
              className="pub-input rounded-xl px-3.5 py-3 text-[13.5px] outline-none"
            />
          </label>

          <div className="rounded-xl border border-dashed border-reef-500/40 bg-reef-500/5 p-3.5">
            <label className="flex cursor-pointer items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-reef-500/12 text-reef-600 dark:text-reef-200">
                <Paperclip className="size-4.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-foreground">
                  {fotoNama ?? "Lampirkan nama foto lapangan (opsional)"}
                </span>
                <span className="block text-[11.5px] text-muted-foreground">
                  Dokumentasi membantu petugas menilai kondisi lebih cepat.
                </span>
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFotoNama(e.target.files?.[0]?.name ?? null)}
              />
            </label>
          </div>

          <Button
            type="button"
            disabled={mengirim}
            onClick={submit}
            className="pub-btn-masyarakat h-11 gap-2 rounded-xl text-[14px] font-semibold text-white"
          >
            {mengirim ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {mengirim ? "Menyimpan..." : "Kirim Laporan"}
          </Button>
        </div>
      </div>

      {/* Daftar laporan tersinkronisasi dari database */}
      <div className="pub-card rounded-2xl p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-[15.5px] font-bold text-foreground">
            <FileText className="size-4.5 text-ocean-500" />
            Daftar Laporan Warga
          </h3>
          <span className="rounded-full bg-secondary px-2.5 py-1 text-[11.5px] font-semibold text-muted-foreground">
            {laporan.length} laporan
          </span>
        </div>

        {memuat ? (
          <p className="py-10 text-center text-[13px] text-muted-foreground">
            Memuat daftar laporan warga...
          </p>
        ) : laporan.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-muted-foreground">
            Belum ada laporan warga yang tercatat.
          </p>
        ) : (
          <ul className="mt-4 flex max-h-[450px] flex-col gap-3.5 overflow-y-auto pr-1">
            {laporan.map((l) => (
              <li key={l.id} className="pub-row rounded-xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13.5px] font-bold text-foreground">
                    {l.category} <span className="font-normal text-muted-foreground">· {l.code}</span>
                  </p>
                  <StatusLapor status={l.status} />
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-foreground/85">{l.description}</p>
                {l.adminNote ? (
                  <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-reef-500/10 px-3 py-2 text-[12px] leading-relaxed text-reef-700 dark:text-reef-200">
                    <MessageSquareText className="mt-0.5 size-3.5 shrink-0" />
                    <span>
                      <b>Tindak lanjut petugas:</b> {l.adminNote}
                    </span>
                  </p>
                ) : null}
                <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3" /> {l.location}
                  </span>
                  <span>· {l.reporterName}</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" /> {formatWaktu(l.createdAt)}
                  </span>
                  {l.photoName ? <span>· Foto: {l.photoName}</span> : null}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
