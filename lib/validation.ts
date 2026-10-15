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

/** Angka wajib: kosong → "wajib diisi"; bukan angka → "harus berupa angka". */
const angkaWajib = (label: string, aturan: (n: z.ZodCoercedNumber<string>) => z.ZodType<number, string>) =>
  z.string(`${label} wajib diisi.`).pipe(aturan(z.coerce.number<string>(`${label} harus berupa angka.`)));

// Semua kolom baterai wajib: data ini menjadi dasar penilaian kesehatan dan pemeriksaan kompatibilitas.
export const bateraiSchema = z.object({
  jenisKimia: z.enum(JENIS_KIMIA, "Pilih jenis kimia."),
  merek: wajib("Merek"),
  model: wajib("Model"),
  kapasitasAwalKwh: angkaWajib("Kapasitas awal", (n) => n.positive("Kapasitas awal harus lebih dari 0.").max(1000, "Kapasitas terlalu besar (maks. 1.000 kWh).")),
  usiaTahun: angkaWajib("Usia pemakaian", (n) => n.min(0, "Usia tidak boleh negatif.").max(30, "Usia maksimal 30 tahun.")),
  kondisi: wajib("Kondisi"),
  teganganNominalV: angkaWajib("Tegangan nominal", (n) => n.positive("Tegangan harus lebih dari 0.").max(1500, "Tegangan maksimal 1.500 V.")),
  jumlahSiklus: angkaWajib("Jumlah siklus", (n) => n.int("Jumlah siklus harus bilangan bulat.").min(0, "Jumlah siklus tidak boleh negatif.").max(20000, "Jumlah siklus maksimal 20.000.")),
  catatan: wajib("Catatan").min(10, "Catatan minimal 10 karakter: tulis riwayat pemakaian atau kondisi fisik."),
});

// Penilaian baterai (Modul A): semua data uji wajib, agar SoH, sisa umur, dan keyakinan
// dihitung dari data nyata, bukan nilai bawaan.
export const penilaianSchema = z
  .object({
    bateraiId: wajib("Baterai").pipe(z.string()),
    kapasitasAwal: angkaWajib("Kapasitas awal", (n) => n.positive("Kapasitas awal harus lebih dari 0.").max(1000, "Kapasitas awal maksimal 1.000 kWh.")),
    kapasitasAktual: angkaWajib("Kapasitas aktual", (n) => n.min(0, "Kapasitas aktual tidak boleh negatif.").max(1000, "Kapasitas aktual maksimal 1.000 kWh.")),
    hambatan: angkaWajib("Hambatan internal", (n) => n.positive("Hambatan internal harus lebih dari 0.").max(10000, "Hambatan internal maksimal 10.000 mΩ.")),
    siklus: angkaWajib("Jumlah siklus", (n) => n.int("Jumlah siklus harus bilangan bulat.").min(0, "Jumlah siklus tidak boleh negatif.").max(20000, "Jumlah siklus maksimal 20.000.")),
    kimia: z.enum(JENIS_KIMIA, "Pilih jenis kimia."),
    usia: angkaWajib("Usia pemakaian", (n) => n.min(0, "Usia tidak boleh negatif.").max(30, "Usia maksimal 30 tahun.")),
    dod: angkaWajib("Kedalaman pengosongan", (n) => n.min(1, "Kedalaman pengosongan 1–100%.").max(100, "Kedalaman pengosongan 1–100%.")),
    pengisianCepat: angkaWajib("Porsi pengisian cepat", (n) => n.min(0, "Porsi pengisian cepat 0–100%.").max(100, "Porsi pengisian cepat 0–100%.")),
    suhu: angkaWajib("Suhu rata-rata", (n) => n.min(-20, "Suhu −20 sampai 80 °C.").max(80, "Suhu −20 sampai 80 °C.")),
  })
  .refine((d) => d.kapasitasAktual <= d.kapasitasAwal * 1.05, {
    path: ["kapasitasAktual"],
    message: "Kapasitas aktual tidak boleh melebihi kapasitas awal.",
    // Tetap diperiksa walau kolom lain masih kosong, selama kedua kapasitas sudah valid.
    when: (payload) => !payload.issues.some((i) => i.path?.[0] === "kapasitasAwal" || i.path?.[0] === "kapasitasAktual"),
  });

export const PENILAIAN_FIELDS = ["bateraiId", "kapasitasAwal", "kapasitasAktual", "hambatan", "siklus", "kimia", "usia", "dod", "pengisianCepat", "suhu"];

// Perencana desa: semua kolom wajib (nilai bawaan sudah terisi di formulir).
const rencanaDasar = z.object({
  namaDesa: wajib("Nama desa"),
  nama: wajib("Nama rencana"),
  jumlahRumah: angkaWajib("Jumlah rumah", (n) => n.int("Jumlah rumah harus bilangan bulat.").min(1, "Jumlah rumah minimal 1.").max(100000, "Jumlah rumah maksimal 100.000.")),
  konsumsi: angkaWajib("Konsumsi per rumah", (n) => n.positive("Konsumsi harus lebih dari 0.").max(100, "Konsumsi maksimal 100 kWh/hari.")),
  porsiMalam: angkaWajib("Pemakaian malam", (n) => n.min(0, "Pemakaian malam 0–100%.").max(100, "Pemakaian malam 0–100%.")),
  lokasi: wajib("Lokasi"),
  hariCadangan: angkaWajib("Hari cadangan", (n) => n.int("Hari cadangan harus bilangan bulat.").min(0, "Hari cadangan 0–10.").max(10, "Hari cadangan 0–10.")),
  sumberPaket: z.enum(["bawaan", "baterai"], "Pilih sumber paket baterai."),
  hargaSolarMin: angkaWajib("Harga solar terendah", (n) => n.positive("Harga solar harus lebih dari 0.").max(100000, "Harga solar terlalu besar.")),
  hargaSolarMaks: angkaWajib("Harga solar tertinggi", (n) => n.positive("Harga solar harus lebih dari 0.").max(100000, "Harga solar terlalu besar.")),
  periode: z.enum(["30", "365"], "Pilih periode perbandingan."),
  psh: angkaWajib("Jam matahari efektif", (n) => n.min(0.5, "Jam matahari efektif 0,5–12 jam.").max(12, "Jam matahari efektif 0,5–12 jam.")),
  pr: angkaWajib("Rasio kinerja panel", (n) => n.min(10, "Rasio kinerja 10–100%.").max(100, "Rasio kinerja 10–100%.")),
  efisiensi: angkaWajib("Efisiensi konversi", (n) => n.min(10, "Efisiensi 10–100%.").max(100, "Efisiensi 10–100%.")),
  dod: angkaWajib("Batas pengosongan", (n) => n.min(10, "Batas pengosongan 10–100%.").max(100, "Batas pengosongan 10–100%.")),
  wpPanel: angkaWajib("Kapasitas per panel", (n) => n.min(50, "Kapasitas panel 50–1.000 Wp.").max(1000, "Kapasitas panel 50–1.000 Wp.")),
});
const paketBawaan = z.object({
  kapasitasPaket: angkaWajib("Kapasitas per paket", (n) => n.positive("Kapasitas harus lebih dari 0.").max(1000, "Kapasitas maksimal 1.000 kWh.")),
  sohPaket: angkaWajib("SoH paket", (n) => n.min(1, "SoH paket 1–100%.").max(100, "SoH paket 1–100%.")),
});
const paketBaterai = z.object({ bateraiId: wajib("Baterai").pipe(z.string()) });

export const RENCANA_FIELDS = [...Object.keys(rencanaDasar.shape), "kapasitasPaket", "sohPaket", "bateraiId"];

/** Validasi rencana; kolom paket bergantung pada sumber paket yang dipilih. */
export function validasiRencana(raw: Record<string, string | undefined>) {
  const dasar = rencanaDasar.safeParse(raw);
  const errors: FieldErrors = dasar.success ? {} : z.flattenError(dasar.error).fieldErrors;
  let paket: { kapasitasPaket?: number; sohPaket?: number; bateraiId?: string } = {};
  if (raw.sumberPaket === "baterai") {
    const r = paketBaterai.safeParse(raw);
    if (r.success) paket = r.data;
    else Object.assign(errors, z.flattenError(r.error).fieldErrors);
  } else {
    const r = paketBawaan.safeParse(raw);
    if (r.success) paket = r.data;
    else Object.assign(errors, z.flattenError(r.error).fieldErrors);
  }
  if (dasar.success && dasar.data.hargaSolarMin > dasar.data.hargaSolarMaks) errors.hargaSolarMaks = ["Harga tertinggi tidak boleh lebih kecil dari harga terendah."];
  if (!dasar.success || Object.keys(errors).length) return { ok: false as const, errors };
  return { ok: true as const, data: { ...dasar.data, ...paket } };
}

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
