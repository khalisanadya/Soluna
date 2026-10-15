import Image from "next/image";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { AlertTriangle, CircleAlert, Info, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/format";
import type { Grade } from "@/lib/types";

/* ---------- Identitas ---------- */

export function Logo({ size = 32, withText = true, className }: { size?: number; withText?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image src="/soluna-logo.png" alt="" width={Math.round(size * 0.64)} height={size} priority />
      {withText && <span className="text-[1.05rem] font-extrabold tracking-[0.18em] text-ink-900">SOLUNA</span>}
    </span>
  );
}

/* ---------- Struktur ---------- */

export function Card({
  className,
  tone = "default",
  children,
  ...rest
}: ComponentProps<"div"> & { tone?: "default" | "ink" | "sun" | "muted" }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] p-5 sm:p-6",
        tone === "default" && "bg-surface shadow-soft ring-1 ring-ink-200/60",
        tone === "ink" && "bg-ink-900 text-ink-50 shadow-lift",
        tone === "sun" && "bg-sun-500 text-ink-950 shadow-lift",
        tone === "muted" && "bg-ink-100/70 ring-1 ring-ink-200/60",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <div className="eyebrow mb-2 flex items-center gap-2">{eyebrow}</div>}
        {title && <h1 className="text-[1.75rem] leading-tight font-bold tracking-tight text-ink-950 sm:text-[2.1rem]">{title}</h1>}
        {description && <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function SectionTitle({ title, hint, action }: { title: ReactNode; hint?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-ink-900">{title}</h2>
        {hint && <p className="mt-0.5 text-sm text-ink-500">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- Tombol ---------- */

type Variant = "primary" | "secondary" | "dark" | "ghost" | "danger";
const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[color,background-color,box-shadow,transform] duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap";
const variants: Record<Variant, string> = {
  primary: "bg-sun-500 text-ink-950 hover:bg-sun-400 hover:shadow-[0_8px_20px_-8px_rgb(250_145_4/0.6)] shadow-[inset_0_-2px_0_rgb(0_0_0/0.08)]",
  secondary: "bg-surface text-ink-900 ring-1 ring-ink-200 hover:bg-ink-50",
  dark: "bg-ink-900 text-ink-50 hover:bg-ink-800",
  ghost: "text-ink-700 hover:bg-ink-100",
  danger: "bg-flame-500 text-white hover:bg-flame-600",
};
const sizes = { sm: "h-9 px-4 text-sm", md: "h-11 px-5 text-sm", lg: "h-12 px-6 text-[0.95rem]" };

export function buttonClass(variant: Variant = "primary", size: keyof typeof sizes = "md", className?: string) {
  return cn(buttonBase, variants[variant], sizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: ComponentProps<"button"> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <button className={buttonClass(variant, size, className)} {...rest} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: ComponentProps<typeof Link> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

/* ---------- Label ---------- */

type Tone = "neutral" | "sun" | "leaf" | "flame" | "sky" | "amber" | "ink";
const tones: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-700",
  sun: "bg-sun-100 text-sun-800",
  leaf: "bg-leaf-50 text-leaf-700 ring-1 ring-leaf-100",
  flame: "bg-flame-50 text-flame-600 ring-1 ring-flame-100",
  sky: "bg-sky-50 text-sky-600 ring-1 ring-sky-100",
  amber: "bg-amber-50 text-amber-600 ring-1 ring-amber-100",
  ink: "bg-ink-900 text-ink-50",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}>
      {children}
    </span>
  );
}

export const gradeTone: Record<Grade, { bg: string; text: string; ring: string; hex: string; label: string }> = {
  A: { bg: "bg-leaf-500", text: "text-leaf-700", ring: "ring-leaf-200", hex: "#1f9165", label: "Sangat baik" },
  B: { bg: "bg-sky-500", text: "text-sky-600", ring: "ring-sky-100", hex: "#2f6fde", label: "Baik" },
  C: { bg: "bg-amber-500", text: "text-amber-600", ring: "ring-amber-100", hex: "#c99a06", label: "Cukup" },
  D: { bg: "bg-flame-500", text: "text-flame-600", ring: "ring-flame-100", hex: "#d9533b", label: "Daur ulang" },
};

export function GradeBadge({ grade, size = "md" }: { grade: string | null | undefined; size?: "sm" | "md" | "lg" }) {
  if (!grade) return <Badge tone="neutral">Belum dinilai</Badge>;
  const g = gradeTone[grade as Grade];
  const dim = size === "lg" ? "size-16 text-3xl rounded-2xl" : size === "sm" ? "size-6 text-xs rounded-md" : "size-8 text-sm rounded-lg";
  return (
    <span className={cn("inline-flex items-center justify-center font-bold text-white", g.bg, dim)} title={`Grade ${grade}`}>
      {grade}
    </span>
  );
}

export function IlustrasiTag({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full border border-dashed border-ink-300 px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-ink-500 uppercase", className)}
      title="Data contoh untuk demonstrasi, bukan data desa sebenarnya"
    >
      Ilustrasi
    </span>
  );
}

/* ---------- Angka ---------- */

export function Stat({
  label,
  value,
  unit,
  hint,
  icon,
  accent,
  href,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  icon?: ReactNode;
  accent?: "sun" | "leaf" | "flame" | "sky" | "ink";
  /** Bila diisi, kartu menjadi tautan ke halaman detailnya. */
  href?: string;
  className?: string;
}) {
  const accents = {
    sun: "bg-sun-100 text-sun-700",
    leaf: "bg-leaf-50 text-leaf-600",
    flame: "bg-flame-50 text-flame-600",
    sky: "bg-sky-50 text-sky-600",
    ink: "bg-ink-100 text-ink-700",
  };
  const box = cn(
    "block rounded-[1.25rem] bg-surface p-4 shadow-soft ring-1 ring-ink-200/60 sm:p-5",
    href && "transition-colors hover:ring-ink-300 focus-visible:ring-2 focus-visible:ring-sun-400 focus-visible:outline-none",
    className,
  );
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.8rem] leading-snug font-medium text-ink-500">{label}</p>
        {icon && <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", accents[accent ?? "ink"])}>{icon}</span>}
      </div>
      <p className="num mt-3 text-[1.9rem] leading-none font-medium text-ink-950">
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-ink-500">{unit}</span>}
      </p>
      {hint && <p className="mt-2 text-xs text-ink-500">{hint}</p>}
    </>
  );
  return href ? (
    <Link href={href} className={box}>
      {body}
    </Link>
  ) : (
    <div className={box}>{body}</div>
  );
}

/** Tingkat SoH. Ambang mengikuti batas grade di konfigurasi: ≥ grade A tinggi, < grade C rendah. */
export function tingkatSoh(soh: number, tinggi = 80, rendah = 60) {
  if (soh >= tinggi) return { label: "Tinggi", dot: "bg-leaf-500", cls: "bg-leaf-50 text-leaf-700 ring-leaf-100" };
  if (soh >= rendah) return { label: "Sedang", dot: "bg-amber-500", cls: "bg-amber-50 text-amber-600 ring-amber-100" };
  return { label: "Rendah", dot: "bg-flame-500", cls: "bg-flame-50 text-flame-600 ring-flame-100" };
}

export function SohBadge({ soh, tinggi, rendah }: { soh: number | null | undefined; tinggi?: number; rendah?: number }) {
  if (soh === null || soh === undefined) return <span className="text-ink-400">—</span>;
  const t = tingkatSoh(soh, tinggi, rendah);
  return (
    <span className={cn("num inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-medium ring-1", t.cls)} title={`SoH ${t.label.toLowerCase()}`}>
      <span className={cn("size-1.5 rounded-full", t.dot)} aria-hidden="true" />
      {new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(soh)}%
      <span className="sr-only">({t.label})</span>
    </span>
  );
}

/* ---------- Formulir ---------- */

export const inputClass =
  "h-11 w-full rounded-xl bg-surface px-3.5 text-[0.95rem] text-ink-900 ring-1 ring-ink-200 placeholder:text-ink-400 transition focus:ring-2 focus:ring-sun-400 focus:outline-none aria-[invalid=true]:ring-flame-500";
export const textareaClass = cn(inputClass, "h-auto min-h-24 py-3");

export function Field({
  label,
  hint,
  error,
  htmlFor,
  optional,
  required,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | string[];
  htmlFor?: string;
  optional?: boolean;
  /** Tampilkan tanda wajib (*) di label. */
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const msg = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-sm font-medium text-ink-800">
        {label}
        {required && (
          <span className="text-flame-500" aria-hidden="true">
            *
          </span>
        )}
        {optional && <span className="text-xs font-normal text-ink-400">opsional</span>}
      </label>
      {children}
      {msg ? (
        <p id={htmlFor ? fieldMessageId(htmlFor) : undefined} className="flex items-start gap-1 text-xs font-medium text-flame-600">
          <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {msg}
        </p>
      ) : hint ? (
        <p id={htmlFor ? fieldMessageId(htmlFor) : undefined} className="text-xs text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** id pesan galat/petunjuk sebuah kolom, untuk aria-describedby. */
export function fieldMessageId(htmlFor: string) {
  return `${htmlFor}-pesan`;
}

/* ---------- Status ---------- */

export function Notice({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "warning" | "danger" | "success" | "disclaimer";
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const map = {
    info: { cls: "bg-sky-50 text-sky-600 ring-sky-100", icon: <Info className="size-4" /> },
    warning: { cls: "bg-amber-50 text-amber-600 ring-amber-100", icon: <AlertTriangle className="size-4" /> },
    danger: { cls: "bg-flame-50 text-flame-600 ring-flame-100", icon: <CircleAlert className="size-4" /> },
    success: { cls: "bg-leaf-50 text-leaf-700 ring-leaf-100", icon: <ShieldCheck className="size-4" /> },
    disclaimer: { cls: "bg-ink-100/70 text-ink-600 ring-ink-200", icon: <Info className="size-4" /> },
  }[tone];
  return (
    <div className={cn("flex gap-3 rounded-2xl p-4 text-sm ring-1", map.cls, className)} role={tone === "danger" ? "alert" : undefined}>
      <span className="mt-0.5 shrink-0">{map.icon}</span>
      <div className="min-w-0 leading-relaxed">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(Boolean(title) && "mt-0.5", "text-ink-700")}>{children}</div>}
      </div>
    </div>
  );
}

/** NF-5: hasil adalah estimasi dan tidak menggantikan pemeriksaan teknis. */
export function Disclaimer({ className }: { className?: string }) {
  return (
    <Notice tone="disclaimer" className={className}>
      Hasil SOLUNA adalah <strong>estimasi indikatif</strong> berdasarkan data yang dimasukkan. Hasil ini tidak menggantikan
      pemeriksaan teknis baterai, bukan sertifikasi, dan bukan jaminan keselamatan.
    </Notice>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-ink-300 bg-surface/60 px-6 py-12 text-center", className)}>
      <span className="grid size-12 place-items-center rounded-2xl bg-sun-100 text-sun-700">{icon ?? <Sparkles className="size-5" />}</span>
      <p className="mt-4 font-semibold text-ink-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse-soft rounded-xl bg-ink-200/70", className)} />;
}

export function Progress({ value, max = 100, color = "bg-leaf-500", className }: { value: number; max?: number; color?: string; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-ink-100", className)} role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function KeyValue({ items, className }: { items: [ReactNode, ReactNode][]; className?: string }) {
  return (
    <dl className={cn("divide-y divide-ink-100", className)}>
      {items.map(([k, v], i) => (
        <div key={i} className="flex items-start justify-between gap-4 py-2.5 text-sm">
          <dt className="text-ink-500">{k}</dt>
          <dd className="text-right font-medium text-ink-900">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
