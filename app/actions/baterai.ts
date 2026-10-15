"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { bateraiScope, nextBateraiKode } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { bateraiSchema, formValues, pick, type FormState } from "@/lib/validation";

const FIELDS = ["jenisKimia", "merek", "model", "kapasitasAwalKwh", "usiaTahun", "kondisi", "teganganNominalV", "jumlahSiklus", "catatan"];

/** PSK-5, PSK-6: pemasok menambah/mengubah baterai miliknya; admin dapat mengelola semua. */
export async function saveBaterai(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = String(fd.get("id") ?? "") || null;
  const values = formValues(fd);

  const parsed = bateraiSchema.safeParse(pick(fd, FIELDS));
  if (!parsed.success) {
    return { values, errors: z.flattenError(parsed.error).fieldErrors, message: "Periksa kembali isian yang ditandai." };
  }

  let pemasokId = user.pemasokId;
  if (user.peran === "ADMIN") {
    pemasokId = String(fd.get("pemasokId") ?? "");
    if (!pemasokId || !(await prisma.pemasok.findUnique({ where: { id: pemasokId }, select: { id: true } }))) {
      return { values, errors: { pemasokId: ["Pilih pemasok."] }, message: "Periksa kembali isian yang ditandai." };
    }
  }
  if (!pemasokId) return { message: "Akun ini tidak terhubung ke pemasok." };

  let bateraiId: string;
  if (id) {
    const own = await prisma.baterai.findFirst({ where: { id, ...bateraiScope(user) }, select: { id: true } });
    if (!own) return { message: "Baterai tidak ditemukan atau bukan milik Anda." };
    await prisma.baterai.update({ where: { id }, data: { ...parsed.data, ...(user.peran === "ADMIN" ? { pemasokId } : {}) } });
    bateraiId = id;
  } else {
    const created = await prisma.baterai.create({ data: { ...parsed.data, pemasokId, kode: await nextBateraiKode() } });
    bateraiId = created.id;
  }
  revalidatePath("/baterai");
  redirect(`/baterai/${bateraiId}?tersimpan=1`);
}
