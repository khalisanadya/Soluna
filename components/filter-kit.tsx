"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/format";
import { inputClass } from "./ui";

/* Perangkat filter daftar data. Nilai selalu dibaca dari URL dan setiap perubahan langsung
   diterapkan (kembali ke halaman 1). Form pemakai sebaiknya diberi key={query} karena
   Cache Components menyimpan isi form halaman yang ditinggalkan. */

export function useFilterUrl(aturan?: (q: URLSearchParams) => void) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();
  const get = (k: string) => sp.get(k) ?? "";

  function apply(changes: Record<string, string>) {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    aturan?.(next);
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  const select = (name: string) => ({
    name,
    value: get(name),
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => apply({ [name]: e.target.value }),
  });

  return { get, apply, select, pending, pathname, query: sp.toString() };
}

export function Kolom({ label, htmlFor, hint, className, children }: { label: string; htmlFor: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="flex items-baseline justify-between gap-2 text-xs font-medium text-ink-600">
        {label}
        {hint && <span className="font-normal text-ink-400">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

/* Select dengan panah sendiri: ruang kanan (pr-10) selalu disisakan untuk panah,
   jadi teks pilihan tidak tertimpa atau terpotong oleh panah bawaan browser. */
export function Pilih({ className, children, ...rest }: React.ComponentProps<"select">) {
  return (
    <div className="relative min-w-0">
      <select {...rest} className={cn(inputClass, "w-full appearance-none truncate pr-10 disabled:cursor-not-allowed disabled:opacity-50", className)}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ink-500" aria-hidden="true" />
    </div>
  );
}
