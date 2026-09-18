import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

const PLACEHOLDER_SPEAKER =
  /^(unidentified(?:\s+speaker)?|unknown(?:\s+speaker)?|speaker\s*\d+|participant\s*\d+|guest|you|n\/?a|none)$/i;

export function namedSpeakers(values: string[]): string[] {
  return uniqueStrings(values).filter((name) => !PLACEHOLDER_SPEAKER.test(name));
}

export function parseParticipants(input: string | null | undefined): string[] {
  if (!input) return [];
  return uniqueStrings(input.split(/[,;\n]/));
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "topic";
}

export function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildSearchText(input: {
  title: string;
  category: string;
  summary: string;
  keyPoints: string[];
  keywords: string[];
}): string {
  return [input.title, input.category, input.summary, ...input.keyPoints, ...input.keywords]
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n");
}

export function formatDate(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

export function formatCompactDate(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}
