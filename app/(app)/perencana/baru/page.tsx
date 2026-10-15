import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import type { Prioritas } from "@/lib/types";
import { PlanForm } from "../plan-form";
import { muatDataFormRencana } from "../pilihan-baterai";

export const metadata: Metadata = { title: "Rencana Baru" };

export default async function RencanaBaruPage() {
  await requireAdmin();
  const { cfg, pilihan, lokasi, defaults } = await muatDataFormRencana();

  return (
    <>
      <PageHeader eyebrow="Perencanaan" title="Rencana baru" description="Jawab beberapa pertanyaan singkat tentang desa." />
      <PlanForm lokasi={lokasi} baterai={pilihan} dodPrioritas={cfg.dod_prioritas as Record<Prioritas, number>} defaults={defaults} />
    </>
  );
}
