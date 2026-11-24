import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const cwd = process.cwd();
const dbDir = path.join(cwd, "db");
mkdirSync(dbDir, { recursive: true });

// Pastikan file database SQLite tersedia sebelum server menerima permintaan pertama
const dbUrl = process.env.DATABASE_URL || "file:../db/custom.db";
const rawDbPath = dbUrl.startsWith("file:") ? dbUrl.slice(5) : "../db/custom.db";
const resolvedDbPath = path.isAbsolute(rawDbPath)
  ? rawDbPath
  : path.resolve(cwd, "prisma", rawDbPath);

if (!existsSync(resolvedDbPath)) {
  console.log("[bluetech] Menginisialisasi database SQLite:", resolvedDbPath);
  const prismaBin = path.join(cwd, "node_modules", "prisma", "build", "index.js");
  const push = spawnSync(
    process.execPath,
    [prismaBin, "db", "push", "--skip-generate", "--accept-data-loss"],
    { cwd, env: { ...process.env, DATABASE_URL: dbUrl }, stdio: "inherit" },
  );
  if (push.status !== 0) {
    console.error("[bluetech] Gagal menjalankan prisma db push.");
    process.exit(push.status ?? 1);
  }
}

const port = process.env.PORT || "3000";
const host = process.env.HOSTNAME || "0.0.0.0";
const nextBin = path.join(cwd, "node_modules", "next", "dist", "bin", "next");

const nodeArgs = [];
// Pada paket gratis Render (RAM 512 MB), batasi heap V8 agar server tetap stabil
if (process.env.RENDER === "true" && !(process.env.NODE_OPTIONS || "").includes("--max-old-space-size")) {
  nodeArgs.push("--max-old-space-size=400");
}
nodeArgs.push(nextBin, "start", "-H", host, "-p", port);

console.log(`[bluetech] Menjalankan server produksi pada http://${host}:${port}`);
const child = spawn(process.execPath, nodeArgs, {
  cwd,
  env: { ...process.env, NODE_ENV: "production", DATABASE_URL: dbUrl },
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (!child.killed) child.kill(signal);
  });
}

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
