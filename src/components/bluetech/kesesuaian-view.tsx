"use client";

/* Menu Admin:
   - mode "wisata"   -> Kelola Zona & Titik Atraksi Wisata (CRUD penuh /api/attractions,
                        klik peta untuk memilih koordinat, langsung sinkron ke Publik)
   - mode "mitigasi" -> Kelola Materi Edukasi Mitigasi (CRUD penuh /api/education,
                        langsung sinkron ke halaman Edukasi Mitigasi Publik) */

import { useCallback, useEffect, useMemo, useState } from "react";
import type L from "leaflet";
import {
  BookOpenCheck,
  Compass,
  Crosshair,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Card, PageHeader, StatusBadge } from "./page-ui";
import { LosariMapNoSsr, type LosariPointMarker } from "./losari-map-loader";
import { fetchZonaWisata, LOSARI_CENTER } from "@/lib/losari-data";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

/* ==================== 1. CRUD ZONA & ATRAKSI WISATA ==================== */

interface AttractionRow {
  id: string;
  code: string | null;
  name: string;
  category: string;
  tourismType: string;
  zoneClass: string;
  description: string;
  operator: string | null;
  lat: number;
  lon: number;
  active: boolean;
}

const KATEGORI_ATRAKSI = [
  "Museum",
  "Patung / Monumen",
  "Karya Seni (Grafiti)",
  "Karya Seni (Patung)",
  "Wisata Pantai / Anjungan",
  "Wisata Kuliner Pesisir",
  "Ruang Publik Bahari",
];

function WisataCrudManager() {
  const { toast } = useToast();
  const [items, setItems] = useState<AttractionRow[]>([]);
  const [zonaGeo, setZonaGeo] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [pickMode, setPickMode] = useState(false);
  const [picked, setPicked] = useState<{ lat: number; lon: number } | null>(null);
  const [focus, setFocus] = useState<{ lat: number; lon: number; zoom?: number; seq: number } | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hapusTarget, setHapusTarget] = useState<AttractionRow | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "Wisata Pantai / Anjungan",
    tourismType: "attraction",
    zoneClass: "Tinggi",
    description: "",
    operator: "",
    lat: String(LOSARI_CENTER[0]),
    lon: String(LOSARI_CENTER[1]),
    active: true,
  });

  const loadAll = useCallback(async () => {
    try {
      const [z, res] = await Promise.all([
        fetchZonaWisata(),
        fetch("/api/attractions?all=1", { cache: "no-store" }),
      ]);
      setZonaGeo(z);
      if (res.ok) {
        const d = await res.json();
        if (Array.isArray(d?.items)) setItems(d.items);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchZonaWisata(),
      fetch("/api/attractions?all=1", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([z, d]) => {
        if (!active) return;
        setZonaGeo(z);
        if (Array.isArray(d?.items)) setItems(d.items);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const geojsonStyle = useCallback((feature?: GeoJSON.Feature): L.PathOptions => {
    const warna = (feature?.properties?.warna as string) || "#0ea5e9";
    return { color: warna, fillColor: warna, weight: 1.5, opacity: 0.9, fillOpacity: 0.35 };
  }, []);

  const markers = useMemo<LosariPointMarker[]>(
    () =>
      items.map((a) => ({
        id: a.id,
        lat: a.lat,
        lon: a.lon,
        title: a.active ? a.name : `${a.name} (Nonaktif)`,
        category: a.category,
        description: a.description,
        color: !a.active ? "#94a3b8" : a.tourismType === "museum" ? "#0f507a" : "#7c3aed",
        glyph: a.tourismType === "museum" ? "museum" : "art",
      })),
    [items],
  );

  const openCreate = (coords?: { lat: number; lon: number }) => {
    setEditingId(null);
    setForm({
      name: "",
      category: "Wisata Pantai / Anjungan",
      tourismType: "attraction",
      zoneClass: "Tinggi",
      description: "",
      operator: "",
      lat: String(coords?.lat ?? picked?.lat ?? LOSARI_CENTER[0]),
      lon: String(coords?.lon ?? picked?.lon ?? LOSARI_CENTER[1]),
      active: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (a: AttractionRow) => {
    setEditingId(a.id);
    setForm({
      name: a.name,
      category: a.category,
      tourismType: a.tourismType,
      zoneClass: a.zoneClass,
      description: a.description,
      operator: a.operator ?? "",
      lat: String(a.lat),
      lon: String(a.lon),
      active: a.active,
    });
    setDialogOpen(true);
  };

  const handleMapClick = useCallback(
    (lat: number, lon: number) => {
      if (!pickMode) return;
      setPicked({ lat, lon });
      setPickMode(false);
      toast({
        title: "Koordinat dipilih",
        description: `${lat.toFixed(5)}, ${lon.toFixed(5)} — formulir tambah titik dibuka.`,
      });
      setEditingId(null);
      setForm({
        name: "",
        category: "Wisata Pantai / Anjungan",
        tourismType: "attraction",
        zoneClass: "Tinggi",
        description: "",
        operator: "",
        lat: String(lat),
        lon: String(lon),
        active: true,
      });
      setDialogOpen(true);
    },
    [pickMode, toast],
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingId ? `/api/attractions/${editingId}` : "/api/attractions";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          lat: Number(form.lat),
          lon: Number(form.lon),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: "Gagal menyimpan", description: data?.error || "Periksa data input." });
        return;
      }
      toast({
        title: editingId ? "Titik wisata diperbarui" : "Titik wisata ditambahkan",
        description: `"${data.item?.name}" langsung tersinkron ke peta Zona Potensial Wisata publik.`,
      });
      setPicked(null);
      setDialogOpen(false);
      await loadAll();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (a: AttractionRow, next: boolean) => {
    setItems((prev) => prev.map((x) => (x.id === a.id ? { ...x, active: next } : x)));
    const res = await fetch(`/api/attractions/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: next }),
    });
    if (!res.ok) {
      await loadDataFallback();
      toast({ title: "Gagal mengubah status titik" });
      return;
    }
    toast({
      title: next ? "Titik diaktifkan" : "Titik disembunyikan",
      description: `"${a.name}" ${next ? "tampil" : "disembunyikan"} di peta publik.`,
    });
  };

  const loadDataFallback = () => loadAll();

  const confirmDelete = async () => {
    if (!hapusTarget) return;
    const res = await fetch(`/api/attractions/${hapusTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((x) => x.id !== hapusTarget.id));
      toast({ title: "Titik wisata dihapus", description: `"${hapusTarget.name}" telah dihapus.` });
    } else {
      toast({ title: "Gagal menghapus titik wisata" });
    }
    setHapusTarget(null);
  };

  const filtered = items.filter(
    (a) =>
      a.name.toLowerCase().includes(query.trim().toLowerCase()) ||
      a.category.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const inputCls =
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-primary";

  return (
    <div className="flex flex-col gap-5 p-5 pb-10 md:p-6">
      <PageHeader
        icon={Compass}
        title="Zona & Titik Atraksi Wisata"
        subtitle="Kelola titik wisata Kawasan Pantai Losari (tambah, ubah, hapus) — perubahan langsung tampil di halaman publik"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={pickMode ? "default" : "secondary"}
              size="sm"
              onClick={() => setPickMode((v) => !v)}
              className="gap-1.5 rounded-xl"
            >
              <Crosshair className="size-4" />
              {pickMode ? "Klik Lokasi di Peta..." : "Pilih Titik di Peta"}
            </Button>
            <Button type="button" size="sm" onClick={() => openCreate()} className="gap-1.5 rounded-xl">
              <Plus className="size-4" /> Tambah Titik
            </Button>
          </div>
        }
      />

      <Card title="Peta Zona Potensial & Sebaran Titik Wisata (Losari)">
        {pickMode ? (
          <p className="mb-3 rounded-xl border border-primary/40 bg-primary/10 px-3.5 py-2 text-[12.5px] font-medium text-primary">
            Mode pilih koordinat aktif: klik langsung titik mana saja di peta Kawasan Pantai Losari
            untuk menambah titik atraksi baru.
          </p>
        ) : null}
        <LosariMapNoSsr
          height="420px"
          geojson={zonaGeo}
          geojsonKey="admin-zona-wisata"
          geojsonStyle={geojsonStyle}
          markers={markers}
          focus={focus}
          onMapClick={handleMapClick}
          pickedPoint={picked}
        />
      </Card>

      <Card
        title={`Daftar Titik Atraksi (${items.length})`}
        action={
          <div className="relative w-56">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama/kategori..."
              className="h-8.5 w-full rounded-lg border border-border bg-background pr-3 pl-8 text-[12px] outline-none focus:border-primary"
            />
          </div>
        }
      >
        {loading ? (
          <p className="py-8 text-center text-[13px] text-muted-foreground">Memuat data atraksi...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-border text-[11.5px] text-muted-foreground">
                  <th className="py-2 pr-3 font-semibold">Nama &amp; Deskripsi</th>
                  <th className="py-2 pr-3 font-semibold">Kategori / Zona</th>
                  <th className="py-2 pr-3 font-semibold">Koordinat (WGS 84)</th>
                  <th className="py-2 pr-3 font-semibold">Tampil Publik</th>
                  <th className="py-2 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-secondary/35">
                    <td className="py-3 pr-3">
                      <p className="font-semibold text-foreground">{a.name}</p>
                      <p className="line-clamp-1 max-w-md text-[11.5px] text-muted-foreground">
                        {a.description}
                      </p>
                    </td>
                    <td className="py-3 pr-3">
                      <p className="font-medium text-foreground">{a.category}</p>
                      <StatusBadge status={a.zoneClass} />
                    </td>
                    <td className="py-3 pr-3 font-mono text-[11px] text-muted-foreground">
                      {a.lat.toFixed(5)}, {a.lon.toFixed(5)}
                    </td>
                    <td className="py-3 pr-3">
                      <Switch checked={a.active} onCheckedChange={(v) => toggleActive(a, v)} />
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setFocus({ lat: a.lat, lon: a.lon, zoom: 16, seq: Date.now() })}
                          title="Fokus di peta"
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary"
                        >
                          <MapPin className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(a)}
                          title="Ubah titik"
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setHapusTarget(a)}
                          title="Hapus titik"
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

      {/* Dialog Tambah / Edit Atraksi */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Titik Atraksi Wisata" : "Tambah Titik Atraksi Wisata"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="flex flex-col gap-3.5">
            <div>
              <label className="mb-1 block text-[12px] font-semibold">Nama Lokasi / Atraksi</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Contoh: Anjungan Bugis Makassar"
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
                  {KATEGORI_ATRAKSI.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-semibold">Ikon Peta</label>
                <select
                  value={form.tourismType}
                  onChange={(e) => setForm((f) => ({ ...f, tourismType: e.target.value }))}
                  className={inputCls}
                >
                  <option value="museum">Museum</option>
                  <option value="artwork">Karya Seni / Patung</option>
                  <option value="attraction">Atraksi Umum</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-semibold">Kelas Zona</label>
                <select
                  value={form.zoneClass}
                  onChange={(e) => setForm((f) => ({ ...f, zoneClass: e.target.value }))}
                  className={inputCls}
                >
                  <option value="Tinggi">Tinggi</option>
                  <option value="Sedang">Sedang</option>
                  <option value="Rendah">Rendah</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[12px] font-semibold">Lintang (Latitude)</label>
                <input
                  type="number"
                  step="any"
                  value={form.lat}
                  onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-semibold">Bujur (Longitude)</label>
                <input
                  type="number"
                  step="any"
                  value={form.lon}
                  onChange={(e) => setForm((f) => ({ ...f, lon: e.target.value }))}
                  className={inputCls}
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-semibold">Pengelola / Sumber (opsional)</label>
              <input
                value={form.operator}
                onChange={(e) => setForm((f) => ({ ...f, operator: e.target.value }))}
                placeholder="Contoh: Dinas Pariwisata Kota Makassar"
                className={inputCls}
              />
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-semibold">Deskripsi</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Uraian singkat daya tarik wisata..."
                className="w-full rounded-lg border border-border bg-background p-3 text-[13px] outline-none focus:border-primary"
                required
              />
            </div>

            <label className="flex items-center gap-2 text-[12.5px] font-medium">
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
              />
              Tampilkan di halaman publik Zona Potensial Wisata
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
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

      {/* Dialog Hapus */}
      <Dialog open={!!hapusTarget} onOpenChange={(o) => !o && setHapusTarget(null)}>
        <DialogContent className="rounded-2xl sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Hapus Titik Atraksi?</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-muted-foreground">
            Titik <b className="text-foreground">{hapusTarget?.name}</b> akan dihapus dari database
            dan tidak lagi tampil di peta publik.
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

/* ==================== 2. CRUD MATERI EDUKASI MITIGASI ==================== */

interface EducationRow {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string;
  contextLosari: string;
  steps: string[];
  sortOrder: number;
  published: boolean;
}

function EdukasiCrudManager() {
  const { toast } = useToast();
  const [items, setItems] = useState<EducationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hapusTarget, setHapusTarget] = useState<EducationRow | null>(null);

  const [form, setForm] = useState({
    title: "",
    category: "Data Olahan",
    summary: "",
    contextLosari: "",
    stepsText: "",
    published: true,
  });

  const loadAll = useCallback(async () => {
    try {
      const res = await fetch("/api/education?all=1", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        if (Array.isArray(d?.items)) setItems(d.items);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/education?all=1", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && Array.isArray(d?.items)) setItems(d.items);
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
    setForm({
      title: "",
      category: "Data Olahan",
      summary: "",
      contextLosari: "",
      stepsText: "",
      published: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (m: EducationRow) => {
    setEditingId(m.id);
    setForm({
      title: m.title,
      category: m.category,
      summary: m.summary,
      contextLosari: m.contextLosari,
      stepsText: m.steps.join("\n"),
      published: m.published,
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const steps = form.stepsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!form.title.trim() || !form.summary.trim() || steps.length === 0) {
      toast({
        title: "Data belum lengkap",
        description: "Isi judul, ringkasan, dan minimal satu langkah mitigasi.",
      });
      return;
    }
    setSaving(true);
    try {
      const url = editingId ? `/api/education/${editingId}` : "/api/education";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          category: form.category,
          summary: form.summary,
          contextLosari: form.contextLosari,
          steps,
          published: form.published,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: "Gagal menyimpan", description: data?.error || "Terjadi kesalahan." });
        return;
      }
      toast({
        title: editingId ? "Materi edukasi diperbarui" : "Materi edukasi ditambahkan",
        description: "Perubahan langsung tersinkron ke menu Edukasi Mitigasi publik.",
      });
      setDialogOpen(false);
      await loadAll();
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (m: EducationRow, next: boolean) => {
    setItems((prev) => prev.map((x) => (x.id === m.id ? { ...x, published: next } : x)));
    const res = await fetch(`/api/education/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: next }),
    });
    if (!res.ok) {
      await loadAll();
      toast({ title: "Gagal mengubah status publikasi" });
      return;
    }
    toast({
      title: next ? "Materi dipublikasikan" : "Materi disembunyikan",
      description: `"${m.title}" ${next ? "kini tampil" : "disembunyikan"} di halaman Edukasi publik.`,
    });
  };

  const confirmDelete = async () => {
    if (!hapusTarget) return;
    const res = await fetch(`/api/education/${hapusTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((x) => x.id !== hapusTarget.id));
      toast({ title: "Materi dihapus", description: `"${hapusTarget.title}" telah dihapus.` });
    }
    setHapusTarget(null);
  };

  const inputCls =
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-primary";

  return (
    <div className="flex flex-col gap-5 p-5 pb-10 md:p-6">
      <PageHeader
        icon={BookOpenCheck}
        title="Kelola Materi Edukasi Mitigasi"
        subtitle="Tambah, ubah, publikasikan, atau hapus panduan kebencanaan yang tampil di halaman Edukasi Mitigasi publik"
        action={
          <Button type="button" size="sm" onClick={openCreate} className="gap-1.5 rounded-xl">
            <Plus className="size-4" /> Tambah Materi
          </Button>
        }
      />

      <Card title={`Daftar Topik Edukasi (${items.length})`}>
        {loading ? (
          <p className="py-8 text-center text-[13px] text-muted-foreground">Memuat materi edukasi...</p>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border/70 bg-secondary/25 p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-[14.5px] font-bold text-foreground">{m.title}</h4>
                    <StatusBadge status={m.published ? "Aktif" : "Direncanakan"} />
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {m.category}
                    </span>
                  </div>
                  <p className="mt-1 text-[12.5px] text-muted-foreground">{m.summary}</p>
                  <p className="mt-1.5 text-[11.5px] text-foreground/80">
                    <b>{m.steps.length} langkah panduan</b> tersimpan di database.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <label className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                    <Switch checked={m.published} onCheckedChange={(v) => togglePublish(m, v)} />
                    Terbit
                  </label>
                  <button
                    type="button"
                    onClick={() => openEdit(m)}
                    title="Ubah materi"
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setHapusTarget(m)}
                    title="Hapus materi"
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Materi Edukasi" : "Tambah Materi Edukasi Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="flex flex-col gap-3.5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.5fr_1fr]">
              <div>
                <label className="mb-1 block text-[12px] font-semibold">Judul Topik Bahaya</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Contoh: Kesiapsiagaan Angin Puting Beliung"
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-semibold">Kategori</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className={inputCls}
                >
                  <option value="Data Olahan">Data Olahan</option>
                  <option value="Pesisir Terkait">Pesisir Terkait</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-semibold">Ringkasan Singkat</label>
              <input
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                className={inputCls}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-semibold">
                Konteks Kawasan Pantai Losari
              </label>
              <textarea
                rows={3}
                value={form.contextLosari}
                onChange={(e) => setForm((f) => ({ ...f, contextLosari: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background p-3 text-[13px] outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-semibold">
                Langkah Mitigasi (tulis 1 langkah per baris)
              </label>
              <textarea
                rows={5}
                value={form.stepsText}
                onChange={(e) => setForm((f) => ({ ...f, stepsText: e.target.value }))}
                placeholder={"Langkah pertama...\nLangkah kedua...\nLangkah ketiga..."}
                className="w-full rounded-lg border border-border bg-background p-3 text-[13px] outline-none focus:border-primary"
                required
              />
            </div>

            <label className="flex items-center gap-2 text-[12.5px] font-medium">
              <Switch
                checked={form.published}
                onCheckedChange={(v) => setForm((f) => ({ ...f, published: v }))}
              />
              Publikasikan ke halaman Edukasi Mitigasi publik
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                Simpan Materi
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!hapusTarget} onOpenChange={(o) => !o && setHapusTarget(null)}>
        <DialogContent className="rounded-2xl sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Hapus Materi Edukasi?</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-muted-foreground">
            Materi <b className="text-foreground">{hapusTarget?.title}</b> akan dihapus dari
            database dan halaman Edukasi publik.
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

export function KesesuaianView({ mode = "wisata" }: { mode?: "wisata" | "mitigasi" }) {
  if (mode === "mitigasi") return <EdukasiCrudManager />;
  return <WisataCrudManager />;
}
