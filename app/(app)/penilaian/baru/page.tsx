import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AssessmentForm } from "./assessment-form";

export const metadata: Metadata = { title: "Penilaian Baru" };

export default async function PenilaianBaruPage({ searchParams }: PageProps<"/penilaian/baru">) {
  await requireAdmin();
  const sp = await searchParams;
  const bateraiId = typeof sp.baterai === "string" ? sp.baterai : "";
  const [daftar, terpilih] = await Promise.all([
    prisma.baterai.findMany({ orderBy: [{ status: "asc" }, { kode: "asc" }], select: { id: true, kode: true, merek: true, model: true, status: true, pemasok: { select: { namaPerusahaan: true } } } }),
    bateraiId ? prisma.baterai.findUnique({ where: { id: bateraiId }, include: { pemasok: true, penilaian: { orderBy: { createdAt: "desc" }, take: 1 } } }) : null,
  ]);
  const prev = terpilih?.penilaian[0]?.masukan as Record<string, number | string | undefined> | undefined;
  const isi = (x: number | string | null | undefined) => (x === null || x === undefined ? "" : String(x));
  const persen = (x: number | string | undefined) => (x === undefined ? "" : String(Math.round(Number(x) * 1000) / 10));

  return (
    <>
      <PageHeader eyebrow="Baterai" title="Penilaian baru" description="Masukkan hasil uji baterai untuk menilai kesehatan, grade, dan perkiraan sisa umurnya." />
      <AssessmentForm
        key={bateraiId || "kosong"}
        daftar={daftar.map((b) => ({ id: b.id, label: `${b.kode} · ${b.merek} ${b.model}${b.status === "DINILAI" ? " (sudah dinilai)" : ""}` }))}
        initial={
          terpilih
            ? {
                bateraiId: terpilih.id,
                kapasitasAwal: isi(terpilih.kapasitasAwalKwh),
                kapasitasAktual: isi(prev?.kapasitas_aktual_kwh),
                hambatan: isi(prev?.hambatan_internal_mohm),
                siklus: isi(terpilih.jumlahSiklus ?? prev?.jumlah_siklus),
                kimia: terpilih.jenisKimia,
                usia: isi(terpilih.usiaTahun ?? prev?.usia_tahun),
                dod: persen(prev?.kedalaman_pengosongan),
                pengisianCepat: persen(prev?.frekuensi_pengisian_cepat),
                suhu: isi(prev?.suhu_rata_c),
              }
            : { bateraiId: "" }
        }
        terpilih={
          terpilih
            ? {
                kode: terpilih.kode,
                nama: `${terpilih.merek} ${terpilih.model}`,
                pemasok: terpilih.pemasok.namaPerusahaan,
                kondisi: terpilih.kondisi,
                dinilai: terpilih.status === "DINILAI",
              }
            : null
        }
      />
    </>
  );
}
