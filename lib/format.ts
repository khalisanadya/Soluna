const nf = (digits: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits, minimumFractionDigits: 0 });

export function num(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return nf(digits).format(value);
}

/** Durasi hari; null dari mesin hitung berarti tidak terbatas. */
export function days(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined) return "Tak terbatas";
  return `${num(value, digits)} hari`;
}

export function rupiah(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export function rupiahShort(value: number): string {
  if (value >= 1e9) return `Rp${num(value / 1e9, 1)} M`;
  if (value >= 1e6) return `Rp${num(value / 1e6, 1)} jt`;
  if (value >= 1e3) return `Rp${num(value / 1e3, 0)} rb`;
  return `Rp${num(value, 0)}`;
}

export function tanggal(value: Date | string | null | undefined, withTime = false): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(d);
}

export function bulanTahun(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(d);
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Ambil angka dari FormData; kosong → undefined (mode data minimal). */
export function formNumber(fd: FormData, key: string): number | undefined {
  const raw = String(fd.get(key) ?? "").trim().replace(",", ".");
  if (raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

export function formString(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}
