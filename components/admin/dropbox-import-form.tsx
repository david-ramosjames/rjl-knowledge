"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { importDropboxFileAction, scanDropboxFolderAction, type DropboxImportFile } from "@/app/actions/dropbox-import";
import { ErrorBanner } from "@/components/error-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FileState = "pending" | "importing" | "imported" | "skipped" | "failed";

type Row = DropboxImportFile & {
  state: FileState;
  detail?: string;
  slug?: string;
};

export function DropboxImportForm({
  configured,
  defaultFolder,
}: {
  configured: boolean;
  defaultFolder?: string;
}) {
  const [source, setSource] = useState(defaultFolder ?? "");
  const [rows, setRows] = useState<Row[]>([]);
  const [scanned, setScanned] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);

  const importedCount = rows.filter((row) => row.state === "imported").length;
  const skippedCount = rows.filter((row) => row.state === "skipped").length;
  const failedCount = rows.filter((row) => row.state === "failed").length;
  const alreadyCount = rows.filter((row) => row.alreadyImported && row.state === "skipped").length;

  async function onScan(event: FormEvent) {
    event.preventDefault();
    if (!configured) return;
    setScanning(true);
    setError(null);
    setCurrent(null);
    try {
      const result = await scanDropboxFolderAction(source);
      if (!result.ok) {
        setRows([]);
        setError(result.message);
        return;
      }
      setScanned(result.scanned);
      setRows(
        result.files.map((file) => ({
          ...file,
          state: file.alreadyImported ? "skipped" : "pending",
          detail: file.alreadyImported ? "Already in the hub." : undefined,
        })),
      );
    } finally {
      setScanning(false);
    }
  }

  async function importFiles(targets: Row[]) {
    if (running || targets.length === 0) return;
    setRunning(true);
    setError(null);
    for (const file of targets) {
      setCurrent(file.name);
      setRows((currentRows) =>
        currentRows.map((row) => (row.path === file.path ? { ...row, state: "importing", detail: undefined } : row)),
      );
      const result = await importDropboxFileAction(file);
      setRows((currentRows) =>
        currentRows.map((row) => {
          if (row.path !== file.path) return row;
          if (result.status === "imported") {
            return { ...row, state: "imported", slug: result.slug, detail: result.title };
          }
          if (result.status === "skipped") {
            return { ...row, state: "skipped", detail: result.reason };
          }
          return { ...row, state: "failed", detail: result.message };
        }),
      );
    }
    setCurrent(null);
    setRunning(false);
  }

  return (
    <div className="space-y-8">
      {!configured ? (
        <ErrorBanner message="Add DROPBOX_APP_KEY, DROPBOX_APP_SECRET, and DROPBOX_REFRESH_TOKEN on the Railway app service (the same Dropbox keys the firm already uses). DROPBOX_NAMESPACE_ID and DROPBOX_CASES_ROOT are recommended so the scan starts in the right team folder." />
      ) : null}
      {error ? <ErrorBanner message={error} /> : null}

      <form onSubmit={onScan} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="dropbox-source">Dropbox folder</Label>
          <Input
            id="dropbox-source"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder={defaultFolder || "/Firm Knowledge or a shared folder link"}
            disabled={!configured || scanning || running}
          />
          <p className="text-xs leading-5 text-muted-foreground">
            Blank uses DROPBOX_CASES_ROOT when that is set. Files in named folders get that
            category; loose files let the AI choose. PDF, Word, and text files only.
          </p>
        </div>
        <Button type="submit" disabled={!configured || scanning || running}>
          {scanning ? "Scanning…" : "Scan folder"}
        </Button>
      </form>

      {rows.length > 0 ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-medium">
                {rows.length} importable files
                {scanned > rows.length ? ` (${scanned} items in Dropbox)` : ""}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {importedCount} imported · {alreadyCount || skippedCount} skipped · {failedCount} failed
                {current ? ` · Reading ${current}` : ""}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Keep this page open. Each file is ingested one at a time so Railway does not time out.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => importFiles(rows.filter((row) => row.state === "pending"))}
                disabled={running || rows.every((row) => row.state !== "pending")}
              >
                {running ? "Importing…" : "Import new files"}
              </Button>
              {failedCount > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => importFiles(rows.filter((row) => row.state === "failed"))}
                  disabled={running}
                >
                  Retry failed
                </Button>
              ) : null}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">File</th>
                  <th className="px-4 py-3 font-medium">Folder</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.path} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.name}</div>
                      {row.slug ? (
                        <Link href={`/articles/${row.slug}`} className="text-xs text-accent hover:underline">
                          Open article
                        </Link>
                      ) : row.detail ? (
                        <div className="mt-1 text-xs text-muted-foreground">{row.detail}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.folder || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.category || "AI will choose"}</td>
                    <td className="px-4 py-3">{statusLabel(row.state)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function statusLabel(state: FileState) {
  switch (state) {
    case "importing":
      return "Reading…";
    case "imported":
      return "Imported";
    case "skipped":
      return "Skipped";
    case "failed":
      return "Failed";
    default:
      return "Ready";
  }
}
