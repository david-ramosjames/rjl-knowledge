import { asStringArray, normalizeTitle } from "@/lib/utils";

export type TopicMatchInput = {
  id: string;
  title: string;
  slug: string;
  category: string;
  keywords: unknown;
  normalizedTitle: string;
};

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "in",
  "on",
  "for",
  "to",
  "with",
  "when",
  "how",
  "issues",
  "issue",
  "case",
  "cases",
  "client",
  "clients",
]);

function tokens(value: string) {
  return normalizeTitle(value)
    .split(" ")
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function jaccard(a: string[], b: string[]) {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  return intersection / new Set([...setA, ...setB]).size;
}

export function scoreTopicMatch(
  candidate: { title: string; keywords: string[] },
  topic: TopicMatchInput,
): number {
  const candidateTitle = normalizeTitle(candidate.title);
  const topicTitle = topic.normalizedTitle || normalizeTitle(topic.title);
  if (candidateTitle === topicTitle) return 1;

  const candidateTokens = tokens(candidate.title);
  const topicTokens = tokens(topic.title);
  const titleScore = jaccard(candidateTokens, topicTokens);

  const candidateKeywords = candidate.keywords.map((item) => normalizeTitle(item)).filter(Boolean);
  const topicKeywords = asStringArray(topic.keywords).map((item) => normalizeTitle(item));
  const keywordScore = jaccard(candidateKeywords, topicKeywords);

  const candidateBlob = new Set([...candidateTokens, ...candidateKeywords]);
  const topicBlob = new Set([...topicTokens, ...topicKeywords]);
  let overlap = 0;
  for (const token of candidateBlob) {
    if (topicBlob.has(token)) overlap += 1;
  }

  let score = titleScore * 0.7 + keywordScore * 0.3;
  if (overlap >= 2) score += 0.15;
  if (candidateTitle.includes(topicTitle) || topicTitle.includes(candidateTitle)) score += 0.2;

  return Math.min(score, 1);
}

export function findSuggestedTopic(
  candidate: { title: string; keywords: string[] },
  topics: TopicMatchInput[],
  threshold = 0.42,
): TopicMatchInput | null {
  let best: { topic: TopicMatchInput; score: number } | null = null;

  for (const topic of topics) {
    const score = scoreTopicMatch(candidate, topic);
    if (!best || score > best.score) {
      best = { topic, score };
    }
  }

  if (!best || best.score < threshold) return null;
  return best.topic;
}
