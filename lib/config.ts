import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "./prisma";

export type ConfigData = Record<string, unknown> & {
  grade: { A: number; B: number; C: number };
  keputusan: Record<"A" | "B" | "C" | "D", string>;
  profil_paket: { nama: string; kapasitas_kwh: number; soh: number; tegangan_nominal_v: number };
  surya: { psh_jam: number; pr: number; kapasitas_per_panel_wp: number };
  lokasi_psh: Record<string, number>;
  efisiensi: number;
  dod: number;
  dod_prioritas: Record<string, number>;
  hari_cadangan: number;
  diesel: { kwh_per_liter: number; faktor_emisi_kg_per_liter: number; daya_genset_kw: number; harga_per_liter_rendah: number; harga_per_liter_tinggi: number };
  skenario_cuaca: Record<string, { label: string; faktor: number }>;
  tingkat_beban: Record<string, { label: string; porsi: number; perangkat: string[]; penjelasan: string }>;
  siklus_hidup: { ambang_penggantian_soh: number; margin_peringatan_soh: number; batas_sisa_umur_tahun: number };
};

export async function readDefaultConfig(): Promise<ConfigData> {
  const file = path.join(process.cwd(), "engine", "soluna_engine", "default_config.json");
  return JSON.parse(await readFile(file, "utf8"));
}

// Konfigurasi aktif (SYS-1). Bila tabel kosong, versi 1 dibuat dari nilai bawaan.
export async function getActiveConfig(): Promise<{ versi: number; data: ConfigData }> {
  const aktif = await prisma.konfigurasi.findFirst({ where: { aktif: true }, orderBy: { versi: "desc" } });
  if (aktif) return { versi: aktif.versi, data: aktif.data as unknown as ConfigData };
  const data = await readDefaultConfig();
  const created = await prisma.konfigurasi.upsert({
    where: { versi: 1 },
    update: { aktif: true },
    create: { versi: 1, data: data as object, aktif: true, catatan: "Nilai bawaan SOLUNA" },
  });
  return { versi: created.versi, data };
}
