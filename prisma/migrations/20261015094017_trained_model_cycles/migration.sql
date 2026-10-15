-- AlterTable
ALTER TABLE "Penilaian" ADD COLUMN     "sisaUmurSiklusAtas" INTEGER,
ADD COLUMN     "sisaUmurSiklusBawah" INTEGER,
ADD COLUMN     "sisaUmurSiklusTengah" INTEGER,
ALTER COLUMN "sisaUmurBawah" DROP NOT NULL,
ALTER COLUMN "sisaUmurTengah" DROP NOT NULL,
ALTER COLUMN "sisaUmurAtas" DROP NOT NULL;
