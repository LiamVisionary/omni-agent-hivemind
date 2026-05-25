export type NangoHostMode = "tailnet" | "local" | "cloud";

export type NangoProviderKey = "github" | "linear" | "slack" | "notion" | "google";

export type NangoHostConfig = {
  version: 1;
  enabled: boolean;
  hostMachineId: string;
  hostMachineName: string;
  baseUrl: string;
  mode: NangoHostMode;
  allowedProviders: NangoProviderKey[];
  updatedAt: string;
};

export type NangoConnectionSummary = {
  id: string;
  providerConfigKey: string;
  provider?: string;
  displayName?: string;
  email?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type NangoHostHealth = {
  ok: boolean;
  checkedAt: string;
  url: string;
  latencyMs?: number;
  status?: number;
  result?: string;
  error?: string;
};

export type NangoIntegrationPayload = {
  ok: boolean;
  config: NangoHostConfig;
  storagePath: string;
  env: {
    enabled: boolean;
    baseUrl: string;
    hostMachineId: string;
    secretConfigured: boolean;
  };
  health: NangoHostHealth;
  connections: NangoConnectionSummary[];
  connectionError?: string;
  setupCommands: string[];
};
