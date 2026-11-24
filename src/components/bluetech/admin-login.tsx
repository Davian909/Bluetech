"use client";

/* Tombol masuk Admin pada antarmuka publik (kanan atas header) + pop-up login.
   Verifikasi kredensial dilakukan di server (/api/admin/login) terhadap .env. */

import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, TriangleAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface AdminLoginProps {
  /** Dipanggil setelah verifikasi server berhasil → masuk ke halaman admin */
  onSuccess: () => void;
}

export function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [loginBuka, setLoginBuka] = useState(false);
  const [pengguna, setPengguna] = useState("");
  const [sandi, setSandi] = useState("");
  const [lihatSandi, setLihatSandi] = useState(false);
  const [pesanError, setPesanError] = useState<string | null>(null);
  const [memeriksa, setMemeriksa] = useState(false);

  const bukaLogin = () => {
    setPengguna("");
    setSandi("");
    setLihatSandi(false);
    setPesanError(null);
    setLoginBuka(true);
  };

  const prosesLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (memeriksa) return;
    setMemeriksa(true);
    setPesanError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: pengguna.trim(), password: sandi }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setLoginBuka(false);
        onSuccess();
      } else {
        setPesanError(
          typeof data?.error === "string"
            ? data.error
            : "Nama pengguna atau kata sandi salah. Periksa kembali lalu coba lagi.",
        );
      }
    } catch {
      setPesanError("Tidak dapat terhubung ke server login. Coba beberapa saat lagi.");
    } finally {
      setMemeriksa(false);
    }
  };

  return (
    <>
      {/* Tombol Admin — sebelah kanan menu navigasi */}
      <button
        type="button"
        onClick={bukaLogin}
        title="Masuk ke halaman Admin"
        aria-label="Login Admin"
        className="pub-glass inline-flex shrink-0 items-center gap-2 rounded-full py-1.5 pr-3.5 pl-1.5 text-[12.5px] font-semibold text-foreground shadow-[0_8px_20px_-12px_rgba(11,61,95,0.55)] transition-transform hover:-translate-y-0.5"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0b3d5f,#146795)] text-white">
          <LockKeyhole className="size-3.5" />
        </span>
        <span className="hidden sm:inline">Admin</span>
      </button>

      {/* Pop-up login Admin */}
      <Dialog
        open={loginBuka}
        onOpenChange={(o) => {
          if (!memeriksa) setLoginBuka(o);
        }}
      >
        <DialogContent className="rounded-2xl sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-[17px] font-bold">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#0b3d5f,#146795)] text-white">
                <LockKeyhole className="size-4.5" />
              </span>
              Login Admin
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed">
              Halaman pengelolaan sistem terbatas bagi pengelola. Masukkan akun admin untuk
              melanjutkan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={prosesLogin} className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="admin-pengguna" className="text-[13px] font-semibold text-foreground">
                Nama Pengguna
              </label>
              <input
                id="admin-pengguna"
                value={pengguna}
                onChange={(e) => setPengguna(e.target.value)}
                placeholder="Masukkan nama pengguna"
                autoComplete="username"
                className="pub-input h-11 rounded-xl px-3.5 text-[13.5px] outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="admin-sandi" className="text-[13px] font-semibold text-foreground">
                Kata Sandi
              </label>
              <div className="relative">
                <input
                  id="admin-sandi"
                  type={lihatSandi ? "text" : "password"}
                  value={sandi}
                  onChange={(e) => setSandi(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  autoComplete="current-password"
                  className="pub-input h-11 w-full rounded-xl px-3.5 pr-11 text-[13.5px] outline-none"
                />
                <button
                  type="button"
                  onClick={() => setLihatSandi((v) => !v)}
                  aria-label={lihatSandi ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {lihatSandi ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {pesanError ? (
              <p className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-destructive">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                {pesanError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={memeriksa || !pengguna.trim() || !sandi}
              className={cn(
                "pub-btn-admin flex h-11 items-center justify-center gap-2 rounded-xl text-[14.5px] font-semibold text-white transition-all",
                (memeriksa || !pengguna.trim() || !sandi) && "opacity-60",
              )}
            >
              <LockKeyhole className="size-4.5" />
              {memeriksa ? "Memverifikasi..." : "Masuk ke Halaman Admin"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
