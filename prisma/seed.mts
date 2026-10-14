/**
 * Data demo SOLUNA (NF-6: semua data seed berlabel ilustrasi).
 * Jalankan mesin hitung terlebih dahulu (npm run engine), lalu: npm run db:seed
 * Semua angka penilaian dan perencanaan dihitung oleh mesin hitung, bukan ditulis tangan.
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/password.ts";

const prisma = new PrismaClient();
const ENGINE = process.env.ENGINE_URL ?? "http://127.0.0.1:8000";
const config = JSON.parse(readFileSync("engine/soluna_engine/default_config.json", "utf8"));

async function engine<T>(endpoint: string, input: unknown): Promise<T> {
  const res = await fetch(`${ENGINE}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input, config }),
  });
  if (!res.ok) throw new Error(`${endpoint}: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function explain(jenis: string, hasil: unknown) {
  const res = await fetch(`${ENGINE}/explain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: { jenis, hasil } }),
  });
  return res.ok ? res.json() : null;
}

const monthsAgo = (m: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - m);
  return d;
};

async function main() {
  try {
    await fetch(`${ENGINE}/health`);
  } catch {
    throw new Error(`Mesin hitung tidak berjalan di ${ENGINE}. Jalankan "npm run engine" terlebih dahulu.`);
  }

  console.log("Mengosongkan data lama…");
  await prisma.$transaction([
    prisma.cekKompatibilitas.deleteMany(),
    prisma.simulasiKetahanan.deleteMany(),
    prisma.rencanaDesa.deleteMany(),
    prisma.bacaanSoh.deleteMany(),
    prisma.penilaian.deleteMany(),
    prisma.berkasBaterai.deleteMany(),
    prisma.baterai.deleteMany(),
    prisma.pemasok.deleteMany(),
    prisma.konfigurasi.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const pw = await hashPassword("soluna123");
  const admin = await prisma.user.create({
    data: { nama: "Admin BUMDes Sinar Desa", username: "admin", email: "admin@soluna.test", passwordHash: pw, peran: "ADMIN" },
  });

  await prisma.konfigurasi.create({
    data: { versi: 1, data: config, aktif: true, catatan: "Nilai bawaan SOLUNA (ilustrasi)", dibuatId: admin.id },
  });

  const pemasokData = [
    {
      username: "armada",
      email: "armada@soluna.test",
      nama: "Budi Santoso",
      p: {
        namaPerusahaan: "PT Armada Listrik Nusantara (ilustrasi)",
        alamat: "Jl. Pemuda No. 12",
        kota: "Kota Administrasi Jakarta Timur",
        provinsi: "DKI Jakarta",
        telepon: "0215550123",
        deskripsi: "Operator armada bus dan taksi listrik. Menyalurkan paket baterai pensiun setelah 5–7 tahun operasi.",
        jenisBaterai: "LFP, NMC",
        alamatPenyimpanan: "Gudang Kawasan Industri Jababeka Blok C-7",
        kotaPenyimpanan: "Kota Bekasi",
        provinsiPenyimpanan: "Jawa Barat",
      },
    },
    {
      username: "bengkelev",
      email: "bengkel@soluna.test",
      nama: "Siti Rahmawati",
      p: {
        namaPerusahaan: "Bengkel EV Mandiri (ilustrasi)",
        alamat: "Jl. Raya Darmo No. 88",
        kota: "Kota Surabaya",
        provinsi: "Jawa Timur",
        telepon: "081234567890",
        deskripsi: "Bengkel servis kendaraan listrik roda empat dan roda dua.",
        jenisBaterai: "NMC, NCA, LMO",
      },
    },
    {
      username: "daurenergi",
      email: "daur@soluna.test",
      nama: "Yohanes Lado",
      p: {
        namaPerusahaan: "CV Daur Energi Timur (ilustrasi)",
        alamat: "Jl. El Tari No. 3",
        kota: "Kota Kupang",
        provinsi: "Nusa Tenggara Timur",
        telepon: "082145550987",
        deskripsi: "Pengumpul dan perakit ulang modul baterai untuk wilayah timur Indonesia.",
        jenisBaterai: "LFP",
      },
    },
  ];

  const pemasok = [];
  for (const s of pemasokData) {
    const u = await prisma.user.create({
      data: {
        nama: s.nama,
        username: s.username,
        email: s.email,
        passwordHash: pw,
        peran: "PEMASOK",
        pemasok: { create: { ...s.p, namaPenanggungJawab: s.nama, emailPerusahaan: s.email } },
      },
      include: { pemasok: true },
    });
    pemasok.push(u.pemasok!);
  }

  type B = {
    s: number;
    kimia: string;
    merek: string;
    model: string;
    kap: number;
    usia: number;
    kondisi: string;
    v: number;
    siklus?: number;
    nilai?: { aktual: number; ir?: number; dod?: number; fc?: number; suhu?: number; turun: number[] };
  };
  const baterai: B[] = [
    { s: 0, kimia: "LFP", merek: "VoltaNusa", model: "Bus Pack 50", kap: 50, usia: 4, kondisi: "Baik", v: 51.2, siklus: 950, nilai: { aktual: 41, ir: 32, dod: 0.7, fc: 0.2, suhu: 31, turun: [9, 6, 3] } },
    { s: 0, kimia: "NMC", merek: "Ekacell", model: "E50 Taxi", kap: 50, usia: 6, kondisi: "Baik", v: 48, siklus: 1400, nilai: { aktual: 35, ir: 48, dod: 0.8, fc: 0.4, suhu: 32, turun: [11, 7, 3.5, 1.5] } },
    { s: 0, kimia: "LFP", merek: "VoltaNusa", model: "Bus Pack 60", kap: 60, usia: 5, kondisi: "Cukup", v: 51.2, siklus: 1250, nilai: { aktual: 45.6, ir: 38, dod: 0.75, fc: 0.3, suhu: 33, turun: [8, 5, 2] } },
    { s: 1, kimia: "NMC", merek: "SinarCell", model: "SC-40", kap: 40, usia: 7, kondisi: "Perlu pemeriksaan", v: 44.4, siklus: 1800, nilai: { aktual: 26, ir: 62, dod: 0.9, fc: 0.6, suhu: 36, turun: [12, 8, 4, 2] } },
    { s: 1, kimia: "NCA", merek: "Kirana Power", model: "KP-75", kap: 75, usia: 8, kondisi: "Rusak fisik ringan", v: 57.6, siklus: 2100, nilai: { aktual: 41, ir: 85, dod: 0.9, fc: 0.7, suhu: 37, turun: [14, 9, 5] } },
    { s: 2, kimia: "LFP", merek: "Ekacell", model: "E-LFP 50", kap: 50, usia: 3, kondisi: "Baik", v: 51.2, siklus: 700, nilai: { aktual: 43.5, ir: 28, dod: 0.7, fc: 0.1, suhu: 30, turun: [6, 3] } },
    { s: 0, kimia: "NMC", merek: "Ekacell", model: "E64 Fleet", kap: 64, usia: 5, kondisi: "Baik", v: 48, siklus: 1150, nilai: { aktual: 47, turun: [8, 4] } },
    { s: 1, kimia: "LMO", merek: "SinarCell", model: "Moto 24", kap: 24, usia: 6, kondisi: "Cukup", v: 48, nilai: { aktual: 15.1, turun: [9, 4] } },
    { s: 2, kimia: "LFP", merek: "VoltaNusa", model: "Bus Pack 50", kap: 50, usia: 5, kondisi: "Baik", v: 51.2, siklus: 1100 },
    { s: 2, kimia: "LFP", merek: "Kirana Power", model: "KP-L40", kap: 40, usia: 4, kondisi: "Baik", v: 51.2 },
    { s: 1, kimia: "NMC", merek: "SinarCell", model: "SC-55", kap: 55, usia: 6, kondisi: "Cukup", v: 44.4, siklus: 1500 },
    { s: 0, kimia: "LFP", merek: "VoltaNusa", model: "Bus Pack 60", kap: 60, usia: 6, kondisi: "Baik", v: 51.2, siklus: 1350 },
  ];

  let i = 0;
  for (const b of baterai) {
    i += 1;
    const created = await prisma.baterai.create({
      data: {
        kode: `BAT-${String(i).padStart(4, "0")}`,
        pemasokId: pemasok[b.s].id,
        jenisKimia: b.kimia,
        merek: b.merek,
        model: b.model,
        kapasitasAwalKwh: b.kap,
        usiaTahun: b.usia,
        kondisi: b.kondisi,
        teganganNominalV: b.v,
        jumlahSiklus: b.siklus,
        catatan: "Data ilustrasi untuk demonstrasi.",
        ilustrasi: true,
      },
    });
    if (!b.nilai) continue;

    const n = b.nilai;
    const masukan = {
      kapasitas_awal_kwh: b.kap,
      kapasitas_aktual_kwh: n.aktual,
      usia_tahun: b.usia,
      jumlah_siklus: b.siklus,
      hambatan_internal_mohm: n.ir,
      jenis_kimia: b.kimia,
      kedalaman_pengosongan: n.dod,
      frekuensi_pengisian_cepat: n.fc,
      suhu_rata_c: n.suhu,
    };
    const hasil = await engine<{
      soh: number;
      grade: string;
      keputusan: string;
      keyakinan: number;
      sisa_umur: { bawah: number; tengah: number; atas: number };
      penggantian: { tengah: string };
      versi_model: string;
    }>("assess", masukan);

    // Riwayat SoH: pembacaan lama (lebih tinggi) lalu hasil penilaian terbaru.
    const lama = n.turun.map((delta, k) => ({
      bateraiId: created.id,
      soh: Math.min(100, Math.round((hasil.soh + delta) * 10) / 10),
      tanggal: monthsAgo((n.turun.length - k) * 6),
      sumber: "MANUAL" as const,
      catatan: "Pembacaan berkala (ilustrasi)",
      dibuatId: admin.id,
    }));
    await prisma.bacaanSoh.createMany({ data: lama });
    await prisma.penilaian.create({
      data: {
        bateraiId: created.id,
        penilaiId: admin.id,
        masukan,
        hasil,
        soh: hasil.soh,
        grade: hasil.grade,
        keputusan: hasil.keputusan,
        sisaUmurBawah: hasil.sisa_umur.bawah,
        sisaUmurTengah: hasil.sisa_umur.tengah,
        sisaUmurAtas: hasil.sisa_umur.atas,
        keyakinan: hasil.keyakinan,
        tanggalGanti: new Date(hasil.penggantian.tengah),
        penjelasan: await explain("penilaian", hasil),
        versiKonfigurasi: 1,
        versiModel: hasil.versi_model,
      },
    });
    await prisma.bacaanSoh.create({
      data: { bateraiId: created.id, soh: hasil.soh, tanggal: new Date(), sumber: "PENILAIAN", dibuatId: admin.id },
    });
    await prisma.baterai.update({
      where: { id: created.id },
      data: { status: "DINILAI", sohTerakhir: hasil.soh, gradeTerakhir: hasil.grade },
    });
    console.log(`  ${created.kode}: SoH ${hasil.soh}% → grade ${hasil.grade}`);
  }

  // Rencana desa sesuai test case proposal.
  const masukanRencana = {
    jumlah_rumah: 50,
    konsumsi_per_rumah_kwh: 1,
    porsi_malam: 0.6,
    jenis_beban: ["Penerangan", "Pendingin obat", "Komunikasi", "Pompa air", "Televisi", "Kipas angin"],
    lokasi: "Nusa Tenggara Timur",
    psh_jam: 4,
    pr: 0.75,
    efisiensi: 0.9,
    dod: 0.8,
    hari_cadangan: 1,
    paket: { kapasitas_kwh: 50, soh: 0.7, sumber: "bawaan", nama: "Paket bawaan 50 kWh (ilustrasi)" },
    periode_hari: 30,
  };
  const rencana = await engine<{ versi_model: string }>("plan", masukanRencana);
  const r = await prisma.rencanaDesa.create({
    data: {
      nama: "Rencana awal (test case proposal)",
      namaDesa: "Desa Sukamaju (ilustrasi)",
      masukan: masukanRencana,
      hasil: rencana,
      penjelasan: await explain("perencanaan", rencana),
      bateraiIds: [],
      versiKonfigurasi: 1,
      versiModel: rencana.versi_model,
      ilustrasi: true,
      dibuatId: admin.id,
    },
  });
  console.log(`  Rencana: ${r.namaDesa}`);
  console.log("Selesai. Masuk dengan admin / soluna123 atau armada / soluna123.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
