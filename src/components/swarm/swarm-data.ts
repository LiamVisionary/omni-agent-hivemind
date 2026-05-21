// src/components/swarm/swarm-data.ts
export type RunState = "live" | "ready" | "done" | "failed";
export type TemplateId = string;

export interface SwarmRun {
  id: string;
  title: string;
  template: TemplateId;
  state: RunState;
  rounds: number;
  currentRound: number;
  sharpe: number | null;
  pnl: string | null;
  started: string;
  agents: number;
  news: number;
  posts: number;
  trades: number;
  tags: string[];
  summary: string;
  platform?: string;
  scenario?: string;
  threadPosts?: SwarmThreadPost[];
  timelineItems?: SwarmEventItem[];
  marketItems?: SwarmEventItem[];
  profileItems?: SwarmEventItem[];
  observabilityItems?: SwarmEventItem[];
  integrationItems?: SwarmEventItem[];
  exportLinks?: Array<{ key: string; label: string; href: string }>;
  marketPriceItems?: SwarmEventItem[];
}

export interface SwarmAgent {
  id: string;
  name: string;
  role: string;
  faction: "MM" | "TKR" | "INFO" | "OPS";
  ledger: string;
  trades: number;
  status: "live" | "watch";
}

export interface SwarmDecision { who: string; role: SwarmAgent["faction"]; action: string; detail: string; }
export interface SwarmSocialPost { id: string; who: string; faction: SwarmAgent["faction"]; t: string; text: string; reacts: { up: number; down: number }; }
export interface SwarmThreadPost { id: string; author: string; handle: string; text: string; time: string; replies: number; reposts: number; likes: number; views: number; }
export interface SwarmEventItem { id: string; title: string; body: string; meta?: string; tone?: "bear" | "bull" | "neutral"; level?: "info" | "warn" | "error" | "fatal"; raw?: unknown; }
export interface SwarmMarket {
  symbol: string;
  ticks: number[];
  ladder: Array<{ px: number; bid: number | null; ask: number | null }>;
  headlines: Array<{ t: string; body: string; tone: "bear" | "bull" | "neutral" }>;
}
export interface SwarmTemplate { id: TemplateId; label: string; kind: string; agents: number; desc: string; platforms?: string[]; }
export interface SwarmTemplateField { key: string; label: string; placeholder: string; kind?: "text" | "textarea"; required?: boolean; help?: string; }
