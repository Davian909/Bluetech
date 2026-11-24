"use client";

/* Menu Admin: Mitigasi & Laporan Warga (Kawasan Pantai Losari)
   - Peta zona mitigasi nyata (zona_mitigasi.geojson)
   - CRUD penuh Laporan Masyarakat (/api/reports) — sinkron 2 arah ke PublicLapor
   - CRUD penuh Program Aksi Mitigasi (/api/mitigation-actions) */

import { useCallback, useEffect, useState } from "react";
import type L from "leaflet";
import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  Siren,
  Trash2,
} from "lucide-react";
import { Card, PageHeader, StatusBadge } from "./page-ui";
import { LosariMapNoSsr } from "./losari-map-loader";
import { fetchZonaMitigasi, LOKASI_LOSARI } from "@/lib/losari-data";
import { JENIS_LAPOR_PUBLIK } from "@/lib/bluetech-data";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ReportRow {
  id: string;
  code: string;
  reporterName: string;
  category: string;
  location: string;
  description: string;
  photoName: string | null;
  status: "diterima" | "diproses" | "selesai";
  adminNote: string | null;
  createdAt: string;
}

interface ActionRow {
  id: string;
  title: string;
  hazardType: string;
  location: string;
  priority: string;
  status: string;
  progress: number;
  notes: string | null;
}

const HAZARD_TYPES = [
  "Banjir",
  "Gelombang Ekstrem & Abrasi",
  "Cuaca Ekstrem",
  "Gempa Bumi",
  "Banjir Rob",
  "Sempadan Pantai",
];

const STATUS_LABEL: Record<string, string> = {
  diterima: "Diterima",
  diproses: "Diproses",
  selesai: "Selesai",
};

export function MitigasiBencanaView() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"laporan" | "program">("laporan");
  const [zonaGeo, setZonaGeo] = useState<GeoJSON.FeatureCollection | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("semua");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog Edit / Tambah Laporan Warga
  const [repDialog, setRepDialog] = useState(false);
  const [repEditId, setRepEditId] = useState<string | null>(null);
  const [repForm, setRepForm] = useState({
    reporterName: "",
    category: JENIS_LAPOR_PUBLIK[0],
    location: LOKASI_LOSARI[0],
    description: "",
    status: "diterima" as "diterima" | "diproses" | "selesai",
    adminNote: "",
  });

  // Dialog Edit / Tambah Aksi Mitigasi
  const [actDialog, setActDialog] = useState(false);
  const [actEditId, setActEditId] = useState<string | null>(null);
  const [actForm, setActForm] = useState({
    title: "",
    hazardType: HAZARD_TYPES[0],
    location: LOKASI_LOSARI[0],
    priority: "Tinggi",
    status: "Direncanakan",
    progress: 0,
    notes: "",
  });

  const loadAll = useCallback(async () => {
    try {
      const [z, repRes, actRes] = await Promise.all([
        fetchZonaMitigasi(),
        fetch("/api/reports", { cache: "no-store" }),
        fetch("/api/mitigation-actions", { cache: "no-store" }),
      ]);
      setZonaGeo(z);
      if (repRes.ok) {
        const d = await repRes.json();
        if (Array.isArray(d?.items)) setReports(d.items);
      }
      if (actRes.ok) {
        const d = await actRes.json();
        if (Array.isArray(d?.items)) setActions(d.items);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchZonaMitigasi(),
      fetch("/api/reports", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/mitigation-actions", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([z, repD, actD]) => {
        if (!active) return;
        setZonaGeo(z);
        if (Array.isArray(repD?.items)) setReports(repD.items);
        if (Array.isArray(actD?.items)) setActions(actD.items);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const geoStyle = useCallback((feature?: GeoJSON.Feature): L.PathOptions => {
    const warna = (feature?.properties?.warna as string) || "#0284c7";
    return { color: warna, fillColor: warna, weight: 1.6, opacity: 0.95, fillOpacity: 0.45 };
  }, []);

  /* ---- Handler CRUD Laporan Warga ---- */
  const openCreateReport = () => {
    setRepEditId(null);
    setRepForm({
      reporterName: "",
      category: JENIS_LAPOR_PUBLIK[0],
      location: LOKASI_LOSARI[0],
      description: "",
      status: "diterima",
      adminNote: "",
    });
    setRepDialog(true);
  };

  const openEditReport = (r: ReportRow) => {
    setRepEditId(r.id);
    setRepForm({
      reporterName: r.reporterName,
      category: r.category,
      location: r.location,
      description: r.description,
      status: r.status,
      adminNote: r.adminNote ?? "",
    });
    setRepDialog(true);
  };

  const saveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = repEditId ? `/api/reports/${repEditId}` : "/api/reports";
      const method = repEditId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(repForm),
      });
      if (!res.ok) {
        toast({ title: "Gagal menyimpan laporan" });
        return;
      }
      toast({
        title: repEditId ? "Laporan warga diperbarui" : "Laporan warga dicatat",
        description: "Status & catatan petugas langsung tersinkron ke halaman publik.",
      });
      setRepDialog(false);
      await loadAll();
    } finally {
      setSaving(false);
    }
  };

  const quickStatusReport = async (r: ReportRow, status: ReportRow["status"]) => {
    setReports((prev) => prev.map((x) => (x.id === r.id ? { ...x, status } : x)));
    const res = await fetch(`/api/reports/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      await loadAll();
      toast({ title: "Gagal mengubah status" });
    } else {
      toast({ title: `Status ${r.code} diubah ke ${STATUS_LABEL[status]}` });
    }
  };

  const deleteReport = async (r: ReportRow) => {
    const res = await fetch(`/api/reports/${r.id}`, { method: "DELETE" });
    if (res.ok) {
      setReports((prev) => prev.filter((x) => x.id !== r.id));
      toast({ title: `Laporan ${r.code} dihapus` });
    }
  };

  /* ---- Handler CRUD Aksi Mitigasi ---- */
  const openCreateAction = () => {
    setActEditId(null);
    setActForm({
      title: "",
      hazardType: HAZARD_TYPES[0],
      location: LOKASI_LOSARI[0],
      priority: "Tinggi",
      status: "Direncanakan",
      progress: 0,
      notes: "",
    });
    setActDialog(true);
  };

  const openEditAction = (a: ActionRow) => {
    setActEditId(a.id);
    setActForm({
      title: a.title,
      hazardType: a.hazardType,
      location: a.location,
      priority: a.priority,
      status: a.status,
      progress: a.progress,
      notes: a.notes ?? "",
    });
    setActDialog(true);
  };

  const saveAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = actEditId ? `/api/mitigation-actions/${actEditId}` : "/api/mitigation-actions";
      const method = actEditId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(actForm),
      });
      if (!res.ok) {
        toast({ title: "Gagal menyimpan program mitigasi" });
        return;
      }
      toast({ title: actEditId ? "Program mitigasi diperbarui" : "Program mitigasi ditambahkan" });
      setActDialog(false);
      await loadAll();
    } finally {
      setSaving(false);
    }
  };

  const deleteAction = async (a: ActionRow) => {
    const res = await fetch(`/api/mitigation-actions/${a.id}`, { method: "DELETE" });
    if (res.ok) {
      setActions((prev) => prev.filter((x) => x.id !== a.id));
      toast({ title: "Program mitigasi dihapus" });
    }
  };

  const filteredReports =
    filterStatus === "semua" ? reports : reports.filter((r) => r.status === filterStatus);

  const inputCls =
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-primary";

  return (
    <div className="flex flex-col gap-5 p-5 pb-10 md:p-6">
      <PageHeader
        icon={Siren}
        title="Mitigasi Bencana & Laporan Warga"
        subtitle="Kelola tindak lanjut laporan masyarakat (sinkron langsung ke publik) serta rencana aksi mitigasi Kawasan Pantai Losari"
      />

      {/* Peta Zona Mitigasi */}
      <Card title="Peta Zona Mitigasi & Sempadan Pantai (Losari)">
        <LosariMapNoSsr
          height="360px"
          geojson={zonaGeo}
          geojsonKey="admin-zona-mitigasi"
          geojsonStyle={geoStyle}
        />
      </Card>

      {/* Switcher Tab */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setTab("laporan")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-colors",
              tab === "laporan"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Megaphone className="size-4" />
            Laporan Warga ({reports.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("program")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-colors",
              tab === "program"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <ClipboardList className="size-4" />
            Program Aksi Mitigasi ({actions.length})
          </button>
        </div>

        {tab === "laporan" ? (
          <Button type="button" size="sm" onClick={openCreateReport} className="gap-1.5 rounded-xl">
            <Plus className="size-4" /> Catat Laporan Baru
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={openCreateAction} className="gap-1.5 rounded-xl">
            <Plus className="size-4" /> Tambah Program Aksi
          </Button>
        )}
      </div>

      {/* TAB 1: CRUD LAPORAN WARGA */}
      {tab === "laporan" ? (
        <Card
          title="Daftar Laporan Masyarakat"
          action={
            <div className="flex gap-1.5">
              {(["semua", "diterima", "diproses", "selesai"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1 text-[11.5px] font-semibold capitalize",
                    filterStatus === st
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  {st}
                </button>
              ))}
            </div>
          }
        >
          {loading ? (
            <p className="py-8 text-center text-[13px] text-muted-foreground">Memuat laporan...</p>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredReports.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border/70 bg-secondary/25 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[12px] font-bold text-primary">{r.code}</span>
                      <span className="text-[14px] font-bold text-foreground">{r.category}</span>
                      <StatusBadge status={STATUS_LABEL[r.status] ?? r.status} />
                    </div>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      Pelapor: <b className="text-foreground">{r.reporterName}</b> · Lokasi:{" "}
                      <b className="text-foreground">{r.location}</b>
                    </p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/90">
                      {r.description}
                    </p>
                    {r.adminNote ? (
                      <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-reef-500/10 px-2.5 py-1 text-[11.5px] text-reef-700 dark:text-reef-200">
                        <CheckCircle2 className="size-3.5 shrink-0" />
                        Catatan petugas: {r.adminNote}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={r.status}
                      onChange={(e) => quickStatusReport(r, e.target.value as ReportRow["status"])}
                      aria-label={`Ubah status ${r.code}`}
                      className="h-8.5 rounded-lg border border-border bg-card px-2 text-[12px] font-semibold outline-none"
                    >
                      <option value="diterima">Diterima</option>
                      <option value="diproses">Diproses</option>
                      <option value="selesai">Selesai</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => openEditReport(r)}
                      title="Edit & tambah catatan petugas"
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteReport(r)}
                      title="Hapus laporan"
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
              {filteredReports.length === 0 ? (
                <p className="py-8 text-center text-[13px] text-muted-foreground">
                  Tidak ada laporan untuk filter ini.
                </p>
              ) : null}
            </div>
          )}
        </Card>
      ) : (
        /* TAB 2: CRUD PROGRAM AKSI MITIGASI */
        <Card title="Daftar Program & Aksi Mitigasi Kawasan Pantai Losari">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[740px] border-collapse text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-border text-[11.5px] text-muted-foreground">
                  <th className="py-2 pr-3 font-semibold">Program Aksi</th>
                  <th className="py-2 pr-3 font-semibold">Ancaman &amp; Lokasi</th>
                  <th className="py-2 pr-3 font-semibold">Prioritas</th>
                  <th className="py-2 pr-3 font-semibold">Status &amp; Progres</th>
                  <th className="py-2 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {actions.map((a) => (
                  <tr key={a.id} className="hover:bg-secondary/35">
                    <td className="py-3 pr-3">
                      <p className="font-semibold text-foreground">{a.title}</p>
                      {a.notes ? <p className="text-[11px] text-muted-foreground">{a.notes}</p> : null}
                    </td>
                    <td className="py-3 pr-3">
                      <p className="font-medium text-foreground">{a.hazardType}</p>
                      <p className="text-[11px] text-muted-foreground">{a.location}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <StatusBadge status={a.priority} />
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={a.status} />
                        <span className="font-mono text-[11.5px] font-semibold text-foreground">
                          {a.progress}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditAction(a)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteAction(a)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Dialog Laporan Warga */}
      <Dialog open={repDialog} onOpenChange={setRepDialog}>
        <DialogContent className="rounded-2xl sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{repEditId ? "Tindak Lanjut & Edit Laporan" : "Catat Laporan Warga"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveReport} className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-[12px] font-semibold">Nama Pelapor</label>
              <input
                value={repForm.reporterName}
                onChange={(e) => setRepForm((f) => ({ ...f, reporterName: e.target.value }))}
                className={inputCls}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[12px] font-semibold">Jenis Kejadian</label>
                <select
                  value={repForm.category}
                  onChange={(e) => setRepForm((f) => ({ ...f, category: e.target.value }))}
                  className={inputCls}
                >
                  {JENIS_LAPOR_PUBLIK.map((j) => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-semibold">Lokasi</label>
                <select
                  value={repForm.location}
                  onChange={(e) => setRepForm((f) => ({ ...f, location: e.target.value }))}
                  className={inputCls}
                >
                  {LOKASI_LOSARI.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-semibold">Uraian Kondisi</label>
              <textarea
                rows={3}
                value={repForm.description}
                onChange={(e) => setRepForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background p-3 text-[13px] outline-none focus:border-primary"
                required
              />
            </div>
            {repEditId ? (
              <>
                <div>
                  <label className="mb-1 block text-[12px] font-semibold">Status Penanganan</label>
                  <select
                    value={repForm.status}
                    onChange={(e) =>
                      setRepForm((f) => ({ ...f, status: e.target.value as ReportRow["status"] }))
                    }
                    className={inputCls}
                  >
                    <option value="diterima">Diterima</option>
                    <option value="diproses">Diproses</option>
                    <option value="selesai">Selesai</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-semibold">
                    Catatan Tindak Lanjut Petugas (tampil di halaman publik)
                  </label>
                  <textarea
                    rows={2}
                    value={repForm.adminNote}
                    onChange={(e) => setRepForm((f) => ({ ...f, adminNote: e.target.value }))}
                    placeholder="Contoh: Tim lapangan sudah meninjau lokasi..."
                    className="w-full rounded-lg border border-border bg-background p-3 text-[13px] outline-none focus:border-primary"
                  />
                </div>
              </>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setRepDialog(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                Simpan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Aksi Mitigasi */}
      <Dialog open={actDialog} onOpenChange={setActDialog}>
        <DialogContent className="rounded-2xl sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{actEditId ? "Edit Program Mitigasi" : "Tambah Program Aksi Mitigasi"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveAction} className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-[12px] font-semibold">Nama Program / Aksi</label>
              <input
                value={actForm.title}
                onChange={(e) => setActForm((f) => ({ ...f, title: e.target.value }))}
                className={inputCls}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[12px] font-semibold">Jenis Ancaman</label>
                <select
                  value={actForm.hazardType}
                  onChange={(e) => setActForm((f) => ({ ...f, hazardType: e.target.value }))}
                  className={inputCls}
                >
                  {HAZARD_TYPES.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-semibold">Lokasi</label>
                <input
                  value={actForm.location}
                  onChange={(e) => setActForm((f) => ({ ...f, location: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-[12px] font-semibold">Prioritas</label>
                <select
                  value={actForm.priority}
                  onChange={(e) => setActForm((f) => ({ ...f, priority: e.target.value }))}
                  className={inputCls}
                >
                  <option value="Tinggi">Tinggi</option>
                  <option value="Sedang">Sedang</option>
                  <option value="Rendah">Rendah</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-semibold">Status</label>
                <select
                  value={actForm.status}
                  onChange={(e) => setActForm((f) => ({ ...f, status: e.target.value }))}
                  className={inputCls}
                >
                  <option value="Direncanakan">Direncanakan</option>
                  <option value="Berjalan">Berjalan</option>
                  <option value="Selesai">Selesai</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-semibold">Progres (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={actForm.progress}
                  onChange={(e) => setActForm((f) => ({ ...f, progress: Number(e.target.value) }))}
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-semibold">Catatan</label>
              <textarea
                rows={2}
                value={actForm.notes}
                onChange={(e) => setActForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background p-3 text-[13px] outline-none focus:border-primary"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setActDialog(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                Simpan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
