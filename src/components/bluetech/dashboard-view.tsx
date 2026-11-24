"use client";

/* Dashboard Admin — ringkasan live dari database SQLite & data GIS Kawasan
   Pantai Losari (dataset aktif, titik atraksi, laporan warga, program mitigasi,
   serta peta ikhtisar raster & atraksi). */

import { useEffect, useMemo, useState } from "react";
import {
  BookOpenCheck,
  ChevronRight,
  Compass,
  Database,
  Layers,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Siren,
} from "lucide-react";
import type { MenuKey } from "@/lib/bluetech-data";
import { fetchManifest, type LosariManifest } from "@/lib/losari-data";
import { LosariMapNoSsr, type LosariPointMarker, type LosariRasterOverlay } from "./losari-map-loader";
import { Card, PageHeader, StatusBadge } from "./page-ui";
import { Button } from "@/components/ui/button";

interface DashboardSummary {
  datasets: { total: number; visiblePublic: number; needCheck: number };
  attractions: { total: number; active: number };
  reports: { total: number; diterima: number; diproses: number; selesai: number };
  recentReports: {
    id: string;
    code: string;
    reporterName: string;
    category: string;
    location: string;
    status: string;
    createdAt: string;
  }[];
  education: { total: number; published: number };
  actions: { total: number; berjalan: number; selesai: number; avgProgress: number };
}

interface DbAttraction {
  id: string;
  name: string;
  category: string;
  tourismType: string;
  description: string;
  lat: number;
  lon: number;
  active: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  diterima: "Diterima",
  diproses: "Diproses",
  selesai: "Selesai",
};

export function DashboardView({
  wilayah,
  onNavigate,
}: {
  wilayah: string;
  onNavigate: (key: MenuKey) => void;
}) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [manifest, setManifest] = useState<LosariManifest | null>(null);
  const [attractions, setAttractions] = useState<DbAttraction[]>([]);
  const [selectedRaster, setSelectedRaster] = useState<string>("bahaya_terpadu");
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    const [m, sumRes, attrRes] = await Promise.all([
      fetchManifest(),
      fetch("/api/dashboard/summary", { cache: "no-store" }),
      fetch("/api/attractions?all=1", { cache: "no-store" }),
    ]);
    const sum = sumRes.ok ? await sumRes.json() : null;
    const attrData = attrRes.ok ? await attrRes.json() : null;
    return {
      m,
      sum,
      attrs: Array.isArray(attrData?.items) ? (attrData.items as DbAttraction[]) : [],
    };
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const { m, sum, attrs } = await fetchDashboardData();
      setManifest(m);
      if (sum) setSummary(sum);
      setAttractions(attrs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetchDashboardData()
      .then(({ m, sum, attrs }) => {
        if (!active) return;
        setManifest(m);
        if (sum) setSummary(sum);
        setAttractions(attrs);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const mapRasters = useMemo<LosariRasterOverlay[]>(() => {
    const r = manifest?.rasters.find((x) => x.id === selectedRaster);
    if (!r) return [];
    return [{ id: r.id, url: r.url, bounds: r.bounds, opacity: 0.78 }];
  }, [manifest, selectedRaster]);

  const markers = useMemo<LosariPointMarker[]>(
    () =>
      attractions
        .filter((a) => a.active)
        .map((a) => ({
          id: a.id,
          lat: a.lat,
          lon: a.lon,
          title: a.name,
          category: a.category,
          description: a.description,
          color: a.tourismType === "museum" ? "#0f507a" : "#7c3aed",
          glyph: a.tourismType === "museum" ? "museum" : "art",
        })),
    [attractions],
  );

  return (
    <div className="flex flex-col gap-6 p-5 pb-10 md:p-6">
      <PageHeader
        icon={Layers}
        title="Dashboard Pengelola — Kawasan Pantai Losari"
        subtitle={`Fokus wilayah: ${wilayah || "Kawasan Pantai Losari"} · Data tersinkronisasi dengan database SQLite`}
        action={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={loadAll}
            disabled={loading}
            className="gap-1.5 rounded-xl"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Segarkan Data
          </Button>
        }
      />

      {/* 4 Kartu KPI Utama */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => onNavigate("data")}
          className="card-marine card-lift flex flex-col gap-2 p-5 text-left"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-muted-foreground">Dataset Spasial</span>
            <Database className="size-4.5 text-primary" />
          </div>
          <p className="text-[28px] font-bold tracking-tight text-foreground tabular-nums">
            {summary?.datasets.total ?? "—"}
          </p>
          <p className="text-[12px] text-muted-foreground">
            {summary?.datasets.visiblePublic ?? 0} tampil publik · {summary?.datasets.needCheck ?? 0} perlu cek
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("kesesuaian-wisata")}
          className="card-marine card-lift flex flex-col gap-2 p-5 text-left"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-muted-foreground">Titik Atraksi Wisata</span>
            <Compass className="size-4.5 text-reef-600" />
          </div>
          <p className="text-[28px] font-bold tracking-tight text-foreground tabular-nums">
            {summary?.attractions.active ?? "—"}
          </p>
          <p className="text-[12px] text-muted-foreground">
            Aktif dari {summary?.attractions.total ?? 0} total titik di database
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("mitigasi")}
          className="card-marine card-lift flex flex-col gap-2 p-5 text-left"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-muted-foreground">Laporan Warga</span>
            <Siren className="size-4.5 text-destructive" />
          </div>
          <p className="text-[28px] font-bold tracking-tight text-foreground tabular-nums">
            {summary?.reports.total ?? "—"}
          </p>
          <p className="text-[12px] text-muted-foreground">
            {summary?.reports.diterima ?? 0} diterima · {summary?.reports.diproses ?? 0} diproses ·{" "}
            {summary?.reports.selesai ?? 0} selesai
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("kesesuaian-mitigasi")}
          className="card-marine card-lift flex flex-col gap-2 p-5 text-left"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-muted-foreground">Materi Edukasi &amp; Aksi</span>
            <BookOpenCheck className="size-4.5 text-[#1686C5]" />
          </div>
          <p className="text-[28px] font-bold tracking-tight text-foreground tabular-nums">
            {summary?.education.published ?? "—"}
          </p>
          <p className="text-[12px] text-muted-foreground">
            Topik terbit · {summary?.actions.total ?? 0} program mitigasi ({summary?.actions.avgProgress ?? 0}%)
          </p>
        </button>
      </div>

      {/* Peta Ikhtisar Kawasan Pantai Losari */}
      <Card
        title="Peta Ikhtisar Spasial — Kawasan Pantai Losari"
        action={
          <select
            value={selectedRaster}
            onChange={(e) => setSelectedRaster(e.target.value)}
            aria-label="Pilih layer raster ikhtisar"
            className="h-9 rounded-lg border border-border bg-card px-2.5 text-[12px] font-semibold text-foreground outline-none"
          >
            {(manifest?.rasters ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        }
      >
        <LosariMapNoSsr height="410px" rasters={mapRasters} markers={markers} />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5 text-primary" />
            Menampilkan {markers.length} titik atraksi aktif + overlay raster terpilih.
          </span>
          <button
            type="button"
            onClick={() => onNavigate("kesesuaian-wisata")}
            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            Kelola Titik Wisata <ChevronRight className="size-3.5" />
          </button>
        </div>
      </Card>

      {/* Tabel Laporan Warga Terbaru + Akses Cepat CRUD */}
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card
          title="Laporan Warga Terbaru"
          action={
            <button
              type="button"
              onClick={() => onNavigate("mitigasi")}
              className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-primary hover:underline"
            >
              Kelola Semua <ChevronRight className="size-3.5" />
            </button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-border text-[11.5px] text-muted-foreground">
                  <th className="py-2 pr-3 font-semibold">Kode</th>
                  <th className="py-2 pr-3 font-semibold">Jenis &amp; Lokasi</th>
                  <th className="py-2 pr-3 font-semibold">Pelapor</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {(summary?.recentReports ?? []).map((r) => (
                  <tr key={r.id} className="hover:bg-secondary/40">
                    <td className="py-2.5 pr-3 font-mono font-semibold text-foreground">{r.code}</td>
                    <td className="py-2.5 pr-3">
                      <p className="font-semibold text-foreground">{r.category}</p>
                      <p className="text-[11px] text-muted-foreground">{r.location}</p>
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{r.reporterName}</td>
                    <td className="py-2.5">
                      <StatusBadge status={STATUS_LABEL[r.status] ?? r.status} />
                    </td>
                  </tr>
                ))}
                {(summary?.recentReports ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground">
                      Belum ada laporan warga masuk.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Aksi Cepat Pengelolaan (CRUD)">
          <div className="flex flex-col gap-2.5">
            {[
              {
                key: "data" as MenuKey,
                icon: Database,
                title: "Kelola Dataset & Layer Peta",
                desc: "Tambah, ubah, validasi, atau atur tampil/sembunyi layer raster di Peta Interaktif.",
              },
              {
                key: "kesesuaian-wisata" as MenuKey,
                icon: Compass,
                title: "CRUD Titik Atraksi Wisata",
                desc: "Klik langsung di peta Losari untuk menambah/memperbarui titik atraksi publik.",
              },
              {
                key: "mitigasi" as MenuKey,
                icon: ShieldAlert,
                title: "Tindak Lanjut Laporan & Program Mitigasi",
                desc: "Ubah status laporan warga (Diterima → Diproses → Selesai) & kelola aksi mitigasi.",
              },
              {
                key: "kesesuaian-mitigasi" as MenuKey,
                icon: BookOpenCheck,
                title: "CRUD Materi Edukasi Mitigasi",
                desc: "Tambah atau perbarui panduan kebencanaan yang tampil di halaman Edukasi publik.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onNavigate(item.key)}
                  className="flex items-start gap-3 rounded-xl border border-border/70 bg-secondary/40 p-3 text-left transition-colors hover:bg-secondary"
                >
                  <span className="mt-0.5 flex size-8.5 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold text-foreground">{item.title}</span>
                    <span className="mt-0.5 block text-[11.5px] leading-snug text-muted-foreground">
                      {item.desc}
                    </span>
                  </span>
                  <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
