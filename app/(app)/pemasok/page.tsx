import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Suspense } from "react";
import { Building2, Mail, MapPin, Phone } from "lucide-react";
import { Paginasi, bacaHalaman } from "@/components/paginasi";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { JENIS_KIMIA, PROVINSI } from "@/lib/wilayah";
import { PemasokFilter } from "./filter-form";

export const metadata: Metadata = { title: "Pemasok" };

export default async function PemasokPage({ searchParams }: PageProps<"/pemasok">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const provinsi = typeof sp.provinsi === "string" ? sp.provinsi : "";
  const kimia = typeof sp.kimia === "string" ? sp.kimia : "";

  // ADM-6: cari dan saring berdasarkan nama perusahaan, wilayah, dan jenis baterai.
  const and: Prisma.PemasokWhereInput[] = [];
  if (q) and.push({ OR: [{ namaPerusahaan: { contains: q, mode: "insensitive" } }, { namaPenanggungJawab: { contains: q, mode: "insensitive" } }, { kota: { contains: q, mode: "insensitive" } }] });
  if (provinsi) and.push({ OR: [{ provinsi }, { provinsiPenyimpanan: provinsi }] });
  if (kimia) and.push({ OR: [{ jenisBaterai: { contains: kimia, mode: "insensitive" } }, { baterai: { some: { jenisKimia: kimia } } }] });
  const where: Prisma.PemasokWhereInput = { AND: and };

  const total = await prisma.pemasok.count({ where });
  const { halaman, skip, take } = bacaHalaman(sp, total);
  const rows = await prisma.pemasok.findMany({
    where,
    orderBy: { namaPerusahaan: "asc" },
    skip,
    take,
    include: { _count: { select: { baterai: true } }, baterai: { select: { status: true, jenisKimia: true } } },
  });
  const filtered = Boolean(q || provinsi || kimia);

  return (
    <>
      <PageHeader eyebrow="Baterai" title="Pemasok baterai" description="Operator armada, bengkel, dan produsen yang menyalurkan baterai pensiun kendaraan listrik." />
      <Suspense fallback={<div className="mb-4 h-[9.75rem] rounded-[var(--radius-card)] bg-surface ring-1 ring-ink-200/60" />}>
        <PemasokFilter provinsi={PROVINSI} kimia={JENIS_KIMIA} />
      </Suspense>

      {rows.length === 0 ? (
        <EmptyState icon={<Building2 className="size-5" />} title={filtered ? "Tidak ada pemasok yang cocok" : "Belum ada pemasok"} description={filtered ? "Ubah kata kunci atau filter." : "Pemasok dapat mendaftar sendiri melalui halaman Daftar."} />
      ) : (
        <>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => {
            const dinilai = p.baterai.filter((b) => b.status === "DINILAI").length;
            const jenis = [...new Set(p.baterai.map((b) => b.jenisKimia))];
            return (
              <Link key={p.id} href={`/pemasok/${p.id}`} className="group">
                <Card className="h-full transition group-hover:shadow-lift">
                  <div className="flex items-start gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-ink-900 text-sm font-bold text-sun-400">
                      {p.namaPerusahaan.replace(/^(PT|CV)\s+/i, "").slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold leading-snug group-hover:underline">{p.namaPerusahaan}</p>
                      <p className="text-sm text-ink-500">{p.namaPenanggungJawab}</p>
                    </div>
                  </div>
                  <ul className="mt-4 space-y-1.5 text-sm text-ink-600">
                    <li className="flex gap-2">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-ink-400" />
                      <span>
                        {p.alamat}, {p.kota}, {p.provinsi}
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Phone className="mt-0.5 size-4 shrink-0 text-ink-400" /> {p.telepon}
                    </li>
                    <li className="flex gap-2 truncate">
                      <Mail className="mt-0.5 size-4 shrink-0 text-ink-400" /> {p.emailPerusahaan}
                    </li>
                  </ul>
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-4">
                    <Badge tone="ink">{p._count.baterai} baterai</Badge>
                    <Badge tone="leaf">{dinilai} dinilai</Badge>
                    {jenis.map((j) => (
                      <Badge key={j}>{j}</Badge>
                    ))}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
        <Paginasi basePath="/pemasok" sp={sp} halaman={halaman} total={total} tampil={rows.length} satuan="pemasok" />
        </>
      )}
    </>
  );
}
