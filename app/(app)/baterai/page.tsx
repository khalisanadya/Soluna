import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type { Prisma } from "@prisma/client";
import { BatteryCharging, ChevronRight, ClipboardCheck, Plus } from "lucide-react";
import { Badge, ButtonLink, Card, EmptyState, GradeBadge, PageHeader, SohBadge, gradeTone } from "@/components/ui";
import { Paginasi, bacaHalaman } from "@/components/paginasi";
import { requireUser } from "@/lib/auth";
import { getActiveConfig } from "@/lib/config";
import { bateraiScope } from "@/lib/data";
import { cn, num } from "@/lib/format";
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
          <>
            <ButtonLink href="/penilaian/baru" variant="secondary">
              <ClipboardCheck className="size-4" /> Penilaian baterai
            </ButtonLink>
            <ButtonLink href="/baterai/baru">
              <Plus className="size-4" /> Tambah baterai
            </ButtonLink>
          </>
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
            <table className="w-full table-fixed text-left text-sm">
              <thead className="bg-ink-50 text-xs text-ink-500">
                <tr>
                  <th className="w-32 px-5 py-3 font-medium">Kode</th>
                  <th className="px-3 py-3 font-medium">Baterai</th>
                  {isAdmin && <th className="px-3 py-3 font-medium">Pemasok</th>}
                  <th className="w-28 px-3 py-3 text-center font-medium">Kapasitas</th>
                  <th className="w-32 px-3 py-3 text-center font-medium">Grade</th>
                  <th className="w-28 px-3 py-3 text-center font-medium">SoH</th>
                  <th className="w-56 px-5 py-3 text-center font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map((b) => (
                  <tr key={b.id} className="group hover:bg-ink-50/70">
                    <td className="px-5 py-3 align-middle">
                      <Link href={`/baterai/${b.id}`} className="num font-semibold hover:underline">
                        {b.kode}
                      </Link>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <span className="block truncate font-medium">
                        {b.merek} {b.model}
                      </span>
                      <span className="block truncate text-xs text-ink-500">
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
                    <td className="num px-3 py-3 text-center align-middle whitespace-nowrap">{num(b.kapasitasAwalKwh)} kWh</td>
                    <td className="px-3 py-3 align-middle">
                      <div className="flex justify-center">
                        <GradeBadge grade={b.gradeTerakhir} size="sm" />
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center align-middle">
                      <SohBadge soh={b.sohTerakhir} tinggi={cfg.grade.A} rendah={cfg.grade.C} />
                    </td>
                    <td className="px-5 py-3 text-center align-middle">
                      {isAdmin ? (
                        <ButtonLink href={`/baterai/${b.id}`} size="sm" variant="secondary">
                          {b.status === "DINILAI" ? "Lihat assessment" : "Menunggu pemasok"}
                        </ButtonLink>
                      ) : (
                        <div className="flex items-center justify-center gap-3">
                          {b.penilaian[0] ? (
                            <ButtonLink href={`/penilaian/${b.penilaian[0].id}`} size="sm" variant="secondary" className="w-32 justify-center">
                              Paspor
                            </ButtonLink>
                          ) : (
                            <ButtonLink href={`/penilaian/baru?baterai=${b.id}`} size="sm" className="w-32 justify-center">
                              <ClipboardCheck className="size-4" /> Nilai baterai
                            </ButtonLink>
                          )}
                          <Link
                            href={`/baterai/${b.id}`}
                            aria-label={`Detail baterai ${b.kode}`}
                            title="Lihat detail"
                            className="grid size-8 place-items-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-900 group-hover:text-ink-700"
                          >
                            <ChevronRight className="size-4" />
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
          <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-600" aria-label="Arti warna grade">
            {(["A", "B", "C", "D"] as const).map((g) => (
              <li key={g} className="flex items-center gap-2">
                <span className={cn("size-2.5 rounded-full", gradeTone[g].bg)} aria-hidden="true" />
                {gradeTone[g].label}
              </li>
            ))}
          </ul>
          <Paginasi basePath="/baterai" sp={sp} halaman={halaman} total={total} tampil={rows.length} satuan="baterai" />
        </>
      )}
    </>
  );
}
