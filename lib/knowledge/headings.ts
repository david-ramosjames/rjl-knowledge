import { slugify } from "@/lib/utils";

export type KnowledgeHeading = {
  id: string;
  title: string;
  level: 2 | 3;
};

export function headingId(title: string, used: Set<string>) {
  const base = slugify(title.replace(/:$/, ""));
  let id = base;
  let suffix = 2;
  while (used.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(id);
  return id;
}

export function collectHeadings(
  items: Array<{ title: string; level?: 2 | 3 } | null | undefined>,
) {
  const used = new Set<string>();
  const headings: KnowledgeHeading[] = [];
  for (const item of items) {
    if (!item?.title.trim()) continue;
    headings.push({
      id: headingId(item.title, used),
      title: item.title.trim(),
      level: item.level ?? 2,
    });
  }
  return headings;
}
