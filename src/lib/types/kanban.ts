export type KanbanStatus = "ideas" | "ready" | "working" | "needs-human" | "done" | "archived";

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
  { id: "ideas", title: "Ideas", description: "Park thoughts here. Nothing is automated until you move them onward." },
  { id: "ready", title: "Ready for Queen", description: "Work waiting for the Queen Bee to review, assign, or take herself." },
  { id: "working", title: "Working", description: "The Queen Bee or a worker bee has claimed this." },
  { id: "needs-human", title: "Needs Human", description: "Only used when the colony needs a decision, access, or approval." },
  { id: "done", title: "Done", description: "Finished work with notes, evidence, or a result summary." },
  { id: "archived", title: "Archived", description: "Hidden by default, preserved for audit history." },
];

export const KANBAN_STATUSES = KANBAN_COLUMNS.map((column) => column.id);
