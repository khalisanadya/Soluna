import type { Metadata } from "next";
import Link from "next/link";
import { SunMedium } from "lucide-react";
import { Card, EmptyState, IlustrasiTag, PageHeader, SectionTitle } from "@/components/ui";
import { Paginasi, bacaHalaman } from "@/components/paginasi";
import { requireAdmin } from "@/lib/auth";
import { getActiveConfig } from "@/lib/config";
import { num, tanggal } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { HasilRencana } from "@/lib/types";
import { PlanForm } from "./plan-form";

export const metadata: Metadata = { title: "Perencana Desa" };

export default async function PerencanaPage({ searchParams }: PageProps<"/perencana">) {
  await requireAdmin();
  const sp = await searchParams;
  const totalRencana = await prisma.rencanaDesa.count();
  const hal = bacaHalaman(sp, totalRencana);
  const [{ data: cfg }, rencana, baterai] = await Promise.all([
    getActiveConfig(),
    prisma.rencanaDesa.findMany({ orderBy: { createdAt: "desc" }, skip: hal.skip, take: hal.take }),
    prisma.baterai.findMany({
      where: { status: "DINILAI", gradeTerakhir: { in: ["A", "B", "C"] } },
      orderBy: { sohTerakhir: "desc" },
      select: { id: true, kode: true, merek: true, model: true, kapasitasAwalKwh: true, sohTerakhir: true, gradeTerakhir: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Perencanaan"
        title="Rancang sistem energi desa"
        description="Masukkan profil kebutuhan desa untuk menghitung paket baterai, panel surya, inverter, dan perbandingan biaya dengan genset diesel."
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <PlanForm
          lokasi={Object.entries(cfg.lokasi_psh).map(([k, v]) => ({ nama: k, psh: v }))}
          baterai={baterai.map((b) => ({ id: b.id, label: `${b.kode} · ${b.merek} ${b.model} — ${num(b.kapasitasAwalKwh)} kWh, SoH ${num(b.sohTerakhir)}%, grade ${b.gradeTerakhir}` }))}
          defaults={{
            psh: cfg.surya.psh_jam,
            pr: Math.round(cfg.surya.pr * 100),
            efisiensi: Math.round(cfg.efisiensi * 100),
            dod: Math.round(cfg.dod * 100),
            hariCadangan: cfg.hari_cadangan,
            wpPanel: cfg.surya.kapasitas_per_panel_wp,
            kapasitasPaket: cfg.profil_paket.kapasitas_kwh,
            sohPaket: Math.round(cfg.profil_paket.soh * 100),
            hargaSolarMin: cfg.diesel.harga_per_liter_rendah,
            hargaSolarMaks: cfg.diesel.harga_per_liter_tinggi,
          }}
        />
        <aside>
          <Card className="xl:sticky xl:top-6">
            <SectionTitle title="Rencana tersimpan" />
            {rencana.length ? (
              <ul className="-mx-2 space-y-1">
                {rencana.map((r) => {
                  const h = r.hasil as unknown as HasilRencana;
                  return (
                    <li key={r.id}>
                      <Link href={`/perencana/${r.id}`} className="block rounded-xl p-2 hover:bg-ink-50">
                        <span className="flex items-center gap-2 text-sm font-semibold">
                          {r.namaDesa} {r.ilustrasi && <IlustrasiTag />}
                        </span>
                        <span className="block text-xs text-ink-500">
                          {r.nama} · {tanggal(r.createdAt)}
                        </span>
                        <span className="num mt-1 block text-xs text-ink-600">
                          {h.ringkasan.jumlah_paket} paket · {num(h.ringkasan.kapasitas_panel_kwp)} kWp · {h.ringkasan.inverter_kw} kW
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon={<SunMedium className="size-5" />} title="Belum ada rencana" className="py-8" />
            )}
            {rencana.length > 0 && (
              <Paginasi basePath="/perencana" sp={sp} halaman={hal.halaman} total={totalRencana} tampil={rencana.length} satuan="rencana" ringkas className="border-t border-ink-100 pt-3" />
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
