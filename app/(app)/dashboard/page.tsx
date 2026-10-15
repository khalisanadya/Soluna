import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Battery, PackagePlus as BatteryPlus, ChevronRight, ClipboardCheck, Clock3, Factory, SunMedium } from "lucide-react";
import { Badge, ButtonLink, Card, EmptyState, GradeBadge, SectionTitle, SohBadge, Stat } from "@/components/ui";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { getActiveConfig } from "@/lib/config";
import { gradeCounts } from "@/lib/data";
import { num, tanggal } from "@/lib/format";
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
  const [baterai, counts, agregat, pemasok, { data: cfg }] = await Promise.all([
    prisma.baterai.findMany({ where, orderBy: { createdAt: "desc" }, take: 6 }),
    gradeCounts(where),
    prisma.baterai.aggregate({ where, _sum: { kapasitasAwalKwh: true }, _avg: { sohTerakhir: true } }),
    prisma.pemasok.findUnique({ where: { id: user.pemasokId! } }),
    getActiveConfig(),
  ]);
  const total = counts.A + counts.B + counts.C + counts.D + counts.belum;
  const dinilai = total - counts.belum;
  const persen = total ? Math.round((dinilai / total) * 100) : 0;
  const sapaan = (() => {
    const jam = Number(new Intl.DateTimeFormat("id-ID", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Jakarta" }).format(new Date()));
    return jam < 11 ? "Selamat pagi" : jam < 15 ? "Selamat siang" : jam < 18 ? "Selamat sore" : "Selamat malam";
  })();

  return (
    <>
      <div>
        {/* Sambutan + progres penilaian */}
        <Card tone="ink" className="relative overflow-hidden">
          <div className="pointer-events-none absolute -top-28 -right-20 size-80 rounded-full bg-sun-500/30 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 size-72 rounded-full bg-sun-700/20 blur-3xl" aria-hidden="true" />
          <SunMedium className="pointer-events-none absolute -top-8 -right-8 size-44 text-sun-400/15" strokeWidth={1} aria-hidden="true" />
          <div className="relative">
            <p className="eyebrow !text-sun-300">{pemasok?.namaPerusahaan ?? "Pemasok"}</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-[1.9rem]">
              {sapaan}, {user.nama.split(" ")[0]}
            </h1>
            <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-ink-300">
              Daftarkan baterai bekas, lakukan penilaian, dan terbitkan paspor baterai agar siap dipakai desa.
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-ink-300">Progres penilaian</span>
                  <span className="num font-semibold text-white">
                    {dinilai}/{total} baterai · {persen}%
                  </span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-sun-500 to-sun-300" style={{ width: `${persen}%` }} />
                </div>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-xs text-ink-400">Total kapasitas</p>
                  <p className="num text-xl font-semibold text-white">
                    {num(agregat._sum.kapasitasAwalKwh ?? 0)} <span className="text-sm font-normal text-ink-400">kWh</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-ink-400">Rata-rata SoH</p>
                  <p className="num text-xl font-semibold text-white">
                    {agregat._avg.sohTerakhir !== null ? `${num(agregat._avg.sohTerakhir)}%` : "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <ButtonLink href="/penilaian/baru">
                <ClipboardCheck className="size-4" /> Nilai baterai
              </ButtonLink>
              <ButtonLink href="/baterai/baru" variant="secondary" className="!bg-white/10 !text-white !ring-white/20 hover:!bg-white/15">
                <BatteryPlus className="size-4" /> Tambah baterai
              </ButtonLink>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Baterai terdaftar" value={total} icon={<Battery className="size-4" />} accent="ink" href="/baterai" />
        <Stat label="Sudah dinilai" value={dinilai} icon={<ClipboardCheck className="size-4" />} accent="leaf" href="/baterai?status=DINILAI" />
        <Stat label="Menunggu penilaian" value={counts.belum} icon={<Clock3 className="size-4" />} accent="sun" href="/baterai?status=BELUM_DINILAI" />
        <Stat label="Diarahkan daur ulang" value={counts.D} icon={<Factory className="size-4" />} accent="flame" href="/baterai?grade=D" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle
            title="Baterai terbaru"
            hint="6 baterai terakhir yang Anda daftarkan"
            action={
              <Link href="/baterai" className="inline-flex items-center gap-1 text-sm font-semibold text-sun-700 hover:underline">
                Semua <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          {baterai.length ? (
            <ul className="-mx-2 space-y-1">
              {baterai.map((b) => (
                <li key={b.id}>
                  <Link href={`/baterai/${b.id}`} className="group flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-ink-50">
                    <GradeBadge grade={b.gradeTerakhir} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="num text-sm font-semibold">{b.kode}</span>
                        <span className="hidden text-xs text-ink-400 sm:inline">· {tanggal(b.createdAt)}</span>
                      </span>
                      <span className="block truncate text-sm text-ink-500">
                        {b.merek} {b.model} · {b.jenisKimia} · {num(b.kapasitasAwalKwh)} kWh
                      </span>
                    </span>
                    {b.status === "DINILAI" ? <SohBadge soh={b.sohTerakhir} tinggi={cfg.grade.A} rendah={cfg.grade.C} /> : <Badge tone="sun">Menunggu</Badge>}
                    <ChevronRight className="size-4 shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-600" />
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
