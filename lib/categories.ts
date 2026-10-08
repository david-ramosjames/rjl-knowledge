export const DEFAULT_CATEGORIES = [
  "Auto Accidents",
  "Trucking",
  "Premises Liability",
  "Insurance",
  "Litigation",
  "Damages",
  "Medical",
  "Intake & Case Selection",
  "Client Management",
  "Settlement",
  "Firm Process",
  "Firm Guides",
  "Naming Conventions",
  "IT",
  "HR & Benefits",
  "Onboarding",
  "Operations",
  "PI Mastermind",
  "Big Cases",
  "New Cases",
  "Other",
] as const;

export type DefaultCategory = (typeof DEFAULT_CATEGORIES)[number];

const CATEGORY_ALIASES: Record<string, DefaultCategory> = {
  "auto accident": "Auto Accidents",
  "auto accidents": "Auto Accidents",
  "car accident": "Auto Accidents",
  "car accidents": "Auto Accidents",
  trucking: "Trucking",
  "commercial trucking": "Trucking",
  "18 wheeler": "Trucking",
  premises: "Premises Liability",
  "premises liability": "Premises Liability",
  insurance: "Insurance",
  coverage: "Insurance",
  litigation: "Litigation",
  damages: "Damages",
  medical: "Medical",
  medicine: "Medical",
  intake: "Intake & Case Selection",
  "case selection": "Intake & Case Selection",
  "intake & case selection": "Intake & Case Selection",
  "client management": "Client Management",
  clients: "Client Management",
  settlement: "Settlement",
  "firm process": "Firm Process",
  "firm guides": "Firm Guides",
  guides: "Firm Guides",
  guidebook: "Firm Guides",
  "naming conventions": "Naming Conventions",
  naming: "Naming Conventions",
  it: "IT",
  "information technology": "IT",
  hr: "HR & Benefits",
  "hr & benefits": "HR & Benefits",
  benefits: "HR & Benefits",
  onboarding: "Onboarding",
  operations: "Operations",
  "pi mastermind": "PI Mastermind",
  mastermind: "PI Mastermind",
  "personal injury mastermind": "PI Mastermind",
  "big cases": "Big Cases",
  "case review": "Big Cases",
  "new cases": "New Cases",
  "new case review": "New Cases",
  "new cases review": "New Cases",
  other: "Other",
  unidentified: "Other",
  unknown: "Other",
  unspecified: "Other",
  none: "Other",
  "n/a": "Other",
};

export function normalizeCategory(input: string | null | undefined): string {
  const raw = (input ?? "").trim();
  if (!raw) return "Other";

  const exact = DEFAULT_CATEGORIES.find((category) => category.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;

  const alias = CATEGORY_ALIASES[raw.toLowerCase()];
  if (alias) return alias;

  return raw;
}

export function categoryToSlug(category: string): string {
  return category
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function categoryFromSlug(slug: string): string | null {
  const match = DEFAULT_CATEGORIES.find((category) => categoryToSlug(category) === slug);
  return match ?? null;
}

const SKIP_DROPBOX_FOLDERS = new Set([
  "documents",
  "files",
  "docs",
  "dropbox",
  "shared",
  "knowledge",
  "knowledge hub",
  "rjl",
  "ramos james",
  "ramos james law",
  "firm knowledge",
  "unsorted",
  "misc",
  "miscellaneous",
  "home",
  "work",
  "desktop",
  "downloads",
  "my files",
  "forms",
  "form",
  "ramos james law cases",
]);

export function stripFolderNumber(name: string) {
  const stripped = name.replace(/^\d+[\.\)\s_-]+/, "").trim();
  return stripped || name;
}

export function matchKnownCategory(name: string): string | null {
  const raw = name.trim();
  if (!raw) return null;
  const cleaned = stripFolderNumber(raw);
  const exact = DEFAULT_CATEGORIES.find(
    (category) => category.toLowerCase() === raw.toLowerCase() || category.toLowerCase() === cleaned.toLowerCase(),
  );
  if (exact) return exact;
  return CATEGORY_ALIASES[raw.toLowerCase()] ?? CATEGORY_ALIASES[cleaned.toLowerCase()] ?? null;
}

export function categoryFromDropboxPath(path: string): string {
  const folders = path.split("/").filter(Boolean).slice(0, -1);
  if (folders.length === 0) return "";

  for (let index = folders.length - 1; index >= 0; index -= 1) {
    const raw = folders[index];
    const cleaned = stripFolderNumber(raw);
    const lower = cleaned.toLowerCase();
    if (!cleaned || /^(19|20)\d{2}$/.test(cleaned) || SKIP_DROPBOX_FOLDERS.has(lower) || SKIP_DROPBOX_FOLDERS.has(raw.toLowerCase())) {
      continue;
    }
    return matchKnownCategory(cleaned) ?? matchKnownCategory(raw) ?? normalizeCategory(cleaned);
  }
  return "";
}
