import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-16">
      <h1 className="font-serif text-4xl">Page not found</h1>
      <p className="mt-3 text-sm text-muted-foreground">That page is not in RJL Knowledge.</p>
      <Link href="/" className="mt-6 text-sm text-accent hover:underline">
        Back to the hub
      </Link>
    </main>
  );
}
