import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getActiveConfig } from "@/lib/config";
import { CONFIG_FIELDS, getPath } from "@/lib/config-fields";
import { ConfigForm } from "./config-form";

export const metadata: Metadata = { title: "Parameter Sistem" };

export default async function PengaturanPage() {
  await requireAdmin();
  const { versi, data } = await getActiveConfig();
  const values: Record<string, string> = {};
  for (const f of CONFIG_FIELDS) {
    const v = getPath(data, f.path);
    if (typeof v === "number") values[f.name] = String(Math.round((f.percent ? v * 100 : v) * 1000) / 1000);
  }
  // "Bawaan" (wilayah umum) lebih dulu, lalu wilayah sesuai abjad.
  const lokasi = Object.entries((data.lokasi_psh as Record<string, number>) ?? {})
    .map(([nama, psh]) => ({ nama, psh }))
    .sort((a, b) => (a.nama === "Bawaan" ? -1 : b.nama === "Bawaan" ? 1 : a.nama.localeCompare(b.nama, "id")));

  return (
    <>
      <PageHeader
        eyebrow="Pengaturan"
        title="Parameter sistem"
        description="Nilai yang dipakai semua perhitungan. Perubahan langsung berlaku."
      />
      <ConfigForm values={values} lokasi={lokasi} versi={versi} />
    </>
  );
}
