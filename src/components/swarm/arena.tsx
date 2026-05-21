// src/components/swarm/arena.tsx
"use client";

import * as React from "react";
import { BeeIcon } from "./bee-icon";
import { HexTile } from "./hex-tile";
import type { SwarmAgent, SwarmDecision, SwarmRun } from "./swarm-data";
import styles from "./swarm-tokens.module.css";

interface ArenaProps {
  run: SwarmRun;
  agents: SwarmAgent[];
  decisions: SwarmDecision[];
}

const FACTION_COLOR: Record<SwarmAgent["faction"], string> = {
  MM:   "var(--hex-honey-border)",
  TKR:  "#fecdd3",
  INFO: "var(--hex-active-border)",
  OPS:  "var(--muted)",
};

/**
 * Orbital theater — each agent dot orbits one of four faction rings
 * (OPS, INFO, TKR, MM). Positions animate via refs (no React rerenders).
 */
export function Arena({ run, agents, decisions }: ArenaProps) {
  const W = 540, H = 540, cx = W / 2, cy = H / 2;
  const dotRefs = React.useRef<Array<SVGGElement | null>>([]);

  React.useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const ringFor: Record<SwarmAgent["faction"], number> =
      { OPS: 70, INFO: 100, TKR: 130, MM: 160 };
    const speedFor: Record<SwarmAgent["faction"], number> =
      { OPS: 0.10, INFO: 0.50, TKR: 0.32, MM: 0.18 };
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      for (let i = 0; i < agents.length; i++) {
        const a = agents[i];
        const peers = agents.filter((x) => x.faction === a.faction).length || 1;
        const phase = (i * (2 * Math.PI / peers));
        const angle = t * speedFor[a.faction] + phase + i * 0.07;
        const x = cx + Math.cos(angle) * ringFor[a.faction];
        const y = cy + Math.sin(angle) * ringFor[a.faction];
        const el = dotRefs.current[i];
        if (el) el.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [agents, cx, cy]);

  return (
    <div className={styles.arenaFrame}>
      <div className={styles.arenaOrb} style={{ maxWidth: W }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" aria-hidden className="absolute inset-0">
        <defs>
          <radialGradient id="swarmArenaGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"  stopColor="rgba(255,212,90,0.30)" />
            <stop offset="55%" stopColor="rgba(45,212,191,0.10)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <pattern id="arenaHex" width="36" height="42" patternUnits="userSpaceOnUse">
            <polygon points="18,1 35,11 35,31 18,41 1,31 1,11"
              fill="none" stroke="rgba(94,234,212,0.18)" strokeWidth={0.5} />
          </pattern>
        </defs>
        <circle cx={cx} cy={cy} r={260} fill="url(#swarmArenaGlow)" />
        <circle cx={cx} cy={cy} r={250} fill="url(#arenaHex)" opacity={0.6} />
        {[70, 100, 130, 160].map((r) => (
          <circle key={r} cx={cx} cy={cy} r={r}
            fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth={0.6} strokeDasharray="2 4" />
        ))}
        {[
          { r: 70,  label: "OPS",  c: "var(--muted)"          },
          { r: 100, label: "INFO", c: "var(--hex-active-border)" },
          { r: 130, label: "TKR",  c: "#fecdd3"               },
          { r: 160, label: "MM",   c: "var(--hex-honey-border)" },
        ].map(({ r, label, c }) => (
          <text key={label} x={cx + r + 6} y={cy + 3}
            style={{ font: "700 9px var(--f-mono)", fill: c, letterSpacing: 0.12, textTransform: "uppercase" }}>
            {label}
          </text>
        ))}
        {agents.map((a, i) => (
          <g key={a.id} ref={(el) => { dotRefs.current[i] = el; }}>
            <circle r={6} fill={FACTION_COLOR[a.faction]} opacity={0.22} />
            <circle r={3} fill={FACTION_COLOR[a.faction]} />
          </g>
        ))}
      </svg>

      <div className="absolute" style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)", pointerEvents: "none" }}>
        <HexTile size={108} tone="honey">
          <div className="grid place-items-center gap-px text-center" style={{ padding: "0 10px" }}>
            <BeeIcon role="queen" size={26} />
            <strong className="font-bold" style={{
              fontFamily: "var(--f-display)", fontSize: 13, color: "var(--foreground)", lineHeight: 1.1,
            }}>{run.template}</strong>
            <span className={styles.monoCap} style={{ color: "var(--muted)" }}>
              {run.currentRound}/{run.rounds}
            </span>
          </div>
        </HexTile>
      </div>
      </div>

      <div className={styles.decisionRail}>
        <div className={styles.monoCap} style={{ color: "var(--muted)", marginBottom: 4 }}>
          <span className={`${styles.dot} ${styles.dotLive}`} style={{ color: "var(--accent)" }} />
          &nbsp; live decisions
        </div>
        {decisions.map((d, i) => {
          const c = FACTION_COLOR[d.role];
          return (
            <div key={i} style={{
              padding: "7px 9px", borderRadius: 7,
              border: `1px solid color-mix(in srgb, ${c} 28%, rgba(148,163,184,0.16))`,
              background: `color-mix(in srgb, ${c} 8%, var(--panel-bg-soft))`,
            }}>
              <div className="flex items-baseline justify-between" style={{ marginBottom: 2 }}>
                <span style={{
                  fontFamily: "var(--f-mono)", fontSize: 10, fontWeight: 700,
                  letterSpacing: 0.08, textTransform: "uppercase", color: c,
                }}>{d.action}</span>
                <span style={{ fontFamily: "var(--f-mono)", fontSize: 9, color: "var(--muted)" }}>{d.who}</span>
              </div>
              <div style={{
                fontFamily: "var(--f-mono)", fontSize: 10.5, color: "var(--foreground)",
                lineHeight: 1.45, wordBreak: "break-word", overflowWrap: "anywhere",
              }}>{d.detail}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
