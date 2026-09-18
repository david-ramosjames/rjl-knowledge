import Link from "next/link";
import { DeleteTopicButton } from "@/components/admin/delete-topic-button";
import { ErrorBanner } from "@/components/error-banner";
import { Card } from "@/components/ui/card";
import { listTopicsForAdmin } from "@/lib/db/topics";
import { formatCompactDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminTopicsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  const topics = await listTopicsForAdmin();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
        ← Admin
      </Link>
      <div className="mt-6">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Knowledge topics</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Delete a published topic to remove it from search and the hub. Source meetings stay in
          Admin if you need to extract it again.
        </p>
      </div>

      {query.error === "delete" ? (
        <div className="mt-6">
          <ErrorBanner message="That topic could not be deleted. Refresh and try again." />
        </div>
      ) : null}

      <Card className="mt-8 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Topic</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Last discussed</th>
              <th className="px-4 py-3 font-medium">Sources</th>
              <th className="px-4 py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {topics.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-muted-foreground">
                  No published topics yet.
                </td>
              </tr>
            ) : (
              topics.map((topic) => (
                <tr key={topic.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/topics/${topic.slug}`} className="font-medium hover:underline">
                      {topic.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{topic.category}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {topic.lastDiscussedAt ? formatCompactDate(topic.lastDiscussedAt) : "—"}
                  </td>
                  <td className="px-4 py-3">{topic._count.discussions}</td>
                  <td className="px-4 py-3 text-right">
                    <DeleteTopicButton topicId={topic.id} title={topic.title} />
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
