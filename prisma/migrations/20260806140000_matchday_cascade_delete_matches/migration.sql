-- 경기 일자(MatchDay) 삭제 시 그 안의 경기(Match)들이 함께 지워지도록 cascade로
-- 바꾼다. Match -> EloHistory는 이미 cascade이므로, 이 변경 하나로
-- MatchDay 삭제 -> Match 삭제 -> EloHistory 삭제가 전부 연쇄적으로 일어난다.
-- (MatchDayParticipant는 이전 마이그레이션에서 이미 cascade로 설정됨)
ALTER TABLE "Match" DROP CONSTRAINT "Match_matchDayId_fkey";
ALTER TABLE "Match" ADD CONSTRAINT "Match_matchDayId_fkey" FOREIGN KEY ("matchDayId") REFERENCES "MatchDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
