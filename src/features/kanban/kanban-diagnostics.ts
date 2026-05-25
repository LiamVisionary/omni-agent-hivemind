import type { KanbanTask } from "@/lib/types/kanban";

export const KANBAN_STALE_WORK_MS = 30 * 60 * 1000;

type DashboardChatMessage = {
  content: string;
  kanbanTaskId?: string;
  surface?: string;
};

export function kanbanAgentSessionTimestamp(task: KanbanTask) {
  return task.agentSession?.updatedAt ?? task.updatedAt;
}

export function kanbanStaleAge(task: KanbanTask, now = Date.now()) {
  return Math.max(0, now - kanbanAgentSessionTimestamp(task));
}

export function isKanbanStaleWorkingTask(task: KanbanTask, now = Date.now()) {
  return task.status === "working"
    && Boolean(task.agentSession?.sessionId)
    && kanbanStaleAge(task, now) >= KANBAN_STALE_WORK_MS;
}

export function kanbanToolOutputStalledMessage(agentName: string) {
  return `${agentName} produced terminal/tool output but has not sent a final agent response. The dashboard stopped treating tool output as completion; steer the agent or move the card back to Ready for Queen to retry.`;
}

export function kanbanNoAssistantStalledMessage(agentName: string, latestCount: number, latestRole: string | null) {
  const roleLabel = latestRole ? ` Latest observed session message role: ${latestRole}.` : "";
  return `${agentName} accepted the task and the session is updating, but no assistant response has appeared after ${latestCount} messages.${roleLabel} Check the agent runtime session or move the card back to Ready for Queen to retry.`;
}

export function kanbanNoAssistantStalledDetail(agentName: string, latestCount: number, latestRole: string | null, latestContent: string) {
  const summary = latestRole === "tool" ? summarizeKanbanToolOutput(latestContent) : "";
  return [
    kanbanNoAssistantStalledMessage(agentName, latestCount, latestRole),
    summary,
  ].filter(Boolean).join("\n\n");
}

export function isDashboardWorkChatMessage(message: DashboardChatMessage) {
  if (message.kanbanTaskId) return true;
  if (message.surface === "kanban" || message.surface === "scheduler") return true;
  const content = message.content.trim();
  return content.startsWith("This is a scheduled dashboard run.")
    || content.startsWith("You are receiving an automated Kanban assignment")
    || content.startsWith("Needs human: ");
}

export function isManualAgentChatMessage(message: DashboardChatMessage) {
  return !isDashboardWorkChatMessage(message);
}

export function compactDiagnosticPreview(value: string, maxLength = 180) {
  const compact = value.trim().replace(/\s+/g, " ");
  return compact.length > maxLength ? `${compact.slice(0, maxLength).trimEnd()} [truncated]` : compact;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function summarizeKanbanToolOutput(toolOutput: string) {
  const trimmed = toolOutput.trim();
  if (!trimmed) return "";
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (isRecord(parsed) && Array.isArray(parsed.matches)) {
      const matches = parsed.matches.filter(isRecord);
      const totalCount = typeof parsed.total_count === "number" ? parsed.total_count : matches.length;
      const files = new Set(matches.map((match) => typeof match.path === "string" ? match.path : "").filter(Boolean));
      const preview = matches.slice(0, 3).map((match) => {
        const path = typeof match.path === "string" ? match.path.split("/").slice(-3).join("/") : "unknown file";
        const line = typeof match.line === "number" ? `:${match.line}` : "";
        const content = typeof match.content === "string" ? ` — ${compactDiagnosticPreview(match.content, 120)}` : "";
        return `- ${path}${line}${content}`;
      });
      return [
        `Last tool output before blocking: search results with ${totalCount} match${totalCount === 1 ? "" : "es"} across ${files.size || "unknown"} file${files.size === 1 ? "" : "s"}.`,
        preview.length ? ["Preview:", ...preview].join("\n") : "",
        matches.length > preview.length ? `${matches.length - preview.length} additional match${matches.length - preview.length === 1 ? "" : "es"} were omitted from this dashboard summary.` : "",
      ].filter(Boolean).join("\n");
    }
    if (isRecord(parsed)) {
      const keys = Object.keys(parsed).slice(0, 8);
      return `Last tool output before blocking: structured JSON with keys ${keys.join(", ")}.`;
    }
  } catch {
    // Fall through to plain-text preview.
  }
  const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const preview = lines.slice(0, 4).map((line) => `- ${compactDiagnosticPreview(line, 160)}`);
  return [
    `Last tool output before blocking: ${lines.length} line${lines.length === 1 ? "" : "s"} of terminal/tool output.`,
    preview.length ? ["Preview:", ...preview].join("\n") : compactDiagnosticPreview(trimmed, 360),
    lines.length > preview.length ? `${lines.length - preview.length} additional line${lines.length - preview.length === 1 ? "" : "s"} were omitted from this dashboard summary.` : "",
  ].filter(Boolean).join("\n");
}

export function kanbanToolOutputStalledDetail(agentName: string, toolOutput: string) {
  const summary = summarizeKanbanToolOutput(toolOutput);
  return [
    kanbanToolOutputStalledMessage(agentName),
    summary,
  ].filter(Boolean).join("\n\n");
}
