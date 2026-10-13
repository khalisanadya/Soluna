import type { Metadata } from "next";
import { Card, GradeBadge, PageHeader, gradeTone } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getActiveConfig } from "@/lib/config";
import { num } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { Grade } from "@/lib/types";
import { AssessmentForm } from "./assessment-form";

export const metadata: Metadata = { title: "Penilaian Baru" };

export default async function PenilaianBaruPage({ searchParams }: PageProps<"/penilaian/baru">) {
  await requireAdmin();
  const sp = await searchParams;
  const bateraiId = typeof sp.baterai === "string" ? sp.baterai : "";
  const [daftar, terpilih, { data: cfg }] = await Promise.all([
    prisma.baterai.findMany({ orderBy: [{ status: "asc" }, { kode: "asc" }], select: { id: true, kode: true, merek: true, model: true, status: true, pemasok: { select: { namaPerusahaan: true } } } }),
    bateraiId ? prisma.baterai.findUnique({ where: { id: bateraiId }, include: { pemasok: true, penilaian: { orderBy: { createdAt: "desc" }, take: 1 } } }) : null,
    getActiveConfig(),
  ]);
  const prev = terpilih?.penilaian[0]?.masukan as Record<string, number | string | undefined> | undefined;
  const g = cfg.grade;

  return (
    <>
      <PageHeader
        eyebrow="Modul A · Penilaian baterai"
        title="Penilaian baru"
        description="Pilih baterai dari daftar; data dari pemasok terisi otomatis. Lengkapi hasil pengukuran agar skor keyakinan lebih tinggi."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AssessmentForm
            key={bateraiId || "kosong"}
            daftar={daftar.map((b) => ({ id: b.id, label: `${b.kode} · ${b.merek} ${b.model} — ${b.pemasok.namaPerusahaan}${b.status === "DINILAI" ? " (sudah dinilai)" : ""}` }))}
            initial={
              terpilih
                ? {
                    bateraiId: terpilih.id,
                    kapasitasAwal: String(terpilih.kapasitasAwalKwh),
                    kapasitasAktual: prev?.kapasitas_aktual_kwh !== undefined ? String(prev.kapasitas_aktual_kwh) : "",
                    usia: terpilih.usiaTahun !== null ? String(terpilih.usiaTahun) : "",
                    siklus: terpilih.jumlahSiklus !== null ? String(terpilih.jumlahSiklus) : "",
                    kimia: terpilih.jenisKimia,
                    hambatan: prev?.hambatan_internal_mohm !== undefined ? String(prev.hambatan_internal_mohm) : "",
                    dod: prev?.kedalaman_pengosongan !== undefined ? String(Number(prev.kedalaman_pengosongan) * 100) : "",
                    pengisianCepat: prev?.frekuensi_pengisian_cepat !== undefined ? String(Number(prev.frekuensi_pengisian_cepat) * 100) : "",
                    suhu: prev?.suhu_rata_c !== undefined ? String(prev.suhu_rata_c) : "",
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
                    kapasitas: num(terpilih.kapasitasAwalKwh),
                  }
                : null
            }
          />
        </div>
        <aside className="space-y-4">
          <Card>
            <p className="eyebrow mb-3">Aturan grade (konfigurasi)</p>
            <ul className="space-y-2.5 text-sm">
              {(
                [
                  ["A", `${g.A}–100%`],
                  ["B", `${g.B} sampai < ${g.A}%`],
                  ["C", `${g.C} sampai < ${g.B}%`],
                  ["D", `< ${g.C}%`],
                ] as [Grade, string][]
              ).map(([k, r]) => (
                <li key={k} className="flex items-start gap-3">
                  <GradeBadge grade={k} size="sm" />
                  <span>
                    <span className="num font-medium">{r}</span>
                    <span className="block text-xs text-ink-500">{cfg.keputusan[k]}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-ink-500">Batas bawah masuk grade lebih tinggi: SoH {g.B}% = grade B.</p>
          </Card>
          <Card tone="muted">
            <p className="text-sm font-semibold">Rumus SoH</p>
            <p className="mt-2 font-mono text-sm text-ink-700">SoH = kapasitas aktual / kapasitas awal × 100</p>
            <p className="mt-3 text-xs text-ink-500">
              Rentang sisa umur memakai model empiris sementara (penurunan SoH per tahun × faktor stres). Data kosong memakai
              nilai bawaan dan menurunkan skor keyakinan.
            </p>
          </Card>
          <div className="flex flex-wrap gap-2 text-xs text-ink-500">
            {(["A", "B", "C", "D"] as Grade[]).map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className={`size-2 rounded-full ${gradeTone[k].bg}`} />
                {gradeTone[k].label}
              </span>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}
