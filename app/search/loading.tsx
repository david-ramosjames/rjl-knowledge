export default function SearchLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <div className="mx-auto h-12 max-w-3xl animate-pulse rounded-xl bg-white" />
      <div className="mt-10 h-8 w-64 animate-pulse rounded bg-muted" />
      <div className="mt-8 h-40 animate-pulse rounded-2xl bg-white" />
    </main>
  );
}
