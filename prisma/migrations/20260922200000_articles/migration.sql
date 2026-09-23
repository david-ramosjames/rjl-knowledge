-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "normalizedTitle" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "keyPoints" JSONB NOT NULL,
    "keywords" JSONB NOT NULL,
    "searchText" TEXT NOT NULL,
    "driveUrl" TEXT NOT NULL,
    "fileName" TEXT,
    "status" "TopicStatus" NOT NULL DEFAULT 'APPROVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE INDEX "Article_category_idx" ON "Article"("category");

-- CreateIndex
CREATE INDEX "Article_status_updatedAt_idx" ON "Article"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "Article_normalizedTitle_idx" ON "Article"("normalizedTitle");
