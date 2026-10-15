import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type { Prisma } from "@prisma/client";
import { BatteryCharging, ChevronRight, Plus } from "lucide-react";
import { Badge, ButtonLink, Card, EmptyState, GradeBadge, PageHeader, SohBadge } from "@/components/ui";
import { Paginasi, bacaHalaman } from "@/components/paginasi";
import { requireUser } from "@/lib/auth";
import { getActiveConfig } from "@/lib/config";
import { bateraiScope } from "@/lib/data";
import { num } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { JENIS_KIMIA } from "@/lib/wilayah";
import { FilterForm } from "./filter-form";
import { AdminBatteryLookup } from "./admin-lookup";

export const metadata: Metadata = { title: "Baterai" };

export default async function BateraiPage({ searchParams }: PageProps<"/baterai">) {
  const user = await requireUser();
  const sp = await searchParams;
  if (user.peran === "ADMIN") {
    const query = typeof sp.q === "string" ? sp.q.trim() : "";
    const message = typeof sp.pesan === "string" ? sp.pesan : undefined;
    return <AdminBatteryLookup query={query} message={message} />;
  }
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = sp.status === "DINILAI" || sp.status === "BELUM_DINILAI" ? sp.status : "";
  const grade = typeof sp.grade === "string" && ["A", "B", "C", "D"].includes(sp.grade) ? sp.grade : "";
  const kimia = typeof sp.kimia === "string" ? sp.kimia : "";
  const pemasokId = "";

  const where: Prisma.BateraiWhereInput = {
    ...bateraiScope(user),
    ...(status ? { status } : {}),
    ...(grade ? { gradeTerakhir: grade } : {}),
    ...(kimia ? { jenisKimia: kimia } : {}),
    ...(pemasokId ? { pemasokId } : {}),
    ...(q
      ? {
          OR: [
            { kode: { contains: q, mode: "insensitive" } },
            { merek: { contains: q, mode: "insensitive" } },
            { model: { contains: q, mode: "insensitive" } },
            { pemasok: { namaPerusahaan: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const total = await prisma.baterai.count({ where });
  const { halaman, skip, take } = bacaHalaman(sp, total);

  const [rows, pemasok] = await Promise.all([
    prisma.baterai.findMany({
      where,
      orderBy: { kode: "asc" },
      skip,
      take,
      include: {
        pemasok: { select: { id: true, namaPerusahaan: true } },
        penilaian: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true } },
      },
    }),
    [],
  ]);
  const filtered = Boolean(q || status || grade || kimia || pemasokId);
  const isAdmin = false;
  const { data: cfg } = await getActiveConfig();

  return (
    <>
      <PageHeader
        eyebrow="Baterai"
        title={isAdmin ? "Daftar baterai" : "Baterai saya"}
        description={isAdmin ? "Semua baterai bekas yang ditawarkan pemasok. Pilih baterai untuk dinilai." : "Baterai yang Anda daftarkan beserta status penilaiannya."}
        actions={
          <ButtonLink href="/baterai/baru">
            <Plus className="size-4" /> Tambah baterai
          </ButtonLink>
        }
      />

      <Suspense fallback={<div className="mb-4 h-[9.75rem] rounded-[var(--radius-card)] bg-surface ring-1 ring-ink-200/60" />}>
        <FilterForm kimia={JENIS_KIMIA} pemasok={isAdmin ? pemasok : null} />
      </Suspense>

      {rows.length === 0 ? (
        <EmptyState
          icon={<BatteryCharging className="size-5" />}
          title={filtered ? "Tidak ada baterai yang cocok" : "Belum ada baterai"}
          description={filtered ? "Ubah kata kunci atau filter." : "Tambahkan baterai pensiun pertama."}
          action={!filtered && <ButtonLink href="/baterai/baru">Tambah baterai</ButtonLink>}
        />
      ) : (
        <>
          {/* Desktop: tabel */}
          <Card className="hidden overflow-hidden !p-0 md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-50 text-xs text-ink-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Kode</th>
                  <th className="px-3 py-3 font-medium">Baterai</th>
                  {isAdmin && <th className="px-3 py-3 font-medium">Pemasok</th>}
                  <th className="px-3 py-3 text-right font-medium">Kapasitas</th>
                  <th className="w-24 px-2 py-3 text-center font-medium">Status</th>
                  <th className="w-24 px-2 py-3 text-center font-medium">SoH</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map((b) => (
                  <tr key={b.id} className="group hover:bg-ink-50/70">
                    <td className="px-5 py-3">
                      <Link href={`/baterai/${b.id}`} className="num font-semibold hover:underline">
                        {b.kode}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <span className="block font-medium">
                        {b.merek} {b.model}
                      </span>
                      <span className="text-xs text-ink-500">
                        {b.jenisKimia} · {b.usiaTahun !== null ? `${num(b.usiaTahun)} tahun` : "usia tidak diketahui"}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="max-w-48 truncate px-3 py-3 text-ink-600">
                        <Link href={`/pemasok/${b.pemasok.id}`} className="hover:underline">
                          {b.pemasok.namaPerusahaan}
                        </Link>
                      </td>
                    )}
                    <td className="num px-3 py-3 text-right">{num(b.kapasitasAwalKwh)} kWh</td>
                    <td className="px-2 py-3">
                      <div className="flex justify-center">
                        <GradeBadge grade={b.gradeTerakhir} size="sm" />
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <SohBadge soh={b.sohTerakhir} tinggi={cfg.grade.A} rendah={cfg.grade.C} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      {isAdmin ? (
                        <ButtonLink href={`/baterai/${b.id}`} size="sm" variant="secondary">
                          {b.status === "DINILAI" ? "Lihat assessment" : "Menunggu pemasok"}
                        </ButtonLink>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {b.penilaian[0] && (
                            <ButtonLink href={`/penilaian/${b.penilaian[0].id}`} size="sm" variant="secondary">
                              Paspor
                            </ButtonLink>
                          )}
                          <Link href={`/baterai/${b.id}`} className="text-ink-400 group-hover:text-ink-900">
                            <ChevronRight className="ml-auto size-4" />
                          </Link>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          {/* Ponsel: kartu */}
          <ul className="space-y-2 md:hidden">
            {rows.map((b) => (
              <li key={b.id}>
                <Link href={`/baterai/${b.id}`} className="flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-soft ring-1 ring-ink-200/60">
                  <GradeBadge grade={b.gradeTerakhir} />
                  <span className="min-w-0 flex-1">
                    <span className="num block text-sm font-semibold">{b.kode}</span>
                    <span className="block truncate text-sm text-ink-600">
                      {b.merek} {b.model} · {num(b.kapasitasAwalKwh)} kWh
                    </span>
                    {isAdmin && <span className="block truncate text-xs text-ink-500">{b.pemasok.namaPerusahaan}</span>}
                  </span>
                  {b.status === "DINILAI" ? <SohBadge soh={b.sohTerakhir} tinggi={cfg.grade.A} rendah={cfg.grade.C} /> : <Badge tone="sun">Menunggu</Badge>}
                </Link>
              </li>
            ))}
          </ul>
          <Paginasi basePath="/baterai" sp={sp} halaman={halaman} total={total} tampil={rows.length} satuan="baterai" />
        </>
      )}
    </>
  );
}
