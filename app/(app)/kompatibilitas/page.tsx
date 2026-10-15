import type { Metadata } from "next";
import { Badge, Card, PageHeader, SectionTitle } from "@/components/ui";
import { Paginasi, bacaHalaman } from "@/components/paginasi";
import { requireAdmin } from "@/lib/auth";
import { num, tanggal } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { HasilKompatibilitas, HasilRencana } from "@/lib/types";
import { CompatForm } from "./compat-form";

export const metadata: Metadata = { title: "Kompatibilitas" };

const tone = { layak: "leaf", perlu_penyesuaian: "amber", tidak_layak: "flame" } as const;

export default async function KompatibilitasPage({ searchParams }: PageProps<"/kompatibilitas">) {
  await requireAdmin();
  const sp = await searchParams;
  const rencanaId = typeof sp.rencana === "string" ? sp.rencana : "";
  // Dibuka dari halaman rencana desa: rencana dikunci agar pemeriksaan tetap untuk rencana itu.
  const kunciRencana = sp.kunci === "1" && Boolean(rencanaId);
  const [daftarBaterai, daftarRencana, totalRiwayat] = await Promise.all([
    prisma.baterai.findMany({
      where: { status: "DINILAI" },
      orderBy: { kode: "asc" },
      select: { id: true, kode: true, merek: true, model: true, teganganNominalV: true, gradeTerakhir: true, sohTerakhir: true, kapasitasAwalKwh: true },
    }),
    prisma.rencanaDesa.findMany({ orderBy: { createdAt: "desc" }, take: 50, select: { id: true, nama: true, namaDesa: true, hasil: true, bateraiIds: true } }),
    prisma.cekKompatibilitas.count(),
  ]);
  const halRiwayat = bacaHalaman(sp, totalRiwayat);
  const riwayat = await prisma.cekKompatibilitas.findMany({
    orderBy: { createdAt: "desc" },
    skip: halRiwayat.skip,
    take: halRiwayat.take,
    include: { baterai: { select: { kode: true } }, rencana: { select: { namaDesa: true } } },
  });
  const rencana = daftarRencana.find((r) => r.id === rencanaId);
  const h = rencana?.hasil as HasilRencana | undefined;
  // Baterai: dari tautan, atau baterai pertama yang sudah dipilih untuk rencana ini.
  const bateraiRencana = rencana ? daftarBaterai.filter((b) => rencana.bateraiIds.includes(b.id)) : [];
  const bateraiId = typeof sp.baterai === "string" && daftarBaterai.some((b) => b.id === sp.baterai) ? sp.baterai : (bateraiRencana[0]?.id ?? "");
  const baterai = daftarBaterai.find((b) => b.id === bateraiId);

  // Data baterai tidak diisi manual: semuanya dari hasil penilaian baterai.
  const dataBaterai = baterai
    ? {
        kode: baterai.kode,
        tegangan: baterai.teganganNominalV,
        grade: baterai.gradeTerakhir,
        soh: baterai.sohTerakhir,
        kapasitas: baterai.kapasitasAwalKwh,
        paket: h ? h.ringkasan.jumlah_paket : 1,
      }
    : null;
  // Rencana mengisi daya inverter dan beban puncak.
  const initial: Record<string, string> = {
    vNominal: "48",
    vMin: "40",
    vMaks: "60",
    ...(h ? { kwInverter: String(h.ringkasan.inverter_kw), kwPuncak: String(h.ringkasan.daya_puncak_kw) } : {}),
  };

  return (
    <>
      <PageHeader eyebrow="Perencanaan" title="Kompatibilitas & keselamatan" description="Pastikan baterai cocok dengan inverter sebelum dipasang." />
      <CompatForm
        key={`${bateraiId}-${rencanaId}`}
        initial={initial}
        bateraiId={baterai?.id ?? ""}
        rencanaId={rencana?.id ?? ""}
        kunciRencana={kunciRencana && Boolean(rencana)}
        dataBaterai={dataBaterai}
        daftarBaterai={daftarBaterai.map((b) => ({
          id: b.id,
          label: `${b.kode} · ${b.merek} ${b.model}${b.gradeTerakhir ? ` · grade ${b.gradeTerakhir}` : ""}`,
          diRencana: Boolean(rencana?.bateraiIds.includes(b.id)),
        }))}
        daftarRencana={daftarRencana.map((r) => ({ id: r.id, label: `${r.namaDesa} — ${r.nama}` }))}
        riwayat={
          <Card className="!p-4">
            <SectionTitle title="Riwayat pemeriksaan" />
            {riwayat.length ? (
              <ul className="divide-y divide-ink-100">
                {riwayat.map((r) => {
                  const hk = r.hasil as unknown as HasilKompatibilitas;
                  const m = r.masukan as { tegangan_baterai_v?: number; tegangan_inverter_nominal_v?: number };
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{r.baterai?.kode ?? r.rencana?.namaDesa ?? "Pemeriksaan manual"}</span>
                        <span className="num block text-xs text-ink-500">
                          {m.tegangan_baterai_v ? `${num(m.tegangan_baterai_v)} V → ${num(m.tegangan_inverter_nominal_v)} V · ` : ""}
                          {tanggal(r.createdAt)}
                        </span>
                      </span>
                      <Badge tone={tone[hk.status]}>{hk.label}</Badge>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-ink-500">Belum ada pemeriksaan.</p>
            )}
            {riwayat.length > 0 && (
              <Paginasi basePath="/kompatibilitas" sp={sp} halaman={halRiwayat.halaman} total={totalRiwayat} tampil={riwayat.length} satuan="pemeriksaan" ringkas className="border-t border-ink-100 pt-3" />
            )}
          </Card>
        }
      />
    </>
  );
}
