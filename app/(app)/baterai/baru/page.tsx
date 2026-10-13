import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BatteryForm } from "../battery-form";

export const metadata: Metadata = { title: "Tambah Baterai" };

export default async function TambahBateraiPage() {
  const user = await requireUser();
  const pemasok =
    user.peran === "ADMIN"
      ? (await prisma.pemasok.findMany({ orderBy: { namaPerusahaan: "asc" }, select: { id: true, namaPerusahaan: true } })).map((p) => ({ id: p.id, nama: p.namaPerusahaan }))
      : undefined;
  return (
    <>
      <PageHeader eyebrow="Baterai" title="Tambah baterai" description="Daftarkan baterai pensiun kendaraan listrik yang ditawarkan untuk penyimpanan listrik desa." />
      <BatteryForm pemasokOptions={pemasok} cancelHref="/baterai" />
    </>
  );
}
