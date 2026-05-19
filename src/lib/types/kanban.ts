export type KanbanStatus = "triage" | "todo" | "ready" | "running" | "blocked" | "done" | "archived";

export type KanbanPriority = "low" | "normal" | "high" | "urgent";

export type KanbanColumn = {
  id: KanbanStatus;
  title: string;
  description: string;
};

export type KanbanComment = {
  id: string;
  taskId: string;
  author: string;
  body: string;
  createdAt: number;
};

export type KanbanEvent = {
  id: string;
  taskId?: string;
  kind: string;
  message: string;
  createdAt: number;
};

export type KanbanLink = {
  parentId: string;
  childId: string;
  createdAt: number;
};

export type KanbanTask = {
  id: string;
  title: string;
  body: string;
  result?: string;
  assignee?: string;
  tenant?: string;
  status: KanbanStatus;
  priority: KanbanPriority;
  workspace: "scratch" | "worktree" | `dir:${string}`;
  skills: string[];
  idempotencyKey?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
};

export type KanbanBoardMeta = {
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  createdAt: number;
  updatedAt: number;
};

export type KanbanBoard = {
  meta: KanbanBoardMeta;
  tasks: KanbanTask[];
  comments: KanbanComment[];
  links: KanbanLink[];
  events: KanbanEvent[];
};

export type KanbanColumnGroup = KanbanColumn & {
  tasks: KanbanTask[];
};

export const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: "triage", title: "Triage", description: "Rough ideas waiting to be specified or decomposed." },
  { id: "todo", title: "Todo", description: "Accepted work that is not ready to dispatch yet." },
  { id: "ready", title: "Ready", description: "Unblocked work ready for a profile to claim." },
  { id: "running", title: "Running", description: "Tasks currently owned by a profile or human." },
  { id: "blocked", title: "Blocked", description: "Needs input, a dependency, or retry notes." },
  { id: "done", title: "Done", description: "Completed handoffs with durable evidence." },
  { id: "archived", title: "Archived", description: "Hidden by default, preserved for audit history." },
];

export const KANBAN_STATUSES = KANBAN_COLUMNS.map((column) => column.id);
