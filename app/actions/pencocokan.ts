"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Pilih atau batalkan pilihan baterai untuk sebuah rencana desa (disimpan di RencanaDesa.bateraiIds). */
export async function pilihBateraiRencana(fd: FormData) {
  await requireAdmin();
  const rencanaId = String(fd.get("rencanaId") ?? "");
  const bateraiId = String(fd.get("bateraiId") ?? "");
  if (!rencanaId || !bateraiId) return;

  const [rencana, baterai] = await Promise.all([
    prisma.rencanaDesa.findUnique({ where: { id: rencanaId }, select: { bateraiIds: true } }),
    prisma.baterai.findUnique({ where: { id: bateraiId }, select: { id: true } }),
  ]);
  if (!rencana || !baterai) return;

  const sudah = rencana.bateraiIds.includes(bateraiId);
  await prisma.rencanaDesa.update({
    where: { id: rencanaId },
    data: { bateraiIds: sudah ? rencana.bateraiIds.filter((id) => id !== bateraiId) : [...rencana.bateraiIds, bateraiId] },
  });
  revalidatePath("/pencocokan");
  revalidatePath(`/perencana/${rencanaId}`);
}
