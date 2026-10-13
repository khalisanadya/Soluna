"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { bateraiScope, nextBateraiKode } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { ALLOWED_TYPES, MAX_FILE_BYTES, deleteUpload, saveUpload } from "@/lib/storage";
import { bateraiSchema, formValues, pick, type FormState } from "@/lib/validation";

const FIELDS = ["jenisKimia", "merek", "model", "kapasitasAwalKwh", "usiaTahun", "kondisi", "teganganNominalV", "jumlahSiklus", "catatan"];

function validateFiles(files: File[]): string | null {
  if (files.length > 6) return "Maksimal 6 berkas sekali unggah.";
  for (const f of files) {
    if (!ALLOWED_TYPES[f.type]) return `${f.name}: format tidak didukung. Gunakan JPG, PNG, WEBP, atau PDF.`;
    if (f.size > MAX_FILE_BYTES) return `${f.name}: ukuran melebihi 4 MB.`;
  }
  return null;
}

async function storeFiles(bateraiId: string, files: File[]) {
  for (const f of files) {
    const lokasi = await saveUpload(f);
    await prisma.berkasBaterai.create({
      data: { bateraiId, jenis: ALLOWED_TYPES[f.type], namaBerkas: f.name.slice(0, 200), mimeType: f.type, ukuran: f.size, lokasi },
    });
  }
}

const getFiles = (fd: FormData) => fd.getAll("berkas").filter((f): f is File => f instanceof File && f.size > 0);

/** PSK-5, PSK-6: pemasok menambah/mengubah baterai miliknya; admin dapat mengelola semua. */
export async function saveBaterai(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = String(fd.get("id") ?? "") || null;
  const values = formValues(fd);

  const parsed = bateraiSchema.safeParse(pick(fd, FIELDS));
  const files = getFiles(fd);
  const fileError = validateFiles(files);
  if (!parsed.success || fileError) {
    return {
      values,
      errors: { ...(parsed.success ? {} : z.flattenError(parsed.error).fieldErrors), ...(fileError ? { berkas: [fileError] } : {}) },
      message: "Periksa kembali isian yang ditandai.",
    };
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
  await storeFiles(bateraiId, files);
  revalidatePath("/baterai");
  redirect(`/baterai/${bateraiId}?tersimpan=1`);
}

/** PSK-8: unggah foto dan dokumen pendukung. */
export async function uploadBerkas(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = String(fd.get("bateraiId") ?? "");
  const own = await prisma.baterai.findFirst({ where: { id, ...bateraiScope(user) }, select: { id: true } });
  if (!own) return { message: "Baterai tidak ditemukan." };
  const files = getFiles(fd);
  if (!files.length) return { message: "Pilih minimal satu berkas." };
  const err = validateFiles(files);
  if (err) return { message: err };
  await storeFiles(id, files);
  revalidatePath(`/baterai/${id}`);
  return { ok: true, message: `${files.length} berkas berhasil diunggah.` };
}

export async function deleteBerkas(fd: FormData) {
  const user = await requireUser();
  const berkas = await prisma.berkasBaterai.findUnique({ where: { id: String(fd.get("id")) }, include: { baterai: true } });
  if (!berkas) return;
  if (user.peran !== "ADMIN" && berkas.baterai.pemasokId !== user.pemasokId) return;
  await prisma.berkasBaterai.delete({ where: { id: berkas.id } });
  await deleteUpload(berkas.lokasi);
  revalidatePath(`/baterai/${berkas.bateraiId}`);
}
