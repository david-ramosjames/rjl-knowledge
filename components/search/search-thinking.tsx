"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const STEPS = [
  "Finding matching pages",
  "Reading the articles",
  "Writing an answer",
];

const TYPICAL_SECONDS = 12;

export function SearchThinking() {
  const [elapsed, setElapsed] = useState(0);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const tick = window.setInterval(() => {
      const seconds = (Date.now() - started) / 1000;
      setElapsed(seconds);
      setStep(Math.min(STEPS.length - 1, Math.floor(seconds / 3.4)));
    }, 200);
    return () => window.clearInterval(tick);
  }, []);

  const progress = Math.min(92, 8 + (elapsed / TYPICAL_SECONDS) * 84);
  const whole = Math.max(0, Math.floor(elapsed));
  const hint =
    elapsed < 15
      ? "Usually 8–15 seconds"
      : "Still reading — this one is taking a bit longer";

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-white shadow-[0_8px_30px_rgba(28,25,23,0.04)]">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-[color-mix(in_srgb,var(--primary)_6%,white)] px-5 py-3">
        <div className="flex items-center gap-3">
          <Sparkles className="size-4 animate-pulse text-accent" />
          <p className="text-sm font-medium text-primary">{STEPS[step]}…</p>
        </div>
        <p className="text-xs tabular-nums text-muted-foreground">{whole}s</p>
      </div>
      <div className="px-5 py-5">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{hint}</p>
        <ol className="mt-4 grid gap-2">
          {STEPS.map((label, index) => {
            const state = index < step ? "done" : index === step ? "active" : "wait";
            return (
              <li key={label} className="flex items-center gap-3 text-sm">
                <span
                  className={
                    state === "active"
                      ? "size-2 shrink-0 animate-pulse rounded-full bg-accent"
                      : state === "done"
                        ? "size-2 shrink-0 rounded-full bg-primary"
                        : "size-2 shrink-0 rounded-full bg-border"
                  }
                />
                <span className={state === "wait" ? "text-muted-foreground" : "text-foreground"}>
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
