"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePemasok } from "@/lib/auth";
import { bateraiScope, nextBateraiKode } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { bateraiSchema, formValues, pick, type FormState } from "@/lib/validation";

const FIELDS = ["jenisKimia", "merek", "model", "kapasitasAwalKwh", "usiaTahun", "kondisi", "teganganNominalV", "jumlahSiklus", "catatan"];

/** Hanya pemasok yang boleh membuat atau mengubah sumber data baterai. */
export async function saveBaterai(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requirePemasok();
  const id = String(fd.get("id") ?? "") || null;
  const values = formValues(fd);

  const parsed = bateraiSchema.safeParse(pick(fd, FIELDS));
  if (!parsed.success) {
    return { values, errors: z.flattenError(parsed.error).fieldErrors, message: "Periksa kembali isian yang ditandai." };
  }

  let bateraiId: string;
  if (id) {
    const own = await prisma.baterai.findFirst({ where: { id, ...bateraiScope(user) }, select: { id: true } });
    if (!own) return { message: "Baterai tidak ditemukan atau bukan milik Anda." };
    await prisma.baterai.update({ where: { id }, data: parsed.data });
    bateraiId = id;
  } else {
    const created = await prisma.baterai.create({ data: { ...parsed.data, pemasokId: user.pemasokId, kode: await nextBateraiKode() } });
    bateraiId = created.id;
  }
  revalidatePath("/baterai");
  redirect(`/baterai/${bateraiId}?tersimpan=1`);
}
