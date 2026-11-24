"use client";

/* Halaman Manajemen Data — CRUD penuh katalog dataset spasial Kawasan Pantai Losari
   tersimpan di SQLite (/api/datasets). Perubahan nama, deskripsi, status validasi,
   dan toggle "Tampil Publik" langsung tersinkronisasi ke menu Peta Interaktif publik. */

import { useCallback, useEffect, useState } from "react";
import {
  Database,
  Download,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Card, PageHeader, StatusBadge } from "./page-ui";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { downloadBlob } from "@/lib/analysis-engine";

export interface SpatialDatasetRow {
  id: string;
  slug: string;
  name: string;
  category: string;
  dataType: string;
  format: string;
  source: string;
  crs: string;
  coverage: string;
  fileSize: string;
  description: string;
  note: string | null;
  publicUrl: string | null;
  validationStatus: string;
  visiblePublic: boolean;
  defaultOn: boolean;
  updatedAt: string;
}

const KATEGORI_LIST = ["Kebencanaan", "Pariwisata", "Infrastruktur", "Pasang Surut", "Lainnya"];
const TIPE_LIST = ["Raster", "Vektor", "Parameter"];
const FORMAT_LIST = ["GeoTIFF", "GeoJSON", "CSV", "Shapefile (ZIP)", "GeoPackage"];
const VALIDASI_LIST = ["Tervalidasi", "Menunggu", "Perlu Cek"];

interface FormState {
  name: string;
  category: string;
  dataType: string;
  format: string;
  source: string;
  crs: string;
  coverage: string;
  fileSize: string;
  description: string;
  note: string;
  publicUrl: string;
  validationStatus: string;
  visiblePublic: boolean;
  defaultOn: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  category: "Kebencanaan",
  dataType: "Raster",
  format: "GeoTIFF",
  source: "inaRISK / BIG / OSM / BMKG",
  crs: "EPSG:4326 (WGS 84)",
  coverage: "Kawasan Pantai Losari",
  fileSize: "—",
  description: "",
  note: "",
  publicUrl: "",
  validationStatus: "Tervalidasi",
  visiblePublic: true,
  defaultOn: false,
};

export function ManajemenDataView() {
  const { toast } = useToast();
  const [datasets, setDatasets] = useState<SpatialDatasetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterTipe, setFilterTipe] = useState("Semua");
  const [query, setQuery] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [hapusTarget, setHapusTarget] = useState<SpatialDatasetRow | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/datasets", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        if (Array.isArray(d?.items)) setDatasets(d.items);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/datasets", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && Array.isArray(d?.items)) setDatasets(d.items);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (d: SpatialDatasetRow) => {
    setEditingId(d.id);
    setForm({
      name: d.name,
      category: d.category,
      dataType: d.dataType,
      format: d.format,
      source: d.source,
      crs: d.crs,
      coverage: d.coverage,
      fileSize: d.fileSize,
      description: d.description,
      note: d.note ?? "",
      publicUrl: d.publicUrl ?? "",
      validationStatus: d.validationStatus,
      visiblePublic: d.visiblePublic,
      defaultOn: d.defaultOn,
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Nama dataset wajib diisi" });
      return;
    }
    setSaving(true);
    try {
      const url = editingId ? `/api/datasets/${editingId}` : "/api/datasets";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: "Gagal menyimpan", description: data?.error || "Periksa sesi login Admin." });
        return;
      }
      toast({
        title: editingId ? "Dataset diperbarui" : "Dataset ditambahkan",
        description: `"${data.item?.name}" tersimpan dan disinkronkan ke halaman publik.`,
      });
      setDialogOpen(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const togglePublic = async (d: SpatialDatasetRow, next: boolean) => {
    setDatasets((prev) => prev.map((x) => (x.id === d.id ? { ...x, visiblePublic: next } : x)));
    const res = await fetch(`/api/datasets/${d.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visiblePublic: next }),
    });
    if (!res.ok) {
      await loadData();
      toast({ title: "Gagal mengubah status tampil publik" });
      return;
    }
    toast({
      title: next ? "Layer diaktifkan di publik" : "Layer disembunyikan dari publik",
      description: `"${d.name}" ${next ? "kini tampil" : "disembunyikan"} di Peta Interaktif.`,
    });
  };

  const confirmDelete = async () => {
    if (!hapusTarget) return;
    const res = await fetch(`/api/datasets/${hapusTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      setDatasets((prev) => prev.filter((x) => x.id !== hapusTarget.id));
      toast({ title: "Dataset dihapus", description: `"${hapusTarget.name}" telah dihapus.` });
    } else {
      toast({ title: "Gagal menghapus dataset" });
    }
    setHapusTarget(null);
  };

  const exportCsv = () => {
    const header = "Slug,Nama,Kategori,Tipe,Format,Sumber,CRS,Cakupan,Ukuran,Validasi,TampilPublik";
    const rows = datasets.map((d) =>
      [
        d.slug,
        `"${d.name.replace(/"/g, '""')}"`,
        d.category,
        d.dataType,
        d.format,
        `"${d.source.replace(/"/g, '""')}"`,
        `"${d.crs}"`,
        `"${d.coverage}"`,
        `"${d.fileSize}"`,
        d.validationStatus,
        d.visiblePublic ? "Ya" : "Tidak",
      ].join(","),
    );
    downloadBlob("katalog-dataset-losari.csv", [header, ...rows].join("\n"), "text/csv;charset=utf-8");
  };

  const filtered = datasets.filter(
    (d) =>
      (filterTipe === "Semua" || d.dataType === filterTipe) &&
      (d.name.toLowerCase().includes(query.trim().toLowerCase()) ||
        d.category.toLowerCase().includes(query.trim().toLowerCase()) ||
        d.source.toLowerCase().includes(query.trim().toLowerCase())),
  );

  const inputCls =
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-primary";

  return (
    <div className="flex flex-col gap-5 p-5 pb-10 md:p-6">
      <PageHeader
        icon={Database}
        title="Manajemen Data & Layer Spasial"
        subtitle="Kelola 12 dataset asli Kawasan Pantai Losari dan tambahkan katalog data baru — tersinkronisasi ke Peta Interaktif publik"
        action={
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={exportCsv} className="gap-1.5 rounded-xl">
              <Download className="size-3.5" /> Ekspor CSV
            </Button>
            <Button type="button" size="sm" onClick={openCreate} className="gap-1.5 rounded-xl">
              <Plus className="size-4" /> Tambah Dataset
            </Button>
          </div>
        }
      />

      {/* Ringkasan cepat */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        {[
          { label: "Total Dataset", val: datasets.length },
          { label: "Layer Raster", val: datasets.filter((d) => d.dataType === "Raster").length },
          { label: "Tampil di Publik", val: datasets.filter((d) => d.visiblePublic).length },
          { label: "Perlu Verifikasi", val: datasets.filter((d) => d.validationStatus !== "Tervalidasi").length },
        ].map((s) => (
          <div key={s.label} className="card-marine p-4">
            <p className="text-[12px] text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-[22px] font-bold text-foreground tabular-nums">{s.val}</p>
          </div>
        ))}
      </div>

      {/* Filter + Tabel CRUD */}
      <Card title="Daftar Dataset Spasial & Parameter">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {["Semua", ...TIPE_LIST].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterTipe(t)}
                className={`rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                  filterTipe === t
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama, kategori, sumber..."
              className="h-9 w-full rounded-lg border border-border bg-background pr-3 pl-8.5 text-[12.5px] outline-none focus:border-primary"
            />
          </div>
        </div>

        {loading ? (
          <p className="py-10 text-center text-[13px] text-muted-foreground">Memuat katalog dataset...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-border text-[11.5px] text-muted-foreground">
                  <th className="py-2 pr-3 font-semibold">Nama Dataset</th>
                  <th className="py-2 pr-3 font-semibold">Tipe / Format</th>
                  <th className="py-2 pr-3 font-semibold">CRS &amp; Ukuran</th>
                  <th className="py-2 pr-3 font-semibold">Validasi</th>
                  <th className="py-2 pr-3 font-semibold">Tampil Publik</th>
                  <th className="py-2 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-secondary/35">
                    <td className="py-3 pr-3">
                      <p className="font-semibold text-foreground">{d.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {d.category} · {d.source}
                      </p>
                      {d.note ? (
                        <p className="mt-0.5 text-[10.5px] text-warning">{d.note}</p>
                      ) : null}
                    </td>
                    <td className="py-3 pr-3">
                      <span className="font-semibold text-foreground">{d.dataType}</span>
                      <p className="text-[11px] text-muted-foreground">{d.format}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <p className="font-mono text-[11px] text-foreground">{d.crs}</p>
                      <p className="text-[11px] text-muted-foreground">{d.fileSize}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <StatusBadge status={d.validationStatus} />
                    </td>
                    <td className="py-3 pr-3">
                      <Switch
                        checked={d.visiblePublic}
                        onCheckedChange={(v) => togglePublic(d, v)}
                        aria-label={`Toggle publik untuk ${d.name}`}
                      />
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(d)}
                          title="Ubah dataset"
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setHapusTarget(d)}
                          title="Hapus dataset"
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
        )}
      </Card>

      {/* Dialog Tambah / Edit Dataset */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Metadata Dataset" : "Tambah Dataset Spasial Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="flex flex-col gap-3.5">
            <div>
              <label className="mb-1 block text-[12.5px] font-semibold">Nama Dataset</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Contoh: Indeks Bahaya Abrasi 2026"
                className={inputCls}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[12px] font-semibold">Kategori</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className={inputCls}
                >
                  {KATEGORI_LIST.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-semibold">Tipe Data</label>
                <select
                  value={form.dataType}
                  onChange={(e) => setForm((f) => ({ ...f, dataType: e.target.value }))}
                  className={inputCls}
                >
                  {TIPE_LIST.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-semibold">Format</label>
                <select
                  value={form.format}
                  onChange={(e) => setForm((f) => ({ ...f, format: e.target.value }))}
                  className={inputCls}
                >
                  {FORMAT_LIST.map((fmt) => (
                    <option key={fmt} value={fmt}>{fmt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[12px] font-semibold">Sumber Data</label>
                <input
                  value={form.source}
                  onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-semibold">Sistem Koordinat (CRS)</label>
                <input
                  value={form.crs}
                  onChange={(e) => setForm((f) => ({ ...f, crs: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[12px] font-semibold">Ukuran File</label>
                <input
                  value={form.fileSize}
                  onChange={(e) => setForm((f) => ({ ...f, fileSize: e.target.value }))}
                  placeholder="Contoh: 120 KB"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-semibold">Status Validasi</label>
                <select
                  value={form.validationStatus}
                  onChange={(e) => setForm((f) => ({ ...f, validationStatus: e.target.value }))}
                  className={inputCls}
                >
                  {VALIDASI_LIST.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-semibold">Deskripsi</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background p-3 text-[13px] outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-semibold">Catatan Tambahan (opsional)</label>
              <input
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="Misalnya catatan akurasi atau anomali file"
                className={inputCls}
              />
            </div>

            <div className="flex flex-wrap items-center gap-6 rounded-xl bg-secondary/50 p-3">
              <label className="flex items-center gap-2 text-[12.5px] font-medium">
                <Switch
                  checked={form.visiblePublic}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, visiblePublic: v }))}
                />
                Tampil di halaman publik
              </label>
              <label className="flex items-center gap-2 text-[12.5px] font-medium">
                <Switch
                  checked={form.defaultOn}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, defaultOn: v }))}
                />
                Aktif otomatis saat peta dibuka
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Hapus */}
      <Dialog open={!!hapusTarget} onOpenChange={(o) => !o && setHapusTarget(null)}>
        <DialogContent className="rounded-2xl sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Hapus Dataset?</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Dataset <b className="text-foreground">{hapusTarget?.name}</b> akan dihapus dari
            katalog database. File mentah di folder <code className="text-[12px]">data/</code> tidak
            ikut terhapus.
          </p>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setHapusTarget(null)}>
              Batal
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete}>
              Hapus
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
