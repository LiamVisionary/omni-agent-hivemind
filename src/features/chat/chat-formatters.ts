import type { KanbanLinkedDirectory } from "@/lib/types/kanban";

type LinkedDirectoryLabelInput = Pick<KanbanLinkedDirectory, "name" | "path" | "machineName">;

export function linkedDirectoryLabel(directory: LinkedDirectoryLabelInput) {
  return [
    directory.path?.trim() || directory.name,
    directory.machineName?.trim() ? `on ${directory.machineName.trim()}` : "",
  ].filter(Boolean).join(" ");
}

export function attachmentSizeLabel(size: number) {
  if (size >= 1_000_000) return `${(size / 1_000_000).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1000))} KB`;
}
