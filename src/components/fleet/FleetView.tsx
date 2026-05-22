// src/components/fleet/FleetView.tsx
"use client";

import * as React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BeeIcon } from "./bee-icon";
import { HexTile } from "./hex-tile";
import { ListView } from "./list-view";
import { MapView } from "./map-view";
import { NetworkGraph } from "./network-graph";
import { Roster } from "./roster";
import {
  ALERTS,
  MACHINES,
  TASKS,
  TICKER,
  FLEET_EDGES,
  type FleetAlert,
  type FleetAgent,
  type FleetMachine,
  type FleetTask,
} from "./fleet-data";
import styles from "./fleet-tokens.module.css";

type ViewMode = "graph" | "map" | "list";

interface FleetViewProps {
  machines?: FleetMachine[];
  tasks?: FleetTask[];
  alerts?: FleetAlert[];
  ticker?: string[];
  edges?: Array<[string, string]>;
  checkedLabel?: string;
  tailnetLabel?: string;
  /** Optional override hooks so the parent app can wire actions to real APIs. */
  onAddAgent?: (m: FleetMachine) => void;
  onAddMachine?: () => void;
  onOpenChat?: (m: FleetMachine, a: FleetAgent) => void;
  onOpenWallet?: (m: FleetMachine, a: FleetAgent) => void;
  onEditSettings?: (m: FleetMachine, a: FleetAgent) => void;
  onDuplicate?: (m: FleetMachine, a: FleetAgent) => void;
  onRemove?: (m: FleetMachine, a: FleetAgent) => void;
}

export function FleetView({
  machines = MACHINES,
  tasks = TASKS,
  alerts = ALERTS,
  ticker = TICKER,
  edges = FLEET_EDGES,
  checkedLabel,
  tailnetLabel = "tailnet private",
  onAddAgent,
  onAddMachine,
  onOpenChat,
  onOpenWallet,
  onEditSettings,
  onDuplicate,
  onRemove,
}: FleetViewProps = {}) {
  const [selected, setSelected] = React.useState<string>(() => machines[0]?.id ?? "");
  const [selectedAgentId, setSelectedAgentId] = React.useState<string | null>(null);
  const [view, setView] = React.useState<ViewMode>("graph");
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set(["nimbus"]));
  const [dispatchIdx, setDispatchIdx] = React.useState(0);
  const [addToast, setAddToast] = React.useState<string | null>(null);

  React.useEffect(() => {
    const t = setInterval(() => setDispatchIdx((i) => ticker.length ? (i + 1) % ticker.length : 0), 2200);
    return () => clearInterval(t);
  }, [ticker.length]);

  React.useEffect(() => {
    if (!addToast) return;
    const t = setTimeout(() => setAddToast(null), 2200);
    return () => clearTimeout(t);
  }, [addToast]);

  const selectedMachineId = machines.some((machine) => machine.id === selected)
    ? selected
    : machines[0]?.id ?? "";

  const handleSelectMachine = React.useCallback((id: string) => {
    setSelected(id);
    setSelectedAgentId(null);
  }, []);
  const handleSelectAgent = React.useCallback((m: FleetMachine, a: FleetAgent) => {
    setSelected(m.id);
    setSelectedAgentId(a.id);
    setExpanded((prev) => (prev.has(m.id) ? prev : new Set(prev).add(m.id)));
  }, []);
  const handleAddAgent = React.useCallback((m: FleetMachine) => {
    setSelected(m.id);
    setSelectedAgentId(null);
    setAddToast(m.name);
    onAddAgent?.(m);
  }, [onAddAgent]);
  const toggleExpand = React.useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const totalAgents = machines.reduce((n, m) => n + m.agents.length, 0);
  const working = machines.reduce(
    (n, m) => n + m.agents.filter((a) => a.state === "working").length,
    0,
  );
  const highPriorityAlerts = alerts.filter((alert) => (
    alert.priority === "urgent" || alert.priority === "high" || alert.tone === "danger"
  ));
  const headlineAlert = highPriorityAlerts[0] ?? null;
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric", year: "numeric",
  });

  return (
    <TooltipProvider delayDuration={120}>
      <div
        className={`${styles.root} relative overflow-hidden`}
        style={{
          width: "100%", height: "100%",
          background: "var(--background)", color: "var(--foreground)",
          fontFamily: "var(--f-display), var(--font-sans, system-ui)",
          display: "grid", gridTemplateRows: "auto 1fr",
        }}
      >
        {/* Decorative backdrop — radial honey/cyan glow + hex texture */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 38%, rgba(255,212,90,0.10), transparent 50%)," +
              "radial-gradient(circle at 80% 80%, rgba(45,212,191,0.08), transparent 50%)",
          }}
        />
        <svg
          aria-hidden
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ opacity: 0.1 }}
        >
          <defs>
            <pattern id="fleetGrid" width={48} height={55} patternUnits="userSpaceOnUse">
              <polygon
                points="24,1 47,14 47,40 24,53 1,40 1,14"
                fill="none"
                stroke="rgba(255,212,90,0.4)"
                strokeWidth={0.5}
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#fleetGrid)" />
        </svg>

        {/* ===== MASTHEAD ===== */}
        <header
          className="relative z-10"
          style={{ padding: "22px 36px 16px", borderBottom: "1px solid rgba(148,163,184,0.16)" }}
        >
          <div className={`${styles.topbar} grid items-center`}>
            <div className="flex items-center" style={{ gap: 14 }}>
              <HexTile size={42} tone="honey"><BeeIcon role="queen" size={32} /></HexTile>
              <div>
                <div className={styles.monoCap} style={{ color: "var(--hex-honey-border)" }}>
                  Hivemind Dispatch · Fleet
                </div>
                <div className="font-bold" style={{ fontFamily: "var(--f-display)", fontSize: 18, letterSpacing: 0 }}>
                  The Swarm
                </div>
              </div>
            </div>
            <div
              className="text-center uppercase"
              style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--muted)", letterSpacing: 0.1 }}
            >
              {checkedLabel ?? today} · <span style={{ color: "var(--accent-strong)" }}>{tailnetLabel}</span>
            </div>
            <div /> {/* reserved for the host app's user menu */}
          </div>

          <div className={`${styles.heroRow} mt-4 grid items-end`}>
            <h1
              className="m-0 font-bold"
              style={{
                fontFamily: "var(--f-display)",
                fontSize: "clamp(40px, 5.5vw, 80px)",
                lineHeight: 0.9,
                letterSpacing: 0,
              }}
            >
              The hive is{" "}
              <span style={{ fontStyle: "italic", color: "var(--hex-honey-border)", fontWeight: 500 }}>
                humming.
              </span>
            </h1>
            <div className="flex" style={{ gap: 18, paddingBottom: 6 }}>
              <BigStat n={machines.length} label="machines" />
              <BigStat n={totalAgents} label="agents" />
              <BigStat n={working} label="working" tone="cyan" />
              <BigStat
                n={highPriorityAlerts.length}
                label="urgent"
                tone="danger"
              />
            </div>
          </div>
        </header>

        {/* ===== BODY ===== */}
        <div
          className={`${styles.layout} relative z-10 grid`}
          style={{ minHeight: 0 }}
        >
          {/* LEFT — roster */}
          <aside
            className={`${styles.sideRail} flex flex-col overflow-auto`}
            style={{
              borderRight: "1px solid rgba(148,163,184,0.16)",
              gap: 16,
            }}
          >
            <section>
              <div className={styles.monoCap} style={{ color: "var(--muted)", marginBottom: 10 }}>
                The roster
              </div>
              <Roster
                selected={selectedMachineId}
                selectedAgentId={selectedAgentId}
                expanded={expanded}
                machines={machines}
                onSelectMachine={handleSelectMachine}
                onSelectAgent={handleSelectAgent}
                onToggleExpand={toggleExpand}
                onAddAgent={handleAddAgent}
                onOpenChat={onOpenChat}
                onOpenWallet={onOpenWallet}
                onEditSettings={onEditSettings}
                onDuplicate={onDuplicate}
                onRemove={onRemove}
              />
            </section>

            <section>
              <div className={styles.monoCap} style={{ color: "var(--muted)", marginBottom: 10 }}>
                Today&apos;s headline
              </div>
              <div
                className="rounded-xl"
                style={{
                  border: `1px solid ${headlineAlert ? "rgba(251,113,133,0.34)" : "rgba(148,163,184,0.16)"}`,
                  padding: 14,
                  background: headlineAlert
                    ? "linear-gradient(180deg, rgba(251,113,133,0.10), transparent)"
                    : "rgba(16,20,29,0.48)",
                }}
              >
                <div className={styles.monoCap} style={{ color: headlineAlert ? "var(--danger)" : "var(--muted)", marginBottom: 6 }}>
                  {headlineAlert ? `${headlineAlert.priority === "urgent" ? "URGENT" : "HIGH"} · ${headlineAlert.since}` : "CLEAR · NOW"}
                </div>
                <div className="font-bold mb-1.5" style={{ fontFamily: "var(--f-display)", fontSize: 17, lineHeight: 1.2 }}>
                  {headlineAlert?.title ?? "No high-priority alerts."}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
                  {headlineAlert
                    ? headlineAlert.text
                    : "The alerts feed is quiet. New urgent or high-priority agent notifications will appear here."}
                </div>
              </div>
            </section>
          </aside>

          {/* CENTER — view */}
          <section
            className={`${styles.stageColumn} flex flex-col overflow-hidden`}
            style={{ minHeight: 0 }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
              <div className={styles.monoCap} style={{ color: "var(--accent-strong)" }}>
                <span className={`${styles.dot} ${styles.dotLive}`} style={{ color: "var(--accent)" }} />
                &nbsp; live constellation
              </div>
              <div className="flex" style={{ gap: 6 }}>
                {(["graph", "map", "list"] as ViewMode[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    aria-pressed={view === v}
                    className="uppercase cursor-pointer"
                    style={{
                      fontFamily: "var(--f-mono)", fontSize: 10,
                      padding: "5px 10px", borderRadius: 9999,
                      background: view === v ? "rgba(45,212,191,0.12)" : "transparent",
                      color: view === v ? "var(--foreground)" : "var(--muted)",
                      border: `1px solid ${view === v ? "rgba(94,234,212,0.42)" : "rgba(148,163,184,0.18)"}`,
                      letterSpacing: 0.1,
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div
              className={`${styles.stageFrame} relative grid overflow-hidden rounded-2xl`}
              style={{
                border: "1px solid rgba(148,163,184,0.16)",
                background:
                  "radial-gradient(ellipse at center, rgba(255,212,90,0.06), transparent 60%), rgba(16,20,29,0.78)",
                placeItems: view === "list" ? "stretch" : "center",
              }}
            >
              {view === "graph" && (
                <NetworkGraph
                  selected={selectedMachineId}
                  selectedAgentId={selectedAgentId}
                  machines={machines}
                  edges={edges}
                  onSelectMachine={handleSelectMachine}
                  onSelectAgent={handleSelectAgent}
                  onAddAgent={handleAddAgent}
                  onAddMachine={onAddMachine}
                />
              )}
              {view === "map" && (
                <MapView
                  selected={selectedMachineId}
                  selectedAgentId={selectedAgentId}
                  machines={machines}
                  edges={edges}
                  onSelectMachine={handleSelectMachine}
                  onSelectAgent={handleSelectAgent}
                  onAddAgent={handleAddAgent}
                  width={840} height={840}
                />
              )}
              {view === "list" && (
                <ListView
                  selected={selectedMachineId}
                  selectedAgentId={selectedAgentId}
                  machines={machines}
                  onSelectMachine={handleSelectMachine}
                  onSelectAgent={handleSelectAgent}
                  onAddAgent={handleAddAgent}
                  onOpenChat={onOpenChat}
                  onOpenWallet={onOpenWallet}
                  onEditSettings={onEditSettings}
                  onDuplicate={onDuplicate}
                  onRemove={onRemove}
                />
              )}
            </div>

          </section>

          {/* RIGHT — dispatch */}
          <aside
            className={`${styles.dispatchRail} flex flex-col overflow-auto`}
            style={{
              borderLeft: "1px solid rgba(148,163,184,0.16)",
              gap: 14,
            }}
          >
            <section>
              <div className={styles.monoCap} style={{ color: "var(--muted)", marginBottom: 10 }}>
                The dispatch · live
              </div>
              <div
                className="rounded-xl"
                style={{
                  padding: 14,
                  border: "1px solid rgba(148,163,184,0.16)",
                  background: "rgba(16,20,29,0.78)",
                }}
              >
                <div
                  key={dispatchIdx}
                  style={{
                    fontFamily: "var(--f-mono)", fontSize: 11.5,
                    color: "var(--foreground)", lineHeight: 1.55,
                    animation: "fleet-fade-up 360ms ease",
                  }}
                >
                  {ticker[dispatchIdx] ?? "Fleet telemetry is quiet right now."}
                </div>
                <div className="flex justify-between" style={{
                  marginTop: 8, fontFamily: "var(--f-mono)", fontSize: 10, color: "var(--muted)",
                }}>
                  <span>{String(Math.min(dispatchIdx + 1, ticker.length || 1)).padStart(2, "0")} / {ticker.length || 1}</span>
                  <span>
                    <span className={`${styles.dot} ${styles.dotLive}`} style={{ color: "var(--accent)" }} />
                    &nbsp; streaming
                  </span>
                </div>
              </div>
            </section>

            <section className="grid" style={{ gap: 10 }}>
              <div className={styles.monoCap} style={{ color: "var(--muted)" }}>
                Stories from the field
              </div>
              {machines.flatMap((m) =>
                m.agents
                  .filter((a) => a.state === "working" || a.state === "failed")
                  .map((a) => ({ ...a, host: m.name, _m: m })),
              )
                .slice(0, 4)
                .map((a) => (
                  <article
                    key={`${a._m.id}:${a.id}`}
                    onClick={() => handleSelectAgent(a._m, a)}
                    className="rounded-xl cursor-pointer"
                    style={{
                      padding: 12,
                      border: `1px solid ${a.state === "failed" ? "rgba(251,113,133,0.34)" : "rgba(148,163,184,0.16)"}`,
                      background: "rgba(16,20,29,0.78)",
                    }}
                  >
                    <div className="flex justify-between items-center" style={{ marginBottom: 6 }}>
                      <div
                        className={styles.monoCap}
                        style={{ color: a.state === "failed" ? "var(--danger)" : "var(--accent-strong)" }}
                      >
                        {a.host} · {a.runtime}
                      </div>
                      <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: "var(--muted)" }}>{a.since}</span>
                    </div>
                    <div className="font-semibold" style={{ fontFamily: "var(--f-display)", fontSize: 14, lineHeight: 1.3, marginBottom: 4 }}>
                      {a.name}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>{a.task}</div>
                  </article>
                ))}
            </section>

            <section className="mt-auto">
              <div className={styles.monoCap} style={{ color: "var(--muted)", marginBottom: 8 }}>
                Tomorrow&apos;s brief
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
                {tasks.filter((t) => t.lane === "queue").length} tasks queued ·{" "}
                {tasks.filter((t) => t.state === "scheduled").length} scheduled overnight ·
                brain sync resumes on lattice when wifi stabilizes.
              </div>
            </section>
          </aside>
        </div>

        {/* Add-agent toast */}
        {addToast && (
          <div
            className="absolute"
            style={{
              left: "50%", bottom: 28, transform: "translateX(-50%)",
              zIndex: 20,
              padding: "10px 16px", borderRadius: 9999,
              background: "rgba(16,20,29,0.95)",
              border: "1px solid var(--hex-honey-border)",
              color: "var(--foreground)",
              fontFamily: "var(--f-mono)", fontSize: 12,
              boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
              animation: "fleet-toast-in 240ms ease",
            }}
          >
            ＋ adding agent to <strong style={{ color: "var(--hex-honey-border)" }}>{addToast}</strong> · pick a runtime
          </div>
        )}

        <style jsx global>{`
          @keyframes fleet-fade-up {
            from { opacity: 0; transform: translateY(6px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes fleet-toast-in {
            from { opacity: 0; transform: translate(-50%, 10px); }
            to   { opacity: 1; transform: translate(-50%, 0); }
          }
        `}</style>
      </div>
    </TooltipProvider>
  );
}

function BigStat({ n, label, tone }: { n: number; label: string; tone?: "cyan" | "danger" }) {
  const color =
    tone === "cyan" ? "var(--accent-strong)" :
    tone === "danger" ? "var(--danger)" :
    "var(--foreground)";
  return (
    <div className="text-right">
      <div className="font-bold" style={{ fontFamily: "var(--f-display)", fontSize: 44, color, lineHeight: 1, letterSpacing: 0 }}>
        {n}
      </div>
      <div className={styles.monoCap} style={{ color: "var(--muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}
