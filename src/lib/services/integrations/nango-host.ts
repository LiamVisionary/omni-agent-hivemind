import { constants, existsSync, statSync } from "fs";
import { access, mkdir, readFile, rename, writeFile } from "fs/promises";
import { dirname, join, relative, sep } from "path";
import { checkNangoHealth, listNangoConnections, normalizeNangoHost } from "@/lib/services/integrations/nango-client";
import { resolveObsidianVaultPath } from "@/lib/services/obsidian/vault-path";
import type { NangoHostConfig, NangoIntegrationPayload, NangoProviderKey } from "@/lib/types/integrations";

const CONFIG_PATH = "HivemindOS/Integrations/nango-host.json";
const DEFAULT_ALLOWED_PROVIDERS: NangoProviderKey[] = ["github", "linear", "slack", "notion", "google"];

type Storage = {
  vaultRoot: string;
  file: string;
};

type UpdateNangoHostInput = {
  enabled?: boolean;
  hostMachineId?: string;
  hostMachineName?: string;
  baseUrl?: string;
  mode?: NangoHostConfig["mode"];
  allowedProviders?: NangoProviderKey[];
};

export function defaultNangoHostConfig(): NangoHostConfig {
  const baseUrl = process.env.NANGO_BASE_URL || process.env.NANGO_HOST || "http://localhost:3003";
  return {
    version: 1,
    enabled: process.env.HIVE_NANGO_ENABLED === "true" || Boolean(process.env.NANGO_BASE_URL),
    hostMachineId: process.env.HIVE_NANGO_HOST_MACHINE ?? "",
    hostMachineName: process.env.HIVE_NANGO_HOST_MACHINE ?? "",
    baseUrl: normalizeNangoHost(baseUrl),
    mode: baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1") ? "local" : "tailnet",
    allowedProviders: DEFAULT_ALLOWED_PROVIDERS,
    updatedAt: new Date().toISOString(),
  };
}

export async function readNangoIntegrationPayload(): Promise<NangoIntegrationPayload> {
  const storage = await resolveStorage();
  const config = await readNangoHostConfig(storage);
  const health = await checkNangoHealth(config.baseUrl);
  let connections: NangoIntegrationPayload["connections"] = [];
  let connectionError: string | undefined;
  try {
    connections = await listNangoConnections({
      baseUrl: config.baseUrl,
      secretKey: process.env.NANGO_SECRET_KEY,
    });
  } catch (error) {
    connectionError = error instanceof Error ? error.message : "Could not list Nango connections.";
  }

  return {
    ok: true,
    config,
    storagePath: relative(storage.vaultRoot, storage.file).split(sep).join("/"),
    env: {
      enabled: process.env.HIVE_NANGO_ENABLED === "true",
      baseUrl: process.env.NANGO_BASE_URL ?? "",
      hostMachineId: process.env.HIVE_NANGO_HOST_MACHINE ?? "",
      secretConfigured: Boolean(process.env.NANGO_SECRET_KEY?.trim()),
    },
    health,
    connections,
    connectionError,
    setupCommands: setupCommands(config),
  };
}

export async function updateNangoHostConfig(input: UpdateNangoHostInput): Promise<NangoIntegrationPayload> {
  const storage = await resolveStorage();
  const current = await readNangoHostConfig(storage);
  const next: NangoHostConfig = {
    ...current,
    enabled: typeof input.enabled === "boolean" ? input.enabled : current.enabled,
    hostMachineId: input.hostMachineId?.trim() ?? current.hostMachineId,
    hostMachineName: input.hostMachineName?.trim() ?? current.hostMachineName,
    baseUrl: normalizeNangoHost(input.baseUrl ?? current.baseUrl),
    mode: input.mode === "local" || input.mode === "cloud" || input.mode === "tailnet" ? input.mode : current.mode,
    allowedProviders: normalizeProviders(input.allowedProviders) ?? current.allowedProviders,
    updatedAt: new Date().toISOString(),
  };
  await writeConfig(storage.file, next);
  return readNangoIntegrationPayload();
}

async function resolveStorage(): Promise<Storage> {
  const vaultRoot = resolveObsidianVaultPath(undefined, { requireWritable: true });
  if (!statSync(vaultRoot).isDirectory()) throw new Error("Vault path is not a directory.");
  await access(vaultRoot, constants.R_OK | constants.W_OK);
  return {
    vaultRoot,
    file: join(vaultRoot, CONFIG_PATH),
  };
}

async function readNangoHostConfig(storage: Storage) {
  if (!existsSync(storage.file)) return defaultNangoHostConfig();
  try {
    return normalizeConfig(JSON.parse(await readFile(storage.file, "utf-8")) as Partial<NangoHostConfig>);
  } catch {
    return defaultNangoHostConfig();
  }
}

function normalizeConfig(input: Partial<NangoHostConfig>): NangoHostConfig {
  const fallback = defaultNangoHostConfig();
  return {
    version: 1,
    enabled: typeof input.enabled === "boolean" ? input.enabled : fallback.enabled,
    hostMachineId: typeof input.hostMachineId === "string" ? input.hostMachineId : fallback.hostMachineId,
    hostMachineName: typeof input.hostMachineName === "string" ? input.hostMachineName : fallback.hostMachineName,
    baseUrl: normalizeNangoHost(input.baseUrl ?? fallback.baseUrl),
    mode: input.mode === "local" || input.mode === "cloud" || input.mode === "tailnet" ? input.mode : fallback.mode,
    allowedProviders: normalizeProviders(input.allowedProviders) ?? fallback.allowedProviders,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : fallback.updatedAt,
  };
}

function normalizeProviders(input?: unknown) {
  if (!Array.isArray(input)) return undefined;
  const allowed = new Set(DEFAULT_ALLOWED_PROVIDERS);
  const providers = input.filter((value): value is NangoProviderKey => (
    typeof value === "string" && allowed.has(value as NangoProviderKey)
  ));
  return providers.length ? [...new Set(providers)] : undefined;
}

async function writeConfig(file: string, config: NangoHostConfig) {
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.tmp`;
  await writeFile(tmp, JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });
  await rename(tmp, file);
}

function setupCommands(config: NangoHostConfig) {
  const host = config.hostMachineName || config.hostMachineId || "integration-host";
  return [
    `ssh ${host}`,
    "git clone https://github.com/NangoHQ/nango.git ~/nango",
    "cd ~/nango && cp .env.example .env",
    `printf 'NANGO_SERVER_URL=${config.baseUrl}\\nSERVER_PORT=3003\\n' >> .env`,
    "docker compose up -d",
  ];
}
