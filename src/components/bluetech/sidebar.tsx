"use client";

/* Sidebar gaya "Astrix" — terang, ikon ringkas, nav membulat,
   memakai primitif ui/sidebar (shadcn) dengan palet Bluetech. */

import {
  BarChart3,
  BookOpenCheck,
  CircleUser,
  Compass,
  Database,
  HelpCircle,
  LayoutGrid,
  LogOut,
  PanelLeft,
  Settings,
  Siren,
  UsersRound,
} from "lucide-react";
import type { MenuKey } from "@/lib/bluetech-data";
import { BluetechLogo } from "./logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  Sidebar as SidebarPrimitive,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const NAV_ITEMS: { key: MenuKey; label: string; icon: React.ElementType; badge?: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { key: "data", label: "Manajemen Data", icon: Database },
  { key: "kesesuaian-wisata", label: "Zona & Atraksi Wisata", icon: Compass },
  { key: "mitigasi", label: "Mitigasi & Laporan Warga", icon: Siren },
  { key: "kesesuaian-mitigasi", label: "Kelola Edukasi", icon: BookOpenCheck },
  { key: "laporan", label: "Laporan & Ekspor", icon: BarChart3 },
  { key: "pengaturan", label: "Pengaturan", icon: Settings },
  { key: "bantuan", label: "Bantuan", icon: HelpCircle },
];

const dropdownTriggerClassName =
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm ring-sidebar-ring outline-hidden transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0";

interface SidebarProps {
  active: MenuKey;
  onNavigate: (key: MenuKey) => void;
  /** Kembali ke antarmuka masyarakat umum (keluar mode admin). */
  onExit?: () => void;
}

function NavItem({
  item,
  active,
  onNavigate,
}: {
  item: (typeof NAV_ITEMS)[number];
  active: MenuKey;
  onNavigate: (key: MenuKey) => void;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  const isActive = active === item.key;
  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.label}
        className={cn(
          "h-auto [&_svg]:size-5",
          "group-data-[collapsible=icon]:size-12!",
          "group-data-[collapsible=icon]:px-3.5!",
        )}
      >
        <button
          type="button"
          aria-current={isActive ? "page" : undefined}
          onClick={() => {
            onNavigate(item.key);
            if (isMobile) setOpenMobile(false);
          }}
          className={cn(
            "group/nav flex h-12 w-full items-center gap-2.5 overflow-hidden rounded-xl px-3 py-2.5 text-muted-foreground hover:text-foreground",
            "transition-[width,padding] ease-linear",
            "aria-[current=page]:bg-sidebar-accent aria-[current=page]:text-primary aria-[current=page]:[filter:var(--shadow-sidebar-item)]",
          )}
        >
          <Icon className="size-5" strokeWidth={2} />
          <span className="truncate text-base group-data-[collapsible=icon]:hidden">
            {item.label}
          </span>
          {item.badge ? (
            <span className="ml-auto rounded-md bg-foreground/10 px-1.5 py-0.5 text-xs font-medium text-foreground group-data-[collapsible=icon]:hidden group-aria-[current=page]/nav:bg-primary/10 group-aria-[current=page]/nav:text-primary">
              {item.badge}
            </span>
          ) : null}
        </button>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function Sidebar({ active, onNavigate, onExit }: SidebarProps) {
  const { toggleSidebar } = useSidebar();
  const { toast } = useToast();

  return (
    <SidebarPrimitive collapsible="icon" className="border-none">
      <SidebarHeader className="h-16 flex-row items-center justify-between px-3 transition-[padding] ease-linear group-data-[collapsible=icon]:px-4.25">
        <div className="flex min-w-0 items-center gap-2 overflow-hidden group-data-[collapsible=icon]:hidden">
          <BluetechLogo className="h-7 w-auto shrink-0" variant="dark" />
          <div className="min-w-0">
            <p className="truncate text-lg leading-tight font-semibold text-foreground">Bluetech</p>
            <p className="truncate text-[10.5px] leading-tight text-muted-foreground">
              Admin · Pantai Losari
            </p>
          </div>
          <span className="ml-auto shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-primary">
            ADMIN
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-lg"
          onClick={toggleSidebar}
          className="ml-auto text-muted-foreground hover:text-foreground group-data-[collapsible=icon]:size-12"
          aria-label="Buka/tutup sidebar"
        >
          <PanelLeft className="size-5" />
          <span className="sr-only">Buka/tutup sidebar</span>
        </Button>
      </SidebarHeader>

      <SidebarContent className="overflow-x-hidden px-3 py-4 transition-[padding] ease-linear group-data-[collapsible=icon]:px-4.25">
        <SidebarMenu className="gap-3">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.key} item={item} active={active} onNavigate={onNavigate} />
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="px-3 py-2 transition-[padding] ease-linear group-data-[collapsible=icon]:px-5.25">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                type="button"
                className={cn(
                  dropdownTriggerClassName,
                  "h-auto gap-2.5 overflow-hidden rounded-xl px-1.5 py-1.5 group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:rounded-full! group-data-[collapsible=icon]:p-0!",
                )}
                aria-label="Menu akun"
              >
                <Avatar className="size-10">
                  <AvatarFallback className="bg-[linear-gradient(135deg,#146795,#1e9c80)] text-sm font-semibold text-white">
                    AB
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 text-left group-data-[collapsible=icon]:hidden">
                  <p className="truncate text-base font-semibold text-foreground">Admin Bluetech</p>
                  <p className="truncate text-sm text-muted-foreground">admin@bluetech.id</p>
                </div>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="start" side="top" className="astrix-theme w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-normal">
                    <p className="font-medium text-foreground">Admin Bluetech</p>
                    <p className="text-xs text-muted-foreground">admin@bluetech.id</p>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onNavigate("pengaturan")}
                  >
                    <CircleUser />
                    Profil Pengelola
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onNavigate("pengaturan")}>
                    <Settings />
                    Pengaturan
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onNavigate("bantuan")}>
                    <HelpCircle />
                    Pusat Bantuan
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {onExit ? (
                    <DropdownMenuItem
                      onClick={() => {
                        toast({
                          title: "Kembali ke Halaman Publik",
                          description: "Anda keluar dari sesi Admin ke antarmuka publik.",
                        });
                        onExit();
                      }}
                    >
                      <UsersRound />
                      Lihat Halaman Publik
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      toast({ title: "Sesi Admin ditutup", description: "Kembali ke antarmuka publik." });
                      onExit?.();
                    }}
                  >
                    <LogOut />
                    Keluar Admin
                  </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </SidebarPrimitive>
  );
}
