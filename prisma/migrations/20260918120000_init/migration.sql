-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('DRAFT', 'PROCESSING', 'AWAITING_REVIEW', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "TopicStatus" AS ENUM ('APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('PENDING', 'APPROVED', 'IGNORED');

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "meetingDate" TIMESTAMP(3) NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "youtubeVideoId" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "participants" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "MeetingStatus" NOT NULL DEFAULT 'DRAFT',
    "processingError" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "normalizedTitle" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "keyPoints" JSONB NOT NULL,
    "keywords" JSONB NOT NULL,
    "searchText" TEXT NOT NULL,
    "status" "TopicStatus" NOT NULL DEFAULT 'APPROVED',
    "lastDiscussedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discussion" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "startSeconds" INTEGER NOT NULL,
    "endSeconds" INTEGER,
    "sourceSummary" TEXT NOT NULL,
    "transcriptExcerpt" TEXT NOT NULL,
    "speakers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Discussion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicCandidate" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "keyPoints" JSONB NOT NULL,
    "keywords" JSONB NOT NULL,
    "startSeconds" INTEGER NOT NULL,
    "endSeconds" INTEGER,
    "speakers" JSONB NOT NULL,
    "transcriptExcerpt" TEXT NOT NULL,
    "status" "CandidateStatus" NOT NULL DEFAULT 'PENDING',
    "suggestedTopicId" TEXT,
    "approvedTopicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopicCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Meeting_youtubeVideoId_idx" ON "Meeting"("youtubeVideoId");

-- CreateIndex
CREATE INDEX "Meeting_status_idx" ON "Meeting"("status");

-- CreateIndex
CREATE INDEX "Meeting_meetingDate_idx" ON "Meeting"("meetingDate");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_slug_key" ON "Topic"("slug");

-- CreateIndex
CREATE INDEX "Topic_category_idx" ON "Topic"("category");

-- CreateIndex
CREATE INDEX "Topic_status_lastDiscussedAt_idx" ON "Topic"("status", "lastDiscussedAt");

-- CreateIndex
CREATE INDEX "Topic_normalizedTitle_idx" ON "Topic"("normalizedTitle");

-- CreateIndex
CREATE INDEX "Topic_searchText_fts_idx" ON "Topic" USING GIN (to_tsvector('english', "searchText"));

-- CreateIndex
CREATE INDEX "Discussion_topicId_idx" ON "Discussion"("topicId");

-- CreateIndex
CREATE INDEX "Discussion_meetingId_idx" ON "Discussion"("meetingId");

-- CreateIndex
CREATE INDEX "TopicCandidate_meetingId_status_idx" ON "TopicCandidate"("meetingId", "status");

-- CreateIndex
CREATE INDEX "TopicCandidate_status_idx" ON "TopicCandidate"("status");

-- AddForeignKey
ALTER TABLE "Discussion" ADD CONSTRAINT "Discussion_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discussion" ADD CONSTRAINT "Discussion_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicCandidate" ADD CONSTRAINT "TopicCandidate_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicCandidate" ADD CONSTRAINT "TopicCandidate_suggestedTopicId_fkey" FOREIGN KEY ("suggestedTopicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicCandidate" ADD CONSTRAINT "TopicCandidate_approvedTopicId_fkey" FOREIGN KEY ("approvedTopicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
