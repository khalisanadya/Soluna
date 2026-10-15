"use client";

import Link from "next/link";
import { Loader2, Search } from "lucide-react";
import { Kolom, Pilih, useFilterUrl } from "@/components/filter-kit";
import { buttonClass, inputClass } from "@/components/ui";
import { cn } from "@/lib/format";

/* Filter daftar baterai. Nilai selalu dibaca dari URL, dan setiap perubahan pilihan langsung
   diterapkan. Form diberi key dari query string: Cache Components menyimpan halaman yang
   ditinggalkan (termasuk isi form), jadi tanpa key pilihan lama bisa tertinggal saat kembali
   ke /baterai padahal daftar sudah tidak difilter. */
export function FilterForm({ kimia, pemasok }: { kimia: readonly string[]; pemasok: { id: string; namaPerusahaan: string }[] | null }) {
  // Grade hanya dimiliki baterai yang sudah dinilai.
  const { get, apply, select, pending, pathname, query } = useFilterUrl((q) => {
    if (q.get("status") === "BELUM_DINILAI") q.delete("grade");
  });
  const status = get("status");
  const filtered = ["q", "status", "grade", "kimia", "pemasok"].some((k) => get(k));

  // Admin punya 4 filter; pemasok 3 (tanpa filter pemasok).
  const kolom = pemasok ? "sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1.6fr]" : "sm:grid-cols-3";

  return (
    <form
      key={query}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        apply({ q: String(new FormData(e.currentTarget).get("q") ?? "").trim() });
      }}
      className="mb-4 space-y-3 rounded-[var(--radius-card)] bg-surface p-4 shadow-soft ring-1 ring-ink-200/60"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Kolom label="Cari data" htmlFor="filter-q" className="min-w-0 flex-1">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-400" />
            <input id="filter-q" name="q" type="search" defaultValue={get("q")} placeholder="Kode, merek, model, atau pemasok" className={`${inputClass} pl-10`} />
          </div>
        </Kolom>
        <div className="flex items-center gap-2">
          <button className={buttonClass("dark", "md", "flex-1 sm:flex-none")}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Cari
          </button>
          {filtered && (
            <Link href={pathname} replace scroll={false} className={buttonClass("ghost", "md")}>
              Reset
            </Link>
          )}
        </div>
      </div>

      <div className={cn("grid gap-2", kolom)}>
        <Kolom label="Status penilaian" htmlFor="filter-status">
          <Pilih id="filter-status" {...select("status")}>
            <option value="">Semua status</option>
            <option value="DINILAI">Sudah dinilai</option>
            <option value="BELUM_DINILAI">Belum dinilai</option>
          </Pilih>
        </Kolom>
        <Kolom label="Grade" htmlFor="filter-grade" hint={status === "BELUM_DINILAI" ? "Belum ada grade" : undefined}>
          <Pilih id="filter-grade" {...select("grade")} disabled={status === "BELUM_DINILAI"}>
            <option value="">Semua grade</option>
            {["A", "B", "C", "D"].map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </Pilih>
        </Kolom>
        <Kolom label="Jenis kimia" htmlFor="filter-kimia">
          <Pilih id="filter-kimia" {...select("kimia")}>
            <option value="">Semua jenis</option>
            {kimia.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </Pilih>
        </Kolom>
        {pemasok && (
          <Kolom label="Pemasok" htmlFor="filter-pemasok">
            <Pilih id="filter-pemasok" {...select("pemasok")} title={pemasok.find((p) => p.id === get("pemasok"))?.namaPerusahaan}>
              <option value="">Semua pemasok</option>
              {pemasok.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.namaPerusahaan}
                </option>
              ))}
            </Pilih>
          </Kolom>
        )}
      </div>
    </form>
  );
}
