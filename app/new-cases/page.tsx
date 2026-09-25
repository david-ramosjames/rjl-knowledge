import { ArticleIndex } from "@/components/knowledge/article-index";
import { listPublishedArticles } from "@/lib/db/articles";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "New Cases",
};

export default async function NewCasesPage() {
  const articles = await listPublishedArticles({ category: "New Cases" });

  return (
    <ArticleIndex
      title="New Cases"
      description="New Cases Review notes: incoming matters, owners, and the next steps to get those files moving."
      empty="No New Cases notes yet. Add a New Cases Review meeting from Admin."
      articles={articles}
    />
  );
}
