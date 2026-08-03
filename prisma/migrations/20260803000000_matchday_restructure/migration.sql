-- Matches are now required to belong to a MatchDay. Existing standalone matches
-- don't fit that model, so we reset match history rather than force-fit them.
DELETE FROM "EloHistory";
DELETE FROM "Match";
UPDATE "EloRating" SET "rating" = 1200, "wins" = 0, "losses" = 0, "draws" = 0;

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "gender" "Gender" NOT NULL DEFAULT 'MALE';
ALTER TABLE "User" ADD COLUMN "profileImage" BYTEA;
ALTER TABLE "User" ADD COLUMN "profileImageType" TEXT;

-- CreateTable
CREATE TABLE "MatchDay" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchDayParticipant" (
    "matchDayId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "MatchDayParticipant_pkey" PRIMARY KEY ("matchDayId","userId")
);

-- AlterTable
ALTER TABLE "Match" DROP COLUMN "playedAt";
ALTER TABLE "Match" ADD COLUMN "matchDayId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "MatchDay" ADD CONSTRAINT "MatchDay_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchDayParticipant" ADD CONSTRAINT "MatchDayParticipant_matchDayId_fkey" FOREIGN KEY ("matchDayId") REFERENCES "MatchDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchDayParticipant" ADD CONSTRAINT "MatchDayParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_matchDayId_fkey" FOREIGN KEY ("matchDayId") REFERENCES "MatchDay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
