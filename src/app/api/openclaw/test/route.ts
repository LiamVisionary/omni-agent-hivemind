/**
 * OpenClaw Gateway Test API Route
 *
 * Tests connectivity to a user's self-hosted OpenClaw gateway.
 * Performs WebSocket handshake and reports success/failure.
 * On ECONNREFUSED, attempts auto-recovery (fix gateway.mode, restart daemon).
 */

import { NextRequest } from 'next/server';
import { testGatewayConnection } from '@/lib/services/openclaw/gateway-client';
import { checkAndRecoverGateway, getGatewayAuthToken } from '@/lib/services/openclaw/gateway-health';

function isConnectionRefused(error: string): boolean {
  return /ECONNREFUSED|ECONNRESET|ETIMEDOUT|Connection refused/i.test(error);
}

export async function POST(request: NextRequest) {
  try {
    const { gatewayUrl, token: userToken } = await request.json();
    const token = await getGatewayAuthToken(userToken);

    if (!gatewayUrl || !token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing gateway URL or token' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await testGatewayConnection({ gatewayUrl, token });

    // If connection refused, try auto-recovery then retry once
    if (!result.success && result.error && isConnectionRefused(result.error)) {
      const health = await checkAndRecoverGateway();

      if (health.recovered) {
        // Retry after recovery
        const retry = await testGatewayConnection({ gatewayUrl, token });
        return new Response(JSON.stringify({
          ...retry,
          recovered: true,
          recoveryAction: health.recoveryAction,
        }), { headers: { 'Content-Type': 'application/json' } });
      }

      // Recovery failed — return a user-friendly error
      return new Response(JSON.stringify({
        success: false,
        error: 'Gateway is not running. Auto-restart failed — try running: openclaw gateway restart',
        gatewayDown: true,
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
