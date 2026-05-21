// src/components/fleet/list-view.tsx
"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Monitor } from "lucide-react";
import { BeeIcon } from "./bee-icon";
import { HexTile } from "./hex-tile";
import { type AgentState, type FleetAgent, type FleetMachine } from "./fleet-data";
import styles from "./fleet-tokens.module.css";

interface ListViewProps {
  machines: FleetMachine[];
  selected: string;
  selectedAgentId: string | null;
  onSelectMachine: (id: string) => void;
  onSelectAgent: (m: FleetMachine, a: FleetAgent) => void;
  onAddAgent: (m: FleetMachine) => void;
}

const STATE_COLOR: Record<AgentState, string> = {
  working:   "var(--accent-strong)",
  ready:     "var(--muted)",
  scheduled: "#fde68a",
  setup:     "#fde68a",
  failed:    "var(--danger)",
};

const STATE_TONE = (s: AgentState) =>
  s === "working" ? "active" :
  s === "failed" ? "danger" :
  s === "scheduled" || s === "setup" ? "honey" : "default";

const versionPill = (v: FleetMachine["versionState"]) => {
  if (v === "stale")        return { label: "stale",  color: "#fde68a", bg: "rgba(255,212,90,0.14)", border: "rgba(255,212,90,0.42)" };
  if (v === "needs-setup")  return { label: "setup",  color: "#fde68a", bg: "rgba(255,212,90,0.14)", border: "rgba(255,212,90,0.42)" };
  return                          { label: "current", color: "var(--accent-strong)", bg: "rgba(45,212,191,0.10)", border: "rgba(94,234,212,0.32)" };
};

export function ListView({
  machines,
  selected, selectedAgentId,
  onSelectMachine, onSelectAgent, onAddAgent,
}: ListViewProps) {
  return (
    <div className="w-full h-full overflow-auto px-5 py-3">
      <div className="rounded-xl overflow-hidden bg-[rgba(16,20,29,0.78)]"
        style={{ border: "1px solid rgba(148,163,184,0.16)" }}>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr style={{ background: "rgba(15,23,42,0.6)", borderBottom: "1px solid rgba(148,163,184,0.16)" }}>
              {["Machine", "Kind · Location", "Agents", "Tailnet", "Uptime", "Build"].map((h) => (
                <th key={h}
                  className="px-4 py-2.5 text-left uppercase"
                  style={{ fontFamily: "var(--f-mono)", fontSize: 10, fontWeight: 700,
                           letterSpacing: 0.08, color: "var(--muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {machines.map((m) => {
              const isMSel = selected === m.id && !selectedAgentId;
              const v = versionPill(m.versionState);
              return (
                <tbody key={m.id} className="contents">
                  <tr
                    onClick={() => onSelectMachine(m.id)}
                    className="cursor-pointer"
                    style={{
                      background: isMSel ? "rgba(255,212,90,0.08)" : "transparent",
                      borderTop: "1px solid rgba(148,163,184,0.16)",
                    }}
                  >
                    <td className="px-4 py-2.5">
                      <div className={styles.listEntity}>
                        <HexTile className={styles.listAvatarHex} size={26} tone={isMSel ? "honey" : "default"}>
                          <Monitor
                            aria-hidden="true"
                            size={14}
                            style={{
                              color: m.versionState === "needs-setup" && !isMSel
                                ? "var(--muted)"
                                : "var(--accent-strong)",
                            }}
                          />
                        </HexTile>
                        <div className={styles.listEntityText}>
                          <div className="font-semibold"
                            style={{ fontFamily: "var(--f-display)", fontSize: 13,
                                     color: isMSel ? "var(--hex-honey-border)" : "var(--foreground)" }}>
                            {m.name}
                          </div>
                          <div style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: "var(--muted)" }}>
                            {m.os}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5" style={{ fontFamily: "var(--f-mono)", fontSize: 11 }}>
                      <div style={{ color: "var(--foreground)" }}>{m.kind} · {m.role}</div>
                      <div style={{ color: "var(--muted)" }}>{m.city}</div>
                    </td>
                    <td className="px-4 py-2.5" style={{ fontFamily: "var(--f-mono)", fontSize: 12 }}>
                      <span style={{ color: "var(--accent-strong)" }}>{m.agents.length}</span>
                      <span className="ml-1.5" style={{ color: "var(--muted)", fontSize: 10 }}>
                        {m.agents.filter((a) => a.state === "working").length} active
                      </span>
                    </td>
                    <td className="px-4 py-2.5" style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--muted)" }}>
                      {m.tailnet}
                      <div style={{ fontSize: 10 }}>{m.ip} · {m.ping}ms</div>
                    </td>
                    <td className="px-4 py-2.5" style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--foreground)" }}>
                      {m.uptime}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className="inline-flex items-center gap-1.5 uppercase"
                        style={{
                          padding: "3px 8px", borderRadius: 4,
                          background: v.bg, border: `1px solid ${v.border}`, color: v.color,
                          fontFamily: "var(--f-mono)", fontSize: 10, fontWeight: 700, letterSpacing: 0.08,
                        }}
                      >
                        <span className={styles.dot} style={{ color: v.color, width: 5, height: 5 }} />
                        {m.version === "—" ? "needs setup" : `${m.version} · ${v.label}`}
                      </span>
                    </td>
                  </tr>

                  {m.agents.map((a) => {
                    const isASel = selected === m.id && selectedAgentId === a.id;
                    return (
                      <tr
                        key={a.id}
                        onClick={(e) => { e.stopPropagation(); onSelectAgent(m, a); }}
                        className="cursor-pointer"
                        style={{ background: isASel ? "rgba(255,212,90,0.10)" : "transparent" }}
                      >
                        <td className="py-1.5" style={{ paddingLeft: 50, paddingRight: 16 }}>
                          <div className={`${styles.listEntity} ${styles.listAgentEntity}`}>
                            <HexTile className={styles.listAvatarHex} size={28} tone={STATE_TONE(a.state)}>
                              <BeeIcon
                                role={a.beeRole === "queen" ? "queen" : "worker"}
                                workerClass={a.workerClass}
                                size={21}
                                dim={a.state === "ready" && !isASel}
                                className={styles.listBeeIcon}
                              />
                            </HexTile>
                            <div className={styles.listEntityText}>
                              <div className="font-semibold"
                                style={{ fontFamily: "var(--f-display)", fontSize: 12,
                                         color: isASel ? "var(--hex-honey-border)" : "var(--foreground)" }}>
                                {a.name}
                              </div>
                              <div style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: "var(--muted)" }}>
                                {a.runtime} · {a.role}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td colSpan={2} className="px-4 py-1.5"
                          style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--muted)" }}>
                          <span>{a.task}</span>
                        </td>
                        <td className="px-4 py-1.5" style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: "var(--muted)" }}>{a.wallet}</td>
                        <td className="px-4 py-1.5" style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: "var(--muted)" }}>{a.since}</td>
                        <td className="px-4 py-1.5">
                          <span
                            className="inline-flex items-center gap-1.5 uppercase"
                            style={{
                              padding: "3px 8px", borderRadius: 4,
                              background: `color-mix(in srgb, ${STATE_COLOR[a.state]} 14%, transparent)`,
                              color: STATE_COLOR[a.state],
                              border: `1px solid color-mix(in srgb, ${STATE_COLOR[a.state]} 38%, transparent)`,
                              fontFamily: "var(--f-mono)", fontSize: 10, fontWeight: 700, letterSpacing: 0.08,
                            }}
                          >
                            <span
                              className={a.state === "working" ? `${styles.dot} ${styles.dotLive}` : styles.dot}
                              style={{ color: STATE_COLOR[a.state], width: 5, height: 5 }}
                            />
                            {a.state}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  <tr>
                    <td colSpan={6} className="py-1.5" style={{ paddingLeft: 50, paddingRight: 16, paddingBottom: 10 }}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => { e.stopPropagation(); onAddAgent(m); }}
                            className="inline-flex items-center gap-2 uppercase"
                            style={{
                              padding: "5px 11px", borderRadius: 6,
                              background: "transparent",
                              border: "1px dashed var(--hex-add-stroke)",
                              color: "var(--accent-strong)",
                              fontFamily: "var(--f-mono)", fontSize: 10, fontWeight: 700, letterSpacing: 0.08,
                            }}
                          >
                            ＋ add agent
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Add agent to {m.name}</TooltipContent>
                      </Tooltip>
                    </td>
                  </tr>
                </tbody>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
