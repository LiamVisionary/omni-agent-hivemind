export type RecentDirectory = {
  id: string;
  name: string;
  path?: string;
  machineName?: string;
  machineKey?: string;
  source?: "picker" | "kanban" | "chat" | "recent";
  lastUsedAt: number;
  useCount: number;
};
