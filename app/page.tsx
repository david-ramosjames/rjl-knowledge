import { SearchBar } from "@/components/search/search-bar";
import { CategoryGrid } from "@/components/topics/category-grid";
import { KnowledgeCard } from "@/components/topics/knowledge-card";
import { RjlLogo } from "@/components/brand/rjl-logo";
import { getRecentKnowledge, getUsedCategories } from "@/lib/search";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [items, categories] = await Promise.all([getRecentKnowledge(6), getUsedCategories()]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <section className="mx-auto max-w-3xl text-center">
        <RjlLogo className="mx-auto" />
        <h1 className="mt-6 font-serif text-5xl tracking-tight text-primary sm:text-6xl">
          Knowledge Hub
        </h1>
        <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
          Search meetings, guides, and other knowledge about Ramos James Law.
        </p>
        <div className="mt-10">
          <SearchBar autoFocus />
        </div>
      </section>

      <section className="mt-16">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Recent knowledge
            </h2>
          </div>
        </div>
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-5 py-8 text-sm text-muted-foreground">
            Nothing published yet. Add a meeting or a firm document from Admin.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
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
