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

    if (typeof body?.title === "string" && body.title.trim()) data.title = body.title.trim();
    if (typeof body?.hazardType === "string") data.hazardType = body.hazardType.trim();
    if (typeof body?.location === "string") data.location = body.location.trim();
    if (typeof body?.priority === "string") data.priority = body.priority.trim();
    if (typeof body?.status === "string") data.status = body.status.trim();
    if (body?.progress !== undefined) {
      data.progress = Math.max(0, Math.min(100, Math.round(Number(body.progress) || 0)));
    }
    if (body?.notes !== undefined) data.notes = body.notes ? String(body.notes).trim() : null;

    const item = await db.mitigationAction.update({ where: { id }, data });
    return NextResponse.json({ item });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memperbarui aksi mitigasi." },
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
    await db.mitigationAction.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menghapus aksi mitigasi." },
      { status: 500 },
    );
  }
}
