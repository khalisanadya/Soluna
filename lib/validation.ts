import { z } from "zod";
import { JENIS_KIMIA, PROVINSI, isKabupatenKotaDi } from "./wilayah";

// Skema per kolom diekspor agar formulir di klien memakai aturan yang persis sama dengan server.
export const wajib = (label: string) => z.string(`${label} wajib diisi.`).trim().min(1, `${label} wajib diisi.`);

/** Nomor Indonesia: diawali 0, 62, atau +62, lalu 8–13 digit. Spasi dan tanda hubung diabaikan. */
export const teleponSchema = z
  .string("Nomor telepon wajib diisi.")
  .trim()
  .min(1, "Nomor telepon wajib diisi.")
  .transform((s) => s.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^(\+?62|0)\d{8,13}$/, "Nomor telepon tidak valid. Gunakan format Indonesia, mis. 081234567890 atau +6281234567890."));

/** Email dirapikan (trim + huruf kecil) sebelum diperiksa formatnya, agar konsisten saat disimpan dan dicari. */
export const emailSchema = z
  .string("Alamat email wajib diisi.")
  .trim()
  .toLowerCase()
  .min(1, "Alamat email wajib diisi.")
  .pipe(z.email("Format email tidak valid. Contoh: nama@email.com"));

export const PASSWORD_MIN = 8;
export const passwordSchema = z
  .string("Kata sandi wajib diisi.")
  .min(1, "Kata sandi wajib diisi.")
  .min(PASSWORD_MIN, `Kata sandi minimal ${PASSWORD_MIN} karakter.`);

export const usernameSchema = z
  .string("Nama pengguna wajib diisi.")
  .trim()
  .min(1, "Nama pengguna wajib diisi.");

const opsional = z
  .string()
  .trim()
  .transform((s) => (s === "" ? undefined : s))
  .optional();

export const akunSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  email: emailSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string("Kata sandi wajib diisi.").min(1, "Kata sandi wajib diisi."),
});

export const profilPemasokSchema = z
  .object({
    namaPenanggungJawab: wajib("Nama penanggung jawab"),
    namaPerusahaan: wajib("Nama perusahaan"),
    alamat: wajib("Alamat lengkap"),
    kota: wajib("Kabupaten/kota"),
    provinsi: z.enum(PROVINSI, "Pilih provinsi."),
    telepon: teleponSchema,
    emailPerusahaan: emailSchema,
    deskripsi: opsional,
    jenisBaterai: opsional,
    alamatPenyimpanan: opsional,
    kotaPenyimpanan: opsional,
    provinsiPenyimpanan: z
      .string()
      .transform((s) => (s === "" ? undefined : s))
      .pipe(z.enum(PROVINSI).optional())
      .optional(),
  })
  // Kabupaten/kota harus benar-benar berada di provinsi yang dipilih.
  .superRefine((d, ctx) => {
    if (d.kota && !isKabupatenKotaDi(d.provinsi, d.kota)) {
      ctx.addIssue({ code: "custom", path: ["kota"], message: "Pilih kabupaten/kota dari daftar provinsi yang dipilih." });
    }
    if (d.provinsiPenyimpanan && !d.kotaPenyimpanan) {
      ctx.addIssue({ code: "custom", path: ["kotaPenyimpanan"], message: "Pilih kabupaten/kota lokasi penyimpanan." });
    } else if (d.kotaPenyimpanan && !isKabupatenKotaDi(d.provinsiPenyimpanan, d.kotaPenyimpanan)) {
      ctx.addIssue({
        code: "custom",
        path: [d.provinsiPenyimpanan ? "kotaPenyimpanan" : "provinsiPenyimpanan"],
        message: d.provinsiPenyimpanan ? "Pilih kabupaten/kota dari daftar provinsi yang dipilih." : "Pilih provinsi lokasi penyimpanan.",
      });
    }
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
  for (const [k, v] of fd.entries()) if (typeof v === "string" && k !== "password" && k !== "konfirmasi" && !k.startsWith("$")) out[k] = v;
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
