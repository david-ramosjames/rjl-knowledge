import Link from "next/link";
import { DEFAULT_CATEGORIES } from "@/lib/categories";
import { Card } from "@/components/ui/card";

export function CategoryGrid({
  counts,
}: {
  counts: { category: string; count: number }[];
}) {
  const countMap = new Map(counts.map((item) => [item.category, item.count]));
  const extra = counts.filter((item) => !DEFAULT_CATEGORIES.includes(item.category as (typeof DEFAULT_CATEGORIES)[number]));
  const categories = [...DEFAULT_CATEGORIES, ...extra.map((item) => item.category)];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {categories.map((category) => {
        const count = countMap.get(category) ?? 0;
        return (
          <Link key={category} href={`/search?category=${encodeURIComponent(category)}`}>
            <Card className="h-full px-4 py-4 transition-colors hover:bg-muted/60">
              <div className="text-sm font-medium text-foreground">{category}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {count} item{count === 1 ? "" : "s"}
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
