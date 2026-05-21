// src/components/swarm/SwarmView.tsx
"use client";

import * as React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";

import { Arena } from "./arena";
import { BeeIcon } from "./bee-icon";
import { Composer } from "./composer";
import { HexTile } from "./hex-tile";
import { HeadlinesPanel, MarketPanel, SocialPanel } from "./feeds";
import {
  XThreadView, RedditView, PolymarketView, ResearchView, OpsView, MiroSharkIntegrationView,
} from "./output-views";
import { Runs } from "./runs";
import {
  type SwarmAgent, type SwarmDecision, type SwarmMarket, type SwarmRun, type SwarmSocialPost,
  type SwarmTemplate, type SwarmTemplateField, type TemplateId,
} from "./swarm-data";
import styles from "./swarm-tokens.module.css";

interface SwarmViewProps {
  runs?: SwarmRun[];
  agents?: SwarmAgent[];
  decisions?: SwarmDecision[];
  market?: SwarmMarket;
  socialPosts?: SwarmSocialPost[];
  templates?: SwarmTemplate[];
  statusLabel?: string;
  selectedRunId?: string;
  onSelectRun?: (run: SwarmRun) => void;
  onLaunch?: (template: TemplateId) => void;
  onPickTemplate?: (template: TemplateId) => void;
  draftScenario?: string;
  draftRounds?: number;
  draftPlatform?: string;
  templateFields?: SwarmTemplateField[];
  templateInputs?: Record<string, string>;
  missingTemplateFields?: number;
  runPending?: boolean;
  onDraftScenarioChange?: (value: string) => void;
  onDraftRoundsChange?: (value: number) => void;
  onDraftPlatformChange?: (value: string) => void;
  onTemplateInputChange?: (key: string, value: string) => void;
  onStartRun?: () => void;
  onAskScenario?: () => void;
  onSuggestScenarios?: () => void;
  helperPending?: "ask" | "suggest" | "";
  helperStatus?: string;
  loading?: boolean;
  loadingLabel?: string;
  onPublishX?: (run: SwarmRun) => void;
}

const EMPTY_MARKET: SwarmMarket = {
  symbol: "No market data",
  ticks: [],
  ladder: [],
  headlines: [],
};

export function SwarmView({
  runs = [],
  agents = [],
  decisions = [],
  market = EMPTY_MARKET,
  socialPosts = [],
  templates = [],
  statusLabel = "waiting for data",
  selectedRunId,
  onSelectRun,
  onLaunch,
  onPickTemplate,
  draftScenario,
  draftRounds,
  draftPlatform,
  templateFields = [],
  templateInputs = {},
  missingTemplateFields = 0,
  runPending = false,
  onDraftScenarioChange,
  onDraftRoundsChange,
  onDraftPlatformChange,
  onTemplateInputChange,
  onStartRun,
  onAskScenario,
  onSuggestScenarios,
  helperPending,
  helperStatus,
  loading = false,
  loadingLabel = "Loading swarm run",
  onPublishX,
}: SwarmViewProps = {}) {
  const [internalSelectedId, setInternalSelectedId] = React.useState<string>(runs[0]?.id ?? "");
  const [template, setTemplate] = React.useState<TemplateId>(runs[0]?.template ?? templates[0]?.id ?? "custom");
  const requestedSelectedId = selectedRunId !== undefined ? selectedRunId : internalSelectedId;
  const selectedId = requestedSelectedId === ""
    ? ""
    : runs.some((r) => r.id === requestedSelectedId)
      ? requestedSelectedId
      : runs[0]?.id ?? "";
  const run = selectedId ? runs.find((r) => r.id === selectedId) ?? runs[0] ?? null : null;
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric", year: "numeric",
  });

  const handleSelectRun = React.useCallback((id: string) => {
    setInternalSelectedId(id);
    const r = runs.find((x) => x.id === id);
    if (r) {
      setTemplate(r.template);
      onSelectRun?.(r);
    }
  }, [onSelectRun, runs]);

  const handlePickTemplate = React.useCallback((id: TemplateId) => {
    setTemplate(id);
    setInternalSelectedId("");
    onPickTemplate?.(id);
  }, [onPickTemplate]);

  const handleLaunch = React.useCallback(() => {
    const nextTemplate = templates.some((item) => item.id === template) ? template : templates[0]?.id ?? "custom";
    setTemplate(nextTemplate);
    setInternalSelectedId("");
    onLaunch?.(nextTemplate);
  }, [onLaunch, template, templates]);

  const activeTemplate = run?.template ?? template;
  const liveCount = runs.filter((r) => r.state === "live").length;
  const totalPosts = run?.posts ?? 0;
  const totalTrades = run?.trades ?? 0;
  const isLoading = loading || runPending;

  return (
    <TooltipProvider delayDuration={120}>
      <div className={`${styles.root} relative overflow-hidden`}
        aria-busy={isLoading || undefined}
        style={{
          width: "100%", height: "100%",
          background: "var(--background)", color: "var(--foreground)",
          fontFamily: "var(--f-display), system-ui, sans-serif",
          display: "grid", gridTemplateRows: "auto 1fr",
        }}>
        {/* Backdrop wash */}
        <div aria-hidden className="absolute inset-0 pointer-events-none" style={{
          background:
            "radial-gradient(circle at 50% 28%, rgba(255,212,90,0.10), transparent 50%)," +
            "radial-gradient(circle at 80% 80%, rgba(45,212,191,0.08), transparent 50%)",
        }} />
        <svg aria-hidden className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.08 }}>
          <defs>
            <pattern id="swarmBgHex" width="48" height="55" patternUnits="userSpaceOnUse">
              <polygon points="24,1 47,14 47,40 24,53 1,40 1,14"
                fill="none" stroke="rgba(255,212,90,0.4)" strokeWidth={0.5} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#swarmBgHex)" />
        </svg>

        {/* ===== MASTHEAD ===== */}
        <header className="relative z-10"
          style={{ padding: "22px 32px 16px", borderBottom: "1px solid rgba(148,163,184,0.16)" }}>
          <div className="grid items-center" style={{ gridTemplateColumns: "auto 1fr auto", gap: 24 }}>
            <div className="flex items-center" style={{ gap: 14 }}>
              <HexTile size={42} tone="honey"><BeeIcon role="queen" size={26} /></HexTile>
              <div>
                <div className={styles.monoCap} style={{ color: "var(--hex-honey-border)" }}>
                  Hivemind Dispatch · Swarm Theater
                </div>
                <div className="font-bold" style={{
                  fontFamily: "var(--f-display)", fontSize: 18, letterSpacing: -0.2,
                }}>MiroShark · simulations</div>
              </div>
            </div>
            <div className="text-center uppercase" style={{
              fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--muted)", letterSpacing: 0.1,
            }}>
              {today} · miroshark · <span style={{ color: "var(--hex-active-border)" }}>
                {isLoading ? loadingLabel : statusLabel}
              </span>
            </div>
            <div />
          </div>

          <div className="mt-4 grid items-end" style={{ gridTemplateColumns: "1fr auto", gap: 24 }}>
            <h1 className="m-0 font-bold" style={{
              fontFamily: "var(--f-display)", fontSize: "clamp(40px, 5vw, 64px)",
              lineHeight: 0.95, letterSpacing: -2.2,
            }}>
              A world,{" "}
              <span style={{ fontStyle: "italic", color: "var(--hex-honey-border)", fontWeight: 500 }}>
                simulated.
              </span>
            </h1>
            <div className="flex" style={{ gap: 18, paddingBottom: 6 }}>
              <BigStat n={liveCount} label="live" tone="cyan" />
              <BigStat n={agents.length} label="agents in arena" tone="honey" />
              <BigStat n={totalPosts} label="posts this round" />
              <BigStat n={totalTrades} label="events this round" />
            </div>
          </div>
        </header>

        {/* ===== BODY ===== */}
        <div className="relative z-10 grid" style={{
          gridTemplateColumns: "300px minmax(0, 1fr) 320px", minHeight: 0,
        }}>
          <Runs
            runs={runs}
            selectedId={selectedId}
            onSelect={handleSelectRun}
            onLaunch={handleLaunch}
          />

          {/* CENTER — theater + feeds (varies by template) */}
          <section className="grid overflow-auto" style={{
            minWidth: 0, minHeight: 0, padding: "20px 28px 28px",
            gap: 16, gridTemplateColumns: "minmax(0, 1fr)", alignContent: "start",
          }}>
            {isLoading ? (
              <LoadingStage label={loadingLabel} />
            ) : run ? (
              <CenterStage
                run={run}
                agents={agents}
                decisions={decisions}
                market={market}
                socialPosts={socialPosts}
                onPublishX={() => onPublishX?.(run)}
              />
            ) : (
              <EmptyStage statusLabel={statusLabel} />
            )}
          </section>

          <Composer
            templates={templates}
            activeTemplate={activeTemplate}
            onPickTemplate={handlePickTemplate}
            run={run}
            agents={agents}
            draftScenario={draftScenario}
            draftRounds={draftRounds}
            draftPlatform={draftPlatform}
            templateFields={templateFields}
            templateInputs={templateInputs}
            missingTemplateFields={missingTemplateFields}
            runPending={runPending}
            onDraftScenarioChange={onDraftScenarioChange}
            onDraftRoundsChange={onDraftRoundsChange}
            onDraftPlatformChange={onDraftPlatformChange}
            onTemplateInputChange={onTemplateInputChange}
            onStartRun={onStartRun}
            onAskScenario={onAskScenario}
            onSuggestScenarios={onSuggestScenarios}
            helperPending={helperPending}
            helperStatus={helperStatus}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

function CenterStage({
  run,
  agents,
  decisions,
  market,
  socialPosts,
  onPublishX,
}: {
  run: SwarmRun;
  agents: SwarmAgent[];
  decisions: SwarmDecision[];
  market: SwarmMarket;
  socialPosts: SwarmSocialPost[];
  onPublishX: () => void;
}) {
  const wrap = (title: string, tone: string, children: React.ReactNode, badge?: React.ReactNode) => (
    <div className="relative grid place-items-center"
      style={{
        borderRadius: 14, border: "1px solid rgba(148,163,184,0.16)",
        background: `radial-gradient(ellipse at center, ${tone}, transparent 60%), var(--panel-bg)`,
        padding: "44px 18px 22px", minHeight: 600,
      }}>
      <div className="absolute flex items-center" style={{ top: 14, left: 16, gap: 10 }}>
        <span className={`${styles.dot} ${styles.dotLive}`} style={{ color: "var(--accent)" }} />
        <span className={styles.monoCap} style={{ color: "var(--hex-active-border)" }}>{title}</span>
        <span className={styles.monoCap} style={{ color: "var(--muted)" }}>{run.title}</span>
      </div>
      <div className="absolute flex items-center" style={{ top: 14, right: 16, gap: 6 }}>{badge}</div>
      {children}
    </div>
  );

  switch (run.template) {
    case "x-thread":
      return (
        <>
          {wrap(
            "autoposter · draft ready", "rgba(29,155,240,0.10)",
            <XThreadView run={run} />,
            <button onClick={onPublishX} className="uppercase font-bold cursor-pointer"
              style={{
                padding: "6px 14px", borderRadius: 999, border: 0,
                background: "#1d9bf0", color: "#fff",
                fontFamily: "var(--f-mono)", fontSize: 10, letterSpacing: 0.08,
              }}>publish thread</button>,
          )}
          <MiroSharkIntegrationView run={run} />
        </>
      );
    case "reddit-narrative":
      return (
        <>
          {wrap("reddit · narrative cascade", "rgba(255,69,0,0.10)", <RedditView run={run} />)}
          <MiroSharkIntegrationView run={run} />
        </>
      );
    case "research-swarm":
      return (
        <>
          {wrap("research · consensus brief", "rgba(94,234,212,0.10)", <ResearchView run={run} />)}
          <MiroSharkIntegrationView run={run} />
        </>
      );
    case "ops":
      return (
        <>
          {wrap("ops · storm console", "rgba(251,113,133,0.10)", <OpsView run={run} />)}
          <MiroSharkIntegrationView run={run} />
        </>
      );
    case "polymarket":
      return (
        <>
          {wrap("polymarket · result board", "rgba(94,234,212,0.08)", <PolymarketView run={run} market={market} />)}
          <MiroSharkIntegrationView run={run} />
        </>
      );
    case "market-maker":
    case "custom":
    default:
      return (
        <>
          <div className="relative grid place-items-center"
            style={{
              borderRadius: 14, border: "1px solid rgba(148,163,184,0.16)",
              background: "radial-gradient(ellipse at center, rgba(255,212,90,0.06), transparent 60%), var(--panel-bg)",
              padding: "44px 18px 22px", minHeight: 540,
            }}>
            <div className="absolute flex items-center" style={{ top: 14, left: 16, gap: 10 }}>
              <span className={`${styles.dot} ${styles.dotLive}`} style={{ color: "var(--accent)" }} />
              <span className={styles.monoCap} style={{ color: "var(--hex-active-border)" }}>theater · {run.state}</span>
              <span className={styles.monoCap} style={{ color: "var(--muted)" }}>{run.title}</span>
            </div>
            <div className="absolute flex flex-wrap justify-end" style={{ right: 16, bottom: 14, gap: 6 }}>
              {["pause", "speed +", "speed −", "stop"].map((b) => (
                <button key={b} className="uppercase cursor-pointer" style={{
                  fontFamily: "var(--f-mono)", fontSize: 10, padding: "5px 10px", borderRadius: 999,
                  background: "transparent", color: "var(--muted)",
                  border: "1px solid rgba(148,163,184,0.16)", letterSpacing: 0.1,
                }}>{b}</button>
              ))}
            </div>
            <Arena run={run} agents={agents} decisions={decisions} />
          </div>
          <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)", gap: 16 }}>
            <MarketPanel data={market} />
            <SocialPanel posts={socialPosts} />
          </div>
          <HeadlinesPanel headlines={market.headlines} />
          <MiroSharkIntegrationView run={run} />
        </>
      );
  }
}

function EmptyStage({ statusLabel }: { statusLabel: string }) {
  return (
    <div className="grid place-items-center text-center"
      style={{
        borderRadius: 14, border: "1px solid rgba(148,163,184,0.16)",
        background: "var(--panel-bg)", minHeight: 540, padding: 28,
      }}>
      <div>
        <div className={styles.monoCap} style={{ color: "var(--hex-active-border)" }}>MiroShark {statusLabel}</div>
        <h2 className="font-bold" style={{ margin: "10px 0 6px", fontFamily: "var(--f-display)", fontSize: 28 }}>
          No swarm runs loaded
        </h2>
        <p style={{ margin: 0, color: "var(--muted)", maxWidth: 460 }}>
          Connect MiroShark or load a saved simulation to populate the theater with real runs, agents, posts, and events.
        </p>
      </div>
    </div>
  );
}

function LoadingStage({ label }: { label: string }) {
  return (
    <div className={styles.loadingStage}>
      <div className={styles.loadingCard}>
        <div className={styles.loadingComb} aria-hidden="true">
          {Array.from({ length: 9 }).map((_, index) => (
            <span key={index} style={{ animationDelay: `${index * 90}ms` }} />
          ))}
        </div>
        <div className={styles.monoCap} style={{ color: "var(--hex-active-border)" }}>
          MiroShark is working
        </div>
        <h2>{label}</h2>
        <p>
          Preparing the theater, run shelf, and output surfaces for the latest simulation data.
        </p>
        <div className={styles.loadingRail} aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  );
}

function BigStat({ n, label, tone }: { n: number; label: string; tone?: "cyan" | "honey" | "danger" }) {
  const color =
    tone === "cyan"   ? "var(--hex-active-border)" :
    tone === "honey"  ? "var(--hex-honey-border)" :
    tone === "danger" ? "var(--danger)" :
                        "var(--foreground)";
  return (
    <div className="text-right">
      <div className="font-bold" style={{
        fontFamily: "var(--f-display)", fontSize: 36, color, lineHeight: 1, letterSpacing: -1,
      }}>{n}</div>
      <div className={styles.monoCap} style={{ color: "var(--muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}
