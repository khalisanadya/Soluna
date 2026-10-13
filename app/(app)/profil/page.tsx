import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requirePemasok } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfilForm } from "./profil-form";

export const metadata: Metadata = { title: "Profil Perusahaan" };

export default async function ProfilPage() {
  const user = await requirePemasok();
  const p = await prisma.pemasok.findUniqueOrThrow({ where: { id: user.pemasokId } });
  const initial: Record<string, string> = {};
  for (const k of [
    "namaPenanggungJawab",
    "namaPerusahaan",
    "alamat",
    "kota",
    "provinsi",
    "telepon",
    "emailPerusahaan",
    "deskripsi",
    "jenisBaterai",
    "alamatPenyimpanan",
    "kotaPenyimpanan",
    "provinsiPenyimpanan",
  ] as const) {
    initial[k] = p[k] ?? "";
  }
  return (
    <>
      <PageHeader eyebrow="Akun" title="Profil perusahaan" description="Data ini terlihat oleh pengelola desa saat memilih baterai dan menghubungi Anda." />
      <ProfilForm initial={initial} />
    </>
  );
}
