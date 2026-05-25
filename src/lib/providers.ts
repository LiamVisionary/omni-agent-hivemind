import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGroq } from "@ai-sdk/groq";
import type { LanguageModel } from "ai";

/**
 * Resolves the chat model from environment (first match wins):
 * OPENAI_API_KEY → OpenAI
 * ANTHROPIC_API_KEY → Anthropic
 * GROQ_API_KEY → Groq
 * LOCAL_OPENAI_BASE_URL → local OpenAI-compatible /v1
 * OLLAMA_BASE_URL → Ollama (OpenAI-compatible /v1)
 */
export function getLanguageModel(): LanguageModel {
  if (process.env.OPENAI_API_KEY) {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai(process.env.OPENAI_MODEL ?? "gpt-4o");
  }

  if (process.env.ANTHROPIC_API_KEY) {
    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    return anthropic(process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-20241022");
  }

  if (process.env.GROQ_API_KEY) {
    const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
    return groq(process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile");
  }

  if (process.env.LOCAL_OPENAI_BASE_URL) {
    const base = process.env.LOCAL_OPENAI_BASE_URL.replace(/\/$/, "");
    const localOpenAI = createOpenAI({
      baseURL: `${base}/v1`,
      apiKey: process.env.LOCAL_OPENAI_API_KEY || "local",
      name: "local-openai",
    });
    return localOpenAI(process.env.LOCAL_OPENAI_MODEL ?? "local-model");
  }

  if (process.env.OLLAMA_BASE_URL) {
    const base = process.env.OLLAMA_BASE_URL.replace(/\/$/, "");
    const ollama = createOpenAI({
      baseURL: `${base}/v1`,
      apiKey: "ollama",
      name: "ollama",
    });
    return ollama(process.env.OLLAMA_MODEL ?? "llama3.2");
  }

  throw new Error(
    "No LLM configured. Set one of: OPENAI_API_KEY, ANTHROPIC_API_KEY, GROQ_API_KEY, LOCAL_OPENAI_BASE_URL, or OLLAMA_BASE_URL.",
  );
}
