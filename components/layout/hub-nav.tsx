import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HubNav() {
  return (
    <>
      <Button asChild variant="ghost" size="sm">
        <Link href="/">Home</Link>
      </Button>
      <Button asChild variant="ghost" size="sm">
        <Link href="/search">Search</Link>
      </Button>
      <Button asChild variant="ghost" size="sm">
        <Link href="/documents">Documents</Link>
      </Button>
    </>
  );
}
