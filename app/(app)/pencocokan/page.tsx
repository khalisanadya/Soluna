import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, CircleHelp, Recycle, SunMedium, Wrench } from "lucide-react";
import { Badge, ButtonLink, Card, Disclaimer, EmptyState, GradeBadge, IlustrasiTag, Notice, PageHeader, SectionTitle, Stat, buttonClass, inputClass } from "@/components/ui";
import { cocokkanBaterai } from "@/lib/analisis";
import { requireAdmin } from "@/lib/auth";
import { cn, num, tanggal } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { HasilRencana, StatusCocok } from "@/lib/types";

export const metadata: Metadata = { title: "Pencocokan Baterai" };

const STATUS: Record<StatusCocok, { tone: "leaf" | "amber" | "flame" | "neutral" }> = {
  direkomendasikan: { tone: "leaf" },
  perlu_penyesuaian: { tone: "amber" },
  tidak_direkomendasikan: { tone: "flame" },
  belum_dinilai: { tone: "neutral" },
};

export default async function PencocokanPage({ searchParams }: PageProps<"/pencocokan">) {
  await requireAdmin();
  const sp = await searchParams;
  const rencana = await prisma.rencanaDesa.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, nama: true, namaDesa: true, hasil: true, createdAt: true, ilustrasi: true },
  });

  const header = (
    <PageHeader
      eyebrow="Baterai · Pencocokan"
      title="Pencocokan baterai"
      description="Bandingkan baterai yang tersedia dengan kebutuhan satu rencana desa. Status disusun dari grade, ambang penggantian, daya puncak, dan hasil pemeriksaan kompatibilitas."
    />
  );

  if (!rencana.length) {
    return (
      <>
        {header}
        <EmptyState
          icon={<SunMedium className="size-5" />}
          title="Belum ada rencana desa"
          description="Pencocokan membutuhkan kebutuhan energi malam, batas pengosongan, dan hari cadangan dari sebuah rencana."
          action={<ButtonLink href="/perencana">Buat rencana desa</ButtonLink>}
        />
      </>
    );
  }

  const terpilih = rencana.find((r) => r.id === sp.rencana) ?? rencana[0];
  const hasil = terpilih.hasil as unknown as HasilRencana;
  const { res, kompat } = await cocokkanBaterai(hasil);
  const detail = new Map(
    (
      await prisma.baterai.findMany({
        select: {
          id: true,
          merek: true,
          model: true,
          kapasitasAwalKwh: true,
          sohTerakhir: true,
          gradeTerakhir: true,
          pemasok: { select: { namaPerusahaan: true } },
          // Paspor = penilaian terakhir (rute yang sama dengan halaman Penilaian: /penilaian/[id]).
          penilaian: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true } },
        },
      })
    ).map((b) => [b.id, b]),
  );

  return (
    <>
      {header}

      <Card className="mb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <form className="flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="mb-1.5 block text-sm font-medium text-ink-800">Rencana desa</span>
              <select name="rencana" defaultValue={terpilih.id} className={inputClass}>
                {rencana.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.namaDesa} — {r.nama} ({tanggal(r.createdAt)})
                  </option>
                ))}
              </select>
            </label>
            <button className={buttonClass("dark", "md")}>Cocokkan</button>
          </form>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            {[
              ["Kebutuhan malam", `${num(hasil.ringkasan.kebutuhan_malam_kwh)} kWh`],
              ["Daya puncak", `${num(hasil.ringkasan.daya_puncak_kw)} kW`],
              ["Batas pengosongan", `${num(hasil.parameter.dod * 100, 0)}%`],
              ["Hari cadangan", `${hasil.parameter.hari_cadangan} hari`],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-ink-500">{k}</dt>
                <dd className="num font-semibold text-ink-900">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-500">
          Kebutuhan diambil dari hasil perhitungan rencana{" "}
          <Link href={`/perencana/${terpilih.id}`} className="font-medium text-ink-700 underline-offset-2 hover:underline">
            {terpilih.namaDesa} — {terpilih.nama}
          </Link>
          {terpilih.ilustrasi && <IlustrasiTag />}
        </p>
      </Card>

      {!res.ok ? (
        <Notice tone="danger" title="Pencocokan belum dapat dihitung">
          {res.error}
        </Notice>
      ) : res.data.baterai.length === 0 ? (
        <EmptyState title="Belum ada baterai" description="Baterai yang didaftarkan pemasok akan muncul di sini." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Stat label="Direkomendasikan" value={res.data.ringkasan.direkomendasikan} icon={<CheckCircle2 className="size-4" />} accent="leaf" />
            <Stat label="Perlu penyesuaian" value={res.data.ringkasan.perlu_penyesuaian} icon={<Wrench className="size-4" />} accent="sun" />
            <Stat label="Tidak direkomendasikan" value={res.data.ringkasan.tidak_direkomendasikan} icon={<Recycle className="size-4" />} accent="flame" />
            <Stat label="Belum dinilai" value={res.data.ringkasan.belum_dinilai} icon={<CircleHelp className="size-4" />} accent="ink" href="/penilaian" />
          </div>

          <Card className="mt-4 p-0 sm:p-0">
            <div className="p-5 pb-0 sm:p-6 sm:pb-0">
              <SectionTitle title="Hasil pencocokan" hint="Diurutkan dari status terbaik, lalu jumlah paket paling sedikit" />
            </div>
            <ul className="divide-y divide-ink-100">
              {res.data.baterai.map((r) => {
                const b = detail.get(r.id);
                const k = kompat.get(r.id);
                return (
                  <li key={r.id} className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_auto]">
                    <div className="flex items-start gap-3">
                      <GradeBadge grade={r.status === "belum_dinilai" ? null : b?.gradeTerakhir} />
                      <div className="min-w-0">
                        <Link href={`/baterai/${r.id}`} className="num font-semibold hover:underline">
                          {r.kode}
                        </Link>
                        <p className="truncate text-sm text-ink-600">
                          {b?.merek} {b?.model}
                        </p>
                        <p className="truncate text-xs text-ink-500">{b?.pemasok.namaPerusahaan}</p>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={STATUS[r.status].tone}>{r.label}</Badge>
                        {r.keputusan && <span className="text-xs text-ink-500">{r.keputusan}</span>}
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                        <Kv k="Kapasitas nominal" v={`${num(b?.kapasitasAwalKwh)} kWh`} />
                        <Kv k="SoH" v={r.status === "belum_dinilai" ? "—" : `${num(b?.sohTerakhir)}%`} />
                        <Kv k="Terpakai per paket" v={r.kapasitas_terpakai_kwh === null ? "—" : `${num(r.kapasitas_terpakai_kwh)} kWh`} />
                        <Kv k="Paket dibutuhkan" v={r.jumlah_paket === null ? "—" : `${r.jumlah_paket} paket`} />
                      </dl>
                      <ul className="mt-3 space-y-1 text-sm text-ink-700">
                        {r.alasan.map((a) => (
                          <li key={a} className="flex gap-2">
                            <span className="mt-2 size-1 shrink-0 rounded-full bg-ink-400" aria-hidden="true" />
                            {a}
                          </li>
                        ))}
                      </ul>
                      {k && <p className="mt-2 text-xs text-ink-500">Pemeriksaan kompatibilitas terakhir: {tanggal(k.waktu)}</p>}
                    </div>

                    <div className="flex flex-wrap gap-2 lg:flex-col lg:items-stretch">
                      {r.status === "belum_dinilai" ? (
                        <Link href={`/penilaian/baru?baterai=${r.id}`} className={buttonClass("primary", "sm")}>
                          Nilai baterai
                        </Link>
                      ) : r.daur_ulang ? (
                        <Link href="/siklus-hidup" className={buttonClass("secondary", "sm")}>
                          Jalur daur ulang
                        </Link>
                      ) : (
                        <Link href={`/kompatibilitas?baterai=${r.id}&rencana=${terpilih.id}`} className={buttonClass(k ? "secondary" : "primary", "sm")}>
                          {k ? "Periksa ulang" : "Cek kompatibilitas"}
                        </Link>
                      )}
                      {b?.penilaian[0] && (
                        <Link href={`/penilaian/${b.penilaian[0].id}`} className={cn(buttonClass("ghost", "sm"))}>
                          Paspor
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
          <p className="mt-3 text-xs text-ink-500">{res.data.catatan}</p>
          <Disclaimer className="mt-4" />
        </>
      )}
    </>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-500">{k}</dt>
      <dd className="num font-medium text-ink-900">{v}</dd>
    </div>
  );
}
