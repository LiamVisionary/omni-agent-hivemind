import type { AgentProfile } from "@/lib/types/agent-runtime";
import type { RuntimeAdapter } from "./types";

type OpenAIModelList = {
  data?: Array<{
    id?: string;
    object?: string;
    owned_by?: string;
  }>;
  error?: { message?: string } | string;
};

function cleanBaseUrl(profile: AgentProfile) {
  return (profile.gatewayUrl || "http://127.0.0.1:1234").trim().replace(/\/+$/, "");
}

function buildRuntimeUrl(profile: AgentProfile, path: string) {
  const base = cleanBaseUrl(profile);
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

function errorMessage(data: OpenAIModelList | null, fallback: string) {
  if (typeof data?.error === "string") return data.error;
  return data?.error?.message || fallback;
}

async function fetchModels(profile: AgentProfile): Promise<OpenAIModelList> {
  const response = await fetch(buildRuntimeUrl(profile, profile.statusPath || "/v1/models"), {
    headers: {
      ...(profile.token ? { Authorization: `Bearer ${profile.token}` } : {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  const data = await response.json().catch(() => null) as OpenAIModelList | null;
  if (!response.ok) throw new Error(errorMessage(data, `OpenAI-compatible runtime returned ${response.status}`));
  return data ?? {};
}

export const openAICompatibleAdapter: RuntimeAdapter = {
  runtime: "openai-compatible",
  label: "Local OpenAI",
  kind: "interactive",
  capabilities: {
    status: true,
    chat: true,
    modelSelection: true,
  },
  defaultProfile: {
    gatewayUrl: process.env.NEXT_PUBLIC_LOCAL_OPENAI_BASE_URL ?? "http://127.0.0.1:1234",
    chatPath: "/v1/chat/completions",
    statusPath: "/v1/models",
    provider: "lm-studio",
    model: process.env.NEXT_PUBLIC_LOCAL_OPENAI_MODEL ?? "",
  },
  async getStatus(profile) {
    const data = await fetchModels(profile);
    const models = (data.data ?? [])
      .map((model) => model.id)
      .filter((model): model is string => Boolean(model));
    return {
      baseUrl: cleanBaseUrl(profile),
      chatPath: profile.chatPath || "/v1/chat/completions",
      models,
      modelSelection: {
        provider: profile.provider || "openai-compatible",
        model: profile.model || models[0] || "",
        providers: [{
          slug: profile.provider || "openai-compatible",
          name: profile.provider === "ollama"
            ? "Ollama"
            : profile.provider === "vllm"
              ? "vLLM"
              : profile.provider === "llamacpp"
                ? "llama.cpp"
                : profile.provider === "lm-studio"
                  ? "LM Studio"
                  : "OpenAI-compatible",
          models: models.map((id) => ({ id })),
          totalModels: models.length,
          isCurrent: true,
          isUserDefined: true,
          source: buildRuntimeUrl(profile, profile.statusPath || "/v1/models"),
        }],
      },
    };
  },
};
