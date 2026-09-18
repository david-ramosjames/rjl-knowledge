import { SearchBar } from "@/components/search/search-bar";
import { TopicCard } from "@/components/topics/topic-card";
import { DEFAULT_CATEGORIES, categoryFromSlug } from "@/lib/categories";
import { searchTopics } from "@/lib/search";

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
  const results = await searchTopics(query, { category });

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
          {results.length} topic{results.length === 1 ? "" : "s"}
          {category ? ` in ${category}` : ""}
        </p>
      </div>

      {results.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-border px-5 py-8 text-sm text-muted-foreground">
          {query || category
            ? "No matching topics yet. Try a broader term, or browse from the homepage."
            : "Enter a search term, or choose a category from the homepage."}
        </p>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {results.map((topic) => (
            <TopicCard
              key={topic.id}
              title={topic.title}
              slug={topic.slug}
              category={topic.category}
              summary={topic.summary}
              lastDiscussedAt={topic.lastDiscussedAt}
              discussionCount={topic.discussionCount}
            />
          ))}
        </div>
      )}
    </main>
  );
}
