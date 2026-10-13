"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { callEngine, explainResult, type Penjelasan } from "@/lib/engine";
import { formNumber, formString } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { HasilKompatibilitas } from "@/lib/types";
import { formValues } from "@/lib/validation";

export type KompatState =
  | { values?: Record<string, string>; errors?: Record<string, string[]>; message?: string; hasil?: HasilKompatibilitas; penjelasan?: Penjelasan | null }
  | undefined;

/** Modul C (C-1 s.d. C-5): aturan if-else tegangan baterai vs inverter. */
export async function runCompatibility(_prev: KompatState, fd: FormData): Promise<KompatState> {
  await requireAdmin();
  const values = formValues(fd);
  const input = {
    tegangan_baterai_v: formNumber(fd, "vBaterai"),
    tegangan_inverter_nominal_v: formNumber(fd, "vNominal"),
    tegangan_inverter_min_v: formNumber(fd, "vMin"),
    tegangan_inverter_maks_v: formNumber(fd, "vMaks"),
    daya_inverter_kw: formNumber(fd, "kwInverter"),
    daya_puncak_kw: formNumber(fd, "kwPuncak"),
    grade: formString(fd, "grade") || undefined,
    soh: formNumber(fd, "soh"),
    jumlah_paket: formNumber(fd, "paket"),
    kapasitas_paket_kwh: formNumber(fd, "kapasitas"),
  };
  const errors: Record<string, string[]> = {};
  const req: [keyof typeof input, string][] = [
    ["tegangan_baterai_v", "vBaterai"],
    ["tegangan_inverter_nominal_v", "vNominal"],
    ["tegangan_inverter_min_v", "vMin"],
    ["tegangan_inverter_maks_v", "vMaks"],
  ];
  for (const [k, f] of req) {
    const v = input[k] as number | undefined;
    if (v === undefined || Number.isNaN(v) || v <= 0) errors[f] = ["Wajib diisi, lebih dari 0."];
  }
  for (const [k, f] of [["daya_inverter_kw", "kwInverter"], ["daya_puncak_kw", "kwPuncak"], ["kapasitas_paket_kwh", "kapasitas"]] as const) {
    const v = input[k];
    if (v !== undefined && (Number.isNaN(v) || v <= 0)) errors[f] = ["Harus lebih dari 0."];
  }
  if (input.soh !== undefined && (Number.isNaN(input.soh) || input.soh < 0 || input.soh > 100)) errors.soh = ["SoH 0–100%."];
  if (input.jumlah_paket !== undefined && (!Number.isInteger(input.jumlah_paket) || input.jumlah_paket < 1)) errors.paket = ["Bilangan bulat ≥ 1."];
  if (Object.keys(errors).length) return { values, errors, message: "Periksa kembali isian yang ditandai." };

  const res = await callEngine<HasilKompatibilitas>("compatibility", input);
  if (!res.ok) return { values, message: res.error };

  const bateraiId = formString(fd, "bateraiId") || null;
  const rencanaId = formString(fd, "rencanaId") || null;
  await prisma.cekKompatibilitas.create({
    data: { bateraiId, rencanaId, masukan: input, hasil: res.data, status: res.data.status, versiKonfigurasi: res.versiKonfigurasi },
  });
  if (bateraiId) revalidatePath(`/baterai/${bateraiId}`);
  revalidatePath("/kompatibilitas");
  return { values, hasil: res.data, penjelasan: await explainResult("kompatibilitas", res.data) };
}
