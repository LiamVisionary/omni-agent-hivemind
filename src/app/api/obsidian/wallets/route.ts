import { NextRequest } from "next/server";

import { readWalletLedger, writeWalletRecord } from "@/lib/services/obsidian/wallet-ledger";
import type { AgentWalletConfig } from "@/lib/types/agent-wallet";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const vaultPath = request.nextUrl.searchParams.get("vaultPath") ?? undefined;
    const ledger = await readWalletLedger(vaultPath);
    return Response.json({ ok: true, ...ledger });
  } catch (error) {
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not read wallet ledger.",
    }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      vaultPath?: string;
      agentId?: string;
      agentName?: string;
      runtime?: string;
      machineName?: string;
      wallet?: AgentWalletConfig;
    };
    if (!body.agentId?.trim()) {
      return Response.json({ ok: false, error: "Missing agentId." }, { status: 400 });
    }
    if (!body.wallet) {
      return Response.json({ ok: false, error: "Missing wallet payload." }, { status: 400 });
    }
    const record = await writeWalletRecord({
      vaultPath: body.vaultPath,
      agentId: body.agentId,
      agentName: body.agentName ?? body.agentId,
      runtime: body.runtime,
      machineName: body.machineName,
      wallet: body.wallet,
    });
    return Response.json({ ok: true, record });
  } catch (error) {
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not write wallet record.",
    }, { status: 400 });
  }
}
