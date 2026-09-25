import { KnowledgeCard } from "@/components/topics/knowledge-card";
import { listPublishedArticles } from "@/lib/db/articles";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Documents",
};

export default async function DocumentsPage() {
  const articles = await listPublishedArticles();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Documents</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Guides, naming conventions, Big Cases and New Cases notes, and other firm documents.
      </p>

      {articles.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-border px-5 py-8 text-sm text-muted-foreground">
          No documents published yet.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <KnowledgeCard
              key={article.id}
              kind="article"
              title={article.title}
              href={`/articles/${article.slug}`}
              category={article.category}
              summary={article.summary}
              lastDiscussedAt={article.updatedAt}
              meta={article.fileName || undefined}
            />
          ))}
        </div>
      )}
    </main>
  );
}
