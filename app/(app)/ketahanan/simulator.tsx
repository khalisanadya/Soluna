"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  AlertTriangle,
  BatteryWarning,
  ChevronDown,
  CloudRain,
  CloudSun,
  Fuel,
  LoaderCircle,
  PauseCircle,
  PlayCircle,
  Save,
  ShieldCheck,
  Sun,
  TrendingDown,
} from "lucide-react";
import { saveSimulation, simulateResilience, type InputKetahanan, type SimulasiResult } from "@/app/actions/ketahanan";
import { CalcDetail, ExplanationCard } from "@/components/calc";
import { BarRow, ChartLegend, ENERGY, HourlyChart } from "@/components/charts";
import { EnergyFlow } from "@/components/energy-flow";
import { Badge, Button, Card, Disclaimer, Field, Notice, SectionTitle, Skeleton, inputClass } from "@/components/ui";
import { cn, days, num } from "@/lib/format";
import type { LogTindakan, TingkatKey } from "@/lib/types";

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
};

const PRIORITAS = [
  { k: "hemat_diesel", t: "Hemat diesel", d: "DoD standar, genset seminimal mungkin" },
  { k: "ketahanan_maksimum", t: "Ketahanan maksimum", d: "Pakai cadangan baterai lebih dalam" },
  { k: "umur_baterai_maksimum", t: "Umur baterai maksimum", d: "Batas pengosongan diperketat" },
] as const;

const SCENARIO_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  normal: Sun,
  mendung_panjang: CloudSun,
  hujan_beberapa_hari: CloudRain,
};

const TINGKAT_STYLE: Record<string, { dot: string; ring: string }> = {
  kritis: { dot: "bg-flame-500", ring: "ring-flame-100" },
  penting: { dot: "bg-sun-500", ring: "ring-sun-100" },
  kenyamanan: { dot: "bg-sky-500", ring: "ring-sky-100" },
};

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
  const [prioritas, setPrioritas] = useState<InputKetahanan["prioritas"]>("hemat_diesel");
  const [shed, setShed] = useState(true);
  const [faktor, setFaktor] = useState(100);
  const [periode, setPeriode] = useState(defaultPeriode);
  const [result, setResult] = useState<SimulasiResult | null>(null);
  const [pending, start] = useTransition();
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; message: string } | null>(null);
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
  const flow = useMemo(() => {
    if (!data) return null;
    const p = data.per_jam;
    const n = p.jam.length / 24;
    let sd = 0,
      sb = 0,
      g = 0,
      l = 0;
    p.surya_kwh.forEach((pv, i) => {
      sd += Math.min(pv, p.beban_kwh[i]);
      sb += Math.max(0, pv - p.beban_kwh[i]);
      g += p.genset_kwh[i];
      l += p.beban_kwh[i];
    });
    return {
      surya: (sd + sb) / n,
      suryaKeDesa: sd / n,
      suryaKeBaterai: sb / n,
      genset: g / n,
      beban: l / n,
      baterai: Math.max(0, l - sd - g) / n,
      socAkhir: p.soc_persen[p.soc_persen.length - 1],
    };
  }, [data]);

  const set = (k: keyof SimInitial, v: number) => setBase((b) => ({ ...b, [k]: v }));
  const numInput = (k: keyof SimInitial, label: string, opts: { step?: number; scale?: number; suffix?: string } = {}) => {
    const scale = opts.scale ?? 1;
    return (
      <Field label={label} htmlFor={`sim-${k}`}>
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
          className={inputClass}
        />
      </Field>
    );
  };

  return (
    <div className="space-y-4">
      {/* Kontrol */}
      <Card className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <Field label="Sumber data" htmlFor="sim-plan">
            <select
              id="sim-plan"
              className={inputClass}
              value={base.rencanaId ?? ""}
              onChange={(e) => {
                const p = plans.find((x) => x.rencanaId === e.target.value);
                if (p) setBase(p);
              }}
            >
              {!base.rencanaId && <option value="">{base.nama}</option>}
              {plans.map((p) => (
                <option key={p.rencanaId} value={p.rencanaId!}>
                  {p.nama}
                </option>
              ))}
            </select>
          </Field>
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink-800">Skenario cuaca</p>
            <div className="grid grid-cols-3 gap-1 rounded-2xl bg-ink-100 p-1" role="tablist" aria-label="Skenario cuaca">
              {skenario.map((s) => {
                const I = SCENARIO_ICON[s.kunci] ?? CloudSun;
                return (
                  <button
                    key={s.kunci}
                    role="tab"
                    aria-selected={sk === s.kunci}
                    onClick={() => setSk(s.kunci)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition sm:text-sm",
                      sk === s.kunci ? "bg-surface text-ink-950 shadow-soft" : "text-ink-500 hover:text-ink-800",
                    )}
                  >
                    <I className="size-4 shrink-0" />
                    <span className="truncate">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink-800">Prioritas pengelola</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {PRIORITAS.map((p) => (
                <button
                  key={p.k}
                  onClick={() => setPrioritas(p.k)}
                  aria-pressed={prioritas === p.k}
                  className={cn("rounded-2xl p-3 text-left ring-1 transition", prioritas === p.k ? "bg-ink-900 text-white ring-ink-900" : "ring-ink-200 hover:ring-ink-300")}
                >
                  <span className="block text-sm font-semibold">{p.t}</span>
                  <span className={cn("text-xs", prioritas === p.k ? "text-ink-300" : "text-ink-500")}>{p.d}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <label className="flex items-center justify-between gap-3 rounded-2xl bg-ink-50 p-3 ring-1 ring-ink-100">
              <span>
                <span className="block text-sm font-semibold">Pelepasan beban bertingkat</span>
                <span className="text-xs text-ink-500">Kenyamanan dilepas dulu, lalu penting</span>
              </span>
              <button
                role="switch"
                aria-checked={shed}
                onClick={() => setShed((s) => !s)}
                className={cn("relative h-7 w-12 shrink-0 rounded-full transition", shed ? "bg-leaf-500" : "bg-ink-300")}
              >
                <span className={cn("absolute top-1 size-5 rounded-full bg-white shadow transition-all", shed ? "left-6" : "left-1")} />
              </button>
            </label>
            <div>
              <label htmlFor="sim-faktor" className="flex justify-between text-sm font-medium text-ink-800">
                Beban rata-rata <span className="num">{faktor}%</span>
              </label>
              <input id="sim-faktor" type="range" min={30} max={100} step={5} value={faktor} onChange={(e) => setFaktor(Number(e.target.value))} className="mt-2 w-full accent-sun-500" />
              <p className="text-xs text-ink-500">Turunkan untuk menguji penghematan manual (mis. 50% → beban turun separuh).</p>
            </div>
          </div>
        </div>

        <details className="group rounded-2xl bg-ink-50 ring-1 ring-ink-100">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            Ubah sistem: beban {num(base.beban_harian_kwh)} kWh/hari · {base.jumlah_paket} paket × {num(base.kapasitas_kwh)} kWh · SoH {num(base.soh * 100)}% ·{" "}
            {num(base.kapasitas_panel_kwp)} kWp
            <ChevronDown className="size-4 text-ink-400 transition group-open:rotate-180" />
          </summary>
          <div className="grid gap-4 px-4 pb-4 sm:grid-cols-3 lg:grid-cols-6">
            {numInput("beban_harian_kwh", "Beban harian (kWh)")}
            {numInput("jumlah_paket", "Jumlah paket", { step: 1 })}
            {numInput("kapasitas_kwh", "Kapasitas paket (kWh)")}
            {numInput("soh", "SoH (%)", { scale: 100 })}
            {numInput("kapasitas_panel_kwp", "Panel (kWp)")}
            <Field label="Periode (hari)" htmlFor="sim-periode">
              <select id="sim-periode" value={periode} onChange={(e) => setPeriode(Number(e.target.value))} className={inputClass}>
                {[1, 2, 3, 5, 7].map((d) => (
                  <option key={d} value={d}>
                    {d} hari
                  </option>
                ))}
              </select>
            </Field>
            {baterai.length > 0 && (
              <Field label="Pakai SoH baterai dari Modul A" htmlFor="sim-bat" className="sm:col-span-3 lg:col-span-6">
                <select
                  id="sim-bat"
                  defaultValue=""
                  className={inputClass}
                  onChange={(e) => {
                    const b = baterai.find((x) => x.id === e.target.value);
                    if (b) setBase((s) => ({ ...s, soh: b.soh, kapasitas_kwh: b.kapasitas }));
                  }}
                >
                  <option value="">Pilih baterai yang sudah dinilai…</option>
                  {baterai.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>
        </details>
      </Card>

      {result && !result.ok && (
        <Notice tone="danger" title="Simulasi gagal">
          {result.error}
        </Notice>
      )}

      {!data || !sel || !flow ? (
        result && !result.ok ? null : (
          <div className="grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-80 rounded-[1.5rem] lg:col-span-2" />
            <Skeleton className="h-80 rounded-[1.5rem]" />
          </div>
        )
      ) : (
        <div className={cn("space-y-4 transition-opacity", pending && "opacity-70")}>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <div className="relative">
                <EnergyFlow
                  suryaKwh={flow.surya}
                  suryaKeDesaKwh={flow.suryaKeDesa}
                  suryaKeBateraiKwh={flow.suryaKeBaterai}
                  bebanKwh={flow.beban}
                  bateraiKwh={flow.baterai}
                  gensetKwh={flow.genset}
                  socPersen={flow.socAkhir}
                  caption={`Rata-rata per hari selama ${data.periode_hari} hari · ${sel.label.toLowerCase()}`}
                />
                {pending && (
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium shadow-soft">
                    <LoaderCircle className="size-3.5 animate-spin" /> Menghitung
                  </span>
                )}
              </div>

              <Card>
                <SectionTitle title={`Perkiraan per jam · ${data.periode_hari} hari`} hint={data.per_jam.catatan} />
                <HourlyChart surya={data.per_jam.surya_kwh} beban={data.per_jam.beban_kwh} genset={data.per_jam.genset_kwh} soc={data.per_jam.soc_persen} />
                <div className="mt-2 flex h-2 overflow-hidden rounded-full" aria-label="Tingkat beban per jam">
                  {data.per_jam.tingkat.map((t, i) => (
                    <span key={i} className={cn("flex-1", t === "penuh" ? "bg-leaf-300" : t === "tanpa_kenyamanan" ? "bg-sun-300" : "bg-flame-500")} title={`${i}: ${LEVEL_LABEL[t]}`} />
                  ))}
                </div>
                <div className="mt-3">
                  <ChartLegend
                    items={[
                      { label: "Produksi surya (kWh/jam)", color: ENERGY.surya },
                      { label: "Beban (kWh/jam)", color: ENERGY.beban, dashed: true },
                      { label: "Genset", color: ENERGY.genset },
                      { label: "Cadangan baterai (%)", color: ENERGY.baterai },
                      { label: "Semua beban", color: "#6cc59d" },
                      { label: "Tanpa kenyamanan", color: "#ffbb5e" },
                      { label: "Hanya kritis", color: "#d9533b" },
                    ]}
                  />
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              {/* K-13 ketahanan sekilas */}
              <Card tone="ink">
                <p className="eyebrow !text-ink-400">Desa bertahan</p>
                <p className="mt-3 flex items-baseline gap-2">
                  <span className="num text-6xl leading-none text-white">
                    {(shed ? sel.lama_bertahan_pelepasan_hari : sel.lama_bertahan_hari) === null ? "∞" : num(shed ? sel.lama_bertahan_pelepasan_hari : sel.lama_bertahan_hari, 1)}
                  </span>
                  <span className="text-lg text-ink-300">hari</span>
                </p>
                <p className="mt-2 text-sm text-ink-300">
                  {sel.label} · {shed ? "dengan pelepasan beban" : "tanpa pelepasan beban"} · beban {faktor}%
                </p>
                <div className="mt-5 space-y-3 [&_span]:!text-ink-200">
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
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-white/5 p-3">
                    <p className="text-xs text-ink-400">Energi tersedia</p>
                    <p className="num text-white">{num(data.energi_tersedia_kwh)} kWh</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3">
                    <p className="text-xs text-ink-400">Jam genset ({data.periode_hari} hari)</p>
                    <p className="num text-white">{num(shed ? sel.jam_genset_pelepasan : sel.jam_genset, 1)} jam</p>
                  </div>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-ink-400">{data.alasan_dod}</p>
              </Card>

              {data.peringatan.length > 0 ? (
                data.peringatan.map((w) => (
                  <Notice key={w} tone="warning" title="Energi tidak cukup">
                    {w}
                  </Notice>
                ))
              ) : (
                <Notice tone="success" title="Energi cukup">
                  Cadangan mencukupi selama {data.periode_hari} hari pada skenario {sel.label.toLowerCase()}.
                </Notice>
              )}
              <SaveBox input={input} rencanaId={base.rencanaId} onSaved={setSaveMsg} msg={saveMsg} />
            </div>
          </div>

          {/* K-9 perbandingan skenario */}
          <Card className="overflow-x-auto">
            <SectionTitle title="Perbandingan tiga skenario" hint="Dengan dan tanpa pelepasan beban, prioritas dan beban yang sama" />
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs text-ink-500">
                <tr className="border-b border-ink-100">
                  <th className="py-2 pr-3 font-medium">Skenario</th>
                  <th className="px-3 py-2 text-right font-medium">Produksi panel</th>
                  <th className="px-3 py-2 text-right font-medium">Tanpa pelepasan</th>
                  <th className="px-3 py-2 text-right font-medium">Dengan pelepasan</th>
                  <th className="px-3 py-2 text-right font-medium">Jam genset</th>
                  <th className="py-2 pl-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {data.skenario.map((s) => {
                  const I = SCENARIO_ICON[s.kunci] ?? CloudSun;
                  const ok = shed ? s.cukup_pelepasan : s.cukup;
                  return (
                    <tr key={s.kunci} className={cn(s.kunci === sk && "bg-sun-50/60")}>
                      <td className="py-3 pr-3">
                        <button onClick={() => setSk(s.kunci)} className="flex items-center gap-2 font-semibold hover:underline">
                          <I className="size-4 text-ink-500" /> {s.label}
                        </button>
                        <span className="text-xs text-ink-500">faktor produksi {num(s.faktor_produksi * 100, 0)}%</span>
                      </td>
                      <td className="num px-3 py-3 text-right">{num(s.produksi_panel_kwh)} kWh/h</td>
                      <td className="num px-3 py-3 text-right">{days(s.lama_bertahan_hari)}</td>
                      <td className="num px-3 py-3 text-right font-semibold">{days(s.lama_bertahan_pelepasan_hari)}</td>
                      <td className="num px-3 py-3 text-right">
                        {num(s.jam_genset, 1)} → {num(s.jam_genset_pelepasan, 1)}
                      </td>
                      <td className="py-3 pl-3">{ok ? <Badge tone="leaf">Cukup</Badge> : <Badge tone="amber">Kurang</Badge>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {/* K-5, K-10 tingkat beban */}
          <div className="grid gap-4 md:grid-cols-3">
            {data.tingkat_beban.map((t) => (
              <Card key={t.kunci} className={cn("ring-1", TINGKAT_STYLE[t.kunci]?.ring)}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-semibold">
                    <span className={cn("size-2.5 rounded-full", TINGKAT_STYLE[t.kunci]?.dot)} /> {t.label}
                  </span>
                  <span className="num text-sm text-ink-500">
                    {num(t.porsi * 100, 0)}% · {num(t.beban_kwh)} kWh/h
                  </span>
                </div>
                <p className="mt-2 text-sm text-ink-600">{t.penjelasan}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {t.perangkat.map((p) => (
                    <Badge key={p}>{p}</Badge>
                  ))}
                </div>
                {t.kunci !== "kritis" && (
                  <p className="mt-3 text-xs text-ink-500">
                    Dilepas saat cadangan ≤ {num((t.kunci === "kenyamanan" ? data.ambang_pelepasan.kenyamanan : data.ambang_pelepasan.penting) * 100, 0)}%
                  </p>
                )}
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ActionLog log={data.per_jam.log} />
            <div className="space-y-4">
              {result?.ok && <ExplanationCard penjelasan={result.penjelasan} />}
              <CalcDetail steps={data.langkah} />
            </div>
          </div>
          <Disclaimer />
        </div>
      )}
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

/** K-11: log "Apa yang Dilakukan Sistem" — hanya simulasi. */
function ActionLog({ log }: { log: LogTindakan[] }) {
  return (
    <Card>
      <SectionTitle title="Apa yang dilakukan sistem" hint="Catatan simulasi tindakan — bukan kendali beban nyata" />
      {log.length ? (
        <ol className="relative space-y-3 before:absolute before:top-2 before:bottom-2 before:left-[1.1rem] before:w-px before:bg-ink-200">
          {log.map((l, i) => {
            const I = LOG_ICON[l.jenis] ?? TrendingDown;
            return (
              <li key={i} className="relative flex gap-3">
                <span className={cn("z-10 grid size-9 shrink-0 place-items-center rounded-full ring-4 ring-surface", LOG_TONE[l.jenis])}>
                  <I className="size-4" />
                </span>
                <div className="pt-1">
                  <p className="num text-xs text-ink-500">{l.waktu}</p>
                  <p className="text-sm text-ink-800">{l.pesan}</p>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="flex items-center gap-2 text-sm text-ink-500">
          <AlertTriangle className="size-4" /> Tidak ada tindakan.
        </p>
      )}
    </Card>
  );
}

function SaveBox({
  input,
  rencanaId,
  onSaved,
  msg,
}: {
  input: InputKetahanan;
  rencanaId: string | null;
  onSaved: (m: { ok: boolean; message: string }) => void;
  msg: { ok: boolean; message: string } | null;
}) {
  const [nama, setNama] = useState("");
  const [pending, start] = useTransition();
  return (
    <Card tone="muted" className="space-y-3">
      <label htmlFor="sim-nama" className="text-sm font-semibold">
        Simpan simulasi
      </label>
      <div className="flex gap-2">
        <input id="sim-nama" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama simulasi" className={inputClass} />
        <Button variant="dark" disabled={pending} onClick={() => start(async () => onSaved(await saveSimulation(input, nama, rencanaId)))} aria-label="Simpan simulasi">
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
        </Button>
      </div>
      {msg && <p className={cn("text-xs", msg.ok ? "text-leaf-700" : "text-flame-600")}>{msg.message}</p>}
    </Card>
  );
}
