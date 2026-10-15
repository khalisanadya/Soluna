"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowLeft, ArrowRight, BatteryCharging, Check, CircleAlert, Fuel, Home, Info as InfoIcon, Loader2, Pencil, ShieldCheck, Sprout, Zap } from "lucide-react";
import { runPlan } from "@/app/actions/perencana";
import { Pilih } from "@/components/filter-kit";
import { SubmitButton } from "@/components/submit-button";
import { Badge, Card, Field, GradeBadge, Notice, SohBadge, buttonClass, inputClass } from "@/components/ui";
import { useUnsavedGuard } from "@/components/unsaved-guard";
import { cn, num, umur } from "@/lib/format";
import { RENCANA_FIELDS, pick, validasiRencana } from "@/lib/validation";
import type { Prioritas } from "@/lib/types";

export type PlanDefaults = { kapasitasPaket: number; sohPaket: number; hariCadangan: number; hargaSolarMin: number; hargaSolarMaks: number };

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
  { judul: "Desa", fields: ["namaDesa", "nama", "lokasi", "jumlahRumah"] },
  { judul: "Kebutuhan listrik", fields: ["konsumsi", "porsiMalam"] },
  { judul: "Baterai", fields: ["sumberPaket", "bateraiId", "kapasitasPaket", "sohPaket"] },
  { judul: "Tujuan & biaya", fields: ["prioritas", "hariCadangan", "hargaSolarMin", "hargaSolarMaks", "periode"] },
  { judul: "Ringkasan", fields: [] },
] as const satisfies { judul: string; fields: readonly string[] }[];

const PRIORITAS: { k: Prioritas; t: string; d: string; icon: React.ReactNode; warna: string }[] = [
  { k: "hemat_diesel", t: "Hemat diesel", d: "Kurangi pemakaian solar genset.", icon: <Fuel className="size-5" />, warna: "bg-sun-100 text-sun-700" },
  { k: "ketahanan_maksimum", t: "Ketahanan maksimum", d: "Listrik tetap menyala saat mendung.", icon: <ShieldCheck className="size-5" />, warna: "bg-sky-50 text-sky-600" },
  { k: "umur_baterai_maksimum", t: "Umur baterai maksimum", d: "Baterai lebih awet dipakai.", icon: <Sprout className="size-5" />, warna: "bg-leaf-50 text-leaf-600" },
];

const langkahDari = (keys: string[]) => LANGKAH.findIndex((l) => (l.fields as readonly string[]).some((f) => keys.includes(f)));

export function PlanForm({
  lokasi,
  baterai,
  defaults,
  dodPrioritas,
}: {
  lokasi: { nama: string; psh: number }[];
  baterai: BateraiPilihan[];
  defaults: PlanDefaults;
  dodPrioritas: Record<Prioritas, number>;
}) {
  const [state, action] = useActionState(runPlan, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [dirty, setDirty] = useState(false);
  const [step, setStep] = useState(0);
  const [maks, setMaks] = useState(0);
  const [clientErrors, setClientErrors] = useState<Record<string, string[] | undefined>>({});
  const [isian, setIsian] = useState<Record<string, string>>({});
  const { leave, dialog, lepas } = useUnsavedGuard(dirty);
  const v: Record<string, string | undefined> = state?.values ?? {};
  const e = { ...state?.errors, ...clientErrors };
  const err = (name: string) => e[name];

  const tersedia = baterai.filter((b) => !b.diblokir);
  const [lok, setLok] = useState(v.lokasi ?? "Bawaan");
  const [sumber, setSumber] = useState<"bawaan" | "baterai">((v.sumberPaket as "baterai") ?? (tersedia.length ? "baterai" : "bawaan"));
  const [bateraiId, setBateraiId] = useState(v.bateraiId ?? "");
  const [prioritas, setPrioritas] = useState<Prioritas>((v.prioritas as Prioritas) ?? "hemat_diesel");
  const [cadangan, setCadangan] = useState(v.hariCadangan ?? String(defaults.hariCadangan));
  const psh = lokasi.find((l) => l.nama === lok)?.psh;
  const terpilih = baterai.find((b) => b.id === bateraiId);

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
            <Field label="Nama rencana" htmlFor="nama" error={err("nama")} optional>
              <input id="nama" name="nama" defaultValue={v.nama} placeholder="mis. Tahap 1" autoComplete="off" aria-invalid={Boolean(err("nama"))} onChange={() => clear("nama")} className={inputClass} />
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
        <Langkah aktif={step === 2} icon={<BatteryCharging className="size-5" />} judul="Baterai" keterangan="Pilih baterai bekas yang sudah dinilai.">
          <input type="hidden" name="sumberPaket" value={sumber} />
          <input type="hidden" name="bateraiId" value={sumber === "baterai" ? bateraiId : ""} />
          {err("bateraiId") && sumber === "baterai" && (
            <p className="mb-2 flex items-center gap-1 text-xs font-medium text-flame-600">
              <CircleAlert className="size-3.5" /> {err("bateraiId")![0]}
            </p>
          )}

          <div className="overflow-hidden rounded-2xl ring-1 ring-ink-200" role="radiogroup" aria-label="Baterai">
            <ul className="divide-y divide-ink-100">
              {/* Pilihan pertama: isi data baterai sendiri (tetap terlihat tanpa menggulir). */}
              <li>
                <button
                  type="button"
                  role="radio"
                  aria-checked={sumber === "bawaan"}
                  onClick={() => {
                    setSumber("bawaan");
                    setDirty(true);
                    setClientErrors((p) => ({ ...p, bateraiId: undefined }));
                  }}
                  className={cn("flex w-full items-center gap-3 px-4 py-3 text-left transition", sumber === "bawaan" ? "bg-sun-50" : "hover:bg-ink-50")}
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-500">
                    <Pencil className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink-900">Isi manual</span>
                    <span className="block text-xs text-ink-500">{baterai.length ? "Isi kapasitas dan SoH sendiri bila baterai tidak ada di daftar" : "Belum ada baterai yang dinilai"}</span>
                  </span>
                  <span className={cn("grid size-5 place-items-center rounded-full ring-2", sumber === "bawaan" ? "ring-sun-500" : "ring-ink-300")} aria-hidden="true">
                    {sumber === "bawaan" && <span className="size-2.5 rounded-full bg-sun-500" />}
                  </span>
                </button>
                {sumber === "bawaan" && (
                  <div className="grid gap-4 border-t border-ink-100 bg-sun-50/50 px-4 py-4 sm:grid-cols-2">
                    <Field label="Kapasitas per paket" htmlFor="kapasitasPaket" error={err("kapasitasPaket")} required>
                      {angka("kapasitasPaket", "kWh", undefined, { placeholder: `mis. ${defaults.kapasitasPaket}` })}
                    </Field>
                    <Field label="Kesehatan (SoH)" htmlFor="sohPaket" error={err("sohPaket")} required>
                      {angka("sohPaket", "%", undefined, { placeholder: `mis. ${defaults.sohPaket}` })}
                    </Field>
                  </div>
                )}
              </li>
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
                const aktif = sumber === "baterai" && bateraiId === b.id;
                return (
                  <li key={b.id}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={aktif}
                      disabled={Boolean(b.diblokir)}
                      title={b.diblokir ?? undefined}
                      onClick={() => {
                        setSumber("baterai");
                        setBateraiId(b.id);
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
                      <span className={cn("grid size-5 place-items-center rounded-full ring-2", aktif ? "ring-sun-500" : "ring-ink-300")} aria-hidden="true">
                        {aktif && <span className="size-2.5 rounded-full bg-sun-500" />}
                      </span>
                    </button>
                  </li>
                );
              })}

            </ul>
          </div>
        </Langkah>

        {/* Langkah 4 — Tujuan & biaya */}
        <Langkah aktif={step === 3} icon={<ShieldCheck className="size-5" />} judul="Tujuan & biaya" keterangan="Pilih yang paling penting untuk desa.">
          <input type="hidden" name="prioritas" value={prioritas} />
          <div className="grid gap-3 md:grid-cols-3" role="radiogroup" aria-label="Tujuan perencanaan">
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

          <div className="mt-6">
            <p className="mb-2 text-sm font-medium text-ink-800">
              Cadangan saat mendung <span className="text-flame-500">*</span>
            </p>
            <input type="hidden" name="hariCadangan" value={cadangan} />
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Hari cadangan">
              {["0", "1", "2", "3"].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={cadangan === n}
                  onClick={() => (setCadangan(n), setDirty(true))}
                  className={cn("h-9 rounded-full px-4 text-sm font-medium ring-1 transition", cadangan === n ? "bg-ink-900 text-white ring-ink-900" : "bg-surface text-ink-700 ring-ink-200 hover:bg-ink-50")}
                >
                  {n === "0" ? "Tanpa cadangan" : `${n} hari`}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 border-t border-ink-100 pt-5">
            <p className="text-sm font-medium text-ink-800">
              Bandingkan dengan genset diesel <span className="text-xs font-normal text-ink-400">opsional</span>
            </p>
            <p className="mb-3 text-xs text-ink-500">
              Isi harga solar di desa untuk melihat mana yang lebih murah. Kosongkan untuk memakai harga standar Rp{num(defaults.hargaSolarMin, 0)}–{num(defaults.hargaSolarMaks, 0)}.
            </p>
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Harga solar terendah" htmlFor="hargaSolarMin" error={err("hargaSolarMin")}>
                {angka("hargaSolarMin", "Rp/liter", undefined, { inputMode: "numeric", placeholder: String(defaults.hargaSolarMin) })}
              </Field>
              <Field label="Harga solar tertinggi" htmlFor="hargaSolarMaks" error={err("hargaSolarMaks")}>
                {angka("hargaSolarMaks", "Rp/liter", undefined, { inputMode: "numeric", placeholder: String(defaults.hargaSolarMaks) })}
              </Field>
              <Field label="Bandingkan biaya" htmlFor="periode" error={err("periode")}>
                <Pilih id="periode" name="periode" defaultValue={v.periode ?? "30"}>
                  <option value="30">Per bulan</option>
                  <option value="365">Per tahun</option>
                </Pilih>
              </Field>
            </div>
          </div>
        </Langkah>

        {/* Langkah 5 — Ringkasan */}
        <Langkah aktif={step === 4} icon={<Check className="size-5" />} judul="Periksa data" keterangan="Klik Ubah bila ada yang salah.">
          <dl className="divide-y divide-ink-100 rounded-2xl ring-1 ring-ink-200">
            <Ringkas langkah={0} onUbah={ke} judul="Desa" isi={[`${isian.namaDesa || "—"}${isian.nama ? ` · ${isian.nama}` : ""}`, `${num(Number(isian.jumlahRumah), 0)} rumah · ${isian.lokasi === "Bawaan" ? "wilayah umum" : (isian.lokasi ?? "—")}`]} />
            <Ringkas langkah={1} onUbah={ke} judul="Kebutuhan listrik" isi={[`${isian.konsumsi || "—"} kWh/hari per rumah`, `${isian.porsiMalam || "—"}% dipakai malam hari`]} />
            <Ringkas
              langkah={2}
              onUbah={ke}
              judul="Baterai"
              isi={
                isian.sumberPaket === "baterai"
                  ? [terpilih ? `${terpilih.kode} · ${terpilih.nama}` : "—", terpilih ? `${num(terpilih.kapasitas)} kWh · SoH ${num(terpilih.soh)}% · grade ${terpilih.grade}` : ""]
                  : ["Profil baterai umum", `${isian.kapasitasPaket || "—"} kWh · SoH ${isian.sohPaket || "—"}%`]
              }
            />
            <Ringkas
              langkah={3}
              onUbah={ke}
              judul="Tujuan & biaya"
              isi={[
                `${PRIORITAS.find((p) => p.k === isian.prioritas)?.t ?? "—"} · cadangan ${isian.hariCadangan === "0" ? "tidak ada" : `${isian.hariCadangan} hari`}`,
                isian.hargaSolarMin
                  ? `Solar Rp${num(Number(isian.hargaSolarMin), 0)}–Rp${num(Number(isian.hargaSolarMaks), 0)}/liter · per ${isian.periode === "365" ? "tahun" : "bulan"}`
                  : `Solar harga standar · per ${isian.periode === "365" ? "tahun" : "bulan"}`,
              ]}
            />
          </dl>
        </Langkah>

        {/* Navigasi */}
        <div className="flex items-center justify-between gap-3 border-t border-ink-100 bg-canvas/60 px-5 py-4 sm:px-8">
          {step === 0 ? (
            <button type="button" onClick={() => leave("/perencana")} className={buttonClass("ghost", "md")}>
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
            <SubmitButton pendingText="Menghitung…">Hitung Rencana Energi</SubmitButton>
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
