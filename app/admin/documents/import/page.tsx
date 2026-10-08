import Link from "next/link";
import { DropboxImportForm } from "@/components/admin/dropbox-import-form";
import { defaultDropboxFolderPath, isDropboxConfigured } from "@/lib/dropbox/client";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

export default async function ImportDocumentsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <Link href="/admin/documents" className="text-sm text-muted-foreground hover:text-foreground">
        ← Documents
      </Link>
      <div className="mt-6">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Import from Dropbox</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Scan a Dropbox folder. The file’s folder becomes its topic. Contracts stay out of the
          queue; on Review you can exclude files you do not want, then import the rest.
        </p>
      </div>
      <div className="mt-8">
        <DropboxImportForm
          configured={isDropboxConfigured()}
          defaultFolder={defaultDropboxFolderPath()}
        />
      </div>
    </main>
  );
}
