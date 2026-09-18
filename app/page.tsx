import { SearchBar } from "@/components/search/search-bar";
import { CategoryGrid } from "@/components/topics/category-grid";
import { TopicCard } from "@/components/topics/topic-card";
import { getRecentTopics, getUsedCategories } from "@/lib/search";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [topics, categories] = await Promise.all([getRecentTopics(6), getUsedCategories()]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <section className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-secondary">
          Ramos James Law
        </p>
        <h1 className="mt-3 font-serif text-5xl tracking-tight text-primary sm:text-6xl">
          RJL Knowledge
        </h1>
        <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
          Search what our attorneys have discussed.
        </p>
        <div className="mt-10">
          <SearchBar autoFocus />
        </div>
      </section>

      <section className="mt-16">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Recently discussed
            </h2>
          </div>
        </div>
        {topics.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-5 py-8 text-sm text-muted-foreground">
            No published topics yet. Process a meeting from Admin to populate the hub.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic) => (
              <TopicCard
                key={topic.id}
                title={topic.title}
                slug={topic.slug}
                category={topic.category}
                summary={topic.summary}
                lastDiscussedAt={topic.lastDiscussedAt}
                discussionCount={topic._count.discussions}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-16 pb-8">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Browse by category
        </h2>
        <CategoryGrid counts={categories} />
      </section>
    </main>
  );
}
