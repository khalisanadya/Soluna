import "server-only";
import { callEngine } from "./engine";
import { prisma } from "./prisma";
import type { HasilPencocokan, HasilRencana, HasilSiklus, StatusKompat } from "./types";

/* Satu sumber masukan untuk analisis yang dipakai di beberapa halaman (dashboard, siklus hidup,
   pencocokan), agar angka yang tampil di mana pun berasal dari perhitungan yang sama. */

const bateraiSiklusInclude = {
  bacaanSoh: { orderBy: { tanggal: "asc" } },
  penilaian: { orderBy: { createdAt: "desc" }, take: 1 },
} as const;

export function bateraiDinilaiUntukSiklus() {
  return prisma.baterai.findMany({ where: { status: "DINILAI" }, orderBy: { kode: "asc" }, include: bateraiSiklusInclude });
}

type BateraiSiklus = Awaited<ReturnType<typeof bateraiDinilaiUntukSiklus>>[number];

/** Modul D: jadwal penggantian dan peringatan dini dari mesin hitung. */
export function analisisSiklus(baterai: BateraiSiklus[]) {
  return callEngine<HasilSiklus>("lifecycle", {
    baterai: baterai.map((b) => ({
      id: b.id,
      kode: b.kode,
      soh_terakhir: b.sohTerakhir,
      grade: b.gradeTerakhir,
      sisa_umur_tengah: b.penilaian[0]?.sisaUmurTengah,
      tanggal_penilaian: b.penilaian[0]?.createdAt.toISOString().slice(0, 10),
      bacaan: b.bacaanSoh.map((r) => ({ tanggal: r.tanggal.toISOString().slice(0, 10), soh: r.soh })),
    })),
  });
}

/** Status kompatibilitas terakhir per baterai (Modul C), dari pemeriksaan yang tersimpan. */
export async function kompatTerakhir(): Promise<Map<string, { status: StatusKompat; waktu: Date; id: string }>> {
  const rows = await prisma.cekKompatibilitas.findMany({
    where: { bateraiId: { not: null } },
    orderBy: { createdAt: "desc" },
    distinct: ["bateraiId"],
    select: { id: true, bateraiId: true, status: true, createdAt: true },
  });
  return new Map(rows.map((r) => [r.bateraiId!, { status: r.status as StatusKompat, waktu: r.createdAt, id: r.id }]));
}

/** Pencocokan baterai terhadap kebutuhan satu rencana desa. */
export async function cocokkanBaterai(hasil: HasilRencana) {
  const [baterai, kompat] = await Promise.all([
    prisma.baterai.findMany({
      orderBy: { kode: "asc" },
      select: { id: true, kode: true, kapasitasAwalKwh: true, sohTerakhir: true, gradeTerakhir: true, status: true },
    }),
    kompatTerakhir(),
  ]);
  const res = await callEngine<HasilPencocokan>("match", {
    rencana: {
      kebutuhan_malam_kwh: hasil.ringkasan.kebutuhan_malam_kwh,
      daya_puncak_kw: hasil.ringkasan.daya_puncak_kw,
      dod: hasil.parameter.dod,
      hari_cadangan: hasil.parameter.hari_cadangan,
    },
    baterai: baterai.map((b) => ({
      id: b.id,
      kode: b.kode,
      kapasitas_kwh: b.kapasitasAwalKwh,
      soh: b.status === "DINILAI" ? b.sohTerakhir : null,
      grade: b.status === "DINILAI" ? b.gradeTerakhir : null,
      status_kompatibilitas: kompat.get(b.id)?.status ?? null,
    })),
  });
  return { res, kompat };
}
