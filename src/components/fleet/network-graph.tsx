// src/components/fleet/network-graph.tsx
"use client";

import * as React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AddHexCell } from "./add-hex-cell";
import { MachineCluster } from "./machine-cluster";
import { LottieBee } from "./lottie-bee";
import { type FleetAgent, type FleetMachine } from "./fleet-data";
import { axialToPixel, HEX_H, HEX_W, hexSpiral } from "./hex-math";

interface NetworkGraphProps {
  width?: number;
  height?: number;
  machines: FleetMachine[];
  edges: Array<[string, string]>;
  selected: string;
  selectedAgentId: string | null;
  onSelectMachine: (id: string) => void;
  onSelectAgent: (m: FleetMachine, a: FleetAgent) => void;
  onAddAgent: (m: FleetMachine) => void;
  onAddMachine?: () => void;
}

const CLUSTER_LAYOUT: Record<string, [number, number]> = {
  atlas:     [0.22, 0.38],
  nimbus:    [0.66, 0.34],
  lattice:   [0.16, 0.80],
  honeycomb: [0.52, 0.80],
  "drone-01":[0.88, 0.78],
};

/**
 * Constellation view — every machine is a tessellated cluster of hex cells;
 * dashed Tailscale arcs connect clusters; 1–2 honey bees roam those arcs.
 */
export function NetworkGraph({
  width = 900, height = 900,
  machines, edges,
  selected, selectedAgentId,
  onSelectMachine, onSelectAgent, onAddAgent, onAddMachine,
}: NetworkGraphProps) {
  const w = width, h = height;
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const dragRef = React.useRef<{ pointerId: number; x: number; y: number; panX: number; panY: number } | null>(null);
  const [viewport, setViewport] = React.useState({ width: 0, height: 0 });
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [dragging, setDragging] = React.useState(false);
  const layout = makeClusterLayout(machines);
  const clusters = machines.map((m) => ({
    m,
    cx: layout[m.id][0] * w,
    cy: layout[m.id][1] * h,
  }));
  const addMachinePoint = React.useMemo(() => ({ x: w * 0.72, y: h * 0.28 }), [h, w]);
  const pos: Record<string, { x: number; y: number }> = Object.fromEntries(
    clusters.map((c) => [c.m.id, { x: c.cx, y: c.cy }]),
  );
  const latestBeeGraphRef = React.useRef({ edges, pos });
  const bounds = React.useMemo(() => contentBounds(clusters, addMachinePoint), [clusters, addMachinePoint]);

  const clampPan = React.useCallback((next: { x: number; y: number }) => {
    return {
      x: clampAxis(next.x, viewport.width, bounds.minX, bounds.maxX),
      y: clampAxis(next.y, viewport.height, bounds.minY, bounds.maxY),
    };
  }, [bounds.maxX, bounds.maxY, bounds.minX, bounds.minY, viewport.height, viewport.width]);

  React.useLayoutEffect(() => {
    latestBeeGraphRef.current = { edges, pos };
  }, [edges, pos]);

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
    // Recenter when the graph content or square viewport changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPan(clampPan({
      x: viewport.width / 2 - (bounds.minX + bounds.maxX) / 2,
      y: viewport.height / 2 - (bounds.minY + bounds.maxY) / 2,
    }));
  }, [bounds.maxX, bounds.maxY, bounds.minX, bounds.minY, clampPan, machines.length, viewport.height, viewport.width]);

  // 2 bees roam the network — each picks an edge at random, traverses it,
  // then picks another. Position is mutated via refs (no React re-renders).
  const BEE_COUNT = 2;
  const beeRefs = React.useRef<Array<HTMLDivElement | null>>([]);
  const beeStateRef = React.useRef(
    Array.from({ length: BEE_COUNT }, (_, i) => ({
      edgeIdx: i,
      t0: i * 900,
      dur: 3200 + i * 600,
      dir: i % 2 === 0 ? 1 : -1,
    })),
  );

  React.useEffect(() => {
    let raf = 0;
    const SZ = 44;
    const tick = (now: number) => {
      const { edges: currentEdges, pos: currentPos } = latestBeeGraphRef.current;
      for (let i = 0; i < BEE_COUNT; i++) {
        const el = beeRefs.current[i];
        if (!currentEdges.length) {
          if (el) el.style.opacity = "0";
          beeStateRef.current[i].t0 = now;
          continue;
        }
        const s = beeStateRef.current[i];
        if ((now - s.t0) / s.dur >= 1) {
          s.edgeIdx = (s.edgeIdx + i + 1) % currentEdges.length;
          s.dir = s.dir === 1 ? -1 : 1;
          s.t0 = now;
        }
        if (s.edgeIdx >= currentEdges.length) s.edgeIdx = i % currentEdges.length;
        const phase = Math.min(Math.max((now - s.t0) / s.dur, 0), 1);
        const p = s.dir === 1 ? phase : 1 - phase;
        const [a, b] = currentEdges[s.edgeIdx] ?? [];
        const A = currentPos[a], B = currentPos[b];
        if (!A || !B) {
          if (el) el.style.opacity = "0";
          continue;
        }
        const x = A.x + (B.x - A.x) * p;
        const y = A.y + (B.y - A.y) * p;
        const o = Math.sin(phase * Math.PI);
        const flip = (s.dir === 1 ? B.x - A.x : A.x - B.x) < 0 ? -1 : 1;
        if (el) {
          el.style.transform = `translate(${x - SZ / 2}px, ${y - SZ / 2}px) scaleX(${flip})`;
          el.style.opacity = String(o);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
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
      aria-label="Fleet graph canvas. Drag to pan across machines."
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
      {/* Dashed Tailscale edges */}
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width={w}
        height={h}
        aria-hidden
        className="absolute inset-0 pointer-events-none"
      >
        <defs>
          <linearGradient id="fleetEdge" gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={w} y2={h}>
            <stop offset="0%"   stopColor="var(--edge-stroke-start)" />
            <stop offset="100%" stopColor="var(--edge-stroke-end)" />
          </linearGradient>
        </defs>
        {edges.map(([a, b], i) => {
          const A = pos[a], B = pos[b];
          if (!A || !B) return null;
          return (
            <line
              key={i}
              x1={A.x} y1={A.y} x2={B.x} y2={B.y}
              stroke="url(#fleetEdge)"
              strokeWidth={1.4}
              strokeDasharray="4 5"
              opacity={0.85}
            />
          );
        })}
      </svg>

      {/* Clusters (frosted glass over the lines) */}
      {clusters.map((c) => (
        <MachineCluster
          key={c.m.id}
          machine={c.m}
          cx={c.cx}
          cy={c.cy}
          selected={selected === c.m.id}
          selectedAgentId={selected === c.m.id ? selectedAgentId : null}
          onSelectMachine={() => onSelectMachine(c.m.id)}
          onSelectAgent={onSelectAgent}
          onAddAgent={onAddAgent}
        />
      ))}

      {onAddMachine ? (
        <div
          className="absolute grid justify-items-center"
          style={{
            left: addMachinePoint.x - HEX_W / 2,
            top: addMachinePoint.y - HEX_H / 2,
            width: HEX_W,
            gap: 6,
          }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <AddHexCell
                size={HEX_W}
                onClick={(event) => {
                  event.stopPropagation();
                  onAddMachine();
                }}
                label="Initialize new machine"
              />
            </TooltipTrigger>
            <TooltipContent>Initialize new machine</TooltipContent>
          </Tooltip>
          <span
            className="pointer-events-none text-center"
            style={{
              color: "var(--muted)",
              fontFamily: "var(--f-mono)",
              fontSize: 10,
              lineHeight: 1.2,
            }}
          >
            new machine
          </span>
        </div>
      ) : null}

      {/* Roaming bees (above clusters so they're always visible) */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: BEE_COUNT }).map((_, i) => (
          <div
            key={i}
            ref={(el) => { beeRefs.current[i] = el; }}
            className="absolute pointer-events-none"
            style={{
              top: 0, left: 0,
              width: 44, height: 44,
              opacity: 0,
              willChange: "transform, opacity",
              filter: "drop-shadow(0 2px 6px rgba(255, 200, 60, 0.45))",
            }}
          >
            <LottieBee size={44} />
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}

function makeClusterLayout(machines: FleetMachine[]) {
  const fallback: Record<string, [number, number]> = {};
  machines.forEach((machine, index) => {
    const angle = (index / Math.max(machines.length, 1)) * Math.PI * 2 - Math.PI / 2;
    fallback[machine.id] = [
      0.5 + Math.cos(angle) * 0.22,
      0.54 + Math.sin(angle) * 0.16,
    ];
  });
  return { ...fallback, ...CLUSTER_LAYOUT };
}

function contentBounds(clusters: Array<{ m: FleetMachine; cx: number; cy: number }>, addMachinePoint?: { x: number; y: number }) {
  const padding = 140;
  if (!clusters.length) return { minX: -padding, minY: -padding, maxX: padding, maxY: padding };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const cluster of clusters) {
    for (const [q, r] of hexSpiral(cluster.m.agents.length + 2)) {
      const point = axialToPixel(q, r);
      minX = Math.min(minX, cluster.cx + point.x - HEX_W / 2);
      maxX = Math.max(maxX, cluster.cx + point.x + HEX_W / 2);
      minY = Math.min(minY, cluster.cy + point.y - HEX_H / 2);
      maxY = Math.max(maxY, cluster.cy + point.y + HEX_H / 2);
    }
  }

  if (addMachinePoint) {
    minX = Math.min(minX, addMachinePoint.x - HEX_W / 2);
    maxX = Math.max(maxX, addMachinePoint.x + HEX_W / 2);
    minY = Math.min(minY, addMachinePoint.y - HEX_H / 2);
    maxY = Math.max(maxY, addMachinePoint.y + HEX_H / 2 + 26);
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
