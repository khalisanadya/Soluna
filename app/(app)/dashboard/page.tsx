import type { Metadata } from "next";
import Link from "next/link";
import { Battery, PackagePlus as BatteryPlus, ClipboardCheck, Clock3, Factory } from "lucide-react";
import { Badge, ButtonLink, Card, EmptyState, GradeBadge, PageHeader, SectionTitle, Stat } from "@/components/ui";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { gradeCounts } from "@/lib/data";
import { num } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { AdminDashboard } from "./admin-dashboard";
import { GradeDistribution } from "./grade-distribution";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  return user.peran === "ADMIN" ? <AdminDashboard /> : <PemasokDashboard user={user} />;
}

async function PemasokDashboard({ user }: { user: CurrentUser }) {
  const where = { pemasokId: user.pemasokId! };
  const [baterai, counts, pemasok] = await Promise.all([
    prisma.baterai.findMany({ where, orderBy: { createdAt: "desc" }, take: 6 }),
    gradeCounts(where),
    prisma.pemasok.findUnique({ where: { id: user.pemasokId! } }),
  ]);
  const total = counts.A + counts.B + counts.C + counts.D + counts.belum;
  return (
    <>
      <PageHeader
        eyebrow={pemasok?.namaPerusahaan ?? "Pemasok"}
        description="Daftarkan baterai bekas, lakukan assessment, dan terbitkan paspor baterai untuk digunakan desa."
        actions={
          <ButtonLink href="/baterai/baru">
            <BatteryPlus className="size-4" /> Tambah baterai
          </ButtonLink>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Baterai terdaftar" value={total} icon={<Battery className="size-4" />} accent="ink" />
        <Stat label="Sudah dinilai" value={total - counts.belum} icon={<ClipboardCheck className="size-4" />} accent="leaf" />
        <Stat label="Menunggu penilaian" value={counts.belum} icon={<Clock3 className="size-4" />} accent="sun" />
        <Stat label="Diarahkan daur ulang" value={counts.D} icon={<Factory className="size-4" />} accent="flame" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle title="Baterai terbaru" action={<Link href="/baterai" className="text-sm font-semibold text-sun-700 hover:underline">Semua</Link>} />
          {baterai.length ? (
            <ul className="divide-y divide-ink-100">
              {baterai.map((b) => (
                <li key={b.id}>
                  <Link href={`/baterai/${b.id}`} className="flex items-center gap-3 py-3 hover:bg-ink-50 sm:px-2">
                    <GradeBadge grade={b.gradeTerakhir} />
                    <span className="min-w-0 flex-1">
                      <span className="num block text-sm font-semibold">{b.kode}</span>
                      <span className="block truncate text-sm text-ink-500">
                        {b.merek} {b.model} · {b.jenisKimia} · {num(b.kapasitasAwalKwh)} kWh
                      </span>
                    </span>
                    {b.status === "DINILAI" ? <Badge tone="leaf">SoH {num(b.sohTerakhir)}%</Badge> : <Badge tone="sun">Menunggu</Badge>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Belum ada baterai" description="Tambahkan baterai pertama, lalu lakukan assessment untuk menerbitkan paspor." action={<ButtonLink href="/baterai/baru">Tambah baterai</ButtonLink>} />
          )}
        </Card>
        <GradeDistribution counts={counts} />
      </div>
    </>
  );
}
