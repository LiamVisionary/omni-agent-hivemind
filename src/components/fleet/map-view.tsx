// src/components/fleet/map-view.tsx
"use client";

import * as React from "react";
import { Monitor, Smartphone } from "lucide-react";
import { HexTile } from "./hex-tile";
import { LottieBee } from "./lottie-bee";
import { projectLatLon } from "./hex-math";
import { isFleetMachineMobile, type FleetAgent, type FleetMachine } from "./fleet-data";

interface MapViewProps {
  width?: number;
  height?: number;
  machines: FleetMachine[];
  edges: Array<[string, string]>;
  selected: string;
  selectedAgentId: string | null;
  onSelectMachine: (id: string) => void;
  onSelectAgent: (m: FleetMachine, a: FleetAgent) => void;
  onAddAgent: (m: FleetMachine) => void;
}

// Coarse hand-drawn silhouettes for the visible regions (NE NA + Europe).
// Rendered as dotted lines so they read as a stylized swarm map, not a real
// world atlas. Scale targets a 540×300 viewBox.
const CONTINENT_PATHS = [
  "M 12 88 Q 30 76 38 70 Q 52 60 58 80 Q 70 92 86 110 Q 100 130 122 138 Q 140 152 160 158 Q 178 168 192 184 L 196 196 L 178 198 Q 158 192 138 200 L 120 212 L 108 230 L 90 240 L 70 232 L 50 220 L 36 200 L 28 178 L 22 156 L 18 132 L 14 110 Z",
  "M 360 70 Q 380 50 408 56 Q 430 62 450 78 Q 470 92 478 116 Q 482 138 472 158 Q 460 178 442 196 Q 420 212 400 218 Q 376 224 354 218 Q 330 210 312 196 Q 296 180 290 158 Q 286 134 296 110 Q 308 88 332 76 Z",
];

// Coincident machines (atlas + honeycomb in Brooklyn) get a small offset so
// pins don't fully overlap.
const PIN_OFFSET: Record<string, [number, number]> = {
  atlas:     [-22, -10],
  honeycomb: [22,  14],
};

export function MapView({
  width = 720, height = 540,
  machines, edges,
  selected,
  onSelectMachine,
}: MapViewProps) {
  const w = width, h = height;
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const dragRef = React.useRef<{ pointerId: number; x: number; y: number; panX: number; panY: number } | null>(null);
  const [viewport, setViewport] = React.useState({ width: 0, height: 0 });
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [dragging, setDragging] = React.useState(false);

  const pos = React.useMemo(() => {
    const o: Record<string, { x: number; y: number }> = {};
    for (const m of machines) {
      const p = projectLatLon(m.lon, m.lat, w, h);
      const [dx, dy] = PIN_OFFSET[m.id] ?? [0, 0];
      o[m.id] = { x: p.x + dx, y: p.y + dy };
    }
    return o;
  }, [machines, w, h]);
  const bounds = React.useMemo(() => mapContentBounds(machines, pos, w, h), [machines, pos, w, h]);

  const clampPan = React.useCallback((next: { x: number; y: number }) => {
    return {
      x: clampAxis(next.x, viewport.width, bounds.minX, bounds.maxX),
      y: clampAxis(next.y, viewport.height, bounds.minY, bounds.maxY),
    };
  }, [bounds.maxX, bounds.maxY, bounds.minX, bounds.minY, viewport.height, viewport.width]);

  React.useLayoutEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const update = () => setViewport({ width: element.clientWidth, height: element.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  React.useLayoutEffect(() => {
    if (!viewport.width || !viewport.height) return;
    // Recenter when the projected map or containing stage changes size.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPan(clampPan({
      x: viewport.width / 2 - (bounds.minX + bounds.maxX) / 2,
      y: viewport.height / 2 - (bounds.minY + bounds.maxY) / 2,
    }));
  }, [bounds.maxX, bounds.maxY, bounds.minX, bounds.minY, clampPan, machines.length, viewport.height, viewport.width]);

  // Bee animation across great-circle (quadratic-bezier) arcs.
  const BEE_COUNT = 2;
  const beeRefs = React.useRef<Array<HTMLDivElement | null>>([]);
  const beeStateRef = React.useRef(
    Array.from({ length: BEE_COUNT }, (_, i) => ({
      edgeIdx: i,
      t0: i * 900,
      dur: 3800 + i * 600,
      dir: i % 2 === 0 ? 1 : -1,
    })),
  );

  React.useEffect(() => {
    let raf = 0;
    const SZ = 38;
    const tick = (now: number) => {
      for (let i = 0; i < BEE_COUNT; i++) {
        const s = beeStateRef.current[i];
        if ((now - s.t0) / s.dur >= 1) {
          s.edgeIdx = edges.length ? (s.edgeIdx + i + 1) % edges.length : 0;
          s.dir = s.dir === 1 ? -1 : 1;
          s.t0 = now;
        }
        const phase = Math.min(Math.max((now - s.t0) / s.dur, 0), 1);
        const p = s.dir === 1 ? phase : 1 - phase;
        const [a, b] = edges[s.edgeIdx] ?? [];
        const A = pos[a], B = pos[b];
        if (!A || !B) continue;
        const dist = Math.hypot(B.x - A.x, B.y - A.y);
        const mx = (A.x + B.x) / 2;
        const my = (A.y + B.y) / 2 - Math.min(60, dist * 0.18);
        const x = (1 - p) * (1 - p) * A.x + 2 * (1 - p) * p * mx + p * p * B.x;
        const y = (1 - p) * (1 - p) * A.y + 2 * (1 - p) * p * my + p * p * B.y;
        const o = Math.sin(phase * Math.PI);
        const flip = (s.dir === 1 ? B.x - A.x : A.x - B.x) < 0 ? -1 : 1;
        const el = beeRefs.current[i];
        if (el) {
          el.style.transform = `translate(${x - SZ / 2}px, ${y - SZ / 2}px) scaleX(${flip})`;
          el.style.opacity = String(o);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={viewportRef}
      className="relative h-full w-full overflow-hidden"
      style={{ cursor: dragging ? "grabbing" : "grab", touchAction: "none" }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        const target = event.target;
        if (target instanceof Element && target.closest("button, [data-fleet-cell-control]")) return;
        dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
        setDragging(true);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        setPan(clampPan({
          x: drag.panX + event.clientX - drag.x,
          y: drag.panY + event.clientY - drag.y,
        }));
      }}
      onPointerUp={(event) => {
        if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
        setDragging(false);
      }}
      onPointerCancel={() => {
        dragRef.current = null;
        setDragging(false);
      }}
      aria-label="Fleet map canvas. Drag to pan across machines."
    >
      <div
        className="absolute left-0 top-0"
        style={{
          width: w,
          height: h,
          transform: `translate(${pan.x}px, ${pan.y}px)`,
          willChange: "transform",
        }}
      >
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width={w} height={h}
        className="absolute inset-0 pointer-events-none"
        aria-hidden
      >
        <defs>
          <linearGradient id="fleetMapArc" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="var(--edge-stroke-start)" />
            <stop offset="100%" stopColor="var(--edge-stroke-end)" />
          </linearGradient>
        </defs>
        {/* Graticule */}
        <g stroke="rgba(148,163,184,0.18)" strokeWidth={0.5}>
          {Array.from({ length: 5 }).map((_, i) => (
            <line key={"h" + i} x1={0} x2={w} y1={((i + 1) * h) / 6} y2={((i + 1) * h) / 6} strokeDasharray="2 4" />
          ))}
          {Array.from({ length: 7 }).map((_, i) => (
            <line key={"v" + i} y1={0} y2={h} x1={((i + 1) * w) / 8} x2={((i + 1) * w) / 8} strokeDasharray="2 4" />
          ))}
        </g>
        {/* Continent silhouettes (scaled from 540×300 base) */}
        <g
          transform={`scale(${w / 540} ${h / 300})`}
          fill="none"
          stroke="var(--edge-stroke-start)"
          strokeWidth={0.7}
          strokeDasharray="0.8 3"
          opacity={0.55}
        >
          {CONTINENT_PATHS.map((d, i) => <path key={i} d={d} />)}
        </g>
        {/* Tailscale arcs */}
        {edges.map(([a, b], i) => {
          const A = pos[a], B = pos[b];
          if (!A || !B) return null;
          const dist = Math.hypot(B.x - A.x, B.y - A.y);
          const mx = (A.x + B.x) / 2;
          const my = (A.y + B.y) / 2 - Math.min(60, dist * 0.18);
          return (
            <path
              key={i}
              d={`M ${A.x} ${A.y} Q ${mx} ${my} ${B.x} ${B.y}`}
              stroke="url(#fleetMapArc)"
              strokeWidth={1.4}
              strokeDasharray="4 5"
              fill="none"
              opacity={0.85}
            />
          );
        })}
        {/* City labels */}
        {machines.map((m) => (
          <text
            key={m.id}
            x={pos[m.id].x} y={pos[m.id].y + 60}
            textAnchor="middle"
            style={{
              font: "600 9px var(--f-mono)",
              fill: "var(--muted)",
              letterSpacing: 0.08,
              textTransform: "uppercase",
            }}
          >
            {m.city}
          </text>
        ))}
      </svg>

      {/* Hex pins */}
        {machines.map((m) => {
        const tone = m.versionState === "needs-setup"
          ? "ghost"
          : selected === m.id ? "honey" : "default";
        const SZ = 56;
        return (
          <div
            key={m.id}
            className="absolute"
            style={{
              left: pos[m.id].x - SZ / 2,
              top:  pos[m.id].y - (SZ * 1.1547) / 2,
            }}
          >
            <HexTile size={SZ} tone={tone} onClick={() => onSelectMachine(m.id)}>
              <div className="grid place-items-center gap-px">
                {(() => {
                  const MachineIcon = isFleetMachineMobile(m) ? Smartphone : Monitor;
                  return <MachineIcon
                  aria-hidden="true"
                  size={20}
                  style={{
                    color: m.versionState === "needs-setup" && selected !== m.id
                      ? "var(--muted)"
                      : "var(--accent-strong)",
                  }}
                  />;
                })()}
                <span
                  className="font-semibold leading-none"
                  style={{
                    fontFamily: "var(--f-display)",
                    fontSize: 10,
                    letterSpacing: 0,
                    marginTop: 2,
                    color: selected === m.id ? "var(--hex-honey-border)" : "var(--foreground)",
                  }}
                >
                  {m.name}
                </span>
              </div>
            </HexTile>
            {/* Agent count badge */}
            <div
              className="absolute grid place-items-center"
              style={{
                top: -4, right: -6,
                minWidth: 16, height: 16, padding: "0 5px", borderRadius: 9999,
                background: "rgba(15,23,42,0.85)",
                border: "1px solid rgba(148,163,184,0.32)",
                color: "var(--accent-strong)",
                fontFamily: "var(--f-mono)",
                fontSize: 9,
                fontWeight: 700,
              }}
            >
              {m.agents.length}
            </div>
          </div>
        );
      })}

      {/* Bees on arcs */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: BEE_COUNT }).map((_, i) => (
          <div
            key={i}
            ref={(el) => { beeRefs.current[i] = el; }}
            className="absolute pointer-events-none"
            style={{
              top: 0, left: 0,
              width: 38, height: 38,
              opacity: 0,
              willChange: "transform, opacity",
              filter: "drop-shadow(0 2px 5px rgba(255, 200, 60, 0.4))",
            }}
          >
            <LottieBee size={38} />
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}

function mapContentBounds(
  machines: FleetMachine[],
  pos: Record<string, { x: number; y: number }>,
  width: number,
  height: number,
) {
  const padding = 90;
  const pinWidth = 56;
  const pinHeight = (pinWidth * 2) / Math.sqrt(3);
  let minX = 0;
  let minY = 0;
  let maxX = width;
  let maxY = height;

  for (const machine of machines) {
    const point = pos[machine.id];
    if (!point) continue;
    minX = Math.min(minX, point.x - pinWidth / 2);
    maxX = Math.max(maxX, point.x + pinWidth / 2);
    minY = Math.min(minY, point.y - pinHeight / 2);
    maxY = Math.max(maxY, point.y + 72);
  }

  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
  };
}

function clampAxis(value: number, viewportSize: number, minContent: number, maxContent: number) {
  if (!viewportSize) return value;
  const contentSize = maxContent - minContent;
  if (contentSize <= viewportSize) return viewportSize / 2 - (minContent + maxContent) / 2;
  const min = viewportSize - maxContent;
  const max = -minContent;
  return Math.min(max, Math.max(min, value));
}
