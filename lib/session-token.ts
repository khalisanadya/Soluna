import { createHmac, timingSafeEqual } from "node:crypto";

// Token sesi bertanda tangan HMAC; dipakai bersama oleh proxy.ts dan lib/session.ts.
export const SESSION_COOKIE = "soluna_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type SessionData = { uid: string; peran: "ADMIN" | "PEMASOK"; exp: number };

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET belum diatur di .env");
  return s;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function encodeSession(data: SessionData) {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/**
 * checkExpiry=false dipakai saat render server: masa berlaku sudah ditegakkan oleh proxy.ts
 * pada setiap permintaan (dan oleh maxAge cookie), sehingga render tidak bergantung pada jam.
 */
export function decodeSession(token: string | undefined, checkExpiry = true): SessionData | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as SessionData;
    return !checkExpiry || data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}
