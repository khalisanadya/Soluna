import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CheckCircle2, Plus, SunMedium } from "lucide-react";
import { pilihBateraiRencana } from "@/app/actions/pencocokan";
import { SubmitButton } from "@/components/submit-button";
import { Badge, ButtonLink, Card, Disclaimer, EmptyState, GradeBadge, IlustrasiTag, Notice, PageHeader, SectionTitle, buttonClass } from "@/components/ui";
import { Paginasi, potong } from "@/components/paginasi";
import { cocokkanBaterai } from "@/lib/analisis";
import { requireAdmin } from "@/lib/auth";
import { cn, num, tanggal } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { HasilRencana, StatusCocok } from "@/lib/types";
import { PencocokanFilter } from "./filter";

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
    select: { id: true, nama: true, namaDesa: true, hasil: true, createdAt: true, ilustrasi: true, bateraiIds: true },
  });

  const header = (
    <PageHeader
      eyebrow="Baterai"
      title="Pencocokan baterai"
      description="Bandingkan baterai yang tersedia dengan kebutuhan satu rencana desa."
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
          action={<ButtonLink href="/perencana/baru">Buat rencana desa</ButtonLink>}
        />
      </>
    );
  }

  const terpilih = rencana.find((r) => r.id === sp.rencana);
  const pilihanRencana = rencana.map((r) => ({ id: r.id, label: `${r.namaDesa} — ${r.nama} · ${tanggal(r.createdAt)}` }));
  if (!terpilih) {
    return (
      <>
        {header}
        <Suspense fallback={<div className="mb-4 h-24 rounded-[var(--radius-card)] bg-surface ring-1 ring-ink-200/60" />}>
          <PencocokanFilter rencana={pilihanRencana} terpilihId="" jumlah={null} saran={{ kode: [], merek: [], pemasok: [] }} />
        </Suspense>
        <EmptyState
          icon={<SunMedium className="size-5" />}
          title="Pilih rencana desa"
          description="Pilih rencana desa di atas untuk melihat baterai mana yang cocok dengan kebutuhannya."
        />
      </>
    );
  }
  const hasil = terpilih.hasil as unknown as HasilRencana;
  const { res, kompat } = await cocokkanBaterai(hasil);
  const detail = new Map(
    (
      await prisma.baterai.findMany({
        select: {
          id: true,
          kode: true,
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

  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const q = str("q").toLowerCase();
  const grade = ["A", "B", "C", "D"].includes(str("grade")) ? str("grade") : "";
  const status = str("status") as StatusCocok | "";
  const semua = res.ok ? res.data.baterai : [];
  // Jumlah per status mengikuti filter grade dan pencarian yang sedang aktif.
  const dasar = semua.filter((r) => {
    const b = detail.get(r.id);
    if (grade && (r.status === "belum_dinilai" || b?.gradeTerakhir !== grade)) return false;
    if (q && ![r.kode, b?.merek, b?.model, b ? `${b.merek} ${b.model}` : undefined, b?.pemasok.namaPerusahaan].some((x) => x?.toLowerCase().includes(q))) return false;
    return true;
  });
  const jumlah = {
    semua: dasar.length,
    direkomendasikan: 0,
    perlu_penyesuaian: 0,
    tidak_direkomendasikan: 0,
    belum_dinilai: 0,
  } satisfies Record<StatusCocok | "semua", number>;
  for (const r of dasar) jumlah[r.status]++;
  const tersaring = status && status in jumlah ? dasar.filter((r) => r.status === status) : dasar;
  const hal = potong(tersaring, sp);
  const dipilih = new Set(terpilih.bateraiIds);
  const dipilihList = semua.filter((r) => dipilih.has(r.id));
  const kwhDipilih = dipilihList.reduce((n, r) => n + (detail.get(r.id)?.kapasitasAwalKwh ?? 0), 0);

  return (
    <>
      {header}

      <Suspense fallback={<div className="mb-4 h-[14rem] rounded-[var(--radius-card)] bg-surface ring-1 ring-ink-200/60" />}>
        <PencocokanFilter
          rencana={pilihanRencana}
          terpilihId={terpilih.id}
          jumlah={jumlah}
          saran={{
            kode: [...new Set([...detail.values()].map((b) => b.kode))].sort(),
            merek: [...new Set([...detail.values()].map((b) => `${b.merek} ${b.model}`))].sort((a, b) => a.localeCompare(b, "id")),
            pemasok: [...new Set([...detail.values()].map((b) => b.pemasok.namaPerusahaan))].sort((a, b) => a.localeCompare(b, "id")),
          }}
        />
      </Suspense>

      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl bg-ink-50 px-4 py-3 text-sm ring-1 ring-ink-100">
        <span className="flex items-center gap-2 text-xs text-ink-500">
          Kebutuhan rencana
          <Link href={`/perencana/${terpilih.id}`} className="font-medium text-ink-700 hover:underline">
            {terpilih.namaDesa}
          </Link>
          {terpilih.ilustrasi && <IlustrasiTag />}
        </span>
        {[
          ["Kebutuhan malam", `${num(hasil.ringkasan.kebutuhan_malam_kwh)} kWh`],
          ["Daya puncak", `${num(hasil.ringkasan.daya_puncak_kw)} kW`],
          ["Batas pengosongan", `${num(hasil.parameter.dod * 100, 0)}%`],
          ["Hari cadangan", `${hasil.parameter.hari_cadangan} hari`],
        ].map(([k, v]) => (
          <span key={k}>
            <span className="text-ink-500">{k}</span> <span className="num font-semibold text-ink-900">{v}</span>
          </span>
        ))}
      </div>

      <div
        className={cn(
          "mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm ring-1",
          dipilihList.length ? "bg-leaf-50 text-leaf-800 ring-leaf-100" : "bg-sun-50 text-sun-800 ring-sun-100",
        )}
      >
        <span className="flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0" />
          {dipilihList.length ? (
            <>
              <span>
                <span className="font-semibold">{dipilihList.length} baterai dipilih</span> untuk {terpilih.namaDesa} · total{" "}
                <span className="num font-semibold">{num(kwhDipilih)} kWh</span>
              </span>
            </>
          ) : (
            <span>
              Belum ada baterai dipilih. Tekan <span className="font-semibold">Pilih untuk desa ini</span> pada baterai yang cocok.
            </span>
          )}
        </span>
        {dipilihList.length > 0 && (
          <span className="flex flex-wrap gap-1.5">
            {dipilihList.map((r) => (
              <span key={r.id} className="num rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-leaf-700 ring-1 ring-leaf-200">
                {r.kode}
              </span>
            ))}
          </span>
        )}
      </div>

      {!res.ok ? (
        <Notice tone="danger" title="Pencocokan belum dapat dihitung">
          {res.error}
        </Notice>
      ) : semua.length === 0 ? (
        <EmptyState title="Belum ada baterai" description="Baterai yang didaftarkan pemasok akan muncul di sini." />
      ) : tersaring.length === 0 ? (
        <EmptyState title="Tidak ada baterai yang cocok" description="Ubah kata kunci, grade, atau status." />
      ) : (
        <>

          <Card className="!p-0">
            <div className="p-5 pb-0 sm:p-6 sm:pb-0">
              <SectionTitle title="Hasil pencocokan" hint="Diurutkan dari status terbaik, lalu jumlah paket paling sedikit" />
            </div>
            <ul className="divide-y divide-ink-100">
              {hal.rows.map((r) => {
                const b = detail.get(r.id);
                const k = kompat.get(r.id);
                const sudahDipilih = dipilih.has(r.id);
                const bisaDipilih = r.status === "direkomendasikan" || r.status === "perlu_penyesuaian";
                return (
                  <li key={r.id} className={cn("grid gap-4 p-5 sm:p-6 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_auto]", sudahDipilih && "bg-leaf-50/60")}>
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

                    <div className="flex flex-wrap gap-2 lg:w-44 lg:flex-col lg:items-stretch">
                      {(bisaDipilih || sudahDipilih) && (
                        <form action={pilihBateraiRencana} className="contents">
                          <input type="hidden" name="rencanaId" value={terpilih.id} />
                          <input type="hidden" name="bateraiId" value={r.id} />
                          <SubmitButton size="sm" variant={sudahDipilih ? "secondary" : "primary"} pendingText="Menyimpan…">
                            {sudahDipilih ? (
                              <>
                                <CheckCircle2 className="size-4 text-leaf-600" /> Dipilih · batalkan
                              </>
                            ) : (
                              <>
                                <Plus className="size-4" /> Pilih untuk desa ini
                              </>
                            )}
                          </SubmitButton>
                        </form>
                      )}
                      {r.status === "belum_dinilai" ? (
                        <Link href={`/baterai?q=${encodeURIComponent(b?.kode ?? "")}`} className={buttonClass("secondary", "sm")}>
                          Menunggu assessment pemasok
                        </Link>
                      ) : r.daur_ulang ? (
                        <Link href="/siklus-hidup" className={buttonClass("secondary", "sm")}>
                          Jalur daur ulang
                        </Link>
                      ) : (
                        <Link href={`/kompatibilitas?baterai=${r.id}&rencana=${terpilih.id}`} className={buttonClass("secondary", "sm")}>
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
          <Paginasi basePath="/pencocokan" sp={sp} halaman={hal.halaman} total={tersaring.length} tampil={hal.rows.length} satuan="baterai" />
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
