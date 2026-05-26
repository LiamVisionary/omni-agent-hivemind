import { NextRequest, NextResponse } from "next/server";

import { observeHoneyUsage } from "@/lib/services/wallet/honey-usage-observer";
import { exchangeHoneyForHive, readHoneyLedger } from "@/lib/services/wallet/honey-ledger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HONEY_LEDGER_READ_CACHE_MS = 10_000;
const HONEY_LEDGER_OBSERVE_CACHE_MS = 20_000;

type HoneyLedgerPayload = Awaited<ReturnType<typeof readHoneyLedger>>;
type HoneyObservePayload = Awaited<ReturnType<typeof observeHoneyUsage>>;

let cachedLedger: { checkedAt: number; ledger: HoneyLedgerPayload } | null = null;
let inFlightLedger: Promise<HoneyLedgerPayload> | null = null;
let cachedObserve: { checkedAt: number; result: HoneyObservePayload; ledger: HoneyLedgerPayload } | null = null;
let inFlightObserve: Promise<{ result: HoneyObservePayload; ledger: HoneyLedgerPayload }> | null = null;
let honeyLedgerCacheVersion = 0;

async function readCachedLedger() {
  const now = Date.now();
  if (cachedLedger && now - cachedLedger.checkedAt < HONEY_LEDGER_READ_CACHE_MS) {
    return cachedLedger.ledger;
  }
  const version = honeyLedgerCacheVersion;
  inFlightLedger ??= readHoneyLedger()
    .then((ledger) => {
      if (version === honeyLedgerCacheVersion) {
        cachedLedger = { checkedAt: Date.now(), ledger };
      }
      return ledger;
    })
    .finally(() => {
      inFlightLedger = null;
    });
  return inFlightLedger;
}

async function observeCachedUsage() {
  const now = Date.now();
  if (cachedObserve && now - cachedObserve.checkedAt < HONEY_LEDGER_OBSERVE_CACHE_MS) {
    return cachedObserve;
  }
  const version = honeyLedgerCacheVersion;
  inFlightObserve ??= (async () => {
    const result = await observeHoneyUsage();
    const ledger = await readHoneyLedger();
    if (version === honeyLedgerCacheVersion) {
      cachedLedger = { checkedAt: Date.now(), ledger };
      cachedObserve = { checkedAt: Date.now(), result, ledger };
    }
    return { result, ledger };
  })().finally(() => {
    inFlightObserve = null;
  });
  return inFlightObserve;
}

export async function GET() {
  const ledger = await readCachedLedger();
  return NextResponse.json({ ok: true, ledger });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { action?: string; agentId?: string };
  if (body.action === "observe") {
    const { result, ledger } = await observeCachedUsage();
    return NextResponse.json({ ok: result.ok, ledger, observer: result });
  }
  if (body.action !== "exchange") {
    return NextResponse.json({ ok: false, error: "Unsupported Honey ledger action." }, { status: 400 });
  }
  const { ledger, events } = await exchangeHoneyForHive(body.agentId);
  honeyLedgerCacheVersion += 1;
  cachedLedger = { checkedAt: Date.now(), ledger };
  cachedObserve = null;
  return NextResponse.json({ ok: true, ledger, events });
}
