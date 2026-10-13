"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { callEngine } from "@/lib/engine";
import { formNumber, formString } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { HasilPenilaian } from "@/lib/types";
import { formValues, type FormState } from "@/lib/validation";

/** D-3: admin memasukkan pembacaan SoH berkala (input manual, bukan telemetri). */
export async function addSohReading(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const values = formValues(fd);
  const bateraiId = formString(fd, "bateraiId");
  const soh = formNumber(fd, "soh");
  const tgl = formString(fd, "tanggal");
  const errors: Record<string, string[]> = {};
  if (!bateraiId) errors.bateraiId = ["Pilih baterai."];
  if (soh === undefined || Number.isNaN(soh) || soh < 0 || soh > 100) errors.soh = ["SoH 0–100%."];
  const date = tgl ? new Date(tgl) : new Date();
  if (Number.isNaN(date.getTime()) || date.getTime() > Date.now() + 86400000) errors.tanggal = ["Tanggal tidak valid atau di masa depan."];
  if (Object.keys(errors).length) return { values, errors, message: "Periksa kembali isian." };

  const b = await prisma.baterai.findUnique({ where: { id: bateraiId }, include: { bacaanSoh: { orderBy: { tanggal: "desc" }, take: 1 } } });
  if (!b) return { values, message: "Baterai tidak ditemukan." };
  await prisma.bacaanSoh.create({ data: { bateraiId, soh: soh!, tanggal: date, sumber: "MANUAL", catatan: formString(fd, "catatan") || null, dibuatId: user.id } });

  // Pembacaan terbaru memperbarui SoH dan grade baterai. Grade ditentukan mesin hitung
  // (SoH berkala setara kapasitas aktual = kapasitas awal × SoH).
  const latest = b.bacaanSoh[0];
  if (!latest || date >= latest.tanggal) {
    const res = await callEngine<HasilPenilaian>("assess", {
      kapasitas_awal_kwh: b.kapasitasAwalKwh,
      kapasitas_aktual_kwh: (b.kapasitasAwalKwh * soh!) / 100,
    });
    await prisma.baterai.update({
      where: { id: bateraiId },
      data: { sohTerakhir: soh, status: "DINILAI", ...(res.ok ? { gradeTerakhir: res.data.grade } : {}) },
    });
  }
  revalidatePath("/siklus-hidup");
  revalidatePath(`/baterai/${bateraiId}`);
  return { ok: true, message: "Pembacaan SoH tersimpan." };
}
