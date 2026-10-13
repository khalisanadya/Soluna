"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { callEngine, explainResult } from "@/lib/engine";
import { formNumber, formString } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { HasilRencana } from "@/lib/types";
import { formValues, type FormState } from "@/lib/validation";

/** Modul B1: Perencana Desa (P-1 s.d. P-13). */
export async function runPlan(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const values = formValues(fd);
  values.jenisBeban = fd.getAll("jenisBeban").join("|");
  const errors: Record<string, string[]> = {};

  const nama = formString(fd, "nama") || "Rencana tanpa judul";
  const namaDesa = formString(fd, "namaDesa");
  if (!namaDesa) errors.namaDesa = ["Nama desa wajib diisi."];

  const rumah = formNumber(fd, "jumlahRumah");
  const konsumsi = formNumber(fd, "konsumsi");
  const malam = formNumber(fd, "porsiMalam");
  const pct = (k: string) => {
    const n = formNumber(fd, k);
    return n === undefined ? undefined : n / 100;
  };

  // NF-4: validasi kelengkapan dan rentang.
  if (rumah === undefined || Number.isNaN(rumah) || !Number.isInteger(rumah) || rumah < 1 || rumah > 100000) errors.jumlahRumah = ["Jumlah rumah 1–100.000 (bilangan bulat)."];
  if (konsumsi === undefined || Number.isNaN(konsumsi) || konsumsi <= 0 || konsumsi > 100) errors.konsumsi = ["Konsumsi per rumah 0–100 kWh/hari."];
  if (malam === undefined || Number.isNaN(malam) || malam < 0 || malam > 100) errors.porsiMalam = ["Porsi malam 0–100%."];

  const opt = {
    psh_jam: formNumber(fd, "psh"),
    pr: pct("pr"),
    efisiensi: pct("efisiensi"),
    dod: pct("dod"),
    hari_cadangan: formNumber(fd, "hariCadangan"),
    kapasitas_per_panel_wp: formNumber(fd, "wpPanel"),
  };
  const ranges: [keyof typeof opt, number, number, string][] = [
    ["psh_jam", 0.5, 12, "PSH 0,5–12 jam."],
    ["pr", 0.1, 1, "PR 10–100%."],
    ["efisiensi", 0.1, 1, "Efisiensi 10–100%."],
    ["dod", 0.1, 1, "DoD 10–100%."],
    ["hari_cadangan", 0, 10, "Hari cadangan 0–10."],
    ["kapasitas_per_panel_wp", 50, 1000, "Kapasitas panel 50–1.000 Wp."],
  ];
  const formKey: Record<string, string> = { psh_jam: "psh", pr: "pr", efisiensi: "efisiensi", dod: "dod", hari_cadangan: "hariCadangan", kapasitas_per_panel_wp: "wpPanel" };
  for (const [k, lo, hi, msg] of ranges) {
    const v = opt[k];
    if (v !== undefined && (Number.isNaN(v) || v < lo || v > hi)) errors[formKey[k]] = [msg];
  }
  if (opt.hari_cadangan !== undefined && !Number.isInteger(opt.hari_cadangan)) errors.hariCadangan = ["Hari cadangan bilangan bulat."];

  // P-12: paket dari baterai yang sudah dinilai di Modul A, atau profil paket bawaan.
  const sumber = formString(fd, "sumberPaket");
  let paket: Record<string, string | number | undefined> = { sumber: "bawaan" };
  const bateraiIds: string[] = [];
  if (sumber === "baterai") {
    const id = formString(fd, "bateraiId");
    const b = id ? await prisma.baterai.findUnique({ where: { id } }) : null;
    if (!b || b.sohTerakhir === null) errors.bateraiId = ["Pilih baterai yang sudah dinilai."];
    else if (b.gradeTerakhir === "D") errors.bateraiId = ["Baterai grade D diarahkan ke daur ulang dan tidak dipakai sebagai paket."];
    else {
      paket = { sumber: "baterai", kapasitas_kwh: b.kapasitasAwalKwh, soh: b.sohTerakhir / 100, tegangan_nominal_v: b.teganganNominalV ?? undefined, nama: `${b.kode} · ${b.merek} ${b.model}` };
      bateraiIds.push(b.id);
    }
  } else {
    const kap = formNumber(fd, "kapasitasPaket");
    const soh = pct("sohPaket");
    if (kap !== undefined && (Number.isNaN(kap) || kap <= 0 || kap > 1000)) errors.kapasitasPaket = ["Kapasitas paket 0–1.000 kWh."];
    if (soh !== undefined && (Number.isNaN(soh) || soh <= 0 || soh > 1)) errors.sohPaket = ["SoH paket 1–100%."];
    paket = { sumber: "bawaan", kapasitas_kwh: kap, soh };
  }

  if (Object.keys(errors).length) return { values, errors, message: "Periksa kembali isian yang ditandai." };

  const input = {
    jumlah_rumah: rumah,
    konsumsi_per_rumah_kwh: konsumsi,
    porsi_malam: malam! / 100,
    jenis_beban: fd.getAll("jenisBeban").map(String),
    lokasi: formString(fd, "lokasi") || undefined,
    ...opt,
    paket,
    periode_hari: formNumber(fd, "periode") ?? 30,
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
