/* Bluetech — utilitas GIS (client-only saat dipanggil, tanpa import leaflet) */

export const GRID_W = 72;
export const GRID_H = 48;

export function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function polylineLengthKm(pts: [number, number][]): number {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += haversineKm(pts[i - 1], pts[i]);
  return d;
}

export function polygonAreaKm2(ring: [number, number][]): number {
  if (ring.length < 3) return 0;
  const lat0 = ring[0][0];
  const kx = 111.32 * Math.cos((lat0 * Math.PI) / 180);
  const ky = 110.57;
  const pts = ring.map(([la, lo]) => [lo * kx, la * ky]);
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    s += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
  }
  return Math.abs(s / 2);
}

/** Render grid kelas → dataURL (canvas, client-only). */
export function gridClassesToDataUrl(
  classes: Uint8Array,
  colors: string[],
  opts: { skipValues?: number[]; alpha?: number } = {}
): string {
  const scale = 8;
  const canvas = document.createElement("canvas");
  canvas.width = GRID_W * scale;
  canvas.height = GRID_H * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const skip = new Set(opts.skipValues ?? []);
  for (let cy = 0; cy < GRID_H; cy++) {
    for (let cx = 0; cx < GRID_W; cx++) {
      const idx = cy * GRID_W + cx;
      const c = classes[idx];
      if (skip.has(c)) continue;
      ctx.globalAlpha = opts.alpha ?? 0.62;
      ctx.fillStyle = colors[c] ?? "#999";
      ctx.fillRect(cx * scale, cy * scale, scale, scale);
    }
  }
  ctx.globalAlpha = 1;
  return canvas.toDataURL();
}
