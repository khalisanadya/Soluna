"use client";

import { useActionState, useEffect, useState } from "react";
import { BatteryCharging, ClipboardCheck, CloudSun, Fuel, Pencil, Sun, Wallet } from "lucide-react";
import { saveConfig } from "@/app/actions/konfigurasi";
import { SubmitButton } from "@/components/submit-button";
import { Button, Card, Field, Notice, inputClass } from "@/components/ui";
import { CONFIG_FIELDS, CONFIG_GROUPS, PSH_PREFIX, type ConfigField, type GroupKey } from "@/lib/config-fields";
import { cn, num } from "@/lib/format";

const ICON: Record<GroupKey, React.ReactNode> = {
  penilaian: <ClipboardCheck className="size-4" />,
  surya: <Sun className="size-4" />,
  baterai: <BatteryCharging className="size-4" />,
  biaya: <Wallet className="size-4" />,
  genset: <Fuel className="size-4" />,
  cuaca: <CloudSun className="size-4" />,
};

/** Nilai untuk mode lihat: angka besar memakai pemisah ribuan. */
function tampil(f: { unit?: string }, nilai: string | undefined) {
  if (nilai === undefined || nilai === "") return "—";
  const n = Number(nilai);
  const angka = Number.isFinite(n) ? num(n, 2) : nilai;
  return f.unit?.startsWith("Rp") ? `Rp${angka}` : angka;
}

export function ConfigForm({ values, lokasi, versi }: { values: Record<string, string>; lokasi: { nama: string; psh: number }[]; versi: number }) {
  const [state, action] = useActionState(saveConfig, undefined);
  const [edit, setEdit] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [putaran, setPutaran] = useState(0); // ganti key → isian kembali ke nilai tersimpan
  const [porsi, setPorsi] = useState(() => ({ k: values.porsi_kritis, p: values.porsi_penting, n: values.porsi_nyaman }));
  const e = state?.errors ?? {};
  const totalPorsi = [porsi.k, porsi.p, porsi.n].reduce((t, x) => t + (Number(String(x).replace(",", ".")) || 0), 0);

  // Setelah berhasil disimpan, kembali ke mode lihat.
  useEffect(() => {
    if (!state?.ok) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mengikuti hasil aksi server
    setEdit(false);
    setDirty(false);
  }, [state]);

  const batal = () => {
    setEdit(false);
    setDirty(false);
    setKonfirmasi(false);
    setPutaran((x) => x + 1);
    setPorsi({ k: values.porsi_kritis, p: values.porsi_penting, n: values.porsi_nyaman });
  };

  const isian = (f: Pick<ConfigField, "name" | "label" | "unit">, nilai: string | undefined, onChange?: (v: string) => void) =>
    edit ? (
      <Field key={f.name} label={f.label} htmlFor={f.name} error={e[f.name]}>
        <div className="relative">
          <input
            id={f.name}
            name={f.name}
            inputMode="decimal"
            defaultValue={nilai}
            aria-invalid={Boolean(e[f.name])}
            onChange={(ev) => onChange?.(ev.target.value)}
            className={cn(inputClass, "h-10 text-sm", f.unit && "pr-20")}
          />
          {f.unit && <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-ink-400">{f.unit}</span>}
        </div>
      </Field>
    ) : (
      <div key={f.name} className="min-w-0">
        <dt className="text-xs text-ink-500">{f.label}</dt>
        <dd className="num mt-0.5 font-semibold text-ink-900">
          {tampil(f, nilai)} {f.unit && !f.unit.startsWith("Rp") && <span className="text-sm font-normal text-ink-500">{f.unit}</span>}
          {f.unit?.startsWith("Rp") && <span className="text-sm font-normal text-ink-500">{f.unit.slice(2)}</span>}
        </dd>
      </div>
    );

  return (
    <form
      key={`${versi}-${putaran}`}
      action={action}
      noValidate
      onChange={() => setDirty(true)}
      className="space-y-4"
    >
      {/* Bar atas: status + tombol ubah */}
      {!edit && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-ink-600">
            <span className="size-2 rounded-full bg-leaf-500" /> Versi <span className="font-semibold text-ink-900">v{versi}</span> sedang dipakai
          </p>
          <Button type="button" onClick={() => setEdit(true)}>
            <Pencil className="size-4" /> Ubah parameter
          </Button>
        </div>
      )}
      {state?.message && <Notice tone={state.ok ? "success" : "danger"}>{state.message}</Notice>}

      {CONFIG_GROUPS.map((g) => (
        <Card key={g.key} className={cn("!p-0", edit && "ring-2 ring-sun-200")}>
          <div className="flex items-start gap-3 border-b border-ink-100 px-5 py-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sun-100 text-sun-700">{ICON[g.key]}</span>
            <div>
              <h2 className="text-sm font-semibold text-ink-900">{g.title}</h2>
              <p className="text-xs text-ink-500">{g.desc}</p>
            </div>
          </div>
          {(() => {
            const fields = CONFIG_FIELDS.filter((f) => f.group === g.key).map((f) =>
              f.name.startsWith("porsi_")
                ? isian(f, values[f.name], (val) => setPorsi((p) => ({ ...p, [f.name === "porsi_kritis" ? "k" : f.name === "porsi_penting" ? "p" : "n"]: val })))
                : isian(f, values[f.name]),
            );
            return edit ? <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">{fields}</div> : <dl className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2 xl:grid-cols-3">{fields}</dl>;
          })()}

          {g.key === "cuaca" && edit && (
            <p className={cn("mx-5 mb-5 -mt-1 rounded-lg px-3 py-2 text-xs", Math.abs(totalPorsi - 100) <= 0.5 ? "bg-leaf-50 text-leaf-700" : "bg-flame-50 text-flame-600")}>
              Jumlah porsi beban: <span className="num font-semibold">{num(totalPorsi, 1)}%</span>
              {Math.abs(totalPorsi - 100) > 0.5 && " — harus 100%"}
            </p>
          )}

          {g.key === "surya" && lokasi.length > 0 && (
            <div className="border-t border-ink-100 px-5 py-4">
              <p className="mb-3 text-xs font-medium text-ink-500">Jam matahari per wilayah</p>
              {edit ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {lokasi.map((l) => isian({ name: `${PSH_PREFIX}${l.nama}`, label: l.nama === "Bawaan" ? "Umum / belum tahu" : l.nama, unit: "jam" }, String(l.psh)))}
                </div>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {lokasi.map((l) => (
                    <li key={l.nama} className="rounded-full bg-ink-50 px-3 py-1 text-sm ring-1 ring-ink-100">
                      <span className="text-ink-600">{l.nama === "Bawaan" ? "Umum" : l.nama}</span> <span className="num font-semibold text-ink-900">{num(l.psh)} jam</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>
      ))}

      {/* Bar simpan: hanya saat mengubah */}
      {edit && (
        <div className="sticky bottom-20 z-20 md:bottom-4">
          <div className="flex flex-col gap-3 rounded-2xl bg-ink-900 p-3 text-white shadow-lift sm:flex-row sm:items-center">
            {konfirmasi ? (
              <>
                <span className="flex-1 px-1 text-sm">Buang perubahan yang belum disimpan?</span>
                <button type="button" onClick={() => setKonfirmasi(false)} className="h-10 rounded-full px-4 text-sm font-semibold text-ink-200 hover:bg-white/10">
                  Lanjut mengubah
                </button>
                <button type="button" onClick={batal} className="h-10 rounded-full bg-flame-500 px-4 text-sm font-semibold text-white hover:bg-flame-600">
                  Ya, buang
                </button>
              </>
            ) : (
              <>
                <span className={cn("flex items-center gap-2 px-1 text-xs", dirty ? "text-sun-300" : "text-ink-400")}>
                  <span className={cn("size-2 rounded-full", dirty ? "bg-sun-400" : "bg-ink-500")} />
                  {dirty ? "Ada perubahan" : "Mode ubah"}
                </span>
                <input name="catatan" placeholder="Catatan perubahan (opsional)" className="h-10 min-w-0 flex-1 rounded-xl bg-white/10 px-3 text-sm text-white placeholder:text-ink-400 focus:ring-2 focus:ring-sun-400 focus:outline-none" />
                <button type="button" onClick={() => (dirty ? setKonfirmasi(true) : batal())} className="h-10 rounded-full px-4 text-sm font-semibold text-ink-200 hover:bg-white/10">
                  Batal
                </button>
                <SubmitButton pendingText="Menyimpan…">Simpan sebagai v{versi + 1}</SubmitButton>
              </>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
