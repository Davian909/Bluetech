import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/db-seed";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureSeeded();
    const items = await db.mitigationAction.findMany({
      orderBy: [{ createdAt: "desc" }],
    });
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memuat program aksi mitigasi." },
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
    const title = String(body?.title ?? "").trim();
    const hazardType = String(body?.hazardType ?? "Banjir").trim();
    const location = String(body?.location ?? "Kawasan Pantai Losari").trim();
    const priority = String(body?.priority ?? "Sedang").trim();
    const status = String(body?.status ?? "Direncanakan").trim();
    const progress = Math.max(0, Math.min(100, Math.round(Number(body?.progress) || 0)));
    const notes = body?.notes ? String(body.notes).trim() : null;

    if (!title) {
      return NextResponse.json({ error: "Judul program mitigasi wajib diisi." }, { status: 400 });
    }

    const item = await db.mitigationAction.create({
      data: { title, hazardType, location, priority, status, progress, notes },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menambah aksi mitigasi." },
      { status: 500 },
    );
  }
}
