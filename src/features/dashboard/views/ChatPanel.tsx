// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
"use client";

import { ChatFolderModal } from "@/features/dashboard/views/chat/ChatFolderModal";
import { SkillBrowserModal } from "@/features/dashboard/views/chat/SkillBrowserModal";
import { AgentSettingsModal } from "@/features/dashboard/views/chat/AgentSettingsModal";
import { CloseIconButton } from "@/components/ui/close-icon-button";
import { useEffect, useState } from "react";

/* eslint-disable react-hooks/immutability, react-hooks/purity */

export function ChatPanel(props: any) {
  const { Activity, AgentResponseLoader, Button, ChatMarkdown, Check, ComposerField, Copy, Folder, KanbanSquare, LoaderCircle, MessageAttachments, MessageSquare, Monitor, RUNTIME_LABELS, Sparkles, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Upload, activeView, aeonEnvKeys, aeonEnvSyncStatus, aeonEnvSyncing, attachChatDirectory, attachChatRecentDirectory, attachmentError, attachmentMenuOpen, attachmentMenuRef, busy, chatAttachments, chatClass, chatContextMenu, chatContextMenuRef, chatDirectories, chatDisplayContent, chatFileInputRef, chatImageInputRef, chatKanbanGeneration, chatSidebarTree, checkStatus, dismissChatKanbanGeneration, displayAgents, expandedChatFolders, fleetClass, formatAgentEnvText, formatRelativeTime, generateKanbanTaskFromChat, handleChatFileChange, handleChatImageChange, hasStreamingChunk, lastAssistant, machineGroups, messagesEndRef, messagesScrollRef, parseAgentEnvText, recentDirectories, recentDirectoriesExpanded, recording, removeChatAttachment, removeChatDirectory, selectedAgent, selectedChatDirectory, selectedChatMachine, sendMessage, sessionNotice, setAeonEnvKeys, setAttachmentMenuOpen, setChatContextMenu, setExpandedChatFolders, setRecentDirectoriesExpanded, setText, startAgentChat, startAudioRecording, status, statusAgentId, stopAudioRecording, switchRuntime, syncAeonEnvToGitHub, text, updateAgent, updateChatAutoScroll, vaultClass, visibleMessages, voiceBands, voiceTarget, voiceTranscript } = props;
  const [openKanbanTaskMenuKey, setOpenKanbanTaskMenuKey] = useState("");
  const [copiedMessageKey, setCopiedMessageKey] = useState("");
  useEffect(() => {
    if (chatKanbanGeneration?.phase !== "done") return undefined;
    const key = chatKanbanGeneration.key;
    const timer = window.setTimeout(() => {
      dismissChatKanbanGeneration?.(key);
      setOpenKanbanTaskMenuKey((current) => current === key ? "" : current);
    }, 2600);
    return () => window.clearTimeout(timer);
  }, [chatKanbanGeneration, dismissChatKanbanGeneration]);

  function dismissKanbanPopover(messageKey: string) {
    dismissChatKanbanGeneration?.(messageKey);
    setOpenKanbanTaskMenuKey((current) => current === messageKey ? "" : current);
  }

  function copyAssistantResponse(messageKey: string, content: string) {
    void navigator.clipboard?.writeText(content).then(() => {
      setCopiedMessageKey(messageKey);
      window.setTimeout(() => setCopiedMessageKey((current) => current === messageKey ? "" : current), 1400);
    });
  }
  return (<>
      {activeView === "chat" ? (
        <section className={chatClass("workspace", "tabPanel")}>
          <aside className={chatClass("settings")}>
            <div className={chatClass("settingsHeader")}>
              <div>
                <p className="eyebrow">Chat</p>
                <h2>Machines</h2>
              </div>
              <span className={chatClass("runtimeBadge")}>{displayAgents.length} agents</span>
            </div>

            <TooltipProvider>
              <div className={chatClass("machineTree")}>
                {chatSidebarTree.length > 0 ? chatSidebarTree.map((machine) => (
                  <details className={chatClass("machineTreeNode")} key={machine.key} open>
                    <summary>
                      <span className={chatClass("treeDisclosure")} aria-hidden="true" />
                      <Monitor className={chatClass("treeIcon")} aria-hidden="true" />
                      <span className={chatClass("treeLabel")}>{machine.name}</span>
                      {machine.onCreateFolder ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className={chatClass("treeChatButton")}
                              aria-label={`Choose directory on ${machine.name}`}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                machine.onCreateFolder?.();
                              }}
                            >
                              <Folder aria-hidden="true" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">{`Choose directory on ${machine.name}`}</TooltipContent>
                        </Tooltip>
                      ) : null}
                      {machine.onStartChat ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className={chatClass("treeChatButton")}
                              aria-label={`Start chat on ${machine.name}`}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                machine.onStartChat?.();
                              }}
                            >
                              <MessageSquare aria-hidden="true" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">{`New chat in ${machine.name}`}</TooltipContent>
                        </Tooltip>
                      ) : null}
                    </summary>
                    <div className={chatClass("machineTreeChildren")}>
                      {machine.folders.length > 0 ? machine.folders.map((folder) => (
                        <details className={chatClass("machineFolderNode")} key={folder.key} open>
                          <summary>
                            <span className={chatClass("treeDisclosure")} aria-hidden="true" />
                            <Folder className={chatClass("treeIcon")} aria-hidden="true" />
                            <span className={chatClass("treeLabel")}>{folder.label}</span>
                            {folder.onStartChat ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className={chatClass("treeChatButton")}
                                    aria-label={`Start chat in ${folder.label}`}
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      folder.onStartChat?.();
                                    }}
                                  >
                                    <MessageSquare aria-hidden="true" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">{`New chat in ${folder.label}`}</TooltipContent>
                              </Tooltip>
                            ) : null}
                          </summary>
                          <div className={chatClass("machineChatLeaves")}>
                            {(expandedChatFolders.has(folder.key) ? folder.chats : folder.chats.slice(0, 4)).map((chat) => (
                              <button
                                type="button"
                                key={chat.key}
                                className={chatClass(chat.active && "active")}
                                aria-current={chat.active ? "true" : undefined}
                                onClick={chat.onOpen}
                              >
                                <span>{chat.title}</span>
                                {chat.updatedAt ? <time>{formatRelativeTime(chat.updatedAt)}</time> : null}
                                <small>{chat.subtitle}</small>
                              </button>
                            ))}
                            {!expandedChatFolders.has(folder.key) && folder.chats.length > 4 ? (
                              <button
                                type="button"
                                className={chatClass("machineChatShowMore")}
                                onClick={() => setExpandedChatFolders((current) => new Set(current).add(folder.key))}
                              >
                                Show {folder.chats.length - 4} more
                              </button>
                            ) : null}
                            {folder.chats.length === 0 ? (
                              <span className={chatClass("machineTreeEmpty")}>No chats yet</span>
                            ) : null}
                          </div>
                        </details>
                      )) : (
                        <div className={chatClass("machineTreeEmpty")}>No chats yet</div>
                      )}
                    </div>
                  </details>
                )) : (
                  <div className={chatClass("emptyMachineChat")}>
                    <strong>No machines yet</strong>
                    <p>Connect a machine from Agents, then come back here to start chatting.</p>
                  </div>
                )}
              </div>
            </TooltipProvider>

            {selectedAgent ? (
            <>
            <details className={chatClass("advancedSettings")}>
              <summary>Manual setup</summary>
              <div className={chatClass("advancedFields")}>
                <label>
                  Name
                  <input value={selectedAgent.name} onChange={(event) => updateAgent({ name: event.target.value })} />
                </label>

                <label>
                  Runtime
                  <select value={selectedAgent.runtime} onChange={(event) => switchRuntime(event.target.value as AgentRuntime)}>
                    {Object.entries(RUNTIME_LABELS).map(([runtime, label]) => (
                      <option value={runtime} key={runtime}>{label}</option>
                    ))}
                  </select>
                </label>

                <label className={fleetClass("toggleRow")}>
                  <input
                    type="checkbox"
                    checked={selectedAgent.useSharedVault !== false}
                    onChange={(event) => updateAgent({ useSharedVault: event.target.checked })}
                  />
                  Use shared Obsidian vault
                </label>

                <label>
                  Agent-specific env
                  <textarea
                    value={formatAgentEnvText(selectedAgent.agentEnv)}
                    onChange={(event) => updateAgent({ agentEnv: parseAgentEnvText(event.target.value) })}
                    rows={4}
                    placeholder={"WRITER_STYLE=concise\nRESEARCH_REGION=US"}
                  />
                  <small>These overlay shared hive-env-add runtime env values for dashboard-dispatched runs.</small>
                </label>

                <label>
                  {selectedAgent.runtime === "aeon" ? "A2A Gateway URL" : selectedAgent.runtime === "openclaw" ? "Gateway URL" : "Runtime URL"}
                  <input
                    value={selectedAgent.runtime === "aeon" ? selectedAgent.a2aUrl ?? selectedAgent.gatewayUrl : selectedAgent.gatewayUrl}
                    onChange={(event) => updateAgent(selectedAgent.runtime === "aeon"
                      ? { gatewayUrl: event.target.value, a2aUrl: event.target.value }
                      : { gatewayUrl: event.target.value })}
                  />
                </label>

                <label>
                  Agent ID
                  <input value={selectedAgent.agentId ?? ""} onChange={(event) => updateAgent({ agentId: event.target.value })} placeholder="main, researcher, writer..." />
                </label>

                <label>
                  Token
                  <input value={selectedAgent.token ?? ""} onChange={(event) => updateAgent({ token: event.target.value })} placeholder="Optional if runtime config has one" />
                </label>

                {selectedAgent.runtime === "aeon" ? (
                  <>
                    <label>
                      Aeon Repo
                      <input value={selectedAgent.aeonRepo ?? ""} onChange={(event) => updateAgent({ aeonRepo: event.target.value })} placeholder="owner/repo" />
                    </label>
                    <label>
                      Aeon Local Path
                      <input value={selectedAgent.aeonLocalPath ?? selectedAgent.localDataDir ?? ""} onChange={(event) => updateAgent({ aeonLocalPath: event.target.value, localDataDir: event.target.value })} placeholder="~/aeon" />
                    </label>
	                    <label>
	                      Aeon Branch
	                      <input value={selectedAgent.aeonBranch ?? "main"} onChange={(event) => updateAgent({ aeonBranch: event.target.value })} />
	                    </label>
	                    <label>
	                      GitHub secret keys
	                      <textarea
	                        value={aeonEnvKeys}
	                        onChange={(event) => setAeonEnvKeys(event.target.value)}
	                        rows={4}
	                        placeholder="ANTHROPIC_API_KEY&#10;BANKR_LLM_KEY&#10;GH_GLOBAL"
	                      />
	                    </label>
	                    <div className={fleetClass("setupActions")}>
	                      <Button type="button" size="sm" variant="secondary" onClick={() => void syncAeonEnvToGitHub()} disabled={aeonEnvSyncing || !selectedAgent.aeonRepo?.trim()}>
	                        {aeonEnvSyncing ? <LoaderCircle aria-hidden="true" className={vaultClass("spinIcon")} /> : <Upload aria-hidden="true" />}
	                        {aeonEnvSyncing ? "Syncing secrets" : "Sync env to GitHub"}
	                      </Button>
	                      {aeonEnvSyncStatus ? <small>{aeonEnvSyncStatus}</small> : <small>Push selected local HivemindOS/Aeon env keys to this Aeon repo as GitHub Actions secrets.</small>}
	                    </div>
	                  </>
                ) : selectedAgent.runtime !== "openclaw" ? (
                  <>
                    <label>
                      Chat Path
                      <input value={selectedAgent.chatPath ?? "/chat"} onChange={(event) => updateAgent({ chatPath: event.target.value })} />
                    </label>
                    <label>
                      Status Path
                      <input value={selectedAgent.statusPath ?? "/health"} onChange={(event) => updateAgent({ statusPath: event.target.value })} />
                    </label>
                  </>
                ) : (
                  <label>
                    Session Key
                    <input value={selectedAgent.sessionKey ?? ""} onChange={(event) => updateAgent({ sessionKey: event.target.value })} placeholder="Optional OpenClaw session override" />
                  </label>
                )}

                <label>
                  Runtime Data Dir
                  <input
                    value={selectedAgent.localDataDir ?? ""}
                    onChange={(event) => updateAgent({ localDataDir: event.target.value })}
                    placeholder="~/.hermes, /srv/hermes-seo/data, mounted runtime path..."
                  />
                </label>

                <label>
                  Telemetry URL
                  <input
                    value={selectedAgent.telemetryUrl ?? ""}
                    onChange={(event) => updateAgent({ telemetryUrl: event.target.value })}
                    placeholder="http://100.x.y.z:8787"
                  />
                </label>

                <label>
                  Machine Name
                  <input
                    value={selectedAgent.machineName ?? ""}
                    onChange={(event) => updateAgent({ machineName: event.target.value })}
                    placeholder="local, vps-1, macbook, workstation..."
                  />
                </label>
              </div>
            </details>

            </>
            ) : null}
          </aside>

          {selectedAgent ? (
          <section className={chatClass("chat")}>
            <div className={chatClass("chatHeader")}>
              <div>
                <p className="eyebrow">Live conversation</p>
                <h2>{selectedAgent.name}</h2>
                <div className={chatClass("chatContextControls")} ref={chatContextMenuRef}>
                  <div className={chatClass("chatContextControl")}>
                    <button
                      type="button"
                      title="Choose the machine and agent for this chat"
                      onClick={() => setChatContextMenu((current) => current === "machine" ? "" : "machine")}
                    >
                      <Monitor aria-hidden="true" />
                      {selectedChatMachine?.name ?? selectedAgent.machineName ?? "Choose machine"}
                      <span>{selectedAgent.name}</span>
                    </button>
                    {chatContextMenu === "machine" ? (
                      <div className={chatClass("chatContextMenu")} role="menu">
                        {chatSidebarTree.flatMap((machine) => {
                          const group = machineGroups.find((item) => item.key === machine.key);
                          return (group?.agents ?? []).map((agent) => (
                            <button
                              type="button"
                              role="menuitem"
                              key={`${machine.key}-${agent.id}`}
                              onClick={() => {
                                startAgentChat(agent.id, { fresh: true, chatLeafKey: `machine-${machine.key}-${agent.id}` });
                                setChatContextMenu("");
                              }}
                            >
                              <Monitor aria-hidden="true" />
                              <span>{machine.name}</span>
                              <small>{agent.name}</small>
                            </button>
                          ));
                        })}
                      </div>
                    ) : null}
                  </div>
                  <div className={chatClass("chatContextControl")}>
                    <button
                      type="button"
                      title="Choose the working directory for this chat"
                      onClick={() => setChatContextMenu((current) => current === "directory" ? "" : "directory")}
                    >
                      <Folder aria-hidden="true" />
                      {selectedChatDirectory || "Choose directory"}
                    </button>
                    {chatContextMenu === "directory" ? (
                      <div className={chatClass("chatContextMenu")} role="menu">
                        {(selectedChatMachine?.folders.length ? selectedChatMachine.folders : chatSidebarTree.flatMap((machine) => machine.folders)).map((folder) => (
                          <button
                            type="button"
                            role="menuitem"
                            key={folder.key}
                            onClick={() => {
                              folder.onStartChat?.();
                              setChatContextMenu("");
                            }}
                          >
                            <Folder aria-hidden="true" />
                            <span>{folder.label}</span>
                            <small>{folder.chats.length ? `${folder.chats.length} chats` : "New chat"}</small>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              <Button type="button" variant="secondary" onClick={() => checkStatus()}>
                <Activity aria-hidden="true" />
                Check status
              </Button>
            </div>
            {sessionNotice && visibleMessages.length > 0 ? (
              <div className={chatClass("chatSessionNote")}>
                <MessageSquare aria-hidden="true" />
                <span>{sessionNotice}</span>
              </div>
            ) : null}
            {status && statusAgentId === selectedAgent.id ? (
              // Plain-English status summary in place of raw runtime JSON (rule 6).
              <div className="flex items-center gap-2 rounded-md border border-[rgba(148,163,184,0.18)] bg-[rgba(10,14,21,0.55)] px-3 py-2 text-xs">
                <strong className={status.ok ? "text-[#bbf7d0]" : "text-[#fecdd3]"}>
                  {status.ok ? "Runtime is responding." : "Runtime did not respond."}
                </strong>
                <span className="text-[var(--muted)]">
                  {status.runtime ? `${RUNTIME_LABELS[status.runtime]} agent` : "Unknown runtime"}
                  {status.status ? ` · code ${status.status}` : ""}
                  {status.error ? ` · ${status.error}` : ""}
                </span>
                <details className="ml-auto" onClick={(event) => event.stopPropagation()}>
                  <summary className="cursor-pointer text-[0.65rem] uppercase tracking-[0.12em] text-[var(--muted)]">
                    Raw payload
                  </summary>
                  <pre className="mt-2 max-w-full overflow-auto text-[0.7rem] text-[var(--muted)]">{JSON.stringify(status, null, 2)}</pre>
                </details>
              </div>
            ) : null}
            <div
              className={chatClass("messages", visibleMessages.length === 0 && "empty")}
              ref={messagesScrollRef}
              onScroll={updateChatAutoScroll}
            >
              {visibleMessages.length === 0 ? (
                <div className={chatClass("chatEmptyPrompt")}>
                  <strong>No messages yet</strong>
                  <p>Messages with {selectedAgent.name} will appear here.</p>
                </div>
              ) : null}
              {visibleMessages.map((message, index) => {
                const messageKey = `${message.role}-${index}`;
                const displayContent = chatDisplayContent(message);
                const generationForMessage = chatKanbanGeneration?.key === messageKey ? chatKanbanGeneration : null;
                const generating = generationForMessage && ["generating", "creating"].includes(generationForMessage.phase);
                const isStreamingAssistant = message.role === "assistant" && busy && index === visibleMessages.length - 1;
                const canGenerateKanbanTask = message.role === "assistant" && !isStreamingAssistant && displayContent?.trim() && generateKanbanTaskFromChat;
                const copied = copiedMessageKey === messageKey;
                const agentPrompt = message.agentPrompt;
                return (
                  <div className={chatClass("message", message.role, isStreamingAssistant && "streaming")} key={messageKey}>
                    {message.role === "user" ? <span className={chatClass("messageRole")}>You</span> : null}
                    <MessageAttachments attachments={message.attachments} />
                    {agentPrompt ? (
                      <div className={chatClass("agentPromptCard")}>
                        <div className={chatClass("agentPromptHeader")}>
                          <Sparkles aria-hidden="true" />
                          <span>{agentPrompt.type === "approval" ? "Approval needed" : agentPrompt.type === "secret" ? "Secret needed" : agentPrompt.type === "sudo" ? "Local prompt" : "Agent question"}</span>
                        </div>
                        <p>{agentPrompt.question}</p>
                        {agentPrompt.choices?.length ? (
                          <div className={chatClass("agentPromptChoices")}>
                            {agentPrompt.choices.map((choice) => (
                              <button
                                type="button"
                                key={choice}
                                onClick={() => setText(choice)}
                              >
                                {choice}
                              </button>
                            ))}
                          </div>
                        ) : null}
                        {agentPrompt.allowFreeText ? <small>Choose a reply or type your answer below.</small> : null}
                      </div>
                    ) : displayContent ? (
                      <ChatMarkdown text={displayContent} />
                    ) : (
                      message.role === "assistant" && busy ? <AgentResponseLoader /> : <p />
                    )}
                    {isStreamingAssistant && displayContent?.trim() ? (
                      <div className={chatClass("streamingStatus")} aria-live="polite">
                        <span aria-hidden="true" />
                        <small>Still writing</small>
                      </div>
                    ) : null}
                    {message.role === "assistant" && !isStreamingAssistant && displayContent?.trim() ? (
                      <TooltipProvider>
                        <div className={chatClass("messageActions")}>
                          <Tooltip open={copied ? true : undefined}>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className={chatClass("messageActionButton", copied && "active", copied && "copied")}
                                aria-label={copied ? "Copied response" : "Copy response"}
                                onClick={() => copyAssistantResponse(messageKey, displayContent)}
                              >
                                {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">{copied ? "Copied!" : "Copy response"}</TooltipContent>
                          </Tooltip>
                          {canGenerateKanbanTask ? (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className={chatClass("messageActionButton", openKanbanTaskMenuKey === messageKey && "active")}
                                    aria-label="Generate Kanban task from this response"
                                    onClick={() => setOpenKanbanTaskMenuKey((current) => current === messageKey ? "" : messageKey)}
                                    disabled={Boolean(generating)}
                                  >
                                    {generating ? <LoaderCircle aria-hidden="true" /> : <KanbanSquare aria-hidden="true" />}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Send to Kanban</TooltipContent>
                              </Tooltip>
                              {openKanbanTaskMenuKey === messageKey || generationForMessage ? (
                                <div className={chatClass("generateKanbanPopover", generationForMessage && `phase-${generationForMessage.phase}`)}>
                                  <div className={chatClass("generateKanbanHeader")}>
                                    {generationForMessage?.phase === "done"
                                      ? <Check className={chatClass("generateKanbanStatusIcon")} aria-hidden="true" />
                                      : <Sparkles className={chatClass("generateKanbanStatusIcon")} aria-hidden="true" />}
                                    <span>{generationForMessage ? generationForMessage.message : "Generate and send to:"}</span>
                                    {generationForMessage && ["done", "error"].includes(generationForMessage.phase) ? (
                                      <CloseIconButton
                                        className={chatClass("generateKanbanClose")}
                                        size="sm"
                                        aria-label="Close Kanban status"
                                        onClick={() => dismissKanbanPopover(messageKey)}
                                      />
                                    ) : null}
                                  </div>
                                  {generationForMessage ? (
                                    <div className={chatClass("generateKanbanProgress")}>
                                      <span aria-hidden="true" />
                                      <small>{generationForMessage.taskTitle || (generationForMessage.status === "ready" ? "Ready lane" : "Ideas lane")}</small>
                                    </div>
                                  ) : (
                                    <div className={chatClass("generateKanbanActions")}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenKanbanTaskMenuKey(messageKey);
                                          void generateKanbanTaskFromChat("ideas", { key: messageKey, content: displayContent });
                                        }}
                                      >
                                        Ideas
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenKanbanTaskMenuKey(messageKey);
                                          void generateKanbanTaskFromChat("ready", { key: messageKey, content: displayContent });
                                        }}
                                      >
                                        Ready
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : null}
                            </>
                          ) : null}
                        </div>
                      </TooltipProvider>
                    ) : null}
                  </div>
                );
              })}
              <div ref={messagesEndRef} aria-hidden="true" />
            </div>
            {visibleMessages.length === 0 ? (
              <div className={chatClass("chatSuggestions")} aria-label="Suggested prompts">
                {[
                  "What are you working on?",
                  "Summarize latest task",
                  "Check workspace status",
                ].map((prompt) => (
                  <button type="button" key={prompt} onClick={() => setText(prompt)}>
                    {prompt}
                  </button>
                ))}
              </div>
            ) : null}
            <form onSubmit={sendMessage}>
              <ComposerField
                value={text}
                onChange={setText}
                placeholder={`Ask ${selectedAgent.name} to do something...`}
                disabled={busy}
                busy={busy && !hasStreamingChunk}
                attachments={chatAttachments}
                directories={chatDirectories}
                attachmentError={attachmentError}
                attachmentMenuOpen={attachmentMenuOpen}
                setAttachmentMenuOpen={setAttachmentMenuOpen}
                attachmentMenuRef={attachmentMenuRef}
                fileInputRef={chatFileInputRef}
                imageInputRef={chatImageInputRef}
                onFileChange={handleChatFileChange}
                onImageChange={handleChatImageChange}
                onRemoveAttachment={removeChatAttachment}
                onAttachDirectory={() => void attachChatDirectory()}
                recentDirectories={recentDirectories}
                recentDirectoriesExpanded={recentDirectoriesExpanded}
                setRecentDirectoriesExpanded={setRecentDirectoriesExpanded}
                onAttachRecentDirectory={attachChatRecentDirectory}
                onRemoveDirectory={removeChatDirectory}
                recording={recording && voiceTarget === "chat"}
                voiceBands={voiceBands}
                voiceTranscript={voiceTranscript}
                onToggleRecording={recording ? stopAudioRecording : () => void startAudioRecording("chat")}
                canSend={Boolean(text.trim() || chatAttachments.length || chatDirectories.length)}
                submitOnEnter
                hermesSlashCommands={selectedAgent.runtime === "hermes"}
              />
            </form>
            <p className="hint">
              Last assistant response: {lastAssistant ? `${lastAssistant.slice(0, 120)}...` : "none yet"}
            </p>
          </section>
          ) : (
          <section className={chatClass("chat", "chatEmptyState")}>
            <strong>No machine selected</strong>
            <p>Choose a connected machine on the left to start a chat.</p>
          </section>
          )}
        </section>
      ) : null}
      <ChatFolderModal {...props} />

      <SkillBrowserModal {...props} />

      <AgentSettingsModal {...props} />
  </>);
}
