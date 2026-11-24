import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
  getAdminEnvCredentials,
  isAdminRequest,
  safeEqual,
} from "@/lib/admin-auth";

export const runtime = "nodejs";

/** Periksa apakah sesi admin aktif lewat cookie HttpOnly. */
export async function GET(req: NextRequest) {
  const { username } = getAdminEnvCredentials();
  const authenticated = isAdminRequest(req);
  return NextResponse.json({ authenticated, username: authenticated ? username : null });
}

/** Verifikasi login Admin terhadap variabel lingkungan (.env). */
export async function POST(req: NextRequest) {
  try {
    const { username: envUser, password: envPass } = getAdminEnvCredentials();
    if (!envUser || !envPass) {
      return NextResponse.json(
        { error: "Konfigurasi akun admin belum diatur di server (.env)." },
        { status: 500 },
      );
    }

    const body = await req.json();
    const inputUser = typeof body?.username === "string" ? body.username.trim() : "";
    const inputPass = typeof body?.password === "string" ? body.password : "";

    if (!inputUser || !inputPass) {
      return NextResponse.json(
        { error: "Nama pengguna dan kata sandi wajib diisi." },
        { status: 400 },
      );
    }

    const userMatch = safeEqual(inputUser.toLowerCase(), envUser.toLowerCase());
    const passMatch = safeEqual(inputPass, envPass);

    if (!userMatch || !passMatch) {
      return NextResponse.json(
        { error: "Nama pengguna atau kata sandi salah. Periksa kembali lalu coba lagi." },
        { status: 401 },
      );
    }

    const res = NextResponse.json({ ok: true, username: envUser });
    res.cookies.set(ADMIN_COOKIE_NAME, createAdminSessionToken(envUser, envPass), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Permintaan login tidak valid." }, { status: 400 });
  }
}

/** Keluar dari sesi admin (hapus cookie). */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
