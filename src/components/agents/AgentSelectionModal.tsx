"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Search } from "lucide-react";
import { BeeIcon } from "@/components/fleet/bee-icon";
import { CloseIconButton } from "@/components/ui/close-icon-button";
import { renderAgentKey } from "@/features/fleet/fleet-identity";
import { beeWorkerPreset } from "@/lib/config/bee-worker-presets";
import { beeWorkerClassLabel } from "@/lib/services/orchestration/bee-roles";
import type { AgentProfile, AgentRuntime } from "@/lib/types/agent-runtime";
import { RUNTIME_LABELS } from "@/lib/types/agent-runtime";
import styles from "./AgentSelectionModal.module.css";

type AgentRuntimeModelSelection = {
  provider: string;
  model: string;
  providers: Array<{
    slug: string;
    name: string;
    models: Array<{ id: string; name?: string }>;
  }>;
};

type RankedAgent = {
  agent: AgentProfile;
  classLabel: string;
  provider: string;
  model: string;
  skills: string[];
  prompt: string;
  summary: string;
  score: number;
};

type AgentSelectionModalProps = {
  open: boolean;
  agents: AgentProfile[];
  runtimeModelsByRuntime?: Partial<Record<AgentRuntime, AgentRuntimeModelSelection>>;
  selectedAgentId?: string;
  title?: string;
  description?: string;
  onClose: () => void;
  onSelect: (agentId: string) => void;
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, " ").trim();
}

function agentMachineName(agent: AgentProfile) {
  return agent.machineName?.trim() || "local";
}

function agentSearchRecord(
  agent: AgentProfile,
  runtimeModelsByRuntime: Partial<Record<AgentRuntime, AgentRuntimeModelSelection>> = {},
): Omit<RankedAgent, "score"> {
  const customWorker = agent.customWorkerClass
    ?? agent.customWorkerClasses?.find((workerClass) => workerClass.id === agent.selectedCustomWorkerClassId);
  const preset = beeWorkerPreset(agent.workerClass ?? "general");
  const classLabel = customWorker?.label || beeWorkerClassLabel(agent.workerClass);
  const runtimeModels = runtimeModelsByRuntime[agent.runtime];
  const providerSlug = agent.provider?.trim() || runtimeModels?.provider?.trim() || "";
  const providerMatch = runtimeModels?.providers.find((provider) => provider.slug === providerSlug);
  const modelId = agent.model?.trim() || runtimeModels?.model?.trim() || "";
  const modelMatch = providerMatch?.models.find((model) => model.id === modelId);
  const skills = agent.preferredSkillSlugs?.length
    ? agent.preferredSkillSlugs
    : customWorker?.preferredSkillSlugs?.length
      ? customWorker.preferredSkillSlugs
      : preset.skillSlugs;
  return {
    agent,
    classLabel,
    provider: providerMatch?.name || providerSlug || "Not set",
    model: modelMatch?.name || modelId || "Not set",
    skills,
    prompt: agent.skillProfilePrompt?.trim() || customWorker?.skillProfilePrompt || preset.taskProfile,
    summary: customWorker ? "Custom worker class" : preset.summary,
  };
}

function fieldScore(query: string, value: string, base: number) {
  const normalized = normalize(value);
  if (!normalized || !query) return 0;
  if (normalized === query) return base + 12;
  if (normalized.startsWith(query)) return base + 8;
  if (normalized.includes(query)) return base;
  return 0;
}

function scoreAgent(record: Omit<RankedAgent, "score">, query: string) {
  if (!query) return 1;
  return Math.max(
    fieldScore(query, record.agent.name, 100),
    fieldScore(query, record.classLabel, 78),
    ...record.skills.map((skill) => fieldScore(query, skill, 58)),
    fieldScore(query, RUNTIME_LABELS[record.agent.runtime], 36),
    fieldScore(query, record.provider, 34),
    fieldScore(query, record.model, 32),
    fieldScore(query, record.prompt, 24),
    fieldScore(query, record.summary, 22),
  );
}

export function AgentSelectionModal({
  open,
  agents,
  runtimeModelsByRuntime,
  selectedAgentId,
  title = "Choose Agent",
  description = "Search by name, class, skills, runtime, provider, or model.",
  onClose,
  onSelect,
}: AgentSelectionModalProps) {
  const [query, setQuery] = useState("");
  const [selectedMachine, setSelectedMachine] = useState("all");
  const [expandedAgentId, setExpandedAgentId] = useState(selectedAgentId ?? agents[0]?.id ?? "");
  const machineOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const agent of agents) {
      const machine = agentMachineName(agent);
      counts.set(machine, (counts.get(machine) ?? 0) + 1);
    }
    return [
      { id: "all", label: "All machines", count: agents.length },
      ...[...counts.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([label, count]) => ({ id: label, label, count })),
    ];
  }, [agents]);
  const activeSelectedMachine = machineOptions.some((machine) => machine.id === selectedMachine) ? selectedMachine : "all";
  const activeExpandedAgentId = expandedAgentId || selectedAgentId || agents[0]?.id || "";
  const rankedAgents = useMemo(() => {
    const normalizedQuery = normalize(query);
    return agents
      .filter((agent) => activeSelectedMachine === "all" || agentMachineName(agent) === activeSelectedMachine)
      .map((agent) => agentSearchRecord(agent, runtimeModelsByRuntime))
      .map((record) => ({ ...record, score: scoreAgent(record, normalizedQuery) }))
      .filter((record) => !normalizedQuery || record.score > 0)
      .sort((left, right) => right.score - left.score || left.agent.name.localeCompare(right.agent.name));
  }, [activeSelectedMachine, agents, query, runtimeModelsByRuntime]);

  if (!open || typeof document === "undefined") return null;

  return createPortal((
    <div className={styles.backdrop} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="agent-selection-title">
        <header className={styles.header}>
          <div className={styles.titleRow}>
            <div>
              <p className={styles.eyebrow}>Agent picker</p>
              <h2 id="agent-selection-title">{title}</h2>
              <p>{description}</p>
            </div>
            <CloseIconButton className={styles.iconButton} onClick={onClose} aria-label="Close agent picker" />
          </div>
          <label className={styles.searchBox}>
            <Search size={18} aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search agents, classes, skills, runtimes, providers, models..."
            />
          </label>
          <div className={styles.machineFilters} aria-label="Filter agents by machine">
            {machineOptions.map((machine) => (
              <button
                key={machine.id}
                type="button"
                className={activeSelectedMachine === machine.id ? styles.activeMachineFilter : ""}
                onClick={() => setSelectedMachine(machine.id)}
              >
                <span>{machine.label}</span>
                <strong>{machine.count}</strong>
              </button>
            ))}
          </div>
        </header>

        <div className={styles.grid}>
          {rankedAgents.length ? rankedAgents.map(({ agent, classLabel, provider, model, skills, prompt, summary }, agentIndex) => {
            const expanded = activeExpandedAgentId === agent.id;
            const selected = selectedAgentId === agent.id;
            const customWorker = agent.customWorkerClass
              ?? agent.customWorkerClasses?.find((workerClass) => workerClass.id === agent.selectedCustomWorkerClassId);
            return (
              <article
                key={renderAgentKey(agent, agentIndex)}
                className={[
                  styles.card,
                  selected ? styles.selected : "",
                  expanded ? styles.expanded : "",
                ].filter(Boolean).join(" ")}
                onClick={() => setExpandedAgentId(agent.id)}
              >
                <div className={styles.top}>
                  <div className={styles.avatar}>
                    {customWorker?.imageSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className={styles.customAvatar} src={customWorker.imageSrc} alt="" />
                    ) : (
                      <BeeIcon role={agent.beeRole === "queen" ? "queen" : "worker"} workerClass={agent.workerClass} size={36} />
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h3 className={styles.agentName}>{agent.name}</h3>
                    <p className={styles.classLabel}>{classLabel}</p>
                  </div>
                  {selected ? <span className={styles.selectedMark}><Check size={15} aria-hidden="true" /></span> : null}
                </div>

                <div className={styles.meta}>
                  <div className={styles.metaItem}>
                    <span>Runtime</span>
                    <strong>{RUNTIME_LABELS[agent.runtime]}</strong>
                  </div>
                  <div className={styles.metaItem}>
                    <span>Provider</span>
                    <strong>{provider}</strong>
                  </div>
                  <div className={styles.metaItem}>
                    <span>Model</span>
                    <strong>{model}</strong>
                  </div>
                </div>

                <div className={styles.skills}>
                  {skills.slice(0, expanded ? 12 : 5).map((skill) => <code key={skill}>{skill}</code>)}
                  {!expanded && skills.length > 5 ? <code>+{skills.length - 5}</code> : null}
                </div>

                <div className={styles.extra}>
                  <p className={styles.summary}>{summary}</p>
                  <p className={styles.prompt}>{prompt}</p>
                  <div className={styles.actions}>
                    <span className={styles.hint}>{agent.machineName ? `Machine: ${agent.machineName}` : `Agent id: ${agent.agentId || agent.id}`}</span>
                    <button
                      type="button"
                      className={styles.selectButton}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelect(agent.id);
                        onClose();
                      }}
                    >
                      Use this agent
                    </button>
                  </div>
                </div>
              </article>
            );
          }) : (
            <div className={styles.empty}>No agents match that search.</div>
          )}
        </div>
      </section>
    </div>
  ), document.body);
}
