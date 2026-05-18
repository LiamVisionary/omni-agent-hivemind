/**
 * OpenClaw Channels API Route
 *
 * GET — Returns the status of all messaging channels.
 * Uses direct WebSocket RPC (~30ms) with CLI fallback.
 */

import { NextRequest, NextResponse } from 'next/server';
import { rpcCall, runCli, parseJsonFromOutput } from '@/lib/utils/openclaw-cli';
import { cacheKey, getCached, setCached } from '@/lib/utils/openclaw-cache';

export type MessagingChannelId = 'whatsapp' | 'telegram' | 'imessage' | 'signal';

export interface ChannelStatus {
  id: MessagingChannelId;
  label: string;
  configured: boolean;
  enabled: boolean;
  linked: boolean;
  detail: string;
}

export interface ChannelsResponse {
  success: boolean;
  channels: ChannelStatus[];
  error?: string;
}

const CHANNEL_LABELS: Record<MessagingChannelId, string> = {
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  imessage: 'iMessage',
  signal: 'Signal',
};

function buildChannelList(
  channelsData: Record<string, unknown>,
  pluginEntries: Record<string, { enabled?: boolean }>,
): ChannelStatus[] {
  // channels.status returns channel data keyed by channel ID
  const activeChannels = new Set(Object.keys(channelsData));

  return (Object.keys(CHANNEL_LABELS) as MessagingChannelId[]).map((id) => {
    const configured = activeChannels.has(id) || id in pluginEntries;
    const pluginEntry = pluginEntries[id];
    const enabled = configured && (pluginEntry?.enabled !== false);
    const channelInfo = channelsData[id] as { linked?: boolean; configured?: boolean } | undefined;
    const linked = channelInfo?.linked ?? activeChannels.has(id);

    let detail = 'Not configured';
    if (configured && !enabled) detail = 'Disabled';
    else if (configured && linked) detail = 'Connected';
    else if (configured && !linked) detail = 'Not linked';

    return { id, label: CHANNEL_LABELS[id], configured, enabled, linked, detail };
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workspace = searchParams.get('workspace') ?? undefined;

  const key = cacheKey('openclaw:channels', workspace);
  const cached = getCached<ChannelsResponse>(key);
  if (cached) return NextResponse.json(cached);

  try {
    // Try fast path: WS RPC (both calls in parallel, ~30ms total)
    let channels: ChannelStatus[];
    try {
      const [channelsData, configData] = await Promise.all([
        rpcCall('channels.status'),
        rpcCall('config.get'),
      ]);

      // Extract channel info from channels.status response
      const chData = (channelsData.channels ?? {}) as Record<string, unknown>;

      // Extract plugin entries from config
      const rawConfig = (configData.raw as string) ?? '';
      const pluginEntries: Record<string, { enabled?: boolean }> = {};
      try {
        // config.get returns raw config as a relaxed-JSON string
        // Extract plugins.entries with regex since it's not strict JSON
        const pluginsMatch = rawConfig.match(/plugins:\s*\{[\s\S]*?entries:\s*(\{[\s\S]*?\})\s*[,}]/);
        if (pluginsMatch) {
          // Simple extraction: check which channels appear in the plugins section
          for (const id of Object.keys(CHANNEL_LABELS)) {
            const enabledMatch = rawConfig.match(new RegExp(`${id}:\\s*\\{[^}]*enabled:\\s*(true|false)`));
            if (enabledMatch) {
              pluginEntries[id] = { enabled: enabledMatch[1] === 'true' };
            }
          }
        }
      } catch { /* parse error — use empty plugins */ }

      channels = buildChannelList(chData, pluginEntries);
    } catch {
      // Fall back to CLI
      const [listRaw, pluginsRaw] = await Promise.all([
        runCli(['channels', 'list', '--json'], { timeout: 15_000 }).catch(() => '{}'),
        runCli(['config', 'get', 'plugins'], { timeout: 15_000 }).catch(() => '{}'),
      ]);

      const listJson = parseJsonFromOutput<{ chat?: Record<string, string[]> }>(listRaw) ?? {};
      const pluginsJson = parseJsonFromOutput<{ entries?: Record<string, { enabled?: boolean }> }>(pluginsRaw) ?? {};

      const activeChannels = new Set(Object.keys(listJson.chat ?? {}));
      const pluginEntries = pluginsJson.entries ?? {};

      channels = (Object.keys(CHANNEL_LABELS) as MessagingChannelId[]).map((id) => {
        const configured = activeChannels.has(id) || id in pluginEntries;
        const pluginEntry = pluginEntries[id];
        const enabled = configured && (pluginEntry?.enabled !== false);
        const linked = activeChannels.has(id);

        let detail = 'Not configured';
        if (configured && !enabled) detail = 'Disabled';
        else if (configured && linked) detail = 'Connected';
        else if (configured && !linked) detail = 'Not linked';

        return { id, label: CHANNEL_LABELS[id], configured, enabled, linked, detail };
      });
    }

    const response: ChannelsResponse = { success: true, channels };
    setCached(key, response);
    return NextResponse.json(response);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to query channels';
    return NextResponse.json({ success: false, channels: [], error: msg } satisfies ChannelsResponse, { status: 500 });
  }
}
