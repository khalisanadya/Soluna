"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePemasok } from "@/lib/auth";
import { assessWithTrainedModel } from "@/lib/battery-model";
import { explainResult } from "@/lib/engine";
import { getActiveConfig } from "@/lib/config";
import { z } from "zod";
import { PENILAIAN_FIELDS, formValues, penilaianSchema, pick, type FormState } from "@/lib/validation";
import { prisma } from "@/lib/prisma";
import type { HasilPenilaian } from "@/lib/types";

/** Assessment pemasok: seluruh hasil prediksi berasal dari model terlatih yang dikonfigurasi melalui ENV. */
export async function runAssessment(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requirePemasok();
  const values = formValues(fd);

  // Semua kolom wajib; aturan yang sama dipakai formulir di peramban.
  const parsed = penilaianSchema.safeParse(pick(fd, PENILAIAN_FIELDS));
  if (!parsed.success) return { values, errors: z.flattenError(parsed.error).fieldErrors, message: "Periksa kembali isian yang ditandai." };
  const d = parsed.data;
  const bateraiId = d.bateraiId;
  const baterai = await prisma.baterai.findFirst({ where: { id: bateraiId, pemasokId: user.pemasokId } });
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

  let model;
  try {
    model = await assessWithTrainedModel(input);
  } catch (error) {
    return { values, message: error instanceof Error ? error.message : "Penilaian model gagal." };
  }
  const { data: config, versi: versiKonfigurasi } = await getActiveConfig();
  const h: HasilPenilaian = {
    soh: model.state_of_health_pct.mid,
    grade: model.grade,
    rentang_grade: `${model.grade_range.worst_case}–${model.grade_range.best_case}`,
    keputusan: config.keputusan[model.grade],
    sisa_umur: {
      bawah: model.remaining_life_cycles.lower,
      tengah: model.remaining_life_cycles.mid,
      atas: model.remaining_life_cycles.upper,
      satuan: "siklus",
    },
    sisa_umur_siklus: {
      bawah: model.remaining_life_cycles.lower,
      tengah: model.remaining_life_cycles.mid,
      atas: model.remaining_life_cycles.upper,
    },
    keyakinan: model.confidence,
    kelengkapan_data: model.input_completeness,
    penggantian: { tengah: null, paling_cepat: null, paling_lambat: null, segera: model.grade === "D" },
    model: { versi: model.model.version, dilatih_pada: model.model.trained_at, dataset: model.model.dataset },
    peringatan_model: model.warnings,
    versi_model: model.model.version,
    langkah: [],
    nilai_bawaan: [],
    tanggal_penilaian: new Date().toISOString().slice(0, 10),
    kerangka: "Hasil berasal dari model kesehatan baterai terlatih (indikatif, bukan sertifikasi).",
    jalur_daur_ulang: model.grade === "D" || model.state_of_health_pct.mid < config.siklus_hidup.ambang_penggantian_soh,
  };
  // Penjelasan bersifat pelengkap; nilai assessment tetap berasal dari model terlatih.
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
        sisaUmurBawah: null,
        sisaUmurTengah: null,
        sisaUmurAtas: null,
        sisaUmurSiklusBawah: model.remaining_life_cycles.lower,
        sisaUmurSiklusTengah: model.remaining_life_cycles.mid,
        sisaUmurSiklusAtas: model.remaining_life_cycles.upper,
        keyakinan: h.keyakinan,
        tanggalGanti: null,
        penjelasan: penjelasan ?? undefined,
        versiKonfigurasi,
        versiModel: model.model.version,
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
