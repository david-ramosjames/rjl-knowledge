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

export async function completeJson(messages: { role: "system" | "user"; content: string }[]) {
  const client = getOpenAIClient();

  try {
    const completion = await client.chat.completions.create({
      model: getOpenAIModel(),
      temperature: 0.2,
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
