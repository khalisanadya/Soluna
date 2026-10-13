-- CreateEnum
CREATE TYPE "Peran" AS ENUM ('ADMIN', 'PEMASOK');

-- CreateEnum
CREATE TYPE "StatusPenilaian" AS ENUM ('BELUM_DINILAI', 'DINILAI');

-- CreateEnum
CREATE TYPE "JenisBerkas" AS ENUM ('FOTO', 'DOKUMEN');

-- CreateEnum
CREATE TYPE "SumberBacaan" AS ENUM ('PENILAIAN', 'MANUAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "peran" "Peran" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pemasok" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "namaPenanggungJawab" TEXT NOT NULL,
    "namaPerusahaan" TEXT NOT NULL,
    "alamat" TEXT NOT NULL,
    "kota" TEXT NOT NULL,
    "provinsi" TEXT NOT NULL,
    "telepon" TEXT NOT NULL,
    "emailPerusahaan" TEXT NOT NULL,
    "deskripsi" TEXT,
    "jenisBaterai" TEXT,
    "alamatPenyimpanan" TEXT,
    "kotaPenyimpanan" TEXT,
    "provinsiPenyimpanan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pemasok_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Baterai" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "pemasokId" TEXT NOT NULL,
    "jenisKimia" TEXT NOT NULL,
    "merek" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "kapasitasAwalKwh" DOUBLE PRECISION NOT NULL,
    "usiaTahun" DOUBLE PRECISION,
    "kondisi" TEXT NOT NULL,
    "teganganNominalV" DOUBLE PRECISION,
    "jumlahSiklus" INTEGER,
    "catatan" TEXT,
    "status" "StatusPenilaian" NOT NULL DEFAULT 'BELUM_DINILAI',
    "sohTerakhir" DOUBLE PRECISION,
    "gradeTerakhir" TEXT,
    "ilustrasi" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Baterai_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BerkasBaterai" (
    "id" TEXT NOT NULL,
    "bateraiId" TEXT NOT NULL,
    "jenis" "JenisBerkas" NOT NULL,
    "namaBerkas" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "ukuran" INTEGER NOT NULL,
    "lokasi" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BerkasBaterai_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Penilaian" (
    "id" TEXT NOT NULL,
    "bateraiId" TEXT NOT NULL,
    "penilaiId" TEXT NOT NULL,
    "masukan" JSONB NOT NULL,
    "hasil" JSONB NOT NULL,
    "soh" DOUBLE PRECISION NOT NULL,
    "grade" TEXT NOT NULL,
    "keputusan" TEXT NOT NULL,
    "sisaUmurBawah" DOUBLE PRECISION NOT NULL,
    "sisaUmurTengah" DOUBLE PRECISION NOT NULL,
    "sisaUmurAtas" DOUBLE PRECISION NOT NULL,
    "keyakinan" DOUBLE PRECISION NOT NULL,
    "tanggalGanti" TIMESTAMP(3),
    "penjelasan" JSONB,
    "versiKonfigurasi" INTEGER NOT NULL,
    "versiModel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Penilaian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BacaanSoh" (
    "id" TEXT NOT NULL,
    "bateraiId" TEXT NOT NULL,
    "soh" DOUBLE PRECISION NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "sumber" "SumberBacaan" NOT NULL,
    "catatan" TEXT,
    "dibuatId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BacaanSoh_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RencanaDesa" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "namaDesa" TEXT NOT NULL,
    "masukan" JSONB NOT NULL,
    "hasil" JSONB NOT NULL,
    "penjelasan" JSONB,
    "bateraiIds" TEXT[],
    "versiKonfigurasi" INTEGER NOT NULL,
    "versiModel" TEXT NOT NULL,
    "ilustrasi" BOOLEAN NOT NULL DEFAULT false,
    "dibuatId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RencanaDesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulasiKetahanan" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "rencanaId" TEXT,
    "masukan" JSONB NOT NULL,
    "hasil" JSONB NOT NULL,
    "versiKonfigurasi" INTEGER NOT NULL,
    "versiModel" TEXT NOT NULL,
    "dibuatId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulasiKetahanan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CekKompatibilitas" (
    "id" TEXT NOT NULL,
    "bateraiId" TEXT,
    "rencanaId" TEXT,
    "masukan" JSONB NOT NULL,
    "hasil" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "versiKonfigurasi" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CekKompatibilitas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Konfigurasi" (
    "id" TEXT NOT NULL,
    "versi" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "catatan" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT false,
    "dibuatId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Konfigurasi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Pemasok_userId_key" ON "Pemasok"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Baterai_kode_key" ON "Baterai"("kode");

-- CreateIndex
CREATE INDEX "Baterai_pemasokId_idx" ON "Baterai"("pemasokId");

-- CreateIndex
CREATE INDEX "Penilaian_bateraiId_createdAt_idx" ON "Penilaian"("bateraiId", "createdAt");

-- CreateIndex
CREATE INDEX "BacaanSoh_bateraiId_tanggal_idx" ON "BacaanSoh"("bateraiId", "tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "Konfigurasi_versi_key" ON "Konfigurasi"("versi");

-- AddForeignKey
ALTER TABLE "Pemasok" ADD CONSTRAINT "Pemasok_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Baterai" ADD CONSTRAINT "Baterai_pemasokId_fkey" FOREIGN KEY ("pemasokId") REFERENCES "Pemasok"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BerkasBaterai" ADD CONSTRAINT "BerkasBaterai_bateraiId_fkey" FOREIGN KEY ("bateraiId") REFERENCES "Baterai"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Penilaian" ADD CONSTRAINT "Penilaian_bateraiId_fkey" FOREIGN KEY ("bateraiId") REFERENCES "Baterai"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Penilaian" ADD CONSTRAINT "Penilaian_penilaiId_fkey" FOREIGN KEY ("penilaiId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BacaanSoh" ADD CONSTRAINT "BacaanSoh_bateraiId_fkey" FOREIGN KEY ("bateraiId") REFERENCES "Baterai"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BacaanSoh" ADD CONSTRAINT "BacaanSoh_dibuatId_fkey" FOREIGN KEY ("dibuatId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RencanaDesa" ADD CONSTRAINT "RencanaDesa_dibuatId_fkey" FOREIGN KEY ("dibuatId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulasiKetahanan" ADD CONSTRAINT "SimulasiKetahanan_rencanaId_fkey" FOREIGN KEY ("rencanaId") REFERENCES "RencanaDesa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulasiKetahanan" ADD CONSTRAINT "SimulasiKetahanan_dibuatId_fkey" FOREIGN KEY ("dibuatId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CekKompatibilitas" ADD CONSTRAINT "CekKompatibilitas_bateraiId_fkey" FOREIGN KEY ("bateraiId") REFERENCES "Baterai"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CekKompatibilitas" ADD CONSTRAINT "CekKompatibilitas_rencanaId_fkey" FOREIGN KEY ("rencanaId") REFERENCES "RencanaDesa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Konfigurasi" ADD CONSTRAINT "Konfigurasi_dibuatId_fkey" FOREIGN KEY ("dibuatId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
