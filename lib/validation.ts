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
    // Lokasi penyimpanan opsional: provinsi saja tanpa alamat dianggap kosong (lihat updateProfil).
    // Kabupaten/kota baru diwajibkan bila alamat penyimpanan diisi.
    if (d.alamatPenyimpanan && !d.kotaPenyimpanan) {
      ctx.addIssue({
        code: "custom",
        path: [d.provinsiPenyimpanan ? "kotaPenyimpanan" : "provinsiPenyimpanan"],
        message: d.provinsiPenyimpanan ? "Pilih kabupaten/kota lokasi penyimpanan." : "Pilih provinsi lokasi penyimpanan.",
      });
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

// Perencana desa: semua kolom wajib. Parameter teknis (PR, efisiensi, DoD, Wp panel) tidak diisi
// di sini; nilainya dari Parameter Sistem, dan DoD ditentukan oleh prioritas perencanaan.
const rencanaDasar = z.object({
  namaDesa: wajib("Nama desa"),
  nama: z.string().trim().max(120, "Nama rencana maksimal 120 karakter.").optional(),
  jumlahRumah: angkaWajib("Jumlah rumah", (n) => n.int("Jumlah rumah harus bilangan bulat.").min(1, "Jumlah rumah minimal 1.").max(100000, "Jumlah rumah maksimal 100.000.")),
  konsumsi: angkaWajib("Konsumsi per rumah", (n) => n.positive("Konsumsi harus lebih dari 0.").max(100, "Konsumsi maksimal 100 kWh/hari.")),
  porsiMalam: angkaWajib("Pemakaian malam", (n) => n.min(0, "Pemakaian malam 0–100%.").max(100, "Pemakaian malam 0–100%.")),
  lokasi: wajib("Lokasi"),
  hariCadangan: angkaWajib("Hari cadangan", (n) => n.int("Hari cadangan harus bilangan bulat.").min(0, "Hari cadangan 0–10.").max(10, "Hari cadangan 0–10.")),
  sumberPaket: z.enum(["bawaan", "baterai"], "Pilih sumber paket baterai."),
  // Opsional: kosong = rentang harga dari Parameter Sistem.
  hargaSolarMin: angkaWajib("Harga solar terendah", (n) => n.positive("Harga solar harus lebih dari 0.").max(100000, "Harga solar terlalu besar.")).optional(),
  hargaSolarMaks: angkaWajib("Harga solar tertinggi", (n) => n.positive("Harga solar harus lebih dari 0.").max(100000, "Harga solar terlalu besar.")).optional(),
  periode: z.enum(["30", "365"], "Pilih periode perbandingan."),
  prioritas: z.enum(["hemat_diesel", "ketahanan_maksimum", "umur_baterai_maksimum"], "Pilih tujuan utama perencanaan."),
});
const paketBawaan = z.object({
  kapasitasPaket: angkaWajib("Kapasitas per paket", (n) => n.positive("Kapasitas harus lebih dari 0.").max(1000, "Kapasitas maksimal 1.000 kWh.")),
  sohPaket: angkaWajib("SoH paket", (n) => n.min(1, "SoH paket 1–100%.").max(100, "SoH paket 1–100%.")),
});
const paketBaterai = z.object({ bateraiId: z.string("Pilih satu baterai untuk rencana ini.").trim().min(1, "Pilih satu baterai untuk rencana ini.") });

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
  if (dasar.success) {
    const { hargaSolarMin: lo, hargaSolarMaks: hi } = dasar.data;
    if ((lo === undefined) !== (hi === undefined)) errors[lo === undefined ? "hargaSolarMin" : "hargaSolarMaks"] = ["Isi kedua harga, atau kosongkan keduanya."];
    else if (lo !== undefined && hi !== undefined && lo > hi) errors.hargaSolarMaks = ["Harga tertinggi tidak boleh lebih kecil dari harga terendah."];
  }
  if (!dasar.success || Object.keys(errors).length) return { ok: false as const, errors };
  return { ok: true as const, data: { ...dasar.data, ...paket } };
}

// Kompatibilitas & keselamatan: semua kolom wajib agar setiap pemeriksaan (tegangan, daya,
// kondisi baterai) benar-benar dijalankan.
export const kompatSchema = z
  .object({
    vBaterai: angkaWajib("Tegangan baterai", (n) => n.positive("Tegangan harus lebih dari 0.").max(1500, "Tegangan maksimal 1.500 V.")),
    grade: z.enum(["A", "B", "C", "D"], "Pilih grade baterai."),
    soh: angkaWajib("SoH", (n) => n.min(1, "SoH 1–100%.").max(100, "SoH 1–100%.")),
    kapasitas: angkaWajib("Kapasitas", (n) => n.positive("Kapasitas harus lebih dari 0.").max(1000, "Kapasitas maksimal 1.000 kWh.")),
    paket: angkaWajib("Jumlah paket", (n) => n.int("Jumlah paket harus bilangan bulat.").min(1, "Minimal 1 paket.").max(1000, "Maksimal 1.000 paket.")),
    vNominal: angkaWajib("Tegangan nominal", (n) => n.positive("Tegangan harus lebih dari 0.").max(1500, "Tegangan maksimal 1.500 V.")),
    vMin: angkaWajib("Tegangan minimum", (n) => n.positive("Tegangan harus lebih dari 0.").max(1500, "Tegangan maksimal 1.500 V.")),
    vMaks: angkaWajib("Tegangan maksimum", (n) => n.positive("Tegangan harus lebih dari 0.").max(1500, "Tegangan maksimal 1.500 V.")),
    kwInverter: angkaWajib("Daya inverter", (n) => n.positive("Daya harus lebih dari 0.").max(10000, "Daya terlalu besar.")),
    kwPuncak: angkaWajib("Beban puncak", (n) => n.positive("Beban harus lebih dari 0.").max(10000, "Beban terlalu besar.")),
  })
  .refine((d) => d.vMin < d.vMaks, {
    path: ["vMaks"],
    message: "Maksimum harus lebih besar dari minimum.",
    when: (p) => !p.issues.some((i) => i.path?.[0] === "vMin" || i.path?.[0] === "vMaks"),
  })
  .refine((d) => d.vNominal >= d.vMin && d.vNominal <= d.vMaks, {
    path: ["vNominal"],
    message: "Nominal harus di antara minimum dan maksimum.",
    when: (p) => !p.issues.some((i) => ["vMin", "vMaks", "vNominal"].includes(String(i.path?.[0]))),
  });

export const KOMPAT_FIELDS = ["vBaterai", "grade", "soh", "kapasitas", "paket", "vNominal", "vMin", "vMaks", "kwInverter", "kwPuncak"];

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
