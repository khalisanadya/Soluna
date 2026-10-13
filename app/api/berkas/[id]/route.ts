import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readUpload } from "@/lib/storage";

// Sajikan berkas baterai hanya untuk admin atau pemasok pemiliknya.
export async function GET(_req: Request, ctx: RouteContext<"/api/berkas/[id]">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("Tidak diizinkan", { status: 401 });
  const berkas = await prisma.berkasBaterai.findUnique({ where: { id }, include: { baterai: { select: { pemasokId: true } } } });
  if (!berkas || (user.peran !== "ADMIN" && berkas.baterai.pemasokId !== user.pemasokId)) {
    return new Response("Tidak ditemukan", { status: 404 });
  }
  try {
    const data = await readUpload(berkas.lokasi);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": berkas.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(berkas.namaBerkas)}"`,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Berkas tidak tersedia", { status: 404 });
  }
}
