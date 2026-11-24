"use client";

/* Shell antarmuka masyarakat umum — Kawasan Pantai Losari, Makassar.
   Navigasi 5 menu utama di atas + tombol tema + tombol "Admin" di sebelah kanan menu. */

import { useEffect, useState } from "react";
import {
  Compass,
  GraduationCap,
  Home,
  Map as MapIcon,
  Moon,
  ShieldAlert,
  Sun,
} from "lucide-react";
import type { MenuKey } from "@/lib/bluetech-data";
import { BluetechLogo } from "./logo";
import { AdminLogin } from "./admin-login";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PUB_NAV: { key: MenuKey; label: string; shortLabel: string; icon: React.ElementType }[] = [
  { key: "pub-beranda", label: "Beranda", shortLabel: "Beranda", icon: Home },
  { key: "pub-peta", label: "Peta Interaktif", shortLabel: "Peta", icon: MapIcon },
  { key: "pub-pariwisata", label: "Zona Potensial Wisata", shortLabel: "Zona Wisata", icon: Compass },
  { key: "pub-mitigasi", label: "Mitigasi Bencana", shortLabel: "Mitigasi", icon: ShieldAlert },
  { key: "pub-edukasi", label: "Edukasi Mitigasi", shortLabel: "Edukasi", icon: GraduationCap },
];

interface PublicShellProps {
  active: MenuKey;
  onNavigate: (key: MenuKey) => void;
  /** Dipanggil setelah login pop-up Admin berhasil */
  onAdminLogin: () => void;
  children: React.ReactNode;
}

export function PublicShell({ active, onNavigate, onAdminLogin, children }: PublicShellProps) {
  const [gelap, setGelap] = useState(false);

  useEffect(() => {
    const sync = () => setGelap(document.documentElement.classList.contains("dark"));
    sync();
    window.addEventListener("bluetech-theme-change", sync);
    return () => window.removeEventListener("bluetech-theme-change", sync);
  }, []);

  const toggleTema = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("bluetech-theme", next ? "gelap" : "terang");
    } catch {}
    window.dispatchEvent(new Event("bluetech-theme-change"));
  };

  return (
    <div className="flex min-h-svh flex-col">
      {/* Bilah navigasi atas */}
      <header className="pub-glass sticky top-0 z-50 border-b">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-2 px-4 md:gap-3 md:px-6">
          {/* Logo */}
          <button
            type="button"
            onClick={() => onNavigate("pub-beranda")}
            className="flex shrink-0 items-center gap-2.5"
            aria-label="Beranda Bluetech"
          >
            <BluetechLogo className="h-8 w-auto" variant="dark" />
            <span className="hidden flex-col items-start leading-tight xl:flex">
              <span className="text-[15px] font-bold text-foreground">Bluetech</span>
              <span className="text-[10.5px] font-medium text-muted-foreground">
                Kawasan Pantai Losari
              </span>
            </span>
          </button>

          {/* Navigasi 5 menu publik */}
          <nav
            aria-label="Navigasi utama"
            className="no-scrollbar ml-auto flex items-center gap-1 overflow-x-auto md:mx-auto"
          >
            {PUB_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onNavigate(item.key)}
                  aria-current={isActive ? "page" : undefined}
                  title={item.label}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-2 text-[12.5px] font-medium transition-colors xl:px-3.5",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-[0_6px_16px_-8px_rgba(11,61,95,0.65)]"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" strokeWidth={2.1} />
                  <span className="hidden xl:inline">{item.label}</span>
                  <span className="hidden md:inline xl:hidden">{item.shortLabel}</span>
                </button>
              );
            })}
          </nav>

          {/* Aksi kanan: tema + tombol Admin */}
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="icon-lg"
              className="size-9 rounded-full"
              onClick={toggleTema}
              aria-label={gelap ? "Aktifkan tema terang" : "Aktifkan tema gelap"}
              title={gelap ? "Tema terang" : "Tema gelap"}
            >
              {gelap ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
            </Button>
            <AdminLogin onSuccess={onAdminLogin} />
          </div>
        </div>
      </header>

      {/* Konten utama */}
      <main className="flex-1">
        <div key={active} className="view-enter">
          {children}
        </div>
      </main>

      {/* Kaki halaman */}
      <footer className="pub-glass mt-10 border-t">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-2.5 px-4 py-5 text-center md:flex-row md:justify-between md:text-left">
          <div className="flex items-center gap-2.5">
            <BluetechLogo className="h-6 w-auto" variant="dark" />
            <span className="text-[12.5px] font-medium text-muted-foreground">
              Bluetech — WebGIS Perencanaan Ruang Laut &amp; Mitigasi Bencana · Kawasan Pantai Losari
            </span>
          </div>
          <p className="max-w-lg text-[11.5px] leading-relaxed text-muted-foreground/85">
            Sumber data spasial &amp; parameter: <b>inaRISK (BNPB)</b>, <b>BIG</b>,{" "}
            <b>OpenStreetMap</b>, dan <b>BMKG</b>. Digunakan sebagai informasi perencanaan dan
            mitigasi pesisir — bukan untuk navigasi pelayaran.
          </p>
        </div>
      </footer>
    </div>
  );
}
