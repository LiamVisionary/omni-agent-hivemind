// src/components/scheduler/timeline.tsx
"use client";

import { BeeIcon } from "./bee-icon";
import { minutesFromLabel, type SchedulerJob } from "./scheduler-data";

interface TimelineProps {
  jobs: SchedulerJob[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const HOURS = 24;
const SLOT_MIN = 15;
const COL_W = 280;
const COL_GAP = 12;

function PausedGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" aria-hidden style={{ color: "var(--muted)" }}>
      <path d="M8 5v14M16 5v14" />
    </svg>
  );
}

export function Timeline({ jobs, selectedId, onSelect }: TimelineProps) {
  const ticks = Array.from({ length: HOURS + 1 }, (_, i) => i);

  type Pin = { job: SchedulerJob; t: number; mins: number; isPaused: boolean; _col?: number; _slotT?: number };
  const placed: Pin[] = jobs
    .map((j) => {
      const m = minutesFromLabel(j.nextRun);
      if (m == null) return null;
      const t = Math.min(Math.max(m / (HOURS * 60), 0), 1);
      return { job: j, t, mins: m, isPaused: !j.enabled || j.nextRun === "paused" };
    })
    .filter((x): x is Pin => x != null);

  const slotKey = (m: number) => Math.round(m / SLOT_MIN);
  const slots = new Map<number, Pin[]>();
  for (const p of placed) {
    const k = slotKey(p.mins);
    if (!slots.has(k)) slots.set(k, []);
    slots.get(k)!.push(p);
  }

  const bucketed: Pin[] = [];
  let maxCols = 1;
  for (const [k, arr] of slots) {
    arr.forEach((p, i) => {
      p._col = i;
      p._slotT = (k * SLOT_MIN) / (HOURS * 60);
      bucketed.push(p);
    });
    if (arr.length > maxCols) maxCols = arr.length;
  }
  // Anti-collision within a column (rare but possible)
  const byCol: Record<number, Pin[]> = {};
  for (const p of bucketed) (byCol[p._col!] ||= []).push(p);
  const MIN_GAP = 0.045;
  for (const col of Object.values(byCol)) {
    col.sort((a, b) => a._slotT! - b._slotT!);
    for (let i = 1; i < col.length; i++) {
      if (col[i]._slotT! - col[i - 1]._slotT! < MIN_GAP) {
        col[i]._slotT = col[i - 1]._slotT! + MIN_GAP;
      }
    }
  }
  const railWidth = maxCols * COL_W + (maxCols - 1) * COL_GAP;

  return (
    <div className="relative grid overflow-hidden rounded-2xl"
      style={{
        gridTemplateColumns: "64px 1fr", minHeight: 540, height: "100%",
        border: "1px solid rgba(148,163,184,0.16)",
        background: "var(--panel-grad)",
        backdropFilter: "blur(10px) saturate(140%)",
        WebkitBackdropFilter: "blur(10px) saturate(140%)",
      }}>
      {/* Time axis */}
      <div className="relative" style={{ borderRight: "1px dashed rgba(148,163,184,0.16)", padding: "8px 0" }}>
        {ticks.map((h) => {
          const isMajor = h % 6 === 0;
          return (
            <div key={h} className="flex items-center justify-end" style={{
              position: "absolute", top: `${(h / HOURS) * 100}%`, left: 0, right: 0,
              transform: "translateY(-50%)", gap: 6, paddingRight: 10, height: 18,
            }}>
              <span style={{
                fontFamily: "var(--f-mono)", fontSize: isMajor ? 11 : 9,
                color: isMajor ? "var(--foreground)" : "var(--muted)",
                fontWeight: isMajor ? 700 : 500, letterSpacing: 0.04,
              }}>{h === 0 ? "now" : h === 24 ? "+24h" : `+${h}h`}</span>
              <span style={{
                width: isMajor ? 10 : 5, height: 1,
                background: isMajor ? "rgba(148,163,184,0.32)" : "rgba(148,163,184,0.16)",
              }} />
            </div>
          );
        })}
      </div>

      {/* Rail */}
      <div className="relative overflow-x-auto overflow-y-hidden"
        style={{ padding: "32px 16px 12px 28px" }}>
        <div className="relative" style={{ width: railWidth, minWidth: "100%", height: "100%" }}>
          {ticks.slice(0, -1).map((h) => h % 6 === 0 && (
            <div key={h} style={{
              position: "absolute", left: 0, right: 0,
              top: `${(h / HOURS) * 100}%`, height: `${(6 / HOURS) * 100}%`,
              background: h % 12 === 0 ? "rgba(255,212,90,0.025)" : "rgba(45,212,191,0.02)",
              pointerEvents: "none",
            }} />
          ))}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 0,
            borderTop: "1px dashed var(--accent, #2dd4bf)", zIndex: 2, pointerEvents: "none",
            opacity: 0.5,
          }}>
            <span className="uppercase font-bold" style={{
              position: "absolute", left: 10, top: -10,
              padding: "2px 8px", borderRadius: 999,
              background: "var(--accent, #2dd4bf)", color: "#0a0e16",
              fontFamily: "var(--f-mono)", fontSize: 9, letterSpacing: 0.1,
            }}>now</span>
          </div>

          {bucketed.map(({ job, _col, _slotT, isPaused }) => (
            <button key={job.id}
              onClick={() => onSelect(job.id)}
              aria-pressed={selectedId === job.id}
              className="grid items-center text-left cursor-pointer"
              style={{
                position: "absolute",
                left: (_col ?? 0) * (COL_W + COL_GAP),
                top: `calc(${(_slotT ?? 0) * 100}% + 16px)`,
                gridTemplateColumns: "28px 1fr", gap: 8,
                width: COL_W, padding: "6px 10px 6px 6px", borderRadius: 999,
                border: `1px solid ${selectedId === job.id ? "var(--hex-honey-border)" : "rgba(148,163,184,0.16)"}`,
                background: selectedId === job.id
                  ? "linear-gradient(90deg, rgba(255,212,90,0.16), var(--panel-bg))"
                  : "var(--panel-card-grad)",
                color: "var(--foreground)",
                boxShadow: selectedId === job.id
                  ? "0 12px 32px rgba(255,212,90,0.18)"
                  : "0 4px 12px rgba(0,0,0,0.18)",
                backdropFilter: "blur(8px) saturate(140%)",
                WebkitBackdropFilter: "blur(8px) saturate(140%)",
                opacity: isPaused ? 0.55 : 1,
                zIndex: selectedId === job.id ? 3 : 1,
                transition: "border-color 160ms ease, transform 160ms ease",
              }}>
              <span aria-hidden className="relative grid place-items-center"
                style={{
                  width: 28, height: 28, borderRadius: 999,
                  background: isPaused ? "rgba(148,163,184,0.18)" : "rgba(255,212,90,0.16)",
                  border: `1px solid ${isPaused ? "rgba(148,163,184,0.32)" : "var(--hex-honey-border)"}`,
                }}>
                {isPaused ? <PausedGlyph /> : <BeeIcon role="worker" size={18} />}
              </span>
              <span style={{ minWidth: 0 }}>
                <span className="block truncate font-semibold"
                  style={{
                    fontFamily: "var(--f-display)", fontSize: 12,
                    color: selectedId === job.id ? "var(--hex-honey-border)" : "var(--foreground)",
                  }}>{job.name}</span>
                <span className="flex items-center" style={{
                  gap: 6, fontFamily: "var(--f-mono)", fontSize: 9.5, color: "var(--muted)",
                }}>
                  <span>{isPaused ? "paused" : job.nextRun}</span>
                  <span>·</span>
                  <span className="truncate">{job.machine} · {job.bee}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
