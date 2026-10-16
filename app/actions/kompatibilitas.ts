"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { callEngine, type Penjelasan } from "@/lib/engine";
import { z } from "zod";
import { formString } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { HasilKompatibilitas } from "@/lib/types";
import { KOMPAT_FIELDS, formValues, kompatSchema, pick } from "@/lib/validation";

export type KompatState =
  | { values?: Record<string, string>; errors?: Record<string, string[]>; message?: string; hasil?: HasilKompatibilitas; penjelasan?: Penjelasan | null }
  | undefined;

/** Modul C (C-1 s.d. C-5): aturan if-else tegangan baterai vs inverter. */
export async function runCompatibility(_prev: KompatState, fd: FormData): Promise<KompatState> {
  await requireAdmin();
  const values = formValues(fd);
  const bateraiId = formString(fd, "bateraiId") || null;
  const rencanaId = formString(fd, "rencanaId") || null;
  // Data baterai selalu dari basis data (bukan isian formulir).
  if (!bateraiId) return { values, errors: { bateraiId: ["Pilih baterai yang akan diperiksa."] }, message: "Pilih baterai terlebih dahulu." };
  const [b, rencana] = await Promise.all([
    prisma.baterai.findUnique({ where: { id: bateraiId } }),
    rencanaId ? prisma.rencanaDesa.findUnique({ where: { id: rencanaId }, select: { hasil: true, bateraiIds: true } }) : null,
  ]);
  // Rencana yang sudah punya baterai hanya boleh diperiksa dengan baterai rencana itu.
  if (rencana?.bateraiIds.length && !rencana.bateraiIds.includes(bateraiId))
    return { values, errors: { bateraiId: ["Baterai harus salah satu yang dipilih di rencana desa."] }, message: "Baterai tidak termasuk rencana desa ini." };
  if (!b || b.sohTerakhir === null || !b.gradeTerakhir) return { values, errors: { bateraiId: ["Baterai belum dinilai."] }, message: "Baterai belum dinilai." };
  if (!b.teganganNominalV) return { values, errors: { bateraiId: ["Tegangan baterai belum diisi pemasok."] }, message: "Tegangan baterai belum diisi pemasok." };
  const raw = pick(fd, KOMPAT_FIELDS);
  raw.vBaterai = String(b.teganganNominalV);
  raw.grade = b.gradeTerakhir;
  raw.soh = String(b.sohTerakhir);
  raw.kapasitas = String(b.kapasitasAwalKwh);
  raw.paket = String((rencana?.hasil as { ringkasan?: { jumlah_paket?: number } } | undefined)?.ringkasan?.jumlah_paket ?? 1);
  // Semua kolom wajib; aturan yang sama dipakai formulir di peramban.
  const parsed = kompatSchema.safeParse(raw);
  if (!parsed.success) return { values, errors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>, message: "Periksa kembali isian yang ditandai." };
  const d = parsed.data;
  const input = {
    tegangan_baterai_v: d.vBaterai,
    tegangan_inverter_nominal_v: d.vNominal,
    tegangan_inverter_min_v: d.vMin,
    tegangan_inverter_maks_v: d.vMaks,
    daya_inverter_kw: d.kwInverter,
    daya_puncak_kw: d.kwPuncak,
    grade: d.grade,
    soh: d.soh,
    jumlah_paket: d.paket,
    kapasitas_paket_kwh: d.kapasitas,
  };

  const res = await callEngine<HasilKompatibilitas>("compatibility", input);
  if (!res.ok) return { values, message: res.error };

  await prisma.cekKompatibilitas.create({
    data: { bateraiId, rencanaId, masukan: input, hasil: res.data, status: res.data.status, versiKonfigurasi: res.versiKonfigurasi },
  });
  if (bateraiId) revalidatePath(`/baterai/${bateraiId}`);
  revalidatePath("/kompatibilitas");
  // Penjelasan teks panjang tidak lagi ditampilkan; tidak diminta agar lebih cepat.
  return { values, hasil: res.data, penjelasan: null };
}

/** Hapus satu pemeriksaan dari riwayat. Langkah rencana desa dan pencocokan ikut memakai pemeriksaan terakhir yang tersisa. */
export async function hapusKompatibilitas(fd: FormData) {
  await requireAdmin();
  const id = formString(fd, "id");
  if (!id) return;
  const r = await prisma.cekKompatibilitas.delete({ where: { id }, select: { bateraiId: true, rencanaId: true } }).catch(() => null);
  revalidatePath("/kompatibilitas");
  revalidatePath("/pencocokan");
  revalidatePath("/riwayat");
  revalidatePath("/dashboard");
  if (r?.bateraiId) revalidatePath(`/baterai/${r.bateraiId}`);
  if (r?.rencanaId) revalidatePath(`/perencana/${r.rencanaId}`);
}
