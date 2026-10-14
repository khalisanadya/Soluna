import { KABUPATEN_KOTA } from "./wilayah-data";

export const PROVINSI = [
  "Aceh",
  "Sumatera Utara",
  "Sumatera Barat",
  "Riau",
  "Kepulauan Riau",
  "Jambi",
  "Bengkulu",
  "Sumatera Selatan",
  "Kepulauan Bangka Belitung",
  "Lampung",
  "Banten",
  "DKI Jakarta",
  "Jawa Barat",
  "Jawa Tengah",
  "DI Yogyakarta",
  "Jawa Timur",
  "Bali",
  "Nusa Tenggara Barat",
  "Nusa Tenggara Timur",
  "Kalimantan Barat",
  "Kalimantan Tengah",
  "Kalimantan Selatan",
  "Kalimantan Timur",
  "Kalimantan Utara",
  "Sulawesi Utara",
  "Gorontalo",
  "Sulawesi Tengah",
  "Sulawesi Barat",
  "Sulawesi Selatan",
  "Sulawesi Tenggara",
  "Maluku",
  "Maluku Utara",
  "Papua",
  "Papua Barat",
  "Papua Barat Daya",
  "Papua Tengah",
  "Papua Pegunungan",
  "Papua Selatan",
] as const;

export type Provinsi = (typeof PROVINSI)[number];

// Pemeriksaan saat kompilasi: setiap provinsi punya daftar kabupaten/kota sendiri.
const DAFTAR_KAB_KOTA: Record<Provinsi, readonly string[]> = KABUPATEN_KOTA;

export function isProvinsi(value: string): value is Provinsi {
  return (PROVINSI as readonly string[]).includes(value);
}

/** Kabupaten/kota di provinsi tersebut; kosong bila provinsi belum dipilih atau tidak dikenal. */
export function kabupatenKota(provinsi: string | null | undefined): readonly string[] {
  return provinsi && isProvinsi(provinsi) ? DAFTAR_KAB_KOTA[provinsi] : [];
}

export function isKabupatenKotaDi(provinsi: string | null | undefined, kota: string | null | undefined): boolean {
  return Boolean(kota) && kabupatenKota(provinsi).includes(kota as string);
}

/**
 * Data lama menyimpan kota tanpa awalan ("Surabaya"). Cocokkan ke nama resmi bila hanya ada
 * satu kandidat ("Kota Surabaya"); bila ambigu (Kota/Kabupaten Kupang) kembalikan string kosong.
 */
export function cocokkanKabupatenKota(provinsi: string | null | undefined, kota: string | null | undefined): string {
  if (!kota) return "";
  const daftar = kabupatenKota(provinsi);
  if (daftar.includes(kota)) return kota;
  const cari = kota.trim().toLowerCase();
  const kandidat = daftar.filter((k) => k.toLowerCase().endsWith(" " + cari));
  return kandidat.length === 1 ? kandidat[0] : "";
}

export const JENIS_KIMIA = ["LFP", "NMC", "NCA", "LMO", "Lainnya"] as const;

export const KONDISI = ["Baik", "Cukup", "Perlu pemeriksaan", "Rusak fisik ringan"] as const;
