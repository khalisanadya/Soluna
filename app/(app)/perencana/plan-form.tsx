"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowLeft, ArrowRight, BatteryCharging, Check, CircleAlert, Home, Info as InfoIcon, Loader2, Minus, Pencil, Plus, ShieldCheck, Sprout, Zap } from "lucide-react";
import { runPlan } from "@/app/actions/perencana";
import { Pilih } from "@/components/filter-kit";
import { SubmitButton } from "@/components/submit-button";
import { Badge, Card, Field, GradeBadge, Notice, SohBadge, buttonClass, inputClass } from "@/components/ui";
import { useUnsavedGuard } from "@/components/unsaved-guard";
import { cn, num, umur } from "@/lib/format";
import { RENCANA_FIELDS, pick, validasiRencana } from "@/lib/validation";
import type { Prioritas } from "@/lib/types";

export type PlanDefaults = { kapasitasPaket: number; sohPaket: number; hariCadangan: number };

export type BateraiPilihan = {
  id: string;
  kode: string;
  nama: string;
  grade: string;
  soh: number;
  kapasitas: number;
  sisaUmurTahun: number | null;
  kompat: { status: "layak" | "perlu_penyesuaian" | "tidak_layak"; label: string } | null;
  /** Alasan baterai tidak boleh dipilih (hasil pemeriksaan bertentangan dengan pemakaian). */
  diblokir: string | null;
};

const LANGKAH = [
  { judul: "Desa", fields: ["namaDesa", "lokasi", "jumlahRumah"] },
  { judul: "Kebutuhan listrik", fields: ["konsumsi", "porsiMalam"] },
  { judul: "Baterai", fields: ["sumberPaket", "bateraiId", "kapasitasPaket", "sohPaket"] },
  { judul: "Tujuan", fields: ["prioritas", "hariCadangan"] },
  { judul: "Ringkasan", fields: [] },
] as const satisfies { judul: string; fields: readonly string[] }[];

const PRIORITAS: { k: Prioritas; t: string; d: string; icon: React.ReactNode; warna: string }[] = [
  { k: "ketahanan_maksimum", t: "Ketahanan maksimum", d: "Listrik tetap menyala saat mendung.", icon: <ShieldCheck className="size-5" />, warna: "bg-sky-50 text-sky-600" },
  { k: "umur_baterai_maksimum", t: "Umur baterai maksimum", d: "Baterai lebih awet dipakai.", icon: <Sprout className="size-5" />, warna: "bg-leaf-50 text-leaf-600" },
];

const langkahDari = (keys: string[]) => LANGKAH.findIndex((l) => (l.fields as readonly string[]).some((f) => keys.includes(f)));

export function PlanForm({
  lokasi,
  baterai,
  defaults,
  dodPrioritas,
  ubah,
}: {
  lokasi: { nama: string; psh: number }[];
  baterai: BateraiPilihan[];
  defaults: PlanDefaults;
  dodPrioritas: Record<Prioritas, number>;
  /** Mode ubah: rencana yang diubah, isian awalnya, dan tujuan setelah selesai/batal. */
  ubah?: { rencanaId: string; awal: Record<string, string>; kembali: "rencana" | "ketahanan"; batal: string };
}) {
  const [state, action] = useActionState(runPlan, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [dirty, setDirty] = useState(false);
  const [step, setStep] = useState(0);
  // Saat mengubah, semua langkah sudah pernah diisi sehingga bisa langsung dibuka.
  const [maks, setMaks] = useState(ubah ? 4 : 0);
  const [clientErrors, setClientErrors] = useState<Record<string, string[] | undefined>>({});
  const [isian, setIsian] = useState<Record<string, string>>({});
  const { leave, dialog, lepas } = useUnsavedGuard(dirty);
  const v: Record<string, string | undefined> = { ...ubah?.awal, ...state?.values };
  const e = { ...state?.errors, ...clientErrors };
  const err = (name: string) => e[name];

  const [lok, setLok] = useState(v.lokasi ?? "Bawaan");
  // Baterai wajib dipilih dari daftar baterai yang sudah dinilai (tidak ada isian manual).
  const sumber = "baterai";
  // Boleh lebih dari satu baterai; dikirim sebagai daftar id dipisah koma.
  const [bateraiIds, setBateraiIds] = useState<string[]>(() => (v.bateraiId ? v.bateraiId.split(",").filter(Boolean) : []));
  const [prioritas, setPrioritas] = useState<Prioritas>((v.prioritas as Prioritas) ?? "ketahanan_maksimum");
  const [cadangan, setCadangan] = useState(v.hariCadangan ?? String(defaults.hariCadangan));
  const psh = lokasi.find((l) => l.nama === lok)?.psh;
  const terpilihList = baterai.filter((b) => bateraiIds.includes(b.id));
  const kwhTerpilih = terpilihList.reduce((n, b) => n + b.kapasitas, 0);

  // Galat dari server: buka langkah pertama yang bermasalah.
  useEffect(() => {
    const i = langkahDari(Object.keys(state?.errors ?? {}));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mengikuti hasil aksi server
    if (i >= 0) setStep(i);
  }, [state]);

  const baca = () => (formRef.current ? Object.fromEntries([...new FormData(formRef.current).entries()].map(([k, x]) => [k, String(x)])) : {});

  /** Validasi field langkah 0..sampai. Mengembalikan langkah pertama yang bermasalah, atau -1. */
  function periksa(sampai: number) {
    if (!formRef.current) return -1;
    const r = validasiRencana(pick(new FormData(formRef.current), RENCANA_FIELDS));
    const relevan: string[] = LANGKAH.slice(0, sampai + 1).flatMap((l) => [...l.fields]);
    const errors = r.ok ? {} : Object.fromEntries(Object.entries(r.errors).filter(([k]) => relevan.includes(k)));
    setClientErrors(errors);
    const keys = Object.keys(errors);
    if (!keys.length) return -1;
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>(`[name="${keys[0]}"]:not([type=hidden])`)?.focus());
    return langkahDari(keys);
  }

  function ke(i: number) {
    setStep(i);
    if (i === LANGKAH.length - 1) setIsian(baca());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function lanjut() {
    const salah = periksa(step);
    if (salah >= 0) return setStep(salah);
    setMaks((m) => Math.max(m, step + 1));
    ke(step + 1);
  }

  const clear = (name: string) => {
    setDirty(true);
    if (clientErrors[name]) setClientErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const angka = (name: string, satuan: string, bawaan?: string | number, props: React.ComponentProps<"input"> = {}) => (
    <div className="relative">
      <input
        id={name}
        name={name}
        inputMode="decimal"
        defaultValue={v[name] ?? (bawaan === undefined ? "" : String(bawaan))}
        aria-invalid={Boolean(err(name))}
        onChange={() => clear(name)}
        className={cn(inputClass, "pr-20")}
        {...props}
      />
      <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-ink-400">{satuan}</span>
    </div>
  );

  /** Tombol isi cepat dengan asumsi dari contoh laporan (diberi label asumsi). */
  const isiCepat = (name: string, nilai: string, label: string) => (
    <button
      type="button"
      onClick={() => {
        const el = formRef.current?.querySelector<HTMLInputElement>(`input[name="${name}"]`);
        if (el) el.value = nilai;
        clear(name);
      }}
      className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-700 hover:bg-ink-200/70"
    >
      {label}
    </button>
  );

  return (
    <form
      ref={formRef}
      action={action}
      noValidate
      onChange={() => setDirty(true)}
      onSubmit={(ev) => {
        // Enter di langkah awal = Lanjut, bukan menghitung.
        if (step < LANGKAH.length - 1) {
          ev.preventDefault();
          return lanjut();
        }
        const salah = periksa(LANGKAH.length - 1);
        if (salah >= 0) {
          ev.preventDefault();
          setStep(salah);
          return;
        }
        lepas();
      }}
    >
      {ubah && (
        <>
          <input type="hidden" name="rencanaId" value={ubah.rencanaId} />
          <input type="hidden" name="kembali" value={ubah.kembali} />
        </>
      )}
      {/* Indikator langkah */}
      <ol className="mb-4 grid grid-cols-5 gap-1.5 sm:gap-3" aria-label="Langkah perencanaan">
        {LANGKAH.map((l, i) => {
          const bisa = i <= maks;
          const lewat = i < step || (bisa && i !== step);
          return (
            <li key={l.judul}>
              <button type="button" disabled={!bisa} onClick={() => ke(i)} aria-current={i === step ? "step" : undefined} className="flex w-full flex-col gap-2 text-left disabled:cursor-not-allowed">
                <span className={cn("h-1.5 w-full rounded-full transition-colors", i <= step ? "bg-sun-500" : lewat ? "bg-sun-200" : "bg-ink-200")} />
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "num grid size-5 shrink-0 place-items-center rounded-full text-[0.7rem] font-semibold",
                      i === step ? "bg-ink-900 text-white" : lewat ? "bg-sun-500 text-ink-950" : "bg-ink-200 text-ink-500",
                    )}
                  >
                    {lewat ? <Check className="size-3" /> : i + 1}
                  </span>
                  <span className={cn("hidden truncate text-xs font-medium sm:inline", i === step ? "text-ink-900" : "text-ink-500")}>{l.judul}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {state?.message && !Object.values(clientErrors).some(Boolean) && (
        <Notice tone="danger" className="mb-4" title="Rencana belum dapat dihitung">
          {state.message}
        </Notice>
      )}

      <Card className="relative !p-0">
        <Memproses />
        {/* Langkah 1 — Desa */}
        <Langkah aktif={step === 0} icon={<Home className="size-5" />} judul="Tentang desa" keterangan="Informasi dasar desa yang akan dialiri listrik.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nama desa" htmlFor="namaDesa" error={err("namaDesa")} required>
              <input id="namaDesa" name="namaDesa" defaultValue={v.namaDesa} placeholder="mis. Desa Sukamaju" autoComplete="off" aria-invalid={Boolean(err("namaDesa"))} onChange={() => clear("namaDesa")} className={inputClass} />
            </Field>
            <Field label="Jumlah rumah" htmlFor="jumlahRumah" error={err("jumlahRumah")} required>
              {angka("jumlahRumah", "rumah", undefined, { inputMode: "numeric", placeholder: "50" })}
            </Field>
            <Field label="Wilayah desa" htmlFor="lokasi" error={err("lokasi")} required hint={psh !== undefined ? `Matahari ±${num(psh)} jam/hari (estimasi)` : undefined}>
              <Pilih id="lokasi" name="lokasi" value={lok} onChange={(ev) => (setLok(ev.target.value), clear("lokasi"))}>
                {lokasi.map((l) => (
                  <option key={l.nama} value={l.nama}>
                    {l.nama === "Bawaan" ? "Belum tahu / umum" : l.nama}
                  </option>
                ))}
              </Pilih>
            </Field>
          </div>
        </Langkah>

        {/* Langkah 2 — Kebutuhan listrik */}
        <Langkah aktif={step === 1} icon={<Zap className="size-5" />} judul="Pemakaian listrik" keterangan="Perkiraan listrik yang dipakai setiap rumah.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Pemakaian per rumah" htmlFor="konsumsi" error={err("konsumsi")} required>
              {angka("konsumsi", "kWh/hari", undefined, { placeholder: "1" })}
              {isiCepat("konsumsi", "1", "Belum tahu? Pakai 1 kWh")}
            </Field>
            <Field label="Dipakai malam hari" htmlFor="porsiMalam" error={err("porsiMalam")} required>
              {angka("porsiMalam", "%", undefined, { placeholder: "60" })}
              {isiCepat("porsiMalam", "60", "Belum tahu? Pakai 60%")}
            </Field>
          </div>
          <Info>Angka 1 kWh dan 60% adalah asumsi dari contoh laporan. Ganti bila ada data desa.</Info>
        </Langkah>

        {/* Langkah 3 — Baterai */}
        <Langkah aktif={step === 2} icon={<BatteryCharging className="size-5" />} judul="Baterai" keterangan="Pilih satu atau beberapa baterai bekas yang sudah dinilai.">
          <input type="hidden" name="sumberPaket" value={sumber} />
          <input type="hidden" name="bateraiId" value={bateraiIds.join(",")} />
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-ink-50 px-3 py-2 text-sm ring-1 ring-ink-100">
            <span className="text-ink-600">
              {terpilihList.length ? (
                <>
                  <span className="font-semibold text-ink-900">{terpilihList.length} baterai dipilih</span> · total{" "}
                  <span className="num font-semibold text-ink-900">{num(kwhTerpilih)} kWh</span>
                </>
              ) : (
                "Centang baterai yang akan dipakai. Boleh lebih dari satu."
              )}
            </span>
            {terpilihList.length > 0 && (
              <button type="button" onClick={() => setBateraiIds([])} className="text-xs font-semibold text-ink-500 hover:text-ink-900">
                Hapus pilihan
              </button>
            )}
          </div>
          {err("bateraiId") && (
            <p className="mb-2 flex items-center gap-1 text-xs font-medium text-flame-600">
              <CircleAlert className="size-3.5" /> {err("bateraiId")![0]}
            </p>
          )}

          <div className="overflow-hidden rounded-2xl ring-1 ring-ink-200" role="group" aria-label="Baterai">
            <ul className="divide-y divide-ink-100">
              {baterai.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-ink-500">
                  Belum ada baterai yang sudah dinilai. Rencana bisa dibuat setelah pemasok menilai baterainya.
                </li>
              )}
              {baterai.length > 0 && (
                <li className="hidden grid-cols-[2.5rem_minmax(0,1fr)_6rem_6rem_7rem_9rem_1.5rem] items-center gap-3 bg-ink-50 px-4 py-2.5 text-xs font-medium text-ink-500 md:grid" aria-hidden="true">
                  <span>Grade</span>
                  <span>
                    Baterai <span className="font-normal text-ink-400">· diurutkan dari SoH tertinggi</span>
                  </span>
                  <span className="text-center">Kapasitas</span>
                  <span className="text-center">SoH</span>
                  <span className="text-center">Sisa umur</span>
                  <span className="text-center">Kompatibilitas</span>
                  <span />
                </li>
              )}
              {baterai.map((b) => {
                const aktif = bateraiIds.includes(b.id);
                return (
                  <li key={b.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={aktif}
                      disabled={Boolean(b.diblokir)}
                      title={b.diblokir ?? undefined}
                      onClick={() => {
                        setBateraiIds((ids) => (ids.includes(b.id) ? ids.filter((x) => x !== b.id) : [...ids, b.id]));
                        clear("bateraiId");
                      }}
                      className={cn(
                        "grid w-full grid-cols-[2.5rem_minmax(0,1fr)_1.5rem] items-center gap-3 px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 md:grid-cols-[2.5rem_minmax(0,1fr)_6rem_6rem_7rem_9rem_1.5rem]",
                        aktif ? "bg-sun-50" : "enabled:hover:bg-ink-50",
                      )}
                    >
                      <GradeBadge grade={b.grade} />
                      <span className="min-w-0">
                        <span className="num block text-sm font-semibold text-ink-900">{b.kode}</span>
                        <span className="block truncate text-xs text-ink-500">
                          {b.nama}
                          <span className="md:hidden">
                            {" "}
                            · {num(b.kapasitas)} kWh · SoH {num(b.soh)}%
                          </span>
                        </span>
                      </span>
                      <span className="num hidden text-center text-sm md:block">{num(b.kapasitas)} kWh</span>
                      <span className="hidden justify-center md:flex">
                        <SohBadge soh={b.soh} />
                      </span>
                      <span className="num hidden text-center text-sm text-ink-700 md:block">{b.sisaUmurTahun !== null ? umur(b.sisaUmurTahun) : "—"}</span>
                      <span className="hidden justify-center md:flex">
                        <Badge tone={b.diblokir ? "flame" : b.kompat?.status === "layak" ? "leaf" : b.kompat ? "amber" : "neutral"}>
                          {b.diblokir ? "Tidak layak" : (b.kompat?.label ?? "Belum dicek")}
                        </Badge>
                      </span>
                      <span className={cn("grid size-5 place-items-center rounded-md ring-2", aktif ? "bg-sun-500 text-ink-950 ring-sun-500" : "ring-ink-300")} aria-hidden="true">
                        {aktif && <Check className="size-3.5" strokeWidth={3} />}
                      </span>
                    </button>
                  </li>
                );
              })}

            </ul>
          </div>
        </Langkah>

        {/* Langkah 4 — Tujuan */}
        <Langkah aktif={step === 3} icon={<ShieldCheck className="size-5" />} judul="Tujuan" keterangan="Pilih yang paling penting untuk desa.">
          <input type="hidden" name="prioritas" value={prioritas} />
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Tujuan perencanaan">
            {PRIORITAS.map((p) => {
              const aktif = prioritas === p.k;
              return (
                <button
                  key={p.k}
                  type="button"
                  role="radio"
                  aria-checked={aktif}
                  onClick={() => (setPrioritas(p.k), setDirty(true))}
                  className={cn("flex flex-col rounded-2xl p-4 text-left ring-1 transition", aktif ? "bg-sun-50 ring-2 ring-sun-400" : "bg-surface ring-ink-200 hover:bg-ink-50")}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className={cn("grid size-10 place-items-center rounded-xl", p.warna)}>{p.icon}</span>
                    <span className={cn("grid size-5 place-items-center rounded-full ring-2", aktif ? "bg-sun-500 text-ink-950 ring-sun-500" : "ring-ink-300")} aria-hidden="true">
                      {aktif && <Check className="size-3" />}
                    </span>
                  </span>
                  <span className="mt-3 text-sm font-semibold text-ink-900">{p.t}</span>
                  <span className="mt-1 text-xs leading-relaxed text-ink-600">{p.d}</span>
                  <span className="num mt-3 text-xs text-ink-500">Baterai dipakai {num(dodPrioritas[p.k] * 100, 0)}%</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 border-t border-ink-100 pt-5">
            <p className="text-sm font-medium text-ink-800">
              Berapa hari listrik harus tetap menyala tanpa matahari? <span className="text-flame-500">*</span>
            </p>
            <p className="mb-3 text-xs text-ink-500">Untuk hari mendung atau hujan berturut-turut.</p>
            <input type="hidden" name="hariCadangan" value={cadangan} />
            <div className="flex flex-wrap items-center gap-4">
              {/* Penghitung hari: − nilai + (0–10) */}
              <div className="inline-flex items-center rounded-full bg-surface p-1 ring-1 ring-ink-200" role="group" aria-label="Jumlah hari cadangan">
                <button
                  type="button"
                  aria-label="Kurangi satu hari"
                  disabled={Number(cadangan) <= 0}
                  onClick={() => (setCadangan(String(Math.max(0, Number(cadangan) - 1))), clear("hariCadangan"))}
                  className="grid size-9 place-items-center rounded-full text-ink-700 transition hover:bg-ink-100 disabled:opacity-30"
                >
                  <Minus className="size-4" />
                </button>
                <span className="num w-24 text-center text-sm font-semibold text-ink-950" aria-live="polite">
                  {cadangan === "0" ? "Tidak perlu" : `${cadangan} hari`}
                </span>
                <button
                  type="button"
                  aria-label="Tambah satu hari"
                  disabled={Number(cadangan) >= 10}
                  onClick={() => (setCadangan(String(Math.min(10, Number(cadangan) + 1))), clear("hariCadangan"))}
                  className="grid size-9 place-items-center rounded-full text-ink-700 transition hover:bg-ink-100 disabled:opacity-30"
                >
                  <Plus className="size-4" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-ink-400">Umum dipakai:</span>
                {["1", "2", "3"].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => (setCadangan(n), clear("hariCadangan"))}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium ring-1 transition",
                      cadangan === n ? "bg-sun-100 text-sun-800 ring-sun-200" : "bg-surface text-ink-600 ring-ink-200 hover:bg-ink-50",
                    )}
                  >
                    {n} hari
                  </button>
                ))}
              </div>
            </div>
            {err("hariCadangan") && (
              <p className="mt-2 flex items-center gap-1 text-xs font-medium text-flame-600">
                <CircleAlert className="size-3.5" /> {err("hariCadangan")![0]}
              </p>
            )}
            <p className="mt-2 text-xs text-ink-400">Maksimal 10 hari.</p>
          </div>

          {/* Biaya selalu dihitung per bulan. */}
          <input type="hidden" name="periode" value="30" />
        </Langkah>

        {/* Langkah 5 — Ringkasan */}
        <Langkah aktif={step === 4} icon={<Check className="size-5" />} judul="Periksa data" keterangan="Klik Ubah bila ada yang salah.">
          <dl className="divide-y divide-ink-100 rounded-2xl ring-1 ring-ink-200">
            <Ringkas langkah={0} onUbah={ke} judul="Desa" isi={[isian.namaDesa || "—", `${num(Number(isian.jumlahRumah), 0)} rumah · ${isian.lokasi === "Bawaan" ? "wilayah umum" : (isian.lokasi ?? "—")}`]} />
            <Ringkas langkah={1} onUbah={ke} judul="Kebutuhan listrik" isi={[`${isian.konsumsi || "—"} kWh/hari per rumah`, `${isian.porsiMalam || "—"}% dipakai malam hari`]} />
            <Ringkas
              langkah={2}
              onUbah={ke}
              judul="Baterai"
              isi={
                isian.sumberPaket === "baterai"
                  ? [
                      terpilihList.length ? terpilihList.map((b) => b.kode).join(", ") : "—",
                      terpilihList.length ? `${terpilihList.length} baterai · total ${num(kwhTerpilih)} kWh` : "",
                    ]
                  : ["Profil baterai umum", `${isian.kapasitasPaket || "—"} kWh · SoH ${isian.sohPaket || "—"}%`]
              }
            />
            <Ringkas
              langkah={3}
              onUbah={ke}
              judul="Tujuan"
              isi={[
                PRIORITAS.find((p) => p.k === isian.prioritas)?.t ?? "—",
                `Cadangan ${isian.hariCadangan === "0" ? "tidak ada" : `${isian.hariCadangan} hari`}`,
              ]}
            />
          </dl>
        </Langkah>

        {/* Navigasi */}
        <div className="flex items-center justify-between gap-3 border-t border-ink-100 bg-canvas/60 px-5 py-4 sm:px-8">
          {step === 0 ? (
            <button type="button" onClick={() => leave(ubah?.batal ?? "/perencana")} className={buttonClass("ghost", "md")}>
              Batal
            </button>
          ) : (
            <button type="button" onClick={() => ke(step - 1)} className={buttonClass("ghost", "md")}>
              <ArrowLeft className="size-4" /> Kembali
            </button>
          )}
          <span className="num hidden text-xs text-ink-500 sm:block">
            Langkah {step + 1} dari {LANGKAH.length}
          </span>
          {step < LANGKAH.length - 1 ? (
            <button type="button" onClick={lanjut} className={buttonClass("dark", "md")}>
              Lanjut <ArrowRight className="size-4" />
            </button>
          ) : (
            <SubmitButton pendingText="Menghitung…">{ubah ? "Simpan perubahan" : "Hitung Rencana Energi"}</SubmitButton>
          )}
        </div>
      </Card>
      {dialog}
    </form>
  );
}

/* Setiap langkah tetap dirender (disembunyikan) agar isian tidak hilang dan ikut terkirim. */
function Langkah({ aktif, icon, judul, keterangan, children }: { aktif: boolean; icon: React.ReactNode; judul: string; keterangan: string; children: React.ReactNode }) {
  return (
    <section className={cn("px-5 py-6 sm:px-8 sm:py-8", !aktif && "hidden")} aria-hidden={!aktif}>
      <div className="mb-6 flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-sun-100 text-sun-700">{icon}</span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink-950">{judul}</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-600">{keterangan}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Info({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-5 flex gap-2.5 rounded-xl bg-ink-50 px-4 py-3 text-sm leading-relaxed text-ink-600 ring-1 ring-ink-100">
      <InfoIcon className="mt-0.5 size-4 shrink-0 text-ink-400" />
      <span>{children}</span>
    </p>
  );
}

function Ringkas({ langkah, onUbah, judul, isi }: { langkah: number; onUbah: (i: number) => void; judul: string; isi: string[] }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0">
        <dt className="text-xs font-medium text-ink-500">{judul}</dt>
        {isi.filter(Boolean).map((t) => (
          <dd key={t} className="num text-sm text-ink-900">
            {t}
          </dd>
        ))}
      </div>
      <button type="button" onClick={() => onUbah(langkah)} className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-ink-700 ring-1 ring-ink-200 hover:bg-ink-100">
        <Pencil className="size-3" /> Ubah
      </button>
    </div>
  );
}

/** Lapisan "sedang menghitung" selama formulir dikirim (useFormStatus membaca status form induk). */
function Memproses() {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <div className="absolute inset-0 z-10 grid place-items-center rounded-[var(--radius-card)] bg-surface/80 backdrop-blur-[2px]" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="size-8 animate-spin text-sun-500" />
        <p className="text-sm font-semibold text-ink-900">Sedang menghitung rencana…</p>
        <p className="text-xs text-ink-500">Mohon tunggu, hasil akan terbuka otomatis.</p>
      </div>
    </div>
  );
}
