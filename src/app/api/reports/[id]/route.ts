import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

const VALID_STATUS = new Set(["diterima", "diproses", "selesai"]);

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

    if (typeof body?.reporterName === "string" && body.reporterName.trim()) {
      data.reporterName = body.reporterName.trim();
    }
    if (typeof body?.category === "string" && body.category.trim()) {
      data.category = body.category.trim();
    }
    if (typeof body?.location === "string" && body.location.trim()) {
      data.location = body.location.trim();
    }
    if (typeof body?.description === "string" && body.description.trim()) {
      data.description = body.description.trim();
    }
    if (typeof body?.status === "string" && VALID_STATUS.has(body.status)) {
      data.status = body.status;
    }
    if (body?.adminNote !== undefined) {
      data.adminNote = body.adminNote ? String(body.adminNote).trim() : null;
    }

    const item = await db.citizenReport.update({ where: { id }, data });
    return NextResponse.json({ item });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memperbarui laporan warga." },
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
    await db.citizenReport.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menghapus laporan warga." },
      { status: 500 },
    );
  }
}
