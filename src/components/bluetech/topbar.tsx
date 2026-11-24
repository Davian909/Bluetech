"use client";

/* Topbar Admin — pencarian sub-lokasi Kawasan Pantai Losari, notifikasi
   langsung dari laporan warga baru di SQLite, toggle tema, dan tombol cepat. */

import { useEffect, useRef, useState } from "react";
import { Bell, Database, MapPin, Moon, Search, Sun } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MenuKey } from "@/lib/bluetech-data";
import { LOKASI_LOSARI } from "@/lib/losari-data";

interface RecentReport {
  id: string;
  code: string;
  category: string;
  location: string;
  status: string;
}

interface TopbarProps {
  onNavigate: (key: MenuKey) => void;
  onSelectWilayah: (name: string) => void;
}

export function Topbar({ onNavigate, onSelectWilayah }: TopbarProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [pendingReports, setPendingReports] = useState<RecentReport[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [gelap, setGelap] = useState(false);

  useEffect(() => {
    const sync = () => setGelap(document.documentElement.classList.contains("dark"));
    sync();
    window.addEventListener("bluetech-theme-change", sync);
    return () => window.removeEventListener("bluetech-theme-change", sync);
  }, []);

  useEffect(() => {
    let mounted = true;
    fetch("/api/dashboard/summary", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!mounted || !Array.isArray(data?.recentReports)) return;
        setPendingReports(
          data.recentReports.filter((r: RecentReport) => r.status !== "selesai").slice(0, 5),
        );
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const toggleTema = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("bluetech-theme", next ? "gelap" : "terang");
    } catch {}
    window.dispatchEvent(new Event("bluetech-theme-change"));
  };

  const results = LOKASI_LOSARI.filter((l) =>
    l.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const pick = (name: string) => {
    onSelectWilayah(name);
    setQuery("");
    setOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-0 bg-transparent px-4 md:px-6 md:pr-8">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <SidebarTrigger className="size-10 md:hidden [&_svg]:size-5!" aria-label="Buka menu navigasi" />

        <div className="relative hidden h-10 w-full max-w-[26rem] shrink-0 items-center gap-2.5 rounded-lg bg-secondary px-3 focus-within:ring-2 focus-within:ring-ring/40 md:flex">
          <Search className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            ref={searchInputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(e.target.value.trim().length > 0);
            }}
            type="text"
            placeholder="Cari lokasi Kawasan Pantai Losari..."
            aria-label="Cari lokasi"
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {query === "" ? (
            <span className="flex shrink-0 items-center rounded-md bg-background px-2 py-1 text-[11px] leading-none font-medium text-muted-foreground">
              Ctrl K
            </span>
          ) : null}

          {open && (
            <div className="absolute top-12 right-0 left-0 z-40 overflow-hidden rounded-lg border bg-popover shadow-lg">
              {results.length === 0 ? (
                <p className="px-4 py-3 text-[13px] text-muted-foreground">
                  Lokasi &quot;{query}&quot; tidak ditemukan di area Pantai Losari.
                </p>
              ) : (
                results.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => pick(name)}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    <MapPin className="size-3.5 text-primary" />
                    {name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        <Button
          type="button"
          variant="secondary"
          size="icon-lg"
          className="size-10"
          onClick={toggleTema}
          aria-label={gelap ? "Aktifkan tema terang" : "Aktifkan tema gelap"}
          title={gelap ? "Tema terang" : "Tema gelap"}
        >
          {gelap ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              size="icon-lg"
              className="relative size-10"
              aria-label="Notifikasi laporan warga"
            >
              <Bell className="size-5" />
              {pendingReports.length > 0 ? (
                <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                  {pendingReports.length}
                </span>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Laporan Warga Aktif</span>
              <span className="text-[11px] font-normal text-muted-foreground">
                {pendingReports.length} perlu pantauan
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {pendingReports.length === 0 ? (
                <p className="px-3 py-4 text-center text-[12.5px] text-muted-foreground">
                  Semua laporan warga sudah ditangani.
                </p>
              ) : (
                pendingReports.map((r) => (
                  <DropdownMenuItem
                    key={r.id}
                    onClick={() => onNavigate("mitigasi")}
                    className="flex flex-col items-start gap-0.5 py-2"
                  >
                    <span className="text-[12.5px] font-semibold text-foreground">
                      {r.code} · {r.category}
                    </span>
                    <span className="text-[11.5px] text-muted-foreground">
                      {r.location} — status: <b>{r.status}</b>
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          onClick={() => onNavigate("data")}
          className="hidden h-10 gap-2 rounded-xl px-4 text-[13px] font-semibold sm:inline-flex"
        >
          <Database className="size-4" />
          Kelola Dataset
        </Button>
      </div>
    </header>
  );
}
