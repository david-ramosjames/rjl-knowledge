import Link from "next/link";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Search" },
  { href: "/documents", label: "Documents" },
  { href: "/big-cases", label: "Big Cases" },
  { href: "/new-cases", label: "New Cases" },
] as const;

export function HubNav() {
  return (
    <>
      {LINKS.map((link) => (
        <Button key={link.href} asChild variant="ghost" size="sm">
          <Link href={link.href}>{link.label}</Link>
        </Button>
      ))}
    </>
  );
}
