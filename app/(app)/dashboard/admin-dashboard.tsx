import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  BatteryCharging,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  CloudRain,
  PlugZap,
  Recycle,
  SunMedium,
  XCircle,
} from "lucide-react";
import { Badge, ButtonLink, Card, EmptyState, GradeBadge, IlustrasiTag, Notice, PageHeader, Progress, SectionTitle, Stat } from "@/components/ui";
import { analisisSiklus, bateraiDinilaiUntukSiklus, kompatTerakhir } from "@/lib/analisis";
import { getActiveConfig } from "@/lib/config";
import { gradeCounts } from "@/lib/data";
import { engineHealth } from "@/lib/engine";
import { cn, days, num, rupiahShort, tanggal } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { HasilKetahanan, HasilKompatibilitas, HasilRencana, Rentang } from "@/lib/types";
import { GradeDistribution } from "./grade-distribution";

/* Dashboard Pengelola Sistem Desa.
   Semua angka berasal dari basis data atau hasil mesin hitung yang tersimpan; tidak ada angka contoh.
   Setiap blok energi diberi label sumbernya: input pengguna, hasil perhitungan, atau simulasi.
   SOLUNA belum menerima data pengukuran aktual (telemetri), jadi tidak ada angka "aktual". */

export async function AdminDashboard() {
  const [mesinAktif, belumDinilai, counts, dinilai, kompat, rencana, { versi }] = await Promise.all([
    engineHealth(),
    prisma.baterai.findMany({
      where: { status: "BELUM_DINILAI" },
      orderBy: { createdAt: "asc" },
      select: { id: true, kode: true, merek: true, model: true, createdAt: true, pemasok: { select: { namaPerusahaan: true } } },
    }),
    gradeCounts(),
    bateraiDinilaiUntukSiklus(),
    kompatTerakhir(),
    prisma.rencanaDesa.findFirst({ orderBy: { createdAt: "desc" } }),
    getActiveConfig(),
  ]);
  const [siklus, simulasi, aktivitas] = await Promise.all([
    dinilai.length ? analisisSiklus(dinilai) : null,
    rencana
      ? prisma.simulasiKetahanan.findFirst({ where: { rencanaId: rencana.id }, orderBy: { createdAt: "desc" } })
      : prisma.simulasiKetahanan.findFirst({ orderBy: { createdAt: "desc" } }),
    aktivitasTerbaru(),
  ]);

  const siklusOk = siklus?.ok ? siklus.data : null;
  const daurUlang = siklusOk ? siklusOk.ringkasan.daur_ulang : counts.D;
  const layak = counts.A + counts.B + counts.C;

  // Tindak lanjut, dikelompokkan menurut jenis pekerjaan (bukan diberi skor prioritas).
  const perluTindakan: TindakLanjut[] = [
    ...belumDinilai.map((b) => ({
      id: `n-${b.id}`,
      kode: b.kode,
      grade: null,
      jenis: "Belum dinilai",
      tone: "neutral" as const,
      alasan: `${b.merek} ${b.model} dari ${b.pemasok.namaPerusahaan}, masuk ${tanggal(b.createdAt)}.`,
      aksi: { label: "Nilai", href: `/penilaian/baru?baterai=${b.id}` },
    })),
    ...(siklusOk?.baterai ?? [])
      .filter((r) => r.status === "daur_ulang" || r.status === "perhatian")
      .map((r) => ({
        id: `s-${r.id}`,
        kode: r.kode,
        grade: dinilai.find((b) => b.id === r.id)?.gradeTerakhir ?? null,
        jenis: r.status === "daur_ulang" ? "Daur ulang" : "Perlu perhatian",
        tone: r.status === "daur_ulang" ? ("flame" as const) : ("amber" as const),
        alasan: r.peringatan[0] ?? "Mendekati waktu penggantian.",
        aksi: { label: "Lihat", href: `/siklus-hidup?tab=riwayat&baterai=${r.id}` },
      })),
    ...dinilai
      .filter((b) => kompat.get(b.id)?.status === "tidak_layak")
      .map((b) => ({
        id: `k-${b.id}`,
        kode: b.kode,
        grade: b.gradeTerakhir,
        jenis: "Tidak kompatibel",
        tone: "flame" as const,
        alasan: "Pemeriksaan kompatibilitas terakhir berstatus Tidak Layak.",
        aksi: { label: "Periksa", href: `/kompatibilitas?baterai=${b.id}` },
      })),
    ...dinilai
      .filter((b) => b.gradeTerakhir !== "D" && !kompat.has(b.id) && siklusOk?.baterai.find((r) => r.id === b.id)?.status !== "daur_ulang")
      .map((b) => ({
        id: `c-${b.id}`,
        kode: b.kode,
        grade: b.gradeTerakhir,
        jenis: "Belum dicek kompatibilitas",
        tone: "sky" as const,
        alasan: `${b.merek} ${b.model}: pemeriksaan wajib sebelum dipasang.`,
        aksi: { label: "Cek", href: `/kompatibilitas?baterai=${b.id}` },
      })),
  ];

  return (
    <>
      <PageHeader
        eyebrow={new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date())}
        title="Dashboard Pengelola Sistem Desa"
        description="Pantau kondisi baterai dan kelola kebutuhan energi desa."
        actions={
          <>
            <ButtonLink href="/pencocokan" variant="secondary">
              <BatteryCharging className="size-4" /> Pencocokan baterai
            </ButtonLink>
            <ButtonLink href="/perencana">
              <SunMedium className="size-4" /> Rencana baru
            </ButtonLink>
          </>
        }
      />

      {!mesinAktif && (
        <Notice tone="danger" title="Mesin hitung tidak aktif" className="mb-4">
          Penilaian baterai, perencanaan, simulasi ketahanan, pemeriksaan kompatibilitas, dan analisis siklus hidup tidak dapat dijalankan
          sampai layanan hitung menyala kembali. Data dan hasil yang sudah tersimpan tetap dapat dilihat.
        </Notice>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat
          label="Menunggu penilaian"
          value={belumDinilai.length}
          unit="baterai"
          icon={<Clock3 className="size-4" />}
          accent="sun"
          hint="Baterai dari pemasok yang belum dinilai"
          href="/penilaian"
        />
        <Stat
          label="Layak dipakai ulang"
          value={layak}
          unit="baterai"
          icon={<CheckCircle2 className="size-4" />}
          accent="leaf"
          hint="Grade A–C dari penilaian terakhir"
          href="/pencocokan"
        />
        <Stat
          label="Diarahkan ke daur ulang"
          value={daurUlang}
          unit="baterai"
          icon={<Recycle className="size-4" />}
          accent="flame"
          hint={siklusOk ? `Grade D atau SoH < ${siklusOk.ambang.penggantian_soh}%` : "Grade D"}
          href="/siklus-hidup"
        />
        <Stat
          label="Peringatan kesehatan"
          value={siklusOk ? siklusOk.ringkasan.perhatian : "—"}
          unit={siklusOk ? "baterai" : undefined}
          icon={<AlertTriangle className="size-4" />}
          accent="sky"
          hint={siklusOk ? "Mendekati ambang penggantian" : dinilai.length ? "Butuh mesin hitung aktif" : "Belum ada baterai dinilai"}
          href="/siklus-hidup"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {rencana ? (
            <RingkasanEnergi
              id={rencana.id}
              judul={`${rencana.namaDesa} — ${rencana.nama}`}
              waktu={rencana.createdAt}
              versi={rencana.versiKonfigurasi}
              versiAktif={versi}
              ilustrasi={rencana.ilustrasi}
              hasil={rencana.hasil as unknown as HasilRencana}
              jumlahRumah={(rencana.masukan as { jumlah_rumah?: number }).jumlah_rumah}
            />
          ) : (
            <Card className="h-full">
              <SectionTitle title="Ringkasan energi desa" />
              <EmptyState
                icon={<SunMedium className="size-5" />}
                title="Belum ada rencana energi desa"
                description="Buat rencana dari jumlah rumah, pola pemakaian, dan lokasi. Ringkasan kebutuhan energi, panel, baterai, dan biaya akan tampil di sini."
                action={<ButtonLink href="/perencana">Buat rencana desa</ButtonLink>}
                className="py-10"
              />
            </Card>
          )}
        </div>
        <Ketahanan simulasi={simulasi} rencanaId={rencana?.id} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <SectionTitle
            title="Baterai yang perlu ditindaklanjuti"
            hint={perluTindakan.length ? `${perluTindakan.length} tindakan` : undefined}
            action={
              <Link href="/baterai" className="text-sm font-semibold text-sun-700 hover:underline">
                Semua baterai
              </Link>
            }
          />
          {siklus && !siklus.ok && (
            <Notice tone="warning" className="mb-3">
              Peringatan siklus hidup tidak dapat dimuat: {siklus.error}
            </Notice>
          )}
          {perluTindakan.length ? (
            <ul className="-mx-2 divide-y divide-ink-100">
              {perluTindakan.slice(0, 8).map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-2 py-3">
                  <GradeBadge grade={t.grade} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="num text-sm font-semibold">{t.kode}</span>
                      <Badge tone={t.tone}>{t.jenis}</Badge>
                    </p>
                    <p className="mt-0.5 text-sm text-ink-600">{t.alasan}</p>
                  </div>
                  <Link
                    href={t.aksi.href}
                    className="inline-flex shrink-0 items-center gap-0.5 rounded-full px-3 py-1.5 text-sm font-semibold text-ink-800 ring-1 ring-ink-200 transition-colors hover:bg-ink-100"
                  >
                    {t.aksi.label}
                    <ChevronRight className="size-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl bg-leaf-50 p-4 text-sm text-leaf-700 ring-1 ring-leaf-100">
              Tidak ada baterai yang perlu ditindaklanjuti saat ini.
            </p>
          )}
          {perluTindakan.length > 8 && <p className="mt-3 text-xs text-ink-500">Menampilkan 8 dari {perluTindakan.length} tindakan.</p>}
        </Card>
        <GradeDistribution counts={counts} />
      </div>

      <Card className="mt-4">
        <SectionTitle
          title="Aktivitas terbaru"
          action={
            <Link href="/riwayat" className="text-sm font-semibold text-sun-700 hover:underline">
              Riwayat lengkap
            </Link>
          }
        />
        {aktivitas.length ? (
          <ul className="-mx-2 divide-y divide-ink-100">
            {aktivitas.map((a) => (
              <li key={a.id}>
                <Link href={a.href} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-ink-50">
                  <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", a.tone)}>
                    <a.icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink-900">{a.judul}</span>
                    <span className="block truncate text-xs text-ink-500">{a.detail}</span>
                  </span>
                  <span className="shrink-0 text-xs text-ink-500">{tanggal(a.waktu, true)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-500">Belum ada aktivitas yang tercatat.</p>
        )}
      </Card>
    </>
  );
}

type TindakLanjut = {
  id: string;
  kode: string;
  grade: string | null;
  jenis: string;
  tone: "neutral" | "flame" | "amber" | "sky";
  alasan: string;
  aksi: { label: string; href: string };
};

/* ---------- Ringkasan energi dari rencana terakhir ---------- */

function Sumber({ jenis }: { jenis: "input" | "hitung" | "simulasi" }) {
  const map = {
    input: { t: "Input", c: "bg-ink-100 text-ink-600" },
    hitung: { t: "Hasil hitung", c: "bg-sun-100 text-sun-800" },
    simulasi: { t: "Simulasi", c: "bg-sky-50 text-sky-600" },
  }[jenis];
  return <span className={cn("rounded-full px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase", map.c)}>{map.t}</span>;
}

function Baris({ label, sumber, nilai, detail }: { label: string; sumber: "input" | "hitung"; nilai: ReactNode; detail?: ReactNode }) {
  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-ink-600">{label}</p>
        <Sumber jenis={sumber} />
      </div>
      <p className="num mt-1 text-xl font-semibold text-ink-950">{nilai}</p>
      {detail && <p className="mt-0.5 text-xs text-ink-500">{detail}</p>}
    </div>
  );
}

function rentang(r: Rentang) {
  return `${rupiahShort(r.rendah)}–${rupiahShort(r.tinggi)}`;
}

function RingkasanEnergi({
  id,
  judul,
  waktu,
  versi,
  versiAktif,
  ilustrasi,
  hasil,
  jumlahRumah,
}: {
  id: string;
  judul: string;
  waktu: Date;
  versi: number;
  versiAktif: number;
  ilustrasi: boolean;
  hasil: HasilRencana;
  jumlahRumah?: number;
}) {
  const r = hasil.ringkasan;
  const p = hasil.parameter;
  const b = hasil.biaya;
  const gagal = hasil.pemeriksaan.filter((x) => !x.lulus);
  return (
    <Card className="h-full">
      <SectionTitle
        title="Ringkasan energi desa"
        hint={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link href={`/perencana/${id}`} className="font-medium text-ink-700 hover:underline">
              {judul}
            </Link>
            {ilustrasi && <IlustrasiTag />}
            <span>
              · dihitung {tanggal(waktu)} · konfigurasi v{versi}
            </span>
          </span>
        }
        action={
          <Link href={`/perencana/${id}`} className="text-sm font-semibold whitespace-nowrap text-sun-700 hover:underline">
            Detail
          </Link>
        }
      />

      {versi !== versiAktif && (
        <Notice tone="info" className="mb-3">
          Rencana ini dihitung dengan konfigurasi v{versi}, sedangkan konfigurasi aktif v{versiAktif}. Hasil lama tidak diubah otomatis; buat
          ulang rencana bila ingin memakai parameter terbaru.
        </Notice>
      )}

      <div className="grid gap-x-8 divide-y divide-ink-100 sm:grid-cols-2 sm:divide-y-0">
        <div className="divide-y divide-ink-100">
          <Baris
            label="Kebutuhan energi harian"
            sumber="hitung"
            nilai={`${num(r.kebutuhan_harian_kwh)} kWh/hari`}
            detail={jumlahRumah ? `${num(jumlahRumah, 0)} rumah (input) × konsumsi per rumah` : undefined}
          />
          <Baris
            label="Kebutuhan malam dari baterai"
            sumber="hitung"
            nilai={`${num(r.kebutuhan_malam_kwh)} kWh/hari`}
            detail={`Sudah termasuk rugi konversi (efisiensi ${num(p.efisiensi * 100, 0)}%)`}
          />
          <Baris
            label="Panel surya"
            sumber="hitung"
            nilai={`${r.jumlah_panel} panel · ${num(r.kapasitas_panel_terpasang_kwp)} kWp`}
            detail={
              r.produksi_surya_harian_kwh !== undefined
                ? `Estimasi produksi ${num(r.produksi_surya_harian_kwh)} kWh/hari (PSH ${num(p.psh_jam)} jam × PR ${num(p.pr * 100, 0)}%)`
                : `PSH ${num(p.psh_jam)} jam × PR ${num(p.pr * 100, 0)}%`
            }
          />
        </div>
        <div className="divide-y divide-ink-100">
          <Baris
            label="Baterai"
            sumber="hitung"
            nilai={`${num(r.energi_tersedia_kwh)} kWh dapat dipakai`}
            detail={`${r.jumlah_paket} paket · kapasitas nominal ${num(r.kapasitas_baterai_total_kwh)} kWh × SoH ${num(p.soh_paket * 100, 0)}% × batas pengosongan ${num(p.dod * 100, 0)}%`}
          />
          <Baris label="Inverter" sumber="hitung" nilai={`${num(r.inverter_kw, 0)} kW`} detail={`Daya puncak ${num(r.daya_puncak_kw)} kW`} />
          <Baris
            label="Iuran perawatan per rumah"
            sumber="hitung"
            nilai={`${rentang(b.iuran_perawatan_per_rumah_bulan)}/bulan`}
            detail="Rentang biaya rendah–tinggi dari konfigurasi"
          />
        </div>
      </div>

      <div className="mt-2 grid gap-3 border-t border-ink-100 pt-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-canvas p-4 ring-1 ring-ink-200/60">
          <p className="text-xs text-ink-500">Biaya sistem per rumah · {b.periode_hari} hari</p>
          <p className="num mt-1 text-lg font-semibold text-ink-950">{rentang(b.sistem_per_rumah)}</p>
        </div>
        <div className="rounded-2xl bg-canvas p-4 ring-1 ring-ink-200/60">
          <p className="text-xs text-ink-500">Setara biaya diesel per rumah · {b.periode_hari} hari</p>
          <p className="num mt-1 text-lg font-semibold text-sun-700">{rentang(b.diesel_per_rumah)}</p>
        </div>
      </div>

      <ul className="mt-4 space-y-1.5 text-sm">
        {hasil.pemeriksaan.map((x) => (
          <li key={x.nama} className="flex items-start gap-2">
            {x.lulus ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-leaf-600" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-flame-600" />}
            <span className={cn(x.lulus ? "text-ink-600" : "font-medium text-flame-600")}>{x.keterangan}</span>
          </li>
        ))}
      </ul>
      {gagal.length > 0 && <p className="mt-2 text-xs text-flame-600">Ada kebutuhan yang belum terpenuhi. Sesuaikan rencana sebelum dipasang.</p>}
      <p className="mt-4 text-xs text-ink-500">Angka di atas adalah hasil perencanaan, bukan pembacaan meter. SOLUNA belum menerima data pengukuran langsung.</p>
    </Card>
  );
}

/* ---------- Ketahanan dari simulasi tersimpan ---------- */

function Ketahanan({ simulasi, rencanaId }: { simulasi: { hasil: unknown; createdAt: Date; nama: string } | null; rencanaId?: string }) {
  const href = rencanaId ? `/ketahanan?rencana=${rencanaId}` : "/ketahanan";
  if (!simulasi) {
    return (
      <Card className="h-full">
        <SectionTitle title="Ketahanan energi" />
        <EmptyState
          icon={<CloudRain className="size-5" />}
          title="Belum ada simulasi"
          description={rencanaId ? "Uji berapa lama rencana terakhir bertahan saat mendung atau hujan beberapa hari." : "Buat rencana desa, lalu jalankan simulasi ketahanan."}
          action={<ButtonLink href={href}>Jalankan simulasi</ButtonLink>}
          className="py-10"
        />
      </Card>
    );
  }
  const h = simulasi.hasil as HasilKetahanan;
  const periode = h.periode_hari;
  return (
    <Card className="h-full">
      <SectionTitle
        title="Ketahanan energi"
        hint={
          <span className="flex flex-wrap items-center gap-2">
            <Sumber jenis="simulasi" /> {tanggal(simulasi.createdAt)}
          </span>
        }
        action={
          <Link href={href} className="text-sm font-semibold whitespace-nowrap text-sun-700 hover:underline">
            Buka
          </Link>
        }
      />
      <p className="text-sm text-ink-600">
        Baterai penuh di awal, {h.prioritas_label.toLowerCase()} (batas pengosongan {num(h.dod_efektif * 100, 0)}%), energi tersedia{" "}
        <span className="num font-medium text-ink-900">{num(h.energi_tersedia_kwh)} kWh</span>. Target {periode} hari.
      </p>
      <ul className="mt-4 space-y-4">
        {h.skenario.map((s) => {
          const lama = s.lama_bertahan_pelepasan_hari;
          return (
            <li key={s.kunci}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-ink-800">{s.label}</span>
                <span className="num text-sm font-semibold text-ink-950">{days(lama)}</span>
              </div>
              <Progress value={lama === null ? periode : Math.min(lama, periode)} max={periode} color={s.cukup_pelepasan ? "bg-leaf-500" : "bg-sun-500"} className="mt-1.5" />
              <p className="mt-1 text-xs text-ink-500">
                Tanpa pelepasan beban {days(s.lama_bertahan_hari)} ·{" "}
                {s.cukup_pelepasan ? "genset tidak diperlukan" : `genset sekitar ${num(s.jam_genset_pelepasan, 1)} jam`}
              </p>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs text-ink-500">
        Lama bertahan memakai pelepasan beban bertingkat: Kenyamanan dilepas lebih dulu, lalu Penting. Ini simulasi, bukan kondisi perangkat nyata.
      </p>
    </Card>
  );
}

/* ---------- Aktivitas yang benar-benar tercatat ---------- */

async function aktivitasTerbaru() {
  const take = 6;
  const [baterai, penilaian, rencana, simulasi, kompat] = await Promise.all([
    prisma.baterai.findMany({ orderBy: { createdAt: "desc" }, take, select: { id: true, kode: true, merek: true, model: true, createdAt: true, pemasok: { select: { namaPerusahaan: true } } } }),
    prisma.penilaian.findMany({ orderBy: { createdAt: "desc" }, take, select: { id: true, grade: true, soh: true, createdAt: true, baterai: { select: { kode: true } } } }),
    prisma.rencanaDesa.findMany({ orderBy: { createdAt: "desc" }, take, select: { id: true, nama: true, namaDesa: true, createdAt: true } }),
    prisma.simulasiKetahanan.findMany({ orderBy: { createdAt: "desc" }, take, select: { id: true, nama: true, rencanaId: true, createdAt: true } }),
    prisma.cekKompatibilitas.findMany({ orderBy: { createdAt: "desc" }, take, select: { id: true, hasil: true, createdAt: true, baterai: { select: { kode: true } } } }),
  ]);
  const items = [
    ...baterai.map((b) => ({ id: `b-${b.id}`, waktu: b.createdAt, judul: `Baterai baru masuk: ${b.kode}`, detail: `${b.merek} ${b.model} · ${b.pemasok.namaPerusahaan}`, href: `/baterai/${b.id}`, icon: BatteryCharging, tone: "bg-ink-100 text-ink-700" })),
    ...penilaian.map((p) => ({ id: `p-${p.id}`, waktu: p.createdAt, judul: `Penilaian selesai: ${p.baterai.kode}`, detail: `Grade ${p.grade} · SoH ${num(p.soh)}%`, href: `/penilaian/${p.id}`, icon: ClipboardCheck, tone: "bg-leaf-50 text-leaf-600" })),
    ...rencana.map((r) => ({ id: `r-${r.id}`, waktu: r.createdAt, judul: `Rencana energi dibuat: ${r.namaDesa}`, detail: r.nama, href: `/perencana/${r.id}`, icon: SunMedium, tone: "bg-sun-100 text-sun-700" })),
    ...simulasi.map((s) => ({ id: `s-${s.id}`, waktu: s.createdAt, judul: "Simulasi ketahanan dijalankan", detail: s.nama, href: s.rencanaId ? `/ketahanan?rencana=${s.rencanaId}` : "/ketahanan", icon: CloudRain, tone: "bg-sky-50 text-sky-600" })),
    ...kompat.map((k) => ({ id: `k-${k.id}`, waktu: k.createdAt, judul: `Pemeriksaan kompatibilitas${k.baterai ? `: ${k.baterai.kode}` : ""}`, detail: (k.hasil as unknown as HasilKompatibilitas).label, href: "/riwayat?jenis=kompatibilitas", icon: PlugZap, tone: "bg-amber-50 text-amber-600" })),
  ];
  return items.sort((a, b) => b.waktu.getTime() - a.waktu.getTime()).slice(0, 8);
}
