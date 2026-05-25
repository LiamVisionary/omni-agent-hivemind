import { ArrowUp, Check, ChevronDown, Clock3, FileText, FileUp, FolderOpen, Mic, Minus, Paperclip, Plus, X } from "lucide-react";
import { type ChangeEvent, type MouseEvent as ReactMouseEvent, type RefObject } from "react";

import chatStyles from "@/app/chat.module.css";
import kanbanStyles from "@/app/kanban-board.module.css";
import { attachmentSizeLabel, linkedDirectoryLabel } from "@/features/chat/chat-formatters";
import { createStyleClass } from "@/features/dashboard/style-classes";
import type { KanbanLinkedDirectory, KanbanTaskAttachment } from "@/lib/types/kanban";
import type { RecentDirectory } from "@/lib/types/recent-directories";

export { attachmentSizeLabel, linkedDirectoryLabel } from "@/features/chat/chat-formatters";

const chatClass = createStyleClass(chatStyles);
const kanbanClass = createStyleClass(kanbanStyles);

type ChatAttachment = KanbanTaskAttachment;
type LinkedDirectory = KanbanLinkedDirectory;
type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } };

type ChatMessage = { role?: string; content: string; attachments?: ChatAttachment[] };
type SpeechRecognitionResultLike = {
  isFinal: boolean;
  length: number;
  [index: number]: { transcript: string };
};

export type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

export type SpeechRecognitionLike = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event & { error?: string; message?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export function cleanActivityTitle(title: string) {
  const cleaned = title
    .replace(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}[,.\d]*\s*/u, "")
    .replace(/^INFO\s+/i, "")
    .replace(/^Loaded main app package\s+/i, "Opened ")
    .trim();
  // Hide raw JSON / log payloads from primary surfaces (philosophy rule 6).
  // If the title looks like structured data, return a generic plain-English
  // fallback instead of leaking `{` or `[` into the UI.
  if (/^[\[{]/.test(cleaned) || cleaned.length <= 1) return "Background activity";
  return cleaned;
}

export function stripAnsiSequences(value: string) {
  return value.replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, "");
}

export function stripHermesBoxLine(line: string) {
  let next = line;
  if (/^\s*[│┃]/.test(next)) next = next.replace(/^\s*[│┃]\s?/, "");
  if (/[│┃]\s*$/.test(next)) next = next.replace(/\s*[│┃]\s*$/, "");
  return next.replace(/\s+$/g, "");
}

export function isHermesFrameLine(line: string) {
  const trimmed = line.trim();
  return /^[╭╰╮╯─━\s]+$/.test(trimmed) || /^[─━]{6,}$/.test(trimmed);
}

export function isHermesInventoryText(text: string) {
  return /Available Tools/i.test(text)
    && /Available Skills/i.test(text)
    && /MCP Servers/i.test(text)
    && !/╭.*Hermes/i.test(text);
}

export function looksLikeAssistantHeading(line: string) {
  const trimmed = line.trim();
  if (!trimmed || /^[-*]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed)) return false;
  if (/[.!?;:]$/.test(trimmed)) return false;
  if (/[,/]/.test(trimmed)) return false;
  if (trimmed.length > 58) return false;
  if (trimmed.split(/\s+/).length > 7) return false;
  return /^[A-Z][A-Za-z0-9’'() -]+$/.test(trimmed);
}

export function shouldPromotePlainLineToBullet(line: string) {
  const trimmed = line.trim();
  if (!trimmed || /^#{1,3}\s+/.test(trimmed) || /^[-*]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed)) return false;
  if (looksLikeAssistantHeading(trimmed)) return false;
  if (trimmed.length > 120) return false;
  if (/[.!?]$/.test(trimmed)) return false;
  return true;
}

export function structureAssistantPlainText(lines: string[]) {
  const output: string[] = [];
  const headingPattern = /^(Summary|Main idea|Key features|Why it matters|Takeaway|Result|Details|Next steps|Practical answer|Where .+ wins|The nuance|Bottom line|Exo vs\..+|.+\s+vs\.\s+.+)$/i;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed) {
      output.push("");
      continue;
    }
    if (/^#{1,3}\s+/.test(trimmed) || /^[-*]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed)) {
      output.push(line);
      continue;
    }
    const previous = output.at(-1)?.trim() ?? "";
    const next = lines[index + 1]?.trim() ?? "";
    const afterColonList = previous.endsWith(":") && shouldPromotePlainLineToBullet(trimmed);
    const continuingList = /^[-*]\s+/.test(previous) && shouldPromotePlainLineToBullet(trimmed) && !looksLikeAssistantHeading(next);
    if (afterColonList || continuingList) {
      output.push(`- ${trimmed}`);
      continue;
    }
    if (headingPattern.test(trimmed) || (looksLikeAssistantHeading(trimmed) && next && !previous.endsWith(":"))) {
      output.push(`### ${trimmed}`);
      continue;
    }
    output.push(line);
  }
  return output;
}

export function normalizeAssistantChatText(value: string) {
  const text = stripAnsiSequences(value || "").replace(/\r\n/g, "\n").trim();
  if (!text) return "";
  if (isHermesInventoryText(text)) return "";
  const lines = text.split("\n");
  let hermesBoxIndex = -1;
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (/╭.*Hermes.*[╮]/i.test(lines[index])) {
      hermesBoxIndex = index;
      break;
    }
  }
  const relevant = hermesBoxIndex >= 0 ? lines.slice(hermesBoxIndex) : lines;
  const cleaned: string[] = [];
  let skippingFooter = false;

  for (const rawLine of relevant) {
    const line = stripHermesBoxLine(rawLine);
    const trimmed = line.trim();
    if (/^Resume this session with:/i.test(trimmed) || /^Session:\s+/i.test(trimmed)) {
      skippingFooter = true;
    }
    if (skippingFooter) continue;
    if (!trimmed) {
      if (cleaned.at(-1) !== "") cleaned.push("");
      continue;
    }
    if (isHermesFrameLine(trimmed)) continue;
    if (/^(Query:|Initializing agent|↻ Resumed session|\(\d+\s+user message|hermes --resume|hermes -c\b)/i.test(trimmed)) continue;
    if (/^╭.*╮$/.test(trimmed) || /^╰.*╯$/.test(trimmed)) continue;
    cleaned.push(trimmed);
  }

  return structureAssistantPlainText(cleaned
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n"))
    .join("\n")
    .trim();
}

export function chatDisplayContent(message: ChatMessage) {
  return message.role === "assistant" ? normalizeAssistantChatText(message.content) : message.content;
}

export function attachmentSummary(attachments: ChatAttachment[]) {
  if (attachments.length === 0) return "";
  const images = attachments.filter((attachment) => attachment.kind === "image").length;
  const audio = attachments.filter((attachment) => attachment.kind === "audio").length;
  const files = attachments.filter((attachment) => attachment.kind === "file").length;
  return [
    images ? `${images} image${images === 1 ? "" : "s"}` : "",
    audio ? `${audio} audio clip${audio === 1 ? "" : "s"}` : "",
    files ? `${files} file${files === 1 ? "" : "s"}` : "",
  ].filter(Boolean).join(", ");
}

export function messageContentParts(text: string, attachments: ChatAttachment[]): string | ChatContentPart[] {
  if (attachments.length === 0) return text;
  const parts: ChatContentPart[] = [];
  if (text.trim()) parts.push({ type: "text", text: text.trim() });
  attachments.forEach((attachment) => {
    if (attachment.kind === "image") {
      parts.push({ type: "image_url", image_url: { url: attachment.dataUrl } });
      return;
    }
    if (attachment.kind === "file") {
      parts.push({
        type: "file",
        file: {
          filename: attachment.name,
          file_data: attachment.dataUrl,
        },
      });
      return;
    }
    parts.push({
      type: "file",
      file: {
        filename: attachment.name,
        file_data: attachment.dataUrl,
      },
    });
  });
  return parts;
}

export function readAttachmentFile(file: File, kind: "image" | "file"): Promise<ChatAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl) {
        reject(new Error(`Could not read ${file.name}`));
        return;
      }
      resolve({
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        kind,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        dataUrl,
      });
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export async function readComposerFiles(files: FileList | File[], kind: "image" | "file") {
  const incoming = Array.from(files);
  if (incoming.length === 0) throw new Error("Choose at least one file.");
  const maxAttachmentBytes = 8_000_000;
  const oversized = incoming.find((file) => file.size > maxAttachmentBytes);
  if (oversized) throw new Error(`${oversized.name} is too large. Keep attachments under 8 MB.`);
  return Promise.all(incoming.map((file) => readAttachmentFile(file, kind)));
}

export async function pickLinkedDirectory(): Promise<LinkedDirectory | null> {
  type DirectoryPickerWindow = Window & typeof globalThis & {
    showDirectoryPicker?: () => Promise<{ name?: string }>;
  };
  const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
  if (!picker) throw new Error("Directory picker is not available in this browser.");
  try {
    const handle = await picker();
    const name = handle.name?.trim();
    return name ? { id: `${name}-${crypto.randomUUID()}`, name, lastUsedAt: Date.now() } : null;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return null;
    throw error;
  }
}

export function recentDirectoryToLinkedDirectory(directory: RecentDirectory): LinkedDirectory {
  return {
    id: `${directory.name}-${directory.lastUsedAt}-${crypto.randomUUID()}`,
    name: directory.name,
    path: directory.path,
    machineName: directory.machineName,
    machineKey: directory.machineKey,
    lastUsedAt: Date.now(),
  };
}

export function recentDirectorySubtitle(directory: RecentDirectory) {
  if (directory.path?.trim()) return directory.machineName?.trim()
    ? `${directory.path.trim()} on ${directory.machineName.trim()}`
    : directory.path.trim();
  if (directory.machineName?.trim()) return directory.machineName.trim();
  if (directory.source === "kanban") return "Kanban history";
  if (directory.source === "chat") return "Chat history";
  return "No path saved yet";
}

export function speechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

export function AttachmentMenuContent({
  placement = "above",
  onAttachImages,
  onAttachFiles,
  onAttachDirectory,
  directoryPickerDisabled = false,
  directoryPickerDisabledReason,
  recentDirectories = [],
  recentDirectoriesExpanded,
  setRecentDirectoriesExpanded,
  onAttachRecentDirectory,
  stopPropagation = false,
}: {
  placement?: "above" | "below";
  onAttachImages: () => void;
  onAttachFiles: () => void;
  onAttachDirectory?: () => void;
  directoryPickerDisabled?: boolean;
  directoryPickerDisabledReason?: string;
  recentDirectories?: RecentDirectory[];
  recentDirectoriesExpanded?: boolean;
  setRecentDirectoriesExpanded?: (open: boolean | ((current: boolean) => boolean)) => void;
  onAttachRecentDirectory?: (directory: LinkedDirectory) => void;
  stopPropagation?: boolean;
}) {
  const run = (event: ReactMouseEvent<HTMLButtonElement>, action: () => void) => {
    if (stopPropagation) event.stopPropagation();
    action();
  };
  return (
    <div className={chatClass("attachmentMenu", placement === "below" && "attachmentMenuBelow")} role="menu">
      <button type="button" role="menuitem" onClick={(event) => run(event, onAttachImages)}>
        <Paperclip aria-hidden="true" />
        Images
      </button>
      <button type="button" role="menuitem" onClick={(event) => run(event, onAttachFiles)}>
        <FileUp aria-hidden="true" />
        Files
      </button>
      {onAttachDirectory ? (
        <button
          type="button"
          role="menuitem"
          onClick={(event) => run(event, onAttachDirectory)}
          disabled={directoryPickerDisabled}
          title={directoryPickerDisabledReason}
        >
          <FolderOpen aria-hidden="true" />
          Directories
        </button>
      ) : null}
      {onAttachRecentDirectory && setRecentDirectoriesExpanded ? (
        <div className={chatClass("attachmentRecents")}>
          <button
            type="button"
            role="menuitem"
            aria-expanded={Boolean(recentDirectoriesExpanded)}
            disabled={directoryPickerDisabled}
            title={directoryPickerDisabledReason}
            onClick={(event) => run(event, () => setRecentDirectoriesExpanded((open) => !open))}
          >
            <Clock3 aria-hidden="true" />
            Recents
            <ChevronDown aria-hidden="true" />
          </button>
          {recentDirectoriesExpanded ? (
            <div className={chatClass("attachmentRecentList")}>
              {recentDirectories.length > 0 ? recentDirectories.slice(0, 8).map((directory) => (
                <button
                  type="button"
                  role="menuitem"
                  key={directory.id}
                  disabled={directoryPickerDisabled}
                  onClick={(event) => run(event, () => onAttachRecentDirectory(recentDirectoryToLinkedDirectory(directory)))}
                >
                  <FolderOpen aria-hidden="true" />
                  <span>
                    <strong>{directory.name}</strong>
                    <small>{recentDirectorySubtitle(directory)}</small>
                  </span>
                </button>
              )) : (
                <p>No recent folders yet.</p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function AttachmentListMenuContent({
  attachments,
  directories,
  onRemoveAttachment,
  onRemoveDirectory,
}: {
  attachments: KanbanTaskAttachment[];
  directories: LinkedDirectory[];
  onRemoveAttachment: (id: string) => void;
  onRemoveDirectory: (id: string) => void;
}) {
  const hasItems = attachments.length > 0 || directories.length > 0;
  return (
    <div className={kanbanClass("kanbanAttachmentListMenu")} role="menu">
      {hasItems ? (
        <>
          {directories.map((directory) => (
            <div className={kanbanClass("kanbanAttachmentListItem")} key={directory.id}>
              <FolderOpen aria-hidden="true" />
              <span>
                <strong>{directory.name}</strong>
                <small>{linkedDirectoryLabel(directory)}</small>
              </span>
              <button
                type="button"
                aria-label={`Remove ${directory.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onRemoveDirectory(directory.id);
                }}
              >
                <Minus aria-hidden="true" />
              </button>
            </div>
          ))}
          {attachments.map((attachment) => (
            <div className={kanbanClass("kanbanAttachmentListItem")} key={attachment.id}>
              <Paperclip aria-hidden="true" />
              <span>
                <strong>{attachment.name}</strong>
                <small>{attachment.kind === "image" ? "Image" : "File"} · {attachmentSizeLabel(attachment.size)}</small>
              </span>
              <button
                type="button"
                aria-label={`Remove ${attachment.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onRemoveAttachment(attachment.id);
                }}
              >
                <Minus aria-hidden="true" />
              </button>
            </div>
          ))}
        </>
      ) : (
        <p>No attachments yet.</p>
      )}
    </div>
  );
}

export function ComposerField({
  value,
  onChange,
  placeholder,
  disabled,
  busy,
  compact = false,
  attachments,
  directories = [],
  attachmentError,
  attachmentMenuOpen,
  setAttachmentMenuOpen,
  attachmentMenuRef,
  fileInputRef,
  imageInputRef,
  onFileChange,
  onImageChange,
  onRemoveAttachment,
  onAttachDirectory,
  directoryPickerDisabled = false,
  directoryPickerDisabledReason,
  recentDirectories = [],
  recentDirectoriesExpanded,
  setRecentDirectoriesExpanded,
  onAttachRecentDirectory,
  onRemoveDirectory,
  recording,
  voiceBands,
  voiceTranscript,
  onToggleRecording,
  canRecord = true,
  canSend,
  onCancel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  busy?: boolean;
  compact?: boolean;
  attachments: ChatAttachment[];
  directories?: LinkedDirectory[];
  attachmentError?: string;
  attachmentMenuOpen: boolean;
  setAttachmentMenuOpen: (open: boolean | ((current: boolean) => boolean)) => void;
  attachmentMenuRef: RefObject<HTMLDivElement | null>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  imageInputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onImageChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: (id: string) => void;
  onAttachDirectory?: () => void;
  directoryPickerDisabled?: boolean;
  directoryPickerDisabledReason?: string;
  recentDirectories?: RecentDirectory[];
  recentDirectoriesExpanded?: boolean;
  setRecentDirectoriesExpanded?: (open: boolean | ((current: boolean) => boolean)) => void;
  onAttachRecentDirectory?: (directory: LinkedDirectory) => void;
  onRemoveDirectory?: (id: string) => void;
  recording?: boolean;
  voiceBands: number[];
  voiceTranscript?: string;
  onToggleRecording?: () => void;
  canRecord?: boolean;
  canSend: boolean;
  onCancel?: () => void;
}) {
  return (
    <div className={chatClass("chatComposerField", compact && "compactComposer")}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className={chatClass("chatFileInput")}
        onChange={onFileChange}
        disabled={disabled}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className={chatClass("chatFileInput")}
        onChange={onImageChange}
        disabled={disabled}
      />
      {attachments.length > 0 || directories.length > 0 ? (
        <div className={chatClass("attachmentTray")}>
          {directories.map((directory) => (
            <div className={chatClass("attachmentPill")} key={directory.id}>
              <span>Folder</span>
              <strong>{directory.name}</strong>
              <small>linked</small>
              {onRemoveDirectory ? (
                <button type="button" aria-label={`Remove ${directory.name}`} onClick={() => onRemoveDirectory(directory.id)} disabled={disabled}>
                  <X aria-hidden="true" />
                </button>
              ) : null}
            </div>
          ))}
          {attachments.map((attachment) => (
            <div className={chatClass("attachmentPill")} key={attachment.id}>
              <span>{attachment.kind === "image" ? "Image" : attachment.kind === "audio" ? "Audio" : "File"}</span>
              <strong>{attachment.name}</strong>
              <small>{attachmentSizeLabel(attachment.size)}</small>
              <button type="button" aria-label={`Remove ${attachment.name}`} onClick={() => onRemoveAttachment(attachment.id)} disabled={disabled}>
                <X aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
      {recording ? (
        <div className={chatClass("voiceRecorder")} aria-live="polite">
          <div className={chatClass("voiceWaveform")} aria-hidden="true">
            {voiceBands.map((level, index) => (
              <span key={index} style={{ transform: `scaleY(${0.18 + level * 1.8})` }} />
            ))}
          </div>
          <span>{voiceTranscript || "Listening..."}</span>
        </div>
      ) : null}
      <div className={chatClass("composerTools")}>
        <div className={chatClass("attachmentMenuWrap")} ref={attachmentMenuRef}>
          <button
            type="button"
            className={chatClass("composerIconButton")}
            onClick={() => setAttachmentMenuOpen((open) => !open)}
            disabled={disabled}
            aria-label="Add attachment"
            aria-expanded={attachmentMenuOpen}
          >
            <Plus aria-hidden="true" />
          </button>
          {attachmentMenuOpen ? (
            <AttachmentMenuContent
              onAttachImages={() => imageInputRef.current?.click()}
              onAttachFiles={() => fileInputRef.current?.click()}
              onAttachDirectory={onAttachDirectory}
              directoryPickerDisabled={directoryPickerDisabled}
              directoryPickerDisabledReason={directoryPickerDisabledReason}
              recentDirectories={recentDirectories}
              recentDirectoriesExpanded={recentDirectoriesExpanded}
              setRecentDirectoriesExpanded={setRecentDirectoriesExpanded}
              onAttachRecentDirectory={onAttachRecentDirectory}
            />
          ) : null}
        </div>
        {attachmentError ? <span role="status">{attachmentError}</span> : null}
        <div className={chatClass("composerActions")}>
          {onCancel ? (
            <button type="button" className={chatClass("composerIconButton")} onClick={onCancel} disabled={disabled} aria-label="Cancel">
              <X aria-hidden="true" />
            </button>
          ) : null}
          {canRecord ? (
            <button
              type="button"
              className={chatClass("composerIconButton", recording && "recording")}
              onClick={onToggleRecording}
              disabled={disabled}
              aria-label={recording ? "Stop recording" : "Record audio"}
            >
              <Mic aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="submit"
            className={chatClass("composerIconButton", "sendButton")}
            disabled={disabled || !canSend}
            aria-label={busy ? "Waiting" : "Send"}
          >
            {busy ? "·" : compact ? <Check aria-hidden="true" /> : <ArrowUp aria-hidden="true" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export function MessageAttachments({ attachments }: { attachments?: ChatAttachment[] }) {
  if (!attachments?.length) return null;
  return (
    <div className={chatClass("messageAttachments")}>
      {attachments.map((attachment) => (
        <figure className={chatClass("messageAttachment", attachment.kind)} key={attachment.id}>
          {attachment.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={attachment.dataUrl} alt={attachment.name} />
          ) : attachment.kind === "audio" ? (
            <audio src={attachment.dataUrl} controls preload="metadata" />
          ) : (
            <a href={attachment.dataUrl} download={attachment.name}>
              <FileText aria-hidden="true" />
              {attachment.name}
            </a>
          )}
          <figcaption>{attachment.name}</figcaption>
        </figure>
      ))}
    </div>
  );
}
