import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Battery,
  BatteryCharging as BatteryPlus,
  ClipboardCheck,
  Clock3,
  Factory,
  SunMedium,
} from "lucide-react";
import { Donut } from "@/components/charts";
import { EnergyFlow } from "@/components/energy-flow";
import { Badge, ButtonLink, Card, EmptyState, GradeBadge, PageHeader, SectionTitle, Stat, gradeTone } from "@/components/ui";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { gradeCounts } from "@/lib/data";
import { num } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { Grade, HasilRencana } from "@/lib/types";

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
  const rencana = await prisma.rencanaDesa.findFirst({ orderBy: { createdAt: "desc" } });
  const hasil = rencana?.hasil as HasilRencana | undefined;
  const masukan = rencana?.masukan as { jumlah_rumah?: number } | undefined;
  const homesServed = masukan?.jumlah_rumah ?? 48;
  const energyUsedToday = hasil?.ringkasan.kebutuhan_harian_kwh ?? 126;
  const averagePerHome = energyUsedToday / Math.max(homesServed, 1);

  return (
    <>
      <PageHeader
        eyebrow={new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date())}
        title={`${greeting()}, ${user.nama.split(" ")[0] === "Admin" ? "Admin" : user.nama.split(" ")[0]}`}
        description="Pantau penggunaan energi desa dalam satu tampilan."
        actions={
          <>
            <ButtonLink href="/baterai" variant="secondary">
              <Battery className="size-4" /> Kondisi baterai
            </ButtonLink>
            <ButtonLink href="/perencana">
              <SunMedium className="size-4" /> Rencana desa
            </ButtonLink>
          </>
        }
      />

      <Card className="overflow-hidden p-0 sm:p-0">
        <div>
          <div className="p-5 sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Kondisi energi desa</p>
                <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">Energi bersih yang mengalir ke rumah-rumah warga.</h2>
              </div>
            </div>
            <div className="mt-6">
              <EnergyFlow
                suryaKwh={hasil?.ringkasan.kapasitas_panel_terpasang_kwp ?? 1.5}
                suryaKeDesaKwh={hasil?.ringkasan.kebutuhan_harian_kwh ?? energyUsedToday}
                suryaKeBateraiKwh={hasil?.ringkasan.kebutuhan_malam_kwh ?? 20}
                bebanKwh={energyUsedToday}
                bateraiKwh={hasil?.ringkasan.kebutuhan_malam_kwh ?? 20}
                gensetKwh={0}
                socPersen={hasil ? 100 : 78}
                rumah={homesServed}
                satuan="kWh"
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-3">
          <EnergySummaryCard
            title="Jika listrik padam sekarang"
            value="3 hari+"
            description="Desa tetap menyala dengan baterai dan pengaturan beban."
            tone="light"
          >
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <EnergyProgress label="Pemakaian normal" value="2 hari 20 jam" progress={78} />
              <EnergyProgress label="Pengaturan beban" value="3 hari" progress={92} />
              <EnergyProgress label="Beban kritis saja" value="3 hari+" progress={100} />
            </div>
          </EnergySummaryCard>
        </div>

        <EnergySummaryCard
          title="Energi hari ini"
          value={`${num(energyUsedToday, 0)} kWh`}
          description="Energi bersih yang digunakan rumah-rumah desa."
          tone="medium"
        >
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-ink-700">Dari surya</p>
              <p className="num mt-1 text-xl font-semibold">{num(hasil?.ringkasan.kapasitas_panel_terpasang_kwp ?? 1.5, 1)} kWh</p>
              <p className="mt-1 text-xs text-ink-700">pembangkit hari ini</p>
            </div>
            <div>
              <p className="text-xs text-ink-700">Baterai</p>
              <p className="num mt-1 text-xl font-semibold">{hasil ? "100" : "78"}%</p>
              <p className="mt-1 text-xs text-ink-700">energi tersimpan</p>
            </div>
            <div>
              <p className="text-xs text-ink-700">Rata-rata rumah</p>
              <p className="num mt-1 text-xl font-semibold">{num(averagePerHome, 1)} kWh</p>
              <p className="mt-1 text-xs text-ink-700">per hari</p>
            </div>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/70">
            <div className="h-full w-[64%] rounded-full bg-ink-900" />
          </div>
          <p className="mt-2 text-xs text-ink-700">Surya 24% · Baterai 64% · Cadangan 12%</p>
        </EnergySummaryCard>

        <EnergySummaryCard
          title="Aktivitas energi"
          value="Hari yang terkoordinasi"
          description="Ringkasan aktivitas penting dari sistem energi desa."
          tone="soft"
        >
          <ul className="mt-4 divide-y divide-ink-900/10">
            <EnergyActivity label="Baterai menyuplai rumah" value={`${num(energyUsedToday, 0)} kWh`} />
            <EnergyActivity label="Energi disimpan untuk malam" value="20 kWh" />
            <EnergyActivity label="Cadangan genset" value="Siap" />
          </ul>
        </EnergySummaryCard>

        <EnergySummaryCard
          title="Dampak energi"
          value={hasil ? `${num(hasil.lingkungan.diesel_hemat_liter, 0)} L` : "12 L"}
          description="Perkiraan diesel yang dihemat dari rencana energi desa."
          tone="light"
        >
          <div className="mt-5 space-y-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs text-ink-700">Diesel dihemat</p>
                <p className="num mt-1 text-xl font-semibold text-ink-950">
                  {hasil ? `${num(hasil.lingkungan.diesel_hemat_liter, 0)} liter` : "12 liter"}
                </p>
              </div>
              <p className="text-right text-xs text-ink-700">{hasil ? `selama ${hasil.lingkungan.periode_hari} hari` : "per periode rencana"}</p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/70">
              <div className="h-full w-[72%] rounded-full bg-leaf-500" />
            </div>
            <div>
              <p className="text-xs text-ink-700">CO₂ yang dihindari</p>
              <p className="num mt-1 text-xl font-semibold text-ink-950">
                {hasil ? `${num(hasil.lingkungan.co2_dihindari_kg, 0)} kg` : "32 kg"}
              </p>
            </div>
          </div>
        </EnergySummaryCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <CostComparisonCard hasil={hasil} />
        <EnergyDayCard hasil={hasil} energyUsedToday={energyUsedToday} />
      </div>
    </>
  );
}

function CostComparisonCard({ hasil }: { hasil: HasilRencana | undefined }) {
  const biaya = hasil?.biaya ?? {
    sistem_per_rumah: { rendah: 425000, tinggi: 680000 },
    diesel_per_rumah: { rendah: 760000, tinggi: 980000 },
    periode_hari: 30,
  };
  const isDemo = !hasil;
  return (
    <Card className="bg-sun-100 shadow-none ring-1 ring-sun-300/70">
      <p className="eyebrow !text-ink-700">Perbandingan biaya rencana</p>
      <p className="mt-3 text-2xl font-semibold text-ink-950">Biaya energi per rumah</p>
      <p className="mt-2 text-sm text-ink-700">Periode rencana: {biaya.periode_hari} hari</p>
      <div className="mt-7 grid grid-cols-2 gap-5">
        <CostMetric label="Sistem baterai + surya" value={biaya.sistem_per_rumah} />
        <CostMetric label="Setara diesel" value={biaya.diesel_per_rumah} accent />
      </div>
      <p className="mt-6 text-sm text-ink-700">
        {isDemo ? "Asumsi demo untuk tampilan awal; akan diganti hasil rencana desa." : "Nilai mengikuti rentang biaya rendah–tinggi dari konfigurasi SOLUNA."}
      </p>
    </Card>
  );
}

function CostMetric({ label, value, accent = false }: { label: string; value: { rendah: number; tinggi: number }; accent?: boolean }) {
  return (
    <div>
      <p className="text-xs leading-relaxed text-ink-700">{label}</p>
      <p className={`num mt-2 text-xl font-semibold ${accent ? "text-sun-700" : "text-ink-950"}`}>
        {formatRupiahCompact(value.rendah)}–{formatRupiahCompact(value.tinggi)}
      </p>
      <p className="mt-1 text-xs text-ink-700">per rumah / periode</p>
    </div>
  );
}

function EnergyDayCard({ hasil, energyUsedToday }: { hasil: HasilRencana | undefined; energyUsedToday: number }) {
  const kebutuhanMalam = hasil?.ringkasan.kebutuhan_malam_kwh ?? energyUsedToday * 0.4;
  const kebutuhanSiang = Math.max(0, energyUsedToday - kebutuhanMalam);
  return (
    <Card className="bg-[#fff3df] shadow-none ring-1 ring-sun-300/70">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow !text-ink-700">Proyeksi kebutuhan energi</p>
          <h3 className="mt-2 text-xl font-semibold text-ink-950">Kebutuhan siang dan malam</h3>
        </div>
        <span className="flex items-center gap-1.5 text-sm text-ink-700">
          <span className="size-2.5 rounded-full bg-sun-600" /> Beban desa
        </span>
      </div>
      <div className="mt-5">
        <svg viewBox="0 0 560 180" className="h-auto w-full" role="img" aria-label="Grafik energi surya sepanjang 24 jam">
          <defs>
            <linearGradient id="solar-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#fa9104" stopOpacity="0.32" />
              <stop offset="1" stopColor="#fa9104" stopOpacity="0.03" />
            </linearGradient>
          </defs>
          {[35, 75, 115].map((y) => <line key={y} x1="8" x2="552" y1={y} y2={y} stroke="#c9c6be" strokeDasharray="3 6" />)}
          <path d="M8 140 C90 140 130 140 175 122 C220 104 245 45 290 40 C335 35 370 91 410 123 C450 145 500 140 552 140 L552 150 L8 150 Z" fill="url(#solar-area)" />
          <path d="M8 140 C90 140 130 140 175 122 C220 104 245 45 290 40 C335 35 370 91 410 123 C450 145 500 140 552 140" fill="none" stroke="#d97700" strokeWidth="4" />
          <line x1="307" x2="307" y1="24" y2="150" stroke="#d97700" strokeDasharray="5 6" opacity="0.65" />
          <circle cx="307" cy="42" r="7" fill="#d97700" stroke="#fff3df" strokeWidth="4" />
          {[
            ["00:00", 8],
            ["06:00", 144],
            ["12:00", 280],
            ["18:00", 416],
            ["24:00", 552],
          ].map(([label, x]) => <text key={label} x={x} y="172" textAnchor={x === 8 ? "start" : x === 552 ? "end" : "middle"} fill="#5b5850" fontSize="12">{label}</text>)}
        </svg>
      </div>
      <p className="mt-2 text-sm text-ink-700">Distribusi kebutuhan energi dari rencana desa, bukan pembacaan meter per jam.</p>
      <div className="mt-5 border-t border-ink-900/10 pt-4">
        <p className="eyebrow !text-ink-700">Rencana energi desa</p>
        <p className="mt-2 text-lg font-semibold text-ink-950">{num(energyUsedToday, 0)} kWh kebutuhan harian</p>
        <p className="mt-1 text-sm text-ink-700">{num(kebutuhanSiang, 0)} kWh siang · {num(kebutuhanMalam, 0)} kWh malam disiapkan dari baterai.</p>
      </div>
    </Card>
  );
}

function formatRupiahCompact(value: number) {
  if (value >= 1_000_000) return `Rp${num(value / 1_000_000, 1)} jt`;
  if (value >= 1_000) return `Rp${num(value / 1_000, 1)} rb`;
  return `Rp${num(value, 0)}`;
}

function EnergySummaryCard({
  title,
  value,
  description,
  tone,
  children,
}: {
  title: string;
  value: string;
  description: string;
  tone: "light" | "medium" | "soft";
  children: ReactNode;
}) {
  const tones = {
    light: "bg-sun-100",
    medium: "bg-sun-200",
    soft: "bg-[#fff3df]",
  };
  return (
    <Card className={`${tones[tone]} border-0 shadow-none ring-1 ring-sun-300/70`}>
      <p className="eyebrow !text-ink-700">{title}</p>
      <p className="num mt-3 text-4xl font-medium tracking-tight text-ink-950">{value}</p>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-700">{description}</p>
      {children}
    </Card>
  );
}

function EnergyProgress({ label, value, progress }: { label: string; value: string; progress: number }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <div>
        <p className="text-xs text-ink-700">{label}</p>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/70">
          <div className="h-full rounded-full bg-leaf-500" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <span className="num text-xs font-semibold text-ink-800">{value}</span>
    </div>
  );
}

function EnergyActivity({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sun-500 text-xs text-ink-950">
        <SunMedium className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1 text-sm text-ink-800">{label}</span>
      <span className="num text-sm font-semibold text-ink-950">{value}</span>
    </li>
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
