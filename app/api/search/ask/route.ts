import { NextResponse } from "next/server";
import { askKnowledge } from "@/lib/search/ask";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: { q?: unknown; category?: unknown };
  try {
    body = (await request.json()) as { q?: unknown; category?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid search request." }, { status: 400 });
  }

  const query = typeof body.q === "string" ? body.q.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : undefined;
  if (query.length < 2) {
    return NextResponse.json({ result: null });
  }

  const result = await askKnowledge(query, { category: category || undefined });
  return NextResponse.json({ result });
}
