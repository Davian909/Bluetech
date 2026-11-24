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
    if (typeof body?.category === "string" && body.category.trim()) data.category = body.category.trim();
    if (typeof body?.summary === "string") data.summary = body.summary.trim();
    if (typeof body?.contextLosari === "string") data.contextLosari = body.contextLosari.trim();
    if (Array.isArray(body?.steps)) {
      const cleanSteps = body.steps.map((s: unknown) => String(s).trim()).filter(Boolean);
      if (cleanSteps.length > 0) data.stepsJson = JSON.stringify(cleanSteps);
    }
    if (typeof body?.published === "boolean") data.published = body.published;
    if (body?.sortOrder !== undefined && Number.isFinite(Number(body.sortOrder))) {
      data.sortOrder = Number(body.sortOrder);
    }

    const r = await db.educationContent.update({ where: { id }, data });
    return NextResponse.json({
      item: {
        id: r.id,
        slug: r.slug,
        title: r.title,
        category: r.category,
        summary: r.summary,
        contextLosari: r.contextLosari,
        steps: JSON.parse(r.stepsJson),
        sortOrder: r.sortOrder,
        published: r.published,
        updatedAt: r.updatedAt,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memperbarui materi edukasi." },
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
    await db.educationContent.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menghapus materi edukasi." },
      { status: 500 },
    );
  }
}
