"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  BatteryWarning,
  Check,
  ChevronDown,
  CloudRain,
  CloudSun,
  Fuel,
  LoaderCircle,
  PauseCircle,
  PlayCircle,
  Save,
  ShieldCheck,
  Sprout,
  Sun,
  TrendingDown,
} from "lucide-react";
import { saveSimulation, simulateResilience, type InputKetahanan, type SimulasiResult } from "@/app/actions/ketahanan";
import { BarRow, ChartLegend, ENERGY, HourlyChart } from "@/components/charts";
import { Pilih } from "@/components/filter-kit";
import { Button, Card, Field, Notice, Skeleton, inputClass } from "@/components/ui";
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

const PRIORITAS: { k: Prioritas; t: string; d: string; icon: React.ReactNode }[] = [
  { k: "hemat_diesel", t: "Hemat diesel", d: "Kurangi solar genset", icon: <Fuel className="size-4" /> },
  { k: "ketahanan_maksimum", t: "Ketahanan maksimum", d: "Bertahan lebih lama", icon: <ShieldCheck className="size-4" /> },
  { k: "umur_baterai_maksimum", t: "Umur baterai", d: "Baterai lebih awet", icon: <Sprout className="size-4" /> },
];

const SCENARIO_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  normal: Sun,
  mendung_panjang: CloudSun,
  hujan_beberapa_hari: CloudRain,
};

const TINGKAT_DOT: Record<string, string> = { kritis: "bg-flame-500", penting: "bg-sun-500", kenyamanan: "bg-sky-500" };
const LEVEL_LABEL: Record<TingkatKey, string> = { penuh: "Semua beban", tanpa_kenyamanan: "Tanpa kenyamanan", kritis_saja: "Hanya kritis" };

export function Simulator({
  initial,
  plans,
  skenario,
  baterai,
  defaultPeriode,
}: {
  initial: SimInitial;
  plans: SimInitial[];
  skenario: { kunci: string; label: string; faktor: number }[];
  baterai: { id: string; label: string; soh: number; kapasitas: number }[];
  defaultPeriode: number;
}) {
  const [base, setBase] = useState<SimInitial>(initial);
  const [sk, setSk] = useState("hujan_beberapa_hari");
  const [prioritas, setPrioritas] = useState<Prioritas>(initial.prioritas ?? "hemat_diesel");
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
  const jamGenset = sel ? (shed ? sel.jam_genset_pelepasan : sel.jam_genset) : 0;

  const set = (k: keyof SimInitial, v: number) => setBase((b) => ({ ...b, [k]: v }));
  const numInput = (k: keyof SimInitial, label: string, satuan: string, opts: { step?: number; scale?: number } = {}) => {
    const scale = opts.scale ?? 1;
    return (
      <Field label={label} htmlFor={`sim-${k}`}>
        <div className="relative">
          <input
            id={`sim-${k}`}
            type="number"
            step={opts.step ?? "any"}
            min={0}
            defaultValue={Math.round((base[k] as number) * scale * 100) / 100}
            key={`${base.rencanaId}-${k}-${base[k]}`}
            onBlur={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v) && v > 0) set(k, v / scale);
            }}
            className={cn(inputClass, "h-10 pr-14 text-sm")}
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-ink-400">{satuan}</span>
        </div>
      </Field>
    );
  };

  return (
    <div className="space-y-4">
      {/* Baris atas: rencana + simpan */}
      <Card className="flex flex-col gap-3 !p-4 sm:flex-row sm:items-end">
        <Field label="Rencana desa" htmlFor="sim-plan" className="min-w-0 flex-1">
          <Pilih
            id="sim-plan"
            value={base.rencanaId ?? ""}
            onChange={(e) => {
              const p = plans.find((x) => x.rencanaId === e.target.value);
              if (p) {
                setBase(p);
                if (p.prioritas) setPrioritas(p.prioritas);
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
        </Field>
        <SimpanTombol input={input} rencanaId={base.rencanaId} nama={sel ? `${base.nama} · ${sel.label}` : base.nama} siap={Boolean(sel)} />
      </Card>

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

      <div className="grid gap-4 lg:grid-cols-[19rem_minmax(0,1fr)]">
        {/* Kolom kiri: semua pengaturan simulasi */}
        <Card className="space-y-5 !p-4 lg:sticky lg:top-6 lg:self-start">
          <p className="text-sm font-semibold text-ink-900">Atur simulasi</p>

          <div>
            <p className="mb-2 text-xs font-medium text-ink-500">Tujuan</p>
            <div className="space-y-1.5" role="radiogroup" aria-label="Tujuan">
              {PRIORITAS.map((p) => {
                const aktif = prioritas === p.k;
                return (
                  <button
                    key={p.k}
                    type="button"
                    role="radio"
                    aria-checked={aktif}
                    onClick={() => setPrioritas(p.k)}
                    className={cn("flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left ring-1 transition", aktif ? "bg-sun-50 ring-2 ring-sun-400" : "ring-ink-200 hover:bg-ink-50")}
                  >
                    <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg", aktif ? "bg-sun-500 text-ink-950" : "bg-ink-100 text-ink-500")}>{p.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink-900">{p.t}</span>
                      <span className="block text-xs text-ink-500">{p.d}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="sim-faktor" className="flex justify-between text-xs font-medium text-ink-500">
              Pemakaian listrik <span className="num font-semibold text-ink-800">{faktor}%</span>
            </label>
            <input id="sim-faktor" type="range" min={30} max={100} step={5} value={faktor} onChange={(e) => setFaktor(Number(e.target.value))} className="mt-2 w-full accent-sun-500" />
          </div>

          {/* Hemat beban + urutannya berdekatan */}
          <div className="rounded-xl bg-ink-50 p-3 ring-1 ring-ink-100">
            <div className="flex items-center justify-between gap-3">
              <span>
                <span className="block text-sm font-medium text-ink-900">Hemat beban otomatis</span>
                <span className="text-xs text-ink-500">Saat baterai menipis</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={shed}
                aria-label="Hemat beban otomatis"
                onClick={() => setShed((s) => !s)}
                className={cn("relative h-6 w-11 shrink-0 rounded-full transition", shed ? "bg-leaf-500" : "bg-ink-300")}
              >
                <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", shed ? "left-[1.375rem]" : "left-0.5")} />
              </button>
            </div>
            {shed && data && (
              <ol className="mt-3 space-y-2 border-t border-ink-200/70 pt-3">
                {[...data.tingkat_beban].reverse().map((t) => (
                  <li key={t.kunci} className="flex items-start gap-2 text-xs">
                    <span className={cn("mt-1 size-2 shrink-0 rounded-full", TINGKAT_DOT[t.kunci])} />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium text-ink-800">{t.label}</span>
                      <span className="block truncate text-ink-500" title={t.perangkat.join(", ")}>
                        {t.perangkat.join(", ")}
                      </span>
                    </span>
                    <span className="num shrink-0 text-ink-500">
                      {t.kunci === "kritis" ? "selalu" : `≤${num((t.kunci === "kenyamanan" ? data.ambang_pelepasan.kenyamanan : data.ambang_pelepasan.penting) * 100, 0)}%`}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-medium text-ink-500 [&::-webkit-details-marker]:hidden">
              <span className="num truncate">
                Data sistem · {num(base.beban_harian_kwh)} kWh · {base.jumlah_paket} paket · {num(base.kapasitas_panel_kwp)} kWp
              </span>
              <ChevronDown className="size-4 shrink-0 transition group-open:rotate-180" />
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {numInput("beban_harian_kwh", "Kebutuhan", "kWh")}
              {numInput("jumlah_paket", "Paket", "paket", { step: 1 })}
              {numInput("kapasitas_kwh", "Kapasitas", "kWh")}
              {numInput("soh", "SoH", "%", { scale: 100 })}
              {numInput("kapasitas_panel_kwp", "Panel", "kWp")}
              <Field label="Lama uji" htmlFor="sim-periode">
                <Pilih id="sim-periode" value={periode} onChange={(e) => setPeriode(Number(e.target.value))} className="h-10 text-sm">
                  {[1, 2, 3, 5, 7].map((d) => (
                    <option key={d} value={d}>
                      {d} hari
                    </option>
                  ))}
                </Pilih>
              </Field>
              {baterai.length > 0 && (
                <Field label="Pakai baterai hasil penilaian" htmlFor="sim-bat" className="col-span-2">
                  <Pilih
                    id="sim-bat"
                    defaultValue=""
                    className="h-10 text-sm"
                    onChange={(e) => {
                      const b = baterai.find((x) => x.id === e.target.value);
                      if (b) setBase((s) => ({ ...s, soh: b.soh, kapasitas_kwh: b.kapasitas }));
                    }}
                  >
                    <option value="">Pilih baterai…</option>
                    {baterai.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.label}
                      </option>
                    ))}
                  </Pilih>
                </Field>
              )}
            </div>
          </details>
        </Card>

        {/* Kolom kanan: cuaca + hasil */}
        <div className="min-w-0 space-y-4">
          {/* Tab cuaca sekaligus menampilkan hasil tiap cuaca */}
          <div className="grid grid-cols-3 gap-1 rounded-2xl bg-ink-100 p-1" role="radiogroup" aria-label="Cuaca">
            {skenario.map((s) => {
              const I = SCENARIO_ICON[s.kunci] ?? CloudSun;
              const h = data?.skenario.find((x) => x.kunci === s.kunci);
              const l = h ? (shed ? h.lama_bertahan_pelepasan_hari : h.lama_bertahan_hari) : undefined;
              const ok = h ? (shed ? h.cukup_pelepasan : h.cukup) : undefined;
              const aktif = sk === s.kunci;
              return (
                <button
                  key={s.kunci}
                  type="button"
                  role="radio"
                  aria-checked={aktif}
                  onClick={() => setSk(s.kunci)}
                  className={cn("flex min-w-0 items-center gap-2 rounded-xl px-2.5 py-2 text-left transition sm:px-3", aktif ? "bg-surface shadow-soft" : "hover:bg-white/60")}
                >
                  <I className={cn("size-5 shrink-0", aktif ? "text-sun-600" : "text-ink-400")} />
                  <span className="min-w-0">
                    <span className={cn("block truncate text-sm font-medium", aktif ? "text-ink-900" : "text-ink-600")}>{s.label}</span>
                    <span className={cn("num block truncate text-xs", ok === undefined ? "text-ink-400" : ok ? "text-leaf-700" : "text-amber-600")}>
                      {h ? (l === null ? "Aman" : `${num(l, 1)} hari`) : "…"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {!data || !sel ? (
            result && !result.ok ? null : <Skeleton className="h-64 rounded-[1.5rem]" />
          ) : (
            <>
              {/* Hasil utama */}
              <section className={cn("relative overflow-hidden rounded-[var(--radius-card)] bg-ink-900 p-5 text-white shadow-lift sm:p-6", pending && "opacity-80")}>
                <div className={cn("pointer-events-none absolute -top-24 -right-16 size-64 rounded-full blur-3xl", cukup ? "bg-leaf-500/25" : "bg-sun-500/25")} aria-hidden="true" />
                {pending && (
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs">
                    <LoaderCircle className="size-3.5 animate-spin" /> Menghitung
                  </span>
                )}
                <div className="relative grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-8">
                  <div>
                    <p className="flex items-baseline gap-2">
                      <span className="num text-5xl leading-none font-semibold">{lama === null ? "∞" : num(lama, 1)}</span>
                      <span className="text-ink-300">hari</span>
                    </p>
                    <p className="mt-1.5 text-sm text-ink-300">bertahan tanpa genset</p>
                    <p className={cn("mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", cukup ? "bg-leaf-500/20 text-leaf-200" : "bg-sun-500/20 text-sun-200")}>
                      {cukup ? <Check className="size-3.5" /> : <Fuel className="size-3.5" />}
                      {cukup ? `Cukup untuk ${data.periode_hari} hari` : `Genset ±${num(jamGenset, 1)} jam`}
                    </p>
                  </div>
                  <div className="space-y-2.5 [&_span]:!text-ink-200">
                    {(["penuh", "tanpa_kenyamanan", "kritis_saja"] as TingkatKey[]).map((k) => (
                      <BarRow
                        key={k}
                        label={LEVEL_LABEL[k]}
                        value={sel.lama_per_tingkat_hari[k]}
                        max={Math.max(data.periode_hari, ...Object.values(sel.lama_per_tingkat_hari).map((v) => v ?? 0))}
                        display={days(sel.lama_per_tingkat_hari[k])}
                        color="bg-leaf-400"
                      />
                    ))}
                    <p className="num text-xs !text-ink-400">
                      Baterai {num(data.energi_tersedia_kwh)} kWh · dipakai hingga {num(data.dod_efektif * 100, 0)}%
                    </p>
                  </div>
                </div>
              </section>

              {/* Grafik + kejadian dalam satu kartu */}
              <Card className="!p-4 sm:!p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink-900">Perkiraan per jam · {data.periode_hari} hari</p>
                  <ChartLegend
                    items={[
                      { label: "Surya", color: ENERGY.surya },
                      { label: "Pemakaian", color: ENERGY.beban, dashed: true },
                      { label: "Genset", color: ENERGY.genset },
                      { label: "Isi baterai", color: ENERGY.baterai },
                    ]}
                  />
                </div>
                <HourlyChart surya={data.per_jam.surya_kwh} beban={data.per_jam.beban_kwh} genset={data.per_jam.genset_kwh} soc={data.per_jam.soc_persen} height={190} />
                <Kejadian log={data.per_jam.log} />
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const LOG_ICON: Record<LogTindakan["jenis"], React.ComponentType<{ className?: string }>> = {
  tunda: PauseCircle,
  pulih: PlayCircle,
  genset: Fuel,
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
function Kejadian({ log }: { log: LogTindakan[] }) {
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
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col items-stretch gap-1 sm:items-end">
      <Button variant="dark" disabled={pending || !siap} onClick={() => start(async () => setMsg(await saveSimulation(input, nama, rencanaId)))}>
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : msg?.ok ? <Check className="size-4" /> : <Save className="size-4" />}
        {pending ? "Menyimpan…" : msg?.ok ? "Tersimpan" : "Simpan simulasi"}
      </Button>
      {msg && !msg.ok && <p className="text-xs text-flame-600">{msg.message}</p>}
    </div>
  );
}
