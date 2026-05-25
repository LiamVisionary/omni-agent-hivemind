import DashboardApp from "@/features/dashboard/DashboardApp";
import type { DashboardView } from "@/features/dashboard/dashboard-types";

const DASHBOARD_VIEWS = new Set<DashboardView>([
  "agents",
  "kanban",
  "scheduler",
  "swarm",
  "wallet",
  "vault",
  "integrations",
  "maintenance",
  "files",
  "notifications",
  "chat",
  "more",
  "env",
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

  return <DashboardApp initialView={initialView} />;
}
