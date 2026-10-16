import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Info, Recycle, TrendingDown, TrendingUp } from "lucide-react";
import { TrendLine } from "@/components/charts";
import { Paginasi, potong } from "@/components/paginasi";
import { Badge, Card, Disclaimer, EmptyState, GradeBadge, Notice, PageHeader, SohBadge } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getActiveConfig } from "@/lib/config";
import { analisisSiklus, bateraiDinilaiUntukSiklus } from "@/lib/analisis";
import { bulanTahun, cn, num, tanggal } from "@/lib/format";
import type { HasilSiklus, StatusSiklus } from "@/lib/types";
import { PantauFilter } from "./pantau-filter";

export const metadata: Metadata = { title: "Pemantauan Baterai" };

type Baris = HasilSiklus["baterai"][number];
type DataBaterai = Awaited<ReturnType<typeof bateraiDinilaiUntukSiklus>>[number];
type Filter = "daur_ulang" | "perhatian" | "normal";

const STATUS: Record<StatusSiklus, { label: string; tone: "flame" | "amber" | "leaf" | "neutral"; urut: number }> = {
  daur_ulang: { label: "Daur ulang", tone: "flame", urut: 0 },
  perhatian: { label: "Perlu perhatian", tone: "amber", urut: 1 },
  normal: { label: "Normal", tone: "leaf", urut: 2 },
  belum_dinilai: { label: "Belum dinilai", tone: "neutral", urut: 3 },
};

const SARAN: Record<StatusSiklus, { teks: string; cls: string; icon: React.ReactNode }> = {
  daur_ulang: { teks: "Arahkan ke daur ulang. Jangan dipasang ulang.", cls: "bg-flame-50 text-flame-700 ring-flame-100", icon: <Recycle className="size-4 shrink-0" /> },
  perhatian: { teks: "Siapkan baterai pengganti.", cls: "bg-amber-50 text-amber-700 ring-amber-100", icon: <AlertTriangle className="size-4 shrink-0" /> },
  normal: { teks: "Aman. Ukur ulang SoH tiap 3–6 bulan.", cls: "bg-leaf-50 text-leaf-700 ring-leaf-100", icon: <CheckCircle2 className="size-4 shrink-0" /> },
  belum_dinilai: { teks: "Belum dinilai.", cls: "bg-ink-50 text-ink-600 ring-ink-100", icon: <Info className="size-4 shrink-0" /> },
};

/** Paling mendesak dulu: status, lalu sisa waktu terpendek. */
function urutkan(a: Baris, b: Baris) {
  return STATUS[a.status].urut - STATUS[b.status].urut || (a.sisa_tahun ?? Infinity) - (b.sisa_tahun ?? Infinity);
}

function sisaWaktu(r: Baris) {
  if (r.status === "daur_ulang") return "Sekarang";
  if (r.sisa_tahun === null) return "—";
  if (r.sisa_tahun < 1) return `± ${Math.max(1, Math.round(r.sisa_tahun * 12))} bulan lagi`;
  return `± ${num(r.sisa_tahun, 1)} tahun lagi`;
}

export default async function PemantauanPage({ searchParams }: PageProps<"/siklus-hidup">) {
  await requireAdmin();
  const sp = await searchParams;
  const [baterai, { data: cfg }] = await Promise.all([bateraiDinilaiUntukSiklus(), getActiveConfig()]);
  const res = await analisisSiklus(baterai);
  const byId = new Map(baterai.map((b) => [b.id, b]));
  const sc = cfg.siklus_hidup;
  const ambang = sc.ambang_penggantian_soh;

  const header = (
    <PageHeader
      eyebrow="Baterai"
      title="Pemantauan baterai"
      description="Pantau kesehatan baterai yang sudah dinilai: mana yang masih aman, mana yang perlu disiapkan penggantinya, dan mana yang harus didaur ulang."
    />
  );

  if (!res.ok) {
    return (
      <>
        {header}
        <Notice tone="danger" title="Data pemantauan tidak dapat dihitung">
          {res.error}
        </Notice>
      </>
    );
  }
  if (baterai.length === 0) {
    return (
      <>
        {header}
        <EmptyState title="Belum ada baterai yang dinilai" description="Baterai muncul di sini setelah pemasok menilainya dan menerbitkan paspor." />
      </>
    );
  }

  const filter: Filter | "" = sp.status === "daur_ulang" || sp.status === "perhatian" || sp.status === "normal" ? sp.status : "";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const cari = q.toLowerCase();
  const urut = typeof sp.urut === "string" ? sp.urut : "";
  const semua = [...res.data.baterai].sort(urutkan);
  const cocok = (r: Baris) => {
    if (!cari) return true;
    const b = byId.get(r.id);
    return [r.kode, b?.merek, b?.model, b?.pemasok?.namaPerusahaan].some((x) => x?.toLowerCase().includes(cari));
  };
  const tersaring = semua.filter((r) => (!filter || r.status === filter) && cocok(r));
  if (urut === "soh") tersaring.sort((a, b) => (a.soh ?? Infinity) - (b.soh ?? Infinity));
  else if (urut === "ganti") tersaring.sort((a, b) => (a.jadwal_penggantian ?? "9999").localeCompare(b.jadwal_penggantian ?? "9999"));
  else if (urut === "kode") tersaring.sort((a, b) => a.kode.localeCompare(b.kode));
  const hal = potong(tersaring, sp);
  // Dipilih dari daftar (?baterai=), atau baris pertama halaman ini sebagai bawaan di layar lebar.
  const dipilih = typeof sp.baterai === "string" && byId.has(sp.baterai) ? sp.baterai : undefined;
  const pilihId = dipilih ?? hal.rows[0]?.id;
  const pilih = pilihId ? semua.find((r) => r.id === pilihId) : undefined;
  const pilihData = pilihId ? byId.get(pilihId) : undefined;

  const href = (ubah: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const nilai = { status: filter || undefined, q: q || undefined, urut: urut || undefined, page: typeof sp.page === "string" ? sp.page : undefined, baterai: pilihId, ...ubah };
    for (const [k, v] of Object.entries(nilai)) if (v) p.set(k, v);
    const s = p.toString();
    return `/siklus-hidup${s ? `?${s}` : ""}`;
  };

  // Jumlah per status mengikuti pencarian, agar angka di kartu sama dengan isi daftar.
  const hitung = (k: Filter) => semua.filter((r) => r.status === k && cocok(r)).length;
  const pilihan: { k: Filter | ""; label: string; titik: string; jumlah: number }[] = [
    { k: "", label: "Semua", titik: "bg-ink-400", jumlah: semua.filter(cocok).length },
    { k: "daur_ulang", label: "Daur ulang", titik: "bg-flame-500", jumlah: hitung("daur_ulang") },
    { k: "perhatian", label: "Siapkan pengganti", titik: "bg-amber-500", jumlah: hitung("perhatian") },
    { k: "normal", label: "Aman", titik: "bg-leaf-500", jumlah: hitung("normal") },
  ];

  const detail = (className: string) =>
    pilih && pilihData ? <Detail pilih={pilih} data={pilihData} ambang={ambang} peringatanSoh={ambang + sc.margin_peringatan_soh} className={className} /> : null;

  return (
    <>
      {header}

      {/* Ringkasan status, sekaligus filter */}
      <nav className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Filter status">
        {pilihan.map((c) => {
          const aktif = filter === c.k;
          return (
            <Link
              key={c.k || "semua"}
              href={href({ status: c.k || undefined, baterai: undefined, page: undefined })}
              aria-current={aktif ? "true" : undefined}
              className={cn("rounded-2xl px-4 py-3 ring-1 transition-colors", aktif ? "bg-ink-900 text-white ring-ink-900" : "bg-surface ring-ink-200/60 hover:bg-ink-50")}
            >
              <span className={cn("flex items-center gap-2 text-xs font-medium", aktif ? "text-ink-300" : "text-ink-500")}>
                <span className={cn("size-2 rounded-full", c.titik)} aria-hidden="true" />
                {c.label}
              </span>
              <span className="num mt-1 block text-2xl font-semibold">{c.jumlah}</span>
            </Link>
          );
        })}
      </nav>
      <p className="mt-2 text-xs text-ink-500">
        Daur ulang: SoH &lt; {num(ambang)}% atau grade D · Siapkan pengganti: SoH ≤ {num(ambang + sc.margin_peringatan_soh)}% atau sisa &lt;{" "}
        {num(sc.batas_sisa_umur_tahun)} th
      </p>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Daftar baterai */}
        <Card className="!p-0">
          <div className="border-b border-ink-100 p-3">
            <PantauFilter />
          </div>
          {hal.rows.length ? (
            <>
              <div className="hidden grid-cols-[minmax(0,1fr)_7.5rem_4.5rem] gap-3 border-b border-ink-100 bg-ink-50/60 py-2 pr-4 pl-[1.1875rem] text-[0.7rem] font-medium tracking-wide text-ink-500 uppercase sm:grid">
                <span>Baterai</span>
                <span>Ganti</span>
                <span className="text-right">SoH</span>
              </div>
              <ul className="divide-y divide-ink-100">
                {hal.rows.map((r) => {
                  const b = byId.get(r.id)!;
                  const aktif = r.id === pilihId;
                  return (
                    <li key={r.id}>
                      <Link
                        href={href({ baterai: r.id })}
                        scroll={false}
                        aria-current={aktif ? "true" : undefined}
                        className={cn(
                          "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-l-[3px] px-4 py-2.5 transition-colors sm:grid-cols-[minmax(0,1fr)_7.5rem_4.5rem]",
                          aktif ? "border-sun-500 bg-sun-50" : "border-transparent hover:bg-ink-50",
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <GradeBadge grade={b.gradeTerakhir} size="sm" />
                          <span className="min-w-0">
                            <span className="flex items-center gap-2">
                              <span className="num text-sm font-semibold text-ink-900">{r.kode}</span>
                              <span className="truncate text-xs text-ink-500">
                                {b.merek} {b.model}
                              </span>
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-ink-500">
                              <span className={cn("size-1.5 shrink-0 rounded-full", pilihan.find((p) => p.k === r.status)?.titik ?? "bg-ink-300")} aria-hidden="true" />
                              <span className="truncate">
                                {STATUS[r.status].label}
                                <span className="sm:hidden"> · ganti {sisaWaktu(r).toLowerCase()}</span>
                                {b.pemasok && <span className="hidden md:inline"> · {b.pemasok.namaPerusahaan}</span>}
                              </span>
                            </span>
                          </span>
                        </span>
                        <span className={cn("hidden text-xs sm:block", r.status === "daur_ulang" ? "font-semibold text-flame-600" : "text-ink-700")}>{sisaWaktu(r)}</span>
                        <span className="justify-self-end">
                          <SohBadge soh={r.soh} tinggi={cfg.grade.A} rendah={cfg.grade.C} />
                        </span>
                      </Link>
                      {/* Ponsel/tablet: detail terbuka tepat di bawah baris yang diklik. */}
                      {aktif && dipilih && <div className="border-t border-sun-100 bg-sun-50/40 p-3 lg:hidden">{detail("!shadow-none")}</div>}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <EmptyState
              title={cari ? "Tidak ada baterai yang cocok" : "Tidak ada baterai dengan status ini"}
              description={cari ? `Pencarian "${q}" tidak ditemukan.` : undefined}
              className="m-4 py-8"
            />
          )}
          <div className="border-t border-ink-100 px-4 pb-3">
            <Paginasi basePath="/siklus-hidup" sp={sp} halaman={hal.halaman} total={tersaring.length} tampil={hal.rows.length} satuan="baterai" />
          </div>
        </Card>

        {/* Layar lebar: detail menempel saat digulir, dan dapat digulir sendiri bila isinya panjang. */}
        {detail("hidden lg:sticky lg:top-6 lg:block lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto")}
      </div>

      <Disclaimer className="mt-6" />
    </>
  );
}

function Detail({ pilih, data, ambang, peringatanSoh, className }: { pilih: Baris; data: DataBaterai; ambang: number; peringatanSoh: number; className?: string }) {
  const bacaan = [...data.bacaanSoh].reverse();
  return (
    <Card className={cn("!p-0", className)}>
      <div className="flex items-center gap-3 p-4">
        <GradeBadge grade={data.gradeTerakhir} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2">
            <span className="num font-bold text-ink-950">{pilih.kode}</span>
            <Badge tone={STATUS[pilih.status].tone}>{STATUS[pilih.status].label}</Badge>
          </p>
          <p className="truncate text-xs text-ink-500">
            {data.merek} {data.model} · {data.jenisKimia}
            {data.pemasok && ` · ${data.pemasok.namaPerusahaan}`}
          </p>
        </div>
        <Link href={`/baterai/${pilih.id}`} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-sun-700 hover:underline">
          Detail <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <dl className="grid grid-cols-3 divide-x divide-ink-100 border-y border-ink-100 text-center">
        <div className="px-2 py-2.5">
          <dt className="text-[0.68rem] text-ink-500">SoH</dt>
          <dd className="num text-base font-semibold text-ink-950">{num(pilih.soh)}%</dd>
        </div>
        <div className="px-2 py-2.5">
          <dt className="text-[0.68rem] text-ink-500">Tren/tahun</dt>
          <dd className={cn("num flex items-center justify-center gap-1 text-base font-semibold", (pilih.tren_per_tahun ?? 0) < 0 ? "text-flame-600" : "text-ink-950")}>
            {pilih.tren_per_tahun === null ? (
              "—"
            ) : (
              <>
                {pilih.tren_per_tahun < 0 ? <TrendingDown className="size-3.5" /> : <TrendingUp className="size-3.5" />}
                {num(Math.abs(pilih.tren_per_tahun), 1)}%
              </>
            )}
          </dd>
        </div>
        <div className="px-2 py-2.5">
          <dt className="text-[0.68rem] text-ink-500">Ganti</dt>
          <dd className="text-sm font-semibold text-ink-950">{pilih.status === "daur_ulang" ? "Sekarang" : bulanTahun(pilih.jadwal_penggantian)}</dd>
        </div>
      </dl>

      <div className="space-y-4 p-4">
        <div className={cn("rounded-xl p-2.5 text-xs ring-1", SARAN[pilih.status].cls)}>
          <p className="flex items-center gap-2 font-semibold">
            {SARAN[pilih.status].icon} {SARAN[pilih.status].teks}
          </p>
          {pilih.status === "perhatian" && pilih.peringatan.length > 0 && (
            <ul className="mt-1 list-disc space-y-0.5 pl-10">
              {pilih.peringatan.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="mb-1 flex items-baseline justify-between text-xs">
            <span className="font-semibold text-ink-900">Tren SoH</span>
            <span className="text-ink-400">garis merah = batas ganti {num(ambang)}%</span>
          </p>
          {data.bacaanSoh.length >= 2 ? (
            <TrendLine points={data.bacaanSoh.map((r) => ({ x: r.tanggal.toISOString(), y: r.soh }))} threshold={ambang} warn={peringatanSoh} height={130} />
          ) : (
            <p className="flex items-start gap-2 rounded-xl bg-ink-50 p-2.5 text-xs text-ink-600">
              <Info className="mt-px size-3.5 shrink-0" /> Grafik tren muncul setelah ada minimal 2 pengukuran.
            </p>
          )}
        </div>

        {bacaan.length > 0 && (
          <div>
            <p className="mb-1.5 flex items-baseline justify-between text-xs">
              <span className="font-semibold text-ink-900">Riwayat pengukuran</span>
              <span className="num text-ink-400">{bacaan.length} catatan</span>
            </p>
            {/* Semua pengukuran; digulir sendiri bila panjang. */}
            <ul className="max-h-48 divide-y divide-ink-100 overflow-y-auto rounded-xl ring-1 ring-ink-100">
              {bacaan.map((r) => (
                <li key={r.id} className="grid grid-cols-[1fr_auto_3.5rem] items-center gap-3 px-3 py-1.5 text-xs">
                  <span className="text-ink-600">{tanggal(r.tanggal)}</span>
                  <span className="text-ink-400">{r.sumber === "PENILAIAN" ? "Penilaian" : "Pengukuran berkala"}</span>
                  <span className="num text-right font-semibold text-ink-900">{num(r.soh)}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
