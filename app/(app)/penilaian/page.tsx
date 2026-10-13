import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck, Plus } from "lucide-react";
import { ButtonLink, Card, EmptyState, GradeBadge, PageHeader, buttonClass } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { num, tanggal } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Penilaian Baterai" };

export default async function RiwayatPenilaianPage({ searchParams }: PageProps<"/penilaian">) {
  await requireAdmin();
  const sp = await searchParams;
  const grade = typeof sp.grade === "string" && ["A", "B", "C", "D"].includes(sp.grade) ? sp.grade : "";
  const rows = await prisma.penilaian.findMany({
    where: grade ? { grade } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { baterai: { select: { id: true, kode: true, merek: true, model: true, jenisKimia: true } }, penilai: { select: { nama: true } } },
  });

  return (
    <>
      <PageHeader
        eyebrow="Modul A"
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
        <Card className="overflow-x-auto p-0 sm:p-0">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-ink-50 text-xs text-ink-500">
              <tr>
                <th className="px-5 py-3 font-medium">Tanggal</th>
                <th className="px-3 py-3 font-medium">Baterai</th>
                <th className="px-3 py-3 font-medium">Grade</th>
                <th className="px-3 py-3 text-right font-medium">SoH</th>
                <th className="px-3 py-3 text-right font-medium">Sisa umur</th>
                <th className="px-3 py-3 text-right font-medium">Keyakinan</th>
                <th className="px-3 py-3 font-medium">Versi</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-ink-50/70">
                  <td className="px-5 py-3 whitespace-nowrap">
                    {tanggal(p.createdAt, true)}
                    <span className="block text-xs text-ink-500">{p.penilai.nama}</span>
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/baterai/${p.baterai.id}`} className="num font-semibold hover:underline">
                      {p.baterai.kode}
                    </Link>
                    <span className="block text-xs text-ink-500">
                      {p.baterai.merek} {p.baterai.model} · {p.baterai.jenisKimia}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-2">
                      <GradeBadge grade={p.grade} size="sm" />
                      <span className="text-xs text-ink-600">{p.keputusan}</span>
                    </span>
                  </td>
                  <td className="num px-3 py-3 text-right">{num(p.soh)}%</td>
                  <td className="num px-3 py-3 text-right whitespace-nowrap">
                    {num(p.sisaUmurBawah)}–{num(p.sisaUmurAtas)} th
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
      )}
    </>
  );
}
