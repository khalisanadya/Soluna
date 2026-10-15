import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requirePemasok } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfilPerusahaan } from "./profil-form";

export const metadata: Metadata = { title: "Profil Perusahaan" };

export default async function ProfilPage() {
  const user = await requirePemasok();
  const [p, baterai] = await Promise.all([
    prisma.pemasok.findUniqueOrThrow({ where: { id: user.pemasokId } }),
    prisma.baterai.findMany({ where: { pemasokId: user.pemasokId }, select: { status: true, kapasitasAwalKwh: true } }),
  ]);
  const ringkasan = {
    total: baterai.length,
    dinilai: baterai.filter((b) => b.status === "DINILAI").length,
    kapasitasKwh: baterai.reduce((n, b) => n + b.kapasitasAwalKwh, 0),
    bergabung: p.createdAt.toISOString(),
  };
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
      <ProfilPerusahaan initial={initial} ringkasan={ringkasan} />
    </>
  );
}
