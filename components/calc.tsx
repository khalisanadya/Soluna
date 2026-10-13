import { Calculator, ChevronDown, MessageSquareText, ShieldCheck, TriangleAlert } from "lucide-react";
import { cn, num } from "@/lib/format";
import type { Langkah } from "@/lib/types";
import type { Penjelasan } from "@/lib/engine";

function hasil(v: Langkah["hasil"]) {
  if (v === null) return "Tak terbatas";
  return typeof v === "number" ? num(v, 2) : v;
}

/** "Detail Perhitungan": rumus, substitusi, hasil — dapat dilihat pengguna (NF-9). */
export function CalcDetail({
  steps,
  title = "Detail Perhitungan",
  defaultOpen = false,
  meta,
  className,
}: {
  steps: Langkah[];
  title?: string;
  defaultOpen?: boolean;
  meta?: string;
  className?: string;
}) {
  return (
    <details open={defaultOpen} className={cn("group rounded-[var(--radius-card)] bg-surface shadow-soft ring-1 ring-ink-200/60", className)}>
      <summary className="flex cursor-pointer list-none items-center gap-3 p-5 select-none sm:px-6 [&::-webkit-details-marker]:hidden">
        <span className="grid size-9 place-items-center rounded-xl bg-ink-900 text-sun-400">
          <Calculator className="size-4" />
        </span>
        <span className="flex-1">
          <span className="block font-semibold text-ink-900">{title}</span>
          <span className="block text-xs text-ink-500">{meta ?? `${steps.length} langkah · rumus deterministik, dapat diverifikasi`}</span>
        </span>
        <ChevronDown className="size-5 text-ink-400 transition group-open:rotate-180" />
      </summary>
      <ol className="space-y-2 px-3 pb-4 sm:px-4">
        {steps.map((s, i) => (
          <li key={i} className="grid gap-x-4 gap-y-1 rounded-2xl bg-ink-50 p-4 ring-1 ring-ink-100 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                <span className="num text-xs text-ink-400">{String(i + 1).padStart(2, "0")}</span>
                {s.label}
              </p>
              <p className="mt-1 font-mono text-[0.78rem] leading-relaxed break-words text-ink-600">{s.rumus}</p>
              {s.substitusi && <p className="font-mono text-[0.78rem] leading-relaxed break-words text-sun-700">= {s.substitusi}</p>}
            </div>
            <p className={cn("num text-right font-medium text-ink-950", typeof s.hasil === "string" && s.hasil.length > 6 ? "text-sm sm:max-w-48" : "text-lg sm:text-xl")}>
              {hasil(s.hasil)}
              {s.satuan && <span className="ml-1 text-xs font-normal text-ink-500">{s.satuan}</span>}
            </p>
          </li>
        ))}
      </ol>
    </details>
  );
}

/** AI-1..AI-4: penjelasan bahasa sederhana; angka diperiksa terhadap hasil hitungan. */
export function ExplanationCard({ penjelasan, className }: { penjelasan: Penjelasan | null | undefined; className?: string }) {
  if (!penjelasan) return null;
  const lolos = penjelasan.cek_angka === "lolos";
  return (
    <div className={cn("rounded-[var(--radius-card)] bg-ink-900 p-5 text-ink-50 shadow-lift sm:p-6", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg bg-sun-500 text-ink-950">
          <MessageSquareText className="size-4" />
        </span>
        <p className="font-semibold">Penjelasan sederhana</p>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[0.7rem] font-medium text-ink-200">
          {lolos ? <ShieldCheck className="size-3.5 text-leaf-300" /> : <TriangleAlert className="size-3.5 text-amber-100" />}
          {lolos ? "Cek angka otomatis: lolos" : "Cek angka gagal — memakai template"}
        </span>
      </div>
      <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-100">{penjelasan.teks}</p>
      <p className="mt-3 text-xs text-ink-400">
        {penjelasan.sumber === "model_bahasa" ? "Dirangkai model bahasa" : "Dirangkai dari template"}. Semua angka berasal dari
        rumus dan model prediksi, bukan dari model bahasa.
      </p>
    </div>
  );
}

export function DefaultsUsed({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="rounded-2xl bg-amber-50 p-4 text-sm ring-1 ring-amber-100">
      <p className="font-semibold text-amber-600">Memakai nilai bawaan</p>
      <p className="mt-1 text-ink-700">
        Parameter berikut tidak diisi, jadi SOLUNA memakai estimasi bawaan dari konfigurasi: {items.join(", ")}.
      </p>
    </div>
  );
}
