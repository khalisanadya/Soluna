// Bentuk keluaran mesin hitung (engine/soluna_engine). null pada durasi = tidak terbatas.

export type Langkah = { label: string; rumus: string; substitusi: string; hasil: number | string | null; satuan: string };

export type Grade = "A" | "B" | "C" | "D";

export type HasilPenilaian = {
  soh: number;
  grade: Grade;
  rentang_grade: string;
  keputusan: string;
  sisa_umur: {
    bawah: number;
    tengah: number;
    atas: number;
    ketidakpastian: number;
    laju_per_tahun: number;
    sumber_laju: "teramati" | "bawaan";
    faktor_stres: string[];
  };
  keyakinan: number;
  kelengkapan_data: number;
  penggantian: { tengah: string; paling_cepat: string; paling_lambat: string; segera: boolean };
  jalur_daur_ulang: boolean;
  nilai_bawaan: string[];
  langkah: Langkah[];
  tanggal_penilaian: string;
  kerangka: string;
  versi_model: string;
};

export type HasilRencana = {
  ringkasan: {
    kebutuhan_harian_kwh: number;
    kebutuhan_malam_kwh: number;
    kapasitas_terpakai_per_paket_kwh: number;
    paket_siklus_harian: number;
    jumlah_paket: number;
    kapasitas_baterai_total_kwh: number;
    energi_tersedia_kwh: number;
    kapasitas_panel_kwp: number;
    kapasitas_panel_terpasang_kwp: number;
    jumlah_panel: number;
    /** Ada sejak versi mesin yang menambahkan estimasi produksi; rencana lama tidak memilikinya. */
    produksi_surya_harian_kwh?: number;
    daya_puncak_kw: number;
    inverter_kw: number;
  };
  parameter: {
    psh_jam: number;
    pr: number;
    efisiensi: number;
    dod: number;
    hari_cadangan: number;
    kapasitas_per_panel_wp: number;
    kapasitas_paket_kwh: number;
    soh_paket: number;
    periode_hari: number;
    nama_paket: string;
    sumber_paket: "bawaan" | "baterai";
  };
  pemeriksaan: { nama: string; lulus: boolean; keterangan: string }[];
  lingkungan: { diesel_hemat_liter: number; co2_dihindari_kg: number; periode_hari: number };
  biaya: {
    investasi: Rentang;
    sistem_per_rumah: Rentang;
    diesel_per_rumah: Rentang;
    iuran_perawatan_per_rumah_bulan: Rentang;
    periode_hari: number;
  };
  nilai_bawaan: string[];
  langkah: Langkah[];
  versi_model: string;
};

export type Rentang = { rendah: number; tinggi: number };

export type TingkatKey = "penuh" | "tanpa_kenyamanan" | "kritis_saja";

export type SkenarioHasil = {
  kunci: string;
  label: string;
  faktor_produksi: number;
  produksi_panel_kwh: number;
  lama_bertahan_hari: number | null;
  lama_bertahan_pelepasan_hari: number | null;
  lama_per_tingkat_hari: Record<TingkatKey, number | null>;
  jam_genset: number;
  jam_genset_pelepasan: number;
  cukup: boolean;
  cukup_pelepasan: boolean;
};

export type LogTindakan = { jam: number; waktu: string; jenis: "tunda" | "pulih" | "genset" | "peringatan" | "hemat"; pesan: string };

export type HasilKetahanan = {
  dod_efektif: number;
  alasan_dod: string;
  prioritas: string;
  prioritas_label: string;
  energi_tersedia_kwh: number;
  beban_kwh: Record<TingkatKey, number>;
  produksi_normal_kwh: number;
  periode_hari: number;
  skenario: SkenarioHasil[];
  terpilih: string;
  peringatan: string[];
  tingkat_beban: { kunci: string; label: string; porsi: number; perangkat: string[]; penjelasan: string; beban_kwh: number }[];
  ambang_pelepasan: { kenyamanan: number; penting: number };
  per_jam: {
    jam: number[];
    surya_kwh: number[];
    beban_kwh: number[];
    soc_persen: number[];
    genset_kwh: number[];
    tingkat: TingkatKey[];
    log: LogTindakan[];
    genset_total_kwh: number;
    jam_genset: number;
    diesel_hemat_liter: number;
    catatan: string;
  };
  nilai_bawaan: string[];
  langkah: Langkah[];
  versi_model: string;
};

export type StatusKompat = "layak" | "perlu_penyesuaian" | "tidak_layak";

export type HasilKompatibilitas = {
  status: StatusKompat;
  label: string;
  pemeriksaan: { nama: string; status: StatusKompat; label: string; alasan: string }[];
  catatan: string;
  versi_model: string;
};

export type StatusSiklus = "daur_ulang" | "perhatian" | "normal" | "belum_dinilai";

export type HasilSiklus = {
  baterai: {
    id: string;
    kode: string;
    soh: number | null;
    tren_per_tahun: number | null;
    jadwal_penggantian: string | null;
    dasar_jadwal: string | null;
    sisa_tahun: number | null;
    status: StatusSiklus;
    peringatan: string[];
    jalur_daur_ulang: boolean;
  }[];
  ringkasan: Record<StatusSiklus, number>;
  ambang: { penggantian_soh: number; margin_soh: number; batas_sisa_umur_tahun: number };
  versi_model: string;
};

export type StatusCocok = "direkomendasikan" | "perlu_penyesuaian" | "tidak_direkomendasikan" | "belum_dinilai";

export type HasilPencocokan = {
  baterai: {
    id: string;
    kode: string;
    status: StatusCocok;
    label: string;
    alasan: string[];
    keputusan: string | null;
    kapasitas_terpakai_kwh: number | null;
    paket_siklus_harian: number | null;
    jumlah_paket: number | null;
    daya_baterai_kw: number | null;
    daur_ulang: boolean;
  }[];
  ringkasan: Record<StatusCocok, number>;
  catatan: string;
  versi_model: string;
};
