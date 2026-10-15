"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { callEngine, explainResult } from "@/lib/engine";
import { prisma } from "@/lib/prisma";
import type { HasilRencana } from "@/lib/types";
import { RENCANA_FIELDS, formValues, pick, validasiRencana, type FormState } from "@/lib/validation";

/** Modul B1: Perencana Desa (P-1 s.d. P-13). */
export async function runPlan(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const values = formValues(fd);

  // Semua kolom wajib; aturan yang sama dipakai formulir di peramban.
  const v = validasiRencana(pick(fd, RENCANA_FIELDS));
  if (!v.ok) return { values, errors: v.errors, message: "Periksa kembali isian yang ditandai." };
  const d = v.data;

  // P-12: paket dari baterai yang sudah dinilai, atau profil paket yang diisi.
  let paket: Record<string, string | number | undefined>;
  const bateraiIds: string[] = [];
  if (d.sumberPaket === "baterai") {
    const ids = [...new Set((d.bateraiId ?? "").split(",").map((x) => x.trim()).filter(Boolean))];
    const list = ids.length ? await prisma.baterai.findMany({ where: { id: { in: ids } }, orderBy: { kode: "asc" } }) : [];
    const salah = (pesan: string) => ({ values, errors: { bateraiId: [pesan] }, message: "Periksa kembali isian yang ditandai." });
    if (!list.length || list.length !== ids.length || list.some((b) => b.sohTerakhir === null)) return salah("Pilih baterai yang sudah dinilai.");
    const gradeD = list.find((b) => b.gradeTerakhir === "D");
    if (gradeD) return salah(`${gradeD.kode} grade D diarahkan ke daur ulang dan tidak dipakai sebagai paket.`);
    // Beberapa baterai dihitung sebagai satu profil paket: kapasitas rata-rata dan SoH rata-rata tertimbang kapasitas.
    const totalKwh = list.reduce((n, b) => n + b.kapasitasAwalKwh, 0);
    const soh = list.reduce((n, b) => n + b.kapasitasAwalKwh * (b.sohTerakhir ?? 0), 0) / totalKwh;
    const tegangan = new Set(list.map((b) => b.teganganNominalV));
    paket = {
      sumber: "baterai",
      kapasitas_kwh: totalKwh / list.length,
      soh: soh / 100,
      tegangan_nominal_v: tegangan.size === 1 ? (list[0].teganganNominalV ?? undefined) : undefined,
      nama: list.length === 1 ? `${list[0].kode} · ${list[0].merek} ${list[0].model}` : `${list.length} baterai: ${list.map((b) => b.kode).join(", ")}`,
    };
    bateraiIds.push(...list.map((b) => b.id));
  } else {
    paket = { sumber: "bawaan", kapasitas_kwh: d.kapasitasPaket, soh: d.sohPaket! / 100 };
  }

  const nama = d.nama || `Rencana ${new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date())}`;
  const namaDesa = d.namaDesa;
  const input = {
    jumlah_rumah: d.jumlahRumah,
    konsumsi_per_rumah_kwh: d.konsumsi,
    porsi_malam: d.porsiMalam / 100,
    lokasi: d.lokasi,
    hari_cadangan: d.hariCadangan,
    prioritas: d.prioritas,
    paket,
    periode_hari: Number(d.periode),
    harga_diesel_rendah: d.hargaSolarMin,
    harga_diesel_tinggi: d.hargaSolarMaks,
  };
  const res = await callEngine<HasilRencana>("plan", input);
  if (!res.ok) return { values, message: res.error };
  const penjelasan = await explainResult("perencanaan", res.data);

  // Mode ubah: perbarui rencana yang ada, lalu kembali ke halaman asal (rencana atau ketahanan).
  const rencanaId = String(fd.get("rencanaId") ?? "");
  if (rencanaId) {
    const lama = await prisma.rencanaDesa.findUnique({ where: { id: rencanaId }, select: { id: true } });
    if (!lama) return { values, message: "Rencana tidak ditemukan." };
    await prisma.rencanaDesa.update({
      where: { id: rencanaId },
      data: {
        namaDesa,
        masukan: input,
        hasil: res.data,
        penjelasan: penjelasan ?? undefined,
        bateraiIds,
        versiKonfigurasi: res.versiKonfigurasi,
        versiModel: res.versiModel,
      },
    });
    revalidatePath("/perencana");
    revalidatePath(`/perencana/${rencanaId}`);
    revalidatePath("/ketahanan");
    redirect(fd.get("kembali") === "ketahanan" ? `/ketahanan?rencana=${rencanaId}&diubah=1` : `/perencana/${rencanaId}?diubah=1`);
  }

  const r = await prisma.rencanaDesa.create({
    data: {
      nama,
      namaDesa,
      masukan: input,
      hasil: res.data,
      penjelasan: penjelasan ?? undefined,
      bateraiIds,
      versiKonfigurasi: res.versiKonfigurasi,
      versiModel: res.versiModel,
      dibuatId: user.id,
    },
  });
  revalidatePath("/perencana");
  redirect(`/perencana/${r.id}?baru=1`);
}

export async function deletePlan(fd: FormData) {
  await requireAdmin();
  await prisma.rencanaDesa.delete({ where: { id: String(fd.get("id")) } }).catch(() => undefined);
  revalidatePath("/perencana");
  redirect("/perencana");
}
