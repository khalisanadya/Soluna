import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prioritas } from "@/lib/types";
import { PlanForm } from "../../plan-form";
import { muatDataFormRencana } from "../../pilihan-baterai";

export const metadata: Metadata = { title: "Ubah Rencana" };

type Masukan = {
  jumlah_rumah?: number;
  konsumsi_per_rumah_kwh?: number;
  porsi_malam?: number;
  lokasi?: string;
  hari_cadangan?: number;
  prioritas?: Prioritas;
};

export default async function UbahRencanaPage({ params, searchParams }: PageProps<"/perencana/[id]/ubah">) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const [r, { cfg, pilihan, lokasi, defaults }] = await Promise.all([
    prisma.rencanaDesa.findUnique({ where: { id }, select: { id: true, namaDesa: true, masukan: true, bateraiIds: true } }),
    muatDataFormRencana(),
  ]);
  if (!r) notFound();
  const m = r.masukan as Masukan;
  const dariKetahanan = sp.kembali === "ketahanan";

  // Isian awal formulir dari rencana yang tersimpan.
  const awal: Record<string, string> = {
    namaDesa: r.namaDesa,
    jumlahRumah: m.jumlah_rumah !== undefined ? String(m.jumlah_rumah) : "",
    konsumsi: m.konsumsi_per_rumah_kwh !== undefined ? String(m.konsumsi_per_rumah_kwh) : "",
    porsiMalam: m.porsi_malam !== undefined ? String(Math.round(m.porsi_malam * 1000) / 10) : "",
    lokasi: m.lokasi ?? "Bawaan",
    hariCadangan: String(m.hari_cadangan ?? defaults.hariCadangan),
    prioritas: m.prioritas && m.prioritas !== "hemat_diesel" ? m.prioritas : "ketahanan_maksimum",
    sumberPaket: "baterai",
    bateraiId: r.bateraiIds.filter((b) => pilihan.some((p) => p.id === b)).join(","),
  };

  return (
    <>
      <PageHeader
        eyebrow="Perencanaan"
        title={`Ubah rencana ${r.namaDesa}`}
        description={dariKetahanan ? "Setelah disimpan, Anda kembali ke Ketahanan Desa dengan data terbaru." : "Ubah data yang perlu, lalu simpan. Hasil rencana dihitung ulang."}
      />
      <PlanForm
        lokasi={lokasi}
        baterai={pilihan}
        dodPrioritas={cfg.dod_prioritas as Record<Prioritas, number>}
        defaults={defaults}
        ubah={{ rencanaId: r.id, awal, kembali: dariKetahanan ? "ketahanan" : "rencana", batal: dariKetahanan ? `/ketahanan?rencana=${r.id}` : `/perencana/${r.id}` }}
      />
    </>
  );
}
