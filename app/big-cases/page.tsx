import { ArticleIndex } from "@/components/knowledge/article-index";
import { listPublishedArticles } from "@/lib/db/articles";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Big Cases",
};

export default async function BigCasesPage() {
  const articles = await listPublishedArticles({ category: "Big Cases" });

  return (
    <ArticleIndex
      title="Big Cases"
      description="Monthly attorney reviews of highest-value and developing cases, kept as one note each month."
      empty="No Big Cases notes yet. Add a Big Cases meeting from Admin."
      articles={articles}
    />
  );
}
