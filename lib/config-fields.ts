/** Field formulir pengaturan → jalur konfigurasi; persen dikonversi ke fraksi. */
export type ConfigField = { name: string; path: string; label: string; group: GroupKey; unit?: string; percent?: boolean; min: number; max: number };

export type GroupKey = "penilaian" | "surya" | "baterai" | "biaya" | "genset" | "cuaca";

/** Urutan, judul, dan penjelasan singkat tiap kelompok parameter. */
export const CONFIG_GROUPS: { key: GroupKey; title: string; desc: string }[] = [
  { key: "penilaian", title: "Penilaian baterai", desc: "Batas grade dan kapan baterai perlu diganti." },
  { key: "surya", title: "Panel surya", desc: "Produksi listrik panel dan lama sinar matahari per wilayah." },
  { key: "baterai", title: "Baterai", desc: "Nilai awal paket baterai dan batas pemakaian per tujuan." },
  { key: "biaya", title: "Biaya", desc: "Harga komponen dan solar untuk perbandingan biaya." },
  { key: "genset", title: "Genset & emisi", desc: "Konversi solar ke listrik dan emisi CO₂." },
  { key: "cuaca", title: "Cuaca & beban", desc: "Produksi surya per cuaca dan urutan beban dimatikan." },
];

export const CONFIG_FIELDS: ConfigField[] = [
  // Penilaian baterai
  { name: "grade_A", path: "grade.A", label: "Grade A mulai", group: "penilaian", unit: "% SoH", min: 0, max: 100 },
  { name: "grade_B", path: "grade.B", label: "Grade B mulai", group: "penilaian", unit: "% SoH", min: 0, max: 100 },
  { name: "grade_C", path: "grade.C", label: "Grade C mulai", group: "penilaian", unit: "% SoH", min: 0, max: 100 },
  { name: "ambang_ganti", path: "siklus_hidup.ambang_penggantian_soh", label: "Perlu diganti di bawah", group: "penilaian", unit: "% SoH", min: 0, max: 100 },
  { name: "margin", path: "siklus_hidup.margin_peringatan_soh", label: "Peringatan dini sebelum", group: "penilaian", unit: "% SoH", min: 0, max: 50 },

  // Panel surya
  { name: "psh", path: "surya.psh_jam", label: "Jam matahari (umum)", group: "surya", unit: "jam", min: 0.5, max: 12 },
  { name: "pr", path: "surya.pr", label: "Rasio kinerja panel", group: "surya", unit: "%", percent: true, min: 10, max: 100 },
  { name: "wp", path: "surya.kapasitas_per_panel_wp", label: "Daya per panel", group: "surya", unit: "Wp", min: 50, max: 1000 },

  // Baterai
  { name: "paket_kap", path: "profil_paket.kapasitas_kwh", label: "Kapasitas paket umum", group: "baterai", unit: "kWh", min: 1, max: 1000 },
  { name: "paket_soh", path: "profil_paket.soh", label: "SoH paket umum", group: "baterai", unit: "%", percent: true, min: 1, max: 100 },
  { name: "efisiensi", path: "efisiensi", label: "Efisiensi baterai", group: "baterai", unit: "%", percent: true, min: 10, max: 100 },
  { name: "hari_cadangan", path: "hari_cadangan", label: "Hari cadangan awal", group: "baterai", unit: "hari", min: 0, max: 10 },
  { name: "dod_hemat", path: "dod_prioritas.hemat_diesel", label: "Batas pakai · hemat diesel", group: "baterai", unit: "%", percent: true, min: 10, max: 100 },
  { name: "dod_tahan", path: "dod_prioritas.ketahanan_maksimum", label: "Batas pakai · ketahanan", group: "baterai", unit: "%", percent: true, min: 10, max: 100 },
  { name: "dod_umur", path: "dod_prioritas.umur_baterai_maksimum", label: "Batas pakai · umur baterai", group: "baterai", unit: "%", percent: true, min: 10, max: 100 },

  // Biaya
  { name: "harga_bat_rendah", path: "profil_paket.harga_per_kwh_rendah", label: "Baterai bekas · terendah", group: "biaya", unit: "Rp/kWh", min: 0, max: 1e8 },
  { name: "harga_bat_tinggi", path: "profil_paket.harga_per_kwh_tinggi", label: "Baterai bekas · tertinggi", group: "biaya", unit: "Rp/kWh", min: 0, max: 1e8 },
  { name: "harga_panel_rendah", path: "surya.harga_per_kwp_rendah", label: "Panel surya · terendah", group: "biaya", unit: "Rp/kWp", min: 0, max: 1e9 },
  { name: "harga_panel_tinggi", path: "surya.harga_per_kwp_tinggi", label: "Panel surya · tertinggi", group: "biaya", unit: "Rp/kWp", min: 0, max: 1e9 },
  { name: "harga_inverter", path: "harga_inverter_per_kw", label: "Inverter", group: "biaya", unit: "Rp/kW", min: 0, max: 1e9 },
  { name: "biaya_lain", path: "biaya_lain_persen", label: "Biaya lain (pasang, kabel)", group: "biaya", unit: "%", percent: true, min: 0, max: 100 },
  { name: "umur_sistem", path: "umur_sistem_tahun", label: "Umur sistem", group: "biaya", unit: "tahun", min: 1, max: 40 },
  { name: "perawatan", path: "perawatan_persen_per_tahun", label: "Perawatan per tahun", group: "biaya", unit: "%", percent: true, min: 0, max: 50 },
  { name: "diesel_rendah", path: "diesel.harga_per_liter_rendah", label: "Solar · terendah", group: "biaya", unit: "Rp/L", min: 0, max: 1e6 },
  { name: "diesel_tinggi", path: "diesel.harga_per_liter_tinggi", label: "Solar · tertinggi", group: "biaya", unit: "Rp/L", min: 0, max: 1e6 },

  // Genset & emisi
  { name: "kwh_per_liter", path: "diesel.kwh_per_liter", label: "Listrik per liter solar", group: "genset", unit: "kWh/L", min: 0.5, max: 10 },
  { name: "emisi", path: "diesel.faktor_emisi_kg_per_liter", label: "Emisi per liter solar", group: "genset", unit: "kg CO₂", min: 0, max: 10 },
  { name: "genset_kw", path: "diesel.daya_genset_kw", label: "Daya genset", group: "genset", unit: "kW", min: 0.5, max: 1000 },

  // Cuaca & beban
  { name: "sk_normal", path: "skenario_cuaca.normal.faktor", label: "Surya saat normal", group: "cuaca", unit: "%", percent: true, min: 0, max: 100 },
  { name: "sk_mendung", path: "skenario_cuaca.mendung_panjang.faktor", label: "Surya saat mendung", group: "cuaca", unit: "%", percent: true, min: 0, max: 100 },
  { name: "sk_hujan", path: "skenario_cuaca.hujan_beberapa_hari.faktor", label: "Surya saat hujan", group: "cuaca", unit: "%", percent: true, min: 0, max: 100 },
  { name: "porsi_kritis", path: "tingkat_beban.kritis.porsi", label: "Porsi beban kritis", group: "cuaca", unit: "%", percent: true, min: 0, max: 100 },
  { name: "porsi_penting", path: "tingkat_beban.penting.porsi", label: "Porsi beban penting", group: "cuaca", unit: "%", percent: true, min: 0, max: 100 },
  { name: "porsi_nyaman", path: "tingkat_beban.kenyamanan.porsi", label: "Porsi beban kenyamanan", group: "cuaca", unit: "%", percent: true, min: 0, max: 100 },
  { name: "ambang_nyaman", path: "ambang_pelepasan.kenyamanan", label: "Kenyamanan dimatikan di", group: "cuaca", unit: "% isi", percent: true, min: 0, max: 100 },
  { name: "ambang_penting", path: "ambang_pelepasan.penting", label: "Penting dimatikan di", group: "cuaca", unit: "% isi", percent: true, min: 0, max: 100 },
];

/** Jam matahari per wilayah dikirim sebagai field `psh__<nama wilayah>`. */
export const PSH_PREFIX = "psh__";

export function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
}
