import DashboardApp, { type DashboardVaultPanelMode } from "@/features/dashboard/DashboardApp";
import type { DashboardView } from "@/features/dashboard/dashboard-types";
import { listDynamicWorkHistory } from "@/lib/services/work-history/dynamic-changelog";

const DASHBOARD_VIEWS = new Set<DashboardView>([
  "agents",
  "kanban",
  "scheduler",
  "swarm",
  "history",
  "wallet",
  "vault",
  "integrations",
  "maintenance",
  "memory",
  "files",
  "notifications",
  "chat",
  "more",
  "env",
  "my-apps",
  "aeon",
]);
const DASHBOARD_VAULT_PANEL_MODES = new Set<DashboardVaultPanelMode>([
  "hive-vault",
  "shared-skills",
  "brain-services",
  "config",
]);

type HomeProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const rawView = Array.isArray(params?.view) ? params?.view[0] : params?.view;
  const initialView = rawView && DASHBOARD_VIEWS.has(rawView as DashboardView)
    ? rawView as DashboardView
    : undefined;
  const rawVaultPanel = Array.isArray(params?.vaultPanel) ? params?.vaultPanel[0] : params?.vaultPanel;
  const initialVaultPanelMode = rawVaultPanel && DASHBOARD_VAULT_PANEL_MODES.has(rawVaultPanel as DashboardVaultPanelMode)
    ? rawVaultPanel as DashboardVaultPanelMode
    : undefined;
  const initialWorkHistory = initialView === "history"
    ? await listDynamicWorkHistory({ limit: 10 }).catch(() => undefined)
    : undefined;

  return <DashboardApp initialView={initialView} initialVaultPanelMode={initialVaultPanelMode} initialWorkHistory={initialWorkHistory} />;
}
