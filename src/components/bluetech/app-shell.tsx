"use client";

/* Kerangka aplikasi dengan pemisahan antarmuka Publik dan Admin.
   Setiap halaman dimuat secara malas (dynamic import) agar kompilasi awal
   dan pemakaian RAM di laptop ringan tetap sangat hemat. */

import dynamic from "next/dynamic";
import { useEffect, useState, type CSSProperties } from "react";
import type { MenuKey, Role } from "@/lib/bluetech-data";
import { ROLE_STORAGE_KEY } from "@/lib/bluetech-data";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { PublicShell } from "./public-shell";
import { PublicBeranda } from "./public-beranda";

function ViewLoading() {
  return (
    <div className="mx-auto flex min-h-[320px] max-w-6xl items-center justify-center p-8">
      <span className="text-[13.5px] font-medium text-muted-foreground">Memuat halaman...</span>
    </div>
  );
}

const PublicPeta = dynamic(() => import("./public-peta").then((m) => m.PublicPeta), {
  loading: ViewLoading,
});
const PublicPariwisata = dynamic(
  () => import("./public-pariwisata").then((m) => m.PublicPariwisata),
  { loading: ViewLoading },
);
const PublicMitigasi = dynamic(() => import("./public-mitigasi").then((m) => m.PublicMitigasi), {
  loading: ViewLoading,
});
const PublicEdukasi = dynamic(() => import("./public-edukasi").then((m) => m.PublicEdukasi), {
  loading: ViewLoading,
});

const DashboardView = dynamic(() => import("./dashboard-view").then((m) => m.DashboardView), {
  loading: ViewLoading,
});
const KesesuaianView = dynamic(() => import("./kesesuaian-view").then((m) => m.KesesuaianView), {
  loading: ViewLoading,
});
const MitigasiBencanaView = dynamic(
  () => import("./mitigasi-bencana-view").then((m) => m.MitigasiBencanaView),
  { loading: ViewLoading },
);
const ManajemenDataView = dynamic(
  () => import("./manajemen-data-view").then((m) => m.ManajemenDataView),
  { loading: ViewLoading },
);
const LaporanView = dynamic(() => import("./laporan-view").then((m) => m.LaporanView), {
  loading: ViewLoading,
});
const PengaturanView = dynamic(() => import("./pengaturan-view").then((m) => m.PengaturanView), {
  loading: ViewLoading,
});
const BantuanView = dynamic(() => import("./bantuan-view").then((m) => m.BantuanView), {
  loading: ViewLoading,
});

export function AppShell() {
  const [role, setRole] = useState<Role>("masyarakat");
  const [view, setView] = useState<MenuKey>("pub-beranda");
  const [wilayah, setWilayah] = useState("Kawasan Pantai Losari");

  /* Cek apakah sesi cookie admin masih aktif saat halaman dimuat ulang */
  useEffect(() => {
    let active = true;
    fetch("/api/admin/login")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active || !data?.authenticated) return;
        try {
          if (sessionStorage.getItem("bluetech-admin-open") === "1") {
            setRole("admin");
            setView("dashboard");
          }
        } catch {}
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const navigate = (key: MenuKey) => {
    setView(key);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const masukAdmin = () => {
    setRole("admin");
    setView("dashboard");
    try {
      sessionStorage.setItem("bluetech-admin-open", "1");
    } catch {}
  };

  const keluarKePublik = () => {
    setRole("masyarakat");
    setView("pub-beranda");
    try {
      localStorage.removeItem(ROLE_STORAGE_KEY);
      sessionStorage.removeItem("bluetech-admin-open");
    } catch {}
    fetch("/api/admin/login", { method: "DELETE" }).catch(() => {});
  };

  /* ====== Mode masyarakat umum ====== */
  if (role === "masyarakat") {
    return (
      <PublicShell active={view} onNavigate={navigate} onAdminLogin={masukAdmin}>
        {view === "pub-beranda" && <PublicBeranda onNavigate={navigate} />}
        {view === "pub-peta" && <PublicPeta />}
        {view === "pub-pariwisata" && <PublicPariwisata onNavigate={navigate} />}
        {view === "pub-mitigasi" && <PublicMitigasi />}
        {view === "pub-edukasi" && <PublicEdukasi />}
        {view !== "pub-beranda" &&
          view !== "pub-peta" &&
          view !== "pub-pariwisata" &&
          view !== "pub-mitigasi" &&
          view !== "pub-edukasi" && <PublicBeranda onNavigate={navigate} />}
      </PublicShell>
    );
  }

  /* ====== Mode admin/pengelola (halaman terpisah) ====== */
  return (
    <SidebarProvider
      className="astrix-theme no-scrollbar h-svh overflow-hidden"
      style={
        {
          "--sidebar-width": "19.5rem",
          "--sidebar-width-icon": "5.125rem",
        } as CSSProperties
      }
    >
      <Sidebar active={view} onNavigate={navigate} onExit={keluarKePublik} />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-transparent text-foreground">
        <div className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/72 backdrop-blur-xl">
          <Topbar onNavigate={navigate} onSelectWilayah={setWilayah} />
        </div>

        <div className="flex-1 overflow-y-auto">
          <div key={view} className="view-enter">
            {view === "dashboard" && <DashboardView wilayah={wilayah} onNavigate={navigate} />}
            {view === "kesesuaian-wisata" && <KesesuaianView mode="wisata" />}
            {view === "kesesuaian-mitigasi" && <KesesuaianView mode="mitigasi" />}
            {view === "mitigasi" && <MitigasiBencanaView />}
            {view === "data" && <ManajemenDataView />}
            {view === "laporan" && <LaporanView />}
            {view === "pengaturan" && <PengaturanView />}
            {view === "bantuan" && <BantuanView />}
          </div>
        </div>
      </main>
    </SidebarProvider>
  );
}
