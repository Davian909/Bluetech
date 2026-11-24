/**
 * Menyesuaikan Prisma Client secara otomatis antara:
 * - PostgreSQL (Vercel + Neon): bila DATABASE_URL / POSTGRES_PRISMA_URL diawali postgres(ql)://
 * - SQLite (lokal VS Code): bila DATABASE_URL berupa file:... atau belum diatur
 */

import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const cwd = process.cwd();
const generateOnly = process.argv.includes("--generate-only");
const prismaBin = path.join(cwd, "node_modules", "prisma", "build", "index.js");

const rawDbUrl = (process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || "").trim();
const isPostgres = rawDbUrl.startsWith("postgres://") || rawDbUrl.startsWith("postgresql://");
const schemaFile = isPostgres
  ? path.join(cwd, "prisma", "schema.postgres.prisma")
  : path.join(cwd, "prisma", "schema.prisma");

function runPrisma(args, extraEnv = {}) {
  const res = spawnSync(process.execPath, [prismaBin, ...args], {
    cwd,
    env: { ...process.env, ...extraEnv },
    stdio: "inherit",
  });
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
}

console.log(
  `[bluetech] Prisma mode: ${isPostgres ? "PostgreSQL (Cloud/Vercel)" : "SQLite (Lokal)"} -> ${path.basename(schemaFile)}`,
);

// 1. Generate Prisma Client sesuai provider database aktif
runPrisma(["generate", `--schema=${schemaFile}`], isPostgres ? { DATABASE_URL: rawDbUrl } : {});

if (generateOnly) {
  process.exit(0);
}

// 2. Sinkronkan tabel database otomatis saat build di PostgreSQL (Vercel + Neon)
if (isPostgres) {
  const pushUrl =
    (process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || rawDbUrl).trim();
  console.log("[bluetech] Menyinkronkan skema tabel ke PostgreSQL (Neon)...");
  runPrisma(
    ["db", "push", `--schema=${schemaFile}`, "--skip-generate", "--accept-data-loss"],
    { DATABASE_URL: pushUrl },
  );
} else {
  // Di lokal, pastikan folder db/ ada tanpa menyentuh db/custom.db yang sudah ada
  mkdirSync(path.join(cwd, "db"), { recursive: true });
  const localDb = path.join(cwd, "db", "custom.db");
  if (!existsSync(localDb) && !process.env.VERCEL) {
    console.log("[bluetech] Membuat database SQLite lokal baru...");
    runPrisma(
      ["db", "push", `--schema=${schemaFile}`, "--skip-generate", "--accept-data-loss"],
      { DATABASE_URL: rawDbUrl || "file:../db/custom.db" },
    );
  }
}
