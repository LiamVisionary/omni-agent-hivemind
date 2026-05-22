import type { RuntimeAdapter } from "./types";

export const hermesAdapter: RuntimeAdapter = {
  runtime: "hermes",
  label: "Hermes",
  kind: "interactive",
  capabilities: {
    status: true,
    chat: true,
    runs: true,
    memory: true,
    sessionSearch: true,
    backgroundTasks: true,
    xSearch: true,
    videoGeneration: true,
    codexRuntime: true,
    kanbanDecompose: true,
    setup: true,
    walletTools: true,
  },
  defaultProfile: {
    gatewayUrl: process.env.NEXT_PUBLIC_HERMES_BASE_URL ?? "http://127.0.0.1:8642",
    chatPath: "/chat",
    statusPath: "/health",
    localDataDir: "~/.hermes",
  },
};
