import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, MapPin, Warehouse } from "lucide-react";
import { Paginasi, potong } from "@/components/paginasi";
import { Badge, ButtonLink, Card, EmptyState, GradeBadge, PageHeader, SectionTitle, SohBadge } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getActiveConfig } from "@/lib/config";
import { num, tanggal } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Detail Pemasok" };

export default async function DetailPemasokPage({ params, searchParams }: PageProps<"/pemasok/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const [p, { data: cfg }] = await Promise.all([
    prisma.pemasok.findUnique({ where: { id }, include: { baterai: { orderBy: { kode: "asc" } } } }),
    getActiveConfig(),
  ]);
  if (!p) notFound();
  const jenis = p.jenisBaterai ? p.jenisBaterai.split(/[,;]\s*/).filter(Boolean) : [...new Set(p.baterai.map((b) => b.jenisKimia))];
  const dinilai = p.baterai.filter((b) => b.status === "DINILAI").length;
  const hal = potong(p.baterai, sp);

  return (
    <>
      <PageHeader eyebrow="Pemasok" title={p.namaPerusahaan} description={p.deskripsi ?? undefined} />

      <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <Card className="self-start">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-ink-900 text-sm font-bold text-sun-400">
              {p.namaPerusahaan.replace(/^(PT|CV)\s+/i, "").slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{p.namaPenanggungJawab}</p>
              <p className="text-xs text-ink-500">Penanggung jawab · terdaftar {tanggal(p.createdAt)}</p>
            </div>
          </div>

          <Bagian judul="Kontak">
            <Baris k="Telepon" v={p.telepon} />
            <Baris k="Email" v={p.emailPerusahaan} />
          </Bagian>

          <Bagian judul="Alamat">
            <p className="flex gap-2 text-sm text-ink-700">
              <MapPin className="mt-0.5 size-4 shrink-0 text-ink-400" />
              <span>
                {p.alamat}, {p.kota}, {p.provinsi}
              </span>
            </p>
            <p className="mt-2 flex gap-2 text-sm text-ink-700">
              <Warehouse className="mt-0.5 size-4 shrink-0 text-ink-400" />
              <span>
                <span className="block text-xs text-ink-500">Lokasi penyimpanan baterai</span>
                {p.alamatPenyimpanan ? `${p.alamatPenyimpanan}, ${p.kotaPenyimpanan ?? ""}, ${p.provinsiPenyimpanan ?? ""}` : "Sama dengan alamat perusahaan"}
              </span>
            </p>
          </Bagian>

          <Bagian judul="Jenis baterai">
            {jenis.length ? (
              <div className="flex flex-wrap gap-1.5">
                {jenis.map((j) => (
                  <Badge key={j}>{j}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-500">—</p>
            )}
          </Bagian>
        </Card>

        <Card className="!p-0">
          <div className="p-5 pb-3 sm:p-6 sm:pb-3">
            <SectionTitle title="Baterai dari pemasok ini" hint={`${p.baterai.length} terdaftar · ${dinilai} sudah dinilai · ${p.baterai.length - dinilai} belum dinilai`} />
          </div>
          {p.baterai.length ? (
            <>
              <ul className="divide-y divide-ink-100 border-t border-ink-100">
                {hal.rows.map((b) => (
                  <li key={b.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                    {b.gradeTerakhir ? (
                      <GradeBadge grade={b.gradeTerakhir} size="sm" />
                    ) : (
                      <span className="size-6 shrink-0 rounded-md border border-dashed border-ink-300" title="Belum dinilai" />
                    )}
                    <Link href={`/baterai/${b.id}`} className="min-w-0 flex-1 hover:underline">
                      <span className="num block text-sm font-semibold">{b.kode}</span>
                      <span className="block truncate text-sm text-ink-500">
                        {b.merek} {b.model} · {b.jenisKimia} · {num(b.kapasitasAwalKwh)} kWh
                      </span>
                    </Link>
                    <span className="hidden w-24 justify-center sm:flex">
                      {b.status === "DINILAI" ? <SohBadge soh={b.sohTerakhir} tinggi={cfg.grade.A} rendah={cfg.grade.C} /> : <Badge tone="sun">Belum dinilai</Badge>}
                    </span>
                    <ButtonLink href={`/penilaian/baru?baterai=${b.id}`} size="sm" variant={b.status === "DINILAI" ? "secondary" : "dark"} className="w-28 shrink-0">
                      {b.status === "DINILAI" ? "Nilai ulang" : "Nilai"}
                    </ButtonLink>
                  </li>
                ))}
              </ul>
              <div className="border-t border-ink-100 px-5 pb-4 sm:px-6">
                <Paginasi basePath={`/pemasok/${p.id}`} sp={sp} halaman={hal.halaman} total={p.baterai.length} tampil={hal.rows.length} satuan="baterai" />
              </div>
            </>
          ) : (
            <EmptyState icon={<Building2 className="size-5" />} title="Belum ada baterai" className="m-5 py-8 sm:m-6" />
          )}
        </Card>
      </div>
    </>
  );
}

function Bagian({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 border-t border-ink-100 pt-4">
      <p className="eyebrow mb-2">{judul}</p>
      {children}
    </div>
  );
}

function Baris({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className="text-ink-500">{k}</span>
      <span className="truncate font-medium text-ink-900" title={v}>
        {v}
      </span>
    </div>
  );
}
