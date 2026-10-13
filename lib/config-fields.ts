/** Field formulir pengaturan → jalur konfigurasi; persen dikonversi ke fraksi. */
export type ConfigField = { name: string; path: string; label: string; group: string; unit?: string; percent?: boolean; min: number; max: number };

export const CONFIG_FIELDS: ConfigField[] = [
  { name: "grade_A", path: "grade.A", label: "Batas bawah grade A", group: "Ambang grade", unit: "%", min: 0, max: 100 },
  { name: "grade_B", path: "grade.B", label: "Batas bawah grade B", group: "Ambang grade", unit: "%", min: 0, max: 100 },
  { name: "grade_C", path: "grade.C", label: "Batas bawah grade C", group: "Ambang grade", unit: "%", min: 0, max: 100 },
  { name: "psh", path: "surya.psh_jam", label: "PSH bawaan", group: "Surya & sistem", unit: "jam", min: 0.5, max: 12 },
  { name: "pr", path: "surya.pr", label: "Performance ratio", group: "Surya & sistem", unit: "%", percent: true, min: 10, max: 100 },
  { name: "wp", path: "surya.kapasitas_per_panel_wp", label: "Kapasitas per panel", group: "Surya & sistem", unit: "Wp", min: 50, max: 1000 },
  { name: "efisiensi", path: "efisiensi", label: "Efisiensi η", group: "Surya & sistem", unit: "%", percent: true, min: 10, max: 100 },
  { name: "hari_cadangan", path: "hari_cadangan", label: "Hari cadangan mendung", group: "Surya & sistem", unit: "hari", min: 0, max: 10 },
  { name: "paket_kap", path: "profil_paket.kapasitas_kwh", label: "Kapasitas paket bawaan", group: "Baterai", unit: "kWh", min: 1, max: 1000 },
  { name: "paket_soh", path: "profil_paket.soh", label: "SoH paket bawaan", group: "Baterai", unit: "%", percent: true, min: 1, max: 100 },
  { name: "dod", path: "dod", label: "DoD perencanaan", group: "Baterai", unit: "%", percent: true, min: 10, max: 100 },
  { name: "dod_hemat", path: "dod_prioritas.hemat_diesel", label: "DoD mode hemat diesel", group: "Baterai", unit: "%", percent: true, min: 10, max: 100 },
  { name: "dod_tahan", path: "dod_prioritas.ketahanan_maksimum", label: "DoD mode ketahanan maks.", group: "Baterai", unit: "%", percent: true, min: 10, max: 100 },
  { name: "dod_umur", path: "dod_prioritas.umur_baterai_maksimum", label: "DoD mode umur baterai maks.", group: "Baterai", unit: "%", percent: true, min: 10, max: 100 },
  { name: "diesel_rendah", path: "diesel.harga_per_liter_rendah", label: "Harga diesel rendah", group: "Diesel & emisi", unit: "Rp/L", min: 0, max: 1e6 },
  { name: "diesel_tinggi", path: "diesel.harga_per_liter_tinggi", label: "Harga diesel tinggi", group: "Diesel & emisi", unit: "Rp/L", min: 0, max: 1e6 },
  { name: "kwh_per_liter", path: "diesel.kwh_per_liter", label: "Konversi kWh per liter", group: "Diesel & emisi", unit: "kWh/L", min: 0.5, max: 10 },
  { name: "emisi", path: "diesel.faktor_emisi_kg_per_liter", label: "Faktor emisi diesel", group: "Diesel & emisi", unit: "kg CO₂/L", min: 0, max: 10 },
  { name: "genset_kw", path: "diesel.daya_genset_kw", label: "Daya genset", group: "Diesel & emisi", unit: "kW", min: 0.5, max: 1000 },
  { name: "sk_normal", path: "skenario_cuaca.normal.faktor", label: "Produksi normal", group: "Skenario cuaca", unit: "%", percent: true, min: 0, max: 100 },
  { name: "sk_mendung", path: "skenario_cuaca.mendung_panjang.faktor", label: "Produksi mendung panjang", group: "Skenario cuaca", unit: "%", percent: true, min: 0, max: 100 },
  { name: "sk_hujan", path: "skenario_cuaca.hujan_beberapa_hari.faktor", label: "Produksi hujan beberapa hari", group: "Skenario cuaca", unit: "%", percent: true, min: 0, max: 100 },
  { name: "ambang_ganti", path: "siklus_hidup.ambang_penggantian_soh", label: "Ambang penggantian SoH", group: "Siklus hidup", unit: "%", min: 0, max: 100 },
  { name: "margin", path: "siklus_hidup.margin_peringatan_soh", label: "Margin peringatan dini", group: "Siklus hidup", unit: "% SoH", min: 0, max: 50 },
];

export function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
}
