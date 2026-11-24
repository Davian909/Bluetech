import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/db-seed";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureSeeded();
    const [
      datasetTotal,
      datasetPublic,
      datasetNeedCheck,
      attractionTotal,
      attractionActive,
      reports,
      educationTotal,
      educationPublished,
      actions,
    ] = await Promise.all([
      db.spatialDataset.count(),
      db.spatialDataset.count({ where: { visiblePublic: true } }),
      db.spatialDataset.count({ where: { validationStatus: { not: "Tervalidasi" } } }),
      db.tourismAttraction.count(),
      db.tourismAttraction.count({ where: { active: true } }),
      db.citizenReport.findMany({ orderBy: { createdAt: "desc" } }),
      db.educationContent.count(),
      db.educationContent.count({ where: { published: true } }),
      db.mitigationAction.findMany({ orderBy: { createdAt: "desc" } }),
    ]);

    const reportCounts = {
      total: reports.length,
      diterima: reports.filter((r) => r.status === "diterima").length,
      diproses: reports.filter((r) => r.status === "diproses").length,
      selesai: reports.filter((r) => r.status === "selesai").length,
    };

    const actionCounts = {
      total: actions.length,
      berjalan: actions.filter((a) => a.status === "Berjalan").length,
      selesai: actions.filter((a) => a.status === "Selesai").length,
      avgProgress:
        actions.length > 0
          ? Math.round(actions.reduce((s, a) => s + a.progress, 0) / actions.length)
          : 0,
    };

    return NextResponse.json({
      datasets: { total: datasetTotal, visiblePublic: datasetPublic, needCheck: datasetNeedCheck },
      attractions: { total: attractionTotal, active: attractionActive },
      reports: reportCounts,
      recentReports: reports.slice(0, 6),
      education: { total: educationTotal, published: educationPublished },
      actions: actionCounts,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memuat ringkasan dashboard." },
      { status: 500 },
    );
  }
}
