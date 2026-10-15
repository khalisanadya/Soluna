"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Loader2, Search } from "lucide-react";
import { buttonClass, inputClass } from "@/components/ui";
import { cn } from "@/lib/format";

/* Filter daftar baterai. Nilai selalu dibaca dari URL, dan setiap perubahan pilihan langsung
   diterapkan. Form diberi key dari query string: Cache Components menyimpan halaman yang
   ditinggalkan (termasuk isi form), jadi tanpa key pilihan lama bisa tertinggal saat kembali
   ke /baterai padahal daftar sudah tidak difilter. */
export function FilterForm({ kimia, pemasok }: { kimia: readonly string[]; pemasok: { id: string; namaPerusahaan: string }[] | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();
  const get = (k: string) => sp.get(k) ?? "";
  const status = get("status");
  const filtered = ["q", "status", "grade", "kimia", "pemasok"].some((k) => get(k));

  function apply(changes: Record<string, string>) {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    // Grade hanya dimiliki baterai yang sudah dinilai.
    if (next.get("status") === "BELUM_DINILAI") next.delete("grade");
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  const select = (name: string) => ({
    name,
    value: get(name),
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => apply({ [name]: e.target.value }),
  });

  return (
    <form
      key={sp.toString()}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        apply({ q: String(new FormData(e.currentTarget).get("q") ?? "").trim() });
      }}
      className="mb-4 grid gap-2 rounded-[var(--radius-card)] bg-surface p-3 shadow-soft ring-1 ring-ink-200/60 sm:grid-cols-2 lg:flex lg:items-center"
    >
      <label className="relative lg:flex-1">
        <span className="sr-only">Cari baterai</span>
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-400" />
        <input name="q" type="search" defaultValue={get("q")} placeholder="Cari kode, merek, model, pemasok…" className={`${inputClass} pl-10`} />
      </label>
      <select {...select("status")} className={`${inputClass} lg:w-40`} aria-label="Status">
        <option value="">Semua status</option>
        <option value="DINILAI">Sudah dinilai</option>
        <option value="BELUM_DINILAI">Belum dinilai</option>
      </select>
      <select
        {...select("grade")}
        disabled={status === "BELUM_DINILAI"}
        title={status === "BELUM_DINILAI" ? "Baterai yang belum dinilai belum memiliki grade" : undefined}
        className={`${inputClass} disabled:opacity-50 lg:w-32`}
        aria-label="Grade"
      >
        <option value="">Semua grade</option>
        {["A", "B", "C", "D"].map((g) => (
          <option key={g} value={g}>
            Grade {g}
          </option>
        ))}
      </select>
      <select {...select("kimia")} className={`${inputClass} lg:w-32`} aria-label="Jenis kimia">
        <option value="">Semua kimia</option>
        {kimia.map((k) => (
          <option key={k}>{k}</option>
        ))}
      </select>
      {pemasok && (
        <select {...select("pemasok")} className={`${inputClass} lg:w-52`} aria-label="Pemasok">
          <option value="">Semua pemasok</option>
          {pemasok.map((p) => (
            <option key={p.id} value={p.id}>
              {p.namaPerusahaan}
            </option>
          ))}
        </select>
      )}
      <div className="flex items-center gap-2">
        <button className={buttonClass("dark", "md", "flex-1 lg:flex-none")}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Cari
        </button>
        {filtered && (
          <Link href={pathname} replace scroll={false} className={cn(buttonClass("ghost", "md"))}>
            Reset
          </Link>
        )}
      </div>
    </form>
  );
}
