import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, ClipboardCheck, Gauge, PlugZap, Recycle, ShieldCheck } from "lucide-react";
import { CalcDetail, DefaultsUsed, ExplanationCard } from "@/components/calc";
import { PrintButton } from "@/components/print-button";
import { Badge, ButtonLink, Card, Disclaimer, GradeBadge, IlustrasiTag, Logo, Notice, PageHeader, gradeTone } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import type { Penjelasan } from "@/lib/engine";
import { bulanTahun, num, tanggal } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { Grade, HasilKompatibilitas, HasilPenilaian } from "@/lib/types";

export const metadata: Metadata = { title: "Paspor Baterai" };

const kompatTone = { layak: "leaf", perlu_penyesuaian: "amber", tidak_layak: "flame" } as const;

export default async function PasporPage({ params, searchParams }: PageProps<"/penilaian/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const p = await prisma.penilaian.findUnique({
    where: { id },
    include: {
      penilai: { select: { nama: true } },
      baterai: { include: { pemasok: true, cekKompat: { orderBy: { createdAt: "desc" }, take: 1 } } },
    },
  });
  if (!p) notFound();
  const h = p.hasil as unknown as HasilPenilaian;
  const b = p.baterai;
  const g = p.grade as Grade;
  const tone = gradeTone[g];
  const kompat = b.cekKompat[0]?.hasil as HasilKompatibilitas | undefined;
  const maxYears = Math.max(h.sisa_umur.atas * 1.15, 1);
  const pos = (y: number) => `${Math.min(100, (y / maxYears) * 100)}%`;
  const nomor = `SLN-${b.kode.replace("BAT-", "")}-${p.createdAt.toISOString().slice(0, 10).replaceAll("-", "")}`;

  return (
    <>
      <PageHeader
        eyebrow={<>Modul A · Paspor baterai {b.ilustrasi && <IlustrasiTag />}</>}
        title="Paspor baterai"
        description="Catatan ringkas kesehatan, rentang umur, grade, dan keputusan pemanfaatan baterai."
        actions={
          <>
            <PrintButton />
            <ButtonLink href={`/kompatibilitas?baterai=${b.id}`} variant="secondary" className="print:hidden">
              <PlugZap className="size-4" /> Cek kompatibilitas
            </ButtonLink>
            <ButtonLink href={`/penilaian/baru?baterai=${b.id}`} className="print:hidden">
              <ClipboardCheck className="size-4" /> Nilai ulang
            </ButtonLink>
          </>
        }
      />
      {sp.baru && (
        <Notice tone="success" className="mb-4 print:hidden" title="Penilaian tersimpan">
          Paspor baterai {b.kode} diterbitkan dan status baterai diperbarui.
        </Notice>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        {/* Dokumen paspor */}
        <article className="self-start overflow-hidden rounded-[1.75rem] bg-surface shadow-lift ring-1 ring-ink-200/70">
          <header className="flex items-center justify-between gap-4 bg-ink-900 px-6 py-5 text-white sm:px-8">
            <div className="[&_span]:text-white">
              <Logo size={28} />
            </div>
            <div className="text-right">
              <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-sun-400 uppercase">Paspor Baterai</p>
              <p className="num text-sm text-ink-300">{nomor}</p>
            </div>
          </header>

          <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:p-8">
            <div className="flex flex-row items-center gap-4 sm:flex-col sm:items-start">
              <GradeBadge grade={g} size="lg" />
              <div>
                <p className="text-xs text-ink-500">Grade</p>
                <p className={`font-semibold ${tone.text}`}>{tone.label}</p>
                <p className="num text-xs text-ink-500">{h.rentang_grade}</p>
              </div>
            </div>
            <div className="min-w-0">
              <p className="num text-2xl font-semibold">{b.kode}</p>
              <p className="text-ink-600">
                {b.merek} {b.model} · {b.jenisKimia}
              </p>
              <p className="mt-1 text-sm text-ink-500">
                Pemasok: {b.pemasok.namaPerusahaan} · {b.pemasok.kota}, {b.pemasok.provinsi}
              </p>
              <div className="mt-4 rounded-2xl p-4 ring-1" style={{ background: `${tone.hex}10`, borderColor: tone.hex, boxShadow: `inset 0 0 0 1px ${tone.hex}30` }}>
                <p className="text-xs text-ink-500">Keputusan pemanfaatan</p>
                <p className="mt-0.5 text-lg font-semibold">{h.keputusan}</p>
                {h.jalur_daur_ulang && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-flame-600">
                    <Recycle className="size-4" /> Status: jalur daur ulang
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid border-y border-ink-100 sm:grid-cols-3 sm:divide-x sm:divide-ink-100">
            <div className="p-6 sm:p-7">
              <p className="flex items-center gap-1.5 text-xs text-ink-500">
                <Gauge className="size-3.5" /> State of Health
              </p>
              <p className="num mt-2 text-4xl">
                {num(h.soh)}
                <span className="text-lg text-ink-400">%</span>
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-100">
                <div className="h-full rounded-full" style={{ width: `${h.soh}%`, background: tone.hex }} />
              </div>
            </div>
            <div className="border-t border-ink-100 p-6 sm:border-t-0 sm:p-7">
              <p className="flex items-center gap-1.5 text-xs text-ink-500">
                <ShieldCheck className="size-3.5" /> Skor keyakinan
              </p>
              <p className="num mt-2 text-4xl">
                {num(h.keyakinan, 0)}
                <span className="text-lg text-ink-400">%</span>
              </p>
              <p className="mt-2 text-xs text-ink-500">Kelengkapan data {num(h.kelengkapan_data, 0)}%</p>
            </div>
            <div className="border-t border-ink-100 p-6 sm:border-t-0 sm:p-7">
              <p className="flex items-center gap-1.5 text-xs text-ink-500">
                <CalendarClock className="size-3.5" /> Perkiraan penggantian
              </p>
              <p className="mt-2 text-xl font-semibold">{h.penggantian.segera ? "Segera" : bulanTahun(h.penggantian.tengah)}</p>
              <p className="mt-1 text-xs text-ink-500">
                {bulanTahun(h.penggantian.paling_cepat)} – {bulanTahun(h.penggantian.paling_lambat)}
              </p>
            </div>
          </div>

          {/* A-6: rentang sisa umur bawah–tengah–atas */}
          <div className="p-6 sm:p-8">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-ink-500">Rentang sisa umur</p>
                <p className="num text-2xl">
                  {num(h.sisa_umur.bawah)}–{num(h.sisa_umur.atas)} <span className="text-base text-ink-500">tahun</span>
                </p>
              </div>
              <p className="text-right text-xs text-ink-500">
                Laju penurunan {num(h.sisa_umur.laju_per_tahun, 2)}%/tahun
                <br />({h.sisa_umur.sumber_laju === "teramati" ? "dari riwayat baterai" : "nilai bawaan"})
              </p>
            </div>
            <div className="relative mt-5 h-10">
              <div className="absolute inset-x-0 top-4 h-2 rounded-full bg-ink-100" />
              <div className="absolute top-4 h-2 rounded-full" style={{ left: pos(h.sisa_umur.bawah), width: `calc(${pos(h.sisa_umur.atas)} - ${pos(h.sisa_umur.bawah)})`, background: `${tone.hex}66` }} />
              <div className="absolute top-2 h-6 w-1 -translate-x-1/2 rounded-full bg-ink-900" style={{ left: pos(h.sisa_umur.tengah) }} title="Nilai tengah" />
              <span className="num absolute top-0 -translate-x-1/2 -translate-y-full text-xs font-semibold" style={{ left: pos(h.sisa_umur.tengah) }}>
                {num(h.sisa_umur.tengah)} th
              </span>
              <span className="absolute top-8 left-0 text-[0.65rem] text-ink-400">sekarang</span>
              <span className="num absolute top-8 right-0 text-[0.65rem] text-ink-400">{num(maxYears, 0)} th</span>
            </div>
            {h.sisa_umur.faktor_stres.length > 0 && <p className="mt-3 text-xs text-ink-500">Faktor stres: {h.sisa_umur.faktor_stres.join(", ")}.</p>}
          </div>

          <div className="grid gap-6 border-t border-ink-100 bg-ink-50/60 p-6 text-sm sm:grid-cols-2 sm:p-8">
            <dl className="space-y-1.5">
              <p className="eyebrow mb-2">Spesifikasi</p>
              {[
                ["Kapasitas awal", `${num(b.kapasitasAwalKwh)} kWh`],
                ["Kapasitas sehat", `${num((b.kapasitasAwalKwh * h.soh) / 100)} kWh`],
                ["Tegangan nominal", b.teganganNominalV ? `${num(b.teganganNominalV)} V` : "—"],
                ["Usia", b.usiaTahun !== null ? `${num(b.usiaTahun)} tahun` : "—"],
                ["Siklus", b.jumlahSiklus !== null ? num(b.jumlahSiklus, 0) : "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-ink-500">{k}</dt>
                  <dd className="num font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <dl className="space-y-1.5">
              <p className="eyebrow mb-2">Penilaian</p>
              {[
                ["Tanggal penilaian", tanggal(p.createdAt)],
                ["Penilai", p.penilai.nama],
                ["Versi konfigurasi", `v${p.versiKonfigurasi}`],
                ["Versi model", p.versiModel],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-ink-500">{k}</dt>
                  <dd className="text-right font-medium break-all">{v}</dd>
                </div>
              ))}
              <div className="flex items-center justify-between gap-4">
                <dt className="text-ink-500">Kompatibilitas</dt>
                <dd>{kompat ? <Badge tone={kompatTone[kompat.status]}>{kompat.label}</Badge> : <Link href={`/kompatibilitas?baterai=${b.id}`} className="text-sun-700 hover:underline">Belum dicek</Link>}</dd>
              </div>
            </dl>
          </div>

          <footer className="border-t border-ink-100 px-6 py-4 text-xs leading-relaxed text-ink-500 sm:px-8">
            <strong className="text-ink-700">Catatan batasan:</strong> {h.kerangka} Penilaian berdasarkan data masukan; sistem tidak
            menguji fisik kapasitas, suhu, tegangan, hambatan internal, atau BMS. Sisa umur adalah estimasi, bukan tanggal
            kerusakan pasti.
          </footer>
        </article>

        <div className="space-y-4 print:hidden">
          <ExplanationCard penjelasan={p.penjelasan as Penjelasan | null} />
          <DefaultsUsed items={h.nilai_bawaan} />
          <CalcDetail steps={h.langkah} defaultOpen />
          <Card tone="muted" className="text-sm text-ink-600">
            <Link href={`/baterai/${b.id}`} className="font-semibold text-ink-900 hover:underline">
              Lihat baterai & riwayat SoH →
            </Link>
          </Card>
        </div>
      </div>
      <Disclaimer className="mt-6" />
    </>
  );
}
