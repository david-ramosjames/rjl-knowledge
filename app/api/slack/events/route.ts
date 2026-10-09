import { after, NextResponse } from "next/server";
import { askKnowledge } from "@/lib/search/ask";
import { formatAskForSlack } from "@/lib/search/format";
import { postSlackMessage } from "@/lib/slack/post";
import { slackTeamAllowed, verifySlackSignature } from "@/lib/slack/signature";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function questionFromMention(text: string) {
  return text.replace(/<@[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifySlackSignature(request, rawBody)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: {
    type?: string;
    challenge?: string;
    team_id?: string;
    event?: {
      type?: string;
      subtype?: string;
      bot_id?: string;
      channel?: string;
      ts?: string;
      thread_ts?: string;
      text?: string;
      user?: string;
    };
  };
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.type === "url_verification") {
    return NextResponse.json({ challenge: payload.challenge ?? "" });
  }

  if (!slackTeamAllowed(payload.team_id)) {
    return NextResponse.json({ error: "Unauthorized workspace" }, { status: 401 });
  }

  const event = payload.event;
  if (
    payload.type === "event_callback" &&
    event?.type === "app_mention" &&
    !event.bot_id &&
    event.subtype !== "bot_message" &&
    event.channel
  ) {
    const question = questionFromMention(event.text ?? "");
    const channel = event.channel;
    const threadTs = event.thread_ts || event.ts;

    after(async () => {
      try {
        if (question.length < 2) {
          await postSlackMessage({
            channel,
            threadTs,
            text: "Ask me a question about firm knowledge, a form, or a process, and I will point you to the Knowledge Hub article.",
          });
          return;
        }

        const result = await askKnowledge(question);
        await postSlackMessage({
          channel,
          threadTs,
          text: result
            ? formatAskForSlack(result)
            : "The Knowledge Hub could not answer right now. Try again in a moment, or search on the site.",
        });
      } catch (error) {
        logError("Slack mention reply failed", {
          message: error instanceof Error ? error.message : "unknown",
        });
      }
    });
  }

  return NextResponse.json({ ok: true });
}
