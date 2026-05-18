/**
 * OpenClaw Channel Toggle API Route
 *
 * POST — Enable or disable a messaging channel plugin via the OpenClaw CLI.
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { runCli } from '@/lib/utils/openclaw-cli';
import { invalidateByPrefix } from '@/lib/utils/openclaw-cache';
import { ensureGatewayMode } from '@/lib/services/openclaw/gateway-health';

const ALLOWED_CHANNELS = new Set(['whatsapp', 'telegram', 'imessage', 'signal']);

async function hasExistingChannelConfig(channel: string): Promise<boolean> {
  try {
    const raw = await readFile(join(homedir(), '.openclaw', 'openclaw.json'), 'utf-8');
    const config = JSON.parse(raw);
    const channelConfig = config?.channels?.[channel];
    return !!channelConfig && Object.keys(channelConfig).length > 0;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { channel, enabled } = await request.json() as { channel: string; enabled: boolean };

    if (!channel || !ALLOWED_CHANNELS.has(channel)) {
      return NextResponse.json(
        { success: false, error: `Invalid channel: ${channel}` },
        { status: 400 },
      );
    }

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'enabled must be a boolean' },
        { status: 400 },
      );
    }

    const configCmds: string[][] = [
      ['config', 'set', `plugins.entries.${channel}.enabled`, String(enabled)],
    ];

    // WhatsApp: set safe defaults only on first enable (no existing config)
    if (channel === 'whatsapp' && enabled) {
      const hasConfig = await hasExistingChannelConfig('whatsapp');
      if (!hasConfig) {
        configCmds.push(
          ['config', 'set', 'channels.whatsapp.selfChatMode', 'true'],
          ['config', 'set', 'channels.whatsapp.dmPolicy', 'allowlist'],
        );
      }
    }

    for (const args of configCmds) {
      await runCli(args, { timeout: 10_000 });
    }

    await ensureGatewayMode();

    // Restart gateway so the change takes effect
    await runCli(['gateway', 'restart'], { timeout: 15_000 }).catch(() => {});

    // Invalidate channels cache so next fetch gets fresh data
    invalidateByPrefix('openclaw:channels');

    return NextResponse.json({ success: true, channel, enabled });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to toggle channel';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
