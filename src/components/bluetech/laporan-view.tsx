"use client";

/* Halaman Laporan & Ekspor — menyajikan rekap nyata Kawasan Pantai Losari
   dari manifest.json + database SQLite, dilengkapi ekspor CSV, GeoJSON, & Cetak. */

import { useEffect, useState } from "react";
import {
  BarChart3,
  FileJson,
  FileSpreadsheet,
  Printer,
} from "lucide-react";
import { Card, PageHeader } from "./page-ui";
import { fetchManifest, formatTanggalWaktuId, type LosariManifest } from "@/lib/losari-data";
import { downloadBlob } from "@/lib/analysis-engine";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function LaporanView() {
  const { toast } = useToast();
  const [manifest, setManifest] = useState<LosariManifest | null>(null);
  const [counts, setCounts] = useState<{
    datasets: number;
    attractions: number;
    reports: number;
    actions: number;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      fetchManifest(),
      fetch("/api/dashboard/summary", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([m, sum]) => {
        setManifest(m);
        if (sum) {
          setCounts({
            datasets: sum.datasets?.total ?? 0,
            attractions: sum.attractions?.active ?? 0,
            reports: sum.reports?.total ?? 0,
            actions: sum.actions?.total ?? 0,
          });
        }
      })
      .catch(() => {});
  }, []);

  const exportAttractionsGeoJson = async () => {
    const res = await fetch("/api/attractions?all=1", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    const fc = {
      type: "FeatureCollection",
      name: "atraksi_wisata_losari_live",
      features: (data.items || []).map(
        (a: {
          id: string;
          name: string;
          category: string;
          zoneClass: string;
          description: string;
          active: boolean;
          lat: number;
          lon: number;
        }) => ({
          type: "Feature",
          properties: {
            id: a.id,
            nama: a.name,
            kategori: a.category,
            kelas_zona: a.zoneClass,
            deskripsi: a.description,
            aktif: a.active,
          },
          geometry: { type: "Point", coordinates: [a.lon, a.lat] },
        }),
      ),
    };
    downloadBlob(
      "atraksi-wisata-losari-live.geojson",
      JSON.stringify(fc, null, 2),
      "application/geo+json",
    );
    toast({ title: "GeoJSON diunduh", description: "Titik atraksi wisata terbaru dari database." });
  };

  const exportReportsCsv = async () => {
    const res = await fetch("/api/reports", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    const header = "Kode,Pelapor,Jenis,Lokasi,Status,CatatanPetugas,Uraian,Waktu";
    const rows = (data.items || []).map(
      (r: {
        code: string;
        reporterName: string;
        category: string;
        location: string;
        status: string;
        adminNote: string | null;
        description: string;
        createdAt: string;
      }) =>
        [
          r.code,
          `"${r.reporterName.replace(/"/g, '""')}"`,
          `"${r.category}"`,
          `"${r.location}"`,
          r.status,
          `"${(r.adminNote ?? "").replace(/"/g, '""')}"`,
          `"${r.description.replace(/"/g, '""')}"`,
          r.createdAt,
        ].join(","),
    );
    downloadBlob("rekap-laporan-warga-losari.csv", [header, ...rows].join("\n"), "text/csv;charset=utf-8");
    toast({ title: "CSV diunduh", description: "Rekap laporan masyarakat tersimpan." });
  };

  const exportZonaSummaryCsv = () => {
    if (!manifest) return;
    const lines = [
      "Bluetech — Ringkasan Zonasi Kawasan Pantai Losari",
      "Sumber,inaRISK (BNPB) | BIG | OSM | BMKG",
      "",
      "Kelompok,Nama Kelas/Zona,Luas (Ha),Luas (km2)",
      ...manifest.vectors.ringkasan.zonaWisata.map(
        (z) => `Potensi Wisata,${z.kelas},${z.luasHa},${z.luasKm2}`,
      ),
      ...manifest.vectors.ringkasan.zonaMitigasi.map(
        (z) => `Mitigasi Bencana,${z.zona},${z.luasHa},${z.luasKm2}`,
      ),
    ];
    downloadBlob("ringkasan-zonasi-losari.csv", lines.join("\n"), "text/csv;charset=utf-8");
    toast({ title: "CSV diunduh", description: "Ringkasan luas zonasi Kawasan Pantai Losari." });
  };

  const zonaWisata = manifest?.vectors.ringkasan.zonaWisata ?? [];
  const zonaMitigasi = manifest?.vectors.ringkasan.zonaMitigasi ?? [];
  const pasut = manifest?.pasangSurut.ringkasan.ekstrem;

  return (
    <div className="flex flex-col gap-5 p-5 pb-10 md:p-6">
      <PageHeader
        icon={BarChart3}
        title="Laporan & Ekspor Data"
        subtitle="Ringkasan statistik spasial Kawasan Pantai Losari dan ekspor langsung dari database SQLite"
        action={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5 rounded-xl"
          >
            <Printer className="size-4" /> Cetak / PDF
          </Button>
        }
      />

      {/* Ekspor cepat */}
      <div className="grid gap-4 md:grid-cols-3">
        <button
          type="button"
          onClick={exportZonaSummaryCsv}
          className="card-marine card-lift flex items-center gap-3.5 p-4 text-left"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ocean-500/12 text-ocean-600">
            <FileSpreadsheet className="size-5" />
          </span>
          <div>
            <p className="text-[14px] font-bold text-foreground">Unduh Ringkasan Zonasi (CSV)</p>
            <p className="text-[12px] text-muted-foreground">Luas zona wisata &amp; mitigasi (Ha / km²)</p>
          </div>
        </button>

        <button
          type="button"
          onClick={exportAttractionsGeoJson}
          className="card-marine card-lift flex items-center gap-3.5 p-4 text-left"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-reef-500/12 text-reef-600">
            <FileJson className="size-5" />
          </span>
          <div>
            <p className="text-[14px] font-bold text-foreground">Unduh Titik Wisata (GeoJSON)</p>
            <p className="text-[12px] text-muted-foreground">
              {counts?.attractions ?? 8} titik aktif langsung dari SQLite
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={exportReportsCsv}
          className="card-marine card-lift flex items-center gap-3.5 p-4 text-left"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <FileSpreadsheet className="size-5" />
          </span>
          <div>
            <p className="text-[14px] font-bold text-foreground">Unduh Laporan Warga (CSV)</p>
            <p className="text-[12px] text-muted-foreground">
              {counts?.reports ?? 0} laporan beserta status &amp; catatan petugas
            </p>
          </div>
        </button>
      </div>

      {/* Ringkasan tabel zonasi */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Rekap Luas Zona Potensial Wisata">
          <table className="w-full border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-border text-[11.5px] text-muted-foreground">
                <th className="py-2 font-semibold">Kelas</th>
                <th className="py-2 font-semibold text-right">Luas (Ha)</th>
                <th className="py-2 font-semibold text-right">Luas (km²)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {zonaWisata.map((z) => (
                <tr key={z.kelas}>
                  <td className="py-2.5 font-semibold text-foreground">
                    <span className="inline-flex items-center gap-2">
                      <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: z.warna }} />
                      Potensi {z.kelas}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-mono">{z.luasHa.toLocaleString("id-ID")}</td>
                  <td className="py-2.5 text-right font-mono">{z.luasKm2}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Rekap Luas Zona Mitigasi Bencana">
          <table className="w-full border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-border text-[11.5px] text-muted-foreground">
                <th className="py-2 font-semibold">Zona</th>
                <th className="py-2 font-semibold text-right">Luas (Ha)</th>
                <th className="py-2 font-semibold text-right">Luas (km²)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {zonaMitigasi.map((z) => (
                <tr key={z.zona}>
                  <td className="py-2.5 font-semibold text-foreground">
                    <span className="inline-flex items-center gap-2">
                      <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: z.warna }} />
                      {z.zona}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-mono">{z.luasHa.toLocaleString("id-ID")}</td>
                  <td className="py-2.5 text-right font-mono">{z.luasKm2}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Ringkasan Pasang Surut & Status Sistem */}
      {pasut ? (
        <Card title="Ringkasan Parameter Pasang Surut (21 Nov – 20 Des 2026)">
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <div className="rounded-xl bg-secondary/50 p-3.5">
              <p className="text-[11.5px] text-muted-foreground">Pasang Tertinggi (MSL)</p>
              <p className="mt-1 text-[18px] font-bold text-foreground">
                +{pasut.pasangTertinggi.ketinggian.toFixed(2)} m
              </p>
              <p className="text-[11.5px] text-muted-foreground">
                {formatTanggalWaktuId(pasut.pasangTertinggi.waktu)}
              </p>
            </div>
            <div className="rounded-xl bg-secondary/50 p-3.5">
              <p className="text-[11.5px] text-muted-foreground">Surut Terendah (MSL)</p>
              <p className="mt-1 text-[18px] font-bold text-foreground">
                {pasut.surutTerendah.ketinggian.toFixed(2)} m
              </p>
              <p className="text-[11.5px] text-muted-foreground">
                {formatTanggalWaktuId(pasut.surutTerendah.waktu)}
              </p>
            </div>
            <div className="rounded-xl bg-secondary/50 p-3.5">
              <p className="text-[11.5px] text-muted-foreground">Rekaman Terproses</p>
              <p className="mt-1 text-[18px] font-bold text-foreground">
                {pasut.totalKejadian} ekstrem · 4.320 titik
              </p>
              <p className="text-[11.5px] text-muted-foreground">
                Dataset aktif di database: {counts?.datasets ?? 12} · Aksi mitigasi: {counts?.actions ?? 5}
              </p>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
