import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-token";

// Dipakai bila sesi valid tetapi pengguna sudah tidak ada: hapus cookie lalu ke /masuk.
export function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/masuk", req.url));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
