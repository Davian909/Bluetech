import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/db-seed";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await ensureSeeded();
    const includeInactive = req.nextUrl.searchParams.get("all") === "1";
    const items = await db.tourismAttraction.findMany({
      where: includeInactive ? undefined : { active: true },
      orderBy: [{ createdAt: "desc" }],
    });
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memuat data atraksi wisata." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    await ensureSeeded();
    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const category = String(body?.category ?? "Wisata Pesisir").trim();
    const tourismType = String(body?.tourismType ?? "attraction").trim();
    const zoneClass = String(body?.zoneClass ?? "Tinggi").trim();
    const description = String(body?.description ?? "").trim();
    const operator = body?.operator ? String(body.operator).trim() : null;
    const lat = Number(body?.lat);
    const lon = Number(body?.lon);
    const active = body?.active !== false;

    if (!name || !description) {
      return NextResponse.json({ error: "Nama dan deskripsi titik atraksi wajib diisi." }, { status: 400 });
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return NextResponse.json({ error: "Koordinat lintang dan bujur tidak valid." }, { status: 400 });
    }

    const item = await db.tourismAttraction.create({
      data: {
        name,
        category,
        tourismType,
        zoneClass,
        description,
        operator,
        lat: Number(lat.toFixed(6)),
        lon: Number(lon.toFixed(6)),
        active,
      },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menambah titik atraksi wisata." },
      { status: 500 },
    );
  }
}
