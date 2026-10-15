import type { Metadata } from "next";
import Link from "next/link";
import { Plus, SunMedium } from "lucide-react";
import { ButtonLink, Card, EmptyState, IlustrasiTag, PageHeader } from "@/components/ui";
import { Paginasi, bacaHalaman } from "@/components/paginasi";
import { requireAdmin } from "@/lib/auth";
import { num, tanggal } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { HasilRencana } from "@/lib/types";

export const metadata: Metadata = { title: "Perencana Desa" };

export default async function PerencanaPage({ searchParams }: PageProps<"/perencana">) {
  await requireAdmin();
  const sp = await searchParams;
  const totalRencana = await prisma.rencanaDesa.count();
  const hal = bacaHalaman(sp, totalRencana);
  const rencana = await prisma.rencanaDesa.findMany({ orderBy: { createdAt: "desc" }, skip: hal.skip, take: hal.take });

  return (
    <>
      <PageHeader
        eyebrow="Perencanaan"
        title="Perencana desa"
        description="Rancangan panel surya, baterai, dan inverter untuk setiap desa."
        actions={
          <ButtonLink href="/perencana/baru">
            <Plus className="size-4" /> Tambah rencana
          </ButtonLink>
        }
      />
      <Card className="!p-0">
        {rencana.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-ink-50 text-xs text-ink-500">
                <tr>
                  <th className="px-5 py-3 font-medium sm:px-6">Desa & rencana</th>
                  <th className="px-3 py-3 text-center font-medium">Rumah</th>
                  <th className="px-3 py-3 text-center font-medium">Kebutuhan</th>
                  <th className="px-3 py-3 text-center font-medium">Baterai</th>
                  <th className="px-3 py-3 text-center font-medium">Panel</th>
                  <th className="px-3 py-3 text-center font-medium">Inverter</th>
                  <th className="px-3 py-3 text-center font-medium">Dibuat</th>
                  <th className="px-5 py-3 text-center font-medium sm:px-6">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rencana.map((r) => {
                  const h = r.hasil as unknown as HasilRencana;
                  const m = r.masukan as { jumlah_rumah?: number };
                  return (
                    <tr key={r.id} className="hover:bg-ink-50/70">
                      <td className="px-5 py-3 sm:px-6">
                        <Link href={`/perencana/${r.id}`} className="flex items-center gap-2 font-semibold hover:underline">
                          {r.namaDesa} {r.ilustrasi && <IlustrasiTag />}
                        </Link>
                        <span className="block text-xs text-ink-500">{r.nama}</span>
                      </td>
                      <td className="num px-3 py-3 text-center">{num(m.jumlah_rumah, 0)}</td>
                      <td className="num px-3 py-3 text-center whitespace-nowrap">{num(h.ringkasan.kebutuhan_harian_kwh)} kWh/hari</td>
                      <td className="num px-3 py-3 text-center">{h.ringkasan.jumlah_paket} paket</td>
                      <td className="num px-3 py-3 text-center">{num(h.ringkasan.kapasitas_panel_terpasang_kwp)} kWp</td>
                      <td className="num px-3 py-3 text-center">{h.ringkasan.inverter_kw} kW</td>
                      <td className="px-3 py-3 text-center whitespace-nowrap text-ink-600">{tanggal(r.createdAt)}</td>
                      <td className="px-5 py-3 text-center sm:px-6">
                        <ButtonLink href={`/perencana/${r.id}`} size="sm" variant="secondary">
                          Lihat hasil
                        </ButtonLink>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<SunMedium className="size-5" />}
            title="Belum ada rencana"
            description="Buat rencana pertama untuk desa Anda."
            action={
              <ButtonLink href="/perencana/baru">
                <Plus className="size-4" /> Tambah rencana
              </ButtonLink>
            }
            className="m-5 py-10 sm:m-6"
          />
        )}
      </Card>
      {rencana.length > 0 && <Paginasi basePath="/perencana" sp={sp} halaman={hal.halaman} total={totalRencana} tampil={rencana.length} satuan="rencana" />}
    </>
  );
}
