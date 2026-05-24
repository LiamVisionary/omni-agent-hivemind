// src/components/fleet/roster.tsx
"use client";

import * as React from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Copy, LoaderCircle, MessageSquare, Monitor, Pencil, Plus, Settings2, Smartphone, Trash2, Wallet, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BeeIcon } from "./bee-icon";
import { HexTile } from "./hex-tile";
import { fleetAgentCanChat, isFleetMachineMobile, type AgentState, type FleetAgent, type FleetAgentChat, type FleetMachine } from "./fleet-data";
import styles from "./fleet-tokens.module.css";

const STATE_COLOR: Record<AgentState, string> = {
  working:   "var(--accent-strong)",
  ready:     "var(--muted)",
  scheduled: "#fde68a",
  setup:     "#fde68a",
  failed:    "var(--danger)",
};

export type MachineUpdateButtonStatus = "idle" | "updating" | "updated" | "failed";
export type MachineUpdateButtonDetail = {
  label?: string;
  detail?: string;
};

interface RosterRowProps {
  machine: FleetMachine;
  selected: boolean;
  expanded: boolean;
  selectedAgentId: string | null;
  updateStatus?: MachineUpdateButtonStatus;
  updateDetail?: MachineUpdateButtonDetail;
  onSelectMachine: () => void;
  onSelectAgent: (a: FleetAgent) => void;
  onToggle: () => void;
  onAddAgent: () => void;
  onUpdateMachine?: () => void;
  onRenameMachine?: (name: string) => void;
  onOpenNetworkIssue?: () => void;
  onOpenChat?: (a: FleetAgent) => void;
  onOpenTaskChat?: (a: FleetAgent, chat?: FleetAgentChat) => void;
  onOpenWallet?: (a: FleetAgent) => void;
  onEditSettings?: (a: FleetAgent) => void;
  onDuplicate?: (a: FleetAgent) => void;
  onRemove?: (a: FleetAgent) => void;
}

function RosterRow({
  machine, selected, expanded, selectedAgentId,
  updateStatus,
  updateDetail,
  onSelectMachine, onSelectAgent, onToggle, onAddAgent,
  onUpdateMachine,
  onRenameMachine,
  onOpenNetworkIssue,
  onOpenChat, onOpenTaskChat, onOpenWallet, onEditSettings, onDuplicate, onRemove,
}: RosterRowProps) {
  const [expandedTaskIds, setExpandedTaskIds] = React.useState<Set<string>>(() => new Set());
  const [successDismissed, setSuccessDismissed] = React.useState(false);
  const [editingName, setEditingName] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState(machine.name);
  const roleIconDim = (state: AgentState) => state === "ready" || state === "setup" || state === "failed";
  const fire = (agent: FleetAgent, fn?: (a: FleetAgent) => void) => (event: React.MouseEvent) => {
    event.stopPropagation();
    fn?.(agent);
  };
  const fireTaskChat = (agent: FleetAgent, chat: FleetAgentChat, fn?: (a: FleetAgent, chat?: FleetAgentChat) => void) => (event: React.MouseEvent) => {
    event.stopPropagation();
    fn?.(agent, chat);
  };
  const toggleTaskPreview = (previewId: string) => {
    setExpandedTaskIds((current) => {
      const next = new Set(current);
      if (next.has(previewId)) {
        next.delete(previewId);
      } else {
        next.add(previewId);
      }
      return next;
    });
  };

  React.useEffect(() => {
    if (updateStatus !== "updated") return;
    const timeout = window.setTimeout(() => setSuccessDismissed(true), 3000);
    return () => window.clearTimeout(timeout);
  }, [updateStatus]);

  React.useEffect(() => {
    if (editingName) return;
    const timeout = window.setTimeout(() => setNameDraft(machine.name), 0);
    return () => window.clearTimeout(timeout);
  }, [editingName, machine.name]);

  const commitName = () => {
    setEditingName(false);
    onRenameMachine?.(nameDraft);
  };

  const showUpdateButton = Boolean(
    onUpdateMachine
      && machine.canUpdate !== false
      && (
	        updateStatus === "updating"
	        || (updateStatus === "updated" && !successDismissed)
	        || updateStatus === "failed"
	        || (machine.versionState === "stale" && updateStatus !== "updated")
	        || machine.canUpdate === true
	      ),
	  );
  const updateDisabled = updateStatus === "updating" || updateStatus === "updated";
  const MachineIcon = isFleetMachineMobile(machine) ? Smartphone : Monitor;

  return (
    <div
      className="rounded-lg overflow-hidden relative"
      style={{
        border: `1px solid ${selected ? "rgba(255,212,90,0.42)" : "rgba(148,163,184,0.16)"}`,
        background: selected ? "rgba(255,212,90,0.10)" : "transparent",
      }}
    >
      <div
        onClick={onSelectMachine}
        className={`${styles.rosterMachineRow} cursor-pointer`}
        style={{
          color: selected ? "var(--hex-honey-border)" : "var(--foreground)",
        }}
      >
        <HexTile size={22} tone={selected ? "honey" : "default"}>
          <MachineIcon
            aria-hidden="true"
            size={13}
            style={{
              color: selected ? "var(--hex-honey-border)" : "var(--muted)",
            }}
          />
        </HexTile>
        <div className={styles.rosterMachineBody}>
          <div className={styles.rosterMachineSummary}>
            <div className={styles.rosterMachineIdentity}>
              <div className={`${styles.rosterMachineName} flex items-center gap-1.5`}>
                {editingName ? (
                  <input
                    value={nameDraft}
                    autoFocus
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => setNameDraft(event.target.value)}
                    onBlur={commitName}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        commitName();
                      }
                      if (event.key === "Escape") {
                        event.preventDefault();
                        setNameDraft(machine.name);
                        setEditingName(false);
                      }
                    }}
                    aria-label={`Rename ${machine.name}`}
                    style={{
                      width: "100%",
                      minWidth: 0,
                      border: "1px solid rgba(94,234,212,0.46)",
                      borderRadius: 6,
                      background: "rgba(2,6,23,0.72)",
                      color: "var(--foreground)",
                      font: "inherit",
                      letterSpacing: 0,
                      padding: "2px 5px",
                      outline: "none",
                    }}
                  />
                ) : (
                  <>
                    <span>{machine.name}</span>
                    {onRenameMachine ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label={`Rename ${machine.name}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setNameDraft(machine.name);
                              setEditingName(true);
                            }}
                            style={{
                              width: 20,
                              height: 20,
                              display: "inline-grid",
                              placeItems: "center",
                              border: 0,
                              borderRadius: 6,
                              background: "transparent",
                              color: "var(--muted)",
                              cursor: "pointer",
                              flex: "0 0 auto",
                            }}
                          >
                            <Pencil size={11} aria-hidden="true" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Rename machine</TooltipContent>
                      </Tooltip>
                    ) : null}
                  </>
                )}
              </div>
              <div className={styles.rosterMachineMeta}>
                {machine.kind} · {machine.city}
              </div>
            </div>
            <div className={styles.rosterMachineStatus}>
              {showUpdateButton ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!updateDisabled) {
                      setSuccessDismissed(false);
                      onUpdateMachine?.();
                    }
                  }}
                  disabled={updateDisabled}
                  aria-label={
                    updateStatus === "updating"
                      ? `Updating ${machine.name}`
                      : updateStatus === "updated"
                        ? `${machine.name} updated`
                        : updateStatus === "failed"
                          ? `${updateDetail?.label ?? `Update failed for ${machine.name}`}. Retry update`
                          : `Update ${machine.name}`
                  }
                  title={updateDetail?.detail}
                  aria-live="polite"
                  className={`${styles.rosterUpdateButton} inline-flex items-center justify-center`}
                  style={{
                    minWidth: updateStatus === "updated" ? 70 : 62,
                    minHeight: 24,
                    padding: "4px 8px",
                    borderRadius: 7,
                    border: updateStatus === "failed"
                      ? "1px solid rgba(251,113,133,0.46)"
                      : updateStatus === "updated"
                        ? "1px solid rgba(94,234,212,0.54)"
                        : "1px solid rgba(255,212,90,0.46)",
                    background: updateStatus === "failed"
                      ? "rgba(251,113,133,0.14)"
                      : updateStatus === "updated"
                        ? "rgba(45,212,191,0.16)"
                        : "rgba(255,212,90,0.14)",
                    color: updateStatus === "failed"
                      ? "#fecdd3"
                      : updateStatus === "updated"
                        ? "var(--accent-strong)"
                        : "var(--hex-honey-border)",
                    fontFamily: "var(--f-mono)",
                    fontSize: 9.5,
                    fontWeight: 800,
                    letterSpacing: 0,
                    cursor: updateDisabled ? "default" : "pointer",
                  }}
                >
                  {updateStatus === "updating" ? (
                    <LoaderCircle size={12} className="animate-spin" aria-hidden="true" />
                  ) : updateStatus === "updated" ? (
                    "Updated!"
                  ) : updateStatus === "failed" ? (
                    "Failed"
                  ) : (
                    "Update"
                  )}
                </button>
                  </TooltipTrigger>
                  {updateDetail?.detail ? (
                    <TooltipContent side="top" style={{ maxWidth: 320, whiteSpace: "pre-wrap" }}>
                      {updateDetail.detail}
                    </TooltipContent>
                  ) : null}
                </Tooltip>
              ) : (
                <span
                  className={styles.rosterMachineCount}
                  style={{
                    color: selected ? "var(--hex-honey-border)" : "var(--accent-strong)",
                  }}
                >
                  {machine.agents.length}
                </span>
              )}
            </div>
          </div>
          {machine.networkIssue ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpenNetworkIssue?.();
              }}
              className={styles.rosterNetworkIssue}
              style={{
                border: "1px solid rgba(251,191,36,0.42)",
                background: "rgba(251,191,36,0.12)",
                color: "#fde68a",
                cursor: "pointer",
              }}
            >
              <AlertTriangle size={10} aria-hidden="true" />
              <span>{machine.networkIssue.label}</span>
            </button>
          ) : null}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          aria-label={expanded ? "Collapse" : "Expand"}
          className={`${styles.rosterMachineToggle} grid place-items-center`}
          style={{
            border: 0, background: "transparent",
            color: "var(--muted)", cursor: "pointer",
            transform: expanded ? "rotate(90deg)" : "rotate(0)",
            transition: "transform 160ms ease",
          }}
        >
          <ChevronRight size={12} />
        </button>
      </div>

      {expanded && machine.agents.length > 0 && (
        <div className="grid gap-1" style={{ padding: "0 10px 10px" }}>
          {machine.agents.map((a) => {
            const isSelA = selectedAgentId === a.id;
            const canChat = fleetAgentCanChat(a);
            return (
              <div
                key={a.id}
                style={{
                  border: `1px solid ${isSelA ? "rgba(255,212,90,0.55)" : "transparent"}`,
                  borderRadius: 8,
                  background: isSelA ? "rgba(255,212,90,0.14)" : "rgba(16,20,29,0.5)",
                  color: isSelA ? "var(--hex-honey-border)" : "var(--foreground)",
                }}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); onSelectAgent(a); }}
                  className="grid items-center text-left cursor-pointer"
                  style={{
                    width: "100%",
                    gridTemplateColumns: "26px minmax(0, 1fr) auto", gap: 10,
                    padding: "8px 10px",
                    border: 0,
                    background: "transparent",
                    color: "inherit",
                  }}
                >
                  <HexTile size={28} tone={isSelA ? "honey" : a.state === "working" ? "active" : "ghost"}>
                    <BeeIcon
                      role={a.beeRole === "queen" ? "queen" : "worker"}
                      workerClass={a.workerClass}
                      size={22}
                      dim={roleIconDim(a.state)}
                    />
                  </HexTile>
                  <div className="min-w-0">
                    <div className="font-semibold"
                      style={{ fontFamily: "var(--f-display)", fontSize: 11.5 }}>
                      {a.name}
                    </div>
                    <div
                      style={{ fontFamily: "var(--f-mono)", fontSize: 9.5, color: "var(--muted)" }}>
                      {a.runtime} · {a.role}
                    </div>
                  </div>
                  <span className={styles.monoCap}
                    style={{ color: STATE_COLOR[a.state], fontSize: 9 }}>
                    {a.state}
                  </span>
                </button>

                {isSelA && (
                  <div
                    style={{
                      display: "grid",
                      gap: 8,
                      padding: "0 10px 10px 46px",
                    }}
                  >
                    {(a.recentChats?.length
                      ? a.recentChats
                      : [{ id: "current", title: a.task, task: a.task, since: a.since }]
                    ).slice(0, 3).map((chat) => {
                      const previewId = `${a.id}:${chat.id}`;
                      const isTaskExpanded = expandedTaskIds.has(previewId);
                      return (
                        <div
                          key={previewId}
                          role="button"
                          tabIndex={0}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleTaskPreview(previewId);
                          }}
                          onKeyDown={(event) => {
                            if (event.key !== "Enter" && event.key !== " ") return;
                            event.preventDefault();
                            event.stopPropagation();
                            toggleTaskPreview(previewId);
                          }}
                          className={`${styles.rosterTaskPreview} ${isTaskExpanded ? styles.rosterTaskPreviewExpanded : ""}`}
                          aria-expanded={isTaskExpanded}
                          aria-label={`${isTaskExpanded ? "Collapse" : "Expand"} recent chat for ${a.name}`}
                        >
                          <span
                            className={`${styles.rosterTaskPreviewText} ${isTaskExpanded ? "" : styles.rosterTaskPreviewTextCollapsed}`}
                          >
                            {chat.title}
                          </span>
                          {canChat ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={fireTaskChat(a, chat, onOpenTaskChat)}
                                  aria-label={`Resume chat with ${a.name}`}
                                  className="inline-grid place-items-center"
                                  style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 7,
                                    border: "1px solid rgba(94,234,212,0.32)",
                                    background: "rgba(45,212,191,0.10)",
                                    color: "var(--accent-strong)",
                                    cursor: "pointer",
                                    flex: "0 0 auto",
                                  }}
                                >
                                  <MessageSquare size={12} aria-hidden="true" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Resume chat</TooltipContent>
                            </Tooltip>
                          ) : null}
                          <span
                            aria-hidden="true"
                            style={{
                              color: "var(--muted)",
                              fontFamily: "var(--f-mono)",
                              fontSize: 9,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {chat.since}
                          </span>
                          <ChevronDown size={13} aria-hidden="true" />
                        </div>
                      );
                    })}
                    <div className="flex items-center flex-wrap" style={{ gap: 6 }}>
                      {canChat && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={fire(a, onOpenChat)}
                              className="inline-flex items-center uppercase font-bold"
                              style={{
                                gap: 6, padding: "7px 9px", borderRadius: 7, cursor: "pointer",
                                fontFamily: "var(--f-mono)", fontSize: 9.5, letterSpacing: 0.04,
                                border: "1px solid rgba(94,234,212,0.48)",
                                background: "rgba(45,212,191,0.16)",
                                color: "var(--accent-strong)",
                              }}
                            >
                              <MessageSquare size={12} /> New Chat
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Start a fresh chat with {a.name}</TooltipContent>
                        </Tooltip>
                      )}

                      {[
                        { id: "wallet", label: "Wallet & limits", Icon: Wallet, onClick: fire(a, onOpenWallet) },
                        { id: "edit", label: "Edit settings", Icon: Settings2, onClick: fire(a, onEditSettings) },
                        { id: "dup", label: "Duplicate", Icon: Copy, onClick: fire(a, onDuplicate) },
                        { id: "remove", label: "Remove agent", Icon: Trash2, onClick: fire(a, onRemove), danger: true },
                      ].map(({ id, label, Icon, onClick, danger }) => (
                        <Tooltip key={id}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={onClick}
                              aria-label={label}
                              className="inline-grid place-items-center cursor-pointer"
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 7,
                                border: danger
                                  ? "1px solid rgba(251,113,133,0.30)"
                                  : "1px solid rgba(148,163,184,0.22)",
                                background: "rgba(15,23,42,0.62)",
                                color: danger ? "#fecdd3" : "var(--foreground)",
                              }}
                            >
                              <Icon size={12} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>{label}</TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); onAddAgent(); }}
            className={`${styles.rosterAddAgentRow} grid items-center text-left cursor-pointer`}
            style={{
              gridTemplateColumns: "26px minmax(0, 1fr)",
              gap: 10,
              padding: "8px 10px",
              border: "1px dashed rgba(94,234,212,0.38)",
              borderRadius: 8,
              background: "rgba(45,212,191,0.06)",
              color: "var(--accent-strong)",
            }}
          >
            <span
              className="grid place-items-center"
              style={{
                width: 24,
                height: 24,
                borderRadius: 7,
                border: "1px solid rgba(94,234,212,0.44)",
                background: "rgba(45,212,191,0.10)",
              }}
            >
              <Plus size={13} />
            </span>
            <span className={styles.monoCap} style={{ fontSize: 10 }}>
              Add agent
            </span>
          </button>
        </div>
      )}
      {expanded && machine.agents.length === 0 && (
        <div className="grid gap-1" style={{ padding: "0 10px 10px" }}>
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); onAddAgent(); }}
            className={`${styles.rosterAddAgentRow} grid items-center text-left cursor-pointer`}
            style={{
              gridTemplateColumns: "26px minmax(0, 1fr)",
              gap: 10,
              padding: "8px 10px",
              border: "1px dashed rgba(94,234,212,0.38)",
              borderRadius: 8,
              background: "rgba(45,212,191,0.06)",
              color: "var(--accent-strong)",
            }}
          >
            <span
              className="grid place-items-center"
              style={{
                width: 24,
                height: 24,
                borderRadius: 7,
                border: "1px solid rgba(94,234,212,0.44)",
                background: "rgba(45,212,191,0.10)",
              }}
            >
              <Plus size={13} />
            </span>
            <span className={styles.monoCap} style={{ fontSize: 10 }}>
              Add first agent
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

interface RosterProps {
  machines: FleetMachine[];
  selected: string;
  selectedAgentId: string | null;
  expanded: Set<string>;
  updateStatusByMachine?: Record<string, MachineUpdateButtonStatus>;
  updateDetailByMachine?: Record<string, MachineUpdateButtonDetail>;
  onSelectMachine: (id: string) => void;
  onSelectAgent: (m: FleetMachine, a: FleetAgent) => void;
  onToggleExpand: (id: string) => void;
  onAddAgent: (m: FleetMachine) => void;
  onUpdateMachine?: (m: FleetMachine) => void;
  onRenameMachine?: (machineId: string, name: string) => void;
  onOpenChat?: (m: FleetMachine, a: FleetAgent) => void;
  onOpenTaskChat?: (m: FleetMachine, a: FleetAgent, chat?: FleetAgentChat) => void;
  onOpenWallet?: (m: FleetMachine, a: FleetAgent) => void;
  onEditSettings?: (m: FleetMachine, a: FleetAgent) => void;
  onDuplicate?: (m: FleetMachine, a: FleetAgent) => void;
  onRemove?: (m: FleetMachine, a: FleetAgent) => void;
}

export function Roster({
  machines, selected, selectedAgentId, expanded,
  updateStatusByMachine,
  updateDetailByMachine,
  onSelectMachine, onSelectAgent, onToggleExpand, onAddAgent,
  onUpdateMachine,
  onRenameMachine,
  onOpenChat, onOpenTaskChat, onOpenWallet, onEditSettings, onDuplicate, onRemove,
}: RosterProps) {
  const [activeIssueMachine, setActiveIssueMachine] = React.useState<FleetMachine | null>(null);
  const activeIssue = activeIssueMachine?.networkIssue;
  return (
    <div className="grid gap-1.5">
      {machines.map((m) => (
        <RosterRow
          key={m.id}
          machine={m}
          selected={m.id === selected}
          expanded={expanded.has(m.id) || (m.id === selected && !!selectedAgentId)}
          selectedAgentId={m.id === selected ? selectedAgentId : null}
          updateStatus={updateStatusByMachine?.[m.id]}
          updateDetail={updateDetailByMachine?.[m.id]}
          onSelectMachine={() => onSelectMachine(m.id)}
          onSelectAgent={(a) => onSelectAgent(m, a)}
          onToggle={() => onToggleExpand(m.id)}
          onAddAgent={() => onAddAgent(m)}
          onUpdateMachine={onUpdateMachine ? () => onUpdateMachine(m) : undefined}
          onRenameMachine={onRenameMachine ? (name) => onRenameMachine(m.id, name) : undefined}
          onOpenNetworkIssue={m.networkIssue ? () => setActiveIssueMachine(m) : undefined}
          onOpenChat={(a) => onOpenChat?.(m, a)}
          onOpenTaskChat={(a, chat) => onOpenTaskChat?.(m, a, chat)}
          onOpenWallet={(a) => onOpenWallet?.(m, a)}
          onEditSettings={(a) => onEditSettings?.(m, a)}
          onDuplicate={(a) => onDuplicate?.(m, a)}
          onRemove={(a) => onRemove?.(m, a)}
        />
      ))}
      {activeIssue ? (
        <div
          role="presentation"
          onClick={() => setActiveIssueMachine(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            display: "grid",
            placeItems: "center",
            padding: 16,
            background: "rgba(2,6,23,0.72)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={activeIssue.title}
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(560px, 100%)",
              borderRadius: 8,
              border: "1px solid rgba(148,163,184,0.22)",
              background: "rgba(15,23,42,0.98)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.44)",
              color: "var(--foreground)",
              padding: 18,
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className={styles.monoCap} style={{ color: "#fde68a", marginBottom: 8 }}>
                  {activeIssueMachine?.name}
                </div>
                <h3 style={{ fontFamily: "var(--f-display)", fontSize: 20, margin: 0 }}>
                  {activeIssue.title}
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setActiveIssueMachine(null)}
                className="grid place-items-center"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 7,
                  border: "1px solid rgba(148,163,184,0.22)",
                  background: "rgba(15,23,42,0.78)",
                  color: "var(--muted)",
                  cursor: "pointer",
                }}
              >
                <X size={15} aria-hidden="true" />
              </button>
            </div>
            <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.55, margin: "12px 0 14px" }}>
              {activeIssue.detail}
            </p>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                overflowX: "auto",
                borderRadius: 7,
                border: "1px solid rgba(148,163,184,0.18)",
                background: "rgba(2,6,23,0.72)",
                color: "#dbeafe",
                padding: 12,
                fontFamily: "var(--f-mono)",
                fontSize: 11,
                lineHeight: 1.5,
              }}
            >{activeIssue.commands.join("\n")}</pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
