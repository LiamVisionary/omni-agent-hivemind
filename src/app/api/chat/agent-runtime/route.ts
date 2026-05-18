import { NextRequest } from "next/server";
import type { AgentProfile, SharedVaultConfig } from "@/lib/types/agent-runtime";
import { getRuntimeUrl } from "@/lib/types/agent-runtime";
import { sendMessageViaGateway } from "@/lib/services/openclaw/gateway-client";
import { getGatewayAuthToken } from "@/lib/services/openclaw/gateway-health";

export const runtime = "nodejs";
export const maxDuration = 120;

type IncomingMessage = {
  role: string;
  content: string | Array<{ type: string; text?: string }>;
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
    `- Hermes Agent Control Room path: ${sharedVault.controlRoomPath || "(not set)"}`,
    `- Instructions: ${sharedVault.instructions || "Read AGENTS.md before durable vault edits."}`,
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

async function streamHttpRuntime(
  profile: AgentProfile,
  messages: IncomingMessage[],
  userText: string,
  sharedVault: SharedVaultConfig | null,
) {
  const url = getRuntimeUrl(profile, profile.chatPath || "/chat");
  const vaultContext = buildVaultContext(sharedVault);
  const upstream = await fetch(url, {
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
      context: vaultContext || undefined,
    }),
    signal: AbortSignal.timeout(110_000),
  });

  if (!upstream.ok) {
    const errorText = await upstream.text().catch(() => "");
    return new Response(
      ssePayload({ error: errorText || `${profile.runtime} returned ${upstream.status}` }) + "data: [DONE]\n\n",
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
  try {
    const body = (await request.json()) as {
      agent?: AgentProfile;
      messages?: IncomingMessage[];
      sharedVault?: SharedVaultConfig;
    };
    if (!body.agent || !Array.isArray(body.messages)) throw new Error("Missing agent or messages");
    profile = body.agent;
    messages = body.messages;
    sharedVault = body.sharedVault;
  } catch {
    return Response.json({ error: "Expected { agent, messages }" }, { status: 400 });
  }

  const userText = extractUserText(messages).trim();
  if (!userText) return Response.json({ error: "User message is empty" }, { status: 400 });
  const vault = activeSharedVault(profile, sharedVault);
  const textWithVaultContext = vault
    ? `${buildVaultContext(vault)}\n\nUser message:\n${userText}`
    : userText;

  if (profile.runtime !== "openclaw") {
    return streamHttpRuntime(profile, messages, userText, vault);
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
