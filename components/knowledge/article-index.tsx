import { KnowledgeCard } from "@/components/topics/knowledge-card";

export function ArticleIndex({
  title,
  description,
  empty,
  articles,
}: {
  title: string;
  description: string;
  empty: string;
  articles: {
    id: string;
    title: string;
    slug: string;
    category: string;
    summary: string;
    updatedAt: Date;
    fileName?: string | null;
  }[];
}) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>

      {articles.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-border px-5 py-8 text-sm text-muted-foreground">
          {empty}
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
