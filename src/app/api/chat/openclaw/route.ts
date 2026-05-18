//src/app/api/chat/openclaw/route.ts

/**
 * OpenClaw Chat API Route
 *
 * Server-side proxy that connects to the user's OpenClaw gateway via WebSocket,
 * sends a chat message, and streams the agent's response back as SSE.
 *
 * The gateway URL and token are sent per-request from the client (stored locally
 * in IndexedDB, never synced to cloud).
 */

import { NextRequest } from 'next/server';
import { chatRouteClient } from '@/lib/arcjet/chat-routes';
import { applyUserRateLimit } from '@/lib/arcjet/user-rate-limit';
import { verifyAuth } from '@/lib/utils/server-auth';
import { sendMessageViaGateway } from '@/lib/services/openclaw/gateway-client';
import { getGatewayAuthToken } from '@/lib/services/openclaw/gateway-health';

export async function POST(request: NextRequest) {
  // ========================================================================
  // ARCJET PROTECTION (bot detection + rate limiting)
  // ========================================================================
  const decision = await chatRouteClient.protect(request);
  
  if (decision.isDenied()) {
    const errorMessage = decision.reason.isBot() 
      ? 'Bots are not allowed to use OpenClaw.' 
      : 'Too many OpenClaw requests. Please slow down.';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: decision.reason.isRateLimit() ? 429 : 403,
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }

  // ========================================================================
  // AUTHENTICATION
  // ========================================================================
  const { userId } = await verifyAuth(request);
  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ========================================================================
  // USER-BASED RATE LIMITING
  // ========================================================================
  const rateLimitDecision = await applyUserRateLimit(request, userId);
  
  if (rateLimitDecision.isDenied()) {
    return new Response(
      JSON.stringify({ error: 'Too many OpenClaw requests. Please slow down.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json();
    const { messages, gatewayUrl, token: userToken, agentId, sessionKey, stream = true } = body;
    const token = await getGatewayAuthToken(userToken);

    if (!gatewayUrl || !token) {
      return new Response(
        JSON.stringify({ error: 'Missing OpenClaw gateway URL or token' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extract the latest user message
    const lastUserMessage = [...messages].reverse().find((m: { role: string }) => m.role === 'user');
    if (!lastUserMessage) {
      return new Response(
        JSON.stringify({ error: 'No user message found' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userText = typeof lastUserMessage.content === 'string'
      ? lastUserMessage.content
      : lastUserMessage.content
          ?.filter((p: { type: string }) => p.type === 'text')
          .map((p: { text?: string }) => p.text)
          .join(' ') || '';

    if (!userText.trim()) {
      return new Response(
        JSON.stringify({ error: 'User message is empty' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (stream) {
      // Streaming mode: SSE with keepalive heartbeat
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          // Heartbeat keeps SSE alive during long tool execution (30-40s)
          const heartbeat = setInterval(() => {
            try {
              controller.enqueue(encoder.encode(': keepalive\n\n'));
            } catch { /* stream already closed */ }
          }, 5_000);

          try {
            const result = await sendMessageViaGateway(
              { gatewayUrl, token, text: userText, agentId, ...(sessionKey ? { sessionKey } : {}) },
              (chunk) => {
                const sseData = JSON.stringify({
                  choices: [{ delta: { content: chunk } }],
                });
                controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
              },
              undefined, // signal
              (toolData) => {
                const toolEvent = JSON.stringify({ tool_call: toolData });
                controller.enqueue(encoder.encode(`data: ${toolEvent}\n\n`));
              },
              (status) => {
                // Forward agent phase/status events so frontend can show "using tools..." UI
                const statusEvent = JSON.stringify({ status });
                controller.enqueue(encoder.encode(`data: ${statusEvent}\n\n`));
              }
            );

            clearInterval(heartbeat);

            if (result.toolResults && result.toolResults.length > 0) {
              const toolData = JSON.stringify({
                choices: [{ delta: { tool_results: result.toolResults } }],
              });
              controller.enqueue(encoder.encode(`data: ${toolData}\n\n`));
            }

            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            clearInterval(heartbeat);
            const errorMsg = error instanceof Error ? error.message : 'OpenClaw gateway error';
            console.error('OpenClaw streaming error:', errorMsg);
            const errorData = JSON.stringify({ error: errorMsg });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // Non-streaming mode: wait for full response
    const result = await sendMessageViaGateway({ gatewayUrl, token, text: userText, agentId, ...(sessionKey ? { sessionKey } : {}) });

    return new Response(
      JSON.stringify({
        choices: [{
          message: { role: 'assistant', content: result.text },
          ...(result.toolResults ? { tool_results: result.toolResults } : {}),
        }],
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to proxy to OpenClaw gateway';
    console.error('OpenClaw proxy error:', errorMsg);
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
