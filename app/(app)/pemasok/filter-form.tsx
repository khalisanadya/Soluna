"use client";

import Link from "next/link";
import { Loader2, Search } from "lucide-react";
import { Kolom, Pilih, useFilterUrl } from "@/components/filter-kit";
import { buttonClass, inputClass } from "@/components/ui";

/** Filter daftar pemasok, dengan pola yang sama seperti filter Data Baterai. */
export function PemasokFilter({ provinsi, kimia }: { provinsi: readonly string[]; kimia: readonly string[] }) {
  const { get, apply, select, pending, pathname, query } = useFilterUrl();
  const filtered = ["q", "provinsi", "kimia"].some((k) => get(k));

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
            <input id="filter-q" name="q" type="search" defaultValue={get("q")} placeholder="Perusahaan, penanggung jawab, atau kota" className={`${inputClass} pl-10`} />
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
      <div className="grid gap-2 sm:grid-cols-2">
        <Kolom label="Wilayah" htmlFor="filter-provinsi">
          <Pilih id="filter-provinsi" {...select("provinsi")}>
            <option value="">Semua wilayah</option>
            {provinsi.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </Pilih>
        </Kolom>
        <Kolom label="Jenis baterai" htmlFor="filter-kimia">
          <Pilih id="filter-kimia" {...select("kimia")}>
            <option value="">Semua jenis</option>
            {kimia.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </Pilih>
        </Kolom>
      </div>
    </form>
  );
}
