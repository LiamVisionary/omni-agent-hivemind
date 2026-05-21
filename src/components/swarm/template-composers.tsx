// src/components/swarm/template-composers.tsx
"use client";

import * as React from "react";
import type { SwarmTemplateField, TemplateId } from "./swarm-data";
import styles from "./swarm-tokens.module.css";

type TemplateComposerProps = {
  templateId: TemplateId;
  draftScenario: string;
  draftRounds: number;
  draftPlatform: string;
  templateFields: SwarmTemplateField[];
  templateInputs: Record<string, string>;
  missingTemplateFields: number;
  runPending: boolean;
  helperPending: "ask" | "suggest" | "";
  helperStatus: string;
  onDraftScenarioChange?: (value: string) => void;
  onDraftRoundsChange?: (value: number) => void;
  onDraftPlatformChange?: (value: string) => void;
  onTemplateInputChange?: (key: string, value: string) => void;
  onStartRun?: () => void;
  onAskScenario?: () => void;
  onSuggestScenarios?: () => void;
};

const composerSection: React.CSSProperties = { display: "grid", gap: 10 };
const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 80,
  padding: "10px 12px",
  borderRadius: 8,
  resize: "vertical",
  border: "1px solid rgba(148,163,184,0.22)",
  background: "var(--panel-bg-soft)",
  color: "var(--foreground)",
  fontFamily: "var(--f-mono)",
  fontSize: 12.5,
  lineHeight: 1.5,
  outline: "none",
};
const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 7,
  border: "1px solid rgba(148,163,184,0.22)",
  background: "var(--panel-bg-soft)",
  color: "var(--foreground)",
  fontSize: 12,
  outline: "none",
};
const iconBtn: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 5,
  padding: 0,
  cursor: "pointer",
  border: "1px solid rgba(148,163,184,0.22)",
  background: "transparent",
  color: "var(--muted)",
  fontFamily: "var(--f-mono)",
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1,
};

function Lbl({ children }: { children: React.ReactNode }) {
  return <span className={styles.monoCap} style={{ color: "var(--muted)", display: "block", marginBottom: 6 }}>{children}</span>;
}

function Field({
  label,
  value,
  placeholder,
  mono,
  onChange,
}: {
  label: string;
  value: string | number;
  placeholder?: string;
  mono?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <Lbl>{label}</Lbl>
      <input
        value={String(value)}
        onChange={(event) => onChange?.(event.target.value)}
        readOnly={!onChange}
        placeholder={placeholder}
        style={{ ...inputStyle, fontFamily: mono ? "var(--f-mono)" : "inherit" }}
      />
    </label>
  );
}

function Launch({
  label,
  danger,
  disabled,
  onClick,
}: {
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center cursor-pointer uppercase font-bold disabled:cursor-not-allowed"
      style={{
        gap: 8,
        padding: "11px 14px",
        borderRadius: 8,
        border: `1px solid ${danger ? "rgba(251,113,133,0.55)" : "rgba(94,234,212,0.55)"}`,
        background: disabled
          ? "rgba(148,163,184,0.10)"
          : danger ? "rgba(251,113,133,0.18)" : "rgba(45,212,191,0.18)",
        color: disabled ? "var(--muted)" : danger ? "#fecdd3" : "var(--hex-active-border)",
        fontFamily: "var(--f-mono)",
        fontSize: 12,
        letterSpacing: 0.06,
      }}
    >
      {label}
    </button>
  );
}

function HelperRow({
  draftScenario,
  helperPending,
  helperStatus,
  onAskScenario,
  onSuggestScenarios,
}: Pick<TemplateComposerProps, "draftScenario" | "helperPending" | "helperStatus" | "onAskScenario" | "onSuggestScenarios">) {
  return (
    <div style={{ display: "grid", gap: 7 }}>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button
          type="button"
          onClick={onAskScenario}
          disabled={!!helperPending || !draftScenario.trim()}
          className="uppercase font-bold cursor-pointer disabled:cursor-not-allowed"
          style={{
            border: "1px solid rgba(94,234,212,0.34)",
            borderRadius: 8,
            background: helperPending === "ask" ? "rgba(148,163,184,0.12)" : "rgba(94,234,212,0.10)",
            color: helperPending ? "var(--muted)" : "var(--hex-active-border)",
            padding: "8px 9px",
            fontFamily: "var(--f-mono)",
            fontSize: 10,
            letterSpacing: 0.08,
          }}
        >
          {helperPending === "ask" ? "Asking..." : "Ask MiroShark"}
        </button>
        <button
          type="button"
          onClick={onSuggestScenarios}
          disabled={!!helperPending || !draftScenario.trim()}
          className="uppercase font-bold cursor-pointer disabled:cursor-not-allowed"
          style={{
            border: "1px solid rgba(148,163,184,0.22)",
            borderRadius: 8,
            background: helperPending === "suggest" ? "rgba(148,163,184,0.12)" : "transparent",
            color: helperPending ? "var(--muted)" : "var(--foreground)",
            padding: "8px 9px",
            fontFamily: "var(--f-mono)",
            fontSize: 10,
            letterSpacing: 0.08,
          }}
        >
          {helperPending === "suggest" ? "Suggesting..." : "Suggest"}
        </button>
      </div>
      {helperStatus ? <small style={{ color: "var(--muted)", fontSize: 11, lineHeight: 1.35 }}>{helperStatus}</small> : null}
    </div>
  );
}

function RunControls({
  draftRounds,
  draftPlatform,
  onDraftRoundsChange,
  onDraftPlatformChange,
}: Pick<TemplateComposerProps, "draftRounds" | "draftPlatform" | "onDraftRoundsChange" | "onDraftPlatformChange">) {
  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      <label className={styles.monoCap} style={{ display: "grid", gap: 5, color: "var(--muted)" }}>
        Rounds
        <input
          type="number"
          min={1}
          max={24}
          value={draftRounds}
          onChange={(event) => onDraftRoundsChange?.(Math.max(1, Math.min(24, Number(event.target.value) || 1)))}
          style={{ ...inputStyle, width: "100%", fontFamily: "var(--f-mono)" }}
        />
      </label>
      <label className={styles.monoCap} style={{ display: "grid", gap: 5, color: "var(--muted)" }}>
        Surfaces
        <select
          value={draftPlatform}
          onChange={(event) => onDraftPlatformChange?.(event.target.value)}
          style={{ ...inputStyle, width: "100%", fontFamily: "var(--f-mono)" }}
        >
          <option value="twitter">X</option>
          <option value="reddit">Reddit</option>
          <option value="polymarket">Polymarket</option>
          <option value="parallel">Parallel</option>
        </select>
      </label>
    </div>
  );
}

function ScenarioPreview({
  draftScenario,
  onDraftScenarioChange,
}: Pick<TemplateComposerProps, "draftScenario" | "onDraftScenarioChange">) {
  return (
    <details>
      <summary className={styles.monoCap} style={{ color: "var(--muted)", cursor: "pointer" }}>
        Scenario preview
      </summary>
      <textarea
        value={draftScenario}
        onChange={(event) => onDraftScenarioChange?.(event.target.value)}
        rows={5}
        style={{ ...textareaStyle, marginTop: 8, minHeight: 120 }}
      />
    </details>
  );
}

function GenericFieldForm({
  templateFields,
  templateInputs,
  onTemplateInputChange,
}: Pick<TemplateComposerProps, "templateFields" | "templateInputs" | "onTemplateInputChange">) {
  if (!templateFields.length) return null;
  return (
    <div style={{ display: "grid", gap: 9 }}>
      {templateFields.map((field) => (
        <label key={field.key} style={{ display: "grid", gap: 5 }}>
          <span className={styles.monoCap} style={{ color: field.required ? "var(--hex-honey-border)" : "var(--muted)" }}>
            {field.label}{field.required ? " *" : ""}
          </span>
          {field.kind === "textarea" ? (
            <textarea
              value={templateInputs[field.key] ?? ""}
              onChange={(event) => onTemplateInputChange?.(field.key, event.target.value)}
              rows={3}
              placeholder={field.placeholder}
              style={{ ...textareaStyle, minHeight: 74, background: "rgba(2,6,12,0.62)" }}
            />
          ) : (
            <input
              value={templateInputs[field.key] ?? ""}
              onChange={(event) => onTemplateInputChange?.(field.key, event.target.value)}
              placeholder={field.placeholder}
              style={{ ...inputStyle, width: "100%", background: "rgba(2,6,12,0.62)" }}
            />
          )}
          {field.help ? <small style={{ color: "var(--muted)", fontSize: 11, lineHeight: 1.35 }}>{field.help}</small> : null}
        </label>
      ))}
    </div>
  );
}

function composerLaunchLabel(templateId: TemplateId, runPending: boolean, missingTemplateFields: number) {
  if (runPending) return "Launching...";
  if (missingTemplateFields > 0) return `${missingTemplateFields} required missing`;
  if (templateId === "reddit-narrative") return "Launch cascade";
  if (templateId === "research-swarm") return "Launch readers";
  if (templateId === "ops") return "Launch storm";
  if (templateId === "custom") return "Launch blank";
  return "Launch market";
}

function ComposerFooter(props: TemplateComposerProps & { danger?: boolean }) {
  const disabled = props.runPending || !props.draftScenario.trim() || props.missingTemplateFields > 0;
  return (
    <>
      <HelperRow {...props} />
      <RunControls {...props} />
      <ScenarioPreview {...props} />
      <Launch
        danger={props.danger}
        disabled={disabled}
        onClick={props.onStartRun}
        label={composerLaunchLabel(props.templateId, props.runPending, props.missingTemplateFields)}
      />
    </>
  );
}

export function MarketMakerComposer(props: TemplateComposerProps) {
  const shocks = ["CPI hot", "Fed dovish", "Geopolitical", "Liquidity drain"];
  const currentShock = props.templateInputs.shock ?? "";
  return (
    <section style={composerSection}>
      <Field
        label="Instrument"
        value={props.templateInputs.instrument ?? ""}
        placeholder="ZN1 (10Y T-Note futures)"
        onChange={(value) => props.onTemplateInputChange?.("instrument", value)}
      />
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Field
          label="MM count"
          value={props.templateInputs.agents?.match(/market makers?:? ?([^,;]+)/i)?.[1] ?? "12"}
          mono
          onChange={(value) => props.onTemplateInputChange?.("agents", `Market makers: ${value}; takers: ${props.templateInputs.agents?.match(/takers?:? ?([^,;]+)/i)?.[1] ?? "8"}`)}
        />
        <Field
          label="TKR count"
          value={props.templateInputs.agents?.match(/takers?:? ?([^,;]+)/i)?.[1] ?? "8"}
          mono
          onChange={(value) => props.onTemplateInputChange?.("agents", `Market makers: ${props.templateInputs.agents?.match(/market makers?:? ?([^,;]+)/i)?.[1] ?? "12"}; takers: ${value}`)}
        />
        <Field label="Spread (bp)" value="1.5" mono />
        <Field label="Shock (sigma)" value="2.0" mono />
      </div>
      <div>
        <Lbl>Shock</Lbl>
        <div className="flex flex-wrap" style={{ gap: 6 }}>
          {shocks.map((shock) => {
            const active = currentShock === shock;
            return (
              <button
                key={shock}
                type="button"
                onClick={() => props.onTemplateInputChange?.("shock", shock)}
                className="uppercase font-bold cursor-pointer"
                style={{
                  padding: "6px 11px",
                  borderRadius: 999,
                  border: `1px solid ${active ? "var(--hex-honey-border)" : "rgba(148,163,184,0.16)"}`,
                  background: active ? "rgba(255,212,90,0.14)" : "transparent",
                  color: active ? "var(--hex-honey-border)" : "var(--muted)",
                  fontFamily: "var(--f-mono)",
                  fontSize: 10,
                  letterSpacing: 0.08,
                }}
              >
                {shock}
              </button>
            );
          })}
        </div>
      </div>
      <Field
        label="Prediction question"
        value={props.templateInputs.question ?? ""}
        placeholder="What binary market or price belief should move?"
        onChange={(value) => props.onTemplateInputChange?.("question", value)}
      />
      <ComposerFooter {...props} />
    </section>
  );
}

export function RedditNarrativeComposer(props: TemplateComposerProps) {
  return (
    <section style={composerSection}>
      <Field
        label="Subreddit"
        value={props.templateInputs.community ?? ""}
        placeholder="r/wallstreetbets"
        onChange={(value) => props.onTemplateInputChange?.("community", value)}
      />
      <div>
        <Lbl>Seed comment</Lbl>
        <textarea
          value={props.templateInputs.seed ?? ""}
          onChange={(event) => props.onTemplateInputChange?.("seed", event.target.value)}
          placeholder="just got 3000 shares of NVDA at $812, earnings tomorrow lfg"
          rows={3}
          style={textareaStyle}
        />
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Field label="Cascade depth" value={4} mono />
        <Field label="Replies/level" value={6} mono />
      </div>
      <Field
        label="Debate fault line"
        value={props.templateInputs.conflict ?? ""}
        placeholder="What factions form in replies?"
        onChange={(value) => props.onTemplateInputChange?.("conflict", value)}
      />
      <ComposerFooter {...props} />
    </section>
  );
}

export function PolymarketComposer(props: TemplateComposerProps) {
  const oddsMatch = props.templateInputs.initialOdds?.match(/(\d+)/);
  const pct = Math.max(0, Math.min(100, Number(oddsMatch?.[1] ?? 62) || 62));
  return (
    <section style={composerSection}>
      <div>
        <Lbl>Binary question</Lbl>
        <textarea
          value={props.templateInputs.question ?? ""}
          onChange={(event) => props.onTemplateInputChange?.("question", event.target.value)}
          placeholder="Will the Fed cut rates by 25bp at the July FOMC meeting?"
          rows={2}
          style={textareaStyle}
        />
      </div>
      <div>
        <Lbl>Current odds - YES</Lbl>
        <div className="flex items-center" style={{ gap: 12 }}>
          <input
            type="range"
            min={0}
            max={100}
            value={pct}
            onChange={(event) => props.onTemplateInputChange?.("initialOdds", `YES ${event.target.value}c / NO ${100 - Number(event.target.value)}c`)}
            style={{ flex: 1, accentColor: "var(--accent)" }}
          />
          <span className="font-bold text-right" style={{
            fontFamily: "var(--f-display)",
            fontSize: 22,
            color: "var(--hex-active-border)",
            minWidth: 56,
          }}>{pct}c</span>
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Field label="Agents" value={48} mono />
        <Field label="News shocks" value={props.templateInputs.news ? 3 : 0} mono />
      </div>
      <div>
        <Lbl>News shocks</Lbl>
        <textarea
          value={props.templateInputs.news ?? ""}
          onChange={(event) => props.onTemplateInputChange?.("news", event.target.value)}
          placeholder="What headlines should agents react to?"
          rows={3}
          style={textareaStyle}
        />
      </div>
      <ComposerFooter {...props} />
    </section>
  );
}

export function ResearchSwarmComposer(props: TemplateComposerProps) {
  const sources = (props.templateInputs.sources ?? "").split("\n").filter(Boolean);
  const setSources = (next: string[]) => props.onTemplateInputChange?.("sources", next.join("\n"));
  return (
    <section style={composerSection}>
      <Field
        label="Research question"
        value={props.templateInputs.question ?? ""}
        placeholder="What evidence should the swarm synthesize?"
        onChange={(value) => props.onTemplateInputChange?.("question", value)}
      />
      <div>
        <Lbl>Sources</Lbl>
        <div className="grid" style={{ gap: 6 }}>
          {(sources.length ? sources : [""]).map((source, index) => (
            <div key={index} className="grid items-center" style={{
              gridTemplateColumns: "1fr auto",
              gap: 6,
              padding: "8px 10px",
              borderRadius: 7,
              border: "1px solid rgba(148,163,184,0.22)",
              background: "var(--panel-bg-soft)",
            }}>
              <input
                value={source}
                onChange={(event) => {
                  const next = sources.length ? [...sources] : [""];
                  next[index] = event.target.value;
                  setSources(next);
                }}
                placeholder="https://"
                style={{ border: 0, background: "transparent", color: "var(--hex-active-border)", outline: 0, fontFamily: "var(--f-mono)", fontSize: 11 }}
              />
              <button onClick={() => setSources(sources.filter((_, itemIndex) => itemIndex !== index))} style={iconBtn} aria-label="Remove source">x</button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setSources([...sources, "https://"])}
            className="uppercase font-bold cursor-pointer"
            style={{
              padding: "8px 10px",
              borderRadius: 7,
              border: "1px dashed var(--hex-add-stroke)",
              background: "transparent",
              color: "var(--hex-active-border)",
              fontFamily: "var(--f-mono)",
              fontSize: 11,
              letterSpacing: 0.06,
            }}
          >
            + add source
          </button>
        </div>
      </div>
      <Field
        label="Brief path"
        value={props.templateInputs.deliverable ?? ""}
        placeholder="briefs/2026-05-21-cpi.md"
        onChange={(value) => props.onTemplateInputChange?.("deliverable", value)}
      />
      <ComposerFooter {...props} />
    </section>
  );
}

export function OpsComposer(props: TemplateComposerProps) {
  const failures = ["vault conflict storm", "tailnet partition", "stale env keys", "GH-Actions throttle"];
  const activeFailure = props.templateInputs.failure ?? "";
  return (
    <section style={composerSection}>
      <Field
        label="System"
        value={props.templateInputs.system ?? ""}
        placeholder="Obsidian sync, agent queue, wallet ledger, scheduler"
        onChange={(value) => props.onTemplateInputChange?.("system", value)}
      />
      <div>
        <Lbl>Failure profile</Lbl>
        <div className="grid" style={{ gap: 6 }}>
          {failures.map((failure) => {
            const active = activeFailure === failure;
            return (
              <button
                key={failure}
                type="button"
                onClick={() => props.onTemplateInputChange?.("failure", failure)}
                className="grid text-left cursor-pointer font-bold"
                style={{
                  gridTemplateColumns: "16px 1fr",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 7,
                  border: `1px solid ${active ? "rgba(251,113,133,0.42)" : "rgba(148,163,184,0.16)"}`,
                  background: active ? "rgba(251,113,133,0.10)" : "transparent",
                  color: active ? "#fecdd3" : "var(--foreground)",
                  fontFamily: "var(--f-mono)",
                  fontSize: 12,
                }}
              >
                <span className={active ? `${styles.dot} ${styles.dotLive}` : styles.dot} style={{ color: "var(--danger)" }} />
                {failure}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Field
          label="Intensity"
          value={props.templateInputs.intensity ?? ""}
          placeholder="2 sigma"
          mono
          onChange={(value) => props.onTemplateInputChange?.("intensity", value)}
        />
        <Field
          label="Success"
          value={props.templateInputs.success ?? ""}
          placeholder="What survives?"
          onChange={(value) => props.onTemplateInputChange?.("success", value)}
        />
      </div>
      <ComposerFooter {...props} danger />
    </section>
  );
}

export function CustomComposer(props: TemplateComposerProps) {
  return (
    <section style={composerSection}>
      <div>
        <Lbl>Scenario</Lbl>
        <textarea
          value={props.templateInputs.scenario ?? props.draftScenario}
          onChange={(event) => props.onTemplateInputChange?.("scenario", event.target.value)}
          placeholder="Describe an empty world. Anything goes."
          rows={8}
          style={{ ...textareaStyle, minHeight: 200 }}
        />
      </div>
      <RunControls {...props} />
      <HelperRow {...props} />
      <Launch
        disabled={props.runPending || !props.draftScenario.trim() || props.missingTemplateFields > 0}
        onClick={props.onStartRun}
        label={composerLaunchLabel(props.templateId, props.runPending, props.missingTemplateFields)}
      />
    </section>
  );
}

export function GenericTemplateComposer(props: TemplateComposerProps) {
  return (
    <section style={composerSection}>
      <GenericFieldForm {...props} />
      <textarea
        value={props.draftScenario}
        onChange={(event) => props.onDraftScenarioChange?.(event.target.value)}
        rows={props.templateFields.length ? 5 : 8}
        style={{ ...textareaStyle, background: "rgba(2,6,12,0.62)" }}
      />
      <ComposerFooter {...props} />
    </section>
  );
}

export function TemplateComposer(props: TemplateComposerProps) {
  if (props.templateId === "market-maker") return <MarketMakerComposer {...props} />;
  if (props.templateId === "reddit-narrative") return <RedditNarrativeComposer {...props} />;
  if (props.templateId === "polymarket") return <PolymarketComposer {...props} />;
  if (props.templateId === "research-swarm") return <ResearchSwarmComposer {...props} />;
  if (props.templateId === "ops") return <OpsComposer {...props} />;
  if (props.templateId === "custom") return <CustomComposer {...props} />;
  return <GenericTemplateComposer {...props} />;
}
