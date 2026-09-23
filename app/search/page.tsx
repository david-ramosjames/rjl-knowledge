import { SearchBar } from "@/components/search/search-bar";
import { KnowledgeCard } from "@/components/topics/knowledge-card";
import { DEFAULT_CATEGORIES, categoryFromSlug } from "@/lib/categories";
import { searchKnowledge } from "@/lib/search";

export const dynamic = "force-dynamic";

function resolveCategory(raw?: string) {
  if (!raw) return undefined;
  const decoded = decodeURIComponent(raw);
  return categoryFromSlug(decoded) ?? DEFAULT_CATEGORIES.find((item) => item === decoded) ?? decoded;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const category = resolveCategory(typeof params.category === "string" ? params.category : undefined);
  const results = await searchKnowledge(query, { category });

  const heading = query
    ? `Results for “${query}”`
    : category
      ? category
      : "Search the Knowledge Hub";

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <SearchBar size="md" initialQuery={query} />
      </div>

      <div className="mt-10">
        <h1 className="text-3xl font-semibold tracking-tight">{heading}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {results.length} result{results.length === 1 ? "" : "s"}
          {category ? ` in ${category}` : ""}
        </p>
      </div>

      {results.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-border px-5 py-8 text-sm text-muted-foreground">
          {query || category
            ? "No matching knowledge yet. Try a broader term, or browse from the homepage."
            : "Enter a search term, or choose a category from the homepage."}
        </p>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {results.map((item) => (
            <KnowledgeCard
              key={`${item.kind}-${item.id}`}
              kind={item.kind}
              title={item.title}
              href={item.href}
              category={item.category}
              summary={item.summary}
              lastDiscussedAt={item.lastDiscussedAt}
              meta={item.meta}
            />
          ))}
        </div>
      )}
    </main>
  );
}
