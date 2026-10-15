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
    const b = d.bateraiId ? await prisma.baterai.findUnique({ where: { id: d.bateraiId } }) : null;
    if (!b || b.sohTerakhir === null) return { values, errors: { bateraiId: ["Pilih baterai yang sudah dinilai."] }, message: "Periksa kembali isian yang ditandai." };
    if (b.gradeTerakhir === "D") return { values, errors: { bateraiId: ["Baterai grade D diarahkan ke daur ulang dan tidak dipakai sebagai paket."] }, message: "Periksa kembali isian yang ditandai." };
    paket = { sumber: "baterai", kapasitas_kwh: b.kapasitasAwalKwh, soh: b.sohTerakhir / 100, tegangan_nominal_v: b.teganganNominalV ?? undefined, nama: `${b.kode} · ${b.merek} ${b.model}` };
    bateraiIds.push(b.id);
  } else {
    paket = { sumber: "bawaan", kapasitas_kwh: d.kapasitasPaket, soh: d.sohPaket! / 100 };
  }

  const nama = d.nama;
  const namaDesa = d.namaDesa;
  const input = {
    jumlah_rumah: d.jumlahRumah,
    konsumsi_per_rumah_kwh: d.konsumsi,
    porsi_malam: d.porsiMalam / 100,
    lokasi: d.lokasi,
    psh_jam: d.psh,
    pr: d.pr / 100,
    efisiensi: d.efisiensi / 100,
    dod: d.dod / 100,
    hari_cadangan: d.hariCadangan,
    kapasitas_per_panel_wp: d.wpPanel,
    paket,
    periode_hari: Number(d.periode),
    harga_diesel_rendah: d.hargaSolarMin,
    harga_diesel_tinggi: d.hargaSolarMaks,
  };
  const res = await callEngine<HasilRencana>("plan", input);
  if (!res.ok) return { values, message: res.error };
  const penjelasan = await explainResult("perencanaan", res.data);

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
