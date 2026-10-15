import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getActiveConfig } from "@/lib/config";
import { num } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { HasilRencana } from "@/lib/types";
import { Simulator, type SimInitial } from "./simulator";

export const metadata: Metadata = { title: "Ketahanan Desa" };

export default async function KetahananPage({ searchParams }: PageProps<"/ketahanan">) {
  await requireAdmin();
  const sp = await searchParams;
  const [{ data: cfg }, rencana, baterai] = await Promise.all([
    getActiveConfig(),
    prisma.rencanaDesa.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.baterai.findMany({
      where: { status: "DINILAI", gradeTerakhir: { in: ["A", "B", "C"] } },
      orderBy: { sohTerakhir: "desc" },
      select: { id: true, kode: true, merek: true, model: true, sohTerakhir: true, kapasitasAwalKwh: true, gradeTerakhir: true },
    }),
  ]);

  const toInitial = (id: string, nama: string, h: HasilRencana, porsiMalam: number): SimInitial => ({
    rencanaId: id,
    nama,
    beban_harian_kwh: h.ringkasan.kebutuhan_harian_kwh,
    jumlah_paket: h.ringkasan.jumlah_paket,
    kapasitas_kwh: h.parameter.kapasitas_paket_kwh,
    soh: h.parameter.soh_paket,
    kapasitas_panel_kwp: h.ringkasan.kapasitas_panel_terpasang_kwp,
    psh_jam: h.parameter.psh_jam,
    pr: h.parameter.pr,
    efisiensi: h.parameter.efisiensi,
    porsi_malam: porsiMalam,
    prioritas: h.parameter.prioritas,
  });

  const plans = rencana.map((r) => toInitial(r.id, `${r.namaDesa} — ${r.nama}`, r.hasil as unknown as HasilRencana, (r.masukan as { porsi_malam: number }).porsi_malam));
  const pilihan = typeof sp.rencana === "string" ? plans.find((p) => p.rencanaId === sp.rencana) : undefined;
  const fallback: SimInitial = {
    rencanaId: null,
    nama: "Contoh laporan (ilustrasi)",
    beban_harian_kwh: 50,
    jumlah_paket: 4,
    kapasitas_kwh: cfg.profil_paket.kapasitas_kwh,
    soh: cfg.profil_paket.soh,
    kapasitas_panel_kwp: 17,
    psh_jam: cfg.surya.psh_jam,
    pr: cfg.surya.pr,
    efisiensi: cfg.efisiensi,
    porsi_malam: 0.6,
  };

  return (
    <>
      <PageHeader
        eyebrow="Perencanaan"
        title="Ketahanan desa"
        description="Berapa lama listrik desa bertahan saat cuaca buruk. Ini simulasi, bukan kendali beban nyata."
      />
      <Simulator
        initial={pilihan ?? plans[0] ?? fallback}
        plans={plans}
        skenario={Object.entries(cfg.skenario_cuaca).map(([k, v]) => ({ kunci: k, label: v.label, faktor: v.faktor }))}
        baterai={baterai.map((b) => ({ id: b.id, label: `${b.kode} · ${b.merek} ${b.model} (SoH ${num(b.sohTerakhir)}%, ${b.gradeTerakhir})`, soh: (b.sohTerakhir ?? 70) / 100, kapasitas: b.kapasitasAwalKwh }))}
        defaultPeriode={(cfg as unknown as { periode_simulasi_hari: number }).periode_simulasi_hari}
      />
    </>
  );
}
