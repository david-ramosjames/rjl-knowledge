import { logError } from "@/lib/logger";

export async function postSlackMessage(input: {
  channel: string;
  text: string;
  threadTs?: string;
}) {
  const token = process.env.SLACK_BOT_TOKEN?.trim();
  if (!token) {
    throw new Error("SLACK_BOT_TOKEN is not set.");
  }

  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      channel: input.channel,
      text: input.text,
      thread_ts: input.threadTs,
      unfurl_links: false,
      unfurl_media: false,
    }),
  });

  const payload = (await response.json()) as { ok?: boolean; error?: string };
  if (!payload.ok) {
    logError("Slack chat.postMessage failed", { error: payload.error ?? "unknown" });
    throw new Error(payload.error || "Slack could not post the reply.");
  }
}

export async function postSlackResponseUrl(responseUrl: string, body: Record<string, unknown>) {
  const response = await fetch(responseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    logError("Slack response_url post failed", { status: response.status });
  }
}
