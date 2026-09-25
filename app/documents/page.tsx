import { ArticleIndex } from "@/components/knowledge/article-index";
import { listPublishedArticles } from "@/lib/db/articles";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Documents",
};

export default async function DocumentsPage() {
  const articles = await listPublishedArticles({
    excludeCategories: ["Big Cases", "New Cases"],
  });

  return (
    <ArticleIndex
      title="Documents"
      description="Guides, naming conventions, and other firm documents."
      empty="No documents published yet."
      articles={articles}
    />
  );
}
