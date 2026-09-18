"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchBar({
  size = "lg",
  initialQuery = "",
  autoFocus = false,
}: {
  size?: "lg" | "md";
  initialQuery?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (!q) {
      router.push("/search");
      return;
    }
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={onSubmit} className="w-full">
      <label className="sr-only" htmlFor="knowledge-search">
        Search knowledge
      </label>
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl border border-border bg-white shadow-[0_8px_30px_rgba(28,25,23,0.04)] focus-within:ring-2 focus-within:ring-ring",
          size === "lg" ? "h-16 px-5" : "h-12 px-4 rounded-xl",
        )}
      >
        <Search className="size-5 text-muted-foreground" />
        <input
          id="knowledge-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoFocus={autoFocus}
          placeholder="Search cases, issues, strategies, or firm guidance…"
          className={cn(
            "h-full w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground",
            size === "lg" ? "text-lg" : "text-sm",
          )}
        />
        <button
          type="submit"
          className="hidden rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:inline-flex"
        >
          Search
        </button>
      </div>
    </form>
  );
}
