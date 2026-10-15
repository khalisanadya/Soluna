import type { Metadata } from "next";
import { RotateCcw } from "lucide-react";
import { activateConfig, resetConfig } from "@/app/actions/konfigurasi";
import { Badge, Card, PageHeader, SectionTitle, buttonClass } from "@/components/ui";
import { Paginasi, bacaHalaman } from "@/components/paginasi";
import { requireAdmin } from "@/lib/auth";
import { getActiveConfig } from "@/lib/config";
import { CONFIG_FIELDS, getPath } from "@/lib/config-fields";
import { cn, tanggal } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { ConfigForm } from "./config-form";

export const metadata: Metadata = { title: "Parameter Sistem" };

export default async function PengaturanPage({ searchParams }: PageProps<"/pengaturan">) {
  await requireAdmin();
  const sp = await searchParams;
  const [{ versi, data }, totalVersi] = await Promise.all([getActiveConfig(), prisma.konfigurasi.count()]);
  const hal = bacaHalaman(sp, totalVersi);
  const versions = await prisma.konfigurasi.findMany({ orderBy: { versi: "desc" }, skip: hal.skip, take: hal.take, include: { dibuatOleh: { select: { nama: true } } } });
  const values: Record<string, string> = {};
  for (const f of CONFIG_FIELDS) {
    const v = getPath(data, f.path);
    if (typeof v === "number") values[f.name] = String(Math.round((f.percent ? v * 100 : v) * 1000) / 1000);
  }
  // "Bawaan" (wilayah umum) lebih dulu, lalu wilayah sesuai abjad.
  const lokasi = Object.entries((data.lokasi_psh as Record<string, number>) ?? {})
    .map(([nama, psh]) => ({ nama, psh }))
    .sort((a, b) => (a.nama === "Bawaan" ? -1 : b.nama === "Bawaan" ? 1 : a.nama.localeCompare(b.nama, "id")));

  return (
    <>
      <PageHeader eyebrow="Pengaturan" title="Parameter sistem" description="Nilai yang dipakai semua perhitungan. Setiap perubahan disimpan sebagai versi baru." />
      <div className="space-y-6">
          <ConfigForm values={values} lokasi={lokasi} versi={versi} />

          <Card className="!p-0">
            <div className="px-5 pt-5">
              <SectionTitle
                title="Riwayat versi"
                hint="Hasil lama tetap memakai versi saat dihitung."
                action={
                  <form action={resetConfig}>
                    <button className={buttonClass("ghost", "sm")}>
                      <RotateCcw className="size-4" /> Nilai bawaan
                    </button>
                  </form>
                }
              />
            </div>
            <ul className="divide-y divide-ink-100 border-t border-ink-100">
              {versions.map((v) => (
                <li key={v.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <span className={cn("num grid h-8 min-w-11 place-items-center rounded-lg px-2 text-xs font-semibold", v.aktif ? "bg-leaf-500 text-white" : "bg-ink-100 text-ink-700")}>v{v.versi}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink-900">{v.catatan ?? "Tanpa catatan"}</span>
                    <span className="block text-xs text-ink-500">
                      {tanggal(v.createdAt, true)}
                      {v.dibuatOleh ? ` · ${v.dibuatOleh.nama}` : ""}
                    </span>
                  </span>
                  {v.aktif ? (
                    <Badge tone="leaf">Aktif</Badge>
                  ) : (
                    <form action={activateConfig}>
                      <input type="hidden" name="versi" value={v.versi} />
                      <button className={buttonClass("secondary", "sm")}>Pakai versi ini</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
            <div className="px-5 pb-4">
              <Paginasi basePath="/pengaturan" sp={sp} halaman={hal.halaman} total={totalVersi} tampil={versions.length} satuan="versi" />
            </div>
          </Card>
      </div>
    </>
  );
}
