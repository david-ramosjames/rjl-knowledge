import { NextResponse } from "next/server";
import { handleMcpRequest } from "@/lib/mcp/handler";
import { slackTeamAllowed, verifyMcpAuthorization } from "@/lib/slack/signature";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function mcpHeaders() {
  return {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };
}

export async function GET() {
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
}

export async function DELETE() {
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyMcpAuthorization(request, rawBody)) {
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32600, message: "Unauthorized" }, id: null },
      { status: 401, headers: mcpHeaders() },
    );
  }

  let payload: {
    jsonrpc?: string;
    id?: string | number | null;
    method?: string;
    params?: {
      name?: string;
      arguments?: Record<string, unknown>;
      protocolVersion?: string;
      _meta?: { slack?: { team_id?: string | null } };
    };
  };
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null },
      { status: 400, headers: mcpHeaders() },
    );
  }

  const slackMeta = payload.params?._meta?.slack;
  if (slackMeta && !slackTeamAllowed(slackMeta.team_id)) {
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32600, message: "Unauthorized workspace" }, id: payload.id ?? null },
      { status: 401, headers: mcpHeaders() },
    );
  }

  const result = await handleMcpRequest(payload);
  if (!result) {
    return new NextResponse(null, { status: 202 });
  }
  return NextResponse.json(result, { headers: mcpHeaders() });
}
