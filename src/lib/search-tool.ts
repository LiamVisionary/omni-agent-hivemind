import { tool } from "ai";
import { z } from "zod";
import { tavily } from "@tavily/core";

export type SearchResultItem = {
  title: string;
  content: string;
  url: string;
};

async function searchWithExa(
  query: string,
  maxResults: number,
): Promise<SearchResultItem[]> {
  const key = process.env.EXA_API_KEY;
  if (!key) {
    throw new Error("EXA_API_KEY is not set");
  }
  const res = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
    },
    body: JSON.stringify({
      query,
      numResults: maxResults,
      contents: { text: true },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Exa search failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as {
    results?: Array<{ title?: string; url: string; text?: string }>;
  };
  return (data.results ?? []).map((r) => ({
    title: r.title ?? r.url,
    content: r.text ?? "",
    url: r.url,
  }));
}

async function searchWithTavily(
  query: string,
  maxResults: number,
): Promise<SearchResultItem[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) {
    throw new Error("TAVILY_API_KEY is not set");
  }
  const client = tavily({ apiKey: key });
  const response = await client.search(query, {
    maxResults,
    searchDepth: "advanced",
  });
  return (response.results ?? []).map((r) => ({
    title: r.title,
    content: r.content,
    url: r.url,
  }));
}

/**
 * Web search tool: uses Tavily when TAVILY_API_KEY is set, otherwise Exa when EXA_API_KEY is set.
 */
export const searchTool = tool({
  description:
    "Search the web for current information, news, documentation, or facts. Use for recent events, versions, or anything that may have changed after the model's knowledge cutoff.",
  inputSchema: z.object({
    query: z.string().describe("Focused search query"),
    maxResults: z
      .number()
      .min(1)
      .max(10)
      .optional()
      .default(5)
      .describe("Number of results to return (1–10)"),
  }),
  execute: async ({ query, maxResults }) => {
    const n = maxResults ?? 5;
    try {
      if (process.env.TAVILY_API_KEY) {
        const results = await searchWithTavily(query, n);
        return { provider: "tavily" as const, query, results };
      }
      if (process.env.EXA_API_KEY) {
        const results = await searchWithExa(query, n);
        return { provider: "exa" as const, query, results };
      }
      return {
        error:
          "No search API configured. Set TAVILY_API_KEY or EXA_API_KEY in .env.local",
        query,
        results: [] as SearchResultItem[],
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return {
        error: message,
        query,
        results: [] as SearchResultItem[],
      };
    }
  },
});
