-- 경기일당 사진 1장(photo/photoType) -> 여러 장(최대 10장, MatchDayPhoto)으로 확장.
CREATE TABLE "MatchDayPhoto" (
    "id" TEXT NOT NULL,
    "matchDayId" TEXT NOT NULL,
    "image" BYTEA NOT NULL,
    "imageType" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchDayPhoto_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MatchDayPhoto" ADD CONSTRAINT "MatchDayPhoto_matchDayId_fkey" FOREIGN KEY ("matchDayId") REFERENCES "MatchDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchDayPhoto" ADD CONSTRAINT "MatchDayPhoto_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 기존에 있던 날짜당 단일 사진 데이터를 새 테이블로 이관(업로더 정보가 없어 그 날짜를
-- 등록한 사람으로 대체).
INSERT INTO "MatchDayPhoto" ("id", "matchDayId", "image", "imageType", "uploadedBy")
SELECT md5(random()::text || clock_timestamp()::text), "id", "photo", "photoType", "createdBy"
FROM "MatchDay"
WHERE "photo" IS NOT NULL;

-- DropColumn
ALTER TABLE "MatchDay" DROP COLUMN "photo";
ALTER TABLE "MatchDay" DROP COLUMN "photoType";
