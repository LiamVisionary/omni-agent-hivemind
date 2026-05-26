// src/components/fleet/footers.tsx
"use client";

import { Copy, MessageSquare, Monitor, Settings2, Smartphone, Trash2, Wallet } from "lucide-react";
import { CloseIconButton } from "@/components/ui/close-icon-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BeeIcon } from "./bee-icon";
import { HexTile } from "./hex-tile";
import { fleetAgentCanChat, isFleetMachineMobile, type AgentState, type FleetAgent, type FleetMachine } from "./fleet-data";
import styles from "./fleet-tokens.module.css";

const stateTone = (s: AgentState) =>
  s === "working" ? "active" :
  s === "failed" ? "danger" :
  s === "scheduled" || s === "setup" ? "honey" : "default";

const stateColor: Record<AgentState, string> = {
  working:   "var(--accent-strong)",
  ready:     "var(--foreground)",
  scheduled: "#fde68a",
  setup:     "#fde68a",
  failed:    "var(--danger)",
};

interface MachineFooterProps {
  machine: FleetMachine;
  onPickAgent: (a: FleetAgent) => void;
}

export function MachineFooter({ machine, onPickAgent }: MachineFooterProps) {
  const MachineIcon = isFleetMachineMobile(machine) ? Smartphone : Monitor;
  return (
    <div
      className="mt-4 grid items-center"
      style={{
        gridTemplateColumns: "auto 1fr auto", gap: 18,
        padding: "14px 18px", borderRadius: 12,
        border: "1px solid rgba(148,163,184,0.16)",
        background: "rgba(16,20,29,0.78)",
      }}
    >
      <HexTile size={48} tone="honey"><MachineIcon aria-hidden="true" size={28} color="var(--accent-strong)" /></HexTile>
      <div>
        <div className={styles.monoCap} style={{ color: "var(--hex-honey-border)" }}>
          {machine.kind} · {machine.role}
        </div>
        <div className="font-bold" style={{ fontFamily: "var(--f-display)", fontSize: 22, letterSpacing: 0 }}>
          {machine.name}
        </div>
        <div style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--muted)" }}>
          {machine.os} · {machine.tailnet} · {machine.uptime}
        </div>
      </div>
      <div className="flex gap-2">
        {machine.agents.slice(0, 5).map((a) => (
          <Tooltip key={a.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onPickAgent(a)}
                className="border-0 bg-transparent p-0 cursor-pointer"
              >
                <HexTile size={46} tone={stateTone(a.state)}>
                  <BeeIcon role={a.beeRole === "queen" ? "queen" : "worker"} workerClass={a.workerClass} size={32} dim={a.state === "ready"} />
                </HexTile>
              </button>
            </TooltipTrigger>
            <TooltipContent>{a.name} · {a.state}</TooltipContent>
          </Tooltip>
        ))}
        {machine.agents.length === 0 && (
          <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--muted)", padding: "12px 0" }}>
            no agents yet — run setup
          </span>
        )}
      </div>
    </div>
  );
}

interface AgentFooterProps {
  machine: FleetMachine;
  agent: FleetAgent;
  onClear: () => void;
  onOpenChat?: (m: FleetMachine, a: FleetAgent) => void;
  onOpenWallet?: (m: FleetMachine, a: FleetAgent) => void;
  onEditSettings?: (m: FleetMachine, a: FleetAgent) => void;
  onDuplicate?: (m: FleetMachine, a: FleetAgent) => void;
  onRemove?: (m: FleetMachine, a: FleetAgent) => void;
}

const ICON_BTN_BASE =
  "inline-grid place-items-center w-8 h-8 rounded-lg p-0 cursor-pointer transition-colors";

export function AgentFooter({
  machine, agent, onClear,
  onOpenChat, onOpenWallet, onEditSettings, onDuplicate, onRemove,
}: AgentFooterProps) {
  const color = stateColor[agent.state];
  const canChat = fleetAgentCanChat(agent);
  const fire = (fn?: (m: FleetMachine, a: FleetAgent) => void) =>
    () => { if (fn) fn(machine, agent); };

  return (
    <div
      className="relative mt-4 grid items-center"
      style={{
        gridTemplateColumns: "auto minmax(0,1fr) auto", gap: 18,
        padding: "14px 18px", borderRadius: 12,
        border: "1px solid var(--hex-honey-border)",
        background: "linear-gradient(180deg, rgba(255,212,90,0.10), transparent 60%), rgba(16,20,29,0.78)",
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <CloseIconButton
            onClick={onClear}
            aria-label="Back to machine"
            className="absolute grid place-items-center"
            style={{
              top: 8, right: 8,
              background: "transparent", color: "var(--muted)", cursor: "pointer",
            }}
          />
        </TooltipTrigger>
        <TooltipContent>Back to machine</TooltipContent>
      </Tooltip>

      <HexTile size={52} tone="honey"><BeeIcon role={agent.beeRole === "queen" ? "queen" : "worker"} workerClass={agent.workerClass} size={36} /></HexTile>

      <div className="min-w-0">
        <div className={styles.monoCap} style={{ color: "var(--hex-honey-border)", marginBottom: 2 }}>
          {machine.name} · {agent.runtime} · {agent.role}
        </div>
        <div className="flex items-baseline flex-wrap" style={{ columnGap: 12, rowGap: 2 }}>
          <div className="font-bold" style={{ fontFamily: "var(--f-display)", fontSize: 22, letterSpacing: 0, lineHeight: 1.05 }}>
            {agent.name}
          </div>
          <span className={styles.monoCap} style={{ color, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span className={agent.state === "working" ? `${styles.dot} ${styles.dotLive}` : styles.dot} style={{ color }} />
            {agent.state}
          </span>
          <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--muted)" }}>{agent.since}</span>
        </div>
        <div
          className="mt-1"
          style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--muted)", lineHeight: 1.45 }}
        >
          {agent.task}
        </div>
      </div>

      <div className="flex items-center flex-shrink-0" style={{ gap: 10 }}>
        {canChat && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={fire(onOpenChat)}
                  className="inline-flex items-center uppercase font-bold"
                  style={{
                    gap: 8, padding: "9px 14px", borderRadius: 8, cursor: "pointer",
                    fontFamily: "var(--f-mono)", fontSize: 11, letterSpacing: 0.06,
                    border: "1px solid rgba(94,234,212,0.55)",
                    background: "rgba(45,212,191,0.18)",
                    color: "var(--accent-strong)",
                  }}
                >
                  <MessageSquare size={14} /> Open chat
                </button>
              </TooltipTrigger>
              <TooltipContent>Open chat with this agent</TooltipContent>
            </Tooltip>

            <span aria-hidden style={{ width: 1, height: 20, background: "rgba(148,163,184,0.16)" }} />
          </>
        )}

        <div role="group" aria-label="Agent actions" className="inline-flex" style={{ gap: 4 }}>
          {[
            { id: "wallet",   label: "Wallet & limits", Icon: Wallet,    onClick: fire(onOpenWallet) },
            { id: "edit",     label: "Edit settings",   Icon: Settings2, onClick: fire(onEditSettings) },
            { id: "dup",      label: "Duplicate",       Icon: Copy,      onClick: fire(onDuplicate) },
            { id: "remove",   label: "Remove agent",    Icon: Trash2,    onClick: fire(onRemove), danger: true },
          ].map(({ id, label, Icon, onClick, danger }) => (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <button
                  onClick={onClick}
                  aria-label={label}
                  className={ICON_BTN_BASE}
                  style={{
                    border: danger
                      ? "1px solid rgba(251,113,133,0.30)"
                      : "1px solid rgba(148,163,184,0.22)",
                    background: "rgba(15,23,42,0.6)",
                    color: danger ? "#fecdd3" : "var(--foreground)",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget;
                    el.style.background = danger ? "rgba(251,113,133,0.14)" : "rgba(45,212,191,0.10)";
                    el.style.borderColor = danger ? "rgba(251,113,133,0.50)" : "rgba(94,234,212,0.42)";
                    el.style.color = danger ? "var(--danger)" : "var(--accent-strong)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget;
                    el.style.background = "rgba(15,23,42,0.6)";
                    el.style.borderColor = danger ? "rgba(251,113,133,0.30)" : "rgba(148,163,184,0.22)";
                    el.style.color = danger ? "#fecdd3" : "var(--foreground)";
                  }}
                >
                  <Icon size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </div>
  );
}
