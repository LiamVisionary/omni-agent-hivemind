// src/components/task-modal/TaskModal.tsx
"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { CloseIconButton } from "@/components/ui/close-icon-button";
import styles from "./task-modal.module.css";

export type CadenceKind =
  | "manual" | "every15" | "hourly" | "daily" | "weekday" | "session" | "cron";

export interface NewTaskPayload {
  title: string;
  mode: "steps" | "prompt";
  steps: string[];
  prompt: string;
  attachments: Array<{ kind: "skill" | "path"; label: string }>;
  cadence: { kind: Exclude<CadenceKind, "cron"> } | { kind: "cron"; expr: string };
  target: { machine: string; bee: string };
  templateId: string | null;
  usePastRuns: boolean;
  pastRunLimit: number;
}

export type TaskModalSkillOption = {
  slug: string;
  name: string;
  description?: string;
};

const DEFAULT_STEPS = [
  "Read the Obsidian vault index manifest",
  "Refresh embeddings for any notes modified since last run",
  "Push the updated index to peer machines over Tailscale",
];

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  onSave?: (task: NewTaskPayload) => void;
  initial?: Partial<NewTaskPayload>;
  /** Skill ids the user can attach. */
  skillOptions?: Array<string | TaskModalSkillOption>;
  /** Path strings the user can attach. */
  pathOptions?: string[];
  /** Machines + bees the user can target. */
  machineOptions?: string[];
  beeOptions?: string[];
  onBrowseFolder?: () => Promise<string | null>;
}

const TEMPLATES = [
  { id: "brain/index-vault",    label: "Index Obsidian vault",   desc: "Refresh embeddings + sync to peers" },
  { id: "brain/pull-rss",       label: "Pull RSS digest",        desc: "Fetch + dedup hourly news" },
  { id: "secops/rotate-tokens", label: "Rotate broker tokens",   desc: "Refresh Coinbase/Kraken JWTs" },
  { id: "channels/x-publish",   label: "Publish staged X thread",desc: "Publish the staged draft" },
  { id: "sim/run-mm",           label: "Run MM simulation",      desc: "Start a market-making swarm" },
  { id: "ops/backup-env",       label: "Backup hive.env.gpg",    desc: "GPG-encrypt + push to vault" },
];

const CADENCE_PILLS: { id: CadenceKind; label: string }[] = [
  { id: "manual",  label: "Manual" },
  { id: "every15", label: "Every 15m" },
  { id: "hourly",  label: "Hourly" },
  { id: "daily",   label: "Daily" },
  { id: "weekday", label: "Weekdays" },
  { id: "session", label: "Market session" },
  { id: "cron",    label: "Custom cron" },
];

const cadenceSummary = (kind: CadenceKind, cron: string) => ({
  manual:  "manual · run only when invoked",
  every15: "every 15m",
  hourly:  "hourly · :00",
  daily:   "daily · 02:00 UTC",
  weekday: "weekdays · 13:30 ET",
  session: "NYSE open",
  cron:    `cron · ${cron}`,
})[kind];

const DEFAULT_SKILLS = ["index-vault", "rotate-tokens", "x-publish", "pull-rss"];
const DEFAULT_MACHINES = ["atlas", "nimbus", "honeycomb", "lattice", "drone-01"];
const DEFAULT_BEES = ["Aeon-night", "Aeon-jobs", "Hermes-α", "OpenClaw-eng", "Codex-skill"];

export function TaskModal({
  open, onClose, onSave, initial,
  skillOptions = DEFAULT_SKILLS,
  machineOptions = DEFAULT_MACHINES,
  beeOptions = DEFAULT_BEES,
  onBrowseFolder,
}: TaskModalProps) {
  const normalizedSkillOptions = React.useMemo<TaskModalSkillOption[]>(() => (
    skillOptions.map((skill) => typeof skill === "string"
      ? { slug: skill, name: skill, description: "" }
      : skill)
  ), [skillOptions]);
  const [tab, setTab] = React.useState<"template" | "custom">(initial?.templateId === null ? "custom" : "template");
  const [skill, setSkill] = React.useState<string>(initial?.templateId ?? "brain/index-vault");
  const [title, setTitle] = React.useState(initial?.title ?? "Index Obsidian vault");
  const [mode, setMode] = React.useState<"steps" | "prompt">(initial?.mode ?? "steps");
  const [steps, setSteps] = React.useState<string[]>(initial?.steps ?? DEFAULT_STEPS);
  const [prompt, setPrompt] = React.useState<string>(initial?.prompt ??
    "Read the Obsidian vault index manifest, refresh embeddings for any notes modified since the last run, then push the updated index to peer machines over Tailscale.");
  const [attachments, setAttachments] = React.useState<NewTaskPayload["attachments"]>(initial?.attachments ?? [
    { kind: "skill", label: normalizedSkillOptions[0]?.slug ?? "index-vault" },
    { kind: "path",  label: "~/Obsidian/hive" },
  ]);
  const [attachOpen, setAttachOpen] = React.useState<"skill" | "path" | null>(null);
  const [cadenceKind, setCadenceKind] = React.useState<CadenceKind>(initial?.cadence?.kind ?? "daily");
  const [cronExpr, setCronExpr] = React.useState(initial?.cadence?.kind === "cron" ? initial.cadence.expr : "0 2 * * *");
  const [target, setTarget] = React.useState(initial?.target ?? {
    machine: machineOptions[0] ?? "honeycomb",
    bee: beeOptions[0] ?? "Aeon-night",
  });
  const [usePastRuns, setUsePastRuns] = React.useState(initial?.usePastRuns ?? false);
  const [pastRunLimit, setPastRunLimit] = React.useState(initial?.pastRunLimit ?? 3);

  // ESC to close
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const updateStep = (i: number, v: string) =>
    setSteps((arr) => arr.map((s, j) => j === i ? v : s));
  const addStep = () => setSteps((arr) => [...arr, ""]);
  const removeStep = (i: number) =>
    setSteps((arr) => arr.length === 1 ? arr : arr.filter((_, j) => j !== i));
  const removeAttach = (i: number) =>
    setAttachments((arr) => arr.filter((_, j) => j !== i));

  const handleSave = () => {
    const cadence: NewTaskPayload["cadence"] =
      cadenceKind === "cron" ? { kind: "cron", expr: cronExpr } : { kind: cadenceKind };
    onSave?.({
      title, mode, steps, prompt, attachments,
      cadence, target, templateId: tab === "template" ? skill : null,
      usePastRuns, pastRunLimit,
    });
  };

  return createPortal(
    <div className={styles.root} role="dialog" aria-modal="true" aria-labelledby="tm-title"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        display: "grid", placeItems: "center",
        padding: 24,
        background: "rgba(3,7,18,0.62)",
        backdropFilter: "blur(10px) saturate(120%)",
        WebkitBackdropFilter: "blur(10px) saturate(120%)",
        animation: "tmIn 200ms ease",
      }}
    >
      <div onClick={(e) => e.stopPropagation()}
        style={{
          display: "grid", gridTemplateRows: "auto 1fr auto",
          width: "min(820px, 100%)", maxHeight: "min(840px, calc(100vh - 48px))",
          borderRadius: 14, overflow: "hidden",
          border: "1px solid var(--tm-honey-border)",
          background:
            "radial-gradient(80% 40% at 50% 0%, rgba(255,212,90,0.10), transparent 70%), var(--tm-panel)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
          backdropFilter: "blur(14px) saturate(140%)",
          WebkitBackdropFilter: "blur(14px) saturate(140%)",
        }}
      >
        {/* Header */}
        <header style={{
          display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 14, alignItems: "center",
          padding: "14px 18px", borderBottom: "1px solid var(--tm-line)",
          background: "linear-gradient(180deg, rgba(255,212,90,0.06), transparent)",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: "rgba(255,212,90,0.18)",
            border: "1px solid var(--tm-honey-border)",
            display: "grid", placeItems: "center",
            color: "var(--tm-honey-2)", fontWeight: 900, fontFamily: "var(--tm-f-display)",
          }}>＋</div>
          <div style={{ minWidth: 0 }}>
            <div className={styles.monoCap} style={{ color: "var(--tm-honey-2)" }}>
              NEW SCHEDULED TASK
            </div>
            <div id="tm-title" style={{
              fontFamily: "var(--tm-f-display)", fontSize: 18, fontWeight: 700,
              color: "var(--tm-fg)", letterSpacing: 0, lineHeight: 1.15, marginTop: 2,
            }}>Schedule a new task</div>
          </div>
          <CloseIconButton onClick={onClose} aria-label="Close" />
        </header>

        {/* Body */}
        <div style={{
          overflow: "auto", padding: "16px 20px 18px", display: "grid", gap: 14,
        }}>
          {/* Tab */}
          <div style={{
            display: "inline-flex", gap: 4, padding: 4, width: "fit-content",
            borderRadius: 999, border: "1px solid var(--tm-line)",
            background: "var(--tm-panel-soft)",
          }}>
            {[
              { id: "template" as const, label: "Start from template" },
              { id: "custom"   as const, label: "Custom task" },
            ].map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: "7px 14px", borderRadius: 999, cursor: "pointer", border: 0,
                background: tab === t.id ? "var(--tm-bg-4)" : "transparent",
                color: tab === t.id ? "var(--tm-fg)" : "var(--tm-fg-3)",
                fontFamily: "var(--tm-f-mono)", fontSize: 11, fontWeight: 700,
                letterSpacing: 0.06, textTransform: "uppercase",
              }}>{t.label}</button>
            ))}
          </div>

          {tab === "template" && (
            <Section title="Pick a template">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                {TEMPLATES.map((s) => {
                  const a = skill === s.id;
                  return (
                    <button key={s.id} onClick={() => setSkill(s.id)} style={{
                      display: "grid", gap: 4, padding: "10px 12px",
                      borderRadius: 8, cursor: "pointer", textAlign: "left",
                      border: `1px solid ${a ? "var(--tm-honey-border)" : "var(--tm-line)"}`,
                      background: a ? "rgba(255,212,90,0.10)" : "transparent",
                      color: "var(--tm-fg)",
                    }}>
                      <div style={{
                        fontFamily: "var(--tm-f-display)", fontSize: 13, fontWeight: 600,
                        color: a ? "var(--tm-honey-3)" : "var(--tm-fg)",
                      }}>{s.label}</div>
                      <div style={{ fontFamily: "var(--tm-f-mono)", fontSize: 10, color: "var(--tm-fg-4)" }}>
                        {s.id}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--tm-fg-3)", lineHeight: 1.4 }}>
                        {s.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Section>
          )}

          <Section title="Title">
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="What does this task do?" style={fieldStyle} />
          </Section>

          {/* Steps / Prompt — same segmented control for both tabs */}
          <Section title="Instructions" right={
            <div style={{
              display: "inline-flex", gap: 4, padding: 3, borderRadius: 999,
              border: "1px solid var(--tm-line)", background: "var(--tm-panel-soft)",
            }}>
              {[
                { id: "steps"  as const, label: "Steps" },
                { id: "prompt" as const, label: "Prompt" },
              ].map((m) => (
                <button key={m.id} onClick={() => setMode(m.id)} style={{
                  padding: "4px 10px", borderRadius: 999, cursor: "pointer", border: 0,
                  background: mode === m.id ? "var(--tm-bg-4)" : "transparent",
                  color: mode === m.id ? "var(--tm-fg)" : "var(--tm-fg-3)",
                  fontFamily: "var(--tm-f-mono)", fontSize: 10, fontWeight: 700,
                  letterSpacing: 0.06, textTransform: "uppercase",
                }}>{m.label}</button>
              ))}
            </div>
          }>
            {mode === "steps" ? (
              <div style={{ display: "grid", gap: 8 }}>
                {steps.map((s, i) => (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: "26px 1fr auto", gap: 10,
                    alignItems: "start",
                    padding: "10px 12px", borderRadius: 8,
                    border: "1px solid var(--tm-line)", background: "var(--tm-panel-soft)",
                  }}>
                    <span style={{
                      display: "grid", placeItems: "center", width: 26, height: 26, borderRadius: 6,
                      background: "rgba(45,212,191,0.12)",
                      border: "1px solid rgba(94,234,212,0.32)", color: "var(--tm-cyan-3)",
                      fontFamily: "var(--tm-f-mono)", fontSize: 11, fontWeight: 800,
                    }}>{i + 1}</span>
                    <input value={s} onChange={(e) => updateStep(i, e.target.value)}
                      placeholder={`Step ${i + 1}`} style={{
                        border: 0, background: "transparent", outline: 0, padding: 0,
                        color: "var(--tm-fg)", fontFamily: "var(--tm-f-display)",
                        fontSize: 13, lineHeight: 1.5,
                      }} />
                    <CloseIconButton size="sm" onClick={() => removeStep(i)} aria-label={`Remove step ${i + 1}`} />
                  </div>
                ))}
                <button onClick={addStep} style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "9px 12px", borderRadius: 8, cursor: "pointer",
                  border: "1px dashed var(--tm-add)", background: "transparent",
                  color: "var(--tm-cyan-3)",
                  fontFamily: "var(--tm-f-mono)", fontSize: 11, fontWeight: 700,
                  letterSpacing: 0.06, textTransform: "uppercase",
                }}>＋ add step</button>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={7}
                  placeholder="Describe the task in plain language. The bee will plan the steps itself."
                  style={{ ...fieldStyle, minHeight: 150, resize: "vertical", lineHeight: 1.55 }} />
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  fontFamily: "var(--tm-f-mono)", fontSize: 10, color: "var(--tm-fg-4)",
                }}>
                  <span>{prompt.length} chars</span>
                  <span style={{ color: "var(--tm-cyan-3)" }}>bee plans steps at run time</span>
                </div>
              </div>
            )}
          </Section>

          <Section title="Attachments" right={
            <span style={{ fontFamily: "var(--tm-f-mono)", fontSize: 10, color: "var(--tm-fg-4)" }}>
              {attachments.length} attached
            </span>
          }>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
              {attachments.map((a, i) => (
                <AttachChip key={i} kind={a.kind} label={a.label} onRemove={() => removeAttach(i)} />
              ))}
              <AttachAdder open={attachOpen} setOpen={setAttachOpen}
                skillOptions={normalizedSkillOptions}
                selectedSkills={attachments.filter((item) => item.kind === "skill").map((item) => item.label)}
                onBrowseFolder={onBrowseFolder}
                onPick={(kind, label) => {
                  setAttachments((arr) => [...arr, { kind, label }]);
                  setAttachOpen(null);
                }} />
            </div>
          </Section>

          <Section title="Cadence">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {CADENCE_PILLS.map((p) => {
                const a = cadenceKind === p.id;
                return (
                  <button key={p.id} onClick={() => setCadenceKind(p.id)} style={{
                    padding: "6px 11px", borderRadius: 999, cursor: "pointer",
                    border: `1px solid ${a ? "var(--tm-honey-border)" : "var(--tm-line)"}`,
                    background: a ? "rgba(255,212,90,0.14)" : "transparent",
                    color: a ? "var(--tm-honey-2)" : "var(--tm-fg-3)",
                    fontFamily: "var(--tm-f-mono)", fontSize: 10, fontWeight: 700,
                    letterSpacing: 0.06, textTransform: "uppercase",
                  }}>{p.label}</button>
                );
              })}
            </div>
            {cadenceKind === "cron" ? (
              <input value={cronExpr} onChange={(e) => setCronExpr(e.target.value)}
                placeholder="* * * * *" style={{
                  ...fieldStyle,
                  color: "var(--tm-cyan-3)", fontFamily: "var(--tm-f-mono)",
                }} />
            ) : (
              <div style={{
                padding: "8px 12px", borderRadius: 7,
                border: "1px solid rgba(94,234,212,0.28)", background: "rgba(45,212,191,0.06)",
                fontFamily: "var(--tm-f-mono)", fontSize: 11, color: "var(--tm-cyan-3)",
              }}>{cadenceSummary(cadenceKind, cronExpr)}</div>
            )}
          </Section>

          <Section title="History context">
            <label style={{
              display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, alignItems: "center",
              padding: "10px 12px", borderRadius: 8,
              border: "1px solid var(--tm-line)", background: "var(--tm-panel-soft)",
            }}>
              <input
                type="checkbox"
                checked={usePastRuns}
                onChange={(event) => setUsePastRuns(event.target.checked)}
                style={{ width: 16, height: 16, accentColor: "var(--tm-cyan)" }}
              />
              <span style={{ display: "grid", gap: 2 }}>
                <strong style={{ color: "var(--tm-fg)", fontFamily: "var(--tm-f-display)", fontSize: 13 }}>
                  Inject past runs
                </strong>
                <small style={{ color: "var(--tm-fg-4)", fontFamily: "var(--tm-f-mono)", fontSize: 10, lineHeight: 1.35 }}>
                  Use recent run notes for continuity and anti-repetition.
                </small>
              </span>
              <input
                type="number"
                min={1}
                max={12}
                value={pastRunLimit}
                disabled={!usePastRuns}
                onChange={(event) => setPastRunLimit(Math.max(1, Math.min(12, Number(event.target.value) || 1)))}
                aria-label="Past run count"
                style={{
                  ...fieldStyle,
                  width: 64,
                  padding: "7px 8px",
                  opacity: usePastRuns ? 1 : 0.45,
                  fontFamily: "var(--tm-f-mono)",
                }}
              />
            </label>
          </Section>

          <Section title="Target">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <PickerField label="machine" value={target.machine}
                options={machineOptions}
                onChange={(v) => setTarget((t) => ({ ...t, machine: v }))} />
              <PickerField label="bee" value={target.bee}
                options={beeOptions}
                onChange={(v) => setTarget((t) => ({ ...t, bee: v }))} />
            </div>
          </Section>
        </div>

        {/* Footer */}
        <footer style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
          padding: "14px 18px", borderTop: "1px solid var(--tm-line)",
          background: "rgba(255,255,255,0.02)",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            fontFamily: "var(--tm-f-mono)", fontSize: 10.5, color: "var(--tm-fg-4)",
            letterSpacing: 0.06, textTransform: "uppercase",
          }}>
            <span className={styles.dotLive} style={{ color: "var(--tm-cyan)" }} />
            Will fire <strong style={{ color: "var(--tm-cyan-3)" }}>
              {cadenceSummary(cadenceKind, cronExpr)}
            </strong>
            <span style={{ color: "var(--tm-fg-4)" }}>·</span>
            <span>on {target.machine} → {target.bee}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{
              padding: "9px 14px", borderRadius: 7, cursor: "pointer",
              border: "1px solid var(--tm-line-2)", background: "transparent", color: "var(--tm-fg-2)",
              fontFamily: "var(--tm-f-mono)", fontSize: 11, fontWeight: 700,
              letterSpacing: 0.06, textTransform: "uppercase",
            }}>cancel</button>
            <button onClick={handleSave} style={{
              padding: "9px 16px", borderRadius: 7, cursor: "pointer",
              border: "1px solid rgba(255,212,90,0.55)",
              background: "rgba(255,212,90,0.18)", color: "var(--tm-honey-2)",
              fontFamily: "var(--tm-f-mono)", fontSize: 11, fontWeight: 700,
              letterSpacing: 0.06, textTransform: "uppercase",
            }}>save & arm</button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

// ─── Internals ────────────────────────────────────────────────────────────
const fieldStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 7,
  border: "1px solid var(--tm-line-2)", background: "var(--tm-panel-soft)",
  color: "var(--tm-fg)", fontFamily: "var(--tm-f-display)",
  fontSize: 13, lineHeight: 1.4, outline: "none",
};
function Section({ title, right, children }: {
  title: string; right?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8,
      }}>
        <span className={styles.monoCap} style={{ color: "var(--tm-fg-4)" }}>{title}</span>
        {right}
      </div>
      {children}
    </section>
  );
}

function AttachChip({ kind, label, onRemove }: {
  kind: "skill" | "path"; label: string; onRemove: () => void;
}) {
  const tone = kind === "skill"
    ? { c: "rgba(216,180,254,0.86)", bg: "rgba(168,85,247,0.10)", br: "rgba(168,85,247,0.22)" }
    : { c: "rgba(253,224,71,0.86)",  bg: "rgba(251,191,36,0.08)",  br: "rgba(251,191,36,0.22)" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "5px 8px", borderRadius: 7,
      border: `1px solid ${tone.br}`, background: tone.bg, color: tone.c,
      fontFamily: "var(--tm-f-mono)", fontSize: 11, fontWeight: 700,
    }}>
      <span style={{ opacity: 0.7 }}>{kind === "skill" ? "▸ skill" : "▸ path"}</span>
      <span>{label}</span>
      <CloseIconButton size="sm" onClick={onRemove} aria-label="Remove" />
    </span>
  );
}

function AttachAdder({ open, setOpen, onPick, skillOptions, selectedSkills, onBrowseFolder }: {
  open: "skill" | "path" | null;
  setOpen: (v: "skill" | "path" | null) => void;
  onPick: (kind: "skill" | "path", label: string) => void;
  skillOptions: TaskModalSkillOption[];
  selectedSkills: string[];
  onBrowseFolder?: () => Promise<string | null>;
}) {
  const [skillSearch, setSkillSearch] = React.useState("");
  const pickInputFiles = React.useCallback((directory: boolean) => new Promise<string[]>((resolve) => {
    const input = document.createElement("input") as HTMLInputElement & {
      webkitdirectory?: boolean;
      directory?: boolean;
    };
    input.type = "file";
    input.multiple = true;
    if (directory) {
      input.webkitdirectory = true;
      input.directory = true;
    }
    input.style.position = "fixed";
    input.style.left = "-9999px";
    input.style.top = "-9999px";
    input.addEventListener("change", () => {
      const files = Array.from(input.files ?? []);
      const names = directory
        ? Array.from(new Set(files.map((file) => {
          const relativePath = "webkitRelativePath" in file ? String(file.webkitRelativePath) : "";
          return relativePath.split("/").filter(Boolean)[0] || file.name;
        }).filter(Boolean))).slice(0, 1)
        : files.map((file) => file.name).filter(Boolean);
      input.remove();
      resolve(names);
    }, { once: true });
    input.addEventListener("cancel", () => {
      input.remove();
      resolve([]);
    }, { once: true });
    document.body.append(input);
    input.click();
  }), []);
  const chooseFiles = React.useCallback(async () => {
    type FileHandle = { name?: string; getFile?: () => Promise<File> };
    type PickerWindow = Window & typeof globalThis & {
      showOpenFilePicker?: (options?: { multiple?: boolean }) => Promise<FileHandle[]>;
    };
    const picker = (window as PickerWindow).showOpenFilePicker;
    try {
      const names = picker
        ? await Promise.all((await picker({ multiple: true })).map(async (handle) => {
          if (handle.name?.trim()) return handle.name.trim();
          const file = await handle.getFile?.();
          return file?.name?.trim() ?? "";
        }))
        : await pickInputFiles(false);
      for (const name of names.filter(Boolean)) onPick("path", name);
      setOpen(null);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      const names = await pickInputFiles(false);
      for (const name of names.filter(Boolean)) onPick("path", name);
      setOpen(null);
    }
  }, [onPick, pickInputFiles, setOpen]);
  const chooseFolder = React.useCallback(async () => {
    type PickerWindow = Window & typeof globalThis & {
      showDirectoryPicker?: () => Promise<{ name?: string }>;
    };
    if (onBrowseFolder) {
      const path = await onBrowseFolder();
      if (path) onPick("path", path);
      setOpen(null);
      return;
    }
    const picker = (window as PickerWindow).showDirectoryPicker;
    try {
      const names = picker
        ? [((await picker()).name ?? "").trim()].filter(Boolean)
        : await pickInputFiles(true);
      for (const name of names.filter(Boolean)) onPick("path", name);
      setOpen(null);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      const names = await pickInputFiles(true);
      for (const name of names.filter(Boolean)) onPick("path", name);
      setOpen(null);
    }
  }, [onBrowseFolder, onPick, pickInputFiles, setOpen]);
  const filteredSkills = React.useMemo(() => {
    const query = skillSearch.trim().toLowerCase();
    const options = skillOptions.map((skill) => ({
      ...skill,
      selected: selectedSkills.includes(skill.slug),
    }));
    if (!query) return options.sort((a, b) => Number(b.selected) - Number(a.selected) || a.name.localeCompare(b.name));
    return options
      .map((skill) => {
        const nameMatch = skill.name.toLowerCase().includes(query) || skill.slug.toLowerCase().includes(query);
        const keywordMatch = (skill.description ?? "").toLowerCase().includes(query);
        return { ...skill, rank: nameMatch ? 0 : keywordMatch ? 1 : 2 };
      })
      .filter((skill) => skill.rank < 2)
      .sort((a, b) => a.rank - b.rank || Number(b.selected) - Number(a.selected) || a.name.localeCompare(b.name));
  }, [selectedSkills, skillOptions, skillSearch]);

  return (
    <span style={{ position: "relative", display: "inline-flex", gap: 4 }}>
      <button onClick={() => {
        setSkillSearch("");
        setOpen(open === "skill" ? null : "skill");
      }} aria-label="Attach skill"
        style={{
          padding: "5px 9px", borderRadius: 7, cursor: "pointer",
          border: "1px dashed rgba(168,85,247,0.32)", background: "transparent",
          color: "rgba(216,180,254,0.86)",
          fontFamily: "var(--tm-f-mono)", fontSize: 10, fontWeight: 700,
          letterSpacing: 0.06, textTransform: "uppercase",
        }}>＋ skill</button>
      <button onClick={() => setOpen(open === "path" ? null : "path")} aria-label="Attach path"
        style={{
          padding: "5px 9px", borderRadius: 7, cursor: "pointer",
          border: "1px dashed rgba(251,191,36,0.32)", background: "transparent",
          color: "rgba(253,224,71,0.86)",
          fontFamily: "var(--tm-f-mono)", fontSize: 10, fontWeight: 700,
          letterSpacing: 0.06, textTransform: "uppercase",
        }}>＋ path</button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, marginTop: 6, zIndex: 5,
          width: open === "skill" ? 320 : 240, padding: 6, borderRadius: 8,
          background: "var(--tm-panel)", border: "1px solid var(--tm-line-2)",
          boxShadow: "0 18px 42px rgba(0,0,0,0.46)",
          display: "grid", gap: 2,
        }}>
          {open === "skill" ? (
            <>
              <input
                value={skillSearch}
                onChange={(event) => setSkillSearch(event.target.value)}
                placeholder="Search by skill name or keyword"
                autoFocus
                style={{
                  width: "100%", padding: "8px 10px", borderRadius: 7,
                  border: "1px solid var(--tm-line-2)", background: "var(--tm-panel-soft)",
                  color: "var(--tm-fg)", fontFamily: "var(--tm-f-mono)", fontSize: 11,
                  outline: "none", marginBottom: 4,
                }}
              />
              <div style={{ display: "grid", gap: 2, maxHeight: 220, overflowY: "auto", overscrollBehavior: "contain", paddingRight: 2 }}>
                {filteredSkills.length ? filteredSkills.map((skill) => (
                  <button key={skill.slug} onClick={() => onPick("skill", skill.slug)} style={{
                    display: "grid", gap: 2, padding: "7px 10px", borderRadius: 6, cursor: "pointer",
                    background: skill.selected ? "rgba(168,85,247,0.14)" : "transparent",
                    border: `1px solid ${skill.selected ? "rgba(168,85,247,0.28)" : "transparent"}`,
                    color: "var(--tm-fg-2)", textAlign: "left",
                    fontFamily: "var(--tm-f-mono)", fontSize: 11, fontWeight: 600,
                  }}>
                    <span>{skill.name}</span>
                    {skill.slug !== skill.name || skill.description ? (
                      <small style={{ color: "var(--tm-fg-4)", fontSize: 10, lineHeight: 1.35 }}>
                        {skill.slug}{skill.description ? ` · ${skill.description}` : ""}
                      </small>
                    ) : null}
                  </button>
                )) : (
                  <span style={{ padding: "8px 10px", color: "var(--tm-fg-4)", fontFamily: "var(--tm-f-mono)", fontSize: 11 }}>
                    No matching shared-brain skills.
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <button type="button" onClick={() => void chooseFolder()} style={pathPickerButtonStyle}>
                <span>Choose folder</span>
                <small>Open directory picker</small>
              </button>
              <button type="button" onClick={() => void chooseFiles()} style={pathPickerButtonStyle}>
                <span>Choose files</span>
                <small>Open file browser</small>
              </button>
            </>
          )}
        </div>
      )}
    </span>
  );
}

const pathPickerButtonStyle: React.CSSProperties = {
  display: "grid",
  gap: 2,
  padding: "8px 10px",
  borderRadius: 6,
  cursor: "pointer",
  background: "transparent",
  border: "1px solid transparent",
  color: "var(--tm-fg-2)",
  textAlign: "left",
  fontFamily: "var(--tm-f-mono)",
  fontSize: 11,
  fontWeight: 700,
};

function PickerField({ label, value, options, onChange }: {
  label: string; value: string; options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span className={styles.monoCap} style={{ color: "var(--tm-fg-4)" }}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{
        padding: "10px 12px", borderRadius: 7,
        border: "1px solid var(--tm-line-2)", background: "var(--tm-bg-2)",
        color: "var(--tm-fg)", fontFamily: "var(--tm-f-mono)", fontSize: 12, outline: "none",
      }}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
