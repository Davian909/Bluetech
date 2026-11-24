import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

import {
  getBaseLayers,
  PEMANFAATAN,
  GRID_W,
  GRID_H,
  CELL_AREA_KM2,
  cellToLatLon,
  ahpWeights,
  CRITERIA_GROUPS,
  CRITERIA_LABEL,
  type CriterionId,
} from "@/lib/analysis-engine";

export const runtime = "nodejs";
export const maxDuration = 60;

const CRIT_IDS: CriterionId[] = [
  "kedalaman",
  "kemiringan",
  "gelombang",
  "arus",
  "angin",
  "ekosistem",
  "jarakPantai",
  "jarakPelabuhan",
  "aksesJalan",
  "risikoBencana",
  "perubahanGarisPantai",
  "kesesuaianZona",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const configId: string = body.configId;
    const kedalamanMin: number = typeof body.kedalamanMin === "number" ? body.kedalamanMin : 10;
    const nIter: number = Math.min(6000, Math.max(500, Number(body.nIter) || 3000));

    const cfg = PEMANFAATAN.find((p) => p.id === configId);
    if (!cfg) {
      return NextResponse.json({ error: "configId tidak dikenal" }, { status: 400 });
    }

    const L = getBaseLayers();
    const n = GRID_W * GRID_H;

    // ---- bobot kriteria akhir (identik dengan runSuitability di mesin JS) ----
    const ahp = ahpWeights(cfg.ahpMatrix);
    const gw: Record<string, number> = {};
    CRITERIA_GROUPS.forEach((g, i) => (gw[g.id] = ahp.weights[i]));
    const groupOf: Record<string, string> = {
      kedalaman: "batimetri",
      kemiringan: "batimetri",
      gelombang: "oseanografi",
      arus: "oseanografi",
      angin: "oseanografi",
      ekosistem: "ekosistem",
      jarakPantai: "aksesibilitas",
      jarakPelabuhan: "aksesibilitas",
      aksesJalan: "aksesibilitas",
      risikoBencana: "kebencanaan",
      perubahanGarisPantai: "kebencanaan",
      kesesuaianZona: "tataruang",
    };
    const ids = Object.keys(groupOf) as CriterionId[];
    const critWeights: Record<string, number> = {};
    for (const g of CRITERIA_GROUPS) {
      const subs = ids.filter((c) => groupOf[c] === g.id);
      const subW = subs.map((c) => cfg.subWeights[c] ?? 1 / subs.length);
      const sum = subW.reduce((a, v) => a + v, 0);
      subs.forEach((c, i) => (critWeights[c] = gw[g.id] * (subW[i] / sum)));
    }
    const weights = CRIT_IDS.map((c) => critWeights[c] ?? 0);

    // ---- bangun matriks skor kriteria untuk sel laut yang valid ----
    const rows: number[][] = [];
    const jsScores: number[] = [];
    const latlons: [number, number][] = [];

    for (let i = 0; i < n; i++) {
      if (L.isLand[i]) continue;
      if (cfg.constraints(L, i)) continue;
      const dAdj =
        L.depth[i] < kedalamanMin * 0.6
          ? 0
          : Math.min(100, (L.depth[i] / Math.max(kedalamanMin, 0.5)) * 100);
      const s =
        0.7 * cfg.score.kedalaman(L, i) +
        0.3 * Math.min(100, dAdj);
      const feats = [
        s,
        cfg.score.kemiringan(L, i),
        cfg.score.gelombang(L, i),
        cfg.score.arus(L, i),
        cfg.score.angin(L, i),
        cfg.score.ekosistem(L, i),
        cfg.score.jarakPantai(L, i),
        cfg.score.jarakPelabuhan(L, i),
        cfg.score.aksesJalan(L, i),
        cfg.score.risikoBencana(L, i),
        cfg.score.perubahanGarisPantai(L, i),
        cfg.score.kesesuaianZona(L, i),
      ];
      let total = 0;
      CRIT_IDS.forEach((c, k) => {
        total += feats[k] * (critWeights[c] ?? 0);
      });
      rows.push(feats.map((v) => Math.max(0, Math.min(100, v))));
      jsScores.push(Math.max(0, Math.min(100, total)));
      const { lat, lon } = cellToLatLon(i);
      latlons.push([Number(lat.toFixed(4)), Number(lon.toFixed(4))]);
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "Tidak ada sel laut valid untuk config ini" }, { status: 400 });
    }

    // ---- jalankan engine Python ----
    const payload = {
      critIds: CRIT_IDS,
      critLabels: CRIT_IDS.reduce<Record<string, string>>((acc, c) => {
        acc[c] = CRITERIA_LABEL[c];
        return acc;
      }, {}),
      weights,
      X: rows,
      jsScores,
      threshold: { s1: 78, s2: 62, s3: 47 },
      nIter,
      sigma: 4.0,
      seed: 42,
      latlons,
    };

    // ---- jalankan engine Python ----
    const script = path.join(process.cwd(), "python", "mcda_engine.py");
    const result = await new Promise<string>((resolve, reject) => {
      const py = spawn(process.env.PYTHON_BIN || "python3", [script], {
        cwd: process.cwd(),
        env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      });
      let out = "";
      let err = "";
      const timer = setTimeout(() => {
        py.kill("SIGKILL");
        reject(new Error("Timeout: engine Python tidak merespons"));
      }, 50_000);
      py.stdout.on("data", (d) => (out += d.toString()));
      py.stderr.on("data", (d) => (err += d.toString()));
      py.on("error", (e) => {
        clearTimeout(timer);
        reject(e);
      });
      py.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0) resolve(out);
        else reject(new Error(`Engine Python exit ${code}: ${err.slice(0, 400)}`));
      });
      py.stdin.write(JSON.stringify(payload));
      py.stdin.end();
    });

    const parsed = JSON.parse(result);
    return NextResponse.json({
      ...parsed,
      meta: {
        configId: cfg.id,
        configLabel: cfg.label,
        kedalamanMin,
        areaKm2: Number((rows.length * CELL_AREA_KM2).toFixed(1)),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Kesalahan tidak diketahui";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
