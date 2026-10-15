"use client";

import { useActionState, useRef, useState } from "react";
import { z } from "zod";
import { usePathname, useRouter } from "next/navigation";
import { BatteryCharging, CheckCircle2, CircleAlert, CircleX, Cpu, ShieldCheck } from "lucide-react";
import { runCompatibility } from "@/app/actions/kompatibilitas";
import { Pilih } from "@/components/filter-kit";
import { SubmitButton } from "@/components/submit-button";
import { Card, Field, Notice, inputClass } from "@/components/ui";
import { cn } from "@/lib/format";
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
  daftarBaterai,
  daftarRencana,
  riwayat,
}: {
  initial: Record<string, string>;
  bateraiId: string;
  rencanaId: string;
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
    const b = k === "baterai" ? id : bateraiId;
    const r = k === "rencana" ? id : rencanaId;
    if (b) q.set("baterai", b);
    if (r) q.set("rencana", r);
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
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <form
        ref={formRef}
        action={action}
        noValidate
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
        {rencanaId && <input type="hidden" name="rencanaId" value={rencanaId} />}
        {jumlahGalat > 0 ? (
          <Notice tone="danger" className="mb-4" title="Formulir belum lengkap">
            Periksa {jumlahGalat} kolom yang ditandai merah. Semua kolom wajib diisi.
          </Notice>
        ) : (
          state?.message && (
            <Notice tone="danger" className="mb-4">
              {state.message}
            </Notice>
          )
        )}
        <Card className="!p-0">
          {/* Isi otomatis dari data yang sudah ada */}
          <div className="grid gap-3 border-b border-ink-100 bg-ink-50/60 p-4 sm:grid-cols-2 sm:p-5">
            <Field label="Baterai" htmlFor="pilih-baterai">
              <Pilih id="pilih-baterai" value={bateraiId} onChange={(ev) => pilihSumber("baterai", ev.target.value)} className="h-10 text-sm">
                <option value="">Isi manual</option>
                {daftarBaterai.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </Pilih>
            </Field>
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
          </div>

          {/* Baterai */}
          <section className="p-4 sm:p-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
              <BatteryCharging className="size-4 text-leaf-600" /> Baterai
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {isian("vBaterai", "Tegangan", "V", { placeholder: "51,2" })}
              <Field label="Grade" htmlFor="grade" error={e.grade} required>
                <Pilih id="grade" name="grade" defaultValue={v.grade ?? ""} aria-invalid={Boolean(e.grade)} onChange={() => clear("grade")} className="h-10 text-sm">
                  <option value="" disabled>
                    Pilih
                  </option>
                  {["A", "B", "C", "D"].map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </Pilih>
              </Field>
              {isian("soh", "SoH", "%")}
              {isian("kapasitas", "Kapasitas", "kWh")}
              {isian("paket", "Paket", "pkt")}
            </div>
          </section>

          {/* Inverter */}
          <section className="border-t border-ink-100 p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                <Cpu className="size-4 text-sky-600" /> Inverter
              </p>
              <div className="flex flex-wrap gap-1">
                {PRESET.map((p) => (
                  <button type="button" key={p.t} onClick={() => applyPreset(p)} className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-700 hover:bg-ink-200">
                    {p.t}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {isian("vNominal", "Nominal", "V")}
              {isian("vMin", "Minimum", "V")}
              {isian("vMaks", "Maksimum", "V")}
              {isian("kwInverter", "Daya", "kW")}
              {isian("kwPuncak", "Beban puncak", "kW")}
            </div>
          </section>

          <div className="flex items-center justify-between gap-3 border-t border-ink-100 bg-canvas/60 px-4 py-3 sm:px-5">
            <p className="text-xs text-ink-500">
              <span className="text-flame-500">*</span> Semua kolom wajib diisi.
            </p>
            <SubmitButton pendingText="Memeriksa…">
              <ShieldCheck className="size-4" /> Periksa
            </SubmitButton>
          </div>
        </Card>
      </form>

      {/* Hasil + riwayat berdampingan dengan form */}
      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        {h ? (
          <Card className={cn("!p-4 ring-1", STYLE[h.status].soft)}>
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
                <p className="text-xs text-ink-500">Hasil pemeriksaan</p>
                <p className={cn("text-xl font-bold", STYLE[h.status].text)}>{h.label}</p>
              </div>
            </div>
            <ul className="mt-4 space-y-2.5">
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
            <p className="mt-3 text-xs text-ink-500">Tersimpan di riwayat{bateraiId ? " dan paspor baterai" : ""}. Hasil indikatif, bukan sertifikasi.</p>
          </Card>
        ) : (
          <Card className="!p-4">
            <p className="text-sm font-semibold text-ink-900">Yang diperiksa</p>
            <ul className="mt-3 space-y-2.5 text-sm text-ink-600">
              {[
                ["Tegangan", "Tegangan baterai masuk rentang inverter"],
                ["Daya", "Inverter dan baterai sanggup menahan beban puncak"],
                ["Kondisi baterai", "Grade menentukan cara pakai; grade D tidak dipasang"],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-2.5">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ink-300" />
                  <span>
                    <span className="font-medium text-ink-800">{t}</span>
                    <span className="block text-xs text-ink-500">{d}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 rounded-xl bg-ink-50 px-3 py-2 text-xs text-ink-500">Hasil: Layak, Perlu penyesuaian, atau Tidak layak, beserta alasannya.</p>
          </Card>
        )}
        {riwayat}
      </div>
    </div>
  );
}
