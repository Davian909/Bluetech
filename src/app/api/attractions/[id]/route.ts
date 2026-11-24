import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    const { id } = await context.params;
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (typeof body?.name === "string" && body.name.trim()) data.name = body.name.trim();
    if (typeof body?.category === "string" && body.category.trim()) data.category = body.category.trim();
    if (typeof body?.tourismType === "string") data.tourismType = body.tourismType.trim();
    if (typeof body?.zoneClass === "string") data.zoneClass = body.zoneClass.trim();
    if (typeof body?.description === "string") data.description = body.description.trim();
    if (body?.operator !== undefined) data.operator = body.operator ? String(body.operator).trim() : null;
    if (body?.lat !== undefined) {
      const lat = Number(body.lat);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        return NextResponse.json({ error: "Nilai lintang tidak valid." }, { status: 400 });
      }
      data.lat = Number(lat.toFixed(6));
    }
    if (body?.lon !== undefined) {
      const lon = Number(body.lon);
      if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
        return NextResponse.json({ error: "Nilai bujur tidak valid." }, { status: 400 });
      }
      data.lon = Number(lon.toFixed(6));
    }
    if (typeof body?.active === "boolean") data.active = body.active;

    const item = await db.tourismAttraction.update({ where: { id }, data });
    return NextResponse.json({ item });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memperbarui titik atraksi." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    const { id } = await context.params;
    await db.tourismAttraction.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menghapus titik atraksi." },
      { status: 500 },
    );
  }
}
