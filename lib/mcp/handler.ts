import { askKnowledge } from "@/lib/search/ask";
import { searchKnowledge } from "@/lib/search";
import { formatAskForMcp, formatSearchForMcp } from "@/lib/search/format";
import { logError } from "@/lib/logger";

const PROTOCOL_VERSION = "2025-03-26";

type JsonRpcId = string | number | null;
type JsonRpcRequest = {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
  params?: {
    name?: string;
    arguments?: Record<string, unknown>;
    protocolVersion?: string;
  };
};

const tools = [
  {
    name: "ask_knowledge_hub",
    title: "Ask the Knowledge Hub",
    description:
      "Answer a Ramos James Law staff question from the internal Knowledge Hub. Use this when someone asks about firm process, forms, naming conventions, intake, reviews, meetings, or how the firm does something. Returns a grounded answer plus Knowledge Hub article URLs. Always include those URLs in the Slack reply. Do not invent policy that is not in the hub.",
    inputSchema: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "The staff member's question in plain language.",
        },
      },
      required: ["question"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "search_knowledge_hub",
    title: "Search the Knowledge Hub",
    description:
      "Find Knowledge Hub articles and meeting topics by meaning or keywords. Use when the person wants a list of pages rather than one written answer. Return the titles and URLs so they can open the pages.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search terms or a short question.",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
];

function jsonRpcResult(id: JsonRpcId, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function jsonRpcError(id: JsonRpcId, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function textResult(text: string) {
  return { content: [{ type: "text", text }] };
}

async function callTool(name: string, args: Record<string, unknown>) {
  if (name === "ask_knowledge_hub") {
    const question = typeof args.question === "string" ? args.question.trim() : "";
    if (question.length < 2) {
      return textResult("Ask a specific question about firm knowledge, a form, or a process.");
    }
    const result = await askKnowledge(question);
    if (!result) {
      return textResult("The Knowledge Hub could not answer right now. Try again in a moment.");
    }
    return textResult(formatAskForMcp(result));
  }

  if (name === "search_knowledge_hub") {
    const query = typeof args.query === "string" ? args.query.trim() : "";
    if (query.length < 2) {
      return textResult("Provide a search term or short question.");
    }
    const results = await searchKnowledge(query);
    return textResult(formatSearchForMcp(results));
  }

  throw new Error(`Unknown tool: ${name}`);
}

export async function handleMcpRequest(payload: JsonRpcRequest) {
  const id = payload.id ?? null;
  const method = payload.method ?? "";

  if (method === "initialize") {
    return jsonRpcResult(id, {
      protocolVersion: payload.params?.protocolVersion || PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: {
        name: "rjl-knowledge-hub",
        title: "RJL Knowledge Hub",
        version: "1.0.0",
      },
      instructions:
        "This server answers Ramos James Law staff questions from the internal Knowledge Hub. Prefer ask_knowledge_hub for questions. Always include the returned article URLs in the reply so people can open the source.",
    });
  }

  if (method === "notifications/initialized" || method === "notifications/cancelled") {
    return null;
  }

  if (method === "ping") {
    return jsonRpcResult(id, {});
  }

  if (method === "tools/list") {
    return jsonRpcResult(id, { tools });
  }

  if (method === "tools/call") {
    const name = payload.params?.name ?? "";
    const args = payload.params?.arguments ?? {};
    try {
      const result = await callTool(name, args);
      return jsonRpcResult(id, result);
    } catch (error) {
      logError("MCP tool call failed", {
        tool: name,
        message: error instanceof Error ? error.message : "unknown",
      });
      return jsonRpcResult(id, {
        ...textResult("The Knowledge Hub tool failed. Try again in a moment."),
        isError: true,
      });
    }
  }

  if (method.startsWith("notifications/")) {
    return null;
  }

  return jsonRpcError(id, -32601, `Method not found: ${method}`);
}
