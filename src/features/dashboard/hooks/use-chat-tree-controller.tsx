// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
"use client";

/* eslint-disable react-hooks/immutability, react-hooks/purity */

import { useCallback, useEffect, useMemo } from "react";

export function useChatTreeController(props: any) {
  const { RUNTIME_CAPABILITIES, RUNTIME_DEFAULTS, RUNTIME_KINDS, RUNTIME_LABELS, agentWorkById, chatCustomFolders, chatDedupeKey, chatFolderDraft, chatFolderLabel, chatLeafFromStorageKey, chatMessageStorageKey, chatMessageWindow, chatPreviewDedupeKey, chatSeedMessagesForTask, chooseDirectoryForMachine, createChatLeafKey, displayAgents, findRosterChatTask, hermesRuntimeSessionIdFromTask, isChatSidebarTask, isManualAgentChatMessage, logClientTelemetry, machineGroups, messagesByAgent, parentPathFromPath, preferChatTreeItem, recordRecentDirectory, runtimeCan, runtimeSessionForChat, selectedAgent, selectedChatDirectoryPath, selectedChatLeafKey, setActiveView, setChatCustomFolders, setChatFolderDraft, setChatMessageWindow, setMessagesByAgent, setSelectedAgentId, setSelectedChatDirectoryPath, setSelectedChatLeafKey, setSelectedChatPreview, setSelectedChatRuntimeSessionId, setSetupCommandCopied, setSetupMachineKey, setupCollectorCommand, setStatus, setStatusAgentId, taskChatLeafKey, updateAgent, workPriority, workspaceLabelFromPath } = props;
  function switchRuntime(runtime: AgentRuntime) {
    const defaults = RUNTIME_DEFAULTS[runtime];
    updateAgent({
      runtime,
      gatewayUrl: defaults.gatewayUrl,
      chatPath: defaults.chatPath,
      statusPath: defaults.statusPath,
      agentId: runtime === "openclaw" ? "main" : selectedAgent?.agentId ?? "",
      runtimeKind: RUNTIME_KINDS[runtime],
      runtimeCapabilities: RUNTIME_CAPABILITIES[runtime],
      a2aUrl: runtime === "aeon" ? defaults.gatewayUrl : undefined,
      aeonBranch: runtime === "aeon" ? "main" : undefined,
      aeonMode: runtime === "aeon" ? "github" : undefined,
    });
  }

  function appendMessage(agentId: string, message: ChatMessage, storageKey = agentId) {
    logClientTelemetry("chat.message.appended", {
      agentId,
      storageKey,
      role: message.role,
      kanbanTaskId: message.kanbanTaskId ?? null,
      surface: message.surface ?? null,
      contentLength: message.content.length,
      attachmentCount: message.attachments?.length ?? 0,
    });
    setMessagesByAgent((current) => ({
      ...current,
      [storageKey]: [...(current[storageKey] ?? []), { ...message, createdAt: message.createdAt ?? Date.now() }],
    }));
  }

  const hasConversation = useCallback((agentId: string) => {
    return (messagesByAgent[agentId] ?? []).some((message) => (
      message.role !== "system"
      && isManualAgentChatMessage(message)
      && message.content.trim()
    ));
  }, [messagesByAgent]);

  const conversationTitle = useCallback((agentId: string) => {
    const firstUserMessage = (messagesByAgent[agentId] ?? [])
      .find((message) => message.role === "user" && isManualAgentChatMessage(message))
      ?.content.trim();
    return firstUserMessage ? firstUserMessage.slice(0, 56) : "Previous chat";
  }, [messagesByAgent]);

  const hydrateHermesSessionChat = useCallback(async (agent: AgentProfile, sessionId: string, leafKey: string) => {
    const startedAt = Date.now();
    const response = await fetch("/api/chat/agent-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent, sessionId }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as {
      ok?: boolean;
      session?: {
        sessionId?: string;
        messages?: Array<{ role?: string; content?: string; createdAt?: number; index?: number }>;
      };
    } | null;
    const hydratedMessages = (data?.session?.messages ?? [])
      .filter((message) => (
        (message.role === "user" || message.role === "assistant")
        && typeof message.content === "string"
        && message.content.trim()
      ))
      .map((message): ChatMessage => ({
        role: message.role as "user" | "assistant",
        content: message.content!.trim(),
        createdAt: Number(message.createdAt || 0) || undefined,
        sourceSessionId: data?.session?.sessionId ?? sessionId,
        sourceIndex: Number.isFinite(Number(message.index)) ? Number(message.index) : undefined,
      }));
    if (!hydratedMessages.length) return;

    const storageKey = chatMessageStorageKey(agent.id, leafKey);
    setMessagesByAgent((current) => {
      const existing = current[storageKey] ?? [];
      const userSentAfterOpen = existing.some((message) => (
        message.role === "user"
        && !message.sourceSessionId
        && Number(message.createdAt || 0) >= startedAt
      ));
      return userSentAfterOpen ? current : { ...current, [storageKey]: hydratedMessages };
    });
    setSelectedChatPreview((current) => (
      current?.agentId === agent.id && current.leafKey === leafKey
        ? { ...current, messages: hydratedMessages }
        : current
    ));
  }, []);

  const startAgentChat = useCallback((agentId: string, options: { fresh?: boolean; messageLimit?: number; seedMessages?: ChatMessage[]; chatLeafKey?: string; workingDirectoryPath?: string; runtimeSessionId?: string } = {}) => {
    const agent = displayAgents.find((item) => item.id === agentId);
    if (!runtimeCan(agent, "chat")) return;
    if (!agent) return;
    const leafBase = options.chatLeafKey ?? `agent-${agentId}`;
    const leafKey = options.fresh ? createChatLeafKey(agentId, leafBase.replace(new RegExp(`-${agentId}$`), "")) : leafBase;
    const machine = machineGroups.find((group) => group.agents.some((item) => item.id === agentId));
    setSelectedAgentId(agentId);
    setSelectedChatLeafKey(leafKey);
    setSelectedChatRuntimeSessionId(runtimeSessionForChat(agent, leafKey, options.runtimeSessionId));
    setSelectedChatDirectoryPath(options.workingDirectoryPath ?? machine?.version?.appDir ?? agent?.localDataDir ?? "");
    setSelectedChatPreview(options.seedMessages?.length ? { agentId, leafKey, messages: options.seedMessages } : null);
    setActiveView("chat");
    setStatus(null);
    setStatusAgentId("");
    setChatMessageWindow(options.messageLimit ? { agentId, limit: options.messageLimit } : null);
    if (options.fresh) {
      const storageKey = chatMessageStorageKey(agentId, leafKey);
      setMessagesByAgent((current) => ({ ...current, [storageKey]: [] }));
    } else if (options.seedMessages?.length) {
      const storageKey = chatMessageStorageKey(agentId, leafKey);
      setMessagesByAgent((current) => {
        const existing = current[storageKey] ?? [];
        const hasExistingConversation = existing.some((message) => message.role !== "system" && message.content.trim());
        return hasExistingConversation ? current : { ...current, [storageKey]: options.seedMessages ?? [] };
      });
    }
  }, [displayAgents, machineGroups]);

  const startAgentWorkChat = useCallback((agentId: string, displayedTask?: string) => {
    const agent = displayAgents.find((item) => item.id === agentId);
    const agentWork = agentWorkById[agentId] ?? [];
    const match = findRosterChatTask(agentWork, displayedTask);
    if (!match) {
      startAgentChat(agentId);
      return;
    }
    const { task, index: taskIndex } = match;
    const leafKey = taskChatLeafKey(agentId, task, taskIndex);
    const runtimeSessionId = hermesRuntimeSessionIdFromTask(task);
    startAgentChat(agentId, {
      messageLimit: runtimeSessionId ? undefined : 5,
      seedMessages: chatSeedMessagesForTask(task),
      chatLeafKey: leafKey,
      workingDirectoryPath: task.workingDirectory,
      runtimeSessionId,
    });
    if (agent && runtimeSessionId) void hydrateHermesSessionChat(agent, runtimeSessionId, leafKey);
  }, [agentWorkById, displayAgents, hydrateHermesSessionChat, startAgentChat]);

  function openChatFolderCreator(machine: MachineGroup) {
    const chatAgents = machine.agents.filter((agent) => runtimeCan(agent, "chat"));
    const agent = chatAgents[0];
    if (!agent) return;
    void chooseDirectoryForMachine?.({
      key: machine.key,
      name: machine.self ? "This Mac" : machine.name,
      collectorUrl: machine.collectorUrl,
    }, (directory) => {
      const path = directory.path?.trim();
      if (!path) {
        setStatus("Could not start a chat for that folder because the picker did not return a usable path.");
        setStatusAgentId(agent.id);
        return;
      }
      const label = directory.name || workspaceLabelFromPath(path);
      const linkedDirectory = { ...directory, name: label, path };
      const nextFolder: ChatCustomFolder = {
        id: `${machine.key}-${Date.now()}`,
        machineKey: machine.key,
        label,
        path,
        agentId: agent.id,
        createdAt: Date.now(),
      };
      setChatCustomFolders((current) => [
        nextFolder,
        ...current.filter((folder) => !(folder.machineKey === nextFolder.machineKey && folder.path === nextFolder.path)),
      ]);
      void recordRecentDirectory?.(linkedDirectory, {
        machineName: linkedDirectory.machineName ?? machine.name,
        machineKey: linkedDirectory.machineKey ?? machine.key,
        source: "chat",
      });
      startAgentChat(agent.id, {
        fresh: true,
        workingDirectoryPath: path,
        chatLeafKey: `folder-${machine.key}-${chatDedupeKey(path)}-${agent.id}`,
      });
    });
  }

  function closeChatFolderCreator() {
    setChatFolderDraft({ machineKey: "", parentPath: "", name: "", busy: false, error: "" });
  }

  async function createChatFolder() {
    const machine = machineGroups.find((item) => item.key === chatFolderDraft.machineKey);
    const agent = machine?.agents.find((item) => runtimeCan(item, "chat"));
    const parentPath = chatFolderDraft.parentPath.trim();
    const name = chatFolderDraft.name.trim();
    if (!machine || !agent) {
      setChatFolderDraft((current) => ({ ...current, error: "Pick a machine with an available agent first." }));
      return;
    }
    if (!parentPath || !name) {
      setChatFolderDraft((current) => ({ ...current, error: "Choose a parent directory and name the folder." }));
      return;
    }
    setChatFolderDraft((current) => ({ ...current, busy: true, error: "" }));
    const response = await fetch("/api/chat/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentPath, name }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as { ok?: boolean; path?: string; label?: string; error?: string } | null;
    if (!response?.ok || !data?.ok || !data.path) {
      setChatFolderDraft((current) => ({ ...current, busy: false, error: data?.error ?? "Could not create that folder." }));
      return;
    }
    const label = data.label || workspaceLabelFromPath(data.path);
    const nextFolder: ChatCustomFolder = {
      id: `${machine.key}-${Date.now()}`,
      machineKey: machine.key,
      label,
      path: data.path,
      agentId: agent.id,
      createdAt: Date.now(),
    };
    setChatCustomFolders((current) => [
      nextFolder,
      ...current.filter((folder) => !(folder.machineKey === nextFolder.machineKey && folder.path === nextFolder.path)),
    ]);
    closeChatFolderCreator();
    startAgentChat(agent.id, {
      fresh: true,
      workingDirectoryPath: data.path,
      chatLeafKey: `folder-${machine.key}-${chatDedupeKey(data.path)}-${agent.id}`,
    });
  }

  const chatSidebarTree = useMemo<ChatTreeMachine[]>(() => (
    machineGroups.map((machine) => {
      const folderMap = new Map<string, ChatTreeFolder>();
      const ensureFolder = (label: string, onStartChat?: () => void, path?: string, active?: boolean) => {
        const key = chatDedupeKey(path || label);
        const existing = folderMap.get(key);
        if (existing) {
          if (!existing.onStartChat && onStartChat) existing.onStartChat = onStartChat;
          if (!existing.path && path) existing.path = path;
          if (active) existing.active = true;
          return existing;
        }
        const next: ChatTreeFolder = { key: `${machine.key}-${key}`, label, path, active, chats: [], onStartChat };
        folderMap.set(key, next);
        return next;
      };

      for (const agent of machine.agents.filter((item) => runtimeCan(item, "chat"))) {
        const folderPath = machine.version?.appDir || agent.localDataDir || "";
        const folderLabel = chatFolderLabel(agent, machine);
        const folder = ensureFolder(folderLabel, () => startAgentChat(agent.id, {
          fresh: true,
          workingDirectoryPath: folderPath,
          chatLeafKey: `folder-${machine.key}-${chatDedupeKey(folderPath || folderLabel)}-${agent.id}`,
        }), folderPath, Boolean(selectedChatDirectoryPath && folderPath && selectedChatDirectoryPath === folderPath));
        const hasDirectConversation = hasConversation(agent.id);
        const agentWork = (agentWorkById[agent.id] ?? []).filter(isChatSidebarTask);
        const latestAgentWork = agentWork.find((task) => task.updatedAt > 0);
        const hasRecentHistory = agentWork.some((task) => task.source !== "dashboard-chat");
        const agentChatKey = `agent-${agent.id}`;
        const shouldShowDirectChat = hasDirectConversation;
        if (shouldShowDirectChat) {
          folder.chats.push({
            key: agentChatKey,
            title: hasDirectConversation ? conversationTitle(agent.id) : agent.name,
            subtitle: hasDirectConversation ? agent.name : `${RUNTIME_LABELS[agent.runtime]} chat`,
            updatedAt: latestAgentWork?.updatedAt,
            rank: hasRecentHistory ? 1 : 3,
            active: selectedChatLeafKey ? selectedChatLeafKey === agentChatKey : agent.id === selectedAgent?.id && !chatMessageWindow,
            onOpen: () => startAgentChat(agent.id, { chatLeafKey: agentChatKey }),
          });
        }

        for (const [storageKey, storedMessages] of Object.entries(messagesByAgent)) {
          const storedLeafKey = chatLeafFromStorageKey(agent.id, storageKey);
          if (!storedLeafKey || storedLeafKey === agentChatKey || storedLeafKey.startsWith("task-")) continue;
          const manualMessages = storedMessages.filter(isManualAgentChatMessage);
          if (!manualMessages.some((message) => message.content.trim())) continue;
          const firstUser = manualMessages.find((message) => message.role === "user" && message.content.trim());
          const lastMessage = [...manualMessages].reverse().find((message) => message.content.trim());
          folder.chats.push({
            key: storedLeafKey,
            title: firstUser?.content.trim().slice(0, 56) || "Previous chat",
            subtitle: lastMessage?.content.trim().slice(0, 80) || agent.name,
            updatedAt: Math.max(...manualMessages.map((message) => Number(message.createdAt || 0))),
            rank: 4,
            active: selectedChatLeafKey === storedLeafKey,
            onOpen: () => startAgentChat(agent.id, { chatLeafKey: storedLeafKey }),
          });
        }

        const selectedStorageKey = chatMessageStorageKey(agent.id, selectedChatLeafKey);
        const selectedLeafMessages = selectedStorageKey !== agent.id
          ? messagesByAgent[selectedStorageKey]?.filter(isManualAgentChatMessage) ?? []
          : [];
        const selectedLeafVisible = [...folderMap.values()].some((treeFolder) => treeFolder.chats.some((chat) => chat.key === selectedChatLeafKey));
        if (
          agent.id === selectedAgent?.id
          && selectedChatLeafKey
          && selectedStorageKey !== agent.id
          && !selectedChatLeafKey.startsWith("task-")
          && !selectedLeafMessages.some((message) => message.content.trim())
          && !selectedLeafVisible
        ) {
          const targetFolder = selectedChatDirectoryPath
            ? ensureFolder(workspaceLabelFromPath(selectedChatDirectoryPath), undefined, selectedChatDirectoryPath, true)
            : folder;
          targetFolder.chats.unshift({
            key: selectedChatLeafKey,
            title: "New Chat",
            subtitle: agent.name,
            rank: 5,
            active: true,
            onOpen: () => startAgentChat(agent.id, { chatLeafKey: selectedChatLeafKey, workingDirectoryPath: selectedChatDirectoryPath }),
          });
        }

        for (const [taskIndex, task] of agentWork.entries()) {
          if (task.source === "dashboard-chat" && hasDirectConversation) continue;
          const seedMessages = chatSeedMessagesForTask(task);
          const taskChatKey = taskChatLeafKey(agent.id, task, taskIndex);
          const taskWorkingDirectory = task.workingDirectory;
          const taskFolder = taskWorkingDirectory
            ? ensureFolder(workspaceLabelFromPath(taskWorkingDirectory), () => startAgentChat(agent.id, {
              fresh: true,
              workingDirectoryPath: taskWorkingDirectory,
              chatLeafKey: `folder-${machine.key}-${chatDedupeKey(taskWorkingDirectory)}-${agent.id}`,
            }), taskWorkingDirectory, selectedChatDirectoryPath === taskWorkingDirectory)
            : folder;
          taskFolder.chats.push({
            key: taskChatKey,
            title: task.title || "Previous chat",
            subtitle: task.lastMessage || agent.name,
            updatedAt: task.updatedAt > 0 ? task.updatedAt : task.startedAt > 0 ? task.startedAt : undefined,
            rank: workPriority(task) + (task.messages?.length ? 3 : 0),
            active: selectedChatLeafKey === taskChatKey,
            onOpen: () => {
              const runtimeSessionId = hermesRuntimeSessionIdFromTask(task);
              startAgentChat(agent.id, {
                messageLimit: runtimeSessionId ? undefined : 5,
                seedMessages,
                chatLeafKey: taskChatKey,
                workingDirectoryPath: task.workingDirectory,
                runtimeSessionId,
              });
              if (runtimeSessionId) void hydrateHermesSessionChat(agent, runtimeSessionId, taskChatKey);
            },
          });
        }
      }

      for (const customFolder of chatCustomFolders.filter((folder) => folder.machineKey === machine.key)) {
        const chatAgents = machine.agents.filter((item) => runtimeCan(item, "chat"));
        const agent = chatAgents.find((item) => item.id === customFolder.agentId) ?? chatAgents[0];
        ensureFolder(customFolder.label, agent ? () => startAgentChat(agent.id, {
          fresh: true,
          workingDirectoryPath: customFolder.path,
          chatLeafKey: `folder-${machine.key}-${chatDedupeKey(customFolder.path)}-${agent.id}`,
        }) : undefined, customFolder.path, Boolean(selectedChatDirectoryPath && selectedChatDirectoryPath === customFolder.path));
      }

      const chatAgents = machine.agents.filter((item) => runtimeCan(item, "chat"));
      return {
        key: machine.key,
        name: machine.name,
        detail: machine.collector === "ready" ? `${machine.agents.length} available` : "Collector not ready",
        onStartChat: chatAgents.length > 0
          ? () => startAgentChat(chatAgents[0].id, {
            fresh: true,
            workingDirectoryPath: machine.version?.appDir || chatAgents[0].localDataDir,
            chatLeafKey: `machine-${machine.key}-${chatAgents[0].id}`,
          })
          : undefined,
        onCreateFolder: chatAgents.length > 0 ? () => openChatFolderCreator(machine) : undefined,
        folders: [...folderMap.values()]
          .map((folder) => ({
            ...folder,
            chats: [...folder.chats.reduce((deduped, chat) => {
              const key = chatPreviewDedupeKey(chat.title, chat.subtitle);
              deduped.set(key, preferChatTreeItem(deduped.get(key), chat));
              return deduped;
            }, new Map<string, ChatTreeItem>()).values()]
              .sort((a, b) => Number(b.active) - Number(a.active) || (b.updatedAt ?? 0) - (a.updatedAt ?? 0) || a.title.localeCompare(b.title)),
          }))
          .sort((a, b) => (
            a.label === "Stray chats" ? 1 : b.label === "Stray chats" ? -1 : a.label.localeCompare(b.label)
          )),
      };
    })
  ), [agentWorkById, chatCustomFolders, chatMessageWindow, conversationTitle, hasConversation, hydrateHermesSessionChat, machineGroups, messagesByAgent, selectedAgent?.id, selectedChatDirectoryPath, selectedChatLeafKey, startAgentChat]);

  const selectedChatMachine = useMemo(() => (
    selectedAgent
      ? chatSidebarTree.find((machine) => machine.folders.some((folder) => (
        folder.chats.some((chat) => chat.active) || machineGroups.find((group) => group.key === machine.key)?.agents.some((agent) => agent.id === selectedAgent.id)
      ))) ?? null
      : null
  ), [chatSidebarTree, machineGroups, selectedAgent]);

  const selectedChatDirectory = useMemo(() => {
    if (!selectedAgent) return "";
    const activeFolder = selectedChatMachine?.folders.find((folder) => folder.active || folder.chats.some((chat) => chat.active));
    if (activeFolder) return activeFolder.label;
    if (selectedChatDirectoryPath) return workspaceLabelFromPath(selectedChatDirectoryPath);
    const machine = machineGroups.find((group) => group.agents.some((agent) => agent.id === selectedAgent.id));
    return machine ? chatFolderLabel(selectedAgent, machine) : workspaceLabelFromPath(selectedAgent.localDataDir);
  }, [machineGroups, selectedAgent, selectedChatDirectoryPath, selectedChatMachine]);

  const chatFolderCreatorMachine = useMemo(
    () => machineGroups.find((machine) => machine.key === chatFolderDraft.machineKey) ?? null,
    [chatFolderDraft.machineKey, machineGroups],
  );

  const chatFolderCreatorParentOptions = useMemo(
    () => {
      if (!chatFolderCreatorMachine) return [];
      return [...new Set([
        chatFolderCreatorMachine.version?.appDir,
        ...chatFolderCreatorMachine.agents.map((agent) => agent.localDataDir),
        ...chatCustomFolders
          .filter((folder) => folder.machineKey === chatFolderCreatorMachine.key)
          .map((folder) => parentPathFromPath(folder.path)),
        "~",
      ].map((path) => path?.trim()).filter(Boolean) as string[])];
    },
    [chatCustomFolders, chatFolderCreatorMachine],
  );

  function openSetupModal(machine: MachineGroup) {
    setSetupMachineKey(machine.key);
    setSetupCommandCopied(false);
  }

  async function copySetupCommand() {
    await navigator.clipboard?.writeText(setupCollectorCommand()).catch(() => undefined);
    setSetupCommandCopied(true);
    window.setTimeout(() => setSetupCommandCopied(false), 2500);
  }

  return { switchRuntime, appendMessage, hasConversation, conversationTitle, hydrateHermesSessionChat, startAgentChat, startAgentWorkChat, openChatFolderCreator, closeChatFolderCreator, createChatFolder, chatSidebarTree, selectedChatMachine, selectedChatDirectory, chatFolderCreatorMachine, chatFolderCreatorParentOptions, openSetupModal, copySetupCommand };
}
