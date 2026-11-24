import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/db-seed";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureSeeded();
    const rows = await db.appSetting.findMany();
    const settings: Record<string, string> = {};
    for (const r of rows) settings[r.key] = r.value;
    return NextResponse.json({ settings });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memuat pengaturan." },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    await ensureSeeded();
    const body = await req.json();
    const entries = body?.settings && typeof body.settings === "object" ? body.settings : body;
    if (!entries || typeof entries !== "object") {
      return NextResponse.json({ error: "Payload pengaturan tidak valid." }, { status: 400 });
    }

    for (const [key, val] of Object.entries(entries)) {
      if (typeof key !== "string" || !key.trim()) continue;
      await db.appSetting.upsert({
        where: { key: key.trim() },
        update: { value: String(val ?? "") },
        create: { key: key.trim(), value: String(val ?? "") },
      });
    }

    const rows = await db.appSetting.findMany();
    const settings: Record<string, string> = {};
    for (const r of rows) settings[r.key] = r.value;
    return NextResponse.json({ settings });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menyimpan pengaturan." },
      { status: 500 },
    );
  }
}
