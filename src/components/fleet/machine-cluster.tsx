// src/components/fleet/machine-cluster.tsx
"use client";

import * as React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AddHexCell } from "./add-hex-cell";
import { BeeIcon } from "./bee-icon";
import { HexTile, type HexTone } from "./hex-tile";
import { axialToPixel, HEX_H, HEX_W, hexSpiral } from "./hex-math";
import type { AgentState, FleetAgent, FleetMachine } from "./fleet-data";

const STATE_TONE: Record<AgentState, HexTone> = {
  working: "active",
  ready: "default",
  scheduled: "honey",
  setup: "honey",
  failed: "danger",
};

function MachineScreenIcon({ name, selected, muted }: { name: string; selected: boolean; muted: boolean }) {
  const color = selected
    ? "var(--hex-honey-border)"
    : muted
      ? "var(--muted)"
      : "var(--accent-strong)";

  return (
    <div
      aria-hidden="true"
      style={{
        width: 54,
        height: 54,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color,
      }}
    >
      <div
        className="grid place-items-center text-center"
        style={{
          width: 46,
          minHeight: 28,
          padding: "3px 4px",
          border: `2px solid ${color}`,
          borderRadius: 4,
          boxShadow: muted ? undefined : "0 0 12px rgba(94,234,212,0.16)",
        }}
      >
        <span
          className="font-semibold"
          style={{
            color: selected ? "var(--hex-honey-border)" : "var(--foreground)",
            fontFamily: "var(--f-display)",
            fontSize: 8.5,
            lineHeight: 0.98,
            letterSpacing: 0,
            overflowWrap: "anywhere",
          }}
        >
          {name}
        </span>
      </div>
      <div
        style={{
          width: 2,
          height: 5,
          background: color,
        }}
      />
      <div
        style={{
          width: 18,
          height: 2,
          borderRadius: 999,
          background: color,
        }}
      />
    </div>
  );
}

interface MachineClusterProps {
  machine: FleetMachine;
  cx: number;
  cy: number;
  selected: boolean;
  selectedAgentId: string | null;
  onSelectMachine: () => void;
  onSelectAgent: (machine: FleetMachine, agent: FleetAgent) => void;
  onAddAgent: (machine: FleetMachine) => void;
}

/**
 * Renders one machine and its agents as a perfectly-tessellated honeycomb:
 *   • machine = center hex
 *   • agents  = ring around it (axial spiral, shared edges)
 *   • next free slot = dashed "+" cell to add a new agent
 */
export function MachineCluster({
  machine,
  cx, cy,
  selected, selectedAgentId,
  onSelectMachine, onSelectAgent, onAddAgent,
}: MachineClusterProps) {
  const agentCount = machine.agents.length;
  // 1 machine + N agents + 1 "add" slot.
  const cells = hexSpiral(agentCount + 2);

  return (
    <div style={{ position: "absolute", left: cx, top: cy, width: 0, height: 0 }}>
      {cells.map(([q, r], i) => {
        const isMachine = i === 0;
        const isAdd = i === cells.length - 1;
        const { x, y } = axialToPixel(q, r);
        const agent = !isMachine && !isAdd ? machine.agents[i - 1] : null;
        const isAgentSelected = !!(agent && selectedAgentId === agent.id);

        const tone: HexTone | null = isAdd
          ? null
          : isMachine
            ? (machine.versionState === "needs-setup"
                ? "ghost"
                : selected && !selectedAgentId
                  ? "honey"
                  : "default")
            : isAgentSelected
              ? "honey"
              : STATE_TONE[agent!.state] ?? "default";

        const wrapperStyle: React.CSSProperties = {
          position: "absolute",
          left: x - HEX_W / 2,
          top: y - HEX_H / 2,
          width: HEX_W,
          height: HEX_H,
        };

        if (isAdd) {
          return (
            <div key={i} style={wrapperStyle}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AddHexCell
                    size={HEX_W}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddAgent(machine);
                    }}
                    label={`Add agent to ${machine.name}`}
                  />
                </TooltipTrigger>
                <TooltipContent>Add agent to {machine.name}</TooltipContent>
              </Tooltip>
            </div>
          );
        }

        return (
          <div key={i} style={wrapperStyle} title={isMachine ? machine.name : agent!.name}>
            <HexTile
              size={HEX_W}
              tone={tone!}
              data-fleet-cell-control
              onClick={(e) => {
                e.stopPropagation();
                if (isMachine) onSelectMachine();
                else if (agent) onSelectAgent(machine, agent);
              }}
            >
              <div
                className="grid justify-items-center text-center"
                style={{
                  width: isMachine ? "100%" : undefined,
                  height: isMachine ? "100%" : undefined,
                  maxWidth: isMachine ? HEX_W : HEX_W - 8,
                  paddingInline: isMachine ? 0 : 4,
                  alignContent: isMachine ? "center" : "center",
                  gap: isMachine ? 0 : 1,
                  transform: isMachine ? undefined : "translateY(-5px)",
                }}
              >
                {isMachine ? (
                  <MachineScreenIcon
                    name={machine.name}
                    selected={selected && !selectedAgentId}
                    muted={machine.versionState === "needs-setup" && !(selected && !selectedAgentId)}
                  />
                ) : (
                  <>
                    <BeeIcon role={agent!.beeRole === "queen" ? "queen" : "worker"} workerClass={agent!.workerClass} size={34}
                      dim={agent!.state === "ready" && !isAgentSelected} />
                    <span
                      className="font-semibold"
                      style={{
                        fontFamily: "var(--f-mono)",
                        fontSize: 8.5,
                        letterSpacing: 0.04,
                        lineHeight: 1,
                        color: isAgentSelected ? "var(--hex-honey-border)" : "var(--foreground)",
                        maxWidth: HEX_W - 12,
                      }}
                    >
                      {agent!.name.split("-")[0]}
                    </span>
                  </>
                )}
              </div>
            </HexTile>
          </div>
        );
      })}
    </div>
  );
}
