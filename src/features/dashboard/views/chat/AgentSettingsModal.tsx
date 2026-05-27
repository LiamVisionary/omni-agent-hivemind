// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
"use client";

import { createPortal } from "react-dom";
import { CloseIconButton } from "@/components/ui/close-icon-button";

export function AgentSettingsModal(props: any) {
  const { BEE_WORKER_PRESET_LIST, BrainCircuit, Button, Check, ChevronRight, Copy, Cpu, Eye, FolderOpen, HERMES_UPDATE_INTEGRATION_KEYS, Image, KanbanSquare, LoaderCircle, MessageSquare, Pencil, PlugZap, Plus, RUNTIME_LABELS, RefreshCcw, Repeat2, Search, Send, Settings2, ShieldCheck, Sparkles, Upload, addHermesModelFromDraft, agentCreateDraft, agentCreateMachine, agentRenameDraft, agentRenameEditing, agentRuntimeAdvancedOpen, agentRuntimeFolderBrowsing, agentRuntimeFolderEditing, agentRuntimeFolderStatus, agentSettingsCustomWorker, agentSettingsCustomWorkers, agentSettingsDescription, agentSettingsIntegrationTarget, agentSettingsPanel, agentSettingsPreferredSkills, agentSettingsProvider, agentSettingsRuntime, agentSettingsSelectedCustomWorkerId, agentSettingsSkillProfile, agentSettingsTitle, agentSettingsWorkerClass, agentSettingsWorkerImage, agentSettingsWorkerLabel, agentSettingsWorkerPreset, agentWorkerClassView, applyCustomWorkerClass, beeRoleIconPath, browseAgentRuntimeFolder, closeAgentSettingsModal, createAgentFromModal, customWorkerDraft, customWorkerImageError, customWorkerImageInputRef, customWorkerSkillSearch, filteredCustomWorkerSkills, fleetClass, hermesUpdateRequired, openCustomWorkerClassCreator, providerIconPath, providerIconRenderMode, refreshRuntimeIntegrations, roleModalAgent, runRuntimeIntegrationAction, runtimeAvailability, runtimeBackgroundPrompt, runtimeCapabilities, runtimeIconFallback, runtimeIconPath, runtimeIconRenderMode, runtimeIntegrationBusy, runtimeIntegrationMessage, runtimeIntegrationStatus, runtimeModelDraft, runtimeModelProviders, runtimeModelSelection, runtimeModelSetupMode, runtimeSessionQuery, runtimeSessionResults, runtimeSetupDefinition, runtimeSetupKey, runtimeUpdateConfirmKey, searchRuntimeSessionsForAgent, selectAgentWorkerClass, selectCustomWorkerClass, selectedRuntimeModelId, selectedRuntimeModels, selectedRuntimeProvider, setAgentCreateDraft, setAgentRenameDraft, setAgentRenameEditing, setAgentRuntimeAdvancedOpen, setAgentRuntimeFolderEditing, setAgentRuntimeFolderStatus, setAgentSettingsPanel, setAgentWorkerClassView, setCustomWorkerDraft, setCustomWorkerSkillSearch, setRuntimeBackgroundPrompt, setRuntimeModelDraft, setRuntimeModelSetupMode, setRuntimeSessionQuery, setRuntimeSetupKey, setRuntimeUpdateConfirmKey, sharedVault, startAgentChat, toggleCustomWorkerSkill, updateAgentProfile, updateAgentRuntimeModel, updateAgentSkillProfile, uploadCustomWorkerImage, workerCapabilityBadges } = props;
  const portalTarget = typeof document === "undefined" ? null : document.body;
  const adaptiveModalities = [
    { id: "text", label: "Text" },
    { id: "image", label: "Image" },
    { id: "file", label: "File" },
    { id: "audio", label: "Audio" },
    { id: "video", label: "Video" },
  ];
  const adaptiveCategories = [
    { id: "general", label: "General" },
    { id: "coding", label: "Coding" },
    { id: "writing", label: "Writing" },
    { id: "vision", label: "Vision" },
    { id: "image", label: "Image" },
    { id: "research", label: "Research" },
    { id: "tool-use", label: "Tools" },
  ];
  const defaultAdaptiveOpenRouter = {
    inputModalities: ["text"],
    minContextLength: 32000,
    categories: ["general"],
    minScores: {},
    fallbackModel: "",
  };
  const adaptiveOpenRouter = {
    ...defaultAdaptiveOpenRouter,
    ...(agentCreateMachine ? agentCreateDraft.adaptiveOpenRouter : roleModalAgent?.adaptiveOpenRouter),
  };
  const openRouterSelected = (selectedRuntimeProvider?.slug || agentSettingsProvider) === "openrouter";
  const adaptiveSelected = openRouterSelected && selectedRuntimeModelId === "adaptive";
  const adaptiveScoreCategories = adaptiveCategories.filter((category) => (
    adaptiveOpenRouter.categories.includes(category.id)
    || (category.id === "vision" && adaptiveOpenRouter.inputModalities.includes("image"))
    || (category.id === "image" && adaptiveOpenRouter.inputModalities.includes("image"))
  ));
  const updateAdaptiveOpenRouter = (patch: Record<string, unknown>) => {
    const next = { ...adaptiveOpenRouter, ...patch };
    if (agentCreateMachine) setAgentCreateDraft((current) => ({ ...current, adaptiveOpenRouter: next }));
    else if (roleModalAgent) updateAgentProfile(roleModalAgent.id, { adaptiveOpenRouter: next });
  };
  const toggleAdaptiveListValue = (key: "inputModalities" | "categories", value: string) => {
    const current = adaptiveOpenRouter[key] ?? [];
    const next = current.includes(value)
      ? current.filter((item: string) => item !== value)
      : [...current, value];
    updateAdaptiveOpenRouter({ [key]: next.length ? next : key === "inputModalities" ? ["text"] : ["general"] });
  };
  const updateAdaptiveScore = (category: string, value: number) => {
    updateAdaptiveOpenRouter({
      minScores: {
        ...adaptiveOpenRouter.minScores,
        [category]: value,
      },
    });
  };

  const updateSettingsRuntime = (runtime: AgentRuntime) => {
    if (runtimeAvailability?.[runtime]?.installed === false) return;
    const sameRuntime = runtime === agentSettingsRuntime;
    const currentProvider = agentCreateMachine ? agentCreateDraft.provider : roleModalAgent?.provider;
    const currentModel = agentCreateMachine ? agentCreateDraft.model : roleModalAgent?.model;
    const runtimeProvider = runtimeModelProviders.find((provider) => provider.slug === currentProvider);
    const provider = runtime === "hermes"
      ? sameRuntime ? currentProvider || "openai-codex" : "openai-codex"
      : runtime === "openclaw"
        ? sameRuntime && runtimeProvider ? currentProvider : ""
        : runtime === "openai-compatible"
          ? sameRuntime ? currentProvider || "lm-studio" : "lm-studio"
          : "";
    const model = runtime === "hermes"
      ? sameRuntime ? currentModel || "" : ""
      : runtime === "openclaw"
        ? sameRuntime && runtimeProvider ? currentModel || runtimeProvider.models[0]?.id || "" : ""
        : runtime === "openai-compatible"
          ? sameRuntime ? currentModel || "" : ""
          : "";
    if (agentCreateMachine) {
      setAgentCreateDraft((current) => ({
        ...current,
        runtime,
        provider,
        model,
      }));
    } else if (roleModalAgent) {
      updateAgentProfile(roleModalAgent.id, {
        runtime,
        provider,
        model,
      });
    }
  };

  const renderRuntimeMark = (runtime: string, label: string) => {
    const iconPath = runtimeIconPath(runtime);
    const iconMode = runtimeIconRenderMode(runtime);
    return (
      <span className={fleetClass("runtimeIconMark")} aria-hidden="true">
        {iconPath ? (
          <span
            className={iconMode === "mask" ? fleetClass("runtimeIconMask") : fleetClass("runtimeIconImage")}
            style={iconMode === "mask" ? { "--runtime-icon": `url(${iconPath})` } : { "--runtime-image": `url(${iconPath})` }}
          />
        ) : <b>{runtimeIconFallback(runtime, label)}</b>}
      </span>
    );
  };
  const agentSettingsWorkerSubtitle = (agentSettingsCustomWorker?.label || agentSettingsWorkerPreset?.label || agentSettingsWorkerLabel || "")
    .replace(/\s+bee$/i, "")
    .trim();
  const modelSelectableRuntime = Boolean(runtimeCapabilities(agentSettingsIntegrationTarget ?? roleModalAgent)?.modelSelection);
  const runtimeModelPanelAvailable = runtimeModelProviders.length > 0
    || modelSelectableRuntime
    || runtimeIntegrationBusy === "status"
    || Boolean(runtimeIntegrationMessage);
  const runtimeCanAddModels = agentSettingsRuntime === "hermes";

  if (!portalTarget) return null;

  return createPortal((<>
      {roleModalAgent || agentCreateMachine ? (
        <div
          className={fleetClass("setupModalBackdrop")}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeAgentSettingsModal();
          }}
        >
          <section className={fleetClass("setupModal", "agentSettingsModal")} role="dialog" aria-modal="true" aria-labelledby="agent-settings-title">
            <div className={fleetClass("setupModalHeader")}>
              <div className={fleetClass("agentSettingsHeaderCopy")}>
                <p className="eyebrow">{agentSettingsTitle}</p>
                {agentCreateMachine ? (
                  <div className={fleetClass("agentNameEdit")}>
                    <input
                      id="agent-settings-title"
                      value={agentCreateDraft.name}
                      onChange={(event) => setAgentCreateDraft((current) => ({ ...current, name: event.target.value }))}
                      aria-label="Agent name"
                      placeholder={`${RUNTIME_LABELS[agentCreateDraft.runtime]} on ${agentCreateMachine.name}`}
                      autoFocus
                    />
                  </div>
                ) : agentRenameEditing && roleModalAgent ? (
                  <form
                    className={fleetClass("agentNameEdit")}
                    onSubmit={(event) => {
                      event.preventDefault();
                      const nextName = agentRenameDraft.trim();
                      if (!nextName) return;
                      updateAgentProfile(roleModalAgent.id, { name: nextName });
                      setAgentRenameEditing(false);
                    }}
                  >
                    <input
                      id="agent-settings-title"
                      value={agentRenameDraft}
                      onChange={(event) => setAgentRenameDraft(event.target.value)}
                      aria-label="Agent name"
                      autoFocus
                    />
                    <button type="submit" aria-label="Save agent name" disabled={!agentRenameDraft.trim()}>
                      <Check aria-hidden="true" />
                    </button>
                    <CloseIconButton
                      size="sm"
                      type="button"
                      aria-label="Cancel agent name edit"
                      onClick={() => {
                        setAgentRenameDraft(roleModalAgent.name);
                        setAgentRenameEditing(false);
                      }}
                    />
                  </form>
                ) : roleModalAgent ? (
                  <div className={fleetClass("agentNameDisplay")}>
                    <div className={fleetClass("agentIdentityBlock")}>
                      <div className={fleetClass("agentNameTitleRow")}>
                        <h2 id="agent-settings-title">{roleModalAgent.name}</h2>
                        <button
                          type="button"
                          aria-label="Rename agent"
                          onClick={() => {
                            setAgentRenameDraft(roleModalAgent.name);
                            setAgentRenameEditing(true);
                          }}
                        >
                          <Pencil aria-hidden="true" />
                        </button>
                      </div>
                      {agentSettingsWorkerSubtitle ? <span className={fleetClass("agentRoleBadge")}>{agentSettingsWorkerSubtitle}</span> : null}
                    </div>
                  </div>
                ) : null}
                <p className={fleetClass("agentSettingsDescription")}>{agentSettingsDescription}</p>
              </div>
              <CloseIconButton aria-label="Close agent settings" onClick={closeAgentSettingsModal} />
            </div>

            <div className={fleetClass("agentSettingsTabs")} role="tablist" aria-label="Agent settings sections">
              {(agentCreateMachine ? (["role", "memory", "security"] as const) : (["role", "memory", "tools", "security"] as const)).map((panel) => (
                <button
                  type="button"
                  key={panel}
                  className={agentSettingsPanel === panel ? fleetClass("activeSegment") : ""}
                  onClick={() => setAgentSettingsPanel(panel)}
                >
                  {panel === "role" ? "Role" : panel === "memory" ? "Memory" : panel === "tools" ? "Tools" : "Security"}
                </button>
              ))}
            </div>

            {agentSettingsPanel === "role" ? (
              <div className={fleetClass("agentSettingsGrid")}>
                <div className={fleetClass("agentSettingsField", "agentRuntimeSelectField")}>
                  <span>Runtime</span>
                  <div className={fleetClass("agentRuntimeSegments")} role="group" aria-label="Runtime">
                    {Object.entries(RUNTIME_LABELS).map(([runtime, label]) => {
                      const selected = runtime === (agentCreateMachine ? agentCreateDraft.runtime : roleModalAgent?.runtime ?? "hermes");
                      const unavailable = runtimeAvailability?.[runtime]?.installed === false;
                      const title = unavailable ? `${label} is not installed.` : runtimeAvailability?.[runtime]?.detail;
                      return (
                        <span className={fleetClass("runtimeSegmentShell")} key={runtime} title={title}>
                          <button
                            type="button"
                            aria-pressed={selected}
                            aria-describedby={unavailable ? `runtime-${runtime}-unavailable` : undefined}
                            className={selected ? fleetClass("selectedRuntimeSegment") : ""}
                            disabled={unavailable}
                            onClick={() => updateSettingsRuntime(runtime as AgentRuntime)}
                          >
                            {renderRuntimeMark(runtime, label)}
                            <strong>{label}</strong>
                          </button>
                          {unavailable ? <span id={`runtime-${runtime}-unavailable`} className="sr-only">{`${label} is not installed.`}</span> : null}
                        </span>
                      );
                    })}
                  </div>
                </div>
                {runtimeModelPanelAvailable ? (
                  <div className={fleetClass("agentRuntimeModelPanel")}>
                    <div className={fleetClass("agentRuntimeCardGroup")}>
                      <div className={fleetClass("agentRuntimeGroupHeader")}>
                        <span>Provider</span>
                        <button
                          type="button"
                          aria-label={`Refresh ${RUNTIME_LABELS[agentSettingsRuntime] ?? agentSettingsRuntime} models`}
                          title={`Refresh ${RUNTIME_LABELS[agentSettingsRuntime] ?? agentSettingsRuntime} models`}
                          disabled={runtimeIntegrationBusy === "status"}
                          onClick={() => void refreshRuntimeIntegrations(agentSettingsIntegrationTarget ?? undefined)}
                        >
                          {runtimeIntegrationBusy === "status" ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <RefreshCcw aria-hidden="true" />}
                        </button>
                      </div>
                      <div className={fleetClass("agentRuntimeProviderCards")}>
                        {runtimeCanAddModels ? (
                          <button
                            type="button"
                            className={fleetClass("agentRuntimeAddCard")}
                            onClick={() => setRuntimeModelSetupMode((current) => current === "provider" ? null : "provider")}
                          >
                            <Plus aria-hidden="true" />
                            <strong>Add provider</strong>
                          </button>
                        ) : null}
                        {runtimeModelProviders.map((provider) => {
                          const selected = provider.slug === selectedRuntimeProvider?.slug;
                          const iconPath = providerIconPath(provider);
                          const iconMode = providerIconRenderMode(provider);
                          return (
                            <button
                              type="button"
                              key={provider.slug}
                              className={selected ? fleetClass("agentRuntimeProviderCard", "selectedRuntimeCard") : fleetClass("agentRuntimeProviderCard")}
                              aria-pressed={selected}
                              onClick={() => updateAgentRuntimeModel(provider.slug, provider.models[0]?.id ?? "")}
                            >
                              <span className={fleetClass("providerCardTitle")}>
                                {iconPath ? (
                                  <span className={fleetClass("runtimeIconMark")} aria-hidden="true">
                                    <span
                                      className={iconMode === "mask" ? fleetClass("runtimeIconMask") : fleetClass("runtimeIconImage")}
                                      style={iconMode === "mask" ? { "--runtime-icon": `url(${iconPath})` } : { "--runtime-image": `url(${iconPath})` }}
                                    />
                                  </span>
                                ) : null}
                                <strong>{provider.name}</strong>
                              </span>
                              <small>{provider.totalModels} model{provider.totalModels === 1 ? "" : "s"}</small>
                            </button>
                          );
                        })}
                        {!runtimeModelProviders.length ? (
                          <div className={fleetClass("agentRuntimeEmptyCard")}>
                            <strong>{runtimeIntegrationBusy === "status" ? "Loading models..." : "No providers returned"}</strong>
                            <small>{runtimeIntegrationMessage || `Refresh ${RUNTIME_LABELS[agentSettingsRuntime] ?? agentSettingsRuntime} models from this machine.`}</small>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className={fleetClass("agentRuntimeCardGroup")}>
                      <div className={fleetClass("agentRuntimeGroupHeader")}>
                        <span>Model</span>
                      </div>
                      <div className={fleetClass("agentRuntimeModelCards")}>
                        {openRouterSelected ? (
                          <button
                            type="button"
                            className={adaptiveSelected ? fleetClass("agentRuntimeModelCard", "adaptiveRuntimeModelCard", "selectedRuntimeCard") : fleetClass("agentRuntimeModelCard", "adaptiveRuntimeModelCard")}
                            aria-pressed={adaptiveSelected}
                            onClick={() => {
                              updateAdaptiveOpenRouter({});
                              updateAgentRuntimeModel("openrouter", "adaptive");
                            }}
                          >
                            <span className={fleetClass("adaptiveModelTitle")}>
                              <strong>Adaptive</strong>
                              <span className={fleetClass("adaptiveFreeBadge")}>Free</span>
                            </span>
                            <small>Best matching promo/free model</small>
                            <span className={fleetClass("adaptiveTooltip")} role="tooltip">
                              Leverages promo models on OpenRouter to power your agent 100% free, with a fallback on a paid agent of your choice
                            </span>
                          </button>
                        ) : null}
                        {selectedRuntimeModels.map((model) => {
                          const selected = model.id === selectedRuntimeModelId;
                          return (
                            <button
                              type="button"
                              key={model.id}
                              className={selected ? fleetClass("agentRuntimeModelCard", "selectedRuntimeCard") : fleetClass("agentRuntimeModelCard")}
                              aria-pressed={selected}
                              onClick={() => updateAgentRuntimeModel(selectedRuntimeProvider?.slug ?? agentSettingsProvider, model.id)}
                            >
                              <strong>{model.name || model.id}</strong>
                              {model.name ? <small>{model.id}</small> : null}
                            </button>
                          );
                        })}
                        {!selectedRuntimeModels.length ? (
                          <div className={fleetClass("agentRuntimeEmptyCard")}>
                            <strong>{runtimeIntegrationBusy === "status" ? "Loading models..." : "No models returned"}</strong>
                            <small>{runtimeIntegrationMessage || "The selected provider has not reported any models yet."}</small>
                          </div>
                        ) : null}
                        {runtimeCanAddModels ? (
                          <button
                            type="button"
                            className={fleetClass("agentRuntimeAddCard")}
                            onClick={() => setRuntimeModelSetupMode((current) => current === "model" ? null : "model")}
                          >
                            <Plus aria-hidden="true" />
                            <strong>Add model</strong>
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {adaptiveSelected ? (
                      <div className={fleetClass("adaptiveRuntimeSettings")}>
                        <div className={fleetClass("adaptiveRuntimeHeader")}>
                          <div>
                            <strong>Adaptive filters</strong>
                            <small>Live OpenRouter metadata filters run first; benchmark floors apply when a score index is available.</small>
                          </div>
                          <span>{adaptiveOpenRouter.inputModalities.join(" + ")} · {Math.round(adaptiveOpenRouter.minContextLength / 1000)}k+</span>
                        </div>
                        <div className={fleetClass("adaptiveFilterGrid")}>
                          <div className={fleetClass("adaptiveFilterGroup")}>
                            <span>Input modalities</span>
                            <div className={fleetClass("adaptiveChipGrid")}>
                              {adaptiveModalities.map((option) => (
                                <button
                                  key={option.id}
                                  type="button"
                                  className={adaptiveOpenRouter.inputModalities.includes(option.id) ? fleetClass("adaptiveChip", "adaptiveChipActive") : fleetClass("adaptiveChip")}
                                  aria-pressed={adaptiveOpenRouter.inputModalities.includes(option.id)}
                                  onClick={() => toggleAdaptiveListValue("inputModalities", option.id)}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <label className={fleetClass("adaptiveFilterGroup")}>
                            <span>Context length</span>
                            <select
                              value={String(adaptiveOpenRouter.minContextLength)}
                              onChange={(event) => updateAdaptiveOpenRouter({ minContextLength: Number(event.target.value) })}
                            >
                              <option value="8000">8k+</option>
                              <option value="32000">32k+</option>
                              <option value="128000">128k+</option>
                              <option value="200000">200k+</option>
                              <option value="1000000">1M+</option>
                            </select>
                          </label>
                          <div className={fleetClass("adaptiveFilterGroup")}>
                            <span>Categories</span>
                            <div className={fleetClass("adaptiveChipGrid")}>
                              {adaptiveCategories.map((option) => (
                                <button
                                  key={option.id}
                                  type="button"
                                  className={adaptiveOpenRouter.categories.includes(option.id) ? fleetClass("adaptiveChip", "adaptiveChipActive") : fleetClass("adaptiveChip")}
                                  aria-pressed={adaptiveOpenRouter.categories.includes(option.id)}
                                  onClick={() => toggleAdaptiveListValue("categories", option.id)}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className={fleetClass("adaptiveScoreGrid")}>
                          {adaptiveScoreCategories.map((category) => (
                            <label className={fleetClass("adaptiveScoreSlider")} key={category.id}>
                              <span>
                                {category.label} score
                                <b>{adaptiveOpenRouter.minScores?.[category.id] ?? 0}+</b>
                              </span>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={adaptiveOpenRouter.minScores?.[category.id] ?? 0}
                                onChange={(event) => updateAdaptiveScore(category.id, Number(event.target.value))}
                              />
                            </label>
                          ))}
                        </div>
                        <label className={fleetClass("adaptiveFilterGroup", "adaptiveFallbackSelect")}>
                          <span>Paid fallback</span>
                          <select
                            value={adaptiveOpenRouter.fallbackModel}
                            onChange={(event) => updateAdaptiveOpenRouter({ fallbackModel: event.target.value })}
                          >
                            <option value="">Ask before paid fallback</option>
                            {selectedRuntimeModels
                              .filter((model) => model.id !== "adaptive")
                              .map((model) => (
                                <option value={model.id} key={model.id}>{model.name || model.id}</option>
                              ))}
                          </select>
                        </label>
                      </div>
                    ) : null}
                    {runtimeCanAddModels && runtimeModelSetupMode ? (
                      <div className={fleetClass("agentRuntimeModelSetup")}>
                        <div>
                          <strong>{runtimeModelSetupMode === "provider" ? "Add provider" : "Add model"}</strong>
                          <p>{runtimeModelSetupMode === "provider" ? "Use Hermes' provider setup, then refresh this list." : `Add an exact model ID to ${selectedRuntimeProvider?.name ?? "this provider"}.`}</p>
                        </div>
                        {runtimeModelSetupMode === "provider" ? (
                          <Button type="button" variant="secondary" onClick={() => void refreshRuntimeIntegrations(agentSettingsIntegrationTarget ?? undefined)} disabled={runtimeIntegrationBusy === "status"}>
                            {runtimeIntegrationBusy === "status" ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <RefreshCcw aria-hidden="true" />}
                            Refresh after setup
                          </Button>
                        ) : (
                          <>
                            <label className={fleetClass("agentSettingsField")}>
                              <span>Provider</span>
                              <select
                                value={runtimeModelDraft.provider || selectedRuntimeProvider?.slug || ""}
                                onChange={(event) => setRuntimeModelDraft((current) => ({ ...current, provider: event.target.value }))}
                              >
                                {runtimeModelProviders.map((provider) => (
                                  <option value={provider.slug} key={provider.slug}>{provider.name}</option>
                                ))}
                              </select>
                            </label>
                        <label className={fleetClass("agentSettingsField")}>
                          <span>Custom model ID</span>
                          <input
                            value={runtimeModelDraft.model}
                            onChange={(event) => setRuntimeModelDraft((current) => ({ ...current, model: event.target.value }))}
                            placeholder="Paste exact model ID"
                          />
                        </label>
                        <label className={fleetClass("agentSettingsField")}>
                          <span>Context</span>
                          <select
                            value={runtimeModelDraft.contextLength}
                            onChange={(event) => setRuntimeModelDraft((current) => ({ ...current, contextLength: event.target.value }))}
                          >
                            <option value="">Auto</option>
                            <option value="128000">128k</option>
                            <option value="200000">200k</option>
                            <option value="400000">400k</option>
                            <option value="1000000">1M</option>
                          </select>
                        </label>
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={!runtimeModelDraft.model.trim() || runtimeIntegrationBusy === "add-model"}
                          onClick={() => void addHermesModelFromDraft()}
                        >
                          {runtimeIntegrationBusy === "add-model" ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Plus aria-hidden="true" />}
                          Add
                        </Button>
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {!agentCreateMachine && roleModalAgent ? (
                  <div className={fleetClass("agentRuntimeSummary")}>
                    <PlugZap aria-hidden="true" />
                    <div>
                      <strong>{RUNTIME_LABELS[roleModalAgent.runtime]} is connected</strong>
                      <p>Connection details are managed automatically. Open Advanced only for custom bridges or repairs.</p>
                    </div>
                    <button type="button" onClick={() => setAgentRuntimeAdvancedOpen((current) => !current)}>
                      {agentRuntimeAdvancedOpen ? "Hide advanced" : "Advanced"}
                    </button>
                  </div>
                ) : null}
                {agentRuntimeAdvancedOpen && !agentCreateMachine && roleModalAgent ? (
                  <div className={fleetClass("agentRuntimeAdvanced")}>
                    <label className={fleetClass("agentSettingsField")}>
                      <span>Chat URL / gateway</span>
                      <input
                        value={roleModalAgent.gatewayUrl ?? ""}
                        onChange={(event) => updateAgentProfile(roleModalAgent.id, { gatewayUrl: event.target.value })}
                        placeholder="http://machine:8787/chat or ws://127.0.0.1:18789"
                      />
                    </label>
                    <label className={fleetClass("agentSettingsField")}>
                      <span>Agent ID / session</span>
                      <input
                        value={roleModalAgent.agentId ?? ""}
                        onChange={(event) => updateAgentProfile(roleModalAgent.id, { agentId: event.target.value })}
                        placeholder="local-hermes, main, seo-agent"
                      />
                    </label>
                    <label className={fleetClass("agentSettingsField")}>
                      <span>Agent bridge</span>
                      <input
                        value={roleModalAgent.telemetryUrl ?? ""}
                        onChange={(event) => updateAgentProfile(roleModalAgent.id, { telemetryUrl: event.target.value })}
                      />
                    </label>
                  </div>
                ) : null}
                <div className={fleetClass("agentSettingsField", "agentWorkerClassPicker")}>
                  <span>Worker class</span>
                  {agentWorkerClassView === "presets" ? (
                    <>
                      <div className={fleetClass("agentWorkerClassGrid")}>
                        {BEE_WORKER_PRESET_LIST.map((preset) => {
                          const selectedClass = preset.id === agentSettingsWorkerClass && !agentSettingsCustomWorker;
                          return (
                            <button
                              type="button"
                              key={preset.id}
                              className={selectedClass ? fleetClass("selectedWorkerClass") : ""}
                              onClick={() => selectAgentWorkerClass(preset.id)}
                              aria-pressed={selectedClass}
                            >
                              <Image src={beeRoleIconPath("worker", preset.id)} alt="" width={54} height={54} unoptimized />
                              <strong>{preset.label}</strong>
                            </button>
                          );
                        })}
                        {agentSettingsCustomWorkers.map((customWorkerClass) => (
                          <button
                            type="button"
                            key={customWorkerClass.id}
                            className={agentSettingsSelectedCustomWorkerId === customWorkerClass.id ? fleetClass("selectedWorkerClass", "customWorkerClassCard") : fleetClass("customWorkerClassCard")}
                            onClick={() => selectCustomWorkerClass(customWorkerClass)}
                            aria-pressed={agentSettingsSelectedCustomWorkerId === customWorkerClass.id}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={customWorkerClass.imageSrc || beeRoleIconPath("worker", "general")} alt="" />
                            <strong>{customWorkerClass.label}</strong>
                          </button>
                        ))}
                        <button type="button" className={fleetClass("agentWorkerClassCreate")} onClick={openCustomWorkerClassCreator}>
                          <Plus aria-hidden="true" />
                          <strong>Custom</strong>
                        </button>
                      </div>
                      <div className={fleetClass("agentWorkerClassDetail")}>
                        <div>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={agentSettingsWorkerImage} alt="" />
                          <div>
                            <strong>{agentSettingsWorkerLabel}</strong>
                            <div className={fleetClass("agentWorkerCapabilityBadges")}>
                              {(agentSettingsCustomWorker ? workerCapabilityBadges(agentSettingsSkillProfile) : workerCapabilityBadges(agentSettingsWorkerPreset.summary)).map((capability) => (
                                <span key={capability}>{capability}</span>
                              ))}
                            </div>
                            <small>{agentSettingsCustomWorker ? "Custom worker class" : agentSettingsWorkerPreset.modelHint}</small>
                          </div>
                        </div>
                        <label>
                          <span>Suited-for prompt</span>
                          <textarea
                            value={agentSettingsSkillProfile}
                            onChange={(event) => updateAgentSkillProfile(event.target.value)}
                          />
                        </label>
                        <div className={fleetClass("agentWorkerSkillSet")}>
                          <span>Seeded shared-brain skills</span>
                          <div>
                            {agentSettingsPreferredSkills.map((slug) => <code key={slug}>{slug}</code>)}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className={fleetClass("agentWorkerClassCreator")}>
                      <div className={fleetClass("agentWorkerCreatorHeader")}>
                        <button type="button" onClick={() => setAgentWorkerClassView("presets")}>
                          <ChevronRight aria-hidden="true" />
                          Back
                        </button>
                        <strong>Custom worker class</strong>
                      </div>
                      <label className={fleetClass("agentSettingsField")}>
                        <span>Role name</span>
                        <input
                          value={customWorkerDraft.label}
                          onChange={(event) => setCustomWorkerDraft((current) => ({ ...current, label: event.target.value }))}
                          placeholder="Data scout, Social analyst, Build fixer"
                        />
                      </label>
                      <div className={fleetClass("agentWorkerImagePicker")}>
                        <span>Bee image</span>
                        <div>
                          {BEE_WORKER_PRESET_LIST.map((preset) => {
                            const imageSrc = beeRoleIconPath("worker", preset.id);
                            return (
                              <button
                                type="button"
                                key={preset.id}
                                className={customWorkerDraft.imageSrc === imageSrc ? fleetClass("selectedWorkerClass") : ""}
                                onClick={() => setCustomWorkerDraft((current) => ({ ...current, imageSrc }))}
                                aria-label={`Use ${preset.label} bee image`}
                              >
                                <Image src={imageSrc} alt="" width={42} height={42} unoptimized />
                              </button>
                            );
                          })}
                          <button type="button" onClick={() => customWorkerImageInputRef.current?.click()}>
                            <Upload aria-hidden="true" />
                          </button>
                        </div>
                        <input ref={customWorkerImageInputRef} type="file" accept="image/*" onChange={uploadCustomWorkerImage} hidden />
                        {customWorkerImageError ? <small>{customWorkerImageError}</small> : null}
                      </div>
                      <label className={fleetClass("agentSettingsField")}>
                        <span>Suited-for prompt</span>
                        <textarea
                          value={customWorkerDraft.skillProfilePrompt}
                          onChange={(event) => setCustomWorkerDraft((current) => ({ ...current, skillProfilePrompt: event.target.value }))}
                          placeholder="Describe when this worker should be used and what it should be good at."
                        />
                      </label>
                      <div className={fleetClass("agentWorkerSkillChooser")}>
                        <label>
                          <span>Shared brain skills</span>
                          <input
                            value={customWorkerSkillSearch}
                            onChange={(event) => setCustomWorkerSkillSearch(event.target.value)}
                            placeholder="Search by skill name or keyword"
                          />
                        </label>
                        <div>
                          {filteredCustomWorkerSkills.length ? filteredCustomWorkerSkills.map((skill) => (
                            <button
                              type="button"
                              key={skill.slug}
                              className={skill.selected ? fleetClass("selectedSkillBadge") : ""}
                              onClick={() => toggleCustomWorkerSkill(skill.slug)}
                            >
                              {skill.name}
                            </button>
                          )) : <p>No matching shared-brain skills.</p>}
                        </div>
                      </div>
                      <div className={fleetClass("agentWorkerCreatorActions")}>
                        <button type="button" onClick={() => setAgentWorkerClassView("presets")}>Cancel</button>
                        <button type="button" onClick={applyCustomWorkerClass} disabled={!customWorkerDraft.label.trim() || !customWorkerDraft.skillProfilePrompt.trim()}>
                          <Check aria-hidden="true" />
                          Use class
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {agentSettingsPanel === "memory" ? (
              <div className={fleetClass("agentSettingsGrid", "agentMemoryPanel")}>
                <label className={fleetClass("agentSettingsField", "toggleRow")}>
                  <input
                    type="checkbox"
                    checked={agentCreateMachine ? agentCreateDraft.useSharedVault : roleModalAgent?.useSharedVault !== false}
                    onChange={(event) => {
                      if (agentCreateMachine) {
                        setAgentCreateDraft((current) => ({ ...current, useSharedVault: event.target.checked }));
                      } else if (roleModalAgent) {
                        updateAgentProfile(roleModalAgent.id, { useSharedVault: event.target.checked });
                      }
                    }}
                  />
                  <span>Use shared Obsidian brain</span>
                </label>
                {(agentCreateMachine ? agentCreateDraft.useSharedVault : roleModalAgent?.useSharedVault !== false) ? (
                  <div className={fleetClass("agentSettingsInfo")}>
                    <BrainCircuit aria-hidden="true" />
                    <p>{sharedVault.enabled ? `Shared brain: ${sharedVault.vaultPath || "auto-detected vault"}. Memory, Kanban, notifications, and HivemindOS context are shared from there.` : "Shared brain is off. Turn it on from the Vault view to give agents one common memory space."}</p>
                  </div>
                ) : null}
                {!agentCreateMachine && roleModalAgent ? (
                  <div className={fleetClass("agentMemoryFolderRow")}>
                    <div>
                      <span>Runtime folder</span>
                      <strong>{roleModalAgent.localDataDir?.trim() || "Managed by runtime"}</strong>
                      <p>{roleModalAgent.useSharedVault !== false ? "Only change this if this agent needs a custom local workspace." : "Used as this agent's local memory and workspace folder."}</p>
                    </div>
                    <div className={fleetClass("agentMemoryFolderActions")}>
                      <button type="button" aria-label="Browse for runtime folder" onClick={() => void browseAgentRuntimeFolder()} disabled={agentRuntimeFolderBrowsing}>
                        <FolderOpen aria-hidden="true" />
                      </button>
                      <button type="button" aria-label="Edit runtime folder path" onClick={() => setAgentRuntimeFolderEditing((current) => !current)}>
                        <Pencil aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ) : null}
                {agentRuntimeFolderEditing && roleModalAgent ? (
                  <label className={fleetClass("agentSettingsField", "agentMemoryPathEditor")}>
                    <span>Runtime folder path</span>
                    <div>
                      <input
                        value={roleModalAgent.localDataDir ?? ""}
                        onChange={(event) => {
                          updateAgentProfile(roleModalAgent.id, { localDataDir: event.target.value });
                          setAgentRuntimeFolderStatus("");
                        }}
                        placeholder="Leave blank to use the runtime default"
                      />
                      <button type="button" aria-label="Done editing runtime folder path" onClick={() => setAgentRuntimeFolderEditing(false)}>
                        <Check aria-hidden="true" />
                      </button>
                    </div>
                  </label>
                ) : null}
                {agentRuntimeFolderStatus ? <p className={fleetClass("agentMemoryStatus")}>{agentRuntimeFolderStatus}</p> : null}
              </div>
            ) : null}

            {agentSettingsPanel === "tools" && roleModalAgent ? (
              <div className={fleetClass("agentRuntimeToolsPanel")}>
                <div className={fleetClass("agentRuntimeToolsHeader")}>
                  <div>
                    <strong>Runtime integrations</strong>
                    <p>These controls stay adapter-neutral. Hermes-only actions appear only when this agent actually runs Hermes.</p>
                  </div>
                  <Button type="button" variant="secondary" onClick={() => void refreshRuntimeIntegrations(roleModalAgent)} disabled={runtimeIntegrationBusy === "status"}>
                    {runtimeIntegrationBusy === "status" ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <RefreshCcw aria-hidden="true" />}
                    Refresh
                  </Button>
                </div>

                <div className={fleetClass("agentRuntimeCapabilityGrid")}>
                  {([
                    ["sessionSearch", "Session search", "Search prior work across this runtime.", Search],
                    ["backgroundTasks", "Background tasks", "Run work without blocking chat.", Repeat2],
                    ["xSearch", "X search", "Fetch X posts through runtime auth.", MessageSquare],
                    ["socialPosting", "X posting", "Publish through installed social skills.", Send],
                    ["videoGeneration", "AI video", "Generate videos through runtime tools.", Sparkles],
                    ["codexRuntime", "Codex runtime", "Delegate coding to Codex paths.", Cpu],
                    ["kanbanDecompose", "Kanban decomposition", "Break triage goals into child work.", KanbanSquare],
                  ] as const).map(([key, label, detail, Icon]) => {
                    const item = runtimeIntegrationStatus?.integrations[key];
                    const supported = item?.supported ?? Boolean(runtimeCapabilities(roleModalAgent)[key]);
                    const enabled = item?.enabled ?? supported;
                    const needsHermesUpdate = roleModalAgent.runtime === "hermes" && supported && hermesUpdateRequired && HERMES_UPDATE_INTEGRATION_KEYS.has(key);
                    const needsSetup = supported && !enabled && !needsHermesUpdate;
                    const statusLabel = needsHermesUpdate
                      ? "Needs Hermes update"
                      : supported
                        ? enabled ? "Ready" : "Needs setup"
                        : "Not exposed";
                    const updateConfirmOpen = runtimeUpdateConfirmKey === key;
                    return (
                      <article key={key} className={fleetClass("agentRuntimeCapabilityCard", supported ? "supported" : "unsupported")}>
                        <Icon aria-hidden="true" />
                        <div>
                          <strong>{label}</strong>
                          <div className={fleetClass("agentRuntimeCapabilityBadges")}>
                            {needsHermesUpdate ? (
                              <span className={fleetClass("needsHermesUpdate", updateConfirmOpen ? "confirming" : "")}>
                                {updateConfirmOpen ? (
                                  <>
                                    <span>Update now?</span>
                                    <button
                                      type="button"
                                      aria-label="Update Hermes now"
                                      disabled={Boolean(runtimeIntegrationBusy)}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        void (async () => {
                                          await runRuntimeIntegrationAction("hermes-update");
                                          setRuntimeUpdateConfirmKey("");
                                        })();
                                      }}
                                    >
                                      {runtimeIntegrationBusy === "hermes-update" ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Check aria-hidden="true" />}
                                    </button>
                                    <CloseIconButton
                                      size="sm"
                                      type="button"
                                      aria-label="Cancel Hermes update"
                                      disabled={runtimeIntegrationBusy === "hermes-update"}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setRuntimeUpdateConfirmKey("");
                                      }}
                                    />
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={Boolean(runtimeIntegrationBusy)}
                                    onClick={() => setRuntimeUpdateConfirmKey(key)}
                                  >
                                    {statusLabel}
                                  </button>
                                )}
                              </span>
                            ) : needsSetup ? (
                              <button
                                type="button"
                                className={fleetClass("runtimeSetupBadge")}
                                aria-pressed={runtimeSetupKey === key}
                                onClick={() => setRuntimeSetupKey((current) => current === key ? "" : key)}
                              >
                                {statusLabel}
                              </button>
                            ) : (
                              <span>{statusLabel}</span>
                            )}
                          </div>
                          <p>{detail}</p>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {runtimeSetupKey ? (() => {
                  const setup = runtimeSetupDefinition(roleModalAgent.runtime, runtimeSetupKey);
                  return (
                    <section className={fleetClass("agentRuntimeSetupPanel")}>
                      <div>
                        <strong>{setup.title}</strong>
                        <p>{setup.description}</p>
                      </div>
                      <ol>
                        {setup.steps.map((step: string) => <li key={step}>{step}</li>)}
                      </ol>
                      <div className={fleetClass("agentRuntimeSetupActions")}>
                        {setup.actions.map((action: any) => (
                          <Button
                            key={action.id}
                            type="button"
                            variant={action.id === setup.actions[0]?.id ? "default" : "secondary"}
                            disabled={Boolean(runtimeIntegrationBusy)}
                            onClick={() => void runRuntimeIntegrationAction(action.action, action.input ?? {})}
                          >
                            {runtimeIntegrationBusy === action.action ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <PlugZap aria-hidden="true" />}
                            {action.label}
                          </Button>
                        ))}
                        <Button type="button" variant="secondary" onClick={() => void refreshRuntimeIntegrations(roleModalAgent)} disabled={runtimeIntegrationBusy === "status"}>
                          {runtimeIntegrationBusy === "status" ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <RefreshCcw aria-hidden="true" />}
                          Refresh
                        </Button>
                        <CloseIconButton aria-label="Close runtime setup" onClick={() => setRuntimeSetupKey("")} />
                      </div>
                    </section>
                  );
                })() : null}

                <div className={fleetClass("agentRuntimeToolWorkbench")}>
                  <section>
                    <div>
                      <strong>Search sessions</strong>
                      <p>Works for runtimes with readable local session history. Hermes uses its SQLite session store; OpenClaw scans local session transcripts when present.</p>
                    </div>
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        void searchRuntimeSessionsForAgent();
                      }}
                    >
                      <input
                        value={runtimeSessionQuery}
                        onChange={(event) => setRuntimeSessionQuery(event.target.value)}
                        placeholder="April 15, Codex, Kanban, auth..."
                      />
                      <Button type="submit" disabled={runtimeIntegrationBusy === "session-search"}>
                        {runtimeIntegrationBusy === "session-search" ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Search aria-hidden="true" />}
                        Search
                      </Button>
                    </form>
                    {runtimeSessionResults.length ? (
                      <div className={fleetClass("agentRuntimeSessionResults")}>
                        {runtimeSessionResults.map((session) => (
                          <article key={session.id}>
                            <strong>{session.title}</strong>
                            <span>{[session.source, session.model, session.startedAt ? new Date(session.startedAt).toLocaleString() : ""].filter(Boolean).join(" · ")}</span>
                            <p>{session.excerpt || session.path || "No preview available."}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  closeAgentSettingsModal();
                                  startAgentChat(roleModalAgent.id, { fresh: true, runtimeSessionId: session.id });
                                }}
                              >
                                <MessageSquare aria-hidden="true" />
                                Resume in chat
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => navigator.clipboard?.writeText(session.id)}
                              >
                                <Copy aria-hidden="true" />
                                Copy id
                              </Button>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : null}
                  </section>

                  {roleModalAgent.runtime === "hermes" ? (
                    <section>
                      <div>
                        <strong>Hermes extras</strong>
                        <p>These call the local Hermes CLI and leave other runtimes untouched.</p>
                      </div>
                      <div className={fleetClass("agentRuntimeActionGrid")}>
                        <Button type="button" variant="secondary" disabled={Boolean(runtimeIntegrationBusy)} onClick={() => void runRuntimeIntegrationAction("xai-login")}>
                          <PlugZap aria-hidden="true" />
                          xAI login
                        </Button>
                        <Button type="button" variant="secondary" disabled={Boolean(runtimeIntegrationBusy)} onClick={() => void runRuntimeIntegrationAction("enable-tool", { tool: "x_search" })}>
                          <MessageSquare aria-hidden="true" />
                          Enable X search
                        </Button>
                        <Button type="button" variant="secondary" disabled={Boolean(runtimeIntegrationBusy)} onClick={() => void runRuntimeIntegrationAction("enable-tool", { tool: "video_gen" })}>
                          <Sparkles aria-hidden="true" />
                          Enable video
                        </Button>
                        <Button type="button" variant="secondary" disabled={Boolean(runtimeIntegrationBusy)} onClick={() => void runRuntimeIntegrationAction("kanban-decompose")}>
                          <KanbanSquare aria-hidden="true" />
                          Decompose triage
                        </Button>
                      </div>
                      <label className={fleetClass("agentSettingsField")}>
                        <span>Background prompt</span>
                        <textarea
                          value={runtimeBackgroundPrompt}
                          onChange={(event) => setRuntimeBackgroundPrompt(event.target.value)}
                          placeholder="Ask Hermes to handle a background task while chat stays free."
                        />
                      </label>
                      <Button
                        type="button"
                        disabled={runtimeIntegrationBusy === "background" || !runtimeBackgroundPrompt.trim()}
                        onClick={() => void runRuntimeIntegrationAction("background", { prompt: runtimeBackgroundPrompt })}
                      >
                        {runtimeIntegrationBusy === "background" ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Repeat2 aria-hidden="true" />}
                        Start background task
                      </Button>
                    </section>
                  ) : null}
                </div>

                {runtimeIntegrationMessage ? <p className={fleetClass("agentRuntimeToolStatus")}>{runtimeIntegrationMessage}</p> : null}
              </div>
            ) : null}

            {agentSettingsPanel === "security" ? (
              <div className={fleetClass("agentSecurityGrid")}>
                <article><ShieldCheck aria-hidden="true" /><div><strong>Prompt guard</strong><p>Blocks obvious prompt-injection and dangerous local-action requests before they reach connected runtimes. Checks run locally in the dashboard.</p></div></article>
                <article><Eye aria-hidden="true" /><div><strong>Output redaction</strong><p>Secrets and obvious credential leaks are redacted from streamed responses before the dashboard renders them.</p></div></article>
                <article><Settings2 aria-hidden="true" /><div><strong>Skill action guard</strong><p>Local skill actions use allowlisted skill folders and safe argument checks where the runtime exposes dashboard actions.</p></div></article>
              </div>
            ) : null}

            <div className={fleetClass("setupModalActions")}>
              <Button type="button" disabled={runtimeIntegrationBusy === "create-agent"} onClick={agentCreateMachine ? () => void createAgentFromModal() : closeAgentSettingsModal}>
                <Check aria-hidden="true" />
                {agentCreateMachine ? runtimeIntegrationBusy === "create-agent" ? "Creating..." : "Add agent" : "Done"}
              </Button>
              {agentCreateMachine && runtimeIntegrationMessage ? <p className={fleetClass("agentRuntimeToolStatus")}>{runtimeIntegrationMessage}</p> : null}
            </div>
          </section>
        </div>
      ) : null}
  </>), portalTarget);
}
