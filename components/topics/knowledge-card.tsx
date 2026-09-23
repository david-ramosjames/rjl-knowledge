import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCompactDate } from "@/lib/utils";
import type { KnowledgeKind } from "@/lib/search";

export function KnowledgeCard({
  kind,
  title,
  href,
  category,
  summary,
  lastDiscussedAt,
  meta,
}: {
  kind: KnowledgeKind;
  title: string;
  href: string;
  category: string;
  summary: string;
  lastDiscussedAt?: Date | string | null;
  meta?: string;
}) {
  return (
    <Link href={href} className="block h-full">
      <Card className="h-full p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(28,25,23,0.06)]">
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge className="bg-white">{category}</Badge>
          <Badge className="bg-muted">
            {category === "Big Cases" ? "Big Cases" : kind === "article" ? "Document" : "Meeting"}
          </Badge>
        </div>
        <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{summary}</p>
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {lastDiscussedAt
              ? `${kind === "article" ? "Updated" : "Last discussed"} ${formatCompactDate(lastDiscussedAt)}`
              : "Not yet dated"}
          </span>
          {meta ? <span>{meta}</span> : null}
        </div>
      </Card>
    </Link>
  );
}
