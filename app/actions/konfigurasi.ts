"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getActiveConfig, readDefaultConfig } from "@/lib/config";
import { formNumber, formString } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { CONFIG_FIELDS as FIELDS } from "@/lib/config-fields";
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
  let data: Json;
  const raw = formString(fd, "json");
  try {
    data = raw ? JSON.parse(raw) : (await getActiveConfig()).data;
  } catch {
    return { message: "JSON lanjutan tidak valid.", errors: { json: ["Periksa tanda kutip dan koma."] } };
  }
  for (const f of FIELDS) {
    const v = formNumber(fd, f.name);
    if (v === undefined) continue;
    if (Number.isNaN(v) || v < f.min || v > f.max) {
      errors[f.name] = [`Nilai ${f.min}–${f.max}.`];
      continue;
    }
    setPath(data, f.path, f.percent ? v / 100 : v);
  }
  const g = data.grade as { A: number; B: number; C: number } | undefined;
  if (g && !(g.A > g.B && g.B > g.C)) errors.grade_A = ["Ambang grade harus menurun: A > B > C."];
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
  return { ok: true, message: `Konfigurasi versi ${versi} aktif.` };
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
