import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardCheck, Gauge, PlugZap, Recycle, ShieldCheck } from "lucide-react";
import { PrintButton } from "@/components/print-button";
import { Badge, ButtonLink, GradeBadge, Logo, Notice, PageHeader, gradeTone, tingkatSoh } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getActiveConfig } from "@/lib/config";
import { cn, num, tanggal, tanpaPenandaIlustrasi } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { Grade, HasilKompatibilitas, HasilPenilaian } from "@/lib/types";

export const metadata: Metadata = { title: "Paspor Baterai" };

const kompatTone = { layak: "leaf", perlu_penyesuaian: "amber", tidak_layak: "flame" } as const;

export default async function PasporPage({ params, searchParams }: PageProps<"/penilaian/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const p = await prisma.penilaian.findFirst({
    where: { id, ...(user.peran === "PEMASOK" ? { baterai: { pemasokId: user.pemasokId! } } : {}) },
    include: {
      baterai: { include: { pemasok: true, cekKompat: { orderBy: { createdAt: "desc" }, take: 1 } } },
    },
  });
  if (!p) notFound();
  const h = p.hasil as unknown as HasilPenilaian;
  const b = p.baterai;
  const g = p.grade as Grade;
  const tone = gradeTone[g];
  const kompat = b.cekKompat[0]?.hasil as HasilKompatibilitas | undefined;
  const { data: cfg } = await getActiveConfig();
  const soh = tingkatSoh(h.soh, cfg.grade.A, cfg.grade.C);
  const cycles = h.sisa_umur_siklus ?? (h.sisa_umur?.satuan === "siklus" ? h.sisa_umur : null);
  const siklusTengah = cycles?.tengah ?? null;
  const siklusText = cycles ? `${num(cycles.bawah, 0)}–${num(cycles.atas, 0)} siklus` : "Belum tersedia";
  const bulan = siklusTengah !== null ? Math.max(0, Math.round(siklusTengah / 30)) : null;
  const hasilPerluDicek =
    siklusTengah !== null &&
    (siklusTengah < 100 || ((g === "A" || g === "B") && siklusTengah < 300) || ((g === "C" || g === "D") && siklusTengah > 1000));
  const nomor = `SLN-${b.kode.replace("BAT-", "")}-${p.createdAt.toISOString().slice(0, 10).replaceAll("-", "")}`;
  const penilaianItems: [string, ReactNode][] = [
    ["Tanggal", tanggal(p.createdAt)],
    ["Penerbit paspor", tanpaPenandaIlustrasi(b.pemasok.namaPerusahaan)],
    ["Model", h.model?.versi ?? p.versiModel ?? "—"],
    ...(user.peran === "ADMIN"
      ? [
          [
            "Kompatibilitas",
            kompat ? (
              <Badge tone={kompatTone[kompat.status]}>{kompat.label}</Badge>
            ) : (
              <Link href={`/kompatibilitas?baterai=${b.id}`} className="font-medium text-sun-700 hover:underline">
                Belum dicek
              </Link>
            ),
          ] as [string, ReactNode],
        ]
      : []),
  ];

  return (
    <>
      <PageHeader
        eyebrow="Baterai"
        title="Paspor baterai"
        description="Ringkasan kesehatan, hasil penilaian model, dan keputusan pemanfaatan baterai."
        actions={
          <>
            <PrintButton />
            {user.peran === "ADMIN" && (
              <ButtonLink href={`/kompatibilitas?baterai=${b.id}`} variant="secondary" className="print:hidden">
                <PlugZap className="size-4" /> Cek kompatibilitas
              </ButtonLink>
            )}
            {user.peran === "PEMASOK" && (
              <ButtonLink href={`/penilaian/baru?baterai=${b.id}`} className="print:hidden">
                <ClipboardCheck className="size-4" /> Nilai ulang baterai
              </ButtonLink>
            )}
          </>
        }
      />
      {sp.baru && (
        <Notice tone="success" className="mx-auto mb-4 max-w-4xl print:hidden" title="Penilaian tersimpan">
          Paspor baterai {b.kode} diterbitkan oleh pemasok dan status baterai diperbarui.
        </Notice>
      )}

      <article className="mx-auto max-w-4xl overflow-hidden rounded-[1.75rem] bg-surface shadow-lift ring-1 ring-ink-200/70">
        <header className="flex items-center justify-between gap-4 bg-ink-900 px-6 py-4 text-white sm:px-8">
          <div className="[&_span]:text-white">
            <Logo size={26} />
          </div>
          <div className="text-right">
            <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-sun-400 uppercase">Paspor Baterai</p>
            <p className="num text-xs text-ink-300">{nomor}</p>
          </div>
        </header>

        {/* Identitas & grade */}
        <section className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="min-w-0">
            <p className="num text-3xl font-semibold tracking-tight">{b.kode}</p>
            <p className="mt-1 text-ink-700">
              {b.merek} {b.model} · {b.jenisKimia}
            </p>
            <p className="mt-0.5 text-sm text-ink-500">{tanpaPenandaIlustrasi(b.pemasok.namaPerusahaan)}</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl p-3 pr-5" style={{ background: `${tone.hex}12`, boxShadow: `inset 0 0 0 1px ${tone.hex}33` }}>
            <GradeBadge grade={g} size="lg" />
            <div>
              <p className="text-xs text-ink-500">Grade {g}</p>
              <p className={`font-semibold ${tone.text}`}>{tone.label}</p>
              <p className="text-sm text-ink-700">{h.keputusan}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 border-b border-ink-100 p-6 sm:grid-cols-2 sm:p-8">
          <div>
            <p className="text-xs text-ink-500">Perkiraan sisa siklus</p>
            <p className="num mt-1 text-2xl">{siklusText}</p>
            {siklusTengah !== null && <p className="mt-1 text-sm text-ink-600">Paling mungkin {num(siklusTengah, 0)} siklus</p>}
            <p className="mt-1 text-xs text-ink-500">Dari model; bukan tanggal kerusakan.</p>
          </div>
          <div>
            <p className="text-xs text-ink-500">Perkiraan penggantian</p>
            <p className="num mt-1 text-2xl">{bulan !== null ? `± ${bulan} bulan` : "Belum dapat diperkirakan"}</p>
            {bulan !== null && <p className="mt-1 text-xs text-ink-500">Asumsi 1 siklus/hari (30 siklus per bulan).</p>}
          </div>
        </section>

        {hasilPerluDicek && (
          <Notice tone="warning" className="mx-6 my-6 sm:mx-8" title="Hasil perlu dicek ulang">
            Nilai sisa siklus dari model perlu diverifikasi terhadap grade dan data uji baterai.
          </Notice>
        )}

        {h.jalur_daur_ulang && (
          <p className="mx-6 mb-6 flex items-center gap-2 rounded-xl bg-flame-50 px-4 py-3 text-sm font-medium text-flame-600 ring-1 ring-flame-100 sm:mx-8">
            <Recycle className="size-4 shrink-0" /> Baterai ini diarahkan ke jalur daur ulang dan tidak dipasang ulang.
          </p>
        )}

        {/* Hasil utama */}
        <section className="grid grid-cols-2 border-y border-ink-100">
          <Hasil icon={<Gauge className="size-3.5" />} label="Kesehatan (SoH)">
            <p className="num text-3xl">
              {num(h.soh)}
              <span className="text-base text-ink-400">%</span>
            </p>
            <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${soh.cls}`}>
              <span className={`size-1.5 rounded-full ${soh.dot}`} /> {soh.label}
            </span>
          </Hasil>
          <Hasil icon={<ShieldCheck className="size-3.5" />} label="Keyakinan" className="border-l border-ink-100">
            <p className="num text-3xl">
              {num(h.keyakinan, 0)}
              <span className="text-base text-ink-400">%</span>
            </p>
          </Hasil>
        </section>

        {/* Data pendukung */}
        <section className="grid gap-x-10 gap-y-6 p-6 text-sm sm:grid-cols-2 sm:p-8">
          <Daftar
            judul="Spesifikasi"
            items={[
              ["Kapasitas awal", `${num(b.kapasitasAwalKwh)} kWh`],
              ["Kapasitas sehat", `${num((b.kapasitasAwalKwh * h.soh) / 100)} kWh`],
              ["Tegangan nominal", b.teganganNominalV ? `${num(b.teganganNominalV)} V` : "—"],
              ["Usia pemakaian", b.usiaTahun !== null ? `${num(b.usiaTahun)} tahun` : "—"],
            ]}
          />
          <Daftar
            judul="Penilaian"
            items={penilaianItems}
          />
        </section>

        <footer className="border-t border-ink-100 px-6 py-4 text-xs text-ink-500 sm:px-8">
          Hasil ini estimasi berdasarkan data uji yang dimasukkan, bukan sertifikasi.
        </footer>
      </article>

      <p className="mx-auto mt-4 max-w-4xl text-sm print:hidden">
        <Link href={`/baterai/${b.id}`} className="font-semibold text-ink-700 hover:underline">
          Lihat detail baterai & riwayat SoH →
        </Link>
      </p>
    </>
  );
}

function Hasil({ icon, label, className, children }: { icon: React.ReactNode; label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("p-5 sm:p-6", className)}>
      <p className="mb-2 flex items-center gap-1.5 text-xs text-ink-500">
        {icon} {label}
      </p>
      {children}
    </div>
  );
}

function Daftar({ judul, items }: { judul: string; items: [string, React.ReactNode][] }) {
  return (
    <div>
      <p className="eyebrow mb-2">{judul}</p>
      <dl className="divide-y divide-ink-100">
        {items.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4 py-2">
            <dt className="text-ink-500">{k}</dt>
            <dd className="num text-right font-medium text-ink-900">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
