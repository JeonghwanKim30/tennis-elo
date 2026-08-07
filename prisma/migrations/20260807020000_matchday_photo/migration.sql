-- 경기일당 현장 사진 1장(DB에 직접 저장, 다중 업로드 미지원)
ALTER TABLE "MatchDay" ADD COLUMN "photo" BYTEA;
ALTER TABLE "MatchDay" ADD COLUMN "photoType" TEXT;
