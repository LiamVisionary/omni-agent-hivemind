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

export type KanbanAgentSession = {
  agentId: string;
  agentName: string;
  telemetryUrl?: string;
  sessionId: string;
  startedAt: number;
  updatedAt: number;
  lastMessageCount?: number;
};

export type KanbanTaskAttachment = {
  id: string;
  kind: "image" | "audio" | "file";
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
};

export type KanbanLinkedDirectory = {
  id: string;
  name: string;
  path?: string;
  machineName?: string;
  machineKey?: string;
  lastUsedAt?: number;
};

export type KanbanMachineTarget = {
  key: string;
  name: string;
  collectorUrl?: string;
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
  attachments?: KanbanTaskAttachment[];
  linkedDirectories?: KanbanLinkedDirectory[];
  targetMachine?: KanbanMachineTarget | null;
  agentSession?: KanbanAgentSession | null;
  idempotencyKey?: string;
  reviewedAt?: number;
  reviewedBy?: string;
  undoRequestedAt?: number;
  undoRequestedBy?: string;
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
  { id: "ideas", title: "Ideas", description: "Capture rough thoughts. Nothing runs from here." },
  { id: "ready", title: "Waiting for Queen", description: "Ready for the Queen Bee to assign or take on." },
  { id: "working", title: "Working", description: "Claimed by an agent and actively being handled." },
  { id: "needs-human", title: "Needs You", description: "Blocked on access, approval, or a decision." },
  { id: "done", title: "Done", description: "Finished with notes, evidence, or a result." },
  { id: "archived", title: "Archived", description: "Hidden from the main board, kept for history." },
];

export const KANBAN_STATUSES = KANBAN_COLUMNS.map((column) => column.id);
