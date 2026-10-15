"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getActiveConfig, readDefaultConfig } from "@/lib/config";
import { formNumber, formString } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { CONFIG_FIELDS as FIELDS, PSH_PREFIX } from "@/lib/config-fields";
import type { FormState } from "@/lib/validation";

const ENGINE_URL = process.env.ENGINE_URL ?? "http://127.0.0.1:8000";

type Json = Record<string, unknown>;

function setPath(obj: Json, path: string, value: unknown) {
  const keys = path.split(".");
  let cur = obj;
  for (const k of keys.slice(0, -1)) {
    if (typeof cur[k] !== "object" || cur[k] === null) cur[k] = {};
    cur = cur[k] as Json;
  }
  cur[keys[keys.length - 1]] = value;
}

/** SYS-1: simpan konfigurasi sebagai versi baru; hasil lama tetap merujuk versi lamanya (NF-8). */
export async function saveConfig(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const errors: Record<string, string[]> = {};
  // Mulai dari konfigurasi aktif; hanya nilai di formulir yang diubah.
  const data = structuredClone((await getActiveConfig()).data) as Json;
  const angka = (name: string) => formNumber(fd, name);

  for (const f of FIELDS) {
    const v = angka(f.name);
    if (v === undefined) {
      errors[f.name] = ["Wajib diisi."];
      continue;
    }
    if (Number.isNaN(v) || v < f.min || v > f.max) {
      errors[f.name] = [`Isi antara ${f.min.toLocaleString("id-ID")}–${f.max.toLocaleString("id-ID")}.`];
      continue;
    }
    setPath(data, f.path, f.percent ? v / 100 : v);
  }

  // Jam matahari per wilayah.
  const lokasi = { ...((data.lokasi_psh as Record<string, number>) ?? {}) };
  for (const [k, raw] of fd.entries()) {
    if (!k.startsWith(PSH_PREFIX) || typeof raw !== "string") continue;
    const v = Number(raw.replace(",", "."));
    if (!raw.trim() || !Number.isFinite(v) || v < 0.5 || v > 12) errors[k] = ["0,5–12 jam."];
    else lokasi[k.slice(PSH_PREFIX.length)] = v;
  }
  data.lokasi_psh = lokasi;

  // Aturan antar-kolom.
  const n = (name: string) => angka(name) ?? NaN;
  if (!(n("grade_A") > n("grade_B") && n("grade_B") > n("grade_C"))) errors.grade_B = ["Harus menurun: A > B > C."];
  if (n("ambang_ganti") > n("grade_C")) errors.ambang_ganti = ["Tidak boleh di atas batas grade C."];
  for (const [lo, hi] of [["harga_bat_rendah", "harga_bat_tinggi"], ["harga_panel_rendah", "harga_panel_tinggi"], ["diesel_rendah", "diesel_tinggi"]]) {
    if (n(lo) > n(hi)) errors[hi] = ["Tidak boleh lebih kecil dari harga terendah."];
  }
  if (Math.abs(n("porsi_kritis") + n("porsi_penting") + n("porsi_nyaman") - 100) > 0.5) errors.porsi_nyaman = ["Jumlah ketiga porsi harus 100%."];
  if (!(n("ambang_nyaman") > n("ambang_penting"))) errors.ambang_penting = ["Harus lebih kecil dari batas kenyamanan."];
  if (Object.keys(errors).length) return { errors, message: "Periksa kembali nilai yang ditandai." };

  // Uji konfigurasi ke mesin hitung sebelum disimpan (mencegah konfigurasi rusak).
  try {
    const res = await fetch(`${ENGINE_URL}/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: { jumlah_rumah: 50, konsumsi_per_rumah_kwh: 1, porsi_malam: 0.6 }, config: data }),
      cache: "no-store",
    });
    if (!res.ok) return { message: `Konfigurasi ditolak mesin hitung (${res.status}). Periksa struktur JSON.` };
  } catch {
    return { message: "Mesin hitung tidak dapat dihubungi; konfigurasi belum disimpan." };
  }

  const last = await prisma.konfigurasi.findFirst({ orderBy: { versi: "desc" } });
  const versi = (last?.versi ?? 0) + 1;
  await prisma.$transaction([
    prisma.konfigurasi.updateMany({ where: { aktif: true }, data: { aktif: false } }),
    prisma.konfigurasi.create({ data: { versi, data: data as object, aktif: true, catatan: formString(fd, "catatan") || null, dibuatId: user.id } }),
  ]);
  revalidatePath("/", "layout");
  return { ok: true, message: `Tersimpan sebagai versi ${versi} dan langsung dipakai.` };
}

export async function activateConfig(fd: FormData) {
  await requireAdmin();
  const versi = Number(fd.get("versi"));
  if (!Number.isInteger(versi)) return;
  await prisma.$transaction([
    prisma.konfigurasi.updateMany({ where: { aktif: true }, data: { aktif: false } }),
    prisma.konfigurasi.update({ where: { versi }, data: { aktif: true } }),
  ]);
  revalidatePath("/", "layout");
}

export async function resetConfig() {
  const user = await requireAdmin();
  const data = await readDefaultConfig();
  const last = await prisma.konfigurasi.findFirst({ orderBy: { versi: "desc" } });
  await prisma.$transaction([
    prisma.konfigurasi.updateMany({ where: { aktif: true }, data: { aktif: false } }),
    prisma.konfigurasi.create({ data: { versi: (last?.versi ?? 0) + 1, data: data as object, aktif: true, catatan: "Dikembalikan ke nilai bawaan", dibuatId: user.id } }),
  ]);
  revalidatePath("/", "layout");
}
