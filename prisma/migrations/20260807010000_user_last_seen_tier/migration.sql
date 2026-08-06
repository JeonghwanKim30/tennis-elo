-- 승급/강등 안내를 위해 마지막으로 확인한 티어를 기록해둔다.
ALTER TABLE "User" ADD COLUMN "lastSeenTierSingles" TEXT;
ALTER TABLE "User" ADD COLUMN "lastSeenTierDoubles" TEXT;
