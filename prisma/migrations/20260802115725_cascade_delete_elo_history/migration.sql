-- DropForeignKey
ALTER TABLE "EloHistory" DROP CONSTRAINT "EloHistory_matchId_fkey";

-- AddForeignKey
ALTER TABLE "EloHistory" ADD CONSTRAINT "EloHistory_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
