import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requirePemasok } from "@/lib/auth";
import { getBateraiForUser } from "@/lib/data";
import { BatteryForm } from "../../battery-form";

export const metadata: Metadata = { title: "Ubah Baterai" };

export default async function UbahBateraiPage({ params }: PageProps<"/baterai/[id]/ubah">) {
  const { id } = await params;
  const user = await requirePemasok();
  const b = await getBateraiForUser(user, id);
  const s = (x: number | null | undefined) => (x === null || x === undefined ? undefined : String(x));
  return (
    <>
      <PageHeader eyebrow={b.kode} title="Ubah data baterai" description={`${b.merek} ${b.model}`} />
      <BatteryForm
        cancelHref={`/baterai/${b.id}`}
        initial={{
          id: b.id,
          pemasokId: b.pemasokId,
          jenisKimia: b.jenisKimia,
          merek: b.merek,
          model: b.model,
          kapasitasAwalKwh: s(b.kapasitasAwalKwh),
          usiaTahun: s(b.usiaTahun),
          kondisi: b.kondisi,
          teganganNominalV: s(b.teganganNominalV),
          jumlahSiklus: s(b.jumlahSiklus),
          catatan: b.catatan ?? undefined,
        }}
      />
    </>
  );
}
