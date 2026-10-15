import Link from "next/link";
import {
  AlertTriangle,
  BatteryCharging,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  CloudRain,
  Fuel,
  Home,
  PlugZap,
  Recycle,
  SunMedium,
  XCircle,
  Wrench,
} from "lucide-react";
import { Badge, ButtonLink, Card, EmptyState, GradeBadge, IlustrasiTag, Notice, PageHeader, Progress, SectionTitle, Stat } from "@/components/ui";
import { analisisSiklus, bateraiDinilaiUntukSiklus, kompatTerakhir } from "@/lib/analisis";
import { getActiveConfig } from "@/lib/config";
import { gradeCounts } from "@/lib/data";
import { engineHealth } from "@/lib/engine";
import { cn, days, num, rupiahShort, tanggal } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { HasilKetahanan, HasilKompatibilitas, HasilRencana, Rentang } from "@/lib/types";

/* Dashboard Pengelola Sistem Desa.
   Semua angka berasal dari basis data atau hasil mesin hitung yang tersimpan; tidak ada angka contoh.
   Setiap blok energi diberi label sumbernya: input pengguna, hasil perhitungan, atau simulasi.
   SOLUNA belum menerima data pengukuran aktual (telemetri), jadi tidak ada angka "aktual". */

export async function AdminDashboard() {
  const [mesinAktif, belumDinilai, counts, dinilai, kompat, rencana, { versi }, asetCounts] = await Promise.all([
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
    prisma.asetBaterai.groupBy({ by: ["status"], _count: { _all: true } }),
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
  const aset = Object.fromEntries(asetCounts.map((row) => [row.status, row._count._all])) as Partial<Record<"AKAN_DIBELI" | "TERDAFTAR" | "DIGUNAKAN" | "TIDAK_TERSEDIA", number>>;

  // Tindak lanjut, dikelompokkan menurut jenis pekerjaan (bukan diberi skor prioritas).
  const perluTindakan: TindakLanjut[] = [
    ...belumDinilai.map((b) => ({
      id: `n-${b.id}`,
      kode: b.kode,
      grade: null,
      jenis: "Belum dinilai",
      tone: "neutral" as const,
      alasan: `${b.merek} ${b.model} dari ${b.pemasok.namaPerusahaan}, masuk ${tanggal(b.createdAt)}.`,
      aksi: { label: "Cari", href: `/baterai?q=${encodeURIComponent(b.kode)}` },
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
        description="Kelola energi desa, biaya operasional, dan baterai pemasok yang akan digunakan di desa."
        actions={
          <>
            <ButtonLink href="/baterai" variant="secondary">
              <BatteryCharging className="size-4" /> Tambah / Cari baterai
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

      {rencana ? <RingkasanPengelolaan hasil={rencana.hasil as unknown as HasilRencana} namaDesa={rencana.namaDesa} jumlahRumah={(rencana.masukan as { jumlah_rumah?: number }).jumlah_rumah} /> : (
        <Card className="mb-4 border-dashed">
          <SectionTitle title="Profil energi desa belum tersedia" />
          <p className="text-sm text-ink-600">Buat rencana desa untuk melihat kebutuhan energi, penghematan diesel, iuran, dan titik impas.</p>
          <ButtonLink href="/perencana" className="mt-3">Buat rencana desa</ButtonLink>
        </Card>
      )}

      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-lg font-semibold">Pemantauan baterai</h2>
        <span className="text-xs text-ink-500">Data pemasok dan aset desa</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat
          label="Menunggu penilaian"
          value={belumDinilai.length}
          unit="baterai"
          icon={<Clock3 className="size-4" />}
          accent="sun"
          hint="Dari pemasok"
          href="/baterai"
        />
        <Stat
          label="Layak dipakai ulang"
          value={layak}
          unit="baterai"
          icon={<CheckCircle2 className="size-4" />}
          accent="leaf"
          hint="Grade A–C"
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
          hint={siklusOk ? "Mendekati ambang ganti" : dinilai.length ? "Butuh mesin hitung aktif" : "Belum ada baterai dinilai"}
          href="/siklus-hidup"
        />
      </div>

      <Card className="mt-4">
        <SectionTitle title="Status aset baterai desa" action={<ButtonLink href="/baterai" size="sm" variant="secondary">Cari nomor seri</ButtonLink>} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Angka label="Akan dibeli" nilai={String(aset.AKAN_DIBELI ?? 0)} detail="dari pemasok" />
          <Angka label="Terdaftar" nilai={String(aset.TERDAFTAR ?? 0)} detail="siap dipertimbangkan" />
          <Angka label="Digunakan di desa" nilai={String(aset.DIGUNAKAN ?? 0)} detail="aset aktif" />
          <Angka label="Tidak tersedia" nilai={String(aset.TIDAK_TERSEDIA ?? 0)} detail="tidak dapat dipakai" />
        </div>
      </Card>

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
            title="Perlu ditindaklanjuti"
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
              {perluTindakan.slice(0, MAKS).map((t) => (
                <li key={t.id}>
                  <Link href={t.aksi.href} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-ink-50">
                    <GradeBadge grade={t.grade} size="sm" />
                    <span className="num w-20 shrink-0 text-sm font-semibold">{t.kode}</span>
                    <Badge tone={t.tone} className="shrink-0">
                      {t.jenis}
                    </Badge>
                    <span className="hidden min-w-0 flex-1 truncate text-sm text-ink-500 sm:block">{t.alasan}</span>
                    <span className="ml-auto inline-flex shrink-0 items-center text-sm font-semibold text-ink-800">
                      {t.aksi.label}
                      <ChevronRight className="size-3.5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-leaf-700">Tidak ada baterai yang perlu ditindaklanjuti.</p>
          )}
          {perluTindakan.length > MAKS && (
            <p className="mt-2 text-xs text-ink-500">
              +{perluTindakan.length - MAKS} lainnya di{" "}
              <Link href="/pencocokan" className="font-medium text-ink-700 hover:underline">
                Pencocokan
              </Link>{" "}
              dan{" "}
              <Link href="/siklus-hidup" className="font-medium text-ink-700 hover:underline">
                Siklus Hidup
              </Link>
              .
            </p>
          )}
        </Card>

        <Card>
          <SectionTitle
            title="Aktivitas terbaru"
            action={
              <Link href="/riwayat" className="text-sm font-semibold text-sun-700 hover:underline">
                Riwayat
              </Link>
            }
          />
          {aktivitas.length ? (
            <ul className="-mx-2 divide-y divide-ink-100">
              {aktivitas.map((a) => (
                <li key={a.id}>
                  <Link href={a.href} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-ink-50">
                    <span className={cn("grid size-7 shrink-0 place-items-center rounded-full", a.tone)}>
                      <a.icon className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink-900">{a.judul}</span>
                      <span className="block truncate text-xs text-ink-500">{tanggal(a.waktu, true)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-500">Belum ada aktivitas yang tercatat.</p>
          )}
        </Card>
      </div>
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

const MAKS = 5;

function Sumber({ jenis }: { jenis: "hitung" | "simulasi" }) {
  const map = {
    hitung: { t: "Hasil hitung", c: "bg-sun-100 text-sun-800" },
    simulasi: { t: "Simulasi", c: "bg-sky-50 text-sky-600" },
  }[jenis];
  return <span className={cn("rounded-full px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase", map.c)}>{map.t}</span>;
}

function Angka({ label, nilai, detail }: { label: string; nilai: string; detail: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-ink-500">{label}</p>
      <p className="num mt-1 text-xl font-semibold text-ink-950">{nilai}</p>
      <p className="mt-0.5 truncate text-xs text-ink-500" title={detail}>
        {detail}
      </p>
    </div>
  );
}

function RingkasanPengelolaan({ hasil, namaDesa, jumlahRumah }: { hasil: HasilRencana; namaDesa: string; jumlahRumah?: number }) {
  const r = hasil.ringkasan;
  const b = hasil.biaya;
  const impas = b.titik_impas_tahun;
  return (
    <Card className="mb-4">
      <SectionTitle
        title="Ringkasan pengelolaan desa"
        hint="Berdasarkan rencana energi terakhir"
        action={<Link href="/perencana" className="text-sm font-semibold text-sun-700 hover:underline">Kelola rencana</Link>}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Angka label="Rumah terlayani" nilai={jumlahRumah ? num(jumlahRumah, 0) : "—"} detail={`${num(r.kebutuhan_harian_kwh)} kWh kebutuhan harian`} />
        <Angka label="Penghematan diesel" nilai={`${num(hasil.lingkungan.diesel_hemat_liter, 0)} liter`} detail={`selama ${hasil.lingkungan.periode_hari} hari`} />
        <Angka label="Iuran perawatan" nilai={rentang(b.iuran_perawatan_per_rumah_bulan)} detail="per rumah setiap bulan" />
        <Angka
          label="Titik impas"
          nilai={impas && impas.rendah !== null && impas.tinggi !== null ? `${num(impas.rendah, 1)}–${num(impas.tinggi, 1)} th` : "Belum dihitung"}
          detail={impas ? "dibandingkan biaya diesel" : "buat ulang rencana untuk menghitung"}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-ink-100 pt-3 text-sm text-ink-600">
        <span className="inline-flex items-center gap-2"><Home className="size-4 text-sun-700" /> Desa: {namaDesa}</span>
        <span className="inline-flex items-center gap-2"><Fuel className="size-4 text-flame-500" /> Setara biaya diesel: {rentang(b.diesel_per_rumah)} / rumah / {b.periode_hari} hari</span>
        <span className="inline-flex items-center gap-2"><Wrench className="size-4 text-ink-500" /> {r.jumlah_paket} paket baterai · {num(r.kapasitas_panel_terpasang_kwp)} kWp surya</span>
      </div>
    </Card>
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
  const b = hasil.biaya;
  const gagal = hasil.pemeriksaan.filter((x) => !x.lulus);
  return (
    <Card className="h-full">
      <SectionTitle
        title={
          <span className="flex items-center gap-2">
            Energi desa <Sumber jenis="hitung" />
          </span>
        }
        hint={
          <span className="flex flex-wrap items-center gap-x-1.5">
            {judul} {ilustrasi && <IlustrasiTag />} · {tanggal(waktu)}
            {versi !== versiAktif && <span className="text-amber-600">· parameter v{versi} (aktif v{versiAktif})</span>}
          </span>
        }
        action={
          <Link href={`/perencana/${id}`} className="text-sm font-semibold whitespace-nowrap text-sun-700 hover:underline">
            Detail
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        <Angka
          label="Kebutuhan harian"
          nilai={`${num(r.kebutuhan_harian_kwh)} kWh`}
          detail={jumlahRumah ? `${num(jumlahRumah, 0)} rumah · malam ${num(r.kebutuhan_malam_kwh)} kWh` : `malam ${num(r.kebutuhan_malam_kwh)} kWh`}
        />
        <Angka
          label="Panel surya"
          nilai={`${num(r.kapasitas_panel_terpasang_kwp)} kWp`}
          detail={r.produksi_surya_harian_kwh !== undefined ? `${r.jumlah_panel} panel · ±${num(r.produksi_surya_harian_kwh)} kWh/hari` : `${r.jumlah_panel} panel`}
        />
        <Angka label="Baterai dapat dipakai" nilai={`${num(r.energi_tersedia_kwh)} kWh`} detail={`${r.jumlah_paket} paket · nominal ${num(r.kapasitas_baterai_total_kwh)} kWh`} />
        <Angka label="Inverter" nilai={`${num(r.inverter_kw, 0)} kW`} detail={`puncak ${num(r.daya_puncak_kw)} kW`} />
      </div>

      <dl className="mt-5 grid gap-x-6 gap-y-2 border-t border-ink-100 pt-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-ink-500">Sistem / rumah · {b.periode_hari} hari</dt>
          <dd className="num font-semibold text-ink-900">{rentang(b.sistem_per_rumah)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-500">Setara diesel / rumah · {b.periode_hari} hari</dt>
          <dd className="num font-semibold text-sun-700">{rentang(b.diesel_per_rumah)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-500">Iuran perawatan / rumah</dt>
          <dd className="num font-semibold text-ink-900">{rentang(b.iuran_perawatan_per_rumah_bulan)}/bln</dd>
        </div>
      </dl>

      {gagal.length > 0 ? (
        <ul className="mt-4 space-y-1 text-sm text-flame-600">
          {gagal.map((x) => (
            <li key={x.nama} className="flex items-start gap-2">
              <XCircle className="mt-0.5 size-4 shrink-0" /> {x.keterangan}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 flex items-center gap-2 text-sm text-leaf-700">
          <CheckCircle2 className="size-4" /> Kebutuhan energi dan daya puncak terpenuhi.
        </p>
      )}
      <p className="mt-2 text-xs text-ink-500">Hasil perencanaan, bukan pembacaan meter.</p>
    </Card>
  );
}

/* ---------- Ketahanan dari simulasi tersimpan ---------- */

function Ketahanan({ simulasi, rencanaId }: { simulasi: { hasil: unknown; createdAt: Date; nama: string } | null; rencanaId?: string }) {
  const href = rencanaId ? `/ketahanan?rencana=${rencanaId}` : "/ketahanan";
  if (!simulasi) {
    return (
      <Card className="flex h-full flex-col">
        <SectionTitle title="Ketahanan energi" />
        <div className="flex flex-1 flex-col items-start justify-center gap-3">
          <p className="text-sm text-ink-600">{rencanaId ? "Belum ada simulasi untuk rencana terakhir." : "Buat rencana desa dulu, lalu jalankan simulasi."}</p>
          <ButtonLink href={href} variant="secondary" size="sm">
            <CloudRain className="size-4" /> Jalankan simulasi
          </ButtonLink>
        </div>
      </Card>
    );
  }
  const h = simulasi.hasil as HasilKetahanan;
  const periode = h.periode_hari;
  return (
    <Card className="h-full">
      <SectionTitle
        title={
          <span className="flex items-center gap-2">
            Ketahanan <Sumber jenis="simulasi" />
          </span>
        }
        hint={`${tanggal(simulasi.createdAt)} · target ${periode} hari`}
        action={
          <Link href={href} className="text-sm font-semibold whitespace-nowrap text-sun-700 hover:underline">
            Buka
          </Link>
        }
      />
      <ul className="space-y-3.5">
        {h.skenario.map((s) => {
          const lama = s.lama_bertahan_pelepasan_hari;
          return (
            <li key={s.kunci}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-ink-700">{s.label}</span>
                <span className="num font-semibold text-ink-950">{days(lama)}</span>
              </div>
              <Progress value={lama === null ? periode : Math.min(lama, periode)} max={periode} color={s.cukup_pelepasan ? "bg-leaf-500" : "bg-sun-500"} className="mt-1.5" />
              {!s.cukup_pelepasan && <p className="mt-1 text-xs text-ink-500">Genset ±{num(s.jam_genset_pelepasan, 1)} jam</p>}
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs text-ink-500">Dengan pelepasan beban bertingkat · {h.prioritas_label}</p>
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
  return items.sort((a, b) => b.waktu.getTime() - a.waktu.getTime()).slice(0, MAKS);
}
