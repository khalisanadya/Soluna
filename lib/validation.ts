import { z } from "zod";
import { JENIS_KIMIA, PROVINSI } from "./wilayah";

const wajib = (label: string) => z.string(`${label} wajib diisi.`).trim().min(1, `${label} wajib diisi.`);
const telepon = z
  .string("Telepon wajib diisi.")
  .trim()
  .transform((s) => s.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^(\+?62|0)\d{8,13}$/, "Format telepon tidak valid. Contoh: 081234567890 atau 021-5551234."));
const opsional = z
  .string()
  .trim()
  .transform((s) => (s === "" ? undefined : s))
  .optional();

export const akunSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Nama pengguna minimal 3 karakter.")
    .max(32, "Nama pengguna maksimal 32 karakter.")
    .regex(/^[a-z0-9._-]+$/i, "Gunakan huruf, angka, titik, garis bawah, atau tanda hubung."),
  password: z.string().min(8, "Kata sandi minimal 8 karakter."),
  email: z.email("Format email tidak valid.").trim().toLowerCase(),
});

export const profilPemasokSchema = z.object({
  namaPenanggungJawab: wajib("Nama penanggung jawab"),
  namaPerusahaan: wajib("Nama perusahaan"),
  alamat: wajib("Alamat"),
  kota: wajib("Kota/kabupaten"),
  provinsi: z.enum(PROVINSI, "Pilih provinsi."),
  telepon,
  emailPerusahaan: z.email("Format email tidak valid.").trim().toLowerCase(),
  deskripsi: opsional,
  jenisBaterai: opsional,
  alamatPenyimpanan: opsional,
  kotaPenyimpanan: opsional,
  provinsiPenyimpanan: z
    .string()
    .transform((s) => (s === "" ? undefined : s))
    .pipe(z.enum(PROVINSI).optional())
    .optional(),
});

export const bateraiSchema = z.object({
  jenisKimia: z.enum(JENIS_KIMIA, "Pilih jenis kimia."),
  merek: wajib("Merek"),
  model: wajib("Model"),
  kapasitasAwalKwh: z.coerce.number("Kapasitas awal harus berupa angka.").positive("Kapasitas awal harus lebih dari 0.").max(1000, "Kapasitas terlalu besar (maks. 1.000 kWh)."),
  usiaTahun: z.coerce.number("Usia harus berupa angka.").min(0, "Usia tidak boleh negatif.").max(30, "Usia maksimal 30 tahun.").optional(),
  kondisi: wajib("Kondisi"),
  teganganNominalV: z.coerce.number("Tegangan harus berupa angka.").positive("Tegangan harus lebih dari 0.").max(1500).optional(),
  jumlahSiklus: z.coerce.number().int("Jumlah siklus harus bilangan bulat.").min(0).max(20000).optional(),
  catatan: opsional,
});

export type FieldErrors = Record<string, string[] | undefined>;

export type FormState = {
  ok?: boolean;
  message?: string;
  errors?: FieldErrors;
  values?: Record<string, string>;
} | undefined;

export function formValues(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string" && k !== "password" && !k.startsWith("$")) out[k] = v;
  return out;
}

/** Ambil objek dari FormData; string kosong untuk kolom angka opsional dibuang. */
export function pick(fd: FormData, keys: string[]): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const k of keys) {
    const v = fd.get(k);
    out[k] = typeof v === "string" ? (v.trim() === "" ? undefined : v.trim().replace(/^(-?\d+),(\d+)$/, "$1.$2")) : undefined;
  }
  return out;
}
