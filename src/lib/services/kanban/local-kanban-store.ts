import { mkdir, readFile, rename, writeFile } from "fs/promises";
import { existsSync, statSync } from "fs";
import { homedir } from "os";
import { isAbsolute, join, sep } from "path";
import { resolveObsidianVaultPath } from "@/lib/services/obsidian/vault-path";
import { DEFAULT_SHARED_VAULT } from "@/lib/types/agent-runtime";
import type {
  KanbanBoard,
  KanbanBoardMeta,
  KanbanComment,
  KanbanEvent,
  KanbanPriority,
  KanbanStatus,
  KanbanTask,
} from "@/lib/types/kanban";
import { KANBAN_STATUSES } from "@/lib/types/kanban";
import { moveTaskBetweenColumns } from "@/lib/utils/kanban-board";

const ROOT_DIR = join(homedir(), ".omni-agent-hivemind", "kanban");
const BOARDS_DIR = join(ROOT_DIR, "boards");
const DEFAULT_BOARD = "default";
const DEFAULT_VAULT_KANBAN_FOLDER = DEFAULT_SHARED_VAULT.kanbanFolder;

type CreateTaskInput = {
  title: string;
  body?: string;
  assignee?: string;
  tenant?: string;
  status?: KanbanStatus;
  priority?: KanbanPriority;
  workspace?: KanbanTask["workspace"];
  skills?: string[];
  parents?: string[];
  idempotencyKey?: string;
};

type PatchTaskInput = Partial<Pick<KanbanTask, "title" | "body" | "result" | "assignee" | "tenant" | "status" | "priority" | "workspace" | "skills">>;

export type KanbanStorageOptions = {
  vaultPath?: string | null;
  kanbanFolder?: string | null;
};

export type KanbanStorageInfo = {
  source: "obsidian" | "local";
  root: string;
  boardsRoot: string;
  file: string;
  fallbackReason?: string;
};

export function normalizeBoardSlug(input?: string | null) {
  const slug = (input || DEFAULT_BOARD).trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(slug)) {
    throw new Error("Board slug must start with a letter or number and contain only lowercase letters, numbers, hyphens, or underscores.");
  }
  return slug;
}

export function resolveKanbanStorage(slugInput?: string | null, options: KanbanStorageOptions = {}): KanbanStorageInfo {
  const slug = normalizeBoardSlug(slugInput);
  const requestedVault: string | undefined = cleanOptional(options.vaultPath ?? undefined)
    ?? cleanOptional(DEFAULT_SHARED_VAULT.vaultPath ?? undefined);
  const explicitVault = Boolean(cleanOptional(options.vaultPath ?? undefined));
  const folder = safeVaultFolder(options.kanbanFolder) || DEFAULT_VAULT_KANBAN_FOLDER;

  if (requestedVault) {
    const vaultRoot = resolveObsidianVaultPath(requestedVault);
    try {
      if (!statSync(vaultRoot).isDirectory()) throw new Error("Vault path is not a directory.");
      const root = join(vaultRoot, folder);
      const boardsRoot = join(root, "boards");
      return {
        source: "obsidian",
        root,
        boardsRoot,
        file: boardPathFor(root, boardsRoot, slug),
      };
    } catch (error) {
      if (explicitVault) {
        const message = error instanceof Error ? error.message : "Vault path is unavailable.";
        throw new Error(`Kanban vault path is unavailable: ${message}`);
      }
    }
  }

  return {
    source: "local",
    root: ROOT_DIR,
    boardsRoot: BOARDS_DIR,
    file: boardPathFor(ROOT_DIR, BOARDS_DIR, slug),
    fallbackReason: requestedVault ? "Default Obsidian vault path was unavailable." : "No Obsidian vault path configured.",
  };
}

export async function listBoards(options: KanbanStorageOptions = {}) {
  const storage = resolveKanbanStorage(DEFAULT_BOARD, options);
  await mkdir(storage.boardsRoot, { recursive: true, mode: 0o700 });
  const defaultBoard = await readBoard(DEFAULT_BOARD, options);
  const boards = [defaultBoard.meta];
  try {
    const { readdir } = await import("fs/promises");
    const entries = await readdir(storage.boardsRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === DEFAULT_BOARD || entry.name === "_archived") continue;
      boards.push((await readBoard(entry.name, options)).meta);
    }
  } catch {
    return boards;
  }
  return boards.sort((a, b) => a.name.localeCompare(b.name));
}

export async function readBoard(slugInput?: string | null, options: KanbanStorageOptions = {}): Promise<KanbanBoard> {
  const slug = normalizeBoardSlug(slugInput);
  const storage = resolveKanbanStorage(slug, options);
  if (!existsSync(storage.file)) {
    const localPath = boardPathFor(ROOT_DIR, BOARDS_DIR, slug);
    if (storage.source === "obsidian" && existsSync(localPath)) {
      const migrated = normalizeBoard(await readBoardFile(localPath), slug);
      migrated.events.unshift(event("board.migrated", "Migrated board from local dashboard storage into the shared Obsidian vault."));
      await writeBoard(migrated, options);
      return migrated;
    }
    const board = emptyBoard(slug);
    await writeBoard(board, options);
    return board;
  }
  return normalizeBoard(await readBoardFile(storage.file), slug);
}

async function readBoardFile(path: string) {
  const raw = await readFile(path, "utf-8");
  return JSON.parse(raw) as KanbanBoard;
}

function normalizeBoard(parsed: KanbanBoard, slug: string): KanbanBoard {
  const tasks = Array.isArray(parsed.tasks) ? parsed.tasks.map(normalizeTask) : [];
  return {
    ...emptyBoard(slug),
    ...parsed,
    meta: { ...emptyBoard(slug).meta, ...parsed.meta, slug },
    tasks,
    comments: Array.isArray(parsed.comments) ? parsed.comments : [],
    links: Array.isArray(parsed.links) ? parsed.links : [],
    events: Array.isArray(parsed.events) ? parsed.events : [],
  };
}

function normalizeTask(task: KanbanTask): KanbanTask {
  return {
    ...task,
    status: normalizeKanbanStatus(task.status),
  };
}

function normalizeKanbanStatus(status: string): KanbanStatus {
  if (status === "triage") return "ideas";
  if (status === "todo") return "ready";
  if (status === "running") return "working";
  if (status === "blocked") return "needs-human";
  return KANBAN_STATUSES.includes(status as KanbanStatus) ? status as KanbanStatus : "ideas";
}

export async function createBoard(input: Partial<KanbanBoardMeta> & { slug: string }, options: KanbanStorageOptions = {}) {
  const slug = normalizeBoardSlug(input.slug);
  const board = await readBoard(slug, options);
  board.meta = {
    ...board.meta,
    name: input.name?.trim() || board.meta.name,
    description: input.description?.trim() || board.meta.description,
    icon: input.icon?.trim() || board.meta.icon,
    updatedAt: Date.now(),
  };
  board.events.unshift(event("board.created", `Created board ${board.meta.name}`));
  await writeBoard(board, options);
  return board;
}

export async function archiveBoard(slugInput: string, options: KanbanStorageOptions = {}) {
  const slug = normalizeBoardSlug(slugInput);
  if (slug === DEFAULT_BOARD) throw new Error("The default board cannot be archived.");
  const storage = resolveKanbanStorage(slug, options);
  const from = boardDirFor(storage.root, storage.boardsRoot, slug);
  if (!existsSync(from)) throw new Error("Board not found.");
  const archivedDir = join(storage.boardsRoot, "_archived");
  await mkdir(archivedDir, { recursive: true, mode: 0o700 });
  await rename(from, join(archivedDir, `${slug}-${Date.now()}`));
}

export async function createTask(slug: string | null, input: CreateTaskInput, options: KanbanStorageOptions = {}) {
  const board = await readBoard(slug, options);
  const title = input.title?.trim();
  if (!title) throw new Error("Task title is required.");
  if (input.idempotencyKey) {
    const existing = board.tasks.find((task) => task.idempotencyKey === input.idempotencyKey);
    if (existing) return { board, task: existing, created: false };
  }
  const now = Date.now();
  const task: KanbanTask = {
    id: `t_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    title,
    body: input.body?.trim() ?? "",
    assignee: cleanOptional(input.assignee),
    tenant: cleanOptional(input.tenant),
    status: input.status && KANBAN_STATUSES.includes(input.status) ? input.status : "ideas",
    priority: input.priority ?? "normal",
    workspace: input.workspace ?? "scratch",
    skills: input.skills ?? [],
    idempotencyKey: cleanOptional(input.idempotencyKey),
    createdAt: now,
    updatedAt: now,
  };
  board.tasks.unshift(task);
  for (const parentId of input.parents ?? []) {
    board.links.push({ parentId, childId: task.id, createdAt: now });
  }
  board.events.unshift(event("task.created", `Created ${task.title}`, task.id));
  await writeBoard(touch(board), options);
  return { board, task, created: true };
}

export async function patchTask(slug: string | null, taskId: string, patch: PatchTaskInput, options: KanbanStorageOptions = {}) {
  const board = await readBoard(slug, options);
  const task = board.tasks.find((item) => item.id === taskId);
  if (!task) throw new Error("Task not found.");
  const fromStatus = task.status;
  const nextStatus = patch.status && KANBAN_STATUSES.includes(patch.status) ? patch.status : undefined;
  const changed = {
    ...task,
    ...patch,
    status: nextStatus ?? task.status,
    title: patch.title?.trim() || task.title,
    body: patch.body ?? task.body,
    assignee: patch.assignee === "" ? undefined : patch.assignee ?? task.assignee,
    tenant: patch.tenant === "" ? undefined : patch.tenant ?? task.tenant,
    updatedAt: Date.now(),
    completedAt: nextStatus === "done" ? Date.now() : task.completedAt,
  };
  board.tasks = board.tasks.map((item) => item.id === taskId ? changed : item);
  board.events.unshift(event(
    nextStatus && nextStatus !== fromStatus ? "task.moved" : "task.updated",
    nextStatus && nextStatus !== fromStatus ? `Moved ${changed.title} from ${fromStatus} to ${nextStatus}` : `Updated ${changed.title}`,
    taskId,
  ));
  await writeBoard(touch(board), options);
  return { board, task: changed };
}

export async function moveTask(slug: string | null, taskId: string, status: KanbanStatus, options: KanbanStorageOptions = {}) {
  const board = await readBoard(slug, options);
  const task = board.tasks.find((item) => item.id === taskId);
  if (!task) throw new Error("Task not found.");
  board.tasks = moveTaskBetweenColumns(board.tasks, taskId, status);
  board.events.unshift(event("task.moved", `Moved ${task.title} to ${status}`, taskId));
  await writeBoard(touch(board), options);
  return { board, task: board.tasks.find((item) => item.id === taskId)! };
}

export async function addComment(slug: string | null, taskId: string, body: string, author = "dashboard", options: KanbanStorageOptions = {}) {
  const board = await readBoard(slug, options);
  const task = board.tasks.find((item) => item.id === taskId);
  if (!task) throw new Error("Task not found.");
  const comment: KanbanComment = {
    id: `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    taskId,
    author: author.trim() || "dashboard",
    body: body.trim(),
    createdAt: Date.now(),
  };
  if (!comment.body) throw new Error("Comment body is required.");
  board.comments.push(comment);
  board.events.unshift(event("comment.created", `${comment.author} commented on ${task.title}`, taskId));
  await writeBoard(touch(board), options);
  return { board, comment };
}

export async function addLink(slug: string | null, parentId: string, childId: string, options: KanbanStorageOptions = {}) {
  const board = await readBoard(slug, options);
  const ids = new Set(board.tasks.map((task) => task.id));
  if (!ids.has(parentId) || !ids.has(childId)) throw new Error("Both linked tasks must exist.");
  if (!board.links.some((link) => link.parentId === parentId && link.childId === childId)) {
    board.links.push({ parentId, childId, createdAt: Date.now() });
    board.events.unshift(event("task.linked", `Linked ${parentId} -> ${childId}`, childId));
    await writeBoard(touch(board), options);
  }
  return { board };
}

async function writeBoard(board: KanbanBoard, options: KanbanStorageOptions = {}) {
  const storage = resolveKanbanStorage(board.meta.slug, options);
  const dir = boardDirFor(storage.root, storage.boardsRoot, board.meta.slug);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const data = JSON.stringify(board, null, 2) + "\n";
  const tmp = `${storage.file}.tmp.${process.pid}.${Date.now()}`;
  await writeFile(tmp, data, { mode: 0o600 });
  await rename(tmp, storage.file);
}

function emptyBoard(slug: string): KanbanBoard {
  const now = Date.now();
  return {
    meta: { slug, name: slug === DEFAULT_BOARD ? "Default" : titleize(slug), createdAt: now, updatedAt: now },
    tasks: [],
    comments: [],
    links: [],
    events: [],
  };
}

function event(kind: string, message: string, taskId?: string): KanbanEvent {
  return { id: `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`, taskId, kind, message, createdAt: Date.now() };
}

function touch(board: KanbanBoard) {
  return { ...board, meta: { ...board.meta, updatedAt: Date.now() } };
}

function boardDirFor(root: string, boardsRoot: string, slug: string) {
  return slug === DEFAULT_BOARD ? root : join(boardsRoot, slug);
}

function boardPathFor(root: string, boardsRoot: string, slug: string) {
  return join(boardDirFor(root, boardsRoot, slug), "kanban.json");
}

function cleanOptional(value?: string | null) {
  return value?.trim() || undefined;
}

function safeVaultFolder(folder?: string | null) {
  const value = folder?.trim();
  if (!value) return "";
  if (isAbsolute(value) || value.split(/[\\/]+/).includes("..")) {
    throw new Error("Kanban folder must be a relative path inside the shared vault.");
  }
  return value.split(/[\\/]+/).filter(Boolean).join(sep);
}

function titleize(slug: string) {
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
