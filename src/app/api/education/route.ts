import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/db-seed";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

function parseSteps(raw: string): string[] {
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || `materi-${Date.now()}`
  );
}

export async function GET(req: NextRequest) {
  try {
    await ensureSeeded();
    const includeDraft = req.nextUrl.searchParams.get("all") === "1";
    const rows = await db.educationContent.findMany({
      where: includeDraft ? undefined : { published: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    const items = rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      category: r.category,
      summary: r.summary,
      contextLosari: r.contextLosari,
      steps: parseSteps(r.stepsJson),
      sortOrder: r.sortOrder,
      published: r.published,
      updatedAt: r.updatedAt,
    }));
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memuat materi edukasi." },
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
    const summary = String(body?.summary ?? "").trim();
    const contextLosari = String(body?.contextLosari ?? "").trim();
    const category = String(body?.category ?? "Data Olahan").trim();
    const steps: string[] = Array.isArray(body?.steps)
      ? body.steps.map((s: unknown) => String(s).trim()).filter(Boolean)
      : [];

    if (!title || !summary || steps.length === 0) {
      return NextResponse.json(
        { error: "Judul, ringkasan, dan minimal 1 langkah mitigasi wajib diisi." },
        { status: 400 },
      );
    }

    const baseSlug = slugify(title);
    const exists = await db.educationContent.findUnique({ where: { slug: baseSlug } });
    const slug = exists ? `${baseSlug}-${Date.now().toString().slice(-4)}` : baseSlug;
    const count = await db.educationContent.count();

    const r = await db.educationContent.create({
      data: {
        slug,
        title,
        category,
        summary,
        contextLosari: contextLosari || summary,
        stepsJson: JSON.stringify(steps),
        sortOrder: Number.isFinite(Number(body?.sortOrder)) ? Number(body.sortOrder) : count + 1,
        published: body?.published !== false,
      },
    });

    return NextResponse.json(
      {
        item: {
          id: r.id,
          slug: r.slug,
          title: r.title,
          category: r.category,
          summary: r.summary,
          contextLosari: r.contextLosari,
          steps: parseSteps(r.stepsJson),
          sortOrder: r.sortOrder,
          published: r.published,
          updatedAt: r.updatedAt,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menambah materi edukasi." },
      { status: 500 },
    );
  }
}
