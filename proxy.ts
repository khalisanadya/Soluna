import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, decodeSession } from "@/lib/session-token";

const PUBLIC = ["/", "/masuk", "/daftar"];
// Assessment dan paspor adalah alur milik Pemasok; Admin hanya membacanya melalui Data Baterai.
const ADMIN_ONLY = ["/pemasok", "/perencana", "/ketahanan", "/kompatibilitas", "/siklus-hidup", "/riwayat", "/pengaturan"];
const PEMASOK_ONLY = ["/profil"];

const under = (path: string, bases: string[]) => bases.some((b) => path === b || path.startsWith(b + "/"));

// Pemeriksaan optimistis di depan aplikasi. Otorisasi sebenarnya tetap dilakukan di
// lapisan data (lib/auth.ts) dan di setiap Server Action.
export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const session = decodeSession(req.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    if (PUBLIC.includes(path)) return NextResponse.next();
    const url = new URL("/masuk", req.url);
    if (path !== "/dashboard") url.searchParams.set("lanjut", path);
    return NextResponse.redirect(url);
  }
  if (path === "/masuk" || path === "/daftar") return NextResponse.redirect(new URL("/dashboard", req.url));
  if (session.peran === "PEMASOK" && under(path, ADMIN_ONLY)) return NextResponse.redirect(new URL("/dashboard", req.url));
  if (session.peran === "ADMIN" && under(path, PEMASOK_ONLY)) return NextResponse.redirect(new URL("/dashboard", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.png|soluna-logo.png|.*\\.(?:png|jpg|svg|webp)$).*)"],
};
