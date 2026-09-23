import { DocumentForm } from "@/components/admin/document-form";

export const maxDuration = 180;
export const dynamic = "force-dynamic";

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Admin</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Add firm document</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Keep the original file in Google Drive. Paste the text here so the hub can publish a
        searchable article and a download link.
      </p>
      <div className="mt-8">
        <DocumentForm error={error} />
      </div>
    </main>
  );
}
