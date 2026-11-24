import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const ADMIN_COOKIE_NAME = "bluetech_admin_session";

function sha256Buf(value: string): Buffer {
  return crypto.createHash("sha256").update(value, "utf8").digest();
}

export function safeEqual(a: string, b: string): boolean {
  return crypto.timingSafeEqual(sha256Buf(a), sha256Buf(b));
}

export function createAdminSessionToken(user: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(`admin:${user}`).digest("hex");
}

export function getAdminEnvCredentials() {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  return { username, password };
}

export function isAdminRequest(req: NextRequest): boolean {
  const { username, password } = getAdminEnvCredentials();
  if (!username || !password) return false;
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return false;
  return safeEqual(token, createAdminSessionToken(username, password));
}

export function requireAdmin(req: NextRequest): NextResponse | null {
  if (!isAdminRequest(req)) {
    return NextResponse.json(
      { error: "Akses ditolak. Silakan login sebagai Admin terlebih dahulu." },
      { status: 401 },
    );
  }
  return null;
}
