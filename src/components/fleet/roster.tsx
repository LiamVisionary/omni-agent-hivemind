// src/components/fleet/roster.tsx
"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, Copy, MessageSquare, Monitor, Plus, Settings2, Trash2, Wallet } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BeeIcon } from "./bee-icon";
import { HexTile } from "./hex-tile";
import { fleetAgentCanChat, type AgentState, type FleetAgent, type FleetMachine } from "./fleet-data";
import styles from "./fleet-tokens.module.css";

const STATE_COLOR: Record<AgentState, string> = {
  working:   "var(--accent-strong)",
  ready:     "var(--muted)",
  scheduled: "#fde68a",
  setup:     "#fde68a",
  failed:    "var(--danger)",
};

interface RosterRowProps {
  machine: FleetMachine;
  selected: boolean;
  expanded: boolean;
  selectedAgentId: string | null;
  onSelectMachine: () => void;
  onSelectAgent: (a: FleetAgent) => void;
  onToggle: () => void;
  onAddAgent: () => void;
  onOpenChat?: (a: FleetAgent) => void;
  onOpenWallet?: (a: FleetAgent) => void;
  onEditSettings?: (a: FleetAgent) => void;
  onDuplicate?: (a: FleetAgent) => void;
  onRemove?: (a: FleetAgent) => void;
}

function RosterRow({
  machine, selected, expanded, selectedAgentId,
  onSelectMachine, onSelectAgent, onToggle, onAddAgent,
  onOpenChat, onOpenWallet, onEditSettings, onDuplicate, onRemove,
}: RosterRowProps) {
  const [expandedTaskIds, setExpandedTaskIds] = React.useState<Set<string>>(() => new Set());
  const roleIconDim = (state: AgentState) => state === "ready" || state === "setup" || state === "failed";
  const fire = (agent: FleetAgent, fn?: (a: FleetAgent) => void) => (event: React.MouseEvent) => {
    event.stopPropagation();
    fn?.(agent);
  };
  const toggleTaskPreview = (agentId: string) => {
    setExpandedTaskIds((current) => {
      const next = new Set(current);
      if (next.has(agentId)) {
        next.delete(agentId);
      } else {
        next.add(agentId);
      }
      return next;
    });
  };

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        border: `1px solid ${selected ? "rgba(255,212,90,0.42)" : "rgba(148,163,184,0.16)"}`,
        background: selected ? "rgba(255,212,90,0.10)" : "transparent",
      }}
    >
      <div
        onClick={onSelectMachine}
        className="grid items-center gap-3 px-2.5 py-2 cursor-pointer"
        style={{
          gridTemplateColumns: "26px 1fr auto auto",
          color: selected ? "var(--hex-honey-border)" : "var(--foreground)",
        }}
      >
        <HexTile size={22} tone={selected ? "honey" : "default"}>
          <Monitor
            aria-hidden="true"
            size={13}
            style={{
              color: selected ? "var(--hex-honey-border)" : "var(--muted)",
            }}
          />
        </HexTile>
        <div className="min-w-0">
          <div className="font-semibold" style={{ fontFamily: "var(--f-display)", fontSize: 13 }}>
            {machine.name}
          </div>
          <div style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: "var(--muted)" }}>
            {machine.kind} · {machine.city}
          </div>
        </div>
        <span
          style={{
            fontFamily: "var(--f-mono)", fontSize: 11,
            color: selected ? "var(--hex-honey-border)" : "var(--accent-strong)",
          }}
        >
          {machine.agents.length}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          aria-label={expanded ? "Collapse" : "Expand"}
          className="grid place-items-center"
          style={{
            width: 20, height: 20, border: 0, background: "transparent",
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
            const isTaskExpanded = expandedTaskIds.has(a.id);
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
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleTaskPreview(a.id);
                      }}
                      className={`${styles.rosterTaskPreview} ${isTaskExpanded ? styles.rosterTaskPreviewExpanded : ""}`}
                      aria-expanded={isTaskExpanded}
                      aria-label={`${isTaskExpanded ? "Collapse" : "Expand"} recent task for ${a.name}`}
                    >
                      <span
                        className={`${styles.rosterTaskPreviewText} ${isTaskExpanded ? "" : styles.rosterTaskPreviewTextCollapsed}`}
                      >
                        {a.task}
                      </span>
                      <ChevronDown size={13} aria-hidden="true" />
                    </button>
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
                              <MessageSquare size={12} /> Chat
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Open chat with {a.name}</TooltipContent>
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
  onSelectMachine: (id: string) => void;
  onSelectAgent: (m: FleetMachine, a: FleetAgent) => void;
  onToggleExpand: (id: string) => void;
  onAddAgent: (m: FleetMachine) => void;
  onOpenChat?: (m: FleetMachine, a: FleetAgent) => void;
  onOpenWallet?: (m: FleetMachine, a: FleetAgent) => void;
  onEditSettings?: (m: FleetMachine, a: FleetAgent) => void;
  onDuplicate?: (m: FleetMachine, a: FleetAgent) => void;
  onRemove?: (m: FleetMachine, a: FleetAgent) => void;
}

export function Roster({
  machines, selected, selectedAgentId, expanded,
  onSelectMachine, onSelectAgent, onToggleExpand, onAddAgent,
  onOpenChat, onOpenWallet, onEditSettings, onDuplicate, onRemove,
}: RosterProps) {
  return (
    <div className="grid gap-1.5">
      {machines.map((m) => (
        <RosterRow
          key={m.id}
          machine={m}
          selected={m.id === selected}
          expanded={expanded.has(m.id) || (m.id === selected && !!selectedAgentId)}
          selectedAgentId={m.id === selected ? selectedAgentId : null}
          onSelectMachine={() => onSelectMachine(m.id)}
          onSelectAgent={(a) => onSelectAgent(m, a)}
          onToggle={() => onToggleExpand(m.id)}
          onAddAgent={() => onAddAgent(m)}
          onOpenChat={(a) => onOpenChat?.(m, a)}
          onOpenWallet={(a) => onOpenWallet?.(m, a)}
          onEditSettings={(a) => onEditSettings?.(m, a)}
          onDuplicate={(a) => onDuplicate?.(m, a)}
          onRemove={(a) => onRemove?.(m, a)}
        />
      ))}
    </div>
  );
}
