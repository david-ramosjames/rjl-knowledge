-- CreateTable
CREATE TABLE "ArticleSlide" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,

    CONSTRAINT "ArticleSlide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArticleSlide_articleId_sortOrder_idx" ON "ArticleSlide"("articleId", "sortOrder");

-- AddForeignKey
ALTER TABLE "ArticleSlide" ADD CONSTRAINT "ArticleSlide_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
