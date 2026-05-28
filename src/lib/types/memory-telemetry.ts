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
  heapLimitMb: number;
  oldSpaceUsedMb: number;
  codeSpaceUsedMb: number;
  largeObjectSpaceUsedMb: number;
  externalMb: number;
  arrayBuffersMb: number;
  nativeContexts: number;
  detachedContexts: number;
  trackedProcessCount: number;
};

export type MemoryTelemetryHeapSpace = {
  name: string;
  usedMb: number;
  sizeMb: number;
  availableMb: number;
  physicalMb: number;
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
    heapLimitMb: number;
    totalAvailableSizeMb: number;
    mallocedMemoryMb: number;
    peakMallocedMemoryMb: number;
    nativeContexts: number;
    detachedContexts: number;
    heapSpaces: MemoryTelemetryHeapSpace[];
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
  cleanup: {
    devGuardEnabled: boolean;
    gcAvailable: boolean;
    forceGcEnabled: boolean;
    maxOldSpaceMb?: number;
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
