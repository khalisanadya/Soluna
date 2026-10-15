import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BatteryCharging,
  Check,
  ChevronRight,
  CloudRain,
  Cpu,
  Home,
  Leaf,
  PanelsTopLeft,
  Pencil,
  Zap,
} from "lucide-react";
import {
  ButtonLink,
  Card,
  IlustrasiTag,
  Notice,
  SectionTitle,
} from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { cn, num, rupiahShort, tanggal } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type {
  HasilKetahanan,
  HasilKompatibilitas,
  HasilRencana,
} from "@/lib/types";
import { HapusRencana } from "./hapus-rencana";

export const metadata: Metadata = { title: "Hasil Perencanaan" };

export default async function HasilRencanaPage({
  params,
  searchParams,
}: PageProps<"/perencana/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const r = await prisma.rencanaDesa.findUnique({
    where: { id },
    include: {
      cekKompat: { orderBy: { createdAt: "desc" }, take: 1 },
      simulasi: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!r) notFound();
  const h = r.hasil as unknown as HasilRencana;
  const m = r.masukan as {
    jumlah_rumah: number;
    konsumsi_per_rumah_kwh: number;
    porsi_malam: number;
    lokasi?: string;
  };
  const s = h.ringkasan;
  const p = h.parameter;
  const b = h.biaya;
  const per = b.periode_hari === 365 ? "tahun" : "bulan";
  const kompat = r.cekKompat[0]?.hasil as HasilKompatibilitas | undefined;
  const sim = r.simulasi[0]?.hasil as HasilKetahanan | undefined;
  // Simulasi terakhir yang disimpan: tampilkan cuaca yang dipilih saat itu.
  const simMasukan = r.simulasi[0]?.masukan as { pelepasan_beban?: boolean; periode_hari?: number } | undefined;
  const simCuaca = sim ? (sim.skenario.find((x) => x.kunci === sim.terpilih) ?? sim.skenario.at(-1)) : undefined;
  const simLama = simCuaca ? (simMasukan?.pelepasan_beban === false ? simCuaca.lama_bertahan_hari : simCuaca.lama_bertahan_pelepasan_hari) : undefined;
  const gagal = h.pemeriksaan.filter((c) => !c.lulus);
  const wilayah =
    !m.lokasi || m.lokasi === "Bawaan" ? "Wilayah umum" : m.lokasi;
  const dipilih = r.bateraiIds.length
    ? await prisma.baterai.findMany({
        where: { id: { in: r.bateraiIds } },
        orderBy: { kode: "asc" },
        select: { kode: true, kapasitasAwalKwh: true },
      })
    : [];
  const kwhDipilih = dipilih.reduce((n, x) => n + x.kapasitasAwalKwh, 0);
  const kodeDipilih =
    dipilih.length > 3
      ? `${dipilih
          .slice(0, 3)
          .map((x) => x.kode)
          .join(", ")} +${dipilih.length - 3}`
      : dipilih.map((x) => x.kode).join(", ");

  const langkah: {
    href: string;
    judul: string;
    selesai: boolean;
    hasil: string;
    waktu?: string;
  }[] = [
    {
      href: `/pencocokan?rencana=${r.id}`,
      judul: "Cocokkan baterai",
      selesai: dipilih.length > 0,
      hasil: dipilih.length
        ? `${dipilih.length} baterai dipilih (${num(kwhDipilih)} kWh)`
        : "Belum ada baterai dipilih",
      waktu: dipilih.length ? kodeDipilih : undefined,
    },
    {
      href: `/kompatibilitas?rencana=${r.id}&kunci=1`,
      judul: "Cek kompatibilitas",
      selesai: Boolean(kompat),
      hasil: kompat
        ? `Hasil: ${kompat.label}`
        : "Belum dicek. Wajib sebelum dipasang",
      waktu: r.cekKompat[0]
        ? `Dicek ${tanggal(r.cekKompat[0].createdAt, true)}`
        : undefined,
    },
    {
      href: `/ketahanan?rencana=${r.id}`,
      judul: "Simulasi ketahanan",
      selesai: Boolean(sim),
      hasil: simCuaca
        ? `${simCuaca.label}${simMasukan?.periode_hari ? ` ${simMasukan.periode_hari} hari` : ""}: ${simLama === null ? "listrik aman" : `bertahan ±${num(simLama ?? 0, 1)} hari`}`
        : "Belum disimulasikan",
      waktu: r.simulasi[0]
        ? `Disimulasikan ${tanggal(r.simulasi[0].createdAt, true)}`
        : undefined,
    },
  ];

  return (
    <>
      {/* Bilah atas: kembali + aksi */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/perencana"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900"
        >
          <ArrowLeft className="size-4" /> Semua rencana
        </Link>
        <div className="flex flex-wrap gap-2">
          <HapusRencana id={r.id} nama={r.namaDesa} />
          <ButtonLink href={`/perencana/${r.id}/ubah`} variant="secondary">
            <Pencil className="size-4" /> Ubah
          </ButtonLink>
          <ButtonLink href={`/ketahanan?rencana=${r.id}`}>
            <CloudRain className="size-4" /> Simulasi ketahanan
          </ButtonLink>
        </div>
      </div>

      {sp.diubah && (
        <Notice tone="success" className="mb-4" title="Rencana diperbarui">
          Hasil rencana dihitung ulang dengan data terbaru.
        </Notice>
      )}
      {sp.baru && (
        <Notice tone="success" className="mb-4" title="Rencana tersimpan">
          Lanjutkan ke langkah berikutnya di sebelah kanan.
        </Notice>
      )}
      {gagal.length > 0 && (
        <Notice
          tone="danger"
          className="mb-4"
          title="Rancangan belum mencukupi"
        >
          {gagal.map((c) => c.keterangan).join(" ")}
        </Notice>
      )}

      {/* Sorotan: rekomendasi sistem */}
      <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-ink-900 p-6 text-white shadow-lift sm:p-8">
        <div
          className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-sun-500/25 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-28 left-1/4 size-64 rounded-full bg-leaf-500/15 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-sun-400 uppercase">
              Rekomendasi sistem{" "}
              {r.ilustrasi && (
                <IlustrasiTag className="border-white/30 text-ink-300" />
              )}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {r.namaDesa}
            </h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-300">
              <span>{r.nama}</span>
              <span className="inline-flex items-center gap-1">
                <Home className="size-3.5" /> {num(m.jumlah_rumah, 0)} rumah
              </span>
              <span>{wilayah}</span>
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10 sm:text-right">
            <span className="flex items-center gap-1.5 text-xs text-ink-300 sm:justify-end">
              <Zap className="size-3.5 text-sun-400" /> Kebutuhan listrik
            </span>
            <span className="num text-2xl font-semibold">
              {num(s.kebutuhan_harian_kwh)}{" "}
              <span className="text-sm font-normal text-ink-400">kWh/hari</span>
            </span>
          </div>
        </div>

        <div className="relative mt-7 grid gap-3 sm:grid-cols-3">
          <Angka
            icon={<PanelsTopLeft className="size-5" />}
            warna="bg-sun-500 text-ink-950"
            label="Panel surya"
            nilai={`${s.jumlah_panel}`}
            satuan="panel"
            ket={`${num(s.kapasitas_panel_terpasang_kwp)} kWp terpasang`}
          />
          <Angka
            icon={<BatteryCharging className="size-5" />}
            warna="bg-leaf-500 text-white"
            label="Baterai"
            nilai={`${s.jumlah_paket}`}
            satuan="paket"
            ket={`${num(s.energi_tersedia_kwh)} kWh siap pakai`}
          />
          <Angka
            icon={<Cpu className="size-5" />}
            warna="bg-sky-500 text-white"
            label="Inverter"
            nilai={`${s.inverter_kw}`}
            satuan="kW"
            ket={`Beban puncak ${num(s.daya_puncak_kw)} kW`}
          />
        </div>
      </section>

      {/* 1 · Dasar perhitungan: data masukan → alasan rekomendasi */}
      <Bagian judul="Dasar perhitungan" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <SectionTitle title="Data yang dipakai" />
          <dl className="divide-y divide-ink-100 text-sm">
            {(
              [
                [
                  "Pemakaian",
                  `${num(m.konsumsi_per_rumah_kwh)} kWh/rumah · ${num(m.porsi_malam * 100, 0)}% malam`,
                ],
                [
                  "Baterai",
                  `${num(p.kapasitas_paket_kwh)} kWh · SoH ${num(p.soh_paket * 100, 0)}%`,
                ],
                ...(p.prioritas_label ? [["Tujuan", p.prioritas_label]] : []),
                [
                  "Cadangan",
                  p.hari_cadangan ? `${p.hari_cadangan} hari` : "Tidak ada",
                ],
              ] as [string, string][]
            ).map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between gap-4 py-2 first:pt-0 last:pb-0"
              >
                <dt className="text-ink-500">{k}</dt>
                <dd className="num text-right font-medium text-ink-900">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-ink-400">
            Semua angka adalah estimasi.
          </p>
        </Card>

        <Card className="lg:col-span-2">
          <SectionTitle
            title="Kenapa sistem ini?"
            hint="Cara angka rekomendasi di atas didapat"
          />
          <ul className="space-y-3 text-sm text-ink-600">
            <Alasan icon={<PanelsTopLeft className="size-4" />}>
              Panel menghasilkan ±
              {num(s.produksi_surya_harian_kwh ?? s.kebutuhan_harian_kwh)}{" "}
              kWh/hari dengan matahari ±{num(p.psh_jam)} jam, cukup untuk
              kebutuhan {num(s.kebutuhan_harian_kwh)} kWh.
            </Alasan>
            <Alasan icon={<BatteryCharging className="size-4" />}>
              Malam butuh ±{num(s.kebutuhan_malam_kwh)} kWh. Tiap paket dipakai{" "}
              {num(s.kapasitas_terpakai_per_paket_kwh)} kWh, jadi{" "}
              {s.paket_siklus_harian} paket per malam
              {p.hari_cadangan ? ` + cadangan ${p.hari_cadangan} hari` : ""}.
            </Alasan>
            <Alasan icon={<Cpu className="size-4" />}>
              Beban tertinggi ±{num(s.daya_puncak_kw)} kW; inverter{" "}
              {s.inverter_kw} kW adalah ukuran standar terdekat dengan cadangan
              aman.
            </Alasan>
          </ul>
        </Card>
      </div>

      {/* 2 · Biaya & dampak */}
      <Bagian judul="Biaya & dampak" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-[var(--radius-card)] bg-surface p-5 shadow-soft ring-1 ring-ink-200/60">
          <p className="flex items-center gap-2 text-sm text-ink-600">
            <span className="grid size-8 place-items-center rounded-xl bg-sun-100 text-sun-700">
              <Zap className="size-4" />
            </span>
            Biaya listrik
          </p>
          <p className="num mt-3 text-2xl font-semibold text-ink-950">
            {rupiahShort(b.sistem_per_rumah.rendah)} –{" "}
            {rupiahShort(b.sistem_per_rumah.tinggi)}
          </p>
          <p className="text-xs text-ink-500">per rumah / {per}</p>
        </div>
        <div className="rounded-[var(--radius-card)] bg-surface p-5 shadow-soft ring-1 ring-ink-200/60">
          <p className="flex items-center gap-2 text-sm text-ink-600">
            <span className="grid size-8 place-items-center rounded-xl bg-ink-100 text-ink-700">
              <Home className="size-4" />
            </span>
            Iuran perawatan
          </p>
          <p className="num mt-3 text-2xl font-semibold text-ink-950">
            {rupiahShort(b.iuran_perawatan_per_rumah_bulan.rendah)} –{" "}
            {rupiahShort(b.iuran_perawatan_per_rumah_bulan.tinggi)}
          </p>
          <p className="text-xs text-ink-500">per rumah / bulan</p>
        </div>
        <div className="rounded-[var(--radius-card)] bg-leaf-50 p-5 ring-1 ring-leaf-100 sm:col-span-2 lg:col-span-1">
          <p className="flex items-center gap-2 text-sm text-leaf-700">
            <span className="grid size-8 place-items-center rounded-xl bg-white text-leaf-600 shadow-soft">
              <Leaf className="size-4" />
            </span>
            Emisi dihindari
          </p>
          <p className="num mt-3 text-2xl font-semibold text-ink-950">
            {num(h.lingkungan.co2_dihindari_kg, 0)}{" "}
            <span className="text-sm font-normal text-ink-500">kg CO₂</span>
          </p>
          <p className="text-xs text-ink-500">per {per}</p>
        </div>
      </div>

      {/* 3 · Langkah berikutnya + hasil singkat yang sudah dijalankan */}
      <Bagian judul="Langkah berikutnya" />
      <ol className="grid gap-3 md:grid-cols-3">
        {langkah.map((l, i) => (
          <li key={l.judul}>
            <Link
              href={l.href}
              className={cn(
                "group flex h-full flex-col rounded-[var(--radius-card)] p-4 shadow-soft ring-1 transition hover:-translate-y-0.5",
                l.selesai
                  ? "bg-surface ring-leaf-200"
                  : "bg-surface ring-ink-200/60 hover:ring-ink-300",
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "num grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold",
                    l.selesai
                      ? "bg-leaf-500 text-white"
                      : "bg-sun-100 text-sun-800",
                  )}
                >
                  {l.selesai ? <Check className="size-4" /> : i + 1}
                </span>
                <span className="flex-1 text-sm font-semibold text-ink-900">
                  {l.judul}
                </span>
                <ChevronRight className="size-4 shrink-0 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-ink-500" />
              </div>
              <div
                className={cn(
                  "mt-3 flex-1 rounded-xl px-3 py-2 text-xs",
                  l.selesai
                    ? "bg-leaf-50 text-leaf-800"
                    : "bg-ink-50 text-ink-500",
                )}
              >
                <p className="font-medium">{l.hasil}</p>
                {l.waktu && (
                  <p className="mt-0.5 text-[0.7rem] opacity-70">{l.waktu}</p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </>
  );
}

function Bagian({ judul }: { judul: string }) {
  return <p className="eyebrow mt-8 mb-3">{judul}</p>;
}

function Angka({
  icon,
  warna,
  label,
  nilai,
  satuan,
  ket,
}: {
  icon: React.ReactNode;
  warna: string;
  label: string;
  nilai: string;
  satuan: string;
  ket: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10">
      <span
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-xl",
          warna,
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-ink-400">{label}</p>
        <p className="num text-2xl leading-tight font-semibold">
          {nilai}{" "}
          {satuan && (
            <span className="text-sm font-normal text-ink-400">{satuan}</span>
          )}
        </p>
        <p className="num truncate text-xs text-ink-300">{ket}</p>
      </div>
    </div>
  );
}

function Alasan({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-600">
        {icon}
      </span>
      <span className="num pt-1.5 leading-relaxed">{children}</span>
    </li>
  );
}
