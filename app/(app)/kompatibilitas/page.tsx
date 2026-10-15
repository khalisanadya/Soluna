import type { Metadata } from "next";
import { Badge, Card, PageHeader, SectionTitle } from "@/components/ui";
import { Paginasi, bacaHalaman } from "@/components/paginasi";
import { requireAdmin } from "@/lib/auth";
import { getActiveConfig } from "@/lib/config";
import { tanggal } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { HasilKompatibilitas, HasilRencana } from "@/lib/types";
import { CompatForm } from "./compat-form";

export const metadata: Metadata = { title: "Kompatibilitas" };

const tone = { layak: "leaf", perlu_penyesuaian: "amber", tidak_layak: "flame" } as const;

export default async function KompatibilitasPage({ searchParams }: PageProps<"/kompatibilitas">) {
  await requireAdmin();
  const sp = await searchParams;
  const bateraiId = typeof sp.baterai === "string" ? sp.baterai : "";
  const rencanaId = typeof sp.rencana === "string" ? sp.rencana : "";
  const [{ data: cfg }, baterai, rencana, totalRiwayat] = await Promise.all([
    getActiveConfig(),
    bateraiId ? prisma.baterai.findUnique({ where: { id: bateraiId } }) : null,
    rencanaId ? prisma.rencanaDesa.findUnique({ where: { id: rencanaId } }) : null,
    prisma.cekKompatibilitas.count(),
  ]);
  const halRiwayat = bacaHalaman(sp, totalRiwayat);
  const riwayat = await prisma.cekKompatibilitas.findMany({
    orderBy: { createdAt: "desc" },
    skip: halRiwayat.skip,
    take: halRiwayat.take,
    include: { baterai: { select: { kode: true } }, rencana: { select: { namaDesa: true } } },
  });
  const h = rencana?.hasil as HasilRencana | undefined;

  const initial: Record<string, string> = {
    vNominal: "48",
    vMin: "40",
    vMaks: "60",
    ...(baterai
      ? {
          bateraiId: baterai.id,
          vBaterai: baterai.teganganNominalV ? String(baterai.teganganNominalV) : "",
          grade: baterai.gradeTerakhir ?? "",
          soh: baterai.sohTerakhir !== null ? String(baterai.sohTerakhir) : "",
          kapasitas: String(baterai.kapasitasAwalKwh),
          paket: "1",
        }
      : {}),
    ...(h && rencana
      ? {
          rencanaId: rencana.id,
          vBaterai: String(cfg.profil_paket.tegangan_nominal_v),
          kwInverter: String(h.ringkasan.inverter_kw),
          kwPuncak: String(h.ringkasan.daya_puncak_kw),
          paket: String(h.ringkasan.jumlah_paket),
          kapasitas: String(h.parameter.kapasitas_paket_kwh),
          soh: String(h.parameter.soh_paket * 100),
        }
      : {}),
  };
  const konteks = baterai ? `Baterai ${baterai.kode} · ${baterai.merek} ${baterai.model}` : rencana ? `Rencana ${rencana.namaDesa}` : null;

  return (
    <>
      <PageHeader
        eyebrow="Perencanaan"
        title="Cek kompatibilitas"
        description="Cocokkan tegangan baterai dengan spesifikasi inverter sebelum pemasangan. Hasil: layak, perlu penyesuaian, atau tidak layak — selalu dengan alasan."
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
        <CompatForm initial={initial} konteks={konteks} key={`${bateraiId}-${rencanaId}`} />
        <aside>
          <Card>
            <SectionTitle title="Riwayat pemeriksaan" />
            {riwayat.length ? (
              <ul className="space-y-3">
                {riwayat.map((r) => {
                  const hk = r.hasil as unknown as HasilKompatibilitas;
                  return (
                    <li key={r.id} className="flex items-start justify-between gap-3 text-sm">
                      <span>
                        <span className="font-medium">{r.baterai?.kode ?? r.rencana?.namaDesa ?? "Manual"}</span>
                        <span className="block text-xs text-ink-500">{tanggal(r.createdAt, true)}</span>
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
        </aside>
      </div>
    </>
  );
}
