"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function daftarkanAsetBaterai(fd: FormData) {
  const user = await requireAdmin();
  const bateraiId = String(fd.get("bateraiId") ?? "");
  const status = String(fd.get("status") ?? "AKAN_DIBELI");
  if (!bateraiId) redirect("/baterai?pesan=tidak-ditemukan");
  if (!["AKAN_DIBELI", "TERDAFTAR", "DIGUNAKAN", "TIDAK_TERSEDIA"].includes(status)) redirect("/baterai?pesan=tidak-ditemukan");

  const baterai = await prisma.baterai.findUnique({ where: { id: bateraiId }, select: { id: true } });
  if (!baterai) redirect("/baterai?pesan=tidak-ditemukan");

  await prisma.asetBaterai.upsert({
    where: { bateraiId },
    create: { bateraiId, adminId: user.id, status: status as "AKAN_DIBELI" | "TERDAFTAR" | "DIGUNAKAN" | "TIDAK_TERSEDIA" },
    update: { adminId: user.id, status: status as "AKAN_DIBELI" | "TERDAFTAR" | "DIGUNAKAN" | "TIDAK_TERSEDIA" },
  });
  revalidatePath("/baterai");
  revalidatePath(`/baterai/${bateraiId}`);
  redirect(`/baterai?q=${encodeURIComponent(String(fd.get("kode") ?? ""))}&pesan=terdaftar`);
}

export async function ubahStatusAsetBaterai(fd: FormData) {
  const user = await requireAdmin();
  const bateraiId = String(fd.get("bateraiId") ?? "");
  const status = String(fd.get("status") ?? "");
  if (!["AKAN_DIBELI", "TERDAFTAR", "DIGUNAKAN", "TIDAK_TERSEDIA"].includes(status)) return;

  await prisma.asetBaterai.updateMany({
    where: { bateraiId, adminId: user.id },
    data: { status: status as "AKAN_DIBELI" | "TERDAFTAR" | "DIGUNAKAN" | "TIDAK_TERSEDIA" },
  });
  revalidatePath("/baterai");
  revalidatePath(`/baterai/${bateraiId}`);
}
