export type MemoryTelemetryProcessRole =
  | "current"
  | "ancestor"
  | "descendant"
  | "app"
  | "runtime"
  | "system";

export type MemoryTelemetryProcess = {
  pid: number;
  ppid: number;
  role: MemoryTelemetryProcessRole;
  label: string;
  command: string;
  rssMb: number;
  percentMemory: number;
  firstSeenAt: number;
  lastSeenAt: number;
  sampleCount: number;
  growthMb: number;
  recentGrowthMb: number;
  growthRateMbPerHour: number;
  maxRssMb: number;
  trend: "growing" | "flat" | "shrinking";
  isCurrentProcess: boolean;
  isAppRelated: boolean;
};

export type MemoryTelemetryAggregateSample = {
  ts: number;
  appRssMb: number;
  currentRssMb: number;
  heapUsedMb: number;
  heapTotalMb: number;
  externalMb: number;
  arrayBuffersMb: number;
  trackedProcessCount: number;
};

export type MemoryTelemetrySuspect = {
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  pid?: number;
};

export type MemoryTelemetryPayload = {
  ok: boolean;
  checkedAt: number;
  pid: number;
  uptimeSeconds: number;
  processMemory: {
    rssMb: number;
    heapTotalMb: number;
    heapUsedMb: number;
    externalMb: number;
    arrayBuffersMb: number;
  };
  resourceUsage: {
    maxRssMb: number;
    userCpuSeconds: number;
    systemCpuSeconds: number;
  };
  systemMemory: {
    totalMb: number;
    freeMb: number;
    usedMb: number;
  };
  summary: {
    appRssMb: number;
    trackedProcessCount: number;
    topGrowerLabel: string;
    topGrowerGrowthMb: number;
    sampleWindowMinutes: number;
  };
  samples: MemoryTelemetryAggregateSample[];
  processes: MemoryTelemetryProcess[];
  topGrowers: MemoryTelemetryProcess[];
  topSystemProcesses: MemoryTelemetryProcess[];
  suspects: MemoryTelemetrySuspect[];
};
