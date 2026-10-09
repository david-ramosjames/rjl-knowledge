import { after, NextResponse } from "next/server";
import { askKnowledge } from "@/lib/search/ask";
import { formatAskForSlack } from "@/lib/search/format";
import { postSlackResponseUrl } from "@/lib/slack/post";
import { slackTeamAllowed, verifySlackSignature } from "@/lib/slack/signature";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifySlackSignature(request, rawBody)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = new URLSearchParams(rawBody);
  if (!slackTeamAllowed(params.get("team_id"))) {
    return NextResponse.json({ error: "Unauthorized workspace" }, { status: 401 });
  }

  const question = (params.get("text") ?? "").trim();
  const responseUrl = params.get("response_url") ?? "";

  if (question.length < 2) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Try `/knowledge how do we name PI intake files?`",
    });
  }

  after(async () => {
    if (!responseUrl) return;
    try {
      const result = await askKnowledge(question);
      await postSlackResponseUrl(responseUrl, {
        response_type: "in_channel",
        text: result
          ? formatAskForSlack(result)
          : "The Knowledge Hub could not answer right now. Try again in a moment.",
      });
    } catch (error) {
      logError("Slack slash command reply failed", {
        message: error instanceof Error ? error.message : "unknown",
      });
      await postSlackResponseUrl(responseUrl, {
        response_type: "ephemeral",
        text: "The Knowledge Hub could not answer right now. Try again in a moment.",
      });
    }
  });

  return NextResponse.json({
    response_type: "ephemeral",
    text: "Looking that up in the Knowledge Hub…",
  });
}
