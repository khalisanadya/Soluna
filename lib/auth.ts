import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { getSession } from "./session";

export type CurrentUser = {
  id: string;
  nama: string;
  username: string;
  peran: "ADMIN" | "PEMASOK";
  pemasokId: string | null;
  namaPerusahaan: string | null;
};

// Data Access Layer: satu tempat membaca sesi dan pengguna, di-dedup per permintaan.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.uid },
    select: { id: true, nama: true, username: true, peran: true, pemasok: { select: { id: true, namaPerusahaan: true } } },
  });
  if (!user) return null;
  return {
    id: user.id,
    nama: user.nama,
    username: user.username,
    peran: user.peran,
    pemasokId: user.pemasok?.id ?? null,
    namaPerusahaan: user.pemasok?.namaPerusahaan ?? null,
  };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/api/keluar");
  return user;
}

// AKN-4: menu dan data dibatasi sesuai peran.
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.peran !== "ADMIN") redirect("/dashboard");
  return user;
}

export async function requirePemasok(): Promise<CurrentUser & { pemasokId: string }> {
  const user = await requireUser();
  if (user.peran !== "PEMASOK" || !user.pemasokId) redirect("/dashboard");
  return user as CurrentUser & { pemasokId: string };
}
