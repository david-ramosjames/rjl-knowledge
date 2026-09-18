import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCompactDate } from "@/lib/utils";

export function TopicCard({
  title,
  slug,
  category,
  summary,
  lastDiscussedAt,
  discussionCount,
}: {
  title: string;
  slug: string;
  category: string;
  summary: string;
  lastDiscussedAt?: Date | string | null;
  discussionCount?: number;
}) {
  return (
    <Link href={`/topics/${slug}`} className="block h-full">
      <Card className="h-full p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(28,25,23,0.06)]">
        <Badge className="mb-3 bg-white">{category}</Badge>
        <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{summary}</p>
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>{lastDiscussedAt ? `Last discussed ${formatCompactDate(lastDiscussedAt)}` : "Not yet dated"}</span>
          {typeof discussionCount === "number" ? (
            <span>
              {discussionCount} source{discussionCount === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
      </Card>
    </Link>
  );
}
