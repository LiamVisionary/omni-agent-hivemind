// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
"use client";

/* eslint-disable react-hooks/immutability, react-hooks/purity */

import { useCallback, useEffect, useMemo, useState } from "react";

export function useStatusChatInputController(props: any) {
  const { AbortController, CHAT_RESPONSE_STALL_TIMEOUT_MS, Uint8Array, appendMessage, attachmentSummary, brainDragMovedRef, brainDragRef, brainGraph, brainPan, busy, chatAttachments, chatAutoScrollRef, chatDirectories, chatMessageStorageKey, chatSetupIssue, chooseDirectoryForMachine, collectorKey, createDefaultAgentWallet, discoveredMachines, honeyLedgerEnabled, hydrated, isManualAgentChatMessage, kanbanBoardSlug, kanbanReadyPickupInFlightRef, kanbanStorageBody, linkedDirectoryLabel, localKanbanMachineTarget, machineGroups, messageContentParts, messages, orchestrateReadyKanbanTask, quickAddMachineTarget, quickAddMachineTargets, readComposerFiles, recordRecentDirectory, recording, refreshHoneyLedger, refreshKanbanOnce, selectedAgent, selectedBrainNodeId, selectedChatDirectoryPath, selectedChatLeafKey, selectedChatRuntimeSessionId, selectedKanbanAgent, selectedKanbanTask, setAttachmentError, setAttachmentMenuOpen, setBrainGraph, setBrainGraphStatus, setBrainPan, setBusy, setBusyAgentId, setChatAttachments, setChatDirectories, setControlRoomStatus, setHasStreamingChunk, setKanbanBoard, setKanbanError, setKanbanSteerAttachmentError, setKanbanSteerAttachmentMenuOpen, setKanbanSteerAttachments, setKanbanSteerDirectories, setKanbanSteerDraft, setKanbanStorage, setMessagesByAgent, setQuickAddAttachmentError, setQuickAddAttachmentMenuOpen, setQuickAddAttachments, setQuickAddDirectories, setQuickAddDrafts, setRecentDirectoriesExpanded, setRecording, setSelectedBrainNodeId, setSelectedChatPreview, setSelectedChatRuntimeSessionId, setStatus, setStatusAgentId, setText, setVaultStatus, setVaultSyncPending, setVaultSyncStatus, setVoiceBands, setVoiceTarget, setVoiceTranscript, sharedVault, speechRecognitionConstructor, syncthingAutoPairRef, tailscaleDevices, text, updateSharedVault, updateTask, upsertTask, voiceAnimationRef, voiceAudioContextRef, voiceRecognitionRef, voiceStreamRef, voiceTarget, voiceTranscriptRef, walletsByAgent } = props;
  const [chatKanbanGeneration, setChatKanbanGeneration] = useState(null);

  function extractGeneratedKanbanTask(rawText: string, fallbackTitle: string) {
    const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    const objectText = fenced ?? rawText.match(/\{[\s\S]*\}/)?.[0] ?? rawText;
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(objectText);
    } catch {
      const looseTitle = objectText.match(/["']title["']\s*:\s*["']([^"'\n\r]+)/i)?.[1]?.trim();
      return {
        title: cleanGeneratedKanbanTitle(looseTitle, fallbackTitle),
        body: rawText.trim(),
        priority: "normal",
      };
    }
    const title = cleanGeneratedKanbanTitle(parsed.title, fallbackTitle);
    const bodyParts = [
      parsed.body,
      Array.isArray(parsed.acceptanceCriteria) && parsed.acceptanceCriteria.length
        ? `Acceptance criteria:\n${parsed.acceptanceCriteria.map((item) => `- ${String(item).trim()}`).filter(Boolean).join("\n")}`
        : "",
      Array.isArray(parsed.context) && parsed.context.length
        ? `Context:\n${parsed.context.map((item) => `- ${String(item).trim()}`).filter(Boolean).join("\n")}`
        : "",
    ].map((value) => String(value ?? "").trim()).filter(Boolean);
    return {
      title,
      body: bodyParts.join("\n\n") || String(parsed.summary ?? rawText).trim(),
      priority: ["low", "normal", "high", "urgent"].includes(parsed.priority) ? parsed.priority : "normal",
    };
  }

  function cleanGeneratedKanbanTitle(value: unknown, fallbackTitle: string) {
    const title = String(value ?? "").trim();
    const placeholder = /^(short imperative task title|specific action for the next agent|task title|untitled task)$/i.test(title);
    return placeholder ? fallbackTitle || "Follow up from chat" : title || fallbackTitle || "Follow up from chat";
  }
  async function checkStatus() {
    if (!selectedAgent) return;
    setStatus(null);
    setStatusAgentId(selectedAgent.id);
    const response = await fetch("/api/agents/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent: selectedAgent }),
    });
    const data = (await response.json().catch(() => ({}))) as GatewayStatus;
    setStatus(data);
  }

  async function checkVaultStatus() {
    setVaultStatus(null);
    const response = await fetch("/api/obsidian/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vaultPath: sharedVault.vaultPath.trim() || undefined }),
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    setVaultStatus(data);
    if (data.ok && typeof data.vaultPath === "string" && data.vaultPath.trim()) {
      updateSharedVault({ vaultPath: data.vaultPath });
    }
  }

  async function checkControlRoomStatus() {
    setControlRoomStatus(null);
    const response = await fetch("/api/control-room/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ controlRoomPath: sharedVault.controlRoomPath }),
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    setControlRoomStatus(data);
  }

  const runVaultTailnetSync = useCallback(async (dryRun: boolean, quiet = false) => {
    setVaultSyncPending(dryRun ? "dry-run" : "sync");
    if (!quiet) setVaultSyncStatus(null);
    const response = await fetch("/api/obsidian/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vaultPath: sharedVault.vaultPath.trim() || undefined,
        remoteHost: sharedVault.tailnetSyncHost,
        remotePath: sharedVault.tailnetSyncPath,
        direction: sharedVault.tailnetSyncDirection,
        dryRun,
      }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as VaultSyncStatus | null;
    setVaultSyncPending("");
    setVaultSyncStatus(data ?? { ok: false, error: "Tailnet vault sync request failed." });
  }, [
    sharedVault.tailnetSyncDirection,
    sharedVault.tailnetSyncHost,
    sharedVault.tailnetSyncPath,
    sharedVault.vaultPath,
  ]);

  const pairSyncthingCollector = useCallback(async (target: {
    remoteCollectorUrl: string;
    remoteName?: string;
    remotePath?: string;
    remoteTailscaleIp?: string;
    remoteAddressHost?: string;
  }) => {
    const localTailscaleIp = tailscaleDevices.find((device) => device.self)?.ip;
    const response = await fetch("/api/syncthing/pair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        localPath: sharedVault.vaultPath.trim() || undefined,
        remotePath: target.remotePath?.trim() || undefined,
        remoteCollectorUrl: target.remoteCollectorUrl,
        remoteName: target.remoteName,
        localTailscaleIp,
        remoteTailscaleIp: target.remoteTailscaleIp,
        remoteAddressHost: target.remoteAddressHost,
        folderId: "hivemindos-vault",
        label: "hivemindos-vault",
      }),
    }).catch(() => null);
    return response?.json().catch(() => null) as Promise<VaultSyncStatus | null>;
  }, [sharedVault.vaultPath, tailscaleDevices]);

  const pairSyncthingVaultSync = useCallback(async () => {
    const remoteHost = sharedVault.tailnetSyncHost.trim();
    const remotePath = sharedVault.tailnetSyncPath.trim();
    if (!remoteHost) {
      setVaultSyncStatus({ ok: false, method: "syncthing", error: "Choose a Tailnet machine first. The remote folder can be left blank for the collector default." });
      return;
    }
    setVaultSyncPending("syncthing");
    setVaultSyncStatus(null);
    const cleanHost = remoteHost.replace(/^.+@/, "").replace(/\.$/, "");
    const hostKey = cleanHost.toLowerCase();
    const remoteDevice = tailscaleDevices.find((device) => (
      device.ip === cleanHost
      || device.name.toLowerCase() === hostKey
      || device.dnsName.toLowerCase().replace(/\.$/, "") === hostKey
      || device.collectorUrl.toLowerCase().includes(hostKey)
    ));
    const data = await pairSyncthingCollector({
      remoteCollectorUrl: /^https?:\/\//.test(cleanHost) ? cleanHost : `http://${cleanHost}:8787`,
      remoteName: cleanHost,
      remotePath,
      remoteTailscaleIp: remoteDevice?.ip || (cleanHost.startsWith("100.") ? cleanHost : undefined),
      remoteAddressHost: /^https?:\/\//.test(cleanHost) ? undefined : cleanHost,
    }).catch(() => null);
    setVaultSyncPending("");
    setVaultSyncStatus(data?.ok
      ? { ...data, method: "syncthing", message: `Syncthing paired ${data.folderId ?? "vault"} for realtime sync.` }
      : { ok: false, method: "syncthing", error: data?.error ?? "Syncthing pairing failed." });
  }, [
    pairSyncthingCollector,
    sharedVault.tailnetSyncHost,
    sharedVault.tailnetSyncPath,
    tailscaleDevices,
  ]);

  useEffect(() => {
    if (
      !hydrated
      || !sharedVault.enabled
      || sharedVault.syncProvider !== "syncthing"
      || !sharedVault.syncthingAutoPairEnabled
      || !sharedVault.vaultPath.trim()
    ) return;
    const candidates = discoveredMachines.filter((machine) => (
      machine.collector === "ready"
      && machine.device.online
      && !machine.device.self
      && Boolean(machine.device.collectorUrl)
      && machine.capabilities?.syncthing === true
    ));
    candidates.forEach((machine) => {
      const key = collectorKey(machine.device.collectorUrl);
      if (!key || syncthingAutoPairRef.current.has(key)) return;
      syncthingAutoPairRef.current.add(key);
      void pairSyncthingCollector({
        remoteCollectorUrl: machine.device.collectorUrl,
        remoteName: machine.device.name,
        remoteTailscaleIp: machine.device.ip,
        remoteAddressHost: machine.device.ip || machine.device.dnsName,
        remotePath: sharedVault.tailnetSyncPath,
      }).then((data) => {
        if (!data?.ok) {
          syncthingAutoPairRef.current.delete(key);
          setVaultSyncStatus({ ok: false, method: "syncthing", error: data?.error ?? `Auto-pair failed for ${machine.device.name}.` });
          return;
        }
        setVaultSyncStatus({
          ...data,
          method: "syncthing",
          message: `Realtime sync auto-paired with ${machine.device.name}.`,
        });
      }).catch((error) => {
        syncthingAutoPairRef.current.delete(key);
        setVaultSyncStatus({
          ok: false,
          method: "syncthing",
          error: error instanceof Error ? error.message : `Auto-pair failed for ${machine.device.name}.`,
        });
      });
    });
  }, [
    discoveredMachines,
    hydrated,
    pairSyncthingCollector,
    sharedVault.enabled,
    sharedVault.syncthingAutoPairEnabled,
    sharedVault.tailnetSyncPath,
    sharedVault.syncProvider,
    sharedVault.vaultPath,
  ]);

  async function inspectBrainNode(node: BrainGraphNode) {
    if (brainDragMovedRef.current) {
      brainDragMovedRef.current = false;
      return;
    }
    if (selectedBrainNodeId === node.id) {
      if (node.id.startsWith("unresolved:")) {
        setBrainGraphStatus("That cell is an unresolved link, so there is no note file to open yet.");
        return;
      }
      const response = await fetch("/api/obsidian/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vaultPath: sharedVault.vaultPath, notePath: node.id, newtab: true }),
      }).catch(() => null);
      const data = await response?.json().catch(() => null) as { ok?: boolean; error?: string } | null;
      setBrainGraphStatus(data?.ok ? `Opened ${node.label} in Obsidian.` : data?.error ?? "Could not open note in Obsidian.");
      return;
    }
    setSelectedBrainNodeId(node.id);
    if (node.id.startsWith("unresolved:")) return;
    const response = await fetch("/api/obsidian/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vaultPath: sharedVault.vaultPath,
        notePath: node.id,
        agentName: selectedAgent?.name ?? "Dashboard",
        agentId: selectedAgent?.agentId || selectedAgent?.id,
        runtime: selectedAgent?.runtime,
        machineName: selectedAgent?.machineName || "local",
        action: "inspect",
      }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null) as { ok?: boolean; event?: BrainAccessEvent; error?: string } | null;
    if (!data?.ok || !data.event) {
      setBrainGraphStatus(data?.error ?? "Could not record access.");
      return;
    }
    setBrainGraph((current) => {
      if (!current) return current;
      return {
        ...current,
        recentAccesses: [data.event!, ...current.recentAccesses].slice(0, 24),
        nodes: current.nodes.map((item) => item.id === node.id
          ? {
            ...item,
            accessCount: item.accessCount + 1,
            lastAccessedAt: data.event!.accessedAt,
            recentAccesses: [data.event!, ...item.recentAccesses].slice(0, 6),
          }
          : item),
      };
    });
    setBrainGraphStatus(`Recorded ${selectedAgent?.name ?? "Dashboard"} inspecting ${node.label}.`);
  }

  function startBrainPan(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    const ElementCtor = globalThis.Element;
    const target = ElementCtor && event.target instanceof ElementCtor
      ? event.target.closest("[data-brain-node-id]") as HTMLElement | null
      : null;
    brainDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: brainPan.x,
      panY: brainPan.y,
      moved: false,
      nodeId: target?.dataset.brainNodeId ?? "",
    };
    brainDragMovedRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveBrainPan(event: PointerEvent<SVGSVGElement>) {
    const drag = brainDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true;
    brainDragMovedRef.current = true;
    setBrainPan({ x: drag.panX - dx, y: drag.panY - dy });
  }

  function endBrainPan(event: PointerEvent<SVGSVGElement>) {
    const drag = brainDragRef.current;
    if (drag?.pointerId === event.pointerId) {
      brainDragMovedRef.current = drag.moved;
      brainDragRef.current = null;
      if (!drag.moved && drag.nodeId) {
        const node = brainGraph?.nodes.find((item) => item.id === drag.nodeId);
        if (node) void inspectBrainNode(node);
      }
      if (drag.moved) window.setTimeout(() => {
        brainDragMovedRef.current = false;
      }, 0);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  async function addChatFiles(files: FileList | File[], kind: "image" | "file") {
    try {
      const next = await readComposerFiles(files, kind);
      setChatAttachments((current) => [...current, ...next]);
      setAttachmentError("");
      setAttachmentMenuOpen(false);
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : "Could not attach that file.");
    }
  }

  function handleChatFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files?.length) void addChatFiles(event.target.files, "file");
    event.target.value = "";
  }

  function handleChatImageChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files?.length) void addChatFiles(event.target.files, "image");
    event.target.value = "";
  }

  function removeChatAttachment(id: string) {
    setChatAttachments((current) => current.filter((attachment) => attachment.id !== id));
  }

  async function attachChatDirectory() {
    try {
      const machine = selectedAgent
        ? machineGroups.find((group) => group.agents.some((agent) => agent.id === selectedAgent.id))
        : null;
      const target = machine ? { key: machine.key, name: machine.self ? "This Mac" : machine.name, collectorUrl: machine.collectorUrl } : localKanbanMachineTarget;
      await chooseDirectoryForMachine(target, (directory) => {
        setChatDirectories((current) => [...current, directory]);
        setAttachmentError("");
        setAttachmentMenuOpen(false);
        void recordRecentDirectory(directory, {
          machineName: target?.name ?? selectedAgent?.machineName,
          machineKey: target?.key ?? (selectedAgent ? collectorKey(selectedAgent.telemetryUrl) || selectedAgent.id : undefined),
          source: "chat",
        });
      });
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : "Could not link that directory.");
    }
  }

  function attachChatRecentDirectory(directory: LinkedDirectory) {
    setChatDirectories((current) => [...current, directory]);
    setAttachmentError("");
    setAttachmentMenuOpen(false);
    setRecentDirectoriesExpanded(false);
    void recordRecentDirectory(directory, {
      machineName: selectedAgent?.machineName ?? directory.machineName,
      machineKey: selectedAgent ? collectorKey(selectedAgent.telemetryUrl) || selectedAgent.id : directory.machineKey,
      source: "recent",
    });
  }

  function removeChatDirectory(id: string) {
    setChatDirectories((current) => current.filter((directory) => directory.id !== id));
  }

  async function addQuickAddFiles(status: KanbanStatus, files: FileList | File[], kind: "image" | "file") {
    try {
      const next = await readComposerFiles(files, kind);
      setQuickAddAttachments((current) => ({
        ...current,
        [status]: [...(current[status] ?? []), ...next],
      }));
      setQuickAddAttachmentError("");
      setQuickAddAttachmentMenuOpen(false);
    } catch (error) {
      setQuickAddAttachmentError(error instanceof Error ? error.message : "Could not attach that file.");
    }
  }

  function handleQuickAddFileChange(status: KanbanStatus, event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files?.length) void addQuickAddFiles(status, event.target.files, "file");
    event.target.value = "";
  }

  function handleQuickAddImageChange(status: KanbanStatus, event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files?.length) void addQuickAddFiles(status, event.target.files, "image");
    event.target.value = "";
  }

  function removeQuickAddAttachment(status: KanbanStatus, id: string) {
    setQuickAddAttachments((current) => ({ ...current, [status]: (current[status] ?? []).filter((attachment) => attachment.id !== id) }));
  }

  async function attachQuickAddDirectory(status: KanbanStatus) {
    try {
      const targetMachine = quickAddMachineTarget(status);
      await chooseDirectoryForMachine(targetMachine, (directory) => {
        setQuickAddDirectories((current) => ({
          ...current,
          [status]: [...(current[status] ?? []), directory],
        }));
        setQuickAddAttachmentError("");
        setQuickAddAttachmentMenuOpen(false);
        void recordRecentDirectory(directory, {
          machineName: targetMachine?.name,
          machineKey: targetMachine?.key,
          source: "kanban",
        });
      });
    } catch (error) {
      setQuickAddAttachmentError(error instanceof Error ? error.message : "Could not link that directory.");
    }
  }

  function attachQuickAddRecentDirectory(status: KanbanStatus, directory: LinkedDirectory) {
    setQuickAddDirectories((current) => ({
      ...current,
      [status]: [...(current[status] ?? []), directory],
    }));
    setQuickAddAttachmentError("");
    setQuickAddAttachmentMenuOpen(false);
    setRecentDirectoriesExpanded(false);
    const targetMachine = quickAddMachineTargets[status] ?? null;
    void recordRecentDirectory(directory, {
      machineName: targetMachine?.name ?? directory.machineName,
      machineKey: targetMachine?.key ?? directory.machineKey,
      source: "recent",
    });
  }

  function removeQuickAddDirectory(status: KanbanStatus, id: string) {
    setQuickAddDirectories((current) => ({ ...current, [status]: (current[status] ?? []).filter((directory) => directory.id !== id) }));
  }

  async function addKanbanSteerFiles(files: FileList | File[], kind: "image" | "file") {
    try {
      const next = await readComposerFiles(files, kind);
      setKanbanSteerAttachments((current) => [...current, ...next]);
      setKanbanSteerAttachmentError("");
      setKanbanSteerAttachmentMenuOpen(false);
    } catch (error) {
      setKanbanSteerAttachmentError(error instanceof Error ? error.message : "Could not attach that file.");
    }
  }

  function handleKanbanSteerFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files?.length) void addKanbanSteerFiles(event.target.files, "file");
    event.target.value = "";
  }

  function handleKanbanSteerImageChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files?.length) void addKanbanSteerFiles(event.target.files, "image");
    event.target.value = "";
  }

  function removeKanbanSteerAttachment(id: string) {
    setKanbanSteerAttachments((current) => current.filter((attachment) => attachment.id !== id));
  }

  async function attachKanbanSteerDirectory() {
    try {
      const agentMachine = selectedKanbanAgent
        ? machineGroups.find((group) => group.agents.some((agent) => agent.id === selectedKanbanAgent.id))
        : null;
      const target = selectedKanbanTask?.targetMachine
        ?? (agentMachine ? { key: agentMachine.key, name: agentMachine.self ? "This Mac" : agentMachine.name, collectorUrl: agentMachine.collectorUrl } : localKanbanMachineTarget);
      await chooseDirectoryForMachine(target, (directory) => {
        setKanbanSteerDirectories((current) => [...current, directory]);
        setKanbanSteerAttachmentError("");
        setKanbanSteerAttachmentMenuOpen(false);
        void recordRecentDirectory(directory, {
          machineName: target?.name ?? selectedKanbanAgent?.machineName,
          machineKey: target?.key ?? (selectedKanbanAgent ? collectorKey(selectedKanbanAgent.telemetryUrl) || selectedKanbanAgent.id : undefined),
          source: "kanban",
        });
      });
    } catch (error) {
      setKanbanSteerAttachmentError(error instanceof Error ? error.message : "Could not link that directory.");
    }
  }

  function attachKanbanSteerRecentDirectory(directory: LinkedDirectory) {
    setKanbanSteerDirectories((current) => [...current, directory]);
    setKanbanSteerAttachmentError("");
    setKanbanSteerAttachmentMenuOpen(false);
    setRecentDirectoriesExpanded(false);
    void recordRecentDirectory(directory, {
      machineName: selectedKanbanTask?.targetMachine?.name ?? selectedKanbanAgent?.machineName ?? directory.machineName,
      machineKey: selectedKanbanTask?.targetMachine?.key ?? (selectedKanbanAgent ? collectorKey(selectedKanbanAgent.telemetryUrl) || selectedKanbanAgent.id : directory.machineKey),
      source: "recent",
    });
  }

  function removeKanbanSteerDirectory(id: string) {
    setKanbanSteerDirectories((current) => current.filter((directory) => directory.id !== id));
  }

  function updateVoiceTranscript(value: string) {
    voiceTranscriptRef.current = value;
    setVoiceTranscript(value);
  }

  function appendVoiceTranscriptToInput() {
    const transcript = voiceTranscriptRef.current.trim();
    if (!transcript) return;
    if (voiceTarget === "chat") {
      setText((current) => [current.trim(), transcript].filter(Boolean).join(current.trim() ? " " : ""));
    } else if (voiceTarget === "kanban-steer") {
      setKanbanSteerDraft((current) => [current.trim(), transcript].filter(Boolean).join(current.trim() ? " " : ""));
    } else {
      setQuickAddDrafts((current) => {
        const existing = current[voiceTarget]?.trim() ?? "";
        return { ...current, [voiceTarget]: [existing, transcript].filter(Boolean).join(existing ? " " : "") };
      });
    }
    updateVoiceTranscript("");
  }

  function cleanupVoiceCapture(commitTranscript: boolean) {
    if (voiceAnimationRef.current !== null) {
      window.cancelAnimationFrame(voiceAnimationRef.current);
      voiceAnimationRef.current = null;
    }
    voiceStreamRef.current?.getTracks().forEach((track) => track.stop());
    voiceStreamRef.current = null;
    void voiceAudioContextRef.current?.close().catch(() => undefined);
    voiceAudioContextRef.current = null;
    voiceRecognitionRef.current = null;
    setVoiceBands(Array(18).fill(0));
    setRecording(false);
    if (commitTranscript) appendVoiceTranscriptToInput();
  }

  function startVoiceWaveform(stream: MediaStream) {
    const audioWindow = window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
    const AudioContextClass = audioWindow.AudioContext || audioWindow.webkitAudioContext;
    if (!AudioContextClass) return;
    const audioContext = new AudioContextClass();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    voiceAudioContextRef.current = audioContext;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const bands = 18;
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const binSize = Math.max(1, Math.floor(data.length / bands));
      const next = Array.from({ length: bands }, (_, index) => {
        const start = index * binSize;
        const slice = data.slice(start, start + binSize);
        const average = slice.reduce((total, value) => total + value, 0) / Math.max(1, slice.length);
        return Math.min(1, average / 180);
      });
      setVoiceBands(next);
      voiceAnimationRef.current = window.requestAnimationFrame(tick);
    };
    tick();
  }

  async function startAudioRecording(target: "chat" | "kanban-steer" | KanbanStatus = "chat") {
    if (recording || busy) return;
    const setTargetAttachmentError = (message: string) => {
      if (target === "chat") setAttachmentError(message);
      else if (target === "kanban-steer") setKanbanSteerAttachmentError(message);
      else setQuickAddAttachmentError(message);
    };
    const Recognition = speechRecognitionConstructor();
    if (!Recognition) {
      setTargetAttachmentError("Speech transcription is not available in this browser.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setTargetAttachmentError("Microphone access is not available in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recognition = new Recognition();
      let committedTranscript = "";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || "en-US";
      recognition.onresult = (event) => {
        let interimTranscript = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcript = Array.from({ length: result.length }, (_, partIndex) => result[partIndex]?.transcript ?? "").join("");
          if (result.isFinal) committedTranscript = `${committedTranscript} ${transcript}`.trim();
          else interimTranscript = `${interimTranscript} ${transcript}`.trim();
        }
        updateVoiceTranscript(`${committedTranscript} ${interimTranscript}`.trim());
      };
      recognition.onerror = (event) => {
        setTargetAttachmentError(event.error ? `Speech transcription failed: ${event.error}` : "Speech transcription failed.");
      };
      recognition.onend = () => cleanupVoiceCapture(true);
      voiceStreamRef.current = stream;
      voiceRecognitionRef.current = recognition;
      setVoiceTarget(target);
      updateVoiceTranscript("");
      startVoiceWaveform(stream);
      recognition.start();
      setRecording(true);
      setTargetAttachmentError("");
    } catch (error) {
      cleanupVoiceCapture(false);
      setTargetAttachmentError(error instanceof Error ? error.message : "Could not start audio recording.");
    }
  }

  function stopAudioRecording() {
    const recognition = voiceRecognitionRef.current;
    if (!recognition) {
      cleanupVoiceCapture(true);
      return;
    }
    recognition.stop();
  }

  /* eslint-disable react-hooks/purity */
  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (recording) {
      stopAudioRecording();
      return;
    }
    const prompt = text.trim();
    const outgoingAttachments = chatAttachments;
    const outgoingDirectories = chatDirectories;
    if (!selectedAgent || busy || (!prompt && outgoingAttachments.length === 0 && outgoingDirectories.length === 0)) return;
    const outgoingDirectorySummary = outgoingDirectories.length
      ? `Linked directories:\n${outgoingDirectories.map((directory) => `- ${linkedDirectoryLabel(directory)}`).join("\n")}`
      : "";
    const outgoingLabel = prompt || attachmentSummary(outgoingAttachments) || (outgoingDirectories.length ? `Linked ${outgoingDirectories.length} director${outgoingDirectories.length === 1 ? "y" : "ies"}` : "Media message");
    const setupIssue = chatSetupIssue(selectedAgent);
    if (setupIssue) {
      appendMessage(selectedAgent.id, { role: "user", content: outgoingLabel, attachments: outgoingAttachments, surface: "chat" });
      appendMessage(selectedAgent.id, { role: "assistant", content: `Error: ${setupIssue}`, surface: "chat" });
      return;
    }

    setBusy(true);
    setBusyAgentId(selectedAgent.id);
    setHasStreamingChunk(false);
    chatAutoScrollRef.current = true;
    setText("");
    setChatAttachments([]);
    setChatDirectories([]);
    setAttachmentError("");
    setAttachmentMenuOpen(false);
    const taskId = `${selectedAgent.id}-${Date.now()}`;
    const workingDirectory = selectedChatDirectoryPath || selectedAgent.localDataDir || "";
    const selectedStorageKey = chatMessageStorageKey(selectedAgent.id, selectedChatLeafKey);
    const contextMessages = messages
      .filter((message) => (
        message.role !== "system"
        && isManualAgentChatMessage(message)
        && (message.content.trim() || message.attachments?.length)
      ))
      .slice(-5);
    const outgoingContent = messageContentParts([prompt, outgoingDirectorySummary].filter(Boolean).join("\n\n"), outgoingAttachments);
    upsertTask({
      id: taskId,
      agentId: selectedAgent.id,
      title: outgoingLabel,
      lastMessage: "Starting...",
      status: "active",
      startedAt: Date.now(),
      updatedAt: Date.now(),
      workingDirectory,
    });
    const outgoingUserMessage: ChatMessage = { role: "user", content: outgoingLabel, attachments: outgoingAttachments, surface: "chat" };
    const pendingAssistantMessage: ChatMessage = { role: "assistant", content: "", surface: "chat" };
    appendMessage(selectedAgent.id, outgoingUserMessage, selectedStorageKey);
    appendMessage(selectedAgent.id, pendingAssistantMessage, selectedStorageKey);
    setSelectedChatPreview((current) => (
      current && current.agentId === selectedAgent.id && current.leafKey === selectedChatLeafKey
        ? { ...current, messages: [...current.messages, outgoingUserMessage, pendingAssistantMessage] }
        : current
    ));

    const replacePendingAssistant = (message: ChatMessage) => {
      setMessagesByAgent((current) => {
        const existing = current[selectedStorageKey] ?? [];
        const next = [...existing];
        if (next.length) next[next.length - 1] = message;
        else next.push(message);
        return { ...current, [selectedStorageKey]: next };
      });
      setSelectedChatPreview((current) => {
        if (!current || current.agentId !== selectedAgent.id || current.leafKey !== selectedChatLeafKey) return current;
        const next = [...current.messages];
        if (next.length) next[next.length - 1] = message;
        else next.push(message);
        return { ...current, messages: next };
      });
    };
    const abortController = new AbortController();
    const stallTimer = window.setTimeout(() => abortController.abort("chat-response-stall"), CHAT_RESPONSE_STALL_TIMEOUT_MS);
    let sawAssistantContent = false;
    let sawDone = false;

    try {
      const response = await fetch("/api/chat/agent-runtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          agent: selectedAgent,
          sharedVault,
          workingDirectory,
          runtimeSessionId: selectedChatRuntimeSessionId || undefined,
          hermesSessionId: selectedChatRuntimeSessionId || undefined,
          wallet: walletsByAgent[selectedAgent.id] ?? createDefaultAgentWallet(selectedAgent.id),
          honeyLedgerEnabled,
          messages: [
            ...contextMessages.map((message) => ({
              role: message.role,
              content: messageContentParts(message.content, message.attachments ?? []),
            })),
            { role: "user", content: outgoingContent },
          ],
        }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed with ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const eventText of events) {
          const line = eventText.split("\n").find((entry) => entry.startsWith("data: "));
          if (!line) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") {
            sawDone = true;
            continue;
          }
          const parsed = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>;
            error?: string;
            honey?: unknown;
            session?: { id?: string; startedAt?: number; updatedAt?: number; messageCount?: number };
          };
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.honey) {
            await refreshHoneyLedger();
            continue;
          }
          if (parsed.session?.id) {
            setSelectedChatRuntimeSessionId(parsed.session.id);
            continue;
          }
          const chunk = parsed.choices?.[0]?.delta?.content;
          if (chunk) {
            setHasStreamingChunk(true);
            sawAssistantContent = true;
            let nextTaskMessage = "";
            setMessagesByAgent((current) => {
              const existing = current[selectedStorageKey] ?? [];
              const next = [...existing];
              const last = next[next.length - 1];
              if (!last) {
                nextTaskMessage = chunk;
                next.push({ role: "assistant", content: chunk, surface: "chat" });
              } else {
                nextTaskMessage = last.content + chunk;
                next[next.length - 1] = { ...last, content: nextTaskMessage };
              }
              return { ...current, [selectedStorageKey]: next };
            });
            setSelectedChatPreview((current) => {
              if (!current || current.agentId !== selectedAgent.id || current.leafKey !== selectedChatLeafKey) return current;
              const next = [...current.messages];
              const last = next[next.length - 1];
              if (!last) next.push({ role: "assistant", content: chunk, surface: "chat" });
              else next[next.length - 1] = { ...last, content: (last.content ?? "") + chunk };
              return { ...current, messages: next };
            });
            updateTask(taskId, { lastMessage: nextTaskMessage || chunk });
          }
        }
        if (sawDone) {
          await reader.cancel().catch(() => undefined);
          break;
        }
      }
      if (!sawAssistantContent) {
        replacePendingAssistant({ role: "assistant", content: "Hermes finished without returning any text for this message.", surface: "chat" });
        updateTask(taskId, { status: "failed", lastMessage: "Hermes finished without returning any text.", completedAt: Date.now() });
        return;
      }
      updateTask(taskId, { status: "completed", completedAt: Date.now() });
    } catch (error) {
      const aborted = abortController.signal.aborted;
      const message = aborted
        ? `Hermes did not return a chat response within ${Math.round(CHAT_RESPONSE_STALL_TIMEOUT_MS / 1000)} seconds. The task may still be running in Hermes; check the agent activity before retrying.`
        : error instanceof Error ? error.message : "Unknown runtime error";
      const errorMessage: ChatMessage = { role: "assistant", content: `Error: ${message}`, surface: "chat" };
      replacePendingAssistant(errorMessage);
      updateTask(taskId, { status: "failed", lastMessage: message, completedAt: Date.now() });
    } finally {
      window.clearTimeout(stallTimer);
      setBusy(false);
      setBusyAgentId("");
      setHasStreamingChunk(false);
    }
  }

  async function generateKanbanTaskFromChat(targetStatus: "ideas" | "ready", source: { key: string; content: string }) {
    if (!selectedAgent || chatKanbanGeneration?.phase === "generating" || chatKanbanGeneration?.phase === "creating") return;
    const setupIssue = chatSetupIssue(selectedAgent);
    if (setupIssue) {
      setChatKanbanGeneration({ key: source.key, status: targetStatus, phase: "error", message: setupIssue });
      return;
    }
    const workingDirectory = selectedChatDirectoryPath || selectedAgent.localDataDir || "";
    const contextMessages = messages
      .filter((message) => (
        message.role !== "system"
        && isManualAgentChatMessage(message)
        && (message.content.trim() || message.attachments?.length)
      ))
      .slice(-12);
    const transcript = contextMessages.map((message) => `${message.role.toUpperCase()}:\n${message.content.trim()}`).join("\n\n");
    const laneLabel = targetStatus === "ready" ? "Ready" : "Ideas";
    const prompt = [
      "Generate exactly one Kanban task from this chat context.",
      `Target lane: ${laneLabel}.`,
      "Return only valid JSON with these keys: title, body, priority, acceptanceCriteria.",
      "Every value must be derived from the conversation. Do not copy field descriptions, placeholder text, or describe the schema.",
      "title must be a short imperative phrase for the next agent.",
      "body must be a concrete brief with context and expected outcome.",
      "priority must be one of low, normal, high, urgent.",
      "acceptanceCriteria must be an array of observable outcomes.",
      "Do not include markdown fences, commentary, or extra keys.",
      "",
      "Conversation context:",
      transcript || "(No prior transcript available.)",
      "",
      "Message the user selected as the source:",
      source.content.trim(),
    ].join("\n");
    const abortController = new AbortController();
    const stallTimer = window.setTimeout(() => abortController.abort("chat-kanban-generation-stall"), CHAT_RESPONSE_STALL_TIMEOUT_MS);
    let generatedText = "";
    setChatKanbanGeneration({ key: source.key, status: targetStatus, phase: "generating", message: "Asking agent to shape the task..." });
    try {
      const response = await fetch("/api/chat/agent-runtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          agent: selectedAgent,
          sharedVault,
          workingDirectory,
          runtimeSessionId: selectedChatRuntimeSessionId || undefined,
          hermesSessionId: selectedChatRuntimeSessionId || undefined,
          wallet: walletsByAgent[selectedAgent.id] ?? createDefaultAgentWallet(selectedAgent.id),
          honeyLedgerEnabled,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed with ${response.status}`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let sawDone = false;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const eventText of events) {
          const line = eventText.split("\n").find((entry) => entry.startsWith("data: "));
          if (!line) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") {
            sawDone = true;
            continue;
          }
          const parsed = JSON.parse(payload);
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.honey) {
            await refreshHoneyLedger();
            continue;
          }
          if (parsed.session?.id) {
            setSelectedChatRuntimeSessionId(parsed.session.id);
            continue;
          }
          const chunk = parsed.choices?.[0]?.delta?.content;
          if (chunk) {
            generatedText += chunk;
            setChatKanbanGeneration({ key: source.key, status: targetStatus, phase: "generating", message: "Drafting task brief...", preview: generatedText });
          }
        }
        if (sawDone) {
          await reader.cancel().catch(() => undefined);
          break;
        }
      }
      if (!generatedText.trim()) throw new Error("The agent did not return a task draft.");
      const taskDraft = extractGeneratedKanbanTask(generatedText, source.content.trim().split(/\s+/).slice(0, 8).join(" "));
      setChatKanbanGeneration({ key: source.key, status: targetStatus, phase: "creating", message: `Sending to ${laneLabel}...`, taskTitle: taskDraft.title });
      const createResponse = await fetch(`/api/kanban?board=${encodeURIComponent(kanbanBoardSlug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...kanbanStorageBody(),
          title: taskDraft.title,
          body: taskDraft.body,
          assignee: "",
          tenant: "",
          priority: taskDraft.priority,
          status: targetStatus,
          attachments: [],
          linkedDirectories: [],
          targetMachine: null,
        }),
      });
      const data = await createResponse.json().catch(() => null);
      if (!createResponse.ok || !data?.ok) throw new Error(data?.error ?? "Could not create task.");
      if (data.board) {
        setKanbanBoard?.(data.board);
        setKanbanStorage?.(data.storage ?? null);
      }
      if (targetStatus === "ready" && data.task && orchestrateReadyKanbanTask) {
        kanbanReadyPickupInFlightRef?.current?.add(data.task.id);
        await orchestrateReadyKanbanTask(data.task).finally(() => {
          kanbanReadyPickupInFlightRef?.current?.delete(data.task.id);
        });
      } else {
        await refreshKanbanOnce?.();
      }
      setChatKanbanGeneration({ key: source.key, status: targetStatus, phase: "done", message: `Created in ${laneLabel}.`, taskTitle: taskDraft.title });
    } catch (error) {
      const aborted = abortController.signal.aborted;
      const message = aborted
        ? `The agent did not return a task draft within ${Math.round(CHAT_RESPONSE_STALL_TIMEOUT_MS / 1000)} seconds.`
        : error instanceof Error ? error.message : "Could not generate the Kanban task.";
      setKanbanError?.(message);
      setChatKanbanGeneration({ key: source.key, status: targetStatus, phase: "error", message });
    } finally {
      window.clearTimeout(stallTimer);
    }
  }
  /* eslint-enable react-hooks/purity */

  return { checkStatus, checkVaultStatus, checkControlRoomStatus, runVaultTailnetSync, pairSyncthingCollector, pairSyncthingVaultSync, inspectBrainNode, startBrainPan, moveBrainPan, endBrainPan, addChatFiles, handleChatFileChange, handleChatImageChange, removeChatAttachment, attachChatDirectory, attachChatRecentDirectory, removeChatDirectory, addQuickAddFiles, handleQuickAddFileChange, handleQuickAddImageChange, removeQuickAddAttachment, attachQuickAddDirectory, attachQuickAddRecentDirectory, removeQuickAddDirectory, addKanbanSteerFiles, handleKanbanSteerFileChange, handleKanbanSteerImageChange, removeKanbanSteerAttachment, attachKanbanSteerDirectory, attachKanbanSteerRecentDirectory, removeKanbanSteerDirectory, updateVoiceTranscript, appendVoiceTranscriptToInput, cleanupVoiceCapture, startVoiceWaveform, startAudioRecording, stopAudioRecording, sendMessage, generateKanbanTaskFromChat, chatKanbanGeneration };
}
