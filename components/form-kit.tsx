"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { ChevronDown, Eye, EyeOff } from "lucide-react";
import type { z } from "zod";
import { cn } from "@/lib/format";
import type { FormState } from "@/lib/validation";
import { kabupatenKota, PROVINSI } from "@/lib/wilayah";
import { Field, fieldMessageId, inputClass } from "./ui";

/* ---------- Validasi ---------- */

/** Pesan galat pertama dari skema zod (skema yang sama dipakai di server), atau undefined bila valid. */
export function zodError(schema: z.ZodType, value: unknown): string | undefined {
  const r = schema.safeParse(value === "" ? undefined : value);
  return r.success ? undefined : r.error.issues[0]?.message;
}

/**
 * Status kolom formulir terkendali.
 * - Galat klien muncul setelah kolom ditinggalkan (blur) atau formulir dikirim, dan hilang
 *   begitu isian menjadi valid.
 * - Galat dari server ditampilkan sampai pengguna mengubah kolom tersebut.
 */
export function useFormFields<K extends string>(
  initial: Record<K, string>,
  validate: (name: K, values: Record<K, string>) => string | undefined,
  server: FormState,
) {
  const [values, setValues] = useState(initial);
  const [touched, setTouched] = useState<ReadonlySet<K>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [edited, setEdited] = useState<ReadonlySet<K>>(new Set());
  const [seen, setSeen] = useState(server);
  if (server !== seen) {
    // Respons server baru: galat server berlaku lagi untuk semua kolom.
    setSeen(server);
    setEdited(new Set());
  }

  const add = (set: ReadonlySet<K>, k: K) => (set.has(k) ? set : new Set(set).add(k));

  const error = (name: K): string | undefined => {
    const client = touched.has(name) || submitted ? validate(name, values) : undefined;
    return client ?? (edited.has(name) ? undefined : server?.errors?.[name]?.[0]);
  };

  return {
    values,
    error,
    set(name: K, value: string) {
      setValues((v) => ({ ...v, [name]: value }));
      setEdited((s) => add(s, name));
    },
    /** Tandai kolom tersentuh; kolom kosong yang belum diisi tidak langsung dimarahi. */
    blur(name: K) {
      if (values[name] !== "" || edited.has(name)) setTouched((s) => add(s, name));
    },
    /** Periksa semua kolom (urut sesuai tampilan); kembalikan nama kolom pertama yang tidak valid. */
    checkAll(names: readonly K[]): K | undefined {
      setSubmitted(true);
      return names.find((n) => validate(n, values));
    },
    /** Atribut aksesibilitas standar untuk input sebuah kolom. */
    aria(name: K) {
      const invalid = Boolean(error(name));
      return { "aria-invalid": invalid, "aria-describedby": fieldMessageId(name) };
    },
  };
}

export function focusField(name: string | undefined) {
  if (!name) return;
  const el = document.getElementById(name);
  if (el) {
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
}

/** Fokuskan kolom pertama yang ditolak server setiap kali respons baru datang. */
export function useFocusServerError(state: FormState, order: readonly string[]) {
  const last = useRef(state);
  useEffect(() => {
    if (state === last.current) return;
    last.current = state;
    focusField(order.find((n) => state?.errors?.[n]?.length));
  }, [state, order]);
}

/**
 * Bungkus Server Action agar kegagalan jaringan/server tampil sebagai pesan, bukan halaman galat.
 * Sinyal internal Next.js (redirect setelah berhasil, notFound) tetap diteruskan.
 */
export function guardAction(action: (prev: FormState, fd: FormData) => Promise<FormState>) {
  return async (prev: FormState, fd: FormData): Promise<FormState> => {
    try {
      return await action(prev, fd);
    } catch (err) {
      const digest = typeof err === "object" && err && "digest" in err ? String((err as { digest: unknown }).digest) : "";
      if (digest.startsWith("NEXT_")) throw err;
      return {
        ...prev,
        errors: undefined,
        message:
          typeof navigator !== "undefined" && !navigator.onLine
            ? "Tidak ada koneksi internet. Data Anda belum terkirim — periksa koneksi lalu coba lagi."
            : "Terjadi gangguan koneksi ke server. Data Anda belum terkirim — silakan coba lagi.",
      };
    }
  };
}

/* ---------- Kata sandi ---------- */

export function PasswordInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={cn(inputClass, "pr-12", className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
        aria-pressed={visible}
        aria-controls={props.id}
        className="absolute inset-y-0 right-1 my-auto grid size-9 place-items-center rounded-lg text-ink-500 transition hover:bg-ink-100 hover:text-ink-900"
      >
        {visible ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
      </button>
    </div>
  );
}

/* ---------- Wilayah ---------- */

/** Label ringkas namun tetap jelas saat terpilih: "Kab. Bekasi" vs "Kota Bekasi". Nilai tetap nama resmi. */
const label = (nama: string) => nama.replace(/^Kabupaten (Administrasi )?/, "Kab. ").replace(/^Kota Administrasi /, "Kota ");

/**
 * Dropdown provinsi → kabupaten/kota yang saling bergantung (data lokal Kepmendagri 2025).
 * Kabupaten/kota nonaktif sampai provinsi dipilih, dan dikosongkan saat provinsi berganti.
 */
export function RegionSelect({
  provinsiName,
  kotaName,
  provinsi,
  kota,
  onProvinsi,
  onKota,
  onBlur,
  provinsiError,
  kotaError,
  required,
  labelProvinsi = "Provinsi",
  labelKota = "Kabupaten/kota",
}: {
  provinsiName: string;
  kotaName: string;
  provinsi: string;
  kota: string;
  onProvinsi: (value: string) => void;
  onKota: (value: string) => void;
  onBlur?: (name: string) => void;
  provinsiError?: string;
  kotaError?: string;
  required?: boolean;
  labelProvinsi?: string;
  labelKota?: string;
}) {
  const daftar = kabupatenKota(provinsi);
  const urut = (a: string, b: string) => label(a).localeCompare(label(b), "id");
  const kabupaten = daftar.filter((k) => !k.startsWith("Kota ")).sort(urut);
  const kotaList = daftar.filter((k) => k.startsWith("Kota ")).sort(urut);
  const selectClass = cn(
    inputClass,
    "cursor-pointer appearance-none pr-10",
    "disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400",
  );

  return (
    <>
      <Field label={labelProvinsi} htmlFor={provinsiName} error={provinsiError} required={required} optional={!required}>
        <div className="relative">
        <select
          id={provinsiName}
          name={provinsiName}
          value={provinsi}
          onChange={(e) => {
            onProvinsi(e.target.value);
            onKota("");
          }}
          onBlur={() => onBlur?.(provinsiName)}
          aria-invalid={Boolean(provinsiError)}
          aria-describedby={fieldMessageId(provinsiName)}
          aria-required={required}
          className={selectClass}
        >
          <option value="">Pilih provinsi</option>
          {PROVINSI.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ink-500" aria-hidden="true" />
        </div>
      </Field>
      <Field
        label={labelKota}
        htmlFor={kotaName}
        error={kotaError}
        required={required}
        optional={!required}
        hint={provinsi ? `${daftar.length} kabupaten/kota di ${provinsi}` : "Pilih provinsi terlebih dahulu."}
      >
        <div className="relative">
        <select
          id={kotaName}
          name={kotaName}
          value={kota}
          disabled={!provinsi}
          onChange={(e) => onKota(e.target.value)}
          onBlur={() => onBlur?.(kotaName)}
          aria-invalid={Boolean(kotaError)}
          aria-describedby={fieldMessageId(kotaName)}
          aria-required={required}
          className={selectClass}
        >
          <option value="">{provinsi ? "Pilih kabupaten/kota" : "Pilih provinsi dulu"}</option>
          {kabupaten.length > 0 && (
            <optgroup label="Kabupaten">
              {kabupaten.map((k) => (
                <option key={k} value={k}>
                  {label(k)}
                </option>
              ))}
            </optgroup>
          )}
          {kotaList.length > 0 && (
            <optgroup label="Kota">
              {kotaList.map((k) => (
                <option key={k} value={k}>
                  {label(k)}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ink-500" aria-hidden="true" />
        </div>
      </Field>
    </>
  );
}
