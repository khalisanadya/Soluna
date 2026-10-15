-- CreateEnum
CREATE TYPE "StatusAsetBaterai" AS ENUM ('AKAN_DIBELI', 'TERDAFTAR', 'DIGUNAKAN', 'TIDAK_TERSEDIA');

-- CreateTable
CREATE TABLE "AsetBaterai" (
    "id" TEXT NOT NULL,
    "bateraiId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "status" "StatusAsetBaterai" NOT NULL DEFAULT 'TERDAFTAR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AsetBaterai_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AsetBaterai_bateraiId_key" ON "AsetBaterai"("bateraiId");

-- CreateIndex
CREATE INDEX "AsetBaterai_adminId_status_idx" ON "AsetBaterai"("adminId", "status");

-- AddForeignKey
ALTER TABLE "AsetBaterai" ADD CONSTRAINT "AsetBaterai_bateraiId_fkey" FOREIGN KEY ("bateraiId") REFERENCES "Baterai"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsetBaterai" ADD CONSTRAINT "AsetBaterai_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
