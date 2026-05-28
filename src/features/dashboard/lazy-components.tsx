"use client";

import dynamic from "next/dynamic";

function FleetViewLoading() {
  return (
    <div className="grid h-full min-h-[min(760px,calc(100vh-150px))] place-items-center overflow-hidden rounded-lg border border-[rgba(94,234,212,0.18)] bg-[radial-gradient(circle_at_50%_36%,rgba(45,212,191,0.10),transparent_35%),rgba(8,13,22,0.62)] p-6">
      <div className="grid w-full max-w-5xl justify-items-center gap-8">
        <div className="relative grid h-44 w-44 place-items-center">
          <span className="absolute h-40 w-40 animate-ping rounded-full border border-[rgba(94,234,212,0.22)]" />
          <span className="absolute h-28 w-28 animate-pulse rounded-full border border-[rgba(255,212,90,0.20)]" />
          <span className="absolute h-px w-44 rotate-[24deg] bg-gradient-to-r from-transparent via-[rgba(94,234,212,0.54)] to-transparent" />
          <span className="absolute h-px w-40 -rotate-[28deg] bg-gradient-to-r from-transparent via-[rgba(255,212,90,0.40)] to-transparent" />
          <span className="grid h-20 w-20 animate-pulse place-items-center rounded-[24px] border border-[rgba(94,234,212,0.32)] bg-[rgba(10,14,21,0.82)] shadow-[0_24px_80px_rgba(45,212,191,0.18)]">
            <span className="h-4 w-4 rounded-full bg-[rgba(94,234,212,0.72)] shadow-[0_0_22px_rgba(94,234,212,0.52)]" />
          </span>
        </div>

        <div className="text-center">
          <p className="eyebrow">Fleet Discovery</p>
          <h2 className="m-0 text-2xl font-black text-[var(--foreground)]">Loading constellation</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--muted)]">
            Preparing machines, agent bridges, and live status data.
          </p>
        </div>
      </div>
    </div>
  );
}

export const AgentWalletCard = dynamic(() => import("@/components/wallet/AgentWalletCard").then((mod) => mod.AgentWalletCard), { ssr: false });
export const AgentWalletCardCompact = dynamic(() => import("@/components/wallet/AgentWalletCardCompact").then((mod) => mod.AgentWalletCardCompact), { ssr: false });
export const AgentCell = dynamic(() => import("@/components/cells/AgentCell").then((mod) => mod.AgentCell), { ssr: false });
export const AgentTaskList = dynamic(() => import("@/components/cells/AgentTaskList").then((mod) => mod.AgentTaskList), { ssr: false });
export const FleetView = dynamic(() => import("@/components/fleet").then((mod) => mod.FleetView), { loading: () => <FleetViewLoading />, ssr: false });
export const MachineCell = dynamic(() => import("@/components/cells/MachineCell").then((mod) => mod.MachineCell), { ssr: false });
export const MemoryCell = dynamic(() => import("@/components/cells/MemoryCell").then((mod) => mod.MemoryCell), { ssr: false });
export const SchedulerView = dynamic(() => import("@/components/scheduler").then((mod) => mod.SchedulerView), { ssr: false });
export const SetupCell = dynamic(() => import("@/components/cells/SetupCell").then((mod) => mod.SetupCell), { ssr: false });
export const SwarmView = dynamic(() => import("@/components/swarm").then((mod) => mod.SwarmView), { ssr: false });
export const TaskModal = dynamic(() => import("@/components/task-modal").then((mod) => mod.TaskModal), { ssr: false });
