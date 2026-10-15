import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck, Plus } from "lucide-react";
import { ButtonLink, Card, EmptyState, GradeBadge, PageHeader, SohBadge, buttonClass, gradeTone, tingkatSoh } from "@/components/ui";
import { Paginasi, bacaHalaman } from "@/components/paginasi";
import { requireAdmin } from "@/lib/auth";
import { getActiveConfig } from "@/lib/config";
import { num, rentangUmur, tanggal } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Penilaian Baterai" };

export default async function RiwayatPenilaianPage({ searchParams }: PageProps<"/penilaian">) {
  await requireAdmin();
  const sp = await searchParams;
  const grade = typeof sp.grade === "string" && ["A", "B", "C", "D"].includes(sp.grade) ? sp.grade : "";
  const where = grade ? { grade } : {};
  const total = await prisma.penilaian.count({ where });
  const { halaman, skip, take } = bacaHalaman(sp, total);
  const { data: cfg } = await getActiveConfig();
  const rows = await prisma.penilaian.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take,
    include: { baterai: { select: { id: true, kode: true, merek: true, model: true, jenisKimia: true } } },
  });

  return (
    <>
      <PageHeader
        eyebrow="Baterai"
        title="Penilaian baterai"
        description="Riwayat penilaian dan paspor baterai. Setiap hasil mencatat versi konfigurasi dan versi model."
        actions={
          <ButtonLink href="/penilaian/baru">
            <Plus className="size-4" /> Penilaian baru
          </ButtonLink>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {["", "A", "B", "C", "D"].map((g) => (
          <Link key={g || "semua"} href={g ? `/penilaian?grade=${g}` : "/penilaian"} className={buttonClass(grade === g ? "dark" : "secondary", "sm")}>
            {g ? `Grade ${g}` : "Semua"}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={<ClipboardCheck className="size-5" />} title="Belum ada penilaian" description="Pilih baterai dan nilai kesehatannya untuk menerbitkan paspor." action={<ButtonLink href="/penilaian/baru">Penilaian baru</ButtonLink>} />
      ) : (
        <>
        <Card className="overflow-x-auto !p-0">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-ink-50 text-xs text-ink-500">
              <tr>
                <th className="px-5 py-3 font-medium">Tanggal</th>
                <th className="px-3 py-3 font-medium">Baterai</th>
                <th className="px-3 py-3 text-center font-medium">Grade</th>
                <th className="w-24 px-2 py-3 text-center font-medium">SoH</th>
                <th className="px-3 py-3 text-right font-medium">Perkiraan sisa umur</th>
                <th className="px-3 py-3 text-right font-medium" title="Seberapa andal hasil penilaian, dari kelengkapan data uji dan kepastian model">Keyakinan</th>
                <th className="px-3 py-3 font-medium">Versi</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-ink-50/70">
                  <td className="px-5 py-3 whitespace-nowrap">{tanggal(p.createdAt)}</td>
                  <td className="px-3 py-3">
                    <Link href={`/baterai/${p.baterai.id}`} className="num font-semibold hover:underline">
                      {p.baterai.kode}
                    </Link>
                    <span className="block text-xs text-ink-500">
                      {p.baterai.merek} {p.baterai.model} · {p.baterai.jenisKimia}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="flex justify-center">
                      <GradeBadge grade={p.grade} size="sm" />
                    </span>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <SohBadge soh={p.soh} tinggi={cfg.grade.A} rendah={cfg.grade.C} />
                  </td>
                  <td className="num px-3 py-3 text-right whitespace-nowrap">
                    {rentangUmur(p.sisaUmurBawah, p.sisaUmurAtas)}
                  </td>
                  <td className="num px-3 py-3 text-right">{num(p.keyakinan, 0)}%</td>
                  <td className="px-3 py-3 text-xs text-ink-500">v{p.versiKonfigurasi}</td>
                  <td className="px-5 py-3 text-right">
                    <ButtonLink href={`/penilaian/${p.id}`} size="sm" variant="secondary">
                      Paspor
                    </ButtonLink>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Paginasi basePath="/penilaian" sp={sp} halaman={halaman} total={total} tampil={rows.length} satuan="penilaian" />
        <Keterangan grade={cfg.grade} />
        </>
      )}
    </>
  );
}

/** Keterangan ringkas di bawah tabel: warna grade dan warna SoH. */
function Keterangan({ grade }: { grade: { A: number; B: number; C: number } }) {
  const soh = [tingkatSoh(grade.A, grade.A, grade.C), tingkatSoh(grade.C, grade.A, grade.C), tingkatSoh(grade.C - 1, grade.A, grade.C)];
  return (
    <div className="mt-3 flex flex-col gap-2 px-1 text-sm text-ink-600 sm:flex-row sm:flex-wrap sm:gap-x-8">
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1" aria-label="Keterangan grade">
        <li className="text-xs font-medium text-ink-500">Grade:</li>
        {(["A", "B", "C", "D"] as const).map((g) => (
          <li key={g} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: gradeTone[g].hex }} aria-hidden="true" />
            {gradeTone[g].label}
          </li>
        ))}
      </ul>
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1" aria-label="Keterangan SoH">
        <li className="text-xs font-medium text-ink-500">SoH:</li>
        {soh.map((t) => (
          <li key={t.label} className="flex items-center gap-1.5">
            <span className={`size-2.5 rounded-full ${t.dot}`} aria-hidden="true" />
            {t.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
