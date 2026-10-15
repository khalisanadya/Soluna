"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePemasok } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formValues, pick, profilPemasokSchema, type FormState } from "@/lib/validation";

/** PSK-4: pemasok memperbarui profil perusahaan dan kontak miliknya sendiri. */
export async function updateProfil(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requirePemasok();
  const parsed = profilPemasokSchema.safeParse(
    pick(fd, [
      "namaPenanggungJawab",
      "namaPerusahaan",
      "alamat",
      "kota",
      "provinsi",
      "telepon",
      "emailPerusahaan",
      "deskripsi",
      "jenisBaterai",
      "alamatPenyimpanan",
      "kotaPenyimpanan",
      "provinsiPenyimpanan",
    ]),
  );
  if (!parsed.success) {
    return { values: formValues(fd), errors: z.flattenError(parsed.error).fieldErrors, message: "Periksa kembali isian yang ditandai." };
  }
  const d = parsed.data;
  // Provinsi tanpa kabupaten/kota dan tanpa alamat: lokasi penyimpanan dianggap tidak diisi.
  const adaPenyimpanan = Boolean(d.alamatPenyimpanan || d.kotaPenyimpanan);
  await prisma.pemasok.update({
    where: { id: user.pemasokId },
    data: {
      ...d,
      deskripsi: d.deskripsi ?? null,
      jenisBaterai: d.jenisBaterai ?? null,
      alamatPenyimpanan: d.alamatPenyimpanan ?? null,
      kotaPenyimpanan: adaPenyimpanan ? (d.kotaPenyimpanan ?? null) : null,
      provinsiPenyimpanan: adaPenyimpanan ? (d.provinsiPenyimpanan ?? null) : null,
      user: { update: { nama: d.namaPenanggungJawab } },
    },
  });
  revalidatePath("/profil");
  return { ok: true, message: "Profil perusahaan tersimpan.", values: formValues(fd) };
}
