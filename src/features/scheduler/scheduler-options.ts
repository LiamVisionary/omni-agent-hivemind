export const SCHEDULE_PRESETS = ["5m", "15m", "30m", "1h", "2h", "6h", "12h", "24h"] as const;

export const SCHEDULER_DYNAMIC_SKILL_ACTIONS_ENABLED = false;
export const SCHEDULER_HERMES_SKILL_CONTEXT_ENABLED = false;

export const SCHEDULER_MODEL_OPTIONS = [
  { value: "", label: "Default" },
  { value: "xai/grok-4-1-fast-non-reasoning", label: "Grok Fast" },
  { value: "xai/grok-4-1", label: "Grok 4.1" },
  { value: "anthropic/claude-sonnet-4-6", label: "Sonnet 4.6" },
  { value: "anthropic/claude-haiku-4-5-20251001", label: "Haiku 4.5" },
  { value: "openai/gpt-5.2", label: "GPT-5.2" },
  { value: "google/gemini-3-flash", label: "Gemini Flash" },
] as const;
