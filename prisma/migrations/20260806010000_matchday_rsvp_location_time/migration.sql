-- CreateEnum
CREATE TYPE "ParticipationStatus" AS ENUM ('PENDING', 'ATTENDING', 'NOT_ATTENDING');

-- AlterTable
ALTER TABLE "MatchDay" ADD COLUMN "time" TEXT;
ALTER TABLE "MatchDay" ADD COLUMN "location" TEXT;

-- AlterTable
ALTER TABLE "MatchDayParticipant" ADD COLUMN "status" "ParticipationStatus" NOT NULL DEFAULT 'PENDING';
