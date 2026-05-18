/**
 * OpenClaw Channel Setup API Route
 *
 * POST — Add/configure a messaging channel via the OpenClaw CLI.
 *
 * WhatsApp: triggers QR-code login flow (returns instructions to run CLI manually)
 * Telegram: accepts bot token, adds it via CLI
 * iMessage: adds the local iMessage channel
 * Signal: accepts signal number, adds via CLI
 */

import { NextRequest, NextResponse } from 'next/server';
import { runCli } from '@/lib/utils/openclaw-cli';
import { invalidateByPrefix } from '@/lib/utils/openclaw-cache';

const ALLOWED_CHANNELS = new Set(['whatsapp', 'telegram', 'imessage', 'signal']);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      channel: string;
      token?: string;
      signalNumber?: string;
    };

    const { channel } = body;

    if (!channel || !ALLOWED_CHANNELS.has(channel)) {
      return NextResponse.json(
        { success: false, error: `Invalid channel: ${channel}` },
        { status: 400 },
      );
    }

    switch (channel) {
      case 'whatsapp': {
        // WhatsApp requires interactive QR login — we can only tell the user to run it
        return NextResponse.json({
          success: true,
          requiresTerminal: true,
          command: 'openclaw channels login --channel whatsapp',
          instructions: 'Run this command in your terminal. A QR code will appear — scan it with WhatsApp on your phone.',
        });
      }

      case 'telegram': {
        if (!body.token?.trim()) {
          return NextResponse.json(
            { success: false, error: 'Telegram bot token is required' },
            { status: 400 },
          );
        }
        await runCli(
          ['channels', 'add', '--channel', 'telegram', '--token', body.token.trim()],
          { timeout: 15_000 },
        );
        await runCli(
          ['config', 'set', 'plugins.entries.telegram.enabled', 'true'],
          { timeout: 10_000 },
        );
        await runCli(['gateway', 'restart'], { timeout: 15_000 }).catch(() => {});
        invalidateByPrefix('openclaw:channels');
        return NextResponse.json({ success: true, channel: 'telegram' });
      }

      case 'imessage': {
        await runCli(
          ['channels', 'add', '--channel', 'imessage'],
          { timeout: 15_000 },
        );
        await runCli(
          ['config', 'set', 'plugins.entries.imessage.enabled', 'true'],
          { timeout: 10_000 },
        );
        await runCli(['gateway', 'restart'], { timeout: 15_000 }).catch(() => {});
        invalidateByPrefix('openclaw:channels');
        return NextResponse.json({ success: true, channel: 'imessage' });
      }

      case 'signal': {
        if (!body.signalNumber?.trim()) {
          return NextResponse.json(
            { success: false, error: 'Signal phone number (E.164 format) is required' },
            { status: 400 },
          );
        }
        await runCli(
          ['channels', 'add', '--channel', 'signal', '--signal-number', body.signalNumber.trim()],
          { timeout: 15_000 },
        );
        await runCli(
          ['config', 'set', 'plugins.entries.signal.enabled', 'true'],
          { timeout: 10_000 },
        );
        await runCli(['gateway', 'restart'], { timeout: 15_000 }).catch(() => {});
        invalidateByPrefix('openclaw:channels');
        return NextResponse.json({ success: true, channel: 'signal' });
      }

      default:
        return NextResponse.json({ success: false, error: 'Unsupported channel' }, { status: 400 });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to setup channel';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
