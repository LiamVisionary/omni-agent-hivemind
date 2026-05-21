// src/components/swarm/composer.tsx
"use client";

import type { SwarmAgent, SwarmRun, SwarmTemplate, TemplateId } from "./swarm-data";
import styles from "./swarm-tokens.module.css";

interface ComposerProps {
  templates: SwarmTemplate[];
  activeTemplate: TemplateId;
  onPickTemplate: (id: TemplateId) => void;
  run: SwarmRun | null;
  agents: SwarmAgent[];
}

function Stat({ k, v, c }: { k: string; v: string | number; c?: string }) {
  return (
    <div style={{
      padding: "8px 10px", borderRadius: 7,
      border: "1px solid rgba(148,163,184,0.16)", background: "var(--panel-bg-soft)",
    }}>
      <div className={styles.monoCap} style={{ color: "var(--muted)" }}>{k}</div>
      <div className="font-bold" style={{
        fontFamily: "var(--f-mono)", fontSize: 13, color: c || "var(--foreground)", marginTop: 2,
      }}>{v}</div>
    </div>
  );
}

export function Composer({ templates, activeTemplate, onPickTemplate, run, agents }: ComposerProps) {
  const active = templates.find((t) => t.id === activeTemplate);

  return (
    <aside className="flex flex-col overflow-auto"
      style={{
        gap: 14, padding: "20px 18px",
        borderLeft: "1px solid rgba(148,163,184,0.16)",
        background: "var(--panel-bg-soft)",
      }}>
      <div>
        <div className={styles.monoCap} style={{ color: "var(--muted)" }}>Template</div>
        <div className="flex justify-between items-baseline">
          <h2 className="font-bold" style={{
            margin: "4px 0 0", fontFamily: "var(--f-display)", fontSize: 20, letterSpacing: -0.3,
          }}>{active ? active.label : "Current run"}</h2>
          <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--hex-active-border)" }}>
            {active?.agents ?? agents.length}◇
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6, lineHeight: 1.5 }}>
          {active?.desc ?? run?.summary ?? "Live MiroShark data appears here when a run is loaded."}
        </div>
      </div>

      {templates.length ? <div className="flex flex-wrap" style={{
        gap: 5, padding: 8, borderRadius: 10,
        border: "1px solid rgba(148,163,184,0.16)", background: "var(--panel-bg-soft)",
      }}>
        {templates.map((t) => {
          const a = activeTemplate === t.id;
          return (
            <button key={t.id} onClick={() => onPickTemplate(t.id)}
              className="uppercase font-bold cursor-pointer"
              style={{
                padding: "5px 9px", borderRadius: 999,
                border: `1px solid ${a ? "var(--hex-honey-border)" : "rgba(148,163,184,0.16)"}`,
                background: a ? "rgba(255,212,90,0.14)" : "transparent",
                color: a ? "var(--hex-honey-border)" : "var(--muted)",
                fontFamily: "var(--f-mono)", fontSize: 10, letterSpacing: 0.06,
              }}>{t.label}</button>
          );
        })}
      </div> : null}

      <section style={{
        display: "grid", gap: 10, padding: "12px 14px", borderRadius: 10,
        border: "1px solid rgba(148,163,184,0.16)", background: "var(--panel-bg-soft)",
      }}>
        <div className={styles.monoCap} style={{ color: "var(--muted)" }}>Run context</div>
        <p style={{ margin: 0, color: "var(--foreground)", fontSize: 12.5, lineHeight: 1.5, overflowWrap: "anywhere" }}>
          {run?.scenario || run?.summary || "No active scenario loaded."}
        </p>
        {run?.tags.length ? (
          <div className="flex flex-wrap" style={{ gap: 5 }}>
            {run.tags.map((tag) => (
              <span key={tag} className="uppercase" style={{
                padding: "3px 7px", borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.16)",
                color: "var(--muted)", fontFamily: "var(--f-mono)", fontSize: 10,
              }}>{tag}</span>
            ))}
          </div>
        ) : null}
      </section>

      <section style={{ display: "grid", gap: 8, marginTop: "auto" }}>
        <div className={styles.monoCap} style={{ color: "var(--muted)" }}>Live telemetry</div>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <Stat k="ROUND"  v={run ? `${run.currentRound}/${run.rounds || "?"}` : "—"} c="var(--hex-active-border)" />
          <Stat k="AGENTS" v={agents.length} />
          <Stat k="SHARPE" v={run?.sharpe != null ? run.sharpe.toFixed(2) : "—"}
            c={run?.sharpe != null && run.sharpe > 1 ? "var(--hex-active-border)" : "var(--foreground)"} />
          <Stat k="PNL"    v={run?.pnl ?? "—"} c="var(--hex-honey-border)" />
          <Stat k="POSTS"  v={run?.posts ?? 0} />
          <Stat k="EVENTS" v={run?.trades ?? 0} />
        </div>
      </section>
    </aside>
  );
}
