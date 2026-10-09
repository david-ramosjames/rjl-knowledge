import OpenAI from "openai";
import { AppError, ErrorCodes } from "@/lib/errors";

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AppError(
      ErrorCodes.OPENAI_FAILURE,
      "OPENAI_API_KEY is not configured. Add it to the environment and retry processing. The meeting transcript has been saved.",
      500,
    );
  }

  return new OpenAI({ apiKey });
}

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL || "gpt-4o";
}

export function getEmbeddingModel() {
  return process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
}

export async function embedTexts(inputs: string[]) {
  const texts = inputs.map((text) => text.replace(/\s+/g, " ").trim()).filter(Boolean);
  if (texts.length === 0) return [];

  const client = getOpenAIClient();
  const response = await client.embeddings.create({
    model: getEmbeddingModel(),
    input: texts,
  });

  return response.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}

export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new AppError(
      ErrorCodes.MALFORMED_LLM_JSON,
      "The model did not return valid JSON. The meeting was saved — retry processing.",
    );
  }

  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    throw new AppError(
      ErrorCodes.MALFORMED_LLM_JSON,
      "The model returned JSON that could not be parsed. The meeting was saved — retry processing.",
    );
  }
}

type TextMessage = { role: "system" | "user"; content: string };
type VisionMessage =
  | { role: "system"; content: string }
  | {
      role: "user";
      content: Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
    };

export async function completeJson(messages: TextMessage[] | VisionMessage[]) {
  const client = getOpenAIClient();

  try {
    const completion = await client.chat.completions.create({
      model: getOpenAIModel(),
      temperature: 0.2,
      max_tokens: 8192,
      response_format: { type: "json_object" },
      messages,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new AppError(
        ErrorCodes.MALFORMED_LLM_JSON,
        "The model returned an empty response. The meeting was saved — retry processing.",
      );
    }

    return extractJsonObject(content);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      ErrorCodes.OPENAI_FAILURE,
      "OpenAI processing failed. The meeting transcript was saved and you can retry.",
      502,
    );
  }
}
