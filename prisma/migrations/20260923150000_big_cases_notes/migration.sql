-- CreateEnum
CREATE TYPE "MeetingKind" AS ENUM ('KNOWLEDGE', 'BIG_CASES');

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN "kind" "MeetingKind" NOT NULL DEFAULT 'KNOWLEDGE';

-- AlterTable
ALTER TABLE "Article" ALTER COLUMN "driveUrl" DROP NOT NULL;
ALTER TABLE "Article" ADD COLUMN "meetingId" TEXT;

-- CreateIndex
CREATE INDEX "Meeting_kind_idx" ON "Meeting"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "Article_meetingId_key" ON "Article"("meetingId");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
