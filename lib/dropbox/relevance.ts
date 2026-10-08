export type DropboxRelevance = "knowledge" | "review" | "skip";

const KNOWLEDGE_RE =
  /\b(guide|guidebook|handbook|manual|polic(?:y|ies)|procedure|process|sop|playbook|training|onboarding|orientation|naming|convention|workflow|protocol|checklist|how[\s-]?to|faq|wiki|standard operating|style guide|org chart|employee handbook|firm process|knowledge|best practices?)\b/i;

const SKIP_RE =
  /\b(contract|retainer|fee agreement|representation agreement|engagement letter|hipaa|authorization|authorisation|records request|medical records|letter of protection|\blop\b|lien|assignment of benefits|\baob\b|w-?9\b|w-?4\b|i-?9\b|direct deposit|power of attorney|release of|waiver|consent to treat|privacy notice|notice of privacy|fee sheet)\b/i;

export function classifyDropboxFile(file: { name: string; path: string; folder: string }): {
  relevance: DropboxRelevance;
  skipReason?: string;
} {
  const haystack = `${file.name} ${file.folder} ${file.path}`;

  if (KNOWLEDGE_RE.test(haystack)) {
    return { relevance: "knowledge" };
  }

  if (SKIP_RE.test(haystack)) {
    return { relevance: "skip", skipReason: "Looks like a case form, not lasting firm knowledge." };
  }

  if (isNumberedFormPacket(file)) {
    return { relevance: "skip", skipReason: "Numbered forms packet, not a knowledge article." };
  }

  return {
    relevance: "review",
    skipReason: "Not clearly a knowledge document. Review before importing.",
  };
}

function isNumberedFormPacket(file: { path: string; folder: string }) {
  if (/^\d+[\.\)\s_-]+/.test(file.folder)) return true;
  return file.path.split("/").some((part) => /^\d+[\.\)\s_-]+/.test(part));
}
