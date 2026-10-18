-- 특수 이벤트(MT/대회) 모드: 경기일 종류 구분 + 코트/게스트 + 경기별 코트·시간대 배치.

-- CreateEnum
CREATE TYPE "MatchDayKind" AS ENUM ('REGULAR', 'SPECIAL');

-- CreateEnum
CREATE TYPE "EventEloMode" AS ENUM ('NONE', 'MEMBERS_ONLY');

-- AlterTable: 기존 경기일은 전부 일반 경기(REGULAR)로 남는다.
ALTER TABLE "MatchDay" ADD COLUMN     "kind" "MatchDayKind" NOT NULL DEFAULT 'REGULAR',
                       ADD COLUMN     "title" TEXT,
                       ADD COLUMN     "startTime" TEXT,
                       ADD COLUMN     "endTime" TEXT,
                       ADD COLUMN     "plannedMatchCount" INTEGER,
                       ADD COLUMN     "eloMode" "EventEloMode" NOT NULL DEFAULT 'NONE';

-- AlterTable: 기존 경기는 코트/시간대 배치가 없는 일반 경기이므로 둘 다 NULL.
ALTER TABLE "Match" ADD COLUMN     "courtId" TEXT,
                    ADD COLUMN     "slotIndex" INTEGER;

-- CreateTable
CREATE TABLE "EventCourt" (
    "id" TEXT NOT NULL,
    "matchDayId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "EventCourt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventGuest" (
    "id" TEXT NOT NULL,
    "matchDayId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "mmr" DOUBLE PRECISION NOT NULL DEFAULT 1200,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventGuest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventCourt_matchDayId_name_key" ON "EventCourt"("matchDayId", "name");

-- CreateIndex
CREATE INDEX "EventCourt_matchDayId_idx" ON "EventCourt"("matchDayId");

-- CreateIndex
CREATE UNIQUE INDEX "EventGuest_matchDayId_name_key" ON "EventGuest"("matchDayId", "name");

-- CreateIndex
CREATE INDEX "EventGuest_matchDayId_idx" ON "EventGuest"("matchDayId");

-- CreateIndex: 한 코트의 한 시간대에는 경기 하나만.
CREATE UNIQUE INDEX "Match_matchDayId_courtId_slotIndex_key" ON "Match"("matchDayId", "courtId", "slotIndex");

-- AddForeignKey
ALTER TABLE "EventCourt" ADD CONSTRAINT "EventCourt_matchDayId_fkey" FOREIGN KEY ("matchDayId") REFERENCES "MatchDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventGuest" ADD CONSTRAINT "EventGuest_matchDayId_fkey" FOREIGN KEY ("matchDayId") REFERENCES "MatchDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "EventCourt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
