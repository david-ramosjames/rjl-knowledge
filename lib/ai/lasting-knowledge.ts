import type { ExtractedDiscussion } from "@/lib/ai/prompts";

const OPERATIONAL_TITLE =
  /^(action items?|to-?dos?|follow[- ]ups?|housekeeping|scheduling|coverage|assignments?|admin(istrative)? (items?|updates?|notes)|weekly (update|status|recap|check-?in)|(this|next) week('?s)?( (update|status|files?|cases?))?|case (status|updates?)|file updates?)\b/i;

const TASK_POINT =
  /^(call|email|text|follow up|send|schedule|set up|reach out|remind|assign|check in with|ping|loop in)\b/i;

export function isLastingKnowledge(discussion: ExtractedDiscussion) {
  const title = discussion.title.trim();
  if (!title) return false;
  if (OPERATIONAL_TITLE.test(title)) return false;

  const points = discussion.key_points.map((point) => point.trim()).filter(Boolean);
  if (points.length > 0) {
    const taskHits = points.filter((point) => TASK_POINT.test(point)).length;
    if (taskHits >= Math.ceil(points.length * 0.7)) return false;
  }

  return true;
}
