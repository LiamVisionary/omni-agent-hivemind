export interface HeartbeatActiveHours {
  start: string; // HH:MM
  end: string;   // HH:MM (24:00 allowed)
  timezone?: string; // IANA tz or "user" | "local"
}

/** Agent behavioural mode — overrides defaults for the current session */
export type AgentMode = 'quiet' | 'careful' | 'focus' | 'travel';

export const AGENT_MODE_META: Record<AgentMode, { labelKey: string; descKey: string; icon: string }> = {
  quiet:   { labelKey: 'personalityModal.agentModeQuiet',   descKey: 'personalityModal.agentModeQuietDesc',   icon: 'VolumeX' },
  careful: { labelKey: 'personalityModal.agentModeCareful', descKey: 'personalityModal.agentModeCarefulDesc', icon: 'Shield' },
  focus:   { labelKey: 'personalityModal.agentModeFocus',   descKey: 'personalityModal.agentModeFocusDesc',   icon: 'Target' },
  travel:  { labelKey: 'personalityModal.agentModeTravel',  descKey: 'personalityModal.agentModeTravelDesc',  icon: 'Plane' },
};

export interface HeartbeatConfig {
  every: string;  // e.g. "30m", "1h", "0m" to disable
  target?: 'none' | 'last' | string; // channel id
  to?: string;    // recipient override
  prompt?: string;
  model?: string;
  activeHours?: HeartbeatActiveHours;
  accountId?: string;
  session?: string;
  /** Active behavioural mode — controls how proactively the agent acts */
  agentMode?: AgentMode;
}

export interface AgentEntry {
  id: string;
  default?: boolean;
  heartbeat?: HeartbeatConfig;
  [key: string]: unknown;
}

export interface HeartbeatState {
  defaults: HeartbeatConfig | null;
  agents: AgentEntry[];
}

export const DEFAULT_HEARTBEAT: HeartbeatConfig = {
  every: '30m',
  // NOTE: Do NOT set `target: 'none'` — the CLI gateway treats it as
  // "skip embedded run entirely", preventing heartbeat automations from firing.
  // Omitting `target` lets the gateway run the agent silently by default.
};

export const TARGET_OPTIONS = [
  { value: 'none', label: 'None (silent)', description: 'Run heartbeat but don\'t deliver externally' },
  { value: 'last', label: 'Last contact', description: 'Deliver to the last used channel' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'discord', label: 'Discord' },
  { value: 'signal', label: 'Signal' },
  { value: 'imessage', label: 'iMessage' },
  { value: 'slack', label: 'Slack' },
  { value: 'googlechat', label: 'Google Chat' },
  { value: 'msteams', label: 'MS Teams' },
] as const;

export const INTERVAL_PRESETS = [
  { value: '0m', labelKey: 'personalityModal.intervalDisabled' },
  { value: '15m', labelKey: 'personalityModal.interval15m' },
  { value: '30m', labelKey: 'personalityModal.interval30m' },
  { value: '1h', labelKey: 'personalityModal.interval1h' },
  { value: '2h', labelKey: 'personalityModal.interval2h' },
  { value: '4h', labelKey: 'personalityModal.interval4h' },
  { value: '6h', labelKey: 'personalityModal.interval6h' },
  { value: '12h', labelKey: 'personalityModal.interval12h' },
];

export const TICK_RATE_PRESETS = [
  { value: '15m', labelKey: 'personalityModal.interval15m' },
  { value: '30m', labelKey: 'personalityModal.interval30m' },
  { value: '1h', labelKey: 'personalityModal.interval1h' },
  { value: '2h', labelKey: 'personalityModal.interval2h' },
  { value: '4h', labelKey: 'personalityModal.interval4h' },
];

/** Parse an interval string like "30m", "2h" into minutes. Returns Infinity for invalid/disabled. */
export function parseIntervalToMinutes(interval: string): number {
  if (!interval || interval === '0m') return Infinity;
  const match = interval.match(/^(\d+)(m|h)$/);
  if (!match) return Infinity;
  const num = parseInt(match[1], 10);
  return match[2] === 'h' ? num * 60 : num;
}
