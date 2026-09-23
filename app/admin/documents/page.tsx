import Link from "next/link";
import { Plus } from "lucide-react";
import { DeleteArticleButton } from "@/components/admin/delete-article-button";
import { ErrorBanner } from "@/components/error-banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listArticlesForAdmin } from "@/lib/db/articles";
import { formatCompactDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  const articles = await listArticlesForAdmin();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
        ← Admin
      </Link>
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Firm documents</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Guides, naming conventions, and other firm knowledge. The article is searchable; the
            original file stays on Google Drive.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/documents/new">
            <Plus className="size-4" />
            Add document
          </Link>
        </Button>
      </div>

      {query.error === "delete" ? (
        <div className="mt-6">
          <ErrorBanner message="That article could not be deleted. Refresh and try again." />
        </div>
      ) : null}

      <Card className="mt-8 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Article</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Updated</th>
              <th className="px-4 py-3 font-medium">File</th>
              <th className="px-4 py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {articles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-muted-foreground">
                  No documents yet. Add a Google Drive guide to get started.
                </td>
              </tr>
            ) : (
              articles.map((article) => (
                <tr key={article.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/articles/${article.slug}`} className="font-medium hover:underline">
                      {article.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{article.category}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatCompactDate(article.updatedAt)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{article.fileName || "Google Drive"}</td>
                  <td className="px-4 py-3 text-right">
                    <DeleteArticleButton articleId={article.id} title={article.title} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </main>
  );
}
