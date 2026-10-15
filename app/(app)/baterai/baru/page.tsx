import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requirePemasok } from "@/lib/auth";
import { BatteryForm } from "../battery-form";

export const metadata: Metadata = { title: "Tambah Baterai" };

export default async function TambahBateraiPage() {
  await requirePemasok();
  return (
    <>
      <PageHeader eyebrow="Baterai" title="Tambah baterai" description="Daftarkan baterai pensiun kendaraan listrik yang ditawarkan untuk penyimpanan listrik desa." />
      <BatteryForm cancelHref="/baterai" />
    </>
  );
}
