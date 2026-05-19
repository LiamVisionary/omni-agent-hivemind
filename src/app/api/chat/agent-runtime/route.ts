import { NextRequest } from "next/server";
import type { AgentProfile, SharedVaultConfig } from "@/lib/types/agent-runtime";
import { getRuntimeUrl } from "@/lib/types/agent-runtime";
import { sendMessageViaGateway } from "@/lib/services/openclaw/gateway-client";
import { getGatewayAuthToken } from "@/lib/services/openclaw/gateway-health";
import type { AgentWalletConfig } from "@/lib/types/agent-wallet";
import { summarizeX402Policy } from "@/lib/services/wallet/x402-agent-fetch";

export const runtime = "nodejs";
export const maxDuration = 120;

type IncomingMessage = {
  role: string;
  content: string | Array<{
    type: string;
    text?: string;
    image_url?: { url?: string };
    file?: { filename?: string; file_data?: string };
  }>;
};

function activeSharedVault(profile: AgentProfile, sharedVault?: SharedVaultConfig): SharedVaultConfig | null {
  if (!sharedVault?.enabled || profile.useSharedVault === false) return null;
  if (!sharedVault.vaultPath.trim()) return null;
  return sharedVault;
}

function buildVaultContext(sharedVault: SharedVaultConfig | null): string {
  if (!sharedVault) return "";
  const lines = [
    "Shared Obsidian vault context:",
    `- Vault path: ${sharedVault.vaultPath}`,
    `- Agent inbox folder: ${sharedVault.inboxFolder || "(not set)"}`,
    `- Shared note: ${sharedVault.sharedNotePath || "(not set)"}`,
    `- Shared Kanban folder: ${sharedVault.kanbanFolder || "Projects/Omni-Agent Hivemind/Kanban"}`,
    `- Agent notifications folder: ${sharedVault.notificationsFolder || "agent-notifications"}`,
    "- Kanban workflow: Ideas are inert; Ready for Queen is the pickup lane; Working is claimed work; Needs Human is only for decisions/access/approval; Done is completed work.",
    "- Queen Bee behavior: if you are the Queen Bee, watch Ready for Queen, choose yourself or a worker class, move claimed cards to Working, comment with the routing reason, and move straight to Done when no human intervention is needed.",
    "- Kanban API: use the dashboard's /api/kanban endpoint for task creation, status moves, comments, and board reads when available. Use /api/orchestrator for the MCP-ready tool/agent/task surface when the dashboard provides agent role metadata.",
    "- Kanban storage: boards are stored as kanban.json files under the shared Kanban folder. Collaboration can use any folder sync provider, including Obsidian Sync, iCloud Drive, Dropbox, Syncthing, Git, or the built-in Syncthing-over-Tailscale pairing.",
    "- Notifications: when you need the user's attention outside chat, write a markdown notification under the notifications folder using priority low, normal, high, or urgent. High-priority messaging escalation is only a preference flag; a configured messaging agent should handle Telegram, iMessage, Discord, or similar delivery when configured.",
    "- Brain access tracking: when you inspect a vault note through the dashboard, call /api/obsidian/access with vaultPath, notePath, agentName, agentId, runtime, machineName, and action so the shared brain records who accessed what and when.",
    `- Hermes Agent Control Room path: ${sharedVault.controlRoomPath || "(not set)"}`,
    `- Instructions: ${sharedVault.instructions || "Read AGENTS.md before durable vault edits."}`,
  ];
  return lines.join("\n");
}

function buildWalletToolContext(wallet?: AgentWalletConfig): string {
  if (!wallet) return "";
  const lines = [
    "Agent wallet/payment context:",
    summarizeX402Policy(wallet),
    "- Tool: x402_fetch",
    "- Dashboard endpoint: POST /api/wallet/x402 with { agentId, url, method, headers, body, policy, confirmation }.",
    "- Approval gate: if autopay is off or the payment is over the approval threshold, do not proceed until the user explicitly supplies PAY_X402.",
    "- Hard rule: never ask for or reveal private keys; the dashboard signs from its encrypted local vault.",
  ];
  return lines.join("\n");
}

function extractUserText(messages: IncomingMessage[]): string {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
  if (!lastUserMessage) return "";
  if (typeof lastUserMessage.content === "string") return lastUserMessage.content;
  return lastUserMessage.content
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join(" ");
}

function messageHasContent(message: IncomingMessage) {
  if (typeof message.content === "string") return Boolean(message.content.trim());
  return message.content.some((part) => {
    if (part.type === "text") return Boolean(part.text?.trim());
    if (part.type === "image_url") return Boolean(part.image_url?.url);
    if (part.type === "file") return Boolean(part.file?.file_data);
    return false;
  });
}

function latestUserMessage(messages: IncomingMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user" && messageHasContent(message));
}

function attachmentPromptSummary(message?: IncomingMessage) {
  if (!message || typeof message.content === "string") return "";
  const images = message.content.filter((part) => part.type === "image_url" && part.image_url?.url).length;
  const files = message.content.filter((part) => part.type === "file" && part.file?.file_data).length;
  const pieces = [
    images ? `${images} image${images === 1 ? "" : "s"}` : "",
    files ? `${files} file${files === 1 ? "" : "s"}` : "",
  ].filter(Boolean);
  return pieces.length ? `Please respond to the attached ${pieces.join(" and ")}.` : "";
}

function ssePayload(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

function extractChunk(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const value = payload as {
    delta?: string;
    text?: string;
    content?: string;
    message?: { content?: string };
    choices?: Array<{ delta?: { content?: string }; text?: string; message?: { content?: string } }>;
  };
  return (
    value.choices?.[0]?.delta?.content ??
    value.choices?.[0]?.text ??
    value.choices?.[0]?.message?.content ??
    value.delta ??
    value.text ??
    value.content ??
    value.message?.content ??
    ""
  );
}

function validateHttpRuntimeProfile(profile: AgentProfile): string | null {
  const gatewayUrl = profile.gatewayUrl?.trim();
  if (!gatewayUrl) {
    return profile.telemetryUrl
      ? "This discovered agent is connected through the read-only telemetry collector. Add a Hermes/Aeon chat runtime URL before sending messages."
      : "Missing runtime chat URL.";
  }

  try {
    const parsed = new URL(gatewayUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "Runtime chat URL must start with http:// or https://.";
    }
  } catch {
    return "Runtime chat URL is invalid.";
  }

  return null;
}

function collectorChatProfile(profile: AgentProfile): AgentProfile | null {
  if (profile.runtime !== "hermes") return null;
  if (!profile.telemetryUrl?.trim()) return null;
  return {
    ...profile,
    gatewayUrl: profile.telemetryUrl,
    chatPath: "/chat",
  };
}

async function streamHttpRuntime(
  profile: AgentProfile,
  messages: IncomingMessage[],
  userText: string,
  sharedVault: SharedVaultConfig | null,
  wallet?: AgentWalletConfig,
) {
  const url = getRuntimeUrl(profile, profile.chatPath || "/chat");
  const vaultContext = buildVaultContext(sharedVault);
  const walletContext = buildWalletToolContext(wallet);
  const context = [vaultContext, walletContext].filter(Boolean).join("\n\n");
  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(profile.token ? { Authorization: `Bearer ${profile.token}` } : {}),
      },
      body: JSON.stringify({
        agentId: profile.agentId || profile.id,
        sessionKey: profile.sessionKey,
        message: userText,
        messages,
        stream: true,
        sharedVault,
        obsidianVault: sharedVault,
        controlRoomPath: sharedVault?.controlRoomPath,
        wallet,
        walletTools: wallet ? { x402Fetch: "/api/wallet/x402" } : undefined,
        context: context || undefined,
      }),
      signal: AbortSignal.timeout(110_000),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Runtime did not respond";
    return Response.json(
      {
        error: `${profile.name || profile.runtime} is not reachable at ${url}. Check that the ${profile.runtime} runtime is running and that the chat URL is correct. (${reason})`,
      },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    const errorText = await upstream.text().catch(() => "");
    const message = upstream.status === 404 && profile.runtime === "hermes" && profile.telemetryUrl
      ? "This machine's collector is connected but does not have the Hermes chat bridge yet. Run Update/Setup on that machine, then try again."
      : errorText || `${profile.runtime} returned ${upstream.status}`;
    return new Response(
      ssePayload({ error: message }) + "data: [DONE]\n\n",
      { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } },
    );
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream")) {
    const json = await upstream.json().catch(async () => ({ text: await upstream.text().catch(() => "") }));
    const chunk = extractChunk(json);
    return new Response(
      ssePayload({ choices: [{ delta: { content: chunk || JSON.stringify(json) } }] }) + "data: [DONE]\n\n",
      { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } },
    );
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const readable = new ReadableStream({
    async start(controller) {
      const reader = upstream.body?.getReader();
      if (!reader) {
        controller.enqueue(encoder.encode(ssePayload({ error: "Runtime response body is empty" })));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
        return;
      }

      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const eventText of events) {
          const dataLine = eventText.split("\n").find((line) => line.startsWith("data:"));
          if (!dataLine) continue;
          const raw = dataLine.replace(/^data:\s*/, "");
          if (raw === "[DONE]") continue;
          try {
            const parsed = JSON.parse(raw);
            const chunk = extractChunk(parsed);
            controller.enqueue(encoder.encode(chunk
              ? ssePayload({ choices: [{ delta: { content: chunk } }] })
              : ssePayload(parsed)));
          } catch {
            controller.enqueue(encoder.encode(ssePayload({ choices: [{ delta: { content: raw } }] })));
          }
        }
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function POST(request: NextRequest) {
  let profile: AgentProfile;
  let messages: IncomingMessage[];
  let sharedVault: SharedVaultConfig | undefined;
  let wallet: AgentWalletConfig | undefined;
  try {
    const body = (await request.json()) as {
      agent?: AgentProfile;
      messages?: IncomingMessage[];
      sharedVault?: SharedVaultConfig;
      wallet?: AgentWalletConfig;
    };
    if (!body.agent || !Array.isArray(body.messages)) throw new Error("Missing agent or messages");
    profile = body.agent;
    messages = body.messages;
    sharedVault = body.sharedVault;
    wallet = body.wallet;
  } catch {
    return Response.json({ error: "Expected { agent, messages }" }, { status: 400 });
  }

  const userMessage = latestUserMessage(messages);
  const userText = extractUserText(messages).trim();
  const userPrompt = userText || attachmentPromptSummary(userMessage);
  if (!userMessage || !userPrompt) return Response.json({ error: "User message is empty" }, { status: 400 });
  const vault = activeSharedVault(profile, sharedVault);
  const runtimeContexts = [buildVaultContext(vault), buildWalletToolContext(wallet)].filter(Boolean).join("\n\n");
  const textWithVaultContext = runtimeContexts
    ? `${runtimeContexts}\n\nUser message:\n${userPrompt}`
    : userPrompt;

  if (profile.runtime !== "openclaw") {
    if (profile.runtime === "hermes" && profile.telemetryUrl?.trim() && profile.collectorCapabilities?.chat === false) {
      return Response.json({
        error: `${profile.machineName || "This machine"} is connected, but its collector does not have the Hermes chat bridge installed yet. Run setup/update on that machine after these dashboard changes are available there.`,
      }, { status: 400 });
    }
    const effectiveProfile = collectorChatProfile(profile) ?? profile;
    const profileError = validateHttpRuntimeProfile(effectiveProfile);
    if (profileError) return Response.json({ error: profileError }, { status: 400 });
    return streamHttpRuntime(effectiveProfile, messages, userPrompt, vault, wallet);
  }

  const token = await getGatewayAuthToken(profile.token);
  if (!profile.gatewayUrl || !token) {
    return Response.json({ error: "Missing OpenClaw gateway URL or token" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 5_000);

      try {
        await sendMessageViaGateway(
          {
            gatewayUrl: profile.gatewayUrl,
            token,
            text: textWithVaultContext,
            agentId: profile.agentId,
            ...(profile.sessionKey ? { sessionKey: profile.sessionKey } : {}),
          },
          (chunk) => controller.enqueue(encoder.encode(ssePayload({ choices: [{ delta: { content: chunk } }] }))),
          undefined,
          (toolData) => controller.enqueue(encoder.encode(ssePayload({ tool_call: toolData }))),
          (status) => controller.enqueue(encoder.encode(ssePayload({ status }))),
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Agent runtime error";
        controller.enqueue(encoder.encode(ssePayload({ error: message })));
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
