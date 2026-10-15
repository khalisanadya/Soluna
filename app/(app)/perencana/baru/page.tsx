import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { kompatTerakhir } from "@/lib/analisis";
import { requireAdmin } from "@/lib/auth";
import { getActiveConfig } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import type { Prioritas } from "@/lib/types";
import { PlanForm, type BateraiPilihan } from "../plan-form";

export const metadata: Metadata = { title: "Rencana Baru" };

export default async function RencanaBaruPage() {
  await requireAdmin();
  const [{ data: cfg }, baterai, kompat] = await Promise.all([
    getActiveConfig(),
    prisma.baterai.findMany({
      where: { status: "DINILAI", gradeTerakhir: { in: ["A", "B", "C"] } },
      orderBy: { sohTerakhir: "desc" },
      select: {
        id: true,
        kode: true,
        merek: true,
        model: true,
        kapasitasAwalKwh: true,
        sohTerakhir: true,
        gradeTerakhir: true,
        // Sisa umur dibaca dari hasil penilaian terakhir (JSON) agar tidak bergantung pada kolom tertentu.
        penilaian: { orderBy: { createdAt: "desc" }, take: 1, select: { hasil: true } },
      },
    }),
    kompatTerakhir(),
  ]);
  const ambang = cfg.siklus_hidup.ambang_penggantian_soh;
  const pilihan: BateraiPilihan[] = baterai.map((b) => {
    const k = kompat.get(b.id);
    const hasil = b.penilaian[0]?.hasil as { sisa_umur?: { tengah?: number } } | null | undefined;
    const soh = b.sohTerakhir ?? 0;
    return {
      id: b.id,
      kode: b.kode,
      nama: `${b.merek} ${b.model}`,
      grade: b.gradeTerakhir ?? "",
      soh,
      kapasitas: b.kapasitasAwalKwh,
      sisaUmurTahun: typeof hasil?.sisa_umur?.tengah === "number" ? hasil.sisa_umur.tengah : null,
      kompat: k ? { status: k.status, label: { layak: "Layak", perlu_penyesuaian: "Perlu penyesuaian", tidak_layak: "Tidak layak" }[k.status] } : null,
      // Baterai yang hasil pemeriksaannya bertentangan dengan pemakaian tidak boleh dipilih.
      diblokir: k?.status === "tidak_layak" ? "Tidak layak menurut pemeriksaan kompatibilitas" : soh < ambang ? `SoH di bawah ambang ${ambang}% — arahkan ke daur ulang` : null,
    };
  });

  return (
    <>
      <PageHeader eyebrow="Perencanaan" title="Rencana baru" description="Jawab beberapa pertanyaan singkat tentang desa." />
      <PlanForm
        lokasi={Object.entries(cfg.lokasi_psh).map(([k, v]) => ({ nama: k, psh: v }))}
        baterai={pilihan}
        dodPrioritas={cfg.dod_prioritas as Record<Prioritas, number>}
        defaults={{
          hariCadangan: cfg.hari_cadangan,
          kapasitasPaket: cfg.profil_paket.kapasitas_kwh,
          sohPaket: Math.round(cfg.profil_paket.soh * 100),
          hargaSolarMin: cfg.diesel.harga_per_liter_rendah,
          hargaSolarMaks: cfg.diesel.harga_per_liter_tinggi,
        }}
      />
    </>
  );
}
