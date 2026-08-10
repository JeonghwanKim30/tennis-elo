-- CreateEnum
CREATE TYPE "KakaoMessageType" AS ENUM ('MATCH_CREATED', 'MVP_SELECTED', 'VOTE_REMINDER', 'BROADCAST');

-- CreateEnum
CREATE TYPE "KakaoMessageStatus" AS ENUM ('STUBBED', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "kakaoConnectedAt" TIMESTAMP(3),
ADD COLUMN     "kakaoId" TEXT,
ADD COLUMN     "kakaoNickname" TEXT,
ADD COLUMN     "kakaoNotifyOptIn" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "NoticeSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "matchCreatedAlarmOn" BOOLEAN NOT NULL DEFAULT true,
    "mvpAlarmOn" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoticeSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoteReminderRule" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "dayOffset" INTEGER NOT NULL,
    "hour" INTEGER NOT NULL,
    "minute" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoteReminderRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoticeBroadcast" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sentBy" TEXT NOT NULL,
    "recipientCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoticeBroadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KakaoMessageLog" (
    "id" TEXT NOT NULL,
    "type" "KakaoMessageType" NOT NULL,
    "userId" TEXT,
    "message" TEXT NOT NULL,
    "status" "KakaoMessageStatus" NOT NULL DEFAULT 'STUBBED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KakaoMessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_kakaoId_key" ON "User"("kakaoId");

-- AddForeignKey
ALTER TABLE "NoticeBroadcast" ADD CONSTRAINT "NoticeBroadcast_sentBy_fkey" FOREIGN KEY ("sentBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KakaoMessageLog" ADD CONSTRAINT "KakaoMessageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

