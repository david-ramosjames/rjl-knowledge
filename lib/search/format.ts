import { knowledgeHubUrl } from "@/lib/app-origin";
import type { KnowledgeAskResult } from "@/lib/search/ask";
import type { KnowledgeSearchResult } from "@/lib/search";

export function formatAskForMcp(result: KnowledgeAskResult) {
  const sources =
    result.citations.length === 0
      ? ""
      : `\n\nOpen these Knowledge Hub pages:\n${result.citations
          .map((citation) => `- ${citation.title}: ${knowledgeHubUrl(citation.href)}`)
          .join("\n")}`;
  return `${result.answer}${sources}`;
}

export function formatSearchForMcp(results: KnowledgeSearchResult[]) {
  if (results.length === 0) {
    return "No matching Knowledge Hub pages were found.";
  }

  return results
    .slice(0, 8)
    .map((item, index) => {
      const url = knowledgeHubUrl(item.href);
      return `${index + 1}. ${item.title} (${item.category})\n${item.summary}\n${url}`;
    })
    .join("\n\n");
}

export function toSlackMrkdwn(text: string) {
  return text.replace(/\*\*(.+?)\*\*/g, "*$1*");
}

export function formatAskForSlack(result: KnowledgeAskResult) {
  const answer = toSlackMrkdwn(result.answer);
  if (result.citations.length === 0) return answer;

  const links = result.citations
    .map((citation) => `• <${knowledgeHubUrl(citation.href)}|${citation.title}>`)
    .join("\n");
  return `${answer}\n\n*Open in the Knowledge Hub*\n${links}`;
}
