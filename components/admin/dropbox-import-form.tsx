"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { importDropboxFileAction, scanDropboxFolderAction, type DropboxImportFile } from "@/app/actions/dropbox-import";
import { ErrorBanner } from "@/components/error-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DropboxRelevance } from "@/lib/dropbox/relevance";
import { cn } from "@/lib/utils";

type FileState = "pending" | "importing" | "imported" | "skipped" | "failed";
type ViewFilter = DropboxRelevance | "all";

type Row = DropboxImportFile & {
  state: FileState;
  detail?: string;
  slug?: string;
};

const PAGE_SIZE = 40;

export function DropboxImportForm({
  configured,
  defaultFolder,
}: {
  configured: boolean;
  defaultFolder?: string;
}) {
  const [source, setSource] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [scanned, setScanned] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ViewFilter>("knowledge");
  const [page, setPage] = useState(0);

  const counts = useMemo(() => {
    const knowledge = rows.filter((row) => row.relevance === "knowledge").length;
    const review = rows.filter((row) => row.relevance === "review").length;
    const skip = rows.filter((row) => row.relevance === "skip").length;
    return { knowledge, review, skip };
  }, [rows]);

  const importedCount = rows.filter((row) => row.state === "imported").length;
  const failedCount = rows.filter((row) => row.state === "failed").length;

  const visibleRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter !== "all" && row.relevance !== filter) return false;
      if (!needle) return true;
      return `${row.name} ${row.folder} ${row.category}`.toLowerCase().includes(needle);
    });
  }, [rows, filter, query]);

  const pageCount = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pagedRows = visibleRows.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  const importTargets = rows.filter((row) => {
    if (row.state !== "pending" && row.state !== "failed") return false;
    if (filter === "all") return row.relevance === "knowledge";
    if (filter === "skip") return false;
    return row.relevance === filter;
  });

  async function onScan(event: FormEvent) {
    event.preventDefault();
    if (!configured) return;
    setScanning(true);
    setError(null);
    setCurrent(null);
    setQuery("");
    setPage(0);
    try {
      const result = await scanDropboxFolderAction(source);
      if (!result.ok) {
        setRows([]);
        setError(result.message);
        return;
      }
      setScanned(result.scanned);
      const nextRows = result.files.map((file) => ({
        ...file,
        state: file.alreadyImported || file.relevance === "skip" ? ("skipped" as const) : ("pending" as const),
        detail: file.alreadyImported
          ? "Already in the hub."
          : file.relevance === "skip"
            ? file.skipReason
            : file.relevance === "review"
              ? file.skipReason
              : undefined,
      }));
      setRows(nextRows);
      const knowledge = nextRows.filter((row) => row.relevance === "knowledge" && row.state === "pending").length;
      setFilter(knowledge > 0 ? "knowledge" : "review");
    } finally {
      setScanning(false);
    }
  }

  async function importFiles(targets: Row[], force = false) {
    if (running || targets.length === 0) return;
    setRunning(true);
    setError(null);
    for (const file of targets) {
      setCurrent(file.name);
      setRows((currentRows) =>
        currentRows.map((row) => (row.path === file.path ? { ...row, state: "importing", detail: undefined } : row)),
      );
      const result = await importDropboxFileAction(file, { force: force || file.relevance !== "knowledge" });
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
            placeholder={defaultFolder ? `${defaultFolder}/FORMS` : "/RAMOS JAMES LAW CASES/FORMS"}
            disabled={!configured || scanning || running}
          />
          <p className="text-xs leading-5 text-muted-foreground">
            Paste a Dropbox /home URL or a path under the cases root. After the scan, contracts and
            numbered form packets stay out of the import queue. Only guides, policies, process docs,
            and similar knowledge files are queued by default.
          </p>
        </div>
        <Button type="submit" disabled={!configured || scanning || running}>
          {scanning ? "Scanning…" : "Scan folder"}
        </Button>
      </form>

      {rows.length > 0 ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {counts.knowledge} knowledge files
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · {counts.review} to review · {counts.skip} excluded
                  {scanned ? ` · ${scanned} items in Dropbox` : ""}
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {importedCount} imported · {failedCount} failed
                {current ? ` · Reading ${current}` : ""}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Keep this page open. Import only the knowledge set unless you open Review and choose
                those files on purpose.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => importFiles(importTargets, filter === "review")}
                disabled={running || importTargets.length === 0 || filter === "skip"}
              >
                {running
                  ? "Importing…"
                  : filter === "review"
                    ? `Import ${importTargets.length} reviewed`
                    : `Import ${importTargets.length} knowledge files`}
              </Button>
              {failedCount > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => importFiles(rows.filter((row) => row.state === "failed"), true)}
                  disabled={running}
                >
                  Retry failed
                </Button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-2">
              <FilterChip
                active={filter === "knowledge"}
                onClick={() => {
                  setFilter("knowledge");
                  setPage(0);
                }}
              >
                Knowledge ({counts.knowledge})
              </FilterChip>
              <FilterChip
                active={filter === "review"}
                onClick={() => {
                  setFilter("review");
                  setPage(0);
                }}
              >
                Review ({counts.review})
              </FilterChip>
              <FilterChip
                active={filter === "skip"}
                onClick={() => {
                  setFilter("skip");
                  setPage(0);
                }}
              >
                Excluded ({counts.skip})
              </FilterChip>
              <FilterChip
                active={filter === "all"}
                onClick={() => {
                  setFilter("all");
                  setPage(0);
                }}
              >
                All ({rows.length})
              </FilterChip>
            </div>
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
              placeholder="Search files"
              className="sm:ml-auto sm:max-w-xs"
            />
          </div>

          <div className="max-w-full overflow-hidden rounded-xl border border-border">
            <div className="max-h-[min(28rem,60vh)] overflow-auto">
              <table className="w-full table-fixed text-left text-sm">
                <colgroup>
                  <col className="w-[46%]" />
                  <col className="w-[22%]" />
                  <col className="w-[20%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <thead className="sticky top-0 z-10 border-b border-border bg-muted/95 text-muted-foreground backdrop-blur">
                  <tr>
                    <th className="px-3 py-2 font-medium">File</th>
                    <th className="px-3 py-2 font-medium">Folder</th>
                    <th className="px-3 py-2 font-medium">Category</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-muted-foreground">
                        Nothing in this view. Try Review if the knowledge list is empty.
                      </td>
                    </tr>
                  ) : (
                    pagedRows.map((row) => (
                      <tr key={row.path} className="border-b border-border last:border-0">
                        <td className="max-w-0 px-3 py-2">
                          <div className="truncate font-medium" title={row.name}>
                            {row.name}
                          </div>
                          {row.slug ? (
                            <Link href={`/articles/${row.slug}`} className="text-xs text-accent hover:underline">
                              Open article
                            </Link>
                          ) : row.detail ? (
                            <div className="mt-0.5 truncate text-xs text-muted-foreground" title={row.detail}>
                              {row.detail}
                            </div>
                          ) : null}
                        </td>
                        <td className="max-w-0 truncate px-3 py-2 text-muted-foreground" title={row.folder}>
                          {row.folder || "—"}
                        </td>
                        <td className="max-w-0 truncate px-3 py-2 text-muted-foreground" title={row.category}>
                          {row.category || "AI will choose"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{statusLabel(row)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2 text-xs text-muted-foreground">
              <span>
                {visibleRows.length === 0
                  ? "0 files"
                  : `${currentPage * PAGE_SIZE + 1}–${Math.min(visibleRows.length, currentPage * PAGE_SIZE + PAGE_SIZE)} of ${visibleRows.length}`}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={currentPage === 0}
                  onClick={() => setPage((value) => Math.max(0, value - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= pageCount - 1}
                  onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function statusLabel(row: Row) {
  if (row.state === "importing") return "Reading…";
  if (row.state === "imported") return "Imported";
  if (row.state === "failed") return "Failed";
  if (row.state === "skipped") return row.relevance === "skip" ? "Excluded" : "Skipped";
  if (row.relevance === "review") return "Review";
  return "Ready";
}
