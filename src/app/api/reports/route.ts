import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/db-seed";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureSeeded();
    const items = await db.citizenReport.findMany({
      orderBy: [{ createdAt: "desc" }],
    });
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memuat daftar laporan warga." },
      { status: 500 },
    );
  }
}

/** Dapat dipanggil oleh masyarakat umum (Lapor Masyarakat) maupun Admin. */
export async function POST(req: NextRequest) {
  try {
    await ensureSeeded();
    const body = await req.json();
    const reporterName = String(body?.reporterName ?? "").trim();
    const category = String(body?.category ?? "Lainnya").trim();
    const location = String(body?.location ?? "Anjungan Pantai Losari").trim();
    const description = String(body?.description ?? "").trim();
    const photoName = body?.photoName ? String(body.photoName).trim() : null;

    if (!reporterName || !description) {
      return NextResponse.json(
        { error: "Nama pelapor dan uraian kondisi wajib diisi." },
        { status: 400 },
      );
    }

    const total = await db.citizenReport.count();
    const code = `LP-${String(201 + total + Math.floor(Math.random() * 9)).padStart(4, "0")}`;
    // Pastikan kode unik
    const exists = await db.citizenReport.findUnique({ where: { code } });
    const finalCode = exists ? `LP-${Date.now().toString().slice(-4)}` : code;

    const item = await db.citizenReport.create({
      data: {
        code: finalCode,
        reporterName,
        category,
        location,
        description,
        photoName,
        status: "diterima",
      },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menyimpan laporan warga." },
      { status: 500 },
    );
  }
}
