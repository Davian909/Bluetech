import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/db-seed";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 48) || `dataset_${Date.now()}`
  );
}

export async function GET(req: NextRequest) {
  try {
    await ensureSeeded();
    const onlyPublic = req.nextUrl.searchParams.get("public") === "1";
    const items = await db.spatialDataset.findMany({
      where: onlyPublic ? { visiblePublic: true } : undefined,
      orderBy: [{ dataType: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memuat katalog dataset." },
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
    if (!name) {
      return NextResponse.json({ error: "Nama dataset wajib diisi." }, { status: 400 });
    }

    const baseSlug = slugify(body?.slug ? String(body.slug) : name);
    const exists = await db.spatialDataset.findUnique({ where: { slug: baseSlug } });
    const slug = exists ? `${baseSlug}_${Date.now().toString().slice(-4)}` : baseSlug;

    const item = await db.spatialDataset.create({
      data: {
        slug,
        name,
        category: String(body?.category ?? "Kebencanaan").trim(),
        dataType: String(body?.dataType ?? "Raster").trim(),
        format: String(body?.format ?? "GeoTIFF").trim(),
        source: String(body?.source ?? "inaRISK / BIG / OSM / BMKG").trim(),
        crs: String(body?.crs ?? "EPSG:4326 (WGS 84)").trim(),
        coverage: String(body?.coverage ?? "Kawasan Pantai Losari").trim(),
        fileSize: String(body?.fileSize ?? "—").trim(),
        description: String(body?.description ?? "").trim(),
        note: body?.note ? String(body.note).trim() : null,
        publicUrl: body?.publicUrl ? String(body.publicUrl).trim() : null,
        validationStatus: String(body?.validationStatus ?? "Menunggu").trim(),
        visiblePublic: body?.visiblePublic !== false,
        defaultOn: Boolean(body?.defaultOn),
      },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menambah dataset baru." },
      { status: 500 },
    );
  }
}
