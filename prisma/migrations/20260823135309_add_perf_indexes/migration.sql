-- CreateIndex
CREATE INDEX "Match_matchDayId_idx" ON "Match"("matchDayId");

-- CreateIndex
CREATE INDEX "Match_status_approvalSeq_idx" ON "Match"("status", "approvalSeq");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");
