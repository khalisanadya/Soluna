"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { callEngine, type Penjelasan } from "@/lib/engine";
import { prisma } from "@/lib/prisma";
import type { HasilKetahanan } from "@/lib/types";

const inputSchema = z.object({
  beban_harian_kwh: z.number().positive("Beban harian harus lebih dari 0.").max(100000),
  jumlah_paket: z.number().int().positive("Jumlah paket minimal 1.").max(1000),
  kapasitas_kwh: z.number().positive().max(1000),
  soh: z.number().gt(0).max(1),
  kapasitas_panel_kwp: z.number().min(0).max(10000),
  psh_jam: z.number().positive().max(12).optional(),
  pr: z.number().positive().max(1).optional(),
  efisiensi: z.number().positive().max(1).optional(),
  porsi_malam: z.number().min(0).max(1),
  prioritas: z.enum(["hemat_diesel", "ketahanan_maksimum", "umur_baterai_maksimum"]),
  skenario: z.string(),
  faktor_beban: z.number().gt(0).max(1),
  pelepasan_beban: z.boolean(),
  periode_hari: z.number().int().min(1).max(14),
});

export type InputKetahanan = z.infer<typeof inputSchema>;

export type SimulasiResult =
  | { ok: true; data: HasilKetahanan; penjelasan: Penjelasan | null; versiKonfigurasi: number }
  | { ok: false; error: string };

/** Modul B2 (K-1 s.d. K-12): dihitung ulang setiap kali admin mengubah kontrol. */
export async function simulateResilience(raw: InputKetahanan): Promise<SimulasiResult> {
  await requireAdmin();
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Masukan tidak valid." };
  const res = await callEngine<HasilKetahanan>("resilience", parsed.data);
  if (!res.ok) return res;
  // Penjelasan teks panjang tidak lagi ditampilkan di halaman, jadi tidak diminta (lebih cepat).
  return { ok: true, data: res.data, penjelasan: null, versiKonfigurasi: res.versiKonfigurasi };
}

export async function saveSimulation(raw: InputKetahanan, nama: string, rencanaId: string | null): Promise<{ ok: boolean; message: string }> {
  const user = await requireAdmin();
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "Masukan tidak valid." };
  const res = await callEngine<HasilKetahanan>("resilience", parsed.data);
  if (!res.ok) return { ok: false, message: res.error };
  await prisma.simulasiKetahanan.create({
    data: {
      nama: nama.trim() || "Simulasi ketahanan",
      rencanaId: rencanaId || null,
      masukan: parsed.data,
      hasil: res.data,
      versiKonfigurasi: res.versiKonfigurasi,
      versiModel: res.versiModel,
      dibuatId: user.id,
    },
  });
  revalidatePath("/riwayat");
  // Langkah berikutnya di halaman rencana selalu memakai simulasi terakhir yang disimpan.
  if (rencanaId) revalidatePath(`/perencana/${rencanaId}`);
  revalidatePath("/dashboard");
  const waktu = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date());
  return { ok: true, message: rencanaId ? `Simulasi tersimpan (${waktu}) dan langkah berikutnya di rencana desa sudah diperbarui.` : `Simulasi tersimpan (${waktu}).` };
}
