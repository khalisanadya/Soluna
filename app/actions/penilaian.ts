"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { callEngine, explainResult } from "@/lib/engine";
import { formValues, type FormState } from "@/lib/validation";
import { formNumber, formString } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { HasilPenilaian } from "@/lib/types";

/** Modul A: penilaian baterai (A-1 s.d. A-10). Angka dihitung mesin hitung. */
export async function runAssessment(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const values = formValues(fd);
  const bateraiId = formString(fd, "bateraiId");
  const baterai = bateraiId ? await prisma.baterai.findUnique({ where: { id: bateraiId } }) : null;
  if (!baterai) return { values, errors: { bateraiId: ["Pilih baterai yang akan dinilai."] }, message: "Pilih baterai terlebih dahulu." };

  const pct = (k: string) => {
    const n = formNumber(fd, k);
    return n === undefined ? undefined : n / 100;
  };
  const input = {
    kapasitas_awal_kwh: formNumber(fd, "kapasitasAwal"),
    kapasitas_aktual_kwh: formNumber(fd, "kapasitasAktual"),
    usia_tahun: formNumber(fd, "usia"),
    jumlah_siklus: formNumber(fd, "siklus"),
    hambatan_internal_mohm: formNumber(fd, "hambatan"),
    jenis_kimia: formString(fd, "kimia") || undefined,
    kedalaman_pengosongan: pct("dod"),
    frekuensi_pengisian_cepat: pct("pengisianCepat"),
    suhu_rata_c: formNumber(fd, "suhu"),
  };

  // NF-4: validasi kelengkapan dan rentang sebelum perhitungan.
  const errors: Record<string, string[]> = {};
  const check = (key: string, v: number | undefined, ok: (n: number) => boolean, msg: string) => {
    if (v !== undefined && (Number.isNaN(v) || !ok(v))) errors[key] = [msg];
  };
  if (input.kapasitas_awal_kwh === undefined) errors.kapasitasAwal = ["Kapasitas awal wajib diisi."];
  check("kapasitasAwal", input.kapasitas_awal_kwh, (n) => n > 0 && n <= 1000, "Kapasitas awal 0–1.000 kWh.");
  check("kapasitasAktual", input.kapasitas_aktual_kwh, (n) => n >= 0 && n <= (input.kapasitas_awal_kwh ?? Infinity) * 1.05, "Kapasitas aktual tidak boleh melebihi kapasitas awal.");
  check("usia", input.usia_tahun, (n) => n >= 0 && n <= 30, "Usia 0–30 tahun.");
  check("siklus", input.jumlah_siklus, (n) => Number.isInteger(n) && n >= 0, "Jumlah siklus bilangan bulat ≥ 0.");
  check("hambatan", input.hambatan_internal_mohm, (n) => n >= 0 && n <= 10000, "Hambatan internal tidak valid.");
  check("dod", input.kedalaman_pengosongan, (n) => n >= 0 && n <= 1, "Kedalaman pengosongan 0–100%.");
  check("pengisianCepat", input.frekuensi_pengisian_cepat, (n) => n >= 0 && n <= 1, "Frekuensi pengisian cepat 0–100%.");
  check("suhu", input.suhu_rata_c, (n) => n >= -20 && n <= 80, "Suhu −20 sampai 80 °C.");
  if (Object.keys(errors).length) return { values, errors, message: "Periksa kembali isian yang ditandai." };

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
