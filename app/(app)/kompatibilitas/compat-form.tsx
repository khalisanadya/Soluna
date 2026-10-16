"use client";

import { useActionState, useRef, useState } from "react";
import { z } from "zod";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { BatteryCharging, CheckCircle2, CircleAlert, CircleX, Cpu, Lock, ShieldCheck } from "lucide-react";
import { runCompatibility } from "@/app/actions/kompatibilitas";
import { Pilih } from "@/components/filter-kit";
import { SubmitButton } from "@/components/submit-button";
import { Card, Field, Notice, inputClass } from "@/components/ui";
import { cn, num } from "@/lib/format";
import { KOMPAT_FIELDS, kompatSchema, pick } from "@/lib/validation";
import type { StatusKompat } from "@/lib/types";

const PRESET = [
  { t: "24 V", nominal: 24, min: 20, maks: 30 },
  { t: "48 V", nominal: 48, min: 40, maks: 60 },
  { t: "Tegangan tinggi", nominal: 350, min: 150, maks: 500 },
];

const STYLE: Record<StatusKompat, { icon: React.ComponentType<{ className?: string }>; bg: string; soft: string; text: string }> = {
  layak: { icon: CheckCircle2, bg: "bg-leaf-500", soft: "bg-leaf-50 ring-leaf-100", text: "text-leaf-700" },
  perlu_penyesuaian: { icon: CircleAlert, bg: "bg-amber-500", soft: "bg-amber-50 ring-amber-100", text: "text-amber-600" },
  tidak_layak: { icon: CircleX, bg: "bg-flame-500", soft: "bg-flame-50 ring-flame-100", text: "text-flame-600" },
};

export function CompatForm({
  initial,
  bateraiId,
  rencanaId,
  kunciRencana,
  ikutRencana,
  dataBaterai,
  daftarBaterai,
  daftarRencana,
  riwayat,
}: {
  initial: Record<string, string>;
  bateraiId: string;
  rencanaId: string;
  kunciRencana: boolean;
  /** Rencana sudah punya baterai: pilihan baterai hanya dari rencana itu. */
  ikutRencana: boolean;
  dataBaterai: { kode: string; tegangan: number | null; grade: string | null; soh: number | null; kapasitas: number; paket: number } | null;
  daftarBaterai: { id: string; label: string }[];
  daftarRencana: { id: string; label: string }[];
  riwayat: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, action] = useActionState(runCompatibility, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [clientErrors, setClientErrors] = useState<Record<string, string[] | undefined>>({});
  const v = { ...initial, ...state?.values };
  const e: Record<string, string[] | undefined> = { ...state?.errors, ...clientErrors };
  const jumlahGalat = Object.values(clientErrors).filter(Boolean).length;
  const clear = (name: string) => {
    if (clientErrors[name]) setClientErrors((p) => ({ ...p, [name]: undefined }));
  };
  const h = state?.hasil;

  // Pilih baterai/rencana → muat ulang dengan data terisi otomatis.
  const pilihSumber = (k: "baterai" | "rencana", id: string) => {
    const q = new URLSearchParams();
    // Ganti rencana → baterai ikut rencana baru (atau kosong bila rencana belum punya baterai).
    const b = k === "baterai" ? id : "";
    const r = k === "rencana" ? id : rencanaId;
    if (b) q.set("baterai", b);
    if (r) q.set("rencana", r);
    if (kunciRencana) q.set("kunci", "1");
    router.replace(q.size ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  const isian = (name: string, label: string, satuan: string, opts: { placeholder?: string } = {}) => (
    <Field label={label} htmlFor={name} error={e[name]} required>
      <div className="relative">
        <input
          id={name}
          name={name}
          inputMode="decimal"
          defaultValue={v[name]}
          placeholder={opts.placeholder}
          aria-invalid={Boolean(e[name])}
          onChange={() => clear(name)}
          className={cn(inputClass, "h-10 pr-12 text-sm")}
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-ink-400">{satuan}</span>
      </div>
    </Field>
  );

  const applyPreset = (p: (typeof PRESET)[number]) => {
    const f = formRef.current;
    if (!f) return;
    (f.elements.namedItem("vNominal") as HTMLInputElement).value = String(p.nominal);
    (f.elements.namedItem("vMin") as HTMLInputElement).value = String(p.min);
    (f.elements.namedItem("vMaks") as HTMLInputElement).value = String(p.maks);
    setClientErrors((x) => ({ ...x, vNominal: undefined, vMin: undefined, vMaks: undefined }));
  };

  return (
    <div className="space-y-4">
      <form
        ref={formRef}
        action={action}
        noValidate
        className="space-y-4"
        onSubmit={(ev) => {
          // Validasi di peramban dengan aturan yang sama dengan server.
          const r = kompatSchema.safeParse(pick(new FormData(ev.currentTarget), KOMPAT_FIELDS));
          if (r.success) return setClientErrors({});
          ev.preventDefault();
          const errors = z.flattenError(r.error).fieldErrors;
          setClientErrors(errors);
          ev.currentTarget.querySelector<HTMLElement>(`[name="${Object.keys(errors)[0]}"]`)?.focus();
        }}
      >
        {bateraiId && <input type="hidden" name="bateraiId" value={bateraiId} />}
        {/* Data baterai dari hasil penilaian; server tetap membacanya ulang dari basis data. */}
        {dataBaterai && (
          <>
            <input type="hidden" name="vBaterai" value={dataBaterai.tegangan ?? ""} />
            <input type="hidden" name="grade" value={dataBaterai.grade ?? ""} />
            <input type="hidden" name="soh" value={dataBaterai.soh ?? ""} />
            <input type="hidden" name="kapasitas" value={dataBaterai.kapasitas} />
            <input type="hidden" name="paket" value={dataBaterai.paket} />
          </>
        )}
        {rencanaId && <input type="hidden" name="rencanaId" value={rencanaId} />}
        {jumlahGalat > 0 ? (
          <Notice tone="danger" title="Formulir belum lengkap">
            Periksa {jumlahGalat} kolom yang ditandai merah.
          </Notice>
        ) : (
          state?.message && <Notice tone="danger">{state.message}</Notice>
        )}

        {/* 1 · Apa yang diperiksa */}
        <Card className="!p-4 sm:!p-5">
          <Judul n={1} teks="Pilih yang akan diperiksa" />
          <div className="grid gap-3 sm:grid-cols-2">
            {kunciRencana ? (
              <Field label="Rencana desa">
                <div className="flex h-10 items-center justify-between gap-2 rounded-xl bg-ink-50 px-3.5 text-sm ring-1 ring-ink-200">
                  <span className="flex min-w-0 items-center gap-2 text-ink-800">
                    <Lock className="size-3.5 shrink-0 text-ink-400" />
                    <span className="truncate">{daftarRencana.find((r) => r.id === rencanaId)?.label}</span>
                  </span>
                  <Link href={`/perencana/${rencanaId}`} className="shrink-0 text-xs font-semibold text-sun-700 hover:underline">
                    Kembali
                  </Link>
                </div>
              </Field>
            ) : (
              <Field label="Rencana desa" htmlFor="pilih-rencana">
                <Pilih id="pilih-rencana" value={rencanaId} onChange={(ev) => pilihSumber("rencana", ev.target.value)} className="h-10 text-sm">
                  <option value="">Tanpa rencana</option>
                  {daftarRencana.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </Pilih>
              </Field>
            )}
            {ikutRencana && daftarBaterai.length <= 1 ? (
              <Field label="Baterai" required error={e.bateraiId} hint="Mengikuti baterai yang dipilih di rencana desa.">
                <div className="flex h-10 items-center gap-2 rounded-xl bg-ink-50 px-3.5 text-sm ring-1 ring-ink-200">
                  <Lock className="size-3.5 shrink-0 text-ink-400" />
                  <span className={cn("truncate", daftarBaterai[0] ? "text-ink-800" : "text-ink-500")}>
                    {daftarBaterai[0]?.label ?? "Baterai rencana ini belum dinilai"}
                  </span>
                </div>
              </Field>
            ) : (
              <Field
                label="Baterai"
                htmlFor="pilih-baterai"
                required
                error={e.bateraiId}
                hint={ikutRencana ? "Hanya baterai yang dipilih di rencana desa." : undefined}
              >
                <Pilih id="pilih-baterai" value={bateraiId} onChange={(ev) => pilihSumber("baterai", ev.target.value)} className="h-10 text-sm">
                  <option value="" disabled>
                    Pilih baterai…
                  </option>
                  <optgroup label={ikutRencana ? "Dipilih untuk rencana ini" : "Baterai yang sudah dinilai"}>
                    {daftarBaterai.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.label}
                      </option>
                    ))}
                  </optgroup>
                </Pilih>
              </Field>
            )}
          </div>
        </Card>

        {/* 2 · Baterai dan inverter berdampingan, dengan baris yang setara */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="!p-4 sm:!p-5">
            <Judul n={2} teks="Data baterai" icon={<BatteryCharging className="size-4 text-leaf-600" />} ket="Otomatis dari hasil penilaian" />
            {dataBaterai ? (
              <>
                <Kelompok judul="Tegangan">
                  <Nilai label="Tegangan baterai" nilai={dataBaterai.tegangan ? `${num(dataBaterai.tegangan)} V` : "Belum ada"} salah={!dataBaterai.tegangan} />
                </Kelompok>
                <Kelompok judul="Kapasitas & kondisi">
                  <div className="grid grid-cols-2 gap-2">
                    <Nilai label="Kapasitas" nilai={`${num(dataBaterai.kapasitas)} kWh`} />
                    <Nilai label="Jumlah paket" nilai={`${dataBaterai.paket} paket`} />
                    <Nilai label="Grade" nilai={dataBaterai.grade ?? "—"} />
                    <Nilai label="SoH" nilai={dataBaterai.soh !== null ? `${num(dataBaterai.soh)}%` : "—"} />
                  </div>
                </Kelompok>
                <p className="mt-3 text-xs text-ink-400">
                  Dari penilaian {dataBaterai.kode}
                  {rencanaId ? "; jumlah paket dari rencana desa" : ""}. Tidak bisa diubah.
                </p>
                {!dataBaterai.tegangan && (
                  <Notice tone="warning" className="mt-3">
                    Tegangan baterai belum diisi pemasok, jadi belum bisa diperiksa.
                  </Notice>
                )}
              </>
            ) : (
              <p className="rounded-xl bg-ink-50 px-3 py-6 text-center text-sm text-ink-500">Pilih baterai di langkah 1. Datanya terisi otomatis.</p>
            )}
          </Card>

          <Card className="!p-4 sm:!p-5">
            <Judul n={3} teks="Data inverter" icon={<Cpu className="size-4 text-sky-600" />} ket="Alat yang akan dipasang" />
            <Kelompok
              judul="Tegangan yang diterima"
              aksi={
                <div className="flex flex-wrap gap-1">
                  {PRESET.map((p) => (
                    <button type="button" key={p.t} onClick={() => applyPreset(p)} className="rounded-full bg-ink-100 px-2 py-0.5 text-[0.7rem] font-medium text-ink-700 hover:bg-ink-200">
                      {p.t}
                    </button>
                  ))}
                </div>
              }
            >
              <div className="grid grid-cols-3 gap-2">
                {isian("vNominal", "Nominal", "V")}
                {isian("vMin", "Minimum", "V")}
                {isian("vMaks", "Maksimum", "V")}
              </div>
            </Kelompok>
            <Kelompok judul="Daya">
              <div className="grid grid-cols-2 gap-2">
                {isian("kwInverter", "Daya inverter", "kW")}
                {isian("kwPuncak", "Beban puncak desa", "kW")}
              </div>
            </Kelompok>
            {rencanaId && <p className="mt-3 text-xs text-ink-400">Daya dan beban puncak terisi dari rencana desa.</p>}
          </Card>
        </div>

        {/* Tombol periksa */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] bg-surface px-4 py-3 shadow-soft ring-1 ring-ink-200/60 sm:px-5">
          <p className="text-xs text-ink-500">Diperiksa: tegangan baterai cocok dengan inverter, daya cukup untuk beban puncak, dan kondisi baterai layak.</p>
          <SubmitButton pendingText="Memeriksa…" disabled={!dataBaterai?.tegangan}>
            <ShieldCheck className="size-4" /> Periksa kecocokan
          </SubmitButton>
        </div>
      </form>

      {/* 4 · Hasil (selebar penuh), riwayat di bawahnya */}
      <div className="space-y-4">
        <div>
          {h ? (
            <Card className={cn("!p-4 ring-1 sm:!p-5", STYLE[h.status].soft)}>
              <div className="flex items-center gap-3">
                {(() => {
                  const S = STYLE[h.status];
                  return (
                    <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl text-white", S.bg)}>
                      <S.icon className="size-6" />
                    </span>
                  );
                })()}
                <div>
                  <p className="text-xs text-ink-500">Hasil pemeriksaan{dataBaterai ? ` · ${dataBaterai.kode}` : ""}</p>
                  <p className={cn("text-xl font-bold", STYLE[h.status].text)}>{h.label}</p>
                </div>
              </div>
              <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {h.pemeriksaan.map((p) => {
                  const S = STYLE[p.status];
                  return (
                    <li key={p.nama} className="flex gap-2.5 rounded-xl bg-surface p-3 text-sm">
                      <S.icon className={cn("mt-0.5 size-4 shrink-0", S.text)} />
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink-900">{p.nama}</span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-ink-600">{p.alasan}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-xs text-ink-500">Tersimpan di riwayat{rencanaId ? " dan langkah berikutnya rencana desa" : ""}. Hasil indikatif, bukan sertifikasi.</p>
            </Card>
          ) : (
            <Card className="flex flex-col justify-center !p-5 text-center">
              <ShieldCheck className="mx-auto size-8 text-ink-300" />
              <p className="mt-2 text-sm font-semibold text-ink-800">Hasil muncul di sini</p>
              <p className="mt-1 text-xs text-ink-500">Tekan &ldquo;Periksa kecocokan&rdquo;. Hasilnya: Layak, Perlu penyesuaian, atau Tidak layak, beserta alasannya.</p>
            </Card>
          )}
        </div>
        <div>{riwayat}</div>
      </div>
    </div>
  );
}

function Judul({ n, teks, icon, ket }: { n: number; teks: string; icon?: React.ReactNode; ket?: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="num grid size-6 shrink-0 place-items-center rounded-full bg-ink-900 text-xs text-white">{n}</span>
      <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
        {icon}
        {teks}
      </span>
      {ket && <span className="ml-auto text-xs text-ink-400">{ket}</span>}
    </div>
  );
}

function Kelompok({ judul, aksi, children }: { judul: string; aksi?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mt-3 first:mt-0">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-ink-500">{judul}</p>
        {aksi}
      </div>
      {children}
    </div>
  );
}

function Nilai({ label, nilai, salah }: { label: string; nilai: string; salah?: boolean }) {
  return (
    <div className="rounded-xl bg-ink-50 px-3 py-2 ring-1 ring-ink-100">
      <p className="text-[0.7rem] text-ink-500">{label}</p>
      <p className={cn("num text-sm font-semibold", salah ? "text-flame-600" : "text-ink-900")}>{nilai}</p>
    </div>
  );
}
