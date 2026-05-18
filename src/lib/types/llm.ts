export interface OpenClawConfig {
  enabled: boolean;
  gatewayUrl?: string;
  token?: string;
  workspacePath?: string;
  pullMemoriesFromAgent?: boolean;
  pushMemoriesToAgent?: boolean;
}

export function validateOpenClawConfig(config: unknown): config is OpenClawConfig {
  return typeof config === "object" && config !== null;
}
