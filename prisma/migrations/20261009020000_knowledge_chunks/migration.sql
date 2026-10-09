CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KnowledgeChunk_kind_sourceId_chunkIndex_key" ON "KnowledgeChunk"("kind", "sourceId", "chunkIndex");
CREATE INDEX "KnowledgeChunk_kind_sourceId_idx" ON "KnowledgeChunk"("kind", "sourceId");
CREATE INDEX "KnowledgeChunk_contentHash_idx" ON "KnowledgeChunk"("contentHash");
CREATE INDEX "KnowledgeChunk_embedding_idx" ON "KnowledgeChunk" USING hnsw ("embedding" vector_cosine_ops);
