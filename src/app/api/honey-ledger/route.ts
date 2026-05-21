import { NextRequest, NextResponse } from "next/server";

import { exchangeHoneyForHive, readHoneyLedger } from "@/lib/services/wallet/honey-ledger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ledger = await readHoneyLedger();
  return NextResponse.json({ ok: true, ledger });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { action?: string; agentId?: string };
  if (body.action !== "exchange") {
    return NextResponse.json({ ok: false, error: "Unsupported Honey ledger action." }, { status: 400 });
  }
  const { ledger, events } = await exchangeHoneyForHive(body.agentId);
  return NextResponse.json({ ok: true, ledger, events });
}
