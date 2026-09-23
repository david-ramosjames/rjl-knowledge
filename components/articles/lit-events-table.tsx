import { Card } from "@/components/ui/card";
import type { LitEventRow } from "@/lib/utils";

export function LitEventsTable({ rows }: { rows: LitEventRow[] }) {
  if (rows.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Upcoming lit events tracker
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Attorney, case, and the next concrete step from this review.
      </p>
      <Card className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Attorney</th>
              <th className="px-4 py-3 font-medium">Case</th>
              <th className="px-4 py-3 font-medium">Lit event / next step</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.attorney}-${row.caseName}-${row.nextStep}-${index}`} className="border-b border-border last:border-0">
                <td className="px-4 py-3 align-top font-medium">{row.attorney}</td>
                <td className="px-4 py-3 align-top">{row.caseName}</td>
                <td className="px-4 py-3 align-top leading-6">{row.nextStep}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
