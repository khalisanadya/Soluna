"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { callEngine, explainResult } from "@/lib/engine";
import { z } from "zod";
import { PENILAIAN_FIELDS, formValues, penilaianSchema, pick, type FormState } from "@/lib/validation";
import { prisma } from "@/lib/prisma";
import type { HasilPenilaian } from "@/lib/types";

/** Modul A: penilaian baterai (A-1 s.d. A-10). Angka dihitung mesin hitung. */
export async function runAssessment(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const values = formValues(fd);

  // Semua kolom wajib; aturan yang sama dipakai formulir di peramban.
  const parsed = penilaianSchema.safeParse(pick(fd, PENILAIAN_FIELDS));
  if (!parsed.success) return { values, errors: z.flattenError(parsed.error).fieldErrors, message: "Periksa kembali isian yang ditandai." };
  const d = parsed.data;
  const bateraiId = d.bateraiId;
  const baterai = await prisma.baterai.findUnique({ where: { id: bateraiId } });
  if (!baterai) return { values, errors: { bateraiId: ["Baterai tidak ditemukan."] }, message: "Pilih baterai yang akan dinilai." };

  const input = {
    kapasitas_awal_kwh: d.kapasitasAwal,
    kapasitas_aktual_kwh: d.kapasitasAktual,
    usia_tahun: d.usia,
    jumlah_siklus: d.siklus,
    hambatan_internal_mohm: d.hambatan,
    jenis_kimia: d.kimia,
    kedalaman_pengosongan: d.dod / 100,
    frekuensi_pengisian_cepat: d.pengisianCepat / 100,
    suhu_rata_c: d.suhu,
  };

  const res = await callEngine<HasilPenilaian>("assess", input);
  if (!res.ok) return { values, message: res.error };
  const h = res.data;
  const penjelasan = await explainResult("penilaian", h);

  const penilaian = await prisma.$transaction(async (tx) => {
    const p = await tx.penilaian.create({
      data: {
        bateraiId,
        penilaiId: user.id,
        masukan: input,
        hasil: h,
        soh: h.soh,
        grade: h.grade,
        keputusan: h.keputusan,
        sisaUmurBawah: h.sisa_umur.bawah,
        sisaUmurTengah: h.sisa_umur.tengah,
        sisaUmurAtas: h.sisa_umur.atas,
        keyakinan: h.keyakinan,
        tanggalGanti: new Date(h.penggantian.tengah),
        penjelasan: penjelasan ?? undefined,
        versiKonfigurasi: res.versiKonfigurasi,
        versiModel: res.versiModel,
      },
    });
    await tx.bacaanSoh.create({ data: { bateraiId, soh: h.soh, tanggal: new Date(), sumber: "PENILAIAN", dibuatId: user.id } });
    await tx.baterai.update({
      where: { id: bateraiId },
      data: {
        status: "DINILAI",
        sohTerakhir: h.soh,
        gradeTerakhir: h.grade,
        // Lengkapi data baterai dari form penilaian bila sebelumnya kosong.
        usiaTahun: baterai.usiaTahun ?? input.usia_tahun,
        jumlahSiklus: baterai.jumlahSiklus ?? input.jumlah_siklus,
      },
    });
    return p;
  });

  revalidatePath("/penilaian");
  revalidatePath(`/baterai/${bateraiId}`);
  redirect(`/penilaian/${penilaian.id}?baru=1`);
}
