// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
"use client";

/* eslint-disable react-hooks/immutability, react-hooks/purity */

export function VaultPanel(props: any) {
  const { Activity, BRAIN_SKILL_PROVIDER_FALLBACK, Bot, BrainCircuit, BrainGraphLoader, Button, Cell, Check, CircleAlert, Clock3, DEFAULT_SHARED_VAULT, Download, Eye, FileText, FolderOpen, GitBranch, Hexagon, Image, KeyRound, LoaderCircle, MemoryCell, Network, PlugZap, RefreshCcw, Repeat2, Sparkles, activeView, brainGraph, brainGraphEdgePath, brainGraphLoading, brainGraphStats, brainGraphStatus, brainLayout, brainNodePoints, brainPan, brainSkillAeonSyncing, brainSkillImportAllDescription, brainSkillImportAllLabel, brainSkillImportProvider, brainSkillImportSuccess, brainSkillImportableCount, brainSkills, brainSkillsLoading, brainSkillsStatus, checkControlRoomStatus, checkVaultStatus, controlRoomStatus, displayAgents, endBrainPan, formatBrainDate, gbrainActionStatus, gbrainBusy, gbrainQuery, gbrainQueryResult, gbrainStatus, hermesUpdateRequired, hermesUpdateRequiredDetail, importBrainSkills, inspectBrainNode, moveBrainPan, openSkillBrowser, pairSyncthingVaultSync, queryGbrainFromDashboard, refreshBrainGraph, refreshBrainSkills, refreshGbrainStatus, refreshRuntimeFileRoots, runGbrainAction, runVaultTailnetSync, selectedAgent, selectedBrainNode, selectedBrainTargetIds, setActiveView, setGbrainQuery, setVaultPanelMode, sharedVault, skillRequiresHermesUpdate, splitBrainLabel, startBrainPan, syncBrainSkillsToAeon, updateAllSkillAutoSync, updateSharedVault, updateSkillAutoSync, vaultClass, vaultPanelMode, vaultStatus, vaultSyncPending, vaultSyncStatus, visibleBrainNodes, walletClass } = props;
  const gbrainMetric = (keys: string[]) => {
    const stats = gbrainStatus?.stats ?? {};
    for (const key of keys) {
      const value = stats[key] ?? stats[key.toLowerCase()] ?? stats[key.replace(/([A-Z])/g, "_$1").toLowerCase()];
      if (typeof value === "number" || typeof value === "string") return value;
    }
    return "—";
  };
  const gbrainKeys = gbrainStatus?.keyStatus ?? {};
  const gbrainRecommendations = gbrainStatus?.features?.recommendations ?? [];
  const vaultPanelHref = (mode: string) => `/?view=vault&vaultPanel=${mode}`;
  const selectVaultPanel = (mode: string) => {
    setVaultPanelMode(mode);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("view", "vault");
    url.searchParams.set("vaultPanel", mode);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  };
  return (<>
      {activeView === "vault" ? (
      <section className={vaultClass("vaultPanel", "tabPanel")}>
        <div className={vaultClass("vaultHeader")}>
          <div className={vaultClass("vaultHeaderMain")}>
            <p className="eyebrow">Shared brain</p>
            <h2>One memory, many agents</h2>
            <p>Connect an Obsidian vault to give your agents a common place for memory, handoffs, and shared project context.</p>
            <div className={vaultClass("vaultViewSwitch")}>
              <div className={walletClass("walletSegmented", "vaultSegmented")} role="tablist" aria-label="Vault view mode">
                {[
                  ["hive-vault", "Hive Vault"],
                  ["shared-skills", "Shared Skills"],
                  ["brain-services", "Brain Services"],
                  ["config", "Config"],
                ].map(([mode, label]) => (
                  <a
                    key={mode}
                    href={vaultPanelHref(mode)}
                    role="tab"
                    aria-selected={vaultPanelMode === mode}
                    className={walletClass("walletSegment", "vaultSegment", vaultPanelMode === mode && "walletSegmentActive")}
                    onPointerDown={(event) => {
                      if (event.button === 0) selectVaultPanel(mode);
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      selectVaultPanel(mode);
                    }}
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className={vaultClass("vaultHeaderActions")}>
            <Button type="button" size="sm" variant="secondary" onClick={() => refreshBrainGraph(true)} disabled={brainGraphLoading}>
              {brainGraphLoading ? <LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /> : <RefreshCcw aria-hidden="true" />}
              {brainGraphLoading ? "Reading graph" : "Refresh graph"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setActiveView("files");
                void refreshRuntimeFileRoots();
              }}
            >
              <FolderOpen aria-hidden="true" />
              Files
            </Button>
          </div>
        </div>

        {vaultPanelMode === "hive-vault" ? (
        <div className={vaultClass("brainWorkspace")}>
          <section className={vaultClass("brainGraphPanel")} aria-label="Shared brain graph">
            <div className={vaultClass("brainGraphStats")}>
              {[
                ["Notes", brainGraphStats.notes, <FileText aria-hidden="true" key="notes" />],
                ["Links", brainGraphStats.links, <GitBranch aria-hidden="true" key="links" />],
                ["Accessed", brainGraphStats.accessed, <Eye aria-hidden="true" key="accessed" />],
                ["Recent", brainGraphStats.recent, <Clock3 aria-hidden="true" key="recent" />],
              ].map(([label, value, icon]) => (
                <span key={String(label)}>
                  {icon}
                  <strong>{value}</strong>
                  {label}
                </span>
              ))}
            </div>
            <div className={vaultClass("brainLegend")} aria-label="Brain graph legend">
              <span><i className={vaultClass("legendNote")} /> Note</span>
              <span><i className={vaultClass("legendUnresolved")} /> Unresolved link</span>
              <span><i className={vaultClass("legendSelected")} /> Selected</span>
              <span><i className={vaultClass("legendTarget")} /> Target</span>
            </div>

            <div className={vaultClass("brainGraphCanvas")}>
              {visibleBrainNodes.length ? (
                <>
                  <svg
                    viewBox={`${brainPan.x} ${brainPan.y} ${brainLayout.width} ${brainLayout.height}`}
                    role="img"
                    aria-label="Hive shaped Obsidian graph"
                    onPointerDown={startBrainPan}
                    onPointerMove={moveBrainPan}
                    onPointerUp={endBrainPan}
                    onPointerCancel={endBrainPan}
                    className={vaultClass("draggable", brainGraphLoading && "dimmed")}
                  >
                    <defs>
                      <filter id="brainNodeGlow" x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur stdDeviation="5" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    {visibleBrainNodes.map((node) => {
                      const position = brainLayout.positions.get(node.id);
                      if (!position) return null;
                      const selected = selectedBrainNode?.id === node.id;
                      const target = !selected && selectedBrainTargetIds.has(node.id);
                      const unresolved = node.id.startsWith("unresolved:");
                      const labelLines = splitBrainLabel(node.label);
                      return (
                        <g
                          key={node.id}
                          role="button"
                          tabIndex={0}
                          data-brain-node-id={node.id}
                          aria-label={selected ? `Open ${node.label} in Obsidian` : `Inspect ${node.label}`}
                          className={vaultClass("brainNode", selected && "selected", target && "target", unresolved && "unresolved")}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") void inspectBrainNode(node);
                          }}
                        >
                          <polygon
                            points={brainNodePoints(position.x, position.y, brainLayout.radius)}
                            filter={selected ? "url(#brainNodeGlow)" : undefined}
                          />
                          <text x={position.x} y={position.y - (labelLines.length > 1 ? 11 : 4)} textAnchor="middle">
                            {labelLines.map((line, index) => (
                              <tspan key={`${line}-${index}`} x={position.x} dy={index === 0 ? 0 : 15}>{line}</tspan>
                            ))}
                          </text>
                          <text x={position.x} y={position.y + 31} textAnchor="middle" className={vaultClass("brainNodeMeta")}>
                            {node.accessCount ? `${node.accessCount} reads` : `${node.incoming + node.outgoing} links`}
                          </text>
                        </g>
                      );
                    })}
                    {brainGraph?.links
                      .filter((link) => (
                        selectedBrainNode
                        && (link.source === selectedBrainNode.id || link.target === selectedBrainNode.id)
                        && brainLayout.positions.has(link.source)
                        && brainLayout.positions.has(link.target)
                      ))
                      .filter((link, index, links) => {
                        const selectedId = selectedBrainNode!.id;
                        const otherId = link.source === selectedId ? link.target : link.source;
                        return links.findIndex((candidate) => (
                          (candidate.source === selectedId ? candidate.target : candidate.source) === otherId
                        )) === index;
                      })
                      .slice(0, 24)
                      .map((link, index) => {
                        const selectedId = selectedBrainNode!.id;
                        const otherId = link.source === selectedId ? link.target : link.source;
                        const source = brainLayout.coordsByNode.get(selectedId)!;
                        const target = brainLayout.coordsByNode.get(otherId)!;
                        return (
                          <path
                            key={`${selectedId}-${otherId}-${index}`}
                            data-brain-route={`${selectedId}->${otherId}`}
                            d={brainGraphEdgePath(source, target, brainLayout.positionsByCoord, brainLayout.radius)}
                            className={vaultClass("brainEdgeActive")}
                          />
                        );
                      })}
                  </svg>
                  {brainGraphLoading ? <BrainGraphLoader compact /> : null}
                </>
              ) : brainGraphLoading ? (
                <BrainGraphLoader />
              ) : (
                <div className={vaultClass("brainEmpty")}>
                  <Hexagon aria-hidden="true" />
                  <strong>No graph loaded</strong>
                  <span>{brainGraphStatus || "Refresh the graph after the vault path is reachable."}</span>
                </div>
              )}
            </div>
            <p className={vaultClass("brainStatus")}>{brainGraphStatus || "Graph waits for the shared vault."}</p>
          </section>

          <aside className={vaultClass("brainInspector")}>
            <div className={vaultClass("brainInspectorHeader")}>
              <span><BrainCircuit aria-hidden="true" /> Note inspector</span>
              <small>{selectedAgent?.name ?? "Dashboard"} is the active accessor</small>
            </div>
            {selectedBrainNode ? (
              <>
                <h3>{selectedBrainNode.label}</h3>
                <p>{selectedBrainNode.folder}</p>
                <dl>
                  <div><dt>Incoming</dt><dd>{selectedBrainNode.incoming}</dd></div>
                  <div><dt>Outgoing</dt><dd>{selectedBrainNode.outgoing}</dd></div>
                  <div><dt>Accesses</dt><dd>{selectedBrainNode.accessCount}</dd></div>
                  <div><dt>Last seen</dt><dd>{formatBrainDate(selectedBrainNode.lastAccessedAt)}</dd></div>
                </dl>
                {selectedBrainNode.tags.length ? (
                  <div className={vaultClass("brainTags")}>
                    {selectedBrainNode.tags.map((tag) => <span key={tag}>#{tag}</span>)}
                  </div>
                ) : null}
                <div className={vaultClass("brainAccessList")}>
                  <strong>Access history</strong>
                  {(selectedBrainNode.recentAccesses.length ? selectedBrainNode.recentAccesses : brainGraph?.recentAccesses.slice(0, 5) ?? []).map((event) => (
                    <article key={event.id}>
                      <Bot aria-hidden="true" />
                      <div>
                        <span>{event.agentName} on {event.machineName}</span>
                        <small>{formatBrainDate(event.accessedAt)} · {event.action} · {event.notePath}</small>
                      </div>
                    </article>
                  ))}
                  {!selectedBrainNode.recentAccesses.length && !brainGraph?.recentAccesses.length ? (
                    <p>No agent access history yet. Click a note to seed the audit trail.</p>
                  ) : null}
                </div>
              </>
            ) : (
              <div className={vaultClass("brainEmpty", "compact")}>
                <Hexagon aria-hidden="true" />
                <strong>Select a hive cell</strong>
                <span>Agent and machine access history will appear here.</span>
              </div>
            )}
          </aside>
        </div>
        ) : null}

        {vaultPanelMode === "shared-skills" && brainSkillsLoading ? (
        <section className={vaultClass("brainSkillsLoadingPanel")} aria-label="Loading shared brain skills" aria-busy="true">
          <div className={vaultClass("skillLoadingBeacon")}>
            <div className={vaultClass("skillLoadingComb")}>
              {Array.from({ length: 19 }).map((_, index) => <span key={index} style={{ "--cell-index": index }} />)}
            </div>
          </div>
          <div className={vaultClass("skillLoadingCopy")}>
            <p className="eyebrow">Shared skills</p>
            <h3>Scanning the fleet skill shelf</h3>
            <p>{brainSkillsStatus || "Reading shared brain skills and provider installs across reachable machines."}</p>
          </div>
          <div className={vaultClass("skillLoadingCards")} aria-hidden="true">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className={vaultClass("skillLoadingCard")} style={{ "--card-index": index }}>
                <span />
                <strong />
                <i />
                <i />
                <small />
              </div>
            ))}
          </div>
          <div className={vaultClass("skillLoadingRail")} aria-hidden="true">
            {BRAIN_SKILL_PROVIDER_FALLBACK.map((provider, index) => (
              <span key={provider.id} style={{ "--provider-index": index }}>{provider.label}</span>
            ))}
          </div>
        </section>
        ) : vaultPanelMode === "shared-skills" ? (
        <section className={vaultClass("brainSkillsPanel")} aria-label="Shared brain skills">
          <div className={vaultClass("brainSkillsHeader")}>
            <div>
              <p className="eyebrow">Shared skills</p>
              <h3>Operational recipes in the brain</h3>
              <p>The shared brain is the main skills shelf. Provider installs are scanned below and can be mirrored into Obsidian.</p>
            </div>
            <div className={vaultClass("brainSkillsActions")}>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void syncBrainSkillsToAeon()}
                disabled={brainSkillAeonSyncing || !sharedVault.enabled || !(brainSkills?.shared.length ?? 0)}
              >
                {brainSkillAeonSyncing ? <LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /> : <Repeat2 aria-hidden="true" />}
                {brainSkillAeonSyncing ? "Syncing Aeon" : "Sync to Aeon"}
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={refreshBrainSkills} disabled={brainSkillsLoading || Boolean(brainSkillImportProvider)}>
                {brainSkillsLoading ? <LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /> : <RefreshCcw aria-hidden="true" />}
                {brainSkillsLoading ? "Scanning" : "Refresh skills"}
              </Button>
            </div>
          </div>

          {hermesUpdateRequired ? (
            <p className={vaultClass("hermesUpdateNotice")}>Hermes update available: {hermesUpdateRequiredDetail}. Skills using the newest Hermes features are marked below.</p>
          ) : null}

          {brainSkills?.shared.length ? (
            <div className={vaultClass("sharedSkillGrid")}>
              <button type="button" className={vaultClass("sharedSkillAddCard")} onClick={openSkillBrowser}>
                <Image src="/icons/worker-bee-general-v2.png" alt="" width={34} height={34} unoptimized />
                <strong>Add skill</strong>
                <p>Browse featured and community skills, then mirror the ones you trust into the shared brain.</p>
              </button>
              {brainSkills.shared.map((skill) => {
                const needsHermesUpdate = skillRequiresHermesUpdate(skill, hermesUpdateRequired);
                return (
                  <article key={skill.id} className={vaultClass("sharedSkillCard")}>
                    <div className={vaultClass("sharedSkillSourceLine")}>
                      <span>Shared brain</span>
                      <div className={vaultClass("sharedSkillBadges")}>
                        {skill.providerLabel !== "Shared brain" ? <small>from {skill.providerLabel}</small> : null}
                        {needsHermesUpdate ? <small className={vaultClass("skillUpdateBadge")}>Needs Hermes update</small> : null}
                      </div>
                    </div>
                    <strong>{skill.name}</strong>
                    <p>{skill.description || "No description in SKILL.md frontmatter yet."}</p>
                    <small className={vaultClass("sharedSkillPath")}>{skill.relativePath}</small>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={vaultClass("brainSkillsEmpty")}>
              <button type="button" className={vaultClass("sharedSkillAddCard", "emptyAddCard")} onClick={openSkillBrowser}>
                <Image src="/icons/queen-bee-v2.png" alt="" width={36} height={36} unoptimized />
                <strong>Browse skills</strong>
                <p>Add the first shared skill to the brain.</p>
              </button>
              <div>
                <strong>No shared skills yet</strong>
                <p>The vault Skills folder is empty. Import every discovered provider skill, or choose one harness at a time.</p>
              </div>
            </div>
          )}

          <div className={vaultClass("providerSkillsToolbar")}>
            <div>
              <strong>Provider installs</strong>
              <span>{brainSkills?.totals.importable ?? 0} skill{(brainSkills?.totals.importable ?? 0) === 1 ? "" : "s"} ready to mirror into Obsidian</span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className={vaultClass("providerImportAllButton")}
              onClick={() => void importBrainSkills("all")}
              disabled={Boolean(brainSkillImportProvider) || !brainSkillImportableCount}
              title={brainSkillImportAllDescription}
              aria-label={brainSkillImportAllDescription}
            >
              {brainSkillImportProvider === "all" ? <LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /> : brainSkillImportSuccess === "all" ? <Check aria-hidden="true" /> : <Download aria-hidden="true" />}
              {brainSkillImportProvider === "all" ? "Importing missing skills" : brainSkillImportSuccess === "all" ? "Missing skills imported" : brainSkillImportAllLabel}
            </Button>
          </div>

          <label className={vaultClass("providerAutoSyncMaster")}>
            <input
              type="checkbox"
              checked={sharedVault.skillAutoSyncAll}
              onChange={(event) => void updateAllSkillAutoSync(event.target.checked)}
            />
            <span>
              <strong>Auto-import all provider skills</strong>
              <small>Keep every provider mirrored across all machines; changed skills are archived before replacement and removals stay safe.</small>
            </span>
          </label>

          <div className={vaultClass("providerSkillStrip")}>
            {(brainSkills?.providers ?? BRAIN_SKILL_PROVIDER_FALLBACK).map((provider) => {
              const importable = provider.skills.filter((skill) => !skill.imported).length;
              const imported = provider.skills.length - importable;
              const updateRequiredCount = provider.skills.filter((skill) => skillRequiresHermesUpdate({ ...skill, providerId: provider.id, source: provider.label }, hermesUpdateRequired)).length;
              const autoSyncPolicy = sharedVault.skillAutoSyncAll
                ? { autoImport: true, autoUpdate: true, trackRemovals: true, allowDelete: false }
                : sharedVault.skillAutoSync?.[provider.id] ?? { autoImport: false, autoUpdate: false, trackRemovals: false, allowDelete: false };
              const providerStatus = !provider.installed
                ? `No ${provider.home} install found`
                : importable > 0 && imported > 0
                  ? `${importable} ready · ${imported} shared`
                  : importable > 0
                    ? `${importable} ready to import`
                    : imported > 0
                      ? `${imported} in shared brain`
                      : "No skills found";
              const pending = brainSkillImportProvider === provider.id;
              const success = brainSkillImportSuccess === provider.id;
              return (
                <article key={provider.id}>
                  <div>
                    <span>{provider.label}</span>
                    <strong>{provider.skills.length}</strong>
                    <small>{providerStatus}</small>
                    {updateRequiredCount ? <small className={vaultClass("providerUpdateBadge")}>{updateRequiredCount} need Hermes update</small> : null}
                    <div className={vaultClass("providerAutoSyncControls")}>
                      <label>
                        <input
                          type="checkbox"
                          checked={autoSyncPolicy.autoImport}
                          disabled={sharedVault.skillAutoSyncAll}
                          onChange={(event) => void updateSkillAutoSync(provider.id, {
                            autoImport: event.target.checked,
                            autoUpdate: event.target.checked ? autoSyncPolicy.autoUpdate : false,
                            trackRemovals: event.target.checked ? autoSyncPolicy.trackRemovals : false,
                            allowDelete: false,
                          })}
                        />
                        <small>auto import</small>
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={autoSyncPolicy.autoUpdate}
                          disabled={sharedVault.skillAutoSyncAll || !autoSyncPolicy.autoImport}
                          onChange={(event) => void updateSkillAutoSync(provider.id, { autoUpdate: event.target.checked })}
                        />
                        <small>updates</small>
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={autoSyncPolicy.trackRemovals}
                          disabled={sharedVault.skillAutoSyncAll || !autoSyncPolicy.autoImport}
                          onChange={(event) => void updateSkillAutoSync(provider.id, { trackRemovals: event.target.checked, allowDelete: false })}
                        />
                        <small>safe removals</small>
                      </label>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className={vaultClass("providerSkillButton")}
                    disabled={!importable || Boolean(brainSkillImportProvider)}
                    onClick={() => void importBrainSkills(provider.id)}
                  >
                    {pending ? <LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /> : success ? <Check aria-hidden="true" /> : <Download aria-hidden="true" />}
                    {pending ? "Importing" : success ? "Synced" : importable ? "Import" : "Current"}
                  </Button>
                </article>
              );
            })}
          </div>
          <p className={vaultClass("brainStatus")}>{brainSkillsStatus || "Skills scan waits for the shared vault."}</p>
        </section>
        ) : null}

        {vaultPanelMode === "brain-services" ? (
        <section className={vaultClass("brainServicesPanel")} aria-label="Brain services">
          <div className={vaultClass("brainSkillsHeader")}>
            <div>
              <p className="eyebrow">Brain services</p>
              <h3>Retrieval, synthesis, and reviewed memory</h3>
              <p>GBrain stays optional but first-class: it can index the vault, expose MCP, scaffold its namespaced skills, and run retrieval or dream cycles without taking over the Synthesis layer.</p>
            </div>
            <div className={vaultClass("brainSkillsActions")}>
              <Button type="button" size="sm" variant="secondary" onClick={refreshGbrainStatus} disabled={Boolean(gbrainBusy)}>
                {gbrainBusy === "status" ? <LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /> : <RefreshCcw aria-hidden="true" />}
                {gbrainBusy === "status" ? "Checking" : "Refresh"}
              </Button>
            </div>
          </div>

          <div className={vaultClass("brainServiceGrid")}>
            <article className={vaultClass("brainServiceCard", gbrainStatus?.installed && "active")}>
              <div className={vaultClass("brainServiceTopline")}>
                <span><BrainCircuit aria-hidden="true" /> GBrain</span>
                <small className={vaultClass(gbrainStatus?.installed ? "serviceBadgeLive" : "serviceBadgeIdle")}>
                  {gbrainStatus?.installed ? "Installed" : "Optional"}
                </small>
              </div>
              <h4>Retrieval, graph, MCP, and dream cycle</h4>
              <p>{gbrainStatus?.error || "Install or connect GBrain when you want semantic retrieval and synthesized answers over the shared vault."}</p>

              <div className={vaultClass("brainServiceStats")}>
                <span><FileText aria-hidden="true" /><strong>{gbrainMetric(["page_count", "pages", "pageCount"])}</strong>Pages</span>
                <span><GitBranch aria-hidden="true" /><strong>{gbrainMetric(["link_count", "links", "linkCount"])}</strong>Links</span>
                <span><Activity aria-hidden="true" /><strong>{gbrainStatus?.features?.brainScore ?? "—"}</strong>Score</span>
                <span><PlugZap aria-hidden="true" /><strong>{gbrainStatus?.mcp?.mode ?? sharedVault.gbrain.mcpMode}</strong>MCP</span>
              </div>

              <div className={vaultClass("brainServiceBadges")}>
                <span><KeyRound aria-hidden="true" />ZE {gbrainKeys.ZEROENTROPY_API_KEY ? "ready" : "missing"}</span>
                <span>OpenAI {gbrainKeys.OPENAI_API_KEY ? "ready" : "missing"}</span>
                <span>Anthropic {gbrainKeys.ANTHROPIC_API_KEY ? "ready" : "optional"}</span>
                <span>{sharedVault.gbrain.searchMode}</span>
              </div>

              <div className={vaultClass("brainServiceActions")}>
                {!gbrainStatus?.installed ? (
                  <>
                    <Button type="button" size="sm" variant="secondary" disabled={Boolean(gbrainBusy)} onClick={() => void runGbrainAction("install")}>
                      {gbrainBusy === "install" ? <LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /> : <Download aria-hidden="true" />}
                      Install GBrain
                    </Button>
                    <Button type="button" size="sm" variant="secondary" disabled={Boolean(gbrainBusy)} onClick={() => void runGbrainAction("connect")}>
                      {gbrainBusy === "connect" ? <LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /> : <PlugZap aria-hidden="true" />}
                      Connect existing
                    </Button>
                  </>
                ) : (
                  <>
                    <Button type="button" size="sm" variant="secondary" disabled={Boolean(gbrainBusy)} onClick={() => void runGbrainAction("import")}>
                      {gbrainBusy === "import" ? <LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /> : <Download aria-hidden="true" />}
                      Import vault
                    </Button>
                    <Button type="button" size="sm" variant="secondary" disabled={Boolean(gbrainBusy)} onClick={() => void runGbrainAction("embed")}>
                      {gbrainBusy === "embed" ? <LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /> : <Network aria-hidden="true" />}
                      Embed stale
                    </Button>
                    <Button type="button" size="sm" variant="secondary" disabled={Boolean(gbrainBusy)} onClick={() => void runGbrainAction("dream")}>
                      {gbrainBusy === "dream" ? <LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /> : <Sparkles aria-hidden="true" />}
                      Dream
                    </Button>
                  </>
                )}
              </div>

              <div className={vaultClass("gbrainQueryBox")}>
                <label>
                  <span>Ask GBrain</span>
                  <textarea
                    value={gbrainQuery}
                    onChange={(event) => setGbrainQuery(event.target.value)}
                    rows={3}
                    placeholder="What changed across active projects this week?"
                  />
                </label>
                <Button type="button" size="sm" variant="secondary" disabled={Boolean(gbrainBusy) || !gbrainStatus?.installed} onClick={() => void queryGbrainFromDashboard()}>
                  {gbrainBusy === "query" ? <LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /> : <BrainCircuit aria-hidden="true" />}
                  Think
                </Button>
                {gbrainQueryResult ? <pre>{gbrainQueryResult}</pre> : null}
              </div>
            </article>

            <article className={vaultClass("brainServiceCard", "synthesis")}>
              <div className={vaultClass("brainServiceTopline")}>
                <span><Sparkles aria-hidden="true" /> Synthesis</span>
                <small className={vaultClass("serviceBadgeLive")}>Foundation</small>
              </div>
              <h4>Reviewed Synto layer</h4>
              <p>Synthesis is the curated layer for drafts, reviewed wiki articles, source trails, and agent packs. It can read from the same vault surface GBrain indexes.</p>
              <div className={vaultClass("brainServiceStats")}>
                <span><FolderOpen aria-hidden="true" /><strong>{sharedVault.synthesisFolder || DEFAULT_SHARED_VAULT.synthesisFolder}</strong>Root</span>
                <span><FileText aria-hidden="true" /><strong>raw</strong>Queue</span>
                <span><Check aria-hidden="true" /><strong>wiki</strong>Reviewed</span>
                <span><Download aria-hidden="true" /><strong>pack</strong>Agents</span>
              </div>
              <div className={vaultClass("brainServiceBadges")}>
                <span>Manual review default</span>
                <span>Local Ollama preferred</span>
                <span>No vector DB conflict</span>
              </div>
            </article>
          </div>

          {gbrainRecommendations.length ? (
            <div className={vaultClass("brainServiceRecommendations")}>
              <strong><CircleAlert aria-hidden="true" /> GBrain recommendations</strong>
              {gbrainRecommendations.slice(0, 4).map((recommendation) => (
                <span key={recommendation.id}>{recommendation.title} · <code>{recommendation.command}</code></span>
              ))}
            </div>
          ) : null}

          <p className={vaultClass("brainStatus")}>{gbrainActionStatus || "GBrain is optional until you install or connect it. Provider key readiness is shown without revealing secrets."}</p>
        </section>
        ) : null}

        {vaultPanelMode === "config" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <MemoryCell
            enabled={sharedVault.enabled}
            vaultPath={sharedVault.vaultPath}
            optedInAgentCount={displayAgents.filter((agent) => agent.useSharedVault !== false).length}
            totalAgentCount={displayAgents.length}
            primaryAction={(
              <label className="inline-flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={sharedVault.enabled}
                  onChange={(event) => updateSharedVault({ enabled: event.target.checked })}
                />
                {sharedVault.enabled ? "Shared brain on" : "Turn on shared brain"}
              </label>
            )}
            details={(
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                  Vault folder
                  <input
                    value={sharedVault.vaultPath}
                    onChange={(event) => updateSharedVault({ vaultPath: event.target.value })}
                    className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                  />
                  <small>Where shared notes live. Read-only until the vault is reachable.</small>
                </label>
                <div className="rounded-lg border border-[rgba(148,163,184,0.14)] bg-[rgba(10,14,21,0.45)] p-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
		                    <div>
		                      <strong className="block text-xs text-[var(--foreground)]">Vault sync provider</strong>
		                      <small className="text-[var(--muted)]">Choose one owner for realtime vault syncing. Manual repair uses rsync and writes explicit conflict copies.</small>
		                    </div>
		                    <span className="rounded-full border border-[rgba(20,184,166,0.3)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#99f6e4]">
		                      {sharedVault.syncProvider === "syncthing" ? "Syncthing" : sharedVault.syncProvider === "manual" ? "Manual repair" : "External sync"}
		                    </span>
	                  </div>
	                  <label className="mb-3 flex flex-col gap-1 text-xs text-[var(--muted)]">
	                    Sync owner
	                    <select
	                      value={sharedVault.syncProvider}
	                      onChange={(event) => {
	                        const syncProvider = event.target.value as SharedVaultConfig["syncProvider"];
	                        updateSharedVault({
	                          syncProvider,
	                          syncthingAutoPairEnabled: syncProvider === "syncthing"
	                            ? sharedVault.syncthingAutoPairEnabled
	                            : false,
	                        });
	                      }}
	                      className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
	                    >
	                      <option value="external">I already use Obsidian Sync, iCloud, Dropbox, Git, or another provider</option>
	                      <option value="syncthing">Use HivemindOS Syncthing over Tailscale</option>
	                      <option value="manual">Manual Tailscale SSH repair only</option>
	                    </select>
	                    <small>
	                      {sharedVault.syncProvider === "external"
	                        ? "HivemindOS will not auto-pair Syncthing for this vault."
	                        : sharedVault.syncProvider === "syncthing"
	                          ? "Syncthing owns realtime sync. Syncthing conflict files appear in the vault and Syncthing UI."
	                          : "Realtime sync is handled elsewhere or off; rsync repair can create .conflict-host-timestamp copies."}
	                    </small>
	                  </label>
	                  <div className="grid gap-3 sm:grid-cols-2">
	                    <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
	                      Tailscale machine
                      <input
                        value={sharedVault.tailnetSyncHost}
                        onChange={(event) => updateSharedVault({ tailnetSyncHost: event.target.value })}
                        placeholder="user@machine or magicdns-name"
                        className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                      Remote vault folder override
                      <input
                        value={sharedVault.tailnetSyncPath}
                        onChange={(event) => updateSharedVault({ tailnetSyncPath: event.target.value })}
                        placeholder="Leave blank for collector default"
                        className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                      />
	                    </label>
	                  </div>
	                  <div className="mt-3 flex flex-wrap items-center gap-2">
	                    {sharedVault.syncProvider === "syncthing" ? (
	                      <label className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground)]">
	                        <input
	                          type="checkbox"
	                          checked={sharedVault.syncthingAutoPairEnabled}
	                          onChange={(event) => updateSharedVault({ syncthingAutoPairEnabled: event.target.checked })}
	                        />
	                        Auto-pair Syncthing with reachable Tailnet collectors
	                      </label>
	                    ) : null}
	                    <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
	                      Repair direction
                      <select
                        value={sharedVault.tailnetSyncDirection}
                        onChange={(event) => updateSharedVault({ tailnetSyncDirection: event.target.value as "bidirectional" | "push" | "pull" })}
                        className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                      >
                        <option value="bidirectional">Bidirectional with conflict copies</option>
                        <option value="push">This Mac to Tailnet machine</option>
	                        <option value="pull">Tailnet machine to This Mac</option>
	                      </select>
	                    </label>
		                    {sharedVault.syncProvider === "syncthing" ? (
		                      <Button type="button" size="sm" variant="secondary" disabled={Boolean(vaultSyncPending)} onClick={pairSyncthingVaultSync}>
		                        {vaultSyncPending === "syncthing" ? "Pairing..." : "Pair realtime sync"}
		                      </Button>
		                    ) : null}
		                    <Button type="button" size="sm" variant="secondary" disabled={Boolean(vaultSyncPending)} onClick={() => runVaultTailnetSync(true)}>
		                      {vaultSyncPending === "dry-run" ? "Checking..." : "Dry run"}
	                    </Button>
                    <Button type="button" size="sm" variant="secondary" disabled={Boolean(vaultSyncPending)} onClick={() => runVaultTailnetSync(false)}>
                      {vaultSyncPending === "sync" ? "Syncing..." : "Sync now"}
                    </Button>
                  </div>
	                  {vaultSyncStatus ? (
		                    <p className={`mt-3 text-xs ${vaultSyncStatus.ok ? "text-[#86efac]" : "text-[#fecdd3]"}`}>
		                      {vaultSyncStatus.ok
		                        ? vaultSyncStatus.message ?? `${vaultSyncStatus.dryRun ? "Dry run" : "Repair sync"} finished. ${vaultSyncStatus.direction === "bidirectional" ? "Merged with" : vaultSyncStatus.direction === "pull" ? "Pulled from" : "Pushed to"} ${sharedVault.tailnetSyncHost || "Tailnet machine"}.${vaultSyncStatus.conflicts?.length ? ` rsync conflict copies: ${vaultSyncStatus.conflicts.length}. Look for .conflict-host-timestamp files in the vault.` : ""}`
		                        : vaultSyncStatus.error ?? vaultSyncStatus.stderr ?? "Tailnet sync failed."}
	                    </p>
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                    Inbox subfolder
                    <input
                      value={sharedVault.inboxFolder}
                      onChange={(event) => updateSharedVault({ inboxFolder: event.target.value })}
                      className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                    Shared note path
                    <input
                      value={sharedVault.sharedNotePath}
                      onChange={(event) => updateSharedVault({ sharedNotePath: event.target.value })}
                      className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                  Kanban folder
                  <input
                    value={sharedVault.kanbanFolder ?? DEFAULT_SHARED_VAULT.kanbanFolder}
                    onChange={(event) => updateSharedVault({ kanbanFolder: event.target.value })}
                    className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                  />
                  <small>The Work board stores `kanban.json` files here so synced machines and agents see the same queue.</small>
                </label>
                <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                  Notifications folder
                  <input
                    value={sharedVault.notificationsFolder ?? DEFAULT_SHARED_VAULT.notificationsFolder}
                    onChange={(event) => updateSharedVault({ notificationsFolder: event.target.value })}
                    className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                  />
                  <small>Agents write markdown notifications here. The dashboard keeps read receipts and settings beside them.</small>
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                    Synthesis folder
                    <input
                      value={sharedVault.synthesisFolder ?? DEFAULT_SHARED_VAULT.synthesisFolder}
                      onChange={(event) => updateSharedVault({ synthesisFolder: event.target.value })}
                      className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                    Brain services folder
                    <input
                      value={sharedVault.brainServicesFolder ?? DEFAULT_SHARED_VAULT.brainServicesFolder}
                      onChange={(event) => updateSharedVault({ brainServicesFolder: event.target.value })}
                      className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                    />
                  </label>
                </div>
                <div className="rounded-lg border border-[rgba(148,163,184,0.14)] bg-[rgba(10,14,21,0.45)] p-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <strong className="block text-xs text-[var(--foreground)]">GBrain integration</strong>
                      <small className="text-[var(--muted)]">Optional retrieval, graph, and MCP layer. Secrets stay in env, never in the vault.</small>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground)]">
                      <input
                        type="checkbox"
                        checked={sharedVault.gbrain.enabled}
                        onChange={(event) => updateSharedVault({ gbrain: { ...sharedVault.gbrain, enabled: event.target.checked } })}
                      />
                      {sharedVault.gbrain.enabled ? "Enabled" : "Disabled"}
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                      Search mode
                      <select
                        value={sharedVault.gbrain.searchMode}
                        onChange={(event) => updateSharedVault({ gbrain: { ...sharedVault.gbrain, searchMode: event.target.value } })}
                        className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                      >
                        <option value="conservative">Conservative</option>
                        <option value="balanced">Balanced</option>
                        <option value="tokenmax">Tokenmax</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                      Provider policy
                      <select
                        value={sharedVault.gbrain.providerPolicy}
                        onChange={(event) => updateSharedVault({ gbrain: { ...sharedVault.gbrain, providerPolicy: event.target.value } })}
                        className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                      >
                        <option value="balanced-cloud">Balanced cloud</option>
                        <option value="local-first">Local first</option>
                        <option value="max-quality">Max quality</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                      MCP mode
                      <select
                        value={sharedVault.gbrain.mcpMode}
                        onChange={(event) => updateSharedVault({ gbrain: { ...sharedVault.gbrain, mcpMode: event.target.value } })}
                        className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                      >
                        <option value="stdio">stdio</option>
                        <option value="http">HTTP</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </label>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                  <input
                    type="checkbox"
                    checked={sharedVault.noteTaskImportEnabled}
                    onChange={(event) => updateSharedVault({ noteTaskImportEnabled: event.target.checked })}
                  />
                  Auto-import markdown note tasks into Work Ideas
                </label>
                <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                  Note task folders
                  <textarea
                    value={sharedVault.noteTaskImportFolders ?? DEFAULT_SHARED_VAULT.noteTaskImportFolders}
                    onChange={(event) => updateSharedVault({ noteTaskImportFolders: event.target.value })}
                    rows={3}
                    className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                  />
                  <small>Folder-backed notes from Obsidian, Tailnet sync, or another markdown provider can feed unchecked tasks and Next action sections into Ideas.</small>
                </label>
                <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                  HivemindOS folder
                  <input
                    value={sharedVault.controlRoomPath}
                    onChange={(event) => updateSharedVault({ controlRoomPath: event.target.value })}
                    className="rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                  Agent instructions
                  <textarea
                    value={sharedVault.instructions}
                    onChange={(event) => updateSharedVault({ instructions: event.target.value })}
                    className="min-h-[80px] rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.7)] px-2 py-1 text-[var(--foreground)]"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={checkVaultStatus}>
                    Check vault path
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={checkControlRoomStatus}>
                    Check HivemindOS
                  </Button>
                </div>
              </div>
            )}
          />

          {/* Vault status surfaces are translated into plain sentences instead of raw JSON. */}
          <Cell
            glyph="OK"
            eyebrow="Vault checks"
            title="Path verification"
            subtitle="The app only validates paths — it never writes to your vault unless an agent explicitly does."
            status={(() => {
              if (!vaultStatus && !controlRoomStatus) return "unknown";
              const vaultOk = Boolean((vaultStatus as { ok?: boolean } | null)?.ok);
              const controlOk = Boolean((controlRoomStatus as { ok?: boolean } | null)?.ok);
              if (vaultStatus && !vaultOk) return "blocked";
              if (controlRoomStatus && !controlOk) return "blocked";
              return "healthy";
            })()}
            tone={(() => {
              if (!vaultStatus && !controlRoomStatus) return "muted";
              const vaultOk = Boolean((vaultStatus as { ok?: boolean } | null)?.ok);
              const controlOk = Boolean((controlRoomStatus as { ok?: boolean } | null)?.ok);
              if ((vaultStatus && !vaultOk) || (controlRoomStatus && !controlOk)) return "danger";
              return "success";
            })()}
          >
            <ul className="m-0 grid gap-2 p-0 [list-style:none] text-xs">
              <li className="rounded-md border border-[rgba(148,163,184,0.14)] bg-[rgba(10,14,21,0.55)] px-3 py-2">
                <strong className="block text-[var(--foreground)]">Vault path</strong>
                <span className="text-[var(--muted)]">
                  {vaultStatus
                    ? (vaultStatus as { ok?: boolean; reason?: string }).ok
                      ? "Reachable. Notes can be read by opted-in agents."
                      : `Cannot read this folder — ${(vaultStatus as { reason?: string }).reason ?? "check that it exists."}`
                    : "Press Check vault path above to verify."}
                </span>
              </li>
              <li className="rounded-md border border-[rgba(148,163,184,0.14)] bg-[rgba(10,14,21,0.55)] px-3 py-2">
                <strong className="block text-[var(--foreground)]">HivemindOS</strong>
                <span className="text-[var(--muted)]">
                  {controlRoomStatus
                    ? (controlRoomStatus as { ok?: boolean; reason?: string }).ok
                      ? "Connected. Agents see the operating manual and registry."
                      : `Not connected — ${(controlRoomStatus as { reason?: string }).reason ?? "verify the folder path."}`
                    : "Press Check HivemindOS to verify."}
                </span>
              </li>
            </ul>
          </Cell>
        </div>
        ) : null}
      </section>
      ) : null}

  </>);
}
