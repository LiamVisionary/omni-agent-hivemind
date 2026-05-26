export type WorkHistoryProject = {
  id: string;
  name: string;
  root: string;
  source: "workspace" | "projects" | "vault";
  changelogPath: string;
};

export type WorkHistoryEntry = {
  id: string;
  projectId: string;
  projectName: string;
  source: WorkHistoryProject["source"];
  changelogPath: string;
  heading: string;
  title: string;
  timestamp?: string;
  status?: string;
  areas?: string;
  summary: string;
  verification?: string;
  commitSummary?: string;
  body: string;
  sortTime: number;
};

export type WorkHistoryPayload = {
  ok?: boolean;
  error?: string;
  generatedAt?: string;
  projects: WorkHistoryProject[];
  entries: WorkHistoryEntry[];
  totalEntries?: number;
  offset?: number;
  limit?: number;
  hasMore?: boolean;
  truncated?: boolean;
};
