// src/components/swarm/runs.tsx
"use client";

import { Plus } from "lucide-react";
import type { SwarmRun } from "./swarm-data";
import styles from "./swarm-tokens.module.css";

const STATE_TONE: Record<SwarmRun["state"], { c: string; bg: string; br: string; dot: string }> = {
  live:   { c: "var(--hex-active-border)", bg: "rgba(45,212,191,0.14)", br: "rgba(94,234,212,0.42)", dot: "var(--accent)" },
  ready:  { c: "var(--hex-honey-border)",  bg: "rgba(255,212,90,0.14)", br: "rgba(255,212,90,0.42)", dot: "var(--hex-honey-border)" },
  done:   { c: "var(--muted)",             bg: "rgba(148,163,184,0.10)",br: "rgba(148,163,184,0.18)",dot: "#86efac" },
  failed: { c: "#fecdd3",                  bg: "rgba(251,113,133,0.12)",br: "rgba(251,113,133,0.42)",dot: "var(--danger)" },
};

interface RunCardProps {
  run: SwarmRun;
  selected: boolean;
  onSelect: () => void;
}

function RunCard({ run, selected, onSelect }: RunCardProps) {
  const t = STATE_TONE[run.state];
  const pct = run.rounds ? Math.round((run.currentRound / run.rounds) * 100) : 0;
  return (
    <button
      onClick={onSelect}
      className="text-left cursor-pointer rounded-xl"
      style={{
        display: "grid", gap: 8, padding: 12,
        border: `1px solid ${selected ? "var(--hex-honey-border)" : "rgba(148,163,184,0.16)"}`,
        background: selected
          ? "linear-gradient(180deg, rgba(255,212,90,0.10), var(--panel-bg))"
          : "var(--panel-card-grad)",
        backdropFilter: "blur(8px) saturate(140%)",
        WebkitBackdropFilter: "blur(8px) saturate(140%)",
        color: "var(--foreground)",
        transition: "transform 160ms ease, border-color 160ms ease",
      }}
    >
      <div className="flex justify-between items-center" style={{ gap: 8 }}>
        <span className="inline-flex items-center gap-1.5 uppercase"
          style={{
            padding: "2px 8px", borderRadius: 4,
            border: `1px solid ${t.br}`, background: t.bg, color: t.c,
            fontFamily: "var(--f-mono)", fontSize: 10, fontWeight: 700, letterSpacing: 0.08,
          }}>
          <span className={run.state === "live" ? `${styles.dot} ${styles.dotLive}` : styles.dot}
            style={{ color: t.dot, width: 5, height: 5 }} />
          {run.state}
        </span>
        <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: "var(--muted)" }}>{run.started}</span>
      </div>
      <div className="font-bold leading-tight"
        style={{
          fontFamily: "var(--f-display)", fontSize: 13, letterSpacing: -0.2,
          color: "var(--foreground)", wordBreak: "break-word", overflowWrap: "anywhere",
        }}>{run.title}</div>
      <div className="flex" style={{ gap: 10, fontFamily: "var(--f-mono)", fontSize: 10, color: "var(--muted)" }}>
        <span>◇ {run.agents}</span>
        <span>⌁ {run.trades}</span>
        <span>✎ {run.posts}</span>
        {run.sharpe != null && <span style={{ color: "var(--hex-active-border)" }}>SR {run.sharpe.toFixed(2)}</span>}
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: run.state === "failed"
            ? "linear-gradient(90deg, var(--danger), rgba(251,113,133,0.32))"
            : run.state === "done"
              ? "linear-gradient(90deg, #86efac, rgba(134,239,172,0.32))"
              : "linear-gradient(90deg, var(--accent), var(--hex-honey-border))",
          transition: "width 320ms ease",
        }} />
      </div>
    </button>
  );
}

interface RunsProps {
  runs: SwarmRun[];
  selectedId: string;
  loading?: boolean;
  onSelect: (id: string) => void;
  onLaunch?: () => void;
}

function RunSkeleton({ index }: { index: number }) {
  return (
    <div className={styles.runSkeleton} aria-hidden="true" style={{ animationDelay: `${index * 90}ms` }}>
      <div className={styles.runSkeletonTop}>
        <span />
        <span />
      </div>
      <strong />
      <div className={styles.runSkeletonMeta}>
        <span />
        <span />
        <span />
      </div>
      <i />
    </div>
  );
}

export function Runs({ runs, selectedId, loading = false, onSelect, onLaunch }: RunsProps) {
  return (
    <aside className="flex flex-col overflow-hidden"
      aria-busy={loading || undefined}
      style={{
        gap: 14, padding: "20px 18px",
        borderRight: "1px solid rgba(148,163,184,0.16)",
        background: "var(--panel-bg-soft)",
      }}>
      <div>
        <div className={styles.monoCap} style={{ color: "var(--muted)" }}>Past simulations</div>
        <div className="flex justify-between items-baseline">
          <h2 className="font-bold" style={{
            margin: "4px 0 0", fontFamily: "var(--f-display)", fontSize: 22, letterSpacing: -0.4,
          }}>The shelf</h2>
          <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--hex-active-border)" }}>
            {loading && !runs.length ? "loading" : `${runs.length} jars`}
          </span>
        </div>
      </div>

      <button onClick={onLaunch}
        className={`${styles.newSimulationButton} inline-flex items-center justify-center uppercase font-bold cursor-pointer`}
        style={{
          gap: 8, padding: "11px 14px", borderRadius: 8,
          border: "1px solid rgba(255,212,90,0.55)",
          background: "rgba(255,212,90,0.18)", color: "var(--hex-honey-border)",
          fontFamily: "var(--f-mono)", fontSize: 12, letterSpacing: 0.06,
        }}>
        <Plus size={14} /> new simulation
      </button>

      <div className="flex flex-col overflow-auto"
        style={{ flex: 1, minHeight: 0, gap: 8 }}>
        {loading ? (
          <div className={styles.archiveLoadingNote}>
            <span className={`${styles.dot} ${styles.dotLive}`} />
            Reading saved simulations
          </div>
        ) : null}
        {loading && !runs.length ? (
          Array.from({ length: 4 }).map((_, index) => <RunSkeleton key={index} index={index} />)
        ) : null}
        {runs.map((r) => (
          <RunCard key={r.id} run={r} selected={r.id === selectedId} onSelect={() => onSelect(r.id)} />
        ))}
      </div>
    </aside>
  );
}
