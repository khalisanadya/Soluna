import "server-only";
import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import type { CurrentUser } from "./auth";
import { prisma } from "./prisma";

/** AKN-4: pemasok hanya melihat dan mengubah data miliknya. */
export function bateraiScope(user: CurrentUser): Prisma.BateraiWhereInput {
  return user.peran === "ADMIN" ? {} : { pemasokId: user.pemasokId ?? "__none__" };
}

export async function getBateraiForUser(user: CurrentUser, id: string) {
  const b = await prisma.baterai.findFirst({
    where: { id, ...bateraiScope(user) },
    include: {
      pemasok: true,
      penilaian: { orderBy: { createdAt: "desc" }, include: { penilai: { select: { nama: true } } } },
      bacaanSoh: { orderBy: { tanggal: "asc" } },
      asetDesa: true,
    },
  });
  if (!b) notFound();
  return b;
}

export async function nextBateraiKode() {
  const last = await prisma.baterai.findFirst({ orderBy: { kode: "desc" }, select: { kode: true } });
  const n = last ? Number(last.kode.replace(/\D/g, "")) + 1 : 1;
  return `BAT-${String(n).padStart(4, "0")}`;
}

export async function gradeCounts(where: Prisma.BateraiWhereInput = {}) {
  const rows = await prisma.baterai.groupBy({ by: ["gradeTerakhir"], where, _count: true });
  const out = { A: 0, B: 0, C: 0, D: 0, belum: 0 };
  for (const r of rows) {
    if (r.gradeTerakhir && r.gradeTerakhir in out) out[r.gradeTerakhir as "A"] += r._count;
    else out.belum += r._count;
  }
  return out;
}
