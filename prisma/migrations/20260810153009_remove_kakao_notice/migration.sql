-- DropForeignKey
ALTER TABLE "KakaoMessageLog" DROP CONSTRAINT "KakaoMessageLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "NoticeBroadcast" DROP CONSTRAINT "NoticeBroadcast_sentBy_fkey";

-- DropIndex
DROP INDEX "User_kakaoId_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "kakaoConnectedAt",
DROP COLUMN "kakaoId",
DROP COLUMN "kakaoNickname",
DROP COLUMN "kakaoNotifyOptIn";

-- DropTable
DROP TABLE "KakaoMessageLog";

-- DropTable
DROP TABLE "NoticeBroadcast";

-- DropTable
DROP TABLE "NoticeSettings";

-- DropTable
DROP TABLE "VoteReminderRule";

-- DropEnum
DROP TYPE "KakaoMessageStatus";

-- DropEnum
DROP TYPE "KakaoMessageType";

