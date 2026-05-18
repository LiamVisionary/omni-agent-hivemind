/**
 * OpenClaw Channel Config API Route
 *
 * GET  — Read the current channel config for a specific channel from openclaw.json
 * POST — Write (patch) channel config keys for a specific channel
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const OPENCLAW_CONFIG_PATH = join(homedir(), '.openclaw', 'openclaw.json');
const ALLOWED_CHANNELS = new Set(['whatsapp', 'telegram', 'imessage', 'signal']);

/** Keys we allow users to read/write per channel. */
const ALLOWED_KEYS = new Set([
  'dmPolicy', 'selfChatMode', 'allowFrom', 'groupAllowFrom', 'groupPolicy',
  'historyLimit', 'dmHistoryLimit', 'sendReadReceipts', 'mediaMaxMb',
  'responsePrefix', 'ackReaction', 'debounceMs', 'streamMode',
  'reactionLevel', 'linkPreview', 'service',
]);

async function readOpenClawConfig(): Promise<Record<string, unknown>> {
  const raw = await readFile(OPENCLAW_CONFIG_PATH, 'utf-8');
  return JSON.parse(raw);
}

async function writeOpenClawConfig(config: Record<string, unknown>): Promise<void> {
  await writeFile(OPENCLAW_CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

export async function GET(request: NextRequest) {
  try {
    const channel = request.nextUrl.searchParams.get('channel');
    if (!channel || !ALLOWED_CHANNELS.has(channel)) {
      return NextResponse.json({ success: false, error: `Invalid channel: ${channel}` }, { status: 400 });
    }

    const config = await readOpenClawConfig();
    const channels = (config.channels ?? {}) as Record<string, Record<string, unknown>>;
    const channelConfig = channels[channel] ?? {};

    // Filter to only allowed keys
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(channelConfig)) {
      if (ALLOWED_KEYS.has(key)) {
        filtered[key] = value;
      }
    }

    return NextResponse.json({ success: true, channel, config: filtered });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to read channel config';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { channel, config: patch } = await request.json() as {
      channel: string;
      config: Record<string, unknown>;
    };

    if (!channel || !ALLOWED_CHANNELS.has(channel)) {
      return NextResponse.json({ success: false, error: `Invalid channel: ${channel}` }, { status: 400 });
    }

    if (!patch || typeof patch !== 'object') {
      return NextResponse.json({ success: false, error: 'config must be an object' }, { status: 400 });
    }

    // Filter to only allowed keys
    const safePatch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (ALLOWED_KEYS.has(key)) {
        safePatch[key] = value;
      }
    }

    if (Object.keys(safePatch).length === 0) {
      return NextResponse.json({ success: false, error: 'No valid config keys provided' }, { status: 400 });
    }

    const fullConfig = await readOpenClawConfig();

    // Ensure channels object exists
    if (!fullConfig.channels || typeof fullConfig.channels !== 'object') {
      fullConfig.channels = {};
    }
    const channels = fullConfig.channels as Record<string, Record<string, unknown>>;

    // Ensure channel sub-object exists
    if (!channels[channel] || typeof channels[channel] !== 'object') {
      channels[channel] = {};
    }

    // Merge patch into existing channel config
    Object.assign(channels[channel], safePatch);

    await writeOpenClawConfig(fullConfig);

    return NextResponse.json({ success: true, channel, config: channels[channel] });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to write channel config';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
