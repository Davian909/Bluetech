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

    const strFields = [
      "name",
      "category",
      "dataType",
      "format",
      "source",
      "crs",
      "coverage",
      "fileSize",
      "description",
      "validationStatus",
    ];
    for (const f of strFields) {
      if (typeof body?.[f] === "string") data[f] = body[f].trim();
    }
    if (body?.note !== undefined) data.note = body.note ? String(body.note).trim() : null;
    if (body?.publicUrl !== undefined) data.publicUrl = body.publicUrl ? String(body.publicUrl).trim() : null;
    if (typeof body?.visiblePublic === "boolean") data.visiblePublic = body.visiblePublic;
    if (typeof body?.defaultOn === "boolean") data.defaultOn = body.defaultOn;

    const item = await db.spatialDataset.update({ where: { id }, data });
    return NextResponse.json({ item });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memperbarui dataset." },
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
    await db.spatialDataset.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menghapus dataset." },
      { status: 500 },
    );
  }
}
