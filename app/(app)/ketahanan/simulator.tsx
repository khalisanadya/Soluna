"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  BatteryWarning,
  Check,
  ChevronDown,
  CloudRain,
  CloudSun,
  Lightbulb,
  LoaderCircle,
  PauseCircle,
  Pencil,
  PlayCircle,
  Plug,
  Save,
  ShieldCheck,
  Sun,
  TrendingDown,
  Tv,
  X,
} from "lucide-react";
import { saveSimulation, simulateResilience, type InputKetahanan, type SimulasiResult } from "@/app/actions/ketahanan";
import { ChartLegend, ENERGY, HourlyChart } from "@/components/charts";
import { Pilih } from "@/components/filter-kit";
import { Button, Card, Notice, Skeleton } from "@/components/ui";
import { cn, days, num } from "@/lib/format";
import type { LogTindakan, Prioritas, TingkatKey } from "@/lib/types";

export type SimInitial = {
  rencanaId: string | null;
  nama: string;
  beban_harian_kwh: number;
  jumlah_paket: number;
  kapasitas_kwh: number;
  soh: number;
  kapasitas_panel_kwp: number;
  psh_jam: number;
  pr: number;
  efisiensi: number;
  porsi_malam: number;
  /** Tujuan yang dipilih saat rencana dibuat (bila ada). */
  prioritas?: Prioritas;
};

const SCENARIO_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  normal: Sun,
  mendung_panjang: CloudSun,
  hujan_beberapa_hari: CloudRain,
};

const TINGKAT_DOT: Record<string, string> = { kritis: "bg-flame-500", penting: "bg-sun-500", kenyamanan: "bg-sky-500" };
const PILIHAN_ALAT: { k: TingkatKey; judul: string; icon: React.ComponentType<{ className?: string }>; warna: string }[] = [
  { k: "kritis_saja", judul: "Alat penting saja", icon: Lightbulb, warna: "bg-leaf-50 text-leaf-600" },
  { k: "tanpa_kenyamanan", judul: "Tanpa hiburan", icon: Plug, warna: "bg-sun-100 text-sun-700" },
  { k: "penuh", judul: "Semua alat", icon: Tv, warna: "bg-ink-100 text-ink-600" },
];

export function Simulator({
  initial,
  plans,
  skenario,
  defaultPeriode,
}: {
  initial: SimInitial;
  plans: SimInitial[];
  skenario: { kunci: string; label: string; faktor: number }[];
  defaultPeriode: number;
}) {
  const [base, setBase] = useState<SimInitial>(initial);
  const [sk, setSk] = useState("hujan_beberapa_hari");
  const [prioritas, setPrioritas] = useState<Prioritas>(initial.prioritas && initial.prioritas !== "hemat_diesel" ? initial.prioritas : "ketahanan_maksimum");
  const [shed, setShed] = useState(true);
  const [faktor, setFaktor] = useState(100);
  const [periode, setPeriode] = useState(defaultPeriode);
  const [result, setResult] = useState<SimulasiResult | null>(null);
  const [pending, start] = useTransition();
  const reqId = useRef(0);

  const input: InputKetahanan = useMemo(
    () => ({
      beban_harian_kwh: base.beban_harian_kwh,
      jumlah_paket: base.jumlah_paket,
      kapasitas_kwh: base.kapasitas_kwh,
      soh: base.soh,
      kapasitas_panel_kwp: base.kapasitas_panel_kwp,
      psh_jam: base.psh_jam,
      pr: base.pr,
      efisiensi: base.efisiensi,
      porsi_malam: base.porsi_malam,
      prioritas,
      skenario: sk,
      faktor_beban: faktor / 100,
      pelepasan_beban: shed,
      periode_hari: periode,
    }),
    [base, prioritas, sk, faktor, shed, periode],
  );

  // Hitung ulang otomatis setiap kali pilihan berubah (dengan jeda singkat).
  useEffect(() => {
    const id = ++reqId.current;
    const t = setTimeout(() => {
      start(async () => {
        const r = await simulateResilience(input);
        if (id === reqId.current) setResult(r);
      });
    }, 200);
    return () => clearTimeout(t);
  }, [input]);

  const data = result?.ok ? result.data : null;
  const sel = data?.skenario.find((s) => s.kunci === data.terpilih);
  const lama = sel ? (shed ? sel.lama_bertahan_pelepasan_hari : sel.lama_bertahan_hari) : null;
  const cukup = sel ? (shed ? sel.cukup_pelepasan : sel.cukup) : false;
  const jamKurang = sel ? (shed ? sel.jam_genset_pelepasan : sel.jam_genset) : 0;

  const cuacaAktif = skenario.find((s) => s.kunci === sk);
  const POLA = [
    { v: 100, t: "Biasa" },
    { v: 80, t: "Sedikit hemat" },
    { v: 60, t: "Sangat hemat" },
  ];
  const tingkat = data ? [...data.tingkat_beban].reverse() : [];

  return (
    <div className="space-y-4">
      {!base.rencanaId && (
        <Notice tone="info" title="Belum ada rencana desa">
          Simulasi memakai contoh dari laporan. Buat rencana di Perencana Desa untuk menguji desa Anda.
        </Notice>
      )}
      {result && !result.ok && (
        <Notice tone="danger" title="Simulasi gagal">
          {result.error}
        </Notice>
      )}

      {/* Baris 1 · Pengaturan, semuanya dalam satu kartu */}
      <Card className="!p-0">
        <div className="grid divide-y divide-ink-100 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {/* 1 · Rencana */}
          <Bagian n={1} judul="Rencana desa">
            <Pilih
              id="sim-plan"
              aria-label="Rencana desa"
              value={base.rencanaId ?? ""}
              className="h-10 text-sm"
              onChange={(e) => {
                const p = plans.find((x) => x.rencanaId === e.target.value);
                if (p) {
                  setBase(p);
                  if (p.prioritas && p.prioritas !== "hemat_diesel") setPrioritas(p.prioritas);
                }
              }}
            >
              {!base.rencanaId && <option value="">{base.nama}</option>}
              {plans.map((p) => (
                <option key={p.rencanaId} value={p.rencanaId!}>
                  {p.nama}
                </option>
              ))}
            </Pilih>
            <p className="num mt-2 text-xs text-ink-500">
              {num(base.beban_harian_kwh)} kWh/hari · {base.jumlah_paket} paket baterai · panel {num(base.kapasitas_panel_kwp)} kWp
            </p>
            {base.rencanaId ? (
              <Link
                href={`/perencana/${base.rencanaId}/ubah?kembali=ketahanan`}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-sun-700 hover:underline"
              >
                <Pencil className="size-3.5" /> Ubah data rencana
              </Link>
            ) : (
              <Link href="/perencana/baru" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-sun-700 hover:underline">
                Buat rencana desa
              </Link>
            )}
          </Bagian>

          {/* 2 · Cuaca */}
          <Bagian n={2} judul="Cuaca yang diuji">
            <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Cuaca">
              {skenario.map((s) => {
                const I = SCENARIO_ICON[s.kunci] ?? CloudSun;
                const aktif = sk === s.kunci;
                return (
                  <button
                    key={s.kunci}
                    type="button"
                    role="radio"
                    aria-checked={aktif}
                    onClick={() => setSk(s.kunci)}
                    title={`Sinar matahari ${num(s.faktor * 100, 0)}% dari biasa`}
                    className={cn("flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-center ring-1 transition", aktif ? "bg-sun-50 ring-2 ring-sun-400" : "ring-ink-200 hover:bg-ink-50")}
                  >
                    <I className={cn("size-5", aktif ? "text-sun-600" : "text-ink-400")} />
                    <span className="text-xs leading-tight font-medium text-ink-900">{s.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs text-ink-500">Selama</span>
              {[1, 2, 3, 5, 7].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setPeriode(d)}
                  aria-pressed={periode === d}
                  className={cn("h-7 rounded-full px-2.5 text-xs font-medium ring-1 transition", periode === d ? "bg-ink-900 text-white ring-ink-900" : "bg-surface text-ink-700 ring-ink-200 hover:bg-ink-50")}
                >
                  {d} hari
                </button>
              ))}
            </div>
          </Bagian>

          {/* 3 · Kebiasaan warga */}
          <Bagian n={3} judul="Kebiasaan warga">
            <p className="mb-1.5 text-xs text-ink-500">Pemakaian listrik saat cuaca buruk</p>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-ink-100 p-1" role="radiogroup" aria-label="Pemakaian listrik">
              {POLA.map((p) => {
                const aktif = faktor === p.v;
                return (
                  <button
                    key={p.v}
                    type="button"
                    role="radio"
                    aria-checked={aktif}
                    onClick={() => setFaktor(p.v)}
                    className={cn("rounded-lg px-1 py-1.5 text-xs font-medium transition", aktif ? "bg-surface text-ink-950 shadow-soft" : "text-ink-500 hover:text-ink-900")}
                  >
                    {p.t}
                    <span className="num block text-[0.68rem] font-normal text-ink-400">{p.v}%</span>
                  </button>
                );
              })}
            </div>
            {/* Hemat otomatis: tampilan beda jelas antara AKTIF dan MATI */}
            <div className={cn("mt-3 rounded-xl p-3 ring-1 transition-colors", shed ? "bg-leaf-50 ring-leaf-200" : "bg-ink-50 ring-ink-200")}>
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink-900">Hemat otomatis saat baterai menipis</span>
                  <span className={cn("mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold", shed ? "bg-leaf-500 text-white" : "bg-ink-300 text-ink-700")}>
                    {shed ? <Check className="size-3" /> : <X className="size-3" />}
                    {shed ? "AKTIF" : "MATI"}
                  </span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={shed}
                  aria-label="Hemat otomatis saat baterai menipis"
                  onClick={() => setShed((s) => !s)}
                  className={cn("relative h-6 w-11 shrink-0 rounded-full transition", shed ? "bg-leaf-500" : "bg-ink-300")}
                >
                  <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", shed ? "left-[1.375rem]" : "left-0.5")} />
                </button>
              </div>
              {shed && data ? (
                <ul className="mt-3 space-y-1.5 border-t border-leaf-200/70 pt-2.5">
                  {tingkat.map((t) => {
                    const ambang = t.kunci === "kenyamanan" ? data.ambang_pelepasan.kenyamanan : t.kunci === "penting" ? data.ambang_pelepasan.penting : null;
                    return (
                      <li key={t.kunci} className="flex items-start gap-2 text-xs text-ink-600">
                        <span className={cn("mt-1 size-2 shrink-0 rounded-full", TINGKAT_DOT[t.kunci])} aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="font-semibold text-ink-800">{ambang === null ? "Selalu menyala" : `Mati di ${num(ambang * 100, 0)}%`}</span>
                          {" · "}
                          {t.perangkat.join(", ")}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                !shed && <p className="mt-2 text-xs text-ink-500">Semua alat menyala sampai baterai habis.</p>
              )}
            </div>
          </Bagian>
        </div>
      </Card>

      {/* Baris 2 · Hasil */}
      {!data || !sel ? (
        result && !result.ok ? null : <Skeleton className="h-52 rounded-[1.5rem]" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <section className={cn("relative overflow-hidden rounded-[var(--radius-card)] bg-ink-900 p-5 text-white shadow-lift sm:p-6", pending && "opacity-85")}>
            <div className={cn("pointer-events-none absolute -top-24 -right-16 size-64 rounded-full blur-3xl", cukup ? "bg-leaf-500/25" : "bg-sun-500/25")} aria-hidden="true" />
            <div className="relative flex items-start justify-between gap-3">
              <p className="text-xs font-semibold tracking-[0.14em] text-sun-400 uppercase">Hasil simulasi</p>
              <div className="flex items-center gap-2">
                {pending && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs">
                    <LoaderCircle className="size-3.5 animate-spin" /> Menghitung
                  </span>
                )}
                <SimpanTombol input={input} rencanaId={base.rencanaId} nama={`${base.nama} · ${sel.label}`} siap />
              </div>
            </div>
            <p className="relative mt-3 text-sm text-ink-300">
              Saat <span className="font-semibold text-white">{(cuacaAktif?.label ?? sel.label).toLowerCase()}</span> selama{" "}
              <span className="font-semibold text-white">{data.periode_hari} hari</span>, listrik desa bertahan
            </p>
            <p className="relative mt-2 flex items-baseline gap-2">
              <span className="num text-5xl leading-none font-semibold">{lama === null ? "Penuh" : num(lama, 1)}</span>
              {lama !== null && <span className="text-ink-300">hari</span>}
            </p>
            <p className={cn("relative mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", cukup ? "bg-leaf-500/20 text-leaf-200" : "bg-sun-500/20 text-sun-200")}>
              {cukup ? <Check className="size-3.5" /> : <BatteryWarning className="size-3.5" />}
              {cukup ? "Aman sepanjang cuaca buruk" : `Kurang listrik ±${num(jamKurang, 1)} jam`}
            </p>
            <div className="relative mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
              {skenario.map((s) => {
                const h = data.skenario.find((x) => x.kunci === s.kunci);
                const l = h ? (shed ? h.lama_bertahan_pelepasan_hari : h.lama_bertahan_hari) : undefined;
                const ok = h ? (shed ? h.cukup_pelepasan : h.cukup) : undefined;
                return (
                  <button key={s.kunci} type="button" onClick={() => setSk(s.kunci)} className={cn("rounded-xl px-2 py-1.5 text-left transition", sk === s.kunci ? "bg-white/10" : "hover:bg-white/5")}>
                    <span className="block truncate text-[0.7rem] text-ink-400">{s.label}</span>
                    <span className={cn("num text-sm font-semibold", ok ? "text-leaf-300" : "text-sun-300")}>{h ? (l === null ? "Aman" : `${num(l, 1)} hari`) : "…"}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <Card className="!p-4 sm:!p-5">
            <p className="text-sm font-semibold text-ink-900">Perbandingan pola pemakaian</p>
            <p className="mb-4 text-xs text-ink-500">Kalau dari awal warga hanya menyalakan:</p>
            <ul className="space-y-3">
              {PILIHAN_ALAT.map((x) => {
                const v = sel.lama_per_tingkat_hari[x.k];
                const maks = Math.max(data.periode_hari, ...Object.values(sel.lama_per_tingkat_hari).map((y) => y ?? 0));
                return (
                  <li key={x.k} className="flex items-center gap-3">
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", x.warna)}>
                      <x.icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium text-ink-900">{x.judul}</span>
                        <span className="num shrink-0 text-sm font-semibold text-ink-950">{v === null ? "Aman" : days(v)}</span>
                      </span>
                      <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-ink-100">
                        <span className="block h-full rounded-full bg-leaf-500" style={{ width: `${v === null ? 100 : Math.min(100, (v / maks) * 100)}%` }} />
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
            {tingkat.length > 0 && (
              <p className="mt-4 border-t border-ink-100 pt-3 text-xs leading-relaxed text-ink-500">
                <span className="font-medium text-ink-700">Alat penting:</span> {tingkat.filter((t) => t.kunci === "kritis").flatMap((t) => t.perangkat).join(", ")}.{" "}
                <span className="font-medium text-ink-700">Tanpa hiburan</span> = alat penting + {tingkat.filter((t) => t.kunci === "penting").flatMap((t) => t.perangkat).join(", ").toLowerCase()}.{" "}
                <span className="font-medium text-ink-700">Hiburan:</span> {tingkat.filter((t) => t.kunci === "kenyamanan").flatMap((t) => t.perangkat).join(", ").toLowerCase()}.
              </p>
            )}
          </Card>
        </div>
      )}

      {/* Baris 3 · Grafik */}
      {data && sel && (
        <Card className="!p-4 sm:!p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-ink-900">Grafik listrik desa per jam</p>
              <p className="text-xs text-ink-500">
                Berapa listrik yang dihasilkan matahari, dipakai warga, dan sisa isi baterai setiap jam selama {data.periode_hari} hari{" "}
                {(cuacaAktif?.label ?? sel.label).toLowerCase()}
              </p>
            </div>
            <ChartLegend
              items={[
                { label: "Surya", color: ENERGY.surya },
                { label: "Pemakaian", color: ENERGY.beban, dashed: true },
                { label: "Isi baterai", color: ENERGY.baterai },
              ]}
            />
          </div>
          <HourlyChart surya={data.per_jam.surya_kwh} beban={data.per_jam.beban_kwh} genset={[]} soc={data.per_jam.soc_persen} height={190} />
          <ul className="mt-3 grid gap-2 text-xs text-ink-600 sm:grid-cols-3">
            <li className="flex gap-2 rounded-lg bg-ink-50 px-2.5 py-2">
              <span className="mt-1 h-2 w-3 shrink-0 rounded-sm" style={{ background: ENERGY.surya }} aria-hidden="true" />
              <span>
                <span className="font-semibold text-ink-800">Area oranye</span> = listrik dari matahari. Muncul siang hari, mengecil saat mendung.
              </span>
            </li>
            <li className="flex gap-2 rounded-lg bg-ink-50 px-2.5 py-2">
              <span className="mt-1.5 h-0 w-3 shrink-0 border-t-2 border-dashed" style={{ borderColor: ENERGY.beban }} aria-hidden="true" />
              <span>
                <span className="font-semibold text-ink-800">Garis putus-putus</span> = listrik yang dipakai warga tiap jam.
              </span>
            </li>
            <li className="flex gap-2 rounded-lg bg-ink-50 px-2.5 py-2">
              <span className="mt-1.5 h-0.5 w-3 shrink-0 rounded" style={{ background: ENERGY.baterai }} aria-hidden="true" />
              <span>
                <span className="font-semibold text-ink-800">Garis hijau</span> = isi baterai (%). Kalau menyentuh bawah, baterai habis dan listrik padam.
              </span>
            </li>
          </ul>
          <Kejadian log={data.per_jam.log} />
        </Card>
      )}
    </div>
  );
}

function Bagian({ n, judul, children }: { n: number; judul: string; children: React.ReactNode }) {
  return (
    <div className="p-4 sm:p-5">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
        <span className="num grid size-6 place-items-center rounded-full bg-ink-900 text-xs text-white">{n}</span>
        {judul}
      </p>
      {children}
    </div>
  );
}

const LOG_ICON: Record<LogTindakan["jenis"], React.ComponentType<{ className?: string }>> = {
  tunda: PauseCircle,
  pulih: PlayCircle,
  genset: BatteryWarning,
  peringatan: BatteryWarning,
  hemat: ShieldCheck,
};
const LOG_TONE: Record<LogTindakan["jenis"], string> = {
  tunda: "bg-sun-100 text-sun-700",
  pulih: "bg-leaf-50 text-leaf-600",
  genset: "bg-flame-50 text-flame-600",
  peringatan: "bg-amber-50 text-amber-600",
  hemat: "bg-leaf-50 text-leaf-600",
};

/** Kejadian selama simulasi, dilipat di bawah grafik. */
function Kejadian({ log: semua }: { log: LogTindakan[] }) {
  // Kejadian genset tidak ditampilkan; aplikasi hanya membahas surya + baterai.
  const log = semua.filter((l) => l.jenis !== "genset" && !/genset|diesel|solar/i.test(l.pesan));
  if (!log.length) return null;
  return (
    <details className="group mt-4 border-t border-ink-100 pt-3">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-ink-800 [&::-webkit-details-marker]:hidden">
        Apa yang terjadi <span className="num ml-1.5 text-xs font-normal text-ink-500">({log.length} kejadian)</span>
        <ChevronDown className="ml-auto size-4 text-ink-400 transition group-open:rotate-180" />
      </summary>
      <ol className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {log.map((l, i) => {
          const I = LOG_ICON[l.jenis] ?? TrendingDown;
          return (
            <li key={i} className="flex gap-2.5">
              <span className={cn("grid size-7 shrink-0 place-items-center rounded-full", LOG_TONE[l.jenis])}>
                <I className="size-3.5" />
              </span>
              <span className="min-w-0">
                <span className="num block text-xs text-ink-500">{l.waktu}</span>
                <span className="block text-sm text-ink-800">{l.pesan}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </details>
  );
}

function SimpanTombol({ input, rencanaId, nama, siap }: { input: InputKetahanan; rencanaId: string | null; nama: string; siap: boolean }) {
  const [msg, setMsg] = useState<{ ok: boolean; message: string; untuk: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // "Tersimpan" hanya berlaku untuk pengaturan yang sama; ubah pengaturan = bisa disimpan lagi.
  const kunci = JSON.stringify(input);
  const tersimpan = msg?.ok && msg.untuk === kunci;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <>
      <div className="flex flex-col items-stretch gap-1 sm:items-end">
        <Button
          variant="secondary"
          size="sm"
          disabled={pending || !siap || tersimpan}
          onClick={() =>
            start(async () => {
              const r = await saveSimulation(input, nama, rencanaId);
              setMsg({ ...r, untuk: kunci });
              if (r.ok) setToast(r.message);
            })
          }
        >
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : tersimpan ? <Check className="size-4 text-leaf-600" /> : <Save className="size-4" />}
          {pending ? "Menyimpan…" : tersimpan ? "Tersimpan" : "Simpan simulasi"}
        </Button>
        {msg && !msg.ok && <p className="text-xs text-flame-300">{msg.message}</p>}
      </div>
      {toast && (
        <div role="status" className="animate-rise fixed right-4 bottom-24 z-50 flex max-w-sm items-start gap-3 rounded-2xl bg-surface p-4 text-ink-900 shadow-lift ring-1 ring-leaf-200 md:bottom-6">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-leaf-500 text-white">
            <Check className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Simulasi berhasil disimpan</p>
            <p className="mt-0.5 text-xs text-ink-600">{toast}</p>
          </div>
          <button type="button" onClick={() => setToast(null)} className="ml-1 text-xs text-ink-400 hover:text-ink-800" aria-label="Tutup">
            ✕
          </button>
        </div>
      )}
    </>
  );
}
