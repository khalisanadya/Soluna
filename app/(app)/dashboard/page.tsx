import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  Battery,
  BatteryCharging as BatteryPlus,
  CalendarClock,
  ClipboardCheck,
  Clock3,
  Factory,
  Fuel,
  Leaf,
  SunMedium,
  Users,
  Zap,
} from "lucide-react";
import { BarRow, Donut } from "@/components/charts";
import { EnergyFlow } from "@/components/energy-flow";
import { Badge, ButtonLink, Card, Disclaimer, EmptyState, GradeBadge, IlustrasiTag, PageHeader, SectionTitle, Stat, gradeTone } from "@/components/ui";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { gradeCounts } from "@/lib/data";
import { callEngine } from "@/lib/engine";
import { days, num, tanggal } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { Grade, HasilKetahanan, HasilRencana } from "@/lib/types";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  return user.peran === "ADMIN" ? <AdminDashboard user={user} /> : <PemasokDashboard user={user} />;
}

function greeting() {
  const h = Number(new Intl.DateTimeFormat("id-ID", { hour: "numeric", hour12: false, timeZone: "Asia/Jakarta" }).format(new Date()));
  return h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 18 ? "Selamat sore" : "Selamat malam";
}

function GradeDistribution({ counts }: { counts: Record<Grade | "belum", number> }) {
  const dinilai = counts.A + counts.B + counts.C + counts.D;
  return (
    <Card>
      <SectionTitle title="Distribusi grade" hint="Kondisi baterai yang sudah dinilai" />
      <div className="flex flex-col items-center gap-6 sm:flex-row lg:flex-col">
        <Donut
          label="Distribusi grade baterai"
          segments={(["A", "B", "C", "D"] as Grade[]).map((g) => ({ label: `Grade ${g}`, value: counts[g], color: gradeTone[g].hex }))}
          center={
            <div>
              <p className="num text-3xl font-medium">{dinilai}</p>
              <p className="text-xs text-ink-500">dinilai</p>
            </div>
          }
        />
        <ul className="w-full flex-1 space-y-2.5">
          {(["A", "B", "C", "D"] as Grade[]).map((g) => (
            <li key={g} className="flex items-center gap-3 text-sm">
              <GradeBadge grade={g} size="sm" />
              <span className="flex-1 text-ink-600">{gradeTone[g].label}</span>
              <span className="num font-medium">{counts[g]}</span>
            </li>
          ))}
          <li className="flex items-center gap-3 border-t border-ink-100 pt-2.5 text-sm">
            <span className="size-6 rounded-md border border-dashed border-ink-300" />
            <span className="flex-1 text-ink-500">Belum dinilai</span>
            <span className="num font-medium">{counts.belum}</span>
          </li>
        </ul>
      </div>
    </Card>
  );
}

async function AdminDashboard({ user }: { user: CurrentUser }) {
  const [total, counts, kapasitas, totalPemasok, rencana, sehat, jadwal, menunggu] = await Promise.all([
    prisma.baterai.count(),
    gradeCounts(),
    prisma.baterai.aggregate({ _sum: { kapasitasAwalKwh: true } }),
    prisma.pemasok.count(),
    prisma.rencanaDesa.findFirst({ orderBy: { createdAt: "desc" } }),
    prisma.baterai.findMany({ where: { status: "DINILAI" }, orderBy: { sohTerakhir: "desc" }, take: 6, select: { id: true, kode: true, merek: true, model: true, sohTerakhir: true, gradeTerakhir: true } }),
    prisma.penilaian.findMany({
      where: { tanggalGanti: { not: null } },
      orderBy: { createdAt: "desc" },
      distinct: ["bateraiId"],
      select: { tanggalGanti: true, grade: true, soh: true, baterai: { select: { id: true, kode: true, merek: true, model: true } } },
    }),
    prisma.baterai.findMany({ where: { status: "BELUM_DINILAI" }, orderBy: { createdAt: "desc" }, take: 4, include: { pemasok: { select: { namaPerusahaan: true } } } }),
  ]);
  const dinilai = total - counts.belum;
  const hasil = rencana?.hasil as HasilRencana | undefined;
  const sisaKap = await prisma.baterai.findMany({ where: { status: "DINILAI" }, select: { kapasitasAwalKwh: true, sohTerakhir: true } });
  const kapSehat = sisaKap.reduce((s, b) => s + b.kapasitasAwalKwh * (b.sohTerakhir ?? 0) / 100, 0);
  const jadwalUrut = jadwal
    .filter((j) => j.tanggalGanti && j.grade !== "D")
    .sort((a, b) => +a.tanggalGanti! - +b.tanggalGanti!)
    .slice(0, 5);

  return (
    <>
      <PageHeader
        eyebrow={new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date())}
        title={`${greeting()}, ${user.nama.split(" ")[0] === "Admin" ? "Admin" : user.nama.split(" ")[0]}`}
        description="Gambaran cepat kondisi baterai, rencana energi desa, dan dampaknya terhadap pemakaian diesel."
        actions={
          <>
            <ButtonLink href="/penilaian/baru" variant="secondary">
              <ClipboardCheck className="size-4" /> Nilai baterai
            </ButtonLink>
            <ButtonLink href="/perencana">
              <SunMedium className="size-4" /> Rencana desa
            </ButtonLink>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Total baterai" value={total} icon={<Battery className="size-4" />} accent="ink" hint={`${num(kapasitas._sum.kapasitasAwalKwh ?? 0, 0)} kWh kapasitas awal`} />
        <Stat label="Sudah dinilai" value={dinilai} unit={`/ ${total}`} icon={<ClipboardCheck className="size-4" />} accent="leaf" hint={`${counts.belum} menunggu penilaian`} />
        <Stat label="Kapasitas sehat" value={num(kapSehat, 0)} unit="kWh" icon={<Zap className="size-4" />} accent="sun" hint="Kapasitas awal × SoH baterai dinilai" />
        <Stat label="Pemasok terdaftar" value={totalPemasok} icon={<Users className="size-4" />} accent="sky" hint="Operator armada, bengkel, produsen" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden p-0 sm:p-0 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-3 sm:px-6">
            <div>
              <p className="eyebrow">Rencana terbaru</p>
              <h2 className="mt-1 text-lg font-semibold">{rencana ? rencana.namaDesa : "Belum ada rencana desa"}</h2>
              {hasil && (
                <p className="text-sm text-ink-500">
                  {hasil.ringkasan.jumlah_paket} paket baterai · panel {num(hasil.ringkasan.kapasitas_panel_terpasang_kwp)} kWp · inverter {hasil.ringkasan.inverter_kw} kW
                </p>
              )}
            </div>
            {rencana && (
              <div className="flex items-center gap-2">
                {rencana.ilustrasi && <IlustrasiTag />}
                <ButtonLink href={`/perencana/${rencana.id}`} variant="secondary" size="sm">
                  Lihat <ArrowRight className="size-3.5" />
                </ButtonLink>
              </div>
            )}
          </div>
          {hasil ? (
            <div className="px-3 pb-3">
              <EnergyFlow
                suryaKwh={hasil.ringkasan.kapasitas_panel_terpasang_kwp * hasil.parameter.psh_jam * hasil.parameter.pr}
                suryaKeDesaKwh={hasil.ringkasan.kebutuhan_harian_kwh - hasil.ringkasan.kebutuhan_malam_kwh * hasil.parameter.efisiensi}
                suryaKeBateraiKwh={hasil.ringkasan.kebutuhan_malam_kwh}
                bebanKwh={hasil.ringkasan.kebutuhan_harian_kwh}
                bateraiKwh={hasil.ringkasan.kebutuhan_malam_kwh * hasil.parameter.efisiensi}
                gensetKwh={0}
                socPersen={100}
                rumah={(rencana!.masukan as { jumlah_rumah?: number }).jumlah_rumah}
                caption="Hari cerah, rata-rata harian (ilustrasi)"
              />
            </div>
          ) : (
            <div className="p-5 pt-0">
              <EmptyState title="Buat rencana desa pertama" description="Rancangan baterai, panel, dan perbandingan biaya terhadap diesel akan tampil di sini." action={<ButtonLink href="/perencana">Mulai perencanaan</ButtonLink>} />
            </div>
          )}
        </Card>

        <Suspense fallback={<Card className="animate-pulse-soft min-h-64" />}>
          <ResilienceGlance hasil={hasil} />
        </Suspense>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat
          label="Diesel dihemat"
          value={hasil ? num(hasil.lingkungan.diesel_hemat_liter, 0) : "—"}
          unit={hasil ? `L / ${hasil.lingkungan.periode_hari} hari` : undefined}
          icon={<Fuel className="size-4" />}
          accent="flame"
          hint="Dari rencana desa terbaru"
        />
        <Stat
          label="CO₂ dihindari"
          value={hasil ? num(hasil.lingkungan.co2_dihindari_kg, 0) : "—"}
          unit={hasil ? `kg / ${hasil.lingkungan.periode_hari} hari` : undefined}
          icon={<Leaf className="size-4" />}
          accent="leaf"
          hint={hasil ? `≈ ${num((hasil.lingkungan.co2_dihindari_kg * 365) / hasil.lingkungan.periode_hari / 1000, 1)} ton per tahun` : "Belum ada rencana"}
        />
        <Stat label="Grade A–B (siap pakai)" value={counts.A + counts.B} unit="baterai" icon={<Zap className="size-4" />} accent="sky" hint="Dipakai ulang langsung atau tingkat modul" />
        <Stat label="Arah daur ulang" value={counts.D} unit="baterai" icon={<Factory className="size-4" />} accent="ink" hint="Grade D atau di bawah ambang" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <GradeDistribution counts={counts} />

        <Card>
          <SectionTitle title="Kesehatan baterai" hint="SoH baterai dinilai, tertinggi dahulu" action={<Link href="/baterai" className="text-sm font-semibold text-sun-700 hover:underline">Semua</Link>} />
          {sehat.length ? (
            <div className="space-y-3">
              {sehat.map((b) => (
                <Link key={b.id} href={`/baterai/${b.id}`} className="block rounded-xl transition hover:bg-ink-50">
                  <BarRow
                    label={
                      <span className="flex items-center gap-2">
                        <GradeBadge grade={b.gradeTerakhir} size="sm" />
                        <span className="num text-xs">{b.kode}</span>
                      </span>
                    }
                    value={b.sohTerakhir}
                    max={100}
                    display={`${num(b.sohTerakhir)}%`}
                    color={gradeTone[(b.gradeTerakhir ?? "D") as Grade].bg}
                  />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="Belum ada penilaian" className="py-8" />
          )}
        </Card>

        <Card>
          <SectionTitle title="Jadwal penggantian" hint="Perkiraan tengah dari sisa umur" action={<Link href="/siklus-hidup" className="text-sm font-semibold text-sun-700 hover:underline">Siklus hidup</Link>} />
          {jadwalUrut.length ? (
            <ul className="divide-y divide-ink-100">
              {jadwalUrut.map((j) => (
                <li key={j.baterai.id} className="flex items-center gap-3 py-2.5">
                  <span className="grid size-9 place-items-center rounded-xl bg-ink-100 text-ink-600">
                    <CalendarClock className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <Link href={`/baterai/${j.baterai.id}`} className="num block truncate text-sm font-semibold hover:underline">
                      {j.baterai.kode}
                    </Link>
                    <span className="block truncate text-xs text-ink-500">
                      {j.baterai.merek} {j.baterai.model}
                    </span>
                  </span>
                  <span className="text-right text-sm font-medium">{tanggal(j.tanggalGanti)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Belum ada jadwal" className="py-8" />
          )}
        </Card>
      </div>

      {menunggu.length > 0 && (
        <Card className="mt-4">
          <SectionTitle title="Menunggu penilaian" hint="Baterai baru dari pemasok" action={<Link href="/baterai?status=BELUM_DINILAI" className="text-sm font-semibold text-sun-700 hover:underline">Semua</Link>} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {menunggu.map((b) => (
              <div key={b.id} className="flex flex-col rounded-2xl bg-ink-50 p-4 ring-1 ring-ink-100">
                <div className="flex items-center justify-between">
                  <span className="num text-sm font-semibold">{b.kode}</span>
                  <Badge tone="neutral">{b.jenisKimia}</Badge>
                </div>
                <p className="mt-1 text-sm text-ink-700">
                  {b.merek} {b.model} · {num(b.kapasitasAwalKwh)} kWh
                </p>
                <p className="truncate text-xs text-ink-500">{b.pemasok.namaPerusahaan}</p>
                <ButtonLink href={`/penilaian/baru?baterai=${b.id}`} size="sm" variant="dark" className="mt-3 self-start">
                  Nilai sekarang
                </ButtonLink>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Disclaimer className="mt-6" />
    </>
  );
}

/** K-13: "ketahanan sekilas" — berapa lama desa bertahan bila hujan beberapa hari mulai sekarang. */
async function ResilienceGlance({ hasil }: { hasil: HasilRencana | undefined }) {
  if (!hasil) {
    return (
      <Card tone="ink" className="flex flex-col">
        <p className="eyebrow !text-ink-400">Ketahanan sekilas</p>
        <p className="mt-3 text-ink-300">Buat rencana desa untuk melihat berapa lama desa bertahan saat cuaca buruk.</p>
      </Card>
    );
  }
  const res = await callEngine<HasilKetahanan>("resilience", {
    beban_harian_kwh: hasil.ringkasan.kebutuhan_harian_kwh,
    jumlah_paket: hasil.ringkasan.jumlah_paket,
    kapasitas_kwh: hasil.parameter.kapasitas_paket_kwh,
    soh: hasil.parameter.soh_paket,
    kapasitas_panel_kwp: hasil.ringkasan.kapasitas_panel_terpasang_kwp,
    psh_jam: hasil.parameter.psh_jam,
    pr: hasil.parameter.pr,
    efisiensi: hasil.parameter.efisiensi,
    dod: hasil.parameter.dod,
    skenario: "hujan_beberapa_hari",
  });
  if (!res.ok) {
    return (
      <Card tone="ink">
        <p className="eyebrow !text-ink-400">Ketahanan sekilas</p>
        <p className="mt-3 text-sm text-ink-300">{res.error}</p>
      </Card>
    );
  }
  const s = res.data.skenario.find((x) => x.kunci === "hujan_beberapa_hari")!;
  const max = Math.max(s.lama_per_tingkat_hari.kritis_saja ?? 0, s.lama_bertahan_pelepasan_hari ?? 0, 4);
  return (
    <Card tone="ink" className="flex flex-col">
      <div className="flex items-start justify-between">
        <p className="eyebrow !text-ink-400">Bila hujan mulai sekarang</p>
        <Link href="/ketahanan" className="text-xs font-semibold text-sun-400 hover:underline">
          Simulasi →
        </Link>
      </div>
      <p className="mt-4 flex items-baseline gap-2">
        <span className="num text-6xl leading-none font-medium text-white">{num(s.lama_bertahan_pelepasan_hari, 1)}</span>
        <span className="text-lg text-ink-300">hari</span>
      </p>
      <p className="mt-2 text-sm text-ink-300">dengan pelepasan beban bertingkat, tanpa produksi panel.</p>
      <div className="mt-6 space-y-3 [&_span]:!text-ink-200">
        {[
          { l: "Apa adanya", v: s.lama_bertahan_hari },
          { l: "Pelepasan bertingkat", v: s.lama_bertahan_pelepasan_hari },
          { l: "Hanya beban kritis", v: s.lama_per_tingkat_hari.kritis_saja },
        ].map((r) => (
          <div key={r.l} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm">
            <span>{r.l}</span>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-leaf-400" style={{ width: `${Math.min(100, ((r.v ?? max) / max) * 100)}%` }} />
            </div>
            <span className="num text-right whitespace-nowrap">{days(r.v)}</span>
          </div>
        ))}
      </div>
      <p className="mt-auto flex items-center gap-1.5 pt-6 text-xs text-ink-400">
        <Clock3 className="size-3.5" /> Genset cadangan ±{num(s.jam_genset_pelepasan, 0)} jam untuk {res.data.periode_hari} hari
      </p>
    </Card>
  );
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
        title={`${greeting()}, ${user.nama.split(" ")[0]}`}
        description="Daftarkan baterai pensiun Anda dan pantau status penilaiannya oleh pengelola desa."
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
            <EmptyState title="Belum ada baterai" description="Tambahkan baterai pensiun pertama Anda untuk dinilai." action={<ButtonLink href="/baterai/baru">Tambah baterai</ButtonLink>} />
          )}
        </Card>
        <GradeDistribution counts={counts} />
      </div>
    </>
  );
}
