-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "teamAScore" INTEGER,
ADD COLUMN     "teamBScore" INTEGER,
ALTER COLUMN "result" DROP NOT NULL;
